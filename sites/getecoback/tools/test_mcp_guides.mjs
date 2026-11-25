import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import worker from '../src/worker.js';

const site = new URL('../site/', import.meta.url);
const cwd = fileURLToPath(new URL('..', import.meta.url));
const corpus = JSON.parse(readFileSync(new URL('mcp-guides.json', site), 'utf8'));
const laundry = '/waeschetrockner-oder-luftentfeuchter.html';
const labelSource = 'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/beim-kauf-eines-waeschetrockners-an-den-stromverbrauch-denken-37984';
const textOf = result => result.content.map(item => item.text || '').join('\n');

function assetEnv(overrides = new Map()) {
  const requests = [];
  const env = {ASSETS: {fetch: async request => {
    requests.push(request);
    const url = new URL(request.url);
    assert.equal(url.origin, 'https://getecoback.com');
    assert.equal(url.search, '');
    assert.equal(request.redirect, 'manual');
    const custom = overrides.get(url.pathname);
    if (custom) return custom();
    try {
      const body = readFileSync(new URL(url.pathname.slice(1), site), 'utf8');
      return new Response(body, {headers: {'content-type': url.pathname.endsWith('.json') ? 'application/json' : 'text/markdown; charset=utf-8'}});
    } catch { return new Response('missing', {status: 404}); }
  }}};
  return {env, requests};
}

async function call(name, args, env) {
  const response = await worker.fetch(new Request('https://getecoback.com/mcp/v1', {
    method: 'POST', headers: {'content-type': 'application/json', 'user-agent': 'getecoback-ci'},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name, arguments: args}}),
  }), env, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.error, undefined);
  return payload.result;
}

test('the committed MCP corpus is derived from current public canonical pages and built mirrors', () => {
  const py = spawnSync('python3', ['-c', "import json,sys;sys.path.insert(0,'tools');from build_mcp_guides import collect_guides;print(json.dumps(collect_guides()))"], {cwd, encoding: 'utf8', timeout: 15000});
  assert.equal(py.status, 0, py.stderr);
  assert.deepEqual(corpus, JSON.parse(py.stdout));
  assert.ok(corpus.length > 100);
  assert.ok(corpus.some(entry => entry.u === laundry));
  assert.ok(!corpus.some(entry => /(?:account|members|auth|balkonspeicher|balkonkraftwerk)/.test(entry.u)));
  const entry = corpus.find(entry => entry.u === '/guide/waesche-trocknen-wohnung.html');
  assert.ok(entry.d.startsWith('Wäsche in der Wohnung trocknen:'));
  assert.ok(!/Saugroboter|PortaSplit|Nassreiniger/.test(entry.d));
});

test('the corpus builder excludes noindex pages, private routes and canonical aliases even with mirrors', () => {
  const code = `import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'tools')
import build_search
from build_mcp_guides import collect_guides
with tempfile.TemporaryDirectory() as directory:
 build_search.SITE=Path(directory)
 for route,canonical,robots in [('/guide/public.html','/guide/public.html',''),('/guide/hidden.html','/guide/hidden.html','<meta name="robots" content="follow, NOINDEX">'),('/guide/alias.html','/guide/public.html',''),('/auth/private.html','/auth/private.html','')]:
  page=Path(directory)/route.lstrip('/');page.parent.mkdir(parents=True,exist_ok=True)
  page.write_text('<html lang="de"><head><title>Fixture</title><meta name="description" content="Fixture"><link rel="canonical" href="https://getecoback.com'+canonical+'">'+robots+'</head><main>Public fixture</main></html>')
  page.with_suffix('.md').write_text('# Fixture\\n\\nCanonical (HTML, zitierfähig): https://getecoback.com'+route+'\\n\\nPublic fixture\\n')
 print(json.dumps([entry['u'] for entry in collect_guides()]))`;
  const py = spawnSync('python3', ['-c', code], {cwd, encoding: 'utf8', timeout: 15000});
  assert.equal(py.status, 0, py.stderr);
  assert.deepEqual(JSON.parse(py.stdout), ['/guide/public.html']);
});

