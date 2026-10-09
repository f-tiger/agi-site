# Existing video to a bounded business-evidence record

Scope: deepen the existing OpenRouter `distribution-opportunity` view. This is
not a new business, feed, reviewed interview, source-analysis automation, paid
report or service offer. AIUC and external comparative cases are unchanged.

Three refinements: locate the actual daily discovery and existing delivery
tools; distinguish metadata, participant accounts, public pricing and editorial
application; preserve an explicit, portable evidence record without silently
rewriting a reader's plan. Two review passes address commercial evidence and
record compatibility. Deployment and real demand remain separate gates.

## Provenance and limits

The discovery joins `43b4c17eaa8b43df42b5` / `dCX4PE2HxMs`, published
2026-09-25T23:01:42Z and first found 2026-10-03T09:00:29Z. It already maps to
the reviewed OpenRouter interview. Counts stay at 16 interviews and 30 views;
this does not convert any metadata-only episode into a reviewed claim.

On 2026-10-09, the publisher transcript at
https://www.latent.space/p/openrouter was read at 17:27–20:02 (access) and
29:09–30:28 (community problem discovery). These are participants' accounts,
not independent proof of demand or attributable customer acquisition. Speaker
labels appear inconsistent, so this increment attributes them to the discussion.
No full-video viewing or financial audit is claimed.

https://openrouter.ai/pricing publicly lists Standard 5.5% and Business 8%
pay-as-you-go platform fees. These are neither monthly prices nor profit
margins. BYOK is separate. Revenue, CAC, paid retention, margin and willingness
to pay for the reader's service remain unknown. No acquisition valuation,
fundraising or usage metric is used as revenue proof.

## What changes

The existing view card/details show a versioned, claim-level evidence receipt.
Each row retains a source, locator, evidence kind, real editorial check date and
limit. A public offer does not grant a global verified label. The module is
append-only by evidence version; later reviews must retain old receipts.

The optional `note.commercial` field contains a known receipt version and three
self-reported answers: existing recurring workflow, permissioned de-identified
failure/rework records and responsible output owner. No customer text is added.
Rendering, changing answers or switching language does not alter saved plans.
Only explicit attachment can change the current draft, and only all three Yes
answers permit the bounded check. It preserves the old review date, then uses
the existing explicit Save. Missing/unknown prerequisites do not recommend
`workflow-maintenance` and preserve the old plan. Existing cloud handoff still
requires a separate explicit upload on the member page.

The reused action checks one existing failed run with its owner: compare it to
an observable expected output, record the discrepancy and one harmless retest,
and count review/rework time. Stop on missing permission/owner/expected output,
unreproducible failure or no demonstrable improvement. This diagnoses a bounded
case; it is not permission to change production, evidence of market demand,
certification, or a promise of paid work. The Earn relationship is AGI's
conditional application hypothesis, not a recommendation by the speakers.

Old version-1 notes remain compatible. Unknown/corrupt evidence versions fail
closed to an unavailable receipt while preserving the usable note. Sources,
locators, evidence kinds, limits and the conditional application are retained
in Markdown export; JSON and the original cloud record retain the versioned
receipt identity and self-reported fit. No automatic migrations or uploads.

## Four clocks and measurement

The 36-hour RSS health rule, actual editorial `checkedAt`, reader-selected
review date and original Earn observation window are independent. None is
reset by this release. Earn's original 28 complete days and the >=300 relevant
page-view / >=30 planner-change / >=10 export / >=5 membership-entry operational
thresholds remain unchanged. These events are not users or revenue.

Only existing fixed source/open/plan/export events apply. Fit answers, notes
and evidence payloads never enter analytics. EN/ZH content, source-preserving
Markdown, existing canonical/hreflang/Article citations and targeted sitemap
dates agree. GA4 coverage is checked after generators. IndexNow remains the
existing weekly/manual post-deploy process; no submission is made by this PR.

## Verification and publication boundary

Frozen positive/negative input tests cover conditional fit, explicit draft/save
boundaries, no implicit old-note changes, language switches, old backups,
unknown versions, sanitized export and responsive layout. Existing Future Guide
and membership fixture tests are retained. Browser requests are limited to the
local fixture; all external requests are intercepted and aborted.

Local deterministic and membership mock checks passed. Local Chromium could
not start because the environment refused its socket; no browser success is
claimed from that attempt. The dedicated PR-only `check-future-commercial.yml`
uses locked Playwright 1.58.2, contents-read permission, no persisted checkout
credentials, no secrets, no feeds, no model calls, no production APIs and no
deployment. Its real result must be recorded on the draft PR.

Only the four affected hub/detail HTML and Markdown snapshots are included.
Other tracked snapshots already lagged the existing dropdown-plan generator.
An untouched checkout may therefore fail `build.mjs --check` until the normal
full build has run; PR CI and the safe publisher must build before checking.
Unrelated homepage rotation, generated membership files and older mirror
differences are not bundled into this feature commit.

Do not merge/deploy this draft through the current publisher until the
independent deployment-side-effect audit is resolved. No order/watch cleanup,
permanent deletion, private runner, or production financial operation is part
of this change. Safe publication and live source/asset verification remain
separate from offline tests and from genuine commercial validation.
