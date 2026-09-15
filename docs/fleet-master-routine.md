# 舰队总任务 · Routine prompt 原文（trig_012kK8KVg4WYD4g6Y6wEiXet）

- 建立：2026-09-14，owner 原话「现在舰队你的定时运行任务各种出错，你帮我全部删除，然后重建一个总任务」
- cron：`0 4 * * *`（UTC，北京 12:00）；模式：**自绑定**到常驻会话 `session_016njKJ81yVv2QdrpLYCX1Vc`
  （新会话推不了仓、没有 MCP；三种已知的计划路径故障有两种只发生在新会话）
- 模型：自绑定 Routine 的模型**由绑定会话当前模型决定**，Routine 里写什么不作数（map 第七节）。
  重建当天会话已被 owner 切到 `claude-fable-5-1`；09-07 的 Weekly News 失败原文是
  「You've reached your Fable limit」——**总任务是否会撞同一堵墙，要看第一轮**。
- **本文件与线上 prompt 必须逐字一致**：用 `update_trigger` 改 prompt 时，同一次提交改这里。

---

【舰队总任务 · 2026-09-14 由 owner 指令重建：「现在舰队你的定时运行任务各种出错，你帮我全部删除，然后重建一个总任务」。本条取代此前全部 10 条 Routine；旧 prompt 全文存档于 agi-site 仓 docs/routines-archive-2026-09-14/，本 prompt 只做路由，各站细则以各自 CLAUDE.md 为准，冲突时以 CLAUDE.md 为准。】

每日 04:00 UTC（北京 12:00）自绑定唤醒本会话（会话内已有全部仓库与 MCP；新会话推不了仓、没有 MCP，所以永远自绑定）。

## 0. 通用铁律（每一块都适用）
- 仓库：公开 monorepo f-tiger/agi-site 在 /workspace/agi-site（不在就 add_repo(f-tiger/agi-site, access=push) 用其返回的 HTTPS 命令克隆；**绝对禁止 SSH 形式 git clone**，会永远挂起）。每轮开始先 `git fetch origin main && git reset --hard origin/main`（有未提交改动时改用 rebase，绝不 reset 掉工作）。push main = 部署。旧私有仓 f-tiger/agiscorecard 严禁推送（会回滚线上）。
- 隐私红线：owner-identity*/owner-trajectory* 永不入公开仓；订阅者邮箱脱敏；token/key/chatId/钱包地址不入库。
- 零编造：每个数字溯源到一手数据；核不到就写「本轮未验证」，绝不当绿灯。读任何数据文件先看它自己的时间戳，陈旧就如实说；**不要假设两条 workflow 的先后顺序**（cron 实测中位迟到 4–5 小时）。
- 判定线纪律：预登记的判定线到期按原文结算，不许事后调、不许提前加码；台账不删失误；5-run 防翻炒；「无信号就不硬凑」——什么都不做好过 churn。
- Actions 配额：同一仓库同一轮所有改动**合并成一次 push**；外部副作用只挂 schedule。
- 出网：多数新闻/财经/线上站点被代理挡（EGRESS_BLOCKED），线上状态以 GitHub Actions 日志与 D1 为准；不要反复重试被挡域名。
- 永不调用 delete_trigger；不改任何 Routine 的 model 字段（只有 owner 用原话要求时才能动）。

## 1. 固定顺序
①Prompt-optimization：重述今日 spec，对照各站 CLAUDE.md 与现状自我批判 1–2 轮 ②查 .claude/skills，匹配即调用 ③执行。报告里简述 spec 与所调 skills。