test('laundry search stays on task and every search result can be read through the same published corpus', async () => {
  const {env} = assetEnv();
  for (const frage of ['Wäsche trocknen Wohnung Stromkosten', 'waesche trocknen wohnung stromkosten', 'Trockner oder Luftentfeuchter Kosten']) {
    const result = await call('ratgeber_suche', {frage, sprache: 'de', max: 3}, env);
    assert.equal(result.isError, false);
    const text = textOf(result);
    const paths = [...text.matchAll(/https:\/\/getecoback\.com(\/[a-z0-9/-]+\.html)/g)].map(match => match[1]);
    assert.ok(paths.includes(laundry), frage);
    assert.ok(!paths.some(path => /klimaanlage-mietwohnung|fenster-zugluft/.test(path)), frage);
    for (const path of paths) assert.equal((await call('ratgeber_lesen', {pfad: path}, env)).isError, false, path);
  }
});

const focusedLookups = [
  {
    path:'/guide/heizkosten-vergleich-rechner.html', section:'heizluefter-oder-infrarot',
    expectedTitle:'Heizlüfter oder Infrarotheizung für kurze Einsätze?',
    queries:["Heizlüfter oder Infrarotheizung", "Was ist billiger: Heizlüfter 2000 W für 15 Minuten oder Infrarotpanel 600 W für eine Stunde?", "Was kostet Heizlüfter oder Infrarotheizung am Schreibtisch?"],
    evidence:['0,50 kWh','17,5 Cent','0,60 kWh','21 Cent','50 Minuten', 'https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/richtiges-heizen-schuetzt-das-klima-den-geldbeutel'],
  },
  {
    path:'/guide/duschen-kosten-rechner.html', section:'durchlauferhitzer-mindestdurchfluss',
    expectedTitle:'Passt eine Sparbrause zu meinem Durchlauferhitzer?',
    queries:['Funktioniert ein Sparduschkopf an meinem hydraulischen Durchlauferhitzer?'],
    evidence:['am selben Bezugspunkt','8 l/min','6 l/min','Behalte die vorhandene Brause',
      'https://www.stiebel-eltron.com/static/ste/docportal/manual/DM0000018436-fjw.pdf'],
  },
  {
    path:'/guide/lichterkette-stromkosten.html', section:'zeitschaltuhr-strombilanz',
    expectedTitle:'Weihnachtsbeleuchtung: Spart eine Zeitschaltuhr Strom?',
    queries:['Lohnt sich eine Zeitschaltuhr für Weihnachtsbeleuchtung?',
    'Was kostet eine LED-Lichterkette pro Stunde, Tag und Weihnachtszeit?',
    'Adventbeleuchtung Stromkosten', 'Adventsbeleuchtung Stromkosten',
    'Baumbeleuchtung Stromkosten', 'Weihnachtsbeleuchtung Stromkosten',],
    evidence:['Timer','Stromkosten','Verbraucherzentrale'],
  },
  {
    path:'/guide/luftentfeuchter-ratgeber.html', section:'modell-bosch-d4000-eu',
    expectedTitle:'Bosch Dry 4000: deutsche Modellnummer prüfen',
    queries:['Bosch Dry 4000','D4000-EU','7733703558','4069143047774',
      'Ist 7733703558 die deutsche Ausführung des Bosch Dry 4000?',
      'Wie groß ist der Wassertank beim Bosch Dry 4000 D4000-EU?',
      'Ist beim Bosch Dry 4000 ein Ablaufschlauch im Lieferumfang?'],
    evidence:['D4000-EU','7733703558','https://www.bosch-homecomfort.com/web-etk/de/bosch/de/de/product/7733703558'],
  },
  {
    path:'/geraete-austausch-rechner.html', section:'geschirrspueler-handabwasch',
    queries:['Ist Geschirrspüler oder Handabwasch billiger, wenn die Maschine 10 Liter braucht und ich von Hand 20 Liter brauche?',
      'Was kostet Abwaschen per Hand im Vergleich zum Geschirrspüler, mit warmem Wasser?'],
    evidence:['0,350 € für die Maschine','0,309 € von Hand','22,6 Litern Handspülwasser',
      'vergleichbares Spülergebnis','geschirrspueler-im-eco-programm-wasser-strom-sparen'],
  },
  {
    path: '/guide/delonghi-pac-n90-test.html', section: 'testlage',
    queries: ['DeLonghi PAC N90 ECO Silent', 'PACN90 ECO Silent', '8004399512351', 'EAN 8004399512351'],
  },
  {
    path: '/guide/midea-portasplit-ausverkauft-alternativen.html', section: 'fensterfalz',
    queries: ['Midea PortaSplit Original', 'Midea Porta Split Original', 'Midea Porta-Split Original',
      '4048164116478', 'EAN 4048164116478'],
  },
  {
    path: '/guide/klimaanlage-fenster-einbruchschutz.html', section: 'fenster-verschluss-pruefen',
    queries: ['Kann ich das Kippfenster mit der PortaSplit beim Verlassen der Wohnung verriegeln?',
      'PortaSplit Fenster abschließen und Wohnung verlassen',
      'Klimaanlage Kippfenster nachts geschlossen sicher verriegeln',
      'Lässt sich mein Fenster mit der Leitung der PortaSplit noch richtig schließen?',
      'Kann ich die Wohnung verlassen, wenn das Fenster für die Klimaanlage gekippt bleibt?'],
    evidence: ['Ein gekipptes Fenster gilt als offen.', 'den Kauf zurückstellen',
      'www.k-einbruch.de/sicherheitstipps/verhaltenstipps', 'transkript-portasplit-fensterabdichtung1'],
  },
  {
    path: '/guide/klimaanlage-40-qm.html', section: 'portasplit-40-qm',
    queries: ['Klimaanlage 40 m²','Klimaanlage offenes Wohnzimmer 40 qm','Midea PortaSplit für 40 qm'],
    evidence: ['42 m² / 105 m³','100 m³','112 m³','2,625 m Höhe','4048164116478',
      '2 m lang und kann nicht verlängert werden','den Kauf zurückstellen','PortaSplit-Gebrauchsanweisung-DE.pdf'],
  },
  {
    path: '/guide/fenster-beschlagen-innen.html', section: 'fenstersauger-gegen-kondenswasser',
    queries: ['Warum beschlägt das geschlossene Fenster morgens innen?',
      'Jeden Morgen sind die Fensterscheiben im Schlafzimmer von innen nass. Was soll ich zuerst messen?',
      'Nach dem Schlafen ist die Innenscheibe nass, obwohl das Fenster zu war. Woran liegt das?'],
    evidence: ['Prüfe zuerst, auf welcher Seite das Wasser sitzt.', 'Drei Messwerte vom selben Zeitpunkt',
      'unauffälligen Messwert in der Raummitte', '20 °C und 60 %', 'Beschlag zwischen den Scheiben',
      'www.adac.de/rund-ums-haus/wohnen/haushalt/kondenswasser-am-fenster',
      'www.umweltbundesamt.de/themen/gesundheit/umwelteinfluesse-auf-den-menschen/schimmel/'],
  },
  {
    path:'/guide/fenster-beschlagen-aussen.html', section:'aussen-innen-oder-dazwischen',
    queries:['Meine Doppelverglasung ist zwischen den Scheiben blind. Wen rufe ich an?',
      'Zwischen den beiden Fensterscheiben ist Beschlag. Hilft ein Luftentfeuchter?',
      'Zwischen den Scheiben ist es beschlagen. Innen ist das Fenster trocken.'],
    evidence:['sicher erreichbare Glasflächen','Vermieter oder Hausverwaltung','keinen Luftentfeuchter',
      'www.baunetzwissen.de/glas/fachwissen/schaeden/kondensatbildung-159378'],
  },
  {
    path:'/guide/thermovorhang-ratgeber.html', section:'thermovorhang-bahnenbedarf',
    queries:['Wie viele Thermovorhänge brauche ich für ein 120 cm breites Fenster?',
      'Wie viele Vorhangschals für meine Gardinenschiene?'],
    evidence:['210 cm flachen Stoff','2 Bahnen','1 Packung'],
  },
  {
    path:'/guide/richtig-lueften-im-winter.html', section:'lueften-vorher-nachher',
    queries:['Luftfeuchtigkeit vor und nach dem Stoßlüften vergleichen',
      'Wie kann ich messen, ob der Raum nach dem Lüften wirklich trockener ist?'],
    evidence:['1,72 g/m³ weniger Wasser','Feuchteursache prüfen'],
  },
  {
    path:'/guide/smarte-heizkoerperthermostate-lohnen-sich.html', section:'danfoss-altventil',
    queries:['Passt ein smartes Heizkörperventil auf das alte Danfoss Klickventil?',
      'Alter Danfoss-Klickanschluss am Heizkörper, welchen Adapter brauche ich?'],
    evidence:['RA-click als Anschlussbezeichnung','34 mm bei RAV und 26 mm bei RAVL',
      'behalte den vorhandenen Kopf','assets.danfoss.com/documents/latest/215970/AB433044178502de-DE0102.pdf'],
  },
];

