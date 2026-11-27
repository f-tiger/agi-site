import { EVENT_ROWS } from './hits-schema.js';
import {parseTableReviewEvent,emptyTableReviewCounts} from './table-review-signals.mjs';
import {parseListingEvent,emptyListingCounts} from './listing-signals.mjs';
import {PROOFKIT_PATHS,parseProofKitEvent,emptyProofKitCounts} from './proofkit-signals.mjs';
import {parseTradeWorkbenchEvent,emptyTradeWorkbenchCounts} from './trade-workbench-signals.mjs';
import {parseTradeQuoteEvent,emptyTradeQuoteCounts,readTradeSignupAccounts} from './trade-quote-growth.mjs';
import {readTradeSignupWorkbenchUse} from './trade-quote-workbench-use.mjs';
import {TRADE_QUOTE_SIGNUP_SOURCE,TRADE_WORKBENCH_SIGNUP_SOURCE} from './trade-signup-source.mjs';
import catalog from '../data/tools.json' with {type:'json'};

const toolSlugs = new Set(catalog.map(tool => tool.slug));
const DECK_ACTION = /^\/studio\/proposal-deck\/(pptx-export|member-open|cloud-open|cloud-saved|cloud-restore|paid-offer-view)\/(own|demo)$/;
const DECK_ACTION_COUNTS = { pptx_export: 0, member_open: 0, cloud_open: 0, cloud_saved: 0, cloud_restore: 0 };

// Project the existing grouped query; no extra tracking request or D1 read.
// Unknown paths are counted without exposing arbitrary client-supplied strings.
export function directoryOutboundCounts(rows) {
  const counts = new Map();
  let unattributed_clicks = 0;
  for (const row of rows) {
    if (row.ev !== 'go') continue;
    const n = Number(row.n);
    if (!Number.isSafeInteger(n) || n < 0) continue;
    const slug = /^\/go\/([a-z0-9-]+)$/.exec(String(row.path || ''))?.[1];
    if (!toolSlugs.has(slug)) { unattributed_clicks += n; continue; }
    counts.set(slug, (counts.get(slug) || 0) + n);
  }
  return {by_tool: [...counts].map(([slug, clicks]) => ({slug, clicks}))
    .sort((a,b) => b.clicks-a.clicks || a.slug.localeCompare(b.slug)), unattributed_clicks};
}

// Separate stage counts, deliberately not a user-level or Google-attributed funnel.
// Reuse the hourly reach cache and the partial event index; never fetch identity fields.
export const STAGE_EVENTS_SQL = `SELECT ev, path, count(*) n FROM hits
 WHERE d >= ? AND d < ? AND ${EVENT_ROWS}
 AND (ev IN ('calc','go','home','coding_access','listing','table_review')
   OR (ev = 'biz' AND (path IN (${PROOFKIT_PATHS.map(path => `'${path}'`).join(',')})
     OR ((path GLOB '/trade-workbench/*' OR path GLOB '/trade-quote/*') AND lang IN ('zh', 'en')))))
 AND path NOT LIKE '/\\_\\_%' ESCAPE '\\' AND COALESCE(lang,'') != 'ci'
 GROUP BY ev, path`;
export const STAGE_ACCOUNTS_SQL = `SELECT count(*) total_non_test,
 COALESCE(SUM(CASE WHEN i.email_verified = 1 THEN 1 ELSE 0 END),0) total_email_verified,
 COALESCE(SUM(CASE WHEN a.created >= ? AND a.created < ? THEN 1 ELSE 0 END),0) created,
 COALESCE(SUM(CASE WHEN a.created >= ? AND a.created < ? AND i.email_verified = 1 THEN 1 ELSE 0 END),0) email_verified
 FROM free_accounts a LEFT JOIN free_account_identities i ON i.account_id = a.id
 WHERE a.qa = 0`;
