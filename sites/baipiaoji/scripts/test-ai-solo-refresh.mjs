#!/usr/bin/env node
// Synthetic fixtures only. No external network, model API, or commercial claims.
import assert from 'node:assert/strict';
import { safeSourceURL, readableText, fingerprint, significantChange, applySourceCheck, fetchSource, refreshCases, emptyState, pickBatch, LIMITS } from './ai-solo-refresh.mjs';
import { validateCases, isoDate } from './ai-solo-validate.mjs';

const sourceUrl = 'https://example.com/research';
const record = (id = 'fixture', outcome = 'success') => ({ id, name: 'Synthetic fixture', outcome, failureSubtype: outcome === 'failure' ? 'shutdown' : undefined, scope: 'solo', category: '合成', categoryEn: 'Synthetic', summary: '合成测试案例', summaryEn: 'Synthetic test fixture', metrics: [{ label: '用户', value: null, kind: 'users', period: '未知' }], sources: [{ url: sourceUrl, title: 'Synthetic source', publishedAt: null, evidence: 'founder-report', supports: 'Synthetic fixture facts' }], observedAt: '2026-10-05', drivers: [{ text: '合成原因', textEn: 'Synthetic explanation', kind: 'inference', sourceUrl }], risks: ['合成数据'], risksEn: ['Synthetic data'], soloRelevance: '测试', soloRelevanceEn: 'Testing', features: null });
const beforeText = ('customer problem pricing demand buyer renewal sales useful workflow repeat paid validation margin support retention '.repeat(30)).trim();
const afterText = ('shutdown discontinuation infrastructure closure lost funding pivot expensive broad churn failure unsustainable platform layoffs '.repeat(45)).trim();
const html = text => '<html><header>Ignore dynamic navigation</header><main>' + text + '</main><script>Ignore dynamic JavaScript</script></html>';
const response = text => new Response(html(text), { headers: { 'content-type': 'text/html' } });
const dns = async () => [{ address: '93.184.216.34', family: 4 }];
let checks = 0;
const check = (name, fn) => { fn(); checks++; };

