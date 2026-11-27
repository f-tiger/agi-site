import assert from 'node:assert/strict';
import {test} from 'node:test';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {ensureAccountMembers} from '../functions/api/account-member.js';
import {onRequest as keysApi} from '../functions/api/trade-mcp-keys.js';
import {onRequest as webApi} from '../functions/api/trade-workbench.js';
import {ACCOUNT_COOKIE, ensureAccounts, hash, issueSession, now} from '../lib/free-account.js';
import {recordTradeMcpRun, resolveTradeMcpPrincipal, TRADE_MCP_KEY_LIMITS} from '../lib/trade-mcp-access.mjs';
import {FREE_DAILY_RUNS, MEMBER_DAILY_RUNS, utcDay, workbenchMember, workbenchUsage} from '../lib/trade-workbench-access.mjs';
import {tradeGroups} from '../lib/trade-workbench/engine.mjs';

const origin = 'https://baipiaoji.com';
const tool = tradeGroups[0].tools[0];
const example = {id: tool.id, input: Object.fromEntries(tool.inputs.map(([id,,,,value]) => [id,value]))};

async function fixture(t) {
  const db = database();
  t.after(() => db.sql.close());
  const env = {HITS:db, MEMBER_SITE:'bpj'};
  await ensureAccounts(env);
  async function account(id) {
    const timestamp = now();
    db.sql.prepare('INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated) VALUES(?,?,?,?,?,?)')
      .run(id,id,'fixture-password-hash','fixture-recovery-hash',timestamp,timestamp);
    return `${ACCOUNT_COOKIE}=${await issueSession(env,{id,session_version:1})}`;
  }
  return {db,env,account};
}

function request(path,{cookie, body, host = origin, headers = {}} = {}) {
  return new Request(host+path,{method:body === undefined ? 'GET' : 'POST',
    headers:{...(body === undefined ? {} : {Origin:origin,'Content-Type':'application/json'}),
      ...(cookie ? {Cookie:cookie} : {}), ...headers},
    ...(body === undefined ? {} : {body:JSON.stringify(body)})});
}

const keys = (env,options) => keysApi({env,request:request('/api/trade-mcp-keys',options)});
const issue = (env,cookie,owner='alice') => keys(env,{cookie,body:{action:'create',account_id:owner,label:'Work client'}});

test('browser key management needs the registered account session and exact origin', async t => {
  const {db,env,account} = await fixture(t);
  assert.equal((await keys(env)).status,401);
  const cookie = await account('alice');
  const body = {action:'create',account_id:'alice',label:'Work client'};
  for (const options of [
    {host:'https://www.baipiaoji.com'}, {headers:{Origin:'https://another.example'}},
    {headers:{Origin:''}}, {headers:{'Sec-Fetch-Site':'cross-site'}},
  ]) assert.equal((await keys(env,{cookie,body,...options})).status,403);
  assert.equal((await keys(env,{cookie,body,headers:{Authorization:'Bearer unrelated-key'}})).status,400);
  assert.equal((await keys(env,{cookie,body:{...body,account_id:'another-account'}})).status,409);
  assert.equal((await keys(env,{cookie,body:{...body,label:'0'.repeat(2048)}})).status,400);
  const initial = await keys(env,{cookie});
  assert.equal(initial.status,200);
  assert.equal(initial.headers.get('Cache-Control'),'no-store');
  assert.match(initial.headers.get('X-Robots-Tag'),/noindex/);
  assert.deepEqual(await initial.json(),{ok:true,scope:'trade-tools:run',limits:TRADE_MCP_KEY_LIMITS,keys:[]});
  assert.equal(db.sql.prepare("SELECT name FROM sqlite_master WHERE name='bpj_trade_mcp_keys'").get(),undefined);
});

