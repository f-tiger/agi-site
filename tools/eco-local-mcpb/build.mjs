import assert from 'node:assert/strict';
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';

const id = 'ecoback-local-tools';
const version = '1.22.8';
const revision = '786bb81d724c9d6ca31f352bbc030b23d6de2fc3';
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
  'taupunkt_lueften', 'fenstersauger_170mm_abziehlippe_geraetefamilie', 'fenster_oberflaeche_taucheck',
  'luftentfeuchter_waesche_einzelkosten', 'fritz_302_danfoss_adapter'];
const entry = 'src/server.mjs';
const legacyHelpers = fileURLToPath(new URL('../mcp-registry/local-packages/', import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const drainArguments = {drain:'level_or_uphill',model:'meaco-one-20'};
const cellarUri = 'ecoback://evidence/de/kellerentfeuchter';
const laundryComparisonTool = 'waesche_trocknungskosten';
const singleLaundryTool = 'luftentfeuchter_waesche_einzelkosten';
const singleLaundryCitation = 'https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html';
const singleLaundryGuide = singleLaundryCitation + '#luftentfeuchter-waesche-kosten';
const fritzValveTool = 'fritz_302_danfoss_adapter';
const valveCitation = 'https://getecoback.com/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
const fritzValveGuide = valveCitation + '#fritz-302-danfoss-adapter';
const windowBladeTool = 'fenstersauger_170mm_abziehlippe_geraetefamilie';
const windowGuide = 'https://getecoback.com/produkte.html';
const windowEvidence = windowGuide + '#fenstersauger-belege';
const windowWidthTool = 'fenstersauger_sprossenfenster_duesenbreite';
const windowWidthEntry = windowGuide + '?mcp_entry=fenstersauger-breitencheck#fenstersauger-duesenbreite';
const glassvacTemperatureTool = 'glassvac_kalt_lagern_einschalten_laden_getrennt';
const glassvacTemperatureGuide = windowGuide + '#bosch-glassvac-einsatz-und-pflege';
const kaercherLedTool = 'fenstersauger_wv3_wv8_led_muster_einordnen';
const kaercherLedGuide = windowGuide + '#kaercher-fenstersauger-einsatz-und-hinweise';
const condensationTool = 'fenster_oberflaeche_taucheck';
const condensationCitation = 'https://getecoback.com/guide/fenster-beschlagen-innen.html';
const condensationGuide = condensationCitation + '#fenstersauger-gegen-kondenswasser';

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

async function verifyWindowCondensation(call) {
  const room = {room_c:20,room_rh_pct:60};
  const saturated = {room_c:23,room_rh_pct:100};
  const cases = [
    [{...room,surface_c:10},12,-2,true,'unter_taupunkt'],
    [{...room,surface_c:12},12,0,false,'nahe_am_taupunkt'],
    [{...room,surface_c:14},12,2,false,'ueber_taupunkt'],
    [{...saturated,surface_c:22},23,-1,true,'nahe_am_taupunkt'],
    [{...saturated,surface_c:24},23,1,false,'nahe_am_taupunkt'],
  ];
  const measurements = [];
  for (const [args, dew, margin, possible, interpretation] of cases) {
    const result = await call(args);
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    const values = [data.dew_point_c,data.surface_margin_c,data.condensation_possible,data.messlage];
    assert.deepEqual(values,[dew,margin,possible,interpretation]);
    assert.equal(data.citation_url,condensationCitation);
    assert.equal(data.guide_url,condensationGuide);
    assert.equal(data.share_url,condensationGuide);
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
    measurements.push(values);
  }
  const missingSurface = await call(room);
  assert.equal(missingSurface.isError,true);
  assert.equal(missingSurface.structuredContent,undefined);
  return {name:condensationTool,shareUrl:condensationGuide,measurements,missingSurfaceRejected:true};
}

async function verifyDecimalWindowWidth(call) {
  const cases = [
    {
      args:{lichte_breite_mm:143.7,spiel_pro_seite_mm:5.2,vorhandene_duese_mm:133.3,kauf_geplant:true},
      usable:133.3, fits:true, offers:['06008B7000'],
      step:'vorhandene_duese_zuerst_probesetzen',
    },
    {
      args:{lichte_breite_mm:256.4,spiel_pro_seite_mm:61.7,vorhandene_duese_mm:0,kauf_geplant:true},
      usable:133, fits:null, offers:['06008B7000'], entry:windowWidthEntry,
      step:'genaues_originalpaket_und_platzbedarf_pruefen',
    },
    {
      args:{lichte_breite_mm:256.39999,spiel_pro_seite_mm:61.7,vorhandene_duese_mm:0,kauf_geplant:true},
      usable:132.99999, fits:null, offers:[],
      step:'vorhandenen_einwascher_oder_abzieher_pruefen',
    },
  ];
  const outcomes = [];
  for (const {args,usable,fits,offers,entry:destination,step} of cases) {
    const result = await call(args);
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.ok(Math.abs(data.nutzbreite_mm - usable) < 1e-9);
    assert.equal(data.citation_url,windowGuide);
    assert.equal(data.vorhandene_duese_nominell_passend,fits);
    assert.deepEqual(data.nominell_passende_originalpakete.map(item => item.artikel),offers);
    assert.equal(data.folgeschritt,step);
    assert.equal(data.entry_url,destination);
    assert.equal(Object.hasOwn(data,'entry_url'),Boolean(destination));
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
    outcomes.push({existingFits:data.vorhandene_duese_nominell_passend,
      candidates:data.nominell_passende_originalpakete.map(item=>item.artikel),
      nextStep:data.folgeschritt,entryUrl:data.entry_url ?? null});
  }
  return outcomes;
}

async function verifySingleLaundry(call) {
  const measured = {method:'measured',dehum:1.8,price:0.35};
  const estimated = {method:'estimate',watts:200,hours:6,price:0.35};
  const outcomes = [];
  for (const [input,kwh,cost] of [[measured,1.8,0.63],[estimated,1.2,0.42]]) {
    const result = await call(input);
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.deepEqual([data.kwh,data.cost,data.basis],[kwh,cost,input.method]);
    assert.equal(data.citation_url,singleLaundryCitation);
    assert.equal(data.guide_url,singleLaundryGuide);
    assert.equal(data.share_url,singleLaundryGuide);
    assert.ok(data.share_text_de.includes(singleLaundryGuide));
    assert.equal(Object.hasOwn(data,'lower_cost'),false);
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
    outcomes.push({kwh:data.kwh,cost:data.cost,basis:data.basis});
  }
  const invalid = [{...measured,watts:200},{method:'estimate',watts:200,price:0.35},{...estimated,dehum:1.8}];
  for (const input of invalid) {
    const result = await call(input);
    assert.equal(result.isError,true);
    assert.equal(result.structuredContent,undefined);
  }
  return {name:singleLaundryTool,citation:singleLaundryCitation,shareUrl:singleLaundryGuide,
    outcomes,rejected:invalid.length};
}

async function verifyFritzValve(call) {
  const cases = [
    ['20003120','danfoss-ra','adapter_im_lieferumfang',true,null],
    ['20003120','danfoss-rav','adapter_separat',false,true],
    ['20003120','danfoss-ravl','adapter_separat',false,null],
    ['20003120','anders_oder_unbekannt','modell_oder_ventil_klaeren',null,null],
    ['andere_oder_unbekannt','danfoss-ra','modell_oder_ventil_klaeren',null,null],
  ];
  const outcomes = [];
  for (const [artikelnummer,ventil,status,included,pin] of cases) {
    const result = await call(fritzValveTool,{artikelnummer,ventil});
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    const actual = [data.status,data.adapter_im_lieferumfang,data.adapter_mit_pin_dokumentiert];
    assert.deepEqual(actual,[status,included,pin]);
    assert.equal(data.citation_url,valveCitation);
    assert.equal(data.guide_url,fritzValveGuide);
    assert.equal(data.quellenmarkt,'DE');
    assert.equal(data.quellen_geprueft_am,'2026-11-22');
    assert.match(data.quellen_url,/^https:\/\/fritz\.com\/apps\/knowledge-base\/fritz-dect-302\/3376_/);
    assert.equal(data.produkt_url,'https://fritz.com/products/fritz-smart-thermo-302-20003120');
    assert.doesNotMatch(result.content[0].text,/https?:\/\/[^"\s]*(?:amazon\.|amzn\.)|[?&]tag=/i);
    outcomes.push(actual);
  }
  const diameterOnly = await call(fritzValveTool,{artikelnummer:'20003120',ventil:'34 mm'});
  assert.equal(diameterOnly.isError,true);
  assert.equal(diameterOnly.structuredContent,undefined);
  const providers = [];
  for (const [model,valve,host,reviewed] of [
    ['fritz-302','danfoss-ravl','fritz.com','2026-11-22'],
    ['bosch-ii-m','danfoss-ravl','www.bosch-smarthome.com','2026-11-22'],
    ['tado-v3','heimeier-m30','cdn.brandfolder.io','2026-10-31'],
  ]) {
    const result = await call('thermostat_ventilabgleich',{model,valve});
    assert.equal(result.isError,false);
    const data = result.structuredContent;
    assert.equal(data.reviewed_on,reviewed);
    assert.equal(new URL(data.manufacturer_or_guidance_url).hostname,host);
    providers.push({model,host,reviewed});
  }
  return {name:fritzValveTool,guide:fritzValveGuide,outcomes,diameterRejected:true,providers};
}

async function verifyStdio(extracted, manifest) {
  const {TOOLS} = await import(pathToFileURL(join(extracted,'src/tools.mjs')));
  const {expandedDefinitions} = await import(pathToFileURL(join(extracted,'src/eco-suite/src/mcp-expanded.mjs')));
  const expected = JSON.parse(JSON.stringify(TOOLS));
  assert.equal(expected.length,2022);
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
    assert.deepEqual(sizes,[...Array(20).fill(100),22]);
    const names = new Set(listed.map(tool=>tool.name));
    assert.equal(names.size,2022);
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
    const exactWindowGuides = new Map([
      [glassvacTemperatureTool, glassvacTemperatureGuide],
      [kaercherLedTool, kaercherLedGuide],
    ]);
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
      const expectedGuide = exactWindowGuides.get(tool.name) ?? windowEvidence;
      assert.equal(example.structuredContent.guide_url, expectedGuide, tool.name);
    }
    const windowCondensation = await verifyWindowCondensation(args =>
      rpc('tools/call',{name:condensationTool,arguments:args}));
    const decimalWindowWidth = await verifyDecimalWindowWidth(args =>
      rpc('tools/call',{name:windowWidthTool,arguments:args}));
    const singleLaundry = await verifySingleLaundry(args =>
      rpc('tools/call',{name:singleLaundryTool,arguments:args}));
    const fritzValve = await verifyFritzValve((name,args) =>
      rpc('tools/call',{name,arguments:args}));
    return {tools:names.size,pages:sizes.length,windowExamples:windowTools.length,windowCondensation,decimalWindowWidth,singleLaundry,fritzValve,
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

  const shareUrl = citationUrl+'#laundry-check';
  const uncertainty = 'Keine Aussage, welches Verfahren bei gleicher Trocknung günstiger ist.';
  assert.equal(details.share_url,shareUrl);
  assert.ok(details.share_text_de.includes(uncertainty));
  assert.ok(details.share_text_de.includes('Eingegebene Werte.'));
  assert.ok(details.share_text_de.endsWith('Rechenweg bei EcoBack: '+shareUrl));

  const halfCent = await rpc('tools/call',{name:runner,arguments:{name:first.name,
    eingaben:{dryer:1.4,dehum:1,price:0.025,comparable:true}}});
  assert.equal(halfCent.isError,false);
  const values = halfCent.structuredContent;
  assert.deepEqual(JSON.parse(halfCent.content[0].text),values);
  const dryerLine = values.share_text_de.replaceAll('\u00a0',' ').split('\n').find(line=>line.startsWith('Trockner: '));
  assert.equal(dryerLine,'Trockner: 1,4 kWh × 0,025 €/kWh = 0,04 €');
  assert.equal(values.lower_cost,'dehum');
  assert.ok(values.share_text_de.includes('Gleiche Wäschemenge und Endtrockenheit sind für den Vergleich vorausgesetzt.'));
  for (const answer of [details,values]) {
    assert.equal(answer.share_url,shareUrl);
    assert.deepEqual(answer.share_text_de.match(/https?:\/\/[^\s]+/g),[shareUrl]);
  }
  const omitted = await rpc('tools/call',{name:runner,arguments:{name:first.name,eingaben:{dryer:1.4,dehum:1,price:0.025}}});
  assert.equal(omitted.isError,true);
  return {
    shareUrl,unconfirmedNote:uncertainty,halfCentDryerLine:dryerLine,
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

async function verifyCompactGlassvacTemperature(rpc, finder, runner) {
  const frage = 'Mein Bosch GlassVAC lag nachts bei Frost in der Garage. Kann ich ihn dort gleich an die Steckdose hängen?';
  const lookup = await rpc('tools/call', {name:finder, arguments:{frage}});
  assert.equal(lookup.isError, false);
  const name = glassvacTemperatureTool;
  const first = lookup.structuredContent.tools[0];
  const guideUrl = glassvacTemperatureGuide;
  assert.equal(first?.name, name);
  assert.equal(first.citation_url, windowGuide);
  assert.equal(first.guide_url, guideUrl);

  const fault = await rpc('tools/call', {name:finder, arguments:{
    frage:'Die LED an meinem GlassVAC blinkt beim Laden nach Frost. Ist der Akku defekt?',
  }});
  assert.equal(fault.isError, false);
  const faultPromoted = fault.structuredContent.tools[0]?.name === name;
  assert.equal(faultPromoted, false);

  const model = {paketkennung:'06008B7000', handbuch_zugeordnet:true};
  const call = eingaben => rpc('tools/call', {name:runner, arguments:{name,eingaben}});
  const missing = await call(model);
  assert.equal(missing.isError, true);
  assert.equal(missing.structuredContent, undefined);

  async function atTemperature(umgebung_c) {
    const result = await call({...model, umgebung_c});
    assert.equal(result.isError, false);
    const evidence = result.structuredContent;
    assert.equal(evidence.citation_url, windowGuide);
    assert.equal(evidence.guide_url, guideUrl);
    return {storage:evidence.im_lagerbereich, startup:evidence.einschalten_im_temperaturbereich,
      recommendedCharging:evidence.im_empfohlenen_ladebereich};
  }
  const minusEight = await atTemperature(-8);
  const plusTwo = await atTemperature(2);
  assert.deepEqual(minusEight, {storage:true, startup:false, recommendedCharging:false});
  assert.deepEqual(plusTwo, {storage:true, startup:true, recommendedCharging:true});
  return {name, guideUrl, minusEight, plusTwo, missingMeasurementRejected:missing.isError, faultPromoted};
}

async function verifyCompactHumidifierEfficiency(rpc, finder, runner) {
  const frage = 'Welcher befeuchtet effizienter: der Beurer LB 55 mit 365 Watt oder Oskar mit 6 bis 18 Watt?';
  const lookup = await rpc('tools/call', {name:finder, arguments:{frage}});
  assert.equal(lookup.isError, false);
  const first = lookup.structuredContent.tools[0];
  const name = 'befeuchter_nennwatt_abgabeleistung_bezug';
  const citationUrl = 'https://getecoback.com/guide/luftbefeuchter-stromverbrauch.html';
  const guideUrl = citationUrl + '#effizienz-vergleichen';
  assert.equal(first?.name, name);
  assert.equal(first.citation_url, citationUrl);
  assert.equal(first.guide_url, guideUrl);

  async function calculate(output, watts, sameConditions) {
    const eingaben = {gemessene_wasserabgabe_ml_h:output, elektrische_leistung_w:watts, gleiche_stufe_bedingung:sameConditions};
    const result = await rpc('tools/call', {name:runner, arguments:{name,eingaben}});
    assert.equal(result.isError, false);
    assert.equal(result.structuredContent.citation_url, citationUrl);
    assert.equal(result.structuredContent.guide_url, guideUrl);
    return result.structuredContent.ml_pro_wh;
  }
  const independentMlPerWh = await calculate(400, 365, false);
  const matchedExampleMlPerWh = await calculate(120, 40, true);
  assert.equal(independentMlPerWh, null);
  assert.equal(matchedExampleMlPerWh, 3);
  return {name, citationUrl, guideUrl, independentMlPerWh, matchedExampleMlPerWh};
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
  assert.equal(name,windowWidthTool);
  const input = {lichte_breite_mm:170,spiel_pro_seite_mm:5,vorhandene_duese_mm:0,kauf_geplant:true};
  const call = async values => {
    const result = await rpc('tools/call',{name:runner,arguments:{name,eingaben:values}});
    assert.equal(result.isError,false);
    assert.equal(result.structuredContent.citation_url,windowGuide);
    return result.structuredContent;
  };
  const purchase = await call(input);
  assert.equal(purchase.nutzbreite_mm,160);
  assert.equal(purchase.entry_url,windowWidthEntry);
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

async function verifyCompactWindowSubject(rpc, finder, runner) {
  async function find(frage) {
    const result = await rpc('tools/call', {name:finder, arguments:{frage}});
    assert.equal(result.isError, false);
    return result.structuredContent.tools;
  }
  const kaercherHits = await find('Den Bosch GlassVAC wollte ich nach Frost laden. Jetzt geht es um meinen Kärcher WV 8: Alle LEDs blinken zweimal kurz und machen dann eine lange Pause, der Motor ist schon aus. Was bedeutet das?');
  const [kaercher] = kaercherHits;
  assert.ok(!kaercherHits.some(tool => tool.name === glassvacTemperatureTool));
  assert.equal(kaercher?.name, kaercherLedTool);
  assert.equal(kaercher.citation_url, windowGuide);
  assert.equal(kaercher.guide_url, kaercherLedGuide);
  const boschHits = await find('Zuvor hatte ich den Kärcher WV 8. Jetzt nutze ich den Bosch GlassVAC 06008B7000. Darf ich ihn nach Frost bei minus 3 Grad aufladen?');
  const [bosch] = boschHits;
  assert.ok(!boschHits.some(tool => tool.name === kaercherLedTool));
  assert.equal(bosch?.name, glassvacTemperatureTool);
  assert.equal(bosch.citation_url, windowGuide);
  assert.equal(bosch.guide_url, glassvacTemperatureGuide);
  const correctedFault = await find('Mein Kärcher WV 8 hat defekte LEDs. Korrektur: Ich meine meinen Bosch GlassVAC 06008B7000. Darf ich ihn nach einer Frostnacht in der Garage gleich ans Ladegerät?');
  assert.equal(correctedFault[0]?.name, glassvacTemperatureTool);
  assert.equal(correctedFault[0].guide_url, glassvacTemperatureGuide);
  const unsupported = await find('Mein Bosch GlassVAC lag bei Frost in der Garage. Korrektur: Es ist ein Kärcher WV 8. Darf er jetzt an die Steckdose?');
  const ambiguous = await find('Ich vergleiche Bosch GlassVAC und Kärcher WV 8. Darf ich beide Fenstersauger bei minus 3 Grad aufladen?');
  assert.deepEqual(unsupported, []);
  assert.deepEqual(ambiguous, []);

  async function ledMeaning(muster, zustand) {
    const eingaben = {artikel:'1.633-785.0', sicherheitsblatt_bestaetigt:true, muster, zustand};
    const result = await rpc('tools/call', {name:runner, arguments:{name:kaercherLedTool, eingaben}});
    assert.equal(result.isError, false);
    assert.equal(result.structuredContent.citation_url, windowGuide);
    assert.equal(result.structuredContent.guide_url, kaercherLedGuide);
    return result.structuredContent.tabellenbedeutung;
  }
  const pattern = 'alle_leds_zweimal_kurz_dann_lange_pause';
  const exactMeaning = await ledMeaning(pattern, 'motor_aus');
  const unconfirmedMeaning = await ledMeaning(pattern, 'offen');
  assert.equal(exactMeaning, 'akkutemperatur_zu_hoch_oder_zu_tief');
  assert.equal(unconfirmedMeaning, null);
  return {kaercherTool:kaercher.name, kaercherGuide:kaercher.guide_url, boschTool:bosch.name,
    boschGuide:bosch.guide_url, unsupportedMatches:unsupported.length, ambiguousMatches:ambiguous.length,
    exactMeaning, unconfirmedMeaning};
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
    const singleLaundryLookup = await rpc('tools/call',{
      name:finder,arguments:{frage:'Was kostet mich die Wäsche mit Entfeuchter, durchschnittlich 200 Watt über 6 Stunden?'},
    });
    assert.equal(singleLaundryLookup.isError,false);
    const [singleMatch] = singleLaundryLookup.structuredContent.tools;
    assert.equal(singleMatch?.name,singleLaundryTool);
    assert.equal(singleMatch.guide_url,singleLaundryGuide);
    assert.deepEqual(singleMatch.inputSchema.required,['method','price']);
    assert.equal(singleMatch.inputSchema.oneOf.length,2);
    const singleLaundry = await verifySingleLaundry(eingaben =>
      rpc('tools/call',{name:runner,arguments:{name:singleLaundryTool,eingaben}}));
    const fritzLookup = await rpc('tools/call',{
      name:finder,arguments:{frage:'Welchen Adapter brauche ich für das unbekannte Ventil am FRITZ!Smart Thermo 302?'},
    });
    assert.equal(fritzLookup.isError,false);
    const [fritzMatch] = fritzLookup.structuredContent.tools;
    assert.equal(fritzMatch?.name,fritzValveTool);
    assert.equal(fritzMatch.guide_url,fritzValveGuide);
    assert.deepEqual(fritzMatch.inputSchema.required,['artikelnummer','ventil']);
    const fritzValve = await verifyFritzValve((name,eingaben) =>
      rpc('tools/call',{name:runner,arguments:{name,eingaben}}));
    const laundryPrecision = await verifyCompactLaundryPrecision(rpc,finder);
    const humidifierEfficiency = await verifyCompactHumidifierEfficiency(rpc,finder,runner);
    const glassvacTemperature = await verifyCompactGlassvacTemperature(rpc,finder,runner);
    const windowSubject = await verifyCompactWindowSubject(rpc,finder,runner);
    const condensation = await rpc('tools/call',{
      name:finder,arguments:{frage:'Fenstersauger gegen Kondenswasser'},
    });
    assert.equal(condensation.isError,false);
    const [match] = condensation.structuredContent.tools;
    assert.equal(match?.name,condensationTool);
    assert.equal(match.citation_url,condensationCitation);
    assert.equal(match.guide_url,condensationGuide);
    const windowCondensation = await verifyWindowCondensation(eingaben =>
      rpc('tools/call',{name:runner,arguments:{name:condensationTool,eingaben}}));
    const n90Costs = await verifyCompactN90Costs(rpc,finder,runner);
    const tadoOventrop = await verifyCompactTadoOventrop(rpc,finder,runner);
    const householdDecisions = await verifyCompactHouseholdDecisions(rpc,runner);
    const windowWidth = await verifyCompactWindowWidth(rpc,finder,runner);
    const decimalWindowWidth = await verifyDecimalWindowWidth(eingaben =>
      rpc('tools/call',{name:runner,arguments:{name:windowWidthTool,eingaben}}));
    const windowBlade = await verifyCompactWindowBlade(rpc,finder,runner);
    const windowLookup = await verifyCompactWindowLookup(rpc,finder);
    return {
      tools,topMatch:first.name,exampleOutcome:outcome,citationsPreserved:true,
      liveToolRejected:true,cellarBuyerEvidence:true,laundryComparison,singleLaundry,fritzValve,laundryPrecision,windowBlade,windowLookup,
      windowWidth,decimalWindowWidth,householdDecisions,tadoOventrop,n90Costs,humidifierEfficiency,glassvacTemperature,windowSubject,windowCondensation,
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
  assert.deepEqual(result.windowCondensation,result.compact.windowCondensation);
  assert.deepEqual(result.decimalWindowWidth,result.compact.decimalWindowWidth);
  assert.deepEqual(result.singleLaundry,result.compact.singleLaundry);
  assert.deepEqual(result.fritzValve,result.compact.fritzValve);
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
