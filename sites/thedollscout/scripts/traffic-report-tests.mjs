// Offline subprocess fixtures: production fetch is replaced before the scripts
// load. No inherited credentials, no live queries and no repository data writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const maps = (entries, key, value = 'requests') => Object.entries(entries).map(([k, v]) => ({ [key]: k, [value]: v }));
const fixtureDay = (sum = {}) => ({
  dimensions: { date: '2026-10-07' },
  sum: {
    requests: 100, pageViews: 40,
    browserMap: maps({ Unknown: 20, Curl: 10, BingBot: 3, Chrome: 6, ChromeHeadless: 1 }, 'uaBrowserFamily', 'pageViews'),
    ipClassMap: maps({ noRecord: 80, searchEngine: 20 }, 'ipType'),
    responseStatusMap: maps({ 200: 50, 404: 30, 403: 20 }, 'edgeResponseStatus'),
    contentTypeMap: maps({ html: 50, css: 30, js: 20 }, 'edgeResponseContentTypeName'),
    countryMap: maps({ DE: 100 }, 'clientCountryName'),
    ...sum,
  },
  uniq: { uniques: 15 },
});
const prior = { source: 'old source', note: 'old note', days: {
  '2026-07-26': { date: '2026-07-26', requests: 9, pageViews: 4, uniques: 2, byBrowser: { Unknown: 4 } },
} };

