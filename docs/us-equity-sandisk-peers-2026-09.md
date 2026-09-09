# 对标闪迪：美股存储 / 内存全链条大范围调研

**日期 2026-09-09 · owner 第四次指令「扩大调研范围，对美股对标闪迪的标的大范围调研」**

前三份：`us-equity-multibagger-research-2026-09.md`（AXTI / Bloom / 存储裁定）、
`us-equity-10x-screen-2026-09.md`（14 个候选筛出 3 个）、
`us-equity-10x-deepdive-2026-09.md`（三处纠正，Centrus 取代 Arteris）。

边界照旧：个人研究备忘，不是投资建议，永不进任何站点页面，不做 zh 荐股页，不接券商漏斗，
不改 `paper_ledger.py` 的臂。沙箱对财经站点全部 403，数字来自公开报道摘要并带日期。

---

## 一、先把闪迪本身钉死（这是所有对标的基准）

| 项 | 数字 | 日期 |
|---|---|---|
| 股价 | **$1,774.99**（当日 $1,738.00–1,807.35） | 2026-09-08 |
| 股数 / 市值 | 1.4642 亿股 / **$2,548 亿** | 2026-09 初 |
| FQ4 收入 | **$89.7 亿**，EPS **$39.25**，毛利率 **84.6%**，数据中心 **+103%** | 2026-08 |
| FQ1 FY27 指引 | 收入 **$103–108 亿**，EPS **$44–46** | 2026-08-05 |
| **前瞻市盈率** | **8.04**（低于硬件行业中位数 18.19 的 55.8%）；2027 年 PE **6.7**，对应 222% EPS 增长预期；EV/EBITDA 16.68 | 2026-09-07 |
| 合约收入 | **$939 亿**（新商业模式 NBM + 多年客户协议），其中 **$165 亿是 AI 相关保证** | 2026-08 |
| 资本回报 | Q4 回购 $45 亿，授权余额 **$155 亿** | 2026-08 |
| 分析师 | 均值 **$2,073.94**（大摩 $1,750 / 美银 $2,500 / 最高 $3,000），83% 买入 | 2026-09 |
| 年内涨幅 | **+550% ~ +780%**（四个来源口径打架，见 §十） | 2026 年内 |

**两个必须一起看的反向信号**：
1. **创纪录的季度之后股价跌了 13%**，原因是 FQ1 指引不及市场预期。
2. **TrendForce 预计本季 NAND 价格只涨 10–15%，而闪迪上一季吃到的是约 +70% 的涨幅。**
   **涨价的一阶导正在急剧收敛。**

---

## 二、第一个结论：美股里「同层对标」实际上只有一个

| 类型 | 公司 | 是否美股 |
|---|---|---|
| 纯 NAND 原厂 | **SanDisk** | ✅ 就是它自己 |
| 纯 NAND 原厂 | **Kioxia**（闪迪的合资伙伴，共有 Yokkaichi / Kitakami 厂） | ❌ 东京上市 |
| NAND 原厂 | Samsung / SK hynix（含 Solidigm） | ❌ 韩国上市 |
| DRAM + NAND 原厂 | **Micron** | ✅ **美股唯一同层对手** |

**想在美股买「第二个闪迪」，同层没有货。** 唯一的同层标的是 Micron，而它已经
**$1.15 万亿市值**（2026-09-08，$1,014.91）。这个结论决定了下面所有讨论的方向：
**对标闪迪只能沿着产业链上下走，不能平着走。**

---

## 三、全链条对标表（按离晶圆的距离排序）

