import assert from 'node:assert/strict';
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';

const id = 'ecoback-local-tools';
const version = '1.22.0';
const revision = '6f511730bc8063c96b4c0b7b3c61a367b1be0f05';
const sourceRepository = 'f-tiger/getecoback-mcp';
const releaseTag = 'fleet-mcp-registry-2026-10-10';
const name = 'io.github.f-tiger/' + id;
const title = 'EcoBack – Haushaltshilfen für Deutschland';
const description = 'Fenstersauger, Kellerfeuchte und Trocknungskosten offline prüfen. Ratgeber und Wetter auf Wunsch.';
const sourceUrl = 'https://github.com/' + sourceRepository;
const releaseUrl = `https://github.com/f-tiger/agi-site/releases/download/${releaseTag}`;
const registryVersionsUrl = `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(name)}/versions`;
const registryLatestUrl = `${registryVersionsUrl}/latest`;
const oldNames = [
  'btu_empfehlung', 'fensterabdichtung_laenge', 'heizleistung_watt', 'hitzewelle_vorschau',
  'klimaanlage_stromkosten', 'ratgeber_lesen', 'ratgeber_suche', 'taupunkt_lueften',
];
const featureNames = ['entfeuchter_ablaufcheck', 'btu_empfehlung', 'fensterabdichtung_laenge',
  'taupunkt_lueften', 'fenstersauger_170mm_abziehlippe_geraetefamilie'];
const entry = 'src/server.mjs';
const legacyHelpers = fileURLToPath(new URL('../mcp-registry/local-packages/', import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const drainArguments = {drain:'level_or_uphill',model:'meaco-one-20'};
const cellarUri = 'ecoback://evidence/de/kellerentfeuchter';
const laundryComparisonTool = 'waesche_trocknungskosten';
const windowBladeTool = 'fenstersauger_170mm_abziehlippe_geraetefamilie';
const windowGuide = 'https://getecoback.com/produkte.html';
const windowEvidence = windowGuide + '#fenstersauger-belege';

function readmeForExtraction(sourceReadme) {
  const heading = '\n## Connect\n\n';
  const terminalDetails = '\n\n<details>\n<summary>Run the downloaded bundle from a terminal</summary>';
  const sections = sourceReadme.split(heading);
  assert.equal(sections.length,2,'Expected one Connect section in the source README');
  const [introduction, connect] = sections;
  const connectParts = connect.split(terminalDetails);
  assert.equal(connectParts.length,2,'Expected terminal details after the source download instructions');
  const [install, remainder] = connectParts;
  const paragraphs = install.split('\n\n');
  assert.equal(paragraphs.length,3,'Expected the source download, install and checksum paragraphs');
  const [download, instructions, receipt] = paragraphs;
  const previousVersion = download.match(/^\*\*\[EcoBack MCPB (\d+\.\d+\.\d+) herunterladen\]/)?.[1];
  assert.ok(previousVersion,'Expected a versioned download pointer');
  const directUrl = `${releaseUrl}/${id}-${previousVersion}.mcpb`;
  const exactRegistryUrl = `${registryVersionsUrl}/${previousVersion}`;
  const digest = receipt.match(/`([a-f0-9]{64})`/)?.[1];
  assert.ok(digest,'Expected a SHA-256 in the source download instructions');
  assert.equal(download,`**[EcoBack MCPB ${previousVersion} herunterladen](${directUrl})**`);
  assert.equal(instructions, [
    'Öffne die heruntergeladene `.mcpb`-Datei über die MCPB-Installation deines Clients.',
    'Für den lokalen Betrieb brauchst du Node.js 22 oder neuer. Berechnungen laufen',
    'lokal. Nur auf Anfrage ruft EcoBack Wetterdaten oder ausgewählte Ratgeber ab.',
  ].join('\n'));
  assert.equal(receipt, [
    'SHA-256 der verlinkten Datei',
    '`' + digest + '`.',
    `[Registrierte Version ${previousVersion}](${exactRegistryUrl})`,
    `· [Aktuellste Version im offiziellen MCP Registry](${registryLatestUrl}).`,
  ].join('\n'));

  const extractedInstructions = [
    'Starte `node src/server.mjs` im entpackten EcoBack-Ordner. In einem MCP-Client',
    'kannst du `node` mit dem absoluten Pfad zu `src/server.mjs` als Argument',
    'eintragen. Der lokale Betrieb benötigt Node.js 22 oder neuer.',
    '',
    'Berechnungen laufen lokal. Nur auf Anfrage ruft EcoBack Wetterdaten oder',
    'ausgewählte Ratgeber ab.',
    '',
    `[Aktuellste Version im offiziellen MCP Registry](${registryLatestUrl}).`,
  ].join('\n');
  const text = introduction + heading + extractedInstructions + terminalDetails + remainder;
  return {text, previousVersion, obsoleteInstallPointers:[directUrl,exactRegistryUrl,digest]};
}

function verifyFinder(extracted, drain) {
  const find = (...args) => spawnSync(process.execPath, [
    '--import',join(legacyHelpers,'deny-network.mjs'),join(extracted,'src/find-tools.mjs'),...args,
  ], {cwd:extracted,encoding:'utf8',timeout:10000});
  const output = (...args) => {
    const child = find(...args);
    assert.equal(child.error,undefined);
    assert.equal(child.status,0,child.stderr);
    return JSON.parse(child.stdout);
  };
  const drainage = 'entfeuchter_ablaufcheck';
  const shower = 'dusche_zeit_bei_wasserbudget';
  const first = output('Kann ich den Abflussschlauch nach oben führen?').tools[0];
  assert.equal(first.name,drainage);
  assert.equal(first.citation_url,drain.structuredContent.citation_url);
  assert.equal(first.guide_url,drain.structuredContent.guide_url);
  assert.deepEqual(first.example_arguments,drainArguments);
  assert.deepEqual(output('--example',drainage),{name:drainage,example_arguments:drainArguments,result:drain});
  const showerResult = output('--example',shower);
  assert.equal(showerResult.name,shower);
  assert.equal(showerResult.result.isError,false);
  assert.equal(showerResult.result.structuredContent.maximale_minuten,8);
  const rejected = find('--example','hitzewelle_vorschau');
  assert.equal(rejected.error,undefined);
  assert.equal(rejected.status,2);
  assert.equal(rejected.stdout,'');
  assert.match(rejected.stderr,/reviewed local example/);
  return {topMatch:first.name,examples:[drainage,shower],liveExampleRejected:true};
}

async function withStdio(extracted, flags, verify) {
  const child = spawn(process.execPath, [
    '--import',join(legacyHelpers,'deny-network.mjs'),join(extracted,entry),...flags,
  ], {cwd:extracted,stdio:['pipe','pipe','inherit'],timeout:30000});
  const output = createInterface({input:child.stdout});
  const lines = output[Symbol.asyncIterator]();
  let id = 0;
  async function rpc(method, params={}, errorCode) {
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:++id,method,params})+'\n');
    const {done,value} = await lines.next();
    assert.ok(!done, `Local MCP closed during ${method}`);
    const message = JSON.parse(value);
    assert.equal(message.jsonrpc,'2.0');
    assert.equal(message.id,id);
    if (errorCode === undefined) {
      assert.equal(message.error,undefined,method);
      return message.result;
    }
    assert.equal(message.error?.code,errorCode,method);
    assert.equal(message.result,undefined,method);
    return message.error;
  }

  try {
    const init = await rpc('initialize',{
      protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'ecoback-bundle-check',version:'1'},
    });
    assert.deepEqual(init.serverInfo,{name:'getecoback-raumklima',version});
    assert.ok(init.capabilities.tools);
    child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    const resource = await verifyCellarResource(extracted,rpc,init);
    return {...await verify(rpc,init),resource};
  } finally {
    output.close();
    child.stdin.end();
    child.kill();
  }
}

