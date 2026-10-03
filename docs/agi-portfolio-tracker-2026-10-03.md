# Public portfolio tracker · 2026-10-03

Current contract: owner requested yesterday’s close on October 3 at 15:01 Shanghai. Active entry is now **2026-10-02 NY close**, cohort `social-basket-2026-10-02-close`. The October 5 plan below is historical, archived before any returns existed. See the final amendment.

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

## Dynamic follow-up: October 3

Owner clarified “要能够更新 / 动态追踪”. Three-pass brief: keep quotes changing without an assistant, separate provider price changes from the immutable total-return record, and verify auto refresh, offline/error retention and unchanged research inputs. Self-check A: widget load is not price freshness; US embedded quotes are explicitly delayed. Self-check B: refreshing must neither erase the last complete record nor send notes to a market-data provider.

Added TradingView official market-data and symbol-overview frames, with all 15 exact symbols, a symbol selector, pause/resume/reconnect and intact attribution. Frames are cross-origin and sandboxed; no third-party script executes alongside research forms. Configuration contains only fixed public symbol/page/locale settings, never browser query strings or research inputs. The widget connects when visible; its quote time/session state governs freshness, not a made-up local “last price update” timestamp. Provider blocking/unavailable symbols remain provider errors with a visible source/reconnect route.

Primary sources checked: https://www.tradingview.com/widget-docs/widgets/charts/symbol-overview/ ; https://www.tradingview.com/widget-docs/widgets/watchlists/market-quotes/demos/stock/ ; https://www.tradingview.com/widget-docs/markets/north-america/ (US widget stocks are delayed); https://www.tradingview.com/symbols/NASDAQ-SPCX/ confirms the mapped SpaceX security. Embedded quote data is a view, not scraped into our registered return series.

The public record now checks its published JSON every 60 seconds while online and visible, on return to the tab and on reconnection; it also supports manual checks and pause/resume. Fetch timeout is 15 seconds. Atomic validation checks registered identity/hash, dates, complete metrics and all series before display. Network errors and rolled-back snapshots preserve the last complete observation and show a failure. No form value is reset. The existing weekday 22:40 UTC server job remains responsible for valuation and persistence; polling a browser is not a substitute for that job or tick-level portfolio valuation.

Free/paid terms and revenue attribution are unchanged. Dynamic quote retention is a product hypothesis; no new subscriber or payment is inferred. Browser gates use isolated provider responses and a virtual clock for new-data updates, transient failures, pause and rollback; live provider rendering is checked separately after release.

## Returns-first follow-up: October 3

Three-pass brief: prioritize the requested comparative returns; preserve the fixed entry and distinguish published returns from provider quote changes; put all four comparisons in the first mobile viewport, expand the twelve-stock detail table, retain 60-second checks and refresh the record now.

The EN/ZH pages now open with the twelve-stock basket, SPY, QQQ and TQQQ cards. Individual returns are expanded by default, with return and drawdown columns next to the ticker for narrow screens. Market embeds follow the return record. Refresh controls, last-check state, valuation status and update methodology remain visible. The manual refresh on October 3 at 06:52 UTC correctly returned awaiting_entry; the October 5 entry, weights and manifest digest are unchanged.

Self-check A: a refreshed timestamp must not imply a new valuation, so pre-entry returns remain unavailable and the fixed future entry is explicit. Self-check B: moving the section above widgets must actually expose the result on a phone; the browser gate asserts first-section order, all four cards within 390 × 844, and all fifteen stock/benchmark rows expanded. Existing virtual-clock tests continue to verify automatic updates and retention after failures. Titles, descriptions, feed and AI mirrors are regenerated together; only changed canonical URLs are eligible for the manual post-release IndexNow submission.

Free/paid value, payment terms and privacy-preserving attribution remain as documented above. This is a usability improvement; conversion impact is unmeasured.

## Owner amendment: use yesterday’s close

Three-pass brief: apply the explicitly requested October 2 US close; use the same session for all twelve stocks and SPY/QQQ/TQQQ and retain the unstarted plan; refresh actual complete source data, update EN/ZH rules and validation, and publish.

The new active manifest has ID `social-basket-2026-10-02-close`; the previous manifest and empty snapshot are preserved under `portfolio-assets/archive/social-basket-2026-10-03/`. Registration remains October 3. The page explicitly describes the previous-close selection, no longer claims pre-entry registration, and links the archive. The selected date and cohort hash remain fixed for future daily runs.

All fifteen provider series returned the completed October 2 session with USD identity checks, including SpaceX. The fresh record contains sixteen normalized series and complete metrics. At that first close each series is 100 and return, drawdown and excess return are zero by construction. These are calculated entry observations, not missing-data zero fills. Entry adjusted close prices are stored and displayed for audit; future total returns use the same adjusted-close basis.

Self-check A: preserve the old empty plan and make the retrospective date selection explicit; never relabel historical investment performance as a pre-registered result. Self-check B: require all fifteen observed entry prices before displaying zero, keep existing failure/rollback guards, and test that a complete first session yields zero while absent data blocks computation. The existing daily schedule, browser refresh and member terms remain unchanged.


## Reusable tool and SunWatch owner integration (2026-10-03)

Owner:「可以变成工具或mcp，然后接入到我的sunwatch的tg机器人提醒」。Three refinements: (1) reuse the published fixed cohort; (2) extend the existing public MCP, keep credentials and recipient in SunWatch; (3) require dated complete outputs, send acknowledgement, deduplication, pause/query/resume and live verification. Self-checks (not independent reviews): overlapping crons require serialized durable state; fresh fetch timestamps must not create new valuations or fabricate missing returns.

`GET /api/portfolio` and MCP `get_portfolio_returns` share `tools/portfolio/api.mjs`; optional `?history=1` / `{include_history:true}`. Same snapshot validator as browser, all 15 entry prices, status/as-of/entry fields and 96-hour last-success expiry. `valuation_id` hashes financial content, excludes fetch timestamps. Both retain dated stale data, fail closed on malformed/incomplete/cohort-mismatched inputs. MCP errors are tool errors, not 0% returns. Existing registry identity and remote endpoint are reused; public mirror tool inventory updated.

SunWatch `src/portfolio-alerts.js` reads only that public endpoint. Its existing 30-minute cron checks once per new complete valuation, or same-day vendor correction. First message acknowledges baseline. A durable instance serializes overlapping callers; confirmed Telegram message ID is stored before later checks can send. Failures retry, source outage has a 25-minute grace then one warning and one recovery message. Telegram acknowledgement and durable write are not atomic, so a process failure between them can duplicate. This is not an exactly-once guarantee.

Private owner commands: `/portfolio`, `/portfolio_pause`, `/portfolio_resume`, gated on Telegram webhook secret, private chat and existing configured owner chat. No subscriber broadcast, no new trading rule or paid alert promise. Existing owner integration authentication exposes only fixed-content run/status for verification; no caller-specified content/recipient. Bot secrets remain in SunWatch.

Free value: dated returns and API for the public; this owner alert integration is not yet a subscriber offering. Existing paid value remains saved research records. Do not count tests/tool calls as subscriptions, verified revenue or proven growth. Distribution is the existing MCP listing and agent documentation; only changed canonical documentation is eligible for manual IndexNow submission.
