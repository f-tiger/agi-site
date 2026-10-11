import {TOOLS} from '../collector-assets/mcp-contract.mjs';

// These labels are fixed public capabilities, never caller-supplied dimensions.
export const MCP_TOOLS = new Set(TOOLS.map(tool => tool.name));
export const MCP_EVENT = 'collector_mcp_call';
export const MCP_RESULTS = new Set(['result', 'no_result']);
export const COLLECTOR_EVENTS = new Set(['collection_save', 'collection_export', 'collection_import', 'collector_series_save', 'collector_series_export', 'collector_mcp_copy']);
const QA_PARAMS = ['ci', '__ci', '__probe', 'qa', '__qa'];
const QA_HEADERS = ['x-probe', 'x-ci', 'x-qa', 'x-tds-test'];
const QA_AGENT = /headless|playwright|puppeteer|self[-_ ]?check|release[-_ ]?check|(?:^|[^a-z])(?:ci|qa|test|probe)(?:[^a-z]|$)|mcp[-_ ]?(?:inspector|checker|validator)|(?:glama|smithery).*(?:check|inspect|health|test)/i;
const CRAWLER = /googlebot|bingbot|gptbot|oai-searchbot|claudebot|claude-searchbot|perplexitybot|bytespider|applebot|amazonbot|duckassistbot|ccbot|yandexbot|meta-externalagent/i;
export function qaURL(value) {
  try {
    const url = new URL(value);
    return url.pathname.startsWith('/__ci') || QA_PARAMS.some(key => url.searchParams.has(key)) || url.searchParams.get('utm_source') === 'verify';
  } catch { return false; }
}

export function measurableRequest(request, {mcp = false} = {}) {
  try {
    if (new URL(request.url).hostname !== 'thedollscout.com' || qaURL(request.url) || qaURL(request.headers.get('referer'))) return false;
    if (QA_HEADERS.some(name => request.headers.has(name))) return false;
    if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1' || request.headers.get('x-analytics-consent') === 'denied') return false;
    if (/(?:^|;\s*)tds_analytics_choice_v1=denied(?:;|$)/.test(request.headers.get('cookie') || '')) return false;
    const ua = request.headers.get('user-agent') || '';
    if (QA_AGENT.test(ua) || CRAWLER.test(ua) || !mcp && /bot|crawler|spider/i.test(ua)) return false;
    return true;
  } catch { return false; }
}

export function collectorEventAllowed(event, path) {
  if (['collection_save', 'collection_export', 'collection_import'].includes(event)) return /^\/(?:de\/|zh\/)?collection-tracker$/.test(path);
  if (event === 'collector_mcp_copy') return /^\/(?:de\/|zh\/)?for-agents$/.test(path);
  if (['collector_series_save', 'collector_series_export'].includes(event)) return /^\/(?:de\/|zh\/)?series\/(?:smiski|sonny-angel)-[a-z0-9-]+$/.test(path);
  return false;
}

// Called only after validation, successful tool execution and response serialization.
// Fixed counters reuse hits; no arguments, IDs, IPs, UA or collection data reach D1.
export function recordMcpSuccess(ctx, tool, category) {
  try {
    if (!ctx.env.HITS || !MCP_TOOLS.has(tool) || !MCP_RESULTS.has(category) || !measurableRequest(ctx.request, {mcp:true})) return;
    const pending = ctx.env.HITS.prepare('INSERT INTO hits (d,path,lang,country,ref,ev) VALUES (?,?,?,?,?,?)')
      .bind(new Date().toISOString().slice(0,10), '/mcp/' + tool, '', '', category, MCP_EVENT).run().catch(() => {});
    if (typeof ctx.waitUntil === 'function') ctx.waitUntil(pending);
  } catch { /* Metrics cannot change a valid MCP response. */ }
}
