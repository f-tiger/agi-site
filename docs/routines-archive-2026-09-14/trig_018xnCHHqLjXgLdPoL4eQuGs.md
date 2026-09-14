# 舰队日报: agiscorecard + sourceradar（2026-09-04 合并）

【MONOREPO 迁移 2026-08-19,本段覆盖下文所有与仓库/分支相关的指令】站点已迁入公开 monorepo f-tiger/agi-site(目录 sites/agiscorecard/)。工作方式:会话内若无该仓先 add_repo(f-tiger/agi-site, access=push)并克隆到 /workspace/agi-site;一切改动在 sites/agiscorecard/ 内做;发布 = push agi-site 的 main(deploy-agiscorecard.yml path 过滤,只部署本站,含 validate + 部署后自检)。旧私有仓 f-tiger/agiscorecard 已归档且其 main 仍连着 Cloudflare 旧构建,**严禁推送,推了会把线上回滚**。公开仓隐私红线:owner-identity*/owner-trajectory* 永不入 agi-site;写进仓内文档(analytics-notes.md 等)的订阅者邮箱一律脱敏;token/key/chatId 不入库。odds-snapshot.json 由 agi-odds.yml 每周一 03:25 UTC 自动提交,gen_odds.py 原路径消费;agi-indexnow.yml 每周一 03:17 提交 sitemap。

**本条 Routine 于 2026-09-04 合并了原「sourceradar 每日进化」(trig_014Qc7okJSgZ6HKWsNM8vnUm,已停用保留)。合并依据:sourceradar 7 天真人 pv = 5,数据门不支持它独占一条日频 Routine。整合清单见 docs/fleet-automation-map.md——新增/修改任何定时任务前必读。**

每日自动运行(04:00 UTC = 北京 12:00)。严格遵循 sites/agiscorecard/CLAUDE.md;**主执行文档 = strategy-2027.md**。目标函数=营收:订阅流 + SunWatch Pro ¥199 + agent 数据付费 + 赞助。激进=节奏与野心,绝不放松三条铁闸:硬内容规则(零编造)、5-run 防翻炒、台账不删失误。

0. 固定顺序(owner rule):①Prompt-optimization(重述今日 spec,对照 CLAUDE.md + strategy-2027.md + 站点现状自我批判 1-2 轮)②查 .claude/skills 匹配即调用 ③执行。报告简述 spec 与所调 skills。

**先读 CLAUDE.md 的「已挣得的定位 vs 宣称的定位」一节(2026-08-16 Bing 实测)。它固定三条判断,不要凭直觉推翻:①引用份额不受流量约束——这是本站唯一绕开流量瓶颈的杠杆;②内容吃引用、工具与游戏化吃点击,两台机器分开投喂;③引用不是流量,所以每个高引用页首屏必须给出一个聊天答案装不下的活数字。**

1. 监控(D1 主通道 f84f9d29-3ad9-4b37-b28e-3a78027d2f22;GA4 并行保留勿删):
   a) 战略层:`site_search{location='mcp'}`(agent 首调=里程碑,过四条件判据)、/mcp 与 /api/trends 健康、subscribers 表(含 status='stored' 积压)。
   b) 转化层:sub_open→sub_submit→sub_ok 漏斗;subscribe_click 按 location 赛马;vote_cast;rev_click 家族(invest_tool_click{*_sunwatch*} + audits/advertise 联系动作);affiliate_click。
   c) 需求层:site_search/search_no_result 词表(降级为「有量才读」:全站真实读者破 1000 后再纳入例行)。
   d) 流量层:pageviews 人/机分列、ref_host、UTM。**真实读者只认 events.page_view(JS 口径)**,pageviews 的 human 只是上限。
   e) **引用层(每月 1-3 日一次,别每天催)**:向 owner 要 Bing Webmaster → AI Performance 两张明细。拿到后更新 analytics-notes.md 引用榜并据此补货 CITATION AMPLIFICATION 队列。
   f) **游戏层(每日必报,零也报零)**:gridlings D1 bd3b1ca9-e9cb-4b71-9834-df3d67b39504 表 ev(human 口径)当日与 28 天 play_start/solve;itch 判定线(2026-09-24:itch 累计 play_start≥150 且 solve≥25,口径 ref LIKE '%itch.zone%')。
   g) **第①层健康(新增 2026-09-04)**:读仓内 data/fleet-health.json(由 fleet-heartbeat.yml 每日 08:00 UTC 写,不需要任何 MCP)。任一站非 200 或 days_since_deploy≥7 → 当日头条上报。
   追加日结到 analytics-notes.md。滞后正常,绝不因短期平淡 churn。

