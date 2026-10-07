import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const collector = fileURLToPath(new URL('./membership_snapshot.mjs', import.meta.url));

// Every request is replaced before the collector imports. Never use production
// services or inherited credentials to test aggregate-reporting semantics.
function snapshot(mode, secret = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'membership-report-test-'));
  try {
    const output = path.join(dir, 'snapshot.json');
    const requests = path.join(dir, 'requests.jsonl');
    const preload = path.join(dir, 'mock-fetch.mjs');
    fs.writeFileSync(output, 'old observation must remain unchanged');
    fs.writeFileSync(preload, `
      import fs from 'node:fs';
      globalThis.fetch = async (url, options = {}) => {
        const parsed = new URL(url);
        if (!['baipiaoji.com','agiscorecard.com','getecoback.com','thedollscout.com'].includes(parsed.hostname)) throw Error('Unexpected host');
        const admin = parsed.pathname === '/api/member-admin';
        if (!admin && parsed.pathname !== '/api/member') throw Error('Unexpected path');
        if (admin && (options.method !== 'POST' || options.body !== '{"action":"stats"}')) throw Error('Unexpected operation');
        fs.appendFileSync(process.env.REQUEST_LOG, JSON.stringify({path: parsed.pathname}) + '\\n');
        const failed = admin && (process.env.CASE === 'failed' || (process.env.CASE === 'partial' && parsed.hostname !== 'baipiaoji.com'));
        const body = admin ? {
          ok: true, paid_orders: process.env.CASE.startsWith('malformed-')
            ? [null, false, [], {}, ' ', -1, 0.5][Number(process.env.CASE.split('-')[1])] : 0,
          paid_members: process.env.CASE === 'partial' ? 2 : 0,
          active_members: 0, unexpired_pending: 0, recurring_billing: false,
          ignored_private_field: 'fixture-not-for-public-output'
        } : {ok: true, ready: true, site: 'fixture', plan: {price_units: 9000000, days: 30}};
        return new Response(JSON.stringify(body), {status: failed ? 401 : 200});
      };
    `);
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href,
      collector, '--check', '--out', output], {
      encoding: 'utf8',
      env: {PATH: process.env.PATH, CASE: mode, REQUEST_LOG: requests,
        ADS_WATCH_SECRET: secret ? 'unit-test-only-never-a-real-secret-000000' : ''}
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(output, 'utf8'), 'old observation must remain unchanged');
    assert.ok(!result.stdout.includes('fixture-not-for-public-output'));
    assert.ok(!result.stdout.includes('unit-test-only-never-a-real-secret'));
    return {report: JSON.parse(result.stdout), calls: fs.readFileSync(requests, 'utf8').trim().split('\n').length};
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

test('missing operator auth leaves all counters unknown', () => {
  const {report, calls} = snapshot('zero', false);
  assert.equal(calls, 4);
  assert.equal(report.counters_complete, false);
  assert.deepEqual(Object.values(report.totals), [null, null, null, null]);
});

test('observed zero is retained only after all authenticated reads succeed', () => {
  const {report, calls} = snapshot('zero');
  assert.equal(calls, 8);
  assert.equal(report.counters_complete, true);
  assert.deepEqual(Object.values(report.totals), [0, 0, 0, 0]);
});

test('failed and partial admin reads never produce fleet zero or partial totals', () => {
  for (const mode of ['failed', 'partial']) {
    const {report} = snapshot(mode);
    assert.equal(report.counters_complete, false);
    assert.deepEqual(Object.values(report.totals), [null, null, null, null]);
  }
});

test('HTTP success with a missing counter is incomplete', () => {
  for (let i = 0; i < 7; i++) {
    const {report} = snapshot(`malformed-${i}`);
    assert.equal(report.totals.paid_orders, null);
    assert.equal(report.counters_complete, false);
  }
});
