#!/usr/bin/env python3
"""Contextual links from existing content; run after standard link injectors."""
from pathlib import Path
import re
import hashlib
SITE=Path(__file__).resolve().parents[1]/'site'
TARGETS={
'guide/fenster-beschlagen-innen.html':('Vor dem Gerätekauf: Feuchte richtig messen','/guide/luftfeuchtigkeit-richtig-messen.html','Temperatur und Luftfeuchte an mehreren typischen Tagen prüfen. Kondenswasser allein legt keine Gerätegröße fest.'),
'guide/luftentfeuchter-keller.html':('Passt ein Entfeuchter zu deinem Keller?','/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice','Mit Feuchtequelle, Messwert und Temperatur den nächsten Schritt klären. Ein Gerät ersetzt keine Prüfung nasser Wände.'),
'guide/schimmel-im-keller-entfernen.html':('Feuchte beobachten, Ursache klären','/guide/luftfeuchtigkeit-richtig-messen.html','Messwerte helfen bei der Einordnung; vorhandener Schimmel und bauliche Ursachen brauchen eine eigene Beurteilung.'),
'guide/heizluefter-stromsparend.html':('Rechne mit deinem Tarif und deiner Laufzeit','/guide/heizluefter-stromverbrauch.html#eb-heater-cost','Die eingestellte Leistung, Heizzeit und dein Strompreis bestimmen die Betriebskosten. Thermostat-Sparen nicht pauschal annehmen.'),
'guide/heizluefter-stromverbrauch.html':('Welche Zusatzheizung passt zu deiner Nutzung?','/guide/heizkosten-vergleich-rechner.html','Vergleiche den konkreten Betrieb. Ein niedriger Kaufpreis bedeutet nicht automatisch niedrige Gesamtkosten.'),
'index.html':('Haushaltskosten mit eigenen Zahlen prüfen','/wohnkosten-werkstatt.html','Drei kostenlose Rechner: Trocknen vergleichen, Strom messen und einen Geräteaustausch durchrechnen.'),
'tools.html':('Neu: die Haushaltswerkstatt','/wohnkosten-werkstatt.html','Messprotokoll, Trocknungsvergleich und Austauschrechner mit nachvollziehbaren Beispielen.'),
'guide/waesche-trocknen-wohnung.html':('Trockner oder Entfeuchter: Was kostet deine Wäsche?','/waeschetrockner-oder-luftentfeuchter.html','Vergleiche Strom je gleich trockener Ladung statt nur die Wattzahl der Geräte.'),
'guide/luftentfeuchter-ratgeber.html':('Vor dem Kauf mit deiner Nutzung rechnen','/waeschetrockner-oder-luftentfeuchter.html','Bei der Wäschetrocknung entscheiden Verbrauch und Laufzeit gemeinsam.'),
'guide/luftentfeuchter-dauerbetrieb-stromkosten.html':('Dauerbetrieb tatsächlich messen','/strommess-protokoll.html','kWh und Messdauer notieren; Betrieb mit Hygrostat nicht als Dauerlast überschätzen.'),
'guide/strom-sparen-haushalt.html':('Stromfresser mit einem Messprotokoll prüfen','/strommess-protokoll.html','Aus gemessenen kWh und deiner Nutzung nachvollziehbare Kosten machen.'),
'guide/stromkosten-rechner.html':('Ist ein neues Gerät wirklich günstiger?','/geraete-austausch-rechner.html','Auch den Kaufpreis einrechnen: Stromersparnis ist noch keine Gesamtersparnis.'),
'guide/luftfeuchtigkeit-senken.html':('Wäschekosten und Raumfeuchte getrennt prüfen','/waeschetrockner-oder-luftentfeuchter.html','Berechne direkte Stromkosten. Ursachen der Feuchtigkeit bleiben eine eigene Frage.'),
'guide/klimaanlage-stromkosten.html':('Behalten oder austauschen?','/geraete-austausch-rechner.html','Mit Jahresverbrauch, Kaufpreis und deinem Strompreis vergleichen.'),
}
for name,(title,url,desc) in TARGETS.items():
 p=SITE/name
 if not p.exists():raise SystemExit('Missing source page: '+name)
 s=p.read_text();block=f'<!--EB_HOUSEHOLD_LINK--><aside style="margin:24px 0;padding:20px;border-left:5px solid #075f88;background:#eff7fb;"><strong><a href="{url}">{title}</a></strong><p style="margin:6px 0 0;">{desc}</p></aside><!--/EB_HOUSEHOLD_LINK-->\n'
 if name=='index.html':
  block='''<!--EB_HOUSEHOLD_LINK--><section id="eb-household-entry" aria-labelledby="eb-household-title" style="max-width:1000px;margin:20px auto;padding:18px 20px;background:#eff7fb;border-left:5px solid #075f88;box-sizing:border-box;">
<h2 id="eb-household-title" style="margin:0 0 8px;">Erst prüfen, dann kaufen</h2>
<p style="margin:0 0 12px;">Drei kostenlose Entscheidungshilfen mit deinen Werten. Ohne Anmeldung.</p>
<div style="display:flex;flex-wrap:wrap;gap:12px;">
<a href="/guide/luftfeuchtigkeit-richtig-messen.html" style="flex:1 1 220px;padding:12px;background:#fff;border:1px solid #cfe0ea;border-radius:8px;">Fenster feucht?<br><strong>Messung und nächsten Schritt klären →</strong></a>
<a href="/waeschetrockner-oder-luftentfeuchter.html#laundry-check" style="flex:1 1 220px;padding:12px;background:#fff;border:1px solid #cfe0ea;border-radius:8px;">Wäsche drinnen trocknen?<br><strong>Trockner und Entfeuchter durchrechnen →</strong></a>
<a href="/guide/heizkosten-vergleich-rechner.html" style="flex:1 1 220px;padding:12px;background:#fff;border:1px solid #cfe0ea;border-radius:8px;">Zusätzlich heizen?<br><strong>Betriebskosten vergleichen →</strong></a>
</div><p style="margin:12px 0 0;font-size:14px;"><a href="/wohnkosten-werkstatt.html">Zur Haushaltswerkstatt: Strom messen und Geräteaustausch prüfen →</a></p>
</section><!--/EB_HOUSEHOLD_LINK-->
'''
 if '<!--EB_HOUSEHOLD_LINK-->' in s:s=re.sub(r'<!--EB_HOUSEHOLD_LINK-->.*?<!--/EB_HOUSEHOLD_LINK-->\n?',lambda m:block,s,flags=re.S)
 else:
  s,n=re.subn(r'(<h2\b)',lambda m:block+m.group(1),s,count=1)
  if n!=1:raise SystemExit('No insertion target: '+name)
 if name=='tools.html':s=s.replace('10 kostenlose Tools','kostenlose Tools')
 # These existing autumn/winter paths are not heatwave guides. Normalize the
 # old template label here so later generator runs cannot restore it.
 if name.startswith('guide/') and not name.startswith('guide/klimaanlage-'):
  s=s.replace('EcoBack Hitzewelle-Ratgeber','EcoBack Raumklima-Ratgeber')
 p.write_text(s)
