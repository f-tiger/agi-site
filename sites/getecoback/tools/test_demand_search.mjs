import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchEntries,normalize} from '../site/assets/demand-discovery.mjs';
import {ecoPublicBusinessEvent} from '../site/assets/public-engagement.mjs';
const browsingIndex=readFileSync(new URL('../site/assets/search-index.json',import.meta.url));
const index=JSON.parse(browsingIndex);
test('Final browser index preserves the public compatibility index byte-for-byte',()=>{
 const compatibilityIndex=readFileSync(new URL('../site/search-index.json',import.meta.url));
 assert(browsingIndex.equals(compatibilityIndex),'Built browser and compatibility search indices differ');
});
test('Natural needs, umlauts, case and filler words resolve to reviewed tasks',()=>{
 for(const [q,l,path] of [['Wie kann ich kalte Füße','de','/guide/homeoffice-warm-bleiben.html'],['waesche trocknen','de','/waeschetrockner-oder-luftentfeuchter.html'],['dry my clothes','en','/en/guide/heated-airer-vs-dehumidifier.html'],['replacement filter','en','/en/filter-finder.html'],['vocht','nl','/nl/ventilatie-of-luchtontvochtiger.html'],['CBAM','zh-CN','/zh/agents/cbam-supplier-data.html']])assert(searchEntries(index,q,l).some(h=>h.entry.u===path),q);
 assert.equal(normalize('FÜẞE'),normalize('fuesse'));
 assert.deepEqual(searchEntries(index,'the my','en'),[]);
});
test('Results stay within the exact language/market and public local routes',()=>{
 for(const l of ['de','en','en-AU','it','fr','es','nl','zh-CN'])for(const h of searchEntries(index,'cost',l))assert.equal(h.entry.l,l);
 const bad=['//evil.test','/auth/account','/members.html','/api/x','/x?private=1','/x#private','/\\evil.test'];
 assert.deepEqual(searchEntries(bad.map(u=>({u,t:'test',l:'de'})),'test','de'),[]);
});
test('Navigation measurement admits fixed names only and rejects raw queries/private routes',()=>{
 for(const name of ['eco_discovery_open','eco_discovery_task','eco_discovery_result']){
  assert.deepEqual(ecoPublicBusinessEvent('/guide/heizdecke-stromverbrauch.html',{name}),{name,tool_id:'eco-discovery'});
  assert.equal(ecoPublicBusinessEvent('/',{name,query:'private@example.test'}),null);
  for(const path of ['/auth/account','/members.html','/en/members.html','/api/x','/?private=1'])assert.equal(ecoPublicBusinessEvent(path,{name}),null);
 }
});

test('German drainage questions find the cellar guide and the general guide links to its answer',()=>{
 const path='/guide/luftentfeuchter-keller.html';
 assert.equal(searchEntries(index,'Abfluss höher als Luftentfeuchter','de')[0]?.entry.u,path+'#ablauf-vor-kauf');
 for(const query of ['Kondenswasserpumpe Keller','Ablaufschlauch Gefälle'])
  assert.equal(searchEntries(index,query,'de')[0]?.entry.u,path,query);
 const guide=readFileSync(new URL('../site/guide/luftentfeuchter-ratgeber.html',import.meta.url),'utf8');
 assert(guide.includes('href="'+path+'#ablauf-vor-kauf">Gefälle oder Pumpe?'));
 const cellar=readFileSync(new URL('../site'+path,import.meta.url),'utf8');
 assert.equal(cellar.split('id="ablauf-vor-kauf"').length,2);
});

test('German dehumidifier hose questions reach the existing drainage section without changing unrelated or foreign routes',()=>{
 const page='/guide/luftentfeuchter-keller.html';
 const anchor=page+'#ablauf-vor-kauf';
 for(const q of [
   'Kann ich den Schlauch vom MeacoDry Arete One 20L nach oben in das Waschbecken legen?',
   'Geht der Ablauf beim Comfee MDDF-20DEN7 auch bergauf bis zum Waschbecken?',
   'Der Ablaufschlauch von meinem Entfeuchter geht über eine Schwelle. Reicht der tiefere Bodenablauf?',
 ]){
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,anchor,q);
   assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===anchor));
 }
 for(const q of [
   'MeacoDry Arete One 20L im kalten Keller bei 10 Grad',
   'Ablaufschlauch der Waschmaschine am Waschbecken bergauf legen',
   'Geht der Schlauch im Aquarium über eine Schwelle?',
   'Hoher Stromverbrauch bei meinem Entfeuchter im Keller',
   'Entfeuchter mit Schlauch: Produziere ich bei höherer Luftfeuchtigkeit mehr Wasser?',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===anchor),q);
});

