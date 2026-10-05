#!/usr/bin/env python3
"""Enhance existing public pages. No new guide URL or queue consumption.
Run after country/season generators, before hreflang/search/analytics.
"""
import hashlib,html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site'
DATA=json.loads((ROOT/'data/product-decisions.json').read_text())
PAGES={'rechner.html':('de','DE'),'wohnen.html':('de','DE'),'geraete-austausch-rechner.html':('de','DE'),'en/solution-calculator.html':('en','GB'),'fr/calculateur.html':('fr','FR'),'nl/wonen.html':('nl','NL'),'guide/duschen-kosten-rechner.html':('de','DE'),'en/guide/shower-cost-calculator.html':('en','GB')}
ESC=lambda x:html.escape(str(x),quote=True)
ASSETS=['product-decisions.mjs','product-decision-model.mjs','product-decisions.css']
VERSION=hashlib.sha256(''.join((SITE/'assets'/x).read_text() for x in ASSETS).encode()).hexdigest()[:12]
def replace(text,name,body,anchor):
 pattern=rf'\s*<!--{name}-->.*?<!--/{name}-->\s*'
 text=re.sub(pattern,'\n',text,flags=re.S)
 assert anchor in text,anchor
 return text.replace(anchor,f'\n<!--{name}-->{body}<!--/{name}-->\n'+anchor,1)
