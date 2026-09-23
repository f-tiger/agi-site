# eco 联盟点击深度分析(2026-09-23)

owner 指令:「eco联盟点击的深度分析优化」。三轮 prompt 后的范围:把点击拆到 页型 × 面 × 去向 × 簇 × 国家,找测量缺口、钱线泄漏、曝光缺口,并给 09-25 / 09-28 / 10 月各线提前读数;**不加钩子**(08-27 / 08-31 已证伪)、不建页、不加 cron。
数据:D1 `ecoback-events`,真人(`ua_class IS NULL OR 'human'`),剔 `/__ci`;主窗 **2026-08-26 → 09-23(28 天)**,判定线按各自窗口。PartnerNet 只引用 owner 截图(最新 14.09.2026:30 天 €11,20 / 112 点击 / 3,57 %)。

## 0. 一句话

**28 天 79 次点击:41 % 来自正文里手写的配件链接,18 % 全部落在 EX105 那一条搜索链上,/dp/ 只占 13 %;三条钱线泄漏(无来源点击、已核验型号仍走搜索、送错商城)全部已经在 08-28 / 08-31 / 09-15 修掉,构建产物里今天是 0。** 本轮能动的只有两处:①growatt「先测再换」那条线读到 3 次点击、赢了,把这个顺序移植到三张 09-17/18 建的排障页(它们此前给「机器出问题」的读者摆两台新机器);②EX105 的 ASIN 仍等 owner 的 3 分钟——它一条链接就决定 09-28 那条 /dp/ 线。

## 一、点击从哪来(28 天,79 次)

**按页型**(手工归类,页型定义沿用 09-17 §四):

| 页型 | 点击 | 占比 | 代表页(pv / 点击) |
|---|---|---|---|
| 安装 / 配件(买点型) | ~30 | 38 % | fensterabdichtung-klimaanlage 3 / **6**、kippfenster 20 / 4、dachfenster 7 / 4、zimmer-kuehlen 5 / 3、selber-bauen 17 / 2 |
| 尺寸梯页 | 23 | 29 % | klimaanlage-30-qm 10 / 4、25-qm 10 / 3、40-qm 6 / 3、15-qm 5 / 3、luftentfeuchter-25-qm 2 / 3、heizung 15/20/50 各 1 |
| 国家 / 最佳页(EN) | 9 | 11 % | italy 2 / 3、france 5 / 2、spain 4 / 2 |
| 房车 | 6 | 8 % | wohnmobil 40 / 6 |
| 排障 | 5 | 6 % | **growatt 31 / 3**、ueberwintern 22 / 1 |
| 其它 | 6 | 8 % | 首页 30 / 1、was-bedeutet-btu 16 / 1、split 7 / 1 |

**按面**(埋点层 `source`):body **32**(22 页)· toppick 24(15)· other 8 · models 8 · sticky 3 · us-market 1 · inline 1 · ac-finder 1。
正文链接是最大的面,而它不是组件——是写页时按步骤放进去的具名配件(「Kippfenster-Panel」「XPS-Platte Zuschnitt」「Alu-Klebeband hitzebeständig」)。**126 张页都有的 models 货架只贡献 10 %。**

**按国家**:DE 56 · AT 10 · IT 3 · ES 2 · PT 2 · US 2 · GB / AU / CH / FR 各 1。DE+AT = 84 %。

**按周**(08-05 起):18 · 48 · 19 · 21 · 19 · 13 · 13 · 18(本周未满)。制冷季收尾后稳定在每周 13–20 次,构成从整机转向配件、房车与供暖卡。

## 二、点击去了哪(去向质量)

