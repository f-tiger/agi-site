# AGI organic video round — 2026-09-29

## Three prompt refinements, then adversarial execution

1. Earn attributable visits/actions for agiscorecard.com before selling fleet growth as a proven case study. Repeat the authorized BPJ/ECO organic round on the existing YouTube/TikTok brand; no paid spend.
2. Recent browser events favor `/agi-test` (47 of 90 vote_cast events in the dated 2026-09-27 analysis). Create English narrated landscape/portrait videos: “When will AGI arrive? Make your call, then check the evidence.” One landing page, campaign `agi-timeline-01`.
3. Real page captures, English-only narration/titles/burned-in captions, visible URL, separate sources, preserve attribution through voting, verify decoded media and uploaded hashes, schedule after landing validation, review actual provider IDs and first-party browser events.

Adversarial fixes: quiz labels are editorial opinions, not scientific personality types; historical comparison cards are not live forecasts. The Thesis Tracker is a dated editorial verdict ledger, not an AGI probability. Clarify landing copy without changing options. Voting after the existing October 1 UTC gate discarded UTM/QA parameters; preserve the query/hash and change only pick/self. Keep the gate and September 30 experiment intact. No dependence on prediction markets, fabricated crowd percentages, guaranteed dates, or promised clickable profile links.

## Creative and distribution

Landing: https://agiscorecard.com/agi-test
Campaign `agi-timeline-01`; medium `organic_video`; sources `youtube`, `tiktok`; content `timeline_check_v1`.

Eight scenes: ask for a time frame, actual options, opinion label, dated tracker, score versus probability, what evidence changes your mind, save locally, tool URL. Original vector graphics and site screenshots; synthetic English voice, platform AI flags, TikTok own-brand disclosure; no third-party soundtrack.

Planned slots (Asia/Shanghai): YouTube October 2 16:00; TikTok October 3 18:00. Avoid existing BPJ/ECO slots. Metricool recommends Friday YouTube 16:00; Saturday TikTok 18:00 is a secondary slot. These recommendations are not measured conversions. Actual receipts are authoritative.

## Measurement

GET `/api/video-growth` reads existing `events`, with no migration or identifiers, covering the last 14 complete UTC days, today excluded. One-hour cache. Fixed campaign/medium/sources, `/agi-test` paths, known events and human UA class.

Output `metric=browser_events_not_users`, rows `{source,evidence,event,n}`. Evidence: matching platform `referrer`, missing-referrer `tag_only`, `internal`, `other`. Exact/subdomain host matching rejects lookalikes; no raw hosts returned. Tags/referrers can be spoofed, so this is not causal proof. Privacy settings and blockers cause undercounting.

Primary events: page_view, vote_cast, prediction_lock. Secondary: challenge_share, x_share, crowd_view, subscribe_click, sub_ok. Repeats count; shares are attempts; subscription events are form activity, not revenue. No unique-user/session funnel, cross-page attribution, or unique-user conversion rates.

First-party browser collection skips ci=1, __probe=1, utm_source=verify, GPC/DNT, before writes. GA4 remains. This does not change all edge request logging.

Pre-round `/api/pulse`, 2026-09-29 13:41:53 UTC: 33,992 edge “human” requests over 28 days, including 28,848 direct and 7 social. This broad classification contains noise and is not verified readership or a video baseline. Use this campaign's own event counts.

## Bounded reviews and decisions

October 4 afternoon Asia/Shanghai: require actual provider video IDs/URLs and statuses. Disappearance from pending does not prove publication. Check media and landing; do not silently duplicate failures.

October 18 afternoon: snapshot the rolling endpoint, covering October 4–17, fourteen complete UTC days after the later post. Report publication-day exposure separately if available; this is not lifetime campaign coverage.

Directional continuation gate, per source: at least 30 matching-referrer page_view events, 5 matching-referrer vote_cast events, and 2 combined matching-referrer prediction_lock/challenge_share/x_share events. This is an internal decision heuristic, not statistical significance or unique-person proof. Report tag_only separately. Below 30 means insufficient attributable exposure, not proven product rejection. Adequate exposure with weak actions calls for hook/landing diagnosis. No payment evidence means no revenue claim. Existing site subscription gates stay intact.

Reviews are read-only reports to the owner: no automatic additional posts, messages, ads or subscriptions.

## Verification gates

Existing analytics sanitizers/D1 budget checks plus new actual-SQLite campaign/referrer/collector/error tests. Browser QA exercises the post-October-1 gate locally, preserves UTM/QA, intercepts vote/lock without live writes, checks mobile overflow and GPC. Feed/agent-surface generation and site/hreflang validation; inspect generator drift. Media QA: English strings, offline ASR, eight decoded scenes versus source frames, full decode, identical audible AAC track, local-to-Metricool CDN SHA-256 equality.

Deployment, scheduling, publication, traffic and revenue are distinct states.