test('exact German guide searches prefer reviewed section copy and pass a readable canonical URL', async () => {
  for (const {path, section, queries, expectedTitle, evidence = []} of focusedLookups) {
    const guide = corpus.find(entry => entry.u === path);
    assert.equal(guide?.section?.id, section, path);
    const {title, description} = guide.section;
    if (expectedTitle) assert.equal(title,expectedTitle,path);
    assert.ok(title && description);
    assert.notEqual(title, guide.t);
    assert.notEqual(description, guide.d);

    for (const [position, frage] of queries.entries()) {
      const {env, requests} = assetEnv();
      const language = position === 1 ? {} : {sprache: 'de'};
      const result = await call('ratgeber_suche', {frage, ...language, max: 3}, env);
      assert.equal(result.isError, false, frage);
      const first = textOf(result).split('\n').slice(1, 4);
      assert.deepEqual(first, ['- ' + title, '  https://getecoback.com' + path, '  ' + description], frage);
      assert.deepEqual(requests.map(request => new URL(request.url).pathname), ['/mcp-guides.json']);

      const reading = await call('ratgeber_lesen', {pfad: first[1].trim()}, env);
      assert.equal(reading.isError, false, frage + ': ' + textOf(reading));
      for (const phrase of evidence) assert.ok(textOf(reading).includes(phrase), phrase);
      assert.ok(textOf(reading).startsWith('Quelle: https://getecoback.com' + path + '\n'), frage);
      assert.deepEqual(requests.map(request => new URL(request.url).pathname),
        ['/mcp-guides.json', '/mcp-guides.json', guide.m]);
    }
  }
});

