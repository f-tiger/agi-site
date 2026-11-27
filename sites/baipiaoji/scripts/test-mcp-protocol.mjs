import assert from 'node:assert/strict';
import test from 'node:test';
import {onRequestPost as directory, onRequestGet as directoryGet, onRequestOptions as directoryOptions} from '../functions/api/mcp.js';
import {onRequest as aiTools} from '../functions/api/ai-mcp.js';
import {onRequest as startup} from '../functions/api/startup-mcp.js';
import {onRequest as trade} from '../functions/api/trade-mcp.js';
import {onRequest as video} from '../functions/api/video-mcp.js';

const site = 'https://baipiaoji.com';
const modern = '2026-07-28';
const identity = 'io.modelcontextprotocol/serverInfo';
const clientInfo = {name:'bpj-protocol-test', version:'1'};
const legacy = '2025-11-25';
const servers = [
  ['mcp',directory,'baipiaoji-verified-ai-free-tiers','2025-03-26',16],
  ['ai-mcp',aiTools,'bpj-ai-tools','2025-06-18',40],
  ['startup-mcp',startup,'bpj-startup-research',legacy,5],
  ['trade-mcp',trade,'io.github.f-tiger/bpj-trade-tools',legacy,3],
  ['video-mcp',video,'io.github.f-tiger/bpj-video-tools',legacy,3],
];

function modernRequest(method, params = {}, version = modern) {
  const name = method === 'resources/read' ? params.uri : params.name;
  return {
    body: {jsonrpc:'2.0', id:'contract', method, params:{...params,_meta:{
      'io.modelcontextprotocol/protocolVersion':version,
      'io.modelcontextprotocol/clientCapabilities':{},
      'io.modelcontextprotocol/clientInfo':clientInfo,
    }}},
    headers: {'MCP-Protocol-Version':version,'Mcp-Method':method,...(name?{'Mcp-Name':name}:{})},
  };
}