async function verifyCellarResource(extracted,rpc,init) {
  const {CELLAR_RESOURCE,CELLAR_RESOURCE_TEXT} = await import(pathToFileURL(join(extracted,'src/cellar-resource.mjs')));
  assert.ok(init.capabilities.resources);
  assert.equal(CELLAR_RESOURCE.uri,cellarUri);
  assert.equal(CELLAR_RESOURCE.mimeType,'text/markdown');
  const {resources} = await rpc('resources/list');
  assert.deepEqual(resources,[CELLAR_RESOURCE]);
  const {contents} = await rpc('resources/read',{uri:cellarUri});
  assert.deepEqual(contents,[{uri:cellarUri,mimeType:'text/markdown',text:CELLAR_RESOURCE_TEXT}]);
  const [{text,mimeType}] = contents;
  assert.ok(text.includes('| 10 °C | 3,4 L/Tag | 180 W |'));
  assert.ok(text.includes('| 20 °C | 8,5 L/Tag | 216 W |'));
  assert.match(text,/Meaco Deutschland,[^\n]+https:\/\/eu\.meaco\.com\/[^\n]+geprüft 2026-11-20\./);
  assert.match(text,/Comfee MDDF-20DEN7 ohne WF[^\n]+offen[^\n]+https:\/\/www\.feelcomfee\.com\/[^\n]+geprüft 2026-11-06, erneut gelesen 2026-11-20\./);
  const missing = await rpc('resources/read',{uri:cellarUri+'-unbekannt'},-32002);
  return {uri:cellarUri,mimeType,textSha256:sha256(Buffer.from(text)),missingCode:missing.code};
}

