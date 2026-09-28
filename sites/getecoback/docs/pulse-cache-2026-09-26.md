# Public aggregate read protection — 26 September 2026

The 25 September production watcher reported `orders_read; database_limit`. At the 26 September recheck, `/api/member` reported `ready:true`, `/api/pulse` returned HTTP 200, and deployment run 36203664872 had passed. Recovery was observed before this change; do not attribute it to caching or claim a paid transaction occurred.

The public pulse handler declared a one-hour HTTP freshness window but computed its D1 aggregates on each Worker invocation. This release uses an explicit Cache API entry for that endpoint, within the same freshness window. Query-string variants share one entry. Concurrent misses within an isolate share one computation. The response's original `generated` timestamp is preserved and the remaining freshness period decreases on cache hits.

Only GET requests to the canonical site's `/api/pulse` qualify. Credentials, cookies, membership, payment, event writes, geo responses, other methods and other hosts follow the existing Worker unchanged. Failed or incomplete aggregates, invalid JSON and responses carrying private/no-store or Set-Cookie headers are not cached. Cache failure falls back to the original endpoint. The wrapper retains the original Worker handlers and database bindings.

This reduces repeated aggregate reads in a Cloudflare location; it does not establish which database exhausted the account quota, guarantee prevention of future exhaustion, or reduce every site's database use. Cache entries do not replicate across locations. No paid plan or additional service was enabled.

Validation: expiry and timestamp preservation; query variants; ten concurrent requests with one computation; credential/payment/write exclusions; error responses; and recovery after cache/computation failure. Production acceptance requires a visible `x-eco-pulse-cache: hit`, unchanged aggregate shape, a live membership readiness check, and the existing deployment health gates.

Source: [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/), checked 26 September 2026. Revenue remains measured by settled provider records, not interface readiness or telemetry.
