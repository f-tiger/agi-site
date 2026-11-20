import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import worker from '../src/cached-worker.mjs';
import {collectToolPages, MCP_PAGE_SIZE} from '../src/mcp-pagination.mjs';

const origin = 'https://getecoback.com';
const fullPath = '/mcp/v1';
const compactPath = '/mcp/v1?profile=compact';
const findName = 'ecoback_werkzeug_finden';
const runName = 'ecoback_werkzeug_ausfuehren';
const cellarName = 'kellerentfeuchter_pruefpunkt_abgleichen';
const cellarUri = 'ecoback://evidence/de/kellerentfeuchter';
const drainName = 'entfeuchter_ablaufcheck';
const cellarQuestion = 'Was leisten Comfee MDDF-20DEN7 und Meaco Arete One 20L bei 10 °C und 60 % im Keller?';
const cellarInputs = {modell:'meaco-one-20',temperatur_c:10,relative_feuchte_pct:60,wiederholt_gemessen:true,befund:'feuchte_auffaellig'};
const humanUA = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/142.0';
const ciUA = 'getecoback-ci/compact';
const {name: registryName,version} = JSON.parse(readFileSync(new URL('../mcp/server.json',import.meta.url),'utf8'));

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
  assert.deepEqual(compact,full);
  assert.equal(compact.isError,false);
  assert.equal(compact.structuredContent.status,'hersteller_pruefpunkt');
  assert.equal(writes.length,1);
  const {sql,args:[event,metadata]} = writes[0];
  assert.match(sql,/INSERT INTO ev\b/);
  assert.equal(event,'mcp_call');
  assert.equal(JSON.parse(metadata).tool,cellarName);
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
});

test('header, query, privacy and CI probes return the same result with zero writes', async () => {
  const {call,writes} = fixture();
  const args = {name:cellarName,eingaben:cellarInputs};
  const headers = {'user-agent':humanUA};
  const expected = await call(fullPath,cellarName,cellarInputs);
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
