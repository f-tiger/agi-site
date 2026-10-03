# Public portfolio tracker · 2026-10-03

User request: track the twelve securities in a supplied social-post screenshot alongside TQQQ and the S&P 500 from today, add useful investment tools and grow subscriptions. Implemented inside the existing AGI investment hub, with a contextual entry from Gushen. No brokerage integration or trades.

## Brief and two self-reviews

1. Make popular stock claims auditable from a recorded starting point, for self-directed investors who need to compare risk and revisit their own assumptions.
2. Use a common observable session, retain all stocks, verify SPCX identity, show missing data and both return and drawdown; separate an author's unverified claim from our equal-weight experiment.
3. Ship EN/ZH tracking, risk/contribution/leverage tools, local export and existing AGI member cloud storage, a bounded native scheduled update, discovery entries and exact action attribution.

Self-review A: a curve can become misleading through retrospective selection, missing securities, inconsistent dates or a changed entry. Fix: immutable manifest digest, October 5 close fixed before it occurs, all-series coverage, USD identity checks, no silent replacement, vendor corrections logged and no annualized short record.
Self-review B: a public return table is easy to substitute and cannot establish willingness to pay. Paid value remains a portable decision record, with actual entitlement and version checks. No return guarantee, unimplemented alert promise, paid quote feed or higher AI quota.

## Sources checked October 3, 2026

- ProShares: https://www.proshares.com/our-etfs/leveraged-and-inverse/tqqq — three times DAILY Nasdaq-100 results, longer holding-period divergence.
- State Street: https://www.ssga.com/us/en/institutional/etfs/state-street-spdr-sp-500-etf-trust-spy — SPY tracks S&P 500 price and yield performance; an ETF proxy, not the index itself.
- SpaceX issuer: https://ir.spacex.com/updates/releases-details/2026/Space-Exploration-Technologies-Corp--Announces-Closing-of-Initial-Public-Offering-Including-Full-Exercise-of-Underwriters-Option-to-Purchase-Additional-Shares-2026-RgoR-Y1Vwh/default.aspx — June 15 announcement confirms SPCX and trading from June 12. Provider metadata must independently match SpaceX before using its series.
- Sharesight: https://www.sharesight.com/pricing/ — portfolio tracking, reporting and alerts are established product features. Official feature evidence, not evidence of demand for our site.
- Portfolio Visualizer: https://www.portfoliovisualizer.com/pricing — backtesting and saved models provide a comparison for recurring research workflows. We do not infer revenue or conversion from a pricing page.

## Contract

Cohort `social-basket-2026-10-03`, registered Shanghai October 3 (Saturday); fixed entry October 5 regular-session close in New York. Exact initial 1/12 stock weights and three separate benchmark portfolios, USD 10,000 each, buy and hold, fractional shares. Adjusted-close ratios proxy reinvested distributions. No transaction costs, tax or FX; ETF internal expenses are embedded. No actual financial-adviser or social-author performance claim. Screenshot timestamp and original URL unknown; do not republish its promises as facts.

Coverage requires every SPY-observed session and the same latest session. If unavailable, retain the previous complete observation and expose status. Do not move the entry, filter losers or fill a return with a guess. Source price corrections are retained in the JSON correction ledger. The provider is the existing Yahoo adjusted-close source; no raw quote resale is introduced. A commercially licensed data provider remains a prerequisite for selling a separate data-feed product; this membership sells saved user work.

The existing `agi-paper-ledger.yml` weekday 22:40 UTC schedule gets an isolated public-portfolio job. It persists JSON and explicitly dispatches the current-main deployment: GITHUB_TOKEN pushes alone cannot trigger push deployments. It has no broker secrets and never uses the optional LLM arm. Refresh failure is visible before the job reports failure. No new cron is added. October 5 is only the entry valuation; returns need subsequent sessions.

## Subscription and growth

Free: transparent forward record, individual stocks and benchmark comparison, position stress, constant-rate contribution scenarios, illustrative daily leverage path, local save/export and embed.
Paid today: existing AGI cloud membership, 9 USDT per 30 days plus matching decimal/network fee, fifty spaces and ten versions. No auto renewal; payment readiness is verified on the real member page. No purchase was made by this implementation session.

Distribution delivered: AGI home EN/ZH entry, investment hub EN/ZH, tool catalog EN/ZH, Gushen contextual link, canonical/hreflang, breadcrumbs/WebApplication schema, sitemap, Atom feed, page-derived AI mirrors and an embeddable page. No outreach or external messages were sent. IndexNow uses the existing authorized changed-URL mechanism after deployment; acceptance never proves indexing.

Measurement: opt-in fixed GA events `portfolio_stress`, `portfolio_dca`, `portfolio_leverage`, `portfolio_save_local`, `portfolio_export`, `portfolio_share`, `portfolio_performance_export`, `portfolio_cloud_intent`. No input values or note text. Default example calculations cannot prove own-task completion. QA and embedded frames are excluded by existing analytics. Purchase attribution uses `wb_order_sources.product = portfolio-tracker`; join to paid order records, not intent events. Compare repeat visits, save/export and verified product-attributed paid receipts over the first 30 days. If distribution remains low, demand is unknown. Saved-record reuse without payment suggests local export may suffice; crypto-only checkout is a plausible friction, not a proven diagnosis. Do not infer subscribers or revenue from button clicks.

## Verification

Local: eight data-pipeline tests (entry timing, buy-and-hold arithmetic, max drawdown, missing baseline, unequal windows, identity/completed-session gating, immutable rules and revisions) and six JS tests (stress, DCA, daily leverage, records, real membership handlers, private-field rejection). Member tests use a mocked chain and SQLite, not real payments. Page validation, closed hreflang, YAML parsing and Gushen production build pass.
Browser test covers EN/ZH calculators, invalid input/import preservation, local save/export/import, real member-page handoff with no implicit uploads, synthetic chart/CSV response, 390px layout and embed. Synthetic prices are isolated to test responses, never public snapshots. The deployment pipeline runs this before publication.
