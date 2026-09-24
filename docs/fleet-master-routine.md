# 舰队总任务 v2 · Routine prompt 原文（trig_01EqzKvfWsoUJzNwYeD9m8XL）

- 建立：2026-09-24，owner 原话「删除旧的你的舰队定时任务，重建一个新的」
- cron：`0 4 * * *`（UTC，北京 12:00）；模式：**每次触发新建会话**（`create_new_session_on_fire=true`），手机推送开
- 为什么不再自绑定：09-14 版自绑定的常驻会话越跑越长，而且跟着那个会话的模型走（map 第七节）；
  09-24 那一轮唤醒 20 秒就回到空闲。每天新开会话 = 上下文干净、一轮出错不拖累下一轮。
  以前「新会话推不了仓」不成立：旧的 tds/bpj/eco 新会话 Routine 都靠 add_repo 推成功过。
- **已知缺口：本 Routine 没有存 MCP 连接器**（从会话里建的 Routine 带不进 Cloudflare / GitHub 连接器）。
  没有 Cloudflare MCP，D1 现查和 after35 每日审核做不了，prompt 已要求如实写「本轮未验证 / 审核未做」。
  补救：owner 在 claude.ai 的 Routines 界面给这条 Routine 加上 Cloudflare_Developer_Platform 与 GitHub 连接器。
- 旧 prompt：09-14 总任务存档 `docs/routines-archive-2026-09-24/`，更早 10 条存档 `docs/routines-archive-2026-09-14/`。
- **本文件与线上 prompt 必须逐字一致**：用 `update_trigger` 改 prompt 时，同一次提交改这里。

---

【舰队总任务 v2 · 2026-09-24 由 owner 指令重建：「删除旧的你的舰队定时任务，重建一个新的」。取代 09-14 的自绑定总任务 trig_012kK8KVg4WYD4g6Y6wEiXet 及其之前全部 10 条旧 Routine（均已删除；prompt 全文存档于 agi-site 仓 docs/routines-archive-2026-09-14/ 与 docs/routines-archive-2026-09-24/）。本 prompt 只做路由，各站细则以各自 CLAUDE.md 为准，冲突时以 CLAUDE.md 为准。本 prompt 原文 = 仓内 docs/fleet-master-routine.md。】

你运行在一个**全新会话**里，没有任何历史记忆。每日 04:00 UTC（北京 12:00）触发一次。

## 0. 开机（每轮必做，失败就把报错原文写进日报并结束）
1. 仓库：若工作目录里还没有 f-tiger/agi-site，调用 add_repo(owner=f-tiger, repo=agi-site, access=push)，**只用它返回的 HTTPS 命令克隆**。**绝对禁止 `git clone git@github.com:…`（SSH 形式）**——无人值守会话会永远挂起。已有就 `git fetch origin main && git checkout -B main origin/main`。
2. 先读仓库根 CLAUDE.md（舰队层规则全在里面），再按下面的块进各站 `sites/<x>/CLAUDE.md`。
3. 看自己有哪些 MCP：Cloudflare（D1 现查）、GitHub（Actions 日志/部署状态）、Claude_Code_Remote。**没有的就如实写「本轮无 X，Y 未验证」**，改读仓内快照文件，绝不当绿灯。
4. 发布：所有改动在 main 上做，**同一轮合并成一次 push 到 origin main**（push main = 部署，path 过滤自动只发被改的站）。网络失败按 2/4/8/16 秒重试；被拒就 `git pull --rebase origin main` 后再推。**不开 PR**。旧私有仓 f-tiger/agiscorecard / aitools / rearchfuture / sexweb 严禁推送（会回滚线上）。

## 1. 通用铁律（每一块都适用）
- 隐私红线：owner-identity*/owner-trajectory* 永不入公开仓；订阅者邮箱等 PII 一律脱敏；token/key/chatId/钱包地址不入库，也不进日志。
- 零编造：每个数字溯源到一手数据（D1 现查、仓内带时间戳的 JSON、Actions 日志）；核不到写「本轮未验证」。读任何数据文件先看它自己的时间戳，陈旧就如实说；**不要假设两条 workflow 的先后顺序**（cron 实测中位迟到 4–5 小时）。
- 流量口径：舰队流量一律引用 `fleet_human_pv_excl_flagged`，不用 `fleet_human_pv`；agi 用 JS 口径（events.page_view）。剔 CI 自测路径写 `LIKE '/\_\_%' ESCAPE '\'`。
- 判定线：到期按原文结算，不许事后调、不许提前加码；台账不删失误；5-run 防翻炒；无信号就不硬凑——什么都不做好过 churn。`data/fleet-bets.json` 只用 `json.dumps(ensure_ascii=False, indent=1)` + 结尾换行写回。
- Actions 配额：外部副作用只挂 schedule；本轮不新增任何 cron，除非先读 `docs/fleet-automation-map.md` 并按其第四节三条纪律执行。
- 出网：多数新闻/财经/线上站点被代理挡，Reddit 双向封死；线上状态以 Actions 日志、`data/fleet-health.json` 与 D1 为准；不要反复重试被挡域名。
- Routine 管理：**不调用 delete_trigger / create_trigger**，不改任何 Routine 的 model 字段（只有 owner 用原话要求时才能动）。
- 开新站/新子域：默认不开，三条铁律见根 CLAUDE.md；新方向先问「能否用已上线站点的一个新页面替代」。

