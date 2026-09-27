import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequest as google} from '../functions/api/account-google.js';
import {onRequest as account} from '../functions/api/account.js';
import {ACCOUNT_COOKIE, hash, now, getAccount} from '../lib/free-account.js';
import {GOOGLE_NONCE_COOKIE, GOOGLE_PROOF_COOKIE, GOOGLE_JWKS_URL, ensureGoogleAccounts, getGoogleProof, verifyGoogleIdToken} from '../lib/google-account.js';

// All signatures and JWKS below are generated locally. No Google account,
// userinfo endpoint, real ID token, mail provider or external network is used.
const CLIENT = '1234567890-local-test.apps.googleusercontent.com';
const ORIGIN = 'https://baipiaoji.com';
const PASSWORD = 'local-fixture password 2026';
const keyPair = await crypto.subtle.generateKey({name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['sign', 'verify']);
const publicKey = {...await crypto.subtle.exportKey('jwk', keyPair.publicKey), kid: 'local-key-1', alg: 'RS256', use: 'sig'};
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(nonce, claims = {}, header = {}) {
  const time = now();
  const prefix = b64({alg: 'RS256', typ: 'JWT', kid: publicKey.kid, ...header}) + '.' + b64({iss: 'https://accounts.google.com', aud: CLIENT, sub: 'google-sub-alice', email: 'alice@gmail.com', email_verified: true, iat: time, exp: time + 3600, nonce, ...claims});
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, new TextEncoder().encode(prefix));
  return prefix + '.' + Buffer.from(signature).toString('base64url');
}
function setup() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON; CREATE TABLE hits(id INTEGER PRIMARY KEY); INSERT INTO hits VALUES(1)');
  let queue = Promise.resolve();
  const HITS = {
    prepare(query) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        run() { const result = sql.prepare(query).run(...args); return {...result, meta: {changes: result.changes}}; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return {results: sql.prepare(query).all(...args)}; },
      };
      return statement;
    },
    batch(statements) {
      const run = queue.then(() => {
        sql.exec('BEGIN');
        try { const result = statements.map(s => s.run()); sql.exec('COMMIT'); return result; }
        catch (error) { sql.exec('ROLLBACK'); throw error; }
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  return {sql, env: {HITS, GOOGLE_CLIENT_ID: CLIENT}};
}
function request(path, body, cookies = '', extraHeaders = {}) {
  return new Request(ORIGIN + path, {method: body ? 'POST' : 'GET', headers: {Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.17', Cookie: cookies, ...extraHeaders}, ...(body ? {body: JSON.stringify(body)} : {})});
}
async function call(handler, env, path, body, cookies = '', headers = {}) {
  const response = await handler({env, request: request(path, body, cookies, headers)});
  return {status: response.status, body: await response.json(), cookies: response.headers.getSetCookie(), headers: response.headers};
}
const cookieNamed = (result, name) => result.cookies.find(c => c.startsWith(name + '=') && !c.includes('Max-Age=0'))?.split(';')[0] || '';
const combine = (...cookies) => cookies.filter(Boolean).join('; ');
const gc = (env, body, cookies = '', headers = {}) => call(google, env, '/api/account-google', body, cookies, headers);
const ac = (env, body, cookies = '', headers = {}) => call(account, env, '/api/account', body, cookies, headers);
async function register(env, email, username) {
  const result = await ac(env, {action: 'register', email, username, password: PASSWORD, consent: true, qa: true});
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return {user: result.body.user, recovery: result.body.recovery_code, cookie: cookieNamed(result, ACCOUNT_COOKIE)};
}
async function credential(env, claims = {}, cookies = '', intent = 'signin', accountId) {
  const start = await gc(env, {action: 'start', intent, ...(accountId ? {account_id: accountId} : {})}, cookies);
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const nonceCookie = cookieNamed(start, GOOGLE_NONCE_COOKIE);
  const jwt = await token(start.body.nonce, claims);
  const result = await gc(env, {action: 'credential', credential: jwt}, combine(cookies, nonceCookie));
  return {...result, start, jwt, nonceCookie, proofCookie: cookieNamed(result, GOOGLE_PROOF_COOKIE)};
}

let passed = 0;
async function test(name, fn) {
  const context = setup();
  try { await fn(context); passed++; console.log('PASS ' + name); }
  finally { context.sql.close(); }
}
const actualFetch = globalThis.fetch;
const fetched = [];
globalThis.fetch = async (url, options) => {
  fetched.push(String(url));
  assert.equal(String(url), GOOGLE_JWKS_URL, 'Only the fixed Google public-key URL is requested');
  assert.equal(options.redirect, 'error');
  return new Response(JSON.stringify({keys: [publicKey]}), {headers: {'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600'}});
};
try {
  await test('disabled configuration performs no database or remote call and no fake availability', async () => {
    const before = fetched.length;
    const disabled = await gc({}, null);
    assert.deepEqual(disabled.body, {ok: true, available: false});
    assert.equal((await gc({}, {action: 'start'})).status, 503);
    assert.equal((await gc({GOOGLE_CLIENT_ID: CLIENT}, null)).body.available, false);
    assert.equal(fetched.length, before);
  });

  await test('RSA signatures and every required Google token claim are checked', async () => {
    const nonce = 'N'.repeat(43), options = {keys: [publicKey], time: now(), issuedAfter: now() - 10};
    const good = await token(nonce);
    assert.equal((await verifyGoogleIdToken(good, CLIENT, hash(nonce), options)).sub, 'google-sub-alice');
    const segments = good.split('.');
    segments[1] = b64({sub: 'forged'});
    await assert.rejects(verifyGoogleIdToken(segments.join('.'), CLIENT, hash(nonce), options), /invalid_google_token/);
    const badClaims = [
      {iss: 'https://evil.example'}, {aud: 'other.apps.googleusercontent.com'}, {aud: [CLIENT]}, {azp: 'other'},
      {exp: now() - 1}, {exp: undefined}, {exp: '9999999999'}, {iat: undefined}, {iat: now() + 600}, {iat: now() - 600},
      {exp: now() + 90000}, {nbf: now() + 600}, {sub: ''}, {sub: 123}, {sub: 'x'.repeat(256)},
      {nonce: 'X'.repeat(43)}, {nonce: undefined}, {email_verified: false}, {email_verified: 'true'},
      {email: 'not-an-email'}, {hd: ['workspace.test']},
    ];
    for (const claims of badClaims) await assert.rejects(verifyGoogleIdToken(await token(nonce, claims), CLIENT, hash(nonce), options), /invalid_google_token/, JSON.stringify(claims));
    for (const header of [{alg: 'none'}, {alg: 'HS256'}, {kid: 'not-our-key'}, {jku: 'https://evil.example/keys'}, {crit: ['custom']}]) {
      await assert.rejects(verifyGoogleIdToken(await token(nonce, {}, header), CLIENT, hash(nonce), options), /invalid_google_token/);
    }
  });

  await test('Google identity validity is distinct from current mailbox authority', async () => {
    const nonce = 'N'.repeat(43), options = {keys: [publicKey]};
    assert.equal((await verifyGoogleIdToken(await token(nonce), CLIENT, hash(nonce), options)).email_authoritative, true);
    assert.equal((await verifyGoogleIdToken(await token(nonce, {email: 'alice@workspace.test', hd: 'workspace.test'}), CLIENT, hash(nonce), options)).email_authoritative, true);
    assert.equal((await verifyGoogleIdToken(await token(nonce, {email: 'alice@external.test'}), CLIENT, hash(nonce), options)).email_authoritative, false);
  });

  await test('start requires same origin and records a short-lived hashed browser-bound challenge', async ({env, sql}) => {
    assert.equal((await gc(env, {action: 'start'}, '', {Origin: 'https://evil.example'})).status, 403);
    assert.equal((await gc(env, {action: 'start'}, '', {Origin: ''})).status, 403);
    assert.equal((await gc(env, {action: 'start'}, '', {'Sec-Fetch-Site': 'cross-site'})).status, 403);
    const start = await gc(env, {action: 'start'});
    assert.equal(start.status, 200);
    const browser = cookieNamed(start, GOOGLE_NONCE_COOKIE), row = sql.prepare('SELECT * FROM free_google_nonces').get();
    assert.equal(row.token_hash, hash(browser.split('=')[1]));
    assert.equal(row.nonce_hash, hash(start.body.nonce));
    assert.notEqual(browser.split('=')[1], start.body.nonce);
    assert.equal(row.expires - row.created, 300);
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=300']) assert(start.cookies.some(c => c.startsWith(GOOGLE_NONCE_COOKIE + '=') && c.includes(attribute)));
    assert.equal((await gc(env, {action: 'credential', credential: await token(start.body.nonce)})).status, 401);
    assert.equal((await gc(env, {action: 'credential', credential: await token(start.body.nonce)}, browser + '; ' + browser)).status, 401);
  });

  await test('a new Google subject gets only private onboarding proof, never a passwordless account', async ({env, sql}) => {
    const result = await credential(env);
    assert.equal(result.status, 200);
    assert.equal(result.body.state, 'onboarding');
    assert.equal(result.body.email, 'alice@gmail.com');
    assert.equal(result.body.email_hint, 'a***@gmail.com');
    assert.equal(result.body.email_authoritative, true);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(cookieNamed(result, ACCOUNT_COOKIE), '');
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_accounts').get().n, 0);
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_google_nonces').get().n, 0);
    const proof = await getGoogleProof(request('/api/account-google', null, result.proofCookie), env);
    assert.equal(proof.sub, 'google-sub-alice');
    assert.equal(proof.email_authoritative, true);
    assert.equal(proof.token_hash, hash(result.proofCookie.split('=')[1]));
    assert(!JSON.stringify(result.body).includes(result.proofCookie.split('=')[1]));
    assert(!JSON.stringify(result.body).includes(result.jwt));
    assert.equal((await gc(env, null, result.proofCookie)).body.onboarding.email, 'alice@gmail.com');
    assert.equal((await gc(env, {action: 'credential', credential: result.jwt}, result.nonceCookie)).status, 401);
    sql.exec('UPDATE free_google_proofs SET expires=0');
    assert.equal(await getGoogleProof(request('/api/account-google', null, result.proofCookie), env), null);
  });

  await test('parallel credentials redeem one nonce exactly once; starting over invalidates old challenges', async ({env, sql}) => {
    const start = await gc(env, {action: 'start'}), browser = cookieNamed(start, GOOGLE_NONCE_COOKIE), jwt = await token(start.body.nonce);
    const results = await Promise.all([1, 2].map(() => gc(env, {action: 'credential', credential: jwt}, browser)));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 401]);
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_google_proofs').get().n, 1);
    const one = await gc(env, {action: 'start'}), oldCookie = cookieNamed(one, GOOGLE_NONCE_COOKIE);
    await gc(env, {action: 'start'}, oldCookie);
    assert.equal((await gc(env, {action: 'credential', credential: await token(one.body.nonce)}, oldCookie)).status, 401);
  });

  await test('same email never signs into or merges an existing password account', async ({env, sql}) => {
    const local = await register(env, 'alice@gmail.com', 'ExistingAlice');
    const result = await credential(env);
    assert.equal(result.body.state, 'needs_link');
    assert.equal(cookieNamed(result, ACCOUNT_COOKIE), '');
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_accounts').get().n, 1);
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_google_identities').get().n, 0);
    assert.equal((await gc(env, {action: 'link', account_id: local.user.id, password: PASSWORD, confirmed: true}, result.proofCookie)).status, 409);
    const both = combine(local.cookie, result.proofCookie);
    assert.equal((await gc(env, {action: 'link', account_id: local.user.id, password: 'wrong password long enough', confirmed: true}, both)).status, 401);
    assert.equal((await gc(env, {action: 'link', account_id: local.user.id, password: PASSWORD}, both)).status, 400);
    const linked = await gc(env, {action: 'link', account_id: local.user.id, password: PASSWORD, confirmed: true}, both);
    assert.equal(linked.status, 200, JSON.stringify(linked.body));
    assert.equal(linked.body.state, 'linked');
    assert.equal(linked.body.user.email_verified, true);
    assert.equal(sql.prepare('SELECT account_id FROM free_google_identities').get().account_id, local.user.id);
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_google_proofs').get().n, 0);
  });

  await test('external-domain Google linking requires the account password and does not verify the email', async ({env, sql}) => {
    const local = await register(env, 'alice@external.test', 'ExternalAlice');
    const result = await credential(env, {email: 'alice@external.test'});
    assert.equal(result.body.email_authoritative, false);
    const linked = await gc(env, {action: 'link', account_id: local.user.id, password: PASSWORD, confirmed: true}, combine(local.cookie, result.proofCookie));
    assert.equal(linked.status, 200);
    assert.equal(linked.body.user.email_verified, false);
    assert.equal(sql.prepare('SELECT email_verified_at FROM free_account_identities').get().email_verified_at, null);
  });

  await test('link rejects a changed account, mismatched email and revoked session version', async ({env}) => {
    const alice = await register(env, 'alice@gmail.com', 'AliceForLink');
    const bob = await register(env, 'bob@gmail.com', 'BobForLink');
    assert.equal((await gc(env, {action: 'start'}, alice.cookie)).body.error, 'already_signed_in');
    assert.equal((await gc(env, {action: 'start', intent: 'link', account_id: bob.user.id}, alice.cookie)).status, 409);
    const result = await credential(env);
    assert.equal((await gc(env, null, combine(bob.cookie, result.proofCookie))).body.onboarding, undefined, 'Another signed-in account cannot see a pending email');
    assert.equal((await gc(env, {action: 'link', account_id: alice.user.id, password: PASSWORD, confirmed: true}, combine(bob.cookie, result.proofCookie))).status, 409);
    assert.equal((await gc(env, {action: 'link', account_id: bob.user.id, password: PASSWORD, confirmed: true}, combine(bob.cookie, result.proofCookie))).body.error, 'google_email_mismatch');
    const start = await gc(env, {action: 'start', intent: 'link', account_id: alice.user.id}, alice.cookie);
    const changed = await ac(env, {action: 'change_password', account_id: alice.user.id, old_password: PASSWORD, new_password: PASSWORD + ' new'}, alice.cookie);
    assert.equal(changed.status, 200);
    assert.equal((await gc(env, {action: 'credential', credential: await token(start.body.nonce)}, combine(alice.cookie, cookieNamed(start, GOOGLE_NONCE_COOKIE)))).status, 409);
  });

  await test('a bound proof stops being visible or usable after recovery, even with a new valid session', async ({env, sql}) => {
    const alice = await register(env, 'alice@gmail.com', 'RecoveryAlice');
    const pending = await credential(env, {}, alice.cookie, 'link', alice.user.id);
    assert.equal(pending.status, 200);
    assert.equal((await gc(env, null, combine(alice.cookie, pending.proofCookie))).body.onboarding.email, 'alice@gmail.com');
    assert.equal((await gc(env, null, pending.proofCookie)).body.onboarding, undefined, 'A link proof alone cannot reveal an email after logout');
    const changed = await ac(env, {action: 'recover', email: 'alice@gmail.com', recovery_code: alice.recovery, new_password: PASSWORD + ' new'});
    assert.equal(changed.status, 200);
    assert.equal((await gc(env, null, combine(alice.cookie, pending.proofCookie))).body.onboarding, undefined);
    const login = await ac(env, {action: 'login', email: 'alice@gmail.com', password: PASSWORD + ' new'});
    assert.equal(login.status, 200);
    const current = combine(cookieNamed(login, ACCOUNT_COOKIE), pending.proofCookie);
    assert.equal((await gc(env, null, current)).body.onboarding, undefined);
    assert.equal((await gc(env, {action: 'link', account_id: alice.user.id, password: PASSWORD + ' new', confirmed: true}, current)).status, 401);
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_google_identities').get().n, 0);
  });

  await test('Google onboarding keeps a password and later login resolves stable sub, never a changed email', async ({env, sql}) => {
    const first = await credential(env);
    const registered = await ac(env, {action: 'register', google: true, email: 'alice@gmail.com', username: 'GoogleAlice', password: PASSWORD, consent: true, qa: true}, first.proofCookie);
    assert.equal(registered.status, 200, JSON.stringify(registered.body));
    const id = registered.body.user.id;
    assert(sql.prepare('SELECT password_hash FROM free_accounts WHERE id=?').get(id).password_hash.startsWith('scrypt-v1$'));
    assert.equal(sql.prepare('SELECT account_id FROM free_google_identities WHERE sub=?').get('google-sub-alice').account_id, id);
    assert.equal(registered.body.user.email_verified, true);
    const other = await register(env, 'new-address@workspace.test', 'OtherMailboxOwner');
    const login = await credential(env, {email: 'new-address@workspace.test', hd: 'workspace.test'});
    assert.equal(login.status, 200);
    assert.equal(login.body.state, 'signed_in');
    assert.equal(login.body.user.id, id);
    assert.notEqual(login.body.user.id, other.user.id);
    assert.equal(login.body.user.email, 'alice@gmail.com');
    const session = cookieNamed(login, ACCOUNT_COOKIE);
    assert.equal((await getAccount(request('/api/account', null, session), env)).id, id);
  });

  await test('a Google subject cannot be linked to another account even with a separately issued proof', async ({env, sql}) => {
    const alice = await register(env, 'alice@gmail.com', 'OwnerAlice');
    const bob = await register(env, 'bob@gmail.com', 'OwnerBob');
    const proofA = await credential(env);
    const proofB = await credential(env, {email: 'bob@gmail.com'});
    assert.equal((await gc(env, {action: 'link', account_id: alice.user.id, password: PASSWORD, confirmed: true}, combine(alice.cookie, proofA.proofCookie))).status, 200);
    const denied = await gc(env, {action: 'link', account_id: bob.user.id, password: PASSWORD, confirmed: true}, combine(bob.cookie, proofB.proofCookie));
    assert.equal(denied.status, 409);
    assert.equal(sql.prepare('SELECT account_id FROM free_google_identities WHERE sub=?').get('google-sub-alice').account_id, alice.user.id);
    assert.equal(sql.prepare('SELECT email_verified FROM free_account_identities WHERE account_id=?').get(bob.user.id).email_verified, 0);
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_google_proofs').get().n, 1, 'Failed transaction does not consume the proof or partially update the mailbox');
  });

  await test('concurrent links of the same Google subject commit exactly one account and no partial email verification', async ({env, sql}) => {
    const alice = await register(env, 'alice@gmail.com', 'ConcurrentAlice');
    const bob = await register(env, 'bob@gmail.com', 'ConcurrentBob');
    const proofA = await credential(env);
    const proofB = await credential(env, {email: 'bob@gmail.com'});
    const users = [alice, bob], proofs = [proofA, proofB];
    const results = await Promise.all(users.map((user, i) => gc(env, {action: 'link', account_id: user.user.id, password: PASSWORD, confirmed: true}, combine(user.cookie, proofs[i].proofCookie))));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const winner = results.findIndex(r => r.status === 200);
    assert.equal(sql.prepare('SELECT account_id FROM free_google_identities WHERE sub=?').get('google-sub-alice').account_id, users[winner].user.id);
    assert.equal(sql.prepare('SELECT email_verified FROM free_account_identities WHERE account_id=?').get(users[1 - winner].user.id).email_verified, 0);
    assert.equal(sql.prepare('SELECT COUNT(*) n FROM free_google_proofs').get().n, 1);
  });
  assert(fetched.length > 0, 'Endpoint exercised the fixed JWKS fetch path');
  assert(fetched.every(url => url === GOOGLE_JWKS_URL));
  console.log(`${passed} Google account suites passed; local RSA/JWKS fixtures only, no Google userinfo or external network.`);
} finally { globalThis.fetch = actualFetch; }

if (process.argv.includes('--workerd')) {
  // Use the same pinned esbuild/miniflare installation as test-free-account.
  // Only this test bundle replaces public-key fetch with its generated fixture.
  // No production option can supply a JWKS URL or bypass token verification.
  const {fileURLToPath, pathToFileURL} = await import('node:url');
  const {resolve, dirname} = await import('node:path');
  const runtime = process.env.FREE_ACCOUNT_RUNTIME_MODULES;
  const esbuild = await import(runtime ? pathToFileURL(resolve(runtime, 'esbuild/lib/main.js')).href : 'esbuild');
  const simulator = await import(runtime ? pathToFileURL(resolve(runtime, 'miniflare/dist/src/index.js')).href : 'miniflare');
  const googlePath = fileURLToPath(new URL('../functions/api/account-google.js', import.meta.url));
  const accountPath = fileURLToPath(new URL('../functions/api/account.js', import.meta.url));
  const source = `import{onRequest as google}from ${JSON.stringify(googlePath)};
    import{onRequest as account}from ${JSON.stringify(accountPath)};
    globalThis.fetch=async(input,options)=>{
      if(String(input)!==${JSON.stringify(GOOGLE_JWKS_URL)}||options?.redirect!=='error')throw Error('Unexpected external request in isolated test');
      return new Response(${JSON.stringify(JSON.stringify({keys: [publicKey]}))},{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=3600'}});
    };
    export default{fetch(request,env){return(new URL(request.url).pathname==='/api/account-google'?google:account)({request,env})}};`;
  const bundled = await esbuild.build({stdin: {contents: source, resolveDir: dirname(googlePath)}, bundle: true, write: false, format: 'esm', platform: 'neutral', external: ['node:*']});
  const options = {name: 'google-account-test', modules: true, script: bundled.outputFiles[0].text, compatibilityDate: '2026-09-01', compatibilityFlags: ['nodejs_compat'], d1Databases: ['HITS'], bindings: {GOOGLE_CLIENT_ID: CLIENT}};
  const mf = new simulator.Miniflare(simulator.convertV4MiniflareOptions ? simulator.convertV4MiniflareOptions(options) : options);
  try {
    const runtimeCall = async (path, body, cookies = '') => {
      const response = await mf.dispatchFetch(ORIGIN + path, {method: body ? 'POST' : 'GET', headers: {Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.33', Cookie: cookies}, ...(body ? {body: JSON.stringify(body)} : {})});
      return {status: response.status, body: await response.json(), cookies: response.headers.getSetCookie()};
    };
    const start = await runtimeCall('/api/account-google', {action: 'start'});
    assert.equal(start.status, 200, JSON.stringify(start.body));
    const firstNonce = cookieNamed(start, GOOGLE_NONCE_COOKIE);
    const firstJwt = await token(start.body.nonce);
    const pending = await runtimeCall('/api/account-google', {action: 'credential', credential: firstJwt}, firstNonce);
    assert.equal(pending.status, 200, JSON.stringify(pending.body));
    assert.equal(pending.body.state, 'onboarding');
    assert.equal((await runtimeCall('/api/account-google', {action: 'credential', credential: firstJwt}, firstNonce)).status, 401);
    const registered = await runtimeCall('/api/account', {action: 'register', google: true, email: 'alice@gmail.com', username: 'RuntimeGoogleAlice', password: PASSWORD, consent: true, qa: true}, cookieNamed(pending, GOOGLE_PROOF_COOKIE));
    assert.equal(registered.status, 200, JSON.stringify(registered.body));
    assert.equal(registered.body.user.email_verified, true);
    assert.equal(registered.body.recovery_code.length, 43);
    assert(registered.cookies.some(c => c.startsWith(ACCOUNT_COOKIE + '=')));
    assert(registered.cookies.some(c => c.startsWith(GOOGLE_PROOF_COOKIE + '=') && c.includes('Max-Age=0')));
    const next = await runtimeCall('/api/account-google', {action: 'start'});
    const nextJwt = await token(next.body.nonce, {email: 'changed@external.test'});
    const simultaneous = await Promise.all([1, 2].map(() => runtimeCall('/api/account-google', {action: 'credential', credential: nextJwt}, cookieNamed(next, GOOGLE_NONCE_COOKIE))));
    assert.deepEqual(simultaneous.map(r => r.status).sort(), [200, 401]);
    assert.equal(simultaneous.find(r => r.status === 200).body.user.id, registered.body.user.id);
    const local = await runtimeCall('/api/account', {action: 'register', email: 'bob@gmail.com', username: 'RuntimeLocalBob', password: PASSWORD, consent: true, qa: true});
    assert.equal(local.status, 200, JSON.stringify(local.body));
    const localCookie = cookieNamed(local, ACCOUNT_COOKIE);
    const linkStart = await runtimeCall('/api/account-google', {action: 'start', intent: 'link', account_id: local.body.user.id}, localCookie);
    assert.equal(linkStart.status, 200, JSON.stringify(linkStart.body));
    const linkPending = await runtimeCall('/api/account-google', {action: 'credential', credential: await token(linkStart.body.nonce, {sub: 'google-sub-bob', email: 'bob@gmail.com'})}, combine(localCookie, cookieNamed(linkStart, GOOGLE_NONCE_COOKIE)));
    assert.equal(linkPending.status, 200, JSON.stringify(linkPending.body));
    const linked = await runtimeCall('/api/account-google', {action: 'link', account_id: local.body.user.id, password: PASSWORD, confirmed: true}, combine(localCookie, cookieNamed(linkPending, GOOGLE_PROOF_COOKIE)));
    assert.equal(linked.status, 200, JSON.stringify(linked.body));
    assert.equal(linked.body.user.email_verified, true);
    console.log('PASS actual workerd WebCrypto + D1: local RSA/JWKS verification, nonce single use/concurrency, atomic password-backed onboarding, stable-sub sign-in and explicit password-confirmed linking; no external network.');
  } finally { await mf.dispose(); }
}
