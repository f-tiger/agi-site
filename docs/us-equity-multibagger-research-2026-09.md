# 美股「几十倍标的」调研：AXTI / Bloom Energy / 存储三条线的裁定

**日期 2026-09-09 · owner 原话「美股几十倍标的推荐，针对 axti，bloom Energy，存储等进行调研分析」**

---

## 〇、边界声明（先划清楚，后面才好说实话）

1. **这是 owner 的个人研究备忘，不是投资建议，也不是任何站点的内容。** 依据 owner
   2026-09-05 的澄清（「自动化交易是个人用…目标是自己用来赚钱」）。
2. **这份文件的结论永远不进任何站点页面**：不做 zh 页面、不给券商链接、不做荐股页、
   不接线索漏斗。这条与 `/ai-trading-ledger` 和 `/agi-prediction-markets` 的红线同级
   （见根 CLAUDE.md「自动化交易子站?」与「类 Polymarket 抽佣平台?」两节）。
3. **不动 `paper-ledger` 的臂。** 十一臂在 2026-09-05 预登记、2026-09-08 开跑，昨天才是
   第一个交易日。事后按今天的行情加臂 = 毁掉预登记，等于把回测当证据。`MU` 本来就在
   `BASKET` 里（`paper_ledger.py:46`），`AXTI` / `BE` 不在，**也不加**。
4. **零编造照旧适用。** 沙箱对 stockanalysis / Yahoo Finance / SEC / stooq 全部 403
   （2026-09-09 实测，`__agentproxy/status` 记录了 CONNECT 403），所有数字来自 WebSearch
   返回的公开报道摘要，**每个数字带来源和日期**，来源打架的地方我标出打架而不是挑一个。
   凡是我自己算的，一律标「我的模型」。

---

## 一、先回答「几十倍」这三个字

### 1.1 统计上的基准率

Bessembinder 的经典结论（ASU / SSRN）：1926 年以来美股全部上市公司里，**只有 42.6%
的股票终身买入持有回报跑赢一个月国债**；**表现最好的 4% 公司贡献了整个美股市场的全部
净财富创造**，其余 96% 合起来等于国债。全球口径（1990–2018）更极端：**1.3% 的公司贡献了
44.7 万亿美元的全部财富创造**。

翻译成人话：**「几十倍」是 top 1% 的结果，而且几乎总是需要十年量级的时间。** 任何声称
能在一份研报里挑出它的说法，先验上就该打折。

### 1.2 市值算术：这三个名字今天还能不能装下 10 倍

| 标的 | 今天市值 | ×10 之后 | 参照 |
|---|---|---|---|
| AXTI | **40.4 亿美元**（2026-09-07） | 404 亿 | 需要一个比整个 InP 衬底行业大几十倍的利润池 |
| Bloom Energy | **740–820 亿美元**（2026-09-08，口径见 §5.2） | 7,400–8,200 亿 | 需要收入做到 2026 指引的 18–20 倍 |
| Micron | **1.15 万亿美元**（2026-09-08） | **11.5 万亿** | 今天全球第一的 Nvidia 是 5.56 万亿——等于两个 Nvidia |
| SanDisk | **2,548 亿美元**（2026-09-04） | 2.5 万亿 | 相当于今天的微软再多一点 |

**裁定：这三条线里没有一个还能给出「几十倍」。** 不是因为它们不好，而是因为
**几十倍已经发生完了，owner 是在涨完之后到场的**：

- SanDisk 年内 **+550% ~ +780%**（口径打架，见 §7），八个月里接近 8 倍；
- Micron 年内 **+256% ~ +297%**；
- Bloom Energy 年内 **+214%**；
- AXTI 上一个季度 **+130%**，最近 30 天 **−21%**。

这四行才是这份调研最重要的一句话。**问「哪个能涨几十倍」的时候，正确的第一个动作是
先确认自己不是在为已经兑现的几十倍付钱。**

---

## 二、AXTI（AXT Inc）——三个里唯一还有不对称性的，但方向是双向的

