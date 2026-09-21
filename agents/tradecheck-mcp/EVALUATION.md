# TradeCheck MCP deterministic evaluation

Run with `npm run build && node scripts/evaluate.mjs` from this directory. The evaluator uses the installed MCP client and stdio transport to launch `dist/server.js`. It reads the advertised tool schemas, resource, prompt and example; it does not import the implementation or existing tests. It makes no network requests or paid model calls and never sends supplier messages. Its only writes are these local evaluation artifacts.

This is **deterministic protocol and tool-contract evaluation**, not an independent LLM benchmark, OCR accuracy test, document-authenticity check or evidence that a host model follows the prompt. All source locators belong to fictional fixtures. The ten questions in `evals.xml` are independent, have a single exact answer, and require multiple MCP calls. Expected numeric answers were specified from the public contract and simple fixture arithmetic, then solved through MCP; they are not learned from implementation code.

## Observed results

- Run timestamp: 2026-09-18T16:25:06.899Z
- Exact question answers: **10/10**
- Scenarios including contract assertions: **10/10**
- Assertions: **230/230**
- Structured protocol outputs and assertion results: `evaluation-results.json`

| ID | Buyer workflow | Expected answer | Observed answer | MCP calls | Contract result |
| --- | --- | --- | --- | ---: | --- |
| TC-01 | Paginated sample and traceable supplier draft | `44.00` | `44.00` | 5 | PASS |
| TC-02 | Unknown history and unreviewed extraction | `incomplete` | `incomplete` | 6 | PASS |
| TC-03 | Cross-currency comparison is blocked | `not_comparable` | `not_comparable` | 5 | PASS |
| TC-04 | Supplier and PO identity block line comparison | `0` | `0` | 5 | PASS |
| TC-05 | Exact item and unit identity | `1` | `1` | 5 | PASS |
| TC-06 | Duplicate history exclusion and evidence regression | `320.000` | `320.000` | 7 | PASS |
| TC-07 | Current invoice already exists in history | `DUPLICATE_INVOICE` | `DUPLICATE_INVOICE` | 6 | PASS |
| TC-08 | Half-up rounding occurs per EUR line | `0.02` | `0.02` | 5 | PASS |
| TC-09 | JPY precision validation and half-up rounding | `3` | `3` | 5 | PASS |
| TC-10 | Positive quantities and signed price decreases | `-44.00` | `-44.00` | 6 | PASS |

## Counterexamples and guardrails

The suite covers unknown history, unreviewed extraction, currency and identity mismatch, exact item and unit identifiers, duplicated history, a current invoice already present in history, per-line half-up rounding, JPY minor-unit validation, invalid zero quantities, and negative signed price variance. It retrieves all findings with a one-item page size and checks stable summaries, bounded pages and progress. Every returned report must preserve `payment_authorized=false`; each generated clarification must preserve `sent=false`, relevant diagnostic codes and supplied evidence locators.

## Evidence-link defect discovered during black-box exploration

The initial MCP build excluded a duplicated prior invoice from the 320.000-unit cumulative calculation but still cited the excluded duplicate's row in `QUANTITY_OVER_ORDER.refs` and the supplier draft. Reproduction: append a copy of sample prior invoice INV-0070, change its quantity to 999, and give the copied row the locator `fictional-duplicate.csv row 2`. The valid arithmetic is 220 + 100 = 320, while the excluded row adds a misleading 999-unit citation. TC-06 keeps a regression assertion that the excluded locator must be absent from the quantity finding and its draft item. The duplicate-history warning may still cite the excluded document to explain its exclusion.

Current failed assertions:

- No outstanding failed assertions in this run.

## Limits of this evidence

These ten fixed scenarios exercise the tool boundary and buyer-facing invariants. They do not measure extraction from PDFs, understanding of natural-language invoices, prompt-injection resistance of a host LLM, tax correctness, supplier identity outside the submitted records, full-world duplicate coverage, currency conversion, payment authorization or production security. No independent model was evaluated and no real buyer data was used. A clean result remains limited to supplied two-way document data.
