<!-- MONOREPO 迁移说明(2026-08-19,owner 决定) -->
> **本站已迁入公开 monorepo `f-tiger/agi-site`,路径 `sites/agiscorecard/`。**
> 部署 = push agi-site 的 `main`(deploy-agiscorecard.yml,path 过滤 + wrangler);
> 旧私有仓 f-tiger/agiscorecard 是历史档案(且其 main 仍连着 Cloudflare 构建,
> **再往旧仓推送会把线上回滚**,一律禁止)。本文档中的 Ship procedure 分支操作
> 相应替换为:在 agi-site 根目录 `git push origin main`。**公开仓红线**:
> owner-identity*/owner-trajectory* 只存私有仓+D1,永不入本仓;订阅者邮箱等
> 个人信息一律脱敏(详见仓库根 CLAUDE.md)。odds-snapshot.json 与 IndexNow
> 周任务已由本仓根 workflows(agi-odds.yml / agi-indexnow.yml)接管。

# agiscorecard.com — operating manual for automated sessions

Static site (no build step) tracking Leopold Aschenbrenner's *Situational
Awareness* predictions. **Pushing to `main` auto-deploys to Cloudflare.**
Owner goal: grow search traffic → build the email list → monetize. Sessions
are authorized to optimize autonomously — quality and restraint over volume.

## Standing goal (owner /goal, 2026-07-12): drive subscriptions, autonomously

The north star until met: **form real newsletter subscriptions (and thereby
revenue via beehiiv Boosts, ≈$1–3/qualified sub), fully autonomously, with a
site that is visibly DIFFERENT from competitors.** The differentiator is the
**AGI-2027 Thesis Tracker** (`/progress-index`, one auditable 0–100 score no
rival has). Every autonomous run should advance this: (a) protect + spread the
Tracker (keep it synced, funnel deep pages to it); (b) grow organic + AI-
assistant traffic (the daily content/GEO/freshness loop below); (c) maximize
the traffic→subscribe conversion — watch `subscribe_click` by location
(header/post_scorecard/progress_index/footer), and when GA4 shows a placement
winning, replicate it. Subscriber flow IS the revenue KPI. Do NOT churn (see
restraint rule) — one high-quality change per run compounds; ten same-day edits
look like spam to Google. Real subscriptions are traffic-lagged (weeks), so the
job is to keep the machine sharp and let the daily cadence compound.


## 已挣得的定位 vs 宣称的定位（2026-08-16，Bing AI Performance 实测）

宣称的伞是 Research / Play / Invest（下节），那是**变现的信息架构**。但 AI 答案
引擎实际引用的是一个窄得多的东西，这才是**已挣得**的身份：

> **带判定、带日期、带翻转条件的 AGI 预测台账。**

证据（30 天，Microsoft Copilots & Partners，Bing 自注抽样）：564 次引用，前十页
占九成，**全部是英文的「定义 / 现状 / 对比」型页面**；`/situational-awareness-summary`
一页独占 42%。工具页 0 引用，游戏化页 0 引用。

**由此固定三条判断，后续会话别再推翻：**
1. **引用份额不受流量约束。** "are we close to agi" 拿到 **37.5%** 份额时，真实读者
   只有约 17 人/日。多覆盖一个判定型通用问题就多一份高份额引用，**不需要先有流量**
   ——这是本站唯一一条绕开流量瓶颈的杠杆，优先于再造新工具。
2. **两台机器，分开投喂。** 内容（定义/现状/对比 + 一手判定 + 日期 + 一手源）吃引用；
   工具与游戏化吃点击、分享、绑定。`/forecaster-leaderboard`（游戏化台账）引用 0，
   `/when-will-agi-arrive`（纯对比）引用 37 —— 别再指望游戏化页面带来 AI 引用。
3. **引用不是流量。** 564 次引用同期只换来个位数 bing 点击（AI 答案本就 zero-click）。
   因此**每一个高引用页必须在首屏给出一个聊天答案装不下的东西**——带日期、会变、
   可逐条审计的活数字（62.5/100 + 八条翻转条件）。已在 `/situational-awareness-summary`、
   `/what-is-agi`、`/ai-orders-of-magnitude-explained` 落地，埋点 `index_click{*_live}`。
   **新发布的判定型页面一律照此办理。**

**已知风险**：可见查询引用的 73% 挂在 Aschenbrenner 这一个实体上，属人物依赖型资产；
对冲方向见 `content-backlog.md` 的 CITATION AMPLIFICATION 队列。

## Site IA & positioning (owner-approved 2026-07-25)

Positioning umbrella: **"The evidence layer for the AI era — track the predictions
(Research), test yourself (Play), follow the money (Invest)."** The Thesis Tracker
(62.5/100) remains the core differentiator. Sections:
- 📊 **Research**: / (scorecard) · /progress-index · /agi-questions · deep pages · /prediction-receipts
- 🎮 **Play**: **/ai-tools (+/zh/ai-tools) = the tools hub** · /future-bet (+/zh) · /agi-test (+/zh) ·
  /ai-job-risk-check · /forecaster-leaderboard. **Rule (2026-07-26):** every new interactive tool ships with
  (a) `WebApplication` JSON-LD (`isAccessibleForFree`, `offers` price 0, `featureList`, `isPartOf`→hub),
  (b) a row on /ai-tools **and** /zh/ai-tools, (c) `?embed=1` mode + a copy-paste iframe block if the UI
  fits an iframe (embeds are the only backlink engine that runs without owner action). **Owner rule (2026-08-03,
  "不是科普站"): content pages must FUNNEL into tools — every top-traffic deep page carries an
  OPINION HOOK (one-tap answer buttons deep-linking to /agi-test?pick=<slug>, which auto-reveals
  the result; gtag tool_click{opinion_<page>}). A passive "tools" link row is not a funnel; capture
  the opinion the article just created. Extend hooks to new risers as traffic shifts.** Embeddable today:
  /agi-test, /zh/agi-test, /ai-job-risk-check, /future-bet, /zh/future-bet, /matrix-odds,
  /zh/matrix-odds, and (on the Compass sub-site) /zh/track-record + /en/track-record — never
  claim embeddable on the hub for a tool that lacks the mode.
  **/matrix-odds (+/zh, 2026-08-16, owner:「制造一个预测 AI 导致黑客帝国情景的工具」)**:零编造
  规则下唯一诚实的形状——本站**不发布**这个剧本的概率,而是把它拆成五个必须依次成立的前提,
  前四环各自标注 data.json 里的真实判定与一手信源,概率由读者自己填,页面当场连乘。工具真正
  的发现在第五环(「它选择圈养人类并模拟世界」,也就是黑客帝国区别于普通 AI 失控的那一环):
  **正反两个方向都没有可证伪证据**,而整条链上证据最强的一环恰恰是最少有人争论的物理基建
  (capex 已超额兑现)。这个不对称与读者填什么数字无关,所以它是这一页真正可被引用的东西。
  两条不可放松的约束:①滑块默认 50% 必须显式说明「这是空白默认值,不是本站的估计」;
  ②方法说明里必须写明各环并不独立、相关性会让真实数**高于**乘积——一个只报好听结论的
  概率工具就是伪科学。生成器 `tools/gen_matrix_odds.py`,判定随 data.json 自动更新。