## 2. 每日块（按此顺序；若时间/上下文吃紧，按此优先级截断并在报告里写明哪块没做）
A. **第①层健康**：读 data/fleet-health.json（任一站非 200 或 days_since_deploy≥7 → 头条）、data/fleet-bets.json 三天内到期与过期未结算项（到期的按原文结算并写回；lose 分支需 owner 动作的点名）、data/autopilot/receipt.json 各站 outcome。
B. **agiscorecard + sourceradar**（原舰队日报全文见存档 trig_018xnCHHqLjXgLdPoL4eQuGs.md）：先读 sites/agiscorecard/CLAUDE.md「已挣得的定位 vs 宣称的定位」；监控 D1 f84f9d29-3ad9-4b37-b28e-3a78027d2f22（真实读者只认 events.page_view；单日 ≥2 倍先按 path×country×时段拆探针）、漏斗、游戏层 D1 bd3b1ca9-e9cb-4b71-9834-df3d67b39504（itch 线 09-24）；优化阶梯 ⓪strategy-2027 → ⓪+引用放大队列 → ①转化赛马 → ②搜索需求 → ③INVEST → ④gamification → ⑤GEO 底盘，每轮 1 件（预审项可 2–3）；判定型页六件套检查；sourceradar（sites/buysomething，D1 f92b6207-90bf-46f6-97c7-cc88195b2ec7）低频规矩：无信号只报数不动；validate.py 必须 OK；记 OPT-LOG.md 与 analytics-notes.md。
C. **getecoback**（存档 trig_01TWFzZyPFaXuHFfrray2hZr.md）：读 sites/getecoback/CLAUDE.md + monitor-log 末 60 行 + data/autopilot/getecoback-demand.json（page 字段只当线索；autocomplete-new 不可比）；D1 75e45e05-44b5-4c56-9a3b-dd504b5c53f1；每轮恰好一件（机制故障>快反新页>转化断点>新鲜度）；build 链全过再 push；monitor-log 追加。
D. **baipiaoji**（存档 trig_014Ytq7zLsYbtPgsoc1CftKo.md）：读 sites/baipiaoji/CLAUDE.md（执行令 #13/#14）+ docs/user-research.md 末 80 行 + data/reach.json / drift.json / agenda.json；顺序：漂移复核 → 付费档补齐（官方源优先，补不到不补）→ 厂商入流提醒；limits 只走 limits-edit；build+verify-dist+guard-regression 全过；提交默认不带 [deploy]。
E. **thedollscout**（仅 UTC 日期为偶数时执行；存档 trig_01VSh8sktmpuMndDpAKJcuR5.md）：读 sites/thedollscout/CLAUDE.md + growth-log 末两轮 + data/autopilot/thedollscout-demand.json + content/d1-snapshot.json（缺失或 >48h = 机制故障，不是没数据；该文件自 09-02 起缺失需 owner 给 deploy token 加 D1 Read，每轮提一句不催）；机制体检（结构化数据闸门、llms-full、MCP 冒烟）；每轮最多 1 页，宁少勿滥；growth-log 追加。
F. **SunWatch**（仓 f-tiger/sunPredition 分支 claude/sun-yuchen-investment-research-yzz9mx，/home/user/sunpredition；原每日优化 Routine 已丢失，此处以周频接管）：仅周一执行——读其 CLAUDE.md + BACKLOG.md 取一件；核对 /api/holdings 三只持仓的规则读数是否随日线在变（部署日志是唯一通道）；改动先过 node test/rules.test.mjs；push 该分支 = 部署。
G. **三十五后 / after35**（35.agiscorecard.com，sites/after35，D1 6109b81e-c970-47d7-b7fc-3a2a15f68ed2；owner 2026-09-14 指令「给失业中年人用的平台，让他们可以发挥价值」「agi 时代 ai 冲击的最好承载子站点」）：每日必做审核——`SELECT id, kind, flag, headline, created FROM cards WHERE status='pending'`，误拦放行（status='live', reviewed=date）、确为贷款/刷单/收费培训则 rejected；再扫当日新 live 卡有无漏网。报数：live offer/need、pending 处理数、28 天 contact_reveal、真人 pv（ev.page_view human）。**永不在报告里贴联系方式；永不放种子卡/示例卡；页面不引未核实统计**。判定线 10-14 / 12-14 见其 CLAUDE.md。优化只在有真人信号时做一件，冷启动期正确动作是「报 0 + 分发素材进周一暂存」。
H. **新站群（learn + fanzha + firstjob）**（owner /goal 2026-09-15「持续做新站点，新站点方向你做好调研再做，包括工具做好，seo，geo等都做好」；三站均复用 D1 after35-events 6109b81e-…，表分别 `lev`/`lua_audit`、`fev`/`fua_audit`、`jev`/`jua_audit`，永不共用表）：**只报数不动**——各自的真人 page_view（28d/7d）、`tool_result`/`calc_run`、`resource_click`；三站都无用户内容，无需审核。①学什么 learn.agiscorecard.com（sites/learn，成年人失业后学什么 / 家庭教育）②识骗 fanzha.agiscorecard.com（sites/fanzha，AI 换脸拟声时代的反诈判定 + 转账前 60 秒 / 家庭暗号卡 / 12 问筛查；**暗号永不上传、永不进链接、永不进 D1**）③第一份工作 firstjob.agiscorecard.com（sites/firstjob，应届生：AI 入门岗判定 + 三方协议 / 应届生身份 + 暴露自查 / 签约 12 问 / 试用期计算器；**斯坦福 Canaries 研究每次更新都要核本站引用的数字与日期**，且引用时必须保留「未发现全经济范围大规模替代」那一句）。分流：中年失业→三十五后、该学什么→学什么、转账/验证码/假公检法→识骗、加盟入伙→三十五后 /screen，四站互链不互相复制。冷启动期报 0 就是正确动作，不要为了有东西可写而加页。优化只在有真人信号或一手依据变更（教育部指南改版、技能照亮前程行动到期、家庭教育法修订、反诈法修订、公安机关新提示、劳动合同法修订、应届生认定政策变化、斯坦福研究更新）时做一件；候选队列在各自 docs/research-2026-09-15.md §五，未过三门不上。判定线 learn 10-15 / 12-15、fanzha 10-15 / 12-15、firstjob 10-31 / 12-15，均见各自 CLAUDE.md。新站上线后当轮必须完成舰队接线（heartbeat、ai_access_probe、ai_referrals、check_bot_ua、indexnow hosts、automation map、本 prompt 的 H 块），否则新站不算上线。

