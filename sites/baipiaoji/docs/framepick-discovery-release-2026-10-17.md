# Framepick visual discovery and source expansion — release receipt

2026-10-17 (UTC). This owner-requested English-site improvement is separate from the Chinese creator experiment and its unchanged October 20 review.

## Product and source evidence

- English route: <https://baipiaoji.com/en/ai-video/>.
- Implementation: [PR #185](https://github.com/f-tiger/agi-site/pull/185), source commit `4c082e71f074132d6db0649c4ffb971a5519ab5c`, squash merge `ac29ab005b9b42c47580366aca556ea0dbd6eebd`.
- Catalogue: 40 → 124 unique works, eight source collections. The 84 additions are 71 historical Runway Watch entries and 13 Curious Refuge discoveries, not 84 newly released films or 124 verified popular US/EU videos.
- Snapshot generation: `2026-10-17T06:20:51.508788Z`. Primary directory checks: Runway `06:15:58.230884Z`; Curious Refuge `06:15:58.430124Z`; selected article checks `06:16:44–46Z`; the historical Runway detail verification completed at `06:18:51.666447Z`. All observation times are UTC. Curious article dates October 8–16 are source publication dates, with supplied -0500 timestamps converted to UTC. Unknown video upload dates and audience counts remain unknown.
- Sources and exclusions: [expansion receipt](framepick-catalogue-expansion-2026-10-17.md). Seventy-one added historical works have a labelled source note, not an invented synopsis. English interface language is not proof of English dialogue, subtitles or regional viewing access.

## Experience and discovery

The redesign follows inspected Runway Watch and Short of the Week patterns: a visible film image, compact viewing information, separate theme/format/source filters and a quiet catalogue. Search is visible in the first 360/390px phone screen. Initial presentation is 24 cards with progressive loading, while all 124 entries remain in server-rendered HTML and are searched together. Saved lists and direct anchors reveal the correct work even after an empty search.

The page retains one canonical URL, truthful CollectionPage/CreativeWork data, an original 1200 × 630 sharing PNG, three linked viewing guides and matching JSON/Markdown exports. The existing English homepage/search/sitemap/llms paths remain connected. Fixed GA4 actions preserve QA/DNT/GPC/opt-out handling and exclude search text and saved lists. A player request or viewing-link click is not a completed play.

## Reviews and local validation

Three optimization rounds are recorded in the [PRD](PRD-framepick-discovery-2026-10-17.md). Two independent review rounds covered sources, source-date semantics, competitive layout, SEO/GEO, privacy and desktop/mobile interaction. Independent reviewers found same-anchor recovery after an empty search and a narrow-card fallback-title overlap; both were fixed and independently rechecked. The implementation author's tests and the coordinating agent's build/release self-checks are separate from those reviews.

Local evidence: full site build and final GA4 installation/verification; 39 core commands, 36 dist commands, 16 additional account/workbench/analytics checks; final English tests 6/6 and full browser acceptance; 32 of 33 other shared browser tests. The remaining quote export fixture was blocked by the managed browser's file:// policy. It was not counted as passed, bypassed, or changed. Its existing mandatory GitHub test must pass before the Cloudflare deployment step.

Independent visual checks covered 1440/390/360px and the final long-title fix at 360/700px. Official Runway images returned 200. YouTube image access was limited by the research environment, so fallback rendering was verified without claiming all third-party images or regional playback were tested. No Core Web Vitals field result or speed improvement is claimed.

## Actual release evidence

Release workflow: <https://github.com/f-tiger/agi-site/actions/runs/39010558019>. The existing readonly product-release mode retains all gates while skipping routine collection, report exports and production lifecycle writes. No additional workflow dispatch or new scraper schedule was created.

The run completed **success**; GitHub's final run update was `2026-10-17T06:45:49Z`. Both current-main guards verified `ac29ab005b9b42c47580366aca556ea0dbd6eebd`. The deployment was <https://b257b579.aiyangmao.pages.dev>.

| Receipt | Source log time (UTC, 2026-10-17) | Actual result |
| --- | --- | --- |
| Quote offline export fixture | 06:40:34.847 | Passed unchanged in CI, resolving the local environment limitation before deployment |
| Quote hosted flow | 06:40:40.231 | Passed |
| Framepick browser | 06:44:06.599 | Passed desktop/mobile, full-catalogue search, saved lists and privacy tests |
| Final main guard | 06:44:23.895 | Current main matched the built commit |
| Cloudflare deployment | 06:44:43.232 | Deployment completed |
| GA4 live verification | 06:44:46.498 | Build coverage 3,634 public pages; 75 public paths sampled; not backend event receipt |
| Framepick live verification | 06:45:10.004 | All 11 resources passed, including canonical page, data exports, current assets, sharing PNG and discovery surfaces; snapshot matched `06:20:51.508788Z` |
| BPJ account/member read-only readiness | 06:45:13.691 | Passed without lifecycle writes |
| IndexNow | 06:45:21.719 | One batch, two canonical URLs, HTTP 200 |
| Final read-only chain gate | 06:45:45.686 | Passed; deliberately skipped maintenance steps were not counted as successful executions |

At `2026-10-17T06:46:28.466598Z`, a single additional read of the public [changed-canonical manifest](https://baipiaoji.com/changed-canonical-urls.json) returned HTTP 200 and exactly `https://baipiaoji.com/en/` and `https://baipiaoji.com/en/ai-video/`. This monitoring time is distinct from source snapshot generation and deployment time. No extra IndexNow submission was made. HTTP acceptance is not indexing, ranking, AI citation, visits or completed viewing. The source/gates were examined by an independent release observer; the coordinator separately confirmed the final run result and published manifest, reusing CI's 11-resource live test without duplicate requests.

The previous scheduled run [39004278663](https://github.com/f-tiger/agi-site/actions/runs/39004278663) did deploy but ended in failure because of Chinese catalogue duplicate identity and a separate MCP discovery probe timeout. This English release does not repair or erase that maintenance failure. Next original scheduled receipt remains the appropriate follow-up.

The repository's existing ECO/AGI/TDS path filters also match `sites/baipiaoji/lib/**`, so this BPJ-only source change automatically triggered three dependent workflows. They were not manually dispatched or cancelled. All deployed source `ac29ab005b9b42c47580366aca556ea0dbd6eebd`, then finished **failure** at existing read-only membership readiness checks: [ECO 39010558002](https://github.com/f-tiger/agi-site/actions/runs/39010558002), [AGI 39010557970](https://github.com/f-tiger/agi-site/actions/runs/39010557970), [TDS 39010557968](https://github.com/f-tiger/agi-site/actions/runs/39010557968). ECO/TDS failed their `ready` assertions; AGI reported “Membership status mismatch: ready.” Deployment is not full acceptance for those runs. No non-BPJ source file or account configuration was changed, and the underlying readiness cause was not investigated or claimed fixed in this Framepick task.

## Distribution and commercial evidence

The [English marketing package](english-video-marketing-2026-10-17.md) contains current policy evidence, prioritized candidate communities, two review copies, explicit affiliation and a D0/D1/D3/D7 observation plan beginning only on actual publication. No Reddit post, comment, DM, moderator outreach, new account, paid campaign or affiliate application occurred. Community-specific rules were not reliably accessible; neither candidate community is marked cleared. Material readiness is not distribution.

Free value is original-source discovery and a local reference shortlist. Creators with a production task can continue to the existing video-tool directory; no claim is made that a listed tool created a featured film. Framepick has no newly established paid offer or viewing-commission agreement. Verified revenue remains unknown.

No additional analytics/reporting query through GA4/GSC/D1/Windsor or public reach was made in this iteration. Existing release readiness and QA checks remain distinct from business reporting. Actual English useful tasks, voluntary repeat use and independent body citations remain unverified. Frontend/CI checks, IndexNow reception and metadata access cannot establish those outcomes. The English operational hypothesis is five real reference tasks, three specific useful-feedback reports and two voluntary return uses; it is separate from the Chinese experiment and is not statistical proof.

Next action: verify a genuinely usable existing publishing context and current community rules before any authorized publication; do not create more similar drafts while distribution is blocked. Revisit English distribution/source-readiness on October 20, without moving or replacing the Chinese weekly review. Popular Chinese-origin videos on overseas platforms still need original-author viewing entries and comparable dated evidence before inclusion as a popularity claim.