check('reject unsafe URLs', () => {
  for (const u of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://10.0.0.1', 'https://169.254.169.254', 'https://[::1]', 'https://[::ffff:127.0.0.1]', 'https://user:secret@example.com', 'data:text/plain,x', 'file:///tmp/x']) assert.throws(() => safeSourceURL(u));
  assert.throws(() => safeSourceURL('https://untrusted.example/research', new Set(['example.com'])));
});
check('normalize readable body, omit page chrome', () => assert.equal(readableText(html(' A &amp; B <b> C </b> ')), 'A & B C'));
check('count readable Chinese body without whitespace', () => assert(fingerprint('可核查的商业案例需要明确标注来源和观察日期。'.repeat(10)).words >= 100));
check('ISO calendar dates', () => { assert.equal(isoDate('2026-02-31'), false); assert.equal(isoDate('2026-10-05'), true); });
check('unknown metric values and features remain null', () => assert.deepEqual(validateCases([record(), record('failure', 'failure')], { today: '2026-10-05' }), []));
check('schema rejects uncited facts, invalid classification, duplicates, fabricated features', () => {
  const bad = record(); bad.sources = []; bad.scope = 'success'; bad.features = { distribution: 0.95 }; bad.metrics[0].period = ''; bad.drivers[0].kind = 'verified';
  const errors = validateCases([bad, bad], { today: '2026-10-05' });
  for (const term of ['duplicate id', 'scope', 'features', 'at least one cited source', 'period', 'sourceUrl', 'kind']) assert(errors.some(e => e.includes(term)), term);
});
check('first baseline is not editorial review', () => {
  const fp = fingerprint(beforeText), x = applySourceCheck(undefined, { status: 'available', http: 200, ...fp }, '2026-10-05T00:00:00Z');
  assert.equal(x.status, 'baseline'); assert.equal(x.consecutiveChange, 0); assert(!('reviewedAt' in x));
});
check('require two consecutive significant identical changes', () => {
  const original = applySourceCheck(undefined, { status: 'available', ...fingerprint(beforeText) }, '2026-10-01');
  assert(significantChange(original, fingerprint(afterText)));
  const first = applySourceCheck(original, { status: 'available', ...fingerprint(afterText) }, '2026-10-02');
  assert.equal(first.status, 'change-pending');
  const second = applySourceCheck(first, { status: 'available', ...fingerprint(afterText) }, '2026-10-03');
  assert.equal(second.status, 'review-required'); assert.equal(second.hash, original.hash);
  const interrupted = applySourceCheck(first, { status: 'unreachable', http: 403 }, '2026-10-03');
  const retried = applySourceCheck(interrupted, { status: 'available', ...fingerprint(afterText) }, '2026-10-04');
  assert.equal(retried.status, 'change-pending'); assert.equal(interrupted.lastSuccess, first.lastSuccess);
});
check('rotate bounded cases', () => { const xs = Array.from({ length: 12 }, (_, i) => ({ id: i })); const a = pickBatch(xs, 0), b = pickBatch(xs, a.cursor); assert.equal(a.cases.length, 5); assert.equal(b.cases[0].id, 5); assert.equal(pickBatch(xs, 99, 99).cases.length, 5); });

await assert.rejects(fetchSource(sourceUrl, { resolve: async () => [{ address: '10.0.0.1', family: 4 }], fetchImpl: async () => { throw new Error('must never fetch private DNS'); } }), /unsafe-dns/); checks++;
let redirected = 0;
await assert.rejects(fetchSource(sourceUrl, { trustedHosts: new Set(['example.com']), resolve: dns, fetchImpl: async () => { redirected++; return new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/private' } }); } }), /unsafe/);
assert.equal(redirected, 1); checks++;
await assert.rejects(fetchSource(sourceUrl, { resolve: dns, maxBytes: 100, fetchImpl: async () => response(beforeText) }), /body-limit/); checks++;
await assert.rejects(fetchSource(sourceUrl, { resolve: dns, timeout: 15, fetchImpl: async () => new Promise(() => {}) }), /timeout/); checks++;
const cases = [record(), record('failure', 'failure')], immutable = JSON.stringify(cases);
let state = await refreshCases({ cases, state: emptyState(), now: '2026-10-05T00:00:00Z', resolve: dns, fetchImpl: async () => response(beforeText) });
assert.equal(state.queue.length, 0); assert.equal(state.checkedSources, 2); assert.equal(state.status, 'ok');
state = await refreshCases({ cases, state, now: '2026-10-06T00:00:00Z', resolve: dns, fetchImpl: async () => response(afterText) });
assert.equal(state.queue.length, 0);
state = await refreshCases({ cases, state, now: '2026-10-07T00:00:00Z', resolve: dns, fetchImpl: async () => response(afterText) });
assert.equal(state.queue.length, 2); assert(state.queue.every(q => q.reason === 'source-content-changed'));
state = await refreshCases({ cases, state, now: '2026-10-08T00:00:00Z', resolve: dns, fetchImpl: async () => new Response(null, { status: 404 }) });
assert.equal(state.status, 'degraded'); assert.equal(state.queue.length, 4);
assert.equal(JSON.stringify(cases), immutable); assert(!JSON.stringify(state).includes('customer problem')); assert(!JSON.stringify(state).includes('shutdown discontinuation')); checks++;
state = await refreshCases({ cases, state, now: '2026-10-09T00:00:00Z', resolve: dns, fetchImpl: async () => response(afterText) });
assert.equal(state.queue.length, 2); assert(state.queue.every(q => q.reason === 'source-content-changed')); checks++;
let inFlight = 0, peak = 0, fetched = 0;
await refreshCases({ cases: Array.from({ length: 20 }, (_, i) => ({ ...record('test-' + i), sources: Array.from({ length: 3 }, (_, s) => ({ url: sourceUrl + '/' + s })) })), resolve: dns, fetchImpl: async () => { inFlight++; peak = Math.max(peak, inFlight); fetched++; await new Promise(r => setTimeout(r, 1)); inFlight--; return response(beforeText); } });
assert.equal(fetched, LIMITS.cases * LIMITS.sources); assert(peak <= LIMITS.concurrency); checks++;
console.log('AI Solo source monitor: ' + checks + ' offline fixture checks passed; no network or facts updated.');
