#!/usr/bin/env python3
"""Rebuild two existing German decision pages after generic page generators.

No network, new URLs or generated buying recommendations. FAQ body and JSON-LD
share one source. Keep this late in the build, before discovery and GA coverage.
"""
import argparse
import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CHECKED = '2026-10-17'
S5 = 'https://de.tineco.com/support/faqs/floor-one-s5/'
S7 = 'https://de.tineco.com/support/troubleshooting/floor-one-s7-flashdry/solution/1432.html'
HEAT = 'https://www.verbraucherzentrale.de/wissen/energie/heizen-und-warmwasser/heizung-10-einfache-tipps-zum-heizkosten-sparen-13892'
PAGES = {
 'tineco-saugt-nicht-mehr': {
  'title':'Tineco saugt nicht mehr: Pflege-Check für S5 und S7 FlashDry',
  'description':'Modell, Symptom und Pflegezustand auswählen: kostenlose Prüfung, Kundendienst oder Ersatzteil-Abgleich. Keine pauschale Filter- oder Akku-Kaufempfehlung.',
  'tool':'tineco-care',
  'faq':[
   ('Muss ich bei schwacher Saugleistung einen neuen Filter kaufen?', 'Nein. Schwache Saugleistung beweist keinen Filterdefekt. Beim FLOOR ONE S5 lässt sich der Filter laut Hersteller reinigen; er muss vor dem Einsetzen vollständig trocken sein. Bleibt der Fehler bestehen, zuerst die genaue Modellanleitung oder den Kundendienst nutzen.'),
   ('Beweist automatisches Abschalten einen defekten Akku?', 'Nein. Die S5-FAQ nennt unter anderem einen vollen Schmutzwassertank als Grund für einen automatischen Stopp. Anzeige und Sprachmeldung prüfen. Ein Akkukauf lässt sich allein aus kurzem Betrieb oder Abschalten nicht begründen.'),
   ('Was gilt bei verbranntem Geruch?', 'Das Gerät nicht weiter benutzen, laden oder erneut testen. Bei elektrischem oder verbranntem Geruch verweist die S7-FlashDry-Hilfe an den Kundendienst. Das ist ein anderer Fall als muffiger Geruch; bei unmittelbarer Gefahr gilt der Notruf.'),
   ('Passt ein als Tineco-kompatibel angebotenes Ersatzteil?', 'Diese Angabe allein reicht nicht. Vollständige Modellvariante, Teilenummer und Lieferumfang müssen mit den Herstellerangaben übereinstimmen. Dieser Check zertifiziert keine Kompatibilität und empfiehlt keine ungeprüften Ersatzteile.')
  ]},
 'thermovorhang-ratgeber': {
  'title':'Thermovorhang prüfen: Fenster, Tür und Heizkörper richtig einplanen',
  'description':'Kostenloser Montagecheck für Thermovorhänge: Tür oder Fenster, freier Heizkörper und Öffnungsweg. Erst prüfen und messen, dann passende Angebote vergleichen.',
  'tool':'curtain-fit',
  'faq':[
   ('Spart ein Thermovorhang sicher Heizkosten?', 'Eine konkrete Einsparung lässt sich aus diesem Montagecheck nicht ableiten. Gebäude, Fenster, Nutzung, Lüftung und Heizung beeinflussen das Ergebnis. Ein Vorhang ersetzt keine Reparatur und darf Heizkörper oder Thermostat nicht verdecken.'),
   ('Was tun, wenn der Vorhang vor dem Heizkörper hängt?', 'Den Stoffverlauf ändern, damit Heizkörper und Thermostat frei bleiben. Die Verbraucherzentrale rät ausdrücklich davon ab, Heizkörper mit Vorhängen zu verdecken. Zusätzlich die Abstände in der Anleitung des Heizgeräts beachten.'),
   ('Ist Klemmmontage in einer Mietwohnung immer geeignet?', 'Nein. Flügeldicke, Dichtungen, Tragfähigkeit und Öffnungsweg müssen zur Halterung passen. Die Freigaben der Hersteller und gegebenenfalls die Mietbedingungen prüfen. Ohne Bohren bedeutet nicht automatisch ohne Beschädigung.'),
   ('Kann ich eine genaue Vorhanggröße aus diesem Check übernehmen?', 'Nein. Der Check fragt keine Maße ab. Breite, Höhe, Träger- oder Flügeldicke und Bewegungsraum müssen vor einem Kauf vor Ort gemessen werden. Suchergebnisse sind keine Passformempfehlung.')
  ]}
}

