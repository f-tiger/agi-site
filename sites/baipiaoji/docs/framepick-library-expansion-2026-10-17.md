# Framepick library expansion — 2026-10-17

The release candidate expands the English catalogue from **124 to 217 unique works**, across **12 source collections** (previously eight): 85 Runway entries and eight Curious Refuge selections. These counts describe verified metadata coverage, not newly published films, completed plays or audience popularity. Publication receipts are recorded only after deployment.

## Runway source review

This follow-up adds **85 distinct Runway-listed works** to the existing 124-work catalogue. It covers 69 Gen:48 selections, eight music videos and eight entries from the 2023 AI Film Festival archive. These are historical, source-backed discovery entries, not an October 2026 popularity chart.

| Collection | Added works | Year basis | Source representation |
| --- | ---: | --- | --- |
| Gen:48 — 2023 | 63 | Year assigned by Runway Watch | Festival selections; explicit award labels preserved without numeric ranks |
| Gen:48 — 2024 | 6 | Year assigned by Runway Watch | Festival selections; finalist status is not an award or audience ranking |
| Music Videos | 8 | Runway Watch assigns 2023 | Unranked music-video collection, under the existing 2023 source |
| AI Film Festival — 2023 archive | 8 | Explicit source festival label | Official award wording; no inferred numeric placement |

