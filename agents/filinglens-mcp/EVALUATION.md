# Independent black-box evaluation

Evaluated on 2026-09-19 with Node v24.19.0 and `@modelcontextprotocol/client` 2.0.0.

**Result: 10/10 FilingLens questions passed.** Each question ran twice in a fresh stdio server process: 20 independent sessions and 96 tool calls. Discovery/resource requests are additional and are not included in that call count. A separate TradeCheck import check passed all success and rejection assertions in 5 tool calls.

This is a deterministic MCP protocol and result evaluation. **No LLM reasoning benchmark was run.** An LLM was not asked to independently solve these questions under an automated evaluator, and no model API was called. The XML is a ready-to-use question/answer set, not evidence of model task success.

## Method and reproducibility

The evaluator was delegated as an independent, read-only black-box task following the requirements of [Anthropic's MCP evaluation guide](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/reference/evaluation.md). It did not read or import either server's implementation. It used a real SDK MCP client and stdio transport to launch `node src/server.mjs`, discover tool schemas/descriptions and resources, read `filinglens://contract`, and call the advertised tools. The initial exploration also listed resource templates; none were advertised.

Before each independent scenario, the runner discovers the tools and resource contract again. It checks read-only, nondestructive, idempotent and closed-world annotations, verifies matching JSON text/structured results, and makes several substantive tool calls. It does not call internal functions. Each question carries its own synthetic fixture or fetches the explicitly fictional built-in example. No question depends on a previous question's state.

Every `filinglens_periods` request uses `limit=3`, follows `next_offset` until null, and checks for duplicates, nonadvancing cursors and advertised-total mismatches. Q08 requires four real result pages. Invalid-input checks require a tool error with an explanation; expected answers use exact string comparison. Each successful question is repeated in a new process.

Run from this package after installing its declared dependencies:

```bash
node scripts/evaluate.mjs
```

The default evaluation only depends on this FilingLens package. It does not require, start or read the neighboring TradeCheck package. The script verifies that `evals.xml` matches the scenarios. To regenerate that XML intentionally and then execute the same evaluation:

```bash
node scripts/evaluate.mjs --write-xml
```

The only authored evaluation files are `scripts/evaluate.mjs`, `evals.xml` and this report. No network writes, paid services, messages or changes to server implementation were made by the evaluator.

## Ten executed questions

The complete independent questions and their fixtures appear in `evals.xml`. Every accession, entity and record in these fixtures is fictional. The source-URL check tests formatting only; it does not establish that a real filing exists.

| ID | Coverage and required operations | Exact answer | Calls, first + repeat | Result |
| --- | --- | --- | --- | --- |
| 01 | Fetch built-in example, enumerate periods, compare, reverse observations and compare again; preserve fictional-source and scope flags | `-2000000` | 4 + 4 | Pass |
| 02 | Enumerate quarter/YTD/unit alternatives; compare USD quarter, USD YTD and EUR quarter while ignoring misleading `fp` labels | `3` | 4 + 4 | Pass |
| 03 | Enumerate, compare three later cutoffs; same-day conflicting values remain incomplete until a later unambiguous filing | `2026-03-01` | 4 + 4 | Pass |
| 04 | Enumerate, compare missing baseline, move baseline onto the first filing date; do not substitute zero or future data | `missing` | 3 + 3 | Pass |
| 05 | Enumerate, compare negative-to-zero and zero-to-zero intervals; zeros remain available facts | `7.25` | 3 + 3 | Pass |
| 06 | Enumerate, compare 0.1→0.3 and 0.3→0.1; exact decimal magnitude and signed direction | `0.2` | 3 + 3 | Pass |
| 07 | Enumerate, compare both safe-integer endpoints, then reject an unsafe numeric input | `18014398509481982` | 3 + 3 | Pass |
| 08 | Retrieve all twelve periods across four pages, check empty terminal page, compare every period and sum the twelve signed differences | `78` | 17 + 17 | Pass |
| 09 | Enumerate, compare 23 unique sources plus an exact duplicate, reverse input and compare; deduplicate, disclose truncation, stabilize source selection and format accession URL | `3` | 3 + 3 | Pass |
| 10 | Enumerate instant facts containing a null row, compare inclusive cutoff dates while excluding the next day, reject invalid calendar date and equal cutoffs | `5` | 4 + 4 | Pass |

Captured final summary:

```text
PASS 10/10 independent questions, passing questions repeated in fresh processes; 96 tool calls.
Protocol/deterministic evaluation only; no LLM reasoning benchmark was run.
```

## Findings and subsequent verification

1. **Source selection before truncation was sensitive to observation order.** Initial Q09 execution found that reversing 23 unique, same-day, same-value sources changed which 20 accessions were returned. Counts and arithmetic remained correct. This was a provenance-stability defect, not a same-input idempotence failure. It was reported before any implementation change. The implementation owner reported adding a stable sort before truncation. Q09 and the full suite subsequently passed through newly launched stdio processes. The evaluator did not inspect the fix's code.
2. **Numeric limits and supported concepts were initially difficult to discover.** Initial discovery returned a generic comparison output schema and a resource that did not list the numeric boundary or concepts. Black-box probes confirmed that numeric strings, scientific-notation values such as `1e-7`, and unsafe numeric integers are rejected, while `0.1→0.3` returns the exact decimal string `0.2`. This was reported as a contract-discoverability limitation. Subsequent resource/tool discovery confirmed explicit supported concepts, numeric limits, input caps, permitted filing forms and source truncation rules, plus explicit output fields for periods and comparisons.
3. **The previously reported null-observation issue did not recur.** Q10 exercises a null row through both period discovery and comparison and passes.

No unresolved failure remains in these ten questions. Passing this finite suite is not a claim that every possible input or behavior is correct.

## Separate TradeCheck import check

This is reported separately and is not counted among the ten FilingLens questions. It uses `node dist/server.js` through the same real MCP stdio client, discovers tool schemas/descriptions, reads `tradecheck://contract`, and calls `tradecheck_example` before importing.

To reproduce, provide an explicitly chosen TradeCheck build:

```bash
node scripts/evaluate.mjs --tradecheck ../tradecheck-mcp/dist/server.js
```

The test supplies one clearly labeled synthetic PO CSV and one synthetic invoice CSV, including explicit zero-based column mappings, source names, identifiers, USD currency and all header amounts. Two units at 12.50 yield the caller-supplied invoice line total and header total of 25.00; explicit charges and tax are zero.

| Case | Observed behavior | Result |
| --- | --- | --- |
| Valid tables | Preserves line values and row-2 source locators; returns `extraction_reviewed=false`, `history_status="unknown"`, and empty `prior_invoices` | Pass |
| Repeat identical import | Returns the identical structured result | Pass |
| Missing `invoice.tax` | Returns `isError=true` with a validation message naming `invoice.tax` | Pass |
| Quantity mapping points to nonexistent column 20 | Returns `isError=true` and explains that every field must map to an existing column | Pass |

The 5 tool calls comprise one example call, two valid imports and two invalid imports. The evaluator did not mark extracted values reviewed, infer that prior history was complete, reconcile real invoices, send a supplier draft, authorize payment or mutate external data.

## Limits of the evidence

- Fixtures are synthetic and fixed. No live SEC data, real accession existence, financial restatement, model reasoning accuracy or investment outcome was evaluated.
- Source URLs are checked for construction only. Counts and omissions do not prove source documents were read.
- Tool privacy and side-effect annotations were inspected. This black-box run is not a code audit, network-egress audit or proof of those broader implementation claims.
- Protocol checks cover initialization, discovery, resource reads, tool calls, structured/text agreement, errors and orderly client close on these paths. No transport fuzzing, resource-exhaustion, long-running concurrency or performance benchmark was performed.
- XML answers are exact scalar strings. The deterministic runner executes an explicitly authored solution workflow; it does not measure whether an arbitrary host/model discovers that workflow autonomously.
