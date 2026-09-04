<!-- MONOREPO 迁移说明(2026-08-19,owner 决定) -->
> **本站已迁入公开 monorepo `f-tiger/agi-site`,路径 `sites/getecoback/`。**
> 部署 = push agi-site 的 `main`(deploy-getecoback.yml);每日季节轮换
> schedule(03:17 UTC)已随迁移恢复,不再等 9/1。旧私有仓 f-tiger/rearchfuture
> 是历史档案,不再推送。公开仓红线见仓库根 CLAUDE.md。

## 快反出页规则(2026-08-23,owner:「监控谷歌trends,让站点快速获取流量」)

信号面已修:全国热搜 RSS 只出新闻头条(4 天命中全是「wetter 城市」,不可出页),
新增 `data/trends-rising.json`——六个种子词(除湿/取暖/阳台电站/空调/除霉/红外)
的德国 rising 关联查询,每日 04:30 与热搜同 run 刷新。
**每日循环 Step 1 改为双读**:trends-de.json(事件触发)+ trends-rising.json
(需求触发)。**出页判据**:某 rising 词 v ≥ 200(或 Breakout=100000)且属本站
niche 且可挂联盟钩 → **当天**出一页(答案胶囊+表格+FAQ/LD+toppick/inline 双钩,
质量门与零编造不放松);同词 14 天冷却;当天最多 1 页(防翻炒)。
词在 niche 外或纯资讯型 → 不出页,只记 analytics 备查。判定线:快反页发布后
28 天内该页 affiliate_click ≥3 或进站内 pv TOP10 → 机制有效,继续;连续 5 页
全空 → 快反判据回炉。

## 第二层订阅捕获「Faktencheck-Alarm」(2026-08-23,bpj 胜出模式移植)

