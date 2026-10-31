# TDS product and commercial context — version 6.0 (2026-10-31)

The current experiment targets organizers who already host collector meetups. The product now implements an organizer template, explicit wanted/offered preparation card, and a read-only share recipient flow that starts a new card with empty personal lists. Browser and MCP share the same core; production release 2.6.0 is verified, including the official SDK workflow, daily health report and active/latest Registry readback. Receipts: https://github.com/f-tiger/agi-site/pull/220 and https://github.com/f-tiger/agi-site/actions/runs/41217960707. Ordinary participants need no MCP setup.

Owned entry points ship with this release. Two retailer invitations are prepared privately but unsent; no partnership or external adoption is claimed. The next learning gate is one independently confirmed distributing organizer, ten participants completing real tasks, and later-event organizer reuse. These are exploratory gates, not forecasts. The existing daily report now checks measurement health and suggests the next review focus; it does not autonomously contact people or turn anonymous actions into users.

Free preparation remains available without an account. No paid offer, subscription, marketplace, attendance registration or automated matching is introduced. Revenue and repeat use require separate real evidence. Current plan: `data/marketing/tds-daily-plan.json` at repository root.

# Historical context — version 5.0 (superseded by the event workflow above)

**Document version:** v5
**Last updated:** 2026-10-31

**Current direction:** the owner's latest instruction is “Mcp，工具化，而不是一个无用的站点”. Prioritize a real collection task completed inside an MCP-compatible assistant. Release **2.5.0 is deployed and production-verified**: the official SDK completed the HTTP workflow and the existing Registry entry reads back active/latest. Receipts: https://github.com/f-tiger/agi-site/pull/215 and https://github.com/f-tiger/agi-site/actions/runs/41215167670. These checks do not establish external adoption. The repository setup and acceptance guide is `mcp/README.md` relative to the site root.

**Daily execution:** use the repository-root `data/marketing/tds-daily-plan.json` current experiment for 2026-11-01 through 2026-11-14 UTC, with a review on 2026-11-15. If deployment slips, record the real first complete day and observation duration. Keep the previous search experiment as history. This plan does not create or activate a scheduler. Native source checks, quotas and release scheduling remain unchanged. Separate drafted, published, called, used again and paid evidence; private account metrics and identities stay outside the public repository.

**Product and first task:** TDS provides source-backed collection comparisons through a remote HTTP MCP endpoint. `search_collection_series` finds a named SMISKI or Sonny Angel series; `prepare_collection_checklist` compares a collector-supplied list and returns owned, not-marked-owned, explicit wanted and unmatched names with source, check date and copyable Markdown. Example: two supplied Museum names leave four not-marked-owned entries in the current six-name catalog. This is not proof of a complete official set. The existing probability, budget, display and browser collection tools remain separate useful tasks.

**Primary audience for this experiment:** SMISKI/Sonny Angel collectors who already use an MCP-compatible assistant and want to compare a named series in that conversation; developers who are building a collector assistant and can test that workflow. General collectors are not assumed to know MCP or want to install a client. Existing checklist visitors, Labubu probability users and gift buyers remain browser audiences, not verified MCP adopters or paying customer counts.

**Audience access hypothesis:** make the concrete Museum task, endpoint and install/check instructions discoverable in the existing public `/for-agents` pages, repository README and official MCP Registry after successful publication. These are accessible entry points, not proven customer channels. Use voluntary external trials and feedback to learn whether the task is useful; count an actual external task separately from installation, assisted QA and a directory listing. Do not promise ChatGPT automatic installation or AI recommendations. Reddit demand research does not waive community rules: r/smiskis prohibits AI-written/edited content, r/SonnyAngel restricts external promotion and r/Labubuswap forbids ISO/service ads. No new paid promotion or unsolicited message is implied.

**Free value and privacy:** the MCP result can be used directly in the conversation without saving a web collection. The user chooses which names the assistant sends to TDS for computation; application telemetry does not retain those arguments. The assistant provider has its own data handling. MCP cannot read or update the browser collection or provide cloud sync. Existing persistent browser checklists, quantities and JSON/CSV backups remain device/browser-local; clearing data can remove them. A not-marked-owned entry is not a wishlist item, repeated input is not a quantity or trade offer, and the catalog may omit secrets/variants. No ownership, authenticity, stock or value verification is offered.

**Paid value and readiness:** existing disclosed Amazon US/DE accessory links are the available revenue path. They are search results, not tested recommendations or a live price/stock feed. The new release opens no subscription, checkout, ad spend or cloud service. Premium sync/reminders may only be offered after repeat use, data reliability and a working payment/delivery path are demonstrated. Existing memberships are independent.

