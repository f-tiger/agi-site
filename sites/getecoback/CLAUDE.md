## 当前生效的扩展规则(2026-09-24,owner:「站点应该持续扩展」;全文 `docs/continuous-expansion-2026-09-24.md`)

**这一节优先于下文任何「不建新页 / 只深化」的旧规则。**

1. **每日任务 C 段的「快速新页」这一档,从 `data/expansion-queue.json` 取**:第一个 `status: queued` 且 `blocked_by` 为空的项。按 kgr-page 清单建页(SERP 当天再看一眼、蚕食检查、零编造、FAQ 与 JSON-LD 逐字一致、meta 120–155 字符),建完把该项改成 `built`,写上 `built` 日期和判定线 id,判定线同时进 `data/fleet-bets.json`。**一天最多一页。** C 段的优先级不变:机制故障 > 快速新页 > 转化断点 > 新鲜度。
2. **建之前先看该项的 `next_action`**——那里写着这一项还差什么(缺出处、要先换目标词、要先做 SERP)。没补上就跳到下一项,不许带着缺口建。
3. **可建项少于 3 个时,当天先补货再建**:从 `data/autopilot/demand-digest.md` 的季节日历找「未覆盖 · 待过三门」的词,也看第一方信号(D1 搜索引荐、已有流量的页)。**每一个 SERP 判定都写回队列,被否的也写**(`rejected` + 日期 + 看到了谁),这样同一个词不查第二遍。补货的新词同时加进 `tools/fetch_seasonality.py` 的 `DE-QUEUE` 篮子,下个月就有读数。
4. **建之前看 `data/seasonality-de-queue.json`**:词在地板上(峰值 0,0)不自动否决(故障长尾词本来就在地板下),但页面按英国或别国读数选题、德国自己测出来是 0 的,不建。教训见文档 §六(加热晾衣架)。
5. **新页的发现面**:首页 `EB_NEWEST`(`build_structure.py`,最新 12 张德语指南)随部署自动更新,不用手动加链接。它有没有用看 `eco-newest-block-1008`。
6. **闸门**:`tools/check_expansion_queue.py`(部署链里)。队列和站点对不上(`built` 没有页、有页却不是 `built`、`built` 没有判定线)就是部署事故。

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
- ~~**PA-API 已达解锁条件**(需 3 单,现有 5 单)~~ **2026-09-24:PA-API 已停用,接替的 Creators API 门槛是 30 天 ≥10 笔成交,现在不够**——это owner 侧的永久自动化路径,
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

## 钱线机制真值测试 + 判定线读数(2026-09-04 晚,owner「重点优化 eco 站」;prompt 三轮收敛后只剩这两件)

**先说结论:本轮零内容改动、零新页、零新钩子。** 三轮 prompt 把「优化 eco」收敛为
「在 09-10/09-25/09-28 三条判定线到期前,把三个 08-28 上线的钱线组件的零读数分清
『真零』还是『没记到』」+「按站内既有规则处理当日最大需求信号」。两件都做完了,
结果都是不动页面。

