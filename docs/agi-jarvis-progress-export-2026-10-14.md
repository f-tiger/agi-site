# Jarvis: portable self-reported progress — 2026-10-14

## Decision and three optimization rounds

1. Audit current main, public v22 status, maintenance and existing deployment results; retain one free guest task followed by free registration. Customer usage, retention and feedback aggregates remain unknown. No customer task or memory was inspected.
2. Compare deterministic state export with the existing 8B model and a stronger-model candidate. The fixed states already exist: model rewriting has no demonstrated benefit and would add failure modes and quota use. No cross-model quality experiment was run.
3. Freeze the bilingual export-state contract and select the smallest change: include current-run self-reported action state and recorded time in Markdown. No new inference, persistence, telemetry event, retry, import or automatic execution.

## Primary evidence, inference and counterevidence

Consulted 2026-10-14: LangGraph's official [persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence) and [checkpointer](https://docs.langchain.com/oss/javascript/langgraph/checkpointers) documentation describes thread-scoped snapshots with state and creation metadata for inspection and recovery. Engineering inference: a portable report that loses known action state is less useful for manual continuation.

Counterevidence/limits: Markdown is not a runnable checkpoint; it cannot recover execution or update itself. A user's completed marker is not verified real-world completion. State can become stale after download. Documentation does not establish customer demand or retention improvement. This change therefore makes a narrow export-fidelity claim only.

## Frozen falsifiable experiment

- Twelve contracts: English and Chinese × tried/completed/blocked/unknown/prototype-like/null states. Only known states receive labels and valid timestamps; unknown states remain unmarked.
- Original v22: 0/12 contain required progress fields. Candidate v23: 12/12 contain them. These are synthetic serialization checks, not customer or model task completion rates.
- Additional adversarial cases reject malformed timestamps, ignore unrelated action indices and arbitrary receipt properties, omit private memory/old results, preserve input immutability, and avoid inventing action receipts for source-only packs.
- Local Jarvis/security/membership/screening/handoff suite: 121/121 passed. The initial full run took 513 ms locally; this is test duration, not model latency.
- Browser assertion added: mark completed, reload, export the persisted label and timestamp; assert no private key/memory, no new task and no extra model calls. Local Chromium download returned a truncated archive; browser acceptance is delegated to the existing PR CI, not claimed passed locally.

## Two adversarial self-checks

1. Trust/privacy: fixed own-property state allowlist; safe integer dates; existing Markdown escaping; no export of extra receipt fields, private memory, old result or credential. Existing API current-run scope, ownership and deletion tests remain in the release suite.
2. Recovery/cost: source packs gain no invented outcome; new report states remain isolated; export is read-only and does not run tools, consume model quota, change task count or mark work complete. Bilingual FAQ explains snapshot staleness and the self-report boundary.

## One real synthetic acceptance, not a quality pass

Exactly one live guest task asked for `30 * 6` weekly study minutes and a checkable tracking step. It completed through the normal queue with one model call: 857 prompt + 108 completion = 965 provider-reported tokens; cached tokens 0. Recorded pipeline observe-to-verify interval was 2.033 seconds, not isolated provider RTT or end-to-end browser latency.

Arithmetic finding and its structured calculation citation were correct (one supported finding out of one). However, the summary ended in a broken inline reference and retrieval included irrelevant catalog metadata. Overall output quality therefore failed despite pipeline completion. No retry was used to replace the failed evidence; no model prompt was changed on this single case. A future prompt/retrieval change needs a frozen semantic task set first. The synthetic task was deleted through its own capability and absence confirmed; quota/trial receipts were not reset.

## Release boundaries and continuation

Version: `jarvis-20261014-23`. No quota, membership, cron, homepage, mentor, security header, analytics payload or IndexNow scheduling change. Generated bilingual HTML/Markdown retain canonical/hreflang, FAQ schema and agent-readable discovery. Existing analytics coverage was run after generation; unrelated generated rewrites were removed from this scoped change. Public existing status confirms model binding, not continuous model availability.

Most recent inspected deployment stopped at independent membership secret configuration before upload; root cause is not established here. No credential repair, protected-workflow change or bypass was attempted. Publication requires green browser/CI checks, current-main guard and the existing deployment; until verified, the live site remains v22. Do not call a merged commit a verified deployment.
