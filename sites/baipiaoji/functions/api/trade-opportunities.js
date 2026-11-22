const TED_SEARCH = 'https://api.ted.europa.eu/v3/notices/search';
const RESULT_LIMIT = 8;
const CACHE_SECONDS = 180;
const FETCH_TIMEOUT_MS = 4500;
const DAY_MS = 24 * 60 * 60 * 1000;
const COUNTRY_CODES = Object.freeze({
  AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ', DNK: 'DK',
  EST: 'EE', FIN: 'FI', FRA: 'FR', DEU: 'DE', GRC: 'GR', HUN: 'HU', IRL: 'IE',
  ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU', MLT: 'MT', NLD: 'NL', POL: 'PL',
  PRT: 'PT', ROU: 'RO', SVK: 'SK', SVN: 'SI', ESP: 'ES', SWE: 'SE',
  ISL: 'IS', LIE: 'LI', NOR: 'NO', GBR: 'GB', CHE: 'CH',
});

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function keyword(url) {
  const values = url.searchParams.getAll('q');
  if (values.length !== 1 || values[0].length > 128) return null;
  const normalized = values[0].normalize('NFKC').trim().replace(/[ \t]+/g, ' ');
  return normalized.length <= 64 &&
    /^[\p{L}\p{N}][\p{L}\p{N}\p{M} '’-]*[\p{L}\p{N}\p{M}]$/u.test(normalized)
    ? normalized.toLowerCase() : null;
}

function localizedText(value, maxLength) {
  const translations = value && typeof value === 'object' && !Array.isArray(value)
    ? [value.eng, ...Object.values(value)] : [value];
  for (const translation of translations) {
    for (const text of Array.isArray(translation) ? translation : [translation]) {
      if (typeof text !== 'string') continue;
      const cleaned = text.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned && !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(cleaned)) {
        return Array.from(cleaned).slice(0, maxLength).join('');
      }
    }
  }
  return '';
}

function openDeadline(value, now) {
  if (!Array.isArray(value)) return null;
  let latest = null;
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const match = /^(\d{4}-\d{2}-\d{2})(Z|[+-]\d{2}:\d{2})?$/.exec(entry);
    if (!match) continue;
    const [, date, offset = '+14:00'] = match;
    const utcDate = new Date(date);
    if (!Number.isFinite(utcDate.valueOf()) || utcDate.toISOString().slice(0, 10) !== date) continue;
    // The date field has no bid time. Require the earliest possible deadline on that date
    // to be beyond the cache lifetime, and leave the exact deadline to the original notice.
    const startOfDay = Date.parse(`${date}T00:00:00${offset}`);
    if (startOfDay > now + CACHE_SECONDS * 1000 && (!latest || date > latest)) latest = date;
  }
  return latest;
}

function projectNotice(notice, now) {
  if (!notice || notice['notice-type'] !== 'cn-standard') return null;
  const id = notice['publication-number'];
  if (typeof id !== 'string' || !/^\d{1,9}-20\d{2}$/.test(id)) return null;
  const title = localizedText(notice['notice-title'], 250);
  const buyer = localizedText(notice['buyer-name'], 160);
  const deadline = openDeadline(notice['deadline-receipt-tender-date-lot'], now);
  if (!title || !buyer || !deadline) return null;
  const countries = notice['buyer-country'];
  const code = Array.isArray(countries) ? countries[0] : null;
  const country = typeof code === 'string' && Object.hasOwn(COUNTRY_CODES, code) &&
    countries.every(value => value === code) ? COUNTRY_CODES[code] : null;
  return {id, title, buyer, country, deadline, url: `https://ted.europa.eu/en/notice/${id}/html`};
}

const unavailable = status => json({error: 'temporarily_unavailable'}, status);

export async function handleTradeOpportunities({request, waitUntil}, {
  fetcher = fetch, cache = globalThis.caches?.default, now = Date.now(),
} = {}) {
  if (request.method !== 'GET') return json({error: 'method_not_allowed'}, 405, {Allow: 'GET'});
  const url = new URL(request.url);
  const query = keyword(url);
  if (!query) return json({error: 'invalid_query'}, 400);

  url.search = '';
  url.searchParams.set('q', query);
  const cacheKey = new Request(url);
  try {
    const cached = await cache?.match(cacheKey);
    if (cached) return cached;
  } catch {
    // Search can still run when the local cache is unavailable.
  }

  const tomorrow = new Date(now + DAY_MS).toISOString().slice(0, 10).replaceAll('-', '');
  let notices;
  try {
    const response = await fetcher(TED_SEARCH, {
      method: 'POST',
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
      body: JSON.stringify({
        query: `FT ~ ${JSON.stringify(query)} AND deadline-receipt-tender-date-lot >= ${tomorrow} AND notice-type = cn-standard SORT BY publication-date DESC`,
        fields: ['publication-number', 'notice-title', 'buyer-name', 'buyer-country',
          'deadline-receipt-tender-date-lot', 'notice-type'],
        scope: 'ACTIVE',
        limit: RESULT_LIMIT,
        onlyLatestVersions: true,
      }),
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if ([429, 503, 504].includes(response.status)) return unavailable(503);
    if (!response.ok) return unavailable(502);
    const result = await response.json();
    if (result?.timedOut === true) return unavailable(503);
    if (!Array.isArray(result?.notices)) return unavailable(502);
    notices = result.notices;
  } catch (error) {
    return unavailable(['TimeoutError', 'AbortError'].includes(error?.name) ? 503 : 502);
  }

  const opportunities = new Map();
  for (const notice of notices) {
    const opportunity = projectNotice(notice, now);
    if (!opportunity || opportunities.has(opportunity.id)) continue;
    opportunities.set(opportunity.id, opportunity);
    if (opportunities.size === RESULT_LIMIT) break;
  }
  const response = json({source: 'ted', opportunities: [...opportunities.values()]}, 200, {
    'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
  });
  if (cache) {
    const write = Promise.resolve().then(() => cache.put(cacheKey, response.clone())).catch(() => {});
    if (waitUntil) waitUntil(write);
    else await write;
  }
  return response;
}

export const onRequest = context => handleTradeOpportunities(context);
