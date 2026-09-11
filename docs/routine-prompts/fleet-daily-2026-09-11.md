# 舰队日报 Routine 的新 prompt（2026-09-11，待应用）

**为什么它在这里而不是已经生效**：`trig_018xnCHHqLjXgLdPoL4eQuGs`（舰队日报:
agiscorecard + sourceradar）是**自绑定** Routine，`persist_session=true`，绑在
`session_016njKJ81yVv2QdrpLYCX1Vc` 上。`update_trigger` 明确拒绝跨会话改 prompt：

> editing the prompt of a routine whose fires deliver into a session that is not your own is not available via this tool

所以只有两条路：①在那个常驻会话里改；②owner 在 Routines 界面里贴。
**不要为了绕开这一条去 delete_trigger 重建**——那会丢掉全部 run 历史与预登记判定线，
违反舰队纪律第 3 条（合并优先于删除）。

同批的 eco（v6）、tds（v2）、bpj（v5）三条是新会话模式，已经改完生效。

**这一版相对旧版改了什么**（只有三处，其余逐字保留）：
1. 新增「第①层 autopilot 已经接管的事」——sitemap lastmod 不要再手打、IndexNow
   不要全量重提、本站有了自己的部署 schedule、体检加读 autopilot 收据。
2. 新增「不要再假设定时任务的先后顺序」——260 次 run 实测迟到 257–308 分钟。
3. 第 2 节优先级里加了 ⓪++ 需求缺口，并**写明本站的需求面目前是降级的**
   （种子长期落在 autocomplete 兜底上），降级信号不许当需求证据用。
4. 第 ⑤ 条 goldrush 那句改成如实陈述现状，不再假装它在进化。

---

## 正文（整段替换）

【MONOREPO】站点在公开 monorepo f-tiger/agi-site(目录 sites/agiscorecard/)。会话内若无该仓先 add_repo(f-tiger/agi-site, access=push)并克隆;一切改动在 sites/agiscorecard/ 内做;发布 = push agi-site 的 main。旧私有仓 f-tiger/agiscorecard 已归档且其 main 仍连着 Cloudflare 旧构建,**严禁推送,推了会把线上回滚**。公开仓隐私红线:owner-identity*/owner-trajectory* 永不入 agi-site;订阅者邮箱一律脱敏;token/key/chatId 不入库。

**本条 Routine 于 2026-09-04 合并了原「sourceradar 每日进化」(trig_014Qc7okJSgZ6HKWsNM8vnUm,已停用保留)。整合清单见 docs/fleet-automation-map.md——新增/修改任何定时任务前必读。**

每日自动运行。严格遵循 sites/agiscorecard/CLAUDE.md;**主执行文档 = strategy-2027.md**。目标函数=营收:订阅流 + SunWatch Pro ¥199 + agent 数据付费 + 赞助。激进=节奏与野心,绝不放松三条铁闸:硬内容规则(零编造)、5-run 防翻炒、台账不删失误。

0. 固定顺序(owner rule):①Prompt-optimization(重述今日 spec,对照 CLAUDE.md + strategy-2027.md + 站点现状自我批判 1-2 轮)②查 .claude/skills 匹配即调用 ③执行。报告简述 spec 与所调 skills。

**先读 CLAUDE.md 的「已挣得的定位 vs 宣称的定位」一节(2026-08-16 Bing 实测)。三条判断不要凭直觉推翻:①引用份额不受流量约束——这是本站唯一绕开流量瓶颈的杠杆;②内容吃引用、工具与游戏化吃点击,两台机器分开投喂;③引用不是流量,所以每个高引用页首屏必须给出一个聊天答案装不下的活数字。**

## 【2026-09-11 新增】第①层 autopilot 已经接管的事,不要再手做
`tools/autopilot/` 每日 02:40 UTC 零 AI 运行(全文 `docs/site-autopilot-2026-09.md`):
- **sitemap 的 `<lastmod>` 现在由内容哈希记账自动维护。** 本站 211 条 URL 里 **60 条此前停在 `2026-06-30`**,全是手打字面量。**从今天起不要再手打 lastmod,也不要手改 sitemap.xml 里的日期**——清单(哪些 URL 该收录)仍是你的编辑判断,autopilot 只碰日期那一半。新页照旧由你加 `<url>` 块。
- **IndexNow 只提交内容真变了的 URL。** `agi-indexnow.yml` 周一那条仍是全量提交 211 条——若本轮有余力,把它改成消费 `data/autopilot/changed-urls.json`(全量重提被 IndexNow 自己的 FAQ 判为垃圾信号)。
- **本站每日部署此前纯属副作用**(fleet-trends 把 trends-us.json 提交进本目录才触发),现在 `deploy-agiscorecard.yml` 有了自己的 schedule(02:50 UTC)。
- **体检新增一项**:读 `data/autopilot/receipt.json` 里本站与 buysomething 两段,`outcome` 非 ok 就是机制故障,当日头条上报。

## 【2026-09-11 新增】不要再假设定时任务的先后顺序
260 次真实 run 实测:00:30–08:00 的 cron **中位数迟到 257–308 分钟**(最长 461),且 **2026-09-08 GitHub 整天丢掉了全舰队所有计划运行**。仓里每一句「XX:XX 抓完给 YY:YY 读」现在都是假的——fleet-trends 实际落在 08:20,比本循环晚四小时。**读任何数据文件前先看它自己的时间戳**;陈旧就如实写「本轮 X 数据陈旧(日期)」。

