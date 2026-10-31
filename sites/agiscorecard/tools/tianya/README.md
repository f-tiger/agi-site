# Tianya Echo release and maintenance

Public routes: `/tianya`, `/zh/tianya`, and the Chinese archive `/zh/tianya-research`. Product ID: `tianya-validation`. The free Fleet identity and the existing independent-key paid workspace are separate; do not grant cloud entitlement from a registration click.

## Build and verify

From the repository root:

```sh
npm ci --prefix tools/revenue-studio --ignore-scripts
node tools/revenue-studio/build.mjs --site agi --out sites/agiscorecard
node sites/agiscorecard/tools/tianya/build.mjs
node sites/agiscorecard/tools/tianya/migrate-research.mjs --check
node --test sites/agiscorecard/tools/tianya/test.mjs
node sites/agiscorecard/tools/tianya/member-test.mjs
node tools/revenue-studio/node_modules/playwright/cli.js install chromium --only-shell
node sites/agiscorecard/tools/tianya/browser-test.mjs
```

The browser test uses the pinned Playwright browser by default. Only an explicit `TIANYA_CHROMIUM_EXECUTABLE` or `CHROMIUM_EXECUTABLE` overrides it. Do not auto-select a system Chromium: the release runner's 156 build crashed both popup and opener, while pinned headless shell 145 completed both languages. Protocol checks wait on the actual popup and messages, not a navigation barrier or background animation frame. Failure diagnostics contain synthetic protocol metadata only.

Run shared breadcrumbs, navigation and analytics coverage after page generators. The production workflow retains site, language, private-route, member isolation and analytics checks. `verify.mjs` checks public pages/assets, the dated research, membership product URLs and canonical sitemap without account creation or payment.

## Preserve the evidence snapshot

The migrated archive is a frozen 2026-10-05 snapshot, not a current forecast. Its migration manifest checks 54 source assets, 60 strictly unknown claims, 20 unscored endpoints and anonymized phone-like author names. CI uses `--check` on committed assets; it does not depend on the original Sites checkout. To migrate again, use the frozen source at commit `d35b378a855babbc345d4b6d744d5a70a252b1fe`; the legacy site now also contains an AGI migration banner and must not silently become a new evidence snapshot.

## Release checkpoint — 2026-10-31

Run 41218637412 completed all pre-deployment checks, including the full practical-tool browser suite, account security and GA4 coverage. Its final freshness guard refused deployment because another project advanced main during the build. No public deployment is inferred from that run. A fresh release must rebuild the current main, pass the same guard and complete read-only live checks. Never disable the guard or restore an older build after it fails.

Revenue, real registrations and actual payments are not inferred from any test fixture or publishing event. The paid backend test uses mocked chain receipts; the browser popup fixture does not upload a real record.
