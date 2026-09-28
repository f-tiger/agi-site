# eco 工具板块检查与扩展(2026-09-22)

owner 指令:「先优化prompt再执行:eco站点的工具板块检查与扩展」。三轮 prompt 收敛后的范围:①逐个工具核对能跑、算对、有埋点、有入口;②量 56 天真实使用;③只在有读数支撑的地方扩展。
方法:D1 `ecoback-events` 现查(真人,剔 CI,2026-07-28→09-22);Playwright 对**本地构建产物**逐页实跑(390 px 视口,`/api/*` 打桩,捕获每一条 `/api/ev` 信标);已知算式与页面自己的示例对拍。`free-tools` 技能的评分卡用于「要不要建新工具」那一问。

## 0. 一句话

**34 张工具页里只有一个被人用(BTU 尺寸器,56 天 72 次),其余合计不到 10 次;而枢纽 `/tools.html` 56 天 1 次浏览,且漏掉了 14 张工具页。** 检查抓到 3 个真缺陷(一个工具从来算不出结果、一个结果表头印 `undefined undefined`、三张页连 page_view 都不记),7 个工具面没有任何埋点。本轮**不建新工具**:需求文件里没有一条工具形状的查询,而已有的 34 个工具先得让人找得到、算得对、记得到。

## 一、56 天使用(D1,真人,剔 CI)

| 事件 | 次数 | 页数 | 有事件的天数 | 说明 |
|---|---|---|---|---|
| `btu_calc` | **72** | 13 | 14 | 尺寸器(指南内 EB_SIZER + btu-rechner + 首页工具),唯一在被用的工具 |
| `standort_check` | 3 | 1 | 1 | 09-09 一天 |
| `stromkosten_calc` | 2 | 1 | 1 | 08-11 |
| `panel_fit` | 1 | 1 | 1 | 09-21 |
| `seal_fit` | 1 | 1 | 1 | 08-25 |
| `taupunkt_check` / `heizkosten_calc` / `bkw_calc` / `speicher_calc` / `strom_check` / `foerder_check` / `hitze_check` / `heat_check` | **0** | — | — | 都在白名单、都能发(本轮实跑逐个验证),56 天没人触发 |
| `solution_calc` / `pro_tool_run` / `watt_calc` | **不存在** | — | — | 本轮新加:此前这 7 张页什么都不发,「没人用」与「没记到」读数相同 |

对照:`popup_close` 140、`video_play` 21、`widget_view` 10(3 个 widget 页)。
**56 天工具页 pv**:btu-rechner 10(3 次搜索)、en/btu-calculator 10(2)、watt-rechner 5(2)、stromkosten-rechner 3(3)、standort-check 3、heizkosten-vergleich 2(1)、balkonspeicher-rechner 1、stromvergleich-check 1;`/tools.html` **1**、`/rechner.html` 1、`/pro-werkzeuge.html` 0、四张 household 页合计 4(全部是 US 扫描器)、es/fr/it 计算器 **0**、`/en/solution-calculator` 0。

## 二、逐页实跑(39 张页,Playwright,390 px)

39 张页 **零 pageerror**。驱动结果按问题分组:

| 发现 | 页 | 证据 | 处置 |
|---|---|---|---|
| **从来算不出结果** | `/pro-werkzeuge.html` 能源工具 | `#eCost` 默认值 6 800、`min="1" step="100"` → 6 800 不在以 1 为基准的步进格上,`reportValidity()` 为 false,点击「Szenarien berechnen」静默返回;**用页面自己的默认值都算不出来** | `min="100"`;部署自检断言该属性 |
| **结果表头 `undefined undefined`** | `/rechner.html` + es/fr/it/en 五张 | `country-ui.js` 引用 `t.totalA`/`t.totalB`,而文案包(`KEYS`)里从来没有这两个键;同文件对 `energyA/B` 已经有回退,这两个漏了 | 回退到 `t.total`;实跑表头正确 |
| **手机横向溢出 35–177 px** | 同上五张 | `.workspace` 的 grid 子项没有 `min-width:0`,窄屏下 form 最小内容宽 547 px | `minmax(0,…)` + `min-width:0` + 结果表 `overflow-x:auto`;实跑 0 px |
| **零埋点(连 page_view 都没有)** | es/fr/it 三张(无 EB_TRACK 层) | 三张页不在注入循环里;D1 56 天 0 pv 是**测不到**不是没人来 | `country-ui.js` 加 `ev()` 助手(有层走 `ebSend`,无层直发 `/api/ev`),load 时补 page_view;实跑各恰 1 条 |
| **零工具事件** | 五张国家计算器、pro-werkzeuge 三个工具、watt-rechner | 计算成功不发任何事件 | `solution_calc{mode,lang}`、`pro_tool_run{tool}`、`watt_calc{qm,w}`(600 ms 去抖 + 同值去重),worker 白名单 +3,`check_events` 绿 |
| 算式对拍 | btu-rechner / en/btu-calculator / 首页 | 30 m² → 11.000 BTU 三处一致 | 无缺陷 |
| | stromkosten-rechner | 1 000 W × 12 h × 0,45 € × 45 d × 65 % = 157,95 € ✓ | 无缺陷 |
| | watt-rechner | 20 m² × 80 W/m² = 1.600 W ✓ | 无缺陷 |
| | 国家计算器 | 页面自己的 Rechenbeispiel(1 000 W vs 700 W,6 h,60 d,0,30 €)→ Δ 32,40 €/a、21,6 a ✓(DE/IT 显示整数欧元,是格式不是算错) | 无缺陷 |
| | hitze-check / heat-check | 四问各答一项 → 100/100 + 建议,`hitze_check{score}` / `heat_check{score}` 正常发 | 无缺陷 |
| | 露点系列(keller / winter / kein-wasser / infrarot-schimmel / desiccant / heated-airer / mould-IT / tilt-winter) | 全部渲染并发 `taupunkt_check`(带 source) | 无缺陷 |

