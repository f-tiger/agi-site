import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {findCatalogueTools, indexCatalogue} from '../site/assets/mcp-catalog-search.mjs';

const origin = 'https://getecoback.com';
let analytics = 0;
const env = {EVENTS:{prepare() { analytics++; throw new Error('Catalogue search must not write analytics'); }}};
async function catalogue(params = {}) {
  const response = await worker.fetch(new Request(origin + '/api/mcp-tools?' + new URLSearchParams(params)), env, {});
  assert.equal(response.status, 200);
  if (params.q !== undefined) assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}
const compact = indexCatalogue((await catalogue({view:'compact'})).tools);
const names = results => results.map(tool => tool.name);

const audit = [
  ['Wie viel BTU brauche ich?', 'btu_empfehlung'],
  ['Wie lange darf ich mit 72 Litern duschen?', 'dusche_zeit_bei_wasserbudget'],
  ['Der Abfluss im Keller sitzt über dem Auslass vom Entfeuchter. Kann ich das Wasser trotzdem über den Schlauch ableiten?', 'entfeuchter_ablaufcheck'],
  ['Muss ich beim Nasssauger den Schmutzwassertank nach der Selbstreinigung noch von Hand leeren?', 'saugwischer_selbstreinigung_restpflicht_lesen'],
  ['Zwei Waschladungen sind nacheinander fertig. Wie lange wartet die zweite auf den Trockner?', 'wasch_trockner_zweiladung_uebergabestau'],
  ['In einem Klimagerätevergleich fehlt eine Teilnote. Wie kann ich die mögliche Gesamtnote trotzdem eingrenzen?', 'vergleichstest_teilnoten_spannweite_luecke'],
  ['Gilt der Nachtrag zur Bedienungsanleitung auch für unser Fertigungslos?', 'modellhandbuch_fertigungslos_geltungsgrenze'],
  ['Die Dusche wird später warm, wenn gleichzeitig jemand den Wasserhahn öffnet. Wie vergleiche ich das mit den Zeiten ohne zweite Zapfstelle?', 'warmwasser_parallelzapfung_abweichungsprobe'],
  ['Ich habe den mittleren Zählerstand falsch notiert. Was ändert sich in den beiden Abschnitten, wenn ich ihn berichtige?', 'stromablesung_mittleren_wert_korrigieren'],
  ['Mein Stoffkit fürs Dachfenster hat genug Umfang. Passt es damit wirklich an jeder einzelnen Kante?', 'dachfenster_stoffkit_kantenreserve_einzeln'],
  ['Zwei Leute pflegen dasselbe Gerät, eine Rückmeldung fehlt. Wie erkenne ich, welches Teil noch offen ist?', 'pflege_uebergabe_rueckfrage_zu_geraeteteil'],
  ['Wir müssen zum Querlüften je ein Fenster öffnen. Wie finden wir aus unseren Zeiten fünf gemeinsame Minuten?', 'querlueften_koordination_zwei_bedienfenster'],
];

const context = 'Bitte gib mir eine Einordnung für eine Situation im Haushalt. Ich hatte dazu schon längere Überlegungen und mehrere Gespräche, die hier nebensächlich sind. ';
const heldouts = [
  ['Beim Entfeuchter im Keller liegt der Auslass unter dem Waschbecken. Wohin mit dem Ablaufschlauch?', 'entfeuchter_ablaufcheck'],
  ['Welche Teile vom Nasssauger muss ich trotz Selbstreinigungsmodus von Hand reinigen?', 'saugwischer_selbstreinigung_restpflicht_lesen'],
  ['Die erste Waschladung ist noch im Trockner. Wie viel Wartezeit hat die nächste Ladung?', 'wasch_trockner_zweiladung_uebergabestau'],
  ['Bei meinem Klimagerätevergleich fehlt eine Teilbewertung. Wie weit kann die Endnote auseinanderliegen?', 'vergleichstest_teilnoten_spannweite_luecke'],
  ['Für eine ältere Charge gibt es einen Revisionsnachtrag. Betrifft die Bedienungsanleitung mein Serienlos?', 'modellhandbuch_fertigungslos_geltungsgrenze'],
  ['Ich habe mich beim Zählerstand verschrieben. Wie berichtige ich angrenzende Ablesungen und den Verbrauch?', 'stromablesung_mittleren_wert_korrigieren'],
  ['Am Dachfenster ist die Stoffabdichtung auf einer Seite zu kurz. Muss jede Kante einzeln passen?', 'dachfenster_stoffkit_kantenreserve_einzeln'],
  ['Wir teilen die Gerätepflege. Für welchen Teil fehlt noch die Bestätigung der anderen Person?', 'pflege_uebergabe_rueckfrage_zu_geraeteteil'],
  ['Zwei Personen öffnen beim Querlüften getrennte Fenster. Wie groß ist die Überschneidung ihrer Zeitfenster?', 'querlueften_koordination_zwei_bedienfenster'],
  [context + 'Der Abfluss im Keller liegt höher als der Auslass vom Entfeuchter. Wie führe ich den Ablaufschlauch?', 'entfeuchter_ablaufcheck'],
];

