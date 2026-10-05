# Coding access: a reusable selection sheet

The existing directory helps a developer distinguish a provider subscription,
an API relay and a compatible model. This change fixes a concrete mismatch:
searching `Codex` omitted candidates that the Codex tool filter included. Search
now includes the existing tool labels; `Claude Code` and `claude-code` are aliases.
It does not infer new compatibility or change a candidate's review status.

The visitor can copy the current visible candidates into a local selection sheet,
including billing, account/refund boundaries, cautions, source links, recorded
review/attempt dates and the visitor's purchase-checklist state. Pending candidates
remain explicitly unverified. The sheet is a comparison aid, not a recommendation,
reliability test or regional-eligibility guarantee. Existing data dates stay intact.
An empty result cannot produce a sheet. Clipboard failure offers manual copying
without recording successful export. No account, cloud storage or model call is
required; typed queries and checklist content are not sent to analytics.

## Decision and bounded experiment

Three brief calibration rounds: (1) improve an existing high-intent task,
(2) challenge the assumption that another page creates durable business value,
(3) ship the smallest usable output and instrument its real completion. A
read-only independent code review reproduced the missing-search-result defect;
that is product-quality evidence, not independent customer-demand evidence.

Free value: a sourced selection sheet that the reader can revisit and check.
The potential payer remains the vendor using BPJ's separately labeled existing
sponsorship. There are no affiliate commissions on these directory links, no
new offer or checkout and no paid influence on results or review status. The
reader's successful copy does not demonstrate the vendor's willingness to pay.
Payment availability is determined by the existing live readiness checks.

Distribution uses the existing homepage, search, feature map, bilingual directory,
JSON/Markdown and canonical URLs. Release notifications use existing changed-only
IndexNow processing. No external outreach, paid promotion or new schedule.

Execution review: 2026-10-12; the seven-complete-day usage decision is no earlier
than 2026-10-13. The first seven complete UTC days after
the release day are 2026-10-06 inclusive through 2026-10-13 exclusive; do not call
an earlier partial window a seven-day comparison. Read the existing cached reach
snapshot, preserve its generated time and window, and separate exposure, filter,
source/open, generic-checklist copy and selection-sheet copy actions. No visitor
identifier joins these stages. Ratios are not person-level conversion rates.
The directory's original 2026-11-01 commercial review remains unchanged.

The initial usage gate is at least five non-QA selection-copy actions in the
complete window, with the count explicitly treated as repeatable browser actions,
not five people. Passing supports a bounded usability review, not expansion or
charging. With no copies and at least fifty referred page-view events over the
same window, inspect clarity and task fit before adding candidates. With lower
exposure, mark distribution unverified and hold expansion. Counts unavailable in
a stale or partial snapshot remain unknown. This is an operating rule, not a
statistical claim. Existing account-growth and sponsor experiments keep their own
denominators, deadlines and success conditions.

Independent review found that the legacy reach `paths`/`humans_referred` counts
include the current partial UTC day, while `conversion_stages` excludes it.
Do not use those legacy counts for this same-window exposure gate. Until a
matching complete-window count for the coding-access pages is available, exposure
is unknown and the fifty-view/zero-copy condition cannot fire. A shared cache or
the same retrieval time does not repair a window mismatch. On 2026-10-13, request
the existing cached seven-day window once; do not substitute the default rolling
twenty-eight-day count or bust the cache. A later rolling seven-day window is a
different cohort and must be labeled with its actual dates.

## Measurement and release acceptance

`coding_access` accepts the fixed `/coding-access/copy/selection` success path;
the old `/coding-access/copy/catalog` continues to mean generic-checklist copying.
The existing `conversion_stages` indexed event query returns separate counters
inside the existing hourly reach cache. No additional database query, cache bust,
cron, raw fleet aggregation or GA4 daily report is introduced. GA4 retains the
current site-wide privacy controls and approved fixed completion action.

Required checks: bilingual successful/empty/aliased search; pending labels;
only visible candidates in the copied sheet; source/date preservation; clipboard
failure and no-result handling; mobile overflow, no-JS content, QA/DNT/GPC
exclusion and fixed analytics payloads. SQLite verifies complete-day bounds,
invalid-path rejection, repeated actions, unknown-versus-zero and use of the
existing partial index; the reach-cache test verifies no second database read.
Finish all page builders before GA4 coverage installation and checks. Run the
existing canonical, output and deployment gates, then verify the actual public
pages and asset version. Build, browser and deployment success do not establish
real customers, received GA4 business traffic or revenue.
