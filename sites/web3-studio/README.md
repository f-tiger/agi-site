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

Node.js 22+ and Python 3 are required. Runtime engines have no npm dependencies.

```sh
npm test
python3 scripts/check_html.py
npx --yes wrangler@4 deploy --dry-run
```

`npm test` builds the 33 HTML pages, examples and offline bundle, then runs 50 tests. `WEB3_BUILD_REVISION` pins the actual checked-out commit. Generated `dist/`, release module and credential-free generated Wrangler config are not committed.

The path-scoped GitHub workflow validates, checks all hostname ownership, binds the existing database, deploys the Worker, and checks every production host and asset against the build. A collision stops before publication. Existing credentials remain in GitHub Secrets. Branch runs validate only; main may deploy. Do not substitute the trigger SHA for the checkout SHA after the stale-main guard.

Only `web3_studio_feedback` is created/read/updated. No other database table is modified. Optional feedback is constrained enums; IP is used only as the transient rate-limit key. QA samples are explicitly flagged and excluded from demand. Grouped submission counts never represent verified individuals. TTL cleanup occurs on feedback/stats requests and may be delayed during inactivity.

## Product limits

Browser inputs are local. No model provider, wallet, live-chain simulation, transfer, subscription or proof verification is connected. Documentation states each tool's own limits. Protocol records are editorial summaries, not complete schemas or compatibility certification. New algorithms mean reproducible combinations of known methods here, not a novel cryptographic or economic theorem.

Research and falsification conditions: [portfolio research](../../docs/web3-portfolio-research-2026-09-19.md). Every tool's catalog includes alternatives, scope, commercial hypothesis and a concrete validation condition. Public downloads are limited to the explicit offline bundle and its license; no repository archive is served.
