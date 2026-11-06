# ECO: sourced household decisions and readable evidence

Date: 2026-11-06. This note describes the research and implementation scope. It is not a claim that the changes have been deployed, indexed, cited by AI assistants or shown to increase traffic or sales.

## What the public comparison showed

Five German-language content sites were examined. Their public disclosures or retailer links establish an affiliate business model; their traffic, conversion, revenue and backlink performance were not verified.

- [home&smart’s dehumidifier comparison](https://www.homeandsmart.de/wohnungs-luftentfeuchter-test-100331) combines use cases, a comparison table, product filtering and an explanation of its testing. The useful pattern is a clear route from a household question to a suitable option. Conflicting specifications within a page show why product tables still need source and consistency checks.
- [Entfeuchter-Test’s methodology](https://entfeuchter-test.de/ueber-uns/) separates claimed hands-on measurements from manufacturer research and explains measurement conditions. Its [comparison](https://entfeuchter-test.de/luftentfeuchter-test/) also shows disadvantages and limits. Those test claims were not independently verified; ECO does not reuse its measurements or scores.
- [Test&Tipps’ heated-blanket cost guide](https://testundtipps.de/wohnen-haushalt/haushaltsgeraete/heizdecke/heizdecke-stromverbrauch) labels its work as desk research, exposes calculation assumptions and links model instructions. The useful pattern is a calculation with its evidence and limits alongside it.
- [Testportal.ch](https://testportal.ch/) discloses affiliate funding. Its [dehumidifier guide](https://testportal.ch/luftentfeuchter-test/) emphasizes Swiss products and CHF prices, but its method relies on published specifications and reviews. A local currency or a “test” title alone does not establish local suitability or physical testing.
- [Schadensbörse’s dehumidifier guide](https://www.schadensboerse.at/luftentfeuchter) is an Austrian-facing, mixed service/content example with advertised retailer links. Its question-first layout includes ventilation and investigating moisture before purchase. Its generalized capacity and running-time assumptions were not adopted.

Visible newsletters, related-content links and cooperation entries show available distribution mechanisms, not proven growth channels. Consumer organizations and manufacturer documentation were treated as evidence sources, not as comparable affiliate publishers.

## Three practices applied

**Explain the decision before recommending a purchase.** Three existing German guides were revised: [heating with an air conditioner](https://getecoback.com/guide/klimaanlage-mit-heizfunktion.html), [dehumidifier continuous-running costs](https://getecoback.com/guide/luftentfeuchter-dauerbetrieb-stromkosten.html) and [storing a portable air conditioner](https://getecoback.com/guide/mobile-klimaanlage-ueberwintern.html). They distinguish existing equipment from a new purchase, identify situations requiring further investigation and link existing tools and guidance. No additional comparison directory or duplicate calculator is required.

**Separate examples, specifications and measurements.** The heating guide distinguishes heat pumps from resistance heaters, COP scenarios from seasonal SCOP and energy cost from total ownership cost. The humidity guide labels constant-power costs as arithmetic examples and explains why actual kWh need measurement. The storage guide follows the exact model’s instructions instead of prescribing one drying or waiting time for every device. Each page states that ECO did not conduct its own product test.

**Keep the same evidence accessible to readers and assistants.** Visible answers and FAQ structured data are aligned. The bulk AI text uses the per-page Markdown converter, which removes injected shopping interfaces while retaining editorial explanations and permitted source links. A main-content fallback prevents suitable pages without an article element from losing their body text. Dedicated language/tool mirrors are checked against their current HTML instead of being trusted solely because a file exists. Source-policy coverage is part of the release checks.

The recommendation generator has precise guards for the heating-suitability and storage pages so generic product modules do not override their technical or maintenance task. Contextual, disclosed retailer links elsewhere remain distinct from evidence. Machine-readable views do not contain affiliate destinations.

## Primary evidence used

- [European Commission: air conditioners and comfort fans](https://energy-efficient-products.ec.europa.eu/product-list/air-conditioners-and-comfort-fans_en): heating characteristics and seasonal energy-label context.
- [Verbraucherzentrale: installing an air conditioner](https://www.verbraucherzentrale.de/wissen/energie/energetische-sanierung/klimaanlage-installieren-was-ist-zu-beachten-10525): equipment types and installation requirements.
- [Verbraucherzentrale: heating and ventilation](https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426): room humidity, temperature and cold surfaces.
- [Umweltbundesamt: mould in the home](https://www.umweltbundesamt.de/service/uba-fragen/was-tun-bei-schimmel-in-meiner-wohnung): identifying and addressing the moisture source.
- [Comfee MDDF-20DEN7 manual](https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/dehumidifier-mddf-20den7/DF-Owners-Manual.pdf): model-specific operating and drainage instructions.
- [Comfee MPPH-09CRN7 manual](https://www.feelcomfee.com/content/dam/comfee-aem/global/products/heating-cooling/mobile-air-conditioner-mpph-09crn7/PH-Owners-Manual.pdf): the particular storage example, including the stated fan-mode duration. It does not establish a rule for other models.
- [Midea PortaSplit product information](https://www.midea.com/de/klimatisieren-heizen/portasplit/produktinfos.portasplit): an example of a specified operating-temperature limit, not proof of a particular heating output or cost at that temperature.

## Verification and limits

Targeted checks cover the cost arithmetic, visible/schema FAQ agreement, source links, existing internal destinations, precise recommendation exclusions and Markdown extraction. Publication still requires the complete release and live checks. No new paid service, paid promotion, mailing campaign or external outreach is claimed here. Existing observation plans remain separate; these corrections do not create a causal growth experiment.

## Original distribution material

The existing Creator Kit now offers a reproducible German dryer-label example: 125 kWh per 100 cycles becomes 1.25 kWh per label cycle, costing approximately €0.44 at an illustrative €0.35/kWh, or €0.50 at €0.40/kWh. Label conditions can differ from an actual laundry load; the example does not establish equivalent drying or a winning product. Three original JPEG cards capture the real calculator interface and carry advertising, example and affiliate disclosures. They are available under `/assets/marketing/de-label100-20261106/` as `01-unit.jpg`, `02-cost.jpg` and `03-try.jpg`. These public assets contain no customer inputs or private data.

Fixed `/waesche-tiktok` and `/waesche-youtube` entries lead to the existing German calculator. The TikTok photo entry uses the existing `social` medium; the video entry uses `organic_video`. Existing English entry links retain their destinations and attribution. Redirect requests are not calculator completions, tagged arrivals are not confirmed referrals, and channel event counts cannot prove an individual post caused a sale. Actual external publication is verified separately from this source release.

Local validation: 23 new content/GEO regressions, source-policy parity, fixed-route attribution and existing laundry arithmetic tests; eight responsive page views plus 248 existing laundry browser assertions. The independent review's two findings—filtered official references and a leftover unrelated accessory module—were corrected before release.
