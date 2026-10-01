# Validation — 2026-10-01

Technical verification only. There were no external users, real quotes, orders or payments in this test run. The studio name and prices used in browser fixtures are fictional.

## Passed

- Node.js v24.19.0 builds both self-contained HTML files; JavaScript syntax check passes.
- Integer-money parsing and rounding, totals, deposits, invalid inputs, schema bounds and Unicode configuration round trips.
- Headless Chromium 153 via Playwright: edit Chinese template, confirm, export a standalone customer HTML, open the actual exported file, change quantities and download the actual text summary.
- Example assertion: three items at 199.99 plus one at 30.00 total 629.97; customer changing the first quantity to two produces 429.98. Fifty percent of one minor currency unit rounds to one, with zero remaining balance.
- Invalid and negative quantities suppress the displayed total and disable summary export; more than two price decimals suppress the preview and disable customer-file export.
- Invalid imported JSON is rejected; corrupted share fragments display an error; malicious HTML/script-like text is rendered as text.
- Same-document fragment navigation loads the new quote. Customer quantities survive a UI language switch. Creator-entered content is preserved rather than translated or repriced.
- Local draft save, independent English initial UI, 1360px desktop and 390px mobile with no horizontal overflow. Screenshots inspected for text rendering and layout; CJK font support supplied to the test browser.
- No browser page errors in the final end-to-end run.

## Deliberate faults detected

Isolated temporary copies were mutated; production source was not changed:

1. Money parser returned one cent too much → assertion failed.
2. Quantity range check was removed → assertion failed.
3. HTML escaping returned raw input → browser assertion failed.

An earlier browser pass caught the lack of fragment-change handling. The implementation now handles it, and the final browser run passed.

## Production integration — 2026-10-01

- Three prompt refinements: finish the creator/client loop; integrate both languages into existing BPJ discovery and deployment; require real browser and published-route acceptance rather than treating a merged prototype as launched.
- Two adversarial self-checks (not independent reviewers): (1) sample prices, stale/non-revocable links and client misunderstanding; (2) untrusted text, fragment privacy, exported analytics isolation and QA inflation. The release adds explicit sample confirmation, link limitations, fixed anonymous action labels, customer noindex and isolated portable exports.
- Hosted-origin browser fixture: real clipboard copy of the generated link, open customer page, choose quantities, copy summary, export customer HTML, remix, mobile jump controls and preservation of creator defaults. Chinese and English both pass; no page errors. The fixture intercepts all network, so these are technical tests, not real client deliveries.
- Verify zero quote content in event bodies, fixed server event paths, CI and DNT suppression, no third-party scripts, and no analytics configuration or host SEO in downloaded files. Event counts are neither unique users nor demand validation.
- BPJ push-path local gates pass: core business/account/measurement checks, actual workerd+D1 account tests, 840 tokenizer assertions, build/discovery/canonical checks, site-wide HTML gates, member/revenue isolation and all ten existing browser suites.
- Full site HTML verification covers 2,353 pages with zero broken links, invalid structured data, language leaks, placeholders, empty content or hreflang failures. An initial static-link gate caught interpolated URL literals inside the inline script; navigation now uses a computed home URL and the full gate passes without weakening the checker.
- New quote tests run in the existing deployment workflow before release. `verify.mjs --live` runs after Pages deploy to verify the published edition, both languages and discovery routes. Live browser QA uses `__ci=1`, with no event writes.

## Scope not verified

- No actual customer handover, retention, real user count, revenue, checkout or cloud quote storage. Production rollout status is evidenced by the associated GitHub Actions run; pre-deploy local results alone do not prove the live deployment.
- Chromium desktop/mobile viewport tests do not establish Safari/iOS compatibility. There is no actual iOS-device test.
- No paid-model generation, third-party builder integration, market demand, retained users, sales or valuation was established.

## Growth release — 2026-10-01.3

- Localized video-quote pages pass canonical, sitemap/search/discovery/llms and 1200×630 social-image checks. Chinese and English images and mobile page screenshots were visually inspected. Existing layout lacked image metadata; the new pages explicitly supply it.
- Actual Chromium at 390px and 1360px verifies no landing-page horizontal overflow, an immediately visible demo CTA, and navigation from the intent page into the customer example. The example changes three edits to five and the displayed total from $390 to $630; returning preserves the creator's default three.
- Builder clipboard and exported HTML checks pass in both languages. Clean recommendation links contain only the public builder URL and allowlisted source, with no quote fragment or synthetic brand. Downloaded customer files omit hosted social metadata and measurement configuration.
- Actual SQLite + handler tests reject arbitrary event paths, preserve legacy events, exclude CI/old dates, distinguish missing reads from zero, and verify use of the existing partial event index. The daily reach-export self-test verifies both signal passthrough and missing-data semantics.
- Local BPJ core gates, workerd+D1 account suites, canonical/discovery/build gates, member/revenue checks, all ten existing BPJ browser suites and portable/hosted quote browser suites pass. Site-wide HTML verification covers 2,355 pages with zero broken links, invalid structured data, language leaks, placeholders, empty content or hreflang failures.
- These fixtures are technical tests, not campaign reach, actual client usage or retention. Published edition and deployment/index submission evidence belong to the associated PR/run; a merge alone does not establish launch or indexing.

Run `node tools/quote-page-lab/build.mjs`, then the browser test described in README. Generated previews and screenshots are reproducible and are not committed.

## Growth round 2 — 2026-10-01.4

- Direct-demo visits emit a public entry independently of entering the editor; SQLite tests cover the new source totals, unchanged legacy counts, null on failure and indexed execution. Native-share requests are not deliveries.
- All 20 video-tool records in both locales and the video category expose a contextual quote link. Tests reject this CTA on non-video tool pages. A generated Google Flow link opens the correct localized demo with an allowlisted source.
- Browser verification covers mobile-visible start, focus into the creator form, preserved defaults, fixed recommendation payloads, native-share canceled/blocked/resolved stubs, clipboard failure with selectable fallback and no false copy event. No external app receives a test message. Actual iOS/Android OS share delivery remains unverified.
- Existing BPJ core/workerd, dist/member/revenue and ten browser suites pass. The final GA4 coverage installer/checker passes and explicitly excludes both quote routes; no global tracking is introduced into quote content.
- Live edition and deployment status are recorded in the release PR. No visitors, delivered messages, qualified creators, retention or revenue are inferred from technical QA.
