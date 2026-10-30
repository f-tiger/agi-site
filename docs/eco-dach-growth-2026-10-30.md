# German cellar buying guidance — 2026-10-30

## Public content changes

- Rewrite the existing `/guide/luftentfeuchter-keller.html` article around moisture causes, operating temperature, comparable specifications, drainage and illustrative operating costs. An appliance does not repair a leak or waterproof a building.
- Retain the established buyer tool and fixed analytics; structural moisture damage must continue to lead to a cause-check outcome without a shopping recommendation.
- Add an early task selector to `/guide/luftentfeuchter-ratgeber.html`, linking cold cellars, laundry, running costs and existing-appliance diagnosis.
- Improve `/wohnen.html` with seasonal task links and local Austrian/Swiss sources. German merchant links do not imply delivery or matching model variants in other countries.
- Preserve existing canonical URLs and actual-language hreflang groups. No duplicate regional pages, merchant accounts or new payment flows.

## Public sources checked on 2026-10-30

- https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426 — ventilation and moisture.
- https://www.test.de/Luftentfeuchter-Was-sie-leisten-und-was-nicht-5780477-0/ — technology and operating conditions; no copied model ranking.
- https://www.topten.ch/de/products/dehumidifiers — Swiss-market performance fields at different temperatures.
- https://www.energie-noe.at/richtig-lueften — Austrian ventilation guidance.

No own device testing is claimed. Cost figures are explicitly hypothetical arithmetic, not current tariffs or measured product consumption.

## Build and verification

`build_country_categories.py` supports a source-owned editorial modification date for a changed hub, leaving unchanged guides and countries at their own dates. It renders optional regional guidance from `country-categories.json`. Existing pipeline generators rebuild the sitemap, search index, AI-readable mirrors and analytics coverage.

`browser_dach_growth.mjs` serves local files and blocks external traffic. It checks three affected routes at 320, 390 and 1280 pixels, both with and without JavaScript; verifies canonical URLs, authored sections after generators, table readability and the existing damage/no-purchase outcome. Run after all generators with Playwright installed in `tools/revenue-studio`.

Existing gates check visible FAQ/JSON-LD parity, breadcrumbs, metadata, internal paths, regional merchant routing, affiliate disclosure and analytics coverage. Production verification must distinguish deployed content, IndexNow receipt and actual search indexing; deployment itself establishes no traffic or revenue gain.
