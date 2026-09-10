# Analytics notes — GA4 monitoring trend

The daily monitor-and-optimize routine reads GA4 live via the Supermetrics MCP
(data source GAWA, account_id 541489054 = agiscorecard.com) and appends a dated
row here so we can watch the trend — especially Organic Search, which is the
number the SEO/GEO work aims to grow. Not indexed (robots.txt disallows it).

The user can also paste GSC/GA4 data here anytime to steer optimization.

## Trend (last-28-day active users by channel)

| Date (read) | Direct | Referral | AI Assistant | Organic Search | Notes |
|---|---|---|---|---|---|
| 2026-07-08 | 115 | 25 | 3 | 1 | Baseline. 80+ new SEO pages just published (mid-indexing); organic hasn't started yet. Traffic is Direct→homepage (137/145 land on `/`). |
| 2026-07-10 | 119 | 27 | 3 | 1 | ~2 days post-publish. Organic still 1 (expected — Google indexing lags publishing by weeks). Direct/Referral flat-to-slightly-up. No overreaction: keep steady quality expansion. |
| 2026-07-11 | 122 | 27 | 3 | 1 | Organic still 1 (day ~3 post-batch; normal). Landing pages: `/` 157 sessions, **`/cn.html` 6+1 (now the #2 landing page — zh demand is real; shipped the last 2 batch-5 zh pages in response)**, `/two-year-scorecard` 2, `/ko/who-is-leopold-aschenbrenner` 1. Events 28d: subscribe_click 8, timeline_view 16, calc_use 10, chain_expand 10, viz_switch 10. New homepage events (pred_expand / readnext_click / vote_cast) not yet registering — recheck in a few days before touching index.html again. /advertise: 0 sessions (sprint day 0 — user outbound sends are the lever, not the page). |

### 2026-07-11 second read — new dimensions (geo / referral source / daily)
- **Geo (28d active users)**: US 96 · Singapore 10 · **China 8 (17 sessions = 2.1/user, highest engagement on the site)** · UK 6 · FR/DE 4 · KR 3. Chinese-audience demand independently confirmed → batch-6 zh-parity seeded.
- **Referral sources (28d sessions)**: forum.effectivealtruism.org **23** (dominant external source) · chatgpt.com 4 (GEO citations beginning) · lesswrong.com 2 · google 1. The real audience beyond Direct is the EA/rationalist community.
- **Daily trend**: pulsed spikes (6/13: 21, 6/18: 27, 6/30: 14, 7/7: 13 sessions), quiet valleys between — traffic is community-post-driven; no organic baseline yet (normal pre-indexing).

### 2026-07-12 读数 — 大扩张后首次监控（+34 URL 上线后）
- **渠道（28d 活跃用户）**：Direct 122 · Referral 27 · AI Assistant 3 · **Organic Search 1** · Unassigned 1。**与 07-11 完全持平**——34 个新页刚上线、处于索引期，Organic 仍为 1 是**预期内**（CLAUDE.md：flat early numbers are expected；never churn）。
- **事件（28d）**：page_view 191 · subscribe_click **8**（与 07-11 持平，无新增转化）· timeline_view 16 · calc_use/chain_expand/viz_switch 各 10。本会话新增事件（index_click、post_scorecard、post_vote、progress_index、zh_deep_page 等）**尚未登记**——新页流量≈0，符合索引滞后。
- **决策**：不追加内容（本会话已 +34，再产出=spam 信号，负收益）。保持克制，等索引/引用成熟（~2–6 周）。下一个真实杠杆是 beehiiv 付费推荐位（用户动作）。盯 07-19 前后是否出现 index_click 首次登记 + Organic 上行。

### 2026-07-13 日更读数 — 游戏/裂变上线后首测
- **渠道（28d 活跃用户）**：Direct 97 · Referral 26 · AI Assistant 2 · **Organic Search 1** · Unassigned 2。总量较 07-12（~153）小幅降至 ~128——**28 天滚动窗口把早前 EA 论坛帖高峰（6/13、6/18）滚出去了**，非真实衰退。Organic 仍 1（索引期正常）。
- **事件（28d）**：subscribe_click 7 · **vote_cast 6（游戏在被玩，正面信号）** · viz_switch 3。本会话新埋点（challenge_share、x_share、index_click、agi_test_click、/agi-test 落地）太新，尚未累积——数日后复查。
- **落地页**：/ 131 会话主导；/cn.html 掉回 1（zh 高峰滚出窗口）；/progress-index、/agi-test 尚未进入（新页索引中）。
- **Gmail**：无赞助询价（仅 1 封 beehiiv 营销邮件）。
- **决策**：数据平 = 索引期正常，**不硬改**（本会话已大量净新增游戏/裂变资产，遵守 no-churn）。真实增长现在卡在两件事：① 索引成熟（数周）② 用户发种子帖点火（distribution-kit.md G1/G2 指向 /agi-test）。无里程碑，不打扰用户。日更/周更触发器确认在跑（本次运行即由 /goal 自动推送触发）。

### 2026-07-14/15 读数 — 🟢 首个自然搜索绿芽
- **渠道（28d 活跃用户）**：Direct 96 · Referral 25 · **Organic Search 3（07-13 是 1，首次上行 3×）** · AI Assistant 2 · Unassigned 2。
- **落地页——深页首次自然着陆（SEO 引擎启动信号）**：`/` 127 主导；**新进榜深页：`/ai-progress-2026-so-far`、`/gdpval-explained`、`/what-is-unhobbling-ai`（各 1 会话，首次出现）**、`/cn` 1、`/ko/who-is-leopold-aschenbrenner` 1。深页进入落地页报告 = 内页开始被索引排名，与 Organic 1→3 互证。
- **事件**：subscribe_click 7 · vote_cast 6（平）。游戏/裂变/lock 新事件（challenge_share、prediction_lock、agi_test_click）仍未显现——本会话才把游戏部署到 main（`381ca64`），线上刚更新，需数日 + 索引；种子帖未发。
- **校准**：绝对量仍小（Organic 3，离首个里程碑 ≥10 尚远），不过度反应、不churn。但这是数周 flat-at-1 后的**第一个方向性信号**，SEO 引擎开始启动。继续让日更/游戏化机器按天跑；发种子帖会加速。

### Bing Webmaster Tools 基线（干预记录）
- **2026-07-12 用户确认：Bing 已通过 GSC 一键导入完成**（站点 112 URLs 时点）。
  这是 AI Assistant 渠道的干预基线：此前 chatgpt.com referral = 4 会话/28d、
  AI Assistant 渠道 = 3 活跃用户/28d，全部发生在无 Bing 索引的情况下。
  预期 2–6 周内观察：Bing/Copilot 自然流量出现 + chatgpt.com referral 上行。
  每日运行盯 sessionSource=chatgpt.com / bing 与 AI Assistant 渠道；若 6 周
  （~08-23）后仍无变化，检查 Bing Webmaster 里的索引覆盖报告（需用户截图）。

## What "good" looks like
- **Organic Search** climbing from ~1 → tens → hundreds over the coming weeks = the SEO engine kicking in. This is the key metric.
- **AI Assistant** climbing = the GEO/llms.txt bet (ChatGPT/Perplexity citations) working.
- Deep pages (not just `/`) appearing in the landing-page report = internal pages ranking.

## beehiiv 列表基线（用户截图确认）
| 日期 | 订阅者 | 备注 |
|---|---|---|
| 2026-07-11 | 6 | 全部 Active；≥3 个来源为 website: agiscorecard.com/referral（6/23、6/30、7/2、7/7 持续流入）— 站点→订阅漏斗已验证有效。Boosts 开启后每个新订阅 ≈ $1–3。 |
| 2026-07-11 | 6 | beehiiv Recommendation Network 已开通（用户截图确认）：Active recommendations = 4（当前均为 Free 型互推位，Paid = 0）。Total earned $0.00 起步。下一步：Discover publications 里添加带付费 offer 的推荐位后，每送出 1 个验证订阅者才开始计费入账。营收 KPI 从此 = 订阅者流量。 |

## 2026-07-12 大扩张会话 — 每日运行监控清单（新页面 + 新事件）
本会话把站点从 102 → 136 URLs（+34）。日更运行请重点监控以下**新增可测量项**：

**新事件（GA4 eventName/eventCount）**：
- `index_click`（location=hero/was-right/predictions/two-year/unemployment/is-chatgpt-agi/how-know/who-building/singularity/safe-jobs/ai-vs-human/ai-pace/narrow-general/takeover/inevitable）— Thesis Tracker 导流点击，衡量差异化指标的吸引力
- `subscribe_click` 新位置：`post_scorecard`、`post_vote`、`progress_index`、`zh_progress_index`、`cn_home`、`zh_deep_page` — 对比哪个位置转化最高，胜出者复制到其他页
- `badge_copy`、`skill_copy` — 分发资产（徽章/skill）被采用的信号

**新旗舰页（盯 landingPage 是否进入前列）**：
- `/progress-index` + `/zh/progress-index`（差异化指数，priority 0.9）
- 12 个新概念页（EN+zh）：is-chatgpt-agi、will-ai-cause-mass-unemployment、how-will-we-know-agi-arrived、who-is-building-agi、what-is-the-singularity、what-jobs-are-safe-from-ai、ai-vs-human-intelligence、how-fast-is-ai-improving、narrow-vs-general-ai、will-ai-take-over、is-agi-inevitable

**里程碑提醒（首次跨越时显著通知用户）**：Organic Search ≥10；任一新页进入 landingPage 前3；任一 subscribe_click location ≥20/28d；`/advertise` 出现 GA4 流量。

**待用户的两个营收动作**（我无法代做）：① awesomedata/awesome-public-datasets 加入会话 scope → 自动提外链 PR；② beehiiv 加付费推荐位 → 订阅入账。

## 2026-07-12 — 游戏化：首页"What's your AGI type?"身份测试（发现闭环 KPI）
把首页投票升级为身份测试（5 个数据支撑的原型：Accelerationist/True Believer/
Realist/Skeptic/Contrarian，各绑定真实预测者位置）。分享文案从"我的预测"改为
"我的 AGI 类型"——身份会被转发，预测不会。**新的发现 KPI**：
- `vote_cast`（eventName）——参与率；升级前 28d=10。看它是否随身份框架上升。
- 分享按钮点击（"Share my AGI type on 𝕏"）——病毒/发现信号。若 GA4 能测 outbound
  点击则盯之；否则用 vote_cast 上升 + chatgpt/x referral 上行做代理。
- 目标：vote_cast↑ → 分享↑ → x.com/referral 流量↑ → 新访客 → 订阅。这是把
  "游戏化吸引力"转成"被发现"的链路，盯 referral sources 里是否出现 x.com/t.co。

## 2026-07-12 — 新增转化归因维度（beehiiv UTM）
所有 96 个 subscribe CTA 现在带 `utm_source=agiscorecard&utm_medium=<location>`（与 GA4 subscribe_click 的 location 分类完全一致）。**双面归因现已打通**：GA4 看点击、beehiiv Acquisition 报表看真实订阅——按 utm_medium 对比哪个位置真正转化成订阅者（不只是点击）。用户下次看 beehiiv 时可截图 Acquisition/source 分布；胜出位置复制到其他页。位置清单：deep_page、zh_deep_page、header、post_scorecard、post_vote、footer_cta、progress_index、zh_progress_index、cn_home、advertise_page。

## 2026-07-19 — 每日监控+优化机制上线（owner /goal：connector 连 GA4 + 每日监控优化）
- **GA4 连接**：Supermetrics ds_id=GAWA 目前 NOT_AUTHENTICATED，需 owner 点一次 OAuth 登录链接授权（只能本人完成）。授权后每日运行自动拉数。
- **每日触发器**：已建自绑定 Routine（trig_018xnCHHqLjXgLdPoL4eQuGs，04:00 UTC / 北京12:00，恢复本会话以保留 GA4+GitHub MCP 与 push 权限）。
- **今日 ship**（本次实跑的每日运行）：① 全站 LCP 性能优化（preconnect gstatic + dns-prefetch GTM，151页，PR#26 已合并部署）；② 新鲜度刷新最陈旧高价值页 ai-2027-scenario-explained（+Thesis Tracker 62.5/100 导流内链，bump dateModified/Last updated/sitemap lastmod）。
- 站点规模：152 URLs。GA4 数字待授权后回填。

### 2026-07-19 GA4 已连接 — 首次真实数据回填（近28天）
**渠道**（activeUsers/newUsers/sessions/views）：Direct 79/81/91/101 · Referral 19/20/22/27 · **Organic Search 6/6/8/6** · Unassigned 3/0/3/0 · **AI Assistant 2/2/3/2** · Organic Video 1/1/1/1。总活跃用户≈110/28d。
**事件**：page_view 137 · session_start 129 · first_visit 110 · user_engagement 50 · scroll 28 · **vote_cast 9** · **subscribe_click 7** · slidein_show 5 / dismiss 1 · pred_expand 2 · viz_switch 2 · analysis_click 1 · click 2。
**解读**：① Organic Search=6，距首个里程碑(10)不远，滞后属正常，不churn。② subscribe_click=7（营收KPI，有量但偏小）。③ vote_cast=9（游戏参与在跑）。④ 裂变环未点燃——challenge_share/x_share/agi_test_click/index_click 均=0，说明分享按钮尚未产生外传；下一步重点是让 /agi-test 的分享真正被转发（GAMIFICATION 队列的 forecaster-leaderboard 可提升可分享性）。⑤ AI Assistant=2，GEO 引用通道已活。

## 2026-07-20 — 每日运行（GA4 已连，第2次真实数据）
渠道(activeUsers)：Direct 80 · Referral 18 · Organic Search 6 · AI Assistant 2 · Unassigned 2 · Organic Video 1（≈109 总）。
事件：page_view 136 · vote_cast 9 · subscribe_click 7 · slidein_show 5。**裂变环仍未点燃**（challenge_share/x_share/agi_test_click/index_click=0）。
落地页：自然搜索仍有 4 个深页各得 1 session（ai-progress-2026-so-far、gdpval-explained、what-is-unhobbling-ai、ko/who-is-leopold-aschenbrenner）——GEO 深页持续吃搜索。AI Assistant 仍只到首页(2)。
数据 28日窗口几乎未动 → 不churn；本run推进 GAMIFICATION：发布 /forecaster-leaderboard（首个带 x_share/challenge_share 分享行的可分享排行榜），给裂变环提供弹药。观察后续 challenge_share/x_share 是否起量。

## 2026-07-21 — 每日运行（GA4 第3次真实数据）
渠道(活跃)：Direct 83 · Referral 18 · **Organic Search 7（↑，10 sessions，逼近里程碑10）** · AI Assistant 2 · Unassigned 6 · Organic Video 1。
事件：page_view 140 · vote_cast 9 · subscribe_click 7 · slidein_show 6。**裂变环仍 0**（leaderboard 昨发，观察窗口未到）。
落地页：自然搜索深页持续吃量——/what-is-unhobbling-ai 升到 2、ai-progress/gdpval/ko-leopold 各 1。**AI Assistant 仍只落首页(2)**，深页=0 → 本run强化 who-is-leopold-aschenbrenner 引用面（带日期 62.5 分数+Tracker内链）攻此缺口。
里程碑观察：Organic Search 活跃 7，距 10 很近，可能本周内跨越。

## 2026-07-21 (run 2) — 上线可嵌入游戏 /future-bet（营收导向、owner 战略任务）
构建广谱互动游戏「The Future Bet」并做成可 iframe 嵌入别站（?embed=1 + 复制嵌入码，utm_source=game_embed），作为 180 天营收（→beehiiv 订阅）的流量+分发引擎。新事件待观察：embed_copy、subscribe_click{future_bet}、vote_cast(future_bet_*)、x_share/challenge_share。观察 GA4 referral 是否出现外站域名（=嵌入分发节点在导流）。

## 2026-07-21 (run 7 GA4) — 全局优化前的数据核查
渠道(活跃28d)：Direct 85 · Referral 18 · **Organic Search 7（10 sessions，卡在里程碑10门槛）** · AI Assistant 2 · Organic Video 1（≈115 总）。
事件：page_view 142 · vote_cast 9 · **subscribe_click 7** · slidein_show 6。游戏事件(agi_test_click/x_share/challenge_share)仍0——今日刚上线，GA4 处理有延迟，属正常，明后天才有数。
落地页：**首页 103 sessions/96 用户 = 全站83%**；深页 ai-vs-human 4、narrow-vs-general 3、two-year 3、ai-progress 2、unhobbling 2。
诊断：转化结构已扎实（首页6个订阅位），**瓶颈是流量量级(115/28d)**，7次点击上做微调是噪声。全局优化=把首页(83%)的滚动 slide-in 从冷求订阅→游戏钩子(新最强互动资产，自带订阅漏斗+分享环)，保留订阅辅链。等游戏漏斗数据回来再评转化。

## 2026-07-22 — 每日运行（GA4）
渠道(活跃28d)：Direct 99↑(昨85) · Referral 19 · **Organic Search 7**(平,10 sessions,仍卡里程碑10门槛) · AI Assistant 2 · Organic Video 1 → 总 **≈132↑**(昨115)。
事件：page_view 157 · **vote_cast 10↑** · slidein_show 6 · subscribe_click 6。**游戏事件(agi_test_click/x_share/challenge_share/index_click)仍0**——昨日刚上线，GA4 处理延迟，需再等1-2天。
落地页：首页 111 用户=**84%**；深页 ai-vs-human 4、narrow-vs-general 3、two-year 3、ai-progress 2、unhobbling 2。
判断：流量瓶颈依旧，游戏漏斗数据待回；不churn。本run做新鲜度刷新（how-close-is-agi）。

## 2026-07-24 — 每日运行（周五；07-23 未跑）
渠道(28d)：Direct 121↑ · Referral 15 · **Organic Search 8↑(11 sessions，距里程碑10一步)** · AI Assistant 2 → 总≈149↑。
事件：page_view 180 · vote_cast 10 · subscribe_click 6 · slidein_show 7。**/future-bet 首次进落地页表(2 sessions)**。
游戏漏斗事件仍0 → 用 Playwright 实测诊断：埋点全正常(home_hero/vote_cast{future_bet_*}/x_share 均入 dataLayer、gtag.js 双页在载)。结论=曝光量太小(首页~4-5 sessions/天×2.5天)+GA4聚合延迟，无bug。vote_cast 的+1 很可能是一次游戏完成。

## 2026-07-25 — 每日运行（GA4）
渠道(活跃28d)：Direct 122↑(前99) · Referral 16 · **Organic Search 8（11 sessions，距里程碑10一步）** · AI Assistant 2 · Organic Video 1 → 总 **≈151↑**。
事件：page_view 192↑ · vote_cast 10 · **viz_switch 10↑(前2，首页可视化切换被用起来了)** · slidein_show 8 · subscribe_click 6。工具分享事件(agi_test_click/x_share/challenge_share/embed_copy)仍0——/future-bet 落地仅2 sessions，曝光量还太小，属预期。
落地页：**/future-bet 首次进入落地页表(2 sessions)**；**/cn+/cn.html 合计8 sessions/5用户（中文需求在涨）**；/ai-vs-human 5（实页第2）；新面孔 /how-fast-is-ai-improving、/agi-vs-superintelligence、/will-ai-cause-mass-unemployment 各1-2——**深页吃搜索的面在变宽**。
注：directory-kit 已交付 owner（Bing P0 + Batch1 七目录），referral 尚无目录站/社交域名——等 owner 执行。

## 2026-07-26 — 每日运行（营收漏斗版首次）
渠道(活跃28d)：Direct 126↑(前99) · Referral 15 · **Organic Search 8**(11 sessions，距里程碑10差1) · AI Assistant 2 · Unassigned 5 · Organic Video 1 → 总 **≈157↑**(前132)。
事件：page_view 197 · **viz_switch 14↑**(前10，全站最高互动) · vote_cast 10 · slidein_show 8 · subscribe_click 6。工具事件(agi_test_click/x_share/challenge_share/embed_copy/invest_tool_click/market_odds_load)**仍全 0**。
**转化赛马突破**：`location` 自定义维度未在 GA4 注册，改用标准维度 pagePath 成功拆解——
**6/6 订阅点击 100% 来自首页 `/`，其余 73 页全部为 0**。
**最大发现**：`viz_switch=14` 发生在 **/cn 中文页**（不是首页）；/cn 8 sessions + /cn.html 4 = 12 sessions，
人均切换 >1 次＝全站参与度最高，**但订阅转化为 0**。→ 中文页参与峰值处缺捕获，是当前最大漏斗缺口。
**明日第一优先**：/cn 在参与峰值（多空可视化切换器）处加订阅捕获。今日因 5 运行禁改窗口（run 9 刚改，
仅隔 3 运行）未动，按规则顺延到阶梯③。
落地页：/ 121(77%) · **/cn 8（真实页第2）** · ai-vs-human 5 · /cn.html 4 · narrow-vs-general 3 · two-year 3 · /future-bet 2。
referral 仍无目录站/社交域名——directory-kit 待 owner 执行。

## 2026-07-27 — 每日运行
渠道(活跃28d)：Direct 130 · Referral 14 · **Organic Search 8**(11 sessions，仍距里程碑 10 差 2) · AI Assistant 2 · Unassigned 2 · Organic Video 1 → 总 **157**（与昨日持平）。
事件：page_view 202 · viz_switch 14 · slidein_show 10 · vote_cast 10 · **subscribe_click 6**(持平) · pred_expand 2 · **market_odds_load 1（首次出现）** · analysis_click 1。
工具事件 agi_test_click / challenge_share / x_share / embed_copy / invest_tool_click / tool_click **仍全 0**。
落地页：/ 130(80%) · /cn 8 · ai-vs-human 5 · /cn.html 4 · narrow-vs-general 3 · two-year 3 · when-will-agi 3 · /future-bet 2 · /progress-index 1。
**读数**：昨日上线的 /ai-tools 与 3 个嵌入模式尚无数据（不足 24h，正常）。market_odds_load 首次出现＝有人真的点开了
Polymarket 赔率块，样本 1，不足以下结论，仅记录。订阅仍 100% 来自首页，/cn 参与最高但零转化的缺口今日已动手。
**今日 ship（阶梯①转化赛马）**：/cn 参与峰值捕获。5 运行禁改窗口今日到期（f315b69=run 9，其后已记 5 次运行）。

## 2026-07-28 — 每日运行
渠道(活跃28d)：Direct 134↑(前130) · Referral 14 · **Organic Search 8**(11 sessions，连续第 3 天持平，距里程碑 10 差 2) · Unassigned 3 · AI Assistant 2 · Organic Video 1 → 总 **162↑**(前157)。
事件：page_view 207 · viz_switch 14 · slidein_show 10 · vote_cast 10 · **subscribe_click 6**(连续第 3 天持平) · pred_expand 2 · market_odds_load 1 · analysis_click 1。
**昨日上线的 cn_viz_peak 捕获：`viz_capture_show` 与 `subscribe_click{cn_viz_peak}` 均未出现**——/cn 昨日无新 session，
埋点未被触发过，不是失效。前日上线的 /ai-tools 同样零流量、未进落地页列表（不足 48h，正常）。
落地页：/ 130(80%) · /cn 8 · ai-vs-human 5 · /cn.html 4 · **dario-amodei 4↑(前1)** · **when-will-agi 4↑(前3)** · narrow-vs-general 3 · two-year 3 · /future-bet 2 · /progress-index 1。
**读数**：转化层与病毒层今日都没有可行动信号（两个新件都不足 48h）。按阶梯规则下沉，且选中的是我自己
两天前记进 backlog 的已验证缺口——中文用户点「岗位暴露度自查」看到的是英文界面。

## 2026-07-29 — 每日运行
渠道(活跃28d)：Direct 130 · Referral 13 · **Organic Search 8**(11 sessions，连续第 4 天持平) · Unassigned 4 · AI Assistant 1↓ · Organic Video 1 → 总 **157**(前 162)。
事件：page_view 200 · viz_switch 13 · slidein_show 11 · vote_cast 10 · **subscribe_click 2**(前 6) · pred_expand 2 · market_odds_load 1。
**关于 subscribe_click 6→2：是 28 天滚动窗口把旧点击滚出去了，不是转化崩了。** 同一天首页落地 130→119、
总活跃 162→157 同步下滑，三者一起动＝窗口右移丢掉了一个高流量日。不因此 churn。
**唯一真信号**：两个深页连续 3 天爬升——**/dario-amodei-agi-prediction 1→4→6**、**/when-will-agi-arrive 3→4→6**，
现已是第 3、第 4 落地页（超过 ai-vs-human 5）。这是站内唯一在涨的东西，今日的改动就压在它们身上。
落地页：/ 119(76%) · /cn 8 · **dario-amodei 6** · **when-will-agi 6** · ai-vs-human 5 · /cn.html 4 · narrow-vs-general 3 · two-year 3 · /future-bet 2 · /progress-index 1。
cn_viz_peak 仍未触发（/cn 无新 session）；/ai-tools、/zh/ai-job-risk-check 尚未进落地页（上线 1-3 天）。

## 2026-07-31 — 每日运行（事件驱动改道）
渠道(活跃28d)：Direct 143↑ · Referral 11 · **Organic Search 8**(第5天持平) · AI Assistant 2 · **Organic Social 2（首次出现）** · Organic Video 1 → 总 167↑。
事件：page_view 213 · viz_switch 13 · slidein_show 11 · vote_cast 10 · subscribe_click 1(窗口滚动) · market_odds_load 1。
**⚠️ Supermetrics 试用期明天到期**（工具返回 notes 提示）——不续订则 GA4 监控中断，需 owner 决定。
**事件**：owner 转来 Situational Awareness 基金爆仓报道；已用 WebSearch 独立核实（CNBC/彭博/TechCrunch/Yahoo 多源一致）：
7月单月约-67%、公开组合大部分转让 Citadel、规模峰值~$45B→~$10B、保留 Anthropic 私募股权、439% YTD(至6月)成历史。
**站内 6 页带已被证伪的现在时表述（"正在做空英伟达"/"~$20B AUM"/"至今+1000%"），今日全部改道处理此事。**
Organic Social 首次出现（2 用户）——来源域名待明日细查，可能是 owner 外发的种子帖开始生效。

## 2026-08-01 — 每日运行
渠道(活跃28d)：Direct 155↑ · Referral 11 · **Organic Search 9↑（六天来首次移动，距里程碑 10 差 1！）** ·
Unassigned 9 · **AI Assistant 3↑** · Organic Social 2 · Organic Video 1 → 总 **190↑**(前 167)。
事件：page_view 236 · slidein_show 14 · viz_switch 13 · vote_cast 11 · **pred_expand 2→10（跳升）** ·
**agi_test_click 1（工具事件首次非零）** · subscribe_click 1 · market_odds_load 1。
**读数**：爆仓新闻日流量整体抬升（190 vs 167）；pred_expand 跳升＝进站的人在展开预测卡看判定，
与事件叙事吻合。cn_viz_peak/embed_copy 仍 0。⚠️ Supermetrics 仍提示试用将到期——明日监控可能中断。
**今日 ship**：/aschenbrenner-fund-collapse（backlog 高优先项，事件搜索需求正热）。

## 2026-08-02 — 每日运行 🎉 两个里程碑同日撞线
渠道(活跃28d)：**Organic Search 9→13 —— 首个里程碑 ≥10 达成！** Direct 173↑ · Referral 11 ·
AI Assistant 3 · Organic Social 2 → 总 **211↑**(前 190)。
**里程碑 #2 同日达成：深页进 top-3 落地** —— /dario-amodei-agi-prediction 13 sessions 升至第 2
（仅次于首页），/when-will-agi-arrive 11 第 3。
落地页巨变（爆仓事件的搜索潮正落到 Aschenbrenner 相关问题页上）：
/ 124 · **dario-amodei 13↑**(前6) · **when-will-agi 11↑**(前6) · **how-close-is-agi 10（新进，前0）** ·
**situational-awareness-summary 10（新进，前0）** · /cn 7 · **ko/who-is 6↑**(前1) · karpathy 4（新）· musk 3（新）。
事件：page_view 257 · pred_expand 12 · viz_switch 12 · vote_cast 11 · index_click 1（首现）· subscribe_click 1。
**读数**：流量层被事件点燃，但转化滞后（subscribe_click 仍 1）——07-29 埋的 deep_dario_mid/when_mid
恰好卡在两个最大上涨页上，赛马数据未来几天见分晓。今日把同一赢家模式铺到两个新进上涨页。
⚠️ Supermetrics 仍提示"试用明日到期"（连续第 3 天同一措辞，尚未真断）；一旦断，监控降级为跳过+提醒。

## 2026-08-02 (下午) — owner 问询：流量上升分析 + 爆点优化
**⚠️ Supermetrics 订阅今日正式失效**（查询报 "Unable to find a valid subscription"，trace
b9cb996a1f035c0fed5dd4d1ac171ab7）——GA4 监控自此中断，以下分析基于**昨日中午的最后一次拉取 + 一周记录序列**。
恢复途径：owner 续订 Supermetrics，或告知后改用其他 GA4 通道；恢复前每日运行按规则降级为"跳过监控+提醒"。
**流量分析（截至最后拉取）**：28 天总活跃一周曲线 157→157→162→157→167→190→**211**，
最后两天 +44(+26%)，拐点与爆仓新闻(07-30/31)完全同步。结构上：
① 是搜索潮不是首页潮——首页仅 119→124，而 Aschenbrenner 相关问题页集群从合计 ~13 涨到 ~47
（dario 13、when 11、how-close 10、sa-summary 10、ko/who-is 6、karpathy 4、musk 3）；
② 渠道验证：Organic Search 8→13、AI Assistant 1→3、Direct 143→173（含暗社交/新闻 App 点击）；
③ 转化滞后正常：subscribe_click 仍 ~1，但 4 个上涨页的中部捕获(07-29/08-02)与 4 个热点入口(08-02)
已全部就位——仪表都装好了，只是电表刚被拔掉。
**爆点优化决策**：入口/捕获/页面三天内刚铺完，无新数据支撑重排；唯一缺的高杠杆件是**分享资产**——
爆点页此前用通用 OG 图。已生成专属 1200×630 卡（+439%→−67% 弧线 + "Zero verdicts moved" 钩子 +
Tracker 62.5 不动），og:image/twitter:image 已切换。工具 tools/gen_collapse_card.cjs 可复用
（Q2 13F 落地日换文案重渲）。

## 2026-08-02 (晚) — 分发事件：owner 已在 X 发出爆点种子帖
指向 /aschenbrenner-fund-collapse（专属 OG 卡 270ca2c 已先于发帖部署）。
**观察清单（下次监控恢复后逐项核对）**：
① referral/来源出现 x.com 或 t.co ＝ 里程碑「referral 现 x.com/reddit」触发；
② hot_topic_click 与 deep_collapse_mid/foot 的 subscribe_click 是否随 X 流量出现首批计数；
③ 落地页列表里 /aschenbrenner-fund-collapse 首次入榜的位次。
⚠️ 但 Supermetrics 已失效——以上全部读不到，直到 owner 续订或换 GA4 通道。种子帖发在了监控盲区里，
恢复越早，越能判断这条帖子值不值得追加（回帖补充、转发到其他渠道）。

## 2026-08-03 — 每日运行（监控盲区第 1 天）
**⚠️ GA4 监控中断确认**：Supermetrics 报 "free trial expired on 2026-08-02"。按规则跳过监控。
X 种子帖发出后的三项观察（x.com/t.co referral、hot_topic_click 首批计数、爆仓页入榜位次）全部待监控恢复后回补。
**盲区期策略**：不做任何依赖数据的转化/入口调整（避免对着旧数据瞎动），改做队列中不依赖数据的基础设施项。

## 2026-08-04 — 每日运行（监控盲区第 2 天）
GA4 仍不可用：Supermetrics "free trial expired on 2026-08-02"。按规则跳过监控。
待回补观察清单（累计）：① x.com/t.co referral（X 种子帖 08-02 发出）；② hot_topic_click 四入口赛马；
③ 爆仓页落地位次；④ **opinion_* 观点钩子赛马（EN 5 页 + zh 4 页 = 9 页）** 与 deeplink_pick。
盲区策略不变：只做不依赖数据的队列项。

## 2026-08-05 — 每日运行（监控盲区第 3 天）
GA4：Supermetrics 试用 08-02 到期，跳过。**D1 已实测查询：`events` 与 `pageviews` 均为 0 行**——
采集器尚未部署（等 owner 在 dashboard 加 `EVENTS` 绑定，见 analytics-setup.md）。监控为真空，非"数据为零"。
**今日 ship**：/invest + /zh/invest 预置 Q2 13F 定期事件捕获（8-14 截止），新位置 invest_q2_13f / zh_invest_q2_13f。
**核查结论（重要）**：`invest-consensus-page` 经查**不可做**——站内只有 2 人逐笔持仓，
用 2 人算共识或把 "Bullish per Q1 filings" 当持仓用都是编造，已标注阻塞并写明前置条件。

## 2026-08-06 — 每日运行（第一方通道首个完整读数日）
**监控口径切换**：Supermetrics 仍过期，按 CLAUDE.md 改走 D1。这是第一次有真实读数。

**a) 转化层**：`subscribe_click` = **0**，`advertise_click` = 0，`sponsor_click` = 0。
无法开展位置赛马——不是"某个位置输了"，是**还没有任何一次订阅点击**。

