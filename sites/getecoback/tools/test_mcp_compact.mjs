import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import worker from '../src/cached-worker.mjs';
import {collectToolPages, MCP_PAGE_SIZE} from '../src/mcp-pagination.mjs';
import {N90_ENTRY_URL, N90_TOOL_NAME} from '../src/n90-entry.mjs';

const origin = 'https://getecoback.com';
const fullPath = '/mcp/v1';
const compactPath = '/mcp/v1?profile=compact';
const findName = 'ecoback_werkzeug_finden';
const runName = 'ecoback_werkzeug_ausfuehren';
const cellarName = 'kellerentfeuchter_pruefpunkt_abgleichen';
const cellarUri = 'ecoback://evidence/de/kellerentfeuchter';
const cellarEntry = origin + '/guide/luftentfeuchter-keller.html?mcp_entry=keller-pruefpunkt#modell-meaco-one-20';
const drainName = 'entfeuchter_ablaufcheck';
const cellarQuestion = 'Was leisten Comfee MDDF-20DEN7 und Meaco Arete One 20L bei 10 °C und 60 % im Keller?';
const cellarInputs = {modell:'meaco-one-20',temperatur_c:10,relative_feuchte_pct:60,wiederholt_gemessen:true,befund:'feuchte_auffaellig'};
const humanUA = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/142.0';
const ciUA = 'getecoback-ci/compact';
const {name: registryName,version} = JSON.parse(readFileSync(new URL('../mcp/server.json',import.meta.url),'utf8'));

function withCellarEntry(result) {
  assert.equal(result.structuredContent.entry_url,undefined);
  const structuredContent = {...result.structuredContent, entry_url:cellarEntry};
  return {...result, structuredContent, content:[{type:'text',text:JSON.stringify(structuredContent,null,2)}]};
}

const outbound = [];
const originalFetch = globalThis.fetch;
test.before(() => {
  globalThis.fetch = input => {
    outbound.push(String(input?.url ?? input));
    throw new Error('Hosted compact tests cannot make outbound requests');
  };
});
test.afterEach(() => assert.deepEqual(outbound.splice(0),[]));
test.after(() => { globalThis.fetch = originalFetch; });

