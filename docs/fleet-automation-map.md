# 舰队自动化清单（唯一权威版本）

建立于 2026-09-04，owner 两条指令：
> 「把你的自动化任务重新整合优化，现在太多任务」
> 「舰队自己不能依赖你进化…一方面你有自动化任务，一方面舰队各个站点自己有
> 刷新的自动化能力，避免强依赖你」

**任何会话在新增/修改定时任务前必须先读本文件**，并遵守下面第四节的三条纪律。

---

## 一、两层模型（owner 2026-08-22 立，2026-09-04 重申）

| | 第①层 站点自治 | 第②层 舰队进化 |
|---|---|---|
| 载体 | 本仓 `.github/workflows/*`（零 AI） | Claude Routine（会话） |
| 能力 | 取数、构建、部署、探活、告警 | 判断、选题、写内容、跨站移植 |
| 失效后果 | 站点数据陈旧 | **站点停止进化，但不下线** |
| 依赖我吗 | **否** | 是 |

**铁律：能用第①层做的，绝不放进第②层。** 第②层只负责「需要判断力的那一件事」。

### 为什么这条铁律是有事故背书的
2026-09-03 起，两个自绑定 Routine 被平台挂起
（`suspension_reason = plan_no_longer_eligible`，非 owner 暂停、非我能修复），
agiscorecard 与 sourceradar 的每日循环整整两天没有跑。同期
thedollscout 冻结约 **86 小时**——它的部署是纯 push 触发，没有会话推它，
就没有任何东西推它。这就是「强依赖我」的实际代价。

---

## 二、第①层清单（`.github/workflows/`，公开仓 → Actions 免费）

### 部署（push 到 main 即发布，各自 path 过滤）
| workflow | 站点 | 定时兜底 |
|---|---|---|
| `deploy-agiscorecard.yml` | agiscorecard.com | **`50 2 * * *`（2026-09-11 新增）** |
| `deploy-baipiaoji.yml` | baipiaoji.com | `30 0 * * *` |
| `deploy-getecoback.yml` | getecoback.com | `17 3 * * *` |
| `deploy-buysomething.yml` | source.agiscorecard.com | `20 5 * * *`(**09-13 加**:官方源探针 + 付费包生成 + 信标真值测试 + picks 来源校验;schedule 分支 +≈1 分) |
| `deploy-gamesledger.yml` | games.agiscorecard.com | `10 6 * * *` |
| `deploy-thedollscout.yml` | thedollscout.com | **`20 7 * * *`（2026-09-11 新增）** |
| `deploy-goldrush.yml` | goldrush.agiscorecard.com | **`35 7 * * *`（2026-09-11 新增）** |
| `deploy-gridlings.yml` | play.agiscorecard.com | **`50 7 * * *`（2026-09-11 新增）** |
| `deploy-learn.yml` | learn.agiscorecard.com | **`5 8 * * *`（2026-09-15 建站，owner 指令「做一个教育子网站」）** |
| `deploy-after35.yml` | 35.agiscorecard.com | **`50 7 * * *`（2026-09-14 建站，owner 指令「给失业中年人用的平台」）** |
| `deploy-fanzha.yml` | fanzha.agiscorecard.com | **`20 8 * * *`（2026-09-15 建站，owner `/goal`「持续做新站点」方向候选 #1 识骗）** |