function request(path, body, headers = {}, method = 'POST') {
  return new Request(site+'/api/'+path+'?__probe=1', {
    method,
    headers:{Accept:'application/json, text/event-stream','Content-Type':'application/json',...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
}

async function rpc(path, handler, body, headers, env = {}) {
  const response = await handler({request:request(path,body,headers),env});
  return {status:response.status, body:response.status===202?null:await response.json(), headers:response.headers};
}

for (const [path,handler,serverName,legacyVersion,count] of servers) {
  test(path+' advertises modern MCP and safely negotiates legacy capability', async () => {
    const discover = modernRequest('server/discover');
    const read = await rpc(path,handler,discover.body,discover.headers);
    assert.equal(read.status,200);
    assert.equal(read.body.id,'contract');
    const {result} = read.body;
    assert.equal(result.resultType,'complete');
    assert.equal(result._meta[identity].name,serverName);
    assert.equal(result.supportedVersions[0],modern);
    assert(result.supportedVersions.includes(legacyVersion));
    assert.deepEqual(result.capabilities.tools,{listChanged:false});
    assert.equal(result.ttlMs,0);
    assert.equal(result.cacheScope,'public');

    const listing = modernRequest('tools/list');
    const list = (await rpc(path,handler,listing.body,listing.headers)).body.result;
    assert.equal(list.resultType,'complete');
    assert.equal(list.cacheScope,'public');
    assert.equal(list.tools.length,count);
    assert.equal(list._meta[identity].name,serverName);
    if (path==='ai-mcp') {
      assert(list.nextCursor);
      const next = modernRequest('tools/list',{cursor:list.nextCursor});
      const page = (await rpc(path,handler,next.body,next.headers)).body.result;
      assert.equal(page.tools.length,count);
      assert.notEqual(page.tools[0].name,list.tools[0].name);
      assert.equal(page.cacheScope,list.cacheScope);
    }

    const initialize = await rpc(path,handler,{jsonrpc:'2.0',id:10,method:'initialize',
      params:{protocolVersion:legacy,clientInfo,capabilities:{}}});
    assert.equal(initialize.status,200);
    assert.equal(initialize.body.result.protocolVersion,legacyVersion);
    assert.equal(initialize.body.result.serverInfo.name,serverName);
    assert.equal(initialize.body.result.resultType,undefined);
    const headers = {'MCP-Protocol-Version':legacyVersion};
    const notice = await rpc(path,handler,{jsonrpc:'2.0',method:'notifications/initialized'},headers);
    assert.equal(notice.status,202);
    const oldList = await rpc(path,handler,{jsonrpc:'2.0',id:11,method:'tools/list'},headers);
    assert.equal(oldList.body.result.tools.length,count);
    assert.equal(oldList.body.result.resultType,undefined);
  });

  test(path+' rejects unmatched headers, unsupported versions and unknown modern RPCs', async () => {
    const list = modernRequest('tools/list');
    const noVersion = {...list.headers};
    delete noVersion['MCP-Protocol-Version'];
    for (const headers of [noVersion,{...list.headers,'Mcp-Method':'tools/call'}]) {
      const failure = await rpc(path,handler,list.body,headers);
      assert.equal(failure.status,400);
      assert.equal(failure.body.error.code,-32020);
    }
    const malformed = await rpc(path,handler,{...list.body,params:{}},list.headers);
    assert.equal(malformed.status,400);
    assert.equal(malformed.body.error.code,-32602);

    const future = modernRequest('tools/list',{},'2099-01-01');
    const unsupported = await rpc(path,handler,future.body,future.headers);
    assert.equal(unsupported.status,400);
    assert.equal(unsupported.body.error.code,-32022);
    assert(unsupported.body.error.data.supported.includes(modern));
    assert.equal(unsupported.body.error.data.requested,'2099-01-01');

    const missing = modernRequest('unrecognised/method');
    const notFound = await rpc(path,handler,missing.body,missing.headers);
    assert.equal(notFound.status,404);
    assert.equal(notFound.body.error.code,-32601);
    const call = modernRequest('tools/call',{name:'tool_name',arguments:{}});
    const badName = await rpc(path,handler,call.body,{...call.headers,'Mcp-Name':'other_name'});
    assert.equal(badName.status,400);
    assert.equal(badName.body.error.code,-32020);
  });
}

test('directory denies foreign Origin before reading requests, including webhook tool metadata', async () => {
  const origin = {Origin:'https://unrelated.example'};
  for (const [handler,method] of [[directory,'POST'],[directoryGet,'GET'],[directoryOptions,'OPTIONS']]) {
    const blocked = await handler({request:request('mcp',undefined,origin,method),env:{}});
    assert.equal(blocked.status,403);
    assert.equal(blocked.headers.has('Access-Control-Allow-Origin'),false);
  }
  const options = await directoryOptions({request:request('mcp',undefined,{Origin:site},'OPTIONS')});
  assert.equal(options.status,204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'),site);
  assert.match(options.headers.get('Access-Control-Allow-Headers'),/Mcp-Name/);
  const get = await directoryGet({request:request('mcp',undefined,{},'GET')});
  assert.equal(get.status,405);
  const list = modernRequest('tools/list');
  const {body} = await rpc('mcp',directory,list.body,list.headers);
  assert.equal(body.result.tools.find(tool=>tool.name==='watch_free_tier_changes').annotations.readOnlyHint,false);
});

test('modern directory resources and native calculator return useful protocol results', async () => {
  const uri = 'baipiaoji://limits';
  const read = modernRequest('resources/read',{uri});
  read.headers['Mcp-Name'] = '=?base64?'+Buffer.from(uri).toString('base64')+'?=';
  const {body} = await rpc('mcp',directory,read.body,read.headers,{ASSETS:{fetch:async url=>{
    assert.equal(url.pathname,'/en/limits.json');
    return Response.json({source:'fixture'});
  }}});
  assert.equal(body.result.resultType,'complete');
  assert.equal(body.result.ttlMs,0);
  assert.deepEqual(JSON.parse(body.result.contents[0].text),{source:'fixture'});

  const call = modernRequest('tools/call',{name:'bpj_gross_margin',arguments:{revenue:100,cost:60}});
  const quote = await rpc('ai-mcp',aiTools,call.body,call.headers);
  assert.equal(quote.status,200);
  assert.equal(quote.body.result.resultType,'complete');
  assert.equal(quote.body.result.structuredContent.grossProfit,40);
  assert.equal(quote.body.result.ttlMs,undefined);
});

test('modern startup and trade metadata do not grant tool access', async () => {
  for (const [path,handler,name] of [['startup-mcp',startup,'search_startup_cases'],['trade-mcp',trade,'list_trade_tools']]) {
    const call = modernRequest('tools/call',{name,arguments:{}});
    const blocked = await rpc(path,handler,call.body,call.headers);
    assert.equal(blocked.status,401);
    assert.match(blocked.headers.get('WWW-Authenticate'),/^Bearer\b/);
  }
});
