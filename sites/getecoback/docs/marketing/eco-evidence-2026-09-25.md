# ECO evidence growth — 2026-09-25

## Refined task (three passes)
1. Read the current ECO source, business evidence and channel connections before publishing.
2. Challenge the assumption that a new page or new regulation tool means revenue: there are no verified evidence-service sales, no active €299 checkout, and an existing expansion gate.
3. Publish a useful update to the existing English and Chinese CBAM canonical pages, add a free editable request template, preserve native style and truthful pricing, validate the free workflow and queue external drafts unless account and destination authority are verified.

## Decision and official evidence
The selected intent is an importer trying to act on a supplier's claim that CBAM data was shared. This is an operational-intent hypothesis, not a proven high-volume keyword or a verified customer request. The September verification workflow makes the distinction timely. Only Commission material is used for regulatory facts:
- [CBAM Registry](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-registry_en), checked 25 September 2026: operator/declarant handoff and verifier roles.
- [CBAM verification](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-verification_en), checked 25 September 2026: independent accredited verification for actual emissions and a timeline showing first reports in January 2027. Its accreditation state-of-play document is dated 25 September 2026.

Counterevidence: official guidance is free and may fully solve this task. No evidence establishes willingness to pay €299. A missing report in September must not be called an automatic compliance failure. The source's future timeline is not proof that a particular verifier is already accredited or a report exists. No deadlines, penalty estimates, customer outcomes or search volumes are invented.

Keep the existing URLs and the existing `eco-eu-evidence-1023` decision gate. No DPP or additional regulation tool is added. Updated content is an English/Chinese pair, not two new duplicate URLs.

## Business-data check
- Current `/api/pulse` response: HTTP 500, `query_failed`.
- The preceding deployed build [36150733683](https://github.com/f-tiger/agi-site/actions/runs/36150733683) reports HTTP 503 `orders_read; database_limit` during membership verification and failures in the event pipeline.
- This identifies an operational data-access problem, not zero transactions. Exact D1 quota category and reset time were not established. No paid-plan change, destructive database action or gate bypass is authorised here.
- Evidence answers are processed locally and not collected. The €299 pilot has no active checkout, official quote ledger, upload or delivery workflow available in this repository.
- The unrelated storage membership must not be represented as payment for this evidence service.
- A scoped connected-mail search found no matching messages in the recorded window. That does not prove no leads exist in other systems. No personal data or invented leads are committed.
- The stored fleet-money snapshot is dated 21 September and has no usable ECO money value; it is not used as today's revenue.

## Publishing
English: https://getecoback.com/en/agents/cbam-supplier-data.html
Chinese: https://getecoback.com/zh/agents/cbam-supplier-data.html
Free assets: `/downloads/cbam-supplier-request-en.txt` and `/downloads/cbam-supplier-request-zh.txt`.
The guide, visible FAQ and FAQ schema share content; the Markdown mirrors and site search/AI index are regenerated. Homepage, tools and existing compliance entries remain the discovery path. The scope-enquiry CTA points at the existing German contact page and is explicitly not an order. No upload is requested.

## Channel audit
GitHub publishing to the existing ECO site is connected and already authorised. Discovery found WordPress.com, WPWriter, Metricool and Windsor.ai as available but not installed; prior Windsor/WordPress suggestions already exist. No marketing account/destination was verified for WordPress, Google Business Profile, Facebook/Meta, Instagram, Threads, TikTok, LinkedIn, Telegram, Reddit or X. Optional Telegram secrets used by unrelated finance workflows are not permission to send marketing.

All ten external-channel drafts and individual blockers are stored in [the marketing queue](./eco-evidence-2026-09-25.json). External sends: 0. Reddit needs community-rule review; Telegram requires an owner-controlled channel or administrator-authorised group. Instagram/TikTok also lack final media assets. Availability of a plugin is not connection or publishing permission.

## Verification and result
Before publishing: checklist/local-export tests in both languages; template links and content; telemetry contains no answers; FAQ/schema parity; metadata; internal links; search/sitemap/AI discovery. Preserve the existing operational gates: static publication may succeed while database-dependent health checks remain red. Record the actual deployment and live-content outcome in the queue receipt after observing it.

## Observed publication receipt
- Content commit: `4b1af4896ae586fb1ee503cde5646366c058d1c8` on `main`.
- [Deployment run](https://github.com/f-tiger/agi-site/actions/runs/36192307097): Cloudflare deployment succeeded at 21:35:40 UTC on 25 September 2026; version `91195955-b21e-4ab5-87f0-2e900f6f3042`.
- Nine live checks passed with HTTP 200: both updated pages, both text templates, shared script, site-search index, AI full-text index, tools hub and contact page. Five checklist/discovery tests also passed locally, including export behaviour and no answers in telemetry. FAQ, breadcrumb, metadata, event-name, sitemap-date and tools-hub checks passed locally.
- `llms-full.txt` was regenerated by the deployment workflow and checked live; the generated full-text file was not included in the source commit.
- IndexNow returned HTTP 200. This is acknowledgement of submission, not confirmation of indexing, rankings or traffic.
- Overall workflow remains **failed** because the pre-existing membership database limit, pulse HTTP 500 and event-write failures persist. This was not relabelled as a successful revenue loop. No operational gate was weakened.
- External sends: **0**. Ten channel drafts remain queued with missing account/destination authority or media requirements. No actual evidence-service payment, upload or qualified lead was verified; data access remains incomplete.
