# TDS experience, discovery and sharing — 2026-09-25.3

User request: unify the frontend, improve SEO/GEO, and make the site shareable.

Optimized brief: use the existing browser-only PDF tools and EN/DE/ZH routes; unify navigation, typography, task summaries, citations and sharing across the 33 document pages. Make tool scope and limitations readable in the initial HTML and in equivalent text. Add user-initiated sharing with a reviewable payload. Verify privacy, working links, generated metadata and production behavior. Keep traffic claims tied to actual measurements.

## What changes for users

- A shared teal/slate document theme, consistent tool tabs, visible breadcrumbs on every secondary page, balanced localized headings, and the same sharing controls on home, tools and guides.
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

`document-assets/style.css` owns the document theme: teal action color, slate text, a light paper background, one system font stack, visible keyboard focus and consistent button/form spacing. Tool tabs, fact rows, citation panels and share panels use shared classes. New pages must use the document generator and locale copy instead of creating independent page styles. Historical collector tools retain their archive identity and a document-brand return banner.

Full downloaded reports still include the document fields described on the privacy page; the redacted share summary is a separate output. Sharing controls do not publish reports or create public file URLs.