**① 浏览器级真值测试(`tools/browser_smoke.cjs`,本地 Chromium × 两个时区 × 5 页)**:
沙箱对 getecoback.com 出网被代理 403,所以对**构建产物 site/** 起本地静态服务测。
America/New_York:5/5 页 `#eb-usmarket` 渲染(1.7–2.1 KB,amazon.com + ecoback0d-20),
点击 → **恰好 1 条** `affiliate_click{source:"us-market", link_url:amazon.com…}`;
EN qm 页 `EB_USSWITCH` 改写 2 条品类 CTA;`data-eb-sb` 点击 → 1 条 `season_bridge`。
Europe/Berlin:5/5 页 US 块 0 字节、0 处 .com、点击 amazon.de 恰好 1 条(toppick)。
10 次加载 **0 个页面错误**。→ **D1 里的零都是真零**:
- `season_bridge` 08-28→09-04 = **0**(09-10 线:0 → 拆组件,不提前判,但按现状会拆)。
- `affiliate_click{us-market}` = **0**;更要紧的是 **US/CA/GB 自 08-28 起 affiliate_click 全为 0**
  (08-18→27 是 6/50 pv;08-28→09-04 是 0/42 pv,其中 08-28/29 各 12 pv 疑为扫描器)。
  组件工作正常,所以 09-25 若仍为 0 就是「北美读者不接受品类页」,按预登记撤块。
- `/dp/` 占比:08-31 修复后 5 天 **3/15 = 20%**(09-28 线 ≥15%,方向对,样本小)。
- 十月线参照:28 天 117 次 = 4,2/天,近 7 天 23 次 = 3,3/天(线是 ≥2,07/天)。

**② 当日最大需求信号的处置**:`luftentfeuchter` 种子 09-01 抓到 `luftentfeuchter bei hitze`
v=155.800、`kühlt ein luftentfeuchter` v=41.200。查站内:**`luftentfeuchter-ratgeber` 早有
H2「Ehrlich: Ein Entfeuchter kühlt die Luft nicht」+ 同名 FAQ**,答案已在;该页 28 天 **0 真人 pv**。
按规则(设备词未过 KGR → 深化既有页;既有页已答 → 跳过)= **看过,无命中,跳过**。

**③ 快反出页判据的自有 kill 线已触发**:08-23 起按需求信号新发的 6 页在 D1 里的**全史**真人 pv:
epicooler 0 · heizluefter-stromsparend 0 · wohnmobil-feuchtigkeit-winter 0 · heizkosten-senken-
als-mieter 0 · tineco-saugt-nicht-mehr 0 · schimmel-im-keller-entfernen 1(它们在 D1 里**一行都
没有**,不是「少」)。快反规则预登记「连续 5 页全空 → 快反判据回炉」——**已满足**。
与 08-28「新页冷启动 ≈ 0」结论一致。**自此:rising 信号只允许深化既有页,不再出新页,
直到分发能力有变化(Google 收录恢复 / Bing 曝光 / AI 引荐落到新页)**;各页自己的 09-20/09-25
判定线照常结算,不提前。

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

## 多国变现第一步:货架跟着国家换货(2026-09-15,owner 目标「扩展不同国家子站点,卖不同货品,美国侧流量最大」)

**先量,结果推翻了「再建国家站」这个直觉动作。**
28 天按国家:**DE 280 pv / 43 点击(15,4%)· US 124 pv / 8 点击(6,5%)** · AT 25/4 · CH 14/1 ·
ES 13/4 · SG 8 · NL 6 · GB 6/1。**美国已经是第二大来源,不需要先去搞流量。**
两条关键读数:
1. **`/it/` 十页、全球 28 天 0 pv** —— 上一次「建国家区」的结果就在眼前,新建 `/us/` 会重演
   (冷启动四队列已证伪)。判定线 10-27,不提前判,但**不能在证据之前再开一个**。
2. **US 的 124 pv 里只有 43 在 `/en/`**,其余落在德语页;而德语页上的 US 流量**几乎没有搜索来源**。
   真正由搜索驱动的美国需求是 **EN 故障排查页**:`portable-ac-leaking-water` 10 pv 里 **8 次来自搜索**、
   `portable-ac-smells-musty` 2/2、`portable-ac-not-cooling` 2/2。**流量已经在,缺的是货对不对。**

**缺陷(正是 owner 说的「卖不同货品」)**:英文页的默认货架点名的是**欧洲机器**——De'Longhi
Pinguino PAC EX105、AEG ChillFlex Pro、Klarstein、Schmidbauer。09-06 起 US 开关会把**链接**改写成
美国品类搜索,于是**卡片承诺一个具名型号、点进去给的是一个品类页**。而 `US_MODELS` 里早就有
按具名美国媒体(RTINGS / Wirecutter / Consumer Reports / NBC Select)交叉核过的美国型号,
**却只出现在 `EB_USMARKET` 那段文字桥里,从未进入真正带来转化的货架**(德语货架 37,8 次/100 页)。
US 6,5% vs DE 15,4%,这是最明显的一条原因。

**做法:货架整块换国籍,不新建任何页面。** `EB_USSHELF` 与欧洲货架同页发出,**默认 `hidden`**
(无 JS 时显示欧洲货 = 对多数读者正确),由**与 US 开关完全相同的三路地理门**揭示:
`America/*` 直接换(零网络)· `Europe/*` 直接不换(零网络)· 其余问 `/api/geo`。
换出时**同时隐藏 `EB_USMARKET` 桥**——桥的原文是「下面推荐的是欧洲型号,不适合你」,
**货架一换,这句话就成了假话**。美国卡片链 `amazon.com` + `ecoback0d-20`,**按名搜索不带 ASIN**
(amazon.com 上本站一个 ASIN 都没验过,猜一个就是在新国家重犯 EX105 的错)。
点击带 `source:"us-shelf"`,与欧洲货架的 `models` 分得开。
**覆盖 23 个 EN 页**(ac 9 / dehum 7 / heater 7)。**CONTEXT 页刻意不换**:那些页卖的是本页问题的配件
(排水管、水平仪),换成整机是在回答没人问的问题——它们的链接本来就被 US 开关改成了美国搜索词。

**Chromium 四路真机验收全过**:US 时区 → 欧洲货架关、美国货架开、桥隐藏、Midea Duo/Whynter/
Black+Decker、链接 `amazon.com...ecoback0d-20`、零网络;EU 时区 → 保持欧洲货、桥可见、amazon.de;
UTC+边缘说 US → 换;UTC+边缘说 DE → 不换。**追踪用 dataLayer 复验**(第一次读 `window.gtag` 拿到空数组,
是页面自己的 `function gtag` 覆盖了我注入的那个——本会话早前记过这个坑):US 路径记到
`source:"us-shelf"` + .com 链接,EU 路径记到 `source:"models"` + .de 链接,**各一条,无重复计数**。

**新闸门 `check_usshelf.py`(三种事故形态全部实测变红)**:货架**没有 `hidden`** → 红
(这条最贵:欧洲读者会被摆上买不到的美国机器,而这些页占本站四分之一点击)· US 货架里出现
amazon.de → 红 · 德国 tag 挂到 .com 上 / 美国 tag 挂到 .de 上 → 红(全站扫,不只查块内)。
另加两条**对上一版会红**的线上断言。**`Midea Duo` 曾被选作第二条断言并被否掉**:
北美桥里早就有这个名字,它对旧版是绿的、什么都证明不了——换成只有新货架才有的 `Recommended in the US`。

**已知缺口,记下不扩大**:10 个 EN 的 AC 页只有 toppick、没有 `EB_MODELS`,因此没换货。
其中 `italy / spain / france` 三页**本来就该卖欧洲货**(美国读者搜这些词多半是出行或侨居),
但 `for-bedroom / btu-calculator / running-cost / gaming-pc / fan-with-ice / evaporative-cooler`
六页是通用页,应该换而没换。toppick 是另一个组件、另一套标记,**本轮不顺手改**。

**同日补完(上线后读自己的页面才发现的两处)**:
1. **买入条只换了下面那半**。`EB_TOPPICK` 那条胶囊位在货架**上方**,仍点名 De'Longhi / Comfee /
   AEG —— 美国读者先看到欧洲胶囊、往下才是美国卡片。**只换折叠线以下的东西比不换更糟,
   页面会同时推荐两个国家的机器。** 已补 `EB_USTOP`(同款标记、美国型号、amazon.com),
   欧洲条加 `id="eb-toppick"` 供隐藏;strip 覆盖 **29 页**(比货架多 6 个只有 toppick 的通用页),
   货架 23 页,点击分别记 `us-toppick` / `us-shelf`。
2. **`italy / spain / france / europe-heatwave` 四页必须永不换货,理由是物理的**:
   **美国便携空调是 115 V / 60 Hz,在欧洲 230 V / 50 Hz 插座上根本不能用。** 给正在西班牙
   布置房间的读者推美国机器,不是「口味不匹配」,是一台不能通电的机器。已加 `US_SWAP_NEVER`
   前缀名单,两个注入口都走它;闸门与线上断言各有一条对应。

**三个被测试抓出来的错(都不是靠读代码发现的)**:
- **脚本随 strip 注入在文档靠前处,执行时下方的货架与桥还没被解析出来** → 真机里
  strip 换了、**货架没换、桥还亮着**。静态闸门一条都看不出来。已改为 `ready(swap)` 等 DOM。
  **这条是本轮最重要的教训:换的是可见性,就必须在浏览器里看,不能只看构建产物。**
- 我先前用 `grep -c` 数脚本份数,它数的是**含匹配的行数**,脚本在一行上,所以「1」是假的;
  闸门按同样口径写,于是在正确的页面上判红。**断言错了,不是构建错了** —— 改为数
  `window.__ebUsSwap=1` 这个每份脚本只出现一次的串。
- 点击追踪第一次读 `window.gtag` 拿到空数组(页面自己的 `function gtag` 覆盖注入的那个),
  改读 dataLayer 后确认:US 路径 `us-toppick`/`us-shelf` + .com,EU 路径 `toppick`/`models` + .de,
  **各一条,无重复计数**。

**各国值多少(90 天点击,决定了不再为其他国家写代码)**:DE+AT+LU **88 次(63%)**,
amazon.de 本就正确;US+CA **21 次(15%)**,本轮已修;IT+ES+FR+NL+PT 合计 **16 次 ≈ 5 次/月**,
按 €0,085 算**不到 €0,5/月,不值得为它写地理切换**,且每个都要 owner 先确认账号覆盖;
GB 8 次(德国 tag 在 .co.uk 不计佣,已记录);CH/IN/AU 7 次无现实路径。
**后续会话不要为 ES/IT/FR 重建市场切换**,先拿这组的量说话。

**判定线 2026-10-15(30 天)**:`source:"us-shelf"` 点击 **≥5** 且美国国家点击里 amazon.com 占比
**≥50%** → 「按国家换货」成立,推广到那 6 个通用 toppick 页,再评估是否值得做第二个国家;
**us-shelf = 0 而美国 pv 仍 ≥80** → 美国读者不点这个位置,查是不是被隐藏逻辑误伤(先看
`/api/geo` 是否被调用),**别直接归因为「美国人不买」**;美国 pv 跌破 50 → 样本不足,顺延到 11-15。
**这条线不跟 PartnerNet 混**:US 账号税务信息未填完,佣金会累计但付不出来,那是 owner 侧待办。

## 「大提升流量」那一轮:先查了六件事,五件是好的(2026-09-15,owner:「进行一次大提升，使得流量增加」)

**这一轮最有价值的是否定结论。后续会话别再去修下面这些东西,它们没坏。**

**① 流量没有在跌,在涨。** 28 天真人 pv **369 → 533(+44%)**,搜索引荐 **144 → 229(+59%)**。
(09-10 那次「流量越来越低」是制冷季的口径,和这次窗口不是一回事;而且 09-12 六站 human
判定变严之后这个涨幅只会被低估。)**不要再按「救流量下滑」来立项。**

**② Google 不是没抓,是抓了不给量。** 爬虫日志:googlebot 19 次 / 15 个页面(5 天),
路径分布正常、无错误形态,连 `/it/` 都碰了。但 **28 天 Google 引荐 = 0**。`site:` 查得到
真实页面和标题,**不是被 deindex、不是惩罚**。所以这是**权威度/年龄问题,是时间不是 bug**,
会话侧没有杠杆。**别再为 Google 做技术性「修复」。**

**③ 没有站级技术缺陷。** 逐页查了 212 个页面:canonical 零缺失零重复零错指(三处
「不符」是 `/`、`/en/`、`/it/` 的目录索引写法,正确);`noindex` 只在 datenschutz /
impressum / 404 / 三个 widget 等 9 个该有的地方。robots、hreflang 有各自的 gate。

**④ 冬季页没有写坏,也没有标题问题——它们只是还没到季。** 本来的假设是「零 pv 的页
标题不对」,**查完推翻了**:`luftentfeuchter-dauerbetrieb-stromkosten`(「0,09–0,21 €/h」)、
`luftbefeuchter-stromverbrauch`(「Kosten pro Nacht」)、`fenster-beschlagen-innen`
(「3 Ursachen, 1 Diagnose」)全都已经是首屏给答案 + 带数字的赢家句式。真正的区别是
**赢家全是夏季词、零 pv 的全是冬季词,而今天是 9 月 15 日**。`heizluefter-stromsparend`
14 天内 **0 → 6 pv** 就是第一张醒过来的冬季页。**所以没有改标题,改了等于翻炒。**

**⑤ 不是孤岛。** 那批冬季页各有 2–14 条编辑内链,`/kategorie/heizen.html` 链了 20 张。

**⑥ 也不是没被抓。** `waesche-trocknen-wohnung` 是冬季页里被 bingbot 抓得最多的
(5 天 4 次)而 pv = 0 —— **发现没问题,是还没到季 + 排不上**。

**⑦ 供给门当场否掉了两个选题**(这就是门的价值):`konvektorheizung vs infrarotheizung`
被 **ADAC / energie-experten / heizsparer** 占屏,弃;`Wohnmobil Feuchtigkeit Winter` 被
**promobil / vanlifemag / campingwagner** 占屏,弃。而 `Wäsche trocknen mit Luftentfeuchter`
只有小站(haus-garten-test / raumluft-helden / raumklimatest / drycheck)**过门**——
但那张页**已经存在**,所以也不用新建。**结论:这一轮一张新页都不该写。**

**⑧ 唯一真的缺口,也是这轮实际做的事。**
- **市场结构**:这个站 100% 活在 Bing 索引家族上(DDG 112 + Bing 71 + Yahoo 18 + Ecosia 2),
  外加 **AI 引荐 23**(chatgpt.com 16,其中 15 落 `/en/`;perplexity 7,全落德语页)。
- **不对称**:5 天里 **AI 爬虫读得比 bingbot 还多**(chatgpt-user 128 + oai-searchbot 119 +
  perplexity 37 + claudebot 13 + gptbot 7,对 bingbot 241),**却只换回 23 次访问**。
  这正是 citation-growth 记的零点击问题,它的处方是第⑥件套:**首屏放一个聊天答案装不下的活数字**。
- **缺口**:`EB_STROMNOW`(`/api/strom` 的 EPEX 实时电价带)**早就建好并上线**,却只挂在
  9 张阳台光伏页上——那边电价是「自发一度替掉的钱」。**冬季簇是硬币的另一面**:这些读者
  **买**下暖风机和除湿机烧的每一度电,页面的全部经济学就是那个价格,而
  「Luftentfeuchter im Dauerbetrieb: **Stromkosten**」这种标题的页在用写死的区间,
  **真实价格就在两个路由之外没接上**。
- **做法**:新增 `EB_STROMHEAT`,同一个 feed、买方口径,挂 **26 张电费页**;feed 挂了就
  **什么都不渲染**(不拿旧价冒充新鲜,不编)。
- **一条不能丢的诚实句**:交易所电价**不是**家庭电价(差约三倍)。带子里明写
  「Börsenpreis ohne Steuern und Abgaben (EPEX) — **nicht** dein Haushaltstarif」并点名
  本站到处在用的 0,30 €/kWh 假设。**没有这句,带子就在一张讲暖风机花多少钱的页上
  暗示「电 8 ct/kWh」,比不放还糟**——`check_stromheat.py` 因此把这句当硬断言。
- **两条带子互斥**:同一个数字,一边说「替掉」一边说「买入」,同页给两种口径等于没说;
  gate 断言 `EB_STROMHEAT` 与 `EB_STROMNOW` 永不同页。
- **负向测试三种事故形态各红一次**(删免责句 / 挂到簇外的页 / 同页两条带),复原后绿。

**判定线 2026-10-20(已进台账 `eco-stromheat-1020`)**:`strom_now{src:"heat"}` 28 天
**渲染 ≥15 且计算器链接点击 ≥3** → 「首屏活数字」成立,推广到湿度簇与 EN 冬季页;
**渲染够而点击 0** = 装饰,从非计算器页撤掉;**渲染 <15** = 冬季簇还没到季,**顺延 11-20,
不得记成带子的失败**。

**一句给 owner 的实话**:这一轮没有、也不可能有「让流量翻倍」的动作。流量的天花板是
Google 那 0,而那是时间。能做的是把已经在读这个站的那批读者(AI 助手读得比 Bing 还凶)
换成点击,以及让 60 多张已经建好的冬季页在季节到来时手里有一个别人抄不走的数字。

## 这个站活在 Bing 的索引上,Google 送来的人是 0(2026-09-15,爬虫日志上线后的第一次对账)

**为查 09-18 那条 googlebot 判定线而做的提前读数,结果比那条线本身重要得多。**

**① 爬虫侧(ev.name='crawl',09-11 上线,5 天窗)**:googlebot **19 次 / 15 个不同页面**;
bingbot **241 次 / 112 页**。所以 09-11 记的「googlebot=0」**是错的**——那时候没有爬虫
日志,0 是测不到不是没有。但修正之后的事实并不更乐观:**Google 的抓取深度是 Bing 的
1/7,一周只碰 15 页**(全站 200+ 页),而且 **落在 `/en/` 的是 0 次**。

**② 引荐侧(28 天,真人,剔 CI)——这才是那句话**:

| | google | duckduckgo | bing | yahoo | ecosia | chatgpt.com |
|---|---|---|---|---|---|---|
| 德语页 | **0** | 90 | 61 | 15 | — | (在 other 110 里) |
| `/en/` 页 | **0** | 22 | 10 | 3 | 2 | **15** |

**Google 一个人都没送过来,两个语区都是 0。** 这个站的全部搜索流量来自 **Bing 索引家族**
(Bing 自己 + DuckDuckGo + Yahoo + Ecosia 都吃 Bing 的结果),`/en/` 另有 ChatGPT 15 次。

**诚实的保留**:若 Google 的引荐被 referrer 策略剥掉,会掉进「直接/无来源」那一栏
(DE 153 / EN 47)。但 Bing、DDG、Yahoo、Ecosia、ChatGPT 的来源都完整落库,说明信标
本身能记来源,所以 google=0 大概率是真的 0,不是记不到。**要证死它需要 owner 的
GSC 曝光数**——这一条挂在 owner 待办上,不要自己替它下定论。

**由此改掉三件事的优先级:**
1. **不要再为 Google 改标题**。09-13 舰队层记的「先别改 eco 那 12 条 underserved 标题」
   结论是对的,但理由要换:不是「Google 没在抓」(它在抓,只是薄),而是
   **「Google 从来没送过人,改给它看没有读数」**。要改标题就按 **Bing/DDG 的口径**改。
2. **owner 待办里 GSC 那条对 eco 基本无用,Bing Webmaster 才是仪器**。09-18、10-12、
   10-27 三条线的口径本来就写的是 Bing,是对的,继续按 Bing 结算。
3. **`/en/` 的 15 次 ChatGPT 引荐是这个站最像增长的一寸**:它比 bing(10)还多。
   美国那边的钱线不必等 Google——把 `/en/` 当成**答案引擎的落地页**做,和
   citation-growth 那套判定型六件套是同一件事。

**判定线不新增**(今天已经加了三条补登记的)。`eco-googlebot-0918` 照旧 09-18 结算,
但结论已经可以预告:**条件(≥1)达成,而它本来要解锁的那个动作被 google 引荐 0 否掉了**——
这是「指标达标但决策相反」的样本,以后写判定线时,**指标要直接指向那个决定**
(该写「google 引荐 ≥1」而不是「googlebot 抓取 ≥1」),别写它的代理变量。

## 换货之后的复查:配件不能换成整机(2026-09-15 同日,承接上一节)

货架换国家上线后,把**全站 259 个 amazon.de 搜索词逐个过一遍换词规则**,查的不是
「有没有映射」(覆盖率 93,9% 早就在量)而是**映射得对不对**。覆盖率看不见这一类错:
词是被映射了的,只是映射错了东西。

**查到两处,规则表是有序的、首个匹配即生效,所以宽规则压住了窄规则:**
1. `kondenswasserschlauch klimaanlage` → **portable air conditioner**。这条在
   `portable-ac-leaking-water`,是本站**美国搜索占比最高的一页**(10 次浏览里 8 次来自搜索)。
   读者的空调在漏水,他要一根**冷凝水管**,结果被送去买**一台新空调**。
   兄弟词 `kondensatschlauch mobile klimaanlage` 是对的(→ dehumidifier drain hose),
   坏的只是 `kondenswasser-` 这个拼法没进窄规则,于是掉到最后那条通用 `klimaanlage` 上。
   **这正是 09-15 上午刚给货架修掉的那个缺陷的另一种形态**:承诺一个具名东西,交付一个品类页。
2. `split klimaanlage wärmepumpe` → portable air conditioner。固定式分体热泵不是移动机,
   新增 `ductless mini split heat pump` 规则,**刻意不匹配 `portasplit`**(Midea PortaSplit
   是移动机,必须继续掉到通用规则上)。

**修法不是补两条词,是把「配件→整机」变成能红的断言。** `check_usswitch.py` 新增一节:
按德语词形把每个词判成配件/耗材/附件,凡是判成配件却解析到整机的,直接 FAIL 并指出
「把它的规则挪到整机规则之上」。负向测试跑过:把冷凝水管规则降到通用规则之下,
**6 个词同时变红**、退出码 1;复原后绿。

**两条留给后人的教训:**
- **覆盖率是必要不充分的**。「93,9% 的链接被映射」这句话对上面两条毫无约束力。
  以后新增换词规则,先想清楚它会不会压住已有的窄规则——顺序就是语义。
- **`PART_RE` 里写 `pumpe` 会误伤 `wärmepumpe`**(热泵是整机不是配件),已收窄成
  `kondensatpumpe`。第一版 gate 就是被这个自己的误报叫红的,算它干了活。
- 沙箱陷阱记一笔:负向测试改回来后 gate 仍然红,**是 `tools/__pycache__` 陈旧**——
  规则重排不改文件大小,cp 复原又落在同一秒内,Python 的 mtime+size 两个失效判据同时
  被骗过。**以后任何「改文件→跑检查→复原→再跑检查」的验证,中间必须 `rm -rf __pycache__`。**
  CI 是全新 checkout,不受影响。

判定线不新增:这属于 **2026-10-15 那条 US 切换线**(us-shelf ≥5 次点击且 amazon.com
占美国点击 ≥50%)的一部分——修对货比修对入口更靠近那个读数。

## Preis-Engine:货架由亚马逊自己的接口刷新(2026-09-12,owner「让 eco 自我扩展…算法后端…创造营收」+「找亚马逊最热门点击产品」)

**Prompt 打磨五轮后的裁定**(全文见 09-11 会话):字面要求里三条撞已证伪结论——自动生成页 =
自动生成死重(四队列冷启动 0)、多建工具不带流量(28 天 btu_calc 4 / seal_fit 0)、
后端改不了流量(营收 = 流量 × 转化 × 佣金,转化在天花板、佣金固定)。owner 的补充
「找亚马逊最热门点击产品」把它收敛成**货架数据源**问题:现在的货架是人选的、价格写
「Preis vor Ort prüfen」、ASIN 靠人核(EX105 那个坑就是这么来的)。**亚马逊自己知道什么在卖、
卖多少钱、正确 ASIN 是哪个。** 数据源只有三条路:抓 Bestseller 页 ❌(沙箱不通、CI 抓违反 TOS)、
我凭记忆列 ❌(=编造)、**PA-API ✅**(官方接口,只走 Amazon,符合 owner 规矩)。

**建了什么(`tools/product_intel/`,全部本地可测、无密钥)**:
- `paapi.mjs`:PA-API 5 `SearchItems` 客户端,SigV4 自己实现(runner 零依赖),
  **`--selftest` 对 AWS 公开测试向量 get-vanilla 逐字节通过**——签名核心独立于 PA-API 被验证。
- `mock_paapi.mjs`:本地替身(沿用交易器 `mock_alpaca` 先例),复刻响应形状与会咬人的失败模式。
- `refresh.mjs`:对货架**已点名**的每个产品查询 → `data/products.json`。四条硬规则各带理由:
  **① TITLE MATCH**——结果标题必须含型号标识才采用 ASIN 与价格。EX105 的 top hit 是 AP98,
  **正是 08-31 结案的那种替换**,没有这条规则刷新器会把最畅销产品重链到另一台机器并印上它的价格;
  **② 品类词永不解析**(「Für den Keller」不是一个产品);**③ keep-last-good**,接口挂了绝不清空货架;
  **④ 什么都不发明**——词表来自 `shelf_terms.py` 从 `build_structure.py` 读,刷新器只能查、不能加。
- `shelf_terms.py`:128 个货架词,122 个带型号 token。token 规则专门处理过 **20L/25L 必须区分**
  (第一版两者都是 `Arete One`,会把两个尺寸链到同一产品)、`12K`/`5000` 这类裸数字必须带前词。
- `test_refresh.mjs`:**真刷新器 × mock,9 条断言**(EX105/AP98 被拒、20L≠25L、品类词不写、
  429 记错不发明、500 保留上次好值、空结果 = unmatched 不是 ok、每个请求带 SigV4 头、计数对账)。
- `build_structure.py`:`LIVE_PRODUCTS` 覆盖层——**文件不存在 → 页面逐字节不变**(实测 0 页变化);
  条目只在 `status=ok` **且 <24 h**(亚马逊展示规则,也是诚实底线)时使用;`amazon_url()` 优先级
  **每日重验的 live ASIN > 手工 MODEL_ASIN > 搜索链接**——live 赢是因为它每次对标题重验,
  静态表正是让 EX105 指错产品几周的东西;`model_card()` 渲染「289,99 € · Stand 11.09.」。
  三态实测:无文件 0 页变;新鲜数据 26 页出价、EX105 因 unmatched 保持搜索、25L 独立解析;
  过期 25 h → 0 页出价。
- `check_products.py`(新闸门):读**已构建**的页面对照数据文件——无文件却有 live 价 → 红;
  live 价没有「Stand dd.mm.」→ 红;`/dp/` 指向被标 unmatched 的 ASIN → 红。**三种失败形态都实测变红**
  (第一轮负向测试全是 exit 0,因为 `klimaanlage-25-qm` 上根本没有产品卡、sed 是空操作——
  **负向测试必须先确认注入真的发生了**,否则「没红」什么也不证明)。
- 工作流:刷新步在 build_structure **之前**,门 = `vars.PAAPI_ENABLED == '1'`(未设 = 跳过,零分钟,
  沿用 Metaculus 先例);**手动 dispatch 一律 `--dry-run`**,让 owner 先验密钥再开门;三个测试
  作为常开闸门每次部署都跑。密钥只在 Secrets,日志永不回显。`data/products.json` **不提交**
  (每次部署在 runner 上现刷,新鲜度自然满足;失败 = 那次部署无价格,退回现状,诚实降级)。

**⚠ 2026-09-24 作废:PA-API 5.0 已被 Amazon 停用(调用回 403),下面这三步不要再让 owner 做;接替者 Creators API 要近 30 天 ≥10 笔成交,见 `tools/product_intel/README.md` 顶部。** 原文:**owner 三步(≈10 分钟,`tools/product_intel/README.md`)**:PartnerNet 申请 PA-API 密钥
(账号近 180 天 ≥3 笔成交,30 天窗已有 10 件,**以后台实际显示为准**,沙箱无法核实)→ 三条 Secrets →
先手动 dispatch 看 `refresh: ok=…` 再设 `PAAPI_ENABLED=1`。**未做这三步之前,这条线是暗的,
零副作用。**

**不主张它带来流量。** 主张的是**点击→成交那一段变诚实、变好**:读者点之前看到真实价格,
落到正确的产品页,而不是「Preis vor Ort prüfen」+ 一个可能指错的 ASIN。这一段只能靠 PartnerNet
截图度量(转化率、每点击佣金),沙箱进不去。
**判定线(开门后 +30 天,由 owner 截图触发)**:PartnerNet 转化率与 €/点击对比开门前那张截图
(08-30:8,26 % / €0,085)——**升 → 留;持平 → 留(诚实本身是理由);跌 → 查是否 live ASIN
错链,先修 TITLE MATCH 再判。** 同时 D1 里 `/dp/` 点击占比应从 4,7 % 明显上升(09-28 那条线顺带读)。
**没开门的情况下这条线永不结算,不要拿「没数据」当失败。**

## 选品复核:曝光归一化后重排货架(2026-09-11,owner「按照选品逻辑,流量产品调研并上架」)

**先定义「流量产品」,否则会做成又一轮已证伪的动作。** 本站不是商店,「上架」= 改共享货架
(`DEVICE_MODELS`)点名哪些产品。09-04 已证伪的是「给已有完整货架的页面再加卡」;
**按需求重选货架上的产品是另一回事**,且站内早有先例(Schmidbauer 那条就是「需求信号,
不是测试结论」+ 日期的写法)。

**方法:点击必须按曝光归一化。** 直接看「60 天 0 点击」会把「没被展示」误判成「没人要」。
先统计每个货架产品真实出现在多少页上(**必须同时数 `s?k=` 与 `/dp/` 两种形态**——
`build_asin_links` 会把 5 个已验证 ASIN 改写成产品页,只数搜索链接会得出「点击数 > 曝光数」
这种不可能的结果,我第一版就踩了这个坑)。

**结果(60 天,每 100 个曝光页的点击数)**:
PAC EX105 **37,8**(74 页/28 次,是第二名的 2,5 倍,**本站唯一实至名归的流量产品**)·
**「Für den Keller」16,7**(12 页/2 次)· MPPH-09CRN7 14,7 · PAC N90 8,6 · MDDF-20DEN7 7,7 ·
AEG ChillFlex Pro 6,8 · PortaSplit 6,5 · Kraftwerk 12K 4,4 · 其余 15 个全 0。
**一个被数据本身推翻的直觉**:「Für den Keller」是情境词不是品牌词,却是转化第二高的条目。

**最重要的一条:什么都没有下架,而且这是刻意的。**
- Bosch Cool 5000 / Suntec Impuls 2.0+ 各只有 **9 页曝光**。按 AEG 的 6,8/100 推算,9 页的
  期望点击约 0,6 次 —— **0 次完全在噪声范围内,不构成证据**。它们是曝光不足,不是没人要。
- 供暖与除湿的 0 点击是**淡季的 0**。这一条差点让我判错:我本已准备把 MeacoDry Arete One
  (20 页曝光 / 0 点击)撤下,**而当天刷新的 Trends 显示 `meaco arete one 20l` = 49.800,
  是全品类需求最高的产品词**。先验最强的那个商品,正好是我打算撤的那个。
  **教训:淡季数据不能用来判淡季商品;判之前先看当期需求面。**

**实际上架的两项(都来自 09-11 的干净需求面,geo=DE)**:
1. **「Heizlüfter 300 Watt」进供暖货架**(13 页)。`heizlüfter 300 watt` = **50.650**,
   是两个秋季种子里最大的产品型查询,而这个货架此前**没有任何 600 W 以下的东西**。
   诚实写法:不写「便宜好用」,写「300 W 暖的是人不是房间」,把站内已发布的
   kW × h × €/kWh 算法当依据。
2. **MeacoDry Arete One 25L 进除湿货架**(12 页)。`meacodry arete one 25l` = 21.350,
   自带独立需求词,而货架此前只有 20 L。
   另把 Midea NTH20 的角色词改为「Schnell warm, nicht sparsam」,对应第二大需求
   `energiesparender Heizlüfter`(48.600),并说清本站立场:**省电的不是这台机器,是那个
   开关 —— 2.000 W 只要在转就是 2.000 W。**

**刻意没上架的**:`bonaura luftentfeuchter`(19.850)—— 这个牌子我一无所知,沙箱也查不了,
**推荐一个我完全不了解的产品就是编造**;`luftentfeuchter testsieger stiftung warentest`
(31.250)—— 无法归因的测评结论不进页面;`kaffeevollautomat` / `saugwischer` 等站外品类
(见 09-07 记录,零权重孤儿)。

**不主张这会提升点击。** 转化早在 17–26% 天花板附近,当前跌幅由季节主导。这轮改的是
**淡季货架上摆的是不是当期需求最高的东西**,而不是指望它拉动曲线。
**判定线 2026-10-11(30 天,供暖季已开场)**:`heizlüfter 300 watt` 与两个 MeacoDry 条目
合计点击 **≥3** → 按需求重选货架成立,把同样方法用到 fan/purifier/shade 三个全 0 货架;
**0 → 「按需求重选货架」对本站无效,记入反面发现,不再重复**。同期复核 Bosch/Suntec:
若曝光仍 <15 页,**继续不判**,不要用噪声当证据。

## 关掉最大的盲区:服务端爬虫身份日志(2026-09-11,owner「继续强力优化」)

**为什么是这件事**:eco 最大的单一杠杆是「Google organic = 0 pv」,而 DuckDuckGo/Bing/
Ecosia/Yahoo 承担**全部**搜索面。但「Googlebot 根本不来」和「Googlebot 天天来、Google 就是
不给排名」**处置完全相反**(前者是技术/收录问题要立刻升级,后者是 GSC 里的质量或人工处罚问题),
而**这两种情况在现有数据里长得一模一样**——因为 JS 信标只记录会跑 JS 的访客,不跑 JS 的爬虫
一行都不会留下。`evUaClass()` 只回答「是不是 bot」,不回答「是哪一个」。这个盲区不关掉,
后面所有关于流量的判断都是猜。

**做法(刻意做窄)**:`src/worker.js` 加 `CRAWLERS` 白名单 + `crawlerName()`,在 `serveAsset`
里**只对 HTML 响应、且只对白名单内的爬虫**写一行 `ev(name='crawl', page, meta={bot})`,
经 `ctx.waitUntil` 在响应之后执行——**永远不会拖慢或拖垮一个请求**。
**不记录任何 UA 原文,不记录人类访客,不记录静态资源**:它只回答「Googlebot 抓没抓这一页」,
不增加任何指纹面。覆盖 googlebot / bingbot / gptbot / oai-searchbot / chatgpt-user /
claudebot / perplexity / applebot / duckduckbot / yandex / ccbot / meta-ai / ahrefs 等 24 类。
`crawl` 已入 worker 的 `EV_NAMES` 白名单,`check_events.py` 防漂移。

**新闸门 `tools/test_crawler_ua.mjs`(能红,已双向验过)**:22 条**真实** UA 串跑真正的
`crawlerName()`——15 条爬虫必须命中正确名字,**7 条必须不命中**(三种真实浏览器、CI 探针、
curl、空串)。**负例和正例一样重要:记录到人类身上就把爬虫计数变成了跟踪。**
负向测试:把 `/googlebot/i` 改成 `/googlebotXX/i` → 退出码 1。已挂进 deploy。
正则白名单正是那种会无声腐烂的东西:**一个笔误,Googlebot 就不再被记录,而「没记录」和
「没来过」在结论上无法区分**——恰恰是这份数据存在的意义。所以它必须被执行而不是被肉眼检查。

**刻意不做的一件事**:部署后自检**不**用 Googlebot 的 UA 去探活。那会往 D1 写入伪造的
Googlebot 行,污染的正是这份要用来做判断的数据。宁可少一条断言,也不自己造假数据。
(curl 默认 UA 不在白名单里,所以现有自检不会产生 crawl 行,这一点已验。)

**判定线 2026-09-18(7 天)——这条线判的是「下一步往哪走」,不是「留不留组件」**:
- **`googlebot` = 0** → 本站根本没被 Google 抓取。这是技术/收录问题,**带证据升级给 owner**
  (GSC 里查收录状态与人工处罚),并且在解决前**不要再把流量寄望于任何内容动作**;
- **`googlebot` > 0 而 Google 引荐仍是 0** → 抓取正常、排名为零,问题在质量或人工处罚层,
  同样进 GSC,但结论完全不同——**别再把它当成「新页冷启动」的一部分来解释**;
- 同时读 `gptbot` / `oai-searchbot` / `claudebot` / `perplexity` 的绝对量:AI 引荐是本站
  唯一在长的渠道(28 天 24 pv),但**此前从未知道这些爬虫到底来不来**;
- `bingbot` 的量作为对照基准(Bing 系确实在送量,所以它必须是正数——**如果 bingbot 也是 0,
  那说明是我的日志写坏了,不是爬虫不来**)。这条自带证伪。

## 流量下滑的诊断 + season_bridge 判定线结算(2026-09-10,owner「流量越来越低」)

**先分清「季节性回落」和「某处坏了」,两者处置正好相反。三条证据一致指向季节:**
1. **没有断崖,只有斜坡**:日真人 pv 08-05→08-19 约 28/天 → 08-20→08-31 约 20/天 →
   09-01→09-09 约 17/天。索引丢失或信标损坏会是台阶,不是斜坡。
2. **对照站在涨**:bpj 同窗 8 月上旬 173/天 → 中旬 51 → 下旬 64 → 9 月上旬 **75**。
   平台层或测量层的问题会同时打到两个站,没有。
3. **跌幅集中在一个簇**(08-05→08-19 对 08-26→09-09,各 15 天):
   制冷 233 → 132(**−43%**)· 首页 51 → 25(−51%)· **潮湿 10 → 17(+70%)** ·
   供暖 8 → 8 · 其他 122 → 114。**几乎全部跌幅来自制冷簇与首页,潮湿簇在长。**

**结论:没坏,是德国制冷季结束。** 但由此暴露的结构事实要写清楚:eco 的 131 个德语页里
41 个是制冷页,而它们在旺季承担了约 55% 的 pv。**这是一个有 7 个月淡季的夏季站**,
而秋冬两簇(潮湿 17 pv、供暖 8 pv)几乎没有排名存量。所以**流量还会继续跌到明年 5 月**,
这不是能靠再加 eco 页面止住的——最近两轮正是在测这件事,10-05 出结果。
首页已正确轮到秋季(H1「Feuchte Wohnung im Herbst?」),`build_season.py` 工作正常。

**season_bridge 判定线结算(预登记 2026-08-28,到期 2026-09-10)**
- 预登记口径:累计 ≥5 次点击 → 铺到更多载体页;**0 次 → 拆组件**。
- 实测:08-28 上线,24 个载体页,13 天,`season_bridge` = **0 次**。埋点本身是 08-28
  专门为了区分「没人跨季」与「组件是坏的」而加的,所以这个 0 是可信的 0。
- **已执行:拆。** `build_xlinks.py` 的 `season_main()` 改为 `strip_season()`,
  24 个载体页上的块已清除(`data-eb-sb` 站内剩余 0)。**不是只停止注入——留着 24 个死块
  就是站点积累无人认领组件的方式。** `season_bridge` 保留在 worker 的 `EV_NAMES` 白名单里:
  缓存页上的滞留信标仍可能打过来,拒收没有好处。
- **⚠️ 命名陷阱记档**:`EB_SEASON` 这个 marker 名被两个不同组件共用 ——
  `build_season.py` 的**首页季节轮换**(正在起作用,保留)和 `build_xlinks.py` 的**季节桥**
  (已拆)。拆之前必须确认是哪一个;`strip_season()` 只走 guide 页,首页不碰。
- **这个 0 不证明「秋季内容没意义」**:同窗潮湿簇 pv +70%。读者确实会为秋季主题进来,
  只是**不会在一个为别的问题而来的制冷页底部接过一条链接**。跨季这件事要靠搜索入口,
  不是靠站内导流。

**同日顺带结算的其他组件读数(不到期,只记)**:`heat_now` 110(仍在 28 °C 以上的日子触发)·
`strom_now` 15 · `feuchte_now` **5**(09-05 上线,活着,线在 09-28 ≥50)· `btu_calc` 4 ·
`seal_fit` **0**(线在 10-05 附近)。

**没有做的事,以及为什么**:没有为了止跌再加制冷页(逆季节,且新页冷启动本身就在受审);
没有动 bpj(它有 1.790 pv/28d 且在涨,但**变现需要非 Amazon 联盟,属 owner 决策**,
舰队规矩是只请示不抢跑);Google organic 仍是 0 pv,而 Bing 系承担全部搜索面,
**这条是 eco 最大的单一杠杆且完全在 owner 侧**(GSC / Bing Webmaster)。

## 品类扩张第二批:Schimmel 簇 + US 开关按国家码(2026-09-09,owner「继续扩大」)

**这一批是上一批的对照组,不是又一批新页。** 09-07 我提出的区分变量是「**簇本身有没有排名**」:
供暖簇没有(`infrarotheizung-garage` 全史 0、`-ratgeber` 全史 1),潮湿簇有
(`mobile-klimaanlage-stinkt-schimmel` 28 天 12 pv,其中 **9 次来自搜索**,全站搜索驱动最强)。
所以本批**同样 3 页、同样处境型问句、同一条判定线**,只有「簇是否已排名」这一个变量不同。
选题全部取自 `schimmel entfernen` 种子(09-05,geo=DE,polluted=False):
`schimmel-wand-kommt-wieder`(schimmel an der wand dauerhaft entfernen)·
`schimmel-bad-fugen`(schimmel entfernen bad fugen)· `schimmel-kleiderschrank`
(schimmel aus kleidung entfernen 300 + stockflecken)。
**刻意跳过两行**:`schimmel entfernen kosten`(报不出可归因价格,无数字的成本页没用)、
`schwarzen schimmel entfernen`(菌种与健康风险无法归因,离医疗声明太近)。

**霉菌是健康话题,硬约束比上一批更严**:不写菌种、不写毒性、不写面积阈值(0,5 m² 那个数
到处流传但无法归因 → 一律写「größere Flächen」)、不写洗涤温度(交给洗标)、不写配方与浓度、
不写「杀灭 99,9%」,每页必须有 `Das ist keine medizinische Beratung.`。可用事实只有站内已发布的:
表面 **70–80 %** 相对湿度孢子萌发、**40–60 / 60–70 / >70** 三档、Hygrometer 约 10 €、以及既有结论
「除湿机防不治、对付建筑渗水永远白跑」。中央复校 12 类规则 **0 failures**(4 条 warning 是我的
正则没盖住「Nicht selbst getestet」这种句首大写的诚实否定句,非缺陷)。

**同轮修掉三个线上/流程缺陷**:
1. **US 开关按国家码,不再只看浏览器时钟**(09-08 那次点击的直接结论):Cloudflare 判定 US、
   页面带开关、词在规则里(`pinguino`),仍落 amazon.de —— 上报 UTC 的浏览器(Firefox
   resistFingerprinting、VPN、出差)永远匹配不上 `America/`。改为三条路径:`America/*` 直接切(零网络)·
   `Europe/*` 直接不切(零网络,覆盖 84% 流量)· **其余全部问 `/api/geo`**。**国家码刻意不写进 HTML**:
   guide 页是 `public, max-age=0, must-revalidate`,把国别值烘进 body 会被共享缓存发给别的国家;
   新端点单独 `no-store`。Chromium 四组真机验收全过,含「加载后生成的链接靠点击兜底改写」。
   部署后自检加两条**对上一版会红**的断言(端点存在 + 必须 no-store)。
2. **`schimmel-*` 归错设备族**:`device_of` 没有 schimmel 分支 → `schimmel-im-keller-entfernen`
   一直是 `ac`,一个讲地下室霉菌的页面挂着「热浪预警」横幅和空调产品。改成湿度族。
   **第一版我用子串匹配,把 `mobile-klimaanlage-stinkt-schimmel` 也拽了进去**——那页读者手里有空调、
   要滤芯和清洁剂,而且是全站搜索最强页;已改成**前缀匹配**。
3. **`inject_heatnow` 只插不删**(由 ②暴露):改了设备族之后旧的热浪 band 仍留在页面上,而
   `EB_FEUCHTENOW` 的条件是「页面没有 HEATNOW」,于是该页**既没去掉错的、也没拿到对的**。
   新增 `strip_heatnow`,非 ac 页一律清除。现在 73 个 ac 页保留热浪 band,湿度页拿到露点 band。
   **教训:凡是「按条件注入」的组件,都要有对称的清除分支,否则分类一变就留下幽灵块。**

**过程中我自己造的两个问题,都被闸门或复校抓住,记下来防复发**:
①三个写页 agent 里有两个把 JSON-LD 拆成两个 `<script>` 并丢掉 BreadcrumbList,我写脚本补回
`@graph`——**但这批页的模板用的是注入式 `eb-crumb-ld`,补进去就成了两个 BreadcrumbList**,
被 `check_crumb_parity` 判红。站内两种形态都存在,**以模板为准、以闸门为准**,别按记忆补。
②我第一版的复校脚本把注入区也算进内容检查,于是把昨天上线的美国桥的 `amazon.com/ecoback0d-20`
链接报成「缺德国 tag」——**复校脚本必须先剥掉 `<!--EB_*-->` 区再检查**,否则报的是别人的代码。

**判定线 2026-10-05(与 09-07 那批同日结算,构成对照)**:
- 潮湿三页合计真人 pv **≥10 且有搜索或 AI 引荐来源** → 「簇已排名」是那个区分变量,后续扩张
  只进已有排名的簇;
- **潮湿 ≥10 而供暖 = 0** → 假设直接被证实,这是本域第一条可执行的选题规则;
- **两批都 0** → 第五次独立确认,自此在本域**关闭「靠新页扩品类」**,除非分发能力先变
  (Google 收录恢复 / Bing 曝光 / AI 引荐落到新页),并写成硬规则;
- 1–9 → 不判,推 11-06。
另记:US 切换首读(09-06 17:10 上线后 36 小时)**美国点击 2 次、其中 1 次首次落到 amazon.com**
(来源 `us-market`,即 08-28 那个北美桥的**史上第一次**点击),n 太小不作数,09-25/10-05 再判。

## 品类扩张:Infrarotheizung 安装形态簇(2026-09-07,owner「我坚持要做品类扩张…要根据 google trends 等关键字、GEO 进行」)

**owner 两次重申要扩品类,09-04 的「只深化不出新页」规则由 owner 明示解除。本条记录先验有多差,
再记录做了什么——不把它包装成会涨 PV。**

**选题依据(owner 指定用 Google Trends + GEO)**:`data/trends-rising.json`,geo=**DE**。规则:
只取 `polluted != true` 的种子;命中要同时满足①处境/形态型问句 ②所属品类站内已有页 ③尚未覆盖。
最新一份种子 `infrarotheizung`(autocomplete-diff,09-06)浮出的**全是安装形态词**:
wand / decke / badezimmer / bild / spiegel / standgerät / stromverbrauch / test —— 后两个已覆盖,
前六个一个都没有。季节对得上:09-07 制冷季收尾(cool 簇 41 页 273 pv,下行)、供暖季开场
(heat 簇 8 页 19 pv,上行)。**off-niche 种子刻意不用**:`kaffeevollautomat`(数据干净、量真实,
但在 Raumklima 域上是零权重孤儿页,撞 08-28「稀释不是杠杆」)、`akku staubsauger`
(polluted=true,belstaff/lululemon)、`matratze`(只有 autocomplete 无量)。
**GEO 只做 DE**:EN/IT 镜像上线 8 天 0 pv,复制那条路是重放已测到的失败。

**出的三页(全部处境题,不是产品页)**:`infrarotheizung-badezimmer`(badezimmer+spiegel;
15 分钟高峰负载才是红外在浴室成立的理由 + 4/6/8/10 m² 的瓦数表 + 每月个位数欧元的算术 +
诚实劝退:有暖气片就装可编程恒温头、要暖毛巾就买毛巾架)· `infrarotheizung-standgeraet`
(standgerät;把本站招牌的「免安装/不钻孔/不问房东」搬进供暖季,并说清代价:占地、只暖区域不暖房间、
地面热源对有孩子/宠物的家是隐患)· `infrarotheizung-decke-oder-wand`(decke+wand+bild;
决策页,Bildheizung 明说是**外观决策不是性能决策**)。三页互链 + 回链 watt-rechner / ratgeber /
klimaanlage-mietwohnung,并各配 CONTEXT_MODELS 货架。

**事实纪律(沙箱抓不到外部源,所以约束更硬)**:全部数字只有两个来源——站内已发布的
**60/80/100 W/m²** 档,以及 `kW × h × 0,30 €/kWh` 的自算(逐条复核:6 m²×60/80/100 = 360/480/600 W;
0,6 kW×0,333 h×0,30 = 0,06 €;900 W 双次 = 5,40 €/月;20 m²×80 = 1.600 W)。安全段照抄
`infrarotheizung-garage` 已确立的写法:**只指向厂商与电工,绝不断言数值**——不写 IP 等级、
不写 VDE/DIN 条款、不写最小间距厘米数,并带「Das ist keine Elektro- oder Rechtsberatung.」。
中央复校脚本机检 12 类规则(标题/描述长度、canonical/og/hreflang 指向、FAQ JSON-LD 与可见文本逐字、
Amazon 全为按名搜索链且带 tag+rel、无 /dp/、内链全部存在、日期、#org 节点、广告标签、编造探针),
**0 failures**;七闸门全绿;全管线 byte-stable。

**先验很差,必须写在前面**:
- 新页冷启动已被**四个独立队列**证实:08-09 起 10 页 → 6 pv;08-23 起 6 个快反页 → 全史 0;
  EN qm 13 页 + IT 11 页 → 8 天 0;**08-29 的 16 个品牌/型号测评页 → 9 天 1 pv**。
- **内链不是杠杆(本轮新证)**:`heizluefter-stromsparend` 有 **96 条站内入链**,D1 **全史 0 行**。
  所以「挂进簇里就能起来」在本域已被自己的数据打掉,别再用这个理由立项。
- **本轮假设只被证实了一半**:选题依据是「处境型问句能排、产品型排不上」,但
  `infrarotheizung-garage` 正是处境型,**全史 0 pv**;`infrarotheizung-ratgeber` 全史 1 pv。
  所以真正的区分变量可能不是问句形态,而是**簇本身有没有排名**——制冷簇有 273 pv 撑着,
  供暖簇几乎没有可继承的权重。**这轮测的是「季节刚开场的品类 + 处境型问句」能不能改变结果,
  不是「多出页就有流量」。**
- 唯一与前几批不同、且在会话手里的分发面:新页立刻进 llms.txt / .md 镜像 / search-index /
  MCP —— 那是**不需要排队等排名**的一条(AI 引荐 28 天 24 pv 且是唯一在长的渠道)。
  Google organic 仍是 0,Bing 系是全部搜索面,两者都在 owner 侧。

**判定线 2026-10-05(28 天)**:三页合计真人 pv,**≥10 且其中有搜索或 AI 引荐来源** → 假设成立,
按同样方式把 rising 里剩下的形态词做完;**合计 = 0 → 这是第五次独立确认,自此在本域彻底关闭
「靠新页扩品类」,除非分发能力先变(Google 收录恢复 / Bing 曝光 / AI 引荐落到新页)**,并把这条
写成硬规则而不是建议;1–9 → 不判,推到 60 天(11-06)复核,理由是本域排名周期明显长于 28 天。

**同轮修掉的一个自造陷阱**:09-06 上线 US switch 时,我把规则表**同时**以 Python 列表和烘焙好的
JS 数组存了两份,而 `check_usswitch.py` 只读 Python 那份 —— 改了 Python 不改 JS,闸门会绿而线上跑旧规则,
正是「不可能失败的自检」。已改为 JS 数组由 `json.dumps(US_SWITCH_RULES)` 在 import 时渲染,单一真相源,
并断言两者恒等。顺带补三条新词规则(spiegelheizung / bildheizung / handtuchheizkörper),覆盖率 94,2%。

## 美国市场链路修复:14% 的点击落在买不到的商城(2026-09-06,owner「继续优化」)

**先量后改(D1,28 天,剔 bot 与 /__ci)**:662 真人 pv / 107 affiliate_click = **16 %**
(已在 17–26 % 天花板附近,**转化没有空间,本轮不碰转化**)。渠道:direct 295 · **ddg 126 ·
bing 75 · ecosia 35 · yahoo 21** · chatgpt 16 · perplexity 5 · copilot 3 —— **Google organic
= 0 pv**,整个搜索面就是 Bing 系索引(GSC 属 owner 侧,会话动不了,只提醒)。

**本轮修的缺陷(有钱、可验证、纯代码)**:107 次点击里 **US 15 次(14 %)**,其
`link_url` **100 % 指向 amazon.de** —— 欧元定价、只发欧盟,美国读者点了也买不成。
两个本该防住这件事的组件都在,但都没盖住真实点击:
- `EB_USMARKET`(北美桥,131 DE + 40 EN 页):渲染正常,28 天 `us-market` 来源 **0 次**。
- `EB_USSWITCH`(链接改写):**只注入 EN 40 页,DE 131 页一个都没有**;且它带的是**手写的
  11 条德语词表**(只有除湿机与红外加热的容量词),覆盖 EN 区 398 条 Amazon 链接里的
  **22 条 = 5.5 %**,而美国读者实际点的 `De'Longhi Pinguino PAC EX105`(6 次)、
  `Comfee MPPH-09CRN7`(4 次)、Klarstein / Midea PortaSplit / Fensterabdichtung /
  Kondensatpumpe / Luftkühler —— **一条都不在表里**。四周没人发现,因为**没有任何闸门
  能对它变红**。

**改法**:全站 252 个搜索词写不进手写表 → 换成**有序关键词规则**(`US_SWITCH_RULES`,
45 条,先专用配件后大类)。三条纪律:
① **规则只映射到品类,永不换型号**。点了「PAC EX105」的人被送到美国的 *portable air
conditioner* 品类,不会被塞另一家的机器冒充他选的那台;**点名美国型号是 `EB_USMARKET`
桥的活**(每个 pick 都归因到具名美国媒体)。
② **没有美国对应物的词故意不匹配**,保留 amazon.de:阳台光伏 / 家用储能(Anker Solix、
Zendure、Marstek、balkonkraftwerk)与亚克力定制裁切 —— 这是 **94,1 % 覆盖率剩下的
5,9 %,是设计不是遗漏**。
③ `/dp/` 深链**不跨市场改写**(德国 ASIN 在 amazon.com 是另一件商品),**已知缺口**:
US 读者点 dp 链仍落 .de;28 天 US 点 dp = 0 次,故本轮不扩。
另补:DOMContentLoaded 全扫 + **捕获阶段点击兜底**(sticky bar / sizer / 量窗计算器的链接
是运行时生成的,全扫看不见);该块位于 `EB_TRACK` 之前,监听器先注册,所以 `link_url`
记到的是**改写后的** URL —— 无需新埋点,直接用 `meta LIKE '%amazon.com%'` 对账。

**Chromium 真机验收(timezoneId 双跑)**:`America/New_York` 下 —— EN italy 页 17 链
→ 12 条 .com、**0 条 .de 搜索链**;DE wohnmobil 页 21 链 → **21 条全 .com**,词也对
(`rv rooftop air conditioner` / `rv windshield cover` / `12v fan`);balkonspeicher 页
**0 条改写**(11 条 .de 全留)。`Europe/Berlin` 下 **三页全 0 改写**,欧盟钱线一字未动。
`node --check` 通过,改写链 100 % 带 `ecoback0d-20`、0 条带 `getecoback-21`。

**新闸门 `check_usswitch.py`(能红,双向验过)**:规则须可编译、不含会截断 JS 字面量的
引号/反斜杠、目标须 ASCII 非空;**EN+DE 两区搜索链覆盖率 ≥ 90 %**(今天 94,1 %);块内
不得出现非美国 tag。负向测试:把地板提到 99 % → 红;插一条带撇号的规则 → 红。
部署后自检加两条**对上一版会红**的断言(旧版该页 0 次命中):DE 页须含 `EB_USSWITCH`、
须含 `rv rooftop air conditioner`。

**不主张点击变多**:总点击不会因此增加,变的是**已有的 14 % 点击第一次落到能下单的商城**。
**判定线 2026-10-05(28 天)**:US 国家的 affiliate_click 里 `link_url` 含 amazon.com 的
比例 **≥60 %** = 机制成立;**<30 % = 机制没生效,去查而不是删**(把美国读者留在 .de 本身
没有任何价值,所以这条线判的是「有没有跑起来」,不是「值不值得留」)。同窗顺带记录
PartnerNet US 账号是否首次出现点击(沙箱进不去,需 owner 截图)。

**同轮记下的两条诚实修正**:
- **`md_serve` 不是 AI 采用度**:28 天 317 次 **100 % `ua_class='bot'`**,且集中在
  09-06 的 92 次 / 30 页 / 3 个不同分钟这类**爬虫扫库**形态。以后引用它只能说「爬虫抓取」,
  不能说「助手调用」。
- **GB 的 6 次点击不是漏损**:链接指向 amazon.de、带 `getecoback-21`,在 .de 成交照样计佣
  (08-06 记的是 `getecoback-21` 用在 **.co.uk** 不计佣)。英国读者能不能收到货是市场现实,
  不是代码缺陷;**没有英国 Associates 账号就不要伪造 .co.uk 链接**。

**刻意不做**:首页(60 pv)不加 switch —— 桥不在那儿,静默改写没有解释面,留待桥一起上;
`mobile-klimaanlage-ueberwintern`(25 pv / 0 点击,第 5 大流量页)**不加钩子** —— 它已有
完整且意图匹配的 CONTEXT 货架(罩子/清洁剂/滤网,17 条链接),正是 09-04 已证伪的那类。

## 需求优先的产品文案:空调 = 免安装(2026-09-05,owner「产品上,洞察真正需求,如空调是免安装」)

**诊断**:本站赚钱最多的页(房车 / 翻转窗 / 天窗 / Split 免钻孔)全是「怎么不施工地装上」——
读者的真实需求是**免安装、免钻孔、免房东**,而共享的产品区却把这件事藏在条件句后面:
默认「Empfohlene Modelle」副标题**首句是警告**(「Vorab das Wichtigste: Ohne Fensterabdichtung …」),
toppick 标题不带任何可行性信号,BTU 算算器输出只给型号不说「不用钻」。**同一批事实,顺序反了**。
本轮**零新页、零新钩子、零新产品**(「给页加卡」09-04 已证伪),只改共享文案的顺序与作用域。

**四处改动(`build_structure.py`,全部幂等、byte-stable、六闸门绿)**:
① `models_block` 默认单体机副标题改为需求先行:「Alle Monoblöcke hier: **kein Bohren, kein
Installateur**, in der Regel ohne Erlaubnis des Vermieters — Schlauch ans Fenster, Abdichtung drum,
in rund 10 Minuten läuft es, rückstandslos」,**再**接窗封条件句;EN 同构(rented-apartment /
tilt-and-turn 链接)。所有数字与断言均为站内既有已发布句(mietwohnung / kippfenster 页),零新断言。
**作用域硬门 `monoblock_grid = (device=="ac" and not ctx)`**:CONTEXT 网格(Quick-Connect split、
房车、配件套装)与 fan/shade/heater/dehum 族拿中性兜底——split 页自带 F-Gas 条款说的正是相反的话,
第一版补丁曾把「kein Installateur」落到 split-ohne-kernbohrung / portasplit / thermovorhang /
tineco 等 7 页,**验收 grep 抓出并修正**(现 0)。② toppick 标题后缀「— alle ohne Bohren」/
「— all without drilling」,同门(DE 43 页 / EN 19 页;split 簇 0)。③ 活算算器 i18n 加 `nodrill`,
型号行后接「— kein Bohren: Schlauch ans Fenster, Abdichtung drum」(DE 42 / EN 21 页,`node --check`
通过);④ klimaanlagen 品类描述把「Kühlung ohne Bohren — für Mietwohnung und Altbau」提到前面。
**验收数**:旧警告式首句残留 0;默认单体机行 DE 9 页 + EN 9 页(仅无 canonical 网格的页才渲染
共享 models 区,qm 页与型号页有各自网格,不受影响)。

**明确不主张点击提升**:这是文案顺序修正,不是流量动作;pv→click 已在 17–26 % 天花板附近,
暗区是意图不是货架。**不设独立判定线**,并入 09-28(dp 份额 / split 簇)与十月各线一起读;
唯一要看的副作用是 split 簇页副标题变中性后其 affiliate_click 不应下降(09-28 同窗对比)。

## 热门品类→站点:机制修复而非加页(2026-09-05,owner「针对德国目前热门搜索品类,再丰富网站」)

**边界先立**:09-04 已立规「rising 只允许深化既有页,不再出新页」(6 个快反页全史 pv=0)。
本轮**零新页**,所有动作落在机制与既有页上。

**当前信号(data/trends-rising.json,各种子 08-25→09-04)按可用性分三类**:
- **真 rising 且 niche**:`luftentfeuchter bei hitze` **155.800**(全站最强)· `kühlt ein luftentfeuchter`
  41.200 · `mobiles klimagerät` 67.600 · `schmidbauer infrarotheizung` 62.950(08-28 已落卡)·
  `infrarotheizung für garage` 44.050(**已有专页**)· `sparsamer heizlüfter` 26.000 · `infrarot
  heizstrahler` 27.550 · `dyson ventilator und heizlüfter` 36.900 · `comfee mddf-20den7-wf` 26.300。
- **被污染的种子(不可作依据)**:`akku staubsauger` → belstaff/lululemon,`saugwischer` →
  balenciaga/carglass。种子量太小,Google 用全国热词填充;**这些行的 v 都过了栏的 MIN_V=7000**。
- **autocomplete 兜底(只有 new 标记、无量)**:`klimaanlage`/`schimmel entfernen`/`matratze` 三个种子
  ——`schimmel entfernen wand/dusche/tapete/spray` 是经典秋季簇,但**无法按量判定**,且本站
  `schimmel-im-keller-entfernen`(v=108.750 出的页)全史 1 pv = 该簇在本域也是冷启动。

**首页 rising 栏(#1 pv 页,61 pv)现网缺陷,本轮修**:栏把「问题」当商品卖——
`kühlt ein luftentfeuchter` / `luftentfeuchter bei hitze` 都渲染成 **Amazon 搜索 chip**,而答案
7 月起就在 `luftentfeuchter-ratgeber`;`amazon.de` 这种垃圾词上了首页联盟位;`infrarotheizung
für garage` 有专页却指向搜索。**更危险**:belstaff/balenciaga 没上首页**只因 8 个位置先被更高值
占满**——运气不是守卫。`build_rising_rail` 加三层:①`QUESTION`(kühlt/hilft/wie/was/warum…)
**只能落站内页,无匹配即丢弃,永不成为 Amazon 链**;②`NICHE` 词元守卫,无设备词元的查询不存在;
③GUIDE_MAP 补 garage 专页 + 两个问题词→ratgeber 的「Ehrlich」节;跳过 `polluted` 种子。
`fetch_trends_rising`(runner 侧)加污染判定:rising 行含种子词元不足 ⅓ → `polluted:true`
(行照写,不静默丢)。**合成数据跑真实 main() 验证**:六条垃圾/问题行给 999.99x 的值,栏零垃圾、
零问题词当商品、polluted 种子被跳过。**注意**:polluted 标记由下一次 runner 抓取才写入,
现存 JSON 里 `dreame h14 pro` / `bissel saugwischer` 仍能进栏(含 saugwisch 词元,且本站有
Bodenpflege 族,可接受)。

**唯一的内容动作(深化既有页)**:`luftentfeuchter-ratgeber`「Ehrlich: Ein Entfeuchter kühlt die
Luft nicht」节补 **NOAA 热指数表**(Rothfusz 回归,本地算,可归因):28 °C 时 70 %→30,7 °C、
50 %→28,4 °C;30 °C 时 35,0→31,0。**结论句:它不降温,但在 28–30 °C 时少 2–4 K 体感热**,
并给出诚实顺序(热→空调;湿闷→除湿机)。同名 FAQ 同步加数字(可见与 LD 同一字符串);
`luftentfeuchter-40-qm`(秋季钱线 + 露点带)加 FAQ「Hilft ein Luftentfeuchter bei Hitze?」指向它。
该页 28 天 0 真人 pv——**首页栏现在把最强信号送到这里,这是它第一次有入口**。

**刻意不做并记档**:Dyson Hot+Cool(Elektronik 低费率、无公开测评基础、且是「给页加卡」
的已证伪动作)· `infrarot heizstrahler` / `zeltheizung`(要新页)· `heizstrahler baby`(婴儿安全)·
`anker solix solarbank 4`(owner 08-26 降级能源板块)· `schimmel entfernen wand/…`(冷启动)。

**判定线(2026-10-03,28 天)**:栏的 `rising_guide` 点击 ≥5 → 「问题落答案」成立,把同样的
问题→答案路由推广到 `trends-de.json` 的热搜命中;**0 → 栏是装饰,拆**(别让它占首页首屏)。

## AI 面说真话轮(2026-09-05,owner「继续扩 AI 助手友好优化;点击太少,全局优化」)

**5 天读数**:pv 133 / aff 23 = 17,3%(持平,~19 pv/天);dp 直链占 7 天点击 **13%**(3/23,
对 09-28 ≥15% 线是早期正信号);amazon.com 仍 0;`/api/feuchte` 生产返回真实读数(runner 日志
09-04:柏林露点 15,4 °C → level 3),`feuchte_now` 0 只是那 18 页 30 小时零访客,非缺陷。
**冷启动第三次独立确认**:EN qm 13 页与 IT 11 页上线 8 天,真人 pv **都是 0**。
→ **「扩 AI 面 = 再加页/再加镜像」在本域是往没人看的地方扩,本轮零新页。**

**runner 日志暴露一条 AI 面上的假话(本轮主修)**:`/api/trend`(llms.txt 明列、供助手读)
公布 **`mcp_call n7:87`**,而真实第三方使用是 **0**。拆开:每天 ~10:00 UTC 一批 9 次、
**参数与 smoke 脚本逐字相同**(但时刻与 smoke 的 11:20–11:42 对不上,是另一个每日重放者,
UA 落成 `other`——最可能是 undici 裸 `node` UA);另有 ~22h 漂移的 geraet_wahl ×2 与
`mcp_probe` 21 次全 `bot` = 注册表校验器。**同一陷阱第三次咬人**(08-23、08-28 各一次),
这次修结构:①trend 端点两条 SQL 加 `(ua_class IS NULL OR ua_class='human')`;②`mcp_call`
的 meta 补记 UA(截 80,非个人数据)——下次「是谁」一条 SQL 可答;③`evUaClass` 把
`undici|^node$|okhttp|java/` 归 bot。**验收 = 下一次 runner 日志 `trend endpoint said` 里
`mcp_call n7 ≈ 0`。**

**AI 面两处补齐**:①`/api/feuchte` 此前在 for-agents.html / llms.txt **一处未列**(只列了 heat)
→ 补列,含 `ok:false = 不猜` 契约;②**活数字对 AI 读者不可见**:HEATNOW/FEUCHTENOW/STROMNOW
全是 JS 渲染,爬虫与 .md 镜像看到空 div——citation-growth 第⑥件要求活数字在页面上,而它恰恰
对最需要它的读者是隐形的。`build_agent_md` 现在在剥 `EB_*` 块**之前**探测标记,在 .md 头部
写一行「Live-Daten auf dieser Seite … {endpoint}」(**128 个镜像**),助手读到就知道这页有个
它装不下的数字、JSON 在哪。顺手修一个存量格式缺陷:.md 头块与正文之间从建站起就**没有空行**
(head 末尾 `""` 只给一个换行,body 又 strip 过),助手会把 canonical 行读进首段。

**.md 镜像前 50 词审计通过**(被引第一 / 收入第一 / 秋季钱线 / split):标题 → 一句含数字的
答案 → canonical → 首段直答,Perplexity 偏好的形态,**没有缺陷,不动**。

**「点击太少」的全局答案没有变,本轮不重复证明**:转化面已两次证伪(18,9% 无空间;258 pv
暗区有面零点击),点击 = 买前意图流量 × 25,8%;Google organic 0 且 GSC 在 owner 侧。
本轮唯一与点击直接相关的读数是 dp 直链 13%(正向)。

**刻意没做**:新页、新 MCP 工具、新镜像语言、任何钩子;不碰 growatt(09-25)/kuehlt-nicht。

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

## 冬季通风对页:把全站最强 AI 资产复制到下一个季节(2026-09-15,owner:「已开通全权限网络访问,再做一次升级」)

**先说网络这件事,免得下一轮再试一遍**:全权限确实打开了一些东西,但**没有打开最想要的那扇门**。
实测(会话沙箱,2026-09-15):
- ❌ **amazon.de 商品页仍读不到**——`/dp/B0BZWP26GD` 返回 **HTTP 200 但是 captcha 墙**(`productTitle` 不存在,
  页面含 "automated access")。**EX105 那条 owner 待办没有被解掉,别以为拿到网络就能自助核验 ASIN。**
  camelcamelcamel 403、Geizhals 403、idealo 403,同一堵墙。
- ❌ **搜索引擎结果不可用且会骗人**:`bing.com/search` 返回 200,但**内容与查询无关** ——
  `site:getecoback.com` 给的是某教堂网站、`site:hausjournal.net` 给的是 calguns.net、
  德语钱线词给的是 support.google.com。**是对照组测出来的**(连查四条,每条都换一个不相干域)。
  → **Bing 收录率仍然只能靠 owner 的 Bing WMT**,`eco-en-qm-bing-1012` / `eco-it-pilot-1027` 的口径不变。
  这也再次坐实 08-31 那句「`site:` 运算符在本工具不可靠,未当证据」。
- ✅ 真打开的两样:**Google Trends RSS**(21 KB 真数据,当日德国热搜含 `kaltfront`)、
  **Cloudflare MCP 的 D1 直查**——`d1_database_query` 能读 `ecoback-events`,
  **根手册那句「仓里两个 token 都没有 D1 read 权限」对 MCP 这条路不成立**,本轮钱线数字全部是 D1 现查。

**D1 现查(28 天,`ua_class='human'`,2026-09-15)**:真人 pv 532 · affiliate_click 55 ·
`/dp/` 6 = **10,9%**(t0 ~1%,判定线 09-28 ≥15%,已远离 <5% 的判负线)· amazon.de 53 / amazon.com 1 ·
国家 DE 37 / US 4 / AT 4 / ES 3 / PT 2 / IT 2。**季节正在翻面**:7 天对比 `heat_now` 76→12、
`feuchte_now` 1→9、`btu_calc` 2→7。

**本轮的真发现(一条,决定了做什么)**:**`/en/guide/portable-ac-tilt-and-turn-windows.html`
一页吃掉全站 AI 引荐的 52%**(23 条里 12 条,全部来自 chatgpt.com)。而且它**没有随季节衰减**——
8 月 7 条、9 月前半月已 9 条。它是一张**问题形状 + 欧洲专属实物 + 物理可答**的英文页;
**它讲的 Kipp 位在冬天恰恰是反面教材**(持续小开口 + 把窗框/洞口凉透 = 霉点长在洞口),
而全站(德语英语都算)**没有一张冬季通风页**:只有 `richtig-lueften-bei-hitze`(夏)与
`keller-lueften-sommer`(夏)。EN 面的取暖/潮湿侧只有 08-28 那 13 张 qm 模板梯,**一张问题页都没有**。

**做了什么**:上线**德英对页**(hreflang 成组,不做 it):
`/guide/richtig-lueften-im-winter.html` + `/en/guide/tilt-and-turn-windows-winter-condensation.html`。
- **每个数字都溯源或可复算**:40–60 / 60–70 / >70 三档、表面 70–80% 起霉、20 °C+60% 露点 12 °C、
  16 °C 卧室线,全部取自站内已发布且互相一致的 `fenster-beschlagen-innen` / `schimmel-wand-kommt-wieder` /
  `luftentfeuchter-gegen-schimmel`;新增的两个数由 Magnus 公式现算并在页上写明算法。
- **页面的脊梁是这一条**:`20 °C / 50% 的舒适房间,碰到 14 °C 的墙面,墙面处是 73%` —— 已过站内自己的
  70% 起霉线。**「湿度计显示 50% 为什么还长霉」这个问题第一次在站内有了数字答案。**
- **复用而非新造**:露点计算器沿用 `keller-lueften-sommer` 的 `dew()` 与**已在白名单的
  `taupunkt_check` 事件**(冬季版改问「房间空气 vs 最冷表面」),零新事件、零 worker 改动。
- 双向挂上夏季那张页(同一扇窗、相反季节),两页互链。

**一个必须记下来的自我纠正(方法论,不只是这次)**:初稿把「墙面相对湿度」按**绝对湿度比**算成 **72%**,
浏览器实跑计算器返回 **73%** —— **计算器是对的,我的正文是错的**:相对湿度的定义是
**水汽分压比 `e/es(T)`**,不是 g/m³ 之比。同一个错误还污染了「冷空气进屋后的湿度」整张表
(18/22/31/43 → 正确值 **16/21/30/42**)。两页正文 + 可见 FAQ + JSON-LD 已逐处改正,零残留。
**教训:页面上的数字必须和页面上的计算器同一套定义;是 Playwright 实跑而不是审稿抓到的。**

**验证**:13 步流水线 + 11 道闸门全绿(faq/crumb parity、adlabel、meta、usswitch/usshelf、cited_figures…);
Playwright 实跑两页 —— **pageerror 0、390px 零横滚、计算器 73% 与正文一致、`taupunkt_check` 正常入 dataLayer**。
`device_of()` 加了 `lueften-im-winter` / `winter-condensation` 两个 token(否则落 "ac",
就是 08-28「EN drying-clothes 挂 AC toppick + 制冷 sizer」那个原样复现的坑);
两页实测拿到的是**除湿货架(Comfee MDDF-20DEN7 / MeacoDry Arete One 20L·25L)**,
正文零 BTU 零 heatwave。**部署自检加了「事故形状」断言**:两页必须含 `MeacoDry` 且**必须不含 `EB_SIZER`**。
巧合但值得记:货架上的 MeacoDry 20L/25L 正是本周 rising 里的 `meaco arete one 20l`(v=49800)与
`meacodry arete one 25l`(v=21350)。

**判定线(已进 `data/fleet-bets.json`:`eco-ai-twin-1013`,2026-10-13,28 天)**:
两页合计 **AI 引荐 ≥1 或 真人 pv ≥15**(t0 = 0/0)→「同一读者、同一页型、下一个季节」能继承 AI 引用,
按同法做第二对;**AI 引荐 =0 且 pv <5 → tilt-and-turn 那 52% 是该页自身的年龄/运气,不是可复制的页型,
停止造「AI 形状」的孪生页**。

**刻意没做,别在下一轮重做**:
- **不出 `infrarotheizung lüge` 页**(rising v=15850,很诱人)——站内 `infrarotheizung-ratgeber`
  已经把这件事讲对了(「100% 转成热 = 每度热付一度电」,3.279 词,07-10 发布),再开一张就是翻炒。
- **不做 /it/ 第三语**:意大利语试点判死线 10-27 还没到,先出结果再谈扩。
- **不碰 eco 12 条 underserved 的标题改写**:09-15 的结论没变(Google 28 天引荐 = 0)。
- **不因为 per-page 转化率差异动页**:55 次点击的盘子里,`klimaanlage-dachfenster` 的「71,4% 转化」
  是 7 次 pv 撑的,属噪声,不是信号。

## 用「季节性峰值」而不是「rising %」选题(2026-09-15 第二轮,owner:「冬季的热门谷歌趋势,升级网站,而不是随便升级」)

**owner 的批评成立**:同日第一轮(冬季通风对页)是从 AI 引荐数据推出来的,**没查谷歌趋势**。
这一轮先把趋势查清楚再决定建什么——过程里踩了三个坑,全部记下来。

**⚠️ 坑一:九月读 rising 读到的是夏天。** `fetch_trends_rising.py` 的窗口是 `today 3-m`,
九月中旬覆盖 **6 月中→9 月中**。实测 `lüften` 种子,rising 前三是
`wie lüften bei hitze` **153.950**、`richtig lüften bei hitze` **128.800**、`wann lüften bei hitze` **107.050**
——全部属实、全部是夏天、对「十月该发什么」毫无用处。**九月不要用 3 个月 rising 面判断冬季需求。**

**⚠️ 坑二:rising 是百分比,不是量。** `konvektorheizung` 在 rising 面上 **31.700**,站内又确实零覆盖,
看着像大缺口;拉 5 年绝对值一看 **峰值 1,2**。**差点为一个几乎没有搜索量的词建页。**

**⚠️ 坑三(我自己当场踩的,最该记):Google Trends 只在一次比较内部归一化,跨批数字不可比。**
我先用 `schimmel wand` 当锚跑了一批霉类词,读出 `schimmel fenster` = 25,2,写进了初稿;
换成全局锚 `heizlüfter` 重跑,同一个词是 **4,8**。**两次的相对关系一致(4,8/12,4 ≈ 25,2/65),
错的是我把两套刻度并排放进了同一张表。** 新工具的 docstring 里写着这条警告,而我照样犯了——
**所以表里每个数必须来自同一个锚,下面这张表是重跑后的单一刻度。**

**新仪器(手动跑,不加 cron)**:`tools/fetch_seasonality.py` → **`data/seasonality-de.json`**。
5 年周数据 `interest_over_time`,每批都带同一个锚词 `heizlüfter` 所以跨批可比;输出
**九月值 / 峰值 / 峰值月 / 冬季均值÷九月**。**与 rising 文件不可混用**(一个是相对水平、一个是百分比增长)。
不挂 schedule 是刻意的:related_queries 与 interest_over_time 配额分开,而前者当天已被打爆
(6 个种子 **3 个 `API quota exceeded`**,如实记录未静默丢弃)。本次 21 词 / 262 周 / 0 失败批。

**读数(5 年,锚 heizlüfter,2026-09-15,单一刻度)**:

| 词 | 九月 | 峰值 | 峰值月 | 冬÷九月 |
|---|---|---|---|---|
| **schimmel** | 44,4 | **68,5** | **1 月** | 1,43 |
| luftentfeuchter | 19,5 | 32,0 | 11 月 | 1,19 |
| heizlüfter | 23,9 | 29,4 | 11 月 | 0,89 |
| infrarotheizung | 29,2 | 29,2 | 11 月 | 0,71 |
| heizstrahler | 17,7 | 19,9 | 11 月 | 0,80 |
| schimmel wand | 4,1 | 12,4 | 12 月 | 2,59 |
| heizdecke | 5,9 | 12,1 | 12 月 | 1,48 |
| heizung einstellen | 5,7 | 8,5 | 11 月 | 1,03 |
| fenster beschlagen | 1,6 | 5,6 | 11 月 | 1,94 |
| **schimmel fenster** | 1,1 | **4,8** | **12 月** | **3,74** |
| schwarzer schimmel | 1,7 | 3,1 | 12 月 | 1,60 |
| schimmel schlafzimmer | 0,5 | 2,4 | 11 月 | 4,84 |
| schimmel tapete | 1,0 | 2,4 | 12 月 | 2,10 |
| konvektorheizung | 1,0 | 1,2 | 7 月 | 0,80 |

**三条结论**:
1. **霉是本站冬季最大的题,不是取暖**:`schimmel` 峰值 **68,5** 是最大取暖词(heizlüfter 29,4)的 **2,3 倍**。
2. **取暖 11 月见顶,霉 12 月/1 月见顶**——取暖是入冬、霉是深冬,**排期不一样**。
3. **但霉的量集中在宽词上**:`schimmel` 68,5,而拆开的子词都不大(wand 12,4、fenster 4,8)。
   **别拿「霉是最大的题」去论证任何一个具体子词很大**——这正是坑三的教训。

**覆盖审计(标题级)**:站内霉页有 Badfugen / Keller / Kleiderschrank / Wand,**唯独没有「窗」**,
而窗是冬季霉的第一现场。`schimmel fenster` 零标题覆盖;`schwarzer schimmel` / `schimmel schlafzimmer` /
`schimmel tapete` 同样零覆盖。

**顺带照出我上一轮的偏差(不粉饰)**:同批测量里 `schimmel fenster` 约是 `richtig lüften` 的 **2 倍**,
而我给第一轮那页起的标题正是后者。**内容写对了,名字起错了。** 没有改名(上线 1 天、防翻炒;
且它作为**预防**页是对的),改为新建页去接那个词,两页双向互链。

**新页 `/guide/schimmel-am-fenster.html`**(1.251 词,DE-only,站内已有 5 张 DE-only 页先例)。
**建它的诚实理由**:峰值 4,8 不大,但**冬季拉升 3,74×、12 月见顶、站内零覆盖**,
且**与站内已有的 `fenster-beschlagen-innen`(峰值 5,6)同量级**——那页本站早就认为值得有。
差异化在**「四个面、四个答案」**:窗上的霉长在 **硅胶缝 / 橡胶密封条 / 框 / 洞口(Laibung)** 四种材料上。
- **橡胶密封条那段是全 SERP 没人讲的**:强力清洁剂让它变硬开裂 → 窗关不严 →
  **冷面变大而不是变小**,读者自己把问题做大了。
- **硅胶缝**沿用站内 `schimmel-bad-fugen` 已有的「擦完是均匀变白还是留暗影」判据(**链接过去不重写**),
  并给出顺序纪律:**先把湿度压住再换缝,否则活干两遍**。
- 安全口径**逐字沿用** bad-fugen 的规矩:只用一种清洁剂、含氯的绝不与醋/除垢剂混用、
  **不给具体配比和浓度**、明写不是建筑鉴定也不给法律意见。
- 物理段复用本站数字(20 °C/50% 碰 14 °C = **73%**、70–80% 起霉、露点 12 °C);`schimmel-` 前缀让
  `device_of()` 自动落 dehum,货架自动是除湿机,**正文零 BTU 零 Hitzewelle**。

**验证**:13 步流水线 + 11 道闸门全绿;Playwright 实跑 pageerror 0、390px 页面级零横滚
(4 列表格在自己的框里滚,属设计行为)、**10 条 Amazon 链接 tag 全对**。部署自检把新页加进
「事故形状」断言(必须含 MeacoDry、必须不含 `EB_SIZER`)。

**判定线(`eco-schimmel-fenster-1213`,2026-12-13,读数日刻意落在该词 12 月峰值内)**:
28 天真人 pv **≥40** 或 affiliate_click **≥4** → 「按 5 年季节性峰值选题」成立,
按同法补 schwarzer schimmel / schimmel schlafzimmer / schimmel tapete;
**pv <15 → 词选对了但本站拿不到这块需求(实体档次问题,08-31 已判),不再按峰值加页。**

**别再做(这一轮查过了)**:
- **konvektorheizung 不建页**(rising 31.700 是假象,5 年峰值 1,2)。
- **`infrarotheizung test stiftung warentest`(rising 31.500)不碰**:SW 结果不能转载,站内无法核实。
- **`schimmel mietminderung` 不碰**:法律题,本站规矩是不给法律意见。
- **每日热搜 RSS 再次确认无用**:09-15 实拉 10 条全是明星/球赛/星座(sally field、ballon d'or…),
  niche 命中 0——与 `fetch_trends_rising.py` 文档那句话一致,别再指望它。
- **取暖簇不缺页**:infrarotheizung 6 页、heizlüfter 2 页、heizung-qm 7 页,而这些词 11 月见顶、
  冬÷九月全部 ≤1,0(infrarotheizung 0,71)——**它们的问题不是覆盖,是发现面。**

## 「其他热门产品」——实测后只建了一页,三个候选被数字杀掉(2026-09-15 第三轮)

**用刚建的 `data/seasonality-de.json`(锚 heizlüfter)量了候选品类,结论和 rising 面给的印象相反。**

| 词 | 九月 | 峰值 | 峰值月 | 冬÷九月 | 裁定 |
|---|---|---|---|---|---|
| matratze | 70,2 | **76,3** | 1 月 | 1,01 | **不做**:量最大但完全在 niche 外,且 08-31 已判「断点在实体不在内容」——越大的词越轮不到本站 |
| kaffeevollautomat | 32,5 | **59,5** | **11 月** | 1,36 | **不做**:黑五/圣诞礼品大词,高客单,但与 Raumklima 无关 |
| akku staubsauger | 15,8 | 26,5 | 11 月 | 1,32 | 不做(见下) |
| saugroboter | 12,7 | 23,6 | 11 月 | 1,30 | 不做(见下) |
| **luftbefeuchter** | 7,2 | **22,7** | **12 月** | **2,81** | **✅ 建了**:全部实测词里**季节拉升最大**,且在 niche 正中 |
| fussbodenheizung | 11,1 | 16,1 | 11 月 | 1,24 | 不做:装修题,非本站可变现形态 |
| luftreiniger | 7,1 | 11,1 | **6 月** | 1,38 | 不做:峰值在**夏天**(花粉),不是冬季题;站内已有 ratgeber |
| **saugwischer** | 2,5 | **3,2** | 11 月 | 1,16 | **反面发现,见下** |

**最重要的一条是负面的:Bodenpflege 这条垂直建错了。** 08-28 以「floor dust IS indoor air quality」
为桥接开的 Bodenpflege 线,其种子词 `saugwischer` 的 5 年峰值只有 **3,2**(锚 heizlüfter 是 29,4),
而它在 rising 面上显示 `bester saugwischer roboter` **62.450**,看着像整组探针里最强的信号。
**D1 实查:全部 staubsauger/saugwischer/tineco/dreame 页 56 天合计真人 pv = 1。**
数字和页面互相印证。**这是 rising % 第三次骗人了**(前两次:konvektorheizung、我自己混刻度),
`akku staubsauger` / `saugroboter` 虽然比它大一个量级,但**同一条垂直已经空过一次,不试第二次**
(舰队规矩:lost 的模式不复制)。

**rising 面的污染检测有个已知漏洞,而且「显而易见的修法」是错的——别再修。**
`matratze` 那一栏的**第一名是 `fluss durch riga`(拉脱维亚的一条河)**,却没被标 polluted:
检测是「少于 1/3 的行不含种子词才报警」,而 matratze 有 7/10 行含词,顺利过关。
我加了「最高值那行离题就报警」,**当场用当天真实数据回放,它把三个好种子误杀**:
`klimaanlage`(第一名 `coolizi`)、`luftentfeuchter`(第一名 `meaco arete one 20l`——本站货架上就有这台)、
`balkonkraftwerk`(第一名 `ecoflow stream 5000`)。**品牌/型号词是 rising 面最值钱的行,
而词法匹配分不清「本品类的品牌」和「拉脱维亚的河」。** 已回滚,原因写进代码注释:
真修需要这份文件里没有的信号(按种子的品牌名单,或裸种子的绝对量做对照)。**读的人自己看第一行。**

**建的页:`/guide/luftbefeuchter-ratgeber.html`**(约 1.500 词)。
**理由是对称性**:站内 `luftentfeuchter` 峰值 32,0 有 **14 页**,`luftbefeuchter` 峰值 22,7(71%)
**只有 1 页**(stromverbrauch);而后者冬季拉升 **2,81×** 是全表最高,12 月见顶。
子词全部很小(最大 `luftbefeuchter test` 6,7),**量在头部词上,所以建的是 Ratgeber 不是长尾页**——
与 `schimmel` 那轮同一个形状。
- **脊梁是一张没人发的表**:相对湿度按分压比换算到冷表面,**14 °C 外墙下,房间 48% 就把墙面推到 70%**
  (起霉线)。所以通行的「加湿到 50%」在**有冷墙的老房子里是错的数字**。这条把加湿页和本轮前两页
  (通风 / 窗霉)扣成一个闭环:**加湿器是唯一一个能主动把读者推过起霉线的家电。**
- 三种工作原理据实拆开(Verdunster 构造上几乎不会过加湿 / Verdampfer 卫生最好但**耗电最高,烧水就是加热** /
  Ultraschall 便宜安静但硬水喷白粉、脏水箱就是把里面长的东西雾化出来)。
- 卫生与安全**逐字沿用**站内既有规矩:不给具体配比浓度、含氯的绝不与醋/除垢剂混。
- **货架是本轮最容易出事的一处**:`device_of()` 把 luftbefeuchter 归在 `dehum`(湿度表的键),
  默认货架会给**除湿机**——正好推荐与建议相反的东西。用 `CONTEXT_MODELS` 覆盖为
  湿度计 / Verdunster+Hygrostat / 红外测温枪;**实测该页 MeacoDry、Comfee MDDF、Pro Breeze、Trotec 全为 0**,
  部署自检加了**双向断言**(必须含 "Verdunster mit Hygrostat",且**必须不含** MeacoDry / Comfee MDDF)。

**验证**:13 步 + 11 闸门全绿;Playwright pageerror 0、390px 零横滚、10 条链接 tag 全对、
三个搜索词全部是加湿侧(hygrometer / luftbefeuchter+verdunster+hygrostat / infrarot+thermometer)。

**判定线 `eco-luftbefeuchter-1220`(2026-12-20,窗口覆盖 12 月峰值)**:
28 天真人 pv **≥50** 或 affiliate_click **≥5** → 「补齐已验证品类的季节性反面」成立,按同法补加湿侧尺寸页;
**pv <20 → 推翻「品类对称即机会」这条假设,维持 2 页不再扩。**

**别再提**:matratze / kaffeevollautomat / 任何礼品季大词(niche 外)、saugwischer 及整条 Bodenpflege
扩张(峰值 3,2 + 56 天 1 pv,已判负)、luftreiniger 当冬季题(峰值在 6 月)、
rising 污染检测的「最高行离题」修法(已实测误杀好种子)。

## 国别维度:先证伪两个假设,再修一个真缺陷(2026-09-16,owner:「我说了要扩展不同国家的关键产品」)

**上一轮我把「其他热门产品」做成了「德国还有哪些品类」,漏了国别。** 这一轮按国别测,
结果先推翻了本站关于国际化的两个既有假设。

### 一、`/it/` 意大利语试点:上线至今 0 个真人(D1 一手)

`it_pv_alltime` = **9**,且 **9 条全部 `ua_class='bot'`**(来源 US/SG、零 referrer);
28/56 天窗口 **human pv = 0、affiliate_click = 0**。11 页、三写手并行 + 中央复校、08-28 上线,
**没有任何真人看过**。判定线 `eco-it-pilot-1027` 的口径含 Bing 曝光(owner 侧),故**不提前判负**,
读数已记进台账。**但在 10-27 之前,不得以「多语言有效」为由新建任何语言版本。**
→ **推论:靠「翻译出一个国家站」来扩国别,在本站已经试过一次,产出是 0。**

### 二、美国是第二大「国家」,但大部分不是人

56 天真人 pv:DE 230 · **US 93** · AT 23 · ES 12 · SG 8 · CH 6 · NL 5 · GB 5 · CA 4 · IT 3 · FR 3。
**US 的 93 里有 67 落在德语页上**,反常。逐项验:
`/guide/midea-portasplit-ausverkauft-alternativen.html` 拿到 **23 次 / 跨 22 个不同日期 / 23 条里 22 条无 referrer**,
且 **10 条集中在 UTC 02 点**——每天一次、固定时辰、无来源,是定时任务不是读者。
**小时分布对照(56 天)**:DE 峰值在 **UTC 13–15 点**(本地下午,人类曲线);US 峰值在 **UTC 01–04 点**。
→ **可信的美国读者 ≈ `/en/` 上的 26 pv,不是 93。** 以后引用美国数字一律用 /en/ 口径,
并且 `eco-us-market-0925` / `eco-us-switch-1005` / `eco-us-shelf-1015` 三条线结算时要按这个口径复核。

### 三、各国的「关键产品」确实不同(5 年,每国用本国语言、本国篮子)

**⚠️ 刻度纪律:每个国家只在自己的篮子内归一化,跨国比较绝对值无效**,只能比**排名与峰值月**。
工具:`python3 tools/fetch_seasonality.py --countries` → `data/seasonality-by-country.json`。

| 国家 | 领先词(峰值/峰值月) | 第二 | 冬季要点 |
|---|---|---|---|
| **IT** | **muffa 31,0 / 1 月** | condizionatore portatile 30,6 / 7 月 | 制冷冬季掉到 **1,0**;**意大利冬天的题是霉** |
| **ES** | aire acond. portátil 39,6 / 7 月 | **calefactor 34,7 / 11 月** | 取暖几乎与制冷同量级(西班牙少有中央供暖) |
| **GB** | **dehumidifier 25,5 / 11 月** | **mould 23,8 / 11 月** | 制冷冬季 **0,0**;英国冬天是除湿+霉 |
| **US** | mold 76,0 / 8 月 | portable AC 24,4 / 6 月 | 冬季是 **space heater(峰值 1 月)** |
| **FR** | climatiseur mobile 14,1 / 6 月 | 其余全部 ≤1,4 | **整体极弱,不投** |
| DE | schimmel 18,6 / 1 月 | mobile klimaanlage 12,3 / 6 月 | 与 09-15 的结论一致 |

**共同形状:所有欧洲市场的制冷在冬季归零(0,0–1,3),而霉/除湿/取暖上升。**
**而 eco 的国别页(italy / spain / france / europe-heatwave)全部是制冷页**——它们将在每个市场休眠半年。

### 四、变现门决定了这轮能动哪个国家

- amazon.**com** `ecoback0d-20` —— **已确权、已在跑**(唯一确认可用的非德市场)。
- amazon.**co.uk** —— 08-06 已记录:`getecoback-21` 在 .co.uk **不计佣**。英国流量目前**无法变现**。
- amazon.**it / .es / .fr** —— tracking ID **仍未核实**(08-28 起悬置)。
  **本轮实查:站内 `.it/.es/.fr` 全部只是正文提及,没有一条链接**——没有错 tag 泄漏,纪律是守住的。
→ 所以:**英国和意大利的需求虽然更好看,但现在只有美国能赚到钱。**

### 五、修掉的真缺陷:挂着美国货架,却只用平方米说话

`electric-heater-20-sqm.html` 里 **m² 出现 25 次,"sq ft" / "square feet" 出现 0 次**,
而它**带着 US 货架**(`Recommended in the US`)。即:**唯一有可用 tag 的市场,被推荐美国机器,
却用美国人不使用的单位描述房间大小**——而 US 的 space heater 峰值正是 **1 月**,缺陷马上就要进旺季。

**修法 `EB_USUNITS`**(13 张 EN qm 梯页:heater 7 + dehumidifier 6):默认 `hidden`,
由既有的 US swap 脚本对北美读者揭示。内容只含**算术**(20 m² ≈ 215 sq ft)与**换算口径**
(瓦特全球通用;页上 €/h 按 €0,30/kWh,约为美国民用电价两倍,给出 `瓦特 ÷ 1000 × 你的 ¢/kWh × 小时`)。
电价**给区间不给单值**:EIA Electric Power Monthly 表 5.3(数据月 2026-06)把月度/年初至今/滚动 12 个月
排在同一表头下,**指认其中某一个数字等于把猜测包装成引用**,故写「2025–2026 约 17–18 ¢/kWh」并附源链接。

**刻意不动标题与 URL**:`eco-en-qm-bing-1012`(2026-10-12,Bing 收录率,t0=0)正是量这 13 个 URL 的,
改标题等于毁掉它自己的基线。实测 diff 里 `<title>` 与 `canonical` 零变化。

**闸门**:`check_usshelf.py` 新增三条断言(梯页必须有盒子 / 非梯页不得有 / **必须 hidden**,且盒子里的
房间尺寸必须等于该页自己的尺寸)。**三种改法逐一实测变红**(改成可见、删掉盒子、把 20 改成 22),
还原后绿。部署自检同时断言线上「有那句 sq ft」且「仍然 hidden」——
**可见比缺失更糟:那会让每个德语读者迎面看到 "Reading this in the US?"**。
Playwright 三时区实测:`Europe/Berlin` 隐藏、`America/New_York` 与 `America/Los_Angeles` 显示,pageerror 0。

**判定线 `eco-us-units-0131`(2027-01-31,窗口覆盖 space heater 的 1 月峰值)**:
美国 /en/ qm 页真人 pv ≥40/28d **且** us-shelf 点击 ≥3(t0:26 pv / 0 点击)→ 把 sq ft + 本地电价口径推到其余 EN 页;
**点击仍 0 → 美国面的问题不是单位而是分发,停止投入,EN 区回到只服务 EU-English 读者。**

**别再做**:
- **不为 GB/IT/ES/FR 建页或建语言版本**,直到 ①/it/ 判定线结算 ②对应市场的 tag 被 owner 确权。
  英国需求(dehumidifier 25,5 + mould 23,8,双双 11 月见顶)是**全部非德市场里最好的一块**,
  但 `getecoback-21` 在 .co.uk 不计佣,**建了也收不到钱**——这是 owner 侧一个动作就能解锁的,值得每轮带出。
- **法国不投**(全部词 ≤14,1 且其余 ≤1,4)。
- **不要再用 93 这个数字说「美国是第二大市场」**。

## 英国 + 荷兰市场:量完之后都不做,并纠正我自己上一轮的一句错话(2026-09-16,owner:「英国市场拓展」「然后是荷兰市场」「不同市场卖货不同,从亚马逊热点找」)

### 先纠正我上一轮说错的一句

我上一轮写「英国建了也收不到钱」——**不准确**。手册 1529 行早就记清楚了:
**GB 读者点的是 amazon.de 链接、带 `getecoback-21`,在 .de 成交照样计佣**;
08-06 记的只是「`getecoback-21` 用在 **.co.uk** 上不计佣」。
所以英国不是「不可变现」,是「只能走 .de,而英国人脱欧后很少在 .de 下单」。差别很大,别再传错。

### 这件事上一轮已经判过,而且判得对

手册 500 行(更早的会话)已有结论:**GB 19 pv / 8 点击,诚实算术 ≈ 即便变现也只有 ~€1-2/月,
不值得 owner 为此加入 Amazon UK Associates;不做,数字留档,GB 流量涨 10 倍再议。**
本轮把窗口从 28 天拉到 **90 天**,结论只会更硬。

### 90 天一手读数(D1,真人)

| 市场 | 90 天真人 pv | 落在哪些页 | 来源 |
|---|---|---|---|
| **GB** | **5** | spain ×2、leaking-water、attic-bedroom、europe-heatwave | Bing / DDG |
| **NL** | **5** | dachfenster ×2、tilt-and-turn ×2、vent-without-window | 站内 / **chatgpt.com** |

**两个市场都是 90 天 5 次浏览 —— 约每 18 天一个人。而且全部是制冷页、全部是夏季内容。**
(有意思的一条:英国人在读一篇讲**西班牙**的页;荷兰那 2 次来自 ChatGPT,又是 AI 引荐那条线。)

**按本站自己实测的漏斗算(pv→点击 18,9%,€0,10/点击)**:
- GB = **€0,38/年**;NL = **€0,38/年**。
- **即便流量涨 10 倍,也各是 €3,83/年。**
Amazon UK Associates 还有一条:开户后 180 天内无合格销售会被关户——以 5 pv/90d 的量,
**英国账号大概率在赚到第一分钱之前就被关掉**。→ **两个市场都不做。结论不变,证据更强。**

### 荷兰是新测的,结论是「需求不在本站的品类里」

5 年 `interest_over_time`(每批内部归一化,跨批不可比):
- 批一:`airco` **17,6**(6 月) ≫ `schimmel` 2,1 · `elektrische kachel` 1,1 · `luchtontvochtiger` **0,6**
- 批二:`verwarming` **45,2**(11 月) ≫ `ontvochtiger` 3,2 · `vocht in huis` 1,4 · `condens ramen` 1,1

**两条要点**:①荷兰最大的冬季词是 `verwarming`(供暖系统/锅炉/安装),**不是本站卖的便携电器**,
也不是 Amazon 能变现的形态;②**荷兰的「霉」几乎不是搜索题**(schimmel 2,1 vs airco 17,6),
与德国正好相反(DE:schimmel 18,6 vs klimaanlage 12,3)。房屋存量更新、保温更好,是合理解释。
→ **荷兰没有本站服务的那种需求。不是变现问题,是需求问题。**

### 「从亚马逊热点找」——这条路本轮走不通,原因要记死

owner 要求按**亚马逊热销榜**选品(方向是对的:搜索量 ≠ 销量)。实测:
- `amazon.nl/gp/bestsellers` **robots.txt 未禁**(`/gp/bestsellers` 不在 Disallow 列表),
  curl 拿到 300 KB **且无验证码** —— 但**商品是 JS 懒加载的**,HTML 里 0 个 ASIN。
- `amazon.co.uk` 与 `amazon.de` 的同一路径 **返回 3,8 KB 验证码墙**。
- 想用 Playwright 渲染 → **本会话 Chromium 打不开任何外部 HTTPS**:代理 CA 未进 Chromium 的 NSS 库,
  `certutil` 不可用、装不上。实测 `example.com` 同样 `ERR_CERT_AUTHORITY_INVALID`,
  **不是亚马逊的问题,是本会话浏览器的结构性限制**(这也解释了为什么 `browser_smoke.cjs` 只测 localhost)。
- 退而求其次想用 rising 拿品牌/型号词(最接近「在卖什么」),**related_queries 配额当天已打爆**;
  库给的建议是「换 referer」——**属绕过,按本站一贯纪律不做**。

**结论:本会话拿不到亚马逊热销数据,而且不要再试这三条路。**
**真正的正路已经在仓里**:`tools/product_intel/`(PA-API,亚马逊官方商品数据接口,
可按 BrowseNode 取热销),门在 `vars.PAAPI_ENABLED` + 三个 secret,**现在是关的**。
它目前**硬编码 `webservices.amazon.de` / `amazon.de`**;要取别国热销榜,既要改 host/region,
**也要 owner 在对应站点有 Associates 账号**——而这正是上面算术说不值得的那件事。

### 所以本轮不建页,并把话说清楚

按本站铁律(三门里的**变现门**、以及 08-28「稀释不是杠杆」),**英国与荷兰都不建页、不建语言版本、
不伪造 `.co.uk`/`.nl` 链接**。真正的瓶颈不是国别覆盖,是**全站每天只有约 19 个真人**——
分给更多国家不会凭空造出人来。/it/ 已经用 11 页 0 真人证过一次。

**什么情况下我会改口(写下来,免得每轮重问)**:
① GB 或 NL 的 90 天真人 pv 到 **50+**(即今天的 10 倍),或 ②owner 明确说「就算不赚钱也要占住这个市场」,
或 ③owner 开了对应 Associates 账号并给了 PA-API 凭据。**在此之前,英国那块需求(dehumidifier 25,5 +
mould 23,8,双双 11 月见顶)只作为「最好的非德市场」留档,不投入。**

## 外链:两个能自己修的缺陷,和一条不需要任何人说「好」的路(2026-09-16,owner:「外链你用其他办法帮我做」)

### 先说清楚这一轮能做什么、不能做什么

按仓库规矩先调了 `linkbuilding` 技能,它把本站判为 **Foundation phase**(域龄 70 天、
零外链、无品牌信号),推荐的两条是 entity stacking 与 citations/directories ——
**这两条都要 owner 去注册账号**,正是 owner 让我「用其他办法」绕开的东西。
所以本轮不写外联话术、不列目录清单,只做**代码能做完的部分**:
把本站已有的、别人有理由链接的东西,变成机器找得到、并且**转载即产生链接**的形状。

### 缺陷一:本站有一个开放数据集,但对机器不可见

`sizing-data.json` 自 2026-08-31 起 CC BY 4.0 上线、HTTP 200、7 条规则 + 3 条梯子(19 行)。
实测发现:**全站零 `schema.org/Dataset` 标记,没有落地页,只有 `for-agents.html` 一处链接。**
Google Dataset Search 是专为数据集建的发现面 —— **自动收录、不要账号、不要外联、不需要任何人批准**,
而一个裸 JSON 文件在它眼里不存在。对一个 70 天龄零外链的域来说,
**一条不需要别人说「好」的路比一条要别人点头的路值钱。**

已建 `tools/build_dataset_page.py` → **`/daten.html`**:
- 完整 `schema.org/Dataset`(name/description/url/license/creator/publisher/distribution/
  isAccessibleForFree/variableMeasured/dateModified/keywords)。
- **两种 distribution**:原有 JSON + 新增 **`/sizing-data.csv`**(长格式 24 行,
  `section,key,m2,value,unit,room,guide`)—— 程序要 JSON,而真会署名的人要的是表格。
- 「怎么署名」给的是**可直接粘贴的 HTML**(带 `<a href>`),不是纯文本 —— CC BY 的唯一条件是署名,
  **署名做成链接形状,转载就是外链**。
- **零联盟链接**(browser 实测 `a[href*=amazon]` = 0)。这一页是可信度资产,不是货架,永远不要往上挂链接。
  **说准确一点**:页面自身不含任何商店链接,gate 会断言;但全站 chrome 照常注入
  (`EB_PROFILE` 存房间条 + `EB_USSWITCH`),与 impressum/datenschutz 一视同仁 ——
  存过房间的回访读者仍可能在这一页顶部看到一条商品条。这是站级留存件,不是这一页的变现,
  本轮不动它。gate 因此**跳过 `<script>` 只看标记里的链接**:第一版扫原始 HTML 会被
  USSWITCH 自己的字符串拼接误报,那是假阳性不是发现。

**单一事实源**:页面与 CSV 的每个数字都从 `sizing-data.json` 读。
排序上有个坑值得记:这一页必须排在 `build_structure.py`(要 nav/footer)和 `build_sitemap.py` 之前,
而 `sizing-data.json` 是流水线很后面的 `build_agent_md.py` 写的。**解法不是断言而是消除**:
`build_dataset_page.py` 自己先调 `build_agent_md.build_dataset()` 再读 —— 幂等,后面那次是 no-op,
于是「改了规则却发了旧数字」这件事在结构上不可能发生,而不是靠 gate 事后抓(靠抓的话,
改规则的那天部署会红,而那本是一次完全合法的改动)。

### 缺陷二:每一次 widget 嵌入都在白送

`widgets.html` 给出的嵌入片段此前是**裸 `<iframe>`**,而 widget 页自身带 `noindex`,
里面的链接又在 iframe 内 —— **一次嵌入产生的链接权重正好是零**。本站等于免费送计算器,
一分钱链接都收不到,而 CC BY 本来就要求署名。
4 个静态片段 + JS 配置器生成的片段现在都自带宿主页署名行(链到 `/daten.html` + CC BY)。

### 断言的是事故的形状

`tools/check_dataset.py`(已进 gate):Dataset 必填字段、distribution 必须同时有 JSON 与 CSV、
CSV 必须存在且行数 = 表头 + 非散文规则数 + 梯子行数、不许参差、页面数字不许与数据集漂移、
5 个嵌入片段都必须带署名链接。**逐条验过能红**:删 CSV、删一行、弄参差、从 schema 里拿掉 CSV、
删配置器那条链接 —— 五种都红。另外 gate **自己瞎了也会红**(找不到 `code.textContent=` 赋值就报错),
这一条是上一轮被假通过咬过之后加的。
部署后自检两条:`/daten.html` 断言的是 **`"@type": "Dataset"` 这个节点**(事故形状是「页面渲染完美但
不再是数据集」,不是 404);`/sizing-data.csv` 断言 **content-type 含 csv**(schema 里承诺了 text/csv,
边缘若发成 octet-stream,承诺就是假的,而页面看上去毫无异常)。

### 判定线 `eco-dataset-search-1111`(2026-11-11)

指标:**D1 crawl 表里 googlebot 抓 `/daten.html` 的次数**(该表只记 HTML,所以 .json/.csv 不会进)
+ 该页 28 天真人 pv 与外部 referrer。t0 = 0(页面此前不存在)。
- **赢**:googlebot 至少抓过 1 次,且出现 ≥1 个非搜索引擎外部 referrer 或 ≥20 真人 pv/28d
  → 把这个形态复制到舰队第二个有自有数据的站(SR landed-cost 或 agi odds)。
- **输**:googlebot 从未抓过 → Dataset Search 对 70 天龄零外链域不通,**不是内容问题**;
  停止再投机器发现面,只维护不扩建。

### 不要再提的(本轮已判)

需要 owner 注册账号的一切外链动作(目录、Wikidata、社媒 entity stacking)——
不是不对,是**本会话做不了**,列出来只是把活推回给 owner;要做由 owner 直接说。
PBN / 链接交换 / 群发目录 —— 技能文档里明确列为 Google SpamBrain 打击对象,永不做。
往 `/daten.html` 挂联盟链接 —— 这页的全部价值来自它不卖东西。

## 德语区读数与两个品类裁定（2026-09-17，owner：「德语区再继续做大」+「热泵是不是也是德语区重点」+「充电桩也是」）

**全部为 D1 现查 28 天窗（ecoback-events，剔 CI），任何后续会话可复算。**

### 一、德语区是钱的来源，且集中度极高
DE+AT+CH 合计 **54 / 71** 次真人 affiliate_click = **76%**；DE 单独 272 真人 pv → 49 次点击 = **18.0% 点击率**
（AT 15.4%、CH 7.1%、US 6.3%）。手册 08-27「瓶颈是流量不是转化」的裁定**再次被证实**，不要推翻它。

### 二、**Google 对德语区送来的流量是 0**（本轮最重要的一条）
DACH 28 天真人 pv 按来源：DuckDuckGo 90、other 79、无引荐 57、Bing 49、Ecosia 18、Yahoo 14、其它搜索 5，
**Google 0**。DDG / Ecosia / Yahoo 全部取自 Bing 索引 —— 即**本站全部德语搜索流量来自同一个索引**，
而占德国约 90% 份额的 Google 一次都没送过人。同期爬虫日志：**googlebot 249 次 / 7 天**、bingbot 314 次
（`ev` 表 `name='crawl'`），所以是**爬了但没排名**，不是被挡。
**已逐项排除技术原因**：robots.txt 全放行、canonical 正确、无 noindex、hreflang 在位、sitemap 209 条
（含 140 条德语 guide）、IndexNow 已接（部署按 diff 推 + eco-health 周一再推近 7 天改动页）。
`site:` 探测显示 Bing 只收了约 50 / 209。**结论：没有仓库里能修的缺陷，受限的是域名年龄与权重
（站约 2.5 个月）。** 后续会话不要再去「修 Google 收录」——先确认这条，别重复排查。

### 三、两页的「0 点击」是假流量造成的假象，不要去优化它们
- `midea-portasplit-ausverkauft-alternativen`：32 pv 里 **US 28（其中 27 条无引荐）**、真实德语读者只有 4。
- `luftentfeuchter-20-qm`：11 pv 里 US 8（7 条无引荐）、真实德语读者只有 2。
与 09-16 那轮对 US 流量的判断一致。**任何按 pv 排序的优化清单都必须先按 country+ref 过滤**，否则会把
人力投在没有读者的页面上。

### 四、真实的转化分层：买点型 vs 排障型（这条决定新品类怎么做）
同样的货架结构（3 toppick + 2 inline），转化差一个数量级：
- **买点型**：`klimaanlage-dachfenster` 6/9 = 67%、`klimaanlage-15-qm` 3/6 = 50%、`klimaanlage-25-qm` 33%、
  `klimaanlage-kippfenster` 25%、`klimaanlage-wohnmobil` 约 19%（剔假流量后）。
- **排障型**：`growatt-noah-2000-probleme` 1/29 = **3.4%**、`mobile-klimaanlage-ueberwintern` 1/29 = **3.4%**
  —— 两页都是 **100% 真实德语读者且带引荐**（DE 26+AT 3 / DE 24+AT 5），货架顺序也没错
  （ueberwintern 的 toppick 就是防尘罩/滤网/清洁剂，空调机型排在后面）。
  **差的是读者当下的意图**：机器坏了的人要修，不是要买；把空调收起来的人不会再买空调。

### 五、热泵 —— 不做（一半早已裁定）
- **线索形态 08-28 已列入舰队杀单**（要 Hauseigentümer，而本站读者是 Mieter）。别再提。
- **联盟形态不成立**：Luft-Wasser 热泵是 €10–30k 的安装型资本品，走 Handwerker + BAFA/KfW 流程，
  不是 Amazon 商品。能在 Amazon 买的那一半是 Luft-Luft，本站**已有** `/guide/klimaanlage-mit-heizfunktion.html`。
- 即使 Trends 读数很高，它的含义也只能是「多做制热内容」，**永远不是「卖热泵」**。

### 六、充电桩（Wallbox）—— 唯一值得继续量的候选，但不是现在
- **正面**：amazon.de 真能买到（11 kW 壁盒），客单价远高于除湿机；德国并网报备（Netzbetreiber 申请、
  §14a EnWG）正是本站「带出处、有责任」型内容的强项。
- **本站已有的反面证据**：能源硬件这个邻接**已经存在**——`growatt-noah-2000-probleme`（阳台光伏储能）
  带来 26 个真实德国读者，**但只转化 3.4%**，因为来的是排障查询不是购买查询。
  所以 wallbox 若要做，**必须做成第四节的「买点型」**（选型/尺寸/合规清单），做成排障型等于复制 3.4%。
- **两个未解**：受众偏业主而非租客；佣金费率在登录后的 Vergütungskatalog 里，**任何人都不要凭记忆报这个数**。
- **本轮动作**：把 `wärmepumpe` / `wallbox` / `balkonkraftwerk`（**对照组**，本站已有排名）加进
  `tools/fetch_seasonality.py` 的候选品类批次，连同上面的推理一起写在文件里，避免下一轮重推。
  ⚠️ 该脚本**不在任何 schedule 上**（`eco-trends.yml` 只跑 `fetch_trends_de.mjs`），需会话在 runner 上手动跑一次才有读数。

### 七、Google 深度诊断第三轮：技术面再排除一遍，并第一次量了「兄弟页有多像」（2026-09-17，owner：「Google没有排名，做一次深度的谷歌优化」）

**先认账：这件事站里已经查过两轮**（08-28「8 周龄按基线就该是零 Google 点击，真正落后的是外链」；
09-15「Google 不是没抓，是抓了不给量……别再为 Google 做技术性修复」）。**那两条结论本轮没有被推翻。**
本轮只做了两件此前没做过的事。

**① 排除了两个此前没验过的技术嫌疑（都干净）**
- **无伪装**：用 Googlebot UA 与真人 UA 各抓一次 `/guide/klimaanlage-wohnmobil.html`，
  **两份 HTML 逐字节相同**（81.788 B），无跳转、无 `X-Robots-Tag`、200。
- 前两轮查过的 canonical / noindex / hreflang / sitemap / IndexNow 本轮复核仍然干净。
→ **「服务端给 Google 看的是另一个东西」这个嫌疑可以彻底划掉，不要再查第三遍。**

**② 第一次量了模板页族的近重复度（新数据）**
剔掉全站样板 8-gram（出现在 ≥25% 页面上的 630 条）后，兄弟页之间的 8-gram Jaccard：

| 页族 | 页数 | 平均相似度 |
|---|---|---|
| heizung-N-qm | 7 | **54.0%** |
| luftentfeuchter-N-qm | 6 | **52.4%** |
| klimaanlage-N-qm | 7 | 32.1% |
| **对照：随机两页（不同主题）** | — | **0.3%** |

兄弟页共享的独有正文是无关页面的 **一百多倍**。共享内容里既有正文（「Bei mehreren Panels auf
verschiedene Stromkreise verteilen」），也有整块重复的 CTA/组件（Angebots-Vermittlung、Hitze-Radar）——
后者是按页族批量注入的，所以逃过了「≥35 页才算样板」的过滤。
**这是 Google 压制、Bing 相对容忍的门页形态**，与「googlebot 249 次/7 天却零排名、Bing 收了约 50/209」
的形状一致。**但这是相关不是因果**：域龄与零外链两条旧结论仍然在位，本轮没有证明重复度就是主因。

**③ 已建 `tools/check_duplication.py`（挂进部署流水线，只报数不拦部署）**
- 写 `data/duplication.json`；`--gate --max N` 可在改写完成后改成强制。
- **今天读数本来就超标，所以默认不拦**——上线即红等于把一个待办变成一条坏掉的流水线。
- 自检能红，且**两个方向都测**：近重复页判成低相似 → 红；各写各的判成高相似 → 红。
- **首次自测就抓到一个真缺陷**：样板阈值按语料规模算，夹具只有 3 页时 `thr=2`，
  于是兄弟页共享的正文被当成「全站样板」剔光、相似度算成 0。夹具已照真实语料补到 23 页，
  并加了防御：**页族大到占语料 ≥25% 时直接报「测不准」而不是报一个假性偏低的数字**。

**④ 修的方向：改写，不是删页**
这些 URL 上有 Bing 的收录与现有营收（`klimaanlage-15-qm` 50% 点击率、`25-qm` 33%），
**为讨好 Google 而合并或 301 会拿正在赚的钱去换一个没有证据的假设**。正确做法是让每页正文各写各的，
URL 不动。**先动 heizung-N-qm（7 页，54.0%，且该族几乎没有流量，改坏了也不损失什么）。**

**⑤ 品类调研这一半本轮不重做**：站里已有裁定——matratze / kaffeevollautomat 离题（08-28「稀释不是杠杆」）、
Bodenpflege 判负（saugwischer 峰值 3.2 / 56 天 1 pv）、luftreiniger 峰值在 6 月、konvektorheizung 峰值 1.2。
**德国搜索规模表里最大的「本站主题内」品类是 schimmel（峰值 68.5，只有 5 页），而规模只有它一半的
luftentfeuchter 有 11 页** —— 这个错配才是品类侧的下一步，不需要去碰离题大词。

**判定线 `eco-dup-rewrite-1117`（2026-11-17）**：heizung-N-qm 改写后该族平均相似度 **≤20%**
（t0 = 54.0%），且 28 天内该族出现 **≥1 次 Google 引荐**（t0 = 0）→ 重复度确实是抑制因素之一，
按同法改 luftentfeuchter-N-qm；**相似度降下去了而 Google 仍是 0 → 重复度不是本站的绑定约束，
回到域龄/外链那条结论，不再为 Google 改写正文。**

### 八、改写已执行：heizung-N-qm 七页各回答一个不同的问题（2026-09-17，owner：「Google零流量，强制进行深度审查，然后变更，不用管eco手册！」）

第七节停在「修的方向是改写」。owner 当日要求的是**变更**，所以本节是执行结果，不是又一轮诊断。

**读数：`heizung-N-qm` 平均 8-gram 相似度 54.0% → 19.5%，最差一对 55.3% → 20.4%（对照组 0.3%）。**
判定线 `eco-dup-rewrite-1117` 的相似度那一半已达成；另一半（28 天 Google 引荐 ≥1）到 11-17 才读，**现在不判**。

**做法：`tools/differentiate_heizung.py`，一个幂等注入器，挂在 deploy 链的 `build_structure` 之前。**
不用改 `gen_heizung_qm.py` 重跑——那是一次性脚手架，实测重跑会冲掉约 337 行后来注入的组件
（`content_heizung_qm.json` 的 note 2026-08-28 就写着这条，本轮又验证了一次）。它必须跑在
`build_onpage` **之前**，因为 TOC 是从 `<h2>` 重建的。

**「不同」是指真的不同，不是换同义词。** 每页拿到的是**在那个尺寸上才成立的问题**，并且用的每个数字
要么页面上本来就有，要么是页面上已有数字的算术：

| m² | 参考功率 | €/h | 每季 | 16 A 电路剩余 | 这一页真正回答的问题 |
|---|---|---|---|---|---|
| 10 | 700 W | 0,21 | 63 € | 2.800 W | 成本根本不是问题，同一回路上还能挂什么才是 |
| 15 | 1.050 W | 0,32 | 94 € | 2.450 W | 居家办公一天 8 小时而不是 5 → 151 €，差价 57 € 比跨尺寸的 32 € 还大 |
| 20 | 1.400 W | 0,42 | 126 € | 2.100 W | 全系列第一次进三位数；卧室加热与结露的关系 |
| 25 | 1.750 W | 0,53 | 158 € | 1.750 W | 单块板不再是常态，问题从瓦数变成摆放 |
| 30 | 2.100 W | 0,63 | 189 € | 1.400 W | 开放式户型让「面积 × W/m²」的前提失效 |
| 40 | 2.800 W | 0,84 | 252 € | 700 W | 老房算值 4.000 W 已超过单条回路的 3.500 W |
| 50 | 3.500 W | 1,05 | 315 € | **0 W** | 正好顶到 16 A 上限；结论与 10 m² 页相反 |

**「电路剩余 = 3.500 W − 参考功率」是这一族的脊梁**：它是真正随尺寸变化的数字，从页面早就印着的
16 A/3.500 W 推出来，而且**在 50 m² 正好归零**——所以这一族最后给出的建议与第一页不同，而不是同一句话配更大的数字。
副作用：`kategorie/heizen.html` 上原本七张一模一样的卡片，现在是七个不同的问题。

**三条没有让步的东西**
- **标题保留 query 词头**（`Heizung für N m²`），只换尾巴。Bing 就是靠它排的，且这些 URL 上有现有营收
  （`klimaanlage-15-qm` 50% 点击率）。为一个零引荐的搜索引擎去动正在赚钱的东西，是只有下行的赌。
- **零编造**：文案里每个 € 数字都由 `figures()` 重新推导，自检对不上就红（变异测试：把 63 € 手改成 59 € → 红）。
  唯一的四个「额外」数字是 15 m² 的居家办公变体（151 / 57 / 32），三个都在页面上写了算式。
- **安全表述照旧只指向厂商与电工**：16 A/3.500 W 是页面原有的数字，浴室、回路划分一律以「问电工」收尾，
  不新增任何 IP 等级、VDE/DIN 条款或最小间距。

**`check_adlabel` 当场抓到一个真缺陷**：正文被包进 `<!--EB_QMDIFF-->` 后，两个联盟块进入了该门的检查范围，
而它们此前只靠文章顶部的 disclosure。按本站自己的规矩（「标签属于广告本身，不是 600 px 以外」）已各加
Werbekennzeichnung，注入器自检也断言了这一条。**这正是门该有的样子：新形状一出现就红。**

**回归护栏**：`check_duplication.py --regress` 现在对已改写页族设双天花板（平均 25% / 最差一对 30%），
超过即把部署打红。**为什么要两个数**：实测只把 7 页里的 2 页还原回旧版，平均只从 19.5% 升到 21.6%，
而那两页彼此已经是 54.8%——只盯平均会漏掉一半的事故形态。触发时要查两件事：注入器还在部署链里吗，
有没有人重跑过 `gen_heizung_qm.py`。

**⚠️ 同日发现的更大缺口：这个度量此前只看 `site/guide/*.html`，英语与意语的同形页族从来没被测过。**
收进来（各语言单独成语料，否则样板阈值会系统性抬高小语料的读数）之后：

| 页族 | 页数 | 平均相似度 |
|---|---|---|
| **en:dehumidifier-N-sqm** | 6 | **61.4%** |
| luftentfeuchter-N-qm | 6 | 52.4% |
| en:electric-heater-N-sqm | 7 | 52.1% |
| klimaanlage-N-qm | 7 | 32.1% |
| heizung-N-qm（本轮改写后） | 7 | **19.5%** |

**舰队里最像门页的其实是英语的 `dehumidifier-N-sqm`，比任何德语页族都高。**先修德语只是因为判定线
押在那儿，不是因为它最坏。**下一族改哪个由 11-17 的读数决定**：Google 引荐仍是 0 就不再为 Google 改写，
那时英语这两族的价值另算（它们面向的是 Bing/DDG 与 AI 引用面，不是 Google）。
**通用教训**：修好被测量的那一半、另一半根本没人看，是本仓反复出现的形态（bpj 的
`/for-vendors` 90 天 2 次浏览、`vendor_inquiries` 表根本不存在，都是同一个形状）。

## 英国:改口了,并且说清楚上一轮为什么测错(2026-09-17,owner:「继续扩展品类,重点是英国」)

### 我上一轮的英国结论是用错误的尺子量出来的

昨天我写「GB 90 天 5 pv,€0,38/年,不做」。**数字没错,推论错了。**
今天把 GB 的 15 条 page_view 逐条拉出来看(D1,90 天):
**全部 15 条无一例外落在夏季制冷页或首页** —— spain、europe-heatwave、leaking-water、
attic-bedroom、skylight、tilt-and-turn、italy。6 条来自搜索引擎(DDG 3 / Bing 2 / Yahoo 1)。

而 EN 区 43 个页面里 **25 个是便携空调**。所以昨天那句「英国人不来」的准确说法是:
**我们只摆了夏季货,而英国的需求在冬季** —— 这不是需求判决,是库存判决。
**教训(适用于任何市场):用现有库存去量一个市场的胃口,量到的是库存不是市场。**

**口径也要记一笔**:GB 15 = 严格 `ua_class='human'` **5** + `ua_class IS NULL` **10**。
NULL 是 JS 信标行(跑了 JS,更像真人),昨天报的 5 是严格口径,两个都对,引用时必须说明是哪个。

### 英国的需求形状:唯一一个冬季压过夏季的市场

`fetch_seasonality.py --market GB`(新增,5 年 `interest_over_time`,anchor=`dehumidifier`,
写 `data/seasonality-gb.json`,13 词 0 失败):

| 词 | peak | 峰值月 | 冬/九月 |
|---|---|---|---|
| **dehumidifier** | **53,8** | **11** | 1,79 |
| **damp** | **31,2** | **11** | 1,12 |
| condensation | 21,0 | 11 | 1,96 |
| **electric blanket** | 19,1 | 11 | 1,49 |
| **heated airer** | 15,5 | **10** | **0,59** |
| oil filled radiator | 6,4 | 11 | 1,6 |
| black mould | 4,8 | 11 | 1,82 |
| drying clothes indoors | **0,1** | 9 | 0,0 |

**四条读法**:①GB 是六国 basket 里**唯一**前两名都在 11 月见顶、且双双压过夏季词的市场
(DE 的 #2 是 6 月的 mobile klimaanlage);②`heated airer` 峰值在 **10 月**且冬季均值低于九月
(0,59)—— 这是**赛前采购形状,窗口就是现在**;③`damp`(31,2)远大于 `black mould`(4,8):
**英国把这件事叫 damp,不叫 mould**,而站内 EN 区 `damp` 进标题的页数 = **0**;
④`drying clothes indoors` = **0,1**,我原本的假设被自己的数据杀掉 —— 需求在**产品词**
(heated airer)不在活动词。

**`related_queries`(GB,12 个月)补两条决定性的**:`20l dehumidifier` 居 top
→ **英国按升数和卧室数买,不按 m²**(站内 EN 六张梯页全是 sqm);rising 里
`meaco dd8l pro desiccant` 与 `devola 12l compressor` 并列 → **desiccant/compressor 是英国特有的分野**,
而站内货架 100% 是 compressor。

### 本轮建的三页(EN,全部零商店链接)

1. **`/en/guide/desiccant-vs-compressor-dehumidifier.html`** —— 英国最大品类的买点问题。
   **物理是算出来的不是断言的**:压缩机靠冷盘凝水,盘必须低于房间露点;10 °C/60% 的露点 = **2,6 °C**,
   盘要更低 → 实际掉到零下 → 结霜除霜。页面带露点计算器(复用白名单事件 `taupunkt_check`),
   三档温度给三种结论(实测 20 °C→compressor / 12 °C→borderline / 8 °C→desiccant)。
2. **`/en/guide/rising-damp-penetrating-damp-or-condensation.html`** —— 英国三种 damp 的分辨表
   (位置 × 时机 × 外观 × 谁能修)。**诚实路由:三种里只有一种是除湿机能解决的**,
   另两种明说「买机器没用」。租客一行链到 gov.uk 与 Shelter(两个 URL 均实测 200,不编)。
3. **`/en/guide/heated-airer-vs-dehumidifier.html`** —— **真正的新品类**,窗口就是现在。
   杀手级算式:18 °C 的 30 m³ 房间从 55% 起**只能再吸 207 g 水**就饱和 —— 一桶洗衣远超此数,
   所以**多出来的水必须凝结在最冷的表面上**(窗、外墙)。带容量计算器,浏览器实测与 Python 逐位一致。

### 两个必须记死的工程决定

**① UK 电价不能手写。** 站内成本口径是 €0,30/kWh,英国是 Ofgem 上限、按 p/kWh、**每季度变**。
新增 `fetch_ofgem_cap.py` → `data/ofgem-cap.json`(实抓:**26,32 p/kWh,1 Oct–31 Dec 2026**,
上限 £1 723/年,并带 VAT 备注),`build_ukcost.py` 按 `<!--EB_UKCOST:variant-->` 注入表格,
`check_ukcost.py` 断言页面费率=JSON、周期名出现在页上、**每行金额重算对得上**、
**且 JSON 里的周期没过期**(过期 = 三个月没人跑 fetcher)。三种红法逐一验过。
**部署后自检的期望值也从 JSON 读,不写字面量** —— 写字面量就是把同一个过期 bug 搬进 workflow。
*抓取踩到的坑*:Ofgem 用 `\xa0`/` ` 分隔数字与单位,且不一致(`26.11 pence` 是普通空格、
`26.32\xa0pence` 不是),第一版只匹配到一列 —— **正是那条「至少两个」断言把它抓出来的**。

**② 三页一律零商店链接,这是编辑决定不是遗漏。** 三个理由,缺一不可:
(a) `rising-damp…` 首次构建时 `device_of()` 把它归成 **"ac"**(slug 不含任何已知词),
于是一张讲维多利亚墙体地下水的页上挂了**便携空调货架** —— 与 09-09 `schimmel-` 那次同款误判,
换了个语言。已在 `device_of()` 加 `damp` / `condensation`;
(b) desiccant 页的结论是「冷房买 desiccant」,而站内货架 100% 是 compressor ——
**货架会和文章吵架**;
(c) `getecoback-21` 在 **.co.uk 不计佣**,而 amazon.de 的家电是 **Schuko 插头**,
寄到英国对读者本身就是错的。
→ 三页进 `SKIP_MODELS` + `POPUP_SKIP`,**只内链到已有尺寸页**(那些页照常带 .de 货架,漏斗没断)。
部署后自检**剥掉 `<script>` 后**断言三页零 `href="…amazon…"`(不剥会被存房间条的字符串拼接误报 5 条,
与 `check_dataset.py` 同一个坑;负向测试第一次是**空跑**——`build_onpage` 给 h2 加了 id,
我的锚点没匹配上,第二次换 `</article>` 才真的红)。

### 判定线与 owner 的一个决定

- **`eco-uk-winter-pages-1112`(11-12,覆盖 11 月峰值)**:三页合计 GB 真人 pv ≥25/28d
  或全站 GB ≥40/28d → 赢则继续扩 `electric blanket`(19,1,本轮没建)与 `oil filled radiator`;
  输则**英国面只维护不扩建**,并且以后不许再用「换个品类」解释英国零流量。
- **`eco-uk-associates-decision-1112`**:**现在不建议开 Amazon UK Associates。**
  开户后 180 天内没有 3 笔合格销售会被关户,今天 GB 是 90 天 15 pv,开了大概率烧掉。
  **正确时点是内容拿到读数之后**;若 11-12 达线再开,180 天窗口正好覆盖整个英国潮湿季。
- **没做的**:`electric blanket` / `oil filled radiator` 两个品类本轮有数据但没建页 ——
  先看三页读数再决定,避免一次铺开四个品类然后全是 0。

## 储能:类目确实大,但峰值在 4 月不是现在(2026-09-17,owner:「近期储能火爆,加大储能品类」+「不能包含ecoflow」+「阳台储能赛道法规立案支持,租户可以在阳台装光伏板,即插即用更符合德语区需求」)

### 第一次把储能放到本站自己的标尺上量

站内有 **12 张** balkonkraftwerk/balkonspeicher 页,而 `seasonality-de.json` 的 30 个词里
**一个 balkon/speicher/solar 都没有** —— 类目从来没被量过。本轮新增
`--market DE-STORAGE`(**anchor 仍是 heizlüfter**,所以与站内既有 30 词同标尺可比),
写 `data/seasonality-de-storage.json`,13 词 0 失败:

| 词 | peak | 峰值月 | 冬/九月 |
|---|---|---|---|
| **balkonkraftwerk** | **62,6** | **4** | 0,82 |
| heizlüfter(锚) | 30,6 | 11 | 0,89 |
| **anker solix** | 29,9 | 8 | 0,70 |
| **balkonkraftwerk speicher** | **23,0** | **3** | 0,83 |
| zendure | 12,3 | 3 | 0,93 |
| marstek | 10,8 | 8 | 0,71 |
| balkonkraftwerk anmelden | 7,8 | 4 | 0,75 |
| stromspeicher | 5,7 | 3 | 0,91 |
| **balkonkraftwerk mieter** | **0,3** | 4 | 0,51 |
| **steckersolar** | **0,1** | 4 | — |
| **balkonspeicher** | **0,0** | 3 | — |
| **balkonkraftwerk erlaubnis** | **0,0** | 1 | — |

**四条必须记死的读法**:
1. **owner 的判断被数据支持**:`balkonkraftwerk` **62,6 = 站内锚点的 2 倍**、≈`luftentfeuchter`(32,0)的 2 倍、
   逼近站内最大词 `schimmel`(68,5)。**这是本站能服务的最大类目之一**,08-26 的「能源板块降级」在
   类目规模这一点上是判错了。
2. **但「近期火爆」在季节上不成立**:峰值月是 **4 月**,`win_over_sep` = 0,82,即**冬季低于九月**。
   所以这轮的正确定位是「**现在建、春天收**」——和英国那轮盯 11 月是同一种打法,方向相反。
   **报告里不要说「现在是旺季」。**
3. **`balkonspeicher` = 0,0,而站内有三张页用这个词**(rechner / foerderung / winter-frost)。
   活的词是 **`balkonkraftwerk speicher`(23,0,3 月峰)**。**下一轮的优化动作已经确定:
   保持 URL 不变,把这三页的 title/H1/描述改用活词**(改 URL 要做重定向,不值得)。
4. **租户/法规的词本身几乎没有搜索量**(mieter 0,3、erlaubnis 0,0、steckersolar 0,1)。
   这**不代表角度错**,代表**需求表达在头部词上**。所以法规内容做成一页是**引用赌注不是搜索赌注**,
   判定线里已写死这一点,别在结算时改口径。

### 已建:`/guide/balkonkraftwerk-mieter-recht.html`(一手法条,全部实抓)

**零编造在法律题上尤其不能松。三条法条全部当日从 gesetze-im-internet.de 抓原文**(2026-09-17):
- **§ 554 BGB** 标题现为「Barrierereduzierung, E-Mobilität, Einbruchsschutz und **Steckersolargeräte**」;
  Abs.1 = 「Der Mieter **kann verlangen**, dass ihm der Vermieter … erlaubt」+ 不可期待时不成立;
  **Abs.2「Eine zum Nachteil des Mieters abweichende Vereinbarung ist unwirksam」**。
- **§ 20 Abs. 2 Nr. 5 WEG** 把 Steckersolargeräte 列为特权改造,且「**Über die Durchführung** ist …
  zu beschließen」→ 共同体决定**怎么装,不再决定能不能装**。
- **EEG § 8 Abs. 5a**:**2 kW 组件 / 800 VA 逆变器**,「Registrierungspflichten nach der
  Marktstammdatenregisterverordnung **bleiben unberührt**; zusätzliche gegenüber dem **Netzbetreiber**
  abzugebende Meldungen … **können nicht verlangt werden**」——**这一句才是「即插即用」的法律含义**。
**页面的核心区分(市面上大多数文章写错的那一点)**:§554 给的是**请求许可的权利,不是免许可**。
「还用不用问房东?」答案是**要问**;变的是「不想」不再是理由。不可期待性那条限制与页面同段写明,
并明说本站不是律师、不做法律咨询。页面带 storage 货架(Zendure / Anker ×2,**无 EcoFlow**),
这与英国三页不同——德国读者、amazon.de、Schuko 插头、getecoback-21 计佣,货架在这里是对的。

### `不能包含 ecoflow`:veto 此前只挡住了人工货架,没挡住自动面

owner 2026-08-28 已下过这条指令,当时**只在 `build_structure.py` 的人工货架里删了卡片**。
本轮发现**首页 rising rail 会把任何 Google Trends 查询直接变成带 tag 的 amazon.de 搜索 chip,
中间没有人**,而 `data/trends-rising.json` 自 09-12 起就存着 `"ecoflow stream 5000" v=8800`
(balkonkraftwerk 种子下)。它没上线**是运气不是设计**,而「加大储能品类」正好会让这个种子更常浮出。
- **`tools/brand_veto.txt` 是唯一名单**(加牌子只改这一个文件);rail 过滤它;
  **`check_brand_veto.py` 扫的是构建产物 `site/`**,不是源码 —— 在一个注入点上执行的禁令,
  只在没人加第二个注入点之前有效;**断言在输出上,就与它怎么进来的无关**。
  (`tools/` 里的说明性注释与名单本身不扫,否则 gate 会变成噪音。)
- **A/B 实测(避免空跑)**:同一份数据、把 veto 清空 → 首页出现 **1 个 ecoflow chip**;
  veto 装回 → **0**。**是 veto 拦下的,不是 NICHE 正则** —— 注意原始那条 `ecoflow stream 5000`
  很可能本来就过不了 NICHE,所以我换成 `ecoflow balkonkraftwerk speicher`(储能扩类后完全可能出现的词)
  才拿到有效证据。**这类测试永远要先证明「不改就会发生」。**

### 判定线

- **`eco-balkon-mieter-recht-1115`**:≥1 次 AI 引荐或 ≥25 真人 pv/28d。**明写是引用赌注不是搜索赌注**
  (搜索量 0,3),输了则「法规内容以后只作为已有页里的一节,不再单独出页」。
- **`eco-storage-spring-0415`**:3–4 月峰值窗 storage 簇真人 pv ≥300 且 storage 货架 affiliate_click ≥15。
  输了就承认 08-26 的降级是对的,储能簇冻结为维护态。
- **本轮没做**:三张 `balkonspeicher` 页的活词改写(见上第 3 条,下一轮第一件事);
  Nulleinspeisung / WEG 选型页(等 4 月线的读数再决定,不一次铺开)。

## 乌克兰:三门全不过,把同一份产品知识转到能计佣的市场(2026-09-17,owner:「继续扩张页面,针对乌克兰进行产品的深度调研推荐」)

### 先量,再决定。三个读数,一致地指向不做

1. **UA 流量 = 0**。D1 90 天窗:UA **0 pv**、PL 0、MD 0(对照 DE 467、AT 49、CZ 4)。不是少,是零。
2. **本站唯一一次加第三语言已经失败过,而且是彻底失败**。`/it/` 90 天:**9 pv,9 条全是 bot,
   `ua_class='human'` 与 JS 信标 双双为 0** —— 8 个页面,**从上线到今天没有一个真人**。
   (对照同窗:DE 根目录 1 149 pv / 357 严格真人;/en/ 199 / 80。)
3. **连「能触达且能计佣」的那一版也没有需求**。新增 `--market DE-UA`(geo=DE,anchor=heizlüfter=30,6):
   乌克兰语 **обігрівач 0,0 · цвіль 0,0 · осушувач повітря 0,0**;俄语 плесень 1,2 · обогреватель 0,9 ·
   осушитель воздуха 0,7。**德国境内的乌克兰语需求是字面意义上的 0**,俄语约为德语锚点的 1/30。
   —— 我本来最看好的角度是「在德乌克兰人:住德国房子、有德国霉菌问题、能在 amazon.de 下单」,
   **这个角度被自己的数据杀掉了**,记下来免得下次再想一遍。

**再加一条结构性事实**:**Amazon 没有服务乌克兰的商城**,本站唯一的德国 tag 是 amazon.de。
所以即便有读者也收不到钱 —— 与英国那条(.co.uk 不计佣)同类但更彻底。

**还有一条我要说出来而不是藏着的判断**:给正在经历停电的战区居民写联盟带货推荐,
即使链路能通,也是一件需要想清楚的事。**但本轮的裁定不建立在这一点上** —— 它建立在
上面三个读数上:**触达 0、计佣 0、同类先例 0 真人**。三门(数据/需求/变现)一门都不过。

**什么情况下我会改口(写死,免得每轮重问)**:①UA 或 PL 的 90 天真人 pv 到 **50+**;
②`--market DE-UA` 里任一乌克兰语词升到锚点的 **1/5 以上**(即 ≥6,0);③owner 拿到能覆盖该市场的
联盟账号。**在此之前不建 `/uk/` 语言版、不建乌克兰产品页。**

### 改为做的:把同一份产品知识指向能计佣的德国停电需求

新增 `--market DE-BLACKOUT`(同锚点):**stromausfall 10,0(1 月峰)**、notvorrat 3,0、
notstromaggregat 2,4、**powerstation 1,5**、heizen ohne strom 1,0、blackout vorsorge 0,5。
**诚实定位:真实但小**,约为 `balkonkraftwerk`(62,6)的六分之一,而且 `stromausfall` 主要是
**信息型查询(我家停电了)而不是购买型**。所以只建一页,不铺簇。

**已建 `/guide/stromausfall-heizen.html`**,它的结论就是「深度产品调研」应有的样子:**大多数人想买的东西做不到他们想要的事。**
- **决定性算术**:2000 W 暖风机在 1 kWh 上 **30 分钟**;**5,12 kWh(比本站最大的 Balkonspeicher 还大)也只有 154 分钟**;
  而同一块 1 kWh 带路由器 **4,2 天**、LED **8,3 天**、手机 **67 次**。**倍数 200。**
  → 电池是买给**信息、照明、冰箱**的,**保暖靠纺织品**。带计算器(浏览器实测与 Python 逐位一致)。
- **和储能簇扣上的一条硬事实**:**并网逆变器在停电时必须断开**(否则会向有人作业的线路送电),
  所以**没有明确 Notstrom/Inselbetrieb 功能的阳台储能,在停电时一度电都不给你**。这是买前的选型条件,
  不是事后能在 App 里找到的开关。
- **官方来源实抓**(BBK「Vorsorge für den Stromausfall」,2026-09-17):保暖衣物与毯子、集中在一个房间、
  关门保温、**「Achten Sie jedoch trotzdem darauf, regelmäßig zu lüften!」**;燃气热源须有
  Sauerstoffmangel- und Zündsicherung,并**推荐 CO 报警器**。
- **本站能力接上去的地方**:停电时一屋子人 + 关门 + 蜡烛/燃气 + 墙体降温 = 湿度上升撞冷表面 →
  这正是 BBK 那句「仍要定期通风」的物理原因,链到既有的冬季通风页。
- **唯一的带货块是 CO 报警器**(BBK 明确推荐、几欧元、是这页上唯一救命的东西),
  按 EN 50291 描述形态、**不点名型号**(本站不自测)。

### 顺手抓到一个 gate 的真缺陷:「Anzeige」被当成广告标识,但它也是「读数显示」

写 CO 报警器那段时用了「mit Anzeige der ppm-Werte」(带 ppm **显示**)。做负向测试时
**把真正的广告标识删掉,`check_adlabel` 仍然通过** —— 因为它只是在整块里 substring 找 "Anzeige",
而这块里恰好有另一个意义完全不同的 "Anzeige"。**在一个满是带显示屏的测量设备的站上,这个洞可以
在任何一页上静默放过一个没有广告标识的联盟块。**
**改法**:标识必须出现在**标识位置**(后面跟分隔符 `·` 或直接闭合元素),`LABEL_RE` 取代 substring。
**先验证再收紧:线上 785 个块在新正则下全部照样通过,零误报**;收紧后负向测试正确变红。
**通用教训:substring 断言在自然语言里迟早会被同形异义词满足 —— 断言要带位置,不只带词。**

### 判定线

**`eco-stromausfall-0116`**(读数窗覆盖 1 月峰值):真人 pv ≥80/28d 或 CO-Melder 块点击 ≥5。
赢 → 同形态再做一页;输 → 承认德国停电面需求太薄,此页留作储能簇的安全锚,不再扩。

## 流量翻倍第一轮:先量瓶颈,并更正我自己造出来的一个假发现(2026-09-17,owner /goal:「eco站点优化流量 seo geo，实现流量翻倍」)

### t0 基线(全部 D1 现查,2026-09-17)

**真人 pv 513/28d**,来源拆分:直接/无来源 193 · **DDG 112** · 站内 78 · **Bing 67** ·
Ecosia 20 · Yahoo 17 · ChatGPT 14 · Perplexity 7 · Qwant 3 · Startpage 2 · **Google 0**。
触达页数 **110**;**214 张可索引页里只有 18 张拿到过搜索或 AI 流量**。

**一条口径事实要记死**:DDG / Ecosia / Yahoo / Qwant / Startpage **全部跑在 Bing 索引上**,
所以**本站 100% 的搜索流量来自同一个索引**。任何「优化 SEO」的动作,先问它对 Bing 有没有用。

### 关于 Google 的结论要改写(推翻手册 09-15 那条)

手册此前写「googlebot 5 天只抓 19 次 / 15 页」。**28 天窗现查:googlebot 抓了 265 次、
覆盖 207 个不同页面 —— 几乎整站**,而 bingbot 只覆盖 **134** 页。
同时实测 Googlebot 拿到的字节与真人**完全一致**(逐页 md5 相同)、无 X-Robots-Tag、
robots.txt 明确 Allow、Sitemap 行在位。

**所以 Google = 0 不是抓不到,是排不上。** 71 天域龄 + 零外链的新站,这是预期行为,
**不是本周能修的东西**。以后不要再把「让 Google 来抓」当成待办 —— 它每天都在抓。

### ⚠️ 我在本轮造了一个假发现,更正记录在此(比结论本身更重要)

我先用一个临时脚本量内链,得出两个「重大发现」:**12 个孤儿页**、以及
**四个分类页对 142 篇指南零真实链接、只有 ItemList JSON-LD**。我差点把后者当成
「本轮最大发现」写进报告。

**两条都是假的。** 原因是同一个 bug:我的正则只匹配 `href="/guide/..."` 相对路径,
而**分类页用的是绝对 URL** `href="https://getecoback.com/guide/..."`。
按两种形式重量:**真实孤儿数 = 0**,四个分类页把 142 篇全部真实链接了。

**教训(与 09-17 早些时候那条「Anzeige」同源)**:
**先怀疑测量,再怀疑网站。** 一个「太大以至于不可能一直没人发现」的发现,
通常是测量错了。判定的写法:任何内链/链接审计,**必须同时匹配相对与绝对形式**。

### 真实存在的形状问题,以及本轮做的事

更正后仍然成立的两点:①**链接拓扑是星形** —— 指南几乎只从 4 个分类页被链到,
彼此之间很少互链,最薄的页只有 1–3 个入链页(tineco 1、luftbefeuchter-ratgeber 2);
②**70% 的内链指向夏季页**,而站内五年需求文件里冬季词大得多
(schimmel 68,5、luftentfeuchter 32,0 vs mobile klimaanlage 12,3)。

**已建 `tools/build_related.py`**:按 slug 词汇重叠选 ≤4 篇同语种相关指南,
用 `seasonality-de.json` 的峰值月做**平局打破**(不是加权压倒:重叠是整数,季节加成上限 ~0.5),
`HARD_MAX=6` 封顶,永不自链、永不重复页面已有的链接(**两种 URL 形式都查**)。
效果实测:196 张指南新增 **617 条横向内链**;schimmel-am-fenster 入链页 **2→10**、
luftentfeuchter-ratgeber **2→21**、全站搜索第一页 mobile-klimaanlage-ueberwintern **4→8**。
**但聚合比例几乎没动(69/30 → 68/31)** —— 617 条新链在 4 294 条既有链接面前太小。**如实记录,不吹。**

`tools/check_related.py` 挂 gate:封顶 6 条、不自链、不与页面已有链接重复(两种形式)。
**自己踩的两个坑都写进注释了**:第一版 top-up 无上限把某块撑到 **16 条链接**
(正是工具自己文档里禁止的「链接墙」);第一版 existing 正则漏绝对 URL。

### 判定线

- **`eco-traffic-double-1112`**:真人 pv ≥**1026**/28d(t0=513)。**输的写法很重要**:
  若增幅几乎全部来自 Bing 家族的季节性上升,则判定内链层无独立贡献。
