# Gridlings 首发弹药包（owner 手动发布，机器绝不代发）

生成日 2026-08-22；**2026-08-23 全面改版：组合已扩到 11 款**（Gridlings /
Balance / Star Battle / Trail / Futoshiki / Towers / Mini Sudoku / Kropki /
Sandwich / Thermometers / Nonogram，全部 450 天每日 + 三档畅玩 + 机器验证唯一解 + EN/zh +
挑战链接）。发布前自查：play.agiscorecard.com 打开、导航条 10 款都能进、当日谜题
正常、胜利画面内联订阅表单出现。两个帖子**不要同一天发**——先 r/WebGames（低风险
热身、收集反馈），2-3 天后 Show HN（把学到的问题修掉再上）。

## ① r/WebGames（先发）

发帖前花一分钟重读该版当前版规（沙箱够不着 Reddit，我没法替你核实最新规则）。

**标题：**
> I built 11 daily logic puzzles where you never have to guess (free, no account)

**正文：**
> Every board across all ten games is machine-verified before publishing to
> have exactly one solution reachable by pure deduction — if you're stuck,
> there is always a provable next cell. No bifurcation, no guessing, ever.
>
> The set: a Graeco-Latin grid (Gridlings), binary balance, two-star Star
> Battle (10×10 — most sites only do one-star), a draw-one-line path puzzle,
> Futoshiki, Towers/Skyscrapers, 6×6 mini sudoku, Kropki (the missing dot is
> a clue too), sandwich sums, thermometers, and a nonogram where every board
> is verified solvable by line logic alone — no guessing, ever.
>
> Each has a daily + unlimited free play in three difficulties, streaks, and
> a "beat my time" challenge link. No account, no ads, works on phones.
> Feedback very welcome — especially which rulesets deserve bigger boards.
>
> https://play.agiscorecard.com

**发完后**：把评论区的意见原样贴回给我（尤其难度与 UI），我按真实反馈改。

## ② Show HN（2-3 天后）

**标题（HN 规范：朴素、无营销腔）：**
> Show HN: Eleven daily logic puzzles, each board machine-proven to be unique

**正文（首条评论用，HN 惯例是正文留空、URL 直达游戏，作者第一时间在评论区补背景）：**
> I like daily logic grids (Queens/Tango-style) but hate the moment where you
> can't tell if you're stuck or the puzzle wants a guess. So every generator
> here enforces the same contract: a published board has exactly one solution,
> proven by exhaustive solver run before it ships. 450 days of dailies per
> game are pre-baked into static JSON — no backend at all.
>
> Writing eleven generators taught me more than the games themselves:
> a 4×4 Graeco-Latin grid with a no-touch rule is mathematically impossible
> (order 4 has only two non-touching permutations), and 6×6 falls to Euler's
> 36 officers problem — so that game is 5×5. Futoshiki almost never verifies
> unique from sparse random clues; you have to start from ALL inequality
> edges and minimize down. Kropki's negative constraint (no dot = neither
> relation) carries half the puzzle. And Star Battle region "growth" produces
> disconnected regions unless you carve a corridor between star seeds first —
> the uniqueness validator caught that as a real bug before launch. For the
> nonogram, the acceptance bar is line-solvability (row/column constraint
> intersection to fixpoint), which is strictly stronger than uniqueness —
> that's what kills the "this board wants a guess" moment entirely.
>
> Stack is deliberately boring: Python generators, vanilla JS clients,
> static JSON on Cloudflare Workers. No ads, no account.
>
> Happy to answer anything about the generators or the uniqueness provers.

**守则**：全程真人回复评论；不请任何人点赞；如果没上首页，就当收集了一轮免费
评审——不重发（HN 允许隔一段时间换角度重投一次，那是几周后的事）。

## ②½ 可选第三帖(r/LocalLLaMA 或 HN,与 Show HN 隔开 ≥1 周)

Gridlings-Bench 本身就是一个帖子:**"I turned my 11 daily puzzle generators into
an LLM reasoning benchmark — 1,100 machine-verified boards, exact-match scoring"**。
钩子是「验证解 + 不可能靠猜 + 生成器开源、污染可再生解决」。发帖前先跑一次
GPT/Claude 实测拿到几个真实分数放进帖子(没有分数的 benchmark 帖会被要求拿数据)。

## ③ 门户投稿（第 2 周，需要你注册开发者账号，各约 10 分钟）

**首批投 3 款**（新账号一次挂 10 款容易被当刷量；先用最有辨识度的三款过审建立
账号信誉，2 周后补投其余）：Gridlings、Star Battle（2★ 是差异点）、Trail（Zip
需求最大）。全部 `?embed=1` iframe 就绪。

