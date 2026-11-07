# The Doll Scout — collector buying guides and free collection tools

TDS helps collectors choose display, storage and gifts through source-backed comparisons, measurements and country-specific destinations. The country-buying baseline is live; the current follow-up adds six named options, task filters and a browser-local shortlist of up to three items. Its production verification is recorded separately in repository-root `docs/tds-affiliate-benchmarks-2026-11-07.md`. The collection desk, series checklists and planning tools remain available. English is the default, with German and Chinese guides.

- [Buying guides](https://thedollscout.com/shop): display cases, storage and transport, plush display and collector gifts; measurements, alternatives and seller checks before shopping.
- [Series checklists](https://thedollscout.com/series): official-source SMISKI and Sonny Angel names, saved in the same local collection used by the tracker.
- [Collection tracker](https://thedollscout.com/collection-tracker): owned figures, wishlist, duplicate quantities, JSON backup and CSV export. No account or cloud sync is required or implied.
- [Budget comparison](https://thedollscout.com/collecting/budget): compare independent boxes with a confirmed figure using your own costs and probabilities.
- [Brand guides](https://thedollscout.com/brands): eight brands, source links, probability and display-fit tools. Official links do not imply an affiliate relationship or verified stock.

The existing [digital tools](https://thedollscout.com/document-tools) remain at their stable URLs and are also discoverable through BPJ. They are separate from collector membership.

## Build and verify

```sh
cd sites/thedollscout
npm ci --prefix scripts/documents --ignore-scripts
npm test --prefix scripts/documents
node scripts/documents/build.mjs
node scripts/gen-collector-pages.mjs
node scripts/collecting/build.mjs
node --test scripts/collecting/tests.mjs scripts/collecting/mcp-tests.mjs scripts/collecting/planning-tests.mjs scripts/collection-sync.test.cjs scripts/collection-tracker-ui.test.cjs scripts/legacy-analytics.test.cjs
node scripts/collecting/verify.mjs
python3 scripts/collecting/persist-tests.py
```

The production workflow also builds the shared workbench, then digital tools, then collecting pages, and installs/verifies fleet GA4 after every generator. See `.github/workflows/deploy-thedollscout.yml` and `CLAUDE.md` for the complete release contract.

Daily expansion uses official-source checks and the existing scheduled release, with at most two new series per day. A check date is not a release date. Failed checks retain verified records. Local checklist data stays in the browser: back it up before switching devices or clearing storage.

TDS is independent of the brands discussed. Existing US/DE Amazon links are labeled. Visits, successful tool actions and merchant clicks are separate from verified commission revenue. Former retired content remains retired.

The six source-researched options are IKEA BLÅLIDEN, BAGGEBO, LUSTIGT and SAMLA, Sonny Angel My Bestie Case, and NIUBEE risers. IKEA links use the stated US/DE shopping context without commission; My Bestie is an official Japan reference with local delivery unverified. Only the verified US NIUBEE model identity, ASIN B07KN5G9CQ, has an exact-model affiliate destination in this follow-up. There is no fabricated German equivalent, live price/stock guarantee or hands-on ranking. Listed exterior dimensions are not usable interior space. Share links contain only bounded public option IDs, never collection records.

Current commercial goal: **USD100 total TDS-attributable revenue per calendar month**, after reversals and before operating costs. See `.agents/product-marketing.md` v8 and repository-root `docs/tds-affiliate-benchmarks-2026-11-07.md`, `tools/affiliate-growth/tds-operations.json` and `data/marketing/tds-daily-plan.json` v6 for country/category actions, owners and stop rules. Shared affiliate tags do not verify site revenue; the total remains unknown and membership checkout remains unavailable. `/api/shopping-growth` uses complete UTC dates from 2026-11-08; comparison/item/placement coverage requires the new release's own verification. Actions are not unique people, orders or earnings. A pending or failed window is not a zero.

The one reviewed `tds-buy-01` TikTok carousel is already approved and submitted. At 2026-11-07 03:26:58 UTC the provider still reports `AWAITING_CONFIRMATION`, despite a published-item detail; independent public visibility remains unverified. Read the same item instead of resubmitting. This release improves its existing landing page and owned discovery paths; it initiates no additional external post, advertising spend or scheduler. Keep the 2026-11-08–21 observation window and 2026-11-22 review; older experiments retain their own dates and unresolved outcomes.