test('German ventilation decisions lead to the measured cellar check while general humidity stays separate',()=>{
 const page='/guide/keller-lueften-sommer.html';
 const anchor=page+'#taupunkt';
 for(const q of [
   'Soll ich meinen Keller lüften? Innen 16 °C und 75 %, draußen 8 °C und 90 %, Wand 12 °C.',
   'Wird mein Keller trotz höherer Luftfeuchte draußen beim Lüften trockener?',
   'Soll ich meinen Keller lüften? Die Wandtemperatur habe ich nicht gemessen.',
   'Kellerfenster öffnen?',
   'Kann ich das Kellerfenster jetzt öffnen, draußen 10 °C und 80 %, innen 17 °C und 65 %, die Wand 15 °C?',
 ]){
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,anchor,q);
   assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===anchor));
 }
 for(const q of [
   'Wie lange muss ich meinen Keller lüften?',
   'Soll ich wegen Radon im Keller lüften?',
   'Wie soll ich bei erhöhtem CO₂ im Keller lüften?',
   'Wie soll ich bei erhöhtem CO2 im Keller lüften?',
   'Kann ich verschimmelte Kartons im Keller durch Lüften trocknen?',
   'Wie messe ich Luftfeuchtigkeit im Keller?',
   'MeacoDry Arete One 20L im kalten Keller bei 10 Grad',
   'Wie prüfe ich im Keller den Abfluss für meinen Entfeuchter?',
   'Fenster beschlagen im Schlafzimmer: Soll ich lüften?',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===anchor),q);
});

test('German replacement filter lookups reach one exact owned model and no near variant',()=>{
 const page='/ersatzfilter.html';
 const routes=[
  ['Welcher Ersatzfilter passt zu meinem Beurer LR 401? Auf der Packung steht 69309.','beurer-lr401'],
  ['Hat der Filter 69309 für meinen LR401 die richtige Nummer?','beurer-lr401'],
  ['Welchen Filter brauche ich für meinen Levoit Core 300S ohne Pro?','levoit-core-300s'],
  ['Welcher Standardfilter passt in meinen Core 300S?','levoit-core-300s'],
 ];
 for(const [q,id] of routes){
  const hits=searchEntries(index,q,'de');
  assert.equal(hits[0]?.entry.u,page+'#'+id,q);
  assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1);
  assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u.startsWith(page)));
 }
 assert.equal(index.filter(e=>e.u===page).length,1);
 for(const q of [
  'Welcher Filter passt zu meinem Levoit Core 300S Pro?',
   'Wie wechsle ich den Filter von meinem Levoit Core 300S?',
   'Passt der Filter für den LR 401 auch in den LR 410?',
  'Welcher Filter passt zum Levoit Core 300S-P?',
  'Ich will für den Core 300S keinen Standardfilter.',
  'Passt 69309 bei Beurer LR401 oder LR405?',
  'Welche Filterkosten hat der Beurer LR 401 pro Jahr?',
  'Was kostet der Ersatzfilter für den Beurer LR 401?',
  'Wie reinige ich den Filter vom Beurer LR401?',
  'Kann ich den Filter vom Core 300S auswaschen?',
  'Passt LR 401 auch in meinen Philips Luftreiniger?',
  'Welcher Ersatzfilter passt in den Bosch LR 401?',
  'Ersatzfilter für Xiaomi Core 300S',
  'Welcher Ersatzfilter passt zum Beurer LR 401 Plus?',
  'Welcher Ersatzfilter passt zum Levoit Core 300S Plus?',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u.startsWith(page+'#')),q);
});