### 2.1 事实（全部带日期）

**股价与市值**
- 2026-09-07：$63.13，当日区间 $56.01–$64.11，市值 **$40.4 亿**，一周 **−13.92%**。
- 最近 30 天 −21%，此前一个季度 +130%。
- 5 位分析师平均评级 Buy，12 个月目标价 **$91.6**（较现价 +48.4%）。
- 下一次财报：**2026-10-29**。

**Q2 2026（2026-07-30 公布）**
- 收入 **$4,760 万**，公司历史最高，环比 +77%、同比 **+164%**。
- 其中磷化铟（InP）**$3,070 万**，也是历史最高，主要来自数据中心。
- 非 GAAP 毛利率 **45.0%**（Q1 29.9%，去年同期 8.2%）——这是本轮最硬的一个数字。
- 非 GAAP 净利 **$1,190 万**（$0.19/股），GAAP 净利 $1,113 万。市场预期 $0.07。
- Q3 2026 指引：非 GAAP EPS **$0.30–0.32**。

**长约与预付款（这是 thesis 的骨架）**
- 与 Casella（南京卡赛拉）、Coherent、Lumentum 签长期供货协议，预付款 **$2,230 万**
  与 **$2,540 万**。
- Lumentum 的长期供货 + 产能预留协议带 **最高 $8,750 万** 保证金（以发货抵扣），
  **2027 年才开始**。
- 管理层：InP 收入机会 **2026 年底前翻三倍以上**；2026 年 InP 产能翻倍且进度超前，
  2027 年再翻一倍。
- 「2027 年底做到 **$1.3 亿/季**」这个数字**只出现在一家二手摘要里，我在电话会转录的
  检索结果中没有复核到**——下面的模型把它当上限，不当事实。

**融资与股本（thesis 的最大稀释项）**
- 增发 **984 万股 @ $64.25 = 毛募资 $6.325 亿**，用于 Tongmei 的 InP 扩产与研发。
- 基本股数同比 **+40%**（4,370 万 → 6,120 万股）；授权股本提案从 7,000 万提到 1.2 亿股。
- 现金 + 短期投资 **$4.172 亿**（增发后口径）。注：$6.325 亿毛募资与 $4.172 亿现金
  对不上，两个数字来自不同时点的报道，**我没能核对到同一张资产负债表**。

**中国侧（thesis 的最大单点故障）**
- 2025-02 中国把 InP 纳入出口管制；2025-08 Tongmei 拿到许可证恢复对更多客户发货。
- **2025 Q4 收入低于指引，原因就是商务部发的 InP 许可证少于预期。**
- 2026 Q1 因为「许可证多于预期」收入环比 +17%。
- **也就是说：这家公司的季度收入由北京的一个审批节奏决定，两个方向都验证过了。**
- Tongmei 的科创板 IPO 于 **2026-06-26 撤回**，转香港交易所；有 RMB 3.24 亿可能被赎回。
- Tongmei 是 AXT 的**控股（非全资）子公司**——利润里有一部分归少数股东，不归 AXTI 股东。

### 2.2 我的模型（假设全部列出，可以逐条推翻）

从公开数字反推「毛利到净利」之间的全部支出：Q2 收入 $4,760 万 × 45.0% = 毛利 $2,140 万；
非 GAAP 净利 $1,190 万 → **运营费用 + 税 + 少数股东权益合计 ≈ $950 万/季**。

2027 年乐观情形（我的假设，非公司指引）：

| 项 | 假设 | 依据 |
|---|---|---|
| InP 收入 | $90–130M/季 | 下限 = 产能两次翻倍的保守兑现；上限 = 那个未复核的 $130M |
| 其他产品 | $20M/季 | GaAs / Ge，按当前规模平推 |
| 非 GAAP 毛利率 | 48% | Q2 已 45%，规模效应给 3 个点 |
| 毛利→净利支出 | $20M/季 | 今天 $9.5M 的两倍多，覆盖扩产后的人和折旧 |
| 股数 | 7,000 万 | 今天约 6,400 万（$40.4 亿 ÷ $63.13），再留一次小额融资 |

