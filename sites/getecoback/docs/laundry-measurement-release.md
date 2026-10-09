# Laundry measurement and release boundary

The two existing laundry pages reuse the existing GA4 `fleet:business` channel.
A trusted visitor activation followed by a valid calculation emits
`legacy:tool_complete`; a successfully prepared export emits
`legacy:tool_export`. Each is accepted at most once per page lifetime by this
calculator. Explicit examples use the existing separate example event.

These are **visitor operation counts**, not proof of self-entered inputs,
verified measurements, unique people, equivalent drying, purchases or revenue.
A visitor can explicitly calculate or export a preset/shared scenario. Automatic
previews do not count. Existing bounded `laundry_*` metadata remains in the
independent D1 channel; GA4 receives only the existing generic event names and
route-derived tool ID. Do not join these channels into a user/session funnel.
Local dedup requires the current collector’s existing startup handshake. A module
loaded too late to observe it fails closed until a later genuine channel start;
this can undercount unusually late initialization, and no actions are replayed.
Stored opt-outs, withdrawal, DNT/GPC/automation exclusions and the existing
isolated analytics frame remain intact. Unavailable or denied actions are not
replayed or consumed by local GA deduplication. `__probe=1` excludes both pages'
first-party tracker and calculator; `__qa=1` alone is not a full legacy-PV guard.

## Push deployment health

ECO push deployments check existing `GET /api/member` readiness and the expected
site, chain, token, plan and non-recurring status, plus the existing member page,
site isolation and unauthenticated-401 checks. `ready` already depends on the
scheduled watcher's health being less than four hours old. Missing, stale,
unknown or mismatched state fails closed. The check never refreshes health.

This GET is non-destructive, **not strictly read-only**: it can run existing
`CREATE TABLE/INDEX/TRIGGER IF NOT EXISTS` initialization before health SELECTs.
It does not process orders, grant membership, delete customer workspaces, change
credentials/permissions, or make a new chain RPC probe. It does not prove current
watch-key authentication or verify a payment. Existing configuration sync and
static/isolation/failure tests remain in place.

The original scheduled/manual watcher and business schedule are unchanged.
Never call it manually to make a failed push gate green: it includes expiry
cleanup. Report a stale/false/unknown readiness result instead.

**Future payment or membership logic changes require a separate, non-destructive
specialized verification plan. This readiness check is not a substitute.**
The status gate runs after deployment; a failure reports an incomplete release
verification and does not automatically roll back the deployed site.

Browser tests intercept or abort every request and use a Google transport stub.
Passing them proves the client contract, not production GA4 backend receipt.
Live source/asset checks and genuine-traffic reporting remain separate evidence.
