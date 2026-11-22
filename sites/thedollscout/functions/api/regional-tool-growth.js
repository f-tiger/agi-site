import {cachedAggregate} from '../../lib/aggregate-cache.js';
import {collectorQueryWithPlan, resultRows} from './collector-growth.js';
import {REGIONAL_ACTIONS, REGIONAL_TOOL_PATHS, REGIONAL_TOOL_SLUGS} from '../../collector-assets/tds-suite/regional-measurement.mjs';

// The partial release day is not a completed measurement day. Keep this marker
// aligned with the actual release receipt; never infer coverage from a visitor.
export const REGIONAL_RELEASE_DAY = '2026-11-22';
export const REGIONAL_FIRST_FULL_DAY = '2026-11-23';
export const REGIONAL_GUIDES = Object.freeze({
  'dach-meter-fit': '/de/shop/categories/smart-home',
  'uk-laundry-session': '/uk/indoor-laundry',
});
const paths = [...REGIONAL_TOOL_PATHS, ...Object.values(REGIONAL_GUIDES)];
const events = [...REGIONAL_ACTIONS, '', 'affiliate_click', 'market_shop_click', 'market_source_click'];
export const REGIONAL_QUERY = `SELECT d,path,ev,
 CASE WHEN ev='affiliate_click' AND ref='amazon.de' THEN 'amazon.de'
      WHEN ev='market_shop_click' AND ref='amazon.co.uk' THEN 'amazon.co.uk' ELSE '' END AS merchant,
 COUNT(*) AS n FROM hits WHERE d>=? AND d<?
 AND path IN (${paths.map(path => "'" + path + "'").join(',')})
 AND ev IN (${events.map(event => "'" + event + "'").join(',')})
 GROUP BY d,path,ev,merchant LIMIT 10001`;
const DAY_MS = 86400000;
const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const counters = () => ({result_events: 0, guide_handoff_clicks: 0});
const guideCounters = slug => ({pageviews: 0, amazon_de_affiliate_clicks: slug === 'dach-meter-fit' ? 0 : null,
  amazon_uk_ordinary_shop_clicks: slug === 'uk-laundry-session' ? 0 : null,
  official_source_clicks: slug === 'uk-laundry-session' ? 0 : null});

export function regionalWindow(now = new Date()) {
  const end = now.toISOString().slice(0, 10);
  const rollingStart = new Date(Date.parse(end) - 28 * DAY_MS).toISOString().slice(0, 10);
  const start = rollingStart > REGIONAL_FIRST_FULL_DAY ? rollingStart : REGIONAL_FIRST_FULL_DAY;
  const coveredDays = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS));
  return {release_day: REGIONAL_RELEASE_DAY, first_full_utc_day: REGIONAL_FIRST_FULL_DAY,
    measuredWindow: coveredDays ? {start, end_exclusive: end} : null, coveredDays,
    coverage: coveredDays ? 'complete_utc_days' : 'pending_first_complete_day'};
}

export function aggregateRegional(rows, window) {
  const tools = REGIONAL_TOOL_SLUGS.map(slug => ({slug, paths: REGIONAL_TOOL_PATHS.filter(path => path.endsWith('/' + slug)),
    counts: window.coveredDays ? counters() : null, daily: []}));
  const guides = REGIONAL_TOOL_SLUGS.map(slug => ({path: REGIONAL_GUIDES[slug],
    scope: 'All eligible stored events on this guide; no link to a particular tool visit.',
    counts: window.coveredDays ? guideCounters(slug) : null, daily: []}));
  const counts = window.coveredDays ? counters() : null;
  for (const row of rows) {
    const n = Number(row.n);
    if (!isoDate(row.d) || !Number.isSafeInteger(n) || n < 0 || !paths.includes(row.path) || !events.includes(row.ev) ||
        !['', 'amazon.de', 'amazon.co.uk'].includes(row.merchant) || !window.measuredWindow ||
        row.d < window.measuredWindow.start || row.d >= window.measuredWindow.end_exclusive) throw Error('Invalid aggregate');
    if (REGIONAL_TOOL_PATHS.includes(row.path) && REGIONAL_ACTIONS.includes(row.ev) && row.merchant === '') {
      const metric = row.ev === 'tds_regional_result' ? 'result_events' : 'guide_handoff_clicks';
      const tool = tools.find(tool => tool.paths.includes(row.path));
      tool.counts[metric] += n; counts[metric] += n;
      tool.daily.push({date: row.d, path: row.path, event: row.ev, n});
    }
    const index = guides.findIndex(guide => guide.path === row.path);
    if (index < 0) continue;
    const metric = row.ev === '' && row.merchant === '' ? 'pageviews' :
      index === 0 && row.ev === 'affiliate_click' && row.merchant === 'amazon.de' ? 'amazon_de_affiliate_clicks' :
      index === 1 && row.ev === 'market_shop_click' && row.merchant === 'amazon.co.uk' ? 'amazon_uk_ordinary_shop_clicks' :
      index === 1 && row.ev === 'market_source_click' && row.merchant === '' ? 'official_source_clicks' : null;
    if (metric) {
      guides[index].counts[metric] += n;
      guides[index].daily.push({date: row.d, metric, n});
    }
  }
  for (const entry of [...tools, ...guides]) entry.daily.sort((a, b) => a.date.localeCompare(b.date) ||
    (a.path || '').localeCompare(b.path || '') || (a.event || a.metric).localeCompare(b.event || b.metric));
  return {counts, tools, guides};
}

export async function regionalReport(read, now = new Date()) {
  const window = regionalWindow(now);
  let rows = [];
  if (window.measuredWindow) {
    const bounds = [window.measuredWindow.start, window.measuredWindow.end_exclusive];
    const query = await collectorQueryWithPlan(read, bounds, REGIONAL_QUERY);
    if (!query) throw Error('No usable date index');
    rows = resultRows(await read(query, bounds));
    if (rows.length > 10000) throw Error('Aggregate capacity');
  }
  return {ok: true, generated: now.toISOString(), ...window, unit: 'stored_anonymous_events_not_users',
    ...aggregateRegional(rows, window),
    notes: 'Result events mean a valid own-input result was displayed; worked examples are excluded. Handoffs mean actual guide CTA clicks, not confirmed arrivals. Guide views and merchant clicks are independent aggregates covering all links on each guide, not a joined funnel or attributed conversions. UK shop links have no confirmed affiliate tag and are not affiliate income. No inputs, result values, visitor/session IDs or full URLs are collected. QA and declared privacy opt-outs are excluded; open requests can be spoofed. Partial release day and earlier dates are excluded. Zero means no stored eligible events in a successful measured-window read; unavailable data is null. Silent write failures cannot be reconstructed.'};
}

const json = (data, status = 200) => Response.json(data, {status, headers: {'cache-control': 'no-store', 'x-robots-tag': 'noindex'}});
export async function onRequestGet(ctx) {
  if (!ctx.env.HITS) return json({ok: false, error: 'no_db', counts: null}, 503);
  return cachedAggregate(ctx, async () => {
    try {
      const read = (sql, params = []) => ctx.env.HITS.prepare(sql).bind(...params).all();
      return json(await regionalReport(read));
    } catch {
      return json({ok: false, error: 'indexed_report_unavailable', counts: null}, 503);
    }
  });
}
