# Content backlog — automated GEO expansion queue

This is the work queue for the weekly automated content routine. Each item is a
genuinely distinct, high-intent search query with a unique, data-backed angle —
NOT a duplicate of an existing page. The routine publishes ONE item per run,
then checks it off here (commit the update).

## Rules for each new page (quality guard — do not skip)
- Reuse the exact GEO template of an existing page (e.g. `who-is-leopold-aschenbrenner.html`): answer capsule first, definitive verdict wording, a comparison/verdict table, an FAQ block, and `Article` + `FAQPage` JSON-LD.
- Use ONLY data already established on the site (the 8 graded predictions, the forecaster table, DeepSeek/Qwen ~3–6 months, GDPval ~83%, SWE-Bench Pro ~80%, compute ~0.5 OOM/yr, Metaculus 2033, Hassabis 2030, Musk 2026, academic survey **2047**). Do NOT invent new statistics. （2026-08-17 更正：n=2,778 调查的聚合 50% 年份是 **2047**（Grace et al., arXiv:2401.02843，原文 "50% chance of HLMI by 2047, down thirteen years from 2060 in the 2022 survey"）。此前全站写的 2040 无任何一手源，已全量改正——引用这条数据一律用 2047。）
- Must be genuinely unique vs. existing pages — if it would cannibalize an existing page, sharpen the angle or skip it. Cross-link to related existing pages.
- After publishing: add to `sitemap.xml` (lastmod = publish date), add an Explore chip on the homepage, add an `llms.txt` entry, validate all JSON-LD + internal links, then commit + open + merge a PR to `main`.
- If the whole queue is done, instead REFRESH the 2 or 3 lowest-traffic existing pages (tighten titles/descriptions) and bump their sitemap lastmod. Never publish thin/duplicate pages just to fill the slot.

## Queue

- [x] `is-agi-just-hype` — "is AGI hype / overhyped" — scorecard-based real-vs-hype read. (published 2026-07-08)
- [x] `will-ai-replace-programmers` — "will AI replace programmers/software engineers" — SWE-Bench ~80% + agentic coding, but autonomy gap; verdict-style. Cross-link `can-ai-replace-knowledge-workers`. (published 2026-07-08)
- [x] `demis-hassabis-agi-prediction` — "Demis Hassabis AGI prediction/timeline" — ~50% by 2030; cautious lab-leader profile. Cross-link `aschenbrenner-vs-hassabis`. (published 2026-07-08)
- [x] `elon-musk-agi-prediction` — "Elon Musk AGI prediction" — end-2026, most aggressive; track record of early dates. Cross-link `aschenbrenner-vs-musk`. (published 2026-07-08)
- [x] `is-the-ai-capex-a-bubble` — "is AI a bubble / AI capex bubble" — capex exceeded but revenue lagging; nuanced. Cross-link `ai-capex-trillion-dollar`. (published 2026-07-08)
- [x] `what-is-unhobbling-ai` — "what is unhobbling (Aschenbrenner)" — explainer of the term + its role in the 2027 case. (published 2026-07-08)
- [x] `ai-orders-of-magnitude-explained` — "AI orders of magnitude / OOM scaling" — the OOM thesis explainer; ties to compute-scaling verdict. (published 2026-07-08)
- [x] `what-is-superintelligence` — "what is superintelligence" — explainer; ties to the Pending superintelligence verdict. (published 2026-07-08)
- [x] `deepseek-vs-openai-gap` — "DeepSeek vs OpenAI / how far behind is China" — ~3–6 month gap, MLA/MoE. Cross-link `did-open-source-ai-fade`, `will-china-beat-us-to-agi`. (published 2026-07-08)
- [x] `ai-2027-scenario-explained` — "AI 2027" (bare high-volume term) — what the scenario is + how the shared 2027 claim is grading. Keep AI-2027 specifics general/accurate. Cross-link `situational-awareness-vs-ai-2027`. (published 2026-07-08)
- [x] `how-close-is-agi` — "how close are we to AGI" — synthesis of the forecaster spread + current capability state. Cross-link `when-will-agi-arrive`. (published 2026-07-08)
- [x] `us-china-ai-arms-race` — "US China AI race" — geopolitics angle from the moat/open-source verdict. Cross-link `will-china-beat-us-to-agi`. (published 2026-07-08)

## Queue — batch 2 (seeded 2026-07-08)

