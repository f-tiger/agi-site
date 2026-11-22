// Exercise the public and local transports with the pinned official MCP SDK.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { TDS_TOOLS, runTdsTool } from '../../collector-assets/tds-suite/index.mjs';
import { SERVER as COLLECTOR_SERVER, TOOLS as COLLECTOR_TOOLS } from '../../collector-assets/mcp-contract.mjs';
import { TDS_HOME_SERVER, TDS_HOME_PROTOCOL, TDS_HOME_REGISTRY_NAME, TDS_HOME_TOOL_COUNT, TDS_HOME_PAGE_SIZE } from '../../collector-assets/tds-suite/service.mjs';

const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('mcp/package.json', root));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const manifest = JSON.parse(await readFile(new URL('mcp/home-tools/server.json', root), 'utf8'));
const mode = process.argv.slice(2);
assert.ok(mode.length === 1 && ['--local', '--live'].includes(mode[0]), 'Use --local or --live.');
const live = mode[0] === '--live';
const origin = 'https://thedollscout.com';
const headers = { 'User-Agent': 'tds-home-ci-selfcheck-sdk/1.0', 'X-Probe': 'tds-home-mcp-release' };
const deadline = { timeout: 15_000 };
const endpointPath = '/api/home-mcp';

assert.equal(manifest.name, TDS_HOME_REGISTRY_NAME);
assert.equal(manifest.version, TDS_HOME_SERVER.version);
assert.deepEqual(manifest.remotes, [{ type: 'streamable-http', url: origin + endpointPath }]);
assert.equal(manifest.packages, undefined);
assert.ok(manifest.description.length <= 100);
const expected = new Map(TDS_TOOLS.map(tool => [tool.name, tool]));
assert.equal(expected.size, TDS_HOME_TOOL_COUNT);

async function serveLocal() {
  const { onRequest: home } = await import('../../functions/api/home-mcp.js');
  const { onRequest: collecting } = await import('../../functions/mcp.js');
  const routes = new Map([[endpointPath, home], ['/mcp', collecting]]);
  assert.ok([...routes.values()].every(handler => typeof handler === 'function'), 'Call the real Pages handlers.');
  const env = { ASSETS: { fetch: async value => {
    const url = new URL(value);
    assert.equal(url.origin, origin);
    const file = new URL('.' + url.pathname, root);
    assert.ok(file.href.startsWith(root.href), 'Read assets within TDS only.');
    try {
      return new Response(await readFile(file), { headers: { 'content-type': 'application/json' } });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return new Response('Missing asset', { status: 404 });
    }
  } } };
  // No HITS binding. Exercise the same Pages request with no telemetry backend.
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, origin);
      const handler = routes.get(url.pathname);
      if (!handler) return outgoing.writeHead(404).end();
      const parts = [];
      let size = 0;
      for await (const part of incoming) {
        size += part.length;
        if (size > 65_536) return outgoing.writeHead(413).end();
        parts.push(part);
      }
      const request = new Request(url, {
        method: incoming.method,
        headers: incoming.headers,
        ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Buffer.concat(parts) } : {}),
      });
      const response = await handler({ request, env, waitUntil: () => {} });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.writeHead(500).end(String(error.message));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

const server = live ? undefined : await serveLocal();
const base = live ? origin : 'http://127.0.0.1:' + server.address().port;

async function withClient(path, fn) {
  const transport = new StreamableHTTPClientTransport(new URL(path + '?ci=1', base), {
    requestInit: { headers, redirect: 'error' },
    reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
  });
  const client = new Client({ name: 'tds-home-ci-selfcheck-sdk', version: '1.0.0' }, { capabilities: {} });
  try {
    await client.connect(transport, deadline);
    assert.equal(transport.protocolVersion, TDS_HOME_PROTOCOL);
    return await fn(client);
  } finally {
    await client.close();
  }
}

async function verifyToolPages(client) {
  const received = new Set();
  const cursors = new Set();
  let cursor;
  let pages = 0;
  do {
    assert.ok(++pages <= Math.ceil(expected.size / TDS_HOME_PAGE_SIZE), 'Unexpected tools/list pagination.');
    const page = await client.listTools(cursor ? { cursor } : {}, deadline);
    assert.equal(page.tools.length, Math.min(TDS_HOME_PAGE_SIZE, expected.size - (pages - 1) * TDS_HOME_PAGE_SIZE));
    for (const tool of page.tools) {
      const definition = expected.get(tool.name);
      assert.ok(definition, 'Unexpected native tool: ' + tool.name);
      assert.deepEqual(tool.inputSchema, definition.inputSchema);
      assert.equal(tool.description, definition.description.en);
      assert.equal(received.has(tool.name), false, 'Duplicate native tool name: ' + tool.name);
      received.add(tool.name);
    }
    cursor = page.nextCursor;
    if (cursor) {
      assert.ok(typeof cursor === 'string' && !cursors.has(cursor), 'Cursor must advance.');
      cursors.add(cursor);
    }
  } while (cursor);
  assert.equal(pages, Math.ceil(expected.size / TDS_HOME_PAGE_SIZE));
  assert.equal(received.size, expected.size);
  return pages;
}

async function verifyHome() {
  return withClient(endpointPath, async client => {
    const info = client.getServerVersion();
    assert.deepEqual(info, TDS_HOME_SERVER);
    const pages = await verifyToolPages(client);
    // The same first-party, public examples also run independently in the browser.
    const examplesToVerify = [[0, 'en'], [500, 'de'], [999, 'zh'], [TDS_TOOLS.length - 2, 'de'], [TDS_TOOLS.length - 1, 'en']];
    for (const [position, locale] of examplesToVerify) {
      const { name, examples, example } = TDS_TOOLS[position];
      const input = examples?.[locale] ?? example;
      assert.ok(input && typeof input === 'object', 'Expected a working example for ' + name);
      const result = await client.callTool({
        name, arguments: input, _meta: { 'tds/locale': locale },
      }, undefined, deadline);
      assert.notEqual(result.isError, true, name);
      assert.deepEqual(result.structuredContent, await runTdsTool(name, input, locale));
    }
    return { tools: expected.size, pages, examples: examplesToVerify.length };
  });
}

async function verifyCollecting() {
  return withClient('/mcp', async client => {
    assert.deepEqual(client.getServerVersion(), COLLECTOR_SERVER);
    const { tools } = await client.listTools({}, deadline);
    assert.deepEqual(tools.map(tool => tool.name).sort(), COLLECTOR_TOOLS.map(tool => tool.name).sort());
    const result = await client.callTool({
      name: 'calculate_style_probability',
      arguments: { target: 'regular', regularStyles: 6, secretOddsN: 72, boxes: 12 },
    }, undefined, deadline);
    assert.notEqual(result.isError, true);
    assert.ok(Math.abs(result.structuredContent.probabilityPerBox - 71 / 432) < 1e-12);
    return { version: COLLECTOR_SERVER.version, tools: tools.length };
  });
}

try {
  const [home, collecting] = await Promise.all([verifyHome(), verifyCollecting()]);
  console.log(JSON.stringify({ verification: 'tds_official_sdk_http_passed', target: live ? 'production' : 'local', home, collecting }));
} finally {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