test('ambiguous cooling models, conflicting identifiers and other languages are not promoted', async () => {
  const vetted = focusedLookups.map(({path}) => corpus.find(entry => entry.u === path).section);
  for (const [frage, sprache] of [
    ['Midea PortaSplit', 'de'], ['Midea PortaSplit E', 'de'], ['Midea PortaSplit Cool', 'de'],
    ['Midea PortaSplit Pro', 'de'], ['Midea PortaSplit E 4048164116478', 'de'],
    ['Midea PortaSplit Original 4048164122301', 'de'], ['DeLonghi PAC N90 ECO Silent 4048164116478', 'de'],
    ['Kann ich das Fenster mit der PortaSplit verriegeln?', 'en'],
    ['Ist das Fenster mit der PortaSplit E abschließbar?', 'de'],
    ['Wie viel Strom braucht die Klimaanlage nachts, wenn das Fenster ganz geschlossen ist?', 'de'],
    ['Mein Fenster beschlägt morgens von außen und innen ist es trocken.', 'de'],
    ['Meine Fensterscheibe beschlägt morgens. Innen oder außen kann ich nicht erkennen.', 'de'],
    ['Meine Autofenster haben Beschlag zwischen den Scheiben.', 'de'],
    ['Vergleiche die beiden Fotos, um Beschlag zwischen den Scheiben zu prüfen.', 'de'],
    ['Warum beschlägt die Windschutzscheibe meines Autos morgens von innen?', 'de'],
    ['Passt die schmale 170-mm-Düse für Kondenswasser zu meinem Kärcher WV 6?', 'de'],
    ['Warum beschlägt das geschlossene Fenster morgens innen?', 'en'],
    ['Muss ich den 60 mm breiten Fensterfalz für die PortaSplit-Halterung bei verriegeltem oder offenem Fenster messen?', 'de'],
    ['Wie viel Strom verbraucht meine Klimaanlage bei verriegeltem Fenster?', 'de'],
    ['Wie laut ist die Klimaanlage bei verriegeltem Fenster?', 'de'],
    ['Meine PortaSplit läuft am Fenster. Wie verriegele ich die Fernbedienung für Kinder?', 'de'],
    ['Kann ich ohne mobile Klimaanlage die Wohnung verlassen, wenn das Fenster gekippt bleibt?', 'de'],
    ['DeLonghi PAC N90 ECO Silent', 'en'], ['Midea Porta-Split Original', 'fr'],
    ['Midea Porta-Split Original', 'nl'], ['PortaSplit E für 40 qm', 'de'],
    ['Klimaanlage für 140 qm', 'de'], ['Klimaanlage 40 qm oder 50 qm', 'de'],
    ['Midea PortaSplit für 40 qm', 'en'],
  ]) {
    const {env, requests} = assetEnv();
    const result = await call('ratgeber_suche', {frage, sprache, max: 5}, env);
    assert.equal(result.isError, false, frage);
    const text = textOf(result);
    for (const {title, description} of vetted) {
      assert.ok(!text.includes('\n- ' + title + '\n'), frage);
      assert.ok(!text.includes('\n  ' + description + '\n'), frage);
    }
    assert.deepEqual(requests.map(request => new URL(request.url).pathname), ['/mcp-guides.json']);
  }
});

