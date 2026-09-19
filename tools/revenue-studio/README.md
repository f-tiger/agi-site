# Practical tool workbench

Implements the original 8-direction, 24-product portfolio as usable first editions on four existing sites. `catalog.mjs` is the URL, form and example source of truth. `core.mjs` contains deterministic browser engines. The three SQL projects run in a terminated-on-timeout Web Worker against fictional SQLite fixtures. Puzzles are original 4×4 grids with unique solutions, generated and checked locally.

## Build and verify

```
npm ci --prefix tools/revenue-studio --ignore-scripts
node --test tools/revenue-studio/test.mjs
node tools/revenue-studio/build.mjs --site agi --out /tmp/agi-workbench
node tools/revenue-studio/verify.mjs --site agi --out /tmp/agi-workbench
```

Site keys: `bpj`, `agi`, `eco`, `tds`. Existing Cloudflare workflows call the builder after their normal builds and check every new route after deployment. No new cloud account, domain, paid dependency or credential is needed. sql.js 1.13.0 is pinned and vendored at build time, including its WASM runtime; visitors do not depend on a third-party CDN.

Inputs remain in the browser. Storage is opt-in, namespaced per product, limited to 20 versions and can be cleared. Backups and reports are explicit downloads. No claims of encryption, cloud synchronization, live monitoring, automatic translation, financial advice, authenticity verification or fraud detection are made. These tools do not initiate transfers. LaunchDesk links to the existing BPJ checkout; it does not duplicate wallet configuration.

## Commercial boundary

Only the existing BPJ sponsored placement is sold. The other 23 first editions are free. Proposed premium prices in the research are hypotheses, not offers. LocalStorage is not an authorization/paywall mechanism. Team accounts, source polling, email delivery, subscription billing and premium fulfillment remain separate unbuilt work. Existing guide/affiliate surfaces remain available through each mother site, but a calculator use does not count as affiliate revenue.

All business example rows are fictional and labeled. Do not ingest customer data into tests. Tests verify arithmetic, ambiguity handling, calendar timezones, CSV export safety, SQL behavior and puzzle uniqueness; they are not market validation.

## Distribution

The builder wires the home page, related tools, AGI's two tool hubs, sitemap and llms indexes. It preserves existing entries and is idempotent. The AGI workbench is the complete 24-item directory. This is owned-site discovery, not an outbound campaign. No external messages are sent. Measure actual acquired visits, own-data task completions, and separately verified payments before expanding paid claims.