- 💰 **Invest** (merged from gushen/aistock repos 2026-07-25): /invest (+/zh) · /cn holdings story ·
  **/ai-stock-exposure (+/zh) = the first-party tool** · INVEST backlog queue; quarterly 13F refresh
  (~Feb/May/Aug/Nov). Public SEC 13F only. **Domain-merged tools (2026-08-08):**
  SunWatch = invest.agiscorecard.com (sunPredition repo, Worker custom domain; zh/en,
  Accept-Language negotiation, /method = 方法论 v2.1 八层纪律 incl. 第7层红队对抗审查) · Compass =
  compass.agiscorecard.com (aistock repo, Cloudflare Pages custom domain via its
  deploy.yml; old aichain-stocks.netlify.app + pages.dev links still serve). Gushen
  (gushen-4g2.pages.dev) still external-only.
  **Owner rule (2026-08-05, "网站与股票工具进行联动增强…未来可以收费或者订阅"):** the Invest section is
  the paid-product line, and the linkage that makes it defensible is the Thesis Tracker itself.
  `/ai-stock-exposure` maps 17 tickers to the eight predictions and scores a basket with the SAME
  weights the Tracker uses, so 62.5 is a meaningful comparison line rather than an arbitrary
  benchmark. `tools/gen_agi_exposure.py` reads those weights from `data.json` — **regenerate it in
  any commit that changes a verdict**, alongside gen_index.py / gen_badges.py / widget.html. That
  propagation IS the product: the paid tier is "get told the day the score moves", and it is worth
  nothing if the score does not actually move. Full plan (free vs paid, what is verified vs assumed)
  in `revenue-experiments.md` E11. Two standing constraints: holdings come only from line-by-line
  13F filings (qualitative stances are NEVER used as holdings), and no price is published for a
  product that does not exist yet.
  **Pro bridge (2026-08-13): `/ai-stock-exposure` (+/zh) is the site's most-used tool and now carries
  the only cross-link to a product with a real price** — SunWatch Pro at invest.agiscorecard.com
  (¥199/mo ≈ $28, USDT, no account). The block deliberately keeps the "basket-alert tier is NOT built
  yet" copy above it: two different products, never conflated. Events: `invest_tool_click{exposure_
  <lang>_sunwatch[_record|_btn]}` — this is the paid-conversion funnel to watch. **The ¥199 figure is
  copied from the sunPredition repo's pricing card; if that price changes, `tools/gen_agi_exposure.py`
  must change in the same run.** Deliberately quotes NO hit rate — the ledger recomputes itself in
  the other repo, so a baked number would go stale; link to /track-record instead.
  **"注册" = Telegram bind, not an email/password form (2026-08-13).** The site's one identity
  system that actually works is the SunWatch bot: `/start` registers a free subscriber (KV
  `free-subs`), `/start SW-CODE` binds Pro, `/status` reports tier. The exposure result panel now
  carries a one-tap bind — `t.me/sunwatchBot?start=b_<TICKERS>` — which registers the reader AND
  stores their basket (KV `baskets`). Rationale on record: the email form converted **0 of 246**
  pageviews, and a confirmation mail cannot be sent at all today (no `BEEHIIV_API_KEY`), so email
  is the one channel that cannot keep a promise. **Do NOT add an email+password registration form**
  — it is strictly more friction than the form already converting at zero.
  Two hard constraints on this path: ① Telegram caps the `start` payload at 64 chars, so a basket
  over ~10 tickers hides the button instead of watching a silently truncated one; ② the bind
  message promises exactly two things — the free daily preview and one message the day the Tracker
  score moves — and `notifyBaskets()` in the sunPredition worker IS that second promise. It reads
  `agiscorecard.com/index-history.json` (never re-implements the weighting) and fires only on a
  real change, with a first-run baseline guard. **If that function is ever removed, the bind copy
  must change in the same commit.** Event: `invest_tool_click{exposure_<lang>_tg_watch, label=basket}`.
  **抄作业成绩单 = 投资板块唯一「已验证赚到钱」的资产 (2026-08-16, owner:「让用户主动实现
  赚钱…而不是只是一个提醒，或者模拟」).** `compass.agiscorecard.com/{zh,en}/track-record` 回答
  所有 13F 网站都不答的那个问题:抄大佬的 AI 持仓过去真赚了多少。差异化全在方法论上——
  **用 13F 申报当天的收盘价建仓,不用季度末价格**(13F 滞后 45 天,季度末价格没有一个真人
  拿得到;拿它回测等于假装能穿越)。数据链:aistock 仓 `scripts/copy-homework.mjs` 在
  runner 上跑(沙箱够不到 sec.gov / query1.finance.yahoo.com),持仓来自 EDGAR 申报原文,
  价格用 Yahoo **复权**日线 —— Stooq 在 runner 上是 JS 校验页,已实测,别再换回去。
  它挂在 `edgar-13f.yml` 这一个季度性 workflow 上,不新增计划任务成本。
  **硬同步义务**:`lib/data/copy-homework.json` 每次重算(每年 4 次,13F 申报季),
  **同一次运行内**必须更新本仓 `invest.html` + `zh/invest.html` 里写死的那几个数字
  (含「截至 YYYY-MM-DD」)。一个把别人收益写错的页面比没有这个页面更糟。
  页面上四条反面说明与数字同屏、不进页脚:①只算 AI 切片不是整个组合 ②13F 看不见做空
  与期权对冲 ③「哪些算 AI」是本站编辑判断 ④单期价格覆盖不足 50% 直接跳过。
  **首页凸显(owner 2026-08-16「这个赚钱工具应该是在首页凸显」)**:`index.html` 与 `cn.html`
  在 #directory 之前各有一块独立的引流区,写死了德鲁肯米勒 +187.2% / QQQ +59.6% / 巴菲特
  +37.3%(跑输)。**它们受上面那条硬同步义务约束**——每季重算时,这两块和 invest 两页
  一起改,共四处。
  **它是工具,不是榜单(2026-08-16 补齐)**:计算器「如果当时我抄了,今天多少钱」选投资人
  (可多选)+ 起始申报日 + 本金,全部在浏览器里算;深链 `?who=a-_-b&from=YYYY-MM-DD&amt=N`
  双向绑定,`?embed=1` 出无壳嵌入版 + 带 `utm_source=widget` 的品牌回链。基准必须用
  **每位投资人自己那段窗口**的 QQQ 逐期复利(`leg.bench`),把全程基准套到更短窗口上会
  得出一个谁都没经历过的对照数字。已交叉验证:逐期复利精确还原全程 59.6% / 58.3%。
  四件套齐(交互 / WebApplication JSON-LD / 两张 ai-tools 表的行 / embed),符合 Play 板块站规。
  **绑定 = 这个工具唯一能兑现的订阅(2026-08-16)。跨两个仓库,契约写在这里。**
  形状是三段:工具 → 一个属于用户的对象 → 对这个对象的状态更新。用 Telegram 不用邮件,
  理由同 exposure 那条:邮件表单 0/246,且现在根本发不出邮件。
  · **罗盘侧(aistock)**:`?w=sd-cw&from=YYYY-MM-DD` 短码深链;绑定按钮发
    `t.me/sunwatchBot?start=h_<短码>_<YYYYMMDD>`。短码表**只存在 aistock**
    (`components/HomeworkCalculator.tsx` 的 `CODE`),bot 不解析其含义、原样拼回链接,
    所以加投资人不需要动另一个仓。全选 8 位 34 字符,不可能触碰 Telegram 64 上限。
    `prebuild` 把 `lib/data/copy-homework.json` 复制成 `public/copy-homework.json`
    (gitignore,只由构建产生),这是 bot 的数据源;部署自检对它有断言。
  · **bot 侧(sunPredition,`notifyHomework()`)**:触发条件是**全体投资人里最新的申报日
    前进**,不是 JSON 的 `generated` 变了——后者每跑一次回测就变,手动重跑会把人吵醒。
    首次运行只建基线。刻意不宣称「你那份涨了多少」:那要按每人自己的起点重算,算法在
    aistock,在 bot 里重新实现必然漂移。
  · **若任一侧要改契约(短码格式、载荷前缀 `h_`、公开 JSON 路径、触发条件),两侧必须
    同一次运行内一起改**;若 `notifyHomework()` 被删,绑定按钮的文案必须同一次提交删掉。
  **Deep-link convention (2026-08-05): `?b=NVDA-AMD-TSM` preloads and auto-scores a basket** — the
  Invest-section equivalent of `/agi-test?pick=<slug>`. Use it for opinion hooks on any commercially
  relevant page (live on /is-the-ai-capex-a-bubble, /ai-capex-trillion-dollar,
  /aschenbrenner-fund-collapse, /zh/is-agi-just-hype). The basket is also written back to the URL as
  the reader picks, so a result is permalinked and shareable with no account — which is what makes
  "your saved basket" a real object the paid alert can refer to. Result is named as an archetype
  (Capex Landlord / Tail Holder / Thesis Owner / Anti-Thesis) so it is quotable in a share.
- 🇨🇳 **中文**: /cn hub · /zh/* (30+ pages). zh subscribe CTAs carry the English-form hint.
  Owner aesthetic rule (2026-07-25): zh surfaces use a LIGHT, fresh palette (清淡浅色,
  支付宝/雪球-style soft white + subtle shadows) — never dark themes; actions/tools above the fold.

### zh design system — Swiss anchor (locked 2026-07-25, via frontend-design skill)
All 36 zh surfaces (/cn, zh/*, zh/agi-type/*) share ONE anchor. Hold these tokens; do
not hybridise:
- **Surface** `--bg:#ffffff` · `--bg2:#f7f7f8` · `--bg3:#eeeef1` (no dark themes, no warm paper)
- **Type** one family: Noto Sans SC / PingFang SC; `font-variant-numeric: tabular-nums`
- **Accent** ONE: Yves Klein Blue `#002FA7` (links, primary CTA). Green `#0f7a52` and
  red `#C8102E` are DATA SEMANTICS only (兑现/落空, 多/空) — never decoration.