逐格算：上限 $150M 收入 × 48% = 毛利 $72M，减 $20M = 净利 $52M/季 = $208M/年 → EPS $2.97；
下限 $110M 收入 × 48% = 毛利 $52.8M，减 $20M = 净利 $32.8M/季 = $131M/年 → EPS $1.87。
**2027 年乐观情形 EPS 区间 $1.9–3.0**。今天的 $63.13 = **21x–33x 这个乐观 EPS**；
分析师目标价 $91.6 = **31x–48x**。

**结论：今天的价格已经把 2027 年最顺利的情形按 21–33 倍市盈率付掉了。**

### 2.3 为什么 10 倍在这里不成立（自下而上，不用市场研究报告）

AXT 今天 InP 年化收入约 $1.23 亿（$3,070 万 × 4）。按一家来源给的份额结构
（Sumitomo 43% / AXT 35% / JX 13%，全球 90%+ 产能由三家控制），**整个 InP 衬底行业
今天大约 $3.5 亿/年**；若 AXT 实际份额只有 20–25%，行业 $5–6 亿/年。就算按管理层
「2026 年底翻三倍」全行业同步放大，也就是 **$10–18 亿/年的行业**。

一个 404 亿美元的市值需要大约 **$10–20 亿的年净利**（按 20–40 倍市盈率）——**比整个
行业的收入还大**。所以：

> **AXTI 的 10 倍不是难，是算术上不成立**，除非它变成一家完全不同的公司。

（注：第三方市场报告在这个问题上完全不可信——同一批检索里，一家说「AI InP 衬底市场
2026 年 1.6 亿美元」，另一家说「全球 InP 市场 2026 年 60 亿美元」，而 AXT 一家的 InP
年化就是 1.23 亿。**自下而上算，别引用这类报告。**）

### 2.4 AXTI 的真实赔率

- **上行**：2027 年 EPS 摸到 $3、市场愿意给 40x → $120，约 **2 倍**。这是好情形，不是坏情形。
- **下行**：北京少发几张许可证。**这个场景 2025 Q4 已经真实发生过一次**，当时是收入不及
  指引；今天的股价含着 20–40 倍的完美预期，同样的事件会砍掉一半以上。
- **不对称性方向**：**向下**。这是三个标的里唯一还小到能翻倍的，也是唯一一个单一政府
  审批就能砍半的。

---

## 三、Bloom Energy——公司很好，倍数已经付过了

### 3.1 事实

- 2026-09-08：**$252.87**（同周另一来源 $244，盘前 $267.04）；年内 **+214%**。
- 股数 **2.9453 亿股**，某来源市值 **$819 亿**。**两个数字对不上**：2.9453 亿 × $252.87
  = **$745 亿**，$819 亿对应 $278/股。这属于不同时点或摊薄口径，**我不挑一个当真**，
  下面按 $745–819 亿这个区间算。
- **Q2 2026**：收入 **$10.654 亿**（+165.5%），产品毛利率 37.2%，非 GAAP 毛利率 34.3%。
- **2026 全年指引上调到 $39–42 亿**（约 +100%），非 GAAP 毛利率约 34%。
- 在手订单（backlog）**$200–240 亿**（来源区间）。
- Oracle 主服务协议最高 **2.8 GW**，其中 **1.2 GW 已签约**并在交付。
- Brookfield **最高 $50 亿** 战略合作，年底前公布一个欧洲站点。
- **2026-09-21 纳入标普 500**。
- 估值：**前瞻市盈率约 81x，滚动市盈率 279–300x+，beta 约 3.8**。
- 分析师：29 家共识 Buy，目标价 **$275–276**，最高 $390，**最低 $97**。

### 3.2 算术

