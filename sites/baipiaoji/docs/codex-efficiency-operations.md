# Codex Efficiency operations

## Release boundaries

The repository product is an installable Skill/CLI, not a personal ChatGPT skill installation. Source, fixed version branch, EN/ZH installation/pricing pages, server entitlement/payment implementation and tests ship together. MCP distribution is deferred; the same service can support an adapter later without claiming one already exists.

`CODEX_EFFICIENCY_ENABLED` defaults closed. Existing `MEMBERS_ENABLED` and 9-USDT workspace rights are untouched. `/api/codex-efficiency` GET exposes only the plan/readiness, not a wallet or operator secret. Registered accounts may use their one explicit trial evaluation while checkout is closed. There are no paid model calls.

Before opening purchase, confirm the live browser/CLI installation and trial path, measured delivery value and quality gates, and operator availability for support/refunds. Only the owner controls the Cloudflare enablement switch and payment configuration. The new switch requires `CODEX_EFFICIENCY_ENABLED=true`; it is necessary but insufficient: live BSC configuration, shared chain-health and a fresh `ce_health` heartbeat are also required. No real transfer was initiated by development tests. Do not mark production payment/refund acceptance complete on their basis.

## Storage and idempotency

`ce_orders`, `ce_periods`, `ce_projects`, `ce_evaluations`, `ce_evaluation_receipts`, `ce_devices`, `ce_rates`, `ce_refunds`, `ce_support`, `ce_health` are product-scoped. They never write `wb_members` or `wb_orders`. Existing `bpj_ad_chain_receipts` arbitrates transaction uniqueness across products. Schema is created idempotently against BPJ's existing HITS D1 binding. No other site's DB is used.

One evaluation is <=30 runs / 16 KiB of strictly validated numeric/pseudonymous data. SQL triggers atomically check current entitlement, quota and project capacity, insert the durable idempotency receipt and increment usage. A duplicate succeeds without recharging; an altered payload under the same nonce is rejected. After result retention expires, its durable receipt returns `result_expired`, rather than charging again. The client can retain its downloaded result.

Early renewal queues a new 30-day period starting at the latest nonrevoked paid period end. Each period has independent quota. Project slots are fixed per period. No automatic overage or renewal. Expiry preserves Lite and local rules; 30-day history export works without an active subscription.

Device approval: CLI creates a random credential, sends only its hash, and shows a 12-hex-character code. Logged-in browser approval binds that code to account/session version. Pending code expires in 10 minutes; linked credential in 90 days. Account session-version change and device revocation invalidate it. Device scope excludes purchase/refund/admin. Account deletion loses the account binding; customers should export records and resolve paid access before deleting their BPJ account. Billing/anti-replay records remain, but raw logs never enter this service.

## Heartbeat, support and refunds

Existing BPJ `/api/member-watch` calls `watchEfficiency`; no new schedule. It checks one pending order, performs bounded finalized-chain scans, updates product health and prunes expired result/device records. The preexisting member watcher still handles its own orders. Trial and payment data must never be copied into this public repository.

Operator-only `/api/codex-efficiency-admin` uses the existing `ADS_WATCH_SECRET` credential. Supply it through the established secret-handling workflow, never a pasted command line, browser URL or model prompt. Available actions:

- `stats`: confirmed gross USDT micro-units, refunds, paid usage, active accounts; excludes QA; profit is unknown.
- `refunds`: pending requests and confirmed destination (private operator output).
- `support`: pending order-help requests (private operator output).
- `resolve_support` with order `id`: acknowledges completion; does not change money or rights.
- `complete_refund` with order `id` and outgoing transaction `tx`: verifies finalized exact BSC USDT transfer from the configured merchant wallet to the requested destination, then atomically records the receipt, marks refunded and revokes the matching period. **This endpoint does not send funds.**

Never ask the model to send a refund. The owner executes the transfer using their wallet after checking the request/destination; only then is completion recorded. A request does not revoke service, and an unverified/reused transaction cannot mark a refund completed. First-purchase request window is seven days. Published manual-service target is seven business days; confirm staffing before enabling purchase. Renewals have no first-purchase window; order-help remains available.

Refund amounts include the paid identification fraction, exclude the customer's original network fee. Pending order expiry never permits an identifier to be recycled. If a response is lost, retrieve existing orders before another transfer. Paid activation is receipt-idempotent.

## Commercial measurement

Development fixtures, QA accounts, directory bots and page impressions are not buyers. No new anonymous tracking is installed. Qualified-offer denominators require an explicit user-research cohort (supported local client, real recurring task, price seen). Until one exists, conversion rate is unknown, not purchases divided by pageviews. Count confirmed order/entitlement/evaluation records for the paid funnel. Never report manual renewals as guaranteed MRR or gross receipts as net profit.

Targets are in the PRD, with readiness and commercial checkpoints in `data/fleet-bets.json`. Commercial day 0 begins only once checkout and delivery are genuinely available. If the readiness gate stays closed, report a launch blocker, not failed customer demand. No marketing posts, official marketplace submission, 20-task model benchmark, user interviews, or real payment acceptance are claimed by this release.
