#!/usr/bin/env python3
"""/agi-prediction-markets — AGI 行情板(市场问什么 vs 证据说什么)。

裁定见 docs/prediction-market-platform-2026-09.md:不做市场,做市场旁边那层。
本页只引用第三方公开行情并注明取数时间,**不提供投注入口、不放联盟/推荐链接、
不给交易建议、不做 zh 镜像**(与 /ai-trading-ledger 同级红线)。

数据来自 market-board.json(runner 跑 tools/fetch_market_board.mjs 写入,沙箱够不到
两个行情域)。文件缺失或过期就**退出并报错**——这一页宁可不出,也绝不显示一个不知道
是什么时候的价。

自测:python3 tools/gen_market_board.py --selftest  用合成夹具跑完整出页路径,不碰真数据。
"""
import datetime as dt
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_lib as g

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOARD_PATH = os.path.join(ROOT, "market-board.json")
MAX_AGE_DAYS = 10          # 周任务每周一跑;超过 10 天说明取数挂了
OUT = os.path.join(ROOT, "agi-prediction-markets.html")

# 本站对应的预登记判定面。key 是行情问题里的关键词,value 是 (本站页面, 本站怎么判)。
# **只在市场问题确实命中关键词时才配对**;配不上就留空,绝不硬凑一条「相关判定」。
EVIDENCE = [
    (("2027",), "/agi-2027-resolution",
     "预登记的 AGI-2027 解析标准 + 倒计时(判定靠标准,不靠宣布)"),
    (("2030", "2029", "2028"), "/will-agi-arrive-2027",
     "本站的 AGI 时间线判定与它依据的证据权重"),
    (("superintelligence", "asi"), "/intelligence-explosion-2027",
     "智能爆炸论证的逐条评分"),
]


def evidence_for(question: str):
    q = question.lower()
    for keys, href, note in EVIDENCE:
        if any(k in q for k in keys):
            return href, note
    return None, None


SLUG = "agi-prediction-markets"
LLMS_LINE = ("- [What prediction markets say about AGI](https://agiscorecard.com/" + SLUG + "): "
             "Dated Polymarket/Kalshi AGI odds snapshots next to this site's pre-registered "
             "resolution criteria. No bets, no affiliate links, prices always carry their as-of time.")


def register(day: str) -> None:
    """把本页登记进 sitemap.xml 与 llms.txt(幂等)。

    页面只有在 runner 取到行情之后才存在,所以不能先手写进 sitemap —— validate.py 会因为
    「sitemap 里有 URL 但没有文件」而拦下部署。让生成器在写出页面的同一步登记,两者永远同生。
    """
    sm = os.path.join(ROOT, "sitemap.xml")
    entry = (f'  <url><loc>https://agiscorecard.com/{SLUG}</loc><lastmod>{day}</lastmod>'
             f'<changefreq>weekly</changefreq><priority>0.7</priority></url>')
    text = open(sm, encoding="utf-8").read()
    if f"/{SLUG}</loc>" in text:
        import re as _re
        text = _re.sub(rf'  <url><loc>https://agiscorecard\.com/{SLUG}</loc>[^\n]*', entry, text)
    else:
        anchor = '  <url><loc>https://agiscorecard.com/agi-odds-vs-evidence</loc>'
        i = text.index(anchor)
        text = text[:i] + entry + "\n" + text[i:]
    open(sm, "w", encoding="utf-8").write(text)

    lp = os.path.join(ROOT, "llms.txt")
    lt = open(lp, encoding="utf-8").read()
    if f"/{SLUG})" not in lt:
        anchor = "- [Odds vs evidence (running series)]"
        i = lt.index(anchor)
        lt = lt[:i] + LLMS_LINE + "\n" + lt[i:]
        open(lp, "w", encoding="utf-8").write(lt)



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