按 2026 年 $39–42 亿收入、$745–819 亿市值 → **市销率 18–21 倍**。要 10 倍
（$7,400–8,200 亿），即使还给它 10 倍市销率，也需要 **$740–820 亿年收入 = 2026 指引的
18–20 倍**。而整个在手 backlog（跨多年）是 $200–240 亿。

**10 倍无解。** 甚至 3 倍（$750/股）都需要年收入做到约 $220 亿且市销率不压缩——等于
一年吃完全部 backlog 还要更多。

### 3.3 空头看的是什么（不是估值，是三个具体的东西）

1. **燃气轮机与核电正在抢同一个需求**：Chevron + Microsoft 的燃机项目、GE / Siemens
   Energy 的机组、政府背书的核电。Bloom 的核心卖点是**速度**（90 天 vs 电网排队数年），
   一旦轮机产能松动，这个溢价就压缩，直接影响 backlog 的转化价格。
2. **资本密集 + 稀释**：扩产靠外部融资，股权稀释风险被分析师反复点名。
3. **客户集中 + 政策依赖**：钪供应、IRA/OBBBA 抵免、超大规模客户的下单节奏；另有
   做空指控与 Rosen Law 的调查悬在头上。beta 3.8 意味着任何一条腿抖动都是暴力下跌。

**分析师最低目标价 $97 与最高 $390 相差 4 倍——这本身就是「没人真的知道」的诚实读数。**

### 3.4 裁定

**不是几十倍标的，是一个已经完成再定价的成长股。** 如果 owner 想参与，那是「押 AI 电力
瓶颈还要紧张两年」的交易，不是「找下一个百倍股」。判定它的第一个真实事件在 §6。

---

## 四、存储 / 内存——这里是全场最贵的赌，也是最容易被低市盈率骗到的地方

### 4.1 现在有多热（全部 2026 年数字）

- **Micron**：2026-09-08 **$1,014.91**，市值 **$1.15 万亿**，年内 +256%（另一来源 +296.74%）。
  FQ4 指引：收入约 **$500 亿**、非 GAAP EPS 约 **$31.00**、毛利率约 **86%**、单季调整后
  自由现金流 **> $300 亿**。FQ3 DRAM 收入 $313 亿（同比 +343%，环比 +67%），占收入 76%。
  HBM3E/HBM4 已售罄至 2027 年，HBM4 出货已超 $10 亿。
- **SanDisk**：2026-09-04 市值 **$2,548 亿**，年内涨幅报道口径 **+550% / +555% / +647% /
  +780.74%** 四个版本（见 §7）；FY2026 收入 +175%，单季收入 $89.6 亿，毛利率 84.6%。
- **Western Digital +240%、Seagate +227%**（年内）；HDD 半年涨价 30–40%，
  2025-09→2026-01 平均 +46%；两家 2026 年全年售罄，最大客户已预订到 2028 年。
- **市场结构**：DRAM 市场 Q2 2026 环比 +57%、同比 +385%；NAND 环比 +70%，
  价格环比约 +55%。Susquehanna 预计本季 DRAM 合约价再涨 50%+、NAND 约 60%。
- **需求侧**：四大云厂 2026 年资本开支 **$7,250 亿**（+77%）；2027 年预测 $9,345 亿
  （某口径）到 UBS 的 **$1.447 万亿**、Goldman 的 $1.01 万亿。TrendForce：内存将占
  2027 年 CSP 资本开支的 **68%**。

### 4.2 「便宜」是这轮最危险的信号

Micron 的前瞻市盈率被引用为 **12.5x（FY2026 共识 EPS $73.37）**、**约 6.5x（FY2027
共识 EPS $155.39）**，PEG 0.03。看起来白菜价。

**但这正是内存周期顶部的标准长相。** 上一轮的实测：

- 2018 年周期顶 EPS 约 **$12**；股价在**公司仍在报接近峰值利润时**，从 5 月高点到 12 月
  跌了 **56%**。
- 基本面从顶到底约 **6–7 个季度**，收入 −30%，**毛利率从 59% 掉到 27%**。
- 更近的一轮：上一次繁荣结束时，**Micron 单一财年亏损 58 亿美元**。

