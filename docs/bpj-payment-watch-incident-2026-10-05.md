# BPJ payment watcher lapse — 2026-10-05

At 13:45 UTC, the public payment doctor reported `selling=false`, wallet
configuration and enablement true, and `watch_healthy=false`. Card checkout was
also unconfigured. This is a real availability blocker, not evidence of demand
or a completed payment.

## Evidence and cause

- The workflow is active and configured for `7 */2 * * *`.
- Latest completed run at inspection:
  [37267735431](https://github.com/f-tiger/agi-site/actions/runs/37267735431),
  2026-10-05 05:25:36–05:25:54 UTC; job 111627986628 succeeded.
- Its 05:25:46 log reports `processed=0` followed by
  `selling=true,wallet=true,watch_healthy=true`.
- Previous successful runs began at 2026-10-04 23:00:47, 19:32:03,
  15:17:21 and 08:20:07 UTC. Actual execution gaps repeatedly exceeded four
  hours despite the nominal two-hour schedule.
- `sites/baipiaoji/lib/ad-web3.js:web3Health` accepts a successful heartbeat
  for less than four hours. At the incident observation the latest confirmed
  watcher result was over eight hours old. That explains automatic closure.
- The underlying reason GitHub did not start each nominal scheduled run is
  not established. Successful old runs do not establish current liveness.

## Bounded recovery prepared

The existing workflow now accepts manual `mode=ads-only`. This path runs the
existing Web3 watcher with a five-minute cap and required live configuration.
It skips membership and Jarvis steps, creates no order, sends no funds and
sends no customer notification. It may verify and fulfill existing pending
ad orders, as the normal watcher does. Health is refreshed only after the
existing chain/log/order checks pass. The four-hour health limit and all
payment verification rules are unchanged.

Dispatch only from the reviewed, merged current main. After completion, inspect
the new job result and make one live doctor request. Recovery is established
only if wallet selling and watcher health are true. Do not treat this patch,
dispatch acceptance or an old successful run as restored availability.

## Verification and limits

- Existing readiness regression test passes, including delayed propagation,
  missing required configuration, and an unconfigured scheduled skip.
- Existing amount self-test passes for six and eighteen decimals.
- The workflow routing was checked across schedule, watch, ads-only and inspect:
  ads-only selects exactly the dedicated recovery step; existing modes retain
  their prior steps. `git diff --check` passes.
- This manual path isolates recovery; it does not make GitHub scheduling
  reliable. Persistent monitoring must check actual heartbeat freshness and
  actual elapsed time, with bounded recovery and evidence of each action.
- No transaction, checkout, workflow dispatch or new spend was performed during
  this diagnostic preparation. A live recovery receipt remains required.
