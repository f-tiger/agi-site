import assert from 'node:assert/strict';
import {test} from 'node:test';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {onRequest as accountApi} from '../functions/api/account.js';
import {ensureAccountMembers} from '../functions/api/account-member.js';
import {onRequest as keysApi} from '../functions/api/trade-mcp-keys.js';
import {onRequest as mcp} from '../functions/api/trade-mcp.js';
import {onRequest as web} from '../functions/api/trade-workbench.js';
import {ACCOUNT_COOKIE, now} from '../lib/free-account.js';
import {TRADE_MCP_DOCS, TRADE_MCP_PROTOCOLS, TRADE_MCP_SERVER_NAME, TRADE_MCP_TOOLS,
  TRADE_MCP_VERSION, getTradeTool, listTradeTools, runTradeTool, validateTradeMcpArgs} from '../lib/trade-mcp-tools.mjs';
import {FREE_DAILY_RUNS, MEMBER_DAILY_RUNS} from '../lib/trade-workbench-access.mjs';
import {getTool} from '../lib/trade-workbench/engine.mjs';

const site = 'https://baipiaoji.com';
const sampleId = 'hs-six-digit-comparison';
const sample = {id:sampleId,input:getTradeTool({id:sampleId,lang:'en'}).example.input};
const toolNames = ['list_trade_tools','get_trade_tool','run_trade_tool'];
const request = (path, payload, headers = {}) => new Request(site+path,{
  method:payload === undefined ? 'GET' : 'POST', headers:{Origin:site,'Content-Type':'application/json',...headers},
  ...(payload === undefined ? {} : {body:JSON.stringify(payload)}),
});

function rpc(env, method, params = {}, {id = 1, headers = {}, bearer} = {}) {
  const body = {jsonrpc:'2.0',method,params,...(id === null ? {} : {id})};
  return mcp({env,request:request('/api/trade-mcp',body,{
    Accept:'application/json, text/event-stream',...(bearer ? {Authorization:'Bearer '+bearer} : {}),...headers,
  })});
}

function call(env, name, args, options) {
  return rpc(env,'tools/call',{name,arguments:args},options);
}

async function userFixture(t) {
  const db = database(), env = {HITS:db,MEMBER_SITE:'bpj'};
  t.after(()=>db.sql.close());
  const register = await accountApi({env,request:request('/api/account',{
    action:'register',username:'trade_mcp_fixture',email:'trade-mcp-fixture@example.test',
    password:'synthetic-trade-fixture-2026',consent:true,qa:true,
  },{'CF-Connecting-IP':'192.0.2.62'})});
  assert.equal(register.status,200);
  const {user} = await register.json();
  assert.equal(user.email_verified,false);
  const Cookie = register.headers.get('Set-Cookie').split(';')[0];
  async function issue(label) {
    const response = await keysApi({env,request:request('/api/trade-mcp-keys',{action:'create',account_id:user.id,label},{Cookie})});
    assert.equal(response.status,200);
    const {key} = await response.json();
    assert.match(key,/^bpj_trade_[A-Za-z0-9_-]{43}$/);
    return key;
  }
  const runWeb = payload => web({env,request:request('/api/trade-workbench',payload,{Cookie})});
  return {db,env,user,Cookie,issue,runWeb};
}

async function structured(response) {
  assert.equal(response.status,200);
  const {result} = await response.json();
  assert(!result.isError);
  assert.deepEqual(JSON.parse(result.content[0].text),result.structuredContent);
  return result.structuredContent;
}

