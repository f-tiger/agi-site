# EcoBack for AI Agents

> EcoBack for AI assistants: searchable MCP tools, source-linked Markdown guides, open sizing data and documented public APIs for German households.

Canonical (HTML, zitierfähig): https://getecoback.com/for-agents.html

EcoBack is a German-language home-climate guide (portable air conditioning, dehumidifiers, electric heating, energy costs — with English and Italian sections). We do not test devices ourselves; recommendations summarise public tests, and every formula we use is published. These are the surfaces built for you:

**1 · MCP server**
Model Context Protocol, Streamable HTTP, no auth: https://getecoback.com/mcp/v1

EcoBack tools cover room climate, household energy and water, room planning, weather, kitchen tasks, service preparation, textiles, air paths, model documentation, household accounts, practical comparisons, measurement uncertainty, appliance workflows, reuse, room handovers, consumption history, portable window setups, household coordination, evidence checks, water routines, room acoustics, concurrent appliance use, used appliances, kitchen resources and indoor climate trends. Filter the [JSON catalogue](https://getecoback.com/api/mcp-tools) by q or category. Use [view=compact](https://getecoback.com/api/mcp-tools?category=Messpraxis&view=compact) for names, descriptions, categories and available citation links. Omit the compact view and use [tool=EXACT_NAME](https://getecoback.com/api/mcp-tools?tool=duschdurchfluss_messen) to get a single input schema.

Add limit=24 for a ranked page. Use an integer from 1 to 100. When the response includes nextOffset, send that value as offset with the same filters and page size. If version changes between requests, start from the first page. An offset requires a limit and accepts a non-negative integer. total counts all matches, returned counts entries on this page and catalogueTotal counts all callable names. [Second page of an electricity search](https://getecoback.com/api/mcp-tools?view=compact&q=Strom&limit=24&offset=24).

Combine view=examples with one exact tool name to inspect its schema, available source URLs and a checked fixture. For time-sensitive answers, the example describes the expected result rather than fixing current values. example.arguments gives the sample call inputs and example.expected_fields gives selected expected outputs. Send your own inputs with tools/call to run the tool. If citation_markdown_url is available, use it to read the guide and cite the canonical citation_url. [Two-phase electricity example](https://getecoback.com/api/mcp-tools?view=examples&tool=stromfenster_mehrphasen_start) · [Air conditioner cost example](https://getecoback.com/api/mcp-tools?view=examples&tool=klimaanlage_stromkosten).

In the complete catalogue, total counts callable names and distinctTotal counts distinct tasks. equivalent_task identifies another supported name for the same task.

For MCP discovery, call tools/list and send each returned nextCursor as params.cursor in the next request. For structured results, cite citation_url and report the units, assumptions and limits from the tool. Use ratgeber_lesen to check the published guide and linked original sources when the answer depends on a model specification.

Discovery: [/.well-known/mcp.json](https://getecoback.com/.well-known/mcp.json) · Docs: [/mcp.html](https://getecoback.com/mcp.html) · Registry: io.github.f-tiger/hvac-btu-heat-klimaanlage

**Plan a shower around a measured flow and a water budget**
Collect 2.25 L over 15 seconds at the usual setting. Call duschdurchfluss_messen to derive 9 L/min. Pass that flow and a household budget of 72 L to dusche_zeit_bei_wasserbudget for 8 minutes at steady flow. The budget is a user input. Deduct any warm-up water first. [Runnable examples and assumptions](https://getecoback.com/mcp.html#duschbudget-beispiel).

**Compare settings in A–B–B–A order**
Run the same task and read kWh for each trial. For 1.2, 1.0, 1.1 and 1.3 kWh in A–B–B–A order, strommessung_abba_abwechselnd gives a mean difference of 0.20 kWh per run in favour of B. A reversed order helps offset a steady time trend. Repeat when conditions vary. [Runnable comparison](https://getecoback.com/mcp.html#strommessung-abba-beispiel).

**Compare start times for a device with two energy-use phases**
At four successive rates of €0.30, €0.20, €0.40 and €0.25 per kWh, running the 0.8 kWh and 0.2 kWh phases in windows two and three costs €0.24. The windows have equal lengths and each phase fills one window. Verify permitted start times and use the tariff charged to your household. [Runnable comparison and source](https://getecoback.com/mcp.html#stromfenster-mehrphasen-beispiel).

**Plan a kettle fill across several batches**
Enter the total volume and the minimum and maximum fill volumes from your kettle manual. With 1,900 mL needed and 400–1,700 mL allowed per batch, the example returns two fills of 950 mL with no surplus. [Runnable calculation and source](https://getecoback.com/mcp.html#wasserkocher-fuellsplitt-beispiel).

**Match a longer meter reading to a bill window**
With 240 kWh measured over 40 days, remove 24 kWh measured in the four days before the bill window and 36 kWh measured in the six days after. The remaining 180 kWh matches the 30-day date range. The bill reports 183 kWh, a difference of 3 kWh. Check that the meter and exact dates match. [Inspectable JSON fixture](https://getecoback.com/api/mcp-tools?view=examples&tool=stromrechnung_messfenster_randtage) · [Runnable call and guide](https://getecoback.com/mcp.html#stromrechnung-messfenster-beispiel).

**Project a plug-in meter reading**
At €0.30/kWh, a reading of 2 kWh in 24 hours projects to €60 over 100 days of comparable use. See [the replacement and laundry examples](https://getecoback.com/mcp.html#haushalt-beispiele).

{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"strommessung_hochrechnen","arguments":{"kwh":2,"hours":24,"days":100,"price":0.3}}}

**Can my MeacoDry Arete One 20L drain uphill into a sink?**
A gravity hose needs a continuous drop. Meaco lists a separate pump for this model. Check the German package contents and permitted lift before buying, or use the tank. See the [model-specific drainage evidence](https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf).

{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"entfeuchter_ablaufcheck","arguments":{"drain":"level_or_uphill","model":"meaco-one-20"}}}

**Humidity decision example**
Existing problem/qm calls remain valid. Missing humidity or temperature information returns measurement advice. For a cold room with repeatedly high humidity:

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"geraet_wahl","arguments":{"problem":"feucht_schimmel","purpose":"room","humidity":"high","temperature":"cold"}}}
Read the [input categories and more examples](https://getecoback.com/mcp.html#feuchte-beispiele), then use the [existing cold-room decision guide](https://getecoback.com/guide/luftentfeuchter-keller.html#eb-moisture-choice). The response explains limits and points to a human-readable source; it does not provide affiliate links or guarantee a suitable model. MCP arguments are processed remotely. From version 1.11.0, usage records for every tool include a tool name and fixed outcome code. Submitted arguments are processed to answer the request and are absent from new usage records. See the [privacy notice](https://getecoback.com/datenschutz.html).

**2 · Markdown mirrors (read & cite)**
Every guide has a directly linkable Markdown twin: replace .html with .md. Navigation, commerce blocks and scripts are stripped; headings and internal links survive; the mirrors carry no affiliate links by design and are served noindex — the HTML page stays canonical and is what to cite.

curl https://getecoback.com/guide/btu-rechner.md
The same Markdown is also served on the .html URL via Accept: text/markdown content negotiation. Index of everything: [/llms.txt](https://getecoback.com/llms.txt) · full text in one fetch: [/llms-full.txt](https://getecoback.com/llms-full.txt)

**3 · Open JSON APIs (aggregate only, no personal data)**

- [/api/heat](https://getecoback.com/api/heat) — live German heat & frost outlook (3-day max, 7-day min, warning bands)

- [/api/feuchte](https://getecoback.com/api/feuchte) — live German dew point (worst of three cities, hourly) with a ventilation verdict against a cold wall (~15 °C) and a cellar wall (~13 °C); ok:false means no reading, never a guess

- [/api/strom](https://getecoback.com/api/strom) — today's German hourly exchange electricity prices (EPEX)

- [/api/top](https://getecoback.com/api/top) — most-read guides · [/api/trend](https://getecoback.com/api/trend) — weekly trends. mcp_complete_week covers the last seven complete UTC days and counts completed tool calls, distinct tool names called and calls with a browser-class user agent.

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
Note: Editorial guidance based on the linked sources, not our own device tests. The site is funded via Amazon affiliate links on the HTML pages — this Markdown view deliberately contains none.
