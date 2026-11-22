import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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

test('the browser loads the current catalogue search module', async () => {
  const module = await readFile(new URL('../site/assets/mcp-catalog-search.mjs', import.meta.url));
  const version = createHash('sha256').update(module).digest('hex').slice(0, 12);
  const html = await readFile(new URL('../site/mcp.html', import.meta.url), 'utf8');
  const imports = [...html.matchAll(/from '([^']*mcp-catalog-search\.mjs[^']*)'/g)];
  assert.deepEqual(imports.map(match => match[1]), [`/assets/mcp-catalog-search.mjs?v=${version}`]);
});

test('appliance search results link to exact owned evidence and keep canonical machine citations', async () => {
  const withGuides = compact.map(entry => entry.tool).filter(tool => tool.guide_url);
  assert.equal(withGuides.length, 237);
  const destinations = new Set(withGuides.map(tool => tool.guide_url));
  assert.equal(destinations.size, 37);
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

test('the German window condensation question finds the measured check and fixed share answer', async () => {
  const name = 'fenster_oberflaeche_taucheck';
  const page = '/guide/fenster-beschlagen-innen.html';
  const guide = origin + page + '#fenstersauger-gegen-kondenswasser';
  for (const query of [
    'Fenstersauger gegen Kondenswasser',
    'Hilft ein Fenstersauger gegen Kondenswasser am Fenster oder reicht ein Tuch?',
    '20 Grad 60 % Luftfeuchtigkeit und Scheibe 10 Grad: Ist Kondenswasser am Fenster plausibel?',
  ]) {
    const [first] = (await catalogue({q:query, view:'compact', limit:'3'})).tools;
    assert.equal(first?.name, name, query);
    assert.equal(first.guide_url, guide, query);
    assert.equal(first.citation_url, origin + page, query);
    assert.equal(findCatalogueTools(compact,{query})[0]?.name, name, query);
  }
  const question = 'Kondenswasser zwischen den Scheiben, was tun?';
  assert.notEqual(findCatalogueTools(compact,{query:question})[0]?.name, name, question);
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

test('German Oventrop buyer questions route to the X-generation adapter check', async () => {
  const tool = 'tado_x_oventrop_ventiladapter_pruefen';
  for (const query of [
    'Mein Oventrop-Ventil hat 30 mm. Passt tado X ohne Adapter, oder brauche ich für M30 × 1,0 einen anderen?',
    'Welcher Adapterring passt für tado X auf dem Oventrop UniL?',
    'Passt der tado X Thermostat direkt am Vindo TH Heizungsventil?',
  ]) {
    const response = await catalogue({q:query, view:'compact', limit:'3'});
    assert.equal(response.tools[0]?.name, tool, query);
    assert.equal(findCatalogueTools(compact, {query})[0]?.name, tool, query);
  }
});

test('an explicit window-vac correction ranks only the selected device and preserves uncertainty', async () => {
  const bosch = 'glassvac_kalt_lagern_einschalten_laden_getrennt';
  const led = 'fenstersauger_wv3_wv8_led_muster_einordnen';
  const checks = [
    ['Der Bosch GlassVAC war über Nacht bei Frost in der Garage. Kann ich stattdessen meinen Kärcher WV 8 laden?', undefined],
    ['Mein Bosch GlassVAC lag bei Frost in der Garage. Korrektur: Es ist ein Kärcher WV 8. Darf er jetzt an die Steckdose?', undefined],
    ['Früher hatte ich den Bosch GlassVAC. Jetzt blinkt beim Laden nach Frost am Kärcher WV 8 die LED zweimal kurz, der Motor ist aus. Was bedeutet das?', led],
    ['Den Bosch GlassVAC wollte ich nach Frost laden. Jetzt geht es um meinen Kärcher WV 8: Alle LEDs blinken zweimal kurz und machen dann eine lange Pause, der Motor ist schon aus. Was bedeutet das?', led],
    ['Mein Kärcher WV 8 hat defekte LEDs. Korrektur: Ich meine meinen Bosch GlassVAC 06008B7000. Darf ich ihn nach einer Frostnacht in der Garage gleich ans Ladegerät?', bosch],
    ['Ich vergleiche Bosch GlassVAC und Kärcher WV 8. Darf ich beide Fenstersauger bei minus 3 Grad aufladen?', undefined],
    ['Ich vergleiche beide Geräte: Darf ich beim Bosch GlassVAC und Kärcher WV 8 jeweils im unbeheizten Schuppen laden?', undefined],
    ['Beim Bosch GlassVAC habe ich im Schuppen minus 3 Grad gemessen. Den Kärcher WV 8 lade ich drinnen, dort habe ich nicht gemessen. Darf ich ihn jetzt laden?', undefined],
    ['Beim Laden blinkt mein Kärcher WV 8 zweimal kurz. Was bedeutet das?', led],
  ];
  for (const [q,expected] of checks) {
    const {tools} = await catalogue({q,view:'compact',limit:'5'});
    assert.deepEqual(names(tools),names(findCatalogueTools(compact,{query:q})).slice(0,5),q);
    assert.equal(tools[0]?.name,expected,q);
    if (expected === led) {
      assert.equal(toolGuidePath(tools[0]),'/produkte.html#kaercher-fenstersauger-einsatz-und-hinweise',q);
      assert.deepEqual((await catalogue({q,tool:bosch})).tools,[],q);
    }
    if (expected === bosch) {
      assert.equal(toolGuidePath(tools[0]),'/produkte.html#bosch-glassvac-einsatz-und-pflege',q);
      assert.deepEqual((await catalogue({q,category:'Feuchte'})).tools,[],q);
    }
  }
  assert.equal(analytics,0);
});

test('German humidifier efficiency questions reach the comparable measurement check and evidence', async () => {
  const name = 'befeuchter_nennwatt_abgabeleistung_bezug';
  const evidence = '/guide/luftbefeuchter-stromverbrauch.html#effizienz-vergleichen';
  for (const q of [
    'Welcher befeuchtet effizienter: der Beurer LB 55 mit 365 Watt oder Oskar mit 6 bis 18 Watt?',
    'Sind 365 Watt beim LB-55 effizienter als 18 Watt beim Oskar?',
    'Gibt der LB 55 mit 365 W mehr Wasser an die Raumluft ab als ein Oskar mit 18 W?',
    'Wie vergleiche ich beim Luftbefeuchter Wasserabgabe und Leistungsaufnahme?',
  ]) {
    const browser = names(findCatalogueTools(compact,{query:q})).slice(0,5);
    const {tools} = await catalogue({q,view:'compact',limit:'5'});
    assert.equal(tools[0]?.name,name,q);
    assert.deepEqual(names(tools),browser,q);
    assert.equal(toolGuidePath(tools[0]),evidence,q);
    assert.deepEqual((await catalogue({q,category:'Feuchte',tool:name})).tools,[],q);
  }
  for (const q of [
    'Was kostet der LB 55 bei 8 Stunden pro Tag an Strom?',
    'Wie entkalke ich den Beurer LB 55?',
    'Welcher Tank fasst mehr Wasser, der Oskar mit 18 Watt oder der LB 55 mit 365 Watt?',
    'Braucht der LB 55 mit 365 W mehr Wasser zum Nachfüllen als der Oskar mit 18 W?',
    'Wie effizient ist die Klimaanlage bei 900 Watt?',
  ]) {
    const {tools} = await catalogue({q,view:'compact',limit:'5'});
    assert.notEqual(tools[0]?.name,name,q);
    assert.deepEqual(names(tools),names(findCatalogueTools(compact,{query:q})).slice(0,5),q);
  }
  const filter = 'Wann muss ich den Filter von meinem Oskar wechseln?';
  assert.equal((await catalogue({q:filter,view:'compact'})).tools[0]?.name,'oskar_filtermatten_gemeinsamer_vorrat');
  assert.equal(analytics,0);
});

test('GlassVAC cold charging questions find the measured-temperature decision', async () => {
  const name = 'glassvac_kalt_lagern_einschalten_laden_getrennt';
  for (const q of [
    'Mein Bosch GlassVAC lag nachts bei Frost in der Garage. Kann ich ihn dort gleich an die Steckdose hängen?',
    'Der Bosch GlassVAC 06008B7000 liegt im unbeheizten Schuppen. Darf ich den Akku dort bei minus 3 Grad aufladen?',
    'Mein Bosch-Fenstersauger 06008B7000 stand über Nacht bei Frost in der Garage. Kann er gleich ans Ladegerät?',
    'Kann ich meinen Glass-Vac bei −5 °C im Auto am USB-Kabel laden oder muss er erst ins Warme?',
  ]) {
    const {tools} = await catalogue({q,view:'compact',limit:'5'});
    assert.equal(tools[0]?.name,name,q);
    assert.deepEqual(names(tools),names(findCatalogueTools(compact,{query:q})).slice(0,5),q);
    assert.equal(toolGuidePath(tools[0]),'/produkte.html#bosch-glassvac-einsatz-und-pflege',q);
    assert.deepEqual((await catalogue({q,category:'Feuchte',tool:name})).tools,[],q);
  }
  for (const q of [
    'Welches USB-Kabel passt zum Bosch GlassVAC 06008B7000?',
    'Bosch GlassVAC 06008B7000: Welchen Ladeanschluss zeigt das Foto aus der kalten Garage?',
    'Die LED an meinem GlassVAC blinkt beim Laden nach Frost. Ist der Akku defekt?',
    'Mein Bosch GlassVAC ist nach Frost im Schuppen kaputt, die LED blinkt beim Laden. Wie kann ich den Fehler finden?',
    'Wie lädt man den Kärcher WV 8 bei −3 °C in der Garage?',
    'Bosch GlassVAC 06008B7000: Ist auf dem Angebotsfoto der kleine Saugkopf dabei?',
  ]) {
    const {tools} = await catalogue({q,view:'compact',limit:'5'});
    assert.notEqual(tools[0]?.name,name,q);
    assert.deepEqual(names(tools),names(findCatalogueTools(compact,{query:q})).slice(0,5),q);
  }
  assert.equal(analytics,0);
});

test('German N90 cost questions find the exact label and metered comparison tool', async () => {
  const tool = 'pac_n90_energielabel_zu_stromkosten';
  for (const query of [
    'Was kostet eine Stunde mit dem PAC N90 ECO Silent bei 35 Cent pro kWh laut EU-Label?',
    'Sind 2,5 kW Kühlleistung beim DeLonghi Pinguino N90 der Stromverbrauch?',
    'Mein Zwischenzähler am N90 zeigt 1,8 kWh in drei Stunden. Was kostet der gemessene Lauf?',
  ]) {
    const response = await catalogue({q:query, view:'compact', limit:'3'});
    assert.equal(response.tools[0]?.name, tool, query);
    assert.equal(findCatalogueTools(compact, {query})[0]?.name, tool, query);
  }
  const identity = 'pac_n90_ean_abgleichen';
  assert.equal((await catalogue({q:identity, view:'compact'})).tools[0]?.name, identity);
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
  const sections = {
    glassvac_kalt_lagern_einschalten_laden_getrennt:'bosch-glassvac-einsatz-und-pflege',
    fenstersauger_wv3_wv8_led_muster_einordnen:'kaercher-fenstersauger-einsatz-und-hinweise',
  };
  for (const [question, expected] of fenstersaugerQuestions) {
    const client = names(findCatalogueTools(compact, {query:question})).slice(0, 3);
    const {tools} = await catalogue({q:question, view:'compact', limit:'3'});
    assert.deepEqual(names(tools), client, question);
    const matching = tools.find(tool => tool.name === expected);
    assert.ok(matching, question);
    const section = sections[expected] ?? 'fenstersauger-belege';
    assert.equal(matching.guide_url, origin + '/produkte.html#' + section);
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

test('German per-load cost comparisons rank the measured tool first in the browser and API', async () => {
  const name = 'waesche_trocknungskosten';
  const questions = [
    'Wäschetrockner oder Luftentfeuchter – was kostet das Trocknen pro Ladung?',
    'Was kostet mich das Trocknen pro Waschladung mit dem Trockner oder Entfeuchter?',
    'Trockner oder Luftentfeuchter: Wie viel Stromgeld kostet mich eine gleich trockene Ladung Wäsche?',
    'Waeschetrockner gegen Luftentfeuchter: Welcher Trocknungsweg kostet bei gleicher Ladung weniger Euro?',
    'Ich habe die kWh für den Trockner und den Entfeuchter gemessen. Was kostet eine Ladung Wäsche jeweils?',
  ];
  for (const q of questions) {
    const browser = names(findCatalogueTools(compact, {query:q}));
    const api = await catalogue({q, view:'compact', limit:'5'});
    assert.equal(browser[0], name, q);
    assert.deepEqual(names(api.tools), browser.slice(0,5), q);
    assert.equal(browser.filter(value => value === name).length, 1, q);
  }
  const query = questions[0];
  assert.deepEqual(names((await catalogue({q:query, tool:name})).tools), [name]);
  assert.equal(findCatalogueTools(compact, {query, name, category:'Strom & Haushalt'})[0]?.name, name);
  assert.deepEqual(findCatalogueTools(compact, {query, name, category:'Feuchte'}), []);
  assert.deepEqual((await catalogue({q:query, tool:name, category:'Feuchte'})).tools, []);
  assert.deepEqual(findCatalogueTools(compact, {query, name:'btu_empfehlung'}), []);
  assert.deepEqual((await catalogue({q:query, tool:'btu_empfehlung'})).tools, []);
  assert.equal(analytics, 0);
});

test('single appliances, loads and seasonal purchase questions keep their existing rankings', async () => {
  const costTool = 'waesche_trocknungskosten';
  // The per-load comparison can occur organically lower in broad matches.
  // Preserve both the first result and its previous one-based rank (zero if absent).
  const cases = [
    ['Luftentfeuchter', 'entfeuchter_ablaufcheck', 42],
    ['Wäschetrockner', 'pflegeetikett_naturweg_bei_trocknerverbot', 2],
    ['Ladung', 'spuelmaschine_ladung_entnahme_stationen', 0],
    ['Was kostet mein Trockner pro Ladung?', undefined, 0],
    ['Was kostet der Luftentfeuchter im Keller pro Tag?', 'kellerentfeuchter_pruefpunkt_abgleichen', 0],
    ['Wäschetrockner oder Luftentfeuchter – was kostet eine Ladung einschließlich Kaufpreis?', 'wasch_trockner_zweiladung_uebergabestau', 0],
    ['Was kostet eine Ladung Wäsche, wenn Trockner und Luftentfeuchter gleichzeitig laufen?', 'waesche_wochenbedarf_leine_und_trockner', 7],
    ['Was kostet es pro Ladung, wenn ich nur den Trockner nutze und den Luftentfeuchter ausgeschaltet lasse?', 'wasch_trockner_zweiladung_uebergabestau', 0],
    ['Was kostet es pro Ladung, wenn ich nur den Trockner nutze und den Luftentfeuchter abgeschaltet lasse?', 'wasch_trockner_zweiladung_uebergabestau', 0],
    ['Lohnt sich ein Luftentfeuchter für Wäsche im Winter, wenn manche Ladungen weiter in den Trockner gehen?', 'waesche_trocknungswechsel_kaufschwelle', 5],
    ['Zwei Waschladungen sind nacheinander fertig. Wie lange wartet die zweite auf den Trockner?', 'wasch_trockner_zweiladung_uebergabestau', 0],
  ];
  for (const [query, first, rank] of cases) {
    const browser = names(findCatalogueTools(compact, {query}));
    const api = await catalogue({q:query, view:'compact'});
    assert.equal(browser[0], first, query);
    assert.equal(browser.indexOf(costTool) + 1, rank, query);
    assert.deepEqual(names(api.tools), browser, query);
  }
});

test('individual laundry dehumidifier costs match the buyer question on the web and the public directory',async()=>{
  const name='luftentfeuchter_waesche_einzelkosten';
  for (const q of [
    'Ich habe keinen Wäschetrockner. Mein Entfeuchter hat für eine trockene Ladung 1,8 kWh verbraucht. Was kostet das bei 35 Cent/kWh?',
    'Ich habe nur den Entfeuchter gemessen. Kann ich die Stromkosten je Wäscheladung teilen, ohne den Trockner zu schätzen?',
    'Was kostet eine Ladung Wäsche nur mit meinem Luftentfeuchter?',
    'Was kostet mein Luftentfeuchter bei gemessenen durchschnittlich 400 W über sechs Stunden für eine Wäscheladung?',
  ]) {
    const {tools}=await catalogue({q,view:'compact',limit:'3'});
    assert.equal(tools[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(tools[0]),'/waeschetrockner-oder-luftentfeuchter.html#luftentfeuchter-waesche-kosten');
  }
  for (const q of [
    'Wäschetrockner oder Luftentfeuchter – was kostet das Trocknen pro Ladung?',
    'Was kostet es, wenn Luftentfeuchter und Trockner gleichzeitig für eine Ladung laufen?',
    'Rechnet sich der Kaufpreis für einen Luftentfeuchter im Winter bei meinen Kosten pro Ladung?',
    'Mein Luftentfeuchter hat laut Typenschild 400 Watt. Was kostet eine Ladung Wäsche?',
    'Wie viel kostet mein Entfeuchter im Keller pro Monat?',
    'Was kostet eine Ladung nur im Wäschetrockner bei meinem Stromtarif?',
  ]) {
    assert.deepEqual((await catalogue({q,tool:name})).tools,[],q);
    assert.ok(!names(findCatalogueTools(compact,{query:q})).includes(name),q);
  }
  assert.equal(analytics,0);
});

test('FRITZ! 302 Danfoss valve questions reach the German adapter table and keep firmware and other heads separate',async()=>{
  const name='fritz_302_danfoss_adapter';
  const guide='/guide/smarte-heizkoerperthermostate-lohnen-sich.html#fritz-302-danfoss-adapter';
  for (const q of [
    'Welcher Adapter liegt meinem FRITZ!Smart Thermo 302 für ein Danfoss RA Ventil bei?',
    'Passt der beiliegende RA-Adapter meines FRITZ!Smart Thermo 302 an ein Danfoss RAV oder RAVL?',
    'Ich habe den FRITZ!DECT 302. Welchen Adapter brauche ich? Ich erkenne mein Ventil nicht.',
    'FRITZ Thermostat 302: Ist mein RAVL mit 25,5 mm dabei?',
    'Artikel 20003120 am RAV: Ist der Pin im Paket enthalten?',
    'FRITZ!DECT 302 mit Ventil von Danfoss RAV, was muss separat zum Gerät gekauft werden?',
  ]) {
    const {tools}=await catalogue({q,view:'compact',limit:'3'});
    assert.equal(tools[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(tools[0]),guide);
    assert.ok(!names(tools).some(result=>['fritz_302_router_firmware_mindeststand','tado_x_oventrop_ventiladapter_pruefen'].includes(result)),q);
    assert.deepEqual((await catalogue({q,category:'Raumklima',tool:name})).tools,[],q);
  }
  for (const q of [
    'Welche Firmware benötigt meine FRITZ!Box mit dem FRITZ!Smart Thermo 302?',
    'Welcher Adapter passt für mein Bosch Heizkörperthermostat II auf Danfoss RAVL?',
    'Tado X auf Danfoss RAV, welcher Adapter ist nötig?',
    'FRITZ!DECT 301 oder FRITZ!DECT 302 – welcher Danfoss-Adapter gilt für beide?',
    'Welchen USB-Adapter braucht die FRITZ!DECT 302?',
    'Welche Batterien braucht mein FRITZ!Smart Thermo 302 an Danfoss RA?',
    'Wie programmiere ich einen Zeitplan am FRITZ!Smart Thermo 302 mit Danfoss RA?',
    'Danfoss RAV und RAVL: Welche Heizthermostate kann ich anbauen?',
  ]) {
    assert.deepEqual((await catalogue({q,tool:name})).tools,[],q);
    assert.ok(!names(findCatalogueTools(compact,{query:q})).includes(name),q);
  }
  const firmware='Welche Firmware benötigt meine FRITZ!Box mit dem FRITZ!Smart Thermo 302?';
  assert.equal((await catalogue({q:firmware,view:'compact'})).tools[0]?.name,'fritz_302_router_firmware_mindeststand');
  assert.equal(analytics,0);
});

test('a rise anywhere in a dehumidifier hose reaches its drainage check and leaves cold-output and other appliance queries intact',async()=>{
  const name='entfeuchter_ablaufcheck';
  const page='/guide/luftentfeuchter-keller.html';
  for (const q of [
    'Kann ich den Schlauch vom MeacoDry Arete One 20L nach oben in das Waschbecken legen?',
    'Geht der Ablauf beim Comfee MDDF-20DEN7 auch bergauf bis zum Waschbecken?',
    'Mein Entfeuchter hat einen Ablaufschlauch, der Bodenablauf liegt niedriger, aber der Schlauch geht zwischendurch über eine Schwelle. Funktioniert das ohne Pumpe?',
    'Beim Kellerentfeuchter läuft der Schlauch erst über die Türschwelle und dann nach unten. Geht das?',
  ]) {
    const full=await catalogue({q,limit:'3'});
    const listed=(await catalogue({q,view:'compact',limit:'3'})).tools;
    assert.equal(full.tools[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(listed[0]?.name,name,q);
    assert.equal(listed[0].citation_url,origin+page);
    assert.equal(toolGuidePath(listed[0]),page+'#ablauf-vor-kauf');
    assert.deepEqual((await catalogue({q,category:'Kühlen',tool:name})).tools,[],q);
  }
  for (const [q,expected] of [
    ['Was leistet der MeacoDry Arete One 20L bei 10 °C und 60 % im Keller?','kellerentfeuchter_pruefpunkt_abgleichen'],
    ['Braucht der Comfee MDDF-20DEN7-WF einen WLAN-Zugang?','comfee_mddf20_wf_beleggrenze'],
    ['Hat meine Waschmaschine genügend Förderhöhe für einen höheren Ablauf?','spuelmaschine_ablaufweg_anleitung'],
    ['Which adapter do I need for my dehumidifier hose?',undefined],
  ]) {
    assert.equal((await catalogue({q,view:'compact'})).tools[0]?.name,expected,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,expected,q);
  }
  assert.equal(analytics,0);
});

test('paired German cellar air and wall questions find the measured check in public and compact search', async()=>{
  const name='keller_lueften_taupunkt_messwerte';
  const page='/guide/keller-lueften-sommer.html';
  for(const q of [
    'Soll ich meinen Keller lüften? Innen 16 °C und 75 %, draußen 8 °C und 90 %, die kälteste Wand hat 12 °C.',
    'Mein Keller hat 16 Grad und 75 % Feuchte, draußen 8 Grad und 90 %. Wird er trotz höherer Außenfeuchte beim Lüften trockener?',
    'Keller lüften: Innen 17 Grad, 65 Prozent Luftfeuchte. Draußen 28 Grad bei 60 Prozent. Wand ist 15 Grad kalt. Fenster auf?',
    'Soll ich meinen Keller jetzt lüften? Meine Wandtemperatur kenne ich nicht.',
    'Drinnen 70 %, außen 80 %: Würde Lüften den Keller trockener machen?',
    'Kellerfenster öffnen?',
    'Kann ich das Kellerfenster jetzt öffnen, draußen 10 °C und 80 %, innen 17 °C und 65 %, die Wand 15 °C?',
  ]) {
    const full=await catalogue({q,limit:'3'});
    const listed=(await catalogue({q,view:'compact',limit:'3'})).tools;
    assert.equal(full.tools[0]?.name,name,q);
    assert.equal(listed[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(listed[0].citation_url,origin+page);
    assert.equal(toolGuidePath(listed[0]),page+'#taupunkt');
    assert.deepEqual((await catalogue({q,category:'Kühlen',tool:name})).tools,[],q);
  }
  for(const [q,previous] of [
    ['Wie messe ich Luftfeuchtigkeit im Keller?','keller_hygrometer_anzeige_obere_messgrenze'],
    ['Bei welchem Feuchtewert außen liegt der Taupunkt zwei Grad unter meiner Kellerwand?','keller_aussen_hygrometer_zielwert_oberflaechenreserve'],
    ['Wie lange soll ich meinen Keller lüften?','keller_sommer_lueften_messfenster'],
    ['Was schafft Meaco Arete One 20L bei 10 Grad und 60 Prozent im Keller?','kellerentfeuchter_pruefpunkt_abgleichen'],
    ['Mein Kellerentfeuchter muss bergauf zum Waschbecken entwässern, wie geht das?','entfeuchter_ablaufcheck'],
    ['Wie oft den Keller zur Frischluftversorgung lüften?',undefined],
    ['Relative humidity inside the basement and outside: should I ventilate?',undefined],
    ['taupunkt_lueften','taupunkt_lueften'],
  ]) {
    assert.equal((await catalogue({q,view:'compact'})).tools[0]?.name,previous,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,previous,q);
  }
  for (const q of ['Wie soll ich bei erhöhtem CO₂ im Keller lüften?', 'Wie soll ich bei erhöhtem CO2 im Keller lüften?',
    'Kann ich verschimmelte Kartons im Keller durch Lüften trocknen?']) {
    assert.notEqual((await catalogue({q,view:'compact'})).tools[0]?.name,name,q);
    assert.notEqual(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
  }
  assert.equal(analytics,0);
});

test('exact German Beurer and Levoit replacement questions find the documented model lookup', async()=>{
 const name='luftreiniger_ersatzfilter_zuordnung';
 for(const q of [
   'Welcher Ersatzfilter passt zu meinem Beurer LR 401? Auf der Packung steht 69309.',
   'Hat der Filter 69309 für meinen LR401 die richtige Nummer?',
   'Welchen Filter brauche ich für meinen Levoit Core 300S ohne Pro?',
   'Welcher Standardfilter passt in meinen Core 300S?',
 ]) {
   const results=(await catalogue({q,view:'compact',limit:'3'})).tools;
   assert.equal(results[0]?.name,name,q);
   assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
   assert.equal(toolGuidePath(results[0]),'/ersatzfilter.html#finder',q);
   assert.deepEqual((await catalogue({q,tool:name,category:'Heizen'})).tools,[],q);
 }
 for(const q of [
   'Welcher Filter passt zu meinem Levoit Core 300S Pro?',
   'Wie wechsle ich den Filter von meinem Levoit Core 300S?',
   'Passt der Filter für den LR 401 auch in den LR 410?',
   'Ist der Beurer Filter 69309 für meinen LR 405 oder LR 500 geeignet?',
   'Kann ich den Filter vom Core 300S unter Wasser auswaschen?',
   'Was kostet mich der Filter für den Beurer LR 401 im Jahr bei zwei Wechseln?',
   'Welcher Ersatzfilter passt in den Bosch LR 401?',
   'Ersatzfilter für Xiaomi Core 300S',
   'Welcher Ersatzfilter passt zum Beurer LR 401 Plus?',
   'Welcher Ersatzfilter passt zum Levoit Core 300S Plus?',
 ]) assert.notEqual((await catalogue({q,view:'compact'})).tools[0]?.name,name,q);
 assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
 assert.equal(analytics,0);
});

test('German Philips replacement queries find the type-plate check rather than generic maintenance', async()=>{
 const name='philips_verdunsterfilter_zuordnung';
 for(const q of [
  'Passt der Filter FY2401/30 in meinen Philips HU2716/10?',
  'Welcher Ersatzfilter passt zum Philips HU4803/01?',
  'Mein Philips trägt Series 2000: Brauche ich FY2401/30 oder FY3446/30?',
  'Welcher Filter passt zu meinem Philips Luftbefeuchter Series 2000?',
  'HU2716/11 Ersatzfilter',
  'FY 3446/30',
 ]) {
  const results=(await catalogue({q,view:'compact',limit:'3'})).tools;
  assert.equal(results[0]?.name,name,q);
  assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
  assert.equal(toolGuidePath(results[0]),'/guide/luftbefeuchter-ratgeber.html#philips-verdunsterfilter');
 }
 for(const q of [
  'Wie oft soll ich den Filter vom Philips HU2716/10 reinigen?',
  'Ersatzfilter für Philips Series 2000 AC2887 Luftreiniger',
  'Welcher Ersatzfilter passt zu meinem Beurer LR 401?',
  'FY3446/30 Vergleich mit Venta Filter',
 ]) {
  assert.ok(!(await catalogue({q,view:'compact'})).tools.some(tool=>tool.name===name),q);
 }
 assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
 assert.equal(analytics,0);
});

test('an electric blanket cost question no longer recommends an air conditioner', async()=>{
 const name='heizdecke_stromkosten_nennleistung';
 const cooling='pac_n90_energielabel_zu_stromkosten';
 const path='/guide/heizdecke-stromverbrauch.html#waerme-rechner';
 for(const q of [
   'Was kostet eine Heizdecke mit 110 Watt für zwei Stunden auf dem Sofa bei 35 Cent pro kWh?',
   'Was kostet ein Abend mit meiner Beurer HD 75? Ich zahle 0,35 Euro pro kWh und nutze sie zwei Stunden auf dem Sofa.',
   'Meine Beurer HD 75 schaltet nach drei Stunden ab. Wieviel kostet ein Abend bei 0,35 Euro pro Kilowattstunde?',
   'Was kostet eine Heizdecke für zwei Stunden?',
   'Stromverbrauch einer Wärmezudecke',
   'Was kostet eine Heizdecke an Strom?',
   'Wie viel Strom braucht eine Heizdecke pro Abend?',
   'Heizdeckenstromkosten bei 100 Watt',
 ]) {
   const results=(await catalogue({q,view:'compact',limit:'5'})).tools;
   assert.equal(results[0]?.name,name,q);
   assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
   assert.equal(toolGuidePath(results[0]),path,q);
   assert.ok(!results.some(tool=>tool.name===cooling),q);
 }
 for(const q of [
   'Was kostet die Beurer HD 75 im Angebot bei Amazon?',
   'Darf ich mit der Heizdecke schlafen und wie viel Strom kostet es?',
   'Wie lange läuft die Heizdecke bis zur Abschaltautomatik?',
   'Wieviel spare ich mit der Heizdecke statt Gasheizung?',
   'Was kosten gemessene 0,15 kWh einer Heizdecke?',
   'Was kostet das Wärmeunterbett im Vergleich zur Heizdecke?',
 ]) {
   assert.ok(!(await catalogue({q,view:'compact'})).tools.some(tool=>tool.name===name),q);
 }
 const n90=(await catalogue({q:'DeLonghi Pinguino PAC N90 8004399512351 Stromverbrauch bei 0,35 Euro',view:'compact'})).tools;
 assert.equal(n90[0]?.name,cooling);
 assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
 assert.equal(analytics,0);
});

test('two hygrometers at the same place route to tolerance instead of reference calibration',async()=>{
 const name='hygrometer_messbereiche';
 const calibration='hygrometer_zweipunkt_referenz_abgleich';
 const path='/guide/luftfeuchtigkeit-richtig-messen.html#hygrometer-vergleichen';
 for(const q of [
   'Meine zwei Hygrometer zeigen nebeneinander 55 und 60 Prozent an. Beide haben ±3 Prozentpunkte Genauigkeit. Muss ich eines ersetzen?',
   'Das eine Hygrometer zeigt 54 %, das andere 59 %. Liegt der Unterschied noch in der Toleranz?',
   'Zwei Hygrometer am gleichen Ort zeigen unterschiedliche Werte. Welches stimmt?',
   'Hygrometer A zeigt 55 % und Hygrometer B 60 % bei gleicher Höhe. Wie vergleiche ich die Werte?',
   'Zwei Hygrometer unterscheiden sich am selben Ort um 5 Prozentpunkte.',
   'Zwei Hygrometer haben am gleichen Standort eine Differenz von 5 Prozentpunkten.',
 ]) {
   const results=(await catalogue({q,view:'compact',limit:'5'})).tools;
   assert.equal(results[0]?.name,name,q);
   assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
   assert.equal(toolGuidePath(results[0]),path,q);
   assert.ok(!results.some(tool=>tool.name===calibration),q);
 }
 for(const q of [
   'Wie kann ich mein Hygrometer zwischen zwei externen Referenzpunkten abgleichen?',
   'Ich will ein Hygrometer mit zwei extern belegten Referenzwerten kalibrieren, nicht zwei Geräte vergleichen.',
 ]) assert.equal((await catalogue({q,view:'compact'})).tools[0]?.name,calibration,q);
 for(const q of [
   'Zwei Hygrometer zeigen an der Fensterbank und am Heizkörper unterschiedliche Werte.',
   'Mein Hygrometer zeigt vor dem Lüften 60 Prozent und nach dem Lüften 55 Prozent.',
   'Zwei Hygrometer zeigen unterschiedliche Werte – welches stimmt?',
 ]) assert.notEqual((await catalogue({q,view:'compact'})).tools[0]?.name,name,q);
 assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
 assert.equal(analytics,0);
});

test('German N90 offer identity and label-cost requests reach different verified guides',async()=>{
 const identity='pac_n90_ean_abgleichen';
 const energy='pac_n90_energielabel_zu_stromkosten';
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
   const results=(await catalogue({q,view:'compact',limit:'5'})).tools;
   assert.equal(results[0]?.name,identity,q);
   assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,identity,q);
   assert.equal(toolGuidePath(results[0]),page+'#testlage',q);
   assert.ok(!results.some(tool=>tool.name===energy),q);
 }
 for(const q of [
   'Was kostet eine Stunde mit dem PAC N90 ECO Silent bei 35 Cent pro kWh laut EU-Label?',
   'DeLonghi Pinguino PAC N90 EAN 8004399512351 – Strom-Kosten bei 35 Cent pro kWh?',
   'Was verbraucht das PAC N90 ECO Silent laut EAN 8004399512351 im Betrieb?',
 ]) {
   const [first]=(await catalogue({q,view:'compact'})).tools;
   assert.equal(first?.name,energy,q);
   assert.equal(toolGuidePath(first),page+'#n90-energielabel',q);
 }
 for(const q of [
  'Welche EAN passt zum DeLonghi PAC EX105?',
  'Welche Halterung gehört zur Midea PortaSplit mit EAN 4048164116478?',
 ]) assert.notEqual((await catalogue({q,view:'compact'})).tools[0]?.name,identity,q);
 for(const q of [
  'DeLonghi PAC EX105 Energielabel Stromkosten',
  'DeLonghi PAC EX105 Energieetikett und Preis pro Stunde',
 ]) assert.ok(!(await catalogue({q,view:'compact'})).tools.some(tool=>tool.name===energy),q);
 assert.ok(!(await catalogue({q:'PAC N90 mit EAN 8004399512351: Leistungsaufnahme in W?',view:'compact'})).tools.some(tool=>tool.name===identity));
 assert.equal((await catalogue({q:identity,view:'compact'})).tools[0]?.name,identity);
 assert.equal(analytics,0);
});

test('original PortaSplit lip sizes reach the measurement tool without borrowing other bracket scopes',async()=>{
 const name='midea_portasplit_fensterfalz_pruefen';
 const bracket='midea_portasplit_fensterhalterung_pruefen';
 const page='/guide/midea-portasplit-ausverkauft-alternativen.html';
 for(const q of [
   'Mein Fensterfalz ist 6 cm breit. Muss ich bei der Midea PortaSplit die Gummidichtung beim Messen mitzählen?',
   'Muss ich beim Ausmessen des Fensterrahmens für die PortaSplit die Dichtung zusammendrücken oder mitmessen?',
   'Die PortaSplit passt nicht ans Fenster, wo muss ich die Rahmendicke messen?',
   'Meine originale Midea PortaSplit hat einen 60 mm breiten Fensterfalz. Passt die mitgelieferte Standardhalterung?',
   'Midea PortaSplit Standardhalterung passt an einen Falz mit 45 mm Breite und 20 mm Höhe?',
   'Fensterfalzbreite für EAN 4048164116478 prüfen',
 ]) {
   const results=(await catalogue({q,view:'compact',limit:'5'})).tools;
   assert.equal(results[0]?.name,name,q);
   assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
   assert.equal(toolGuidePath(results[0]),page+'#fensterfalz',q);
 }
 const roof=(await catalogue({q:'Midea PortaSplit Dachfenster Universalhalterung',view:'compact'})).tools;
 assert.equal(roof[0]?.name,bracket);
 assert.equal(toolGuidePath(roof[0]),page+'#kaufpruefung');
 for(const q of [
  'Passt der 60 mm breite Fensterfalz zur Standardhalterung meiner Midea PortaSplit Pro?',
   'PortaSplit 2 Fensterfalz messen',
   'PortaSplit II Fensterfalz messen',
  'Midea PortaSplit Lite am Dachfenster mit Universalhalterung',
  'PortaSplit Cool Falzbreite der Standardhalterung messen',
  'Midea PortaSplit E Fensterrahmen 45 mm messen',
 ]) assert.ok(!(await catalogue({q,view:'compact'})).tools.some(tool=>[name,bracket].includes(tool.name)),q);
 assert.ok(!(await catalogue({q:'Midea PortaSplit außen öffnendes Fenster mit 60 mm Fensterfalz',view:'compact'})).tools.some(tool=>tool.name===name));
 assert.ok(!(await catalogue({q:'Fensterabdichtung für meinen Monoblock mit Dichtung messen',view:'compact'})).tools.some(tool=>tool.name===name));
 assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
 assert.equal(analytics,0);
});

test('German window-seal decisions do not route to a door-floor profile', async()=>{
  const name='tesamoll_fensterdichtung_profil_pruefen';
  const door='tesa_tuerbodenprofil_belag_groesster_spalt';
  const guide='/guide/fenster-zugluft-mietwohnung.html#dichtungsprofil';
  for(const q of [
    'Mein altes Fenster zieht. Der Spalt ist 4 mm breit – welches tesamoll-Profil brauche ich: E, P oder D?',
    'Ich messe am alten Holzfenster 4 mm Spalt. P-Profil oder D-Profil von tesamoll, welches soll ich kaufen?',
    'Im Rahmen meines alten Fensters steckt eine Gummidichtung in einer Nut. Kann ich bei 4 mm Spalt ein tesamoll D-Profil darüberkleben?',
    'Fensterdichtung im Altbau: E- oder P-Dichtung wählen?',
    'Welches tesamoll E-, P- oder D-Profil passt bei 4 mm Spalt?',
    'D-Profil vs P-Profil für mein Holzfenster bei 4 mm',
  ]){
    const results=(await catalogue({q,view:'compact',limit:'5'})).tools;
    assert.equal(results[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(results[0]),guide,q);
    assert.ok(!results.some(tool=>tool.name===door),q);
  }
  for(const q of [
    'tesamoll Türbodendichtung auf glatten Fliesen',
    'Fensterdichtung E-Profil eines anderen Herstellers bei 4 mm Spalt',
    'Midea PortaSplit Fensterfalz mit Dichtung bei 60 mm',
    'Duschdichtung mit D-Profil bei 4 mm',
    'tesamoll Silikonprofil für 4 mm Fensterdichtung',
    'Meine Haustür mit tesamoll E- oder P-Profil bei 4 mm abdichten?',
    'Fensterdichtung P oder D, aber nicht tesamoll',
    'Mein Fenster zieht. Wie prüfe ich die Ursache?',
  ]) assert.ok(!(await catalogue({q,view:'compact',limit:'5'})).tools.some(tool=>tool.name===name),q);
  assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
  assert.equal(analytics,0);
});

test('German noise comparisons prefer the noise check and retain cost, noise fault and bracket intent',async()=>{
  const name='klimaanlage_geraeusch_vergleich';
  const energy='pac_n90_energielabel_zu_stromkosten';
  const page='/guide/delonghi-pac-n90-test.html#lautstaerke';
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
    const hits=(await catalogue({q,view:'compact',limit:'5'})).tools;
    assert.equal(hits[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(hits[0]),page,q);
    assert.ok(hits.every(tool=>tool.name!==energy),q);
  }
  for(const [q,expected] of [
    ['PAC N90 Stromkosten pro Stunde bei 35 Cent pro kWh',energy],
    ['Klimaanlage klackert und rattert. Wie dokumentiere ich das Geräusch für den Service?','klima_geraeuschmeldung_ausschnitt_abdeckung'],
    ['Midea PortaSplit: 60 mm Fensterfalz, zähle ich die Gummidichtung mit?','midea_portasplit_fensterfalz_pruefen'],
  ]){
    const [first]=(await catalogue({q,view:'compact',limit:'3'})).tools;
    assert.equal(first?.name,expected,q);
  }
  for(const q of [
    'Wie laut ist die Midea PortaSplit nachts?',
    'Ist die PortaSplit Lite mit 39 dB oder der N90 mit 64 dB leiser?',
  ]) assert.notEqual((await catalogue({q,view:'compact',limit:'3'})).tools[0]?.name,name,q);
  assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
  assert.equal(analytics,0);
});

test('exact ECO test-point queries cannot pick other fixed-model cellar or electricity data',async()=>{
  const name='trotec_ttk75_eco_pruefpunkt';
  const guide='/guide/trotec-luftentfeuchter-test.html#ttk75-pruefpunkt';
  const otherTools=['kellerentfeuchter_pruefpunkt_abgleichen','pac_n90_energielabel_zu_stromkosten'];
  for(const q of [
    'Wie viele Liter zieht ein Trotec TTK 75 ECO im kalten Keller bei 10 °C und 60 % Luftfeuchte und wie viel Strom?',
    'Was schafft der Trotec TTK 75 ECO bei 20 Grad und 60 Prozent? Sind 21 Liter am Tag auch im Keller realistisch?',
    'TTK75 Eco bei 30°C und 80 Prozent: Entfeuchtungsleistung?',
    'Kann ein TTK-75-ECO bei 5 Grad im Keller laufen?',
    'Schafft der Trotec TTK 75 ECO 20 l pro Tag laut Anleitung?',
    'TTK 75 ECO 20 l/24 h: stimmt die Angabe?',
  ]){
    const hits=(await catalogue({q,view:'compact',limit:'5'})).tools;
    assert.equal(hits[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(hits[0]),guide,q);
    assert.ok(hits.every(tool=>!otherTools.includes(tool.name)),q);
  }
  for(const q of [
    'Trotec TTK 75 E bei 30 °C und 80 % Liter pro Tag',
    'TTK 75 ECO Pro Entfeuchtungsleistung bei 10 °C',
    'Nicht TTK 75 ECO, sondern Trotec TTK 75 E: wie viel Wasser zieht der bei 30 °C und 80 %?',
    'Trotec TTK 75 ECO Schlauch und Ablauf für den Keller',
    'Trotec TTK 75 ECO Filter reinigen',
    'Stromkosten des TTK 75 ECO bei 440 Watt',
  ]) assert.ok(!(await catalogue({q,view:'compact',limit:'5'})).tools.some(tool=>tool.name===name),q);
  const preserved=(await catalogue({q:'Was leistet der MeacoDry Arete One 20L bei 10 °C und 60 % im Keller?',view:'compact',limit:'3'})).tools;
  assert.equal(preserved[0]?.name,'kellerentfeuchter_pruefpunkt_abgleichen');
  assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
  assert.equal(analytics,0);
});

test('exact German coffee models and part codes reach the existing compatibility check',async()=>{
  const name='kaffeevollautomat_intenza_aquaclean_filterfamilie_modellpruefung';
  const oldIdle='delonghi_magnifica_filter_stillstand_drei_wochen';
  const oldLight='philips_aquaclean_orange_blinkt_blau_filteranzeige';
  for(const q of [
    'Mein Philips EP2220/10 braucht einen neuen Wasserfilter. Welche Patrone soll ich bestellen?',
    'Für die Bosch VeroCafe TIE20301: Passt der Wasserfilter TCZ7033 oder muss ich TCZ7003 kaufen?',
    'Ich habe eine DeLonghi Magnifica S ECAM22.110.B. Welchen Ersatzfilter für den Wassertank brauche ich?',
    'Passt der DLSC002 in meine DeLonghi ECAM22.110.B?',
    'EP2231/40 AquaClean: passt die Patrone CA6903/10?',
    'Bosch TIE20301. Welcher Wasserfilter?',
    'Passt BRITA Intenza TCZ7003 statt AquaClean im Philips EP2231/40?',
  ]){
    const hits=(await catalogue({q,view:'compact',limit:'5'})).tools;
    assert.equal(hits[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(hits[0]),'/produkte.html#kaffee-wasserfilter',q);
    assert.ok(hits.every(tool=>tool.name!==oldIdle),q);
  }
  for(const [q,tool] of [
    ['Philips EP2220/10 AquaClean blinkt orange: Filter kaufen?',oldLight],
    ['DeLonghi ECAM22.110.B seit drei Wochen nicht benutzt: Wasserfilter wechseln?',oldIdle],
    ['Welchen Ersatzfilter brauche ich für mein Levoit Core 300S ohne Pro?','luftreiniger_ersatzfilter_zuordnung'],
  ]){
    const [first]=(await catalogue({q,view:'compact',limit:'3'})).tools;
    assert.equal(first?.name,tool,q);
  }
  const maintenance=(await catalogue({q:'Wie wechsle ich den AquaClean Filter beim Philips EP2231/40 und setze die Anzeige zurück?',view:'compact',limit:'5'})).tools;
  assert.ok(maintenance.every(tool=>tool.name!==name));
  assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
  assert.equal(analytics,0);
});

test('German complete narrow nozzle offers stay separate from rubber, sizing and faults',async()=>{
  const name='fenstersauger_170mm_saugduese_geraetezuordnung';
  for(const q of [
    'Welche komplette schmale 170-mm-Absaugdüse passt für meinen Kärcher WV 8 Signature Line?',
    'Passt die schmale 17-cm-Saugdüse aus dem Angebot an meinen WV 3 Comfort Precision+ Black? Ich brauche den ganzen Kopf, nicht nur die Gummilippe.',
    'Galaxus: Passt die 2.633-512.0 auf meinen Kärcher WV 6 + KV 4?',
    'Kärcher 26335320', '2 633 112 0', '26335120', 'Passt 2.633-605.0 an den WV 3 Comfort Precision+ Black?',
    'Früher hatte ich den Bosch GlassVAC, jetzt nutze ich den Kärcher WV 8. Welche schmale Absaugdüse brauche ich?',
    'Früher hatte ich den Bosch GlassVAC, jetzt nutze ich den Kärcher WV 6 Plus. Welche schmale Absaugdüse passt?',
  ]){
    const tools=(await catalogue({q,view:'compact',limit:'3'})).tools;
    assert.equal(tools[0]?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(tools[0]),'/produkte.html#kaercher-170mm-saugduese',q);
  }
  for(const q of [
    '170 mm', 'Welcher Kärcher WV 3 passt zum 170-mm-Sprossenfenster?',
    'Passt die 170-mm-Abziehlippe 2.633-104.0 an den WV 8?',
    'Im Händlerangebot für meinen WV 8 steht 2.633-513.0. Ist das die ganze schmale Absaugdüse oder nur die Abziehlippe?',
    'Mein Kärcher WV 8 mit 170-mm-Düse hinterlässt Streifen. Muss ich die Gummilippe wechseln?',
    'Kärcher WV 8 170 mm Düse: LED blinkt nach dem Laden.',
    'Wie breit darf die Düse beim WV 3 für mein 170 mm breites Sprossenfenster sein?',
    'Früher hatte ich den WV 8 mit schmaler Absaugdüse, jetzt nutze ich Bosch GlassVAC. Welche schmale Düse passt?',
    'Passt die schmale Düse an meinen Kärcher Staubsauger?',
  ]) assert.ok((await catalogue({q,view:'compact',limit:'3'})).tools.every(tool=>tool.name!==name),q);
  for(const q of [
    'Meine Scheibe ist 170 mm breit, beim WV 8 sind links und rechts je 5 mm Luft nötig. Passt die schmale Saugdüse?',
    'Beim Kärcher WV 3: Passt der Saugkopf 2.633-605.0 zwischen meine Sprossen mit 170 mm Glasbreite?',
  ]) assert.equal((await catalogue({q,view:'compact',limit:'3'})).tools[0]?.name,'fenstersauger_sprossenfenster_duesenbreite',q);
  assert.equal((await catalogue({q:name,view:'compact'})).tools[0]?.name,name);
});

test('Trotec TTK 70 main filter matches only its exact replacement question and codes',async()=>{
  const name='trotec_ttk70_hepa_filter_generation';
  for(const q of [
    'Welcher HEPA-Ersatzfilter passt zu meinem Trotec TTK 70 HEPA? Auf dem Typenschild steht Dezember 2023.',
    'Mein Trotec TTK 70 HEPA Plus ist Baujahr 2024. Passt 7710000024 oder 7710000077?',
    'TTK70HEPA: Ist 7710000080 ein Ersatz für den HEPA-Filter 7710000077?',
    'Welcher Filter für TTK70HEPAPlus?', '7710000024', 'Trotec 7.710.000.077',
  ]){
    const [tool]=(await catalogue({q,view:'compact',limit:'3'})).tools;
    assert.equal(tool?.name,name,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,name,q);
    assert.equal(toolGuidePath(tool),'/guide/trotec-luftentfeuchter-test.html#ttk70-hepa-filter',q);
  }
  for(const q of [
    'Wie oft muss ich den Filter in meinem Trotec TTK 70 HEPA reinigen?',
    'Muss ich beim TTK 70 HEPA den Filter alle sechs Monate wechseln?', 'Wie lange hält der Filter im TTK 70 HEPA?',
    'Wie wechsle ich beim TTK 70 HEPA den Filter?', 'Wann Filter tauschen im TTK 70 HEPA?',
    'Trotec TTK 70 HEPA Plus Staubvorfilter 7710000080', '7710000080', 'Trotec 77100000240',
    'A7710000077', '5.77100000779', 'Trotec 7710000077 für TTK 72 E?', 'Welcher Filter für TTK 70 HEPA Pro?',
    'Passt ein Philips HEPA-Filter 7710000024 in meinen Luftreiniger?', 'Levoit Core 300S HEPA-Filter',
    'Vorher hatte ich einen TTK 70 HEPA, jetzt habe ich einen Meaco Arete One. Passt 7710000077?',
    'Früher Trotec TTK 70 HEPA, jetzt Comfee MDDF. Ist 7710000024 der richtige Filter?',
    'Welcher Filter passt zum TTK 70 HEPA Deluxe? Angebot 7710000077.',
    'Passt 7710000077 für den TTK 70 HEPA Plus 2.0?', 'TTK 70 HEPA Plus Deluxe mit 7710000077?',
    'Für meinen Trotec TTK 70 HEPA Plus brauche ich nur einen Staub-Filter als Ersatzfilter.',
    'Wie viele Liter zieht der TTK 75 ECO im kalten Keller bei 10 Grad?',
  ]) assert.ok((await catalogue({q,view:'compact',limit:'4'})).tools.every(tool=>tool.name!==name),q);
  assert.equal((await catalogue({q:name,view:'compact',limit:'1'})).tools[0]?.name,name);
});

test('Miele bag selection separates one model’s replacement from sharing stock between two machines',async()=>{
  const one='miele_hyclean_beutel_vollstaendige_modellzeile';
  const pair='miele_zwei_sauger_vorrat_beutel_abluftfilter_getrennt';
  for(const [q,expected] of [
    ['Welcher Beutel für Miele Guard L1: TU oder CO?',one],
    ['Ich habe einen Miele Guard M1 Parquet Flex. Passen meine alten GN-Beutel oder brauche ich CO oder TU?',one],
    ['Auf meinem Miele steht nur C2. Kann ich GN oder FJM bestellen?',one],
    ['Auf dem Schild steht nur C2. Compact C2 oder Complete C2, welchen Staubsaugerbeutel brauche ich?',one],
    ['Ich weiß nicht, ob ich Compact C2 oder Complete C2 habe. Welcher Miele-Staubsaugerbeutel passt?',one],
    ['Ich möchte denselben Beutel für Complete C2 und Compact C2 kaufen. GN oder FJM?',pair],
    ['Welcher Staubsaugerbeutel passt in den Miele Compact C2: GN oder FJM?',one],
    ['Passen die Beutel vom Miele Guard S1 auch in den Guard L1, oder muss ich andere kaufen?',pair],
    ['Passen meine Beutel vom Miele Complete C3 auch in den neuen Guard M1?',pair],
    ['Haben Miele Complete C2 und Compact C2 denselben Beuteltyp?',pair],
    ['Können Guard S1 und L1 die gleichen Staubbeutel nutzen?',pair],
  ]){
    const [tool]=(await catalogue({q,view:'compact',limit:'3'})).tools;
    assert.equal(tool?.name,expected,q);
    assert.equal(findCatalogueTools(compact,{query:q})[0]?.name,expected,q);
    assert.equal(toolGuidePath(tool),'/produkte.html#miele-staubsaugerbeutel',q);
  }
  const reset='Miele Guard L1: Die Abluftfilteranzeige leuchtet. Wie setze ich sie nach dem Filterwechsel zurück?';
  assert.equal((await catalogue({q:reset,view:'compact',limit:'1'})).tools[0]?.name,'miele_guard_l1_abluftanzeige_reset_vor_wechsel');
  for(const name of [one,pair]) assert.equal((await catalogue({q:name,view:'compact',limit:'1'})).tools[0]?.name,name);
});
