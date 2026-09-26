# ECO publication recovery check — 2026-09-26

Continuation of [the 25 September release](./eco-evidence-2026-09-25.md). This is an operational verification, not a new content release or a revenue claim.

## Verified recovery
- [Deployment 36203664872](https://github.com/f-tiger/agi-site/actions/runs/36203664872), source b8a6023ab7d132ba60fce1ab66e3316037d6e1c2, completed successfully. Cloudflare deployment, independent membership protected-endpoint readiness and post-deploy health checks all passed. Membership readiness passed at 2026-09-26T00:08:46Z; the test created no payment or paid grant.
- Fresh GET https://getecoback.com/api/pulse returned HTTP 200 and ok:true, generated 2026-09-26T01:16:12.144Z. The previously observed query_failed/database_limit outage is not present in these checks. Exact cause and quota-reset mechanism remain unverified.
- Both CBAM language pages return HTTP 200 and contain the supplier-request section. Both free TXT templates and the contact page return HTTP 200 with content. No duplicate publication or deployment retry was needed.

## Aggregate snapshot and limits
- Site-wide 28-day human pageviews: 581; search referrals: 212; AI referrals: 16; social referrals: 0. These are not CBAM-specific demand or checker usage.
- affiliate_click_28d: 79. Clicks are not commission or sales, and this aggregate must not be substituted for an affiliate provider's earnings statement.
- subs_total: 1; this is an endpoint aggregate, not a qualified enterprise lead.
- member_orders_by_state: {}. The currently queried membership order table returns no state groups; this is not evidence-service revenue and does not describe other payment systems.
- The €299 evidence pilot still has no verified checkout, quote ledger, upload or delivery workflow. No new verified evidence-service payment or enterprise follow-up item was established by this check.

## Distribution and next gate
Existing external drafts remain in the [marketing queue](./eco-evidence-2026-09-25.json). This continuation sends no external messages and makes no new channel-connection claim. Publish only once a connected account and authorised destination are verified; unrelated Telegram finance credentials are not marketing authorisation.

Keep eco-eu-evidence-1023 and the existing CBAM/EUDR scope. The previous expired approval message does not mean publication is still pending. Site publication and backend recovery are verified; active evidence-service checkout and external distribution remain unverified/unconnected as recorded in the queue.
