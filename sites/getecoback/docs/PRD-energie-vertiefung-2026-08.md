# PRD：能源板块深化判决（2026-08-17）

> 任务：从真实客户需求出发，判定 getecoback.com 能源板块是否值得深化、往哪深化。
> 方法论：customer-research（Mode 2 数字水源地）+ market-research + competitor-profiling
> + citation-growth（舰队自研）+ kgr-page（本仓 KGR 判定流程）。
> **本文档只出方案，不实施页面。** 所有 SERP 构成均为 2026-08-17 WebSearch 实测；
> 所有站内数字来自 D1 `ecoback-events` 与 owner 提供的 Bing AI Performance 面板
> （见 docs/getecoback-ga4-monitor-log.md 2026-08-16/17 各节）。

---

## 0. 判决（执行摘要）

**深化——但只深化「判定层 + 引用层」，不新建工具、不新开板块。** 选中 3 格：

| 格 | 一句话 | 为什么是它 |
|---|---|---|
| **格1 引用放大**：制冷×能源交叉簇的多语言镜像 + 活数字钩子 | 把已验证吃引用的 `klimaanlage-balkonkraftwerk`（54 次 Bing AI 引用，全站第 3）镜像到 EN 区并补钩子 | 引用份额不受流量约束（citation-growth 核心事实），且 EN 区是全站转化最强区 |
| **格2 动态电价判定层**：深化 `strompreis-radar` 的「Lohnt es sich für MICH?」 | 在意图最贵的一页上补消费者语言的判定内容 + 内联估算（开源公式），承接已预注册的 E8 探针 | 唯一一条「一次 Awin 注册即武装」的变现路（Ostrom 17,50 €/合约），探针已在跑 |
| **格3 秋冬交叉**：深化 `klimaanlage-mit-heizfunktion`（用空调热泵模式取暖的诚实成本账） | COP 开源公式 + GModG 2026-07-29 新法背景 + 「was NICHT funktioniert」 | 供暖季 10-01 开始；SERP 无权威评测媒体；把制冷簇受众（已有设备的人）接到供暖支出上 |

**明确不做**（§6 详述）：Wärmepumpe/Heizungsgesetz 头部内容（ADAC/Vattenfall/Polarstern 红海）、
Förder-Finder 工具（利基站已占且数据必过期）、Smart-Meter 独立簇（Verbraucherzentrale 占屏）、
独立 Tarif-Rechner 新工具（WattPlaner/neon 已占 + 与 radar 页蚕食）、BKW 硬件簇再扩张
（7 页已够，实验①桥 08-17 刚上，等 09-16 判定）。

**诚实前提**：在 322 pv/28d 的流量下，没有任何能源深化能在 12 个月内「付房租」（§5 数学）。
深化的可辩护理由是：① 引用份额不吃流量、当下就能挣（54 次引用是实测，不是假设）；
② 让「探针→owner 一次 KYC→武装」的管线保持诚实可判定。凡是需要先有大流量才成立的方案，
本轮全部否决。

---

## 1. 一手需求信号盘点（仓内数据，全部可回源）

### 1.1 Bing AI Performance（owner 2026-08-16 提供，唯一引用一手数据源）

- 按页引用：klimaanlage-reinigen **109** > klimaanlage-40-qm **70** > **klimaanlage-balkonkraftwerk 54** >
  en/fan-with-ice 29 > richtig-lueften 19 > 25-qm 18 = **stromkosten-rechner 18** > tropft-wasser 16 >
  wie-viel-btu 15 > kippfenster 14。**能源×制冷交叉页排全站第 3**——交叉方向已被引用数据验证。
- Grounding Queries：`klimaanlage mit balkonkraftwerk betreiben` **39 次 / 份额 13% / Learn-and-Solve /
  主题 Energy Efficiency**；`klimaanlage für 40 m2` 60 次 / 24% / Commercial；
  `leenon 9l mobiler luftkühler reinigen` 11 次 / **52.38%**（具体对象 + 动作 = 高份额形状）。
- 反面：95.5% 的引用面（400 次里 382）在制冷页上，两周内随季节进入休眠（08-17 对抗式调研）。
  **能源簇是引用面跨季不归零的唯一对冲。**

### 1.2 D1 漏斗（28d，排除 CI；08-17 日更 v4）

- page_view 322（7d 207，加速中）；affiliate_click 66（7d **48**，历史最高周频）；
  google.com 引荐 **0**——流量全部来自 Bing 系（DDG 54/Bing 33/Ecosia 15）+ AI 助手
  （chatgpt 8 + copilot 3 ≈ 4%）。