## 三、入口:枢纽漏了 14 张

`/tools.html` 是导航里唯一的工具入口(🧮 Tools),是手写页。与文件系统逐一比对:**14 张工具页不在上面**——`/rechner.html` 与四张语言镜像、`geraete-austausch-rechner`、`strommess-protokoll`、`waeschetrockner-oder-luftentfeuchter`、`keller-lueften-sommer`、`richtig-lueften-im-winter`、`luftentfeuchter-zieht-kein-wasser`、`infrarotheizung-gegen-schimmel`、`stromausfall-heizen`、`balkonspeicher-foerderung`。
另有三张「枢纽状」页彼此不通:`/tools.html`、`/wohnkosten-werkstatt.html`(household)、`/workbench.html`(部署时生成)。

**修法不是再手写一遍**:`tools/build_tools_hub.py` 从文件系统发现工具页(剥掉 `EB_` 注入块后:有数字输入,或 `data-v` 问答按钮,或 ≥2 个 select + 结果区,或显式名单里的实时数据工具),按季节排家族(9–2 月潮湿/取暖在前),卡片文案取各页自己的 h1 与 description;`tools/check_tools_hub.py` 断言**枢纽 == 文件系统**(缺一张红、多一张红、死链红),自检两向。现在 **34 张工具页全部在枢纽上**,重建 byte-stable。
`/workbench.html` 及其 12 张页在部署时由舰队工具生成、不在仓库里,闸门运行时它们不存在,所以不进自动索引(它们自己的 discovery wiring 负责);`/widgets.html` 与 `/mcp.html` 不是工具页,从索引块移除(页脚仍链 widgets)。

## 四、要不要建新工具(free-tools 评分卡)

需求侧读数:`demand-digest` 的 eco 段 rising 全是产品/品牌词与「kühlt ein luftentfeuchter」这类**已有页面回答**的问句;第一方站内搜索 `zero_hits: []`;autopilot gaps 里没有一条工具形状的查询。按评分卡,任何新计算器在「搜索需求存在」一项最多 1–2 分,「链接潜力/分享」各 1 分(本站 share 事件终身 0,widget 飞轮 08-28 判负),合计 <15。
**裁定:本轮零新工具。** 34 个工具里 33 个几乎没人用,不是品类问题,是发现与正确性问题——先把这两件修了(本轮),10-20 读数再谈。

## 五、判定线(已进 `data/fleet-bets.json`)

`eco-tools-hub-1020`(2026-10-20,28 天):`/tools.html` 真人 pv **≥10**(t0 = 1/56 d)**且** 非 BTU 工具事件合计 **≥12**(t0 ≈ 3,5/28 d),或三个新事件任一 **≥5**。
赢 → 工具的瓶颈确是发现面,把每个家族的前一名工具卡放进对应分类页;输 → 读者不从枢纽找工具、只在指南里顺手用,枢纽只维护闸门不再投入,并入 `fleet-tool-use-1014` 的结论。

## 六、没做的

- 不给 `/workbench` 那 12 张生成页加埋点(舰队共享的 revenue-studio 工具,改一处动四站)。
- 不合并三个枢纽状页面(其它会话的设计,只把工具全列在导航里那一个上)。
- 不动 `widgets/*`(noindex 嵌入件,08-28 已判负)。
- 不改 `/tools.html` 的标题与描述(无 CTR 数据)。
