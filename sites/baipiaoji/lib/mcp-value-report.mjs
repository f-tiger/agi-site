import {STARTUP_MCP_ORDER_SOURCE} from '../../../tools/revenue-studio/member-copy.mjs';
import {AI_TRADE_QUOTE,TRADE_QUOTE_DAILY_TABLE,TRADE_QUOTE_RETENTION_DAYS} from './ai-trade-quote-observations.mjs';
import {readTradeSignupAccounts} from './trade-quote-growth.mjs';
import {readTradeSignupWorkbenchUse} from './trade-quote-workbench-use.mjs';
import {TRADE_QUOTE_MCP_LINK_SIGNUP_SOURCE} from './trade-signup-source.mjs';

const DAY = 86400;

async function read(db, sql, ...params) {
  const statement = db.prepare(sql);
  const result = await (params.length ? statement.bind(...params) : statement).all();
  if (!result.success || !Array.isArray(result.results)) throw Error('invalid_report_result');
  return result.results;
}

const taggedOrders = `SELECT o.member_id, o.amount_units, o.state, o.paid_at, o.expires
  FROM wb_order_sources s JOIN wb_orders o ON o.id=s.order_id
  WHERE s.product=?1 AND o.created>=?2 AND o.created<=?3`;

export async function readMcpValueReport(db, now = new Date()) {
  const asOf = Math.floor(now.getTime() / 1000);
  const start = (Math.floor(asOf / DAY) - 7) * DAY;
  const day = seconds => new Date(seconds * 1000).toISOString().slice(0, 10);
  const since = day(start), through = day(asOf);
  const tables = new Set((await read(db, `SELECT name FROM sqlite_schema WHERE type='table' AND name IN
    ('bpj_mcp_value_daily','bpj_mcp_value_startup_member_days','wb_orders','wb_order_sources','${TRADE_QUOTE_DAILY_TABLE}')`)).map(row => row.name));
  const ordersReadable = tables.has('wb_orders') && tables.has('wb_order_sources');
  const tasksReadable = tables.has('bpj_mcp_value_daily');
  const usageReadable = tables.has('bpj_mcp_value_startup_member_days');

  const [daily, orders, usage, membership, tradeQuoteDaily, tradeSignupAccounts, tradeWorkbenchUse] = await Promise.all([
    tasksReadable ? read(db, `SELECT day,tool,outcome,n FROM bpj_mcp_value_daily
      WHERE day BETWEEN ? AND ? ORDER BY day,tool,outcome`, since, through) : null,
    ordersReadable ? read(db, `WITH tagged AS (${taggedOrders})
      SELECT COUNT(*) AS tagged_quotes,
        COUNT(*) FILTER (WHERE state='pending' AND expires>=?3) AS pending,
        COUNT(*) FILTER (WHERE state='pending' AND expires<?3) AS expired,
        COUNT(*) FILTER (WHERE state='paid' AND paid_at BETWEEN 1 AND ?3) AS confirmed_orders,
        COUNT(DISTINCT member_id) FILTER (WHERE state='paid' AND paid_at BETWEEN 1 AND ?3) AS confirmed_members,
        COALESCE(SUM(amount_units) FILTER (WHERE state='paid' AND paid_at BETWEEN 1 AND ?3),0) AS gross_usdt_micro
      FROM tagged`, STARTUP_MCP_ORDER_SOURCE, start, asOf) : null,
    usageReadable && ordersReadable ? read(db, `WITH tagged AS (${taggedOrders}),
      paid AS (SELECT member_id, MIN(paid_at) AS paid_at FROM tagged
        WHERE state='paid' AND paid_at BETWEEN 1 AND ? GROUP BY member_id),
      eligible_days AS (SELECT u.day,u.member_id,u.first_at FROM bpj_mcp_value_startup_member_days u
        WHERE u.day BETWEEN ? AND ? AND EXISTS (SELECT 1 FROM wb_orders o
          WHERE o.member_id=u.member_id AND o.state='paid' AND o.paid_at BETWEEN 1 AND u.first_at)),
      members AS (SELECT u.member_id, COUNT(*) AS days,
        COUNT(*) FILTER (WHERE p.paid_at<=u.first_at) AS tagged_days
        FROM eligible_days u LEFT JOIN paid p ON p.member_id=u.member_id GROUP BY u.member_id)
      SELECT COUNT(*) AS confirmed_members_with_results,
        COUNT(*) FILTER (WHERE days>=2) AS confirmed_members_across_days,
        COUNT(*) FILTER (WHERE tagged_days>=1) AS tagged_members_with_results,
        COUNT(*) FILTER (WHERE tagged_days>=2) AS tagged_members_across_days FROM members`,
      STARTUP_MCP_ORDER_SOURCE, start, asOf, asOf, since, through) : null,
    tables.has('wb_orders') ? read(db, `SELECT COUNT(*) AS confirmed_orders,
        COUNT(DISTINCT member_id) AS confirmed_members, COALESCE(SUM(amount_units),0) AS gross_usdt_micro
      FROM wb_orders WHERE state='paid' AND paid_at BETWEEN 1 AND ?`, asOf) : null,
    tables.has(TRADE_QUOTE_DAILY_TABLE) ? read(db, `SELECT day,form,outcome,caller_signal,n
      FROM ${TRADE_QUOTE_DAILY_TABLE} WHERE day BETWEEN ? AND ? ORDER BY day,form,outcome,caller_signal`, since, through).catch(() => null) : null,
    readTradeSignupAccounts(db, start, Math.floor(asOf / DAY) * DAY),
    readTradeSignupWorkbenchUse(db, since, through),
  ]);
  return {
    as_of: now.toISOString(), window: {since, through, timezone:'UTC', today_partial:true},
    task_outcomes: daily, startup_checkout: orders?.[0] ?? null, startup_paid_usage: usage?.[0] ?? null,
    site_membership_confirmed_all_time: membership?.[0] ?? null,
    trade_quote_mcp_link: {
      source: TRADE_QUOTE_MCP_LINK_SIGNUP_SOURCE,
      window: {start: since, end_exclusive: through, timezone:'UTC', complete_days:7},
      accounts: tradeSignupAccounts?.get(TRADE_QUOTE_MCP_LINK_SIGNUP_SOURCE) ?? null,
      workbench_use: tradeWorkbenchUse?.get(TRADE_QUOTE_MCP_LINK_SIGNUP_SOURCE) ?? null,
      attribution: 'A fixed quote-page link can be copied or shared. A committed server-verified signup claim identifies that page context only. There is no call-to-account join, verified referring platform or purchase attribution.',
      coverage: 'Starts at release. Windowed creations and milestones exclude today. Account totals reflect current accounts, and use totals end before today. Null means unavailable measurement.',
    },
    trade_quote_calls: {
      tool: AI_TRADE_QUOTE, endpoint: '/api/ai-mcp', window: {since, through, timezone:'UTC', today_partial:true},
      retention_days: TRADE_QUOTE_RETENTION_DAYS, observations: tradeQuoteDaily,
      coverage: 'Instrumentation starts at release. A null readout means unavailable coverage. Earlier calls and storage failures are unmeasured.',
      definition: 'Direct and wrapper observations count outcomes of recognized tools/call attempts. Discovery counts list_bpj_ai_tools responses that include this tool. Other methods and the private MCP are outside coverage. Counts measure calls.',
      outcomes: {
        costs_entered:'The tool returned a costs_entered result for the provided values.',
        provisional:'The tool returned a provisional quote result with incomplete CIF inputs.',
        invalid:'The recognized invocation returned the existing tool input error.',
        listed:'The discovery response included the quote tool.',
      },
      identity: 'This stateless public route associates neither authenticated principals nor the clientInfo declared during initialize. No referral site is assigned.',
      exclusions: 'Known QA, operator probes, DNT and GPC are excluded before recording.',
      caller_signals: {
        edge_verified_bot:'Cloudflare edge classified the request as a verified bot.',
        ua_indexer_hint:'The request User-Agent matched a known indexer or crawler signature.',
        sample_fixture:'The inputs matched the published example exactly.',
        ua_automation_hint:'The User-Agent matched an automation heuristic.',
        ua_anomaly_hint:'The User-Agent matched an anomaly heuristic.',
        unknown:'Other callers with no attributed source or identity.',
      },
    },
  };
}
