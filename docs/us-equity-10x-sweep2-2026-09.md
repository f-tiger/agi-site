# 第六轮：横向扫描前五轮没碰过的七个板块

**日期 2026-09-11 · owner 第六次问「看看美股哪些可以10倍」**

前五轮全在 AI 基础设施、核燃料、存储链里打转。这一轮把尺子拿到七个没碰过的板块：
矿企转 AI 房东、无人机、铀矿、小堆开发商、机器人、半导体设备小盘、生物科技。
同一把尺子（市值天花板 / 自下而上 TAM / 资本结构与公司自己的目标）。

边界照旧：个人研究备忘，不是投资建议，永不进任何站点页面，不做 zh 荐股页，不接券商漏斗，
不改 `paper_ledger.py` 的臂。沙箱对财经站点全部 403，数字来自公开报道摘要并带日期。

---

## 一、新发现的一个结构：AI 数据中心房东——合同收入是市值的 2–4 倍

比特币矿企把电力和厂房转租给 AI 客户，这是 2025–26 年最大的一次商业模式迁移：
**13 家美股矿企签下的 AI/HPC 合同已超过 $700 亿**，房东模式的营业利润率 80–90%，
对手方是 Google、AWS、Anthropic、AMD、Microsoft 这一级。**七月一个月整个板块跌了 30% 以上**
（长端利率上行 + neocloud 抛售），这是入口也是警告。

| 标的 | 市值（日期） | 已签合同 | 模式 | 年内 |
|---|---|---|---|---|
| **Core Scientific (CORZ)** | **$57.7 亿**（9-09，$17.96，3.2134 亿股） | **AMD 15 年 530 MW ≈ $140 亿；AMD 有权在 2028 年前追加 1.9 GW 至 2.5 GW**；CoreWeave 437 MW 已开票（Q2 托管收入 $1.37 亿） | 房东 | — |
| TeraWulf (WULF) | $75.1 亿 | **Anthropic 20 年 401 MW ≈ $190 亿，可延至 $330 亿**；Fluidstack/Google 另有 $128 亿 | 房东 | +56% |
| Hut 8 (HUT) | $97 亿（9 月） | **949 MW 已签，$266 亿基础合同**；Beacon Point 1 GW 全部租出 | 房东 | — |
| Cipher (CIFR) | $67.2 亿（8 月） | $114 亿；Google 持股 5%；AWS + Fluidstack | 房东 | +53% |
| IREN | $155 亿（8 月，$42） | **Microsoft 5 年 $97 亿**（年化 $19.4 亿）；目标 2026 底 ARR $34 亿→上调至 >$40 亿 | **自持 GPU 卖云** | −2%（一个月 −33%） |
| Applied Digital (APLD) | $29.22/股 | CoreWeave 北达科他 250 MW ≈ $70 亿 | 房东 | 一个月 −36% |

### 1.1 为什么这一家有 10 倍路径，其他几家是 2–3 倍

**房东的算术**：合同价值 ÷ 年限 = 年收入；80% 利润率；减掉项目债。
- TeraWulf：$190 亿 ÷ 20 年 = $9.5 亿/年，加 Fluidstack 约 $16–20 亿/年，EBITDA $13–16 亿，
  减 $50–70 亿项目债 → 权益价值 $100–180 亿 = **1.5–2.5 倍**。10 倍要再签三个 Anthropic。
- Hut 8：$266 亿 ÷ 15 年 = $17.7 亿/年，同样算法 → **2–3 倍**。
- **Core Scientific 不同在「选择权」**：已签的 530 MW 是 $140 亿，但 **AMD 有权把它扩到
  2.5 GW**——那是 4.7 倍的容量，全部落地约 $660 亿终身合同、$44 亿/年。$57.7 亿市值
  × 10 = $577 亿，按 12 倍 EBITDA 反推需要约 $57 亿 EBITDA = **正好是 2.5 GW 满负荷的量级**。
  **它是这批里唯一一个「已签合同 + 同一对手方的巨大追加权」结构**，和 Centrus 的
  「已签 6 MTU + DOE 的 50 吨需求」同构。

### 1.2 资本结构（Eos 的教训：先查谁出钱、谁被稀释）

- 债务：**$4.6 亿 3% 可转债（2029）+ $5.5 亿 0% 可转债（2031）+ $33 亿 7.75% 高级担保票据
  （2031，2026-05 发行）≈ $43 亿**。Q2 末流动性约 $18 亿。
