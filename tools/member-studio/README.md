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

## Site-specific entrances (2026-09-19)

The four sites now link to their own member entry routes. BPJ retains its portal; AGI uses `/members` and `/zh/members`, EcoBack `/members.html`, `/en/members.html`, `/it/members.html`, and The Doll Scout `/members`, `/de/members`. These are independent branded entrances, not independent accounts or payment processors.

`tools/revenue-studio/member-entry-build.mjs` builds localized introductions from the existing plan copy. Checkout remains an explicit user click to BPJ, with a provider/domain explanation before departure. The portal uses an allowlisted source site and catalog product ID for its brand banner, language links and return link; arbitrary return URLs are ignored. No access key or tool inputs enter a URL. The cloud-save popup first shows the site's own introduction, then the original tool sends inputs only to that same window on the exact BPJ origin. Closing the popup or waiting 30 minutes removes the transfer listener; users can reopen from their tool. Nothing is uploaded until Save.

Static and production workbench verification checks local membership links, pages, canonicals, language links and sitemaps. Browser verification covers the seven new localized entrances, source retention on language changes, hostile source parameters, and the full original cloud-save/restore path. All four deploy workflows watch shared membership changes so plan copy stays in sync.
