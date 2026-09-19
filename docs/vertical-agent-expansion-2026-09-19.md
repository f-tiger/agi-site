# Vertical Agent expansion — 19 September 2026

## Optimized execution brief

Owner intent: continue a portfolio of scalable commercial experiments, with concrete functionality, appealing design, beginner onboarding and publishing. Optimize-before-execution and ECC prompt-optimizer applied before implementation; market-research and frontend-design methods carry forward. MCP protocol evaluation follows Anthropic mcp-builder's read-only independent evaluation workflow.

Refined task: remove TradeCheck's JSON preparation barrier, ship one separate finance evidence workflow, preserve exact source/period semantics, add a relevant owned entry point, and publish only after arithmetic, protocol and live-site checks. The success measure of this release is usable task completion, not a claim of commercial success. No checkout, outreach, ad spend, paid provider or new scheduled job.

## Baseline and commercial selection

Immediately before expansion, `/api/pulse` returned HTTP 200 and empty non-QA 28-day rows for RFQDesk, ModelMeter and QuerySprint. These are opt-in events, not visitors; an empty report does not prove no traffic or no demand. No new revenue or paying buyer has been verified. Eco's last owner-reported evidence remains €11.20 trailing 30 days through 14 September 2026; it is not a refreshed figure.

Primary sources reviewed:

