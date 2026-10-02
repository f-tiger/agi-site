# Fleet business measurement — 2026-10-02

## Scope and decisions

The October 1 GA4 coverage repair is already live. This change addresses the remaining business-action gap; it does not treat the earlier reporting interruption as a new outage. No historical data is backfilled or reconstructed.

Three planning passes: (1) measure completed useful work separately from visits, (2) keep inputs private and distinguish examples, partial failures and merchant reports, (3) require local functional checks, deployed asset verification and explicit remaining measurement limits. Two adversarial self-checks challenge the stale-outage premise and then consent, partial-failure and revenue-attribution mistakes. These are self-checks, not independent reviews.

The existing tools serve people comparing AI workflows (AGI), producing client deliverables (BPJ), comparing household costs (ECO), and checking documents (TDS). Free results and exports remain usable. This change adds no paid offer and makes no claim about checkout readiness or revenue. BPJ's product-image workflow is the focused outcome experiment; measure its add → start → complete/partial → download actions before broadening promotion. No social posts, emails, spending or new schedules are part of this release.

## Measurement contract

| Surface | Recorded action | Interpretation |
| --- | --- | --- |
| 20 form workbenches across four properties | `tool_start`, `tool_complete`, `tool_export` | Customized inputs submitted, result successfully rendered, result export requested |
| Unchanged workbench defaults | `tool_example_start`, `tool_example_complete`, `tool_example_export` | Fictional example use, excluded from genuine-task proxy totals |
| TDS document tools | `tool_complete`, applicable `tool_start` / `tool_export` | Existing fixed local action; no files, names, hashes, inputs or results in event parameters |
| TDS samples | `tool_example_run` | Example interaction, not proof of a real completed task |
| BPJ PDF/image studio, existing first-party channel | `start`, `complete`, `partial`, `download` with `demo` / `own` suffix | A partially failed image batch cannot emit full completion; counts are separate from GA4 |

GA4 actions require opt-in, production hostname and absence of QA/privacy exclusions. Only a fixed action and a whitelisted public route-derived `tool_id` pass through the bridge. Shared workbench tags run in an empty consent-created frame. Pre-consent actions are not replayed; withdrawal discards pending actions. Each normalized action is sent at most once per page load. Existing TDS document pages retain their dedicated consent loader.

“Customized” means the form differs from its default values. It is not proof of a real customer, purchase, or valid commercial intent. Export means a download was requested, not that a file was saved. A successful file verification operation can find a mismatch; completion does not mean a matching fingerprint. Some tools have completion/export only, so funnel coverage is not uniform.

No Google Admin key-event settings have been changed. The available connector exposes no supported GA4 write actions. Once observed in the intended properties, `tool_export` is the proposed primary task-outcome proxy and `tool_complete` a secondary measure. Never add their counts together as unique conversions; exclude every `tool_example_*` event. Never fabricate `purchase`, value or currency. Anonymous first-party counters and consented GA4 event/user metrics have different populations.

## ECO reconciliation

Use the existing offline utility with private exports outside this public repository:

```sh
python3 sites/getecoback/tools/affiliate_growth.py \
  --report /private/merchant-normalized.json \
  --site-report /private/site-normalized.json
```

Both normalized reports need matching `period_start`, `period_end` (inclusive ISO dates), `market`, `currency`, `store_id`, `tracking_id`, `timezone` (IANA), `site_host`, and their own `source`. Merchant fields are `merchant_clicks`, `ordered_items`, `shipped_items`, `net_commission`; the site field is `affiliate_click_events`. Only a merchant report explicitly scoped `tracking_scope: "exclusive_site"`, with all comparison fields aligned, can populate `site_net_commission`. This relies on verified report provenance; it cannot establish exclusivity on its own.

Shared tags, missing fields and mismatched dates/currencies/timezones produce `not_comparable` and null site revenue. Missing commission remains unknown; a reported zero or negative commission stays intact. Merchant EPC uses merchant clicks only. Ordered items are not orders. No allocation to a page or marketing channel is inferred; `channel_revenue` remains null. The existing scenario model is illustrative, not evidence or a forecast. Retired storage/solar categories remain retired.

The latest merchant report is still required to establish actual commission. No report, tag exclusivity or revenue has been invented for this release.

## Validation and deployment

- 54 TDS tests; 93 localized pages rebuilt and verified for canonical URLs, hreflang, links, runtime assets and brand contracts.
- Workbench engine tests and all 51 localized browser flows plus 4 embeds; real local exports; customized-input and failed-input event boundaries.
- Four consent-frame browser fixtures: no requests before consent, fixed post-consent actions, deduplication, private-marker rejection, withdrawal, QA exclusions and mobile width. All network collection requests intercepted; no test events sent to production GA4.
- BPJ local file tests plus a browser fault-injection check: one failed image yields `partial`, no `complete`, and preserves the successful download.
- ECO missing/zero/negative revenue and report-scope tests; coverage/policy gates installed in all four deploy workflows.

Production checks compare published asset bytes and versions. They do not prove Google backend ingestion. GA4 processing delay and consent gaps remain; merchant revenue requires the independent report. Existing canonical structures and discoverability are preserved; no artificial sitemap dates or extra IndexNow campaigns are added.