今天的毛利率是 **86%**——比 2018 年的周期顶（59%）还高 27 个点。**没有任何制造业能长期
维持 86% 的毛利率**；它是短缺租金，不是护城河。6.5 倍市盈率的分母是租金。

### 4.3 什么时候翻车：TrendForce 已经给了分叉日期

- **DRAM**：2027 年仍紧（HBM + AI 服务器单机容量上升快过供给），供需缺口比 2026 年的
  −1% ~ −2% 还要扩大。
- **NAND**：新产能落地 + 消费电子疲软 → **2027 年下半年转松，充足率转正**。
- 也就是说 **NAND 侧（SanDisk 的全部、WDC 的一半）已经有了一个明确的转向窗口：2H27**。
  TrendForce 自己留了后门：Agentic AI 的推理需求如果加速，可能吸收掉这批供给。

**Michael Burry 已建立 Micron 空头**，理由是 AI 数据中心 2028 年可能出现过剩。
另一侧的卖方给出的熊市情形是 **$200–250**（按恶化后的盈利给 8–10x），基准情形
2027 年 6 月回到 **$750** 附近。**这批分歧本身就是答案：这是周期位置的赌，不是复合器。**

### 4.4 裁定

- **10 倍：不可能**（MU 需要 11.5 万亿 = 两个 Nvidia；SNDK 需要 2.5 万亿）。
- **参与方式如果要有的话，必须按周期股的规矩**：不看市盈率看毛利率与合约价方向，
  在**利润最好看**的时候减仓，而不是在最难看的时候。
- **在同一条线上，风险从低到高**：Micron（DRAM 紧到 2027，产品线更宽）> Western
  Digital / Seagate（HDD 已预订到 2028，但涨幅也已 +240%）> SanDisk（纯 NAND，
  正对着 2H27 那个转松窗口，而且是全场年内涨幅第一）。

---

## 五、如果一定要找「几十倍」：结构条件，以及为什么我不给名单

### 5.1 结构筛选（缺一条就别叫「几十倍标的」）

1. **市值 < $20–30 亿**——否则天花板在算术上就封死了。
2. **可验证的自下而上 TAM ≥ 当前收入的 30–50 倍**——不是市场研究报告的 TAM（§2.3 已经
   演示了那类报告能差 40 倍）。
3. **不靠持续股权融资兑现增长**——AXTI 一年增股 40%，10 倍里有一部分要还给新股东。
4. **周期位置不在顶部**——在 86% 毛利率上买周期股，是在为均值回归付钱。
5. **时间尺度 5–10 年 + 基准率 top 1–4%**（§1.1）。

### 5.2 用这把尺子量一遍市场上常被点名的小票

| 名字 | 市值 / 价格 | 事实 | 卡在哪一条 |
|---|---|---|---|
| POET Technologies | **$15.3 亿**（2026-08-10），年内 +138.6% | 收入约 **$110 万**；现金 $7.96 亿；Lumilens $5,000 万订单 | 市销率 ~1,390 倍。**彩票已经按彩票定价了**，条 2 无法验证 |
| Lightwave Logic | $6.04，年内 **+291%** | 聚合物调制器，长期未商业化 | 条 2、条 3 都不满足 |
| Applied Optoelectronics | $90.11，年内 **+203% ~ +440%**（口径打架） | 光模块，直接吃 1.6T | 已经不小了，且涨幅已兑现 |
| Netlist | **$18 亿** | Q2 收入 $1.098 亿（+163%），净利 **$140 万**（净利率 1.3%） | 利润靠诉讼，不是产品；条 2 不满足 |
| Aehr Test Systems | **$7.7 亿** | AI 芯片老化测试 | 唯一同时满足条 1 的，但收入体量与订单可见度需要单独尽调 |
| FuelCell Energy | **$17 亿**（2026-08） | Bloom 的穷亲戚 | 长期稀释史；条 3 不满足 |

