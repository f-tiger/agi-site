# 舰队总任务 · Routine prompt 原文(v2,trig_011SpfuZB2Lc2aDYp1F9qSLz)

- 重建:2026-09-27,owner 原话「重建每天的定时任务」,随后补充「你要避免每天任务无法读取agi-site仓库，从而执行发布」。
- cron:`51 3 * * *`(UTC,北京 11:51;整点前 9 分钟错峰);首次计划运行 2026-09-28 03:51 UTC;环境 `env_01JrsBKe3iuN8rnj1vjSWeZe`。
- **模式:每天唤醒一个专用常驻会话** `session_013QnV88GEwyxxdXDZCZKsUr`,标题「舰队总任务 · 每日常驻会话(勿归档)」。
  这个会话是用 `create_session(source_url=https://github.com/f-tiger/agi-site)` 建的,仓库是会话本身的 source:
  每次容器被回收后重新启动,都会先按 `main` 重新克隆 agi-site,不依赖 add_repo、不依赖会话里的旧工作区。
  **请勿归档这个会话**——归档后 Routine 会失效(v1 就是这样死的),但 heartbeat 会在 50 小时内打红(见下)。
- **为什么是这个设计(09-27 当天三次实测,别再重试前两种)**:
  1. v1(`trig_012kK8KVg4WYD4g6Y6wEiXet`,2026-09-14)自绑定在对话会话 `session_016njKJ81yVv2QdrpLYCX1Vc`,该会话 09-15 被归档,总任务随之失效;
     09-27 查时 v1 与 09-14 存档的 10 条旧 Routine `get_trigger` 均 not found。**09-15 → 09-27 没有任何每日循环在跑,也没有任何东西发现。**
  2. 09-24 另有一个会话建过新会话版 `trig_01EqzKvfWsoUJzNwYeD9m8XL`,它的记录只在未合并的分支 `claude/fleet-scheduled-task-rebuild-4c0law` 上,
     main 上没有它推过的任何提交;09-27 查时这条 Routine 也已不存在。
  3. 09-27 先建的新会话版 `trig_01PXhZ3uG6CcJqiCviAVXAGF`(`create_new_session_on_fire`)手动触发实测:平台存储的配置是 `sources: []`、无 connector,
     触发出的会话**不带 agi-site**,一个提交都没推出来。**从会话里建的「每次开新会话」Routine 拿不到仓库**。已 `enabled=false` 并改名留痕(未删除)。
  4. 同日用 source_url 建的专用会话实测:**30 秒内读到仓库、`push --dry-run` 通过、把 `data/fleet-master-run.json` 推上 main(commit `3c64ef50`)**。
     v2 的 Routine 就绑在这个会话上。
- **仓库访问的三道保险**:①会话自带 agi-site 克隆;prompt 第 0 节再给出获取顺序(现有克隆 → add_repo HTTPS → 推送前置检查 → 代理诊断 → GitHub MCP 兜底写 main
  → 分支 + PR 合入);②每轮在同一次 push 里给 `data/fleet-master-run.json` 追加运行记录;③heartbeat 的 `tools/fleet/check_master_run.py`:
  50 小时无新记录或连续两轮 `repo_ok=false` → heartbeat 红 → GitHub 失败邮件(唯一不依赖 AI 会话的告警)。会话被归档、Routine 消失、
  平台挂起(`suspension_reason`)都表现为「没有新记录」,同一道闸都能抓到。
- **已知限制**:Routine 与会话都不带 connector(平台返回 `mcp_connections: []`),所以每日会话**没有 Cloudflare MCP**:
  G 块(after35 待审卡片)与每月 10 万实验复核读不到 D1,prompt 要求如实写「未做」。要补,owner 在 claude.ai 的 Routines 界面
  给这条 Routine 加上 Cloudflare connector,或在那里新建一条选好仓库与 connector 的 Routine 并把本 prompt 贴进去(然后把本条停用)。
  **站点发布本身不依赖本任务**:各站定时部署与 heartbeat 7 天重发都在第①层。
- 模型:用会话的模型;会话侧不改 Routine 的 model 字段。
- **本文件与线上 prompt 必须逐字一致**:用 `update_trigger` 改 prompt 时,同一次提交改这里。

---

