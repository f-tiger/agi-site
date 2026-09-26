#!/usr/bin/env python3
"""/agi-prediction-markets — AGI consensus board(四家独立预测场所 × 五个锚点日期,一张表)。

2026-09-26 重写(第一版 2026-09-07 只列行情,从未发布过——取数步三周静默失败,页面 404)。
owner 2026-09-26:「探索类似比特币的共识算法…目标是成为 ai 时代信仰」。裁定见
docs/ai-consensus-faith-2026-09-26.md:能合法借用的只有「规则公开、任何人可重算、
历史不可回填」这三样,所以这一页是 **UTC 式的共识**——不是本站的观点,是把独立
预测源放到同一个锚点日期(「AGI 在 D 之前?」)上,给出中位数与离散度,并把每个源
与中位数的偏差摆出来(BIPM Circular T 对每个国家实验室做的正是这件事)。

红线不变(与 /ai-trading-ledger 同级,由 --selftest 断言):只引用第三方公开行情并注明
UTC 取数时间;不提供投注入口、不放联盟/推荐链接、不给交易建议、不做 zh 镜像;外链一律
nofollow 且不带 ref/utm/aff 参数。快照缺失或超过 10 天:退出并报错,宁可不出页。

确定性:agi-consensus.json 由 market-board.json 经本文件的纯函数重算;`--check`
重算一遍并与已提交的文件逐字比对,不一致就红(第三方也可以这样复核)。

09-26 评审后的三条纪律(对抗评审各自独立抓到,记在这里免得下次再犯):
  · 系列判据 = 场所白名单 × 问题正则,同一系列内去重先看真钱再看成交量——bettors 只有 Manifold 报,
    按 bettors 排会让一个 $310 的玩钱条件市场顶掉 Kalshi 的真钱合约;
  · 页面上关于「四家 / 同一个问题 / 已锚定」的每一句都从本次运行的数据生成,不写死;
  · 时间戳段只按 sha256 匹配 manifest 条目;当前版本没被 stamp 就照实说「尚未锚定」。

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
SCRIPT_URL = "https://github.com/f-tiger/agi-site/blob/main/sites/agiscorecard/tools/gen_market_board.py"

# 系列 = 「同一类问题在同一家(或同一组)场所的同一种问法」。字段:id、场所白名单、问题正则、
# 问法、判定依据(从各场所的解析文本抄来,09-26 逐一读过)、钱、是否进中位数。
# 只有问「AGI(任何公司/任何形式)在 D 之前」的系列进入中位数;OpenAI 单公司的宣布合约与
# Metaculus 的 weak AGI 是别的问题,只作参照列。每条判据都是对问题文本的机械正则,不是编辑挑选。
SERIES = [
    ("manifold-we-get-agi", ("Manifold",), re.compile(r"^will we get agi before ", re.I),
     "Will we get AGI before D?",
     "Manifold: 'Resolves as YES if such a system is created and publicly announced before D'; since 2025-11-02 the "
     "family uses the creator's 'In what specific year will we hit AGI?' market as its baseline (creator/mod judgement).",
     "play money", True),
    ("kalshi-any-company-announce", ("Kalshi",), re.compile(r"will any company announce that it has achieved", re.I),
     "Any company announces AGI before D",
     "Kalshi KXAGICO: settles on a company announcement per the series' settlement sources (SEC EDGAR filings and named "
     "news outlets); it does not judge capability.",
     "real money", True),
    ("metaculus-strong-agi", ("Metaculus",), re.compile(r"\(strong AGI\)$"),
     "Strong AGI devised, tested and publicly announced before D (community CDF)",
     "Metaculus: resolves against the question's own tests (adversarial Turing test, robotic assembly, general game "
     "play, coding), judged by Metaculus admins.",
     "no money (reputation)", True),
    ("openai-announce", ("Kalshi", "Polymarket"), re.compile(r"openai announce", re.I),
     "OpenAI announces AGI before D",
     "Polymarket/Kalshi: resolves on OpenAI or an official representative announcing it has created AGI "
     "(Polymarket: 'consensus of credible reporting' as secondary source).",
     "real money", False),
    ("metaculus-weak-agi", ("Metaculus",), re.compile(r"\(weak AGI\)$"),
     "Weak AGI publicly announced before D (community CDF)",
     "Metaculus: a lower bar than the strong-AGI question (Turing test with text only, Winograd, SAT, Montezuma), "
     "judged by Metaculus admins.",
     "no money (reputation)", False),
]
CONSENSUS_SERIES = [s[0] for s in SERIES if s[6]]
MONEY_RANK = {"real": 0, "none": 1, "play": 2}

METHOD = ("For each anchor date D, every series contributes at most one row: the open market or question whose "
          "'before' date equals D. A series is a venue whitelist plus a fixed regular expression on the question text; "
          "if a venue lists duplicates for one date, the row kept is the real-money one first, then the highest volume, "
          "then the most unique bettors. The consensus value is the plain median of the consensus series that have a "
          "row for D (minimum 2 series; otherwise no median is printed); spread is max minus min of those same values. "
          "Reference series are shown but never enter the median. The implied 50% date per series is the first crossing "
          "of 0.5 by linear interpolation over that series' own dated points (Metaculus: its community median date). "
          "Prices are read as the venue reports them at the fetch time and are never adjusted. The fetcher keeps every "
          "dated timeline row it found and, beyond those, only the highest-volume rows up to a fixed cap, so the full "
          "list below is 'all dated rows plus the top of the rest', not every match.")


def series_of(row):
    for sid, venues, rx, *_ in SERIES:
        if row["venue"] in venues and rx.search(row["question"]):
            return sid
    return None


def _pick(rows):
    """Dedup rule for one series × one date: real money first, then volume, then bettors (deterministic)."""
    return sorted(rows, key=lambda r: (MONEY_RANK.get(r.get("money"), 3), -(r.get("volume") or 0),
                                       -(r.get("bettors") or 0), r["question"]))[0]


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
    entered = sorted({sid for t in table for sid in t["values"]})
    return {
        "name": "AGI consensus board",
        "url": "https://agiscorecard.com/" + SLUG,
        "license": "CC BY 4.0 (this file); prices remain the venues' data, quoted with as-of time",
        "fetched": board["fetched"],
        "board_sha256": hashlib.sha256(src).hexdigest(),
        "method": METHOD,
        "recompute": {"script": SCRIPT_URL, "command": "python3 tools/gen_market_board.py --check",
                      "inputs": ["https://agiscorecard.com/market-board.json"]},
        "anchors": board["anchors"],
        "consensus_series": CONSENSUS_SERIES,
        "series_in_median_this_run": entered,
        "series": {s[0]: {"venues": list(s[1]), "question_form": s[3], "resolution_basis": s[4],
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


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def ots_section(consensus_sha, manifest_path=OTS_MANIFEST):
    """Honest, manifest-derived timestamp paragraph. Never names a proof that does not match the served file."""
    if not os.path.exists(manifest_path):
        return ""
    ent = (json.load(open(manifest_path, encoding="utf-8")).get("files") or {}).get("agi-consensus.json") or []
    if not ent:
        return ""
    mine = next((e for e in ent if e.get("sha256") == consensus_sha), None)
    n_btc = sum(1 for e in ent if e.get("status") == "bitcoin")
    n_pend = sum(1 for e in ent if e.get("status") == "pending")
    if mine:
        state = (f"This version (sha256 {consensus_sha[:12]}…) has proof <a href=\"/ots/{mine['proof']}\">{mine['proof']}</a>, "
                 f"status <strong>{mine['status']}</strong> (stamped {mine['stamped']}).")
    else:
        state = (f"This version (sha256 {consensus_sha[:12]}…) has not been stamped yet; the daily heartbeat stamps new versions "
                 f"and the proof appears in the manifest afterwards.")
    return (f"<h2>Timestamp proofs</h2><p>Versions of <a href=\"/agi-consensus.json\">agi-consensus.json</a> stamped since "
            f"{PUBLISHED} carry an <a href=\"https://opentimestamps.org/\" rel=\"nofollow noopener\">OpenTimestamps</a> proof: "
            f"{len(ent)} version(s) listed, {n_btc} with a Bitcoin block attestation, {n_pend} pending (calendar receipt only, "
            f"not in a block yet). {state} Index: <a href=\"/ots/manifest.json\">/ots/manifest.json</a>. A proof shows that the "
            f"exact bytes existed no later than the block it names; it says nothing about whether the numbers are right, and "
            f"versions before {PUBLISHED} rest on the public git log only. Verify with the client or web verifier at "
            f"opentimestamps.org: <code>ots verify &lt;proof&gt; -f agi-consensus.json</code>.</p>")


def render(c, ots_html=""):
    asof = c["fetched"][:19].replace("T", " ")
    tr = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))["thesisTracker"]
    score = tr["score"]
    score_s = str(int(score)) if float(score) == int(score) else str(score)
    cons = [s for s in SERIES if s[6]]
    refs = [s for s in SERIES if not s[6]]
    head = "".join(f"<th>{' + '.join(s[1])}<br><span style='font-weight:400'>{s[3]}</span></th>" for s in cons + refs)
    body = ""
    for t in c["table"]:
        cells = "".join(f"<td>{pct(t['values'].get(s[0]))}</td>" for s in cons)
        cells += "".join(f"<td class='muted'>{pct(t['reference'].get(s[0]))}</td>" for s in refs)
        body += (f"<tr><td class='nowrap'>before {t['before'][:4]}</td>{cells}"
                 f"<td class='nowrap'><strong>{pct(t['median'])}</strong></td><td class='nowrap'>{pct(t['spread'])}</td></tr>")
    entered = c["series_in_median_this_run"]
    live = [k for k, v in c["venues"].items() if v.get("ok")]
    dead = {k: v.get("reason") for k, v in c["venues"].items() if not v.get("ok")}
    medians = [t for t in c["table"] if t["median"] is not None]
    summary_line = (" · ".join(f"before {t['before'][:4]} <strong>{pct(t['median'])}</strong> (spread {pct(t['spread'])})" for t in medians)
                    if medians else "no anchor date had two consensus series this run, so no median is printed")
    implied = "".join(
        f"<tr><td>{' + '.join(c['series'][sid]['venues'])} — {c['series'][sid]['question_form']}</td>"
        f"<td class='nowrap'>{c['implied_50pct_date'].get(sid) or '—'}</td>"
        f"<td>{c['series'][sid]['resolution_basis']} <em>{c['series'][sid]['money']}{'' if c['series'][sid]['in_median'] else ' · reference only'}</em></td></tr>"
        for sid in c["series"])
    dead_html = ""
    if dead:
        dead_html = ("<p><strong>Not read this run (stated, not padded):</strong></p><ul>"
                     + "".join(f"<li><strong>{k}</strong>: {v}</li>" for k, v in dead.items()) + "</ul>")
    allrows = ""
    for r in sorted(c["rows"], key=lambda r: (r.get("before") or "9999", r["venue"])):
        q = (f'<a href="{r["url"]}" rel="nofollow noopener">{r["question"]}</a>' if r.get("url") else r["question"])
        vol = f'${r["volume"]:,.0f}' if r.get("volume") else ("—" if r.get("bettors") is None else f'{r["bettors"]} bettors')
        allrows += (f"<tr><td>{q}<div style='font-size:12px;color:var(--muted)'>{r['venue']} · {r['money']}"
                    f"{' · series: ' + r['series'] if r.get('series') else ''}</div></td>"
                    f"<td class='nowrap'>{pct(r['yes'])} Yes</td><td class='nowrap'>{vol}</td>"
                    f"<td class='nowrap'>{r.get('before') or '—'}</td></tr>")
    found = sum(v.get("found") or 0 for v in c["venues"].values())
    return f"""<h2>Consensus table — snapshot {asof} UTC</h2>
