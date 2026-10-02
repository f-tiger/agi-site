# Existing buying paths: correction and verification

This release serves German home-comfort readers deciding whether to measure, compare running costs or buy a suitable appliance. The tools remain free and require no account. The monetization path remains the existing Amazon affiliate program; no new paid offer, merchant enrollment or revenue claim is introduced.

Three brief refinements kept the work on existing paths: verify acquisition and task use; challenge the assumption that missing revenue means a broken calculator; correct demonstrable intent and evidence mismatches before broadening features. Two self-checks challenged purchase pressure and the risk of treating isolated tests as customer adoption.

## Corrections

- The existing household entry was classified as an unrelated tool band and moved to the footer. It now precedes the autumn product shelf in autumn/winter, with direct links to moisture measurement, laundry costs and heating costs. Summer retains cooling as its first tool. No new URL or duplicate guide is created.
- The rising-query rail converted rental, test-report and unsupported solar-heater searches into Amazon shopping links. Rental and unserved intent are now omitted; supported questions reach existing guides or the battery-runtime calculator. Infrared test queries no longer imply a dehumidifier winner. Ordinary product searches remain labeled as searches. External query text is HTML-escaped.
- The PortaSplit alternatives guide and its generated product cards repeated dated stock, replenishment and hands-on wording. They now distinguish manufacturer specifications, user fit and merchant-confirmed stock. Readers compare installation, exact variant, cooling capacity and electrical consumption before following the existing tagged search links. Source, Article modification date, internal tool links and Markdown mirror are aligned.

Primary sources checked 2026-10-02:

- [Midea PortaSplit product information](https://www.midea.com/de/klimatisieren-heizen/portasplit/produktinfos.portasplit) and [installation](https://www.midea.com/de/klimatisieren-heizen/portasplit/installation).
- [Fischer CB-3500 catalogue record](https://shop.kaeltefischer.de/dk/katalog/mobil-kompakt-klimaanlg-221142?va=221319), manufacturer/distributor's Danish-language record, establishing the exact model and 3.5 kW specification; the linked German-language equivalent may be slow to respond. It is not an inventory confirmation.
- [REMKO RKL DC](https://www.remko.de/gewerblich/klimasysteme/lokal/rkl-dc/), the RKL 495 DC specification and installation constraints.

## Validation and limits

Existing browser suites passed 28 moisture-choice checks, 30 laundry comparison/export checks and 66 electricity-workbench checks across five languages. Those isolated checks do not prove customers completed tasks. The country-category Chromium cases completed before the optional WebKit executable was found unavailable; no WebKit pass is claimed.

New regression cases cover seasonal ordering/idempotence and rental/review/question routing. Desktop and mobile release checks cover direct tool destinations, absence of unsupported stock claims and a single tagged affiliate event per merchant click. All external requests are intercepted; no test telemetry or order is sent to production.

The existing deployment pipeline rebuilds discovery surfaces, validates structured-data consistency and submits only eligible changed canonical URLs to IndexNow. A receipt does not establish indexing or incremental traffic. This release does not add a recurring job or send outreach messages.

## Operating decision

Use production, non-QA task events on the exposed tools to distinguish entry failure from useful decisions. Review the paths after 100 qualified production visits to the touched pages, or report reach as insufficient at 28 days; these are operating gates, not statistical significance. Continue when actual edited-input calculations or meaningful decision results and appropriate merchant clicks appear. If visits occur without task use, inspect the entry and form friction before adding pages.

Merchant-confirmed commissions, reversals and matching date/store/tag scope remain the revenue evidence. Shared tags cannot establish site-specific income; clicks, tool results and test downloads do not establish orders. Private analytics and merchant reports stay outside this repository.