- **`eco-lateral-links-1112`**:有流量的页面数从 **18** 升到 ≥30,或三张被加厚的冬季页合计 pv 翻倍。

### 下一轮的候选(按证据强度排序,不是按好听程度)

①**季节仍是最大的单一变量**:站内前几名全是制冷页,而冬季词是它们的 2–5 倍;
②`growatt-noah-2000-probleme` 单页贡献 26 次搜索 —— **「具体型号 + Probleme」是本站已验证的低竞争查询形状**,可复制;
③ChatGPT 的 190 次抓取里 **157 次落在首页**(83%),首页是本站最大的 AI 面而它**没有表格**
(house skill:表格是引用磁石)。

### 同日续:把表格给最大的 AI 面(2026-09-17,goal 第二件)

**读数**:28 天 chatgpt-user 抓取 **190 次,其中 157 次(83%)落在首页**,单篇指南只有 1–5 次。
**首页是本站最大的 AI 面,差了 30 倍**,而它此前**一个 `<table>` 都没有** ——
house skill(citation-growth)明确把表格列为引用磁石(结构化行能被整段抬进答案,散文不能)。

**已建 `tools/build_home_table.py`**:`/` 上渲染「Richtwerte nach Raumgröße」表,7 个房型 ×
冷(BTU)/湿(l/Tag)/热(W)三列,**全部从 `site/sizing-data.json` 生成** ——
与 `/daten.html` 同一份 CC BY 数据,所以首页不可能与数据集漂移,也没有一个手写数字。
**副作用是正的**:表格顺带给首页加了 **19 条指向冬季梯页的内链**,而首页正是全站入链最多的页之一。
浏览器实测:1 张表 7 行、390px 视口零横向溢出、零页面错误。

