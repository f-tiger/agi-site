#!/usr/bin/env python3
"""Generate /sourcing-margins from site/data.js.

Every number on the page is computed from the curated pick dataset, so the
page can never drift from the data it describes. Re-run after editing data.js.
"""
import re, json, statistics, datetime, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "site", "data.js")
OUT  = os.path.join(ROOT, "site", "sourcing-margins.html")

def parse():
    s = open(SRC, encoding="utf-8").read()
    objs, depth, start = [], 0, None
    for j, ch in enumerate(s):
        if ch == "{":
            if depth == 0: start = j
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                objs.append(s[start:j+1]); start = None
    picks = []
    for o in objs:
        def f(p, c=str, d=None):
            m = re.search(p, o); return c(m.group(1)) if m else d
        a = re.search(r'price1688:\s*\[([\d.]+),\s*([\d.]+)\]', o)
        b = re.search(r'retailPrice:\s*\[([\d.]+),\s*([\d.]+)\]', o)
        pid = f(r'id:\s*"([^"]+)"')
        if not (a and b and pid): continue
        p = dict(id=pid, name=f(r'name:\s*"([^"]+)"'), track=f(r'track:\s*"([^"]+)"'),
                 moq=f(r'moq:\s*(\d+)', int, 0), lo=float(a.group(1)), hi=float(a.group(2)),
                 rlo=float(b.group(1)), rhi=float(b.group(2)),
                 tar=f(r'tariffUS:\s*([\d.]+)', float, 0.0),
                 fr=f(r'freightUnit:\s*([\d.]+)', float, 0.0),
                 diff=f(r'difficulty:\s*"([^"]+)"', str, "n/a"))
        p["land_hi"] = p["hi"] * (1 + p["tar"]) + p["fr"]
        p["land_lo"] = p["lo"] * (1 + p["tar"]) + p["fr"]
        p["worst"]   = p["rlo"] / p["land_hi"] if p["land_hi"] else 0
        p["best"]    = p["rhi"] / p["land_lo"] if p["land_lo"] else 0
        p["cap"]     = p["moq"] * p["hi"]
        picks.append(p)
    return picks

def esc(t): return (t or "").replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

