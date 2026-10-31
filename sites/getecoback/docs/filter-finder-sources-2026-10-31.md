# Levoit US original-filter source contract

First checked: 2026-10-31. This extension serves consumers finding the original
replacement filter for an exact device model. It is an affiliate lookup tool,
not a sourcing service, a quality certification or a price comparison engine.

## Scope and evidence

Nine public official Levoit product JSON URLs were fetched successfully and
checked against their independent `description`, exact title and sole variant
SKU. They support ten device names: Core 200S-P, Core 400S-P, Vital 100,
Vital 100S-P, Vital 200S-P, LV-H132, LV-H133, LV-PUR131, LV-PUR131S and Vista 200.
Each record links to its exact official page and JSON source. Regional aliases,
missing `-P` suffixes and third-party equivalents are not inferred.

Example source pages:

- <https://levoit.com/products/core-200s-p-replacement-filter>
- <https://levoit.com/products/core-400s-p-3-stage-replacement-filter>
- <https://levoit.com/products/vital100-air-purifier-replacement-filter>
- <https://levoit.com/products/vital-100s-replacement-filter>
- <https://levoit.com/products/vital-200s-replacement-filter>
- <https://levoit.com/products/lv-h132-air-purifier-replacement-filter>
- <https://levoit.com/products/lv-h133-air-purifier-tower-replacement-filter>
- <https://levoit.com/products/lv-pur131-air-purifier-replacement-filter>
- <https://levoit.com/products/vista-200-replacement-filter>

The official collection endpoint is discoverable at
<https://levoit.com/collections/air-purifier-filters/products.json?limit=100>.
The scheduled checker does not crawl it or expand the catalog: it requests only
the nine approved single-product `.js` endpoints. These are public storefront
endpoints, not a contracted data API. Access or schema may change.

`part_number` contains only a consumer-facing part number present in the product
description. It is empty when no such number was verified. `merchant_sku` is a
separate Shopify variant identity, never a public filter number. Amazon searches
use the brand, exact model and original replacement-filter name. No Amazon ASIN,
stock, price, rating, commission percentage or revenue is inferred.

Only three source records state a verified interval: Vital 100, 6–8 months;
Vital 100S-P and Vital 200S-P, 6–12 months. These are manufacturer guidance, not
measured life or guaranteed schedules; other intervals stay null. No performance
or health marketing claims from the source descriptions are reproduced.

## Exclusions found during research

- Core 300 original-filter page has conflicting compatibility scopes: its
  independent description excludes Core 300S-P while another summary includes
  it. Neither model set is expanded from that inconsistency.
- Core 600S-P page title and description disagree (`600S-P` vs `600-P`). Excluded.
- LV-H128 description puts `LV-H128-RF` in the device-compatibility clause. Excluded
  until the manufacturer disambiguates the device and part identifiers.
- German Philips product pages now redirect to a different storefront, where
  the ordinary parser did not expose product text. Search also returned staging
  subdomains; these are not used to claim a dependable German refresh source.

## Fail-closed refresh and UI contract

Run `python3 tools/refresh_filter_finder.py` before the existing build, including
push-triggered deployments. There is no new cron, order, message or paid call.
The script makes at most nine requests, without redirect following or retries,
with a six-second per-request limit, a 60-second overall budget and 0.2 seconds
between requests. Linux also enforces the per-request wall-clock timer.

Each approved source has a fixed URL, handle, SKU and exact device-model list.
Only its `description` can establish compatibility; navigation, recommendations,
collection listings and `See Also` sections cannot. The complete normalized
description fingerprint must be unchanged, its approved compatibility clause
must remain present, and its consumer part number (if any) must still be present.
Title or SKU changes, new variants, statement changes or any other description
change require human source review before approving a new fingerprint.

- Exact unchanged evidence: `verified`; advance `checked_at` and
  `last_good_checked_at`.
- Changed/conflicting identity or statement: `conflict`; preserve last-good
  facts and dates and disable the purchase CTA.
- HTTP error, rate limit, timeout, invalid JSON or missing source fields:
  `unavailable`; preserve last-good facts and dates and disable the purchase CTA.
- Invalid local contract/source binding: nonzero exit, blocking the build.

Network degradation exits normally so the deployment can remove stale verified
CTAs. A page must require `status === 'verified'` for every Amazon purchase link.
Do not treat stored last-good facts as a successful current check. `updated` is
the manually reviewed catalog-facts revision date and is never changed by the
checker, including during an outage or recovery. Page `dateModified` must follow
that reviewed content revision, not a daily fetch or availability change.

Each release starts from versioned approved facts and rechecks all nine sources.
Build snapshots are not persisted back into the repository. `checked_at`,
`last_good_checked_at` and `last_attempt_at` describe the input snapshot and this
check; they are not a continuous cross-run audit ledger. On a fresh failed build,
the retained last-good date may be the versioned approval date, even if another
earlier deployment succeeded more recently. No outage-history persistence is
claimed.

Validate offline with `python3 tools/test_filter_finder_sources.py`. Tests use
synthetic official-shaped payloads and do not contact Amazon. They exercise
model changes, conflicting appended text, SKU/title substitutions, empty data,
rate limits, network failures, source bindings, request budget and recovery.

## Commercial boundaries

Compatibility lookup competitors and the official brand store already exist.
This page tests whether ECO can attract model-specific traffic and assist a
purchase using its established US tag `ecoback0d-20`. A completed lookup or
affiliate click is not a sale. Actual commissions require Associates evidence.
No search volume, expected return, customer interview or sale was established by
this source-validation work. Existing ECO window-seal measurement tools were
checked to avoid repeating that earlier feature.
