# TDS resources and revenue experiment — 2026-09-27

## Optimized execution brief

Grow useful, repeatable acquisition that can produce actual revenue. Give TDS three clear entry paths: use a browser tool, choose open-source software, or learn from a credited YouTube introduction. Preserve the twelve working tools. Each resource must answer a concrete task, state setup/limitations, link authoritative sources, and lead to an action the site can actually deliver. Measure discovery, usage, commercial intent and earned commission separately. Do not sell unbuilt capabilities or claim SEO/AI-citation guarantees.

## Adversarial decision

- A generic catalog loses users to upstream downloads. Add task-specific selection notes, installation constraints, a four-step exercise and a relevant browser-tool continuation. Six reviewed projects are an initial test, not validated demand.
- Embedding someone else's YouTube video does not create TDS video-ad revenue. Three videos are learning/distribution assets, with original TDS checklists and a next tool. TDS does not own, rehost, dub or republish the footage.
- Existing $9-equivalent/9-USDT collector membership is unrelated to these workflows. It is not promoted as a paid AI entitlement. The $79 team-delivery concept remains unbuilt.
- Existing US/DE Amazon affiliate channels provide an available revenue mechanism. The creator-kit page offers optional microphone, lighting and storage comparison links, with free troubleshooting first and compatibility checks. These are category searches, not product tests or paid endorsements. No prices or commission rates were invented.
- Equipment intent may be weak among people seeking free software. This is an explicit commercial risk. Do not scale hundreds of catalog entries based on page impressions alone. A future paid service or software partnership requires a real deliverable, supported entitlement, and verified demand; none is represented as available here.

## Implemented scope

- `/open-source` plus six individual selection/workflow pages: Upscayl, Whisper, Ollama, OBS Studio, Audacity, Shotcut. Licenses and model/cloud distinctions are linked, dated and visible. External software has not been installed or benchmarked by TDS in this release.
- `/videos` plus three watch pages: Upscayl (2024-12-04, 4:07, Upscayl), Audacity (2023-07-10, 18:21, Kyle Stedman), Shotcut (2019-09-13, 15:30, James Woo). Original publication dates remain visible. Shotcut's official tutorial page links the selected introduction. Old UI caveats are explicit.
- `/creator-kit`: optional affiliate comparison paths, EN/ZH → amazon.com / ecoback0d-20; DE → amazon.de / getecoback-21. Links are marked sponsored. Retailer purchases do not unlock TDS functions.
- EN, DE and ZH interface/content. Videos themselves are English. Twelve tools/six tool categories remain unchanged. Twelve new resource routes × three languages = 36 pages; total 93 generated pages, document sitemap 90 URLs (collector archives excluded).
- One data source and page generator; accurate canonical/hreflang, visible FAQ, ItemList and attributed VideoObject, complete plain-text mirrors, llms indexes and public resource-library JSON. Resource pages are not marked as TDS WebApplications.
- Opt-in youtube-nocookie player; no thumbnails/player connections before load; no autoplay; close/reload and YouTube/documentation fallback. Referrer policy supplies the origin required by the YouTube embed. Opt-in loading may limit video rich-result eligibility; no claim of guaranteed Google video indexing, AI citations or third-party playback in every region.
- Fixed anonymous events for resource entry, upstream download, checklist export, player load, external YouTube visit, next-tool visit and equipment clicks. Extra payload keys, unknown slugs and mismatched event/page pairs are rejected. Query-free share URLs include new resources and repair the prior AI share allowlist omission.

## Measurement and scale gate

Use `/api/document-stats` for `resource_views` and `resource_actions`; the existing daily workflow archives this report. No new scheduled job was created. `doc_video_load_*` means a player was requested, not watched. `doc_gear_*` means an outbound action, not an order. Anonymous page/action counts cannot establish unique-user conversion, cohort retention or order attribution. QA uses `?ci=1`; demos and probes remain separate.

Operating gates below are provisional decisions, not statistical significance or revenue forecasts:

1. Review after 28 days. If fewer than 300 resource-page view actions are observed, acquisition evidence is insufficient: improve distribution and search-intent fit before expanding the catalog.
2. With at least 300 view actions, fewer than 30 checklist/next-tool actions is a warning about usefulness. Review by page, remove weak entries and improve the exercises before increasing output. The 30/300 comparison is a coarse action ratio, not a user conversion rate.
3. After 100 equipment outbound actions, reconcile actual eligible orders and earned commissions in the merchant reports for the matching period/market. If this path produces no confirmed net commission, do not expand equipment content on the strength of clicks; revisit the commercial offer. Cross-site use of a tag can prevent TDS-only attribution, so tag-wide revenue must not be labeled TDS revenue without a supported breakdown.
4. Expand one task cluster at a time only when it produces useful actions and a verified commercial signal. Require a distinct task, source review, real exercise and real next step for every page. No keyword-swapped mass pages.

Monthly revenue arithmetic, without invented input values: eligible orders × realized net commission per order. Acquisition scenarios may additionally model qualified visits × outbound rate × merchant purchase rate × net commission, but every unobserved factor must remain an assumption. Current release has no observed attributed orders or revenue.

## Primary evidence

- Project source/license links are recorded in `sites/thedollscout/scripts/documents/growth-data.mjs` and the generated public resource-library JSON. Audacity's LICENSE.txt explicitly distinguishes GPLv3 distribution from individual source-file licenses. OBS README states GPLv2 or later. Whisper and Ollama runtime license files are MIT; Upscayl is AGPLv3; Shotcut is GPLv3.
- https://shotcut.org/tutorials/
- https://obsproject.com/kb/quick-start-guide
- https://support.audacityteam.org/
- https://docs.upscayl.org/
- https://docs.ollama.com/
- https://www.youtube.com/watch?v=3M77flVZlVY
- https://www.youtube.com/watch?v=Im2W7pokfpw
- https://www.youtube.com/watch?v=JtsB2iZRb9c
- https://support.google.com/youtube/answer/171780?hl=en — privacy-enhanced mode and origin referrer requirements.
- https://developers.google.com/search/docs/appearance/video — video discovery/watch-page requirements; markup is not an indexing guarantee.

Video titles/authors/thumbnail URLs were returned by YouTube oEmbed on 2026-09-27; dates/durations were extracted from public watch-page metadata. Official license files and current documentation links were retrieved successfully. Search-engine demand/volume was not measured in this iteration.

## Validation

- 46 Node tests passed, including new telemetry rejection, revenue separation, resource sharing and affiliate-market checks; all previous PDF/AI/utility tests remain passing.
- Static verifier: 93 pages, 90 document-sitemap URLs; canonical/hreflang, asset/local-link integrity, attributed video metadata, opt-in player and affiliate destinations.
- Structured-data gate: 182 visible FAQ/DefinedTerm entries, no hidden/mismatched entries.
- Chromium: 39 localized mobile page layouts (36 resources + three homes), no overflow or page errors; no third-party connections before player load. Three real checklist downloads and canonical sharing validated. Players create the verified nocookie embed URL, close and reload; external fallback remains available. This verifies embed integration, not uninterrupted third-party playback worldwide.
- Desktop homepage and watch-page screenshots inspected. Source license links returned HTTP 200. Existing AI share URL repaired and checked in browser.

Publication checkpoint (2026-09-27): implementation committed to main as `27d692b45424bfc151dcfecbeb7c7b6bb9ff11fe`. GitHub run `36331720010` failed before allocating a runner: first job `108654811135`, retried job `108655106107`, both with empty steps and no runner. No build log was created. The connector does not expose the corresponding startup annotation. A read-only browser fallback reached the private repository sign-in wall; the secure login request was cancelled. The exact platform-side failure reason is unverified; do not infer a billing problem or change budgets/settings.

At the first production check, `/__build.txt` remained `615fe184d432506aa6fe3986eb51ce7f7c2377ee`, not this feature commit. This release is implemented and committed, not confirmed deployed. Do not submit the new sitemap until the resource pages are live. Next action: inspect the startup annotation in the authenticated run detail, resolve the concrete platform blocker, then rerun the existing deployment, verify 93-page production manifest/resources and only then submit changed URLs and sitemaps. No additional fee, permission expansion, alternate hosting or paid plan was authorized.
