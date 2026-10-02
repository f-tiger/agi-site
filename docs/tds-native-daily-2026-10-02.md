# TDS native daily series expansion

Owner request: “tds网站每天自己自动化扩展，避免依赖你”.

## Three refinements

1. Keep TDS's collectible/toy positioning and make expansion run without an assistant session.
2. Use official, named series evidence; do not invent odds, release dates, stock, prices or demand. Useful tools and source provenance are required, not a page-count target.
3. Reuse the existing 07:20 UTC scheduled deployment. Bound discovery and publication, retain verified data on failure, run tests, commit generated artifacts, publish in the same run and verify the live result.

## Operating contract

- GitHub Actions `deploy-thedollscout.yml`, existing daily `20 7 * * *` (15:20 China), plus its existing manual trigger. GitHub schedule times can be delayed. No new cron, assistant automation, token, model, API bill or notification channel.
- `tds-traffic.yml` remains at 06:00 UTC. Metrics are context, not fabricated evidence for “trending” labels.
- `daily.mjs` reads the official robots policies and the SMISKI figure directory / Sonny Angel regular-series gallery. SMISKI checks six rotating detail pages per run. Names and titles only: no copied descriptions or brand images. Requests use an identifying bot agent, approved HTTPS hosts/paths, manual redirect rejection, bounded body size and timeout, and 1.2s source spacing. No bypass of blocked sources.
- At most two new series per UTC date, six existing content updates per run and 300 series overall. The daily budget is stored on each series's first publication date, so retries cannot add more. Minimum six distinct named styles. SMISKI's six-style statement is required; the Sonny Angel list is described as a source checklist, not proven equal-probability regular slots.
- Same-day successful runs do not fetch again unless explicitly retried. Already published entries are never deleted because a source disappears. Errors and ineligible details are visible in the run report. Partial/failed coverage retains verified content, then marks the workflow failed after the release steps, using existing GitHub failure-notification settings.
- `content/series-state.json` is the private build state, excluded from site assembly. Public `collector-assets/series-catalog.json` carries source URLs, titles, names, verified dates, language URLs and the latest coverage result, with no visitor information.
- New pages: `/series` and `/series/<id>` in EN/DE/ZH. Checklists are in-tab only, reset on navigation, and can be copied. The probability field starts empty and uses the same `styleProbability` implementation as the registered MCP tool. Counted names never imply `1/K` odds. Budget and brand display tools are linked.
- Sources checked / checklist modified / first published dates are separate. Checking unchanged facts does not reset their content-modified date. The directory visibly reports source checks, not product launch dates.
- Homepage and related brand pages link the new series. Their changed date follows the actual new series content. Every series has canonical/hreflang, plain text, sitemap and WebApplication metadata. The existing `find_collector_tools` MCP catalog discovers series tools and their JSON source catalog; the MCP protocol remains registered v2.4.0, with no duplicate daily registration.

## Release and recovery

The scheduled deployment collects sources before generation. All local release gates run before the scoped `commit-daily.mjs` persistence step. Generated HTML/text, public catalogs, sitemap/URL list and source state are committed together. The same job deploys them, rather than relying on a `GITHUB_TOKEN` push to start another workflow. This follows GitHub's documented recursion behavior: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow .

Build stamps use the persisted source SHA. The existing live collector/MCP/GA4/retired-path checks still run. Native daily commits supply a before/after range to IndexNow; only changed public eligible URLs are submitted after verification. Receipt is not indexing or AI citation. Existing weekly IndexNow and fleet heartbeat remain independent fallbacks.

The scoped commit uses existing rebase/push retries. If main advances during persistence, the job refuses to deploy a stale generated build and records failure; the next existing scheduled deployment rebuilds the persisted main. A generator/test/publish failure leaves the last deployed site available. Do not force-push, disable checks or copy unverified source content to “fix” an empty run.

Estimated incremental runner time: usually ≤2 minutes ×30 ≈60 minutes/month; bounded slow-source case approximately 6 minutes ×30 ≈180 minutes/month. The existing deployment job is capped at 25 minutes. These are estimates, not measured billing. No new paid services.

## Product, design and measurement

Collectors get a named checklist and a concrete purchase-planning calculation. The design preserves the current white/black/red Helvetica hierarchy, with lime/peach source-series panels and visible checkbox progress; no borrowed brand imagery or decorative animation. The frontend-design review focused on mobile reading, labeled fields, visible focus and source attribution.

Series and official-source links are unmonetized. Existing disclosed US/DE affiliate paths are retained; no new paid offer or checkout was created. The one new business event `collector_series_complete` means a valid user-requested calculation, not collection ownership, purchase or revenue. No checked names, input probabilities, amounts or form values enter analytics; CI, previews and privacy opt-outs remain excluded. GA4 retains consent gating.

Distribution in this release: internal homepage/brand/assistant-directory links, crawlable content and existing authorized IndexNow. No messages to people or third-party promotional posts. At 30 days, inspect series landing sessions, organic/AI referrals and valid calculator completions separately. Zero measured revenue is not an attribution proof; missing data is not zero demand. Expanding beyond the two supported official adapters requires real parseable source evidence, not a claim that all eight brands now expand automatically.

## Verification evidence

- Live official-source reads on 2026-10-02: both configured sources pass; final bounded batch supplies 6 SMISKI and 10 Sonny Angel eligible checklists. Two Sonny Angel series were admitted during the initial run: Snack and Vegetable. Subsequent retries add zero, proving the stored daily limit.
- Source tests cover URL/host restrictions, robots groups/wildcards, relative links, incomplete/duplicate/unsafe names, quota across retries/dates, unchanged content dates, full failure retention and partial-source visibility. Collector/MCP/math tests retained.
- Local browser integration: 12 affected pages ×390/1440px =24 checks; checkboxes update counts, 10% ×3 independent boxes gives 27.1%/72.9%, invalid input clears prior output, no horizontal overflow, no JavaScript errors/local 404s/QA analytics events. Source names remain readable without JS.
- Final assembled build: 69 localized collector pages pass source/link/sitemap/canonical/hreflang/retired-content verification. 191 structured FAQ/DefinedTerm records agree with visible content. GA4 coverage: 217 HTML pages, 212 public pages covered and five explicit exclusions.
- Native commit integration passed against a temporary bare Git remote: scoped push, unrelated-file preservation, exact SHA export, repeated no-op and concurrent-main stale-build stop. This test runs in the scheduled workflow.
- Remote merge, deployment and IndexNow outcomes are appended after verification; this paragraph does not claim a scheduled run has already fired.