- 能源工具事件：stromkosten_calc 2、strompreis_api 1、`tariff_click` 探针 08-14 刚上（E8）、
  `outbound_choice`/`lead_intent` 的计算器入口桥 08-17 刚接通（执行令第一项）。
  **能源计算器的使用量当前接近零——瓶颈是入口流量，不是工具本身**，这是「不再新建工具」
  判决的直接依据。

### 1.3 既有能源资产（深化的基建，不必新建）

- 内容页 ~14：balkonkraftwerk 簇 7 页（wo-kaufen/speicher-nachruesten/winter-frost/foerderung/
  ohne-bohren/growatt-noah-probleme/klimaanlage-balkonkraftwerk）+ strom-sparen-haushalt +
  klimaanlage-stromkosten + 设备×成本长尾（ventilator/heizdecke/heizluefter/luftbefeuchter/
  luftentfeuchter-stromverbrauch 等）。
- 计算器 5+：bkw-lohnt-sich-rechner、balkonspeicher-rechner、standort-check、strompreis-radar
  （live 数据）、stromvergleich-check（另有 stromkosten-rechner、heizkosten-vergleich-rechner、
  infrarotheizung-watt-rechner）。
- 结构层：EB_HEATENERGY 盒把 **50 个制冷页**导向能源簇（08-05 落地）；公式开源
  （wie-wir-empfehlen#nachrechnen）+ 每日 parity 测试；MCP 9 工具含 BKW 补贴。
- 监管弹药已迁移（intersolar-transfer-2026-08.md，**勿重复**）：§41a 动态电价供给义务、
  Solarspitzengesetz（<2 kWp 豁免边界）、§14a Modul 3 时变电网费——三条都已落在
  radar/balkonspeicher/lohnt-sich 三页上。

### 1.4 已预注册且在跑的实验（深化必须服务它们，不能绕开）

| 实验 | 探针 | 判定线 | 状态 |
|---|---|---|---|
| ①渠道偏好（BKW Amazon vs Fachhändler） | `outbound_choice` | 30d 至 09-16：≥10 或 lead_intent ≥5 = 入口复活 | 桥 08-17 刚通 |
| ②线索意向（房主 PV/WP） | `lead_intent` | 60d ≥15 且 ≥5 非直访 | 同上 |
| E8 电价切换意向 | `tariff_click{provider}` | 30d（约 09-13）≥10 → owner 一次 Awin 注册；<3 → 撤盒 | 08-14 上线 |
| 大判定日 | affiliate_click | 10-15：≥200 击 0 成交=转化假设死；<200=流量假设死 | 执行令 |

---

## 2. 真实客户需求调研（customer-research Mode 2；Reddit/论坛直连被 egress 拦，
经 WebSearch 提取，置信度按技能规范降半档）

### 痛点① 动态电价困惑 —— **真痛点，且消费者语言的答案缺位**（置信度中高）

- 原声（iobroker 论坛，多线程一致）：动态电价「lohnt sich eigentlich nur mit eAuto」；
  「**speziell im Winter kaum ‚lohnende' Börsenpreise**」；「nachts um 3 Uhr die Waschmaschine
  nicht laufen lassen」——普通家庭没有可调度负载，冬天现货价常高于固定价。
- 结构性事实：2025 起每个供应商都必须提供动态电价（§41a，站内已落地），但真正的小时计价
  需要 iMSys；无 Smart Meter 时部分供应商按月均现货价结算，「Lastverschiebung 的好处基本蒸发」
  （sonnen/homeandsmart/bautipps24 多源一致）。
- 搜索需求语存在：`dynamischer Stromtarif lohnt sich` / `… ohne Smart Meter` / `… Erfahrung`。
- SERP 占位：head 由 **Finanztip**（权威）+ Rabot/enerix 等供应商内容营销占住 = 红海；
  「lohnt sich Rechner」已有 **WattPlaner**（专门站）与 neon.energy（学术模拟）= 工具位有人。
- **空格**：没人在**消费者已经在读的页面上**用三个输入（年用电量/可移负载比例/有无 iMSys）
  给出「对你个人大概率不划算/划算」的诚实判定——Verivox/Check24 不会写「不划算」
  （切换佣金驱动），Finanztip 无交互，WattPlaner 无本站的「空调=可调度负载」交叉视角。
  → **格2：深化 radar 页，不新建页/工具。**

