import {HUB, TOKEN, digest, json, now} from '../../../../tools/fleet-account/config.mjs';

// The existing opaque fleet proof is bound to EcoBack, independently of the
// primary BPJ browser session. The only stored resource is this fixed checklist.
const owner = `SELECT a.id FROM fleet_account_sessions s
 JOIN free_accounts a ON a.id=s.account_id AND a.session_version=s.version
 WHERE s.token_hash=? AND s.host='getecoback.com' AND s.expires>?`;

export async function onRequest({request,env}) {
  const url = new URL(request.url);
  if (url.origin !== HUB || request.headers.has('Origin')) return json({error:'origin_rejected'},403);
  if (request.method !== 'POST') return json({error:'method_not_allowed'},405);
  const action = url.searchParams.get('action');
  if (url.searchParams.size !== 1 || !['read','add','remove'].includes(action)) return json({error:'invalid_action'},400);
  const match = (request.headers.get('Authorization') || '').match(/^Bearer (.+)$/);
  if (!match || !TOKEN.test(match[1])) return json({error:'signin_required'},401);
  if (!env.HITS) return json({error:'unavailable'},503);
  try {
    const db = env.HITS;
    const proof = await digest(match[1]);
    if (!await db.prepare(owner).bind(proof,now()).first()) return json({error:'signin_required'},401);
    // The fleet session above can only exist for an account in this same D1.
    await db.prepare(`CREATE TABLE IF NOT EXISTS fleet_eco_laundry_bookmarks (
      account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE
    )`).run();
    if (action === 'add') {
      await db.prepare('INSERT OR IGNORE INTO fleet_eco_laundry_bookmarks(account_id) '+owner).bind(proof,now()).run();
    } else if (action === 'remove') {
      await db.prepare('DELETE FROM fleet_eco_laundry_bookmarks WHERE account_id IN ('+owner+')').bind(proof,now()).run();
    }
    const status = await db.prepare(`SELECT EXISTS(SELECT 1 FROM fleet_eco_laundry_bookmarks b
      WHERE b.account_id=account.id) AS saved FROM (${owner}) account`).bind(proof,now()).first();
    return status ? json({ok:true,saved:status.saved===1}) : json({error:'signin_required'},401);
  } catch {
    return json({error:'unavailable'},503);
  }
}
