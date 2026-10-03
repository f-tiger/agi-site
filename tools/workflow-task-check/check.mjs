#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const candidate = process.argv[2];
if (!candidate) {
  console.error('Usage: node check.mjs /path/to/trusted-candidate.mjs');
  process.exit(2);
}
const { createHandler } = await import(pathToFileURL(resolve(candidate)).href);
assert.equal(typeof createHandler, 'function', 'Export createHandler({crm, wait})');
const event = () => ({ id: 'synthetic-event-1', type: 'contact.upsert', contact: { email: 'demo@example.invalid' } });
const failure = (status, code) => Object.assign(new Error('Synthetic CRM failure'), { status, code });
function crmFixture(mode = 'ok') {
  let calls = 0, writes = 0;
  const receipts = new Map();
  return {
    get calls() { return calls; },
    get writes() { return writes; },
    async upsert(contact, { idempotencyKey } = {}) {
      calls++;
      if (mode === 'auth') throw failure(401);
      if (mode === 'limited') throw failure(429);
      if (mode === 'transient' && calls === 1) throw failure(503);
      if (mode === 'malformed') return { success: true };
      if (idempotencyKey && receipts.has(idempotencyKey)) return receipts.get(idempotencyKey);
      writes++;
      const receipt = { id: `contact-${writes}` };
      if (idempotencyKey) receipts.set(idempotencyKey, receipt);
      if (mode === 'ambiguous' && calls === 1) throw failure(undefined, 'ETIMEDOUT');
      return receipt;
    }
  };
}
const checks = [
  ['valid_event', async () => {
    const crm = crmFixture(); const handle = createHandler({ crm });
    const result = await handle(event());
    assert.equal(result.status, 200); assert.equal(result.contactId, 'contact-1'); assert.equal(crm.writes, 1);
  }],
  ['duplicate_delivery', async () => {
    const crm = crmFixture(); const handle = createHandler({ crm });
    const first = await handle(event()); const second = await handle(event());
    assert.equal(first.status, 200); assert.deepEqual(second, first); assert.equal(crm.writes, 1);
  }],
  ['invalid_input_has_no_write', async () => {
    for (const bad of [null, {}, { ...event(), id: '' }, { ...event(), type: 'unknown' }, { ...event(), contact: {} }]) {
      const crm = crmFixture(); const result = await createHandler({ crm })(bad);
      assert.equal(result.status, 400); assert.equal(crm.calls, 0);
    }
  }],
  ['transient_failure_recovers', async () => {
    const crm = crmFixture('transient'); const delays = [];
    const result = await createHandler({ crm, wait: async n => delays.push(n) })(event());
    assert.equal(result.status, 200); assert.equal(crm.calls, 2); assert.equal(crm.writes, 1); assert.equal(delays.length, 1);
  }],
  ['credential_failure_stops', async () => {
    const crm = crmFixture('auth'); const result = await createHandler({ crm })(event());
    assert.equal(result.status, 502); assert.equal(result.code, 'crm_auth'); assert.equal(crm.calls, 1); assert.equal(crm.writes, 0);
  }],
  ['rate_limit_is_bounded', async () => {
    const crm = crmFixture('limited'); const delays = [];
    const result = await createHandler({ crm, wait: async n => delays.push(n) })(event());
    assert.equal(result.status, 503); assert.equal(result.code, 'crm_retry_exhausted'); assert.equal(crm.calls, 3); assert.equal(delays.length, 2); assert.equal(crm.writes, 0);
  }],
  ['timeout_after_commit_does_not_duplicate', async () => {
    const crm = crmFixture('ambiguous'); const result = await createHandler({ crm })(event());
    assert.equal(result.status, 200); assert.equal(result.contactId, 'contact-1'); assert.equal(crm.calls, 2); assert.equal(crm.writes, 1);
  }],
  ['restart_preserves_remote_idempotency', async () => {
    const crm = crmFixture(); const first = await createHandler({ crm })(event());
    const restarted = await createHandler({ crm })(event());
    assert.equal(first.status, 200); assert.deepEqual(restarted, first); assert.equal(crm.writes, 1);
  }],
  ['malformed_success_is_not_completion', async () => {
    const crm = crmFixture('malformed'); const result = await createHandler({ crm })(event());
    assert.equal(result.status, 502); assert.equal(result.code, 'invalid_crm_response');
  }]
];
const results = [];
for (const [name, check] of checks) {
  let timer;
  try {
    await Promise.race([check(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('deadline')), 2000); })]);
    results.push({ name, passed: true });
  } catch {
    // Do not echo candidate error messages, input values, file paths or credentials.
    results.push({ name, passed: false });
  } finally { clearTimeout(timer); }
}
const passed = results.filter(x => x.passed).length;
console.log(JSON.stringify({ kind: 'synthetic-local-contract-check', passed, total: results.length, checks: results,
  customer_validation: false, real_provider_tested: false,
  limitations: ['No webhook signature verification, OAuth flow, HTTP transport, concurrency, or real CRM tested.',
    'The stub guarantees idempotency; a real provider may require durable reconciliation.',
    'This runner executes trusted local JavaScript; it is not a sandbox.'] }, null, 2));
process.exitCode = passed === results.length ? 0 : 1;