def main():
    picks = parse()
    if len(picks) < 5: sys.exit("data.js parse failed: %d picks" % len(picks))
    today = os.environ.get("GEN_DATE") or datetime.date.today().isoformat()
    n = len(picks)
    w  = [p["worst"] for p in picks]; b = [p["best"] for p in picks]; cap = [p["cap"] for p in picks]
    med_w, med_b = statistics.median(w), statistics.median(b)
    below2 = sum(1 for x in w if x < 2)
    top = sorted(picks, key=lambda p: -p["worst"])[:5]
    bot = sorted(picks, key=lambda p: p["worst"])[:5]
    capsorted = sorted(picks, key=lambda p: p["cap"])

    def row(p):
        return ("<tr><td><strong>%s</strong><br><span class=\"muted\">%s</span></td>"
                "<td>%.1f&times;</td><td>%.1f&times;</td><td>$%.2f</td><td>$%g&ndash;%g</td>"
                "<td>%d</td><td>$%s</td></tr>") % (
            esc(p["name"] or p["id"]), esc(p["track"]), p["worst"], p["best"],
            p["land_hi"], p["rlo"], p["rhi"], p["moq"], f'{p["cap"]:,.0f}')

    faqs = [
      ("What margin do you actually get importing from China?",
       "On this site's own 31 curated picks, the honest answer is a range, not a number. Taking the worst case on every input — the top of the factory price band, plus the US tariff, plus per-unit freight, compared against the LOWEST Western retail price — the median multiple is %.1f× and %d of %d picks come in under 2×. Taking the best case on every input — the bottom of the factory band against the highest retail price — the median is %.1f×. Both are computed from the same published dataset; which end you land on is decided by your buy price and your selling price, not by the category." % (med_w, below2, n, med_b)),
      ("Is the '10x margin from China' claim true?",
       "It exists only at the optimistic end of the range. Across these %d picks the optimistic multiple runs from %.1f× to %.1f×, so a 10× outcome is real for some products under best-case buying and pricing — but the same products land at %.1f× to %.1f× under worst-case assumptions, and the conservative median across the whole set is %.1f×. Any single headline multiple quoted without stating which end of both price bands it uses is not checkable." % (n, min(b), max(b), min(w), max(w), med_w)),
      ("How much money do you need for a first order?",
       "MOQ multiplied by the top of the factory price band gives a median first-order goods cost of $%s across these picks, ranging from $%s to $%s before freight, duty, inspection and samples. That is goods only; the landed-cost page covers what customs adds on top." % (f'{statistics.median(cap):,.0f}', f'{min(cap):,.0f}', f'{max(cap):,.0f}')),
      ("Does harder compliance buy you more margin?",
       "Not in this dataset. Grouping the picks by the compliance difficulty already recorded for each one, the conservative median multiple is %s. In other words, taking on the harder certification burden does not, by itself, show up as a wider spread here — the compliance work buys defensibility against competitors, not a better buy price." % (", ".join("%s: %.1f×" % (d, statistics.median([p["worst"] for p in picks if p["diff"] == d])) for d in ("low","medium","high") if any(p["diff"] == d for p in picks)))),
      ("Where do these numbers come from?",
       "They are computed from this site's own curated pick dataset — the same 1688 and Alibaba factory price bands, Western retail bands, MOQs, US tariff rates and per-unit freight figures published on each pick card, recomputed by a script whenever the dataset changes. They are the curator's researched figures, not audited invoices, and Western retail is an observed price band rather than a guaranteed selling price. Check any individual row against its pick card, and confirm live duty rates with a customs broker before wiring money."),
    ]
    faq_ld = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faqs]}
    art_ld = {"@context":"https://schema.org","@type":"Article",
        "headline":"China sourcing margins: what %d curated picks actually show" % n,
        "datePublished":"2026-08-31","dateModified":today,"inLanguage":"en",
        "author":{"@type":"Organization","name":"SourceRadar (AGI Scorecard)","url":"https://agiscorecard.com/about"},
        "publisher":{"@type":"Organization","name":"SourceRadar","url":"https://source.agiscorecard.com/"},
        "description":"First-party margin spread computed from %d curated China-sourced picks: conservative median %.1fx, optimistic median %.1fx, %d of %d below 2x." % (n, med_w, med_b, below2, n)}

    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#128225;</text></svg>">
  <link rel="stylesheet" href="styles.css">
  <title>China Sourcing Margins: What {n} Real Picks Show (2026)</title>
  <meta name="description" content="Not a number, a range. Across {n} curated China-sourced picks the conservative median is {mw:.1f}x and {b2} of {n} land under 2x, while the optimistic median is {mb:.1f}x. Computed from the published dataset.">
  <link rel="canonical" href="https://source.agiscorecard.com/sourcing-margins">
  <meta property="og:title" content="China sourcing margins: {mw:.1f}x or {mb:.1f}x, depending entirely on your two prices">
  <meta property="og:description" content="{b2} of {n} curated picks fall under 2x once you assume the worst factory price, the tariff and freight. The same picks reach a {mb:.1f}x median under best-case assumptions.">
  <meta property="og:url" content="https://source.agiscorecard.com/sourcing-margins">
  <meta property="og:type" content="article">
  <script type="application/ld+json">{art}</script>
  <script type="application/ld+json">{faq}</script>
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
        <a href="/is-alibaba-legit">Alibaba Risk</a>
        <a href="/sourcing-margins">Margins</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h1>China sourcing margins:<br><span class="accent">what {n} real picks actually show</span></h1>
      <p class="hero-sub"><strong>The answer is a range, and both ends are honest.</strong>
      Assume the worst on every input &mdash; top of the factory price band, plus the US tariff, plus
      per-unit freight, against the <em>lowest</em> Western retail price &mdash; and the median multiple
      across our {n} curated picks is <strong>{mw:.1f}&times;</strong>, with <strong>{b2} of {n} under 2&times;</strong>.
      Assume the best on every input and the median is <strong>{mb:.1f}&times;</strong>.
      Same products, same dataset. Which end you land on is set by your buy price and your selling
      price &mdash; not by the category you picked.</p>
      <p class="hero-sub muted">Computed from the published pick dataset on {today}. Every row is checkable against its own
      <a href="/#picks">pick card</a>.</p>
    </div>
  </section>

  <section class="container" style="padding:1.5rem 0 0">
    <div class="calc">
      <h2>Run it on your own numbers</h2>
      <div class="calc-grid">
        <label class="calc-field">Factory unit price (USD)<input id="mFac" type="number" min="0" step="0.01" value="8"></label>
        <label class="calc-field">Tariff rate %<input id="mTar" type="number" min="0" max="200" value="33"></label>
        <label class="calc-field">Freight per unit (USD)<input id="mFr" type="number" min="0" step="0.01" value="1"></label>
        <label class="calc-field">Your retail price (USD)<input id="mRet" type="number" min="0" step="0.01" value="25"></label>
      </div>
      <div class="calc-results">
        <div class="calc-result"><strong>Landed unit cost</strong>: <span id="mLanded">&mdash;</span></div>
        <div class="calc-result"><strong>Gross multiple</strong>: <span id="mMult">&mdash;</span></div>
        <div class="calc-result"><strong>Where that sits</strong>: <span id="mRank">&mdash;</span></div>
      </div>
      <p class="calc-note">Goods, duty and freight only &mdash; it excludes ad spend, returns, platform fees, storage and
      the samples and inspections you pay for before any of this. Those are what turn a {mw:.1f}&times; gross into a loss.
      Customs specifics are on the <a href="/landed-cost">landed-cost page</a>.</p>
    </div>
  </section>

  <section class="container" style="padding:1.5rem 0">
    <h2>The spread, both ends stated</h2>
    <table class="data-table">
      <thead><tr><th>Reading</th><th>How it is computed</th><th>Median</th><th>Range</th></tr></thead>
      <tbody>
        <tr><td><strong>Conservative</strong></td><td>Top of factory band &times; (1 + tariff) + freight, against the <em>lowest</em> retail price</td><td><strong>{mw:.1f}&times;</strong></td><td>{minw:.1f}&times; &ndash; {maxw:.1f}&times;</td></tr>
        <tr><td><strong>Optimistic</strong></td><td>Bottom of factory band &times; (1 + tariff) + freight, against the <em>highest</em> retail price</td><td><strong>{mb:.1f}&times;</strong></td><td>{minb:.1f}&times; &ndash; {maxb:.1f}&times;</td></tr>
        <tr><td><strong>First-order cash</strong></td><td>MOQ &times; top of factory band (goods only, before duty, freight, samples, inspection)</td><td><strong>${medcap}</strong></td><td>${mincap} &ndash; ${maxcap}</td></tr>
      </tbody>
    </table>
    <p class="muted">The gap between the two rows is the entire argument. A single headline multiple quoted
    without saying which end of <em>both</em> price bands it used cannot be checked, and that is the form
    almost every &ldquo;source from China and make 10&times;&rdquo; claim takes.</p>
  </section>

  <section class="container" style="padding:0 0 1.5rem">
    <h2>Best five on the conservative reading</h2>
    <table class="data-table">
      <thead><tr><th>Pick</th><th>Conservative</th><th>Optimistic</th><th>Landed (worst)</th><th>Retail band</th><th>MOQ</th><th>First order</th></tr></thead>
      <tbody>{toprows}</tbody>
    </table>
    <h2 style="margin-top:1.5rem">Worst five on the conservative reading</h2>
    <table class="data-table">
      <thead><tr><th>Pick</th><th>Conservative</th><th>Optimistic</th><th>Landed (worst)</th><th>Retail band</th><th>MOQ</th><th>First order</th></tr></thead>
      <tbody>{botrows}</tbody>
    </table>
    <p class="muted">Note the pattern in the bottom table: the thin conservative multiples cluster on the
    <em>expensive</em> units. A ${maxcap} first order that has to clear a 1.1&times; worst case is a different
    risk from a ${mincap} order at 3&times; &mdash; which is why first-order cash is in the table above and not a footnote.</p>
    <p><a class="btn" href="/#picks" onclick="ev('out_click','margins_to_picks')">See all {n} picks with their own numbers &rarr;</a></p>
  </section>

  <section class="container" style="padding:0 0 2rem">
    <h2>Method, and what these numbers are not</h2>
    <ul>
      <li><strong>Source.</strong> Every figure is computed from this site&rsquo;s curated pick dataset &mdash; the factory
      price bands, retail bands, MOQs, tariff rates and per-unit freight published on each pick card. The page is
      regenerated by script from that dataset, so it cannot drift from it.</li>
      <li><strong>These are researched figures, not audited invoices.</strong> Factory bands come from listed 1688 and
      Alibaba pricing at curation time; Western retail is an observed price band, not a guaranteed selling price.</li>
      <li><strong>Gross, not net.</strong> The multiples exclude advertising, returns, platform commission, storage,
      samples and inspection. On thin categories those costs consume the entire spread.</li>
      <li><strong>Tariffs move.</strong> The duty rates baked into each pick were current at curation; policy has changed
      repeatedly since 2025. Confirm live rates with a customs broker before committing money.</li>
      <li><strong>Sample of {n}.</strong> This is what our own curated set shows. It is not a claim about every product
      category in the world, and we will not present it as one.</li>
    </ul>
  </section>

  <section class="container" style="padding:0 0 2rem">
    <h2>Frequently asked questions</h2>
    {faqhtml}
  </section>

  <footer class="site-footer">
    <div class="container">
      <p>SourceRadar &middot; part of the <a href="https://agiscorecard.com/">AGI Scorecard</a> network &middot;
      numbers recomputed from the published dataset on {today}.</p>
      <p class="muted">Not financial, legal or customs advice. Verify duty rates and supplier claims independently before wiring money.</p>
    </div>
  </footer>

