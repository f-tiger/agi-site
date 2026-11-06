# Google direct reporting and tag review — 2026-11-06

The reporting provider is Google's Admin/Data API, with the official Analytics
MCP as an optional read-only interface. Existing GA4 properties and measurement
IDs stay in place. This change has no third-party subscription dependency.
It is a reporting-source migration, not a new tracking-property migration.

## Coverage and instrumentation evidence

The source catalogue contains 52 canonical/historical site identities and six
separate aliases/previews. All eight known properties remain in the report even
when authorization fails. Shared properties are split by hostname; ListingLift
also requires its explicit `/smarterFuture/launch/ai-realtor/` path boundary.

Static checks used a probe User-Agent and did not run JavaScript or produce GA4
events. All 31 domains in the deployment registry returned the expected homepage
tag and matching deployed coverage manifests. Their manifests describe 4,962
public pages using the shared channel, release version `262e5051e587`. These are
build-declared page counts, not an exhaustive live-page crawl or traffic counts.
The 31 checked homepages showed one matching loader. Backend receipt is pending
independent Google read authorization.

Four deployed shared-AGI tags were missing from the reporting property mapping:
`agents`, `index`, `pay`, and `wallets` under `agiscorecard.com`. Their source
evidence is now recorded without claiming successful backend receipt.

Additional observations:

| Site | Static check | Consequence |
|---|---|---|
| ListingLift | `config.js` supplies `G-HT123LQLP7`; `app.js` loads Google | No second tag needed; keep the page-path boundary |
| Zaoqi Pages | Public HTML has `G-R41XP6CMED` | Retain the historically verified property; verify stream association with Google after authorization |
| Gushen | No Google tag detected in homepage or its main JS bundle | Instrumentation gap needs source/deployment review |
| SearchFurture | No Google tag detected in homepage or `assets/js/main.js` | Historical source configuration is not current live evidence |
| invest.agiscorecard.com | No Google tag detected in homepage | Review current serving implementation before claiming coverage |
| Intersolar | No Google tag detected in homepage | Uncovered; do not invent a property mapping |
| BestBlindToys / lens | Public fetch failed | Availability and instrumentation remain unknown |
| Compass | HTTP 302, not followed | Do not copy legacy AIChain alias traffic to the canonical hostname |

Some external sites have direct Google tags rather than the isolated fleet
channel. Tag presence alone is not a full privacy, route or business-event audit.
The existing fleet business contract already distinguishes samples, own-input
completion, exports, account entry and affiliate actions; retain those definitions.
Do not infer signup success from entry clicks or confirmed revenue from purchase
events. Private account and delivery routes stay excluded from frontend GA4;
registration/verification/payment truth continues to come from D1/billing.

## Rollout and authorization gate

The reader is ready for private execution and tested against mocked Google
responses, including cross-timezone dates, pagination, partial failures,
hostname isolation, zero-vs-missing counts and secret-safe errors. The current
execution environment has no Google ADC/service-account binding. Its real
preflight therefore reports `google_readonly_credentials_missing_or_invalid`.
No claim of live GA4 recovery may be made until an authorized report succeeds.

Configure Google access in the **private report environment**, as described in
README.md. The owner must enable the Admin/Data APIs in their Google project and
authorize a user or service account with Viewer access on the eight properties.
Do not add the credential to public legacy CI analytics exports. Do not publish
private report outputs or use Measurement Protocol to manufacture validation data.

Once authorized, run `report.py`, inspect discovery/timezones/stream mappings,
then check genuine existing daily events. A successful test or a deployed tag is
not proof of receipt. Missing and delayed data must remain explicit in every
scheduled ChatGPT report.

This reporting-only release changes no public content routes, canonical URLs,
indexability, sitemaps or AI-readable product content. SEO/GEO content stays
consistent, and there are no changed public page URLs requiring IndexNow
submission. It does not need a fleet-wide website redeployment.
