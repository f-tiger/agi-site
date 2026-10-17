# Framepick: a visual catalogue people can browse

2026-10-17. Owner-requested material improvement to the existing English site, following its first release. This scope is separate from the Chinese creator-use experiment and its October 20 review.

## Goal and evidence

Help an English-reading viewer find a film to open, and a creator find a useful reference, at `https://baipiaoji.com/en/ai-video/`. The owner explicitly reported an underdeveloped visual style and too few videos. The first release has 40 unique works; it has no verified acquisition, repeat-use or revenue evidence. This request authorizes the bounded redesign and source-backed expansion, not a claim that demand is already validated.

The current mobile layout hides all hero images. Independent visual inspection on October 17 found the first catalogue image below the initial screen, while long descriptions slow scanning. The redesign should show the work before lengthy methodology and keep search within the first mobile screen.

Benchmarks read on October 17:

- [Runway Watch](https://watch.runwayml.com/): prominent imagery, visible creator credits and genre channels. Its archive includes older films; the date of our check does not make them new releases.
- [Short of the Week](https://www.shortoftheweek.com/channels/): separate genre, topic, style and country concepts. Borrow clear navigation, not a claim to have watched or reviewed every listed film.
- [Curious Refuge AI Film Gallery](https://curiousrefuge.com/ai-film-gallery): dated editorial discoveries. A gallery editor and a film's creator are different people; the catalogue must retain that distinction.

NOWNESS returned an access-limited content surface and Vimeo loaded only a partial shell in the research environment. Neither was treated as a fully inspected benchmark. Existing specialist catalogues and self-promotional community posts show competition, not independent demand for BPJ. General animation communities may explicitly prefer non-AI work; distribution must target an appropriate audience.

## Three optimization rounds

1. **Clarify:** improve the existing English video-discovery experience for viewers and creators. “Viral” means highly popular content, not an exclusive focus on brainrot. Preserve Chinese discovery.
2. **Strengthen:** increase usable, attributable records; separate recent discoveries, historical collections, festival recognition and unverified popularity. Favor clear film selection over a larger undifferentiated archive. Read community rules before treating a channel as usable.
3. **Operationalize:** deliver a responsive visual redesign, a larger validated snapshot, consistent human/machine-readable discovery surfaces, a concrete Reddit distribution package, independent reviews, full release gates and actual deployment/IndexNow receipts.

## Product decisions

- An image-led dark-blue viewing area followed by a quiet light catalogue. One prominent film and two compact editorial picks on desktop; one visible image and accessible search on mobile. Editorial picks are not audience rankings.
- Compact cards show title, creator, format and known runtime. Evidence, long explanations and uncertainty remain available without overwhelming browsing.
- Search and recommendations cover the entire catalogue. If the interface initially shows 24 records, loading more, saved lists, filters and direct work anchors must reveal the correct records. All works remain in server-generated HTML without JavaScript.
- Theme and format are distinct; English interface does not imply English dialogue, subtitles, creator nationality or US/European audience share.
- Expand from official publisher collections and attributable editorial sources. Deduplicate works across recognitions. A source that supplies only genre/credits gets an explicitly labelled source note, never an invented plot summary or first-hand review. Keep unverified metrics null.
- Keep original viewing links and click-to-load players. No media hosting, autoplay, new paid API, account gate, new scraper cron or automated social posting.

## Discovery and distribution

Keep one substantial canonical catalogue and stable work anchors. Add an original same-origin sharing image, truthful title/description and publisher identity, and useful on-page viewing guides. Keep HTML, JSON and Markdown facts consistent. Update the existing `llms.txt` description rather than adding speculative AI files or duplicate keyword pages.

[Google's AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) says ordinary SEO remains applicable and special AI markup is not required. The catalogue is not a single-video watch page, so it must not claim video rich-result eligibility with misleading VideoObject markup. Source access, structured data and text exports do not guarantee citation or recommendations.

Use the existing deployed-change IndexNow integration only after a successful release. Eligible URLs must be actual canonical pages, not query variants, fragments or data files. HTTP acceptance is not indexing or ranking. See the [IndexNow FAQ](https://www.indexnow.org/faq).

The marketing package will distinguish material prepared, channel rules verified, publication, referred visits, useful actions and independent references. No Reddit community is approved merely because an earlier promotion remains visible. No new spend, accounts, unsolicited messages, paid placement or community posting is authorized in this task. Existing Chinese tutorial material is not duplicated.

## Free value and commercial boundary

Free value is choosing a relevant film, finding its original source and saving a local shortlist. A creator can continue to BPJ's existing video-tool selection resources, without implying those tools produced a listed film. Paid value remains unvalidated: no film-viewing commission agreement or Framepick checkout is established, and ordinary viewing clicks are not affiliate revenue. Do not price or sell a new service in this release.

## Acceptance

1. Source contract rejects unsafe URLs, fabricated metrics, duplicate works and invalid dates. New records retain source publication and observation times separately.
2. Desktop and 360/390px mobile inspection confirms readable cards, visible imagery, keyboard focus, useful filters and no horizontal overflow. Test pagination and deep links against the full snapshot.
3. Browser tests preserve local search/watchlists, fixed sanitized analytics, QA/DNT/GPC/opt-out exclusions and no player requests before an explicit click. Tests are not GA4 backend receipts or actual viewing.
4. Final generated output has exact canonical, accurate schema, consistent counts/anchors/exports, a valid social image and the existing installed GA4 channel. Run after all generators and GA4 coverage installation.
5. Preserve the current-main release guards and all applicable workflow gates. Inspect actual deployment and IndexNow results; do not rerun daily collection to refresh dates.

## Baseline operational status

Current main was `afaf3bb` when restored. Existing scheduled run [39004278663](https://github.com/f-tiger/agi-site/actions/runs/39004278663) deployed source `7d7496cc259a9f26ba50e40ec4e5e7f4d2bb778b` at 05:02:51.308 UTC, but its final chain failed: Chinese catalogue ingestion rejected a duplicate identity and a separate free-tier MCP registry probe timed out. Later live discovery succeeded; neither erases the original failures. This English release does not rerun those maintenance tasks or claim to repair them.

## Implemented scope and review

The implemented snapshot contains 124 unique works, up from 40, across eight source collections. The 84 additions comprise 71 historical Runway Watch entries and 13 Curious Refuge editorial discoveries dated October 8–16. This is not 124 newly released films. The metadata snapshot was generated at 2026-10-17T06:20:51.508788Z; source publication and individual check times remain separate. See the [source expansion receipt](framepick-catalogue-expansion-2026-10-17.md).

The interface shows 24 cards initially, with local search over all 124, progressive loading, saved lists and stable work anchors. All 124 remain in the initial HTML for no-JavaScript access. An original 1200 × 630 sharing image, three source-linked viewing guides and consistent JSON/Markdown exports support discovery without inventing audience metrics or duplicate film pages.

Independent first-round design/source/SEO review informed the visual hierarchy, date semantics, explicit source notes and sharing metadata. Second-round independent source and technical review checked record identities, video IDs, authors, dates and the human/machine-readable surfaces. It found a same-anchor navigation failure after an empty search; the implementation and browser regression now restore that hidden entry. Independent 1440/390/360px visual review also found a long-title fallback overlap on narrow cards; the fallback is constrained while the full title remains below the image. These independent reviews are distinct from the implementation author's tests and the coordinating agent's build/release self-checks.

The [English marketing package](english-video-marketing-2026-10-17.md) contains channel evidence, two review copies, commercial limits and a publication-based observation plan. Reddit rules returned an unreadable shell or 403 in this environment, so no community is marked cleared, and no post or message was sent. Material preparation is not distribution, user acquisition or income.

Actual deployment, post-release HTTP verification and IndexNow receipts must be recorded separately after the existing release gates finish. This specification alone does not establish a release, indexing, AI citation, playback or a GA4 backend receipt.