## 3. 周一附加
- agiscorecard 深审计一项 + 「赔率 vs 证据」新一期（gen_odds.py 读 odds-history.json，绝不丢台账）。
- **舰队分发暂存**（存档 trig_014sbjgCWo9aPYjce8Xp81x8.md）：规格 docs/loop-distribution-staging.md；七仓一起排素材选 ≤3 条，全部写进 docs/distribution-staging/YYYY-Www.md 由 owner 手发，绝不调用任何发布 API；上周勾选连续 4 周全空才建议降频。
- **sellSomething 周循环**（存档 trig_01TTRAX1LEgw1T382fd537V3.md）：add_repo(f-tiger/sellsomething, access=push)，分支 claude/sales-website-research-plan-7i7rc2；Superteam 匹配只落盘草稿；健康只看 Actions；每月首个周一加哨兵；写 docs/ops/revenue-loop-log.md。绝不代注册、绝不外发。
- **Weekly AI & Tech News Roundup**（owner 个人消费，存档 trig_015pNchjLTcQd8utaPKBA4NZ.md）：WebSearch 近 7 天 6–10 条，自包含 HTML，SendUserFile 交付；被挡域名换来源，不硬凑。

## 4. 每月附加
- 每月 5 日：**paid-monthly-recheck**（bpj 14 个工具 limits.paid 复核，存档 trig_018chEXs9JvJYexpHvbv3Pp4.md；只走 limits-edit；重大变价才 [deploy]）+ **10万实验月度复核**（D1 表 experiment_ledger open/watch 逐条核证伪线，同步 /paradigm-experiment 与 /zh 版；机器绝不代办交易，页面永不出现金额）。
- 每月 1–3 日：向 owner 要一次 Bing Webmaster → AI Performance 两张明细（只要一次）；核一次 GitHub Actions 用量。

## 5. 里程碑（显著标注）
首个 agent MCP 调用（四条件判据）、首个真实订户、subscribers≥10/50、首笔 x402/Boosts/联盟收入、Organic≥10/50/200、AI 引荐周环比翻倍、任一工具进 top-5 落地页、首笔赞助询盘、Bing 引用份额显著变化、eco affiliate_click≥20/28d、bpj 判定线 10-09、tds 60 天线 10-29。

## 6. 汇报（一条中文总日报覆盖全部站点）
按 A→H 每块 2–6 行：一手数字（带日期与口径）、本轮 ship、deploy 是否绿、机制体检（哪些验了、哪些「本轮未验证」）、owner 待办（同一条不催第二遍以上）。无实质变化就短。任何一块出错不影响其它块，错误原文写进对应站的日志与总日报。