【舰队总任务 v2 · 每日 · 2026-09-27 由 owner 指令「重建每天的定时任务」重建】
v1(2026-09-14)自绑定的常驻会话 09-15 被归档后失效;09-24 另建的新会话版 Routine 从未推出过一个提交,也已不存在;09-27 实测:从会话里建的「每次开新会话」Routine 不带仓库、不带连接器,触发出的会话拿不到 agi-site。
所以 v2 每天唤醒**本会话**——它启动时就带着 f-tiger/agi-site(09-27 14:09 实测:30 秒内读到仓库并推上 main,commit 3c64ef50)。本 prompt 只做路由,各站细则以各自 CLAUDE.md 为准,冲突时以 CLAUDE.md 为准。存档与设计理由:agi-site 仓 docs/fleet-master-routine.md、docs/fleet-automation-map.md 第十一节。

每天被唤醒时,把本条当作全新的一轮:不依赖昨天的记忆(上下文会被自动摘要),一切以本 prompt、仓库文件与当天的一手数据为准。你可能没有 Cloudflare MCP。

## 0. 拿到仓库并确认能发布(最先做,做完才进下一步)
owner 2026-09-27 原话:「你要避免每天任务无法读取agi-site仓库，从而执行发布」。按下面顺序,前一步成功就停:
1. 本会话启动时已带 agi-site 克隆(`git remote -v` 指向 f-tiger/agi-site)→ 直接用;先 `git status`,有上一轮遗留的未提交改动就先看清楚再处理,绝不 reset 掉工作。
2. add_repo(owner=f-tiger, repo=agi-site, access=push),**只用它返回的 HTTPS 克隆命令**;失败按 2/4/8/16 秒退避重试 4 次。**绝对禁止 `git clone git@github.com:…`(SSH)**——无人值守会话会因权限提示永远挂起(09-04 实测卡死 6 小时)。
3. 克隆成功后**立刻**做推送前置检查:`git fetch origin main && git checkout -B main origin/main && git push --dry-run origin HEAD:main`。
4. 第 2 或第 3 步失败:跑 `curl -sS "$HTTPS_PROXY/__agentproxy/status"`,并用 read_documentation(topic=github.access, situation=blocked) 读原因,把两者原文写进日报头条。
5. **兜底发布通道**:克隆或推送不可用、但 GitHub MCP 工具可用(用 ToolSearch 查 `mcp__github__`)→ 用 get_file_contents 读需要的文件,用 push_files 往 f-tiger/agi-site 的 main 写本轮**必要的小改动**(台账结算、日志追加、运行记录);大改动不走兜底,留给下一轮并在日报写明。
6. push main 被分支策略拒绝时:推 `claude/daily-YYYYMMDD`,再用 GitHub MCP create_pull_request + merge_pull_request 合入 main(owner 已授权本每日任务发布)。
7. 全部失败:A 块照样用能读到的东西做(GitHub MCP 只读也行),日报第一行写「本轮拿不到 agi-site:<原因>」。站点不会因此停更:各站定时部署与 heartbeat 的 7 天重发都在第①层,已提交的内容照常上线。

## 1. 通用铁律(每一块都适用)
- 开工基于 origin/main 工作。push agi-site 的 main = 部署;全部改动**合成一次 push**(网络失败按 2/4/8/16 秒退避,冲突 fetch + rebase,绝不 force)。bpj 的提交默认不带 [deploy](次日定时部署带上线),只有数据错误修复/重大变价/新判定页才加。旧私有仓(f-tiger/agiscorecard、aitools、rearchfuture、sexweb)严禁推送。
- 隐私红线:owner-identity*/owner-trajectory* 永不入公开仓;订阅者/用户邮箱一律脱敏;token/key/chatId/钱包地址不入库。
- 零编造:每个数字溯源到一手数据并带日期与口径;核不到写「本轮未验证」,绝不当绿灯。读数据文件先看它自己的 generated 时间戳,陈旧就如实说。不要假设两条 workflow 的先后(GitHub cron 实测中位迟到 4–5 小时)。
- **D1 读预算(09-24/25/26 连续三天把全账号每日 500 万行读额度用光,见 docs/d1-read-budget-2026-09-26.md)**:优先读已提交的快照(data/fleet-*.json、各站 data/reach.json 等);**不轮询、不反复 curl** /api/pulse、/api/reach、/api/trends;有 Cloudflare MCP 时只跑按日期窗口过滤、走索引的小查询,绝不整表扫描。
- 判定线纪律:data/fleet-bets.json 是唯一台账;到期按原文结算(status + settled + reading),不许事后改阈值、不许提前加码;写台账一律 `json.dumps(ensure_ascii=False, indent=1)` + 结尾换行;新判定线必须同时进台账,且先拿当天读数试一遍,能被 t0 满足的线不算赌注。
- 三门(数据/需求/商业)、防翻炒(近 5 次改过的页不动)、「无信号就不硬凑」——什么都不做好过 churn。
- 机器永不发帖、永不外联、永不给第三方仓提 PR;分发类产出只写进 docs/distribution-staging/ 由 owner 手发,并过根 CLAUDE.md 的反 AI 味 8 条。
- 永不调用 delete_trigger,不改任何 Routine 的 model 字段(只有 owner 原话要求才能动)。
- 出网:多数外站被代理挡,线上状态以 GitHub Actions 日志与已提交快照为准,被挡域名不反复重试。

