# TradeCheck MCP · 0.2.0 beta

A local tool for importer and purchasing-team invoice review. It compares one purchase order, one supplier invoice and supplied prior invoice history, then prepares an **unsent** supplier clarification. It is a deterministic review engine exposed through MCP plus a guided agent prompt. It is not a hosted model, OCR service, ERP integration or autonomous payment agent.

Try the browser workbench: https://rfqdesk.agiscorecard.com/agent

## Start here

1. Install Node.js 22 or newer. Download and extract the beta archive from the site.
2. Open a terminal in the extracted `tradecheck-mcp` directory. Install the pinned dependencies and test the bundled build:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run demo
```

The demo connects a real MCP client over stdio, loads a fictional order and finds a signed price difference of **EUR 44.00** and a cumulative quantity of **320 against 300 ordered**. These are fictional discrepancies, not recovered money.

3. Register the server with your MCP-compatible desktop assistant. For Claude Code, substitute your actual absolute path:

```sh
claude mcp add tradecheck -- node /absolute/path/tradecheck-mcp/dist/server.js
```

Run `/mcp` in Claude Code and check that four TradeCheck tools appear. For Cursor, add this entry to its MCP configuration:

```json
{"mcpServers":{"tradecheck":{"command":"node","args":["/absolute/path/tradecheck-mcp/dist/server.js"]}}}
```

On Windows use an absolute path such as `C:/Users/you/tradecheck-mcp/dist/server.js`. If `node` is not found by your desktop app, use its absolute executable path. The server is local **stdio**, not a remote URL.

4. Ask the assistant: **“Use TradeCheck's review_supplier_invoice prompt. First show the fictional example. Then help me prepare my PO and invoice, confirm the extracted fields with me, and produce a two-way review plus an unsent supplier clarification.”**

If your host does not surface prompts, paste `AGENT-WORKFLOW.md`. Its ability to read PDF or image attachments depends on that host; this package does not perform OCR. No model evaluation of extraction quality has been completed. A real SDK client round trip is tested; the listed desktop hosts have not each been tested in this release.

## Available tools

| Tool | Input | Output |
|---|---|---|
| `tradecheck_import_tables` | PO/invoice header metadata, CSV/TSV text and explicit zero-based column mappings | Unreviewed structured data, unknown prior history |
| `tradecheck_example` | `{}` | Stable fictional input and contract |
| `tradecheck_reconcile` | `{data, offset?:0, limit?:20}` | Summary, a page of findings, total finding count, next offset |
| `tradecheck_supplier_draft` | `{data, language?:"en"}` | Unsent subject/body with up to 20 exception/gap items |

Read `tradecheck://contract` for scope. Use the example JSON instead of inventing fields. Decimal numbers must be strings. Unknown required amounts must be resolved; blank is not zero. Keep `history_status:"unknown"` when earlier invoices may be missing. Set `extraction_reviewed:true` only after a person reviews the fields against the original documents.

## What is checked

Exact PO/supplier identifiers, currency consistency, explicit PO line mapping, SKU and unit, unit-price changes, cumulative supplied quantities, repeated supplied IDs, line/subtotal/header arithmetic. Legitimate partial billing is informational. All calculations use integer decimal scales and half-up rounding per line. Monetary totals use two decimals, or whole yen for JPY. Quantity supports three decimals and unit price four.

Supported currencies: USD, EUR, GBP, CAD, AUD, CNY, SGD, CHF, JPY. No FX or unit conversion. A matching SKU is not enough to infer a PO line. The input supports at most 100 PO/current lines, 20 earlier invoices and 1,000 earlier lines. Reports paginate at 25 findings maximum; each finding includes up to six source locators and an explicit `refs_omitted` count. The browser/full JSON report retains all supplied references.

## Limits that affect the result

- Two-way matching cannot verify delivery, receipt, quality, contract acceptance, customs, sanctions, bank details or payment eligibility.
- Source references and completeness are caller assertions. They are not cryptographic evidence or independent document verification.
- No negative values, credit notes, deposits, discounts, tax validation or alternate rounding conventions. Such documents require a different workflow.
- Price variance is a **signed total across comparable matched lines**, not an overpayment, saving or recovered amount.
- An empty exception list means only no exceptions in the supported supplied data. `payment_authorized` is always false.
- Chinese drafts use a Chinese introduction and preserve English diagnostic lines; the assistant may translate them while preserving values and references.

## Privacy and operation

The MCP makes no network requests, reads no document paths, stores no documents and has no telemetry. It only processes values the caller supplies. Your AI assistant may send attachments and tool data to its model provider; its fees and data terms still apply. The public browser demo runs locally. Optional site events contain no document data.

No paid service is enabled. The proposed €29/month team workspace is research only; saved histories, supplier mapping and batch management are not available. Beta use is governed by `LICENSE.txt`; dependency licenses are in `THIRD-PARTY-NOTICES.txt`.

## Development and verification

```sh
npm run build
npm test
npm run demo
npm run package
```

The package command stages an explicit allowlist, including the tested build, fixtures, documentation, sources and pinned dependencies manifest. It excludes repository contents, credentials, node_modules and buyer documents. Verify the download against `SHA256SUMS`.

The protocol and decimal contract tests are not a measurement of LLM, OCR or commercial accuracy. See `EVALUATION.md` for independent read-only protocol scenarios when included.

## Spreadsheet input in v0.2

Paste CSV or tab-separated cells including headers. The browser previews five rows and all mappings; up to 100 data rows are imported. Columns must be explicitly mapped with no reuse. Filenames and physical row locators are preserved. Every header amount, currency, supplier and order ID is required. Localized decimals and numeric formulas are rejected; unknown charges are never zero-filled. Prior history begins unknown and extraction_reviewed begins false. Confirm against original documents before reconciliation. The MCP accepts the same text and zero-based mappings through tradecheck_import_tables.

Release archives use a fixed timestamp and explicit source allowlist. Bump the package/download version when release contents change. The audit report schema remains version 0.1.0; package version 0.2.0 adds input preparation without changing report semantics.