<p>Independent venues, one anchor date per row: <em>AGI before this date?</em> Venues read this run: <strong>{", ".join(live) or "none"}</strong>.
Series that entered the median this run: <strong>{", ".join(entered) or "none"}</strong> (of the {len(cons)} eligible: {", ".join(s[0] for s in cons)});
the reference columns ask narrower questions and are shown, never averaged. Every number is a third-party quote read at the time
above; none is live and none is this site's opinion. Note that the series do not share one definition of AGI — each resolves on
its own rules (listed in the next table), and the median mixes an announcement-settled market with judged forecasts.</p>
<table><thead><tr><th>Anchor</th>{head}<th>Median</th><th>Spread</th></tr></thead><tbody>{body}</tbody></table>
<p><strong>This run:</strong> {summary_line}.</p>
<h2>Where each series crosses 50%, and what each one actually resolves on</h2>
<table><thead><tr><th>Series</th><th>Implied 50% date</th><th>Resolution basis (from the venue's own text)</th></tr></thead><tbody>{implied}</tbody></table>
<p style="font-size:13px;color:var(--muted);">A market that settles on an announcement pays when a company says it has AGI; a judged
forecast resolves on the tests written into the question. The gap between them is a real number on this page, but read it with
the resolution column, not the venue name.</p>
<h2>Method (recompute it yourself)</h2>
<p>{METHOD}</p>
<p><a href="{SCRIPT_URL}" rel="nofollow noopener">gen_market_board.py</a> in the public repository regenerates
<a href="/agi-consensus.json">agi-consensus.json</a> from <a href="/market-board.json">/market-board.json</a> with
<code>python3 tools/gen_market_board.py --check</code>, and fails if a byte differs. Markets are selected by a fixed keyword filter
on what the venues return and a fixed venue-whitelist × regex per series; nothing on this page is hand-picked.</p>
{dead_html}
{ots_html}
<h2>Markets read this run ({len(c['rows'])} shown of {found} matched; all dated timeline rows kept, the rest top-by-volume)</h2>
<table><thead><tr><th>Market</th><th>Price</th><th>Volume</th><th>Before</th></tr></thead><tbody>{allrows}</tbody></table>
<h2>Why a scorecard publishes odds it does not trade</h2>
<p>A market prices <em>what a crowd expects</em>. This site grades <em>what has been demonstrated</em>, against criteria
written down before the fact — the <a href="/progress-index" onclick="gtag('event','index_click',{{location:'board_live'}})">AGI-2027 Thesis Tracker</a>
reads <strong>>{score_s}<span style="font-size:16px;color:var(--muted);">/100</span></strong> as of <strong>{tr['asOf']}</strong>.
When the median above and the tracker diverge, the divergence is the story. That is also why there is no bet button here, and never
will be. We are not an operator, not a broker and not an affiliate of one; we quote public prices the way a newspaper prints a closing index.</p>
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
            "Metaculus (when readable) put on \"AGI before 2027/2028/2030/2035/2040\", the cross-venue median and spread, each series' "
            "implied 50% date and resolution basis, and the recompute formula. Machine-readable: /agi-consensus.json. No bets, no affiliate links.")
    if f"/{SLUG})" in lt:
        lt = re.sub(r"- \[[^\]]*\]\(https://agiscorecard\.com/" + SLUG + r"\)[^\n]*", line, lt)
    else:
        anchor = "- [Odds vs evidence (running series)]"
        i = lt.index(anchor)
        lt = lt[:i] + line + "\n" + lt[i:]
    open(lp, "w", encoding="utf-8").write(lt)