## 2. 固定顺序
①Prompt-optimization:重述今日 spec,对照各站 CLAUDE.md 与现状自我批判 1–2 轮;②查仓库根 .claude/skills,匹配即调用;③执行。日报里用一句话写 spec 与所调 skills。

## 3. 每日块(按此顺序;时间或上下文吃紧时按此优先级截断,并在日报里写明哪块没做)
A. **第①层健康与台账**(零写入也要做):
   - data/fleet-health.json:任一站非 200 或 days_since_deploy ≥7 → 头条。
   - `python3 tools/fleet/check_bets.py`:三天内到期与过期未结算项;到期的按原文结算并写回;lose 分支需 owner 动作的点名。
   - data/autopilot/receipt.json、data/autopilot/demand-digest.md(任何选题讨论先读它)。
   - 钱线与仪表:data/fleet-money.json(各站 money + owner 亲报 PartnerNet,带数据窗)、data/fleet-forecast-record.json(Metaculus bot:enabled_state / 账本条数 / 北极星 / 花费 / 净美元)、data/fleet-ai-referrals.json、data/fleet-traffic-sources.json、data/fleet-mcp-usage.json、data/fleet-d1-budget.json(若存在)。快照 >3 天未更新 = 仪器故障,写进头条。
   - **Metaculus 线**:enabled_state 为 never 时,日报第一行写「差 owner 的模型 key + METACULUS_BOT_ENABLED=1」(同一句每天只写一次,不加催促);为 live 时报账本条数、北极星、30 天花费;为 stalled 时查最近一次 metaculus-bot 运行日志。
