#!/usr/bin/env python3
"""/agi-prediction-markets — AGI consensus board(四家独立预测场所 × 五个锚点年份,一张表)。

2026-09-26 重写(第一版 2026-09-07 只列行情,从未发布过——取数步三周静默失败,页面 404)。
owner 2026-09-26:「探索类似比特币的共识算法…目标是成为 ai 时代信仰」。裁定见
docs/ai-consensus-faith-2026-09-26.md:能合法借用的只有「规则公开、任何人可重算、
历史不可回填」这三样,所以这一页是 **UTC 式的共识**——不是本站的观点,是把独立
预测源放到同一个问题(「AGI 在年份 Y 之前?」)上,给出中位数与离散度,并把每个源
与中位数的偏差摆出来(BIPM Circular T 对每个国家实验室做的正是这件事)。

红线不变(与 /ai-trading-ledger 同级,由 --selftest 断言):只引用第三方公开行情并注明
UTC 取数时间;不提供投注入口、不放联盟/推荐链接、不给交易建议、不做 zh 镜像;外链一律
nofollow 且不带 ref/utm/aff 参数。快照缺失或超过 10 天:退出并报错,宁可不出页。

确定性:agi-consensus.json 由 market-board.json 经本文件的纯函数重算;`--check`
重算一遍并与已提交的文件逐字比对,不一致就红(第三方也可以这样复核)。

自测:python3 tools/gen_market_board.py --selftest
"""
import datetime as dt
import hashlib
import json
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOARD_PATH = os.path.join(ROOT, "market-board.json")
CONSENSUS_PATH = os.path.join(ROOT, "agi-consensus.json")
OTS_MANIFEST = os.path.join(ROOT, "ots", "manifest.json")
MAX_AGE_DAYS = 10
OUT = os.path.join(ROOT, "agi-prediction-markets.html")
SLUG = "agi-prediction-markets"
PUBLISHED = "2026-09-26"

# 系列 = 「同一个问题的同一种问法」。只有问「AGI(任何公司/任何形式)在 Y 之前」的系列
# 进入中位数;OpenAI 单公司的宣布合约与 Metaculus 的 weak AGI 是别的问题,只作参照列。
# 每条判据都是对问题文本的机械正则,不是编辑挑选。
SERIES = [
    ("manifold-we-get-agi", "Manifold", re.compile(r"^will we get agi before ", re.I),
     "Will we get AGI before Y?", "achievement", "play money", True),
    ("kalshi-any-company-announce", "Kalshi", re.compile(r"will any company announce that it has achieved", re.I),
     "Any company announces AGI before D", "announcement", "real money", True),
    ("metaculus-strong-agi", "Metaculus", re.compile(r"\(strong AGI\)$"),
     "Strong AGI publicly announced before Y (community CDF)", "achievement", "no money (reputation)", True),
    ("openai-announce", None, re.compile(r"openai announce", re.I),
     "OpenAI announces AGI before Y", "announcement", "real money", False),
    ("metaculus-weak-agi", "Metaculus", re.compile(r"\(weak AGI\)$"),
     "Weak AGI publicly announced before Y (community CDF)", "achievement", "no money (reputation)", False),
]
CONSENSUS_SERIES = [s[0] for s in SERIES if s[6]]

METHOD = ("For each anchor date D, every series contributes at most one row: the open market or question "
          "whose 'before' date equals D (if a venue lists duplicates, the one with the most unique bettors, "
          "then the most volume). The consensus value is the plain median of the consensus series that have a "
          "row for D (minimum 2); spread is max minus min of those same values. Reference series are shown but "
          "never enter the median. The implied 50% date per series is the first crossing of 0.5 by linear "
          "interpolation over that series' own dated points (Metaculus: its community median date). "
          "Prices are read as the venue reports them at the fetch time and are never adjusted.")


def series_of(row):
    for sid, venue, rx, *_ in SERIES:
        if (venue is None or row["venue"] == venue) and rx.search(row["question"]):
            return sid
    return None


def _pick(rows):
    """Dedup rule for one series × one date: most bettors, then most volume (deterministic)."""
    return sorted(rows, key=lambda r: (-(r.get("bettors") or 0), -(r.get("volume") or 0), r["question"]))[0]


