# Table review launch and growth loop

Owner request: continue launch and automatic marketing. Follow the repository marketing-loops skill; existing owned YouTube/TikTok accounts only, zero paid spend, no unsolicited messages or third-party community posting. Preserve ECO and other campaigns.

## Offer and message

For people rewriting or translating CSV text while amounts, quantities and identifiers must remain fixed: choose editable columns, compare the returned draft, restore locked values, review wording and export. The current tool is free. Subscription demand and time saved remain unverified; exports must not be presented as paid customers.

Landing pages: `https://baipiaoji.com/en/studio/table-review` and `/studio/table-review`.
Campaign: `bpj-table-review-01`; `utm_source=youtube` or `tiktok`; `utm_medium=organic_video`. Registered sources do not prove distribution. Shorts descriptions and TikTok captions may not provide clickable URLs; the video therefore shows the complete untagged destination. Do not claim an available profile link without checking it.

Launch asset: external GitHub release attachment `bpj-table-review-demo-20261112/bpj-table-review-demo-en.mp4` (verify availability before scheduling), about 39 seconds, 1080×1920, H.264/AAC. It is a continuous recording of the actual English tool, with editorial captions and a cursor highlight. Synthetic data and deliberately inserted errors are labelled throughout. It performs a real CSV download. The music is an original procedural composition; no external music, user data, model-performance benchmark or customer testimonial appears. The page does not run a model.

Reproduction after building the site: run `scripts/record-table-review-demo.py` with Python Playwright and Chromium/Playwright FFmpeg available (`WORKBENCH_CHROMIUM` optionally selects a system browser), then `scripts/render-table-review-demo.py` with system FFmpeg. Scratch outputs go to `/tmp/bpj-table-review-video`. The manual `Prepare BPJ table review media` workflow can regenerate and upload to the existing draft release using the repository token after matching the live runtime files; it has no schedule, refuses a published release and never replaces an existing asset. Review the entire video playback and audio stream, mobile readability, output contents and final asset hash before uploading the public release attachment. Runtime modules recorded must match the deployed release.

Suggested launch copy: “Keep the rewrite. Restore the numbers. This fictional CSV deliberately changes 12 to 120 and 1990.00 to 19900.00. BPJ compares unique IDs, restores locked strings and keeps permitted text edits for your review. Free local CSV checks and export; no account or file upload to BPJ. It does not verify facts or translation quality.” Use accurate self-promotion labels. No paid partnership or guaranteed result claim.

## Daily checks and weekly decisions

1. Verify the live destination, release status and queued/published receipts before acting. Check the latest shared GA4/reach snapshot instead of starting a duplicate fleet-wide query. Read the tool's fixed demo/own actions and campaign arrivals with their complete-day windows. Unavailable data stays unknown.
2. Keep a durable private dedupe record containing campaign/creative hash/network, pending publication UUID, provider status, public URL, observation-window start and next eligible date. Record intent before publishing and the returned receipt afterwards. If a request has an ambiguous result, reconcile it before another write. Never repost because analytics has not arrived.
3. Publish at most one new creative per channel in any rolling seven days, including launch. A follow-up must demonstrate a distinct real task or answer an observed question: leading zeros, reordered rows or a blocked duplicate ID. Repeating the same demo with new captions is not a new lesson. Check existing account schedules and avoid collisions with unrelated campaigns.
4. After seven complete days, compare distribution, GA4 arrivals/engagement and tool-action counts separately. Action totals are not people and the first-party actions have no user-level campaign join. No revenue or subscription conversion may be inferred. If reach exists but own-input use does not, inspect the message/landing continuity before adding features. Without enough observations, retain the hypothesis as unproven.
5. The initial automation trial ends after 28 daily checks. Every seven checks, return a compact decision: evidence, current bottleneck, one change, next measurement. Pause publication immediately for broken destinations, missing permissions, ambiguous duplicates or misleading content. No forced daily posts. Further subscription work requires a concrete repeated workflow and a deliverable that justifies charging.

The automation stores its receipt/state in its own persistent prompt or an existing private operations record. Do not commit analytics exports, account identities or raw customer inputs to this public repository. A scheduled post is not published; publication is not useful traffic; successful export is not revenue.
