# Evidence before the merchant click

The air-quality category previously sent readers directly to broad merchant searches, including an unsupported promise about stopping mould. The existing dehumidifier chooser already offered measurement, no-purchase, cause-first, cold-room and laundry-cost outcomes, but its two product candidates exposed different evidence fields. Its unenhanced form could also submit selected answers into the URL when JavaScript was unavailable.

This release replaces the category's two generic shopping cards with the existing dehumidifier and air-purifier decision guides, and improves the two-candidate result inside the six existing German/English guides. It adds no product catalog, calculator, signup requirement or paid service.

## Public comparison and product choice

Two mature German publishers were examined across their category entries, guides, comparison pages, methodology and commercial information. Their public reach figures have different dates and scopes, and their internal conversion rates were not available. Their scale is not a forecast for ECO.

- [home&smart's dehumidifier category](https://www.homeandsmart.de/luftentfeuchter) and [comparison](https://www.homeandsmart.de/wohnungs-luftentfeuchter-test-100331) connect use cases, a shortlist, detailed evidence and clearly identified merchant destinations. The transferable pattern is a short, explainable buying path. A large database or a published ranking alone does not establish suitability or an independent test.
- [CHIP's room-climate category](https://www.chip.de/test-kaufberatung/haushalt-garten/raumklima/) distinguishes advice, comparisons and individual products. Its [hygrometer guide](https://www.chip.de/artikel/hygrometer-test-die-besten-luftfeuchtigkeitsmesser-im-test_140900) links measurement to further decisions. The useful pattern is matching the next step to the reader's readiness, including a reason not to buy.
- [home&smart's methodology](https://www.homeandsmart.de/unser-testverfahren) and [CHIP's dehumidifier comparison](https://www.chip.de/test-kaufberatung/haushalt-garten/luftentfeuchter-im-vergleich-diese-modelle-halten-schimmel-fern_62da5eb5-6f57-4d9b-96a4-bc66a7a5e193.html) show why evidence must be labeled per page and model. A publisher's testing capabilities do not mean every comparison is a hands-on test.

No competitor copy, score, product database or image is reused. The resulting interface compares the evidence available for two already-covered models; it does not name an overall winner.

## Reader experience

The existing decision function and merchant destinations remain authoritative. The two result cards now use the same fields: exact model and generation, evidence at the two stated temperature/humidity conditions, use limits and merchant-link type. Each has its own official references and three checks before leaving: model/variant, electrical and installation requirements, and the seller's actual availability and return terms.

The MeacoDry Arete One 20L source provides 3.4 L/day and 180 W at 10°C/60% RH, and 8.5 L/day and 216 W at 20°C/60% RH. The linked Comfee sources do not establish matching figures at these conditions. Missing data stays unknown; nominal capacities or differently defined power figures are not used to rank efficiency. UK-source specifications do not guarantee the electrical or commercial terms of a German seller.

Official references checked on 2026-11-06:

- [MeacoDry Arete One 20L](https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier)
- [Comfee MDDF-20DEN7](https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7) and [official data sheet, page 2](https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2).
- [Ventilation and humidity guidance](https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426)

The form starts hidden, inert and disabled, with ordinary links to useful guidance available. It is enabled only after its handlers are installed. When JavaScript is disabled or the module fails, there is no native form submission of household choices. The static methodology remains readable in both cases.

## Measurement and discoverability

The existing buyer event contract gains only the fixed `evidence` action, valid after a `compare` or `laundry` result. It carries no product name, numerical measurement or new user identifier. Reopening evidence is deduplicated within the same result type. Existing GA4 result and merchant-click handling remains in place; frontend checks do not prove backend receipt.

The chooser honors stored opt-outs, DNT/GPC and QA exclusions. This changes first-party event coverage and is annotated in the existing observation plan rather than presented as a traffic change. The original observation dates remain intact.

The Markdown extractor selects the explicitly marked static methodology instead of whichever disclosure happens to appear first. It preserves model boundaries, conditions, missing values and exact official sources while excluding forms and merchant links. The existing canonical URLs, localized discovery, sitemap, GA4 coverage and changed-URL IndexNow process remain the release path.

Validation covers both languages, six decision outcomes, exact model-to-merchant mapping, missing data, blocked JavaScript, mobile layouts, source extraction, event privacy and deduplication. Release receipts and measured business outcomes are recorded separately; a successful build or IndexNow response is not evidence of revenue growth.
