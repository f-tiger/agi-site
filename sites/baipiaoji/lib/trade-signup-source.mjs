import {consumeRate,ensureAccounts,hash,now,randomToken} from './free-account.js';
import {qualityEligible,trafficClass} from './traffic-controls.mjs';

export const TRADE_QUOTE_SIGNUP_SOURCE = 'bpj_trade_quote';
const SOURCE_PATHS = new Set(['/studio/ai/trade-export-quote','/en/studio/ai/trade-export-quote']);
const CLAIM_TABLE = 'free_account_signup_claims';
const SOURCE_TABLE = 'free_account_signup_sources';
const BROWSER_COOKIE = '__Host-bpj_signup_source';
const CLAIM_SECONDS = 1800;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const HOST = 'https://baipiaoji.com';

function browserToken(request) {
 const values = (request.headers.get('Cookie')||'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(BROWSER_COOKIE+'='));
 const token = values.length===1 ? values[0].slice(BROWSER_COOKIE.length+1) : '';
 return TOKEN.test(token) ? token : null;
}

function claimHash(browser,claim) {
 return hash('bpj:signup-source:v1:'+browser+':'+claim);
}

function eligibleOrigin(request) {
 if (new URL(request.url).origin!==HOST || request.headers.get('Origin')!==HOST || request.headers.get('Sec-Fetch-Site')!=='same-origin') return false;
 if (['verified_bot','declared_automation'].includes(trafficClass(request))) return false;
 return qualityEligible(request,'/api/account','');
}

export async function issueTradeSignupSource(request,env,ip) {
 if (!eligibleOrigin(request)) return null;
 let referrer;
 try { referrer=new URL(request.headers.get('referer')||''); } catch { return null; }
 if (referrer.origin!==HOST || !SOURCE_PATHS.has(referrer.pathname)) return null;
 const db=env.HITS;
 const time=now(),browser=browserToken(request)||randomToken(),claim=randomToken();
 try {
  await ensureAccounts(env);
  if (!await consumeRate(env,'trade-signup-source',ip,20,900)) return null;
  await db.batch([
   db.prepare(`CREATE TABLE IF NOT EXISTS ${CLAIM_TABLE} (claim_hash TEXT PRIMARY KEY, source TEXT NOT NULL, expires INTEGER NOT NULL)`),
   db.prepare(`CREATE INDEX IF NOT EXISTS free_account_signup_claims_expires ON ${CLAIM_TABLE}(expires)`),
   db.prepare(`CREATE TABLE IF NOT EXISTS ${SOURCE_TABLE} (account_id TEXT PRIMARY KEY REFERENCES free_accounts(id) ON DELETE CASCADE, source TEXT NOT NULL)`),
   db.prepare(`DELETE FROM ${CLAIM_TABLE} WHERE claim_hash IN (SELECT claim_hash FROM ${CLAIM_TABLE} WHERE expires<=? ORDER BY expires LIMIT 200)`).bind(time),
   db.prepare(`INSERT INTO ${CLAIM_TABLE}(claim_hash,source,expires) VALUES(?,?,?)`).bind(claimHash(browser,claim),TRADE_QUOTE_SIGNUP_SOURCE,time+CLAIM_SECONDS),
  ]);
 } catch { return null; }
 return {claim,cookie:`${BROWSER_COOKIE}=${browser}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${CLAIM_SECONDS}`};
}

// The source row and claim deletion belong to the account creation batch. The
// account still commits when a claim expires or has already been redeemed.
export function tradeSignupSourceStatements(request,db,claim,accountId,created,qa) {
 if (qa || typeof claim!=='string' || !TOKEN.test(claim) || !eligibleOrigin(request)) return [];
 let referrer;
 try { referrer=new URL(request.headers.get('referer')||''); } catch { return []; }
 if (referrer.origin!==HOST || !['/account','/en/account'].includes(referrer.pathname) ||
     ['fleet','state','challenge'].some(flag=>referrer.searchParams.has(flag))) return [];
 const browser=browserToken(request);
 if (!browser) return [];
 const hashed=claimHash(browser,claim);
 return [
  db.prepare(`INSERT INTO ${SOURCE_TABLE}(account_id,source) SELECT ?,source FROM ${CLAIM_TABLE}
    WHERE claim_hash=? AND source=? AND expires>?`).bind(accountId,hashed,TRADE_QUOTE_SIGNUP_SOURCE,created),
  db.prepare(`DELETE FROM ${CLAIM_TABLE} WHERE claim_hash=? AND EXISTS(SELECT 1 FROM ${SOURCE_TABLE} WHERE account_id=?)`).bind(hashed,accountId),
 ];
}

export function missingTradeSignupSourceSchema(error) {
 return /no such table:\s*(?:main\.)?free_account_signup_(?:claims|sources)\b/i.test(String(error?.message||error));
}
