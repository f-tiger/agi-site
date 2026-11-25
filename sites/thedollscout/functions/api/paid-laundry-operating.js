import {digest} from '../../../baipiaoji/lib/ad-commerce.js';
import {memberReady} from '../../../baipiaoji/lib/membership.js';
import {siteEnv} from '../../../../tools/member-studio/server.mjs';
import {firstFullUTCDate} from '../../lib/collector-measurement.js';
import {PAID_REVIEW_ACTIONS, PAID_REVIEW_PATHS} from '../../collector-assets/tds-suite/regional-measurement.mjs';
import {collectorQueryWithPlan, resultRows} from './collector-growth.js';

const PRODUCT = 'tds-uk-laundry-review';
const RELEASE_DAY = '2026-11-25';
const FIRST_FULL_DAY = firstFullUTCDate(RELEASE_DAY);
const ENGAGEMENT_METRICS = Object.freeze({
  '': 'tool_pageviews',
  tds_regional_result: 'tool_result_events',
  tds_paid_offer_view: 'paid_offer_views',
  tds_paid_member_open: 'paid_member_opens',
  tds_paid_workspace_saved: 'workspace_saved_actions',
  tds_paid_workspace_restored: 'workspace_restored_actions',
});
const literals = values => values.map(value => `'${value}'`).join(',');
const ENGAGEMENT_SQL = `SELECT ev,COUNT(*) AS n FROM hits WHERE d>=? AND d<?
 AND path IN (${literals(PAID_REVIEW_PATHS)})
 AND ev IN (${literals(Object.keys(ENGAGEMENT_METRICS))})
 AND (ev NOT IN (${literals(PAID_REVIEW_ACTIONS)}) OR ref='')
 GROUP BY ev`;

// Quote creation and confirmation are separate clocks. Count corroborating
// ledger rows, never expose the receipt, token amount or ownership fields.
const ORDERS_SQL = `WITH bounds AS (SELECT ? AS start,? AS stop), matched AS (
 SELECT o.created,o.state,o.paid_at,b.start,b.stop,EXISTS (
  SELECT 1 FROM bpj_ad_chain_receipts r WHERE r.order_id='member:'||o.id
   AND r.chain=o.chain AND r.tx=o.tx AND r.amount_units=o.amount_units
 ) AS has_receipt
 FROM wb_order_sources s JOIN wb_orders o ON o.id=s.order_id CROSS JOIN bounds b
 WHERE s.product=? AND (o.created>=b.start AND o.created<b.stop OR o.paid_at>=b.start AND o.paid_at<b.stop)
)
SELECT COUNT(CASE WHEN created>=start AND created<stop THEN 1 END) AS quotes_created,
 COUNT(CASE WHEN created>=start AND created<stop AND state='paid' AND paid_at>=created AND paid_at<stop AND has_receipt THEN 1 END) AS cohort_confirmed_at_close,
 COUNT(CASE WHEN state='paid' AND paid_at>=start AND paid_at<stop AND paid_at>=created AND has_receipt THEN 1 END) AS confirmed_settlements,
 COUNT(CASE WHEN state='paid' AND paid_at>=start AND paid_at<stop AND (paid_at<created OR NOT has_receipt) THEN 1 END) AS paid_rows_without_matching_proof
 FROM matched`;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const ORDER_METRICS = ['quotes_created','cohort_confirmed_at_close','confirmed_settlements','paid_rows_without_matching_proof'];

export function paidLaundryWindow(now = new Date()) {
  const end = now.toISOString().slice(0, 10);
  const ago = new Date(Date.parse(end) - 28 * 86400000).toISOString().slice(0, 10);
  const start = ago > FIRST_FULL_DAY ? ago : FIRST_FULL_DAY;
  return {release_day: RELEASE_DAY, first_full_utc_day: FIRST_FULL_DAY,
    measured_window: start < end ? {start, end_exclusive: end} : null};
}

async function readEngagement(db, window) {
  const bounds = [window.start, window.end_exclusive];
  const read = (sql, params = []) => db.prepare(sql).bind(...params).all();
  const query = await collectorQueryWithPlan(read, bounds, ENGAGEMENT_SQL);
  if (!query) throw Error('No usable date index');
  const counts = Object.fromEntries(Object.values(ENGAGEMENT_METRICS).map(metric => [metric, 0]));
  for (const {ev,n} of resultRows(await read(query, bounds))) {
    if (!Object.hasOwn(ENGAGEMENT_METRICS, ev) || !nonnegative(n)) throw Error('Invalid aggregate');
    counts[ENGAGEMENT_METRICS[ev]] = n;
  }
  return counts;
}

async function readOrders(db, window) {
  const seconds = date => Date.parse(date) / 1000;
  const row = await db.prepare(ORDERS_SQL).bind(seconds(window.start),seconds(window.end_exclusive),PRODUCT).first();
  if (!row || ORDER_METRICS.some(metric => !nonnegative(row[metric])) || row.cohort_confirmed_at_close > row.quotes_created) {
    throw Error('Invalid order aggregate');
  }
  return Object.fromEntries(ORDER_METRICS.map(metric => [metric,row[metric]]));
}

export async function paidLaundryReport(db, checkoutReady, now = new Date()) {
  const window = paidLaundryWindow(now);
  const complete = window.measured_window;
  const [engagement, orders] = complete ? await Promise.all([
    readEngagement(db,complete).catch(() => null), readOrders(db,complete).catch(() => null),
  ]) : [null,null];
  const coverage = counts => !complete ? 'pending_first_complete_day' : counts ? 'complete_utc_days' : 'unavailable';
  return {ok: true, site: 'tds', product: PRODUCT, generated: now.toISOString(), ...window,
    checkout_ready_now: typeof checkoutReady === 'boolean' ? checkoutReady : null,
    engagement, engagement_coverage: coverage(engagement),
    orders, order_coverage: coverage(orders),
    refunds: null, net_revenue_usd: null,
    notes: 'Engagement counts independent anonymous actions; open requests can be spoofed and do not establish people or payment. Orders are attributed to the source of first quote creation. Confirmed settlements count match-verified chain receipts by confirmation time, regardless of quote day. Refunds and net USD revenue require separate reconciliation.'};
}

const json = (data,status = 200) => Response.json(data,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
export async function onRequestGet({request,env}) {
  if (new URL(request.url).origin !== 'https://thedollscout.com') return json({ok:false,code:'wrong_site'},403);
  const secret = String(env.MEMBER_WATCH_SECRET || '');
  if (!env.HITS || secret.length < 32) return json({ok:false,code:'not_configured'},503);
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || auth.length > 519 || await digest(auth.slice(7)) !== await digest(secret)) {
    return json({ok:false,code:'unauthorized'},401);
  }
  const ready = await memberReady(siteEnv('tds',env)).catch(() => null);
  return json(await paidLaundryReport(env.HITS,ready));
}
