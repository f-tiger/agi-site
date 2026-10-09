# Jarvis metadata evidence repair, 2026-10-09

## Status and narrow scope

This change is a draft, not a production release or a commercial validation. It repairs the explicit GitHub-metadata, one-candidate reading/screening path. Other Jarvis tasks still use the existing model synthesis and remain unverified AI drafts. No general natural-language truth or task-completeness verifier is claimed.

Base: `ad63598f694f8befbee1b48a3664b7cde085f50e` (`jarvis-20261009-15`). Ordinary push/merge into `main` is **not safe to use as the release action yet**: the AGI publisher configures persistent secrets and calls a membership watcher that can delete expired records. This PR does not modify or dispatch that publisher, the Jarvis daily schedule, or any operation runner.

## Frozen observation and baseline

The fixture in `sites/agiscorecard/tools/jarvis/fixtures/` is reconstructed from one normal guest task's native Markdown export, not a raw provider request/response. It contains public search metadata, the QA prompt and output, and no capability, account identifier, task identifier or credential. The saved/reopened export bytes were identical; SHA-256 is `a251870465f1146028d58b56514caf3add2218af3447a1e03454f4328847b046`.

The actual v15 output chose `obra/superpowers`, then added an unsupported human-centric agent purpose twice. The returned description was only “An agentic skills framework & software development methodology that works.” Citation identity passed, but did not support that expansion. The executed `3*60=180` was listed only in sources, and the next-step acceptance condition was merely understanding the project's principles and goals.

Comparison uses the **same returned evidence offline**. It is not a second live task, a statistical accuracy estimate, or proof of buyer demand.

| Dimension | Observed v15 output | Deterministic packet on frozen evidence |
|---|---|---|
| Candidate | `obra/superpowers` | Same, because it is first valid returned GitHub record |
| Selection meaning | Suggested as worth reading | Explicit inspection order; relevance/suitability not established |
| Description | Adds unsupported purpose | Exact retained description, attributed to publisher; possible upstream truncation disclosed |
| Arithmetic delivery | Correct tool result omitted from answer | Every executed arithmetic record delivered; explicit conversion span gives weekly hours/minutes |
| Proposed next step | Read README; “understand” | At most 30 of 180 minutes; save URL/description, README/LICENSE links or “not found”, and unresolved questions; stop at the limit |
| Unknowns | General uncertainty | License, code safety, reliability, installation, performance, returns, linked content and extra goal conditions explicitly unassessed |
| Model calls | One observed | Zero new calls in this route, proven with an inference stub that throws |
| Completion claim | `completed` AI draft | Existing `limited` state, `metadata_scope`, `taskAcceptance: not_assessed` |

A model choosing an ID and a fixed inspection action would add no demonstrated information for this narrow job, so this route uses the no-model baseline. No extra paid model or self-critique is added.

## Contract and compatibility

- Routing requires public search enabled, GitHub metadata, one candidate/project and a reading/screening intent. Known negations, comparisons, multiple candidates, license/language/deployment filters and follow-up/correction drafts are excluded. This routing hint is not a semantic completeness proof; even matched requests are visibly scope-limited.
- One coherent source record supplies repository ID, name, URL and description. Names/URLs must agree; wrong source kinds, malformed required types, collisions and missing repositories fail closed to the source pack. A podcast or HN title cannot become the repository candidate.
- Each copied field carries `sourceId`, original field name and exact retained value. Description text stays publisher-reported data, including when it contains instructions. Empty/non-string upstream descriptions are unavailable/unknown, not asserted empty publisher text. Stars, when a valid returned integer, are explicitly not a quality rating.
- Every retained arithmetic source is recalculated and checked. Every planned arithmetic action must have a matching result. Units and weekly cadence come only from the explicit parsed conversion span. Ambiguous fractions, ranges, grouping, exponents, multiple conversions and unsupported numeric forms are not guessed. A non-positive or missing budget never produces a positive time allowance.
- HN titles are separately attributed and explicitly not established as related to the chosen repository.
- Suggested inspection is a fixed, observable checklist; README/LICENSE existence is not assumed. This does not execute the next action or prove the project satisfies the user's goal.
- HTML and Markdown identify deterministic packets, current unverified AI drafts and historical AI drafts. Historical saved reports are not rewritten. Literal text and Markdown escaping are preserved.
- No D1 migration or state expansion. `limited`, daily `watching`, checkpoint/recovery, per-run progress, guest trial receipts, registration, 7-run/30-day bounds, authorization and search allowances are unchanged. Rule packets use the existing `source_pack` analytics event rather than claiming an AI report. Fixtures are not customer starts or adoption.

