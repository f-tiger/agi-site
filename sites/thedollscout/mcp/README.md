# TDS MCP: complete a collection task

MCP contract: **2.6.0**. Verify that `search_collection_series` and `prepare_collection_checklist` appear in the connected server's tool list before using this workflow. A repository version alone does not establish production availability; release receipts are tracked separately.

TDS lets an MCP-compatible assistant find a source-linked SMISKI or Sonny Angel series and compare names the collector supplies. The result includes owned, not-marked-owned, explicitly wanted and unmatched names, plus copyable Markdown. Existing probability, budget and display tools remain available.

## Connect

Remote endpoint: **https://thedollscout.com/mcp** (Streamable HTTP). No TDS API key is required. A generic MCP client must support remote HTTP; client availability, plan requirements and organization policy vary. Discovery or Registry listing does not install the server, guarantee an AI recommendation or establish use.

With Claude Code already installed, run these commands from the project where you want the server configured:

```sh
claude mcp add --transport http tds https://thedollscout.com/mcp
claude mcp get tds
```

Then open `/mcp` inside Claude Code, check the server and its tools, and run the task below. Adding configuration or displaying it is not proof of a successful tool call. These commands follow the [official Claude Code MCP documentation](https://code.claude.com/docs/en/mcp), checked 2026-10-31; the default configuration scope is local to the current project.

## Museum task: two calls

Example request:

> Find the SMISKI Museum series. I own Smiski Dali and Smiski Pearl Earring. Show the catalog names I have not marked as owned, with the source and check date. Only Smiski Bacchus is on my wishlist. Return a copyable checklist and keep unrecognized names unresolved.

First call `search_collection_series`. These JSON objects are MCP `tools/call` parameters, not standalone HTTP requests:

```json
{
  "name": "search_collection_series",
  "arguments": {
    "query": "Museum",
    "brand": "smiski",
    "limit": 5,
    "language": "en"
  }
}
```

Use the returned `seriesId` and source names for the second call:

```json
{
  "name": "prepare_collection_checklist",
  "arguments": {
    "seriesId": "smiski-museum",
    "owned": ["Smiski Dali", "Smiski Pearl Earring"],
    "wanted": ["Smiski Bacchus"],
    "language": "en"
  }
}
```

The catalog snapshot checked on **2026-10-30** contains six named Museum entries. For this illustrative input, the result is:

| Field | Expected result for that snapshot |
| --- | --- |
| `owned` | Smiski Dali; Smiski Pearl Earring |
| `notMarkedOwned` | Smiski The Source; Smiski Fuzin&Raijin; Smiski Bacchus; Smiski Vela’zquez |
| `wanted` | Smiski Bacchus |
| `unmatchedOwned`, `unmatchedWanted` | Empty arrays |
| `comparisonScope` | `published_catalog_names_only` |

The response also includes `styles`, `counts`, `source`, `checked`, `modified`, `catalogScope`, `limitations` and `markdown`. The [official Museum source](https://smiski.com/e/products/museumseries/) and the returned `checked` date travel with the result. Read the dates returned by the current catalog; a catalog check date is not a product release date.

**Four names are not marked owned out of six catalogued names. That does not mean four purchases remain to complete the official set.** Secret figures or variants may be missing. An unmarked name becomes wanted only when the user explicitly supplies it in `wanted`; omitting `wanted` produces an empty wishlist. Unrecognized names stay in the unmatched fields. Matching normalizes whitespace, Unicode composition and case; it does not guess spelling or translated aliases. Repeated inputs are deduplicated, not counted as duplicate possessions or trade offers. The result does not verify ownership, authenticity, stock, price or value.

`language` supports `en`, `de` and `zh` for result labels and explanations; source figure names stay unchanged. Search only covers the published named-series catalog, not every brand covered elsewhere on the site.

## Event preparation and recipient reuse

`prepare_swap_event_card` returns an event template (`kind: "event"`) or a participant preparation card (`kind: "card"`). Supply `eventName`, a real calendar `eventDate` (`YYYY-MM-DD`), and `exchangeMode` (`peer`, `store`, or `display`). Optional `rulesUrl` must be HTTPS; `note` is an event-wide rules summary. Personal cards require at least one explicitly selected `wanted` or `offered` name; use full `Series title / figure name` labels when a figure name is ambiguous. Each list supports eight names. Display-only mode rejects exchange offers.

The returned `shareUrl` opens a read-only snapshot at [/collecting/event-kit](https://thedollscout.com/collecting/event-kit). Recipients can choose **Make my own card**: this copies the event fields and clears the original person's lists. Event details are user supplied and unverified. This tool does not register attendance, match collectors, contact anyone or arrange transactions.

Review before sharing. The URL contains readable, editable data; anyone holding it can read, modify and forward it. Do not include contact details. Previously shared copies cannot be revoked. The tool does not persist arguments or write them to usage telemetry. Date checks use the current UTC date, not an exact local event end time; confirm timing and rules with the organizer. Expired results remain readable but do not return a share URL.

The official SDK verifier also runs the event-template and personal-card calls, decodes the actual share link and checks that recipient reuse clears both item lists. All verification requests are marked as QA, not adoption.

## Data handling

The assistant sends the names you choose to the TDS MCP server for this calculation. TDS does not persist these tool arguments or include them in application usage telemetry. Successful calls may be counted by fixed tool name and result category. Your assistant provider has its own data handling. The server cannot read or update the collection saved in your browser, private files, account or membership; it provides no collection cloud sync. Browser tracking and backups remain separate.

## Verify with the official SDK

From the repository root, using Node.js 24 and the committed lockfile:

```sh
npm ci --prefix sites/thedollscout/mcp --ignore-scripts
npm run --prefix sites/thedollscout/mcp verify:local
npm run --prefix sites/thedollscout/mcp verify:live
```

`verify:local` starts a temporary local HTTP adapter around the actual route and uses the checked-in catalog. `verify:live` calls the production endpoint and requires the matching release to be deployed; it uses Node's environment-proxy support for restricted environments. Both run the pinned official `@modelcontextprotocol/sdk` client, initialize the connection, verify the server version and tool list, read the catalog resource, perform the Museum comparison and check that unmatched input is preserved. The SDK smoke uses an empty wishlist to check that unmarked entries are not silently added to it.

The script emits `official_sdk_http_client_passed` only after its assertions pass. Its requests are marked as QA (`?ci=1`, `x-probe` and a self-check user agent); local verification has no telemetry binding. These checks establish protocol/task behavior, not external adoption, unique users, Claude Code execution, indexing or revenue. A production version mismatch fails verification; do not relabel that as a passing result.

Public task instructions: [English](https://thedollscout.com/for-agents), [Deutsch](https://thedollscout.com/de/for-agents), [中文](https://thedollscout.com/zh/for-agents).