async function verifyStdio(extracted, manifest) {
  const {TOOLS} = await import(pathToFileURL(join(extracted,'src/tools.mjs')));
  const {expandedDefinitions} = await import(pathToFileURL(join(extracted,'src/eco-suite/src/mcp-expanded.mjs')));
  const expected = JSON.parse(JSON.stringify(TOOLS));
  assert.equal(expected.length,2020);
  assert.deepEqual(manifest.server.mcp_config, {command:'node',args:['${__dirname}/'+entry]});
  return withStdio(extracted,[],async rpc => {
    const listed = [], sizes = [], cursors = new Set();
    let cursor;
    do {
      const page = await rpc('tools/list',cursor ? {cursor} : {});
      listed.push(...page.tools);
      sizes.push(page.tools.length);
      cursor = page.nextCursor;
      if (cursor !== undefined) {
        assert.ok(typeof cursor==='string' && cursor && !cursors.has(cursor) && cursors.size<20);
        cursors.add(cursor);
      }
    } while (cursor !== undefined);
    assert.deepEqual(listed,expected);
    assert.deepEqual(sizes,[...Array(20).fill(100),20]);
    const names = new Set(listed.map(tool=>tool.name));
    assert.equal(names.size,2020);
    assert.ok(oldNames.every(name=>names.has(name)), 'Expected all eight supported legacy tools');
    assert.ok([...names].every(name=>!/balkonspeicher|balkonkraftwerk|solarbank|pv[_-]speicher/i.test(name)));
    assert.ok(manifest.tools.every(tool=>names.has(tool.name)));
    const btu = await rpc('tools/call',{name:'btu_empfehlung',arguments:{qm:20,sonne:'normal'}});
    assert.equal(btu.isError,false);
    assert.match(btu.content[0].text,/7\.000 BTU/);
    const drain = await rpc('tools/call',{
      name:'entfeuchter_ablaufcheck',arguments:drainArguments,
    });
    assert.equal(drain.isError,false);
    assert.equal(drain.structuredContent.outcome,'pump_check');
    const last = expandedDefinitions.at(-1);
    assert.equal(listed.at(-1).name,last.name);
    const result = await rpc('tools/call',{name:last.name,arguments:last.example.args});
    assert.equal(result.isError,false);
    for (const [key,value] of Object.entries(last.example.expect)) {
      assert.deepEqual(result.structuredContent[key],value,`${last.name}.${key}`);
    }
    const windowTools = expandedDefinitions.filter(tool => tool.category === 'Fenstersauger');
    assert.equal(windowTools.length,12);
    for (const tool of windowTools) {
      assert.ok(names.has(tool.name));
      const example = await rpc('tools/call',{name:tool.name,arguments:tool.example.args});
      assert.equal(example.isError,false,tool.name);
      for (const [key,value] of Object.entries(tool.example.expect)) {
        assert.deepEqual(example.structuredContent[key],value,`${tool.name}.${key}`);
      }
      assert.equal(example.structuredContent.citation_url,windowGuide);
      assert.equal(example.structuredContent.guide_url,windowEvidence);
    }
    return {tools:names.size,pages:sizes.length,windowExamples:windowTools.length,
      firstExamples:['btu_empfehlung','entfeuchter_ablaufcheck'],finder:verifyFinder(extracted,drain),
      lastPageExample:last.name,legacyNames:oldNames.length,network:'disabled'};
  });
}

async function verifyCompactLaundryComparison(rpc, finder, runner) {
  const frage = 'Wäschetrockner oder Luftentfeuchter – was kostet das Trocknen pro Ladung?';
  const citationUrl = 'https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html';
  const exampleArguments = {dryer:2,dehum:1,price:0.3,comparable:false};
  const found = await rpc('tools/call',{name:finder,arguments:{frage}});
  assert.equal(found.isError,false);
  const first = found.structuredContent.tools[0];
  assert.equal(first?.name,laundryComparisonTool);
  assert.equal(first.citation_url,citationUrl);
  assert.deepEqual(first.example_arguments,exampleArguments);

  const result = await rpc('tools/call',{name:runner,arguments:{name:first.name,eingaben:first.example_arguments}});
  assert.equal(result.isError,false);
  const details = result.structuredContent;
  assert.equal(details.dryer_eur_per_load,0.6);
  assert.equal(details.dehumidifier_eur_per_load,0.3);
  assert.equal(details.lower_cost,'unconfirmed');
  assert.match(details.assumption,/unterschiedlicher Endtrockenheit bleibt der Vergleich offen/);
  assert.equal(details.citation_url,citationUrl);
  assert.match(details.disclosure,/gekennzeichnete Affiliate-Links/);
  assert.deepEqual(JSON.parse(result.content[0].text),details);
  return {
    topMatch:first.name,
    dryerEurPerLoad:details.dryer_eur_per_load,
    dehumidifierEurPerLoad:details.dehumidifier_eur_per_load,
    comparison:details.lower_cost,
    citationUrl:details.citation_url,
  };
}

