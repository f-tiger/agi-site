# BPJ / ECO result sharing — 2026-10-01

## Decision and prompt refinement

1. Objective: convert existing useful browser tools into discoverable, shareable demonstrations; do not assume a GitHub project causes growth.
2. Scope: BPJ work-plan (ZH/EN), ECO tariff workbench (five languages), one result-card interaction each. Reuse current code and Metricool; no new hosted services or paid infrastructure.
3. Acceptance: local PNG export, readable mobile layout, invalidation after input edits, working recipient path, privacy-safe events, real-motion English demo variants. Growth is an experiment, not a promised outcome.

Adversarial pass 1 (self-review): existing ECO country calculators already export cards, so extend only the workbench's actual gap. A card can reveal work/bill details: BPJ exports aggregate verdicts only; ECO explicitly previews annual totals and input type, excluding consumption/rates/files. Links explicitly carry settings; no raw settings are added to analytics.

Adversarial pass 2 (self-review): a sender's `own` flag previously survived the tariff link. Receiving it now resets to illustrative input, requires confirmation and explains whose inputs these are. BPJ explains that linked volumes need editing and results use current allowance data. Removed stale BPJ results after the last task is deleted. Neither a download nor a tagged visit proves a referral, person, bill, saving or sale.

## Measurement and commercial path

- ECO `/api/distribution-growth`: existing 14 completed UTC days, `tariff_card_preview` / `tariff_card_download` added; existing `tariff_share_visit` / `tariff_share_calc` preserved. Own/example, placement and coarse referrer evidence remain separate. No new DB table, cron or raw-value collection.
- BPJ existing calc events: `/plan-card/preview`, `/plan-card/download`, `/plan-share/<role>`, `/plan-link/<role>/<count>`. Explicit first calculation after a tagged received link emits `/plan-share-calc/edited` or `/unchanged`; “edited” means changed settings, not verified personal use. Reloads can repeat events; they are not unique people.
- BPJ free calculation/export → existing cloud workspace membership, 9 USDT / 30 days; no new paywall or checkout activation.
- ECO own-input comparison → existing relevant next steps. Outbound/affiliate clicks are not commissions. No guaranteed savings or market tariff claims.
- Initial operating target: per site 50 attributable external sessions and 10 actual task completions. Current event counters alone cannot verify unique sessions; reconcile with available platform/site evidence before claiming this target. No new conversion rate or revenue reported here.
- Preserve `eco-fixed-02`'s existing review gates. Two opening variants are creative alternatives, not a randomized A/B test. Release one selected version per site first; reserve the alternative until there is enough comparable evidence, not four near-duplicate posts in one burst.

## Verification

BPJ: 2,351-page HTML gates, canonical targets, work-plan arithmetic/roundtrip/dist, studio and agent-watch gates passed locally. ECO: tariff model and distribution collector/SQL tests passed (10 tests). Browser: 34 assertions, all five ECO languages and both BPJ languages, PNG downloads, mobile width, stale-result invalidation and recipient reset. Browser QA uses local fixtures and emits no production events.

Deployment status and video publication receipts must be recorded after confirmation. These checks are not traffic results.