test('missing or malformed optional cooling section leaves normal guide search available', async () => {
  const {path, queries} = focusedLookups.find(entry => entry.path === '/guide/delonghi-pac-n90-test.html');
  const {section, ...guide} = corpus.find(entry => entry.u === path);
  const baseline = {...guide, t: 'DeLonghi PAC N90 ECO Silent', d: 'Allgemeine Hinweise zum bestehenden Ratgeber.'};
  for (const fallback of [
    baseline,
    {...baseline, section: {...section, title: null}},
    {...baseline, section: {...section, description: ''}},
    {...baseline, section: {...section, id: 'not-reviewed'}},
  ]) {
    const {env, requests} = assetEnv(new Map([['/mcp-guides.json', () => Response.json([fallback])]]));
    const result = await call('ratgeber_suche', {frage: queries[0], sprache: 'de', max: 1}, env);
    assert.equal(result.isError, false);
    assert.deepEqual(textOf(result).split('\n').slice(1, 4),
      ['- ' + baseline.t, '  https://getecoback.com' + path, '  ' + baseline.d]);
    assert.deepEqual(requests.map(request => new URL(request.url).pathname), ['/mcp-guides.json']);
  }
});

test('root-level laundry reading preserves measured-condition limits and trusted original sources', async () => {
  const {env} = assetEnv();
  const relative = await call('ratgeber_lesen', {pfad: laundry}, env);
  assert.equal(relative.isError, false);
  assert.deepEqual(await call('ratgeber_lesen', {pfad: 'https://getecoback.com' + laundry}, env), relative);
  const text = textOf(relative);
  for (const expected of [labelSource, 'gleichen gewünschten Trocknungsgrad', 'keine Produktmessungen', 'keine Prüfung eines bestimmten Geräts', 'Gekürzt: nein']) assert.ok(text.includes(expected), expected);
  assert.ok(!/<(?:form|script|input)|<!--EB_|https?:\/\/[^\s]*(?:amazon\.|amzn\.)|[?&]tag=/i.test(text));
});

test('dedicated French and Spanish mirrors retain their existing search/read coverage', async () => {
  const {env} = assetEnv();
  for (const [sprache, frage, path] of [['fr', 'climatisation chauffage', '/fr/calculateur.html'], ['es', 'climatización ahorro', '/es/calculadora.html']]) {
    const result = await call('ratgeber_suche', {frage, sprache}, env);
    assert.equal(result.isError, false);
    assert.ok(textOf(result).includes('https://getecoback.com' + path), sprache);
    const reading = await call('ratgeber_lesen', {pfad: path}, env);
    assert.equal(reading.isError, false);
    assert.ok(textOf(reading).includes('Canonical: https://getecoback.com' + path));
  }
});

test('every published MCP entry resolves to its own canonical text mirror', async () => {
  const {env, requests} = assetEnv();
  for (const entry of corpus) {
    const result = await call('ratgeber_lesen', {pfad: entry.u}, env);
    assert.equal(result.isError, false, entry.u + ': ' + textOf(result));
    assert.ok(textOf(result).includes('Quelle: https://getecoback.com' + entry.u));
    assert.ok(textOf(result).includes('Vollständige Textansicht: https://getecoback.com' + entry.m));
  }
  assert.ok(requests.every(request => /\/(?:mcp-guides\.json|[a-z0-9/-]+\.md)$/.test(new URL(request.url).pathname)));
});

