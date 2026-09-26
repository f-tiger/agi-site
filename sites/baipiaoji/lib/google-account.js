import {ensureAccounts, getAccount, hash, now, normalizeEmail, validEmail} from './free-account.js';

// GIS callback mode: this module receives a same-origin JSON callback, not a
// Google form/redirect POST. The HttpOnly challenge cookie and signed nonce bind
// the credential to the browser which explicitly started the flow.
// Official contracts (checked 2026-09-26):
// https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
// https://developers.google.com/identity/gsi/web/reference/js-reference#nonce
// https://developers.google.com/identity/openid-connect/openid-connect
export const GOOGLE_NONCE_COOKIE = '__Host-bpj_google_nonce';
export const GOOGLE_PROOF_COOKIE = '__Host-bpj_google_proof';
export const GOOGLE_FLOW_SECONDS = 300;
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const encoder = new TextEncoder();
let jwksCache = null, jwksRequest = null, lastKeyFetch = 0;

export function googleFailure(code, status = 400) {
  const error = Error(code);
  error.code = code;
  error.status = status;
  return error;
}
export function googleClientId(env) {
  const id = typeof env.GOOGLE_CLIENT_ID === 'string' ? env.GOOGLE_CLIENT_ID.trim() : '';
  return id.length <= 255 && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id) ? id : null;
}
export function googleCookieToken(request, name) {
  const values = (request.headers.get('Cookie') || '').split(';').map(v => v.trim()).filter(v => v.startsWith(name + '='));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  return TOKEN_PATTERN.test(value) ? value : null;
}
const cookie = (name, value, seconds) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
export const googleNonceCookie = value => cookie(GOOGLE_NONCE_COOKIE, value, GOOGLE_FLOW_SECONDS);
export const googleProofCookie = value => cookie(GOOGLE_PROOF_COOKIE, value, GOOGLE_FLOW_SECONDS);
export const clearGoogleNonceCookie = () => cookie(GOOGLE_NONCE_COOKIE, '', 0);
export const clearGoogleProofCookie = () => cookie(GOOGLE_PROOF_COOKIE, '', 0);