**b) 病毒层**：全部交互事件合计 **6 次**：`pred_expand` ×3（SG）、`readnext_click` ×3（KR/SG）。
`vote_cast` / `x_share` / `challenge_share` / `agi_test_click` / `embed_copy` / `exposure_score` 均为 0。

**c) 流量层**（服务端 PV，08-05 起）：Direct 153 / Organic Search 4 / Internal 4（human 标记）；bot 130。
落地页 human 前六：`/` 54 · `/when-will-agi-arrive` 15 · `/agi-questions` 12 ·
`/situational-awareness-summary` 8（**来源 www.bing.com** = ChatGPT 搜索索引通道）·
`/how-close-is-agi` 6 · **`/ai-stock-exposure` 6**（昨日上线即有落地）。zh 版 4。

### ⚠️ 本日最重要的发现：`ua_class='human'` 明显高估，不可直接当"读者数"报
服务端记了 **157 个 human PV、覆盖 21 个路径、几乎全部无 referrer**，
而同期 JS 侧交互事件只有 **6 次**。真实读者不会翻 21 个页面且一次都不点。
差额是**不自报身份的抓取代理**——UA 正则漏掉了它们。

**这不是小数字问题**：`/experiments` 公开承诺数字真实，营收阶梯①的位置赛马也全部读这两个桶。
在脏分母上做决策，等于把"没人来"误判成"来了但不转化"，方向完全相反。

