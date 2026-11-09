# Laundry calculator: safe loading and useful fallback

The two existing laundry calculators allowed native form submission when
JavaScript, the main calculator module or its math dependency was unavailable.
A local Chromium reproduction on both routes put consumption, tariff and usage
inputs in a GET query and produced no calculation. The `noscript` explanation
was absent when JavaScript was enabled but a module failed to load. This is an
observed failure mode, not evidence of its frequency among real visitors.

The affected routes are `/waeschetrockner-oder-luftentfeuchter.html` and
`/en/guide/dehumidifier-drying-clothes-cost.html`.

## Behavior and implementation

The static HTML now offers a fictional worked example, its equal-dryness and
energy-cost limitations, and a link to the existing measurement checklist.
The input form starts hidden and inert inside a disabled fieldset; example and
copy buttons start disabled. The calculation module enables them only after its
dependency and handlers are ready. A slow load recovers to the normal calculator
without moving focus. A failed load leaves useful reading and source links.
There is no server submission endpoint or new event.

The default example signature is captured after enabling the fieldset, so native
FormData includes the intended initial values. Example calculations remain
separate from edited-input comparisons. Existing validation, result focus,
exports, active-mode scenario sharing and no-purchase advice remain in place.
Both module and stylesheet URLs use a content hash to avoid pairing updated markup with an old
cached asset. The module also accepts the previous markup during a rolling
release. The existing shared experience waits for that same module URL.

The generator owns both language variants. Markdown extraction accepts the
checklist's new fragment ID and preserves the worked example and measurement
protocol. Canonical URLs, indexing policy, product evidence and source-check
dates are unchanged. The ordinary release builds search/sitemap/AI surfaces and
GA4 coverage; IndexNow is limited to the two authored HTML changes.

## Verification

- `node tools/test_laundry.mjs`: calculations, event schemas, market attribution,
  active-input sharing and rendered-content contracts.
- `node tools/browser_laundry.cjs`: both languages, real calculations, validity,
  PNG/CSV exports, scenario restoration and mobile layout.
- `node tools/browser_laundry_readiness.cjs`: no JavaScript, blocked main module,
  blocked math dependency, delayed recovery and previous markup in both languages; 320/390/1280px,
  keyboard fallback, no native form navigation and normal result focus.
- Existing Markdown/full-text tests and the full ECO CI build continue to apply.
  The new browser test runs in the existing CI job, with all traffic intercepted
  as local fixtures. The legacy page tracker may attempt its input-free pageview;
  the fixture never forwards it or any API request to production.

## Growth hypothesis and limits

This repairs the existing acquisition-to-calculation path. The free value is a
same-dryness cost comparison; monetization remains the disclosed, appropriate
next-step merchant path in existing guides. It adds no paid feature, model call,
new market, recurring job or promotional message.

Keep the current campaign links stable. Observe existing `laundry_view`, edited
`laundry_compare`, export and next-step events over complete days, separately
from pageviews, unique-user estimates, merchant clicks and verified commission.
A code release does not establish a conversion or revenue uplift. If calculation
starts remain scarce, investigate landing reach before adding tool features;
if use exists but completion fails, reproduce that next observed failure. Do not
infer a person-level conversion rate from unrelated aggregate event counts.
