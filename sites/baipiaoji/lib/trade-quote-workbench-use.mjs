import {hash, now, tokenFrom} from './free-account.js';
import {utcDay} from './trade-workbench-access.mjs';
import {TRADE_QUOTE_SIGNUP_SOURCE} from './trade-signup-source.mjs';

const table = 'bpj_trade_quote_workbench_use';
const setup = `CREATE TABLE IF NOT EXISTS ${table} (
  account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE,
  first_day TEXT NOT NULL,
  repeat_day TEXT CHECK (repeat_day IS NULL OR repeat_day > first_day)
) WITHOUT ROWID`;

// Store only the earliest two different UTC days. Retries on the same day
// do not grow the table or change the first-use and repeat-use milestones.
const record = `INSERT INTO ${table}(account_id,first_day)
 SELECT a.id,? FROM free_accounts a
 JOIN free_account_sessions session ON session.account_id=a.id AND session.version=a.session_version
 JOIN free_account_signup_sources source ON source.account_id=a.id
 WHERE a.id=? AND a.qa=0 AND session.token_hash=? AND session.expires>? AND source.source=?
 ON CONFLICT(account_id) DO UPDATE SET
   repeat_day=CASE WHEN excluded.first_day<first_day THEN first_day ELSE excluded.first_day END,
   first_day=MIN(first_day,excluded.first_day)
 WHERE excluded.first_day<first_day OR
   (excluded.first_day>first_day AND (repeat_day IS NULL OR excluded.first_day<repeat_day))`;

const missingTable = (error, name) => new RegExp(`no such table:\\s*(?:main\\.)?${name}\\b`, 'i').test(String(error?.message || error));

export async function recordTradeQuoteWorkbenchUse(db, request, accountId, acceptedAt) {
  const write = () => db.prepare(record)
    .bind(utcDay(acceptedAt),accountId,hash(tokenFrom(request)),now(),TRADE_QUOTE_SIGNUP_SOURCE).run();
  try {
    await write();
  } catch (error) {
    if (missingTable(error, 'free_account_signup_sources')) return;
    if (!missingTable(error, table)) throw error;
    const source = await db.prepare('SELECT source FROM free_account_signup_sources WHERE account_id=?')
      .bind(accountId).first().catch(error => {
        if (missingTable(error, 'free_account_signup_sources')) return null;
        throw error;
      });
    if (source?.source !== TRADE_QUOTE_SIGNUP_SOURCE) return;
    await db.prepare(setup).run();
    await write();
  }
}

export async function readTradeQuoteWorkbenchUse(db, start, end) {
  try {
    const counts = await db.prepare(`SELECT
      COUNT(*) FILTER (WHERE first_day < ?) first_use_total,
      COUNT(*) FILTER (WHERE repeat_day < ?) repeat_use_total,
      COUNT(*) FILTER (WHERE first_day >= ? AND first_day < ?) first_use,
      COUNT(*) FILTER (WHERE repeat_day >= ? AND repeat_day < ?) repeat_use
     FROM ${table} usage
     JOIN free_accounts a ON a.id=usage.account_id
     JOIN free_account_signup_sources source ON source.account_id=a.id
     WHERE a.qa=0 AND source.source=?`).bind(end,end,start,end,start,end,TRADE_QUOTE_SIGNUP_SOURCE).first();
    return counts ?? null;
  } catch { return null; }
}