| 层 | 标的 | 市值 | 年内涨幅 | 估值 | 关键数字 |
|---|---|---|---|---|---|
| **拥有 NAND 晶圆** | **SanDisk (SNDK)** | $2,548 亿 | **+550~780%** | **前瞻 PE 8.0** | FQ4 毛利率 84.6% |
| **拥有 DRAM+NAND 晶圆** | **Micron (MU)** | $1.15 万亿 | **+256~297%** | FY27 约 6.5x | FQ4 指引毛利率约 86% |
| 替代品（同样短缺） | **Seagate (STX)** | $1,930–2,050 亿 | **+227%** | 前瞻 PE **24** | 近线 HDD 均价 $14.30–14.90/TB，厂商目标 $25–30 |
| 替代品（同样短缺） | **Western Digital (WDC)** | $1,660–1,721 亿 | **+240%** | 前瞻 PE **21–22** | 前七大客户有确定订单，长约覆盖 2027–2028 |
| **卖铲子给原厂** | **Lam Research (LRCX)** | **$4,020 亿** | **+139%** | PE **61.4x** | **NAND 占系统收入从 3 月季的 12% 跳到 23%，金额翻倍以上** |
| 卖铲子 | Applied Materials (AMAT) | — | **+98% ~ +144%**（口径打架） | — | 半导体设备业务 2026 自然年增长 >30% |
| 卖铲子 | Onto Innovation | $151 亿 | **+85%** | — | HBM 与先进封装检测 |
| 卖铲子 | KLA | — | **+59%** | — | 过程控制强度随先进封装上升 |
| 卖铲子 | Camtek | — | **+49%** | — | 单季 $1.33 亿创纪录，某 HBM 大厂 >$5,000 万 Hawk 订单交付 2027 |
| AI 系统 / 内存集成 | **Penguin Solutions (PENG)** | **$32 亿** | **+159.5%** | PT $74.29（+57%） | Q3 FY26 收入 $4.79 亿 +48%，AI 占 74% 且增长 104% |
| **控制器（不拥有晶圆）** | **Silicon Motion (SIMO)** | **$93.3 亿** | **+54%** | — | Q2 指引 $3.93–4.11 亿，营业利润率 19.8–21.1% |
| 企业存储（买 flash） | Everpure（原 Pure Storage） | $310 亿 | **+42%** | — | 单季收入首破 $10 亿，+16% |
| 企业存储（买 flash） | NetApp | $206 亿 | **+45%** | — | 增速三倍化 |
| 模块 / 专利 | Netlist (NLST) | $18 亿 | — | — | 2026-09 上诉失利，5 项专利被判无效 |
| MRAM 利基 | Everspin (MRAM) | $4.05 亿 | — | — | 公司目标是 2029 年收入翻一倍 |

---

## 四、全场最重要的一个规律：涨幅几乎完全由「是否拥有晶圆」决定

把上表按涨幅重排，规律干净得反常：

```
拥有 NAND/DRAM 晶圆      →  +256% ~ +780%
短缺的替代品(HDD)         →  +227% ~ +240%
卖设备给原厂扩产          →  +49%  ~ +139%
不拥有晶圆的控制器/系统   →  +42%  ~ +54%（PENG +159.5% 是例外，见下）
```

**这不是错配，这是经济学。** 这一轮涨的是**价格**不是**出货量**：DRAM 合约价 Q2 2026
环比涨了 **89%**，服务器 DRAM 单季涨 **90–95%**。价格上涨产生的租金，**全部归晶圆的
所有者**。链条下游不是受益者，**是付钱的那一方**：

- Dell 3 月 30 日起目录价 **+17%**，内存重配置最高 **+30%**；
- HPE 服务器与存储平台 **+10–15%**；
- Dell 的 COO 原话是「我们感觉每天都在重新定价」。

OEM **把成本转嫁出去了**（没有自己吸收），所以他们的利润率暂时没塌。**但这意味着涨价
最终由终端买单，需求弹性是下一个风险，不是已经消失的风险。**

**PENG 是唯一的例外，而例外的原因恰好证明规律**：它涨 159.5% 不是因为卖内存，
而是因为 74% 的收入来自 AI 工厂系统集成且这块增长 104%——**它卖的是「把 AI 数据中心
建起来」，不是「把内存转手」。**

---

## 五、真正的「下一棒」：闪迪的暴利正在变成设备订单

