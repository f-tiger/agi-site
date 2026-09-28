import {getAccount, accountById, accountView, verifyPassword, validPassword, randomToken, hash, now, cookie, consumeRate, issueSession} from '../../lib/free-account.js';
import {GOOGLE_NONCE_COOKIE, GOOGLE_PROOF_COOKIE, GOOGLE_FLOW_SECONDS, googleClientId, googleCookieToken, googleNonceCookie, googleProofCookie, clearGoogleNonceCookie, clearGoogleProofCookie, ensureGoogleAccounts, getGoogleProof, maskedGoogleEmail, verifyGoogleIdToken, googleFailure} from '../../lib/google-account.js';

function json(body, status = 200, cookies = []) {
  const headers = new Headers({'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'});
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(JSON.stringify(body), {status, headers});
}
async function bodyOf(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '') || Number(request.headers.get('Content-Length')) > 20000 || !request.body) throw googleFailure('invalid_request');
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 20000) { await reader.cancel(); throw googleFailure('invalid_request'); }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const body = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(all));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
    return body;
  } catch { throw googleFailure('invalid_request'); }
}
async function pendingView(env, proof) {
  const existing = await env.HITS.prepare('SELECT account_id FROM free_account_identities WHERE email=?').bind(proof.email).first();
  return {state: existing || proof.intent === 'link' ? 'needs_link' : 'onboarding', email: proof.email, email_hint: maskedGoogleEmail(proof.email), email_authoritative: !!proof.email_authoritative, expires: proof.expires};
}
function assertIdentity(user, expectedId, expectedVersion) {
  if (!user || user.id !== expectedId || (expectedVersion !== undefined && user.session_version !== expectedVersion)) throw googleFailure('session_changed', 409);
}