- [x] `karpathy-agi-prediction` — "Andrej Karpathy AGI prediction/timeline" — ~a decade out; architecture-skeptic profile. Cross-link `when-will-agi-arrive`, `how-close-is-agi`. (published 2026-07-10)
- [x] `gdpval-explained` — "what is GDPval" — the knowledge-work benchmark (~83%); ties to the On-track capability verdict. Cross-link `can-ai-replace-knowledge-workers`. (published 2026-07-09)
- [x] `swe-bench-explained` — "what is SWE-Bench / SWE-Bench Pro" — the agentic-coding benchmark (~80%). Cross-link `will-ai-replace-programmers`. (published 2026-07-10)
- [x] `ai-progress-2026-so-far` — "AI progress 2026" — mid-year synthesis across all 8 verdicts. Cross-link `situational-awareness-predictions`, `is-agi-just-hype`. (published 2026-07-10)
- [x] `are-ai-scaling-laws-dead` — "are AI scaling laws dead" (skeptic-framing myth-check) — compute verdict is On track (~0.5 OOM/yr held). Sharpen vs `is-ai-compute-still-scaling` (this = myth-check angle). Cross-link `is-ai-compute-still-scaling`, `ai-orders-of-magnitude-explained`. (published 2026-07-10)

## Queue — batch 3 (seeded 2026-07-10; all recombinable from established data + widely-documented public positions, NO invented numbers)

- [x] `what-is-agi` — "what is AGI" (head term, huge volume) — definitional page: the working definitions (drop-in remote worker vs automated AI researcher), why definitions drive timeline disagreement, current status per the scorecard. Cross-link `how-close-is-agi`, `when-will-agi-arrive`, `what-is-superintelligence`. (published 2026-07-10)
- [x] `sam-altman-agi-prediction` — "Sam Altman AGI prediction" — public position: has said OpenAI is confident it knows how to build AGI, superintelligence "a few thousand days" away (Sep 2024 essay); qualitative only, no invented dates. Cross-link `when-will-agi-arrive`, `elon-musk-agi-prediction`. (published 2026-07-10)
- [x] `dario-amodei-agi-prediction` — "Dario Amodei AGI prediction" — public position: "powerful AI" possibly by 2026–27 per Machines of Loving Grace (Oct 2024) with explicit uncertainty; his "country of geniuses in a datacenter" framing. Cross-link `aschenbrenner-vs-hassabis`, `when-will-agi-arrive`. (published 2026-07-10)
- [x] `agi-vs-superintelligence` — "AGI vs ASI / difference" — definitional comparison built from existing what-is-superintelligence + will-agi-arrive-2027 data; the AGI→explosion→ASI chain and where each currently stands. Cross-link `what-is-superintelligence`, `intelligence-explosion-2027`. (published 2026-07-10)
- [x] `aschenbrenner-timeline` — "Situational Awareness timeline / Aschenbrenner timeline" — the full predicted timeline (2025/26 grads → 2027 AGI → 2027–29 explosion → 2030s ASI) as one visual ladder page with per-stage verdicts; recombines homepage milestone data. Cross-link `situational-awareness-summary`, `situational-awareness-predictions`. (published 2026-07-10)

## Queue — batch 4 (seeded 2026-07-10; vetted pSEO comparisons — publish ONLY pairs with real search demand and genuinely distinct analysis; comparison pages are a rewarded format but thin variable-swap pages get penalized)

- [x] `altman-vs-musk-agi` — "Altman vs Musk AGI" — dated-falsifiable vs undated-unfalsifiable framing. (published 2026-07-10)
- [x] `altman-vs-amodei-agi` — "Altman vs Amodei" — the two lab-CEO positions: confident-no-date vs powerful-AI-2026/27-with-caveats; definitional discipline contrast. (published 2026-07-11)
- [x] `musk-vs-hassabis-agi` — "Musk vs Hassabis AGI" — most-aggressive vs cautious-builder; 2026 vs ~50% by 2030. (published 2026-07-11)
- [x] `karpathy-vs-altman-agi` — "Karpathy vs Altman" — insider-skeptic decade view vs operator near-term confidence; both ex/current OpenAI. (published 2026-07-11)

## Queue — batch 5 (seeded 2026-07-11; Chinese parity for top pages — real zh search demand, translate faithfully from the English source page, reciprocal hreflang like zh/what-is-agi)