这是本轮调研里唯一一条**有公告、有合同、时间明确**的传导链：

1. **Kioxia + SanDisk 于 2026-08-27 宣布在日本投资超过 $310 亿（约 5 万亿日元）**，
   用于 Yokkaichi 与 Kitakami 两厂的产能与技术；两厂的合资协议**已延长到 2034-12-31**。
   （**公告明确说这笔投资取决于日本政府的支持**，这是一个真实的前提条件，不是修辞。）
2. BiCS8 是 218 层，**BiCS10 是 332 层**，原定 2027 下半年量产，现在目标 **2026 年在
   Kitakami K2 开始量产**。
3. **Lam Research 的 NAND 占系统收入从 3 月季的 12% 跳到 23%，金额翻倍以上**；
   公司说 **$400 亿的 NAND 转换投资，大部分预计在 2027 年底之前发生**。
4. Lam FY2026 收入 $232.3 亿（+26%），EPS $5.82（+41%），单季创纪录 $67.2 亿，
   下季指引 $81 亿；2026 年全球晶圆厂设备开支（WFE）指引约 **$1,350 亿**。

**买设备 = 买「闪迪把钱花出去」这件事。** 它比买闪迪本身晚一个身位，但**确定性更高**：
合资协议签到 2034、capex 已公告、转换投资的时间窗已被 Lam 说死在 2027 年底前。

**代价**：Lam 已经 **$4,020 亿市值、61.4 倍市盈率、年内 +139%**。**这一棒也不便宜。**

---

## 六、估值离散度：市场已经把答案写在倍数里了

| 标的 | 前瞻市盈率 | 市场在说什么 |
|---|---|---|
| **SanDisk** | **8.0** | 「这是周期租金，E 会掉」 |
| Micron | 约 6.5x（FY27 共识） | 同上，甚至更极端 |
| Western Digital | 21–22 | 「HDD 的短缺更持久」 |
| Seagate | 24 | 同上 |
| **Lam Research** | **61.4x** | 「设备是跨周期的，这轮扩产要花好几年」 |

**闪迪 8 倍市盈率不是「便宜」，是市场在预告分母会缩水。** 上一份文档已经写过这个陷阱的
历史版本：2018 年内存周期顶，Micron 毛利率从 59% 掉到 27%，**股价在公司仍报接近峰值
利润时就先跌了 56%**。

**第一个支持市场判断的数据点已经出现**：闪迪上一季吃的 NAND 涨价约 +70%，
**TrendForce 看本季只有 10–15%**。

**反方的两个硬事实也要给足**：闪迪手上有 **$939 亿合约收入**（含 $165 亿 AI 保证），
以及 **$155 亿回购授权**。这不是 2018 年那种纯现货敞口——**这一轮有合同垫底，
所以「E 会掉」和「E 会掉多少」是两个问题。**

---

## 七、滞后名单，以及为什么滞后不等于便宜

如果 owner 要找「对标闪迪但还没涨」的，全链条里只有三个：

| 标的 | 市值 | 年内 | 为什么没涨 |
|---|---|---|---|
| **Silicon Motion (SIMO)** | $93.3 亿 | +54% | 卖控制器，**按颗收钱，不按比特价格收钱**。这一轮涨的是价格不是出货量 |
| Everpure（原 Pure Storage） | $310 亿 | +42% | **买 flash 的一方**，NAND 涨价是它的成本 |
| NetApp | $206 亿 | +45% | 同上 |

**结论：滞后是因为商业模式在链条的另一边，不是因为市场没发现它们。**

三个里唯一值得单独看的是 **SIMO**：$93.3 亿市值是全链条里唯一「市值不大 + 直接吃 NAND
出货量」的组合，Q2 指引收入 $3.93–4.11 亿、营业利润率 19.8–21.1%，Ferri 与启动盘方案
已接近收入的 30%。**它的驱动力是比特出货量与嵌入式/企业级渗透，不是比特价格。**
如果 2027 年 NAND 转向「价格回落但出货量放大」，**SIMO 是链条里少数会从中受益的**。
这是一个明确的、可证伪的判断，不是含糊的「值得关注」。