- AMD 首期 530 MW 按 **$1,100–1,200 万/MW** 算需 **约 $60 亿**，公司计划用**项目级债券**融资——
  **设计上不稀释股权**，但 2028 年总债务会到 $100 亿量级。
- **两段历史必须记住**：①2022 年破产重整过（矿企在下行周期的样子）；②**2025-10 股东否决了
  CoreWeave $90 亿的全股票收购**（最大活跃股东 Two Seas 反对，理由是流程、结构、估值），
  **今天 $57.7 亿低于当时的收购价**——市场在给「独立执行风险」打折。
- 董事 2026-09-03 与 09-08 两次在公开市场买入（6,000 股与 7,000 股，小额但方向明确）。

### 1.3 会杀死它的事

1. **AMD 不行使追加权**：那 10 倍就变成 2 倍。这是唯一的判定变量。
2. **2027 年 AI 资本开支消化期**：四大云厂 2026 年花掉相当于云收入 102% 的钱做资本开支，
   一旦收缩，房东的空置率和新签价格同时受压；7.75% 的票息在那时会很重。
3. **CoreWeave 集中度**：437 MW 已开票的客户是 CoreWeave，它自己也是高杠杆的 neocloud。
4. **执行**：五个站点同时建，2027 年开始交付。

---

## 二、被否的六个板块，以及各自的理由

### 无人机：两份做空报告 + 一台稀释机器
- **Ondas (ONDS)**：$43.2 亿市值、5.7145 亿股、$7.63（52 周 $4.95–15.25）。2026 收入指引上调到
  **$5.25–5.5 亿**，backlog $7.57 亿（+65% 环比）。**但 12 个月内融了三次股**：2025-09 $2.17 亿、
  2025-10 按 $11.50、**2026-01 约 $10 亿**（$16.45），**认股权若全部行权还能再融 $15 亿**。
  J Capital 有做空报告。**规则②（资本结构）不过**：普通股东的 10 倍先被认股权吃掉一截。
- **Red Cat (RCAT)**：$12.4 亿市值，Q2 收入 $2,020 万（+527%），**毛利率只有 16.1%**，
  2026 目标 $1.5–1.8 亿。赢了陆军 SRR（5,880 套/5 年），但 **Fuzzy Panda 与 Kerrisdale 两份做空
  报告分别指控合同规模小于宣称、手工组装、含中国零件**；且陆军要求 SRR 供应商可互换
  （Skydio / Anduril 随时能替）。**规则②（可验证 TAM）不过**：合同规模本身有争议。
- AeroVironment 年内 −41%（$72.4 亿），是板块里唯一有 $27 亿在手订单的，但不是 10 倍体量。
- 五角大楼 2027 财年无人系统 + 反无人机预算约 **$750 亿**是真的，但这个板块里没有一个
  同时满足「市值小 + 合同可核 + 不稀释」的名字。

### 铀矿：瓶颈在浓缩，不在矿
- NexGen $23 亿、Denison $11 亿；板块正在调整，「盈利的生产商与亏损的开发商」分化。
- **2025 年美国反应堆 26% 的浓缩服务仍买自俄罗斯**，豁免到 **2028-01-01** 全部终止。
  **这条强化的是浓缩（Centrus），不是矿商**——矿石不缺，缺的是把它浓缩到 HALEU 的产能。

### 小堆开发商：反应堆在等燃料，买燃料不买反应堆
- Oklo $75 亿（**从 2025-10-14 的 $174.14 跌到约 $43，−75%**，年内 −11%）；NuScale $36 亿
  （年内 −27%）；NANO Nuclear $10.3 亿（年内 −19.8%）。**三家都没有收入。**
- 它们的第一台机组都要 HALEU，而 HALEU 的产能在 Centrus 手里。**同一个论点，燃料端有合同
  和现金，反应堆端只有许可证进度。**

### 机器人：没有 10 倍结构
- Serve Robotics 与 Richtech 各约 $6.4 亿市值；Symbotic 有 **$225 亿 backlog**、单季收入
  $7.21 亿（+22%），但市值已经不是小票。没有一个满足「市值小 + 合同可核」。

### 半导体设备小盘：涨完了
- Ultra Clean **+328%**、Kulicke & Soffa **+170.6%**、Amkor +68.7%（年内）。Veeco 与 Axcelis 合并
  2026 下半年完成。**又一次是「到场时已经涨完」。**

