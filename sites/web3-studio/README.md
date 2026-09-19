# Web3 Workbench

Ten independent, usable free-beta tools and one hub. Source and generated fixtures are shared; every host serves only its own pages. Existing Agent Delivery Lab remains a separate deployment.

Hub: https://web3.agiscorecard.com/

| Host | Tool | Implemented task |
|---|---|---|
| reconcile.agiscorecard.com | Stable Reconcile | Declared invoice/transfer exceptions |
| evidence.agiscorecard.com | Agent Evidence | Task/version evidence, deduplication, uncertainty |
| route.agiscorecard.com | Route Lab | Bounded fallback sequence planning |
| protocol.agiscorecard.com | Protocol Ledger | Five dated profiles, free API/OpenAPI |
| permit.agiscorecard.com | Data Permit | Declared grant compatibility and proposed splits |
| compute.agiscorecard.com | Compute Lens | Cost per accepted workload output |
| incentives.agiscorecard.com | Incentive Lab | Organic economics and capped rewards |
| proof.agiscorecard.com | Proof Plan | zkML cost, latency and artifact manifest |
| calls.agiscorecard.com | Call Lens | Strict decoding of supported token calls |
| disclosures.agiscorecard.com | RWA Notes | Dated disclosure comparisons |

## Development and release

Node.js 22+ and Python 3 with Pillow and DejaVu Sans fonts are required. Runtime engines have no npm dependencies.

```sh
python3 -m pip install -r requirements-build.txt
npm test
python3 scripts/check_html.py
npx --yes wrangler@4 deploy --dry-run
```

`npm test` builds 44 HTML pages, 30 worked scenarios, per-host metadata and share images, and the offline bundle, then runs 65 tests. `WEB3_BUILD_REVISION` pins the actual checked-out commit. Generated `dist/`, release module and credential-free generated Wrangler config are not committed.

The path-scoped GitHub workflow validates, checks all hostname ownership, binds the existing database, deploys the Worker, and checks every production host and asset against the build. A collision stops before publication. Existing credentials remain in GitHub Secrets. Branch runs validate only; main may deploy. Do not substitute the trigger SHA for the checkout SHA after the stale-main guard.

Only `web3_studio_feedback` is created/read/updated. No other database table is modified. Optional feedback is constrained enums; IP is used only as the transient rate-limit key. QA samples are explicitly flagged and excluded from demand. Grouped submission counts never represent verified individuals. TTL cleanup occurs on feedback/stats requests and may be delayed during inactivity.

## Product limits

Browser inputs are local. No model provider, wallet, live-chain simulation, transfer, subscription or proof verification is connected. Documentation states each tool's own limits. Protocol records are editorial summaries, not complete schemas or compatibility certification. New algorithms mean reproducible combinations of known methods here, not a novel cryptographic or economic theorem.

Research and falsification conditions: [portfolio research](../../docs/web3-portfolio-research-2026-09-19.md). Every tool's catalog includes alternatives, scope, commercial hypothesis and a concrete validation condition. Public downloads are limited to the explicit offline bundle and its license; no repository archive is served.


## Experience, discovery and sharing (1.1)

Each tool has three runnable scenarios, per-record-group CSV paste, same-tab result comparison, Markdown reports and print/PDF output. Public share links allow only known scenario IDs; private inputs never appear in generated URLs. Clearing/reloading the tab removes in-memory records and comparisons.

Search titles describe actual tasks. Human-readable methods and examples back the structured WebApplication, FAQ and breadcrumb data. No fabricated ratings, usage statistics or rich-result promises. `guide.md`, `tool.json`, `input.schema.json`, `llms.txt` and `llms-full.txt` are navigation/integration aids, not special eligibility requirements for AI search. The schema is structural; the engine enforces its additional constraints.

`/publish.html` on the hub provides ten share cards and optional branded links. Distributed HTML card links use `rel="nofollow"`. No automatic outreach, paid links or third-party endorsements are claimed.

The existing weekly/manual IndexNow workflow validates the key and four canonical URLs on each of the 11 hosts before submitting. It never submits on push. `node scripts/indexnow.mjs --check` validates without submitting. A 200/202 submission response is not evidence of indexing or ranking.

Release smoke verification uses `asset-manifest.generated.json` to hash-check the exact assets for each host; generated files are excluded from git. See [growth implementation record](../../docs/web3-tools-growth-2026-09-19.md).