| 去向 | 点击 | 说明 |
|---|---|---|
| `s?k=De'Longhi Pinguino PAC EX105` | **14**(11 页、6 国) | 全站最推的型号,唯一没有已核验 ASIN 的头部型号(08-31 结案:B0BZWP26GD 在 .de 落到 AP98,搜索链是正确形态直到有人核出对的 ASIN) |
| 窗封 / 面板 / 板材类搜索 | ~22 | kippfenster+abluft+panel 5、fensterabdichtung+dachfenster 4、xps+platte 3、hohlkammerplatte 2、fensterabluftdüse 2、klett 类 3 … 全部是搜索页,**对配件这是对的**(尺寸与变体要读者自己比) |
| `/dp/` 已核验商品页 | **10** | Comfee MPPH-09CRN7 5(IT+DE)、B07NC5CP6F 2、B07KJX6RDK 2、Klarstein 12K 1 |
| 房车 | 6 | dachklimaanlage+wohnmobil 4、campingventilator 1、12v 1 |
| 供暖具名卡 | 6 | Schmidbauer ISP T 700 ×2、Hybrid Pro 600 ×2、Midea NTH20 ×1、infrarotheizung+set 1 |
| 除湿 | 3 | 泛搜索 `luftentfeuchter` ×2(20-qm / 25-qm 正文按钮)、keller+ablaufschlauch 1;**MeacoDry 0** |
| 其它 | ~17 | 14000 BTU 2、Growatt 2、Comfee 搜索 2(08-26/28,均早于 08-31 的 ASIN 改写)、Midea Duo .com 1 … |

**商城**:amazon.de 75、amazon.com 1、无 URL 2。US 2 次里 1 次 .com(us-market 桥)、1 次 .de(italy 页 EX105——该页在 `US_SWAP_NEVER` 名单里,欧洲电压,属设计);GB 1、AU 1 落 .de,合计 2 次,不值得动。**没有送错商城的泄漏。**

## 三、测量缺口:三条都是历史,构建产物今天是 0

| 缺口 | 56 天读数 | 28 天读数 | 状态 |
|---|---|---|---|
| 无来源(`source` 为空)的点击 | 42(14 页) | **0** | 08-28 埋点层按祖先推导来源后关闭 |
| 已核验型号仍走搜索页 | Comfee 搜索 2 | 2(08-26 / 08-28) | 08-31 `build_asin_links` 后关闭;今天 grep 构建产物:Comfee / Klarstein / MDDF / PAC N90 的 `s?k=` **0 页** |
| 无 `link_url` 的点击 | — | 2 | 08-26 一条 inline(08-28 兜底修复前)、一条 JSON 截断;今天无 |

所以「深度分析」在泄漏这一栏的结论是:**没有新泄漏可修**。上面三条 08-28 到 09-15 的修复都在起作用。

## 四、判定线提前读数(已写进 `data/fleet-bets.json` 的 `reading_2026-09-23`,到期日再结算)

| 线 | 到期 | 读数 | 预告 |
|---|---|---|---|
| eco-growatt-diagnosis(补登) | 09-25 | 31 pv / **3** 点击(阈值 ≥2;此前 1/29) | **won,提前结算**(计数不可逆)。3 次里 1 次是计量插座(经 sticky 栏)、2 次是 Growatt 本机 |
| eco-kuehlt-nicht-0925 | 09-25 | pv **0** / 点击 0 | insufficient(没人来,不是没人买) |
| eco-named-model-cards-0925 | 09-25 | 具名冬季卡 **5**(Schmidbauer 4、NTH20 1、MeacoDry 0) | 介于 4–8 → insufficient,顺延 10-25 |
| eco-rv-cluster-0925 | 09-25 | pv 1 / 0 | lose |
| eco-tenant-winter-0925 | 09-25 | pv 0 / 0 | lose |
| eco-us-market-0925 | 09-25 | us-* 来源 **1** | lose → 按原文撤桥(货架换国籍另有 10-15 线) |
| eco-dp-share-0928 | 09-28 | **9 / 62 = 14,5 %**(阈值 15 %) | 压线;EX105 一条链 10 次 = 16 %,核验即过线 |
| eco-feuchte-now-0928 | 09-28 | 渲染 22(阈值 50)/ 湿度簇点击 5(基线 5) | 渲染不够 → insufficient,顺延 10-28 |
| eco-split-cluster-0928 | 09-28 | **1**(基线 4、≤2 判负) | lose:这个价位在本站受众里不成立 |
| eco-rising-guide-1003 | 10-03 | rising_guide **0**、首页栏 Amazon chip 点击 0 | 未到期;按原文将拆 |
| eco-shelf-repick-1011 | 10-11 | 300 W 0、MeacoDry 0 | 未到期 |
| eco-us-shelf-1015 | 10-15 | us-shelf 0 | 未到期,n 太小 |