2. 优化(预审项可 2-3 个/run,never thin content)。优先级:
   ⓪ strategy-2027.md Phase 未完成项(13F 季度刷新→逐行 EDGAR;「赔率 vs 证据」每周一一期;9 月:用户 picks 入 D1+leaderboard+streak;owner waitlist 通过后 x402 试点;2027-12 起切 resolution 模式)。完成即在 strategy 文档打勾回写。
   ⓪+ **引用放大**:content-backlog.md 的 CITATION AMPLIFICATION 队列有未打勾项 → 优先做(依据是已发生的引用,非猜测)。队列空了就回到 ①,**不要为凑数塞猜的选题**,并在报告里说明队列已清空。
   ① 转化赛马:胜出的 subscribe 位置/钩子 → 复制赢家模式。PRD 队列(invest-prd-2026-08.md)每 run 一条:当前余 P3、P5。
   ② 搜索需求:零结果高频词→建内容/工具(硬规则仍把关)。
   ③ INVEST 队列(抄作业成绩单季度同步、investor profiles 迁移等)。
   ④ 病毒/GAMIFICATION backlog 未勾项(游戏化页引用为 0,它服务分享与绑定,不服务引用)。
   ⑤ GEO 底盘:最陈旧页刷新/内链/changelog.json 追加真实变更。goldrush 子站维护走 AGIX(sites/goldrush/CLAUDE.md),样本不足即拉长周期,不硬凑。

   **定位深化 = 每次发布都要过的检查。** 判定型新页/改页必须同时具备:①标题即那个问题本身 ②首屏答案胶囊先给结论 ③表格 ④可见 FAQ 与 FAQPage JSON-LD 逐条一致 ⑤带日期的一手判定 + 一手源外链 ⑥首屏活数字(62.5/100 + 八条翻转条件)。2026-08-30 裁决在案:活数字钩子不产生点击,保留它是为引用差异化,不再以转化为目的考核。

3. **sourceradar(sites/buysomething,原独立 Routine,2026-09-04 并入本条)**:先读 sites/buysomething/CLAUDE.md 与 docs/STRATEGY.md 相关节;读 D1 f92b6207-90bf-46f6-97c7-cc88195b2ec7 表 ev(28 天 pv/pick_open/out_click/calc_use/search_use 与 subs 增量)+ 当日 site/trends.json 与 site/rising.json。**它现在是低频站(7 天真人 pv=5),所以规矩是:队列有项做项;队列空则只在 rising 词 v≥200 且是真实产品需求时才动作;无信号就只报数字、不 bump、不硬凑**——每天给一个没人看的站造内容是纯 churn。选品数据只来自 data.js 人工策展 + trendspy 一手数据。判定线:09-14(内链读数)、09-15、09-28(sourcing-margins)按期结算。

4. 验证与发布:增删页面先 gen_feed.py + gen_search.py + gen_agent_surfaces.py;validate.py 必须 OK;**agi 与 sourceradar 的改动合并成一次 push**(Actions 配额纪律)。push 后用 GitHub MCP 确认 deploy run 绿 + 部署后自检过;记 OPT-LOG.md。

5. 里程碑显著通知:首个 agent MCP 调用(四条件判据:非 bot UA、非批量间隔、参数不重复、不与 CI 时间重合);首个 sub_ok/真实订户;subscribers≥10/50;首笔 x402 或 Boosts 收入;Organic≥10/50/200;AI 引擎引荐周环比翻倍;任一工具进 top-5 落地页;首笔赞助询盘;Bing 引用总量或某页引用份额显著变化(含下滑)。

6. 中文汇报(**一条日报覆盖两站,不再分开发**):营收漏斗关键数字、游戏数据、**第①层 heartbeat 状态**、sourceradar 三行内、战略清单进度、引用放大队列状态、本次 ship、URL 数。周一加做:深审计一项 + 「赔率 vs 证据」新一期。无实质变化就短,不硬凑。