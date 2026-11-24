import {cachedAggregate} from '../../lib/aggregate-cache.js';
import {collectorQueryWithPlan, resultRows} from './collector-growth.js';
import {WINTER_HUMIDITY_EVENT, WINTER_HUMIDITY_PATH} from '../../collector-assets/winter-humidity-referral.mjs';

const GUIDE = WINTER_HUMIDITY_PATH;
const FIRST_MEASURED_DAY = '2026-11-15';
const RELEASE_DAY = '2026-11-18';
const WINTER_HUMIDITY_FIRST_FULL_DAY = '2026-11-25';
const DAY_MS = 86400000;
const QUERY = `SELECT d,
  COUNT(CASE WHEN ev='' THEN 1 END) AS pageviews,
  COUNT(CASE WHEN ev='' AND ref IN ('getecoback.com','www.getecoback.com') THEN 1 END) AS eco_referred_pageviews,
  COUNT(CASE WHEN ev='affiliate_click' AND ref='amazon.de' THEN 1 END) AS amazon_de_clicks,
  COUNT(CASE WHEN ev='${WINTER_HUMIDITY_EVENT}' AND ref='getecoback.com' THEN 1 END) AS winter_humidity_arrivals
  FROM hits WHERE d>=? AND d<? AND path='${GUIDE}' AND ev IN ('','affiliate_click','${WINTER_HUMIDITY_EVENT}')
  GROUP BY d ORDER BY d`;

function respond(data, status = 200) {
  return Response.json(data, {status, headers: {'cache-control': 'no-store', 'x-robots-tag': 'noindex'}});
}

export async function guideReport(read, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const rollingStart = new Date(Date.parse(today) - 28 * DAY_MS).toISOString().slice(0, 10);
  const start = rollingStart > FIRST_MEASURED_DAY ? rollingStart : FIRST_MEASURED_DAY;
  const bounds = [start, today];
  const sql = await collectorQueryWithPlan(read, bounds, QUERY);
  if (!sql) throw Error('No usable date index');
  const rows = resultRows(await read(sql, bounds));
  const byDate = new Map(rows.map(row => [row.d, row]));

  const daily = [];
  const winterDaily = [];
  for (let t = Date.parse(start); t < Date.parse(today); t += DAY_MS) {
    const date = new Date(t).toISOString().slice(0, 10);
    if (date === RELEASE_DAY) continue;
    const row = byDate.get(date) || {pageviews: 0, eco_referred_pageviews: 0, amazon_de_clicks: 0};
    if (date >= WINTER_HUMIDITY_FIRST_FULL_DAY) {
      const arrivals = byDate.has(date) ? row.winter_humidity_arrivals : 0;
      if (!Number.isSafeInteger(arrivals) || arrivals < 0) throw Error('Invalid winter humidity count');
      winterDaily.push({date, arrivals});
    }
    daily.push({
      date, period: date < RELEASE_DAY ? 'before' : 'after',
      pageviews: row.pageviews, eco_referred_pageviews: row.eco_referred_pageviews, amazon_de_clicks: row.amazon_de_clicks,
    });
  }
  return {
    ok: true, path: GUIDE, generated: now.toISOString(), start, end_exclusive: today, excluded_release_day: RELEASE_DAY,
    unit: 'stored_anonymous_events', daily,
    winter_humidity: {
      first_full_utc_day: WINTER_HUMIDITY_FIRST_FULL_DAY,
      daily: winterDaily.length ? winterDaily : null,
      scope: 'Anonymous guide arrivals with the humidity section fragment and an EcoBack referrer. Missing referrers and partial days are excluded. Events cannot be joined to a reader or an Amazon click.',
    },
    scope: 'Complete UTC dates since category measurement began, up to 28 calendar days. ECO counts views with its referrer host. Clicks cover all Amazon.de links on this page. Views and clicks cannot be linked to individuals or orders.',
  };
}

export async function onRequestGet(ctx) {
  if (!ctx.env.HITS) return respond({ok: false, error: 'no_db', daily: null}, 503);
  return cachedAggregate(ctx, async () => {
    const read = (sql, params = []) => ctx.env.HITS.prepare(sql).bind(...params).all();
    try {
      return respond(await guideReport(read));
    } catch {
      return respond({ok: false, error: 'indexed_report_unavailable', daily: null}, 503);
    }
  });
}
