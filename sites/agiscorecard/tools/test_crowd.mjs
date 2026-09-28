// Zero-network test for /api/crowd (2026-09-27): label normalisation, bot exclusion, index use,
// failure shape, and that the worker routes the path through the aggregate cache.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { crowdResponse, crowdBucket, CROWD_BUCKETS } from './analytics-worker/index.js';

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day TEXT NOT NULL,
  name TEXT NOT NULL, location TEXT, label TEXT, path TEXT, ref_host TEXT, country TEXT, lang TEXT, ua_class TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT);
  CREATE INDEX idx_events_name ON events(name);`);
const ins = db.prepare("INSERT INTO events (ts, day, name, label, path, ua_class) VALUES (0,'2026-09-27',?,?,?,?)");
const rows = [
  ['vote_cast', '2027', '/', 'human'], ['vote_cast', 'true-believer', '/agi-test', null],
  ['vote_cast', '202830', '/', 'human'], ['vote_cast', '2028–30', '/', 'human'], ['vote_cast', 'realist', '/agi-test', 'human'],
  ['vote_cast', 'Never / 2040+', '/', 'human'], ['vote_cast', 'Never/2040', '/', 'human'],
  ['vote_cast', '2030s', '/', 'human'], ['vote_cast', '2025–26', '/', 'human'],
  ['vote_cast', 'realist', '/agi-test', 'bot'],               // bot: excluded
  ['vote_cast', 'the-project', '/progress-index', 'human'],   // other question: excluded
  ['vote_cast', 'garbage', '/', 'human'],                      // unknown label: dropped, not guessed
  ['tool_click', 'realist', '/agi-test', 'human'],             // other event: excluded
];
for (const r of rows) ins.run(...r);
const log = [];
const env = { EVENTS: { prepare(q) { let a = []; const st = { bind(...v) { a = v; return st; },
  async all() { log.push(q); return { results: db.prepare(q).all(...a) }; } }; return st; } } };

const body = await (await crowdResponse(env)).json();
assert.equal(body.ok, true);
assert.deepEqual(body.buckets, { accelerationist: 1, 'true-believer': 2, realist: 3, skeptic: 1, contrarian: 2 });
assert.equal(body.n, 9);
assert.ok(body.generated && !Number.isNaN(Date.parse(body.generated)));
for (const q of log) {
  const plan = db.prepare('EXPLAIN QUERY PLAN ' + q).all().map((r) => r.detail).join(' | ');
  assert.match(plan, /idx_events_name/, 'crowd query must use idx_events_name: ' + plan);
}
assert.equal(crowdBucket('x'), null);
assert.equal(CROWD_BUCKETS.length, 5);
const bad = await crowdResponse({ EVENTS: { prepare() { throw new Error('d1 down'); } } });
assert.equal(bad.status, 503);
assert.equal(bad.headers.get('cache-control'), 'no-store');
const W = fs.readFileSync(new URL('analytics-worker/index.js', import.meta.url), 'utf8');
assert.match(W, /aggregateCache\(request, ctx, 'crowd', 3600, \(\) => crowdResponse\(env\)\)/);
assert.match(W, /'crowd_view'/);
console.log('crowd: OK');