### 数据与维护（外部副作用一律只挂 schedule，绝不挂 push）
| workflow | cron (UTC) | 作用 |
|---|---|---|
| **`fleet-heartbeat.yml`** | `0 8 * * *` | **新增 2026-09-04**：八站探活 + 超 7 天未部署自动重发 + 快照写回 `data/fleet-health.json` + 站点非 200 直接把 run 打红（GitHub 邮件是唯一不经过任何 AI 会话的告警通道）**2026-09-12 加两块「AI 时代」仪表**:`tools/fleet/ai_access_probe.py`(8 站 × 8 个 AI 爬虫 UA × / 与 /llms.txt,任一 403/429/503 即红——Cloudflare Pay-Per-Crawl 09-15 起默认拦截,此前手册承诺的「heartbeat 看到 403」从未真的在看)+ `tools/fleet/ai_referrals.py`(读八站 28 天 AI 助手引荐 → `data/fleet-ai-referrals.json`;**09-13 改为各站公开 `/api/pulse` 端点优先、D1 REST 只兜底,零 token,首读 78/28d**;>3 天读不到才红)。**09-13 再加两条断言**:`check_bets.py`(判定线过期 >7 天未结算即红)、`recall_gate.py --check`(SR 召回雷达存在但 >14 天即红)。增量 ≈10 秒,仍在 1 分钟粒度内。全文 `docs/ai-era-site-2026-09-12.md`**2026-09-13 加赌注台账断言**:`tools/fleet/check_bets.py` 读 `data/fleet-bets.json`(42 条预登记判定线),到期 3 天内 warning、过期 >7 天未结算即红;秒级,零副作用。 |
| `fleet-trends.yml` | `45 3 * * *` | 全舰队趋势快照 **2026-09-12 雷达加 Reddit 求做板块源**(r/SomebodyMakeThis + r/AppIdeas 公开 JSON,只读,增量 <0,2 分/月)。**2026-09-13 加机会撮合层**:`tools/fleet/opportunity_match.py`(零 AI,Reddit 请求 × rising × PH/HN 供给 → `data/autopilot/opportunities.json`)+ `sites/buysomething/tools/gen_demand_board.py`(出页门 ≥3,不转载 Reddit 内容);秒级;页有变化才触发 buysomething 部署(≈1 分/次)。**同日板块名单外置** `tools/fleet/reddit_watchlist.json`(36 板/日,6.5 s 串行 ≈ +4 分钟/次 ≈ 120 分/月,公开仓免费;board_stats 按产出淘汰;Ask HN 周窗新增;idea feed 只探针)。裁定见 `docs/reddit-opportunity-board-2026-09-13.md` |
| `eco-trends.yml` | `30 4 * * *` | 德国热搜触发器 |
| `eco-health.yml` | `0 5 * * *` | eco 站健康 |
| `eco-heat-alert.yml` | `0 6 * * *` | eco 热度告警 |
| `eco-mcp-smoke.yml` | `17 6 * * *` | eco MCP 冒烟 |
| `tds-traffic.yml` | `0 6 * * *` | tds D1 14 天窗导出 |
| `agi-odds.yml` | `25 3 * * 1` | 赔率快照（周一，早于日报）；**2026-09-07 加挂 AGI 行情板**（`fetch_market_board.mjs` + `gen_market_board.py` → `/agi-prediction-markets`，~0.5 分钟/月，不新增 schedule；取不到就 continue-on-error 跳过，不拖累赔率快照）。裁定见 `docs/prediction-market-platform-2026-09.md` |
| `metaculus-bot.yml` | `13 */2 * * *` | **新增 2026-09-05**:Metaculus FutureEval 机器人锦标赛(舰队第一条与流量无关的营收线);job 级门 `vars.METACULUS_BOT_ENABLED=='1'`,未设 = 0 分钟;≤1,800 分钟/月(公开仓免费);详见 `docs/revenue-breakthrough-2026-09.md` |
| `agi-trader.yml` | `45 18` / `15 19` / `45 19` / `15 20 * * 1-5` | **新增 2026-09-05**:owner 自用镜像交易器(Alpaca,缺省纸面;整股 market-on-close + 零股 day;四条错峰 cron 抗 GitHub 延迟,幂等读当日订单);job 级门 `vars.TRADER_ENABLED=='1'`,未设 = 0 分钟;≈90 分钟/月(多数秒退);日志只打印计数;详见 `tools/trader/README.md` |
| `agi-paper-ledger.yml` | `40 22 * * 1-5` | **新增 2026-09-05**:预登记纸面交易台账,十一臂确定性重算 → `sites/agiscorecard/paper-ledger.json`;≈22 分钟/月 + 触发 agi 部署 ≈66 分钟/月;取不到 SPY 即红;**2026-09-06 追加一步**:`tools/trader/test_mirror.py` 20 场景对本地 mock 券商跑执行器(~4 秒/次 ≈ 1.5 分钟/月,不新增 schedule,放在 commit 之后以免连坐);详见 `docs/auto-trading-research-2026-09.md`、`tools/trader/README.md` |
| `agi-indexnow.yml` | `17 3 * * 1` | sitemap 提交（周一） |
| **`fleet-autopilot.yml`** | `40 2 * * *` | **新增 2026-09-11：站点自治升级算法**（零 AI）。内容哈希记账 → sitemap `<lastmod>` 变成可计算的事实；只对内容真变了的 URL 打 IndexNow；当日 rising 需求对着站内已有页面匹配，写出排序过的缺口队列给第②层。**不写一个字正文。** 自检 20 条红色夹具跑在最前面。**09-12 加度量层**：抓 eco/agi/buysomething 的公开聚合端点（零密钥），队列新增 underserved / hot_pages / first_party_demand。全文 `docs/site-autopilot-2026-09.md` **2026-09-12 加一步「需求摘要」**:`tools/fleet/demand_digest.py` 把 rising / 雷达(含 Reddit 求做板块)/ autopilot gaps / 第一方信号读成一页 `data/autopilot/demand-digest.md`,秒级,零外部副作用。 |
| `tds-indexnow.yml` | `20 6 * * 3` | tds IndexNow（周三） |