test('Philips humidifier filter searches keep model and series destinations distinct',()=>{
 const guide='/guide/luftbefeuchter-ratgeber.html';
 const common='philips-verdunsterfilter';
 for(const [q,id] of [
  ['Passt der Filter FY2401/30 in meinen Philips HU2716/10?','philips-hu2716-10'],
  ['Welcher Ersatzfilter passt zum Philips HU4803/01?','philips-hu4803-01'],
  ['Welchen Verdunsterfilter braucht mein Philips HU 4803 / 01?','philips-hu4803-01'],
  ['HU2716/11 Ersatzfilter',common],
  ['HU2716/10A Ersatzfilter',common],
  ['HU2716/10-Plus Ersatzfilter',common],
  ['HU2716/10 Plus Ersatzfilter',common],
  ['Philips Series 2000 Filter',common],
  ['Passt einer der Filter zu HU4803/01 oder HU2716/10?',common],
  ['Mein Philips trägt Series 2000: Brauche ich FY2401/30 oder FY3446/30?',common],
  ['Welcher Filter passt zu meinem Philips Luftbefeuchter Series 2000?',common],
  ['FY3446/30',common],
 ]) {
  const hits=searchEntries(index,q,'de');
  assert.equal(hits[0]?.entry.u,guide+'#'+id,q);
  assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===guide).length,1,q);
  assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u.startsWith(guide+'#')),q);
 }
 assert.equal(index.filter(entry=>entry.u===guide).length,1);
 for(const q of ['Wie oft soll ich den Filter vom Philips HU2716/10 reinigen?',
  'Ersatzfilter für Philips Series 2000 AC2887 Luftreiniger','FY3446/30 Vergleich mit Venta Filter',
  'Welcher Ersatzfilter passt zum Bosch HU4803/01?']) {
  assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u.startsWith(guide+'#')),q);
 }
});

test('German blanket operating-cost questions go to the existing safe calculation',()=>{
 const page='/guide/heizdecke-stromverbrauch.html';
 for(const q of [
   'Was kostet eine Heizdecke mit 110 Watt für zwei Stunden auf dem Sofa bei 35 Cent pro kWh?',
   'Meine Beurer HD 75 schaltet nach drei Stunden ab. Wieviel kostet ein Abend bei 0,35 Euro pro Kilowattstunde?',
   'Was kostet eine Heizdecke für zwei Stunden?',
   'Stromverbrauch einer Wärmezudecke',
   'Was kostet eine Heizdecke an Strom?',
   'Wie viel Strom braucht eine Heizdecke pro Abend?',
   'Heizdeckenstromkosten pro Abend',
 ]) {
   const results=searchEntries(index,q,'de');
   assert.equal(results[0]?.entry.u,page+'#waerme-rechner',q);
   assert.equal(results.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u.startsWith(page+'#')),q);
 }
 for(const q of ['Wo kann ich die Heizdecke kaufen?', 'Darf ich mit meiner Heizdecke nachts schlafen und wie viel Strom kostet es?',
  'Meine Heizdecke mit Zwischenzähler messen', 'Stromkosten Heizdecke versus Wärmeunterbett']) {
   assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u.startsWith(page+'#')),q);
 }
});

test('German same-place hygrometer comparisons open the numerical example',()=>{
 const page='/guide/luftfeuchtigkeit-richtig-messen.html';
 for(const q of [
   'Meine zwei Hygrometer zeigen nebeneinander 55 und 60 Prozent an. Beide haben ±3 Prozentpunkte Genauigkeit. Muss ich eines ersetzen?',
   'Das eine Hygrometer zeigt 54 %, das andere 59 %. Liegt der Unterschied noch in der Toleranz?',
   'Zwei Hygrometer am gleichen Ort zeigen unterschiedliche Werte. Welches stimmt?',
   'Hygrometer A zeigt 55 % und Hygrometer B 60 % bei gleicher Höhe. Wie vergleiche ich die Werte?',
   'Zwei Hygrometer unterscheiden sich am selben Ort um 5 Prozentpunkte.',
   'Zwei Hygrometer haben am gleichen Standort eine Differenz von 5 Prozentpunkten.',
 ]) {
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,page+'#hygrometer-vergleichen',q);
   assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u.startsWith(page+'#')),q);
 }
 for(const q of [
   'Zwei Hygrometer zeigen an der Fensterbank und am Heizkörper unterschiedliche Werte.',
   'Hygrometer vor dem Lüften 60 Prozent und nach dem Lüften 55 Prozent.',
   'Zwei Hygrometer zeigen unterschiedliche Werte – welches stimmt?',
   'Hygrometer mit zwei externen Referenzpunkten kalibrieren',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u.startsWith(page+'#')),q);
});