function run(script, fixture, { tokens = true, history = prior } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'tds-report-test-'));
  try {
    mkdirSync(join(dir, 'scripts/documents'), { recursive: true });
    mkdirSync(join(dir, 'content'));
    const target = join(dir, 'scripts', script);
    writeFileSync(target, readFileSync(join(root, 'scripts', script)));
    writeFileSync(join(dir, 'fixture.json'), JSON.stringify(fixture));
    writeFileSync(join(dir, 'content/traffic.json'), JSON.stringify(history));
    writeFileSync(join(dir, 'mock.mjs'), `
      import { readFileSync } from 'node:fs';
      const fixture = JSON.parse(readFileSync(process.env.FIXTURE, 'utf8'));
      Date.now = () => Date.parse('2026-10-08T12:00:00Z');
      globalThis.fetch = async (url, init) => {
        const u = new URL(url); let body;
        if (u.href === 'https://thedollscout.com/api/document-stats') {
          body = fixture.document;
        } else if (u.origin !== 'https://api.cloudflare.com') {
          throw new Error('Unexpected fixture URL: ' + u.href);
        } else if (u.pathname === '/client/v4/user/tokens/verify') {
          body = { result: { id: 'fixture-token-id' } };
        } else if (u.pathname === '/client/v4/zones') {
          body = { success: true, result: [{ id: 'fixture-zone' }] };
        } else if (u.pathname === '/client/v4/graphql') {
          const { query } = JSON.parse(init.body);
          if (fixture.rejectAll || (fixture.rejectBrowser && query.includes('browserMap')) ||
              (fixture.rejectReputation && query.includes('ipClassMap'))) {
            body = { errors: [{ message: 'fixture field unavailable' }] };
          } else {
            const days = structuredClone(fixture.days);
            for (const day of days) {
              if (!query.includes('browserMap')) { delete day.sum.browserMap; delete day.sum.contentTypeMap; }
              if (!query.includes('ipClassMap')) { delete day.sum.ipClassMap; delete day.sum.responseStatusMap; delete day.sum.countryMap; }
            }
            body = { data: { viewer: { zones: [{ httpRequests1dGroups: days }] } } };
          }
        } else throw new Error('Unexpected fixture URL: ' + u.href);
        return { ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body };
      };
    `);
    const env = { PATH: process.env.PATH, FIXTURE: join(dir, 'fixture.json'), GITHUB_STEP_SUMMARY: join(dir, 'summary.md') };
    if (tokens) env.CLOUDFLARE_API_TOKEN = 'fixture-only-not-a-credential';
    const result = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), target], { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    return {
      stdout: result.stdout,
      traffic: JSON.parse(readFileSync(join(dir, 'content/traffic.json'), 'utf8')),
      ...(fixture.document ? { document: JSON.parse(readFileSync(join(dir, 'content/document-metrics.json'), 'utf8')), summary: readFileSync(join(dir, 'summary.md'), 'utf8') } : {}),
    };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const banned = /page view\(s\) attributed to a browser|Was anyone a person|definitionally not a customer|genuinely nobody arrived|is the \*\*ceiling\*\*|which is what a real browser does|signature of vulnerability scanners/;

test('raw UA families remain separate from people and preserve history/counts', () => {
  const { stdout, traffic } = run('cf-analytics.mjs', { days: [fixtureDay()] });
  assert.match(stdout, /Raw edge requests: 100 · Raw edge page views: 40/);
  assert.match(stdout, /40 page view\(s\) in the returned user-agent-family breakdown/);
  for (const [label, n] of Object.entries({ Unknown: 20, Curl: 10, BingBot: 3, Chrome: 6, ChromeHeadless: 1 })) {
    assert.ok(stdout.includes(`| ${label} | ${n} |`));
  }
  assert.match(stdout, /not verification of a person or qualified visit/);
  assert.match(stdout, /cannot pass or fail the collector's 100-qualified-visit gate/);
  assert.doesNotMatch(stdout, banned);
  assert.deepEqual(traffic.days['2026-07-26'], prior.days['2026-07-26']);
  assert.deepEqual(traffic.days['2026-10-07'], {
    date: '2026-10-07', requests: 100, pageViews: 40, uniques: 15,
    byIpType: { noRecord: 80, searchEngine: 20 },
    byBrowser: { Unknown: 20, Curl: 10, Chrome: 6, BingBot: 3, ChromeHeadless: 1 },
    byContentType: { html: 50, css: 30, js: 20 }, byStatus: { 200: 50, 404: 30, 403: 20 }, topCountries: { DE: 100 },
  });
  assert.deepEqual(traffic.window, { since: '2026-07-26', until: '2026-10-07' });
  assert.match(traffic.note, /not verified browsers or people/);
  assert.match(traffic.note, /Missing breakdowns are unavailable/);
});

test('multiple days sum raw requests/views but never sum unique IPs into visitors', () => {
  const day2 = fixtureDay(); day2.dimensions.date = '2026-10-06'; day2.uniq.uniques = 25;
  const { stdout } = run('cf-analytics.mjs', { days: [day2, fixtureDay()] });
  assert.match(stdout, /Raw edge requests: 200 · Raw edge page views: 80/);
  assert.match(stdout, /Unique IPs: 20\/day avg, 25 peak/);
  assert.match(stdout, /not summed or treated as people/);
});

for (const clean of [undefined, 0]) test(`clean ${clean === undefined ? 'absent' : 'zero'} is not a human ceiling`, () => {
  const ipClassMap = maps({ noRecord: 80, ...(clean === undefined ? {} : { clean }) }, 'ipType');
  const { stdout } = run('cf-analytics.mjs', { days: [fixtureDay({ ipClassMap })] });
  assert.match(stdout, /not a human-request ceiling/);
  assert.doesNotMatch(stdout, /`clean` \(0\)|definitionally not a customer/);
  if (clean === 0) assert.match(stdout, /\| clean \| 0 \|/);
});

for (const browserMap of [undefined, []]) test(`browser breakdown ${browserMap ? 'empty' : 'missing'} is not zero people`, () => {
  const { stdout } = run('cf-analytics.mjs', { days: [fixtureDay({ browserMap })] });
  assert.match(stdout, /unavailable or empty breakdown/);
  assert.match(stdout, /does not establish zero browser traffic or zero people/);
  assert.doesNotMatch(stdout, /\*\*0 page view/);
});

for (const plain of [false, true]) test(`degraded ${plain ? 'plain counts' : 'reputation'} tier retains counts without invented zeros`, () => {
  const { stdout, traffic } = run('cf-analytics.mjs', { days: [fixtureDay()], rejectBrowser: true, rejectReputation: plain });
  assert.match(stdout, /missing breakdowns are not zero/);
  assert.match(stdout, /No query tier establishes a bot\/human split/);
  assert.equal(traffic.days['2026-10-07'].pageViews, 40);
  assert.deepEqual(traffic.days['2026-10-07'].byBrowser, {});
  assert.doesNotMatch(stdout, banned);
});

for (const types of [{ html: 90, css: 0, js: 0 }, { 'text/html': 50, 'text/css': 25, 'application/javascript': 25 }]) {
  test('raw content-type labels and error status counts do not identify people or bots', () => {
    const { stdout } = run('cf-analytics.mjs', { days: [fixtureDay({ contentTypeMap: maps(types, 'edgeResponseContentTypeName') })] });
    for (const [label, n] of Object.entries(types)) assert.ok(stdout.includes(`| ${label} | ${n} |`));
    assert.match(stdout, /do not prove page rendering or human activity/);
    assert.match(stdout, /50 of 100 requests got a 404\/403/);
    assert.match(stdout, /Status codes alone do not distinguish/);
    assert.doesNotMatch(stdout, banned);
  });
}

for (const mode of ['no credentials', 'API refused', 'empty rows']) test(`${mode} preserves last snapshot and reports unavailable`, () => {
  const { stdout, traffic } = run('cf-analytics.mjs', { days: mode === 'empty rows' ? [] : [fixtureDay()], rejectAll: mode === 'API refused' }, { tokens: mode !== 'no credentials' });
  assert.match(stdout, /\*\*Unavailable\.\*\*/);
  assert.doesNotMatch(stdout, /Raw edge requests: 0|genuinely nobody/);
  assert.deepEqual(traffic, prior);
});

test('observed zero edge counts stay scoped to the zone/window, not zero people', () => {
  const { stdout } = run('cf-analytics.mjs', { days: [fixtureDay({ requests: 0, pageViews: 0, browserMap: [], ipClassMap: [], contentTypeMap: [], responseStatusMap: [], countryMap: [] })] });
  assert.match(stdout, /Raw edge requests: 0 · Raw edge page views: 0/);
  assert.match(stdout, /only to the queried zone\/window; unavailable data is not zero/);
  assert.doesNotMatch(stdout, banned);
});

const document = {
  ok: true, since: '2026-09-25', days: 28, generated: '2026-10-08T13:05:50.774Z',
  tool_views: 32, homepage_views: 26, dedicated_tool_views: 6,
  events: { doc_view: 43, doc_video_load_shotcut: 1 }, excluded: { doc_ci: 111 },
  unit: 'Anonymous action counts. Not unique users; not verified buyers. Open endpoint counts can be spoofed.',
  attribution_scope: 'Per-action observed referrer, not session attribution or a conversion rate.',
};
test('legacy document total, homepage and dedicated views are distinct unchanged actions', () => {
  const result = run('documents/metrics.mjs', { document });
  assert.match(result.stdout, /Legacy tool_views \(includes homepage views\): 32/);
  assert.match(result.stdout, /Homepage views: 26 · Dedicated tool-page views: 6/);
  assert.match(result.stdout, /"doc_view":43,"doc_video_load_shotcut":1/);
  assert.match(result.stdout, /"doc_ci":111/);
  assert.match(result.stdout, /rolling window: up to 28 days including current day; no earlier than 2026-09-25/);
  assert.match(result.stdout, /Generated: 2026-10-08T13:05:50.774Z/);
  assert.match(result.stdout, /Video loads are not completed watches; collector views use a separate event stream/);
  assert.match(result.stdout, /Open endpoint counts can be spoofed/);
  assert.doesNotMatch(result.stdout, /28-day tool-page views: 32/);
  assert.deepEqual(result.document, document);
  assert.equal(result.stdout, result.summary + '\n');
});

test('missing document summary fields say unavailable, while explicit zero stays zero', () => {
  const { stdout } = run('documents/metrics.mjs', { document: { ...document, homepage_views: null, dedicated_tool_views: 0, tool_views: undefined } });
  assert.match(stdout, /Legacy tool_views \(includes homepage views\): unavailable/);
  assert.match(stdout, /Homepage views: unavailable · Dedicated tool-page views: 0/);
});

test('D1 warning reports API failure without guessing a credential root cause', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/tds-traffic.yml'), 'utf8');
  assert.match(workflow, /7403 本身不能区分账号不匹配与授权不足/);
  assert.doesNotMatch(workflow, /若所有 token 都报 7403,就是都缺 Account/);
});
