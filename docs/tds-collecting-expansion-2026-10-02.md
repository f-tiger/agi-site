# TDS collecting expansion — 2026-10-02

Owner request: expand the whole site along the multi-brand collectible direction and improve usefulness to AI search. This release grows the collecting spine from 18 to 60 localized pages (42 new), with eight brands, three navigation hubs, four practical guides, two working planning tools and an editorial-method page. Existing digital tools remain available separately and BPJ remains their aggregation entry.

## Three refinement rounds

1. Convert the broad growth goal into collector jobs: choose a brand/format, verify a seller, set a hard spending cap, estimate repeated draws, plan display space and record a collection. Readers can reach each job from the homepage, navigation or brand pages.
2. Bound claims using official evidence. Add SMISKI Living, HIRONO Mime, DIMOO Animal Kingdom and MOLLY Series4 as specific source references. Unknown odds remain blank; MOLLY's tiered release uses exact per-style input only. No fabricated trend ranking, current price, inventory, authenticity or return claims.
3. Make content and computation accessible together: server-rendered original guidance, mathematical examples, EN/DE/ZH links, canonical/hreflang/sitemap, synchronized text/JSON, ten callable MCP tools and four resources. Page publication and registration remain distinct from indexing or citation.

## Evidence and choices

- Google Search Central: https://developers.google.com/search/docs/appearance/ai-features — ordinary search eligibility and people-first content remain fundamental; special AI markup is not required. Prioritize visible answers, source transparency, internal links and usable tools. Optional catalogs serve compatible assistants and are not represented as a Google ranking mechanism.
- https://smiski.com/e/products/living/ — six named regular poses; a secret may be absent from an assort box. No numerical secret probability established.
- https://www.popmart.com/us/products/365/hirono-mime-series-figures — figure release and stated non-repeating whole-set format; independent loose-box math must not model that assortment.
- https://www.popmart.com/us/products/1019/dimoo-animal-kingdom-series-figures — specific figure identity; no numerical odds inferred.
- https://www.popmart.com/us/products/3152/mega-space-molly-100percent-series4 — Basic/Regular/Special/Secret labels; labels do not justify equal likelihood.
- Existing official Sonny Angel regional directory and Jellycat source remain linked. Guidelines are original decision aids, not claims of hands-on product testing.

GA4 via connected Windsor account 547130808, 2026-09-01–2026-09-30: production-domain sessions = 67: Direct 55, Organic Search 10, AI Assistant 1, Unassigned 1. Recorded key events and total revenue were zero for these rows. Excluded 12 pages.dev and one localhost session. Historical recording gaps, consent and possible historical QA contamination make this a limited measurement baseline, not a complete count of human visits or actual business income. Page views on the main hostname included /where-to-buy 68 and /display-calculator 18; these are views, not conversions. Only GA4 was exposed by Windsor; no new GSC performance data obtained this turn. Earlier GSC inspection notes are not refreshed by this release.

## Product and design

Eight brands: Labubu, SKULLPANDA, Jellycat, Sonny Angel, SMISKI, HIRONO, DIMOO, MOLLY. All eight have inline display fit, seven have inline odds. The main website remains English by default; DE/ZH use explicit switches. Historical collection tracker and ledger language limits stay labeled.

New routes, each EN/DE/ZH:

- /brands, /collector-tools, /collecting
- /collecting/budget, /collecting/duplicates
- /collecting/blind-box-rules, /collecting/check-retailers, /collecting/display-checklist, /collecting/start-a-collection
- /editorial

Visual plan: white #ffffff, black #111114 and red #e4002b retain site identity; lemon #fff2af connects planning actions and lavender #f3e7ff accompanies generic collection art. Existing Helvetica-led type remains. Color belongs to collection imagery; field guides use a left-aligned reading column, and calculator results use the established outlined paper treatment. Generic repeated feature cards were avoided in the editorial section in favor of readable article rows. No new autoplay, third-party video request before a click or inaccessible motion.

