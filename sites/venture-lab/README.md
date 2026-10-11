# Commercial experiment portfolio

Three independent products on one Cloudflare Worker, one dedicated D1 measurement database, no new domain purchases. Build: `npm ci --ignore-scripts && npm test && npm run build`.

| Product | Public host | Current deliverable | Proposed model |
|---|---|---|---|
| RFQ Desk | rfqdesk.agiscorecard.com | Supplier quote comparison and downloadable RFQ | €19/month saved quote-round workspace; later transaction matching only with real supply and buyers |
| ModelMeter | modelmeter.agiscorecard.com | Browser-only billed-cost CSV review | €29/month repeat imports, project budgets and alerts |
| QuerySprint | querysprint.agiscorecard.com | Three executable SQL exercises on two fictional datasets | €29 one-time project collection |

Paid offers are **not open**. Anonymous interest is not an order, email signup or revenue. Free inputs stay in the browser. Do not accept keys, prompt bodies or supplier/customer personal records.

`site/*` contains separate products; `site/shared` contains reusable CSV, rendering and measurement code. `python scripts/render.py` regenerates HTML and the product-led first-use design; run it after editorial template changes, then build. `onboarding.mjs` provides a four-step interactive tutorial for each product. The SQL runtime is pinned and hosted locally; its MIT license is shipped under `/vendor/LICENSE`.

## Release

Branch CI tests and bundles. Main CI checks each custom hostname against Worker mappings and DNS with the appropriate existing credentials. It creates/reuses only `agi-venture-lab`, applies an additive schema, generates the D1 binding, deploys and verifies public assets plus duplicate-safe QA event writes. Unknown hosts and paths return 404. Existing sites and databases are untouched.

The three domains share a release and rollback unit. A failure affects all three, but their URLs, content, working data and event categories are separate. There is no purchase API.

## Measurement

Default off, optional checkbox. Explicit price-interest sends only its named event. Allowlisted schema; no raw inputs or contact details. Random page-visit identifier, no cross-session persistence. CI/browser checks use `mode=qa` (`?qa=1` in browser), excluded by the aggregate report. Samples use `sample`, SQL uses `exercise`, own CSV uses `own`. Reloads are not repeat users. Consent selection means reported counts are incomplete, not total traffic.

Rate limit: 20 events per minute per visit key, plus 5,000 stored events/day/site cap. This is abuse/cost mitigation, not bot verification. Anonymous events remain forgeable. Cleanup on the next accepted measurement POST or existing scheduled handler deletes records older than the 35-day active window; idle data may remain longer. Aggregate GET/HEAD requests never initialize or clean up data. No subscription, personal lead or confirmed purchase exists in this database.

Run the **Commercial experiment funnel report** workflow for a read-only trailing-28-day aggregate. No raw identifiers are logged. Sales should only be reported from a real merchant ledger; never infer them from interest.

## Deployment verification still required

Public worker/module/WASM execution and each complete user path must pass browser inspection after release. Unit tests do not establish payment demand, buyer retention, SQL proficiency or supplier quality.

## Runtime measurement binding (2026-09-18)

CI deployment credentials can bind the owner-managed `after35-events` database but D1 REST management returned 401. Preparation now uses the same explicit database ID as Learn. Cloudflare validates binding access during deployment. Event ingestion initializes only the isolated `venture_events` and `filinglens_events` tables and indexes. `/api/pulse` uses SELECT only, scopes every query to the requested host and excludes QA. Missing database, missing tables or failed reads return 503 with no invented empty metrics. It accepts no SQL or query parameters and never returns visit identifiers.

The account already uses all five free Worker cron slots. No additional cron or paid plan is required: daily cleanup runs on the next accepted event, and the existing scheduled handler is unchanged. Expired records may remain longer when neither runs; aggregate reads do not mutate them.

### Public aggregate contract

Successful `/api/pulse` GET and HEAD responses use the shared aggregate cache, `Cache-Control: public, max-age=3600` and `X-Robots-Tag: noindex`; HEAD has no body and shares the GET cache entry. Errors are not cached. `generated` is the UTC read time, and `timezone` is `UTC`. `window` describes the most recent 28 complete UTC calendar days, `[today-28, today)`, with an exclusive end. `daily` contains sparse `{day,mode,event,source,visit_events}` aggregates in that interval, and `complete_rows` groups the same interval without day. These are anonymous opt-in event counts, never distinct people, external customers, orders or revenue. The modes `own`, `sample` and `exercise` stay separate. A successfully read date with no matching events has no daily row; an unavailable table fails the whole request.

`today` contains the current UTC partial day separately. For old consumers, `days:28` and `rows` remain available and retain their former interval: 27 complete days plus the current partial day. `legacy_window` labels that interval explicitly; use `window` and `daily` for complete-day comparisons. The `complete` flag refers to calendar boundaries, not completeness of opt-in collection or proof that all processing is final.

`FLEET_READ_ONLY_PROBE=1 node scripts/smoke.mjs` checks public assets, routing and closed-sales metadata without sending QA events or consuming the aggregate endpoint. The private collector can then read each aggregate once after deployment.

## Build dependency

Build `agents/tradecheck-mcp` first (`npm ci --ignore-scripts`, `npm run build`, `npm test`, `node scripts/evaluate.mjs`, `npm run package`). The site build includes that validated archive and browser engine. Paid team features remain unavailable. See the root vertical Agent review for commercial gates.
