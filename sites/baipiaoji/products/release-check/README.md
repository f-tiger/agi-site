# BPJ ReleaseCheck — executable delivery kit 0.1.0

[English product page](https://baipiaoji.com/en/studio/release-check) · [中文](https://baipiaoji.com/studio/release-check)

For small studios shipping paid apps: turn agreed access rules into a bounded set
of HTTP checks and an evidence report. Free MIT local runner; proposed **$299
single-app review service** remains application-only. This is an agent-assisted
delivery kit: your coding assistant can prepare the adapter and explain failures,
while the runner records deterministic observations. It is not a hosted AI agent,
a working Stripe checkout integration, or a security certification.

Node.js 22+; no install, runtime dependencies, telemetry or model API. The demo
opens only a loopback HTTP fixture with synthetic accounts. Nothing is charged.

## Try a real failure and a fixed-version retest

Download `release-check.mjs`, inspect it, and run:

```sh
node release-check.mjs demo --broken --out ./broken-evidence
# Expected exit 1: expired account wrongly retains access; 7 pass, 1 fail.
node release-check.mjs demo --out ./fixed-evidence
# Expected exit 0: all 8 scoped synthetic checks pass.
```

Each directory contains `report.json` and `report.md`. Existing reports are never
silently replaced; choose a fresh directory. Compare `revision`,
`contract_sha256`, case results and timestamps. The two demo runs execute an HTTP
fixture with an actual toggled bug; neither is a customer case or proof that your
app works. `manifest_sha256` also includes the origin and revision; it therefore
changes between runs. Case contract fingerprints are stable.

The eight cases cover anonymous access, unpaid access, paid access, an already
expired fixture account, tenant isolation, unsigned webhook rejection, signed
synthetic event acceptance, and duplicate event replay. A response must match
both its HTTP status and explicit JSON assertions. Redirects are never followed.
Missing cases produce `incomplete`; timeouts and oversized responses block the
run. A passing fixture says nothing about real billing clocks, plan changes,
refunds, browser checkout or live payment processing.

## Adapt to an authorized isolated test environment

Start with `example-manifest.json` and [AGENT-BRIEF.md](AGENT-BRIEF.md). The example
uses the demo fixture's API contract; it is NOT a universal Stripe adapter. A
developer must prepare isolated synthetic accounts and map every route,
credential, expected result and event body to the actual application's contract.
Verify the tenant request really targets another account's fixture resource.
Use a real test-mode provider event schema where appropriate; the demo's
`evt_demo_1` envelope is intentionally minimal and is not a Stripe test event.

The runner does not inspect repositories, provision users, expire subscriptions,
reset test state, perform browser checkout, upload evidence, send messages or
write code. An existing coding assistant can do authorized preparation under its
own permission and model-cost rules. Missing authority, setup or policy is a
blocker, not an invitation to invent passing inputs.

```sh
node release-check.mjs run --manifest ./private-test.json \
  --allow-origin https://your-isolated-test-host \
  --authorized --allow-mutations --out ./private-evidence
```

Use the exact `origin` in the manifest, HTTPS for remote hosts, loopback HTTP for
local fixtures. `--authorized` confirms you control or are authorized to test that
isolated environment. `--allow-mutations` allows the listed POST tests. These flags
do not technically identify a staging host: operators must verify that it is
isolated, uses synthetic data and cannot trigger real billing. Never target
production. Nothing runs on a schedule or after this command exits.

`headersEnv` maps approved header names to `RELEASECHECK_*` environment variables.
Set these privately in your shell or test runner; do not put values in the
manifest, source control, an AI chat or public logs. The optional signature helper
supports Stripe-style `t=...,v1=...` HMAC-SHA256 over the exact request body. This
is an envelope helper, not a full Stripe emulator or SDK. The signed and duplicate
cases must replay the same path, event body and credential references, in order.
The duplicate case names an `effect_pointer` whose positive integer count must
match the first event, so a simple acknowledgement alone cannot prove deduplication.
An unsigned denial must be checked before the successful event. Reset the
synthetic database before each repeat run, or create an agreed new event ID in
both replay cases.

Reports include project/revision, timestamps, status codes, assertion pointers,
manifest/response fingerprints and coverage. They exclude response bodies,
headers and credential values. Project names and fingerprints can still identify
a project or synthetic dataset; review before sharing. Keep private manifests,
reports and all credentials outside this public repo. Requests have an 8-second
timeout, 1 MiB response cap and at most 12 sequential cases. No arbitrary code,
shell commands, redirects or cross-origin follow-up requests are executed.

Exit codes: `0` all required scoped checks passed; `1` failed/error/missing checks;
`2` invalid input, authorization, credentials or output failure. A zero code is
not permission to launch or a claim that no bugs exist.

## What a paid pilot would deliver

One agreed application revision and isolated environment, rule matrix, adapted
cases, execution evidence, reproducible findings, and one fixed-revision retest.
The existing proposed scope is up to two paid plans, 12 agreed cases and Chromium;
this HTTP kit covers only a subset. Browser and provider test-mode rehearsal must
be added for each accepted pilot. Code fixes, production operations and continuing
monitoring remain outside the offer. Checkout stays closed until scope, authority,
rehearsal, delivery capacity, terms and refunds are agreed. Do not sell this free
runner alone as a proven autonomous service.

## Verify

From `sites/baipiaoji`: `node --test scripts/test-release-check-kit.mjs`.
Original BPJ implementation, inspired by open-source distribution and bounded
workflow patterns; no n8n, Firecrawl, Skyvern or OpenHands code was copied.
