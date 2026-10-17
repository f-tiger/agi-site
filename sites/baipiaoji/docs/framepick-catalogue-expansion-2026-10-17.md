# Framepick catalogue expansion — 2026-10-17

This change expands the English discovery catalogue from **40 to 124 unique works**, across eight source collections. It adds 84 works, not 84 independently verified popular videos. The catalogue is an editorial discovery surface; it does not measure US or European audience popularity.

## Sources and dates

| Added collection | Works | What the date means | Verification |
| --- | ---: | --- | --- |
| [Runway Watch](https://watch.runwayml.com/) — 2023 catalogue | 60 | The year assigned by Runway to the work | Read the official catalogue and checked each selected work's official detail page |
| [Runway Watch](https://watch.runwayml.com/) — 2024 catalogue | 11 | The year assigned by Runway to the work | Same checks; these remain historical entries |
| [Curious Refuge gallery](https://curiousrefuge.com/ai-film-gallery) — 2026 | 13 | Gallery article publication dates, October 8–16, 2026; not original upload dates | Read each article, its creator attribution and embedded YouTube reference |

The Runway catalogue was read at **2026-10-17T06:15:58.230884Z**. Its internal record timestamps are not treated as video upload dates. All 71 selected detail pages returned HTTP 200 and contained the expected title and matching embedded video ID. Individual check timestamps remain in the dataset.

Curious Refuge's gallery was read at **2026-10-17T06:15:58.430124Z**; individual articles were read at **06:16:44–46 UTC**. Article metadata explicitly supplies a `-0500` offset. Stored article timestamps are converted to UTC; no named local timezone or original upload date is inferred. The article byline is distinct from the credited filmmaker: the gallery's writer is not substituted for the film creator.

The reviewed dataset was written at **2026-10-17T06:20:51.508788Z**. A build must preserve that source snapshot instead of refreshing its evidence date. Earlier records keep their existing review dates.

## Selection and information limits

Runway additions cover its science-fiction, story, animation, eerie, experimental, fashion and creative-partner collections. They have credited creators and individual viewing references. The source supplies no plot synopsis for these entries, so all 71 carry **`summaryKind: source-note`**. Their card copy describes source context and explicitly says a synopsis is unavailable; it does not invent a plot. Unknown durations remain unknown, and these entries use the general video format rather than asserting they are all short films. Genre labels reflect editorial interpretation of named source channels; ambiguous channels retain empty genres.

The 13 Curious Refuge additions have original BPJ plot summaries based on the gallery's descriptions. Eleven are described as short films, one is an art reel, and one is explicitly a trailer. Examples include [Low Orbit](https://curiousrefuge.com/ai-film-gallery/low-orbit-ai-sci-fi-short-film), [The Palace](https://curiousrefuge.com/ai-film-gallery/the-palace-ai-short-film) and [Pentimento](https://curiousrefuge.com/ai-film-gallery/pentimento-ai-short-film). The trailer for [Gods Don't Give Gifts](https://curiousrefuge.com/ai-film-gallery/gods-dont-give-gifts-ai-film-trailer) is not labelled as the complete work. Contest participation does not establish a nomination or award.

These checks verify public metadata and source-embedded references. They do **not** establish successful playback, original uploader identity, regional access, language or subtitles. A direct YouTube metadata probe returned a proxy HTTP 403, so further YouTube probing stopped. Playback and platform counters remain unverified. Publisher or gallery AI classification does not independently audit the production workflow.

No views, likes, audience geography, heat score or audience rank was invented. The source collections are unranked. Existing festival awards remain attributed to their respective editions. Neither recent article publication nor current metadata review makes a historical video a current hit.

## Exclusions, identity and media

- The wider Runway catalogue contained 205 records. The expansion selects 71 relevant works rather than importing every record, interview, repeated segment or archive entry.
- Nineteen current Curious Refuge article reads succeeded. Thirteen were selected; six with uncertain original attribution, unverified third-party IP context or only other social-platform embeds were held out. A twentieth article returned HTTP 429, after which this source crawl stopped.
- The Higgsfield action-contest page returned HTTP 403. It was not retried with another identity and no new entries were inferred from it.
- Titles and YouTube IDs are checked for duplicate works. Existing cross-festival recognitions stay nested in the original work instead of increasing the count. The two earlier additional recognitions remain intact; the 84 additions are new catalogue identities.
- Runway posters remain remote references to the images on its official page; matching YouTube thumbnail references are preserved in metadata. Failed images fall back to original title artwork in the interface. No film, audio or third-party image is downloaded into the public site or rehosted. Source inclusion is not a redistribution licence.

## Validation and publication status

Six data-contract tests pass, including rejection of duplicate video IDs under different titles, invented popularity, unsafe media URLs, malformed dates and awards on unranked editorial collections. The checks also preserve historical years, source-note labels and the distinction between trailers and complete works. `git diff --check` passes for the changes.

These are data and local-test results, not a deployment receipt, playback test, acquired audience or revenue. The release owner must complete the existing build, browser, live SEO/GEO/GA4 and applicable changed-URL IndexNow gates. No new scraper schedule, paid API, account, marketing publication or traffic query was introduced by this expansion.