test('anonymous MCP discovery is stateless and shows only method definitions', async () => {
  const env = {get HITS(){throw Error('public discovery must not touch the database');}};
  const params = {protocolVersion:TRADE_MCP_PROTOCOLS[0],capabilities:{},clientInfo:{name:'local-check',version:'1'}};
  const init = await rpc(env,'initialize',params);
  const {result} = await init.json();
  assert.equal(init.status,200);
  assert.deepEqual(result.serverInfo,{name:TRADE_MCP_SERVER_NAME,version:TRADE_MCP_VERSION});
  assert(result.instructions.includes(TRADE_MCP_DOCS));
  assert.equal(init.headers.get('MCP-Session-Id'),null);
  const old = await (await rpc(env,'initialize',{...params,protocolVersion:TRADE_MCP_PROTOCOLS.at(-1)})).json();
  assert.equal(old.result.protocolVersion,TRADE_MCP_PROTOCOLS.at(-1));

  const tools = await rpc(env,'tools/list',{}, {headers:{Cookie:'cf_clearance=local'}});
  assert.equal(tools.headers.get('Cache-Control'),'no-store');
  assert.equal(tools.headers.get('X-Robots-Tag'),'noindex');
  assert.equal(tools.headers.get('Access-Control-Allow-Origin'),null);
  assert.deepEqual((await tools.json()).result.tools.map(tool=>tool.name),toolNames);
  const notification = await rpc(env,'notifications/initialized',{}, {id:null});
  assert.equal(notification.status,202);
  assert.equal(await notification.text(),'');
  for (const name of toolNames) {
    const blocked = await call(env,name,{});
    assert.equal(blocked.status,401);
    assert.equal(blocked.headers.get('WWW-Authenticate'),'Bearer realm="bpj-trade-mcp"');
    assert.deepEqual(await blocked.json(),{error:'trade_key_required',docs:TRADE_MCP_DOCS});
  }
});

