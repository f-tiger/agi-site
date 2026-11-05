# ECO monthly affiliate revenue operations

The current operating goal is **USD 100 of ECO-attributable confirmed net
commissions over 30 complete reporting dates**, with USD 1 and 10 checkpoints.
This is affiliate revenue before operating costs, not MRR, retail sales or cash
received. The scope is ECO; it does not rewrite other fleet revenue objectives.

## Run the private scorecard

Python standard library only. Reuses the fleet collector's fixed URL allowlist,
one-hour cache, explicit probe UA, response size bound and no-redirect policy.
No business events, credentials, paid APIs or third-party uploads are involved.

```sh
python3 tools/affiliate-growth/monitor.py --fetch --out /tmp/eco-revenue-private
```

Open `/tmp/eco-revenue-private/dashboard.html`. The directory contains a readable
HTML scorecard, `report.json`, `daily.csv` and a dated `history/YYYY-MM-DD.json`.
Move the private directory to persistent private storage if the environment is
ephemeral. Re-running the same day replaces that day's snapshot; never sum rolling
snapshots to calculate revenue. The report shows missing or stale data explicitly.

For an already captured raw `/api/trend` body or fleet-collector response:

```sh
python3 tools/affiliate-growth/monitor.py \
  --snapshot /private/eco/trend.json --out /private/eco/scorecard
```

`--as-of YYYY-MM-DD` is an exclusive end date for historical analysis. Traffic
must contain exactly 56 complete UTC dates and eight matching weeks; daily and
weekly counts and breakdowns must reconcile. A source ending before the requested
day is stale. Unknowns do not become zero; known collection gaps remain visible.
The inherited human/legacy-UA classifier does not establish independent people.
Referrers belong to events, not session acquisition; cohorts mix markets/languages.

## Add merchant evidence privately

Copy `merchant-template.json` **outside every Git worktree**, populate it from
actual merchant statements, and run:

```sh
python3 tools/affiliate-growth/monitor.py --fetch \
  --merchant /private/eco/merchant.json --out /private/eco/scorecard
```

The reader accepts a normalized summary, not arbitrary Amazon CSV layouts.
Retain original statements privately and reference them in `evidence_ref`.
This is manual evidence import, not an authenticated Amazon API integration.

- Exactly one report per DE/US market, covering the same 30 calendar dates ending
  the day before `--as-of`; retain each merchant report's actual timezone.
- `net_commission`: merchant-confirmed commissions **after** reversals. Pending
  orders, ordered items and shipped items do not substitute for commission.
  Negative net adjustments are supported. `cash_received` is separate.
- `statement_status: confirmed_net` requires evidence; a checkbox does not verify
  a statement. Use the actual report's status and wait for reporting lag.
- `tracking_scope: exclusive_site` requires `scope_evidence_ref` and the exact
  hostname. Known fleet-shared tags `getecoback-21` and `ecoback0d-20` always remain
  account-only, even if labelled exclusive in the import. Do not invent new tags
  or replace live links before Amazon creates and validates an exclusive ID.
- EUR conversion needs `fx_to_usd` with positive `rate`, period-end `date` and
  `source`. The rule is a period-end valuation; do not silently assume EUR=USD.
  USD is already the target currency. No exchange-rate network call is made.
- Missing market coverage, provenance, current dates, confirmed net amount, FX
  or exclusive scope keeps all ECO milestones unknown. Account report amounts
  remain visible separately. Account-level revenue must not be credited to ECO.
- Merchant EPC uses merchant clicks only. Site event counts are not its denominator.

The template is blank, not a sample of earnings. Existing historical owner
reports remain in their original ledger with their original dates; this tool does
not update them, backfill screenshots from other conversations or extrapolate.

## Monitoring cadence and privacy

The existing `eco-health.yml` daily 05:00 UTC schedule now checks this source's
freshness. It prints only source status and `revenue_milestones: unknown`.
It never reads merchant reports, publishes counts or uploads report artifacts.
No new recurring trigger is added and the paused Growth Loop stays paused.

Private numeric reports refresh **when this CLI runs**. The daily source check
does not automatically update a local HTML file, retrieve Amazon statements or
prove revenue. Full unattended revenue reporting still needs an authorized,
readable private merchant data source. No such connection is claimed here.

Keep operator work in a private CSV: `date,experiment_id,action,url,minutes,
cash_cost_usd,publication_status,evidence_ref`. Paid costs and time are not zero
just because no new subscription was purchased. Calculate contribution only when
both net revenue and all applicable costs are known. Do not count a draft as a
published message, a test as a customer or a click as a sale.

## The shortest path under current constraints

1. **Evidence first:** recover current merchant statements and a defensible site
   scope. Fresh traffic is already readable; merchant revenue remains a separate
   gate. Payment/tax onboarding affects withdrawal, not proof of visitor demand.
