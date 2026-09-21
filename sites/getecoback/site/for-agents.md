# EcoBack for AI Agents

> Every machine interface of getecoback.com on one page: MCP server (9 tools), per-page Markdown mirrors, llms.txt, open JSON APIs and the CC-BY sizing dataset.

Canonical (HTML): https://getecoback.com/for-agents.html

EcoBack is a German-language home-climate guide (portable air conditioning, dehumidifiers, electric heating, energy costs — with English, French, Spanish and Italian sections). We do not test devices ourselves; recommendations summarise public tests, and every formula we use is published.

## 1 · MCP server

Model Context Protocol, Streamable HTTP, no auth: `https://getecoback.com/mcp`

Nine tools, formulas identical to the site's calculators: `geraet_wahl` (which device family solves a problem — the decision layer), `btu_empfehlung`, `heizleistung_watt`, `fensterabdichtung_laenge`, `klimaanlage_stromkosten`, `taupunkt_lueften`, `hitzewelle_vorschau`, `balkonspeicher_foerderung`, plus `ratgeber_suche` / `ratgeber_lesen` for full-text search and retrieval. Every answer carries its source URL and our funding disclosure.

Discovery: https://getecoback.com/.well-known/mcp.json · Docs: https://getecoback.com/mcp.html · Registry: `io.github.f-tiger/hvac-btu-heat-klimaanlage`

## 2 · Markdown mirrors (read & cite)

Every guide has a directly linkable Markdown twin: replace `.html` with `.md` (example: https://getecoback.com/guide/btu-rechner.md). Navigation, commerce blocks and scripts stripped; headings and internal links survive; the mirrors carry no affiliate links by design and are served `noindex` — the HTML page stays canonical and is what to cite. The same Markdown is served on the `.html` URL via `Accept: text/markdown`.

Index: https://getecoback.com/llms.txt · full text in one fetch: https://getecoback.com/llms-full.txt

## 3 · Open JSON APIs (aggregate only, no personal data)

- https://getecoback.com/api/heat — live German heat & frost outlook (3-day max, 7-day min, warning bands)
- https://getecoback.com/api/strom — today's German hourly exchange electricity prices (EPEX)
- https://getecoback.com/api/top — most-read guides · https://getecoback.com/api/trend — weekly trends
- https://getecoback.com/search-index.json — title, description and language of every page

## 4 · Sizing dataset (CC BY 4.0)

https://getecoback.com/sizing-data.json — the site's original sizing ladders: cooling BTU, dehumidifier litres/day and heating watts per room size, plus the rules of thumb behind them (340 BTU/m², 60–100 W/m², the <60 % RH mould threshold) and honest measurement caveats. Versioned via `dateModified`. Use freely with attribution to EcoBack (getecoback.com).

## 5 · Country solution calculators\n\n- Germany: https://getecoback.com/rechner.html\n- France: https://getecoback.com/fr/calculateur.html\n- Spain: https://getecoback.com/es/calculadora.html\n- Italy: https://getecoback.com/it/calcolatore.html\n- English hub: https://getecoback.com/en/solution-calculator.html\n\nEach page compares a current baseline with a proposed solution for cooling, dehumidification, heating or balcony solar. Inputs are explicit; annual savings are calculated from energy, tariff, export rate, maintenance and grant assumptions. Payback is shown only when the user confirms the two scenarios provide comparable service. Country pages link to official tariff, subsidy and solar-yield sources; grants must be verified on the linked authority page.\n\n## Citation & conduct

- Cite the HTML page (the `Canonical` line in every `.md` mirror); per-page numbers are dated and sourced there.
- All crawlers welcome — robots.txt explicitly allows AI agents. No cloaking: Markdown mirrors, negotiated Markdown and HTML carry the same editorial content.
- We are funded by Amazon affiliate links on the HTML pages only; the machine surfaces above deliberately carry none. We do not test devices ourselves — picks summarise public tests, and answers say so.

## Decision calculator

- `https://getecoback.com/rechner.html` is the user-facing solution calculator for cooling, humidity, heating and balcony solar.
- It returns the target capacity, estimated annual kWh, annual electricity cost, rough payback and a comparison table. Assumptions are shown with each result; treat outputs as orientation, not a quote.
- Machine citations should prefer the calculator's canonical page and the linked detail guide for the selected scenario.