export const STAGE_ACCOUNTS_DAILY_SQL = `SELECT date(a.created, 'unixepoch') date,
 count(*) created,
 COALESCE(SUM(CASE WHEN i.email_verified = 1 THEN 1 ELSE 0 END),0) new_accounts_currently_email_verified
 FROM free_accounts a LEFT JOIN free_account_identities i ON i.account_id = a.id
 WHERE a.qa = 0 AND a.created >= ? AND a.created < ?
 GROUP BY date(a.created, 'unixepoch') ORDER BY date`;

// Reuse one order-source read for both first-source product cohorts. Classify
// at the complete UTC window's end, excluding today's orders and payments.
const ORDER_PRODUCTS = {proposalDeck: 'bpj-proposal-deck', tradeWorkbench: 'bpj-trade-toolbox'};
export const WORKBENCH_ORDER_COHORTS_SQL = `SELECT product,
 COUNT(*) FILTER (WHERE bucket = 'pending') pending,
 COUNT(*) FILTER (WHERE bucket = 'expired') expired,
 COUNT(*) FILTER (WHERE bucket = 'paid') paid
 FROM (
   SELECT s.product, CASE WHEN o.state = 'paid' AND o.paid_at < ? THEN 'paid'
     WHEN o.expires < ? THEN 'expired' ELSE 'pending' END bucket
   FROM wb_order_sources s JOIN wb_orders o ON o.id = s.order_id
   WHERE s.product IN (?, ?) AND o.created >= ? AND o.created < ?
     AND o.state IN ('pending', 'paid')
 ) GROUP BY product`;

export async function readWorkbenchOrderCohorts(db, start, end) {
  const startSeconds = Date.parse(start) / 1000;
  const endSeconds = Date.parse(end) / 1000;
  try {
    const {results} = await db.prepare(WORKBENCH_ORDER_COHORTS_SQL)
      .bind(endSeconds, endSeconds, ORDER_PRODUCTS.proposalDeck, ORDER_PRODUCTS.tradeWorkbench, startSeconds, endSeconds).all();
    if (!Array.isArray(results)) return null;
    const byProduct = new Map();
    for (const {product, pending, expired, paid} of results) {
      if (![pending, expired, paid].every(n => Number.isSafeInteger(n) && n >= 0)) return null;
      byProduct.set(product, {pending, expired, paid});
    }
    return Object.fromEntries(Object.entries(ORDER_PRODUCTS).map(([key, product]) => [key, byProduct.get(product) ?? {pending: 0, expired: 0, paid: 0}]));
  } catch { return null; }
}

