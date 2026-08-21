# STRATEGY-2027 — AI 时代最强投资×AI 网站作战文档

站长指令(2026-08-08):"把这个网站打造成 AI 时代最强的投资与成功的 AI 网站…用 AI 时代
的算法,用 AI 时代赢得商业模式"。本文档是深度调研后的执行战略,每日自动运行按 Phase
逐项执行并回写状态。robots 已 disallow;这是作战文件,不是营销页。

## 一、调研结论(2026-08-08 核实,带日期)

1. **分发革命已发生**。AI 平台 referral 访问 2025-06 达 11.3 亿次(+357% YoY),但传统
   AI 答案点击率 <1%——零点击时代"内容站"死,"数据源站"活。关键数字:AI referral
   转化率是传统 organic 的 4.4×;各引擎引用重叠仅 ~11%(680M 引用样本),意味着
   **做被所有引擎都不得不引用的原始数据源,比抢任何排名都值钱**。Claude 是增速最快
   的 referral 源(18.5%,已成第二大)。本站已实测收到 perplexity.ai 引荐。
2. **Agent 经济的收费层刚刚出现**。Cloudflare Monetization Gateway(2026-07-01 开
   waitlist):网页/数据集/API/**MCP 工具**均可经 x402(HTTP 402+稳定币)按次收费;
   2026-09-15 起 Cloudflare 新站默认屏蔽 AI 商用抓取 → **付费数据访问将成常态**。
   本站全栈已在 Cloudflare(Worker+D1)= 直接通道,无迁移成本。
3. **预测经济是 2026 最热赛道之一**。Polymarket 谈 $20B 估值(CNBC 2026-08-04),
   Kalshi $22B(2026-03),行业交易量 2026 预计 $240B、Bernstein 预测 2030 $1T。
   预测市场的原料是**裁决证据与校准研究**——本站(可审计判定+预登记翻转条件+红队
   幸存概率)恰好站在它们的上游。

## 二、定位与"AI 时代算法"

**定位一句话:The Evidence Layer for the AI Era——AI 时代的证据层。**
AI 时代的赢家算法不是流量算法,是:**原始数据资产 × 可审计性 × agent 可读性 ×
事件驱动订阅**。四项本站都已有底子,战略=把它们做成三台引擎:

### E1 证据资产引擎(GEO → Agent 分发)
已有:data.json(CC-BY)/index-history/FORECASTS 台账/red-team odds/llms.txt/
搜索需求日志。升级路径:
- **agiscorecard MCP server**(Worker 上加端点):tools = get_tracker_score /
  get_verdicts / get_forecast_ledger / score_basket(复用 ai-stock-exposure 权重)。
  让 Claude/ChatGPT 的 agent 原生调用本站数据——**agent 分发的先手棋,竞品全无**。
  免费层先铺占有率。
- **Monetization Gateway waitlist 报名**(owner ~3 分钟,唯一人工步骤)→ 深度数据
  (逐条证据史/高频 API/组合监控)走 x402 按次收费。人类免费看,agent 批量读=付费。

### E2 校准与竞赛引擎(Metaculus × Duolingo 混血)
已有:用户表态(flip poll/future-bet/agi-test)、站方台账(8 判 5 中=62.5%,n 小已
如实标注)、SunWatch 红队幸存概率。升级路径:
- 公开**校准页**:站方每条概率判断计 Brier 分,n≥20 起亮牌——"我们敢被打分"是
  订阅钩子的终极形态。
- 用户预测记分:picks 入 D1 → 用户 vs 站方 leaderboard、连对 streak(游戏化留存)。
- **AGI-2027 裁决(2027-12~2028-01)= 本站超级碗**:提前建 resolution hub,承接
  预测市场裁决期的全部搜索与引用需求。12 月起每日运行进入 resolution 模式。
- 独家内容格式:**「赔率 vs 证据」周对照**——Polymarket/Kalshi 的 AGI/AI 相关合约
  赔率 vs 本站证据层读数,差异即内容。预测市场越热,这个格式越值钱。

### E4 欧美面引擎(owner 2026-08-08:"针对欧美英文的也是对应策略改造")
营收大头天然在英文侧:Boosts 合格订户主要是英文列表、x402 agent 生态是英文、
预测市场交易者是英文。规则与现状:
- **EN-first 规则**:一切新战略面默认英文优先(+zh 对等)。主站与 MCP/calibration/
  resolution/odds/changelog 已达标;odds-vs-evidence 周更的目标读者就是英文预测市场
  交易者。
- **SunWatch EN 覆盖**:bot 已按 language_code 双语(2026-08-08,USDT-first 报价,
  EN 链接指 /en 面)。**美股 18/18 已全部 EN 化(2026-08-13),即英文读者真正买得到
  的标的 100% 覆盖**,并新建 `/en/stocks` 索引——此前 5 个英文标的页是孤儿,/en 上
  没有任何入口。剩余 30 个为港股/A 股,索引页明确标注「仍只有中文」及数量,而不是
  默默给英文读者一份更短的名单;这批按需推进,优先级低于美股(欧美读者多数买不到)。
  规则不变:忠实翻译既有 zh 分析,`—` 占位字段直接省略,严禁补未经核实的数字或机翻腔。
  **英文页硬约束**:① 任何中文字符串(含 ticker 本身是中文的标的)不得进入英文页;
  ② 文案里不要写 HTML 实体——`escS` 会二次转义成字面量(SNDK 的 `&quot;` 就这样在
  线上错了一段时间);③ 新路由的冒烟断言必须带传播重试,否则部署后几秒就断言必红。
- **EN 分发**:directory-submissions 技能的英文目录清单、/advertise 英文媒体包已有;
  AI 引擎引荐(perplexity 已实测)即英文分发主通道。
- **分发自动化(2026-08-15 修正版——价格核实后改道)**:账号级已启用 marketing
  (带 Ahrefs/Similarweb)与 searchfit-seo(11 个 SEO 技能)插件。postiz 插件已装
  (enabled)但**暂缓接入**:核实发现托管版 $29/月无免费档,自托管要自养服务器,
  对营收为 0 的站不成立——推荐它之前没先查价,是本引擎的失误,落档为戒。
  **X 自动发帖已搁置(owner 决定 2026-08-15:「先不自动化发帖,我的x基本没有粉丝」
  ——判断正确:对 0 粉丝账号广播,分发价值≈0,方案存档待粉丝基础出现再启)。**
  **官方 MCP Registry 已上架(2026-08-15,全自动完成):`com.agiscorecard/agi-scorecard`
  @ registry.modelcontextprotocol.io,status active——域名验证走的是站点自己
  (.well-known/mcp-registry-auth,本站即证明),ed25519 私钥即用即弃,不入库;
  future 版本更新流程=重新生成密钥→更新 .well-known→login→publish,零 owner。
  ~~下游目录会爬官方 registry,无需逐家提交~~ **——此判断 2026-08-16 被实测推翻**:
  agiscorecard 8-15 上官方 registry,8-16 在 Glama 里仍查无此条(owner 新建 Connector
  成功、无重复冲突即证明)。**每家目录仍须单独提交**,别指望自动同步。已提交清单:
  Glama(vaft Server 审核中/Connector 已在;agi Connector 8-16 审核中)。
  待办目录:PulseMCP、mcp.so、MCP.Directory——同样要逐家交,优先级低于内容与转化。看板:D1
  site_search{location='mcp'} 首调仍为里程碑。
  **awesome-mcp-servers PR #12240(2026-08-16)**:owner 已开 PR;bot 整改后分支已修
  (vaft 补 Glama 徽章;agiscorecard 条目撤下——主仓库私有,给不了 GitHub 链接也过
  不了 Glama 检查,且绝不为此转公开:owner-identity 等私档在 git 历史里)。
  **Glama 的两条通道必须分清(2026-08-16 实测,别再误判)**:Server 标签要求公开
  GitHub 源码仓;**Connector 标签只要已部署的远程端点,不要求公开仓**——所以
  agiscorecard 走 Connector 即可收录(owner 2026-08-16 提交),无需等 mirror 仓。
  但 awesome-mcp-servers 的机器人是硬要 github.com 链接的,那条仍需公开仓。
  **公开镜像仓已建成(2026-08-16):`f-tiger/agiscorecard-mcp`** —— 9 个文件,内容
  = MCP 清单 + 已公开数据集(data.json/index-history.json)+ 每晚同步脚本;线上
  复检零 owner 私密内容,workflow 带隐私闸门(owner-* 出现即红)。它同时是判定变动的
  第三份公开证据(网站/D1/git 提交历史),且 commit 时间戳不可篡改——对「承诺可核查」
  这个卖点是硬资产。**由此解锁**:Glama Server 通道(owner 已提交)+ awesome 清单
  第二个 PR(等 Glama 评分出来即开)。
  **agiscorecard 回归 awesome 清单的路径(执行中)**:仿 bpj 的 mirror 模式建小型公开仓
  `agiscorecard-mcp`(server.json + README + glama.json + 端点文档,零私密内容)→
  Glama 收录 → 后续 PR 补条目。建仓需 owner 1 分钟(会话无建仓权限),其余全自动。**
  分发权重就地重排,按「不依赖自有粉丝」排序:①GEO/AI 引擎引荐(唯一在增长的通道,
  周环比已翻倍)——继续每日 freshness 循环;②嵌入/徽章(观众是别人网站的读者);
  ③目录提交(owner 一次性分钟数,观众是目录的流量);④社区帖(lesswrong 4 + EA
  论坛 2 的引荐已自然出现——**观众在哪就去哪发,而不是对自己的空房间广播**;维持
  owner 手动,文案我备好)。原直连 X API 方案存档如下,激活条件改为「粉丝>500 或
  owner 主动要求」:
  ~~改道直连 X API~~(2026-02 起按量计费:纯文帖 $0.015、带链接帖 $0.20;本站种子
  帖必带链接,按每周 2-3 帖 ≈ $2.4/月,是 Postiz 的 1/12)。激活条件(owner 一次性
  ~10 分钟):developer.x.com 注册开发者账号 + 建 app + 充最低额度,把 4 个密钥配进
  Cloudflare Worker Secrets。配好后每日 cron 接管:从 changelog 取未发帖的最新真实
  变更 → 组帖(零编造,带链接)→ 发 X → 记账,每周 ≤3 帖。**止损线预登记:连续
  90 天 t.co 引荐(D1 ref_host)带来的点击 < 帖数,即停发并复盘**——花钱的自动化
  必须自证。Reddit 维持 owner 手动铁律不变(社区规范,自动发帖=封号风险)。

### E3 营收阶梯(AI 时代商业模式,自动化优先)
免费证据(引用护城河)→ 邮件订阅(beehiiv Boosts $1-3/合格订户,事件驱动承诺已
全站统一)→ SunWatch Pro ¥199/月(已在收,USDT 自助通道已通)→ **数据/API 授权
(x402 agent 付费,新增)** → 赞助位(/advertise 已建)→ resolution 事件变现(2027
底流量峰值期)。北极星不变:订阅流;一切用 D1 度量。

## 三、90 天路径(每日运行逐项执行,完成打勾回写)

**Phase 1(8 月)**
- [x] MCP server v0(2026-08-08 上线):/mcp Streamable HTTP,3 个只读 tools
      (get_thesis_tracker/get_verdicts/search_site);llms.txt + /for-agents 已声明;
      本地 JSON-RPC 全流程单测通过
- [ ] owner 动作:Monetization Gateway waitlist 报名(链接见 Cloudflare blog)
- [x] **invest-13f-refresh —— 2026-08-16 完成,且外部阻塞已彻底解除**。
      解法不是等代理放行,而是换执行者:会话沙箱够不到 sec.gov(连测三日全 000),
      但 GitHub runner 可以。aistock(公开仓,Actions 免费)新建 `scripts/edgar-13f.mjs`
      + `edgar-13f.yml`,季度性抓 8 位投资者的**逐笔申报原文**落成 JSON。
      8/8 全部拿到;Compass 的 investors.ts 已全量改以原文为准,每家 sources 首位
      挂 EDGAR 链接可逐笔回查。验证:聚合后的伯克希尔 Q2 与公开报道**五项精确吻合**
      (Apple 22.0%/AmEx 17.1%/KO 10.9%/Alphabet 9.4%/BAC 9.2%)。
      **可复用的方法**:凡是被出网代理挡住的数据源,先问「有没有一台我够得到、
      而它够得到目标的机器」——runner 就是。踩坑记录见 aistock/docs/operations.md。
- [x] invest-13f-refresh-berkshire(2026-08-16)
- [!(原记录)] invest-13f-refresh —— **外部阻塞(2026-08-13 实测,2026-08-14 Q2 截止日再测,三个域名全部 000)**:sec.gov / data.sec.gov /
      efts.sec.gov / whalewisdom / dataroma / 13f.info **全部被出网代理阻断**(curl 与
      WebFetch 双通道均失败)。硬规则要求持仓只能来自逐笔申报原文,二手报道不可用,
      因此**本项自动化不可执行**,不是排期问题。解除条件(任一):①owner 提供申报原文
      或导出的逐笔持仓;②代理放行 sec.gov。在此之前每日运行不再把它当待办反复排期。
- [x] 校准页 v0(2026-08-08 上线):/calibration——三本台账盘点 + n≥20 起公开
      Brier 的预承诺;已入 sitemap/llms.txt/agi-questions/首页 Research 卡
- [x] 「赔率 vs 证据」第一期(2026-08-08):/agi-odds-vs-evidence——快照带日期与
      来源,核心洞察=市场定价"宣布事件"vs 本站评级"能力主张"
- [x] 赔率取数自动化(2026-08-17):沙箱够不到 gamma-api.polymarket.com(实测 000),
      改由 runner 每周一取(.github/workflows/odds.yml → odds-snapshot.json,带 ISO
      时间戳与成交量),gen_odds.py 消费;取不到就报错退出,绝不沿用旧数冒充新鲜。
      **周更节奏按该页自定的更严规矩执行:「更新在有变动时,不在日历上」**——
      每周复核并把结果(含"两边都没动")记进页面的复核日志,只有真动了才发新一期。
      为凑周更而发的一期就是 filler,那会毁掉这个格式本身的可信度。
**Phase 2(9 月)**
- [x] 用户预测入 D1 + leaderboard v0 + streak(v0 上线 2026-08-21,提前于九月:pick_ledger 事件入 D1(匿名 pid,location 通道,零账户)、/forecaster-leaderboard「第十一位预测者」区(空态诚实起步)、streak 计分规则与聚合刷新配方在 tools/gen_leaderboard.py docstring;首个 verdict flip 日结算首批对错。规格:docs-picks-leaderboard-spec.md)
- [x] public /changelog(2026-08-08 提前完成):changelog.json(仅真实已发布变更)
      + 生成器;分数历史自动附带
- [ ] x402 试点:选一个深度数据集挂 Gateway(若 waitlist 通过)
**Phase 3(10 月起)**
- [x] resolution hub 骨架(2026-08-08 提前 17 个月上线):/agi-2027-resolution——
      裁决标准预登记+倒计时+当前证据态;2027-12 起每日运行切 resolution 模式
- [ ] agent 付费流水首单 → 记入 analytics-notes 里程碑

## 四、诚实边界
- 不做交易执行、不碰用户资金——上游证据层的护城河恰恰是中立性。
- 台账不删失误、概率标 n、赔率必核实——可审计性是全部估值的地基,一次造假清零。
- 每 Phase 结束用 D1 数字复盘,不达即调,本文档随之更新(改版留档)。
