#!/usr/bin/env python3
"""Render /import-rule-changes from import-rule-changes.json. The whole page is generated; `--check` re-renders
and compares, so the page can never drift from the data behind it.

Why a page at all when the MCP tool exists (2026-09-16): most AI systems never call a tool — they read pages.
The fleet's citation share lives on judgement pages with dates, and "what changed in US import rules, with the
document number and the date" is exactly that shape. Same facts as the tool, same file behind both.

Zero editorialising: titles and abstracts are the Federal Register's own text; this script only groups by where
the phrase matched and sorts by date. It never says a document is important.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
SRC = os.path.join(SITE, "import-rule-changes.json")
OUT = os.path.join(SITE, "import-rule-changes.html")

FAQ = [
    ("Where can I see every US import rule change with its date?",
     "The Federal Register publishes all of them, and this page lists the ones matching import-duty phrases in the last "
     "120 days, newest first, each with its publication date, document number and a link to the official document. "
     "Case-specific antidumping, ITC and Foreign-Trade Zone paperwork is excluded on purpose, because it runs to dozens "
     "a week and binds one product in one case rather than changing the rules that apply across shipments."),
    ("How do I know the import rule I am about to quote is still current?",
     "Check the date on it. Three widely repeated figures died in 2026: the $800 de minimis exemption was suspended "
     "indefinitely for every mode on 24 June 2026, the postal flat duty of $80 to $200 expired on 28 February 2026, and "
     "the IEEPA tariffs were struck down on 20 February 2026. Anything quoting them as current is older than those dates."),
]


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


def rows_html(rows):
    if not rows:
        return "<p class=\"calc-note\">Nothing in this tier in the current window.</p>"
    out = ['<table class="s301"><thead><tr><th>Date</th><th>Type</th><th>Document</th><th>Matched</th></tr></thead><tbody>']
    for r in rows:
        ag = ", ".join(r.get("agencies", [])[:2])
        out.append(
            "<tr><td>%s</td><td>%s</td><td><a href=\"%s\" rel=\"noopener\">%s</a><br><small>%s%s</small></td><td><small>%s</small></td></tr>"
            % (esc(r["date"]), esc(r.get("type", "")), esc(r["url"]), esc(r["title"]),
               esc(ag), esc(" · " + r["abstract"]) if r.get("abstract") else "", esc(", ".join(r.get("matched", []))))
        )
    out.append("</tbody></table>")
    return "\n".join(out)


def render(d):
    named = [r for r in d.get("changes", []) if r.get("matched_in") == "title_or_abstract"]
    deeper = [r for r in d.get("changes", []) if r.get("matched_in") != "title_or_abstract"]
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    art_ld = {"@context": "https://schema.org", "@type": "Article",
              "headline": "What changed in US import rules",
              "datePublished": "2026-09-16", "dateModified": d.get("generated", ""), "inLanguage": "en",
              "author": {"@type": "Organization", "name": "SourceRadar (AGI Scorecard)", "url": "https://source.agiscorecard.com/"},
              "publisher": {"@type": "Organization", "name": "SourceRadar", "url": "https://source.agiscorecard.com/"},
              "description": "Federal Register documents changing the general US import rules in the last 120 days, newest first, each with its date, document number and official link."}
    faq_html = "\n".join("    <h3>%s</h3>\n    <p>%s</p>" % (esc(q), esc(a)) for q, a in FAQ)
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#128225;</text></svg>">
  <link rel="stylesheet" href="styles.css">
  <title>What changed in US import rules (updated %s)</title>
  <meta name="description" content="Federal Register documents changing the general US import rules in the last %d days, newest first: presidential tariff actions, CBP and DHS rules, USTR notices. Each with its date, document number and official link.">
  <link rel="canonical" href="https://source.agiscorecard.com/import-rule-changes">
  <meta property="og:title" content="What changed in US import rules">
  <meta property="og:description" content="The dated record, newest first, from the official Federal Register API. Case-specific antidumping paperwork excluded by design.">
  <meta property="og:url" content="https://source.agiscorecard.com/import-rule-changes">
  <meta property="og:type" content="article">
  <script type="application/ld+json">%s</script>
  <script type="application/ld+json">%s</script>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">
        <span class="brand-mark">&#128225;</span>
        <span class="brand-text">Source<em>Radar</em></span>
      </a>
      <nav class="main-nav">
        <a href="/#picks">Radar Picks</a>
        <a href="/landed-cost">Landed Cost</a>
        <a href="/import-rule-changes">Rule Changes</a>
        <a href="/is-alibaba-legit">Alibaba Risk</a>
        <a href="/mcp">For Agents</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero container">
      <p class="hero-kicker">Updated %s &middot; official Federal Register API &middot; %d-day window</p>
      <h1>What changed in <span class="accent">US import rules</span></h1>
      <p class="hero-sub">
        The expensive mistakes in cross-border selling are not arithmetic, they are stale rules. Every change below has a
        publication date and a document number, newest first. For the stack as it stands today, see
        <a href="/landed-cost">landed cost</a>.
      </p>
    </section>

    <section class="container" style="padding:0 0 1.5rem">
      <h2>Named in the headline or abstract</h2>
      <p class="calc-note">The import-duty phrase appears in the title or abstract. These are usually the documents that change something.</p>
%s
    </section>

    <section class="container" style="padding:0 0 1.5rem">
      <h2>Matched deeper in the text</h2>
      <p class="calc-note">The phrase appears somewhere in the full text. Some of these are about something else entirely and merely cite the tariff schedule; they are listed rather than silently dropped.</p>
%s
    </section>

    <section class="container" style="padding:0 0 1.5rem">
      <h2>Method and scope</h2>
      <p class="rule"><strong>Source.</strong> Federal Register API, queried daily for the phrases: %s. Window: %d days from %s.</p>
      <p class="rule"><strong>Kept.</strong> Documents from %s.</p>
      <p class="rule"><strong>Out of scope.</strong> %s</p>
      <p class="rule"><strong>No interpretation.</strong> Titles and abstracts are the Federal Register's own words, trimmed but never rewritten. A match means the phrase appears in the document, not that the document affects your shipment.</p>
      <p class="calc-note">Machine-readable: <a href="/import-rule-changes.json">import-rule-changes.json</a> &middot; agent tool: <a href="/mcp">import_rule_changes</a> (supports <code>since=</code>).</p>
    </section>

    <section class="container" style="padding:0 0 2rem">
      <h2>FAQ</h2>
%s
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>SourceRadar &middot; part of the <a href="https://agiscorecard.com/">AGI Scorecard</a> network &middot; regenerated from the official record on %s.</p>
      <p class="muted">Not financial, legal or customs advice. Read the document before relying on it.</p>
    </div>
  </footer>
</body>
</html>
""" % (esc(d.get("generated", "")), d.get("window_days", 0),
       json.dumps(art_ld, ensure_ascii=False), json.dumps(faq_ld, ensure_ascii=False),
       esc(d.get("generated", "")), d.get("window_days", 0),
       rows_html(named), rows_html(deeper),
       esc(", ".join(d.get("queries", []))), d.get("window_days", 0), esc(d.get("since", "")),
       esc(", ".join(d.get("agencies_kept", []))), esc(d.get("out_of_scope", "")),
       faq_html, esc(d.get("generated", "")))


