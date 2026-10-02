# TDS tools inside every brand detail page

Owner request: the other toy detail pages should also contain tools, as the Labubu page now does.

## Three-pass brief

1. Complete the current brand set: SKULLPANDA, Jellycat and Sonny Angel, in English, German and Chinese. Keep tools on the detail page.
2. Match the task to the collection: style odds for blind boxes; full-dimension display planning for figures and plush. Reuse the verified probability and display cores; do not copy Labubu odds into other series.
3. Ship working controls, honest examples, mobile layouts, original-language brand names, source links, static text and structured data. Update homepage/video paths, AI discovery and the existing registry listing. Verify existing retirement, privacy, measurement and changed-URL submission rules.

## Two self-reviews

- Evidence/model review: official POP MART confirms the 12 regular Image Of Reality names and The Onlooker secret. Sonny Angel's current product page confirms 12 Fruit Series regular names. Neither retrieved source establishes a per-style probability for this tool. Both start with the probability blank. Regular mode explicitly assumes equal regular probabilities and secret replacement. Multiple different secrets require exact per-style odds, rather than using a combined secret rate for a named figure. Case assortments, hints and conditional remaining-box odds remain excluded. Examples use a clearly labeled 5% rate and six independent draws, not a claimed product rate.
- Failure/measurement review: blank, fractional, negative and out-of-range inputs clear calculated results. Fit tests height, optional rotation and spacing using the same core as MCP. Plush uses the full measured display pose, without compression or safety claims. Large grids are described numerically instead of drawing a misleading wrapped layout. Initial previews and explicit probability-demo submissions do not count as task completions. Fit submission requires a user input change before recording. Only the fixed action name and canonical path are measured, never dimensions, probabilities or style selection; QA, automation and privacy opt-outs remain excluded.

## Delivered product scope

| Brand | Inline tools | Page fragment |
|---|---|---|
| Labubu | Existing named style, secret and printed probability | `#style-probability` |
| SKULLPANDA | Image Of Reality/custom-series style odds; display grid with height and rotation | `#style-probability`, `#display-fit` |
| Jellycat | Full-pose plush size and shelf capacity estimate | `#display-fit` |
| Sonny Angel | Fruit Series/custom-series style odds | `#style-probability` |

All four brand pages have a local primary action. SKULLPANDA has a two-tool jump menu. Homepage collection cards link to their relevant tool; the Jellycat video links to the localized inline plush planner. Existing free trackers and ledgers remain available.

The buyer/user is a collector checking a planned purchase or display. All new tasks are free and require no account. No new paid offer, payment capability, marketing message, ad spend or recurring job is introduced. This release improves the existing watch/guide-to-tool path; it does not establish increased traffic or revenue.

## Source review — 2026-10-02

- https://www.popmart.com/us/products/953 — Image Of Reality product identity and style names; no claimed official probability is derived from this page.
- https://www.sonnyangel.com/en/products/ — current Fruit Series regular names; keep separate from older series lists on the same page.
- https://us.jellycat.com/ — official product source; dimensions in the tool are illustrative user-editable examples, not copied product specifications.
- Existing Labubu sources and probability limits remain as documented in `tds-video-style-odds-2026-10-02.md`.

## Discovery, release and measurement

- MCP version 2.3.1 updates the existing `io.github.f-tiger/dollscout-collecting` listing. The eight callable tools are unchanged; `calculate_style_probability` and `plan_display_fit` already share the browser cores. No duplicate tools are added merely for brand names.
- `find_collector_tools` now exposes all relevant EN/DE/ZH inline targets; `get_collecting_guide` returns the primary tool and complete `toolUrls` for each brand. HTML, WebApplication markup, text mirrors and llms files match those entry points.
- Canonical URLs and language groups are stable. Existing IndexNow automation submits eligible changed URLs after deployment. Acceptance is not indexing or citation.
- First-party `odds_calc` and `display_calc` retain their action meaning, once per page/event. Compare the brand-page visits and explicit actions by canonical path through the existing D1 reporting. They are not users, purchases or revenue; no new GA4 business-event mapping is asserted.
- Local checks and production receipts are recorded in the associated pull request; only successful deployment and exact official-registry readback qualify as released/registered.