**Alternatives:** an assistant reading official series pages, a spreadsheet and manual comparison can solve the same immediate task; the MCP workflow must earn its setup cost. Blind Box Tracker and hobbyDB remain collection-record alternatives; Rebrickable illustrates user assets plus a maintained catalog and BrickEconomy illustrates data-led repeat use. Public evidence and traffic-estimate limitations: `docs/tds-competitive-research-2026-10-11.md`.

**Positioning hypothesis:** receive an inspectable, source-linked collection comparison inside the assistant the user already uses, with unknown names and catalog limits visible. MCP support alone is not a moat. Test whether this removes enough manual comparison work to justify connection and a second real task; no customer interview, testimonial or product-market fit is established by shipping tools.

**Measurement:** separate discovery visits, configuration checks, successful tool calls, voluntarily confirmed independent external trials, repeat task use and merchant-confirmed commissions. Anonymous tool counters are actions, not unique people or retention cohorts; a two-call workflow can create multiple events. Exclude SDK/browser QA, samples and maintainer self-tests from adoption. Missing or failed telemetry is unknown, not zero. Public-source read dates are not release dates. Existing web saves, exports and affiliate clicks retain their own definitions; do not invent a cross-source conversion rate or revenue attribution.

**Current learning gates:** seek 3 independently confirmed external trialers completing their own collection task, including 1 returning to complete another real task, during the 14-day window. These are chosen exploratory gates, not a statistical test, a forecast or proof of paid demand. Keep opt-in evidence private; do not infer people from anonymous calls or add fingerprinting. If fewer than 3 people can be reached, the result is insufficient acquisition evidence; inspect the reachable audience and setup path before expanding features. If people try but cannot finish, fix the evidenced blocker. If the gate is met, continue one focused iteration and learn why the repeat task mattered; do not launch a subscription on that basis.

**Historical browser learning gates:** the previous 28-day exploration sought 100 qualified collection-page sessions, 20 successful checklist saves and 5 collection exports as independent absolute thresholds, not a computed conversion rate. Keep that experiment's evidence separate from the MCP window. The paid-service gate remains unchanged: at least 5 independently confirmed repeat users requesting the same persistent capability and 3 unrelated buyers completing a real paid pilot, plus a functioning payment/delivery path. Merchant reporting is required for revenue attribution; none of these operational gates establishes statistical confidence.

**Changelog**
- v5 (2026-10-31) — Repositioned the active experiment around real MCP collection tasks for existing assistant users; added setup, privacy and catalog limits, separated anonymous calls from externally confirmed use, and set a 14-day adoption review without reactivating paused automation.
- v4 (2026-10-11) — Focused on saved collection tasks, repaired the daily publication bottleneck, connected high-intent pages to existing purchase planning, and documented measurable stop/scale gates without claiming growth.

The previous version and historical decisions follow for traceability.

## 2026-10-02 native daily series expansion

TDS now owns its scheduled growth through the existing GitHub Actions 07:20 UTC release. No assistant session or paid model is required. Scope starts with official SMISKI figure and Sonny Angel regular-series catalogs. Up to two verified series per UTC day get EN/DE/ZH checklists, user-supplied printed-probability tools and links to budgets/display planning. Other brand guides remain separately curated. Daily checking does not imply daily new products, stock, equal odds or guaranteed search traffic.

Free repeat-use value: a real named checklist and a calculation before the next purchase. Source links remain unmonetized; no new paid offer or checkout. Existing disclosed affiliate paths are unchanged. Anonymous calculator completions are measured separately from purchases, and no checklist selections or probability inputs leave the page. Discovery uses homepage/brand links, sitemap, public JSON/text, the existing registered MCP catalog and post-deploy IndexNow. See root `docs/tds-native-daily-2026-10-02.md`.

# TDS product and commercial context — version 3.0

Updated 2026-10-02. Current owner direction supersedes the historical document-first positioning below.

The Doll Scout is an independent collectible-toy discovery and decision site: Labubu / THE MONSTERS, SKULLPANDA, Jellycat and Sonny Angel plus SMISKI, HIRONO, DIMOO and MOLLY form the eight-brand guide set, with free probability, capped-budget, duplicate-progress, display-fit and collection tools. Audience: collectors and gift buyers. Repeat use and paid demand remain hypotheses. The homepage is playful and visual, benchmarked against five large toy sites; brand color stays white/black/red with colorful original illustrations.