test('malformed, external, credentialed, query, fragment and traversal inputs fetch nothing', async () => {
  const invalid = [null, {}, 1, '//evil.test/a.html', 'http://getecoback.com' + laundry,
    'https://www.getecoback.com' + laundry, 'https://getecoback.com.evil.test' + laundry,
    'https://getecoback.com@evil.test' + laundry, 'https://user@getecoback.com' + laundry,
    'https://getecoback.com:443' + laundry, 'https://getecoback.com:8443' + laundry,
    laundry + '?private=1', laundry + '#input', laundry + '\n', '/guide/../' + laundry.slice(1),
    '/guide/%2e%2e/' + laundry.slice(1), '/guide/%2fsecret.html', '/guide/%5csecret.html',
    '/guide/\\secret.html', '/guide/a\u0000.html', '/api/test.html', '/en/members.html', '/auth/account.html'];
  for (const pfad of invalid) {
    const {env, requests} = assetEnv();
    assert.equal((await call('ratgeber_lesen', {pfad}, env)).isError, true, JSON.stringify(pfad));
    assert.equal(requests.length, 0, JSON.stringify(pfad));
  }
});

test('unpublished, removed and noncanonical aliases cannot bypass the corpus even if an asset exists', async () => {
  for (const pfad of ['/guide/private-draft.html', '/guide/growatt-noah-2000-probleme.html', '/index.html', '/tools.html']) {
    const {env, requests} = assetEnv(new Map([[pfad.replace('.html', '.md'), () => new Response('# Unlisted content')]]));
    assert.equal((await call('ratgeber_lesen', {pfad}, env)).isError, true, pfad);
    assert.deepEqual(requests.map(request => new URL(request.url).pathname), ['/mcp-guides.json']);
  }
});

test('missing or invalid corpus fails closed for both search and read', async () => {
  const responses = [() => new Response('missing', {status: 404}), () => new Response('<html>soft 404</html>'),
    () => Response.json({items: []}), () => Response.json([]),
    () => Response.json([{...corpus[0], u: 'https://evil.test/a.html'}]),
    () => Response.json([{...corpus[0], m: '/api/private.md'}]),
    () => Response.json([corpus[0], corpus[0]])];
  for (const response of responses) {
    const {env, requests} = assetEnv(new Map([['/mcp-guides.json', response]]));
    assert.equal((await call('ratgeber_suche', {frage: 'Wäsche'}, env)).isError, true);
    assert.equal((await call('ratgeber_lesen', {pfad: laundry}, env)).isError, true);
    assert.ok(requests.every(request => new URL(request.url).pathname === '/mcp-guides.json'));
  }
});

test('missing, redirected, non-Markdown, wrong-canonical or contaminated mirrors never fall back to HTML', async () => {
  const valid = readFileSync(new URL(laundry.slice(1).replace('.html', '.md'), site), 'utf8');
  const markdown = body => new Response(body, {headers: {'content-type': 'text/markdown'}});
  const responses = [() => new Response('missing', {status: 404}),
    () => new Response('', {status: 302, headers: {location: 'https://evil.test/'}}),
    () => new Response(valid, {headers: {'content-type': 'text/html'}}),
    () => markdown(valid.replace('Canonical (HTML, zitierfähig):', 'Mentioned elsewhere:')),
    () => markdown(valid.replace(laundry, '/guide/another.html')),
    () => markdown(valid + '\nCanonical (HTML, zitierfähig): https://getecoback.com/guide/another.html'),
    () => markdown(valid + '<script>hidden UI</script>'),
    () => markdown(valid + '\n[buy](https://www.amazon.de/dp/EXAMPLE?tag=getecoback-21)')];
  for (const response of responses) {
    const {env, requests} = assetEnv(new Map([[laundry.replace('.html', '.md'), response]]));
    assert.equal((await call('ratgeber_lesen', {pfad: laundry}, env)).isError, true);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => !new URL(request.url).pathname.endsWith('.html')));
  }
});

