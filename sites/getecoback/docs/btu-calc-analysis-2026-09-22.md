# btu_calc 深度分析与优化(2026-09-22)

owner 指令:「Btu_calc深度分析使用情况再优化,目标扩大使用流量」。三轮 prompt 后的范围:把 `btu_calc` 拆到 面 × 页 × 国家 × 来源 × 月份,量载体页使用率、覆盖缺口、算完之后的联盟点击、结果档位;只做数字指名的优化;判定线按使用率写,窗口考虑制冷淡季。
数据:D1 `ecoback-events`,真人(`ua_class IS NULL OR 'human'`),剔 `/__ci`,全史 = 2026-08-05 → 09-22(56 天)。Trends:5 年周数据,geo=DE,锚 `heizlüfter`,单批内可比。

## 0. 一句话

**72 次 `btu_calc` 事件按「页 × 日 × 国」去重后只有 21 次真实使用;这 21 次之后,同页同日联盟点击为 0;首页那个工具 56 天 0 次真人使用;而拿到 BTU 搜索流量最多的一张页(`was-bedeutet-btu`,25 pv,20 来自搜索)上根本没有工具。** 所以「扩大使用」的杠杆不在计算器本身,在它放在哪:本轮把 sizer 放到那张页上、修掉 EN 版「完整计算器」按钮指错页的缺陷、给两个结果按钮各自的点击来源;不改算式、不加钩子、不建新工具页。

## 一、使用量:72 是事件数,不是使用数

sizer 在按钮 / Enter / 下拉框每次变化时各发一条事件,一个人拖两下就是十几条:

| 会话(页 × 日 × 国) | 事件 | 说明 |
|---|---|---|
| `klimaanlage-25-qm` 08-17 DE | **16** | 一个人 |
| `en/…europe-heatwave` 09-20 GB | **16** | 一个人,同分钟内 17→18→17 m² |
| 其余 19 个会话 | 40 | 1–5 条不等 |

**56 天 21 次使用 ≈ 每 2,7 天一次。** 以后引用「工具使用」一律按会话数,不按事件数。

按月:8 月 38 事件 / 12 会话,9 月 34 / 9;`source`:guide(内嵌 sizer)60、无 source(btu-rechner 与 EN btu-calculator 两张独立页)12、**home 0**。

## 二、按面看:哪张页的读者会用

| 面 | 56 天 pv | 会话 | 会话 / 100 pv |
|---|---|---|---|
| `/guide/btu-rechner.html`(独立页) | 10 | 5 | **50** |
| DE 载体页(43 张带 sizer) | 146 | 11 | **7,5** |
| `/en/guide/btu-calculator.html`(独立页) | 10 | 1 | 10 |
| EN 载体页(21 张带 sizer) | 117 | 2 | 1,7 |
| 首页 EB_HOMETOOL | 83(其中 57 US 无来源扫描器) | **0** | 0 |

三条读法:①独立计算器页的读者一半会算——但它 56 天只有 10 pv、3 次搜索;②DE 内嵌 sizer 的使用率是 EN 的 4 倍(EN 载体页的 pv 里混着美国扫描器,分母虚胖;GB 读者是 EN 侧唯一在用的);③首页工具是 0,不是「少」——它要点按钮才算(sizer 是加载即算),而首页真人 pv 只有约 26。

载体页里会话最多的是尺寸梯页:25-qm 1 会话、30-qm 2、15-qm 2、40-qm 1、20-qm 1(pv 18/15/10/7/5)——**读者带着面积来,页面已按 slug 预填,他改一下数字就是一次使用。**

## 三、算完之后:0 次同页点击

| 口径 | 21 个会话里 |
|---|---|
| 算完 20 分钟内同页联盟点击 | **0** |
| 同页同日任意联盟点击 | **0** |
| 同日同国站内**别的页**有联盟点击 | 15(DE 国家粗,不可归到同一人) |
| 同日同国看过别的页 | 18 |

非 DE 会话能看得更清:09-21 一位 AT 读者一天看了 22 张页、在三张页上各算了一次(btu-rechner / wie-viel-btu / unterschied),**点的 6 条联盟链全在别的页上**(haustier、abluftschlauch、zimmer-kuehlen、fensterabdichtung ×3)。
→ **sizer 是研究步骤,不是购买步骤。** 它的结果条上那个「Preis auf Amazon prüfen」按钮 56 天没被点过一次。此前这个按钮的点击会被埋点层记成 `body`(与正文链接混在一起),只能靠时间戳推断;本轮起它自报 `source:"sizer"`,10-20 直接读。

结果档位:72 条里 9 条(12,5 %)落在 >13.500 BTU 的第四档(不推荐任何单体机,送去 split 页)——与 08-27 的 7/39 一致,第四档没白加。

## 四、覆盖:工具在哪,读者在哪

