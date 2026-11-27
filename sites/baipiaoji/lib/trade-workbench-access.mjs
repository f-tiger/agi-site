import {hash, tokenFrom} from './free-account.js';
import {memberStatus} from './membership.js';

export const FREE_DAILY_RUNS = 10;
export const MEMBER_DAILY_RUNS = 100;
export const TRADE_MCP_KEY_TABLE = 'bpj_trade_mcp_keys';

const usageTable = 'bpj_trade_workbench_daily';
const usageSchema = `CREATE TABLE IF NOT EXISTS ${usageTable} (
  account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE,
  utc_day TEXT NOT NULL,
  runs INTEGER NOT NULL CHECK (runs >= 1 AND runs <= ${MEMBER_DAILY_RUNS})
)`;

function missingTable(error, table) {
  return String(error?.message ?? '').toLowerCase().includes('no such table: ' + table);
}

export function utcDay(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export async function workbenchMember(db, accountId, now) {
  try {
    const member = await db.prepare(`SELECT m.ends_at,m.suspended
      FROM bpj_account_members l JOIN wb_members m ON m.id=l.member_id
      WHERE l.account_id=?`).bind(accountId).first();
    return memberStatus(member, now).active;
  } catch (error) {
    // The account bridge makes this table on first use. Nothing is linked yet.
    if (missingTable(error, 'bpj_account_members')) return false;
    throw error;
  }
}

export async function workbenchUsage(db, accountId, day) {
  try {
    const row = await db.prepare(`SELECT runs FROM ${usageTable}
      WHERE account_id=? AND utc_day=?`).bind(accountId, day).first();
    return row?.runs ?? 0;
  } catch (error) {
    if (missingTable(error, usageTable)) return 0;
    throw error;
  }
}

export function workbenchAllowance(activeMember, used) {
  const limit = activeMember ? MEMBER_DAILY_RUNS : FREE_DAILY_RUNS;
  return {access: activeMember ? 'member' : 'free', limit, remaining: Math.max(0, limit - used)};
}

async function recordRun(db, accountId, sessionVersion, credentialTable, credentialHash, activeMember, now) {
  const limit = activeMember ? MEMBER_DAILY_RUNS : FREE_DAILY_RUNS;
  const membershipGuard = activeMember ? `AND EXISTS (
    SELECT 1 FROM bpj_account_members l JOIN wb_members m ON m.id=l.member_id
    WHERE l.account_id=a.id AND m.suspended=0 AND m.ends_at>?
  )` : '';
  const query = `INSERT INTO ${usageTable}(account_id,utc_day,runs)
    SELECT a.id,?,1 FROM free_accounts a JOIN ${credentialTable} credential
      ON credential.account_id=a.id AND credential.version=a.session_version
    WHERE a.id=? AND a.session_version=? AND credential.token_hash=? AND credential.expires>?
      ${membershipGuard}
    ON CONFLICT(account_id) DO UPDATE SET
      utc_day=excluded.utc_day,
      runs=CASE WHEN utc_day=excluded.utc_day THEN runs+1 ELSE 1 END
    WHERE utc_day<excluded.utc_day OR (utc_day=excluded.utc_day AND runs<?)
    RETURNING runs`;
  const args = [utcDay(now), accountId, sessionVersion, credentialHash, now];
  if (activeMember) args.push(now);
  args.push(limit);

  const claim = () => db.prepare(query).bind(...args).first();
  try {
    return await claim();
  } catch (error) {
    if (!missingTable(error, usageTable)) throw error;
    await db.prepare(usageSchema).run();
    return claim();
  }
}

export function recordWorkbenchRun(db, request, account, activeMember, now) {
  return recordRun(db, account.id, account.session_version, 'free_account_sessions', hash(tokenFrom(request)), activeMember, now);
}

export function recordTradeMcpRun(db, principal, activeMember, now) {
  return recordRun(db, principal.accountId, principal.sessionVersion, TRADE_MCP_KEY_TABLE, principal.keyHash, activeMember, now);
}
