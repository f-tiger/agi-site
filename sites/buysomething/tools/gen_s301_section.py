#!/usr/bin/env python3
"""Render the Section 301 ladder into /landed-cost as HTML, from s301-ladder.json only.

Why it is generated and not written by hand (2026-09-16): the ladder comes from the official USITC export
every morning. A hand-written table would be correct for a week and then quietly wrong — which is exactly
how this page ended up carrying the $80–$200 postal figure until 2026-09-13. So the block between the
markers is rendered from the JSON, and `--check` re-renders and compares: any drift fails the deploy.

Usage: python3 tools/gen_s301_section.py [--check] [--selftest]
"""
import datetime as dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
LADDER = os.path.join(SITE, "s301-ladder.json")
PAGE = os.path.join(SITE, "landed-cost.html")
START = "<!-- s301-ladder:start -->"
END = "<!-- s301-ladder:end -->"


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def render(ladder):
    """Pure: the JSON document → the HTML block (including the markers)."""
    rows = ladder.get("ladder", [])
    buckets = {}
    for r in rows:
        pct = r.get("additional_rate_pct")
        # 0% 有两种,分开列:一种是 USTR 批准的排除(描述里自己说 exclusion),另一种只是引用某条 note。
        # 合成一格会让读者以为「60 条都是排除」,那不是表里写的东西。
        if pct == 0:
            key = "exclusion — no addition" if "exclusion" in str(r.get("description", "")).lower() else "no addition (see note)"
        else:
            key = "%g%%" % pct if pct else "stated in words"
        sort = pct if pct else (-2 if key.startswith("exclusion") else -1)
        b = buckets.setdefault(key, {"n": 0, "headings": [], "notes": set(), "eff": set(), "sort": sort})
        b["n"] += 1
        if len(b["headings"]) < 3:
            b["headings"].append(r["heading"])
        for n in r.get("us_notes", []):
            b["notes"].add(n)
        if r.get("effective_from"):
            b["eff"].add(r["effective_from"])
    order = sorted(buckets.items(), key=lambda kv: kv[1]["sort"])
    out = [START]
    out.append('<h2 id="s301">Section 301: the rate ladder, from the schedule itself</h2>')
    out.append('<p>Every additional-duty heading in chapter 99 subchapter III that says it covers articles the product of China, '
               'read from the official USITC export on <strong>%s</strong>. %d headings in total. '
               'This is the ladder of possible rates — <strong>whether your HTS8 code is on a list is defined in U.S. note 20 or 31 '
               'and in the USTR annexes, and nothing here asserts it</strong>.</p>' % (esc(ladder.get("generated", "")), len(rows)))
    out.append('<table class="s301"><thead><tr><th>Addition</th><th>Headings</th><th>Examples</th><th>U.S. notes</th><th>Effective dates stated</th></tr></thead><tbody>')
    for key, b in order:
        notes = ", ".join(sorted(b["notes"])[:6]) + ("…" if len(b["notes"]) > 6 else "")
        eff = ", ".join(sorted(b["eff"])[:3]) + ("…" if len(b["eff"]) > 3 else "") if b["eff"] else "—"
        out.append("<tr><td><strong>%s</strong></td><td>%d</td><td>%s</td><td>%s</td><td>%s</td></tr>"
                   % (esc(key), b["n"], esc(", ".join(b["headings"])), esc(notes), esc(eff)))
    out.append("</tbody></table>")
    out.append('<p class="calc-note">Machine-readable: <a href="/s301-ladder.json">s301-ladder.json</a> · '
               'agent tool: <a href="/mcp">section_301_ladder</a> · lists: '
               '<a href="%s" rel="noopener">USTR tariff actions</a>. Regenerated from the official export; not a classification ruling.</p>'
               % esc(ladder.get("ustr_lists", "")))
    out.append(END)
    return "\n".join(out)


def inject(page_html, block):
    i, j = page_html.find(START), page_html.find(END)
    if i == -1 or j == -1:
        raise SystemExit("::error::landed-cost.html is missing the s301-ladder markers")
    return page_html[:i] + block + page_html[j + len(END):]


def selftest():
    doc = {
        "generated": "2026-09-16",
        "ustr_lists": "https://ustr.gov/x",
        "ladder": [
            {"heading": "9903.88.01", "additional_rate_pct": 25.0, "us_notes": ["20(a)"], "effective_from": None},
            {"heading": "9903.88.05", "additional_rate_pct": 0.0, "us_notes": ["20(h)"], "effective_from": None, "description": "covered by an exclusion granted by the USTR"},
            {"heading": "9903.88.21", "additional_rate_pct": 0.0, "us_notes": ["20(z)"], "effective_from": None, "description": "Articles the product of China, as provided for in U.S. note 20(z)"},
            {"heading": "9903.91.03", "additional_rate_pct": 100.0, "us_notes": ["31(d)"], "effective_from": "September 27, 2024"},
        ],
    }
    html = render(doc)
    assert html.startswith(START) and html.endswith(END)
    assert "100%" in html and "exclusion — no addition" in html and "no addition (see note)" in html and "September 27, 2024" in html
    assert "nothing here asserts it" in html
    page = "<body>A" + START + "old" + END + "B</body>"
    assert inject(page, html).startswith("<body>A" + START)
    assert inject(page, html).endswith(END + "B</body>")
    # a ladder that gained a rate must change the render (that is what --check compares)
    doc2 = json.loads(json.dumps(doc))
    doc2["ladder"].append({"heading": "9903.91.20", "additional_rate_pct": 60.0, "us_notes": ["31(z)"], "effective_from": None})
    assert render(doc2) != html
    print("gen_s301_section selftest: OK")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    ladder = json.load(open(LADDER, encoding="utf-8"))
    page = open(PAGE, encoding="utf-8").read()
    block = render(ladder)
    if "--check" in argv:
        i, j = page.find(START), page.find(END)
        if i == -1 or j == -1:
            print("::error::landed-cost.html is missing the s301-ladder markers")
            return 1
        if page[i:j + len(END)] != block:
            print("::error::the Section 301 section on /landed-cost no longer matches s301-ladder.json — run gen_s301_section.py")
            return 1
        print("s301 section: in step with the ladder (%d headings, as of %s)" % (len(ladder["ladder"]), ladder["generated"]))
        return 0
    open(PAGE, "w", encoding="utf-8").write(inject(page, block))
    print("s301 section rendered into landed-cost.html (%d headings)" % len(ladder["ladder"]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
