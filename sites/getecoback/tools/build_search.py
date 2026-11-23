#!/usr/bin/env python3
"""Index all public canonical pages; searches stay in the visitor's browser."""
from pathlib import Path
import json
import re
from build_language_nav import Head, local
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
PRIVATE={'auth','api','account','account.html','members','members.html','widgets','analytics-assets','member-assets'}
class Metadata(Head):
 def __init__(self,text):
  self.title='';self.description='';self.intitle=False
  super().__init__(text)
 def handle_starttag(self,tag,attrs):
  super().handle_starttag(tag,attrs);a=dict(attrs)
  if self.inhead and tag=='title':self.intitle=True
  if self.inhead and tag=='meta' and a.get('name','').lower()=='description':self.description=a.get('content','')
 def handle_endtag(self,tag):
  if tag=='title':self.intitle=False
  super().handle_endtag(tag)
 def handle_data(self,text):
  if self.intitle:self.title+=text

def public_pages():
 for path in sorted(SITE.rglob('*.html')):
  h=Metadata(path.read_text());route=local(h.canonical)
  if not route or h.noindex or PRIVATE.intersection(route.split('/')):continue
  if path!=SITE/(route.lstrip('/')+('index.html' if route.endswith('/') else '')):continue
  lang='en-AU' if route.startswith('/au/') else {'en-GB':'en','de-DE':'de','zh':'zh-CN'}.get(h.lang,h.lang)
  yield path,route,lang,h

