/* Read-only TDS GA4 measured-user proxy. No raw reports, counts or identifiers
 * are written to disk/stdout. Missing evidence is unknown, never zero traffic.
 * This uses the existing credentials; it does not create or configure access.
 */
import { createPrivateKey, createSign } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REPORT_BASE = 'https://analyticsdata.googleapis.com/v1beta/properties/';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 15_000;
const DAY_MS = 86_400_000;
const unknown = health => ({ health, result: 'unknown' });

class SafeFailure extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function buildReportRequest() {
  return {
    dateRanges: [{ startDate: '10daysAgo', endDate: '4daysAgo' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'totalUsers' }],
    dimensionFilter: {
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: 'thedollscout.com', caseSensitive: true },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    keepEmptyRows: true,
    limit: '8',
  };
}

// Same standard base64url encoding as the existing GA4 script, not a JWT fix.
export function createAssertion(key, now = new Date()) {
  if (!key || key.type !== 'service_account' ||
      typeof key.client_email !== 'string' || key.client_email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(key.client_email) ||
      typeof key.private_key !== 'string' || key.private_key.length > 16_384) {
    throw new SafeFailure('invalid_credentials');
  }
  const seconds = Math.floor(new Date(now).getTime() / 1000);
  if (!Number.isSafeInteger(seconds) || seconds < 0) throw new SafeFailure('invalid_clock');
  const privateKey = createPrivateKey(key.private_key);
  if (privateKey.asymmetricKeyType !== 'rsa') throw new SafeFailure('invalid_credentials');
  const encode = value => Buffer.from(value).toString('base64url');
  const header = encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = encode(JSON.stringify({
    iss: key.client_email, scope: SCOPE, aud: TOKEN_URL,
    iat: seconds, exp: seconds + 3600,
  }));
  const signed = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signed);
  return `${signed}.${encode(signer.sign(privateKey))}`;
}

function localDate(date, timeZone) {
  const instant = new Date(date);
  if (!Number.isFinite(instant.getTime())) throw new SafeFailure('invalid_clock');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function expectedReportDates(timeZone, startedAt, receivedAt) {
  if (typeof timeZone !== 'string' || !timeZone || timeZone.length > 128) {
    throw new SafeFailure('invalid_timezone');
  }
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(receivedAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs || endMs - startMs > TIMEOUT_MS) {
    throw new SafeFailure('invalid_window');
  }
  const today = localDate(startedAt, timeZone);
  // Relative ranges are evaluated in the property's timezone. Crossing its
  // midnight during the request makes the absolute window ambiguous.
  if (today !== localDate(receivedAt, timeZone)) throw new SafeFailure('window_rollover');
  const anchor = Date.parse(`${today}T00:00:00Z`);
  // Calendar-date arithmetic avoids DST's variable-length local days. This
  // leaves three complete reporting dates as a processing buffer, not a
  // promise that exactly 72 elapsed hours guarantees finalized GA4 data.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(anchor - (10 - i) * DAY_MS).toISOString().slice(0, 10).replaceAll('-', ''));
}

function qualityIsUsable(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false;
  for (const field of ['subjectToThresholding', 'dataLossFromOtherRow']) {
    // Protobuf JSON may omit default false values.
    if (metadata[field] !== undefined && metadata[field] !== false) return false;
  }
  for (const field of ['samplingMetadatas', 'samplingMetadata']) {
    if (metadata[field] !== undefined && (!Array.isArray(metadata[field]) || metadata[field].length)) return false;
  }
  if (metadata.emptyReason !== undefined && metadata.emptyReason !== '') return false;
  if (metadata.schemaRestrictionResponse !== undefined) {
    const restrictions = metadata.schemaRestrictionResponse;
    if (!restrictions || typeof restrictions !== 'object' || Array.isArray(restrictions)) return false;
    if (restrictions.activeMetricRestrictions !== undefined &&
        (!Array.isArray(restrictions.activeMetricRestrictions) || restrictions.activeMetricRestrictions.length)) return false;
  }
  return true;
}

export function evaluateReport(report, { request, startedAt, receivedAt } = {}) {
  if (!isDeepStrictEqual(request, buildReportRequest())) return unknown('invalid_scope');
  if (!report || typeof report !== 'object' || Array.isArray(report) || report.error) return unknown('invalid_report');
  if (!Array.isArray(report.dimensionHeaders) || report.dimensionHeaders.length !== 1 ||
      report.dimensionHeaders[0]?.name !== 'date' ||
      !Array.isArray(report.metricHeaders) || report.metricHeaders.length !== 1 ||
      report.metricHeaders[0]?.name !== 'totalUsers' || report.metricHeaders[0]?.type !== 'TYPE_INTEGER') {
    return unknown('invalid_schema');
  }
  if (!qualityIsUsable(report.metadata)) return unknown('quality_limited');
  let expected;
  try { expected = expectedReportDates(report.metadata.timeZone, startedAt, receivedAt); }
  catch { return unknown('invalid_window'); }
  if (report.rowCount !== 7 || !Array.isArray(report.rows) || report.rows.length !== 7) return unknown('incomplete_days');
  const days = new Set(expected);
  let total = 0n;
  for (const row of report.rows) {
    if (!Array.isArray(row?.dimensionValues) || row.dimensionValues.length !== 1 ||
        !Array.isArray(row?.metricValues) || row.metricValues.length !== 1) return unknown('invalid_schema');
    const date = row.dimensionValues[0]?.value;
    const value = row.metricValues[0]?.value;
    if (typeof date !== 'string' || !days.delete(date)) return unknown('invalid_days');
    if (typeof value !== 'string' || !/^\d+$/.test(value) || value.length > 16 ||
        !Number.isSafeInteger(Number(value))) return unknown('invalid_metric');
    total += BigInt(value);
  }
  if (days.size) return unknown('incomplete_days');
  // A mean of seven separate daily user counts, not a seven-day distinct-user
  // total divided by seven. GA4 users remain a measured-user proxy, not people.
  return { health: 'available', result: total >= 7_000n ? 'met' : 'below_target' };
}

export async function fetchGoogleJson(url, options, {
  fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS, maxBytes = MAX_BYTES,
} = {}) {
  if (url !== TOKEN_URL && !/^https:\/\/analyticsdata\.googleapis\.com\/v1beta\/properties\/[1-9]\d{0,19}:runReport$/.test(url)) {
    throw new SafeFailure('invalid_endpoint');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > TIMEOUT_MS ||
      !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_BYTES) throw new SafeFailure('invalid_limits');
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new SafeFailure('request_timeout')); }, timeoutMs);
  });
  const operation = async () => {
    const response = await fetchImpl(url, {
      ...options, method: 'POST', redirect: 'error', credentials: 'omit',
      cache: 'no-store', signal: controller.signal,
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new SafeFailure(response.status === 429 ? 'rate_limited' : 'request_failed');
    }
    const declared = response.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
      void response.body?.cancel().catch(() => {});
      throw new SafeFailure('response_too_large');
    }
    if (!response.body?.getReader) throw new SafeFailure('invalid_response');
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maxBytes) throw new SafeFailure('response_too_large');
        chunks.push(value);
      }
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    } finally {
      void reader.cancel().catch(() => {});
    }
  };
  try { return await Promise.race([operation(), deadline]); }
  catch (error) { throw error instanceof SafeFailure ? error : new SafeFailure('request_failed'); }
  finally { clearTimeout(timer); controller.abort(); }
}

