# Fleet commercial growth release — 2026-10-29

## Decision

Grow completed customer tasks and attributable paid delivery before adding inventory. Keep free tools useful, place a paid option at a relevant task boundary, and separate buyer intent from payments. This release does not change prices, payment rails, membership entitlements, affiliate tags, advertising stock, cron schedules or marketing permissions. No outbound messages or paid acquisition are part of it. Private traffic and revenue snapshots remain outside this public repository.

## Shipped conversion paths

- **BPJ video:** after a successful render/export of an own project, offer free local backup or the existing paid cloud workflow. Demo exports, failed renders and incomplete projects do not trigger it. Original media stays local; cloud upload still requires review and explicit Save in the member portal. Optional bounded reasons distinguish local backup sufficiency, payment mismatch and no current revision task. Dismissal lasts for the document. A reset hides the offer. No registration or checkout occurs automatically.
- **ECO:** the existing German seasonal purchase cards now pair each shop link with a room-fit guide and a concrete buying check. The Comfee card no longer asserts an unsupported comparative winner. Existing affiliate links and disclosure remain; model/variant, operating conditions, total price and returns must be checked at the merchant. No fabricated price, discount, stock or self-test claim is added. Manufacturer reference: https://www.feelcomfee.com/de/produkte/klimatisieren-heizen/mddf-20den7 .
- **TDS:** the display calculator exports the actual measurement checklist locally, in English or German. It labels default/example measurements, includes inside dimensions and clearances, and offers a next-step check for existing accessory searches. Editing input or changing units invalidates the previous plan. A zero-fit answer does not become a product recommendation. No dimensions are sent to analytics or a merchant.

## Fleet commercial allocation

The rows below are operating hypotheses, not evidence of paying demand. Existing offers stay available; a lower priority does not shut down a site or remove pages. Groups follow the current deployment registry (18 groups, 31 hostnames).

| Group | Buyer / task | Existing monetization to validate | Next evidence needed before expansion |
|---|---|---|---|
| ECO | Household with an appliance purchase decision | Disclosed merchant affiliate referral | Qualified product clicks, attributed shipped items and commission in the same period; separate search clicks and shared tags |
| BPJ | Creator revising a real project; separately, tool vendor seeking placement | Cloud project membership; separately, labelled sponsorship | Own export → relevant cloud intent → verified paid delivery; sponsor viewers and orders are a separate population |
| TDS | Collector organizing a display or collection | Existing accessory affiliate links; cloud workspace only where repeated use needs it | Own checklist export, repeat collection work and attributed accessory commission; MCP calls alone do not justify a paid tier |
| AGI | Analyst repeatedly revisiting evidence | Existing evidence/workbench membership | A completed own task, return to a saved project and paid delivery; slider events are not buyers |
| goldrush | Operator evaluating a business opportunity | Existing offer only where delivery is defined | Repeat completed own analysis and explicit purchase intent before more content/tools |
| gridlings | Person playing a game | Existing game offer/placement, if currently available | Repeat play and retention before introducing a new payment product |
| buysomething | Procurement user comparing suppliers | Existing sourcing workflow | Completed own requirement/comparison and a qualified buyer request |
| gamesledger | User evaluating games or maintaining a game record | Existing placement or utility offer | Return use and relevant outbound demand; raw views are insufficient |
| after35 | User preparing a career transition | Existing career tools/services | Own completed artifact and a qualified paid-help request |
| learn | Learner practicing a skill | Existing learning offer | Repeat practice/completion before a subscription expansion |
| fanzha | User checking a suspicious claim | Existing safety/checklist workflow | Completed useful check and repeat organizational need; never monetize fear or promise certainty |
| firstjob | Applicant preparing evidence for a first role | Existing job-evidence workflow | Own export and repeat revision before promoting cloud persistence |
| codeword | Developer completing a coding task | Existing coding tools | Own successful task/export and return use |
| powerbill | Household comparing electricity costs | Existing calculator and disclosed referrals | Own scenario completion and attributable commercial exit, not assumed savings |
| localebatch | Team checking localization files | Existing QA tool/workbench | Own file completion, repeated checks and explicit paid requirement |
| agent-delivery-lab | Team validating a concrete agent delivery | Existing delivery/evidence workflow | Qualified deployment scope and accepted deliverable before a larger paid pilot |
| venture-lab | Procurement, model-cost, SQL or filing user on the relevant subsite | Existing subsite-specific tools | Separate RFQ/modelmeter/querysprint/filinglens tasks; never sell aggregate group traffic as one buyer segment |
| web3-studio | Team auditing a protocol/payment/evidence task | Existing subsite-specific tools | Own task completion and verified paid service delivery; no promised investment returns |

