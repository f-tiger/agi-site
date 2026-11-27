export const MODERN_MCP_PROTOCOL = '2026-07-28';
const LEGACY_PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const TDS_MCP_PROTOCOLS = Object.freeze([MODERN_MCP_PROTOCOL, ...LEGACY_PROTOCOLS]);

const VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const CLIENT_INFO_KEY = 'io.modelcontextprotocol/clientInfo';
const SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo';
const NAMED_METHODS = new Map([['tools/call', 'name'], ['resources/read', 'uri'], ['prompts/get', 'name']]);
const NON_CACHEABLE_DISCOVERY = new Set(['server/discover', 'tools/list', 'resources/list', 'resources/templates/list', 'resources/read']);
const ALLOWED_ORIGINS = new Set(['https://thedollscout.com', 'https://chatgpt.com', 'https://claude.ai', 'https://www.perplexity.ai']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function mcpHeaders(request) {
  const origin = request.headers.get('origin');
  const allowed = origin === null || ALLOWED_ORIGINS.has(origin);
  const headers = {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex',
    vary: 'Origin',
    allow: 'GET, HEAD, POST, OPTIONS',
    'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, X-Analytics-Consent',
  };
  if (origin !== null && allowed) headers['access-control-allow-origin'] = origin;
  return { allowed, headers };
}

function decodedName(header) {
  if (header === null || !/^[\x20-\x7e]+$/.test(header)) return null;
  const encoded = /^=\?base64\?([A-Za-z0-9+/]+={0,2})\?=$/.exec(header);
  if (!encoded) return header;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(encoded[1]), c => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function mcpRequestProtocol(headers, method, params) {
  const headerVersion = headers.get('mcp-protocol-version');
  const meta = params?._meta;
  const bodyVersion = meta?.[VERSION_KEY];
  const modern = method === 'server/discover' || bodyVersion !== undefined ||
    headerVersion === MODERN_MCP_PROTOCOL || headers.has('mcp-method') || headers.has('mcp-name');
  if (!modern) return { modern: false, supported: headerVersion === null || LEGACY_PROTOCOLS.includes(headerVersion) };

  if (!isObject(meta) || typeof bodyVersion !== 'string' || !isObject(meta[CAPABILITIES_KEY])) {
    return { error: { code: -32602, message: 'Missing or invalid MCP request metadata' } };
  }
  const field = NAMED_METHODS.get(method);
  const name = field && params[field];
  if (headerVersion !== bodyVersion || headers.get('mcp-method') !== method ||
      (field && (typeof name !== 'string' || decodedName(headers.get('mcp-name')) !== name))) {
    return { error: { code: -32020, message: 'MCP request headers are missing or do not match the body' } };
  }
  if (bodyVersion !== MODERN_MCP_PROTOCOL) {
    return { error: { code: -32022, message: 'Unsupported protocol version',
      data: { supported: TDS_MCP_PROTOCOLS, requested: bodyVersion } } };
  }
  return { modern: true, clientInfo: meta[CLIENT_INFO_KEY] };
}

export function legacyProtocolVersion(requested, fallback) {
  return LEGACY_PROTOCOLS.includes(requested) ? requested : fallback;
}

export function mcpJson(headers, id, result, { method, modern, server }) {
  const body = modern ? {
    ...result,
    resultType: 'complete',
    ...(NON_CACHEABLE_DISCOVERY.has(method) ? { ttlMs: 0, cacheScope: 'private' } : {}),
    _meta: { ...result._meta, [SERVER_INFO_KEY]: server },
  } : result;
  return Response.json({ jsonrpc: '2.0', id, result: body }, { headers });
}

export function mcpError(headers, id, { code, message, data }, status = 200) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message, data } }, { headers, status });
}
