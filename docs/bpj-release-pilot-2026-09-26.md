# BPJ paid-app review: a bounded demand experiment

2026-09-26. Owner requested optimize-then-execute using existing agi-site sites, following two rounds of R6.3 plan review. This authorizes this demand-experiment release; it does not turn applications into permission to charge, perform customer tests or send unsolicited messages.

## Optimized brief and decision

Use BPJ's existing coding and first-party studio entrances to test whether studios maintaining paid apps will bring an upcoming payment/access review task to a proposed $299 single-app service. Publish English and Chinese pages with the same scope, a fictional report, a free downloadable preparation checklist and an optional private application. Keep checkout closed. Verify failure, retry, privacy, source attribution and QA separation before deploying through the existing pipeline.

Do not launch another domain or expand all A/B/C products. A remains the main hypothesis, B is a fallback, C stays on hold, investment stays independent. Existing BPJ video tools can support a future B experiment if evidence changes the ranking. Eco and TDS audiences do not currently provide evidence of demand for this developer service; do not add unrelated fleetwide banners. Existing verify.agiscorecard.com targets x402/API shape checking, a different job; it is not silently rebranded as subscription QA.

## Evidence, not a claimed buyer segment

- Current repo and site inventory read on 2026-09-26: BPJ has bilingual static builders, coding category, studio, D1 and a working deployment workflow.
- `/api/reach` read 2026-09-26T08:26:59Z: 394 referred page views in the last 28 days (2026-08-29 through 09-26); `/en/c/coding` 34. These are the endpoint's event counts, not verified unique people or studio owners. Small distribution limits this experiment.
- R6.3 has no own customers, payment, repeat purchase or comparative service delivery evidence. $299 is a testable proposal, not an accepted market price.
- Repo `docs/agents-venture-2026-09-25.md` provides the coding-reader hypothesis, not proof that those readers buy QA. Older fleet experiments suffered QA-contaminated metrics; this release keeps test rows separate.

## Scope and design

Routes `/en/studio/release-check` and `/studio/release-check`. Contextual entries only in the matching language's `/c/coding` and `/studio/`. Existing site palette/type/rules remain authoritative: paper #efece6, ink #141414, blue #1b4de4 for planning, green #1f7a5c for inspection. A concrete sample finding, not a generic AI hero, explains the output. Mobile reading follows one column. Checklist selections never imply a pass score.

Proposed paid scope: one isolated environment, one Stripe subscription integration, one auth method, two plans, at most 12 agreed cases, Chromium, report plus one fixed-version retest. No live credentials, customer data, production access, security certification, promised delivery slot, recurring plan or checkout.

Form uses structured task/role/stack/timing/budget choices and contact email with explicit task-contact consent. It allows negative price responses. Server screening only labels self-reported fit; a person must verify authority, project and alternatives. Application intake closes 2026-10-10 23:59:59 Asia/Shanghai or can be paused earlier. There is no automatic reopening.

## Resource and decision card

No new domain, paid model calls, ads, subscriptions or provider upgrade. Use existing infrastructure; no new scheduled workflow. Preparation/release is one bounded change set; future human delivery hours and cash budget must be agreed before accepting orders. First review is at window close or when ten manually verified matching applicants have been evaluated, whichever happens first. No background customer-testing service is implied.

Read a 30-day rolling window with QA excluded. `view`, `price_seen`, `checklist_export`, `apply_open` each deduplicate by random tab session. Sessions are pseudonymous: an application can associate the session with an email. Application emails and sessions deduplicate; email is unverified and is not a company identity. Do not infer unique visitors or quote conversion from raw totals. The `cohort.price_linked` subset is explicitly linked to a price_seen session; unlinked applications are not added to its numerator.

Operating threshold: fewer than 50 price-seen sessions and no matching tasks = distribution inconclusive, not demand disproved. At least 50 and no matching tasks = review audience/offer, only one bounded change next, not automatically more features. A screened application triggers private task review, not G2. Any actual paid pilot still needs input authority, environment rehearsal, exact terms, resources and delivery owner. Two independent buyers, natural repeat and measured 30% repeat-delivery contribution remain subsequent gates; no application count can unlock them.

## Operations and pause

Responsible business owner: Edison; this assistant prepares evidence and conducts review when the task is active. No continuously working human/agent staff is claimed. The existing daily deploy schedule reads authenticated aggregate stats and records `data/release-pilot-report.json`; stale new applications over two days produce a workflow warning. No automatic customer email is sent. If review capacity is unavailable, use the authenticated pause action; the form also closes by date. The landing explicitly promises neither acceptance nor reply time.

Operator credential reuses the existing `ADS_WATCH_SECRET` binding; it is never sent to the browser. `GET /api/release-pilot` exposes availability only. Authenticated POST actions `stats`, `list`, `review`, `pause` provide totals, private applications, status changes and intake control. Review statuses: new/reviewed/rejected/invite_ready. `invite_ready` is an internal state, not a message or paid order. Never log `list` results to public Actions or commit customer data.

Receipt-authorized `confirm` returns only a saved boolean; `withdraw` deletes the matching application. The UI stores pending payload before sending so a lost response can be recovered, locks retries to that payload and detects server conflicts. Receipts exclude email and can be imported. Pending payload may temporarily include email in tab-session storage; it is removed after confirmation/withdrawal.

Thirty days is the evaluation window, not a claim of deletion at an exact second: cleanup runs on API data access and daily reporting; old data can remain until the next successful cleanup. Daily keyed network digests bound abuse without storing raw IP; max five applications per network/day, max fifty non-QA/day, QA separate max ten/day. These are intake protections, not proof of bot-free demand. The internal shared D1 may become unavailable; the form must then say unavailable, never saved.

## Verification and rollback

Round 1 code review: retry payload conflict, receipt recovery, deletion gap, duplicated/capped intake, operator queue and pseudonymous measurement found and repaired. Round 2 reviews the revised implementation before release. Tests use real SQLite for SQL and Playwright for EN/ZH mobile/desktop, failed submission, retry, receipt recovery and withdrawal. CI live smoke uses QA-only application then deletes it. Daily reports never serialize emails/receipts.

Rollback: pause intake first through the authenticated control; remove the two entry snippets if necessary, keeping receipt withdrawal available for existing applicants. Revert only this feature's commit through the normal deployment workflow. Do not reset the shared branch over concurrent work.

### Verification result

Both sequential code reviews completed: round 1 found five implementation gaps, then round 2 found three gaps in the revised code. Patches use the existing watchSecret credential derivation, restore/lock pending form values with cancellation, and require HTTP 200 plus ready=true in live smoke. Local real-SQLite tests and EN/ZH mobile/desktop browser paths pass. Site build validation: broken links, invalid JSON-LD, Chinese leakage on English pages, placeholders, contradictory copy, empty pages and hreflang errors all zero. This validates implementation, not customers or revenue.
