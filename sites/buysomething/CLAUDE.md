# buysomething(SourceRadar)— 第六站操作手册(2026-08-22 并舰)

**定位**:面向欧美买家的中国爆款选品情报站(原 f-tiger/buySomething 仓,由
buysomething 会话孵化;owner 2026-08-22 指示并入舰队)。战略与调研底稿在
`docs/`(BRIEF/STRATEGY/research),**改动前先读它们**——选品逻辑、合规红线
(docs/research/07-legal.md:公开数据、无登录、无验证码绕过、限速)是原项目
的立身之本,并舰不改变。

## 机器结构

- `site/` = 纯静态(index/app/data/styles + trends.json);`data.js` 是人工策展的
  选品库,`trends.json` 由 `tools/fetch_trends.py` 每日 05:20 UTC 在 CI 生成
  (trendspy,≥30s/词限速、429 退避、keep-last-good——**失败不碰旧数据,站点
  自动降级到编辑评级**,这个设计不许简化掉)。
- 部署:deploy-buysomething.yml(push 路径过滤 + 每日 schedule);worker 纯资产
  透传;域名 **source.agiscorecard.com**(伞域子域模式)。
- 旧仓 f-tiger/buySomething:原孵化仓,由 buysomething 会话维护;并舰后以
  monorepo 为准。旧仓 GitHub Pages 部署与 trends workflow 与本站互不冲突,
  但**不要**在两边同时改 data.js——冲突时以 monorepo 为准。

## 队列(并舰待办,一轮一项)

1. ~~canonical/OG/sitemap/robots/llms.txt 补齐~~(2026-08-22 完成)
2. ~~D1 埋点~~(2026-08-22 完成:D1 `sourceradar-events` f92b6207-90bf-46f6-97c7-cc88195b2ec7 表 `ev`;服务端 page_view + 白名单 pick_open/calc_use/out_click/search_use)
3. ~~转化钩~~(2026-08-22 完成:STRATEGY.md V1 订阅漏斗——POST /subscribe → D1 `subs` 表,NO-API 模式地址先落库,文案只承诺「下一批选品落地时发一封」;`sub_ok{sourceradar}` 计入舰队订阅证伪线)
4. 周分发循环自动覆盖(monorepo git log 扫描即含本站)

## 自动进化(owner 2026-08-22「新加进来的2个站点也要具备自动扩展，自动进化能力」;
## 同日补充「一个网站自己进化不依赖你，一个是舰队自己的」——两层分开)

**第①层:站点自进化(零 AI 依赖,纯 CI 反馈回路)**
- 每日 05:20 CI:trendspy 刷新 trends.json(需求侧信号,keep-last-good)。
- 读者热度不再走 CI 烤制(2026-08-24 拆除:bake_popularity 需要 D1 读令牌,
  部署凭证没有,天天 403)。改由 **worker `/api/pop` 直读 EV 绑定**(缓存 1h,
  零外部凭证),app.js 消费同一形状 {picks:{id:{o,x}}}。
- 前端:样本 ≥20 次点开后,**默认排序自动从编辑 trendScore 切到真实读者热度**
  (out_click×3 + pick_open)——读者用点击投票,首页自己重排,全程无 AI。
  埋点标签自 2026-08-22 起用 product id(此前 0 行,无历史损失)。
即使所有 Claude 会话永久消失,这一层照常运转:需求数据日更、首页按读者行为
自适应、部署自动。

**第②层:舰队进化(Routine 会话层,做第①层做不了的判断)**
每日进化 Routine(05:40 UTC,自绑舰队会话,与 sellSomething 合用一个 Routine)
每轮做且只做一项,顺序:
1. **读信号**:D1 `sourceradar-events`(f92b6207)——pv 增长、`pick_open`/
   `out_click`/`search_use` 分布、`subs` 表新订阅;CI 的 trends.json 当日热词。
2. **队列有未打勾项** → 做它。
3. **队列空** → 按信号自续 1-3 项,**每项必须挂一个真实信号**(某选品被点开
   最多 → 深化它;某搜索词无结果 → 补它;trends 热词与选品库有交集 → 上新
   一条策展)。没有信号就不硬凑——报告「队列空、信号不足」,只 bump 新鲜度。
