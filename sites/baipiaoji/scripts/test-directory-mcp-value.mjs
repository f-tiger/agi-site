import assert from 'node:assert/strict';
import test from 'node:test';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {onRequestPost} from '../functions/api/mcp.js';

const QUOTA = 'check_api_quota_fit';
const LICENCE = 'check_commercial_use';
const QUOTA_ARGS = {requests_per_day: 200, tokens_per_call: 2000};
const DATED_SOURCE = {source: 'Vendor rate limits', checked: '2026-11-26'};
const STAMP = {commercial_terms_checked: '2026-11-26'};
const CITATION = 'https://baipiaoji.com/en/tools/fixture#sources';
const TOOLS = [
  {slug: 'reviewed', name: 'Reviewed', licence_verdict: 'conditional', evidence: STAMP, citation_url: CITATION},
  {slug: 'no-date', name: 'No date', licence_verdict: 'yes', citation_url: CITATION},
  {slug: 'unstated', name: 'Unstated', licence_verdict: 'unstated', evidence: STAMP, citation_url: CITATION},
];

function setup(t) {
  const db = database();
  db.sql.exec('CREATE TABLE hits (d TEXT, path TEXT, lang TEXT, country TEXT, ref TEXT, ev TEXT)');
  t.after(() => db.sql.close());
  return db;
}

const toolCall = (name, args) => ({jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name, arguments: args}});
async function rpc(db, body, options = {}) {
  const request = new Request('https://baipiaoji.com/api/mcp' + (options.search || ''), {
    method: 'POST', headers: {'Content-Type': 'application/json', ...options.headers}, body: JSON.stringify(body),
  });
  if (options.verifiedBot) Object.defineProperty(request, 'cf', {value: {botManagement: {verifiedBot: true}}});
  const pending = [];
  const assets = {fetch: async url => {
    if (url.pathname.endsWith('/directory.json')) return Response.json({tools: TOOLS});
    if (url.pathname.endsWith('/quotas.json') && !options.assetFailure) {
      return Response.json({categories: {api: {entries: options.entries ?? [
        {slug: 'vendor', kind: 'recurring', req_per_day: 100, ...DATED_SOURCE},
      ]}}});
    }
    return new Response(null, {status: 404});
  }};
  const res = await onRequestPost({request, env: {HITS: db, ASSETS: assets}, waitUntil: work => pending.push(work)});
  await Promise.all(pending);
  const result = (await res.json()).result;
  return result.isError || typeof result.content?.[0]?.text !== 'string' ? result : JSON.parse(result.content[0].text);
}

const outcomes = db => db.sql.prepare('SELECT tool,outcome,n FROM bpj_mcp_value_daily ORDER BY tool,outcome').all().map(row => ({...row}));

test('quota analytics counts dated real calculations and separates no result and service errors', async t => {
  const db = setup(t);
  const over = await rpc(db, toolCall(QUOTA, QUOTA_ARGS));
  assert.equal(over.over_limits[0].checks[0].within, false);
  const exhausted = await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {
    entries: [{slug: 'credit', kind: 'one_time', tokens_total: 1, ...DATED_SOURCE}],
  });
  assert.equal(exhausted.one_time_credits[0].lasts_days, 0);
  for (const entry of [
    {slug: 'rate-unknown', kind: 'free_models', ...DATED_SOURCE},
    {slug: 'non-numeric', kind: 'recurring', ...DATED_SOURCE},
    {slug: 'unsourced', kind: 'recurring', req_per_day: 100, checked: DATED_SOURCE.checked},
    {slug: 'undated', kind: 'recurring', req_per_day: 100, source: DATED_SOURCE.source},
  ]) await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {entries: [entry]});
  const oldCompatibility = await rpc(db, toolCall(QUOTA, {...QUOTA_ARGS, requests_per_day: '200'}));
  assert.equal(oldCompatibility.workload.requests_per_day, 200);
  assert.equal((await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {assetFailure: true})).isError, true);
  assert.deepEqual(outcomes(db), [
    {tool: QUOTA, outcome: 'no_result', n: 5}, {tool: QUOTA, outcome: 'service_error', n: 1},
    {tool: QUOTA, outcome: 'usable', n: 2},
  ]);
});

test('licence analytics counts actionable reviewed terms without persisting request data', async t => {
  const db = setup(t);
  const result = await rpc(db, toolCall(LICENCE, {tool: 'Reviewed'}), {headers: {'User-Agent': 'fixture-private-agent'}});
  assert.equal(result.verdict, 'conditional');
  assert.equal((await rpc(db, toolCall(LICENCE, {tool: 'Unstated'}))).verdict, 'unstated');
  assert.equal((await rpc(db, toolCall(LICENCE, {tool: 'not-in-catalog'}))).found, false);
  await rpc(db, toolCall(LICENCE, {tool: 'No date'}));
  await rpc(db, toolCall(LICENCE, {tool: ' '}));
  assert.deepEqual(outcomes(db), [{tool: LICENCE, outcome: 'no_result', n: 4}, {tool: LICENCE, outcome: 'usable', n: 1}]);
  assert.equal(db.sql.prepare('SELECT count(*) n FROM hits').get().n, 0);
  assert.doesNotMatch(JSON.stringify(db.sql.prepare('SELECT * FROM bpj_mcp_value_daily').all()), /fixture-private-agent|Reviewed|not-in-catalog/);
});

test('directory consumption scope skips protocol traffic, known monitors and marked internal probes', async t => {
  const db = setup(t);
  await rpc(db, {jsonrpc: '2.0', id: 1, method: 'tools/list'});
  await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {headers: {'User-Agent': 'mcpbeat/0.1 (+https://mcpbeat.com/bot/; liveness check)'}});
  await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {search: '?__probe=1', headers: {'User-Agent': 'bpj-ci-selfcheck/1.0'}});
  await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {verifiedBot: true});
  await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {headers: {'DNT': '1'}});
  await rpc(db, toolCall(QUOTA, QUOTA_ARGS), {headers: {'User-Agent': 'node'}});
  await rpc(db, toolCall('search_ai_tools', {}));
  assert.deepEqual(outcomes(db), [{tool: QUOTA, outcome: 'usable', n: 1}]);
  assert.equal(db.sql.prepare('SELECT path FROM hits').get().path, '/api/mcp/search_ai_tools');
});
