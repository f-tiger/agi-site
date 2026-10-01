# Quote Studio, growth round 2

Date: 2026-10-01. Owner: continue the next round of marketing/traffic work. Scope remains BPJ Quote Studio, not the other fleet sites.

## Brief and counterchecks

Three refinements: (1) route relevant existing visitors into a concrete client-quotation task; (2) preserve zero-signup use, private configuration and the existing real-task gate; (3) verify related-page entry, direct demo → own editor, manual recommendation and honest event counts in the final deployed build.

Adversarial self-check 1: zero usage a few hours after launch does not justify declaring failed demand or adding more product categories. Related placement is limited to existing video surfaces; there are no new keyword pages or unrelated chat/coding promotions.

Adversarial self-check 2: opening a native share chooser, copying a pitch or switching a sample into an editor is not a delivered message, a new user or an actual client quote. Share data must not include the current location, quote fragment, brand, prices or client details. Canceled and blocked operations need usable fallback without a false success counter. These are self-checks, not independent reviews.

## Baseline, not a growth claim

At **2026-10-01 19:33:27 Asia/Shanghai / 11:33:27 UTC**, live `/api/reach?days=7` returned `quote_signals.ok=true`; all quote actions were zero. The response window starts September 24 and includes the partial October 1 UTC day. This is about two and a half hours after round 1, too early for a demand verdict. The events are client-reported actions, not people, and can miss blocked/lost traffic.

Existing video-tool entries contributed **6 external-referrer page-view events** in that response: `/en/tools/google-flow` 2; `/en/tools/haiper`, `/tools/dujia`, `/tools/jianying`, `/tools/qingying` 1 each. The site has 20 video-tool records. Their proximity to video work makes contextual links reasonable; these very small counts do not establish a scalable channel. Larger unrelated Kimi/Grok traffic is not repurposed with irrelevant quote promotions.

The earlier GSC baseline predates the tool. Search Console lags and the same-day sample is not reinterpreted as a post-launch result. No outreach, community posting, paid acquisition or verified creator trial has happened in this round.

## Delivered changes

1. The existing video entry component offers a clearly labeled free interactive quote alongside video production. All 20 video-tool records in both languages, the video category and existing home video section use the same component. Ordinary static links reach the live sample; no extra scripts or blocking popups are added. Fixed `video-tool`, `video-category` and `home` labels carry no vendor or visitor identity.
2. Direct public demos explain the sample, show a visible “Use template with my rates” action and focus the brand field on entry to the editor. Actual customer links and downloaded customer files retain their focused quote view. Preview quantity changes do not overwrite creator defaults.
3. A recommendation panel copies a fixed localized introduction plus clean public URL, or invokes native sharing when the browser supports it. Browser/clipboard failures offer a selectable-text fallback. `AbortError` reports cancellation or no available app, without automatically copying after cancellation. Native resolution is not described as delivery. All sending remains a deliberate visitor action; automated tests use a stub and send no external message.
4. A measurement defect is corrected: direct demo visits previously emitted `demo_preview`, but only appeared in `builder_entries` after the visitor opened the editor. New `entry_open` and `entry_sources` cover public entry documents including demos; `demo_start` records the explicit editor transition. Existing metrics remain intact and no historical entry events are backfilled. `tool_message_copied` requires clipboard success; `tool_share_requested` is only a request, not confirmed sharing. The response-cache version changes with the schema; existing daily export retains it.

## How to judge the next evidence

- Read `entry_sources` for public arrivals and `builder_entries` for editor appearances. Do not add them together as visitors or divide them to claim a joined person-conversion rate.
- If no relevant entries occur, the unresolved problem is distribution. This small internal channel and visitor-driven sharing are not a substitute for recruiting a qualified sample.
- Entries with little editing justify observing first-use friction. Edits/copies with no real task evidence justify investigating handover fit. Neither permits a fabricated retention or revenue claim.
- The October 29 gate remains unchanged: 10 qualified creators, at least 5 own configurations, 3 independently confirmed client handovers and 3 second-task uses. No new recurring job or paid tier is created. Avoid further category/platform expansion while qualified reach is missing.

## Sources and limits

- Live first-party aggregate described above; it is not a unique-user or search-engine report.
- [Google Search Central — link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), checked October 1. Its guidance supports crawlable, descriptive links placed in relevant context; it does not promise traffic or ranking improvement.
- [MDN — Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), checked October 1. Native sharing requires user activation, has platform-dependent support/results, and can reject on cancellation, absent targets or policy restrictions. Automated tests prove our payload/fallback behavior, not that a real iOS/Android app received a message.
- [Prior growth record](bpj-quote-growth-2026-10-01.md), [scoped marketing context](../tools/quote-page-lab/.agents/product-marketing.md). The earlier Tally case is inspiration only; no borrowed traction or viral-growth claim is made.

## Verification record

New coverage exercises real SQLite ingestion/aggregation and index usage; public-demo entry is distinct from editor entry, missing reads remain null, and non-video tool pages receive no quote CTA. Browser tests cover direct entry, mobile visibility, keyboard focus, actual clipboard content, no quote leakage, canceled/blocked/resolved native-share stubs, manual clipboard fallback and a real generated Google Flow → demo link. Existing money, export, bilingual and QA/privacy tests remain in force. A mobile visual check also found an existing 5px overflow from a long official-source URL; evidence links now wrap without changing the URL. Final gate results and deployment evidence are recorded in the associated PR; successful tests are not real-user adoption.