4. **零编造红线**:选品数据只来自 data.js 人工策展 + trendspy 一手数据;
   合规红线(docs/research/07-legal.md)不因自动化放松。
5. 判定线到期(~10-21)由 Routine 自动结算:达标加码,不达标降为最低维护
   并在报告里宣布。

## 快反出页规则(2026-08-23,owner:「监控谷歌trends,让站点快速获取流量」)

trends.json 只跟踪**预选**产品词的动量(徽章/排序用),发现不了新需求。新增
`site/rising.json`:六个种子品类词的 rising 关联查询,每日 05:20 与动量同 run
刷新(schedule-only,commit 回写)。**每日进化 Routine Step 1 增读 rising.json**:
某 rising 词 v ≥ 200 或 Breakout,且是真实产品需求(非新闻/明星)→ **当天**动作
二选一:①词与现有选品强相关 → 深化该选品卡(补该角度)②全新品类 → 按策展
规则新增一条 pick(零编造:三层价采集流程不简化)。同词 14 天冷却,当天最多
1 项。判定线:快反项 28 天 pick_open ≥5 → 有效;连续 5 项全空 → 判据回炉。

## eco 对标诊断与移植(2026-08-31,owner:「sourceradar 参考 eco 站点优化」)

**先测再抄。eco 的 28 天数字里第一名根本不是页面**:`/__ci_healthcheck` 188 次是自家 CI,
**真实 pv 是 662 不是 850**(记分板口径已修正)。剔除后结构一目了然:

| eco 真实流量落点 | 次数 |
|---|---|
| `/guide/*` 问题页(klimaanlage-wohnmobil 51、tilt-and-turn-windows 42、ausverkauft-alternativen 28、kippfenster 27、ohne-kernbohrung 26、ueberwintern 18、stinkt-schimmel 15、zu-laut 14、kuehlt-nicht 14、was-bedeutet-btu 11…) | 合计占绝大多数 |
| 首页 | 66 |

来源:搜索引擎约 **254**(DuckDuckGo 123 / Bing 77 / Ecosia 35 / Yahoo 16——**全是 Bing 索引族**)
+ **AI 助手 26**(chatgpt 17、perplexity 5、copilot 4)。

**被否掉的一条移植(重要,别再提):把 eco 的 `.md` 镜像 / MCP 面搬过来。**
md_serve 看着有 564 次很诱人,但拆开是 317 次挤在**仅 4 天**扫 50 个页面、269 次 bot 类挤在
7 天扫 71 个页面——**爬虫扫荡的形状,不是 agent 在用**。mcp_call 同理(275 次全落在 1 个路径)。
真正站得住的只有 referrer 那 26 次真人点击。**结论:eco 的引擎是问题页库本身,不是 agent 管道。**

**因此移植的是「一页一个具体买家问题 + 一手数据回答」这个形状,不是组件。**
sourceradar 此前 **3 张页面 vs eco 30+ 张**,且流量结构是首页中心(radar 列表),
而 eco 证明**赚流量的单位是问题页**。本轮上线第 4 张:`/sourcing-margins`。

**为什么选这个题(过三门)**:①数据门——素材全部是本站已发布的 31 条策展选品
(三层价 / MOQ / 关税 / 运费 / 合规难度),零编造且逐行可对;②需求门——"从中国进货能赚多少"
是这个受众的第一问题,且现存答案全是无法核对的 guru 口号;③商业门——它直接把读者送进
`/#picks` 与 `/landed-cost`,是选品页的上游。**发现本身有差异化**:保守口径(最高出厂价+关税+
运费 vs 最低零售价)中位仅 **1.9×**、**17/31 低于 2×**;乐观口径中位 **7.9×**、最高 28.4×。
所谓"从中国 10 倍利润"只存在于乐观端——**两端都报,才是可核对的**。

**工程约束:该页由 `tools/gen_margin_page.py` 从 data.js 生成,不得手改。**
改选品数据后必须重跑,否则页面与数据集漂移(这正是它唯一的护城河)。

**转化件暂缓,理由写死**:eco 的 12.5% 离钱转化很诱人,但 sourceradar 真实读者≈0
(终身 43 pv,41 次"human"里 40 次无 referrer、7 国,扫描器群形态)。给没有读者的站装转化件
= 为不存在的消费者建供给。**先解决获客,判定线到期再谈转化。**