---

## 八、直接回答 owner 的问题：对标闪迪该看什么

1. **想要「闪迪那门生意」**：美股同层只有 **Micron**，而它已经 $1.15 万亿、
   FY27 共识 6.5 倍市盈率——**和闪迪是同一个赌，不是分散。**
2. **想要「闪迪的下一棒」**：**Lam Research**，因为 $310 亿的 Kioxia/SanDisk 日本投资
   和 $400 亿 NAND 转换投资会变成它的订单，且时间窗被公司说死在 2027 年底前。
   **代价是 61 倍市盈率和已经 +139% 的年内涨幅。**
3. **想要「便宜的对标」**：**SIMO** 是唯一结构上说得通的，但要清楚它赌的是**出货量**
   不是**价格**——**这等于赌周期的下半场，不是上半场。**
4. **不建议**：企业存储（Everpure / NetApp，成本方）、HDD（STX/WDC 已涨 227–240%
   且倍数已到 21–24 倍，不再是错杀）。
5. **最重要的一句**：**这条链上从原厂到设备到系统，全部由同一批云厂资本开支驱动。**
   把 SNDK + MU + LRCX + WDC 一起买，**不是分散，是同一个赌下四次注**——
   这和第一份文档对 AI 那条线的结论完全一样。

---

## 九、判定线（预登记，到日子回来结算）

| 日期 | 判定 | 判负则 |
|---|---|---|
| **2026 年 10–11 月（闪迪 FQ1 FY27）** | 收入是否落在 $103–108 亿指引内；NBM 是否真达到 FY27 比特的 50%+ | 指引再次不及 → 「合约垫底」的护城河故事减一分 |
| **2026 Q4 / 2027 Q1** | **NAND 合约价环比**（TrendForce 已给本季 10–15%，上季约 70%） | **转负 = 周期见顶确认**，SNDK 的 8 倍市盈率里的分母开始兑现 |
| **2027 年内** | Lam 的 NAND 占系统收入是否继续从 23% 往上 | 掉回 15% 以下 → $400 亿转换投资的节奏在放缓，设备这一棒也要降级 |
| **2026 年底前** | **Kioxia/SanDisk 的 $310 亿是否拿到日本政府支持**（公告明确说 contingent） | 拿不到 → 整条设备传导链的时间表要重算 |
| **2027 年内** | SIMO 的收入是否由出货量驱动加速（而非价格） | 不加速 → §七 那个「周期下半场」的判断判负 |
| **2027-06-30** | TrendForce 的 NAND 2H27 转松是否兑现 | 兑现 → 纯 NAND 敞口清掉，这在第一份文档里已经预登记过 |

---

## 十、数据可信度与冲突（本轮新增）

1. **年内涨幅口径全面打架**：SanDisk 有 +550% / +555% / +647% / +780.74% 四个版本；
   Micron 有 +256% / +296.74%；**Applied Materials 有 +98%（8-18）与 +143.92%（榜单）**。
   不同截止日 + 不同起点。**本文的结论只依赖「拥有晶圆的涨了几倍、不拥有的涨了四五成」
   这个量级差，不依赖具体哪个数。**
2. **市值多口径**：Seagate $1,930 亿 vs $2,050 亿；Western Digital $1,660 亿 vs $1,721 亿；
   Lam 的 $4,020 亿与 $287.76 股价对应约 14 亿股，与我记忆中的股本量级一致但**未核对到
   一手股本数**。
3. **Everpure 改名**：Pure Storage 已更名 Everpure，代码变更**本轮未核到确定的新代码**
   （一处显示为 `P`，一处仍用 `PSTG`）。下单前必须核对代码，**这是会买错标的的那种错**。
4. **闪迪的 $939 亿合约收入**只见于对财报的二手报道，**未核对到 10-K 原文的口径定义**
   （「合约收入」是否等于会计上的 RPO 不确定）。
