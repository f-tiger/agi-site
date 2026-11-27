import {TOOLS} from '../collector-assets/mcp-contract.mjs';

// These labels are fixed public capabilities, never caller-supplied dimensions.
export const MCP_TOOLS = new Set(TOOLS.map(tool => tool.name));
export const MCP_TOOL_RELEASES = Object.freeze({search_collection_series:'2026-10-31',prepare_collection_checklist:'2026-10-31',prepare_swap_event_card:'2026-10-31'});
// Compatibility marker for the original 2.5 collection tools; individual releases govern coverage.
export const MCP_TOOL_FIRST_FULL_DAY = '2026-11-01';
export const EVENT_KIT_EVENTS = new Set(['collector_event_prepare','collector_event_card','collector_event_share','collector_event_text','collector_event_recipient','collector_event_reuse','collector_event_print']);
export const EVENT_KIT_RELEASES = Object.freeze(Object.fromEntries([...EVENT_KIT_EVENTS].map(name=>[name,'2026-10-31'])));
export function firstFullUTCDate(released) {
  const day=new Date(released+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+1);return day.toISOString().slice(0,10);
}
export const MCP_EVENT = 'collector_mcp_call';
export const HOME_MCP_EVENT = 'tds_home_mcp_run';
export const MCP_RESULTS = new Set(['result', 'no_result']);
const MCP_CLIENT_NAMES = new Map([
  ['claude', 'claude'], ['claude-code', 'claude'], ['claude-desktop', 'claude'], ['claude-user', 'claude'],
  ['chatgpt', 'chatgpt'], ['chatgpt-user', 'chatgpt'], ['codex', 'codex'], ['codex-cli', 'codex'],
  ['cursor', 'cursor'], ['vscode', 'vscode'], ['visual-studio-code', 'vscode'],
  ['gemini-cli', 'gemini'], ['cline', 'cline'], ['perplexity', 'perplexity'],
]);
export const MCP_CLIENT_SIGNALS = Object.freeze(['unknown', 'legacy_unclassified',
  ...Array.from(new Set(MCP_CLIENT_NAMES.values())).flatMap(name => ['client_info:' + name, 'user_agent:' + name])]);
export const COLLECTOR_EVENTS = new Set(['collection_cloud_save','collection_cloud_restore','collection_cloud_delete',...EVENT_KIT_EVENTS,'collector_wish_generate','collector_wish_export','collector_wish_response_reported','collector_wish_fulfilled_reported','display_plan_export','display_plan_example','collection_save', 'collection_export', 'collection_import', 'collector_series_save', 'collector_series_export', 'collector_mcp_copy']);
const QA_PARAMS = ['ci', '__ci', '__probe', 'qa', '__qa'];
const QA_HEADERS = ['x-probe', 'x-ci', 'x-qa', 'x-tds-test'];
const QA_AGENT = /headless|playwright|puppeteer|self[-_ ]?check|release[-_ ]?check|(?:^|[^a-z])(?:ci|qa|test|probe|operator|indexer|demo)(?:[^a-z]|$)|mcp[-_ ]?(?:inspector|checker|validator)|(?:glama|smithery).*(?:check|inspect|health|test)/i;
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
  if(['collection_cloud_save','collection_cloud_restore','collection_cloud_delete'].includes(event))return path==='/en/' || /^\/(?:de\/|zh\/)?(?:collection-tracker|series)?$/.test(path);
  if (EVENT_KIT_EVENTS.has(event)) return /^\/(?:de\/|zh\/)?collecting\/event-kit$/.test(path);
  if (['collector_wish_generate','collector_wish_export','collector_wish_response_reported','collector_wish_fulfilled_reported'].includes(event)) return /^\/(?:de\/|zh\/)?collecting\/wish-card$/.test(path);
  if (['display_plan_export','display_plan_example'].includes(event)) return /^\/(?:de\/)?display-calculator$/.test(path);
  if (['collection_save', 'collection_export', 'collection_import'].includes(event)) return /^\/(?:de\/|zh\/)?collection-tracker$/.test(path);
  if (event === 'collector_mcp_copy') return /^\/(?:de\/|zh\/)?for-agents$/.test(path);
  if (['collector_series_save', 'collector_series_export'].includes(event)) return /^\/(?:de\/|zh\/)?series\/(?:smiski|sonny-angel)-[a-z0-9-]+$/.test(path);
  return false;
}

function mcpClientSignal(clientInfo, userAgent) {
  const declared = clientInfo !== undefined;
  const name = declared ? clientInfo?.name : /^([a-z][a-z0-9-]{0,63})(?:\/|$)/i.exec(userAgent)?.[1];
  if (typeof name !== 'string' || name.length > 64) return 'unknown';
  const family = MCP_CLIENT_NAMES.get(name.trim().toLowerCase().replaceAll(' ', '-'));
  return family ? `${declared ? 'client_info' : 'user_agent'}:${family}` : 'unknown';
}

// Successful public tool calls only. On these MCP events, lang holds a fixed
// signal category. Existing date/path/outcome readers retain their old shape.
function recordMcpRun(ctx, path, event, category, clientInfo) {
  try {
    if (!ctx.env.HITS || !MCP_RESULTS.has(category) || !measurableRequest(ctx.request, {mcp:true})) return;
    const signal = mcpClientSignal(clientInfo, ctx.request.headers.get('user-agent') || '');
    const pending = ctx.env.HITS.prepare('INSERT INTO hits (d,path,lang,country,ref,ev) VALUES (?,?,?,?,?,?)')
      .bind(new Date().toISOString().slice(0,10), path, signal, '', category, event).run().catch(() => {});
    if (typeof ctx.waitUntil === 'function') ctx.waitUntil(pending);
  } catch { /* Metrics cannot change a valid MCP response. */ }
}

export function recordMcpSuccess(ctx, tool, category, clientInfo) {
  if (MCP_TOOLS.has(tool)) recordMcpRun(ctx, '/mcp/' + tool, MCP_EVENT, category, clientInfo);
}

export function recordHomeMcpSuccess(ctx, tool, clientInfo) {
  // The caller passes the name from the resolved public catalogue definition.
  if (/^tds_[a-z0-9_]{1,110}$/.test(tool)) recordMcpRun(ctx, '/api/home-mcp/' + tool, HOME_MCP_EVENT, 'result', clientInfo);
}
