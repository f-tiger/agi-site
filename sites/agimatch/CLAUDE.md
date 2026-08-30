# match.agiscorecard.com — 撮合分诊站操作手册（2026-08-30 建站）

**缘起（owner 原话）**：2026-08-30「调用技能调研，构建一个撮合平台的 agi 子域名。
有需求，有回应，解决用户痛点，这个撮合平台可以对接现有成熟的需求撮合平台，解决用户
需求，解决他们的痛苦内容，支付交易用 web3 进行」。同日追加的一句决定了最终形态：
**「这个平台应该是 ai 时代最好的网站，ai 也可以解决问题，撮合也可以解决问题」**
——所以本站不是又一个联盟导流页，而是**先判定「你到底要不要雇人」，判定为要雇才撮合**。

## 定位（一句话）

> **来一个需求，先回答"这件事已经有人做完了吗"，答案是"没有"才把你送去雇人。**

三种判定，每种都是完整的回应，不是漏斗的中间态：
- `SOLVED-NOW` — 已有产品做完了这件事。你不是要雇人，你是要注册。点名产品与价格。
- `DIY-WITH-GUIDE` — 不需要工程师，但需要一个下午和一份配方。给配方骨架。
- `NEEDS-A-HUMAN` — 确实要人。给去哪找、简报里写什么、大概该花多少钱（好让你认得出
  离谱报价）。

**这一条是本站的诚实底座，也是它的差异化**：一个靠推荐分成赚钱的站，天然有把所有人
都推去雇人的动机。结构性的解药是**前两种判定一分钱不赚，而且它们是表里的多数**。
表是公开的 `routes.json`，这条自律随时可被任何人核对——这是聊天机器人的答案不具备的
属性（固定、带日期、带来源、可审计、可 fork）。

## 机器结构

- 纯静态 `site/`（index.html + **routes.json（唯一事实源，CC BY 4.0）** + llms.txt +
  robots.txt + sitemap.xml）；分诊在**浏览器内**按关键词重叠打分完成，triage 时
  **不发任何请求**，用户文本除非主动提交否则不离开页面（页面上明说了这一点，别改）。
- `worker.js` = 资产透传 + `/e` 白名单事件 + 服务端 page_view + `/api/request`
  需求收集 + `/api/pay-info` 读密钥。所有 D1 写入 try/catch + waitUntil（舰队规矩：
  分析永远不能 500 掉站点）。
- D1 `agimatch-events`（**71f9d85f-1363-48f4-85ee-a445fb9dd203**）：
  - 表 `ev`（同舰队标准 10 列）——**建站时已手动建表**；worker 不会自动建 ev 表，
    若换库必须先建，否则埋点全部静默失败（try/catch 会吞掉错误，查不出来）。
  - 表 `requests`（需求收件箱，worker 内 `CREATE TABLE IF NOT EXISTS`，不依赖部署顺序）。
- 事件白名单：`triage_use` / `triage_result{bucket}` / `route_click{platform}` /
  `tool_click{tool}` / `request_open` / `request_submit` / `pay_open` / `pay_copy` / `sub_click`。
- 部署：`deploy-agimatch.yml`（push 路径过滤 + dispatch，**无 schedule**——路由表维护
  搭舰队既有每日会话，不新增 Actions 成本）；域名 match.agiscorecard.com
  （wrangler custom_domain 自动挂载，同 goldrush/source 模式）。
- **一键停止**：owner 在 GitHub 网页新建 `sites/agimatch/KILLED` 文件 → 流水线拒绝
  部署，线上冻结在最后版本；删除该文件恢复。硬停 = CF 面板删自定义域。

## 部署门禁（deploy workflow 里的硬检查，别拆）

1. 六个必需文件存在 + `node --check worker.js`。
2. **routes.json 结构校验**：每个 bucket 必须有 id/tier/answer，tier 必须是三种之一。
   表坏了页面就是空的，这个站没有别的内容。
3. **钱包地址形态扫描**：`site/`、`worker.js`、`wrangler.jsonc` 里出现 EVM/TRON 地址
   形态的字符串直接 fail。收款地址只能是 Worker secret（见下），公开仓永不落地址。
