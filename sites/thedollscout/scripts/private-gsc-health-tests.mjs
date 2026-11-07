import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, stat, access, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { evaluateGscHealth, publicGscHealth, readGscHealth, gscHealthCli } from './private-gsc-health.mjs';

const fixture = () => ({
  source: 'Google Search Console API (searchAnalytics.query)', site: 'sc-domain:thedollscout.com',
  window: { startDate: '2026-10-01', endDate: '2026-10-28' },
  totals: { clicks: 8, impressions: 60 },
  byDate: [{ date: '2026-10-05', clicks: 8, impressions: 60, position: 4.5 }],
  byQuery: [{ query: 'private-query-sentinel', clicks: 8, impressions: 60, position: 4.5 }],
  byPage: [{ page: 'https://thedollscout.com/private-page-sentinel', clicks: 8, impressions: 60, position: 4.5 }],
  byCountry: [{ country: 'usa', clicks: 8, impressions: 60 }],
});
const env = { GA4_SERVICE_ACCOUNT_JSON: 'credential-sentinel', GSC_SITE: 'sc-domain:thedollscout.com', NODE_OPTIONS: 'unsafe-sentinel' };
async function writeFixture(cwd, report = fixture()) {
  await mkdir(path.join(cwd, 'content'));
  await writeFile(path.join(cwd, 'content', 'gsc.json'), JSON.stringify(report));
}

test('missing credentials and a foreign scope never start the legacy reader', async () => {
  const runner = () => { throw new Error('must not run'); };
  assert.equal(await readGscHealth({ env: {}, runner }), 'missing_credentials');
  assert.equal(await readGscHealth({ env: { ...env, GSC_SITE: 'sc-domain:example.com' }, runner }), 'invalid_scope');
});

test('successful private reader returns health only and removes the temporary report', async () => {
  let cwd;
  const health = await readGscHealth({ env, runner: async (options) => {
    cwd = options.cwd;
    assert.equal((await stat(cwd)).mode & 0o777, 0o700);
    assert.deepEqual(Object.keys(options.env).sort(), ['GA4_SERVICE_ACCOUNT_JSON', 'GSC_SITE']);
    await writeFixture(cwd);
  } });
  assert.equal(health, 'healthy');
  assert.equal(publicGscHealth(health), 'TDS GSC: health=healthy');
  await assert.rejects(access(cwd));
});

test('reader errors, timeout and captured-output overflow remain unavailable and are cleaned up', async () => {
  for (const failure of [{ code: 'ETIMEDOUT' }, { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' }, { code: 'API_FAILURE' }]) {
    let cwd;
    const health = await readGscHealth({ env, runner: async (options) => {
      cwd = options.cwd;
      await writeFixture(cwd);
      throw Object.assign(new Error('private-query credential-sentinel'), failure);
    } });
    assert.equal(health, 'unavailable');
    await assert.rejects(access(cwd));
  }
});

test('empty successful data stays distinct from unavailable data', () => {
  const empty = { ...fixture(), totals: { clicks: 0, impressions: 0 }, byDate: [], byQuery: [], byPage: [], byCountry: [] };
  assert.equal(evaluateGscHealth(empty), 'empty_data');
  assert.equal(evaluateGscHealth({ ...empty, byQuery: fixture().byQuery }), 'unavailable');
  assert.equal(evaluateGscHealth(undefined), 'unavailable');
});

test('malformed source, scope, dates, counters and incomplete sections cannot report healthy', () => {
  for (const corrupt of [
    (r) => { r.source = 'edge'; },
    (r) => { r.site = 'sc-domain:another.example'; },
    (r) => { delete r.byQuery; },
    (r) => { r.byDate[0].date = '2026-02-30'; },
    (r) => { r.byDate[0].impressions = -1; },
    (r) => { r.totals.clicks += 1; },
    (r) => { r.byDate.push(r.byDate[0]); },
  ]) {
    const report = fixture(); corrupt(report);
    assert.equal(evaluateGscHealth(report), 'unavailable');
  }
});

test('oversized and invalid artifacts are rejected without leaving a temporary directory', async () => {
  for (const raw of ['{bad-json', ' '.repeat(256 * 1024 + 1)]) {
    let cwd;
    assert.equal(await readGscHealth({ env, runner: async (options) => {
      cwd = options.cwd; await mkdir(path.join(cwd, 'content'));
      await writeFile(path.join(cwd, 'content/gsc.json'), raw);
    } }), 'unavailable');
    await assert.rejects(access(cwd));
  }
});

test('repository TMPDIR and symlink artifacts fail closed', async () => {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  assert.equal(await readGscHealth({ env, temporaryRoot: repo, runner: () => assert.fail('must not run') }), 'unavailable');
  const external = await mkdtemp(path.join(tmpdir(), 'tds-gsc-test-'));
  try {
    const output = path.join(external, 'data.json');
    await writeFile(output, JSON.stringify(fixture()));
    let cwd;
    assert.equal(await readGscHealth({ env, runner: async (options) => {
      cwd = options.cwd; await mkdir(path.join(cwd, 'content'));
      await symlink(output, path.join(cwd, 'content/gsc.json'));
    } }), 'unavailable');
    await assert.rejects(access(cwd));
    await access(output);
  } finally { await rm(external, { recursive: true, force: true }); }
});

test('CLI emits one fixed line for missing credentials, detailed successful data and raw errors', async () => {
  for (const [options, expected] of [
    [{ env: {} }, 'missing_credentials'],
    [{ env, runner: async ({ cwd }) => writeFixture(cwd) }, 'healthy'],
    [{ env, runner: async () => { throw new Error('credential-sentinel private-query-sentinel'); } }, 'unavailable'],
  ]) {
    const lines = [];
    await gscHealthCli(options, (line) => lines.push(line));
    assert.deepEqual(lines, [`TDS GSC: health=${expected}`]);
  }
  assert.equal(publicGscHealth('credential-sentinel'), 'TDS GSC: health=unavailable');
});
