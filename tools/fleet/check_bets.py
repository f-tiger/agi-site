#!/usr/bin/env python3
"""The fleet's bet ledger checker (zero AI). Runs inside fleet-heartbeat.yml.

Why (2026-09-13, owner: 「目标是持续优化,探索,扩张」): the only mechanism of ByteDance's
that a solo fleet can copy is the *app factory* — launch small, pre-register the kill date,
settle on the date, scale or kill by the number. The fleet already pre-registers judgment
lines (~40 of them, scattered over nine CLAUDE.md files) but nothing enforced settlement:
a line could pass its date and simply never be read. This checker makes the date binding.

Ledger: data/fleet-bets.json — one row per open judgment line:
  {id, site, due, metric, threshold, win, lose, source, status, settled?, reading?}
  status: open | won | lost | insufficient | withdrawn   (anything else is an error)

Rules (all pure functions, self-tested):
  * due within 3 days and still open           → ::warning (reminder for the next session)
  * due more than 7 days ago and still open    → ::error  → heartbeat red → GitHub email
  * settled rows must carry `settled` (date) and `reading` (the number, or "insufficient")
  * ids unique; dates ISO; source names a file:line so the full text can be found
Exit 1 on any error. Never modifies the ledger — settlement is a judgment, humans/sessions
write it; this only refuses to let it be forgotten.

Usage: python3 tools/fleet/check_bets.py [--today=YYYY-MM-DD] [--selftest]
"""
import datetime as dt
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LEDGER = os.path.join(ROOT, "data", "fleet-bets.json")
STATUSES = {"open", "won", "lost", "insufficient", "withdrawn"}
SOON, OVERDUE = 3, 7


def check(bets, today):
    """Pure: returns (errors, warnings, summary)."""
    errors, warnings, ids = [], [], set()
    n_open = n_settled = 0
    for b in bets:
        bid = b.get("id") or "<no id>"
        if bid in ids:
            errors.append(f"duplicate id {bid}")
        ids.add(bid)
        for k in ("id", "site", "due", "metric", "threshold", "source", "status"):
            if not b.get(k):
                errors.append(f"{bid}: missing {k}")
        try:
            due = dt.date.fromisoformat(b.get("due", ""))
        except Exception:
            errors.append(f"{bid}: bad due date {b.get('due')!r}")
            continue
        st = b.get("status")
        if st not in STATUSES:
            errors.append(f"{bid}: unknown status {st!r}")
            continue
        if st == "open":
            n_open += 1
            days = (due - today).days
            if days < -OVERDUE:
                errors.append(f"{bid} ({b['site']}) was due {due}, {-days} days ago, still open — settle it "
                              f"(won/lost/insufficient) with the reading; source {b['source']}")
            elif days <= SOON:
                warnings.append(f"{bid} ({b['site']}) due {due} ({'today' if days == 0 else f'in {days} d' if days > 0 else f'{-days} d ago'}): {b['metric']} {b['threshold']}")
        else:
            n_settled += 1
            if not b.get("settled") or b.get("reading") in (None, ""):
                errors.append(f"{bid}: status {st} needs `settled` date and `reading`")
    return errors, warnings, {"open": n_open, "settled": n_settled, "total": len(bets)}


def selftest():
    T = dt.date(2026, 9, 13)
    row = lambda **k: {**{"id": "x", "site": "s", "due": "2026-10-01", "metric": "m", "threshold": "t",
                          "source": "f:1", "status": "open"}, **k}
    cases = [
        ("open, far away → clean", check([row()], T) == ([], [], {"open": 1, "settled": 0, "total": 1})),
        ("due in 3 d → warning", len(check([row(due="2026-09-16")], T)[1]) == 1 and not check([row(due="2026-09-16")], T)[0]),
        ("due today → warning", len(check([row(due="2026-09-13")], T)[1]) == 1),
        ("5 d overdue → warning only", not check([row(due="2026-09-08")], T)[0] and len(check([row(due="2026-09-08")], T)[1]) == 1),
        ("8 d overdue → error", len(check([row(due="2026-09-05")], T)[0]) == 1),
        ("settled with reading → clean", check([row(due="2026-09-01", status="lost", settled="2026-09-02", reading="0")], T)[0] == []),
        ("settled without reading → error", len(check([row(due="2026-09-01", status="won", settled="2026-09-02")], T)[0]) == 1),
        ("bad status → error", len(check([row(status="maybe")], T)[0]) == 1),
        ("duplicate id → error", any("duplicate" in e for e in check([row(), row()], T)[0])),
        ("bad date → error", any("bad due" in e for e in check([row(due="soon")], T)[0])),
        ("missing metric → error", any("missing metric" in e for e in check([row(metric="")], T)[0])),
    ]
    for n, ok in cases:
        print(("✅ " if ok else "❌ ") + n)
    return 0 if all(ok for _, ok in cases) else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    today = dt.date.today()
    for a in argv:
        if a.startswith("--today="):
            today = dt.date.fromisoformat(a.split("=", 1)[1])
    bets = json.load(open(LEDGER, encoding="utf-8"))["bets"]
    errors, warnings, summary = check(bets, today)
    print(f"fleet bets: {summary['open']} open / {summary['settled']} settled / {summary['total']} total (today {today})")
    for w in warnings:
        print("::warning::" + w)
    for e in errors:
        print("::error::" + e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
