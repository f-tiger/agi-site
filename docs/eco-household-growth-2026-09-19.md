# Eco household growth experiment — 2026-09-19

## Optimized brief and decision

Grow qualified organic visits and attributable affiliate clicks to Eco, with existing authorization to deploy. Compare AGI/BPJ/Eco/TDS without equating edge requests, filtered pageviews and people. Use prompt-optimizer, market-research and frontend-design guidance; no paid outreach, fabricated search volumes or product tests.

The new deliverable is a household decision workspace with three functioning tools, one downloadable measurement sheet and entry links from nine existing pages. Keep the existing humidity guide as the subject hub rather than duplicate yesterday's article. Formula-driven examples can be verified without new product price feeds. The tools answer different decisions: cost per equally dry laundry load, annualizing an observed measurement, and payback of replacing an already-owned device. No assumed winner and no forced purchase when replacement does not repay itself.

## Evidence and limits

Read-only Cloudflare diagnostic captured 2026-09-18, 28 complete dates 2026-08-21 through 2026-09-17:

| Cloudflare zone | Edge pageViews | Interpretation |
|---|---:|---|
| agiscorecard.com | 94,070 | Includes subdomains and automated traffic |
| baipiaoji.com | 70,555 | Includes automated traffic |
| getecoback.com | 17,555 | Includes automated traffic |
| thedollscout.com | 6,364 | Includes automated traffic and transition period |

This supports the zone-volume ordering AGI > BPJ > Eco > TDS, not a ranking of verified users or profitability. TDS changed subject on August 30, so this window includes two different site propositions. It cannot settle the new proposition's viability.

The same snapshot's public endpoints gave AGI 33,377 filtered server pageviews, Eco 514 human/legacy-class pageviews, TDS 246 JavaScript pageviews, and BPJ 331 referred JavaScript views. They are different instruments: do not put them in a single user leaderboard. Raw snapshot remains in prior diagnostic records. New deployment reads fresh aggregate endpoints into its job logs, with their original definitions.

Root repository ledger records user-supplied PartnerNet screenshots: €11.20 commission and 112 clicks for the rolling 30 days through September 14; September 1–14 €1.61, 56 clicks and two ordered items. This is account-level German affiliate evidence, not item-level proof that a new category sells, and not a fresh balance. D1 clicks and PartnerNet clicks are not interchangeable. Revenue is not profit or settled cash.

Eco's September 17 historical notes report 18 of 214 indexable pages receiving search/AI traffic and 513 filtered views over 28 days. This is a concentration warning, not a reason to generate hundreds of overlapping pages. Their claim that all secondary search engines use one index is not adopted: it is too broad. Their Googlebot UA records also do not independently authenticate Google's IPs or prove rankings.

Public primary sources read September 19:
- https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/beim-kauf-eines-waeschetrockners-an-den-stromverbrauch-denken-37984 — label kWh per 100 drying cycles; comparison must use comparable usage.
- https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426 — distinguish humidity and ventilation from electricity cost.

No usable specific Reddit thread was retrieved. No Reddit demand claim, keyword volume or competitor growth rate is inferred from unrelated search results. Hypothesis: practical, reproducible decision tools improve utility and create additional search landing opportunities. Existing consumer calculators demonstrate the format exists; they do not prove Eco will rank.

## Shipped scope

- `/wohnkosten-werkstatt.html`: guided decision hub, first-time instructions and existing humidity articles.
- `/waeschetrockner-oder-luftentfeuchter.html`: per-load and annual direct electricity comparison, matched dryness and laundry quantity required.
- `/strommess-protokoll.html`: observed kWh/time annualization, appliance-specific measurement instructions and blank CSV.
- `/geraete-austausch-rechner.html`: keep-versus-buy total cost and simple payback; explicit no-payback outcome.
- Nine contextual entry blocks, including homepage and tools directory. No unrelated cross-site link network.
- Sitemap and site search use existing builders; RSS and llms index include the new pages. llms.txt is documentation, not a promised ranking signal.
- Existing DE and US affiliate tags with explicit market choice, visible disclosures, category search links with no invented ASINs or live prices. No new storefront contracts.
- Existing first-party tracker counts intentional calculation events with a fixed tool source and no numeric inputs. Default examples do not count as usage.

## Commercial target and decision gates

€110 per rolling 30 days is the first commercial target, not a forecast. At the historical account ratio €11.20/112 clicks = €0.10 per Amazon-recorded click, that would require approximately 1,100 comparable clicks. The ratio is small-sample, seasonal and account-wide; it must not be used to predict individual page revenue. €1,100 would require about 11,000 such clicks under the same unproven ratio and is not a credible immediate delivery claim.

