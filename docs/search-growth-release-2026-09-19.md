# Search and distribution release — 19 September 2026

## Optimized execution brief

Improve qualified discovery for the existing portfolio before opening more sites. Audit live crawl paths and available aggregate data; fix verified defects; publish independently useful, reproducible task examples; improve sharing, search metadata, source attribution and measurement; deploy and verify. Success in this release means healthy routes and functioning discovery/distribution, not an invented increase in rankings, citations or revenue. No outreach, purchased links, advertising spend, fake reviews or activated unfinished paid offers.

Skills applied: optimize-before-execution, ECC prompt-optimizer, repository seo-audit and ai-seo. Official documentation supersedes unsupported numerical promises and incorrect crawler-role statements in the third-party ai-seo skill. In particular, OAI-SearchBot is a search crawler; GPTBot training permission is separate. Google AI features require no special AI file or special schema. A small llms.txt is a documentation index experiment, not a claimed ranking signal.

## Evidence and priorities

- Live browser inspection before this release: `https://baipiaoji.com/en/tools/grok` renders with canonical `https://baipiaoji.com/en/tools/grok.html`. The older growth-reset PR #3 remains open. Its existence did not mean its fix was deployed.
- Port only the bounded canonical normalization into current main, preserving intervening changes and leaving PR #3's other work separate. Normalize own absolute URLs in HTML, hreflang, JSON-LD, feeds and documentation. Preserve third-party source URLs and Pages redirects from old URLs. Update filesystem link validation for extensionless Pages routes and add a canonical/sitemap gate before deploy.
- The five new tools have basic home/guide/privacy pages but limited standalone search entry content. Six new editorial pages contain original, fictional inputs, calculations, expected results, downloadable assets and product limits. They are hypotheses about useful search intent, not claims of verified keyword volume or competitor rankings.
- Historical aggregate snapshot `data/fleet-ai-referrals.json`, generated 18 September, reports 22 AGI / 28 BPJ / 20 Eco AI-referral events; these are neither citations nor unique people. Other site zeros do not establish no visitors. The legacy `fleet_human_pv` total mixes incompatible methods and must not be used as a people total.
- Shell HTTP access was blocked by this environment. That is not evidence that the websites block search crawlers. CI performs the bounded read-only public audit using its permitted network. No new D1 access or permissions bypass is introduced.
- Current GSC impressions, query ranks, Bing indexed counts and field Core Web Vitals are not available in this release. No improvement in those metrics is asserted.

## Delivered discovery system

| Site | Search entry | Standalone value |
|---|---|---|
| RFQ Desk | `/supplier-quote-comparison-template` | Downloadable quote CSV, 300-unit calculation, MOQ/packing/freight comparison |
| RFQ Desk / TradeCheck | `/purchase-order-invoice-matching` | Source JSON, €44 price exception and 20-unit cumulative quantity example |
| ModelMeter | `/ai-api-cost-tracking-template` | Normalized billed-cost CSV, $140/14-day example and explicit $300 monthly-pace assumption |
| QuerySprint | `/sql-revenue-analysis-practice` | Six-row dataset, executable SQL and expected 420 / FR 300 / DE 120 results |
| FilingLens | `/sec-companyfacts-period-matching` | Exact-period/source methodology, conflict handling and evidence checklist |
| LocaleBatch | `/shopify-translation-csv-checklist` | Downloadable fictional translation CSV and row-level checker expectations |

All pages include a clear answer, readable HTML without script execution, source links where relevant, honest limitations, optional guide-link copying and a direct path to the working tool. No private user input enters share URLs. Every example links from its product home. No unrelated fleet-wide keyword links.

Five sites receive accurate search titles/descriptions, canonical URLs, WebPage/WebApplication JSON-LD without fabricated ratings or paid offers, Open Graph/Twitter metadata, 1200×630 original PNG share cards, RSS feeds, synchronized sitemap/robots and a concise documentation index. Fixed publication dates do not refresh on every build. Generator is idempotent and part of both deployment pipelines.

Four measured venture sites now classify opt-in events into a small fixed source vocabulary: search, AI, community, social, owned-site referrals and examples. Only the category is sent; raw referrer URLs, queries and uploaded values are not stored. `direct` includes unknown/stripped referrers. Categories do not distinguish Google AI Overviews from other Google traffic and are not definitive causal attribution. Existing consent, QA exclusion, retention and no-checkout behavior remain enforced. LocaleBatch receives discovery assets without introducing tracking.

IndexNow: host-verified public key files and only the updated home/guide/example URLs, at most four per host. Bounded release submission, not repeated whole-site pings or a new cron. Normal retries skip submission. HTTP 200/202 is submission/acceptance, never proof of indexing. Failed submission remains visible as an action failure. No Google sitemap-ping or general-purpose Indexing API misuse.

## Validation and operations

- 23 generated pages pass canonical, sitemap, schema JSON, link/anchor, feed XML and PNG checks. Downloaded SQL produces the documented result.
- 25 venture tests pass, including actual SQLite-backed consent/QA handling, host isolation, canonical aliases and new source allowlisting.
- 23 LocaleBatch tests pass; its closed-payment and data-validation behavior remains intact.
- Canonical gate passes against the prior complete 1,603-page BPJ build, checking 1,601 canonical-bearing pages. Current main is rebuilt and rechecked in CI before deployment; this local fixture is not presented as a fresh full main build.
- Deployment performs live checks for every new example and download, aliases, metadata, feeds, cards and an OAI-SearchBot UA request. A spoofed UA response is not proof of access from actual vendor IPs.
- A bounded audit covers all 19 hosts' home/robots/sitemap health and existing public aggregate endpoints. It adds no schedule. Approximately three release jobs; only the existing venture/LocaleBatch/BPJ deploys are needed.

## Measurement and next decision

Use release day as the new acquisition-category baseline; the old `direct` series cannot be retrospectively reclassified. Compare complete windows and each site's own method, never divide opt-in completions by incompatible server request totals. Search indexing takes observation, not promises: check indexed canonical pages and impressions when GSC/Bing access is available, then evaluate search/AI-source own-task completions and downstream commercial actions. Fictional-example clicks and downloads are useful distribution signals, not sales.

Seven days: verify crawl/canonical health and identify which entry pages receive referred visits. Twenty-eight days: evaluate own-task use and concrete buying intent. If discovery is absent, the product experiment is inconclusive; if qualified discovery arrives but the task is not used, revise the page/task before adding more pages. Eco's latest revenue remains the owner's €11.20/30-day screenshot through 14 September, not a refreshed live balance.

## Primary guidance used

- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- OpenAI crawler roles: https://developers.openai.com/api/docs/bots
- IndexNow protocol and status codes: https://www.indexnow.org/documentation
- Shopify translation CSV workflow: https://help.shopify.com/en/manual/international/localization-and-translation
- SEC API contract: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- SQLite SELECT: https://www.sqlite.org/lang_select.html