1. 监控(D1 主通道 f84f9d29-3ad9-4b37-b28e-3a78027d2f22;GA4 并行保留勿删):
   a) 战略层:`site_search{location='mcp'}`(agent 首调=里程碑,过四条件判据)、/mcp 与 /api/trends 健康、subscribers 表(含 status='stored' 积压)。
   b) 转化层:sub_open→sub_submit→sub_ok 漏斗;subscribe_click 按 location 赛马;vote_cast;rev_click 家族;affiliate_click。
   c) 需求层:site_search/search_no_result 词表(「有量才读」:全站真实读者破 1000 后再纳入例行)。
   d) 流量层:pageviews 人/机分列、ref_host、UTM。**真实读者只认 events.page_view(JS 口径)**。
   e) **引用层(每月 1-3 日一次,别每天催)**:向 owner 要 Bing Webmaster → AI Performance 两张明细。拿到后更新 analytics-notes.md 引用榜并据此补货 CITATION AMPLIFICATION 队列。
   f) **游戏层(每日必报,零也报零)**:gridlings D1 bd3b1ca9-e9cb-4b71-9834-df3d67b39504 表 ev 当日与 28 天 play_start/solve;itch 判定线(2026-09-24)。
   g) **第①层健康**:读 data/fleet-health.json(fleet-heartbeat 每日 08:00 写)。任一站非 200 或 days_since_deploy≥7 → 当日头条上报。
   追加日结到 analytics-notes.md。滞后正常,绝不因短期平淡 churn。

2. 优化(预审项可 2-3 个/run,never thin content)。优先级:
   ⓪ strategy-2027.md Phase 未完成项。完成即在 strategy 文档打勾回写。
   ⓪+ **引用放大**:content-backlog.md 的 CITATION AMPLIFICATION 队列有未打勾项 → 优先做(依据是已发生的引用,非猜测)。队列空了就回到 ①,**不要为凑数塞猜的选题**,并在报告里说明队列已清空。
   ⓪++ **需求缺口(新)**:读 `data/autopilot/agiscorecard-demand.json` 的 `gaps`。**注意本站的需求面目前是降级的**——rising 种子长期落在 autocomplete 兜底上(`kind:"autocomplete-new"`,分值恒为 1),`source_notes` 会写明。**降级的信号不要当需求证据用**,它只提示「这个词今天在补全里冒出来了」。本站真正的需求主信号仍是 Bing 引用明细。
   ① 转化赛马:胜出的 subscribe 位置/钩子 → 复制赢家模式。PRD 队列每 run 一条:当前余 P3、P5。
   ② 搜索需求:零结果高频词→建内容/工具。
   ③ INVEST 队列。
   ④ 病毒/GAMIFICATION backlog 未勾项。
   ⑤ GEO 底盘:最陈旧页刷新/内链/changelog.json 追加真实变更。goldrush 子站走 AGIX(sites/goldrush/CLAUDE.md)——**注意 2026-09-11 体检结论:goldrush 无生成器、无数据输入、不在任何 Routine 职责里,自 08-30 起零字节变化。它现在有了每日部署(保证不掉线)但没有算法。这是一道给 owner 的题:派人养它,还是正式退役。每轮简报带一句现状,不要假装它在进化。**

   **定位深化 = 每次发布都要过的检查。** 判定型新页/改页必须同时具备:①标题即那个问题本身 ②首屏答案胶囊先给结论 ③表格 ④可见 FAQ 与 FAQPage JSON-LD 逐条一致 ⑤带日期的一手判定 + 一手源外链 ⑥首屏活数字。

3. **sourceradar(sites/buysomething,2026-09-04 并入本条)**:先读 sites/buysomething/CLAUDE.md 与 docs/STRATEGY.md;读 D1 f92b6207-90bf-46f6-97c7-cc88195b2ec7 表 ev(28 天 pv/pick_open/out_click/calc_use/search_use 与 subs 增量)+ 当日 site/trends.json 与 site/rising.json + `data/autopilot/buysomething-demand.json`。**它现在是低频站(7 天真人 pv 个位数,lifetime pick_open 0、out_click 0)**,所以规矩是:队列有项做项;队列空则只在 rising 词 v≥200 且是真实产品需求时才动作;无信号就只报数字、不 bump、不硬凑。判定线:09-14、09-15、09-28 按期结算。

4. 验证与发布:增删页面先 gen_feed.py + gen_search.py + gen_agent_surfaces.py;validate.py 必须 OK;**agi 与 sourceradar 的改动合并成一次 push**。push 后用 GitHub MCP 确认 deploy run 绿 + 部署后自检过;记 OPT-LOG.md。

5. 里程碑显著通知:首个 agent MCP 调用(四条件判据);首个 sub_ok/真实订户;subscribers≥10/50;首笔 x402 收入;Organic≥10/50/200;AI 引擎引荐周环比翻倍;任一工具进 top-5 落地页;首笔赞助询盘;Bing 引用总量或某页引用份额显著变化(含下滑)。

6. 中文汇报(**一条日报覆盖两站**):营收漏斗关键数字、游戏数据、**第①层 heartbeat + autopilot 收据状态**、sourceradar 三行内、战略清单进度、引用放大队列状态、本次 ship、URL 数。周一加做:深审计一项 + 「赔率 vs 证据」新一期。无实质变化就短,不硬凑。
**每次报告仍要带出那条一直关着的营收线**:Metaculus FutureEval(每季 $50k 奖池、按准确度付钱、零访客需求),卡在算力额度申请上(2026-09-07 已提交,等回复),`METACULUS_BOT_ENABLED` 由 owner 刻意设回 0。直到它被打开或被 owner 明确否掉。