export function stageCounts(rows) {
  const counts = { table_review_actions: emptyTableReviewCounts(), listing_actions: emptyListingCounts(), proofkit_actions: emptyProofKitCounts(),
    trade_workbench_actions: emptyTradeWorkbenchCounts(), trade_quote_actions: emptyTradeQuoteCounts(),
    proposal_deck_actions: { demo: {...DECK_ACTION_COUNTS}, own: {...DECK_ACTION_COUNTS, paid_offer_view: 0} },
    tool_results_own: 0, tool_results_demo: 0, tool_download_actions_own: 0,
    tool_download_actions_demo: 0, other_calc_events: 0, directory_outbound_clicks: 0,
    homepage_limit_navigation: 0, video_exports_own: 0, video_exports_demo: 0,
    account_tool_entries: 0, coding_access_filters: 0, coding_access_empty_results: 0,
    coding_access_provider_opens: 0, coding_access_source_opens: 0,
    coding_access_selection_copies: 0, coding_access_checklist_copies: 0,
    coding_access_vendor_entries: 0 };
  for (const row of rows) {
    const n = Number(row.n) || 0, path = String(row.path || '');
    if (row.ev === 'table_review') { const parsed=parseTableReviewEvent(path);if(parsed&&Number.isSafeInteger(n)&&n>=0)counts.table_review_actions[parsed.mode][parsed.action]+=n;continue; }
    if (row.ev === 'biz') {
      if (!Number.isSafeInteger(n) || n < 0) continue;
      const proof = parseProofKitEvent(path);
      const trade = parseTradeWorkbenchEvent(path);
      if (proof) counts.proofkit_actions[proof.mode][proof.action] += n;
      if (trade) counts.trade_workbench_actions[trade.action] += n;
      const quote = parseTradeQuoteEvent(path);
      if (quote) counts.trade_quote_actions[quote] += n;
      continue;
    }
    if (row.ev === 'listing') {
      const parsed = parseListingEvent(path);
      if (parsed) counts.listing_actions[parsed.mode][parsed.action] += n;
      continue;
    }
    if (row.ev === 'coding_access') {
      const fixed = {
        '/coding-access/filter/catalog': 'coding_access_filters',
        '/coding-access/miss/catalog': 'coding_access_empty_results',
        '/coding-access/copy/selection': 'coding_access_selection_copies',
        '/coding-access/copy/catalog': 'coding_access_checklist_copies',
        '/coding-access/vendor/catalog': 'coding_access_vendor_entries',
      };
      if (fixed[path]) counts[fixed[path]] += n;
      const action = path.match(/^\/coding-access\/(open|source)\/(regions|codex|claude|deepseek|glm|minimax|openrouter|packycode)$/);
      if (action) counts[action[1] === 'open' ? 'coding_access_provider_opens' : 'coding_access_source_opens'] += n;
      continue;
    }
    if (row.ev === 'go') { counts.directory_outbound_clicks += n; continue; }
    if (row.ev === 'home') { if (path.startsWith('/home/limit-check/')) counts.homepage_limit_navigation += n; continue; }
    if (row.ev !== 'calc') continue;
    if (path === '/account-growth/tool-entry') { counts.account_tool_entries += n; continue; }
    const video = path.match(/^\/studio\/video-variants\/(export-video|export-batch)\/(own|demo)$/);
    if (video) { counts['video_exports_' + video[2]] += n; continue; }
    const deck = DECK_ACTION.exec(path);
    if (deck && Number.isSafeInteger(n) && n >= 0) {
      const group = counts.proposal_deck_actions[deck[2]], action = deck[1].replaceAll('-', '_');
      if (Object.hasOwn(group, action)) group[action] += n;
      // Preserve the legacy other_calc_events counter. This is a projection of it.
    }
    const m = path.match(/^\/studio\/(pdf-tools|product-images|quote-compare)\/(complete|calculate|download|export-csv|export-report)\/(own|demo)$/);
    if (!m || (m[1] === 'quote-compare' ? !['calculate','export-csv','export-report'].includes(m[2]) : !['complete','download'].includes(m[2]))) {
      counts.other_calc_events += n; continue;
    }
    counts[(m[2] === 'complete' || m[2] === 'calculate' ? 'tool_results_' : 'tool_download_actions_') + m[3]] += n;
  }
  return counts;
}

