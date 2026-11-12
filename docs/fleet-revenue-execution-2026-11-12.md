# Fleet revenue execution: restore sales and preserve buyer context

The owner requested using the installed startup/marketing Skills to advance
fleet revenue. Three planning passes identified existing buyers/offers,
challenged payment and demand evidence, then selected a bounded repair and
observation window. Applied methods: startup-canvas, monetization-strategy,
prioritize-assumptions, brainstorm-experiments-new and gtm-strategy. Framework
estimates are hypotheses, not verified market demand or financial forecasts.

Read-only reconciliation of the existing owned-channel queue confirmed prior
ECO/BPJ publications and pending ECO creatives. No creative was resubmitted or
rescheduled. Platform receipts and returned performance rows remain in the
private checkpoint; empty rows are unavailable evidence, not zero performance.

## Allocation

| Existing path | Next operating priority | Evidence before expansion |
|---|---|---|
| ECO affiliate referrals | Preserve sourced DE buying decisions and the existing owned-channel pilot | Qualified arrivals and merchant exits, then attributed items/commission after returns; clicks are not sales |
| BPJ vendor sponsorship | Restore existing receipt health and retain the originating category into checkout | Voluntary orders, verified payment and placement delivery; views/submissions are not verified buyers |
| BPJ/AGI/TDS cloud membership | Preserve existing prices, entitlements and free local work | Own completed tasks, repeat-use need and accepted paid delivery before new paid features |
| Other fleet probes | Maintain working utilities; improve a relevant existing entry when task evidence supports it | Reachable segment and concrete repeat/paid requirement; no bulk landing-page or tool expansion |

The existing private fleet reporting collector ran once with its probe UA and
one-hour cache, reading each configured aggregate URL at most once. Counts,
snapshots and account/reporting failures remain outside this public repository.
Official Google reporting was inaccessible here; missing data is unknown, not
zero users. Historical owner-reported Amazon amounts retain their original
window and cannot establish current commission or payout.

## Existing checkout recovery

Read-only production checks showed four independent memberships not ready and
BPJ sponsorship not selling. The scheduled watcher had not maintained the
unchanged four-hour health window. The existing `bpj-ad-watch.yml` manual
`fleet-receipts-only` mode on main succeeded:

https://github.com/f-tiger/agi-site/actions/runs/43250491880

Read-only checks at 2026-11-12 15:46 UTC then confirmed BPJ/AGI/ECO/TDS member
`ready:true` and BPJ sponsorship `selling:true` in live wallet mode. Card checkout
was unavailable. This is time-bounded readiness, not a customer payment or a
guarantee that future schedules run on time. Recheck current state before selling.

No order, transfer, key, wallet, health expiry, retention rule, inference or cron
schedule was created or changed. Existing paid receipts alone can establish
fulfilment; never replace successful chain checks with a health timestamp write.

## BPJ product repair

House-placement links on tool/category pages previously discarded the category,
although checkout already supported `cat`. A vendor reading Video or Coding
could therefore reach the advertising form with a different default selected.
The localized canonical entry is now `/advertise?cat=...#adForm`. Only the fixed
category and normalized QA flag are carried; unrelated queries and contacts are
excluded. Navigation creates no order. Saved orders retain their own input;
unknown category values cannot become new form options.

The entry now calls its count referred page-view events, rather than "human
views". Tool-page counts and the category-page fallback remain distinct; the
snapshot date and identity limitations are stated. Category placements remain
separate from free inclusion, ranking and editorial judgments. Inventory is
not a promise of open checkout, future impressions, clicks or sales.

Existing `/ad/house/...` measurement is reused. QA propagates across the handoff
and emits no house-placement action. No new analytics identifier, event name,
form-input tracking, paid right or receipt rule is introduced.

## Review and next decision

First self-review challenged the premise: restore a closed sales path before
reading zero orders as rejected demand; do not treat bots, MCP requests or
directory submissions as buyers. Second self-review checked both languages,
tool/category origins, correct preselection, QA preservation, unrelated-query
exclusion and no order creation. These are self-reviews, not independent market
validation.

Keep the existing vendor-inquiry deadline of 2026-11-15 and current ECO/BPJ
campaign cadences and receipts. This repair does not reset those experiments,
repost assets or add recurring work. For the repaired handoff only, review the
first 14 complete UTC days after release. Use house-entry actions, ad-decision
signals and real order/payment/delivery records separately; they are not a
linked person-level funnel. Twenty category-entry actions without a voluntary
order can trigger an offer/payment-fit review. Fewer actions means acquisition
is inconclusive. This operating gate does not authorize automatic price cuts,
paid acquisition or feature expansion.

Acceptance uses existing receipt regression checks, BPJ build/rendered-output
checks, EN/ZH browser navigation with intercepted requests, final GA4 coverage
and the standard deployment/live gates. No new public route, tracking property,
or schema claim is added. Existing changed-page IndexNow release checks and
scheduled indexing work remain in place; no duplicate manual batch is added.
Successful release is not backend GA4 receipt, indexing or new revenue.

## Release validation

The first marked release passed the product, real-browser, account and final
analytics gates: https://github.com/f-tiger/agi-site/actions/runs/43257645915.
Its current-main guard stopped deployment after parallel ECO test and fleet
heartbeat updates arrived. No stale build was published. The follow-up release
uses updated main with the same guard and read-only product-release isolation.
Local offline-file assertions used localhost because the managed browser blocks
file URLs; the unmodified offline-file test also passed in GitHub CI.
