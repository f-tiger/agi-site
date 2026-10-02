from build_evidence_assets import render,ROOT,CASES
import json,re,xml.etree.ElementTree as ET
before=[(ROOT/n).read_bytes() for n in ['data.json','index-history.json']]
outputs=render()
for p,s in outputs.items():
 assert p.read_text()==s,p
 if p.suffix=='.svg':ET.fromstring(s);assert ('2026-09-06' in s or '2026-10-02' in s)
 else:
  assert s.count('id="cite-evidence"')==1
  assert len(re.findall(r'<h1\b',s))==1
  assert 'data-evidence-action="citation_copy"' in s
  for v in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):json.loads(v)
for kind,slug in CASES:
 assert (ROOT/f'{slug}.html').exists() and (ROOT/f'zh/{slug}.html').exists()
assert before==[(ROOT/n).read_bytes() for n in ['data.json','index-history.json']]
print('Evidence source dates, bilingual routes, SVG, schema and idempotence: OK')