**已修（本次 ship）**：
1. UA 正则大幅加宽（curl/python/go-http/okhttp/各类 SEO 与 AI 抓取器等）；
2. **恢复 beacon 的 JS `page_view`**——`pageviews` 是边缘总量（含代理，这正是 GA4 看不见、
   而本站增长通道恰恰需要的部分），`events.page_view` 是"JS 真的跑了"的浏览器确认。
   两张表不重叠，**报数时报两个数与比值，不报单一 human**。
3. 口径写进 analytics-setup.md，供后续运行照读。

**下轮起的报数规则**：读者量以 `events.page_view` 为准；`pageviews.hits` 作为"触达面（含 AI 抓取）"单列。

## 2026-08-07 — 每日运行（**首条完整漏斗，且来源是 LessWrong**）
监控走 D1（Supermetrics 仍过期）。

**a) 转化层**：`subscribe_click` 0 · `sub_open/submit/ok` 0 · `subscribers` 表 0 行 ·
`advertise_click` 0 · `sponsor_click` 0。站内表单昨日才上线，尚无人触发。

**b) 病毒层**：**`tool_click` = 1（史上第一次）** · `slidein_show` = 2（修复前根本记不到）·
`hot_topic_click` 1 · `readnext_click` 3 · `pred_expand` 3。

**c) 流量层**：JS 确认 PV **48**（前日 29，+19）；边缘触达 human 304。
**新增外部来源域名：`www.lesswrong.com`** ⚡

### 🎯 里程碑：首条端到端漏斗跑通（2026-08-06，德国会话）
```
12:21:47  落地 /                      ← 来源 www.lesswrong.com
12:21:53  slidein_show                 （阈值修复后真的出现了）
12:23:56  hot_topic_click → /aschenbrenner-fund-collapse
12:25:10  tool_click{opinion_collapse, skeptic} → /agi-test
```
**过去几轮建的每一个机制都按顺序点着了**：滑入框阈值修复 → 热点横幅 → 观点钩子 → 深链工具。
这是本站第一次有人走完"外部来源 → 首页 → 深页 → 工具"。

**但它停在 `/agi-test`，没有下一步。** 这是今天唯一有证据支撑的优化点。

**里程碑口径说明**：referral 里程碑原文写的是 "x.com/reddit/目录站"，
LessWrong 不在列举里，但它是**外部社区来源**且受众正是 AGI 预测圈——**按实质算触发**，
比 reddit 更对口。种子帖不是我发的，说明是自然扩散。

## 2026-08-08（每日运行 · D1 主通道）
- PV(人类/机器人): 8-05 126/106 · 8-06 162/192 · 8-07 183/146 · 8-08 303/34(截至运行时,今日人类 PV 明显放量,分布均匀在全站深页,头部: / 49、/when-will-agi-arrive 16、/agi-test 12、/ai-stock-exposure 5)
- 引荐(累计): agiscorecard.com 18 · bing 6 · duckduckgo 5 · **www.perplexity.ai 4(AI 助手渠道首次成规模回流,GEO 见效信号)** · lesswrong.com 2 · effectivealtruism.org 1 · google 2
- 转化层: subscribe_click / sub_open 4 天内 0——赛马无赢家;边缘注入表单待首个开启样本
- 病毒层: tool_click{opinion_when} 2(与 /when-will-agi-arrive 登顶深页互相印证)· invest_tool_click{nav} 1 · index_click{directory} 1 · slidein_show 6/4天(dismiss 1)
- GA4/Supermetrics: 按 2026-08-05 标准流程改查 D1,未调 GA4(通道并行保留)
- 今日 ship: /progress-index + /zh/progress-index 上线「哪条先翻转」一键投票(vote_cast{progress_index_flip}→pred_flip 订阅钩子,topic 入库);分数不变 62.5,历史盖 as-of 点

## 2026-08-09（每日运行 · D1）
- PV(人/机): 8-08 **521/325**（昨日多次发布带来的自然高峰）· 8-09 至运行时 70/49
- 8-08 落地页: / 144 · /when-will-agi-arrive 34 · /agi-test 17 · /ai-stock-exposure 12 · **/search 12** · /how-close-is-agi 11
- 引荐(8-08起): agiscorecard.com 11 · duckduckgo 5 · lesswrong 2 · bing 1 · google.com.hk 1（perplexity 本窗口未再现，样本小勿过度解读）
- 转化层: subscribe_click / sub_open / sub_ok 仍全 0；subscribers 表 0 行；vote_cast{progress_index_flip} 0
- 战略层: **agent MCP 调用 0**（/mcp 上线首日，尚无 agent 发现）；/api/trends 正常
- 需求层: **site_search 事件 0，但 /search 有 12 次人类访问** → 当日专门验证：本地复刻边缘注入 + 覆盖 sendBeacon 探针，实测 page_view / site_search{search_page} / site_search{search_suggest} / search_no_result **四类事件全部正确送达 /api/e，链路健康**。结论：0 搜索是真实行为（访问后未输入），样本仅 1 天，按规则不 churn，继续观察
- 今日 ship: E4 欧美面第 1 批 —— SunWatch /en/stock/{SNDK,MU,SPCX} + hreflang 双向对等

## 2026-08-10（每日运行 · 周一）
- **读数纠错（重要）**：8-08/09 的「人类 PV 521/539」是错的解读。JS 执行的 page_view
  同期只有 43/38（占比从 18-22% 跌到 7%），而所谓 human PV 三天翻三倍、分布在
  **132 个不同路径**、来自 US(474)/CA(185) —— 这是 UA 正则漏判的新爬虫队在扫全站。
  **真实读者 ≈ 每天 38-43（JS page_view）**，之前的两天并未出现真实读者暴涨。
- 修复：新建 `ua_audit` 表（day/ua_prefix48/ua_class/hits），收集器开始记录 UA 前缀
  聚合计数 → 下次审计能指名道姓，而不是盲目放宽正则；CLAUDE.md 写死解读规则
  （报告用 JS page_view，pageviews human 视为含机器人的上限，绝不用它当转化率分母）。
- 转化层：subscribe_click / sub_open / sub_ok / subscribers 全 0（真实分母是 ~40/天，
  样本极小，不 churn）；vote_cast 0
- 战略层：agent MCP 调用 0（上线第 3 天）；/api/trends 正常
- 需求层：site_search 0（链路已于 8-09 验证健康）
- 今日 ship：UA 审计 + 解读规则；odds 页更新承诺改为「变化驱动」并加 review log

## 2026-08-11（每日运行）
- **UA 审计首批证据（昨日新装的 ua_audit 生效）**：bot 侧 SERankingBacklinksBot 173 ·
  无平台标识的 AppleWebKit 122 · AhrefsBot 25 · SemrushBot 15（判定正确）；
  human 侧三大户 = Windows 102 / Mac OS X 10_15_7 84 / **iPhone OS 13_2_3 78**
  （占 human 总量 87%；后两个是最常见的伪装 UA，iOS 13.2.3 是 2019 年版本）；
  **CensysInspect 被误判为 human**（3）——扫描器漏网，已修
- 今日：human PV 346 / JS page_view 38（11%）/ 131 个不同路径 → 与昨日结论一致
- **不盲目改正则**：只把自报家门的扫描器（censys/inspect/shodan/expanse/masscan/zgrab）
  加进 bot；主流浏览器 UA 一律不 pattern-match 成 bot（反向误判会静默抹掉真实读者）。
  改为加装 `ua_class='js'` 维度：/api/e 的 page_view 用同一 UA 前缀记一行，
  服务端 human 高、js 近零的 UA 即伪装者——**下次有对账证据，无需再猜**
- 转化层 / 战略层：subscribe_click·sub_ok·subscribers·MCP 调用 仍全 0（真实分母 ~40/天）
- 今日 ship：UA 对账维度 + 扫描器分类修正；SunWatch EN 第 2 批（RKLB/SKHY，共 5 页）

## 2026-08-12（每日运行）
- **🎉 chatgpt.com 首次出现在引荐来源**（8-11，落 /situational-awareness-summary）。
  AI 引擎引荐累计：duckduckgo 15 · bing 9 · **chatgpt 1** · perplexity 2 · startpage
- **引用磁铁排名（外部引擎送来的落地页）**：`/situational-awareness-summary` **13**
  （ddg 6 + bing 6 + chatgpt 1）· `/sam-altman-agi-prediction` **6** · 其余个位数
- **UA 对账（新维度出结果，可定罪了）**：iPhone OS 13_2_3 = 服务端 130 / JS **0**；
  Windows NT 10.0 = 159 / 3；Mac OS X 10_ = 104 / 4 → 三大 human 大户 96-100% 无 JS，
  确认为伪装爬虫。另抓到 **"Hello from Palo Alto Networks"** 扫描器 6 次（自报家门却漏网）
- 真实读者（JS page_view）：8-11 **17** · 8-12 至运行时 4；交互事件 28（8-11 起）
- 转化层：subscribers 0 · subscribe_click 0 · MCP 调用 0
- 今日 ship：/sam-altman-agi-prediction 装意见钩子 + Tracker 内链（CLAUDE.md 明文
  要求的「Extend hooks to new risers as traffic shifts」）

## 2026-08-13（每日运行）
- **转化层首个正向信号**：`tool_click{opinion_altman}` = **1**（昨日上线的意见钩子，
  次日即有人点）。n=1，不外推，但方向对——继续观察是否累积
- 真实读者（JS page_view）：8-12 **24** · 8-13 至运行时 2
- 引荐：duckduckgo · lesswrong · forum.effectivealtruism.org · yahoo（本窗口 chatgpt
  未再现，属正常波动，样本小）
- 转化/战略层：subscribers 0 · subscribe_click 0 · MCP 调用 0
- **13F 可执行性实测（明天截止，提前一天验证）**：sec.gov / data.sec.gov / efts.sec.gov /
  whalewisdom / dataroma / 13f.info **全部经出网代理不可达**（curl 与 WebFetch 双通道），
  硬规则禁止用二手报道充当持仓 → **本项自动化不可执行**，已在 strategy/backlog 标记
  为外部阻塞并写明解除条件
- 今日 ship：/invest + /zh/invest 时间性文案与**做不到的承诺**修正（详见 OPT-LOG）

## 2026-08-14（工具上线）
- 新工具 /your-agi-timeline 上线：埋点 `calc_use{timeline_tool,label=年份}`（年份分布=
  读者对 AGI 时点的真实分布，这是全站独有的需求数据）、`challenge_share`/`x_share`、
  `subscribe_click{timeline_tool}`、`index_click{timeline_tool}`、`embed_copy`
- 导流：/when-will-agi-arrive（全站最大流量深页）加 `tool_click{opinion_whenagi}` 钩子
- 观察项：年份分布是否集中；timeline_tool 的订阅点击 vs 其他位置赛马

## 2026-08-14 (每日自动运行 · D1)
真实读者(JS `events.page_view`,唯一诚实口径):08-08 43 · 08-09 38 · 08-10 31 ·
08-11 17 · 08-12 24 · 08-13 25 · 08-14 1(当日仅过 4 小时)。边缘计数 `pageviews`
的 human 列同期 275→190,但 JS 占比仅 7-13%,仍是 UA 正则的上界,含未识别爬虫。
**按 JS 口径的真实分布(全量)**:/ 76 · /when-will-agi-arrive 40 · /agi-test 5 ·
/ai-stock-exposure 4 · **/search 0 · /mcp 0**。也就是说真人几乎只落在两个页面上,
其余页的「human」PV 主要是爬虫。
**里程碑达成:AI/搜索引擎引荐周环比翻倍 9 → 18**(perplexity.ai 3、chatgpt.com 1、
claude.ai 1 首次出现;duckduckgo 14 > bing 7 > google 3)。GEO 是当前唯一在增长的通道。
转化层:`subscribe_click`/`sub_open`/`sub_submit`/`sub_ok` 仍全 0;`subscribers` 0 行,
`status='stored'` 0 行(无积压)。互动事件 28 天:exposure_score 16(最后 08-11)、
tool_click 13(exposure_en 5 / opinion_sasummary 4 / opinion_when 2 / opinion_altman 1 /
opinion_collapse 1)、vote_cast 7、readnext_click 7、slidein_show 19/dismiss 3。
需求层:`site_search` 与 `search_no_result` **零条**——但 /search 的 28 次 PV 全是无 JS
访问(真人 JS 命中 0),所以这不是表单坏了,是**没有真人到过那个页面**。词表为空属预期,
不据此改表单(改了也没人看见);先解决入口可见性再谈推荐词。
战略层:`site_search{location='mcp'}` 0,/mcp 页 0 PV —— agent 首调尚未发生。
13F:Q2 截止日当天再测 sec.gov / data.sec.gov / efts.sec.gov,**三个域名全部 000**,
外部阻塞未解除,不重复承诺。

## 2026-08-15 (每日自动运行 · D1)
🎉 **里程碑:首个站内订阅完成(sub_ok=1)。** 2026-08-14,j***u.23@g***.com（完整地址仅存 D1 subscribers 表与私有仓,公开仓一律脱敏）,
澳大利亚,en-US,首页 footer_cta,全漏斗 1/1/1/1(click→open→submit→ok)。
⚠️ status='stored',synced_ts=null——地址已第一方存档,但 BEEHIIV_API_KEY 未配,
**没同步进 beehiiv,承诺的邮件一封都发不出去**。积压=1,从今天起每日盯这个数。
真实读者(JS):08-13 25 · 08-14 37 · 08-15 8(进行中)。08-14 是两周内次高。
引荐(08-08 起 7 天):duckduckgo 11 · bing 4 · **lesswrong.com 4 · EA 论坛 2(社区
引荐首次成规模)** · claude.ai 2 · google 2+2 · chatgpt/perplexity/cn.bing 各 1。
Telegram 组合绑定(08-13 上线):tg_watch 0,曝光两天,不判死。
战略层:site_search{mcp} 0;13F:sec.gov 复测仍 000(第三日),阻塞未解除。
readnext_click{wrong} 2——「败绩页」被点了两次,与今天刷新 did-open-source 页呼应。