**成本**：heartbeat **实测 19 秒/次**（2026-09-04 首跑，run 33835200197），按 Actions
最小计费粒度算 1 分/次 × 30 = ≤30 分/月；agi-site 为公开仓，Actions 免费，
不占账号 2000 分钟额度（该额度只被私有仓消耗）。

---

## 三、第②层清单（Routine），2026-09-04 整合后

| Routine | cron (UTC) | 模式 | 本次动作 |
|---|---|---|---|
| agiscorecard daily（**已并入 sourceradar**） | `0 4 * * *` | 自绑定 | **合并**：sourceradar 的每日职责并入本条 |
| ~~sourceradar 每日进化~~ | `40 5 * * *` | 自绑定 | **停用（保留不删）**，数据门不支持日频：7 天真人 pv = **5** |
| getecoback daily v5 | `0 5 * * *` | 新会话 | 保留日频（7 天真人 pv 130 + 联盟机制唯一在跑） |
| 白嫖计 daily v4 | `0 22 * * *` | 新会话 | 保留日频（7 天真人 pv 347、go 15、sub_view 66 — 全舰队最高） |
| DollScout 每 2 天 | `10 7 */2 * *` | 新会话 | 保留（7 天真人 pv 128，且已出**首个 affiliate_click**；09-06 判定线在即） |
| paid-weekly-recheck（白嫖计付费档位） | `0 1 * * 1` → **`0 1 5 * *`** | 新会话 | **周 → 月**：14 个工具定价周频过密，且日循环已覆盖「命中工具当轮复核」 |
| 舰队每周分发暂存 | `30 1 * * 1` | 新会话 | **不动**：其自身预登记规则是「连续 4 周全空勾才降频」，现仅 2 周（W34 0/6、W35 0/3），**不提前裁决** |
| sellSomething 周循环 | `30 3 * * 1` | 新会话 | 不动 |
| Weekly AI & Tech News Roundup | `0 8 * * 1` | 新会话 | 不动（owner 个人消费，非舰队） |
| 10 万实验月度复核 | `0 6 5 * *` | 自绑定 | 不动 |

### owner 每周收到的报告数
- 整合前：7(agi) + 7(sourceradar) + 7(eco) + 7(bpj) + 3.5(tds) + 4(周一) + 0.25(月) ≈ **35.75 / 周**
- 整合后：7(agi 含 sourceradar) + 7(eco) + 7(bpj) + 3.5(tds) + 3(周一) + 0.5(月) ≈ **28 / 周**（**−22%**）

### 为什么没有砍得更狠——数据门不允许
7 天真人 pv（JS 口径，剔 `/__ci%`，2026-09-04 实测）：
bpj **347** · agi ~230 · eco **130** · tds **128** · **sourceradar 5**。
只有 sourceradar 的日频缺乏数据支撑。把 bpj/eco/tds 一起降频会是**替 owner
缩小工作范围**，不是整合。真正过量的不是「工作频率」而是「汇报密度」，
所以本轮改的是汇报纪律，不是工作频率。

---

## 四、新增自动化前必须过的三条纪律

1. **先问能不能下沉。** 取数 / 构建 / 部署 / 探活 / 告警 → 第①层。
   只有「需要判断」的才配得上一个 Routine。
