# Fleet measurement and aggregate reporting recovery

Owner approved ECO PR #190 and fleet-wide data analysis and optimization on 2026-10-29 (Asia/Shanghai).

The isolated Google frame cannot observe the parent document's foreground focus. BPJ and ECO already have dedicated adapters. The shared consent channel now installs the same bounded foreground clock for other registered hosts, using the exact property/host registry and public-route predicate. BPJ and ECO are explicitly excluded from the shared clock to prevent duplicate duration.

Only focused, visible time counts. Local samples do not send requests; blur/hide/navigation flushes a fixed `fleet_page_engagement` action through the existing Google frame. Long scheduling gaps, background time, BFCache suspension and time before analytics starts are excluded. Withdrawal discards pending time. TDS uses its existing TDS-specific opt-out key. No form values, arbitrary title changes, queries, fragments, filenames, account data or new client IDs are read. Private routes retain the existing exclusions. Runtime asset allowlisting and exact-byte live verification include the new module.

The aggregate membership report previously accepted only an explicit operator secret, while the existing watcher also supports a dedicated subkey derived from the runner's Cloudflare credential. The report now reuses that established derivation. Only the subkey reaches the existing fixed `stats` action; the runner credential is never transmitted to the site or printed. The workflow passes the existing optional credential through its reusable-workflow boundary. Missing credentials or failed reads remain unknown rather than zero. No orders, payments, entitlements or pricing are changed by the reporting operation; existing handlers may initialize schema.

Traffic-source exports retain legacy `human_pv` fields for compatibility but add explicit observation units, unverified-person status and endpoint-specific window/filter caveats. The CLI labels these counts as observations. These totals cannot be joined to browser sessions or treated as verified people, referrals, sales or a conversion funnel.

ECO's homepage rotates with the season. Its health check now verifies the canonical homepage identity instead of requiring a particular seasonal article link. The article's own content checks remain, as do the independent membership readiness gate and live analytics checks.

## Verification and release

Clock, registry, privacy, coverage, edge routing and credential fallback have offline regressions. Browser fixtures intercept all requests and cover AGI, TDS, a registered AGI subdomain, and BPJ/ECO duplicate prevention. Tests with actual Google tag code reproduce the hidden-frame baseline and verify positive foreground duration, one page view and sanitized metadata. Opt-out/regrant, QA/DNT/GPC, private routes, BFCache and scheduling gaps are covered. These tests do not establish backend receipt from genuine traffic.

Self-check one: duration recovery must not generate periodic keep-alive traffic, duplicate page views or bypass opt-outs. Self-check two: reporting recovery must not expose credentials, fabricate zero counters, equate browser events with customers or turn raw endpoint traffic into market validation.

Release uses full site-specific gates, the current-main guard and read-only production outcome probes. SEO/GEO: content, metadata, public canonical inventory, source dates and AI-readable answers are unchanged. IndexNow remains the existing material-change planner; analytics-only module changes do not justify whole-site resubmission. Record actual deployment, live verification and submission results separately from real-traffic reception and commercial outcomes. No new recurring task, model spend or external marketing publication is introduced.