**判定线 `eco-home-table-geo-1112`**:AI 引荐 ≥42/28d(t0=21),或 chatgpt-user 抓取中
非首页占比从 **17%** 升到 ≥35%。输了就承认版面不是 GEO 杠杆,回到只维护 llms.txt/MCP。

**另一条本轮量到但没做的**(留给下一轮,证据已在):**故障排查型页面是本站已验证的最强页型** ——
28 天窗:troubleshooting 形(`-probleme` / `nicht-mehr` / `stinkt` / `ausverkauft`)**4 张页 = 32 次搜索访问**,
评测形(`-test` / `-erfahrungen`)**16 张页 = 1 次**。**每页相差约 128 倍。**
合理解释:评测页要和 Stiftung Warentest/CHIP/Idealo 抢,故障页只和论坛帖抢。
**下一轮第一件事就是按这个形状建冬季品类的故障页**(luftentfeuchter 32,0 是冬季第二大词)。
注意:`related_queries` 配额今天已打爆,库提示「换 referer」——**属绕过,不做**;
而且这类查询太长尾,Trends 本来就测不到(实测 anker solarbank / comfee klimaanlage /
meaco dehumidifier 三个种子的 top+rising 里**零条**故障意图)。**这里第一方数据比 Trends 可信。**

### 同日第三件:按已验证的最强页型建了第一张(2026-09-17)

