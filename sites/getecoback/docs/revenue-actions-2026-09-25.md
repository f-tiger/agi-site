# ECO revenue actions — 25 September 2026

## Decision and evidence

The objective is additional settled revenue with a positive contribution, not more pages, clicks or displayed prices. Existing fleet/site research remains dated historical evidence; it is not a current payment report. The production member endpoint reported `ready:false` and `/api/pulse` returned HTTP 500 during this audit. No current traffic or revenue figure is inferred from those failures.

Current alternatives were checked on [CHECK24](https://www.check24.de/strom-gas/energievergleich/) and [co2online](https://www.co2online.de/service/energiesparchecks/): consumers already have free tariff comparison and energy tools. There is insufficient evidence to charge households for the new tariff calculator or to expand its paid features. Existing membership is an optional cloud workspace, not the tariff tool itself; its readiness is not a sale.

The existing expansion queue had independently selected Solarbank fault diagnosis based on the site's Growatt troubleshooting experience and a dated SERP review. A fresh search found model-specific manufacturer support, long forum threads and product reviews. This is a competitive topic, not an empty market. Our narrow contribution is a symptom table, model boundaries, a support checklist, and a repair-before-replacement purchase sequence. Forum claims are not used as technical instructions.

## Released changes

- `/guide/balkonspeicher-anker-solarbank-probleme.html`: an authored German guide, linked from three relevant storage guides and discovered by the existing category, homepage, sitemap, feed and search builders. The previously unpublished queue slug gained the storage prefix to preserve correct category classification. Full ECO navigation, footer, colours and mobile layout are reused.
- Two labelled Amazon.de choices after diagnosis: a meter for suitable household loads, or replacement models after support/repair review. No invented ASIN, live price, compatibility claim or automated purchase. The article explicitly rejects using an ordinary consumption meter as an unverified grid-injection accessory and includes a free meter-loan alternative.
- After a deliberate **own-input** tariff calculation, the five language editions offer relevant next tasks. German visitors can continue to the household savings guide or replacement calculator. The other editions use their existing localized equipment calculator. Sample calculations do not reveal this block; edits hide stale next steps. No household numbers are carried in links or events.
- One `outbound_choice` records a selected task category with `source:energy-next`; the new guide records one `affiliate_click` per explicit product-link click with `source:solarbank-diagnosis`. QA is suppressed with `__probe=1`. Counts are events, not identified users, orders or revenue.
- Membership diagnostics expose only fixed stage/reason codes after existing operator authentication. No SQL, customer information, wallet or credential is logged. Failed order checks still fail closed; no payment verification is bypassed.
- Missing membership counters are `null`, including totals; actual observed zero remains zero. Independent published-page checks run even if membership verification fails, while the membership failure still makes deployment verification red.

## Manufacturer and consumer sources

- [Anker: Solarbank 2 Pro/Plus update failures](https://service.ankersolix.com/de/article-description/Was-kann-ich-tun-wenn-das-Upgrade-meiner-Solarbank-2-E1600-Pro-Plus-fehlschl%C3%A4gt), read 25 September 2026. The article paraphrases the model-specific low-battery/network/cold-start distinctions and directs physical procedures to the original instructions.
- [Anker: Solarbank 3 E2700 Pro](https://www.ankersolix.com/de/products/a17c5?o_c=de&s_main=A17C53Z1-20&s_panel=BUNDLE-A5553411-4&varId=57491925696861), read 25 September 2026; supports checking model and compatible components separately, not transferring claims across generations.
- [Verbraucherzentrale NRW: free meter lending](https://www.verbraucherzentrale.nrw/strommessgeraete), read 25 September 2026.

Some Anker support links currently fail to render or return 404. Unverified error-code/reset procedures were omitted. Amazon rejected the research browser session, so EX105's disputed ASIN remains a search link.

## Revenue options and next gates

| Path | Action now | Evidence needed before expansion |
|---|---|---|
| Amazon diagnosis → suitable equipment | Publish the narrow queue item above; preserve existing seasonal experiments | Search/AI arrivals and explicit product choices; PartnerNet shipped commissions establish money |
| Prime trial bounty | Existing date-gated campaign remains in place; not a new launch in this change | Actual PartnerNet bounty report, not clicks |
| Energy-switch referrals | [CHECK24's official programme](https://www.check24.de/partner/partnerprogramm/) and [Verivox's programme](https://www.verivox.de/partnerprogramm/) match the tariff-comparison task | Owner's earlier Amazon-only restriction must be explicitly changed, programme approval, actual tracking link and current contract terms; no invented commission rate or application submitted |
| Paid consumer workspace | Restore reliable purchase readiness and measure genuine own-task recurrence | Verified willingness to pay and a suitable payment experience; free alternatives are strong |
| B2B tool/service or sponsorship | Keep as an unvalidated option, do not add an unrelated sales funnel to household pages | Named buyer, exact deliverable, channel and positive delivery economics |
| Display ads or paid acquisition | No launch | Enough verified audience or measured order contribution to justify distraction/spend |

## Evaluation, not a revenue forecast

Review 28 days after publication, on **23 October 2026**. Keep the existing `eco-storage-spring-0415` cluster experiment as the parent in the queue; no previous experiment's threshold is rewritten.

For the new guide, first require evidence of crawling and at least 20 eligible page-view events. Below that, label acquisition **insufficient**, not a failed conversion test. With that exposure, at least three explicit affiliate choices justify testing the next comparable diagnosis topic; zero choices trigger a review of user intent and the offer. These are provisional operating thresholds, not statistically validated lift claims. A click is not a purchase.

For tariff next steps, compare `outbound_choice{source:energy-next}` to deliberate own-input `solution_calc` events on the five page paths; do not mix sample runs or QA. Report raw counts and the instrumentation dates. No conversion-rate claim if events are unavailable or the denominator is below 30. Keep user-entered values local.

Reconcile any actual increase using dated PartnerNet shipped-item commissions, returns and bounty reports. The current revenue baseline is **unknown until a fresh report is supplied**. No growth percentage, new revenue or profit is claimed by this release.

No new schedule, paid service, external outreach or account signup is introduced. Existing daily build and monitoring jobs are reused.
