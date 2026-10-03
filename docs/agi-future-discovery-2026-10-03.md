# AGI Future Guide: fresh sources and daily discovery

Owner feedback: the first collection was too small and old; include known interviewers, technology creators and video commentary, and let the website discover new material without a conversation being active.

## Delivered scope

- The reviewed collection grows from 3 interviews / 4 views to 16 distinct interviews / 30 bilingual views, producing 64 HTML routes and matching Markdown mirrors. Fourteen interviews were published within the 30 days ending 2026-10-03. Latest source: Airbnb written interview, 2026-10-02; latest reviewed video: OpenAI product interview, 2026-09-30.
- A separate discovery feed monitors 10 publisher sources: Latent Space, Dwarkesh, Lenny, Lex Fridman, No Priors, AI Explained, Two Minute Papers, Fireship, 硅谷 101 and 张小珺. The first real run succeeded for 10/10 sources and produced 101 matching items at 2026-10-03T07:26:23Z. These are content items, not 101 verified interviews or claims.
- Content type, source language, needs and creator/title search filter the feed. Reviewed views have publication sorting, 30/90-day/archive filters and an interview directory. Both lists reveal six entries at a time. Every detailed view links to its original source and distinguishes source paraphrase, uncertainty and editorial interpretation.
- Source metadata comes from publisher RSS/Atom, with up to 12 current items per source, 120 total and a 180-day publication window. It is a bounded selection, not a complete crawl. AI relevance and need tags are deterministic keyword filters and may miss or over-include items.

## Autonomous path

`deploy-agiscorecard.yml` retains the existing daily `50 2 * * *` schedule (10:50 Asia/Shanghai; GitHub may delay execution). An independent `future-discovery` job reads public feeds, writes `foresight-assets/discovery.json`, commits only that snapshot, then the existing deployment job fetches current main and builds the site. Manual `refresh_future=true` also runs discovery. Ordinary pushes skip external discovery. No additional cron, personal notification, paid model or external service is created.

The deploy job waits for discovery but also runs when discovery is skipped or fails. A failed source retains its last good items and success timestamp; failed statuses are committed before the final gate marks the discovery job red. Publication, first discovery, last attempt and last success are distinct. The page marks checks older than 36 hours overdue. The open browser fetches the published snapshot every five minutes, while visible; this does not poll upstream sources or imply real-time video discovery.

Normal incremental budget: roughly 0.5–1 runner minute/day, 15–30 minutes/month, estimate only. Ten public feed requests/day, four concurrent workers, 20-second timeout each, 5 MB response cap each, 5-minute job cap (150 runner minutes/month worst case). No paid API credentials or increased existing AI quotas. Repository billing is not inferred from this estimate.

## Evidence and editorial boundaries

- Every new reviewed source was opened at its publisher. Video IDs came from publisher links/embeds. No invented video or timestamp for audio/text sources.
- Leah Belsky: audio publisher lists 2026-09-14; TED transcript and host article list 2026-09-29. Sorting uses the earlier release, with the discrepancy visible.
- Molly Graham: public episode outline and public companion essay only; no claim to have read the paid transcript.
- Runway page includes a different written interview alongside the podcast; video perspectives are attributed to Anastasis Germanidis.
- John Platt and sources without checked chapter times use section/context locators and full-program links. `start:null` never appears as a verified 00:00 timestamp.
- AI Explained and technology commentary are creators' interpretations, not automatically scientific evidence. Discovery metadata never enters the reviewed claims catalog automatically. Jarvis remains an editorial research guide, not a running prediction model.
- First self-check: provenance, date semantics, source formats and attribution. Second self-check: failure retention, chronological filtering, unique interview/claim counts and mobile reading flow. These were self-checks, not independent reviews.

## Product and conversion

Free value: discover recent material across creators, choose by practical need, inspect source-backed views, and keep/export an action notebook. Returning use comes from new source material and revisiting saved questions. Existing paid value remains cross-device cloud workspaces and version history; the update does not invent a paid report subscription or claim payment readiness beyond the member page's existing checks.