2. **先算账再加 cron**（每次分钟 × 每月次数），写进提交说明。外部副作用
   （IndexNow / Wayback / 第三方 API）只挂 schedule，**绝不挂 push**。
3. **合并优先于删除。** 用 `update_trigger` 改 prompt + `enabled=false` 停用，
   **永不 `delete_trigger`**——历史与预登记判定线要留痕。

## 五、故障处置

- **Routine 被平台挂起**（`suspension_reason` 非空）：这是账号/套餐层的状态，
  会话侧无法修复。手动补跑用 `fire_trigger`（实测可用），并显著上报 owner。
- **计划路径死了但站点还活着**：正常，这正是第①层的设计目的。
  `data/fleet-health.json` 是不依赖任何 MCP 的状态来源。
- **站点非 200**：`fleet-heartbeat` 会把 run 打红并触发 GitHub 邮件。

---

## 六、2026-09-04 执行结果（实测，非计划）

- `trig_018xnCHHqLjXgLdPoL4eQuGs`（舰队日报）：`update_trigger` 写入合并后的 prompt
  并置 `enabled=true` 后，**`suspension_reason` 由 `plan_no_longer_eligible` 变为空**，
  `next_run_at = 2026-09-04T04:01Z`。即：一次带 enabled 的更新把平台挂起解除了。
  下次再遇到自绑定 Routine 被挂起，先试这一步，再惊动 owner。
- `trig_014Qc7okJSgZ6HKWsNM8vnUm`（sourceradar）：改名为
  `[已合并·勿启用] …`，保持 `enabled=false`，**未删除**（判定线与历史留痕）。
  它的 `suspension_reason` 仍为 `plan_no_longer_eligible`——因为本来就不该再启用，不去动它。
- `trig_018chEXs9JvJYexpHvbv3Pp4`：`0 1 * * 1` → `0 1 5 * *`，改名 paid-monthly-recheck。
- eco / bpj / tds 三条：**只改频率认定，prompt 一字未动**。它们的 push 通知仍开着。
  若 owner 要更少的手机推送，能做的只有重建 Routine（会丢 run 历史），
  **不建议**——在 App 里静音那几条更便宜。这一条写在这里，免得后续会话自作主张去重建。

### 仍需 owner 亲自确认的一件事
Routines 界面里 tds / bpj / eco 三条 09-03 那次「11–15 毫秒 FAILED」的失败详情，
本会话读不到。若今日 05:07（eco）与 22:02（bpj）的计划触发再次毫秒级失败，
说明那是与自绑定挂起不同的第二个问题，需要 owner 反馈界面上的报错文本。

### heartbeat 首跑实测（2026-09-04 04:00 UTC，run 33835200197，SUCCESS 19 秒）
八站全部 `http 200`；`days_since_deploy`：baipiaoji/getecoback/buysomething/gamesledger 0、
agiscorecard 2、thedollscout 3、goldrush 3、**gridlings 6**（距 7 天自动重发只差 1 天，
正是这条链要兜的那一类）。快照已落 `data/fleet-health.json`，任何会话 `cat` 即可，
不需要 Cloudflare MCP、不需要 GitHub MCP、不需要我。

---

## 七、Routine 模型：Fable 5.1 → 已于 2026-09-07 全部改回 Opus 5

**⛔ 2026-09-07 撤销（owner 原话：「帮我把所有你的定时任务跑的模型改成默认的，不用fable」）。**
9 条启用中的 Routine 现在**全部是 `claude-opus-5`**（`update_trigger` 逐条确认，
`derived_state.model` 复查通过）。选 opus-5 而不是别的：API **不接受把 model 清空**
（`"default"` 报 `invalid_model`，空串报 `model must not be empty`），必须写一个具体 ID；
owner 在本会话被问到时选了 opus-5，它与常驻会话 `session_016njKJ81yVv2QdrpLYCX1Vc`
当前跑的模型一致，两条自绑定 Routine 因此不会分叉（见下第 2 条）。

| Routine | 现模型 |
|---|---|
| DollScout 每 2 天 | claude-opus-5 |
| 白嫖计 daily v4 | claude-opus-5 |
| getecoback daily v5 | claude-opus-5 |
| sellSomething 周循环 | claude-opus-5 |
| 舰队每周分发暂存 | claude-opus-5 |
| paid-monthly-recheck | claude-opus-5 |
| Weekly AI News Roundup | claude-opus-5 |
| 舰队日报（自绑定） | claude-opus-5（写入即与绑定会话一致，见下） |
| 10 万实验月度复核（自绑定） | claude-opus-5（同上） |
| [已合并·勿启用] sourceradar | 未设（停用中，不动） |