2. **Concentrate:** German humidity, laundry and cold-cellar decisions have an
   existing merchant path and useful tools. Maintain cooling pages with existing
   click activity. Do not spread this sprint over unmonetized new countries.
3. **Distribution before more tooling:** use existing intent pages and owned
   task links. `operations.json` includes three German distribution drafts with
   ownership disclosure, canonical URLs and no direct Amazon links. They are
   **not sent**. External publishing/outreach needs its applicable authorization.
4. **Scale evidence:** inspect exposure before rejecting demand, and merchant
   eligibility/reporting delay before rejecting an offer. Avoid underpowered
   A/B tests. An operational threshold is a decision rule, not significance.

`operations.json` defines checkpoints on November 7, November 19 and December 5,
2026. These are review dates, not guaranteed earning dates. The existing daily
content limit, source verification and release gates remain in force. A second
non-overlapping successful 30-day period is required before calling $100 repeatable.

Illustration, **not observed performance**: 25% eligible-visit-to-merchant-click ×
5% merchant-click-to-order × $8 net/order yields $100 from 1,000 eligible visits
and 250 merchant clicks. A lower-yield case (20% × 3% × $4) needs 4,170 eligible
visits and 834 merchant clicks. Both are assumptions; event ratios cannot validate
these funnel rates and fractional expected outcomes are not guaranteed orders.

## GitHub selections checked November 5 2026

| Project | License checked | Decision for this goal |
|---|---|---|
| [marketingskills](https://github.com/coreyhaines31/marketingskills) | MIT | Adopt the [attribution](https://github.com/coreyhaines31/marketingskills/blob/main/skills/attribution/SKILL.md) and [CRO](https://github.com/coreyhaines31/marketingskills/blob/main/skills/cro/SKILL.md) diagnostic methods: conversion source of truth, separate credit from outcome, inspect the buying task. No third-party executable installed. |
| [opcstack](https://github.com/liustack/opcstack) | [CC BY-NC 4.0](https://github.com/liustack/opcstack/blob/main/LICENSE.md) | Relevant solo-founder health/marketing workflows, but commercial use needs a separate license. Do not adopt into this revenue operation without that license. |
| [OPC](https://github.com/iamtouchskyer/opc) | MIT | Engineering orchestration and independent review; defer. More agents do not supply customers or merchant statements. Its own performance claims are not income evidence. |
| [Umami](https://github.com/umami-software/umami) | MIT | Defer a new hosted analytics stack: the existing first-party endpoint already supplies daily events. It cannot recover Amazon commissions. |
| [Plausible](https://github.com/plausible/analytics) | AGPL-3.0 | Same decision; operating another analytics service adds maintenance before resolving the revenue bottleneck. |

No stars or framework adoption counts are used as proof of business results.
No copied third-party skill is republished; the monitor is project-specific code.
This change adds no public consumer page, so consumer GA4/SEO/GEO/IndexNow release
gates are not triggered. Any later buying-page change must run the existing gates.

## Five prompt refinements with adversarial checks

| Round | Refined instruction | Adversarial check incorporated |
|---|---|---|
| 1 | Operate ECO toward $100/month with $1 and $10 gates. | Define net confirmed commission; retail sales, pending commissions and cash are different. |
| 2 | Audit current assets and revenue evidence before choosing a tactic. | Missing evidence is unknown; historical screenshots and shared tags do not establish current ECO revenue. |
| 3 | Choose GitHub skills/projects that resolve a measured bottleneck. | Stars, agent counts and attractive demos do not supply distribution; check commercial licenses. |
| 4 | Run bounded acquisition and offer experiments with review dates. | Lack of exposure is not lack of demand; clicks are not purchases; no underpowered causal claim. |
| 5 | Execute a private scorecard, evidence gates and daily operating rules. | Reject stale/missing dates, duplicate rolling reports, unverified currency conversion and shared attribution; do not claim autonomous income collection. |

These are explicit self-checks, not independent model evaluations. Final brief:
act as ECO's startup CEO, use current evidence to find the shortest legitimate
commission path, reuse necessary open-source methods, implement reversible
improvements and measure $1/$10/$100 with merchant evidence. Default to zero new
paid spend. Continue authorized implementation without routine confirmation;
preserve the existing restrictions on outreach, accounts and sensitive data.

## Verify

```sh
python3 -m unittest discover -s tools/affiliate-growth -p 'test_*.py'
node --test tools/affiliate-growth/test.mjs
```

Tests include missing/duplicate dates, mismatched aggregates, stale responses,
unknown revenue, shared tags, returns, FX, overlapping statements, safe HTML,
public-log restrictions and rejecting outputs inside a Git worktree.
