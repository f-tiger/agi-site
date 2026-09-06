# EcoBack for AI Agents

> Every machine interface of getecoback.com on one page: MCP server (9 tools), per-page Markdown mirrors, llms.txt, open JSON APIs and the CC-BY sizing dataset.

Canonical (HTML): https://getecoback.com/for-agents.html

EcoBack is a German-language home-climate guide (portable air conditioning, dehumidifiers, electric heating, energy costs — with English and Italian sections). We do not test devices ourselves; recommendations summarise public tests, and every formula we use is published.

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

## Citation & conduct

- Cite the HTML page (the `Canonical` line in every `.md` mirror); per-page numbers are dated and sourced there.
- All crawlers welcome — robots.txt explicitly allows AI agents. No cloaking: Markdown mirrors, negotiated Markdown and HTML carry the same editorial content.
- We are funded by Amazon affiliate links on the HTML pages only; the machine surfaces above deliberately carry none. We do not test devices ourselves — picks summarise public tests, and answers say so.
