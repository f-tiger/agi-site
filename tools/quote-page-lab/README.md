# BPJ Quote Studio / 报价工坊

A portable, original prototype for creating interactive service quotes. Built from the Base44/Tally research in [the decision record](../../docs/base44-build-grow-exit-2026-10-01.md).

This is a free product experiment integrated into BPJ's deployment. It is not an AI generator, invoicing system or payment service. There is no customer or revenue claim.

Production routes: [中文](https://baipiaoji.com/studio/quote-builder) · [English](https://baipiaoji.com/en/studio/quote-builder). The existing BPJ workflow builds these from the same renderer as the portable prototype, tests both and verifies the published edition after deployment.

## Run

Requires Node.js 20+ to build; the generated HTML has no runtime dependencies.

```sh
node tools/quote-page-lab/build.mjs
```

Open `tools/quote-page-lab/dist/quote-studio-zh.html` or `quote-studio-en.html` in a browser. Edit the rates and scope, confirm the sample data has been replaced, then download `client-quote.html`. That file works independently offline; the recipient can adjust quantities, export a text scope summary, and make a new tool from the template.

The public-link button is unavailable on file/localhost previews. Hosting at a public HTTP(S) URL enables configuration-in-fragment links. Everyone holding a link can read or modify the configuration. Old links cannot be revoked or synchronized: send a new link after editing. Do not include private client details.

## Test

```sh
# Use an available Playwright installation with a Chromium browser.
node tools/quote-page-lab/test.mjs
# Or select an already-installed Chromium executable:
QUOTE_STUDIO_CHROMIUM=/path/to/chromium node tools/quote-page-lab/test.mjs
# After the BPJ site build:
node tools/quote-page-lab/verify.mjs --dist
node tools/quote-page-lab/test-hosted.mjs
# After production deployment:
node tools/quote-page-lab/verify.mjs --live
node tools/quote-page-lab/test-hosted.mjs --live
```

The test builds no hidden network dependency. Run `build.mjs` before the browser test. Playwright is a development-only test tool; install it and its Chromium if not already present. Browser outputs are ignored in git.

## Limits

- 1–6 configurable services, two-decimal CNY/USD/EUR, integer quantities from 0 to 1000. Currency changes never convert rates.
- Base fee and initial payment share are creator inputs. Tax and unlisted costs are excluded. A scope summary is not an order, contract, payment receipt or verified seller offer.
- Explicit local save only, optional JSON backup, no cloud accounts, checkout or automatic client submissions.
- The official hosted builder sends fixed anonymous `quote` action labels to BPJ's existing first-party `/api/hit`. No quote content, rates, fragments, referrers, cookies or user IDs are sent. DNT/GPC, automated browsers and `__ci` checks are excluded. Portable exports and other hosts have measurement disabled. Actions are counted once per document, not per unique person; copied links and generated files are not proof of real client handover, recurrence, payment or virality. The recipient's manual summary-copy fallback is not recorded as a successful copy.
- Creator content is untrusted text; no arbitrary code, embeds, URLs, remote assets or HTML are accepted. Sharing is manual. Exported tools include a creator entry but this is not evidence of viral growth.
- Production uses an isolated page without BPJ's general analytics, account or sharing scripts. Canonical/hreflang, static instructions, home/studio/search entries, site-journeys, sitemap and llms.txt make the builder discoverable. Client views are marked noindex; downloaded customer files remove host SEO metadata and measurement configuration.
- No third-party builder code is bundled. Reviewed open-source licenses and dependency caveats are recorded in the research document.

## Files

`core.mjs` validates configuration and computes integer-money totals. `app.js` provides the bilingual editor and customer view. `style.css` follows BPJ's paper/ink workspace. `render.mjs` is the shared production/portable renderer. `test.mjs` covers calculation and actual browser export flows; `test-hosted.mjs` covers clipboard handover, mobile actions and measurement privacy. `verify.mjs` checks discovery and production identity.
