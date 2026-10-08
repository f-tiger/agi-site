# Catalogue transport recovery, 2026-10-08

## Bounded maintenance brief

Three refinement passes: identify the failing transport boundary and latest
source; preserve public-endpoint validation and truthful failure reporting;
verify a minimal repair with offline regression tests and exact-commit CI.
No new catalogue sources, discovery volume, deployment, paid features, credentials,
permissions, cron or production database reads are required.

## Observed incident

[Scheduled run 37738233229](https://github.com/f-tiger/agi-site/actions/runs/37738233229/job/113182600584)
logged 89 GitHub discoveries and 12 admissions at 06:37:05 UTC, then exited at
06:37:21 with an unhandled `TLSSocket` `AggregateError [ENETUNREACH]` while the
custom lookup callback returned IPv6 addresses synchronously. The exception
bypassed normal request rejection and catalogue catches. Writes happen after
both lanes, so these GitHub admissions were not persisted. Main's last durable
catalogue status remains October 6, with 140 GitHub projects and 1,529 MCP records.
The incomplete October 8 run must not be reported as a successful catalogue sync.

The same scheduled job subsequently deployed commit
`b5de7dc7babd056b512baf7ae368a98005f58c29` at 06:39:55 UTC and its live account,
checkout and GA4 checks passed. The final gate correctly failed the catalogue
step. That catalogue failure is not evidence of a payment outage.

## Repair and preserved boundaries

- Defer every pinned DNS callback with `process.nextTick`, allowing HTTPS/TLS
  listeners to be installed first. This addresses the synchronous custom-lookup
  failure shape described in [Node issue 28664](https://github.com/nodejs/node/issues/28664).
- Prefer already-validated IPv4 answers, retain IPv6-only support, honor the
  requested family, and explicitly enable Node's bounded family-selection path.
  No fallback DNS resolver, proxy or security setting is added. See the
  [Node 22 family-selection contract](https://nodejs.org/docs/latest-v22.x/api/net.html#socketconnectoptions-connectlistener).
- Keep the existing 5-second DNS and 12-second request deadlines, two retries,
  2 MB body cap and four-redirect limit. Clean up DNS deadline timers.
- Retry only transient transport errors (including all-transient aggregate
  errors) and the existing selected 5xx responses. HTTP 401/403/429, unsafe
  destinations, certificate errors, malformed JSON and oversized bodies stop
  immediately. HTTP refusals remain refusals; exhaustion remains a rejection.
- Retain all-answer public-IP checks and revalidate every redirect. GitHub
  authorization remains scoped to `api.github.com`.
- Keep catalogue admission, data writes and the final failure gate unchanged.
  Normal caught transport failures reach existing degraded status handling;
  preserved partial candidates/cursors are not declared a full successful scan.

## Verification and publication boundary

`node sites/baipiaoji/scripts/test-catalog-sync.mjs` executes 14 new mocked
transport checks and 18 catalogue checks, including aggregate failure into MCP
degraded status and preserving the GitHub lane's result and last-success dates.
All pass locally on Node 24. A synchronous-callback mutation fails the new
timing assertion. The oversized-body fixture uses valid JSON and checks the
specific limit error. Syntax and workflow YAML checks pass.

The new narrowly path-filtered PR check runs the same offline tests on Node 22,
with `contents: read`, no persisted checkout credential and a three-minute
timeout. No schedule, secret, live publisher request, production write or deploy
step is added. The existing deployment catalogue test imports the same transport
suite, so future normal deployments retain the regression gate.

Merge without a deployment marker: the existing BPJ push job skips deployment.
Do not rerun the broad daily workflow to test this repair. No public-page content,
canonical, sitemap, GA4, GEO mirror or IndexNow integration changes are involved;
no indexing submission is needed. The next already-scheduled crawl can validate
real recovery. Offline CI alone does not establish a successful live sync or a
new production deployment. Capture that next run and its durable status before
claiming recovery.
