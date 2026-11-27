import {qualityEligible, trafficClass} from './traffic-controls.mjs';

export const AI_TRADE_QUOTE = 'bpj_trade_export_quote';
export const TRADE_QUOTE_DAILY_TABLE = 'bpj_ai_trade_quote_daily';
export const TRADE_QUOTE_RETENTION_DAYS = 35;

const path = '/api/ai-mcp';
const executionOutcomes = new Set(['costs_entered', 'provisional', 'invalid']);
const operatorAgent = /^(?:bpj-ci-selfcheck|agi-site-mcp-registration)(?:[ /]|$)/i;
const indexerAgent = /\b(?:Googlebot|bingbot|GPTBot|OAI-SearchBot|ClaudeBot|Claude-SearchBot|PerplexityBot|Applebot|Bytespider|DuckDuckBot)\b/i;
const lastPruned = new WeakMap();
const dayMs = 86400000;
const utcDay = time => new Date(time).toISOString().slice(0, 10);

const schema = `CREATE TABLE IF NOT EXISTS ${TRADE_QUOTE_DAILY_TABLE} (
  day TEXT NOT NULL, form TEXT NOT NULL, outcome TEXT NOT NULL, caller_signal TEXT NOT NULL,
  n INTEGER NOT NULL, PRIMARY KEY(day,form,outcome,caller_signal)
) WITHOUT ROWID`;

function signal(request, sample) {
  const url = new URL(request.url);
  const agent = request.headers.get('user-agent') || '';
  if (url.origin !== 'https://baipiaoji.com' || url.pathname.replace(/\/+$/, '') !== path ||
      !qualityEligible(request, path, '') || request.headers.has('x-probe') || operatorAgent.test(agent)) return null;
  if (request.cf?.botManagement?.verifiedBot === true) return 'edge_verified_bot';
  if (indexerAgent.test(agent)) return 'ua_indexer_hint';
  if (sample) return 'sample_fixture';
  switch (trafficClass(request)) {
    case 'declared_automation': return 'ua_automation_hint';
    case 'ua_anomaly': return 'ua_anomaly_hint';
    default: return 'unknown';
  }
}

export function isTradeQuoteExample(inputs, example) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs) || !example) return false;
  const keys = Object.keys(example);
  return Object.keys(inputs).length === keys.length &&
    keys.every(key => Object.hasOwn(inputs, key) && inputs[key] === example[key]);
}

export async function recordAiTradeQuote(db, request, {form, outcome, sample = false}, now = Date.now()) {
  const valid = form === 'discovery' ? outcome === 'listed' :
    (form === 'direct' || form === 'wrapper') && executionOutcomes.has(outcome);
  if (!db || !valid) return false;
  try {
    const caller = signal(request, sample);
    if (!caller) return false;
    const day = utcDay(now);
    const prune = lastPruned.get(db) !== day;
    const write = async () => {
      const upsert = db.prepare(`INSERT INTO ${TRADE_QUOTE_DAILY_TABLE} (day,form,outcome,caller_signal,n) VALUES (?,?,?,?,1)
        ON CONFLICT(day,form,outcome,caller_signal) DO UPDATE SET n=n+1`).bind(day,form,outcome,caller);
      if (!prune) return upsert.run();
      const cutoff = utcDay(now - (TRADE_QUOTE_RETENTION_DAYS - 1) * dayMs);
      return db.batch([upsert, db.prepare(`DELETE FROM ${TRADE_QUOTE_DAILY_TABLE} WHERE day<?`).bind(cutoff)]);
    };
    try {
      await write();
    } catch (error) {
      if (!String(error?.message).includes('no such table: ' + TRADE_QUOTE_DAILY_TABLE)) throw error;
      await db.prepare(schema).run();
      await write();
    }
    if (prune) lastPruned.set(db, day);
    return true;
  } catch {
    return false;
  }
}
