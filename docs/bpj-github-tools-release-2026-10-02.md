# BPJ GitHub tools: release receipt

Released 2026-10-02. Product commit: `b6d4cac3009ee0f96bace1ca1acdc8c06f87ef35`.
Deployment: https://github.com/f-tiger/agi-site/actions/runs/37000586944 — success.

## Published product

- Chinese: https://baipiaoji.com/github-tools/
- English: https://baipiaoji.com/en/github-tools/
- Browser-only starting view: https://baipiaoji.com/github-tools/?mode=web
- Example project permalink: https://baipiaoji.com/github-tools/#localsend
- Structured catalogue: https://baipiaoji.com/github-tools.json and https://baipiaoji.com/en/github-tools.json

Twelve manually curated third-party applications. Task/name/repository search, device and setup filters, dated cumulative GitHub stars, editable filter links, three-step guidance, cost boundaries and official app/download/setup links. Search covers the catalogue; a separately labeled action passes the query to GitHub for broader unreviewed results. No arbitrary repository code is fetched or executed for visitors.

Homepage, global search, feature map and contextual Agent/MCP links make the section discoverable. The existing MCP `baipiaoji://site-journeys` resource returns the new entry; this does not add an installer or executable third-party MCP tool. Canonical/hreflang, sitemap, source-linked JSON and llms discovery are present. Distinct project anchors survive the existing global-search ranking/deduplication behavior.

## Acceptance evidence

- Three prompt refinements and two adversarial self-reviews documented in `sites/baipiaoji/docs/PRD-github-tools-2026-10-02.md`. No independent-review claim.
- 55 local deployment gate commands passed; two fixture checks required local process/network permission and then passed without altering their tests. Intercepted zh/en desktop/mobile browser checks, empty results, query injection, star ordering, project anchors, no-JS fallback and QA event exclusion passed. Existing homepage consent/repeat-click/privacy browser checks passed after merging the concurrent homepage release.
- Static output: 2,366 pages checked; broken links, invalid JSON-LD, Chinese leakage, placeholders, raw Markdown, contradictions, missing English data, stale counts, hollow pages and hreflang errors all zero. Canonical route verifier passed.
- Independent production reads returned HTTP200 for both catalogue pages and both JSON files, each with the expected 12 project IDs. Homepage entry, search entries, CORS, sitemap and llms pointers matched. The three published application assets matched the tested local source bytes. A real read-only MCP resource call returned the new discovery entry.
- All 12 official entry URLs returned HTTP200 from the test environment, with Immich following its canonical trailing-slash redirect. This is availability at one time/location, not installation testing or regional accessibility evidence.
- GitHub Actions completed all deployment gates successfully, including the live GA4 asset/coverage check. A redundant local Node fetch could not resolve the domain in this environment; direct production Python reads and the CI live checks succeeded. No GA4 backend event receipt is claimed.
- Existing IndexNow step returned HTTP200 for 16 canonical changed URLs at 2026-10-02T11:26:32Z. Acceptance is not indexing or ranking. No new recurring task or additional submitter.

## Commercial and marketing boundaries

Free value: discovery, official links and practical getting-started guidance. Existing vendor/sponsorship service links are separate from editorial order and disclose current pricing/readiness on their own pages. A proposed USD29/application/device setup service remains a closed hypothesis, requiring real scoped requests and viable delivery/support/refund economics. No new paid entitlement or checkout was opened; no revenue is attributed to this release.

Owned distribution is live through the homepage, search, related paths and shareable filtered views. No external community message or paid advertisement was sent. No traffic increase, installation count, completed customer task or paid sale is established yet.

Measurement uses fixed `github_tools` actions and project IDs; no query text, personal identifier or input content. Guide opens, official opens and search hit/miss actions remain separate from installations and revenue; QA, DNT and GPC are excluded. Existing `/api/reach` includes the aggregate event and homepage block/destination labels. The initial 28-day operating target is 30 official-open actions plus 10 guide opens before expanding catalogue scope; insufficient exposure is inconclusive.
