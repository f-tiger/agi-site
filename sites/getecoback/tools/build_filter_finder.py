#!/usr/bin/env python3
"""Build only the US replacement-filter finder from reviewed source data."""
import argparse
import html
import hashlib
import json
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = 'https://getecoback.com/en/filter-finder.html'
FAQ = [
    ('How do I find my exact air purifier model?', 'Read the model name on the rating label on the back or underside of your air purifier. Keep every letter, number and suffix. Select that exact model here; a similar-looking name does not establish a match.'),
    ('Does this finder cover every replacement filter?', 'No. This first US directory covers only the Levoit models listed in the table. An unlisted model means we have not documented it here, not that no replacement filter exists.'),
    ('What does a source check establish?', 'We check the manufacturer listing for the stated model-to-filter relationship. This is a documentation check, not a physical fit test, independent performance test or guarantee of seller authenticity.'),
    ('Why is an Amazon search sometimes unavailable?', 'Amazon search links appear only after you select an exact model, when the source record is verified and its check is no more than 30 days old. A source conflict, failed check or older record keeps the official evidence visible but disables the Amazon link.'),
    ('Does an Amazon search identify one guaranteed product?', 'No. Amazon results may include third-party filters and other variants. Compare the manufacturer filter name, exact purifier model and seller listing before buying. We do not show current price or stock and do not claim that search results are original filters.'),
    ('Where are my search and saved models stored?', 'Model filtering happens in your browser. Saved models stay in this browser only and are not synchronized to an account. Search text and selected model names are not sent to analytics; fixed tool-action and affiliate-click measurement follows the site privacy settings.')
]
def esc(value):
    return html.escape(str(value or ''), quote=True)
