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

Rate limit: 20 events per minute per visit key, plus 5,000 stored events/day/site cap. This is abuse/cost mitigation, not bot verification. Anonymous events remain forgeable. Daily cron deletes records older than the retained 35-day window. No subscription, personal lead or confirmed purchase exists in this database.

Run the **Commercial experiment funnel report** workflow for a read-only trailing-28-day aggregate. No raw identifiers are logged. Sales should only be reported from a real merchant ledger; never infer them from interest.

## Deployment verification still required

Public worker/module/WASM execution and each complete user path must pass browser inspection after release. Unit tests do not establish payment demand, buyer retention, SQL proficiency or supplier quality.