### 痛点② Smart-Meter rollout 混乱 —— 真痛点，但**本站无可赢角度**（置信度高）

- 现状：覆盖率仅 ~3.8%（pv-magazine/BNetzA，站内已引用）；强制安装通知开始下发，
  消费者问「kann ich verweigern?」（答案：不能，只能 dulden/换 MSB/推迟）、「was kostet es?」
  （法定封顶 25–140 €/年）。
- SERP 占位：**Verbraucherzentrale**（消费者权威本尊）+ energiemarie + enpal + rechtsschutzprofis
  = 权威与法律媒体占屏，且消费者可采取的行动极少（没有决策可帮）。
- 判定：**不做独立簇**。radar 页 §41a 章已覆盖 iMSys 前提；按 intersolar 文档既有种子——
  GSC 出现 `Smart Meter beantragen`/`Modul 3` 展示时再评估，当前判定不变。

### 痛点③ BKW+Speicher 购买卡点 —— 真痛点，**站内已接住，等判定别加面**（置信度中高）

- 原声/共识（ADAC/infranken/homeandsmart 转述论坛争论）：无储 2–4 年回本、带储 5–8 年，
  「ob sich ein Speicher lohnt」高度取决于晚间用电与朝向——**这正是站内
  balkonspeicher-rechner 的功能**；Photovoltaikforum 名句「Die 800VA hat man nicht konstant
  zur Verfügung」已在站内页面引用过（08-05）。
- 判定：簇已 7 页 + 2 计算器 + Solarspitzengesetz 论证（「馈电越来越不值钱，自用为王」）。
  实验①的入口桥 08-17 刚接通。**深化动作只有一件：等 09-16 判定线，别在判定前堆页**
  （反证纪律：入口刚修好就加面=永远无法归因）。

### 痛点④ 供暖成本焦虑 / Heizungsgesetz 困惑 —— **2026 年最大的新困惑源**（置信度高）

- 监管剧变（多源一致：ADAC/Vattenfall/Polarstern/thermoschmiede）：**GModG 于 2026-07-29
  取代 GEG**，65% 可再生要求废除，业主可自由选择热泵/燃气/混合；**2026-07-21 起热泵补贴
  新规**——基础 30% 不变，但封顶可计成本与 Klimageschwindigkeitsbonus（16%）双降，
  且该 bonus 自 2027-02-01 起每半年降 4 个百分点（= 内容有明确的时效价值窗口）。
- SERP 占位：head（`Heizungsgesetz 2026`/`Wärmepumpe Förderung 2026`）= ADAC、Vattenfall、
  Polarstern、1komma5、NIBE = 权威+资金充足厂商红海，**毙**。热泵 lead 变现已由实验②承载，
  不重复立项。
- **空格（KGR 实测通过）**：`mit Klimaanlage heizen statt Gasheizung Kosten` 的 SERP =
  klimavergleich.at、ecoflow、heizung.de、thermondo、wohnung-forum、reduco.ai、小安装商——
  **零 StiWa/Finanztip/大媒体**。而本站受众恰好是「已经有一台带热泵功能空调的人」
  （klimaanlage-mit-heizfunktion.html 已存在），且没人给可复算的 COP 成本公式
  （ct/kWh 热 = 电价 ÷ COP，对比燃气 10–12 ct/kWh 需明示假设）。→ **格3：深化既有页。**

### 痛点⑤ Förderung 迷宫（联邦/州/市三层） —— 真痛点，**已被工具站占位且数据必过期**（置信度高）

- 现实：无联邦级 BKW 补贴；州级（Sachsen 300 €租户/MV 500 €/Berlin 250 €/HH 500 €低收入）
  与市级（Kassel 150 €/Potsdam 250+500 €）并存，且**预算随时耗尽**（Freiburg 2026 已罄、
  Stuttgart 已停、Heidelberg 暂停）——三层数据的维护成本极高、错一条就是误导。
- SERP 占位：Finanztip（权威）+ **balkon-kraft-werke.de 的 PLZ Förder-Finder** +
  **elektronik-zeit.de 的 Förderkarte** + 六家厂商博客 = 内容位与工具位都有人。
- 判定：**不建 Förder-Finder**。站内 balkonspeicher-foerderung.html 保留，义务收敛为
  「季度复核 + 显著的 Stand-日期 + ‚Budget oft schnell ausgeschöpft' 诚实警示」——
  宁可少列，不列过期条目。

---

## 3. 竞对格局（competitor-profiling 快扫，按「工具可算 × 诚实中立 × 引用友好」三轴）

