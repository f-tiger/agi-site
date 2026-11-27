import {lookupTdsTool} from '../../collector-assets/tds-suite/index.mjs';
import {cachedAggregate} from '../../lib/aggregate-cache.js';
import {HOME_MCP_EVENT, MCP_CLIENT_SIGNALS, MCP_EVENT, MCP_RESULTS, MCP_TOOLS} from '../../lib/collector-measurement.js';
import {collectorQueryWithPlan, collectorWindow, resultRows} from './collector-growth.js';
import {databaseFailure} from './doc-events.js';

const MAX_ROWS = 25000;
const SIGNALS = new Set(MCP_CLIENT_SIGNALS);
const QUERY = `SELECT ev,path,lang AS signal,ref AS outcome,COUNT(*) AS n,MIN(d) AS first_day,MAX(d) AS last_day
 FROM hits WHERE d>=? AND d<? AND ev IN ('${MCP_EVENT}','${HOME_MCP_EVENT}')
 GROUP BY ev,path,lang,ref LIMIT ${MAX_ROWS + 1}`;
const ENDPOINTS = { [MCP_EVENT]: '/mcp', [HOME_MCP_EVENT]: '/api/home-mcp' };
const json = (value, status = 200) => Response.json(value, {status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});

function eventLabels(row) {
  const endpoint = ENDPOINTS[row.ev];
  if (!endpoint) return null;
  const oldHome = row.ev === HOME_MCP_EVENT && row.path === endpoint && row.outcome === '';
  const tool = typeof row.path === 'string' && row.path.startsWith(endpoint + '/') ? row.path.slice(endpoint.length + 1) : '';
  if (!oldHome && (!MCP_RESULTS.has(row.outcome) ||
      !(row.ev === MCP_EVENT ? MCP_TOOLS.has(tool) : lookupTdsTool(tool)))) return null;
  return {
    endpoint, tool: oldHome ? 'unreported' : tool,
    outcome: oldHome ? 'result' : row.outcome,
    signal: SIGNALS.has(row.signal) ? row.signal : row.signal === '' || row.signal == null ? 'legacy_unclassified' : 'unknown',
  };
}

export function aggregateMcpGrowth(rows, {start, end_exclusive}) {
  const totals = Object.fromEntries(Object.values(ENDPOINTS).map(endpoint => [endpoint, {
    successful_calls: 0, first_recorded_day: null, last_recorded_day: null,
    by_tool: {}, by_outcome: {}, by_client_signal: {},
  }]));
  for (const row of rows) {
    const labels = eventLabels(row);
    if (!labels) continue;
    const n = Number(row.n);
    if (!Number.isSafeInteger(n) || n < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(row.first_day) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.last_day) || row.first_day < start ||
        row.last_day >= end_exclusive || row.first_day > row.last_day) throw new Error('Invalid MCP aggregate');
    const total = totals[labels.endpoint];
    total.successful_calls += n;
    total.first_recorded_day = total.first_recorded_day && total.first_recorded_day < row.first_day ? total.first_recorded_day : row.first_day;
    total.last_recorded_day = total.last_recorded_day && total.last_recorded_day > row.last_day ? total.last_recorded_day : row.last_day;
    total.by_tool[labels.tool] = (total.by_tool[labels.tool] || 0) + n;
    total.by_outcome[labels.outcome] = (total.by_outcome[labels.outcome] || 0) + n;
    total.by_client_signal[labels.signal] = (total.by_client_signal[labels.signal] || 0) + n;
  }
  return totals;
}

export async function onRequestGet(ctx) {
  if (!ctx.env.HITS) return json({ok:false,error:'no_db',endpoints:null},503);
  return cachedAggregate(ctx,async()=>{
    const window = collectorWindow().expected28dWindow;
    const bounds = [window.start, window.end_exclusive];
    try {
      const read = (sql, params = []) => ctx.env.HITS.prepare(sql).bind(...params).all();
      const query = await collectorQueryWithPlan(read, bounds, QUERY);
      if (!query) return json({ok:false,error:'missing_date_index',endpoints:null},503);
      const rows = resultRows(await read(query,bounds));
      if (rows.length > MAX_ROWS) return json({ok:false,error:'aggregate_capacity',endpoints:null},503);
      return json({ok:true,generated:new Date().toISOString(),window,unit:'anonymous_successful_tool_calls',
        endpoints:aggregateMcpGrowth(rows,window),
        notes:'Counts cover stored successful tool responses on complete UTC dates. QA, declared opt-out, and known operator, indexer and demo traffic are excluded by fixed request rules. Client declarations and User-Agent categories can be spoofed, are not authenticated and do not identify visitors, referring sites, repeat use or purchases. Legacy rows can omit client or tool names. First recorded dates are not deployment dates or proof of continuous collection. Zero means no eligible stored rows were found. Unavailable queries return null.'});
    } catch (error) {
      return json({ok:false,error:error.collectorIndexCode==='date_index_plan_rejected'?'date_index_plan_rejected':'query_failed',
        reason:databaseFailure(error),endpoints:null},503);
    }
  });
}
