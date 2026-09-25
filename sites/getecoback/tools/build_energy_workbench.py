#!/usr/bin/env python3
"""Build localized static tariff workbenches from one model and copy contract."""
from pathlib import Path
import json,html,hashlib,subprocess,re
from eco_brand import build_styles, render as render_chrome
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site';BASE='https://getecoback.com'
COPY=json.loads((ROOT/'data/energy-workbench.json').read_text())
assert all(set(t)==set(COPY['en']) for t in COPY.values())
SOURCES=[('DE · Verbraucherzentrale','https://www.verbraucherzentrale.de/wissen/energie/preise-tarife-anbieterwechsel/was-sie-bei-bonustarifen-fuer-strom-und-gas-beachten-sollten-6435'),('FR · Médiateur national de l’énergie','https://www.energie-info.fr/fiche_pratique/comment-comparer-les-offres-delectricite-et-de-gaz-naturel/'),('FR · Heures creuses','https://www.energie-info.fr/fiche_pratique/bien-utiliser-les-heures-creuses/'),('ES · CNMC','https://www.cnmc.es/prensa/entiende-tu-factura-20231002'),('IT · ARERA / Portale Offerte','https://www.arera.it/consumatori/il-portale-offerte')]
esc=lambda x:html.escape(str(x),quote=True)
model=SITE/'assets/energy-tariff-model.mjs';ui=SITE/'assets/energy-workbench.mjs'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()[:12]
build_styles()
ui.write_text(re.sub(r'./energy-tariff-model.mjs(?:\?v=[a-f0-9]+)?','./energy-tariff-model.mjs?v='+h(model),ui.read_text()))
examples=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {example} from './site/assets/energy-tariff-model.mjs'; console.log(JSON.stringify(Object.fromEntries(['de','fr','es','it'].map(m=>[m,example(m)]))))"],cwd=ROOT))
for lang,t in COPY.items():
 nav,footer,chrome=render_chrome(lang)
 assert 120<=len(t['meta'])<=155,(lang,len(t['meta']))
 market='de' if lang=='en' else lang;s=examples[market]
 def num(name,label,value,maxv=10000000):return f'<label>{esc(label)}<input type="number" name="{name}" value="{value}" min="0" max="{maxv}" step="any" required inputmode="decimal"></label>'
 def select(name,items):return '<select name="'+name+'">'+''.join(f'<option value="{v}">{esc(label)}</option>' for v,label in items)+'</select>'
 def file_picker(id,title,accept):
  return f'<div class="file-control"><span class="file-label" id="{id}-title">{esc(title)}</span><label class="file-picker" for="{id}"><span id="{id}-choose">{esc(t["chooseFile"])}</span><input type="file" id="{id}" accept="{accept}" aria-labelledby="{id}-title {id}-choose" aria-describedby="{id}-status"></label><span class="file-status" id="{id}-status" role="status" aria-live="polite">{esc(t["noFile"])}</span></div>'
 offers=[]
 for key in ('A','B'):
  o=s[key]
  rates=''.join(f'<div data-rate="{key}{i}">'+num(f'{key}rate{i}',t['rate']+f' · {i+1}',o['rates'][i] if i<len(o['rates']) else 0,100)+'</div>' for i in range(3))
  powers=''.join(f'<div data-power="{i}">'+num(f'{key}kw{i}',t['power']+f' · {i+1}',o['powerKW'][i] if i<len(o['powerKW']) else 0,1000)+num(f'{key}power{i}',t['powerRate']+f' · {i+1}',o['powerRates'][i] if i<len(o['powerRates']) else 0,100000)+'</div>' for i in range(2))
  offers.append(f'<fieldset><legend>{esc(t["offer"+key])}</legend><label>{esc(t["mode"])}{select(key+"mode",[("flat",t["flat"]),("period",t["period"])])}</label>{rates}{num(key+"fixed",t["fixed"],o["fixed"])}{powers}{num(key+"bonus",t["bonus"],o["bonus"])}</fieldset>')
 fields=''.join(f'<div data-band="{i}">'+num('kwh'+str(i),f'kWh · {i+1}',s['kwh'][i] if i<len(s['kwh']) else 0,1000000)+'</div>' for i in range(3))
 language_names={'de':'Deutsch','en':'English','fr':'Français','es':'Español','it':'Italiano'}
 langnav=''.join(f'<a href="/{v["path"]}" lang="{k}" hreflang="{k}" aria-label="{language_names[k]}"'+(' aria-current="page"' if lang==k else '')+f'>{k.upper()}</a>' for k,v in COPY.items())
 alternates='\n'.join(f'<link rel="alternate" hreflang="{k}" href="{BASE}/{v["path"]}">' for k,v in COPY.items())
 url=BASE+'/'+t['path'];schema={'@context':'https://schema.org','@type':'WebApplication','name':t['title'],'url':url,'applicationCategory':'UtilitiesApplication','operatingSystem':'Web browser','inLanguage':lang,'isAccessibleForFree':True,'dateModified':'2026-09-25','description':t['meta']}
 document=f'''<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(t['title'])} | EcoBack</title>
<meta name="description" content="{esc(t['meta'])}"><link rel="canonical" href="{url}">{alternates}<link rel="alternate" hreflang="x-default" href="{BASE}/{COPY['en']['path']}"><link rel="alternate" type="text/markdown" href="/{t['path'].replace('.html','.md')}">
<meta property="og:title" content="{esc(t['title'])}"><meta property="og:description" content="{esc(t['meta'])}"><meta property="og:type" content="website"><meta property="og:url" content="{url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/eco-chrome.css?v={h(SITE/'assets/eco-chrome.css')}"><link rel="stylesheet" href="/assets/energy-workbench.css?v={h(SITE/'assets/energy-workbench.css')}"><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script></head>
<body data-energy-workbench="{lang}">{nav}<header class="hero"><div class="wrap"><div class="hero-bar"><div class="hero-path"><a href="{esc(chrome['homePath'])}">{esc(chrome['home'])}</a><span aria-hidden="true"> / </span><a href="/tools.html" hreflang="de">{esc(chrome['allTools'])}</a></div><nav class="language-switch" aria-label="{esc(chrome['languages'])}">{langnav}</nav></div><h1>{esc(t['title'])}</h1><p class="lead">{esc(t['intro'])}</p><p class="example-note">{esc(t['exampleNote'])}</p></div></header>
<main id="main" tabindex="-1">
<noscript><p>{esc(t['noScript'])}</p></noscript><form id="tariff-form"><section class="panel"><h2>01 · {esc(t['consumption'])}</h2><div class="setup"><label>{esc(t['market'])}{select('market',[("de","Deutschland · EUR"),("fr","France · EUR"),("es","España · EUR"),("it","Italia · EUR")])}</label><fieldset class="purpose"><legend>{esc(t['purpose'])}</legend><label><input type="radio" name="purpose" value="example" checked> {esc(t['sample'])}</label><label><input type="radio" name="purpose" value="own"> {esc(t['own'])}</label></fieldset></div><p id="band-labels"></p><div class="bands">{fields}</div><button type="button" id="reset" class="quiet">{esc(t['reset'])}</button></section>
<section class="panel"><h2>02 · A / B</h2><p>{esc(t['dataHelp'])}</p><div class="offers">{''.join(offers)}</div>{num('switchCost',t['switchCost'],0)}<details id="options"><summary>{esc(t['shiftTitle'])} / {esc(t['stressTitle'])}</summary><div id="shift-field">{num('shift',t['shift'],s['shift'],1000000)}</div>{num('stress',t['stress'],20,90)}</details><label class="confirm"><input type="checkbox" name="confirm" required> {esc(t['confirm'])}</label><button type="submit" class="primary">{esc(t['run'])} →</button><p id="status" role="status" aria-live="polite"></p></section></form>
<section id="results" class="panel result" hidden tabindex="-1" aria-labelledby="results-heading"><h2 id="results-heading">03 · {esc(t['results'])}</h2><p id="input-source"></p><div class="metrics"><div><span>{esc(t['saving'])} · {esc(t['first'])}</span><strong id="first-saving"></strong></div><div><span>{esc(t['saving'])} · {esc(t['recurring'])}</span><strong id="recurring-saving"></strong></div><div><span>{esc(t['twoYear'])}</span><strong id="two-saving"></strong></div></div><p>{esc(t['positive'])}</p><p id="bonus-trap" class="notice" hidden>{esc(t['trap'])}</p><div class="table-wrap"><table><caption>{esc(t['ledger'])}</caption><thead><tr><th scope="col">€ / {esc(t['year'])}</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody id="ledger"></tbody></table></div><div id="scenarios"></div><div class="actions"><button id="save">{esc(t['save'])}</button><button id="export">{esc(t['export'])}</button><button id="share">{esc(t['share'])}</button><button id="print">{esc(t['print'])}</button></div><label id="share-box" hidden>{esc(t['copy'])}<input id="share-url" readonly type="text"></label></section>
<section class="panel data-panel"><h2>{esc(t['saved'])}</h2><div id="saved"></div><p id="storage-status" role="status"></p><div class="file-actions">{file_picker('import-file',t['import'],'.json,application/json')}{file_picker('csv-file',t['csv'],'.csv,text/csv')}<button id="template">{esc(t['template'])}</button></div><p>{esc(t['csvHelp'])}</p></section>
<section class="notes"><h2>{esc(t['method'])}</h2><p>{esc(t['methodText'])}</p><h2>{esc(t['limits'])}</h2><p>{esc(t['limitsText'])}</p><h2>{esc(t['privacy'])}</h2><p>{esc(t['privacyText'])}</p><h2>{esc(t['sources'])}</h2><ul>{''.join(f'<li><a href="{link}">{esc(name)}</a></li>' for name,link in SOURCES)}</ul><p>2026-09-25 · EcoBack</p></section></main>{footer}
<script id="energy-copy" type="application/json">{json.dumps(t,ensure_ascii=False).replace('<','\\u003c')}</script><script id="eco-chrome-copy" type="application/json">{json.dumps({k:v for k,v in chrome.items() if k.startswith('search')},ensure_ascii=False).replace('<','\\u003c')}</script><script type="module" src="/assets/eco-chrome.mjs?v={h(SITE/'assets/eco-chrome.mjs')}"></script><script type="module" src="/assets/energy-workbench.mjs?v={h(ui)}"></script></body></html>'''
 p=SITE/t['path'];p.parent.mkdir(exist_ok=True);p.write_text(document)
 p.with_suffix('.md').write_text('# '+t['title']+'\n\n'+t['intro']+'\n\n'+url+'\n\n'+t['exampleNote']+'\n\n## '+t['method']+'\n\n'+t['methodText']+'\n\n## '+t['limits']+'\n\n'+t['limitsText']+'\n\n## '+t['sources']+'\n\n'+'\n'.join(f'- [{name}]({link})' for name,link in SOURCES)+'\n')
print('Built 5 localized electricity workbenches and Markdown companions.')