| 竞对 | 占住什么 | 三轴缺口（= 本站可赢处） |
|---|---|---|
| **Finanztip** | 全部能源 head 词的编辑权威（dynamischer Stromtarif / BKW Förderung / Wärmepumpe） | 无交互工具；无 live 数据；文章级更新节奏。**别碰它占的 head 词** |
| **Verivox / Check24** | 电价/气价切换比价（切换佣金驱动） | **结构上不能说「别换，对你不划算」**——中立判定位天然空缺；无设备级成本math |
| **heizsparer / co2online** | 供暖计算器与节能咨询（co2online 有 WärmeCheck 系列） | 供暖工具位拥挤 → 本站不做新供暖工具，只做「空调当热泵」这个他们不覆盖的交叉角 |
| **厂商博客**（enpal/1komma5/thermondo/sonnen/EcoFlow/Anker） | Förderung/heizen/BKW 几乎所有商业词的内容营销 | 不中立（卖自家硬件/服务）；无开源公式；AI 引用天然歧视卖东西的页（agi 实测规律） |
| **利基工具站**（WattPlaner 电价 Rechner、balkon-kraft-werke.de PLZ-Finder、elektronik-zeit Förderkarte） | 单点工具位 | 无内容簇支撑、无引用面；但**位子已占**——不与它们正面建同款工具 |
| **Verbraucherzentrale** | Smart-Meter 权利义务的消费者权威 | 无缺口可打，绕开 |

**本站结构优势**（竞对复制成本最高的三件）：① 12 个计算器 + 公式开源 + 每日 parity 测试
（「Rechenwege offengelegt」信任层，2026-08-16 上线）；② 制冷×能源**双簇同站**——
「空调是普通家庭唯一的大功率可调度负载」这个交叉论证，电价站不懂空调、空调站不谈电价，
Bing 54 次引用已证明 AI 引擎认这个交叉；③ MCP + llms.txt + Markdown 协商的 AI 可读层
（AI 助手引荐 4% 且在涨，Google 引荐为 0 的现实下这是主渠道）。

---

## 4. 营收数学（offers/pricing 视角；单价全部用已调研的真实报价）

基准：322 pv/28d（JS 口径）、affiliate_click 66/28d（7d 48）。12 个月流量外推：Google 持续
给 0 的前提下按 Bing 系+AI 通道现有斜率估 **2–5×**（≈ 650–1600 pv/28d）——这是估计，
不是承诺。

| 路径 | 真实单价（来源） | 当前期望值/月 | 12 个月外推期望/月 | 激活条件 | 判定 |
|---|---|---|---|---|---|
| Amazon 联盟（现役） | ~18 €/单（Baumarkt 6%；搜索链=间接销售低费率） | 1–2 € | 5–10 € | 已武装 | 维持，能源页非主力 |
| **电价切换 Awin** | **Ostrom 17,50 €/合约**（Awin 实测在售）；Tibber Merchant 57405 | 0（探针期） | 5–15 €（radar 页流量×点击 10%×成约 5–10%） | E8 达标 + owner 一次 Awin KYC | **格2 挂钩** |
| BKW 垂直联盟 | 30–150 €/单（Kleines Kraftwerk 10%/solago 6%，客单 600–1500 €） | 0 | 10–40 €（若实验①存活） | 实验① ≥10/30d + owner KYC | 等 09-16，不加面 |
| PV/热泵 lead | 25–200 €/条（anfragenfluss CPL 2026）；美市参考 $120–300（Lead Stack） | 0 | 单价最高但完全 gated | 实验② ≥15/60d + owner 找买家 | 等判定，不重复立项 |
| 展示广告 | 1–3 € RPM | <1 € | <5 € | — | **数学不成立**（08-05 已否决，维持） |
| 工具订阅/白标 | 19–49 €/月 | 0（报价页 0 浏览） | — | — | **数学不成立**（08-14 已搁置，维持） |

**结论**：① 没有一条路径在 12 个月内超过 ~40 €/月——能源深化的正当性**不在近期营收**，
在引用份额（不吃流量）与「让 owner 的一次 KYC 值得」；② 期望值排序上唯一「探针已在跑 +
一次注册即武装 + 意图页已存在」的是**电价切换**（格2），其次是等待判定的实验①②——
它们需要的是入口流量与时间，不是新页面；③ 凡以「先做大流量」为前提的方案
（展示广告、订阅、Förder-Finder 引流）全部数学不成立。

---

