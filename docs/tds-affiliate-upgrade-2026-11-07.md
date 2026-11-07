# TDS buying-guide release — 2026-11-07

The owner asked to make TDS useful as an affiliate site like ECO. The existing collection desk had no direct buying journey and its new page template did not record first-party merchant clicks. This release connects collector needs to buying criteria, explicit US/German merchant searches and the existing collection tools.

## Scope and decisions

- Audience: collectors choosing display, storage, transport or a gift. Free value: compare formats, check measurements and decide when an existing solution is sufficient. Retailers handle purchases; TDS does not sell or fulfill products.
- English remains the default. German uses Amazon.de/getecoback-21; English and Chinese use Amazon.com/ecoback0d-20. The account/site registrations were already confirmed in the site operating manual. Merchant search results are not verified products, inventory or authenticity guarantees.
- Homepage prioritizes buying guides. Existing collection desk, browser storage, account backup, series URLs and MCP remain available. Eight brand guides link to shopping guidance.
- New three-language routes: `/shop`, `/shop/display-cases`, `/shop/storage-transport`, `/shop/plush-display`, `/shop/collector-gifts`.
- No model calls, paid subscriptions, new scheduled jobs, new affiliate accounts or unsolicited outreach.

## Review gates

The three refinement passes specified the buying task, constrained evidence and market attribution, then defined observable release checks. The first challenge rejected equating a larger catalog with value: guides must include fit checks, alternatives and reasons not to buy. The second challenge covered false merchant endorsement, duplicate analytics, lost saved collections and generators overwriting the new homepage.

Sources and editorial criteria remain distinguishable. No hands-on tests, stock levels, prices, ratings, ASINs, popularity or revenue are invented. Affiliate links stay in the visible website, not MCP responses or AI text mirrors. SEO includes canonical/hreflang, meaningful headings, generated sitemap entries and visible/text parity. Existing IndexNow submits only the actual published diff; acceptance is not indexing.

## Measurement and distribution

The existing first-party PV path and fixed `affiliate_click` event measure shopping routes separately. Merchant clicks record a canonical page and merchant domain, never user inputs or search terms. Shared fleet analytics alone owns GA4 affiliate dispatch; privacy exits and QA exclusions remain in place. Counts are actions, not unique people, purchases or commission.

Authorized distribution is the site's homepage, brand-guide internal links, sitemap, readable mirrors and existing search notification workflow. No external messages or community posts have been sent. New marketing automation is not part of this release.

Use the first 14 complete UTC days after deployment as an exploratory observation window. If fewer than 30 genuine shopping-page visits arrive, investigate discovery before adding more categories. With at least 30 visits and no merchant clicks, review whether choices and destinations serve the visitor's task. These are operating gates, not statistically established demand thresholds. Repeated guide use and merchant clicks can justify further investigation; only account statements establish commission. Existing affiliate IDs are shared with other fleet sites, so total account revenue cannot be attributed to TDS.

## Validation record

Release verification covers localized HTML and machine-readable URLs, market/tag integrity, useful no-JavaScript navigation, mobile and desktop layout, collection persistence, first-party click privacy, shared analytics coverage, current-main deployment guards and production build identity. Deployment and IndexNow receipts are reported separately from implementation; GA4 backend receipt and commission are not inferred from frontend tests.
