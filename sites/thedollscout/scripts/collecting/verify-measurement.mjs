import assert from 'node:assert/strict';
import {collectorWindow, FIRST_FULL_UTC_DAY} from '../../functions/api/collector-growth.js';

// Read-only: EXPLAIN verifies the production date index even before a full day exists.
const response = await fetch('https://thedollscout.com/api/collector-growth?ci=1', {
  headers: {'user-agent':'tds-ci-selfcheck/1.0','x-probe':'collector-measurement-release'},
  signal: AbortSignal.timeout(20000)
});
const report = await response.json();
assert.equal(response.status, 200, `Collector measurement unavailable: ${report.error || response.status}`);
assert.equal(report.ok, true);
assert.equal(report.unit, 'anonymous_events_not_users');
assert.equal(report.first_full_utc_day, FIRST_FULL_UTC_DAY);
assert.ok(Number.isFinite(Date.parse(report.generated)));
const expected = collectorWindow(new Date(report.generated));
for (const key of Object.keys(expected)) assert.deepEqual(report[key], expected[key], key);
assert.ok(Array.isArray(report.browser) && Array.isArray(report.mcp));
if (!report.coveredDays) {
  assert.equal(report.counts, null);
  assert.equal(report.browser.length + report.mcp.length, 0);
} else {
  assert.equal(report.counts.browser_actions, report.browser.reduce((n,row)=>n+row.n,0));
  assert.equal(report.counts.mcp_tool_calls, report.mcp.reduce((n,row)=>n+row.n,0));
}
console.log(`Collector measurement verified: indexed production query, ${report.coverage}, ${report.coveredDays} complete UTC days; events are not users or revenue.`);
