# Jarvis release recovery — 2026-10-16

## Scope and observed blocker

Current main at inspection: `5b5e21398952c3b144633a4d7bf88c5085ebf26c`. Production reports `jarvis-20261014-23`; AI binding exists, not proof of current inference success. The existing two-hour maintenance step succeeded in run `38828669851`. No customer bodies, memories, credentials or private analytics were read. Customer adoption, retention, feedback and revenue remain unknown.

Normal AGI deploys `38759307769` and `38830839180` failed before upload in the portfolio API tests with `future_record`, after Jarvis tests passed. The test used `last_success_at + one hour` as its clock while reading the daily published snapshot. A failed refresh legitimately advances `attempted_at` without advancing `last_success_at`. Production correctly rejects an attempt ahead of that artificial clock. Locally the unchanged suite reproduces two failures out of five. This is not a production future-date validation defect and does not justify deleting the guard.

## Three optimization rounds

1. Prioritize actual blockers: inspect public Jarvis status, maintenance and deploy stages before adding features. Preserve the one-guest-task then free-registration policy and all budgets.
2. Compare candidates: deterministic fixture repair addresses a reproduced release failure without inference. A smaller model, existing 8B and stronger model cannot repair a test clock; none has measured quality superiority for the unresolved report-summary issue. No prompt, model, schema or quota change is justified by that single prior failure.
3. Freeze the falsifiable acceptance: the original source/history/valuation assertions must pass with an independent synthetic observation; recent failed attempts must not refresh old successes; future attempts and valuation dates must still fail; HTTP/MCP equality must compare successful data, not matching errors. Published snapshot validation remains separately enforced in `test.mjs`.

## Primary evidence, inference and counterevidence

Read on 2026-10-16:

- [Node 24 test runner: Dates](https://nodejs.org/docs/latest-v24.x/api/test.html#dates) documents a test-scoped Date mock with an explicit epoch. Applied to HTTP/MCP routes that do not expose a clock parameter; pure functions use their existing injected clock. This also supports reproducible task-recovery/expiry tests without waiting or consuming model quota.
- [Cloudflare Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) explicitly does not guarantee that every request satisfies the schema. Our inference: format constraints alone cannot establish supported, complete conclusions. Keep semantic evaluation separate from orchestration completion. The October 14 malformed-summary evidence is not reclassified as a pass.

Counterevidence: a synthetic fixture can hide changing publication contracts; retain the independent committed-snapshot contract test and live checks. Date mocking tests state logic, not provider availability or production scheduling. Native schema limits remain useful for bounded cost; their presence does not prove that a particular limit caused the previous malformed citation. No larger context, multi-agent or stronger-model benefit is claimed.

## Implementation and two adversarial self-checks

Only `tools/portfolio/api-test.mjs` changes execution behavior, and only in tests. Fixed synthetic source data replaces the daily snapshot; route tests freeze Date explicitly. The HTTP/MCP positive path now requires HTTP 200, tracking status, twelve rows, a digest-shaped valuation ID and no MCP error.

1. Boundary review: twelve tests cover source/history preservation, attempt-only identity stability, corrected-data identity changes, stale success, failed refresh, exact/over 96 hours, missing success timestamp, exact/+1ms five-minute skew, future valuation dates, incomplete/cohort rejection, successful HTTP/MCP equality and route failure closure. No production source, financial calculation, published data, entitlement, prompt, Worker or workflow is edited.
2. Mutation review: execute the same frozen suite against in-memory mutations, without changing files. Removing the attempt guard fails 2 tests; removing the valuation-date guard fails 2; using attempt time as success time fails 2; constant valuation identity fails 1. Unmodified production module passes all 12. No weaker gate or release-bypass marker is used.

## Measured results and release boundary

- Original portfolio API suite: 3/5 pass, 2 `future_record` failures.
- Candidate portfolio API suite: 12/12 pass; full combined Jarvis, portfolio, privacy/business analytics and release-safety regression: 188/188 pass, 790 ms local runner duration (not production latency).
- This run: zero real AI tasks, zero inference calls and zero inference tokens. Model completion rate, citation support and real inference latency are **not measured this run**, not zero or improved. Synthetic test pass counts are not model quality or customer outcomes.
- Public policy remains global 12 attempts/24h, per-IP 3, hard 2/task and current new-run synthesis 1; guest once then free registration. No reset, extra cron, paid service, marketing message or external indexing submission.
- No new public route, MCP tool or Skill; no new registration/listing applies. GA4 privacy settings, fixed events, bilingual SEO/GEO, homepage countdown/vote and separate mentor positioning are unchanged. Normal deployment must run existing builds, privacy, browser and publication gates; existing weekly/manual IndexNow remains unchanged.

Commit/merge/deploy receipts and final live verification belong in the associated PR after they actually occur. A local green suite is not a deployment claim. Next useful product work remains a frozen semantic evaluation of report summaries, citations and recovery outcomes; do not erase the previous real-model failure or spend quota merely to obtain a passing example.