## Acquisition and offer design

ECO's relevant existing guides and season cards form the acquisition route. Keep the path from measurement to a suitable model short, retain an option not to buy, and review product/referral attribution before adding merchants. BPJ's video hub, category and tool pages already contain entries; this release works at the actual result boundary rather than adding more paid banners to unrelated discovery pages. Its vendor offer remains a separately labelled sponsorship with its own inventory and reach evidence. TDS's series/checklist and calculator pages should lead to a completed collection or measurement artifact; do not push cloud storage to a visitor who has not saved any work.

For the remaining groups, the next authorized discovery action is improving existing relevant navigation or a concrete task example after identifying an incoming task. Do not mass-produce landing pages or start unsolicited outreach to compensate for missing evidence. No new campaign was sent in this release.

## Measurement and decision rules

These thresholds are reversible operating rules, not statistical significance or counts of unique people. Use complete comparable periods after release, retain actual coverage dates, exclude QA, and do not combine GA4, first-party and merchant counters.

1. **BPJ result offer:** review after 14 complete days or 20 visible own-export offers, whichever provides usable evidence. If there are fewer than 20 offers, the exposure gate is unmet; prioritize qualified editor use and successful exports. If at least 20 offers have no cloud intent, revise the value/position once, then reassess. Five payment-mismatch responses trigger a payment-rail feasibility review, not automatic onboarding, spending or price cuts. Orders without confirmation trigger a checkout/verification check, not revenue reporting.
2. **ECO purchase path:** compare the same 14 complete weekdays against the preceding 14 days. Keep product-detail and search-result clicks separate. Fewer clicks with steady product-detail clicks is not automatically a decline in purchase intent. Expansion requires same-period merchant attribution, shipped items and commission; gross commission is not net profit or cash received. Shared tags must be labelled.
3. **TDS measurement path:** review own plan exports separately from example downloads. After 20 own exports, inspect accessory exits and merchant attribution; if there is no further intent, improve the relevant buying choice once. If there are too few own exports, improve task discovery rather than infer no demand. Downloads and zero-fit results are not purchases.
4. **Other groups:** choose at most one offer experiment per group only after a genuine completed task and a repeat-use or qualified purchase signal. A two-week window with little distribution is inconclusive; pause additional feature/landing-page expansion, preserve the working utility, and fix relevant distribution first.
5. **Scale gate:** at least three independent genuine paid customers with verified delivery and known refunds/support effort before treating a membership/service as repeatable. This is a management gate, not a forecast. Affiliate scaling uses attributed commission after returns and costs. No paid acquisition is authorized by this document.

Existing reports collect the new bounded labels; this release adds no scheduler. BPJ `/api/reach` exposes `commercial_triggers` with per-family release dates. TDS `/api/collector-growth` exposes checklist event release metadata so its older overall window does not imply these new events existed throughout that window. There is no cross-user or cross-page funnel identity: event ratios describe events, not a measured customer conversion rate.

## Acceptance and rollback

First review: moved the offer to successful own renders; preserved free backup and explicit cloud upload; invalidated stale TDS plans; removed an unsupported comparative claim. Second review: bounded labels and no input telemetry, event start dates, language variants, error/QA exclusions, current price/limits and unchanged payment behavior.

Validation: real BPJ demo/own render and download test with all requests intercepted; mobile EN/DE real checklist downloads; calculator example/own/invalid/unit tests; server collector event filtering; shared GA4 exact routes; commercial aggregation filters; ECO generated-card link checks. Production verification is read-only and must confirm release assets/pages and the existing deployment gates. Browser tests do not prove GA4 backend receipt, real payment acceptance or commercial lift.

Rollback is scoped: remove the BPJ next-step installation, restore the previous ECO seasonal card block/generator, and remove TDS plan controls/export events. Preserve existing projects, membership APIs, affiliate tags and all user records.
