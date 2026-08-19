# invest-prd-2026-08 — 投资板块深化 PRD（从商业营收方案倒推产品内容）

建立 2026-08-17 · owner 直接指令：「agi的股票板块也调度深化，从商业营收方案出发，
倒推上线产品内容」——**该指令覆盖 2026-08-17 执行令中「invest 板块只做季度 13F
同步义务，不再加面」的收缩条款**。本文件 robots-disallowed（工作文件，不进索引）。
方法论：offers / pricing / paywalls / product-marketing / cro / citation-growth /
market-research 技能（.claude/skills）。

---

## 一、盘点现实（2026-08-17 晨 D1 实查，先认清账）

| 事实 | 数字 | 含义 |
|---|---|---|
| invest 板块真实读者（JS 口径） | **~11 pv/28d** | 漏斗顶没人 |
| SunWatch Pro 桥点击（exposure_*_sunwatch*） | **0** | 唯一有真实价格的产品，无人到达 |
| TG 绑定（tg_watch / h_） | **0** | 「工具→对象→提醒」链路未被触发过 |
| 全站真实读者 | 368 pv/28d | invest 占比 ~3% |
| 全站 AI 引用（Bing，30d） | **564 次** | 唯一被验证的获客机器；invest 页 **0 次** |
| Boosts 数学 | 1 订阅/368pv，$1–3/订阅 | 已判死（需 ~950 倍流量） |
| SunWatch Pro | ¥199/月 ≈ $28，USDT，真实在售 | **1 单 ≈ 100 倍于 1 个 Boost 订阅的月值** |

已有资产（全部可复用、零新建）：`/ai-stock-exposure`（17 票映射 8 判定 + `?b=` 深链
+ TG 绑定 + Pro 桥）· `/invest` + Q2 13F 全量（filed 2026-08-14，八位全逐笔原文）·
抄作业成绩单（compass /track-record：德鲁肯米勒 **+187.2%** / 木头姐 +170% / Tepper
+108.2% vs QQQ +59.6%，截至 2026-08-16，申报日收盘价建仓）· `/matrix-odds` ·
Polymarket 赔率 runner 快照（odds.yml）· capex 三页已挂 `?b=` 钩子。

**引用机器的铁律（citation-growth 技能，一手数据）**：判定型问题页吃引用（564 次
全部来自定义/现状/对比页），工具页与游戏化页 **0 引用**；引用份额不受流量约束
（17 人/日时拿到 37.5% 份额）；AI 引荐转化率是传统搜索 23 倍（Ahrefs）。
**⇒ 投资内容要吃引用，就必须做成判定型问题页；工具只负责接住点击。**

---

## 二、商业方案判决（offers/pricing 方法论，倒推的起点）

### 逐条算账

**A. SunWatch Pro 导流（¥199/月，已在售，收入全额归 owner）——主线的钱袋**
唯一不需要建任何东西就能收钱的路径。1 单/月 = ¥199 递归收入；对比 Boosts
1 订阅 $1–3 一次性。价值方程（offers）：Dream outcome（有日期、可证伪、公开
对账的买卖点位）× 可信度（/track-record 输赢并排、败绩不删）÷ 风险（无账户、
无卡、USDT 自助）——要约本身成立，死点在漏斗顶（0 到达）。
**判决：主线变现终点。不改产品，只修通往它的路。**

**B. basket-alert 付费层（exposure 页承诺过「未建成」）——有触发信号才建**
为不存在的产品标价 = 违反零编造铁律（页面现文案是刻意的）。**预注册建造触发条件
（满足其一才动工）**：① TG 篮子绑定累计 ≥10；② exposure 工具 JS 会话 ≥50/28d。
触发前一行代码不写、一个价格不标。
**判决：暂不建，触发条件已预注册。**

**C. 引用型投资判定页 → 工具 → 绑定/导流——主线的获客机**
唯一不受流量约束的获客杠杆（引用份额）对准唯一有真实价格的产品（A）。
每页六件套 + `?b=` 深链钩子 + 活数字。这是「倒推」的全部含义：
**没有一条内容的上线理由可以脱离「它把读者推向 A 或 B 的哪一段漏斗」。**
**判决：主线获客机。本 PRD 第四节全部条目由此倒推。**

**D. Compass /pro 候补早鸟——不做（从本站侧）**
已有真实在售产品（A）时再给一个未建成产品的候补表单导流 = 分裂本就为零的漏斗，
且候补名单转化承诺无法兑现（邮件发不出）。aistock 仓自己的 /pro 页维持现状即可。
**判决：不做。**