FIXTURE = {
    "fetched": "2026-09-26T00:00:00Z", "anchors": ["2027-01-01", "2028-01-01", "2030-01-01"],
    "venues": {"polymarket": {"ok": True, "found": 1}, "kalshi": {"ok": True, "found": 3}, "manifold": {"ok": True, "found": 6},
               "metaculus": {"ok": False, "reason": "METACULUS_TOKEN 未设置", "found": 0}},
    "rows": [
        {"venue": "Manifold", "question": "Will we get AGI before 2027?", "kind": "achievement", "before": "2027-01-01", "yes": 0.02, "volume": 1000, "bettors": 300, "money": "play", "url": "https://manifold.markets/x/a"},
        {"venue": "Manifold", "question": "Will we get AGI before 2028?", "kind": "achievement", "before": "2028-01-01", "yes": 0.24, "volume": 900, "bettors": 336, "money": "play", "url": "https://manifold.markets/x/b"},
        {"venue": "Manifold", "question": "Will we get AGI before 2028?", "kind": "achievement", "before": "2028-01-01", "yes": 0.18, "volume": 5000, "bettors": 136, "money": "play", "url": "https://manifold.markets/x/c"},
        {"venue": "Manifold", "question": "Will we get AGI before 2030?", "kind": "achievement", "before": "2030-01-01", "yes": 0.52, "volume": 800, "bettors": 341, "money": "play", "url": "https://manifold.markets/x/d"},
        {"venue": "Manifold", "question": "Will OpenAI announce AGI before 2028, conditional on X?", "kind": "announcement", "before": "2028-01-01", "yes": 0.9, "volume": 310, "bettors": 3, "money": "play", "url": "https://manifold.markets/x/e"},
        {"venue": "Kalshi", "question": "Will any company announce that it has achieved Artificial General Intelligence (AGI) before Jan 1, 2027? — Before Jan 1, 2027", "kind": "announcement", "before": "2027-01-01", "yes": 0.13, "volume": 23000, "bettors": None, "money": "real", "url": "https://kalshi.com/markets/kxagico"},
        {"venue": "Kalshi", "question": "Will any company announce that it has achieved Artificial General Intelligence (AGI) before Jan 1, 2028? — Before Jan 1, 2028", "kind": "announcement", "before": "2028-01-01", "yes": 0.66, "volume": 14000, "bettors": None, "money": "real", "url": "https://kalshi.com/markets/kxagico"},
        {"venue": "Kalshi", "question": "Will OpenAI announce the creation of AGI? — Before 2028", "kind": "announcement", "before": "2028-01-01", "yes": 0.5, "volume": 290000, "bettors": None, "money": "real", "url": "https://kalshi.com/markets/oaiagi"},
        {"venue": "Polymarket", "question": "OpenAI announces it has achieved AGI before 2027?", "kind": "announcement", "before": "2027-01-01", "yes": 0.165, "volume": 275000, "bettors": None, "money": "real", "url": "https://polymarket.com/event/x"},
        {"venue": "Manifold", "question": "Superhuman mathematical problem solving before 2030, assuming no AGI yet?", "kind": "achievement", "before": "2030-01-01", "yes": 0.87, "volume": 3000, "bettors": 193, "money": "play", "url": None},
    ],
}


