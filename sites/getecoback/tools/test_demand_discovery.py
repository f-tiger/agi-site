#!/usr/bin/env python3
"""Check full canonical coverage, locale fit, privacy and repeatable generation."""
from build_search import SITE, Metadata, collect, public_pages
from build_demand_discovery import build,TASKS
import json
rows=list(public_pages());before={p:p.read_bytes() for p,_,_,_ in rows}
build()
assert all(p.read_bytes()==b for p,b in before.items()),'Discovery generation must be byte-stable'
index=json.loads((SITE/'search-index.json').read_text())
assert index==collect() and len({r['u'] for r in index})==len(rows)
assert all('#' not in entry['u'] for entry in index),'Search sections must not become canonical index entries'
product_index=next(row for row in index if row['u']=='/produkte.html')
assert [row['id'] for row in product_index['model_sections']]==['waeschesaeule-zubehoer','beutelstaubsauger-angebote','miele-staubsaugerbeutel','kaercher-170mm-saugduese','fenstersauger-duesenbreite']
comfee_index=next(row for row in index if row['u']=='/guide/luftentfeuchter-keller.html')
assert [row['id'] for row in comfee_index['model_sections']]==['modell-comfee-mddf20']
trotec_index=next(row for row in index if row['u']=='/guide/trotec-luftentfeuchter-test.html')
assert [row['id'] for row in trotec_index['model_sections']]==['ttk70-hepa-filter']
humidifier_index=next(row for row in index if row['u']=='/guide/luftbefeuchter-ratgeber.html')
humidifier_sections=[row['id'] for row in humidifier_index['model_sections']]
assert sorted(humidifier_sections)==sorted(['ersatzteile-zuordnen','philips-verdunsterfilter','philips-hu4803-01','philips-hu2716-10'])
focused=[entry for entry in index if entry.get('section')]
assert [(entry['l'],entry['u'],entry['section']['id']) for entry in focused]==[
    ('de','/geraete-austausch-rechner.html','geschirrspueler-handabwasch'),
    ('de','/guide/delonghi-pac-n90-test.html','testlage'),
    ('de','/guide/duschen-kosten-rechner.html','durchlauferhitzer-mindestdurchfluss'),
    ('de','/guide/fenster-beschlagen-aussen.html','aussen-innen-oder-dazwischen'),
    ('de','/guide/fenster-beschlagen-innen.html','fenstersauger-gegen-kondenswasser'),
    ('de','/guide/fensterabdichtung-selber-bauen.html','abluft-ausschnitt-pruefen'),
    ('de','/guide/fenster-zugluft-mietwohnung.html','dichtungsprofil'),
    ('de','/guide/heizdecke-stromverbrauch.html','waerme-rechner'),
    ('de','/guide/heizkosten-vergleich-rechner.html','heizluefter-oder-infrarot'),
    ('de','/guide/keller-lueften-sommer.html','taupunkt'),
    ('de','/guide/klarstein-kraftwerk-smart-12k-test.html','kraftwerk-10034664-lieferumfang'),
    ('de','/guide/klimaanlage-40-qm.html','portasplit-40-qm'),
    ('de','/guide/klimaanlage-fenster-einbruchschutz.html','fenster-verschluss-pruefen'),
    ('de','/guide/lichterkette-stromkosten.html','zeitschaltuhr-strombilanz'),
    ('de','/guide/luftentfeuchter-keller.html','ablauf-vor-kauf'),
    ('de','/guide/luftentfeuchter-ratgeber.html','modell-bosch-d4000-eu'),
    ('de','/guide/luftfeuchtigkeit-richtig-messen.html','hygrometer-vergleichen'),
    ('de','/guide/midea-portasplit-ausverkauft-alternativen.html','fensterfalz'),
    ('de','/guide/richtig-lueften-im-winter.html','lueften-vorher-nachher'),
    ('de','/guide/smarte-heizkoerperthermostate-lohnen-sich.html','danfoss-altventil'),
    ('de','/guide/thermovorhang-ratgeber.html','thermovorhang-bahnenbedarf'),
    ('de','/guide/trotec-luftentfeuchter-test.html','ttk75-pruefpunkt'),
    ('de','/produkte.html','kaffee-wasserfilter'),
    ('de','/waeschetrockner-oder-luftentfeuchter.html','luftentfeuchter-waesche-kosten')]
assert (SITE/'search-index.json').read_bytes()==(SITE/'assets/search-index.json').read_bytes()
for p,r,l,h in rows:
 s=p.read_text()
 for marker in ['id="eco-discovery"','id="eb-search-toggle"','id="eb-search-query"','id="eco-chrome-copy"']:
  assert s.count(marker)==1,(r,marker)
 assert '<!--EB_SEARCH-->' not in s and '/assets/eco-chrome.mjs' not in s,r
 for task in TASKS[l]['tasks']:assert 'href="'+task['url']+'"' in s,(r,task)
for p in SITE.rglob('*.html'):
 if Metadata(p.read_text()).noindex:assert 'id="eco-discovery"' not in p.read_text(),p
assert Metadata('<head><meta content="follow, NOINDEX" name="robots"></head>').noindex
assert Metadata('<head><title>A &amp; B</title></head>').title=='A & B'
print(f'PASS discovery: {len(rows)} public canonical pages, {len(TASKS)} locales, static task links, private exclusions and idempotence')
