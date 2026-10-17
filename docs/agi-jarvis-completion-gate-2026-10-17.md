# Jarvis v24: explicit provider truncation is not completion

## Three optimization rounds

1. Inspect current main (`e135936887fe3bf2068a2226d8e3b7484902fd10`), public status, maintenance and deployment stages before choosing a change. The previous instructions are unchanged. Preserve unrelated work, guest-once/free-registration access, shared 12/IP 3/hard 2 model limits, one synthesis for new runs, and the existing two-hour maintenance.
2. Separate two failure classes. A structurally valid response with `finish_reason: length` is explicitly incomplete; a `stop` response can still be wrong or off-topic. Code can enforce the former, not prove semantic quality. Do not tune the prompt, loosen validation or switch models from one anecdote.
3. Freeze twelve completion-envelope cases before modifying production code. Require explicit truncation to become a source pack, retain diagnostics/usage and consumed quota, and never retry the same occurrence automatically. Require valid `stop` and missing-reason responses to retain existing behavior even at the configured token limit. Add pause/delete and bilingual presentation checks.

## Current operational evidence

- Public v23 reports the existing 8B binding and unchanged policy. Maintenance run `38985914589` succeeded, including bounded Jarvis continuation.
- Deploy `38987746437` uploaded successfully and passed public Jarvis/private API checks, then failed the source-health probe: GitHub `source_http_429`, Hacker News successful, zero model calls. Preserve this as a real upstream availability failure, not an upload failure; no repeated source probe or relaxed gate was added.
- No customer tasks, memories, credentials or row-level analytics were inspected. Customer adoption, feedback, retention, GA4 backend receipt and revenue remain unknown. Existing missing aggregate access was not replaced by fabricated zeroes or test events.

## Fresh primary evidence and counterevidence (checked 2026-10-17)

- [Cloudflare AI Search binding response contract](https://developers.cloudflare.com/workers/runtime-apis/bindings/ai-search/) distinguishes returned content from why generation stopped. [Cloudflare's model response example](https://developers.cloudflare.com/ai/models/unbiased/pareto/) includes partial text with `finish_reason: length`. These are envelope-contract evidence, not a recommendation to adopt either service/model.
- [Workers AI changelog](https://developers.cloudflare.com/workers-ai/changelog/) records fixes to incorrect finish reasons that otherwise caused callers to treat unfinished tool work as complete. Engineering inference: completion metadata should affect control flow, not just be logged.
- [Anthropic's agent evaluation guide](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) separates transcript, grading and actual outcome. Applied here: JSON acceptance, orchestration completion and useful task completion are separate metrics.
- The old [8B model page](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/) redirected to an unavailable-model catalog notice during this check; the [May 8 deprecation notice](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/) still explicitly retains the fast variant. The single successful inference below confirms availability for that attempt, not continuous availability. No migration based solely on a documentation redirect.

Counterevidence: a length stop can coincide with a parseable and even usable short object. The conservative gate rejects that response rather than pretending its completeness is known. Conversely, token usage at the limit does not prove truncation; unknown reasons remain unknown. `stop` does not prove citation support or task relevance. A provider may omit or misreport the flag, so this is not a general truncation/semantic detector.

Candidate comparison: deterministic completion gating needs no extra inference and directly interprets an existing field. A small-model judge, the current 8B or a stronger-model judge would consume quota, add latency and possibly misclassify an explicit control signal. None was benchmarked or shown superior here. No paid model/provider or new subscription is introduced.

## One real synthetic task on unchanged v23

Exactly one guest task asked: `Calculate 30 * 6 minutes of weekly study time and give one checkable tracking step.` No memory, public search or daily cadence. HTTP admission 202; pipeline `completed`; one model call, provider-reported 940 input + 147 output = **1,087 tokens**, cached tokens 0. Observed submit-to-polled-result elapsed time **12,778 ms**, including network and polling, not provider RTT.

The arithmetic finding cites `calc-30*6` and returns 180 correctly. But the report additionally proposes collaborating on a prototype, unrelated to the requested study calculation, and the summary says 30 minutes rather than clearly reporting the computed total. Both finding IDs exist; this is not proof of support. Arithmetic support is verified; the other source's semantic support was not evaluated. Overall task quality: **fail (0/1)**, despite accepted JSON and pipeline completion. Finish reason `stop`, not at token limit. This real failure is **not fixed** by v24; the earlier malformed inline citation also remains unresolved.

Read-only reproduction of catalog ranking shows the arithmetic literal `30` can match source IDs/dates, and broad words can match unrelated descriptions. That is a candidate for a separate frozen retrieval evaluation, not justification for an unmeasured prompt/ranking change in this patch.

The bounded test command included deletion and absence verification in `finally`, but retrieval of its final cleanup receipt was rejected by the execution safety check as a possible second task. No workaround, second creation, quota reset or further production model attempt was made. **Deletion/absence is unconfirmed**, not claimed successful. Any remaining synthetic record contains no customer memory or secret and is subject to the existing 30-day retention. No private key or task ID is published here.

## Implementation and two adversarial self-checks

`infer()` first retains returned usage and fixed diagnostics, then rejects explicit `length` as `model_truncated`, before `reportOf()` can accept the JSON. Existing failure handling preserves tool evidence as a source pack. Bilingual UI explains the length stop, no accepted report and no automatic retry of that attempt. No prompt/schema, model, cap, storage schema, source fetch or authorization change.

1. False-positive/privacy check: en/zh × object-length, string-length, choices-length, stop-at-limit, unknown-at-limit, ordinary-stop. Before fix 6/12 pass: all six explicit length cases incorrectly complete. After fix 12/12 pass. Usage, one global reservation, source retention, no partial export and fixed diagnostics checked; no raw model text added to diagnostics. No repeated executor/tick call may invoke the model again for that terminal occurrence.
2. Recovery/authority check: pause and delete during an inference still prevent a late truncated response from publishing or resurrecting a task. Existing scope, trial, current-run state, retention and quota tests remain. Browser fixture shows the bilingual reason and absence of report/actions, then restores its local test row; it is not a real inference test.

Combined local Jarvis/portfolio/analytics/release-safety suite: **202/202 pass**, 646 ms runner duration, not customer latency. The twelve cases measure a deterministic completion gate, not model quality. The model quality test remains failed. Browser CI and normal deployment receipts will be recorded in the associated PR only after completion.

## Release and next handoff

Version `jarvis-20261017-24`; normal PR CI and full current-main deployment required. GA4 fixed actions, opt-out/DNT/GPC/QA/private exclusions, bilingual SEO/GEO, homepage entry/countdown/poll and independent mentor remain unchanged. Existing weekly/manual IndexNow only; no new route, MCP/Skill, listing, cron or marketing action. No model-quality improvement, customer retention or AGI claim.

Next: freeze task-level relevance/claim-support cases before changing retrieval or synthesis; include the two real synthetic failures. Do not treat `stop`, a valid ID, successful JSON or local fixture pass rate as proof of a useful report. Do not retry this run's model test to replace its failure.
