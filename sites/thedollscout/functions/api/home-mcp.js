import { TDS_TOOLS, TDS_TOOL_LANGUAGES, lookupTdsTool, runTdsTool } from '../../collector-assets/tds-suite/index.mjs';
import { recordHomeMcpSuccess } from '../../lib/collector-measurement.js';
import { legacyProtocolVersion, mcpError, mcpHeaders, mcpJson, mcpRequestProtocol, TDS_MCP_PROTOCOLS } from '../../lib/mcp-transport.mjs';
import { TDS_HOME_PROTOCOL as PROTOCOL, TDS_HOME_SERVER as SERVER, TDS_HOME_PAGE_SIZE as PAGE_SIZE } from '../../collector-assets/tds-suite/service.mjs';

const CANONICAL = 'https://thedollscout.com';
const LIMIT = 32 * 1024;
const CURSOR_PREFIX = 'tds-home-tools-v1:';
const TRANSIENT_INPUT_ERROR = 'Use the tool schema and provide values in the documented format and range.';
const ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const ACKNOWLEDGEMENTS = new Set(['notifications/initialized', 'notifications/cancelled', 'notifications/progress']);
const CAPABILITIES = { tools: { listChanged: false } };
const INSTRUCTIONS = 'Browse tools/list and follow each nextCursor. Call a listed tool with its published input schema. Models and calculations refer to supplied inputs and cited manufacturer evidence.';

const cursorFor = offset => btoa(CURSOR_PREFIX + offset);
const callError = content => ({ isError: true, content: [{ type: 'text', text: content }] });
const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
const validId = id => typeof id === 'string' || Number.isSafeInteger(id);
function definitions(params) {
  const cursor = params?.cursor;
  let start = 0;
  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || cursor.length > 128) throw new Error('Invalid cursor');
    const decoded = atob(cursor);
    if (!decoded.startsWith(CURSOR_PREFIX)) throw new Error('Invalid cursor');
    start = Number(decoded.slice(CURSOR_PREFIX.length));
    if (!Number.isInteger(start) || start <= 0 || start >= TDS_TOOLS.length ||
        start % PAGE_SIZE !== 0 || cursor !== cursorFor(start)) throw new Error('Invalid cursor');
  }
  const end = start + PAGE_SIZE;
  const tools = TDS_TOOLS.slice(start, end).map(tool => ({
    name: tool.name,
    title: tool.title.en,
    description: tool.description.en,
    inputSchema: tool.inputSchema,
    annotations: ANNOTATIONS,
    _meta: { documentation: CANONICAL + '/ai-tools/' + tool.slug },
  }));
  return end < TDS_TOOLS.length ? { tools, nextCursor: cursorFor(end) } : { tools };
}

async function readPayload(request) {
  if (Number(request.headers.get('content-length')) > LIMIT) return null;
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('Missing body');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > LIMIT) {
        await reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return { parsed: JSON.parse(text + decoder.decode()) };
  } finally {
    reader.releaseLock();
  }
}

function responseLocale(params, request) {
  const explicit = params?._meta?.['tds/locale'];
  if (TDS_TOOL_LANGUAGES.includes(explicit)) return explicit;
  const tags = (request.headers.get('accept-language') ?? '').toLowerCase().split(',');
  return tags.map(tag => tag.trim().split(/[-;]/, 1)[0]).find(tag => TDS_TOOL_LANGUAGES.includes(tag)) ?? 'en';
}

export async function onRequest(context) {
  const { request } = context;
  const { allowed, headers } = mcpHeaders(request);
  if (!allowed) return new Response('Origin not allowed', { status: 403, headers });
  const invalid = (id, code, message, status) => mcpError(headers, id, { code, message }, status);
  const json = value => Response.json(value, { headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method === 'HEAD') return new Response(null, { headers: { ...headers, 'content-type': 'application/json' } });
  if (request.method === 'GET') {
    if (/^\s*text\/event-stream\s*$/i.test(request.headers.get('accept') ?? '')) {
      return new Response(null, { status: 405, headers });
    }
    return json({
      server: SERVER,
      protocolVersion: PROTOCOL,
      supportedProtocolVersions: TDS_MCP_PROTOCOLS,
      toolCount: TDS_TOOLS.length,
      transport: 'Streamable HTTP with JSON-RPC over POST',
      documentation: CANONICAL + '/ai-tools',
      catalog: CANONICAL + '/collector-assets/tds-suite/catalog-en.json',
    });
  }
  if (request.method !== 'POST') return new Response(null, { status: 405, headers });
  let payload;
  try {
    payload = await readPayload(request);
  } catch {
    return invalid(null, -32700, 'Parse error');
  }
  if (!payload) return new Response('Request too large', { status: 413, headers });
  const body = payload.parsed;
  if (!plainObject(body) || body.jsonrpc !== '2.0' || typeof body.method !== 'string' ||
      (Object.hasOwn(body, 'id') && !validId(body.id))) return invalid(null, -32600, 'Invalid Request');
  const { id, method, params } = body;
  const protocol = mcpRequestProtocol(request.headers, method, params);
  if (protocol.error) return mcpError(headers, id, protocol.error, 400);
  if (protocol.supported === false) return new Response('Unsupported MCP protocol version', { status: 400, headers });
  if (!protocol.modern && id === undefined && ACKNOWLEDGEMENTS.has(method)) return new Response(null, { status: 202, headers });
  if (id === undefined) return invalid(null, -32600, 'Missing request id', protocol.modern ? 400 : 200);
  const result = value => mcpJson(headers, id, value, { method, modern: protocol.modern, server: SERVER });
  if (params !== undefined && !plainObject(params)) return invalid(id, -32602, 'Invalid params', protocol.modern ? 400 : 200);

  if (method === 'server/discover') return result({ supportedVersions: TDS_MCP_PROTOCOLS, capabilities: CAPABILITIES, instructions: INSTRUCTIONS });
  if (!protocol.modern && method === 'initialize') {
    return result({ protocolVersion: legacyProtocolVersion(params?.protocolVersion, PROTOCOL), capabilities: CAPABILITIES,
      serverInfo: SERVER, instructions: INSTRUCTIONS });
  }
  if (method === 'ping') return result({});
  if (method === 'tools/list') {
    try { return result(definitions(params)); }
    catch { return invalid(id, -32602, 'Invalid tools/list cursor', protocol.modern ? 400 : 200); }
  }
  if (method !== 'tools/call') return invalid(id, -32601, 'Method not found', protocol.modern ? 400 : 200);

  const tool = lookupTdsTool(params?.name);
  if (!tool) return invalid(id, -32602, 'Unknown tool', protocol.modern ? 400 : 200);
  const args = params?.arguments ?? {};
  try {
    const output = runTdsTool(tool.name, args, responseLocale(params, request));
    if (!plainObject(output)) throw new TypeError('Invalid tool result');
    const response = result({ structuredContent: output, content: [{ type: 'text', text: JSON.stringify(output) }] });
    recordHomeMcpSuccess(context, tool.name, protocol.clientInfo);
    return response;
  } catch {
    return result(callError(TRANSIENT_INPUT_ERROR));
  }
}
