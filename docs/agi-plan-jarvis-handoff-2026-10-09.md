# Selected-plan continuity: Future Guide → Jarvis

This release connects one explicit `distribution-opportunity` plan to a reviewable Jarvis draft. It does not diagnose, repair or execute a workflow, prove AI semantic quality, establish customer demand or add a paid offer.

## User path and privacy contract

1. Review the existing business receipt and self-report three fit answers. Explicitly attach them and optionally save the existing local plan.
2. Choose “Prepare this plan in Jarvis.” Only the selected plan plus known claim/version/fit travels in same-tab `sessionStorage`, at most 16 KiB, for 30 minutes. The fixed public URL marker is `from=future-guide-plan`; no user text, fit, key, JSON or file is placed in the URL.
3. Review the plan, stop condition and canonical evidence. Apply only to an empty goal. Overlong plans are rejected whole, never clipped. The visitor may edit the visible goal; only its final text is submitted. The original local plan remains unchanged, and no hidden old plan is transmitted.
4. Manually choose cloud consent and Start. Neither navigation nor Apply creates a task, enables public search, selects memories, registers an account or changes the trial. Existing limits and task retention remain unchanged.
5. A saved task or source pack retains the canonical receipt on reopen/export, including model-unavailable and quota failures. AI drafts are labeled unverified. The first outcome is an inspectable saved task/source pack, not a completed diagnosis.

API context accepts exactly `kind`, `claimId`, `evidenceVersion`, `fit`; only the known type, claim/version pair and three boolean/null fit fields are accepted. URLs, body text, verification flags and extra fields are rejected. The server rebuilds three pinned evidence sources from `commercial.mjs`; those sources cannot be displaced by six-item initial ranking or the ordinary fourteen-item pool (total bounded at seventeen). Recovered checkpoints rehydrate this canonical evidence. No existing quota, schedule, member access, pricing or database interface is expanded. New frontend writes include the already-authenticated workspace scope in a same-backend header; the server rejects mismatches with a generic 409 before saving. Context-bearing creates require that header. Existing clients without context remain compatible; supplying a mismatched header always fails closed. No secret, new persistent identifier or analytics field is introduced.

Pending and applied context is cleared on cancellation, workspace/key changes, sign-out and leaving the page. An envelope is deleted before parsing, so expired, malformed and repeated transfers do not replay. Any missing/negative fit suppresses a maintenance recommendation; fit remains self-reported, never actual validation.

The CSV branch opens the existing Earn delivery lab and asks the visitor to select workflow mode. It checks counts, repeated run IDs and empty outputs. It does not reconcile individual business records, collect execution logs, identify a failure cause or fix a workflow. No CSV goes to Jarvis.

## Measurement and release acceptance

Existing `jarvis_start` occurs after save succeeds; `report_ready`, `source_pack`, `export`, `followup_start`, `correction_start`, feedback and self-reported action-progress events remain available. No new event parameters, user identifiers or analytics modules are added. The shared collector emits canonical page URLs and only referrer origins; therefore these events measure aggregate Jarvis stages, not reliable attribution of this specific path or individual repeat usage. The URL marker is not retained in those analytics. Handoff clicks are not outcomes; registrations are not payments.

Keep the original thirty-voluntary-real-task Jarvis learning threshold and Earn's original twenty-eight-day observation window. Local QA tasks exist only in in-memory fixture databases and are excluded from analytics; they do not contribute to the real-task threshold. Offline fixed-AI and no-AI fixtures demonstrate mechanics and boundaries, not useful real-world model output, traffic, payment readiness or revenue.

Both existing language URLs, canonical/hreflang, metadata, source dates and private/noindex exclusions remain. Bilingual FAQ/Markdown and existing AI-readable mirrors describe the bounded handoff. GA4 coverage must pass after the normal generators. IndexNow continues through its existing eligible-URL schedule; this change adds no per-push submission or indexing/citation guarantee.

Verification uses original unit/security/membership/screening tests plus handoff contracts, backend save/fallback/recovery tests and local-only browser fixtures (English/Chinese, 360/1440 px, happy and rejected/interrupted paths). Browser requests outside localhost and runner external fetches are blocked. The local executor cannot launch Chromium because its socket syscall is denied; browser acceptance must come from the exact draft-PR CI revision, not this local launch attempt. Publication uses the existing non-destructive AGI push publisher and preserves unrelated current-main commits.