## 5. 选中的三格（详细方案）

### 格1：引用放大 —— 制冷×能源交叉簇的多语言镜像 + 活数字钩子

**需求证据**：`klimaanlage mit balkonkraftwerk betreiben` 39 次 grounding / 13% 份额
（份额低=有余量，对照 leenon 9l 的 52%）；页面 54 次引用居全站第 3。citation-growth 技能
已验证的两条放大器：「引用量大 × 缺多语言 → 补翻译」「引用量大 × 缺活数字 → 补钩子」。

**KGR 判定**（2026-08-17 实测）：EN `run portable air conditioner on balcony solar` SERP =
Wikipedia、美国倡导组织（solarunitedneighbors/solarrights）、Anker/EcoFlow 厂商博客、
diysolarforum、Amazon 列表——**零权威媒体给诚实的瓦数算术**（他们按 Split 200–500 W 或
美式 window unit 算，没人算欧洲租户的 1000 W Monoblock vs 800 W 逆变器上限）。**通过。**

**选题清单**（逐个判定过）：
1. ✅ `en/guide/portable-ac-balcony-solar.html` —— 德语页镜像（非直译：欧盟 800 W 上限、
   tilt-window 场景、「Die ehrliche Rechnung」的 800 W vs Kompressor 结构照搬），
   互挂 hreflang，从 en/running-cost + en/rented-apartment 各引 1 条入链。
2. ✅ `klimaanlage-balkonkraftwerk` 首屏答案胶囊改造：标题即问题形态
   （grounding query 原词「Klimaanlage mit Balkonkraftwerk betreiben?」）+ 首屏活数字钩子
   —— 链 strompreis-radar 的当日正午价（live、会变、可审计），埋点沿用 `index_click` 同款
   思路（D1 白名单事件）。判定型六件套逐项过检（citation-growth §判定型页面六件套）。
3. ✅ `klimaanlage-40-qm`（70 引用、Commercial 24%）：仅补一行「以 0,30 €/kWh 计的
   运行成本锚点 + 链 stromkosten-rechner」——TOPPICK 对齐 08-16 已做，防 churn 不再大动。
4. ✅ `stromkosten-rechner`（18 引用）：对照六件套查漏（答案胶囊/表格/FAQ 逐字/日期）——
   已有静态速查表与 WebApplication schema，预计只缺可见「Stand」行，小改。
5. ⏸ `richtig-lueften-bei-hitze`（19 引用）：维持纯净无商品位（08-16 已判：可能正因纯净
   才拿引用），只做 dateModified 季度刷新。

**工具路线**：全部复用现有基建（radar live API、stromkosten-rechner、开源公式表）。**零新工具。**

**变现挂钩**：镜像页与胶囊内的商品位沿用该页 08-16 已修正的「按页面自身论证选品」
（Speicher/Energiekostenmessgerät/Ventilator）；EN 侧走既有 CONTEXT_MODELS_EN 机制。

**与制冷簇交叉引用**：EN 镜像页进入 EB_HEATENERGY 的 EN 侧入链目标（50 个制冷页的盒子
当前只指德语 radar——EN 制冷页的盒子应指 EN 镜像，一处注入器改动，PRD 后续实施时处理）。

**证伪线**：**2026-10-31**（两次月度 Bing AI Performance 拉取后）：EN 镜像页引用 = 0 且
pv < 5/28d → 停止能源簇的 EN 镜像扩张，记入反面发现；德语胶囊页引用份额不升（13% → 无变化）
→ 活数字钩子对本站无效的第一条反证，记录但不回滚（钩子无维护成本）。

### 格2：动态电价判定层 —— 深化 `strompreis-radar`（不新建页）

**需求证据**：§2 痛点①原声（冬季无便宜时段/无可调度负载/无 iMSys 则月均结算）；
1900 万家庭没听说过动态电价（Anlass 数据）；站内该页是「意图最贵的一页」（08-14 判定），
E8 探针已在页上。

**KGR 判定**：head `dynamischer Stromtarif`（Finanztip/Verivox/BNetzA）与「Rechner」位
（WattPlaner/neon）均**红海——所以形态是既有页深化，不是新页新工具**（蚕食规则 +
不与 WattPlaner 正面刚）。深化的内容位（消费者语言判定）实测无人占。