**一条对全舰队的口径纪律**:pv = 0 的页读出 0 点击,结算必须写 insufficient,不能写 lose——「没人来」与「没人买」在点击数上一模一样,但处方相反。

## 五、本轮做的(一件,来自 won 的行)

growatt 线的 win 动作是「把诊断优先的货架顺序移植到其他问题页」。查 09-17/18 新建的三张排障页,它们继承的是品类默认货架:
- `luftentfeuchter-zieht-kein-wasser`(结论:空气里没那么多水 / 房间太冷)→ 摆的是 **MeacoDry 20L、25L 两台新除湿机**;
- `heizluefter-schaltet-sich-aus`(结论:2.000 W = 8,7 A,16 A 回路满了)→ 摆的是 **两块 Schmidbauer 红外板 + 两台暖风机**;
- `luftentfeuchter-stinkt`(结论:Register 上的生物膜,清洁)→ 又是 **两台新除湿机**。
**这正是 growatt 页 08-28 替掉的形态**:给排障读者卖整机。三张页改为诊断优先,每张卡的句子都取自页面自己的正文(61 g / 8,7 A / 4,3–5,2 A / Lamellenrichtung / Schwimmerabschaltung),不新增任何断言:
- kein-wasser:湿度计(Erst messen)→ 吸附式除湿机(页面的第一原因:房间对压缩机式太冷)→ 排水管(第五原因);
- schaltet-sich-aus:能耗计量插座(8,7 A 的算式)→ Schmidbauer Hybrid Pro 600 W(2,6 A,换机位)。初稿中间还有一张「1.000 W 带恒温暖风机」,删了:读者手里的暖风机几乎都有小档(页面表格:1.000–1.200 W = 4,3–5,2 A),那张卡是在卖他已经有的东西;
- stinkt:Lamellenbürste(Register)→ 排水管(不再有积水)。
**顺序即移动端 CTA**:sticky 栏取页面第一条 Amazon 链接,growatt 那次计量插座的点击就是这么来的。读数并入 `eco-dach-troubleshoot-1116`(三页搜索引荐 ≥25 或 pv ≥40),不另开线。

## 六、owner 侧一件事,用今天的数字再说一遍

**EX105 的 ASIN**:28 天 14 次点击(18 %)、08-31 以来 10 / 62 落在搜索页;`/dp/` 占比 14,5 % 卡在 09-28 那条线的 15 % 下面,**这一条链接核验通过就是 31 %**。动作还是 08-28 那 3 分钟:打开 amazon.de 搜 De'Longhi Pinguino PAC EX105,把**标题写着 EX105 且 10.000 BTU** 的那个商品页 URL 里的 ASIN 发过来(收货地址先改回德国,08-31 记过);我烘进 `MODEL_ASIN`,75 张页当天从搜索页切到商品页。B0BZWP26GD **不是**(它落到 AP98)。

## 七、没做的,以及为什么

- **不加任何钩子、不动货架顺序**(排障三页除外):pv→点击 18,9 % 在天花板,08-31 的 258 pv 暗区样本已证伪「加面」。
- **不「锐化」泛搜索 `luftentfeuchter`**(2 次点击):把它改成带容量的查询要先在 amazon.de 上看结果,沙箱是验证码墙;改坏比不改糟(09-15 配件→整机的教训)。
- **不统一配件搜索词**(同一意图 5 种拼法):只影响归因不影响钱,而改词等于翻炒。
- **不碰退出弹层**:28 天 165 次展示 → 8 次点击(4,8 %)→ 76 次关闭;它贡献 10 % 的点击,拆或留都缺证据,先记数。
- **不为 GB / AU 各 1 次 .de 点击写任何切换**。
