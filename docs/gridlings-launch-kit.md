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

## ③ 门户投稿（第 2 周，需要你注册开发者账号，各约 10 分钟）

**首批投 3 款**（新账号一次挂 10 款容易被当刷量；先用最有辨识度的三款过审建立
账号信誉，2 周后补投其余）：Gridlings、Star Battle（2★ 是差异点）、Trail（Zip
需求最大）。全部 `?embed=1` iframe 就绪。

- CrazyGames: developer.crazygames.com 注册 → 提交 URL。审核 2-4 周。
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