**选题清单**（全部落在 radar 页内）：
1. ✅ 新章「Lohnt sich ein dynamischer Tarif für mich? Die ehrliche 3-Fragen-Prüfung」——
   三问判定：①年用电量（<2500 kWh 直接说「省不了几个钱」）②有无可移负载
   （eAuto/WP/洗衣机夜用意愿；引用论坛原话「nachts um 3 Uhr…」的现实）③有无 iMSys
   （无则月均结算，Lastverschiebung 收益蒸发）。给出可复算公式（年费差 = 用电量 ×
   可移比例 × 时段价差，明示假设，与 neon 的 7 ct/kWh 移峰口径对照并外链）。
   形态可以是纯静态表 + 简单内联 JS（复用站内计算器模式），**不是独立工具页**。
2. ✅ FAQ「Funktioniert ein dynamischer Tarif ohne Smart Meter?」——痛点①实测搜索语，
   SERP 是 sonnen/homeandsmart 厂商博客；答案（技术上不行/月均价变体/读头方案/
   2025 起有权申请 iMSys、4 个月内须履行）与可见文本逐字同步 schema。
3. ✅ 冬季诚实块：「Im Winter ist der Spotpreis oft TEURER als dein Festtarif」——
   论坛共识 + 站内既有负价小时统计的反面，防止把读者推进冬天更贵的合约
   （Verivox/Check24 永远不会写这句 = 差异化本体）。
4. ⏸ 「Welche Geräte lohnen sich zu verschieben」设备表（洗衣机/烘干机/洗碗机/eAuto 各
   多少 kWh/周期 × 7 ct 移峰差）——先查站内 heizdecke/ventilator 成本页数据可复用部分，
   避免与 stromkosten-rechner 内容重叠，实施前做一次蚕食 grep。

**工具路线**：复用 radar 页已有 live API（`/api/strom`）与站内公式模式；**不建独立 Rechner**。

**变现挂钩**：**E8 探针（已预注册）**——`tariff_click ≥10/30d` → 通知 owner 做一次 Awin
注册（Ostrom 17,50 €/合约 + Tibber 同网络），链接替换只改三个 href。本格的全部深化都在
给这个探针喂入口质量。

**与制冷簇交叉引用**：EB_HEATENERGY 盒（50 制冷页）已导流 radar，维持；新章的「可移负载」
表里空调预冷条目回链 `klimaanlage-stromkosten` 与 `nachts-laufen-lassen`（spoke↔spoke）。

**证伪线**：沿用 E8 预注册线——**约 2026-09-13**（上线 30 天）：`tariff_click` ≥10 → owner
Awin；3–9 → 再观察 30 天（判定顺延至 10-13）；<3 → 撤探针盒，本格判死，radar 页回归纯
信息页。**本格深化在 9-13 前完成才有意义**——晚于判定日的深化无法归因。

### 格3：秋冬交叉 —— 深化 `klimaanlage-mit-heizfunktion`（用空调取暖的诚实成本账）

**需求证据**：GModG 2026-07-29 生效 + 补贴 07-21 新规 = 供暖决策困惑的新闻窗口；
供暖季 10-01 开始（45 天倒计时）；本站 95.5% 引用面在制冷页、秋冬归零的结构风险
（08-17 对抗式调研）——本格是能源侧的秋冬对冲，与 herbst 简报的湿度簇互补不冲突。
受众链条：已买移动/分体空调的读者（本站核心受众）想知道「我这台机器冬天当热泵用，
比燃气便宜吗」。

**KGR 判定**（2026-08-17 实测）：`mit Klimaanlage heizen statt Gasheizung Kosten` SERP =
klimavergleich.at（奥）、ecoflow/thermondo（厂商）、heizung.de（行业门户，唯一近权威）、
wohnung-forum、reduco.ai、小安装商——**零 StiWa/Finanztip/ADAC**。边界偏可打。
**蚕食检查**：站内 `klimaanlage-mit-heizfunktion.html` 已存在 → **深化既有页，不新建**。

**选题清单**：
1. ✅ 新章「Die ehrliche Rechnung: Heizen mit Klimaanlage vs. Gas」——开源公式
   ct/kWh_Wärme = Strompreis ÷ COP（COP 2,5–4 区间按外温诚实分档，0 °C 以下 COP 塌陷
   明写），对照燃气 10–12 ct/kWh（明示假设 + 以自己合同为准，站规口径）。竞对全是
   结论数字（「省 25%」），没人给读者能自己代入的公式——这是本站已验证三次的
   「成本可复算」模式第四次复用。