print('Household entry links verified on',len(TARGETS),'existing pages.')

# Content-address browser assets so returning readers receive fixes, too.
math_hash=hashlib.sha256((SITE/'assets/household-math.mjs').read_bytes()).hexdigest()[:12]
js=SITE/'assets/household.mjs'
js.write_text(re.sub(r"\./household-math\.mjs(?:\?v=[a-f0-9]+)?", './household-math.mjs?v='+math_hash, js.read_text()))
asset_versions={name:hashlib.sha256((SITE/'assets'/name).read_bytes()).hexdigest()[:12] for name in ['household.css','household.mjs']}

# Explicit browser QA must not count as customer adoption. Run after chrome.
for slug in ['wohnkosten-werkstatt','waeschetrockner-oder-luftentfeuchter','strommess-protokoll','geraete-austausch-rechner']:
 p=SITE/(slug+'.html');s=p.read_text()
 for name,version in asset_versions.items():
  s=re.sub(r'/assets/'+re.escape(name)+r'(?:\?v=[a-f0-9]+)?', '/assets/'+name+'?v='+version, s)
 # These pages offer explicit DE/US category links; do not rewrite the visitor's choice.
 s=re.sub(r'<!--EB_USSWITCH-->.*?<!--/EB_USSWITCH-->\n?', '', s, flags=re.S)
 anchor='<!--EB_TRACK--><script>(function(){'
 guard='if(new URLSearchParams(location.search).get("__probe")==="1")return;'
 assert anchor in s, slug+' tracking anchor missing'
 if anchor+guard not in s:s=s.replace(anchor,anchor+guard,1)
 p.write_text(s)
