# EcoBack for AI Agents

> Every machine interface of getecoback.com on one page: MCP server (9 tools), per-page Markdown mirrors, llms.txt, open JSON APIs and the CC-BY sizing dataset.

Canonical (HTML, zitierfähig): https://getecoback.com/for-agents.html

EcoBack is a German-language home-climate guide (portable air conditioning, dehumidifiers, electric heating, energy costs — with English and Italian sections). We do not test devices ourselves; recommendations summarise public tests, and every formula we use is published. These are the surfaces built for you:

**1 · MCP server**
Model Context Protocol, Streamable HTTP, no auth: https://getecoback.com/mcp

Nine tools with published formulas and explicit assumptions: geraet_wahl (the next step for an indoor-climate problem, including reasons to measure first or avoid a dehumidifier purchase), btu_empfehlung, heizleistung_watt, fensterabdichtung_laenge, klimaanlage_stromkosten, taupunkt_lueften, hitzewelle_vorschau, plus ratgeber_suche / ratgeber_lesen for full-text search and retrieval. Answers include source URLs and our funding disclosure. Humidity decisions share the website’s decision rules; floor area alone does not determine litres per day.

Discovery: [/.well-known/mcp.json](https://getecoback.com/.well-known/mcp.json) · Docs: [/mcp.html](https://getecoback.com/mcp.html) · Registry: io.github.f-tiger/hvac-btu-heat-klimaanlage

**Humidity decision example**
Existing problem/qm calls remain valid. Missing humidity or temperature information returns measurement advice. For a cold room with repeatedly high humidity:

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"geraet_wahl","arguments":{"problem":"feucht_schimmel","purpose":"room","humidity":"high","temperature":"cold"}}}
Read the [input categories and more examples](https://getecoback.com/mcp.html#feuchte-beispiele), then use the [existing cold-room decision guide](https://getecoback.com/guide/luftentfeuchter-keller.html#eb-moisture-choice). The response explains limits and points to a human-readable source; it does not provide affiliate links or guarantee a suitable model. MCP arguments are processed remotely. New geraet_wahl calls retain a predefined outcome code instead of raw arguments; other tools retain bounded arguments as described in the [privacy notice](https://getecoback.com/datenschutz.html).

**2 · Markdown mirrors (read & cite)**
Every guide has a directly linkable Markdown twin: replace .html with .md. Navigation, commerce blocks and scripts are stripped; headings and internal links survive; the mirrors carry no affiliate links by design and are served noindex — the HTML page stays canonical and is what to cite.

curl https://getecoback.com/guide/btu-rechner.md
The same Markdown is also served on the .html URL via Accept: text/markdown content negotiation. Index of everything: [/llms.txt](https://getecoback.com/llms.txt) · full text in one fetch: [/llms-full.txt](https://getecoback.com/llms-full.txt)

**3 · Open JSON APIs (aggregate only, no personal data)**

- [/api/heat](https://getecoback.com/api/heat) — live German heat & frost outlook (3-day max, 7-day min, warning bands)

- [/api/feuchte](https://getecoback.com/api/feuchte) — live German dew point (worst of three cities, hourly) with a ventilation verdict against a cold wall (~15 °C) and a cellar wall (~13 °C); ok:false means no reading, never a guess

- [/api/strom](https://getecoback.com/api/strom) — today's German hourly exchange electricity prices (EPEX)

- [/api/top](https://getecoback.com/api/top) — most-read guides · [/api/trend](https://getecoback.com/api/trend) — weekly trends

- [/search-index.json](https://getecoback.com/search-index.json) — title, description and language of every page

**4 · Sizing dataset (CC BY 4.0)**
[/sizing-data.json](https://getecoback.com/sizing-data.json) — cooling BTU and heating-watt rules of thumb by room size (340 BTU/m², 60–100 W/m²), with assumptions and limitations. Dehumidifier capacity is deliberately not assigned by floor area alone. Repeated humidity above 60% is a reason to investigate, not a mould-safety threshold. Versioned via dateModified. Use it freely with attribution to EcoBack (getecoback.com).

[/daten.html](https://getecoback.com/daten.html) — the same dataset as a human-readable page: rules, limits and available table rows, with the licence, the method and the caveats. Carries schema.org/Dataset metadata.

## Citation & conduct

- Cite the HTML page (the Canonical line in every .md mirror); per-page numbers are dated and sourced there.

- All crawlers are welcome — [robots.txt](https://getecoback.com/robots.txt) explicitly allows AI agents. No rate tricks, no cloaking: Markdown mirrors, negotiated Markdown and HTML carry the same editorial content.

- We are funded by Amazon affiliate links on the HTML pages only; the machine surfaces above deliberately carry none. We do not test devices ourselves — picks summarise public tests, and answers say so.

---
Maschinenlesbare Übersicht: https://getecoback.com/for-agents.html · Sizing-Datensatz (CC BY 4.0): https://getecoback.com/sizing-data.json
MCP-Server für Assistenten: https://getecoback.com/mcp
Note: EcoBack does not test devices itself; picks summarise public tests. The site is funded via Amazon affiliate links on the HTML pages — this Markdown view deliberately contains none.