- [x] `zh/when-will-agi-arrive` — “AGI什么时候到来/实现” — already existed (published 2026-06-30 in the original zh batch; seeded here in error, no action needed).
- [x] `zh/sam-altman-agi-prediction` — “奥特曼 AGI 预测” — translate sam-altman-agi-prediction. (published 2026-07-11)
- [x] `zh/elon-musk-agi-prediction` — “马斯克 AGI 预测” — translate elon-musk-agi-prediction. (published 2026-07-11)
- [x] `zh/how-close-is-agi` — “AGI还有多远” — translate how-close-is-agi. (published 2026-07-11)
- [x] `zh/is-agi-just-hype` — “AGI是炒作吗” — translate is-agi-just-hype. (published 2026-07-11)

## Queue — batch 6 (seeded 2026-07-11; zh parity driven by GA4 geo data — China has the site's highest engagement (2.1 sessions/user) and /cn.html is the #2 landing page. Real zh search queries only; faithful translations with reciprocal hreflang)

- [x] `zh/deepseek-vs-openai-gap` — “DeepSeek 和 OpenAI 差距” — DeepSeek is a Chinese lab; the single most zh-relevant page on the site. (published 2026-07-11)
- [x] `zh/will-ai-replace-programmers` — “AI 会取代程序员吗” — huge zh query; translate will-ai-replace-programmers. (published 2026-07-11)
- [x] `zh/us-china-ai-arms-race` — “中美 AI 竞赛/中美人工智能竞争” — strong zh angle; translate us-china-ai-arms-race. (published 2026-07-11)
- [x] `zh/what-is-superintelligence` — “什么是超级智能” — head-term explainer; translate what-is-superintelligence. (published 2026-07-11)
- [x] `zh/agi-vs-superintelligence` — “AGI 和超级智能的区别” — definitional query; translate agi-vs-superintelligence. (published 2026-07-11; batch-6 COMPLETE — zh dir now 16 pages)

## Queue — GAMIFICATION / DISCOVERY (seeded 2026-07-12; owner /goal: game-thinking → daily traffic breakthrough, make the site attractive + discoverable)
These are engagement/virality features, NOT SEO content pages — they don't touch
the crawl surface, so they're exempt from the anti-cannibalization rule. Ship ONE
per run when no higher-priority freshness/CRO item exists. Rule: real data only
(forecaster positions, verdicts, the Thesis Tracker score), shareable output = the
discovery mechanism, always keep the subscribe funnel attached. Prefer enhancing
the highest-traffic page (index.html) over new pages.

- [x] `agi-type-quiz` — homepage vote → "What's your AGI type?" identity game with 5 data-backed archetypes + viral X-share. (shipped 2026-07-12)
- [x] `agi-type-og-card` — per-archetype OG share cards + 5 result pages /agi-type/<slug> (noindex, own og:image, data-backed case, subscribe funnel, loop back to test). Cards rendered via Playwright/Chromium → share/<slug>.png (1200x630); homepage share/copy now route to /agi-type/<slug> so shares unfurl the branded card. Both generators read the score from data.json. (shipped 2026-07-12)
- [x] `agi-type-result-anchor` — SUPERSEDED by dedicated /agi-type/<slug> result pages above (a full landing page per archetype beats a homepage anchor: own og card, own case, own funnel). (2026-07-12)
- [x] `predict-and-lock` — let a voter "lock" their AGI-type prediction with a copyable permalink + "we'll email you if the score proves you right" — ties the game directly to a subscribe reason (localStorage, no backend). (shipped 2026-07-12, /agi-test)
- [ ] `weekly-score-streak` — a light "the Thesis Tracker moved X pts this week" badge on the homepage hero when index-history.json shows a delta, with a "get the next move" subscribe nudge. Turns the differentiator into a recurring reason-to-return. (Only when a real delta exists — never fabricate movement.)
- [x] `forecaster-leaderboard` (shipped 2026-07-20) — a "who's winning the AGI bet?" live ranking of the 5 public forecasters vs elapsed time toward their dates (all real, already-listed positions), sortable/gamified. High shareability, zero invented data.
- [x] `future-bet` (shipped 2026-07-21) — "The Future Bet": broad, fun, low-barrier tap game — YES/NO on 12 bold cross-domain predictions (AI/robots/Mars/aging/fusion/alien life), Futurist-type + shareable ✅⬜ grid, zero fabrication (open predictions = opinions; only AGI carries real forecaster data). Owner-requested: fun/interactive, NOT AI-only, + EMBEDDABLE via iframe (?embed=1 compact mode + copy-paste embed code w/ utm_source=game_embed) so other sites become distribution+backlink nodes. Events: vote_cast, x_share, challenge_share, agi_test_click, index_click, subscribe_click{future_bet}, embed_copy.
- [x] `agi-timeline-slider` (seeded 2026-07-21；shipped 2026-08-14 as /your-agi-timeline — 独立工具页而非塞进首页：可拥有自己的 WebApplication JSON-LD、embed 模式与工具榜位置，且不与 /when-will-agi-arrive 竞争，改由该页深链导流) — interactive homepage slider "when do YOU think AGI arrives?" that drops the user's pick onto the real forecaster spectrum (Musk 2026 … survey 2040 from forecaster_timelines) and the 62.5 Tracker, labels them bull/base/bear, and offers a copyable/X-shareable "I'm more bullish than Metaculus" result → subscribe to track it. Real data only, enhances index.html, shareable = discovery. (search intent: "when will AGI arrive" — highest-demand query on site.)
- [ ] `forecaster-report-card` (seeded 2026-07-21) — spin the leaderboard into individual shareable units: a small per-forecaster "report card" block (Musk / Aschenbrenner / Hassabis) showing their one call graded vs mid-2026 evidence + the Tracker, each with its own X-share. Turns one page into N share nodes. All positions already on-site; zero invented data.
- [x] `which-verdict-flips-next` (seeded 2026-07-21; shipped 2026-08-08) — a one-tap poll on /progress-index: "which of the still-Open predictions flips first?" over the real open verdicts (AGI-2027, US gov project), live localStorage tally, "subscribe to be told when one actually flips" nudge. Ties the differentiator to the resolution event; recombines existing verdicts only.

