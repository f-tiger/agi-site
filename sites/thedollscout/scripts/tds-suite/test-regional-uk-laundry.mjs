import test from 'node:test';
import assert from 'node:assert/strict';
import {UK_LAUNDRY_TOOL, runUkLaundryTool} from '../../collector-assets/tds-suite/regional-uk-laundry.mjs';
import {matchesInputSchema} from '../../collector-assets/tds-suite/input-schema.mjs';
import {sumMeasuredKwh} from '../../collector-assets/tds-suite/uk-laundry-measurement.mjs';
import {buildMarketPages, loadMarketGuides} from '../collecting/market-guides.mjs';

const example = () => ({...UK_LAUNDRY_TOOL.example});

test('whole-session readings add as decimals and check the total before rounding', () => {
  const {maximum} = UK_LAUNDRY_TOOL.inputSchema.properties.sessionAKwh;
  assert.deepEqual(sumMeasuredKwh([0.4, 0.85], maximum), {status: 'ok', value: 1.25});
  assert.deepEqual(sumMeasuredKwh([0.1, 0.2, 0], maximum), {status: 'ok', value: 0.3});
  assert.deepEqual(sumMeasuredKwh([0], maximum), {status: 'ok', value: 0});
  assert.deepEqual(sumMeasuredKwh([49.99, 0.01], maximum), {status: 'ok', value: 50});
  assert.deepEqual(sumMeasuredKwh([50, 5e-324], maximum), {status: 'over'});
  assert.deepEqual(sumMeasuredKwh([], maximum), {status: 'empty'});
  for (const reading of [-0.01, NaN, Infinity]) {
    assert.deepEqual(sumMeasuredKwh([reading], maximum), {status: 'invalid'});
  }
});

test('UK laundry definition gives one bounded measured-session task and a dated actual UK manufacturer reference', () => {
  const tool = UK_LAUNDRY_TOOL;
  assert.equal(tool.name, 'tds_uk_laundry_session');
  assert.equal(tool.slug, 'uk-laundry-session');
  assert.equal(tool.category, 'climate');
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.ok(matchesInputSchema(tool.example, tool.inputSchema));
  for (const field of tool.inputSchema.required) {
    assert.ok(Object.hasOwn(tool.inputSchema.properties, field));
    for (const lang of ['en', 'de', 'zh']) assert.ok(tool.fieldTitles[field][lang]?.trim());
  }
  for (const lang of ['en', 'de', 'zh']) {
    assert.ok(tool.title[lang]?.trim());
    assert.ok(tool.description[lang]?.trim());
  }
  assert.equal(tool.evidence.url, 'https://www.meaco.com/products/meacodryarete1-12l');
  assert.equal(tool.evidence.checked, '2026-11-22');
});

test('measured sessions convert pence to GBP and compare weekly electricity without a watts shortcut', () => {
  const result = runUkLaundryTool(example());
  assert.equal(result.status, 'comparison_ready');
  assert.equal(result.currency, 'GBP');
  assert.equal(result.market, 'UK');
  assert.deepEqual(result.calculation.sessionA, {measuredKwhPerSession: 1.2, electricityGbpPerSession: 0.33, electricityGbpPerWeek: 1.65});
  assert.deepEqual(result.calculation.sessionB, {measuredKwhPerSession: 0.8, electricityGbpPerSession: 0.22, electricityGbpPerWeek: 1.1});
  assert.deepEqual(result.calculation.comparison, {sessionBMinusAGbpPerSession: -0.11, sessionBMinusAGbpPerWeek: -0.55});
  assert.match(result.message, /£0\.55 less/);
  assert.equal(result.referenceModel.publishedPowerWatts, 151);
  assert.match(result.referenceModel.publishedPowerConditions, /20°C.*60%/);
  assert.match(result.referenceModel.scope, /not a whole-session energy reading/);
  assert.match(result.scope, /Purchase price, standing charges, maintenance and heating effects are excluded/);
});

test('weekly totals use unrounded energy cost and displayed differences reconcile to the displayed prices', () => {
  const result = runUkLaundryTool({...example(), sessionAKwh: 0.13, sessionBKwh: 0.26, tariffPencePerKwh: 28, sessionsPerWeek: 7});
  assert.equal(result.calculation.sessionA.electricityGbpPerSession, 0.04);
  assert.equal(result.calculation.sessionA.electricityGbpPerWeek, 0.25, 'Do not multiply the rounded4p session price by7');
  assert.equal(result.calculation.sessionB.electricityGbpPerSession, 0.07);
  assert.equal(result.calculation.sessionB.electricityGbpPerWeek, 0.51);
  assert.deepEqual(result.calculation.comparison, {sessionBMinusAGbpPerSession: 0.03, sessionBMinusAGbpPerWeek: 0.26});
  assert.match(result.message, /£0\.26 more/);
});

test('half-penny arithmetic follows decimal inputs even when their binary product lies below the tie', () => {
  const result = runUkLaundryTool({...example(), sessionAKwh: 0.29, sessionBKwh: 0.27, tariffPencePerKwh: 50});
  assert.equal(result.calculation.sessionA.electricityGbpPerSession, 0.15);
  assert.equal(result.calculation.sessionA.electricityGbpPerWeek, 0.73);
  assert.equal(result.calculation.sessionB.electricityGbpPerSession, 0.14);
  assert.equal(result.calculation.sessionB.electricityGbpPerWeek, 0.68);
  assert.deepEqual(result.calculation.comparison, {sessionBMinusAGbpPerSession: -0.01, sessionBMinusAGbpPerWeek: -0.05});
  const tiny = runUkLaundryTool({...example(), sessionAKwh: 1e-9, sessionBKwh: 5e-324, tariffPencePerKwh: 27.5});
  assert.equal(tiny.calculation.sessionA.electricityGbpPerWeek, 0);
  assert.equal(tiny.calculation.sessionB.electricityGbpPerWeek, 0);
});