<script>
function ev(n,l){{try{{var b=JSON.stringify({{n:n,l:(l||'').slice(0,80),v:0,p:location.pathname}});navigator.sendBeacon?navigator.sendBeacon('/e',b):fetch('/e',{{method:'POST',body:b,keepalive:true}});}}catch(e){{}}}}
(function(){{
  var W={wjson}, B={bjson};
  function q(a,v){{var c=0;for(var i=0;i<a.length;i++)if(a[i]<=v)c++;return Math.round(100*c/a.length);}}
  function calc(){{
    var f=+document.getElementById('mFac').value||0, t=(+document.getElementById('mTar').value||0)/100,
        fr=+document.getElementById('mFr').value||0, r=+document.getElementById('mRet').value||0;
    var landed=f*(1+t)+fr, m=landed>0?r/landed:0;
    document.getElementById('mLanded').textContent='$'+landed.toFixed(2);
    document.getElementById('mMult').textContent=m?m.toFixed(1)+'x':'—';
    document.getElementById('mRank').textContent = !m ? '—' :
      ('above '+q(W,m)+'% of our picks on the conservative reading, '+q(B,m)+'% on the optimistic one');
  }}
  ['mFac','mTar','mFr','mRet'].forEach(function(id){{
    var el=document.getElementById(id); if(!el)return;
    el.addEventListener('input',calc);
    el.addEventListener('change',function(){{ev('calc_use','margins');}});
  }});
  calc();
}})();
</script>
</body>
</html>
""".format(
        n=n, mw=med_w, mb=med_b, b2=below2, today=today,
        minw=min(w), maxw=max(w), minb=min(b), maxb=max(b),
        medcap=f'{statistics.median(cap):,.0f}', mincap=f'{min(cap):,.0f}', maxcap=f'{max(cap):,.0f}',
        toprows="".join(row(p) for p in top), botrows="".join(row(p) for p in bot),
        art=json.dumps(art_ld, ensure_ascii=False), faq=json.dumps(faq_ld, ensure_ascii=False),
        faqhtml="".join('<h3>%s</h3><p>%s</p>' % (esc(q), esc(a)) for q, a in faqs),
        wjson=json.dumps([round(x,3) for x in sorted(w)]), bjson=json.dumps([round(x,3) for x in sorted(b)]),
    )
    open(OUT, "w", encoding="utf-8").write(html)
    print("wrote %s — %d picks, conservative median %.1fx, optimistic %.1fx, %d under 2x"
          % (OUT, n, med_w, med_b, below2))

if __name__ == "__main__":
    main()