### 生物科技：唯一系统性产 10 倍的板块，但要用篮子
- NBI 年内 +20% 以上（7 月）；**FDA 2026-02 把默认审批标准从两个关键试验改为一个**——
  这是真实的制度红利，直接降低小公司的成本与时间。
- Fate Therapeutics 年内 +203.9%，市值 $1.49 亿——这就是生物科技 10 倍的长相：小、二元、事件驱动。
- **但单票需要读临床数据，超出本会话的能力边界。我不装。** 要吃这块红利，用篮子
  （XBI 这类等权生物科技 ETF），不选单票。这是本轮唯一的「非个股」建议。

---

## 三、Centrus 两日复核

**2026-09-09：Centrus 与 Radiant Industries 签多年期美国产铀供应合同。** Radiant 的 Kaleidos
微堆要 HALEU。**与论点一致，无反向新闻。** ASPI 无新增。

---

## 四、决策卡 v2（替换 09-09 那版的第一节与仓位表）

**能给 10 倍的从两个变成三个：**

| # | 标的 | 市值 | 10 倍需要什么 | 判断 |
|---|---|---|---|---|
| 1 | **Centrus (LEU)** | $33.6 亿 | 产量 900 公斤 → 万公斤级 | 2–4 倍大概率，10 倍小概率 |
| 2 | **Core Scientific (CORZ)** | **$57.7 亿** | **AMD 行使 1.9 GW 追加权且项目债不转股权** | 2 倍大概率，10 倍需要 AMD 全额行权 |
| 3 | **ASP Isotopes (ASPI)** | $5.38 亿 | 兑现「2031 年 EBITDA > $3 亿」 | 大概率腰斩或归零，小概率 10 倍+ |

**卫星仓分配 v2（合计 100%）：**

| 标的 | 占卫星仓 | 变化 | 备注 |
|---|---|---|---|
| Centrus (LEU) | **40%** | 45→40 | 主仓，分三批 |
| **Core Scientific (CORZ)** | **20%** | 新增 | **这是卫星仓里唯一的 AI 资本开支敞口**，替掉了一部分 SIMO |
| Arteris (AIP) | 15% | 20→15 | 3–4 倍压舱石 |
| ASP Isotopes (ASPI) | 10% | 不变 | 按全损配 |
| Silicon Motion (SIMO) | 10% | 15→10 | 存储链下半场 |
| 现金 | 5% | 10→5 | 判定线触发才动 |

LEU + ASPI 仍是同一个 HALEU 论点，合计 50%，低于 55% 上限。核心仓 80–90% 宽基不变。
**如果只买一个仍然是 LEU**：它的追加权（DOE 需求）不由单一商业对手方决定，而 CORZ 的
追加权在 AMD 一家手里。

---

## 五、判定线新增

| 日期 | 判定 | 判负则 |
|---|---|---|
| **2027 年内** | CORZ 首批 AMD 站点是否按 2027 交付；项目债是否如计划发出且不含转股条款 | 延期或改为股权融资 → 降级到 2 倍候选，仓位减半 |
| **2028-12-31** | **AMD 是否行使追加权（任何一部分）** | 未行使 → 10 倍论点作废，按房东估值持有或清仓 |
| **2027 年内** | 四大云厂 2027 资本开支是否如预测继续增长（Goldman $1.01 万亿 / UBS $1.447 万亿） | 转为收缩 → 整个房东板块降级 |

---

## 六、数据可信度

- 沙箱对财经站点 403，**没有一个数字来自一手财报 PDF**。
- **本轮新增冲突**：Hut 8 市值 $97 亿（9 月）vs $104.8 亿（8-26）；Cipher $67.2 亿（8 月）vs
  $90.5 亿（7-31）；IREN 市值与年内涨跌幅来自 8 月不同日期；Applied Digital 只拿到股价没拿到市值。
- Hut 8 那份「$98 亿 352 MW 租约」的租户在报道里被写成 Nvidia，**未核到原始公告，不当事实用**。
- Core Scientific 的 2024 年两笔可转债是否已部分转股**未核到**，$43 亿是按面值合计的上限。
- CORZ 与 AMD 追加权的具体行权条件（价格、时点、违约条款）**未核到原文**，只知道「2028 年前、
  最多 1.9 GW」。这是 10 倍论点的核心变量，**下单前要读 8-K 原文**。

---

## 七、来源