## 2026-08-15 (owner 决定) — Stripe 验证暂缓,启用无密钥模式
owner:「先不做,然后你看你怎么自动化解决,现在就1个订阅」。自此 status='stored'
是常态不是故障,积压数照报不报警。翻转日义务升级为「完整邮件包」:收件名单(topic
行+全量行)+ 可直接粘贴的邮件草稿,owner 唯一手工步骤=粘贴发送(~1 分钟)。积压
到 10/50 时报 CSV 名单提示导入。Boosts 在验证前保持关闭,不唠叨,至多在订户≥50
里程碑时再提一次。/api/sync-pending 保留待命。

## 2026-08-15 (owner 配置) — AI Crawl Control 分层完成
owner 按指导在 Cloudflare AI Crawl Control 完成爬虫分层:**仅拦 Meta-ExternalAgent**
(24h 内 2.57k 请求/7.42MB,占全站 AI 爬虫流量 79%,纯训练搬运零引荐回报),其余
全放行:OpenAI 三件套(GPTBot/OAI-SearchBot/ChatGPT-User)、BingBot(ChatGPT 搜索
的索引源,永不拦)、ClaudeBot、PerplexityBot、Googlebot、Applebot(搜索版)、
Amazonbot、PetalBot(中文面引用源)。Managed robots.txt 保持关闭(手工 robots.txt
的 Allow 策略不被覆盖)。待 owner 下滚补拦:CCBot/Bytespider/Applebot-Extended/
Google-CloudVertexBot/Timpibot/Diffbot。Pay Per Crawl 暂不开(Charge 需支付入驻,
Block 对不付钱的爬虫效果等同;开通后首个收费对象=compass /api/quote,页面免费换
引用、数据接口收费)。**每日验证两条:①Meta-ExternalAgent 应归零;②四家引用引荐
(perplexity/chatgpt/claude/duckduckgo)不得下跌,跌=误伤,立刻报 owner 回滚。**

## 2026-08-16 (每日自动运行 · D1)
**拦截验证通过(agi)**:ua_audit bot 命中 08-13 638 → 08-14 490 → 08-15 233 →
08-16 31(当日进行中),Meta-ExternalAgent 拦截生效、逐日衰减。**且无误伤**:
AI/搜索引擎引荐 prev7 16 → this7 **24(+50%)**,perplexity/chatgpt/claude/ddg 全在。
「拦白嫖、留引用」的分层策略两项指标同时兑现。
转化层:08-15 又一次 footer_cta 的 subscribe_click + sub_open,**但无 sub_ok**——
footer_cta 累计 2 次打开 / 1 次完成。位置赛马仍只有这一个位置有过转化,n 太小
不足以复制模式,但「打开后未完成」是新的掉队信号,继续观察不急改。
subscribers 仍 1 行 status='stored'(无密钥模式,正常,不报警)。
真实读者(JS):08-13 25 · 08-14 37 · 08-15 38 · 08-16 13(进行中)。
战略层:site_search{mcp} 仍 0(agent 首调未发生);/mcp 与 registry 均健康。
13F:伯克希尔已刷 Q2;ARK 等 6 家的 Q2 追踪文尚未发布(8-14 才申报,媒体目前只
覆盖伯克希尔),**不猜、不单源更新**,继续排队每日复查。

## 2026-08-16（owner 贴入 Bing Webmaster「AI Performance」截图）

**读数（30D，来源 Microsoft Copilots and Partners，Bing 自注为 sample）**
- Total Citations **564** · Avg. Cited Pages **2** · 峰值日 08-12：citations 58 / cited pages 10
- 曲线形状：~07-26 之前贴地为 0 → 07-26 起抬头 → 07-31~08-01 尖峰约 105 →
  回落 → 08-07 起第二轮抬升，且 **cited pages 从 2 升到 10**（广度在扩，不只是同一页被反复引）

**最可信的一条因果：07-12 的 Bing Webmaster 一键导入（owner 亲手做的那 10 分钟）。**
在那之前本站对 Copilot 与 ChatGPT 搜索是结构性不可见的（ChatGPT 搜索走 Bing 索引，
约 73% 结果重合，见 CLAUDE.md）。图上 0 基线一直持续到 ~07-26，正好是「入驻 → 抓取 →
建索引 → 被引用」两周左右的管线时延。这不是内容突然变好，是**通道从关到开**。

**其余按贡献度排（都是既有做法，非本次新增）**：原创可引用数据面（data.json CC BY 4.0
+ llms.txt 26KB + /for-agents）· 每页的引用格式（答案胶囊先给判定、表格、可见 FAQ 与
FAQPage JSON-LD 逐条一致、单 h1、带日期的统计、一手源外链）· robots.txt 显式放行
AI 爬虫 + IndexNow · 07-16~07-25 的发布密度（多语言 ×14、工具群）与 08-01 的
/aschenbrenner-fund-collapse（尖峰时点吻合）。

**必须同时说的三条反面**
1. **引用 ≠ 流量。** 同期 D1 里 bing 引荐累计 **9**，真实读者（JS page_view）约 17/日。
   564 次引用没有变成点击——AI 答案本来就是 zero-click，这一层做的是可见度与权威，
   不是访问量。不要拿 564 去和访问数并列。
2. Bing 自己标注这是**抽样**，不是全量计数。
3. Avg cited pages = 2 说明历史上高度集中在少数几页；08-12 的 10 才是值得高兴的部分。

**下一步只差一个 owner 动作（约 1 分钟）**：截图正好截在有用的部分之上。
AI Performance 页面往下滚有「被引用页面 / 查询」明细表（右上角 Download 可导出）。
拿到它才能回答「Copilot 到底在引哪几页」——那决定了要复制哪一种页面形状。
在此之前，任何「因为写了 X 所以被引用」的逐页归因都是猜的，不写进结论。

### 补：Bing AI Performance 明细（同日 owner 追加两张截图）

**Grounding Queries（6 行，184 次 = 可见部分）**
| 查询 | 引用 | 引用份额 |
|---|---|---|
| leopold aschenbrenner 2024 situational a… | 96 | 33.10% |
| are we close to agi | 27 | **37.50%** |
| aschenbrenner essay | 24 | 28.92% |
| leopold aschenbrenner situational awaren… | 14 | 19.44% |
| agi timelines | 13 | 16.46% |
| how close are we to agi | 10 | 20.83% |

**Pages（前 10，502 次 ≈ 564 的九成）**
`/situational-awareness-summary` **237**(42%) · `/what-is-agi` **91** ·
`/how-close-is-agi` 76 · `/when-will-agi-arrive` 37 · `/ai-orders-of-magnitude-explained` 18 ·
`/who-is-building-agi` 13 · `/how-will-we-know-agi-arrived` 8 · `/how-fast-is-ai-improving` 8 ·
`/was-aschenbrenner-right` 8 · `/invest/cathie-wood` 6

**要点**
1. **真正的资产是「引用份额」，不是引用数。** "are we close to agi" 这种通用高意图问题上
   拿到 **37.5%** ——Copilot 回答它时超过三分之一的引用指向本站。这比 564 这个总数值钱。
2. **两个簇**：Aschenbrenner 实体簇（三条查询 134 次，占可见 73%）＝本站是「他本人」的
   参考源；通用 AGI 时间线簇（50 次）体量小但份额高。**前者是人物依赖型资产**，
   若他淡出新闻会蒸发；后者才是耐久的那部分。
3. **我上一条写的「引用面 100% 是 explain-Aschenbrenner」是错的**：`/invest/cathie-wood`
   有 6 次，投资板块已经开始被引，只是量小。
4. 引用高度集中：前两页就占 58%。Avg cited pages=2 的成因在这里。

**据此做的改动（选页依据是 Pages 表，不是猜测）**：给引用量最大且**缺少活数字**的三页
挂上首屏「聊天答案会过期的那部分」区块 —— `/situational-awareness-summary`(237)、
`/what-is-agi`(91)、`/ai-orders-of-magnitude-explained`(18)，直给 62.5/100（截至
2026-08-08）+ 逐条判定与翻转条件入口。`/how-close-is-agi`(76)、`/when-will-agi-arrive`(37)、
`/who-is-building-agi`(13) 本来就有，未重复改动。
埋点 `index_click{what_is_agi_live / sa_summary_live / ooms_live}`。

**自我更正**：我先按直觉挑了 `/will-agi-arrive-2027` 并已改完，随后 Pages 表显示它
**一次引用都没有**，已回退。教训写在这里：在拿到明细表之前挑页面就是猜，而这次猜错了。

### 补：Bing Site Explorer（2026-08-16 owner 第三张截图）

**读数（近 6 个月，agiscorecard.com 根域）**
- 已索引 **122** · Error 0 · Warning 0 · Excluded 3；Folder URLs 125
- Clicks **15** · Impressions **353**（整体 CTR 4.2%）· Backlinks **19**
- 逐页：`/situational-awareness-summary` 6 点击 / 221 曝光（CTR 2.7%，
  **Discovered 2026-07-22**，末次抓取 08-12，27.4KB）· `/ai-orders-of-magnitude-explained`
  4 / 24（**CTR 16.7%**）· `/`(root) 1 / 5 · `/ai-2027-scenario-explained` 1 / 16 ·
  `/how-close-is-agi` 1 / 9

**三条结论**
1. **索引覆盖是个真缺口**：sitemap 191 条，Bing 只索引 **122** 条（约 64%）。
   被引用的前提是先被索引，而刚发的 16 个多语言页恰恰是引擎最不着急抓的那类。
   查因发现：**IndexNow 密钥文件早在站点根目录，但站上从来没有任何东西去 ping 它**
   （本仓此前连 `.github/workflows/` 都没有）。已补一个每周计划任务，成本核算写在
   workflow 注释里：每月约 1.5 分钟，占额度 0.08%。挂 schedule 不挂 push——
   IndexNow 是外部副作用。
2. **「07-22 发现 → 07-26 开始被引用」独立佐证了引用曲线的因果**：Site Explorer 显示
   该页 Discovered 2026-07-22，与 AI Performance 曲线 07-26 抬头相隔 4 天。这与
   07-12 Bing 导入 → 抓取 → 索引 → 被引用的管线时延一致，不是内容突然变好。
3. **两页 CTR 差 6 倍**：`/ai-orders-of-magnitude-explained` 4/24 = **16.7%**，
   `/situational-awareness-summary` 6/221 = **2.7%**。前者曝光少但点得动，后者曝光大
   但标题/描述可能与查询意图错位——**这是下一轮 CTR 重写的第一优先**，且证据是
   Bing 自己的曝光/点击，不是猜测。注意样本极小（24 次曝光），别过度解读。

**注意口径**：这里的 Clicks/Impressions 是 **Bing 网页搜索**，与 AI Performance 的
564 次引用是两套完全不同的东西，不可相加、不可互相印证。

## 2026-08-16（续：D1 转化赛马，阶梯①）

**28 天第一方读数**（`events.page_view` = JS 真跑了的真实读者）
- page_view **368**；`/` 106 · `/when-will-agi-arrive` 68 · `/situational-awareness-summary` 37 ·
  `/how-close-is-agi` 22 · `/sam-altman-agi-prediction` 11 · 其余合计约 124
- 订阅漏斗：subscribe_click 2 → sub_open 2 → sub_submit 1 → **sub_ok 1**
- subscribers 表：**1 行**（2026-08-14，`footer_cta`，路径 `/`，en-US，AU，status=stored）
  —— 与 owner 8-15 说的「现在就 1 个订阅」一致，**不是新里程碑，不当新消息报**

**决定性发现：`subscribe_click` 全站有史以来只从 `footer_cta` 触发过，而 `footer_cta`
只存在于 index.html。** 深页用的是 `deep_*`，一次都没响过——**0 次点击 / 约 262 次深页浏览**。
按首页 1.9% 的点击率，262 次浏览的期望值约 5 次；观测到 0 次的概率约 0.7%，
所以这不是样本小，是深页那一版**真的不行**。

**为什么不行（对比唯一转化过的那条）**
| | 首页 footer_cta（转化 1） | 深页 deep_*（转化 0） |
|---|---|---|
| 标题 | Be first to know when the score moves | Get the weekly AGI progress briefing |
| 承诺 | 事件式：判定翻转/分数变动时**一封** | 周期式：**每周**一封 |
| 差异化 | 点名「no other tracker has」 | 无 |

**而「每周」这个承诺本站根本兑现不了**（无 ESP 密钥，一封都没发过；能兑现的是翻转日
邮件工具包）。所以这既是转化问题，更是**诚信问题**：61 个英文页 + 29 个中文页在承诺一份
不存在的周报，`/advertise` 甚至在**售卖这份周报里的赞助位**。

**本轮改动**：把全站订阅承诺统一改成已被验证、且能兑现的事件式说法；
`/privacy`、`/advertise`、`/about`、`/for-agents` 的「weekly briefing」措辞一并改为
事件式；zh 侧改为「不是每周硬发的新闻信，分数不动就没有邮件」。
全站已无不可兑现的每周承诺（grep 归零）。

**下一轮看什么**：`subscribe_click{deep_*}` 是否从 0 起步。若两周后仍为 0，说明问题不在
文案而在**位置**（深页 CTA 埋得太深），届时再动位置，不要再改文案。

## 2026-08-17（周一·每日自动运行）

**监控（D1，28 天）**
- page_view **368**（真实读者，JS 已跑）；`/` 106 · `/when-will-agi-arrive` 68 ·
  `/situational-awareness-summary` 37 · `/how-close-is-agi` 22
- 订阅漏斗：subscribe_click 2 → sub_open 2 → sub_submit 1 → sub_ok 1；
  subscribers 表仍为 **1 行**（8-14，`footer_cta`，status=stored）。**非新里程碑**
- **`site_search` / `search_no_result` 均为 0** —— /search 28 天零使用。需求层这一路
  暂时不产出选题种子，不要硬凑；下次有量再看
- 引荐来源：(direct) 274 · agiscorecard.com 54 · **duckduckgo 22 · google 10 ·
  bing 12(www+裸域) · perplexity 5 · claude.ai 2 · startpage 1** · lesswrong 5 ·
  EA 论坛 3。**AI/搜索引擎合计约 52，占非站内流量的显著一块，且 ddg > google**
- `index_click{*_live}`：本轮仍为 0（钩子昨天才上线，属预期）。判据不变：两周后仍为 0
  就如实报告该通道是纯品牌资产

**ship：赔率取数自动化（strategy Phase 1 项打勾）**
「赔率 vs 证据」第一期在 8-08，按周更已欠一期。卡点不是时间，是硬规则「赔率必核实」
而沙箱够不到 gamma-api.polymarket.com（实测 000）。沿用 EDGAR/glama 的「替身执行器」
模式改由 runner 每周取。**首次机器核实读数：Yes 9% / No 91%，成交量 $94,555，
市场未关闭，fetched 2026-08-17T04:06:09Z。**

**没有发第二期，这是刻意的。** 第一期记的是手抄的「≈11% Yes」且没有精确时间戳，
所以 ~2 个点的漂移**属于指示性、不是实测的移动**——基线本身不够精确，不足以宣称
一次移动。该页自己立过更严的规矩「更新在有变动时，不在日历上」，为凑周更发一期
就是 filler，会毁掉这个格式的可信度。因此本轮只做三件事：把复核结果写进页面的
复核日志、把赔率读数升级为机器核实（此后可测量而非指示性）、strategy 打勾。

## 2026-08-17（续：需求洞察 + 同类竞对对比简报，供后续每日运行取材）

**一手需求信号（本轮依据，全部已发生而非猜测）**
1. Bing Grounding Queries：判定型通用问题份额高（"are we close to agi" 37.5%、
   "how close are we to agi" 20.8%、"agi timelines" 16.5%）——阶梯⓪的立足点不变。
2. 队列核查：CITATION AMPLIFICATION 并未清空，`forecaster-verdicts-dataset` 仍挂着
   ——本轮完成并打勾（详见 OPT-LOG 2026-08-17 补充运行）。
3. r/singularity 舆情（RedCurate/Karmdit 汇总）：社区共识中心已压到 2027–2028，
   讨论从抽象奇点转向「具体能力锚点」——与本站「判定+翻转条件」形态同向，
   证明台账形态踩在需求演化方向上。