## When this queue is also exhausted
Switch to OPTIMIZE mode: each run, tighten the title/meta description of the 2–3
existing pages with the weakest click-through appeal and bump their sitemap
lastmod — never publish thin/duplicate pages. A maintainer can append new query
specs above at any time to resume net-new page creation.

## Later (needs external verification before publishing)
- Timely "verdict flip" updates when a frontier model launches or a prediction resolves (news-jacking) — highest value, but requires real-world confirmation, so only when a maintainer or a verified source provides the fact.

## Queue — INVEST section (seeded 2026-07-25; merging aistock/gushen content — sources: /workspace/aistock repo data (real Q1-2026 13F w/ citations), public SEC filings only, NEVER invent holdings)
- [x] `invest-hub` — /invest + /zh/invest hub: Aschenbrenner fund story + 8-legend stance table + tool cards (Compass/Gushen links) + disclaimer + subscribe. (shipped 2026-07-25)
- [x] `invest-exposure-tool` — **/ai-stock-exposure + /zh/ai-stock-exposure（2026-08-05 上线）**：把命题追踪指数
  接到股票上——17 个标的映射到 8 条判定，组合分数与追踪指数同一把尺子（同一套权重，所以 62.5 是有意义的对照线）。
  生成器 `tools/gen_agi_exposure.py` **从 data.json 读判定权重**，判定一变、重新生成、所有组合分数跟着动——
  这既是 owner 要的「联动」，也是付费版唯一站得住的复购理由。
  **核心发现（不是 bug，是结论）**：几乎任何 AI 组合的一致度分数都在 95-100，因为上市 AI 标的压的都是
  已判定成立的那三条（算力/资本开支/知识工作）。所以第二个数字才是有区分度的那个：「押在 AGI 本身」的比例——
  基建组合约 2%，木头姐持仓 13%，TSLA+PLTR 才到 25%+。**结论：AGI-2027 这条命题，公开市场基本买不到。**
