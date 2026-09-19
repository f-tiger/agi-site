# Web3 Workbench MCP implementation

## Optimized brief

Expose the ten existing Web3 tools through a standard, usable MCP endpoint and make every calculation traceable to a public method, sources and limitations. Preserve the existing main-domain MCP, deterministic algorithms and deployment ownership. Distinguish configured-client access from AI search inclusion. Verify both current and legacy protocol clients and every calculator before reporting launch.

## Architecture and behavior

- Unified URL: `https://web3.agiscorecard.com/mcp`; single-tool URLs use `/mcp` on the ten existing hosts. No new domain or Cloudflare account is needed.
- Official `@modelcontextprotocol/server` 2.0.0, pinned dependencies and lockfile. Modern protocol 2026-07-28; stateless legacy support for 2025 revisions. No handwritten imitation of SDK protocol negotiation.
- Ten calculator names map to the same browser/offline engines. `search` finds public tool IDs; `fetch` returns a public methodology with canonical URL. Resource reads are limited to allowlisted static methods, capabilities and fictional examples. Arbitrary URLs and sibling resources on a scoped host are rejected.
- Structured results include version, source revision, method citation, reviewed date, limitations and references. Text blocks contain the same JSON for client compatibility. Resource links point to the public method, not a persisted private result.
- Tool annotations: read-only, non-destructive, idempotent, closed-world. No wallet access, live-chain calls, model invocation, payment, trading or proof verification is added.

## Privacy and operating limits

Browser inputs remain local. Remote MCP clients send their chosen arguments to the server. The Worker processes them in request memory without application persistence, raw request logging or D1 writes. Provider/client policies are separate. Private keys, secrets and unauthorized records must not be sent; the browser and offline runner remain options for device-local processing.

The MCP rate limit is separate from feedback: 120 requests/minute per IP across all hosts, with Retry-After on 429. Missing limiter binding returns 503. Requests are bounded to 128 KiB including the RPC envelope; malformed data, unsafe numbers, unsupported keys and unknown Origins fail validation. MCP responses are no-store/noindex. Public references may be indexed through their canonical HTML pages.

## Discovery and documentation

All eleven hosts gain `/for-agents.html` with English and Chinese instructions, explicit remote-processing notice, calculator names, citation behavior and optional client configuration. Main navigation, llms references, machine-readable metadata and sitemaps link to it. The conventional `/.well-known/mcp.json` file describes the endpoint; it is not claimed as a standard or official registry enrollment.

The owner's public MCP repository now links to the new endpoint and setup page after production validation. Its existing dataset MCP methods and registry identity are kept separate. No unsolicited directory submissions or messages are sent.

## Verification

Local suite: 71 passing tests, including official-client modern and legacy exchanges, all 30 scenarios against the existing engines, resource reads, source retrieval, per-host isolation, malformed inputs, origin rules, size bounds, rate limiting and zero D1 writes. All 55 generated HTML pages pass validation. The Worker bundles successfully. Production verification is recorded below.

## Official references

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk): official server and client implementations. Installed package declarations document `createMcpHandler`, stateless legacy support and explicit 2026 negotiation; tests pin the current client to avoid its legacy default.
- [MCP 2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http): per-request metadata, origin validation and transport behavior.
- [MCP 2025-11-25 Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports): legacy compatibility requirements.
- [MCP tool results](https://modelcontextprotocol.io/specification/2025-11-25/server/tools): structured results, schemas and resource links.

## Production acceptance — 2026-09-19

- Release commit: `841bf5fc0e86a343e70413b56ae111f6c3649b72`.
- [Deployment and smoke run 35446829832](https://github.com/f-tiger/agi-site/actions/runs/35446829832): all release steps succeeded.
- Cloudflare Worker version: `f805d162-e6a6-4d37-a589-af89e71fc32b`.
- Static production smoke: 11 hosts, 555 requests, 441 hashed files, exact release revision, host routing, headers and isolated QA feedback checks passed.
- Official MCP clients: 70 production requests covering all ten calculators and all 30 fictional scenarios, public methods and citations, and scoped discovery on all 11 endpoints. Both pinned 2026-07-28 and legacy 2025-11-25 exchanges succeeded. No private user records were used.
- Live browser acceptance: hub `/for-agents.html` rendered the actual endpoint, configuration, ten calculator names, English/Chinese guidance and remote-processing/citation limits; navigation exposed AI / MCP.
- Public discovery README updated in `f-tiger/agiscorecard-mcp`, commit `a2f31bc289eaf20e3b2f2c6fe0880b941928e5cf`, with the independent endpoint and privacy distinction. No new registry enrollment or AI search inclusion is claimed.
- Local emulator startup was unavailable because this container could not enumerate network interfaces. Bundling, direct Worker integration tests and the deployed Cloudflare runtime/client checks passed.
