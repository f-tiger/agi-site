# The Doll Scout — collectible guides and free collection tools

TDS helps collectors find a series, keep a private collection checklist, understand blind-box probabilities and plan a purchase or display. English is the default, with German and Chinese guides.

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
