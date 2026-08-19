# 德国 Raumklima 用户需求地图（2026-08-07，customer-research 技能 Mode 1+2）

> 方法：Mode 1 = 自有 D1 行为数据（唯一一手数据，n 小但真实）；Mode 2 = 数字水源地
> （gutefrage.net / rund-ums-baby / urbia / eBay 评论区 / 法律媒体，经 WebSearch 提取）。
> Reddit 与 gutefrage 直连均被本环境 egress 阻断，原话经 WebSearch 摘要转述，
> 置信度按技能规范降半档处理。

## Mode 1：自有行为数据说了什么（28 天，n=59 pv）

| 信号 | 数据 | 解读 |
|---|---|---|
| 到达页构成 | split-ohne-kernbohrung(4)、abluftschlauch(4)、zu-laut(3)、tropft(3)、kippfenster(3)、ventilator-mit-eis(3) | **读者带着"约束"来，不是带着"品类"来**：不能钻孔、软管不够长、太吵、漏水、窗户不配合 |
| 流量源 | Bing 8、DDG 7、chatgpt.com 4、Ecosia/Brave/Startpage/Yahoo 各 1-2，**Google 0** | 与既有诊断一致：Bing 家族 + AI 助手是现实渠道 |
| 工具事件 | **btu_calc ×2（首次非零！）**、heat_now ×13、affiliate_click ×5 | 首页计算器开始被用；热浪条正常工作 |
| 点击页 | EN heatwave(2)、homeoffice(1)、kippfenster(1)、split-ohne-kernbohrung(1) | split 页有购买意图，但内容最薄（896 词、无 FAQ） |

## Mode 2：主题排名（频次 × 强度）

### 主题 1：夜里太吵，没法睡 — 频次高，强度高，置信度中高
- 原话（eBay 评论区，转述）："beim Kühlen etwa so laut wie eine **Dunstabzugshaube auf höchster Stufe**"；"sehr laut, kühlt bei 30 Grad kaum"
- 应对模式（gutefrage）：**Timer + 睡前预冷**（"eine Stunde vor dem Schlafengehen auf 21 Grad kühlen"）、放隔壁房间、吊扇替代
- **本站现状：已接住**。`zu-laut` 1861 词、dB×16、Timer×7、Silent picks 在 roster。不重复建设。

### 主题 2："bringt nichts" 失望 — 频次高，强度高，置信度中高
- 原话（gutefrage）："mobile Klimaanlage **kühlt den Raum nicht**"、"kühlt kaum"、">20 m² kommt sie nicht hinterher"、Abluftschlauch 产生 **Unterdruck** 把热空气抽回来
- 失望的头号成因与本站既有诊断一致：**窗户没封严**——负压把热风原路吸回。
- **本站现状：诊断页已有**（kuehlt-nicht/kippfenster/sealfit）。**缺口：购买时刻没人提醒**——型号卡只说"买哪台"，不说"不封窗等于白买"。→ 落地：models_block 副标题加一句诚实警示（全站注入器，一句话，不加新箱子）。

### 主题 3：租客/房东合法性 + 2026-07-17 BGH 新判决 — 频次中，价值极高，置信度高（法律媒体多源一致）
- **BGH V ZR 162/25（2026-07-17）**：WEG 业主原则上可依 **§ 20 Abs. 3 WEG 要求准许**安装分体机（含穿墙），邻居"抽象的噪音担忧"不足以否决；仍需业主大会决议。
- 租客侧规则不变：Monoblock 无需许可；固定 Split 需房东书面同意。**但**房东若自己是 WEG 业主，"业主会永远不批"这个拒绝理由自 07-17 起明显失效。
- **本站现状：完全缺失**。`mietwohnung` 页（1380 词，法律结构完整）**零 BGH 提及**；流量第 3 的 `split-ohne-kernbohrung`（其受众正是被这条法律卡住的人）**零法律内容且无 FAQ**。→ 本轮主落地。

### 主题 4：Dachgeschoss + 婴儿房高温 — 频次中，强度最高（情绪），置信度中
- 原话（rund-ums-baby / urbia）：夜里儿童房 **35 °C**、顶楼孕妇担心 "**bis 41 Grad**" 如何带新生儿
- **本站现状：已接住**。`kinderzimmer-kuehlen` 2111 词（过热风险/安全睡温/预冷后关机流程）、`dachgeschoss-kuehlen` 在售前列。不重复建设。

### 主题 5：电费焦虑 — 频次中，强度中，置信度高
- 公开口径：约 **109 €/年**（35 ct/kWh × 350 h）≈ 购机价的三分之一/年；Monoblock 210–700 kWh vs Split 135–293 kWh
- **本站现状：已接住**（stromkosten 簇 + 3 个计算器 + heatenergy 盒全站直达）。不动。

## 结论 → 本轮落地清单（只改"需求在、站点没接住"的）

1. `klimaanlage-mietwohnung.html`：新增 BGH 判决章（判决号/日期/含义/边界）+2 FAQ 同步 schema + 新鲜度。
2. `split-klimaanlage-ohne-kernbohrung.html`（流量第3、896词、无FAQ）：新增"法律"章 + BGH 盒 + 首个 FAQ 节（3 问，FAQPage schema）+ 互链 mietwohnung/zu-laut + 新鲜度。
3. `models_block` 副标题追加一句全站诚实警示：不封窗 = Monoblock 大打折扣（主题 2 的头号失望成因，放在购买时刻）。
4. 明确不做：不新建 Mieter/Baby 页（两页均已存在=蚕食拦截）；不动 zu-laut/kinderzimmer/stromkosten（已接住）。

来源：gutefrage.net（多线程）、rund-ums-baby.de、urbia.de、zdfheute.de、handelsblatt.com、
hausverwaltunggeo.de、mietrechtsiegen.de、verivox.de、stimme.de、eBay 评论区。