def state(item, today):
    if item['status'] == 'conflict': return 'Source conflict — check official listing'
    if item['status'] != 'verified': return 'Source check unavailable — recheck official listing'
    age = (today - date.fromisoformat(item['checked_at'])).days
    if age < 0: return 'Check date unavailable — recheck official listing'
    if age > 30: return 'Recheck due — last verified more than 30 days ago'
    return 'Manufacturer listing checked'
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, default=ROOT/'data/filter-finder.json')
    parser.add_argument('--output', type=Path, default=ROOT/'site/en/filter-finder.html')
    parser.add_argument('--today', default=date.today().isoformat())
    args = parser.parse_args()
    today = date.fromisoformat(args.today)
    data = json.loads(args.data.read_text())
    if data.get('schema_version') != 1 or data.get('market') != 'US': raise ValueError('Expected schema_version=1 and market=US')
    if not data.get('items'): raise ValueError('No reviewed filter data; refusing to publish an empty directory')
    items = []
    ids = set()
    for raw in data['items']:
        required = ['id','brand','name','models','source_url','checked_at','status']
        if any(key not in raw for key in required): raise ValueError('Incomplete source record')
        if raw['id'] in ids: raise ValueError('Duplicate filter id')
        ids.add(raw['id'])
        if raw['brand'] != 'Levoit' or raw['status'] not in ('verified','conflict','unavailable'): raise ValueError('Unsupported brand or source status')
        if not isinstance(raw['models'],list) or not raw['models'] or any(not isinstance(m,str) or not m.strip() for m in raw['models']): raise ValueError('Exact model names required')
        parsed=urlparse(raw['source_url'])
        if parsed.scheme != 'https' or not (parsed.hostname == 'levoit.com' or (parsed.hostname or '').endswith('.levoit.com')): raise ValueError('Expected an official Levoit HTTPS source')
        date.fromisoformat(raw['checked_at'])
        item = {key:raw[key] for key in required}
        item['part_number']=raw.get('part_number') or ''
        item['note']=raw.get('note') or ''
        item['amazon_query']=raw.get('amazon_query') or ''
        items.append(item)
    models=sorted({model for item in items for model in item['models']},key=str.casefold)
    asset_version=hashlib.sha256(b''.join((ROOT/'site/assets'/name).read_bytes() for name in ['filter-finder.css','filter-finder.mjs','filter-finder-core.mjs'])).hexdigest()[:16]
    rows=[]
    for model in models:
        for item in items:
            if model not in item['models']: continue
            part = f'<span class="part-number">Part number: {esc(item["part_number"])}</span>' if item['part_number'] else '<span class="part-number">Consumer part number not established in this record</span>'
            rows.append(f'<tr><th scope="row">{esc(item["brand"])} {esc(model)}</th><td>{esc(item["name"])}{part}</td><td><a href="{esc(item["source_url"])}" target="_blank" rel="noopener noreferrer">Official manufacturer listing</a><span class="table-note">{esc(item["note"])}</span></td><td><time datetime="{esc(item["checked_at"])}">{esc(item["checked_at"])}</time><span class="table-note" data-record-id="{esc(item["id"])}">{esc(state(item,today))}</span></td></tr>')
    faq_html=''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in FAQ)
    structured={'@context':'https://schema.org','@graph':[{'@type':'WebPage','@id':CANONICAL,'url':CANONICAL,'name':'Levoit Replacement Filter Finder for US Models | EcoBack','description':'Select your exact Levoit air purifier model to see documented original replacement filters, official sources and checked dates. Free US model lookup.','inLanguage':'en-US','dateModified':data['updated']},{'@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in FAQ]}]}
    payload=json.dumps({'market':'US','updated':data['updated'],'items':items},ensure_ascii=False).replace('<','\\u003c')
    jsonld=json.dumps(structured,ensure_ascii=False).replace('<','\\u003c')
    page=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Levoit Replacement Filter Finder for US Models | EcoBack</title><meta name="description" content="Select your exact Levoit air purifier model to see documented original replacement filters, official sources and checked dates. Free US model lookup."><meta name="robots" content="index,follow"><link rel="canonical" href="{CANONICAL}"><meta property="og:type" content="website"><meta property="og:title" content="Find the replacement filter for your exact Levoit model"><meta property="og:description" content="Check the original filter name against an official source before you buy. Free US model lookup with visible evidence dates."><meta property="og:url" content="{CANONICAL}"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#153c50"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/filter-finder.css?v={asset_version}"><script type="application/ld+json">{jsonld}</script><script id="filter-finder-data" type="application/json">{payload}</script><script type="module" src="/assets/filter-finder.mjs?v={asset_version}"></script></head>
<body><a class="skip-link" href="#finder">Skip to model finder</a><header class="site-header"><a class="wordmark" href="/en/">EcoBack<span>Home climate, made clearer.</span></a><nav aria-label="Page navigation"><a href="#model-table">Model directory</a><a href="#method">How we check</a></nav><span class="market-label">US directory</span></header>
<main><article><section class="finder-intro"><div class="intro-copy"><p class="category-label">Replacement filter finder</p><h1>The right filter starts<br> with the exact model.</h1><p>Find the original replacement filter documented for your Levoit air purifier. Check the model on your unit, then choose it below.</p><div class="coverage-line"><span>{len(models)} documented model names</span><span>Official source links</span><span>No account needed</span></div></div><div class="filter-drawing" aria-hidden="true"><svg viewBox="0 0 270 260"><path d="M35 51 190 31l46 34-155 23Z" fill="#fff" stroke="#153c50" stroke-width="2"/><path d="m35 51 46 37v146l-46-37Z" fill="#e5e9e4" stroke="#153c50" stroke-width="2"/><path d="m81 88 155-23v145L81 234Z" fill="#fafaf4" stroke="#153c50" stroke-width="2"/><g stroke="#809587" stroke-width="2">{''.join(f'<path d="M{x} {88-(x-81)*23/155:.1f}v144"/>' for x in range(91,232,10))}</g><path d="M16 216h37m-17-14 17 14-17 14M159 244h91" stroke="#bc632e" stroke-width="2" fill="none"/><rect x="11" y="101" width="50" height="43" fill="#153c50"/><path d="M21 114h30m-30 8h23m-23 8h16" stroke="#fff" stroke-width="2"/></svg><p>Model name first.<br>Filter name second.</p></div></section>
<section id="finder" class="finder-panel" aria-labelledby="finder-title"><div class="finder-heading"><div><h2 id="finder-title">Choose your exact purifier model</h2><p>Include the suffix on the label. Similar names are not treated as interchangeable.</p></div><span class="local-label">Search stays in your browser</span></div><form id="model-search-form" role="search"><label for="model-search">Model name</label><div class="search-row"><input id="model-search" name="model" type="search" autocomplete="off" spellcheck="false" placeholder="Type the model printed on your purifier" aria-describedby="search-help" aria-controls="model-options"><button type="submit">Find model</button></div><p id="search-help">Typing narrows this directory. Select a complete model name to see its filter.</p></form><div id="model-options" class="model-options" aria-label="Exact models"></div><p id="search-status" class="search-status" role="status"></p><section id="model-result" data-tool hidden aria-live="polite" aria-atomic="false"></section><div id="saved-models" class="saved-models" hidden><h3>Saved in this browser</h3><div id="saved-model-buttons"></div><p>Local bookmarks only. No account sync or replacement reminders.</p></div><p id="save-status" class="search-status" role="status"></p><noscript><p class="no-script">JavaScript is needed for model selection and local bookmarks. The complete official-source directory below remains available without it.</p></noscript></section>
<p class="affiliate-disclosure">As an Amazon Associate I earn from qualifying purchases. Amazon links are marked affiliate searches. An Amazon search can include third-party products; check the exact model and seller before buying. No price, stock or original-product availability is implied.</p>
<section id="model-table" class="directory-section"><div class="section-heading"><h2>Model-to-filter directory</h2><p>US manufacturer listings · Data reviewed {esc(data['updated'])}</p></div><p class="section-intro">These are documented manufacturer relationships, not physical fit tests. The official source is shown for every record. Model names and filter variants are preserved as listed.</p><div class="table-container"><table><caption class="visually-hidden">Levoit US purifier models, original filter names, official sources and last check dates</caption><thead><tr><th scope="col">Exact purifier model</th><th scope="col">Manufacturer filter name</th><th scope="col">Source and limits</th><th scope="col">Last source check</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>
<section id="method" class="method-section"><div><h2>What this lookup can tell you</h2><p>It connects an exact model name with a replacement filter named by its manufacturer. It does not measure filtration performance, authenticate a seller or confirm that a marketplace result is the right item.</p></div><ol><li><strong>Read the unit label.</strong><span>Use the complete model name, including any suffix.</span></li><li><strong>Open the official evidence.</strong><span>Check the filter name and any stated variant or part number.</span></li><li><strong>Check the seller listing.</strong><span>Match its purifier model, filter variant and seller information before purchasing.</span></li></ol></section>
<section class="faq-section"><h2>Before you replace a filter</h2>{faq_html}</section>
</article></main><footer class="site-footer"><a class="wordmark" href="/en/">EcoBack</a><p>A small, sourced directory for a specific replacement decision.</p><a href="/datenschutz.html">Privacy</a><a href="/impressum.html">Publisher information</a></footer></body></html>'''
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(page,encoding='utf-8')
    print(f'Built {args.output}: {len(models)} exact models, {len(items)} records; no static affiliate links')
if __name__ == '__main__': main()