**两个必须传下去的操作坑（本次踩到）**：
1. **模型存在两个字段里，只看一个会漏。** `list_triggers` 返回的
   `session_request.config.model` 和 `derived_state.model` 不总是同一份：
   "Weekly AI News Roundup" 的 `session_request` 里根本没有 `config`（它带 3 个 MCP
   连接器，是另一种建法），模型只出现在 `derived_state.model`。**只查 config.model 会
   把它误判成「已经是默认」而漏掉。以 `derived_state.model` 为准。**
2. **自绑定那两条的模型仍由绑定会话决定。** 写入照样成功，但真正生效的是
   `session_016njKJ81yVv2QdrpLYCX1Vc` 当前的模型 —— 实测该会话
   `user_switched_model` / `last_served_model` 都是 `claude-opus-5`，所以本次两边一致、
   没有分叉；若 owner 以后在那个会话里切模型，这两条会跟着走，Routine 里写的值不作数。

下方 08/09-04 的原始记录保留为背景（它解释了第八节那类故障的时间线）：

---

### 原记录：Routine 模型统一切到 Fable 5.1（owner 2026-09-04 明确要求，已于 09-07 撤销）

owner 原话：「把 Routine 也换成 fable 5.1」。**全部 8 条启用中的 Routine 已写入
`model: claude-fable-5-1`**，服务端全部接受（这同时证明该模型对本账号已开通 ——
`update_trigger` 的 model 参数会校验 org 可用模型，不可用会直接被拒）。

| Routine | 生效吗 |
|---|---|
| DollScout 每 2 天 | ✅ 下次 09-05 07:10 起 |
| 白嫖计 daily v4 | ✅ 下次 09-04 22:02 起 |
| getecoback daily v5 | ✅ 下次 09-05 05:07 起 |
| sellSomething 周循环 | ✅ 下次 09-07 03:31 起 |
| 舰队每周分发暂存 | ✅ 下次 09-07 01:31 起 |
| paid-monthly-recheck | ✅ 下次 09-05 01:06 起 |
| Weekly AI News Roundup | ✅ 下次 09-07 08:08 起（原本是 `claude-opus-4-8`，全舰队最旧的一条） |
| **舰队日报（自绑定）** | ⚠️ **写入了但不会立即生效** |
| **10 万实验月度复核（自绑定）** | ⚠️ **同上** |

**为什么那两条不生效**：它们 `persist_session=true`，绑定在 owner 的常驻会话
（`session_016njKJ81yVv2QdrpLYCX1Vc`）上，唤醒的是那个已存在的会话，因此**沿用该会话
当前的模型**，直到绑定解除。要让它们跑在 Fable 5.1 上，只有一个办法：**owner 在那个
会话里用模型选择器切到 Fable 5.1**（会话模型是客户端设置，会话侧改不了自己）。

**后续会话注意**：`update_trigger` 的 `model` 参数**只有 owner 用自己的话明确要求时才能动**。
两次授权原话（09-04 换 Fable、09-07 改回 Opus 5）都已记录在本节；不要把它们当成
「以后可以随便换模型」的常设许可。

---

## 八、Fable 5.1 切换后的第一种新故障形态（2026-09-05 晨发现，处置在案）

换模后最先触发的两条新会话 run **全部卡死在同一处**：
- 白嫖计 daily（09-04 22:03 触发）与 paid-monthly-recheck（09-05 01:07 触发）都在
  会话开头尝试 **`git clone git@github.com:…`（SSH 形式）**，auto 权限模式把该命令
  挂起等人批准 → 无人值守会话永远等不到 → `SESSION_STATUS_REQUIRES_ACTION`，
  各卡 6/3 小时，零提交、零 token 消耗。这与 09-03 的「11–15 毫秒 FAILED（会话没
  创建）」和「自绑定被平台挂起」都**不是同一种故障**——现在已知的计划路径故障形态
  有三种，处置各不同。