for path,(lang,market) in PAGES.items():
 p=SITE/path
 if not p.exists():raise RuntimeError(path)
 t=DATA['text'][lang];config={'lang':lang,'market':market,'text':t,'sources':DATA['sources'],'markets':{k:{**v,'note':v['note'][lang]} for k,v in DATA['markets'].items()}}
 methods={'de':'Label: kWh/100 Zyklen ÷ 100 × Jahreszyklen; Jahreslabel unverändert. Gesamtkosten = Kauf + Jahresstrom × Preis × Jahre. Amortisation = positive Mehrinvestition ÷ positive Jahresersparnis. Geschirr: Maschinenstrom × Strompreis + Liter × Wasserpreis/1000; Handwasser zusätzlich mit dem Warmwasserpreis bewerten.','en':'Label: kWh/100 cycles ÷ 100 × yearly cycles; annual labels unchanged. Total = purchase + annual electricity × rate × years. Payback = positive extra investment ÷ positive annual saving. Dishes: machine energy × electricity price + litres × water price/1000; price handwash heating separately.','nl':'Label: kWh/100 cycli ÷ 100 × jaarcycli; jaarlabels blijven gelijk. Totaal = aankoop + jaarstroom × tarief × jaren. Terugverdientijd = positieve extra investering ÷ positieve jaarbesparing. Vaat: machine-energie × stroomprijs + liters × waterprijs/1000; verwarmd handafwaswater apart berekenen.','fr':'Étiquette : kWh/100 cycles ÷ 100 × cycles annuels ; valeur annuelle inchangée. Total = achat + électricité annuelle × tarif × années. Amortissement = surcoût positif ÷ économie annuelle positive. Vaisselle : énergie machine × prix électrique + litres × prix eau/1000 ; chauffage de l’eau à la main calculé séparément.'}
 sources=''.join(f'<li><a href="{ESC(DATA["sources"][k][1])}">{ESC(DATA["sources"][k][0])}</a></li>' for k in ['eu_dryer','eu_dish','nl_dish','uk_label','us_label','ca_label','us_water'])
 categories={'de':['Wärmepumpentrockner: Kapazität, Stellplatz, Abfluss und Programmdauer prüfen.','Kühl- und Gefriergeräte: Nutzvolumen, Belüftungsabstand und Jahres-kWh vergleichen.','Geschirrspüler: gleiche Ladung, Eco-Programm, Wasseranschluss und Einbaumaße prüfen.','Sparduschköpfe: Mindestdurchfluss, Druck, Heizgerät und Freigabe prüfen; kürzer duschen bleibt eine Alternative ohne Kauf.'],'en':['Heat-pump dryers: check capacity, space, drainage and cycle duration.','Fridges and freezers: compare usable volume, ventilation clearance and annual kWh.','Dishwashers: match load size, eco programme, plumbing and installation dimensions.','Low-flow showerheads: check minimum flow, pressure, heater and approval; shorter showers remain a no-purchase option.'],'nl':['Warmtepompdrogers: controleer capaciteit, ruimte, afvoer en programmaduur.','Koelkasten en vriezers: vergelijk bruikbaar volume, ventilatieruimte en jaarlijkse kWh.','Vaatwassers: controleer gelijke lading, eco-programma, wateraansluiting en inbouwmaten.','Waterbesparende douchekoppen: controleer minimumdebiet, druk, verwarming en goedkeuring; korter douchen kan zonder aankoop.'],'fr':['Sèche-linge à pompe à chaleur : vérifiez capacité, place, évacuation et durée des cycles.','Réfrigérateurs et congélateurs : comparez volume utile, ventilation et kWh annuels.','Lave-vaisselle : comparez charge, programme éco, raccordements et dimensions.','Pommeaux économes : vérifiez débit minimal, pression, chauffe-eau et compatibilité ; raccourcir les douches reste possible sans achat.']}
 content=f'<section id="product-decisions" aria-labelledby="pd-heading"><h2 id="pd-heading">{ESC(t["title"])}</h2><p>{ESC(t["intro"])}</p><div data-pd-mount></div><noscript><p>{ESC(t["example"])}</p></noscript><details class="pd-method"><summary>{ESC(t["method"])}</summary><p>{ESC(methods[lang])}</p><p>{ESC(t["labelLimit"])}</p><p>{ESC(t["dishLimit"])}</p><p>{ESC(t["showerLimit"])}</p></details><h3>{ESC(t["next"])}</h3><ul>'+''.join(f'<li>{ESC(c)}</li>' for c in categories[lang])+f'</ul><h3>{ESC(t["sources"])}</h3><ul>{sources}</ul></section>'
 content+='<script id="product-decision-config" type="application/json">'+json.dumps(config,ensure_ascii=False).replace('<','\\u003c')+'</script>'
 content+=f'<link rel="stylesheet" href="/assets/product-decisions.css?v={VERSION}"><script type="module" src="/assets/product-decisions.mjs?v={VERSION}"></script>'
 text=p.read_text();text=replace(text,'EB_PRODUCT_DECISIONS',content,'</article>' if '</article>' in text else '</main>')
 text=re.sub(r'\s*<!--EB_PRODUCT_ENTRY-->.*?<!--/EB_PRODUCT_ENTRY-->\s*','\n',text,flags=re.S)
 text=text.replace('</h1>','</h1>\n<!--EB_PRODUCT_ENTRY--><p><a href="#product-decisions">'+ESC(t['title'])+'</a></p><!--/EB_PRODUCT_ENTRY-->\n',1)
 p.write_text(text)
 # Extend existing LLM-readable mirrors without inventing a translated URL.
 md=p.with_suffix('.md')
 if md.exists():
  m=re.sub(r'\n<!--EB_PRODUCT_DECISIONS_MD-->.*?<!--/EB_PRODUCT_DECISIONS_MD-->\n?','\n',md.read_text(),flags=re.S)
  m=m.rstrip()+'\n<!--EB_PRODUCT_DECISIONS_MD-->\n## '+t['title']+'\n\n'+t['intro']+'\n\n'+methods[lang]+'\n\n'+t['labelLimit']+'\n\n'+t['dishLimit']+'\n\n'+t['showerLimit']+'\n\n'+ '\n'.join('- '+c for c in categories[lang])+'\n\n'+t['sources']+'\n'+ '\n'.join(f'- [{DATA["sources"][k][0]}]({DATA["sources"][k][1]})' for k in DATA['markets'][market]['sources'])+'\n<!--/EB_PRODUCT_DECISIONS_MD-->\n';md.write_text(m)
# Owned discovery channels; no separate landing pages competing with current tools.
for path,lang,target in [('index.html','de','/rechner.html'),('en/index.html','en','/en/solution-calculator.html'),('fr/index.html','fr','/fr/calculateur.html'),('tools.html','de','/rechner.html'),('kategorie/energie-sparen.html','de','/rechner.html'),('wohnkosten-werkstatt.html','de','/geraete-austausch-rechner.html')]:
 p=SITE/path
 if not p.exists():continue
 t=DATA['text'][lang]
 block=f'<aside style="max-width:960px;margin:24px auto;padding:20px;border-left:5px solid #0a4d7a;background:#edf5f8;color:#183b4b"><h2><a href="{target}#product-decisions">{ESC(t["title"])}</a></h2><p>{ESC(t["label"])} · {ESC(t["dish"])} · {ESC(t["shower"])}</p><p>{ESC(t["intro"])}</p></aside>'
 p.write_text(replace(p.read_text(),'EB_PRODUCT_DISCOVERY',block,'</main>' if '</main>' in p.read_text() else '</body>'))
print(f'Product decision modules: {len(PAGES)} existing URLs, 4 languages, 8 markets; no queue writes.')