Use the existing consent-gated fixed source/save/plan/cloud events. Never send search terms, notes, opinions or feed queries to analytics. Distribution uses the existing owned homepage entry, crawlable pages, sitemap and text mirrors; no third-party messages, paid advertising or outreach were sent. Hypothesis to evaluate after sufficient traffic: source opens and saved plans per consenting visitor improve; repeated visits and completed paid orders must be measured separately. This release is not evidence of retention or revenue.

## Validation and release

Local real feed run succeeded; deterministic RSS/Atom tests cover publication vs update time, future/undated rejection, irrelevant content, duplicate links, failure retention and unsafe URLs/XML. Browser checks cover both languages, all 30 detailed routes, text/audio/video behavior, source/type/language/needs filters, pagination, date sorting, local records, export/import, calendar, the existing cloud handoff without upload, mobile overflow and the original homepage countdown.

Existing site validation and hreflang pass. SEO/GEO: canonical URLs, metadata, structured data, internal links, sitemap and Markdown/llms mirrors are generated from the same content. IndexNow remains on existing authorized workflows; this change does not submit per push or claim indexing.

The first scheduled run after deployment is still future execution. The initial snapshot was fetched with the production refresh script locally; this is not represented as a successful GitHub scheduled run.


## 2026-10-03 video library expansion

The owner's next acceptance criterion is hundreds of distinct videos, while keeping the video-first homepage simple. Three planning passes narrowed this to: (1) at least 300 actual videos, (2) direct publisher channel verification and exclusion of Shorts, (3) retained history and creator filtering without a new service or cron.

The production refresh script checked 46/46 sources at 2026-10-03T09:00:29Z and produced 682 raw records. After merging reviewed sources and deduplicating the visible library: 381 videos, 289 audio episodes and 10 text items. There are 379 unique YouTube IDs plus two publisher-hosted videos. Of the videos, 231 fall in the previous 30 days and 300 in the previous 90 days; 25 are Chinese-language. These counts are metadata references, not a claim to have watched every video or reviewed hundreds of viewpoints. The reviewed catalog remains 16 interviews and 30 bilingual viewpoints.

The 38 YouTube feed channels include creator commentary, full interviews, academic talks and company channels. Each new channel ID was read from the public channel page, then checked against the corresponding official Atom feed. Empty/mismatched or unverified candidate channels were not added. Shorts URLs and explicit #shorts titles are excluded. Original dates, publisher titles and short attributed introductions are retained. Company channels are explicitly distinguished from independent creators in the source filter.

The prior feed limits (12 per source, 120 total and replacement on every success) are removed. Successful refreshes now merge by canonical video ID or URL, preserve firstSeenAt, and keep entries after they roll off a feed. Retention is bounded to 730 days, 120 entries per source and 3,000 overall; failed sources preserve eligible cached entries and their original lastSuccessAt. Counts are computed after deduplication. A six-worker pool makes 46 bounded requests/day (20 seconds and 5 MB maximum each), inside the existing five-minute discovery job. Estimated normal incremental runner time is 0.5–2 minutes/day (15–60 minutes/month), not a billing measurement. No API key, paid model call, additional cron or new recurring service was introduced.

The existing daily 02:50 UTC schedule remains. The initial expanded snapshot is a real local run of the same production script; the next scheduled run with the expanded list has not yet occurred. Browser refresh reads the published snapshot and preserves an active player.

The homepage still starts with four video cards and six topic chips. A creator selector helps navigate the larger collection and persists in the URL. Media remain separated, source counts follow the selected filters, and reviewed viewpoints retain their priority. More videos do not inflate the reviewed viewpoint count. Existing free access, source opening, local notes and exports feed into the established cloud workspace offering; no report subscription or new payment claim was added.

First adversarial self-check: video identity, original dates, Shorts, duplicate publisher syndication and misleading summary labels. Second self-check: feed rollover, source failure, two-year retention, mobile overflow, creator query persistence and a sampled inline video player. These are self-checks, not independent reviewers. Targeted regression coverage enforces at least 300 distinct YouTube references, 30 creator sources, Chinese videos, rolling retention, cross-URL deduplication and channel identity validation.

SEO/GEO use the existing canonical pages, metadata, sitemap and Markdown/agent mirrors. Existing GA4 consent-gated media/source actions are preserved, and the shared coverage check runs after generators. Creator names and search terms are not sent to GA4. IndexNow uses the existing weekly workflow; no per-push submission or search indexing result is claimed.
