export const MODERN_MCP_VERSION = '2026-07-28';
const LEGACY_MCP_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
const VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
export const CLIENT_INFO_KEY = 'io.modelcontextprotocol/clientInfo';
export const SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo';
export const SUPPORTED_MCP_VERSIONS = [MODERN_MCP_VERSION, ...LEGACY_MCP_VERSIONS];

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function legacyMcpVersion(requested) {
  return LEGACY_MCP_VERSIONS.includes(requested) ? requested
    : requested === undefined ? '2025-03-26' : LEGACY_MCP_VERSIONS[0];
}

function decodeNameHeader(value) {
  if (value === null || !/^[\x20-\x7e]+$/.test(value)) return null;
  const encoded = /^=\?base64\?([A-Za-z0-9+/]+={0,2})\?=$/.exec(value);
  if (!encoded) return value;
  try {
    const bytes = Uint8Array.from(atob(encoded[1]), char => char.charCodeAt(0));
    return new TextDecoder('utf-8', {fatal:true}).decode(bytes);
  } catch {
    return null;
  }
}

export function mcpRequestProtocol(headers, method, params) {
  const headerVersion = headers.get('MCP-Protocol-Version');
  const meta = params?._meta;
  const bodyVersion = meta?.[VERSION_KEY];
  const modern = bodyVersion !== undefined || headers.has('Mcp-Method') ||
    headerVersion === MODERN_MCP_VERSION || method === 'server/discover';

  if (!modern) {
    if (headerVersion !== null && !LEGACY_MCP_VERSIONS.includes(headerVersion)) {
      return {error:{code:-32602, message:'Unsupported MCP-Protocol-Version', status:400}};
    }
    return {modern:false};
  }
  if (!isObject(meta) || typeof bodyVersion !== 'string' || !isObject(meta[CAPABILITIES_KEY])) {
    return {error:{code:-32602, message:'Missing or invalid MCP request metadata', status:400}};
  }
  const name = method === 'tools/call' ? params.name
    : method === 'resources/read' ? params.uri
    : method === 'prompts/get' ? params.name : undefined;
  if (headerVersion !== bodyVersion || headers.get('Mcp-Method') !== method ||
      (['tools/call', 'resources/read', 'prompts/get'].includes(method) &&
       (typeof name !== 'string' || decodeNameHeader(headers.get('Mcp-Name')) !== name))) {
    return {error:{code:-32020, message:'MCP request headers are missing or do not match the body', status:400}};
  }
  if (bodyVersion !== MODERN_MCP_VERSION) {
    return {error:{code:-32022, message:'Unsupported protocol version', status:400,
      data:{supported:SUPPORTED_MCP_VERSIONS, requested:bodyVersion}}};
  }
  return {modern:true, clientInfo:meta[CLIENT_INFO_KEY]};
}