**竞对差距表（2026-08-17，WebSearch 核实）**
| 站点 | 有而我无 | 无而我有（护城河） |
|---|---|---|
| ai-2027.com（Kokotajlo 等） | 月度级叙事情景+时间线研究报告、品牌势能 | 不给自家预测打分；第三方 ai-2027-timeline.online 专门替它对账——「对账」需求真实存在，本站自己就是对账层 |
| lifearchitect.ai | 「conservative countdown」单人百分比仪表、更新勤 | 无翻转条件、无逐条判据、无机器可读数据集；他的数是主观仪表，62.5 是可审计台账 |
| epoch.ai | 数据权威（本站引用它作一手源） | 只有趋势数据，无「预测 vs 现实」判定层 |
| Metaculus | 活聚合（q5121 现读 ~2032-33）、大社区 | 无逐人评分卡、无一手源台账；聚合会动但不留判定痕迹 |
| theagiclock.com 等倒计时站 | 传播性强 | 无任何证据层——纯情绪产品 |
**结论**：没有任何竞对做「逐预测者×判定×日期×一手源×翻转条件」的机器可读台账。
本轮把 forecaster_timelines 补成这个形状（data.json 每位 5 新字段），是把引用面
从「Aschenbrenner 的 8 条」扩到「9 位预测者全部」而不新增 URL——对冲 73% 实体
依赖的唯一非重复做法。

**本轮最大发现是自查性的**：核实一手源时抓出全站错数——n=2,778 调查真实值
50% by **2047**（arXiv:2401.02843 原文），全站此前写 2040 且无出处。82 个文件
全量更正（详见 OPT-LOG）。**教训入库：凡「established site data」里没有一手源
URL 的数字，第一次被引用前必须回源核一次**——这个 2040 从 6 月底一路被复制到
74 个页面和 8 个语种。

**给后续每日运行的选题种子（均有证据来源，非猜测）**
1. `ai-2027-vs-reality`（判定型对比页候选）：证据=第三方已自发做 ai-2027-timeline
   .online 替 AI-2027 情景对账（"reality is running ahead on geopolitics"）+ 本站
   /ai-2027-scenario-explained 已有 Bing 曝光（16 次、1 点击）。角度必须与既有页
   区分：现状对账（哪些月度节点已到期、到期的兑现没有），不是情景介绍。发布前照例
   过查重（situational-awareness-vs-ai-2027 已存在，需确认差异角度成立）。
2. `agi-definitions-compared`（定义型候选）：证据=竞对对比中「定义不同→时间线差
   十年」是 lifearchitect（median human+embodiment）/Metaculus（四条硬判据）/本站
   （drop-in remote worker vs autonomous AI researcher）三方实际分歧点；Bing 侧
   /what-is-agi 91 次引用证明定义型问题吃引用。查重对象：what-is-agi 的定义节。
3. 每季度（下次 2026-11）：用 forecaster_timelines 的 checked 字段做「预测者台账
   复核」——Metaculus 活读数、Samotsvety 是否再更新、Musk 截止日到期（2027-01-01
   起他是第一个可判定的人物页，届时 /elon-musk-agi-prediction 是现成的判定型刷新，
   有 Bing 已引用记录支撑）。
## 2026-08-17（续：周一深审计 + 阶梯⑤ 合规修补）

**审计一：站内搜索这条「需求信号环」是不是活的**
- `site_search` / `search_no_result` **自 D1 上线（8-05）以来一次都没触发过**；
  `/search` **一次都没被打开过**（`page_view path LIKE '/search%'` = 0）
- 入口只在 2 个页面：`index.html`（首页搜索框，位置并不深，在 readnext 之后、目录之前）
  与 `404.html`
- 同期规模：全站真实浏览 **427**，首页 **113**
- **结论（带证据强度）**：按站内搜索 1–3% 的常见使用率，113 次曝光期望值只有 1–3 次，
  **观测到 0 与「使用率低」一致，但不足以判死这个功能**。因此**不拆 /search**。
  但「每日运行必读这张表」是浪费——每天查一张恒空的表，还制造「我们在倾听用户」的
  错觉。CLAUDE.md 已把它降级为「有量才读」（月度，或全站真实读者破 1000 后再纳入例行）。

**审计二：我自己 8-16 的检查失误**
8-16 我用「页面里有没有提到 progress-index / 62.5」来判定高引用页是否已挂活数字，
据此放过了 `/how-close-is-agi`（当时读数 tracker:1、62.5:2）。但规则要的是**首屏**区块，
正文里提一句不算。重查发现两页缺：

| 页面 | 真实读者(28d) | Bing 引用 | 首屏活数字 |
|---|---|---|---|
| `/when-will-agi-arrive` | **68**（深页最多） | 37 | **缺** → 已补 |
| `/how-close-is-agi` | 22 | 76 | **缺** → 已补 |

**修的不只是这两页，是这个检查方式**：`tools/validate.py` 加了硬校验，高引用页名单里
任何一页缺首屏区块就 FAIL。已做反向自测——临时抽掉标记串，校验立刻 FAIL，恢复后 OK。
靠「下次记得」不是修复，靠校验才是。

## 2026-08-18（每日自动运行）

**监控：本轮做不了，如实记。** Cloudflare MCP 令牌过期，D1 读不到（`d1_database_query`
返回 requires re-authorization）。**没有用昨天的数字冒充今天的读数。** 需要 owner 在
交互式会话里重新授权 Cloudflare 连接器后才能恢复；恢复前监控层空档。

**ship：新鲜度信号全面对账（阶梯⑤）**
起因是自查发现一个我自己造成的错：8-16/8-17 给 5 个高引用页加了首屏活数字区块
（实质性新内容），**但一个都没 bump dateModified**。最糟的是
`/ai-orders-of-magnitude-explained`（18 次引用）仍写着 2026-06-30，**陈旧 49 天**——
而 CLAUDE.md 的 GEO 规则明写 AI 引擎重度加权新鲜度。

修法：日期**取自 git 历史里区块真正引入的那一天**（8-16 / 8-18），不是写今天——
写今天就是假新鲜，那正是这条规则要防的事。

顺带查出一整类漂移：**全站 7 页的可见「Last updated」与 JSON-LD `dateModified` 不一致，
且全部是可见日期更旧**（读者看到过期日期，引擎看到新日期）：agi-2027-resolution、
agi-odds-vs-evidence、calibration、changelog、index、progress-index、
what-jobs-are-safe-from-ai。已同步，并把 sitemap 的 21 条 lastmod 对齐到各页 dateModified。

**真正的修复是校验**：validate.py 新增「可见日期必须等于 dateModified」全站检查，
已做反向自测（把首页可见日期改成 7-01 → 立刻 FAIL，恢复 → OK）。这类漂移不报错、
没人会注意，只能靠校验拦。

## 2026-08-21 · 每日运行日结(与 owner 专项同日,ship 额度=专项两页,本轮零改页)
- **里程碑 ×2(首次,worker owner-alerts 会自动推 TG,此处记档)**:
  ① **史上前两个真实订阅者**(sub_ok 累计 2/2 存 D1,status=stored 正常):
  08-14 AU/footer_cta;08-19 CN 经 google.com.hk 落 / 首页 post_scorecard,
  zh-CN 用户——中文订阅假设首次有正样本。距 09-30 证伪线(累计 <5 判死)还差 3。
  ② **首个外部 MCP 调用**(08-18,site_search{mcp} ×2):调用方自标识
  mcp-reputation-scanner-canary,是 MCP 生态信誉扫描器验证服务器(tools/call
  真实打到 sunwatch_ledger),**不是真实 agent 用户,也已排除 CI 自测**(生产
  worker 埋点,标签不在任何 workflow 里)。定性:注册表信誉管线在动,好事但
  不算「首个 agent 用户」。
- 转化层 14d:subscribe_click 4 → sub_open 3 → sub_submit 2 → sub_ok 2,漏斗
  下半段 100% 转化,瓶颈仍在曝光量。赛马:post_scorecard 与 footer_cta 各出
  1 单,样本太小不判胜者。index_click{*_live} 引用页活数字钩子仍 0(hero/
  directory 各有点击不算),两周判定窗到 08-30。
- 流量层 7d:JS page_view 30–53/日,稳中有升。搜索引荐 14d:**duckduckgo 28
  首次超过 google 16**,bing 8;社区面 EA Forum 7 + LessWrong 5 持续。
  AI 引擎引荐 14d 合计 7(claude.ai 3 / perplexity 2 / copilot 2),未达
  周环比翻倍口径,如实记。
- 需求层:site_search 仅上述 2 条 MCP 探针,站内搜索仍无人类样本,按 08-17
  降级令不例行读。引用放大队列:今日新种 2 项均带动工前置(Bing 9 月明细 /
  英文版判定线),按规矩不提前动工。战略清单:周一项不适用;13F 下窗口 ~11 月;
  x402 复查 ~11 月。

## 2026-08-22 · 每日运行日结(周六,昨日超额发布后的收敛轮)
- 转化层 48h:订阅漏斗 0 新事件(累计仍 2,均 stored);pick_ledger 0(上线
  <24h);index_click{*_live} 仍 0——两周判定窗 08-30 到期,届时按规则如实裁决
  「引用→点击」假设。
- 流量层:昨日真人 JS pv 20(正常区间);两个新页(eu-ai-act/协议记分板)暂无
  JS 浏览——发布 <48h,索引传导中,IndexNow 已推,正常。/forecaster-leaderboard
  有 1 次 bot 抓取(leaderboard 新区上线后首个爬虫访问,好信号)。
- 优化轮:引用放大队列 2 项均带动工前置(9 月 Bing 明细/英文版判定线),按规矩
  不提前动;昨日已 ship 2 页+leaderboard v0(超常规配额),今日零改动是纪律
  而非怠工。战略清单:周六无到期项。
- 舰队面:第五站 gamesledger 昨夜上线(16 判定页 + AI 披露追踪器,独家首采
  35.0%),PRD/手册/判定线齐;分发包 W34 新增 1️⃣B(35% 数据,HN 首选)。

## 2026-08-22（当日补记）— run_worker_first 修复实证 + Gridlings 首玩家

- 全舰队静默计数 bug:gamesledger/gridlings/buysomething 三新站 wrangler 均缺
  `run_worker_first: true`,HTML 请求绕过 worker,服务端 page_view 从未记录
  (gamesledger 仅有的 11 条 pv 全是扫描器打非资产路径)。e8873ba 统一修复,
  **07:03 起 sourceradar 记录到首批真实 pv(US×3+JP×1)= 修复实证生效**。
- Gridlings 上线 12 分钟即有第一位真人玩家(IN,06:39 play_start daily:2026-08-24,
  JS 信标通道一直正常)。尚无 solve;订阅漏斗 subs=0。
- 教训入档:新站拷贝 worker 模式时,wrangler 的 assets 配置必须整块继承
  (agi 手册 8-05 已有此坑记载,今日三站重蹈——说明该检查应做进建站清单)。

## 2026-08-22（owner 贴 GA4 周对比,8/15-21 vs 8/8-14）— 周流量翻倍,invest 漏斗点亮

- **总事件 1,425(+104%),page_view 413(+103%),first_visit 372 ≈ session_start 385**
  ——几乎全新访客;首页 -13% 而深页全线上涨 = 搜索/AI 引用驱动的健康 GEO 形态。
- **第一大页换人:/when-will-agi-arrive 61 次(+90%)**——Bing 37.5% 引用份额那道题,
  引用→点击在兑现。页面核查:活数字胶囊/五键意见钩/时间线钩齐全且本周有真实点击
  (tool_click opinion_when),8-18 新鲜度——**不动它**(防折腾)。
- **invest 线拿到第一批真实使用**:exposure 页 16 次(+1500%),exposure_score 14 次
  (真的有人在打分篮子),invest_tool_click 8(nav 3/nav_compass 3/cn_more 1/
  starthere 1——全是导航流入,**Pro 桥 0 点击,0/14**)。PRD 判定线(11-15 前桥点击
  ≥5)当前 0;样本 14 太小,不据此改版,继续观察。
- 本周订阅链路完整走通一次:sub_open 2 → sub_submit 1 → sub_ok 1(现有 2 订阅中
  1 个来自本周)。slidein_show 35(+192%)在干活。
- Forecaster Leaderboard +700%(8 次)、AI 2027 Scenario +250%、What Is AGI 新入榜
  +12——新资产被发现中。
- 行动:仅记档。所有 riser 页转化装备已齐,唯一缺口(Pro 桥 0 转化)样本不足,
  不折腾。下一读数点:周一记分板。

## 2026-08-22（owner 指令:对比各站相互学习,特别诊断 tds 零流量）— 六站记分板 + tds 结构性诊断

**各站已验证的优势方法(相互移植清单):**
- **agi:判定型问题页+活数字**——本周 GA4 翻倍(+104%),第一大页 /when-will-agi-arrive
  (+90%)正是 Bing 37.5% 引用份额那道题;意见钩有真实点击。可移植:所有站的信息页都
  该长成「问题标题+答案胶囊+一手数据」形态(tds 楔子页、sourceradar 选品情报页适用)。
- **bpj:llms.txt+MCP 注册表打包**——AI 爬虫引用队列(OpenAI/Google/Anthropic/PPLX)
  最重;已移植 agi(8-15)、gamesledger(IndexNow+llms.txt)。
- **eco:信息页→联盟转化**——26 次联盟点击/7天,全舰队唯一在流动的钱路径。可移植:
  bpj(联盟映射已完成,等 owner 账号)。
- **tds:MCP 可调用工具(答案带数据源与局限声明)**——全舰队最先进的机器可读层,
  值得反向移植给 agi(/mcp 已有)与 bpj。
- **gamesledger/gridlings:平台供给型分发**(门户投稿在 owner 手里)+ 纯 CI 自进化
  (trends 自动发现、每日题自轮换)。sourceradar 今日装上读者热度自重排(第①层)。

**tds 零流量诊断(一手数据,写进其 CLAUDE.md「安全楔子策略」):**
爬取全舰队最重(Googlebot 600-815/天+三家 AI 爬虫各 70-120/天)但 3 天仅 1 次 Google
点击;真人 ~10 JS pv/天;affiliate_click 至今 0。机器无缺件——瓶颈是结构性三连:
SafeSearch 过滤产品查询、AI 助手拒答成人推荐(引用杠杆关闭)、域龄 <1 月。结论:
**不是执行问题,别再给它抄别家作业**;唯一可赢楔子 = 消费者保护信息层(关税/防骗/
付款保障/规格数据——唯一的 Google 点击正落在 /data/)。每日改动只投楔子,产品页
冻结;判定线 2026-10-01:楔子 28 天自然点击 ≥10 续投,否则降为每周维护。

## 2026-08-23 日结
- JS 真实浏览昨日 31;7 天引荐:google 13/ddg 13/bing 4/**api.microsoft.ai 1(AI 引擎引荐)**/
  **forum.effectivealtruism.org 2(首个社区自然外链信号,值得周一深看是哪个帖)**
- 订阅 2(均 stored 未同步);sub_ok 28d=2;`index_click{*_live}` 7 天 0(判定日 8/30)
- `site_search{mcp}` 2 次=扫描器金丝雀(同秒+label 自认),非 agent 采用;注册表条目已被扫描器发现
- 今日出厂(本会话早间):孙宇晨双栏审计 EN/zh + 范式实验台账 EN/zh;215 页 validate OK

## 2026-08-24(周一)— 四站对抗记分板(D1 现查,7 天窗,提前于 04:00 Routine 完成)

| 站 | 真人 PV(JS) | 爬虫/AI 态势 | 离钱转化 | 本周移植 |
|---|---|---|---|---|
| agi | 197 | 服务端非人 1,196(约 6:1) | sub_ok 1;invest_tool_click 3(Pro 桥累计仍 <5) | 输出:快反模式→全舰队雷达 |
| bpj | 184(已剔 /__selftest) | bot 255 | **sub_ok 1 = 舰队首个真实订阅**;go 5 | 输入:无 → 输出:slide-exit 模式→eco;自身补移动端触发 |
| eco | 146 | ⚠️ mcp_call「非CI」133 不可信——ua_class 列 08-24 才上线,历史行全 NULL;下周一才有首个干净周 | affiliate_click 14/7d(约 2/日,稳);sub2 0(Alarm 今日刚上线) | 输入:bpj slide-exit → Faktencheck-Alarm |
| tds | 48 | bot 89 | affiliate_click 0(链路 08-24 复核健康,是真没人点) | 输入:D1 测量口径(已完成) |

结论:①bpj 是本周唯一产出真实订阅的站,其 slide 模式已双向放大(eco 移植 + 自身移动端);
②eco 联盟点击是全舰队最稳的钱线信号(2/日),但 P0(PartnerNet 归属)不解除就分文不进;
③已知陷阱第 4 次出现(eco mcp「增长」),口径规则再次生效——凡「agent 采用」结论必查
ua_class 与参数重复。

