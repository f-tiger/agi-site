# TDS motion and assistant discovery — 2026-10-02

The owner asked whether effects/video suit the toy site and required tools to be discoverable by AI assistants. The chosen change adds a useful, lightweight demonstration and a callable discovery path, preserving the multi-brand collector positioning shipped in PR #75.

## Optimized brief and two reviews

1. Clarify: make TDS feel playful while showing a practical collector task; ensure assistants can find and use the public tools.
2. Strengthen: preserve static HTML, mobile speed, reduced-motion preferences and the distinction between public calculation and private browser data. Video is useful for real input-to-result walkthroughs, but a large autoplay background is not necessary for this task.
3. Operationalize: a finite six-second display-plan animation; localized connection guides; a capability catalog and published guide resources; actual MCP calls; official registry publication after deployment.

Review 1: motion must not obscure the tool, loop endlessly, require audio or count a demonstration as a user's completed task. The selected component starts only on click, pauses, stops after one sequence, pauses in hidden tabs, and uses manual steps under reduced motion. Static output remains readable without JavaScript.
Review 2: an llms file is not a tool connection or a guarantee of AI recommendations. The public contract identifies callable calculations/evidence separately from browser-only collection/file tools. Schema validation rejects unexpected fields, strings masquerading as dimensions, impossible ranges and unknown tools. Resource reads use a fixed allowlist, not arbitrary URLs. No local collection, cloud account or private file access is added.

## Delivered

- Original toy hero retained, with a short one-time headline entrance for users without reduced-motion preference.
- Homepage display demo in EN/DE/ZH. Example: a 40 × 25 × 30 cm internal case, 8 × 6 × 15 cm figures, 1 cm gaps, one layer → 12 positions (4 × 3). Illustration is explicitly not to scale. Calculation uses `js/collector-core.js`, the same function as the actual display calculator and MCP endpoint.
- `/for-agents`, `/de/for-agents`, `/zh/for-agents`: remote URL, copy action, schemas, example request, privacy/limits, visible crawlable links and text mirrors.
- `/collector-assets/tool-capabilities.json` and `/collector-assets/brand-guides.json`; synchronized `.well-known/mcp.json`, root llms indexes and sitemap. The digital-tools catalog remains linked separately.
- MCP 2.2.0 retains four existing tools and adds `find_collector_tools`, `get_collecting_guide` and `plan_display_fit`. Three fixed public resources support MCP resource reads. Protocol remains compatible with the supported 2025-06-18 transport. No new SDK is shipped to the browser or endpoint.
- Official registry name: `io.github.f-tiger/dollscout-collecting`. Manifest at `/mcp/server.json`; the retired root `/server.json` remains gone. Deployment verifies the exact live contract before registering via the fleet's existing GitHub OIDC identity. Publisher v1.8.1 is pinned with its official SHA-256. Commit marker `[mcp-publish]` opts this release into registration; no new recurring job or secret.
- IndexNow remains the existing changed-content flow; only eligible published changes are notified after deployment. No social messages, ads, new spend, MP4 file or video-SEO claim.

## Validation

- Seven collector/MCP tests passed, including malformed inputs, language fallback, published sources, physical height failure, rotation, private-access boundaries and resource allowlist.
- Official MCP SDK 1.30.0 connected to a real local HTTP server and completed initialize, tools/list, real display calculation, resources/list/read and ping.
- EN/DE/ZH homepages at 1440/390/320 px, brand guides, digital hubs and localized assistant pages: no overflow, failed assets or page errors. Play/pause, finite playback and reduced-motion manual steps passed.
- 18 localized collector/discovery pages passed canonical, hreflang, sitemap, text mirror, internal-link and retirement checks. 191 FAQ/DefinedTerm entries match visible content. Final analytics coverage remains after generators; demos emit no completion events.
- Production status, registry receipt and search-notification outcome will be recorded in the PR after they actually complete. Registration does not establish marketplace adoption, search inclusion, recommendations, external tool use or revenue.

## Primary guidance

- OpenAI crawlers: https://developers.openai.com/api/docs/bots — search crawler access is distinct from training and does not guarantee placement.
- Motion/accessibility: https://web.dev/learn/accessibility/motion — user control and reduced motion.
- Official MCP registry: https://modelcontextprotocol.io/registry/about — metadata consumed by downstream catalogs.
- Remote servers: https://modelcontextprotocol.io/registry/remote-servers
- GitHub OIDC publishing: https://modelcontextprotocol.io/registry/github-actions