Operational target: double Eco's same-instrument filtered pageviews from the September 18 snapshot of 514/28d to at least 1,028/28d within 56 days. Verify instrumentation changes before comparison. Separately seek at least 50 filtered visits to this four-page cohort, 10 intentional calculation events and 5 non-CI affiliate clicks within its first 28 days. These are predeclared operating gates, not statistical significance thresholds.

If the cohort has fewer than 50 visits, diagnose distribution/indexing before judging willingness to buy. At sufficient visits with no tool use, simplify entry and instructions; with tool use but no clicks, assess intent and recommendations before expanding products. Add further tools only after this cohort provides observable search arrivals or repeated use. PartnerNet revenue remains the authority for earned commission. No background monitor was created by this release.

## Verification

Pure calculation checks cover all published arithmetic, zero/negative electricity savings, zero-price no-payback, and invalid/zero-duration measurements. Local metadata, schema, one-H1 and ad-label checks cover the new pages. Full site build gates, deployment, live canonical/sitemap/asset checks and aggregate reads run in the existing Eco workflow. Record actual workflow outcome below after completion; a source commit alone is not proof of publication.

## First production verification

Commit `32ef29713f82301ccd968cf96f5ed9f1838db89b`, workflow https://github.com/f-tiger/agi-site/actions/runs/35416790865 completed all build gates and live checks. IndexNow returned HTTP 200 for 48 changed canonical URLs (including existing pages touched by the build), not evidence of indexing.

Fresh 2026-09-19 02:50 UTC aggregates: AGI 34,602 filtered pageviews / 22 AI referrers; BPJ 334 referred JavaScript views; Eco 509 filtered pageviews / 20 AI referrals; TDS 255 JavaScript pageviews / 0 AI referrals. Definitions differ. Eco trend endpoint: page_view n7=112 / p7=118 and affiliate_click n7=18 / p7=10. The endpoint includes today, so these date-based bins are not necessarily equally complete. No causal growth or conversion-rate improvement is claimed.

The first browser inspection contributed two possible hub pageviews already present in that aggregate. They are QA, not acquisition. A follow-up adds an explicit `__probe=1` exclusion to tracking on the four new pages and excludes probe calculations before interactive QA. Commercial evaluation must exclude this initial self-test activity. Subsequent production verification should record the final follow-up workflow below.

For cohort review use `docs/eco-household-queries.sql`: 28 complete UTC dates September 20–October 17, strict human-class filter, launch day excluded. This cohort gate uses a stricter filter than the legacy site-wide pulse and must remain separate. The query is read-only and is not scheduled or automatically executed.

## Adversarial browser finding

The legacy automatic US switch matched “Hygrostat” before “Luftentfeuchter” and rewrote the new dehumidifier link to an indoor hygrometer while leaving its Amazon.de label unchanged. Browser verification caught this real mismatch. The four new pages now present explicit German and US category links and exclude the legacy auto-switch after chrome injection; existing unrelated pages are unchanged. The live gate asserts the intended category/tag pair and absence of the auto-switch. This is a fix to the new cohort, not a claim that the entire legacy rule list is repaired.

Browser interactions verified equal-cost drying inputs, longer dehumidifier running time, and the no-payback replacement branch. QA used the explicit probe parameter. These interactions are not users or affiliate conversions.

Readout caution: TDS also has a substantially smaller current sitemap (39 URLs versus Eco 224 in the preceding discovery audit) and changed positioning on August 30. Low total traffic does not establish weak per-page economics or invalidate its new topic. This release prioritizes Eco because it has historical affiliate earnings, not because other sites have been proven unviable.

## Final browser/cache verification

The marketplace follow-up workflow https://github.com/f-tiger/agi-site/actions/runs/35417145979 completed successfully; all four live pages passed and IndexNow returned HTTP 200. Browser inspection verified each German/US button's actual category and affiliate tag without clicking affiliate links. The measured-use calculator returned 219 kWh / €76.65 for the published example; the replacement tool correctly returned no payback for a higher-consumption replacement.

Returning-browser QA also exposed cached CSS retaining the earlier navigation color. The build now derives version parameters from content hashes for CSS, calculator JavaScript and its calculation dependency. The injection/versioning pass was verified byte-stable. Follow-up deployment: https://github.com/f-tiger/agi-site/actions/runs/35417297979 . No mobile browser viewport was available in this browser surface; responsive CSS is included but no mobile visual-test claim is made.
