# TDS search and citation recovery — 2026-09-27

## Verified baseline

Property: `sc-domain:thedollscout.com`. GSC settled window 2026-08-28–2026-09-24: 370 impressions, 4 clicks, 1.08% CTR, average position 23.51. This predates the September 25 Document Scout pivot and cannot measure the new direction. Clicks: rarity 2, home 1, checker 1. September 25–26 query returned no rows but dates are incomplete; that is not confirmed zero traffic.

Fresh URL Inspection on September 27: `/pdf-accessibility-checker` fetched successfully on September 26, robots allowed, crawled but currently not indexed. `/verify-file` submitted and indexed, crawled September 27 at 13:03 UTC. The latter supersedes an earlier same-day unknown-URL reading. No evidence establishes a sitewide crawling block or penalty.

First-party document stats at 13:17 UTC: 7 anonymous document view actions, no own-file completion events, 12 excluded CI events. These are not 7 people. GA4 LLM traffic returned an empty section, not usable evidence of zero AI referrals. Past database read-limit failures mean historical telemetry can be incomplete.

## Delivered implementation

- Integrates the existing unshipped discovery draft: task-oriented titles, independent SHA-256 explanation, scoped public links, related document tasks and static multilingual source representations.
- Adds four distinct worked examples to all 12 EN/DE/ZH PDF tool pages. The production reader parses deterministic public sample PDFs at build time. HTML and text use the same results. Public `sample-results.json` includes sample SHA-256 checksums, sizes, inspected findings, text and the original-to-revised page mapping. These are fictional examples, not testimonials, certification or a benchmark.
- Replaces repeated generic FAQs on the tool pages with tool-specific visible questions and matching structured data. Adds W3C sources to the checker example. Stable `#worked-example` anchors support exact citation.
- Generates a 36-URL document sitemap excluding the collector archive, declares it in robots, retains the full sitemap and reciprocal EN/DE/ZH canonical language groups. Existing first-publication dates remain September 25; actual content revision date is September 27, never the daily build clock.
- Adds observed-referrer event breakdowns and claimed crawler-agent counts to the existing document stats endpoint. Uses the same single bounded grouped query and five-minute cache. No new identifier, cookie, stored document data, database table or cron. Google AI features are not distinguishable from ordinary Google referrals here; bot user agents do not prove verified crawls or citations.
- Changes the legacy TDS IndexNow script from all-URL resubmission to actual changed public paths on push. Scheduled unchanged rebuilds and replayed historical pushes skip submission. Key-file validation precedes notification. HTTP acceptance does not mean indexing.

## Verification

26 existing/targeted Node tests pass, including real PDF parsing, privacy, partial batches, source attribution and changed-URL selection. Generated-page verifier passes for all 39 localized pages, checking canonical, hreflang, links, samples and exact checksums. Structured-data gate: 134 visible FAQ/DefinedTerm entries, zero mismatches. Browser checks: desktop and 390px EN/DE/ZH pages, no page overflow or JavaScript errors; the real compare sample runs successfully. Local browser has no CJK system font; Chinese text content and layout are checked, and CJK glyph rendering on a normal user device is not inferred from the test runner.

## Interpretation and next decision

The implementation improves findability, specificity and independently checkable evidence. It does not establish rankings, citations, acquired backlinks, customers or revenue. Existing ordinary SEO remains relevant to AI search; adding llms files is not a ranking requirement.

After settled post-pivot data is available, use separate questions: unknown URLs → discovery and sitemap processing; crawled/unindexed → content utility and canonical selection; indexed/no impressions → demand and query fit; impressions/no clicks → snippet and intent; visits/no completed tasks → usefulness and friction. Compare own-file actions separately from demos and CI. Do not calculate a user conversion rate from these unjoined action counts.

No outreach messages, forum posts, bought links or new scheduled jobs were sent or created.

## Sources checked

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.openai.com/api/docs/bots
- https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF3
- https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF16
- https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF18

## Production verification

Published commit: `d0dcf4a48f6ccbd40e13c930bdcf075130cd8e44`. GitHub Actions run https://github.com/f-tiger/agi-site/actions/runs/36322800047 completed successfully. Production build stamp matched this commit. All 39 localized pages and generated sample checksums passed the live verifier.

September 27 at 13:34 UTC: live document sitemap contained 36 URLs and no collector archive URLs. Google Search Console accepted both document-sitemap.xml and sitemap.xml; downloads were pending at submission. Changed-content IndexNow notification accepted 42 URLs with HTTP 200. Neither acceptance establishes indexing, ranking or citation.


## Homepage task directory follow-up

Owner asked to follow BPJ/ECO's multi-entry structure instead of putting one PDF workspace at the front of TDS. Replaced all three localized homepages with a six-tool directory grouped by checking documents, extracting/comparing text, and verifying/preparing delivery. Added three concrete task journeys. Existing tool URLs, parser behavior and examples stay in place; the default home remains English `/`.

The homepage now uses CollectionPage plus a visible six-item ItemList, localized metadata/FAQ and matching text mirrors. Navigation says all tools, and sharing describes the directory accurately. No login, upload, search query or new tool is introduced. Added six fixed anonymous tool-link actions, restricted to home routes, plus distinct homepage-view, dedicated-tool-view and selection totals in the existing single-query aggregate. Older home views remain in the reporting window; link clicks are not completions or unique visitors.

Validation: 27 Node tests; 39 localized pages; 134 visible structured-data entries without mismatches; 18 localized directory-to-tool navigations; EN/DE/ZH desktop and 360–390px mobile without horizontal overflow; six tool links available with JavaScript disabled; real comparison sample completes without browser errors. The change improves tool discovery but does not establish that the old homepage caused low search traffic, or that the new one will receive rankings or AI citations.

Production status: awaiting release verification.