def _ext_links(html):
    return len(re.findall(r'href=["\']https?://(?!agiscorecard\.com)', html))


def _nofollow(html):
    return len(re.findall(r'rel=["\']nofollow noopener["\']', html))


def selftest():
    import tempfile
    c = consensus(FIXTURE)
    c2 = consensus(json.loads(json.dumps(FIXTURE)))
    # exercise the timestamp paragraph both with a matching proof and with none
    td = tempfile.mkdtemp()
    mp = os.path.join(td, "manifest.json")
    json.dump({"files": {"agi-consensus.json": [{"sha256": "a" * 64, "proof": "agi-consensus.json.aaaaaaaaaaaa.ots", "stamped": "2026-09-26", "status": "pending"}]}}, open(mp, "w"))
    html_match = render(c, ots_section("a" * 64, mp))
    html_nomatch = render(c, ots_section("b" * 64, mp))
    html = html_match
    t = {row["before"]: row for row in c["table"]}
    checks = [
        ("重算逐字节相同(确定性)", json.dumps(c, sort_keys=True) == json.dumps(c2, sort_keys=True)),
        ("2028 Manifold 重复题:同为玩钱时按成交量取 0.18 那条", t["2028-01-01"]["values"]["manifold-we-get-agi"] == 0.18),
        ("2028 中位数 = median(0.18, 0.66)", t["2028-01-01"]["median"] == 0.42 and t["2028-01-01"]["spread"] == 0.48),
        ("OpenAI 参照列取 Kalshi 真钱 0.5,不取 Manifold 3 人玩钱 0.9", t["2028-01-01"]["reference"]["openai-announce"] == 0.5),
        ("Manifold 的 OpenAI 条件题不进任何系列(场所白名单)", all(r["series"] is None for r in c["rows"] if "conditional" in r["question"])),
        ("OpenAI 单公司合约只作参照,不进中位数", "openai-announce" not in t["2027-01-01"]["values"]),
        ("只有 1 个系列的锚点不给中位数", t["2030-01-01"]["median"] is None),
        ("噪音题(数学/假设无 AGI)不进任何系列", all(r["series"] is None for r in c["rows"] if "mathematical" in r["question"])),
        ("Manifold 50% 交点落在 2028→2030 之间", "2029" in (c["implied_50pct_date"]["manifold-we-get-agi"] or "")),
        ("Kalshi 50% 交点用线性插值落在 2027 年内", (c["implied_50pct_date"]["kalshi-any-company-announce"] or "").startswith("2027")),
        ("本次进中位数的系列从数据生成", c["series_in_median_this_run"] == ["kalshi-any-company-announce", "manifold-we-get-agi"] and "Series that entered the median this run: <strong>kalshi-any-company-announce, manifold-we-get-agi" in html),
        ("缺场所照实说出来了", "METACULUS_TOKEN" in html),
        ("时间戳出现在正文", "2026-09-26 00:00:00" in html),
        ("外链全部 nofollow(引号无关)", _ext_links(html) == _nofollow(html) and _ext_links(html) >= 8),
        ("外链不带任何推荐/联盟参数", not re.search(r'href="https?://[^"]*[?&](ref|r|utm_[a-z]+|aff|via)=', html)),
        ("没有开户/入金/下注的行动号召", not re.search(r"(?i)\b(sign ?up|deposit|place a (bet|wager)|trade now|join now)\b", html)),
        ("无 url 的行不生成空链接", 'href=""' not in html),
        ("方法段落在页面上", METHOD[:60] in html),
        ("重算脚本 URL 在页面与 JSON 里", SCRIPT_URL in html and c["recompute"]["script"] == SCRIPT_URL),
        ("时间戳段:sha 匹配时点名证明", "agi-consensus.json.aaaaaaaaaaaa.ots" in html_match and "status <strong>pending" in html_match),
        ("时间戳段:sha 不匹配时说尚未锚定,不点名任何证明", "has not been stamped yet" in html_nomatch and ".ots" not in html_nomatch.split("Timestamp proofs")[1].split("Index:")[0]),
        ("时间戳段永不宣称证明真伪", "says nothing about whether the numbers are right" in html_match),
        ("Tracker 用活数字钩子标记(sync_live_hooks 能扫到)", "index_click" in html and re.search(r">\d+(?:\.\d+)?<span [^>]*>/100</span>", html) and "as of <strong>" in html),
    ]
    for name, ok in checks:
        print(("  ok   " if ok else "  FAIL ") + name)
    if not all(bool(ok) for _, ok in checks):
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
    body = render(c, ots_section(sha256_file(CONSENSUS_PATH)))
    entered = c["series_in_median_this_run"]
    medians = [t for t in c["table"] if t["median"] is not None]
    faq_numbers = ("; ".join(f"before {t['before'][:4]}: {pct(t['median'])} (spread {pct(t['spread'])})" for t in medians)
                   or "no anchor had two eligible series")
    faqs = [
        ("Is this the AGI Scorecard's own forecast?",
         "No. It is a median over independent public forecasting venues, computed by a published formula that anyone "
         "can rerun on the same snapshot. The scorecard's own position is the Thesis Tracker, which grades evidence, "
         "not expectations."),
        ("What do forecasters put on AGI right now?",
         f"Snapshot {board['fetched'][:16].replace('T', ' ')} UTC, median across {', '.join(entered) or 'no'} series: {faq_numbers}. "
         "Each series resolves on its own rules, so treat the spread as part of the answer."),
        ("Are these live odds?",
         "No. Each run records a snapshot with an exact UTC timestamp and links to the market so you can check the "
         "current price yourself. A quoted price that pretends to be live is the single most common way odds coverage "
         "misleads people."),
        ("Which series are averaged, and why not the others?",
         "Only series that ask about AGI in general enter the median: Manifold's 'Will we get AGI before D?', Kalshi's "
         "'any company announces AGI before D' and Metaculus's strong-AGI question when it was read. 'OpenAI announces AGI' "
         "is one company's announcement and 'weak AGI' is a lower bar, so both are shown as reference columns instead. "
         "The series in the median still differ in what resolves them; the page lists each one's basis."),
        ("Can I bet here?",
         "No. This site is not an operator, a broker, or an affiliate of one. There is no wager mechanism, no referral "
         "link, and no revenue from any venue listed."),
        ("How are the markets chosen?",
         "By a fixed keyword filter applied to whatever the venues' own search and series endpoints return that run, "
         "then a fixed venue whitelist and regular expression per series. The board can look thin in a quiet week, and it "
         "will say so rather than pad itself."),
    ]
    related = [("/agi-odds-vs-evidence", "Odds vs evidence — the running comparison"),
               ("/agi-2027-resolution", "AGI-2027 resolution criteria & countdown"),
               ("/when-will-agi-arrive", "When will AGI arrive? Every dated forecast"),
               ("/calibration", "How we score our own predictions")]
    day = board["fetched"][:10]
    html = g.build(
        slug=SLUG,
        title="AGI Consensus Board: What Forecasters Put on AGI by 2027–2040",
        desc=(f"Snapshot {day}: median across {len(entered)} forecasting series on 'AGI before 2027/2028/2030/2035/2040' — "
              f"{faq_numbers[:90]} — with spread, each series' resolution basis and a published recompute formula. No bets, no affiliate links."),
        og_title="AGI consensus board — independent venues, one table, every number dated",
        eyebrow=f"Consensus board · snapshot {day}",
        h1="What forecasters put on AGI, by year",
        capsule=(f'<span class="verdict">Snapshot {board["fetched"][:16].replace("T", " ")} UTC — median across '
                 f'{len(entered)} series: {faq_numbers}.</span> A median over independent venues, not an opinion: '
                 f'venues read {", ".join(k for k, v in c["venues"].items() if v.get("ok")) or "none"}; each series resolves on its own rules, '
                 'the spread is shown, and the formula is published.'),
        body_html=body, faqs=faqs, related=related,
        extra_schema=[{"@context": "https://schema.org", "@type": "Dataset", "name": "AGI consensus board",
                       "description": "Cross-venue median and spread of AGI-by-date forecasts from Polymarket, Kalshi, Manifold and Metaculus, with method and resolution basis per series.",
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
