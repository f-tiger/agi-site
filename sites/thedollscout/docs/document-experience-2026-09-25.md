# TDS experience, discovery and sharing — 2026-09-25.3

User request: unify the frontend, improve SEO/GEO, and make the site shareable.

Optimized brief: use the existing browser-only PDF tools and EN/DE/ZH routes; unify navigation, typography, task summaries, citations and sharing across the 33 document pages. Make tool scope and limitations readable in the initial HTML and in equivalent text. Add user-initiated sharing with a reviewable payload. Verify privacy, working links, generated metadata and production behavior. Keep traffic claims tied to actual measurements.

## What changes for users

- A shared TDS white/black/red document theme, consistent tool tabs, visible breadcrumbs on every secondary page, balanced localized headings, and the same sharing controls on home, tools and guides.
- Every tool explains its use case, output and remaining human checks. Guides link back to relevant tools and other guides, with publisher, update date and primary references.
- Page sharing sends a public URL with the fixed `via=share` marker. The recipient starts with an empty workspace.
- Result sharing first opens a preview. It contains document/page/finding counts, partial-inspection status, comparison counts when applicable, limitations and a tool URL. It excludes filenames, titles, extracted text, failure messages and manual notes. Sample summaries are visibly labelled.
- Native sharing is enabled only when supported. Copy and a selectable read-only field remain available. Cancellation does not count as sharing. Native API resolution records a share request, not proof that a recipient received a message.

## Search and citation

- Intent-specific localized tool titles; canonical, reciprocal hreflang, x-default, Open Graph locale and Twitter card metadata. The existing public brand image remains the social card image.
- WebSite, Organization, WebPage and breadcrumb data; WebApplication on tools and Article on guides. No invented ratings, customers, professional authors or conformance results.
- Each page has a linked plain-text counterpart in `/document-assets/text/`. `/document-assets/tool-capabilities.json` describes the 12 localized tool entries from the same copy used on the pages. It explicitly describes browser-operated tools, not a remote processing API.
- Existing `llms.txt` and `llms-full.txt` are regenerated from the same claims. These are convenience surfaces, not a promised ranking signal.
- Sitemap dates reflect the actual content release date, including the changed homepages. Daily builds do not advance dates automatically.

Primary guidance checked on 2026-09-25:

- https://developers.google.com/search/docs/appearance/ai-features — useful indexable text, internal links and accurate structured data; no special AI markup requirement or indexing guarantee.
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap — accurate modification dates.
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share — user activation, capability checks and differing native-share completion semantics.

## Measurement and validation

`doc_share` counts successful page-copy operations or native-share handoffs. `doc_summary_share` does the same for non-sample summaries. `doc_share_visit` counts page loads carrying the shared-link marker. All are anonymous action counts, not unique users, verified deliveries or proof of organic demand. Existing DNT, CI, bot and metadata-only gates apply. No filename, summary or share destination enters event storage. No new cron or outreach action is added.

Fourteen document tests cover real PDF parsing, comparison, export safety, private-data exclusion from sharing, safe URL selection and event privacy. The build verifier checks all 33 localized pages, unique titles, breadcrumb/Article metadata, public share URLs, text versions, sitemap uniqueness and the capability contract. Production browser verification uses `?ci=1` to keep QA out of demand measurements.

## Shared design rules

`css/brand.css` owns the TDS brand foundation: white (#ffffff), black (#111114), red (#e4002b), Helvetica, 1080px content width and rounded actions. `document-assets/style.css` consumes these same values as the original pages. The TDS-only workbench and member pages receive the same brand adapter after their generators finish. Tool tabs, fact rows, citation panels and share panels use shared classes. New pages must use the document generator and locale copy instead of creating independent page styles. Historical collector tools retain their archive identity and a document-brand return banner.

Full downloaded reports still include the document fields described on the privacy page; the redacted share summary is a separate output. Sharing controls do not publish reports or create public file URLs.

## Brand correction — edition 2026-09-25.4

The owner pointed out that the document tools did not match TDS. The previous teal/slate direction was an implementation mistake: internal component consistency did not establish consistency with the existing brand. The shared foundation now follows the original TDS theme. The document SVG icon, browser theme color, archive banner and social card were updated together. The new share card uses a new PNG URL to avoid stale social/image caches; its editable SVG source is committed alongside it. Functional behavior, locales and search content are unchanged.

## Explicit return to TDS — edition 2026-09-25.5

The owner requires English as the default and reported that returning to the TDS homepage was unclear. Document headers now have an explicit Home link, with equivalent labels in German and Chinese. The logo, Home navigation, footer Home and breadcrumb Home all lead to the English root `/`. Localized tools and language switching retain their existing routes and canonical URLs. The mobile navigation wraps instead of hiding Home. TDS-only workbench and member headers receive the same explicit return link during final assembly; historical pages retain their archive banner with a clearly named TDS home link.

Browser navigation checks entered with `?ci=1` carry that marker across same-origin links. Canonical metadata and public sharing payloads remain unchanged, so a return-home check cannot create a document demand event. The mobile preview starts at the English homepage.