4. 部署后自检断言三条：首页 200、routes.json 200、**`/api/request` 对过短输入返回 400**
   ——第三条是关键：它证明需求入口的校验路径真的在跑，而不是 500 或 404。这是本站唯一
   的痛点入口，静默失效等于站死了（gridlings 死循环潜伏三天的教训）。

## 收款：非托管，地址走密钥（owner 的 web3 指令的合规落地）

- owner 在 Cloudflare 面板给 worker 设 secret：`PAY_USDC_EVM`（EVM 链 USDC）和/或
  `PAY_USDT_TRC20`。**未设置时页面显示「渠道未发布」并明说本站当前不收费**——这是
  没人要买之前唯一诚实的状态，不要为了页面好看而伪造一个价格。
- **本站永不托管资金**：不做 escrow、不代收代付、不做争议仲裁、不是任何交易的当事方。
  页面上「显示地址 / 生成付款链接 ≠ 替他人保管资金」那段是合规边界声明，**不许删、
  不许弱化**。
- 沿用舰队既有规矩：**不存在的产品不标价**（agi 站硬规则）。所以 v1 不印固定价格。

## 建站调研裁决（2026-08-30，9 维度并行 + 对抗复核；沙箱 WebFetch 全封，证据全部来自 WebSearch 返回的真实片段与 URL）

### 论点的一手支撑（本站存在的理由，别再重新论证）
Gartner 新闻稿（2025-06-25）：**40% 以上的 agentic AI 项目会在 2027 年底前被取消**
（成本失控／价值不明／风控不足）；同一份分析估计**数千家自称 agentic AI 的厂商里只有
约 130 家是真的**，其余是「agent washing」——把已有的 chatbot／助手／RPA 换个名字。
→ 这就是「先判定要不要雇人」的全部理由，也是 routes.json 里 `premise` 字段的内容。

### 三门（本站为何可以存在）
- **需求门**：AI agent 支出在涨，但同期有权威预测的高取消率 + Reddit 上建设者自己在说
  「很多钱花在本该是简单自动化的东西上」。需求真实且带痛感。
- **差异门**：全网都是「AI 工具榜单」和「找开发者」落地页，**没有第二个站敢把多数判定
  写成"你不需要雇人"**——因为多数站靠推荐分成活着。这条差异化是结构性的，不是文案。
- **诚实门**：每条价格带来源、每条判定带日期与翻转条件、匹配不上就说匹配不上。
  当前 10 桶里 **6 桶（60%）给本站赚零收入**，页面上那句话是可核对的事实。

### 子域铁律三条（舰队规矩，逐条如实评估）
1. **技术形态需隔离** — ✅ 独立 Worker（`/api/request` 收件箱 + `/api/pay-info` 读密钥
   + 独立 D1），与主站纯静态资产形态不同。
2. **受众与现有站不同** — ✅ 主站受众是「想知道 AGI 什么时候到」的读者，本站受众是
   **手上有一件具体的活、正准备掏钱的人**。判定型内容 vs 采购决策，重合度低。
3. **自带变现闭环** — ⚠️ **部分满足，且这是本站最诚实的弱点**：路由点击→联盟是完整闭环，
   但**联盟账号尚未申请**（见下面 owner 待办），所以 v1 上线时闭环在结构上成立、
   在收入上为零。这一条不算全绿，如实记录，判定线到期照此结算。

### ⚠️ 查询意图裁决（2026-08-30 SERP 实测，**后续会话选题必须照此，别凭直觉**）
八个候选查询里**只有一个**同时具备「SERP 弱」+「本网络需要的判定/对比形状」：
**「AI automation consultant cost」**。已据此把 `vetting-a-vendor` 桶改造成
**「这该花多少钱 + 怎么鉴别报价的人」**的一等入口（带 Upwork $30–150/hr、
专业费率卡 $155–185/hr、综合调查 $80–250/hr 三方数字与平台抽成，全部带源）。
**三个意图错配，永远不要瞄准**（会招来完全错误的受众）：
- **「find AI freelancer」** — 首页 6–8/8 是**求职方**页面（Toptal freelance-jobs、
  ZipRecruiter、Freelancer.com jobs、Upwork freelance-jobs、Guru）。排上去带来的是
  **供给侧，不是需求侧**。
