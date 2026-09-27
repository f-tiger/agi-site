# TDS non-PDF tools — 2026-09-27

## Decision and evidence

Owner corrected the previous six-tool directory: add other categories besides PDF. Homepage now has five actual categories: images, text/data, time/collaboration, file verification/delivery and PDF. Nine tools total; the three new categories lead. Default English home, explicit German/Chinese routes and TDS styling remain.

Considered image preparation, structured/text data, scheduling, creator video/AI and developer helpers. BPJ's current home already fronts product-image batches, video and Agent/MCP workflows. ECO serves energy/home decisions. TDS's three initial additions are bounded local utilities with inspectable results and no new paid API dependency. Existing alternatives include Squoosh, JsonDiffPatch and timeanddate's meeting planner. Their existence is supply evidence, not proof that TDS will acquire users. No search-volume, revenue, interviews or competitive advantage has been established for these additions.

## Implemented

- `/image-compressor`: up to eight static JPEG/PNG/WebP files; resize without enlargement; export actual JPEG/PNG/WebP files; transparent JPEG pixels receive a white background. Shows dimensions and real input/output bytes, including larger results. Limits: 20 MiB each, 50 MiB total, 20 MP each, output 4096 px per edge. Animated files, SVG, HEIC and GIF are outside scope. Bad files are shown individually and partial batches do not emit a complete event. Files are processed sequentially with temporary URLs revoked when cleared or replaced.
- `/json-compare`: validate/format/compact JSON and compare structures using JSON Pointer paths. Decimal number tokens remain exact, including large numeric IDs; number comparison avoids floating-point rounding. Rejects duplicate decoded keys, invalid syntax, excess depth/size/change counts. Object key order is ignored, arrays compare by index. Exports formatted JSON or an explicit change report. Not JSON5 or JSON Schema validation.
- `/time-zone-planner`: compare 16 city/time zones for a single meeting; reject DST gaps and require explicit choices for repeated times. Uses the browser's timezone rules. Shows 09:00–18:00 weekday hints as assumptions, and exports UTC-based ICS with escaped text and UTF-8 line folding. No attendee availability, holiday rules, recurring events, calendar access or invitation sending.

All three tools have EN/DE/ZH pages, actual examples and downloads, local processing, metadata, canonical/hreflang, visible matching FAQ, text mirrors and capability entries. The homepage groups all four PDF functions together and links the new tool examples. The main generator now owns 48 pages and a 45-URL document sitemap.

New fixed task completion/sample events validate their tool path. Samples/CI are excluded from demand. Homepage selections cover nine fixed tasks. Extracted the shared telemetry module so delivery/verification and the common page script use one per-load deduplication set; no double page view from differently versioned app imports. No new identifier, stored input, cookie, database migration, paid service or cron.

## Validation

37 Node tests pass: real PDF regression cases, JSON precision/hostile keys/input limits, image boundaries, DST gaps/folds and unusual offsets, UTC calendar output/escaping/75-byte UTF-8 lines, locale parity and bounded event collection. The static verifier passes 48 pages, and the structured-data gate finds 152 visible FAQ/DefinedTerm entries with no mismatch.

Browser checks pass for all nine localized new tool pages at mobile width, desktop and mobile directory layout, nine tool links in five groups, three direct scenario articles, three real JPEG/PNG/WebP round trips, exact long IDs, duplicate-key rejection, explicit repeated-time handling, valid UTC calendar output and existing PDF comparison. No processing POSTs or browser errors were observed in local QA. Example and CI traffic are isolated. The local runner has no CJK system font; Chinese content and layout are verified independently of that rendering limitation.

## Evaluation boundary

Use settled search impressions/clicks for these new paths, own-input completion/export actions per tool, and separately observed referrers. Anonymous action counts cannot establish unique users, retention, payments or AI citation. If distribution is absent, the product hypothesis remains untested. Do not infer causality from an uncontrolled before/after homepage comparison, and do not launch paid image/AI infrastructure based on sample clicks.

## Sources checked

- https://baipiaoji.com/ — current portfolio overlap
- https://getecoback.com/ — current portfolio positioning
- https://squoosh.app/ — image-tool alternative
- https://jsondiffpatch.com/ — structured comparison alternative
- https://www.timeanddate.com/worldclock/meeting-help.html — existing timezone planning workflow
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
- https://developers.google.com/speed/webp/docs/riff_container
- https://www.rfc-editor.org/rfc/rfc8259
- https://www.rfc-editor.org/rfc/rfc6901
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- https://www.rfc-editor.org/rfc/rfc5545

## Production

Published commit: `524b07238a8bb2c51c8c67a60cf3b76e532fe26a`. [Deployment run 36326929243](https://github.com/f-tiger/agi-site/actions/runs/36326929243) completed successfully. The public build stamp matches. All 48 generated pages passed the production verifier; direct checks confirmed all nine new localized tool pages, the nine-tool/five-category homepage and the updated stats endpoint. The live document sitemap has 45 URLs; the assembled full sitemap has 100.

At 14:44 UTC (22:44 Shanghai), changed-content IndexNow accepted 51 URLs with HTTP 200. At 14:45 UTC (22:45 Shanghai), Google Search Console accepted both updated sitemaps and queued their download. Acceptance does not establish indexing, ranking or AI citation. The isolated D1 CI event was written, read back and excluded from demand counts.