async function verifyCompactLaundryPrecision(rpc, finder) {
  const topMatches = [];
  for (const frage of [
    'Was kostet eine Ladung Wäsche, wenn Trockner und Luftentfeuchter gleichzeitig laufen?',
    'Was kostet es pro Ladung, wenn ich nur den Trockner nutze und den Luftentfeuchter ausgeschaltet lasse?',
  ]) {
    const found = await rpc('tools/call',{name:finder,arguments:{frage}});
    assert.equal(found.isError,false);
    const topMatch = found.structuredContent.tools[0]?.name ?? null;
    assert.notEqual(topMatch,laundryComparisonTool,frage);
    topMatches.push(topMatch);
  }
  return topMatches;
}

async function verifyCompactN90Costs(rpc, finder, runner) {
  const frage = 'DeLonghi PAC N90 ECO Silent Energielabel Stromkosten 8004399512351';
  const lookup = await rpc('tools/call',{name:finder,arguments:{frage}});
  assert.equal(lookup.isError,false);
  const name = lookup.structuredContent.tools[0]?.name;
  assert.equal(name,'pac_n90_energielabel_zu_stromkosten');
  const inputs = {ean:8004399512351,modell:'PAC N90 ECO Silent',arbeitspreis_eur_kwh:0.30,
    messung_vollstaendig:true,messenergie_kwh:1.2,messdauer_min:90};
  const call = changes => rpc('tools/call',{name:runner,arguments:{name,eingaben:{...inputs,...changes}}});
  const checked = async changes => {
    const reply = await call(changes);
    assert.equal(reply.isError,false);
    return reply.structuredContent;
  };
  const exact = await checked({});
  assert.equal(exact.status,'modellangaben_passen');
  assert.equal(exact.label_eu_kwh_je_60_min,0.9);
  assert.equal(exact.label_kuehlleistung_kw,2.5);
  assert.equal(exact.label_referenz_eur_je_60_min,0.27);
  assert.equal(exact.messzeitraum_eur,0.36);
  assert.equal(exact.messwert_eur_je_stunde,0.24);
  assert.equal(exact.energielabel_url,'https://library.delonghigroup.com/assetbank-delonghi/action/directLinkImage?assetId=209150&download=true');
  assert.equal(exact.guide_url,'https://getecoback.com/guide/delonghi-pac-n90-test.html#n90-energielabel');

  for (const [ean,status] of [[0,'ean_fehlt'],[8004399512352,'ean_abweicht']]) {
    const other = await checked({ean});
    assert.equal(other.status,status);
    assert.deepEqual([other.label_eu_kwh_je_60_min,other.label_referenz_eur_je_60_min,other.messzeitraum_eur],[null,null,null]);
  }
  const unknownTariff = await checked({arbeitspreis_eur_kwh:-1});
  assert.equal(unknownTariff.tarif_bekannt,false);
  assert.equal(unknownTariff.label_eu_kwh_je_60_min,0.9);
  assert.deepEqual([unknownTariff.label_referenz_eur_je_60_min,unknownTariff.messzeitraum_eur],[null,null]);
  const free = await checked({arbeitspreis_eur_kwh:0});
  assert.deepEqual([free.tarif_bekannt,free.label_referenz_eur_je_60_min,free.messzeitraum_eur],[true,0,0]);
  assert.equal((await call({arbeitspreis_eur_kwh:-0.5})).isError,true);
  const incomplete = await checked({messung_vollstaendig:false});
  assert.equal(incomplete.label_referenz_eur_je_60_min,0.27);
  assert.deepEqual([incomplete.messung_auswertbar,incomplete.messzeitraum_eur],[false,null]);
  return {name,ean:inputs.ean,labelKwhPer60Min:exact.label_eu_kwh_je_60_min,coolingKw:exact.label_kuehlleistung_kw,
    labelEurPer60Min:exact.label_referenz_eur_je_60_min,measuredRunEur:exact.messzeitraum_eur,
    measuredEurPerHour:exact.messwert_eur_je_stunde,unknownTariffEur:unknownTariff.messzeitraum_eur};
}

