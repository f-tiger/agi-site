import assert from 'node:assert/strict';
import { MODERN_MCP_PROTOCOL, TDS_MCP_PROTOCOLS } from '../../lib/mcp-transport.mjs';

export async function verifyModernMcp(base, path, server, sample) {
  const endpoint = new URL(path + '?ci=1', base);
  const origin = 'https://chatgpt.com';
  const qa = { 'User-Agent': 'tds-ci-selfcheck/1.0', 'X-Probe': 'tds-modern-mcp-release', 'X-Analytics-Consent': 'denied' };
  const metadata = {
    'io.modelcontextprotocol/protocolVersion': MODERN_MCP_PROTOCOL,
    'io.modelcontextprotocol/clientCapabilities': {},
    'io.modelcontextprotocol/clientInfo': { name: 'tds-ci-selfcheck', version: '1.0' },
  };
  const post = (method, params = {}, methodHeader = method) => fetch(endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { ...qa, Origin: origin, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
      'Mcp-Protocol-Version': MODERN_MCP_PROTOCOL, 'Mcp-Method': methodHeader,
      ...(params.name ? { 'Mcp-Name': params.name } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: { ...params, _meta: metadata } }),
  });
  const discovery = await post('server/discover');
  assert.equal(discovery.status, 200);
  assert.equal(discovery.headers.get('access-control-allow-origin'), origin);
  assert.match(discovery.headers.get('cache-control') ?? '', /no-store/);
  const discovered = (await discovery.json()).result;
  assert.deepEqual(discovered.supportedVersions, TDS_MCP_PROTOCOLS);
  assert.equal(discovered.resultType, 'complete');
  assert.equal(discovered.ttlMs, 0);
  assert.equal(discovered.cacheScope, 'private');
  assert.deepEqual(discovered._meta['io.modelcontextprotocol/serverInfo'], server);

  const result = await post('tools/call', sample);
  assert.equal(result.status, 200);
  const call = (await result.json()).result;
  assert.equal(call.resultType, 'complete');
  assert.notEqual(call.isError, true);
  assert.ok(call.structuredContent);
  assert.deepEqual(call._meta['io.modelcontextprotocol/serverInfo'], server);

  const mismatch = await post('tools/list', {}, 'server/discover');
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).error.code, -32020);
  const preflight = await fetch(endpoint, {
    method: 'OPTIONS', signal: AbortSignal.timeout(15000),
    headers: { ...qa, Origin: origin, 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,mcp-protocol-version,mcp-method,mcp-name,x-analytics-consent' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.match(preflight.headers.get('access-control-allow-headers') ?? '', /x-analytics-consent/i);
}

export async function verifyMcpGrowth(base) {
  const response = await fetch(new URL('/api/mcp-growth?ci=1', base), {
    headers: { 'User-Agent': 'tds-ci-selfcheck/1.0', 'X-Probe': 'tds-modern-mcp-release' },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.ok, true);
  assert.equal(report.unit, 'anonymous_successful_tool_calls');
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(report.window.end_exclusive, today);
  for (const path of ['/mcp', '/api/home-mcp']) assert.ok(Number.isSafeInteger(report.endpoints[path].successful_calls));
}