Examples include [The Myth](https://watch.runwayml.com/the-myth), [Be An Elephant](https://watch.runwayml.com/be-an-elephant), [Absolve](https://watch.runwayml.com/absolve) and [Generation](https://watch.runwayml.com/generation). The music-video collection adds reference material for general video creators without mixing in filmmaker interviews or behind-the-scenes recordings. The source gives the work titled [2026](https://watch.runwayml.com/2026) a **2023** catalogue year; its title is not used as a date.

## Curious Refuge Feel-Good selections

Eight works come from the [official 2026 AI Feel-Good Film Competition page](https://curiousrefuge.com/2026-ai-feel-good-film-competition). The source was already cached at **2026-10-17T06:15:58.753870Z** and was reused without another request. Its planned April 9 winner announcement is not treated as the page publication date or a film upload date; both remain unknown. These are not described as October releases.

Only the explicit jury placements carry numeric ranks: *In Another Breath* (1st), *A Little Water Bear* (2nd), and *Spring* (3rd). The other five are unranked selections. Audience-vote selection does not mean audience popularity. *The Bird Watcher* was excluded because the cached source gave conflicting creator spellings.

Each entry sends the visitor to the official competition page, where they find the credited title and use its embedded player. Vimeo IDs are recorded solely to identify and deduplicate works; BPJ adds no Vimeo player, direct Vimeo viewing link or poster reuse. Source notes describe selection context, not individual plot synopses. Dialogue, subtitles, regional playback and original uploader identity remain unverified. The contest's stated AI requirement is source evidence, not an independent audit of each production workflow.

## Evidence and timing

The source catalogue was originally observed at **2026-10-17T06:15:58.230884Z**. This review reused that cached catalogue instead of repeating its discovery crawl. Its 205 records were matched against existing titles and video IDs before selecting new candidates.

All 85 selected official detail pages were read individually between **2026-10-17T07:01:56.756507Z and 2026-10-17T07:02:19.255642Z**, with two requests in parallel. Each returned HTTP 200. Each receipt checks the relationship between its slug, title, creator credit, catalogue year, source channel and YouTube ID, plus the corresponding actual iframe and poster URL in the response. Poster URLs are used only when present in the source HTML; they are not accepted merely because a guessed CDN path looks plausible.

The dataset distinguishes the earlier catalogue observation from each later detail check. The original 124 works and eight existing source collections retain their previous IDs, dates and contents. No source publication date, original upload date or runtime is inferred from an internal catalogue timestamp.

## Representation and exclusions

All 85 additions use **Source note** descriptions because these source entries do not provide individual plot synopses. The copy explains the official collection or selection context and credited creator; it does not invent story details. Music is an editorial genre label based on the source's Music Videos channel. Festival entries without supported genre information keep empty genre lists.

[Trailer for Kowloon Night and Fog](https://watch.runwayml.com/trailer-for-kowloon-night-and-fog) is labelled as a trailer. Other additions use the general video format, with unknown runtime. A source-embedded player reference does not prove complete playback, original uploader identity, subtitle availability or regional access.

Gen:48 finalist labels remain separate from award labels. The 2023 AI Film Festival archive retains the source's explicit awards; numeric ranking is left unknown. Views, likes, audience geography and popularity remain unverified. No combination of awards or collection membership is converted into a heat score.

The remaining Runway Community TV and Runway Studios entries were not imported as filler. These include repeated series segments, interviews and behind-the-scenes material outside this selection. Ten Aleph-edition candidates remain on hold because the cached page's structured dates and visible edition information do not establish a dependable publication year. No date is guessed to make them appear recent.

Duplicate work IDs, normalized titles, YouTube IDs and Vimeo IDs were checked across the combined catalogue before saving. Source collections and multiple recognitions do not inflate the unique-work count. Posters remain remote source references; BPJ does not rehost films or third-party images and does not claim redistribution rights.

## Execution boundary

The Runway review added no source domain, player capability, paid API, account, scheduler or traffic query. No marketing post, message, deployment or IndexNow submission was performed by this data task. HTTP source checks are metadata verification, not user adoption or revenue. The release owner completes the data-contract, build, browser and actual publication gates before reporting the new catalogue as live.

## Task optimization and acceptance

Three task-refinement rounds narrowed this request to: (1) continue the existing English catalogue and source cache, without duplicating Chinese acquisition or marketing drafts; (2) admit only distinct works with official identity evidence, excluding interviews, compilations, uncertain editions and conflicting credits; (3) ship one bounded content change with provenance validation, existing search/discovery surfaces and the current-main release gates. No new category pages or acquisition schedules were added.

The data contract now permits a clearly labelled source note for a festival selection without inventing a synopsis. Source-kind restrictions apply equally to primary and additional recognition. Optional Vimeo identities must be unique and retain source-page-only access; they cannot be combined with a YouTube identity or enable new media hosts. Eight data-contract tests and five generated-page/search tests passed locally. Full build, final assets, browser acceptance, independent review and release results are recorded below when completed.

Two independent adversarial rounds were completed. The first reviewed candidate admission, historical dates, finalist wording, source-note semantics and nested recognition restrictions. The second independently compared the final catalogue with the main baseline, reparsed all 85 saved Runway detail responses and the cached Curious source, and reran all eight contract and five generated-page tests. It found no blocking issue. All 217 titles are searchable, and the HTML, JSON, Markdown Works section and CreativeWork list agree on 217 unique entries. The English site search contains the hub plus 217 work entries. The data authors' own checks and the coordinator's checks are separate from those independent reviews.

The coordinator completed the full build, workbench/member finishing steps, final GA4 installation and verification, public engagement installation and verification, six final English tests, all-site static verification, canonical checks, and existing lastmod/IndexNow-selection tests. Static verification reports zero broken links, structured-data errors, English Chinese-text leakage, placeholders, count contradictions or hollow pages. These are software checks, not analytics backend receipts.

Final English HTML is 1,018,182 uncompressed bytes; initial enhanced presentation remains 24 cards and three eager images. No field Core Web Vitals, regional media playback or speed improvement is claimed. Official collection filters and full names work; shorthand queries such as `Gen48` and `AIFF` are not currently recognized. Further search aliases or pagination changes require observed user/search or performance evidence, rather than an unverified traffic claim.

An independent browser reviewer ran the existing full Framepick suite and additional collection checks against the finished local build. Gen:48 2023/2024 filters return 63/6 entries, AIFF 2023 returns eight, and Feel-Good returns eight with the explicit 1/2/3 placements in order. All eight Feel-Good entries open only the intercepted official page and expose no preview button or new player. Desktop and 360/390px mobile checks passed, with first-screen search, no horizontal overflow and no observed control/title overlap. Network fixtures do not prove third-party image delivery, regional playback or GA4 backend collection.

The release changes only five BPJ files. The existing repository dependency filters also match BPJ library changes for ECO/AGI/TDS; their automatically triggered outcomes must be reported separately. No workflow, other-site source or account configuration is modified. The existing push release retains all CI gates and current-main rollback protection. No extra workflow dispatch, rerun, cancellation, collection cron or business-report query is requested.
