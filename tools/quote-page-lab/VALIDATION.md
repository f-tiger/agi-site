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

## Scope not verified

- No production host, checkout, server analytics, cloud storage, account system or actual customer handover.
- The public clipboard-share path is unavailable in the local preview; payload encoding and recipient rendering were tested, but a public deployed URL was not tested.
- Chromium desktop/mobile viewport tests do not establish Safari/iOS compatibility. There is no actual iOS-device test.
- No paid-model generation, third-party builder integration, market demand, retained users, sales or valuation was established.

Run `node tools/quote-page-lab/build.mjs`, then the browser test described in README. Generated previews and screenshots are reproducible and are not committed.
