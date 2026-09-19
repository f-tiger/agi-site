# DollScout collector upgrade — 2026-09-19

The interrupted agi-grow task reported completed but unpublished work. That workspace could not be recovered: the originating task returned a system error and main contained no collector upgrade. This change reimplements the reported scope against main at 9a5b500912aca7b2d1d9649e02da9d1d73a5dda0. It does not claim to recover the original unpublished files.

## Delivered behavior

- English and German homepages lead with collection tracking, display planning and a starter guide. Existing sourced Labubu guides, probability calculators and language entry links remain available.
- `/collection-tracker` and `/de/collection-tracker`: local inventory and wishlist, quantities, edit/delete, text search, duplicate-quantity filtering, JSON backup/restore and spreadsheet-safe CSV export. One shared local-storage format across languages. Invalid imports are rejected before replacement; restore requires confirmation. Failed storage writes never report success. No collection contents are sent to analytics.
- `/display-calculator` and `/de/display-calculator`: rectangular grid capacity, gap between figures, height constraint, optional uniform 90° rotation, centimetre/inch conversion and a top-down preview. Explicitly excludes optimal mixed packing, stacking and load/compatibility assessment.
- `/collector-guide` and `/de/collector-guide`: inventory, budget, measurement, channel checks and backup workflow. US and German Amazon display-accessory search links use the existing market-specific affiliate IDs and disclose their nature.
- Sitemap, IndexNow URL list, llms page list, internal links, privacy text and event allowlist include the new tools. The existing deployment workflow adds tool tests, generation consistency and new-route checks.

## Validation before publication

- Eight automated tests pass: documented packing example, height/exact fit, units, invalid dimensions, backup round trip, malformed/oversize backups, CSV formula quoting, and six-route deployment/discovery wiring.
- Existing structured-data gate: 92 entries checked, zero mismatches.
- Existing odds generator and wiring guard pass; the new generator reproduces all six localized pages.
- Browser preview: added a Unicode-named figure with quantity two, refreshed to verify persistence, edited it into the wishlist, and verified the duplicates filter excluded it. Display calculator returned nine figures with rotation and retained that result after conversion to inches. Mobile homepage inspected at 390 px.
- Static assembly succeeded. Deployment and production verification are separate steps; this pre-publication record does not claim traffic, conversions, revenue or a completed production release.

## Operating notes

Run `node scripts/gen-collector-pages.mjs` from the site directory after changing localized page copy. It generates the six tool/guide pages; homepage insertion is intentionally one-time so subsequent runs preserve homepage edits. Run `node --test scripts/collector-tools.test.cjs` before publishing. The existing llms-full build includes the new pages during deployment.

Collection data is local to a browser and origin. Downloaded JSON is the recovery format; CSV is not an import format. Duplicate filtering is based on an entry's quantity, not fuzzy matching of names. Tool events represent use, never sales.

## Production release — 2026-09-19 13:01 UTC

Owner explicitly approved merging and production deployment, and requested that routine follow-up fixes and releases proceed without repeated confirmation. PR #11 was squash-merged as `63c2b8a7a79ddb6e15ecb01666ad7c9d306b4a6c`.

[Deployment run 35444454920](https://github.com/f-tiger/agi-site/actions/runs/35444454920) completed successfully. The production build stamp matched that SHA. All six new English/German pages returned HTTP 200 with zero redirects; shared assets and existing routes also passed. The beacon endpoint returned 204 and `/api/pulse` passed. IndexNow accepted 51 URLs with HTTP 200; acceptance is not a claim of indexing or traffic growth.

Production interaction testing from the desktop browser was unavailable because navigation timed out. Interaction tests were completed on the local preview as documented above; production route, build and service checks were performed by the deployment runner. No growth or revenue outcome is claimed.
