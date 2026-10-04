# German autumn buying paths and measurement

The owner requested execution of the German search-entry, autumn-content and
conversion-measurement recommendation. This is an improvement to existing free
room-climate guidance and the existing affiliate path, not a new market launch.
No customer analytics or merchant financial reports are published here.

## Change

- The homepage table no longer maps floor area to a dehumidifier litres/day
  recommendation. It directs readers to conditions and the existing decision
  guide. Its caption uses the dataset's actual rating caveat instead of a
  universal half-output claim; relative humidity is a prompt to investigate,
  not a guaranteed mould boundary.
- Existing condensation, basement, mould and heater guides link to measurement,
  a bounded buying decision or operating-cost comparison. The touched autumn
  paths use room-climate branding instead of the inherited heatwave label.
- The moisture decision tool previously sent results only to its first-party
  collector. It now dispatches the existing fixed `legacy:buyer_result` contract
  to the shared optional GA4 channel. No answers, temperatures, humidity readings,
  destination URLs or product choices enter that event. The first-party event
  remains separate. A content hash refreshes the module for returning visitors.
- Existing tagged merchant links, consent/refusal/withdrawal and single-owner
  affiliate click collection are retained. No new paid offer is opened.

## Search and release scope

Keep existing canonical URLs and language pairs, regenerate changed guidance
mirrors and normal discovery surfaces, and run the existing SEO/schema/GA4 gates.
Google indexing and ranking require a Search Console read; public robots,
canonical and sitemap checks cannot establish either. Current connector access
is unavailable. Do not invent a submission receipt or label this a ranking fix.
IndexNow uses the existing release mechanism only; acceptance is not indexing.
Storage and balcony-solar pages remain permanently removed, including Growatt.

## Validation

`test_conversion_routes.py` checks actual next-step files and fragment targets
and prevents the homepage from restoring an area-only capacity claim.
`test_buyer_decision.mjs` preserves model-selection safety and collector scope.
`browser_moisture_analytics.cjs` uses actual built pages and form interactions
with all network requests intercepted. It checks pre-consent suppression,
completion without answer payloads, repeat-result deduplication, one affiliate
click despite legacy callbacks, and suppression after withdrawal. This proves
frontend behavior, not GA4 backend receipt or real customer use.

## Follow-up decision

Read genuine consenting `buyer_result` and `affiliate_click` events by public
page and country, alongside the separate first-party counts. Compare complete
14-day windows after release; if fewer than 100 qualified visits reach the
changed paths within 28 days, label reach insufficient rather than declare a
conversion win/loss. These are operating thresholds, not statistical proof.
Do not infer a causal funnel from unrelated event totals. Merchant-confirmed
items, commissions, reversals and matching date/store scopes determine revenue;
shared store tags do not establish a site's income. No new recurring job or
external promotional messages are part of this release.

The PR browser gate also needed to match the final analytics installation.
Its old `load`-then-count consent check raced dynamic module imports, and smooth
scrolling under a mocked clock could miss the popup threshold callback. It now
waits for the installed consent UI, uses instantaneous native scroll positions,
and advances the clock for callbacks; purchase and one-click assertions remain.
The new isolated result-event browser case is part of that gate.
The remaining deterministic failure was a stale assertion: the heater-cost and
English 20 m² moisture routes intentionally remove unconditional product shelves
and popups in `demand_tools.py`. The browser gate now explicitly requires those
surfaces to be absent, exercises the actual tool result and verifies that an
unknown-moisture result does not show shopping links. Historical baselines and
all non-protected popup scenarios keep their original market/click checks.
