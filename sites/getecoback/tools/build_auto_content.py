#!/usr/bin/env python3
"""Deterministic manufacturer-specification decision pages; no network calls.

Only the evidence-controlled auto-content manifest creates these pages. Collected
text is data, never template code. Publication dates come from the manifest.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import html
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
MARKER = '<!--EB_AUTO_CONTENT-->'
ALIASES = {'tank_capacity_l':'tank_l','noise_db_a':'noise_db','temperature_min_c':'operating_temperature_min_c','temperature_max_c':'operating_temperature_max_c','operating_temperature_range_c':'temperature_range_c'}
HOSTS = {'de.trotec.com','www.meaco.com'}

def esc(value): return html.escape(str(value), quote=True)
def number(value):
    if isinstance(value, bool): return None
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError,ValueError): return None

def fmt(value, de=False, digits=2):
    text=f'{float(value):.{digits}f}'
    return text.replace('.', ',') if de else text

def money(value, de=False): return fmt(value,de) + ' €' if de else '£'+fmt(value)
def neat(value):
    n=number(value)
    return f'{n:g}' if n is not None else str(value)

def safe_url(url):
    if not isinstance(url,str) or re.search(r'[\x00-\x20\\]',url): raise ValueError('Invalid source URL')
    u=urlsplit(url)
    if u.scheme!='https' or u.hostname not in HOSTS or u.username or u.password or u.port is not None or u.query or u.fragment: raise ValueError('Manufacturer source URL required')
    return url

def valid_path(path, country):
    prefix='/guide/' if country=='DE' else '/en/guide/'
    suffix='-betriebskosten.html' if country=='DE' else '-running-cost.html'
    if not isinstance(path,str) or not re.fullmatch(re.escape(prefix)+r'[a-z0-9]+(?:-[a-z0-9]+)*'+re.escape(suffix),path): raise ValueError('Invalid controlled page path')
    return path

def date_value(value):
    if not isinstance(value,str): raise ValueError('Manifest date required')
    parsed=datetime.fromisoformat(value.replace('Z','+00:00'))
    return parsed.date().isoformat()

def fit_metadata(name, suffix, maximum):
    # Keep full identity in H1/body; metadata has the site's actual encoded limit.
    if len(esc(name+suffix))<=maximum: return name+suffix
    shortened=name
    while shortened and len(esc(shortened+'…'+suffix))>maximum: shortened=shortened[:-1]
    if ' ' in shortened and shortened.rfind(' ')>len(shortened)//2: shortened=shortened.rsplit(' ',1)[0]
    return shortened.rstrip()+'…'+suffix

def fact_map(product):
    result={}
    for fact in product.get('facts',[]):
        key=ALIASES.get(fact.get('key'),fact.get('key'))
        if not isinstance(key,str) or not re.fullmatch(r'[a-z][a-z0-9_]{1,60}',key): raise ValueError('Invalid fact key')
        if key in result: raise ValueError('Duplicate fact key')
        if isinstance(fact.get('value'),(dict,list)) or fact.get('value') is None: raise ValueError('Scalar facts required')
        if isinstance(fact['value'],(int,float)) and not isinstance(fact['value'],bool) and not math.isfinite(fact['value']): raise ValueError('Finite facts required')
        result[key]={**fact,'key':key}
    return result

def fact_text(facts,key):
    f=facts.get(key)
    if not f: return None
    value=neat(f.get('value'))
    if f.get('unit'): value+=' '+str(f['unit'])
    if f.get('context'): value+=' ('+str(f['context'])+')'
    return value

def render_page(product, page_path, published, modified):
    country=product.get('country'); de=country=='DE'
    if country not in ('DE','GB') or product.get('language')!=('de' if de else 'en-GB'): raise ValueError('Country/language mismatch')
    if product.get('market',{}).get('currency')!=('EUR' if de else 'GBP'): raise ValueError('Country/currency mismatch')
    valid_path(page_path,country)
    power=number(product.get('power_watts'))
    if power is None or not 0<power<=10000: raise ValueError('Finite positive manufacturer power required')
    sources=list(dict.fromkeys(safe_url(s) for s in product.get('source_urls',[])))
    product_url=safe_url(product.get('product_url'))
    if product_url not in sources: sources.insert(0,product_url)
    pub=date_value(published); mod=date_value(modified); checked=date_value(product.get('checked_at'))
    if not pub<=mod<=datetime.now(timezone.utc).date().isoformat() or checked>mod: raise ValueError('Invalid publication or source chronology')
    facts=fact_map(product)
    categories={('temperature' if key in ('operating_temperature_min_c','operating_temperature_max_c','temperature_range_c') else key) for key in facts if key in {'power_watts','extraction_l_per_day','tank_l','noise_db','operating_temperature_min_c','operating_temperature_max_c','temperature_range_c','dimensions_mm','weight_kg'}}
    if len(categories)<4: raise ValueError('At least four independent specification categories required')
    country_hosts={'de.trotec.com'} if de else {'www.meaco.com'}
    if any(urlsplit(url).hostname not in country_hosts for url in sources): raise ValueError('Manufacturer source/country mismatch')
    if 'power_watts' in facts and number(facts['power_watts']['value'])!=power: raise ValueError('Conflicting power fact')
    name=str(product.get('name','')).strip()
    if not name or len(name)>180: raise ValueError('Product name required')
    model=str(product.get('model') or name)
    title=(f'{model}: Stromkosten und Tank richtig einschätzen' if de else f'{model}: running cost and tank planning')
    meta_title=fit_metadata(model, ': Stromkosten und Tank' if de else ': running cost and tank',70)
    description=fit_metadata(model, ': Stromkosten rechnen und Tank oder Ablauf planen. Herstellerwerte, Prüfbedingungen und Grenzen; kein eigener Produkttest.' if de else ': compare electricity scenarios and plan tank emptying. Manufacturer figures, test conditions and limits; not a product test.',165)
    canonical='https://getecoback.com'+page_path
    currency='EUR' if de else 'GBP'
    power_text=neat(power)+' W'
    power_context=str(facts.get('power_watts',{}).get('context') or ('Herstellerangabe; keine Messung im Haushalt.' if de else 'Manufacturer figure; not a measurement in your home.'))
    extraction=fact_text(facts,'extraction_l_per_day')
    tank=fact_text(facts,'tank_l')
    noise=fact_text(facts,'noise_db')
    temp_min=fact_text(facts,'operating_temperature_min_c'); temp_max=fact_text(facts,'operating_temperature_max_c')
    temp_range=fact_text(facts,'temperature_range_c') or ((temp_min or '?')+' – '+(temp_max or '?') if temp_min or temp_max else None)
    drainage=facts.get('continuous_drainage',{}).get('value')
    drain_yes=drainage is True or (isinstance(drainage,str) and drainage.lower() in ('yes','ja','true','available','supported'))
    shutoff=fact_text(facts,'auto_shutoff')
    plug=product.get('market',{}).get('plug') or fact_text(facts,'plug')
    kwh=power/1000*8; day=kwh*.35; month=day*30
    positive=[]; stop=[]
    if de:
        lead=f'Die Herstellerangabe von {power_text} ergibt bei acht Stunden mit konstant dieser Leistungsaufnahme {fmt(kwh,True)} kWh. Bei der frei gewählten Beispielannahme von 0,35 €/kWh sind das {money(day,True)} pro Tag. Das ist ein Rechenfall, keine Messung und kein Versprechen für deinen Raum.'
        limit=f'Die Rechnung setzt voraus, dass das Gerät die ganze gewählte Zeit {power_text} aufnimmt. Diese Herstellerangabe ist weder die gemessene mittlere Leistung bei dir zu Hause noch eine garantierte Obergrenze für alle Betriebsarten. Hygrostat, Abtauung, Lüfterstufe und Umgebung können den Betrieb verändern. {power_context}'
        extraction_text=(f'Der Hersteller nennt {extraction}. Diese Angabe gehört zu den genannten Prüfbedingungen. Ein Wert unter warmen, feuchten Bedingungen lässt sich nicht auf einen kühlen Keller übertragen.' if extraction else 'In den freigegebenen Quelldaten fehlt eine eindeutig zugeordnete Tages-Entfeuchtungsleistung mit Prüfbedingungen. Hier wird deshalb keine Literleistung ergänzt oder aus dem Modellnamen abgeleitet.')
        extraction_text+=' Aus einem Tages-Laborwert werden hier weder Liter pro acht Stunden noch eine garantierte Trocknungsdauer berechnet. Vergleiche Geräte möglichst bei gleichen Temperatur- und Feuchtebedingungen; Raumgröße allein reicht nicht.'
        temperature_text=(f'Erfasster Betriebsbereich: {temp_range}. Vergleiche die Temperatur am tatsächlichen Aufstellort damit. Ein zugelassener Betriebsbereich belegt noch keine gleichbleibende Literleistung über den ganzen Bereich.' if temp_range else 'Ein belastbarer Betriebs-Temperaturbereich fehlt in den erfassten Angaben. Prüfe ihn in der vollständigen Anleitung, bevor du das Gerät in einem kalten Keller, einer Garage oder einem unbeheizten Raum einsetzt.')
        tank_text=(f'Der erfasste Tankwert lautet {tank}. Er beschreibt die Behältergröße, nicht die Zeit bis zur nächsten Entleerung.' if tank else 'Die nutzbare Tankgröße ist in diesen erfassten Angaben nicht eindeutig belegt. Sie wird deshalb nicht geschätzt.')
        tank_text+=' Tankvolumen und Labor-Entfeuchtung werden nicht zu einem tatsächlichen Entleerungsintervall verrechnet: Luftfeuchte, Temperatur, Zielwert und Abschaltpunkt fehlen dafür. Plane zunächst regelmäßige Kontrollen und beobachte den Füllstand vor Ort.'
        drainage_text=('Ein kontinuierlicher Ablauf ist in den erfassten Herstellerdaten genannt. Prüfe in der Anleitung den konkreten Anschluss, Schlauch, Höhenverlauf und die erlaubte Aufstellung. Ein genannter Ablauf beweist keine eingebaute Pumpe und garantiert keinen zulässigen unbeaufsichtigten Betrieb.' if drain_yes else 'Ein kontinuierlicher Ablauf ist in diesen erfassten Angaben nicht positiv bestätigt. Wenn Entleeren nicht praktikabel ist, zuerst Anleitung und Anschluss prüfen; kein Schlauch- oder Pumpenbetrieb auf Verdacht.')
        drainage_text+=(' Erfasste Abschaltfunktion: '+shutoff+'. Die genaue Auslösung und sichere Nutzung bleiben an die Modellanleitung gebunden.' if shutoff else 'Eine Tank-Voll-Abschaltung ist hier nicht ausreichend dokumentiert; vor dem Einsatz in der Anleitung verifizieren.')
        noise_text=(f'Der Hersteller nennt {noise}. Messabstand, Betriebsart und Lüfterstufe gehören zum Vergleich. Fehlen diese Angaben, ist der Zahlenwert kein belastbarer Vergleich mit einem anders gemessenen Gerät.' if noise else 'Ein zuordenbarer Geräuschwert samt Messbedingungen fehlt in den erfassten Angaben. Ein „leise“-Versprechen lässt sich daraus nicht ableiten.')
        noise_text+=' Das Geräusch am Bett oder Arbeitsplatz hängt zusätzlich von Abstand, Raum und Körperschall ab. Vor einem Kauf das Rückgaberecht prüfen; eine Dezibelangabe garantiert keinen ungestörten Schlaf.'
        positive=[f'Der Aufstellort liegt im dokumentierten Betriebsbereich ({temp_range}).' if temp_range else 'Du hast die Temperaturfreigabe für den konkreten Aufstellort in der Anleitung bestätigt.',f'Du kannst den Tank ({tank}) kontrollieren und entleeren; bei Schlauchbetrieb ist der korrekte Ablauf bestätigt.' if tank else 'Du hast Tankgröße, sichere Abschaltung und praktikables Entleeren vorab geprüft.',f'Du akzeptierst den Kostenfall von {money(day,True)} pro Tag bei 8 h und 0,35 €/kWh und kontrollierst die reale Aufnahme mit einem geeigneten Strommessgerät.']
        stop=['Nicht allein nach der Modellzahl oder einem warmen Labor-Literwert für einen kalten Raum auswählen.','Nicht für unbeaufsichtigten Betrieb einplanen, solange Ablauf, Abschaltung und Anleitung ungeklärt sind.','Nicht kaufen, wenn nur eine garantierte Ersparnis oder ein versprochenes Geräuschniveau im eigenen Zimmer die Entscheidung trägt; beides ist hier nicht nachgewiesen.']
        faq=[('Sind die berechneten Stromkosten eine Vorhersage?',limit),('Wie oft muss der Tank geleert werden?',tank_text),('Ist das ein Test oder eine Kaufempfehlung?','Nein. EcoBack ordnet öffentlich zugängliche Herstellerdaten ein. Das Gerät wurde nicht von EcoBack getestet. Es gibt hier weder eine bestätigte Bestseller-Platzierung noch einen aktuellen Preis, eine Lieferzusage oder einen Partner-Kauflink.')]
        related=[('/guide/luftentfeuchter-dauerbetrieb-stromkosten.html','Stromverbrauch von Luftentfeuchtern einordnen'),('/tools.html','Weitere Rechner und Entscheidungshilfen')]
        labels={'back':'EcoBack · Deutschland','h1':title,'updated':'Inhaltlich aktualisiert','published':'Veröffentlicht','source_date':'Herstellerdaten erfasst','tool':'Stromkosten für dein Nutzungsszenario','tool_intro':'Zwei Auswahlen genügen. Die Beispielrechnung verwendet keine automatisch ermittelten Tarif- oder Nutzungsdaten.','hours':'1 · Laufzeit pro Tag','rate':'2 · angenommener Strompreis','drain':'Optional · Wasser abführen','unknown':'Noch offen','tank':'Tank entleeren','hose':'Schlauch / Ablauf prüfen','button':'Szenario berechnen','example':'Beispiel: 8 h · 0,35 €/kWh','static':'Beispielwerte ohne JavaScript','table_note':'Nur Beispiel: konstant Herstellerleistung und 0,35 €/kWh; 30 Tage mit gleicher Laufzeit. Kein aktueller Tarif und keine Prognose.','hours_col':'pro Tag','energy_col':'Energie/Tag','daily_col':'Kosten/Tag','month_col':'30 Tage','formula':'Formel: Watt ÷ 1000 × Stunden × Preis pro kWh = Kosten.','power':'Was der Leistungswert bedeutet','moisture':'Literleistung und Raumtemperatur zusammen lesen','water':'Tank und Ablauf: Aufwand vor dem Kauf prüfen','noise':'Geräuschwerte fair vergleichen','fit':'Drei Bedingungen für die engere Auswahl','avoid':'Wann du noch nicht kaufen solltest','specs':'Nachvollziehbare Herstellerangaben','fact':'Angabe','value':'Wert','context':'Prüfbedingung / Einordnung','sources':'Quellen und Grenzen','next':'Nächster sinnvoller Schritt','faq':'Häufige Fragen','copy':'Ergebnis freiwillig kopieren','copy_label':'Ergebnis zum manuellen Kopieren','privacy':'Deine Auswahl bleibt im Browser. Es werden keine Laufzeit-, Tarif- oder Modellantworten übertragen. Kein Konto nötig. Teilen kopiert Text; es veröffentlicht nichts automatisch.','nojs':'Auch ohne JavaScript stehen Rechenbeispiele, Auswahlkriterien, Herstellerquellen und Grenzen vollständig auf dieser Seite.','disclosure':'Transparenz: Dies ist eine Einordnung von Herstellerdaten, kein eigener Produkttest, kein Bestseller-Nachweis und keine aktuelle Preis- oder Verfügbarkeitsauskunft. Diese Seite enthält keine Partner-Kauflinks. EcoBack finanziert sich an anderer Stelle über gekennzeichnete Partnerlinks.','plug':f'Erfasste Steckerausführung: {plug}. Lieferung und konkrete Landesvariante vor Bestellung beim Händler bestätigen.' if plug else 'Eine konkrete Steckerausführung oder Lieferberechtigung ist hier nicht verifiziert. Landesvariante, Netzanschluss und Lieferung vor Bestellung beim Händler bestätigen.'}
    else:
        lead=f'At the manufacturer’s stated {power_text}, eight hours at a constant draw would use {fmt(kwh)} kWh. With the chosen example assumption of £0.35/kWh, that is {money(day)} a day. This is a calculation scenario, not a home measurement or a promise for your room.'
        limit=f'The calculation assumes a constant {power_text} for every selected hour. This manufacturer figure is neither your measured average consumption nor a guaranteed ceiling for every operating mode. Humidistat cycling, defrosting, fan speed and conditions can change operation. {power_context}'
        extraction_text=(f'The manufacturer lists {extraction}. That figure belongs to the stated test conditions. A result measured in warm, humid air cannot be transferred directly to a cold utility room.' if extraction else 'The captured sources do not provide an unambiguous daily extraction figure with its test conditions. No litres figure is invented or inferred from the model name here.')
        extraction_text+=' We do not turn laboratory litres per day into a promise for eight hours or a laundry-drying time. Compare products at matching temperature and relative humidity wherever possible; floor area alone is insufficient.'
        temperature_text=(f'Captured operating range: {temp_range}. Compare it with the actual temperature where the unit will stand. Permission to operate within a range does not mean constant extraction throughout that range.' if temp_range else 'A reliable operating-temperature range is missing from the captured information. Check the full manual before choosing this unit for a cold utility room, garage or unheated space.')
        tank_text=(f'The captured tank specification is {tank}. This describes container size, not the time between emptying.' if tank else 'The captured evidence does not establish usable tank size. No capacity is guessed here.')
        tank_text+=' Tank volume divided by laboratory extraction is not a reliable emptying interval: humidity, temperature, target setting and the cut-off level are unknown. Start with regular checks and observe the actual fill level.'
        drainage_text=('Continuous drainage is identified in the captured manufacturer information. Check the exact connector, hose, fall and permitted placement in the manual. A drain connection does not prove a built-in pump or permission to leave the unit unattended.' if drain_yes else 'Continuous drainage is not positively confirmed in the captured information. If emptying a tank is impractical, verify the manual and connection before relying on a hose or pump.')
        drainage_text+=(' Captured shut-off information: '+shutoff+'. The exact trigger and permitted use remain subject to the model manual.' if shutoff else 'A full-tank shut-off is not sufficiently documented here; verify it in the manual before use.')
        noise_text=(f'The manufacturer lists {noise}. Measurement distance, operating mode and fan speed are part of the comparison. If they are absent, the number cannot support a like-for-like comparison with differently measured products.' if noise else 'An attributable noise figure with measurement conditions is missing from the captured information. That does not support a quiet-operation claim.')
        noise_text+=' Sound at a bed or desk also depends on distance, the room and vibration. Check the return terms before buying; a decibel figure does not guarantee undisturbed sleep.'
        positive=[f'The intended room is within the documented operating range ({temp_range}).' if temp_range else 'You have confirmed the model’s permitted temperatures for the intended room in the manual.',f'You can check and empty the tank ({tank}), or have verified the exact drain arrangement.' if tank else 'You have checked tank size, shut-off and a practical emptying routine.',f'You accept the illustrative {money(day)} a day at 8 h and £0.35/kWh, and will check real consumption with a suitable plug-in energy monitor.']
        stop=['Do not choose a unit for a cold room solely from its model number or a warm laboratory extraction figure.','Do not plan unattended running until drainage, shut-off and the manual’s conditions are clear.','Do not buy solely on a guaranteed saving or bedroom noise promise: neither is established by this page.']
        faq=[('Are these running costs a prediction?',limit),('How often will I empty the tank?',tank_text),('Is this a product test or a buying recommendation?','No. EcoBack interprets public manufacturer specifications and has not tested this product. No verified bestseller rank, current price, delivery promise or affiliate purchase link is included here.')]
        related=[('/en/guide/12l-vs-20l-dehumidifier-uk.html','Compare UK dehumidifier capacity and filter care'),('/en/guide/dehumidifier-drying-clothes-cost.html','Compare laundry-drying costs'),('/en/index.html','More UK household decision tools')]
        labels={'back':'EcoBack · United Kingdom','h1':title,'updated':'Content updated','published':'Published','source_date':'Manufacturer information captured','tool':'Electricity costs for your scenario','tool_intro':'Choose two presets. Example tariffs and run times are not automatically obtained from your household.','hours':'1 · Running hours per day','rate':'2 · assumed electricity price','drain':'Optional · water collection','unknown':'Not decided','tank':'Empty the tank','hose':'Check a hose / drain','button':'Calculate scenario','example':'Example: 8 h · £0.35/kWh','static':'Examples available without JavaScript','table_note':'Example only: constant manufacturer power and £0.35/kWh; 30 days at the same daily run time. Not a current tariff or forecast.','hours_col':'per day','energy_col':'Energy/day','daily_col':'Cost/day','month_col':'30 days','formula':'Formula: watts ÷ 1000 × hours × price per kWh = cost.','power':'What the power figure means','moisture':'Read extraction and room temperature together','water':'Tank or drain: plan the work before buying','noise':'Compare noise figures fairly','fit':'Three conditions for a shortlist','avoid':'When to pause the purchase','specs':'Traceable manufacturer specifications','fact':'Specification','value':'Value','context':'Test conditions / context','sources':'Sources and limitations','next':'A useful next step','faq':'Common questions','copy':'Copy the result to share voluntarily','copy_label':'Result for manual copying','privacy':'Your choices stay in this browser. No run-time, tariff or model answers are transmitted. No account required. Sharing copies text; it does not post anything automatically.','nojs':'Without JavaScript, this page still includes worked examples, selection criteria, manufacturer sources and limitations.','disclosure':'Transparency: this page interprets manufacturer specifications. It is not an EcoBack product test, a bestseller claim or a current price or stock report. It contains no affiliate purchase links. EcoBack is funded partly through labelled affiliate links elsewhere.','plug':f'Captured plug specification: {plug}. Confirm the exact UK variant and delivery with the seller before ordering.' if plug else 'A UK plug and delivery eligibility are not verified here. An English page or GBP calculation does not establish either; confirm the exact UK variant, mains connection and delivery before ordering.'}
    fact_rows=''.join(f'<tr data-fact-key="{esc(key)}"><th scope="row">{esc(f.get("label") or key)}</th><td>{esc(neat(f["value"]))} {esc(f.get("unit") or "")}</td><td>{esc(f.get("context") or ("Nicht angegeben" if de else "Not specified"))}</td></tr>' for key,f in facts.items())
    if 'power_watts' not in facts: fact_rows=f'<tr data-fact-key="power_watts"><th scope="row">{"Leistungsaufnahme" if de else "Power input"}</th><td>{esc(power_text)}</td><td>{esc(power_context)}</td></tr>'+fact_rows
    table_rows=''.join(f'<tr><th scope="row">{h} h</th><td>{fmt(power/1000*h,de)} kWh</td><td>{money(power/1000*h*.35,de)}</td><td>{money(power/1000*h*.35*30,de)}</td></tr>' for h in (4,8,12))
    hours=''.join(f'<label><input type="radio" name="hours" value="{h}" required><span>{h} h</span></label>' for h in (4,8,12))
    rates=''.join(f'<label><input type="radio" name="rate" value="{r:.2f}" required><span>{money(r,de)}/kWh</span></label>' for r in (.30,.35,.40))
    faq_html=''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in faq)
    graph=[{'@type':'Article','@id':canonical+'#article','headline':title,'description':description,'inLanguage':'de-DE' if de else 'en-GB','datePublished':published,'dateModified':modified,'mainEntityOfPage':{'@type':'WebPage','@id':canonical},'author':{'@type':'Organization','name':'EcoBack','url':'https://getecoback.com/'},'publisher':{'@type':'Organization','name':'EcoBack','url':'https://getecoback.com/'},'citation':sources},{'@type':'FAQPage','@id':canonical+'#faq','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in faq]}]
    structured=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    home='/' if de else '/en/'
    return f'''<!doctype html>
<html lang="{'de' if de else 'en-GB'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(meta_title)}</title><meta name="description" content="{esc(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{canonical}"><link rel="stylesheet" href="/assets/auto-product.css"><script type="module" src="/assets/auto-product.mjs"></script><script type="application/ld+json">{structured}</script></head>
<body><header class="auto-header"><a href="{home}">{esc(labels['back'])}</a><a href="{'/tools.html' if de else '/en/index.html'}">{'Werkzeuge' if de else 'Tools'}</a></header><main class="auto-page"><article><p class="auto-kicker">{'Herstellerdaten → eigene Entscheidung' if de else 'Manufacturer figures → your decision'}</p><h1>{esc(title)}</h1><p class="auto-dates">{esc(labels['published'])}: <time datetime="{esc(published)}">{pub}</time> · {esc(labels['updated'])}: <time datetime="{esc(modified)}">{mod}</time></p><p class="auto-answer">{esc(lead)}</p>
{MARKER}<section id="auto-product-tool" class="auto-tool" data-power-watts="{power:g}" data-currency="{currency}" data-language="{'de' if de else 'en-GB'}" data-product-name="{esc(name)}" data-share-url="{canonical}" data-drain-verified="{'yes' if drain_yes else 'no'}" aria-labelledby="auto-tool-title"><h2 id="auto-tool-title">{esc(labels['tool'])}</h2><p>{esc(labels['tool_intro'])}</p><button type="button" data-auto-example hidden>{esc(labels['example'])}</button><form hidden><fieldset><legend>{esc(labels['hours'])}</legend><div class="auto-options">{hours}</div></fieldset><fieldset><legend>{esc(labels['rate'])}</legend><div class="auto-options">{rates}</div></fieldset><label class="auto-drain-label">{esc(labels['drain'])}<select name="drainage"><option value="unknown">{esc(labels['unknown'])}</option><option value="tank">{esc(labels['tank'])}</option><option value="hose">{esc(labels['hose'])}</option></select></label><button type="submit">{esc(labels['button'])}</button></form><div data-auto-result class="auto-result" hidden tabindex="-1"><h3 data-auto-result-title></h3><p data-auto-result-cost></p><p data-auto-result-limit></p><p data-auto-result-drain></p><button type="button" data-auto-copy>{esc(labels['copy'])}</button><textarea data-auto-copy-text aria-label="{esc(labels['copy_label'])}" readonly hidden></textarea><p data-auto-status role="status"></p></div><h3>{esc(labels['static'])}</h3><p>{esc(labels['table_note'])}</p><div class="auto-table"><table><thead><tr><th>{esc(labels['hours_col'])}</th><th>{esc(labels['energy_col'])}</th><th>{esc(labels['daily_col'])}</th><th>{esc(labels['month_col'])}</th></tr></thead><tbody>{table_rows}</tbody></table></div><p data-cost-formula>{esc(labels['formula'])}</p><p class="auto-note">{esc(labels['privacy'])}</p><noscript><p>{esc(labels['nojs'])}</p></noscript></section><!--/EB_AUTO_CONTENT-->
<section><h2>{esc(labels['power'])}</h2><p data-cost-formula>{esc(labels['formula'])}</p><p data-power-limit>{esc(limit)}</p></section><section><h2>{esc(labels['moisture'])}</h2><p>{esc(extraction_text)}</p><p>{esc(temperature_text)}</p></section><section><h2>{esc(labels['water'])}</h2><p>{esc(tank_text)}</p><p>{esc(drainage_text)}</p></section><section><h2>{esc(labels['noise'])}</h2><p>{esc(noise_text)}</p></section><section class="auto-fit"><h2>{esc(labels['fit'])}</h2><ol>{''.join('<li>'+esc(s)+'</li>' for s in positive)}</ol><h3>{esc(labels['avoid'])}</h3><ul>{''.join('<li>'+esc(s)+'</li>' for s in stop)}</ul><p>{esc(labels['plug'])}</p></section>
<section id="manufacturer-specifications"><h2>{esc(labels['specs'])}</h2><div class="auto-table"><table><thead><tr><th>{esc(labels['fact'])}</th><th>{esc(labels['value'])}</th><th>{esc(labels['context'])}</th></tr></thead><tbody>{fact_rows}</tbody></table></div></section><section id="faq"><h2>{esc(labels['faq'])}</h2>{faq_html}</section><section id="sources"><h2>{esc(labels['sources'])}</h2><p>{esc(labels['source_date'])}: <time datetime="{esc(product['checked_at'])}">{checked}</time>. {'Abrufdatum ist kein Produkttest und kein neuer Veröffentlichungszeitpunkt.' if de else 'Capture date does not mean a product test or a new publication date.'}</p><ul>{''.join('<li><a href="'+esc(url)+'" rel="noopener">'+esc(url)+'</a></li>' for url in sources)}</ul><p>{esc(labels['disclosure'])}</p></section><section class="auto-links"><h2>{esc(labels['next'])}</h2><ul>{''.join('<li><a href="'+url+'">'+esc(label)+'</a></li>' for url,label in related)}</ul></section></article></main><footer class="auto-footer"><a href="{'/datenschutz.html' if de else '/datenschutz.html'}">{'Datenschutz' if de else 'Privacy'}</a></footer></body></html>\n'''

def build(manifest_path=ROOT/'data/auto-content.json', site=ROOT/'site'):
    manifest_path=Path(manifest_path); site=Path(site)
    if not manifest_path.exists(): return {'pages':0,'changed':0}
    manifest=json.loads(manifest_path.read_text())
    if manifest.get('schema_version')!=1 or not isinstance(manifest.get('pages'),dict): raise ValueError('Invalid auto-content manifest')
    writes=[]
    for path,entry in sorted(manifest['pages'].items()):
        output=render_page(entry['product'],path,entry['published'],entry['modified'])
        destination=site/path.lstrip('/')
        current=site
        if current.is_symlink(): raise ValueError('Symlink site root is not permitted')
        for part in Path(path.lstrip('/')).parts:
            current=current/part
            if current.is_symlink(): raise ValueError('Symlink page parent or destination is not permitted')
        destination.resolve().relative_to(site.resolve())
        existing=destination.read_text() if destination.exists() else None
        if existing is not None and MARKER not in existing: raise ValueError('Refusing to overwrite an unmanaged page: '+path)
        if existing!=output: writes.append((destination,output))
    for destination,output in writes:
        destination.parent.mkdir(parents=True,exist_ok=True);destination.write_text(output,encoding='utf-8')
    return {'pages':len(manifest['pages']),'changed':len(writes)}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--manifest',type=Path,default=ROOT/'data/auto-content.json');parser.add_argument('--site',type=Path,default=ROOT/'site');args=parser.parse_args()
    print(json.dumps(build(args.manifest,args.site)))
