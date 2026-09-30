# AI infrastructure research — release scope

Owner request: execute the launchable plan after broad AI business research. Three prompt passes clarified the buyer task, checked existing data/payment infrastructure, and constrained a verifiable first release. Two adversarial passes rejected generic stock chat as differentiation and tested period/unit/source confusion. This explicit request authorizes the implementation and deployment; it does not establish customer demand or revenue.

## Product and commercial path

Existing AGI Scorecard readers researching AI infrastructure can inspect annual SEC facts for twenty companies, compare a watchlist, ask the hosted model for cited research questions, record counterevidence and a future review date, and compare later values with their reviewed baseline. EN `/ai-infrastructure`, ZH `/zh/ai-infrastructure`; existing investment/tool hubs link to both. No new domain.

Free: data, comparison, capped AI questions, local notes with ten saved versions, JSON import/export and Markdown research briefs. Paid increment: same-site cloud workspaces and versions through the existing AGI membership (9 USDT plus the unique order fraction, thirty days; no automatic renewal). This release adds a supported record type without changing payment partitions, price, membership isolation or AI entitlements. Model access is a limited free trial, not something payment makes unlimited.

Buyer hypothesis: individual researchers with a recurring company-review task who value source provenance and resuming their notes across devices. This is not validated. Alternatives include SEC plus spreadsheets, existing paid financial research suites and general AI assistants. Company-wide annual data cannot replace segment research, current quarterly results, prices or professional advisory workflows. Existing site distribution is an entry point, not purchase proof.

## Data contract

- `tools/infrastructure/data.py` selects standard US GAAP USD facts in 10-K/10-K amendments. Annual duration must be 330–400 days; quarter/YTD facts, future filings and other currencies are excluded. Inventory is an instant balance.
- Revenue tags retain their actual concept name. No substitution of productive assets, leases or acquisitions for cash property capex. Missing tags stay missing.
- Every displayed metric must end on the same latest eligible annual reporting date for that company. This specifically fixes obsolete tags that otherwise return NVIDIA capex from 2012 or Equinix capex from 2010.
- Latest filing date wins for an exact period. Same-day conflicting values/durations are withheld. A difference from the first disclosed value is only a revision flag, not an asserted cause. Dates have day precision, not executable-trade timestamps.
- YoY uses the same concept/unit and a prior annual period 330–400 days earlier, with duration difference at most seven days. Nonpositive prior values do not receive a percentage growth rate.
- The existing daily deployment refreshes twenty companies sequentially, with fair-access identification, delay and timeouts. Failure preserves the last-good per-company check date. Failed/older-than-72-hour snapshots are flagged and cannot generate AI questions. No browser request fans out to SEC.

## AI and privacy

The Worker reads the deployed server snapshot, not client-supplied financial facts or URLs. The client sends ticker, language, snapshot ID and explicit consent. Personal notes do not enter the model prompt. Output is a constrained list of research questions citing allowed fact IDs; numerical prose, invalid schemas and fabricated source IDs are rejected. Numeric evidence is rendered by deterministic code. Questions are unverified hypotheses, not verified research findings or investment instructions.

Separate `infra-*` atomic counters use the existing limit table: twelve sitewide attempts per twenty-four-hour window, two per keyed IP hash. Failed inference consumes quota. No increase to Relay's quota, account spending limits or paid services. Expired counters are cleaned in bounded batches on later successful quota reservations; no new request means delayed cleanup. Model maximum output is 1,400 tokens. Budget caps bound calls, not a guarantee that provider inference always succeeds.

Local notes require explicit save. Cloud handoff checks exact origin/window and a nonce, then the member portal requires a separate save and active AGI entitlement. Notes/keys do not enter URLs. AI results stay in the tab and can be included in a Markdown export; JSON/cloud backups contain watchlists and notes, not a promise of persisted model outputs. Imported baselines are user supplied and not authenticated.

## Verification and release gates

`python3 sites/agiscorecard/tools/infrastructure/test_data.py` exercises periods, revisions, conflicting facts, units, obsolete tags and shipped provenance. `node --test .../test.mjs` covers portable records, citations, origin/consent, prompt isolation, stale snapshots, concurrent quotas, provider failure and actual membership handlers with mocked chain transfers. It is not an investment-performance or model-accuracy benchmark.

`node .../browser-test.mjs` checks both locales: search/watch/comparison, editable notes, JSON/Markdown export, import, local versions, AI fixtures, actual member-page handoff without implicit uploads, mobile overflow and embed mode. Production model inference is a separate live release check. Existing research arithmetic/browser checks and membership isolation remain required.

Deployment is `f-tiger/agi-site` main via `deploy-agiscorecard.yml`. Public page reachability, latest source data and actual source-linked model output must be verified after deployment; a green local test is not proof of a live feature. Build-generated membership pages/assets stay out of source commits.

## Commercial review

Review after thirty days (2026-10-30) or one hundred relevant landing visits, whichever is earlier. These are operational thresholds, not statistical claims. Low traffic means distribution remains untested. Treat cloud-save intents, pageviews and AI calls separately from paid orders and repeat research use. Continue investment only with concrete repeat-task evidence, completed paid orders and support/model costs that leave positive contribution. No outreach, promotion into third-party communities, synthetic testimonials or claimed revenue was performed by this release.

## Verified release evidence

- Published source commit: `5e79eaeacb236c83f9f2ff08933fd5f9e8d382c7`; local and remote source trees matched before publication.
- Cloudflare version: `0a426bc7-f7e1-4e77-a6d5-4aa84605af10`, deployed on 2026-09-30. Run: https://github.com/f-tiger/agi-site/actions/runs/36693393699 .
- All pre-deployment checks passed, including fresh SEC acquisition, both new browser flows, existing workbench tests and independent membership isolation. New live research checks and live membership readiness/protected-endpoint checks passed.
- The overall workflow is red because its existing, separate Relay inference check returned `429 rate_limited`. Relay limits and that gate were preserved. Later workflow steps were skipped; a green overall workflow is not claimed.
- Independent post-deployment requests returned HTTP 200 for both EN and ZH research pages, both investment-hub links, source snapshot `99add8cb0a52379cec8c`, and the membership catalog. The member public API reported `ready: true` for `agi`; no real order or paid grant was created.
- Two real production inference requests (EN and ZH) each returned HTTP 200 and three research questions with valid IDs from that deployed snapshot. Chinese output was checked for Chinese text. This verifies a working model path and citation contract, not investment accuracy or reliable reasoning across all companies.
- No customer purchase, revenue, retained user or market validation is claimed by these release checks.
