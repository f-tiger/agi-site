"""Zero-network regression for the existing UK laundry page and mirror."""
import json
import re
from pathlib import Path
from build_uk_opportunities import localize_laundry_copy
from build_agent_md import to_markdown

SITE = Path(__file__).resolve().parents[1] / 'site'
PATH = 'en/guide/dehumidifier-drying-clothes-cost.html'

def check_laundry_copy():
    html = (SITE / PATH).read_text()
    md = (SITE / PATH).with_suffix('.md').read_text()
    assert localize_laundry_copy(html) == html, 'committed HTML needs UK normalization'
    assert md == to_markdown(html, '/' + PATH, 'en'), 'Markdown mirror drift'
    visible = re.sub(r'<script\b.*?</script>', '', html, flags=re.S)
    for old in ['€0.30', 'EUR 0.70', '€0.35', '6.0 ct', 'Ratgeber durchsuchen', 'aria-label="Suche"']:
        assert old not in visible, old
    for watts, hourly, run, month in [(200, '7.0', '.42', '5.04'), (300, '10.5', '.63', '7.56'), (500, '17.5', '1.05', '12.60')]:
        row = f'<td>{watts} W</td><td>{float(hourly):.1f}p</td><td>GBP {float(run):.2f}</td><td>GBP {month}</td>'
        assert row in html, row
        assert round(watts / 1000 * .35 * 6, 2) == float(run)
        assert round(watts / 1000 * .35 * 6 * 12, 2) == float(month)
    graphs = [json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]
    faq = next(g for g in graphs if g.get('@type') == 'FAQPage')
    plain = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', visible))
    for question in faq['mainEntity']:
        assert question['acceptedAnswer']['text'] in plain, 'FAQ visible/schema drift'
    for value in ['GBP 0.70 at GBP 0.35/kWh', 'GBP 0.35/kWh = GBP 0.45 (rounded)', 'fictional', 'not a measurement', 'same amount of equally dry laundry']:
        assert value in html and value in md, value
    assert 'Amazon.de (Germany)' in html
    assert 'UK model and retailer checklist' in html
    assert 'amazon.' not in md
    assert 'href="https://getecoback.com/' + PATH + '"' in html
    # Generic injectors can reintroduce old English copy; normalization must repair
    # it and then be byte-stable, without touching unrelated German text or scripts.
    fixture = '€0.35/kWh = €0.45 | EUR 0.70 at EUR 0.35/kWh | 0,35 €/kWh | <script>unchanged()</script>'
    normalized = localize_laundry_copy(fixture)
    assert normalized == localize_laundry_copy(normalized)
    assert '0,35 €/kWh | <script>unchanged()</script>' in normalized
    print('PASS UK laundry: GBP arithmetic, static search, FAQ parity, mirror, market scope and idempotence')

if __name__ == '__main__':
    check_laundry_copy()