General digital utilities are aggregated at BPJ /studio/toolkit; TDS dedicated digital URLs remain available and the old home directory is /document-tools. No abrupt bulk redirects. Existing official sources, no fabricated rankings/prices/stock, no branded mascot artwork, and the permanent retirement of former explicit content remain release requirements.

Free value: choose a series, compare the purchase mode, find official sources, calculate odds and organize a collection. Revenue path: existing disclosed US/DE affiliate routes. New brand-source links do not earn commissions. No new paid offer or checkout was opened. Existing collector membership and digital tools remain separate. Traffic and tool actions do not establish revenue or profitability.

Evidence: GSC URL inspection on 2026-10-02 reports /, /rarity and /checker indexed; the sampled retired vendor URL is not found. SafeSearch/manual-action/security status remains unverified. Sources, five-site traffic-estimate scope, rollout contracts, actual verification and 42-day learning gate: docs/tds-collector-relaunch-2026-10-02.md at repo root.

Changelog: 3.0 (2026-10-02) expands the brand/task architecture, adds two shared browser/MCP calculators, source methodology and three-language field guides. September GA4 measured 67 production-domain sessions (55 direct, 10 organic search, 1 AI Assistant, 1 unassigned), zero recorded key events/revenue; historic gaps and consent limits prevent a complete traffic or revenue conclusion.

Changelog: 2.0 restores multi-brand collecting and BPJ aggregation by owner instruction; 1.x below records the September digital experiments and must not automatically override current homepage ownership.

## Historical version 1.x

# TDS product and commercial context

Updated 2026-09-25. Site-scoped; the root fleet context remains separate.

Owner goal: actively explore tools, consensus mechanisms and financial workflows, aiming for monthly revenue above 10,000. Currency unspecified. Planning uses CNY 10,000 with a separate USD 10,000 scenario, never an income promise.

Current product: TDS Document Scout, free local PDF preflight, comparison and extraction. English default; explicit German and Chinese routes. Shared TDS white/black/red Helvetica design and visible Home links.

First bounded commercial experiment: portable client delivery records for small agencies and digital service teams. A real job is keeping the exact delivered files, scope references and client response together. The tool produces a SHA-256 file inventory and user-entered notes as JSON/HTML; it verifies file equality only. It does not authenticate senders, receipt, consent, time, ownership or payment authorization. No Bitcoin anchoring is implemented.

Audience hypothesis: teams doing at least five client handoffs a month, with revision or evidence preparation overhead. Buyer is the agency owner/operations lead; occasional consumers may use the free tool but are not the subscription ICP. Not yet established through interviews or payment.

Alternatives: email plus Drive/Notion; free hash tools/OpenTimestamps; GoVisually/Filestage approval systems; Stripe Smart Disputes and Chargeflow for disputes. Local processing or a hash alone is not a moat. The specific gap (portable cross-client records without requiring every recipient to register) is a hypothesis, not a validated differentiator.

Paid concept: $79/month for a shared review history, branded handoffs and team roles; NOT built or offered for purchase. $149 one-off workflow setup is an internal price experiment only, not an available service or MRR. Current UI records anonymous price preference and prior 30-day handoff frequency, including negative responses. Votes are not leads, orders, unique buyers or willingness-to-pay proof.

Evidence on 2026-09-25: first-party snapshot contains 4 doc_view actions, no own-file task completion and no document payments. New document direction launched the same day. GSC/GA4 runner credentials missing in run 36129624063. GSC Wizard connection subsequently confirmed, but query methods did not appear in this session. Search indexing remains unverified. Old member endpoint ready:false; membership does not add document features.

Demand research: docs/tds-consensus-revenue-2026-09-25.md at repo root contains decision and sources; docs/tds-trends-2026-09-25.json stores observed Trends rows. Broad Trends terms cannot establish paid market size. Product Hunt listings are supply signals. Reddit posts are unverified anecdotes. Existing competing prices are not proof of our revenue.

Consensus aspiration: published format, independently repeatable checks, portable exports, then consent-based counterpart participation and audited correction rules if buyers require them. Earn reputation from verified work; do not tie claims of monetary value to serial numbers, referrals, manufactured scarcity or fabricated users. No token sale, investment returns or cash custody is part of the current tool.

Distribution: present the new task from the homepage and PDF tools, use crawlable pages plus accurate metadata/plain-text capability records, retain source citations, and share only public tool links. Public posts, messages and paid campaigns require actual channel access and appropriate authorization; staged text is not published marketing.