def esc(s):
 return html.escape(s, quote=True)

def icon(kind):
 shapes={
  'door':'<rect x="12" y="3" width="20" height="27" rx="1"/><path d="M18 5v23l12-4V7z"/><circle cx="26" cy="16" r="1"/>',
  'window':'<rect x="7" y="4" width="31" height="25" rx="1"/><path d="M22 4v25M7 16h31"/>',
  'heat':'<rect x="7" y="14" width="30" height="15" rx="2"/><path d="M13 17v9m6-9v9m6-9v9m6-9v9M15 9V3m7 6V3m7 6V3"/>',
  'free':'<path d="M9 17l9 9L36 7"/>',
  'blocked':'<path d="M11 7l22 22M33 7L11 29"/>',
  'unknown':'<path d="M16 10a7 7 0 1111 6c-4 3-5 3-5 7"/><circle cx="22" cy="29" r="1"/>'
 }
 return '<svg viewBox="0 0 44 34" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'+shapes[kind]+'</svg>'

def field(name, legend, choices):
 return '<fieldset><legend>'+esc(legend)+'</legend><div class="up-options">'+''.join(
  '<label class="up-option"><input type="radio" name="'+name+'" value="'+v+'" required><span>'+ (icon(i) if i else '')+esc(label)+(('<small>'+esc(note)+'</small>') if note else '')+'</span></label>' for v,label,note,i in choices
 )+'</div></fieldset>'

