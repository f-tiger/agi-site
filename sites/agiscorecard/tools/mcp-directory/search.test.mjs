import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';
import worker from '../analytics-worker/index.js';
import {searchCatalog} from '../../mcp-directory-assets/query.mjs';

const catalog = JSON.parse(await readFile(new URL('../../mcp-directory-assets/catalog.json', import.meta.url), 'utf8'));
const host = 'agiscorecard.com';
const origin = 'https://' + host;

const request = (path, options) => new Request(origin + path, options);

async function rpc(method, params, query = '?__ci=1') {
  const writes = [];
  const env = {
    ASSETS: {fetch(url) {
      assert.equal(new URL(url.url).pathname, '/mcp-directory-assets/catalog.json');
      return Promise.resolve(Response.json(catalog));
    }},
    EVENTS: {prepare() {
      return {bind(...args) { writes.push(args); return {run: async () => ({})}; }};
    }}
  };
  const response = await worker.fetch(request('/mcp' + query, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params})
  }), env, {waitUntil() {}});
  return {response: await response.json(), writes};
}

test('matches task words, both locales and metadata filters', () => {
  const fixture = [
    {id: 'test/example', title: 'Example', description: 'SQL for data', category: 'data', transports: ['local']},
    {id: 'test/sql', title: 'SQL Explorer', description: 'Query a warehouse', category: 'data', transports: ['remote'], featured: true},
  ];
  assert.deepEqual(searchCatalog(fixture, {query: 'ＳＱＬ'}), [fixture[1], fixture[0]]);
  assert.deepEqual(searchCatalog(fixture, {query: '数据库', transport: 'remote', featured: true}), [fixture[1]]);
  assert.deepEqual(searchCatalog(fixture, {query: 'SQL', category: 'design'}), []);
  const exactId = {...fixture[0], registryId: 'example.domain/mcp'};
  assert.deepEqual(searchCatalog([exactId], {query: 'example.domain/mcp'}), [exactId]);
});

test('worker discovers and searches the shipped snapshot, QA does not write a telemetry row', async () => {
  const {response: list} = await rpc('tools/list');
  assert.ok(list.result.tools.some(tool => tool.name === 'search_mcp_catalog' && tool.annotations.readOnlyHint));
  const guide = await readFile(new URL('../../for-agents.html', import.meta.url), 'utf8');
  for (const tool of list.result.tools) assert.ok(guide.includes('<code>' + tool.name + '</code>'), tool.name);
  const args = {query: 'GitHub', limit: 2};
  const params = {name: 'search_mcp_catalog', arguments: args};
  const {response, writes} = await rpc('tools/call', params);
  const result = JSON.parse(response.result.content[0].text);
  assert.equal(result.asOf, catalog.asOf);
  assert.equal(result.matchCount, searchCatalog(catalog.entries, args).length);
  assert.ok(result.results.length > 0 && result.results.length <= 2);
  assert.deepEqual(writes, []);
  const measured = await rpc('tools/call', params, '');
  assert.equal(measured.writes.length, 1);
  assert.equal(measured.writes[0][4], 'tool:search_mcp_catalog');
  assert.ok(!measured.writes.flat().includes(args.query));
});

test('worker rejects invalid search parameters before opening the snapshot', async () => {
  for (const args of [{limit: 21}, {query: 'q'.repeat(121)}, {transport: 'ssh'}, {url: 'https://example.com'}, null]) {
    const {response, writes} = await rpc('tools/call', {name: 'search_mcp_catalog', arguments: args});
    assert.equal(response.error.code, -32602);
    assert.deepEqual(writes, []);
  }
});

test('legacy aliases redirect to the same locale and preserve QA query', async () => {
  for (const [alias, canonical] of [['/agents.html', '/agents/'], ['/zh/agents', '/zh/agents/'], ['/agents/index', '/agents/']]) {
    const response = await worker.fetch(request(alias + '?__ci=1'), {}, {waitUntil() {}});
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), origin + canonical + '?__ci=1');
  }
});

test('GA4 accepts only fixed directory actions from the matching public routes', () => {
  assert.deepEqual(businessEvent(host, '/zh/agents/', {name: 'mcp_catalog_open'}),
    {name: 'mcp_catalog_open', tool_id: 'mcp-directory', repeat: true});
  assert.equal(businessEvent(host, '/agents/', {name: 'mcp_catalog_search', query: 'user input'}), null);
  assert.equal(businessEvent(host, '/workbench', {name: 'mcp_catalog_search'}), null);
});

test('D1 directory events keep only fixed route and action values', async () => {
  const writes = [];
  const env = {EVENTS: {prepare() {
    return {bind(...args) { writes.push(args); return {run: async () => ({})}; }};
  }}};
  const valid = {n: 'mcp_catalog_open', l: 'mcp_catalog_zh', b: 'docs', p: '/zh/agents/'};
  for (const body of [
    {...valid, u:'__ci=1'},
    {...valid, b:'private query'},
    {...valid, p:'/workbench'},
    {...valid, u:'utm_source=google', r:'https://example.com/private', g:'raw'},
  ]) {
    const response = await worker.fetch(request('/api/e', {
      method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body),
    }), env, {waitUntil() {}});
    assert.equal(response.status, 204);
  }
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].slice(2, 7), ['mcp_catalog_open','mcp_catalog_zh','docs','/zh/agents/',null]);
  assert.ok(!writes.flat().includes('google'));
});