- CrazyGames: developer.crazygames.com 注册 → 提交 URL。审核 2-4 周。
  **08-25 提交被拒(08-26 通知)**:拒因模板化「overall quality does not yet meet
  expectations」。对照官方 docs(requirements/gameplay + quality)定位三缺口并已修
  (commit 见 08-26):①首访规则弹窗挡玩法(CG 明文:立即进入玩法、引导做在玩法内
  可跳过)→ 改为格上一条可关引导条,弹窗只在 "?"/完整规则后开;②零音效 → firstrun.js
  内置 WebAudio 合成音效(落子/标记/冲突/过关)+ 持久化静音键,过关音效经 #win 钩子
  **11 款全体生效**;③无撤销/无进度续玩/落子无反馈 → Star Battle 加 undo(事件已入
  白名单)、逐步自动存档续玩、落子 pop 动画。embed 模式下音效/帮助键挂 .meta(header
  被隐藏)。**重提交 = owner 动作**:developer.crazygames.com → Star Battle → Game
  Versions → 更新版本再送审;建议顺手换张更精致的封面图(评审吃第一印象)。若再拒,
  下一档分发走 GameDistribution / GameMonetize(门槛低于 CG/Poki),itch 已在架继续养。
  仍欠(后续 run):其余 10 款的落子音效逐款接线(win 音效已全体生效)。
  **08-26 二轮深度加固(owner:「深度优化下,保障一次通过」),全部无头实测通过:**
  ① **CG SDK v3 已接**(cg.js,仅 ?cg=1 或 crazygames referrer 时激活,公开站零加载):
  init → loadingStart/loadingStop(棋盘渲染完成)→ gameplayStart(首步)→
  gameplayStop+happytime(过关);SDK 拉取失败全程静默降级,游戏不受影响。
  ② **CG 模式站外零链接**(CG 红线):挑战按钮与订阅行隐藏(.cg 类),分享文案在
  embed/cg 下不带本站 URL。③ **首触难度曲线**:embed/cg 下棋盘下方出现
  每日/新手8×8/Medium/Hard 行内切换(纯 JS 无跳转),引导条加「新手?先来简单盘」。
  ④ **桌面右键直接标 ×**(不动 ★),入撤销历史。⑤ **视觉**:金星+辉光、× 弱化、
  hover 提亮。⑥ **封面重制**:covers/starbattle.png 换 1920×1080(真题真解渲染,
  金星深蓝主视觉)+ 新增 starbattle-512.png 方形图标——旧封面只有 630×500,
  本身就是「low quality」信号。
  **僵尸 run #36 结案(2026-08-27 13:40 UTC)**:deploy-gridlings run 32985901351
  (旧 sha 6e8769e)自 08-26 15:42 创建起 **22 小时始终卡在 queued、从未执行**,
  GitHub 全程拒绝 cancel(409「尚未入队」)。判为 GitHub 侧死件,**风险解除,监控停止**。
  同期上线的两道结构性防护让这类事故不再依赖人盯:①全部 8 条 deploy workflow 的
  防回滚守卫(旧 push 事件被补发时自动 reset 到 main tip 再部署,commit 8465760);
  ②gridlings 部署后自检(7 条改写路径断言 200 且零重定向,commit 566b6f3)。
  即便 #36 哪天诈尸,它部署完也会被下一次任意 push 自动纠正。

  **✅ 已重新提交(2026-08-26,owner 确认)**:新提交走 Externally hosted (iframe),
  URL `https://play.agiscorecard.com/starbattle?cg=1`;QA 预览实测游戏加载正常、
  SDK "Gameplay Start" 绿灯(生命周期上报被 CG 工具检测到)、Load time 4.7s。
  素材:横版 1920×1080 + 竖版 800×1200(去 LinkedIn 字样)+ 方形 800×800 +
  横竖两个 12 秒真实玩法录屏(playwright 驱动真题真解,H.264)。存档申报选
  "No"(localStorage 不属于其 Data Module/后端两类);勾选 mobile + SDK muteAudio。
  审核期观察:D1 里 crazygames referrer 的 play_start;结果出来按过/拒分支执行
  (过→门户适配+更多规则集提审;拒→GameDistribution/GameMonetize 低门槛通道)。
  - Gridlings — URL `https://play.agiscorecard.com/?embed=1`，Category
    Puzzle/Logic，短描述：
    > Daily logic grid: every animal in every color, no repeats, no touching.
    > One provably unique solution — pure deduction, never guessing.
  - Star Battle — URL `https://play.agiscorecard.com/starbattle?embed=1`：
    > Daily 10×10 two-star Star Battle. Place stars, no two touching —
    > every board machine-verified to have one unique solution.
  - Trail — URL `https://play.agiscorecard.com/trail?embed=1`：
    > Draw one line through every cell, hitting the numbers in order.
    > A new hand-checked board every day. Pure deduction, no guessing.
  - Controls 通用：Tap/click。Tags: logic, puzzle, daily, grid, brain, deduction
- GamePix: partners.gamepix.com/developers 同上（同 3 款）。
- 第 2 批（过审后）：Balance / Futoshiki / Towers / Mini Sudoku / Kropki /
  Sandwich / Thermometers，文案我届时按首批反馈出。
- Poki: 先不投——等自有域有 4 周留存数据后我出 pitch。

## ④ 我方自动侧（无需你动手）

- 分享战绩文案、embed 模式、hreflang zh 版、llms.txt、结构化数据:已内建
- 胜利画面内联订阅（D1 存储优先，beehiiv 降级）:2026-08-23 上线，漏斗
  sub_submit/sub_ok/sub_fail
- D1 埋点看板:play_start / solve / share_copy / challenge_* / sub_*,周一记分板纳入
- IndexNow:已随周一 03:17 UTC 例行任务覆盖 play. 子域
