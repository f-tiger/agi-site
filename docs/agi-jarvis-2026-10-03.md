# Jarvis: bounded research agent, first release

Owner instruction on 2026-10-03: autonomously explore a useful personal agent inspired by Muse and dots, use available sandbox compute, and deliver it on the existing AGI site. Routine implementation, GitHub writes, deployment and continuing iteration are authorized. This is not evidence that AGI has been achieved.

## Three refinement passes

1. Outcome: a person can bring a real AI work, learning or product-research goal and leave with sources, a specific next action and a completion criterion. The long-term ambition is a persistent assistant; first-user segment and willingness to pay remain hypotheses.
2. Constraints: current sandbox has 9 CPU cores and an 8 GiB cgroup memory cap, no observed GPU. Reuse the existing Worker, D1 and AI binding. Do not train a foundation model, add a provider subscription or treat transient sandbox processes as persistent hosting. Preserve the existing AGI content, countdown, poll and the separate ecommerce-reporting mentor.
3. Acceptance: real persisted tasks, bounded allowed tools, user-controlled memory, evidence-bearing results, clear model failures, bilingual mobile flows, privacy controls, analytics, live deployment checks and a continuing development job.

## Product evidence and decision

Official sources checked on 2026-10-03:

- Meta's [Muse introduction](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/) and [design discussion](https://introducing.muse.ai/) describe persistent goals, memory, a dedicated computer and inspectable activity. These are vendor descriptions, not independent proof of retention or accuracy.
- OpenAI's [dots page](https://chatgpt.com/features/dots/) emphasizes ongoing responsibility, memory, connected tools and progress between conversations. We borrow the task-continuity principle, without claiming parity with its compute or capabilities.
- [OpenDots source](https://github.com/diggerhq/opendots) separates coordination, project memory and workers. Its hosted OpenComputer account requirement adds another dependency; this release uses the owner's existing infrastructure instead. No code was copied.
- Cloudflare's [model deprecation notice](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/) explicitly retains `@cf/meta/llama-3.1-8b-instruct-fast`. [Worker limits](https://developers.cloudflare.com/workers/platform/limits/) distinguish the HTTP `waitUntil` extension from scheduled execution. We checkpoint within the HTTP extension rather than assume unlimited execution.

Inference: users may value a smaller assistant that is affordable, remembers their constraints and makes its sources and limits visible. This remains an experiment. Existing chat products may already do the job better; merely adding another chat surface is not a defensible business.

## Delivered scope

Entry: `/jarvis` and `/zh/jarvis`, linked from the generated homepage Future Guide area. White, blue and asymmetric workspace follows the existing site design: mission list, goal composer, evidence/result pane and editable device memories.

Execution: durable request → catalog observation → model plan → at most three allowed read-only tool actions → model synthesis → output/citation-identifier validation → saved result. Catalog includes reviewed editorial opinions and the existing daily-discovered video/podcast metadata; these are explicitly different evidence types. Optional GitHub/Hacker News searches use exactly the user's public keyword field. Private memories cannot be substituted for that field by the model. Arithmetic uses a small parser, never eval. Sources never grant tool permissions.

Persistence: random 256-bit browser capability; only its SHA-256 hash is stored on the server. Owner-filtered reads/writes, same-origin mutations, no CORS, no-store/noindex private APIs, no keys in URLs. Editable memories stay local unless selected for a submitted task. Cloud tasks and selected context have 30-day retention; deletion removes the active task. No cross-device recovery is provided; clearing the browser key loses access. Maximum 3 active and 20 saved tasks per owner, 3 admissions per IP window and 24 site-wide admissions/day. Saved inputs are not encrypted at the application layer; do not submit sensitive data.

Continuity: The existing two-hourly maintenance workflow selects at most two due tasks through an authenticated bounded runner. Scheduling may be delayed. HTTP runs checkpoint before exceeding their time budget; completed planning/tool work is reused. Explicit pause/delete prevents subsequent tool calls or stale completion writes. Interrupted leases remain visibly interrupted, available for manual retry. Daily watches run up to seven occurrences in seven days. Results are visible in the workspace; no email, Telegram or push notifications are promised.

Compute: smaller 8B model for this pilot; New runs use a fixed evidence workflow and one synthesis call capped at 1,400 output tokens. A persisted pre-v3 checkpoint can still total two calls; the hard ceiling remains two. It shares Relay/Mentor's existing 12-attempt global window and 3-attempt IP window; failed attempts count and no limit is raised. Source retrieval survives model failure with an explicit source-pack label. This does not establish equivalence to a larger model or savings relative to a measured baseline. Actual provider usage is stored when returned; unknown usage remains null.

Revised scheduler accounting: reuse the existing two-hourly maintenance job (12 existing runs/day); add zero job starts and zero Worker cron slots. The new step has a four-minute timeout ceiling: 48 added runner minutes/day or 1,440/30 days is a configuration ceiling, not measured consumption. Empty queues do not infer. At most 2 due tasks/check; global model budget remains unchanged. Indexed empty-queue checks and bounded cleanup avoid scanning analytics tables. Existing hosting resource usage may change; no new subscription, paid compute purchase or unbounded API spending is authorized by this release.

## Two adversarial self-checks

Round 1, usefulness: a plan is not execution; a source title is not a reviewed article; known metadata cannot establish market demand or product reliability. The UI distinguishes the actual research/tool record, model synthesis, proposed next actions and the user's still-uncompleted real-world goal. No AGI claim, automatic income claim, testimonial or paid Jarvis entitlement.

Round 2, failure and resource control: challenge concurrent starts, duplicate requests, arbitrary tool names, source injection, forged citations, cross-owner reads, model errors, rate limits, deletion during inference, expired leases and browser closure. Atomic insert/lease updates, strict typed tools, explicit public keywords, bounded bodies and a persisted continuation close those concrete failure cases. Citation-ID validation is not semantic fact-checking. Local tests use model fixtures; they do not demonstrate live model quality.

## Measurement and distribution

Free value: private source-linked research tasks, memory selection, daily research watches and export, subject to disclosed shared quota. No Jarvis subscription or price experiment is live. Existing AGI membership remains a separate product with unchanged entitlement. Possible paid value later: reliable recurring monitoring, cross-device recovery, more completed work and integrations, only after demand, delivery costs and payment readiness are established.

Owned distribution: bilingual homepage entry, crawlable product landing page/FAQ, sitemap, feed and generated AI-readable mirrors. External posts/messages and advertising are not part of this release. Existing weekly/manual AGI IndexNow mechanism remains authoritative; no per-push submission added. Receipt is not indexing or citation.

GA4 uses the existing `G-FZXLMBB5QB` opt-in channel. Fixed route/action-only events: start, report_ready, source_pack, source_open, export, memory_save, pause, resume, delete, feedback. Inputs, keywords, memory, task IDs, source URLs and access keys never enter these events. A report-ready event is a browser observation, not a distinct person or verified outcome. Do not infer revenue from any event. QA is excluded. GA4 frontend checks do not prove backend receipt.

First decision gate: inspect distribution before judging demand. After 30 genuine mission starts, review the fraction producing a usable source-backed result, voluntary usefulness feedback, repeat tasks and export. If most results are quota-limited, fix capacity economics/positioning before recruiting more people. If reliable results are not useful, narrow the task rather than multiply features. These are operating gates, not statistical validation; no invented visitors or zero-filled unknown metrics.

## Development continuation

Continue from latest main, preserve concurrent site changes, and select one evidence-backed improvement per iteration. Priorities:

1. Verify actual model responses in both languages under existing quota; add held-out real-task cases and compare usefulness, latency and actual usage. Never call fixture tests a model benchmark.
2. Improve task quality using explicit feedback and public sources; retain source provenance and failure history. Investigate better low-cost models only with measured evidence and within existing authorization.
3. Improve continuity, recovery, private workspace isolation and notification design before enabling private-app writes or browser control. New accounts, paid services, financial actions and external messages require their actual authorization.
4. Measure repeat use before developing a paid offer. Register an MCP or installable skill if one is actually developed; this release does not add either.

Required checks: `node --test sites/agiscorecard/tools/jarvis/test.mjs`; `node sites/agiscorecard/tools/jarvis/browser-test.mjs`; normal site validate/hreflang/home-focus and fleet GA4 checks. After generators run analytics coverage write/check. Live read-only `verify.mjs`; a separate deliberate live task checks actual inference. Do not reset the production quota to make a test pass.

## Release preflight evidence

- 18 Jarvis unit/SQLite tests passed. EN/ZH Jarvis and Future Guide browser journeys passed, including 360px layouts, source export, memory escaping, pause/delete and the new homepage entry. Model responses in these tests are fixtures.
- Real public GitHub and Hacker News metadata searches each returned four records. The deployed model and Cloudflare-side searches still require a separate live mission.
- Run 37115007321 passed all predeployment build, browser, site, SEO and GA4 checks. It did not deploy: the current-main guard detected the unrelated German trends update `f0ed85e0` during the build. Keep that update and launch a fresh build from current main; do not weaken the guard.
- New Jarvis event receipt, distinct customers, retention and revenue remain unverified. Keep private analytics account identifiers and reporting data out of this public repository.
- The hosted development automation is enabled daily at 08:00 Asia/Shanghai starting October 4. It performs one bounded iteration from latest main; it does not promise continuous sandbox execution or a successful improvement every day.

## Expanded research and runtime revision

See [the expanded research and revised experiment plan](agi-jarvis-expanded-research-2026-10-03.md), requested by the owner before further optimization. The initial live plan failed output validation, and cron registration hit the account limit; neither is counted as successful delivery. Revision 2 uses structured schemas/native JSON compatibility and the existing maintenance schedule. Twenty unit/SQLite tests cover these boundaries; actual inference must be retested separately.

## Prototype execution update (2026-10-03, v3)

The v2 release passed its complete production deployment, live bilingual/SEO/GA4 and private-runner verification. Two real synthetic attempts failed plan validation (v1: 69 completion tokens; v2: 550, at the planning limit). Neither was accepted as an AI report. Raw model output was not retained, so the precise cause remains unknown.

The first usable prototype is now the priority, per the owner's explicit instruction; scheduled development is supporting infrastructure, not the deliverable. V3 removes the planning call: deterministic catalog retrieval, authorized public keyword searches and narrowly parsed arithmetic precede a compact synthesis. It adds response/choices envelope compatibility and bounded diagnostic labels, counts and field-presence flags, never raw customer text. Privacy, source IDs, actual task state and model budgets still use code validation. Twenty-four engineering tests pass; these are **not** the proposed 24-case held-out model-quality evaluation. Real v3 inference remains a separate release check.

## Real prototype check and evidence repair (v4)

V3 deployed successfully and a real Chinese task reached one model synthesis: 1,237 input + 223 output = 1,460 tokens. Arithmetic returned 180 minutes. The real production UI loaded the private task, exported it, restored it after reload, passed 390px layout inspection and deleted the synthetic task. However, both public searches failed and the model inferred an unsupported GitHub recommendation from podcast metadata. This was **format success, not task-quality success**. The synthetic report was deleted and is not a showcase.

The connector used `redirect: error`, which [workerd's implementation](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.h) does not support. V4 uses `manual` and rejects all 3xx responses explicitly. Local real API checks returned four GitHub and four HN records. An authenticated, fixed-query production connector check is now part of deployment and uses zero model calls or customer records. Missing required public evidence blocks synthesis; fixed error codes reveal the failure class without exposing queries or remote bodies. Generated text is visibly an AI draft, with interpretations to verify against sources.

Twenty-seven engineering tests and bilingual browser journeys pass. The current caller's three-attempt inference window has been consumed; no quota is reset, raised or bypassed for another success claim. V4 production retrieval must pass the new release check, and a further complete model-quality evaluation remains pending the normal allowance. This is a bounded prototype with working cloud task lifecycle, not a validated autonomous general agent.

## V4 production receipt

Release `e512075dd3c1d850557165fc0455b9f764ab9a29` completed [deployment 37117638746](https://github.com/f-tiger/agi-site/actions/runs/37117638746) successfully. At 2026-10-03 10:52 UTC, the authenticated production connector check returned four GitHub records and four Hacker News records with `modelCalls: 0`. Public bilingual surfaces, private access boundaries, independent membership, SEO discovery and live GA4 coverage all passed the same release.

The first test prototype is live at https://agiscorecard.com/zh/jarvis and https://agiscorecard.com/jarvis. The failed semantic quality check remains failed; successful deployment, structured output and retrieval do not erase it. Next normal-budget experiment should prioritize public-source relevance and claim support, then evaluate a complete post-repair task. Do not add another scheduler as a substitute for this product work.

## Claim-level source inspection (v13, 2026-10-07)

Citation-ID validation still does not establish semantic support. V13 therefore adds a collapsed, deterministic source-inspection panel to every model finding and carries the same claim-to-source mapping into export. It uses no additional model call and labels source metadata as an inspection aid, not proof. Hostile source text remains plain text and links retain the existing HTTPS allowlist. The guest trial, free registration path, privacy controls, model, quotas and two-hour maintenance schedule are unchanged. Research basis, counterevidence and falsifiable checks are recorded in [the v13 evidence-inspection note](agi-jarvis-evidence-inspection-2026-10-07.md).

## Claim-level correction handoff (v14, 2026-10-08)

V14 lets a user turn one questionable AI interpretation into an editable correction draft. Deterministic code carries only the original goal, selected interpretation and the IDs/titles of actually cited sources; source descriptions, URLs, memories and permissions are excluded. Preparing the draft creates no task or model call, keeps the guest/free-registration gate, and resets search, cadence, memory selection and cloud consent before any new submission. It does not claim that feedback retrained the model. Evidence, counterevidence, the frozen 12-case experiment and adversarial boundaries are recorded in [the v14 finding-correction note](agi-jarvis-finding-correction-2026-10-08.md).
