# Public Pages delivery and the Workers daily budget

This follows the asset-routing repair in PR #224. A cache lookup **inside** a
Function still invokes it; bypassing it with the final Pages routing manifest
removes that invocation. HTTP request aggregates and adaptive invocation reports
have different definitions. Any replay is a conditional estimate, not billing or
measured savings. Private diagnostic reports stay encrypted and outside this repo.

The three planning passes set the goal to reduce unnecessary fleet invocations,
retain account/analytics/retirement protections, and verify the generated routing
manifest in the Pages runtime and after deployment. Two adversarial self-checks
challenged host canonicalization and encoded/private paths. These are self-checks,
not independent reviews. They narrowed TDS bypasses to public assets and fixed
the BPJ account response policy on percent-encoded aliases.

## Delivery behavior

- BPJ public HTML, catalogs, discovery files and static misses bypass Functions.
  `/api`, auth, every generated private/embedded document, encoded paths and
  Markdown retain middleware. Markdown mirrors keep noindex; canonical
  `limits.md` and `pricing.md` retain their existing policy. Explicit 404 output
  prevents a single-page fallback. New Function routes outside the reviewed
  surface or server-source shadows in static output fail the build.
- TDS public HTML retains its middleware: www canonicalization, shared account
  header and retired route 410 responses remain active. Only the three public,
  constant account scripts/styles are additionally compiled from the shared
  account handler. No account data, cookies, database or network access enters
  that compilation. Account/status/callback routes remain dynamic and private.
- Both deployments run `pages-content-routing.mjs SITE OUT` and `--check` after
  generators and GA4 coverage. `_headers` keeps analytics isolation and private
  response policies. `X-Fleet-Delivery` distinguishes actual Function delivery
  from static delivery; the live gate tests public/private/encoded/retired routes.
- TDS assembly excludes `functions`, `lib` and `migrations` from public assets.
  They remain available to the Function compiler outside `dist`.

## Measurement discontinuity

From this release BPJ D1 crawler logging covers only requests that still enter
middleware. CDN-served public pages no longer write crawler rows. `/api/reach`
and `_fleet-delivery.json` disclose the changed coverage. A lower D1 crawler count
does **not** demonstrate less crawling. Cloudflare request analytics are needed
for CDN requests; GA4 and client business-event collection stay separate.

The existing manual encrypted usage report now returns up to 1,000 path aggregate
rows per zone, explicitly marking truncation. It adds no schedule or public data.
Validate savings using a full UTC day after deployment, accounting for request
mix and adaptive-data lag. Do not call the release partial day a full-day result.

## Discovery and release checks

Public content, canonical links and AI-readable mirrors are not rewritten.
GA4 final-build coverage remains mandatory. Existing daily IndexNow discovery
handles eligible content changes; this infrastructure release adds no per-push
submission or new recurring job. TDS domain redirects cannot be moved into
`_redirects`: Cloudflare documents domain-level redirects as unsupported.

References: [Pages routing](https://developers.cloudflare.com/pages/functions/routing/),
[Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
