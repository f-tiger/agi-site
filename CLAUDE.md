# agi-site — 舰队公开 monorepo 操作手册

**这是公开仓库。** Owner 决定(2026-08-19,原话:「github actions 到期了，重新建4个
站点的公开仓库吧…合并后，我以后统一在这个会话管理N个站点，后面还可以拓展、站点相互
学习进化」+「以后都用这个公开站点吧…不能迁移涉及个人隐私的不要迁移，保障网站能够
运行起来」)。公开仓 Actions 分钟免费 → 2026-08-18 那种「2000 分钟用满、全部定时
任务冻结到月初」的事故从结构上不再发生。

## 布局与权威关系

- `sites/agiscorecard/` · `sites/baipiaoji/` · `sites/getecoback/` · `sites/thedollscout/`
- **每个站点目录内的 CLAUDE.md 是该站的操作手册,全部继续有效**(硬内容规则、
  零编造、防翻炒、各自的部署与数据契约)。本文件只管舰队层。
- 原私有仓(f-tiger/agiscorecard、aitools、rearchfuture、sexweb)= 历史档案。
  **迁移后不要再向它们推送站点内容**——agiscorecard 旧仓的 main 仍连着
  Cloudflare 构建,往那儿推会把线上回滚到旧内容。
- 新站点照同样模式并入:`sites/<domain>/` + 一个 path 过滤的 deploy workflow。

## 台账口径(2026-08-23,owner:「台账带上联盟点击等关键订阅或者营收数据」)