test('full, compact and browser search return the same ranks for 12 audit questions', async () => {
  for (const [q, expected] of audit) {
    const a = await catalogue({q});
    const b = await catalogue({q, view:'compact'});
    const c = findCatalogueTools(compact, {query:q});
    assert.deepEqual(names(a.tools), names(c), q);
    assert.deepEqual(names(b.tools), names(c), q);
    assert.ok(names(c).slice(0, 3).includes(expected), q);
    assert.ok(c.length <= 30, q);
  }
  assert.equal(analytics, 0);
});

test('rephrased German questions find their intended tool, even after long context', () => {
  assert.ok(context.length > 120);
  for (const [query, expected] of heldouts) {
    assert.ok(names(findCatalogueTools(compact, {query})).slice(0, 3).includes(expected), query);
  }
});


const previousDiscovery = [
  ['Wie verteile ich die Wäsche auf Liegeplätze und Leine?', 'waesche_trockenweg_sortierplan'],
  ['Wie viel ist der Stoff beim Waschen eingelaufen?', 'textil_masshaltigkeit_vor_nach_pflege'],
  ['Wie lange muss der Luftreiniger für die restliche Reinluft leise laufen?', 'luftreiniger_stufenplan_reinluftmenge'],
  ['Kommt aus meiner Lüftung Frischluft oder nur Umluft?', 'lueftung_aussenluft_umluftrate_aufteilen'],
  ['Ist beim DeLonghi Pinguino EX105 eine Fensterabdichtung dabei?', 'pinguino_ex105_fensterkit_angebotsumfang'],
  ['Brauche ich für den Fritz 302 ein Router-Update?', 'fritz_302_router_firmware_mindeststand'],
  ['Wie vergleiche ich meine Stromrechnung mit einer längeren Zählermessung?', 'stromrechnung_messfenster_randtage'],
  ['Wurde meine Stromrechnung doppelt bezahlt?', 'stromjournal_mehrfachzahlung_kandidat'],
  ['Holt mein Saugroboter nach dem Türöffnen verpasste Räume nach?', 'roboter_tuerfreigabe_nachholrunde'],
  ['Wie viele Eingriffe braucht mein Saugroboter in drei Probeläufen?', 'roboter_eingriffsbudget_serienprobe'],
  ['Wäsche liegend oder an der Leine trocknen einteilen', 'waesche_trockenweg_sortierplan'],
  ['Ist der Stoff nach der Pflege geschrumpft?', 'textil_masshaltigkeit_vor_nach_pflege'],
  ['Wieviel Frischluft steckt in der Zuluft mit Umluft?', 'lueftung_aussenluft_umluftrate_aufteilen'],
  ['Habe ich die Stromrechnung zweimal überwiesen?', 'stromjournal_mehrfachzahlung_kandidat'],
];

test('14 prior German discovery checks remain near the top', async () => {
  for (const [q, expected] of previousDiscovery) {
    const response = await catalogue({q, view:'compact', limit:'3'});
    assert.ok(names(response.tools).includes(expected), q);
  }
});