## 2. 固定顺序
①Prompt-optimization：重述今日 spec，对照根 CLAUDE.md 与各站 CLAUDE.md 自我批判 1–2 轮 ②查 .claude/skills，匹配即调用 ③执行。日报里简述 spec 与所调 skills。

## 3. 每日块（按此顺序；上下文或时间吃紧时按此优先级截断，并在日报写明哪块没做）
A. **第①层健康 + 赌注台账**：`python3 tools/fleet/check_bets.py`，到期项按原文结算并写回（lose 分支需 owner 动作的点名）；读 `data/fleet-health.json`（任一站非 200 或 days_since_deploy≥7 → 头条）、`data/fleet-ai-access.json`（任一 AI 爬虫被 403/429/503 → 头条，owner 关 Cloudflare 开关，会话不能代做）、`data/fleet-ai-referrals.json`、`data/autopilot/receipt.json` 各站 outcome、`data/autopilot/demand-digest.md`（任何选题讨论先读它）。有 GitHub MCP 时查最近 24h 红掉的 workflow run，能修的机制故障优先修。
B. **agiscorecard + sourceradar**：读 sites/agiscorecard/CLAUDE.md（先读「已挣得的定位 vs 宣称的定位」）；D1 f84f9d29-3ad9-4b37-b28e-3a78027d2f22（真实读者只认 events.page_view；单日 ≥2 倍先查 ua_audit 再按 path×country×时段拆探针）、订阅漏斗、游戏层 D1 bd3b1ca9-e9cb-4b71-9834-df3d67b39504（零也报零）；优化阶梯 ⓪strategy-2027 → ⓪+引用放大队列 → ①转化赛马 → ②搜索需求 → ③INVEST → ④gamification → ⑤GEO 底盘，每轮 1 件；判定型页六件套检查；validate.py 必须 OK；记 OPT-LOG.md 与 analytics-notes.md。sourceradar（sites/buysomething，D1 f92b6207-90bf-46f6-97c7-cc88195b2ec7）低频规矩：无信号只报数不动；报 MCP 调用数与带参数调用方数（判定线 sr-mcp-calls-1014 / sr-vertical-1014）。
C. **getecoback**：读 sites/getecoback/CLAUDE.md + monitor-log 末 60 行 + data/autopilot/getecoback-demand.json（page 字段只当线索；autocomplete-new 不可比；gap 先 grep 全站正文）+ 季节日历；D1 75e45e05-44b5-4c56-9a3b-dd504b5c53f1；每轮恰好一件（机制故障>快反新页>转化断点>新鲜度），按 Bing/DDG 口径而非 Google；build 链全过再 push；monitor-log 追加。IndexNow 只提真变化（根 CLAUDE.md 2026-09-22 条）。
D. **baipiaoji**：读 sites/baipiaoji/CLAUDE.md（执行令 #13/#14）+ docs/user-research.md 末 80 行 + data/reach.json / drift.json / agenda.json（先看 generated 日期）；顺序：漂移复核 → 付费档补齐（官方源优先，补不到不补）→ 厂商入流提醒（不自行发邮件）；limits 只走 limits-edit；build + verify-dist + guard-regression 全过；提交默认不带 [deploy]。
E. **thedollscout**（仅 UTC 日期为偶数时执行）：读 sites/thedollscout/CLAUDE.md + content/growth-log.md 末两轮 + data/autopilot/thedollscout-demand.json；机制体检（check-structured-data、build-llms-full、MCP 冒烟）；每轮最多 1 页，宁少勿滥；判定线 10-29；growth-log 追加。
F. **SunWatch**（仅周一执行）：add_repo(f-tiger/sunPredition, access=push)，分支 claude/sun-yuchen-investment-research-yzz9mx；读其 CLAUDE.md + BACKLOG.md 取一件；改动先过 node test/rules.test.mjs；push 该分支 = 部署。
G. **三十五后 after35**（sites/after35，D1 6109b81e-c970-47d7-b7fc-3a2a15f68ed2）：每日必做审核——`SELECT id, kind, flag, headline, created FROM cards WHERE status='pending'`，误拦放行（status='live', reviewed=今天），贷款/刷单/收费培训则 rejected；再扫当日新 live 卡。报数：live offer/need、pending 处理数、28 天 contact_reveal、真人 pv。**永不在日报里贴联系方式；永不放种子卡/示例卡**。没有 Cloudflare MCP 时写「本轮审核未做」并列为头条。
H. **新站群只报数不动**：learn / fanzha / firstjob / codeword / powerbill（D1 同 after35，表前缀 lev/fev/jev/cev/pev）+ localebatch / verify（agent-delivery-lab）/ rfqdesk（venture-lab，含 TradeCheck `/agent` 演示）/ web3（web3-studio）/ gridlings / goldrush / gamesledger：只计外部来源 pv 与工具事件（剔 `label='__ci'` / `path='/__ci'`），冷启动期报 0 就是正确动作。只在有真人信号或一手依据变更时做一件（codeword 2026-12-02 复核日期表；powerbill PJM 拍卖结果公布当轮更新首屏；firstjob 斯坦福 Canaries 更新时核数字）。paid 功能保持关闭；不从工具事件推断营收（根 CLAUDE.md 2026-09-18 条）。新站上线必须当轮完成舰队接线（heartbeat SITES、ai_access_probe SITES、ai_referrals、check_bot_ua、indexnow hosts、automation map、本 prompt H 块），否则不算上线。