test('key lifecycle hashes credentials, isolates owners and invalidates stale principals', async t => {
  const {db,env,account} = await fixture(t);
  const alice = await account('alice'), bob = await account('bob');
  const attempts = await Promise.all(Array.from({length:4},()=>issue(env,alice)));
  assert.deepEqual(attempts.map(response=>response.status).sort(),[200,200,200,409]);
  const issued = await attempts.find(response=>response.ok).json();
  assert.match(issued.key,/^bpj_trade_[A-Za-z0-9_-]{43}$/);
  const principal = await resolveTradeMcpPrincipal(db,issued.key,now());
  const found = db.sql.prepare('SELECT token_hash,expires FROM bpj_trade_mcp_keys WHERE id=?').get(principal.keyId);
  assert.equal(found.token_hash,hash(issued.key));
  assert.equal(principal.accountId,'alice');
  assert.equal(await resolveTradeMcpPrincipal(db,issued.key,found.expires),null);
  assert.equal(await resolveTradeMcpPrincipal(db,'bpj_solo_'+issued.key.slice(-43),now()),null);
  const view = await (await keys(env,{cookie:alice})).json();
  assert.equal(view.keys.length,3);
  assert(!JSON.stringify(view).includes(issued.key));
  assert(!JSON.stringify(view).includes(found.token_hash));
  assert.equal((await keys(env,{cookie:bob,body:{action:'revoke',account_id:'bob',id:principal.keyId}})).status,404);
  const command = {action:'rotate',account_id:'alice',id:principal.keyId};
  const rotations = await Promise.all([keys(env,{cookie:alice,body:command}),keys(env,{cookie:alice,body:command})]);
  assert.deepEqual(rotations.map(response=>response.status).sort(),[200,404]);
  const rotated = await rotations.find(response=>response.ok).json();
  assert.notEqual(rotated.key,issued.key);
  assert.equal(await resolveTradeMcpPrincipal(db,issued.key,now()),null);
  assert.equal(await recordTradeMcpRun(db,principal,false,now()),null);
  const replacement = await resolveTradeMcpPrincipal(db,rotated.key,now());
  assert.notEqual(replacement.keyId,principal.keyId);
  assert.equal((await keys(env,{cookie:alice,body:{action:'revoke',account_id:'alice',id:replacement.keyId}})).status,200);
  assert.equal(await resolveTradeMcpPrincipal(db,rotated.key,now()),null);
  assert.equal(await recordTradeMcpRun(db,replacement,false,now()),null);

  const other = await (await issue(env,alice)).json();
  const beforeReset = await resolveTradeMcpPrincipal(db,other.key,now());
  db.sql.prepare("UPDATE free_accounts SET session_version=2 WHERE id='alice'").run();
  assert.equal((await keys(env,{cookie:alice})).status,401);
  assert.equal(await resolveTradeMcpPrincipal(db,other.key,now()),null);
  assert.equal(await recordTradeMcpRun(db,beforeReset,false,now()),null);
});

test('a failed key-list read cannot obscure a newly issued or rotated credential', async t => {
  const {db,env,account} = await fixture(t);
  const cookie = await account('alice');
  const prepare = db.prepare;
  t.mock.method(db,'prepare',query=>{
    if (query.includes('SELECT k.id,k.label,k.created,k.expires')) throw Error('temporary key-list read failure');
    return prepare.call(db,query);
  });
  const issued = await (await issue(env,cookie)).json();
  assert.equal(issued.scope,'trade-tools:run');
  assert.deepEqual(issued.limits,TRADE_MCP_KEY_LIMITS);
  assert.equal((await keys(env,{cookie})).status,503);
  const old = await resolveTradeMcpPrincipal(db,issued.key,now());
  const rotated = await keys(env,{cookie,body:{action:'rotate',account_id:'alice',id:old.keyId}});
  assert.equal(rotated.status,200);
  assert.match((await rotated.json()).key,/^bpj_trade_[A-Za-z0-9_-]{43}$/);
  assert.equal(await resolveTradeMcpPrincipal(db,issued.key,now()),null);
});

test('web and parallel MCP keys share the daily account allowance and recheck member entitlement', async t => {
  const {db,env,account} = await fixture(t);
  const alice = await account('alice');
  const tokens = await Promise.all([issue(env,alice),issue(env,alice)]);
  const time = now();
  const principals = await Promise.all(tokens.map(async response=>resolveTradeMcpPrincipal(db,(await response.json()).key,time)));
  const webRun = await webApi({env,request:request('/api/trade-workbench',{cookie:alice,body:example})});
  assert.equal(webRun.status,200);
  assert.equal((await webRun.json()).remaining,FREE_DAILY_RUNS-1);
  const regular = await Promise.all(Array.from({length:FREE_DAILY_RUNS+2},(_,i)=>recordTradeMcpRun(db,principals[i%2],false,time)));
  assert.equal(regular.filter(Boolean).length,FREE_DAILY_RUNS-1);
  assert.equal(await workbenchUsage(db,'alice',utcDay(time)),FREE_DAILY_RUNS);
  assert.equal((await webApi({env,request:request('/api/trade-workbench',{cookie:alice,body:example})})).status,429);

  await ensureAccountMembers(env);
  db.sql.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').run('member','member-hash',time,time+86400);
  db.sql.prepare('INSERT INTO bpj_account_members(account_id,member_id,created) VALUES(?,?,?)').run('alice','member',time);
  assert.equal(await workbenchMember(db,'alice',time),true);
  const remaining = MEMBER_DAILY_RUNS-FREE_DAILY_RUNS;
  const paid = await Promise.all(Array.from({length:remaining+1},(_,i)=>recordTradeMcpRun(db,principals[i%2],true,time)));
  assert.equal(paid.filter(Boolean).length,remaining);
  assert.equal(await workbenchUsage(db,'alice',utcDay(time)),MEMBER_DAILY_RUNS);
  db.sql.prepare("UPDATE wb_members SET suspended=1 WHERE id='member'").run();
  const nextDay = time+86400;
  assert.equal(await recordTradeMcpRun(db,principals[0],true,nextDay),null);
  assert.equal((await recordTradeMcpRun(db,principals[0],false,nextDay)).runs,1);
});