**页型证据(第一方,28 天真人)**:troubleshooting 形 **4 张页 = 32 次搜索访问**,
评测形(`-test`/`-erfahrungen`)**16 张页 = 1 次** —— **每页约 128 倍**。
解释:评测页要和 Stiftung Warentest / CHIP / Idealo 抢,故障页只和论坛帖抢。

**已建 `/guide/luftentfeuchter-zieht-kein-wasser.html`** —— 冬季第二大词(luftentfeuchter 32,0)的故障页。
**它不点名任何型号为「故障」**(本站不自测),全部结论是可复算的算术:
- **40 m³ 房间、18 °C,从 60% 降到 50%,整个房间只含 61 g 水(0,06 升)** —— 一个小酒杯。
  所以「20 升/天」的机器一夜之后水箱几乎是空的,**不是坏了,是空气里没有那么多水**。
- 额定值的测试条件 **30 °C/80% = 24,2 g/m³**;而 **18 °C/60% 只有 9,2(38%)**、
  **10 °C 地下室 5,6(23%)** —— 额定值对应的空气在德国冬天根本不存在。
- 六个成因按概率排序,第一条是「房间对压缩机式来说太冷」(10 °C/60% 露点 2,6 °C → 结霜除霜),
  链到 EN 的 desiccant 页。
