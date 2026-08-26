# 高费率品类扩展批次(2026-08-26,owner:「Games还有其他高单价也扩展一批,可以用子域名或其他方法,打差异化价值或工具吸引流量」)

原则(不放松):子域铁律三条全满足才开新面;每候选先过三门;**探针先行**——rising
需求数据到手、楔子查过 KGR,才动一行站点代码。本文档 = 批次矩阵 + 探针接线记录。

## 一、候选矩阵(费率来源:DE=ABAKUS 06/2025 全表贴;US=Lasso/azonpress 等 2025-26 表,均 B 级交叉)

| 候选 | 市场·费率 | 客单 → €/$每单 | 差异化楔子(舰队已验证模式) | 载体判定 | 探针 |
|---|---|---|---|---|---|
| **① 家具/床垫信任核查** | US **8%**(Furniture & Home Décor) | $300-1.500 → **$24-120** | 消保楔子(tds 打法,但无 SafeSearch 惩罚!):dropship 骗局核查、「is X legit」厂商核查、**床垫玻纤(fiberglass)争议**核查——投诉量巨大、无垂直证据站 | 受众与现有站完全不同 → 过子域铁律②③;①静态+数据 ✓。**探针过线后再定域名**(agiscorecard 子域品牌不搭,倾向独立便宜域,owner 决定) | ✅ 本轮接入(US) |
| **② 手表商核查** | DE **6,5%** | €100-500 → €7-33 | 同款消保楔子:灰市/仿表识别、「chrono24/jomashop seriös?」商家核查(Chrono24 等权威做交易不做打假) | 同上,探针先行 | ✅ 本轮接入(DE) |
| **③ 高端美妆真伪** | US **10%**(Luxury Beauty) | $40-150 → $4-15 | 假货/灰市鉴别楔子;费率最高但客单中等、YMYL 强监管 | 探针先行,优先级低于①② | ✅ 本轮接入(US) |
| ④ Amazon Games | DE/US **20%** | ~€40,多 F2P → ≤€8 | **20% 只覆盖亚马逊自研发行目录(为 New World 设立,十几个 SKU)**——撑不起任何独立面 | **只做挂件**:gamesledger 遇自研 titles 热度时顺手带一页/一卡,零新建 | 无需(gamesledger 自有游戏趋势管线) |
| ⑤ Fashion 8% / Schmuck 5,5% / Handmade·Digital Music 10% | — | — | 无楔子无信任面无工具角度 | **不做**(记录在案防再议) | — |

**排序逻辑**:①(8%×最高客单×楔子最强×投诉富矿)> ②(费率次之,楔子同构)> ③
(10% 但客单中等+监管重)。全部沿用舰队唯一被反复验证的差异化:**证据标准的消费者
保护 + 可自查工具 + AI 可引用的判定页**——这也是 owner 要的「工具吸引流量」的形状:
核查工具 qualify 高意图买家 → 联盟出口。

## 二、探针接线(本轮已上线,fleet_trends_rising.py 新增 probe 池)

- `probe-us`(geo US)seeds:`mattress fiberglass` · `furniture scam` · `counterfeit makeup`
- `probe-de`(geo DE)seeds:`uhr fälschung erkennen` · `chrono24 seriös`
- 输出 `data/probes-rising.json`(repo 根,不属于任何站点,不发布);全池 11→16 seeds,
  仍 2/run(礼貌配额不变),全轮 ~8 天。**判定线(2026-09-10 首读)**:某探针 rising
  v≥1.000 或连续两轮出现购买/求证意图变体 → 该候选进 KGR;全静默 → 候选降级,矩阵留档。

## 三、明确不做与边界

- 不为 20% 的名头给 Amazon Games 建任何独立面(目录太窄,数学不成立)。
- 探针过线前:不买域名、不建页、不改任何站点导航——「先研究清楚再下结论」从此机器化。
- 一旦某候选过线开建:走三门薄 PRD、判定线预登记、并入 tds 同款合规纪律(全部消保楔子
  都要「更正通道 + 具名来源 + unverified 如实标注」)。


---

## 四、载体更正(2026-08-26,owner 原话:「eco站点啊,它有域名,我不是让你挂agi」)

**全批次载体 = getecoback.com(板块或其子域),不用 agi 伞域。** 这个更正让匹配度更好
而不是更差:eco 的已验证差异化就是「家居产品的诚实核查」(EpiCooler Faktencheck、
Testsieger 打假 FAQ、「wie wir empfehlen」方法公开)——消保楔子是它的品牌延伸,且
DE 侧直接用已确认计佣的 getecoback-21。据此重排:

| 排序 | 候选 | 载体 | 状态 |
|---|---|---|---|
| **①** | **Matratzen(DE Möbel 5%,€12-30/单)** | eco 主站,睡眠簇+潮湿簇交点(matratze fiberglas 议题在德语区同样存在) | `matratze` 种子已在 eco DE 管线;probe-de 本轮增意图变体 |
| **②** | **Möbel-Online-Shop-Check(DE 5%)** | eco 主站新板块(Faktencheck DNA 直接复用:dropship 骗局/货不对板核查) | probe-de 本轮接入 |
| ③ | US Furniture 8%($24-120/单) | 远期:eco 的 /en/ 簇(**前提**:EN 区现约定「一贯 amazon.de」,US 内容需按页切 ecoback0d-20——载体成立但契约要先改,探针过线后出薄 PRD 再动) | probe-us 保留 |
| ↓ | 手表商核查(DE 6,5%) | **降级搁置**:EcoBack 家居/能源品牌装不下手表打假——载体既然定为 eco,品牌不搭就不硬塞(记录在案,除非另立独立域再议) | probe-de 撤出 uhren 种子 |
| — | 美妆真伪(US 10%) | 同品牌不搭理由观察;probe-us 数据留作参考 | 保留探针不建面 |

探针判定线不变(09-10 首读,v≥1.000 或连续两轮意图变体 → KGR → 薄 PRD)。
