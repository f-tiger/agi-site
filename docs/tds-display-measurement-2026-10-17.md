# Display calculator example exclusion — 2026-10-17

## Scope and acceptance

The standalone EN/DE display calculator pre-fills a documented example. Its
submit handler previously emitted `display_calc` for that unchanged example.
Loading the page alone did not emit this event. Historical events cannot be
reclassified because raw dimensions are deliberately not collected.

Keep the working example and calculation UI, but emit the existing bounded
completion event only after a valid submission with dimensions different from
the example. Compare physical dimensions in cm with floating-point tolerance:
unit conversion, example rotation, or restoring the example must not count.
An actual task identical to all example dimensions is conservatively excluded.
An edited calculation returning zero fit is still a valid answer, not an error.
Repeated qualifying submissions remain events, not unique users or purchases.

No new event, raw input, collection payload, attribution, MCP contract, source
fetch, paid service, outreach, or external post is added. Existing privacy,
production-host, QA, automation and opt-out exclusions stay in place. This does
not change the independent collector-growth endpoint's fixed event families.

## Verification

- Regression-first: the unchanged-example and restored-example tests fail on
  the original script; valid edited/invalid input and privacy tests already pass.
- After fix: 30 collector/core/UI/legacy-analytics tests pass, including four
  new display UI tests covering both languages, units, zero-fit and exclusions.
- The 191-entry structured-data check passes. Canonical, hreflang, existing
  sitemap and AI index coverage remain unchanged; the existing release workflow
  retains final GA4 coverage, live checks, freshness guards and IndexNow.
- Generator and generated pages use the same `2026-10-17.1` UI cache version.
- Two adversarial self-checks: (1) unit/rotation-only and restored examples must
  not become own-input evidence; (2) valid edited tasks still render and count,
  privacy exclusions remain effective, and no raw values leave the browser.
  These are self-checks, not independent reviewer approval.

Deployment is not established by this document. Consult the PR, successful
production workflow and matching live build stamp before marking it released.
Private account readings and commercial records are intentionally omitted.

## Remaining release verification

Afternoon continuation: a narrow pull-request-only `check-tds-display.yml`
reuses the repository's pinned Playwright dependency on a standard GitHub
runner. It requires read-only contents, no secrets and an eight-minute limit;
there is no schedule, source fetch, deployment or live measurement request.
This preserves a repeatable browser regression gate rather than relying on an
unavailable local binary. Its actual result must still be checked before release.

PR #180 is intentionally a draft. Chromium was not installed in the editing
environment, and the standard Playwright installer returned an empty/truncated
archive. The browser smoke did not run; the passing VM UI tests above are not a
claim of real-browser verification. No production deployment was requested.

On a runner with Chromium available, from the repository root run:

```sh
npm ci --prefix tools/revenue-studio --ignore-scripts
node sites/thedollscout/scripts/display-calculator-browser.cjs
```

The smoke fulfills or aborts every browser request locally, including event
beacons, so the production-looking URL cannot generate real traffic. Resolve
this smoke, review CI and main freshness, then follow the normal release and
live-readback gates. Do not bypass protection or use a successful old build as
evidence that this patch shipped.
