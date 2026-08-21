# -*- coding: utf-8 -*-
"""Render the "Readers' calls" section on /forecaster-leaderboard from picks-agg.json.

strategy-2027 九月项 v0(2026-08-21 提前实施,规格:docs-picks-leaderboard-spec.md)。

Data flow (no D1 access at build time — the aggregation file is refreshed by
daily-loop sessions that DO hold the D1 MCP connection):

  Refresh recipe (run in a session with Cloudflare MCP, then commit the JSON):
    SELECT location pid, label pick, MIN(day) first_day
    FROM events WHERE name='pick_ledger' AND location LIKE 'p_%'
    GROUP BY location, label;
  -> picks_total = COUNT of rows; by_prediction = counts per label suffix;
  -> players: after a verdict flip, mark each pid's 'flipfirst' pick correct iff
     its prediction is the one that flipped; streak increments on consecutive
     correct calls across flips. resolved_flips counts flips scored so far.
  Never hand-edit numbers; the JSON must always be reproducible from D1.

Idempotent: rewrites <!--READER_BOARD-->...<!--/READER_BOARD--> in place.
Run: python3 tools/gen_leaderboard.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "forecaster-leaderboard.html")
AGG = os.path.join(ROOT, "picks-agg.json")

NAMES = {
    "agi-2027": "AGI by 2027",
    "the-project": "US gov AGI project",
    "intelligence-explosion": "Intelligence explosion",
    "superintelligence": "Superintelligence",
}


def block(agg):
    total = agg.get("picks_total", 0)
    cta = ('<p style="margin:.8rem 0 0;font-size:14px;"><a href="/progress-index#flip-poll" '
           'onclick="gtag(\'event\',\'index_click\',{location:\'leaderboard_pick_cta\'});" '
           'style="font-weight:600;">Make your call — one tap, no account &rarr;</a></p>')
    sub = ('<p style="margin:.5rem 0 0;font-size:13px;color:var(--muted);">Your call is scored the day a verdict '
           'actually flips — <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=leaderboard_streak" '
           'target="_blank" rel="noopener" onclick="gtag(\'event\',\'subscribe_click\',{location:\'leaderboard_streak\'});">'
           'one email when that happens</a>, nothing before.</p>')
    if total == 0:
        body = ('<p>Reader picks are recorded (anonymously, no account) as of August 21, 2026. '
                'The first reader scoreboard appears once picks exist and the next verdict flip scores them. '
                'Right now the board is honestly empty — be the first row.</p>')
        return ("<!--READER_BOARD-->\n"
                "<h2>The eleventh forecaster: you</h2>\n"
                f"{body}{cta}{sub}\n"
                "<!--/READER_BOARD-->")
    rows = "".join(
        f'<tr><td>{NAMES.get(k, k)}</td><td class="nowrap">{v}</td></tr>'
        for k, v in sorted(agg.get("by_prediction", {}).items(), key=lambda x: -x[1]))
    players = agg.get("players", [])
    ptable = ""
    if players:
        prow = "".join(
            f'<tr data-pid="{p["pid"]}"><td class="nowrap">{p["pid"]}</td><td>{p.get("correct",0)}</td>'
            f'<td>{p.get("wrong",0)}</td><td>{p.get("streak",0)}</td></tr>' for p in players[:20])
        ptable = ('<table><thead><tr><th>Reader</th><th>Correct</th><th>Wrong</th><th>Streak</th></tr></thead>'
                  f'<tbody>{prow}</tbody></table>'
                  '<script>try{var mypid=localStorage.getItem("agi_pid");if(mypid){var r=document.querySelector('
                  '\'tr[data-pid="\'+mypid.slice(0,8)+\'"]\');if(r){r.style.background="rgba(124,106,245,.12)";}}}catch(e){}</script>')
    scored = agg.get("resolved_flips", 0)
    note = (f'<p class="src">{total} reader call(s) on record since 2026-08-21; {scored} verdict flip(s) scored so far. '
            'Anonymous 8-character ids only — no accounts, no emails. Aggregates recomputed from the first-party event log; '
            'the raw aggregation is public at <a href="/picks-agg.json">/picks-agg.json</a>.</p>')
    return ("<!--READER_BOARD-->\n"
            "<h2>The eleventh forecaster: you</h2>\n"
            "<p>Every reader call is a bet on which unresolved prediction flips first — scored against the same "
            "pre-registered flip conditions the professionals above are graded on.</p>\n"
            f'<table><thead><tr><th>Prediction</th><th>Reader picks</th></tr></thead><tbody>{rows}</tbody></table>\n'
            f"{ptable}{note}{cta}{sub}\n"
            "<!--/READER_BOARD-->")


def main():
    agg = json.load(open(AGG, encoding="utf-8"))
    html = open(PAGE, encoding="utf-8").read()
    blk = block(agg)
    if "<!--READER_BOARD-->" in html:
        new = re.sub(r"<!--READER_BOARD-->.*?<!--/READER_BOARD-->", blk, html, flags=re.S)
    else:
        anchor = "<h2>The one scoreboard that moves with the evidence</h2>"
        if anchor not in html:
            raise SystemExit("anchor heading not found in forecaster-leaderboard.html")
        new = html.replace(anchor, blk + "\n" + anchor, 1)
    if new != html:
        open(PAGE, "w", encoding="utf-8").write(new)
        print("reader board rendered (picks_total=%s)" % agg.get("picks_total", 0))
    else:
        print("reader board unchanged")


if __name__ == "__main__":
    main()
