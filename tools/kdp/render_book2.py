# -*- coding: utf-8 -*-
"""Render book2-sun-playbook.md into a 6in×9in print interior (book2.html);
Chromium prints it to PDF. Minimal markdown: #/##/###, **bold**, *em*, -, ---."""
import html, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
MD = open(os.path.join(HERE, "book2-sun-playbook.md"), encoding="utf-8").read()

CSS = """
@page { size: 6in 9in; margin: 0.7in 0.6in 0.75in 0.6in; }
body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0;
       font-size: 10.8pt; line-height: 1.62; }
h1 { font-size: 21pt; line-height: 1.2; margin: 0 0 10pt; page-break-before: always;
     padding-top: 0.5in; }
h1.first { page-break-before: avoid; padding-top: 1.6in; text-align: center; }
h3.subtitle { text-align: center; font-weight: normal; font-style: italic; font-size: 12pt; }
h2 { font-size: 14pt; margin: 16pt 0 6pt; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 12pt 0 4pt; page-break-after: avoid; }
p { margin: 0 0 8pt; text-align: justify; }
ul { margin: 0 0 8pt 16pt; } li { margin-bottom: 4pt; text-align: justify; }
hr { border: 0; border-top: 0.6pt solid #999; margin: 14pt 25%; }
strong { color: #000; }
.disclaimer { font-size: 9pt; font-style: italic; }
"""


def inline(s):
    s = html.escape(s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", s)
    return s


lines = MD.split("\n")
out, i, first_h1 = [], 0, True
in_ul = False
for ln in lines:
    if ln.startswith("- "):
        if not in_ul:
            out.append("<ul>")
            in_ul = True
        out.append("<li>" + inline(ln[2:]) + "</li>")
        continue
    if in_ul:
        out.append("</ul>")
        in_ul = False
    if ln.startswith("# "):
        cls = ' class="first"' if first_h1 else ""
        first_h1 = False
        out.append(f"<h1{cls}>" + inline(ln[2:]) + "</h1>")
    elif ln.startswith("### "):
        cls = ' class="subtitle"' if len(out) < 4 else ""
        out.append(f"<h3{cls}>" + inline(ln[4:]) + "</h3>")
    elif ln.startswith("## "):
        out.append("<h2>" + inline(ln[3:]) + "</h2>")
    elif ln.strip() == "---":
        out.append("<hr>")
    elif ln.strip():
        cls = ' class="disclaimer"' if ln.startswith("**An independent analysis") or ln.startswith("*Independent work") else ""
        out.append(f"<p{cls}>" + inline(ln) + "</p>")
if in_ul:
    out.append("</ul>")

doc = ("<!doctype html><html><head><meta charset='utf-8'>"
       f"<style>{CSS}</style></head><body>" + "\n".join(out) + "</body></html>")
open(os.path.join(HERE, "book2.html"), "w", encoding="utf-8").write(doc)
words = len(re.findall(r"\w+", MD))
print(f"book2.html written · {words} words")
