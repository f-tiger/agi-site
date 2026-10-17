# BPJ Framepick: English AI-video discovery

2026-10-17. Owner-requested English subsite for viewers and creators in Europe, the US and other English-reading markets. This is a new authorized product scope, separate from the Chinese creator-use experiment and its 2026-10-20 review.

## Decision and evidence

Publish one useful catalogue at `https://baipiaoji.com/en/ai-video/`, with independent sources, search, editorial categories and official viewing entries. Do not translate Hongguo positions into an international chart. The interface is English; the films' spoken languages, production countries and audience geography are not assumed.

Primary sources checked on October 17:

- [Runway AI Festival](https://aif.runwayml.com/) and its [screening room](https://aif.runwayml.com/screening-room): official 2026, 2025 and 2024 award cohorts. Award tiers and source order are not audience-view ranks. Official video IDs are evidence of publisher-linked viewing entries, not verified playback in every region.
- [Reply AI Film Festival](https://www.reply.com/en/artificial-intelligence/reply-ai-film-festival): European festival source, with [September 7 winners](https://www.reply.com/en/newsroom/news/robert-gaudette-wins-the-reply-ai-film-festival-2026). Distinguish numbered jury prizes, other awards and finalists; deduplicate films also recognized by Runway.
- [Higgsfield Original Series](https://higgsfield.ai/blog/blog-original-series): official March 20, 2026 announcement of AI-native series. A published episode and a trailer are separate content types. Where a current series page and the earlier announcement differ, the entry conservatively links to the official page without promising a specific episode. A series announcement does not prove that all episodes are available.

No comparable, independently verified US/European audience leaderboard was established in this round. No views, likes, audience rank, country or language are inferred from awards. AI video model benchmark leaderboards answer a different question and are excluded. A blocked source and inconsistent cached counters do not justify identity switching or invented figures.

The first catalogue contains 40 unique works across five source editions: 30 Runway entries, five additional Reply entries, and five series entries. Two Runway works also carry Reply recognition and must remain visible when filtering that collection. Each record retains its source, edition, observation time, any stated publication date, AI-evidence basis, viewing-entry type, and missing values. Edition year is not necessarily release year. Short summaries and category labels are BPJ editorial work; they are not full-film reviews or official genre claims. Images/video remain at the publisher's services; metadata export grants no rights to third-party media.

All 30 linked Runway poster resources returned HTTP 200 with an image content type in bounded verification (one GET, 29 HEAD requests, no retry). This verifies image endpoints only; it does not grant a media licence or establish film playback. The environment blocked one YouTube thumbnail request with 403; that request was not retried or bypassed. Official festival poster URLs are preferred with an original text-cover fallback.

## Three optimization rounds and two reviews

1. **Goal:** help an English reader choose an AI film or series worth opening, and help a creator find a relevant reference. Keep Chinese discovery and the six-Chinese-platform assessment tool intact.
2. **Evidence and scope:** separate festival cohorts and series announcements; preserve unknown popularity; start with one substantial catalogue rather than thin title pages. No account, payment, new API service, crawler cron or external outreach.
3. **Acceptance:** crawlable English records, useful search and filters, local saved list, honest preview labels, exact canonical, machine-readable sources, isolated fixed analytics actions, mobile interaction tests, current-main release guard and real post-deploy verification.

First independent adversarial review: source researcher challenged the proposed “Western ranking.” Adopted correction: show dated official awards/selections and series entries; do not present a combined audience popularity chart, equate festival location with viewer geography, or mistake a preview for a released series.

Second independent review completed after implementation: a separate reviewer cross-checked the 30 Runway records against official source caches, reviewed all changed files, ran independent mobile interactions with every request intercepted, and inspected desktop/mobile screenshots. The reviewer flagged an unfinished `--live` check that initially tested only local output; it was completed and re-reviewed to fetch ten real resources. No unresolved release blocker remained. An author's own tests are not an independent review.

## Product and commercial boundary

The first release is free discovery with no login gate. Primary actions are choosing a work, opening its source and saving a browser-local shortlist. Existing English BPJ video-tool resources can support creators who want to make something similar; this does not assert that a particular tool made a listed film.

No affiliate agreement or viewing commission is established for these entries. There is no revenue estimate, paid placement or new paid plan. The next decision depends on actual discoverability, useful sessions and voluntary return use. A successful build, crawl or registry listing does not demonstrate demand or third-party adoption.

## Measurement and maintenance

Existing BPJ GA4 page measurement is reused after all generators. Only `/en/ai-video/` can emit `ai_video_view`, `ai_video_search`, `ai_video_filter`, `ai_video_preview`, `ai_video_outbound`, `ai_video_save`, `ai_video_unsave` and `ai_video_related`. Payloads contain only the fixed event name. Search terms, title IDs, watchlist contents and source URLs are not sent with actions. Existing opt-out, DNT/GPC, QA and automated-browser exclusions remain.

`preview` means a user requested the embedded player; it is not a confirmed play or completion. `outbound` means a viewing/source link click; it is not a watch, creator adoption or commission. Saved items remain in the current browser and are not synced to a BPJ account. English actions do not enter Chinese `manju_signals`; no extra daily D1 query is added.

The versioned catalogue is a reviewed snapshot, not a live audience chart. Builds preserve its source dates instead of stamping fresh evidence each day. Further source additions must pass the data contract and be reviewed; no new automatic scrape schedule is claimed.

Publication uses the existing BPJ read-only product-release mode: no daily scrape/export rerun and no production account, payment or registry writes. All existing product gates remain. October 16's previous deployment actually succeeded, but its external startup MCP registry check timed out; this is a release-chain risk, not a reason to waive the gate or assume the next workflow passed.

## Release receipt

Local implementation and review completed on October 17:

- Data-contract tests reject unsupported popularity metrics, unsafe or mismatched media URLs, duplicate works and invalid provenance.
- Six catalogue tests cover search aliases, cross-source recognition, unknown runtimes, explained recommendations and ten final output resources. They verify canonical, schema, exact source snapshot and asset versions, English homepage/search, sitemap, llms and installed BPJ GA4.
- Fully intercepted desktop/mobile browser tests passed: source filters, autocomplete, saved-list persistence/failure, player creation and destruction, fixed actions, QA/DNT/GPC/opt-out, and real isolated collector `dataLayer` receipt of one view and one search. The Google loader is a fixture, not a GA4 backend receipt.
- Root completed the full BPJ build plus existing workbench/member/experience generators, then GA4 coverage write/check and public-engagement installation/check. The final dist gate reports 3,648 pages with zero broken links, invalid JSON-LD, Chinese leakage, stale count claims or other reported violations. Canonical/sitemap, feature-map, Chinese manju and video-fit checks passed.
- Two footer routes found by the dist gate were corrected before publication. YouTube receives only the public site origin as iframe referrer; search text stays out of requests. Three official poster images were used as private local visual fixtures and were not added to the repository or hosted by BPJ.

Implementation merged as [PR #181](https://github.com/f-tiger/agi-site/pull/181), commit `be9a28707d5516890e03c35f326007490d9e4c42`. The first [read-only release run](https://github.com/f-tiger/agi-site/actions/runs/38993307490) failed at 2026-10-17 02:03:27 UTC before deployment: the new final-output assertion expected GA4 before the existing coverage step had installed it. The check is moved after coverage write/check and public-engagement installation; its analytics assertion is unchanged. Later browser/live/deploy/IndexNow steps did not run. An existing final log message does not override skipped or failed steps. A separate reviewer verified the corrected workflow ordering and working directory, then independently reran all six local catalogue tests. The earlier review had missed this CI order issue. At that point the release was not live; the corrected successful receipt is recorded below. Existing Chinese and English acquisition, independent citation and revenue are not inferred from these checks. No external message, social publication, paid service or new account was created.

## Owner clarification: viral videos

During release, the owner clarified that “无脑” means highly popular videos, not a restriction to brainrot or absurdist formats. The next research priority is Chinese-origin or Chinese-language content that actually travels on overseas platforms, including story-driven pet videos, visual fantasy and satisfying videos where AI provenance is supported. Ordinary non-AI viral videos are comparative research, not automatically AI catalogue entries. The current festival catalogue is a source-backed starting collection, not completion of a real-time popularity leaderboard. Cross-platform reported totals, source dates, original creators, reposts and audience geography must remain distinct.

### Verified corrected release

The ordering fix merged in [PR #182](https://github.com/f-tiger/agi-site/pull/182), commit `48c4e20723aa69d0fe775a9649f676355dd060ca`. [Run 38993747897](https://github.com/f-tiger/agi-site/actions/runs/38993747897) completed **success** at 2026-10-17 02:18:03 UTC. Its source was pinned to current main, and the pre-deploy main guard passed.

- Cloudflare deployment actually completed at 02:16:27.5844555 UTC: https://1fec63b5.aiyangmao.pages.dev . Production: https://baipiaoji.com/en/ai-video/ .
- Final GA4 coverage, unchanged full catalogue assertions, new English desktop/mobile browser tests and existing Chinese search/tool browser tests passed. CI live verification at 02:16:50 and a separate root HTTP check both verified ten actual public resources, current asset bodies, canonical, JSON-LD, source dates, GA4 installation and discovery links. They do not prove backend GA4 receipt or playback.
- Existing account/membership GET readiness passed at 02:16:54.974 UTC. Existing `verified-ai-free-tiers` MCP discovery returned `registry_listed:true`, with both static surfaces HTTP 200; this was not a video-specific registry recheck. Startup MCP version checking passed at 02:18:01.179 UTC with an already-registered result; publishing was skipped. The earlier timeout did not recur in this run.
- IndexNow received **230 changed canonical URLs**, in batches of 100/100/30, each HTTP 200 at 02:17:45–47 UTC. These are site URLs, not 230 English video pages. A single production manifest read at 02:19:37.995753 UTC returned 230 URLs and included `/en/ai-video/`. Acceptance is not indexing.
- Read-only mode skipped daily scraping/export, production lifecycle/payment/event tests, registry publishing and maintenance writes by design. Those skipped checks are not described as passed. The first failed run deployed nothing; the corrected run is the actual release.

The follow-up [viral-content research](english-video-viral-research-2026-10-17.md) reflects the owner's clarification and newer September sources. Popular short-video cases whose original creator or present-day metrics remain unknown have not been added as verified current rankings. No acquired users, independent adoption or income is inferred from this launch. Documentation-only receipt changes do not dispatch another release or submit IndexNow again.