**我不推荐上面任何一个作为「几十倍标的」。** 理由不是它们一定不涨，而是：**在条 2
（可验证 TAM）和条 3（不稀释）上都过不了关的东西，买的是彩票，那就该按彩票的仓位买，
而不是按「推荐标的」的仓位买。** 一份诚实的研报在这里的正确输出是「没有」，不是凑三个
名字。

---

## 六、如果 owner 要参与：仓位与判定线（预登记，可证伪）

### 6.1 仓位纪律

- 「几十倍」候选（§5.2 那一类）：**单个 ≤ 总资产 1–2%，全部合计 ≤ 5%**。
- AXTI 这种「有真实收入 + 单点政治风险」的：**按可以归零的仓位买**，因为砍半的机制
  （许可证）已经实测过一次。
- 内存：**按周期股买**，在毛利率最高时减，不在市盈率最低时加。
- 这三条线**高度同源**——都靠同一批超大规模资本开支。**四大云厂 2026 年花掉相当于云收入
  102% 的钱做资本开支，2027 年六家里只有微软被预测有正自由现金流。** 把三个都买满，
  不是分散，是同一个赌下三次注。

### 6.2 预登记判定线（到日子必须回来结算，零也记）

| 日期 | 判定 | 判负则 |
|---|---|---|
| **2026-10-29** | AXTI Q3 财报：非 GAAP EPS 是否落在 $0.30–0.32 指引内；InP 收入是否 ≥ $4,500 万（「2026 年底翻三倍」的中途读数）；10-Q 里出口许可证的措辞是否恶化 | 任一不达 → AXTI 的成长 thesis 判负，2.4 节的「向下不对称」确认 |
| **2026-12-31** | Bloom 是否如公司所说公布了那个欧洲站点 | 未公布 = backlog 转化出现第一道裂缝 |
| **2027-06-30** | NAND 合约价方向与 allocation 措辞（SanDisk / WDC 财报原文）；DRAM 是否仍报缺口 | TrendForce 的 2H27 转松若被提前证实 → 纯 NAND 敞口清掉 |
| **2027 财年内** | Micron 毛利率从 86% 回落到哪；FY27 EPS 是否接近 $155.39 共识 | **毛利率跌破 60% = 周期转向确认**（2018 年是 59%→27%） |
| **2027-09-09** | **我自己的错判线**：若 AXTI 在此日前触及 $630（10 倍），本文件 §2.3 的「算术上不成立」判负 | 必须写进复盘，不许静默改口 |

---

## 七、数据可信度与来源打架（必须带出，不许假装干净）

1. **沙箱网络**：stockanalysis.com / finance.yahoo.com / sec.gov / 247wallst / fool.com /
   stooq.com 全部被出口代理 403（2026-09-09 实测）。**本文件没有一个数字来自一手财报
   PDF**，全部来自 WebSearch 返回的公开报道摘要。要拿这份东西下真金白银的单，
   **先用券商终端复核一遍价格与股数**。
2. **年内涨幅口径打架**：SanDisk 有 +550% / +555% / +647% / +780.74% 四个版本；
   Micron 有 +256% / +296.74% 两个版本；AAOI 有 +203% / +365% / +440% 三个版本。
   不同截止日 + 不同起点。**结论不依赖具体哪个数，只依赖「已经涨了很多倍」这个方向。**
3. **Bloom 市值与股数对不上**：2.9453 亿股 × $252.87 = $745 亿，而报道的市值是 $819 亿
   （隐含 $278/股）。已在 §3.1 标出，按区间处理。
4. **AXTI 现金与募资对不上**：毛募资 $6.325 亿 vs 现金及短投 $4.172 亿，来自不同时点报道，
   未核对到同一张表。
5. **单一来源、未复核**：AXTI「2027 年底 $1.3 亿/季」只见于一家二手摘要，电话会转录检索
   未复核到；本文件只把它当模型上限。