def render(b: dict) -> str:
    asof = b["fetched"][:19].replace("T", " ")
    score = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))["thesisTracker"]["score"]

    live = [k for k, v in b["venues"].items() if v.get("ok")]
    dead = {k: v.get("reason") for k, v in b["venues"].items() if not v.get("ok")}

    rows = []
    for r in b["rows"]:
        href, note = evidence_for(r["question"])
        q = (f'<a href="{r["url"]}" rel="nofollow noopener">{r["question"]}</a>'
             if r.get("url") else r["question"])
        vol = f'${r["volume"]:,.0f}' if r.get("volume") else "—"
        ev = f'<a href="{href}">{note}</a>' if href else '<span class="muted">本站无对应的预登记判定面</span>'
        rows.append(
            f'<tr><td>{q}<div style="font-size:12px;color:var(--muted)">{r["venue"]}'
            f'{" · closes " + r["end"] if r.get("end") else ""}</div></td>'
            f'<td class="nowrap"><strong>{r["yes"] * 100:.0f}%</strong> Yes</td>'
            f'<td class="nowrap">{vol}</td><td>{ev}</td></tr>')

    dead_html = ""
    if dead:
        items = "".join(f"<li><strong>{k}</strong>:{v}</li>" for k, v in dead.items())
        dead_html = (f'<p><strong>本期缺的场所(照实说,不用旧数补):</strong></p><ul>{items}</ul>')

    return f"""<h2>Board — snapshot {asof} UTC</h2>
<p>Every price below is a third-party market quote carrying the exact UTC moment it was read.
Nothing here is live, and nothing here is a recommendation. The right-hand column is what this
site does instead of quoting a crowd: a pre-registered resolution standard you can check.</p>
<table><thead><tr><th>Market</th><th>Price</th><th>Volume</th><th>Evidence layer (this site)</th></tr></thead>
<tbody>{"".join(rows)}</tbody></table>
<p style="font-size:13px;color:var(--muted);">Venues read this run: {", ".join(live) or "none"}.
Keyword filter: <code>{b["keyword"]}</code>. Markets are selected by that filter on live venue data —
this page never hand-picks which contract looks good.</p>
{dead_html}
<h2>Why a scorecard publishes odds it does not trade</h2>
<p>A prediction market prices <em>what a crowd expects to be announced</em>. This site grades
<em>what has been demonstrated</em>, against criteria written down before the fact. The Thesis
Tracker currently reads {score}/100. When those two numbers diverge, the divergence is the story:
it tells you whether labelling is running ahead of substance or behind it.</p>
<p>That is also why there is no bet button here, and never will be. We are not an operator, not a
broker and not an affiliate of one. We quote public prices the way a newspaper quotes a closing
index, and we point at our own resolution criteria so you can disagree with us precisely.</p>
<p style="font-size:13px;color:var(--muted);">Third-party market data quoted with its as-of timestamp.
This site takes no positions, accepts no wagers, earns nothing from any venue listed, and none of
this is trading or betting advice.</p>"""