2. ✅ GModG 背景盒：「Seit 29.07.2026 darfst du frei wählen — was heißt das für dich」
   （65% 要求废除、热泵补贴双降与退坡时间表）——只写与「用现有空调取暖」相关的部分，
   **不做** Heizungsgesetz 科普页（红海 + 本站无权威位）。外链一手法源。
3. ✅ 「Was NICHT funktioniert」章（站牌信任模式）：Monoblock 制热效率显著低于 Split、
   无外机的单管机冬季 COP 接近直热、不能供热水、Altbau 单靠空调不够——劝退位就是
   引用位（agi 规律：AI 引用回答问题的页不引用卖东西的页）。
4. ✅ FAQ 3 问逐字同步 schema：「Ist Heizen mit Klimaanlage günstiger als Gas?」
   「Kann eine Klimaanlage eine Gasheizung ersetzen?」「Was kostet eine Stunde Heizen
   mit Klimaanlage?」（第三问给公式代入示例）。
5. ⏸ 种子（先判定后写）：EN `heat a room with a portable air conditioner heat pump mode
   cost` —— **尚未做 SERP 判定，不许跳过判定直接写**（kgr-page 纪律）；若通过则作为
   EN 秋冬第 3 页（EN 秋冬当前仅 2 页而 EN 是转化主力）。
6. ⏸ 种子：`heizkosten-vergleich-rechner` 加「Klimaanlage (COP 3)」一档——实施前先核
   计算器现有档位，避免与新章数字冲突（公式必须同源）。

**工具路线**：复用 heizkosten-vergleich-rechner 与开源公式表；零新工具。

**变现挂钩**：商品位按页面自身论证选品（CONTEXT_MODELS 机制）：Energiekostenmessgerät
（「先测你自己的机器」）、WLAN-Steckdose mit Timer（预热调度，带 Auto-Restart 警示句，
08-15 已有的诚实模式）、窗封（冬季热损与夏季同理）。**不推新空调**——读者已有设备。
若实验②存活，本页是 `lead_intent`（热泵房主）最自然的注入点之一——但**等判定，不预装**。

**与制冷簇交叉引用**：从 `klimaanlage-stromkosten`、`mobile-klimaanlage-ueberwintern`
（「先别收起来——它冬天还能干活」语境句，该页需求峰恰在 9 月）、`zimmer-kuehlen` 各加
1 条语境入链；本页回链 heizung-XX-qm 系列与 heizkosten-vergleich-rechner（hub↔spoke）。

**证伪线**：**2026-11-30**（供暖季两个月）：本页 pv < 10/28d 且 Bing 引用 = 0 →
「空调取暖」角度判死，不再投入；秋冬能源深化收缩回 herbst 简报的湿度/霉簇。
若 GSC/Bing 出现 `klimaanlage heizen` 系 grounding queries → 下一次月度引用拉取时
按「引用量大 × 缺钩子」常规循环处理。

---

## 6. 否决清单（本轮判定，防重复调研）

| 候选 | 否决理由（全部 2026-08-17 实测或既有判定） |
|---|---|
| Wärmepumpe/Heizungsgesetz 科普簇 | head SERP = ADAC/Vattenfall/Polarstern/1komma5/NIBE 红海；热泵 lead 变现已由实验②预注册承载，重复立项=同一假设赌两次 |
| Förder-Finder 工具（PLZ 查补贴） | balkon-kraft-werke.de 与 elektronik-zeit.de 已占工具位；三层补贴数据高频失效（Freiburg 已罄/Stuttgart 已停），错一条即误导；既有 foerderung 页收敛为季度复核 + Stand 日期 |
| Smart-Meter 独立内容簇 | Verbraucherzentrale/energiemarie/enpal 占屏；消费者无决策可帮（只能 dulden）；radar 页 §41a 章已覆盖，GSC 出现相关展示再评估 |
| 独立「Dynamischer-Tarif-Rechner」新工具页 | WattPlaner/neon/Utopia 报道的工具已占位；与 radar 页直接蚕食；本站工具当前瓶颈是入口流量不是工具数量（stromkosten_calc 28d 仅 2 次） |
| BKW 簇再扩页（第 8/9 页） | 实验①入口桥 08-17 刚通，判定 09-16；判定前加面=永远无法归因；簇内容已覆盖购买决策全链 |
| 电价 head 词内容（`dynamischer Stromtarif` 等） | Finanztip/Verivox/BNetzA 红海（intersolar 文档 08-17 同判，维持） |
| 展示广告/工具订阅/白标计费 | 数学不成立（§4；08-05/08-14 既有否决维持） |
| 荷/法/意/英等非德补贴内容 | 联盟只有 amazon.de + 数据必过期（intersolar 文档既判，维持） |