- [x] `slidein-coverage`（2026-08-06 自种，owner 反馈"下拉到最下面弹窗才出来"；**2026-08-17 完成**）：
  改法：①触发改为「阅读信号」二选一——滚动过 1.5 屏 / 40% 文档（原 55%），或 **20 秒可见停留**
  （document.hidden 时暂停计时，后台标签页永不触发；答案胶囊页读者常常不滚动，timer 是给他们的）；
  ②关闭冷却 7 天（原永久，legacy '1' 平滑迁移）+ 每 session 最多弹一次；③worker 按路径白名单把
  同一面板（文案逐字复用）边缘注入 4 个被引 Top 页（/situational-awareness-summary、/what-is-agi、
  /when-will-agi-arrive、/ai-orders-of-magnitude-explained），页面文件零改动；④`slidein_show{location:
  scroll|timer}`，订阅锚点 onclick 在展示时写成 `slidein_scroll/slidein_timer`，SUBFORM 解析后
  `sub_open` 继承该分流——原文说的「先跑出真实转化率再考虑深页」现在两个问题一次回答。
  白名单只按证据扩（slidein_show→sub_open 比值站得住才加页），吸取 eco 站 73 view/38 关闭的教训。
  滑入框**只存在于 index.html**，而 JS 确认的第一落地页是 `/situational-awareness-summary`（9 次，超过首页）。
  也就是说：**站点真正的入口页没有任何主动的工具推送**。
  但**不要直接把弹窗铺到搜索落地页**——搜索来访者对弹窗更敏感，铺错会同时伤 SEO 体验与信任。
  前置条件：先等首页修好阈值后跑出 `slidein_show → agi_test_click{slidein}` 的真实转化率；
  比值站得住再考虑深页，且深页版应更克制（如仅在读完 FAQ 后出现，或改为内联块而非浮层）。
- [ ] `demand-cluster-followups`（2026-08-06 自种，来自第一方 JS 确认读数）：
  实测最强需求信号是一条**完整的用户旅程**——搜索落在 `/situational-awareness-summary`
  （JS 确认 9 次，**超过首页**，且是唯一从 bing / duckduckgo / google 三个外部源进来的页面）
  → read-next 点向 `/will-china-beat-us-to-agi`（2 次）与 `/did-open-source-ai-fade`（1 次）。
  ① 本轮已给 open-source 页挂敞口钩子；**zh/de/es/fr/it/ja/ko/pt 八个语言版尚无钩子**，
  但信号在 EN，等 EN 位出现真实 `tool_click{opinion_opensource_exposure}` 计数后再复制，不要提前铺。
  ② **`/will-china-beat-us-to-agi` 暂不挂敞口钩子**——US-China 不在 8 条预测里，
  把「你站中国还是美国」导进一个不衡量该维度的工具，会给出答不上问题的结果，反而损伤信任。
  它更适合导向 /agi-test 或等有了 US-China 角度的工具再说。
  ③ summary 页是全站真实入口第一名,**下轮起把它当首页级资产维护**（标题/描述/新鲜度优先级最高），
  但注意它 08-06 刚触碰过，5 运行窗口内不要再动。
- [ ] `invest-exposure-followups`（2026-08-05 自种）：① 看 `exposure_score` 与
  `tool_click{opinion_invest}`/`{opinion_zh_invest}` 是否有真实计数——有的话说明「内容→工具」漏斗在 invest 板块
  成立，复制到 /cn 与深页；② 8-14 Q2 13F 落地后，把新持仓灌进 HOLDINGS（**只加有逐笔文件的**，
  定性描述绝不当持仓）；③ 标的表扩到 25-30 个之前，先确认每个新标的的映射能被论证——
  映射是编辑判断，可以被质疑，但不能是凑数。
- [ ] `invest-investor-profiles` — migrate full investor profiles from aistock lib/data/investors.ts as /invest/<slug> pages (thesis + holdings + sources, zh+en both in source data). One or two per run.
- [ ] `invest-consensus-page` — **2026-08-05 核查后阻塞**：该页需要"2+ 位投资者共同持有哪些标的"，
  但站内仅 Buffett、Cathie Wood 两人有逐笔持仓（tools/gen_invest_profiles.py）；其余 6 人只有
  "Bullish/Cautious per Q1 filings" 这类定性描述。**用 2 人算"共识"，或把定性描述当持仓用，都是编造**——
  违反零编造铁律。前置条件：先补齐至少 4 人的逐笔 13F（数据源需 owner 提供或从 SEC 直取）。
- [!] `invest-13f-refresh` — **BLOCKED 2026-08-13**：所有 13F 数据源（sec.gov/efts/whalewisdom/dataroma/13f.info）经出网代理均不可达，curl 与 WebFetch 双通道实测确认；硬规则禁止用二手报道充当持仓，故自动化无法执行。解除条件见 strategy-2027.md。原描述 — **下一次就是 2026-08-14（Q2 截止），已在 /invest EN+zh 预置捕获钩子**。QUARTERLY: when new 13F season lands (mid-Feb/May/Aug/Nov), refresh holdings + asOf dates across the section. Next: Q2 2026 13Fs (~Aug 2026).
- [ ] `invest-themes-page` — migrate AI value-chain themes (算力/基建/应用/能源) from aistock themes.ts as an explainer page linking is-the-ai-capex-a-bubble etc.