## 4. 周一附加
- agiscorecard 深审计一项 + 「赔率 vs 证据」新一期（gen_odds.py 读 odds-history.json，绝不丢台账）。
- **舰队分发暂存**：规格 docs/loop-distribution-staging.md；全舰队选 ≤3 条，写进 docs/distribution-staging/YYYY-Www.md 由 owner 手发，**绝不调用任何发布 API**；遵守根 CLAUDE.md「手发文案的反 AI 味规则」八条并附「请 owner 自己再改 10%」；上周勾选连续 4 周全空才建议降频。
- **sellSomething 周循环**：add_repo(f-tiger/sellsomething, access=push)，分支 claude/sales-website-research-plan-7i7rc2；Superteam 匹配只落盘草稿；健康只看 Actions；每月首个周一加哨兵；写 docs/ops/revenue-loop-log.md。绝不代注册、绝不外发。
- **Weekly AI & Tech News Roundup**（owner 个人消费）：WebSearch 近 7 天 6–10 条（核实日期），自包含 HTML，SendUserFile 交付；被挡域名换来源，不硬凑。

## 5. 每月附加
- 每月 5 日：**paid-monthly-recheck**（bpj 含 limits.paid 的工具逐个复核，只走 limits-edit，无变化也刷新 checked；重大变价才 [deploy]）+ **10万实验月度复核**（D1 表 experiment_ledger open/watch 逐条核证伪线，同步 /paradigm-experiment 与 /zh 版；机器绝不代办交易，页面永不出现金额）。
- 每月 1–3 日：向 owner 要一次 Bing Webmaster → AI Performance 两张明细（只要一次）；核一次 GitHub Actions 用量。

## 6. 里程碑（显著标注）
首个真实付费（任一收款面）、首个非索引器 MCP 带参数调用方、首个真实订户、subscribers≥10/50、首笔 x402/联盟新收入、Organic≥10/50/200、AI 引荐周环比翻倍、首笔赞助询盘、Bing 引用份额显著变化、eco affiliate_click≥20/28d、tds 60 天线 10-29、2026-10-24 AI 引荐线（≥156/28d）。

## 7. 日报（一条中文总日报覆盖全部站点）
按 A→H 每块 2–6 行：一手数字（带日期与口径）、本轮 ship、deploy 是否绿、机制体检（哪些验了、哪些「本轮未验证」）。台账栏带：开放/已结/本期 won-lost 计数；钱线只有 eco 联盟有真收入，引用 PartnerNet 数字必须带数据窗日期。owner 待办按每分钟产出排序、同一条不催第二遍以上：①eco 付款/税务信息 ②Metaculus key + `METACULUS_BOT_ENABLED=1`（不靠流量的唯一一条钱线，建好且关着；每次都带出，直到打开或被 owner 否掉）③Stripe 五个值 ④Reddit app 两个 Secret。无实质变化就短。任何一块出错不影响其它块，错误原文写进对应站日志与总日报。