def tool(tool_id):
 care=tool_id=='tineco-care'
 title='Drei Angaben zum nächsten Pflegeschritt' if care else 'Passt ein Vorhang an diese Stelle?'
 intro='Wähle das genaue Modell, die Beobachtung und den Pflegezustand. Keine Seriennummer, keine Texteingabe und kein Konto nötig.' if care else 'Drei Bildauswahlen zeigen Montagekonflikte. Maße brauchst du erst vor einem Kauf; hier gibt es keine erfundene Passform oder Einsparung.'
 if care:
  fields=field('model','1 · Welches Modell steht am Gerät?',[
   ('s5','FLOOR ONE S5','Nicht automatisch S5 Combo, Pro oder Stretch.',None),('s7-flashdry','FLOOR ONE S7 FlashDry','Nur diese Modellvariante.',None),('other','Anderes Modell / unklar','Zuerst Modell und eigene Anleitung prüfen.',None)])
  fields+=field('symptom','2 · Was fällt dir auf?',[
   ('weak','Schwache Saugleistung','',None),('tank','Tank- oder Blockademeldung','',None),('odor','Muffiger Geruch','Kein elektrischer oder verbrannter Geruch.',None),('stops','Stoppt / startet nicht','',None),('burnt','Verbrannter Geruch / Rauch','Nicht weiter benutzen oder laden.',None),('worn','Teil sichtbar beschädigt','Filter oder Walze; Kompatibilität noch ungeklärt.',None)])
  fields+=field('care','3 · Pflege laut eigener Anleitung erledigt?',[
   ('not-yet','Noch nicht','',None),('dry','Ja, gereinigt und vollständig trocken','Problem ist weiterhin vorhanden.',None),('unsure','Nicht sicher','',None)])
 else:
  fields=field('place','1 · Wo soll der Vorhang hängen?',[
   ('door','An einer Tür','Durchgang und mögliche Lüftungsfunktion prüfen.','door'),('window','Vor einem Fenster','Scheibe und Fensterflügel zugänglich halten.','window'),('unsure','Noch unklar','','unknown')])
  fields+=field('radiator','2 · Bleiben Heizkörper und Thermostat frei?',[
   ('clear','Ja, beides bleibt frei','Auch bei zugezogenem Vorhang.','heat'),('covered','Nein, Stoff liegt davor','Zuerst den Verlauf ändern.','blocked'),('unsure','Noch nicht geprüft','','unknown')])
  fields+=field('opening','3 · Funktionieren Öffnen und Durchgehen?',[
   ('clear','Ja, ohne Stoff oder Halterung im Weg','','free'),('blocked','Nein, es gibt einen Konflikt','','blocked'),('unsure','Noch nicht geprüft','','unknown')])
 alert='<p class="up-alert"><strong>Verbrannter oder elektrischer Geruch / Rauch:</strong> Gerät ausschalten, nicht weiter benutzen, laden oder erneut testen. Kundendienst kontaktieren; bei unmittelbarer Gefahr den Notruf wählen.</p>' if care else '<p class="up-alert"><strong>Heizkörper, Thermostat und Lüftungsöffnungen frei halten.</strong> Tür, Fenster und Fluchtwege dürfen nicht durch die Montage blockiert werden.</p>'
 nojs='Ohne JavaScript: Bei gewöhnlichem Pflegebedarf zuerst die freigegebenen Schritte deiner Modellanleitung prüfen. S5-Filter müssen nach der Reinigung vollständig trocknen. Besteht das Problem weiter, den Kundendienst fragen; kein Filter- oder Akkukauf auf Verdacht.' if care else 'Ohne JavaScript: Heizkörper, Thermostat und Lüftungsöffnungen frei halten. Vorhänge dürfen Öffnung und Durchgang nicht behindern. Vor Kauf Maße und Befestigung prüfen; eine konkrete Einsparung oder Passform ist hier nicht ermittelt.'
 shop='' if care else '<div class="up-shop" data-shop hidden><strong>Erst messen, dann Angebote prüfen</strong><p class="up-note">Anzeige · Amazon.de · vorhandene Partnerverbindung. Dies sind allgemeine Suchergebnisse, keine geprüften Modelle oder Größen. Lieferung nach Österreich oder in die Schweiz sowie Endpreis und Rückgabe separat beim Händler prüfen.</p><a href="https://www.amazon.de/s?k=thermovorhang+verdunkelung&amp;tag=getecoback-21" target="_blank" rel="sponsored noopener">Thermovorhänge auf Amazon.de suchen →</a></div>'
 return f'''<!--EB_UPKEEP--><link rel="stylesheet" href="/assets/upkeep-decisions.css"><section id="upkeep-check" class="eb-upkeep" data-upkeep="{tool_id}" aria-labelledby="upkeep-title"><p class="up-kicker">EcoBack · zuerst prüfen</p><h2 id="upkeep-title">{title}</h2><p>{intro}</p>{alert}<button type="button" class="up-secondary" data-example hidden>Fiktives Beispiel ansehen</button><form hidden>{fields}<button type="submit">Nächsten Schritt anzeigen</button></form><div class="up-result" data-result hidden tabindex="-1" aria-labelledby="upkeep-result-title"><p class="up-kicker" data-result-label></p><h3 id="upkeep-result-title" data-result-title></h3><ul data-result-steps></ul><p><a data-result-source href="{S5 if care else HEAT}">Offizielle Grundlage / Herstellerhilfe lesen →</a></p>{shop}<button type="button" class="up-secondary" data-copy hidden>Ergebnis zum Teilen kopieren</button><textarea aria-label="Ergebnis zum Kopieren" readonly data-copy-text hidden></textarea><p role="status" data-status></p></div><p class="up-note">Deine Auswahl bleibt in diesem Browser. Es werden keine Modell- oder Symptomauswahlen übertragen. Nutzung und Beispielaufruf werden getrennt gezählt; die Datenschutzeinstellung gilt weiterhin. Teilen ist freiwillig und veröffentlicht nichts automatisch.</p><noscript><p>{nojs}</p></noscript></section><script type="module" src="/assets/upkeep-decisions.mjs"></script><!--/EB_UPKEEP-->'''