- **处置规程（新增）**：`get_session` 看到 `pending_action` 是 SSH 克隆 →
  ①`interrupt_session` 会被 auto 分类器拒（实测），不要反复试；
  ②直接 `fire_trigger` 补跑，并在 `text` 里写明「克隆只用 add_repo 返回的 HTTPS
  命令，禁 SSH；HTTPS 报错就把原文写进简报，不要换 SSH 重试」；
  ③僵尸会话用 `archive_session` 清掉（实测可用）。
- **已完成（09-05 04:56–04:59）**：「克隆纪律」段已补进全部 5 条克隆型新会话 Routine
  的 prompt（bpj daily / eco daily / tds / 分发暂存 / sellSomething 周循环；paid-monthly
  的补跑已在 fire_trigger text 里带过同款指令）。补跑会话 cse_01BUeRkf… 2 分钟内正常
  结束、未再卡 pending —— 说明避开 SSH 后新会话路径能走通；它是否完成了 14 工具复核
  以其推送给 owner 的简报为准（本会话读不到其转写，git 上未见 limits 提交，如实记录）。


---

## 九、2026-09-11：四条部署 schedule + 一条 autopilot（owner「避免不跑后就不更新了」）

### 为什么加，而不是靠 heartbeat
第五节写过「新站默认加低频 schedule 由 heartbeat 统一承担」。**那句话在本轮被实测推翻了**：
heartbeat 的重发门是 `days_since_deploy >= 7`，它保的是**不掉线**，不是**不陈旧**。
thedollscout 与 goldrush 在这条门下可以连续六天一个字节不变而 heartbeat 全绿 ——
tds 2026-09-03 冻结 86 小时正是这个形状，而且**当时没修，是这次才修的**。
agiscorecard 更隐蔽：它每天能重建**纯属副作用**（fleet-trends 把 trends-us.json 提交进
它的目录），那条链一停（09-08 GitHub 丢掉全天计划运行）它就能静默停更一周。

### 算账（纪律第 2 条）
| 新增 | cron (UTC) | 单次 | 每月 |
|---|---|---|---|
| `fleet-autopilot.yml` | `40 2 * * *` | **首跑实测 12 秒**（run 34608344914，SUCCESS）→ 按最小计费粒度计 1 分 | ≤30 分 |
| `deploy-agiscorecard.yml` | `50 2 * * *` | ≈2 分 | ≈60 分 |
| `deploy-thedollscout.yml` | `20 7 * * *` | ≈2 分 | ≈60 分 |
| `deploy-goldrush.yml` | `35 7 * * *` | ≈1 分 | ≈30 分 |
| `deploy-gridlings.yml` | `50 7 * * *` | ≈2 分 | ≈60 分 |
| | | **合计** | **≈240 分/月** |

公开仓 Actions 免费，不占账号 2000 分钟额度（那个额度只被私有仓消耗）。
**不新增任何外部抓取**：autopilot 只读已提交进仓的需求文件，IndexNow 是既有的提交通道
且只发增量。

### 一条实测，推翻了仓里到处都写着的一句话
260 次真实 run（GitHub API，2026-08-31→09-11）：**00:30–08:00 这一段的 cron 中位数迟到
257–308 分钟**（最长 461），**2026-09-08 全舰队所有计划运行被 GitHub 整天丢掉**。
所以仓里每一句「XX:XX 抓完给 YY:YY 的循环读」现在都是假的 —— fleet-trends 实际落在
08:20，比 agi 04:00 的循环晚四小时。
**新纪律：任何设计都不许依赖两条 workflow 的先后顺序。** 消费者必须自己读输入文件的
时间戳并对陈旧作出反应（autopilot 的 `demand.py` 就是按这条写的：逐 seed 卡 10 天，
过期的丢掉并写明原因，绝不当新鲜的用）。


### 2026-09-11 首跑实测（全部 workflow_dispatch，非计划）
| run | 结果 | 耗时 |
|---|---|---|
| `fleet-autopilot` 34608344914 | ✅ SUCCESS | **12 秒** |
| `deploy-goldrush` 34608334113 | ✅ SUCCESS | 31 秒 |
| `deploy-gridlings` 34608334085 | ✅ SUCCESS | ~52 秒 |
| `deploy-agiscorecard` 34608334017 | ✅ SUCCESS | ~80 秒 |
| `deploy-thedollscout` 34608334005 | ✅ SUCCESS | ~81 秒（含 49 条线上自检） |
| `fleet-heartbeat` 34608502800 | ✅ SUCCESS | 19 秒，**含新的「autopilot 是否还活着」断言**;**2026-09-12 再加「六站 bot-UA 正则一致」断言**(`tools/fleet/check_bot_ua.py`,零外部副作用,秒级) |