function fixture() {
  const writes = [];
  const env = {EVENTS:{prepare(sql) {
    return {bind(...args) {return {async run() {writes.push({sql,args});}};}};
  }}};

  const send = (path, options) => worker.fetch(new Request(origin+path,options),env,{});

  async function rpc(path, method, params, headers = {}) {
    const response = await send(path,{method:'POST',headers:{'content-type':'application/json','user-agent':ciUA,...headers},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
    assert.equal(response.status,200,`${path} ${method}`);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const message = await response.json();
    assert.equal(message.jsonrpc,'2.0');
    assert.equal(message.id,1);
    return message;
  }

  async function result(path, method, params, headers) {
    const message = await rpc(path,method,params,headers);
    assert.equal(message.error,undefined,`${path} ${method}`);
    return message.result;
  }

  const call = (path,name,args,headers) => result(path,'tools/call',{name,arguments:args},headers);
  return {writes,send,rpc,result,call};
}

test('hosted compact returns reviewed guide sections without presenting them as runnable tools', async () => {
  const {call,writes} = fixture();
  const headers = {'user-agent':humanUA};
  for (const [frage,path,fragment] of [
    ['Welcher Wasserfilter passt für Siemens TE653501DE/13?', '/produkte.html', 'siemens-eq6-intenza'],
    ['Welchen COP brauche ich bei 30 Cent Strom und 12 Cent Gas?', '/guide/klimaanlage-mit-heizfunktion.html', 'heizkosten-klimaanlage-gas'],
    ['Warum ist mein Fenster hinter dem Plissee nass, obwohl das Hygrometer 50 % zeigt?', '/guide/luftfeuchtigkeit-richtig-messen.html', 'kondenswasser-hinter-plissee'],
    ['Auto Heizlüfter 12 V 150 Watt', '/guide/akku-heizluefter.html', 'auto-12v-steckdose'],
  ]) {
    const found = await call(compactPath,findName,{frage},headers);
    assert.equal(found.isError,false);
    assert.deepEqual(found.structuredContent,{
      totalMatches:0,tools:[],guides:[{guide_url:origin+path+'#'+fragment,citation_url:origin+path}],
    },frage);
    assert.deepEqual(JSON.parse(found.content[0].text),found.structuredContent);
  }
  const unrelated = await call(compactPath,findName,{frage:'Öffne https://example.invalid/fremd.html#ratgeber'},headers);
  assert.equal(unrelated.structuredContent.guides,undefined);
  const philips=await call(compactPath,findName,{frage:'Welcher Filter passt in den Philips HU3916/10?'},headers);
  assert.equal(philips.structuredContent.tools[0]?.name,'philips_verdunsterfilter_zuordnung');
  assert.equal(philips.structuredContent.guides,undefined);
  assert.equal((await call(compactPath,runName,{name:'ratgeber_lesen',eingaben:{pfad:'/produkte.html'}},headers)).isError,true);
  assert.deepEqual(writes,[]);
});

test('compact routes an everyday measured window report to the shareable dew-point check', async () => {
  const {call,writes} = fixture();
  const name = 'fenster_oberflaeche_taucheck';
  const guide = origin + '/guide/fenster-beschlagen-innen.html';
  const found = await call(compactPath,findName,{frage:'Morgens beschlägt mein Fenster innen. Im Schlafzimmer sind 20 °C und 60 Prozent Luftfeuchte, die Scheibe hat 10 °C. Kann sich dort Tauwasser bilden?'});
  const first = found.structuredContent.tools[0];
  assert.equal(first.name,name);
  assert.equal(first.citation_url,guide);
  assert.equal(first.guide_url,guide+'#fenstersauger-gegen-kondenswasser');
  assert.deepEqual(first.inputSchema.required.toSorted(), ['room_c','room_rh_pct']);
  const room = {room_c:20,room_rh_pct:60};
  const threshold = await call(compactPath,runName,{name,eingaben:room});
  assert.equal(threshold.isError,false);
  assert.equal(threshold.structuredContent.dew_point_c,12);
  assert.equal(threshold.structuredContent.condensation_possible,null);
  assert.equal(threshold.structuredContent.surface_margin_c,null);
  assert.equal(threshold.structuredContent.messlage,'scheibentemperatur_fehlt');
  const value = await call(compactPath,runName,{name,eingaben:{...room,surface_c:10}});
  assert.equal(value.isError,false);
  assert.equal(value.structuredContent.dew_point_c,12);
  assert.equal(value.structuredContent.surface_margin_c,-2);
  assert.equal(value.structuredContent.share_url,first.guide_url);
  assert.deepEqual(writes,[]);
});

test('compact humidifier results keep a nominal wattage from being treated as a measured efficiency', async () => {
  const {call,writes} = fixture();
  const name = 'befeuchter_nennwatt_abgabeleistung_bezug';
  const evidence = origin+'/guide/luftbefeuchter-stromverbrauch.html';
  const found = await call(compactPath,findName,{frage:'Beurer LB55 oder Oskar mit 18 W: Welcher ist bei 365 Watt effizienter?'});
  assert.equal(found.structuredContent.tools[0]?.name,name);
  assert.equal(found.structuredContent.tools[0].citation_url,evidence);
  assert.equal(found.structuredContent.tools[0].guide_url,evidence+'#effizienz-vergleichen');
  const inputs = {gemessene_wasserabgabe_ml_h:400,elektrische_leistung_w:365,gleiche_stufe_bedingung:false};
  const unknown = await call(compactPath,runName,{name,eingaben:inputs});
  assert.equal(unknown.structuredContent.ml_pro_wh,null);
  assert.equal(unknown.structuredContent.citation_url,evidence);
  assert.equal(unknown.structuredContent.guide_url,evidence+'#effizienz-vergleichen');
  const comparable = await call(fullPath,name,{...inputs,gleiche_stufe_bedingung:true});
  assert.equal(comparable.structuredContent.ml_pro_wh,1.1);
  assert.deepEqual(writes,[]);
});

test('GlassVAC charging decisions require measured temperature and the matched set manual', async () => {
  const {call,writes} = fixture();
  const name = 'glassvac_kalt_lagern_einschalten_laden_getrennt';
  const product = origin+'/produkte.html';
  const found = await call(compactPath,findName,
    {frage:'Bosch GlassVAC stand im Frost. Darf ich ihn dort an die Steckdose hängen?'});
  assert.equal(found.structuredContent.tools[0]?.name,name);
  assert.equal(found.structuredContent.tools[0].citation_url,product);
  assert.equal(found.structuredContent.tools[0].guide_url,product+'#bosch-glassvac-einsatz-und-pflege');
  const known = {paketkennung:'06008B7000',handbuch_zugeordnet:true};
  const invoke = args => call(compactPath,runName,{name,eingaben:{...known,...args}});
  const missing = await invoke({});
  assert.equal(missing.isError,true);
  assert.equal(missing.structuredContent,undefined);
  for (const [umgebung_c,start,charge] of [[-8,false,false],[-5,true,false],[2,true,true]]) {
    const result = (await invoke({umgebung_c})).structuredContent;
    assert.equal(result.im_lagerbereich,true);
    assert.equal(result.einschalten_im_temperaturbereich,start);
    assert.equal(result.im_empfohlenen_ladebereich,charge);
    assert.equal(result.guide_url,product+'#bosch-glassvac-einsatz-und-pflege');
  }
  const other = (await invoke({umgebung_c:2,paketkennung:'06008B7200'})).structuredContent;
  assert.equal(other.status,'modell_oder_handbuch_offen');
  assert.equal(other.beleg,null);
  assert.deepEqual(writes,[]);
});

test('corrected Kärcher LED questions keep the actual model and observed state separate', async () => {
  const {call,writes} = fixture();
  const name='fenstersauger_wv3_wv8_led_muster_einordnen';
  const guide=origin+'/produkte.html#kaercher-fenstersauger-einsatz-und-hinweise';
  const led=await call(compactPath,findName,{frage:'Bosch GlassVAC war im Frost. Korrektur: Mein Kärcher WV 8 blinkt zweimal kurz, der Motor ist aus. Was bedeutet das?'});
  assert.equal(led.structuredContent.tools[0]?.name,name);
  assert.equal(led.structuredContent.tools[0].guide_url,guide);
  const unknown=await call(compactPath,findName,{frage:'Der Bosch GlassVAC war bei Frost in der Garage. Kann ich stattdessen den Kärcher WV 8 laden?'});
  assert.deepEqual(unknown.structuredContent.tools,[]);
  const observed={artikel:'1.633-785.0',sicherheitsblatt_bestaetigt:true,
    muster:'alle_leds_zweimal_kurz_dann_lange_pause',zustand:'motor_aus'};
  const result=await call(fullPath,name,observed);
  assert.equal(result.structuredContent.tabellenbedeutung,'akkutemperatur_zu_hoch_oder_zu_tief');
  assert.equal(result.structuredContent.guide_url,guide);
  assert.equal(Object.hasOwn(result.structuredContent,'im_empfohlenen_ladebereich'),false);
  const different=await call(compactPath,runName,{name,eingaben:{...observed,zustand:'waehrend_laden'}});
  assert.equal(different.structuredContent.tabellenbedeutung,null);
  assert.deepEqual(writes,[]);
});

test('only the exact compact profile changes the HTTP tool list and adds resources', async () => {
  const {result,rpc,call,writes} = fixture();
  const protocolVersion = '2025-06-18';
  const fullInit = await result(fullPath,'initialize',{protocolVersion});
  assert.equal(fullInit.protocolVersion,protocolVersion);
  assert.deepEqual(fullInit.serverInfo,{name:registryName.split('/').at(-1),version});
  assert.deepEqual(fullInit.capabilities,{tools:{}});
  const firstPage = await result(fullPath,'tools/list',{});
  assert.equal(firstPage.tools.length,MCP_PAGE_SIZE);
  assert(firstPage.nextCursor);
  const secondPage = await result(fullPath,'tools/list',{cursor:firstPage.nextCursor});
  assert.equal(secondPage.tools.length,MCP_PAGE_SIZE);
  assert.notEqual(firstPage.tools[0].name,secondPage.tools[0].name);
  const nativeCall = await call(fullPath,'btu_empfehlung',{qm:20});
  assert.equal(nativeCall.isError,false);
  assert.match(nativeCall.content[0].text,/7\.000 BTU/);
  assert.equal((await rpc(fullPath,'resources/list',{})).error.code,-32601);

  for (const path of ['/mcp','/mcp?profile=compact','/mcp/?profile=compact','/mcp/v1/?profile=compact',
    '/mcp/v2?profile=compact','/mcp/v1?profile=Compact','/mcp/v1?profile=compact&profile=compact','/mcp/v1?profile=compact&profile=full']) {
    assert.deepEqual(await result(path,'initialize',{protocolVersion}),fullInit,path);
    assert.deepEqual(await result(path,'tools/list',{}),firstPage,path);
    assert.deepEqual(await result(path,'tools/list',{cursor:firstPage.nextCursor}),secondPage,path);
    assert.deepEqual(await call(path,'btu_empfehlung',{qm:20}),nativeCall,path);
    assert.equal((await rpc(path,'resources/list',{})).error.code,-32601,path);
  }

  const compactInit = await result(compactPath,'initialize',{protocolVersion});
  assert.equal(compactInit.protocolVersion,protocolVersion);
  assert.deepEqual(compactInit.serverInfo,fullInit.serverInfo);
  assert.deepEqual(compactInit.capabilities,{tools:{},resources:{}});
  assert.match(compactInit.instructions,/ecoback_werkzeug_finden/);
  const listing = await result(compactPath,'tools/list',{});
  assert.deepEqual(listing.tools.map(tool => tool.name).sort(),[runName,findName]);
  assert.equal(listing.nextCursor,undefined);
  assert(listing.tools.every(tool => tool.annotations.readOnlyHint === true));
  assert.deepEqual(await result(compactPath+'&__probe=1','tools/list',{}),listing);
  assert.equal((await rpc(compactPath,'tools/list',{cursor:firstPage.nextCursor})).error.code,-32602);
  assert.equal((await rpc(fullPath,'tools/list',{cursor:'stale-cursor'})).error.code,-32602);
  assert.deepEqual(writes,[]);
});

test('the German finder returns canonical schemas and the same Markdown as native resource reads without recording usage', async () => {
  const {result,rpc,call,writes} = fixture();
  const headers = {'user-agent':humanUA};
  const allTools = await collectToolPages(cursor => result(fullPath,'tools/list',cursor ? {cursor} : {}));
  const advertised = new Map(allTools.map(tool => [tool.name,tool]));
  const {resources,nextCursor} = await result(compactPath,'resources/list',undefined,headers);
  assert.equal(resources.length,1);
  assert.equal(resources[0].uri,cellarUri);
  assert.equal(resources[0].mimeType,'text/markdown');
  assert.equal(nextCursor,undefined);
  assert.deepEqual(await result(compactPath,'resources/templates/list',{},headers),{resourceTemplates:[]});
  const {contents} = await result(compactPath,'resources/read',{uri:cellarUri},headers);
  assert.equal(contents.length,1);
  const {text} = contents[0];
  assert.deepEqual(contents,[{uri:cellarUri,mimeType:'text/markdown',text}]);
  assert.match(text,/10 °C[^\n]*3[,.]4 L\/Tag[^\n]*180 W/);
  assert.match(text,/20 °C[^\n]*8[,.]5 L\/Tag[^\n]*216 W/);
  assert.match(text,/MDDF-20DEN7 ohne WF[^\n]*\boffen\b/);
  assert.match(text,/https:\/\/eu\.meaco\.com\/products\/meacodry-arete-one-20l-luftentfeuchter-luftreiniger/);

  const found = await call(compactPath,findName,{frage:cellarQuestion},headers);
  assert.equal(found.isError,false);
  const best = found.structuredContent.tools[0];
  assert.equal(best.name,cellarName);
  assert.deepEqual(best.inputSchema,advertised.get(cellarName).inputSchema);
  assert.deepEqual(best.example_arguments,cellarInputs);
  assert.equal(best.citation_url,origin+'/guide/luftentfeuchter-keller.html');
  assert.equal(best.guide_url,best.citation_url+'#kalter-keller');
  assert.deepEqual(found.structuredContent.resources,resources);
  assert.deepEqual(found.content.filter(part => part.type === 'resource'),[{type:'resource',resource:contents[0]}]);

  const drain = (await call(compactPath,findName,{frage:'Kann ich den Abflussschlauch nach oben führen?'},headers)).structuredContent.tools[0];
  assert.equal(drain.name,drainName);
  assert.deepEqual(drain.inputSchema,advertised.get(drainName).inputSchema);
  assert.deepEqual(drain.example_arguments,{drain:'level_or_uphill',model:'meaco-one-20'});
  assert.match(drain.guide_url,/utm_campaign=keller-ablauf#ablauf-vor-kauf$/);
  const variant = await call(compactPath,findName,{frage:'Comfee MDDF-20DEN7-WF bei 10 °C'},headers);
  assert(variant.structuredContent.tools.some(tool => tool.name === 'comfee_mddf20_wf_beleggrenze'));
  assert(!variant.content.some(part => part.type === 'resource'));

  for (const method of ['resources/list','resources/templates/list']) {
    for (const params of [{cursor:'stale-cursor'},[]]) assert.equal((await rpc(compactPath,method,params,headers)).error.code,-32602);
  }
  for (const params of [{},{uri:42}]) assert.equal((await rpc(compactPath,'resources/read',params,headers)).error.code,-32602);
  for (const uri of [cellarUri+'/','https://example.invalid/cellar']) {
    assert.equal((await rpc(compactPath,'resources/read',{uri},headers)).error.code,-32002);
  }
  assert.deepEqual(writes,[]);
});

test('compact execution matches the underlying result and records that fixed tool once', async () => {
  const {rpc,call,writes} = fixture();
  const headers = {'user-agent':humanUA};
  const full = await call(fullPath,cellarName,cellarInputs);
  const compact = await call(compactPath,runName,{name:cellarName,eingaben:cellarInputs},headers);
  assert.deepEqual(compact,withCellarEntry(full));
  assert.equal(compact.isError,false);
  assert.equal(compact.structuredContent.status,'hersteller_pruefpunkt');
  assert.equal(writes.length,1);
  const {sql,args:[event,metadata]} = writes[0];
  assert.match(sql,/INSERT INTO ev\b/);
  assert.equal(event,'mcp_call');
  assert.deepEqual(JSON.parse(metadata),{tool:cellarName,outcome:'complete',mcp_profile:'compact',mcp_cellar_link:1,ua:humanUA});
  assert.doesNotMatch(metadata,/werkzeug_ausfuehren|modell|relative_feuchte|temperatur_c|meaco-one-20/i);

  for (const name of [cellarName,drainName,'not_a_compact_wrapper']) {
    assert.equal((await rpc(compactPath,'tools/call',{name,arguments:{}},headers)).error.code,-32602);
  }
  for (const name of ['hitzewelle_vorschau','ratgeber_lesen','ratgeber_suche','__proto__',runName]) {
    assert.equal((await call(compactPath,runName,{name,eingaben:{}},headers)).isError,true);
  }
  for (const args of [{},{name:cellarName},{name:cellarName,eingaben:[]},{name:cellarName,eingaben:null}]) {
    assert.equal((await call(compactPath,runName,args,headers)).isError,true);
  }
  for (const args of [{},{frage:42},{frage:'  '},{frage:'a'.repeat(501)}]) {
    assert.equal((await call(compactPath,findName,args,headers)).isError,true);
  }
  assert.equal(writes.length,1);

  const drainInputs = {drain:'level_or_uphill',model:'meaco-one-20'};
  const fullDrain = await call(fullPath,drainName,drainInputs);
  assert.deepEqual(await call(compactPath,runName,{name:drainName,eingaben:drainInputs},headers),fullDrain);
  assert.equal(fullDrain.structuredContent.outcome,'pump_check');
  assert.deepEqual(writes.map(({args:[event,metadata]}) => {
    const {tool,outcome} = JSON.parse(metadata);
    return [event,tool,outcome];
  }), [['mcp_call',cellarName,'complete'],['mcp_call',drainName,'pump_check']]);
  assert.equal(JSON.parse(writes[1].args[1]).mcp_profile,'compact');
  assert.equal(JSON.parse(writes[1].args[1]).mcp_cellar_link,undefined);
});

test('compact offers the model link only for an exact measured Meaco test point and keeps the RPC marker private', async () => {
  const {call,send,writes} = fixture();
  const headers = {'user-agent':humanUA};
  for (const inputs of [{modell:'comfee-mddf20'}, {temperatur_c:15}, {wiederholt_gemessen:false},
    {befund:'unauffaellig'}, {befund:'wassereintritt_oder_schaden'}]) {
    const result = await call(compactPath,runName,{name:cellarName,eingaben:{...cellarInputs,...inputs}},headers);
    assert.equal(result.isError,false);
    assert.equal(result.structuredContent.entry_url,undefined);
    const metadata = JSON.parse(writes.at(-1).args[1]);
    assert.equal(metadata.mcp_profile,'compact');
    assert.equal(metadata.mcp_cellar_link,undefined);
  }
  const warmer = await call(compactPath,runName,{name:cellarName,eingaben:{...cellarInputs,temperatur_c:20}},headers);
  assert.equal(warmer.structuredContent.entry_url,cellarEntry);

  const invalid = await call(compactPath,runName,{name:cellarName,eingaben:{...cellarInputs,temperatur_c:'10'}},headers);
  assert.equal(invalid.isError,true);
  const [event,metadata] = writes.at(-1).args;
  assert.equal(event,'mcp_probe');
  assert.equal(JSON.parse(metadata).mcp_profile,undefined);
  assert.equal(JSON.parse(metadata).mcp_cellar_link,undefined);

  const forged = await send('/api/ev',{method:'POST',headers:{...headers,'content-type':'application/json'},
    body:JSON.stringify({n:'mcp_call',p:'/mcp',m:{tool:cellarName,mcp_profile:'compact',mcp_cellar_link:1}})});
  assert.equal(forged.status,200);
  assert.deepEqual(JSON.parse(writes.at(-1).args[4]),{tool:cellarName});
});

test('header, query, privacy and CI probes return the same result with zero writes', async () => {
  const {call,writes} = fixture();
  const args = {name:cellarName,eingaben:cellarInputs};
  const headers = {'user-agent':humanUA};
  const expected = withCellarEntry(await call(fullPath,cellarName,cellarInputs));
  for (const [path,requestHeaders] of [
    [compactPath,{...headers,'x-probe':'1'}],
    [compactPath+'&__probe=1',headers],
    [compactPath,{...headers,dnt:'1'}],
    [compactPath,{...headers,'sec-gpc':'1'}],
    [compactPath,{'user-agent':ciUA}],
  ]) {
    assert.deepEqual(await call(path,runName,args,requestHeaders),expected);
    assert.deepEqual(writes,[]);
  }
});

test('only successful exact N90 compact answers offer the fixed owned entry without exposing inputs to telemetry', async () => {
  const {call,send,writes} = fixture();
  const headers = {'user-agent':humanUA};
  const inputs = {ean:8004399512351,modell:'PAC N90 ECO Silent',arbeitspreis_eur_kwh:0.35,
    messung_vollstaendig:true,messenergie_kwh:1.8,messdauer_min:180};
  const run = (changes={}, requestHeaders=headers, path=compactPath) => call(path,runName,
    {name:N90_TOOL_NAME,eingaben:{...inputs,...changes}},requestHeaders);
  const full = await call(fullPath,N90_TOOL_NAME,inputs);
  assert.equal(full.structuredContent.entry_url,undefined);
  const compact = await run();
  assert.equal(compact.isError,false);
  assert.equal(compact.structuredContent.entry_url,N90_ENTRY_URL);
  assert.equal(compact.structuredContent.citation_url,full.structuredContent.citation_url);
  assert.equal(compact.structuredContent.guide_url,full.structuredContent.guide_url);
  assert.deepEqual(JSON.parse(compact.content[0].text),compact.structuredContent);
  assert.doesNotMatch(JSON.stringify(compact.structuredContent),/amazon\.de|tag=getecoback-21/);
  assert.equal(writes.length,1);
  assert.deepEqual(JSON.parse(writes[0].args[1]),{
    tool:N90_TOOL_NAME,outcome:'complete',mcp_profile:'compact',mcp_n90_link:1,ua:humanUA,
  });
  for (const change of [{ean:0},{ean:8004399512352},{modell:'abweichend'},{ean:'8004399512351'}]) {
    const result = await run(change);
    assert.equal(result.structuredContent?.entry_url,undefined);
    assert.equal(JSON.parse(writes.at(-1).args[1]).mcp_n90_link,undefined);
  }
  // The link is an evidence path. Matching the equipment does not require a tariff or measured energy.
  const unknownTariff = await run({arbeitspreis_eur_kwh:-1,messung_vollstaendig:false,messenergie_kwh:0,messdauer_min:0});
  assert.equal(unknownTariff.structuredContent.entry_url,N90_ENTRY_URL);
  assert.equal(unknownTariff.structuredContent.label_referenz_eur_je_60_min,null);

  writes.length = 0;
  for (const quiet of [{'x-probe':'1'},{dnt:'1'},{'sec-gpc':'1'},{'user-agent':ciUA}]) {
    const probe = await run({}, {...headers,...quiet});
    assert.equal(probe.structuredContent.entry_url,N90_ENTRY_URL);
  }
  assert.equal((await run({},headers,compactPath+'&__probe=1')).structuredContent.entry_url,N90_ENTRY_URL);
  assert.deepEqual(writes,[]);

  const forged = await send('/api/ev',{method:'POST',headers:{...headers,'content-type':'application/json'},
    body:JSON.stringify({n:'mcp_call',p:'/mcp',m:{tool:N90_TOOL_NAME,mcp_profile:'compact',mcp_n90_link:1,mcp_n90_entry:1}})});
  assert.equal(forged.status,200);
  assert.deepEqual(JSON.parse(writes[0].args[4]),{tool:N90_TOOL_NAME});
});

test('compact HTTP preserves CORS preflight, method rejection, notifications and ping', async () => {
  const {send,result,writes} = fixture();
  for (const path of [fullPath,compactPath]) {
    const preflight = await send(path,{method:'OPTIONS'});
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('access-control-allow-origin'),'*');
    assert.equal(preflight.headers.get('access-control-allow-methods'),'POST, OPTIONS');
    assert.match(preflight.headers.get('access-control-allow-headers'),/\bmcp-protocol-version\b/);
    const get = await send(path,{method:'GET'});
    assert.equal(get.status,405);
    assert.equal(get.headers.get('allow'),'POST, OPTIONS');
    const notification = await send(path,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
    assert.equal(notification.status,202);
    assert.equal(await notification.text(),'');
    assert.deepEqual(await result(path,'ping',{}),{});
  }
  assert.deepEqual(writes,[]);
});

test('single-dehumidifier laundry costs disclose measurement or estimate in the full and compact profile',async()=>{
  const {call,writes}=fixture();
  const name='luftentfeuchter_waesche_einzelkosten';
  const citation=origin+'/waeschetrockner-oder-luftentfeuchter.html';
  const guide=citation+'#luftentfeuchter-waesche-kosten';
  const found=await call(compactPath,findName,{frage:'Was kostet eine Ladung Wäsche nur mit meinem Luftentfeuchter?'});
  assert.equal(found.structuredContent.tools[0]?.name,name);
  for(const [inputs,kwh,cost,provenance,display] of [
    [{method:'measured',dehum:1.8,price:.35},1.8,.63,/Messwert/,/0,63/],
    [{method:'estimate',watts:400,hours:6,price:.35},2.4,.84,/Schätzung/,/0,84/],
  ]){
    const full=await call(fullPath,name,inputs);
    assert.equal(full.isError,false);
    assert.deepEqual(await call(compactPath,runName,{name,eingaben:inputs}),full);
    const answer=full.structuredContent;
    assert.equal(answer.kwh,kwh);
    assert.ok(Math.abs(answer.cost-cost)<1e-12);
    assert.equal(answer.basis,inputs.method);
    assert.equal(answer.citation_url,citation);
    assert.equal(answer.guide_url,guide);
    assert.equal(answer.share_url,guide);
    assert.match(answer.share_text_de,provenance);
    assert.match(answer.share_text_de,display);
    assert.doesNotMatch(answer.share_text_de,/amazon|utm_|gewinner|günstiger/i);
  }
  for(const inputs of [
    {method:'measured',price:.35}, {method:'estimate',watts:400,price:.35},
    {method:'estimate',hours:6,dehum:1.8,watts:400,price:.35},
    {method:'measured',dehum:1.8,watts:400,price:.35},
    {method:'measured',dehum:1.8,dryer:2,price:.35},
    {method:'nameplate',watts:400,hours:6,price:.35},
    {method:'estimate',watts:'400',hours:6,price:.35},
  ]){
    assert.equal((await call(fullPath,name,inputs)).isError,true);
    assert.equal((await call(compactPath,runName,{name,eingaben:inputs})).isError,true);
  }
  assert.deepEqual(writes,[]);
});

test('the FRITZ! 302 Danfoss check keeps package contents and unknown valves separate across both profiles',async()=>{
  const {call,writes}=fixture();
  const name='fritz_302_danfoss_adapter';
  const page=origin+'/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
  const found=await call(compactPath,findName,{frage:'Passt der RA-Adapter beim FRITZ!DECT 302 auch auf RAV oder RAVL?'});
  assert.equal(found.structuredContent.tools[0]?.name,name);
  for (const [artikelnummer,ventil,status,included,pin] of [
    ['20003120','danfoss-ra','adapter_im_lieferumfang',true,null],
    ['20003120','danfoss-rav','adapter_separat',false,true],
    ['20003120','danfoss-ravl','adapter_separat',false,null],
    ['20003120','anders_oder_unbekannt','modell_oder_ventil_klaeren',null,null],
    ['andere_oder_unbekannt','danfoss-ra','modell_oder_ventil_klaeren',null,null],
  ]) {
    const args={artikelnummer,ventil};
    const result=await call(fullPath,name,args);
    assert.equal(result.isError,false);
    assert.deepEqual(await call(compactPath,runName,{name,eingaben:args}),result);
    const row=result.structuredContent;
    assert.equal(row.status,status);
    assert.equal(row.adapter_im_lieferumfang,included);
    assert.equal(row.adapter_mit_pin_dokumentiert,pin);
    assert.equal(row.quellenmarkt,'DE');
    assert.equal(row.quellen_geprueft_am,'2026-11-22');
    assert.equal(row.citation_url,page);
    assert.equal(row.guide_url,page+'#fritz-302-danfoss-adapter');
    assert.match(row.quellen_url,/^https:\/\/fritz\.com\/apps\/knowledge-base\/fritz-dect-302\/3376_.+\?market=de-de$/);
    assert.equal(row.produkt_url,'https://fritz.com/products/fritz-smart-thermo-302-20003120');
    if(included===null) assert.match(row.naechster_schritt,/Keinen Adapter/);
    assert.doesNotMatch(JSON.stringify(row),/amazon\.de|tag=getecoback-21/);
  }
  for (const args of [{ventil:'danfoss-ra'},{artikelnummer:'20003120',ventil:'34_mm'},{artikelnummer:'20003121',ventil:'danfoss-ra'}]) {
    assert.equal((await call(fullPath,name,args)).isError,true);
  }
  assert.deepEqual(writes,[]);
});

test('the compact finder routes paired cellar conditions to the existing German calculator section',async()=>{
  const {call,writes}=fixture();
  const name='keller_lueften_taupunkt_messwerte';
  const page=origin+'/guide/keller-lueften-sommer.html';
  const ask=async frage=>(await call(compactPath,findName,{frage})).structuredContent.tools[0];
  const best=await ask('Mein Keller hat 16 Grad und 75 %, draußen sind es 8 Grad und 90 %. Soll ich lüften?');
  assert.equal(best.name,name);
  assert.equal(best.citation_url,page);
  assert.equal(best.guide_url,page+'#taupunkt');
  assert.deepEqual(new Set(best.inputSchema.required),new Set(['innen_c','innen_rh_prozent','aussen_c','aussen_rh_prozent','wand_c']));
  assert.equal((await ask('taupunkt_lueften')).name,'taupunkt_lueften');
  assert.equal((await ask('Wie messe ich Luftfeuchtigkeit im Keller?')).name,'keller_hygrometer_anzeige_obere_messgrenze');
  assert.deepEqual(writes,[]);
});
