// Public delivery metadata, not a traffic or user-count measurement.
export const CONTENT_VERSION = 'pages-public-content-20261101.1';
export const crawlerMeasurement = Object.freeze({
  version: CONTENT_VERSION,
  change_date_utc: '2026-11-01',
  coverage: 'partial; CDN-served public pages do not invoke the D1 crawler logger',
  interpretation: 'A decrease in D1 crawler rows after this release is not evidence of decreased crawling. Use Cloudflare request analytics for CDN requests. GA4 and client business-event collection remain separate and unchanged.',
});

