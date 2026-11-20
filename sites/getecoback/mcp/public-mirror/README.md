# EcoBack Raumklima — MCP server

MCP tools for indoor climate and household energy in Germany. Use your
own measurements to compare drying costs, project electricity use, assess cooling or heating, and
check device fit or maintenance. The service also includes guide search and retrieval.

Listed in the official
[MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fhvac-btu-heat-klimaanlage/versions/latest)
as `io.github.f-tiger/hvac-btu-heat-klimaanlage`.

The [complete live JSON catalogue](https://getecoback.com/api/mcp-tools) groups the tools by task and supports `q` and `category` filters. With MCP, call `tools/list` and pass each returned `nextCursor` as `params.cursor` until the final page. For structured answers, use `citation_url` with the assumptions and limits provided. The table below is a snapshot updated by `sync.mjs`.

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
| `entfeuchter_ablaufcheck` | Check a German basement dehumidifier’s hose route, pump or tank options and cite evidence for the exact model. |
| `geraet_wahl` | Choose a next step for heat, damp/mould, cold or stale air. For damp rooms, measure first, investigate damage and compare cold-room or laundry conditions before buying; floor area alone cannot size a dehumidifier. Same decision rules as the website. |
| `btu_empfehlung` | Recommended cooling capacity in BTU for a room, with the matching device class: how many BTU do I need for X m²? Same formula as the calculator on getecoback.com (340 BTU/m² × sun factor), for Germany and Europe. |
| `fensterabdichtung_laenge` | Required window-seal length for a portable air conditioner from the sash measurements (perimeter = 2×(width+height)), plus the off-the-shelf size that fits. Covers tilt-and-turn and roof windows. |
| `hitzewelle_vorschau` | Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C. |
| `klimaanlage_stromkosten` | Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month? |
| `heizleistung_watt` | Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour. |
| `taupunkt_lueften` | Dew point of the outside air and whether opening the window right now would make a basement or damp room wetter (Magnus formula, walls counted 2 °C below room temperature). |
| `ratgeber_suche` | Searches published guides with a readable Markdown mirror, returning title, canonical URL and task-specific summary. Every result can be passed to ratgeber_lesen. |
| `ratgeber_lesen` | Reads the cleaned Markdown of a published guide, with reviewed source links, assumptions and limits. Long excerpts are explicitly marked and link the full text. Pass an exact canonical path or URL from ratgeber_suche, without query or fragment. |
<!-- tools:end -->

## Calculate the cost of repeated household use

A meter reading of 2 kWh over 24 hours projects to 200 kWh over 100 comparable days.
At €0.30/kWh, that is €60. The [three household examples](https://getecoback.com/mcp.html#haushalt-beispiele)
also cover `geraetewechsel_rechnen` and `waesche_trocknungskosten`.

```json
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"strommessung_hochrechnen","arguments":{"kwh":2,"hours":24,"days":100,"price":0.3}}}
```

## Can a MeacoDry Arete One 20L drain uphill into a sink?

A gravity hose requires a continuous drop. Meaco lists a separate pump for this model. Check the German package contents and the permitted lift before buying, or empty the tank. [German drainage decision and model sources](https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf).

```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"entfeuchter_ablaufcheck","arguments":{"drain":"level_or_uphill","model":"meaco-one-20"}}}
```

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

## Find a laundry decision and read its evidence

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ratgeber_suche","arguments":{"frage":"Wäsche trocknen Wohnung Stromkosten","sprache":"de","max":3}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ratgeber_lesen","arguments":{"pfad":"/waeschetrockner-oder-luftentfeuchter.html"}}}
```

Search and reading share the same published canonical corpus. The cleaned
Markdown preserves equal-load/dryness conditions and reviewed official source
links. Long excerpts explicitly state that they are incomplete and provide the
full Markdown URL and original references. Missing text fails closed; no
arbitrary URL or HTML fallback is fetched. The browser calculator remains the
place to compare a reader's own measured values.

## What makes the answers safe to quote

- **Published rules and explicit limits.** Calculations state their assumptions.
  Humidity decisions share the browser decision rules: measurement, no-purchase,
  cause, cold-room, laundry-cost and comparison branches. Floor area alone does
  not determine dehumidifier capacity. A CI smoke job checks all
  exposed tools against production.
- **Answers include source URLs and a funding disclosure.** The site is funded by
  Amazon affiliate links on its HTML pages. Whether an assistant cites a source
  is determined by that client.
- **Honest about what it is not.** Product recommendations summarise public tests; nothing
  is lab-tested here, and the tools say so. These are bounded decision aids, not
  remote diagnoses or guarantees of device suitability.
- **No account or MCP cookies.** Usage records for tools added from hosted version 1.5.0 onward and for `geraet_wahl`
  and `entfeuchter_ablaufcheck` include the tool name and a predefined outcome code. Other tools retain arguments
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
