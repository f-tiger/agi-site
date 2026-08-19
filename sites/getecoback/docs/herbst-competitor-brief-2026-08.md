# 秋冬转轨：竞对差距 + KGR 判定简报（2026-08-17）

> 背景：95.5% 的 AI 引用面在制冷页上（08-17 对抗式调研），Herbst 还有 ~15 天（trend-radar
> 08-17），供暖季 10-01 开始。本简报 = 一轮真实需求调研 + 德语 SERP 竞对判定的落盘，
> 供每日 Routine 直接取用。所有 SERP 构成均为 2026-08-17 WebSearch 实测。

## 一、需求洞察（带证据）

1. **秋季需求已按日历启动，入口是「结露/湿度」不是「供暖」。**
   一手证据：D1 里 `fenster-beschlagen-innen` 是第一个秋季起量页（08-14 单日 3 次浏览，
   领先 Herbst 4 周）；Bing AI 引用表里 `richtig-lueften` 19 次引用。德国秋季的第一个
   居住痛点是「窗户内侧结露→怕霉」（frag-mutti/社区内容在 SERP 首位 = 大量真人在问），
   霉菌影响 10–20% 德国家庭（08-17 调研）。→ 秋冬簇的扩张应从湿度/结露侧入手，
   供暖侧头部词全是红海（见下）。

2. **「成本可复算」仍是本站独有的可赢角度。**
   `ventilator-stromverbrauch`（已产生真实点击）与 `heizdecke-stromverbrauch`（08-15）
   验证过的模式：设备 × 成本长尾的 SERP 由小垂直站/厂商博客构成，无一家给出可复现的
   透明算法。本站的公式已开源（wie-wir-empfehlen#nachrechnen）+ 每日 parity 测试 =
   竞对结构上抄不了的信任层。且 Bing Grounding Queries 证明「设备+成本/维护动作」
   正是本站拿高引用份额的形状（leenon 9l reinigen = 52.38% 份额）。

3. **冬季头部品类里，本站零覆盖的只剩 Luftbefeuchter——且长尾可打。**
   08-15 调研：Luftbefeuchter 是 amazon.de 冬季走量品类（Levoit/Homvana），head 词
   红海（StiWa/MediaMarkt），当时把「Luftfeuchte zu niedrig Heizung」记入队列待判定。
   本日判定：成本长尾 SERP = Kaufland/EcoFlow/galuft/Jackery/raumklimatest/stromguide
   （零权威评测媒体）→ **通过**，已落地（见三）。

## 二、竞对差距表（秋冬意图 × 谁占着 × 本站怎么打）

| 秋冬意图 | SERP 实测构成（2026-08-17） | 判定 | 本站动作 |
|---|---|---|---|
| Fenster beschlagen von innen | frag-mutti、wohnglueck、myhomebook、RPR1 电台、heizung.de（唯一权威）、letwork、stolma 窗商 | 可打 | 已有页且是秋季 riser；已有答案胶囊+诊断表+Taupunkt 数字，状态良好，本轮不动（防 churn） |
| trockene Heizungsluft（head） | dein-heizungsbauer、AOK、heizsparer、Vaillant、Getifix、isla | 边界偏毙（企业+健康权威） | 不做 head；用成本长尾切入（已落地） |
| Luftbefeuchter Stromverbrauch | Kaufland、EcoFlow、galuft ×2、Jackery、raumklimatest、stromguide | **通过** | ✅ 本轮新页 |
| Heizlüfter oder Heizdecke | Business Insider、euronics、verivox、t-online、ihre-vorsorge、testundtipps（引 StiWa 数字） | **毙**（大媒体红海） | heizdecke 页 FAQ 已覆盖该对比，不新建 |
| Infrarotheizung Schlafzimmer | **Stiftung Warentest 本尊**、Finanztip 论坛、energieheld、heatness/knebel 厂商 | **毙**（StiWa 在首屏） | 与 07-16 毙掉的 infrarotheizung-bad/heizlüfter-vs-infrarot 同判 |
| Schimmel hinter Schrank/Außenwand | blowerdoormr、energie-fachberater ×2、aufundzu.ch、sanier、LEA、holzwerken、schimmel-schimmelpilz | **通过**（零权威媒体） | 种子 ①（见三） |
| Taupunkt Fenster berechnen | philognosie、greenox、oknoplast/reform-fenster/brune 窗商与除湿厂商、sanier | 可打，但与 fenster-beschlagen 同意图 | 蚕食规则：不新建；该页已含 Taupunkt 章与 Taupunkt-Check 工具链 |
| condensation inside windows（EN） | everest 窗商、Screwfix、idealhome、indoorhumidity 利基站、两个 .gov.uk 市政 | 边界偏可打（无 Which?） | 种子 ②（EN 区秋冬只有 1 页而 EN 是全站点击主力） |

