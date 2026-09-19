# Independent memberships

The owner clarified that all four sites must have independent memberships, not shared rights behind local entrances. Each site now runs its own same-origin `/api/member`, `/api/member-watch`, and `/api/member-admin` against its existing, distinct D1 database. Login, payment quotes, receipts, expiry, support and cloud records are isolated. A purchase grants only that site's tools. The browser never calls or redirects to another site's membership service.

| Site | Database binding | Routes | Exclusive quote micro-USDT range |
| --- | --- | --- | --- |
| BPJ | HITS / aiyangmao project | /members, /en/members, /de/members, /it/members | 9000001–9009999 |
| AGI Scorecard | EVENTS / agiscorecard-events | /members, /zh/members | 9010001–9019999 |
| EcoBack | EVENTS / ecoback-events | /members.html, /en/members.html, /it/members.html | 9020001–9029999 |
| The Doll Scout | HITS / dollscout-events | /members, /de/members | 9030001–9039999 |

Plan: 9 USDT plus the exact order identifier fraction (less than 0.04 USDT), 30 days, 50 workspaces, 10 retained versions each, 64 KiB/version and 5 MiB total. No recurring debit. Current price remains a launch hypothesis. The approved receiving wallet is unchanged. Disjoint amount ranges enforced in each database prevent a matching transfer from paying a different site's order. Amounts are never recycled. Site-qualified order IDs, separate operator keys and receipt tables provide additional separation. Future pricing or partition changes require a reviewed migration, not only display edits.

Server implementation is bundled locally into each site's Worker/Pages Functions. It makes no BPJ API calls for sibling-site membership. `server.mjs` selects the deployment's fixed site and database, never a client-provided site. `MEMBERS_ENABLED` controls new sales. Site-specific health must be fresh; the watcher probes the live chain even when no orders are pending. Existing paid reads/exports remain available during the 30-day expiry grace period. Record data is purged after grace; financial receipts remain for replay handling. Suspension does not initiate a refund.

Keys are local-origin session storage plus user-downloaded backups with a site-specific service identifier. Other sites' backups are rejected. All tool-data messaging checks the same origin and exact window. No key or payload enters URLs. Only a separate Save action uploads data. No email recovery, team accounts or end-to-end encryption is promised.

## Deployment and checks

All workflows retain their original guards. Sibling deploys synchronize `MEMBER_WALLET` and distinct HMAC-derived `MEMBER_WATCH_SECRET` using existing repository Cloudflare credentials, preserving other keys and D1 bindings. No actual secret or wallet is printed or committed. BPJ retains its existing secret configuration. All four workflows watch the shared server sources and compile them into their own deployments.

The existing two-hour `bpj-ad-watch` schedule independently calls each site's endpoint. Sibling checks run even if the BPJ ad step fails, and each site is attempted regardless of another site's failure. There is no new cron or paid provider. Conservative idle incremental budget: about 0.5 runner minutes per run × 360/month = 180 minutes/month, dependent on RPC latency. The new step has a five-minute cap; this is a budget estimate, not a billing guarantee. Per-site health closes new sales if monitoring is stale.

```sh
node sites/baipiaoji/scripts/test-membership.mjs
node tools/member-studio/test-isolation.mjs
node tools/member-studio/browser-test.mjs
node tools/revenue-studio/build.mjs --site eco --out /tmp/eco-workbench
node tools/member-studio/verify.mjs --site eco --out /tmp/eco-workbench
node tools/member-studio/verify.mjs --site eco --live
```

The isolation suite uses four actual in-memory SQLite databases and mocked chain responses. Browser tests use paid fixtures only in memory; production verification never pays or grants membership. Tests cover same-token isolation, cross-site tx replay, product scope, SQL amount partitions, secret separation, all eleven localized pages, same-domain quotes and save/restore, and special SQL/puzzle tools.

## Cutover evidence

Before changing rights, the authenticated production audit on 2026-09-19 at 16:14:51 UTC reported paid_orders=0, paid_members=0, active_members=0 and unexpired_pending=0. Run: https://github.com/f-tiger/agi-site/actions/runs/35454290932. No customer account details were exported. The deployment preflight refuses an old shared system with outstanding paid or unexpired pending orders; once the independent API is deployed it no longer applies the legacy gate.

API configuration references: https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/update/ and https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/edit/ .