- **「AI developer marketplace」** — 首页全是 **AI 模型/API 市场**（AI Planet、
  SingularityNET、Marketplace AI）或「用 AI 搭市场」的课程。这个词已经名花有主，
  **站名、页面标题、导航一律不许用这个说法**。
- **「who can build me an AI agent」** — 首页全是 DIY 无代码搭建工具，零招聘结果。
（本站现有标题「Do You Actually Need To Hire Anyone?」是判定形状，不是市场形状,
符合裁决；改标题前先回读这一条。）

### 已被调研否决、**不要再提**的方案
1. **把撮合放到 web3 工作平台上**（LaborX / CryptoTask / Gitcoin / Dework 一类）——
   调研裁决原文：「web3 付费工作这个品类是一片墓地」。已确认死亡或残存：CryptoTask
   （标记为 Out of Business）、Replit Bounties（2025-09-06 关停）、Gitcoin Bounties
   （2023 移交 Buidlbox，后被 HackQuest 吸收）、Gitcoin Grants Stack（2025-05 停运）。
   **没有一个是通用的「雇人并用加密货币付款」市场**。把认真的客户送过去等于坑他。
   → 所以本站架构是：**撮合走成熟主流平台（Upwork/Fiverr），web3 只做支付轨道，
   不做撮合场所**。owner 的「支付交易用 web3」指令由后者满足，前者不能为了扣字面而伤客户。
2. **x402 作为人类访客的付款方式** —— 拒绝，但**要把拒绝的理由记准，别记成「x402 死了」**：
   - 舰队账本判的是 **dead-by-volume**（goldrush ledger 条目 `x402`，2026-08；翻转条件：
     连续两个季度真实非测试交易量增长，下次复核 2026-11）——那是**经济体量**的判定。
   - 2026-08-30 本轮调研补充的是**技术就绪度**，两者都成立且不矛盾：x402 技术上活着且
     **Cloudflare 原生**（Coinbase/Cloudflare/Stripe 都在 x402 Foundation TSC，Cloudflare
     自家仓库有基于 `@x402/hono` v2.24.0 的 Workers 示例，2026-08-27 发布）。
   - **但两条足以沉掉一个天真实现的事实**：①免费的 `x402.org/facilitator` 是
     **testnet-only，明确不支持 Base 主网**，上主网就得挑第三方 facilitator；
     ②人类浏览器路径虽然存在（`@x402/paywall` + wagmi/Coinbase Wallet，EVM bundle
     实测 655 KB gzipped），但**包括 Cloudflare 官方在内的每一个一方示例，付款方都是
     「持私钥的 agent」而不是人**。
   - **结论：x402 是 agent/API 侧的正确轨道，是首次到访的人类的未验证轨道。**
     本站收人类的钱走普通稳定币转账。哪天本站要卖 agent 可读的 API，再回来看 x402。
3. **自建托管/escrow** —— 一旦代持双方资金即进入资金传输监管范畴，公开仓 + 单人 owner
   的形态承担不起。非托管边界是硬约束，不是保守。
4. **LaborX 作为撮合去处** —— 调研原文：Trustpilot 约 2.1 分，反复出现不付款、资金锁定、
   封号无申诉的投诉。它 50% 手续费分成是本维度最高的挂牌费率，**恰恰因此要拒绝**：
   为几美元把舰队已有真实亚马逊佣金收入背书的联盟信誉压上去，是最坏的交易。
   列为「有这么个板」可以，把客户送去那里托管资金不行。
5. **Freelancer.com 联盟** —— 其条款要求被推荐人是「与你有既存关系的个人或企业」并禁止
   从名单获客，**匿名流量的内容站在结构上无法合规**；佣金还只算被推荐人前 100 天且
   赚得后 3 个月过期。别申请。
6. **PeoplePerHour** —— 是用户对用户的推荐计划，付 £30/$35 的**站内account credit**
   且每月上限 £150。不是可用的变现面。

