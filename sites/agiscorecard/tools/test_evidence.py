from html import unescape
import json
import re
import xml.etree.ElementTree as ET

from build_evidence_assets import CASES, ROOT, render

before = [(ROOT / name).read_bytes() for name in ('data.json', 'index-history.json')]
data = json.loads(before[0])
ledger_date = data['thesisTracker']['asOf']
predictions = {row['id']: row for row in data['predictions']}
reviewed = {'agi2027': predictions['agi-2027'], 'open': predictions['open-source-fades']}
legacy_version = '2026-10-02'
outputs = render()

for kind, slug in CASES:
    row = reviewed.get(kind)
    version = row['reviewedAt'] if row else legacy_version
    if row:
        assert version > legacy_version and version != ledger_date
    for lang, prefix in [('en', ''), ('zh', 'zh/')]:
        page = ROOT / f'{prefix}{slug}.html'
        html = outputs[page]
        assert page.read_text() == html, page
        assert html.count('id="cite-evidence"') == 1, page
        assert len(re.findall(r'<h1\b', html)) == 1, page

        panel = re.search(r'<!-- evidence-asset:start -->(.*?)<!-- evidence-asset:end -->', html, re.S)[1]
        assert f'<time datetime="{version}">{version}</time>' in panel, page
        assert f'<time>{ledger_date}</time>' in panel, page
        assert 'data-release="agi-evidence-20261002"' in panel, page
        assert 'data-evidence-action="citation_copy"' in panel, page
        citation = re.search(r'<p class="evidence-citation">(.*?)</p>', panel)[1]
        assert citation.index(version) < citation.index(ledger_date), page

        schemas = [json.loads(value) for value in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]
        note = next(schema for schema in schemas if schema.get('@id', '').endswith('#cite-evidence'))
        assert note['datePublished'] == legacy_version and note['dateModified'] == version, page
        if row:
            sources = [source['url'] for source in row['sources']]
            rendered_sources = [unescape(url) for url in re.findall(r'<a href="([^"]+)" data-evidence-action="source_open">', panel)]
            assert rendered_sources == sources and note['citation'] == sources, page

        chart = ROOT / f'evidence-assets/{kind}-{lang}.svg'
        svg = outputs[chart]
        assert chart.read_text() == svg, chart
        tree = ET.fromstring(svg)
        desc = tree.find('{http://www.w3.org/2000/svg}desc')
        assert ledger_date in desc.text, chart
        chart_date = ledger_date if kind in ('progress', 'agi2027') else version
        assert any(chart_date in (line.text or '') for line in tree.iter('{http://www.w3.org/2000/svg}text')), chart

assert before == [(ROOT / name).read_bytes() for name in ('data.json', 'index-history.json')]
print('Evidence source dates, bilingual routes, SVG, schema and idempotence: OK')