**判定线(预登记 2026-08-31)**:`/sourcing-margins` 上线 28 天(至 **2026-09-28**)——
①出现 ≥1 次非 goldrush/非本站的外部 referrer 落到该页,或 ②该页 JS 口径 pv ≥10,
或 ③`calc_use{margins}` ≥3。任一成立 → 问题页库形状在本站成立,继续按 eco 模式扩 2-3 张;
全空 → **不再扩页**,记为"eco 模式不可移植到本站受众",回到最低维护。
样本不足时如实记"样本不足",不当成选题失败。

## 快反日志(每项一行,含判定线追踪)

- **2026-09-01 · 深化 `solar-camp-lights`(选项①,种子「solar camping lights」,trendspy
  autocomplete-diff 抓取 2026-08-31)**。信号不是某个词的量,而是**一个非随机的形态**:该种子的
  9 条自动补全**全部**指向南半球——零售商 Bunnings / Kmart / BCF / Anaconda,地理词 nz /
  south africa,**没有一条美国或欧洲限定词**。与卡片写死的北半球假设(`season: Mar–Aug`、
  `orderBy: February`、「九月库存压到三月」)方向相反,故写进 risks。**诚实边界写在页面上**:
  自动补全是本地化的且我们不控制采集器的表观位置,这是"谁的查询主导了建议面"的方向性读数,
  **不是需求量**;且 autocomplete-diff 无 rising 数值(related-queries 被配额墙挡住,这是回退源),
  **绝不与 v 值混用**。同词冷却至 2026-09-15。
  判定线沿用:28 天 `pick_open{solar-camp-lights}` ≥5 → 有效;本站读者≈0,大概率记「样本不足」。
- **2026-08-31 · 深化 `leg-compression`(选项①,词:「best leg compression sleeves」v=50,350,
  trendspy 抓取 2026-08-30)**。信号是真实产品需求、非品牌非新闻,远超 v≥200 门槛,且与既有选品
  强相关故走深化不新增(不造新品数据)。写入的判断:该种子下的需求**没有收敛到靴子**——第一位是
  结构性更便宜的相邻品类「压缩腿套」(50,350),第二位是品牌型号「therabody jetboots prime」
  (5,250),而通用无品牌词低两个数量级(quinear 120 / therabody leg compression 50)。
  结论:无品牌靴子默认继承不到这波流量,listing 必须正面回答「靴 vs 套」而不是假设买家已经要靴。
  同词 14 天冷却至 2026-09-14。判定线:28 天 `pick_open{leg-compression}` ≥5 → 有效。
  **注意**:本站当前无真实读者(见下),该判定大概率因样本不足而无法结算,到期如实记录为
  「样本不足,不判有效也不判无效」,不得把零读数当成选题失败的证据。

## 中立层扩张(2026-08-23,owner:「相对alibaba有无优势」评估 →「扩大优化优势，包括geo」)

评估结论(记录在案):作为交易平台对 Alibaba 零优势;可防守空位 = Alibaba 因利益
冲突(向供应商收费)结构性做不了的**中立决策层**——①中立验证 ②落地成本判定。
本轮落地(GEO 面从 1 URL 扩到 3):
- **/landed-cost**:2026 关税判定页+交互计算器(de minimis 终结后的三通道:邮政
  $80-200/件、快递 54%-or-$100、正式报关叠加)。全部数字标「as reported, Aug 2026」
  +具名信源+免责声明;**关税政策再变时本页必须同步**,埋点 calc_use{landed_cost}。
- **/is-alibaba-legit**:两栏账式审计页(平台是真的/风险在卖家层/徽章≠审计),
  文档化骗局模式全部引具名 2026 指南(诽谤安全:平台合法性明确肯定)。
  **商业桥**:→ agiscorecard.com/audits SKU2 供应商声明审计 $499,埋点
  out_click{audit_bridge}——这是本站首个通向真实付费产品的漏斗。
- 双边信号雷达深化(抖音/1688 数据工程)未动,等本轮两页的 28 天读数。
KPI:两页 pv、calc_use、audit_bridge 点击;并入周一记分板。

