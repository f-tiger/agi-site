# BPJ / ECO result sharing — 2026-10-01

## Decision and prompt refinement

1. Objective: convert existing useful browser tools into discoverable, shareable demonstrations; do not assume a GitHub project causes growth.
2. Scope: BPJ work-plan (ZH/EN), ECO tariff workbench (five languages), one result-card interaction each. Reuse current code and Metricool; no new hosted services or paid infrastructure.
3. Acceptance: local PNG export, readable mobile layout, invalidation after input edits, working recipient path, privacy-safe events, real-motion English demo variants. Growth is an experiment, not a promised outcome.

Adversarial pass 1 (self-review): existing ECO country calculators already export cards, so extend only the workbench's actual gap. A card can reveal work/bill details: BPJ exports aggregate verdicts only; ECO explicitly previews annual totals and input type, excluding consumption/rates/files. Links explicitly carry settings; no raw settings are added to analytics.

Adversarial pass 2 (self-review): a sender's `own` flag previously survived the tariff link. Receiving it now resets to illustrative input, requires confirmation and explains whose inputs these are. BPJ explains that linked volumes need editing and results use current allowance data. Removed stale BPJ results after the last task is deleted. Neither a download nor a tagged visit proves a referral, person, bill, saving or sale.

## Measurement and commercial path

- ECO `/api/distribution-growth`: existing 14 completed UTC days, `tariff_card_preview` / `tariff_card_download` added; existing `tariff_share_visit` / `tariff_share_calc` preserved. Own/example, placement and coarse referrer evidence remain separate. No new DB table, cron or raw-value collection.
- BPJ existing calc events: `/plan-card/preview`, `/plan-card/download`, `/plan-share/<role>`, `/plan-link/<role>/<count>`. Explicit first calculation after a tagged received link emits `/plan-share-calc/edited` or `/unchanged`; “edited” means changed settings, not verified personal use. Reloads can repeat events; they are not unique people.
- BPJ free calculation/export → existing cloud workspace membership, 9 USDT / 30 days; no new paywall or checkout activation.
- ECO own-input comparison → existing relevant next steps. Outbound/affiliate clicks are not commissions. No guaranteed savings or market tariff claims.
- Initial operating target: per site 50 attributable external sessions and 10 actual task completions. Current event counters alone cannot verify unique sessions; reconcile with available platform/site evidence before claiming this target. No new conversion rate or revenue reported here.
- Preserve `eco-fixed-02`'s existing review gates. Two opening variants are creative alternatives, not a randomized A/B test. Release one selected version per site first; reserve the alternative until there is enough comparable evidence, not four near-duplicate posts in one burst.

## Verification

BPJ: 2,351-page HTML gates, canonical targets, work-plan arithmetic/roundtrip/dist, studio and agent-watch gates passed locally. ECO: tariff model and distribution collector/SQL tests passed (10 tests). Browser: 34 assertions, all five ECO languages and both BPJ languages, PNG downloads, mobile width, stale-result invalidation and recipient reset. Browser QA uses local fixtures and emits no production events.

Deployment status and video publication receipts must be recorded after confirmation. These checks are not traffic results.


## Confirmed release and publication queue

- Code: `373b3f7`, followed by BPJ layout/browser-fixture correction `1a02a76`. ECO workflow `36819208931` and BPJ final workflow `36819769696` completed successfully. Deployment post-checks passed. Local browser checks verified ECO card export + recipient reset and BPJ card preview inside main content. A separate local-runner urllib live page read returned HTTP 403; no additional independent live-browser assertion is claimed.
- Four 34-second, 1080×1920, 30fps H.264/AAC videos completed. Each had 1,020 displayed frames in uninterrupted browser playback; only initial loading waits, no playback errors. Full FFmpeg decode passed. Selected A audio: ECO -16.4 LUFS / -1.5 dBTP; BPJ -16.1 LUFS / -1.5 dBTP. AI narration, original synthesized score, complete English narration subtitles; real local tool recording with illustrative inputs. No human listening assessment and no claim of industry-leading performance.
- Media is saved separately, not checked into this repository. Both A and B opening variants are deliverable; only A is scheduled.
- Metricool recommended-hour scores informed the schedule; they are not guaranteed performance or audience-size estimates. ECO: October 1, YouTube 16:00 and TikTok 18:00. BPJ: October 2, YouTube 16:00 and TikTok 12:00. All Asia/Shanghai. All four were acknowledged as `PENDING`, not published; receipts in the companion JSON.
- Acquisition limitation: ECO YouTube copy reuses `eco-fixed-02`; existing aggregate reporting does not split `utm_content`, so this post cannot be isolated from prior posts using that campaign. BPJ campaign URL tags do not add a campaign-specific backend report. Typed hub URLs and missing referrers remain unassigned; do not manufacture source-level conversion rates.
- Growth, retention and revenue remain unmeasured for these queued posts. Observe the existing fleet reporting cadence; no new cron, ad spend or outreach.
