import {TRADE_QUOTE_SIGNUP_SOURCE,TRADE_WORKBENCH_SIGNUP_SOURCE} from './trade-signup-source.mjs';

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
const ATTRIBUTED_ACCOUNTS_SQL = `SELECT s.source, COUNT(*) total,
  COUNT(*) FILTER (WHERE i.email_verified = 1) email_verified_total,
  COUNT(*) FILTER (WHERE a.created >= ? AND a.created < ?) created,
  COUNT(*) FILTER (WHERE a.created >= ? AND a.created < ? AND i.email_verified = 1) email_verified
 FROM free_account_signup_sources s JOIN free_accounts a ON a.id = s.account_id
 LEFT JOIN free_account_identities i ON i.account_id = a.id
 WHERE s.source IN (?,?) AND a.qa = 0 GROUP BY s.source`;

export async function readTradeSignupAccounts(db, startSeconds, endSeconds) {
  try {
    const {results,success} = await db.prepare(ATTRIBUTED_ACCOUNTS_SQL)
      .bind(startSeconds,endSeconds,startSeconds,endSeconds,TRADE_QUOTE_SIGNUP_SOURCE,TRADE_WORKBENCH_SIGNUP_SOURCE).all();
    if (success===false || !Array.isArray(results)) return null;
    const counts = new Map([TRADE_QUOTE_SIGNUP_SOURCE,TRADE_WORKBENCH_SIGNUP_SOURCE]
      .map(source=>[source,{total:0,email_verified_total:0,created:0,email_verified:0}]));
    for (const {source,total,email_verified_total,created,email_verified} of results) {
      const valid = [total,email_verified_total,created,email_verified].every(n=>Number.isSafeInteger(n)&&n>=0) &&
        email_verified_total<=total && created<=total && email_verified<=Math.min(created,email_verified_total);
      counts.set(source,valid ? {total,email_verified_total,created,email_verified} : null);
    }
    return counts;
  } catch { return null; }
}
