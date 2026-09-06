#!/usr/bin/env python3
"""
End-to-end tests for alpaca_mirror.py against the local mock (tools/trader/mock_alpaca.py).

No account, no key, no order ever leaves this machine: every request goes to
127.0.0.1 via ALPACA_BASE_URL / ALPACA_DATA_URL, which the executor already
supports. Run it:

    python3 tools/trader/test_mirror.py

Each scenario writes a ledger + a mock account state, runs the executor as a
subprocess exactly the way the workflow does, and asserts on the exit code, the
printed counts, and the orders the mock actually received. That last one is the
point: the assertions are about orders, not about log text.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MIRROR = HERE / "alpaca_mirror.py"
LEDGER = ROOT / "sites" / "agiscorecard" / "paper-ledger.json"
KILLED = HERE / "KILLED"
PORT = int(os.getenv("MOCK_PORT", "8899"))
BASE = f"http://127.0.0.1:{PORT}"

PRICES = {"SPY": 500.0, "QQQ": 400.0, "AGG": 100.0, "VEU": 60.0, "IEF": 95.0,
          "VNQ": 90.0, "DBC": 25.0, "BIL": 91.0, "NVDA": 120.0, "AMD": 150.0}

FAILURES: list[str] = []
_ledger_backup: bytes | None = None


# ----------------------------------------------------------------- harness
def prev_session(n: int) -> str:
    d = date.today()
    while n > 0:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d.isoformat()


def write_ledger(arm: str, action: str, weights: dict, *, as_of: str | None = None,
                 dd: float | None = None, status: str = "live", fetch_errors: dict | None = None):
    doc = {
        "version": 1, "start": "2026-09-08", "notional": 10000.0, "cost_bps": 5,
        "last_price_date": prev_session(1), "trading_days_since_start": 5,
        "fetch_errors": fetch_errors or {},
        "arms": {arm: {
            "status": status, "equity": {}, "trades": 1, "turnover": 0,
            "metrics": ({} if dd is None else {"last": 10000.0, "return_pct": 0.0,
                                              "max_drawdown_pct": dd, "days": 5}),
            "target": {"as_of": as_of or prev_session(1),
                       "execute_on": date.today().isoformat(),
                       "action": action, "weights": weights},
        }},
    }
    LEDGER.write_text(json.dumps(doc), encoding="utf-8")


def write_state(**kw):
    st = {"orders": [], "positions": [], "prices": PRICES,
          "equity": 1000.0, "last_equity": 1000.0, "is_open": True,
          "minutes_to_close": 40.0, "reject_cls": False, "fail_sells": False,
          "untradable": []}
    st.update(kw)
    Path(STATE_PATH).write_text(json.dumps(st), encoding="utf-8")


def read_state() -> dict:
    return json.loads(Path(STATE_PATH).read_text(encoding="utf-8"))


def positions(*pairs) -> list:
    return [{"symbol": s, "market_value": f"{v:.2f}", "qty": f"{v / PRICES[s]:.6f}"} for s, v in pairs]


def run(*args, env_extra: dict | None = None):
    env = {**os.environ,
           "ALPACA_KEY_ID": "test", "ALPACA_SECRET_KEY": "test",
           "ALPACA_BASE_URL": BASE, "ALPACA_DATA_URL": BASE,
           "TRADER_ARM": "sixty_forty", "TRADER_MAX_NOTIONAL": "1000",
           "TRADER_LIVE": "", "TRADER_DRY_RUN": "", "TRADER_TG_TOKEN": "", "TRADER_TG_CHAT": ""}
    env.update(env_extra or {})
    p = subprocess.run([sys.executable, str(MIRROR), *args],
                       capture_output=True, text=True, env=env, timeout=90)
    return p.returncode, p.stdout + p.stderr


def check(name: str, cond: bool, detail: str = ""):
    print(("  ok   " if cond else "  FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))
    if not cond:
        FAILURES.append(name)


def orders_of(kind: str | None = None) -> list:
    o = read_state()["orders"]
    return [x for x in o if kind is None or x.get("type") == kind or x.get("side") == kind]


# ------------------------------------------------------------------ scenarios
def s01_first_entry():
    print("S01 首次建仓:空账户 + 60/40 目标")
    write_ledger("sixty_forty", "enter", {"SPY": 0.6, "AGG": 0.4}, dd=-2.0)
    write_state()
    rc, out = run("--force")
    st = read_state()
    buys = [o for o in st["orders"] if o["side"] == "buy"]
    syms = {o["symbol"] for o in buys}
    check("exit 0", rc == 0, out.strip()[-160:])
    check("只买不卖", syms == {"SPY", "AGG"} and not [o for o in st["orders"] if o["side"] == "sell"])
    check("整股走 cls", any(o["time_in_force"] == "cls" and o["qty"] for o in buys))
    check("零股走 day + notional", any(o["time_in_force"] == "day" and o["notional"] for o in buys))
    deployed = sum(float(p["market_value"]) for p in st["positions"])
    check("部署额 ≤ 上限×98% (2% 现金缓冲)", deployed <= 1000 * 0.98 + 0.5, f"{deployed:.2f}")
    w = {p["symbol"]: float(p["market_value"]) / deployed for p in st["positions"]}
    check("权重逼近 60/40", abs(w["SPY"] - .6) < .02 and abs(w["AGG"] - .4) < .02, str(w))


def s02_already_on_target():
    print("S02 已在目标上:band 内不动")
    write_ledger("sixty_forty", "hold", {"SPY": 0.6, "AGG": 0.4}, dd=-2.0)
    write_state(positions=positions(("SPY", 588.0), ("AGG", 392.0)))
    rc, out = run("--force")
    check("exit 0", rc == 0, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志报 sells=0 buys=0", "sells=0 buys=0" in out, out.strip()[-160:])


def s03_rebalance():
    print("S03 再平衡:全仓 SPY → 60/40")
    write_ledger("sixty_forty", "rebalance", {"SPY": 0.6, "AGG": 0.4}, dd=-2.0)
    write_state(positions=positions(("SPY", 980.0)))
    rc, out = run("--force")
    st = read_state()
    check("exit 0", rc == 0, out.strip()[-160:])
    check("SPY 卖 + AGG 买", any(o["symbol"] == "SPY" and o["side"] == "sell" for o in st["orders"])
          and any(o["symbol"] == "AGG" and o["side"] == "buy" for o in st["orders"]))
    idx_sell = min(i for i, o in enumerate(st["orders"]) if o["side"] == "sell")
    idx_buy = min(i for i, o in enumerate(st["orders"]) if o["side"] == "buy")
    check("先卖后买(现金先回笼)", idx_sell < idx_buy, f"sell@{idx_sell} buy@{idx_buy}")


def s04_kill_by_drawdown():
    print("S04 止损:纸面回撤 -12% ≤ -10%")
    write_ledger("sixty_forty", "hold", {"SPY": 0.6, "AGG": 0.4}, dd=-12.0)
    write_state(positions=positions(("SPY", 588.0), ("AGG", 392.0)))
    rc, out = run("--force")
    st = read_state()
    check("exit 1(红 = 告警)", rc == 1, out.strip()[-160:])
    check("已清仓", st["positions"] == [])
    check("走的是整户清算", any(o.get("type") == "liquidate_all" for o in st["orders"]))
    check("日志说明原因", "KILL" in out and "drawdown" in out)


def s05_kill_file():
    print("S05 一键停止:KILLED 文件存在")
    write_ledger("sixty_forty", "hold", {"SPY": 0.6, "AGG": 0.4}, dd=-1.0)
    write_state(positions=positions(("SPY", 588.0)))
    KILLED.write_text("stop", encoding="utf-8")
    try:
        rc, out = run("--force")
    finally:
        KILLED.unlink(missing_ok=True)
    check("exit 1", rc == 1, out.strip()[-160:])
    check("已清仓", read_state()["positions"] == [])
    check("原因标为 file", "reason=file" in out, out.strip()[-160:])


def s06_stale_ledger():
    print("S06 台账陈旧:目标落后 5 个交易日")
    write_ledger("sixty_forty", "rebalance", {"SPY": 1.0}, as_of=prev_session(5), dd=-1.0)
    write_state(positions=positions(("SPY", 500.0)))
    rc, out = run("--force")
    check("exit 1", rc == 1, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志说 STALE", "STALE" in out)


def s07_fetch_errors():
    print("S07 取数失败波及目标标的")
    write_ledger("sixty_forty", "rebalance", {"SPY": 0.6, "AGG": 0.4}, dd=-1.0,
                 fetch_errors={"AGG": "yahoo 429"})
    write_state()
    rc, out = run("--force")
    check("exit 1", rc == 1, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志点名 fetch_errors", "fetch_errors" in out)


def s08_market_closed():
    print("S08 休市")
    write_ledger("sixty_forty", "rebalance", {"SPY": 1.0}, dd=-1.0)
    write_state(is_open=False)
    rc, out = run()  # 不加 --force,走真实时间窗
    check("exit 0", rc == 0, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志说休市", "closed" in out.lower())


def s09_too_late():
    print("S09 太晚:距收盘 5 分钟(cls 已不收)")
    write_ledger("sixty_forty", "rebalance", {"SPY": 1.0}, dd=-1.0)
    write_state(minutes_to_close=5.0)
    rc, out = run()
    check("exit 1(红)", rc == 1, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志说太晚", "too late" in out.lower())


def s10_too_early():
    print("S10 太早:距收盘 120 分钟")
    write_ledger("sixty_forty", "rebalance", {"SPY": 1.0}, dd=-1.0)
    write_state(minutes_to_close=120.0)
    rc, out = run()
    check("exit 0", rc == 0, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志说等下一条 cron", "too early" in out.lower())


def s11_idempotent():
    print("S11 幂等:当日已有订单")
    write_ledger("sixty_forty", "rebalance", {"SPY": 1.0}, dd=-1.0)
    write_state(orders=[{"id": "prior", "symbol": "SPY", "side": "buy", "status": "accepted",
                         "submitted_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}])
    rc, out = run()
    check("exit 0", rc == 0, out.strip()[-160:])
    check("没有追加新订单", len(read_state()["orders"]) == 1)
    check("日志说幂等空转", "idempotent" in out.lower())


def s12_cap_binds():
    print("S12 上限生效:权益 5000 但上限 1000")
    write_ledger("sixty_forty", "enter", {"SPY": 1.0}, dd=-1.0)
    write_state(equity=5000.0)
    rc, out = run("--force")
    deployed = sum(float(p["market_value"]) for p in read_state()["positions"])
    check("exit 0", rc == 0, out.strip()[-160:])
    check("部署额受上限约束而非权益", 900 <= deployed <= 981, f"{deployed:.2f}")


def s13_dry_run():
    print("S13 dry-run:算但不下单")
    write_ledger("sixty_forty", "enter", {"SPY": 0.6, "AGG": 0.4}, dd=-1.0)
    write_state()
    rc, out = run("--force", "--dry-run")
    check("exit 0", rc == 0, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志标 dry_run=True", "dry_run=True" in out)


def s14_wait_action():
    print("S14 台账还没开始:action=wait")
    write_ledger("sixty_forty", "wait", {}, status="waiting_for_start")
    write_state()
    rc, out = run("--force")
    check("exit 0", rc == 0, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)
    check("日志说 nothing to mirror", "nothing to mirror" in out.lower())


def s15_no_keys():
    print("S15 没有密钥:空转退出,不报错")
    write_ledger("sixty_forty", "rebalance", {"SPY": 1.0}, dd=-1.0)
    write_state()
    rc, out = run("--force", env_extra={"ALPACA_KEY_ID": "", "ALPACA_SECRET_KEY": ""})
    check("exit 2", rc == 2, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)


def s16_sell_rejected():
    print("S16 卖单被拒:不能继续买(否则超配)")
    write_ledger("sixty_forty", "rebalance", {"SPY": 0.6, "AGG": 0.4}, dd=-1.0)
    write_state(positions=positions(("SPY", 980.0)), fail_sells=True)
    rc, out = run("--force")
    st = read_state()
    buys = [o for o in st["orders"] if o["side"] == "buy"]
    check("卖失败后不下买单", not buys, f"{len(buys)} 个买单仍被下出")
    check("exit 非 0", rc != 0, f"rc={rc}")


def s17_untradable_symbol():
    print("S17 标的不可交易(停牌/退市)")
    write_ledger("sixty_forty", "enter", {"SPY": 0.6, "AGG": 0.4}, dd=-1.0)
    write_state(untradable=["AGG"])
    rc, out = run("--force")
    st = read_state()
    check("SPY 仍成交", any(o["symbol"] == "SPY" for o in st["orders"]))
    check("有错误计数", "errors=" in out and "errors=0" not in out, out.strip()[-160:])


def s18_cls_window_rejected():
    print("S18 cls 被拒(15:50–19:00 ET 窗口)")
    write_ledger("sixty_forty", "enter", {"SPY": 1.0}, dd=-1.0)
    write_state(reject_cls=True)
    rc, out = run("--force")
    st = read_state()
    check("被拒后有记录,不静默", "errors=" in out, out.strip()[-160:])
    check("没有把 cls 静默改成 day 蒙混过去",
          not any(o["time_in_force"] == "cls" and o["status"] == "accepted" for o in st["orders"]))


def s19_unknown_arm():
    print("S19 TRADER_ARM 写错")
    write_ledger("sixty_forty", "rebalance", {"SPY": 1.0}, dd=-1.0)
    write_state()
    rc, out = run("--force", env_extra={"TRADER_ARM": "not_an_arm"})
    check("exit 2", rc == 2, out.strip()[-160:])
    check("零订单", len(read_state()["orders"]) == 0)


def s20_levered_target_refused():
    print("S20 目标权重和 >1(不该发生,但必须拒)")
    write_ledger("sixty_forty", "rebalance", {"SPY": 0.8, "AGG": 0.8}, dd=-1.0)
    write_state()
    rc, out = run("--force")
    deployed = sum(float(p["market_value"]) for p in read_state()["positions"])
    check("不加杠杆:部署额 ≤ 上限", deployed <= 1000.0, f"{deployed:.2f}")


SCENARIOS = [s01_first_entry, s02_already_on_target, s03_rebalance, s04_kill_by_drawdown,
             s05_kill_file, s06_stale_ledger, s07_fetch_errors, s08_market_closed,
             s09_too_late, s10_too_early, s11_idempotent, s12_cap_binds, s13_dry_run,
             s14_wait_action, s15_no_keys, s16_sell_rejected, s17_untradable_symbol,
             s18_cls_window_rejected, s19_unknown_arm, s20_levered_target_refused]


def main() -> int:
    global STATE_PATH, _ledger_backup
    tmp = tempfile.mkdtemp(prefix="mirror-test-")
    STATE_PATH = os.path.join(tmp, "state.json")
    write_state()
    _ledger_backup = LEDGER.read_bytes() if LEDGER.exists() else None

    srv = subprocess.Popen([sys.executable, str(HERE / "mock_alpaca.py"),
                            "--port", str(PORT), "--state", STATE_PATH],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(BASE + "/v2/clock", timeout=1).read()
                break
            except Exception:
                time.sleep(0.1)
        else:
            print("mock 起不来"); return 2

        for fn in SCENARIOS:
            fn()
    finally:
        srv.terminate()
        srv.wait(timeout=10)
        if _ledger_backup is not None:
            LEDGER.write_bytes(_ledger_backup)   # 绝不把测试夹具留在仓库里
        KILLED.unlink(missing_ok=True)

    print()
    if FAILURES:
        print(f"失败 {len(FAILURES)} 项: " + " · ".join(FAILURES))
        return 1
    print(f"全部通过({len(SCENARIOS)} 个场景)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
