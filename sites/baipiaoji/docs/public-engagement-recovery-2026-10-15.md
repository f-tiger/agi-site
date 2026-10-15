# Public-page engagement through the isolated GA4 frame

## Reproduced defect

The shared GA4 tag runs in a hidden empty same-origin frame. In Chromium, a
focused public page reports `document.hasFocus() === true`, while that frame
reports false. A locally intercepted real Google tag records page views and
referrer origin but does not accrue the parent page's focused duration. A
top-level tag used only as a test control does accrue that duration. The live
consent/collector assets matched the source used in the reproduction.

Google defines engagement as foreground/focused time:
<https://support.google.com/analytics/answer/11109416>.
Its developer guidance supports `engagement_time_msec` on custom events and
warns against generic session keep-alive pings:
<https://developers.google.com/analytics/devguides/collection/ga4/sessions>.

## Bounded correction

BPJ's final release step installs `public-engagement.mjs` only on routes already
classified as public by the shared coverage manifest. Shared fleet code and
other site deployment paths are unchanged. Private account/member pages,
customer documents, probes and embeds receive no adapter. The installer checks
every admitted/excluded page, versioned asset bytes and a single script per page.

The adapter uses the existing enabled frame, property and cookies. It samples
elapsed time locally while the main document is visible and focused, then sends
one fixed `bpj_page_engagement` event with `engagement_time_msec` on blur, hide or
navigation. It sends no periodic keep-alive events, page views or new identifiers.
Elapsed time is consumed once; overlapping exit signals cannot duplicate it.
The five-second local sampler discards scheduling gaps longer than fifteen
seconds conservatively, rather than counting device sleep as active attention.
BFCache restoration starts a fresh timing segment. Opt-out/withdrawal discards
pending duration, removes the timing source and never replays time on regrant.

Only build-time public URL/title, referrer origin and duration enter the existing
empty frame. The adapter reads no input value, filename, query value, fragment,
account identity or saved data. Existing QA, automation, DNT/GPC exclusions and
the stored opt-out continue to apply. Public source attribution is unchanged:
the reproduction confirmed origin-only referrer reaches the actual tag, so it
does not establish a cause for unattributed traffic.

## Acceptance and limits

- Unit clock tests cover foreground/background transitions, short accumulated
  intervals, duplicate flushes, opt-out reset and long scheduling gaps.
- Browser checks use bilingual actual built tool pages. They cover no periodic
  events, blur/hide/pagehide deduplication, BFCache, regrant without another PV,
  private pages and QA/DNT/GPC exclusion. Queries, dynamic titles and inputs use
  synthetic secret markers which must not occur in analytics payloads.
- Real-tag mode (`BPJ_REAL_GTAG=/path/to/downloaded-tag.js`) intercepts **all**
  collection traffic. It confirms `_et` encoding, one page view, origin-only
  referrer and no private markers. Synthetic requests never reach GA4.
- Existing full output, canonical, journey, account privacy and shared GA4 gates
  remain mandatory. The deployment verifies adapter bytes/version and absence
  on private pages in addition to the existing shared coverage gate.
- Existing canonical content and machine-readable content are unchanged.
  IndexNow follows the existing substantive-change manifest; this instrumentation
  fix is not a reason to submit every page as changed content.

Frontend acceptance proves event construction, not backend ingestion. Observe
genuine post-release traffic after normal GA4 processing; do not manufacture
test visits in production or backfill the historical measurement gap. Use
`engagement_time_msec`/engagement-duration metrics and the explicit
`bpj_page_engagement` name for this adapter; native `user_engagement` counts alone
will not identify the recovery. Keep pre/post measurement regimes separate.
Restored time measurement does not establish attention quality, unique people,
registration attribution, payment or acquisition success.
