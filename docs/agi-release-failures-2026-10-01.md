# AGI release failure follow-up — 2026-10-01

The owner's 19:38 Asia/Shanghai screenshot shows three distinct failed runs.

| Run | Failure | Production consequence |
|---|---|---|
| 36855413096 (19:27) | Sitemap validation ran before 34 membership/workbench files were generated | Deployment did not run; corrected by #56 |
| 36855682817 (19:32) | Mentor browser test missed the actual member draft handoff through a listener race | Deployment did not run; corrected by #57 |
| 36856222963 (19:37) | Real Relay inference returned HTTP 429 / rate_limited | Deployment, Mentor and 68 GA4 route checks succeeded; later workbench/smoke checks were skipped by the failed AI step |

The previous daily/public API generation check attempted two real model calls on
every deployment, including unrelated analytics, content and Mentor edits. The
existing limits are 12 generation attempts per global 24-hour window and 3 per
IP key; failed model calls consume budget. The response does not identify which
counter refused this request. Do not claim Cloudflare's paid quota was exhausted.

Keep all release/permission/local Relay tests and the read-only live Relay check
on every deployment. Move real inference into a separately named job after the
complete deployment job. It runs on the existing daily schedule or an explicitly
selected `check_relay_ai` manual input. This follows the root repository rule
that external model side effects do not belong on every push. A Relay code change
still receives local backend/browser checks on push; real inference evidence must
come from a daily or explicit manual check, never from the skipped job.

The AI job checks out the effective deployed SHA, including stale-run guard
updates. It retains the unmodified real check: two languages, no retries, no
quota bypass, no larger allowance, and nonzero exit for 429/provider/shape errors.
AI unavailability therefore still marks the AI job and overall scheduled/manual
run failed, while the deployment result remains separately visible. Ordinary
push success does not certify current model availability.

Offline subprocess tests run the actual AI-check command with intercepted fetch
responses: 429, provider failure and malformed output fail after one request;
valid bilingual fixtures exercise exactly two requests. They are not proof of
production AI availability. No additional real inference is attempted for this
workflow repair. The last observed production result remains 429.

Local release validation followed the workflow's build/test order on a clean
worktree: generated sitemap targets, site/hreflang/breadcrumb gates, backend and
D1/privacy tests, 51 workbench flows, Relay/Earn/community/research/Mentor browser
flows and independent membership checks passed. Chromium used an existing local
executable; the SEC refresh and deployment/secret operations were not performed
locally. YAML, every shell block and the push/schedule/manual condition matrix
passed. Analytics coverage and its browser/worker regression checks also passed.

No new schedule, credential, paid service, notification suppression or application
runtime change. The daily AI job has a 5-minute ceiling, approximately 0.5–3
runner minutes normally, replacing the existing inference work plus one checkout.