### 台账口径（并入舰队钱线仪表盘）
D1 `agimatch-events` 现查 28 天窗，按序报四个数：
`triage_use`（有人真的用了分诊）→ `triage_result{bucket}`（落在哪些桶，
**nomatch 占比是表的健康度**）→ `brief_copy` + `route_click`（**主 KPI，等于舰队口径的
rev_click**）→ `requests` 表行数（需求收件箱，**报计数与分类，内容与联系方式永不出仓**）。

### 预登记判定线（到期照杀，不救、不提前拆）
- **2026-10-30**：`triage_use` < 20/28d → 判「没人用」，**降级为主站 /invest 板块下的
  一个页面**，子域停用（铁律第 3 条本来就没全绿，届时按证据结算）。
- **2026-11-30**：`route_click` + `brief_copy` 合计 < 10/28d → 判「用了但不动手」，
  拆掉路由按钮只留判定表（表本身对 AI 引用仍有价值，是可留下的残值）。
- **2026-11-30**：若 owner 已加入联盟计划但 28 天联盟收入仍为 0 且 `route_click` ≥ 10
  → 判「点了不成交」，问题在下游平台而非本站，停止在联盟上追加投入。
- **nomatch 占比 > 60%** 连续两次复核 → 表的覆盖面是错的，**扩表而不是加流量**。

### owner 待办（只有账号持有人能做，自动化做不了）
1. **联盟账号（变现的前提，v1 上线时全部未办，页面因此只放普通链接）**：
   - **⚠️ 以下数字全部 UNVERIFIED，只是规划输入，一律以 owner 实际后台为准。**
     它们来自单次 WebSearch 的**合成摘要**（不是抓到的原页），对抗复核当日无法回源
     （沙箱 egress 全封 + 搜索配额耗尽），且复核指出**存在跨平台串号嫌疑**。
   - Fiverr Affiliates（UNVERIFIED）：marketplace CPA ≈ 首单买家金额 25% + 其余订单
     10% 分成 12 个月；Fiverr Pro CPA ≈ 70%；CPA 上限 ≈ $500；cookie ≈ 30 天。
     **「起付 $100」已降级为 UNKNOWN**——来源太薄，别据此做决定。
     另：Fiverr 的申请是**人工审核**，通过时长未知，**所以不要假设"第一周就能变现"**。
   - Upwork（UNVERIFIED）：通过 Impact 平台运营。**cookie 时长 = UNKNOWN**
     ——原先这里写的「30 天」经复核判定很可能是**从 Fiverr 串过来的**，任何来源都没有
     确立 Upwork 的 cookie 窗口。已删，不要再凭印象填回去。
   - **注意区分**：PeoplePerHour / Contra / Braintrust 的那些「推荐」是**用户对用户的
     friend-referral**（发站内额度/钱包积分），**不是面向内容站的 publisher 联盟计划**，
     不要把它们并进联盟版图比较。
   - **⚠️ 照抄 eco/tds 的血泪教训：先把 match.agiscorecard.com 加进各计划的站点列表，
     再把页面链接换成联盟链接。未列站点就投放，佣金可被判无效——先待办、后切换，
     不自行抢跑。**
2. **收款地址（web3 指令的落地）**：Cloudflare 面板给 agimatch worker 设 secret
   `PAY_USDC_EVM` 和/或 `PAY_USDT_TRC20`。未设置时页面自动显示「渠道未发布」并明说
   本站当前不收费——**这是没人要买之前唯一诚实的状态，不要为了页面好看而伪造价格**。
3. Search Console / Bing 提交 sitemap（同其他站流程）。
4. **⚠️ 别假设 apex 覆盖子域**：根 CLAUDE.md 记录 owner 已于 2026-08-28 把
   agiscorecard.com 加进 US Associates 站点列表，但 **match.agiscorecard.com 是新子域**，
   不要假设它自动被覆盖——去后台确认，或显式加上。子域覆盖正是那种「猜错就佣金作废」
   的便宜失败模式。

## 本维度仍未完成的调研（下次有外网的会话必须补，别当已办）