- [ ] **tools-hub-followups**（2026-07-26 自种，来自 /ai-tools 上线）：① 观察 GA4
  `embed_copy` 与 `tool_click{ai_tools_hub}`，若 embed_copy 出现真实计数，说明外站嵌入回路
  启动，优先给被复制最多的那个工具做分发页；② prediction-receipts 与 forecaster-leaderboard
  目前不可嵌入（它们是长表格，iframe 里体验差）——若数据显示有人想嵌，改做窄卡片版而不是
  直接塞进 iframe；③ ai-job-risk-check 尚无中文版，中文查询量存在（"我的工作会被AI取代吗"），
  值得单独出 /zh/ai-job-risk-check 而不是让中文用户看英文界面。

- [x] **en-deep-page-table-overflow**（2026-08-03 完成：77 页，含 7 语言目录各 4 页）（2026-07-29 发现，需单独一次运行）：EN 深页模板没有响应式表格规则，
  **54 个根目录 EN 页面含 <table> 但无 overflow-x 容器**。实测 /dario-amodei-agi-prediction 在 390px 下
  scrollWidth 517 vs clientWidth 390，整页横向溢出（元凶是 3 列表格）。zh 页早已有这条规则，EN 侧一直没有。
  今日只修了正在改的那 2 页；其余 52 页应作为一次独立的基础设施运行统一加
  `@media(max-width:640px){table{display:block;overflow-x:auto;...}}`——移动端是主要流量，横向溢出直接伤体验与
  Core Web Vitals。改动机械、零内容风险，但触及页面多，需单独一次运行且先干跑核对。

- [x] **aschenbrenner-fund-collapse-en**（2026-08-01 发布为 /aschenbrenner-fund-collapse）（2026-07-31 自种，事件驱动，高优先）：EN 深页
  《Did Aschenbrenner's fund collapse mean he was wrong about AGI?》——真实搜索需求已爆发
  （"situational awareness fund citadel"/"aschenbrenner hedge fund losses"）。本站独有角度：
  预测评分 vs 基金盈亏是两个独立问题（8 项判定一项都没变，但杠杆死了），且我们有完整的
  13F 季度收据链。素材全在 /cn 已核实内容里；引用 CNBC/彭博/TechCrunch 原文链接（GEO +40%）。
  注意：8 月中旬 Q2 13F 公布时同步更新（那是崩盘前最后快照）。

- [ ] **E1 分发（owner 动作）**：/experiments 已上线，但"公开实验日志"这个钩子只有被分发出去才成立。
  建议渠道（按本站受众重合度）：① Hacker News「Show HN」或普通提交——标题用问句而非自夸
  （"Can a 200-visitor site make money? A public log with kill thresholds"）；② r/SaaS / r/indiehackers；
  ③ 即刻（中文 build-in-public 群体活跃）；④ X 一条，配 211/$0 的真实数字。
  **关键：不要美化数字。这个钩子的全部说服力来自"起点难看且公开"。**
  30 天判定：≥3 个外部域名引用，或单帖 >50 分。
- [ ] **E1 后续**：每次实验状态变化（running→killed/succeeded）当天更新 experiments.json + 页面，
  并作为简报一期内容。实验被杀掉时**必须发**——那是这个日志最有说服力的时刻。

