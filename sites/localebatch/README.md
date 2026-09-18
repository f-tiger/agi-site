> Release authorized by the owner on 2026-09-18. The public free checker is being deployed at https://localebatch.agiscorecard.com. Paid processing remains closed. See `../../docs/localebatch-release-2026-09-18.md` for the deployment record.

# LocaleBatch — paid outcome experiment

Original development status (before this release): local, unlaunched prototype. No domain, Cloudflare resource, merchant product,
provider spend, payment, outreach or PR was created by this work. The default
configuration closes paid processing. Working name, not a cleared public brand.

## Product and commercial scope

A new independent subsite for merchants/agency operators adding another Shopify
language. The free local checker accepts the official translation CSV format. The
paid pilot hypothesis is **EUR 19 excluding tax per fixed batch**, up to 500 fields,
100,000 source characters and 500 characters per field. Only blank PRODUCT title,
meta_title and meta_description fields in the supported target languages qualify.
Existing translations and unsupported rows are preserved. This is not 500 complete
products, an HTML translator, a Shopify app, a translation-quality guarantee, a
two-sided marketplace or a promise of revenue. Free Shopify Translate & Adapt is
explicitly disclosed on the product page.

Run `npm test`, `npm run build`, `npm run preview` (Node >=22.13). The standalone
`review/preview.html` contains the checker and fixed sample without dependencies.
The demo intentionally drops “12” in one result; that row must be blocked. No model
call or fee occurs in the demo. No framework, install script or runtime dependency.

## What is implemented

- CSV parsing and shape validation; exact string IDs; duplicate-key rejection;
  brand/number/template-token checks; unchanged original fields and translations.
- Separate Shopify import and spreadsheet-safe review exports. The latter escapes
  formula-like cells and must not replace the exact-ID import.
- Hosted Stripe Checkout creation for this product only, fixed server price,
  server retrieval and signed webhook fulfillment. A return URL never grants access.
- D1 job recovery using a random 256-bit bearer key, stored hashed server-side.
- Cloudflare queue processing independent of the buyer's open tab. Lease exclusion,
  maximum two attempts per field, reservation before calling, bounded response,
  provider price filter, no tool execution and immutable job input.
- Self-service full refund request within seven days, idempotency, explicit pending
  vs succeeded states, refund webhook handling and cancellation of new work.
- Expiry at 30 days and scheduled deletion. Five job starts per daily salted IP
  bucket; no raw IP stored. This limits a single source, not distributed abuse.

## Reviewed deployment configuration still required

Use a separate staging Worker and **test** Stripe environment first. The checked-in
Wrangler config now publishes the free checker on its custom hostname. It enables no paid bindings or schedule. Add:

| Setting | Purpose |
|---|---|
| D1 binding `DB` | Apply `migrations/0001.sql` to an isolated database |
| Queue producer `WORK` and consumer | Same Worker; batch size 1, retry policy and separate dead-letter queue |
| Daily cron | Calls `scheduled` for retention; then set `CLEANUP_ENABLED=true` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Dedicated environment secrets |
| `STRIPE_PRICE_ID` | Active one-time EUR 19 price for LocaleBatch, tax-exclusive |
| `OPENROUTER_API_KEY`, `MODEL_ID` | Dedicated bounded key, chosen model verified with real fixtures |
| `INPUT_USD_PER_M`, `OUTPUT_USD_PER_M` | Verified maximum provider rates, not guessed prices |
| `JOB_BUDGET_USD` | Batch reservation ceiling; oversized worst-case jobs are rejected before checkout |
| `SITE_ORIGIN` | Exact public HTTPS origin, without trailing slash |
| `RATE_SALT` | Random secret for daily upload limiting |
| `SELLER_NAME`, `SUPPORT_EMAIL` | Actual operator/support, shown before checkout |
| `QUALITY_REVIEWED` | Only after bilingual review and real provider trials |
| `SALES_ENABLED` | Final switch after the service below is checked |

Configure Stripe events `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `charge.refunded`, `refund.updated`,
`refund.failed` to `/api/webhook`. Preserve the raw request body. A support operator
must monitor failed refunds and the dead-letter queue; the recovery view can requeue
interrupted paid jobs. In a real environment, verify refunds, tax configuration,
provider charges, retention, queue redelivery and recovery before collecting money.
For higher volume, replace the basic upload limit with measured abuse controls.

The input/output price filter is enforced in the provider request; per-request
charges are excluded. The reservation adds 10% headroom and retains costs for failed
or interrupted calls. This is a control based on configured prices, not an audited
invoice. Provider account spending limits are the final spend backstop. Reported
costs are recorded when available; missing usage cost must not be read as free usage.

## Verification and known gaps

23 tests cover the implementation, including a complete simulated
purchase → provider-independent task result → refund using real SQLite and mocked
external services. Additional adversarial tests may be recorded in the review log.
There has been **no real Stripe, Cloudflare or model-provider integration test**.
Cloud browser policy blocked local file preview; this was not bypassed. Visual and
mobile browser QA remain open. Syntax/build and structural checks do not replace it.

Output checks do not validate semantics, nonnumeric invented claims, translation
fluency, store-specific limits or correct target language. Fixed demo strings are
not model evaluations. The initial paid scope is deliberately restricted to plain
text fields. A real bilingual corpus review is required before sales, not a flag to
toggle solely to make the button work.

## Business evidence and expansion

See `../../docs/transaction-business-three-rounds-2026-09-18.md`. First prove three
unrelated paying buyers, a usable import and at least two independent repeat buyers.
An agency managing several catalogs is a channel hypothesis, not a signed customer.
Only then add one adjacent task using the same payment/queue/export engine. Proposed
HTML/localization-memory/feed adapters are not implemented or being sold.