5. 沙箱对 stockanalysis / Yahoo / SEC / stooq 全部 403，**没有一个数字来自一手财报 PDF**。

---

## 十一、来源

闪迪：[FQ4 与 FQ1 FY27 指引](https://www.tradingkey.com/analysis/stocks/us-stocks/262123876-sandisk-sndk-q4-fy2026-8-97b-record-revenue-eps-39-25-beat-q1-guidance-miss-data-center-103-pct-84-6-margin-tradingkey) ·
[前瞻市盈率 8.04](https://www.gurufocus.com/term/forward-pe-ratio/SNDK) ·
[Q1 FY2027 指引公告](https://www.marketbeat.com/instant-alerts/sandisk-nasdaqsndk-releases-q1-2027-earnings-guidance-2026-08-05/) ·
[NAND 涨价 70% 与 TrendForce 本季 10–15%](https://www.fool.com/investing/2026/08/23/sandisk-rode-an-estimated-70-jump-in-nand-prices-trendforce-sees-10-to-15-this-quarter/) ·
[10-K FY2026](https://www.sec.gov/Archives/edgar/data/0002023554/000162828026057406/sndk-20260703.htm)

Kioxia 合资与日本投资：[$310 亿日本投资公告](https://www.sandisk.com/company/newsroom/press-releases/2026/2026-08-27-kioxia-and-sandisk-to-invest-over-31-billion-in-japan-extending-leadership-in-memory-industry) ·
[Yokkaichi 合资延至 2034](https://www.kioxia.com/en-jp/about/news/2026/20260130-1.html) ·
[TrendForce：Kioxia 与闪迪的联盟与竞争](https://www.trendforce.com/news/2026/01/29/news-second-tier-no-more-kioxia-and-sandisk-balance-alliance-and-rivalry-in-ai-nand-race/)

设备链：[Lam 年内 +114%（后升至 +139%）](https://finance.yahoo.com/markets/stocks/articles/lam-research-stock-114-far-205810147.html) ·
[Lam Q4 FY2026 与 2027 展望](https://finance.biggo.com/news/US_LRCX_2026-07-29) ·
[Lam 街最高目标价与 NAND 设备需求](https://www.barchart.com/story/news/2609124/lam-research-stock-just-got-a-new-street-high-price-target-nand-equipment-demand-can-take-lrcx-higher) ·
[闪迪目标发布后 Lam/AMAT/Camtek 同涨](https://247wallst.com/investing/2026/08/13/lam-research-applied-materials-and-camtek-rise-after-sandisk-issues-bullish-financial-targets/) ·
[AMAT 年内 +98% 与同业比较](https://247wallst.com/investing/2026/08/18/applied-materials-rockets-98-in-2026-how-does-amat-compare-to-lam-research-and-kla-as-ai-capex-powers-chip-gear-stocks/)

HDD 与下游：[WDC vs Seagate 估值比较](https://www.fool.com/investing/2026/08/25/western-digital-vs-seagate-technology-which-data-s/) ·
[近线 HDD 价格与 2028 年短缺预测](https://x.com/pequityresearch/status/2068189826310930478) ·
[服务器内存涨价与 OEM 转嫁](https://www.servermonkey.com/blog/july-2026-enterprise-it-market-update.html) ·
[Dell +17%、HPE +10–15%](https://5pointtechnology.com/memory-compute-pricing-2026-analyst-forecast/)

控制器与系统：[Silicon Motion Q1 2026 与 Q2 指引](https://finance.yahoo.com/markets/stocks/articles/look-silicon-motion-technology-nasdaqgs-200923492.html) ·
[Penguin Solutions AI 内存集成](https://seekingalpha.com/article/4920600-penguin-solutions-rapid-growth-from-ai-integrated-memory-solutions) ·
[Everpure / NetApp 2026 表现](https://nomad-labs.com/best-ai-infrastructure-memory-stocks/)