def consensus(board):
    """Pure: market-board.json → the consensus object. Same input, byte-identical output."""
    rows = [dict(r, series=series_of(r)) for r in board["rows"]]
    by_series = {}
    for r in rows:
        if r["series"] and r.get("before"):
            by_series.setdefault(r["series"], {}).setdefault(r["before"], []).append(r)
    table = []
    for d in board["anchors"]:
        values, refs = {}, {}
        for sid in [s[0] for s in SERIES]:
            cands = by_series.get(sid, {}).get(d)
            if not cands:
                continue
            p = round(_pick(cands)["yes"], 4)
            (values if sid in CONSENSUS_SERIES else refs)[sid] = p
        vals = list(values.values())
        table.append({
            "before": d, "values": values, "reference": refs, "n": len(vals),
            "median": round(statistics.median(vals), 4) if len(vals) >= 2 else None,
            "spread": round(max(vals) - min(vals), 4) if len(vals) >= 2 else None,
        })
    implied = {}
    for sid in [s[0] for s in SERIES]:
        pts = sorted((dt.date.fromisoformat(d), _pick(c)["yes"]) for d, c in by_series.get(sid, {}).items())
        med = next((r.get("median_date") for r in rows if r["series"] == sid and r.get("median_date")), None)
        if med:
            implied[sid] = med
        elif not pts:
            implied[sid] = None
        else:
            cross = None
            for (d0, p0), (d1, p1) in zip(pts, pts[1:]):
                if p0 < 0.5 <= p1:
                    frac = (0.5 - p0) / (p1 - p0) if p1 != p0 else 0
                    cross = (d0 + dt.timedelta(days=(d1 - d0).days * frac)).isoformat()
                    break
            if cross is None and pts[0][1] >= 0.5:
                cross = "before " + pts[0][0].isoformat()
            if cross is None and pts[-1][1] < 0.5:
                cross = "after " + pts[-1][0].isoformat()
            implied[sid] = cross
    src = json.dumps(board, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return {
        "name": "AGI consensus board",
        "url": "https://agiscorecard.com/" + SLUG,
        "license": "CC BY 4.0 (this file); prices remain the venues' data, quoted with as-of time",
        "fetched": board["fetched"],
        "board_sha256": hashlib.sha256(src).hexdigest(),
        "method": METHOD,
        "anchors": board["anchors"],
        "consensus_series": CONSENSUS_SERIES,
        "series": {s[0]: {"venue": s[1] or "Kalshi + Polymarket", "question_form": s[3], "kind": s[4],
                          "money": s[5], "in_median": s[6]} for s in SERIES},
        "venues": board["venues"],
        "table": table,
        "implied_50pct_date": implied,
        "rows": rows,
    }


def load_board(path=BOARD_PATH):
    if not os.path.exists(path):
        sys.exit("market-board.json 不存在:先跑 .github/workflows/agi-odds.yml。不编数字。")
    b = json.load(open(path, encoding="utf-8"))
    age = (dt.datetime.now(dt.timezone.utc)
           - dt.datetime.fromisoformat(b["fetched"].replace("Z", "+00:00"))).days
    if age > MAX_AGE_DAYS:
        sys.exit(f"行情快照已 {age} 天没刷新(上限 {MAX_AGE_DAYS}):取数管道坏了,拒绝出页。")
    if not b.get("rows"):
        sys.exit("行情快照里零条市场:拒绝出一页空板。")
    return b, age


def pct(p):
    return "—" if p is None else f"{p * 100:.0f}%"


def render(c):
    asof = c["fetched"][:19].replace("T", " ")
    score = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))["thesisTracker"]["score"]
    cons = [s for s in SERIES if s[6]]
    refs = [s for s in SERIES if not s[6]]
    head = "".join(f"<th>{s[1] or 'Kalshi/Polymarket'}<br><span style='font-weight:400'>{s[3]}</span></th>" for s in cons + refs)
    body = ""
    for t in c["table"]:
        cells = "".join(f"<td>{pct(t['values'].get(s[0]))}</td>" for s in cons)
        cells += "".join(f"<td class='muted'>{pct(t['reference'].get(s[0]))}</td>" for s in refs)
        body += (f"<tr><td class='nowrap'>before {t['before'][:4]}</td>{cells}"
                 f"<td class='nowrap'><strong>{pct(t['median'])}</strong></td><td class='nowrap'>{pct(t['spread'])}</td></tr>")
    headline = next((t for t in c["table"] if t["before"].startswith("2030") and t["median"] is not None), None)
    implied = "".join(
        f"<tr><td>{c['series'][sid]['venue']} — {c['series'][sid]['question_form']}</td>"
        f"<td class='nowrap'>{c['implied_50pct_date'].get(sid) or '—'}</td>"
        f"<td>{c['series'][sid]['kind']} · {c['series'][sid]['money']}{'' if c['series'][sid]['in_median'] else ' · reference only'}</td></tr>"
        for sid in c["series"])
    live = [k for k, v in c["venues"].items() if v.get("ok")]
    dead = {k: v.get("reason") for k, v in c["venues"].items() if not v.get("ok")}
    dead_html = ""
    if dead:
        dead_html = ("<p><strong>Not read this run (stated, not padded):</strong></p><ul>"
                     + "".join(f"<li><strong>{k}</strong>: {v}</li>" for k, v in dead.items()) + "</ul>")
    allrows = ""
    for r in sorted(c["rows"], key=lambda r: (r.get("before") or "9999", r["venue"])):
        q = (f'<a href="{r["url"]}" rel="nofollow noopener">{r["question"]}</a>' if r.get("url") else r["question"])
        vol = f'${r["volume"]:,.0f}' if r.get("volume") else ("—" if r.get("bettors") is None else f'{r["bettors"]} bettors')
        allrows += (f"<tr><td>{q}<div style='font-size:12px;color:var(--muted)'>{r['venue']} · {r['kind']} · {r['money']}"
                    f"{' · series: ' + r['series'] if r.get('series') else ''}</div></td>"
                    f"<td class='nowrap'>{pct(r['yes'])} Yes</td><td class='nowrap'>{vol}</td>"
                    f"<td class='nowrap'>{r.get('before') or '—'}</td></tr>")
    ots_html = ""
    if os.path.exists(OTS_MANIFEST):
        man = json.load(open(OTS_MANIFEST, encoding="utf-8"))
        ent = (man.get("files") or {}).get("agi-consensus.json") or []
        if ent:
            last = ent[-1]
            ots_html = (f"<h2>Timestamp proof</h2><p>Each version of <a href='/agi-consensus.json'>agi-consensus.json</a> is "
                        f"anchored in Bitcoin through <a href='https://opentimestamps.org/' rel='nofollow noopener'>OpenTimestamps</a> "
                        f"(latest proof <a href='/ots/{last['proof']}'>{last['proof']}</a>, status {last['status']}, "
                        f"stamped {last['stamped']}; index at <a href='/ots/manifest.json'>/ots/manifest.json</a>). "
                        f"<code>ots verify {last['proof']} -f agi-consensus.json</code> proves the file existed, byte for byte, "
                        f"before the block the proof names. It proves timing only, never that any number is right.</p>")
    return f"""<h2>Consensus table — snapshot {asof} UTC</h2>
<p>Four independent venues, one question per row: <em>AGI before this date?</em> The median is taken only across
the three series that ask about AGI in general (any company, any form); the two reference columns ask narrower
questions and are shown so you can see them, not averaged in. Every number is a third-party quote read at the
time above; none is live and none is this site's opinion.</p>
<table><thead><tr><th>Anchor</th>{head}<th>Median</th><th>Spread</th></tr></thead><tbody>{body}</tbody></table>
{"<p><strong>Headline:</strong> before 2030, the cross-venue median is <strong>" + pct(headline["median"]) + "</strong> with a spread of " + pct(headline["spread"]) + " across " + str(headline["n"]) + " series.</p>" if headline else ""}
<h2>Where each series crosses 50%</h2>
<table><thead><tr><th>Series</th><th>Implied 50% date</th><th>What it measures</th></tr></thead><tbody>{implied}</tbody></table>
<p style="font-size:13px;color:var(--muted);">An <em>announcement</em> market pays when a company says it has AGI; an
<em>achievement</em> forecast resolves on a capability bar written in the question. They can both be right at once,
and the gap between them is the most useful number on this page.</p>
<h2>Method (recompute it yourself)</h2>
<p>{METHOD}</p>
<p><code>python3 tools/gen_market_board.py --check</code> in the public repository regenerates
<a href="/agi-consensus.json">agi-consensus.json</a> from <a href="/market-board.json">market-board.json</a> and fails
if a byte differs. Markets are selected by a fixed keyword filter on what the venues return and a fixed regex per
series; nothing on this page is hand-picked. Venues read this run: {", ".join(live) or "none"}.</p>
{dead_html}
{ots_html}
<h2>Every AGI market read this run</h2>
<table><thead><tr><th>Market</th><th>Price</th><th>Volume</th><th>Before</th></tr></thead><tbody>{allrows}</tbody></table>
<h2>Why a scorecard publishes odds it does not trade</h2>
<p>A market prices <em>what a crowd expects</em>. This site grades <em>what has been demonstrated</em>, against criteria
written down before the fact: the Thesis Tracker currently reads {score}/100. When the median above and the tracker
diverge, the divergence is the story. That is also why there is no bet button here, and never will be. We are not an
operator, not a broker and not an affiliate of one; we quote public prices the way a newspaper prints a closing index.</p>
<p style="font-size:13px;color:var(--muted);">Third-party market data quoted with its as-of timestamp. This site takes no
positions, accepts no wagers, earns nothing from any venue listed, and none of this is trading or betting advice.</p>"""