**创业雷达首日判读**(data/startup-radar.json,PH 30 + HN 32 条,niche_hits agi×10、
gridlings×1):多数命中是泛词(claude/gpt 撞名)。一条值得过需求门的种子:HN 热帖
「Anthropic appears to be A/B testing reduced effort levels in Claude Code」——对应
"is claude getting dumber / claude nerfed" 这一**长期反复出现的真实查询**,判定型两栏
账形状(用户宣称 vs 厂商声明+可复跑基准)与本站方法完全同构。已种入 backlog 待
04:00 run 按三门正式裁定。PH 无命中站点位需求,不硬凑——首日空产出是正常态。

## 2026-08-24 日结(daily run,04:00 Routine;当日大部分工作已由通宵会话提前完成)

- **`index_click{*_live}` 假设判据(截止 08-30)**:引用页活数字钩子上线第 8 天仍 **0 点击**;
  28 天仅有的 3 次 index_click 全部来自首页(directory 2 + hero 1)。距两周判定线还有 6 天,
  趋势偏向「纯品牌资产」结论,08-30 如实裁定,期间不再加钩子。
- 订阅漏斗 28d:subscribe_click 4(footer_cta 2 / post_scorecard 2)→ sub_open 3 →
  sub_submit 2 → sub_ok 2(两位置各 1)。**赛马无赢家**,样本太小,不复制。
- stored 积压 = 2(全部无 topic,generic 行),无翻转邮件义务。E13 audits 询单 0。
- **AI 引擎引荐(7d)**:claude.ai 1 + copilot.microsoft.com 1 + api.microsoft.ai 1 = 3 次
  真人引荐——GEO 回报仍在流,量级未变。
- **首次社区引荐簇**:forum.effectivealtruism.org ×2(08-18/19)+ www.lesswrong.com ×1
  (08-20),全部真人、全部落首页——有人在 EA/LW 讨论里链接了本站。深审计结论:落点是
  首页而非深页,现有首页信息架构(header nav + directory)承接正确,无需改动;若该簇
  持续,考虑在首页给「引用本站」提供一句可复制的引用格式(先不做,等复现)。
- 周一战略项:「赔率 vs 证据」已换用 **04:04 UTC 机器核实快照**(Polymarket AGI-2027
  公告合约 No 92% / Yes 8%)重生成;**发现并修复:agi-odds.yml 与 agi-indexnow.yml 的
  周一 schedule 今晨未自触发(两 workflow 迁移后各只有 1 次运行),已手动 dispatch 补跑
  双双成功——下周一 03:17/03:25 再核一次,若仍不自触发则查 schedule 注册问题。**
- gridlings 首发日 04:12 UTC 读数:0 事件(欧洲清晨,基线内);eco Faktencheck-Alarm
  第 1 天 subs 0(正常)。舰队台账:订阅 3/5、已验证营收 0;P0 PartnerNet 悬置
  (Telegram 提醒已于 01:30 送达 owner)。

## 2026-08-24 04:25 更正(台账不删失误)

上一条「agi-odds/agi-indexnow 周一 schedule 未自触发」**诊断有误**:两者的
`event=schedule` 运行分别于 04:08 / 04:12 UTC 成功——只是比 cron(03:17/03:25)
晚约 50 分钟,属 GitHub 调度器常见延迟,不是注册失灵。教训:**判定 schedule 失灵
至少等 2 小时再下结论**;我的 04:03 手动 dispatch 因此成了无害重复(odds 快照同日
重取,幂等)。「下周一复核」项撤销,无需任何修复。

## 2026-08-25 日结(daily run)
- 漏斗 28d:subscribers 2(stored)、sub_ok 0、subscribe_click 0、index_click{*_live} 0。
  activity 低位,滞后正常,不 churn。舰队订阅 3/5、已验证营收 0。
- itch 首发次日回流(经包内信标):play_start 13 + solve 1,全美,`:clean` 精品版确认。
  管线端到端通,量级待 CG/Show HN。
- ship:capex 页 rung⑤ 内链刷新(spoke↔spoke + tracker),最陈旧页从 06-30 更新。

## 2026-08-26 日结(D1,28d 窗)
JS 真人 page_view **742/28d(≈26/日,月中 ~15/日 → 明显上行)**;服务端 pageviews 近 2 日 567(上界口径)。
订阅漏斗 sub_open 3 → sub_submit 2 → **sub_ok 2**;subscribers 累计 2(均 stored,NO-API 正常态)。
**证伪线 09-30 读数:sub_ok 累计 2/5。** index_click(活数字钩子,08-16 上线)= **3/28d,非零**
——通道活着但弱,按预登记规则继续观察,不加新钩。工具面:tool_click 18、exposure_score 16、
invest_tool_click 9、vote_cast 8;site_search 2(无 mcp location,agent 首调里程碑未触发)。
引用放大队列:空(依赖 9 月 1-3 日 Bing AI Performance 明细补货——owner 届时给两张 Download all)。

## 2026-08-27 日结(daily run)— 两处记账纠错(台账不删失误)

**纠错一(要紧,直接影响 08-30 预登记判定):`index_click{*_live}` 仍是 0,不是 3。**
08-26 日结写「index_click(活数字钩子,08-16 上线)= 3/28d,非零——通道活着但弱」,
**这个读法是错的**。逐行核对:三次 index_click 全部 `path='/'`、`location` 为
directory×2 / hero×1、`label` 为 NULL——是**首页**的目录与 hero 元素,不是引用落地页
的活数字钩子。按 label/location LIKE '%_live%' 精确计数:**深页钩子点击 = 0**,自
08-16 上线起从未触发。08-24 的记录(「上线第 8 天仍 0 点击;3 次全部来自首页」)才是
对的。**08-30 判定必须以 0 为准**;按预登记,若届时仍为 0,如实裁定该通道为纯品牌资产,
不再加钩子。今天也因此没有给任何页面加钩(尽管 /when-will-agi-arrive 以 133 pv/28d
高居深页第一且缺第⑥件套——**这正是预登记该拦住的诱惑,08-30 之后再议**)。

**纠错二:`site_search{location='mcp'}` 并非「无 mcp location」,而是扫描器,别再当里程碑。**
08-26 写「site_search 2(无 mcp location,agent 首调里程碑未触发)」——前半句与事实
不符:两行 location **都是** 'mcp'、path '/mcp'。真正的排除理由早在 08-18 就查清并记在
本文件:那是 **MCP 生态信誉扫描器**(标签 `mcp-reputation-scanner-canary` +
`tool:sunwatch_ledger`),`ua_class='bot'`,两次调用相隔 **133 毫秒**——机器,不是 agent
会话。**固定规则**:今后判定「首个 agent MCP 调用」里程碑,必须同时满足 ①location='mcp'
②label 不含 canary/scanner ③两次调用间隔不是毫秒级 ④ua_class 非 bot。只查 location
会让每一次日常运行都重新「发现」一次假里程碑。

**读数(D1,28d 窗)**:JS 真人 page_view 790。深页 TOP:/when-will-agi-arrive 133、
/situational-awareness-summary 46、/how-close-is-agi 34、/sam-altman-agi-prediction 21、
/ai-2027-scenario-explained 20;首页 180。/when-will-agi-arrive 已过 08-17/18 的峰
(16/13)回落至 2-6/日,属自然衰减,不动它。
订阅漏斗:subscribe_click 4 → sub_open 3 → sub_submit 2 → **sub_ok 2**(08-14 footer_cta、
08-19 post_scorecard 各一),**证伪线 09-30 读数仍 2/5**;赛马仍无赢家(两位置各 1),
按 08-24 结论不复制。工具面:tool_click 18、exposure_score 16、invest_tool_click 9、
vote_cast 8。**AI 引擎引荐(14d)9 次**:chatgpt 3 / perplexity 2 / copilot 2 / claude 2
——GEO 回报持续在流。搜索:google 34、duckduckgo 27、bing 3;社区 EA forum 5 + LessWrong 1。
需求层:site_search 仅 2 条且均为扫描器,**无选题种子**(正常,不硬凑)。

**阶梯状态(为何今天落在 rung ⑤)**:⓪ strategy 未完成项三条全部卡在 owner 的 Gateway
waitlist,无可执行项;⓪+ 引用放大队列两项**都有未满足的动工前置**——
`datacenter-grid-cost-tracker` 要等 9 月上旬 Bing 明细确认 capex 页引用仍在涨;
`eu-ai-act-de` 要等英文版 28 天判定线过线(今日核实:**未进站内 TOP10**,引用数据也要等
9 月),故两项均不动工;① 转化赛马样本不足;② 需求层无种子;③ 13F 已于 08-16 全量刷新
(下次 11 月);④/⑤ 中选 ⑤。

## 2026-08-27 舰队记分板(owner 追问「其他站点数据/游戏呢」,非周一例行)

| 站 | 真人 pv/28d | 离钱最近的事件 | 判读 |
|---|---|---|---|
| **bpj** 白嫖计 | **2,559**(舰队第一) | `go` 25(外链点击)、sub_view 96 → sub_submit 1 → **sub_ok 1** | 流量最大、转化最薄;bot 3,476 + api 1,358 另计 |
| **eco** getecoback | 684(ua_class 多为空,老行无该列) | **`affiliate_click` 93**、近 7 天约 18 | 唯一已产生真实营收的站(€9.96 在案) |
| **agi** agiscorecard | 790 | sub_ok 2(28d) | 见今日日结 |
| **gridlings** 游戏 | 205(见下方污染说明) | `play_start` 49 / `solve` **6** | 真实玩家仍是个位数量级 |
| **gamesledger** | 名义 381 → **真实个位数/日**(08-27 仅 2) | quiz/subscribe 全 0 | 08-22 的 229 已判定为扫描器误分类 |
| **tds** thedollscout | **63** | `affiliate_click` **0** | 14 个楔子页仍零点击,判定线未过 |
| **SR** buysomething | 38 | 无事件、subs 0 | 基本休眠 |

**两处「增长假象」当场证伪(舰队铁律:CI 自测会伪装成增长)**
1. **eco `mcp_call` 310 次 ≠ agent 采用**:只有 **19 种不同载荷**,17 天里每天恒定 ~20 次
   ——冒烟测试签名(eco-mcp-smoke)。`md_serve` 460 同源存疑,同样不计入采用。
2. **gridlings 08-26/27 的 48-50「真人」pv 不是玩家涌入**:①我今天新加的部署自检探针
   固定打 7 条路径、每次部署一轮,UA 不含 bot 关键词被误判为 human(**我自己制造的污染,
   今日已修:UA 改为 `gridlings-deploy-smoke-bot`,worker 正则确认判为 bot**);
   ②其余约 38 次**均匀散布在 20 个页面**(每页 1-5 次,含冷门规则页)=爬虫扫全站,
   合理解释是那些英文页刚从 307 死循环恢复、爬虫终于够得着。真实玩家看 play_start/solve。

## 2026-08-27 追加:游戏线渠道判定(owner「是不是这个游戏方向不行」)

上表把 gridlings 记成「真实玩家仍是个位数量级」是对的,但**漏掉了这条线最重要的
结构性事实**。按 referrer 重新拆分同一份 D1(08-24 itch 上架 → 08-27 15:00,human):

| 渠道 | page_view | play_start | solve |
|---|---|---|---|
| **itch.io**(ref=html-classic.itch.zone) | 2 | **27** | **6** |
| 由 itch 跨过来后的站内跳转 | 0 | 19 | 1 |
| CrazyGames(仅 QA 预览) | 10 | 0 | 0 |
| 自有域直接访问(服务端计数) | **116** | **0** | **0** |

**自有域 116 次直接浏览产生 0 开局 0 通关;本站有史以来每一局真实游戏都来自 itch。**
可识别真实会话 6 段(US×3 / JP / PL / FI),其中 4 段跨到本域连玩 5–6 款不同游戏
(PL 那段 12 分钟解开 3 题)。→ 失败的不是游戏,是分发;而分发在 08-24 才第一次存在。
详见 sites/gridlings/CLAUDE.md「渠道判定」。CrazyGames 二拒(模板同一句、owner 已在其
QA 预览确认棋盘与 SDK 正常)判为审美/品类判断,**停止投入**;预注册判定线 **2026-09-24**:
itch 累计 `play_start ≥150` 且 `solve ≥25` 才继续投游戏线。

**一处记账更正(我自己的)**:上表 gamesledger 那行的 `embed_copy` 不是用户复制嵌入码。
全部 36 条 `location='badge_serve'`,是**本站页面自己加载自己的徽章 SVG** 时打的点,
`ref_host` 全为 games.agiscorecard.com;其中 4 条被判为 human 的,是浏览器(含 owner
自己在 CN)打开我们自己的页面。**gamesledger 至今零外部互动**,不要把 badge_serve
计成采用信号。

**对照(同 28 天,为什么游戏线只能降级而不是加倍)**:eco 676 次浏览 → **95 次
affiliate 点击**(唯一已验证的收入路径);gridlings 46 次开局 → **0 订阅、0 收入事件、
0 次 AI 引用**(`subs` 表 0 行)。

## 2026-08-28 日结 — 一个我自己踩进去的读数陷阱(必须先记这条)

**`slidein_show` 28 天 404 次这个数字是错的,别再引用它。** 我今天就是照着它开始设计
改动的,直到按 location 拆开才发现:**404 里有 332 次(82%)根本不是本站的**——它们是
**Compass 子站**(compass.agiscorecard.com)的弹层,路径是 `/en/tools/portfolio/`、
`/en/vs/amd-vs-meta/` 这类 Compass 页面。而且其中 **326/332 是 `ua_class='bot'`**。

Compass 往主站 D1 写事件**是设计如此**(OPT-LOG:267:它的弹层把订阅地址收进主站
`subscribers` 表,location `compass_popup`)——**问题不在于它写,而在于两个产品共用
`slidein_show` 这一个事件名,读表的人没有任何提示。**

**本站自己的滑入面板真实漏斗(28 天):**

| | |
|---|---|
| `slidein_show`(仅本站:timer 25 + scroll 14 + 8-17 前 legacy 33) | **72** |
| → `subscribe_click{slidein_*}` | **0** |
| → `sub_open` | **0**(3 次 sub_open 全部来自 footer_cta 2 + post_scorecard 1) |

72 次曝光 0 转化**还不足以判死这个面板**:若真实转化率 2%,P(72 次全空)=0.98^72≈23%,
这是个很可能的空。**所以今天不动它的文案**——那会是拿噪声当信号,正是站规反对的。

**读数纪律(以后每次读这张表都必须做):**
```sql
-- 本站自己的事件:排除 Compass 的跨站行
SELECT name, COUNT(*) FROM events
WHERE day > date('now','-28 days')
  AND location IS NOT 'compass_popup'
  AND path NOT LIKE '/en/%'          -- Compass 的英文路径前缀
GROUP BY name;
```
**跨仓契约(待办,不在本仓)**:Compass(aistock 仓)的弹层应改用 `compass_slidein_show`
这个独立事件名;在它改之前,本仓每一次读数都必须带上面这个过滤。
**我原本想加一列 `origin_host` 从源头分开,ALTER TABLE 被权限闸门挡下(生产库 DDL,
这个闸门是合理的)。** 需要 owner 批准才做;不做也不阻塞——按 location 已经可分。

## 其余今日一手数字(28 天,已按上面口径去污)

- **`index_click{*_live}` = 0。** 全站 `index_click` 只有 3 行:`directory` 2、`hero` 1,
  **没有任何一行是 `*_live`**。三个高引用页(sa-summary / what-is-agi / oom-explained)
  的首屏活数字钩子自 08-16 上线以来 **12 天零点击**。预注册判定日是 **08-30(还有 2 天)**,
  我不提前结算;但按目前数据,那天的结论几乎确定是「引用是纯品牌资产,不换点击」,
  届时按指令**停止再加钩子**。
- **agent MCP 调用仍为 0。** `site_search{location='mcp'}` 的 2 行(08-18)是
  **MCP 生态信誉扫描器**(标签 `mcp-reputation-scanner-canary` + `tool:sunwatch_ledger`,
  `ua_class='bot'`,两次相隔 133 毫秒),analytics-notes:881 早已判定不是真实 agent。
  **不算里程碑。**
- **订阅:`subscribers` 共 2 行,全部 `status='stored'`**(footer_cta 08-14、
  post_scorecard 08-19)——NO-API 模式下 stored 是正常态,不是故障。距上一个订阅
  已 9 天。09-30 证伪线口径 sub_ok 累计 **2/5**。
