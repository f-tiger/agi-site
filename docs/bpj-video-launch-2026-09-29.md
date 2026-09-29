# BPJ organic video launch: readiness and attribution

Prepared 2026-09-29. Target: English-speaking developers encountering Gemini API quota errors. The two 67-second assets use English narration and burned English captions. No paid distribution is requested.

## Three prompt refinements and adversarial checks

1. Outcome: bring qualified readers to the existing Google AI Studio guide. Challenge: views alone do not validate the marketing tool. Measure source-associated arrivals, active reading and official-link actions.
2. Execution: update the guide from current Google documentation, register both video sources, preserve the confirmed audio, and prepare platform-specific posts. Challenge: a correct video can still lead to stale landing-page claims. Replace the old fixed Flash daily figure and the blanket midnight-reset explanation in both languages and the derived API summary.
3. Acceptance: local release gates, live content/allowlist checks, working outbound entry points, then provider publication readback. Challenge: connection, scheduling and publication are distinct. Keep delivery null until a public post URL and provider readback exist; do not invent account eligibility, traffic or revenue.

## Fact review

Directly reviewed on 2026-09-29:

- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/troubleshooting

The previous 250-to-20 daily Flash figure is withdrawn as a current allowance claim. Active project/model limits are authoritative for the user. Distinguish minute limits from daily quota resets; do not treat every 429 as an all-day outage. This is an editorial correction, not evidence of a new vendor quota change today.

## Distribution plan

| Channel | Candidate time (Asia/Shanghai) | Format | Role | Outbound entry gate |
| --- | --- | --- | --- | --- |
| YouTube | 2026-09-30 16:00 | 1920 × 1080 ordinary video | Primary acquisition source | Advanced features / clickable description link |
| TikTok | 2026-10-01 10:00 | 1080 × 1920 video | Separately reported discovery | Actual website field on profile |

Times are candidate slots from Metricool recommendations, not evidence of the account's conversions. Recheck that they are still in the future before scheduling.

YouTube title: **Gemini API Quota Exceeded? 3 Checks Before You Upgrade**

YouTube lead: Getting a Gemini API quota error? Check your exact model and feature, your active project limits, and your billing tier before you upgrade.

YouTube link: https://baipiaoji.com/en/tools/google-ai-studio?utm_source=youtube&utm_medium=organic_video&utm_campaign=bpj-quota-clarity-01&utm_content=gemini_checks_v1

TikTok caption: Gemini API quota exceeded? Check the model, project limits and billing tier before upgrading. Extra keys do not raise the same project's quota. Find the Google AI Studio guide at baipiaoji.com. #GeminiAPI #AIStudio #DeveloperTools

TikTok profile link candidate: https://baipiaoji.com/en/tools/google-ai-studio?utm_source=tiktok&utm_medium=organic_video&utm_campaign=bpj-quota-clarity-01&utm_content=gemini_checks_v1

Use a profile-link CTA only after that link is actually configured and usable. Educational developer video: not made for kids. Preserve English-only captions and audio. The rendered source-date scene must be recaptured after the landing-page update.

## Measurement and release state

Both sources are registered under `bpj-quota-clarity-01`; they remain separate rows in `/api/growth`. The decision engine's single selected source remains unchanged until its outbound entry and scope are verified. Select YouTube for the primary gate when ready. Do not add TikTok counts to pass the YouTube threshold.

Review after 14 complete UTC days following actual publication. Initial internal gates: 50 qualified sessions and 5 sessions with an official-link action for the selected source. These are operating rules, not verified people, causal lift, revenue or a traffic guarantee. Tag-only arrivals remain separately visible; manual domain visits without tags cannot be assigned to the video reliably.

Metricool connection is present for both channels. At preparation time, media transfer and channel external-link capabilities remain to be verified. No post is scheduled or published by this change. Preserve `delivery: null`, unknown operator cost, and unknown acquisition cost until evidence is recorded.

Platform references:

- https://support.google.com/youtube/answer/13748639?hl=en
- https://support.tiktok.com/en/getting-started/setting-up-your-profile/linking-another-social-media-account
- https://help.metricool.com/schedule-and-post-on-tiktok-bkepi
- https://help.metricool.com/schedule-and-edit-posts-through-an-llm-with-metricools-mcp-p8y4b

## Validation

Local quota-facts, fact-regression, campaign SQLite/browser-parser/report integration and 19 Python growth/queue checks passed. The workflow Node gates, static build, canonical/link checks and workbench/member isolation checks passed. Actual workerd password and Google-account runtime checks passed. All nine workflow browser commands passed with isolated network fixtures; local browser startup needed a compatible executable, with no repository code change.