async function verifyCompactTadoOventrop(rpc, finder, runner) {
  const frage = 'tado X Oventrop UniDH M30 Adapter 1011445';
  const found = await rpc('tools/call',{name:finder,arguments:{frage}});
  assert.equal(found.isError,false);
  const name = found.structuredContent.tools[0]?.name;
  assert.equal(name,'tado_x_oventrop_ventiladapter_pruefen');
  const guide = 'https://getecoback.com/guide/smarte-heizkoerperthermostate-lohnen-sich.html#tado-x-oventrop';
  const pdf = 'https://cdn.bfldr.com/607DGEMS/at/hqb8tzxsq4cmchcjxsxtwhh/DE_SRTx_compatibility_Links.pdf';
  const input = {ventilmodell:'unidh',gewinde:'m30_1_0',ventilzustand:'thermostatisch_unauffaellig'};
  const decide = async changes => {
    const reply = await rpc('tools/call',{name:runner,arguments:{name,eingaben:{...input,...changes}}});
    assert.equal(reply.isError,false);
    const result = reply.structuredContent;
    assert.equal(result.guide_url,guide);
    assert.equal(result.quellenmarkt,'DE');
    assert.equal(result.quellen_geprueft_am,'2026-11-20');
    return result;
  };
  for (const ventilmodell of ['unidh','unil']) {
    const result = await decide({ventilmodell});
    assert.equal(result.status,'separater_adapter_erforderlich');
    assert.equal(result.adapter_artikelnummer,'1011445');
    assert.equal(result.adapter_ean,'4026755228717');
    assert.equal(result.adapter_im_x_lieferumfang,false);
    assert.equal(result.quellen_url,pdf+'#page=7');
  }
  const direct = await decide({ventilmodell:'vindo_th',gewinde:'m30_1_5'});
  assert.equal(direct.status,'direktmontage_dokumentiert');
  assert.equal(direct.adapter_artikelnummer,null);
  assert.equal(direct.adapter_ean,null);
  assert.equal(direct.quellen_url,pdf+'#page=6');

  const deferred = [
    [{gewinde:'m30_1_5'},'modell_gewinde_widerspruch'],
    [{gewinde:'unbekannt'},'ventilbeleg_fehlend'],
    [{ventilmodell:'anders_oder_unbekannt'},'ventilbeleg_fehlend'],
    [{ventilzustand:'unbekannt'},'ventilbeleg_fehlend'],
    [{ventilzustand:'manuell'},'manuelles_ventil_nicht_kompatibel'],
    [{ventilzustand:'beschaedigt_oder_undicht'},'zustand_klaeren'],
  ];
  for (const [changes,status] of deferred) {
    const result = await decide(changes);
    assert.equal(result.status,status);
    assert.equal(result.adapter_artikelnummer,null);
    assert.equal(result.adapter_ean,null);
    assert.equal(result.adapter_im_x_lieferumfang,null);
  }
  return {tool:name,separateAdapter:'1011445',ean:'4026755228717',direct:direct.status,deferred:deferred.length};
}

async function verifyCompactHouseholdDecisions(rpc, runner) {
  const run = async (name, eingaben) => {
    const result = await rpc('tools/call',{name:runner,arguments:{name,eingaben}});
    assert.equal(result.isError,false,name);
    return result.structuredContent;
  };

  const bracketTool = 'midea_portasplit_fensterhalterung_pruefen';
  const roof = {angebot_ean:4048164116478,fenster:'dachfenster',standardhalterung:'im_angebot',universalhalterung:'fehlt'};
  const bracket = await run(bracketTool,roof);
  const bracketEntry = 'https://getecoback.com/guide/midea-portasplit-ausverkauft-alternativen.html?mcp_entry=portasplit-fensterhalterung#kaufpruefung';
  assert.equal(bracket.status,'passende_halterung_vor_kauf_klaeren');
  assert.equal(bracket.universalhalterung_ean,4048164118687);
  assert.equal(bracket.entry_url,bracketEntry);
  assert.equal((await run(bracketTool,{...roof,angebot_ean:0})).status,'modellnummer_abgleichen');

  const seasonTool = 'waesche_trocknungswechsel_kaufschwelle';
  const season = {ladungen_saison:100,ladungen_ersetzbar:60,trockner_kwh:1.4,entfeuchter_kwh:0.6,
    tarif_eur_kwh:0.35,anschaffung_eur:100,ladungen_vergleichbar:true,zusatzstrom_erfasst:true};
  const cost = await run(seasonTool,season);
  assert.equal(cost.status,'rechnerische_kostendeckung');
  assert.deepEqual([cost.trocknerladungen_weiter,cost.stromersparnis_saison_eur,cost.kostendeckung_saisons],[40,16.8,6]);
  const unknown = await run(seasonTool,{...season,zusatzstrom_erfasst:false});
  assert.equal(unknown.status,'erst_vergleichbar_messen');
  assert.equal(unknown.kostendeckung_saisons,null);

  const cellarTool = 'kellerentfeuchter_pruefpunkt_abgleichen';
  const cellar = {modell:'meaco-one-20',temperatur_c:10,relative_feuchte_pct:60,wiederholt_gemessen:true,befund:'feuchte_auffaellig'};
  const ten = await run(cellarTool,cellar);
  const twenty = await run(cellarTool,{...cellar,temperatur_c:20});
  const comfee = await run(cellarTool,{...cellar,modell:'comfee-mddf20'});
  assert.deepEqual([ten.status,ten.liter_pro_tag,ten.leistungsaufnahme_w],['hersteller_pruefpunkt',3.4,180]);
  assert.deepEqual([twenty.status,twenty.liter_pro_tag,twenty.leistungsaufnahme_w],['hersteller_pruefpunkt',8.5,216]);
  assert.deepEqual([comfee.status,comfee.liter_pro_tag,comfee.leistungsaufnahme_w],['wertepaar_offen',null,null]);
  assert.equal(ten.guide_url,'https://getecoback.com/guide/luftentfeuchter-keller.html#kalter-keller');
  assert.equal(Object.hasOwn(ten,'entry_url'),false);
  return {roofBracket:bracket.status,universalEan:bracket.universalhalterung_ean,
    seasonalSavingsEur:cost.stromersparnis_saison_eur,breakEvenSeasons:cost.kostendeckung_saisons,
    insufficientData:unknown.status,meacoWatts:[ten.leistungsaufnahme_w,twenty.leistungsaufnahme_w],comfee:comfee.status};
}