- 本站事件人机分列:human 834 / bot 186。

## 引用放大队列:**两项均被前置条件卡住,不是空**

- `datacenter-grid-cost-tracker` — 前置:9 月上旬 Bing 明细确认 capex 页引用仍在涨。**今天没有 9 月数据 → 不动工。**
- `eu-ai-act-de` — 前置:英文版 28 天判定线先过(首个 AI 引用或进站内 TOP10)。**未过 → 不动工。**

按站规「队列空了不要为凑数塞猜的选题」,同理适用于「被卡住」:**今天不新造选题**。
下个月 1-3 日向 owner 要 Bing AI Performance 两张明细后才能补货。


## 2026-08-29 日结 — sub_ok 到 2(漏斗完整),PRD P1 上线

**订阅漏斗首次出现「完整两单」(28d,去 Compass 污染)**:`sub_open` 3 → `sub_submit` 2 →
`sub_ok` **2**(footer_cta 1 + post_scorecard 1)。两个地址应已落 D1 `subscribers`
(status='stored' 是常态,不报警)。**09-30 判定线:sub_ok 累计 <5 判死「订阅→Boosts」——
当前 2,还差 3,一个月窗口。** footer_cta 与 post_scorecard 各转化 1,样本太小不做位置结论。

**钩子层(28d)**:`tool_click{opinion_*}` 共 10 次,最强是 opinion_sasummary_exposure(4)
——文章制造观点→exposure 接住的路径真实在走;exposure preset 5 次。
**Pro 桥(exposure_*_sunwatch*)仍 0**,TG 绑定仍 0(11-15 判定线的两条硬指标未动)。
`index_click{*_live}` 仍 **0**(既有页口径,明日 08-30 预登记判定按此裁)。

**ship**:PRD P1 `/is-nvidia-overvalued`(详 OPT-LOG)。新增埋点从今天起可观察:
`index_click{nvda_live}`、`tool_click{opinion_nvda[_brk]}`、`subscribe_click{deep_nvda}`。


## 2026-08-30 日结 — 两项预登记裁决 + P4 上线 + 两次防误报

**裁决①(08-16 预登记,今日到期):`index_click{*_live}` = 0/14 天** —— 三个高引用页
的首屏活数字钩子上线两周零点击。**判定:引用→点击不经过活数字钩子,该通道是纯品牌
资产。** 执行(按 08-29 转化架构令预写动作):既有页不再以"换点击"为目的加装活数字;
站规六件套第⑥条**保留**(活数字的价值在引用差异化,即"聊天答案装不下的东西",这一半
从未被证伪)。已装的活数字全部保留(引用侧继续工作),只撤"钩子能转化"这个宣称。

**防误报①**:`site_search{mcp}` 2 次 sunwatch_ledger 调用经查全部为 08-18 已知信誉
扫描器(133ms 间隔、bot、canary 同批)——**首个真实 agent 调用里程碑仍未发生**,
四条件判据第三次拦住假里程碑。get_claim_ledger 昨日上线后暂无调用。

**防误报②**:goldrush 首日 41 次"human" pageview —— 全部无 referrer、散布 8 国、
发生在零宣布状态,判为**新子域证书进 CT 日志后的扫描器蜂群**(08-08 教训翻版)。
真实互动仅 1 次 fork_click。不计增长,记上界。

**28d 漏斗(去污)**:sub_ok 2(09-30 线 2/5)· opinion 钩家族基数不变(新铺 8 页
+ sunwatch_result + post_vote 首日均 0,一天无结论)· vote_cast 14 · rev_click ≈ 0。

**ship**:PRD **P4 `/zh/does-copying-13f-work`**(中文侧主线,离 ¥199 买家画像最近的
一页):zh Swiss 浅色系、忠实翻译 P2、zh_deep_page CTA、漏斗指 compass zh 计算器 +
/zh/ai-stock-exposure(`invest_tool_click{zh_copy13f_record|exposure}`)、双向 hreflang、
硬同步台账同 commit 扩为**六处**。P4 止损线(预登记):上线 +60 天 28d JS pv <5 →
停止 zh invest 扩面。

## 2026-08-31（周一，每日运行 + 四站记分板）

**⚠ 赔率首次「实测位移」——市场 Yes 一周内 7.5% → 18.0%（+10.5 点，2.4 倍），证据侧纹丝不动。**
两端均为机器核实带 ISO 时间戳、同一 market slug（`openai-announces-it-has-achieved-agi-before-2027`）：
08-24 04:12:59 UTC Yes 7.5% / 成交额 $95,951 → 08-31 04:18:24 UTC Yes **18.0%** / $103,282（+7.6%，市场未关闭）。
同期 Thesis Tracker 保持 **62.5/100**，八条判定无一变化。这是本系列**第一次两端都可测**的对比
（08-08 那次是手抄无时间戳，08-24 因此只记「指示性」不发刊）。已发 **Issue #2**，并如实写明限度：
一周一个点、约 $10 万成交额的单一市场偏薄、驱动原因未知且不编造；若下次回吐，回吐照样进复查表。

**四条件判据第 4 次拦截 —— 差点把自己的调研 agent 报成「首个 agent MCP 调用」里程碑。**
`site_search{location='mcp'}` 三条（`tool:sunwatch_ledger`、`tool:claim_ledger https://goldrush.agiscorecard.`、
`mcp`），2026-08-30 20:40:39 UTC。过判据即死：①UA 全 bot 类 ②三次调用间隔 **430 毫秒**、
扫过三个不同工具 ③落在本会话 23-agent 调研工作流窗口内。与 08-18 那次（scanner canary，133ms）同型。
连带堵掉一个测量陷阱：同一时刻 goldrush D1 记到 1 次 `/claimledger.json` 抓取（无 UA、无 referrer）
= **我们自己的 MCP 工具抓自己的文件**；若不排除，昨天刚发布的 `/fetchlog.json` 会在上线第一天
把"外部采纳"计成 1。已当日加排除项 c。

**转化漏斗（28d，JS 口径，剔除 compass_popup 与 /en/）**：page_view 921 · subscribe_click 4 ·
sub_open 3 → sub_submit 2 → sub_ok **2** · invest_tool_click 9 · tool_click 18 · vote_cast 14。
**rev_click 家族 ~13 / 921 pv = 1.4%**。sub_* 全族最后一次均为 08-19，已 12 天零。

**周一深审计：09-30 判定线的仪器可信度（结论：仪器无故障，可放心裁决）。**
先排除"仪器坏了"再谈"假设死了"：服务端真值 `subscribers` 表 = 2 行（footer_cta 08-14、
post_scorecard 08-19，均 `status='stored'`，无 beehiiv key 时为正常态），与 JS 口径 `sub_ok`=2
**精确吻合**。两条独立通道一致 → 不是表单坏了，是真没人订。09-30「sub_ok 累计 <5 判死
订阅→Boosts 假设」将按真实行为裁决，当前 **2/5**。

**四站记分板（28d）**
| 站 | 真人 PV | 离钱最近的事件 | 转化率 | 备注 |
|---|---|---|---|---|
| agi | 921 (JS) | rev_click 家族 ~13 | 1.4% | sub_ok 2，自 08-19 无新增 |
| bpj | 2779 (ev='') | `go` 33 | 1.2% | sub_view 125 → sub_submit 1；api 1471 |
| eco | 850 | `affiliate_click` 106 | **12.5%** | mcp_call 353 / md_serve 564（含 CI，勿当增长）|
| tds | 182 | `affiliate_click` 1 | 0.5% | D1 刚接通，样本太小 |
**本周结论**：eco 的离钱转化率是其余三站的 **9–25 倍**，机制是把付费面放在"答案时刻"而非页尾。
agi 已于 08-29 按同一诊断改过一轮，判定日 11-15，**本周不加码**（防翻炒），只记录差距仍在。

**游戏层**：gridlings 今日 play_start **0** / solve **0**；28 天 70 / 14；
**itch 累计 42 / 13，与上次读数完全持平**（09-24 判定线 150 / 25）。itch 侧零增长已持续多日，
按预登记纪律不救不加码，到日裁决。

**⓪+ 引用放大队列：两项均被自身前置条件挡住，本周不动工（是"被挡"不是"清空"）。**
`eu-ai-act-de` 需英文版先过 28 天线 → 英文版 28 天 **1** 次 JS 浏览、TOP10 门槛 **12**，未过。
`datacenter-grid-cost-tracker` 需 09 月上旬 Bing 明细 → 窗口 09-01~03 才开。按规则不塞猜的选题。

**计划任务**：`agi-odds.yml` / `agi-indexnow.yml`（周一 03:25 / 03:17 UTC）到 04:17 UTC 仍未自动触发
（08-24 那次也迟到，04:08 / 04:12）。证据只支持"延迟"，不足以断言故障，故**不改配置**；本次用
workflow_dispatch 手动取到今天的读数（公开仓分钟免费，且为数据读取非外部副作用）。下周一若同样
迟到再查。**操作失误自记**：本轮曾用 `git reset --hard` 同步，抹掉四份未提交改动并重做——
有未提交改动时禁用 reset --hard。


## 2026-08-31 追加：转化重做 + 内部跳转深度分析（owner 两问）

**先纠我自己一个读数错误**：本页早些时候写的内部跳转数字用了 `COUNT(*)`，但 `pageviews`
是聚合表、真实次数在 `hits` 列。正确口径（28 天，服务端 human，剔 /en/）：
**无来源 18,639 · 站内跳转 1,358 · 外部来源 502**。

**"用户留不住"——数据不支持，但也不能证实，因为仪器坏了。**
带 referrer 的请求几乎必然是真实浏览器（爬虫一般不发 Referer），据此带来源的浏览约 1,860 次，
其中 **73% 是站内跳转**——表面看人是在站内走动的。但落点清单
（/ 77、ai-stock-exposure 46+15、two-year-scorecard 42、agi-test 40+28、**/search 39**、
invest 17+12、future-bet 17+12、ai-tools 14+12、advertise 13）**几乎就是本站导航 + 目录块本身**，
而"真实读者点导航"和"爬虫顺着导航爬"会产生完全一样的形状。**铁证**：`/search` 有 39 次内部
到达，真实 `site_search` 事件却是 **0**（那 5 条全是 MCP 调用）。

**根因（已修）**：`pageviews` 只存 `ref_host` 不存来源路径；`events` 存的也是 `ref_host`——
信标其实一直在发完整 `document.referrer`，是 worker 落库时调 `refHost()` 主动把路径丢了。
**所以"A 页→B 页"从来没有被记录过。** 今日改为：`page_view` 且 referrer 同源时，把来源
**路径**存进 label（`from:/xxx`），跨域来源仍只留 host（绝不存陌生人的 URL）。
JS 口径 = 爬虫排除在外，**下一轮起可以真正回答内部跳转问题**。

**转化诊断：钱路全都装在没人到达的地方。**
- 书籍联盟（唯一适配"信息意图"的钱路）只挂在 `/who-is-leopold-aschenbrenner`——**终身 6 次浏览**；
  且 **`affiliate_click` 根本不在 D1 白名单**，点了也不记录。10-31 那条"全站 book_* <5 关
  Associates"因此是**双重不可结算**：页面没人看 + 事件不记录。两处今日都已修。
- SunWatch Pro ¥199（全站唯一带真实价格的链接）：**60 天 0 次点击**。9 次 `invest_tool_click`
  全是导航（nav 4 / nav_compass 3 / cn_more 1 / starthere_compass 1），没有一次是付费面。
- exposure 工具：16 次使用**全部集中在 08-11 一天**，此后 20 天零使用。
- 意见钩子 `tool_click{opinion_*}`：60 天共 5 次（09-26 判定线需 ≥8）。

**赢家形态已经被数据指出来了**：全站点击率最高的内部 CTA 是首页 `readnext_click`
**28 天 13 次的纯文字块**，高于所有设计过的横幅（opinion_* 60 天合计 5 次）。
因此本轮不再加第四块横幅，而是按 readnext 形态把书路装到 `/when-will-agi-arrive`
（154 次 JS 确认浏览，全站第二）——两个免费原文排在前面且明说不赚钱，三本书标注联盟披露。

**变现算术（诚实交底，别再画饼）**：按当前 921 次 JS 浏览/28 天 ≈ 每天 33 人——
书籍联盟即使 5% 点击率、10% 下单率、$20 书 4% 佣金 ≈ **$1/月**；SunWatch Pro 需约 5 倍流量
才有 1 单/月；订阅→Boosts 早已被算术判死（实测 1 订阅/368pv，可行线需 ~37 万 pv/28d）。
**结论：在 33 人/天这个量级上，没有任何转化机制能产生有意义的收入——瓶颈是流量不是报价。**
本轮的价值不在于"提高转化率"，而在于把每条钱路变成**可测量、判定线可结算**的状态，
这样流量真的来的那天答案已经现成。

## 2026-09-01（每日运行，月初）

**昨日新装的仪器已确认工作。** JS 口径内部跳转配对首次产出：20 次，**来源 100% 是首页 `/`**，
深页向外递送 **0**。落点：`/will-agi-arrive-2027` 4（首页 readnext 第二条）、`/` 4（锚点/重载）、
其余 13 页各 1（about、what-is-agi、elon-musk、widget、zh/ai-job-risk-check…）。
**样本 <24h、n=20，不下结论**——但方向已能看出「不是留不住，而是只有首页在循环」。
读法已固化进 analytics-setup.md，09-14 正式读。

**转化层**：28 天 JS 浏览 **1,004**（昨 921）；`sub_ok` 仍 **2**、`subscribe_click` 4，
两者最后一次都停在 08-19（13 天零）。`affiliate_click`（昨日入白名单）与
`calc_use{grade_game}`（昨日上线）目前 **均为 0**——上线仅约 14 小时，判定日分别是 10-31 与
09-28，**不提前解读**。`slidein_show` 79 次仍 0 点击。

**游戏层**：gridlings 今日 **play_start 8 / solve 1**（久违非零日）；28 天 **78 / 15**；
**itch 累计 42 / 13 持平**——今天这 8 次不是 itch 来的，**itch 通道仍是死的**。
09-24 判定线 150/25，剩 23 天需 +108 starts，按当前 itch 速率不可能达成；**但到日再裁，不提前**。

**⓪+ 引用队列**：两项仍被自身前置条件挡住（英文 eu-ai-act 28 天浏览未过线；capex 引用趋势
需 Bing 明细）。**今日起进入取数窗口（09-01~03），已在报告里向 owner 索取。**

**本轮不改任何页面**：昨日一天已动 agi 三处（转化仪器 / 阅读钱路 / 首页游戏）并承诺静置，
三条判定线都需要真实数据说话。按站规「没有信号就不硬凑」，今日只做监控 + 读法固化。

## 2026-09-04（合并后的首条舰队日报）

| 口径 | 28 天 | 7 天 |
|---|---|---|
| page_view（JS 真人） | 1042 | 262（≈37.4/日） |
| vote_cast | 26 | 12 |
| subscribe_click | 6 | 2 |
| sub_open / sub_submit / sub_ok | 4 / 2 / **2** | 1 / 0 / 0 |
| tool_click | 17 | **0** |
| exposure_score | 16 | **0** |
| affiliate_click（全站） | **0**（14 天口径亦为 0） | 0 |

- **落地页第一名首次不是首页**：`/when-will-agi-arrive` 44 > `/` 28（7 天）。同页
  `readnext_click` / `affiliate_click` 均为 0 —— 站内最大入口一个人也不往下送。
  该页在 5-run 防翻炒窗口内，**本轮不动**；10-31 books 判定线按期结算。
- **affiliate 埋点已实测在线**（Cloudflare 部署代码含 `affiliate_click` 白名单，
  页面 onclick 三处齐全）→ 这个 0 是真需求信号，不是仪器故障。
- **invest 工具近 7 天完全静默**（tool_click 0、exposure_score 0），
  11-15 的 invest 判定线届时按 PRD §五 三条阈值结算。
- **游戏层（gridlings，human 口径，28 天）**：play_start 269、solve 123、hint_used 166、
  play_again 118；**itch 口径 play_start 42 / solve 13**，09-24 阈值 150/25 —— 仍差得远。
  当日 0（查询时间 04:00 UTC，当日几乎未开始，非异常）。
- **sourceradar（buysomething）**：7 天 page_view **5**，无 rising 信号 → 本轮不动工，
  这正是它并入本条日报的原因。
