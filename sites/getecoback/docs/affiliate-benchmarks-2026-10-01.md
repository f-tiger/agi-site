# Affiliate benchmarks: evidence, transferable mechanisms and a $1,000 scenario

This is public-source research, not a league table of undisclosed site earnings. Company revenue, affiliate revenue, retailer sales and publisher profit are different metrics. No private ECO traffic, credentials or merchant reports are included.

## Public evidence

| Business | Verified scale and limitation | Transferable mechanism |
|---|---|---|
| Future / Tom's Guide, TechRadar and other brands | FY2025 B2C ecommerce-affiliate revenue £76.7m, versus £83.9m in FY2024. Group portfolio, not Tom's Guide alone. | Connect buying decisions to useful comparison paths; maintain commercial infrastructure across a focused editorial portfolio. |
| NerdWallet | FY2025 company revenue $836.6m; it includes several financial-product verticals, not Amazon retail commissions. | A tool or comparison task can lead to a valuable match. Separate editorial assessment from commercial placement and build return/direct channels. |
| Wirecutter / New York Times | FY2025 filing reports Wirecutter affiliate-referral revenue increased $5.1m. It does not disclose Wirecutter's full standalone revenue in that line. NYT's $308.1m affiliate/licensing/other bucket is not Wirecutter revenue. | Clear purchasing guidance attached to a trusted editorial brand; do not copy total-company earnings claims. |
| RTINGS | Revenue not publicly verified in this research. Primary methodology describes standardized tests, public results and repeat testing. | Use comparable evidence, limitations and side-by-side criteria. ECO cannot claim laboratory authority without doing the work. |
| HouseFresh | Revenue not publicly verified. Its public method documents performance, sound, power and running-cost tests in a narrow home-air niche. | A small topical focus with original evidence is a more relevant operating model than copying a mass-publishing conglomerate. |

Primary sources checked October 1, 2026:

