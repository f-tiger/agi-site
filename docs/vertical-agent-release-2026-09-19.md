# Verified vertical Agent expansion — 19 September 2026

## Public deliverables

- FilingLens: https://filinglens.agiscorecard.com/
- FilingLens beginner guide and MCP setup: https://filinglens.agiscorecard.com/guide
- TradeCheck v0.2 workbench: https://rfqdesk.agiscorecard.com/agent
- TradeCheck guide: https://rfqdesk.agiscorecard.com/agent-guide
- English and Chinese distribution entries: https://agiscorecard.com/invest and https://agiscorecard.com/zh/invest

FilingLens is a new, independent SEC same-period fact comparison experiment. TradeCheck now prepares supplier/PO data from CSV, TSV and pasted spreadsheet cells with visible column mapping and source rows. Both have working local MCP downloads. The source repository remains private.

## Release evidence

Feature commit: `9fa4f8ae48769a4dc93882639be67b8014f33e03`.
Final deployed Worker commit: `7a684f6c1a20dda8e8b0ab39c6262ae7d236847e`.
Final successful portfolio run: https://github.com/f-tiger/agi-site/actions/runs/35410099005 (job `105807848963`).
Main investment-hub run: https://github.com/f-tiger/agi-site/actions/runs/35409579569 (job `105806311691`) — successful generation, validation, deployment and public smoke checks.

The final portfolio run passed both MCP builds/tests/evaluations, site tests/build, domain ownership preflight, Cloudflare deploy, four-host page/event checks, TradeCheck checksum check, the real FilingLens SEC lookup and the non-QA aggregate report. The existing paper-ledger automation committed concurrently; its update was preserved when the fix was based on the newer main tree.

The initial deployment had a real SEC lookup failure, correctly caught by its smoke gate. Direct official lookup and local endpoint validation worked while the edge endpoint failed during `source_fetch`. The request handling was hardened: explicit timeout lifecycle, optional cache failures, stream cleanup, stage-specific failure codes and explicit `manual` redirect handling that rejects non-success responses without following another URL. The final edge lookup returned validated SEC JSON and passed CI and browser interaction. The original exception text was not captured, so this record does not assign an unproven provider outage or a narrower root cause.

## Verification

- **50 automated tests:** TradeCheck 18, FilingLens 10, portfolio/Worker/API 22.
- TradeCheck independent contract evaluation: 10/10 questions and 230/230 assertions.
- FilingLens independent black-box evaluation: 10/10 questions, each repeated with a fresh process; 20 sessions and 96 substantive tool calls. Separate TradeCheck table import success/repeat/rejection checks also passed.
- Black-box review found input-order-sensitive truncated citations; deterministic source sorting fixed it and the independent evaluator reverified it.
- These are deterministic engine/protocol results, not host-LLM reasoning accuracy, buyer demand or financial outcomes.
- Browser desktop visual inspection: FilingLens hero, source controls, report and beginner entry rendered coherently. No mobile viewport was available, so no device-level mobile QA is claimed.
- Browser TradeCheck: fictional table preview/mapping → prepare → field confirmation → report with **€44.00 variance, one exception and one unknown-history gap** → export link. Clearing own inputs gives an actionable empty-input error. The table sample intentionally has no prior invoices.
- Browser FilingLens: fictional comparison produces **−2,000,000 USD** with no fake source links. Official Apple Assets lookup displays its actual retrieval timestamp and SEC source. A real comparison for **2026-06-27** returned **383,266,000,000 USD** on both selected cutoffs, using filing **0000320193-26-000020**, filed **2026-07-31**; it correctly reports no value change. This is a source-data check, not an assertion about investment merit. Plain-text evidence export was prepared successfully.
- Both investment pages returned HTTP 200 with the `src=agi` FilingLens entry.

## Public archive verification

Downloaded from the deployed sites, verified against each published checksum before extraction, and inspected for out-of-scope paths. Both downloaded packages installed their locked dependencies and passed their tests. The downloaded FilingLens package also reran the independent 10-question evaluator successfully.

| Archive | Bytes | SHA-256 |
|---|---:|---|
| `tradecheck-mcp-0.2.0.tar.gz` | 89,832 | `7cc472285052ad8538b34d4d9ccdf706d8e6c7b3ae9132f107cc09b04a8d9aa7` |
| `filinglens-mcp-0.1.0.tar.gz` | 26,015 | `fa325062f66330b1eb0e3670edfab61a7218b45726301a5f4b3921e266c018b8` |

Packages contain only the explicit reviewed package allowlist, not the monorepo or installed dependency tree. Both remain internal-evaluation betas. No hosted model calls, paid service, new database, cron or advertising expense was introduced.

## Commercial status

At **2026-09-19 00:40 UTC**, the successful CI aggregate report showed **zero non-QA opt-in events** across the four portfolio hosts. That does not mean zero visitors: measurement is optional, identifiers are per visit, and there is no verified retention or buyer count. QA events were excluded. There is **no newly verified revenue or paying buyer** from these tools.

FilingLens's €19/month and TradeCheck's €29/month workspace proposals are explicit price-interest experiments; the paid workspace features do not yet exist and checkout remains closed. The portfolio objective remains progressing from approximately €11 to €110 and €1,100/month, with positive contribution and repeat purchase evidence before scaling. User acquisition and willingness to pay are still the main unknowns. See the assumptions, alternatives and decision gates in `docs/vertical-agent-expansion-2026-09-19.md`.