**KGR 判定统计（本轮）**：新判 6 个查询——**通过 2**（EN balcony-solar 镜像、
klimaanlage heizen 成本角）、**红海毙 2**（dynamischer Stromtarif lohnt/Rechner 位、
Smart-Meter 权利义务位）、**深化替代 2**（ohne-Smart-Meter 问题 → radar FAQ、
BKW Förderung → 既有页季度复核）；另继承 intersolar/herbst 简报既判红海 8 个（见各文档）。

---

## 7. 执行排期与依赖

### 7.1 无 owner 依赖 —— 可排入每日 Routine（须服从执行令的两类限定）

执行令（execution-plan-2026-09）规定每日 run 只做「秋季转轨内容（KGR 判定过的）+
点击落点质量」。本 PRD 各项的归类：

| 项 | 归类 | 建议时点 |
|---|---|---|
| 格2 radar 页深化（三项 ✅） | 点击落点质量（E8 探针的入口质量） | **优先，9-13 判定日前完成** |
| 格3 heizfunktion 页深化（四项 ✅） | 秋季转轨内容（KGR 已判定） | 9 月上旬（供暖季前 3–4 周收录窗口） |
| 格1 EN 镜像 + 胶囊钩子 | 引用维护/放大（对应舰队阶梯 ⓪） | 9 月内；月度 Bing 拉取后复核 |
| foerderung 页季度复核 | 存量纠错 | 每年 2/5/8/11 月（下次 2026-11） |

### 7.2 owner 依赖（全部条件触发，不催）

1. **Awin 注册**（一次 KYC）——仅当 E8 `tariff_click ≥10/30d`（约 09-13 判定）。
2. **垂直联盟/lead 买家 KYC**——仅当实验①②存活（09-16 / 60d 判定）。
3. **月度 Bing AI Performance 拉取**（getecoback.com 面板两张明细）——格1/格3 的
   证伪线都依赖它；已是舰队月度惯例（每月 1–3 日），不新增请求。
4. （既有，不变）10-15 判定日前后看一眼 PartnerNet 合格销售数。

### 7.3 与 10-15 大判定日的关系

若 10-15 判「流量假设死」（<200 clicks），本 PRD 的格2/格3 不受影响——它们的证伪线
（9-13 / 11-30）各自独立，且格1 本来就不吃流量；若判「转化假设死」（≥200 击 0 成交），
Amazon 侧结论不改变本 PRD——三格的变现挂钩都不在 Amazon 上。

---

## 8. 来源

- 站内一手：docs/getecoback-ga4-monitor-log.md（2026-08-16 Bing AI Performance 实数据、
  08-17 日更 v4）、docs/revenue-experiments-2026-08.md、docs/monetization-decision-2026-08.md、
  docs/execution-plan-2026-09.md、docs/intersolar-transfer-2026-08.md、
  docs/herbst-competitor-brief-2026-08.md、docs/customer-research-2026-08.md、
  D1 `ecoback-events`（查询手册 docs/analytics-first-party-d1.md）
- 动态电价原声与机制：forum.iobroker.net（多线程）、sonnen.de/blog、homeandsmart.de、
  bautipps24.de、finanztip.de/stromtarife/dynamischer-stromtarif、wattplaner.de、
  neon.energy（Einsparpotenzial-Studie）、utopia.de
- Smart Meter：verbraucherzentrale.sh、energiemarie.de、enpal.de、rechtsschutzprofis.de
- BKW/Speicher：adac.de（Speicher 2026）、infranken.de、homeandsmart.de、ankersolix.com
- 供暖法规与补贴：adac.de（Heizungsgesetz/GModG、WP-Förderung 21.07.2026）、
  vattenfall.de、polarstern-energie.de、thermoschmiede.de、nibe.eu
- 空调取暖：heizung.de、thermondo.de、klimavergleich.at、ecoflow.com、wohnung-forum.de、
  reduco.ai
- Förderung 现状：finanztip.de、balkon-kraft-werke.de/rechner/foerder-finder、
  elektronik-zeit.de/balkonkraftwerk/foerderkarte、solarscouts.de、pluginenergy.de
- 变现单价：100partnerprogramme.de（Kleines Kraftwerk 10%）、anfragenfluss.de（CPL 2026）、
  leadstackmedia.com/solar、balkonkraftwerk-kompendium.de（Ostrom 17,50 €/Tibber Awin 57405）
