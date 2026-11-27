import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import worker, {MCP_SERVER_INFO, MCP_TOOLS} from './index.js';
import {mcpUsageResponse} from './mcp-usage.mjs';

const origin = 'https://agiscorecard.com';
const version = '2026-07-28';
const serverInfoKey = 'io.modelcontextprotocol/serverInfo';
const versionKey = 'io.modelcontextprotocol/protocolVersion';
const capabilitiesKey = 'io.modelcontextprotocol/clientCapabilities';
const clientKey = 'io.modelcontextprotocol/clientInfo';

function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE events(ts, day, name, location, label, path, ua_class)');
  const tasks = [];
  const env = {
    EVENTS:{prepare(query) {
      const statement = sql.prepare(query);
      return {bind(...args) { return {
        run:async () => statement.run(...args), all:async () => ({results:statement.all(...args)}),
      }; }};
    }},
    ASSETS:{async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === '/data.json') return Response.json({dateModified:'2026-10-01', predictions:[{id:'sample'}]});
      if (path === '/grader-consensus.json') return Response.json({reported:[{quote:'Third-party quotation'}]});
      if (path === '/search-index.json') return Response.json([{t:'Example', d:'Fictional sample', u:'/example'}]);
      throw new Error('Data unavailable');
    }},
  };
  async function post(method, params = {}, {modern = false, requested = version, headers = {}, path = '/mcp', id = 1} = {}) {
    const metadata = modern ? {_meta:{[versionKey]:requested, [capabilitiesKey]:{}, [clientKey]:{name:'Claude Code',version:'1.0'}}} : {};
    const modernHeaders = modern ? {'MCP-Protocol-Version':requested,'Mcp-Method':method,
      ...(method === 'tools/call' ? {'Mcp-Name':params.name} : {})} : {};
    const req = new Request(origin + path, {method:'POST', headers:{'Content-Type':'application/json',...modernHeaders,...headers},
      body:JSON.stringify({jsonrpc:'2.0', ...(id === undefined ? {} : {id}), method, params:{...metadata,...params}})});
    const response = await worker.fetch(req, env, {waitUntil(task) { tasks.push(task); }});
    await Promise.all(tasks.splice(0));
    return {status:response.status, headers:response.headers, body:response.status === 202 ? null : await response.json()};
  }
  return {env, post, sql};
}

test('AGI exposes stateless discovery, stable registered identity and all legacy tools', async () => {
  const {post} = fixture();
  const discovery = await post('server/discover', {}, {modern:true});
  assert.equal(discovery.status, 200);
  assert.equal(discovery.headers.get('cache-control'), 'no-store');
  assert.deepEqual(discovery.body.result._meta[serverInfoKey], MCP_SERVER_INFO);
  assert.deepEqual(MCP_SERVER_INFO, {name:'com.agiscorecard/agi-scorecard',version:'1.0.0',websiteUrl:origin});
  assert.equal(discovery.body.result.resultType, 'complete');
  assert.deepEqual(discovery.body.result.supportedVersions, [version, '2025-11-25', '2025-06-18', '2025-03-26']);
  assert.match(discovery.body.result.instructions, /third-party|independent graders/);
  const modern = await post('tools/list', {}, {modern:true});
  const legacy = await post('tools/list');
  assert.equal(legacy.body.result.tools.length, 9);
  assert.deepEqual(modern.body.result.tools, legacy.body.result.tools);
  assert.deepEqual(modern.body.result.tools, MCP_TOOLS);
  assert.ok(modern.body.result.tools.every(tool => tool.annotations.readOnlyHint));
  for (const [requested, expected] of [['2025-11-25','2025-11-25'], ['2025-06-18','2025-06-18'],
    ['2025-03-26','2025-03-26'], ['2099-01-01','2025-11-25'], [version,'2025-11-25']]) {
    const setup = await post('initialize', {protocolVersion:requested});
    assert.equal(setup.body.result.protocolVersion, expected);
    assert.deepEqual(setup.body.result.serverInfo, MCP_SERVER_INFO);
  }
  assert.equal((await post('notifications/initialized', {}, {id:null})).status, 202);
});