def faq_block(cfg):
 return '<section class="up-faq" id="haeufige-fragen"><h2>Häufige Fragen</h2>'+''.join('<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>' for q,a in cfg['faq'])+'</section>'

def article(slug,cfg):
 if cfg['tool']=='tineco-care':
  intro='<p class="answer-box"><strong>Die kurze Antwort:</strong> Schwache Saugleistung, eine Tankmeldung oder automatisches Abschalten belegen noch keinen Teiledefekt. Dieser Check trennt kostenlose Pflege, Kundendienst und eine notwendige Ersatzteilprüfung. Er diagnostiziert weder Akku noch Motor.</p>'
  content=f'''<h2 id="modellgrenzen">Was dieser Check abdeckt</h2><p>Die modellbezogenen Grundlagen sind die <a href="{S5}">offiziellen FLOOR-ONE-S5-FAQ</a> und die <a href="{S7}">S7-FlashDry-Hilfe zu Geruch</a>. Die S7-Quelle belegt kein Verfahren für alle Saug- oder Startprobleme. Andere FLOOR-ONE-Varianten dürfen nicht gleichgesetzt werden. EcoBack hat diese Geräte nicht selbst geprüft.</p>
<h2 id="pflege-vor-kauf">Pflege vor einem Teilekauf</h2><p>Beim S5 ist der Filter laut FAQ waschbar und muss vollständig trocknen. Tank-, Walzen- oder Kanalhinweise geben Anlass, die jeweils freigegebenen Pflegeschritte zu prüfen. Beim S7 FlashDry unterscheidet Tineco muffigen Geruch von elektrischem oder verbranntem Geruch. Im ersten Fall nennt der Hersteller die Reinigung von Filter, Tank, Walze und Kanal; im zweiten den Kundendienst.</p><p>Kein pauschaler Tipp zu Essig auf Kontakten, geöffneten Akkus oder einem internen Schlauchtausch: Eine fremde Reparaturanleitung ersetzt die Freigabe für dein Modell nicht. Wiederholtes Abschalten ist kein Nachweis für einen verbrauchten Akku.</p>
<h2 id="ersatzteil-check">Wenn ein Ersatzteil tatsächlich nötig ist</h2><ol><li>Vollständige Modellvariante vom Typenschild mit der Herstelleranleitung abgleichen.</li><li>Passende Teilenummer und Lieferumfang vom Hersteller bestätigen lassen; eine Produktaufnahme allein genügt nicht.</li><li>Verkäufer, Lieferland, Rückgabe und Garantiebedingungen prüfen. Deutschland, Österreich und die Schweiz können unterschiedliche Bedingungen haben.</li></ol><p>Solange die Kompatibilität offen ist, geben wir keine generische „Tineco-kompatibel“-Kaufempfehlung. Bei unklarem Fehler ist Support der nächste Schritt, nicht ein neuer Sauger.</p>
<div class="up-evidence"><strong>Was Nutzerberichte beitragen</strong><p>In der <a href="https://www.reddit.com/r/Ratschlag/comments/1qclq64/welchen_nasstrockensauger_benutzt_ihr/">deutschsprachigen Diskussion über Nass-Trocken-Sauger</a> gehören Pflegeaufwand und unterschiedliche Alltagserfahrungen zur Kaufentscheidung. Das erklärt die Fragestellung dieses Checks, belegt aber weder Fehlerhäufigkeit noch eine Reparaturmethode.</p></div>
<div class="up-links"><a href="/tools.html">Weitere EcoBack-Werkzeuge →</a><a href="/guide/klimaanlage-reinigen.html">Pflege einer mobilen Klimaanlage →</a></div>
<p class="up-sources">Quellen geprüft: 17. Oktober 2026. Technische Hinweise: Tineco S5-FAQ und S7-FlashDry-Geruchshilfe, oben direkt verlinkt. Nutzerbericht: einzelne Erfahrungen, keine repräsentative Erhebung.</p>'''
  disclosure='Transparenz: EcoBack wird unter anderem über gekennzeichnete Partnerlinks finanziert. Dieser Check enthält keine ungeprüften Ersatzteil-Kaufempfehlungen. Herstellerhilfen sind gewöhnliche Quellenlinks; wir haben die Geräte nicht selbst getestet.'
 else:
  intro='<p class="answer-box"><strong>Die kurze Antwort:</strong> Ein Thermovorhang ist erst dann eine sinnvolle Option, wenn er zur Stelle passt. Prüfe zuerst, ob du einen undichten Spalt, kalte Oberflächen oder eine ungünstige Montage beobachtest. Freie Heizkörper, Bedienbarkeit und Lüftung gehen vor einem Kauf.</p>'
  content=f'''<h2 id="zugluft-oder-kalte-flaeche">Zugluft und kalte Oberflächen unterscheiden</h2><p>Dass es am Fenster oder an der Tür kalt wirkt, beweist keine kaputte Dichtung. Beobachte die Stelle und den Zustand vorhandener Dichtungen. Bei unklaren baulichen Mängeln den Vermieter oder einen Fachbetrieb einbeziehen; ein Vorhang ersetzt die Klärung nicht. Lüftungsöffnungen und vorgeschriebene Luftwege dürfen nicht zugestellt werden.</p>
<h2 id="heizkoerper-frei">Heizkörper und Thermostat bleiben frei</h2><p>Die <a href="{HEAT}">Verbraucherzentrale empfiehlt ausdrücklich, Heizkörper nicht mit Vorhängen zu verdecken</a>. Wärme soll in den Raum gelangen. Berücksichtige auch die Abstände aus der Anleitung eines elektrischen Heizgeräts. Der Check erkennt einen von dir angegebenen Konflikt, misst aber keine Abstände.</p>
<h2 id="vor-kauf-messen">Vor dem Kauf: messen und Befestigung prüfen</h2><ul><li>Breite und Höhe der tatsächlichen Einbaustelle messen; Tür- und Fensterflügel vollständig öffnen.</li><li>Abstand zu Heizkörper, Thermostat, Griffen, Lüftungsöffnungen und Durchgang prüfen.</li><li>Bei Klemmträgern: Flügeldicke, Dichtungen, Tragfähigkeit und Herstellerfreigabe abgleichen. „Ohne Bohren“ bedeutet nicht automatisch schadensfrei oder in jeder Mietwohnung erlaubt.</li><li>Artikelmaße, Verpackungsinhalt, Befestigungsmaterial, Waschpflege und Rückgabe vor Bestellung lesen.</li></ul><p>Unbekannte Maße ergeben keine genaue Produktempfehlung. Auch die Dicke eines Stoffes allein belegt keine bestimmte Dämmwirkung. Eine vorhandene passende Lösung weiterzuverwenden kann den Kauf überflüssig machen.</p>
<h2 id="grenzen">Grenzen im Sommer und Winter</h2><p>Dieser Check berechnet keine Heizkostenersparnis und garantiert weder niedrigere Raumtemperaturen noch trockene Fenster. Nutze den Vorhang so, dass Fenster bedienbar bleiben, und prüfe Scheibe und Rahmen auf Feuchtigkeit. Zur Auswahl eines Sonnenschutzes siehe den eigenen <a href="/guide/hitzeschutz-fenster.html">Fenster-Hitzeschutz-Ratgeber</a>; eine Wintermontage ist kein Wirksamkeitsnachweis für den Sommer.</p>
<div class="up-evidence"><strong>Warum die Tür als eigener Fall vorkommt</strong><p>Eine <a href="https://www.reddit.com/r/wohnen/comments/1x6s0m9/wohnungst%C3%BCr_abdichten/">deutschsprachige Frage zur undichten Wohnungstür</a> zeigt eine konkrete Alltagssorge. Die Antworten sind keine technische Montagefreigabe. Für die Hinweise zum freien Heizkörper verwenden wir die Verbraucherzentrale; die restliche Passform muss vor Ort geklärt werden.</p></div>
<div class="up-links"><a href="/tools.html">Weitere EcoBack-Werkzeuge →</a><a href="/guide/heizluefter-stromverbrauch.html">Tatsächliche Laufzeit und Heizkosten rechnen →</a><a href="/guide/waesche-trocknen-wohnung.html">Feuchtigkeit beim Wäschetrocknen einordnen →</a></div>
<p class="up-sources">Quellen geprüft: 17. Oktober 2026. Verbraucherzentrale: „Heizung: 10 einfache Tipps zum Heizkosten sparen“. Die verlinkte Nutzerfrage ist ein einzelnes Beispiel, kein Nachweis von Häufigkeit oder Einsparung.</p>'''
  disclosure='Transparenz: Als Amazon-Partner verdient EcoBack an qualifizierten Käufen. Der nach passender Auswahl eingeblendete Amazon.de-Link ist als Anzeige gekennzeichnet. Suchergebnisse sind keine getesteten oder als passend bestätigten Modelle. Preise, Versand und Rückgabe beim Händler prüfen.'
 # Put the editorial intro before the badge. Onpage inserts its TOC after the
 # first paragraph; placing the badge first would nest the TOC inside the
 # EB_UPDATED markers and lose it when onpage normalizes that badge.
 return '<article><div class="wrap up-editorial">'+intro+'<!--EB_UPDATED--><p class="up-sources">Aktualisiert am 17. Oktober 2026 · EcoBack Redaktion</p><!--/EB_UPDATED-->'+tool(cfg['tool'])+content+faq_block(cfg)+'<p class="up-sources">'+disclosure+'</p></div></article>'

