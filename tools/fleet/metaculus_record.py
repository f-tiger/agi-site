#!/usr/bin/env python3
"""Forecast-record reader (2026-09-27; docs/ai-era-founder-2026-09-25.md §三).

Writes data/fleet-forecast-record.json from the bot's committed point-in-time ledger
(data/metaculus/forecasts.jsonl + runs.jsonl) plus, for questions that have closed,
the resolution read from the public Metaculus API on the runner. Zero D1.

North star: resolved questions that carry a forecast logged BEFORE close.
Guard metrics: run success, LLM spend (7d / 30d), net USD (owner-reported prize minus
spend; prizes are never inferred), and the house-prior ablation — Brier of the submitted
forecast vs the logged no-prior shadow on resolved binary questions.

A sealed forecast is opened only after its question has closed (the probability must not
appear in the public repo while rival bots can still forecast). Opening needs
METACULUS_TOKEN (the ledger key is derived from it, see tools/metaculus-bot/ledger.py).

Metaculus API shape note: the fields read below (question.resolution, question.status,
actual_close_time / scheduled_close_time) are the ones forecasting-tools 0.2.92 reads; the
sandbox cannot reach metaculus.com (403), so they were not re-verified live here. Anything
unparseable counts as "unknown", never as resolved.

  python3 tools/fleet/metaculus_record.py --selftest
  python3 tools/fleet/metaculus_record.py
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools", "metaculus-bot"))
import ledger  # noqa: E402

OUT = os.path.join(ROOT, "data", "fleet-forecast-record.json")
OWNER = os.path.join(ROOT, "data", "fleet-money-owner.json")
API = "https://www.metaculus.com/api/posts/{}/"
MAX_LOOKUPS = 60           # per heartbeat; the rest wait for tomorrow
STALL_HOURS = 48
UA = "fleet-heartbeat/metaculus_record (+https://github.com/f-tiger/agi-site)"


def parse_time(s):
    if not s:
        return None
    try:
        return dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_post(body: dict) -> dict:
    """Resolution facts from a Metaculus post payload; unknown when the shape is not recognised."""
    q = body.get("question") if isinstance(body, dict) else None
    if not isinstance(q, dict):
        return {"status": "unknown"}
    res = q.get("resolution")
    close = q.get("actual_close_time") or q.get("scheduled_close_time") or body.get("scheduled_close_time")
    status = str(q.get("status") or body.get("status") or "unknown").lower()
    out = {"status": status, "close_time": close}
    if res is not None and status == "resolved":
        out["resolution"] = str(res).lower()
    return out


def brier(p: float, outcome: int) -> float:
    return (p - outcome) ** 2


def score(forecasts: list[dict], resolutions: dict, key, now: dt.datetime) -> dict:
    """Pure: ledger lines + resolution cache → north star and the house-prior ablation."""
    latest = {}
    for f in forecasts:  # the last forecast before close is the one scored
        pid = str(f.get("post_id"))
        latest.setdefault(pid, []).append(f)
    north, ablation, unopened = 0, [], 0
    for pid, lines in latest.items():
        r = resolutions.get(pid) or {}
        close = parse_time(r.get("close_time"))
        if not close or close > now or r.get("status") != "resolved":
            continue
        before = [x for x in lines if (parse_time(x.get("submitted_at")) or now) < close]
        if not before:
            continue  # logged after close: never counts
        north += 1
        last = before[-1]
        if r.get("resolution") not in ("yes", "no") or last.get("kind") != "BinaryQuestion":
            continue
        plain = ledger.unseal(last, key)
        if plain is None:
            unopened += 1
            continue
        p = (plain.get("prediction") or {}).get("p")
        s = plain.get("shadow_no_prior")
        if p is None or s is None or not last.get("house_prior_used"):
            continue
        o = 1 if r["resolution"] == "yes" else 0
        ablation.append({"post_id": pid, "submitted": round(p, 4), "shadow": round(s, 4), "outcome": o,
                         "brier_submitted": round(brier(p, o), 5), "brier_shadow": round(brier(s, o), 5)})
    n = len(ablation)
    delta = round(sum(a["brier_submitted"] - a["brier_shadow"] for a in ablation) / n, 5) if n else None
    return {"north_star_resolved_prelogged": north, "house_prior": {"n": n, "mean_brier_delta": delta,
            "definition": "mean(Brier submitted with house prior − Brier of the no-prior shadow) on resolved binary AI questions; ≤0 means the prior did not hurt",
            "rows": ablation, "sealed_unopened": unopened}}


def runs_summary(runs: list[dict], now: dt.datetime) -> dict:
    pub = [r for r in runs if r.get("published") and not r.get("skipped")]
    def since(days):
        cut = (now - dt.timedelta(days=days)).date().isoformat()
        return [r for r in pub if (r.get("date") or "") >= cut]
    last = max((parse_time(r.get("at")) for r in pub if parse_time(r.get("at"))), default=None)
    w14 = since(14)
    ok_runs = sum(1 for r in w14 if (r.get("ok") or 0) > 0 or not (r.get("failed") or 0))
    spend = lambda rs: round(sum(float(r.get("spend_usd") or 0) for r in rs), 4)
    if not pub:
        state = "never"
    elif last and (now - last).total_seconds() > STALL_HOURS * 3600:
        state = "stalled"
    else:
        state = "live"
    return {"state": state, "published_runs": len(pub), "last_run_at": last.isoformat() if last else None,
            "run_success_14d": round(ok_runs / len(w14), 3) if w14 else None,
            "spend_usd_7d": spend(since(7)), "spend_usd_30d": spend(since(30)),
            "skipped_daily_cap": sum(1 for r in runs if r.get("skipped") == "daily_cap")}


def fetch_post(pid: str, token: str) -> dict:
    req = urllib.request.Request(API.format(pid), headers={"User-Agent": UA, **({"Authorization": f"Token {token}"} if token else {})})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def load(p):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def selftest() -> int:
    now = dt.datetime(2026, 11, 1, tzinfo=dt.timezone.utc)
    key = ledger.derive_key("t")
    t = lambda s: dt.datetime.fromisoformat(s)
    mk = lambda pid, when, p, sh, prior=True, kind="BinaryQuestion": ledger.forecast_line(
        question_id=pid, post_id=pid, tournament=33121, kind=kind, prediction={"p": p}, shadow=sh,
        house_prior_used=prior, model="m", run_id="r", commit="c", key=key, when=t(when))
    fs = [mk(1, "2026-10-01T00:00:00+00:00", 0.8, 0.6), mk(2, "2026-10-05T00:00:00+00:00", 0.3, 0.2),
          mk(3, "2026-10-20T00:00:00+00:00", 0.5, 0.5), mk(4, "2026-10-01T00:00:00+00:00", 0.5, None)]
    res = {"1": {"status": "resolved", "resolution": "yes", "close_time": "2026-10-10T00:00:00Z"},
           "2": {"status": "resolved", "resolution": "no", "close_time": "2026-10-04T00:00:00Z"},   # logged after close
           "3": {"status": "open", "close_time": "2026-12-01T00:00:00Z"},
           "4": {"status": "resolved", "resolution": "no", "close_time": "2026-10-10T00:00:00Z"}}
    s = score(fs, res, key, now)
    checks = [
        ("post-close forecast never counts; open question not counted", s["north_star_resolved_prelogged"] == 2),
        ("ablation only where a shadow exists", s["house_prior"]["n"] == 1),
        ("delta = 0.04 − 0.16 = −0.12", s["house_prior"]["mean_brier_delta"] == -0.12),
        ("without the key the ablation stays sealed", score(fs, res, None, now)["house_prior"]["sealed_unopened"] == 2),
        ("parse_post: unknown shape is unknown", parse_post({}) == {"status": "unknown"}),
        ("parse_post: resolution only when resolved", "resolution" not in parse_post({"question": {"status": "closed", "resolution": "yes"}})),
        ("runs: never", runs_summary([], now)["state"] == "never"),
    ]
    runs = [ledger.run_line(run_id="a", mode="tournament", published=True, spend_usd=1.2, touched_main=2, touched_mini=0, ok=2, failed=0, when=t("2026-10-30T06:00:00+00:00")),
            ledger.run_line(run_id="b", mode="tournament", published=True, spend_usd=0.3, touched_main=1, touched_mini=0, ok=0, failed=1, when=t("2026-10-31T06:00:00+00:00"))]
    rs = runs_summary(runs, now)
    checks += [("runs: live, success 0.5, spend 1.5", rs["state"] == "live" and rs["run_success_14d"] == 0.5 and rs["spend_usd_7d"] == 1.5),
               ("runs: stalled after 48h", runs_summary(runs, now + dt.timedelta(days=4))["state"] == "stalled")]
    bad = [n for n, okk in checks if not okk]
    for n, okk in checks:
        print(("  ok   " if okk else "  FAIL ") + n)
    return 1 if bad else 0


def main(argv) -> int:
    if "--selftest" in argv:
        return selftest()
    now = dt.datetime.now(dt.timezone.utc)
    forecasts, runs = ledger.read_forecasts(), ledger.read_runs()
    last = load(OUT) or {}
    cache = dict(last.get("resolutions") or {})
    token = os.getenv("METACULUS_TOKEN", "")
    key = ledger.derive_key(token)
    errors, looked = [], 0
    for pid in sorted({str(f.get("post_id")) for f in forecasts if f.get("post_id") is not None}):
        known = cache.get(pid) or {}
        if known.get("status") == "resolved":
            continue
        close = parse_time(known.get("close_time"))
        if close and close > now:
            continue  # not closed yet: nothing to read
        if looked >= MAX_LOOKUPS:
            break
        looked += 1
        try:
            cache[pid] = parse_post(fetch_post(pid, token))
        except Exception as e:  # keep the last good entry
            errors.append(f"{pid}: {type(e).__name__}")
    sc = score(forecasts, cache, key, now)
    owner = load(OWNER) or {}
    prize = owner.get("metaculus_prize_usd_30d")
    rs = runs_summary(runs, now)
    snap = {
        "generated": now.isoformat(timespec="seconds"),
        "note": "point-in-time ledger read from data/metaculus/*.jsonl; resolutions from the public Metaculus API; prize is owner-reported only",
        "enabled_state": rs["state"],
        "ledger": {"forecast_lines": len(forecasts), "distinct_posts": len({f.get('post_id') for f in forecasts}),
                   "house_prior_used": sum(1 for f in forecasts if f.get("house_prior_used")),
                   "shadows_logged": sum(1 for f in forecasts if f.get("shadow_logged")),
                   "first": min((f.get("submitted_at") for f in forecasts), default=None),
                   "last": max((f.get("submitted_at") for f in forecasts), default=None)},
        "runs": rs,
        "north_star_resolved_prelogged": sc["north_star_resolved_prelogged"],
        "house_prior": sc["house_prior"],
        "money": {"prize_usd_30d": prize, "spend_usd_30d": rs["spend_usd_30d"],
                  "net_usd_30d": None if prize is None else round(float(prize) - rs["spend_usd_30d"], 2),
                  "definition": "prize is entered by the owner from the Metaculus payout; never inferred from rank"},
        "resolutions": cache,
        "errors": errors,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"forecast record: state={rs['state']} lines={len(forecasts)} north_star={sc['north_star_resolved_prelogged']} "
          f"ablation_n={sc['house_prior']['n']} spend30={rs['spend_usd_30d']} lookups={looked} errors={len(errors)}")
    if rs["state"] == "stalled":
        print(f"::warning::the Metaculus bot has published nothing for >{STALL_HOURS}h (disabled on purpose, or broken?)")
    if errors:
        print("::warning::metaculus lookups failed: " + ", ".join(errors[:5]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
