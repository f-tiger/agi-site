// Aggregate diagnostics only: a site click is neither an Amazon order nor a person.
// Preserve the legacy 28d counter while adding comparable complete UTC windows.
// All dimensions share the same human/legacy + non-CI predicate and one event scan.
export const AFFILIATE_SQL = `
WITH clicks AS (
  SELECT day, meta,
    lower(CASE WHEN json_valid(meta) THEN coalesce(json_extract(meta,'$.link_url'),'') ELSE '' END) AS link
  FROM ev
  WHERE name='affiliate_click' AND (ua_class IS NULL OR ua_class='human')
    AND page NOT LIKE '/__ci%' AND day >= date('now','-28 days') AND day <= date('now')
), destinations AS (
  SELECT *, substr(link, 8 + instr(substr(link,9),'/')) AS target_path, CASE
    WHEN link LIKE 'https://www.amazon.de/%' OR link LIKE 'https://amazon.de/%' THEN 'de'
    WHEN link LIKE 'https://www.amazon.com/%' OR link LIKE 'https://amazon.com/%' THEN 'us'
    ELSE 'unknown' END AS market
  FROM clicks
)
SELECT COUNT(*) AS legacy_count,
  coalesce(sum(meta LIKE '%us-market%'),0) AS us_market_count,
  coalesce(sum(market='us'),0) AS amazon_com_count,
  coalesce(sum(day < date('now')),0) AS complete_28d,
  coalesce(sum(day >= date('now','-7 days') AND day < date('now')),0) AS recent_7d,
  coalesce(sum(day >= date('now','-14 days') AND day < date('now','-7 days')),0) AS previous_7d,
  coalesce(sum(day = date('now')),0) AS today_partial,
  coalesce(sum(day < date('now') AND market='de'),0) AS de_28d,
  coalesce(sum(day < date('now') AND market='us'),0) AS us_28d,
  coalesce(sum(day < date('now') AND market='unknown'),0) AS unknown_28d,
  coalesce(sum(day < date('now') AND market!='unknown' AND
    (target_path LIKE '/dp/%' OR target_path LIKE '/gp/product/%')),0) AS product_28d,
  coalesce(sum(day < date('now') AND market!='unknown' AND
    (target_path LIKE '/s?%' OR target_path LIKE '/s/%')),0) AS search_28d,
  coalesce(sum(day < date('now') AND market!='unknown' AND
    (target_path='/primegratistesten' OR target_path LIKE '/primegratistesten?%')),0) AS prime_trial_28d,
  date('now','-28 days') AS start_28d,
  date('now','-14 days') AS start_previous_7d,
  date('now','-7 days') AS start_recent_7d,
  date('now') AS end_exclusive
FROM destinations`;

export async function affiliateMetrics(db) {
  const result = await db.prepare(AFFILIATE_SQL).all();
  const row = result.results?.[0];
  if (!row) throw new Error('affiliate_aggregate_missing');
  const count = key => {
    const n = Number(row[key]);
    if (row[key] == null || !Number.isSafeInteger(n) || n < 0) throw new Error('affiliate_aggregate_invalid');
    return n;
  };
  const complete = count('complete_28d');
  const product = count('product_28d'), search = count('search_28d'), prime = count('prime_trial_28d');
  return {
    affiliate_click_28d: count('legacy_count'),
    affiliate_click_us_market_28d: count('us_market_count'),
    affiliate_click_amazon_com_28d: count('amazon_com_count'),
    affiliate_diagnostics: {
      metric: 'site_click_events_not_people_or_amazon_orders',
      legacy_window: '28d key includes today plus 28 previous UTC dates',
      timezone: 'UTC',
      complete_28d: {start: row.start_28d, end_exclusive: row.end_exclusive, clicks: complete},
      recent_7d: {start: row.start_recent_7d, end_exclusive: row.end_exclusive, clicks: count('recent_7d')},
      previous_7d: {start: row.start_previous_7d, end_exclusive: row.start_recent_7d, clicks: count('previous_7d')},
      today_partial: count('today_partial'),
      markets_28d: {de: count('de_28d'), us: count('us_28d'), unknown: count('unknown_28d')},
      destinations_28d: {product, search, prime_trial: prime, other_or_unknown: complete - product - search - prime},
      amazon_ordered_items: null,
      amazon_commission: null,
      attribution_note: 'Amazon reports required; site membership orders and affiliate clicks do not measure Amazon sales. Store tags may be shared across sites.'
    }
  };
}