def build(slug,source):
 cfg=PAGES[slug]
 source=re.sub(r'<article\b[^>]*>.*?</article>',lambda _:article(slug,cfg),source,count=1,flags=re.S)
 for name in ['TOPPICK','MODELS','STICKY','PROFILE','USMARKET','POPUP','USSWITCH']:
  source=re.sub(r'<!--EB_'+name+r'-->.*?<!--/EB_'+name+r'-->','',source,flags=re.S)
 source=re.sub(r'<title>.*?</title>','<title>'+esc(cfg['title'])+'</title>',source,count=1,flags=re.S)
 for attribute,name,value in [('name','description',cfg['description']),('property','og:title',cfg['title']),('property','og:description',cfg['description'])]:
  source=re.sub(r'<meta\s+'+attribute+'="'+name+'"[^>]*>',lambda _:f'<meta {attribute}="{name}" content="{esc(value)}">',source)
 source=re.sub(r'<h1\b[^>]*>.*?</h1>','<h1>'+esc(cfg['title'])+'</h1>',source,count=1,flags=re.S)
 source=re.sub(r'Zuletzt aktualisiert: [^<]*','Zuletzt aktualisiert: 17. Oktober 2026 · Pflege und Passform prüfen',source,count=1)
 source=re.sub(r'(<!--EB_CRUMB-->.*?<span>›</span>)([^<]*)(</nav>)',lambda m:m[1]+esc(cfg['title'])+m[3],source,flags=re.S)
 def schema(m):
  data=json.loads(m[1]);nodes=data.get('@graph',[data])
  for node in nodes:
   if node.get('@type')=='Article':node.update(headline=cfg['title'],description=cfg['description'],dateModified=CHECKED)
   if node.get('@type')=='BreadcrumbList':node['itemListElement'][-1]['name']=cfg['title']
   if node.get('@type')=='FAQPage':node['mainEntity']=[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in cfg['faq']]
  return '<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False,separators=(',',':'))+'</script>'
 return re.sub(r'<script type="application/ld\+json">(.*?)</script>',schema,source,flags=re.S)

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 changed=[]
 for slug in PAGES:
  path=ROOT/'site'/'guide'/(slug+'.html');old=path.read_text();new=build(slug,old)
  if old!=new:
   changed.append(str(path.relative_to(ROOT)))
   if not args.check:path.write_text(new)
 if args.check and changed:raise SystemExit('Upkeep pages need regeneration: '+', '.join(changed))
 print(json.dumps({'upkeep_pages':len(PAGES),'changed':changed,'check':args.check}))

if __name__=='__main__':main()
