#!/usr/bin/env python3
"""舰队钱线仪表盘(2026-09-21,owner:「调用技能实现舰队各个站点的营收目标增长」)。

手册 08-23 起要求每次报告带钱线仪表盘,而它此前只能由一个**有 Cloudflare MCP 的会话**手查 D1
——runner 没有 D1 读权限,heartbeat 从来读不到一条钱线。现在五个站的 /api/pulse(bpj 是 /api/reach)
多返回一个 `money` 对象(只有聚合计数,零 PII、零行级数据),本工具每日随 heartbeat 读一次,
写 `data/fleet-money.json`,demand-digest 次日读它。

  * 端点键随站不同(各站钱线本来就不同),这里不归一化成假的统一口径;每站原样保留,
    只在摘要表里挑出「28 天联盟点击 / 付费订单 / 订阅」三类可比数。
  * `data/fleet-money-owner.json` 是 owner 亲手报的数(PartnerNet 截图等),带数据窗日期,
    由会话在 owner 给新截图时更新;本工具只把它并进快照,**永不推算、永不外推**。
  * keep-last-good:取不到就保留上一份,连续 3 天读不到才红(同 traffic_sources.py)。
  * `money` 尚未部署的站(端点存在但没有 money 键)记 `via:"no-money-key"`,不红——
    heartbeat 在分支合并前就会先跑到。
"""
import datetime as dt, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools", "fleet"))
from ai_referrals import ENDPOINTS  # noqa: E402  端点表只维护一份
from endpoint_cache import fetch_url  # noqa: E402  2026-09-26:同一 run 内每个端点只出网一次(D1 读预算)

OUT = os.path.join(ROOT, "data", "fleet-money.json")
OWNER = os.path.join(ROOT, "data", "fleet-money-owner.json")
GRACE_DAYS = 3
# 钱线站:有收款面或联盟链接的站。其余站没有钱线,不在这里假装有。
MONEY_SITES = ["getecoback", "agiscorecard", "baipiaoji", "thedollscout", "buysomething"]
UA = "fleet-heartbeat/money_line (+https://github.com/f-tiger/agi-site)"


def fetch(site):
    _, body = fetch_url(ENDPOINTS[site], timeout=20, ua=UA)
    return json.loads(body)


def summarise(site, money):
    """Pure: an endpoint's money object → the three comparable numbers (None = not measured here)."""
    if not isinstance(money, dict):
        return {"affiliate_click_28d": None, "paid_orders": None, "subscribers": None}
    paid = None
    for k in ("member_orders_by_state", "ad_checkout_by_state"):
        m = money.get(k)
        if isinstance(m, dict):
            paid = (paid or 0) + int(m.get("paid", 0) or 0)
    if site == "baipiaoji":
        ads = money.get("ads_by_status") or {}
        if isinstance(ads, dict) and "paid" in ads:
            paid = (paid or 0) + int(ads.get("paid") or 0)
    subs = None
    if "subscribers" in money:
        subs = money["subscribers"]
    elif "subs_total" in money:
        subs = money["subs_total"]
    elif isinstance(money.get("subs_by_status"), dict):
        subs = sum(int(v or 0) for k, v in money["subs_by_status"].items() if k not in ("pending", "unsub", "unsubscribed"))
    return {"affiliate_click_28d": money.get("affiliate_click_28d"), "paid_orders": paid, "subscribers": subs}


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def age_days(snap, today):
    try:
        return (today - dt.date.fromisoformat(snap["generated"][:10])).days
    except Exception:
        return 10**6


def table(sites):
    rows = ["| 站 | 28d 联盟点击 | 付费订单 | 订阅 | 读法 |", "|---|---|---|---|---|"]
    for s in sites:
        sm = s["summary"]
        f = lambda v: "—" if v is None else str(v)
        rows.append(f"| {s['site']} | {f(sm['affiliate_click_28d'])} | {f(sm['paid_orders'])} | {f(sm['subscribers'])} | {s['via']} |")
    return "\n".join(rows)


def selftest():
    cases = [
        ("eco shape", summarise("getecoback", {"affiliate_click_28d": 64, "subs_total": 1, "member_orders_by_state": {"paid": 0}}) == {"affiliate_click_28d": 64, "paid_orders": 0, "subscribers": 1}),
        ("bpj paid = ads paid + checkout paid + member paid", summarise("baipiaoji", {"ads_by_status": {"paid": 1}, "ad_checkout_by_state": {"paid": 2, "creating": 5}, "member_orders_by_state": {"paid": 1}, "subs_by_status": {"pending": 4, "unsub": 1, "confirmed": 2}})["paid_orders"] == 4),
        ("bpj subscribers exclude pending/unsub", summarise("baipiaoji", {"subs_by_status": {"pending": 4, "unsub": 1, "confirmed": 2}})["subscribers"] == 2),
        ("missing money key → all None, not zero", summarise("agiscorecard", None) == {"affiliate_click_28d": None, "paid_orders": None, "subscribers": None}),
        ("money sites all have endpoints", all(s in ENDPOINTS for s in MONEY_SITES)),
    ]
    ok = True
    for label, cond in cases:
        print(("ok   " if cond else "FAIL ") + label); ok = ok and bool(cond)
    print("selftest:", "ok" if ok else "FAILED")
    return 0 if ok else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    today = dt.datetime.now(dt.timezone.utc).date()
    last = load(OUT)
    owner = load(OWNER) or {}
    sites, errors = [], []
    for site in MONEY_SITES:
        try:
            body = fetch(site)
            if not isinstance(body, dict) or not body.get("ok"):
                raise ValueError("endpoint not ok")
            money = body.get("money")
            via = "endpoint" if isinstance(money, dict) else "no-money-key"
            sites.append({"site": site, "via": via, "money": money if isinstance(money, dict) else None, "summary": summarise(site, money)})
            print(f"  {site:<13} {via:<13} {json.dumps(money, ensure_ascii=False)[:160] if money else '(money key not deployed yet)'}")
        except Exception as e:
            errors.append(f"{site}: {str(e)[:100]}")
            print(f"  {site:<13} ERROR {str(e)[:100]}")
    if not sites:
        why = " | ".join(errors)
        if not last:
            print(f"::warning::money-line read failed ({why}); no snapshot yet, will go red after {GRACE_DAYS} days")
            snap = {"generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "sites": [], "owner_reported": owner, "errors": errors, "stale": True}
            with open(OUT, "w", encoding="utf-8") as f:
                json.dump(snap, f, ensure_ascii=False, indent=1); f.write("\n")
            return 0
        a = age_days(last, today)
        if a <= GRACE_DAYS:
            print(f"::warning::money-line read failed ({why}); last snapshot is {a} d old, keeping it")
            return 0
        print(f"::error::money-line read has failed for {a} days ({why})")
        return 1
    snap = {
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "note": "aggregate counts read from each site's public pulse/reach endpoint; owner_reported figures are hand-entered from PartnerNet screenshots with their data window and are never extrapolated",
        "sites": sites, "owner_reported": owner, "errors": errors,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=1); f.write("\n")
    print(table(sites))
    if errors:
        print("::warning::money-line read incomplete: " + " | ".join(errors))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