## 判定线

并舰起 60 天:首个真实转化事件或 JS pv ≥100/28d → 加码;否则维持每日 trends
自刷新的最低维护模式。

## 核心工具 PRD(2026-09-13,owner:「深度完善它,成为我们的核心工具与竞争力」+「先调研,完善 PRD,再动手」)

**全文 `docs/PRD-core-tool-2026-09-13.md`,动手前先读。** 一句话:SR = 进口前的中立判定层,四问四答
(关税栈 / 合规 / 召回雷达 / 需求动量),每个数字带官方来源与日期,**第一个日活用户是舰队自己**(eco/tds
货架选品先过 SR 的召回与关税读数)。调研裁定:Accio(10M MAU)拿走采购执行、JS/H10 拿走 Amazon 数据、
Minea 们拿走广告情报,唯一空位是「可核对的中立判定」;**`landed-cost` 页的关税口径已被 2026-02-20 最高法院
判决与 2026-06-24 CBP 规则改掉,P0 重写为官方来源版**;三个免费官方 API(USITC HTS / CPSC / EU Safety Gate)
先探针再用。P0 四项、P1 四项、判定线 2026-11-15(台账 `sr-core-tool-p1-1115`)。不做订阅、代采、供应商库、
TikTok/1688 抓取、付费数据源。

## 付费 Opportunity Packs(2026-09-13,owner /goal:「构建撮合网站,网站可以提供付费的包,用户购买,可以获取 idea…营收…规模化」)

- **owner 的决定覆盖 08-31「零读者不装转化件」**:付费包已建,收款开关见 `docs/PACKS-OWNER-SETUP.md`(五个
  Secrets/Vars,没设之前所有付费路由 503、页面明示未开售)。
- **链路**:Stripe Payment Link → `/api/pack/webhook`(原始 body 验签、只认 `checkout.session.completed` 且
  `paid`、金额须等于 `PACK_PRICE_CENTS`、按 session 幂等)→ D1 `pack_orders`(session/event/金额/周,**零 PII**)
  → `/packs-thanks?session_id=` 调 `/api/pack/claim` 换 token(`<session>.<HMAC>`,无状态验签 + 查行未退款)
  → `GET /packs/<week>.json` 带 Bearer 才放行;`index.json` / `sample.json` 公开。
- **产品**:`tools/gen_idea_packs.py` 从 `data/autopilot/opportunities.json` × `data.js` picks × trends.json 确定性
  生成周包,**≥10 条才写**;dossier 只含派生事实(Google rising 查询、请求重现天数与板块、PH/HN 供给、匹配的
  pick 与价差/MOQ/合规难度、模板句 our_take);duty_stack / recall_radar 在 P1 前写 `pending-P1`。**不存不卖
  Reddit 帖文**。
- **P0 已做**:信标真值测试(deploy 自检 POST `/e` 并经 `/api/selftest` 读回,读不回即红);`landed-cost` 改为
  官方来源版(SCOTUS 2026-02-20 / FR 2026-06-24 / 邮政固定税 02-28 到期;旧口径只留在 `.expired` 块,gate 断言);
  `tools/probe_sources.py` 在 schedule 探三个官方源写 `data/sr-source-probe.json`;`data.js` 加 `DATA_PROVENANCE`
  + `tools/validate_picks.py`(首读:155 个数字 100% 编辑估算,as of 2026-08-22,卡片已标注)。
- **判定线**:台账 `sr-packs-first-order-1112`(2026-11-12:≥1 笔真实付费,否则包退为免费样本 + 记反面发现)、
  `sr-core-tool-p1-1115`(已登记)。
- **P1-1/P1-2 同日上线(探针 200 后)**:`tools/hts_candidates.json`(31 条候选章节 + 召回关键词)→ `tools/duty_passport.py`
  (USITC 官方 general 税率,取到下一章节再按前缀过滤,优先残余「Other」行,`options` 列出全部税率行)→ `site/passports.json`;
  `tools/recall_radar.py`(CPSC 365 天,标题关键词,只转述官方记录)→ `site/recalls.json`;两者在 deploy 的
  schedule/dispatch 分支跑并回仓(dispatch 可 `skip_trends=true`);弹窗合规区显示 HTS 税率与 12 个月召回数;
  包 dossier 用同两份文件。**首读**:31/31 有税率;12 个品类 12 个月内有 CPSC 召回(power bank 7 起最多)。
  **舰队门**:`tools/fleet/recall_gate.py`,heartbeat 断言雷达 ≤14 天;eco/tds 货架脚本接入是下一步。
