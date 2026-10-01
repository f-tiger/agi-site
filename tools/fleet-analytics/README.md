# Existing-property GA4 coverage

Run `python3 tools/fleet-analytics/coverage.py --site agi --out sites/agiscorecard --write`
after every page generator and before deployment. Without `--write`, the same
command rejects missing coverage. All four main-site deploy workflows enforce
this ordering, then run `node tools/fleet-analytics/verify-live.mjs SITE`.

The installer recognizes executable Google tag loaders and existing TDS/BPJ
assets. It does not treat preconnect hints, JSON-LD, comments, or a first-party
`gtag` wrapper as Google Analytics coverage. Working tags are left intact.
The public `analytics-assets/coverage.json` explains each page's implementation
or explicit exemption. Each site's own existing measurement ID is mandatory.
Standalone subdomains without an existing property are not silently enrolled.

Newly instrumented pages use explicit, revocable consent. Only build-time public
URL/title and referrer origin enter a same-origin blank frame after consent.
Google's enhanced-measurement listeners execute in that empty document, apart
from the tool's inputs, downloads and history changes. The actual Google tag was
tested in Chromium on all four site origins. The frame does not proxy analytics
around content blockers. It stops when consent is withdrawn. It is noindex and
excluded from AGI's edge pageview/event injection, preventing artificial D1 PVs.
No existing first-party event callback is replaced. Optional GA4 remains a
consenting-visitor sample; it is not an exact census or a revenue measure.

Private membership/account portals, deliberately isolated quote documents,
embeds, probes and error pages are explicit exceptions. In particular, never
add Google to downloaded/customer quote documents or loosen their CSP.

Tests: `python3 tools/fleet-analytics/test_coverage.py` and
`node --test tools/fleet-analytics/test-worker.mjs` require no network. Browser
checks use the repository's pinned Playwright dependency:
`node tools/fleet-analytics/browser-test.mjs --site agi --out sites/agiscorecard`.
The default mocks Google at the network boundary; optional `REAL_GTAG_DIR` reads
locally cached, unmodified Google scripts named `gtag-SITE-default.js`. All
collect requests are intercepted, including in real-tag mode: tests never send
synthetic visits to production. `CHROMIUM_EXECUTABLE` can select a local browser.

Google references: [configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
and [pageview measurement](https://developers.google.com/analytics/devguides/collection/ga4/views).
`send_page_view: false` prevents the config command's automatic pageview; one
explicit pageview carries the sanitized metadata. The empty frame is needed
because enhanced measurement may otherwise observe form/link/history events.