浏览器实测:计算器与 Python 逐位一致(61 g / 38 g),≤50% 有专门话术,德式小数逗号,零错误。

**判定线 `eco-troubleshoot-shape-1112`**:该页 ≥15 次搜索引荐/28d(既有故障页每页均值 8 的两倍)。
**输的写法**:<15 则说明 growatt 那 26 次是**单页特例不是页型规律**,停止按此形状铺页。

**记一条方法论**:`related_queries` 配额今天打爆,库提示「换 referer」——**绕过,不做**;
而且三个品牌种子的 top+rising 里**零条**故障意图,说明**这类查询太长尾,Trends 结构上测不到**。
**当第一方数据与「Trends 没有读数」冲突时,信第一方** —— Trends 的零可能是测不到而不是没有。

### 目标读数的仪器统一(2026-09-17,同日最后一件)

`tools/traffic_check.py` + `data/traffic-baseline.json`:**一条命令给出翻倍目标的当前进度**,
读数一律来自站点自己的公开端点 `/api/pulse`(免 token,已经现成计算 `human_pv` 与 `ai_ref`)。

**为什么必须做这件事**:基线是我在 D1 控制台手敲查询量出来的(513),而 `/api/pulse` 同日同窗读到 **516**。
定义相同(`ua_class IS NULL OR 'human'`),差 3 只是取数时刻不同 —— **但如果 11 月用另一个仪器settle,
我就是在自己的判定线里制造尺子漂移**,而这正是「输了也要输得诚实」的反面。
判定线已统一改为 **`/api/pulse` 的 human_pv ≥1032(t0=516)**、`ai_ref ≥42(t0=21)`。
**纪律:t0 与结算读数必须来自同一个仪器,否则两个数都不算。**

工具里也记了那个易错点:`/api/pulse` 的 `human_pv` 是**宽口径**(含 ua_class 为 NULL 的 JS 信标行),
严格 human 更低 —— 自己比自己没问题,**一旦和别处产出的数字比就是错的**。

### 判定线结算:`eco-googlebot-0918` = **won**(2026-09-17 提前一天结算)

阈值「7 天内 googlebot 命中 ≥1」。**实际:265 次命中、207 个不同页面,全部落在 09-11→09-17 这 7 天内**
(站内可索引页 215)——**整站每周被抓一遍**,不是「≥1」那种勉强达标。

**这条线真正的价值是它推翻了自己的前提。** 它当初是按「收录有问题」的怀疑立的
(lose 分支写着「=0 → 收录问题,带证据升级 owner」)。现在证据是反的:
Googlebot 拿到的字节与真人**逐页 md5 相同**、无 `X-Robots-Tag`、robots.txt 明确 Allow 且带 Sitemap 行。
**Google 引荐 = 0 的原因是排不上,不是抓不到。** 71 天域龄 + 零外链,这是预期行为。

**对全舰队的推论**:以后任何站出现「某搜索引擎零引荐」,**先查爬虫日志再谈收录**——
「没流量」与「没被抓」是两件事,而修法完全不同(前者等权威,后者是技术故障)。
**对照组就在同一张表里**:bingbot 28 天只覆盖 **134** 页,却贡献本站 **100%** 的搜索流量。
**抓取量和流量不相关到这个程度,本身就是本轮最反直觉的一条读数。**

### 查过但没有缺陷的地方(2026-09-17,记下来免得下一轮重做一遍)

为「翻倍」找杠杆时,除了已经做的三件,还系统查了四处,其中**两处确认无缺陷**。
**负面发现也是发现**,写下来的价值在于下一轮不必重新审一遍:

1. **页面重量:不是杠杆。** 线上实测 gzip **首页 33 KB / 指南页 21 KB**(原始中位数 68 KB)。
   内联 JS 占 35% 字节听起来高,但全是第一方内联、压缩后很小,除 GA 外无阻塞渲染的第三方。
   **没有肥可减,不要为了「优化速度」去拆内联。**
2. **标题重复:不存在。** 215 张可索引页,**精确重复标题 0、重复描述 0**。
   相似度 ≥0.90 的 98 对**全部是尺寸梯页**(`electric heater for 20/25/30/40/50 m²`)——
   **这是正确的程序化结构,数字本身就是查询变量**。把它们改得「各不相同」只会让匹配变差。
   **这不是蚕食,别去修。**
3. **判定页六件套:指南页已经合格**(单 h1 100%、Article JSON-LD 93%、FAQ 88%、可见更新日 89%)。
   得分最低的那些是 hitze-radar / ueber-uns / kontakt / for-agents / 分类页 —— **它们不是判定型页面**,
   按 house skill 本来就不该按引用标准考核。
4. **Googlebot 抓取:见上一条结算,整站每周一遍。**

**合起来的结论,也是本轮最该记住的一句**:
**eco 的技术 SEO 与页面结构没有值得修的缺陷。约束是域权威(71 天、零外链)与季节,不是页面本身。**
所以下一轮如果有人提议「做一次 SEO 体检」,先看这一节——四处已经查过,别再花一轮重查。

### 全站搜索第一的页面，23 条出站链接里冬季页 = 0（2026-09-17，本轮最后一件）