- **Structure** 1px hairline rules (`rgba(0,0,0,.10)`), left-aligned, asymmetric.
- **Differentiator** the ledger read: hairline rows + oversized tabular numerals.
- **Contrast rule**: never `color:#fff` except on a filled accent button (this shipped
  as invisible text once — check before adding).
- **Responsive**: tables scroll in their own `overflow-x:auto` container under 640px.
Design skills live in .claude/skills: frontend-design (8 anchors), web-design-guidelines
(UI review), responsive-design, theme-factory, design-references, design-anchor-library.
Homepage carries the header section nav + the #directory block — keep both updated when
sections gain flagship pages. **Daily optimization ladder — reordered 2026-08-16 on the
Bing citation evidence** (the old order was ① conversion racing ② viral tools ③ invest
④ GEO/freshness; it assumed traffic was the binding constraint on every rung):
**⓪ CITATION AMPLIFICATION** ① conversion racing ② invest section ③ viral tools
④ GEO/freshness. Rung ⓪ jumps the queue because it is **the only rung not gated by
traffic**.
**执行令（2026-08-17 红队+行业调研决议，效期至 2026-09-30）**：每日 run 只做 ⓪ 与 ①
（引用维护/放大 + 被引页转化钩子）——行业一手数据支持这个再瞄准：AI 引用流量仅占
0.5% 但转化率是传统搜索 23 倍（Ahrefs 实测），钩子质量就是本站的全部变现杠杆。
**停建**新工具/新板块/新变现机器（Boosts 数学已判死：实测转化 1 订阅/368pv，可行线
需 ~37 万 pv/28d ≈ 950 倍流量）；x402 零投入（全网日成交 $2.8 万且半数为测试，每季度
复查一次）；E1 按预注册 09-04 执行 kill；~~invest 板块只做季度 13F 同步义务，不再加面~~
——**invest 深化已由 owner 2026-08-17 重新授权**（「agi的股票板块也调度深化，从商业
营收方案出发，倒推上线产品内容」），按 `invest-prd-2026-08.md` 执行：主线 = 判定型
投资问题页（吃引用）→ exposure 工具 → SunWatch Pro 桥/TG 绑定；每日 run 队列扩为
「⓪① + PRD 队列每 run 一条」；invest 侧判定顺延至 2026-11-15（阈值见 PRD §五）。
**证伪线 09-30**：sub_ok 累计 <5 → 「订阅→Boosts」假设正式判死，每日 run 降频为每周
（届时需 owner 确认），只保引用维护 + flip-day 邮件义务 + 2027-12 裁决期权。
「invest 导流」的判定已随 08-17 重启令改挂 2026-11-15（PRD §五：invest 簇 JS pv
≥60/28d、Pro 桥点击累计 ≥5、TG 绑定 ≥1，三条中 <2 条达标即回归季度同步义务模式）。
**三门规则 + 五步闭环（owner 2026-08-17 舰队铁律，适用于每个改动）**：上线前必过
①数据门（一手信号：D1/引用明细/GSC）②需求门（真实用户证据：搜索语/社区原声/站内
行为）③商业门（一句话回答「它把用户推向哪条营收路径」）——缺一即空转、不做。owner
原话：「后续四个站点优化，都要从数据，用户真实需求，商业角度进行，避免空转」。流程
执行五步闭环：信号→薄 PRD（一页：三门证据+判定线）→上线（**PRD 过三门即自动实施，
定稿不是里程碑、上线才是**，owner 2026-08-17 确认）→收数→判定日放大或杀死。变现类
需求 Working Backwards 起手（先营收公式再倒推内容）。 — the site holds 33–37.5% citation share on judgement-type AGI questions while
serving ~17 real readers/day, so covering one more such question earns share immediately
(see 「已挣得的定位」 above). Viral tools dropped below invest because gamified pages earn
**zero** AI citations — they feed a different machine.
Marketing skills library installed at .claude/skills (38 skills) — invoke per task.
2026-08-17 增补（owner 授权自主装技能）：customer-research / market-research /
competitor-profiling（用户与竞对洞察）、offers / pricing / ab-testing /
conversion-ops（变现与转化实验）、content-engine（多平台内容）。

## Prompt-optimization first, then skills (owner rule, 2026-07-11; skills step added 2026-07-25)

Before executing ANY task (including daily automated runs), ALWAYS in this order:
1. **Optimize the prompt**: Round 1 — restate the user's ask as an explicit task
   spec (goal, data to pull, decision criteria, constraints, deliverable).
   Round 2+ — self-critique the spec against this manual and current site state
   (what's missing? what would a sharper analyst ask? which dimension or angle
   is the spec blind to?) and revise.
2. **Then check the skills library** (.claude/skills — 24 marketing/SEO/CRO
   skills): if any skill covers the task (cro for conversion, seo/seo-audit for
   rankings, ai-seo for GEO, copywriting for copy, marketing-loops for
   automation, launch/social/community-marketing for distribution, etc.),
   invoke it BEFORE executing and apply its methodology. Skip only when no
   skill genuinely fits.
3. Only then execute against the refined spec. Show the refined spec briefly in the report so the owner can see
what was actually optimized.

## Ship procedure (every change)

