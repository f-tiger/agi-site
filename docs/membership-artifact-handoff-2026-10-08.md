# Membership aggregate handoff: prepared, production collection disabled

## Outcome and readiness

This change removes the operator-secret interface from the independent membership
report. It prepares a sanitized JSON handoff from the existing privileged
`bpj-ad-watch` job, using its existing `memberSecret` derivation. The consumer has
no Cloudflare token, operator key, or live membership endpoint request.

**Authenticated totals are not restored by this change.**
`tools/fleet/membership_readiness.json` is source-disabled. The watcher explicitly
skips the new collection while this gate is closed; its original ad, receipt,
membership and Jarvis operations are unchanged. The report fails unavailable if
there is no trusted fresh artifact and leaves the previous observation intact.
There is no fresh-zero or fresh-observation substitution.

## D1 evidence gate

The repository's D1 instructions require per-endpoint `rows_read` evidence before
production aggregate polling (CLAUDE.md, lines 1221–1262). The known account-wide
snapshot at main `ce503b8dd64be3a6405b0bfacff2511b5cfafa29`, generated
2026-10-07 14:57:26 UTC, shows 1,131,092 reads on October 6 and 871,375 reads so far
on October 7 (projected 1,398,187). This establishes account totals only, not a
membership endpoint cost or an October 8 budget.

The existing D1 diagnostic run
https://github.com/f-tiger/agi-site/actions/runs/36320934602/job/108624486141
contains no membership queries in its displayed top-40 query lists. Absence there
is not zero cost. The current membership report's missing-auth result likewise
provides no authenticated stats-query cost.

The shared stats handler executes three uncached aggregate SELECTs over orders
and members. Its schema initialization can issue 21 CREATE IF NOT EXISTS
statements per endpoint invocation; the public and admin handlers are therefore
not described as strictly read-only. Checked-in indexes do not establish actual
production indexes, query plans, caching, or billed rows read.

Before enabling, attach dated, deployment-linked per-call rows-read evidence for
both endpoints on all four sites, covering initialization and stats queries;
verify applicable cache/index/EXPLAIN requirements and a fresh account budget
against the existing 2M warning / 3M red / 5M hard daily thresholds. Any endpoint,
credential or permission changes require their own authorized scope. This patch
does not make those changes, dispatch a diagnostic, or claim the gate has passed.
Enabling is a reviewed source change, never an environment-variable shortcut.

## Daily polling budget, independent of schedule timing

- Existing cron stays `7 */2 * * *`; normal `watch` mode alone can produce data.
  `inspect`, `ads-only`, `receipts-only`, PRs and non-main refs cannot collect.
- The unchanged `bpj-ad-watch` concurrency group has `cancel-in-progress: false`.
  The producer is in that same job, after the original operations.
- A claim checks same-repository, exact workflow ID/path, main-branch metadata,
  and complete bounded pagination of the preceding 48 hours. Any failed,
  inconsistent or truncated metadata request fails closed, with no site reads.
- A claim artifact is uploaded **before** any stats request. Collection separately
  verifies that exact artifact exists, matches the run and has adequate retention.
  Claims retain 30 days. No claim replacement or deletion is performed.
- A prior claim blocks for 24 hours plus a five-minute safety margin and on its
  UTC date. Collection admission expires after two minutes; the producer has a two-minute
  step limit. Their combined bound stays below the five-minute margin. The same run's
  rerun cannot collect; its original claim still blocks even if that run is later
  rerun or cancelled. Old queued runs more than one hour old cannot claim.
- Failure after claim upload consumes the budget. No immediate collection retry,
  no fallback dispatch, and no attempt to recover a failed day through extra D1
  reads. Failure before a visible claim cannot reach the collector.
- One admitted collection makes at most eight requests: GET `/api/member` and
  POST `/api/member-admin` with the fixed `{"action":"stats"}` body at the four
  fixed owned origins. No redirects or retries. Site failures are independent.

This trades missed/failed observations for budget safety. It does not guarantee
GitHub schedule timing or restore watcher durability. Administrative deletion of
claims/run history would invalidate the gate's history; do not delete that
history within the 48-hour evidence window. This patch performs no deletion.

## Privilege and public-data boundary

- Watcher token: explicit `contents: read`, same-repository ephemeral
  `actions: read`; no commit or push ability. Existing secrets remain in the
  already privileged watcher job only. No new persistent token is introduced.
- Report test job: `contents: read`; report job: its existing `contents: write`
  plus same-repository ephemeral `actions: read`. The reusable caller passes
  these permissions and no operator secret.
- Producer constructs a fixed schema before serialization. Only nonnegative
  safe-integer aggregate counters, booleans/nulls, fixed origins/site codes,
  fixed source/privacy strings and three fixed unavailable-error codes may cross.
  Arbitrary response fields, plan descriptions, customer data, raw errors and
  credentials are never copied into output/logs. The consumer independently
  rejects unknown keys, invalid strings, malformed totals and false completeness.
- Consumer selects the exact immutable artifact ID/name from the expected
  public repository, workflow, main, commit SHA and first run attempt. It accepts
  a completed producer run even if an unrelated earlier watcher operation failed.
  It does not trigger or rerun the producer.
- Download uses the official data-artifact action, then accepts one regular file
  named `membership-aggregate.json` only, with a 32KiB limit. It parses JSON as
  data and never executes, imports or sources artifact contents.
- The artifact's snapshot time must lie between the producer's start and artifact
  creation, with at most five minutes to upload and no future timestamp. The
  observation must be at most 36 hours old. Consumer runs preserve that exact
  observation time. Stale/missing/rejected artifacts leave the old snapshot alone.
- Current incomplete observations retain unavailable/null counters. Valid known
  zero remains zero. Incomplete fleet totals never become a partial sum. Readiness
  remains separate from successful counter collection. Counts are not cash,
  revenue, independent customers or registered users.
- Only `data/fleet-evolution/membership.json` can be staged/persisted by reporting;
  bounded rebase/push logic is unchanged. Data-only commits do not trigger it.

## Verification and scope

Offline tests cover missing/partial auth, fallback derivation without credential
transmission, unknown/private fields, arbitrary error strings, malformed counters,
true zero, readiness, API provenance, reruns, failed/cancelled runs, UTC rollover,
24-hour boundaries, pagination cap/inconsistency, preclaim retention/visibility,
stale/future input, fixed filename and unchanged-file-on-failure behavior.

Commands:

```
node --test tools/fleet/membership*.test.mjs tools/fleet/test_membership_totals.mjs
python3 tools/fleet/test_membership_snapshot.py
```

No live collector acceptance test is performed while the D1 gate is closed. No
site endpoint, product, deployment, growth action, billing plan, persistent access,
cron or history cleanup is changed. SEO/GEO/IndexNow are not applicable because no
public site content or deployment changes.

GitHub artifact behavior and required ephemeral permission:
https://docs.github.com/en/rest/actions/artifacts
https://github.com/actions/toolkit/tree/main/packages/artifact