async function verifyCompactWindowWidth(rpc, finder, runner) {
  const frage = 'Welche Düsenbreite passt in ein schmales Sprossenfenster?';
  const found = await rpc('tools/call',{name:finder,arguments:{frage}});
  assert.equal(found.isError,false);
  const name = found.structuredContent.tools[0]?.name;
  assert.equal(name,'fenstersauger_sprossenfenster_duesenbreite');
  const input = {lichte_breite_mm:170,spiel_pro_seite_mm:5,vorhandene_duese_mm:0,kauf_geplant:true};
  const call = async values => {
    const result = await rpc('tools/call',{name:runner,arguments:{name,eingaben:values}});
    assert.equal(result.isError,false);
    assert.equal(result.structuredContent.citation_url,windowGuide);
    return result.structuredContent;
  };
  const purchase = await call(input);
  assert.equal(purchase.nutzbreite_mm,160);
  assert.equal(purchase.entry_url,windowGuide+'?mcp_entry=fenstersauger-breitencheck#fenstersauger-duesenbreite');
  const packages = purchase.nominell_passende_originalpakete;
  assert.deepEqual(packages.map(item=>item.artikel),['06008B7000']);
  assert.equal(packages[0].quelle,'https://www.bosch-diy.com/de/de/p/glassvac-06008b7000');
  const alternatives = [
    [{kauf_geplant:false},'vorhandenen_einwascher_oder_abzieher_pruefen'],
    [{vorhandene_duese_mm:130},'vorhandene_duese_zuerst_probesetzen'],
    [{lichte_breite_mm:0},'erst_lichte_breite_messen'],
  ];
  for (const [change,outcome] of alternatives) {
    const result = await call({...input,...change});
    assert.equal(result.folgeschritt,outcome);
    assert.equal(Object.hasOwn(result,'entry_url'),false);
  }
  return {topMatch:name,usableWidthMm:purchase.nutzbreite_mm,packageArticle:packages[0].artikel,
    entryUrl:purchase.entry_url,alternativesWithoutEntry:alternatives.length};
}

async function verifyCompactWindowBlade(rpc, finder, runner) {
  const frage = 'Passt die 170-mm-Abziehlippe 2.633-104.0 an meinen Kärcher WV 8 Signature Line?';
  const found = await rpc('tools/call',{name:finder,arguments:{frage}});
  assert.equal(found.isError,false);
  const first = found.structuredContent.tools[0];
  assert.equal(first?.name,windowBladeTool);
  assert.equal(first.guide_url,windowEvidence);
  assert.deepEqual(first.inputSchema.required,['geraet','schmale_originalduese','teilenummer']);

  const cases = [
    {confirmed:true, part:'26331040', status:'kombination_nicht_aufgelistet',
      source:'wv-abziehlippen-schwarz-170-mm-p26331040'},
    {confirmed:false, part:'26335130', status:'offen',
      source:'wv-4-4-wv-5-ultra-wv-6-wv-7-wv-8-abziehlippen-170-mm-p26335130'},
    {confirmed:true, part:'26335130', status:'herstellerliste_bestaetigt',
      source:'wv-4-4-wv-5-ultra-wv-6-wv-7-wv-8-abziehlippen-170-mm-p26335130'},
  ];
  for (const {confirmed,part,status,source} of cases) {
    const result = await rpc('tools/call',{name:runner,arguments:{name:first.name,eingaben:{
      geraet:'wv8_signature_16337850',schmale_originalduese:confirmed,teilenummer:part,
    }}});
    assert.equal(result.isError,false);
    const details = result.structuredContent;
    assert.equal(details.status,status);
    assert.equal(details.vor_kauf,status === 'herstellerliste_bestaetigt'
      ? 'teilenummer_am_konkreten_angebot_erneut_abgleichen'
      : 'kauf_zurueckstellen_und_zuordnung_klaeren');
    assert.equal(details.beleg.url,`https://www.karcher.com/de/de/home-and-garden/produkte/${source}`);
    assert.equal(details.beleg.geprueft_am,'2026-11-20');
    assert.equal(details.citation_url,windowGuide);
    assert.equal(details.guide_url,windowEvidence);
    assert.match(details.disclosure,/gekennzeichnete Affiliate-Links/);
    assert.deepEqual(JSON.parse(result.content[0].text),details);
  }
  return {topMatch:first.name,guideUrl:windowEvidence,statuses:cases.map(({status})=>status)};
}