1. [Future FY2025 annual report, PDF pp.42 and143](https://futureplc.com/wp-content/uploads/2025/12/Annual-Report-and-Accounts-FY-2025-incl-Notice-of-AGM.pdf). Affiliate revenue fell 9% reported, 6% organic: scale does not remove search/commerce risk.
2. [NerdWallet FY2025 results, February25 2026](https://investors.nerdwallet.com/node/8776/pdf). Management reports organic-search headwinds alongside growth in direct, performance and non-search referral channels. Financial payouts and paid-acquisition economics cannot be assumed for home products.
3. [NYT FY2025 Form10-K](https://www.sec.gov/Archives/edgar/data/71691/000007169126000011/nyt-20251231.htm), affiliate/licensing/other section. Avoid the common category/brand attribution error described above.
4. [RTINGS methodology](https://www.rtings.com/company/about-us) and [monetization](https://www.rtings.com/company/how-we-make-money). It purchases review units; affiliate, membership and other revenue support an actual testing operation.
5. [HouseFresh test method](https://housefresh.com/how-we-test-air-purifiers/). Test conditions, noise, power, consumables and user experience are explicit. This establishes a method, not a verified revenue claim.
6. [Tom's Guide's April2026 relaunch](https://futureplc.com/blog/toms-guide-relaunches-with-smarter-shopping-tools-expert-qas-and-expanded-video-strategy/). The announced product finder, Q&A, video, newsletters and related-content tools illustrate several discovery/decision paths. Their presence does not prove incremental revenue for ECO.

## What this means for a small home-comfort publisher

Inference from the evidence: prioritize a specific buyer problem, useful original decision support, a valid local offer and a measurable outcome. Page count and a high affiliate rate are poor standalone objectives. A weak recommendation is not improved by adding a calculator or a stronger purchase button.

Immediate implementation is the country-category pilot, documented separately. German autumn humidity/laundry tasks connect to the already verified store; NL/AU are small discovery pilots until local monetization is confirmed. Existing US pages remain a verified monetization surface. No broad new US category is added without a separate demand review.

The new hubs begin with a problem selector; guides offer purchase constraints and printable checklists, with references and clear limits. Merchant links match the reader's country. This release adds no fake lab score, imported foreign ASIN, unsupported price saving, site-wide ranking claim or guaranteed outcome.

## Reverse-engineering a monthly $1,000 commission target

Formula: qualified visits × merchant-click rate × attributed-order rate × net commission per order. Net commission means after reversals/returns; it is not order value or site profit. USD below is a scenario unit, not a conversion of EUR/AUD earnings. Use a documented exchange-rate basis when reconciling actual markets.

| Illustrative case | Click rate | Click→order | Net/order | Required visits | Merchant clicks | Orders |
|---|---:|---:|---:|---:|---:|---:|
| Lower yield | 20% | 3% | $4 | 41,670 | 8,334 | 250 |
| Middle assumption | 25% | 5% | $8 | 10,000 | 2,500 | 125 |
| Higher yield | 30% | 7% | $12 | 3,970 | 1,191 | 84 |

These are arithmetic scenarios, not industry averages, current ECO performance or a deadline promise. They show why a handful of clicks cannot validate or sustain the target. Average commission per order is unknown until merchant reports establish it. Ordered-item counts are not order counts; do not silently interchange them in this model.

`python3 tools/affiliate_growth.py --target-usd 1000` reproduces the scenarios. Optional `--report /private/path/normalized.json` accepts a same-period, same-store summary with period_start, period_end, market, currency, source and optional merchant_clicks, ordered_items, shipped_items, net_commission. Never commit the private export. Missing values stay null; explicit zero and negative adjustments are preserved. The tool reports period aggregate EPC only, not user attribution or causal lift.

## Staged operating decisions

1. Verify merchant reports and tracking readiness before allocating more work by country. Reconcile orders/shipments/fees and date windows. An unknown report is a measurement gap, not zero earned revenue.
2. Concentrate improvement on current pages with qualified visits and a purchase/installation task. Fix misleading links and decision friction before adding more pages. Maintain the existing purchase-intent regression checks.
3. Use a bounded distribution test per cluster: owned homepage/related-page exposure now; external human-led demonstrations or community posts only when authorized and relevant. Measure referred visits, useful decisions and merchant clicks separately. Do not buy traffic before net EPC is known.
4. Review each cluster after sufficient reach. At low traffic, inspect the actual query and page task instead of running underpowered A/B tests. Seasonal windows and reporting lags must be recorded.
5. Scale the category with verified net commission and useful visitor outcomes, not the highest advertised rate. Diversifying merchants is a later option after real enrollment, current offers and attribution terms are verified.

## Two adversarial checks

- Copying large publishers' article volume lacks their brand, distribution and test evidence. Response: nine focused category sections using six pages, not a mass article generator. No purchased test units or fabricated review expertise.
- Country expansion can increase unmonetized traffic and miscount it as affiliate growth. Response: explicit merchant readiness, local links, separate ordinary-outbound events and revenue gated on merchant reports. Lower-yield accessories may help solve a task but are not assumed to carry the revenue target.

## Conditional BPJ product thesis

Proposed reusable core: country/program eligibility checks, source-backed topic queue, link/market audits, qualified-traffic-to-merchant reconciliation, seasonality and experiment decisions. The offline economics module and existing site gates are the beginning of that core. A generic AI article generator is not the differentiated product.

Evidence gate before marketing a repeatable revenue system: ECO's merchant-confirmed net commissions exceed $1,000 for two consecutive complete months; returns/reporting lags are reconciled; at least two content clusters and one non-search source contribute; work hours and operating costs are recorded. These are proposed validation criteria, not achieved results. Then run a second-site pilot and interviews/trials with independent operators before claiming generality, setting price or enabling payment. The product should never promise the user's income.
