# Framepick recent source articles — 2026-10-17

This release candidate adds nine credited works from recent Curious Refuge articles, taking the English catalogue from **217 to 226 unique works** while retaining **12 source collections**. Eight entries are short films; one is a pilot episode. This is an extension of source-backed discovery, not a current US/EU audience ranking. The previous 217 work objects and all 12 source objects are unchanged.

## Source records

| Work and source article | Credited creator | Article publication (UTC, 2026) | Viewing label |
| --- | --- | --- | --- |
| [REFRAME](https://curiousrefuge.com/ai-film-gallery/reframe-ai-short-film) | Hiroki Shioya | October 8, 19:00:06 | Film |
| [And Where Are We Going?](https://curiousrefuge.com/ai-film-gallery/and-where-are-we-going-ai-short-film) | ODNGR | October 7, 19:00:57 | Film |
| [For Lucy](https://curiousrefuge.com/ai-film-gallery/for-lucy-ai-short-film) | Murad | October 7, 19:00:11 | Film |
| [Sea of Ash](https://curiousrefuge.com/ai-film-gallery/sea-of-ash-ai-short-film) | Patryk Tucharski | October 6, 19:00:33 | Film |
| [The Museum of Extinct Emotions](https://curiousrefuge.com/ai-film-gallery/the-museum-of-extinct-emotions-ai-sci-fi-short-film) | Simrat Sandhu | October 6, 19:00:08 | Film |
| [Five Minutes of Spring](https://curiousrefuge.com/ai-film-gallery/five-minutes-of-spring-ai-short-film) | Particle Panic | October 5, 19:00:14 | Film |
| [Johnny’s Bar](https://curiousrefuge.com/ai-film-gallery/johnnys-bar-ai-anime-short-film) | NakedRabbitProduction (NRP Films) | October 5, 19:00:07 | Episode; source identifies a pilot |
| [Clean Sweep](https://curiousrefuge.com/ai-film-gallery/clean-sweep-ai-short-film) | Gossip Goblin | October 2, 19:00:41 | Film |
| [NATIVE](https://curiousrefuge.com/ai-film-gallery/native-ai-short-film) | Hanju Noh / OOJOO AI | October 2, 19:00:20 | Film |

The articles provide the creator credits, individual story context, AI classification and actual embedded YouTube identities. The additions therefore have short editorial synopses grounded in the article text. Theme labels are editorial descriptions, not an analysis of the video itself. The film creator is not inferred from the article author's byline.

Article publication spans **2026-10-02T19:00:20Z through 2026-10-08T19:00:06Z**, converted from each source's explicit `-0500` offset. These dates are not original video upload dates. The admitted pages were checked between **2026-10-17T12:17:24.262235Z and 2026-10-17T12:20:04.356711Z**, each returning HTTP 200. The assembled metadata snapshot is **2026-10-17T12:22:36.245276Z**. Publication, source check, snapshot generation and release monitoring remain separate times.

All nine new runtimes remain unknown. The title *Five Minutes of Spring* does not establish a five-minute runtime. *Johnny’s Bar* is an episode with an explicit pilot note, not a complete season; a straight-apostrophe alias allows normal keyboard searches without changing its credited title. Language, subtitles, original uploader identity, regional access and actual playback have not been independently verified. Views, likes, audience geography and popularity scores are not introduced.

## Exclusions and preserved research

*Monkey Business* was excluded because the article did not establish the film creator; its article author is not substituted for that missing credit. Two separately investigated Runway items remain research: one has an explicitly older release year, and another is an earlier concept teaser. A newly discovered page is not a newly released film.

Ten further creator/platform candidates remain research-only. A platform's `Created time` is not established as its public release date, and list/detail counters had inconsistent meanings or values. Those counters were retained only in private research diagnostics, not added as playback or ranking fields. This batch does not expand the source schema, media-host allowlist, player capability or collection taxonomy to accommodate those unresolved claims. Existing access refusals were not bypassed. There is no new crawler schedule, paid service or account.

## Task refinement and review

Three refinement rounds narrowed the work: (1) restore current main, actual release status and the previous catalogue rather than assuming a temporary workspace; (2) prioritize recent source articles with credited works and individual story context, separating content eligibility from unverified popularity; (3) ship one small data batch through the existing discovery and release gates, preserving all original evidence. Current main at task start was `4a4985c70872027d79dbd75cbee392b34779ea31`. Required repository instructions and daily/measurement/content documents were read through connected GitHub and confirmed unchanged since the previous round.

The first independent adversarial review set date, identity, genre, media and counter boundaries. The second independently reparsed all nine source HTML responses, checked their hashes, actual embedded IDs, film credits, plot evidence and explicit timestamps, then compared the final catalogue against the main baseline. It verified no duplicate ID, normalized title, YouTube identity or Vimeo identity, and confirmed both apostrophe forms find the same pilot. No blocking issue was found. This independent review is separate from the data author's import self-check and the coordinator's build/release checks.

Local acceptance passed: eight data-contract tests, five generated-page/search tests and six final-dist checks; the full build and existing post-build analytics/engagement steps completed. Dist validation reported zero broken links, malformed JSON-LD, language leaks, placeholder/raw-Markdown content, contradictory or stale counts, hollow pages or hreflang errors. Canonical checks passed for 3,643 pages; lastmod checks and existing IndexNow selection/migration tests passed. GA4 installation coverage passed for 3,634 public routes with 14 excluded routes; this does not establish backend event receipt. The final catalogue HTML is 1,058,012 bytes, about 39,830 bytes larger than the prior build; no speed or Core Web Vitals improvement is claimed.

An independent browser reviewer completed the entire existing suite and focused checks at **2026-10-17T12:27:08.562Z**. All nine titles are searchable; the pilot alias/filter and episode disclosure work; the Sea of Ash and NATIVE anchors expand to their cards. All 226 entries are present in server-rendered HTML, JavaScript initially shows 24, three images are eager-loaded and no player preloads. At 360/390 pixels the search remains above the fold with no horizontal overflow. Network requests were intercepted: this proves local behavior, not actual video playback, poster delivery or GA4 backend collection. The existing broad substring search also finds Little Mes for `NATIVE` through its summary word `alternatives`; this is recorded rather than misreported as an exact-only match. No production UI change was made.

These are completed local checks. Remote CI, deployment, live resource validation and IndexNow receipts remain pending. No new test that merely repeats a data entry was added.

## Existing operations and distribution

Read-only preflight found no active or queued release and no overlapping Framepick PR. The existing BPJ workflow and double current-main guard are unchanged. The last successful BPJ release at task start was run `39012777195`; that does not repair the separate scheduled collection failure. The Chinese synchronization artifact still records a failed October 17 attempt around 04:59 UTC and a last successful October 16 snapshot around 04:57 UTC. The existing reach artifact was generated at **2026-10-17T04:56:38Z**, reports its September 19–October 17 window as 28 days in UTC, and has an incomplete current day. It was read as an existing artifact; no public reach, Windsor or new business-report query was made.

No external post, message, campaign draft, interview, signup or paid action was created. Existing marketing material and publishing-context blockers remain; source research is not independent distribution or adoption. Useful reference-finding tasks, voluntary return use, independent citations and verified revenue remain unverified. The Chinese experiment, queue and **October 20** review are preserved. Next priority remains a real distribution context and specific useful tasks, while unresolved recent/viral candidates retain their individual evidence gaps rather than being relabelled as a current leaderboard.