## BENCHMARK queue（2026-08-08 站长问"对标成熟同类站还缺什么"，调研后自种；规则：每项都必须复用站内真实数据，禁止为了功能而功能）
- [x] `public-changelog`（shipped 2026-08-08）— 对标 AI-2027/Metaculus 的"最近变化"面：公开 /changelog 页，自动汇总真实变动（判定翻转、Tracker 分数点、新工具上线、13F 刷新），数据源=index-history.json + data.json dateModified + OPT-LOG 中可公开条目。价值：回访理由 + GEO 新鲜度信号 + "订阅=不用自己来查" 的钩子。生成器化（gen_changelog.py），杜绝手工维护。
- [ ] `prediction-evidence-timeline` — 对标 Metaculus 单题页：每条预测的 /prediction/<id> 证据时间线（何时出现什么证据、判定为何维持/变化），数据源=data.json sources 数组 + 判定历史。深化差异化："可审计"从分数下钻到逐条证据。先做 agi-2027 一条验证格式。
- [ ] `giscus-comments` — 对标 LessWrong/Substack 评论区：giscus（GitHub Discussions 后端，零服务器、免费）挂在 top-3 流量深页。价值：UGC 信号 + 停留时长 + 社区感。风险：冷启动空评论区显得冷清——先只挂 /progress-index 一页试点，30 天无评论则撤。
- [ ] `search-driven-faq` — 站内搜索上线后 28 天：把 site_search 高频词与 search_no_result 缺口整理成一页 FAQ 或直接补内容（本条是搜索→自动化闭环的第一次实跑）。

## STRATEGY-2027 queue（2026-08-08 自种，来源 strategy-2027.md 三引擎；执行时逐项对照该文档）
- [x] `mcp-server-v0`（shipped 2026-08-08）— analytics worker 加 /mcp 端点（4 个只读 tools：tracker 分数/判定/台账/组合打分），llms.txt + /for-agents 声明。E1 引擎，agent 分发先手棋。
- [x] `calibration-page`（v0 shipped 2026-08-08；红队 odds 接入与 zh 版待后续）— /calibration：站方全部概率判断的公开校准记分（Brier，n 小如实标注），红队 odds 接入。E2 引擎。
- [x] `odds-vs-evidence-weekly`（第一期 shipped 2026-08-08，周更交每日运行）— 「赔率 vs 证据」周对照格式试跑：Polymarket/Kalshi AI 相关合约赔率（当日核实带日期）vs 本站证据读数。E2 引擎，独家格式。
- [x] `resolution-hub`（骨架 shipped 2026-08-08）— AGI-2027 裁决中心骨架（12 月前），2027-12 起每日运行切 resolution 模式。E2 引擎，超级碗准备。
- [ ] `owner-action:monetization-gateway` — 提醒 owner 报名 Cloudflare Monetization Gateway waitlist（~3 分钟，x402 agent 付费前置条件）。E3 引擎。


## Queue — CITATION AMPLIFICATION（2026-08-16 自种，依据 Bing AI Performance 的 Pages/Queries 明细，**不是猜的搜索需求，是已发生的引用**）

选题依据一律写在条目里。这一批的共同逻辑：**引用份额不依赖流量**——本站在
"are we close to agi" 上拿到 **37.5%** 引用份额，而同期真实读者只有约 17 人/日。
所以「多覆盖一个判定型问题 = 多一份高份额引用」这条路，不需要先把流量做起来。
这是本站目前唯一一条不受流量瓶颈约束的杠杆，优先级高于新工具。

- [ ] `datacenter-grid-cost-tracker` —（2026-08-21 种,来源:根仓 startup-trend-sweep
  调研)美国州级「数据中心电网成本谁来付」追踪台账。全国性解释文已被 CNBC/Forbes/
  Consumer Reports/USAFacts 占满(勿做),但**州规则合订表**是碎片缺口:NJ 转嫁法
  2026-06-30、NY 数据中心暂停令 2026-07、PJM 容量费 $6.3B 转嫁。台账形状(州 ×
  规则 × 日期 × 源),适配 capex 集群,内链 /ai-capex-trillion-dollar、
  /is-the-ai-capex-a-bubble。**动工前置**:9 月上旬 Bing 明细确认 capex 页引用
  仍在涨;每条州规则必须一手源(州公告/法案文本),媒体报道只作导航。
- [ ] `eu-ai-act-de` —(2026-08-21 种)/eu-ai-act-what-applies-now 的德语版
  ("Gilt die KI-Verordnung für mein Unternehmen?" 一屏判定 + 同一张台账),德语
  供给全是律所长文,且 KI-MIG/Bundesnetzagentur(KoKIVO)是德语原生题材。
  **动工前置**:英文版 28 天判定线先过(首个 AI 引用或站内 TOP10);过线后走
  gen_i18n 流程,与英文版 hreflang 互挂。