async function route(request, env) {
  const clientId = googleClientId(env);
  if (request.method === 'GET') {
    if (!clientId || !env.HITS) return json({ok: true, available: false});
    let proof = await getGoogleProof(request, env);
    if (proof && !proof.account_id) {
      const user = await getAccount(request, env);
      if (user && user.email !== proof.email) proof = null;
    }
    return json({ok: true, available: true, client_id: clientId, ...(proof ? {onboarding: await pendingView(env, proof)} : {})});
  }
  if (request.method !== 'POST') throw googleFailure('method_not_allowed', 405);
  const url = new URL(request.url);
  if (url.protocol !== 'https:' || request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') throw googleFailure('origin_rejected', 403);
  if (request.headers.has('Authorization')) throw googleFailure('mixed_authentication');
  if (!clientId || !env.HITS) throw googleFailure('google_unavailable', 503);
  const body = await bodyOf(request);
  if (!['start', 'credential', 'link'].includes(body.action)) throw googleFailure('invalid_request');
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || ip.length > 64) throw googleFailure('unavailable', 503);
  await ensureGoogleAccounts(env);
  if (!await consumeRate(env, 'google-ip', ip, 40, 900)) throw googleFailure('rate_limited', 429);
  const db = env.HITS;

  if (body.action === 'start') {
    const intent = body.intent || 'signin', user = await getAccount(request, env);
    if (!['signin', 'link'].includes(intent)) throw googleFailure('invalid_request');
    if (intent === 'link') assertIdentity(user, body.account_id);
    else if (user) throw googleFailure('already_signed_in', 409);
    const browser = randomToken(), nonce = randomToken(), time = now();
    const previous = googleCookieToken(request, GOOGLE_NONCE_COOKIE), proof = googleCookieToken(request, GOOGLE_PROOF_COOKIE);
    await db.batch([
      ...(previous ? [db.prepare('DELETE FROM free_google_nonces WHERE token_hash=?').bind(hash(previous))] : []),
      ...(proof ? [db.prepare('DELETE FROM free_google_proofs WHERE token_hash=?').bind(hash(proof))] : []),
      db.prepare('INSERT INTO free_google_nonces(token_hash,nonce_hash,created,expires,intent,account_id,session_version) VALUES(?,?,?,?,?,?,?)')
        .bind(hash(browser), hash(nonce), time, time + GOOGLE_FLOW_SECONDS, intent, intent === 'link' ? user.id : null, intent === 'link' ? user.session_version : null),
    ]);
    return json({ok: true, client_id: clientId, nonce, expires: time + GOOGLE_FLOW_SECONDS}, 200, [googleNonceCookie(browser), clearGoogleProofCookie()]);
  }

  if (body.action === 'credential') {
    const browser = googleCookieToken(request, GOOGLE_NONCE_COOKIE);
    if (!browser) throw googleFailure('google_nonce_required', 401);
    const challenge = await db.prepare('SELECT * FROM free_google_nonces WHERE token_hash=? AND expires>?').bind(hash(browser), now()).first();
    if (!challenge) throw googleFailure('google_nonce_expired', 401);
    const user = await getAccount(request, env);
    if (challenge.intent === 'link') assertIdentity(user, challenge.account_id, challenge.session_version);
    else if (user) throw googleFailure('session_changed', 409);
    const claims = await verifyGoogleIdToken(body.credential, clientId, challenge.nonce_hash, {issuedAfter: challenge.created});
    // The signed nonce is single-use, even when two valid credentials arrive at
    // once. Link challenges also retain the exact account/session generation.
    const consumed = await db.prepare(`DELETE FROM free_google_nonces WHERE token_hash=? AND nonce_hash=? AND expires>?
      AND (intent='signin' OR EXISTS(SELECT 1 FROM free_accounts a WHERE a.id=free_google_nonces.account_id AND a.session_version=free_google_nonces.session_version)) RETURNING token_hash`)
      .bind(challenge.token_hash, challenge.nonce_hash, now()).first();
    if (!consumed) throw googleFailure('google_nonce_expired', 401);
    const association = await db.prepare('SELECT account_id FROM free_google_identities WHERE sub=?').bind(claims.sub).first();
    if (challenge.intent === 'signin' && association) {
      const account = await accountById(env, association.account_id);
      if (!account) throw googleFailure('session_changed', 409);
      const token = await issueSession(env, account);
      if (!token) throw googleFailure('session_changed', 409);
      return json({...await accountView(env, account), state: 'signed_in'}, 200, [clearGoogleNonceCookie(), clearGoogleProofCookie(), cookie(token)]);
    }
    if (challenge.intent === 'link') {
      if (association && association.account_id !== user.id) throw googleFailure('google_link_conflict', 409);
      if (!user.email || user.email !== claims.email) throw googleFailure('google_email_mismatch', 409);
    }
    const proofToken = randomToken(), time = now();
    const proof = {...claims, token_hash: hash(proofToken), created: time, expires: time + GOOGLE_FLOW_SECONDS, intent: challenge.intent, account_id: challenge.account_id, session_version: challenge.session_version};
    await db.prepare('INSERT INTO free_google_proofs(token_hash,sub,email,email_authoritative,created,expires,intent,account_id,session_version) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(proof.token_hash, proof.sub, proof.email, proof.email_authoritative ? 1 : 0, time, proof.expires, proof.intent, proof.account_id, proof.session_version).run();
    return json({ok: true, ...await pendingView(env, proof)}, 200, [clearGoogleNonceCookie(), googleProofCookie(proofToken)]);
  }

  const user = await getAccount(request, env);
  assertIdentity(user, body.account_id);
  if (body.confirmed !== true) throw googleFailure('consent_required');
  const proof = await getGoogleProof(request, env);
  if (!proof) throw googleFailure('google_proof_required', 401);
  if (proof.account_id) assertIdentity(user, proof.account_id, proof.session_version);
  if (!user.email || proof.email !== user.email) throw googleFailure('google_email_mismatch', 409);
  if (!validPassword(body.password)) throw googleFailure('invalid_credentials', 401);
  if (!await consumeRate(env, 'auth-ip', ip, 20, 900) || !await consumeRate(env, 'sensitive-account', user.id, 5, 900)) throw googleFailure('rate_limited', 429);
  const record = await db.prepare('SELECT password_hash FROM free_accounts WHERE id=? AND session_version=?').bind(user.id, user.session_version).first();
  if (!record || !await verifyPassword(body.password, record.password_hash)) throw googleFailure('invalid_credentials', 401);
  try {
    await db.batch([
      db.prepare(`INSERT INTO free_google_identities(sub,account_id,created)
        VALUES((SELECT p.sub FROM free_google_proofs p JOIN free_accounts a ON a.id=? JOIN free_account_identities i ON i.account_id=a.id
          WHERE p.token_hash=? AND p.expires>? AND p.email=i.email AND a.session_version=? AND a.password_hash=?
          AND (p.account_id IS NULL OR (p.account_id=a.id AND p.session_version=a.session_version))),?,?)
        ON CONFLICT(sub) DO UPDATE SET account_id=CASE WHEN free_google_identities.account_id=excluded.account_id THEN excluded.account_id ELSE NULL END`)
        .bind(user.id, proof.token_hash, now(), user.session_version, record.password_hash, user.id, now()),
      db.prepare(`UPDATE free_account_identities SET email_verified=1,email_verified_at=COALESCE(email_verified_at,?)
        WHERE account_id=? AND email=? AND EXISTS(SELECT 1 FROM free_google_proofs WHERE token_hash=? AND email_authoritative=1 AND expires>?)`)
        .bind(now(), user.id, proof.email, proof.token_hash, now()),
      db.prepare('DELETE FROM free_google_proofs WHERE token_hash=?').bind(proof.token_hash),
    ]);
  } catch (error) {
    if (/constraint|NOT NULL|UNIQUE/i.test(error?.message || '')) throw googleFailure('google_link_conflict', 409);
    throw error;
  }
  return json({...await accountView(env, await accountById(env, user.id)), state: 'linked'}, 200, [clearGoogleProofCookie()]);
}

export async function onRequest({request, env}) {
  try { return await route(request, env); }
  catch (error) {
    const known = error?.code && Number.isInteger(error.status);
    return json({ok: false, error: known ? error.code : 'unavailable'}, known ? error.status : 503);
  }
}