async function verifyCompactWindowLookup(rpc, finder) {
  const examples = [
    ['Kann ich mit dem Kärcher WV 2 Plus Multi Edition 30 ml aufsaugen, obwohl der Tank größer ist?',
      'fenstersauger_kaercher_fluessigkeitsgrenze_und_tank'],
    ['Mein Kärcher WV 8 blinkt bei ausgeschaltetem Motor zweimal kurz, dann lange Pause. Was bedeutet das?',
      'fenstersauger_wv3_wv8_led_muster_einordnen'],
  ];
  for (const [frage,name] of examples) {
    const result = await rpc('tools/call',{name:finder,arguments:{frage}});
    assert.equal(result.isError,false);
    assert.equal(result.structuredContent.tools[0]?.name,name,frage);
  }
  return examples.map(([,name])=>name);
}

async function verifyCompactStdio(extracted) {
  const finder = 'ecoback_werkzeug_finden';
  const runner = 'ecoback_werkzeug_ausfuehren';
  return withStdio(extracted,['--compact'],async (rpc,init) => {
    assert.ok(init.instructions.includes(finder));
    assert.ok(init.instructions.includes(runner));
    const listed = await rpc('tools/list');
    const tools = listed.tools.map(tool=>tool.name);
    assert.deepEqual(tools,[finder,runner]);
    assert.equal(listed.nextCursor,undefined);

    const found = await rpc('tools/call',{name:finder,arguments:{frage:'Kann ich den Abflussschlauch nach oben führen?'}});
    assert.equal(found.isError,false);
    const first = found.structuredContent.tools[0];
    assert.equal(first.name,'entfeuchter_ablaufcheck');
    assert.equal(first.inputSchema.type,'object');
    assert.deepEqual(first.example_arguments,drainArguments);
    const result = await rpc('tools/call',{name:runner,arguments:{name:first.name,eingaben:first.example_arguments}});
    assert.equal(result.isError,false);
    const {outcome,citation_url,guide_url} = result.structuredContent;
    assert.equal(outcome,'pump_check');
    assert.match(citation_url,/^https:\/\//);
    assert.match(guide_url,/^https:\/\//);
    assert.equal(citation_url,first.citation_url);
    assert.equal(guide_url,first.guide_url);

    const live = await rpc('tools/call',{name:runner,arguments:{name:'hitzewelle_vorschau',eingaben:{}}});
    assert.equal(live.isError,true);
    assert.match(live.content[0].text,/lokal nicht verfügbar/);

    const buyer = await rpc('tools/call',{name:finder,arguments:{
      frage:'Was leisten Comfee MDDF-20DEN7 und Meaco Arete One 20L bei 10 °C und 60 % im Keller?',
    }});
    assert.equal(buyer.isError,false);
    const {resources} = await rpc('resources/list');
    const {contents:[resource]} = await rpc('resources/read',{uri:cellarUri});
    assert.deepEqual(buyer.structuredContent.resources,resources);
    assert.deepEqual(buyer.content.filter(part=>part.type==='resource'),[{type:'resource',resource}]);
    const laundryComparison = await verifyCompactLaundryComparison(rpc,finder,runner);
    const laundryPrecision = await verifyCompactLaundryPrecision(rpc,finder);
    const n90Costs = await verifyCompactN90Costs(rpc,finder,runner);
    const tadoOventrop = await verifyCompactTadoOventrop(rpc,finder,runner);
    const householdDecisions = await verifyCompactHouseholdDecisions(rpc,runner);
    const windowWidth = await verifyCompactWindowWidth(rpc,finder,runner);
    const windowBlade = await verifyCompactWindowBlade(rpc,finder,runner);
    const windowLookup = await verifyCompactWindowLookup(rpc,finder);
    return {
      tools,topMatch:first.name,exampleOutcome:outcome,citationsPreserved:true,
      liveToolRejected:true,cellarBuyerEvidence:true,laundryComparison,laundryPrecision,windowBlade,windowLookup,windowWidth,householdDecisions,tadoOventrop,n90Costs,
    };
  });
}

const args = process.argv.slice(2);
assert.equal(args.length,2,'Usage: node build.mjs <pinned source checkout> <empty output directory>');
const [source, output] = args.map(value=>resolve(value));
await mkdir(output,{recursive:true});
assert.equal((await readdir(output)).length,0,'The bundle output directory must be empty');
const temp = await mkdtemp(join(tmpdir(),'eco-local-mcpb-'));
try {
  const stage = join(temp,'stage');
  const extracted = join(temp,'extracted');
  const tar = join(temp,'source.tar');
  await mkdir(stage);
  await mkdir(extracted);
  execFileSync('git',['-C',source,'archive','--format=tar','--output='+tar,revision,'LICENSE','README.md','package.json','src']);
  execFileSync('tar',['-xf',tar,'-C',stage]);
  const license = await readFile(join(stage,'LICENSE'));
  const readme = readmeForExtraction(await readFile(join(stage,'README.md'),'utf8'));
  await writeFile(join(stage,'README.md'),readme.text);
  const pkg = JSON.parse(await readFile(join(stage,'package.json'),'utf8'));
  assert.equal(pkg.version,version);
  assert.deepEqual(pkg.bin,{'getecoback-mcp':entry});
  for (const field of ['dependencies','devDependencies','optionalDependencies']) {
    assert.equal(Object.keys(pkg[field]??{}).length,0,`Unexpected ${field}`);
  }
  await writeJson(join(stage,'package-lock.json'),{name:pkg.name,version,lockfileVersion:3,requires:true,
    packages:{'':{name:pkg.name,version,license:pkg.license,engines:pkg.engines,bin:pkg.bin}}});
  const manifest = {
    manifest_version:'0.3',name:id,display_name:title,version,description,
    author:{name:'f-tiger',url:'https://github.com/f-tiger'},
    repository:{type:'git',url:sourceUrl},homepage:sourceUrl,license:pkg.license,
    server:{type:'node',entry_point:entry,mcp_config:{command:'node',args:['${__dirname}/'+entry]}},
    tools:featureNames.map(name=>({name})),tools_generated:true,
    compatibility:{runtimes:{node:'>=22.0.0'}},
    privacy_policies:['https://getecoback.com/datenschutz.html','https://open-meteo.com/en/terms'],
  };
  await writeJson(join(stage,'manifest.json'),manifest);
  const sourcePin = {repository:sourceRepository,revision};
  await writeJson(join(stage,'SOURCE.json'),sourcePin);
  const artifactDir = join(output,'artifacts'), serverDir = join(output,'servers');
  await mkdir(artifactDir);
  await mkdir(serverDir);
  const file = `${id}-${version}.mcpb`, artifact = join(artifactDir,file);
  execFileSync('python3',[join(legacyHelpers,'deterministic-zip.py'),stage,artifact]);
  const digest = sha256(await readFile(artifact));
  execFileSync('python3',['-m','zipfile','-e',artifact,extracted]);
  const actualManifest = JSON.parse(await readFile(join(extracted,'manifest.json'),'utf8'));
  assert.deepEqual(actualManifest,manifest);
  assert.deepEqual(JSON.parse(await readFile(join(extracted,'SOURCE.json'),'utf8')),sourcePin);
  assert.deepEqual(await readFile(join(extracted,'LICENSE')),license);
  const archivedReadme = await readFile(join(extracted,'README.md'),'utf8');
  assert.equal(archivedReadme,readme.text);
  for (const pointer of readme.obsoleteInstallPointers) {
    assert.ok(!archivedReadme.includes(pointer),'An obsolete install pointer remains in the bundled README');
  }
  assert.ok(!archivedReadme.includes(digest),'The bundled README must not embed its own checksum');
  const result = await verifyStdio(extracted,actualManifest);
  result.compact = await verifyCompactStdio(extracted);
  assert.deepEqual(result.resource,result.compact.resource);
  result.archiveReadme = {replacedVersion:readme.previousVersion,registryLatestUrl};
  const identifier = `${releaseUrl}/${file}`;
  await writeJson(join(serverDir,id+'.json'),{
    $schema:'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
    name,title,description,version,repository:{url:sourceUrl,source:'github'},websiteUrl:sourceUrl,
    packages:[{registryType:'mcpb',identifier,fileSha256:digest,transport:{type:'stdio'}}],
  });
  await writeFile(join(artifactDir,'SHA256SUMS'),`${digest}  ${file}\n`);
  await writeJson(join(output,'smoke-results.json'),{name,version,sourceRevision:revision,...result,fileSha256:digest});
  console.log(JSON.stringify({name,version,...result,fileSha256:digest}));
} finally {
  await rm(temp,{recursive:true,force:true});
}