`/guide/mobile-klimaanlage-ueberwintern.html` 是**全站搜索流量第一**（24 次/28d），
主题是「把空调收起来过冬」——**读者刚刚明确告诉我们夏天结束了**。这是全站意图最强的季节转场时刻。
而它的 **23 条出站内链里，指向冬季内容的有 0 条**，全部是空调尺寸梯页。
连它自己那节「frostfrei, **trocken** lagern」讲的就是除湿主题。

已加 `EB_SEASONBRIDGE`：一段承接（同一间屋子，四周后问题反过来——空气不是太热而是太湿、外墙太冷，
**同样的物理，相反的符号**），链到 richtig-lueften-im-winter / schimmel-am-fenster /
luftentfeuchter-zieht-kein-wasser / heizkosten-senken-als-mieter。浏览器实测：单 h1、桥在 FAQ 之前、
390px 零溢出、零错误。

**这同时暴露了我今天建的 `build_related.py` 的一个真实局限，要记下来**：
按 slug 词汇重叠选链接会**强化既有簇**（klimaanlage → klimaanlage），
而**转场页恰恰需要跨簇**。算法在这里是反的，需要人工编辑判断。
**推论：任何「相似度选链接」的机制，在季节/生命周期转场页上都会选错方向。**

判定线 `eco-season-bridge-1112`：四个冬季目标页合计真人 pv 翻倍，或出现 ≥10 次来自该页的站内跳转。
输了就说明读者在转场页读完即走，不再手工加桥。

### 补做会话仪式第②步，立刻换来一张页（2026-09-17）

**我今天一整轮都跳过了舰队会话仪式的第②步**(读 `data/autopilot/demand-digest.md`)。补上之后,
第一屏就有本轮最强的选题信号,而我此前三轮都在用 Trends 和 D1 自己摸:

- eco 的 **autopilot 需求队列 gaps 31**(covered 31)——31 个查询,站内最佳匹配页匹配度都很差;
- Trends rising 里 **`infrarotheizung gegen schimmel` = 59 250,是 eco 全部 rising 行中最高的一条**。

**站内实测:标题同时含这两个词的页 = 0。** 11 页在正文提到两者,但没有一页讲这个交集。
而这两个词恰是站内最强的两个:**schimmel 68,5(全站最大)+ infrarotheizung 29,2**,且后者 11 月见顶。

**已建 `/guide/infrarotheizung-gegen-schimmel.html`**,写法与该题的营销说法相反:
- **机制是真的**:霉长在表面,表面湿度由表面温度决定。20 °C/55% 时墙 14 °C → 表面 **80%**,
  墙 17 °C → **66%**。**三度墙温 = 14 个百分点。**
- **但有一条硬天花板,产品页不会说**:表面温度不可能高于室温 → 表面湿度**永远不低于室内湿度**。
  所以 **室内湿度 ≥62% 时,60% 阈值在数学上就到不了**,再强的红外板也没用 ——
  「买了一张电费单,霉还在」。这时只能靠通风或除湿。
- 判断浓缩成一句:**低于 60% 是墙太冷的问题(加热有效),高于 60% 是空气太湿的问题(加热无效)。先测湿度再买东西。**
- 明说本站不测设备,**无法给出「哪块板能把哪面墙加热多少度」** —— 那取决于功率/距离/朝向/墙体,不猜。

判定线 `eco-infrarot-schimmel-1112`:≥20 次搜索引荐/28d。赢 → 按「交集选题」再找下一个
(luftentfeuchter × keller、heizlüfter × stromkosten);输 → 交集不比单词好做,回到按 seasonality 单词选题。

**方法论教训(比这一页更值钱)**:**会话仪式的第②步不是形式**。我用 Trends + D1 摸了三轮,
而这条信号一直躺在每天自动生成的摘要第一屏里。**下一轮开场先打开 demand-digest,再动手。**

### 但「gaps 31」不是 31 个机会——逐条查完是 0 个(2026-09-17,紧接上一节)

上一节让我打开了需求队列,于是顺手把 31 条 gap 逐条查了一遍。**结论比那一页更该记住:
今天这 31 条里,没有一条是「站内没有、该建、能建」的页。** 下一轮不要照着数字去建 31 页。

**分层(全部机检,`v` 是 Google 增长值不是搜索量)**:

| 层 | 条数 | 内容 |
|---|---|---|
| 站外品类 | **20** | kaffeevollautomat ×7 · matratze/bett/boxspring ×8 · staubsauger/saugwischer/saugroboter ×4 · pool matratze |
| 品牌/零售商词 | **7** | knebel infrarotheizung 36 000 · dreo solaris slim h3 29 250 · bonaura luftentfeuchter 19 850 · anker solix ×2 · obi klimaanlage mobil · solarkon |
| 其余 | **4** | infrarotheizung werkstatt 30 750 · stromsparender heizlüfter 15 000 · balkonkraftwerk nicht angemeldet strafe 100 · balkonkraftwerk registrieren 60 |

- **20 条站外**:与 09-07 / 09-15 两次的判定一致(零权重孤儿页、niche 外),不再重议。
- **7 条品牌词**:`bonaura` 09-11 已按「我一无所知的牌子不推荐 = 编造」挡下,`knebel` / `dreo` /
  `solarkon` 同类;`obi` 是零售商,本站没有它的联盟关系。**这一整层受本站既有规则约束,不是选题池。**
- **剩下 4 条里,最大的两条是测量假象,不是缺口**(下面是本节真正的产出)。

**① `infrarotheizung werkstatt`(v=30 750)——页面存在,匹配器看不见它。**
`infrarotheizung-garage.html` 正文出现 **Werkstatt 8 次**,但**在匹配器读的那个窗口里出现 0 次**。
`tools/autopilot/pagemap.py` 的 `page_index()` 只取 title+h1+desc(权重 ×3)**加正文前 4 000 字符**;
eco 的可见正文以导航 + 面包屑开头,4 000 字符基本只够覆盖开篇,那 8 个 Werkstatt 全在窗口下面。

**② `stromsparender heizlüfter`(v=15 000)——德语词形变化直接打穿匹配。**
`heizluefter-stromsparend.html` 在窗口内有 **`stromsparend` 5 次**,而查询词元是 **`stromsparender`**;
`demand.py` 的打分是 `w in tok` 的**逐字串命中**,两者不相等 → hit 1/2 → 0.5 < 0.60 → 记成 gap。
**这个站的标题用的是原形,而德国人搜的是变格形——这类假 gap 会一直复现。**

**③ 两条注册词(v=100 / 60)**:今天上线的 `balkonkraftwerk-mieter-recht.html` 已写明
Marktstammdatenregister 注册义务保留、并有对应 FAQ(但没写「怎么注册」的步骤,也没写未注册的罚则);
**v=100/60 与上面两条的 30 750 / 15 000 不在一个量级,不值得为它单独出页。**

**不要顺手去「修」这个匹配器。** `page_index()` 的 docstring 写着:整页 tokenise **试过了**,
结果是「页脚链接里出现一次那个词」就算命中。窗口是**已知取舍**,不是疏忽;词形归并(stemming)
对德语复合词同样有把 `luftentfeuchter` 和 `luftbefeuchter` 归到一起的风险——那会比现在糟得多。
**纪律改为读法**:`match < 0.60` 只说明「**标题与开篇**没有接住这个词」,不说明站内没有这一页。
**把一条 gap 当成新页选题之前,先 grep 全站正文**;若正文已经答了,真正的动作是
**把那个词形写进标题/首屏**(这属于「优化」槽,不是「探索」槽),而不是再建一页。

**这三条合起来解释了 `gaps 31 / covered 31` 这个看起来很大的数字**:它量的是标题面的覆盖,
不是内容面的覆盖。**下一轮开场仍然先读 demand-digest(上一节的教训不变),但读到 gaps 时按上面这条读法走。**

### 储能三页改名到活词,以及顺手挖出的分类页缺陷(2026-09-17)

**这一节做的正是上一节推出来的那个动作**(正文已经答了 → 把活词写进标题,属优化槽),
也是储能那一轮明写「下一轮第一件事」的那件。

**① 三张页的标题从一个五年峰值 0,0 的词换成 23,0 的词,URL 一个字没改。**
`seasonality-de-storage.json`(5 年,anchor `heizlüfter`):`balkonspeicher` **峰值 0,0**,
`balkonkraftwerk speicher` **23,0(3 月峰)**。而 `balkonspeicher-rechner` / `-foerderung` /
`-winter-frost` 三张页的 title / h1 / description / og / JSON-LD headline **全部用的是那个 0,0 的词**。
已全部换成 `Balkonkraftwerk-Speicher …`;**URL 保持不变**(改 URL 要做重定向,不值得),
正文继续说 Balkonspeicher(是真实德语,也让页面同时带住第二个词形)。
面包屑与 BreadcrumbList 由 h1 生成,**重建后自动跟上**,不必手改。
**内链锚文本刻意没有统一**:现存 28 种锚里生成式的会跟着标题走,手写的保持多样——
把所有内链锚都改成同一个精确匹配词是 linkbuilding 技能明确点名的过度优化形态。

**② 改完重建,分类页的 diff 里露出两个存量缺陷 —— 这才是本节的主要产出。**
四张分类页是全站 142 篇指南的发现层(今天早些时候我自己纠正过「分类页没有真实链接」那个假发现),
而它们上面:

- **144 张卡片里 124 张的简介是一个断句**。生成器用 `first_sentence()` 在第一个 `.:!?` 处切,
  而本站每一条 description 都是「Keyword vorne**:** dann die Substanz」的写法——
  于是切掉了实质、留下了关键词前缀:`Luftentfeuchter:` · `Infrarotheizung:` · `Hitze-Check:` ·
  `Stromkosten-Rechner für Klimaanlage, Luftkühler, Ventilator und Heizung:`。
  更糟的两张切在缩写中间:**`Klimaanlage vs.`** 与 **`Midea PortaSplit vs.`**。
- **17 处双重转义**,页面上显示字面量 `&amp;`。`h1()` 返回的是带实体的内部 HTML,
  再 `escape()` 一次就成了 `&amp;amp;` —— **和 2026-09-04 给面包屑修过的是同一个 bug,
  这条路径当时没人查**。描述那一路同样中招(`Velux &amp; Co.` / `Comfee &amp; Toshiba`)。

**修法**:`first_sentence()` → `card_summary()`,**不再切**——description 本来就被 `check_meta`
限在 165 字符内、本来就是写成能独立成立的一句,没有什么可摘要的;真超长才按词边界截断。
标题与描述都先 `unescape` 再 escape。实测:卡片简介中位数 **31 → 151 字符**,以冒号结尾的 **124 → 0**。

**新闸门 `check_hubcards.py`(已进流水线,第 14 道)**,断言的是**事故的形状**不是生成器:
简介不得以冒号结尾、不得停在缩写上、页面 description 长而卡片简介 <40 字符即红、
卡片标题必须等于该页 h1、分类页不得出现任何双重转义实体。
**负向测试不是我planted的,是真实存量**:对改之前的线上产物跑,**212 处报红**;
修完 210 处,剩下 2 处把描述那一路也揪出来了,补完归零。
(**刻意没把生成器的函数搬进闸门里**——那种「自己验自己」的自检本仓已经栽过,写了等于没写。)
Chromium 实测(390px + 1280px):18 张卡、单 h1、**零横向溢出**、可见文本里**零字面量 `&amp;`**、零页面错误。

**诚实边界,别把这件事说成流量动作**:四张分类页 28 天真人 pv 合计 **10**
(klimaanlagen 7 · luftqualitaet 2 · heizen 1 · energie-sparen **0**)。这是**正确性修复**,
受益的主要是爬虫与 AI 读者(它们确实每周把分类页抓一遍),不是一条流量杠杆。
它的效果不单独立线,并进 `eco-traffic-double-1112` 一起读。

**判定线 `eco-storage-retitle-1112`(已进台账)**:三页合计真人 pv ≥15/28d 或 ≥2 次外部引荐;
**t0 = 3 pv / 0 外部引荐**(2026-09-17 D1 现查)。
**归因边界写死**:11-12 **早于**该词 3 月的峰值,所以它测的是**词形对不对**,
不是**这个类目行不行**——后者是 `eco-storage-spring-0415`。输了就不要再为改标题立项。



## 国家站扩展:三张页、三个市场,外加一个把最近两周所有新页的货架都吃掉的 bug(2026-09-18,owner:「增强eco站点的，扩展国家站，目标增加点击流量，geo，seo也要优化」)

**owner 第四次要国家扩展,这次照做,但形态由变现门决定,不由「开语言版」决定。**
先量(D1 28 天真人):DE 274 pv / 48 点击(17,5%)· US 122 / 4 · **AT 26 / 4(15,4%,0 落在 /en/)** ·
CH 13 / 1 · **ES 12 / 3** · **IT 4 / 3** · PT 2 / 2 · GB 6 / 1 · NL 6 / 0 · FR 3 / 1。
三个 EN 国家页在 9 月**仍有搜索流量**(56 天:europe-heatwave 29 pv/10 搜索、spain 18/6、italy 12/5、france 8/4)
—— 这是本站唯一有排名证据的「国家页型」,而它们全是制冷页。

### 选了哪三个国家,为什么不是别的

| 市场 | 变现今天能不能计佣 | 建了什么 | 为什么 |
|---|---|---|---|
| **AT** | ✅ amazon.de / getecoback-21,零改动 | `/guide/klimaanlage-mietwohnung-oesterreich.html`(德语) | 第三市场,**全部落在引用 § 554 BGB 的德语页上——那是另一个国家的法律**。MRG § 9 有 BGB 没有的规则:**两个月不答复视为同意** |
| **ES** | ✅ .de 发货 + Schuko = 西班牙 Type F | `/en/guide/electric-heater-spain-apartment.html` | `seasonality-by-country`:calefactor **34,7(11 月)** ≈ 制冷 39,6,站内只有制冷版 |
| **IT** | ✅ .de 发货;插座 Type L/F 如实写明 | `/en/guide/mould-italian-apartment-winter.html` | **muffa 31,0(1 月)是意大利第一词**,压过 condizionatore 30,6 |
| GB | ❌ .co.uk 不计佣 | 无(昨天已建 3 页,线 11-12) | — |
| NL / FR / UA | ❌ 需求或变现不成立(09-16/17 已判) | 无 | — |
| 新语言目录 | — | **无** | `/it/` 11 页 0 真人,线 10-27 未结 |

**AT 五年季节性首次量出**(`data/seasonality-at.json`,anchor heizlüfter,**只在 AT 内可比**):
schimmel **71,0(12 月)** · balkonkraftwerk 61,4(3 月)· infrarotheizung 33,2(11 月)· klimaanlage 22,6(6 月)·
**heizkostenzuschuss 19,3(10 月,零覆盖)** · strompreis 18,4 · heizlüfter 17,9 · luftentfeuchter 17,0 ·
klimagerät 7,5 · **klimaanlage mietwohnung 0,2**。
- **Heizkostenzuschuss 是本轮最想建、没建的一页**:需求正在 10 月峰上,但 `oesterreich.gv.at` 全站是维护页(三个 URL 全 404),
  九个 Bundesland 各自的官方页没有一个联邦入口可引;金额年年变、州州不同,没有一手源就是编造。**下轮先查联邦门户是否恢复。**
- AT 租客页因此是**正确性 + 引用赌注,不是搜索赌注**(0,2)——和昨天 DE 的 mieter-recht 一样。它存在的理由是:
  第三市场的读者此刻在读一部对他们不适用的法律。

### 三张页的事实纪律(全部一手源,零编造)

- **AT**:MRG 全文从 RIS 实抓(Fassung vom 18.09.2026):§ 9 Abs 1(Anzeige、两个月视为同意、七项条件逐字进表)、
  Abs 2(**Beheizungsanlagen** 与节能改造的 Z 2 特权——红外板是 Beheizungsanlage,空调**不在名单里**,页面说清是 Auslegungsfrage)、
  Abs 3(恢复原状条件)、**§ 1 适用范围**(≤2 套住宅的房子整体不适用;1953-06-30 后无公共资金新建的只适用少数条款,§ 9 不在其中)。
  E-Control「Was kostet eine kWh」(Newsletter 3/2026):25–35 ct 存量 / 22–28 ct 新客(3 500 kWh)—— **本站 0,30 €/kWh 假设正落在奥地利区间中间,
  德语计算器对 AT 不必换算**,页面据此给了三档表。
- **ES**:PVPC 2.0TD 三时段从 BOE(CNMC Circular 3/2020)实抓:工作日 punta 10–14/18–22、llano 8–10/14–18/22–24、valle 0–8,
  周六日/1 月 6 日/全国假日全天 valle,Ceuta/Melilla 移一小时。COP 2,5–4 沿用站内 heizfunktion 页;60–100 W/m² 沿用开放数据集;
  成本表按 0,15/0,20/0,25 €/kWh **三个标明的假设**做算术,不声称账单。**改掉了两句自己写的编造**:「our readers describe」(没有这种读者数据)
  与「15–17 °C in January are normal」(无源)。
- **IT**:全部湿度数字 Magnus 现算并经 Python 复核:20 °C/50 % → 墙 17/14/12/10 °C = 60/**73**/83/95 %;
  **14 °C 的墙只要室内 48 % 就到 70 %**;60 % 时 12 °C 墙已凝结。复用 `taupunkt_check` 计算器(浏览器实测 20/50/14 → 73 %,事件恰 1 条)。
  DPR 74/2013(意大利供暖季法规)normattiva 返回的是壳页,**没拿到原文,页面不写它**,供暖时段只写机制不写数字。

### 顺手抓到的真 bug:自 09-15 起每一张新页都没有货架

三张新页构建完只有 toppick 条、**没有 `EB_MODELS` 货架**。查 `inject_models()`:它用「页面里出现过 canonical 型号名」判断
「这页是人工策划页,别叠货架」——**但它检查的是已经注入过其他组件的 HTML**,而 EN 循环里排在它前面的 `EB_PROFILE`
(存房间条)自 08-31 起带着 term→ASIN 表,表里有 `Comfee`。于是**每一张在那之后创建的页都被当成策划页,货架被静默扣掉**;
老页靠 marker 分支继续重渲染,所以没人发现。实数:**9 张页**(09-15 richtig-lueften-im-winter / schimmel-am-fenster /
tilt-and-turn-winter-condensation,09-17 balkonkraftwerk-mieter-recht / infrarotheizung-gegen-schimmel / luftentfeuchter-zieht-kein-wasser,
+ 今天三张)—— **昨天手册里写的「货架自动是除湿机」指的都只是 toppick 条,货架本体从来没到过这些页。**
修法:guard 先剥掉 `<!--EB_*-->` 块再查名字(判断的是作者写了什么,不是注入器写了什么)。重建后 **117 → 126 张页有货架**,
九张各拿到正确的族(除湿 ×5、取暖 ×2、储能 ×1、空调 ×1),链接全带 tag、全带广告标识,流水线 byte-stable。
**教训(通用)**:任何「看页面里有没有 X 来决定要不要注入 Y」的 guard,都必须看**注入前**的页面——否则注入顺序一变,guard 就在测别的组件。

### 验证

18 道闸门全绿;Playwright 390px:三张新页 + 一张补回货架的页,单 h1、零横滚、零页面错误、amazon 链接 **17/17、10/10、14/14、14/14 全带 tag**、
货架在位、**零 EB_SIZER**、FAQ 5 条可见。内链:AT 页被 klimaanlage-mietwohnung / mobile-klimaanlage-vergleich / 分类页链到(related 自动),
ES 页被 spain 制冷页 + 七张 heater 梯页链到,IT 页手工加进 italy 制冷页的「季末」块(related 没有 token 重叠,自动链不上)。
部署自检新增:AT 页断言「zwei Monaten」+「Vollanwendungsbereich」、ES 页断言「2.5–4 kWh of heat」+「Circular 3/2020」、
IT 页断言「73 %」,以及 ES/IT 的**货架形态**(Schmidbauer / MeacoDry 在、EB_SIZER 不在)。

### 判定线(已进台账)

`eco-at-mrg-1116`(该页 ≥10 pv 且 AT ≥5,或 ≥1 AI 引荐,或 AT 全站 ≥40/28d;t0 页 0 / AT 26)·
`eco-es-winter-en-1116`(≥10 pv 或 ≥3 搜索/AI 引荐;calefactor 11 月峰在窗内;t0 0)·
`eco-it-winter-en-0115`(同阈值;muffa 1 月峰在窗内;t0 0)。**赢了才扩**:AT → Balkonkraftwerk-AT 规则页;ES → deshumidificador(12 月);
IT → deumidificatore(注意它峰在 **7 月**,意大利除湿是夏题)。**输的写法**:对应国家只维护制冷版,不再按季节加国家页。

**一句实话**:三个市场 28 天合计 42 pv / 10 点击,是 DE 的 15%。这轮把它们从「没有」做到「有正确的页」,不会让点击翻倍;
真正能翻倍的仍是 DE 的冬季簇到季,而那是日历。


## 德语区大拓展:五张页、一层指路框,押在三条已验证的证据上(2026-09-18,owner:「德语区做一轮大拓展」)

**「大」不是页数,是每一页背后有没有本站自己的读数。** 这轮的三条证据:①**故障排查页型**是本站唯一有 128 倍页效证据的页型
(4 页 = 32 次搜索访问 vs 评测页 16 页 = 1 次);②**冬季湿度/取暖簇**是唯一有季节证据的簇(schimmel 68,5 / luftentfeuchter 32,0 / heizlüfter 29,4);
③**AT 是唯一被系统性误服务的德语市场**(第三市场,全部落在引用德国法的页上)。四个新页队列冷启动 0 pv 的读数没变,
所以每一页都登了判定线,输的写法先写好。

### 建了什么

| 页 | 押的证据 | 事实来源 | 货架族 |
|---|---|---|---|
| `/guide/luftfeuchtigkeit-senken.html` | rising 46 700、10 月峰、evergreen、**站内 30 张湿度页没有入口** | Magnus 现算并复核(室外 5 °C/80 % → 20 °C 时 30 %;25 °C/70 % → **95 %,夏天开窗更湿**;40 m³ 60→50 % = 61 g) | dehum |
| `/guide/luftentfeuchter-stinkt.html` | 故障页型;镜像本站搜索第一页 `mobile-klimaanlage-stinkt-schimmel`(同一个部件) | 物理(冷湿脏的 Register + 暖房间 = 生物膜)+ 站内清洁纪律 | dehum |
| `/guide/heizluefter-schaltet-sich-aus.html` | 故障页型;五个断路器按「模式」分诊 | 算术:2 000 W ÷ 230 V = **8,7 A**,16 A × 230 V = 3 680 W;两台 = 17,4 A 跳闸 | heater |
| `/guide/luftbefeuchter-weisser-staub.html` | 故障页型;luftbefeuchter 冬/九月 2,81× | 物理(雾化带矿物、蒸汽不带);**CONTEXT_MODELS 覆盖**,否则默认 dehum 货架会在加湿页上卖除湿机 | 蒸馏水 / Verdunster / 湿度计 |
| `/guide/balkonkraftwerk-oesterreich.html` | AT balkonkraftwerk 61,4(3 月)、anmelden 18,0、800 watt 23,0;站内 12 张 BKW 页全引 EEG | **RIS 实抓 ElWG**(BGBl. I Nr. 91/2025,Fassung 18.09.2026):§ 7 Z 78 = **0,8 kW an der Übergabestelle**;§ 77 无 Zählpunkt、免 §§ 11/74 Abs 1;ElWOG §66a 于 24.12.2025 失效 | storage(无 EcoFlow) |

**DACH 指路层**:`klimaanlage-mietwohnung` / `balkonkraftwerk-mieter-recht` / `heizkosten-senken-als-mieter` 三张德语法律页各加一个框,
把奥地利读者指向 § 9 MRG 页与 ElWG 页——此前这三页把 § 554 BGB 讲给第三市场的读者。部署自检断言三页含 `oesterreich.html`。

### 量了但没建的(读数在,别再猜)

- **`heizlüfter 300 watt`**:rising 44 900,5 年绝对量 **0,0** —— rising 第四次骗人(前三次 konvektorheizung、我自己混刻度、saugwischer)。不建。
- **Heizkostenzuschuss AT**:19,3、10 月峰、零覆盖,**oesterreich.gv.at 仍是维护页**;下轮再查。
- **`luftfeuchtigkeit senken` 被 autopilot 放进了 `offtopic_dropped`**——分类器把本站核心词判成站外。今天没改分类器(改一处会动全舰队);
  读 digest 时**`offtopic_dropped` 也要扫一眼**,里面可能有最大的那条。
- **Trends 对故障短语全部 ≈0**(luftentfeuchter stinkt 1,0、heizlüfter schaltet sich aus 0,0、infrarotheizung wird nicht warm 0,0):
  与手册一致,长尾故障 Trends 测不到,信第一方。所以这三页是**页型赌注**,不是搜索量赌注。
- **ElWG 里没找到 Kleinsterzeugungsanlage 的 Meldepflicht**:页面如实写「问 Netzbetreiber」,不编流程;Förderung 无官方汇总源,不写金额。

### 过程里踩的两个坑(都被闸门抓住)

1. **JSON-LD 里的德语引号**:FAQ 答案里 `„…"` 的闭引号是直引号,把整段 JSON-LD 打断(`build_entity` 红)。改成 `“`。
   **更隐蔽的后果**:第一次构建时 JSON 坏了,注入器另塞了一个独立的 `eb-crumb-ld`;修好 JSON 再构建,@graph 里又拼进一个 →
   **两个 BreadcrumbList**(`check_crumb_parity` 红)。要手工删掉那个孤儿脚本。**规矩:JSON-LD 里的引语只用 „…“。**
2. **`cat_of()` 与 `collect_articles()` 各有一份前缀表**(注释说「same rules」,但是两份代码)。`luftfeuchtigkeit-` 只加了一处,
   面包屑就落到了 Klimaanlagen。两处都改了;**下次谁再加前缀,两处一起。**
3. 五条 description 全部超 165(181–187)——写完先数。

### 验证

18 道闸门全绿、byte-stable;Playwright 390px 六页(五新 + 一张指路框页):单 h1、零横滚、零错误、amazon 链接 11/11、11/11、12/12、10/10、11/11、15/15 全带 tag、
零 amazon.com、货架在、零 EB_SIZER、FAQ 5 条;加湿页**无 MeacoDry**(覆盖生效)。内链:stinkt 页 18 张页链入(luftentfeuchter token 重叠),
其余 4–6 张。部署自检 +7 条(0,8 kW / keinen eigenen Zählpunkt / 48 Prozent / 8,7 A / Nichts in den Tank / Verdunster mit Hygrostat / 三页 oesterreich.html)。

### 判定线(已进台账,103 条)

