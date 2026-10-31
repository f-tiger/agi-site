import {cachedAggregate} from '../../lib/aggregate-cache.js';
import {COLLECTOR_EVENTS, collectorEventAllowed, MCP_EVENT, MCP_RESULTS, MCP_TOOLS, MCP_TOOL_RELEASES, MCP_TOOL_FIRST_FULL_DAY} from '../../lib/collector-measurement.js';
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
  return details.some(detail => {
    const constraints=/^SEARCH hits USING (?:COVERING )?INDEX .+ \(([^()]*)\)$/i.exec(detail)?.[1];
    return constraints && /\bd>\?/.test(constraints) && /\bd<\?/.test(constraints);
  }) && !details.some(detail => /\bSCAN hits\b/i.test(detail));
}

export function resultRows(result) {
  if (!result || result.success === false || !Array.isArray(result.results)) throw Error('Database metadata or query unavailable');
  return result.results;
}

function quoteIndex(name) {
  if (typeof name !== 'string' || !name || name.length > 128 || /[\u0000-\u001f\u007f]/.test(name)) throw Error('Invalid index metadata');
  return '"'+name.replaceAll('"','""')+'"';
}

export async function findDateIndex(read) {
  const indexes=resultRows(await read('PRAGMA index_list(hits)'));
  if (indexes.length > 32) throw Error('Index metadata capacity exceeded');
  // Malformed metadata is a failure, never evidence that an index is absent.
  for (const index of indexes) {
    quoteIndex(index.name);
    if (![0,1].includes(index.partial)) throw Error('Invalid index metadata');
  }
  for (const index of indexes) {
    if (index.partial) continue;
    const columns=resultRows(await read('PRAGMA index_info('+quoteIndex(index.name)+')'));
    if (!columns.length || columns.some(column=>!Number.isSafeInteger(column.seqno) || column.seqno<0 || !Number.isSafeInteger(column.cid) || column.cid < -2 || column.name!==null && typeof column.name!=='string')) throw Error('Invalid index column metadata');
    const first=columns.find(column=>column.seqno===0);
    if (!first) throw Error('Invalid index column metadata');
    if (first.cid >= 0 && first.name === 'd') return index.name;
  }
  return null;
}

export function indexedCollectorQuery(index) {
  return COLLECTOR_QUERY.replace('FROM hits WHERE','FROM hits INDEXED BY '+quoteIndex(index)+' WHERE');
}

export async function collectorQueryWithPlan(read,bounds) {
  let sql=COLLECTOR_QUERY;
  if (usesDateRangeIndex(resultRows(await read('EXPLAIN QUERY PLAN '+sql,bounds)))) return sql;
  // SQLite can prefer an ev index even while a full date-leading index exists.
  // Force only a real, non-partial date-leading index verified from metadata.
  const index=await findDateIndex(read);
  if (!index) return null;
  sql=indexedCollectorQuery(index);
  if (!usesDateRangeIndex(resultRows(await read('EXPLAIN QUERY PLAN '+sql,bounds)))) throw Object.assign(Error('Date index plan rejected'),{collectorIndexCode:'date_index_plan_rejected'});
  return sql;
}

export function collectorWindow(now = new Date()) {
  const end = now.toISOString().slice(0,10);
  const start = new Date(end+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-28);
  const expected = start.toISOString().slice(0,10), measured = expected > FIRST_FULL_UTC_DAY ? expected : FIRST_FULL_UTC_DAY;
  const days = Math.max(0, Math.round((Date.parse(end)-Date.parse(measured))/86400000));
  const toolStart=expected>MCP_TOOL_FIRST_FULL_DAY?expected:MCP_TOOL_FIRST_FULL_DAY;
  const toolDays=Math.max(0,Math.round((Date.parse(end)-Date.parse(toolStart))/86400000));
  const toolCoverage=Object.fromEntries(Object.entries(MCP_TOOL_RELEASES).map(([tool,released])=>[tool,{released,first_full_utc_day:MCP_TOOL_FIRST_FULL_DAY,measuredWindow:toolDays?{start:toolStart,end_exclusive:end}:null,coveredDays:toolDays}]));
  return {mcp_tool_coverage:toolCoverage,event_releases:{collector_wish_generate:'2026-10-30',collector_wish_export:'2026-10-30',collector_wish_response_reported:'2026-10-30',collector_wish_fulfilled_reported:'2026-10-30',display_plan_export:'2026-10-29',display_plan_example:'2026-10-29'},event_coverage_note:'Display-plan events start 2026-10-29. Wish-card events start 2026-10-30, with first complete UTC day 2026-10-31. Collection MCP tasks start 2026-10-31, with first complete UTC day 2026-11-01. Earlier absence is unmeasured; the overall window is not coverage for every event or tool.',first_full_utc_day:FIRST_FULL_UTC_DAY,expected28dWindow:{start:expected,end_exclusive:end},
    measuredWindow:days ? {start:measured,end_exclusive:end} : null,coveredDays:days,full28Days:days===28,
    coverage:days ? 'measured_complete_utc_days' : 'pending_first_complete_day'};
}

export function aggregateCollector(rows) {
  const browser = [], mcp = [];
  for (const row of rows) {
    const n = Number(row.n);
    if (!Number.isSafeInteger(n) || n < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.d)) throw Error('Invalid aggregate');
    if (COLLECTOR_EVENTS.has(row.ev) && collectorEventAllowed(row.ev,row.path)) browser.push({date:row.d,event:row.ev,path:row.path,n});
    if (row.ev === MCP_EVENT && row.path.startsWith('/mcp/') && MCP_TOOLS.has(row.path.slice(5)) && MCP_RESULTS.has(row.result) && (!Object.hasOwn(MCP_TOOL_RELEASES,row.path.slice(5)) || row.d>=MCP_TOOL_FIRST_FULL_DAY)) mcp.push({date:row.d,tool:row.path.slice(5),result:row.result,n});
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
      const read=(sql,params=[])=>ctx.env.HITS.prepare(sql).bind(...params).all();
      const query=await collectorQueryWithPlan(read,bounds);
      if (!query) return json({ok:false,error:'missing_date_index',reason:'schema',counts:null},503);
      const base = {ok:true,...window,generated:new Date().toISOString(),cache_seconds:300,
        unit:'anonymous_events_not_users',
        notes:'Wish response/fulfilled events are user-reported local status changes, not verified responses, matches, sales or unique requests. Card export is not proof of publication. Browser actions are deduplicated per event per page load. Export records a generated download action, not a verified saved file or share. MCP counts validated successful tools/call responses; no_result is separate. No user, session, citation, attribution or revenue measurement. QA and declared privacy opt-outs are excluded; open requests and user agents can be spoofed. Historical periods and the partial release day are excluded. Zero means no stored eligible events in a successfully queried measured window; silent write failures and unreported outages cannot be reconstructed.'};
      if (!window.coveredDays) return json({...base,counts:null,browser:[],mcp:[],query_rows_read:0});
      const result = await read(query,bounds),rows=resultRows(result);
      if (rows.length > 10000) return json({ok:false,error:'aggregate_capacity',counts:null},503);
      return json({...base,...aggregateCollector(rows),query_rows_read:result.meta?.rows_read??null});
    } catch (error) { return json({ok:false,error:error.collectorIndexCode==='date_index_plan_rejected'?'date_index_plan_rejected':'query_failed',reason:databaseFailure(error),counts:null},503); }
  });
}