def collect():
 tasks=json.loads((ROOT/'data/demand-discovery.json').read_text())
 aliases={(l,t['url']):t['label']+' '+t['aliases'] for l,g in tasks.items() for t in g['tasks']}
 sections={(l,t['url']):t['section'] for l,g in tasks.items() for t in g['tasks'] if 'section' in t}
 sections[('de','/guide/keller-lueften-sommer.html')]={
  'id':'taupunkt','title':'Trocknet Lüften meinen Keller jetzt?',
  'description':'Vergleiche Temperatur und Feuchte drinnen und draußen mit deiner kältesten gemessenen Wand.'}
 sections[('de','/guide/luftentfeuchter-keller.html')]={
  'id':'ablauf-vor-kauf','title':'Kann der Entfeuchterschlauch bergauf verlaufen?',
  'description':'Prüfe den gesamten Schlauchweg, eine für dein Modell geeignete Pumpe oder den Tankbetrieb.'}
 sections[('de','/guide/heizdecke-stromverbrauch.html')]={
  'id':'waerme-rechner','title':'Was kostet meine Heizdecke pro Nutzung?',
  'description':'Beispiel: 110 W × 2 h bei 0,35 €/kWh ergeben 0,22 kWh und rund 0,08 €. Mit deinem Tarif nachrechnen.'}
 sections[('de','/guide/luftfeuchtigkeit-richtig-messen.html')]={
  'id':'hygrometer-vergleichen','title':'Zwei Hygrometer zeigen unterschiedliche Werte',
  'description':'Prüfe zuerst Messort, Temperatur, Angleichzeit und die angegebene Toleranz. Zwei Beispielbereiche im Vergleich.'}
 sections[('de','/guide/delonghi-pac-n90-test.html')]={
  'id':'testlage','title':'De’Longhi PAC N90 ECO Silent: Modell und EAN prüfen',
  'description':'Vergleiche vollständigen Modellnamen und EAN 8004399512351 mit dem konkreten Angebot oder Typenschild.'}
 sections[('de','/guide/trotec-luftentfeuchter-test.html')]={
  'id':'ttk75-pruefpunkt','title':'Trotec TTK 75 ECO: Was ist bei 10 °C im Keller belegt?',
  'description':'20 l/24 h sind bei 30 °C und 80 % dokumentiert. Der Betriebsbereich allein belegt keine Entzugsleistung bei 10 °C.'}
 sections[('de','/produkte.html')]={
  'id':'kaffee-wasserfilter','title':'Welcher Wasserfilter passt zu deinem Kaffeevollautomaten?',
  'description':'EP2220/10 und EP2231/40: AquaClean. TIE20301: TCZ7003 oder TCZ7033. ECAM22.110.B: DLSC002. Modell und Packung prüfen.'}
 sections[('de','/guide/fenster-zugluft-mietwohnung.html')]={
  'id':'dichtungsprofil','title':'Fensterdichtung bei 4 mm: tesamoll E, P oder D?',
  'description':'Bei 4 mm liegen P und D im Herstellerbereich. Miss an mehreren Stellen und kläre eine vorhandene Nut vor dem Kauf.'}
 sections[('de','/guide/midea-portasplit-ausverkauft-alternativen.html')]={
  'id':'fensterfalz','title':'Midea PortaSplit Original: EAN und Fensterfalz prüfen',
  'description':'EAN 4048164116478 abgleichen. Breite und Höhe am Falz für die Standardhalterung messen. Bei unklarer Passung warten.'}
 sections[('de','/guide/klimaanlage-fenster-einbruchschutz.html')]={
  'id':'fenster-verschluss-pruefen','title':'Klimaanlage am Fenster: Schließen und Verriegeln prüfen',
  'description':'Prüfe am konkreten Fenster, ob es mit der Leitung normal verriegelt. Bei unklarem Ergebnis den Kauf zurückstellen.'}
 out=[]
 for path,route,lang,h in public_pages():
  if not h.title.strip():raise ValueError(f'Missing title: {route}')
  desc=' '.join(h.description.split())
  text=path.read_text()
  if 'id="home-fit-config"' in text:
   match=re.search(r'<script id="home-fit-config" type="application/json">(.*?)</script>',text,re.S)
   fit=json.loads(match[1])['text'];desc=' · '.join(fit[k] for k in ['robot','laundry','ac','floor'])+'. '+desc
  extra=aliases.get((lang,route),'')
  if route=='/guide/luftentfeuchter-keller.html':
   extra += ' Abfluss höher als Geräteauslass Kondenswasserpumpe Keller Ablaufschlauch Gefälle Dauerablauf'
  if route=='/produkte.html':
   catalog=json.loads((ROOT/'data/product-catalog.json').read_text())
   extra=' '.join([extra]+[c['name'] for c in catalog['categories']]+[p['name']+' '+p['variant'] for p in catalog['products']])
  entry={'u':route,'t':' '.join(h.title.split()),'d':desc[:320],'l':lang,'a':extra}
  if lang=='de' and route=='/produkte.html':
   model_sections=[
    {'id':'miele-staubsaugerbeutel','title':'Welcher Staubsaugerbeutel passt zu meinem Miele?',
     'description':'GN, FJM, TU und CO anhand der vollständigen Modellreihe prüfen. Vorhandene Beutel für zwei Geräte abgleichen.'},
    {'id':'kaercher-170mm-saugduese','title':'Welche schmale Kärcher-Absaugdüse passt zu meinem WV?',
     'description':'Die 170-mm-Absaugdüse anhand von Gerätevariante, Lieferumfang und Zubehörnummer von der Gummilippe unterscheiden.'},
    {'id':'fenstersauger-duesenbreite','title':'Welche Saugdüse passt zwischen die Sprossen?',
     'description':'Miss die lichte Glasbreite und prüfe den Spielraum für Saugkopf und Gehäuse.'}]
   for section in model_sections:
    anchor=section['id']
    targets=re.findall(r'<h[23]\b[^<>]*\sid="'+anchor+r'"[^<>]*>',text)
    if len(targets)!=1 or re.search(r'\s(?:hidden(?:[ =>])|aria-hidden="true")',targets[0]):
     raise ValueError(f'Missing or hidden search section: {route}#{anchor}')
   entry['model_sections']=model_sections
  if lang=='de' and route=='/ersatzfilter.html':
   items=json.loads((ROOT/'data/filter-finder-de.json').read_text())['items']
   entry['model_sections']=[]
   for item in items:
    identifier=item['id']
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',identifier) or text.count(f' id="quelle-{identifier}"')!=1 or text.count(f' id="{identifier}"')!=1:
     raise ValueError(f'Missing or ambiguous filter model destination: {route}#{identifier}')
    entry['model_sections'].append({'id':identifier,'title':item['brand']+' '+item['models'][0]+': Ersatzfilter prüfen',
                                   'description':item['note']})
  if lang=='de' and route=='/guide/luftbefeuchter-ratgeber.html':
   models=json.loads((ROOT/'data/humidifier-philips-filters-de.json').read_text())['models']
   entry['model_sections']=[
    {'id':'philips-verdunsterfilter','title':'Philips Series 2000: Verdunsterfilter prüfen',
     'description':'Die vollständige HU-Gerätenummer vom Typenschild entscheidet. Eine Serienangabe allein reicht nicht.'}
   ]+[
    {'id':item['anchor'],'title':f"Philips {item['device']}: Originalfilter prüfen",
     'description':'Die deutsche Philips-Zuordnung und die Endung der Filternummer abgleichen.'}
    for item in models
   ]
   for row in entry['model_sections']:
    anchor=row['id']
    targets=re.findall(r'<h[23]\b[^<>]*\sid="'+re.escape(anchor)+r'"[^<>]*>',text)
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',anchor) or len(targets)!=1 or re.search(r'\s(?:hidden(?:[ =>])|aria-hidden="true")',targets[0]):
     raise ValueError(f'Missing or ambiguous Philips filter destination: {route}#{anchor}')
  if lang=='de' and route=='/guide/trotec-luftentfeuchter-test.html':
   anchor='ttk70-hepa-filter'
   targets=re.findall(r'<(?:section|h[23])\b[^<>]*\sid="'+anchor+r'"[^<>]*>',text)
   if len(targets)!=1 or re.search(r'\s(?:hidden(?:[ =>])|aria-hidden="true")',targets[0]):
    raise ValueError(f'Missing or hidden search section: {route}#{anchor}')
   entry['model_sections']=[{'id':anchor,'title':'Welcher HEPA-Ersatzfilter passt zum Trotec TTK 70?',
    'description':'Filterkennung und Bauzeit abgleichen. Widersprüchliche Angaben zur Umstellung ab Dezember 2023 vor dem Kauf klären.'}]
  if lang=='de' and route=='/guide/delonghi-pac-n90-test.html':
   anchor='lautstaerke'
   targets=re.findall(r'<h2\b[^<>]*\sid="lautstaerke"[^<>]*>',text)
   if len(targets)!=1 or re.search(r'\s(?:hidden(?:[ =>])|aria-hidden="true")',targets[0]):
    raise ValueError(f'Missing or hidden search section: {route}#{anchor}')
   entry['model_sections']=[{'id':anchor,'title':'PortaSplit und PAC N90: 39 und 64 dB richtig vergleichen',
    'description':'Midea nennt Schalldruck im Silent-Modus, das N90-Label Schallleistung. Vergleiche Größe und Messbedingungen.'}]
  if section:=sections.get((lang,route)):
   anchor=section['id']
   matches=re.findall(r'<(?:section|h[23])\b[^<>]*\sid="'+re.escape(anchor)+r'"[^<>]*>',text)
   if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',anchor) or len(matches)!=1 or re.search(r'\s(?:hidden(?:[ =>])|aria-hidden="true")',matches[0]):
    raise ValueError(f'Missing or hidden search section: {route}#{anchor}')
   entry['section']=section
  out.append(entry)
 return out

def main():
 entries = collect()
 payload = json.dumps(entries, ensure_ascii=False, separators=(',', ':'))
 # Publish identical bytes for existing clients and for browser search via the
 # Worker-free static asset route.
 for path in (SITE / 'search-index.json', SITE / 'assets' / 'search-index.json'):
  if not path.exists() or path.read_text(encoding='utf-8') != payload:
   path.parent.mkdir(parents=True, exist_ok=True)
   path.write_text(payload, encoding='utf-8')
 print(f'search-index.json: {len(entries)} public canonical pages; search terms stay local')
if __name__=='__main__':main()
