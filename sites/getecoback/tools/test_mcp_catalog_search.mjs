import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../src/worker.js';
import {findCatalogueTools, indexCatalogue, toolGuidePath} from '../site/assets/mcp-catalog-search.mjs';

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

test('appliance search results link to exact owned evidence and keep canonical machine citations', async () => {
  const withGuides = compact.map(entry => entry.tool).filter(tool => tool.guide_url);
  assert.equal(withGuides.length, 218);
  const destinations = new Set(withGuides.map(tool => tool.guide_url));
  assert.equal(destinations.size, 14);
  const pages = new Map();
  for (const tool of withGuides) {
    const {origin:site, pathname, hash} = new URL(tool.guide_url);
    assert.equal(site, origin);
    assert.equal(tool.citation_url, origin + pathname);
    assert.equal(toolGuidePath(tool), pathname + hash);
    if (!pages.has(pathname)) pages.set(pathname, await readFile(new URL('../site' + pathname, import.meta.url), 'utf8'));
    assert.ok(pages.get(pathname).includes(`id="${hash.slice(1)}"`), tool.guide_url);
  }
  const [example] = (await catalogue({tool:'wasserkocher_twk8613p_wasser_milch_instant_einfuellen', view:'examples'})).tools;
  assert.equal(example.guide_url, origin + '/produkte.html#wasserkocher-bosch-twk8613p');
  assert.equal(example.citation_url, origin + '/produkte.html');
  assert.equal(example.citation_markdown_url, origin + '/produkte.md');
});

test('German condition questions find the cold-cellar evidence and preserve model-variant lookup', async () => {
  const tool = 'kellerentfeuchter_pruefpunkt_abgleichen';
  const cases = [
    ['Was schafft der Meaco Arete One 20L bei 10 Grad und 60 Prozent im kalten Keller?', tool],
    ['Wie viele Liter zieht ein Comfee MDDF-20DEN7 bei 10 °C und 60 % aus meinem Keller?', tool],
    ['Wie viel Watt braucht der Entfeuchter bei meinen gemessenen 20 °C und 60 Prozent Luftfeuchtigkeit?', tool],
    ['Wie unterscheiden sich Comfee MDDF-20DEN7 und MDDF-20DEN7-WF?', 'comfee_mddf20_wf_beleggrenze'],
    ['entfeuchter_kalt_modellbeleg', 'entfeuchter_kalt_modellbeleg'],
  ];
  for (const [query, expected] of cases) {
    const response = await catalogue({q:query, view:'compact', limit:'3'});
    assert.equal(response.tools[0]?.name, expected, query);
    assert.equal(findCatalogueTools(compact, {query})[0]?.name, expected, query);
  }
});

test('a catalogue record cannot nominate a foreign URL, input query, or unreviewed fragment as its guide', () => {
  const category = 'Wasserkocherbelege';
  for (const citation_url of ['https://example.com/produkte.html', '//example.com/produkte.html',
    'javascript:alert(1)', origin + '/produkte.html?x=1', origin + '/produkte.html#unknown',
    'https://username@getecoback.com/produkte.html', undefined]) {
    assert.equal(toolGuidePath({citation_url,category}), null, String(citation_url));
  }
  assert.equal(toolGuidePath({citation_url:origin + '/tools.html',category}), '/tools.html');
  assert.equal(toolGuidePath({citation_url:origin + '/produkte.html',category:'other'}), '/produkte.html');
});

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

