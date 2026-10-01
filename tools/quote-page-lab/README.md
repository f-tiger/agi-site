# BPJ Quote Studio / 报价工坊

A portable, original prototype for creating interactive service quotes. Built from the Base44/Tally research in [the decision record](../../docs/base44-build-grow-exit-2026-10-01.md).

This is a product experiment, not a deployed SaaS, AI generator, invoicing system or payment service. There is no customer or revenue claim.

## Run

Requires Node.js 20+ to build; the generated HTML has no runtime dependencies.

```sh
node tools/quote-page-lab/build.mjs
```

Open `tools/quote-page-lab/dist/quote-studio-zh.html` or `quote-studio-en.html` in a browser. Edit the rates and scope, confirm the sample data has been replaced, then download `client-quote.html`. That file works independently offline; the recipient can adjust quantities, export a text scope summary, and make a new tool from the template.

The public-link button is deliberately unavailable on file/localhost previews. Hosting the builder at a public HTTP(S) URL enables configuration-in-fragment links. They are not private storage: everyone holding the link can read the configuration. No public host is provisioned by this experiment.

## Test

```sh
# Use an available Playwright installation with a Chromium browser.
node tools/quote-page-lab/test.mjs
# Or select an already-installed Chromium executable:
QUOTE_STUDIO_CHROMIUM=/path/to/chromium node tools/quote-page-lab/test.mjs
```

The test builds no hidden network dependency. Run `build.mjs` before the browser test. Playwright is a development-only test tool; install it and its Chromium if not already present. Browser outputs are ignored in git.

## Limits

- 1–6 configurable services, two-decimal CNY/USD/EUR, integer quantities from 0 to 1000. Currency changes never convert rates.
- Base fee and initial payment share are creator inputs. Tax and unlisted costs are excluded. A scope summary is not an order, contract, payment receipt or verified seller offer.
- Explicit local save only, optional JSON backup, no cloud accounts, telemetry, checkout or outbound submissions.
- Creator content is untrusted text; no arbitrary code, embeds, URLs, remote assets or HTML are accepted. Sharing is manual. Exported tools include a creator entry but this is not evidence of viral growth.
- Public production integration remains separate: isolated handling of untrusted quote configurations, analytics consent and definitions, customer rights and payment acceptance must be addressed for the features actually offered.
- No third-party builder code is bundled. Reviewed open-source licenses and dependency caveats are recorded in the research document.

## Files

`core.mjs` validates configuration and computes integer-money totals. `app.js` provides the bilingual editor and customer view. `style.css` follows BPJ's paper/ink workspace. `build.mjs` produces portable HTML. `test.mjs` covers calculation and actual browser export flows.
