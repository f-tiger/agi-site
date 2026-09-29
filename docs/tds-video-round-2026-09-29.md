# TDS organic video experiment — 2026-09-29

Owner selected TDS as the next fleet round, following existing authorization to execute the organic YouTube/TikTok workflow. No paid media, new subscriptions, outreach or unrelated channels.

## Three prompt refinements and adversarial review

1. Scope: earn attributable useful visits on the existing fleet before claiming a marketing tool success case. Use one existing TDS tool and one action.
2. Creative: image too large → choose a still JPEG/PNG/WebP → set dimensions/format → compare size and appearance → download. English narration, titles and burned-in captions in both 16:9 and 9:16.
3. Evidence: demonstrate actual browser output, tag each channel, exclude QA and built-in sample actions from user-file completions, and review completed UTC days. Scheduling is not publication or traffic.

Adversarial checks: encoding may increase size or change appearance; no lossless/guaranteed-reduction claim. No HEIC/GIF/animation claim. JPEG flattens transparency; PNG ignores quality. The built-in generated graphic is unusually compressible and must be labeled as an illustrative demo, not representative savings. No claim that events are people, downloads are saved files, or traffic is revenue. TikTok profile-link eligibility is unknown; no “link in bio” claim.

## Offer and destinations

- Tool: https://thedollscout.com/image-compressor (English default).
- Campaign: `tds-image-01`; medium: `organic_video`; content: `image_check_v1`.
- YouTube: `https://thedollscout.com/image-compressor?utm_source=youtube&utm_medium=organic_video&utm_campaign=tds-image-01&utm_content=image_check_v1`.
- TikTok: `https://thedollscout.com/image-compressor?utm_source=tiktok&utm_medium=organic_video&utm_campaign=tds-image-01&utm_content=image_check_v1`.
- Proposed slots, Asia/Shanghai: YouTube 2026-10-04 16:00; TikTok 2026-10-05 18:00. Final scheduling receipts are the authority. Metricool recommendations are planning signals, not demonstrated conversion evidence.
- Brand: `7132930` / agifuturelife. Preserve the six existing BPJ/ECO/AGI scheduled posts.

## Demonstration and baseline

Local browser QA on 2026-09-29 exercised real source files with all external requests blocked. The built-in graphic converted from 1500×1000 / 1,091,906 bytes to 1000×667 / 5,930 bytes. This is a demo graphic, not a typical photo or savings claim. Download bytes and dimensions were verified. Own-file completion/export were tested separately with intercepted telemetry only. Sample, CI/probe, GPC and 390px layout checks passed with no external requests or page errors.

Live `/api/document-stats` baseline at 2026-09-29T14:31:40.307Z: since 2026-09-25, 32 `doc_view` events and 5 resource views; no tool completion events listed. These are anonymous events, not users, and are not an estimate of market demand.

## Measurement contract

- Allowlisted campaign metadata (`c`, `s`) rides the existing same-origin `/api/doc-events` request only for `/image-compressor` and seven known events.
- A valid campaign request atomically records the original event and a `vid_tdsimage01_{source}_{action}` mirror. The original document report and legacy empty-event human PV retain their previous meaning.
- `/api/video-growth` returns 14 completed UTC days, grouped by source, event and evidence; successful aggregates cache for five minutes. No database/query failure is represented as zero traffic.
- Evidence buckets: matching platform referrer, `tag_only` (missing referrer), internal and other. Tags/referrers can be spoofed. No person or cross-page identity tracking.
- Events: view, complete (own file), export (download action), sample, error, share, summary_share. Deduplicated per event per page load. Built-in samples do not count as own-file completions/exports.
- No filenames, file contents, full URLs/queries or identifiers are stored. DNT/GPC, bots, CI/probes and `utm_source=verify` are suppressed. Privacy pages explain the bounded campaign metadata in EN/DE/ZH.
- Sharing still strips campaign parameters to the existing canonical `?via=share` contract. Typed URLs, stripped tags, blocked telemetry and onward navigation will be unassigned; no cross-page or revenue attribution is promised.

## Review and decision rule fixed before publication

Use two bounded read-only follow-ups: publication verification on October 6 afternoon, then usefulness review on October 20 afternoon, Asia/Shanghai. Verify actual platform video IDs/URLs and errors; absence from the pending queue alone does not prove publication. Do not automatically repost, buy media or restart unrelated automations.

The usefulness review covers October 6–19 complete UTC days and separately labels launch-day partial data if available. Report platform views separately from site events. Per channel, an internal continuation signal is at least 30 matching-referrer view events, 5 own-file completion events and 3 download actions, excluding samples/internal/QA. This is a conservative operational gate, not a significance test, unique-user conversion rate, revenue proof or replacement for existing TDS business gates. Show `tag_only` counts alongside it; referrer loss may undercount real traffic.

Below 30 qualifying views: distribution evidence is insufficient. Enough views but weak completions: investigate landing friction and audience fit. Passing the operational gate permits proposing a follow-up demonstration; it does not itself authorize more spending or prove the eventual MCP/skill sells.