6. **第三方 TAM 报告全部不可信**：同一批检索里 InP 市场规模有 $1.6 亿与 $60 亿两个版本，
   相差 37 倍，而 AXT 一家年化就 $1.23 亿。§2.3 改用自下而上。
7. **InP 份额也打架**：一家说 Sumitomo 60%，另一家说 Sumitomo 43% / AXT 35% / JX 13%。
   §2.3 的行业规模因此给的是区间。

---

## 八、一页纸结论

1. **「几十倍」在这三条线上已经结束了。** SanDisk 八个月接近 8 倍、Micron 近 3 倍、
   Bloom 3 倍、AXTI 一季度 1.3 倍。现在进场是为已兑现的倍数付钱。
2. **AXTI** 是三个里唯一还小到能翻倍的（$40 亿市值），但 10 倍在算术上不成立（整个 InP
   衬底行业约 $3.5–6 亿/年），而且它的收入由中国出口许可证节奏决定，砍半机制在
   2025 Q4 实测过。**不对称性朝下。**
3. **Bloom Energy** 是好公司、坏入场点：19–21 倍市销率、81 倍前瞻市盈率、beta 3.8，
   分析师目标价从 $97 到 $390 —— 这是「没人知道」的诚实读数。
4. **存储** 是全场最危险的低市盈率：86% 的毛利率是短缺租金不是护城河，2018 年那轮
   59%→27%、股价在利润仍处峰值时先跌 56%。NAND 已有明确转向窗口（2H27），DRAM 更硬。
5. **真正的「几十倍」筛选条件写在 §5.1，按它筛下来今天的候选名单是空的。** 我不凑名字。
6. **这三条线同源**：都靠同一批云厂资本开支（2026 年 $7,250 亿，等于云收入的 102%）。
   同时持有不是分散。
7. 判定线在 §6.2，日期已经定死，到日子回来结算。

---

## 九、来源

