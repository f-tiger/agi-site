# Independent site memberships — 2026-09-19

The owner's correction supersedes the previous shared-membership and local-introduction designs: every site now has its own membership service, accounts, payment orders, rights and cloud records.

Implementation commit: 1c063ef7d50bcf4a3c2f15d39bae51082bd23459.

## Deployed structure

| Site | Portal | API and data |
| --- | --- | --- |
| BPJ | https://baipiaoji.com/members | Same-origin /api/member; existing BPJ HITS database |
| AGI Scorecard | https://agiscorecard.com/members | Same-origin /api/member; agiscorecard-events database |
| EcoBack | https://getecoback.com/members.html | Same-origin /api/member; ecoback-events database |
| The Doll Scout | https://thedollscout.com/members | Same-origin /api/member; dollscout-events database |

Membership pages retain the supported site languages (eleven pages in total). There is no BPJ checkout handoff from sibling sites. Each membership covers only its site's tools. A backup from one site is rejected by another site's UI; using the same raw token does not transfer paid rights or cloud data. Operator keys differ by site. The receiving wallet is unchanged, while the four sites have non-overlapping amount-identifier ranges enforced by SQL and exact chain receipt verification. Each account pays the exact quote displayed by its own site.

The existing two-hour watcher checks each site independently; deployment also initializes and verifies each site's watcher. No new cron, domain, paid service or customer communication was created. Existing analytics databases receive additive membership tables; no existing table or customer record was removed. See tools/member-studio/README.md for storage limits, expiry, price partitions and runner budget.

## Pre-cutover audit

Authenticated production totals at 2026-09-19 16:14:51 UTC: paid_orders=0, paid_members=0, active_members=0, unexpired_pending=0. Audit run: https://github.com/f-tiger/agi-site/actions/runs/35454290932 . No customer details were exported. Deployment preflight also checks outstanding legacy obligations before changing the old shared system.

## Verification

- 16 membership backend tests passed, including renewal, expiry, quotas, replay and transaction rollback.
- 8 isolation tests passed using four real in-memory SQLite databases and mocked chain responses. They prove distinct order IDs and amount ranges, one-site-only activation, cross-site transaction rejection, account/data/product isolation and distinct operator credentials.
- Existing 18 Web3 integration tests passed.
- Browser tests passed on all eleven membership language pages, including same-domain login, cloud save/export/restore, rejecting foreign-site key backups, and an unpaid quote UI on each site.
- SQL, puzzle, classroom and embed restoration stayed on their own site and passed.
- All 51 localized tool browser flows and four standalone embeds passed.
- Deploy workflows run strict static and live membership checks. Live checks assert the site's own plan identifier, checkout readiness, own-site product list and unauthenticated protected endpoint rejection.

Deployment runs:
- BPJ: https://github.com/f-tiger/agi-site/actions/runs/35455163392
- AGI: https://github.com/f-tiger/agi-site/actions/runs/35455163379
- EcoBack: https://github.com/f-tiger/agi-site/actions/runs/35455163373
- TDS: https://github.com/f-tiger/agi-site/actions/runs/35455163441

No real customer transfer or production paid grant was created during verification. Chain-funded activation has only been exercised with mocked receipts in this session. Deployment success is not revenue or conversion evidence.