**E. 数据产品（13F + 判定映射数据集）——免费分发做辅线，付费不做**
x402 付费已判缓（全网日成交 $2.8 万且半数为测试，每季度复查——维持原令）。
但**免费机器可读数据集换引用**成立：原创数据是第一引用磁石（data.json 已验证），
invest 侧一手数据（8 人态度 + 2 人逐笔 + 17 票映射 + 抄作业读数）尚无机器可读面。
**判决：辅线（免费层，喂 C 的引用机器），付费层不做。**

### 一句话判决
**主线 = C→A**：判定型投资问题页吃 AI 引用 → 首屏活数字 + `?b=` 深链接进
exposure 工具 → 结果面板的 TG 绑定与 SunWatch Pro 桥。
**辅线 = E-free**（invest 机器可读数据集）+ 既有季度 13F 硬同步义务。
**不做 = B（触发前）· D · 付费数据 · 任何新变现机器。**

---

## 三、需求与竞对速查（2026-08-17 WebSearch 实测）

| 查询 | SERP 占位者 | 缺口（本站形状） |
|---|---|---|
| "is the AI bubble about to burst 2026" | Yahoo/Forbes/Time/SeekingAlpha + **Polymarket 市场（~14% Yes）** | 无人给「判定+日期+翻转条件」；本站已有 /is-the-ai-capex-a-bubble——**蚕食风险，不发新页，只深化** |
| "is nvidia overvalued 2026" | Motley Fool/AAII/WEEX（全是「一方面…另一方面」骑墙文） | **无人回答「NVDA 的 AI 估值究竟押在哪几条可判定命题上」**——本站 exposure 映射就是这个答案，且无单票判定页 |
| "does copying 13F filings work" | Medium 博文/学位论文/工具页——**SERP 极薄** | 无人有一手回测；本站抄作业成绩单（申报日建仓方法论）是全网唯一 |
| 13F tracker 类 | hedgefollow/13fai/hedgetrace/**aistockwire**（已在追 Buffett、Burry、Aschenbrenner） | 竞对全是「持仓列表」型；无人做「判定+映射+回测」层——但说明列表型无差异化空间，别做列表 |
| 中文侧 | 雪球/东财号「大佬持仓」资讯流 | 「抄作业到底赚不赚钱」的核实型回答空白；且 **SunWatch Pro 的实际买家画像（¥199 USDT）就在中文侧** |

反面确认：13F「持仓列表」赛道已挤满（aistockwire 甚至已收录 Aschenbrenner），
本站绝不做第 N 个列表站——差异化只在「判定 + 日期 + 翻转条件 + 一手回测」这一层。

---

## 四、倒推出的产品内容清单（按执行顺序，每日 run 一条）

每条格式：营收挂钩 → 标题 → 需求证据 → 竞对判定 → 复用资产 → 六件套落法 → 埋点与判定线。
**站规不变**：零编造、判定型六件套（含首屏活数字）、EN 页 deep CTA、hreflang、
sitemap/llms.txt/agi-questions 接线、单 h1、anti-churn（5-run 窗口）。

### P1 · `is-nvidia-overvalued`（EN 判定页 · 现状型）【主线 C→A】
- **营收挂钩**：A。首屏活数字 → `?b=NVDA` 一键进 exposure → 结果面板 TG 绑定 + Pro 桥。
- **标题**：`Is Nvidia Overvalued? What Its AI Bet Actually Rides On` (≤60c)
- **需求证据**：真实查询（AAII/WEEX/Fool 全在写）；判定型现状问题 = 引用机器主粮。
- **竞对判定**：SERP 全是骑墙文；无人拆「估值押在哪几条可判定命题上」。
- **复用资产**：exposure 映射（NVDA = compute-scaling 45% + capex 45% + explosion 10%，
  两条 supportive 一条 pending）；Q2 13F（ARK 持有 NVDA、伯克希尔不持有——只用两家
  逐笔数据，定性态度绝不当持仓）；Aschenbrenner 基金 ~$1.57B NVDA put 的已核实报道。
- **六件套**：标题即问题；答案胶囊给判定（「按本站映射，NVDA 的 AI 故事 90% 押在
  已判 supportive 的算力与 capex 上，不足 10% 押在 AGI 本身——它是 buildout 股，
  不是 AGI 股；翻转条件：capex/compute 任一判定变动之日重算」）；表格 = 映射分解 +
  两家 13F 动作；FAQ 与 JSON-LD 逐字一致；一手源（13F EDGAR 链接 + data.json）；
  **活数字 = NVDA 单票 thesis-alignment 读数 + 62.5 对照线**，埋点 `index_click{nvda_live}`。
- **硬约束**：不写任何估值倍数/目标价/涨跌判断——本站判定的是「押注结构」，不是贵贱。
  贵贱判断留给读者，这恰是与 Motley Fool 的差异化。
- **埋点**：`tool_click{opinion_nvda}`（?b=NVDA 深链）、`index_click{nvda_live}`。

### P2 · `does-copying-13f-work`（EN 判定页 · 判定型）【主线 C→绑定；实体对冲】
- **营收挂钩**：C→track-record 计算器深链（`?who=…`）→ TG 绑定（`h_` 短码）。
- **标题**：`Does Copying 13F Filings Actually Work? We Tested It` (≤60c)
- **需求证据**：SERP 极薄（Medium/论文/工具页）；学界结论存在（copycat alpha
  survives the 45-day lag）但无人给一手可复算回测。
- **竞对判定**：全网唯一「申报日收盘价建仓」口径回测在本舰队手里。
- **复用资产**：抄作业成绩单全套数字（+187.2%/+170%/+108.2% vs +59.6%，截至
  2026-08-16）+ 四条反面说明（AI 切片≠全组合 / 13F 看不见对冲 / 编辑判断 /
  覆盖不足跳过）**必须与数字同屏**。
- **六件套**：答案胶囊 =「过去 8 个再平衡期，抄对了人显著跑赢、抄巴菲特 AI 切片
  跑输——问题不是能不能抄，是抄谁」；表格 = 逐人收益 vs QQQ；活数字 = 成绩单
  读数（季度重算，带「截至」日期），埋点 `index_click{copy13f_live}`。
- **附带价值**：引用实体落在 Buffett/Druckenmiller，对冲 73% Aschenbrenner 实体依赖。
- **季度义务**：并入既有硬同步清单（invest 两页 + 首页两块 + 本页，共五处同一 run 改）。

### P3 · `/invest` hub 再瞄准（优化，不新增 URL）【主线 C 的枢纽】
- **营收挂钩**：hub 是 P1/P2 的上游枢纽；现标题 "AI Investing Hub — Who's Betting
  What on AI (2026)" 是品牌腔，不是问题本身。
- **动作**：title/meta 改为查询形（如 `How Are the Biggest Investors Positioned on
  AI? (Q2 13F)`）；首屏加活数字胶囊（8 人 bull/cautious/bear 计数 + filed 日期 +
  62.5 对照，埋点 `index_click{invest_live}`）。FAQ 已达标不动。
- **约束**：anti-churn——/invest 8-17 刚改过（Q2 同步），**5 个 run 窗口后再动**。

### P4 · zh 判定页 `zh/does-copying-13f-work`（中文侧主线）【离钱最近的一条】
- **营收挂钩**：**SunWatch Pro 的实际买家画像（¥199 USDT 自助）在中文侧**。
  本页 → /zh/ai-stock-exposure（zh Pro 桥）→ invest.agiscorecard.com/zh。
- **标题**：「抄大佬的 13F 作业到底赚不赚钱？实测两年」
- **需求证据**：「抄作业」是中文散户圈固有词汇（雪球等平台通行说法）；本站 /cn 持仓
  故事已是中文侧既有资产。诚实标注：中文搜索量无一手工具可核，此页依据是画像判断
  + 既有 /cn 流量，若 28d JS pv <5 则停止 zh invest 扩面。
- **复用资产**：同 P2，忠实翻译 + zh Swiss 设计系统 + `zh_deep_page` CTA（站规）。
- **埋点**：`invest_tool_click{exposure_zh_sunwatch*}` 是本页成败的最终读数。

### P5 · invest 机器可读数据集 `invest-data.json`（辅线 E-free）
- **营收挂钩**：不直接变现；喂引用机器（原创数据 = 第一引用磁石，data.json 已验证）。
- **内容**：8 人态度（含 as-of/filed 日期与例外标注）+ 2 人逐笔 + 17 票映射（权重
  与 data.json 判定同步）+ 抄作业读数汇总 + CC BY 4.0 + dateModified。
- **接线**：llms.txt + /for-agents + 后续 MCP tool（`get_invest_positions`，挂在既有
  /mcp，不新增基建）。生成器并入 `gen_agi_exposure.py` 的判定同步链。

### P6 · exposure→Pro 桥转化优化（cro，产品侧唯一动刀处）
- **现状诊断（cro 技能）**：桥块在页面静态深处（方法论与 FAQ 之后），读者算完分数
  的「价值时刻」看不到它；文案 6 行长稳（诚实但埋没）。0 点击 = 位置问题的先验
  大于文案问题（同全站 slidein 教训：先修位置阈值再改文案）。
- **动作**：结果面板渲染后（basket 非空时）追加**一行紧凑桥**（一句话 + 链接，
  文案从现有块摘句，不新写承诺），事件分流 `exposure_<lang>_sunwatch_result`；
  原块保留（两产品不混淆的长版说明就在那里）。
- **顺手核查**：capex 三页 `?b=` 深链进入时结果面板是否在首屏可达（深链读者
  是唯一已被导流的人群，若他们看不到结果就全白费）。
- **不做**：不加弹窗、不加倒计时、不加任何稀缺性装置（假稀缺毁信任，offers 反模式）。

### 明确不做清单（与理由）
1. **13F 持仓列表页/站**——赛道已满（hedgefollow/13fai/aistockwire），无差异化。
2. **basket-alert 付费层**——触发条件未满足（见二.B），先到先建。
3. **Compass /pro 候补导流**——分裂漏斗，见二.D。
4. **x402/付费数据**——维持原判，季度复查。
5. **`ai-bubble-burst` 新页**——与 /is-the-ai-capex-a-bubble 蚕食；正确动作是该页
  下次 freshness 轮把 Polymarket「AI bubble burst by 2026」市场读数并入 odds runner
  白名单后引用（赔率必须 runner 核实，手抄数字不上页）。
6. **任何估值判断/买卖建议**——本站判定「押注结构」，永不判定「贵贱」。

---

## 五、判定线（全部带日期，事前登记）

| 判定 | 阈值 | 日期 | 动作 |
|---|---|---|---|
| invest 深化存活线 | invest 簇（/invest*、exposure、P1/P2/P4）JS pv ≥60/28d（现 11） | **2026-11-15**（Q3 13F 季） | 3 条中 <2 条达标 → invest 回归季度同步义务模式，Pro 桥保留（零成本）但停止内容投入 |
| Pro 桥活性 | `invest_tool_click{exposure_*_sunwatch*}` 累计 ≥5 | 2026-11-15 | 同上合并判定 |
| 绑定首单 | TG 绑定（tg_watch/h_）≥1 | 2026-11-15 | 同上合并判定 |
| B 层建造触发 | TG 篮子绑定 ≥10 或 exposure JS 会话 ≥50/28d | 滚动 | 满足才动工 basket-alert |
| 引用侧验证 | invest 判定页出现在 Bing AI Performance Pages 明细 | 每月 1-3 日例行 | 出现 → 该形状确认，补多语言；两个月零引用 → 记反面发现 |
| zh 扩面止损 | P4 页 28d JS pv <5 | 上线 +60d | 停止 zh invest 新页 |

**与 09-30 证伪线的关系（建议，需 owner 认可）**：09-30 线中「订阅→Boosts」判死
条款**维持原判不动**（那是独立假设，数学已死）。但「invest 导流 SunWatch 桥点击=0
即判死」条款在 owner 2026-08-17 重启 invest 投入后应**顺延至 2026-11-15**——理由：
主线获客机（P1/P2/P4）9 月才逐条上线，引用与索引时延 4-8 周，09-30 判死等于在
实验开始前宣布结果。每日 run 的「只做⓪①」执行令相应扩为「⓪① + 本 PRD 队列
（每 run 一条）」。

---

## 六、执行顺序与义务衔接

```
run 1  P1 is-nvidia-overvalued（EN 判定页）
run 2  P2 does-copying-13f-work（EN 判定页）
run 3  P6 exposure→Pro 桥 CRO + ?b= 深链首屏核查
run 4  P4 zh 抄作业判定页
run 5  P5 invest-data.json + llms.txt/for-agents 接线
run 6+ P3 /invest 再瞄准（等 anti-churn 窗口过）；此后回归 ⓪① 常规阶梯
```
- 每条判定页发布 = 过六件套检查（CLAUDE.md 2.c），接线 sitemap/llms.txt/
  agi-questions/首页 chip，`python3 tools/validate.py` OK 才 ship。
- 季度 13F 硬同步义务扩为**六处**：invest 两页 + 首页两块 + P2 + P4（同一 run）。
- 判定翻转日义务不变：gen_index/gen_badges/gen_agi_exposure/widget + 邮件工具包 +
  P1 活数字随生成器自动重算。
- owner-identity D1 镜像追加：本 session 无 Cloudflare MCP，**下一次带 MCP 的
  daily run 须把 2026-08-17 invest 指令补进 D1 `owner_identity` 表**（md/json 已入库）。