export async function collectGoal({ env = process.env, fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const property = env.GA4_PROPERTY_ID;
  const keyJson = env.GA4_SERVICE_ACCOUNT_JSON;
  if (!property || !keyJson) return unknown('missing_credentials');
  if (typeof property !== 'string' || !/^[1-9]\d{0,19}$/.test(property) ||
      typeof keyJson !== 'string' || keyJson.length > 32_768) return unknown('invalid_credentials');
  let assertion;
  try { assertion = createAssertion(JSON.parse(keyJson), now()); }
  catch { return unknown('invalid_credentials'); }
  let token;
  try {
    const auth = await fetchGoogleJson(TOKEN_URL, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    }, { fetchImpl });
    token = auth?.access_token;
    if (typeof token !== 'string' || token.length > 8_192 || !/^[A-Za-z0-9._~-]+$/.test(token)) return unknown('auth_unavailable');
  } catch (error) { return unknown(error.code === 'rate_limited' ? 'rate_limited' : 'auth_unavailable'); }
  const request = buildReportRequest();
  const startedAt = now();
  let report;
  try {
    report = await fetchGoogleJson(`${REPORT_BASE}${property}:runReport`, {
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(request),
    }, { fetchImpl });
  } catch (error) { return unknown(error.code === 'rate_limited' ? 'rate_limited' : 'api_unavailable'); }
  return evaluateReport(report, { request, startedAt, receivedAt: now() });
}

const HEALTH_CODES = new Set([
  'missing_credentials', 'invalid_credentials', 'auth_unavailable', 'api_unavailable', 'rate_limited',
  'invalid_scope', 'invalid_report', 'invalid_schema', 'quality_limited', 'invalid_window',
  'incomplete_days', 'invalid_days', 'invalid_metric', 'available', 'unavailable',
]);
export function healthLine(status) {
  const health = HEALTH_CODES.has(status?.health) ? status.health : 'unavailable';
  const result = health === 'available' && ['below_target', 'met'].includes(status?.result) ? status.result : 'unknown';
  return `TDS traffic goal: health=${health} result=${result}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let status;
  try { status = await collectGoal(); }
  catch { status = unknown('unavailable'); }
  console.log(healthLine(status));
}