test('long excerpts declare truncation and retain references beyond the cut', async () => {
  const long = `# Long guide\n\nCanonical (HTML, zitierfähig): https://getecoback.com${laundry}\n\n` +
    'A complete paragraph with conditions.\n\n'.repeat(700) + `[Official label source](${labelSource})\n`;
  const {env} = assetEnv(new Map([[laundry.replace('.html', '.md'), () => new Response(long, {headers: {'content-type': 'text/markdown'}})]]));
  const result = await call('ratgeber_lesen', {pfad: laundry}, env);
  assert.equal(result.isError, false);
  const text = textOf(result);
  assert.ok(text.includes('Gekürzt: ja'));
  assert.ok(text.includes('vor einer Bewertung den vollständigen Text mit allen Bedingungen lesen'));
  assert.ok(text.includes('Originalquellen der vollständigen Textansicht:\n- ' + labelSource));
  assert.ok(!text.includes('[Official label source]'), 'the source was actually beyond the excerpt');
});

test('the German Bosch model-identity title is not returned for other variants or installation questions', async () => {
  const title = 'Bosch Dry 4000: deutsche Modellnummer prüfen';
  for (const [frage,sprache] of [
    ['Bosch Air 4000','de'], ['Bosch Dry 4000 D4000-UK','de'],
    ['Bosch Dry 4000 D4000-EU EAN 4069143047781','de'],
    ['Bosch Dry 4000 im kalten Keller: Wie viele Liter schafft er bei 10 °C und 60 % Luftfeuchte?','de'],
    ['Kann der Ablaufschlauch vom Bosch Dry 4000 bergauf ins Waschbecken laufen?','de'],
    ['Bosch Dry 4000','en'],
  ]) {
    const {env,requests} = assetEnv();
    const result = await call('ratgeber_suche',{frage,sprache,max:3},env);
    assert.equal(result.isError,false,frage);
    assert.ok(!textOf(result).split('\n').includes('- ' + title),frage);
    assert.deepEqual(requests.map(request => new URL(request.url).pathname),['/mcp-guides.json']);
  }
});

test('the seasonal lighting title stays outside unrelated German guide searches', async () => {
  const title = 'Weihnachtsbeleuchtung: Spart eine Zeitschaltuhr Strom?';
  for (const frage of [
    'Zeitschaltuhr', 'Was kostet die Hausbeleuchtung pro Tag?',
    'Was kostet ein Heizlüfter mit Zeitschaltuhr?',
    'Wie installiere ich die Weihnachtsbeleuchtung im Außenbereich sicher?',
    'Lichterkette Timer Einschaltfenster 6 Stunden, wie viele gewünschte Einschaltminuten?',
  ]) {
    const {env,requests} = assetEnv();
    const result = await call('ratgeber_suche',{frage,sprache:'de',max:3},env);
    assert.equal(result.isError,false,frage);
    assert.ok(!textOf(result).split('\n').includes('- ' + title),frage);
    assert.deepEqual(requests.map(request => new URL(request.url).pathname),['/mcp-guides.json']);
  }
});

test('Comfee DE variant guide searches cite the canonical cellar guide for each identifier', async () => {
  const title = 'Comfee MDDF-20DEN7 oder WF: Modell und EAN prüfen';
  const canonical = 'https://getecoback.com/guide/luftentfeuchter-keller.html';
  for (const frage of [
    'Comfee MDDF-20DEN7', 'Comfee MDDF-20DEN7-WF', '10000651', '10000726',
    '4048164103010', '4048164103485',
    'Wie unterscheiden sich Comfee MDDF-20DEN7 und MDDF-20DEN7-WF?',
  ]) {
    const {env,requests} = assetEnv();
    const result = await call('ratgeber_suche',{frage,sprache:'de',max:3},env);
    assert.equal(result.isError,false,frage);
    assert.deepEqual(textOf(result).split('\n').slice(1,3),['- ' + title,'  ' + canonical],frage);
    assert.deepEqual(requests.map(request => new URL(request.url).pathname),['/mcp-guides.json']);
  }
  for (const [frage,sprache] of [
    ['Comfee MDDF-16DEN7','de'], ['Comfee MDDF3-20DEN7-WF','de'],
    ['Wie viele Liter zieht ein Comfee MDDF-20DEN7 bei 10 °C und 60 % aus meinem Keller?','de'],
    ['Geht der Ablauf beim Comfee MDDF-20DEN7 auch bergauf bis zum Waschbecken?','de'],
    ['Comfee MDDF-20DEN7-WF','en'],
  ]) {
    const {env} = assetEnv();
    const result = await call('ratgeber_suche',{frage,sprache,max:3},env);
    assert.equal(result.isError,false,frage);
    assert.notEqual(textOf(result).split('\n')[1],'- ' + title,frage);
  }
});
