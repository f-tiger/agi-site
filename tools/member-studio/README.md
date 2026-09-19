# Workbench membership

Owner-authorized prepaid cloud workspace membership, hosted on BPJ for the four tool sites. Entry routes: `/members`, `/en/members`, `/de/members`, `/it/members`.

Backend: `sites/baipiaoji/lib/membership.js`; API routes `member`, `member-watch`, `member-admin`. Additive tables and triggers bootstrap idempotently through the existing HITS D1 binding. No destructive migration or new credential. `MEMBERS_ENABLED=true` permits new orders only with fresh ad-chain and membership-watch health. Disabling new sales does not revoke paid access.

Plan v1 is 9 USDT plus a unique fraction below 0.01, for 30 days. Pricing is a launch hypothesis. This is prepaid membership, not recurring debit or MRR. The v1 quote CHECK constraint deliberately fixes its range; a future price change must introduce a reviewed plan/migration, not edit a single display label.

Build and test from the repository root:

```sh
node sites/baipiaoji/scripts/test-membership.mjs
node tools/member-studio/build.mjs --out sites/baipiaoji/dist
node tools/member-studio/verify.mjs --out sites/baipiaoji/dist
node tools/member-studio/browser-test.mjs
node tools/member-studio/verify.mjs --live
```

Browser tests use the existing revenue-studio Playwright dependency and an isolated in-memory paid fixture, never production paid grants. `WORKBENCH_CHROMIUM` optionally supplies the local executable. Existing full tool browser regression remains required for shared frontend changes.

The BPJ deploy pipeline builds member assets after the tool workbench and runs backend and live gates. Existing `bpj-ad-watch` invokes `ad-watch-v2.mjs --members`: a separate authenticated member request processes one order at a time, performs grace-period cleanup and refreshes member health. No new cron. Empty member checks are expected to add seconds to the existing run; conservative incremental budget ~0.1 min × 360/month = 36 runner minutes/month, with RPC-heavy paid-order runs dependent on actual usage. No new paid service has been subscribed to.

Admin actions use the existing ADS_WATCH_SECRET in Authorization, never URL parameters. `stats` gives gross confirmed micro-USDT, distinct paid members, active members, with net_revenue null. `support` lists up to 20 private unresolved requests; `resolve` accepts a ticket id. `suspend` / `resume` accept an order id. These operations must run through authenticated private tooling, never dump messages or credentials to git/CI logs. Suspension does not refund money; no refund is claimed until a separate real transfer is verified.

Data retention: tool content is deleted after membership expiry plus 30 days; inactive users must export beforehand. Payment receipts and account token digests remain for replay prevention and order support. Client keys live in the BPJ origin's session storage and an explicit user-downloaded file; other domains receive only user-selected tool data, never the key. postMessage checks both origin and window identity. No email recovery, team accounts or end-to-end encryption is promised.