`eco-dach-troubleshoot-1116`(三张故障页合计搜索引荐 ≥25/28d 或 pv ≥40;**输 = 128 倍是空调簇特例,停止按页型铺页**)·
`eco-luftfeuchtigkeit-hub-1116`(≥25 pv 或 ≥1 AI 或 ≥3 搜索)· `eco-at-balkon-1116`(≥1 外部引荐或 ≥8 pv;**春季峰值并入 eco-storage-spring-0415**)。

**一句实话**:这一轮把德语区的三类缺口补上了——冬季故障页、湿度簇入口、奥地利法条——但它仍然是「新页」,
而新页在本站的冷启动读数是 0。区别在于这次每一页都押在一个已经量过的形状上,输了能说清楚是哪个假设错了。

## 深度全站分析 + 同类站对比:新页根本没被 Bing 抓,根因在发现面噪音(2026-09-22,owner:「先完善prompt再执行:eco深度全站分析,再对比同类网站,学习增强流量策略,并执行应用」;全文 `docs/site-analysis-2026-09-22.md`)

**212 页 × D1 56 天 × 12 天爬虫日志,一句话:最强的流量预测变量是页面年龄,而年龄起作用是因为 9-10 之后发布的 19 张页 bingbot 12 天只抓过 1 张 1 次**(同期 bingbot 每天抓 30–125 次**老**页)。本站 100 % 搜索流量来自 Bing 索引,所以这一条压倒所有页面属性。

- **控制年龄后(DE、8-27 前,n=112)仍成立的**:故障页每页 11,0 次搜索(计算器指南 3,3、梯页 1,65);梯页是钱页(2,0 联盟点击/页,全站最高);1 200–1 999 词的页搜索访问是 <1 200 的 **2,7×**;有 1 张表的页拿到 14 次 AI 引荐、0 表的只有 4 次(搜索无差);入链不是杠杆(第三次)。**标题长度 56–65 赢是与 7 月 CTR 改写重合的相关,不动标题。**
- **根因两处,都修了**:①IndexNow 步把注入器改写的文件也当「变了」提交——run 220 一个一文件提交提交了 **66 个 URL**,09-17 十次部署 ≈ 780 次提交,真变的不到十分之一;工具 manifest 另外每次 push 整包提 12 个。②`build_sitemap` 无日期页回退 **mtime**,CI 全新 checkout → 线上 13 个 URL 日日 lastmod=部署日。修法:部署前快照线上 sitemap;IndexNow 只提 **pushed diff ∪(本次 sitemap − 部署前线上 sitemap)∪ schedule 那次的 `/`**,churn 只报 warning;manifest ping 只在 `tools/revenue-studio|member-studio` 变更时跑;lastmod 顺序 dateModified → **git 提交日** → datePublished → 回退;新闸门 `check_sitemap_lastmod.py`(今天日期只允许首页/未跟踪生成页/今天有提交的文件,两向自检)。注入产物已提交进仓,仓库 = 部署状态。
- **AI 面**:`/` 28 天被 openai 家族抓 316 次、AI 引荐 **0**;56 天 39 次 AI 引荐全部落深页(tilt-and-turn 16、kippfenster 7)。结算 `eco-home-table-geo-1112` 时按「首页是目录、深页是答案」读。
- **同行(只写抓到的)**:temperaturheld 68 页全部 lastmod 2026-09、~1 050 词、73 内链/页、0 外链、无 meta description;raumklimatest 咨询页 2 257 词 + Quellen 4 外链 + 具名作者 + 真图;klimaanlagen-guru 选题与 eco 逐条重合、每月 11–19 帖、LocalBusiness 地址。**学的只有「已有流量的短页加深」**(下一轮候选:was-bedeutet-btu 764 词/19 搜索、abluftschlauch-verlaengern 759/10、wie-viel-btu 382/7、zugluft 720/6);假新鲜、作者、地址、产品页、巨型导航一律不学(理由在文档 §五)。
- **沙箱可达性**:六个搜索引擎全部不可用;vergleich.org / luftentfeuchter.cc 质询页;testit sitemap 410。诊断中从沙箱发过**一次** IndexNow GET(单条,200),记档不重复。
- **判定线 `eco-new-page-discovery-1020`**:19 张新页 bingbot 覆盖 ≥12/19 且 ≥1 次搜索引荐;输 = 是抓取预算/权威问题,新页冻结继续,Bing Webmaster 抓取统计列 owner 待办。
- **线上验证(run 221/222)**:内容提交提 27 个 URL(= pushed diff),纯 workflow 提交提 **0**(「nothing changed — skipping」);manifest ping 两次都 skipped;lastmod=今天的 URL 13 → 8 且全是今天有提交的文件。**那 37 张 churn 页也修了**(run 223 的 diff 摘录点名 `EB_RELATED`):`build_related.py` 的 top-up 遍历按 `os.walk` 目录序走且边遍历边改状态,runner(ext4)与沙箱目录序不同 → 同一份代码两台机器产出不同页。已改 `sorted(pages)` + 排序 walk,确定性产物已提交。**规矩:边遍历边改状态的注入器,遍历顺序必须显式排序。** IndexNow 步保留「第一张 churn 页 diff 摘录」诊断,以后 churn warning 出现先看它。
- **脏数据口径**:`/` 83 pv 里 57 US 无来源、midea-portasplit 50 里 43 US 无来源、spain 6 天 14 US、smells-musty 3 天 11 US——扫描器,按 pv 排序前先剔。

## 工具板块检查与扩展:34 个工具,1 个被用,枢纽漏了 14 个(2026-09-22,owner:「先优化prompt再执行:eco站点的工具板块检查与扩展」;全文 `docs/tools-audit-2026-09-22.md`)

- **读数(D1 56 天真人)**:`btu_calc` **72**(尺寸器,唯一被用的工具);其余全部工具事件合计 <10;`taupunkt_check`/`heizkosten_calc`/`bkw_calc`/`hitze_check` 等 8 个事件 **0**(本轮逐个实跑验证都能发,是没人触发);`/tools.html` 56 天 **1 pv**。
- **Playwright 逐页实跑 39 张(390 px,信标全捕获)抓到的真缺陷,全部已修**:①`pro-werkzeuge` 能源工具**用自己的默认值都算不出**(`eCost` 6 800 不在 `min=1 step=100` 的步进格上,`reportValidity` 静默 false)→ `min=100`;②五张国家计算器结果表头 **`undefined undefined`**(`t.totalA/B` 从不存在于文案包)→ 回退 `t.total`;③同五张 **390 px 横向溢出 35–177 px**(grid 子项无 `min-width:0`)→ 修 CSS;④es/fr/it 三张**连 page_view 都不记**(不在注入循环里)→ `country-ui.js` 的 `ev()` 助手在无层页面直发 `/api/ev`,**load 时**补 page_view(`setTimeout(0)` 会在 EB_TRACK 之前跑而双计,实测过);⑤7 个工具面零事件 → 新增 `solution_calc` / `pro_tool_run` / `watt_calc`(去抖 + 同值去重),worker 白名单 +3。
- **枢纽**:`/tools.html` 是导航唯一工具入口却是手写页,**14 张工具页不在上面**(五张决策计算器、三张 household、五张冬季露点/停电页、Speicher-Förderung)。现在 `tools/build_tools_hub.py` 从文件系统发现工具页(剥 EB_ 块后的数字输入 / `data-v` 问答 / ≥2 select+结果区 / 显式实时数据工具),按季节排家族,文案取各页 h1+description;`tools/check_tools_hub.py` 断言**枢纽 == 文件系统**,两向自检。34 张全在,byte-stable。`/workbench` 12 张是部署时生成、闸门运行时不存在,不进自动索引。
- **不建新工具**:需求文件里没有一条工具形状的查询,free-tools 评分卡 <15;33/34 个工具没人用是发现与正确性问题,不是品类问题。判定线 `eco-tools-hub-1020`(枢纽 pv ≥10 且非 BTU 工具事件 ≥12,或新事件任一 ≥5;输 = 读者只在指南里顺手用工具,枢纽只维护闸门)。
- **通用教训**:①「工具能用」要在浏览器里用**页面自己的默认值**点一次——一个从来算不出结果的工具在静态检查里和好的一模一样;②翻译文案包里的键要在渲染代码引用处逐个核,`x||fallback` 的回退要覆盖所有键而不是想到的那几个;③任何「按页面里有没有 X 决定」的判断先剥掉注入块(与 09-18 货架 guard 同一条)。

## btu_calc 深度分析:72 次事件 = 21 次使用,算完 0 次点击,工具没放在问题被问的那张页上(2026-09-22,owner:「Btu_calc深度分析使用情况再优化,目标扩大使用流量」;全文 `docs/btu-calc-analysis-2026-09-22.md`)

- **读数口径先改**:sizer 每次按钮/Enter/下拉变化各发一条事件,08-17 一个人在 25-qm 页发了 16 条、09-20 一个 GB 读者在 EN heatwave 页发了 16 条。**56 天 72 事件 = 21 次会话(页×日×国去重)**,以后引用工具使用一律按会话。
- **按面**:独立页 `btu-rechner` 10 pv / 5 会话(50 %),DE 内嵌 sizer 146 pv / 11 会话(7,5 / 100 pv),EN 内嵌 117 pv / 2 会话(1,7),**首页 EB_HOMETOOL 56 天 0 次真人使用**(要点按钮才算,首页真人 pv ≈26)。会话集中在尺寸梯页(slug 预填,读者改一下数字就是一次使用)。
- **算完之后**:21 个会话里,同页同日联盟点击 **0**(20 分钟内也是 0)。09-21 一位 AT 读者在三张页各算一次、看了 22 张页、点的 6 条联盟链全在别的页上。**sizer 是研究步骤不是购买步骤**,结果条那个 Amazon 按钮 56 天没被点过。此前它的点击记成 `body`,只能靠时间戳推断。
- **覆盖**:146 张 ac 页里 64 张有 sizer,没有的 82 张里恰是流量最高的(wohnmobil 73、EN tilt-and-turn 63、kippfenster 43……),各有排除理由(CONTEXT 货架 / 自带窗封工具 / 房车不是房间),**不叠第二个工具**。真正的缺口是 **`was-bedeutet-btu`:25 pv、20 来自搜索(bing 7 / ddg 6 / yahoo 5),是本站 BTU 意图最大的搜索入口,比计算器页自己的 3 次搜索多 6 倍,却因为在 SKIP_MODELS 里连 sizer 一起被排除了。** Trends 同向:`btu klimaanlage` 是 BTU 族里唯一有量的词(6 月峰),`btu rechner` 是 0 —— 读者搜「BTU 是什么/多少」,不搜「BTU 计算器」。
- **做了三件,零算式改动、零新钩子、零新页**:①`SIZER_FORCE = {"was-bedeutet-btu"}`,只放 sizer 不放货架(65 张页带 sizer);②**修一个真缺陷**:EN sizer 的「Add ceiling height, people, kitchen →」指向 `how-many-btu-do-i-need`,那页 0 个输入框,改指 `btu-calculator`(21 张 EN 页);③sizer 与首页工具的 Amazon 按钮自报 `source:"sizer"` / `"home-tool"`(toppick 同款机制,埋点层 500 ms 去重实测不双计)。**③刻意做在组件里不做在 EB_TRACK 里**:改埋点层会让 229 张页的 HTML 变化,IndexNow 会把它们全当改动提交;做在组件里只动 65 张页 + 首页。
- **验证**:20 道闸门绿、二次运行 byte-stable;Playwright 390 px 四页(解释页 / EN 载体页 / 25-qm / 首页):加载即算不发事件、点一次恰一条 `btu_calc`、点结果按钮恰一条 `affiliate_click{source:"sizer"|"home-tool"}`(含带页级追踪器的 25-qm 页)、20 m² → 7.000 / 30 m² → 10.000 / 25 m² → 8.500、零 pageerror、零横滚。部署自检 +4 条。
- **判定线 `eco-btu-sizer-1020`**:解释页 btu_calc 会话 ≥3/28d(t0 0)且全站 `source:"sizer"` 点击 ≥1(t0 0)。**为什么不按绝对次数**:`btu klimaanlage` 冬季只有 9 月的 0,24,从现在到 5 月绝对次数只会跌,谁拿它当判据谁就会把季节读成失败;旺季读数留到 2027-06。输①→从 SIZER_FORCE 移除不留死块;输②→结果条简化为答案 + 站内链接,别再往上加钩子。
- **别做**:美国 sq ft 输入(btu_calc 国家分布 US = 0,且 `eco-us-units-0131` 已在测)、首页工具改成加载即算(只产生假读数)、给 kippfenster / dachfenster / kuehlt-nicht 叠 sizer(候选,等 10-20 读数)、BTU 新页。
- **通用教训**:①**事件数不是使用数**,任何「随输入变化发事件」的工具都要按会话读;②**工具放在问题被问出的那张页上**,而不是放在「工具页」上——SKIP 名单在挡货架的同时可能顺手挡掉了唯一有人用的工具,加排除规则时想清楚它连坐了什么;③**改埋点口径优先做在组件里**,全站层的一行改动 = 全站 HTML 变化 = 发现面噪音。

## 联盟点击深度分析:泄漏已全部堵上,赢的只有「先测再换」,EX105 仍卡在 owner 的 3 分钟(2026-09-23,owner:「eco联盟点击的深度分析优化」;全文 `docs/affiliate-clicks-analysis-2026-09-23.md`)

- **28 天 79 次点击(真人,剔 CI,08-26→09-23)**:正文手写配件链接 32(41 %)、toppick 24、models 8、other 8、sticky 3。**126 张页都有的货架只贡献 10 %,最大的面是写页时按步骤放进正文的具名配件**(Kippfenster-Panel、XPS-Platte、Alu-Klebeband)。按页型:安装/配件 ~38 %、尺寸梯页 29 %、EN 国家页 11 %、房车 8 %、排障 6 %。DE+AT 84 %。每周 13–20 次,制冷季收尾后稳定。
- **去向**:EX105 搜索链 14 次(18 %,11 页 6 国)· 窗封/面板/板材搜索 ~22(对配件这是对的)· `/dp/` 10 · 房车 6 · 供暖具名卡 6(Schmidbauer 4、NTH20 1)· **MeacoDry 0**。amazon.de 75、.com 1。**没有送错商城的泄漏。**
- **三条泄漏都已是历史,今天构建产物里是 0**:无来源点击(56 天 42 → 28 天 0,08-28 埋点层按祖先推导来源)、已核验型号仍走搜索(Comfee / Klarstein / MDDF / PAC N90 的 `s?k=` 今天 0 页)、无 link_url(2 条,均早于修复)。**所以「深度分析」在泄漏一栏的结论是没有新东西可修,别再去找。**
- **赢的一条,补登并提前结算**:`eco-growatt-diagnosis-0925`(08-28 预登记,此前只写在本手册、没进台账)读到 **31 pv / 3 点击(1/29 → 3/31)** —— 计量插座 1(经 sticky 栏)、Growatt 本机 2。won。**win 动作本轮执行**:09-17/18 建的三张排障页一直继承品类默认货架,给「机器出问题」的读者摆两台新机器(kein-wasser / stinkt 摆 MeacoDry 20L+25L,schaltet-sich-aus 摆两块红外板 + 两台暖风机)——正是 growatt 页 08-28 替掉的形态。改为诊断优先,**每句卡片文案都取自页面自己的正文**(61 g / 65 % / 8,7 A / 2,6 A / Lamellenrichtung / Schwimmerabschaltung):湿度计 → 吸附式 → 排水管;计量插座 → Schmidbauer 600 W(**只留一张换机卡**:初稿的「1.000 W 恒温暖风机」删了,读者的机器几乎都有小档,那是在卖他已有的东西);Lamellenbürste → 排水管。**顺序即移动端 CTA**:sticky 栏取页面第一条 Amazon 链接。读数并入 `eco-dach-troubleshoot-1116`,不另开线。
- **12 条线的提前读数已写进台账 `reading_2026-09-23`**(到期日再结算):09-25 kuehlt-nicht pv 0 → insufficient · 具名冬季卡 5(介于 4–8)→ insufficient 顺延 10-25 · 房车 lose · 租客冬季 lose · us-market 1 → lose 撤桥 · 09-28 /dp/ **14,5 %**(阈值 15 %)· feuchte_now 渲染 22 → insufficient · split 1 → lose · 10-03 rising_guide 0。
- **口径纪律(全舰队适用)**:pv = 0 的页读出 0 点击,结算写 **insufficient 不写 lose** —— 「没人来」与「没人买」点击数一样,处方相反。
- **owner 一件事,用今天的数字**:EX105 的 ASIN。28 天 14 次点击、08-31 以来 10/62 落搜索页;`/dp/` 14,5 % 卡在 09-28 线的 15 % 下面,**这一条核验通过就是 31 %**。B0BZWP26GD 不是(落到 AP98)。
- **过程里自己踩的一个坑**:只跑半条注入链(build_structure → build_hreflang)再比对,会让 96 张页的 markdown 链接与 hreflang 换位——`build_agent_md` 在链尾把它放回去。**任何「二次运行是否 byte-stable」的验证必须跑完整链,按部署顺序。** 部署后断言也要先对构建产物 grep 一次:第一版把导语里的小写 `erst messen` 写成了大写。
- **别做**:加钩子、动其它货架顺序、「锐化」泛搜索 `luftentfeuchter`(沙箱看不到 amazon.de 结果,改坏比不改糟)、统一配件搜索词(只影响归因,是翻炒)、动退出弹层(28 天 165 展示 / 8 点击 / 76 关闭,拆留都缺证据)、为 GB/AU 各 1 次 .de 点击写切换。


## 季节日历自动化 + Heizstrahler 扩到已排名页 + BTU 短页与本站数字对齐(2026-09-24,owner:「eco站点学习更多同类型网站成功经验，监控Google trends做好品类扩展与网站自动化」;全文 `docs/season-calendar-2026-09-24.md`)

- **季节性现在自己每月刷新**:`eco-trends.yml` 每天调用 `fetch_seasonality.py --if-older-than 28`(不满 28 天一秒退出,无新 cron,失败次日重试,排在 rising 之后;≈5 分钟/月)。新增两件自动化才需要的东西:**按锚点重标定**(系数写进 `anchor_factors`;之前能共用刻度,是因为 heizlüfter 2022 秋那一周恰好是每批的最高点,2027 秋它移出窗口)与**逐词保留上次好值**(`carried_from`)。`tools/test_seasonality.py` 17 条离线断言先跑,把重标定改成恒等变换会变红。**手跑 `--market` / `--countries` 仍是手动的。**
- **选季节品类先读日历**:`data/autopilot/demand-digest.md` 的 getecoback 节有「季节日历」:峰值月在 42 天内开始的词 × 德语页标题覆盖 × 状态。已下的结论放 `data/season-verdicts.json`(只存指针,换结论要有新证据);**状态为「未覆盖 · 待过三门」的才是候选**。已知假象:`zugluft` / `fenster abdichten` 显示「已覆盖」,但覆盖它们的是夏季空调页。
- **新页仍不被 Bing 抓**:09-17/18 发布的 15 张页 bingbot 0 张(09-10→14 那批是 38/46)。09-22 降噪后已有 6 张页第一次被抓,方向对但没结。~~在 `eco-new-page-discovery-1020` 结算前,新品类扩到已排名页上,不建新页。~~ **同日撤回**(owner「站点应该持续扩展」):新页照建,一天一页走扩展队列,发现面由首页 `EB_NEWEST` 块承担,见文件顶部「当前生效的扩展规则」。
- **Heizstrahler**(峰值 19,9、11 月,标题覆盖 0,没有测评所以不点名型号)→ `heizluefter-stromverbrauch` 新增一节:每 kWh 一样贵,省钱只能靠瓦数;四种场景怎么选;它做不到的事;安全只指向说明书、电工和 BBK。判定 `eco-heizstrahler-onpage-1125`。
- **`wie-viel-btu-brauche-ich` 此前和本站自己的数字打架**(350–400 BTU/m²、+10 % 日照、35 m²+ 推 Monoblock),现在与计算器和数据集一致(340、+20 %、2,6 m 以上 ×1,15、约 13.500 BTU 以上改用分体机),328 → 715 词。判定 `eco-btu-reconcile-0715`,在制冷季用占比读。**任何写 BTU 数字的页都以 `site/sizing-data.json` 和 btu-rechner 的系数为准。**
- **部署后内容断言会撞边缘缓存**(run 231 红):部署后 15 s 内,边缘可能还用旧版回答(`cf-cache-status: HIT`)。新页面的内容断言因此读到旧版,而几秒后线上已经是新内容。`check()` 以前只在非 200 时重试,现在内容缺失时每 10 s 重试一次、最多 3 次,约 30 s 后仍缺才判红;中途从旧版变成新版会打一条 `::notice::`。**新增内容断言照旧写,不要为了它去改缓存头。**同一次还暴露:部署后检查一红,IndexNow 那步就被跳过,而下一次 push 的 diff 里已经没有这些页(run 232 submit=0)。现在 IndexNow 只要部署本身成功就会跑;漏掉的两页由 eco-health 周一的 7 天补推(09-28)接住。
- **别做**:为「学更多同类站」再抓一批竞品(09-22 已比过六家,沙箱对多数同行 403);在新页能被抓之前按日历建新页;因为词义假覆盖去改日历匹配器。

## 持续扩展:队列、首页发现面、第一批三页(2026-09-24,owner:「站点应该持续扩展」;全文 `docs/continuous-expansion-2026-09-24.md`)

- **规则在文件顶部「当前生效的扩展规则」**,这里只记这一轮做了什么、量到了什么。
- **为什么撤回上午那条「不建新页」**:它把「值不值得建」和「能不能被发现」绑在了一起。D1 读数:首页 14 天被 bingbot 抓 25 次(12 天有),分类枢纽各 2–3 次,09-17/18 新页 0/15;而首页此前**没有一条 `<a href>` 指向 09-15 之后的任何一页**(`EB_POPLIVE` 的标题表只在 JS 里)。所以修发现面,扩展不停。
- **建了**:`data/expansion-queue.json` + 闸门 `check_expansion_queue.py`(7 个自检用例)+ demand-digest 里的队列节;首页 `EB_NEWEST`(最新 12 张,h1 作链接文字,原地替换);`DE-QUEUE` Trends 篮子挂在 `eco-trends.yml` 的月度步骤上。三张新页:`beheizter-waeschestaender`(207 g / 73 %)、`infrarotheizung-thermostat`(4,8 kWh / 1,44 €、四种调节方式)、`fenster-beschlagen-aussen`(露点表,零商店链接)。否掉六个(entlüften、richtig heizen、zugluft、wärmeunterbett、luftentfeuchter reinigen、ölradiator,全是红海),都写进了队列。
- **建完才测到的**:加热晾衣架在德国的每一种写法都不到普通「wäscheständer」的 0,5 %(英国 heated airer 是 15,5)——**这一页是照英国读数选的**。页面保留,不再建第二张,不做德语梯。外侧结露页在峰值月(10 月)上线。hygrometer 项改为「luftfeuchtigkeit messen」(1,0,与 infrarotheizung thermostat 同量级;kalibrieren 0,3)。**规矩:队列项建之前先有 DE-QUEUE 读数。**
- **顺手修的**:`device_of` 把「waeschestaender」归到除湿族;`CAT_OF` 补两个 luftqualitaet slug;季节日历的读法说明与 heizstrahler 裁定里的「新页等 10-20」一并改掉。
- **验证**:21 道闸门 + 队列闸门全绿;390 px 四页单 h1、零横滚、零错误、amazon 链接全带 tag;外侧页 0 条 amazon 链接;两个计算器默认值 207 g / 3,5 °C,各发恰 1 条 `taupunkt_check`;首页块 12 条链接。
- **判定线**:`eco-expansion-batch1-1122`(三页 10-26→11-22;前提 bingbot 抓过 ≥2 页)、`eco-newest-block-1008`(处理组 9 页 vs 对照组 19 页,≥5/9 且高 ≥30 个百分点;块会轮换,按在块天数读)。`eco-new-page-discovery-1020` 的读数里已注明 09-24 起有第二个干预。

## 营收:第一条不靠商品成交的 Amazon 收入 + 第四季度日历(2026-09-24,owner:「eco如何突破商业营收？设计方案并上线」;全文 `docs/revenue-q4-deal-calendar-2026-09-24.md`)

- **钱线读数**:PartnerNet 8 月 €0,085/点击 → **01.–14.09. €0,03/点击**(€1,61 / 56 点击,两件)。点击没怎么少,**每次点击的钱掉到三分之一**:9 月读者还在读过季的空调页,研究不下单。这一站全部收入都绑在「读者这周正好要买」上。
- **上线的**:`EB_DEALS` 活动横幅(`tools/build_deals.py` + `data/deal-calendar.json` + 闸门 `check_deals.py`)。只在 Amazon 已公告的活动窗内出现(Prime Deal Days 2026 = 10-06/07,aboutamazon.de;横幅 09-29 起,由每日 03:17 UTC 定时部署自动开关),首页 + 144 张有货架的德语页,只对 DE/AT 时区显示,默认 `hidden`。内容:日期、按货架族一句本站已有的话、§ 11 PAngV 的 30 天最低价、以及**只在 Prime 专属活动时**出现的 Prime 试用链接(`amazon.de/primegratistesten?tag=getecoback-21`,PartnerNet:**3 EUR 每个试用**;按 9 月费率 ≈ 100 次商品点击)。事件 `bounty_click`。
- **读数纪律(全站适用)**:点试用链接时页面追踪器也会记一条 `affiliate_click`(link_url 含 `primegratistesten`)。**以后读商品点击,一律剔 `link_url LIKE '%primegratistesten%'`。** 横幅里不链 aboutamazon.de:含「amazon.」,同样会被记成联盟点击。
- **Black Friday**:日历里有(11-27),但 `announced: false`。Amazon 公告周日期后,由每日任务按 aboutamazon.de 原文填进 `deal-calendar.json`(日期、原话、URL、`show_from` 最多提前 14 天),每日摘要的「Deal-Kalender」行会提醒。非 Prime 活动不带试用链接。
- **PA-API 已停用**(Amazon 弃用说明:调用回 403;第三方汇总 2026-05-15 下线)。09-12 的价格引擎调的就是它;手册里「owner 申请 PA-API 三步」已作废。接替的 Creators API 支持德国,门槛是**近 30 天 ≥10 笔合格成交**。**「价格 / Deals 层」的前提改读成「先卖到 30 天 10 单」**,不要再列成 owner 待办。
- **别做**:常年挂 Prime 试用、推 Audible/Music/Kids+/Prime Video 试用(同样 3 EUR,与本站读者无关)、替 Amazon 预测活动日期、横幅里放价格或商品链接、为非 Amazon 联盟写代码(09-05:只请示)。
- **判定线**:`eco-prime-bounty-1027`(PartnerNet 10 月 ≥1 笔 Prime 试用 Prämie;`bounty_click` ≥5 而 0 笔 → 撤试用链接只留日期和 § 11;<5 或没有截图 → insufficient)。`fleet-bounty-line-0929` 已结算为执行。
