# Earn delivery history and retest release — 2026-10-01

## Three prompt refinements
1. Continue the already published Earn tools; fix the loss of delivery-check results on reload before adding more speculative paid products.
2. Preserve explicit local-only privacy, distinguish aggregate flag counts from verified repairs, and avoid presenting human client services as AGI membership benefits.
3. Deliver bilingual opt-in summary history, validated backup/import, guarded retest comparison and links to the existing cost/workspace journey; verify parsers, actual browser persistence, responsive layout and live deployment.

## Decision and commercial scope
The preceding release shipped nine project briefs and ten upstream GitHub comparisons. This increment addresses a directly observed product gap: lab results previously disappeared on reload. No new customer demand, settled purchases or revenue is established by this work. Free delivery checks, summary history and portable backups help readers inspect their own client work. WorkflowCost and the existing membership page provide the next costing/cloud workspace path; summaries are not automatically synced and membership does not include human review, engineering or translation services. Keep existing demand gates; do not interpret downloads as purchases.

## Delivered behavior
- Save up to 20 summaries only after the user clicks save. Stored fields are check kind/version, record counts, aggregate flag counts, thresholds, generated record ID and save time. Raw SRT, run IDs, filenames and media are excluded.
- JSON backups are schema checked, bounded to 100 KB and 20 reports, deduplicated by record ID, and imported atomically. Existing records survive rejected imports. Unknown fields are stripped. Browser persistence failures are reported rather than claimed as saves.
- Compare two selected summaries only when type, engine, normalized thresholds (including workflow review time) and record counts match. Aggregate before/after counts do not identify particular defects or prove fixes. Users must choose the same task and scope.
- Delete individual summaries or explicitly clear all. Browser storage is device-specific and may be cleared; portable backups are available without a paywall.

## Two self-adversarial passes
1. Privacy and input boundaries: reject malformed schemas, oversized backups, unknown flags, invalid thresholds and duplicate IDs; retain only whitelisted fields. Confirm raw captions/run IDs are absent from backups. No AI calls, uploads or new backend/database paths.
2. Interpretation and resilience: block differing scope/threshold comparisons; invalidate old findings when input changes; avoid repair/quality certifications; show unavailable/full storage errors. Browser tests cover refresh, export/import, malformed backup preservation and local deletion in both languages. Fixed an asynchronous test race by waiting for imported history, rather than asserting before file reading completed.

## Verification
Eight deterministic tests pass; static validation covers 269 pages and 247 sitemap URLs. Actual Chromium tests cover English/Chinese mobile and desktop, local saves/reloads, sanitized backup roundtrip, comparison and scope rejection, prior video/quote behaviors, no checker external requests, and original website-audit fixture screenshots. Deployment verification additionally checks both lab pages and both JS modules; the existing full deployment pipeline remains the release gate. Live outcome is recorded in the release PR.
