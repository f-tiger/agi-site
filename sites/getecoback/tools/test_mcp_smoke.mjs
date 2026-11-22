import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../src/worker.js';
import { expandedDefinitions } from '../src/mcp-expanded.mjs';
import { MCP_PAGE_SIZE } from '../src/mcp-pagination.mjs';
import { runSmoke } from './mcp_smoke.mjs';

const endpoint = 'https://getecoback.com/mcp/v1';
const site = new URL('../site/', import.meta.url);
const categories = new Map(expandedDefinitions.map(tool => [tool.name, tool.category]));
const expectedPublished = expandedDefinitions.length + 10;
const expectedPages = Math.ceil(expectedPublished / MCP_PAGE_SIZE);
const quiet = () => {};

function harness(t, varyResponse) {
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input.url ?? input);
    assert.equal(url.origin, 'https://api.open-meteo.com', 'The test must not reach an external service');
    return Response.json({ daily: {
      temperature_2m_max: [24, 28, 23], time: ['2026-11-20', '2026-11-21', '2026-11-22'],
    } });
  });
  const requests = [];
  let businessWrites = 0;
  const env = {
    EVENTS: { prepare() { businessWrites++; throw new Error('QA must not write business events'); } },
    ASSETS: { async fetch(request) {
      const path = new URL(request.url).pathname;
      try {
        const contents = await readFile(new URL(path.slice(1), site));
        const type = path.endsWith('.json') ? 'application/json' : 'text/markdown';
        return new Response(contents, { headers: { 'content-type': type } });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return new Response('Missing local asset', { status: 404 });
      }
    } },
  };
  const send = async (input, init) => {
    const request = new Request(input, init);
    assert.equal(request.url, endpoint);
    assert.equal(request.method, 'POST');
    assert.match(request.headers.get('user-agent'), /^getecoback-ci\b/);
    const message = await request.clone().json();
    requests.push(message);
    const realResponse = () => worker.fetch(request, env, {});
    return varyResponse ? varyResponse(message, realResponse) : realResponse();
  };
  return {
    send, requests,
    byMethod(method) { return requests.filter(request => request.method === method); },
    assertNoBusinessWrites() { assert.equal(businessWrites, 0); },
  };
}

async function updatedResult(realResponse, update) {
  const response = await realResponse();
  assert.equal(response.status, 200);
  const message = await response.json();
  update(message.result);
  return Response.json(message);
}

const rateLimit = () => new Response('<html><body>error code: 1027</body></html>', {
  status: 429, headers: { 'content-type': 'text/html' },
});

function verifyRun(report, h, mode, expectedToolCalls) {
  assert.deepEqual(report, { mode, pages: expectedPages, discovered: expectedPublished, checked: expectedToolCalls });
  assert.equal(h.byMethod('initialize').length, 1);
  const lists = h.byMethod('tools/list');
  assert.equal(lists.length, expectedPages);
  assert.equal(lists[0].params?.cursor, undefined);
  assert.equal(new Set(lists.slice(1).map(request => request.params.cursor)).size, expectedPages - 1);
  const tools = h.byMethod('tools/call');
  assert.equal(tools.length, expectedToolCalls);
  assert.equal(h.requests.length, 1 + expectedPages + expectedToolCalls);
  assert.equal(tools.at(-1).params.name, 'ratgeber_lesen');
  assert.match(tools.at(-1).params.arguments.pfad, /^https:\/\/getecoback\.com\.evil\.test\//);
  h.assertNoBusinessWrites();
  return tools.map(request => request.params.name).filter(name => categories.has(name));
}

test('bounded mode reads every real Worker page and calls one expanded tool per category', async t => {
  const h = harness(t);
  const report = await runSmoke({ mode: 'bounded', send: h.send, log: quiet });
  const expectedCategories = new Set(categories.values());
  const expandedNames = verifyRun(report, h, 'bounded', 16 + expectedCategories.size + 1);
  assert.equal(expandedNames.length, expectedCategories.size);
  assert.deepEqual(new Set(expandedNames.map(name => categories.get(name))), expectedCategories);
  assert(h.requests.length <= 130, `Bounded smoke used ${h.requests.length} Worker requests`);
});

test('default full mode still replays every expanded example against the real Worker', async t => {
  const h = harness(t);
  const report = await runSmoke({ send: h.send, log: quiet });
  const expandedNames = verifyRun(report, h, 'full', 16 + expandedDefinitions.length + 1);
  assert.equal(expandedNames.length, expandedDefinitions.length);
  assert.deepEqual(new Set(expandedNames), new Set(categories.keys()));
});

for (const [field, invalid, message] of [
  ['version', '0.0.1', /version/i],
  ['name', 'stale-server-alias', /name/i],
]) {
  test(`manifest ${field} mismatch exits after initialization`, async t => {
    const h = harness(t, (rpc, realResponse) => rpc.method === 'initialize'
      ? updatedResult(realResponse, result => { result.serverInfo[field] = invalid; })
      : realResponse());
    await assert.rejects(runSmoke({ mode: 'bounded', send: h.send, log: quiet }), message);
    assert.deepEqual(h.requests.map(request => request.method), ['initialize']);
    h.assertNoBusinessWrites();
  });
}

test('an HTTP 429 on the second tools/list page stops before any tool call', async t => {
  const h = harness(t, (rpc, realResponse) => rpc.method === 'tools/list' && rpc.params?.cursor
    ? rateLimit() : realResponse());
  await assert.rejects(runSmoke({ mode: 'bounded', send: h.send, log: quiet }), /HTTP 429/);
  assert.deepEqual(h.requests.map(request => request.method), ['initialize', 'tools/list', 'tools/list']);
  h.assertNoBusinessWrites();
});

for (const mode of ['bounded', 'full']) {
  test(`an HTTP 429 on the first legacy call stops ${mode} mode`, async t => {
    const h = harness(t, (rpc, realResponse) => rpc.method === 'tools/call' ? rateLimit() : realResponse());
    await assert.rejects(runSmoke({ mode, send: h.send, log: quiet }), /HTTP 429/);
    assert.equal(h.byMethod('tools/list').length, expectedPages);
    assert.equal(h.byMethod('tools/call').length, 1);
    assert.equal(h.requests.length, 2 + expectedPages);
    h.assertNoBusinessWrites();
  });
}

for (const [label, change] of [
  ['incomplete', page => { if (!page.nextCursor) page.tools.pop(); }],
  ['exchanged name', page => { if (!page.nextCursor) page.tools[0].name = 'unexpected_smoke_test_name'; }],
]) {
  test(`rejects an ${label} catalogue before calling tools`, async t => {
    const h = harness(t, (rpc, realResponse) => rpc.method === 'tools/list'
      ? updatedResult(realResponse, change) : realResponse());
    await assert.rejects(runSmoke({ mode: 'bounded', send: h.send, log: quiet }), /catalogue|tools\/list|name|page/i);
    assert.equal(h.byMethod('tools/list').length, expectedPages);
    assert.equal(h.byMethod('tools/call').length, 0);
    h.assertNoBusinessWrites();
  });
}

test('an unknown mode rejects before sending any request', async t => {
  const h = harness(t);
  await assert.rejects(runSmoke({ mode: 'unspecified', send: h.send, log: quiet }), /mode/i);
  assert.equal(h.requests.length, 0);
  h.assertNoBusinessWrites();
});