def register(day):
    """把本页登记进 sitemap.xml 与 llms.txt(幂等)。页面只在取到行情之后才存在,所以由生成器在同一步登记。"""
    sm = os.path.join(ROOT, "sitemap.xml")
    entry = (f'  <url><loc>https://agiscorecard.com/{SLUG}</loc><lastmod>{day}</lastmod>'
             f'<changefreq>weekly</changefreq><priority>0.7</priority></url>')
    text = open(sm, encoding="utf-8").read()
    if f"/{SLUG}</loc>" in text:
        text = re.sub(rf'  <url><loc>https://agiscorecard\.com/{SLUG}</loc>[^\n]*', entry, text)
    else:
        anchor = '  <url><loc>https://agiscorecard.com/agi-odds-vs-evidence</loc>'
        i = text.index(anchor)
        text = text[:i] + entry + "\n" + text[i:]
    open(sm, "w", encoding="utf-8").write(text)
    lp = os.path.join(ROOT, "llms.txt")
    lt = open(lp, encoding="utf-8").read()
    line = ("- [AGI consensus board](https://agiscorecard.com/" + SLUG + "): What Polymarket, Kalshi, Manifold and "
            "Metaculus put on \"AGI before 2027/2028/2030/2035/2040\", the cross-venue median and spread, each series' "
            "implied 50% date, and the recompute formula. Machine-readable: /agi-consensus.json. No bets, no affiliate links.")
    if f"/{SLUG})" in lt:
        lt = re.sub(r"- \[[^\]]*\]\(https://agiscorecard\.com/" + SLUG + r"\)[^\n]*", line, lt)
    else:
        anchor = "- [Odds vs evidence (running series)]"
        i = lt.index(anchor)
        lt = lt[:i] + line + "\n" + lt[i:]
    open(lp, "w", encoding="utf-8").write(lt)


