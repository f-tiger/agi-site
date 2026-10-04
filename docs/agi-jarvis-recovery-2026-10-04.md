# Jarvis: preserve progress on recovery

Date: 2026-10-04. Release: `jarvis-20261004-7`. This is an engineering reliability iteration, not an AGI or model-quality claim. The owner's latest membership-only instruction and the v6 membership release supersede historical free-pilot statements.

## Brief and adversarial checks

1. Clarify: make a member's interrupted research task resume its saved work without silently restarting or losing the preceding daily summary.
2. Strengthen: compare deterministic recovery with asking the small model to reconstruct progress or adopting a larger model. Keep member checks, explicit public keywords, bounded quotas, pause/delete and 30-day retention.
3. Operationalize: reproduce failures against fixed synthetic cases before changing execution; require checkpoint/call-count assertions, the existing security and membership suite, bilingual browser checks and the existing production release gates.

Self-check 1: resume is not necessarily better than refresh. A new daily occurrence must still fetch fresh evidence. Checkpoints only describe saved operations; an in-flight read may be repeated. This release does not promise exactly-once external execution.

Self-check 2: provider success can occur before the result is committed. Silently retrying can spend twice. Persist a synthesis-start marker before calling; an uncertain outcome becomes an explicit source pack. Also recheck entitlement before saving a verified report, and compare the original saved result in the atomic resume update so a stale request cannot overwrite newer progress. No approval or quota bypass.

## First-party research and alternatives

Sources checked 2026-10-04:

- [LangChain persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence) distinguishes thread checkpoints from long-term stores. [Its workflow discussion](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph) explains that checkpoint boundaries determine how much completed work is repeated. Inference: our existing D1 checkpoints are sufficient for this repair; adopting a framework or more memory is not necessary.
- [AWS durable-execution idempotency guidance](https://docs.aws.amazon.com/durable-execution/patterns/best-practices/idempotency/) distinguishes safe replay from an uncertain side effect and describes recording an attempt before execution. Counterevidence: a checkpoint alone is not exactly-once delivery, and an explicit new retry can still execute again. We therefore do not replay an uncertain synthesis within the same occurrence; a later explicit new run remains bounded by the original quotas.
- [Cloudflare's 2026-05-08 model notice](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/) still lists the existing Llama 3.1 8B `-fast` variant as active. Its standalone model page returned 404 in this check; documentation status and an AI binding do not prove a successful inference today.
- The [Llama 3.3 70B fast model page](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/) is available as a stronger candidate. It was not called or deployed. Model size cannot establish recovery correctness or better claim support.

| Candidate | Suitability for this defect | Measured conclusion |
|---|---|---|
| Deterministic D1 checkpoints | Exact saved-step and attempt bookkeeping, no inference needed | Selected; failures reproduced and repaired locally |
| Existing 8B synthesis | Can draft the result, cannot infer whether an external call committed | Model unchanged; semantic quality, real latency and tokens not remeasured |
| Larger 70B candidate | Could improve synthesis, but cannot repair lost execution state | Not evaluated; no new model usage or billing |

## Frozen recovery experiment

The first five synthetic cases were fixed before implementation. All five failed on v6 and pass on v7; this is a 0/5 to 5/5 engineering regression result, not a held-out language-model benchmark. Two further fault-injection cases were added during adversarial review.

| Case | Observable completion criterion |
|---|---|
| Paused legacy task | Saved calculation/source and occurrence timestamp survive; finished tool does not rerun |
| Interrupted legacy task | Same saved-step preservation; one terminal occurrence is counted |
| Uncertain synthesis | Zero further provider calls; previous attempt count retained; explicit `model_interrupted` |
| Verified report saved before interruption | Finalizes saved report with zero further provider calls |
| Yield during daily follow-up | Prior summary reaches synthesis and stays in history; a new daily occurrence still executes fresh tools |
| Pause during synthesis | Actual persisted start marker prevents a repeated provider call after resume |
| Pause during second public read | First saved search executes once, unfinished read may repeat; only one search reservation and one synthesis |

All 56 Jarvis engineering tests pass, including existing member revocation, cross-member isolation, quotas, CSP/input boundaries and deletion. The five fixed recovery cases took approximately 6–9 ms each in local SQLite/provider fixtures; this is not production latency. Real provider calls in this iteration: zero; real token consumption: zero. Citation semantics and customer task-completion rate remain unknown. Existing synthetic citation-ID checks are not evidence of factual accuracy.

## Product and operational boundaries

Public version, member denial and recent AGI deployment/maintenance status were checked before editing. No customer task text, memory or access key was read. No active paid test credential was supplied, so this iteration does not create a membership, impersonate a customer, or bypass entitlement to run a model test. Private lifecycle/feedback aggregates are unavailable through the existing public surface; no numbers are invented. Private analytics results and identifiers are not committed here.

Completed steps stay recoverable until the occurrence settles. A confirmed report is saved before finalization. Missing/uncertain model output remains clearly labeled; the call is not silently repeated. Historical v6 incomplete checkpoints are handled conservatively. A fresh manual rerun or the next scheduled daily occurrence is still a new bounded occurrence. Existing global 12/IP 3 allowance, max two legacy calls, maximum seven occurrences, two-hour maintenance and retention remain unchanged.

Distribution is the existing bilingual Jarvis landing page and homepage entry. FAQ and AI-readable mirrors explain recovery in both languages; no new landing page or external campaign. Existing opt-in fixed Jarvis resume/completion/export/feedback events remain; no task content or recovery state is sent to analytics. Member payment and free public product information remain as in v6, with no new price or promise. Existing weekly/manual IndexNow continues; no per-push submission. No MCP or skill was developed.

## Release verification

Pending deployment receipt. Local site validation and hreflang pass. Home-focus check required its normal date-based regeneration and then passed; unrelated generated home/navigation content is not included in this change. GA4 coverage write/check passed after generators. Bilingual browser tests passed: member gate, create/report/export/pause/reload/delete, logout with stale response, separate member memory, CSP/XSS and 360px layout. Production release gates remain pending.

Next bounded iteration: evaluate source relevance and claim support with an authorized member test task under normal quota; retain the planned 24-case semantic evaluation as unexecuted. Do not treat this recovery set as that evaluation.
