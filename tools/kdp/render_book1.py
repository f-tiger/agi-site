# -*- coding: utf-8 -*-
"""Render book1.json into a print-ready 6in×9in interior HTML (book1.html);
Chromium prints it to PDF. One puzzle per page; solutions six per page.
KDP margins: 0.375in gutter side (>=24-150 pages: 0.375), 0.25in outside min —
we use a safe uniform 0.5in with 0.625in gutter allowance via @page margins.
"""
import html, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
PUZZLES = json.load(open(os.path.join(HERE, "book1.json")))

CSS = """
@page { size: 6in 9in; margin: 0.55in 0.5in 0.6in 0.5in; }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
.page { page-break-after: always; }
h1 { font-size: 26pt; margin: 1.4in 0 0.2in; text-align: center; }
h2 { font-size: 13pt; text-align: center; font-weight: normal; margin: 0 0 0.3in; }
.center { text-align: center; }
.pz-head { display: flex; justify-content: space-between; font-size: 10.5pt; margin-bottom: 8pt; }
table.ng { border-collapse: collapse; margin: 0 auto; }
table.ng td { border: 0.6pt solid #999; padding: 0; }
table.ng td.cell { border: 0.6pt solid #444; }
table.ng td.b5 { border-left: 1.4pt solid #000; }
table.ng tr.b5 td.cell, table.ng tr.b5 td.rc { border-top: 1.4pt solid #000; }
td.cc { vertical-align: bottom; text-align: center; font-size: 8pt; line-height: 1.25;
        border: 0 !important; padding: 0 1pt 2pt !important; font-family: Arial, sans-serif; }
td.rc { text-align: right; font-size: 8pt; word-spacing: 3pt; border: 0 !important;
        padding: 0 4pt 0 0 !important; font-family: Arial, sans-serif; white-space: nowrap; }
td.corner { border: 0 !important; }
.sol-grid { display: inline-block; margin: 6pt 8pt; vertical-align: top; }
.sol-grid .lbl { font-size: 8pt; text-align: center; margin-bottom: 2pt; }
table.sol { border-collapse: collapse; }
table.sol td { width: 5.4pt; height: 5.4pt; border: 0.3pt solid #bbb; padding: 0; }
table.sol td.f { background: #111; }
.rules-page { font-size: 11pt; line-height: 1.55; }
.rules-page h3 { font-size: 13pt; }
.footer-num { position: running(footer); }
"""


def cell_px(n):
    # printable width ~4.9in minus clue lane; keep grid + clues under 4.9in x 6.6in
    return {10: 26, 12: 22, 15: 18}[n]


def puzzle_table(p, idx):
    n = p["n"]
    px = cell_px(n)
    row_cl = [c.replace(".", " ") for c in p["r"].split(",")]
    col_cl = [c.split(".") for c in p["c"].split(",")]
    out = [f'<div class="pz-head"><span>Puzzle {idx}</span><span>{n}×{n}</span></div>']
    out.append('<table class="ng">')
    # column clue row
    out.append('<tr><td class="corner"></td>')
    for c in range(n):
        b5 = ' b5' if c % 5 == 0 and c > 0 else ''
        out.append(f'<td class="cc{b5}">' + "<br>".join(col_cl[c]) + "</td>")
    out.append("</tr>")
    for r in range(n):
        b5 = ' class="b5"' if r % 5 == 0 and r > 0 else ""
        out.append(f"<tr{b5}>")
        out.append(f'<td class="rc">{html.escape(row_cl[r])}</td>')
        for c in range(n):
            cls = "cell" + (" b5" if c % 5 == 0 and c > 0 else "")
            out.append(f'<td class="{cls}" style="width:{px}pt;height:{px}pt"></td>')
        out.append("</tr>")
    out.append("</table>")
    return "\n".join(out)


def solution_grid(p, idx):
    n = p["n"]
    rows = []
    for r in range(n):
        tds = "".join(f'<td class="{"f" if p["sol"][r*n+c]=="1" else ""}"></td>' for c in range(n))
        rows.append(f"<tr>{tds}</tr>")
    return (f'<div class="sol-grid"><div class="lbl">{idx}</div>'
            f'<table class="sol">{"".join(rows)}</table></div>')


def main():
    pages = []
    pages.append("""<div class="page">
<h1>Nonograms<br>Without Guessing</h1>
<h2>120 picture-logic puzzles, 10×10 to 15×15<br>
every puzzle verified solvable by pure line logic</h2>
<p class="center" style="margin-top:2.2in;font-size:10pt">play.agiscorecard.com/nonogram</p>
</div>""")
    pages.append("""<div class="page rules-page">
<h3>How to solve</h3>
<p>Each number tells you the lengths of the runs of filled squares in that row or
column, in order, with at least one empty square between runs. Fill squares and
mark definite empties until the picture is complete.</p>
<h3>The no-guessing promise</h3>
<p>Every puzzle in this book was generated with a solver in the loop and accepted
only if repeated row-and-column reasoning alone completes the grid. If you are
stuck, there is always a line where the clue and the squares you already know
force at least one more square. You will never need to guess — that is a
mathematical property of these boards, checked by machine before printing.</p>
<h3>Difficulty</h3>
<p>Puzzles 1–40 are 10×10, 41–80 are 12×12, 81–120 are 15×15. Solutions start
after puzzle 120.</p>
<p style="margin-top:0.5in;font-size:9pt">© 2026 AGI Scorecard · Play a new puzzle
free every day at play.agiscorecard.com/nonogram</p>
</div>""")
    for i, p in enumerate(PUZZLES, 1):
        pages.append(f'<div class="page">{puzzle_table(p, i)}</div>')
    # solutions: 6 per page
    sol_chunks = [PUZZLES[i:i + 6] for i in range(0, len(PUZZLES), 6)]
    base = 0
    for chunk in sol_chunks:
        grids = "".join(solution_grid(p, base + j + 1) for j, p in enumerate(chunk))
        pages.append(f'<div class="page"><div class="pz-head"><span>Solutions</span></div>'
                     f'<div class="center">{grids}</div></div>')
        base += len(chunk)
    doc = ("<!doctype html><html><head><meta charset='utf-8'>"
           f"<style>{CSS}</style></head><body>" + "\n".join(pages) + "</body></html>")
    out = os.path.join(HERE, "book1.html")
    open(out, "w").write(doc)
    print(f"book1.html: {len(pages)} pages")


if __name__ == "__main__":
    main()