FIXTURE = {
    "fetched": "2026-09-26T00:00:00Z", "anchors": ["2027-01-01", "2028-01-01", "2030-01-01"],
    "venues": {"polymarket": {"ok": True}, "kalshi": {"ok": True}, "manifold": {"ok": True},
               "metaculus": {"ok": False, "reason": "METACULUS_TOKEN 未设置"}},
    "rows": [
        {"venue": "Manifold", "question": "Will we get AGI before 2027?", "kind": "achievement", "before": "2027-01-01", "yes": 0.02, "volume": 1000, "bettors": 300, "money": "play", "url": "https://manifold.markets/x/a"},
        {"venue": "Manifold", "question": "Will we get AGI before 2028?", "kind": "achievement", "before": "2028-01-01", "yes": 0.24, "volume": 900, "bettors": 336, "money": "play", "url": "https://manifold.markets/x/b"},
        {"venue": "Manifold", "question": "Will we get AGI before 2028?", "kind": "achievement", "before": "2028-01-01", "yes": 0.18, "volume": 5000, "bettors": 136, "money": "play", "url": "https://manifold.markets/x/c"},
        {"venue": "Manifold", "question": "Will we get AGI before 2030?", "kind": "achievement", "before": "2030-01-01", "yes": 0.52, "volume": 800, "bettors": 341, "money": "play", "url": "https://manifold.markets/x/d"},
        {"venue": "Kalshi", "question": "Will any company announce that it has achieved Artificial General Intelligence (AGI) before Jan 1, 2027? — Before Jan 1, 2027", "kind": "announcement", "before": "2027-01-01", "yes": 0.13, "volume": 23000, "bettors": None, "money": "real", "url": "https://kalshi.com/markets/kxagico"},
        {"venue": "Kalshi", "question": "Will any company announce that it has achieved Artificial General Intelligence (AGI) before Jan 1, 2028? — Before Jan 1, 2028", "kind": "announcement", "before": "2028-01-01", "yes": 0.66, "volume": 14000, "bettors": None, "money": "real", "url": "https://kalshi.com/markets/kxagico"},
        {"venue": "Polymarket", "question": "OpenAI announces it has achieved AGI before 2027?", "kind": "announcement", "before": "2027-01-01", "yes": 0.165, "volume": 275000, "bettors": None, "money": "real", "url": "https://polymarket.com/event/x"},
        {"venue": "Manifold", "question": "Superhuman mathematical problem solving before 2030, assuming no AGI yet?", "kind": "achievement", "before": "2030-01-01", "yes": 0.87, "volume": 3000, "bettors": 193, "money": "play", "url": None},
    ],
}


