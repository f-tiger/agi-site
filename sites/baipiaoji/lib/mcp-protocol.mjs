const MODERN_VERSION = '2026-07-28';
const VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo';
const CACHED_METHODS = new Set([
  'server/discover', 'tools/list', 'prompts/list', 'resources/list',
  'resources/templates/list', 'resources/read',
]);
const NAME_PARAMETERS = new Map([
  ['tools/call', 'name'], ['prompts/get', 'name'], ['resources/read', 'uri'],
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const LEGACY_MCP_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
export const MCP_REQUEST_HEADERS = 'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id';

function decodeName(value) {
  if (value === null) return null;
  if (!value.startsWith('=?base64?') || !value.endsWith('?=')) {
    return /^[\x20-\x7e]+$/.test(value) ? value : null;
  }
  try {
    const encoded = value.slice('=?base64?'.length, -2);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    return null;
  }
}

export function mcpRequestProtocol(headers, message, legacyVersions) {
  const {method, params} = message;
  const headerVersion = headers.get('MCP-Protocol-Version');
  const meta = params?._meta;
  const version = meta?.[VERSION_KEY];
  const modern = method === 'server/discover' || headerVersion === MODERN_VERSION ||
    headers.has('Mcp-Method') || version !== undefined;
  if (!modern) return {modern: false};

  if (!object(meta) || typeof version !== 'string' || !object(meta[CAPABILITIES_KEY])) {
    return {error: {code: -32602, message: 'Missing or invalid MCP request metadata'}};
  }
  const nameKey = NAME_PARAMETERS.get(method);
  if (headerVersion !== version || headers.get('Mcp-Method') !== method ||
      (nameKey && (typeof params[nameKey] !== 'string' || decodeName(headers.get('Mcp-Name')) !== params[nameKey]))) {
    return {error: {code: -32020, message: 'MCP request headers are missing or do not match the body'}};
  }
  if (version !== MODERN_VERSION) {
    return {error: {code: -32022, message: 'Unsupported protocol version',
      data: {supported: [MODERN_VERSION, ...legacyVersions], requested: version}}};
  }
  return {modern: true};
}

export function mcpDiscovery(legacyVersions, {capabilities, instructions}) {
  return {
    supportedVersions: [MODERN_VERSION, ...legacyVersions],
    capabilities,
    instructions,
  };
}

export function mcpResult(result, modern, method, serverInfo, cacheScope = 'public') {
  if (!modern) return result;
  return {
    resultType: 'complete',
    ...result,
    _meta: {...result._meta, [SERVER_INFO_KEY]: serverInfo},
    ...(CACHED_METHODS.has(method) ? {ttlMs: 0, cacheScope} : {}),
  };
}
