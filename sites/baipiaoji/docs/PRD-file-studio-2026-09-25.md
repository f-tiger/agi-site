# BPJ file workbenches — 2026-09-25

Owner request: “优化完善后，加入bpj自研工具板块”. This authorizes implementation and release under the site's existing deploy policy.

## Decision

Turn the Google Trends research into two usable first-party workflows: PDF assembly and product-image preparation. Trends indicate relative interest, not absolute search volume, customer interviews, paid demand or revenue. Mature PDF/image competitors are a counterargument to a generic paid converter. Test repeat workflows and onward use of the existing video studio before adding paid features.

## Scope and acceptance

- `/studio/pdf-tools` and `/en/studio/pdf-tools`: merge PDF files; select and reorder pages through explicit ranges; reorder files; rotate selected pages; convert JPEG/PNG/WebP images into PDF. Download an actual PDF and show the resulting page count and size. Reject encrypted or invalid documents. No OCR, PDF-to-Word, redaction, digital-signature preservation or PDF compression claims.
- `/studio/product-images` and its English counterpart: batch crop or pad to exact dimensions, encode JPEG/PNG/WebP, choose lossy quality, and optionally remove a plain background connected to the image edges. Preview and download actual images or a ZIP. This is not AI segmentation; intricate edges and backgrounds require manual inspection. Compression can increase size.
- Files and outputs stay in browser memory. Share links contain validated processing settings only. Do not transmit filenames, file bytes, image pixels or settings to analytics. Analytics use fixed tool/action/demo-or-own identifiers; QA flags suppress them.
- Real file limits, pixel/page bounds, progress, cancellation between operations, recoverable validation, output invalidation on changed input, and URL cleanup. Native upload inputs use localized visible controls. Keyboard labels, status announcements, mobile layout, dark mode.
- Reuse BPJ paper/ink styling. Image previews are functional work output, not decorative imagery. Use pinned, locally hosted MIT dependencies with licence notices.
- Add both tools to the first-party registry, home, search, sitemap, language alternates, structured data, llms.txt and relevant video workflow links. Free exports require no account. Only existing video cloud storage uses existing membership; no new paid service or API.

## Validation and release

Test page selection/order/rotation by opening generated PDF bytes, pixel-level background connectivity and geometry, safe filenames/settings and ZIP roundtrips. Check generated bilingual pages and dependency integrity. Exercise visible browser workflows, actual downloads, error recovery and responsive layout. Run repository deployment gates; release one `[deploy]` change to main, then verify live routes, canonical metadata and exact assets. Do not count synthetic tests as demand or purchases.

## Commercial follow-up

Measure own-file completions and existing video-tool onward clicks separately from demos. Existing research's 100 relevant visits / 20 completions / 5 pricing enquiries are proposed learning gates, not observed results. No paid ads, automated outreach or new billing in this release. A failure to get repeat own-file use should stop expansion of this product direction.
