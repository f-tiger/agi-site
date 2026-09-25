# Delivery record experiment — 2026-09-25

Edition 2026-09-25.7 adds /delivery-evidence and explicit /de/ and /zh/ variants to the existing document product. It does not replace the homepage again or turn the old collector membership into a document plan.

Working scope: local file inventory, SHA-256, user source notes, JSON and readable HTML export, comparison with a pasted manifest, same-brand homepage and tool links, public-link sharing, open v1 format. Maximum 10 files, 20 MiB each, 100 MiB combined. Device time and all notes are unverified. No delivery acknowledgement, cloud storage, recipient identity, e-signature, Bitcoin anchor or chargeback submission is implemented.

Commercial experiment: optional anonymous last-30-day handoff frequency and response to a clearly unavailable $79/month team concept. Answers include team fit, per-project preference, and existing workflow sufficient. No contact data collected; no checkout, account or reservation. Do not count votes as customers. Actual payment and retention tests are still necessary.

Events: doc_delivery_complete/export/verify are actions, not people. doc_delivery_sample is excluded from real demand. doc_delivery_interest_{none,few,repeat}_{team,project,none} are fixed categories only. No hash, file name, content or source notes enter analytics. Browser QA uses ?ci=1; isolated storage checks use doc_ci at /__ci/documents.

Operational fix: malformed events return 400, storage failures return 503. Statistics use literal doc_ and CI-prefix comparisons and exclude delivery samples. Deployment separately verifies static pages, measurement, legacy membership and workbench. A measurement/member failure remains a hard workflow failure, while already verified pages can still be submitted to IndexNow. This does not claim a root cause or repair of Cloudflare failures.

Validation: Node 24, pinned existing PDF dependencies; 17 unit/integration tests cover real PDF behavior plus SHA-256 known vector, changed/missing/extra files, duplicate names, hostile HTML notes, untrusted imported attestations, strict analytics and storage failure. Generator and verifier cover all 36 pages, local links, languages, canonical/hreflang, plain text, structured data and brand assets. Production/browser results to be recorded after publishing.

Deferred until evidence: paid team workflow, authenticated recipient consent, payment setup, proprietary network/reputation and any Bitcoin anchoring. Original paid membership remains isolated. Full decision and Trends table live under root docs/.


Production outcome: 38feed61 published edition .7; 36 pages, legacy guards and workbench passed. IndexNow returned HTTP 200 for 84 URLs. Overall workflow 36149328137 failed on backend membership/pulse/measurement. Browser verified JSON export, unchanged/changed files, safe share URL, English Home and 375px content width with no horizontal overflow. Diagnostic patch 44c4bfc7 subsequently exposed daily_limit from D1. No paid order or independent customer was produced by QA.

Follow-up: document stats now use one grouped SQL query instead of six; successful document-stats/pulse aggregates cache for 300 seconds, x-probe checks bypass, failures never cache. Overflow fails explicitly. This reduces repeated query work but does not reset an exhausted account quota. Tests total 20, including actual SQLite and cache behavior. Cloudflare Paid remains an unapproved new expense, minimum $5/month plus possible usage charges. Root decision report records the official sources and reset time.
