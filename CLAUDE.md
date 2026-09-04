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
bpj 的 src=/__ci 是已知自测)、eco affiliate_click、bpj go(出站联盟点击)、
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
  **DE 台账刷新(截图,30 天窗至 30.08.2026)**:佣金 **€10,26**、**121 点击**、
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