- **09-13 首包撤回(重要)**:runner 18:40 UTC 自动生成的 `2026-W37.json` 十条里九条是一次性的 HN 提问
  (「youtube 2006 的 DES key」「有没有值得用 AI 开发的东西」…),唯一一条「已确认需求」是单个词「desktop」
  的巧合匹配。**当日撤回,收款尚未开通所以零买家受影响。** 改法:①匹配器 overlap 一律 ≥2 个共享实词
  (单词巧合不算需求);②`sellable()`:只有「已确认需求 且(重现 ≥2 天 或 有供给证据 或 匹配到策展 pick)」
  的 dossier 才计入出包门。宁可长期不出包,不出垃圾包。
- **Reddit 测试结论(09-13 两次 dispatch)**:公开 RSS 403、公开 JSON 403(36 个板块全部)、OAuth 端点可达
  (无凭证 401 = 端点正常),Bluesky 公开搜索两个主机都 403,Lemmy 搜索 200 但本周零求做帖,Software
  Recommendations SE 通(3 条/8 天),Ask HN 四句式通(8 条)。**Reddit 唯一正规路径 = owner 注册 app
  (`docs/REDDIT-OAUTH-OWNER-SETUP.md`,两个 Secret)**;不换 UA/IP/代理。

## 机器面:MCP 服务器(2026-09-16,owner:「从工具角度看,哪些工具最容易被付费?」→ 裁定全文 `docs/tool-monetization-2026-09-16.md`)

**为什么建在这个站**:本站人类面 28 天 **87 pv / 13 次工具使用**,而同舰队的机器面在零推广下每天有第三方回访
(bpj `/api/changes` 394 次/29 天、eco `/mcp` 105 次/5 天,两个独立采集器天天来)。本站手上是舰队最「像能被付费」的
数据(官方关税栈 + USITC 候选税号 + CPSC 召回),此前只以没人看的 HTML 存在。

- **实现**:`mcp.js`(worker 内挂 `/api/mcp`):POST JSON-RPC(Streamable HTTP 无状态子集)+ `GET /api/mcp/<tool>` REST 兜底
  (实测采集器走的是 REST)。八个工具:`duty_stack_rules` / `check_import_claim` / `landed_cost` /
  `duty_passport` / `section_301_ladder` / **`classification_rulings`** / **`import_rule_changes`** / `recall_check`,
  外加五个只读资源。数据一律读 `site/*.json`,与页面同一事实源。
- **三条红线(改任何一行前先读;`tools/test_mcp.mjs` 17 条断言全部能红)**:
  1. **零编造**:`landed_cost` 缺 `hts_base_rate_pct` 必须报错并指向 hts.usitc.gov,**永远不给默认税率**;
     归类是进口商的责任,`duty_passport` 只给「候选」并明说不是归类裁定。
  2. 每条结果带 `sources` + `as_of`;取不到静态资源回 503,**不拿旧数据冒充**。
  3. **输出里永远没有联盟/推荐/跟踪参数**(agent 是引用源,污染它等于污染引用)。这条同时由部署自检打线上。
- **`s301-ladder.json`(2026-09-16 新数据,`tools/fetch_s301_ladder.py` 随 schedule 分支每日刷新)**:77 条 chapter 99
  加征 heading(9903.88=note 20 的四张原始清单 66 条,9903.91=2024-09-27 生效加征 11 条),档位 7,5/10/15/25/50/100%。
  **三条纪律不许放松**:①分类只认「号段 + 描述里 product of China + 对应 U.S. note」三条同时成立(同一导出里的
  9903.94.31 英国乘用车因此自动排除);②税率只在 `plus N%` 无歧义时解析成数字;③生效日只认描述**开头**那句
  `Effective with respect to entries … on or after`。**永远不判定某个 HTS8 是否在清单里**——那在 note 20/31 的 PDF 与
  USTR 附件里。页面 `/landed-cost` 的 301 菜单由闸门断言必须覆盖阶梯里出现的每一档。
