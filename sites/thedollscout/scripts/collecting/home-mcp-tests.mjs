import { TDS_HOME_SERVER, TDS_HOME_TOOL_COUNT, TDS_HOME_PAGE_SIZE } from '../../collector-assets/tds-suite/service.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/api/home-mcp.js';
import { TDS_TOOLS, runTdsTool } from '../../collector-assets/tds-suite/index.mjs';
import { WORKFLOW_TOOLS } from '../../collector-assets/tds-suite/collector-workflows.mjs';
import { HOME_TOOLS } from '../../collector-assets/tds-suite/home-purchase.mjs';
import { matchesInputSchema } from '../../lib/mcp-input-schema.mjs';

const url = 'https://thedollscout.com/api/home-mcp';
const request = (method, options = {}, env = {}, waitUntil) =>
  onRequest({ request: new Request(url, { method, ...options }), env, waitUntil });
async function rpc(method, params, id = 1, headers = { 'x-probe': 'test' }, env, waitUntil) {
  const response = await request('POST', {
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  }, env, waitUntil);
  assert.equal(response.status, 200);
  return response.json();
}

test('the shared suite exposes the expected valid, distinct tools whose examples produce structured outputs', () => {
  assert.equal(TDS_TOOLS.length, TDS_HOME_TOOL_COUNT);
  assert.equal(WORKFLOW_TOOLS.length, 200);
  assert.equal(HOME_TOOLS.length, 800);
  assert.equal(new Set(TDS_TOOLS.map(tool => tool.name)).size, TDS_HOME_TOOL_COUNT);
  assert.equal(new Set(TDS_TOOLS.map(tool => tool.slug)).size, TDS_HOME_TOOL_COUNT);
  for (const tool of TDS_TOOLS) {
    for (const language of ['de','en','zh']) {
      assert.equal(typeof tool.title[language], 'string', tool.name);
      assert.ok(tool.title[language].trim(), tool.name);
      assert.ok(tool.description[language].trim(), tool.name);
    }
    assert.equal(tool.inputSchema.type, 'object', tool.name);
    assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
    assert.ok(matchesInputSchema(tool.example, tool.inputSchema), tool.name);
    for (const language of ['de','en','zh']) {
      const output = runTdsTool(tool.name, tool.examples?.[language] ?? tool.example, language);
      assert.ok(output && typeof output === 'object' && !Array.isArray(output), tool.name);
      assert.ok(Object.keys(output).length > 0, tool.name);
      const value = JSON.parse(JSON.stringify(output));
      assert.deepEqual(value, output, tool.name);
    }
  }
});

test('GET discovery, protocol negotiation, acknowledgement, origin and body bound', async () => {
  const discovery = await (await request('GET')).json();
  assert.equal(discovery.toolCount, TDS_HOME_TOOL_COUNT);
  assert.equal(discovery.documentation, 'https://thedollscout.com/ai-tools');
  assert.equal((await request('HEAD')).status, 200);
  assert.equal((await request('GET', {headers:{ accept:'text/event-stream' }})).status, 405);
  assert.equal((await request('GET', {headers:{ origin:'https://unrelated.example' }})).status, 403);
  assert.equal((await request('OPTIONS', {headers:{ origin:'https://chatgpt.com' }})).headers.get('access-control-allow-origin'), 'https://chatgpt.com');
  assert.equal((await rpc('initialize', { protocolVersion: '2025-03-26' })).result.protocolVersion, '2025-03-26');
  assert.equal((await rpc('initialize', { protocolVersion: 'unknown' })).result.serverInfo.version, TDS_HOME_SERVER.version);
  const initialized = await request('POST', {body:'{"jsonrpc":"2.0","method":"notifications/initialized"}'});
  assert.equal(initialized.status, 202);
  assert.equal((await request('POST', {body:'x'.repeat(33000)})).status, 413);
  assert.equal((await (await request('POST', {body:'[1]'})).json()).error.code, -32600);
  assert.equal((await (await request('POST', {body:'{'})).json()).error.code, -32700);
});

test('pagination exposes exactly bounded pages in order and rejects invalid cursors', async () => {
  const found = [];
  let nextCursor;
  let count = 0;
  do {
    const response = await rpc('tools/list', nextCursor ? { cursor: nextCursor } : {});
    assert.equal(response.result.tools.length, Math.min(TDS_HOME_PAGE_SIZE, TDS_HOME_TOOL_COUNT - count * TDS_HOME_PAGE_SIZE));
    for (const tool of response.result.tools) {
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.ok(tool._meta.documentation.startsWith('https://thedollscout.com/ai-tools/'));
    }
    found.push(...response.result.tools.map(t => t.name));
    nextCursor = response.result.nextCursor;
    count++;
    assert.ok(count <= Math.ceil(TDS_HOME_TOOL_COUNT / TDS_HOME_PAGE_SIZE));
  } while (nextCursor);
  assert.equal(count, Math.ceil(TDS_HOME_TOOL_COUNT / TDS_HOME_PAGE_SIZE));
  assert.deepEqual(found, TDS_TOOLS.map(tool => tool.name));
  for (const cursor of ['invalid',btoa('tds-home-tools-v1:0'),btoa('tds-home-tools-v1:39'),btoa('tds-home-tools-v1:1040')]) {
    assert.equal((await rpc('tools/list', { cursor })).error.code, -32602);
  }
});

test('MCP calls use browser calculations and count only successful eligible runs with fixed fields', async () => {
  const written = [];
  const env = { HITS: {prepare: () => ({bind: (...fields) => ({run: async () => {written.push(fields);}})})}};
  const firstTools = [WORKFLOW_TOOLS[0],HOME_TOOLS[0]];
  for (const tool of firstTools) {
    const args = tool.examples?.de ?? tool.example;
    const call = { name: tool.name, arguments: args, _meta: { 'tds/locale': 'de' } };
    const response = await rpc('tools/call', call, 5, {'x-probe':'test'}, env);
    assert.deepEqual(response.result.structuredContent, runTdsTool(tool.name, args, 'de'));
    assert.equal(written.length, 0);
  }
  const tool = firstTools[0];
  const call = { name: tool.name, arguments: tool.example };
  assert.equal((await rpc('tools/call', { ...call, arguments: { unexpected: 'private' } }, 6, {}, env)).result.isError, true);
  assert.equal((await rpc('tools/call', { name: 'missing', arguments: {} }, 7, {}, env)).error.code, -32602);
  await rpc('tools/call', call, 8, { 'sec-gpc':'1' }, env);
  assert.equal(written.length, 0);
  await rpc('tools/call', call, 9, { 'user-agent': 'MCP Client' }, env);
  assert.equal(written.length, 1);
  assert.deepEqual(written[0].slice(1), ['/api/home-mcp', '', '', '', 'tds_home_mcp_run']);
});
