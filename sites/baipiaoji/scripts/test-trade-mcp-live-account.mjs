// End-to-end production QA using the site's excluded, disposable account type.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

if (!process.argv.includes('--run-production-qa')) throw Error('Explicit production QA mode is required');

const origin = 'https://baipiaoji.com';
const username = 'qa_trade_' + randomBytes(8).toString('hex');
const email = username + '@example.invalid';
const password = randomBytes(24).toString('base64url');
const toolId = 'fx-bank-quote-unit';
let owner, cookie, removed = false;

async function request(path, payload, {session = '', bearer = '', browser = false} = {}) {
  const response = await fetch(origin + path, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: {
      'User-Agent': 'bpj-ci-selftest',
      ...(browser ? {Origin:origin} : {}),
      ...(session ? {Cookie:session} : {}),
      ...(bearer ? {Authorization:'Bearer '+bearer} : {}),
      ...(payload === undefined ? {} : {'Content-Type':'application/json'}),
    },
    ...(payload === undefined ? {} : {body:JSON.stringify(payload)}),
    redirect:'error', signal:AbortSignal.timeout(20000),
  });
  return {response, data:await response.json()};
}

const account = (action, fields, session = cookie) => request('/api/account', {action,...fields}, {session,browser:true});
const manage = (action, fields = {}) => request('/api/trade-mcp-keys', {action,account_id:owner,...fields}, {session:cookie,browser:true});
const keys = () => request('/api/trade-mcp-keys', undefined, {session:cookie,browser:true});
const web = payload => request('/api/trade-workbench', payload, {session:cookie,browser:true});
const call = (bearer, name, args) => request('/api/trade-mcp?__probe=1', {jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}}, {bearer});
const takeCookie = response => (response.headers.get('set-cookie') || '').split(';')[0];
const validKey = value => typeof value === 'string' && /^bpj_trade_[A-Za-z0-9_-]{43}$/.test(value);

async function cleanup() {
  if (!cookie) {
    const login = await account('login', {email,password}, '');
    if (!login.response.ok) return !owner && login.response.status === 401;
    owner ||= login.data.user?.id;
    cookie = takeCookie(login.response);
  }
  if (!owner || !cookie) return false;
  const deletion = await account('delete_account', {account_id:owner,password,confirm:true});
  return deletion.response.ok;
}

try {
  const guest = await request('/api/trade-workbench',undefined,{browser:true});
  assert.equal(guest.response.status,200,'Guest status is live');
  assert.equal(guest.data.access,'guest');
  assert.equal(guest.data.limit,2,'Web guest uses the two-run daily trial');
  assert([0,1,2].includes(guest.data.remaining));
  assert.equal(guest.data.checkout.ready,false);
  const signup = await account('register', {username,email,password,consent:true,qa:true}, '');
  assert.equal(signup.response.status,200,'Disposable BPJ account registration');
  owner = signup.data.user?.id;
  cookie = takeCookie(signup.response);
  assert(owner && cookie.startsWith('__Host-bpj_account='));

  const created = await manage('create', {label:'Trade QA'});
  assert.equal(created.response.status,200,'Create scoped key');
  const original = created.data.key;
  assert(validKey(original),'One-time key has the expected scope prefix');
  const active = await keys();
  assert.equal(active.response.status,200);
  assert.equal(active.data.scope,'trade-tools:run');
  assert.equal(active.data.keys.length,1);
  assert(!JSON.stringify(active.data).includes(original),'Key list omits the raw credential');

  const detail = await call(original,'get_trade_tool',{id:toolId,lang:'en'});
  assert.equal(detail.response.status,200,'Scoped key can retrieve the exact tool contract');
  const {example, tool} = detail.data.result.structuredContent;
  assert.equal(tool.id,toolId);
  assert(/^https:\/\//.test(tool.source.url));
  const expected = await web();
  assert.equal(expected.data.remaining,10,'Metadata did not use a run');

  const result = await call(original,'run_trade_tool',{id:toolId,input:example.input,lang:'en'});
  assert.equal(result.response.status,200,'Scoped key can execute an actual tool');
  assert.deepEqual(result.data.result.structuredContent.rows,example.rows);
  assert.equal((await web()).data.remaining,9,'MCP consumed one shared account run');
  const browser = await web({id:toolId,input:example.input,lang:'en'});
  assert.equal(browser.response.status,200,'Website can use the same account and engine');
  assert.equal(browser.data.remaining,8);
  const again = await call(original,'run_trade_tool',{id:toolId,input:example.input,lang:'en'});
  assert.equal(again.response.status,200);
  assert.equal((await web()).data.remaining,7,'Website and MCP both contribute to the same daily total');

  const rotated = await manage('rotate',{id:active.data.keys[0].id});
  assert.equal(rotated.response.status,200,'Rotate scoped key');
  const replacement = rotated.data.key;
  assert(validKey(replacement) && replacement !== original);
  assert.equal((await call(original,'get_trade_tool',{id:toolId})).response.status,401,'Rotation invalidates the old credential');
  assert.equal((await call(replacement,'get_trade_tool',{id:toolId})).response.status,200);

  const current = await keys();
  assert.equal(current.response.status,200);
  assert.equal(current.data.keys.length,1);
  assert.equal((await manage('revoke',{id:current.data.keys[0].id})).response.status,200);
  assert.equal((await call(replacement,'get_trade_tool',{id:toolId})).response.status,401,'Revocation takes effect immediately');
  const deletionFixture = await manage('create',{label:'Trade deletion QA'});
  assert.equal(deletionFixture.response.status,200);
  const deletionKey = deletionFixture.data.key;
  assert(validKey(deletionKey));
  removed = await cleanup();
  assert(removed,'Disposable QA account was deleted');
  assert.equal((await call(deletionKey,'get_trade_tool',{id:toolId})).response.status,401,'Account deletion invalidates active credentials');
  assert.equal((await keys()).response.status,401,'Account deletion invalidates the browser session');
  console.log('PASS production trade MCP: signup, scoped key, real results, shared quota, rotation, revocation and QA cleanup.');
} finally {
  if (!removed) {
    try {
      cookie = '';
      if (!await cleanup()) throw Error('Cleanup failed');
    } catch {
      console.error('Disposable trade MCP QA account cleanup could not be verified.');
      process.exitCode = 1;
    }
  }
}