- [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) and [fair access policy](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data): official companyconcept data, access constraints, no browser CORS, a maximum 10 requests/second guidance. Direct official Apple Assets lookup returned HTTP 200. Worker lookup uses a fixed SEC host/path, identified user agent, one-hour public cache, a conservative shared rate bucket and a 2 MB response bound; no bypass retries on rejection.
- [Calcbench pricing](https://www.calcbench.com/pricing): Basic free; Premium $6,000/user/year and Professional $12,000/user/year when reviewed. As-reported financials and reporting revisions already exist. Evidence of an established category, not willingness to buy our beta.
- [Daloopa](https://www.daloopa.com/) and [Financial Datasets](https://www.financialdatasets.ai/): financial source data and agent/MCP workflows are already offered. Generic financial chat or source links alone are not a defensible differentiator. Vendor accuracy claims were not independently verified or adopted.
- [A2X pricing](https://www.a2xaccounting.com/pricing): several commerce channels start at US$29/month with accounting integrations. A standalone payout CSV checker would start behind a more complete alternative.
- [Nanonets pricing](https://nanonets.com/pricing): document extraction/workflow is available commercially. Building commodity OCR alone would not resolve buyer trust, source confirmation or history coverage.

Selected second experiment: **FilingLens**, for people checking model inputs or writing financial research who need to compare one same-period fact at two filing cutoffs. The wedge is a tightly constrained, no-signup evidence check plus local MCP, not market-data breadth. This is an inference about a possible job, not an observed customer segment. Five consistent independent buyer observations and actual willingness-to-pay evidence remain absent. Creator/short-video, fandom and startup discovery remain earlier research candidates; this release does not claim to validate or exhaust them.

## Three adversarial rounds

1. **Commercial challenge:** incumbents already sell financial data; a wrapper may be worthless. Response: a bounded free experiment with one exact task and a clearly unavailable €19/month workspace proposal. Saved notebooks/watchlists/alerts are hypotheses, not shipped paid features. No more finance features until relevant usage and repeated job evidence appear.
2. **Correctness challenge:** quarterly and YTD facts, same-day conflicts, missing baselines, decimal errors and invented source links can mislead. Response: exact CIK/concept/unit/start/end matching; latest eligible filing date per cutoff; conflicting values remain incomplete; exact absolute arithmetic; unsafe numbers rejected; fictional examples have null links; no restatement classification or trading recommendations. Tests include hostile/malformed data and a real SDK stdio client. Independent evaluation inspects tool contracts and calls only, without reading the implementation.
3. **Adoption/operations challenge:** an attractive page without a usable first task or distribution will not acquire customers. Response: worked examples, progressive input controls, separate beginner guides, downloadable MCPs and checksum verification. TradeCheck now accepts CSV/TSV/pasted spreadsheet rows with visible column mapping. FilingLens gets an English and Chinese investment-hub entry. Live SEC failure remains visible; uploaded-file fallback is explicitly unauthenticated. Public statistics keep sample, own and QA modes separate.

## Delivered scope

### TradeCheck v0.2.0

- CSV or TSV parser, bounded rows/columns, quoted CSV and original physical row locators.
- Explicit one-to-one column mapping; ambiguous aliases need a selection. Separate PO-line mapping on invoice rows.
- Required header IDs, supplier IDs, two currencies, subtotal, charges, tax and total. No unknown amounts filled with zero.
- Visible first-five-row preview, full prepared JSON, original two-way checker and unsent supplier draft.
- `tradecheck_import_tables` is the fourth MCP tool; returns unreviewed data with unknown prior history. Prior invoices can be added in advanced JSON.
- Exact engine semantics and audit-report schema remain v0.1.0. Package/download version is v0.2.0.
- Archives use an explicit allowlist and fixed file metadata; non-deterministic evaluation-result timestamps are excluded from release packaging.

### FilingLens v0.1.0

- Separate site: `filinglens.agiscorecard.com`, warm editorial visual system, complete beginner guide.
- Eight US-GAAP concepts; CIK-based official lookup or local companyconcept JSON.
- Exact period/unit selection; explicit filing cutoffs; source values, accession directories and absolute change.
- Missing/conflicting data remains incomplete. No percentage-return display, restatement classification, alerts or trading.
- JSON evidence export and plain-text source note.
- Three local read-only MCP tools, one guided prompt and scope contract. No local MCP file access, network, model fee or storage.
- Public beta permits internal evaluation; repository remains private. No npm publishing or resale license has been assumed.

## Measurement, distribution and economics

A new `filinglens_events` table is additive. Existing `venture_events` rows and other owner tables are untouched. Both use the existing authorized D1 binding; no new database, cron or upgrade. SEC query values are not written to the measurement tables. Interest and survey responses are coarse anonymous categories, not leads or transactions. Full deployment smoke tests use QA mode.

The investment hub entry carries `src=agi`; its existing click event records only the placement. Main-site feed and agent mirrors are regenerated in its deploy workflow so the existing generation obligation runs against the complete current repository. No source financial facts, holdings, portfolios or historical return figures on the hub are edited.

Revenue scenarios are arithmetic, not forecasts:

| Hypothesis | €110 monthly gross receipts | €1,100 monthly gross receipts |
|---|---:|---:|
| TradeCheck team workspace at €29/month | 4 customers → €116 | 38 customers → €1,102 |
| FilingLens research workspace at €19/month | 6 customers → €114 | 58 customers → €1,102 |

At an assumed 80% contribution margin, €1,100/month contribution would require 48 TradeCheck customers or 73 FilingLens customers. Contribution is still not net profit. At €30/hour, ten support minutes cost €5 per customer per month; a €19 product with frequent manual research can fail even before acquisition costs. Pricing, tax, payment fees, support and actual conversion remain unvalidated.

Operational decision gates: acquire relevant visits before interpreting zero use. After 100 relevant landing visits, 20 own-task completions and five contextual price-interest visits, investigate the actual repeated job; opt-in events alone cannot establish those as unique people. Require three independent paying buyers, positive contribution after support and repeat use/purchase before paid expansion. Stop or reposition if reachable users consistently prefer their spreadsheet or incumbent and cannot identify an unmet repeated task. No date-based automation was created by this release.

## Verification record

Implementation-stage checks: TradeCheck 18 tests, FilingLens 10 tests, portfolio Worker/product/API initially 19, finally 22 tests; local Worker dry-run succeeded. TradeCheck's existing independent protocol evaluation: 10/10 questions and 230/230 assertions. A malformed/null observation bug found in development was fixed before packaging. Independent black-box testing also found that reordering equivalent source observations changed the truncated citation subset; sources now sort by accession and value before truncation, with a regression check. FilingLens independent evaluation: 10/10 stable questions, each repeated in a fresh process (20 sessions, 96 calls). TradeCheck's new import contract also passed five independent protocol calls. These are deterministic protocol tests, not an LLM reasoning benchmark. Actual deployment/online results are recorded in `docs/vertical-agent-release-2026-09-19.md`; local passing checks are not deployment proof.