- **第①层 heartbeat**（09-04 04:00 UTC 首跑，19 秒 SUCCESS）：八站全 200；
  gridlings 已 6 天未部署（阈值 7，明日会自动重发）。


## 2026-09-05（周六舰队日报）

- **agi 7 天真人 pv 299（≈42.7/日，环比 +14%）**；漏斗仍冷：subscribe_click 2、sub_open 1、
  sub_ok 本周 0（累计 2，09-30 阈值 5）；vote_cast 13。
- 昨夜另一会话（Fable 5.1）上线「客户视角簇」14 文件（/ai-and-your-job 等），当日读数
  尚无意义，判定线以其 PRD（docs/agi-customer-lens-2026-09.md）为准；本 run 不叠加 ship
  （防翻炒）。validate OK：228 页 / 210 URL。
- **游戏层**：gridlings 28d play_start 276 / solve 123；itch 口径 43/13（09-24 阈值 150/25）。
- **sourceradar**：28d pv 54，无信号，不动。
- **第①层**：heartbeat 09-04 12:24 快照八站全 200；**gridlings 达到 7 天线被自动重发**
  ——heartbeat 的自动兜底第一次真实触发，14:37 部署绿。
- **第②层故障与处置**：换模后前两条新会话 run 卡死于 SSH 克隆权限提示
  （详见 docs/fleet-automation-map.md §八）；已补跑 paid-monthly 并归档僵尸会话。

## 2026-09-06（周日舰队日报，本会话被 owner 占用于 gridlings 美术，监控由子代理直读 D1）

- **agi 7 天真人 pv 333（≈47.6/日，环比 +11%）**，28d 1087。漏斗仍冷：subscribe_click 2、
  sub_open 1（09-03 /ai-2027-scenario-explained，未提交）、**sub_ok 已 18 天零**（累计 2，
  09-30 阈值 5）。invest_tool_click 7d 1，无 sunwatch/tg_watch 点击。
- 7d 外部来源（human hits）：google 73 · bing 16 · duckduckgo 13 · claude.ai 3 ·
  forum.effectivealtruism.org 3 · chatgpt.com 2。**09-05 出现 D1 上线以来首次真人 site_search**
  （US，EA 论坛引荐，label 为空——home_suggest 跳 /search 未带词），非里程碑，记一笔。
  `site_search{mcp}` 7d 0 条，首个真实 agent 调用仍未发生。
- **游戏层**：gridlings 28d play_start 291 / solve 124；7d 221 / 110（towers 09-01~03 三天
  集中爆发后回落到个位数）；**itch 口径 43/13，7d 仅 +1/+0**，09-24 阈值 150/25 按当前速率
  不会过线，到日再裁。**prompt / mimic / overseer / minima 在 D1 中 0 行**（尚未上 CG，仅挂
  hub），overfit 6/0。
- **sourceradar**：28d pv 66（human 50），7d human 9，其余事件全站累计 0，不动。
- **第①层**：heartbeat 09-05 11:31Z 八站全 200，days_since_deploy 全 0。
- **本日 ship（gridlings，见 OPT-LOG）**：OVERSEER 深度美术（无眼睛的一套新插画语言）、
  五款商店视频改逐帧截图（根治 CG 预览模糊）、海报标语与字标重叠修复。agi 站内容零改动
  （周日 + 客户视角簇判定期内）。

## 2026-09-07（周一，舰队日报）

**第①层 heartbeat**：8 站全 200，无一站 days_since_deploy ≥7。无告警。

**agiscorecard**（D1 f84f9d29，真实读者只认 JS `events.page_view`）
- 28 天真实 pv **1,102**（≈39/天）；昨日 50。订阅：累计 2，28 天内 sub_ok **2**、
  sub_open 4、subscribe_click 6，全部停在 8-19，**18 天零新增**。`status='stored'` 积压 2（NO-API 模式下这是正常态）。
- invest：`invest_tool_click` 28 天 9 次，**Pro 桥 `exposure_*_sunwatch` 仍为 0**。
- **`site_search{location='mcp'}` 28 天 5 次 —— 按四条件判据全数不通过，不是 agent 采用**：
  5 条全部 `ua_class='bot'`；08-30 三条间隔 430 毫秒、08-18 两条间隔 133 毫秒（批量）；
  `tool:sunwatch_ledger` 跨日重复；一条标签直接是 `mcp-reputation-scanner-canary`。
  且 8 天无新调用。**里程碑未达成，继续记零。**

**gridlings**（D1 bd3b1ca9，表 ev）
- 28 天 play_start 308、solve 132、play_again 127、hub_click 20。
- **09-06 的 716 次浏览是 687 爬虫 + 29 真人**——七款上架 itch/CG 当天引来的抓取。
  真人日线是平的：29 / 33 / 9 / 29 / 93 / 43 / 15。**投稿日的尖峰不算增长，写进反面记录。**
- **itch 判定线（09-24）读数**：`ref LIKE '%itch.zone%'` 且 human，累计 **play_start 43 / 150、
  solve 13 / 25**，覆盖 5 个活跃日（08-24 起）。七款新页 09-06 才上架，尚未进入这个读数。

**四站对抗记分板**
| 站 | 真人 pv/28d | 离钱最近的事件 | 备注 |
|---|---|---|---|
| agiscorecard | 1,102 | sub_ok 2（18 天零新增） | 引用型内容为主 |
| baipiaoji | 1,603 | `go` 出站 49；subs 3 | 全舰队真人量最大 |
| getecoback | 289 | **affiliate_click 40（人）**，昨日 3 | 转化率 13.8%，全舰队最高 |
| gridlings | 见上 | hub_click 20 | 游戏层，不吃引用 |
- **getecoback 的 mcp_call 437 次仍不可信**：只有 33 个不同 `meta`，重复约 13 倍，
  与 08-16 判定的冒烟测试同签名。**不作为 agent 采用上报。**
- 可移植的模式：eco 的 affiliate_click/pv = 13.8%，是舰队里唯一被验证的高转化钩子形状；
  agi 侧订阅钩子 0.5% 差 27 倍。差别在于 eco 的动作与页面意图同向（找免费额度→点去用），
  agi 的订阅与「读一个判定」不同向。

**thedollscout**：`content/d1-snapshot.json` **仍不存在**。owner 待办未完成（Cloudflare →
API Tokens → 部署用 token → 加 Account · D1 · Read，约 1 分钟）。按 09-02 判定线，
此项每轮必须继续上报，不因「站点看起来正常」降级。

**sourceradar / buysomething**：28 天真人 pv 50，`pick_open`/`out_click`/`calc_use`/`search_use`
**全部为 0**。按低频站规矩：只报数字，不 bump、不造内容。

**本周赔率**：Polymarket「OpenAI 在 2027 前宣布达成 AGI」→ Yes **27%** / No 73%，
成交量 $194,567（2026-09-07 04:06:55 UTC 机读）。对照证据侧：Tracker 62.5/100、
AGI-2027 判定 Open，均未动。

## 2026-09-08（日结）

**agiscorecard**（口径：真实读者只认 JS `events.page_view`）
- JS pv **1147/28d**；后 14 天 628 vs 前 14 天 519（**+21%**）。服务端 `pageviews.human`
  24,417 —— JS 占比仅 4.7%，那 24k 是含未识别爬虫的上限，**不作分母**。
- 落地页：`/` 201 · **`/when-will-agi-arrive` 191**（全站第二，占总量 17%）·
  `/situational-awareness-summary` 35 · `/how-close-is-agi` 31 · `/will-agi-arrive-2027` 30。
- 来源：google 85 · duckduckgo 52 · bing 28 · **forum.effectivealtruism.org 11** ·
  claude.ai 6 · chatgpt.com 6 · lesswrong 4 · copilot 3 · perplexity 2。
  AI 引擎合计 后14天 9 vs 前14天 8（**持平，未翻倍**）；社区（EA+LW）6 vs 9。
- 漏斗：`subscribe_click` 6 → `sub_open` 4 → `sub_submit` 2 → `sub_ok` **2**。
  两次 sub_ok 都在首页（footer_cta / post_scorecard）。`subscribers` 表 **2 行 status='stored'**
  （无 beehiiv key，这是正常态，非故障）。
- **转化赛马的关键读数**：`/when-will-agi-arrive` 191 pv 产出 `subscribe_click` **0**；
  而 `/ai-2027-scenario-explained` 仅 28 pv 却产出 2 次（`deep_scenario_mid` 形态）。
  最大深页没有一个能被点的订阅钩 —— 这是下一个该做的事，但该页 09-06 刚动，冷却中。
- `vote_cast` 39；`invest_tool_click` 13（全是导航位，**Pro 桥仍 0 点击**）；
  `tool_click` 8；`index_click` 7；`embed_copy` 0；`affiliate_click` 0（10-31 判定线现读数 0/5）。
- `calc_use{grade_game}` 表面 17，**真实为 1 人 4 次重算**（见 OPT-LOG 同日）；
  `challenge_share{grade_game}` 0。09-28 判定线**未达标**。
- **仪器事故（已修）**：`site_search` label 被结构字段正则洗成空串，中文全灭、
  英文粘连；8-08 至今一个月的读者搜索词已永久丢失。详见 OPT-LOG 与 CLAUDE.md。

**gridlings**（D1 bd3b1ca9，human 口径）
- 28 天：pv 545 · play_start 325 · solve 135 · hint_used 182 · play_again 131。
  今日：pv 3 · play_start 4 · solve 1 · hub_click 1。
- **itch 判定线（09-24，需累计 play_start≥150 且 solve≥25）：现读数 43 / 13，
  与 08-31 完全持平** —— itch 侧连续多日零新增，按现趋势判定日不会达标。
- Playgama：七款包齐（09-07 SINGULARITY 收尾），GHOSTLINE 审核中；
  CG 七款重传包审核中（2–4 周）。

**sourceradar / buysomething**（低频站，规矩是无信号只报数字）
- 28 天 human pv **50**（近 7 天仅 5），bot 32；`pick_open` / `out_click` / `calc_use` **全 0**。
  队列无项、rising 无 v≥200 的真实产品需求 → **今日不动作、不 bump**。

**第①层 heartbeat**（data/fleet-health.json，09-07 13:50Z）：八站全部 **200**，
agiscorecard / baipiaoji / getecoback / gridlings / buysomething / gamesledger
`days_since_deploy=0`，thedollscout 与 goldrush = 2。**无异常。**

**里程碑**：无新达成。`/when-will-agi-arrive` 稳居第二深页（此前已记）；
首个 agent MCP 调用**仍未成立** —— 28 天内 5 行 `location='mcp'` 全部是同秒批量、
参数重复、且其中一行自带 `canary` 字样，四条件判据不过，按规矩不上报为里程碑。

**owner 待办（沿用，未催）**：thedollscout `content/d1-snapshot.json` 仍缺
（Cloudflare → API Tokens → deploy token → 加 `Account · D1 · Read`），自 09-02 挂起。

## 2026-09-09（日结）

**agiscorecard**（真实读者只认 JS `events.page_view`）
- JS pv **1177/28d**；后 14 天 628 vs 前 14 天 549（**+14%**）。
- 落地页：`/` 203 · **`/when-will-agi-arrive` 198** · `/situational-awareness-summary` 34 ·
  `/how-close-is-agi` 32 · `/will-agi-arrive-2027` 30 · `/sam-altman-agi-prediction` 28 ·
  `/ai-2027-scenario-explained` 28。
- AI 引擎引荐 后14天 **9** vs 前14天 **9**（持平，未翻倍）；社区（EA Forum + LessWrong）7 vs 6。
- 漏斗：`subscribe_click` 6 → `sub_open` 4 → `sub_submit` 2 → `sub_ok` **2**（均在首页）。
  `subscribers` 仍 **2 行 status='stored'**（无 beehiiv key，正常态）。
- `vote_cast` 44 · `calc_use` 21 · `invest_tool_click` 13（**Pro 桥仍 0**）· `tool_click` 8 ·
  `index_click` 7 · `pick_ledger` 4 · `deeplink_pick` 2 · `affiliate_click` **0**（10-31 线 0/5）。
- **两个数字必须按人读，不按事件读**：`calc_use{grade_game}` 17 次全部来自 09-07 一位读者
  35 秒内的操作，其中 `complete:*` 5 次是同一人反复重算 → **09-28 判定线（≥10 次完成）未达标**；
  `pick_ledger` 4 次全部来自同一个匿名 id `p_0368b360`，其中 3 次是同一个 pick。
  `challenge_share` 仍为 **0**。
- 站内搜索：修复上线后 24 小时内**尚无读者搜索**（唯一一行是 `location='mcp'` 的服务端写入）。
  一天不构成证据，继续观察。

**gridlings**（D1 bd3b1ca9，human 口径）
- 28 天：pv 602 · play_start 342 · solve 135 · hint_used 182 · play_again 134。
  今日：play_start 1，其余 0。
- **itch 判定线（09-24，需累计 play_start≥150 且 solve≥25）：43 / 13，连续第 9 天零新增。**
  按现趋势判定日不会达标。
- **Playgama：PROMPT 09-08 被拒**（理由只有一句 "overall quality"，无逐条说明）。查出并已修两个
  真缺陷：①门户包页脚那两个链接是根相对的，在 iframe 里指向门户自己的域 —— 15 个包全中；
  ②PROMPT 桌面端格子上限 84px 把棋盘困在空屏里。连带修了删页脚导致 8 款 JS 空引用崩溃的坑
  （smoke 测试当场抓到）。SINGULARITY 正在跑认证，其余六款审核中。

**sourceradar / buysomething**：28 天 human pv **51**（近 7 天 6），bot 39；
`pick_open` / `out_click` / `calc_use` 仍**全 0**。队列无项、rising 无 v≥200 的真实产品需求
→ **今日不动作、不 bump**（连续第 6 天，符合低频站规矩）。

**第①层 heartbeat**（09-08 12:27Z）：八站全部 **200**；thedollscout 与 goldrush
`days_since_deploy=3`，其余 0。无异常。

**里程碑**：无新达成。首个 agent MCP 调用仍不成立（`location='mcp'` 全是同秒批量、参数重复、
含 canary 字样，四条件不过）。

**owner 待办（沿用，未催）**：thedollscout `content/d1-snapshot.json` 仍缺
（Cloudflare → API Tokens → deploy token → 加 `Account · D1 · Read`），自 09-02 挂起。

## 2026-09-10（日结）

**agiscorecard**：JS pv **1226/28d**；后 14 天 672 vs 前 14 天 560（**+20%**）。
AI 引擎引荐 9 vs 10（**略降**，未翻倍）；社区 7 vs 6。
- 落地页仍是 `/` 与 `/when-will-agi-arrive` 双头（约占全站 34%）。
- 漏斗：`subscribe_click` 6 → `sub_open` 4 → `sub_submit` 2 → `sub_ok` **2**；
  `subscribers` 2 行 status='stored'。Pro 桥 0，`affiliate_click` 0（10-31 线 0/5）。
- 参与类明显上行：`vote_cast` 44→**63** · `deeplink_pick` 2→**7** · `tool_click` 8→**13** ·
  `readnext_click` 13 · `pred_expand` 18 · `hot_topic_click` 7 · `agi_test_click` 6。
  **全是页内、轻量、不跳转的东西在涨**，与 08-31 的结论一致。
- 滑入框真实读数（排除 Compass 污染的 438 次）：展示 129 · 关闭 37 · 订阅点击 **0** ·
  测试点击 1。**未拆除**——0/129 分辨不出「零」和「行业常见的 1–3%」。已补预登记杀线：
  累计展示 300 次时结算（现 129/300）。
- 站内搜索：修复上线三天，仍无读者搜索（唯一行是 `location='mcp'` 的服务端写入）。

**gridlings**：28 天 pv 609 · play_start 349 · solve 135；**今日全 0**。
**itch 判定线 43/13（09-24 需 150/25），连续第 10 天零新增。**
CG 已按预登记线关闭（09-09）；拒稿原文仍未拿到，按「模板 = 关闭」执行中。
Playgama：SINGULARITY 认证进行到激励广告一步，其余审核中。

**sourceradar**：28 天真人 pv **52**（近 7 天 7），bot 46；交互事件仍全 0。
连续第 7 天不动作、不 bump。

**第①层 heartbeat**：读 data/fleet-health.json，八站全 200，无异常。

**里程碑**：无新达成。

**owner 待办（沿用，未催）**：thedollscout `content/d1-snapshot.json` 仍缺。
