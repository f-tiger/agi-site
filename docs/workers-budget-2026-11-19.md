# Workers request budget: monitor scope and static icon delivery

The read-only encrypted account report and bounded production response checks
identified two avoidable request patterns. Raw analytics, account identifiers,
credentials and report decryption keys remain outside this public repository.

## Changes

- Extend the existing SentinelOracle opt-out to the ten Web3 tool hosts,
  BPJ's AI/startup/video MCP routes, and TDS `/mcp`. These exact hostname/path/
  full-User-Agent combinations were observed in the private report. The
  response remains `403` with `X-Sentinel-OptOut: 1`, `no-store` and
  `Vary: User-Agent`, before body, account, database or MCP execution.
  Ordinary clients, other monitors, search crawlers and discovery stay unchanged.
- Generate a real Games Ledger `/favicon.ico` at build time, using the existing
  dark/green-dot brand. Only that exact new public file bypasses the Worker;
  it gets a one-day cache policy. Badge generation, HTML, APIs, analytics
  frames, accounts and private routes keep their previous execution boundaries.
- Increase the encrypted MCP client aggregate limit and add separate filtered
  monitor aggregates for the previous complete UTC day and current partial day.
  This avoids using absence from a truncated client/hour table as evidence of
  zero requests. Reports still disclose truncation and errors; there is no new
  scheduled job, credential or paid service.

## Interpretation and remaining work

Workers and Pages adaptive invocation aggregates are not visitors or billing
settlement. Zone HTTP request counts include static delivery and must not be
added to invocation totals. Alert delivery time is not the alert's measurement
window. Current partial days must not be compared directly with full days.

An opt-out response still invokes compute. Savings depend on the external
monitor honoring it and must be measured after release. The previously covered
paths provide a comparison, not a guarantee for the newly covered paths.
The distinct WAF proposal in PR #225 remains unapplied; this change does not
claim a firewall block or stop mcpbeat. Do not blanket-block MCP or search bots.

The Games static route removes compute for a successfully served icon request;
the number of future requests is unknown. A lower 404 count alone is not proof
of reduced Worker calls. Verify the delivery marker and subsequent invocation
aggregates over comparable complete UTC windows.

## Validation and release

- Exact-monitor tests cover every current Web3 host, all BPJ MCP routes, TDS
  early exit, ordinary-client passthrough, discovery, and retired-route behavior.
- The real local Cloudflare runtime tests all configured fleet static bypasses,
  analytics security headers and protected-route shadows, including Games.
- Games is regenerated from the existing official data, GA4 final-build coverage
  passes, and the generated icon is independently decoded as a 32×32 ICO.
- Account, Pages routing, canonical-host and report privacy/window tests pass.
- Existing deployment gates and post-deploy checks remain required. Recheck the
  exact monitor response, normal MCP discovery, Games icon bytes/cache/delivery,
  and retained account/SEO boundaries after release. Record actual release status
  in the task's private checkpoint; tests alone are not deployment evidence.

SEO/GEO content, canonical URLs, robots rules and indexing policy are unchanged.
Existing IndexNow schedules remain responsible for eligible content changes;
this infrastructure repair adds no submission or recurring task.

Rollback is a normal revert of the exact opt-out scope/TDS integration and/or
the Games icon routing change followed by the existing deployment workflows.
Do not change paid plans, credentials, other WAF rules or historical analytics.
