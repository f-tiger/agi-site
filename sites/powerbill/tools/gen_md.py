#!/usr/bin/env python3
"""GEO 层:把判定型页面转成 Markdown 孪生文件 + 汇总成 llms-full.txt。
只从 HTML 抽取(h1/答案胶囊/h2/表格/FAQ/依据),永远不会和页面漂移——页面是唯一真源。
部署闸门里运行;输出进 site/,随资产一起上线。用法:python3 tools/gen_md.py
"""
import html, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
PAGES = ['is-ai-raising-your-electricity-bill', 'who-decides-who-pays', 'resources']

def text(s):
    s = re.sub(r"<script[\s\S]*?</script>", "", s)
    s = re.sub(r"<br\s*/?>", " ", s)
    s = s.replace("</b>", "</b> ").replace("<small>", " ")
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(re.sub(r"\s+", " ", s)).strip()

def table_md(t):
    rows = re.findall(r"<tr>([\s\S]*?)</tr>", t)
    out = []
    for i, r in enumerate(rows):
        cells = [text(c) for c in re.findall(r"<t[hd][^>]*>([\s\S]*?)</t[hd]>", r)]
        out.append("| " + " | ".join(cells) + " |")
        if i == 0:
            out.append("|" + "---|" * len(cells))
    return "\n".join(out)

def convert(slug):
    h = open(os.path.join(SITE, slug + ".html"), encoding="utf-8").read()
    title = text(re.search(r"<h1>([\s\S]*?)</h1>", h).group(1))
    desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', h).group(1))
    updated = re.search(r"最后更新 (\d{4}-\d{2}-\d{2})", h) or re.search(r"整理日期 (\d{4}-\d{2}-\d{2})", h)
    main = re.search(r"<main[^>]*>([\s\S]*?)</main>", h).group(1)
    lines = ["# " + title, "", "> " + desc, "", "Source: https://powerbill.agiscorecard.com/" + slug + ("  · updated " + updated.group(1) if updated else ""), ""]
    cap = re.search(r'<div class="notice">([\s\S]*?)</div>', main)
    if cap:
        lines += ["**" + text(cap.group(1)) + "**", ""]
    # 按顺序走 h2 / 表格 / 步骤 / FAQ / 依据
    for m in re.finditer(r"<h2>([\s\S]*?)</h2>|<table>([\s\S]*?)</table>|<ol class=\"steps\">([\s\S]*?)</ol>|<details><summary>([\s\S]*?)</summary><p>([\s\S]*?)</p></details>|<ul class=\"small\">([\s\S]*?)</ul>|<p>([\s\S]*?)</p>", main):
        h2, tbl, steps, q, a, ul, p = m.groups()
        if h2: lines += ["", "## " + text(h2), ""]
        elif tbl: lines += [table_md(tbl), ""]
        elif steps: lines += ["%d. %s" % (i + 1, text(li)) for i, li in enumerate(re.findall(r"<li>([\s\S]*?)</li>", steps))] + [""]
        elif q: lines += ["**问:" + text(q) + "**", "", text(a), ""]
        elif ul: lines += ["- " + text(li) for li in re.findall(r"<li>([\s\S]*?)</li>", ul)] + [""]
        elif p:
            t = text(p)
            if len(t) > 40 and not t.startswith("最后更新"): lines += [t, ""]
    md = "\n".join(lines).rstrip() + "\n"
    open(os.path.join(SITE, slug + ".md"), "w", encoding="utf-8").write(md)
    return md

def main():
    parts = ["# The Power Bill — full text (judgements and official entry points, machine readable)", "", "> Is AI raising your electricity bill? Dated evidence on both sides, US and EU. Generated from the pages themselves. Pages are the single source of truth. Site notes:  https://powerbill.agiscorecard.com/llms.txt", ""]
    for slug in PAGES:
        parts.append(convert(slug))
        parts.append("\n---\n")
    open(os.path.join(SITE, "llms-full.txt"), "w", encoding="utf-8").write("\n".join(parts))
    print("gen_md: %d pages -> .md + llms-full.txt" % len(PAGES))

if __name__ == "__main__":
    main()