test('AGI validates modern protocol headers, metadata, versions and Origin', async () => {
  const {post} = fixture();
  const unsupported = await post('server/discover', {}, {modern:true,requested:'2099-01-01'});
  assert.equal(unsupported.status, 400);
  assert.equal(unsupported.body.error.code, -32022);
  assert.equal(unsupported.body.error.data.requested, '2099-01-01');
  assert.equal((await post('server/discover')).body.error.code, -32602);
  const mismatch = await post('tools/call', {name:'get_verdicts'}, {modern:true,headers:{'Mcp-Name':'get_thesis_tracker'}});
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.error.code, -32020);
  assert.equal((await post('custom/unknown', {}, {modern:true})).status, 404);
  assert.equal((await post('tools/list', {}, {modern:true,headers:{Origin:'https://unlisted.example'}})).status, 403);
  assert.equal((await post('tools/list', {}, {modern:true,headers:{Origin:'https://claude.ai'}}))
    .headers.get('access-control-allow-origin'), 'https://claude.ai');
});

test('AGI records fixed outcomes and caller signals while excluding QA/privacy and raw inputs', async () => {
  const {post, sql} = fixture();
  const sample = {name:'search_site',arguments:{query:'Fictional sample in a customer document'}};
  const result = await post('tools/call', sample, {modern:true});
  assert.equal(result.status, 200);
  assert.equal(result.body.result.isError, false);
  assert.equal(result.body.result.resultType, 'complete');
  assert.equal((await post('tools/call', {name:'search_site',arguments:null}, {modern:true})).body.error.code, -32602);
  await post('tools/call', {name:'get_thesis_tracker'}, {headers:{'user-agent':'Cursor/1.0'}});
  await post('tools/call', sample, {headers:{'user-agent':'MCP indexer/1.0'}});
  await post('tools/call', sample, {headers:{'user-agent':'curl/1.0'}});
  await post('tools/call', sample, {path:'/mcp?demo=1'});
  await post('tools/call', sample, {path:'/mcp?__ci=1'});
  await post('tools/call', sample, {headers:{'user-agent':'agi-site-deploy-selfcheck/1.0'}});
  await post('tools/call', sample, {headers:{DNT:'1'}});
  await post('tools/call', sample, {headers:{'Sec-GPC':'1'}});
  await post('tools/call', {name:'arbitrary private input'});
  assert.deepEqual(sql.prepare('SELECT name,label,ua_class FROM events ORDER BY rowid').all().map(Object.values), [
    ['mcp_tool_completed','tool:search_site','client_info:claude'],
    ['mcp_tool_invalid_input','tool:search_site','client_info:claude'],
    ['mcp_tool_unavailable','tool:get_thesis_tracker','user_agent:cursor'],
    ['mcp_tool_completed','tool:search_site','indexer'],
    ['mcp_tool_completed','tool:search_site','operator'],
    ['mcp_tool_completed','tool:search_site','demo_or_probe'],
  ]);
  const verdict = await post('tools/call', {name:'get_verdicts'}, {modern:true,path:'/mcp?__ci=1'});
  const data = JSON.parse(verdict.body.result.content[0].text);
  assert.match(data.license_scope, /independent grades/);
  assert.ok(data.independent_grades);
});

test('AGI usage aggregate covers 28 complete dates and drops legacy and unknown groups', async () => {
  const {env,sql} = fixture();
  const insert = sql.prepare("INSERT INTO events VALUES (0, ?, ?, 'mcp', ?, '/mcp', ?)");
  for (const day of ['2026-10-29', '2026-10-30', '2026-11-26', '2026-11-27']) {
    insert.run(day, 'mcp_tool_completed', 'tool:search_site', 'client_info:claude');
  }
  insert.run('2026-11-26', 'site_search', 'sensitive older label', 'bot');
  insert.run('2026-11-26', 'mcp_tool_completed', 'tool:unexpected private value', 'unknown');
  insert.run('2026-11-26', 'mcp_tool_completed', 'tool:search_site', 'unknown private value');
  const res = await mcpUsageResponse(env.EVENTS, new Set(['search_site']), new Date('2026-11-27T12:00:00Z'));
  const result = await res.json();
  assert.deepEqual(result.window, {start:'2026-10-30',end_exclusive:'2026-11-27',days:28,timezone:'UTC'});
  assert.deepEqual(result.groups.map(group => [group.day,group.calls]), [['2026-10-30',1],['2026-11-26',1]]);
  assert.equal(result.authenticated_principals, null);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
  assert.ok(!JSON.stringify(result).includes('private value'));
  assert.equal((await mcpUsageResponse(null, new Set())).status, 503);
});
