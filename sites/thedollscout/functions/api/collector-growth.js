import {cachedAggregate} from '../../lib/aggregate-cache.js';
import {COLLECTOR_EVENTS, collectorEventAllowed, MCP_EVENT, MCP_RESULTS, MCP_TOOLS} from '../../lib/collector-measurement.js';
import {databaseFailure} from './doc-events.js';

// Release marker, not a rolling date or a date inferred from the first visitor.
// This instrumentation is deployed on 2026-10-11 UTC. That partial day is excluded.
export const FIRST_FULL_UTC_DAY = '2026-10-12';
const EVENTS = [...COLLECTOR_EVENTS, MCP_EVENT];
export const COLLECTOR_QUERY = `SELECT d,ev,path,
 CASE WHEN ev='${MCP_EVENT}' AND ref IN ('result','no_result') THEN ref ELSE '' END AS result,
 COUNT(*) AS n FROM hits WHERE d>=? AND d<? AND ev IN (${EVENTS.map(e=>`'${e}'`).join(',')})
 GROUP BY d,ev,path,result LIMIT 10001`;

export function usesDateRangeIndex(rows) {
  // Accept the existing index's real name; never assume a fixture's index name.
  const details = rows.map(row => String(row.detail || ''));
  return details.some(detail => /\bSEARCH hits USING (?:COVERING )?INDEX\b/i.test(detail) && /\bd>\?/.test(detail) && /\bd<\?/.test(detail)) && !details.some(detail => /\bSCAN hits\b/i.test(detail));
}

export function collectorWindow(now = new Date()) {
  const end = now.toISOString().slice(0,10);
  const start = new Date(end+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-28);
  const expected = start.toISOString().slice(0,10), measured = expected > FIRST_FULL_UTC_DAY ? expected : FIRST_FULL_UTC_DAY;
  const days = Math.max(0, Math.round((Date.parse(end)-Date.parse(measured))/86400000));
  return {first_full_utc_day:FIRST_FULL_UTC_DAY,expected28dWindow:{start:expected,end_exclusive:end},
    measuredWindow:days ? {start:measured,end_exclusive:end} : null,coveredDays:days,full28Days:days===28,
    coverage:days ? 'measured_complete_utc_days' : 'pending_first_complete_day'};
}

export function aggregateCollector(rows) {
  const browser = [], mcp = [];
  for (const row of rows) {
    const n = Number(row.n);
    if (!Number.isSafeInteger(n) || n < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.d)) throw Error('Invalid aggregate');
    if (COLLECTOR_EVENTS.has(row.ev) && collectorEventAllowed(row.ev,row.path)) browser.push({date:row.d,event:row.ev,path:row.path,n});
    if (row.ev === MCP_EVENT && row.path.startsWith('/mcp/') && MCP_TOOLS.has(row.path.slice(5)) && MCP_RESULTS.has(row.result)) mcp.push({date:row.d,tool:row.path.slice(5),result:row.result,n});
  }
  browser.sort((a,b)=>a.date.localeCompare(b.date)||a.path.localeCompare(b.path)||a.event.localeCompare(b.event));
  mcp.sort((a,b)=>a.date.localeCompare(b.date)||a.tool.localeCompare(b.tool)||a.result.localeCompare(b.result));
  return {browser,mcp,counts:{browser_actions:browser.reduce((n,row)=>n+row.n,0),mcp_tool_calls:mcp.reduce((n,row)=>n+row.n,0)}};
}

const json = (value,status=200) => Response.json(value,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
export async function onRequestGet(ctx) {
  if (!ctx.env.HITS) return json({ok:false,error:'no_db',counts:null},503);
  return cachedAggregate(ctx,async()=>{
    const window = collectorWindow();
    const bounds = [window.measuredWindow?.start || FIRST_FULL_UTC_DAY, window.expected28dWindow.end_exclusive];
    try {
      // EXPLAIN reads metadata only. Reject an unindexed plan before scanning rows.
      const plan = await ctx.env.HITS.prepare('EXPLAIN QUERY PLAN '+COLLECTOR_QUERY).bind(...bounds).all();
      if (plan.success === false) throw Error('Query plan failed');
      if (!usesDateRangeIndex(plan.results || [])) return json({ok:false,error:'missing_date_index',reason:'schema',counts:null},503);
      const base = {ok:true,...window,generated:new Date().toISOString(),cache_seconds:300,
        unit:'anonymous_events_not_users',
        notes:'Browser actions are deduplicated per event per page load. Export records a generated download action, not a verified saved file or share. MCP counts validated successful tools/call responses; no_result is separate. No user, session, citation, attribution or revenue measurement. QA and declared privacy opt-outs are excluded; open requests and user agents can be spoofed. Historical periods and the partial release day are excluded. Zero means no stored eligible events in a successfully queried measured window; silent write failures and unreported outages cannot be reconstructed.'};
      if (!window.coveredDays) return json({...base,counts:null,browser:[],mcp:[],query_rows_read:0});
      const result = await ctx.env.HITS.prepare(COLLECTOR_QUERY).bind(...bounds).all();
      if (result.success === false) throw Error('Aggregate query failed');
      if (!Array.isArray(result.results)) throw Error('Missing aggregate rows');
      if (result.results.length > 10000) return json({ok:false,error:'aggregate_capacity',counts:null},503);
      return json({...base,...aggregateCollector(result.results),query_rows_read:result.meta?.rows_read??null});
    } catch (error) { return json({ok:false,error:'query_failed',reason:databaseFailure(error),counts:null},503); }
  });
}
