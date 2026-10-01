# AGI homepage focus — 2026-10-01

## Decision and scope

Readers need an understandable first task and dated evidence. Lead with the existing eight-prediction ledger, then work implications and investment research. Preserve the original verdicts, investment routes, directory, discussion, mentor and active experiments. The English dark theme and Chinese white/blue theme remain distinct.

Three prompt refinements: (1) diagnose traffic separately from measurement gaps; (2) concentrate the homepage on three existing reader tasks; (3) deliver bilingual flows, fixed completion events, realistic failure states and live verification without refreshing evidence dates.

Two adversarial reviews: (1) a new layout cannot establish search demand or revenue, so no growth claim or new paid offer; (2) stale dates, missing Chinese evidence pages, duplicate completion events, failed clipboard writes and active experiments must not create false evidence. Missing translations now link to the real English source with a language label. The active `/when-will-agi-arrive` experiment remains untouched.

## User, buyer and value

- Intended reader: a person checking an AGI claim, its evidence, or its implications for work and investment research.
- Free value: inspect dated verdicts and source links; assess all eight predictions locally; compare disagreements; copy a summary with a tagged page link.
- Possible buyer: a researcher who repeatedly tracks sources and needs the existing cloud research workspace. This is a hypothesis, not a verified AGI customer segment.
- Paid value remains the existing source-review/workspace offer. No new price, payment method, AI expenditure or recurring service is introduced. This release does not establish that a visitor will pay or that checkout produced revenue; existing membership gates retain ownership of payment readiness.
- Needed commercial evidence: repeated real source-review usage, relevant workspace intent, and provider-confirmed paid orders. Clicks and browser completions are not orders.

## Baseline and interpretation

The supplied GA4 screenshot reports 257 active users and 254 new users for September 24–30, with 2 key events. These measures do not imply 3 returning users or 2 sales. Prior-session GSC retrieval for the domain property reported 1 click / 143 impressions for September 1–28 versus 3 / 261 for August 4–31. Property totals include subdomains and must not be compared directly with page-filtered aggregation or competitor estimated visits.

GA4 coverage repairs on October 1 changed measurement coverage. Compare subsequent periods on a consistent basis; missing historical events cannot be reconstructed. GA4 reporting authorization was unavailable during the diagnosis. The first-party collector is an independent event count, not a replacement for GA4 users or GSC search clicks.

## Measurement contract

| Event | Meaning | Limitation |
|---|---|---|
| `focus_entry` | A named evidence/work/investment/navigation action | Click, not a completed task |
| `task_start` | First prediction selected in an assessment attempt | One per attempt; no persistent identity |
| `task_complete` | All eight predictions selected | Edits do not count again; reset starts a new attempt |
| `result_copy` | Browser clipboard write succeeded | Copy, not a published post or referred visitor |

Only fixed `location` and `label` values leave the assessment. Choices and scores stay in the page; the copied summary is user-controlled. DNT/GPC, `ci=1`, `__qa=1`, `__probe=1` and verification traffic suppress these events. The collector rejects arbitrary labels for these four event names. No cookie or session identifier is added.

`/api/pulse` exposes `focus.metric=browser_events_not_users`, aggregated by event, location and fixed label since October 1 and within its existing 28-day lookback. Today is partial. The existing event-name index bounds the query; the existing hourly aggregate cache is versioned to v2. Failure is `focus:null, partial:true`, never fabricated zero. Existing `calc_use` assessment totals end at this release; do not splice them into the new completion series. Other calculators keep their existing events.

Review after at least 14 complete days, and separately note whether the homepage reached 100 relevant visits. Low volume means insufficient evidence, not a successful conversion rate. Read GSC impressions/clicks, same-scope GA4 engagement, fixed task events and actual paid orders separately. No causal uplift claim is possible without a controlled comparison.

## Distribution

Owned-site actions in this release: homepage task links; evidence context on the English/Chinese tracker and employment article; refreshed sitemap, Atom feed and agent mirrors. Successful copies include `utm_source=reader_share&utm_medium=copy&utm_campaign=agi_focus_20261001`. That tag identifies a copied-link campaign, not the number of people who shared.

Prepared copy for a later authorized post (not published or sent):

> Eight AGI predictions, one dated evidence ledger. Inspect the sources, make your own assessment and see where you disagree. The score summarizes judgments; it is not a probability of AGI. https://agiscorecard.com/?utm_source=owned_social&utm_medium=organic&utm_campaign=agi_focus_20261001#grade-game

> AI 进展到了哪一步？逐项核对 8 项预测，给出自己的判断，再看与公开台账的分歧。分数是判断的汇总，不是 AGI 概率。https://agiscorecard.com/cn?utm_source=owned_social&utm_medium=organic&utm_campaign=agi_focus_20261001#grade-game

## Build and verification

`tools/build_home_focus.py` owns only marked homepage/evidence fragments and metadata. Its score/date source is `data.json`; website updates come from `changelog.json`, whose newest three entries require Chinese titles. It never writes ledger/history data. Run after page generators and before feed/mirrors; `--check` detects stale fragments. Sitemap dates represent page changes; article/ledger dates retain their original meanings.

Local checks cover bilingual mobile/desktop scoring, evidence destinations, edit/reset event counts, retry, clipboard success/failure, privacy exclusions, collector input filtering, actual SQLite index use, aggregate failure and existing D1 cache/read-budget gates. Deployment also runs the existing full suite. Live verifier checks release markers, asset hashes and unchanged ledger/history bytes with CI-tagged requests.