test('German exact N90 offer identity searches reach the existing model evidence',()=>{
 const page='/guide/delonghi-pac-n90-test.html';
 for(const q of [
   'Ich möchte den PAC N90 ECO Silent kaufen. Welche EAN muss auf dem Typenschild stehen?',
   'Die EAN 8004399512351 steht im Angebot für den DeLonghi Pinguino. Ist das der PAC N90 ECO Silent?',
   'Verkäufer nennt DeLonghi PAC N90, das Etikett sagt EX105. Kann ich das für dieselbe Variante halten?',
   'Auf dem Typenschild meines De’Longhi N90 ist die Nummer unleserlich.',
   'Ist der PAC N90 ECO Silent dasselbe Modell wie im Angebot?',
   'Ist die Artikel-Nr. des Pinguino N90 für Deutschland identisch?',
   'Kann ich beim PAC N90 ohne vollständige Modellbezeichnung bestellen?',
   'Ist das Angebot mit 8004399512351 auch die ECO-Silent-Version?',
   'Stimmt die Typenbezeichnung De’Longhi PAC N90 im deutschen Angebot ohne ECO Silent?',
   '8004399512351',
 ]) {
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,page+'#testlage',q);
   assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u.startsWith(page+'#')),q);
 }
 for(const q of [
   'Was kostet der N90 ECO Silent bei 35 Cent pro kWh laut Energielabel?',
   'Was kostet der PAC N90 ECO Silent?',
   'Welche EAN passt zum DeLonghi PAC EX105?',
   'Passt die Halterung zur Midea PortaSplit EAN 4048164116478?',
   'Was verbraucht das PAC N90 ECO Silent laut EAN 8004399512351 im Betrieb?',
   'PAC N90 mit EAN 8004399512351: Leistungsaufnahme in W?',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===page+'#testlage'),q);
});

test('German original PortaSplit lip questions open the existing guide measurement answer',()=>{
 const page='/guide/midea-portasplit-ausverkauft-alternativen.html';
 for(const q of [
   'Mein Fensterfalz ist 6 cm breit. Muss ich bei der Midea PortaSplit die Gummidichtung beim Messen mitzählen?',
   'Muss ich beim Ausmessen des Fensterrahmens für die PortaSplit die Dichtung zusammendrücken oder mitmessen?',
   'Die PortaSplit passt nicht ans Fenster, wo muss ich die Rahmendicke messen?',
   'Meine originale Midea PortaSplit hat einen 60 mm breiten Fensterfalz. Passt die mitgelieferte Standardhalterung?',
   'Midea PortaSplit Standardhalterung passt an einen Falz mit 45 mm Breite und 20 mm Höhe?',
 ]) {
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,page+'#fensterfalz',q);
   assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u.startsWith(page+'#')),q);
 }
 for(const q of [
   'Midea PortaSplit Dachfenster Universalhalterung',
   'Midea PortaSplit Pro Fensterfalz 60 mm',
   'PortaSplit Cool Fensterfalz messen',
   'Midea PortaSplit außen öffnendes Fenster mit 60 mm Fensterfalz',
   'PortaSplit 2 Fensterfalz messen',
   'PortaSplit II Fensterfalz messen',
   'PortaSplit E Fensterrahmen 45 mm',
   'Fensterabdichtung für Monoblock mit Dichtung ausmessen',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===page+'#fensterfalz'),q);
});

test('window-seal profile questions lead to the exact German buyer guidance',()=>{
  const route='/guide/fenster-zugluft-mietwohnung.html#dichtungsprofil';
  for(const q of [
    'Mein altes Fenster zieht. Der Spalt ist 4 mm breit – welches tesamoll-Profil brauche ich: E, P oder D?',
    'Holzfenster: P-Profil oder D-Profil von tesamoll bei 4 mm Spalt?',
    'Altes Fenster: Nutdichtung vorhanden, tesamoll D-Profil drüber?',
    'Fensterdichtung im Altbau: E- oder P-Dichtung wählen?',
    'Welches tesamoll E-, P- oder D-Profil passt bei 4 mm Spalt?',
    'D-Profil vs P-Profil für mein Holzfenster bei 4 mm',
  ]){
    const results=searchEntries(index,q,'de');
    assert.equal(results[0]?.entry.u,route,q);
    assert.equal(results.filter(hit=>hit.entry.u.split('#')[0]===route.split('#')[0]).length,1,q);
    assert.ok(searchEntries(index,q,'en').every(hit=>hit.entry.u!==route),q);
  }
  for(const q of ['tesamoll Türbodendichtung','Fensterdichtung E-Profil eines anderen Herstellers','PortaSplit Fensterfalz mit Dichtung','Duschdichtung D-Profil']){
    assert.ok(searchEntries(index,q,'de').every(hit=>hit.entry.u!==route),q);
  }
});