## Calculation and access contract

`planning-core.mjs` supplies browser and MCP calculations. Budget: whole affordable boxes after fixed costs, success/failure probability, maximum spend and expected spend when stopping at first target or the cap. Uses one currency rounded to cents, max 100,000 boxes; cannot infer taxes, extra shipping orders, seller reliability or resale proceeds. Expected spend does not guarantee the target.

Collection progress: equal regular probabilities after combined secret rate, with owned distinct styles in that exact series. Computes expected new regular styles, repeated regular draws, separate secret draws and chance of any new regular. Does not compute complete-set probability or a case assortment. Empty/invalid inputs clear prior results.

MCP 2.4.0 adds `compare_blind_box_budget` and `estimate_collection_progress`; existing guide discovery gains all eight brands, and `learning-guides.json` is a fourth public resource. Ten total tools; private files, collection storage and accounts remain inaccessible. Registry check uses the documented exact-name latest endpoint and bounded retries, never equating a timeout to absence/success. Publication still uses existing GitHub OIDC after live MCP verification.

## Two self-review passes

1. Evidence/product: rejected universal secret odds and equal-tier assumptions; kept new price/probability fields blank. Added original task guidance, source boundaries and an honest publisher/correction route. Worked examples are labeled and do not count as user completions. No new paid offer, spend or external promotional messages.
2. Delivery/measurement: checked cross-field validity and zero/100% boundaries; compared math against explicit stopping outcomes and exhaustive small draw sequences. Confirmed all page types have navigation, original text, tools or distinct task value. Existing retired content remains 404/410 guarded; no old `/guides` routes revived. GA4 brand odds and fit events use separate event names so same-page deduplication does not swallow a different calculator's completion.

## Validation before publication

- 54 existing document/model/analytics tests pass. Initial sandbox child-process output failed; the unchanged suite passed under the normal process environment, including offline CLI verification. No gate was disabled.
- 26 collecting/core/MCP/analytics tests pass, including three new numerical-oracle tests and expanded MCP checks.
- 93 digital pages verified; 60 collecting pages verified in the final assembled release. Shared workbench and membership static verification pass.
- 191 FAQ/DefinedTerm entries match visible text. Canonical, reciprocal hreflang, sitemap uniqueness, local links, text mirrors and retired-content scan pass.
- Analytics coverage: 208 HTML records, 203 public measured pages, five explicit probe/private exclusions; correct TDS measurement ID, no duplicate loader. Consent remains required for GA4; no input values sent.
- Browser: 60 routes × 390px/1440px = 120 combinations. All brand tools, budget/progress sample oracles, invalid-result clearing and no-JS worked example checked. Zero page errors, local 404s, overflow or QA telemetry. Homepage and mobile budget screenshots visually reviewed.
- `git diff --check` passes.

## Commercial and measurement boundary

Audience: collectible-toy enthusiasts and gift buyers. Free value is a concrete purchase/space/collection decision. Existing disclosed US/DE affiliate paths remain the available revenue route; newly linked official sources are not monetized. No new paid checkout or subscription exists in this release.

Two path-bound first-party completion events: `collector_budget_calc`, `collector_progress_calc`. GA4 uses consented `tool_complete` with fixed public tool IDs; brand calculators use `collector_odds_complete` / `collector_display_complete`. Samples, automated QA, opt-outs and initial previews do not become planning completions. Events are not purchases, users or commissions.

Use the existing reporting cadence to compare complete post-release windows with the limited baseline. Assess search landing pages, consented AI referrals, real calculations, relevant outbound buying intent and merchant-confirmed commissions separately. No new scheduled job created. Scale by demonstrated recurring tasks; do not add thin near-duplicate pages just to increase URL counts.

Production deployment, IndexNow acceptance and exact registry readback are to be recorded in the release PR after execution. IndexNow acceptance is a notification, not proof of indexing. SafeSearch/manual-action/security status remains unverified.
