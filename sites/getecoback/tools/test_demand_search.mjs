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