## Verification

- Original 71 unit/security/membership tests remain unmodified and pass.
- Fourteen new tests cover the real unsupported-claim fixture, exact field mappings, English/Chinese routing, wrong source type/identity, valid-citation-but-unsupported old output, missing/malformed arithmetic, units/cadence, unknown fields, hostile description text, adapter truncation, HTML/export labels, guest trial, save/reopen/export, and daily checkpoint/progress/seven-run compatibility.
- Current non-browser total: 85 passing. The real failure remains demonstrably accepted by the old validator, while the new packet cannot produce its free-form purpose claim.
- The two changed public Jarvis pages pass scoped GA4 coverage: existing property `G-FZXLMBB5QB`, one tag per page, with existing QA/privacy exclusions. Canonical/hreflang/schema and English/Chinese FAQ/Markdown mirrors remain aligned. IndexNow stays the existing cadence; no submission is made by this PR.
- The local cloud sandbox blocks Chromium's singleton socket, including an authorized escalation attempt. That is a browser environment limitation, not a passing UI check. The PR-only CI runs the existing bilingual browser suite and a new localhost-only bilingual/mobile limited-packet suite. It has `contents: read`, no secrets, no persisted checkout credentials, and no deployment, model call, account connection, production task, cleanup, watcher or schedule dispatch. Browser requests outside localhost are blocked.

## Independent review

Round 1 reviewed the design before implementation: source identity coherence, literal publisher attribution, unit provenance, false completed states, observable time-bounded actions and legacy/current distinction.

Round 2 independently reproduced parser issues (numeric suffixes, weekly cadence inside “biweekly”), an explicit-negation route, malformed/truncated descriptions, and a UI-test asynchronous-state race. These were fixed and covered with regression cases. It also independently exercised daily watching, a yielded checkpoint, previous-summary retention, action-progress isolation, pause/resume and the seventh-run bound with no model calls.

These are engineering reviews and fixture checks, not independent live model evaluations.

## Release blocker and minimal safe-push proposal (not implemented here)

At the base commit:

1. `.github/workflows/deploy-agiscorecard.yml` lines 262–273 executes `ops.mjs preflight` and `ops.mjs configure agi`. `tools/member-studio/ops.mjs` `configureSite` writes Cloudflare secrets. A content release must not silently create/reconfigure persistent access.
2. The same publisher lines 304–318 runs `ops.mjs watch agi` after deployment and retries it. That POST reaches `member-watch` → `watchMembers` → `DELETE FROM wb_versions`, `wb_spaces` and `wb_limits` (`sites/baipiaoji/lib/membership.js` lines 85–94). No additional inferred permission is assumed for those deletions.
3. Jarvis `ops.mjs run` POST reaches `tick`, which calls `cleanup` before executing tasks. Do not use it for deployment health. `verify-sources` also writes a rate-limit/schema path, though it does not run the deletion path.

A separately reviewed safe AGI push should:

- Keep the current-main SHA guard, offline builds/tests, authorized worker deployment and static/live version checks.
- Exclude membership secret configuration and mutating membership/Jarvis watcher commands from ordinary pushes. Do not change any existing scheduled cadence or enabled state as part of this repair.
- Use public `GET /api/jarvis` for exact version and unchanged limits/retention, plus bilingual page/assets/GA4/private-boundary checks. Its public metadata handler returns before DB initialization and inference. Authenticated `GET /api/jarvis/run` similarly returns a version/authentication check without `tick`; it need not be introduced if public checks suffice.
- Keep membership health honest: `GET /api/member` reports readiness and does not run cleanup, but it currently calls idempotent schema initialization, so do not label it strictly database-read-only. A separate bounded SELECT-only health check is preferable if strict read-only verification is required. A stale/unready response must fail/report; do not automatically repair it via watcher, nor mark skipped health as passed.
- Re-audit all commands for writes before enabling the safe-push route. Confirm the intended deployment SHA against current `main`, and recheck concurrent daily Jarvis edits before merge.

No release is authorized by this document. This PR remains draft pending the release-path decision. No paid plan, new marketing claim, adoption gate, or video-business change is introduced.