依据:bpj 退出弹层当日转化舰队第 3 个真实订阅;eco 指南页(流量所在)此前零邮件
捕获,既有 Supabase 首页表单有史以来 0 次 subscribe 事件(popup 归联盟商品用,
118 曝光/6 点击,不动它)。新层:worker 边缘注入,只在德语 /guide/* 页、且
**商品弹层已用完机会后**(eb_pu_seen 存在)出现;承诺事件驱动且可兑现——
「病毒式产品在 Faktencheck 翻车时(如 EpiCooler)发恰好一封邮件」,NO-API 模式
(D1 `subs` 表存储优先,GDPR 勾选+consent_text 入库,翻车日会话出邮件包 owner
粘贴)。事件:subscribe{source:factcheck-alert} + popup_view{trigger:s2}。
判定线:28 天 ≥1 个真实订阅 → 保留;0 → 撤层(别让弹层叠罗汉)。
**义务**:未来任何 Faktencheck 翻车页发布的 run,必须查此表并出邮件包。

## 快反首单记录(2026-08-23,owner「执行一次测试」——端到端实弹)

信号:trends-rising.json 首次实抓成功(related-queries 在 referer+轮换减量后通过;
autocomplete-diff 兜底同 run 上线)。当日 rising:**epicooler v=42000**(+test/
erfahrungen 变体,购前调研意图)。核实:病毒式投放的「无排气管空调」,SERP 被
卖家自建假测评域污染(自称 Stiftung Warentest 测试冠军),tomorrow-focus 已发
WARNUNG。**当日出页**:/guide/epicooler-erfahrungen.html——两栏账式 Faktencheck
(厂商宣称 vs 物理,压缩机制冷必须排热;卖家域「测评」= 警示信号清单;第三方
问题报告引具名信源;诚实备注「未实测」),ehrliche Alternative 双钩(Comfee/
De'Longhi = D1 实证最能转化的两个品)+ BTU 工具。已入 sitemap(152 URL)+
ohne-abluftschlauch 页互链。**冷却:epicooler 词 14 天内不再出页**。
判定线(快反规则标准):28 天内该页 affiliate_click ≥3 或进站内 pv TOP10。
未触发词:lidl 促销簇(v≤10650,促销页保质期短,放弃)、schimmel 长尾(v≤300
未过线)。
## 流量诊断 2026-08-23(owner:「Eco站点没有流量了」——实查结论,别再误读)

D1 实查(28 天):**不是归零**——服务端 pv 从 8 月上旬 ~34/天回落到近 5 天 ~20/天
(约 -40%),当日仍有 affiliate_click。逐项归因:
1. **对比基线被污染**:8/16-17 的 pv=57 高点大半是 CI 自测;mcp_call 每天稳定
   18-27 次经参数逐字节比对确认 100% 是 eco-mcp-smoke(每日 06:17 cron)——
   **已修**:smoke 现自报 UA `getecoback-ci`,worker 对 CI 不再计 mcp_call,
   全部三条 INSERT 补写 `ua_class` 列(D1 已 ALTER)。此后人/爬虫/CI 可分。
2. **结构性事实**:14 天 Google 引荐 = **0**(本站从未有过 Google 自然流量);
   Bing ~20/周,微降。所谓下滑主体是 direct/other(疑为爬虫波动,修表前不可分)。
3. **季节性主因(研判)**:本站主打移动空调/热浪场景,8 月末欧洲热季收尾,
   需求自然回落——这不是故障,是产品线的季节到期。
4. **真金信号(全舰队最强)**:affiliate_click **85 次/28 天**,页面与商品高度
   多样(意/欧/德,inline+toppick)= 真人,漏斗本身在转化。

**队列新增(顺着真金信号做,过三门)**:秋冬产品线切换——除湿机(欧洲秋季霉潮,
承接同一批「窗户/居住舒适」读者)、Heizlüfter/取暖(strom 工具已在)、
Balkonkraftwerk 补贴(balkonspeicher_foerderung 工具已在,萨克森等州补贴是
现成判定题材)。每篇必须复用已验证的 toppick+inline 双钩模式。判定线:
新线首篇上线 28 天内 affiliate_click ≥5 → 续做;否则冬季只保新鲜度。

## 上量执行队列(2026-08-28,owner「调研互联网快速上量,规模化模式,实现 eco 升级」)

调研结论(五路排名,来源在根仓 revenue-strategy 文档与会话报告)按「量级×自动化
×出信号速度」排序,**每日轮从上往下取,一天 1-2 项,做完打勾**:

- [x] **①意大利语试点(最高优先,✅ 2026-08-28 上线 10 页)**:把最强转化页(italy 集群)译成**意大利语原生页**
  (10 页试点,gen_i18n 思路+互挂 hreflang+判定页六件套)。依据:Profound 32.5 亿
  引用研究——查询语言重写整个引用图(德语查询→80% 引用德语页;ChatGPT 是唯一落后者),
  而本站第一转化页是一张**用错语言**的意大利页。亚马逊链接**沿用 amazon.de**
  (该页已用 .de 链接转化过,欧盟配送)——**不要用 OneLink**(Geniuslink 实测 57%
  点击漏到搜索页);per-marketplace 直链等 owner 在 PartnerNet 核实能否挂 .it/.fr/.es
  tracking ID(UNVERIFIED,别自行假设)。判死线:试点 60 天 0 Bing 曝光且 0 AI 引荐
  且 0 联盟点击 → 停在试点,不全站翻译。
  **执行记录(2026-08-28)**:`site/it/guide/` 10 页上线——flagship
  miglior-condizionatore-portatile-italia(源 = D1 28 天第一转化页 italy EN,
  12 aff/28d 其中 3 次来自 IT)+ 15/25/30-mq 三连 + anta-ribalta(de/en/it 三语组)
  + senza-unita-esterna + rumoroso + camper + senza-finestra + deumidificatore-40-mq,
  全部按转化榜排序选定。基建同轮落地:build_hreflang **配对模型→语言组模型**
  (并查集,VALID_LANGS+it,x-default 优先级 de>en>it,旧 25 对字节不变)、
  faq-parity/llms.txt/sitemap/search-index/MCP ratgeber_lesen/部署健康检查全部覆盖
  /it/;worker 德语弹层只注入 /guide/ 不碰 /it/。IT 页自包含(无 EB_ 注入),
  自带 page_view/affiliate_click 埋点(D1 现有白名单),链接一律 amazon.de+
  getecoback-21(未用 OneLink,未挂 .it tag——等 owner 核实)。三写手并行+中央
  复校:全部型号/数字逐条溯源到源页,零新造;判死线复核日 = **2026-10-27**
  (60 天),口径:Bing 曝光(owner Bing WMT)+ D1 referrer AI 引荐 + /it/ 页
  affiliate_click。
- [x] **②秋季 pSEO 补英文面(✅ 2026-08-28 上线 13 页)**:qm 系列(entfeuchter/heizung)已有德语,Bing 的
  字面匹配偏好正是 qm 页的结构红利;补 EN 版(单模板),硬门:每页 ≥3 个独立数据点
  (post-HCU 生存线)。判死线:新批次 45 天 Bing 收录率 <30% → 停止加系列,先修收录。
  **执行记录(2026-08-28)**:`gen_entfeuchter_qm_en.py`(6 页 dehumidifier-X-sqm)+
  `gen_heizung_qm_en.py`(7 页 electric-heater-X-sqm),读**同一份** content JSON
  (数字单一来源,只加 `_en` 文案字段);每页数据点:阶梯值 + 60–100 W/m² 或
  <60% RH 阈值 + €/h 成本 + 透明季度公式 + 全系列阶梯表(互链)。de↔en hreflang
  组自动成对。**判死线复核日 = 2026-10-12**(45 天,Bing 收录率口径,owner Bing WMT)。
  **t0 基线(2026-08-29 site: 实测)**:13 页 EN qm 收录 0、/it/ 11 页收录 0——上线 <24h 属正常爬行滞后,IndexNow 已推;复核日按此零点计收录率。
  ⚠️ 两个教训:①DE gen_* 是一次性脚手架,重跑会冲掉已提交页的后续增补
  (当日实测,git checkout 挽回;JSON note 已记);②device_of 补 "dehumidifier"/
  "electric-heater-" EN token 时,顺带修出一个存量缺陷——EN drying-clothes 页一直被
  归为 ac,页顶挂着 AC toppick+BTU 制冷 sizer,本轮起改为除湿机组件。
- [x] **③AI 引荐页六件套改造(✅ 2026-08-28 上线)**:D1 里 AI 引荐落地 TOP3 页(tilt-and-turn/
  kippfenster/balkonkraftwerk-ohne-bohren)补判定页六件套。判死线:连续两次月度
  Bing AI Performance 拉取该页类 0 引用 → 记反面发现停投。
  **执行记录(2026-08-28)**:D1 复核确认 chatgpt 引荐确实落 tilt-and-turn(6)+
  kippfenster(5);三页六件套审计显示只缺第⑥件(首屏活数字)——kippfenster 早有
  DE 天气带,缺口是 EN 侧与 storage 侧。补:①`HEATNOW_EN`(EN 版天气带,同
  /api/heat,同 heat_now/cold_now 埋点,冷分支链当日新上的 electric-heater/
  dehumidifier qm 梯)注入全部 EN ac 页;②`STROMNOW`(EPEX 当日 Ø+当前小时价,
  标注「不含税费」,ok:false 不渲染零编造,埋点 strom_now 新入白名单)注入全部
  storage 页(balkonkraftwerk-ohne-bohren、growatt-probleme 等 AI 引荐落地页
  全覆盖)。Playwright 三分支(EN 热/EN 冷/strom)实测渲染零 JS 错误。
- [x] **⑥EN 区 US 访客市场切换(预登记并✅ 2026-08-28 当日上线)**:owner 当日已把
  getecoback.com 列入 US Associates 站点列表 → 根仓台账那条「25% 点击送错商城」
  (28 天 US 16 + GB 8 = 24/95)的 US 半边解封。**薄 PRD**:①范围 = EN 页面上
  **品类级搜索链**(qm 页 CTA、通用 category 链)对 America/* 时区访客改写为
  amazon.com/s?k=<us_term 映射的英文品类词>&tag=ecoback0d-20——German 品类词
  (luftentfeuchter+30+liter)在 .com 搜索结果为空/差,必须走 us_term 词表,
  不许原词直切;②**具名 EU 型号链(Pinguino/Comfee/AEG…)不切**——.com 上搜
  EU 型号是死结果,这些访客已由 EB_USMARKET 桥用具名 US 型号承接(桥先于切换,
  是既有已验证组件);③GB 8 次点击仍无解(无 .co.uk tag,owner 侧,不自行动);
  ④埋点沿用 source=us-market 家族,新增 meta 区分 rewrite;⑤验收 = Playwright
  America/* 时区伪装实测 + 现有 13 闸门。判定线:28 天窗内 US 国别 amazon.com
  点击 >0 且 US Associates 后台出现非零点击(owner 截图)→ 保留;US 点击继续
  全落 .de → 复盘词表映射。
  **执行记录(2026-08-28 当日)**:`EB_USSWITCH` 注入全部 EN guide 页——精确词
  白名单(11 个 qm 品类词)按 exact-match 改写,America/* 时区门控。Playwright
  三场景实测:US 访客 qm 页两条品类 CTA 全部切到 amazon.com/dehumidifier+
  ecoback0d-20、EU 访客 0 改写、US 访客具名型号页 0 改写,零 JS 错误。改写链
  带 data-eb-ussw 标记,affiliate_click 的 link_url 落 .com = D1 判定线数据源。
- [ ] **④Pinterest DE 管道(需 owner 一次开户)**:家居是 Pinterest 2026 第一品类,
  **官方 API 自动化明确合规**(≤25 pin/天,30-60 分钟间隔;禁浏览器机器人)。
  90 天 ≥300 pin 后 <10k 曝光或 <100 出站点击 → 杀;收到任何账号警告立即停。
- [ ] **⑤Flipboard RSS 自助提交**(约 30 分钟一次性,可能需 owner 开户):零维护
  期权,D1 28 天 ≥10 引荐才追加投入。

**判死的别再提**:无人出镜自动视频(YouTube inauthentic 政策 2026-01 一次封 16 频道
35M 订阅,且与本站「不自测」规则双重冲突)、Bing PubHub(已关闭新申请)、纯模板
pSEO(无独立数据点)、naive OneLink、idealo 当流量渠道(它是 €0.14/clickout 的
出站变现件,可作次级变现线另议)。

## 三层营收架构(2026-08-28,owner「调研商业营收方向」+「AI 时代…突破性方案」)

**执行文档 = 根仓 `docs/revenue-strategy-2026-08-28.md`,本节只放本站义务。**
本站被定为舰队营收旗舰:①Amazon 商品联盟(现有,ASIN 直链等 owner 3 分钟)
②能源/供暖 lead-gen(Check24 €16.50-20/lead 级,**挂既有页,不新建能源页**,
阻塞项=owner 注册联盟账号)③Bodenpflege 新垂直(经空气质量桥接入,**动工前置=
rising 种子出需求数据且 v≥200**,saugwischer 种子 08-28 已补,首轮全量 ~09-02)。
分发假设:AI 引用第一(第一方证据:25 次 AI 助手引荐全落在高转化问题页)、
Bing/DDG 第二、Google 最后。**合规红线:Associates 链接永不进 MCP/API/AI 输出面。**
**保险丝:引用队列爬虫任何时候不设价不屏蔽。**
判定线:GEO×联盟扩页 2026-11-30;lead CTA+60 天首条 lead;Bodenpflege 入口页
+28 天;Matratzen 利基已判死(只留睡眠气候长尾作普通选题);Kaffee 2026-11 复议。

## 联盟点击诊断(2026-08-27,owner「eco增加联盟点击」)——**瓶颈是流量,不是转化**

先把分母修对,再谈优化。ua_class 列从 08-23 才有,之前的行是 NULL;`/__ci_healthcheck`
在 08-23 前被当成真人。用干净窗口(08-24→08-27,四天,ua_class 可信):

| | |
|---|---|
| 真人 page_view | **53** |
| affiliate_click | **10** |
| 浏览→亚马逊 | **18.9%** |

**18.9% 是极高的联盟点击率**(内容型联盟站通常个位数)。**所以「转化不行」这个前提是错的
——这个漏斗本身很好,它只是几乎没有流量:约 13 次真人浏览/天。** 转化侧的可压榨空间很小,
把力气花在「再加一个钩子」上是把已经 17% 的漏斗调到 18%,而同期流量在腰斩。

**分周看,悬崖已经发生在八月内部**(28 天,human/NULL,排除 CI):
08-05→11 **178 pv / 30 aff(16.9%)** · 08-12→18 **218 / 42(19.3%)** · 08-19→25 **129 / 18(14.0%)**。
浏览量从峰值周掉 41%。**这是获客坍塌,不是转化坍塌。**

来源构成(08-23 起,真人):direct 18 · duckduckgo 15 · bing 10 · perplexity 3 · 自站 3 ·
yahoo 3 · chatgpt 2 · ecosia 1。**Google 依旧为 0**。所以秋冬的活路是 Bing 系 + AI 助手面,
不是 Google 专项。

### 三处已修的真实缺陷(都在生成器层,页面正文一行没动)

1. **BTU 计算器的推荐梯子封顶在 12.000 BTU,而它自己算得出 24.500 BTU。**
   D1 里 39 次真实计算有 **7 次结果高于 12.000**(17.500 / 14.000 / 20.500 / 16.500 /
   20.500 / 24.500 / 20.500);仅 `/guide/btu-rechner.html` 一页就是 6 次里 4 次。这些读者
   被告知「你需要 20.500 BTU」,然后拿到一台 12.000 BTU 的机器——**计算器在打自己的脸**。
   已加第四档:>13.500 BTU **不推荐任何型号**(我们确实没有可推荐的:DEVICE_MODELS["ac"]
   里最大的就是 12K),改为如实说「移动单体机在这个房间尺寸已经到极限」并把读者送到
   `/guide/split-klimaanlage-ohne-kernbohrung.html`(10 pv / 3 aff,是个真转化页)。
   英文侧没有对应的 split 页,所以英文档不给路由、只给那句实话——**不为了凑一个链接而
   编一个页面**。顺手修了英文面板一直在打印德语「ca.」的老毛病(现为 approx.)。
2. **季节桥是死的,而且指向三个已证实的死胡同。** 桥在 13 页上,28 天里五个目标页的
   站内浏览量合计 **0**;其中 `luftentfeuchter-gegen-schimmel` **在 D1 里从来没有过一行**,
   `heizkosten-vergleich-rechner` 1 pv / 0 aff,`mobile-klimaanlage-ueberwintern` 11 pv / 0 aff
   ——三个目标合计 **0 次点击 / 12 次浏览**。同期 `luftentfeuchter-40-qm`(4 pv / **3 aff**)
   与 `klimaanlage-mit-heizfunktion`(5 pv / 1 aff)对每一个制冷页都是不可见的。
   已按 D1 重选目标(前两个换成上面这两页,überwintern 降到第三);**载体页也按当前流量
   重选**——此前的八页是更早的手选,而本站今天最多人读的一页
   (`midea-portasplit-ausverkauft-alternativen`,23 pv)根本不在里面,现按「干净窗口里有真人
   浏览的制冷页」补齐到 DE 16 页 + EN 8 页。
3. **桥此前一个埋点都没有。** 所以「没人跨季」和「这个组件是坏的」在数据上长得一模一样。
   已加 `season_bridge` 事件(worker EV_NAMES 已白名单,`check_events.py` 会在漂移时让构建
   失败),并在链接上方补一句**点击的理由**——用本站自己的原话:「除湿机不会让空气变凉,
   废热甚至会让房间稍微变暖」(对应 trends-rising 里横跨夏秋接缝的最大上升词
   `kühlt ein luftentfeuchter`,v=41.950)。刻意**不加构建日期**:build_xlinks 每次部署都跑,
   日期戳只会让 diff 天天变而不说明任何关于内容的事实。

### ASIN 直链管线(2026-08-28,owner「针对舰队优化，提升营收」)

舰队营收盘点后的收敛结论:**全舰队唯一验证过「点击→钱」全链路的就是本站**,而本站
文档自己判定的最大无需新流量杠杆(`docs/amazon-asin-howto.md`:40/40 点击落搜索页,
每多一步转化减半)卡在「owner 的 10 分钟」上 15 天。现已把这 10 分钟自动化:

- `tools/verify_asins.py`:候选 ASIN(WebSearch 收集,来源注在行内)在 **GitHub
  runner 上**(有出网)逐个访问 amazon.de 真实产品页,**标题含必需型号 token 且不含
  禁用 token 才回写** `MODEL_ASIN`;被 robot-check/同意页拦截或不匹配 → 保持搜索链接
  并如实报告。**核验是闸门:错 ASIN 把读者带去错产品,比搜索链接更糟。**
- `.github/workflows/eco-verify-asins.yml`:仅 workflow_dispatch(外部副作用不进
  push 路径),验证通过才 commit 回 main → 正常 eco 部署把该型号所有卡/pill/弹层
  从搜索链接换成 `/dp/<ASIN>?tag=getecoback-21`。
- **结果(2026-08-28,两跑)**:run#1 空标题 → 查明是 gzip 未解压(urllib 不自动解压),
  修复;run#2 标题解析正常但五页全部返回 `Amazon.de`——**亚马逊对 GitHub runner 的
  数据中心 IP 出机器人拦截页**。按预先承诺停止迭代(继续换 UA = 对抗反爬,不做)。
  **管线保留**:任何一个核验过的 ASIN 进 `MODEL_ASIN` 即全站传播;核验降级为 owner
  的 3 分钟(五个 /dp/ 链接逐个点开确认型号,清单在会话报告里),或 owner 开 PA-API
  (5 单已达解锁线)后永久自动化。**别再空跑这个 workflow**——每跑一次都是已知结局。
- **实证教训(候选收集时撞到的)**:EX105 的六国通用 ASIN `B0BZWP26GD` 在
  amazon.de 标题显示的是 **PAC EX93**——程序化取 ASIN 不核验 = 把读者送错产品,
  这就是核验为什么必须在 .de 上做。
- **主动保持搜索链接的台账(别再「补全」它们)**:AEG ChillFlex Pro(变体家族,
  站内从未指定子型号)· Midea PortaSplit(经典款正是 ausverkauft 页那台,货架上
  现有三个同名兄弟款,搜索页对读者更诚实)· 两款风扇(季节已过)· 储能(板块已降级)。
- **PA-API 已达解锁条件**(需 3 单,现有 5 单)——это owner 侧的永久自动化路径,
  只在下次 PartnerNet 截图时顺带提一次,不催。
- **判定口径**:D1 看不到成交,判据在 PartnerNet——下次 owner 贴月度截图时,对比
  click→order 转化率 vs 基线 **4.20%**(2026-07-26→08-24 窗口)。dp 直链的预期方向
  是转化率升、点击数不变。

### 两条判定线的口径修正(必须在十月前定死,否则事后可以两头解释)

- **十月线**:原文「10 月 aff_click ≥ 8 月的 50%」没有分母。D1 里**没有 2026-08-05 之前的
  任何一行**,所以「八月」只能指**已记录的 23 天 = 95 次点击 = 4.13 次/天**。
  → **十月线正式定为:2026-10-01…10-31 期间 `affiliate_click` ≥ 2.07 次/天(即 ≥ 64 次)**,
  查询口径 `(ua_class IS NULL OR ua_class='human') AND page NOT LIKE '/__ci%'`。
  诚实预判:08-27 的七日滚动是 2.14 次/天,**这条线大概率会踩线或未过,而原因是流量不是钩子**。
- **lead_intent 判负**:28 天 23 次 `lead_intent` **全部**来自 `/__ci_healthcheck`
  (meta `{"ci":1}`,ua_class `ci`),**真实用户 0 次**。按 2026-08-20 预注册的规则
  (28 天 ≥10 → 报 owner 接管道;<10 → 判负归档),**判负归档**,不要拿这个 23 去找 owner。
  **通用纪律:任何漏斗事件在读数前先加 `ua_class <> 'ci' AND page NOT LIKE '/__ci%'`。**

### 补充四处(2026-08-27 第二轮,对抗审计的存活项 + 一次全站广告标识审计)

**④ 广告标识只有六分之一的区块有。** build_structure.py 里 toppick 那段自己写着规则:
「**标签属于广告本身,不是 600 px 之下的那一行**」——但这条规则**只被应用到了 toppick
一个区块**。审计发现另外五类带亚马逊链接的区块**一个标识都没有**:sticky bar(139 页)、
商品网格(90)、退出弹层(131)、BTU 结果面板(54)、首页秋季区块、上升需求栏。其中几个
正文里写了「Affiliate-Links」——那是**披露**,不是**广告标识**;而 sticky 与弹层恰恰是
正文里的标识够不到的浮层。已按站内既有措辞统一补齐(德 `Anzeige · Affiliate-Links —
für dich derselbe Preis` / 英 `Ad · affiliate links — same price for you`,浮层用短版)。
**现在 548 个带联盟链接的区块 100% 带标识**,并新增构建闸门 `tools/check_adlabel.py`
(仿 check_events 的做法,写进 deploy 流水线)——下次谁再加一个卖货区块忘了标识,构建直接失败。
*边界说明:我不是律师,这里不做法律判断;做的是「照本站自己已经写下的标准补齐」,
成本近零、无 UX 代价、方向明确偏安全。*

**⑤ `inject_sticky` 是 insert-only,所以任何对 sticky bar 的修改永远到不了已有页面。**
这正是上面那条标识「改了却 0/139 页生效」暴露出来的——和 2026-08-26 修过的 nav injector
是同一类 bug。已改为就地替换。**教训:所有 injector 都必须是 replace-in-place,
insert-only 等于把这个组件永久冻结在它第一次注入时的样子。**

**⑥ 上升需求栏的日期在虚报。** 「Stand」读的是文件顶层的 `fetched`(今天),而种子是
2/天轮转的,klimaanlage 那批实际是 08-23 抓的——本栏自己的诚实规则恰恰禁止这个。
已改为取**各种子中最旧的那个日期**(宁可低报不可高报),现在显示 Stand 2026-08-23。

**⑦ De'Longhi 的搜索词被写成了两种拼法。** `De%27Longhi+Pinguino+PAC+EX105`(208 处,
拿到 18 次点击)与 `DeLonghi+Pinguino+PAC+EX105`(2 处手写,其中一处在 europe-heatwave
这个 7 次点击的转化页上)。已归一——除了归因分裂,少了撇号的拼法在亚马逊也是更差的搜索。

**对抗审计明确否掉、不要再捡起来的(11 项 REJECT 里的关键几条)**:
①「弹层点击没有标签」——**假的**,每一条 `popup_click{pick}` 都有同时间戳的
`affiliate_click` 行(逐行 join 验证过);②给 `mobile-klimaanlage-kuehlt-nicht` 加
病因钩子——**该页自 08-18 起连续 9 天零真人浏览**,在死页上做的是纯粹的左右手互换;
③`überwintern` 第 5 步改写——四条验证点上都不成立;④若干条与当日已有记录重复。
**流量诊断本身「已验证」,但配套的大范围处方被判 churn=excessive 而否决——所以本轮
只修缺陷,没有铺开任何东西。**

### 本次改动的判定线(2026-09-10,14 天后)

`season_bridge` 累计 ≥5 次点击 → 桥活了,把它铺到更多载体页;**0 次 → 拆掉这个组件**
(别让一个死区块永远占着 13-24 个页面的版面)。BTU 第四档看 `/guide/split-klimaanlage-ohne-kernbohrung.html`
的站内浏览是否从 10 pv 起来。

## 病毒式传播诊断(2026-08-28,owner:「扩大联盟点击量,让网站可以被病毒式传播」)

### 一、社交分享已被本站自己的数据证伪,别再提

`window.ebShare` 已在 158 页;可见的分享按钮长在热浪带里,而 `heat_now` 28 天
**渲染 226 次**(level 1/2 都在),首页 BTU 结果另有一个。即:分享按钮被展示了
约 226 次,`share` 事件 **0**。**「加分享按钮」这条路已经用真实曝光量证伪过一次,
不要再作为方案提出。** 更根本的算术:约 15 次真人浏览/天,任何分享机制的产出都
在噪声以下。

### 二、但「已经在被转发」是测不到的,别把 share=0 读成「没人转发」

258 次无 referrer 的真人浏览里,**205 次落在深层页面、只有 53 次落在首页**。没人
会凭记忆敲 `/guide/klimaanlage-wohnmobil.html`——这是**有人/某个应用给了链接**才
产生的访问,而 WhatsApp、ChatGPT 客户端等一律剥掉 Referer。所以:**本站被转发和被
AI 引用的真实规模,大于 chatgpt+perplexity+copilot 那 25 次所显示的**;`share=0`
只说明「没人点那个按钮」,不说明「没人转发」。埋点看不见的东西不等于不存在。

### 三、本站可行的病毒形态 = 蹭别人的病毒性(Faktencheck),不是自己成为病毒

病毒式产品自带搜索量,本站做那个如实回答「这东西靠谱吗」的页面。trends-rising
同一形态三个词:epicooler 42.000(已有 Faktencheck)、**coolizi 23.600**、
**air zuma 14.650**(后两者站内 0 提及)。**实测 SERP(2026-08-28)**:搜
「Coolizi Erfahrungen Test」返回 7 条,**7 条全部是卖家侧的假测评域**
(managedcaremag / culturalcognition / berlios / differ.blog / checkzentrum /
tomorrow-focus),内容逐句复述厂商话术——这既是机会,也正是本站 Warnsignal-Checkliste
存在的理由。**注意 tomorrow-focus 也在这一批里,不要再把它当独立信源引用**
(08-23 那条记录把它记成了发 WARNUNG 的第三方,本轮实测显示它是同一批域之一)。
**沙箱对 verbraucherzentrale.de 与 watchlist-internet.at 均被 egress 代理拦截**,
无法回源核实,故只以具名链接让读者自查,绝不复述其结论。

本轮动作:**不新建页**(通用意图已被 `klimaanlage-ohne-abluftschlauch` 覆盖,按蚕食
规则应深化),只在该物理集线器补一段具名实例 + 链到 epicooler Faktencheck——此前
全站只有 3 页链到它,而拥有同话题通用词(27.300)的这一页不在其中。

### 四、**最大的钱线缺陷:四分之一的联盟点击落在赚不到钱的商城(owner 待办)**

按国家 × 版块拆 28 天的 95 次 `affiliate_click`:

| 来源 | 落地版块 | pv | affiliate_click | 商城是否能计佣 |
|---|---|---|---|---|
| DE | /guide/ | 254 | **44** | ✅ amazon.de / getecoback-21 |
| **US** | /en/ | 47 | **16** | ❌ 送到 amazon.de |
| **GB** | /en/ | 8 | **8** | ❌ 送到 amazon.de(且 08-06 已记录 getecoback-21 在 .co.uk 不计佣) |
| CH/AT/LU/IT/ES/NL/PT/CA | 两侧 | — | 21 | 部分可(欧盟可送达) |

EN 区 **318 处联盟链接 100% 是 amazon.de + getecoback-21**(grep 逐条确认),而 EN 区
恰好是全站前五页里的三页。**US 16 + GB 8 = 24 次点击(占 95 次的 25%)结构性赚不到钱**
——不是转化差,是把人送进了他基本不会下单的商城。按已确认的 €9,96/119 clicks 口径,
这 25% 是**不需要任何新流量就能拿回的营收**。

**✅ 悬置已解除并已落地(2026-08-28 当日,owner 出示后台截图)**:`ecoback0d-20` 的站点列表
已含 www.getecoback.com。但**简单换 tag 的做法被证据否掉了**——本页推荐的
Comfee MPPH-09CRN7、AEG ChillFlex Pro、De'Longhi Pinguino PAC EX105、Klarstein、
MeacoFan 1056 **全是欧洲市场型号**(实搜:MPPH-09CRN7 只在 amazon.com.be 等欧洲站),
在 amazon.com 搜它们**返回空**。把美国读者送进空搜索比现状更糟;把一张写着具体型号的卡
悄悄换成 .com 的泛品类搜索则是挂羊头卖狗肉。

**落地的是说实话的版本 `EB_USMARKET`**(27 个 EN guide 页,DE 页 0):仅当浏览器时区为
`America/*` 时渲染(设备本地信号,不发任何请求、无需同意;其余读者零渲染零 CLS),
内容如实说明「下面是欧洲型号、amazon.de 不适合你、我们没测过美国市场所以只给品类不点名型号」,
并给一条 amazon.com 品类搜索(按页面设备映射 portable air conditioner / dehumidifier /
tower fan / space heater)+ `ecoback0d-20` + 广告标识。**EU-English 读者(IT/ES/NL/PT/AT/CH)
是本区当初的设计对象,amazon.de 对他们正确,一个字没动。**
Chromium 实测:America/New_York 与 America/Toronto 渲染(217px,广告标识在位,
rel="sponsored noopener",链接带 US tag);Europe/Berlin 与 Europe/Madrid **零渲染 0px**;
无页面错误。

**顺带修好的埋点缺陷(全站,不止本块)**:EB_TRACK 的兜底监听器把捕获阶段刚算出的组件
来源丢掉、给每一次点击硬编码 `source:"inline"`,所以任何没有自带追踪器的区块在漏斗里
都是隐形的。改为用已算出的 surface(`"inline"` 仅作真正兜底)并带上 `link_url`(500ms 去重
从此能比对真实 URL 而不是两个空串)。**双计数回归实测**:btu-rechner(自带追踪器)、
strompreis-radar(无)、最高流量的 midea 页、EN 头部页,四页各点一次**均恰好 1 条**
affiliate_click,来源分别为 body / toppick / toppick / toppick——不再是清一色 inline。

**判定线(2026-09-25,28 天)**:`affiliate_click{source:"us-market"}` ≥5 → 北美桥成立,
再考虑给它配真正的美国型号(需先验证在售,不得编造);0 → 北美读者不接受品类页,
撤掉此块,并把结论记下:EN 区就是给 EU-English 读者的。

下方为决策当时的原始记录(背景保留):
**为什么当时不自行切换**:美国站 tag `ecoback0d-20` 已由 owner 确认归属(根仓台账),
tds 已在用;但 Amazon Associates 条款要求**账号后台的站点列表包含投放站点**,
getecoback.com 未列——**未列就切,佣金可被判无效**,那是比现在更坏的结果。且根仓
「高价值品类扩展」条已明确:改 EN 区商城属于**契约变更**,须先改契约再动。

**owner 待办(1 分钟,解锁上表 24 次点击/28 天)**:在 US Associates 后台的站点列表里
加上 **getecoback.com**(与已在待办的 thedollscout.com、agiscorecard.com 同一处)。
**加完告诉我,我按页切 EN 区到 amazon.com/ecoback0d-20,并保留 EU 访客走 .de。**

### 四·五、四镜头对抗审计的结论(2026-08-28,17 个 agent,13 项发现 / 12 项裁决:5 存活 7 否决)

**存活并已修**:①epicooler「独立信源」——**六处而非三处**,我的首轮只修了三处,漏掉了
提取率最高的两个面(`<meta name="description">` = SERP/AI 摘要面、Kurzfassung 首段 =
llms-full.txt 的导语),以及 FAQ 问题名本身(「Was berichten **unabhängige** Quellen?」
问题即预设答案 → 改为「Was berichten Dritte?」,可见 H3 与 JSON-LD 同步)。
②`inject_radar` 是**最后一个 insert-only 注入器**(nav 08-26、sticky 08-27 已各修一次):
2026-08-06 加的「发信还在搭建中,现在不会收到任何邮件」诚实声明**从未到达任何存量页**,
112 个带 radar 的德语指南页里 **85 页**在裸奔承诺热浪预警。已改为就地替换,现 DE/EN 指南页
缺声明数均为 **0**。③审计另指出:两个专属订阅落地页 `/hitze-radar.html` 与
`/en/heat-radar.html` 自带手写表单、在注入器范围外、**一句声明都没有**——只修指南页而让
真正的注册页继续裸奔是同一问题的弱一半,已同步补上。

**被否决的 7 项**(别再捡):EN 面积页系列近重复簇、按需求重排内链预算、若干条把差异
当缺陷的归因分裂,以及两条 evidence 不成立的。

**两处对我自己读数的纠正(重要,别再重复)**:
- **`md_serve` ≠ AI 助手在读本站**。绝大部分 md_serve 行是 `MCP-Cloud-AboutBot/1.0`——
  目录方按 3 天一轮固定抓 30 个页面,monitor-log 第 770 行早已判过一次同样的误读。
  真正的非目录抓取全期只有 Claude-User ×2、ExaSearchBot ×1。**我在本轮报告里说过
  「AI 通道健康」,这句按此口径应收回**:通道活着,但活的是目录爬虫不是助手读者。
- **死链那条的「三页在全站前六」是夸大的**:按 14 天真人 pv,只有 midea 页在前六,
  split-klimaanlage 是第 7/8。缺陷本身(55 个锚点指向从未存在的页)成立且已修。

**嵌入飞轮判负(审计建议,采纳)**:`/widgets.html`、`/tools.html`、`/fuer-betriebe.html`
28 天真人 pv **全为 0**——嵌入 CTA 不是「没优化好」,而是**它的落地页从来没有人访问过**;
且提供的代码是纯 iframe、来源链接在 noindex 框内,**即使有人嵌入也不产生反链**。
结论:**判负,不投入,代码留着别动**(零维护成本),不要再写「优化 widget 转化」这类任务。

## AI 流量强化轮(2026-08-28 晚,owner:「增强ai流量」;citation-growth 技能执行)

背景:GA4 证实 chatgpt 已是第 3 渠道(57 会话,+185%)且 D1 结构性低估它。按技能循环
对被引 TOP 页(reinigen 109 次、40-qm 70、balkonkraftwerk 54、luftkuehler 52% 份额…)
跑六件套缺件审计。**今天已发 3 页超出 1 页/天上限,本轮零新页。**

**审计发现一个系统病并已根治:FAQ 可见文本与 JSON-LD 漂移,全站 18 页**(含被引第 1 的
reinigen、52% 份额的 luftkuehler,以及另一会话当天刚发的 tineco 页——证明漂移在持续产生)。
成因:可见文案会被后续轮次润色,JSON-LD 没人同步。最坏形态两例:reinigen 有一条 Q&A
只在 LD、可见文本没有;tineco 整个 FAQPage(4 条)在页面上完全不可见——这正是技能警告
「有惩罚风险」的欺骗性标记形状。

**修复**:18 页全部以可见文本为唯一事实源同步 LD;reinigen 补回缺失的可见 Q&A + 新增
保养周期表(六件套③,该页此前 0 表格);tineco 补上完整可见 FAQ 节(内容取自 LD 逐字,
与正文四节一一对应)。**新闸门 `tools/check_faq_parity.py` 入 deploy 流水线**(照
check_adlabel 先例):文本级校验、与标记形状无关,漂移即构建失败——现状 131 个 FAQ 页
全部逐字通过。

**过程教训(记下防再犯)**:批量修复时我先用相似度阈值 0.5 做模糊匹配,把 Pollen 问题
误配到 CO2 问题、又把一张商品卡标题灌进 LD——**在逐字一致性这种事上,自动抽取必须
以「重建后闸门全过」为验收,中间产物不可信**;最终以手读可见原文定版。

**Supermetrics 重连后仍 TRIAL_EXPIRED**:重连恢复的是连接层,团队试用 08-02 到期是
计划层——查数据需要付费订阅。免费替代:owner 直接截 GSC Performance 图(同 GA4 那张)。

**判定线**:AI 引荐(GA4 ai-assistant 渠道口径)下月 ≥70 会话(现 57)→ 引用面持续复利;
Bing AI Performance 下次快照里 reinigen/luftkuehler 的引用份额不降 → parity 修复无副作用。

## 增长基准对照(2026-08-28,owner:「对比同类站点增长速度,慢则学习」)

**诚实边界先立**:同行的流量与站龄第三方数据在本环境不可测(Similarweb 不覆盖此量级;
Wayback CDX 与同行站直连均被 egress 403)——不编数,以下只用可核实的三块。

**① eco 自己的曲线(D1 日均 pv,全史)**:23 → 29 → 25 → 19/天(八月中见顶,季节回落)。
站龄 ~8 周(2026-07 初上线)。7 月 12 日 GSC 快照(当时 Supermetrics 还活着):
~180 展示/30 天、位次 20-98、大量查询卡 **pos 12 = 页 2 临界**。

**② 行业基线(多源交叉,2026)**:新联盟站 3-6 个月才有初动،6-18 个月才有稳定 Google
流量;且跳变模式是「一页可在 40 位趴几个月,几条强外链后跳到页 1」。

**③ 判定:eco 在 Google 轨道上不是「慢」,是「准时」**——8 周龄按基线就该是零 Google
点击;同行(raumklimatest/luftentfeuchter.cc/temperaturheld 这类)赢在**站龄+外链**,
是时间函数不是方法函数。**Bing+AI 轨道上 eco 反而在前**(IndexNow/llms.txt/MCP 这套
同类新站基本没有;monitor-log 三方对照过:优势=被索引速度,来自基建非运气)。
**真正落后的一段是外链**:Foundation 期 ~0 条,而此前指望的 widget 自动外链机器
今天刚被证死(iframe 内链接无 SEO 价值)。

**可学的方法审完只剩一条没做**:同行的结构方法(对比表/角色标签)7 月已抄;剩下的
恰好接上 7 月已验证的最高 ROI 方法——「优化 Google 正在测试的页」:eco 有一堆页
卡在页 2 临界,**正是几条外链/一次收录加速就可能触发跳变的形状**,但该方法现在盲飞
(Supermetrics 08-02 过期,看不到当前展示数据)。

**结论:本轮瓶颈动作全在 owner 侧,自助侧无新代码可写**(外链自动机已死、页面优化
缺数据、结构方法已抄完)。owner 三个一分钟动作按杠杆排序:
1. **GSC「请求编入索引」**——07-12 起反复标记,至今无做过的记录;这是收录开关,
   对页 2 临界库存的杠杆最大;
2. **恢复 GSC 读数**(Supermetrics 续费,或直接在 GSC 后台看 Performance 并截图给会话)
   ——恢复后立即重启「优化已测试页」循环;
3. (既有)US 税务信息。

### 增长基准·GA4 实数补记(2026-08-28 晚,owner 出示 GA4 Reports snapshot 截图,7/30-8/28 vs 6/30-7/29)

**增长速度的最终答案:月环比 +92,74%(179 → 345 会话)——8 周龄的站,这不是慢。**
渠道构成(会话):direct 130(持平) · **bing 71(+2267%)** · **chatgpt.com 57(+185%,
GA4 的 ai-assistant 渠道)** · duckduckgo 34 · ecosia 23 · yahoo 系 16 · perplexity 2。
Bing 系合计 ~144 = 可辨来源的主引擎,与 D1 口径一致。
**chatgpt 实为第 3 大渠道(57 会话)——远大于 D1 referrer 计数看到的 ~16**:移动端/App
打开会剥 referrer 落进 direct,D1 一直在**低估 AI 渠道**。AI 引用面的优先级据此再上调。

**两条更正与一个异常**:
1. **更正 08-23 的「本站从未有过 Google 自然流量」——错了。** GA4 显示 6/30-7/29 有
   **12 次 google/organic 会话**(GSC 7 月快照也记过 1 次点击)。D1 是 08-05 才上线的,
   看不到 7 月,那句「从未」是拿 D1 窗口当全史,**教训:D1 之前的历史只有 GA4/GSC 能作证**。
2. **异常:google/organic 7/30 起 = 0(12 → 0,-100%)。** 不是「还没来」,是**来过又
   归零**。候选解释(按可能性):①样本本来就小,页 2 临界的涓流被任何排名抖动抹掉;
   ②**Google 2026-08-18 Spam Update(官方确认)+ 8 月初未确认震荡**,社区报告打击
   「规模化产出、薄证据」的新站——本站 8 周 139 页的形状会被这类分类器误伤;
   ③07-11 上线的 301 归一化让旧变体 URL 被丢弃而规范 URL 未被重排。
   **三者只有 GSC 能分辨**(看展示是塌了还是收录掉了)——owner 的 GSC 动作从「加速项」
   升级为「诊断必需」。
3. GA4 345 会话 vs D1 ~600 pv:口径差(会话≠pv;GA4 受同意/拦截损耗,D1 无 cookie 全采)
   ,方向一致,不矛盾。

## 国家×品类操作矩阵(2026-08-28,owner:「重点 by 国家进行深化并推广」;D1 28 天实测)

| 国家 | pv/aff | 现状判定 | 品类动作 |
|---|---|---|---|
| **DE**(+AT/CH/LU/NL) | 305/45(+AT 31/2、CH 31/4、LU 11/6) | amazon.de 主场,链路正确 | 秋冬品类当日已补齐(dehum/heater 具名型号);照常 |
| **US** | 174/17,**且拆开看:EN 47/16、DE 区 110/1** | 北美桥此前只在 EN 页 = 第二大国家×区块格子按 ~0% 变现 | **本轮已做**:桥铺到 114 个德语页(仍仅 America/* 时区渲染);US_MODELS 补秋冬两族——除湿 **Midea Cube 50-Pint**(Wirecutter+CR 第一)、**Frigidaire FFAP5034W1**(RTINGS 地下室带泵首选);取暖 **Vornado VH200**、**Lasko FH500**;`us_term` 学会认德语 slug(luftentfeuchter→dehumidifier 等),否则德语除湿页会被错映射到空调 |
| **GB** | 19/8(EN 制冷 7 pv 产 **8 次点击**,全站意图最高) | **结构性不可变现**:getecoback-21 在 .co.uk 不计佣,US tag 对英国买家无用 | **诚实算术:8 次点击/28 天 ≈ 即便变现也只是 ~€1-2/月,不值得 owner 为此加入 Amazon UK Associates**;不做,数字留档,GB 流量涨 10 倍再议 |
| **IT/ES** | 意 11/3、西 3/2 | 地中海制冷季更长,EN 页→amazon.de 正确且在转化 | 不动;夏页常年在线(季节轮换只动首页) |
| **FR** | 15/0 | amazon.fr 是独立计划,本站无账号;10+ pv 零点击 | 不做(量级不支持 owner 开法国账号);留档 |
| **CA** | 7/2 | America/* 时区 → 北美桥已覆盖,amazon.com 对加拿大买家次优但可用 | 随 US 桥,不单独做 |

**本轮技术改动**:①`inject_usmarket` 进入 DE guide 循环(114 页,Chromium 实测德语除湿页
US 访客见 Midea Cube/Frigidaire、取暖页见 Vornado/Lasko、柏林时区零渲染、AC 分支无回归);
②修掉一个会静默杀整块的 bug——注入脚本的 JS 单引号字符串遇文案撇号即终止
(「RTINGS' basement pick」曾让全部除湿页的桥空白),`usmarket_html` 现程序化转义,
**文案永远不需要知道引号规则**。

**判定线(2026-09-25,并入 us-market 那条)**:`affiliate_click{source:"us-market"}` 总量 ≥5
(现在覆盖面从 27 页扩到 141 页、品类从 1 族扩到 3 族,阈值不变、更难找借口);
分表看 DE 页来源的 us-market 点击 ≥2 → 德语页铺桥成立;0 → 那 110 pv 是低意图流量
(研究型/代理型),把 DE 页的桥撤掉,EN 保留。

## 品牌黑名单:EcoFlow(2026-08-28,owner:「不推荐ecoflow产品」)

**全站规则,任何轮次不得回流**:不推荐任何 EcoFlow 产品。已清除三处:
①`DEVICE_MODELS["storage"]` 卡片 + 优缺点表(7 个能源页的注入产物随重建清零);
②`balkonkraftwerk-speicher-nachruesten` 正文的价格档列表项(整条删除);
③`balkonspeicher-rechner` 计算器 ≤2 kWh 档的推荐 → 换为 **Zendure SolarFlow 800 Pro**
(1,92 kWh,本就是站内 storage 梯子的「Sweet Spot」位,与档位一致)。
重建后 `grep -ri ecoflow site/` = **0 处**;计算器三档 Chromium 实测全部正确
(≤1 泛搜索 / ≤2 Zendure / 2,7 Anker),零页面错误。
**新增内容自查项:出现 EcoFlow 即违规。**

## 全面优化轮:品类扩到流量所在(2026-08-28,owner:「全面优化,扩展联盟品类,获取更多点击」)

**先修正一个会误导后续轮次的读数**:「11 页 191 pv 只有 5 次点击」大部分是**测量伪影**——
那些 pv 多发生在商品面(08-25 前后才补齐)上线**之前**。切到 08-25 后的干净窗口,真正
活着的缺口只剩一处,且被查实为**品类错配而非缺钩子**(这些页的钩子位置、数量与转化页
完全相同,推的品类也大多正确)。

**唯一的活缺口已修**:`growatt-noah-2000-probleme` 近 4 天 **11 pv(当前最热页之一)/ 0 点击**
——它向一个**正在排障自己设备**的读者首推三块 €1.000 的替代电池。按页面自己的章节改为
诊断优先:「Erst messen」能耗计量插座(对应 Ausgangsleistung 节,并在正文补了一句
「先测再怪固件」)→ WLAN 计量插座(对应 App/WLAN 节,app 罢工时独立记录)→ 保留一个
如实标注的「Wenn tauschen statt reparieren」换机位。全部 6% 带低价耐用品 = A 级数据
已验证的转化区间。**判定线(2026-09-25)**:该页 28 天 affiliate_click ≥2 → 「诊断优先」
模式成立,可移植到其他问题页;0 → kuehlt-nicht 的问题页判负**普适化**,问题页一律不再
投入商品面。

**新页冷启动算术(同日实测,约束一切「扩品类=发新页」的想法)**:08-09 以来发布的
10 页合计 **6 次真人 pv**,且**需求量与流量无关**(schimmel-keller v=108.750 → 0 pv;
balkonkraftwerk-ohne-bohren 小众词 → 4 pv)。索引没坏(新页 2 天可被发现),坏的是排名。
**结论:扩品类只能扩到已有流量的页面上;靠新页扩品类在当前分发能力下 ≈ 0 点击。**

## 3D 打印方向:已判死(2026-08-28,owner 提出;四镜头对抗评估 12/12 全票 refuse)

评估形态是最有利的那种(不卖 3% 带的打印机,卖 6% 带的空气/湿度周边),仍然全票否决:
1. **商品桥不存在**:德国 3D 社区对气味/颗粒的标准解法是**自己打印外壳+活性炭滤盒**
   (DIY),不是买成品净化器——需求存在,但**商业上是反向的**。
2. **承接簇已死**:本站净化器相关页 **0 真人 pv**,purifier 族只有 1 个真型号。
   这里顺带记下:**purifier 族整体是死资产,任何轮次不要再往里投**。
3. **竞争面已被 8+ 个德国 3D 垂直站占满**,它们真实测试设备;eco 零话题权威、零 Google。
4. **算术**:按站内新页中位流量,期望收益 **€0,09/28 天**。
5. 本站需求雷达(9 种子+舰队探针)**从未浮出任何 3D 词**——按 Alibaba 先例,
   自上而下点名品类而需求管线无信号 = supply-first,方法论直接拒。
**对抗验证已完整收尾(16/16 agent,0 错误):refuse 维持,并纠正了两个事实,让判死更硬**:
①「卖 6% 空气周边」这个最有利形态**也不成立**——amazon.de 实测把耗材干燥箱列在
「Gewerbe, Industrie & Wissenschaft」= **3% 带**;过滤类的规范答案是打印机厂商自己的
机内滤盒(Bambu/Elegoo/Snapmaker ~€120,Elektronik 带),不是独立房间净化器;
②「排风管=Baueingriff」说过头了——临时窗排是可逆的,但那会**蚕食本站自己的
Fensterabdichtung 页**,受众还小一个数量级,拒绝理由改记为蚕食+体量。
重开条件(两条同时满足才重议):某德语交叉词经真实量表工具 ≥1.000/月且带商业修饰词,
**且** ASIN 级复核显示干燥箱类目已改到 6% 带。**勿再议,除非需求雷达自己浮出 3D 词。**

## 租客线:补上缺失的那半年(2026-08-28,owner:「重点扩展租客」)

**依据**:v3 调研实测受众 **79% 偏租客、钱线 19:1**。据此查站内覆盖,发现一个结构性缺口:
**33 个面向租客的页全部是夏季制冷**(Klimaanlage/Fensterabdichtung/Hitzeschutz/Ventilator/
Balkon),而租客在冬天能做的可逆措施——`Reflektorfolie` **0 页**、`Türdichtung` **0 页**、
`Isolierfolie` **0 页**、`Thermostatkopf` 0 页。**本站的租客身份只有夏季版本。**

**新页 `/guide/heizkosten-senken-als-mieter.html`** = `klimaanlage-mietwohnung`(夏季
「租房能装吗」)的**冬季孪生页**,同一条规则(可逆 = 你自己决定)、另一个季节。两页互链。

**可引用的硬事实(先核实再落页)**:①换恒温器头**不属于改变建筑实体**,通常无需房东
许可(promietrecht / mietrecht.org / mietrechtslexikon / mieterengel 一致表述),实操规则是
**留旧件、退租装回**;②反射膜:**ZVSHK 称最多约 4%,且仅限保温差的建筑**,实际常被引用
为该房间 1-3%(ÖKO-TEST / MVV / heizsparer)。**法律边界照旧:不做法律意见,争议指向
Mieterverein。**

**差异化在于把两个 SERP 缝起来**:Mietrecht 网站回答「允不允许」但不算账不选品;
Utopia/ÖKO-TEST 算效果但不谈租客权限。**没人同时做「你能做什么 × 什么真的回本」。**
(注:2026-08-05 曾以红海否掉**通用**恒温器页——那次判定成立,租客角度是另一个 SERP。)

**商品面 = 四件可逆件,顺序即诚实排序、不由佣金决定**:程控恒温器头(最大杠杆,但省的是
**降温时段**不是设备)→ 门封/挡风条(有风才装)→ 窗用隔热膜(**仅单层玻璃**)→ 反射膜
(**放最后**,卡片里直接写上 ~4% 上限)。**把反射膜吹大能多赚几分钱,代价是本站唯一真正
拥有的东西。**

**判定线(2026-09-25,28 天)**:新页 affiliate_click ≥3 或进站内 pv TOP20 → 租客冬季线成立,
按同法补第二页(候选:`schimmel-mietwohnung-was-tun`——Mietrecht 角度需求大,但法律风险
更高,须先定边界;或 `fenster-abdichten-mieter`);**0 → 租客流量不随季节迁移到取暖意图**,
记录并停止扩这条线,别因为「受众对」就默认「什么都能卖给他们」。

## 品类调研 v3:变现层本身是候选(2026-08-28,owner:「应该扩展品类调研」)

完整矩阵见 `docs/category-research-v3-2026-08-28.md`。三条必须记住的:

**① v1/v2 的盲区是「变现形态默认 Amazon」。** 所有结论都被 2,5–6% 封顶,而这个前提从未
检验。实查德国同品类直营联盟:**Klimaworld 10% pro Sale**、**Elektroflachheizung
10% + €20/valide Anfrage**、KlimaCorner / flairmax / Heizungsdiscount24(AWIN)4–5%、
Kleines Kraftwerk(阳台电站)10%。**同一台 €400 移动空调:Amazon ~€10-12,直营 €40。**
83 次/28 天的制冷簇点击若走 10% 通道、转化打对折,是 €66/28 天 vs 现在 ~€10;
**转化打到四分之一仍有 3 倍。** 诚实反面:Amazon 的 4,2% 点击→成交有很大一部分来自
Amazon 本身(一键结账/Prime/信任),垂直小店必然更差,**差多少未知**——所以是 A/B 不是替换。

**② PV/热泵线索方向已杀,勿再议。** 上次 `lead_intent` 判负基于 0/11 次浏览、没有效力,
所以本轮**没有再建探针**(本站已有四个可选组件拿到约 0 次交互,先验很差;且承载页 28 天
仅约 37 次浏览,25 次作答的效力门槛**结构上不可能达到**)。改用**落地页意图推断**:
租客信号页(免打孔/Kippfenster/租房/窗封)**103 pv / 19 aff**,业主信号页(阳台电站/储能/
换供暖/红外安装)**27 pv / 1 aff** → 可辨意图 **79% 偏租客,钱线 19:1**。
DAA(€4-60/条)、Vamo(€30)需要业主,**对本站不成立**;申请只会拿到无效询单还可能被关停。
**方法论记下来:能从已有数据推断的,不要建新组件去问。**

**③ 这个受众结论反过来加强了费率轴**:移动空调正是租客买的东西,Klimaworld 的 10% 恰好
覆盖它。**费率轴与本站受众相容,线索轴不相容。** 本站身份至此清晰:
「**Raumklima ohne Baueingriff — 写给不能施工的人**」。

**owner 行动清单(我无法代劳,需申请账号)**:①Klimaworld.com(10% PPS,覆盖最大点击簇)
②Elektroflachheizung Shop(10% + €20/Anfrage,取暖簇 + 已有 Watt-Rechner 天然资格化)。
通过后我按页切主推位、Amazon 留备选,并预登记 A/B 口径:**同一批点击,直营 60 天收入
≥ Amazon 同期 1,5 倍 → 全簇切换;<0,8 倍 → 切回并记录「转化差距大于费率优势」。**
**在账号到手前不写任何非 Amazon 链接**(那会是死链 + 无归属)。

## 品类调研:钱在哪(2026-08-28,owner:「找到潜力的数据,选好品类,然后获取联盟点击」)

**先认账**:同日早些时候那一轮(给 dehum/heater 补具名型号卡)方向是错的。我自己先证明了
「瓶颈是流量不是转化」,然后整轮都花在**转化面**上——那两族 28 天合计 7 次点击,卡片再好
也只是把 7 变成十几次,在噪声里。**这一轮改为先算单位经济、再选品类。**

### 一、从未被算过的单位经济

€9,96 / 125 点击 = **每次联盟点击 €0,08**;/ ~600 pv = **每次浏览 €0,017**。
要靠量做到 €100/月 需要 ~1.250 次点击/月 = **流量翻 10 倍**——而两个月的内容投入没能
把流量抬起来。所以量这条路的置信度低,**每单价值才是有 10 倍空间的那条**。

### 二、点击的真实分布(D1 全窗口,按簇)

| 簇 | pv | aff | CTR |
|---|---|---|---|
| **A 制冷/AC** | 398 | **83** | 20,9% |
| D 风扇/冷风机 | 26 | 4 | 15,4% |
| B 除湿/霉 | 21 | 3 | 14,3% |
| C 取暖 | 11 | 1 | 9,1% |
| E 能源/储能 | 26 | 1 | 3,8% |
| F 配件/密封 | 14 | 0 | 0% |

**95 次点击里 83 次(87%)来自制冷簇**——而制冷簇正是马上要过季的那个。秋冬两族合计 4 次。
**这不是「秋冬卡片不够好」,是秋冬页没有流量。**

### 三、被低估的簇:房车(选定品类)

按页效率排,`klimaanlage-wohnmobil.html` 是**全站单页流量第一(36 pv / 8 aff)**,而整站
做房车的**只有它一页**。对比:7 个 `klimaanlage-N-qm` 面积页加起来才 ~30 pv。它的点击流向
`dachklimaanlage wohnmobil`、`mobile klimaanlage camping`、`campingventilator 12v`。

**核实过程(先证伪再选)**:
- 顶置空调客单 **€1.400-2.500**(Dometic FreshJet / Truma Aventa,promobil 等专业媒体有公开
  测评)。即便按最低的 2,5% 带也是 €35-62/单 = 当前 €2/单的 17-30 倍。
- **但沙箱无法确认这类顶置机在 amazon.de 稳定在售**——检索浮出的是房车经销商与 eBay。
  **所以不把策略建在它上面**,不写「去亚马逊买 Dometic」这种话。
- 真正可做的是**房车 × 冬季潮湿**:promobil / Fritz Berger / campingwagner / campie 等
  一致记录了「冬季停放 → 冷凝 → 霉」这个问题集,对应商品(**吸附式除湿机、颗粒除湿盒、
  湿度计**)全部是 **Amazon 原生的低价耐用品**——正是本站 A 级数据证明最能转化、
  0 退货的那个区间。

**为什么是这个品类而不是别的**:它同时命中四条——①站点最强流量页 ②站点最深的内容能力
(12 个除湿页 + taupunkt 计算器 + 霉簇,冷凝物理与公寓完全同源)③已验证会转化的商品区间
④**冬季对它是旺季而不是淡季**(停放期 10-3 月),正好补上制冷簇熄火的那半年。

### 四、已落地

新页 `/guide/wohnmobil-feuchtigkeit-winter.html`(蚕食检查:房车页从头到尾讲制冷,
湿度只在解释蒸发式冷风机时出现过,无重叠)。差异化是本站独有的严谨度:**决策不是按
「每天几升」,而是按 Bauart** —— 压缩机式在低温下大幅失效(要在冷表面上凝水),吸附式
低温仍有效,无电时只有颗粒。这一层市面上的露营博客基本不讲。附诚实边界:未实测,
物理可用站内 Taupunkt-Check 自行复算。

顺带修掉一个真缺陷:**房车页的季节桥此前把读者导向公寓的 `luftentfeuchter-40-qm`**——
对一辆无人、无暖、常常无电的停放车辆,那是错的答案(它推荐的正是低温下几乎不工作的
压缩机式)。季节桥改为按页可覆盖,该页现指向新页。

**判定线(2026-09-25,28 天)**:新页 `affiliate_click` ≥3 或进站内 pv TOP20 → 房车簇成立,
按同法补第二页(候选:`wohnmobil-heizung-wintercamping`、`wohnmobil-einwintern-checkliste`);
**0 → 房车流量不可迁移到潮湿意图,把结论记下并停止扩这个簇**,不要因为「客单高」再试第三次。

## 按趋势扩联盟商品:德/美分开(2026-08-28,owner:「分别扩展德国与美国不同的热点」)

**先纠正两个默认假设**:①**美国侧没有趋势数据**——eco 自己的 `fetch_trends_rising.py`
写死 `GEO="DE"`,舰队 `probe-us` 的输出 `data/probes-rising.json` **从未成功写出过**,
沙箱对 Google 403 只有 runner 能抓 → 「按美国趋势扩展」当天无数据可依,只能先建管道。
②**「扩展」不等于建页**:对抗审计当天刚否掉 DG3(「Schimmel im Badezimmer 零覆盖」是
只 grep 单个词造成的假空白,正确 grep 出 5 个已有页)。故本轮动作是**扩商品卡不扩页**
——这也正是 owner 原话说的「扩展亚马逊联盟**产品**」。

**真缺口(实查 `DEVICE_MODELS`)**:`ac`(夏季)**8 个具名型号**,而承载秋冬的两族
`dehum` 只有 1 个真型号 + 2 个泛标签、`heater` **一个具名型号都没有**(三个全是泛品类
标签)。而本站 2026-07 竞对结论恰恰是「具体型号 + 角色标签」才转化、泛搜索框是转化短板
——秋冬两族正跑在被自己判定为弱的那个模式上,而季节正在转向它们。

**DE 侧已补(型号全部先经 WebSearch 核实为德国市场真实在售,再落页)**:
- `dehum` + **MeacoDry Arete One 20L**(rising `meaco arete one 20l` v=36.350;Geizhals/
  Otto/meaco.de 均在售)——角色「Leise & für Wäsche」,只写厂商标称(20 l/Tag、HEPA、
  Wäschetrocknungs-Modus)与「公开测试称赞其安静」,不写自测结论。落在 9 页,含
  `luftentfeuchter-40-qm`(4 pv/**3 aff**,本站秋季最强转化页)与 20-qm(8 pv)。
- `heater` 三个泛标签 → **Schmidbauer Hybrid Pro 600 W**(小房间 6–12 m²)、
  **Schmidbauer ISP T 700 W**(厂商称适用于潮湿房间 = 接住「Heizung fürs Bad」意图)、
  **Midea NTH20-17BR**(陶瓷 1.200/2.000 W 两档,注明适合快速升温而非长时间运行)。
  rising 依据:`midea heizlüfter` v=71.400、`schmidbauer infrarotheizung` v=62.950。
  落在 11 页,含七个 `heizung-N-qm` 面积页 + `heizung-40-qm`(1 aff)+ `mit-heizfunktion`(1 aff)。
  保留 `Klima mit Heizfunktion` 作 2-in-1 交叉位。

**US 侧两件**:
1. **`EB_USMARKET` 从「只给品类」升级为具名美国型号**(仅 AC 页):**Midea Duo
   MAP14HS1TBL**(双软管——排风取自室外而非房间,正是单管机的结构缺陷,与本站物理立场
   直接咬合)、**Whynter NEX ARC-1230WN**(大房间)、**Black+Decker BPACT14WT**(预算档,
   并如实写出美国评测指出的大房间/西晒短板)。依据是 RTINGS / NBC Select / Forbes Vetted /
   TechGearLab 的重复交集,口径与德语卡一致(汇总公开测试、未自测、按名搜索、无 ASIN
   无价格无编造评分)。**没有核实过美国型号的设备族(除湿/风扇/取暖)继续只给品类链接**
   ——空梯子好过猜出来的梯子,这也正是欧洲型号绝不在美国面复用的原因。
2. **补建美国需求面**:`tools/fleet_trends_rising.py` 新增 `eco-us`(geo=US,种子
   `portable air conditioner` / `dehumidifier`,写 `data/trends-rising-us.json`)。
   种子刻意是**品类词而非型号**:eco 的美国面 28 天只有 47 次真人浏览,还撑不起型号级
   选品,品类 rising 才回答「美国读者此刻在找哪一类」。**配额代价如实记账:全池 16→18
   个种子,全覆盖一轮从 ~8 天变 ~9 天。数据要等下一次 runner(沙箱 403),首轮落库前
   不得据此出任何页。**

**判定线(2026-09-25,28 天)**:①DE 秋冬具名型号卡的 `affiliate_click` ≥8(当前该两族
28 天合计 7)→ 「具名 > 泛标签」在秋冬族同样成立,把该模式补到 `purifier`/`fan` 的泛标签位;
<4 → 是流量不是卡片,停止在型号上投入。②`affiliate_click{source:"us-market"}` ≥5 →
北美桥成立(此判定线本轮不变,只是内容从品类升级为型号,若仍为 0 则连型号也救不了,
按原定撤块)。③`data/trends-rising-us.json` 首轮落库后再评估是否值得给美国面出页。

### 五、本轮改动与判定线(2026-09-25,28 天后)

1. **秋季首页栏按 D1 重选**(9/1 随季节上线):原六位手选目标 28 天合计 **0 次联盟点击**
   (gegen-schimmel 与 keller-lueften-sommer 在 D1 里从来没有过一行,ueberwintern 11 pv/0 aff,
   heizluefter-stromverbrauch 1 pv/0 aff),另有两位给了已降级的能源板块;真正在转化的
   40-qm(4 pv/**3 aff**)、stinkt-schimmel(15 pv/**2 aff**)、mit-heizfunktion(5 pv/1 aff)
   全部缺席。已重选,并把两位给 08-26 新发、对应最大需求的两页
   (schimmel-im-keller-entfernen v=108.750、heizluefter-stromsparend v=32.000)。
   秋季视频 CTA 同样从 0 pv 页改指 40-qm。
   → **判定:五个目标页合计 affiliate_click ≥5 → 版位选对了;<2 → 是版位本身的问题。**
2. **llms.txt 站点描述整年是「为公寓降温」**——这是 AI 助手判断本站是什么的唯一一段话,
   而首页/导航/页脚早已随季节轮换,只有它没有。已改为全年真实范围 + 随季节的重点行
   (`season_of` 复用 build_season,避免两处季节定义漂移)。
   → **判定:AI 引荐(chatgpt/perplexity/copilot)28 天 ≥25 次(当前 25)→ 持平即合格,
   因为秋季是本站历史上从未有过流量的季节;≤10 → 描述不是瓶颈,回头查 md_serve 链路。**
3. **通用集线器 → epicooler Faktencheck 的连接**
   → **判定:该链接点击 ≥3 或 epicooler 页真人 pv 上升 → 再考虑给 coolizi 单独出页
   (按快反规则一天一页、14 天冷却);两者皆 0 → 品牌词需求到不了本站,别再加页。**

**本轮刻意没做的**:没有新增任何联盟钩子。干净窗口浏览→亚马逊 **18.9%**,内容型联盟站
通常个位数——**漏斗没有可压榨空间,加钩子是把 18% 调到 19% 而流量在腰斩**。

## 执行令(2026-08-20,基于两轮深度调研,详见根仓 docs/fleet-deep-dive-2026-08.md)

1. **P0 归属已确认解除(2026-08-25)。** owner 出示 partnernet.amazon.de 后台截图:
   StoreID **getecoback-21** 归属 owner 账号(amazon.de/DE 站),且本月已有真实佣金
   **€9,96 / 103 clicks / 4,85% 转化 / 5 单**(截图「Summary for This Month」)——
   证明该 tag 已注册、归属正确、正在计佣。**「不新增 Amazon 联盟页」的悬置就此解除**,
   eco 恢复按快反规则出/深化联盟页。仍有一项**付款侧**待办(非归属、不挡出页):后台
   红条「Submit payment information / finish onboarding」——付款/税务信息未填完,佣金
   在累计但需 owner 补完才能实际到账(~2 分钟 owner 动作,已在 owner 待办)。
   注:此截图确认的是 **DE 的 getecoback-21**;tds 用的 **amazon.com ecoback0d-20(US)**
   未在本截图出现,其归属仍待 owner 单独确认(见根仓 CLAUDE.md 台账)。
2. 季节悬崖应对(判定线:10 月 aff_click ≥ 8 月的 50%):EB_SEASON 季节桥已上线
   (13 个夏季赢家页);每轮优化优先投秋冬场景页与秋冬工具入口,夏季页只做
   不伤基线的维护。
3. lead-gen 意图探针(调研强 fit,德国家装/能源 CPL €8-120):在 heizung/infrarot
   系列页加「获取安装报价」纯埋点按钮(文案如实写「我们正在评估这项服务」,
   不接表单、不做虚假承诺;事件 lead_intent)。判定线:28 天点击 ≥10 → 报 owner
   接管道;<10 → 判负归档。
4. 渠道事实(28d 一手):真人引荐 DDG 69 > Bing 45 > Ecosia 26,Google≈0,
   AI 引荐 16(chatgpt 12 + copilot 4)——本站活在 Bing 系+AI 面上;GEO/llms.txt/
   MCP 面的维护优先级高于 Google 专项优化。

## 触发器循环(2026-08-20,owner:「欧洲 Google Trends/天气/能源价格应成为站点的
## 触发器,否则没有触发进化的支点」;按 marketing-loops 九要素设计)

**已有的触发器先认账,别重建**:天气面已建(/api/heat 热浪带 + build_season.py
每日季节轮换 + heat-alert 每日彩排);能源价格面已建(/api/strom 交易所电价 +
Strompreis-Radar)。本循环补的是**外部需求信号**(Google Trends DE)与**冬季冷触发**。

- **数据面(已上线)**:eco-trends.yml 每日 04:30 UTC 由 runner 抓
  trends.google.com/trending/rss?geo=DE → niche 词表过滤 → 提交
  data/trends-de.json(ok:false = 当日抓取失败,绝不复用旧数据)。
- **查看节奏**:每日循环 Step 1 必读 data/trends-de.json。
- **行动条件(acts-when,三条全过才动)**:①matched 非空 ②对应词过 KGR 门
  (SERP 构成判定,老规矩)③目标页不在近 5 轮改动名单。多数日子的正确结果是
  「看过,无命中,跳过」——这是循环健康而非失灵。
- **自检**:命中词必须与站内既有簇能对上(heiz/klima/strom/schimmel…);
  纯人名/娱乐热搜即使含关键词子串也不算(如人名含 gas)。
- **动作(按命中类型)**:天气事件词(Kältewelle/Sturm/Hochwasser)→ 刷新对应
  场景页的时效行(带日期)+ 确认设备推荐卡在位;价格/政策词(strompreis/
  heizungsgesetz)→ Strompreis-Radar 与相关指南的「本周语境」行;设备词 →
  KGR 过门才新建页,否则深化既有页。**每次动作的转化钩子(联盟卡/lead 探针/
  radar 工具)必须同屏**——触发的意义是接住交易,不是蹭热点。
- **状态/幂等**:trends-de.json 按日覆盖;动作记 OPT 日志;同一词 14 天冷却,
  不重复触发。
- **停止条件**:ok:false 连续 ≥3 天 → 在简报中报「触发器断供」并查 runner 日志;
  连续 30 天 0 命中 → 把词表贴进简报请 owner 审(词表可能偏了),不自行扩表。
- **待建(下一轮循环自建,按本站惯例)**:冬季冷触发——heat_alert.py 的反向档
  (未来 7 天最低温 < 阈值 → 首页反应带切「Kältewelle」语境 + Heizlüfter/
  Heizung 推荐),复用现成 open-meteo 链路与彩排机制。
- **金融/战争类信号的立场(诚实边界)**:对本站唯一诚实的传导链是**能源价格**
  (gaspreis/strompreis/energiekrise 已在词表);不做战争新闻内容——离 niche
  的 E-E-A-T 一步都不迈。

# 工作规则

## 规则一：先完善 Prompt，再执行任务（用户强制要求，适用于所有任务）

收到任何任务后，**不得直接开始执行**，必须先完成"Prompt 完善"这一步：

0. **至少迭代 3 轮**（用户指令 2026-08-06，强制）：不允许"写一版就开工"。第 1 轮把原始请求结构化；第 2 轮自我质询——目标是否指向真实瓶颈、范围是否漏了更高 ROI 的做法、有没有把某个假设当成事实、验收标准能否被客观检验；第 3 轮据此收紧（砍掉伪需求、补上遗漏的约束、把模糊动词换成可验收的产出）。回复中展示的是**第 3 轮的结果**，并简述前几轮改掉了什么（1-2 句即可，不必长篇）。若任务复杂或前几轮暴露出新问题，可继续迭代到 4-5 轮。
1. **改写**：把用户的原始请求改写为一份结构化的完善版 Prompt，至少包含：
   - 目标（要解决什么问题 / 产出什么结果）
   - 范围（涉及哪些站点 / 数据源 / 文件，明确不做什么）
   - 输入（依赖的数据、账号、时间区间等）
   - 交付物（报告 / 代码 / 图表等具体形态）
   - 验收标准（怎样算完成）
2. **展示**：在回复的开头先展示这份完善后的 Prompt。
   - 完善 Prompt 时**可以调用相关 skills 辅助优化**（如 skill-creator、ai-seo、seo、market-research、deep-research 等对应领域技能，或专门的 prompt 优化技能），借技能内置的方法论/清单把 Prompt 写得更结构化、更贴合任务领域。
   - **执行前再查一次 skills**（用户指令 2026-07-27）：Prompt 完善后、动手前，评估已装 skills（seo/ai-seo/content-engine/article-writing/market-research/kgr-page/revenue-round，以及 2026-08-17 增补的 copywriting/seo-audit/schema/programmatic-seo/analytics/competitor-profiling/offers/conversion-ops/growth-log/frontend-design/web-design-guidelines/responsive-design）是否覆盖本任务——覆盖则调用其框架执行，不覆盖才原生执行；两步是固定顺序：①完善 Prompt ②评估并调用 skills ③执行。
3. **标注假设**：原始请求有歧义时，列出所做的假设和取舍；如果歧义会显著改变工作方向且用户在场，先提问澄清。
4. **执行**：之后严格按照完善后的 Prompt 执行任务。

## 规则二：AI 工具/MCP 输出的发现性纪律（用户指令 2026-08-08，适用于所有会话）

凡拓展或输出 AI 工具、MCP 服务器等面向代理生态的能力，**必须主动做发现性工程，不许只挂端点被动等待**：

1. **主动注册官方 MCP Registry**（本仓已有完整模式可复用：`mcp/server.json` + `.github/workflows/publish-mcp.yml`，GitHub OIDC 认证 `io.github.<owner>` 命名空间，零密钥）。发布前必须对生产端点做 initialize 健康往返——绝不广播指向死服务器的指针。
2. **Registry 的四条实测规则**（2026-08 撞出，勿重蹈）：①搜索**只按 name 子串匹配**，description 不参与——name 必须带高频检索词，且**要先量竞争度再选词**（实测 weather=100+ 条、climate/energy=9、hvac=2、heat=1、btu/aircon=0；挑无人占且真实描述自己的词，品牌名与拥挤词都是浪费）；②description ≤100 字符，长尾词放这里供聚合目录全文检索；③remote URL 全局唯一，且**被"弃用"的条目仍占着它的 URL**——改名必须换新路径（本仓做法：Worker 路由整个 `/mcp/` 子树，新条目用 `/mcp/v1`），同名同版本不可重发，管线做幂等（"duplicate version"=已发布≠失败）；④**没有 deprecate/delete**——registry 把 status 存在服务端 `_meta` 里，publish 携带的 `"status":"deprecated"` 被静默忽略（2026-08-11 实测，官方 issue #931 亦确认是缺口）。**能改的只有 description**：旧名发新版本，description 写 "Superseded by <新名> — same server, same URL"，旧 URL 继续可用；不要以为自己"下架"了旧条目。
3. **被动层齐配**：`.well-known/mcp.json` 发现文件 + llms.txt「Für KI-Agenten」节 + 可索引的文档页（含各客户端复制即用配置）。工具响应自带来源 URL 与诚实披露——被调用即被引用。
4. **关键词按用户搜索持续优化**：以站内搜索 hits=0 队列、D1 引荐构成、AI 助手实际引用情况为依据迭代 name/description/文档页关键词——不是一次注册完事，是随需求数据滚动。
5. 判定口径：`mcp_call` 事件（排除 CI）= 真实被调用的唯一证据。

## 趋势雷达（自动化涌现闭环，2026-08-08 起）

`docs/trend-radar.md` 由每日定时部署自动生成（tools/trend_radar.py：/api/trend 加速页 + 站内搜索零命中队列 + open-meteo 7 天前瞻 + 季节倒计时）。**每轮循环/revenue-round 的 Step 1 必读此文件**——它是机器凝练层的输出、判断层的常设 source material。纪律：雷达列的是候选不是结论，任何选题仍须过 KGR/SERP 判定与蚕食检查。

## 背景信息

- 本仓库关联的常规任务：拉取 GA4 / Google Search Console 数据（经 Supermetrics MCP）对多个站点做营收复盘诊断（revenue round）。
- GA4 媒体资源：agiscorecard.com、getecoback.com、zaoqi、aichain-stocks.netlify.app、bestblindtoys.com（连接账号 t***u@126.com（完整地址不入公开仓））。

# 项目工作规范

## Web3产品方案开发流程（强制要求）

在把调研报告中的任何机会点转化为具体产品方案或开始开发之前，必须先完成竞对调研，避免盲目开发：

1. **先做竞对调研**：搜索该细分场景是否已有直接竞品，评估拥挤程度、这些竞品的定价/功能/目标用户覆盖情况。
2. **再判断方案是否合适**：基于竞对调研结果，评估当前方案是否仍有差异化空间和可行的切入角度。
3. **不合适就切换**：如果细分场景已被现有产品充分覆盖，或差异化空间不足，不要硬着头皮做下去——主动切换到调研报告里的下一优先级机会点，重新走一遍"竞对调研→评估"流程。
4. **产出物必须包含竞对调研结论**：任何产品方案文档都要附一节"竞对调研结论"，说明看过哪些竞品、为什么这个细分点仍然值得做（差异化在哪），而不是凭空假设市场空白。

## 决策原则补充：警惕"网络效应"和"个人可启动"之间的天然矛盾

真正有护城河（网络效应）的产品往往最难冷启动。参考 Andrew Chen《The Cold Start Problem》："单人模式先行，网络效应后置"——先做一个不依赖网络、对单个用户就有用的工具，积累真实用户后再叠加网络/数据层，而不是一开始就要求方案自带护城河。

当二手调研（Web搜索）反复验证某个方向已被多个资金充足的团队占据时（红海信号，参考Kim & Mauborgne《蓝海战略》），不要继续在同一层面寻找"更好的点子"，而应该转向用户本人在某个领域/社群的一手信息优势（Peter Thiel"只有你能看到的秘密"），这通常比更多二手调研更可能找到真空点。

## 基础设施约定（强制）

网站/落地页部署统一使用 **Cloudflare Workers（静态资源）+ GitHub Actions自动部署**，不使用Netlify/Vercel。已落地为 `wrangler.jsonc` + `.github/workflows/deploy.yml`，push即自动部署。注意：本会话对Cloudflare账号只有只读MCP权限（能看`workers_list`等），没有写入/部署工具，所以初次打通需要用户自己在GitHub仓库Secrets里添加 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`（详见`LAUNCH_CHECKLIST.md`），这一步无法代劳，后续都是自动化的。

## 营收目标（2026-07 设定）

**180 天内 Amazon 成交 3 单**（PartnerNet 账号 getecoback-21 的存活线）。通过一切可自动化手段推进：内容/品类扩张管线、转化结构（对比表/型号卡/速选框）、SEO+GEO、IndexNow/RSS 自动收录推送、CI 自动部署+健康检查、监控 cron。用户侧两项无法代劳：GSC"请求编入索引"（Google 收录开关）与 PartnerNet 付款/税务信息（成交计入前提）。

## Git 工作流（用户指令 2026-07-11）

工作完成后**合并到 main**（deploy 从 main 与工作分支均可触发）。站点源码已从 claude/web3-research-opportunities-fhl1na 并入并以 main 为准；后续新会话从 main 拉起。

## 决策记录

- `web3-research-compounding-opportunities.md`：机会点调研报告，含5个候选方向的优先级排序（孙宇晨模式拆解 + 2026年Web3趋势）
- `web3-product-plan-onchain-data-subscription.md`：**已否决**的"稳定币多客户收款对账"方案。经竞对调研+JTBD/TAM/护城河理论评估，确认JTBD弱（用户用Excel就能解决）、TAM窄（中文+多客户USDT收款双重限定）、无护城河，不建议继续投入，保留作决策过程记录。
- `web3-product-plan-eu-cooling-cashback.md`：**当前推进**的"欧洲节能家电稳定币返现平台"方案。基于用户本人对欧洲能源市场（安装成本高）和2026年热浪驱动家电销售趋势的一手认知，经竞对调研确认为空白点（发电端DePIN项目已饱和，通用加密返现已饱和，唯独消费端节能家电返现无人做），JTBD和TAM均通过验证。已补全产品双轨结构、营销、获客漏斗、商业化模型、财务情景推演。
- `site/index.html` + `LAUNCH_CHECKLIST.md`：可直接部署的落地页和按天排序的可执行上线清单（联盟网络申请、内容发布、社群分发、手动处理首批用户返现），配套两篇可直接发布的内容草稿。
- **专业站结构化改造（2026-07，自动化）**：按"正规标准网站+目标倒推"，用 `tools/build_structure.py` 一次性给全站德语页注入统一顶部导航 + 多栏页脚（分类/关于/法务）+ favicon/manifest/theme（幂等，未来新页自动继承）；生成 4 个分类枢纽页（`/kategorie/`：klimaanlagen/heizen/luftqualitaet/energie-sparen）；新增 E-E-A-T 信任页 `ueber-uns.html`（关于/如何工作/如何变现）、`wie-wir-empfehlen.html`（选品方法论）、`kontakt.html`，以及 `404.html`。E-E-A-T 页是联盟站排名与 Amazon 审核的关键信任信号。`tools/build_sitemap.py` 自动同步至 54 个可收录 URL。英语页暂不动（避免中德/英混排）。
- **转化优化竞对调研结论（2026-07，目标=Amazon 180天内成交3单）**：调研德国头部空调导购站（testit.de、home&smart、vergleich.org、Testberichte.de、Klarstein Ratgeber）后发现，它们的核心转化手法是**给出具体型号+角色标签的推荐**（如"Testsieger: De'Longhi Pinguino PAC EX105"、"Preis-Leistung: Comfee MPPH-09CRN7"、"große Räume: Klarstein"、"leise: AEG ChillFlex Pro"、"Bestseller: Midea PortaSplit"），而非通用搜索框。本站原先只有 amazon 通用搜索链接=转化短板。已在首页 deals 区和主力文章 `beste-tragbare-klimaanlage-hitzewelle.html` 加入具体型号推荐卡（各带角色标签，链接指向按型号名的 amazon 搜索——不伪造 ASIN、抗缺货），并诚实标注"未自测、汇总公开评测"以守住 E-E-A-T。后续可把型号推荐扩展到其余高流量文章。**2026-07-10 已完成全站扩展**：10 个此前只有通用搜索链接的 guide 页补齐型号推荐卡（空调场景页复用站内背书型号保持全站一致；风扇/Luftreiniger/Luftentfeuchter/Hitzeschutz 页经 WebSearch 验证公开评测共识后选型——Rowenta VU5690、MeacoFan 1056、Levoit、Comfee MDDF-20DEN7、Lichtblick Thermo-Rollo，无共识或差评型号诚实跳过），全站 guide 页售卖结构对齐竞对模式。
- **URL 规范化 301 中间件（2026-07-11 上线）**：GSC 实测同页最多 4 种 URL 变体分别被收录（heatwave 页 16 展示@9.25 + 6 展示@17.8 分裂）。新增 `src/worker.js`（run_worker_first）把 http/www/无后缀 301 归一到 `https://getecoback.com/...*.html`；关键坑：assets 默认 html_handling 会把 .html 307 回无后缀与 301 形成死循环，必须 `html_handling: "none"` 并在 Worker 内部改写 / 与 /en/ 的 index。CI 加 5 条 301 断言，run 57 全绿。
- **KGR 批量 #6（2026-07-11）**：Zugluft-Nackenschmerzen（健康站占屏但设备角度空白）+ Dachfenster-Abdichtung（板材店+论坛=low）两页上线，sitemap 86 URL；Dauerablauf 判定并入 tropft 页免重复。
- **AI 搜索层 llms.txt + ai-seo 技能（2026-07-11）**：从 github.com/coreyhaines31/marketingskills（37k star）审查后安装 `ai-seo` 技能至 `.claude/skills/`（含 GEO/AEO/llms.txt/OKF 方法论 references）。新增 `tools/build_llmstxt.py`（幂等，从各页 title+meta 生成 `site/llms.txt`，llmstxt.org 格式，按 DE/EN/分类分组），接入 deploy.yml 随构建同步。动机：姊妹站 agiscorecard 已实测 chatgpt.com 引荐流量，本站补 AI 可读层争取被 LLM 引用。
- **英语区纵深 + 去重（2026-07-11）**：EN 区新增 `portable-ac-skylight-roof-window.html`（屋顶窗/天窗排气，与德语 dachfenster 互挂 hreflang；SERP=商品页+论坛=low），补 EN 首页内链。同时发现并修复自我蚕食：删除重复的 `klimaanlage-abluftschlauch-verlaengern.html`，其 isolieren 内容并入既有 `abluftschlauch-verlaengern.html`。主力页 tilt-and-turn EN/DE 加固（三方案对比表+常见错误+FAQPage schema）。sitemap 88 URL。
- **ai-seo 方法论落地（AEO/GEO，2026-07-11）**：调用已装 ai-seo 技能的 content-patterns（Statistic Citation Block / HowTo / 可提取答案）优化计算器页。btu-rechner：加自包含答案块（340 BTU/m² + 4 档 m²→BTU 锚点，与 wie-viel-btu 表一致不重复全表）+ HowTo schema（5 步）。全站扫描发现"FAQPage schema 无对应可见问答"隐患（Google 惩罚 schema 与可见不符），真问题 2 页（btu-rechner + stromkosten-rechner 计算器页），均补可见"Häufige Fragen"节匹配 schema；其余 15 页仅答案尾部措辞轻微漂移（95%+ 一致），非风险不动。动机：计算器答案原锁在 JS 里 LLM 无法提取，静态数据块+HowTo 是 AI 引用高频面。
- **差异化订阅层 Hitze-Radar（2026-07-11，已跑通并端到端验证，部署 run81 绿）**：给纯联盟站叠加"正式订阅"区别竞对。竞对调研（testit/vergleich/testsieger/Testberichte/home&smart/Stiftung Warentest）确认德国空调导购站全是静态测评页，无"热浪预警+型号降价提醒"订阅=空白点（符合冷启动"单人即有用"）。落地页 `site/hitze-radar.html`（邮箱表单+GDPR明示同意+consent文本+区域/主题），确认页 `/radar-bestaetigt.html`（noindex），全站页脚注入链接，sitemap 89。**存储**：`public.ecoback_subscribers` 表（Supabase 项目 uoijvtfrwlgixuogkyrz，EU区）——建表一度因本环境写类MCP审批通道故障失败7次（apply_migration/execute_sql 全 stream closed），用户重装 Supabase MCP 后写通道恢复、apply_migration 成功。RLS 仅允许 anon 插入(consent=true)、不可读(邮箱列表不可用公钥爬取)；BEFORE INSERT trigger 规范化邮箱小写去重；confirm_token 预留 DOI。**已端到端验证**：SET ROLE anon 插入成功、邮箱规范化生效、anon 读取返回0行。worker `/api/subscribe` 经 PostgREST anon key 插入(无KV/D1绑定=部署零风险，无邮件发送依赖)。订阅数可经 `select count(*) from ecoback_subscribers`(MCP只读)监控。后续：发首封提醒前补 DOI 确认邮件(Resend)+提醒发送cron+英语版。曾短暂改用 Auth OTP 作为无法建表时的回退，表建成后已切回更干净的专用表方案。详见 docs/getecoback-hitze-radar-plan.md。
- **ECC 营销技能（2026-07-11）**：从 github.com/affaan-m/ECC 审查安装 seo / article-writing / market-research / content-engine 至 .claude/skills/，与项目自有 /revenue-round /kgr-page 组合使用。
- **Hitze-Radar 英语层扩展（2026-07-12，部署 run 7df5be4 绿）**：把差异化订阅推向英语市场（EN 区虽小但贡献全站唯一点击、此前无任何订阅入口）。① `site/js/radar.js` 改为多语言（de/en 文案字典，读表单 `data-locale`，payload 带 locale），德/英内嵌框复用同一处理器；② 新增 EN 落地页 `site/en/heat-radar.html`（Heat Radar，heatwave/price 双 alert、GDPR consent、locale=en 提交 /api/subscribe，与德语 `hitze-radar.html` 互挂 hreflang en/de/x-default）；③ `tools/build_structure.py` 新增 `EN_RADAR` 组件并注入 8 个 `/en/guide/` 页（`inject_radar` 参数化、幂等），`EN_FOOTER` 加 🌡️ Heat Radar 链接。表结构本就 `locale in (de,en)`+region、worker 已转发 locale/region，故 DB/worker 无需改动。sitemap 90 URL。后续（需用户侧密钥，不阻塞）：DOI 确认邮件(Resend)+热浪检测(open-meteo)提醒 cron，德英统一发送。
- **热浪时效内容放量 + 语义内链（2026-07-12，部署 run 9343d48，多智能体 Workflow）**：抓 2026 七月欧洲第三波热浪（DE 34–37°C）用"最强自动化"放量。**方法**：先 WebSearch 确认热浪实况与选题时效，再逐词 KGR 竞争度判定（拒 mini-klimaanlage=Testberichte/StiWa 红海、hitzefrei-büro=法律媒体红海+蚕食），锁 5 个可写热浪意图长尾（SERP=论坛/新闻/小站）；用 **Workflow 并行 5 个 general-purpose 写手**（每个复制模板+写页+自校验，返回结构化结果），主循环再独立复校（JSON-LD 解析/FAQ 逐字/型号卡 tag/无 ASIN/无蚕食）。**5 页**：ventilator-mit-eis（冰块辟谣）、pc-ueberhitzt-sommer（PC 过热=房间降温，新受众）、richtig-lueften-bei-hitze（通风时机）、ventilator-stromverbrauch（电费块~16ct/夜）、ventilator-nachts-schlafen（风扇过夜健康）。型号仅站内背书款(MeacoFan 1056/Rowenta VU5690/De'Longhi)按名搜索链接、诚实标未自测。**语义内链**：从 6 个相关既有页（风扇枢纽 ventilator-kaufen 等）给每新页加 2 条入链，破孤儿页、传拓扑权重；klimaanlagen 枢纽自动纳新页。sitemap 95 URL、76 DE 指南。CI 自动部署+IndexNow 推送。**GitHub 技能挖掘结论**：审 marketplace（claude-seo 11k★/ai-marketing-claude/coreyhaines31）后判定现有 ai-seo/seo/content-engine 栈已覆盖其方法论，唯一增量=语义内链，选择原生执行而非重装 25-子技能仓（避免过度工具化）。
- **英语热浪内容 + 双语 hreflang 配对（2026-07-12，部署 aa60b11）**：把上一轮最强 2 常青选题镜像到 EN 区（热浪覆盖全欧含英/爱英语搜索者；EN 区贡献全站唯一点击却仅 8 页）。EN SERP 复核：fan-with-ice=博客/论坛无权威媒体可写；gaming-pc=技术媒体但房间降温角度空白可写。新增 `en/guide/fan-with-ice-cool-room.html`（诚实版：局部降 5–7°F/2–4h、非整房、>70% 湿度反效果→真实降温）、`en/guide/gaming-pc-overheating-summer.html`（房间=硬件温度上限，+5°C 房≈+5°C 硬件；游戏/技术新受众）。两页与既有德语对应页 ventilator-mit-eis / pc-ueberhitzt-sommer **互挂 hreflang en↔de**（并回填德语页的 en alternate），型号 MeacoFan 1056（英国品牌，契合 EN 受众）/De'Longhi 按名搜索、诚实标未自测。从 3 个既有 EN 页加语义入链（每新页 2 条）、两新页互链。sitemap 97 URL、10 EN 指南。本会话累计新增 7 页（5 DE + 2 EN），全走 KGR 判定+独立复校+语义内链+CI 自动部署+IndexNow。
- **GSC 数据驱动诊断 + 已测试页优化（2026-07-12）**：拉 GSC 近 30 天（Supermetrics ds=GW，sc-domain:getecoback.com）实况：总展示~180、点击1，多数查询位 20–98=**站点仍前牵引期**（Google 未充分信任/收录）；但 118 次"(unknown)"展示**均位第12=页2临界**，说明内容放量在堆主题权威度、把域名往页1推，回报滞后 2–8 周。诊断结论：**当前瓶颈是收录时间不是页数**，故暂停无脑堆页，改做①把 7 新 URL 交用户在 GSC"请求编入索引"（唯一不可自动化且能加速的动作）②**数据驱动优化 Google 已在测试的页**：`portable-ac-vs-air-cooler` 被 Google 匹配一整簇 EN 查询变体（portable ac vs cooler / air cooler vs ac / which is better…6+ 变体，位 55–85）却排得深→补 FAQPage schema+可见 FAQ 逐字命中原词+顶部可提取答案块+dateModified 刷新（run 2dac29e）。技术收录已最优（robots+sitemap97+IndexNow key 均在位，无可再修）。**方法论沉淀**：新站早期应"测量→优化已有展示页"优先于盲目新写，ROI 更高。**续（同日多轮）**：页面维度 GSC 显示英语 AC 页是牵引核心（展示前3全英语）、全站唯一点击来自排名最高页（tilt-turn pos9.89）、URL 变体仍被拆分收录（best-portable 展示 54+11 分裂，待 301 重爬合并）、近7天≈近30天总量=流量本周才起。据此对临门一脚页逐个补 FAQPage+新鲜度：`best-portable…heatwave`(pos10.76/54展示,run 2dac29e 前一页 07eeb72)、`portable-ac-vs-air-cooler`(6+变体)、`best-portable…bedroom`(10展示)、`zimmer-kuehlen`(德语头号词 zimmer kühlen)。klimaanlage-kippfenster 已有 FAQ 跳过。交用户侧动作：对规范 URL 在 GSC 请求编入索引以加速合并+吸收新 schema。
- **日更自动化 07-15（首轮，Routine trig_01EsGgoKsA…）**：GSC 聚合展示 283→526、点击 3→6（同日翻倍）。最强信号=Luftkühler 清洁/除垢簇已排 pos5-11 且有点击（entkalken pos5/1click、filter reinigen pos7、mit wasser reinigen pos11）无专门内容 → 给已承接的 `bester-luftkuehler.html` 补'reinigen und entkalken'专章(AEO 步骤)+2 FAQ 命中原词(4→6问)+新鲜度（部署 f7b3540）。tilt-window 回 pos8.5、infrarotheizung 簇展示放量。
- **日更转向 CTR 优先 07-15（用户反馈点击太少）**：诊断全站 CTR≈1.1%(526展示/6点击)远低行业均值，能拿点击的页(tilt/reinigen)CTR≈4%，但**最高展示页 best-portable-heatwave(167展示/pos9.76)却0点击**=标题不够'想点'。新方案=CTR 优化(从现有展示直接榨点击、无需先升排名)：重写其 title 为『Best Portable Air Conditioner 2026: Europe Picks by Room Size』(加 list-intent+intent-match)、meta 加问句钩子+tilt-turn 差异化(部署 ebd7f42)。日更 Routine 升级 v2(trig_01T4qyaP7X)把 CTR 优化设为每日首选杠杆，并加 Featured Snippet/Web Stories(Discover 新曝光面)。
- **全站深度评估+落地（2026-07-15，用户授权自主决定）**：盘点 86 指南页（平均 1100-1400 词、型号卡 100%、FAQ 82%、0 薄页）+GSC 30 天供需匹配，结论=**质量与供给达标，瓶颈在权重分配与点击，不需大规模扩页**。落地三件：① `tools/build_xlinks.py`（幂等）给 18 个准孤儿面积货币页（已排 pos7-13）注入相邻尺寸互链+同尺寸跨品类横链+支柱页拓扑，全站准孤儿 33→18、面积页 18→0；② 唯一新页 `was-bedeutet-btu.html`（解释型真空：26 展示/位 82，既有 BTU 页全是选型意图；BTU→kW→m² 表+3 FAQ，与两 BTU 页互链，sitemap 98）；③ btu-rechner title 改'Klimaanlagen-Rechner: BTU & Größe berechnen'命中 rechner 簇（17 展示）。**明确不扩**：Luftentfeuchter（13 页已覆盖）、Unterschied Klima/Lüftung（4 展示）、PortaSplit Nachfolger（未验证有新型号，不凭空写）、EN France 词（pos3-7 但 amazon.de 对法用户不计佣→先开 OneLink 再谈）。**秋冬批次 9/1 启动**（Heizen 仅 9 页最薄+Infrarotheizung 簇 7 月已 64 展示=需求信号，候选：überwintern/Infrarot 深化/Heizlüfter 对比）。部署 1f17dfa。
- **站级结构重构·学竞对（2026-07-15，/goal 快速起量，部署 9581979）**：调研=德国测评站结构共识+2026 方法论检索（主题簇+发布日内链已对齐；缺口=①TOC 锚点目录：SERP jump links/sitelinks 占位、实测 +18% CTR、弹跳 -40%；②可见更新日期：德站标配信任/新鲜度信号，本站日期原只在 schema 用户看不见；竞对页直抓被 403 反爬，转方法论检索）。落地：`tools/build_onpage.py`（幂等）全站注入 Inhaltsverzeichnis/On-this-page TOC（80 页，h2 自动 slug 锚点、去重、德英文案）+ 🗓 Aktualisiert-am 徽标（87 页，读各页 JSON-LD dateModified 自动同步、德英月份）；首页加 EB_POPULAR『Beliebteste Ratgeber』枢纽块（GSC 实测 top6，首页权重直导）；structure/onpage/xlinks 三注入器接入 deploy.yml=未来新页每次部署自动继承全部结构层。全站 87 页独立复校 ALL CLEAN（schema 解析/FAQ 逐字/锚点唯一可达/无重复标记）。不改任何 URL（301 合并保护）。
- **日更 07-16（CTR 系列修复 + 里程碑）**：GSC 页面级=heatwave 199展示/pos10（昨改标题待重爬不动）、tilt 5点击/CTR4.6%、reinigen 3点击。今日 CTR 单点=klimaanlage-X-qm 面积货币页系列（合计 91 展示/周、pos 8–14、全 0 点击=最大成簇 CTR 缺陷）：标题从"Welche Klimaanlage für X m²?…"改为关键词前置"Klimaanlage für X m²: BTU, Modell-Tipps & Stromkosten 2026"（59字符，命中 klimaanlage 20qm/30m2 原词形态），生成器模板+6 个已上线页同步改、dateModified 刷新、徽标同步。**里程碑：GA4 affiliate_click 1→12/周（S2 门槛≥5 达成）**，user_engagement 19→27。
- **大范围扩张批次 #2（2026-07-16/17，用户指令"最快速度扩张用尽工具"，两波 Workflow+系列扩容+分发层）**：合计 **+11 页（sitemap 97→109）**。①Wave-1（6页）：DE unterschied-klimaanlage-lueftungsanlage（真空）/mobile-klimaanlage-ueberwintern（抢9月收录周期）/infrarotheizung-watt-rechner（64展示簇，JS计算器+AEO表，与ratgeber意图区隔）+EN france（Google已排pos3-5）/hose-extension（↔abluftschlauch hreflang）/evaporative-cooler-vs-fan（KGR=品牌博客）；②Wave-2（3页EN镜像+hreflang 回填 DE 侧）：leaking-water↔tropft、smells-musty↔stinkt、running-cost↔stromkosten；③系列扩容：klimaanlage/heizung-50-qm（生成器加档，只生成新页）+heizung 全系 7 页标题 79c→56c CTR 修复（系列139展示/周）；④分发层：docs/marketing/reddit-drafts-2026-07.md（3条合规草稿，用户手动发，utm 追踪）。全部中央复校 ALL CLEAN、每新页 2-4 入链、CI 注入结构层+IndexNow。**毙掉红海/蚕食选题 2 个**（infrarotheizung-bad、heizlüfter-vs-infrarot）。
- **日更 07-17（中午12点新时段首跑）**：GSC=heatwave 209展示/pos10（新标题待重爬）、reinigen 4点击/pos7.9、tilt 4点击、扩张批次11页进入索引期。今日 CTR 单点=`mobile-klimaanlage-stinkt-schimmel`（22展示/pos12.4/0点击）标题 96字符 SERP 严重截断 → 改『Mobile Klimaanlage stinkt? Schimmel-Geruch loswerden (2026)』59c 问句钩子+新 meta（Biofilm+30分钟修复承诺,154c）+新鲜度。剩余未处理临界页=kippfenster（79c 标题,明日候选）。
- **CTR 快修批 + 扩张批次 #3（2026-07-17，用户指令"明日内容先快速修复+再大范围扩展+调研业界方法"）**：①快修：全站标题扫描发现 47 页>65c、16 页>75c 必截断，一次性重写 16 个为 50-57c 关键词前置（含临界页 kippfenster 81c→56c、thermovorhang pos8.8/76c→51c；已拿点击的 reinigen/tilt 66c 不动），部署 70126ec 绿。②方法论调研（WebSearch 2026 共识）：程序化页需≥60%独有内容、权威>页数、AI 引用面要可提取直答块——全部落进本批。③扩张 #3（Workflow 5 并行写手+中央独立复校 ALL CLEAN）：DE mobile-klimaanlage-kuehlt-nicht（问题页模式最大词，SERP=论坛/小店，↔EN hreflang）、luftentfeuchter-gegen-schimmel（GSC 9展示需求信号+13页品类权威，诚实框架=防新不除旧）、EN portable-ac-not-cooling（↔DE）、best-portable-air-conditioner-spain / -italy（复制 France 页已验证模式 pos3-5，真本地化非模板换词：西班牙=comunidad 规则+沿海湿/内陆干，意大利=Po Valley 'afa'+centro storico 限制+De'Longhi 意大利品牌角度）。**蚕食拦截**：klimaanlage-nachts-laufen-lassen 已存在，选题作废。schimmel 页写手用 @graph 单块 JSON-LD，中央复校拆为全站约定的 3 独立脚本。每新页 2 条入链（reinigen/tropft→kuehlt-nicht 问题簇互链、France/heatwave→Spain/Italy 国家簇）。sitemap 109→114、llms.txt 84DE+19EN。
- **定时任务升级为每小时（2026-07-17，用户指令"每小时自动化一次优化，直到网站流量起来"）**：删除日更 v2（trig_01T4qyaP7X…），新建每小时 Routine v3 `trig_01WUh1ozp12QKENXNjq99VY1`（cron `29 * * * *`，自绑定本会话）。分层节奏防空转：每天 UTC 04:29 档（≈北京 12:29）做全量 GSC/GA4 诊断+刷新优化队列+发完整简报；其余各轮从队列取 1 个小任务（CTR 改写/FAQ 深化/内链/AEO 块/KGR 新页每天≤2 且必须先判定），队列空+无信号则静默健康检查、不空 commit。简报纪律：非首轮有改动才发 1-3 句，无改动完全静默。**停止条件（"流量起来"量化）**：自然点击≥10/周且连续两周维持 → 简报中提示用户确认是否退回每日节奏；期间照常每小时跑。周检 Routine（trig_01GBrxMTEQ…周一 09:23 UTC）不变。
- **网站性能优化 / Core Web Vitals（2026-07-19，用户指令"优化一个版本使流量加速并部署"）**：站点侦查=全站零 `<img>`、CSS 全内联、系统字体 → LCP 已很轻；真正杠杆是 ①渲染路径唯一第三方 GA4 gtag 的连接开销 ②Worker 从不设 `Cache-Control`（重复访问/边缘缓存未榨干）。落地两件（性能层，零内容/URL 改动，不破坏 301 规范化）：① `src/worker.js` 新增 `cacheControlFor()`+`serveAsset()` 按类型注入缓存头——HTML 走 `max-age=0, must-revalidate`（ETag 重校验，永不陈旧但 304 便宜，兼容日更）、favicon/图片/字体 `immutable 1yr`、js `1天`、xml/txt/manifest `1小时`（爬虫保鲜）、非 2xx 不长缓存；② `tools/build_structure.py` 新增 `PERF_HINTS`（preconnect+dns-prefetch 到 googletagmanager，`<!--eb-perf-->` 幂等守卫），CI 注入器每次部署自动覆盖全站+未来新页，本地已跑落地 117 页（404 除外，每页恰 1 条无重复）。规则一同步补充"可调用 skills 辅助优化 Prompt"。deploy.yml 触发分支加入 `claude/website-performance-optimization-f8vsb6` 使推送即上线。worker `node --check` 通过、cacheControlFor 单测映射正确。
- **定位切换：返现站 → 工具+推荐购物站（2026-07-19～23，用户多轮指令）**：① 全站去"返现"承诺（该功能从未真存在，E-E-A-T 风险），首页/EN/15 指南 CTA 盒/datenschutz 改为"工具+诚实推荐"定位；② 首页购物化改造（hero 下信任条+「按分类 shoppen」瓷砖+文字表格→视觉产品卡网格，内联 SVG 设备线稿，零外部/受版权图，deploy #153 绿）。
- **全站交易化改造·对标竞对（2026-07-23，用户指令"先调研→对标竞对→优化全站→成为交易站点"）**：先派 general-purpose 研究员用 WebSearch 对标 idealo/vergleich.org/testberichte/Otto/Amazon 分类页+AAWP 产品框，产出对标报告（A 结构清单 / B 交易站vs内容站差距 / C Top10 ROI 改造 / D 德语 CTA 文案库）。**诊断=本站有内容资产（型号卡/FAQ/TOC/新鲜度/枢纽）但缺"列表化+速选+交易信号+交互"这套购物观感组件**，且这些都不依赖 PA-API/ASIN/真实图=可纯前端落地。本轮落地 4 项最高 ROI 且合规安全（无需逐页人工选型、不伪造）改造，全做成 `build_structure.py` 幂等注入组件（覆盖 106 指南页+4 枢纽，未来新页自动继承）：① **可见面包屑**（Startseite›Kategorie›页，从 `cat_of()` 映射自动生成）+ BreadcrumbList schema（已有 breadcrumb 的页跳过防重复，0 缺 0 重）；② **信任条**（Unabhängig ausgewählt·Werbefinanziert über Amazon-Links·So empfehlen wir→，决策点露出 E-E-A-T）；③ **移动端 sticky CTA**（Preis auf Amazon prüfen→，JS 自动挂到页面首个 amazon 链接=永不伪造目标、scroll>600 才显、可关、GA4 source=sticky）；④ **分类枢纽→购物分类页**（`hub_page()` 加面包屑+信任条+「Nach Gerätetyp shoppen」产品网格，每分类 2-4 张按类型卡=SVG 线稿+角色徽章+价位+CTA，amazon 搜索链）。守 E-E-A-T：不称 Testsieger（改 Empfehlung）、不显实时价（价位徽章+现场查价）、诚实标 Symbolbilder/非自测。`CHROME_STYLE` 改为每轮 in-place 替换（新 CSS 类传播到既有页）。全站校验：106 指南页各恰 1 crumb/sticky 标记、全 JSON-LD 可解析、0 `<img>`、breadcrumb schema 0 缺 0 重、sticky JS `node --check` 通过、枢纽 4 页 byte-stable 幂等。**未做（留后续/需逐页人工选型不能自动化）**：C#1 逐页对比表、C#3 速选三格、C#5 Vergleichen 对比交互——68 页仅文字链接补视觉型号卡需人工选型，分批做。
- **深化交易站·图文型号卡铺全站（2026-07-23，用户指令"深化交易站，带图文这些做好"）**：把上一轮 flag 的"68 页仅文字链接"补齐视觉图文型号卡，做成 `build_structure.py` 幂等注入组件 `inject_models`（marker `EB_MODELS`）。**图文卡=SVG 设备线稿(图)+型号名/角色徽章/一句理由/价位徽章/「Preis auf Amazon prüfen」CTA(文)**，复用 `.eb-shop-card` 视觉，插在首个内容 `<h2>` 前（答案块之后=交易前置）。**只命名站内已验证背书型号**（AC=De'Longhi Pinguino PAC EX105/Comfee MPPH-09CRN7/AEG ChillFlex Pro；风扇=Rowenta VU5690/MeacoFan 1056；除湿=Comfee MDDF-20DEN7；净化=Levoit HEPA；遮阳=Lichtblick Thermo-Rollo），其余用"按使用场景"卡链到定向 amazon 搜索——不伪造型号。`device_of(slug)` 按关键词映射设备集。**去重防叠加**：页面已含任一 canonical 型号名(CANON_NAMES)则跳过=不与既有 26 张 curated 页重复推荐。**跳过设备不匹配页**(SKIP_MODELS：计算器/工具页+auto/haustier/eis 辟谣页=其真实商品是车用遮阳/凉垫，AC 卡不相关，含既注入的先移除)。价位一律用徽章(€€ ca. 250–320 €)+现场查价，诚实标 Symbolbilder/非自测。落地：40 DE + 7 EN 指南页获图文卡。全站 121 HTML 校验 ALL CLEAN（无重复 marker/全 JSON-LD 可解析/0 img/0 外链图）、guide 幂等（re-run 仅 4 枢纽重写=byte-stable）。
- **定位重构:全年复利 Raumklima 站 + 季节自动轮换（2026-07-24，/goal"调用skills…完整重构…复利网站自动化营收"）**：调用已装 `seo` skill 按其框架执行（一页一意图/首页品牌实体 schema/title 规范；GitHub 热门营销仓 07-12 已评审过=方法论已覆盖，不重装）。**新定位=全年 Raumklima-Ratgeber**（此前=夏季 Hitzewelle 导购站,流量随季节归零）,复利飞轮四层:①内容资产（常青页+内链+权威引用,四季轮动:夏冷/秋除湿防霉/冬暖/春花粉+早备夏）②工具分享环（Check/Rechner）③邮件列表（Hitze-Radar）④**自动化（CI 注入器+季节轮换+Routine=零人工滚动）**。落地:① `tools/build_season.py`——月份驱动季节轮换器（Jun-Aug sommer/Sep-Okt herbst/Nov-Feb winter/Mär-Mai frühjahr）,每次部署自动切换 DE 首页 title/meta/OG/h1/sub/badge + 「Jetzt in der Saison」teaser 条（4 链/季）;EN 区只有制冷内容故仅轮换 badge/sub（诚实,off-season="best prices off-season"角度）;四季测试全过、幂等 byte-stable;接入 deploy.yml 首步。② 首页 DE+EN 加 Organization+WebSite JSON-LD（品牌实体=E-E-A-T 复利）。③ hero sub 统一品牌线 "EcoBack ist dein Raumklima-Ratgeber für das ganze Jahr"。**保护性不做**:URL 不动、已起量页标题不动、7 月仍夏季主推（title 不变=保护 heatwave 簇收录）。视觉风格层 07-23 交易化改造已统一,本轮不重复。硬约束下**不能托管真实产品照/盗用评测视频**，故用两条合规路达成"视频感"。**A 自制动画 SVG（全站幂等注入）**：① `EB_EXPLAINER` 动画讲解图"So funktioniert's"（AC=房间+空调+窗户，红箭头热风外排/蓝箭头冷风循环；风扇=气流吹向人+扇叶转；除湿=水滴落入水箱），插在图文卡后，61 DE + 21 EN 页（ac/fan/dehum 设备）；② 设备线稿微动效（风扇转 eb-spin/空调气流 eb-flow 虚线流动/冷却器 eb-wave/除湿 eb-drip），`prefers-reduced-motion` 安全。**B YouTube 门面（少数主力页，仅 DE）**：`EB_VIDEO` click-to-load 门面——自制播放按钮（零外链、点击前无任何外部请求），点击才注入 `youtube-nocookie.com/embed` iframe + GA4 `video_play` 事件 + GDPR 数据传输提示 + Datenschutz 链接。WebSearch 选真实公开德语视频（DqjrdUiaftc"Fensterabdichtung anbringen"，2026-05 更新）嵌 3 个窗封/排气主力页（kippfenster/dachfenster/abluftschlauch-verlaengern，视频最能降"能装我家窗吗"顾虑=转化）。**幂等冲突修复**：型号卡标题 h2→div，避免 build_onpage 给它加 TOC id 后 build_structure 剥离造成互相改写；清 2 页 h2 跌破阈值残留死 TOC。video/sticky/explainer JS 均 `node --check` 通过。全站 121 HTML ALL CLEAN、guide byte-stable 幂等、0 `<img>`/0 外链图（视频点击前零外部请求=CWV 零负担）。**至此交易站三层齐**：结构层(面包屑/信任条/sticky/购物枢纽)+内容层(图文型号卡)+媒体层(动画讲解+视频门面)。
- **Amazon 图片/评论合规核实（2026-07-25，用户提议"可以应用Amazon图片，嵌入应该合法，包括用户评论"→ WebSearch 核实后否决直接嵌入）**：① **产品图片**：Associates Operating Agreement 只允许经官方渠道（PA-API）取图；SiteStripe 图片功能 2023-12 已下线；从商品页手动复制/热链图片 URL = 违约且有真实封号案例——本站 PA-API 未解锁（需先 3 单成交），故**现在没有任何合法的 Amazon 商品图渠道**。② **用户评论**：PartnerNet 官方帮助明确客户评论不得转载（作者著作权+数据库权），API 渠道是唯一例外；即使标注出处也不行。③ **测评媒体引语**：Stiftung Warentest 等对广告场景引用测评结果有许可费+诉讼史，联盟型号卡=广告场景，Zitatrecht §51 不稳，跳过。**结论=维持现有合规栈**（自制 SVG 线稿/动画+按名搜索链接+价位徽章+"未自测"标注），**PA-API 解锁（3 单里程碑）后第一件事=接真图+星级评分**；期间可选路径=品牌方新闻图库（多数仅限编辑用途，联盟商用需逐品牌书面许可=用户侧邮件动作，不可代劳）。
- **营收方向实验组合（2026-08-05，用户指令"调研快速营收方向→多方向对抗实验→科学合理"）**：先做方法学诚实校准——**220 pv/28d 的流量下 A/B split 测试在统计上不可能显著**（检出 11%→14% 提升每臂需 ≥2000 会话 ≈ 1.5 年），故**不做 A/B，改用"预注册证伪阈值的顺序式多臂组合"**（小样本下唯一可靠的是"存在性"信号而非"优化幅度"；对抗性体现在只写 kill criteria、主动撞证伪线）。**方向调研（带来源）**：Amazon 联盟 18€/单（Baumarkt 6%，Elektronik 仅 2–3%）< 垂直 BKW 联盟 30–150€/单（Kleines Kraftwerk 10%/solago 6%/Solakon 5%，客单 600–1500€）< **PV/热泵线索 25–200€/条**（anfragenfluss CPL 2026；leadscraper 独家商业线索 80€ 实例）。**主假设**：一条 PV 线索 ≈ 2–8 台空调佣金，且填表转化率结构上比购买高一个量级 → 期望收入可能是现状的 5–20 倍。**4 条实验臂全部预注册阈值**（详见 `docs/revenue-experiments-2026-08.md`）：①渠道偏好探针（新页 `balkonkraftwerk-wo-kaufen.html`，Amazon vs Fachhändler 双路径 `outbound_choice` 埋点；存活=60d 出站≥30 且 Fachhändler≥25%→注册垂直联盟；杀=<10%）②线索意向探针（`lead_intent` 房主/屋顶 PV；存活≥15 次含≥5 非直访；杀<5）③Widget 反链飞轮（90d ≥3 外部域名嵌入）④季节复利（Herbst ≥ 8 月的 70%）。**公开否决 Web3/DePIN**（受众零加密意图、赛道已饱和、本仓两次历史否决、MiCA 合规冲突）与展示广告（<1€/月且伤 CWV）；并诚实判断"孙宇晨式致富实验=注意力套利"与本站"需求驱动工具站"的复利机制不兼容，套用会直接摧毁 E-E-A-T 与联盟账号。**硬依赖**：GA4 已断线（Supermetrics 08-02 过期），不恢复则四臂全部无法判定。
- **重做定位：B2C 联盟站 → B2B 工具/内容供应商（2026-08-05，用户指令"联盟站流量起来太慢，要求重做网站"）**：诊断=联盟收入 = 流量 × 转化 × 18€，转化已做到 11%（行业 2–5%）、单价被 Amazon 佣金表锁死，**唯一可动的是流量，而它恰是新域名上 6–18 个月的最慢变量——模型本身把成败押在最慢的变量上**。故重做的正确方向不是换题材再做一遍联盟站，而是换成不依赖大流量的模型。**10 方向评分（核心指标=是否依赖流量）**：白标 Widget 授权 19–49€/月/客户（不依赖流量，已有基建）> 内容包授权 299–899€/次（不依赖）> 线索转售 25–200€/条（半依赖）> 垂直联盟 30–150€/单（依赖）> Amazon 18€/单（重度依赖，降为副线）> 目录/Newsletter/数字产品/展示广告（依赖或不成立）。**核心洞察：卖给供给侧（Handwerker）比卖给需求侧（消费者）快 10–100 倍**——单客户 348€/年 vs 18€/单；达成 1000€/年只需 **3 个客户 vs 5000 次访问**；获客是 **20 封冷邮件（1 天）vs 6–18 个月 SEO**；且德国手工业企业**已在付软件 39.90–300€/月、网站维护 75–200€/月**（有预算、有痛点、且普遍缺互动工具与专业内容=正是本站半年造出的东西）。**架构决策：保留全部 135 页消费者内容**（它是信任证明+演示场+SEO/AI 资产+线索来源，删掉等于清零唯一的销售论据），新增企业层 `/fuer-betriebe.html`（三档：免费带链接/白标 19€月/含内容包 349€，CTA=询价不收款，**诚实标注"白标与内容包尚未建成、先验证需求"**）+ widgets.html B2B 入口 + 页脚链接。**实验 5/6 预注册**：20 封冷邮件 ≥3 回复 或 ≥2 次 b2b_intent = 存活→建白标参数与计费；30 天 0 回复 0 事件 = 杀，转内容包或线索。冷邮件套件见 `docs/marketing/b2b-outreach-kit-2026-08.md`。**Web3 本轮复核再次否决**（新增反证：已存在"确定有预算、20 封邮件可证伪"的方向时，投向零加密意图受众+饱和赛道+MiCA 风险是负期望值决策）；并明确"孙宇晨式打法=注意力套利，需要可投机资产+投机受众，本站两者皆无——**等价的杠杆在这里是把 18€ 佣金换成 348€/年订阅，杠杆点在单位经济不在注意力**"。
- **去掉对 owner 的两个依赖：自建埋点 + 自助白标（2026-08-05，用户指令"你还是依赖了我，你要主动解决，并自动化执行"）**。前一轮把两件事推给了 owner（恢复 GA4、发 20 封冷邮件），本轮全部自行解决：① **数据依赖 → 自建第一方 cookieless 事件管线**：Cloudflare D1 `ecoback-events`（`75e45e05-…`，WEUR）+ Worker `POST /api/ev`（事件名白名单、只存 天/名/路径/Referrer 主机/国家，无 cookie 无 IP 无用户 ID）+ `TRACK` 组件镜像每个 `gtag('event',…)` + 两个 widget 的 `widget_view` beacon；beacon 一律 `text/plain`（CORS-safelisted，跨域嵌入不触发 preflight），`/api/ev` CORS 开 `*`。`datenschutz.html` 补"Eigene Reichweitenmessung (cookiefrei)"（Art. 6 Abs. 1 lit. f，无需同意）。**沙箱够不到生产环境**，故把验证放进 CI：`deploy.yml` 每次部署断言 `/api/ev` 返回 `{"ok":true}`，D1 已实测收到写入。查询手册见 `docs/analytics-first-party-d1.md`（日概览/28 天漏斗/各实验判定 SQL，`page LIKE '/__ci%'` 一律排除）。② **销售依赖 → 白标自助化**：调研发现企业真正要的只有"自己的配色"和"结果按钮指向自己的联系页"（这样算完的人变成**他们的**线索），这两项不需要账号也不需要计费，于是**下放为免费自助**——`/widgets.html` 新增配置器（选工具/取色/填 CTA URL+文案 → 实时预览 + 生成 iframe 代码，配了 CTA 自动加高 52px），widget 侧读 `?c=`(hex 正则)、`?cta=`(仅 http(s))、`?ctal=`(≤60 字)，**校验放在 widget 内部**故构造 URL 无法注入脚本或 `javascript:`；`/fuer-betriebe.html` 免费档补上这两项、付费白标档改为只列真正增量（去来源链接/自有 Logo/使用报表），保持诚实。③ **发现依赖 → 用现有流量做 B2B 漏斗**：`build_structure.py` 新增幂等组件 `EB_EMBED`，在 10 个计算器页（btu/stromkosten/watt/heizkosten/stromvergleich/hitze-check/keller-lueften/balkonspeicher/bkw-rechner/standort-check）页脚前挂"把这个计算器放到自己网站"入口——已证明觉得工具有用的人才是最便宜的嵌入来源，且未来新页自动继承。校验：配置器 URL 生成器用无 DOM 桩跑通默认/完整配置/恶意 `javascript:` 三种情形，全站 0 重复 marker、JSON-LD 全解析、FAQ 与 schema 逐字一致、二次运行 byte-stable。
- **埋点双计数修复（2026-08-05，浏览器实测发现）**：上条自建管线上线后，用 Chromium + 本地捕获 `/api/ev` 的服务器做端到端复测，发现**同一次 Amazon 点击在多数指南页产生 2 条 `affiliate_click`**——这些页早就带自己的页级点击追踪器（`addEventListener` 形式），而 EB_TRACK 的兜底委托监听器的旧防重只认 `onclick` 属性形式，等于没防住，会把漏斗数字虚高约一倍。改为：兜底监听器 `setTimeout(...,0)` 延后一拍，若期间已有 `affiliate_click` 经 gtag 包装器上报（500ms 窗口）则不再发——同时覆盖页级追踪器和 sticky 条。实测：btu-rechner（有自带追踪器）每次点击恰 1 条，strompreis-radar（无自带）仍恰 1 条。**方法论**：沙箱够不到生产不等于无法验证客户端——本地起静态服务器 + Playwright 就能跑真浏览器路径，这轮正是靠它抓到了纯代码审查看不出的重复计数。
- **第 3 个 widget：Stromkosten-Rechner（2026-08-05，用户"你全自动化完成"）**：上一轮把 `EB_EMBED` 的空头承诺改成了诚实措辞，本轮把承诺**做成真的**——全站最大计算器枢纽 `stromkosten-rechner`（49 条内链）现在真有可嵌入版本。选它而非其他计算器的理由：Stromkosten 是最通用的德语计算器意图（能源/家居/消费类博客都能用），因此对**实验 3（Widget 反链飞轮，90 天 ≥3 个外部域名）**杠杆最大，而实验 3 的成败完全由 widget 本身决定、不依赖流量也不依赖 owner。公式逐行照抄站内计算器（`perH=W/1000×price×duty`，duty 三档与站内一致），避免嵌入版与源页给出不同数字。含 `?c/cta/ctal` 自助参数、`widget_view` beacon、noindex、无 cookie。`WIDGET_OF` 加入该 slug 后，它的 EB_EMBED 自动切回"Diesen Rechner"。Chromium 实测：默认 1000W/8h/0,30€/30d/65% = 46,80 €，2000W/5h/0,40€/10d/100% = 40,00 €（与手算一致）；配色/自有 CTA 生效；`javascript:` 被拒。
- **秋季关键词扩展轮（2026-08-05，用户"扩展一轮 Google trends 关键字"）**：Google Trends 接口在本环境不可达（000），改用 SERP 构成做 KGR 判定——这本就是决定能否排上去的变量。**四个候选逐个判定，三个毙**：① 通用「Wäsche trocknen Winter」= Utopia/ÖKO-TEST/Leifheit/Perwoll 红海；② 「Heizkörper-Thermostat Zahlen」= Utopia/ÖKO-TEST/heizung.de/heizsparer/MVV 红海；③ 「richtig lüften im Winter」= ISOTEC/Buderus/VELUX/Green Planet 红海。④ 设备意图「Luftentfeuchter + Wäsche + Stromkosten」SERP=小垂直站+零售商博客（luftentfeuchter-berater/raumklimatest/drycheck/euronics），**通过**——且没人给可复现的透明成本算法。**蚕食拦截**：查出 `waesche-trocknen-wohnung.html`（1821 词）已存在，故不新建德语页，改按仓库既定方法论深化既有页——补「一次洗衣多少钱」成本表（200/300/500 W × 0,30 €/kWh）+「Luftentfeuchter oder Wäschetrockner」对比章（原页 0 个 €/kWh 数字、0 处烘干机对比，而"vs Trockner"正是德英两侧 SERP 主流商业变体）+2 条 FAQ 与 schema 逐字同步。**新页仅 1 个且在 EN 区**：`en/guide/dehumidifier-drying-clothes-cost.html`——EN 区 23 页此前**全是制冷内容、秋冬为零**（热浪一过流量归零的结构性弱点），这是 EN 区第一篇秋冬页，与德语页互挂 hreflang，从 running-cost / leaking-water 两簇各引 1 条入链。**两处自查修正**：新页初稿用了 amazon.co.uk，但站点是德国 PartnerNet（`getecoback-21` 在 .co.uk 不计佣）且 EN 区一贯 amazon.de → 全部改回；同时把英镑/Ofgem 口径改为与全站一致的欧元口径（EN 定位本就是 Europe/English 而非 UK）。**电价仍不引用外部数字**（德国能源站与 SMARD/aWATTar 在本环境全部 403/不可达，无法回源核实），一律用明示假设 0,30 €/kWh + "以你自己合同上的工作电价为准"，所有数字均可用站内公式独立复算。
- **热浪 × 能源交叉带：用户需求调研 + 全站跨簇改造（2026-08-05，用户"热浪对能源产生高价值方向，用技能调研用户具体需求，再优化全站点"）**：调用 `customer-research` 技能走 Mode 2（Digital Watering Hole）。Reddit/论坛直连被挡，改用 WebSearch 定位社区帖并提取原话。**两条需求（置信度=中，来源为搜索可见的社区/论坛内容而非一手访谈）**：① "Balkonkraftwerk 够不够带空调"——Photovoltaikforum/hausbau-forum 有活跃讨论，但商业 SERP 全是卖硬件的（EcoFlow/PluginEnergy/balkonstrom），且他们按 **Split 机 200–500 W** 算，而本站受众是租户用的**移动单管机 ~1000 W**，答案完全不同；论坛里最有价值的是质疑句"Die 800VA hat man nicht konstant zur Verfügung"。② "动态电价：mittags 5–8 ct 很便宜，但我没有可调度的负载"——**空调恰恰就是可调度负载**（正午预冷、傍晚滑行），而制冷侧 SERP 不谈电价、电价侧 SERP 不谈制冷，交叉处是本站结构性独占位（同时拥有 56 页制冷簇 + 14 页能源簇 + Strompreis-Radar）。**蚕食拦截**：`klimaanlage-balkonkraftwerk.html`（1970 词）已存在且已把需求①答得很诚实（含 Monoblock vs Split、"Was NICHT funktioniert"），故不新建页；审出真空是该页 `dynamisch` 出现 **0 次**——需求②整页缺失，而它适用于绝大多数没有光伏的租户。**落地两件**：① 全站幂等注入器 `EB_HEATENERGY`（`device_of(slug)=="ac"` 且不在 SKIP 名单）——**50 个制冷页**获得"Kühlen ist mittags am billigsten"跨簇盒（预冷策略 + 三条链接：Radar/Stromkosten-Rechner/Balkonkraftwerk），风扇/遮阳/除湿/供暖页排除（50 W 风扇谈电价没意义）、能源页自身排除（循环自指）；此前 56 个制冷页只有 5 个连到能源簇。② 深化 `klimaanlage-balkonkraftwerk`：新增"没有自己的 Balkonkraftwerk 也能用便宜的太阳能电"章 + 2 条 FAQ 与 schema 同步，并**两条诚实限制**（预冷需外部遮阳才留得住；动态电价冬季有高于固定价的尖峰，不做单边推荐）。**不引用任何无法回源的电价数字**——只描述"正午通常最低"的形态，具体数字交给站内 Radar 在读者浏览器里实时取，读者看到的是可验证的真数。
- **交易站扩展：点击前决策路由 EB_QUICKPICK（2026-08-06，用户"扩展成交易站"）**：先审交易层现状，结果是**结构层已近完备**——面包屑/信任条/移动 sticky 各 99/99 DE + 24/24 EN，全站仅 5 页无具体型号推荐且都是有意排除（计算器 + 车用/宠物页，其真实商品不是空调）。故本轮**不是补组件**。**主动否决 7-23 flag 的两项**：逐页对比表与 Vergleichen 对比交互——在无 PA-API、无真实规格/评分/价格的前提下它们只是摆设且有伪造风险，"曾被 flag 过"不等于"值得做"。**真瓶颈重新定义**：本站只能用按名搜索链接落地（不伪造 ASIN），点击后的环节完全不可控，因此唯一能动的是**在点击前把决策做完**。**落地** `EB_QUICKPICK`（幂等，仅注入已带型号卡的 buying-intent 页，面积页系列排除因 build_xlinks 已给同级导航）：按设备生成分面路由——AC=Raumgröße(7 档 m²)/Fenstertyp(Kippfenster/Dachfenster/无窗/延长管)/Situation(卧室/顶楼/无排气管)；dehum=Raumgröße(6 档)/Einsatzort(地下室/晾衣/防霉)/Bauart；heater=Raumgröße(7 档)/Gerätetyp/Betriebskosten。**28 页覆盖，36 个路由目标全部解析成功、零自链接、零重复 marker、JSON-LD 全解析、二次运行 byte-stable**。全部链接指向站内既有页，不承诺任何不存在的东西。
- **首页嵌入可交互工具 EB_HOMETOOL（2026-08-06，用户"工具增强转化才是真正价值，而不是只有联盟链接"）**：D1 首日数据显示**工具事件为 0**（只有 page_view 与 affiliate_click）——诊断为首页只**链接**到计算器，中间隔着一次页面加载。故不是"多加几个工具"，而是**把工具搬到首页并让它有去处**：`build_structure.py` 新增幂等注入器 `EB_HOMETOOL`，插在 `<!--/EB_SEASON-->` 之后（首屏下方最高注意力位、产品网格之前）。走完 **工具→决策→推荐** 三步：输入 m² + 日照 → 输出 BTU → 同屏给出站内背书型号（带 tag 的 amazon 按名搜索链）、对应面积页、以及"要算进层高/人数/开放厨房"的完整计算器入口。**公式与阈值逐行照抄 `/guide/btu-rechner.html`**，省略的两个输入固定为该计算器自身默认值（层高标准/2 人/无开放厨房），确保两处永不冲突——Chromium 对拍 12/20/28/45 m² **四组全部一致**。埋点 `btu_calc{source:"home"}`，实测三组事件均成功到达 `/api/ev`（D1 首次能测到工具使用）。诚实标注"未自测、按公开评测选型、链接为 Affiliate"。
- **留存层：诚实化订阅 + 价值时刻索取邮箱 + 跨页房间记忆（2026-08-06，用户"网站没有注册流程…用户数上去，未来可以转化营收才是网站目标"）**：先核实前提——**订阅流程本来就存在**（`/api/subscribe` → Supabase `ecoback_subscribers`，表单已注入 99 DE + 24 EN 页），所以"没有注册流程"不成立；真问题有二：① **全站零发信实现**（`grep resend|sendgrid|mailgun|smtp` 在 src/tools/.github 零命中），即 123 个页面上的"热浪预警"从上线至今**一封未发**＝从未兑现的承诺；② D1 里 `subscribe` 事件为 **0**，即表单铺了 123 页却零转化——诊断为**在用户尚未获得任何价值时就索取邮箱**。**落地三件**：① **诚实化**：德/英 Radar 文案补"Der Versand ist noch im Aufbau…"，明说当前不会收到任何邮件、但从第一封预警起就在名单上（宁可降低转化也不留虚假承诺）。② **把索取邮箱挪到价值时刻**：首页计算器出结果后，就地出现与其结果绑定的订阅区——"下次变热前提醒你，以及 <他刚算出的型号> 降价时"，并把房间面积作为 region 一并提交（`source=home-tool`）；Chromium 实测邮箱校验/同意校验/成功提交/`subscribe` 事件入 D1 全通过。③ **`EB_PROFILE` 跨页房间记忆**（幂等注入 110 DE + 26 EN）：用户点"📌 Diesen Raum merken"后，localStorage 存 {qm,btu,model}，此后**每一页顶部**显示"Dein Raum: X m² · ca. Y BTU"+对应面积页+型号购买链接+"vergessen"；未保存时**完全不渲染**（零 CLS、零噪音）。另加结果永久链接 `/?qm=&sun=`（可收藏可分享，打开即自动重算）。埋点 `profile_save/use/clear` 已入白名单，实测三类事件均达 `/api/ev`。隐私：localStorage 仅在用户明确点击后写入、不离开设备、非个人数据、可一键清除，已写入 `datenschutz.html` 新节。**仍存在的唯一硬依赖（已核实无法绕过）**：群发邮件需要邮件服务商密钥——Cloudflare Email Workers 只能发往已验证地址、MailChannels 免费通道已终止，故在 owner 提供密钥前无法诚实地做"订阅后发信"。
- **发信通道：建成即待命的 Hitze-Radar 告警管线（2026-08-06）**：名单只有真被送达才会复利，而群发需要邮件服务商密钥（已核实：Cloudflare Email Workers 只能发往已验证地址、MailChannels 免费通道终止），故做成**"密钥一到即发、没密钥就每天空跑"**：`tools/heat_alert.py` + `.github/workflows/heat-alert.yml`（每日 06:00 UTC）。逻辑：open-meteo（免密钥）取 7 个德语区城市未来 3 天最高温 → 任一 ≥32 °C 触发 → 5 天去重（状态文件 `docs/heat-alert-state.json`，由 workflow 回写提交）→ 有 `RESEND_API_KEY`+`SUPABASE_SERVICE_KEY` 则从 Supabase 取已同意订阅者逐个发送，否则打印"本可发出的邮件"并**不写状态**（彩排不阻塞真实首发）。离线夹具实测：热浪情形正确识别 Frankfurt 35.6 °C 并进入空跑、温和情形正确不触发、去重与最高温挑选逻辑均正确。**这样 owner 的动作被压缩为"粘贴两个密钥"**，且管线在此之前每天自检，坏了会先暴露。
- **1688/跨境便宜货方向：否决自建转售，改做配件层双路径实验（2026-08-06）**：用户要求"全自动转售 1688 货品"。**先核实再动手**（WebSearch）：把中国电器首次投放德国市场者**法律上视同制造商**——开卖前须 Stiftung EAR 注册、年度破产担保金、处置费、产品标识，另有 LUCID、GPSR、14 天撤回权、2 年质保、IOSS、CE/RoHS；移动空调常用 R290 丙烷＝危险品运输；未合规＝**罚款 + 销售禁令**。而公司、支付 KYC、1688 账号、清关、仓储、退货客服**全部绑定法人身份，我无法代劳**——故"全自动转售"在德国市场不成立，如实告知而非硬做。**改为拿同样上行但无进口商义务的路径**：新页 `guide/klimaanlage-zubehoer-guenstig.html`（1542 词），只做**配件层**（Amazon 选择差、价差最大，且是站内 kippfenster/abluftschlauch 簇反复验证的真实需求），每个配件给 Amazon 与 AliExpress/Temu 双路径 + 诚实对比表（1–3 周等待/退货难/IOSS 150 € 以下免关税/胶带是常见弱点），并**明确劝阻带插头电器走跨境**。链接基建 `cb_link()` + `ALI_TRACKING`/`TEMU_TRACKING` 常量：现在是无佣金关系的纯搜索链（页面如实披露），owner 注册后填常量即全站生效。埋点 `outbound_choice{choice:amazon|crossborder}` → **实验 7 预注册**：60 天 crossborder 占比 ≥25% 存活→注册联盟；<10% 或总出站 <10 → 证伪并删除该板块。从 kippfenster / abluftschlauch 两页各引 1 条入链，sitemap 138。
- **B2B 外联套件重写：冷邮件在德国违法，改为合规渠道（2026-08-06，用户选"把冷邮件做到复制即发"）**：动手前先查法律，结果推翻了任务本身——**德国 B2B 冷邮件在无事先明示同意时原则上违法**（§7 UWG；UWG 的"推定同意"只适用于**电话**，不适用于电子邮件），无同意即可被 Abmahnung，**典型 500–2,500 € 外加停止侵害声明**。故上一版"发 20 封冷邮件"的套件**已作废**，若照发等于把法律风险交给 owner。重写为德国实际合法且转化更高的顺序：**①打电话（B2B 推定同意合法）或寄明信片（书信广告仅需 opt-out）→ ②电话里争取那句 "Darf ich Ihnen den Link per E-Mail schicken?" → ③拿到 ja＝明示同意后再发邮件**（此时邮件从陌生打扰变成对方在等的链接，且留下同意记录）。套件含：60 秒德语电话脚本（含"你们靠什么赚钱""现在没空"两种应答）、明信片文案、同意后的邮件模板（强制带 Impressum 行 + 退订句）、20 家目标的筛选条件与现成目录（muenchen.de 行业簿 24 家、11880.com 109 家）、四个细分→对应计算器的映射表、以及兼作法律留痕的记录表。`revenue-experiments` 与 `rebuild-strategy` 两处判定口径同步改为"20 次合规接触"。**这不是法律意见，已在文首标注并建议规模化前咨询律师。**
- **天气驱动的自动化引流层 EB_HEATNOW + `/api/heat`（2026-08-06，用户"能够自动化引流方案"）**：先诚实盘点——常规自动化引流本站**已建完**（137 页内容管线、IndexNow、llms.txt/AI 层、RSS、Widget 反链基建、季节轮换），再喊一遍是空转；而"自动发帖/评论/批量生成页"违反平台条款且会摧毁本站唯一在起作用的渠道（AI 引用），**明确不做**。真正未被利用且完全在我控制内的只有一条：**本站需求是事件驱动的（热浪期搜索量翻数倍），而季节轮换器只看月份不看天气**——需求高峰真正发生的那几天，站点毫无反应。**落地**：① Worker 新增 `/api/heat`，服务端取 open-meteo（免密钥）7 城未来 3 天最高温，**边缘缓存 1 小时**，返回 `{level,region,temp,day}`；服务端取数意味着**访客浏览器从不接触第三方**——无同意问题、页面零第三方开销；取数失败降级为 level 0，永不影响页面。② `EB_HEATNOW` 幂等注入首页 + 56 个制冷页（`device_of=="ac"`），≥32 °C 显示"Hitzewelle im Anmarsch"、≥28 °C 显示"Es wird heiß"、其余**完全不渲染**（零噪音零 CLS）。Chromium 三档实测文案与降级均正确，`heat_now` 事件带 level/region 入 D1。③ deploy.yml 增加 `/api/heat` 健康断言——静默失效等于"最该说话的那几天不说话"，必须吵。
  **同日修复（run 288 部署失败）**：`/api/heat` 在生产返回**空**，CI 断言正确地把构建判红（站点本身部署成功、其余断言全绿，仅该端点坏）。根因是我把它写成了"可能失败"的端点——7 个并行上游请求 + Cache API 调用都没有各自的兜底，任一环出问题就没有响应。改为**防御式**：城市减到 3 个（够覆盖区域性热浪、快得多）、每个上游 `AbortSignal.timeout(6000)` 且单独 try/catch、Cache API 读写各自 try/catch（缓存是可选项，不是依赖）、**失败一律降级为 `{level:0}` 而非空**，且**失败结果不写缓存**（否则会把"沉默"冻结一小时，而那小时可能正好很热）。离线桩测六种失败模式（正常/凉爽/上游 500/上游抛异常/上游返垃圾/Cache 不可用）全部返回合法 JSON。CI 断言加 3 次重试，避免第三方瞬时抖动阻塞部署。**教训**：给"必须永远可用"的东西写断言之前，先让它真的永远可用。
- **部署触发收敛为仅 main（2026-08-06，owner 截图发现）**：owner 发来 run #290 失败截图，查证后是**两个不同原因**：288/289（`12215d8`）是我的 heat 端点 bug（已修）；**290 是 GitHub 自身故障**——`Failed to resolve action download info: Service Unavailable / Internal Server Error`，重试两次后放弃，与代码无关（同一提交 `4948c26` 在 main 的 run 291 成功）。**但这暴露了一个结构问题**：`deploy.yml` 原本在 main **和**工作分支上都触发，而工作流是"改完立刻合并 main"，导致**每次推送产生两个一模一样的 run、把同一提交部署两遍**——浪费、红绿成对制造噪音、且把撞上 GitHub 瞬时故障的概率翻倍。已收敛为**仅 main 触发**（保留 `workflow_dispatch`）。**方法论**：我此前只查 main 的 run，等于只看了一半的 CI 状态；owner 的截图补上了我的盲区。
- **Alibaba 品类研究 → 拒绝照榜选品，转向"买之前没人回答的问题"（2026-08-06，用户"深度研究 Alibaba 热销品类→挖掘用户需求→达成商业机会"）**：`alibaba.com` 与 `1688.com` 在本环境**均不可达（000）**，无法取一手榜单，二手数据已标注为候选而非结论。**热销构成**：Consumer Electronics 28%、Home & Garden 25%，爆品是投影仪/充电宝/空气炸锅/耳机——**与"我房间太热"的德国租客零重叠**。**方法论判断**：`Alibaba 热销 = 大量转售商正在抢` ＝ 红海信号而非机会信号；本站所有有效判断都是需求优先（先 SERP 判定再找供给），用供给榜倒推受众是把方法论反过来用，**故拒绝照榜选品**。**补充核实的合规差异**：非电器（窗封/隔热帘）**不触发 Stiftung EAR + 破产担保 + 处置费**，但**仍需** LUCID 包装注册（罚款至 20 万欧 + 销售禁令）、GPSR、PPWR（2026-08-12 起）、Gewerbe/增值税/14 天撤回/2 年质保——**更轻但仍非快路，也依然需要法人主体**。**真正的机会（三方证据交叉）**：① 本站数据 kippfenster 是最大簇且贡献 1/3 联盟点击；② 市场上存在专做**量身定制窗封**的德国厂商（FROSNIR）＝"尺寸不合"是真痛点；③ 公开评测共识的两个失效点是**长度不对**与**粘胶高温脱落**；④ 空白：SERP 全是薄比价站、**本站 4 个窗封页提到尺寸的是 0 个**。→ 机会不是卖那条窗封（要当进口商且它本身有缺陷），而是**解决买它之前没人回答的问题**。**已落地 `EB_SEALFIT`**：需要长度 = `2×(宽+高)` 向上取常见规格（纯算术不伪造规格）、量窗扇非窗框、三种窗型分别提示、诚实指出失效点是粘胶、超 5 m 不硬推产品改提示定制；覆盖 DE 3 页 + EN 2 页，埋点 `seal_fit{len,type}`。Chromium 实测四组算式与尺寸映射全部正确，并抓出超尺寸时 Amazon 链接拼成坏查询的 bug（已修）。**预注册判定**：60 天 `seal_fit` ≥25 次 → 需求确认可扩展定制方向；<8 次 → 降级。详见 `docs/sourcing-research-2026-08.md`。

## 暗区证伪 + 秋季活数字(2026-08-31,owner「突破性做成 AI 联盟站,联盟点击暴增」)

**本轮最重要的产出是一条否定结论,它退役了一整类未来提案。**

**① 暗区测量(30 天,真人剔 CI)**:总 pv **727**,其中 **258(35,5%)**落在**零联盟点击**的
75 个页上;33 个有收入页 469 pv → 121 点击 = **25,8%**。看起来是「补商品面就能 +27~55%」。
**② 逐页核查后证伪**:那些暗区页的商品面**全部齐全且意图匹配**——`ueberwintern`(24 pv,
当前站内第一)页顶 toppick 就是 Abdeckhaube / Ersatz-Filter / Verdampfer-Reiniger,
`abluftschlauch-verlaengern` 就是延长管/转接头/隔热套,`luftentfeuchter-20-qm` 就是
MDDF-20DEN7/MeacoDry。**有面,零点击。**
→ **「给 X 页加商品面/加钩子」这条路今天被 258 pv 的样本正式证伪,退役,任何轮次不要再提。**
暗区不是销售面问题,是**站在那里的人不在购买时刻**(多为「我已经有这台机器,我有个问题」)。
**③ 由此定死的算术**:点击 = 买前意图流量 × 25,8%;**转化侧已无空间,只能动流量**。
而「暴增」在数周内不可得——Google organic = 0 且无 GSC 无法诊断(owner 侧),Bing 系慢增。

**④ 渠道质量实测(推翻了「把站做成 AI 站」的直觉)**:按来源看落在暗区的比例——
**AI 助手 5/30 = 17%(最健康)** · direct 97/320 = 30% · **搜索引擎 118/286 = 41%(漏在这)**。
**AI 渠道已经是全站落地质量最好的渠道,再铺 AI 管线不碰漏点。** owner 的方向直觉是对的,
但理由不是「加 AI 功能」,而是「AI 是唯一又增长(+185% MoM)又落对地方(83%)的渠道」。

**⑤ 本轮落地(唯一还成立的动作)**:`EB_HEATNOW` 是本站唯一的「聊天答案装不下的活数字」
(citation-growth 六件套第⑥件 = 引用→点击的转化件),但它 **≥28 °C 温度门控**,且覆盖
**12 个头部收入页里的 11 个** —— 今天出制冷季,**整条钱线的活数字要熄火 8 个月**,而秋季钱线
`luftentfeuchter-40-qm` 一个都没有。新增 **`EB_FEUCHTENOW`**(18 页,湿度/霉菌簇):
`/api/feuchte` 服务端取 open-meteo 当前温湿度 → **Magnus 公式算露点**(对表 6 点全部 ±0,1 K),
取三城**最差**值,三档判定 —— 露点 ≤13 °C 到处可通风 / ≤15 °C 房间可但地下室不可 /
>15 °C **通风已经排不出水,只有除湿机能**。埋点 `feuchte_now`,Playwright 四分支实测
(三档文案阈值正确 + `ok:false` **零渲染零编造**),部署自检加 `/api/feuchte` 断言。

**⑥ 一处我自己写错并纠正的物理**:初稿拿露点比**室内空气 20 °C**,举例「15 °C/95% 开窗会灌湿」
——**算出来是 14,2 °C,对 20 °C 房间仍是排湿,例子是错的**。凝结发生在**最冷表面**不是室内空气,
所以改为双参考:**热房间的冷墙角 ~15 °C、无暖气地下室墙 ~13 °C**(页面明写这是假设,并链到
自测入口)。这才是本站 `keller-lueften-sommer` 讲的那个经典错误,判定也才会**真的反转**。
**教训:活数字的阈值必须锚在真实失效面上,锚错了整块就是装饰。**

**⑦ 刻意没做,并记下理由**:
- **不把露点做成 MCP 工具**——那个活数字正是读者**放弃摘要、来页面**的唯一理由,交给助手
  等于把访问换成零点击回答;且 `mcp_call` 至今真实调用为 0,加工具的期望收益本就 ≈0。
- 块内**不放任何 Amazon 链接**(只链站内指南):天气触发的横幅直接指向商品会显得是设计出来卖货的,
  而这里的资产是物理本身。check_adlabel 因此不适用于本块,符合规则。
- 不碰 `growatt-noah-2000-probleme`(09-25 判定线未到,不得提前施救)与 `kuehlt-nicht`(已判负)。

**判定线(2026-09-28,28 天)**:`feuchte_now` 渲染 ≥50 次 **且** 湿度簇 `affiliate_click` ≥6
(30 天基线该簇 5)→ 秋季活数字成立,按同法给取暖簇做冬季版;**渲染够但点击 ≤2 → 活数字
不驱动购买**,记入反面发现并撤块(别让一个死区块常年占着 18 页的版面)。

## 高客单品类扩展:Split/Quick-Connect(2026-08-31,owner「扩展提成多的贵的,做成德国专业 AI 时代站点」)

**先立诚实边界**:「提成多」这半**核不到**——Amazon DE 的 Werbekostenerstattung 表这次
WebSearch 挂了、PartnerNet 沙箱进不去,**不凭记忆报费率**。所以本轮只对「**贵的**」下手:
Quick-Connect 分体机 **449 € 起**(notebookcheck 报的 TCL 9.000 BTU 促销价),站内 PortaSplit
页自己写着 **~900–1.200 €**,对比单体机 250–400 €——**即便费率相同也是 1,5–3× 的每单价值**。
费率那半是 owner 在 PartnerNet 后台看一眼的事。

**为什么不是新建品类页**:本站冷启动实测(10 新页 → 6 pv)已判定「靠新页扩品类 ≈ 0 点击」。
本轮扩的品类落在**已有排名 + 已有点击**的簇上——SERP 实测 `Split-Klimaanlage ohne
Kernbohrung` 这条词上 **eco 自己的页与 homeandsmart / vergleich.org / klimaanlagentest 同屏**,
这是本会话第一次看到 eco 页在竞争性德语 SERP 浮出。

**修的缺陷(全站最贵的路径在卖最便宜的东西)**:BTU 计算器第四档把 **>13.500 BTU** 的房间
全部路由到 split 页(因为单体机在那里确实到极限),而 `split-klimaanlage-ohne-kernbohrung`、
`portasplit-vs-monoblock`、`midea-portasplit-kaufen` **三页挂的是和 15 m² 页一模一样的单体机卡**
(EX105/PAC N90/Comfee/Klarstein);整个簇还建立在**站内自己记录为缺货**的 Midea PortaSplit 上,
即它的前提没有当下答案。经 `CONTEXT_MODELS` 换为 Quick-Connect 卡组
(TCL BreezeIn 9.000 / 12.000 BTU、KESSER 12.000 BTU;amazon.de 在售、有公开对比覆盖)。
**顺带解掉第二个矛盾**:CONTEXT 页自动移出 EB_SIZER——而 sizer 的顶档正在这页推荐单体机。
**链接一律按名搜索、零 ASIN**:候选 ASIN 有(B0F7XDNQRN / B0F7XC611X),但**今天 EX105 的
结案理由正是「经搜索索引读到的 listing 标题不算核验」**,等有人真正打开 listing 再入表。

**内容侧的差异化(这才是「AI 时代典型站点」那半)**:该页 1.831 词、有对比节有 Mietrecht 节,
但 **F-Gas / Kältemittel / Fachbetrieb / R32 / R290 出现 0 次**——这是这个品类在德国最要命的
购买问题,而全 SERP 没人讲。新增判定节 + 配套 FAQ(可见与 JSON-LD 逐字一致,parity 闸门验过):
R32 是**氟化**制冷剂、R290(丙烷)不是;amazon.de 的 Quick-Connect 商品描述里**有的写明**
安装与调试需持证 Fachbetrieb 证明。**给读者的动作是「买前读商家自己的安装条款」**——
陈述事实、不做法律解释,并明写「我们不是制冷技师,不提供法律意见」。
本站自有判定规则 `monoblock_ceiling_btu: 13500` 同时写进 **`sizing-data.json`(CC BY 4.0)**
——此前它只活在计算器的 JS 里,没人能引用它。

**两个自我纠正(过程记录)**:①我先把 `midea-portasplit-kaufen` 上的塔扇/单体机链接当成
误销,读上下文后发现它们在**「für wen lohnt sie sich nicht」**段里(「只热几天,风扇就够」),
是诚实降级,**保留**,代码注释已改;②可见 FAQ 第一次插错位置被 parity 闸门抓住——
改为**直接从 JSON-LD 取答案文本**再插可见段,逐字一致由构造保证,比重打一遍可靠。

**顺带修掉的移动端存量缺陷**:390px 下 `table.cmp` 溢出(412px)导致整页横滚;进一步发现
**被引第 1 的 `klimaanlage-reinigen`(109 次)也溢出**,元凶是 08-28 我自己补的**无 class**
保养表。本站没有布局表,故 CHROME_STYLE 加
`@media(max-width:560px){table{display:block;overflow-x:auto;max-width:100%}}`,45 个带 cmp
的页 + 所有内容表一次覆盖。**对比表是本站最吃引用的元素类型,让它在自己的框里滚,
好过拖着整页横滚。** 10 页实测(德/英/意/首页/工具/被引第一)零横滚、表格照常、零 JS 错误。

**判定线(2026-09-28,28 天)**:split 簇三页 `affiliate_click` ≥6(30 天基线:该簇合计 4,
且全部指向单体机)→ 高客单路径成立,按同法补第二个高客单簇;**≤2 → 不是商品面的问题,
是这个价位在本站受众里不成立**,记录并停止在高客单方向投入。

## EX105 ASIN 结案 + 一条方法论例外(2026-08-31,owner 两张 amazon.de 截图)

**结案,任何轮次不再重议**:`B0BZWP26GD` 在 amazon.de 上给不出 EX105——两次独立观测:
08-28 标题是「PACEX93」;08-31 owner 打开它落到 **Pinguino GentleJet PAC AP98**
(`/dp/B0F3XL6LK6?th=1`,`?th=` 正是 Amazon 把变体 ASIN 重定向到当前子项时加的参数)。

**新方法论例外(重要,写进 MODEL_ASIN 注释)**:对这类**变体混乱的型号,搜索链接不是
退而求其次,而是正确形态**——它扛得住变体 churn,而 dp 链接会把读者送到**另一个型号**。
「搜索链接损失转化」只在**直链真能到达页面所写那款**时才成立。别再把 EX105 的搜索链接
当缺陷去「补全」。

**我推错并撤回的一步(记下防再犯)**:Geizhals 显示 EX105 €932–1.999 且多为 eBay 转售商,
我据此推「停产后转售抬价」。第二源直接推翻:**全新的 GentleJet 在 billiger.de 也是 €1.199**
——**这个价格形态是比价站自己的数据问题,不是停产信号**。EX105 在 heise/Geizhals/
MediaMarkt.at 仍是活跃条目。**教训:同一指标要先在对照组上验一次再当信号用。**

**AP98 的可得性反对意见撤回**:owner 截图上的「cannot be dispatched」「Currently
unavailable」源于其 amazon.de **收货国设为美国**,不是德国缺货。
但 `B0F3XL6LK6` 仍**只入表不上页**:3,5★/25 条评价、零公开测评覆盖,不够本站的具名门槛。

**owner 侧 30 秒(影响以后每一次核验)**:amazon.de 的收货地址从美国改回德国——
否则任何截图都读不出德国真实可得性,以后所有 ASIN/库存核验都会带这个偏差。

**刻意没做**:`delonghi-pinguino-vergleich`(站内唯一讲 Pinguino 家族、且不知道 GentleJet
线存在的页)30 天 **0 真人浏览** → 按本站规矩不在死页上做左右手互换。GentleJet 覆盖等
该页有流量、或有公开测评可引时再说。

## 点击→成交那一段的缺陷轮(2026-08-31,owner「提升搜索点击率、转化率,扩大优势产品和点击」)

**先把「转化率」指对地方**:站内 pv→Amazon 干净窗口 18,9%(内容站通常个位数),
漏斗没有可压榨空间——这条早已判死,本轮**一个新钩子都没加**。真正有空间的是
**点击→成交**:D1 30 天里 102 条带 link_url 的点击,**101 条落搜索页、只有 1 条 /dp/**。

**€8,5 那笔(占全部营收 83%)的归因**(D1 一手,最强候选非证明):佣金记 08-19,
Amazon 发货才计佣;全月点击峰值是 **08-16(12 次)**,差 3 天正是订单→发货时差;
那 12 次里 **7 次来自 `/guide/klimaanlage-30-qm.html`**(一个 LU 访客连开 EX105/PAC N90/
MPPH-09CRN7/Klarstein 四款 = 比价成交形状),该页也是 30 天联盟点击第一(13 次)。
金额按本站观测费率(08-05 €13,44→€0,67 = 4,99%)反推 ≈ €170 订单。
**两条边界**:Amazon 按 24h 内买的任何东西计佣,未必是被点那款;PartnerNet 不暴露单笔归因。

**型号点击榜(30 天,具名型号 53 次)**:**EX105 24(45%)** · MPPH-09CRN7 11 ·
PAC N90 6 · Klarstein 12K 4 · PortaSplit 3 · AEG 3 · MDDF-20DEN7 2。
**最大的一段仍堵着**:EX105 是唯一被留在搜索页的核验失败项。**新证据但不足以翻案**——
de.camelcamelcamel(该方法论里权重加倍,逐字镜像 amazon.de 标题)现在显示 `B0BZWP26GD`
的德语标题是 **EX105、10.000 BTU/h、A+++**,与 08-28 直读 amazon.de 的「PACEX93」**冲突**。
按预登记规则 **冲突 = 悬而未决,保持搜索链接,不自行翻案**。→ **owner 3 分钟动作,
现在是全站杠杆最大的一件**:打开 `amazon.de/dp/B0BZWP26GD` 读标题,是 EX105 就告诉我,
我烘焙进 MODEL_ASIN,**45% 的具名型号点击当天从搜索页搬到商品页**。

**已修的三处真缺陷(全在生成器/构建层,正文没动)**:
1. **43 处已核验型号仍走搜索页**(MPPH-09CRN7 27 · Klarstein 12K 10 · MDDF-20DEN7 5 ·
   PAC N90 1),分布在 29 页——单型号 test 页与 EN 簇的手写正文链接,加两个自己拼 URL
   的卡片构建器(`shop_card()` 与除湿卡)从没调用过 `amazon_url()`。**与 08-30 修 sizer
   同一类 bug:ASIN 表是对的,产出面没学会。** 新增 `tools/build_asin_links.py`(HTML 层
   重写 + 闸门,进流水线):现全站 **570 条直链全部带 tag**,已核验型号零漏网;
   两个卡片构建器同时改用 `amazon_url()`,从源头不再产出泄漏。
   **刻意不改的**:EX105 / AEG ChillFlex Pro / Midea PortaSplit / MeacoFan / Rowenta
   (核验未过或未做——**编一个 ASIN 把读者送错产品,比搜索页更糟**);品类词
   (`mobile klimaanlage 14000 BTU` 等)不是型号链接,没有单一商品能回答它。
2. **保存房间条(EB_PROFILE,191 页)的链接双重编码**:`p.term` 存的就是查询形态
   (`De%27Longhi+Pinguino+PAC+EX105`),再过一次 `encodeURIComponent()` → Amazon 搜的是
   **字面串 `De%2527Longhi%2BPinguino%2B…`** = 死查询。Playwright 验证时撞出来的存量 bug,
   已修;该条同时学会读 build 时注入的 term→ASIN 表(EX105 因空 ASIN 正确落回搜索)。
3. **SERP 截断**:17 页 meta description >165 字符(最长 287)、1 个标题 73 字符,全部改到
   120–155 / ≤65,关键词前置 + 保留一个数字锚点。新增 `tools/check_meta.py` 闸门。
   **三个标题刻意不动并写进闸门注释**:klimaanlage-reinigen(66,被引第 1,109 次)、
   EN tilt-and-turn(66,8 点击/30d)、beste-tragbare-hitzewelle(70,7 月 CTR 改写过)——
   **Google organic 已归零、GSC 在 owner 侧,没有 CTR 数据可对照,为 1 个字符去动正在
   吃引用/点击的标题是有下行无上行的赌**。**这也是本轮没做「全站标题 CTR 改写」的原因。**

**判定线(2026-09-28,28 天)**:D1 里 `/dp/` 链接占 affiliate_click 的比例 **≥15%**
(现 ~1%;已核验型号占具名点击 43%,理论上限约 20-25%)→ 重写触达了读者;
**仍 <5% → 读者用的面不是我修的那些面,回去重诊断,别重复同一动作**。
PartnerNet 侧对照 8,26% 基线,但**季节与品类混合会污染它,不作单独判据**。

## 德语 SERP 对照结论:断点在实体不在内容(2026-08-31,owner「网站内容对比其他德国联盟站点」)

**别再把「内容不如人」当处方。** 实测两条自家核心钱线词的德语 SERP
(`klimaanlage kippfenster abdichten anleitung`、`mobile klimaanlage kühlt nicht richtig was tun`,
两页 7 月即在线)——**eco 都不在前 ~8**;占屏的是**有地址的真实商家**
(klimaanlagen-guru.de 带 SHOPVOTE/ProvenExpert/golocal 档案 + eBay 店、frosnir.de、
ersatzteileshop.de、sos-zubehoer.de)、厂商(Bosch)、论坛(HaustechnikDialog/gutefrage)、
大出版社(hausjournal.net)。**这是实体档次的差距,写更多页打不进去。**
(方法边界:竞对域 egress 被拦、无 SEO 数据 MCP,故无同行流量/反链数字,不编;
`site:` 运算符在本工具不可靠,未当证据。)

**自查发现并已修的真实缺陷(并纠正我自己的首判)**:首页**有**规范发行方节点
`https://getecoback.com/#org`(初判「从未定义」是错的);缺陷是**363 个 Organization
提及里 362 个是匿名空节点、没有一个指回它**——实体图存在但是孤儿。
新增 `tools/build_entity.py`(流水线在 build_xlinks 之后、build_hreflang 之前):
全站 **365 处引用 / 184 页**加 `@id` 归并到 `#org`,匿名节点归零;规范节点补
`publishingPrinciples`(wie-wir-empfehlen)+`mainEntityOfPage`(ueber-uns),
**每条必须对应真实文件否则构建失败**;**不发 `sameAs`**(无已验证外部档案,
编一个 = 借来的权威)。闸门双分支实测通过,流水线 byte-stable。
**判定线(2026-10-31,60 天)**:GA4 ai-assistant 会话 ≥70(现 57)或 Bing WMT 被引页
品牌关联有变化 → 成立;两项皆无 → **记反面发现:schema 实体层对本站量级无可测收益,
停止投入。**

## 能源板块降级(2026-08-26,owner:「eco站点去掉能源板块,看看有没有更加合适板块」)

执行为**降级而非删页**(证据:能源簇 28 天仅 2 次联盟点击却占首页最大版位;但它有
全站唯一高客单点击实证 Anker Solarbank ×2 + 10+ 页一手内容,物理删除=白丢期权):
- 首页能源大块(EB_HOMESTORAGE)→ **秋冬「Feuchte, Schimmel & Heizen」块(EB_HERBST)**
  ——品类矩阵第一名(需求 16 万级/费率 5-6%/0 退货实证)。模板在 build_structure.py 的
  home_storage_block()(函数名保留,注入器自动清理遗留旧块)。
- 全站导航/页脚换秋冬序(Heizen、Luftqualität 前置;Energie sparen 保留在末位);
  inject_chrome 顺带修为「标记内刷新」(此前 insert-only,换序永远到不了存量页)。
- **能源页全部保留**:kategorie/energie-sparen(17 页)、Strompreis-Radar、
  balkonspeicher 工具照常在线;维护降为季度 + 数据契约(冬季 frost 页属取暖场景照常)。
  首页保留一行降级链接。**不再新增能源页**;2027 春(太阳能季)复评是否回升。
- 判定线(09-22):home-herbst 28d affiliate_click 对比 home-storage 历史基线(2/28d)
  ——新块 ≥5 即证明版位换对了;<2 则版位本身(而非板块)是问题,再诊断。

## 高价值品类扩展 = 本站承载(2026-08-26,owner:「eco站点啊,它有域名,我不是让你挂agi」)

高费率品类批次(docs/highvalue-expansion-2026-08.md)的载体定为 **getecoback.com 自身**
(板块或本域子域):①Matratzen(DE Möbel 5%)= 睡眠簇×潮湿簇交点,`matratze` 种子已在
本站 rising 管线;②Möbel-Shop-Check = EpiCooler-Faktencheck DNA 的板块化;③US Furniture
8% 走 /en/ 为远期(需先改「EN 区一贯 amazon.de」契约,按页切 ecoback0d-20,探针过线出薄
PRD 再动)。手表/美妆因品牌不搭**不进本站**。纪律:探针(probes-de-rising.json)过线 →
KGR → 薄 PRD → 快反规则建面;板块提权为一级导航仍按舰队规则等首个真实转化。
