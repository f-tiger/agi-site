# Country categories and affiliate growth experiment — 2026-10-01

## Scope and buyer value

Three localized country hubs, nine category sections and three distinct guides:

| Market | Hub | Focused guide | Commercial readiness |
|---|---|---|---|
| Germany | `/wohnen.html` | `/guide/luftfeuchtigkeit-richtig-messen.html` | Existing verified DE affiliate tag; actual orders/commissions require merchant reports |
| Netherlands | `/nl/wonen.html` | `/nl/ventilatie-of-luchtontvochtiger.html` | Ordinary Amazon.nl links; local affiliate enrollment/tag unverified |
| Australia | `/au/home-comfort.html` | `/au/portable-air-conditioner-window-kit.html` | Ordinary Amazon.com.au links; local affiliate enrollment/tag unverified |

Intended readers have a specific home problem and want to avoid buying the wrong device or accessory. Free value: choose a problem, understand the constraints, print a purchasing checklist, and compare local product listings. There is no paid ECO product or new checkout in this release. A merchant purchase is separate from an ECO visit, a merchant click and an earned commission.

The German section links existing humidity, laundry and heating content. The Dutch guide distinguishes ventilation from water removal. The Australian guide addresses window geometry, flyscreens, exhaust fittings and local climate. No PV/storage topics are introduced. No product test, ranking, current price, stock or fit guarantee is invented.

## Evidence and counterarguments

Public Google Trends data are in `data/country-category-trends-20261001.json`. Five-year monthly means are normalized *within each country's query basket*. They are not search volumes, cannot be compared between countries, and do not establish buying intent. NL dehumidifier and tumble-dryer queries peak in November; AU portable-air-conditioner and evaporative-cooler queries peak in December in this sample. The October 1 DE request returned HTTP 429; it is recorded as unavailable, not zero. Existing September DE evidence remains dated as such.

October 1 SERP checks: German humidity measurement competes with ADAC, manufacturers and specialist publishers. Dutch ventilation advice competes with Milieu Centraal and Consumentenbond. Australian window-kit results include manufacturers and local retailers. These are bounded tests of specific buyer tasks, not declarations that a country or keyword is easy to rank for. A dry-climate cooling pattern cannot be applied to all Australian homes. High Dutch dryer search interest does not prove demand for a heated drying rack.

Cannibalization: the German measurement log complements `luftfeuchtigkeit-senken`, which covers remediation. No additional German best-device ranking is created. The placement/measurement part of the earlier unbuilt calibration topic is delivered here. The public experiment identifies that older candidate as superseded, and the queue check warns against duplicating it. Historical queue records are left untouched; unsupported salt-test claims are omitted. NL/AU have distinct local guides; they are not false hreflang translations of the German guide. Only the equivalent country hubs are in a hreflang group.

Primary editorial sources, checked October 1:

- [Umweltbundesamt: humidity and ventilation](https://www.umweltbundesamt.de/en/node/3086)
- [Stadler Form: measurement placement](https://www.stadlerform.com/de-de/raumklima/optimale-luftfeuchtigkeit/luftfeuchtigkeit-messen)
- [Milieu Centraal: natural ventilation](https://www.milieucentraal.nl/energie-besparen/ventilatie/natuurlijke-ventilatie/)
- [Milieu Centraal: ventilation tips](https://www.milieucentraal.nl/energie-besparen/ventilatie/tips-voor-beter-en-energiezuiniger-ventileren/)
- [Consumentenbond: dehumidifier buying criteria](https://www.consumentenbond.nl/luchtontvochtiger/kopen)
- [Australian Government: heating and cooling](https://www.energy.gov.au/households/heating-and-cooling)
- [Australian Government: tropical living](https://www.energy.gov.au/households/household-guides/energy-saving-guide-northern-australia/tropical-and-sub-tropical-living)
- [Australian Government: hot arid living](https://www.energy.gov.au/households/household-guides/energy-saving-guide-northern-australia/hot-arid-living)
- [Goldair AU: example of a soft kit category](https://goldair.com.au/products/goldair-portable-air-con-soft-window-kit) — not a compatibility guarantee or verified Amazon listing.
- [Amazon OneLink help](https://affiliate-program.amazon.com/help/node/topic/G62UTXAN2H3MRGJL) — NL/AU need their local account arrangements; no foreign tag is copied into these stores.

## Distribution delivered in this change

Owned channels: category entry blocks on the DE/EN homepages and five relevant existing category/guide pages. Each hub has one problem-selection control, visible static category links, related guides and ordinary/affiliate merchant disclosures appropriate to its market. Search, sitemap, hreflang, llms.txt and guide Markdown discovery include the new locales. Deployment uses the existing indexing workflow. DE/EN homepage legacy third-party signup forms are replaced with links to the existing consent-based Heat Radar forms, removing their embedded access key from these two pages. No external post, email campaign, ad spend, new affiliate account or video is implied by this record.

Public sharing angles for later authorized distribution: DE “Where should the humidity meter stand before buying a dehumidifier?”; NL “Ventilation or dehumidification when drying laundry indoors?”; AU “Will a portable AC kit fit your window and flyscreen?” Each angle has a concrete checklist landing page, not a generic homepage. These are editorial angles, not published posts.

## Measurement and decisions

Registered public definition: `data/growth-experiments.json`, bet `eco-country-category-1031`, review October 31. Count each market separately:

1. Human `page_view` events on the six pages (events, not unique people).
2. `outbound_choice`, source `country_categories`, action `need_selected` or `need_result`.
3. `affiliate_click` for verified DE links; `outbound_choice` + action `merchant` for untagged NL/AU.
4. Merchant-reported clicks, ordered items, shipped items and net commissions as separate evidence. Site event counts must not be substituted for merchant clicks in EPC calculations.

QA requests, automation, DNT and GPC are excluded by the new client. Checkbox answers never leave the page. No user ID, form response or measurement value is collected. The existing event endpoint and event vocabulary are reused; no new recurring database query is added.

At least 100 qualified visits per market before judging the content. With that reach, 10 guide-result clicks and 5 merchant clicks are modest continuation signals, not causal proof. Without reach, improve distribution; do not call the topic a failure. With reach but no next-step action, revise audience/entry promise once. NL/AU revenue scaling remains blocked until local enrollment and tracking IDs are verified. Do not create or copy account IDs automatically.

Validation: source-generated pages, every local link/fragment, existing static-file canonical routes, merchant hosts/tags, cross-language discovery, existing purchase regressions and browser checks on Chromium/WebKit at 320/390/1280 px. Browser fixtures block all external and production telemetry requests. Deployment/live results are recorded in the PR/Actions, not fabricated here.