test('questions about the six new household topics find a matching decision in the top three', async () => {
  const questions = [
    ['Ist im Winter im Wohnmobil am Fenster oder hinter dem Polster eher mit Kondenswasser zu rechnen?', 'wohnmobil_lokale_taureserve_fenster_polster_paar'],
    ['Mein PC wird wärmer. Liegt es an der angesaugten Raumluft oder ist die CPU gegenüber der Ansaugluft deutlich heißer?', 'pc_chip_und_ansaugluft_abstand_zerlegen'],
    ['Wie viele zusätzliche warme Minuten habe ich beim Arbeiten am Platz durch die Punktwärme bekommen?', 'punktwaerme_zusatzkomfort_nur_neue_minuten'],
    ['Wo bleibt das Wasser aus dem Tank meines Luftkühlers, wenn ich Rücklauf und aufgefangenes Tropfwasser mitmesse?', 'luftkuehler_tankbilanz_ueber_wasserwege'],
    ['Meine Wäsche auf dem beheizten Wäscheständer wird nicht leichter. Ist sie schon trocken oder ist das Gewicht nur stehen geblieben?', 'heizwaesche_massenplateau_vor_wirklichem_ziel'],
    ['Welche Bodenfelder im Pool hat der Poolroboter beim letzten Lauf ausgelassen?', 'poolroboter_bodenraster_unbesuchte_felder'],
  ];
  for (const [q, expected] of questions) {
    const response = await catalogue({q, view:'compact', limit:'3'});
    const ranked = names(findCatalogueTools(compact, {query:q})).slice(0, 3);
    assert.deepEqual(names(response.tools), ranked, q);
    assert.ok(ranked.includes(expected), q);
  }
});

test('German buyer questions with both common and exact model terms find manufacturer evidence', async () => {
  const questions = [
    ["Welcher Gefrierschrank packt beim Großeinkauf 20 Kilo in 24 Stunden und hat Platz für 300 Liter?", "gefrierschrank_24h_haushaltsspitze_und_bestandsvolumen"],
    ["Passt der Bosch SBV4EBX00D unter meine Platte und bleibt der Gang frei, wenn die Tür offen steht?", "bosch_sbv4ebx00d_nische_tueroeffnung_abgleichen"],
    ["Passt der Miele WTV 501 zu T1 Classic und einer Waschmaschine W 1000?", "wasch_trocken_saeule_herstellerkombination_beleg"],
    ["Wie laut ist der ComfoAir Q350 TR bei 250 Kubikmetern pro Stunde und 150 Pa auf der Zuluftseite?", "q350_tr_250m3_schallweg_druckpunkte_v0126"],
    ["An wen wende ich mich für Ersatzteile bei der Spülmaschine, wenn ich einen Ablauffilter oder eine Pumpe brauche?", "oekodesign_teilgruppe_rollenweg_de"],
    ['Passen 19 kg Gefriergut und 200 Liter Vorrat in den Bosch GSN33EWEV?', 'gefrierschrank_24h_haushaltsspitze_und_bestandsvolumen'],
    ['Bleiben nach der Spülertür bei 90 Grad noch 60 cm Durchgang? Es geht um SBV4EBX00D/48.', 'bosch_sbv4ebx00d_nische_tueroeffnung_abgleichen'],
  ];
  for (const [q, expected] of questions) {
    const response = await catalogue({q, view:'compact', limit:'3'});
    const ranked = names(findCatalogueTools(compact, {query:q})).slice(0, 3);
    assert.deepEqual(names(response.tools), ranked, q);
    assert.ok(ranked.includes(expected), q);
  }
});

