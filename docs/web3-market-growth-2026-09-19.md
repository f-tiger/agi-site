# Web3 market context and task conversion release

## Optimized task

Reference Eco's current implementation, identify what can actually transfer to Web3, then ship useful source-backed market/content updates and attributable task paths. Preserve all ten tools and MCP contracts. Check source freshness, failures, user-input privacy, QA exclusion, canonical pages and the actual deployed runtime. Track acquisition, task use, commercial interest and revenue as different observations. Do not invent demand, quotes, rankings, backlinks or sales.

## Evidence and decision

Read the repository's current marketing context, Eco household-growth release, fleet demand digest and AI-referral snapshot. Eco's useful pattern is a specific decision with explicit inputs, an inspectable calculation and a measured next step. Its account-level historical affiliate earnings do not establish that Web3 worksheets can monetize the same way. Eco's three household calculations do not require live price feeds; Web3 therefore needs its own freshness and failure contract rather than copying an earnings claim.

The fresh Web3 `/api/stats` read before this release contained only `qa=1` submissions across the ten tools. There were no non-QA submissions in that read. This is not a traffic measurement and cannot establish zero demand. Fleet-wide AI referrals also cannot be assigned to these new subdomains.

Alternatives: CoinGecko already offers broad prices/charts; Kraken offers public venue data; official Ethereum and project repositories publish their own changes. The practical hypothesis is to connect a small amount of dated context to payment exceptions, full-workflow costs and versioned integration review. This is not a price-data moat, news-wire replacement or a validated paid business. Missing source access and free substitutes are material counterevidence.

## Implemented scope

- `/market.html`: BTC, ETH, USDC and USDT venue reference prices; UTC-day change and stablecoin basis-point deviation. Local impact calculator keeps prices explicit and never overwrites the reader's inputs with a moving quote.
- `/briefs.html`: original metadata from Ethereum Foundation, x402 commits and EZKL releases; publication and retrieval dates remain distinct. Commits are identified as commits, not released features. No full articles are copied or AI-generated news published.
- Three original task guides: stablecoin payment reconciliation, gas/proof cost budgeting and protocol-change review. Each leads to the existing relevant tool, worked examples and inspectable reports. These are editorial workflow hypotheses, not customer quotations or interviews.
- Canonical pages, source references, schema matching visible content, llms links, sitemap entries, RSS and public JSON. Prepared citations and relevant sharing links support voluntary linking. No automatic directory submissions, external posts, bought links or unrelated sitewide crosslinks.
- The ten MCP calculators are unchanged. Current public snapshots are available over HTTP and documented in the agent guide; stale status must accompany any quote. No assertion that MCP availability produces AI citations.

## Source freshness and operating cost

Kraken's public ticker is read after a five-minute cache interval. This reports the last trade price; its UTC opening field is not a rolling 24-hour return. The server's receipt time is not a trade timestamp. Source metadata refreshes after one hour. Cache reuse is per Cloudflare edge location, not a globally guaranteed update instant. An open visible market page checks every minute. This is near-real-time context, not a tick-by-tick feed or alert SLA.

Failed refreshes preserve the original timestamp and mark the snapshot stale. Data older than a day is hidden. Missing values are never replaced by fictional example prices. Requests use fixed upstream URLs, bounded bodies and timeouts; readers cannot supply an arbitrary fetch URL. A short failure retry interval avoids immediate repeated upstream attempts within an isolate.

The existing daily fleet-autopilot runs the Web3 audit, saves the latest diagnostic and 30 daily summaries, and fails after saving diagnostics if a live/source check fails. No additional GitHub cron is added. Estimated incremental runner budget is 30–60 minutes/month, with a three-minute audit-step ceiling (90 minutes/month); the repo is private, so no free-Actions assertion. No new paid API or model subscription.

## Conversion measurement and limits

The optional checkbox is off on every page visit. It records fixed page, event, campaign and coarse incoming channel categories plus per-event deduplication IDs. It does not store worksheet values, full referrers, query text, visitor identifiers, IPs, wallets or emails. DNT/GPC and probe visits are excluded. No consent cookie or persistent visitor tracking is added. Hosting-provider request metadata policies remain separate.

Page visits, intentional sample runs, own-record runs, exports, tool openings, MCP setup, citations and cost checks are separate events. Deep-linked automatically rendered examples are excluded. Same-page event deduplication does not identify people; independent pages/subdomains cannot be joined into a session conversion rate. Attribution may be absent, stripped or spoofed. Opt-in selection bias is explicit. The public `/api/growth` excludes QA by default. `/api/stats` continues to provide separately identified optional feedback about recurring needs and interest.

Indexing, verified third-party backlinks, actual AI citations, buyers and revenue remain `null` without evidence. AI/external source categories are referral indications, not proofs of a citation or backlink. No checkout or new paid offering was requested in this release, and none is represented as available. The existing 2026-10-19 Web3 feedback-review gates remain the review date; this release does not turn activity counts into permission to charge.

Next decisions: if relevant exposure is insufficient, inspect distribution and measurement bias; if users reach a task but cannot finish, inspect input friction; if own tasks and reports recur, review the actual unmet need before implementing saved history or a paid service. Do not infer willingness to pay from price volatility or token popularity.

## Verification

Local suite: 82 tests passed, including correct ticker units, stale/unavailable states, hostile feed URLs, source escaping, gas arithmetic, opt-in contracts, no raw-input persistence, idempotent QA events, source failure detection and all existing calculator/MCP tests. Sixty generated HTML pages passed canonical, schema, ID, link and UI-target checks. Production acceptance is recorded after deployment.

## Primary references checked 2026-09-19

- [Kraken ticker documentation](https://docs.kraken.com/api-reference/market-data/get-ticker-information): public endpoint and UTC opening semantics.
- [Coinbase price documentation](https://docs.cdp.coinbase.com/coinbase-app/track-apis/prices): alternative public source investigated; local fetches timed out or returned 502, so no successful integration claimed.
- [Ethereum Foundation blog](https://blog.ethereum.org/): original announcements and feed metadata.
- [Ethereum gas documentation](https://ethereum.org/developers/docs/gas/): gas units and effective fee calculation.
- [Circle transparency](https://www.circle.com/transparency): issuer disclosures are distinct from venue prices.
- [x402 repository](https://github.com/coinbase/x402) and [EZKL documentation](https://docs.ezkl.xyz/): original project references.
- [Google helpful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [AI search guidance](https://developers.google.com/search/docs/appearance/ai-features): support useful, accessible, sourced content; do not establish guaranteed ranking or citation.


## 上线验收修正

首轮上线验收阻止将断源判为完成。Kraken 公共接口在验证环境持续超时，改为 DefiLlama 公共价格端点（BTC/ETH/USDC/USDT）；保留每个报价的提供方时间，超过 15 分钟标为 stale，不计算未提供的 24 小时涨跌。Ethereum RSS 已校正到 `/en/feed.xml`；x402 当前上游为 x402-foundation/x402，Coinbase 仓库已是 fork。只跟随固定来源，不自动放宽为任意 URL。公开失败原因仅固定错误码。

参考： https://api-docs.defillama.com/ 、 https://github.com/coinbase/x402 、 https://github.com/x402-foundation/x402 。生产验收结果以最终工作流与当日 `data/autopilot/web3/latest.json` 为准。
