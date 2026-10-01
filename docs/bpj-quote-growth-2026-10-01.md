# BPJ Quote Studio: acquisition and first use

Date: 2026-10-01. Scope: BPJ only. Owner requested better marketing and traffic so the tool is actually used. This record distinguishes implemented distribution from unverified demand.

## Three refinements and two adversarial checks

1. Goal: reach service providers with a current quotation task, not accumulate generic visits.
2. Constraints: use the existing BPJ domain and video audience, no paid traffic or new accounts, no invented social proof, no registration before value, no private quote content in analytics.
3. Acceptance: localized intent page, immediate working example, discoverable internal entry points, useful share preview, clean recommendation URL, bounded usage signals, production and indexing checks.

Self-check A: a new generic tool directory or many near-identical keyword pages would not establish a reachable audience. Build one substantive video-scoping entry per language and reuse the existing tool.

Self-check B: preview clicks, copied links and recipients are not customers, retained users or proof of a viral loop. Keep counters anonymous and bounded; retain separate real-task evidence gates. These are self-checks, not independent reviews.

## Observed baseline

| Source | Window | Observation | Interpretation |
|---|---|---|---|
| Google Search Console, `sc-domain:baipiaoji.com` | 2026-09-01–09-28, settled GSC reporting dates | 704 impressions, 1 click, 0.142045% CTR; preceding 28 days 851 impressions and 17 clicks | Existing search distribution is weak. The quote tool launched October 1; these numbers cannot test its demand. |
| Live `/api/reach`, retrieved 2026-10-01 08:23 UTC | Since September 3 through current partial October 1 UTC | 392 client-reported external-referrer page-view events; 18 calc events, 7 video events; no quote event count present | Events, not verified people. Different timezone, date window and unit from GSC; no cross-source conversion calculation. |
| Actual client evidence | At this release | No collected qualified-creator sample, verified customer handovers, recurrence or quote-product revenue | Technical QA is excluded. Demand remains unverified. |

## Implemented distribution and activation

- `/studio/video-quote` and `/en/studio/video-quote`: six scoping questions, explicit extra-format/revision items, fictional arithmetic, customer handover steps, spreadsheet-fit guidance and limitations. Direct customer-demo CTA before personal data entry.
- Existing video hub, homepage, discovery registry, search index, sitemap and `llms.txt` expose relevant entries. No new domain or unrelated fleet changes.
- Builder starts with “Your client changes the scope. The quote updates.” A first-screen preview works before registration or setup. `template=video&demo=1` opens a working client example; creator defaults survive preview edits.
- 1200×630 localized Open Graph/Twitter PNGs show the actual scope-change example. The 120/30 rates are explicitly fictional, not market recommendations.
- Recommendation copies only the public tool URL with `source=share`; it never copies the current personal quote fragment. Customer summary/remix and intentional link/file sharing remain available.
- `/api/reach.quote_signals` and existing daily `data/reach.json` export retain action counts and entry labels. Server allowlists reject arbitrary event-path content; failed reads stay null. The query uses the existing partial event index and cache.

## Read the signals without inventing a funnel

`builder_open`, `demo_preview`, `own_edit`, `own_ready`, `file_generated`, `link_copied`, `client_open`, `summary_copied`, `summary_generated`, `remix`, `tool_link_copied` are once-per-action-per-document events. Preview may include a creator's own configuration, not just samples. `own_ready` is a creator confirmation, not independently verified client work. Reloads can repeat events; blocked/lost events and unlabeled automation are possible. There are no user IDs or joins, so do not report a person conversion rate or retention from these totals.

`source` accepts only direct, home, video-guide, video-hub, share, youtube, tiktok, community and client. These are editable entry labels, not verified traffic sources. Older events appear as legacy. CI markers, known automated browsers and DNT/GPC are suppressed; portable exports do not measure use. Client configuration, price, brand, fragments, cookies and referrer URLs are not sent.

At the next existing review, read entry and action counts first. No entries means an unresolved distribution problem. Repeated entries with few previews/edits justify inspecting positioning or first-use friction; they do not alone prove a market rejection. Copies without independent customer evidence justify checking actual handover barriers, not expanding a platform.

## Unchanged decision gate

`bpj-quote-studio-handover-1029` remains due October 29: recruit/observe 10 qualified creators with current real quotation tasks; at least 5 own configurations, 3 verified real-client handovers and 3 second-task reuses. A qualified creator supplies voluntary first-hand evidence of their own task; public records contain only aggregate counts or redacted notes, never private client information. Insufficient qualified reach is insufficient evidence. With sufficient trials and fewer than 3 handovers, stop feature expansion and revisit the task. Without reuse, pause the subscription thesis. Paid-product work still requires real willingness to pay for delivered functionality.

No new recurring job was created. Existing daily exports and the fleet decision register carry this measurement; no claim that a later review has already happened.

## Ready-to-use campaign copy — not posted

External posting, direct outreach and ads were not performed. These drafts can be adapted to a relevant channel after checking its rules and obtaining authorization to publish. Do not post unsolicited promotional replies or imply community endorsement.

**Chinese post**

客户说“再加两个版本”，你还在重新发一张报价表吗？我做了一个免费的互动报价页：把剪辑条数、额外画幅和修改轮次列清楚，客户自己选数量，再把需求摘要发回原来的聊天。无需注册，可以先操作示例，再换成自己的单价。示例金额是虚构的，不是市场指导价。它不收款、不签合同。欢迎有真实接单任务的剪辑师试用，并告诉我哪一步不适合你的工作。

https://baipiaoji.com/studio/quote-builder?template=video&demo=1&source=community

**English post**

“Can we add two more versions?” I built a free interactive quote page for that conversation. Set your edit count, extra formats and revision rounds; clients adjust quantities and copy an itemized scope back to your existing chat. Try the example before entering your own rates. No signup. Sample prices are fictional; this is not a payment or contract tool. If you have a real editing project to quote, I would like to learn where this does or does not fit your process.

https://baipiaoji.com/en/studio/quote-builder?template=video&demo=1&source=community

**Channel links, for an authorized future post**

- YouTube: `https://baipiaoji.com/en/studio/quote-builder?template=video&demo=1&source=youtube`
- TikTok: `https://baipiaoji.com/en/studio/quote-builder?template=video&demo=1&source=tiktok`
- Share a guide rather than a demo: `https://baipiaoji.com/en/studio/video-quote`

A future video should show continuous real interaction: scope 3 → 5, total 390 → 630, edit own rates, copy the customer link. Follow the repository's video production standard; no video is claimed as delivered here.

## Sources and inference limits

- [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features), checked October 1: ordinary discoverability, internal links and accessible text remain relevant; special AI markup is not required and indexing is not guaranteed. `llms.txt` here is an existing navigation surface, not an asserted ranking mechanism.
- [Tally founder account: growing to $4m ARR](https://blog.tally.so/how-we-grew-tally-to-4m-arr-fully-bootstrapped/), October 15, 2025: free use and shared-form branding are described as acquisition mechanisms. This is a founder case study, not causal evidence that BPJ will grow or monetize similarly.
- Connected GSC property summary and live BPJ `/api/reach`, retrieved October 1. Raw customer or account records are not committed.

The choice to focus on video scope changes is a product/distribution hypothesis, supported by the existing video surface and a concrete workflow. It is not a measured market-size or validated demand claim. Search submission and an HTTP 200/202 response do not prove indexing or traffic.
