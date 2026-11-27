const actions = ['signup_open', 'ready_own', 'ready_demo', 'needs_info_own', 'needs_info_demo'];
const prefix = '/trade-quote/';

export function parseTradeQuoteEvent(path) {
  if (!path.startsWith(prefix)) return null;
  const action = path.slice(prefix.length);
  return actions.includes(action) ? action : null;
}

export const emptyTradeQuoteCounts = () => Object.fromEntries(actions.map(action => [action, 0]));

// Every attributed account owns one immutable source row. Exclude test accounts
// and return a null read on missing coverage instead of inventing a zero.
const ATTRIBUTED_ACCOUNTS_SQL = `SELECT COUNT(*) total,
  COUNT(*) FILTER (WHERE i.email_verified = 1) email_verified_total,
  COUNT(*) FILTER (WHERE a.created >= ? AND a.created < ?) created,
  COUNT(*) FILTER (WHERE a.created >= ? AND a.created < ? AND i.email_verified = 1) email_verified
 FROM free_account_signup_sources s JOIN free_accounts a ON a.id = s.account_id
 LEFT JOIN free_account_identities i ON i.account_id = a.id
 WHERE s.source = 'bpj_trade_quote' AND a.qa = 0`;

export async function readTradeQuoteAccounts(db, startSeconds, endSeconds) {
  try {
    const counts = await db.prepare(ATTRIBUTED_ACCOUNTS_SQL)
      .bind(startSeconds,endSeconds,startSeconds,endSeconds).first();
    if (!counts) return null;
    const {total,email_verified_total,created,email_verified} = counts;
    if (![total,email_verified_total,created,email_verified].every(n=>Number.isSafeInteger(n)&&n>=0) ||
        email_verified_total>total || created>total || email_verified>created) return null;
    return {total,email_verified_total,created,email_verified};
  } catch { return null; }
}
