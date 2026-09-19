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

Calculations run in the browser. Inputs remain local unless the user explicitly saves a record in the separate BPJ member workspace. Storage is opt-in, namespaced per product, limited to 20 versions and can be cleared. Backups and reports are explicit downloads. No claims of end-to-end encryption, live monitoring, automatic translation, financial advice, authenticity verification or fraud detection are made. Cloud backup is an explicit paid operation; local tool execution stays offline. These tools do not initiate transfers. LaunchDesk links to the existing BPJ checkout; it does not duplicate wallet configuration.

## Commercial boundary

The calculators remain free. BPJ sponsored placement and optional prepaid cloud-workspace membership are separate paid services. Membership adds server-side storage and version history across all 24 tools; see `../member-studio/README.md`. LocalStorage is not an authorization/paywall mechanism. Team accounts, source polling, email delivery and automatic recurring debit are not included. Existing guide/affiliate surfaces remain available through each mother site, but a calculator use does not count as affiliate revenue.

All business example rows are fictional and labeled. Do not ingest customer data into tests. Tests verify arithmetic, ambiguity handling, calendar timezones, CSV export safety, SQL behavior and puzzle uniqueness; they are not market validation.

## Distribution

The builder wires the home page, related tools, AGI's two tool hubs, sitemap and llms indexes. It preserves existing entries and is idempotent. The AGI workbench is the complete 24-item directory. This is owned-site discovery, not an outbound campaign. No external messages are sent. Measure actual acquired visits, own-data task completions, and separately verified payments before expanding paid claims.

## Localization and discovery (edition 2026-09-19.2)

`i18n.mjs` is the route/language contract. BPJ uses Chinese at `/workbench` and English at `/en/workbench`; Eco uses German at `/workbench.html`, English under `/en/`, Italian under `/it/`. AGI is EN/ZH, TDS EN/DE. `locales/*.json` contains reviewed static UI, method and report translations. All language pages self-canonicalize and link reciprocally. User data and machine field identifiers are preserved. Do not add a locale without complete product/method coverage and passing tests.

`methods.mjs` explains the actual algorithms. Static worked examples and text mirrors are generated from the same engines, not separate hand-edited result tables. `widgets.mjs` produces standalone, no-network embeds for the 20 form engines; source labels and attribution are optional, and no backlinks or rankings are claimed. `indexnow.mjs` verifies live canonicals and the existing public key before a push-only submission. Acceptance is logged separately from indexing. Run `browser-test.mjs` for all 51 localized tool flows and four sandboxed embed scenarios.

Membership links now enter the current site's own localized member page. `member-entry-build.mjs` creates the three sibling sites' introductions; BPJ keeps the existing portal. The shared `member-copy.mjs` exports the allowlisted local-entry and portal-context route contract. See the member-studio README for payment handoff and data-transfer details.
