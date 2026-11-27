import {hash, randomToken, tokenFrom} from './free-account.js';
import {TRADE_MCP_KEY_TABLE} from './trade-workbench-access.mjs';

export {recordTradeMcpRun} from './trade-workbench-access.mjs';
export const TRADE_MCP_KEY_PREFIX = 'bpj_trade_';
export const TRADE_MCP_SCOPE = 'trade-tools:run';
export const TRADE_MCP_KEY_LIMITS = Object.freeze({activeKeys: 3, ttlDays: 90});
const keyPattern = new RegExp(`^${TRADE_MCP_KEY_PREFIX}[A-Za-z0-9_-]{43}$`);
const keySchema = `CREATE TABLE IF NOT EXISTS ${TRADE_MCP_KEY_TABLE} (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES free_accounts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL
)`;
const keyOwnerIndex = `CREATE INDEX IF NOT EXISTS bpj_trade_mcp_keys_owner ON ${TRADE_MCP_KEY_TABLE}(account_id,version,expires)`;

function missingKeyTable(error) {
  return String(error?.message ?? '').toLowerCase().includes('no such table: ' + TRADE_MCP_KEY_TABLE);
}

export async function resolveTradeMcpPrincipal(db, rawBearer, now) {
  if (typeof rawBearer !== 'string' || !keyPattern.test(rawBearer)) return null;
  const keyHash = hash(rawBearer);
  try {
    const row = await db.prepare(`SELECT k.id AS keyId,a.id AS accountId,a.session_version AS sessionVersion
      FROM ${TRADE_MCP_KEY_TABLE} k JOIN free_accounts a ON a.id=k.account_id AND a.session_version=k.version
      WHERE k.token_hash=? AND k.expires>?`).bind(keyHash, now).first();
    return row ? {...row, keyHash} : null;
  } catch (error) {
    if (missingKeyTable(error)) return null;
    throw error;
  }
}

const browserSession = `SELECT a.id,a.session_version FROM free_accounts a JOIN free_account_sessions s
  ON s.account_id=a.id AND s.version=a.session_version
  WHERE a.id=? AND a.session_version=? AND s.token_hash=? AND s.expires>?`;
const sessionArgs = (request, account, now) => [account.id, account.session_version, hash(tokenFrom(request)), now];

export async function listTradeMcpKeys(db, request, account, now) {
  let keys = [];
  try {
    const result = await db.prepare(`SELECT k.id,k.label,k.created,k.expires FROM ${TRADE_MCP_KEY_TABLE} k
      JOIN (${browserSession}) a ON k.account_id=a.id AND k.version=a.session_version
      WHERE k.expires>? ORDER BY k.created DESC,k.id LIMIT ?`)
      .bind(...sessionArgs(request, account, now), now, TRADE_MCP_KEY_LIMITS.activeKeys).all();
    keys = result.results;
  } catch (error) {
    if (!missingKeyTable(error)) throw error;
  }
  return {ok: true, scope: TRADE_MCP_SCOPE, limits: TRADE_MCP_KEY_LIMITS, keys};
}

export async function changeTradeMcpKey(db, request, account, command, now) {
  const session = sessionArgs(request, account, now);
  const expires = now + TRADE_MCP_KEY_LIMITS.ttlDays * 86400;
  // Removing the row revokes the key for both the next lookup and an in-flight quota claim.
  if (command.action === 'revoke') {
    try {
      const row = await db.prepare(`DELETE FROM ${TRADE_MCP_KEY_TABLE}
        WHERE id=? AND account_id=? AND version=? AND EXISTS (${browserSession}) RETURNING id`)
        .bind(command.id, account.id, account.session_version, ...session).first();
      return row ? {ok: true} : {ok: false, code: 'key_not_found'};
    } catch (error) {
      if (missingKeyTable(error)) return {ok: false, code: 'key_not_found'};
      throw error;
    }
  }

  const key = TRADE_MCP_KEY_PREFIX + randomToken();
  const tokenHash = hash(key);
  if (command.action === 'rotate') {
    try {
      const row = await db.prepare(`UPDATE ${TRADE_MCP_KEY_TABLE} SET id=?,token_hash=?,created=?,expires=?
        WHERE id=? AND account_id=? AND version=? AND expires>? AND EXISTS (${browserSession}) RETURNING id`)
        .bind(crypto.randomUUID(), tokenHash, now, expires, command.id, account.id, account.session_version, now, ...session).first();
      return row ? {ok: true, key} : {ok: false, code: 'key_not_found'};
    } catch (error) {
      if (missingKeyTable(error)) return {ok: false, code: 'key_not_found'};
      throw error;
    }
  }

  const create = async () => {
    await db.prepare(`DELETE FROM ${TRADE_MCP_KEY_TABLE} WHERE account_id=? AND (version<? OR expires<=?) AND EXISTS (${browserSession})`)
      .bind(account.id, account.session_version, now, ...session).run();
    return db.prepare(`INSERT INTO ${TRADE_MCP_KEY_TABLE}(id,account_id,version,token_hash,label,created,expires)
      SELECT ?,a.id,a.session_version,?,?,?,? FROM (${browserSession}) a
      WHERE (SELECT COUNT(*) FROM ${TRADE_MCP_KEY_TABLE} k
        WHERE k.account_id=a.id AND k.version=a.session_version AND k.expires>?)<? RETURNING id`)
      .bind(crypto.randomUUID(), tokenHash, command.label, now, expires, ...session, now, TRADE_MCP_KEY_LIMITS.activeKeys).first();
  };
  let row;
  try {
    row = await create();
  } catch (error) {
    if (!missingKeyTable(error)) throw error;
    await db.batch([db.prepare(keySchema), db.prepare(keyOwnerIndex)]);
    row = await create();
  }
  if (!row) {
    const current = await db.prepare(browserSession).bind(...session).first();
    return {ok: false, code: current ? 'key_limit' : 'account_changed'};
  }
  return {ok: true, key};
}