test('equivalence must be confirmed before interpreting the difference between two entered sessions', () => {
  const result = runUkLaundryTool({...example(), comparableSessions: false});
  assert.equal(result.status, 'needs_comparable_sessions');
  assert.equal(result.calculation.comparison, null);
  assert.equal(result.calculation.sessionA.electricityGbpPerSession, 0.33);
  assert.equal(result.calculation.sessionB.electricityGbpPerWeek, 1.1);
  assert.match(result.message, /similar loads, conditions and final dryness before comparing/);
  assert.doesNotMatch(result.message, /costs £|cheaper|more in electricity|less in electricity/);
});

test('equal entered cost and a zero marginal tariff do not manufacture savings', () => {
  for (const args of [{...example(), sessionBKwh: 1.2}, {...example(), tariffPencePerKwh: 0}]) {
    const result = runUkLaundryTool(args);
    assert.deepEqual(result.calculation.comparison, {sessionBMinusAGbpPerSession: 0, sessionBMinusAGbpPerWeek: 0});
    assert.match(result.message, /same weekly electricity cost/);
    assert.match(result.message, /does not establish equal drying performance/);
  }
});

test('invalid, unbounded and extra inputs are rejected rather than echoed or treated as a completed comparison', () => {
  const invalid = [null, [], {}, {...example(), sessionAKwh: -0.01}, {...example(), sessionBKwh: 50.01},
    {...example(), sessionAKwh: NaN}, {...example(), tariffPencePerKwh: Infinity},
    {...example(), tariffPencePerKwh: -1}, {...example(), tariffPencePerKwh: 200.01},
    {...example(), sessionsPerWeek: 0}, {...example(), sessionsPerWeek: 22}, {...example(), sessionsPerWeek: 1.5},
    {...example(), sessionAKwh: '1.2'}, {...example(), comparableSessions: 'yes'},
    {...example(), merchant: 'https://private.invalid/'}, {...example(), powerWatts: 151}];
  for (const args of invalid) {
    assert.equal(matchesInputSchema(args, UK_LAUNDRY_TOOL.inputSchema), false);
    assert.throws(() => runUkLaundryTool(args), {name: 'TypeError', message: 'Invalid UK laundry-session inputs'});
  }
  for (const field of UK_LAUNDRY_TOOL.inputSchema.required) {
    const args = example(); delete args[field];
    assert.throws(() => runUkLaundryTool(args), TypeError);
  }
  const maximum = runUkLaundryTool({...example(), sessionAKwh: 50, sessionBKwh: 0, tariffPencePerKwh: 200, sessionsPerWeek: 21});
  assert.equal(maximum.calculation.sessionA.electricityGbpPerWeek, 2100);
  assert.equal(maximum.calculation.comparison.sessionBMinusAGbpPerWeek, -2100);
});

test('all three interfaces retain GBP, safe local next steps and the same source without fetching a merchant', () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => {throw Error('The calculator must run without network access');};
  try {
    for (const lang of ['en', 'de', 'zh', 'unknown']) {
      const result = runUkLaundryTool(example(), lang);
      assert.equal(result.currency, 'GBP');
      assert.ok(result.message.includes('£'));
      assert.equal(result.buyerGuide.url, 'https://thedollscout.com/uk/indoor-laundry#model-1');
      assert.ok(result.buyerGuide.label.length > 0);
      assert.equal(result.referenceModel.manufacturerSource, UK_LAUNDRY_TOOL.evidence.url);
      assert.equal(result.referenceModel.sourceChecked, UK_LAUNDRY_TOOL.evidence.checked);
      assert.doesNotMatch(JSON.stringify(result), /amazon\.|tag=|getecoback|ecoback|EUR|€/);
    }
    assert.equal(runUkLaundryTool(example(), 'unknown').message, runUkLaundryTool(example(), 'en').message);
  } finally {globalThis.fetch = previous;}
});

test('the UK laundry guide exposes the native tool before navigation and models, with parity in its text mirror', () => {
  const files = new Map(), data = loadMarketGuides();
  const records = buildMarketPages({write: (path, html) => files.set(path, html), data});
  const uk = files.get('uk/indoor-laundry.html');
  const toolHref = 'href="/ai-tools/uk-laundry-session"';
  assert.equal(uk.split(toolHref).length - 1, 1);
  assert.ok(uk.indexOf(toolHref) < uk.indexOf('class="market-links"'));
  assert.ok(uk.indexOf(toolHref) < uk.indexOf('id="models"'));
  assert.match(uk, /Electricity cost per load \(£\).*p\/kWh/);
  assert.match(uk, /Compare similar load sizes, room conditions and final dryness/);
  assert.match(uk, /TDS has not tested drying speed/);
  assert.match(uk, /Editorial sources checked: <time datetime="2026-11-15">/);
  const graph = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(uk)[1]);
  assert.equal(graph['@graph'].find(node => node['@type'] === 'WebPage').dateModified, '2026-11-26');
  assert.equal(records.find(row => row.url.endsWith('/uk/indoor-laundry')).modified, '2026-11-26');
  assert.match(files.get('collector-assets/text/uk/indoor-laundry.txt'), /https:\/\/thedollscout\.com\/ai-tools\/uk-laundry-session/);
  for (const [path, html] of files) {
    if (path.endsWith('.html') && !['uk/indoor-laundry.html', 'uk/index.html'].includes(path)) assert.ok(!html.includes(toolHref), path + ': do not add the UK calculator to a different market or task');
  }
  assert.doesNotMatch(uk, /tag=|rel="sponsored|B000KN4DQ4|amazon\.de\//);
});