2026-08-30 建站时沙箱 **WebFetch 对所有非开发域名 egress 拦截**（ftc.gov、ecfr.gov、
affiliate-program.amazon.com、fiverr.com、reddit.com 实测全封；只有 github.com 通），
且 WebSearch 配额当日耗尽（200/200）。因此以下五项**从未被读过**，一律标 UNVERIFIED，
**任何会话不许凭记忆重构它们来填空**——在披露这一层伪造法条引用是最自毁的失败：
1. FTC Endorsement Guides（16 CFR Part 255，含 2023 修订）的「clear and conspicuous」
   定义与联盟链接位置要求 —— 待抓 eCFR 16 CFR 255.0 / 255.5。
2. Amazon Associates Operating Agreement 的披露句式与站点登记义务。
3. Fiverr Affiliates 与 Upwork（走 Impact）是否有亚马逊式的「必须登记投放站点」要求。
   **注意：本文件里记的那些佣金数字（Fiverr 25%/70% CPA、$500 上限、30 天 cookie 等）
   是上一轮 WebSearch 片段，未经复核，属规划输入——绝不许上公开页面**，以 owner 后台为准。
4. 监管机构对「导流/撮合站误导性宣称审核过供应方」的执法案例。**不许点名任何公司或
   案件**，记错一个名字就是本仓禁止的编造。
5. 非托管服务费的加密支付披露惯例。

**在读过这些之前，任何 commit、页面、报告都不许把本站文案描述为「符合 FTC 要求」
或「已过法务审查」。诚实的说法是「本站自订的披露标准」，作用完全相同。**

## 反激励铁律（本站唯一不可交易的东西，改它等于毁站）

**`SOLVED-NOW` 与 `DIY-WITH-GUIDE` 两类桶永远不许挂联盟链接。** 联盟链接只能出现在
`NEEDS-A-HUMAN` 桶的 route 上。理由是结构性的：一个靠推荐分成活着的站，唯一能让人
相信它说「你不用雇人」的方式，就是这句话对它自己没有好处。

**唯一事实源 = `route.affiliate` 布尔字段**（2026-08-30 对抗审计后加）。它同时驱动四件
以前会各说各话的东西：①`rel` 属性（`sponsored` 只在 true 时出现——给未付费链接打
sponsored 是机器可读形式的假话）②链接下方的付费/不付费标签 ③页面级披露 ④部署门禁。
**任何路由缺这个布尔字段，部署直接失败**；缺省不算 false，必须显式写。

页面上那句「不收费的判定是多数」由 JS 从 routes.json 现算（`#nofeeshare`）——**且它数的
是「有几条付费链接」而不是「有几个桶属于哪个分级」**。（第一版数的是分级，审计指出
那样它结构上**测不到它自己声称要防止的违规**，因为 DIY 桶照样可以挂路由。已改。）

**部署门禁硬拦两个方向的错误**：①SOLVED-NOW / DIY-WITH-GUIDE 桶带 `affiliate:true` →
拒绝部署（要这笔钱的诚实做法是**把桶重新分级、让页面上的计数自己掉下去**，而不是
偷偷变现一个页面承诺不变现的桶）；②URL 里带 tag= / impact.com / irclickid 等联盟参数
但没标 `affiliate:true` → 拒绝部署（未披露的付费链接是本站唯一不能出的事故）。

**⚠️ Zapier 与 n8n 都有 partner 计划，但那两个桶是 DIY，永远不许挂联盟链接。**

### 切换到联盟时的成品文案（停在这里，到时候直接换，不要临场发挥）
`#money` 段替换为：「Some links to hiring platforms are affiliate links: if you hire
through one, the platform may pay this site a commission. Your price is the same either
way. Paid links are labelled on the link itself, not only here. The platforms that pay
this site are: **[列出平台名]**. Last updated **[日期]**.」
——**必须列出平台名与日期**，含糊的「some links」而不列名单是最弱的一种披露。
页脚同步换掉「No outbound link on this site is currently an affiliate link」这句。

## 公开仓红线（本站相关）

- `requests` 表里可能含用户留的联系方式：**任何报告、日志、commit 里一律脱敏**，
  原文永不出仓。台账只报计数与分类，不报内容。
- 收款地址、密钥永不入仓（门禁第 3 条已做硬拦截）。
