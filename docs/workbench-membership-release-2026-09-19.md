# Workbench membership release — 2026-09-19

Implementation commit: bd356cfce9fd047cab745eb300e67406ac87ddbc.

## Shipped
- BPJ membership portal: https://baipiaoji.com/members with English, German and Italian equivalents.
- Shared membership controls across all 24 tools on BPJ, EcoBack, AGI Scorecard and The Doll Scout.
- Prepaid BNB Smart Chain USDT plan: 9 USDT plus a unique fraction below 0.01 USDT, 30 days; no recurring debit.
- 50 cloud workspaces, 10 recent versions each, 64 KiB/version, 5 MiB/account.
- Explicit save, version export and cross-site restoration; existing free tools remain free.
- Existing Web3 wallet and watcher credentials reused. No new cron or paid provider.
- 256-bit access key with explicit backup, rotation and expiry/export rules.
- Shared receipt replay protection, atomic activation/renewal, background verification, support queue and operator controls.

## Verified
- 16 membership backend tests using real SQLite and mocked chain responses.
- Existing 18 Web3 integration tests, 13 ad-commerce tests, watcher readiness tests and 11 workbench unit tests passed locally.
- All 51 localized workbench browser flows and four embeds passed locally.
- Membership browser flows passed in four languages, including quote UI, cloud save/export and cross-site restoration; SQL and puzzle restoration checked separately.
- Four-language static build and production verification passed. Production readiness true, auto_renew false, unauthenticated protected POST endpoints return 401.
- Portal responds with no-store, no-referrer and restrictive CSP headers.
- BPJ watcher initialized membership health successfully; deployment log showed zero membership orders processed and zero support requests.
- Deployment workflows all completed successfully:
  - BPJ: https://github.com/f-tiger/agi-site/actions/runs/35447463415
  - EcoBack: https://github.com/f-tiger/agi-site/actions/runs/35447463404
  - AGI Scorecard: https://github.com/f-tiger/agi-site/actions/runs/35447463396
  - The Doll Scout: https://github.com/f-tiger/agi-site/actions/runs/35447463441
- Read-only production membership verification repeated from the development environment after deployment.

## Limits of evidence
No real transfer or production paid grant was created for this release. Activation and renewal were tested with mocked chain responses, not actual funds. No revenue, customers, conversion rate or MRR is claimed. The 9-USDT price is a launch hypothesis. Background confirmation runs on the existing approximately two-hour schedule and may be delayed; the open checkout page can check sooner. Account access requires retaining the access key; email recovery is not provided.