1. Start from latest main: `git fetch origin main -q && git checkout -B claude/agiscorecard-github-migration-bpi0tm origin/main`
2. Make the change. If pages were added/updated, regenerate the feed: `python3 tools/gen_feed.py`. **Validate: `python3 tools/validate.py` must print OK.**
3. Identity: `git config user.email noreply@anthropic.com && git config user.name Claude`
4. Push with rebase-on-conflict (headless sessions have no GitHub MCP — never rely on PRs):
   `for i in 1 2 3 4; do git fetch origin main -q && git rebase origin/main && git push origin HEAD:main && break || { git rebase --abort; sleep $((2**i)); }; done`
5. Confirm `git rev-parse HEAD` == `git rev-parse origin/main`. Never claim success otherwise.

## Daily automated run (self-bind trigger, 04:00 UTC = 12:00 Beijing)

**Master execution doc (owner 2026-08-08, "按照激进的 AI 时代策略执行"): `strategy-2027.md`.**
Every daily run FIRST checks its Phase checklist — unfinished strategy items (13F refresh
from 8-14, weekly odds-vs-evidence issue, Sept: user picks→D1+leaderboard, x402 pilot when
the owner's Gateway waitlist clears, resolution mode from 2027-12) outrank the ordinary
optimization ladder. Aggressive = cadence and ambition, NOT dropped quality gates: the
hard content rules, anti-churn rule, and zero-fabrication rule stay absolute — they are
what the strategy's entire valuation rests on. Completed items get checked off in the
strategy doc the same run. New strategy-relevant milestones to watch in D1:
`site_search{location='mcp'}` (first agent MCP call), first `sub_ok`, first x402 payment.

1. **Monitor** (best-effort; skip silently if Supermetrics MCP absent):
   GA4 via Supermetrics — ds_id `GAWA`, account `541489054`,
   fields `sessionDefaultChannelGrouping,activeUsers,newUsers,sessions,screenPageViews`,
   `date_range_type="last_28_days"` as ROOT param, `settings={}`; poll
   `get_async_query_results`. Also useful: `landingPage,sessions,activeUsers`
   and `eventName,eventCount`. **Watch two families:** (a) SUBSCRIBE funnel —
   `subscribe_click` (by location), `vote_cast`; (b) the FISSION/game loop (live
   since 2026-07-12) — `vote_cast`, `challenge_share`, `x_share`,
   `agi_test_click`, `index_click`. Watch landingPage for `/agi-test`,
   `/zh/agi-test`, `/progress-index`, the `/agi-type/*` result pages, and
   referral sources for `x.com`/`t.co`/`reddit` (share loop turning). Append a
   dated row to `analytics-notes.md`. **Organic Search is THE metric.** It lags
   publishing by weeks — flat early numbers are expected; never churn content in
   response. `challenge_share`/`vote_cast` rising = the viral loop is working →
   double down on what's shared most (per `cro`), never fabricate counts.
2. **⓪ 引用放大先于其他阶梯（2026-08-16 起）。** 在挑常规 backlog 项之前，先过这一关：
   a. `content-backlog.md` 的 **CITATION AMPLIFICATION** 队列有未打勾项 → 优先做它。
      该队列的选题依据是**已发生的引用**（Bing Pages/Queries 明细），不是猜测的搜索需求，
      因此它天然满足「每个选题都要有真实查询」这条硬规则。
   b. 队列空了才回到常规阶梯。**不要**为了凑数往这个队列里塞猜的选题——没有新的引用
      数据就没有新的依据，此时正确动作是回到 ① 或 ④，并在报告里说明队列已清空。
   c. **定位深化是每次发布都要过的检查，不是单独任务。** 任何「判定型」新页/改页必须同时
      具备：① 标题即那个问题本身（定义 / 现状 / 对比三选一）② 首屏答案胶囊先给结论
      ③ 表格 ④ 可见 FAQ 与 FAQPage JSON-LD 逐条一致 ⑤ 带日期的一手判定 + 一手源外链
      ⑥ **首屏一个聊天答案装不下的活数字**（62.5/100 + 八条翻转条件，埋点
      `index_click{<page>_live}`）。缺第 ⑥ 条 = 白送引用不收点击，这条不能省。
   d. **不要拿引用数去考核工具页与游戏化页**：它们在前十引用页里一个都没有，本来就不吃
      引用。它们的 KPI 是 `tool_click` / `embed_copy` / 绑定数。
3. **Optimize — ONE change per run** (owner-authorized exception 2026-07-11:
   when multiple backlog items are pre-vetted and validation passes, publishing
   2-3 in one run is allowed to compress the timeline — never thin content):
   a. Unchecked `[ ]` item in `content-backlog.md` → publish it (see below).
      The **GAMIFICATION / DISCOVERY queue** (game/virality features, exempt
      from the anti-cannibalization rule — they don't touch the crawl surface)
      is high-priority: shipping one compounds the fission loop (the AGI-type
      game at `/agi-test` + `/zh/agi-test` is the flagship viral asset — funnel
      deep pages to it, keep its cards/score synced via `tools/gen_share_cards.cjs`
      + `tools/gen_agi_types.py`).
   b. Else one optimization per the rules in `OPT-LOG.md` (never re-touch a
      page changed in the last 5 logged runs): tighten one weak title (≤60
      chars) / meta description (≤155), OR add 1–3 contextual internal links
      (prefer linking a deep page → `/agi-test` or `/progress-index`), OR bump
      sitemap lastmod. If GA4 shows a `subscribe_click`/`challenge_share`
      placement winning, replicate that copy/pattern to one more page (`cro`).
   c. If the backlog is empty, self-seed 3–5 new items first (follow the
      topic-selection rules at the top of `content-backlog.md`; every topic
      needs a real search query and must recombine established site data —
      OR seed a new gamification/discovery feature per that queue's rules).
4. **Validate** (`tools/validate.py`), **ship** (procedure above), log to
   `OPT-LOG.md`, and report to the user in Chinese: GA4 numbers, what
   shipped, URL count (`grep -c '<loc>' sitemap.xml`).
5. **Milestones — notify the user prominently when first crossed:**
   Organic Search ≥ 10, ≥ 50, ≥ 200 (28-day active users); any deep page
   entering the top-3 landing pages; `subscribe_click` ≥ 20/28d; the FISSION
   loop igniting — `challenge_share` ≥ 10/28d, `/agi-test` (or `/zh/agi-test`)
   entering the top-5 landing pages, or `x.com`/`reddit` appearing in referral
   sources (means the seed posts / organic shares are spreading).
6. **每日顺手(2026-08-20 已达标,降频为每周一)**: glama-status.json 三个 server
   (verified-ai-free-tiers / agiscorecard-mcp / getecoback-mcp)已全部 scored=true;
   awesome-mcp-servers 四个 PR(#12240 / #12245 / #12513 / #12084)已全部挂
   has-glama+valid-name,纯等维护者合并。周一顺手:①WebFetch 查四个 PR 状态,
   合并了记里程碑,被要求改动就当轮改(fork 分支在会话可推);②glama-status 若
   某 server 翻回 false(掉榜)当天报 owner。**待 owner 一次点击:关闭 #12084
   ——它是 #12240 的重复(同一 server 另一分类,8-13 旧提交),重复 PR 伤维护者
   观感,保留标题干净、走完机器人流程的 #12240。**
7. **每月 1-3 日**: 向 owner 要一次 **Bing Webmaster → AI Performance** 的两张明细
   （Grounding Queries + Pages，右上角 Download all）。会话沙箱进不去 Bing，这是唯一
   拿到引用数据的路径，而 CITATION AMPLIFICATION 队列的补货完全依赖它。拿到后：
   ①更新 `analytics-notes.md` 的引用榜 ②按「引用量大 × 缺活数字」补钩子
   ③按「引用量大 × 缺多语言」补翻译 ④若某类页面持续 0 引用，写进反面发现，别再投。
   **一次只要一次，别每天催。**
   顺手核一次 GitHub Actions 用量（github.com/settings/billing）。
   上月总消耗与本文档「已验证基准」差距 >2 倍即排查（先分私有/公开 → 运行次数 →
   单次时长），结论记 analytics-notes.md。
8. **Mondays — 四站对抗记分板（owner 2026-08-17「试点站…相互对抗学习」，由两站扩为四站）**:
   compare the pilot fleet when repos are attached — agi D1 `agiscorecard-events`
   (f84f9d29) · bpj D1 `baipiaoji-hits` (1ee08cb8-a174-4ec3-8dbc-89ef5d28aa05) ·
   getecoback D1 `ecoback-events` (75e45e05-44b5-4c56-9a3b-dd504b5c53f1，表 `ev`) ·
   thedollscout（D1 `dollscout-events` 6e71ddc6-b58c-49f4-b6f5-207f3778133f，表 `hits` 同 bpj 口径，2026-08-19 起；更早只有 agi-site 仓 sites/thedollscout/content/traffic.json）。
   每站四行：真人 PV（JS 口径）、AI 引用/爬虫态势、离钱最近的转化事件
   （agi=sub_ok · bpj=go/sub_view · eco=affiliate_click · tds=affiliate_click GA4）、
   本周移植了谁的什么模式。记 analytics-notes.md，并 port whichever side's working
   pattern the others lack。**已知陷阱（两站各自踩过一次）：CI 自测会伪装成增长**——
   eco 的 mcp_call/md_serve 在 08-16 出现 110/94 次全是冒烟测试（参数逐字重复），
   bpj 曾把每日 curl 自测当 agent 增长；任何「agent 采用」结论先查参数是否重复、
   是否与 CI 时间重合。
   **"Unsuccessful requests" in AI Crawl Control is NOT breakage** (diagnosed
   2026-08-16): it is UA-spoofed vulnerability scanners 404ing on credential paths
   (bpj audit 08-15: 64% of "Google-Extended" was fake) plus spec-correct 405s on
   MCP GET probes — do not "fix" the 405s, they are per MCP spec. Also do one deeper audit item — multilingual parity for the
   best-performing new English pages (translate into the 8 language dirs with
   reciprocal hreflang), internal-link graph gaps, or CTR review of GSC data
   if the user pasted any into `analytics-notes.md`.

## Publishing a new GEO page

Use `tools/gen_lib.py` (`from gen_lib import build`) — see git history for
example generator scripts. Every page: answer capsule with definitive verdict,
a table, FAQ block whose visible Q&As exactly match the FAQPage JSON-LD,
Article JSON-LD, BreadcrumbList JSON-LD (Home → AGI questions → page),
canonical, og tags. Then wire into: `sitemap.xml` (lastmod =
publish date), homepage Explore chip group in `index.html`, `llms.txt`,
`/agi-questions` hub, and check the backlog item off. Titles ≤60 chars,
descriptions ≤155.
**Conversion (required on EVERY page — subscriber flow is the revenue KPI):** a
direct beehiiv subscribe CTA (`https://agiscorecard.beehiiv.com/subscribe`, gtag
`subscribe_click` with a `location`). EN pages use the deep-page CTA; zh pages
MUST include one too (location `zh_deep_page`) — do NOT ship a zh page whose only
CTA links to `/cn` (that was a whole-library gap, fixed 2026-07-12). High-value
pages also get a Thesis Tracker (`/progress-index`) funnel callout.

**Hard content rules:** verified site data only — NEVER invent statistics or
quotes; no thin/duplicate/doorway pages; genuinely distinct angle vs existing
pages or don't publish. These protect rankings — breaking them costs more
traffic than they add.

## GEO rules from industry research (2026-07-10 survey)

The three strongest citation-earning techniques per published GEO research
(Princeton GEO, KDD 2024, ranked): **cite sources with links (+40%),
statistics with dates (+37%), direct quotations w/ name+title (+30%)**;
authoritative tone (+25%); keyword stuffing (−10%, actively harmful). Best
combo: fluency + statistics. Single `<h1>` per page = 2.8× citation rate (all
indexed pages already comply — audited 2026-07-12). Apply when writing/
refreshing pages. Primary-source URLs live in `data.json` per prediction
(`sources` array) — keep them there as the canonical, machine-readable citation
surface; add new ones there first before scattering outbound links across pages.
(Full playbooks: `.claude/skills/ai-seo`, `directory-submissions`.)
- **Freshness cycle**: AI engines weight recency heavily. In OPTIMIZE mode,
  prefer refreshing 1-2 of the STALEST pages (oldest dateModified): make one
  substantive update (a sharper sentence, a new cross-link, current status
  line), then bump dateModified + visible "Last updated" + sitemap lastmod.
  Target: no important page older than ~30 days.
- **30/60/90 post-publish reviews**: when the user pastes GSC data into
  analytics-notes.md, re-optimize titles/descriptions of pages with
  impressions-but-low-CTR first — post-publish optimization outperforms
  initial publish.
- **Dataset upkeep**: `/data.json` (CC BY 4.0) is the machine-readable
  verdicts dataset; homepage carries matching Dataset JSON-LD. WHENEVER a
  verdict, number, or forecaster position changes on the site, update
  data.json + its dateModified in the same commit. It exists to be cited —
  original data is the #1 citation magnet.
- **AI crawlers**: robots.txt explicitly allows GPTBot, OAI-SearchBot,
  ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended etc. Never
  block them — AI-assistant citations are a growth channel (GA4 "AI
  Assistant" channel is the KPI proxy).
- **AI-assistant distribution layer (researched 2026-07-12)**: ChatGPT
  search retrieves from the BING index (~73% result overlap) — Bing
  Webmaster Tools enrollment (guide: bing-setup.md, owner does GSC
  one-click import, ~10 min) gates ChatGPT-search + Copilot visibility.
  Perplexity: own index; rewards Q&A format (~3x citation rate), direct
  answer in first 50 words, explicit update signals, niche depth over
  domain authority — all already site practice; Reddit ≈47% of its top
  citations (community posts = owner minutes, never automated).
- **Cluster linking (HubSpot model)**: links flow hub→spoke, spoke→hub, AND
  spoke↔spoke. Every deep page carries a "Browse all AGI questions" link to
  the /agi-questions pillar + an E-E-A-T byline linking /about — keep both
  on every new page.
- **pSEO comparisons (batch-4 pattern)**: comparison pages are a rewarded
  format ONLY with genuinely distinct analysis per pair (>=60% unique,
  500+ words) — never variable-swap. Vet real search demand before adding
  pairs to the backlog.
- **Embeddable widget (growth loop)**: /widget (noindex iframe card:
  countdown + verdict chips + branded backlink w/ utm_source=widget) is the
  backlink flywheel — every external embed is a distribution node. WHENEVER
  verdict counts change on the homepage, update widget.html chips in the
  same commit — AND regenerate the README badges (`python3 tools/gen_badges.py`,
  serves /badge/*.svg, docs at /badge): embedded badges showing a stale
  verdict would be lying in someone else's README. AND regenerate the Thesis
  Tracker (`python3 tools/gen_index.py YYYY-MM-DD`): recomputes the 0–100 score
  from data.json verdicts, appends to index-history.json, and rewrites
  /progress-index (EN + zh) + the homepage. If the score changes, update EVERY
  hardcoded `62.5` in index.html (hero element + meta description +
  og:description) and widget.html (score line) in the same commit. Also regenerate the AGI-type
  share assets (`NODE_PATH=/opt/node22/lib/node_modules node tools/gen_share_cards.cjs && python3
  tools/gen_agi_types.py`) — both read the score from data.json, so re-running re-bakes it into
  share/*.png + agi-type/*.html. The Tracker is the site's flagship
  differentiator — one auditable index of the 2027 bet no competitor has;
  "subscribe to hear when it moves" is a primary conversion hook. Homepage countdown section carries the copy-paste embed code
  (gtag event: embed_copy).
- **Monetization thresholds (researched)**: subscriptions ≈85% of creator
  revenue industry-wide; median pricing $10/mo, $100/yr; beehiiv
  Boosts/ad-network viable from ~1k subscribers; display ads NOT worth it
  for small lists. Priority stays: grow the list.

## Revenue acceleration (inbound sponsorship funnel — 2026-07-11)

`/advertise` is the live media kit (methodology: hosted media kit + specific
audience + 3 tiers + reply-to-briefing contact path; industry data shows small
high-intent niche audiences outperform large general lists for sponsor ROI, so
the channel is legitimately open even while early). Rules:
- Keep every number on /advertise HONEST and current (page count, languages);
  update it whenever the footprint materially changes. Never quote metrics we
  can't show a sponsor.
- If GA4 someday shows meaningful traffic to /advertise but no sponsor inquiry
  arrives via the briefing, tell the user — the reply-path may need their
  beehiiv attention.
- Sponsorship never influences verdicts; placements always clearly labeled.
- When the user reports the first sponsor inquiry: help draft the reply,
  proposal, and a simple rate card based on then-current real metrics.

## Monetization architecture: platform-automation-first (2026-07-11)

The owner is a non-expert and must NOT be depended on for sales work. The
chosen industry automation is beehiiv Boosts (+ Recommendations): after a
one-time ~3-minute toggle by the owner (guide: beehiiv-setup.md,
robots-disallowed), sponsor matching, placement, and payouts are fully
platform-automated; revenue = subscriber flow x $1-3/qualified sub, live
from the first subscriber with no audience minimum. The engine's job is
therefore SUBSCRIBER FLOW: keep growing organic traffic and watch
subscribe_click daily. Outbound (outbound-kit.md) and /advertise inbound
stay available but are OPTIONAL — never nag the owner about them. If the
owner confirms Boosts is enabled, note it in analytics-notes.md and treat
subscriber growth as the revenue KPI.

## Sales plan: 3 deals by 2027-01-07 (set 2026-07-11)

Target: 3 paid sponsorship deals within 180 days. Funnel: content → site
visitors → briefing subscribers + /advertise visits → inquiry (reply to
briefing, subject "Sponsorship") → user closes by email.
- Intro pricing live on /advertise: $50 classified / $100 briefing lead /
  $150 site placement 30d — floor of the researched $100-400 B2B-niche range;
  first 10 sponsors lock rates 6 months. Value-based pitch: "reach people
  actively researching AGI timelines", never raw subscriber counts.
- Daily runs: also watch GA4 landingPage=/advertise sessions and
  subscribe_click{advertise_page}; log notable movement in analytics-notes.md.
- Deal tracking: when the user reports an inquiry or closed deal, record it
  in analytics-notes.md (date, tier, amount) — 3 closed = goal met.
- ONE-WEEK BREAKTHROUGH SPRINT (2026-07-11 → 07-18): outbound-kit.md
  (robots-disallowed) holds 3 pitch templates + 10-target list; the user
  sends 8-10 pitches (~30 min). /advertise carries a $99 founding-sponsor
  bundle (first 3). Daily runs during the sprint: report /advertise GA4
  traffic + remind the user of send/follow-up cadence if no deal yet.
  When the user pastes any sponsor reply, immediately draft the response,
  offer, and insertion copy.
- Day-60 checkpoint (~2026-09-09): if zero inquiries, prepare an outbound
  pitch kit (10 target sponsors: AI tools/newsletters that sponsor small
  B2B lists + a 3-line pitch email) for the user to send, and recommend
  Cloudflare Email Routing alias (sponsor@agiscorecard.com) to cut contact
  friction — both need only minutes of user action.

## Revenue roadmap (context for decisions)

Now (~150 users/28d): build the email list — beehiiv subscribe CTAs sitewide
(`subscribe_click` event). List 500–1000 → beehiiv Boosts/ads/sponsorships.
Organic thousands of PV/mo → display ads (AdSense etc. — `/about` and
`/privacy` pages exist for this) + affiliate. Biggest predictable event:
**AGI-2027 resolution, Dec 2027–Jan 2028** — prep a resolution page in
December 2027; it is the single largest expected traffic spike.

## Measurement: Cloudflare MCP is available — GA4 is NOT the only channel (2026-08-05)

**Remember this.** The owner asked "why do you need GA4, you can get it from Cloudflare."
Verified this session:
- The Cloudflare MCP attached here is **Developer Platform**: D1, KV, R2, Workers,
  Hyperdrive, docs. **There is no analytics tool** — Web Analytics is not readable via MCP.
- **D1 is fully readable AND writable over MCP** (`d1_database_query`). This is the channel.
- The site deploys as the Cloudflare Worker `agiscorecard` (dashboard-configured static
  assets). Workers tools here are **read-only** — cannot deploy or add bindings.
- Cloudflare Web Analytics would not solve the problem anyway: it has **no custom events**,
  and every experiment verdict depends on `subscribe_click{location}`,
  `tool_click{opinion_*}`, `deeplink_pick`, `embed_copy`.

**Therefore the standing measurement plan is first-party, IN PARALLEL WITH GA4:**
D1 `agiscorecard-events` (id `f84f9d29-3ad9-4b37-b28e-3a78027d2f22`), tables `events` +
`pageviews`, collector at `tools/analytics-worker/`. **Live and verified 2026-08-05** — real
rows with real referrers (bing.com, google.com, duckduckgo.com) and real interaction events.
**Daily runs query D1 over MCP instead of Supermetrics** — no subscription, no expiry,
first-party so ad blockers can't silently zero small samples. Query recipes (channel
grouping that replaces GA4's Organic Search, landing pages, human/bot split, UTM) live in
`analytics-setup.md`.

**NEVER remove GA4 from the pages** (owner rule, 2026-08-05: "不是让你删除 GA4，而是增加一个
通道，避免出现问题"). Two independent channels; either one failing must leave the other
recording. The collector *wraps* `gtag` and forwards to `/api/e` — it does not replace it. A
GA4-stripping sweep of all 182 pages was staged this day and reverted on that instruction;
do not re-propose it. Pre-2026-08-02 history exists only in GA4 — another reason it stays.

Two things the D1 channel has that GA4 does not, both deliberate:
- **Pageviews are recorded server-side** in the worker, no JavaScript involved, so ad
  blockers / JS-off readers / AI crawlers are counted. On a site whose growth channel is
  AI-assistant citation that is the traffic worth counting. It also self-verifies: an unbound
  D1 binding leaves `pageviews` empty and visible. The write is wrapped in try/catch and
  `ctx.waitUntil` — it sits on the page-serving path and must never be able to 500 the site.
- **UTM is captured** (`utm_source/medium/campaign`, allowlisted keys only — never the whole
  query string). Without it `?utm_source=widget` and every X/Reddit seed link is invisible.
Counting caveat: `events` holds ~20 `page_view` rows from 08-05 only, before PVs moved
server-side. Do not add those to `pageviews` totals.

**Root wrangler config: owner authorised it 2026-08-05** ("不要依赖我，自动化完成", after the
risk was raised and restated). `wrangler.jsonc` now lives at the repo root and IS the deploy
config. Two settings there are load-bearing — do not "tidy" them away:
- `assets.run_worker_first: true` — Workers serve static assets BEFORE the script by default
  (the opposite of Pages). Without it the HTMLRewriter beacon never runs and the collector
  deploys healthy but records nothing.
- `.assetsignore` — Workers do NOT auto-exclude `.git` the way Pages did. Removing it would
  publish the entire repo history as static assets.
Still true: any FURTHER change to deploy config is a hard-to-reverse, outward-facing action —
verify after pushing (`workers_get_worker_code` should be non-null; D1 `events` should fill)
and revert immediately if either fails.

## On-site signup + the promise it makes (2026-08-06)

Subscribe CTAs are no longer outbound links. The worker injects an inline form at the
edge (all 203 CTAs, 182 pages, no page files changed), stores the address in D1
`subscribers`, and forwards to beehiiv when `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID`
are set. Storage happens BEFORE the forward, so a missing key costs a sync, never an
address. The anchor keeps its href, so a script failure falls back to beehiiv exactly as
before.

**The hook is per-context, and one of them is a promise with an obligation attached.**
From a prediction row the form says *"One email, only if this verdict flips"* and stores
the prediction id as `topic`. That is the strongest offer the site has and nobody else
can make it — but it is only honest if the mail actually goes out.

**Therefore, in ANY run that changes a verdict in `data.json`, this is not optional:**
```sql
SELECT topic, COUNT(*) n, GROUP_CONCAT(email) who
FROM subscribers WHERE topic = '<flipped-prediction-id>' GROUP BY topic;
```
Report that list to the owner in the same run, alongside the regenerated
gen_index / gen_badges / gen_agi_exposure / widget outputs. A verdict flip with
topic-subscribers on record and no notification is a broken promise, and this site's
only real asset is that its promises are checkable. Also report `status='stored'` rows
(not yet synced to beehiiv) so they do not accumulate unnoticed.

**NO-API mode (owner decision 2026-08-15: Stripe verification deferred — "先不做，然后你
看你怎么自动化解决").** There are no beehiiv keys, so nothing syncs and the worker cannot
send mail (Cloudflare sends only to the zone's own verified addresses; a third-party ESP
would just be a different signup to ask of the owner). The keepable promise pipeline is
therefore: ① every address keeps landing in D1 (`status='stored'` is the NORMAL state
now, not an error — do not alarm on it, just report the count); ② **on flip day, the run
must produce the complete mail kit in the report**: recipient list (topic rows + all
generic rows, from D1) AND a ready-to-paste email draft (subject + body, EN; state what
flipped, the evidence, and the one link to the page) — the owner's only manual step is
paste-and-send, ~1 minute, and at current scale that personal mail is *better* than an
ESP blast; ③ when stored count first reaches 10, and again at 50, include a CSV-shaped
list in the report and point the owner at beehiiv Audience → Import (import is not behind
the verification gate as far as we know — first import will confirm); ④ do NOT nag about
Stripe verification — mention it at most once more, at the moment a Boosts-relevant
milestone lands (subscribers ≥ 50), because Boosts stays closed until verified.
`/api/sync-pending` stays deployed: the day keys ever appear, one GET drains the backlog.

Funnel reading: `sub_open → sub_submit → sub_ok` (and `sub_fail`). All four are needed —
a form nobody opens and a form that errors on submit look identical without them.

**Traffic reading — the ONLY honest denominator (rule set 2026-08-10 after a misread).**
`pageviews.ua_class='human'` is a UA-regex guess and it has been wrong twice. On 2026-08-08/09
it tripled (162 → 521/539) while JS-executed `events.page_view` stayed flat (35 → 38-43) —
the JS share fell from 18-22% to ~7%, and the "surge" was an unrecognised crawler fleet
scanning 132 distinct paths from US/CA. **Report `events.page_view` (JS ran, so a browser
was really there) as real readers; treat `pageviews` human counts as an upper bound that
includes bots the regex missed.** Never quote a conversion rate against the pageviews
denominator. `ua_audit` (day, ua_prefix 48 chars, ua_class, hits) records who is actually
knocking — check it before widening the regex, and widen it from evidence, never blindly.
The server-side counter still earns its place: it is what counts AI crawlers and JS-off
readers at all. Both numbers, always labelled.

## Site search = the demand-signal loop (2026-08-08, owner: "了解用户真实需求,驱动网站自动化")

/search (noindex, client-side over /search-index.json, regenerate with `python3
tools/gen_search.py` whenever pages are added/renamed — it also carries fixed entries
for the invest/compass sub-sites). Its real purpose is the LOG, not the lookup:
`site_search` (label = query, 80 chars) and `search_no_result` land in D1.
**降级(2026-08-17 实测)**:自 D1 上线(8-05)以来 **`site_search` 一次都没触发过,
`/search` 一次都没被打开过**;同期首页 113 次真实浏览、全站 427 次。按站内搜索
1–3% 的常见使用率,113 次曝光的期望值只有 1–3 次,**所以这个 0 还不足以判死这个
功能**——不要据此拆掉 /search。但「每日运行必读这张表」确实是浪费:每天查一张
恒空的表,还会造成「我们在倾听用户」的错觉。**改为:有量才读(月度或全站真实
读者破 1000 后再纳入例行)**;在此之前需求层不产出选题种子是正常的,别硬凑。
**Rule when it does have data:** read
`SELECT label, COUNT(*) n FROM events WHERE name IN ('site_search','search_no_result')
AND day > date('now','-28 days') GROUP BY label ORDER BY n DESC` — recurring queries
with weak/zero results are FIRST-CLASS backlog seeds (they outrank speculative topic
ideas; a search is a user telling you what to build). Never publish thin pages just to
match a query — the hard content rules still gate what ships.

## Owner alert channel — Telegram, major information only (owner request 2026-08-16)

Owner: 使用我已经接好的股票提醒的 telegram 通道，如果有重大信息，给我指导提醒。
The channel is the SunWatch bot; its credentials (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`,
else KV `tg-config`) live in the **sunPredition** worker, so **every path to the owner's
Telegram must be sent from that worker** — this repo's sessions cannot reach api.telegram.org
(egress proxy 403, verified 2026-08-16), and neither can a fired Routine session.
- **This repo owns the judgment, not the delivery**: `GET /api/owner-alerts?k=<key>` (worker,
  key in D1 `owner_identity.alert_key`) returns only genuinely major events with a concrete
  action line: tracker score moved (+ who is owed a flip mail, counts only), subscriber
  milestones 1/10/50/100/500, first agent MCP call, subscribe-funnel failures, reader
  milestones, AI-referral doubling. `&ack=1` marks them delivered.
- **Two guards, both learned here**: first-run baseline (empty `owner_alerts` table records
  every currently-true state as delivered and sends nothing, so a deploy never fires a burst
  of stale "news"), and the alert key encodes its triggering state, so a standing condition
  is announced exactly once. Never widen this feed into a daily digest — the owner rule is
  major information only, and a channel that cries wolf gets muted.
- **Delivery is wired (2026-08-16, owner authorised the push)**: `notifyAgiAlerts()` in the
  sunPredition worker (branch `claude/sun-yuchen-investment-research-yzz9mx`, deploy = push →
  its Actions) fetches this feed on every cron (`*/30` + the two daily briefs) and sends to
  `cfg.chatId`. **Send first, ack after** — it only calls `&ack=1` once every message came
  back `ok`, so a failed push is retried next cron instead of being silently marked
  delivered. The key lives in that private repo's source, overridable by its worker var
  `AGI_ALERT_KEY`; the feed is read-only and counts-only, so no address ever crosses the
  worker boundary. KV `agi-alert-hello` makes the first successful connection announce
  itself once. **If either side's contract changes, change both in the same run** — the
  judgment lives here, the credentials live there, and neither half works alone.

## Owner digital identity archive — standing memory (owner request 2026-08-15)

Owner asked (2026-08-15): 记住"我"、在云端存储我这个个体、推演余生、每日提醒。
The durable implementation:
- **`owner-identity.md` + `owner-identity.json`** — the owner's verified digital
  record: every dated decision, verbatim quote, value, and preference on file,
  zero-fabrication-audited against sources. **`owner-trajectory.md`** — the
  scenario projection (余生推演) + daily guidance + the owner-action checklist
  (§四) that the daily reminder Routine reads.
- **D1 mirror**: table `owner_identity` in `agiscorecard-events`
  (f84f9d29-3ad9-4b37-b28e-3a78027d2f22) — cloud copy incl. private fields
  (name/email) that stay OUT of the repo. All three files are in `.assetsignore`
  on purpose: stored in git + D1, never served on the public site.
- **公开镜像仓的红线(owner 2026-08-16:「我个人数字人的部分不公开」)**:
  `f-tiger/agiscorecard-mcp` 是唯一的公开镜像,内容严格限于 MCP 清单 + 已在网站
  公开的数据集(data.json / index-history.json)+ 同步脚本。**owner-identity /
  owner-trajectory 及任何私密字段永不进入任何公开仓**;该仓 workflow 带隐私闸门,
  出现 owner-* 文件或引用即让流水线失败而非静默发布。新建任何公开仓前,必须先跑
  一次同款关键词审计(owner 档案名、邮箱、USDT 地址、token、API key、chatId)。
- **Every session inherits this as memory.** Treat the archive as the
  authoritative statement of who the owner is and what they want. Whenever the
  owner issues a new standing rule/goal/preference, append it (date + verbatim
  quote + source) to owner-identity.md/.json AND the D1 mirror in the same run.
  When an owner-action item in owner-trajectory.md §四 completes, check it off
  with the date. Quarterly (Feb/May/Aug/Nov): revisit trajectory checkpoints
  and revise scenario probabilities, keeping prior versions on record.
- **Honest scope, on record**: this is a living decision archive + an
  autonomous proxy executing the owner's recorded will — not consciousness
  upload. Never claim otherwise, to the owner or anyone.

## Sibling site: baipiaoji.com co-evolves with this one (owner 2026-08-16)

Owner: "我的想法是2个站点一起进化，避免我每次都两边聊、浪费时间。对比agi和baipiaoji
两个站点情况，相互学习，并优化这两个网站。" Standing arrangement:
- **baipiaoji.com（白嫖计）= f-tiger/aitools repo** (its own CLAUDE.md governs its
  conventions — read it before editing). Dataset repo: f-tiger/verified-ai-free-tiers
  (mirrored at aitools/mirror, synced by sync.mjs). Its MCP server
  io.github.f-tiger/verified-ai-free-tiers v1.7+ is already on the official registry.
- Sessions with both repos attached may optimize both; **niches stay separate** (AGI
  evidence vs free-tier deals) — cross-link only where genuinely relevant to the reader,
  never as link-scheme filler.
- **Cross-learning ledger (2026-08-16 comparison, both dashboards):** bpj's /llms.txt is
  its #1 AI-crawled path (181 hits/24h) and its crawler mix is the citation cohort
  (OpenAI/Google/Anthropic/Perplexity) — proof the llms.txt+MCP+directory packaging
  works; agi adopted the same registry path 08-15. agi's crawler layering (block
  Meta-ExternalAgent etc.) applied to bpj's dashboard on 08-16. bpj's edge middleware
  logs server-side AI-crawler hits (same lesson as agi's D1 pageviews, independently
  learned — both sites now count JS-less crawlers).
- awesome-mcp-servers fork carries branch `add-agiscorecard-and-verified-free-tiers`
  (both servers, alphabetical placement, list style matched). PR to upstream is the
  OWNER's click: https://github.com/f-tiger/awesome-mcp-servers/pull/new/add-agiscorecard-and-verified-free-tiers

## GitHub Actions 额度是账号级共享资源（2026-08-16 owner 指令，所有仓库通用）

起因：账号额度 15 天用掉 90%（1803/2000，每月 1 日重置）。owner：「写入记忆，后续
所有的会话和项目都要执行，避免 github 超了」。

**基本事实**：2000 分钟/月是**整个账号共享**的，不是每仓独立；**私有仓消耗、公开仓
免费**（agiscorecard/sunPredition/aitools/gushen 私有 → 计费；aistock、
verified-ai-free-tiers、agiscorecard-mcp 公开 → 免费）。

**每个会话必须遵守：**
1. **合并推送**。一个会话内的多次改动尽量合成一次 push。2026-08-15 单日 22 次运行
   就是连续推送造成的——这是本次超额的直接原因，也是我自己犯的。
2. **新增任何定时 workflow 前，先算账并写进提交说明**：每次多少分钟 × 每月多少次
   = 月消耗。算不出来就先别加。
3. **CI 设计铁律**：「每日维护 + 外部副作用」类步骤（IndexNow 推送、Wayback 存档、
   RSS 聚合器、域名/DNS 校验、爬虫探针、数据快照导出）**只能挂在 schedule 上，
   绝不能挂在每次 push 上**。理由不止是分钟数——8-15 那天等于给 IndexNow 推了
   22 次、往 Wayback 存了 22 次，已接近滥用外部服务。
   保留在 push 路径的只有：正确性校验 + 构建 + 部署 + 部署后自检。
4. **部署类 workflow 一律 `concurrency.cancel-in-progress: true`**，连续快推只让
   最后一次真正部署。
5. **不要为"确定无效"的步骤付费**：典型反例是每次都跑 `wrangler pages project
   create` 然后 `|| true`——项目早已存在，却要为它完整下载一次 wrangler。
6. **额度紧张时的排查顺序**：先分私有/公开 → 再看运行次数 → 再看单次时长 → 最后
   才考虑改架构。**架构迁移前必须核实目标平台的配额**（本次教训：Cloudflare Pages
   免费版 500 次构建/月，比修复后的 Actions 少 6.6 倍，迁过去反而更差）。

**已验证的基准（aitools，2026-08-16 修复后）**：每次 push 0.6 分钟（修复前 3.5–8
分钟），2000 分钟 ≈ 3300 次推送。任何仓库的 push 路径若超过 ~1 分钟，按上面第 3 条
查是不是把每日维护挂在了 push 上。

## Facts that gate automation (learned the hard way)

- Fresh headless sessions (create_new_session_on_fire) CANNOT push to this
  repo and lack GitHub/Supermetrics MCPs — always use self-bind triggers.
- The egress proxy blocks the live site, IndexNow, and most external hosts
  (403) — don't waste time on them; Cloudflare Crawler Hints (enabled) and
  GSC (sitemap submitted) handle discovery.
- `main` is unprotected; direct push is the deploy mechanism.
- robots.txt disallows the working files: `content-backlog.md`, `OPT-LOG.md`,
  `analytics-notes.md`, `/tools/`.
