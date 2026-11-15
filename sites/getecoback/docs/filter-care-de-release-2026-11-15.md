# German exact-model filter lookup and local care notes

Buyer: a German reader who already owns a Levoit Core 300S or Beurer LR 401 and needs the documented replacement filter. `/ersatzfilter.html` connects those existing catalog models to official German consumable evidence and a local record of the last check, cleaning or replacement. It is free without an account. The optional commercial exit is the existing Amazon.de affiliate search, not a checkout or a verified individual offer.

## Implemented

- The two corresponding `/produkte.html` cards link directly to the selected device. The air-purifier guide and tools hub provide additional owned-site discovery.
- The source directory remains readable without JavaScript. Selection uses exact approved model IDs, preserving suffixes and the DE market. Unknown models do not imply incompatibility.
- The selected manufacturer filter variant, source, check date and limitations appear before an optional merchant search. The DE search uses `getecoback-21`; no ASIN, current price, availability or original-seller guarantee is invented.
- Optional bookmarks and one editable last-care record per model stay in `ecoback.filter-care.de.v1` localStorage. Users can delete the note separately or remove the device and note together. Future/impossible dates and unexpected action names are rejected. Storage failure is visible and explicitly limits changes to the open tab.
- Care dates do not calculate replacement deadlines, send reminders or establish that a purchase is needed. The UI distinguishes device instructions, cleaning and replacement.
- Search, Markdown, llms.txt/full and the existing MCP corpus include the page. The source policy adds only the two exact manufacturer URLs. Public GA4 and the shared free-account entry follow existing site rules; local notes are not account-synchronized.

## Source review on 2026-11-15

`data/filter-finder-de.json` and `tools/filter_finder_de_sources.py` own the reviewed contract. Current full responses were read and the actual release fetcher returned `verified` for both records during local verification.

- [Levoit German source](https://levoit.de/products/levoit-core-300-und-core-300s-ersatzfilter-hepa-filter): product 9294220624194, standard-filter variant 48314199277890, bound to its exact manufacturer SKU. Compatibility comes from the product description. Only Core 300S without an additional suffix enters this first directory; the source's `(Pro)` phrasing does not create new model aliases. Internal SKU is not presented as a consumer part number.
- [Beurer German source](https://www.beurer.com/de/p/69309/): consumer article 69309, Product JSON-LD identity and description agree with the visible H1 and description. The description explicitly names LR 400 and LR 401; this release only maps the existing LR 401 catalog model. LR 405 in the product title alone is insufficient for an additional relationship.

Each release rechecks only these fixed sources with request/total deadlines, no redirects, bounded compressed and decoded bodies, exact identity and a normalized description fingerprint. Price or stock changes are not inputs. Changed compatibility/identity requires review; failures preserve last-good facts but disable commerce. Browser rules also disable searches after 30 days or for future/invalid dates. Content revision dates do not advance on routine checks. The versioned catalog is not a continuous outage ledger.

This implementation learns from Grocy's record/edit/delete task behavior while reusing ECO's own matching, freshness and measurement logic. No Grocy, Akeneo or PriceBuddy code or runtime was vendored.

## Verification

- `python tools/test_filter_care_sources.py`: 9 tests including wrong source/market, navigation-only claims, changed variants/descriptions, missing visible evidence, malformed responses and network failure.
- `node --test tools/test_filter_care.mjs tools/test_filter_finder.mjs`: exact identity, DE merchant, age/invalid dates, local state validation, fixed events, and existing US regressions.
- `node tools/browser_filter_care.mjs`: locally intercepted mobile catalog handoff, correct DE exit or explicit withdrawal, care save/edit/reload/delete, unknown suffix, blocked storage, unavailable/conflicting sources, no-JS evidence, generated discovery and commerce-free source parity.
- Existing product catalog/comparison, agent-source, llms-full, analytics business/integrity tests and generated GA4 coverage were exercised locally. The PR and deployment workflows include the new source, unit and final-browser gates; deployment also calls the new GET-only live verifier.

Browser fixtures intercept all requests. They do not submit customer events or contact merchants. GA4 page markup and local event acceptance do not establish backend receipt from genuine traffic.

## Distribution and measurement

The implemented distribution is on owned pages: exact catalog cards, the relevant guide, the tools hub and search. The repository's latest publication receipts already show the catalog and thermostat creatives published within the same seven-day window; this release does not add social volume, a scheduler, spend or messages. No new publication receipt is claimed.

Existing `tool_start` / `tool_complete` and affiliate events remain available. New fixed GA4 actions are `eco_filter_save`, `eco_filter_care_save` and `eco_filter_source`, restricted to `/ersatzfilter.html`; save events require a successful persistent write. No model text, search terms, dates or notes are attached. Review real usage over complete UTC windows, keeping merchant searches, product deep links, orders and settled commission distinct. Maintenance reuse requires a longer observation window; this release is not evidence of increased revenue.

Scope: two supported devices, not completion of the broader category expansion. Bosch and Stadler remain outside this directory until their specific source contracts are reviewed. A future category should add its own accurate evidence rather than infer compatibility from a brand or similar name.
