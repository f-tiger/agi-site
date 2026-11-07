import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import {
  buildReportRequest, createAssertion, expectedReportDates, evaluateReport,
  fetchGoogleJson, collectGoal, healthLine,
} from './traffic-goal.mjs';

const clock = new Date('2026-11-07T12:00:00Z');
const context = () => ({ request: buildReportRequest(), startedAt: clock, receivedAt: clock });
const dates = ['20261028', '20261029', '20261030', '20261031', '20261101', '20261102', '20261103'];
function report(values = Array(7).fill(1000)) {
  return {
    dimensionHeaders: [{ name: 'date' }],
    metricHeaders: [{ name: 'totalUsers', type: 'TYPE_INTEGER' }],
    metadata: { timeZone: 'UTC', subjectToThresholding: false, dataLossFromOtherRow: false },
    rowCount: 7,
    rows: dates.map((date, i) => ({ dimensionValues: [{ value: date }], metricValues: [{ value: String(values[i]) }] })),
  };
}
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const credentials = {
  type: 'service_account', client_email: 'fixture@local-test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  token_uri: 'https://untrusted.invalid/do-not-use',
};
const env = { GA4_PROPERTY_ID: '123456789', GA4_SERVICE_ACCOUNT_JSON: JSON.stringify(credentials) };
const response = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

test('seven daily counts use their mean; a low individual day does not change the chosen definition', () => {
  assert.deepEqual(evaluateReport(report(), context()), { health: 'available', result: 'met' });
  assert.equal(evaluateReport(report([999, 1000, 1000, 1000, 1000, 1000, 1000]), context()).result, 'below_target');
  assert.equal(evaluateReport(report([0, 0, 0, 0, 0, 0, 7000]), context()).result, 'met');
  assert.equal(evaluateReport(report(Array(7).fill(0)), context()).result, 'below_target');
});

test('edge IPs, period totalUsers and daily sessions cannot qualify as the daily GA4 user source', () => {
  for (const fake of [
    { source: 'Cloudflare', days: dates.map(date => ({ date, uniques: 100000 })) },
    { totals: { users: 70000 }, sections: { 'Daily sessions': dates.map(Date => ({ Date, Sessions: 10000 })) } },
    { ...report(), metricHeaders: [{ name: 'sessions', type: 'TYPE_INTEGER' }] },
  ]) assert.equal(evaluateReport(fake, context()).result, 'unknown');
});

test('scope and provenance-bearing request must retain the exact TDS hostname and fixed metric/window', () => {
  for (const change of [
    r => { delete r.dimensionFilter; },
    r => { r.dimensionFilter.filter.stringFilter.value = 'www.thedollscout.com'; },
    r => { r.dimensionFilter.filter.stringFilter.matchType = 'CONTAINS'; },
    r => { r.metrics[0].name = 'sessions'; },
    r => { r.dateRanges[0].endDate = 'yesterday'; },
  ]) {
    const ctx = context(); change(ctx.request);
    assert.equal(evaluateReport(report(), ctx).health, 'invalid_scope');
  }
  assert.equal(evaluateReport(report()).result, 'unknown');
});

test('property timezone controls calendar dates, including DST; crossing local midnight is unknown', () => {
  const start = new Date('2026-11-07T00:30:00Z');
  assert.deepEqual(expectedReportDates('UTC', start, start), dates);
  assert.deepEqual(expectedReportDates('America/Los_Angeles', start, start), [
    '20261027', '20261028', '20261029', '20261030', '20261031', '20261101', '20261102',
  ]);
  const local = report(); local.metadata.timeZone = 'America/Los_Angeles';
  assert.equal(evaluateReport(local, { ...context(), startedAt: start, receivedAt: start }).result, 'unknown');
  assert.throws(() => expectedReportDates('UTC', '2026-11-07T23:59:59Z', '2026-11-08T00:00:01Z'));
  assert.throws(() => expectedReportDates('Invalid/Timezone', start, start));
  assert.throws(() => expectedReportDates('UTC', start, new Date(start.getTime() + 60_000)));
  assert.throws(() => expectedReportDates('UTC', start, new Date(start.getTime() - 1)));
});

test('missing, duplicate, shifted or truncated days stay unknown instead of becoming zero', () => {
  for (const change of [
    r => { r.rows.pop(); },
    r => { r.rowCount = 8; },
    r => { r.rowCount = '7'; },
    r => { r.rows[0].dimensionValues[0].value = '20261029'; },
    r => { r.rows[0].dimensionValues[0].value = '20261027'; },
    r => { r.rows[0].dimensionValues[0].value = '20260230'; },
    r => { delete r.metadata.timeZone; },
    r => { r.rows = []; r.rowCount = 0; },
    r => { r.rows[0].dimensionValues.push({ value: 'extra' }); },
  ]) {
    const data = report(); change(data);
    assert.equal(evaluateReport(data, context()).result, 'unknown');
  }
  const reversed = report(); reversed.rows.reverse();
  assert.equal(evaluateReport(reversed, context()).result, 'met');
});

test('only nonnegative safe integer metric strings are admitted', () => {
  for (const invalid of ['-1', '1.0', '1e3', 'NaN', 'Infinity', '', ' 1000', 1000, '9007199254740992']) {
    const data = report(); data.rows[0].metricValues[0].value = invalid;
    assert.equal(evaluateReport(data, context()).health, 'invalid_metric');
  }
  // Individual values remain safe; exact BigInt addition avoids sum rounding.
  assert.equal(evaluateReport(report(Array(7).fill(Number.MAX_SAFE_INTEGER)), context()).result, 'met');
});