- **两道闸门**:`tools/check_duty_stack.py`(`site/duty-stack.json` ↔ `landed-cost.html` ↔ `llms.txt` 三处不许漂移;
  **llms.txt 曾把 $80–$200 与 54%/$100 写成现行规则直到 2026-09-16**,被引用的恰恰是它)+
  `tools/assert_mcp_live.py`(部署后打线上:$800 口径必须仍判 `false since 2026-06-24`)。
- **注册表**:`server.json` + `.github/workflows/sr-mcp-publish.yml`(GitHub OIDC,零密钥,只在 server.json 变更时跑)。
- **判定线**:`sr-mcp-calls-1014`(28 天 ≥50 次调用且 ≥1 个非索引器调用方)。
- **`sr-mcp-registry-1014` 已结:won(2026-09-17)** —— 注册表可搜到 `io.github.f-tiger/us-import-duty-facts` v1.1.0、status=active。
  **踩过的坑记死**:注册表 `description` **硬限 100 字符**(超了在 publish 那步 422),断言已加在发布前;
  remotes-only + `io.github.*` 命名空间可用本仓 OIDC 直接发布,零 owner 密钥。
- **2026-09-19→22 部署连红四天,原因是闸门写死了主机名(09-23 修)**:CPSC API 开始把部分召回链接给成 `https://cpsc.gov/…`(裸域,301 到 www),
  `test_mcp.mjs` 第 9 条只认 `https://www.cpsc.gov/` 前缀 → 每天 schedule 部署在闸门处停,站点四天没发布。修法两处:`recall_radar.py` 的
  `canonical_url()` 把裸域改写成 301 的目标(同一条记录,少一跳);断言改为解析主机名 ∈ {www.cpsc.gov, cpsc.gov},形似域(`cpsc.gov.evil.example`)
  变异测试仍红。**教训:断言官方来源时断言主机,不断言字符串前缀——上游换一次写法就会把部署冻住,而冻住的是整站不只是这条数据。**
- **这不是收费件**:按 §十一 的单位经济,按次计量要到 ~870 次/月才够 €100/月。**先上线、先数,不装收款**;
  向爬虫收费仍是舰队杀单。


## 垂直闭环:跨境进口合规(2026-09-16 第三轮,owner:「是否可以切中一个垂直领域,突破」)

**这一条链是本站的定位,后续会话按它扩,不要横向加无关工具**:
「CBP 把这东西归到哪」(`classification_rulings`)→「那个 9903 号加多少」(`section_301_ladder`)→
「基础税率」(`duty_passport`)→「到岸多少」(`landed_cost`)→「规则最近变了没」(`import_rule_changes`)→
「品类被召回没」(`recall_check`)。每一格只引官方记录。

- **`classification_rulings` 的三条红线**:①**实时打 `rulings.cbp.gov`,不镜像不落库**(边缘缓存 1 小时,
  pageSize ≤10,带自述 UA);②返回是**判例不是裁定**——必须保留 `revoked` 标记与「这不是对你货物的裁定」免责;
  ③上游不通就明说不通并给官方检索入口,**永不编裁定**(单测里有失败路径断言)。
- **`import_rule_changes` / `/import-rule-changes`**:`tools/fetch_rule_changes.py` 每日打联邦公报 API
  (4 条字面查询 × 120 天窗,逐发间隔 1 秒),**机构白名单**(总统令 / CBP / DHS / USTR / 财政部)
  = 范围声明;**反倾销个案、ITC 排期、外贸区公告故意排除**,这条必须随结果一起输出。
  `matched_in` 分「标题/摘要」与「只在全文」两档,是**机械判定**;两档都列,不悄悄丢。
  页面整页由 `gen_rule_changes_page.py` 渲染,`--check` 逐字比对——**页面不许手改**。
- **下一格的候选与门槛**:openFDA food/device enforcement(2026-09-16 实测 200)是首选,
  **但必须等 `sr-vertical-1014` 判 win 再接**;EU Safety Gate 当日未找到免密钥 alerts 接口,不写代码不承诺。
- **永远不做**:担保金额、归类意见、反倾销个案跟踪、替用户决定税号。
