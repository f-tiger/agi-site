import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchEntries,normalize} from '../site/assets/demand-discovery.mjs';
import {ecoPublicBusinessEvent} from '../site/assets/public-engagement.mjs';
import {calculateGasHeatThreshold} from '../site/assets/heat-gas-cost.mjs';
import {compareSocketWatts} from '../site/assets/auto-12v-check.mjs';
const browsingIndex=readFileSync(new URL('../site/assets/search-index.json',import.meta.url));
const index=JSON.parse(browsingIndex);
test('German large or multi-room cooling questions reach the load assessment',()=>{
 const target='/guide/btu-rechner.html#hohe-kuehllast';
 for(const query of ['Reicht eine mobile Klimaanlage für 60 m² im Dachgeschoss?',
  'Welche Klimaanlage kann mehrere Zimmer kühlen?', 'Wie viel BTU brauche ich für eine Klimaanlage auf 45 Quadratmetern?']){
  assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 }
 for(const query of ['Welche Klimaanlage passt zu meinem 40 m² Wohnzimmer?', 'Wie viel Heizleistung braucht ein Raum mit 60 m²?'])
  assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('German hygrometer placement questions reach the comparison of two fixed locations',()=>{
 const guide='/guide/luftfeuchtigkeit-richtig-messen.html';
 for(const query of [
  'Ein Hygrometer auf der Fensterbank, eins mitten im Zimmer: Wie finde ich heraus, ob der Standort oder das Gerät den Unterschied macht?',
  'Wie kann ich zwei Hygrometer zwischen Fensterbank und Raummitte tauschen?',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,guide+'#hygrometer-standorte-tauschen',query);
 assert.equal(searchEntries(index,'Zwei Hygrometer nebeneinander am selben Messort zeigen 55 % und 60 %','de')[0]?.entry.u,guide+'#hygrometer-vergleichen');
 assert.notEqual(searchEntries(index,'Hygrometer auf der Fensterbank mit Salztest kalibrieren','de')[0]?.entry.u,guide+'#hygrometer-standorte-tauschen');
});
test('EX105 buyers can find the exact German hose and sound evidence',()=>{
 const page='/guide/pinguino-pac-ex105-test.html';
 for(const [query,section] of [
  ['Welchen Abluftschlauch brauche ich beim De’Longhi PACEX105A+++?', 'ex105-ablufteinbau'],
  ['Abluftschlauch 0151454026 150 oder 170 mm?', 'ex105-ablufteinbau'],
  ['Sind beim PAC EX105 63 dB Schalldruck oder Schallleistung?', 'lautstaerke'],
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,page+'#'+section,query);
 for(const query of ['Welchen Schlauch brauche ich beim PAC EX100?', 'Ist der N90 leiser als der EX105?'])
   assert(!searchEntries(index,query,'de')[0]?.entry.u.startsWith(page+'#'),query);
});
test('slow German laundry and rising room humidity reach the sourced next steps',()=>{
 const target='/waeschetrockner-oder-luftentfeuchter.html#waesche-messung-naechster-schritt';
 for(const query of [
  'Meine Wäsche trocknet trotz Entfeuchter langsam und die Raumfeuchte steigt. Was prüfen?',
  'Meine Wäsche trocknet im Keller langsam und es riecht muffig. Was tun?',
  'Die Luftfeuchte steigt beim Wäschetrocknen. Was soll ich messen?',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Welcher Wärmepumpentrockner braucht weniger kWh pro Ladung?',
  'Mein Trockner zeigt einen Fehlercode, das Flusensieb ist frei.',
  'Meine Wäsche bleibt feucht. Welches Flusensieb ist das Ersatzteil?',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('German Kärcher WD bag searches distinguish replacement bags, appliance variants and main filters',()=>{
 const target='/produkte.html#kaercher-wd3-wd4-filterbeutel';
 for(const query of [
  'Welche Vliesfilterbeutel passen zu meinem Kärcher WD 3 V-17/4/20?',
  'Passt der KFI 357 aus meinem Kärcher WD 3 auch in meinen WD 4?',
  'Welche Filterbeutel passen zum Kärcher WD 4 P V-20/5/22?',
  '2.863-314.0','4054278777689','2.863-006.0','4039784945241',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Welche Filterbeutel passen zum Kärcher WD 4-18 Dual Battery Set?',
  'Passt der KFI 487 in meinen Kärcher WD 4 Premium?',
  'Welchen Flachfaltenfilter brauche ich für meinen Kärcher WD 4 P V-20/5/22?',
  'Welchen Patronenfilter brauche ich für den Kärcher WD 3 V-17/4/20?',
  'Ich möchte den Kärcher WD 3 V-17/4/20 als komplettes Gerät kaufen.',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('Kärcher cartridge purchase queries resolve to the exact German comparison',()=>{
 const target='/produkte.html#kaercher-sc3-entkalkungskartusche';
 for(const query of [
  'Welche Entkalkungskartusche passt zum Kärcher SC 3 EasyFix 1.513-650.0?',
  'Passt die Entkalkungskartusche 2.863-018.0 in meinen Kärcher SC 3 EasyFix?',
  'Brauche ich die kleine Kartusche für Kärcher SC 1 Multi 1.516-404.0?',
  '28631040', '4054278026213',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Kärcher SC 3 EasyFix 1.513-650.0 kaufen',
  'Kärcher SC 3 EasyFix Kartusche zurücksetzen',
  'Mein Kärcher SC 3 EasyFix dampft nicht mehr, obwohl eine neue Entkalkungskartusche eingesetzt ist. Was tun?',
  'Wie stelle ich beim Kärcher SC 3 EasyFix mit Entkalkungskartusche die Wasserhärte ein?',
  'Ich möchte den Kärcher SC 3 EasyFix samt Kartusche als komplettes Gerät kaufen.',
  'Kärcher SC 2 EasyFix 1.512-600.0 Entkalkungskartusche',
  'Kärcher SC 3 Deluxe EasyFix Entkalkungskartusche',
  'Kärcher SC 1 Multi Comfort Kartusche',
  'Welche Kartusche gehört in meinen Kärcher SC 1 Multi & Up?',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('Low-load meter searches find the selected buying or measurement evidence',()=>{
 const target='/strommess-protokoll.html#kleine-lasten-messen';
 for(const query of [
  'Wie lange muss ich 0,5 Watt Standby messen, wenn mein Strommessgerät nur 0,01 kWh anzeigt?',
  'Mein Strommessgerät zeigt nach fünf Stunden immer noch 0,00 kWh. Verbraucht mein Gerät im Standby wirklich nichts?',
  'Wo kann ich ein Strommessgerät leihen, statt es zu kaufen?',
  'Messsteckdose zeigt 0 W im Standby',
  'Tapo P110 Eigenverbrauch und Messuntergrenze',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Was kostet 1 Watt Standby im Jahr?',
  'Steckdosenmessgerät 2300 W maximale Last prüfen',
  'Miele Backofen Standby Werte Ökodesign Verordnung',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('Portable AC winter-storage searches lead to the storage checklist for the exact market',()=>{
 const target='/guide/mobile-klimaanlage-ueberwintern.html#schritt-fuer-schritt-so-machst-du-das-geraet-winterfest';
 for(const query of [
  'Wie mache ich meine mobile Klimaanlage winterfest?',
  'Muss ich das Kondenswasser aus meiner mobilen Klimaanlage vor der Winterpause ablassen?',
  'Comfee MPPH-09CRN7 für den Winter einlagern',
  'Wie soll ich 4048164103065 im Winter lagern?',
  'Klimagerät einmotten: Wassertank leeren und im Keller lagern?',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Midea PortaSplit für den Winter einlagern',
  'Wie mache ich meine Auto-Klimaanlage winterfest?',
  'Wie mache ich die Klimaanlage im Pkw winterfest?',
  'Klimaanlage am Wohnwagen fürs Winterlager entleeren',
  'Wie mache ich die Monoblock-Wasserpumpe im Garten winterfest?',
  'Wie mache ich meine fest installierte Klimaanlage winterfest?',
  'Klimaanlage mit festem Außengerät winterfest machen',
  'Wasser läuft im Kühlbetrieb aus der Klimaanlage, nicht erst vor der Winterpause.',
  'Comfee MPPH-07CRN7 für den Winter lagern',
  'Luftentfeuchter für die Winterpause abstellen',
  'Kondenswasser vom Monoblock beim Kühlen ablassen',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 assert(!searchEntries(index,'mobile Klimaanlage winterfest','en').some(hit=>hit.entry.u===target));
});
test('An empty dehumidifier tank finds the troubleshooting section instead of a buying guide',()=>{
 const target='/guide/luftentfeuchter-zieht-kein-wasser.html#pruefen-bevor-du-ein-neues-geraet-kaufst';
 for(const query of [
  'Mein Luftentfeuchter läuft, aber der Tank bleibt leer. Was soll ich prüfen?',
  'Luftentfeuchter sammelt kein Wasser trotz laufendem Lüfter',
  'Warum zieht mein Entfeuchter kein Wasser?',
  'Wasserbehälter vom Luftentfeuchter ist immer leer',
  'Der Luftentfeuchter läuft, aber im Tank ist kein Wasser.',
  'Der Tank meines Luftentfeuchters füllt sich nicht mehr.',
  'MeacoDry Arete One 20L: Lüfter läuft, Tank bleibt leer',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Luftentfeuchter meldet Tank voll, obwohl der Behälter leer ist',
  'Luftentfeuchter: Der Tank bleibt leer, aber er meldet Tank voll',
  'Welches Entfeuchter Granulat brauche ich? Der Tank bleibt leer.',
  'Kann der Ablaufschlauch am Luftentfeuchter bergauf zum Waschbecken laufen?',
  'Klimaanlage läuft, aber der Tank bleibt leer',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('Vehicle 12 V heater questions find the socket check without redirecting AC repairs or other voltages', () => {
 const href='/guide/akku-heizluefter.html#auto-12v-steckdose';
 for(const query of ['Heizlüfter 12V Auto', 'Auto Heizlüfter 12 V 150 Watt', 'Autoheizlüfter 12 Volt Zigarettenanzünder']) {
  assert.equal(searchEntries(index,query,'de')[0]?.entry.u,href,query);
 }
 for(const query of ['Heizlüfter im Auto 24 V', '12 V Auto Heizlüfter reparieren', 'Was hält ein 18 V Akku-Heizlüfter durch?']) {
  assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,href,query);
 }
});
test('The vehicle socket check distinguishes above, below and exact documented load', () => {
 assert.deepEqual(compareSocketWatts(150,120),{difference:30,condition:'above'});
 assert.deepEqual(compareSocketWatts(150,180),{difference:-30,condition:'below'});
 assert.deepEqual(compareSocketWatts(120,120),{difference:0,condition:'equal'});
 assert.equal(compareSocketWatts(120,0),null);
 assert.equal(compareSocketWatts(NaN,120),null);
});
test('German heat and gas tariff queries lead to the existing guide calculator', () => {
 const href='/guide/klimaanlage-mit-heizfunktion.html#heizkosten-klimaanlage-gas';
 for(const query of ['Ist Heizen mit Klimaanlage günstiger als Gas?',
   'Welchen COP brauche ich bei 30 Cent Strom und 12 Cent Gas?',
   'Luft Luft Wärmepumpe oder Gas Arbeitspreis vergleichen',
   'Split-Klima günstiger als Gasheizung', 'Wärmepumpe statt Gas: Welcher Mindest-COP?']) {
  assert.equal(searchEntries(index,query,'de')[0]?.entry.u,href,query);
 }
 for(const query of ['Klimaanlage mit Heizfunktion Datenblatt', 'Kältemittel Gas in der Klimaanlage',
   'Förderung Klimaanlage oder Gasheizung Kosten','Gasheizung mit Wärmepumpe fürs Warmwasser vergleichen',
   'Wie teuer ist der Austausch meiner Gasheizung gegen eine Wärmepumpe?']) {
  assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,href,query);
 }
});
test('The heat and gas cost calculator compares the same useful heat', () => {
 const example=calculateGasHeatThreshold(30,12,90);
 assert.equal(example.threshold,2.25);
 assert.ok(Math.abs(example.gasHeatCost-13.333333333)<1e-8);
 assert.equal(calculateGasHeatThreshold(37.5,12.5,100).threshold,3);
 for(const fields of [[NaN,12,90],[30,0,90],[30,12,0],[30,12,105],[Number.MAX_VALUE,0.01,100]]) {
  assert.equal(calculateGasHeatThreshold(...fields),null);
 }
});
test('Infrared main heating and certificate searches land on the annual electricity decision',()=>{
 const target='/guide/infrarotheizung-ratgeber.html#jahreskosten-hauptheizung';
 for(const query of [
  'Infrarotheizung als einzige Heizung in der Wohnung: Wie hoch sind die Stromkosten pro Jahr?',
  'Kann ich die Jahreskosten meiner Infrarotheizung direkt aus dem Energieausweis berechnen?',
  'Infrarot-Elektro Heizung Heizwärmebedarf: Kann ich die Kosten abschätzen?',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Infrarotheizung 600 Watt Stromkosten pro Stunde',
  'Infrarotheizung an der Decke Montage',
  'Was kostet eine Infrarotheizung gegenüber einem Heizlüfter für 20 Minuten?',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('Final browser index preserves the public compatibility index byte-for-byte',()=>{
 const compatibilityIndex=readFileSync(new URL('../site/search-index.json',import.meta.url));
 assert(browsingIndex.equals(compatibilityIndex),'Built browser and compatibility search indices differ');
});
test('Tineco S7 search keeps model identity, FlashDry and repair separate',()=>{
 const guide='/guide/saugwischer-kaufberatung.html';
 for (const [query,anchor] of [
  ['Tineco S7','tineco-s7-modellwahl'],
  ['Tineco S7 FlashDry oder S7 Pro – welches Modell ist gemeint?','tineco-s7-modellwahl'],
  ['Tineco FLOOR ONE S7 FlashDry','tineco-s7-flashdry'],
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,guide+'#'+anchor,query);
 assert.equal(searchEntries(index,'Tineco saugt nicht mehr','de')[0]?.entry.u,'/guide/tineco-saugt-nicht-mehr.html');
 for (const query of ['Tineco S7 Pro kaufen','Tineco S7 FlashDry Pet','Tineco S7 Stretch Steam',
  'Tineco S7 FlashDry saugt nicht mehr','Tineco S7 FlashDry Zubehör Ersatzteile']) {
  assert(!searchEntries(index,query,'de').some(hit=>hit.entry.u.startsWith(guide+'#tineco-s7-')),query);
 }
});
test('German per-load cost searches link to the right calculator for the appliances named',()=>{
 const base='/waeschetrockner-oder-luftentfeuchter.html';
 const comparison=base+'#laundry-check';
 for (const query of [
  'Wärmepumpentrockner oder Luftentfeuchter: Was kostet eine Ladung Wäsche?',
  'Kondenstrockner und Luftentfeuchter: Stromverbrauch je Ladung vergleichen',
  'Wäschetrockner oder Luftentfeuchter – was kostet das Trocknen pro Ladung?',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,comparison,query);
 const single=base+'#luftentfeuchter-waesche-kosten';
 assert.equal(searchEntries(index,'Ohne Wärmepumpen-Trockner: Was kostet eine Wäscheladung nur mit dem Luftentfeuchter?','de')[0]?.entry.u,single);
 for (const query of [
  'Was kostet eine Ladung Wäsche bei Kondenstrockner und Luftentfeuchter gleichzeitig?',
  'Was kostet eine Wäscheladung einschließlich Anschaffung von Trockner oder Luftentfeuchter?',
  'Was kostet ein Luftentfeuchter im Keller pro Tag?',
 ]) {
  const result=searchEntries(index,query,'de')[0]?.entry.u;
  assert.notEqual(result,comparison,query);
  assert.notEqual(result,single,query);
 }
 const withoutSection=index.map(entry=>entry.u===base?{...entry,model_sections:[]}:entry);
 assert.notEqual(searchEntries(withoutSection,'Wärmepumpentrockner oder Luftentfeuchter: Was kostet eine Ladung Wäsche?','de')[0]?.entry.u,comparison);
});
test('German vacuum bundle questions reach the buying check without stealing bag-only questions',()=>{
 const offer='/produkte.html#beutelstaubsauger-angebote';
 for(const query of [
  'Ist beim Miele Guard M1 Parquet Flex die Parkettbürste dabei und welche Staubsaugerbeutel brauche ich?',
  'Miele Guard S1 oder Guard M1 Parquet Flex: Welches Angebot passt für Parkett mit Beuteln?',
  'Welche Beutel und Bodendüse sind beim Bosch BGBS2BA1P im Lieferumfang?',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,offer,query);
 assert.equal(searchEntries(index,'Welche Staubsaugerbeutel passen in den Miele Guard S1 und M1?','de')[0]?.entry.u,'/produkte.html#miele-staubsaugerbeutel');
 assert.notEqual(searchEntries(index,'Miele Guard S1 Performance oder Guard M1 Cat & Dog: Welche Bodendüse ist dabei?','de')[0]?.entry.u,offer);
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
test('German measurement questions prefer their published curtain and ventilation sections',()=>{
 const curtain='/guide/thermovorhang-ratgeber.html#thermovorhang-bahnenbedarf';
 const ventilation='/guide/richtig-lueften-im-winter.html#lueften-vorher-nachher';
 for(const [q,path] of [
  ['Wie viele Thermovorhänge brauche ich für ein 120 cm breites Fenster?',curtain],
  ['Wie viele Vorhangschals für meine Gardinenschiene?',curtain],
  ['Wie breit muss mein Thermovorhang sein, damit der Stoff in Falten fällt?',curtain],
  ['Hat Lüften geholfen? Vorher 20 Grad und 60 Prozent, danach 20 Grad und 50 Prozent Luftfeuchtigkeit.',ventilation],
  ['Luftfeuchtigkeit vor und nach dem Stoßlüften vergleichen',ventilation],
  ['Wie kann ich messen, ob der Raum nach dem Lüften wirklich trockener ist?',ventilation],
 ]){
  assert.equal(searchEntries(index,q,'de')[0]?.entry.u,path,q);
  assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===path),q);
 }
 for(const q of ['Wie viele Jahre hält ein Thermovorhang?', 'Kann ich den Thermovorhang vor dem Heizkörper aufhängen?',
  'Wie breit ist das Etikettmaß, pro Schal oder für die ganze Packung Thermovorhang?',
  'Wie viele Bahnen stecken in einer Packung dieses Thermovorhangs?',
  'Luftfeuchtigkeit draußen vor und nach dem Stoßlüften vergleichen',
  'Ist meine Wäsche nach dem Lüften trockener?', 'Soll ich meinen Keller bei feuchter Außenluft lüften?']){
  assert.ok(![curtain,ventilation].includes(searchEntries(index,q,'de')[0]?.entry.u),q);
 }
});
test('Glazing questions reach the existing comparison, while indoor glass keeps the measurement result',()=>{
 const glazing='/guide/fenster-beschlagen-aussen.html#aussen-innen-oder-dazwischen';
 for(const question of [
  'Meine Doppelverglasung ist zwischen den Scheiben blind. Wen rufe ich an?',
  'Zwischen den beiden Fensterscheiben ist Beschlag, weder innen noch außen lässt er sich wegwischen. Hilft ein Luftentfeuchter?',
  'Milchiger Schleier im Scheibenzwischenraum meiner Isolierverglasung. Was tun?',
 ]){
  assert.equal(searchEntries(index,question,'de')[0]?.entry.u,glazing,question);
  assert.ok(!searchEntries(index,question,'en').some(hit=>hit.entry.u===glazing),question);
 }
 assert.equal(searchEntries(index,'Warum beschlägt das geschlossene Fenster morgens innen?','de')[0]?.entry.u,
  '/guide/fenster-beschlagen-innen.html#fenstersauger-gegen-kondenswasser');
 for(const question of ['Wasser zwischen den Scheiben von meinem Backofen',
  'Mein Autofenster hat Beschlag zwischen den Scheiben',
  'Beschlag sitzt nicht zwischen den Scheiben. Wie messe ich innen die Feuchtigkeit?',
  'Fotopaar vergleichen, um Beschlag zwischen den Scheiben zu prüfen']){
  assert.notEqual(searchEntries(index,question,'de')[0]?.entry.u,glazing,question);
 }
});
test('German round window-panel cutout queries reach the verified sizing guide',()=>{
 const target='/guide/fensterabdichtung-selber-bauen.html#abluft-ausschnitt-pruefen';
 for(const question of ['Fensterplatte für mobile Klimaanlage: Welcher Randabstand bleibt um den runden Ausschnitt?',
  'Abluftplatte: kleinster Randabstand um das Loch','Klimagerät Hohlkammerplatte runder Ausschnitt und Flansch']){
  assert.equal(searchEntries(index,question,'de')[0]?.entry.u,target,question);
  assert.ok(!searchEntries(index,question,'en').some(hit=>hit.entry.u===target),question);
 }
 for(const question of ['Abluftplatte: rechteckiger Ausschnitt', 'mobile Klimaanlage Abluftplatte Fenstersicherung',
  'Abluftschlauch verlängern trotz Fensterplatte und Loch', 'Kann ich Kondenswasser durch ein Loch ablassen?']){
  assert.notEqual(searchEntries(index,question,'de')[0]?.entry.u,target,question);
 }
});
test('Bosch stacking questions reach the exact kit comparison and do not steal dryer tasks',()=>{
 const target='/produkte.html#waeschesaeule-zubehoer';
 for(const query of [
  'WTZ27400 oder WTZ27410: Welcher Verbindungssatz für den Bosch WQG241001 hat einen Auszug?',
  'Welchen Zwischenbaurahmen brauche ich für den Bosch WQG241001 auf meiner Waschmaschine?',
  'Reichen 55 cm Arbeitsplattentiefe für den Bosch WQG 241001?',
  'WTZ-27410',
 ]){
  const result=searchEntries(index,query,'de')[0]?.entry;
  assert.equal(result?.u,target,query);
  assert.match(result.d,/WTZ27400 hat eine ausziehbare Ablage.*WTZ27410 ist der Rahmen ohne Auszug.*über 55 cm.*warte mit der Bestellung/);
  assert.ok(!searchEntries(index,query,'en').some(hit=>hit.entry.u===target),query);
 }
 for(const query of [
  'Bosch WQG241001 WTZ1110 Kondensatablauf',
  'Bosch WQG241001 Stromverbrauch',
  'Passt WTZ27400 zum WQG241031?',
  'WQG241001 oder WQG233D01: Welcher Stapelrahmen passt?',
  'WTZ27400 defekt, Auszug reparieren',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});
test('German Klarstein package questions reach only the confirmed white 12K model',()=>{
 const target='/guide/klarstein-kraftwerk-smart-12k-test.html#kraftwerk-10034664-lieferumfang';
 for(const query of [
  "Was gehört beim Klarstein Kraftwerk Smart 12K zum Lieferumfang, brauche ich eine zusätzliche Fensterabdichtung?",
  "Klarstein Kraftwerk Smart 12K 10034664",
  "10034664",
  "Kraftwerk Smart 12K: Ist für mein Dreh-Kipp-Fenster eine Fensterabdichtung dabei?"
]){
  assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
  assert.ok(!searchEntries(index,query,'en').some(hit=>hit.entry.u===target),query);
 }
 for(const query of [
  "Klarstein Kraftwerk Smart 11500 BTU 10040189 Fensterabdichtung",
  "Kraftwerk Eco Smart 11.500 BTU Lieferumfang",
  "Klarstein Kraftwerk Smart 12K anthrazit Fensterabdichtung",
  "Klarstein Kraftwerk Smart 12K 10034664: Wie viel Strom verbraucht es?",
  "Klarstein Kraftwerk Smart 12K mit 10034667, welche Fensterabdichtung?"
]){
  assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 }
});
test('German direct-heating comparisons find the short-use answer',()=>{
 const target='/guide/heizkosten-vergleich-rechner.html#heizluefter-oder-infrarot';
 for(const query of [
  "Heizlüfter oder Infrarotheizung",
  "Was ist billiger: Heizlüfter 2000 W für 15 Minuten oder Infrarotpanel 600 W für eine Stunde?",
  "Was kostet Heizlüfter oder Infrarotheizung am Schreibtisch?"
]){
  assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
  assert.ok(!searchEntries(index,query,'en').some(hit=>hit.entry.u===target),query);
 }
 for(const query of [
  "Heizlüfter oder Infrarotheizung oder Klimaanlage zum Heizen?",
  "Welche IP44-Freigabe brauche ich für Heizlüfter oder Infrarotheizung im Bad?",
  "Heizlüfter defekt, Infrarotheizung als Ersatz reparieren?",
  "Sicherung fliegt bei Heizlüfter oder Infrarotheizung",
  "Wie viel Strom braucht mein Heizlüfter?"
]){
  assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 }
});
test('Showerhead flow-fit questions reach the measured-flow decision',()=>{
 const target='/guide/duschen-kosten-rechner.html#durchlauferhitzer-mindestdurchfluss';
 for(const query of [
  "Funktioniert ein Sparduschkopf an meinem hydraulischen Durchlauferhitzer?",
  "Der alte Durchlauferhitzer braucht 8 Liter pro Minute. Kann ich einen Duschkopf mit 6 l/min kaufen?",
  "Mein Durchlauferhitzer braucht 8 l/min Mindestdurchfluss. Passt eine Sparbrause mit 6 l/min?"
]){
  assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
  assert.ok(!searchEntries(index,query,'en').some(hit=>hit.entry.u===target),query);
 }
 for(const query of [
  "Was kostet ein achtminütiges Duschen mit Durchlauferhitzer und Sparbrause bei 6 l/min?",
  "Wie entkalke ich eine Sparbrause am Durchlauferhitzer?",
  "Welcher Duschkopfhalter passt neben meinen Durchlauferhitzer?",
  "Die neue Handbrause wackelt am Gewinde neben dem Durchlauferhitzer."
]){
  assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 }
});
test('German dishwashing cost questions open the existing exact calculation',()=>{
 const target='/geraete-austausch-rechner.html#geschirrspueler-handabwasch';
 for(const q of [
  'Ist Geschirrspüler oder Handabwasch billiger, wenn die Maschine 10 Liter braucht und ich von Hand 20 Liter brauche?',
  'Was kostet Abwaschen per Hand im Vergleich zum Geschirrspüler, mit warmem Wasser?',
  'Was kostet eine Spülmaschinenladung mit 10 Litern im Vergleich zum Handspülen mit 20 Litern warmem Wasser?',
 ]){
  assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
  assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===target),q);
 }
 for(const q of ['Geschirrspüler Wasseranschluss prüfen','Wie reinige ich den Filter meiner Spülmaschine?',
  'Warum dauert das Eco-Programm meiner Spülmaschine so lange?', 'Handwäsche Stromkosten für einen Wollpullover']){
  assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 }
});
test('Generic Danfoss adapter searches find the valve-identity guide without forcing model or repair queries',()=>{
 const target='/guide/smarte-heizkoerperthermostate-lohnen-sich.html#danfoss-altventil';
 for(const q of ['Passt ein smartes Heizkörperventil auf das alte Danfoss Klickventil?',
  'Alter Danfoss-Klickanschluss am Heizkörper, welchen Adapter brauche ich?',
  'Wie erkenne ich am alten Danfoss-Ventil ohne Gewinde, ob es RA oder RAV ist?']){
  assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
  assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===target),q);
 }
 for(const q of ['Welcher Adapter passt für Bosch II [+M] mit Danfoss RAVL?',
  'Passt tado X auf ein Danfoss RAV Ventil?', 'Welchen Danfoss-RAV-Adapter braucht mein FRITZ!DECT 302?',
  'Danfoss Heizkörperventil tropft am Klickanschluss. Wie repariere ich es?']){
  assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 }
});
test('all three German tool entry points link directly to the curtain measurement',()=>{
 const link='href="/guide/thermovorhang-ratgeber.html#thermovorhang-bahnenbedarf"';
 for(const page of ['index.html','tools.html','rechner.html']){
  const html=readFileSync(new URL('../site/'+page,import.meta.url),'utf8');
  assert.equal(html.split(link).length,2,page);
 }
 assert.ok(!readFileSync(new URL('../site/en/index.html',import.meta.url),'utf8').includes(link));
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
  ['Welcher Filter passt in den Philips HU3916/10?','philips-hu3916-10'],
  ['Ersatzfilter für Philips HU 3918 / 10','philips-hu3918-10'],
  ['Philips HU3918/10R1 Ersatzfilter',common],
  ['Philips HU3918/10 R1 Ersatzfilter',common],
  ['Philips HU3916 Filter ohne Modellendung',common],
  ['Philips Series 3000 Verdunsterfilter',common],
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
  'Ersatzfilter für Philips Series 3000 Luftreiniger AC3033','Wie oft soll ich den Filter vom Philips HU3918/10 reinigen?',
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

test('Siemens filter lookups open the verified E-Nr decision in German',()=>{
 const target='/produkte.html#siemens-eq6-intenza';
 for(const q of ['Wasserfilter für Siemens TE653501DE/13', 'TE654509DE / 12',
   'Siemens EQ.6 plus s400 Intenza Filterpatrone', '17008835', '17008836',
   'Welcher Filter passt zu TE653501DE?', 'Passt ein Wasserfilter zu TE654509DE/13?']){
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,target,q);
   assert.match(hits[0].entry.d,/Fehlt die Endung oder weicht sie ab/,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===target),q);
 }
 for(const q of ['Wie oft muss ich den Filter TE653501DE/13 wechseln?',
   'Bosch TIE20301 Filter TCZ7003','Vergleich Kaffeemaschine Siemens EQ.6 plus s300 s400']){
   assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===target),q);
 }
});

test('German offline thermostat questions open the two documented operating limits',()=>{
 const destination='/guide/smarte-heizkoerperthermostate-lohnen-sich.html#thermostat-ohne-internet';
 for(const q of ['Funktioniert mein Bosch Heizkörperthermostat II [+M] ohne Zentrale?',
   'FRITZ! 302 bei Internetausfall', 'Heizkörperthermostat offline ohne Internet']){
   assert.equal(searchEntries(index,q,'de')[0]?.entry.u,destination,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===destination),q);
 }
 for(const q of ['Welcher Danfoss Adapter passt zum FRITZ 302?', 'Smarte Steckdose ohne Internet']){
   assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===destination),q);
 }
});

test('German cooling sale questions open the retailer reference price check',()=>{
 const destination='/guide/klimaanlage-wann-kaufen.html#angebot-30-tage-preis';
 for(const q of ['black friday klimaanlage','Midea PortaSplit Black-Friday-Angebot prüfen',
  'Welchen Preis der letzten 30 Tage muss der Händler bei der Klimaanlage angeben?']){
   assert.equal(searchEntries(index,q,'de')[0]?.entry.u,destination,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===destination),q);
 }
 for(const q of ['Welcher Luftentfeuchter lohnt sich am Black Friday?', 'Klimaanlage 30 Tage im Jahr betreiben']){
   assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===destination),q);
 }
});

test('German passive absorber questions open the laundry purchase decision',()=>{
 const destination='/guide/luftentfeuchter-granulat-oder-elektrisch.html#granulat-waesche-entscheidung';
 for(const q of ['Reicht eine Granulatbox zum Wäschetrocknen?',
  'Granulat oder elektrischer Luftentfeuchter für nasse Wäsche',
  'Luftentfeuchter mit Granulat oder elektrisch?']){
   assert.equal(searchEntries(index,q,'de')[0]?.entry.u,destination,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===destination),q);
 }
 for(const q of ['Welche Tabletten passen in die PATTEX AERO 360?', 'Wie viel kostet eine Ladung Wäsche nur mit meinem Luftentfeuchter?']){
   assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===destination),q);
 }
});

test('German condensation behind a blind opens the glass measurement protocol',()=>{
 const anchor='/guide/luftfeuchtigkeit-richtig-messen.html#kondenswasser-hinter-plissee';
 for(const q of ['Warum ist mein Fenster hinter dem Plissee nass, obwohl das Hygrometer 50 % zeigt?',
  'Fensterscheibe hinter der Gardine beschlägt innen']) {
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,anchor,q);
   assert.match(hits[0].entry.d,/9,3 °C/,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===anchor),q);
 }
 for(const q of ['Fenster hinter dem Rollo beschlägt zwischen den beiden Scheiben',
  'Die Außenseiten der Fenster hinter dem Rollo sind nass',
  'Die Fenster im Wohnmobil sind von innen hinter den Rollos nass',
  'Warum beschlägt das geschlossene Fenster morgens innen?']) {
   assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===anchor),q);
 }
});

test('German exact N90 offer identity searches reach the existing model evidence',()=>{
 const page='/guide/delonghi-pac-n90-test.html';
 for(const q of [
   'DeLonghi PAC N90 ECO Silent',
   'De’Longhi Pinguino PAC N90 ECO Silent',
   "De'Longhi PAC-N90 ECO Silent",
   'PACN90 ECO Silent',
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
   'PAC N90',
   'PAC N90 ECO Silent 8004399512352',
   'DeLonghi PAC N90 ECO Silent Abluftschlauch zu kurz',
   'DeLonghi PAC N90 ECO Silent 64 dB',
   'Was kostet der N90 ECO Silent bei 35 Cent pro kWh laut Energielabel?',
   'Was kostet der PAC N90 ECO Silent?',
   'Welche EAN passt zum DeLonghi PAC EX105?',
   'Passt die Halterung zur Midea PortaSplit EAN 4048164116478?',
   'Was verbraucht das PAC N90 ECO Silent laut EAN 8004399512351 im Betrieb?',
   'PAC N90 mit EAN 8004399512351: Leistungsaufnahme in W?',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===page+'#testlage'),q);
});

test('German indoor window condensation queries find the existing measurement answer',()=>{
 const page='/guide/fenster-beschlagen-innen.html';
 const destination=page+'#fenstersauger-gegen-kondenswasser';
 for(const q of [
  'Warum beschlägt das geschlossene Fenster morgens innen?',
  'Jeden Morgen sind die Fensterscheiben im Schlafzimmer von innen nass. Was soll ich zuerst messen?',
  'Nach dem Schlafen ist die Innenscheibe nass, obwohl das Fenster zu war. Woran liegt das?',
  'Wieso läuft mein Schlafzimmerfenster innen morgens an?',
  'Kann das Fenster bei 20 Grad, 60 Prozent Luftfeuchte und 10 Grad am Glas von innen beschlagen?',
 ]) {
  const hits=searchEntries(index,q,'de');
  assert.equal(hits[0]?.entry.u,destination,q);
  assert.match(hits[0].entry.d,/Temperatur an der Innenscheibe gleichzeitig messen/,q);
  assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
  assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===destination),q);
 }
 for(const q of [
  'Mein Fenster beschlägt morgens von außen und innen ist es trocken.',
  'Meine Doppelverglasung ist zwischen den Scheiben beschlagen, innen und außen lässt sich nichts wegwischen.',
  'Meine Fensterscheibe beschlägt morgens. Innen oder außen kann ich nicht erkennen.',
  'Warum beschlägt die Windschutzscheibe meines Autos morgens von innen?',
  'Passt die schmale 170-mm-Düse für Kondenswasser zu meinem Kärcher WV 6?',
  'Von innen nasses Fenster am Schlauch meiner mobilen Klimaanlage.',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===destination),q);
 assert.equal(searchEntries(index,'Passt die schmale 170-mm-Düse für Kondenswasser zu meinem Kärcher WV 6?','de')[0]?.entry.u,
   '/produkte.html#kaercher-170mm-saugduese');
});

test('German cooling window-closure questions find the static decision answer',()=>{
 const page='/guide/klimaanlage-fenster-einbruchschutz.html';
 const destination=page+'#fenster-verschluss-pruefen';
 for(const q of [
   'Kann ich das Kippfenster mit der PortaSplit beim Verlassen der Wohnung verriegeln?',
   'PortaSplit Fenster abschließen und Wohnung verlassen',
   'Klimaanlage Kippfenster nachts geschlossen sicher verriegeln',
   'Kann ich das Fenster mit der Midea Porta-Split ganz schließen?',
   'Lässt sich mein Fenster mit der Leitung der PortaSplit noch richtig schließen?',
   'Lässt sich das Fenster laut Anleitung mit der PortaSplit noch verriegeln?',
   'Schließe ich das Fenster mit meinem Monoblock wirklich ab?',
   'Kann ich die Wohnung verlassen, wenn das Fenster für die Klimaanlage gekippt bleibt?',
 ]) {
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,destination,q);
   assert.match(hits[0].entry.d,/den Kauf zurückstellen/,q);
   assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===destination),q);
 }
 for(const q of [
   'Midea PortaSplit E: Kann ich das Fenster verriegeln?',
   'PortaSplit 4048164122301 Fenster abschließen',
   'Passt die PortaSplit-Halterung bei 60 mm Fensterfalz und geschlossenem Fenster?',
   'Wie dichtet man das Kippfenster für einen Monoblock ab?',
   'Wie viel Strom braucht die Klimaanlage nachts, wenn das Fenster ganz geschlossen ist?',
   'Wie laut ist die PortaSplit nachts im Schlafzimmer?',
   'Wie viel Strom verbraucht meine Klimaanlage bei verriegeltem Fenster?',
   'Wie laut ist die Klimaanlage bei verriegeltem Fenster?',
   'Meine PortaSplit läuft am Fenster. Wie verriegele ich die Fernbedienung für Kinder?',
   'Kann ich ohne mobile Klimaanlage die Wohnung verlassen, wenn das Fenster gekippt bleibt?',
   'Warum beschlägt das geschlossene Fenster morgens innen?',
   'Kann ich ohne Klimaanlage beim Verlassen der Wohnung das Fenster gekippt lassen?',
   'Die Lamellen meiner Klimaanlage schließen nicht mehr',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===destination),q);
});

test('German 40 m² cooling searches open the measured-volume decision',()=>{
 const destination='/guide/klimaanlage-40-qm.html#portasplit-40-qm';
 for(const q of [
  'Klimaanlage 40 m²','Klimaanlage offenes Wohnzimmer 40 qm','Midea PortaSplit für 40 qm',
  'Reicht die originale PortaSplit für 40m2 mit 2,80 m Deckenhöhe?',
 ]) {
  const first=searchEntries(index,q,'de')[0]?.entry;
  assert.equal(first?.u,destination,q);
  assert.match(first.d,/100 m³.+112 m³.+105 m³/,q);
  assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u===destination),q);
 }
 for(const q of [
  'Welche Klimaanlage für 140 m²?', 'Klimaanlage 40,5 qm',
  'PortaSplit für 40 qm oder 50 qm?', 'Wie viel Strom verbraucht eine Klimaanlage für 40 qm?',
  'Midea PortaSplit Cool für 40 qm', 'Klarstein Klimaanlage 40 qm',
  '40 qm Wohnung heizen', 'PortaSplit 40 qm: welchen Fensterfalz muss ich messen?',
 ]) assert.ok(!searchEntries(index,q,'de').some(hit=>hit.entry.u===destination),q);
});

test('German original PortaSplit lip questions open the existing guide measurement answer',()=>{
 const page='/guide/midea-portasplit-ausverkauft-alternativen.html';
 for(const q of [
   '4048164116478',
   'EAN 4048164116478',
   'Midea PortaSplit Original',
   'Midea Porta-Split EAN 4048164116478',
   'Mein Fensterfalz ist 6 cm breit. Muss ich bei der Midea PortaSplit die Gummidichtung beim Messen mitzählen?',
   'Muss ich den 60 mm breiten Fensterfalz für die PortaSplit-Halterung bei verriegeltem oder offenem Fenster messen?',
   'Muss ich beim Ausmessen des Fensterrahmens für die PortaSplit die Dichtung zusammendrücken oder mitmessen?',
   'Die PortaSplit passt nicht ans Fenster, wo muss ich die Rahmendicke messen?',
   'Meine originale Midea PortaSplit hat einen 60 mm breiten Fensterfalz. Passt die mitgelieferte Standardhalterung?',
   'Midea PortaSplit Standardhalterung passt an einen Falz mit 45 mm Breite und 20 mm Höhe?',
 ]) {
   const hits=searchEntries(index,q,'de');
   assert.equal(hits[0]?.entry.u,page+'#fensterfalz',q);
   assert.match(hits[0].entry.d,/4048164116478/,q);
   assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
   assert.ok(!searchEntries(index,q,'en').some(hit=>hit.entry.u.startsWith(page+'#')),q);
 }
 for(const q of [
   'Midea PortaSplit',
   '4048164122424',
   '4048164122301',
   'Midea PortaSplit E 4048164116478',
   'Midea PortaSplit Cool 4048164116478',
   'PortaSplit 4048164122424 Fensterfalz',
   'PortaSplit 4048164122301 Fensterfalz',
   'Midea PortaSplit Fensterfalz 4048164116478 oder 4048164122424',
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

test('coffee filter purchases lead to exact model evidence without replacing other filter routes',()=>{
  const page='/produkte.html';
  const anchor=page+'#kaffee-wasserfilter';
  for(const q of [
    'Mein Philips EP2220/10 braucht einen neuen Wasserfilter. Welche Patrone soll ich bestellen?',
    'Für die Bosch VeroCafe TIE20301: Passt der Wasserfilter TCZ7033 oder muss ich TCZ7003 kaufen?',
    'Ich habe eine DeLonghi Magnifica S ECAM22.110.B. Welchen Ersatzfilter für den Wassertank brauche ich?',
    'Passt der DLSC002 in meine DeLonghi ECAM22.110.B?',
    'EP2231/40 AquaClean: passt die Patrone CA6903/10?',
    'Bosch TIE20301. Welcher Wasserfilter?',
  ]){
    const hits=searchEntries(index,q,'de');
    assert.equal(hits[0]?.entry.u,anchor,q);
    assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
    assert.ok(searchEntries(index,q,'en').every(hit=>hit.entry.u!==anchor),q);
  }
  for(const q of [
    'Philips EP2220/10 AquaClean blinkt orange: Filter kaufen?',
    'DeLonghi ECAM22.110.B seit drei Wochen nicht benutzt: Wasserfilter wechseln?',
    'Welcher Wasserfilter für EP2220 ohne Suffix?',
    'Mein Bosch TIE20301/02 braucht einen neuen Wasserfilter.',
    'DeLonghi ECAM22.110.SB Ersatz-Wasserfilter kaufen',
    'Nicht die Philips EP2220/10, sondern EP2220/12: passt AquaClean CA6903/10?',
    'Passt der Filter in den Philips EP2220/10 oder Bosch TIE20301?',
  ]) assert.ok(searchEntries(index,q,'de').every(hit=>hit.entry.u!==anchor),q);
  assert.equal(searchEntries(index,'Welchen Ersatzfilter brauche ich für mein Levoit Core 300S ohne Pro?','de')[0]?.entry.u,'/ersatzfilter.html#levoit-core-300s');
});

test('German complete 170-mm Kärcher nozzle offers reach the dedicated section of the product catalogue',()=>{
  const page='/produkte.html';
  const anchor=page+'#kaercher-170mm-saugduese';
  for(const q of [
    'Ich möchte für meinen Kärcher WV 8 Signature Line eine komplette schmale Absaugdüse mit 170 mm nachkaufen. Welche Artikelnummer passt?',
    'Passt die schmale 17-cm-Saugdüse an den WV 3 Comfort Precision+ Black? Ich brauche den ganzen Kopf, nicht nur die Gummilippe.',
    'Passt eine Absaugdüse 2.633-512.0 an mein WV 6 + KV 4 Set?', '2.633-112.0', 'Kärcher 26335320', 'Passt 26336050 an meinen WV 3?',
    'Früher hatte ich den Bosch GlassVAC, jetzt nutze ich den Kärcher WV 8. Welche schmale Absaugdüse brauche ich?',
    'Früher hatte ich den Bosch GlassVAC, jetzt nutze ich den Kärcher WV 6 Plus. Welche schmale Absaugdüse passt?',
  ]){
    const hits=searchEntries(index,q,'de');
    assert.equal(hits[0]?.entry.u,anchor,q);
    assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
    assert.ok(searchEntries(index,q,'en').every(hit=>hit.entry.u!==anchor),q);
  }
  for(const q of [
    '170 mm', 'Wie breit darf die Düse beim WV 3 für mein 170 mm breites Sprossenfenster sein?',
    'WV 3: Passt die 170-mm-Lippe 2.633-104.0?', 'Ist die Abziehlippe 2.633-513.0 die schmale Düse?',
    'Mein WV 8 zieht mit der 170-mm-Düse Streifen', 'Die LED an meinem WV 3 mit schmaler Saugdüse blinkt.',
    'Früher hatte ich den WV 8 mit schmaler Absaugdüse, jetzt nutze ich Bosch GlassVAC. Welche schmale Düse passt?',
  ]) assert.ok(searchEntries(index,q,'de').every(hit=>hit.entry.u!==anchor),q);
  for(const q of [
    'Meine Scheibe ist 170 mm breit, beim WV 8 sind links und rechts je 5 mm Luft nötig. Passt die schmale Saugdüse?',
    'Beim Kärcher WV 3: Passt der Saugkopf 2.633-605.0 zwischen meine Sprossen mit 170 mm Glasbreite?',
  ]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,page+'#fenstersauger-duesenbreite',q);
});

test('German Trotec HEPA filter purchase and generation queries retain the existing single canonical guide',()=>{
  const page='/guide/trotec-luftentfeuchter-test.html';
  const anchor=page+'#ttk70-hepa-filter';
  for(const q of [
    'Welcher HEPA-Ersatzfilter passt zu meinem Trotec TTK 70 HEPA? Auf dem Typenschild steht Dezember 2023.',
    'Mein Trotec TTK 70 HEPA Plus ist Baujahr 2024. Passt 7710000024 oder 7710000077?',
    'TTK70HEPA: Ist 7710000080 ein Ersatz für den HEPA-Filter 7710000077?',
    'Welcher Filter für TTK70HEPAPlus?', '7710000024', 'Trotec 7.710.000.077',
  ]){
    const hits=searchEntries(index,q,'de');
    assert.equal(hits[0]?.entry.u,anchor,q);
    assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
    assert.ok(searchEntries(index,q,'en').every(hit=>hit.entry.u!==anchor),q);
  }
  for(const q of [
    'Wie oft muss ich den Filter in meinem Trotec TTK 70 HEPA reinigen?',
    'Muss ich beim TTK 70 HEPA den Filter alle sechs Monate wechseln?', 'Wie lange hält der Filter im TTK 70 HEPA?',
    'Wann muss ich meinen Filter im TTK 70 HEPA wechseln?', 'TTK 70 HEPA: Filterwechsel alle zwei Monate?',
    'Wie viel Strom braucht der TTK 70 HEPA mit Filter?', 'TTK 70 HEPA Plus: Staubvorfilter 7710000080',
    'Trotec 77100000240', 'A7710000077', 'Welcher Filter für Philips HU2716/10?',
    'Passt 7710000024 in den TTK 72 E?', 'Welcher Filter für den TTK 70 HEPA Pro?',
    'Vorher hatte ich einen TTK 70 HEPA, jetzt habe ich einen Meaco Arete One. Passt 7710000077?',
    'Früher Trotec TTK 70 HEPA, jetzt Comfee MDDF. Ist 7710000024 der richtige Filter?',
    'Welcher Filter passt zum TTK 70 HEPA Deluxe? Angebot 7710000077.',
    'Passt 7710000077 für den TTK 70 HEPA Plus 2.0?', 'TTK 70 HEPA Plus Deluxe mit 7710000077?',
    'Für meinen Trotec TTK 70 HEPA Plus brauche ich nur einen Staub-Filter als Ersatzfilter.',
    'Trotec TTK 75 ECO, ist dieser Filter gleich wie beim TTK 70 HEPA?',
  ]) assert.ok(searchEntries(index,q,'de').every(hit=>hit.entry.u!==anchor),q);
  assert.equal(searchEntries(index,'TTK 75 ECO 10 Grad 60 Prozent Keller Liter pro Tag','de')[0]?.entry.u,page+'#ttk75-pruefpunkt');
});

test('Miele HyClean one-device and shared-stock questions reach a single German catalogue section',()=>{
  const page='/produkte.html', target=page+'#miele-staubsaugerbeutel';
  for(const q of [
    'Welcher Beutel für Miele Guard L1: TU oder CO?',
    'Ist 12557080 das richtige Originalpaket für den Miele Guard M1, und was ist drin?',
    'Ist bei der Originalpackung TU 12557060 für Miele Guard L1 auch der AirClean Abluftfilter drin?',
    'Ich habe einen Miele Guard M1 Parquet Flex. Passen meine alten GN-Beutel oder brauche ich CO oder TU?',
    'Auf meinem Miele steht nur C2. Kann ich GN oder FJM bestellen?',
    'Auf dem Schild steht nur C2. Compact C2 oder Complete C2, welchen Staubsaugerbeutel brauche ich?',
    'Passen die Beutel vom Miele Guard S1 auch in den Guard L1, oder muss ich andere kaufen?',
    'Passen meine Beutel vom Miele Complete C3 auch in den neuen Guard M1?',
    'Gemeinsamer Vorrat für Miele Guard M1 und Complete C3: CO oder GN und Abluftfilter?',
    'Haben Miele Complete C2 und Compact C2 denselben Beuteltyp?',
  ]){
    const hits=searchEntries(index,q,'de');
    assert.equal(hits[0]?.entry.u,target,q);
    assert.equal(hits.filter(hit=>hit.entry.u.split('#')[0]===page).length,1,q);
    assert.ok(searchEntries(index,q,'en').every(hit=>hit.entry.u!==target),q);
  }
  for(const q of [
    'Miele Guard L1: Beutelanzeige leuchtet rot, obwohl der Beutel kaum voll ist.',
    'Miele Guard L1: Filterwechselanzeige nach dem Wechsel zurücksetzen',
    'Welcher HEPA-Abluftfilter passt beim Miele Compact C2?',
    'Wie viele Beutel und Filter sind im Miele GN XXL 12498270?',
    'Wie wechsle ich den Beutel beim Miele Guard M1?', 'Wann muss ich den Beutel für Guard M1 wechseln?',
    'Mein Miele Guard L1 hat einen neuen TU-Beutel, aber der Deckel schließt nicht.',
    'Welcher Beutel passt auf einen Bosch Staubsauger?', 'TU oder CO?', 'Miele Boost CX1 Beutel kaufen?',
  ]) assert.ok(searchEntries(index,q,'de').every(hit=>hit.entry.u!==target),q);
});

test('German exact humidifier part questions use the owned accessory section', () => {
 assert.equal(searchEntries(index,'Oskar O-020 und Oskar little O-060: Wie viele O-030 Zweierpacks brauche ich für beide?','de')[0]?.entry.u,'/guide/luftbefeuchter-ratgeber.html#ersatzteile-zuordnen');
  const guide = '/guide/luftbefeuchter-ratgeber.html';
  const target = guide + '#ersatzteile-zuordnen';
  for (const query of [
    'Welche Filtermatten passen zum Stadler Form Oskar O-020?',
    'Welche Filtermatte brauche ich für den Oskar little O-060?',
    'Passen die O-030 Filtermatten zum Oskar O-020 und zum Oskar little O-060?',
    'Passt der Ersatzfilter 110005 in meinen Beurer LB 200?',
    'Welche Kalkpads soll ich für den Beurer LB 55 kaufen: Artikel 163141?',
  ]) {
    const matches = searchEntries(index,query,'de');
    assert.equal(matches[0]?.entry.u,target,query);
    assert.equal(matches.filter(hit => hit.entry.u.split('#')[0] === guide).length,1,query);
    assert.ok(!searchEntries(index,query,'en').some(hit => hit.entry.u === target),query);
  }
  for (const query of [
    'Welchen Ersatzfilter brauche ich für meinen Luftbefeuchter?',
    'Passt der Ersatzfilter 110005 in meinen Beurer LB 300?',
    'Welcher Filter passt zum Oskar big O-040?',
    'Wie reinige ich meinen Beurer LB 55?',
  ]) assert.ok(!searchEntries(index,query,'de').some(hit => hit.entry.u === target),query);
  assert.equal(searchEntries(index,'Welcher Ersatzfilter passt zum Philips HU4803/01?','de')[0]?.entry.u,
    guide + '#philips-hu4803-01');
});

test('German Bosch Dry 4000 identity and equipment questions open the exact model card', () => {
  const target = '/guide/luftentfeuchter-ratgeber.html#modell-bosch-d4000-eu';
  for (const query of [
    'Bosch Dry 4000', 'D4000-EU', '7733703558', '4069143047774',
    'Ist 7733703558 die deutsche Ausführung des Bosch Dry 4000?',
    'Wie groß ist der Wassertank beim Bosch Dry 4000 D4000-EU?',
    'Ist beim Bosch Dry 4000 ein Ablaufschlauch im Lieferumfang?',
  ]) {
    const hits = searchEntries(index,query,'de');
    assert.equal(hits[0]?.entry.u,target,query);
    assert.equal(hits.filter(hit => hit.entry.u.split('#')[0] === target.split('#')[0]).length,1,query);
    assert.ok(!searchEntries(index,query,'en').some(hit => hit.entry.u === target),query);
  }
  for (const query of [
    'Bosch Air 4000', 'Bosch Dry 4000 D4000-UK',
    'Bosch Dry 4000 D4000-EU EAN 4069143047781',
    'Bosch Dry 4000 im kalten Keller: Wie viele Liter schafft er bei 10 °C und 60 % Luftfeuchte?',
    'Kann der Ablaufschlauch vom Bosch Dry 4000 bergauf ins Waschbecken laufen?',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);

  const hose = 'Der Ablaufschlauch von meinem Entfeuchter geht über eine Schwelle. Reicht der tiefere Bodenablauf?';
  assert.equal(searchEntries(index,hose,'de')[0]?.entry.u,'/guide/luftentfeuchter-keller.html#ablauf-vor-kauf');
});

test('German seasonal lighting cost questions open the net timer comparison', () => {
  const guide = '/guide/lichterkette-stromkosten.html';
  const target = guide + '#zeitschaltuhr-strombilanz';
  for (const query of [
    'Lohnt sich eine Zeitschaltuhr für Weihnachtsbeleuchtung?',
    'Was kostet eine LED-Lichterkette pro Stunde, Tag und Weihnachtszeit?',
    'Adventbeleuchtung Stromkosten', 'Adventsbeleuchtung Stromkosten',
    'Baumbeleuchtung Stromkosten', 'Weihnachtsbeleuchtung Stromkosten',
  ]) {
    const hits = searchEntries(index,query,'de');
    assert.equal(hits[0]?.entry.u,target,query);
    assert.equal(hits[0].entry.t,'Weihnachtsbeleuchtung: Spart eine Zeitschaltuhr Strom?',query);
    assert.equal(hits.filter(hit => hit.entry.u.split('#')[0] === guide).length,1,query);
    assert.ok(!searchEntries(index,query,'en').some(hit => hit.entry.u === target),query);
  }
  for (const query of [
    'Zeitschaltuhr', 'Was kostet die Hausbeleuchtung pro Tag?',
    'Was kostet ein Heizlüfter mit Zeitschaltuhr?',
    'Wie installiere ich die Weihnachtsbeleuchtung im Außenbereich sicher?',
    'Lichterkette Timer Einschaltfenster 6 Stunden, wie viele gewünschte Einschaltminuten?',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('German Comfee variant and identifier lookups open the cellar model card', () => {
  const page = '/guide/luftentfeuchter-keller.html';
  const card = page + '#modell-comfee-mddf20';
  for (const query of [
    'Comfee MDDF-20DEN7', 'Comfee MDDF-20DEN7-WF', '10000651', '10000726',
    '4048164103010', '4048164103485',
    'Wie unterscheiden sich Comfee MDDF-20DEN7 und MDDF-20DEN7-WF?',
  ]) {
    const hits = searchEntries(index,query,'de');
    assert.equal(hits[0]?.entry.u,card,query);
    assert.equal(hits[0].entry.t,'Comfee MDDF-20DEN7 oder WF: Modell und EAN prüfen',query);
    assert.equal(hits.filter(hit => hit.entry.u.split('#')[0] === page).length,1,query);
  }
  for (const query of [
    'Comfee MDDF-16DEN7', 'Comfee MDDF3-20DEN7-WF',
    'Wie viele Liter zieht ein Comfee MDDF-20DEN7 bei 10 °C und 60 % aus meinem Keller?',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,card,query);
  const uphill = 'Geht der Ablauf beim Comfee MDDF-20DEN7 auch bergauf bis zum Waschbecken?';
  assert.equal(searchEntries(index,uphill,'de')[0]?.entry.u,page + '#ablauf-vor-kauf',uphill);
  assert.ok(!searchEntries(index,'Comfee MDDF-20DEN7-WF','en').some(hit => hit.entry.u === card));
});

test('German room heat sizing opens the watt calculator without rerouting operating costs', () => {
  const target = '/guide/infrarotheizung-watt-rechner.html#watt-rechner-raumgroesse-und-daemmung-eingeben';
  for (const query of [
    'Wie viel Watt Infrarotheizung brauche ich für 18 m² im Altbau?',
    'Wie viel Heizleistung in Watt braucht mein Zimmer mit 18 Quadratmetern und schlechter Dämmung?',
  ]) {
    assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
    assert.ok(!searchEntries(index,query,'en').some(hit => hit.entry.u === target),query);
  }
  for (const [query,expected] of [
    ['Wie viel Strom verbraucht eine Infrarotheizung als Hauptheizung im Jahr?',
      '/guide/infrarotheizung-ratgeber.html#jahreskosten-hauptheizung'],
    ['Was ist billiger: Heizlüfter 2000 W für 15 Minuten oder Infrarotpanel 600 W für eine Stunde?',
      '/guide/heizkosten-vergleich-rechner.html#heizluefter-oder-infrarot'],
  ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,expected,query);
  for (const query of [
    'Infrarotheizung 600 Watt Stromkosten pro Stunde',
    'Wie viel Watt Infrarotheizung brauche ich nur am Schreibtisch in meinem 18 m² großen Zimmer?',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('German plug thermostat compatibility searches open the infrared panel check', () => {
  const target = '/guide/infrarotheizung-thermostat.html#belastbarkeit-die-zahl-auf-dem-thermostat';
  for (const query of [
    'Funktioniert mein Infrarotpanel am Steckdosenthermostat nach einem Stromausfall wieder?',
    'Passt das Steckdosenthermostat W2022 zur Heidenfeld HP100-1?',
  ]) {
    assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
    assert.ok(!searchEntries(index,query,'en').some(hit => hit.entry.u === target),query);
  }
  const yearly = 'Wie viel Strom verbraucht eine Infrarotheizung als Hauptheizung im Jahr?';
  assert.equal(searchEntries(index,yearly,'de')[0]?.entry.u,
    '/guide/infrarotheizung-ratgeber.html#jahreskosten-hauptheizung',yearly);
  const sensor = 'Wo soll der Raumtemperaturfühler für mein Infrarotpanel sitzen?';
  assert.notEqual(searchEntries(index,sensor,'de')[0]?.entry.u,target,sensor);
});

test('German Bosch WTH83V03 drain questions open the exact hose evidence', () => {
  const target = '/produkte.html#bosch-wth83v03-kondensatablauf';
  for (const query of [
    'Kann ich beim Bosch WTH83V03 das Kondenswasser mit WTZ1110 direkt ableiten?',
    'Bosch WTH83V03/01: Ablaufschlauch im Lieferumfang oder Wassertank?',
  ]) {
    assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
    assert.ok(!searchEntries(index,query,'en').some(hit => hit.entry.u === target),query);
  }
  for (const query of [
    'Bosch WQG241001 WTZ1110 Kondensatablauf',
    'Bosch WTH83V03 Energieetikett: Wie viele kWh pro 100 Trocknungen?',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);

  const stacking = 'WTZ27400 oder WTZ27410: Welcher Verbindungssatz für den Bosch WQG241001 hat einen Auszug?';
  assert.equal(searchEntries(index,stacking,'de')[0]?.entry.u,'/produkte.html#waeschesaeule-zubehoer',stacking);
});

test('German Bosch WQG235D00 care questions distinguish one model from comparing condensers', () => {
  const care = '/produkte.html#bosch-wqg235d00-filterpflege';
  const comparison = '/produkte.html#entscheidung-waeschetrockner';
  for (const [query,path] of [
    ['Muss ich beim Bosch WQG235D00 das Flusensieb reinigen, obwohl der Kondensator selbstreinigend ist?',care],
    ['Bosch WQG235D00: Ersetzt der selbstreinigende Kondensator die Filterpflege?',care],
    ['Bosch WQG235D00 oder WQG241001: Welchen Kondensator muss ich reinigen?',comparison],
    ['Kann ich beim Bosch WTH83V03 das Kondenswasser mit WTZ1110 direkt ableiten?',
      '/produkte.html#bosch-wth83v03-kondensatablauf'],
  ]) {
    assert.equal(searchEntries(index,query,'de')[0]?.entry.u,path,query);
    assert.ok(!searchEntries(index,query,'en').some(hit => hit.entry.u === path),query);
  }
  for (const query of [
    'Bosch WQG235D00 Energieetikett: Wie viele kWh pro 100 Trocknungen?',
    'Bosch WQG241001 WTZ1110 Kondensatablauf',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,care,query);
});

test('wet balcony door threshold questions reach the existing moisture guide', () => {
  const destination = '/guide/fenster-beschlagen-innen.html#balkontuer-schwelle-kondenswasser';
  for (const query of [
    'Kondenswasser unter Balkontür bei 21 Grad und 50 Prozent – Vermieter informieren?',
    'Wasser auf der Aluschwelle innen an der Balkontür, ist das Kondenswasser oder kommt Regen rein?',
  ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,destination,query);
  for (const query of [
    '18 Grad und 50 Prozent Luftfeuchte im Schlafzimmer',
    'Schafft mein Saugroboter die Schwelle zur Balkontür?',
    'Welche Dichtung soll ich für die Balkontür kaufen?',
    'Kann das Fenster bei 20 Grad, 60 Prozent Luftfeuchte und 10 Grad am Glas von innen beschlagen?',
  ]) assert.ok(!searchEntries(index,query,'de').some(hit=>hit.entry.u===destination),query);
});

test('German sweating and wet morning windows find the existing moisture answer', () => {
  const target='/guide/fenster-beschlagen-innen.html#fenstersauger-gegen-kondenswasser';
  for(const query of [
    'Warum schwitzt mein Schlafzimmerfenster morgens nur unten an der Innenseite?',
    'Mein Fenster schwitzt an der Innenseite unten am Rand, obwohl das Hygrometer im Schlafzimmer 45 Prozent zeigt. Brauche ich einen Entfeuchter?',
    'Jeden Morgen sind meine Fenster jetzt komplett nass.',
  ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
  for(const query of [
    'Das Fenster schwitzt außen, innen bleibt es trocken.',
    'Warum schwitzt die Scheibe zwischen den Scheiben?',
    'Ich schwitze nachts innen am Fenster.',
    'Mein Autofenster schwitzt innen.',
    'Fenster schwitzt innen hinter dem Plissee.',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('persistent German indoor humidity reaches the existing ventilation measurement guide', () => {
  const target='/guide/richtig-lueften-im-winter.html#lueften-vorher-nachher';
  for(const query of [
    'Luftfeuchtigkeit trotz Lüften immer durchschnittlich um die 65% - was tun?',
    'Die Luftfeuchtigkeit steigt nach dem Stoßlüften wieder. Was soll ich messen?',
    'Im Schlafzimmer ist die Luftfeuchte trotz regelmäßigem Querlüften weiter hoch.',
  ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
  for(const query of [
    'Wie lüfte ich bei hoher Luftfeuchtigkeit draußen?',
    'Im Keller steigt die Luftfeuchtigkeit nach dem Lüften wieder.',
    'Trotz Stoßlüften bleibt die feuchte Wand nass. Schimmel an der Wand?',
    'Morgens sind meine Fenster innen komplett nass.',
  ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('German reference-room heating questions reach the existing cold radiator guide', () => {
 const target='/guide/heizkoerper-wird-nicht-warm.html#referenzraum-warm-nebenraum-kalt';
 for(const query of [
 'Das Thermostat im Wohnzimmer ist auf 21 Grad, dort ist es warm. Im Schlafzimmer bleibt die Heizung kalt trotz Stufe 5. Was tun?',
 'Immer wenn das Wohnzimmer warm genug ist und das Raumthermostat abschaltet, wird das Bad nicht mehr warm. Brauche ich smarte Heizkörperthermostate?',
 'Das Raumthermostat im Schlafzimmer schaltet ab, sobald es dort warm genug ist. Warum wird im Wohnzimmer der Heizkörper nicht mehr warm?',
]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
 'Mein Heizkörper gluckert und wird unten nicht warm.',
 'Welcher Danfoss-Adapter passt zum Bosch II [+M]?',
 'Wettergeführte Heizung mit Wandthermostat: Wohnzimmer ist warm, Bad bleibt kalt. Wie prüfe ich die Heizkurve?',
 'Wie viel Heizkosten kann ich mit smarten Heizkörperthermostaten sparen?',
]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('German Lukas L-031E cold performance reaches exact evidence without stealing other models', () => {
  const target='/guide/luftentfeuchter-keller.html#modell-stadler-lukas';
  for(const q of [
    'Stadler Form Lukas L-031E: Wie viele Liter entzieht er bei 10 °C und 60 Prozent im Keller?',
    'Kann ich den Stadler Form Lukas weiss L-031E bei 5 Grad im Keller benutzen?',
    'Stadler Form Lukas L‑031E: Entfeuchtungsleistung im kalten Keller?',
  ]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
  for(const q of [
    'Was leistet der Lukas little bei 10 Grad im Keller?',
    'Stadler Lukas Pro oder Lukas L-031E: Welche Leistung bei 10 Grad im Keller?',
    'Stadler Form Lukas L-031E: Welcher Schlauch passt für den kalten Keller?',
    'Stadler Form Lukas L-031E: HEPA-Filter für Betrieb im Keller',
  ]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German laundry cost questions without room for a dryer lead to single-run evidence',()=>{
 const target='/waeschetrockner-oder-luftentfeuchter.html#luftentfeuchter-waesche-kosten';
 for(const q of ["Was kostet es, Wäsche mit einem Luftentfeuchter zu trocknen? Ein Trockner kommt wegen Platzmangel nicht infrage.", "Luftentfeuchter 400 W zum Wäschetrocknen – Stromkosten? Ein Wäschetrockner passt bei uns nicht.", "Mein Luftentfeuchter hat laut Typenschild 400 Watt. Was kostet eine Ladung Wäsche?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Wärmepumpentrockner oder Luftentfeuchter: Was kostet eine Ladung Wäsche?", "Lohnt sich ein Luftentfeuchter im Winter, wenn manche Ladungen weiter in den Trockner gehen?", "Was kostet eine Ladung Wäsche, wenn Trockner und Luftentfeuchter gleichzeitig laufen?", "Was kostet der Luftentfeuchter mit 400 W pro Tag im Keller?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German EX105 identity searches reach the exact offer check without redirecting nearby models',()=>{
 const target='/guide/pinguino-pac-ex105-test.html#ex105-angebot';
 for(const query of ["Welche EAN hat der De’Longhi PAC EX105 A+++?", "PAC EX105 kaufen: Im Angebot steht 0151454025 und PAC EX93. Passt es?", "Welches Gerät hat die EAN 8004399026445?"]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of ["Welche EAN hat der PAC EX93 Extreme?", "Welches Fensterkit passt zum PAC EX105 am Kippfenster?", "Sind die 63 dB beim PAC EX105 Schallleistung?", "Welche EAN hat der PAC N90?"]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('German MPPH-09CRN7 buyers reach the exact window and model checks',()=>{
 const target='/guide/comfee-mpph-09crn7-test.html#comfee-angebot';
 for(const q of ["Welche EAN hat das Comfee MPPH-09CRN7?", "Kann ich das Comfee MPPH-09CRN7 für mein Kippfenster kaufen?", "Welches Gerät hat die EAN 4048164103065?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Welches Fensterkit passt zum Comfee MPPHA-09CRN7?", "Welche EAN hat das Comfee MPPH-08CRN7?", "Welche EAN hat der Comfee MDDF-20DEN7?", "Comfee MPPH-09CRN7 oder PAC EX105 kaufen?", "Wie soll ich 4048164103065 im Winter lagern?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German PortaSplit defrost searches reach the operating guide without redirecting other models and tasks',()=>{
 const target='/guide/klimaanlage-mit-heizfunktion.html#portasplit-abtauen';
 for(const q of ["Midea PortaSplit Heizmodus: Außengerät vereist bei null Grad, ist der Abtauzyklus normal?", "Meine Porta Split ist beim Heizen außen gefroren. Ist das normal?", "PortaSplit beim Heizen: Wie lange dauert das Abtauen?", "4048164116478: Außeneinheit vereist, wie lange dauert Defrost?", "Midea PortaSplit: Außengerät vereist, das Innengerät bläst langsamer, ist das normal beim Heizen?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Wie messe ich den Fensterfalz für meine Midea PortaSplit?", "PortaSplit Cool Außengerät vereist. Wie lange dauert das Abtauen?", "PortaSplit-E ist beim Heizen vereist.", "PortaSplit: Innengerät friert im Kühlbetrieb ein.", "Wie mache ich meine mobile Klimaanlage winterfest?", "Wie viel kostet das Heizen mit einer Klimaanlage im Vergleich zu Gas?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German DD8L Pro cold-garage questions lead to exact test and installation evidence',()=>{
 const target='/guide/luftentfeuchter-keller.html#meaco-dd8l-pro-kalte-garage';
 for(const q of ["Ist der Meaco DD8L Pro für meine unbeheizte Garage bei 5 °C geeignet?", "Meaco DD8L Pro bei 3, 5 und 10 Grad in einer unbeheizten Garage: Welche Leistung?", "Meaco DD8L Pro 10 °C und 60 Prozent, wie viel Liter und Watt?", "Meaco DD8L Pro mit Dauerablauf und Wandhalterung in der Garage?", "DD8LPro: Welcher Luftstrom wird für den Kauf angegeben?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Wie viel Wasser schafft der Meaco DD8L Junior bei 10 °C im Keller?", "Meaco DD8L ION oder DD8L Pro für die kalte Garage?", "Ist der Meaco DD8L Zambezi für meine Garage passend?", "Der Meaco DD8L Pro läuft im Keller, aber der Tank bleibt leer.", "Wie verbinde ich die App beim Meaco DD8L Pro in der Garage?", "Stadler Form Lukas L-031E: Wie viele Liter entzieht er bei 10 °C und 60 Prozent im Keller?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German Saros 10R floor preparation questions reach the exact manual and existing buying path',()=>{
 const target='/guide/saugroboter-kaufberatung.html#saros-10r-fahrweg';
 for(const q of ["Erkennt der Roborock Saros 10R Kabel, Socken und Katzenspielzeug?", "Muss ich beim Roborock Saros 10R vor jedem Saugen Ladekabel wegräumen?", "Roborock Saros 10R für Kurzflorteppich und Katzenhaare: Wie viel räume ich vorher auf?", "S91COP: Socken und Spielzeug vor dem Kauf wegräumen?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Erkennt der Roborock Saros 10 Socken und Ladekabel?", "Welches Zubehörset passt zum Saros 10R, inklusive Ersatzkabel?", "Der Saros 10R hat ein Kabel eingezogen. Was ist kaputt?", "Was mache ich, wenn mein Saugroboter über das Kabel fährt?", "Welche Kabel erkenne ich beim Saros 10R mit Festwasseranschluss?", "Saros 10R oder Dreame L10s Ultra Gen 2 für Hindernisse?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German Pro Breeze 12L model questions reach the correct app and manual comparison',()=>{
 const target='/guide/pro-breeze-luftentfeuchter-test.html#pro-breeze-12l-modellwahl';
 for(const q of ["Hat der Pro Breeze PB-06 mit 12 Litern WLAN oder brauche ich PB-D-06W-W-EU?", "Welche Pro Breeze 12L Variante mit App passt, PB-06 oder OmniDry?", "OmniDry 12L PB-D-18W-WF: Welche Variante hat die App?", "Pro Breeze PB-D-27 oder PB-06: welches Modell für Dauerablauf?", "Welches Pro Breeze Modell hat die GTIN 5060596028197?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Hat der Pro Breeze OmniDry 20L mit PB-D-24-WF eine App?", "Hat der kleine Pro Breeze PB-02 500 ml Tank?", "Wie verbinde ich die App beim Pro Breeze PB-D-06W-W-EU?", "Meaco DD8L Pro oder Arete One für 12 Liter bei 10 Grad?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German PortaSplit outdoor sound routes distinguish the original from other variants and repair',()=>{
 const target='/guide/midea-portasplit-kaufen.html#portasplit-aussengeraet-lautstaerke';
 for(const q of ["Wie hoch ist der Lärmspiegel von dem Teil, der bei der Midea PortaSplit draußen hängt?","Wie laut ist das Außengerät der Midea PortaSplit am Nachbarfenster?","4048164116478 Außengerät 48 dB im Flüstermodus?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Wie laut ist das Außengerät der PortaSplit Cool?","PortaSplit-E Außeneinheit: wie viel Schalldruck?","PortaSplit Außengerät rattert laut, was ist kaputt?","PortaSplit: Ist 39 dB im Schlafzimmer leise?","PortaSplit Außengerät vereist. Wie lange dauert Abtauen?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German dehumidifier price checks reach the same-seller Black Friday answer',()=>{
 const target='/guide/luftentfeuchter-ratgeber.html#luftentfeuchter-30-tage-preischeck';
 for(const q of ["Black Friday Luftentfeuchter Angebote prüfen","Luftentfeuchter am Cyber Monday: 30 Tage Preis und Versand vergleichen","Ist beim Raumentfeuchter der Streichpreis der 30-Tage-Tiefstpreis?","Black Week Luftentfeuchter 12 Liter: Ist die UVP ein Vergleichspreis?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Black Friday Klimaanlage 30 Tage Preis prüfen","Luftentfeuchter Black Friday in der Schweiz, was ist der Tiefstpreis in CHF?","Welcher Luftentfeuchter kommt für einen kalten Keller bei 10 Grad infrage?","Hat der Pro Breeze PB-06 mit 12 Litern WLAN?","Der Luftentfeuchter läuft, aber der Tank bleibt leer. Was soll ich prüfen?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('the exact German tado X Vaillant adapter query respects other heads and valves',()=>{
 const target='/guide/smarte-heizkoerperthermostate-lohnen-sich.html#tado-x-vaillant-305-adapter';
 for(const q of ["Welchen Adapter brauche ich beim tado° X für ein Vaillant Heizkörperventil mit 30,5 mm Klemmanschluss?","tado X Thermostat: passt der Adapter an ein TA Heimeier Ventil mit 30,5 mm Klemme?","Welcher tado X Vaillant Adapter ist 700 100 001?","Welche Ventilzuordnung hat die EAN 4260012710533?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Passt tado V3 auf das Vaillant Thermostatventil mit 30,5 mm Klemme?","tado X Oventrop UniDH M30 x 1,0 Adapter","FRITZ! 302 Heizkörperthermostat Vaillant 30,5 mm Adapter","Mein tado X mit Vaillant Ventil tropft, wie reparieren?","Passt tado X auf Danfoss RAV?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German Bosch Dry 4000 filter questions reach its exact package evidence',()=>{
 const target='/guide/luftentfeuchter-ratgeber.html#bosch-dry-4000-aktivkohlefilter';
 for(const q of ["Ist der Aktivkohlefilter beim Bosch Dry 4000 dabei?","Muss ich beim Bosch Dry 4000 den HEPA Filter separat kaufen?","D4000-EU: Welcher Staubfilter ist im Lieferumfang?","Welches Gerät hat den 2-in-1 Dry-Filter 7733703602?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Welcher Filter passt zum Bosch Air 4000?","Brauch ich für den Bosch Dry 2000 einen Aktivkohlefilter?","4069143047804 Bosch D4000-UK Ersatzfilter?","Hat der Bosch Dry 4000 einen Schlauch dabei?","Ist der DeLonghi PAC N90 Filter im Lieferumfang?","Bosch Dry 4000 Aktivkohlefilter Geräte-EAN 4069143047781"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German Meaco Arete 20L comparison searches reach the matched tests and variant evidence',()=>{
 const target='/guide/meacodry-arete-one-test.html#one-oder-two';
 for(const q of ["Was ist im kalten Keller der Unterschied zwischen Meaco Arete One 20L und Two 20L?","Meaco Arete One 20L oder Two 20L bei 20 Grad und 60 Prozent?","Wie laut ist der Meaco Arete Two 20L im Nachtmodus?","Welche Meaco Arete hat die GTIN 5060409604617?","Meaco Arete Two 20L bei 10 Grad: Entzug und Stromverbrauch?"]) assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ["Meaco Arete One 25L oder Two 20L bei 10 Grad?","Meaco Arete Two 12L mit App?","Kann ich den Ablaufschlauch beim Meaco Arete One 20L bergauf zum Waschbecken legen?","Welcher Ersatzfilter passt in den Arete Two 20L?","Welchen Luftentfeuchter brauche ich für den Keller bei 10 Grad?","Entzieht der Meaco Arete Two 20L bei 10 Grad mehr als der Comfee MDDF-20DEN7?"]) assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});

test('German PortaSplit versus Monoblock shopping queries find the installation choice', () => {
 const target='/guide/portasplit-vs-monoblock.html#bauart-vor-angebot';
 for(const query of [
  'PortaSplit vs. Monoblock',
  'Midea PortaSplit oder Monoblock für eine Wohnung ohne Balkon?',
  'Unterschied zwischen Midea PortaSplit und mobilem Monoblock',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Midea PortaSplit Cool oder Monoblock',
  'Wie messe ich den Fensterfalz für die originale PortaSplit?',
  'Black Friday Klimaanlage',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('German original PortaSplit delivery questions find the date and pickup check', () => {
 const target='/guide/midea-portasplit-kaufen.html#portasplit-liefertermin-pruefen';
 for(const query of [
  'Kann ich zwei originale Midea PortaSplit vorbestellen und im Markt abholen?',
  'Wann wird die PortaSplit geliefert?',
  'Kann ich 4048164116478 reservieren?',
  'Midea PortaSplit Liefertermin bis Freitag',
 ]) assert.equal(searchEntries(index,query,'de')[0]?.entry.u,target,query);
 for(const query of [
  'Midea PortaSplit Cool vorbestellen',
  'PortaSplit-E Lieferung und Abholung',
  '4048164118687 vorbestellen',
  'Kann ich die Midea PortaSplit Universalhalterung abholen?',
  'Wie messe ich den Fensterfalz für die originale PortaSplit?',
  'PortaSplit vs. Monoblock',
 ]) assert.notEqual(searchEntries(index,query,'de')[0]?.entry.u,target,query);
});

test('German FM Solar mobile AC questions open the exact window and bracket evidence',()=>{
 const target='/guide/midea-portasplit-ausverkauft-alternativen.html#fm-solar-yfg-montage';
 for(const q of ['FM Solar mobile Split 12000 BTU als Alternative zur PortaSplit',
                 'YFG-12H/FC6-W Dachfenster','4251933818361','FM Solar mobile Klimaanlage Fensterhalterung'])
   assert.equal(searchEntries(index,q,'de')[0]?.entry.u,target,q);
 for(const q of ['FM Solar Split 12000 BTU 95012 fest installieren','Midea PortaSplit Cool',
                 'Wie messe ich den Fensterfalz für die originale PortaSplit?',
                 'PortaSplit vs. Monoblock','Wann wird die PortaSplit geliefert?'])
   assert.notEqual(searchEntries(index,q,'de')[0]?.entry.u,target,q);
});
