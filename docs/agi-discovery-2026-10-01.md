# AGI SEO, GEO and IndexNow — 2026-10-01

## Scope and decision

Improve discovery of the existing AGI evidence product, following the homepage release in PR #66. No new keyword pages, invented research updates, paid acquisition, outreach or inference spend. The free reader task is to inspect and reproduce dated verdicts; the existing paid research workspace remains a separate, unverified commercial hypothesis.

Three prompt refinements: (1) separate indexing from low demand/impressions; (2) make human answers, sources, metadata and agent extracts agree; (3) verify deployment and record discovery submissions without claiming rankings. Two adversarial checks: a successful HTTP submission is not indexing, and merely changing a page date cannot make evidence current. An AI-readable file is a convenience, not evidence of AI citation.

## Observed baseline

Search Console inspection returned PASS / Submitted and indexed / INDEXING_ALLOWED for all six sampled URLs:

| URL path | Last reported Google crawl, UTC |
|---|---|
| `/` | 2026-09-30 23:20:58 |
| `/cn` | 2026-09-21 05:09:36 |
| `/progress-index` | 2026-09-25 05:30:54 |
| `/zh/progress-index` | 2026-09-26 21:46:55 |
| `/ai-and-your-job` | 2026-09-06 14:42:41 |
| `/for-agents` | 2026-09-25 01:38:18 |

These crawl records predate this release. The sitemap-performance tool reported 285 sitemap URLs and matched 40 URLs with impressions for September 1–28, with scanLimit=87. This is not a complete indexing census. The homepage had 25 impressions / 1 click; progress-index and for-agents each had 10 impressions / 0 clicks. Counts this small do not establish a reliable title/CTR winner. The sitemap API's indexed=0 fields must not override successful individual inspections.

Main and video sitemaps had no reported warnings/errors. The current sitemap contains 285 URLs, whereas the last registered main sitemap report listed 253 submitted URLs. Re-submit the live sitemap after deployment and record its actual acknowledgement separately from future indexing.

GSC Wizard has no configured IndexNow key for this property. The site already has a public verification file used by its GitHub job. Retain that existing key and submission path; do not describe the connector's missing setting as a missing site key.

## Delivered changes

- English and Chinese homepage FAQ prose and FAQPage data are generated from the same source strings and current published ledger. Removed the older duplicated FAQ claims. The dataset's reading remains September 6; the score and verdict/history files are unchanged.
- A visible citation passage states the scope, supportive/unresolved/refuted counts, reproducible formula, uncertainty and attribution. Links go to the existing method, original JSON, calibration and editorial policy. The page serves people and agents the same content.
- Website/Organization/WebPage/Dataset identities and canonical URLs are consistent across the homepages. Chinese social preview metadata is complete. This does not guarantee a Google rich result.
- Generated `/index.md` and selected Chinese evidence mirrors join `/cn.md`; the published HTML remains canonical. HTTP canonical links accompany existing noindex headers. The installable `/skill.md` is preserved as a skill rather than mislabeled as a mirror.
- `llms.txt` opening facts are generated from the ledger rather than hardcoded. `llms-full.txt` and mirrors are extracted from visible content. These are useful access formats, not special Google ranking requirements.
- One shared robots group applies existing operational exclusions consistently to all listed crawlers, while allowing public pages. Added the already-published video sitemap declaration. Public access still depends on the edge; deployment verifies actual responses.

## IndexNow operating contract

The existing Monday 03:17 UTC schedule and manual workflow remain; no new schedule or provider expense. Removed redundant tool submissions on every deployment. The AGI main-host job now:

1. Requires successful deployment of the relevant source tree.
2. Selects changed source HTML canonical URLs and new live-sitemap URLs. Analytics/style-only changes do not submit the whole site. Ledger changes include the pages that describe that ledger.
3. Rejects redirects, off-host/query URLs, wrong canonicals and noindex pages; verifies the public key before sending. A removed sitemap entry alone is not proof of deletion; actual 404/410 removals are notified.
4. Records HTTP 200 as received and 202 as received/key-validation-pending. Both retain indexing=unknown. Rejection/timeout leaves the cursor unchanged and does not trigger a tight retry loop.
5. Persists the accepted comparison cursor and public receipt outside the deployed site directory, with a 30-day workflow artifact. No-change runs do not submit.

`data/indexnow/agi.json` starts at the commit before the October 1 homepage changes. Its initial receipt is null; that baseline does not invent an earlier submission. First live IndexNow submission remains pending until the scheduled/manual job actually runs. The next existing weekly slot is October 5, 2026, 11:17 Asia/Shanghai. Other subdomain/Web3 jobs retain their prior behavior and are outside this main-host change.

## Evidence and follow-up

Contract tests cover source/visible/schema agreement, idempotence, shared robots rules, actual mirror response headers, changed-URL selection, key validation and HTTP error semantics. Existing bilingual browser, site validation, hreflang, breadcrumb and D1 gates also apply. Post-deploy verification checks the actual rendered source fragments, mirror bytes/headers, robots and key file.

After at least 14 complete days compare same-scope GSC impressions, clicks and landing pages. Inspect crawl timestamps separately; retain the October 1 GA4 measurement boundary. AI referrals are a proxy for visits, not the number of citations. Fixed assessment completion events and provider-confirmed revenue remain different outcomes. Do not expand content volume until query/task evidence identifies a useful gap.

Primary references checked October 1:

- https://developers.google.com/search/docs/appearance/ai-features — ordinary SEO fundamentals apply; no special AI schema/file requirement or indexing guarantee.
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies — structured data must describe visible, relevant content.
- https://www.indexnow.org/documentation — host/key validation, changed URLs, and distinct 200/202/error semantics.
- https://developers.openai.com/api/docs/bots — search and training crawler roles differ; they must not be treated as interchangeable ranking switches.
