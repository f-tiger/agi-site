import {readdir, readFile} from 'node:fs/promises';

const databaseId = '75e45e05-44b5-4c56-9a3b-dd504b5c53f1';
const site = new URL('../../sites/getecoback/site/', import.meta.url);
const rootPages = ['index.html', 'produkte.html', 'klimaanlage-finder.html', 'fenstersauger.html'];
const hosts = new Set(['amazon_de', 'amazon_com', 'other']);
const destinations = new Set(['search', 'product', 'prime_trial', 'other']);

export const AFFILIATE_PATHS_SQL = `
WITH market_hosts(prefix, market, tag) AS (
  VALUES ('https://www.amazon.de/', 'amazon_de', 'getecoback-21'),
         ('https://amazon.de/', 'amazon_de', 'getecoback-21'),
         ('https://www.amazon.com/', 'amazon_com', 'ecoback0d-20'),
         ('https://amazon.com/', 'amazon_com', 'ecoback0d-20')
), clicks AS (
  SELECT CASE WHEN page IN (SELECT value FROM json_each(?1)) THEN page ELSE 'other' END AS page,
    CASE WHEN json_valid(meta) THEN json_extract(meta, '$.link_url') END AS link
  FROM ev
  WHERE name = 'affiliate_click' AND day >= ?2 AND day < ?3
    AND (ua_class IS NULL OR ua_class = 'human') AND page NOT LIKE '/__ci%'
), merchant AS (
  SELECT page, COALESCE(market, 'other') AS market, tag,
    '/' || substr(link, length(prefix) + 1) AS tail
  FROM clicks LEFT JOIN market_hosts ON substr(link, 1, length(prefix)) = prefix
), routes AS (
  SELECT page, market,
    CASE WHEN instr(tail, '?') > 0 AND substr(tail, instr(tail, '?') + 1) = 'tag=' || tag
      THEN 1 ELSE 0 END AS approved_tag,
    substr(tail, 1, instr(tail || '?', '?') - 1) AS path
  FROM merchant
)
SELECT page, market, approved_tag,
  CASE WHEN path = '/s' OR path GLOB '/s/*' THEN 'search'
       WHEN path GLOB '/dp/*' OR path GLOB '/gp/product/*' THEN 'product'
       WHEN path = '/primegratistesten' THEN 'prime_trial' ELSE 'other' END AS destination,
  COUNT(*) AS events
FROM routes GROUP BY page, market, approved_tag, destination
ORDER BY page, market, destination, approved_tag`;

const week = 7 * 86400000;
export function completeAffiliateWeek(end, now = new Date()) {
  if (typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const date = new Date(end + 'T00:00:00Z');
  const today = Date.parse(now.toISOString().slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== end ||
      +date > today || +date < today - 7 * week) return null;
  return {start: new Date(+date - week).toISOString().slice(0, 10), end_exclusive: end};
}

export async function affiliateReportPages(root = site) {
  const guides = (await readdir(new URL('guide/', root)))
    .filter(name => /^[a-z0-9-]+\.html$/.test(name))
    .map(name => 'guide/' + name);
  const pages = [];
  for (const file of [...rootPages, ...guides].sort()) {
    let html;
    try { html = await readFile(new URL(file, root), 'utf8'); }
    catch (error) { if (error.code === 'ENOENT' && rootPages.includes(file)) continue; throw error; }
    const path = file === 'index.html' ? '/' : '/' + file;
    const head = html.split(/<\/head\s*>/i, 1)[0];
    if (/<meta\b(?=[^>]*\bname=["'](?:robots|googlebot)["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i.test(head)) continue;
    const canonicals = [...head.matchAll(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)];
    if (canonicals.length === 1 && canonicals[0][1] === 'https://getecoback.com' + path) pages.push(path);
  }
  if (pages.length === 0) throw new Error('affiliate_public_pages_missing');
  return pages;
}

export async function collectAffiliatePaths(env, {now = new Date(), pagesFor = affiliateReportPages, query} = {}) {
  const period = completeAffiliateWeek(env.ECO_AFFILIATE_END_EXCLUSIVE, now);
  if (!period) return {status:'blocked', reason:'invalid_affiliate_complete_week'};
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!/^[a-f0-9]{32}$/i.test(account || '') || !token) {
    return {status:'blocked', reason:'missing_or_invalid_d1_access'};
  }
  const pages = await pagesFor();
  const data = await query(
    `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${databaseId}/query`,
    {method:'POST', headers:{authorization:'Bearer ' + token, 'content-type':'application/json'},
      body:JSON.stringify({sql:AFFILIATE_PATHS_SQL, params:[JSON.stringify(pages), period.start, period.end_exclusive]})},
    'd1_affiliate'
  );
  const statement = data?.result?.[0];
  if (data?.success !== true || data.result?.length !== 1 || statement?.success !== true || !Array.isArray(statement.results)) {
    return {status:'blocked', reason:'d1_affiliate_invalid_response'};
  }

  const allowed = new Set(['other', ...pages]);
  const seen = new Set();
  const rows = [];
  let total = 0;
  for (const row of statement.results) {
    if (!row || !allowed.has(row.page) || !hosts.has(row.market) || !destinations.has(row.destination) ||
        ![0, 1].includes(row.approved_tag) || !Number.isSafeInteger(row.events) || row.events <= 0 ||
        (row.market === 'other' && (row.approved_tag !== 0 || row.destination !== 'other'))) {
      return {status:'blocked', reason:'d1_affiliate_invalid_aggregate'};
    }
    const key = JSON.stringify([row.page, row.market, row.destination, row.approved_tag]);
    if (seen.has(key)) return {status:'blocked', reason:'d1_affiliate_invalid_aggregate'};
    seen.add(key);
    total += row.events;
    rows.push({page:row.page, market:row.market, destination:row.destination, approved_tag:row.approved_tag === 1, events:row.events});
  }
  if (!Number.isSafeInteger(total)) return {status:'blocked', reason:'d1_affiliate_invalid_aggregate'};
  return {schema:1, status:'received', generated_at:now.toISOString(), source:'ECO D1 affiliate_click',
    timezone:'UTC', ...period, total_events:total, rows,
    note:'Filtered events, including historical unclassified traffic. Market identifies the destination host. Other pages include paths outside the reviewed German public guide and tool set. Counts do not measure people, session acquisition, orders or commission.'};
}