test('German accessory and take-back questions find the relevant evidence in the first three results', async () => {
  const questions = [
    ["In meiner Bosch DWB66BC50 steckt das Umluftset DWZ1DX1I6. Passt der Ersatzfilter DZZ1XX1B6 wirklich?", "dunstabzug_de_modell_set_filter_belegkette"],
    ["Darf der FlexiClip HFC70-C beim Miele H 2861 BP während der Pyrolyse im Backofen bleiben?", "backofenzubehoer_reinigungsart_exakter_beleg"],
    ["Kann der TISKEN Saugnapfhalter auf einer glatten Fliese sitzen, wenn er über eine Fuge reicht?", "tisken_50400307_zwei_wandfelder_oberflaeche"],
    ["Wie viel Liter pro Minute liefert die hansgrohe Pulsify 24151000 bei 3 bar im Intense PowderRain?", "pulsify_artikel_strahlart_techniktabelle_drei_bar"],
    ["Passt der Venta Rollwagen 6060 zum LW24 Plus, wenn das Modell nur in der Tabelle auftaucht?", "venta_6060_kompatibilitaetslisten_modellkonflikt"],
    ["Kann ich drei alte 25 cm große Toaster derselben Geräteart ohne Neukauf im Elektrohandel abgeben?", "elektrog_kleingeraete_dreifach_mass_anzahl"],
    ["Beim Selbstreinigungsprogramm meines H 2861 BP: den HFC 70-C vorher herausnehmen oder ist die Schiene dafür freigegeben?", "backofenzubehoer_reinigungsart_exakter_beleg"],
    ["IKEA TISKEN: Die Saugscheibe würde teils auf der Fliesenfuge liegen. Ist dieser Platz laut Hersteller geeignet?", "tisken_50400307_zwei_wandfelder_oberflaeche"],
    ["Auf den Kacheln der Dusche läuft eine Naht genau unter der Kontaktfläche des TISKEN-Halters. Schließt das den vorgesehenen Platz aus?", "tisken_50400307_zwei_wandfelder_oberflaeche"],
    ["Beim Rollgestell von Venta finden sich für das Gerät LW24 Plus unterschiedliche Modelllisten. Welche Aussage kann ich daraus überhaupt ableiten?", "venta_6060_kompatibilitaetslisten_modellkonflikt"],
    ["Der Händler soll drei baugleiche kaputte Toaster annehmen. Sie sind jeweils höchstens 25 Zentimeter lang, breit und hoch, und ich möchte dort nichts bestellen. Fallen sie in die Kleinelektro-Rücknahme?", "elektrog_kleingeraete_dreifach_mass_anzahl"],
    ["504.003.07", "tisken_50400307_zwei_wandfelder_oberflaeche"],
    ["24151000", "pulsify_artikel_strahlart_techniktabelle_drei_bar"],
    ["HFC 70-C Selbstreinigung", "backofenzubehoer_reinigungsart_exakter_beleg"],
    ["Venta 6060 LW24 Plus", "venta_6060_kompatibilitaetslisten_modellkonflikt"],
  ];
  for (const [q, expected] of questions) {
    const response = await catalogue({q, view:'compact', limit:'3'});
    const ranked = names(findCatalogueTools(compact, {query:q})).slice(0, 3);
    assert.deepEqual(names(response.tools), ranked, q);
    assert.ok(ranked.includes(expected), q);
  }
});

test('generic and off-topic requests produce no fallback catalogue matches', async () => {
  for (const q of [
    'Kannst du mir heute bitte helfen?',
    'Stromrechnung als Datenbankmigration mit Kubernetes-Operator',
    'Katze im Keller: Welche Impfungen sind bei Jungtieren Pflicht?',
    'Wie bekomme ich Zugluft und Lochkarten in eine PostgreSQL Transaktion?',
    'Entfeuchter-Abfluss im Kafka-Cluster: Schema Registry und Consumer Lag',
    'unique-unmatched-string',
    '999.888.77',
    'zznonexistentcatalogueentry',
    '???',
    'HTML',
  ]) {
    assert.deepEqual((await catalogue({q, view:'compact'})).tools, [], q);
    assert.deepEqual(findCatalogueTools(compact, {query:q}), [], q);
  }
});

test('identifier queries, category scoping and exact tool filters stay precise', async () => {
  const name = 'vergleichstest_teilnoten_spannweite_luecke';
  const [tool] = (await catalogue({tool:name, view:'compact'})).tools;
  const category = tool.category;
  const query = name.toUpperCase();
  assert.deepEqual(names(findCatalogueTools(compact, {query, category})), [name]);
  assert.deepEqual(names((await catalogue({q:query, category})).tools), [name]);
  assert.deepEqual((await catalogue({q:query, category:'Raumklima'})).tools, []);
  assert.deepEqual((await catalogue({q:query, tool:'btu_empfehlung'})).tools, []);
  assert.deepEqual((await catalogue({tool:query})).tools, []);
  assert.deepEqual(findCatalogueTools(compact, {query:' '.repeat(512) + query}), []);
  assert.equal(findCatalogueTools(compact, {query:'   '}).length, compact.length);
});

test('noun inflection and compound edges work on tools without tailored aliases', () => {
  const tool = {name:'dachfenster_kantenmass', description:'Stirnkante am Rahmen prüfen', category:'Bauprobe'};
  const unrelated = {name:'drehmoment_pruefen', description:'Angaben im Maschinenhandbuch abgleichen', category:'Bauprobe'};
  const sample = indexCatalogue([tool, unrelated]);
  assert.deepEqual(findCatalogueTools(sample, {query:'Dachfensters Stirnkanten'}), [tool]);
  assert.deepEqual(findCatalogueTools(sample, {query:'Bauprobe'}), [tool, unrelated]);
  assert.deepEqual(findCatalogueTools(sample, {query:'Dachfensterrahmen Kantenmass'}), [tool]);
  assert.deepEqual(findCatalogueTools(sample, {query:'Pflanzenstirnwurm Dachgeschosstor'}), []);
});