B. **agiscorecard + sourceradar**:先读 sites/agiscorecard/CLAUDE.md 与根 CLAUDE.md 中 agi 相关节;真实读者只认 JS 口径;优化阶梯与判定型页六件套按站内手册;sourceradar(sites/buysomething)低频规矩:无信号只报数不动;validate.py 必须 OK;记 OPT-LOG.md 与 analytics-notes.md。
C. **getecoback**:读 sites/getecoback/CLAUDE.md + monitor-log 末 60 行 + data/autopilot/getecoback-demand.json(page 字段只当线索)+ 季节日历;每轮恰好一件(机制故障 > 快反新页 > 转化断点 > 新鲜度);build 链全过再 push;monitor-log 追加。
D. **baipiaoji**:读 sites/baipiaoji/CLAUDE.md(执行令 #13 以后各条,含第 28、29 条与「厂商认领层」节)+ docs/user-research.md 末 80 行 + data/reach.json / drift.json / pricing-probe.json / claims.json;顺序:漂移复核 → 付费档补齐(官方源优先,补不到不补)→ 厂商认领队列(data/claims.json 的 attestations,逐条打开 official_url 核对,对的走 limits-edit 两步,厂商 value 永不直接进 tools.json)→ 厂商投稿提醒(submissions.new >0 时提醒 owner 手发回复)。limits 只走 scripts/limits-edit.mjs;build + verify-dist + guard-regression 全过;docs/user-research.md 追加本轮记录。
E. **thedollscout**(仅 UTC 日期为偶数时执行):读 sites/thedollscout/CLAUDE.md + growth-log 末两轮 + data/autopilot/thedollscout-demand.json;机制体检(结构化数据闸门、llms-full、MCP 冒烟);每轮最多 1 页,宁少勿滥;growth-log 追加。
F. **SunWatch**(仅周一):add_repo(owner=f-tiger, repo=sunpredition, access=push) 并按克隆纪律克隆,分支 claude/sun-yuchen-investment-research-yzz9mx;读其 CLAUDE.md + BACKLOG.md 取一件;改动先过 `node test/rules.test.mjs`;push 该分支 = 部署。
G. **三十五后 / after35**(sites/after35,D1 6109b81e-c970-47d7-b7fc-3a2a15f68ed2):每日审核待审卡片——`SELECT id, kind, flag, headline, created FROM cards WHERE status='pending'`,误拦放行、确为贷款/刷单/收费培训则 rejected,再扫当日新 live 卡。**本会话没有 Cloudflare MCP 时,写「审核未做:本会话无 D1 访问」并在 owner 待办里提一次**,不要假装审过。报数只用已提交快照或小查询。永不在日报里贴联系方式;永不放种子卡/示例卡。
H. **新站群与四个新 worker(只报数不动)**:learn / fanzha / firstjob / codeword / powerbill(均在 after35-events D1,表前缀 lev/fev/jev/cev/pev),以及 venture-lab(rfqdesk / modelmeter / querysprint / filinglens)、web3-studio、localebatch、verify(agent-delivery-lab)。读 data/fleet-health.json 与各站 CLAUDE.md 的判定线;冷启动期报 0 就是正确动作,不为有东西可写而加页。一手依据变更(各站 CLAUDE.md 列出的法规、研究、拍卖日期)时才做一件。新站上线当轮必须完成舰队接线(heartbeat SITES、ai_access_probe、ai_referrals、check_bot_ua、indexnow hosts、automation map、本 prompt 的 H 块)。

## 4. 周一附加
- agiscorecard 深审计一项 + 「赔率 vs 证据」新一期(gen_odds.py 读 odds-history.json,绝不丢台账)。
- **舰队分发暂存**:规格 docs/loop-distribution-staging.md;各站一起排素材选 ≤3 条,写进 docs/distribution-staging/YYYY-Www.md 由 owner 手发;上周勾选连续 4 周全空才建议降频。
- **sellSomething 周循环**:add_repo(owner=f-tiger, repo=sellsomething, access=push),分支 claude/sales-website-research-plan-7i7rc2;Superteam 匹配只落盘草稿;健康只看 Actions;每月首个周一加哨兵;写 docs/ops/revenue-loop-log.md。绝不代注册、绝不外发。
- **Weekly AI & Tech News Roundup**(owner 个人消费):WebSearch 近 7 天 6–10 条,自包含 HTML,写进 agi-site 仓 docs/weekly-news/YYYY-Www.html 并在日报里给出路径;被挡域名换来源,不硬凑。

## 5. 每月附加
- 每月 5 日:**paid-monthly-recheck**(bpj 各工具 limits.paid 复核,只走 limits-edit,重大变价才 [deploy])+ **10 万实验月度复核**(有 Cloudflare MCP 时读 experiment_ledger open/watch 逐条核证伪线,同步 /paradigm-experiment 与 /zh 版;没有就写「本轮未验证」;机器绝不代办交易,页面永不出现金额)。
- 每月 1–3 日:向 owner 要一次 Bing Webmaster → AI Performance 两张明细(只要一次);核一次 GitHub Actions 用量。

## 6. 里程碑(显著标注)
首个第三方 MCP 需求调用方(fleet-mcp-usage 的 demand 规则)、首个真实订户、subscribers ≥10/50、首笔非 Amazon 收入(含 Metaculus 奖金,owner 亲报)、PartnerNet 佣金实际到账、Organic ≥10/50/200、AI 引荐周环比翻倍、首个 bpj 厂商认领、eco affiliate_click ≥20/28d、Metaculus 北极星 ≥1。

## 7. 汇报(一条中文总日报覆盖全部站点)
按 A→H 每块 2–6 行:一手数字(带日期与口径)、本轮 ship、deploy 是否绿、机制体检(哪些验了、哪些「本轮未验证」)、owner 待办(同一条不催第二遍以上)。台账栏一行:开放 / 已结 / 本期 won-lost 计数。无实质变化就短。任何一块出错不影响其它块,错误原文写进对应站的日志与总日报。

## 8. 运行记录(每轮必做,哪怕别的都没做)
在本轮那一次 push 里,给 data/fleet-master-run.json 的 `runs` 数组追加一行 `{"at": "<UTC ISO 时间>", "repo_ok": true/false, "pushed": true/false, "via": "git" 或 "mcp", "blocks": "做完的块,如 A,B,C,D,G", "note": "一句话,出错时写原因"}`,只保留最近 30 行,文件用 `json.dumps(ensure_ascii=False, indent=1)` + 结尾换行。git 推不上去就用第 0 节第 5 步的 GitHub MCP 兜底写这一行。heartbeat(tools/fleet/check_master_run.py)每天读它:50 小时没有新记录,或连续两轮 repo_ok=false,就把 heartbeat 打红并发 GitHub 失败邮件给 owner——这是本任务出问题时(包括本会话被归档、Routine 消失)唯一不依赖任何 AI 会话的告警。
