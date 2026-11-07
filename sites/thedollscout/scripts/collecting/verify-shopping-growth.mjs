import assert from 'node:assert/strict';
import {SHOPPING_PATHS, MERCHANTS, CACHE_SECONDS, FIRST_FULL_UTC_DAY, shoppingWindow, aggregateShopping} from '../../functions/api/shopping-growth.js';

// Read-only metadata/index and aggregate verification. Never send synthetic events.
const response = await fetch('https://thedollscout.com/api/shopping-growth?ci=1', {
  headers: {'user-agent': 'tds-ci-selfcheck/1.0', 'x-probe': 'shopping-measurement-release'},
  redirect: 'error', signal: AbortSignal.timeout(20000)
});
const report = await response.json();
assert.equal(response.status, 200, `Shopping measurement unavailable: ${report.error || response.status}`);
assert.equal(response.headers.get('x-robots-tag'), 'noindex');
assert.equal(report.ok, true); assert.equal(report.unit, 'anonymous_events_not_users');
assert.equal(report.first_full_utc_day, FIRST_FULL_UTC_DAY); assert.equal(report.cache_seconds, CACHE_SECONDS);
assert.ok(Number.isFinite(Date.parse(report.generated)) && Math.abs(Date.now() - Date.parse(report.generated)) < 300000);
const expected = shoppingWindow(new Date(report.generated));
for (const key of Object.keys(expected)) assert.deepEqual(report[key], expected[key], key);
assert.deepEqual(report.scope, {paths: SHOPPING_PATHS, merchants: MERCHANTS});
assert.ok(Array.isArray(report.daily) && report.daily.length <= 10000);
if (!report.coveredDays) {
  assert.equal(report.counts, null); assert.equal(report.daily.length, 0); assert.equal(report.query_rows_read, 0);
} else {
  const aggregate = aggregateShopping(report.daily.map(row => ({d: row.date, path: row.path, country_code: row.country,
    ev: row.event === 'pageview' ? '' : row.event, merchant: row.merchant === null ? '' : row.merchant, n: row.n})), expected);
  assert.deepEqual(report.counts, aggregate.counts); assert.deepEqual(report.daily, aggregate.daily);
}
console.log(`Shopping measurement verified: indexed production query, ${report.coverage}, ${report.coveredDays} complete UTC days; actions are not people, sales or revenue.`);