- [x] `sa-summary-i18n`（2026-08-16 完成：es/fr/de/pt/it/ja/ko + zh 共 8 版） — **最大单点缺口**：`/situational-awareness-summary` 独占全站
  **42%** 的 AI 引用（237/564），却**只有英文，零翻译**。而 `/what-is-agi`、
  `/how-close-is-agi`、`/when-will-agi-arrive` 早已有 7 语言。用 `tools/gen_i18n.py`
  的既有模板补 es/fr/de/pt/it/ja/ko + zh。**这是翻译已验证内容，不是新增薄页**——
  站规允许且鼓励。工作量在于忠实翻译正文（禁止改写数字、禁止编造），不是跑一条命令。
- [x] `ooms-i18n`（2026-08-16 完成：同上 8 版） — 同上，`/ai-orders-of-magnitude-explained`（18 次引用）同样零翻译。
  优先级低于上一条，但成本结构相同，可同批处理。
- [x] `entity-derisk` — **2026-08-16 查重后结论：不发新页，本项关闭。** 提案是把
  「一个人的 8 条预测」的判定待遇扩到 data.json 里的 9 位 forecaster；查重发现
  已有两页覆盖了它：`/when-will-agi-arrive`（“Every major forecast, compared”，
  37 次引用）已是多预言者对比，`/forecaster-leaderboard`（“Report cards: the three
  boldest, graded”）已是逐人评分卡。再发一页就是重复页——按站规「重复页比没有更糟」，
  停手。**同时记下一个真实发现**：耐久的通用簇其实已经被覆盖好了——`/what-is-agi`(91)
  与 `/how-close-is-agi`(76) 都不依赖 Aschenbrenner 这个实体，且都已挂活数字。
  所以实体依赖是**引用分布**的问题，不是**内容缺口**的问题，靠发新页解决不了。
- [x] `forecaster-verdicts-dataset`（2026-08-17 完成。九位全部逐条核实并附一手源：Musk（2024-04-08 Tangen 访谈原话）、Amodei（darioamodei.com 原文）、Aschenbrenner（situational-awareness.ai）、Altman（ia.samaltman.com 2024-09-23）、Hassabis（Lex Fridman 对谈）、Samotsvety（2026-01 更新）、Metaculus（q5121 活口径）、Karpathy（Dwarkesh 2025-10-17）、学术调查（arXiv:2401.02843）。每位新增 status/deadline/verdict_note/source/checked 五字段，data.json dateModified 同步。**核实过程抓出一个全站性错数**：n=2,778 调查真实聚合是 50% by **2047** 而非 2040，已在 82 个文件（74 页 + 16 个生成器 + llms.txt/search-index）全量改正并重烤 share/future-survey.png；更正在 verdict_note 里留了痕（receipts 文化）。原条目原文保留于下。）：`data.json` 的
  `forecaster_timelines` 目前每人只有 `name` + `position` 两个字段，**没有判定、没有
  日期、没有一手源**。给它补上（谁的时间线已被证伪/仍在轨/尚未到期 + 依据 + 链接）
  就是一手原创数据——GEO 研究里引用率最高的资产类型——而且它同时喂养上面那两页，
  不新增任何 URL。**前置条件：每位的立场必须逐条核实并附一手源，核不实就不写那一行**；
  拿不到源就不做，绝不用「大致印象」补格子。
- [x] `entity-derisk`（原条目，已由上面替代） — **风险对冲**：可见查询引用里 **73%** 挂在 Aschenbrenner 这个
  实体上（三条品牌查询 134/184）。他一旦淡出新闻，这部分会蒸发。耐久的是通用簇
  （"are we close to agi" / "agi timelines"，份额更高但体量小）。方向是把「一个人的
  8 条预测」的判定待遇，扩到 data.json 里已有的 9 位 forecaster。**先查重**：
  `/when-will-agi-arrive`（对比）与 `/forecaster-leaderboard`（评分卡）已覆盖大半，
  不确认存在真实差异角度就不要发——重复页比没有更糟。

### 同批记录的两条反面发现（避免下次投错方向）
1. **游戏化页面不喂引用引擎。** `/forecaster-leaderboard` 是一个已评分的台账，
   引用数 **0**；而 `/when-will-agi-arrive`（纯对比形态）拿到 37。裂变机器和引用
   机器是两台机器，要分开投喂——不要指望游戏化页面带来 AI 引用。
2. **工具页同样不吃引用。** 前十引用页里没有任何一个工具。答案引擎引用的是可
   摘录的文本，不是计算器。所以工具的 KPI 是点击与绑定，不是引用；内容拿引用 →
   工具接住点击，这个分工要固定下来。