test('German noise comparisons reach the loudness section while keeping other buyer intents',()=>{
  const page='/guide/delonghi-pac-n90-test.html';
  const anchor=page+'#lautstaerke';
  const exact=[
    'Midea PortaSplit 39 dB und DeLonghi PAC N90 ECO Silent 64 dB – ist die Midea im Schlafzimmer 25 dB leiser?',
    'Welche Klimaanlage ist am Bett leiser: die PortaSplit mit 39 dB Schalldruck oder der PAC N90 mit 64 dB Schallleistung?',
    'Kann ich beim Klimakauf 39 dB Schalldruck im Silent-Modus mit 64 dB Schallleistung auf dem Energielabel vergleichen?',
    'Klimagerät 39/64 dB, Schalldruck vs Schallleistung',
    'PAC N90 50–52 dB Schalldruck gegen 64 dB Schallleistung vergleichen?',
    'Midea PortaSplit 39 dB und De’Longhi Pinguino N90 64 dB im Schlafzimmer vergleichen',
    'Sind 39 und 64 Dezibel bei Midea PortaSplit und PAC N90 vergleichbar?',
    'PortaSplit 39 dB und PAC N90 64 dB: sind die Pegel gleich laut?',
  ];
  for(const q of exact){
    const hits=searchEntries(index,q,'de');
    assert.equal(hits[0]?.entry.u,anchor,q);
    assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
    assert.ok(searchEntries(index,q,'en').every(hit=>hit.entry.u!==anchor),q);
  }
  for(const q of [
    'Wie laut ist die Midea PortaSplit nachts?',
    'PAC N90 Stromkosten pro Stunde bei 35 Cent pro kWh',
    'Meine Klimaanlage rattert bei 39 dB Schalldruck und 64 dB Schallleistung. Ist sie defekt?',
    'Ist die PortaSplit Lite mit 39 dB am Bett oder der N90 mit 64 dB leiser?',
    'Midea PortaSplit: 60 mm Fensterfalz, zähle ich die Gummidichtung mit?',
  ]) assert.ok(searchEntries(index,q,'de').every(hit=>hit.entry.u!==anchor),q);
  assert.equal(searchEntries(index,'Welcher PAC N90 ECO Silent? Typenschild EAN 8004399512351','de')[0]?.entry.u,page+'#testlage');
});

test('the Trotec ECO window stays separate from the TTK 75 E and unrelated intents',()=>{
  const page='/guide/trotec-luftentfeuchter-test.html';
  const anchor=page+'#ttk75-pruefpunkt';
  for(const q of [
    'Wie viele Liter zieht ein Trotec TTK 75 ECO im kalten Keller bei 10 °C und 60 % Luftfeuchte und wie viel Strom?',
    'Was schafft der Trotec TTK 75 ECO bei 20 Grad und 60 Prozent? Sind 21 Liter am Tag auch im Keller realistisch?',
    'TTK75 Eco bei 30°C und 80 Prozent: Entfeuchtungsleistung?',
    'Kann ein TTK-75-ECO bei 5 Grad im Keller laufen?',
    'Schafft der Trotec TTK 75 ECO 20 l pro Tag laut Anleitung?',
    'TTK 75 ECO 20 l/24 h: stimmt die Angabe?',
  ]){
    const hits=searchEntries(index,q,'de');
    assert.equal(hits[0]?.entry.u,anchor,q);
    assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
    assert.ok(searchEntries(index,q,'en').every(hit=>hit.entry.u!==anchor),q);
  }
  for(const q of [
    'Trotec TTK 75 E bei 30 °C und 80 % Liter pro Tag',
    'TTK 75 ECO Pro Entfeuchtungsleistung bei 10 °C',
    'Nicht TTK 75 ECO, sondern Trotec TTK 75 E: wie viel Wasser zieht der bei 30 °C und 80 %?',
    'Trotec TTK 75 ECO Schlauch und Ablauf für den Keller',
    'Trotec TTK 75 ECO Filter reinigen',
    'Stromkosten des TTK 75 ECO bei 440 Watt',
  ]) assert.ok(searchEntries(index,q,'de').every(hit=>hit.entry.u!==anchor),q);
});