test('German kitchen and standby questions find the relevant programme and model evidence', async () => {
  const questions = [
    ["Die Duetto-Pfanne hat 175 mm Boden. Passt sie am Miele KM 7464 FR vorne oder hinten links?", "induktion_km7464f_de_kochboden_zonenauswahl"],
    ["Was zieht der Miele H 7460 BP im Aus-Zustand, im Stand-by und in vernetzter Bereitschaft laut Datenblatt?", "miele_h7460_bp_betriebswert_genaues_datenblatt"],
    ["Beim Miele G 7673 sind im EcoFeedback vor dem Start Balken zu sehen. Ist das schon mein wirklicher Wasserverbrauch?", "miele_g7673_spuelanzeige_phase_eco_feedback"],
    ["Die Geschirrspülertür öffnet automatisch, aber im Display steht noch eine Restzeit. Ist das Programm wirklich zu Ende?", "spuelgang_ende_marker_und_autoopen_beobachtung"],
    ["Ist das Philips Backset HD9945/01 für den kleinen oder großen Korb vom NA352/00 vorgesehen?", "philips_hd9945_korb_und_originalteil_beleg"],
    ["Wie viel Wasser und Strom braucht der Tischgeschirrspüler Bosch SKS62E32EU im Eco-50-Programm und wie lange läuft er?", "bosch_sks62e32eu_eco50_quellenwerte_rundung"],
    ["Wie hoch ist beim Modell 11105690 die Leistungsaufnahme, wenn der Ofen ausgeschaltet ist oder nur auf ein WLAN-Signal wartet?", "miele_h7460_bp_betriebswert_genaues_datenblatt"],
    ["Beim Auswählen eines Spülgangs zeigt mein G7673 SCVi AutoDos eine Reihe Striche für Wasser und Energie. Sind das Messwerte oder schätzt die Maschine nur?", "miele_g7673_spuelanzeige_phase_eco_feedback"],
    ["Vor dem Loslaufen sehe ich beim G 7673 eine grafische Verbrauchsanzeige. Kann ich diese Angaben als tatsächlich verbrauchte Liter behandeln?", "miele_g7673_spuelanzeige_phase_eco_feedback"],
    ["Der Spüler kippt die Klappe selbst auf, im Fenster läuft der Countdown weiter. Heißt das schon fertig, oder ist das nur die Trocknungsphase?", "spuelgang_ende_marker_und_autoopen_beobachtung"],
    ["HD9945/01 NA352/00", "philips_hd9945_korb_und_originalteil_beleg"],
    ["Beim Bosch SKS62E32EU suche ich das Etikett für Sparprogramm 50 Grad: Verbrauch je Spülgang und Dauer in Stunden.", "bosch_sks62e32eu_eco50_quellenwerte_rundung"],
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

test('German buyer queries find the sourced product and maintenance task groups', async () => {
  const cases = [
    ["Brauche ich für öffentliches Leitungswasser überhaupt eine Filterkanne oder sollte ich zuerst den Versorger fragen?", "leitungswasser_filterkanne_bedarf_oder_abklaerung"],
    ["Im Waschbottich steht 40, und zwei Balken sind darunter. Wie lese ich die beiden Angaben richtig?", "waschzeichen_grad_balken_ablesen"],
    ["Zugluft unter Wohnungseingangstür oder Raumtür, welche Funktion zuerst klären?", "tuerzugluft_raumtuer_wohnungseingang_naechster_schritt"],
    ["Auf dem Tisch liegt der iRobot-Filterpack 4785887. Mein Roomba j7+ hat keinen Combo-Zusatz. Nennt die deutsche Packliste mein Modell?", "roboter_ersatzfilter_exakte_de_zuordnung"],
    ["Was bedeutet Klimaklasse SN beim Kühlschrank?", "kuehlschrank_klimaklasse_sn_n_st_t_typenschild"],
    ["Passt meine 52 mm lange GU10 LED mit 50 mm Durchmesser in die Fassung mit nur 48 mm Platz?", "led_ersatzfassung_schnittstelle_geraetehuelle"],
  ];
  for (const [query, expected] of cases) {
    const client = names(findCatalogueTools(compact,{query}));
    const response = await catalogue({q:query,view:'compact',limit:'24'});
    assert.deepEqual(names(response.tools),client.slice(0,24),query);
    assert.ok(client.slice(0,3).includes(expected),query);
  }
});

test('German buyer and owner questions find the next appliance evidence groups', async () => {
  const cases = [
    ["Warum sieht mein mitgelieferter DeLonghi DLSC002 Filter anders aus als der Ersatzfilter?", "delonghi_dlsc002_filter_variante_aussehen_ersatzkauf"],
    ["Unser Versorger nennt 2,4 bis 2,6 mmol Calciumcarbonat pro Liter. Welche Spalte auf der Waschmittelpackung ist das?", "waschmittel_dosiertabelle_wasserhaerte_intervall"],
    ["Wasserhärte vom Versorger: Mein Bericht sagt nur »mittel«. Reicht das für die Gerätestufe oder brauche ich den Zahlenwert am Geschirrspüler-Zulauf?", "spueler_haertebereich_versorger_geraetestufe"],
    ["Auf meinem Miele steht Compact C2, im Angebot für den Ersatzbeutel steht GN. Welche vollständige Modellzeile und welcher HyClean-Beuteltyp passen zusammen?", "miele_hyclean_beutel_vollstaendige_modellzeile"],
    ["Bedeutet Easy De-Calc im PerfectCare Angebot dasselbe Kalksystem wie Easy De-Calc Plus auf dem PSG7140 Datenblatt?", "philips_buegelgeraet_kalksystem_typenschild_abgleich"],
    ["Welche Anleitung gehört zur Bosch E-Nummer MSM67170/02?", "bosch_ergomixx_e_nummer_ausfuehrung_handbuch"],
    ["Welche Nischenmaße braucht die Bosch BFL524MS0, wenn am Schrank nur 558 Millimeter Breite frei sind?", "bosch_bfl524ms0_nische_geraetemass_unterscheiden"],
    ["Ist die Wiegefläche der Beurer Küchenwaage Artikelnummer 70312 aus Glas oder Edelstahl?", "beurer_ks34_artikelnummer_wiegeoberflaeche"],
    ["Passt irgendein 360 Grad Sockel zum Bosch TWK8613P?", "wasserkocher_twk8613p_360_sockel_originalbasis"],
    ["Hat der Bosch TAT8613 zwei Röstschlitze und belegt die Zahl auch das Innenmaß für dicke Scheiben?", "bosch_tat8613_schlitzanzahl_scheibenmass_abgrenzen"],
  ];
  for (const [query, expected] of cases) {
    const ranked = names(findCatalogueTools(compact,{query}));
    const response = await catalogue({q:query,view:'compact',limit:'24'});
    assert.deepEqual(names(response.tools),ranked.slice(0,24),query);
    assert.ok(ranked.slice(0,3).includes(expected),query);
  }
});

test('exact window-vacuum parts and battery actions lead to different tools', async () => {
  const cases = [
    ['Passt die 170-mm-Abziehlippe 2.633-104.0 an meinen Kärcher WV 8 Signature Line?',
      'fenstersauger_170mm_abziehlippe_geraetefamilie'],
    ['Passt die 170-mm-Abziehlippe 2.633-513.0 an meinen Kärcher WV 3 Comfort Precision+ Black?',
      'fenstersauger_170mm_abziehlippe_geraetefamilie'],
    ['Lässt sich der Akku beim WV 8 Signature Line austauschen?',
      'fenstersauger_wv3_wv8_akkuwechsel_service_oder_reserve'],
  ];
  for (const [query, name] of cases) {
    const local = names(findCatalogueTools(compact,{query}));
    assert.equal(local[0],name,query);
    const {tools} = await catalogue({q:query,view:'compact',limit:'3'});
    assert.deepEqual(names(tools),local.slice(0,3),query);
    assert.equal(tools[0].guide_url,origin + '/produkte.html#fenstersauger-belege');
  }
});

const fenstersaugerQuestions = [
  ["Kann ich mit dem Kärcher WV 2 Plus Multi Edition 30 ml aufsaugen, obwohl der Tank größer ist?", "fenstersauger_kaercher_fluessigkeitsgrenze_und_tank"],
  ["Was bedeutet es beim Kärcher WV 8, wenn alle LEDs zweimal kurz blinken und der Motor aus ist?", "fenstersauger_wv3_wv8_led_muster_einordnen"],
  ["Kann ich beim WV 3 Comfort Precision+ Black einen zweiten Akku während des Fensterputzens einsetzen?", "fenstersauger_wv3_wv8_akkuwechsel_service_oder_reserve"],
  ["Darf ich beim Kärcher WV 8 Schaumreiniger statt Glasreiniger nehmen?", "fenstersauger_kaercher_glasreiniger_schaum_spiritus"],
  ["Brauche ich eine Probe mit dem Mikrofaserbezug, bevor ich mit dem Kärcher WV 3 eine Hochglanzfläche reinige?", "fenstersauger_wv3_wv8_hochglanz_glas_temperatur_probe"],
  ["Kann ich mit dem Bosch GlassVAC Wasser von einem porösen Holzbrett aufsaugen?", "glassvac_aufnahme_glatte_nicht_poroese_flaeche"],
  ["Auf dem Balkon sind es minus acht Grad. Darf ich den GlassVAC dort einschalten, lagern oder laden?", "glassvac_kalt_lagern_einschalten_laden_getrennt"],
  ["Wo fülle ich beim GlassVAC Wasser zum Ausspülen des Schmutzwassertanks ein, durch den Auslass oder beim abgezogenen Saugkopf?", "glassvac_schmutzwassertank_spuelen_oeffnung_ablass"],
  ["Ich sehe Linien auf dem Kunststoff am GlassVAC, aber keine Streifen auf der Scheibe. Muss das Wischblatt deswegen neu?", "glassvac_streifen_auf_glas_wischblatt_sichtbefund"],
  ["Beim GlassVAC tropft Wasser direkt an der Sprühflasche und der Sprühkopf sitzt locker. Was soll ich zuerst prüfen?", "glassvac_spruehapplikator_tropft_montage_ursache"],
  ["Passt die schwarze 170-mm-Ersatzlippe 2.633-104.0 in meinen WV 8?", "fenstersauger_170mm_abziehlippe_geraetefamilie"],
  ["Sind die 170 mm Gummilippen von WV3 und WV8 gleich?", "fenstersauger_170mm_abziehlippe_geraetefamilie"],
  ["Kann ich dieselbe Gummilippe für WV3 und WV8 nachkaufen?", "fenstersauger_170mm_abziehlippe_geraetefamilie"],
];

test('German PortaSplit bracket questions rank the exact original-model check first', async () => {
  const tool = 'midea_portasplit_fensterhalterung_pruefen';
  for (const q of ['Universalhalterung', 'Midea PortaSplit Dachfenster Halterung',
    'Brauche ich für das Dachfenster bei der originalen Midea PortaSplit eine Universalhalterung, und ist sie im Lieferumfang?',
    'Midea PortaSplit französisches Balkonfenster Halterung']) {
    const [first] = (await catalogue({q, view:'compact', limit:'3'})).tools;
    assert.equal(first?.name, tool, q);
    assert.equal(toolGuidePath(first), '/guide/midea-portasplit-ausverkauft-alternativen.html#kaufpruefung');
    assert.equal(findCatalogueTools(compact, {query:q})[0]?.name, tool, q);
  }
});

test('German Fenstersauger questions lead to the right decision and owned evidence', async () => {
  for (const [question, expected] of fenstersaugerQuestions) {
    const client = names(findCatalogueTools(compact, {query:question})).slice(0, 3);
    const {tools} = await catalogue({q:question, view:'compact', limit:'3'});
    assert.deepEqual(names(tools), client, question);
    const matching = tools.find(tool => tool.name === expected);
    assert.ok(matching, question);
    assert.equal(matching.guide_url, origin + '/produkte.html#fenstersauger-belege');
  }
});

test('German partial dryer replacement questions lead to the measured seasonal purchase check', async () => {
  const tool = 'waesche_trocknungswechsel_kaufschwelle';
  for (const q of ['Lohnt sich ein Luftentfeuchter für Wäsche im Winter, wenn manche Ladungen weiter in den Trockner gehen?',
    'Wie viele Winter dauert es, bis sich der Kauf eines Luftentfeuchters bezahlt macht, wenn ich nur einen Teil der Waschladungen damit trockne?',
    'Teils weiter Wäschetrockner nutzen: Amortisation Luftentfeuchter je Saison']) {
    const [first] = (await catalogue({q, view:'compact', limit:'3'})).tools;
    assert.equal(first?.name, tool, q);
    assert.equal(toolGuidePath(first), '/waeschetrockner-oder-luftentfeuchter.html#laundry-check');
    assert.equal(findCatalogueTools(compact, {query:q})[0]?.name, tool, q);
  }
});