def main(argv):
    if "--selftest" in argv:
        fixture = {
            "fetched": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "venues": {"polymarket": {"ok": True, "via": "events 列表", "found": 2},
                       "kalshi": {"ok": False, "reason": "没有一条调用形态返回可解析的 Kalshi 行情", "found": 0}},
            "keyword": "agi",
            "rows": [
                {"venue": "Polymarket", "question": "OpenAI announces it has achieved AGI before 2027?",
                 "yes": 0.18, "volume": 103281.7, "end": "2026-12-31",
                 "url": "https://polymarket.com/event/x"},
                {"venue": "Polymarket", "question": "Superintelligence declared before 2030?",
                 "yes": 0.07, "volume": None, "end": None, "url": None},
            ],
        }
        html = render(fixture)
        checks = [
            ("时间戳出现在正文", fixture["fetched"][:19].replace("T", " ") in html),
            ("两行都渲染了", html.count("<tr><td>") == 2),
            ("缺场所照实说出来了", "Kalshi" in html and "没有一条调用形态" in html),
            ("无 url 的行不生成空链接", 'href=""' not in html),
            ("外链全部 nofollow", html.count("https://polymarket.com") == html.count('rel="nofollow noopener"')),
            ("外链不带任何推荐/联盟参数", not re.search(r'href="https?://[^"]*[?&](ref|r|utm_[a-z]+|aff|via)=', html)),
            ("没有开户/入金/下注的行动号召", not re.search(r"(?i)\b(sign ?up|deposit|place a (bet|wager)|trade now|join now)\b", html)),
            ("挂上了本站判定面", "/agi-2027-resolution" in html),
            ("成交量缺失显示占位而不是 0", "—" in html),
        ]
        for name, ok in checks:
            print(("  ok   " if ok else "  FAIL ") + name)
        if not all(ok for _, ok in checks):
            return 1
        # 过期与空板必须真的拦下来
        for bad, why in ((dict(fixture, fetched="2020-01-01T00:00:00Z"), "过期快照"),
                         (dict(fixture, rows=[]), "空板")):
            try:
                load_board.__wrapped__  # noqa
            except AttributeError:
                pass
            p = os.path.join(ROOT, ".selftest-board.json")
            json.dump(bad, open(p, "w"))
            try:
                load_board(p)
                print(f"  FAIL {why} 没有被拦下")
                os.remove(p)
                return 1
            except SystemExit:
                print(f"  ok   {why} 被拦下")
            finally:
                if os.path.exists(p):
                    os.remove(p)
        print("\n全部通过(出页路径 + 两条拒绝路径)")
        return 0

    board, age = load_board()
    body = render(board)
    faqs = [
        ("Are these live odds?",
         "No. Each run records a snapshot with an exact UTC timestamp and links to the market so you "
         "can check the current price yourself. A quoted price that pretends to be live is the single "
         "most common way odds coverage misleads people."),
        ("Can I bet here?",
         "No. This site is not an operator, a broker, or an affiliate of one. There is no wager "
         "mechanism, no referral link, and no revenue from any venue listed. We publish the prices "
         "the way a newspaper prints a closing index."),
        ("How are the markets chosen?",
         "By keyword filter applied to whatever the venues return that run, not by hand. That means "
         "the board can look thin in a quiet week, and it will say so rather than pad itself."),
        ("Why does the scorecard disagree with the market?",
         "Because they answer different questions. Markets price an announcement; this site grades a "
         "demonstrated capability against criteria published in advance. Both can be right at once."),
    ]
    related = [("/agi-odds-vs-evidence", "Odds vs evidence — the running comparison"),
               ("/agi-2027-resolution", "AGI-2027 resolution criteria & countdown"),
               ("/progress-index", "AGI-2027 Thesis Tracker"),
               ("/calibration", "How we score our own predictions")]
    day = board["fetched"][:10]
    html = g.build(
        slug="agi-prediction-markets",
        title="AGI Prediction Markets: Live Odds vs Evidence",
        desc=("What Polymarket and Kalshi price AGI at, quoted with exact snapshot times, next to the "
              "pre-registered resolution criteria this scorecard grades against. No bets, no affiliate links."),
        og_title="What prediction markets say about AGI — and what the evidence says",
        eyebrow=f"Market board · snapshot {day}",
        h1="What prediction markets say about AGI",
        capsule=('<span class="verdict">Markets price announcements; this scorecard grades '
                 'demonstrated capability.</span> Both numbers, side by side, each carrying the date it '
                 'was read.'),
        body_html=body, faqs=faqs, related=related,
    )
    html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                        f'"datePublished": "2026-09-07", "dateModified": "{day}"')
    visible = dt.date.fromisoformat(day).strftime("%B %-d, %Y")
    html = html.replace("Last updated: June 30, 2026", f"Last updated: {visible}")
    open(OUT, "w", encoding="utf-8").write(html)
    register(day)
    print(f"agi-prediction-markets.html written · {len(board['rows'])} 条 · 快照 {age} 天前")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