test('sampling, thresholding, other-row loss, restrictions and explicit empty reasons block success', () => {
  for (const metadata of [
    { subjectToThresholding: true }, { subjectToThresholding: 'false' },
    { dataLossFromOtherRow: true }, { samplingMetadatas: [{ samplesReadCount: '1', samplingSpaceSize: '2' }] },
    { samplingMetadatas: null }, { samplingMetadata: [{}] },
    { schemaRestrictionResponse: { activeMetricRestrictions: [{ metricName: 'totalUsers' }] } },
    { emptyReason: 'REDACTED' },
  ]) {
    const data = report(); Object.assign(data.metadata, metadata);
    assert.equal(evaluateReport(data, context()).health, 'quality_limited');
  }
  const omittedDefaults = report(); omittedDefaults.metadata = { timeZone: 'UTC' };
  assert.equal(evaluateReport(omittedDefaults, context()).result, 'met');
});

test('JWT is genuine base64url JSON with a verifiable RS256 signature and fixed audience/scope', () => {
  const jwt = createAssertion(credentials, clock);
  const [header, claim, signature] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  const payload = JSON.parse(Buffer.from(claim, 'base64url'));
  assert.equal(payload.iss, credentials.client_email);
  assert.equal(payload.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(payload.scope, 'https://www.googleapis.com/auth/analytics.readonly');
  assert.equal(payload.iat, 1794052800);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.ok(verify('RSA-SHA256', Buffer.from(`${header}.${claim}`), publicKey, Buffer.from(signature, 'base64url')));
  assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${claim}changed`), publicKey, Buffer.from(signature, 'base64url')), false);
});

test('missing or invalid credentials never call the network', async () => {
  for (const bad of [{}, { ...env, GA4_PROPERTY_ID: 'G-2SEHFY33H8' }, { ...env, GA4_SERVICE_ACCOUNT_JSON: '{' }]) {
    const result = await collectGoal({ env: bad, fetchImpl: () => { assert.fail('unexpected network'); } });
    assert.equal(result.result, 'unknown');
  }
});

test('collector uses two fixed Google requests and only returns health/result, never raw values', async () => {
  const calls = [];
  const result = await collectGoal({ env, now: () => clock, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return response({ access_token: 'fixture-token' });
    return response(report());
  } });
  assert.deepEqual(result, { health: 'available', result: 'met' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(calls[1].url, 'https://analyticsdata.googleapis.com/v1beta/properties/123456789:runReport');
  assert.deepEqual(JSON.parse(calls[1].options.body), buildReportRequest());
  for (const call of calls) {
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.method, 'POST');
    assert.equal(call.options.credentials, 'omit');
  }
});

test('quota, authorization, malformed responses and network errors stay unknown without retries or error leakage', async () => {
  for (const fail of [
    () => new Response('PRIVATE-CONTENT', { status: 429 }),
    () => new Response('PRIVATE-CONTENT', { status: 403 }),
    () => new Response('PRIVATE-CONTENT', { status: 200 }),
    () => { throw new Error('PRIVATE-CONTENT'); },
  ]) {
    let calls = 0;
    const result = await collectGoal({ env, now: () => clock, fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? response({ access_token: 'fixture-token' }) : fail();
    } });
    assert.equal(calls, 2);
    assert.equal(result.result, 'unknown');
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|fixture-token|123456789/);
  }
  let calls = 0;
  const authFailure = await collectGoal({ env, now: () => clock, fetchImpl: async () => {
    calls += 1; return new Response('PRIVATE', { status: 401 });
  } });
  assert.equal(calls, 1);
  assert.equal(authFailure.health, 'auth_unavailable');
});

test('fixed endpoints, response limits and timeout are enforced before data can escape', async () => {
  const url = 'https://oauth2.googleapis.com/token';
  await assert.rejects(fetchGoogleJson('https://untrusted.invalid/', {}, {
    fetchImpl: () => { assert.fail('unexpected network'); },
  }), /invalid_endpoint/);
  await assert.rejects(fetchGoogleJson(url, {}, {
    maxBytes: 10, fetchImpl: async () => new Response('12345678901'),
  }), /response_too_large/);
  await assert.rejects(fetchGoogleJson(url, {}, {
    maxBytes: 10, fetchImpl: async () => new Response('{}', { headers: { 'content-length': '11' } }),
  }), /response_too_large/);
  await assert.rejects(fetchGoogleJson(url, {}, {
    timeoutMs: 5, fetchImpl: async () => new Promise(() => {}),
  }), /request_timeout/);
});

test('public output admits only fixed states and never interpolates arbitrary errors or metrics', () => {
  assert.equal(healthLine({ health: 'missing_credentials', result: 'met' }), 'TDS traffic goal: health=missing_credentials result=unknown');
  assert.equal(healthLine({ health: 'available', result: 'met', users: 7000 }), 'TDS traffic goal: health=available result=met');
  assert.equal(healthLine({ health: 'PRIVATE_ERROR', result: 'SECRET' }), 'TDS traffic goal: health=unavailable result=unknown');
});
