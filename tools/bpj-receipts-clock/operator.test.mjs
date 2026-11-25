import assert from 'node:assert/strict';
import {test} from 'node:test';
import {watchSecret} from '../../sites/baipiaoji/scripts/ad-runner-config.mjs';
import {clockSecret, confirmFreeBilling, control, preflight, startAndObserve} from './operator.mjs';

const env = {CLOUDFLARE_API_TOKEN: 'synthetic-ci-token', CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32)};
const origin = 'https://bpj-receipts-clock.fixture.workers.dev';
const response = result => Response.json({success: true, result});

function status(overrides = {}) {
  return {ok: true, enabled: false, runs: 0, succeeded: 0, scheduledAt: null,
    lastRunAt: null, lastSuccessAt: null, lastError: null, ...overrides};
}

test('only a complete uncharged billing inventory permits deployment', () => {
  confirmFreeBilling({result: []});
  confirmFreeBilling({result: [{price: 0, rate_plan: {id: 'TEAMS_FREE'}}], result_info: {page: 1, count: 1, total_count: 1}});
  const notFree = [
    {result: null},
    {result: [], result_info: {total_count: 1}},
    {result: [], result_info: {page: 2, total_count: 0}},
    {result: [{price: 5, rate_plan: {id: 'WORKERS_PAID'}}]},
    {result: [{price: 0, rate_plan: {id: 'PARTNERS_WORKERS_ENT'}}]},
    {result: [{price: 1, rate_plan: {id: 'WORKERS_FREE'}}]},
    {result: [{price: 0, rate_plan: {id: 'WORKERS_FREE', is_contract: true}}]},
    {result: [{price: 0, rate_plan: {id: 'UNCLASSIFIED'}}]},
  ];
  for (const record of notFree) assert.throws(() => confirmFreeBilling(record), /inventory/);
});

test('preflight makes only credentialed reads and verifies the actual BPJ account', async () => {
  const calls = [];
  const request = async (url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${env.CLOUDFLARE_API_TOKEN}`);
    assert.equal(options.redirect, 'manual');
    assert.ok(options.method === undefined || options.method === 'GET');
    assert.ok(url.startsWith(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/`));
    calls.push(url);
    if (url.endsWith('/subscriptions')) return response([]);
    if (url.endsWith('/pages/projects/aiyangmao')) return response({name: 'aiyangmao', domains: ['baipiaoji.com']});
    if (url.endsWith('/workers/subdomain')) return response({subdomain: 'fixture'});
    throw new Error('Unexpected API request');
  };
  assert.deepEqual(await preflight(env, request), {workersFree: true, accountId: env.CLOUDFLARE_ACCOUNT_ID, origin});
  assert.equal(calls.length, 3);
  await assert.rejects(preflight(env, async url => url.endsWith('/subscriptions') ? response([])
    : response({name: 'aiyangmao', domains: ['other.example']})), /does not own/);
  await assert.rejects(preflight(env, async () => Response.json({message: env.CLOUDFLARE_API_TOKEN}, {status: 403})),
    error => /Billing Read/.test(error.message) && !error.message.includes(env.CLOUDFLARE_API_TOKEN));
});

test('account autodiscovery accepts one complete match and insists on BPJ ownership', async () => {
  const fallback = {CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN};
  const account = {id: env.CLOUDFLARE_ACCOUNT_ID};
  const requests = [];
  const request = async url => {
    const path = new URL(url).pathname;
    requests.push(path);
    if (path.endsWith('/accounts')) return response([account]);
    assert.ok(path.includes(`/accounts/${account.id}/`));
    if (path.endsWith('/subscriptions')) return response([]);
    if (path.endsWith('/pages/projects/aiyangmao')) return response({name: 'aiyangmao', domains: ['baipiaoji.com']});
    if (path.endsWith('/workers/subdomain')) return response({subdomain: 'fixture'});
    throw new Error('Unexpected API request');
  };
  assert.equal((await preflight(fallback, request)).accountId, account.id);
  assert.equal(requests.length, 4);
  await assert.rejects(preflight(fallback, async () => response([account, {id: 'b'.repeat(32)}])), /uniquely resolved/);
  await assert.rejects(preflight(fallback, async () => Response.json({success: true, result: [account], result_info: {total_count: 2}})), /uniquely resolved/);
});

test('startup requires two successful automatic receipts and never logs provider errors', async () => {
  const time = Date.now();
  const enabled = {enabled: true, scheduledAt: time + 1000};
  const snapshots = [
    status(), status(enabled),
    status({...enabled, runs: 1, lastRunAt: time + 1000, lastError: 'synthetic confidential provider body'}),
    status({...enabled, runs: 2, succeeded: 1, lastRunAt: time + 8000, lastSuccessAt: time + 8000}),
    status({...enabled, runs: 3, succeeded: 2, lastRunAt: time + 98000, lastSuccessAt: time + 98000}),
  ];
  const actions = [];
  const request = async (url, options) => {
    assert.equal(options.headers.Authorization, `Bearer ${clockSecret(env)}`);
    assert.equal(options.redirect, 'manual');
    actions.push([new URL(url).pathname, options.method]);
    return Response.json(snapshots.shift());
  };
  const verified = await startAndObserve(env, origin, request, async () => {});
  assert.equal(verified.newChecksObserved, 2);
  assert.equal(verified.runs, 3);
  assert.equal(verified.hasError, false);
  assert.deepEqual(actions, [['/status', 'GET'], ['/start', 'POST'], ['/status', 'GET'], ['/status', 'GET'], ['/status', 'GET']]);
  assert.notEqual(watchSecret(env), clockSecret(env));
  assert.equal(clockSecret({...env, ADS_WATCH_SECRET: 'a different receipt credential'}), clockSecret(env));
});

test('a newly armed clock is paused when two checks cannot be verified', async () => {
  for (const pauseConfirmed of [true, false]) {
    const mutating = [];
    const armed = status({enabled: true, scheduledAt: Date.now() + 1000});
    const request = async (url, options) => {
      const path = new URL(url).pathname;
      if (options.method === 'POST') mutating.push(path);
      if (path === '/start') return Response.json(armed);
      if (path === '/pause') return Response.json(pauseConfirmed ? status() : armed);
      return Response.json(mutating.length ? armed : status());
    };
    await assert.rejects(startAndObserve(env, origin, request, async () => {}),
      pauseConfirmed ? /paused and no alarm remains/ : /pause could not be confirmed/);
    assert.deepEqual(mutating, ['/start', '/pause']);
  }
  const request = async (_url, options) => {
    assert.equal(options.method, 'GET');
    return Response.json(status({enabled: true, scheduledAt: 1000}));
  };
  await assert.rejects(startAndObserve(env, origin, request, async () => {}), /existing scheduler is enabled/);
});

test('control rejects foreign hosts, redirects, and malformed status', async () => {
  await assert.rejects(control(env, 'https://untrusted.example', 'pause', () => assert.fail('No outbound request expected')), /outside/);
  await assert.rejects(control(env, origin, 'pause', async () => Response.redirect('https://untrusted.example')),
    /HTTP 302/);
  await assert.rejects(control(env, origin, 'status', async () => Response.json(status({runs: 0, succeeded: 2}))),
    /status contract/);
});
