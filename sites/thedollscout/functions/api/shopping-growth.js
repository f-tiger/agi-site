import {cachedAggregate} from '../../lib/aggregate-cache.js';
import {findDateIndex, resultRows, usesDateRangeIndex} from './collector-growth.js';
import {databaseFailure} from './doc-events.js';

// The buying-guide release is 2026-11-07 UTC; never backfill its partial day.
export const FIRST_FULL_UTC_DAY = '2026-11-08';
export const CACHE_SECONDS = 300;
export const SHOPPING_PATHS = Object.freeze(['/', '/de/', '/zh/'].flatMap(prefix =>
  ['', 'shop', 'shop/display-cases', 'shop/storage-transport', 'shop/plush-display', 'shop/collector-gifts'].map(path => prefix + path)));
export const MERCHANTS = Object.freeze(['amazon.com', 'amazon.de']);
// ISO 3166-1 alpha-2, including territories. Cloudflare XX / T1 are unknown.
const COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const countries = new Set(COUNTRY_CODES), paths = new Set(SHOPPING_PATHS);
export const SHOPPING_QUERY = `SELECT d,path,
 CASE WHEN upper(country) IN (${COUNTRY_CODES.map(code => `'${code}'`).join(',')}) THEN upper(country) ELSE 'unknown' END AS country_code,
 ev,CASE WHEN ev='' THEN '' WHEN ref IN ('amazon.com','amazon.de') THEN ref ELSE 'unknown' END AS merchant,
 COUNT(*) AS n FROM hits WHERE d>=? AND d<? AND ev IN ('','affiliate_click')
 AND path IN (${SHOPPING_PATHS.map(path => `'${path}'`).join(',')})
 GROUP BY d,path,country_code,ev,merchant LIMIT 10001`;

export async function shoppingQueryWithPlan(read, bounds) {
  let sql = SHOPPING_QUERY;
  if (usesDateRangeIndex(resultRows(await read('EXPLAIN QUERY PLAN ' + sql, bounds)))) return sql;
  // Metadata-only fallback when SQLite prefers an event/path index.
  const index = await findDateIndex(read);
  if (!index) return null;
  // findDateIndex has already validated the name and rejected partial indexes.
  sql = sql.replace('FROM hits WHERE', 'FROM hits INDEXED BY "' + index.replaceAll('"', '""') + '" WHERE');
  if (!usesDateRangeIndex(resultRows(await read('EXPLAIN QUERY PLAN ' + sql, bounds))))
    throw Object.assign(Error('Date index plan rejected'), {shoppingIndexCode: 'date_index_plan_rejected'});
  return sql;
}

export function shoppingWindow(now = new Date()) {
  const end = now.toISOString().slice(0, 10);
  const start = new Date(end + 'T00:00:00Z'); start.setUTCDate(start.getUTCDate() - 28);
  const expected = start.toISOString().slice(0, 10), measured = expected > FIRST_FULL_UTC_DAY ? expected : FIRST_FULL_UTC_DAY;
  const days = Math.max(0, Math.round((Date.parse(end) - Date.parse(measured)) / 86400000));
  return {first_full_utc_day: FIRST_FULL_UTC_DAY, expected28dWindow: {start: expected, end_exclusive: end},
    measuredWindow: days ? {start: measured, end_exclusive: end} : null, coveredDays: days, full28Days: days === 28,
    coverage: days ? 'measured_complete_utc_days' : 'pending_first_complete_day'};
}

export function aggregateShopping(rows, window) {
  if (!window?.measuredWindow || !window.coveredDays) throw Error('No complete measured day');
  const daily = [], counts = {pageviews: 0, affiliate_clicks: 0}, seen = new Set();
  for (const row of rows) {
    const validDate = typeof row.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.d) &&
      Number.isFinite(Date.parse(row.d)) && new Date(row.d).toISOString().slice(0, 10) === row.d;
    if (!validDate || row.d < FIRST_FULL_UTC_DAY || row.d < window.measuredWindow.start || row.d >= window.measuredWindow.end_exclusive ||
        !paths.has(row.path) || !countries.has(row.country_code) && row.country_code !== 'unknown' ||
        !['', 'affiliate_click'].includes(row.ev) || !Number.isSafeInteger(row.n) || row.n <= 0 ||
        (row.ev === '' ? row.merchant !== '' : ![...MERCHANTS, 'unknown'].includes(row.merchant))) throw Error('Invalid shopping aggregate');
    const key = JSON.stringify([row.d, row.path, row.country_code, row.ev, row.merchant]);
    if (seen.has(key)) throw Error('Duplicate shopping aggregate');
    seen.add(key);
    const metric = row.ev === '' ? 'pageviews' : 'affiliate_clicks';
    counts[metric] += row.n;
    if (!Number.isSafeInteger(counts[metric])) throw Error('Shopping aggregate count overflow');
    daily.push({date: row.d, path: row.path, country: row.country_code, event: row.ev || 'pageview',
      merchant: row.ev === '' ? null : row.merchant, n: row.n});
  }
  daily.sort((a, b) => a.date.localeCompare(b.date) || a.path.localeCompare(b.path) || a.country.localeCompare(b.country) ||
    a.event.localeCompare(b.event) || String(a.merchant).localeCompare(String(b.merchant)));
  return {daily, counts};
}

const json = (value, status = 200) => Response.json(value, {status, headers: {'cache-control': 'no-store', 'x-robots-tag': 'noindex'}});
export async function onRequestGet(ctx) {
  if (!ctx.env.HITS) return json({ok: false, error: 'no_db', counts: null}, 503);
  return cachedAggregate(ctx, async () => {
    const window = shoppingWindow(), bounds = [window.measuredWindow?.start || FIRST_FULL_UTC_DAY, window.expected28dWindow.end_exclusive];
    try {
      const read = (sql, params = []) => ctx.env.HITS.prepare(sql).bind(...params).all();
      const query = await shoppingQueryWithPlan(read, bounds);
      if (!query) return json({ok: false, error: 'missing_date_index', reason: 'schema', counts: null}, 503);
      const base = {ok: true, ...window, generated: new Date().toISOString(), cache_seconds: CACHE_SECONDS,
        unit: 'anonymous_events_not_users', scope: {paths: SHOPPING_PATHS, merchants: MERCHANTS},
        notes: 'Pageviews and affiliate clicks are stored anonymous actions, not unique people, sessions, purchases, conversion or revenue. Country is an approximate request-country hint, not language, residence or shipping destination. Unknown countries and click merchants remain separate; pageview referrers are never returned. QA, crawlers and declared privacy opt-outs are excluded at collection. The partial release day and today are excluded. Complete-day coverage describes eligible dates, not proof of uninterrupted collection. Zero means no stored eligible actions in a successfully queried window; silent write failures and outages cannot be reconstructed.'};
      if (!window.coveredDays) return json({...base, counts: null, daily: [], query_rows_read: 0});
      const result = await read(query, bounds), rows = resultRows(result);
      if (rows.length > 10000) return json({ok: false, error: 'aggregate_capacity', counts: null}, 503);
      return json({...base, ...aggregateShopping(rows, window), query_rows_read: result.meta?.rows_read ?? null});
    } catch (error) {
      return json({ok: false, error: error.shoppingIndexCode === 'date_index_plan_rejected' ? 'date_index_plan_rejected' : 'query_failed',
        reason: databaseFailure(error), counts: null}, 503);
    }
  });
}
