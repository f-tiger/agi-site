# BPJ tool-site monetization: accurate purchase paths and outbound evidence

## Scope and buyers

BPJ remains a general tool site. Revenue paths are separate: BPJ cloud projects,
third-party tool affiliate purchases, labelled direct sponsorship, and a possible
ad-network integration after account and site approval. This release does not
introduce a new paid product or restrict an existing free export.

Cloud-project buyers need cross-device saves and version recovery. Third-party
buyers need a suitable vendor plan; vendors own those transactions and refunds.
Sponsors buy a specified placement and term, without a promise of traffic or sales.

## Three planning passes

1. Preserve the tool-site scope and compare all four revenue paths; do not assume
   one industry or tool category is the only business.
2. Check actual catalog configuration, product APIs, payment gates and existing
   measurement before making commercial claims.
3. Ship truthful purchase navigation and catalog-level outbound counts, while
   keeping existing payment and discovery gates. Recovery uses the existing
   BPJ-only receipts workflow; it is separate from the product release.

## Delivered behavior

- Chinese and English pricing link to free tools, free accounts, cloud membership,
  Codex Efficiency, third-party upgrade comparisons and labelled sponsorship.
- HTML and `/pricing.md` use the payment modules' existing plan constants.
  Published prices do not assert current availability. Legacy data-service keys
  remain usable and are clearly separate from cloud membership.
- Affiliate disclosure reflects whether catalog affiliate links are configured.
- `conversion_stages.directory_outbound` reuses the existing indexed event query.
  It publishes known catalog slugs only, sorted by action count, plus an
  unattributed count. No new SQL, identities, events or scheduled task is added.
  The exporter already preserves this object in its normal daily snapshot.
- Counts use the existing complete UTC-day window. Repeats count again; missing
  reads return null. These counts do not establish people, orders or commissions.

## Activation prerequisites

Affiliate activation requires a verified approved account, the owner's link,
applicable terms and payout eligibility. Preserve discovery rules; do not put
affiliate links into unreviewed entries. Add local disclosure and sponsored-link
attributes, and verify fixed-ID GA4 attribution before activating the first link.
The legacy `click_tool` adapter does not preserve affiliate parameters. Historical
ordinary outbound counts must never be relabelled as affiliate activity.

Ad-network activation requires the actual publisher ID and site approval. Review
eligible original content pages before a limited placement; do not blanket-load
ads on navigation, account or tool-input pages. Measure actual ad impressions,
reported earnings and tool completion effects before expanding.

No new account application, outbound sales message, ad spend, payment switch or
secret is created by this release. Payment receipts may restore existing checkout
availability but do not prove demand or a completed buyer transaction. GitHub
schedule delays can still exceed the existing four-hour safety window.

## Review and validation

First adversarial pass: distinguish free accounts, paid membership, separate
products, future services and third-party subscriptions. Keep purchase readiness
on the existing product pages and preserve free exports.

Second adversarial pass: verify that measurement adds no query, publishes no
arbitrary tracked strings, excludes current partial days and QA, and retains
unknown states. Check bilingual navigation and machine-readable pricing together.

Release checks include SQLite aggregation/cache tests, export selftest, catalog
and route verification, browser checks, final GA4 coverage and read-only live
verification. Product deployment uses `[outcome-readonly-release]`; it does not
create test purchases, alter checkout configuration or run recovery implicitly.

Commercial evidence is reviewed in the existing operating record. A future
affiliate evaluation window starts from real activation, and separates on-site
clicks, vendor-attributed activity, approved commission and actual payout.