**结构优势怎么用**（竞对没有而本站有）：
- **公式开源 + parity 测试**：每个秋冬成本页首屏给可复算数字（0,30 €/kWh 明示假设 +
  Typenschild 指引），这是 Kaufland/厂商博客做不到的信任姿态；
- **计算器/MCP 双面**：Stromkosten-Rechner 与 MCP 工具可直接承接秋冬成本意图（AI 代理
  调用即引用）；Magnus/Taupunkt 公式同时服务 beschlagen（凝结）与 Luftbefeuchter（干燥）
  两个方向——一份物理，两簇内容；
- **双语对**：秋冬簇 EN 侧几乎空白（唯一 dehumidifier-drying-clothes-cost），而 EN 区
  是全站转化最强区（italy 页 7pv→12 击）。

## 三、本轮刷新（已落地）与依据

**新页 `guide/luftbefeuchter-stromverbrauch.html`**（1119 词，sitemap 149→150）。
依据链：08-15 队列登记项 → 本日 SERP 判定通过（上表）→ 蚕食检查（全站仅
kinderzimmer-kuehlen 顺带提及一次 Luftbefeuchter，零页覆盖）→ 已验证的成本页模式第三次
复用。差异化：① 三种 Bauart 成本表全部由 Watt ÷ 1000 × h × 0,30 € 可复算（Verdunster
1–5 ct/夜 vs Verdampfer 48–84 ct/夜 = Faktor 10–40，没有竞对给这个结构化对比）；
② 用 Magnus 公式解释冬季干燥机制（0 °C/80 % 外气 → 21 °C 室内 ≈ 20 % 相对湿度，
与站内开源公式同源）；③ 诚实闸门「先测量」：40–60 % 区间明说不需要设备，>60 % 反向
链去 fenster-beschlagen（防止把除湿受众卖成加湿设备）。商品层 = CONTEXT_MODELS 三卡
（Hygrometer 优先 / Verdunster / Ultraschall mit Hygrostat 品类卡，无公开测评共识故不
具名型号，仅 Hygrometer 引用页内已给出的 ab 10 €）。路由：device_of → dehum 且
quickpick 关键词拦截（干燥受众永不见除湿路由器）；cat_of → luftqualitaet。
入链 3 条：fenster-beschlagen-innen（反向问题语境句）、waesche-trocknen-wohnung
（冬季反转语境句）、heizdecke-stromverbrauch（related）。

## 四、给每日 Routine 的 3 个已判定种子（按优先级）

1. **`schimmel-hinter-schrank-aussenwand`（新页，DE）** — SERP=blowerdoormr/
   energie-fachberater/利基站，零权威媒体（上表）。蚕食检查已做：全站 5 处顺带提及、
   零页回答「柜后霉/离墙距离」意图。角度：Taupunkt 机制（柜后死角墙面低于露点）+
   离墙距离的实操规则 + 湿度测量优先；商品 = Hygrometer/Thermo-Hygrometer +
   Comfee MDDF-20DEN7（站内背书）。与 luftentfeuchter-gegen-schimmel、
   fenster-beschlagen 互链成秋季霉簇。霉菌 10–20% 德国家庭 = 供暖季边界的真需求。

2. **`en/guide/condensation-inside-windows`（EN 镜像，↔ fenster-beschlagen-innen
   hreflang）** — SERP=窗商/零售商/市政/利基站，无 Which?（上表）。EN 区秋冬结构性
   空白 + EN 区是转化主力。写法照德语页：3-Ursachen-Check + dew-point 数字 +
   dehumidifier（amazon.de 惯例）。发布时给德语页回填 hreflang。

3. **`luftentfeuchter-schlafzimmer` 类长尾 —— 仅在先过 SERP 判定后做**（尚未判定，
   不要跳过判定直接写）。备选表述：「Luftentfeuchter Schlafzimmer nachts leise」。
   若 SERP 现权威评测媒体 → 弃，改为深化 luftentfeuchter-ratgeber 的卧室章节。
   注意与 luftentfeuchter-XX-qm 系列的蚕食边界（意图=卧室噪音/夜间，非尺寸）。

**反面记录（别再调研）**：Heizlüfter oder Heizdecke（BI/t-online/verivox 红海）、
Infrarotheizung Schlafzimmer（StiWa 本尊）、trockene Heizungsluft head（AOK/Vaillant/
heizsparer）、richtig lüften im Winter（08-05 已判 ISOTEC/Buderus/VELUX 红海）、
Wäsche trocknen Winter head（08-05 已判 Utopia/ÖKO-TEST 红海）。
