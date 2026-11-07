import assert from 'node:assert/strict';
import {summarizeShoppingReport} from './shopping-report.mjs';

// Read-only metadata/index and aggregate verification. Never send synthetic events.
const response = await fetch('https://thedollscout.com/api/shopping-growth?ci=1', {
  headers: {'user-agent': 'tds-ci-selfcheck/1.0', 'x-probe': 'shopping-measurement-release'},
  redirect: 'error', signal: AbortSignal.timeout(20000)
});
const report = await response.json();
assert.equal(response.status, 200, `Shopping measurement unavailable: HTTP ${response.status}`);
assert.equal(response.headers.get('x-robots-tag'), 'noindex');
// Reuse strict schema/window/item/count validation; failures never print raw rows or totals.
const health = summarizeShoppingReport(report);
assert.ok(Math.abs(Date.now() - Date.parse(report.generated)) < 300000, 'Fresh release measurement required');
console.log(`Shopping measurement verified: indexed production query, ${health.status}, ${report.coveredDays} complete UTC days; actions are not people, sales or revenue.`);