test('transport rejects other origins, unsupported shapes, and ambiguous account credentials', async () => {
  const env = {};
  for (const headers of [{Origin:'null'},{Origin:''},{Origin:'https://other.example'},{'Sec-Fetch-Site':'cross-site'}]) {
    assert.equal((await rpc(env,'tools/list',{}, {headers})).status,403);
  }
  const requestNative = new Request(site+'/api/trade-mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"jsonrpc":"2.0","id":1,"method":"tools/list"}'});
  assert.equal((await mcp({env,request:requestNative})).status,200);
  assert.equal((await mcp({env,request:new Request('https://www.baipiaoji.com/api/trade-mcp')})).status,403);
  assert.equal((await rpc(env,'tools/list',{}, {headers:{'MCP-Protocol-Version':'future'}})).status,400);
  assert.equal((await rpc(env,'tools/list',{}, {headers:{Accept:'text/event-stream'}})).status,406);
  assert.equal((await rpc(env,'tools/list',{}, {headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await rpc(env,'tools/list',{}, {headers:{'Content-Length':'17000'}})).status,413);
  assert.equal((await rpc(env,'tools/list',{fixture:'x'.repeat(17_000)})).status,413);
  assert.equal((await mcp({env,request:request('/api/trade-mcp',[{jsonrpc:'2.0',method:'tools/list',id:1}])})).status,400);
  assert.equal((await mcp({env,request:request('/api/trade-mcp')})).headers.get('Allow'),'POST');
  const cookie = {Cookie:ACCOUNT_COOKIE+'='+'a'.repeat(43)};
  const bearer = 'bpj_trade_'+'a'.repeat(43);
  assert.equal((await call(env,'run_trade_tool',sample,{headers:cookie,bearer})).status,400);
  assert.equal((await call(env,'get_trade_tool',{id:sampleId},{headers:cookie})).status,401);
});

test('all 100 bilingual trade entries are discoverable with exact engine-backed schemas, examples and evidence', () => {
  for (const lang of ['zh','en']) {
    const all = [];
    for (let cursor = '0'; cursor !== undefined;) {
      const page = listTradeTools(validateTradeMcpArgs('list_trade_tools',{lang,cursor,limit:20}));
      assert.equal(page.total,100);
      all.push(...page.tools);
      cursor = page.nextCursor;
    }
    assert.equal(new Set(all.map(x=>x.id)).size,100);
    for (const {id} of all) {
      const detail = getTradeTool({id,lang});
      assert.equal(detail.tool.url,site+(lang === 'en' ? '/en' : '')+'/studio/trade-tools/'+id);
      assert.match(detail.tool.source.url,/^https:\/\//);
      assert(detail.tool.source.name && detail.tool.scope);
      assert.equal(detail.inputSchema.additionalProperties,false);
      assert.deepEqual(detail.inputSchema.required,Object.keys(detail.example.input));
      const actual = runTradeTool({id,input:detail.example.input,lang});
      assert.deepEqual(actual.rows,detail.example.rows);
      assert(actual.rows.every(({label,value})=>label&&(Number.isFinite(value)||typeof value === 'string')));
    }
  }
  const found = listTradeTools({lang:'zh',group:'customs',query:'六位',limit:20});
  assert(found.tools.some(tool=>tool.id===sampleId));
  assert.throws(()=>validateTradeMcpArgs('list_trade_tools',{cursor:'101'}),RangeError);
  assert.throws(()=>validateTradeMcpArgs('get_trade_tool',{id:sampleId,format:'csv'}),RangeError);
  assert.equal(TRADE_MCP_TOOLS.at(-1).annotations.idempotentHint,false);
});

test('registered keys and web runs share one account allowance; discovery and invalid inputs do not spend it', async t => {
  t.mock.method(Date,'now',()=>Date.parse('2026-11-27T23:50:00Z'));
  const {db,env,user,issue,runWeb} = await userFixture(t);
  const first = await issue('Client 1'), second = await issue('Client 2');
  const listed = await structured(await call(env,'list_trade_tools',{group:'fx',limit:4},{bearer:first}));
  assert.equal(listed.tools.length,4);
  assert(listed.tools.every(tool=>tool.group.id === 'fx'));
  const detailed = await structured(await call(env,'get_trade_tool',{id:sampleId,lang:'zh'},{bearer:first}));
  assert.equal(detailed.tool.id,sampleId);
  assert.equal((await (await call(env,'run_trade_tool',{id:sampleId,input:{sensitive_fixture:'not echoed'}},{bearer:first})).json()).result.isError,true);
  assert.equal(db.sql.prepare("SELECT name FROM sqlite_schema WHERE name='bpj_trade_workbench_daily'").get(),undefined);

  const batch = await Promise.all(Array.from({length:FREE_DAILY_RUNS+5},(_,i)=>i%3 === 0 ? runWeb(sample) :
    call(env,'run_trade_tool',sample,{bearer:i%3===1 ? first : second})));
  assert.equal(batch.filter(response=>response.status===200).length,FREE_DAILY_RUNS);
  assert.equal(batch.filter(response=>response.status===429).length,5);
  const exhausted = await call(env,'run_trade_tool',sample,{bearer:first});
  assert.equal(exhausted.status,429);
  assert.equal(exhausted.headers.get('Retry-After'),'600');
  assert.equal(db.sql.prepare('SELECT runs FROM bpj_trade_workbench_daily WHERE account_id=?').get(user.id).runs,FREE_DAILY_RUNS);

  Date.now.mock.mockImplementation(()=>Date.parse('2026-11-28T00:00:01Z'));
  const run = await structured(await call(env,'run_trade_tool',{...sample,lang:'zh'},{bearer:second,headers:{Cookie:'cf_clearance=local'}}));
  assert.deepEqual(run.quota,{access:'free',limit:FREE_DAILY_RUNS,remaining:FREE_DAILY_RUNS-1,resets_at:'2026-11-29T00:00:00.000Z'});
  assert.deepEqual(run.rows,detailed.example.rows);
  assert(!JSON.stringify(run).includes(first) && !JSON.stringify(run).includes(second) && !JSON.stringify(run).includes(user.id));
});

test('active linked membership grants 100 shared runs; an in-flight revocation returns no result or charge', async t => {
  const {db,env,user,issue} = await userFixture(t);
  await ensureAccountMembers(env);
  const time = now(), bearer = await issue('MCP member client');
  db.sql.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').run('member-1','fixture-hash',time,time+3600);
  db.sql.prepare('INSERT INTO bpj_account_members(account_id,member_id,created) VALUES(?,?,?)').run(user.id,'member-1',time);
  const run = await structured(await call(env,'run_trade_tool',sample,{bearer}));
  assert.equal(run.quota.limit,MEMBER_DAILY_RUNS);
  assert.equal(run.quota.remaining,MEMBER_DAILY_RUNS-1);

  const tool = getTool(sampleId), original = tool.run;
  t.mock.method(tool,'run',input=>{
    db.sql.prepare('DELETE FROM bpj_trade_mcp_keys WHERE account_id=?').run(user.id);
    return original(input);
  });
  const blocked = await call(env,'run_trade_tool',sample,{bearer});
  assert.equal(blocked.status,401);
  assert.equal((await blocked.json()).error,'trade_key_required');
  assert.equal(db.sql.prepare('SELECT runs FROM bpj_trade_workbench_daily WHERE account_id=?').get(user.id).runs,1);
});
