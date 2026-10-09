# AGI non-destructive push acceptance

Implementation starts from main `12c26a701d3e0b72f71801e39ced4b7ede171c13` (2026-10-09). The scope is one AGI publisher, shared by the Jarvis and existing video-content releases. No ECO or other publisher, cron expression, enabled state, credential, permission, payment rule or retention deadline is changed.

## The five confirmed destructive paths

The old ordinary-push publisher invoked:

1. Membership watch: chain probe, pending-order processing, expired workspace/version/limit deletion, and health refresh.
2. Mentor admin metrics: deletion of old mentor events and feedback before aggregate queries.
3. Relay admin stats: deletion of old acquisition/events/limits.
4. Community admin stats: deletion of old visits/activity/limits.
5. Anonymous Community status smoke: IP limiting, then cleanup, then identity rejection. Its expected 401 still followed deletion.

Ordinary pushes now use fixed GET membership readiness plus the existing member-page/401 checks; and the same authenticated aggregate queries through `admin_readonly`, `inspect_stats` and `stats_readonly`. Existing scheduled/manual commands retain their original maintenance behavior. There is no silent fallback from an unavailable new action to an old destructive action.

Distinct actions matter: the old Relay handler treats unknown admin operations as stats and performs cleanup. The new Relay request therefore uses the top-level `inspect_stats` action, which old servers reject. Frozen copies of the three actual pre-change routers demonstrate rejection before cleanup. New read-only requests disable redirects so they cannot be replayed onto another endpoint.

## Community rollout and exact coverage

Original status requests now authenticate after the same IP limiter and before cleanup. Valid status retains its member limiter, response data, activity record and existing maintenance. Fixtures cover missing/malformed/unknown/suspended identities, valid output, rate limits and maintenance.

The release smoke uses the exact new `/api/discuss/verify-status-access` path with only `{action:'status'}`. It shares existing origin/body validation, the original IP bucket/limit and identity helper. It never calls the status writer, reads private posts or runs cleanup. Success returns only a contract label; missing credentials must return the exact unauthorized JSON and HTTP 401. Redirects, unknown paths, unexpected status/JSON, or unavailable storage fail closed. It does not expand the Fleet bridge allowlist.

The old real Community router does not recognize the new path. The old-worker fallback test reaches the static 404/405 path without cleanup. This avoids first probing the old status endpoint during a mixed-version rollout.

**Coverage difference:** the new live probe verifies the shared status identity primitive and denial response, not the entire original status route or Fleet-session adapter online. Those original behaviors remain covered by offline fixtures and existing browser tests. This is deliberately stated rather than claiming identical live coverage.

## Membership readiness is not payment verification

The AGI GET helper pins `ok`, `ready`, AGI site, BSC/USDT rail, no auto-renew, and every current plan constant including the AGI `9010000` quote base. Unknown, missing, false, stale, wrong-type or mismatched values fail. It makes one fixed credential-free GET with a timeout and manual redirects. Bounded workflow retries repeat only non-destructive checks; no watcher is called to make readiness green.

The existing GET may execute schema `IF NOT EXISTS` and SELECTs. It does not process orders, delete data or refresh `wb_health`. Readiness incorporates an existing watcher health record younger than four hours; it does not make a fresh chain-ID/token-decimal/finalized-block probe, authenticate the membership watch endpoint, prove payment receipt or checkout completion. Future changes to payments, membership, amounts, wallets, chain/token or credentials need separate specialized acceptance. Tests are not evidence of real customers or revenue.

## Preserved boundaries

- Existing fixed secret synchronization is unchanged: the same AGI worker, `MEMBER_WALLET` / `MEMBER_WATCH_SECRET`, owner-wallet check and deterministic derivation. Same inputs produce the same desired values; this audit does not prove opaque runtime values are identical. Missing names or changed upstream values must not be described as a verified no-op or used to authorize new credentials/permissions.
- Jarvis private `verify` GET and `verify-sources` remain. The latter can initialize schema, increment rate limits and call fixed public searches, but returns before `tick` and inference. No release `ops run` or `tick` was added.
- Jarvis's existing guest-daily negative probe is unchanged. Current authorization rejects it before task creation; if that tested guard itself regresses, side effects are possible. No absolute zero-inference guarantee under that regression is claimed, and no new admission platform is added.
- Existing CSP, no-store, origin/private-read checks, invalid-input tests, model/search budgets, guest registration and 7-run/30-day rules stay intact.
- Ordinary static reads can increment aggregate pageview/UA counters, and aggregate APIs can write cache entries. The promise is non-destructive acceptance, not zero database writes.
- Existing scheduled/manual cleanup remains in place. This change does not stop, retry or dispatch any maintenance job. A concurrent scheduled run must be distinguished from the push run being verified.

## Verification and release sequence

The new suite runs actual in-memory handlers, checks readiness and stale health, identical auth and aggregate output, rejected legacy dispatch, no destructive SQL on read paths, original maintenance, Community probe/original-status differences, manual redirects and workflow branching. Frozen router fixtures are from main `12c26a7`; their SHA-256 hashes are asserted in tests. No old production endpoint is called for compatibility testing.

At initial local verification: 120 tests pass (103 existing and 17 new), plus all eight membership-isolation assertions and the safe failure-diagnosis fixture. Existing tests were not weakened. Credentials-free PR CI runs these tests and the existing Relay, Community, Mentor and Jarvis browser suites against local fixtures. Production checks run only after the authorized main deployment, with the new non-destructive push paths.

Two independent reviews are required before merge. Verify the precise PR head and current main, deploy this safety foundation first, wait for its exact push run and live checks, then release Jarvis #137. The existing video-content #138 release is separately coordinated afterward. Do not merge ECO #136 or retry cancelled #135 under this authorization.

This document records an engineering safety boundary, not a new business offer, accuracy claim, pricing change or adoption result.