def selftest():
    d = {"generated": "2026-09-16", "window_days": 120, "since": "2026-05-19", "queries": ["section 301"],
         "agencies_kept": ["U.S. Customs and Border Protection"], "out_of_scope": "case paperwork",
         "changes": [
             {"date": "2026-06-24", "type": "Rule", "title": "Indefinite Suspension", "abstract": "a", "agencies": ["CBP"],
              "url": "https://federalregister.gov/d/1", "matched": ["de minimis exemption"], "matched_in": "title_or_abstract"},
             {"date": "2026-08-11", "type": "Presidential Document", "title": "Ending Something", "abstract": "", "agencies": ["EOP"],
              "url": "https://federalregister.gov/d/2", "matched": ["section 301"], "matched_in": "full_text_only"},
         ]}
    h = render(d)
    assert h.count("<h1") == 1
    assert "Indefinite Suspension" in h and "Ending Something" in h
    for q, a in FAQ:
        assert q in h and a in h, "visible FAQ must carry the exact JSON-LD wording"
    ld = [json.loads(x) for x in __import__("re").findall(r'<script type="application/ld\+json">(.*?)</script>', h, __import__("re").S)]
    qa = {x["name"]: x["acceptedAnswer"]["text"] for x in ld[1]["mainEntity"]}
    assert qa == dict(FAQ), "JSON-LD and visible FAQ must be identical"
    assert render(dict(d, changes=[])) != h, "empty data must render differently, not silently reuse"
    assert "&lt;script&gt;" in render(dict(d, changes=[dict(d["changes"][0], title="<script>x")]))
    print("gen_rule_changes_page selftest: OK")


def main(argv):
    if "--selftest" in argv:
        selftest()
        return 0
    d = json.load(open(SRC, encoding="utf-8"))
    html = render(d)
    if "--check" in argv:
        cur = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        if cur != html:
            print("::error::/import-rule-changes is out of step with import-rule-changes.json — run gen_rule_changes_page.py")
            return 1
        print("rule-changes page: in step (%d documents, as of %s)" % (len(d.get("changes", [])), d.get("generated")))
        return 0
    open(OUT, "w", encoding="utf-8").write(html)
    print("rule-changes page rendered (%d documents)" % len(d.get("changes", [])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