def selftest():
    c = consensus(FIXTURE)
    c2 = consensus(json.loads(json.dumps(FIXTURE)))
    html = render(c)
    t = {row["before"]: row for row in c["table"]}
    checks = [
        ("重算逐字节相同(确定性)", json.dumps(c, sort_keys=True) == json.dumps(c2, sort_keys=True)),
        ("2028 重复题按 bettors 取 336 那条(0.24 不是 0.18)", t["2028-01-01"]["values"]["manifold-we-get-agi"] == 0.24),
        ("2028 中位数 = median(0.24, 0.66)", t["2028-01-01"]["median"] == 0.45 and t["2028-01-01"]["spread"] == 0.42),
        ("OpenAI 单公司合约只作参照,不进中位数", "openai-announce" in t["2027-01-01"]["reference"] and "openai-announce" not in t["2027-01-01"]["values"]),
        ("只有 1 个系列的锚点不给中位数", t["2030-01-01"]["median"] is None),
        ("噪音题(数学/假设无 AGI)不进任何系列", all(r["series"] is None for r in c["rows"] if "mathematical" in r["question"])),
        ("Manifold 50% 交点落在 2028→2030 之间", "2029" in (c["implied_50pct_date"]["manifold-we-get-agi"] or "")),
        ("Kalshi 50% 交点用线性插值落在 2027 年内", (c["implied_50pct_date"]["kalshi-any-company-announce"] or "").startswith("2027")),
        ("缺场所照实说出来了", "METACULUS_TOKEN" in html),
        ("时间戳出现在正文", "2026-09-26 00:00:00" in html),
        ("外链全部 nofollow", html.count('href="https://manifold.markets') + html.count('href="https://kalshi.com') + html.count('href="https://polymarket.com') == html.count('rel="nofollow noopener"') - html.count('opentimestamps.org')),
        ("外链不带任何推荐/联盟参数", not re.search(r'href="https?://[^"]*[?&](ref|r|utm_[a-z]+|aff|via)=', html)),
        ("没有开户/入金/下注的行动号召", not re.search(r"(?i)\b(sign ?up|deposit|place a (bet|wager)|trade now|join now)\b", html)),
        ("无 url 的行不生成空链接", 'href=""' not in html),
        ("方法段落在页面上", METHOD[:60] in html),
    ]
    for name, ok in checks:
        print(("  ok   " if ok else "  FAIL ") + name)
    if not all(ok for _, ok in checks):
        return 1
    for bad, why in ((dict(FIXTURE, fetched="2020-01-01T00:00:00Z"), "过期快照"), (dict(FIXTURE, rows=[]), "空板")):
        p = os.path.join(ROOT, ".selftest-board.json")
        json.dump(bad, open(p, "w"))
        try:
            load_board(p)
            print(f"  FAIL {why} 没有被拦下")
            return 1
        except SystemExit:
            print(f"  ok   {why} 被拦下")
        finally:
            os.remove(p)
    print("\n全部通过(共识重算 + 出页路径 + 两条拒绝路径)")
    return 0