export async function ensureGoogleAccounts(env) {
  await ensureAccounts(env);
  await env.HITS.batch([
    env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_google_identities (
      sub TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL UNIQUE REFERENCES free_accounts(id) ON DELETE CASCADE,
      created INTEGER NOT NULL
    )`),
    env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_google_nonces (
      token_hash TEXT PRIMARY KEY NOT NULL, nonce_hash TEXT NOT NULL,
      created INTEGER NOT NULL, expires INTEGER NOT NULL,
      intent TEXT NOT NULL CHECK(intent IN ('signin','link')),
      account_id TEXT REFERENCES free_accounts(id) ON DELETE CASCADE,
      session_version INTEGER,
      CHECK((intent='signin' AND account_id IS NULL AND session_version IS NULL)
        OR (intent='link' AND account_id IS NOT NULL AND session_version IS NOT NULL))
    )`),
    env.HITS.prepare(`CREATE INDEX IF NOT EXISTS free_google_nonces_expiry ON free_google_nonces(expires)`),
    env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_google_proofs (
      token_hash TEXT PRIMARY KEY NOT NULL, sub TEXT NOT NULL, email TEXT NOT NULL,
      email_authoritative INTEGER NOT NULL CHECK(email_authoritative IN (0,1)),
      created INTEGER NOT NULL, expires INTEGER NOT NULL,
      intent TEXT NOT NULL CHECK(intent IN ('signin','link')),
      account_id TEXT REFERENCES free_accounts(id) ON DELETE CASCADE,
      session_version INTEGER,
      CHECK((intent='signin' AND account_id IS NULL AND session_version IS NULL)
        OR (intent='link' AND account_id IS NOT NULL AND session_version IS NOT NULL))
    )`),
    env.HITS.prepare(`CREATE INDEX IF NOT EXISTS free_google_proofs_expiry ON free_google_proofs(expires)`),
    env.HITS.prepare('DELETE FROM free_google_nonces WHERE expires<=?').bind(now()),
    env.HITS.prepare('DELETE FROM free_google_proofs WHERE expires<=?').bind(now()),
  ]);
}

export async function getGoogleProof(request, env) {
  const token = googleCookieToken(request, GOOGLE_PROOF_COOKIE);
  if (!token || !googleClientId(env) || !env.HITS) return null;
  await ensureGoogleAccounts(env);
  const row = await env.HITS.prepare('SELECT * FROM free_google_proofs WHERE token_hash=? AND expires>?').bind(hash(token), now()).first();
  if (!row) return null;
  // A link proof belongs to the account/session generation which began it.
  // Do not expose even its email after logout, recovery or an account switch.
  if (row.account_id) {
    const user = await getAccount(request, env);
    if (!user || user.id !== row.account_id || user.session_version !== row.session_version) return null;
  }
  return {...row, email_authoritative: row.email_authoritative === 1};
}

// Append these statements to the SAME transaction which inserts the account and
// local email identity. A consumed/expired proof produces NULL for a NOT NULL sub
// and aborts the entire batch, rather than committing an unlinked new account.
export function googleRegistrationStatements(env, proof, accountId) {
  return [
    env.HITS.prepare(`INSERT INTO free_google_identities(sub,account_id,created)
      VALUES((SELECT sub FROM free_google_proofs
        WHERE token_hash=? AND expires>? AND email=? AND intent='signin' AND account_id IS NULL),?,?)`)
      .bind(proof.token_hash, now(), proof.email, accountId, now()),
    env.HITS.prepare('DELETE FROM free_google_proofs WHERE token_hash=?').bind(proof.token_hash),
  ];
}

export function maskedGoogleEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

function bytes(segment) {
  if (!segment || segment.length > 16000 || !/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) throw googleFailure('invalid_google_token', 401);
  return Uint8Array.from(atob(segment.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
function object(segment) {
  try {
    const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes(segment)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    return value;
  } catch { throw googleFailure('invalid_google_token', 401); }
}
async function boundedJSON(response, limit) {
  if (!response.ok || Number(response.headers.get('Content-Length')) > limit || !response.body) throw googleFailure('google_unavailable', 503);
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw googleFailure('google_unavailable', 503); }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(all)); }
  catch { throw googleFailure('google_unavailable', 503); }
}
async function signingKeys(kid) {
  const time = Date.now();
  if (jwksCache && jwksCache.expires > time && (jwksCache.keys.some(k => k.kid === kid) || time - lastKeyFetch < 30000)) return jwksCache.keys;
  if (jwksRequest) return jwksRequest;
  jwksRequest = (async () => {
    try {
      // Never follow a token-supplied jku/x5u, redirect or arbitrary JWKS URL.
      const response = await fetch(GOOGLE_JWKS_URL, {redirect: 'error', signal: AbortSignal.timeout(8000), headers: {Accept: 'application/json'}});
      const data = await boundedJSON(response, 65536);
      if (!Array.isArray(data?.keys) || !data.keys.length || data.keys.length > 16) throw googleFailure('google_unavailable', 503);
      const directives = response.headers.get('Cache-Control') || '';
      const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(directives)?.[1] || 300);
      const age = Number(response.headers.get('Age') || 0);
      const ttl = /\bno-store\b|\bno-cache\b/i.test(directives) ? 0 : Math.max(0, Math.min(21600, maxAge - (Number.isFinite(age) ? age : 0)));
      lastKeyFetch = Date.now();
      jwksCache = {keys: data.keys, expires: lastKeyFetch + ttl * 1000};
      return data.keys;
    } catch (error) { throw error?.code ? error : googleFailure('google_unavailable', 503); }
    finally { jwksRequest = null; }
  })();
  return jwksRequest;
}

// Pure JWT checks are testable with locally generated public RSA fixtures. The
// endpoint never accepts a key set, clock, issuer or audience from request JSON.
export async function verifyGoogleIdToken(token, clientId, nonceHash, {keys, time = now(), issuedAfter = time - GOOGLE_FLOW_SECONDS} = {}) {
  if (typeof token !== 'string' || token.length > 16384) throw googleFailure('invalid_google_token', 401);
  const segments = token.split('.');
  if (segments.length !== 3) throw googleFailure('invalid_google_token', 401);
  const header = object(segments[0]), payload = object(segments[1]);
  if (header.alg !== 'RS256' || (header.typ !== undefined && header.typ !== 'JWT') || typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(header.kid) || header.crit !== undefined || header.jku !== undefined || header.jwk !== undefined || header.x5u !== undefined) throw googleFailure('invalid_google_token', 401);
  const jwks = keys || await signingKeys(header.kid);
  const matching = jwks.filter(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256') && (!k.use || k.use === 'sig'));
  if (matching.length !== 1) throw googleFailure('invalid_google_token', 401);
  const jwk = matching[0];
  if (bytes(jwk.n).length < 256 || bytes(jwk.n).length > 1024 || typeof jwk.e !== 'string') throw googleFailure('invalid_google_token', 401);
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(segments[2]), encoder.encode(segments[0] + '.' + segments[1]))) throw Error();
  } catch { throw googleFailure('invalid_google_token', 401); }
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) || payload.aud !== clientId || (payload.azp !== undefined && payload.azp !== clientId)) throw googleFailure('invalid_google_token', 401);
  if (!Number.isSafeInteger(payload.exp) || !Number.isSafeInteger(payload.iat) || payload.exp <= time || payload.iat > time + 60 || payload.iat < issuedAfter - 60 || payload.exp <= payload.iat || payload.exp - payload.iat > 7200) throw googleFailure('invalid_google_token', 401);
  if (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || payload.nbf > time + 60)) throw googleFailure('invalid_google_token', 401);
  if (typeof payload.sub !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(payload.sub) || !TOKEN_PATTERN.test(payload.nonce || '') || hash(payload.nonce) !== nonceHash || payload.email_verified !== true) throw googleFailure('invalid_google_token', 401);
  const email = normalizeEmail(payload.email);
  if (!validEmail(email)) throw googleFailure('invalid_google_token', 401);
  if (payload.hd !== undefined && (typeof payload.hd !== 'string' || payload.hd.length > 253 || !/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(payload.hd))) throw googleFailure('invalid_google_token', 401);
  // A verified external address can have changed owners since Google first
  // checked it. It proves this Google sub, not current mailbox ownership.
  return {sub: payload.sub, email, email_authoritative: email.endsWith('@gmail.com') || !!payload.hd};
}
