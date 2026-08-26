# Amazon 品类策略备忘录(2026-08-25,owner:「调研佣金率、成交概率、转化率,定方向与成交品类,再做网站」)

## 一、数据与来源分级(零编造纪律:每个数字标来源)

**A 级 = 自家实测(PartnerNet 截图 07-26→08-24 + D1)**
- 点击→成交转化:**4,20%**(119 点击 → 5 单);混合佣金率 **4,11%**(€9,96/€242,22)。
- 单笔可核订单:€13,44 商品 → €0,67 佣金 = **4,98%**(低价耐用品档,与 Küche/Haushalt 类费率吻合)。
- 平均下单额 ~€92/单(€463,14/5)。0 退货。
- 点击行为:**具体型号链接显著跑赢泛搜索链接**(De'Longhi PAC EX105 全站被点最多;italy 页 10pv→12 点击)。
- 已验证的转化规律(08-17 对抗审查幸存):**退货作废合格销售 → 低价耐用品在首销期胜过高考虑周期家电**。

**B 级 = live 检索(2026-08-25,egress 只放行搜索摘要,原文待 owner 后台 Rate Plan 核对)**
- 2025-06-23 起:**Baumarkt、Küche & Esszimmer、Elektro-/Handwerkzeuge = 直接合格销售 6%**(间接销售更低)。来源:ABAKUS 论坛 / affiliate-deals.de 摘要。
- 电子类(Computer/Elektronik/Foto)历史 ~3%;家具/家装 2020 年降至 3%。上限档 12%(时尚/奢侈等,与本站无关)。

**C 级 = 训练知识,待核**:大家电/Haushaltsgeräte 常见 3–5%;具体以 Rate Plan 为准。
**Owner 一键升级整表**:后台顶栏 Rate Plan 截图一张,C 级全部转实。

## 二、品类决策矩阵(费率 × 客单 × 需求 × 退货险 × 站内承接)

| 方向 | 费率(来源级) | 客单/佣金每单 | 需求信号(自家 rising,08-25) | 退货险 | 站内承接 | 判定 |
|---|---|---|---|---|---|---|
| **①秋冬除湿簇**(Entfeuchter+配件) | ~5%(A 实测) | 设备 €150-250→€8-12;配件 €10-30→保单量 | **luftentfeuchter bei hitze 164.700 · keller testsieger 48.850 · pro breeze 20l 38.750 · wandmontage 29.000** | 低(已验证 0 退货) | 全簇 15+ 页,今日新增 schimmel 入口 | **主攻** |
| **②取暖簇**(Infrarot/Heizlüfter) | 6% 直接(B) | €50-150→€3-9 | **schmidbauer 62.950 · garage 44.050** | 低-中 | ratgeber+watt-rechner+heizung-qm 系列;**garage 页缺口** | **第二主攻,明日快反** |
| ③储能/Balkonspeicher | ~3%(C 待核) | €800-1.500→**€24-45/单** | 中(Anker Solarbank 已有 2 真实点击) | 高(高考虑周期) | 页面齐全 | **博单腿,不主攻** |
| ④窗封/密封件 | 6%(B) | €15-30→€1-2 | 季节尾声 | 极低 | 已饱和覆盖 | 维持 |
| ⑤电子小件/AC 主机 | 3%/淡季 | — | AC 需求秋季断崖 | 中 | — | 不投 |

**方向结论:秋冬「除湿+取暖」双主攻,杠铃结构 = 低价耐用品保单量(6%/低退货)+ 设备中客单博佣金;储能只做既有页维护,等 Rate Plan 核实 3% 后再决定是否加注。**

## 三、今日已落地(做网站部分)

1. `luftentfeuchter-ratgeber` 与 `luftentfeuchter-gegen-schimmel` 两个设备枢纽页**此前零购买面**——补 CONTEXT_MODELS 三面,含 **Pro Breeze 20L「Meistgesucht diese Woche」**具体型号 chip(依据 = 自家 trends-rising 一手数据,文案明示「需求信号,非测评结论,未自测」)。
2. 快反队列(每日 1 页,防翻炒):~~明日 = `infrarotheizung-garage`~~ **✅ 08-26 已上线**(三目标判定页:工位点热/防冻/整库,CONTEXT_MODELS 三 chip 即三答案,判定线并入 09-2x 取暖簇窗口:28d affiliate_click ≥1 或进 pv TOP20);下一位 = `luftentfeuchter-wandmontage`(v=29.000,先查重 vs 既有 qm 系列)。schmidbauer(62.950)是品牌词,先核 SERP 构成再定。
3. 判定线(28d,09-22):两个补面页合计 affiliate_click ≥3 → 补面有效;Pro Breeze chip 的点击占比 > 泛搜索链接 → 「具体型号+需求标注」模式推广到取暖簇。

## 四、明确不做

- 不为佣金改判定/排序(费率只决定**投入顺序**,不决定推荐结论);
- 不引用任何未核实费率做页面文案;
- 不在淡季投 AC 新面;不做时尚/奢侈高费率品类(与站定位无关 = 零信任转化)。


---

# v2 全品类补研(2026-08-26,owner 批评:「没有把所有亚马逊高价值品类研究清楚就下结论」——成立,本节修正)

## 一、Amazon.de 费率全表(2025-06-23 调整后;B 级=多源检索交叉,来源:ABAKUS 论坛全表贴、
## selbstaendig-im-netz、AAWP 指南;官方 Vergütungskatalog 沙箱不可达,owner 的 Rate Plan 截图仍是 A 级升级路径)

| 类目 | 费率 | 典型客单 | **€/单** | eco 信任面+工具可达 |
|---|---|---|---|---|
| Amazon Games | 20% | 数字低价 | 低 | ✗ |
| Amazon Fashion/Accessoires | 8% | €40-80 | €3-6 | ✗ |
| **Uhren** | **6,5%** | €100-500 | €7-33 | ✗(零信任面,不做) |
| Beauty/Kosmetik & Körperpflege | 6% | €20-50 | €1-3 | ✗ |
| **Haushalt · Küche & Esszimmer** | **6%** | €50-1.200 | **€3-72** | ✅ **本站主场** |
| Baumarkt · Elektro-/Handwerkzeug | 6%(直接) | €30-300 | €2-18 | ✅ 相邻 |
| Schmuck | 5,5% | €50-200 | €3-11 | ✗ |
| **Möbel(床垫在此带)** | **5%** | €200-800 | **€10-40** | ◐ 睡眠簇可达 |
| Sport & Freizeit | 4%(自 7% 降) | €30-150 | €1-6 | ✗ |
| Terrasse/Rasen/**Garten** | **3%** | €50-800 | €1,5-24 | ◐ 可达但费率差 |
| Elektronik/Computer | ~3% | 高 | 中 | ✗ |
| **Elektro-Großgeräte(大家电)** | **2,5%** | €400-1.000 | €10-25 | ◐ 费率洼地+退货险 |
| Spielkonsolen | 1% | — | — | ✗ |

## 二、被数据修正的结论(v1 哪里错了)

1. **v1 没研究的两个方向,费率数据直接判死**:割草机器人(Garten 3%)、热泵干衣机/大家电
   (2,5%——全表最低带之一,还叠加高退货险)。v1 的「储能博单腿」也要下调:储能若归
   Elektronik/大电带(~2,5-3%),€1.000×2,5%=€25/单,不如想象中肥。
2. **v1 漏掉的真钻石在自家 6% 带里**:Haushalt/Küche 类目覆盖高客单小家电——
   **Kaffeevollautomat €300-1.200 → €18-72/单**(全表 eco 可达区的最高单值!)、
   **Akku-Staubsauger €200-600 → €12-36/单**、高端空净/除湿 €200-400 → €12-24/单。
   费率与我们的低价耐用品相同,客单 10-30 倍,退货低于大家电。
3. **Möbel 5% 的床垫是唯一值得开的「半新」方向**:€12-30/单,且 eco 已有睡眠簇
   (bei-hitze-schlafen 等)——「Matratze schwitzen/zu warm」是簇的自然延伸,非跳 niche。

## 三、落地(owner 模型:高价值品 → 工具导流 qualify → 联盟;GEO 判定页吃引用喂工具)

- **需求验证自动化(本轮已上线)**:eco rising SEEDS 扩容 +3——`kaffeevollautomat`、
  `akku staubsauger`、`matratze`(9 seeds,2/日轮换,~4,5 天全覆盖)。**先让 rising 数据
  证明需求,再按快反规则建页**——这就是「研究清楚再下结论」的机器化版本。
- **工具导流设计(按 rising 结果排产,过 KGR/三门才建)**:
  ① Kaffeevollautomat-Kosten-Rechner(每杯真实成本 vs Kapsel vs Siebträger,电费+豆价
    全公式可复算——eco 计算器 DNA 的直接复用)→ 型号卡(公开测评口径);
  ② Akku-Staubsauger:接现有 Stromkosten 面 + 「Watt ≠ Saugkraft」判定页;
  ③ Matratze:睡眠簇入口(bei-hitze-schlafen 已有流量史)→「zu warm schlafen」判定页。
- **GEO 放大**:每个新品类先出**判定型问题页**(答案胶囊+表格+FAQ/LD,吃 AI 引用)再挂
  工具——bpj/agi 已验证「内容吃引用、工具吃点击」分工。
- 判定纪律不变:每方向首页 28d affiliate_click ≥3 或进 pv TOP10 才续做;KGR 过门才建页;
  1 页/日;零编造(咖啡机每杯成本只用页内公式+明示假设,不引不可核的外部均价)。