矿企转 AI：[矿企 AI 合同超 $700 亿](https://www.kucoin.com/news/flash/bitcoin-miners-shift-to-ai-sign-over-70-billion-in-contracts) ·
[板块一个月跌 30%+](https://247wallst.com/investing/2026/07/29/iren-terawulf-and-applied-digital-are-all-down-30-in-a-month-is-more-pain-coming-for-data-center-stocks/) ·
[房东 vs 自持 GPU 的模式差异](https://247wallst.com/investing/2026/09/11/bitcoin-miners-are-turning-into-ai-landlords-these-3-stocks-are-riding-the-pivot/)

Core Scientific：[AMD 2.5 GW 协议 8-K](https://www.stocktitan.net/sec-filings/CORZ/8-k-core-scientific-inc-tx-reports-material-event-d48e9f43cce5.html) ·
[Q2 2026 财报与 $60 亿项目债计划](https://investors.corescientific.com/news-events/press-releases/detail/139/core-scientific-announces-second-quarter-2026-results) ·
[$33 亿 7.75% 高级担保票据](https://www.nasdaq.com/press-release/core-scientific-announces-pricing-33-billion-senior-secured-notes-2026-04-23) ·
[股东否决 CoreWeave $90 亿收购](https://www.cnbc.com/2025/10/30/core-scientific-shareholders-reject-9-billion-coreweave-offer-deal-terminated.html) ·
[Q2 2026 10-Q](https://www.sec.gov/Archives/edgar/data/0001839341/000183934126000014/core-20260630.htm)

其他房东：[TeraWulf Anthropic $190 亿租约](https://investors.terawulf.com/news-events/press-releases/detail/142/terawulf-announces-anthropic-lease-at-justified-data-campus-and-sale-of-majority-interest-in-abernathy-joint-venture-to-fluidstack) ·
[Hut 8 $266 亿合同](https://www.prnewswire.com/news-releases/hut-8-fully-commercializes-1-gw-beacon-point-ai-data-center-campus-with-second-352-mw-it-lease-bringing-campus-level-base-term-contract-value-to-19-6-billion-302829514.html) ·
[Cipher $114 亿合同](https://www.investing.com/news/company-news/cipher-mining-q1-2026-slides-114b-contracted-revenue-hpc-shift-93CH-4659528) ·
[IREN Microsoft $97 亿](https://finance.yahoo.com/technology/ai/articles/iren-iren-12-3-microsoft-151245335.html)

无人机：[Ondas $10 亿增发](https://ir.ondas.com/press-releases/detail/271/ondas-holdings-inc-successfully-prices-1-billion-stock) ·
[Ondas Q2 2026](https://ir.ondas.com/press-releases/detail/326/ondas-posts-record-q2-2026-revenue-of-83-8-million-on) ·
[Red Cat Q2 2026](https://ir.redcatholdings.com/news-events/press-releases/detail/237/red-cat-reports-q2-2026-revenue-growth-of-527-yy-q2-gross-margins-increase-39-vs-q2-2025-gross-margins-increased-27-sequentially-from-q1-2026) ·
[Fuzzy Panda 做空报告](https://fuzzypandaresearch.com/rcat-army-contract-smaller-than-claimed/) ·
[AVAV 年内 −41%](https://finance.yahoo.com/markets/stocks/articles/drone-stocks-down-defense-backlogs-115500190.html)

铀与小堆：[俄罗斯浓缩仍占美国 26%](https://www.bloomberg.com/news/articles/2026-07-30/kremlin-still-key-for-us-atomic-power-despite-looming-import-ban) ·
[Oklo $43 vs 高点 $174](https://www.fool.com/investing/2026/09/09/oklo-trades-at-x-wall-streets-average-target-is-x/) ·
[NNE 市值](https://stockanalysis.com/stocks/nne/)

其他板块：[UCTT +328% / KLIC +170.6%](https://finance.yahoo.com/markets/stocks/articles/zacks-industry-outlook-highlights-kulicke-131500742.html) ·
[FDA 单一关键试验 + 生物科技板块](https://www.smallcapscanner.com/blog/best-small-cap-biotech-stocks-2026) ·
[Symbotic backlog](https://finance.yahoo.com/markets/stocks/articles/serve-robotics-surges-13-ouster-153512086.html)

Centrus 复核：[Centrus 新闻页（09-09 Radiant 合同）](https://www.centrusenergy.com/news/)
