# TDS: turn discovery into a saved collection task

2026-10-11. The current collectible-toy focus remains in place. This release repairs a broken publishing mechanism and the gap between a named series checklist and a persistent collection. It does not establish traffic, retention or revenue growth.

## Observed problem and resulting behavior

The daily workflow discovered valid series but failed before publication: generated files outside the bot's narrow commit allowlist left the worktree dirty, so `git pull --rebase` failed. The [October 10 run](https://github.com/f-tiger/agi-site/actions/runs/38056883395) contains the exact failure. The fix preserves those build outputs during the scoped rebase and refuses unrelated staged files, unresolved conflicts or a stale build after main advances. It retains existing schedules, source limits and deployment guards.

Series checkboxes previously reset on navigation. EN/DE/ZH now share the existing local collection tracker and stable source-name identities. Legacy v1 backups and manual entries remain readable. Unchecking moves the owned entries to the wishlist with quantities preserved; checking again restores them. JSON backup and CSV export remain in the tracker. Local storage is not cloud synchronization and the cross-tab conflict check is optimistic, not a transactional database.

The official-source check on October 11 succeeded for SMISKI and Sonny Angel and added SMISKI Living and Bath within the existing two-series daily cap. There are now eight source-backed series, each with EN/DE/ZH pages. Product release dates, stock, prices and probabilities are not inferred from those names or from the check date.

## Search and commercial path

- Home and navigation lead to the concrete series checklist task, then the same collection tracker.
- Series titles identify SMISKI/Sonny Angel and the checklist task. Canonicals, language alternatives, text mirrors and sitemaps are generated together.
- Existing rarity search pages lead to the budget comparison, saved collection and series directory.
- Display planning and series pages link to the existing display-accessory guide, with an explicit affiliate disclosure and a reuse-before-buying suggestion. US/DE Amazon tags and merchant destinations are unchanged; there is no new subscription or payment flow.
- README and product context now describe the current collecting product. Digital tools remain at their established URLs.

The [public competitive analysis](tds-competitive-research-2026-10-11.md) compares actual mechanisms and distinguishes third-party all-site traffic estimates from registered users, returning users and revenue. Connected-account exports and the owner's detailed growth report remain outside this public repository.

## Measurement and privacy

Successful series ownership changes emit a fixed `collector_series_save`, mapped to GA4 `collector_checklist_save`. Tracker saves/imports/exports retain separate fixed actions; standalone display completion remains mapped. No names, item identities, quantities or input values enter these events. Actions are not independent users or transactions.

Legacy first-party page/click and tracker counters now exclude preview/local hosts, probes, automation, DNT/GPC and stored opt-outs. Referrers are reduced before transmission. A failed save does not count as completion. Final fleet GA4 installation follows every generator and preserves the existing public/private exclusions.

## Verification

- Core calculations, legacy-backup compatibility, repeated uncheck/restore, stale snapshots, malformed storage, quota failure and measurement allowlists passed.
- Persistence tests reproduce the dirty generated-file failure, preserve scoped changes, and reject stale/conflicted deployment states.
- Pinned document-tool tests and workflow starter checks passed; existing workbench, account and membership isolation checks passed.
- Generated collector verification passed for 87 localized pages; document verification passed for 93 pages; structured-data visibility gate passed for 191 FAQ/DefinedTerm entries.
- Final build GA4 coverage: 235 HTML records, 230 public measured pages and five explicit private/internal/error exclusions.
- Chromium source and final-build tests passed for language switching, reloads, tracker quantity editing, two-tab synchronization, backup/restore and storage failures. Five mobile route types had no horizontal overflow. Final QA produced no Google, D1/API or other external requests and no JavaScript errors.
- Independent review caught and corrected stale script-version mixing and a standalone display-calculator event regression before release.

## Growth decision rules

For the next 28 complete days, seek 100 qualified collection-page sessions, 20 successful checklist saves and five exports. These are chosen operational gates, not forecasts. Insufficient distribution does not prove absent demand. If qualified traffic reaches the gate but saves remain below 10%, inspect task fit and usability before adding more tools. Track language, landing page and production hostname; do not splice historic test traffic into a clean baseline.

Expand verified series and helpful comparisons for one or two brands before adding unrelated categories. Prepare demonstrations and useful checklists for relevant discovery channels; no external posts or messages were sent in this release. A paid recurring service requires reliable ongoing value, at least five independently confirmed repeat users with the same need, and three unrelated real paid pilots before expansion. Affiliate revenue requires merchant commission and refund reporting, not a multiplication of anonymous page events.

Deployment and IndexNow receipts are recorded after production verification. Receipt does not establish indexing, ranking, AI citations or revenue.