sizer 的注入条件是 `device_of == ac` 且不在 SKIP_MODELS / CONTEXT_MODELS / 自带工具页。实测 146 张 ac 页里 **64 张有 sizer、82 张没有**——没有的那 82 张里恰恰是制冷流量最高的:

| 无 sizer 的页 | 56 天 pv | 为什么没有 | 本轮处置 |
|---|---|---|---|
| `klimaanlage-wohnmobil` | 73 | CONTEXT(房车配件货架) | 不加:房车不是 340 BTU/m² 的房间 |
| `en/…tilt-and-turn-windows` | 63 | 自带窗封计算器 | 不加:08-06 规则「一页一个工具」 |
| `midea-portasplit-ausverkauft…` | 50(43 US 扫描器) | CONTEXT | 不加:真人 ≈7 |
| `klimaanlage-kippfenster` / `-dachfenster` | 43 / 10 | 自带窗封计算器 | 不加,同上;记为候选(它们的点击率 21 % / 60 %,是买点页) |
| `split-klimaanlage-ohne-kernbohrung` | 31 | CONTEXT,08-31 明确移出(sizer 推单体机会和 split 页吵架) | 不加 |
| **`was-bedeutet-btu`** | **25(20 来自搜索)** | **在 SKIP_MODELS(解释页不放商品卡),sizer 顺带被排除** | **✅ 加**:`SIZER_FORCE` 名单,只放 sizer 不放货架 |
| `mobile-klimaanlage-kuehlt-nicht` | 14 | CONTEXT | 不加,记为候选(「机器太小」是它的第一诊断) |

**`was-bedeutet-btu` 是本站 BTU 意图的最大搜索入口**(bing 7、ddg 6、yahoo 5、ecosia 1、copilot 1),比计算器页自己(3 次搜索)多 6 倍,而它只有 3 条站内入链、没有任何计算器。Trends 也指向同一处:`btu klimaanlage` 是 BTU 族里唯一有量的词(同批内 100,6 月峰),`btu rechner` 是 0——**读者搜的是「BTU 是什么/多少」,不是「BTU 计算器」**。工具要放在问题被问出的那张页上。

## 五、修掉的缺陷

1. **EN sizer 的「Add ceiling height, people, kitchen →」指向 `how-many-btu-do-i-need`,那张页没有任何计算器**(0 个输入框);真正有五个输入的 EN 页是 `btu-calculator`。21 张 EN 载体页全部改指。
2. sizer 结果条与首页工具的 Amazon 按钮各自上报 `source:"sizer"` / `source:"home-tool"`(与 toppick 同一机制,埋点层 500 ms 内去重,不会双计)。刻意做在组件里而不是埋点层:改埋点层会让全站 229 张页的 HTML 变化并被 IndexNow 当成改动提交。
3. `was-bedeutet-btu` 加 sizer(见上)。

## 六、没做的,以及为什么

- **不动算式、不加钩子、不改结果条文案**:算完 0 点击的问题不是按钮不够醒目,是读者在研究阶段;往研究步骤里塞更多购买 CTA 是 08-31 已证伪的路。
- **不给首页工具改成加载即算**:那不会产生「使用」,只会产生假读数。
- **不给 CONTEXT 页(kippfenster / dachfenster / kuehlt-nicht)叠第二个工具**:一页一工具的规则有它的理由(注意力竞争),而 seal_fit 本身 56 天只有 1 次;要不要用 sizer 换掉窗封计算器,等 10-20 读数。
- **不做美国 sq ft 输入**:btu_calc 国家分布 DE 42 / GB 21 / AT 6 / ES 2 / CH 1,**US 0**;EN 真人 pv 太小,已有 `eco-us-units-0131` 在测单位问题。
- **不建 BTU 相关新页**:新页冷启动 0 的读数没变。

## 七、季节(判定线为什么按使用率写)

`btu klimaanlage` 5 年峰值在 6 月,冬季均值只有 9 月的 0,24;9 月已经是低位。从现在到 5 月,sizer 的**绝对使用次数只会往下走**,谁拿绝对次数当判据谁就会把季节读成失败。所以 `eco-btu-sizer-1020` 量的是「新载体页有没有会话」与「结果按钮有没有被点」这两个不依赖季节的存在性信号;真正的旺季读数留到 2027-06。

## 八、判定线 `eco-btu-sizer-1020`(已进 `data/fleet-bets.json`,2026-10-20)

① `was-bedeutet-btu` 的 btu_calc 会话 ≥3 /28d(t0 = 0);② 全站 `affiliate_click{source:"sizer"}` ≥1(t0 = 0)。
赢 → 「问题在哪页,工具放哪页」推到 EN 解释页与其余信息型制冷页;输 ① → 从 SIZER_FORCE 移除,不留死块;输 ② → 结果条简化为答案 + 站内链接;该页窗口内 pv <8 → insufficient,顺延到 2027-06-20。