def main(argv):
    if "--selftest" in argv:
        return selftest()
    board, age = load_board()
    c = consensus(board)
    out = json.dumps(c, ensure_ascii=False, indent=1) + "\n"
    if "--check" in argv:
        have = open(CONSENSUS_PATH, encoding="utf-8").read() if os.path.exists(CONSENSUS_PATH) else ""
        if have != out:
            sys.exit("agi-consensus.json 与 market-board.json 重算结果不一致 —— 有人改了共识文件而没有重跑生成器")
        print("agi-consensus.json 重算一致")
        return 0
    open(CONSENSUS_PATH, "w", encoding="utf-8").write(out)
    body = render(c)
    faqs = [
        ("Is this the AGI Scorecard's own forecast?",
         "No. It is a median over independent public forecasting venues, computed by a published formula that anyone "
         "can rerun on the same snapshot. The scorecard's own position is the Thesis Tracker, which grades evidence, "
         "not expectations."),
        ("Are these live odds?",
         "No. Each run records a snapshot with an exact UTC timestamp and links to the market so you can check the "
         "current price yourself. A quoted price that pretends to be live is the single most common way odds coverage "
         "misleads people."),
        ("Why are Manifold, Kalshi and Metaculus averaged but not the OpenAI contracts?",
         "Because a median only means something across series that answer the same question. 'Any company announces AGI', "
         "'we get AGI' and 'strong AGI is publicly announced' all ask about AGI in general; 'OpenAI announces AGI' is one "
         "company's announcement and 'weak AGI' is a lower bar, so both are shown as reference columns instead."),
        ("Can I bet here?",
         "No. This site is not an operator, a broker, or an affiliate of one. There is no wager mechanism, no referral "
         "link, and no revenue from any venue listed."),
        ("How are the markets chosen?",
         "By a fixed keyword filter applied to whatever the venues' own search and series endpoints return that run, "
         "then a fixed regex per series. The board can look thin in a quiet week, and it will say so rather than pad itself."),
    ]
    related = [("/agi-odds-vs-evidence", "Odds vs evidence — the running comparison"),
               ("/agi-2027-resolution", "AGI-2027 resolution criteria & countdown"),
               ("/when-will-agi-arrive", "When will AGI arrive? Every dated forecast"),
               ("/calibration", "How we score our own predictions")]
    day = board["fetched"][:10]
    html = g.build(
        slug=SLUG,
        title="AGI Consensus Board: What Forecasters Put on AGI by 2027–2040",
        desc=("Polymarket, Kalshi, Manifold and Metaculus on 'AGI before 2027/2028/2030/2035/2040': cross-venue median, "
              "spread and each series' implied 50% date, all with exact snapshot times and a published recompute formula. "
              "No bets, no affiliate links."),
        og_title="AGI consensus board — four venues, one table, every number dated",
        eyebrow=f"Consensus board · snapshot {day}",
        h1="What forecasters put on AGI, by year",
        capsule=('<span class="verdict">A median across independent venues, not an opinion.</span> Four forecasting '
                 'venues asked the same question — AGI before this date? — with the spread between them shown, the '
                 'formula published, and every price carrying the moment it was read.'),
        body_html=body, faqs=faqs, related=related,
        extra_schema=[{"@context": "https://schema.org", "@type": "Dataset", "name": "AGI consensus board",
                       "description": "Cross-venue median and spread of AGI-by-year forecasts from Polymarket, Kalshi, Manifold and Metaculus, with method.",
                       "url": "https://agiscorecard.com/" + SLUG, "license": "https://creativecommons.org/licenses/by/4.0/",
                       "dateModified": day, "creator": {"@type": "Organization", "name": "The AGI Scorecard", "url": "https://agiscorecard.com/"},
                       "distribution": [{"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": "https://agiscorecard.com/agi-consensus.json"}]}],
    )
    html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                        f'"datePublished": "{PUBLISHED}", "dateModified": "{day}"')
    visible = dt.date.fromisoformat(day).strftime("%B %-d, %Y")
    html = html.replace("Last updated: June 30, 2026", f"Last updated: {visible}")
    open(OUT, "w", encoding="utf-8").write(html)
    register(day)
    print(f"agi-prediction-markets.html + agi-consensus.json written · {len(board['rows'])} 条 · 快照 {age} 天前")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
