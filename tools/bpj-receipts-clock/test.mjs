import assert from 'node:assert/strict';
import test from 'node:test';
import clockWorker, { ReceiptClock, verifyReceipts } from './worker.mjs';

const control = 'a'.repeat(64);
const watch = 'b'.repeat(64);
const controlRequest = (path, method = 'GET', secret = control) => new Request(`https://worker.invalid${path}`, {
  method, headers: { Authorization: `Bearer ${secret}` },
});

function paymentService({ ads = [0], members = [0], memberResponse, failureAt } = {}) {
  const calls = [];
  let adIndex = 0;
  let memberIndex = 0;
  const fetch = async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://baipiaoji.com');
    assert.equal(options.redirect, 'manual');
    const path = parsed.pathname;
    calls.push(path);
    const protectedPath = path.endsWith('watch') || path.endsWith('recovery');
    assert.equal(options.method, protectedPath ? 'POST' : 'GET');
    assert.equal(options.headers.Authorization, protectedPath ? `Bearer ${watch}` : undefined);
    if (failureAt === path) return Response.redirect('https://another.invalid/');
    if (path === '/api/ad-web3-watch') return Response.json({ ok: true, processed: ads[adIndex++] || 0 });
    if (path === '/api/ads') return Response.json({ ok: true, selling: true, rails: { wallet: true }, web3: { watch_healthy: true } });
    if (path === '/api/bpj-member-recovery') return Response.json(memberResponse || {
      ok: true, mode: 'receipts-only', site: 'bpj', ready: true, processed: members[memberIndex++] || 0,
    });
    assert.equal(path, '/api/member');
    return Response.json({ ok: true, site: 'bpj', ready: true });
  };
  return { calls, fetch };
}

function makeClock() {
  let value;
  let alarm = null;
  const storage = {
    async transaction(action) { return action(this); },
    async get() { return structuredClone(value); },
    async put(_key, state) { value = structuredClone(state); },
    async setAlarm(time) { alarm = time; },
    async deleteAlarm() { alarm = null; },
    async getAlarm() { return alarm; },
  };
  const clock = new ReceiptClock({ storage }, { BPJ_WATCH_SECRET: watch });
  const env = { BPJ_CLOCK_SECRET: control, BPJ_CLOCK: { getByName(name) {
    assert.equal(name, 'bpj');
    return { fetch(url, options) { return clock.fetch(new Request(url, options)); } };
  } } };
  const command = async (path, method) => (await clockWorker.fetch(controlRequest(path, method), env)).json();
  return { clock, env, command };
}

test('exposes only fixed authenticated control routes and keeps them out of caches', async () => {
  const { env, command } = makeClock();
  assert.equal((await clockWorker.fetch(controlRequest('/start', 'POST', watch), env)).status, 401);
  assert.equal((await clockWorker.fetch(controlRequest('/start?site=other', 'POST'), env)).status, 404);
  assert.equal((await clockWorker.fetch(controlRequest('/start'), env)).status, 404);
  assert.equal((await command('/status')).enabled, false);
  const response = await clockWorker.fetch(controlRequest('/start', 'POST'), env);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const started = await response.json();
  assert(started.enabled && started.scheduledAt > Date.now());
  assert.equal((await command('/start', 'POST')).scheduledAt, started.scheduledAt);
  assert.equal((await command('/pause', 'POST')).scheduledAt, null);
});

test('scans approved endpoints in order and refuses redirects or legacy mode', async () => {
  const service = paymentService({ ads: [3, 1], members: [1, 0] });
  await verifyReceipts(watch, service.fetch);
  assert.deepEqual(service.calls, [
    '/api/ad-web3-watch', '/api/ad-web3-watch', '/api/ads',
    '/api/bpj-member-recovery', '/api/bpj-member-recovery', '/api/member',
  ]);
  for (const service of [paymentService({ failureAt: '/api/bpj-member-recovery' }), paymentService({ memberResponse: {
    ok: true, mode: 'ordinary-watch', ready: true, site: 'bpj', processed: 0,
  } })]) {
    await assert.rejects(verifyReceipts(watch, service.fetch), /member_receipts_unavailable/);
    assert(!service.calls.includes('/api/member'));
  }
  const busy = paymentService({ ads: Array(8).fill(3), members: Array(8).fill(1) });
  await verifyReceipts(watch, busy.fetch);
  assert.equal(busy.calls.length, 16, 'one run cannot exceed the audited call budget');
});

test('establishes an observed followup, then hourly checks, with recovery after a transient failure', async () => {
  const { clock, command } = makeClock();
  const before = globalThis.fetch;
  try {
    await command('/start', 'POST');
    globalThis.fetch = paymentService({ failureAt: '/api/ad-web3-watch' }).fetch;
    await clock.alarm();
    let status = await command('/status');
    assert.equal(status.runs, 1);
    assert.equal(status.succeeded, 0);
    assert.equal(status.lastError, 'ad_receipts_unavailable');
    assert(status.scheduledAt - Date.now() > 14 * 60_000);

    globalThis.fetch = paymentService().fetch;
    await clock.alarm();
    status = await command('/status');
    assert.equal(status.succeeded, 1);
    assert.equal(status.lastError, null);
    assert(status.scheduledAt - status.lastSuccessAt === 90_000);
    await clock.alarm();
    status = await command('/status');
    assert.equal(status.succeeded, 2);
    assert.equal(status.scheduledAt - status.lastSuccessAt, 60 * 60_000);

    await command('/pause', 'POST');
    await clock.alarm();
    status = await command('/status');
    assert.equal(status.runs, 3);
    assert.equal(status.scheduledAt, null);
  } finally {
    globalThis.fetch = before;
  }
});