autopilot 首跑**什么都没提交**——当天没有任何页面内容变化，所以没有 lastmod 该前进，
也没有 URL 该进 IndexNow。这正是「平静的一天」该有的样子,proof-of-work 那一步确认了
「声称有修正」与「什么都没 staged」没有同时为真。实际月成本据此从 ≈240 分下修到 **≈210 分**。

---

## 十、2026-09-14：owner 令「全部删除，重建一个总任务」——执行结果（实测）

owner 原话：「现在舰队你的定时运行任务各种出错，你帮我全部删除，然后重建一个总任务」。

### 先查清「各种出错」到底是几种（不是一种，处置各异）
| Routine | 表现 | 查明原因 |
|---|---|---|
| Weekly AI & Tech News Roundup | 09-07 FAILED，8 秒退出 | **真失败**：`You've reached your Fable limit. Switch to another model to continue.` 它是 Cowork-remote 建法（另一个 environment），`configured_model` 仍是 `claude-fable-5-1`——第七节那次「全部改回 opus-5」没改到它，因为它的 `session_request` 没有 `config`（第七节坑 1 的又一次） |
| sellSomething 周循环 | 09-07 FAILED | **假失败**：会话本身跑了 13 小时、输出 18.6k tokens、结束于 REVIEW_READY，工作做了；FAILED 是 Routine 包装层的判定 |
| 10万实验月度复核 | `last_run` 为空 | **静默未触发**：08-23 建、每月 5 日 06:00，09-05 那轮没有任何唤醒到达绑定会话，`next_run_at` 却已排到 10-05。自绑定 Routine 在 09-03 被平台挂起过（第一节），这条很可能同批但没被发现 |
| 其余 6 条 | SUCCEEDED | 正常 |

### 处置（按「合并优先于删除」，第四节第 3 条）
1. **新建总任务 `trig_012kK8KVg4WYD4g6Y6wEiXet`**，`0 4 * * *`，自绑定常驻会话，prompt 全文
   `docs/fleet-master-routine.md`。它把 10 条职责按 **每日 / 周一 / 每月 5 日** 三档路由，
   各站细则仍以各自 CLAUDE.md 为准（prompt 只做路由，不复制规则）。
   顺带把已丢失的 SunWatch 每日优化 Routine（sunPredition 仓 CLAUDE.md 提到的
   `trig_01PiwKEK…`，本账号列表里已不存在）以**周一一件**的频率接回来。
2. **旧 10 条全部 `enabled=false` 并改名 `[已并入总任务 09-14·勿启用]`，未删除。**
   prompt 全文存档 `docs/routines-archive-2026-09-14/`（文件名 = trigger id）。
   不删的理由是有事故背书的：7/17–19 触发器丢失导致循环中断三天；总任务第一轮跑通之前
   删掉旧的，等于把 10 条职责押在一条没跑过的新链上。**owner 确认第一轮成功后，删除是一句话的事。**
3. 汇报密度：owner 每周收到的报告从 ≈28 条降到 **7 条**（一条总日报覆盖全部）+ 周一/月度附加段落。

### 两个必须盯住的风险（写在这里，不写在报告里就会被忘）
- **模型**：自绑定 Routine 跑在绑定会话的当前模型上。重建当天 owner 已把常驻会话切到
  `claude-fable-5-1`，而 09-07 唯一一条真失败的原因正是 Fable 用量上限。
  第一轮（09-14 04:06 UTC）若同样撞墙，唯一的修法是 owner 在会话里切回 opus-5——
  会话侧改不了自己的模型，也不许自作主张改 Routine 的 model 字段。
- **单会话承载**：一轮要过 5 个站 + 周一 4 项。prompt 里写了优先级截断规则
  （A 健康 → B agi → C eco → D bpj → E tds → F SunWatch），截断时必须在报告里写明哪块没做。
