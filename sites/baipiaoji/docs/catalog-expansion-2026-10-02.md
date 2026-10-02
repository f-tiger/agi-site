# BPJ catalog expansion — 2026-10-02

The main third-party application directory grows from 221 to 700 records: 479 additions, 3.17 times the previous size. The separate Agent/MCP registry is not included in this number. The original 221 records, including all 131 allowance records, are preserved without alteration.

## Admission and evidence

Candidates came from AI Collection (MIT, snapshot `96db4c5d4bb99f0b97a3f6049f90d2e29691b96e`) and AutoVenture (CC BY 4.0, repository snapshot `7873612ab8e28569f1b09c95fa059a83d9c54264`, dataset dated 2026-09-22). Current README records were used for AI Collection; its broken/stale full exports were excluded. Collective AI Tools contained fixture data rather than a distributable catalog and was not imported.

Names, slugs, final websites and parent domains were compared with existing records and each other. Checks followed public redirects and recorded successful HTTP 200 responses and page titles. Editorial exclusions included parked or hijacked domains, unrelated redirect destinations, unsupported model-vendor affiliations, weak identity matches and out-of-scope products. Publisher tracking parameters were removed. No partner affiliate codes were imported.

Imported summaries are adapted and translated directory descriptions, not product-test endorsements. Every addition is a `discovery` record with `pricing_status: unverified` in the public directory. No free allowance, registration requirement, regional availability or commercial-use permission is inferred from an available website. These records have no `limits`, free-tier tags or zero-price schema offer. Official page titles and per-record source attribution remain visible. Full source-license notices are served at `/catalog-attribution.txt`.

## Product and discovery

- Both languages expose all 700 records through category pages, site search, `/directory.json`, `/api/tools` and the existing MCP search.
- Homepage/category/footer wording separates directory size from reviewed allowance evidence.
- New detail pages remain `noindex,follow` and outside the canonical sitemap/IndexNow list until fuller editorial review; users can still browse and search them internally.
- Existing video quote/workspace entry points also cover new video listings.
- Long tool names wrap on mobile. Homepage actions retain their early position.
- Link checks use eight concurrent workers and accept only 2xx responses. A blocked/missing/throttled/server/network failure does not refresh availability dates. Link checks never refresh content-policy dates.
- Shared footer count/wording normalization preserves historical page hashes, avoiding a site-wide IndexNow resubmission caused only by shared chrome.

## Validation

The complete build contains 3,324 HTML pages. HTML checks report zero broken links, JSON-LD errors, language leaks, placeholders, raw Markdown artifacts, contradictions, stale counts, hollow pages or hreflang errors. Canonical URL checks pass. Behavioral tests cover every imported record's bilingual search/discovery/evidence boundaries, REST/MCP retrieval, link-health status handling, video-quote relevance and lastmod behavior. Browser tests cover mobile/desktop search, the largest category, homepage click signals and consent handling; requests are intercepted to avoid production measurement pollution. Existing release-check, payment-readiness and quote-builder gates pass with their local fixtures.

No payment configuration, prices, outreach or advertising spend is changed. Existing category/tool click measurement is reused; a deployment or an IndexNow HTTP receipt does not prove traffic, search indexing, conversions or revenue.