每次报告的诚实台账从「订阅 X/5、营收 0」升级为**钱线仪表盘**,数据一律 D1 现查
(28 天窗),按站列:订阅(agi subscribers + bpj subs 真实行,CI/unsub 行剔除,
bpj 的 src=/__ci 是已知自测)、eco affiliate_click、**bpj go(出站点击,不是联盟点击——口径 2026-09-08 修正:tools.json 里 219 个工具带 affiliate 标记的是 0 个,90 天内被点过的 25 个工具无一例外,所以这一列恒等于 0 收入。此前把它列进钱线是记错,不要再当营收指标引用)**、
SR pick_open/out_click/calc_use、gridlings play/solve/subs、audits 询单、
invest_tool_click、tds affiliate_click(D1 hits 表 ev 列;链路 2026-08-19 上线,
08-24 复核通过:ev='' 的 JS 真人 pv 每日落库证明管道活着,affiliate_click=0 是
真没人点、不是测不到——别再把它记成盲区。**⚠️ 2026-08-30 tds 重大转向,owner
原话「下架掉这个站点,风险太大,更换为卖labubu的站点」:成人站整体下架(旧页
线上 404,deploy 自检断言),同域同 D1 改为 Labubu 真伪导购站,联盟 =
amazon.com/ecoback0d-20(该域已在 US Associates 列表,零 owner 操作)。D1 口径
不变,但 08-30 前的行属旧站,跨界对比无意义;台账从下一期起按新站计,判定线
2026-10-29 见站内 CLAUDE.md。同日 owner:「联盟id用我的德国和美国id,分别做
多语言」→ EN 页 amazon.com/ecoback0d-20 + /de/ 德语页 amazon.de/getecoback-21,
hreflang 语言组;DE PartnerNet 站点列表悬置项 **✅ 同日解除**(owner:「已经提交
站点地图和bing、联盟已加」——GSC sitemap 当日读取成功 7 页、Bing sitemap 已提交、
thedollscout.com 已入 DE PartnerNet 列表,双市场佣金归属全确权)。**联盟归属现况**(变现的前提,悬置项必须每次带出):
- amazon.de tag=**getecoback-21**(eco 全站+SR 新页,1,875 处)——**归属已确认
  (2026-08-25)**:owner 出示 partnernet.amazon.de 后台截图,该 StoreID 归其账号;
  P0 悬置解除,eco 恢复出联盟页。
  **🏁 舰队首笔已验证营收(2026-08-25 里程碑,Commissions 明细截图)**:30 天窗
  (07-26→08-24)佣金 **€9,96**,119 点击 → 5 单,转化 **4,20%**,下单额 €463,14,
  0 退货;单笔可核对:08-05 下单 €13,44 → 08-07 发货 → €0,67 佣金。台账口径从此
  「营收 0」改为「eco 联盟 €9,96/30d(未到账)」。每次报告引用 PartnerNet 数字须带
  数据窗日期,过期数字待 owner 下一张截图刷新——沙箱进不去 PartnerNet。
  唯一剩余待办属**付款侧**(不挡出页):后台红条提示付款/税务信息未填完,佣金累计中
  但需 owner 补完才实际到账(~2 分钟)——**营收已真实发生,这一步是它到手的全部距离**;
- amazon.com tag=**ecoback0d-20**(tds + agi 阅读清单,美国站)——**归属已确认
  (2026-08-25,owner 原话「ecoback0d-20是我的」)**:tds 侧悬置解除,its config.js 早已
  配好该 tag、picks/care-cleaning 的 data-amzn 锚已烘焙,即刻生效零代码;agi 侧
  who-is-leopold-aschenbrenner 阅读清单(3 本书,search 链接)同日上线。
  **owner 待办(1 分钟,保佣金有效性)**:US Associates 后台的站点列表需包含
  thedollscout.com 与 agiscorecard.com——Amazon 条款要求列出投放站点,未列可致佣金作废。
  **✅ 2026-08-28 owner 已完成站点列表**(后台截图:`ecoback0d-20` 的 Websites 列表现含
  www.getecoback.com + agiscorecard.com + thedollscout.com,"Websites and Mobile Apps updated")。
  **US 侧仍有付款侧待办(不挡投放)**:后台红条「Der Hauptkontoinhaber muss die Steuerdaten
  vollständig ausfüllen」——US 账号税务信息未填完,佣金会累计但付不出来,与 DE 侧那条同类。
  US 账号 30 天当前 0 点击/$0.00,符合预期(eco 的 EN 链接此前全部指向 .de)。
  **DE 台账刷新(截图,30 天窗至 14.09.2026 —— 这是当前有效数字)**:佣金 **€11,20**、
  **112 点击**、Bounties €0,00;当月(09-01→09-14)**2 件 ordered items**、已发货 2、
  收入 **€1,61**、56 点击、转化 **3,57%**;截图内 07.09 单日 tooltip:€1,61 / 9 点击。
  **四条口径纪律**:①**停滞打破了**:30 天窗佣金 €10,26→€11,20 = **+€0,94**,08-30 记的
  「三天零新增」不再成立。**注意 +€0,94 是窗口净差不是新增额**:窗口滑动会同时丢掉
  八月中旬的旧佣金,真正可确认的九月新增是 **€1,61(全部落在 07.09 那一天)**,
  是 partnernet.amazon.de 的德国侧销售(US 货架 09-15 才上线,US 账号仍 $0.00,与它无关)。②**€0,085→€0,10/点击
  不是干净的改善**:分子分母同时动了(佣金 +9%、点击 121→112 因窗口滑过制冷季尾),
  不要当成「单位经济改善」引用。③**转化率是真的腰斩**:同一定义(ordered items ÷ 点击)
  下 8,26%→**3,57%**,与季节判定一致——八月是制冷季尾的余温,九月没有了。
  ④**D1 与 PartnerNet 的缺口在变宽**:同窗 D1 真人 affiliate_click **86** vs PartnerNet 112
  (低 23%,上一期低 12%);九月当月 D1 **29** vs PartnerNet 56(低 48%)。方向仍一致,
  但**别再拿 D1 点击数去推算佣金**——两者口径不同且比例不稳定;D1 用于页面级归因,
  PartnerNet 用于钱。
  **owner 侧唯一待办仍没变**:截图右下「Complete your onboarding checklist」= 付款/税务
  未填完 —— €11,20 在累计,**这一步仍是它到手的全部距离**(~2 分钟)。
  下方为历史记录,保留作背景:
  **DE 台账(截图,30 天窗至 30.08.2026)**:佣金 **€10,26**、**121 点击**、
  **10 个 ordered items**、已发货 9、Bounties €0,00、转化 **8,26%**。
  **这一期是持平不是增长,三点纪律**:①佣金/下单件数/发货数与 08-28 那张**完全相同**
  (€10,26 / 10 / 9)= **三天零新增佣金**,八月与制冷季一起收尾;②**转化率 8,00%→8,26%
  是分母缩小造成的**(窗口滑动,点击 125→121,分子仍是同样的 10 件)——**不是改善,
  不要当成果引用**;上一期 4,20%→8,00% 是真的(件数 5→10),这一期不是。
  ③**口径纠正**:Amazon 这一栏是 **Total Ordered Items(件)不是订单数**,此前记作
  「10 单」不准;按件算 **€1,03/件**,而 €9,96/5 件那期是 €1,99/件——**每件佣金腰斩**,
  后五件是更便宜的货,不是费率变化。单位经济:€10,26/121 = **€0,085/点击**(≈持平)。
  **D1 同窗对账**:107 次 affiliate_click(真人、剔 CI)vs PartnerNet 121 —— D1 低约 12%
  (口径不同:PartnerNet 计 Amazon 侧跳转,D1 是 JS beacon),方向一致不矛盾。
  **两条判定线的当前读数(都还没到复核日,只记不判)**:①ASIN 直链——30 天 102 条带
  link_url 的点击里 **101 条是搜索链接、只有 1 条 /dp/**;`source:"sizer"` **0 次**。
  261 处 dp 链接确实烘焙进去了,但读者几乎不落在它们上面;而 7 天里点击最多的
  Pinguino PAC EX105(5 次)正是**故意保留搜索链接**的那个(B0BZWP26GD 在 amazon.de
  是 PAC EX93),即最大的 dp 缺口在结构上被堵着。②US 切换——30 天 **amazon.com 点击 0**、
  `us-market` 来源 **0**,而 US 17 + GB 8 仍落 .de;组件 08-28 才上线,09-25 窗口才走 3 天,
  **现在不判,只记录起点是 0**。
  **owner 侧唯一待办没变**:截图右下「Complete your onboarding checklist」= 付款/税务
  未填完 —— €10,26 在累计,但**这一步是它到手的全部距离**。
  下方原始记录保留为背景:
  **2026-08-28 追加 getecoback.com 到同一待办,并且它现在是舰队最大的单笔钱线缺陷**:
  eco 的 EN 区 318 处联盟链接 100% 是 amazon.de/getecoback-21,而 28 天里
  **US 16 次 + GB 8 次 = 24 次 affiliate_click(占 eco 全部 95 次的 25%)**
  被送进了这些访客基本不会下单的商城(GB 侧另有 08-06 已记录的「getecoback-21 在
  .co.uk 不计佣」)。EN 区恰是 eco 前五页里的三页。**这 25% 不需要任何新流量就能拿回**,
  但**未把 getecoback.com 列进 US Associates 就切换,佣金可被判无效**——所以先待办、
  后切换,不自行抢跑。owner 加完站点列表后,eco 侧按页切 amazon.com/ecoback0d-20、
  EU 访客继续走 .de(属 EN 区契约变更,按高价值扩展条的规矩执行)。
里程碑口径:舰队订阅计数 = agi 真实 subscribers + bpj 真实 subs(2026-08-23 起;
当日 bpj 首个真实订阅 kon***@gmail.com 经脱敏核验,舰队 3/5)。

## 每日输入层:创业产品雷达(2026-08-24,owner:「不能只依赖Google trends」)

owner 原话:「你的每天自动化任务也要把创业网站如producthunt等内容进行输入,不能
只依赖Google trends」。实现:`tools/startup_radar.mjs` 搭载 fleet-trends.yml
(04:20 UTC,不新增 schedule,增量 ~0.3 分/月),每日提交 **`data/startup-radar.json`**
——Product Hunt 公开 Atom feed(当日 featured)+ HN Algolia(show_hn 36h 热榜 +
AI 相关 story),免鉴权零密钥。会话沙箱对这三个源均 403(2026-08-24 实测),
**只有 runner 能抓**;每源抓不到写 ok:false+原因,绝不静默复用旧数据。
**用法(每日 run 与选题)**:读 `niche_hits`(五站词表命中便签)+ `history`
(14 天,同一产品连续多日出现 = 真热度);它是**选题输入,不是选题依据**——
任何由它引出的页面仍要过三门(尤其需求门:PH 上有产品 ≠ 有人在搜它),PandaAI
式快反的反面预登记照写。中文创业信源(36kr 等)runner 可达性未测,首轮跑通后再评估。

## 每日输入层:Google Trends rising 面(2026-08-25,owner:「bpj 按谷歌趋势优化」+「其他站点也要检查」)

诊断:`fleet_trends.mjs` 抓的美国**当日热搜** RSS 对 bpj/agi/tds 三站的 niche 词表
连续 6 天(08-20→08-25)全部 `matched:[]`——当日热搜面被体育/明星占满,结构上打不到
各站需求。当日热搜 ≠ 需求面。补:`tools/fleet_trends_rising.py`(搭载 fleet-trends.yml,
**不新增 schedule**)拉三站种子的 **rising 关联查询**,分别写各站 rising 文件。配额纪律
同 eco/SR:全池 11 个种子,每次运行只打 Google 2 次(60s 间隔),~6 天覆盖一轮;
keep-last-good、抓不到写兜底(autocomplete)、绝不伪造。沙箱对 google 403,只 runner 能抓,
**首轮数据要等下一次 CI 才落库**。eco 与 SR(buysomething)早已各有 rising 面,gamesledger
用游戏专属 fetcher,gridlings 无需求触发器——本次补的是缺口的两站(agi/tds)+ bpj。
**各站读法**:
- **bpj** `data/trends-rising.json`:裸工具名 rising = "<工具> free/pricing/alternative" 需求;
  命中的工具当轮优先复核 limits 与 watch 钩子(详见 bpj CLAUDE.md 第 4 条)。
- **agi** `trends-rising.json`:种子只用**定义型品类词**(artificial general intelligence /
  agi timeline)——浮出的是 "is agi close / when will agi / agi 2027" 这类判定题需求,正是本站
  33-37.5% 引用份额所在,喂 **rung ⓪ 引用放大**;**它是 Bing 引用数据的补充提示,不是主信号**,
  更不是追实体新闻的许可(种子刻意不含 openai/altman)。
- **tds** `content/trends-rising.json`(content/ 不发布):niche 产品词 rising = 买家意图需求,
  同 eco/bpj 的联盟目录用法。
三站一律:**选题输入,不是选题依据**;任何由 rising 引出的页面仍过三门 + 各站硬内容规则,
rising 词里的编造/幻名一律不落页。

## 子域/板块开设铁律(2026-08-23,owner 问「是否要建新子域/独立板块」后定)

现有管理面已宽:主域 agiscorecard.com + 四个伞域子域(invest./compass./source./
play.)+ 三个外部站(baipiaoji/getecoback/thedollscout)。实测教训:引用份额
(33-37.5%)全部长在**主域**的判定页上;新子域从零权威起步。因此:
- **默认动作 = 并入最近的现有域/板块**。判定型内容一律进主域集群(invest/
  Research);工具优先挂现有站。
- **开新子域必须三条全满足**:①独立 Worker/技术形态确需隔离 ②受众与品牌和
  现有站完全不同 ③自带独立变现闭环。先例 play.(游戏,三条全中)是标尺;
  差一条都不开。
- 主域内新「板块」的门槛 = 该方向出现**首个真实转化**(如 /audits 首询单)后
  才提权为一级导航,此前只以页面/chip 存在。

## 公开仓隐私红线(每次提交前自查,违者先撤后查)

1. **owner 个人数字人档案永不入本仓**:owner-identity.md / owner-identity.json /
   owner-trajectory.md 只存在于私有仓 + D1 `owner_identity` 表。deploy workflow
   里有硬门:发现这些文件名直接拒绝部署。
2. **订阅者/用户的邮箱、地址、任何个人身份信息不入库**:D1 里查到的地址在报告与
   日志文档里一律脱敏(首订阅里程碑那行就是脱敏样例)。
3. **token / API key / chatId / USDT 地址不入库**。密钥全部走 GitHub Secrets 或
   Cloudflare Secrets。建仓时已跑关键词审计(邮箱、USDT、私钥块、TG token 形态),
   新增大块内容后照此再跑。

## 部署模型

- push 到 `main` = 发布。deploy workflow 按 `sites/<x>/**` path 过滤,改哪个站
  发哪个站;全部带 `concurrency.cancel-in-progress: true`。
- Cloudflare 凭据在本仓 Secrets:`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
  (owner 2026-08-19 配置)。
- CI 纪律(沿用账号级规矩,免费≠可以滥用外部服务):「每日维护 + 外部副作用」
  (IndexNow、Wayback、赔率快照、爬虫探针)只挂 schedule 绝不挂 push;部署路径上
  只放 正确性校验 + 构建 + 部署 + 部署后自检。
- 公开仓特有注意:仓库 60 天无 push 时 GitHub 会自动停用 schedule。舰队日常
  节奏远高于此;若将来长期暂停,恢复时去 Actions 页手动 re-enable。
- **防回滚守卫:全部 8 条 deploy workflow 在 checkout 之后的第一步,永不删除**
  (2026-08-26 事故):GitHub 会乱序补发数小时前的 push 事件,每个旧事件按自己
  那个历史提交部署——当天把 gridlings 的重定向修复连滚两次,CG 审核正好撞上
  白屏页。守卫在 push 事件下比对 HEAD 与 origin/main:落后就 `git reset --hard`
  到 tip 再部署(这些站点的部署都是「按当前源码重建并发布」,发 tip 永远是对的,
  且幂等)。三条实现约束:①用 reset 不用 checkout——有 4 条流水线会 git push 回仓,
  detached HEAD 会让那步失败;②fetch 失败/tip 解析不出时 **fail-open 直接放行**,
  网络抖动绝不能阻断部署;③只在 `github.event_name == 'push'` 生效,dispatch 与
  schedule 本来就跑在 tip 上。**新增站点的 deploy workflow 必须照抄这一步。**
- **部署后自检覆盖率(2026-08-27 审计)**:agi(200+内容+D1 读路径)、eco、tds、bpj
  已有真自检;**gridlings 当天补上**(7 条改写路径各断言 200 且零重定向——那次死循环
  能潜伏三天,唯一原因就是这个站一个线上探测都没有)。**2026-09-04 补齐**:buysomething、
  gamesledger、x-poster 三条也有了(路由 200、JSON 形状、404、/api/live、badge content-type、
  /status);goldrush 从「只 warning」改为真断言。**同日发现三处「不可能失败」的自检**
  (agi /api/trends 匹配任何含引号的响应、tds 49 条 200 断言能被上一版生产满足、bpj 信标
  自测只打印不断言)——自检要能红,否则和没有一样;全部改法与教训见
  `docs/fleet-optimization-2026-09-04.md`。
  自检要断言的是**事故的形状**,不是「有个 200 就行」:死循环场景下 `curl -L` 超限
  会返回 000,所以 200 断言其实够用,但 gridlings 额外断言零重定向更早暴露问题。

## 会话工作方式

- 统一在一个会话管理全舰队:克隆本仓,进对应 `sites/<x>/` 按其 CLAUDE.md 干活,
  合并推送一次(一个会话内多站改动可以合成一次 push——path 过滤会让每个被改站点
  各自部署一次)。
- agiscorecard 的 odds-snapshot.json 契约不变:`agi-odds.yml` 每周一把快照提交进
  `sites/agiscorecard/`,gen_odds.py 原路径读取。
- 站点互相学习(owner 长期指令):跨站移植已验证的模式记进各站自己的日志文档;
  niche 隔离规则不变,跨站链接只在对读者真实相关时加。

## Routine 计划路径故障与手动补跑（2026-09-04 舰队体检发现，后续会话必读）

**故障形态**：三个「新会话模式」每日 Routine（tds / 白嫖计 / getecoback）自 2026-09-03 起，
**计划触发在 11–15 毫秒内 FAILED**——会话根本没被创建。这与 2026-08-25 体检那次
（跑起来但 15–19 秒空转）**不是同一种故障**，因此那份文档的「删除重建」处方**不适用**：
重建丢历史，而三者同日一起失败指向系统性原因，重建大概率无效。

**已验证的排除项**：同环境同模式的周任务全部正常（sellSomething / 舰队分发 / paid-weekly /
Weekly AI News 均 2–13 分钟成功）；**手动触发路径正常**（`fire_trigger` 三次全部返回 session_id）。

**处置规程（后续会话遇到同样情况照此办理）**：
1. 用 `list_triggers` 看 `last_run` 的 **finished_at − fired_at**：毫秒级 = 会话没启动；
   几十秒 = 空转（走 08-25 重建流程）；分钟级 = 正常。
2. 毫秒级失败时**不要重建**，改用 `fire_trigger` 手动补跑当日循环，并在 text 里说明是补跑。
3. 在报告里明确告诉 owner「Routines 界面的失败详情本会话读不到」——不要假装查过。

**结构性风险(本次暴露)**：「Routine 管内容 + 部署 push-only」的站，Routine 一死就是整站冻结
（tds 因此冻结约 86 小时）；有定时部署的站（eco/bpj）只丢当天内容增量。
新站上线时应默认给部署加一条低频 schedule 兜底，除非有明确理由不加。


**2026-09-04 补充证据（同日晚些时候）**：
- 两个**自绑定** Routine（agiscorecard 日报 `0 4 * * *`、sourceradar `40 5 * * *`）显示
  `enabled=false` + **`suspension_reason: plan_no_longer_eligible`** —— 这是**平台层挂起**，
  不是 owner 暂停，也不是会话侧能修的东西。它解释了 09-03 起两条日报的消失。
- 三个新会话 Routine（tds / bpj / eco）经 `fire_trigger` 手动补跑**全部正常**，
  tds 已跑完（8 分 33 秒 SUCCEEDED）。所以「新会话模式」本身没坏。
- 结论修正：09-03 的断供**至少有两个不同原因**，自绑定那两条属账号/套餐层，
  需要 owner 在 Routines 界面确认；不要把它们当成同一个 bug 一起处理。

## 自动化清单纪律（owner 2026-09-04：「太多任务」+「舰队不能依赖你进化」）

**新增或修改任何定时任务前，先读 `docs/fleet-automation-map.md`**（唯一权威清单）。
三条纪律，逐条硬性：
1. **先问能不能下沉到第①层**（`.github/workflows/`，零 AI）。取数/构建/部署/探活/
   告警一律属于第①层；只有「需要判断力」的才配得上一个 Routine。
2. **先算账再加 cron**（每次分钟 × 每月次数，写进提交说明）；外部副作用只挂 schedule。
3. **合并优先于删除**：`update_trigger` 改 prompt + `enabled=false` 停用，
   **永不 `delete_trigger`**——预登记判定线与历史必须留痕。

第①层的兜底现在是 `fleet-heartbeat.yml`（每日 08:00 UTC）：八站探活、超 7 天未成功
部署自动重发、快照写回 `data/fleet-health.json`、任一站非 200 直接把 run 打红。
**GitHub 的 workflow 失败邮件是整条链上唯一不经过任何 AI 会话的告警通道**——
所以「上面那句新站默认加低频 schedule」现在由 heartbeat 统一承担，不必每站各加一条。

## 营收突破线:与流量解耦(2026-09-05,owner:「针对商业营收,突破性调研思考,可以新开子站,或者优化原有的站点」)

**裁定**:营收公式 `流量 × 18,9% × €0,085` 里只有流量能动而两个月没动;**新子站不开**
(子域继承≈0、三条铁律无候选全中、08-28「稀释不是杠杆」无新证据推翻)。突破 = 把营收从流量
解耦。决策文档 `docs/revenue-breakthrough-2026-09.md`(三轮 prompt、8 站钱线、杀单再确认、
owner 决策卡、事实表)。
- **#1 Metaculus FutureEval 机器人锦标赛(已建)**:每季 $50k 奖池、300–500 题、bot-only,
  按准确度付奖金,不需要访客。`tools/metaculus-bot/` + `.github/workflows/metaculus-bot.yml`
  (每 2 小时;**job 级门 `vars.METACULUS_BOT_ENABLED=='1'`,未设 = 0 分钟 0 副作用**)。
  bot 的研究步把 agiscorecard `llms.txt` 作为 house prior 喂 AI 类题。**赛规 bot-only,
  永不人工干预预测;零编造照适用;联盟链接永不进预测说明。**

  **📍 当前状态(2026-09-07 收盘,后续会话先读这段再开口,别催 owner 做已经做过的事)**:
  - ✅ bot 账号 `agiscorecardBots` 已建(Metaculus 规则:**只有第一个 bot 有奖金资格**,
    所以永远不要建第二个);`METACULUS_TOKEN` 已入 Secrets;`METACULUS_BOT_ENABLED` 曾设为 1。
  - ✅ **管道已验证通到 LLM 调用之前**:run #14 与 #15 都成功连上 Metaculus 并拉到
    bot-testing-area 的 10 道题。**不是代码问题。**
  - ❌ **卡点:这个 Metaculus 账号一个模型的额度都没有。** 两次都是
    `400 You don't have an allowance for model`,先 `<gpt-4o-search-preview>`(库的默认值),
    钉死模型后变成 `<gpt-4o>`。**赞助算力要单独申请,不是有 token 就有** —— README 里原来
    那句写反了,已改。
  - 🕓 **算力申请表 2026-09-07 已提交**(trial 100 USD,conservative 150 / ambitious 400;
    criticality 5 并用两次失败 run 坐实)。**等 Metaculus 回复,周期未知,不要编时间。**
  - ⏸️ **`METACULUS_BOT_ENABLED` 已由 owner 主动设回 `0`** —— 不是忘了开,是刻意关的:
    每 2 小时红一次 = 一天 12 封内容相同的失败邮件,会毁掉「GitHub 失败邮件是唯一不经过 AI
    的告警通道」这条舰队保险丝。**手动 dispatch 不受这个变量限制**(工作流的门带
    `|| github.event_name == 'workflow_dispatch'`),所以额度到了先手动跑一次确认通,
    **再**把变量改回 `1`。
  - 🔧 额度到手后**不需要改代码**:`_llm_config()` 的四个角色都读环境变量
    (`BOT_MODEL` / `BOT_PARSER_MODEL` / `BOT_RESEARCHER`),设了 `OPENROUTER_API_KEY`
    会自动改走 `openrouter/openai/gpt-4o`。
- **#2 eco 租客契合 lead-gen(Check24/Verivox Stromwechsel,€16,50–20/lead ≈ 200 次 Amazon
  点击)**:与 08-28 杀掉的 PV/热泵线索不同(那条要业主,这条是租客的事),但撞 owner
  2026-08-29「只走 Amazon」——**只请示不抢跑,一行代码不写**;owner 答 no 则永久归档。
- **#3 Amazon.de 服务 bounty(Prime/Audible 免费试用 Prämie,现有 tag)**:预登记 **09-29**
  (eco 三条 affiliate_click 判定线结算后)在非判定窗购买页加一行,事件 `bounty_click`;
  金额在登录后的 Vergütungskatalog,owner 下次截图顺带。
- **#5 Perplexity Comet Plus 出版商池**:owner 一封邮件(草稿在文档 §七),60 天无回复归档。
- **外部变更要盯**:Cloudflare Pay-Per-Use 2026-09-15 起默认拦截 [thin]——保险丝「引用队列
  爬虫不设价不屏蔽」优先,09-15 后若 heartbeat 看到 GPTBot/OAI-SearchBot/ClaudeBot/
  PerplexityBot 被 403,先解封。
- **判定线(预登记)**:Metaculus 启用 +28d ≥30 题已提交且成功率 ≥80%;当季结算 +45d 奖金/
  位次进台账(零也记),未进前 1/3 下季不续;**当季结算后发一篇 house-prior 复盘**
  (2026-09-07 算力申请表上勾了 "Publish a blog article",这是对 Metaculus 的承诺不是可选项;
  数据不足就如实发「样本不够」,不能不发);**2026-12-05 总线**:舰队非 Amazon 收入 >0 或
  eco 联盟 ≥€30/30d,否则「解耦」判负,回到把 eco 做厚。
- **本轮再确认的杀单**(别再提):Boosts、x402(11 月复核)、爬虫收费、展示广告、分享按钮、
  widgets、非 Amazon 联盟(#2 是唯一请示例外)、PV/热泵线索、B2B 冷邮、新域/新子站、先复制壳、
  游戏当营收、X 自动发帖、KDP、代币、买站、卖引擎。

## 自动化交易子站?——不开;建了预登记纸面台账(2026-09-05,owner:「做一个自动化交易股票子站点?…先调研再实施」)

**裁定**(全文 `docs/auto-trading-research-2026-09.md`):子站三条铁律全不中;赛道里赚钱的是平台、
券商、有资本的 bot 运营者;「机器人赚到钱」在德(BaFin WpIG)/美(RIA·BD,自动执行破 Lowe 豁免)/
中(证券投资咨询牌照 + 2026 AI 荐股严打,券商停开内地证)都是牌照问题不是商机;实盘证据
(Alpha Arena 六模型四亏、巴西 97%、台湾 ~1%、SEBI 91%)全是反面。
- **已建**:`/ai-trading-ledger`(主域,挂在 `/do-ai-trading-agents-work` 之下)+
  `sites/agiscorecard/tools/paper_ledger.py` + `agi-paper-ledger.yml`(周一至五 22:40 UTC,
  ≈22 分钟/月 + 触发 agi 部署 ≈66 分钟/月)。六臂(SPY/QQQ 持有、AGI 十股等权、Tracker 加权、
  Faber 200 日、LLM 周频)从 **2026-09-08** 起同一份复权日线**确定性重算**,$10k 纸面、5 bp、
  T 信号 T+1 执行;零编造(取不到沿用缓存并标记,SPY 取不到则红)。LLM 臂门在
  `LEDGER_LLM_KEY`,未设 = not_started,**永不回填**。
- **铁律**:这页永远不变成信号服务、订阅、券商连接或「买 X」;仓位只在纸面执行后展示
  (MAR 20 条 / show-don't-tell);**不做 zh 镜像、不给券商链接**(中国监管);不接真钱。
- **判定线**:上线 +10 交易日管道健康;**2026-11-04** 页面真人 pv ≥30/28d 或任一引荐,否则不再加面;
  **2027-03-08 读数日**如实发布六臂,不晋升不出售;owner 若设 LLM key,+26 周把结果写进父页。
- **别再提(对外)**:交易子站/子域、给别人用的自动执行、卖信号/跟单、中文荐股或 zh 券商
  漏斗、预测市场 bot(德国违法)、回测当证据。券商 CPA(Scalable €60–150 / IBKR $200)
  与 Check24 同属「是否为只走 Amazon 破例」的 owner 决策。
- **owner 同日澄清:「自动化交易是个人用…目标是自己用来赚钱」+「不是给别人用,所以为什么
  不能做,就是要做」→ 个人镜像交易器已建**(`tools/trader/alpaca_mirror.py` +
  `agi-trader.yml`,门在 `vars.TRADER_ENABLED`,缺省 Alpaca **纸面**账户,实盘再过
  `vars.TRADER_LIVE`)。台账每臂新增 `target`(下一交易日目标权重)= 策略与执行的唯一接口,
  执行器不含策略。护栏预登记:`TRADER_MAX_NOTIONAL`(缺省 1000)、镜像臂纸面回撤 ≤−10%
  清仓变红、`tools/trader/KILLED` 一键停、台账陈旧 >3 交易日不交易、只在收盘前 45 分钟窗口;
  **日志永不打印金额/仓位/余额(公开仓日志公开)**;密钥只在 Secrets。判定 2027-03-08:
  跑赢 QQQ 持有且回撤更小才加码,否则关闭并把结论写进 `/do-ai-trading-agents-work`。
  **2026-09-06(owner:「还是投资交易器做到极致」)补上了唯一的大缺口:执行器此前一次都没跑过。**
  新增 `tools/trader/mock_alpaca.py`(本地 Alpaca 替身,复刻 `cls` 对 notional 单 422、
  15:50–19:00 ET 拒 cls 这两条真规则)+ `tools/trader/test_mirror.py`(20 场景端到端跑**真**
  执行器,断言退出码与 mock 实际收到的订单;~4 秒,零网络),已挂进 `agi-paper-ledger.yml`
  的 commit **之后**那一步(测试红了要告警,但不连坐让当天台账发不出去)。
  **首跑当场抓到两个会亏钱的缺陷,都已修**:①卖单被拒仍继续下买单(买单的钱来自那些卖,
  照买 = 超配,且当时退出码还是 0);②台账权重和 >1 被照单执行(上限 1000 部署了 1568)——
  修法是**拒绝不是归一化**,静默归一化会把上游 bug 藏起来。由此定规矩:**执行器不信任台账**,
  同仓同作者也是输入,输入先校验再用;**这条规矩适用于舰队所有「A 产数据 → B 执行副作用」的
  管道**。真账户的鉴权/限流/撮合/滑点/夏令时仍未测,首跑由 owner `dry_run=true`。
  owner 三步见 `tools/trader/README.md`。
- **同日第三轮(owner:「调研清楚,如何完善这个可以自动交易的股票平台…获取交易利润」)→
  `docs/auto-trading-platform-2026-09.md`**。证据裁定:solo + cron + 免费行情能可靠拿到的只有
  慢速多资产趋势规则的**回撤减半**,收益超额 ≈ 0 到 −2%/年(GEM 发表后 12 年没跑赢 60/40;
  McLean-Pontiff −58%;Cederburg 杀波动率择时)。据此:①台账扩为**十一臂**(+60/40 那根杆、
  GEM、GTAA-5、SPY 波动率目标、篮子 12-1 动量前五,全部 09-05 预登记早于 09-08);②执行器 v2:
  整股 market-on-close + 零股 day、四条错峰 cron + 从 Alpaca 读当日订单的幂等、≤10 分钟太晚
  变红、2% 现金缓冲、循环检测、Telegram 私密汇报;缺省臂 `gtaa5`;③判定线改为**税后**跑赢
  60/40 与 QQQ 且回撤更小(德国 26.375% / 中国 20%,月度实现收益比持有多交税)。
  **别再提**:日内交易(cron 抖动 + IEX 延迟)、LLM 选股当策略、行业轮动(换手/税最差)、
  加参数提收益(发表后衰减)。

## 类 Polymarket 抽佣平台?——不做;做它旁边那层(2026-09-07,owner:「扩展一个类似polymarket的平台…这样可以让网站有分成抽佣的渠道,现在赚钱太慢了」)

**裁定全文 `docs/prediction-market-platform-2026-09.md`(三轮 prompt、四问、信源全带日期)。
「赚钱太慢」的诉求成立(eco €0,085/点击、三天零新增),被否的只是手段。三条独立的杀:**
1. **抽佣这个前提本身不成立**:Polymarket **2020→2025 年底交易者 0 手续费、2025 收入≈0**,
   真正的钱在抵押品利息与数据授权;Kalshi taker 费 `7¢×C×(1−C)`,50¢ 处封顶 **1,75¢/张**,
   大户降到 2,6 个基点 —— 这是规模生意,不是能嫁接到小站的渠道。
2. **两个候选辖区都是刑法问题**:德国 GGL 已认定事件合约属 GlüStV 2021 非法博彩且**无发牌通道**;
   **§ 284 StGB** 运营最高 2 年、**为其做广告最高 1 年**、**gewerbsmäßig(=抽佣的定义)3 个月–5 年**;
   2026-06 九国监管联合警告,GGL 已就 ADI Predictstreet 的**广告**立案,执法延伸到支付/主机/电信。
   中国内地落在加密禁令 + §303 开设赌场罪。Polymarket 为合法回美花 **$1,12 亿**买 CFTC 持牌壳(QCX)。
3. **同级团队的失败先例**:**Manifold** 2024-09 上线真钱 sweepstakes、**2025-02 宣布关停**,官方理由是
   「从未达到能覆盖合规与客服开销的规模」;冷启动流动性是双边市场死循环,而本舰队是结构上最差的宿主。
- **别再提(对外)**:真钱预测市场、玩钱市场、sweepstakes、抽佣、代币、任何运营方角色;
  **预测市场联盟也不请示**(与 Check24 不同 —— 那条只撞「只走 Amazon」,这条还带 §284 广告罪的尾巴;
  且 Polymarket 推荐计划要求推荐人自己有 $10 000 终身交易量,Kalshi 不公开费率、只与大体育媒体直签)。
- **改为做的(已建)**:把「预测市场 vs 证据」从**一个写死的合约**扩成**一块行情板** ——
  `sites/agiscorecard/tools/fetch_market_board.mjs`(Polymarket gamma-api + Kalshi 免鉴权公开行情,
  **发现式抓取:先列后筛,绝不写死没核对过的 slug**)+ `tools/gen_market_board.py` →
  `/agi-prediction-markets`,搭载**已有的 `agi-odds.yml`,不新增 schedule**(~0.5 分钟/月)。
  依据:外站(AIToolsReview / OddsShopper / SiliconReport)正在吃「AGI 赔率」这块需求,
  而本站在判定页上有 33–37,5% 引用份额却只用一条写死的合约参与。
- **这一页的永久红线(与 `/ai-trading-ledger` 同级)**:只引用第三方公开行情并注明 UTC 取数时间;
  **不提供投注入口、不放推荐/联盟链接、不给交易建议、不做 zh 镜像**;外链一律 nofollow 且不带任何
  `ref/utm_/aff` 参数 —— 这三条由 `gen_market_board.py --selftest` 断言,能红。
  取不到行情就**不写文件不出页**;快照超 10 天直接拒绝出页(绝不拿旧价冒充新鲜)。
- **判定线(预登记,2026-10-19)**:`/agi-prediction-markets` 真人 pv **≥60/28d** 或出现任一
  「AGI 赔率」类搜索/AI 引荐;否则降级为 `/agi-odds-vs-evidence` 的一个小节,不再单独维护。
- **同时必须对 owner 说的话**:这一轮没给出抽佣渠道,但**「不靠流量的钱」舰队已经建好一条且关着** ——
  Metaculus FutureEval(每季 $50k 奖池、按准确度付钱、零访客需求),只差 owner 拿 token +
  设 `METACULUS_BOT_ENABLED=1`。每次报告都要带出这一条,直到它被打开或被 owner 明确否掉。

## 舰队整体进化 2026-09-12(owner:「舰队整体进化一次」;全文 `docs/fleet-evolution-2026-09-12.md`)

- **六个 worker 六份 bot 正则,token 数 9→55 不等** —— 同一只爬虫一站算 bot、五站算真人,各站人类 pv
  因此不可比且系统性多报。现在 **`tools/fleet/bot_ua.txt` 是唯一权威**(62 token,只收自报家门的
  爬虫/扫描器,**主流浏览器 UA 永远不进**),`tools/fleet/check_bot_ua.py` 断言六站字面量逐字相同
  并用真实 UA 样本测两个方向,挂在 `fleet-heartbeat.yml`。**改正则只改那个文件,然后同步六站**,
  否则 heartbeat 红。bpj/tds 是 JS beacon、无 ua_class 列,不在此列;它们靠 09-12 的行为 SQL 扣探针。
  **口径提醒**:六站自本次部署起 human 变严,跨窗对比人类 pv 下降是修正不是流失。
- **纸面台账 09-11 那次红是潜伏 bug 不是偶发**:权重先归一化再逐个 round(4) 可把和推到 >1.0001。
  已在 `paper_ledger.py` 加 `unlever()` 于 `target` 唯一出口;执行器侧的拒绝保留(两道线各管各的)。
- **`ua_audit` 现已在六个 worker 上**(agi + gridlings / goldrush / buysomething / gamesledger / eco,
  owner「继续做」后同日完成;五张表 DDL 与 agi 逐字相同,幂等建表,page_view 处写 UA 前 48 字符 + 分类
  计数,零 PII)。**以后任何一站的人类 pv 单日翻倍,先查该站 `ua_audit` 再查 09-12 那条行为 SQL**,
  不再靠猜。bpj / tds 未加(JS beacon、hits 表结构不同),要加是另一次 schema 决定。
- 仪表盘与判定线复核见文档 §一、§四;本轮不开新线、不加 cron、不建页。

## 「快速起流量的站」与「统计用户需求」(2026-09-12,owner:「…最难在统计获取用户需求」;全文 `docs/demand-and-fast-traffic-2026-09-12.md`)

- **舰队已有四个需求仪器**(各站 Trends rising、创业雷达、autopilot 需求队列、第一方信号),
  它们在舰队 niche 里一致读出「需求很薄」:agi gaps 0、bpj 站内搜索 0;唯一强信号是 **bpj 厂商投稿
  28 天 7 条**(供给侧)。问题不是测不到,是测到了薄然后照建。
- **现在一页读完**:`data/autopilot/demand-digest.md`(零 AI,随 autopilot 每日生成,带日期与 STALE)。
  **任何选题讨论先打开它。**
- **本会话对 Reddit 双向封死**(沙箱 000 + 搜索工具被 reddit.com 拒绝):**原帖只有 runner 与 owner 浏览器能读**,
  别假装读过。**Reddit 两个源已接进雷达**(求做板块 r/SomebodyMakeThis、r/AppIdeas;垂直板块按站 `VERTICAL`
  配置 + 14 天**重现计数** `reddit_recurring`,同一问题 ≥2 个不同日期才算需求;公开 JSON,只读;**机器永不发帖**);
  更强的信号在垂直小板块里搜 "is there an app that" 且**同一问题每隔几周重现**。判定线 2026-10-10。
- **四个方向裁定**:AI 中转站 **永久归档**(转售密钥被明禁、Anthropic 不允许中国公司、2026 执法最严);
  AI 短剧推荐 **不建**(分发在抖音/微信小程序生态,且是非 Amazon 联盟——若做属 owner 破例决定,形态也
  不是网站);AI 小说 **杀**(番茄日均 ~2 000 本、搜索引荐 −34%);AI 工具推荐站 = **bpj 已存在**,
  需求在供给侧,不开第二个。**「快速起来的流量站」:八站两个月零先例,仪器无读数,不开新站。**

## 手发文案的反 AI 味规则(2026-09-06,owner:「提示内容是AI生成,你要人性化的表达,不然被封了」)

**适用范围:`docs/distribution-staging/` 里所有给 owner 手发的稿子,以及周任务「舰队每周分发
暂存」生成的一切内容。** 起因:本轮给 r/incremental_games 写的首版草稿被 owner 一眼认出是 AI
写的。这类版块的封禁判定往往在前三行就完成,一条被判自动生成的帖子等于烧掉一个版块。

**写完必须逐条自查(全部是本轮实际改掉的东西)**
1. **破折号**。`—` / `——` 在一稿里出现两次以上就露。改句号、逗号或括号。目标是 **0**。
2. **句长方差**。全稿句长若集中在 20–30 词就是机器节奏。**要有 2–6 词的碎句,也要有 40+ 词
   拖沓的长句**。本轮三稿改后的分布:2–39 / 5–58 / 2–37。
3. **三拍排比**。`A, B, and C`、「Partly X, partly Y, and partly Z」是 LLM 默认节奏,删。
4. **揭晓式结构**。「真正的重点是」「The part I actually built it for:」——软文腔,删。
5. **零缺点零不确定**。必须有一处「这块我还没调好」、一个已知 rough edge、一个具体待解问题。
6. **营销形容词**:satisfying / seamless / genuinely / crafted / robust,一律删。
7. **结尾的漂亮行动号召**。换成一个具体问题然后停住。
8. **跨版块撞句**。同一批稿子里**不许有两条帖子共享一个 6 词以上的句子**——重复本身就是垃圾
   信号。本轮机检确认三稿两两之间相同长句 = 0。

**正面做法:用源码里的真实数字和真实机制名。** 开发者会写「第三个模型之后开始出 rogue,给你
20 秒,关掉损失一个模型换 +2 alignment」;营销文案只会写「动态事件系统」。写稿前先去代码里
挖(本轮从 `singularity.html` 挖出四个生产者、16 个升级、`Alignment dividend`、`ASI-3 trained`、
20 秒窗口、60 秒加成),**挖不到就别写那句,不许编**(零编造规则照旧适用于分发稿)。

**交付时必须附一句**:请 owner 自己再改动 10% 左右(换两三个词、删一句、换成自己的口气)。
一字不动地跨版块粘贴是最容易被判自动化的行为。

## 「AI 时代的站点」(2026-09-12,owner:「先完善prompt再执行:打造ai时代的站点,和阿里巴巴或者字节一样」;全文 `docs/ai-era-site-2026-09-12.md`)

- **裁定**:阿里/字节可抄的是**机制**不是形态——信任层(数据可核、带日期、零编造,这正是 AI 系统
  决定引用谁的依据)与飞轮(使用信号→缺口→页面)。形态(市场、信息流、账号)= 双边冷启动,09-07 已杀。
  **不建新站、不加 cron、不写正文、不做站内聊天机器人、不做 AI 量产内容。**
- **事实修正**:八站**全有** llms.txt(bpj 的在构建时生成,还有 MCP),上一轮把 bpj 判成全缺是看错目录。
  真缺口只有两处,都是仪表:①没人证明 AI 爬虫进得来(robots 放行 ≠ 边缘放行,被拦在 D1 里无痕;
  手册 09-05 说「heartbeat 看到 403 先解封」而 heartbeat 从没看过);②没人数 AI 送回多少人。
- **已建(搭 heartbeat,零 cron 零副作用)**:`tools/fleet/ai_access_probe.py`(8 站 × 8 AI UA,任一
  403/429/503 即红,对照组不 200 不判)+ `tools/fleet/ai_referrals.py`(D1 REST 读八站 28 天 AI 助手引荐
  → `data/fleet-ai-referrals.json`,三 token 逐试,>3 天读不到才红)+ demand-digest 新节。
- **基线(09-12,28d 真人 pv)**:舰队 AI 引荐 **69**(agi 20/27 662、bpj 33/1 888、eco 16/381,其余五站 0)。
  agi 引用份额最高而回流份额最低(0,07%)= 判定题被 AI 答完,读者不点进来;eco 回流份额最高(4,2%)。
- **判定线**:**2026-10-24** 舰队 AI 引荐 ≥138/28d 或五个 0 站 ≥2 个转正,否则 AI 读者面只维护不扩建;
  **2026-09-16** 读 `data/fleet-ai-access.json`,任一站被拦 → owner 关 Cloudflare 开关(会话不能代做)。
- **已知噪音**:探针带 `?__probe=1`(bpj 中间件不记账),其余 worker 按 bot 记 ≤8 行/站/日,08:00 UTC。
- **首跑(09-12 run 34725258191)**:探针 128 个请求全 200、零拦截;**D1 读数 403**——仓里两个 Cloudflare
  token 都没有 D1 read 权限(tds-traffic 的 D1 导出 09-04 起因此从未成功,`d1-snapshot.json` 不存在)。
  ~~owner 一分钟待办:给 token 加 D1 Read~~ **→ 09-13 已绕开,不再需要 owner 动作**:八站各加公开零 PII 聚合端点
  `/api/pulse`(bpj 沿用 `/api/reach`),worker 读自己的 D1 绑定,`ai_referrals.py` 端点优先、D1 REST 只兜底;
  七条 deploy 自检各加一条 `/api/pulse` 硬断言。**首读(09-13 06:01 UTC,heartbeat run 34741697973,八站全经端点)**:
  舰队 AI 引荐 **78**/28d(agi 20、bpj 33、eco 25、其余五站 0)。**口径差**:eco 端点按该站 `/api/trend` 惯例计
  `ua_class IS NULL OR 'human'`(手测 16 是严格 human),bpj 的 pv 列是「有来源的真人」不是全部 pv——**判定线
  10-24 以仪器口径为准,阈值改为 ≥156(2×78)**,台账已同步。D1 token 仍缺 read 权限,只影响 tds 那条历史导出。

## 固定循环:持续优化 · 探索 · 扩张(2026-09-13,owner:「目标是持续优化,探索,扩张。成长为这类型」)

**owner 的目标是长期方向,不是一次任务。** 字节/阿里能被 solo 舰队照抄的只有一个机制:**应用工厂**
——小赌注、预登记杀线、到期按数字加码或杀掉、永不遗忘。此前 ~40 条判定线散在九份 CLAUDE.md 里,
没有任何东西保证它们到期被读。现在:
- **`data/fleet-bets.json` 是舰队唯一的赌注台账**(09-13 建,42 条开放线,每条带 due / metric / threshold /
  win / lose / source)。`tools/fleet/check_bets.py` 挂 heartbeat:到期 3 天内 warning,**过期 >7 天仍 open 即红**。
  **新增任何判定线必须同时加一行进台账,否则等于没预登记**;结算时把 status 改为 won/lost/insufficient
  并写 settled + reading,再把结论写回对应站的 CLAUDE.md。
- **每次会话开场的三步(不问 owner,直接做)**:①`python3 tools/fleet/check_bets.py` 看谁到期,到期的先结算
  (D1 现查,读数进台账);②读 `data/autopilot/demand-digest.md` 与 `data/fleet-ai-referrals.json`;
  ③按下表各投**一件**,做完写判定线进台账。三门/零编造/防翻炒/隐私红线全部不变。

| 槽 | 定义 | 数据来源 | 允许的动作 | 不允许 |
|---|---|---|---|---|
| **优化** | 已有页面/机制的转化与发现 | autopilot `underserved`、hot_pages、eco 钱线仪表盘 | 标题/首屏/内链/货架重选、修自检、修分类器 | 翻炒(近 5 次改过的页不动)、没有读数的「优化」 |
| **探索** | 一个新假设,一张页/一个组件 | rising、雷达、`reddit_recurring`、第一方搜索 | 主域集群内加一页或一块,预登记 28 天线 | 新站/新子域(三条铁律)、非 Amazon 联盟、未过三门 |
| **扩张** | 已验证模式复制到相邻位置 | 台账里 **won** 的行 | 同站第二页 / 跨站移植已验证模式 | 把 lost/insufficient 的模式复制、按「客单高」再试第三次 |

- **扩张只从 won 的行长出来**:台账现在 0 条 won,所以本周期扩张槽为空——这是事实,不是懒。第一批到期
  是 09-18(bpj ×2、eco googlebot)、09-21(gridlings)、09-24(itch)、09-25(eco ×5)。
- **当前读数(09-15 刷新)**:舰队真人 pv 31 763/28d(09-13 读数)、**eco 联盟 €11,20/30d(至 14.09.2026)**、AI 引荐 78/28d(09-13 端点首读)、Metaculus 关着等额度。
  「成长为那类型」的诚实距离:那两家的起点是**供给侧先免费聚合**(1999 阿里免费挂牌、2003 淘宝免费)与
  **推荐引擎按数据杀 app**;舰队里唯一有供给侧敲门的是 bpj 厂商投稿(28 天 7 条),它是最像「平台」的
  一寸,已在 bpj 队列里。**每次报告的台账栏从此加一行:开放/已结/本期 won-lost 计数。**
- 09-13 明确**不做**的:eco 12 条 underserved 的标题改写。**结论不变,理由 09-15 换了**:
  09-11 那句「Google 没在抓(`googlebot=0`)」是**测不到**不是真 0——爬虫日志 09-11 才上线,
  上线后 5 天读到 googlebot 19 次 / 15 页(对照 bingbot 241 次 / 112 页)。真正的理由是
  **Google 28 天引荐 = 0**(eco 德语页与 `/en/` 都是 0,全部搜索流量来自 Bing 索引家族:
  DDG 112 + Bing 71 + Yahoo 18 + Ecosia 2,`/en/` 另有 chatgpt.com 15)。所以改标题给 Google 看
  仍然是零读数动作,但**要改就按 Bing/DDG 的口径改**。**这条对全舰队的推论**:任何站在
  「按 GSC/Google 优化」之前,先查自己这 28 天有没有 Google 引荐——eco 的答案是一次都没有。

## Reddit 需求撮合站?——不开子域;撮合层已建,公开页有门(2026-09-13,owner:「做一个子站点,挖掘爬取Reddit用户需求,并匹配产品机会点,变成一个机会撮合网站」;全文 `docs/reddit-opportunity-board-2026-09-13.md`)

- **裁定**:子域三条铁律全不中(不需独立形态、受众与 SR 重叠、「撮合」= 双边冷启动);且 **Reddit 商业数据
  需付费书面许可(2026 报价约 $12k/月起)、领头羊 GummySearch 2025-11-30 因拿不到许可停服、Reddit 2025-06 诉
  Anthropic、2025-10-22 诉 Perplexity/SerpApi**——公开转载 Reddit 帖文的站点是这三件事的交集,不做。
- **已建(零 AI,搭 fleet-trends,零新 cron)**:`tools/fleet/opportunity_match.py` → `data/autopilot/opportunities.json`
  (主题只作匹配键、重现天数、同向 Trends rising、PH/HN 已有供给、舰队已有页、确定性分数、状态机)+
  `sites/buysomething/tools/gen_demand_board.py` → SR `/demand-board`(**标题用 Google rising 查询,不存不发帖文/
  permalink,只链 Reddit 自己的搜索,外链 nofollow,无联盟**;出页门 ≥3 条 demand-confirmed 且重现 ≥2 天,
  否则不写页)+ demand-digest 新节「机会撮合」。判定线 **2026-10-11** 已进台账。
- **必须知道的一条**:reddit.com/robots.txt 自 2024-07 对所有未授权爬虫 `Disallow: /`;雷达的 Reddit 读取
  (公开 JSON、未登录、不绕过、约 20 次/日)技术上违反该 opt-out——与 SR 法律底稿对 Google Trends 的判断
  同类(小体量内部指标化,风险是限流不是诉讼)。**处置:内部读取保留、永不转载;owner 若要连内部读取也关,
  删 `startup_radar.mjs` 的两个 reddit 源即可,匹配器自动退化。** Reddit 源连续 14 天 ok:false → 直接停,不绕过。
- **别再提**:Reddit 撮合子域、转载帖文、真人撮合/联系双方、付费 listing、AI 生成商业计划、请求→商品的联盟映射。
- **首跑事实(09-13 08:32 UTC 计划运行)**:Reddit 对 runner 的公开 JSON 请求**逐板块 HTTP 403**(r/SomebodyMakeThis、
  r/singularity、r/artificial、r/ChatGPT、r/ClaudeAI、r/LocalLLaMA、r/puzzles…全部 403,非 404 非 429)。这是网络层
  拒绝,与 robots.txt 一致,换代码不会变。**照预登记规则:连续 14 天 403 → 直接停 Reddit 源,不换 IP/UA、不绕过**;
  匹配器自动退化为 Trends × PH/HN/Ask HN。板块名单与产出榜的价值因此取决于 Reddit 是否放行,09-27 前不下结论。
- **板块名单(owner 同日:「监控好 Reddit 合适的板块,监控好板块比什么都合适」)**:名单外置到
  **`tools/fleet/reddit_watchlist.json`**(每个板块带 why),三层:①request 板(SomebodyMakeThis / AppIdeas /
  Lightbulb / software,48h 新帖)②大板块 wish 句式搜索(Entrepreneur / smallbusiness / startups / SaaS /
  SideProject / indiehackers,周窗,只留 `WISH_RE` 命中的求做帖)③六站垂直板块(共 26 个)。**~36 次请求/日,
  串行 6.5 s 间隔,绝不并发绝不换 IP**。每板每日产出进 `startup-radar.json.board_stats`(14 天:ok 天数、帖子、
  求做形、贡献的重现主题),摘要里有「板块产出榜」;**ok ≥14 天且 0 重现且求做帖 <10 → 机器标 demote,
  会话来删并记进 watchlist**;404 原样记录,不猜名字。创业站 idea 源:PH featured + HN Show/AI 已有,
  **新增 Ask HN「is there a」周窗**;BetaList / Indie Hackers / PH 主题 feed / YC RFS 只做**探针**
  (`feed_probes`,报状态不入库),runner 读到 200 再写解析器——不假设 feed 存在。

- **owner 2026-09-15 在注册 Reddit app**(截图停在 create application 页)。三件事记死:①**script 与 web app 都行,
  installed app 不行**——`redditAuth()` 走 HTTP Basic + `grant_type=client_credentials`,没有 secret 的类型拿不到 token;
  已选 web app 不必重建。②Reddit 请求改用**专属 UA**(`agi-site-startup-radar/1.0 (+repo)`,不带 `Mozilla/` 前缀),
  非 Reddit 源沿用原 UA;可选 secret `REDDIT_USER_AGENT` 覆盖成 Reddit 推荐的 `(by /u/用户名)` 形式——**用户名属个人
  信息,只进 Secrets,不入仓不入日志不进 `startup-radar.json`**(输出里只有 `reddit_access` 这个状态字符串)。
  ③设好后手动跑 fleet-trends 看 `reddit_access`:`oauth` 通了 / `401` id·secret 错 / `403` 是审批门(创建页那句
  "You must also register to use the API")。**403 不绕过**:不换 IP、不伪装 UA,雷达退化为 SE·Bluesky·Ask HN。

## SourceRadar 核心工具 + 付费 Opportunity Packs(2026-09-13,owner /goal:「把 SourceRadar 工具完善,然后构建撮合网站…付费的包…营收…规模化」)

- **PRD**:`sites/buysomething/docs/PRD-core-tool-2026-09-13.md`(三轮 prompt、竞争图谱、官方数据源、P0/P1/P2)。
  **owner 的 /goal 明确要付费包,覆盖了 08-31 的「零读者不装转化件」**——已按其决定建完整链路,收款开关在 owner
  手里(`docs/PACKS-OWNER-SETUP.md`:Stripe Payment Link + webhook + 5 个 Secrets/Vars;未设即 503、页面明示未开售)。
- **P0 已落地**(同日):信标真值测试、`landed-cost` 官方来源重写(旧口径只留 `.expired` 块,gate 断言)、
  三个官方 API 探针(runner 下次 schedule 写 `data/sr-source-probe.json`)、`data.js` 来源标注与校验(100% 编辑估算,
  已在卡片标明)。P1(关税栈护照、召回雷达、逐品页、eco/tds 消费)等探针 200 后做。
- **包的红线**:只含派生事实与公开 feed,不存不卖 Reddit 帖文;金额不符不发包;零 PII;≥10 条才出包,
  不够就不卖(页面明说)。判定线:`sr-packs-first-order-1112`、`sr-core-tool-p1-1115`。

## AI 时代赚钱通道复核(2026-09-14,owner /goal:「调研分析并完善 ai 时代赚钱通道,现在 agi 站点赚不了钱,目标是赚钱」;全文 `docs/ai-money-channels-2026-09-14.md`)

- **agi 赚不了钱的数字**:JS 真人 pv **1 157/28d**(≈40 人/天)vs 服务端 human 27 550——差 24 倍,后者含不自报的爬虫。
  按流量计价的通道在此体量都是 €0–5/月,与方案无关;agi 的资产是 AI 引用份额,而引用不付钱。**报告 agi 流量以后用 JS 口径。**
- **不找新通道,解堵已建的**:六条通道里五条的下一步在 owner 手里(分钟级);代码侧今天已无堵点。
- **Metaculus 第二个坑(09-14 发现)**:库 0.2.92 的 `CURRENT_AI_COMPETITION_ID` 指向已结束的 Summer 2026(33022),
  Fall 2026 = **33121** 已开赛——有额度也会打空。已改:`BOT_TOURNAMENT_ID` 变量覆盖、缺省 33121;
  `BOT_MAX_USD_PER_RUN` 硬停(缺省 $3);`ANTHROPIC_API_KEY` 存在即用 Claude 5(Sonnet 预测 / Haiku 解析)。
  **owner 不必等赞助额度**:加自己的 key + `METACULUS_BOT_ENABLED=1` 即开跑;先 dispatch `dry_run=true` 看
  `questions touched: main=N`。
  **09-14 干跑已验证**:33121 拉到 1 题、花费上限生效、LLM 在代理额度上按预期失败;第三方时间表:热身 MiniBench 09-21、
  Fall 主赛题 09-28 起开放——**owner 在 09-28 前把 key 加好,赛季一开题就在场**。
- **owner 四件事按每分钟产出排序**:①eco 付款/税务信息(2 分钟,唯一已发生的营收到账)②Metaculus key + 变量(3 分钟)
  ③Stripe 五个值(10 分钟)④Reddit app 两个 Secret(5 分钟)。

## 渠道构成:每个站的读者从哪来(2026-09-15,owner:「整个舰队相互学习，流量增长」;全文 `docs/fleet-traffic-sources-2026-09-15.md`)

**本轮先做了一次全舰队实测,结论要记死,免得后续会话重跑一遍**:sitemap 抽样 155 条**非 200 = 0**、
重复标题 0、meta description 缺失 0、lastmod 100%、**IndexNow 全覆盖**(主域 + 9 子域走
`tools/indexnow-subdomains.mjs`,gamesledger/bpj/tds 各有自己的推送)、**llms.txt 14 站全有**。
**8 个 AI 引荐为 0 的站不是缺件,是只有 7–13 页且刚上线** —— 没有可移植的机制缺口,别做「把 X 抄给 Y」的假动作。

真正的缺口只有一个:**14 个站每次 page_view 都存了 `ref`,读侧却只有 `ai_referrals.py` 只数 AI 主机,
于是除 eco 外没有一个站知道自己的读者从哪来。** 同日手查两站给出**相反**的答案:
**eco 的 Google 引荐 = 0**(搜索全部来自 Bing 家族),**bpj 的 Google = 157/305 = 51%,是第一大来源**。
移植一个「在 eco 有效」的做法到 bpj,如果两站渠道相反,就是把运气当规律 —— **互相学习的前提是各站先看得见自己。**

- **已建(零新 cron,搭 heartbeat)**:`tools/fleet/ref_sources.txt`(引荐来源分类表,**唯一权威**,
  五桶 ai/search/fleet/social/other + direct + self)→ 13 份 `/api/pulse` 多返回
  `by_source`/`by_search`/`by_fleet`(**旧键一个没动**,ai_referrals.py 不受影响)→
  `tools/fleet/traffic_sources.py` 写 `data/fleet-traffic-sources.json` → demand-digest 新增「渠道构成」节。
- **纪律同 `bot_ua.txt`**:改分类只改那个 txt,然后 `python3 tools/fleet/check_ref_sources.py --sync`;
  **绝不手改 worker**。checker 挂 heartbeat,不只比字面量,还把每个 worker 里真正那段代码抠出来交给 node
  跑两个方向的用例。13 条部署自检各加一条 `by_source` 硬断言(buysomething/gamesledger 另断言
  `sum(by_source) == human_pv`)。
- **两个被测试抓出的真缺陷(上线前已修)**:裸 `includes` 把 `netflix.com` 判成 `x.com`(social);
  只做标签对齐又把 `agiscorecard.com.spam.example` 判成 fleet(引荐垃圾的常见形状)。现在是
  **标签对齐 + 尾部只许 TLD 段**,五个小站单测各有一条断言钉住这两个方向。
- **`self` 与 `fleet` 严格分开**:本域跳转是 self,兄弟站才是 fleet —— 不分开的话「兄弟站互链到底
  送来几个人」这个问题永远问不出来。`source.agiscorecard.com` 目前主域一条入链都没有,
  **但先等 `by_fleet` 读数再决定加不加,不靠猜加互链**。
- **判定线(预登记)**:`fleet-source-mix-1013`(10-13 前 ≥13 站有读数且 unattributed ≤5%,否则读侧
  退回只看 AI 引荐)、`fleet-google-channel-1013`(除 bpj 外 ≥2 站 `google.*` ≥10/28d,否则
  **Google = bpj 专属,其余站一律按 Bing 家族与 AI 引荐口径优化,永不再为 Google 改标题**)。
- **每次报告的台账从此多一行**:舰队渠道构成(search / ai / fleet / social / direct),各站 Google 数单列。

## 舰队互学矩阵:逐条量,不靠读散文(2026-09-15,owner:「我不是让你详细相互学习?」;全文 `docs/fleet-cross-learning-2026-09-15.md`)

**互相学习此前靠人读 14 份 CLAUDE.md 的散文,于是永远停在「谁看过谁的日志」。** 现在有仪器:
`tools/fleet/page_patterns.py`(每周一随 heartbeat 取数,**零新 cron**)→ `data/fleet-page-patterns.json`,
同一套判据打在 14 个站的**线上页面**上。

**⚠️ 这一节的第一版结论是错的,已作废,别再引用**:当时写「bpj 12/16 最好、agi 只有 4/16、
规则写了页面没做到」。那是**探测器词表缺陷**——按中英德词表找「最后更新」,漏掉了 agi 另外
六种语言的写法(`30 de junio de 2026` / `2026年6月30日` / `2026년 6월 30일` / `30. Juni 2026`)、
中文那行的**全角冒号**、以及德语页的**零填充 ISO**。判据已改成语言无关(页面有没有把自己声明的
`dateModified` 显示给人看),并与仓库逐文件交叉验证 **226/230 一致**。修正后的读数:

- **带日期的新鲜度标注:agi 15/16 是全舰队最好的**(仓里 230 个 html 有 197 个带可见日期行,
  8 个语言目录各 10/10),bpj 12/16、tds 6/11。**真缺口只剩 eco 5/9**(德语购买指南,读者恰恰
  在意时效)与 gridlings 0/4(游戏站,站规已定论不吃引用,优先级低)。
- **一手源外链:agi 16/16、eco 9/9(每页都有),bpj 7/16、tds 6/11。** GEO 排第一的技术(+40%)。
  bpj 的 `/tools/` 页每页都有厂商官网链接,缺的是 `/vs/` 对比页——加谁的链接是内容判断,不机械补洞。
- **面包屑:bpj 16/16,agi 3/16 → 本轮已移植完成。** 逐文件实测:agi 英文根目录 85/99 有,
  **zh 只有 10/44、de/es/fr/it/ja/ko/pt 各 0/10**,共 104 页缺。`sites/agiscorecard/tools/add_breadcrumbs.py`
  (`--check` / `--apply`)已补齐:name 取页面自己的 `<h1>`、item 取自己的 `canonical`、home 用站内既有写法,
  **一个字段不编造**;104 页各 **+1 行、0 删除、正文一字未动**,343 个 ld+json 块全部解析通过,
  `validate.py` 与 `check_hreflang.py` 均 OK。**这不算翻炒**——只加机器可读结构、渲染不变,
  与 09-04「只改 hreflang 属性、未动一字正文」同类,记录在案。防回归:`deploy-agiscorecard.yml`
  新增 `add_breadcrumbs.py --check` 门。英文根目录剩的 14 页多是 404/privacy/search/widget,不动。
- **已记录待处理的真不一致**:`zh/progress-index` 页面显示 7 月 12 日、结构化数据写 9 月 6 日。

**本轮修掉的硬缺陷(唯一一个「13 站做对、1 站做错」的)**:**bpj 的 1558 条 sitemap URL 全部 308 跳转。**
Cloudflare Pages 把 `/x.html` 308 到 `/x`,而 bpj 的 sitemap / `canonical` / `og:url` / `hreflang` / `llms.txt`
全部声明 `.html` 版本 —— **canonical 指向一个非 200 的地址**,爬虫每条多一跳,IndexNow 每次推的也是跳转地址。
抽样:bpj 6/6 重定向,另外 13 站 0/6。而它恰是页数最多、且唯一有真实 Google 引荐(157/28d)的站。
改法只动**对外声明**的四处,站内 href 与构建期路径不动。**部署时会一次性判定 1546/1558 页「内容有变」
(canonical 在每页上),lastmod 全站刷新 + IndexNow 整站推一次——这是诚实的一次性事件,别误读成老毛病。**
守卫:`tools/fleet/sitemap_guard.py` 挂 heartbeat(14 站各抽 4 条,3xx 即红)+ bpj 部署自检加硬断言。

**四个测量错误,比结论更该记住**(全部已写成 `page_patterns.py` 的自检用例):①只抽 sitemap 开头 =
把整站当成一种页面(bpj 前 16 条全是 `/vs/`,据此误判「全站零一手源」);②判外链前没剥 query,
`?utm_source=baipiaoji` 让**每一条外链都被当成站内链接**;③新鲜度词表漏了「核实于」;
④**同一个错误的更大一次:词表根本不该是判据**——8 种语言 5 种日期格式 + 全角冒号 + 零填充 ISO,
让我把 230 页里的 116 页读成「没有日期」(实际只有 4 页真缺),并给出了与事实完全相反的结论。

**因此定一条硬规矩(跨站矩阵专用)**:**任何新判据上线前,必须与仓库逐文件交叉验证一次**,
并把分歧逐条看完——「一致率 ≥95% 且分歧都能解释」才算这把尺子可用。跨站比较最容易死在
「我的尺子对 A 站有效、对 B 站无效」上,而它不会报错,只会给你一张看起来很整齐的表。
判定线:`bpj-canonical-fix-1013`(google 引荐 ≥180/28d)、`fleet-xlearn-matrix-1013`
(**基线已更正**:eco 新鲜度 ≥8/9;原记的 agi 4/16 / eco 2/9 属探测器缺陷,已作废)。

## 技能装在仓库根目录 + 外链方案(2026-09-16,owner:「整个站点可以安装技能,完善自动化外链方案」+「调研下哪些外链技能」;全文 `docs/fleet-backlinks-2026-09-16.md`)

- **技能已合并到 `.claude/skills/`,96 个,14 个站通用**(此前按站装:agi 44 / bpj 87 / eco 29 / tds 80,
  另外 10 站一个没有)。八个同名分歧的原因是 **eco 存的是旧精简版**,另三站逐字节相同,没有判断题;
  每个取最完整的一份,逐站核对**无一丢失、无一降级**,四份站内副本已删。
  线上实测四站 `.claude/skills/...` 全 404 —— **技能从未被当静态资源服务**,不是泄漏项。
  **以后新增技能只加到根目录**;别再往 `sites/<x>/.claude/` 放,那正是分歧的来源。
- **`linkbuilding` 技能的阶段判定:全舰队 14 个站都在 Foundation 阶段**(最老的 agi 首批页面 lastmod
  2026-06-30,不到 3 个月)。这直接判掉 9 个战术里的 6 个:Growth 阶段的 guest posting / resource pages /
  skyscraper / competitor backlink gap(后者还要付费工具,舰队没有),Authority 阶段的两个更远。
  **现在该做的只有两个**:①**entity stacking**(20+ 平台一致存在 + `Organization` 的 `sameAs` 串起来;
  技能称 Wikidata 是秘密武器)②**目录/注册表**。
  **`sameAs` 只有 bpj 有**,但**不许现在补** —— 每一条都必须是真实存在的档案页,舰队除 GitHub 组织与
  MCP registry 外没有已核实档案,**编一条进 schema 就是编造**。下一步在 owner 侧建档案。
- **⛔ 机器永不自动提 PR、永不发帖、永不外联**(与 Reddit 那条同级)。社区类技能
  (hacker-news-strategy / reddit-engagement / community-marketing)只能产出
  `docs/distribution-staging/` 里由 owner 手发的稿,且过反 AI 味 8 条。理由:awesome-list 维护者对批量 PR
  容忍度为零、错位提交会被拒**并烧掉首次提交机会**。机器只做**核对、去重、排队**。
- **已建 `tools/fleet/backlinks.py`(搭 heartbeat 每周一,零新 cron,只读 GET)**:
  ①**挣到的外链** = 各站 `/api/pulse` 新增的 `by_other`(既不是搜索/AI/社交/兄弟站/本站的来源域,
  即真的有别处链过来并送来了人)②**目标清单核对** `tools/fleet/backlink_targets.json`(6 个已实测
  raw README 可取的目标)③**掉链检测**(上次 present、这次不在 → warning)。
- **首读就是决定性的,记死**:**舰队 `by_other` 只有 bpj 的 1 个域 1 次访问,而且是 `com.twitter.android`;
  6 个目标列表无一收录舰队链接。** 其中 `punkpeye/awesome-mcp-servers` 手册里记着「四个 PR 已提、
  纯等合并」——今天直接取 1.7 MB 的 README 核对,**一条舰队域名都没有,即那四个 PR 至今未被合并,
  舰队零条已合并的 awesome-list 外链**。`ComposioHQ/awesome-claude-skills` 今天 raw README **404**,
  已移入 `unverified`,不当成现存目标。
- **判定线 `fleet-backlinks-1116`**:11-16 前 6 个目标 ≥2 个被收录,或 `by_other` ≥5 个域且 ≥20 次访问 →
  外链路径有效;否则记反面发现「外链对本舰队量级无效」,**停投外链**,只留零成本的 `by_other` 监测。
  基线:**0/6 个目标,1 个域 1 次访问。**

### 追查四个 MCP PR 的结果 + 顺手修掉的 MCP 身份缺陷(2026-09-16,owner:「1. 你帮我完成」)

- **四个 PR 一个都没合并**(上游 `punkpeye/awesome-mcp-servers` 的 main README 1.75 MB,舰队域名 0 处)。
  **不是内容坏了**:fork 的 `add-agiscorecard-and-verified-free-tiers` 分支仍在(200),条目完整。
- **本会话读不到 PR 的 open/closed 状态**:`api.github.com` 被出网代理 403,GitHub MCP 只覆盖已挂载的仓,
  而挂载 `punkpeye/awesome-mcp-servers` 的尝试**被权限层拒绝**(`add_repo` push 与 `ls` 克隆路径两次)。
  **没有绕过**。要读需 owner 放行该仓或自己看一眼 PR 页。
- **裁定:不催。** 该仓 PR 编号已到 **12 000+**,催一个排在万条后的 PR 是彩票不是渠道。
  **同期另一条路是活的**:官方 MCP registry 三个舰队 server 全部在架(实测)——
  `verified-ai-free-tiers` v1.10.1、`com.agiscorecard/agi-scorecard`、`hvac-btu-heat-klimaanlage`。
  **注册表活、awesome-list 死**,以后按这个优先级投。
- **修掉的真缺陷:eco 的 MCP 一个实体三个名字。** 注册表生效条目是 `hvac-btu-heat-klimaanlage`,
  另两条已标 Superseded,**但线上 worker 自报的仍是废弃名 `getecoback-raumklima`**(`worker.js:1340`,
  改名时只改了 manifest 与 `superseded/`,这一行漏了),发布流水线的健康检查也在 grep 那个废弃名。
  已改 worker 自报名为 canonical(版本对齐 1.2.0),发布健康检查**过渡期两名都认**(同一次 push 会
  同时触发 deploy 与 publish,不这样会撞竞态),并在 **eco 部署自检加了防回归断言**:
  线上自报名 ≠ `mcp/server.json` 的注册表名即红。
- **注册表搜索不索引 `websiteUrl`**(实测:搜 `baipiaoji` 返回 3 条里**没有 bpj 自己的 server**;
  搜 `getecoback` 只出那两条废弃的;搜 `agiscorecard` 命中是因为**名字里自带品牌**)。
  已把品牌写进两站 manifest 的 `description`(eco v1.2.0、bpj v1.11.0),内容属实、**不改名**
  ——再改一次名就是第四个名字。**新 MCP server 命名从此把品牌放进名字。**
- **未处理的漂移**:`sites/baipiaoji/mirror/server.json` 停在 v1.9.0(主份 v1.11.0);mirror 属另一公开仓,
  不在本会话范围,留给 owner 或有该仓范围的会话。
