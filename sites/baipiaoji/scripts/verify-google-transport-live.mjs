import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// No real identity or valid signature: exercise production JWKS retrieval and
// require a cryptographic rejection, rather than a transport/runtime failure.
export async function verifyGoogleTransport() {
  const base = 'https://baipiaoji.com';
  const post = (body, cookie = '') => fetch(base + '/api/account-google', {
    method: 'POST', headers: {Origin: base, 'Content-Type': 'application/json',
      'User-Agent': 'bpj-ci-selftest', ...(cookie ? {Cookie: cookie} : {})},
    body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
  });
  const response = await post({action: 'start'}), start = await response.json();
  assert.equal(response.status, 200, 'Google challenge must start');
  const cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const keysResponse = await fetch('https://www.googleapis.com/oauth2/v3/certs', {redirect: 'manual', signal: AbortSignal.timeout(15000)});
  assert.equal(keysResponse.status, 200);
  const {keys} = await keysResponse.json();
  const key = keys.find(k => k.kty === 'RSA' && k.kid);
  assert(key, 'Google must publish an RSA verification key');
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const credential = b64({alg: 'RS256', typ: 'JWT', kid: key.kid}) + '.' +
    b64({iss: 'https://accounts.google.com', aud: start.client_id, nonce: start.nonce}) + '.' +
    Buffer.alloc(256).toString('base64url');
  const rejected = await post({action: 'credential', credential}, cookie);
  const result = await rejected.json();
  assert.equal(rejected.status, 401, 'Google key transport must reach signature rejection; got ' + result.error);
  assert.equal(result.error, 'invalid_google_token');
  assert(!rejected.headers.getSetCookie().some(c => /^__Host-bpj_account=/.test(c)), 'Invalid credentials cannot create a session');
  console.log('PASS production Google key transport and invalid-signature rejection; no account created or real Google consent performed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await verifyGoogleTransport();