Learning gate by 2026-10-23: >=100 qualified target visits (GSC/GA4/account evidence needed, not anonymous counters alone), >=20 own-file exports, >=5 verified repeat-task teams, >=3 unrelated paid pilots and positive contribution before team SaaS expansion. These are chosen experimental gates, not industry standards. If distribution is insufficient, fix acquisition rather than declaring no market. If target users prefer their existing workflow, stop expansion. No automated future execution is implied by this document.

Later same-session diagnosis: D1 document-stats returned daily_limit after bounded error classification deployed. Successful stats/pulse aggregates now cache 5 minutes and document stats use one grouped query. Existing free quota resets 00:00 UTC; Cloudflare upgrade is a new expense requiring authorization. Browser and static product checks passed; backend health and new product revenue are still unverified.

Second iteration, 2026-09-25: recipient verification at /verify-file (EN/DE/ZH) is a distribution experiment, not a validated new market. References contain only SHA-256 plus byte length in a URL fragment; no file names, notes, identity or time. Readable delivery exports link to checks. Public format and downloadable offline CLI allow independent comparison. No sender notification, receipt, acceptance, reputation or Bitcoin attestation is implied. Free substitutes exist. The expanded finance/consensus comparison and conditional growth model are in docs/tds-consensus-growth-2026-09-25.md. Commercial price proposals remain unavailable; no new subscription or external marketing post authorized by repeating the revenue goal.

2026-09-26 operational update: the existing release passed all production gates after quota reset (run 36203664890). At 00:39 UTC document-stats returned ok:true, query_rows_read:3538, four prior-day doc_view actions and no own-file completion. This is current backend recovery, not acquisition or revenue proof. No paid upgrade was purchased.


2026-09-27 owner correction: expand beyond PDF with actual different tool categories. TDS now presents images, text/data, time/collaboration, file delivery and PDF. New free local tools are image resizing/conversion, exact-number JSON validation/comparison, and time-zone meeting planning with calendar export. The audience broadens provisionally to people preparing digital assets, configuration/data and cross-border meetings. This is a product-scope experiment, not validated demand or a new paid offer. BPJ already has creator/product-image workflows; this TDS image tool handles local web-file preparation. Existing paid delivery concepts remain unbuilt. Current GSC and release evidence lives in docs/tds-search-recovery-2026-09-27.md and docs/tds-non-pdf-tools-2026-09-27.md at repository root; earlier missing-GSC-credential notes are historical.


2026-09-27 AI expansion, requested explicitly by the owner: three real local-model tools join the nine deterministic utilities. Portrait matting (MODNet), English short-audio transcription (Whisper Tiny English) and English extractive highlights (MiniLM embeddings) run in a user-started browser worker. Twelve tools/six categories; AI shown first. Download size, network providers/cache, English-only language scope and output limitations are disclosed. No cloud inference spend or new paid offer. Local privacy and source-linked text are product hypotheses, not a validated moat or proof of demand. All acquisition/revenue claims still require measured evidence. See docs/tds-ai-tools-2026-09-27.md.

## 2026-09-27 revenue-oriented resource expansion

Owner requested prompt optimization, adversarial execution, a separate open-source section and YouTube tool introductions. Home now has Online tools / Open-source tools / Video tutorials entry points. The 12 functional tools remain distinct from curated external resources. `/open-source` covers Upscayl, Whisper, Ollama, OBS Studio, Audacity and Shotcut; `/videos` contains three credited videos with original TDS exercises and local TXT checklist downloads. All EN/DE/ZH: 93 generated pages, 90 document-sitemap URLs.

Existing collector membership does not unlock AI or resource features. `/creator-kit` is an optional, task-relevant equipment buying checklist using the existing US and DE Amazon tags, with a clear affiliate disclosure and free alternatives first. No new paid plan, sponsor booking or inference spend was opened. Directory visits, player loads, checklist downloads, tool referrals and affiliate clicks are separately bounded anonymous actions. Only actual merchant commission reports establish revenue; none was observed for this release.

Data/copy/pages live in `scripts/documents/growth-{data,copy,pages}.mjs`, with public `document-assets/resource-library.json`. Video metadata was verified with YouTube oEmbed/watch metadata and project sources; older tutorials retain actual dates and interface caveats. Video players connect only on explicit load, with an external fallback. This consent interaction may limit video rich-result eligibility; VideoObject markup does not guarantee indexing or citations. Source review date does not claim the desktop apps were individually tested.

Release and commercial stop/scale criteria: root `docs/tds-resources-revenue-2026-09-27.md`. Do not inflate the resource count into a tool count or replace the free tools with irrelevant collector upsells.
