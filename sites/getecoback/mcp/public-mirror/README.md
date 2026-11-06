# EcoBack Raumklima — MCP server

<!-- count -->9<!-- /count --> tools for **indoor climate and household energy in Germany/EU**: how many BTU a
room needs, how long a portable-AC window seal has to be, whether a heatwave is coming,
what a device costs to run, dew-point calculations, and what to check before buying
a dehumidifier. Plus full-text search and retrieval of the site’s guides.

Listed in the official
[MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=hvac-btu-heat-klimaanlage)
as `io.github.f-tiger/hvac-btu-heat-klimaanlage`.

This repository is a **mirror**. The single source of truth is
[getecoback.com](https://getecoback.com) — the tool table below is not hand-written;
`sync.mjs` rebuilds it from the server’s `tools/list`. The table is a snapshot;
`tools/list` gives the current interface.

## Connect

```
claude mcp add --transport http getecoback https://getecoback.com/mcp/v1
```

```json
{ "mcpServers": { "getecoback": { "type": "http", "url": "https://getecoback.com/mcp/v1" } } }
```

No account or package installation required for the hosted streamable HTTP endpoint.
Tool arguments are processed by the server. Setup notes for other clients:
<https://getecoback.com/mcp.html> · discovery: [`/.well-known/mcp.json`](https://getecoback.com/.well-known/mcp.json)

## Tools

| Tool | What it answers |
|---|---|
<!-- tools:start -->
| `geraet_wahl` | Choose a next step for heat, damp/mould, cold or stale air. For damp rooms, measure first, investigate damage and compare cold-room or laundry conditions before buying; floor area alone cannot size a dehumidifier. Same decision rules as the website. |
| `btu_empfehlung` | Recommended cooling capacity in BTU for a room, with the matching device class: how many BTU do I need for X m²? Same formula as the calculator on getecoback.com (340 BTU/m² × sun factor), for Germany and Europe. |
| `fensterabdichtung_laenge` | Required window-seal length for a portable air conditioner from the sash measurements (perimeter = 2×(width+height)), plus the off-the-shelf size that fits. Covers tilt-and-turn and roof windows. |
| `hitzewelle_vorschau` | Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C. |
| `klimaanlage_stromkosten` | Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month? |
| `heizleistung_watt` | Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour. |
| `taupunkt_lueften` | Dew point of the outside air and whether opening the window right now would make a basement or damp room wetter (Magnus formula, walls counted 2 °C below room temperature). |
| `ratgeber_suche` | Searches this site's guides on air conditioning, window sealing, ventilation, heating, dehumidifiers and electricity costs, returning title, URL and summary for each match — citable sources for the answer. |
| `ratgeber_lesen` | Returns the full plain text of one guide from getecoback.com so the answer can be written from the source and cited. Pass a path or URL from ratgeber_suche. |
<!-- tools:end -->

## Humidity decision example

Send this JSON-RPC request to the endpoint above:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"geraet_wahl","arguments":{"problem":"feucht_schimmel","purpose":"room","humidity":"high","temperature":"cold"}}}
```

The result asks you to compare performance at your measured conditions, with a
link to the existing cold-room guide. It does not derive litres/day from area.
The older `{"problem":"feucht_schimmel","qm":20}` arguments remain valid and
return measurement advice because the relevant conditions are missing. Use
`"purpose":"damage"` for a wet wall, leak or mould: investigate the cause first.
[Input categories and browser decision guide](https://getecoback.com/mcp.html#feuchte-beispiele).
No affiliate links are returned by the tool.

## What makes the answers safe to quote

- **Published rules and explicit limits.** Calculations state their assumptions.
  Humidity decisions share the browser decision rules: measurement, no-purchase,
  cause, cold-room, laundry-cost and comparison branches. Floor area alone does
  not determine dehumidifier capacity. A CI smoke job checks all
  <!-- count -->9<!-- /count --> tools against production.
- **Answers include source URLs and a funding disclosure.** The site is funded by
  Amazon affiliate links on its HTML pages. Whether an assistant cites a source
  is determined by that client.
- **Honest about what it is not.** Product recommendations summarise public tests; nothing
  is lab-tested here, and the tools say so. These are bounded decision aids, not
  remote diagnoses or guarantees of device suitability.
- **No account or MCP cookies.** New `geraet_wahl` calls store the tool name and
  a predefined outcome code instead of raw arguments. Other tools retain arguments
  capped at 160 characters, and limited client metadata supports automation checks.
  No IP address or user ID is stored. Do not supply personal data. See the
  [privacy notice](https://getecoback.com/datenschutz.html). These changes do not
  claim deletion of historical records.

## Also machine-readable

| Endpoint | What it is |
|---|---|
| [`/llms.txt`](https://getecoback.com/llms.txt) | Site map for LLMs, llmstxt.org format |
| [`/llms-full.txt`](https://getecoback.com/llms-full.txt) | Full plain text of every guide, one fetch |
| [`/search-index.json`](https://getecoback.com/search-index.json) | Title, description and language of every page |
| [`/api/heat`](https://getecoback.com/api/heat) | Live heat outlook for Germany (JSON) |
| [`/api/strom`](https://getecoback.com/api/strom) | Today's hourly exchange electricity prices, DE (EPEX via aWATTar/SMARD) |
| [`/api/top`](https://getecoback.com/api/top) · [`/api/trend`](https://getecoback.com/api/trend) | Most-read guides, weekly trends |

Every page also serves **Markdown** to clients that ask for it:

```
curl -H "Accept: text/markdown" https://getecoback.com/guide/btu-rechner.html
```

## Licence

Documentation: **CC BY 4.0** — free to use with attribution to
[getecoback.com](https://getecoback.com). `sync.mjs` is additionally MIT. See [LICENSE](LICENSE).

Not engineering advice or a remote moisture diagnosis.