价格与市值：[Robinhood AXTI](https://robinhood.com/us/en/stocks/AXTI/) ·
[TradingView AXTI](https://www.tradingview.com/symbols/NASDAQ-AXTI/) ·
[CNN Markets MU](https://www.cnn.com/markets/stocks/MU) ·
[Investing.com BE](https://www.investing.com/equities/bloom-energy-corp) ·
[companiesmarketcap BE 股数](https://companiesmarketcap.com/bloom-energy/shares-outstanding/) ·
[financecharts SNDK 市值](https://www.financecharts.com/stocks/SNDK/summary/market-cap) ·
[StockTitan 市值排行 2026-09](https://www.stocktitan.net/rankings/companies-market-cap)

AXTI 基本面：[AXT 官方 Q2 2026 财报](https://investors.axt.com/Investors/news/news-details/2026/AXT-Inc--Announces-Second-Quarter-2026-Financial-Results/default.aspx) ·
[Businesswire 原稿](https://www.businesswire.com/news/home/20260730124233/en/AXT-Inc.-Announces-Second-Quarter-2026-Financial-Results) ·
[Semiconductor Today: 靠 InP 转盈](https://www.semiconductor-today.com/news_items/2026/aug/axt-040826.shtml) ·
[Semiconductor Today: Q1 许可证多于预期](https://www.semiconductor-today.com/news_items/2026/may/axt-050526.shtml) ·
[Semiconductor Today: Q4/2025 受许可证延迟拖累](https://www.semiconductor-today.com/news_items/2026/mar/axt-090326.shtml) ·
[AXT Q2 2026 电话会转录](https://www.fool.com/earnings/call-transcripts/2026/08/03/axt-axti-q2-2026-earnings-call-transcript/) ·
[$6.325 亿增发](https://finance.yahoo.com/markets/stocks/articles/why-axt-axti-down-7-130348546.html) ·
[Tongmei 转港交所](https://www.stocktitan.net/sec-filings/AXTI/8-k-axt-inc-reports-material-event-1065f9e00ff9.html) ·
[Maius Partners: Tongmei 的资产与脆弱经济性](https://www.maiuspartners.com/p/axts-tongmei-problem-great-asset)

Bloom Energy：[Q2 2026 财报](https://investor.bloomenergy.com/press-releases/press-release-details/2026/Bloom-Energy-Reports-Record-Second-Quarter-2026-Financial-Results-and-Raises-Full-Year-2026-Guidance/default.aspx) ·
[Oracle 2.8 GW](https://investor.bloomenergy.com/press-releases/press-release-details/2026/Bloom-Energy-and-Oracle-Expand-Strategic-Partnership-to-Deploy-up-to-2-8-GW-to-Accelerate-AI-Infrastructure-Build-Out/default.aspx) ·
[Brookfield $50 亿](https://www.bloomenergy.com/news/brookfield-and-bloom-energy-announce-5-billion-strategic-ai-infrastructure-partnership/) ·
[估值检验](https://finance.yahoo.com/markets/stocks/articles/bloom-energy-ai-surge-meets-190500129.html) ·
[燃机与核电竞争](https://finance.yahoo.com/energy/articles/bloom-energy-faces-fresh-ai-151508636.html) ·
[标普 500 纳入](https://finance.yahoo.com/markets/stocks/articles/bloom-energy-shares-rise-p-104838920.html)

存储 / 内存：[Micron FQ3 电话会讲稿](https://investors.micron.com/static-files/631b1a32-5537-46ae-8f40-82e42fc79dfe) ·
[TrendForce: 2027 DRAM 紧 / NAND 松](https://www.trendforce.com/presscenter/news/20260730-13158.html) ·
[TrendForce: 内存占 2027 CSP 资本开支 68%](https://www.trendforce.com/presscenter/news/20260825-13198.html) ·
[TrendForce: NAND 2H27 转松](https://www.trendforce.com/presscenter/news/20260721-13148.html) ·
[上一轮繁荣以单年亏损 58 亿收场](https://www.fool.com/investing/2026/08/17/the-last-memory-boom-ended-with-micron-losing-58-b/) ·
[每一轮内存周期的结局](https://www.uncoveralpha.com/p/every-memory-cycle-ends-the-same) ·
[Micron 熊市情形与 Burry 空头](https://watcher.guru/news/micron-stock-price-target-analysis-bull-vs-bear-clash-over-peak-valuation-risk) ·
[HDD 涨价与售罄](https://247wallst.com/investing/2026/05/16/seagate-and-western-digital-ai-storage-demand-is-now-showing-up-in-pricing-power/) ·
[年内涨幅榜](https://finbold.com/top-10-best-performing-stocks-in-the-sp-500-this-year/)

需求侧：[六家云厂 2027 年 $1.3 万亿资本开支、仅一家正自由现金流](https://www.fool.com/investing/2026/09/06/hyperscalers-driving-ai-capex-cash-flow/) ·
[CNBC: 2027 年破万亿](https://www.cnbc.com/2026/04/30/ai-boom-big-tech-capital-expenditures-now-seen-topping-1-trillion-in-2027-.html) ·
[TrendForce: AI 光模块 2026 年 $260 亿](https://www.trendforce.com/presscenter/news/20260420-13017.html)

基准率：[Bessembinder, Do Stocks Outperform Treasury Bills?](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2900447) ·
[ASU W. P. Carey 摘要](https://wpcarey.asu.edu/department-finance/faculty-research/do-stocks-outperform-treasury-bills) ·
[全球口径 1990–2018](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3415739)

小票体检：[POET 市值与收入](https://photoncap.net/p/11m-revenue-11b-market-cap-the-assembly) ·
[Netlist Q2 2026](https://www.insidermonkey.com/blog/the-next-micron-some-investors-say-netlist-nlst-is-the-best-ai-memory-stock-to-buy-now-1793785/) ·
[Aehr 市值](https://www.fool.com/investing/2026/08/27/this-tiny-ai-stock-has-crushed-micron-and-nvidia-t/) ·
[FuelCell 市值](https://companiesmarketcap.com/fuelcell-energy/marketcap/)