export async function readConversionStages(db, days, clock = Date.now()) {
  const end = new Date(clock).toISOString().slice(0,10);
  const endSeconds = Date.parse(end + 'T00:00:00Z') / 1000;
  const startSeconds = endSeconds - days * 86400;
  const start = new Date(startSeconds * 1000).toISOString().slice(0,10);
  const [events, accounts, accountDays, tradeSignupAccounts, tradeSignupWorkbenchUse] = await Promise.allSettled([
    db.prepare(STAGE_EVENTS_SQL).bind(start,end).all(),
    db.prepare(STAGE_ACCOUNTS_SQL).bind(startSeconds,endSeconds,startSeconds,endSeconds).first(),
    db.prepare(STAGE_ACCOUNTS_DAILY_SQL).bind(startSeconds,endSeconds).all(),
    readTradeSignupAccounts(db,startSeconds,endSeconds),
    readTradeSignupWorkbenchUse(db,start,end),
  ]);
  const eventsOK = events.status === 'fulfilled';
  const accountsOK = accounts.status === 'fulfilled' && accounts.value != null;
  const accountDaysOK = accountDays.status === 'fulfilled';
  const byDate = new Map(accountDaysOK ? (accountDays.value.results || []).map(row => [row.date, row]) : []);
  return {
    ok: eventsOK && accountsOK && accountDaysOK,
    window: { start, end_exclusive: end, complete_days: days, date_basis: 'UTC' },
    events: eventsOK ? stageCounts(events.value.results || []) : null,
    directory_outbound: eventsOK ? directoryOutboundCounts(events.value.results || []) : null,
    accounts: accountsOK ? { created: Number(accounts.value.created), new_accounts_currently_email_verified: Number(accounts.value.email_verified),
      total_non_test: Number(accounts.value.total_non_test), total_currently_email_verified: Number(accounts.value.total_email_verified) } : null,
    accounts_daily: accountDaysOK ? Array.from({length: days}, (_, index) => {
      const date = new Date((startSeconds + index * 86400) * 1000).toISOString().slice(0,10);
      const row = byDate.get(date);
      return {date, created: Number(row?.created || 0), new_accounts_currently_email_verified: Number(row?.new_accounts_currently_email_verified || 0)};
    }) : null,
    account_scope: 'fleet_shared_account_pool',
    trade_quote_accounts: tradeSignupAccounts.value?.get(TRADE_QUOTE_SIGNUP_SOURCE) ?? null,
    trade_quote_workbench_use: tradeSignupWorkbenchUse.value?.get(TRADE_QUOTE_SIGNUP_SOURCE) ?? null,
    trade_workbench_accounts: tradeSignupAccounts.value?.get(TRADE_WORKBENCH_SIGNUP_SOURCE) ?? null,
    trade_workbench_signup_use: tradeSignupWorkbenchUse.value?.get(TRADE_WORKBENCH_SIGNUP_SOURCE) ?? null,
    missing: [...(!eventsOK ? ['events'] : []), ...(!accountsOK ? ['accounts'] : []), ...(!accountDaysOK ? ['accounts_daily'] : [])],
    definitions: {
      table_review_actions: 'Fixed browser actions since the 2026-11-12 release, split into fictional demo and declared own inputs. Check means structural comparison succeeded; export initiates a download. Neither proves correctness, unique customers, paid demand or revenue. No table content is collected. These events have no user-level channel join.',
      listing_actions: 'Measured from the 2026-10-31 listing-pack release. Fixed browser action counts, separated into fictional demo and declared own inputs. Review is a user acknowledgement, not semantic verification; export initiates a download, not platform acceptance. Inquiry counts a browser success response, not a unique lead, paid order or revenue. QA, lost events and unlabeled automation limitations still apply.',
      proposal_deck_actions: 'Fixed ProposalDeck browser action counts projected from other_calc_events, excluding known CI. Own is declared project use. paid_offer_view is measured from its release. cloud_saved records an acknowledged save. Actions and orders have independent counts.',
      proofkit_actions: 'Fixed ProofKit actions from the same complete UTC days, separated into labelled examples and own projects. Own exports follow a local permission acknowledgement. paid_offer_view records a rendered contextual offer since its release. member_open records an explicit popup. Actions, customers and orders have independent counts.',
      trade_workbench_actions: 'Fixed browser actions in this complete UTC window. signup and membership_open count link clicks. guest_run counts acknowledged guest results. run and example count acknowledged registered results with own inputs and sample inputs respectively. csv counts download initiation after successful member export. Repeats can occur. Account creations, members and orders are measured separately. Input values and results are excluded.',
      trade_quote_actions: 'Fixed same-site browser actions in complete UTC days. Ready means the calculator returned a result with the entered cost confirmations. Needs info means a CIF cost is unconfirmed. Demo and user-entered text are distinguished by the browser. Signup open is a link action. Counts may repeat and carry no quote data or identity.',
      trade_quote_accounts: 'Surviving non-test accounts with an immutable server-verified signup source from the BPJ export quote page. Created is restricted to the complete UTC window; total includes today. Email verification reflects current state separately. Historical or unverifiable sources remain outside the cohort. A read failure returns null.',
      trade_quote_workbench_use: 'Unique quote-attributed accounts with a recorded first successful signed-in workbench web result or a second on a different UTC day. The two earliest observed days per account are retained. Total milestones end before today, and first_use and repeat_use count milestones within the complete UTC window. Known examples, CSV, MCP, tests, declared automation and privacy opt-outs are excluded. Calculations on the local quote page are counted separately as anonymous browser actions. A missing or unreadable measurement table returns null.',
      trade_workbench_accounts: 'Surviving non-test accounts with an immutable server-verified signup source from an eligible direct workbench entry. Uses the trade_quote_accounts date and current email-verification rules. Each account has at most one source and the two cohorts are disjoint. A missing or unreadable source table returns null.',
      trade_workbench_signup_use: 'First and repeat use of the web workbench by direct workbench signup accounts. Uses the same first successful own-input result, distinct UTC day, window and exclusion rules as trade_quote_workbench_use. A missing or unreadable measurement table returns null.',
      acquisition: 'Search clicks and CTR come only from GSC; not supplied by this endpoint. GSC uses Pacific reporting days.',
      usage: 'Client-reported successful result actions from PDF, image and quote tools only; repeats are not deduplicated. Demo and own-input actions are separate. Image completion can include partial batch success. Download means an action, not a verified saved file.',
      other_calc_events: 'Unclassified calc events include navigation, edits and tools without a reviewed success contract; never count the whole calc bucket as completed work.',
      quote_results: 'A rendered quote comparison can contain blocked or unverified quotes; it is an analysis action, not an accepted quote or purchase.',
      video_exports: 'Successful video or batch export actions; one batch is one action, not a clip count or unique user.',
      accounts: 'Surviving server-side accounts created within this UTC window with qa=0. Verified is their current email-ownership state, not a verification event during this window. Deleted accounts are absent; accounts are not unique humans.',
      account_totals: 'Current surviving accounts with qa=0, across all creation dates including today. Counts include unverified and legacy accounts; they do not prove distinct humans. Current mailbox-verified total is reported separately. Never add subscriber or paid-membership records to this count.',
      account_scope: 'The fleet shared free-account pool hosted by BPJ, not BPJ-origin registrations. No source site or external-person attribution is stored in this aggregate. Separate AGI native registrations are not included; never sum the shared pool with per-site sessions as users.',
      accounts_daily: 'Daily created counts use each surviving non-test account creation timestamp and complete UTC dates. Zero-filled only after a successful read. Deleted accounts are absent, so this is not a permanent historical signup ledger. new_accounts_currently_email_verified describes the current verification state of each creation-day cohort, not verifications performed on that day; past cohorts can change after later verification or deletion. The current partial UTC day is excluded.',
      account_tool_entries: 'Public tool-to-account link actions within the complete-day window. Repeated actions count again; they are not successful signups and have no person-level attribution.',
      coding_access: 'Fixed coding-access actions in the same complete UTC-day window. Selection copies mean the browser reported successful clipboard writing; generic checklist copies are separate. Repeated actions count again; neither action counts nor their ratios prove people, retained users, installs, purchases or revenue. No query or checklist content is collected.',
      attribution: 'Independent stages, no shared visitor identifier or channel attribution. Do not divide tool events or accounts by GSC clicks to claim a conversion rate.',
      directory_outbound: 'Client-reported outbound actions by current catalog slug within the same complete UTC-day window. Repeated clicks count again; these are not page views, unique people, affiliate-attributed clicks, purchases or revenue. Unknown paths are combined as unattributed_clicks without publishing their text. Current affiliate configuration never reclassifies past clicks. A failed event query returns null, not an empty ranking.',
      quality: 'Known CI excluded; unlabelled automation and lost browser events remain possible. Missing tables/read failures return null, never zero.',
    },
  };
}
