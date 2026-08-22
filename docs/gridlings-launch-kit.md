# Gridlings 首发弹药包（owner 手动发布，机器绝不代发）

生成日 2026-08-22。发布前自查：游戏已可玩（play.agiscorecard.com 打开、当日谜题
正常）、分享按钮复制正常。两个帖子**不要同一天发**——先 r/WebGames（低风险热身、
收集反馈），2-3 天后 Show HN（把 r/WebGames 学到的问题修掉再上）。

## ① r/WebGames（先发）

发帖前花一分钟重读该版当前版规（沙箱够不着 Reddit，我没法替你核实最新规则）。

**标题：**
> Gridlings — a daily logic grid where you never have to guess (free, no account)

**正文：**
> I built a daily constraint puzzle: fill the grid so every row and column has
> each animal once and each color once, every animal+color pair appears exactly
> once, and the same animal never touches itself — even diagonally.
>
> The part I care most about: every board is machine-verified before publishing
> to have exactly one solution reachable by pure deduction. If you're ever
> stuck, there is always a provable next cell — no bifurcation, no guessing.
>
> Daily puzzle + unlimited free play in three difficulties. No account, no ads,
> works on phones. Feedback very welcome — especially whether the difficulty
> ramp feels right.
>
> https://play.agiscorecard.com

**发完后**：把评论区的意见原样贴回给我（尤其难度与 UI），我按真实反馈改。

## ② Show HN（2-3 天后）

**标题（HN 规范：朴素、无营销腔）：**
> Show HN: A daily logic puzzle that's provably solvable without guessing

**正文（首条评论用，HN 惯例是正文留空、URL 直达游戏，作者第一时间在评论区补背景）：**
> I like daily logic grids (Queens/Tango-style) but hate the moment where you
> can't tell if you're stuck or the puzzle wants a guess. So the generator here
> enforces a stronger contract: every published board has exactly one solution
> AND a full solver run proves it's reachable by deduction alone.
>
> Rules: N×N grid, each row/column has each animal once and each color once
> (double Latin square), every animal-color pair appears exactly once
> (Graeco-Latin orthogonality), and the same animal never touches itself,
> even diagonally. The adjacency rule on top of orthogonality is what makes
> boards feel tight — and it quietly kills most board sizes: a full 4×4 is
> already impossible (order 4 has only two non-touching permutations), and
> 6×6 falls to Euler's 36 officers problem. 5×5 is the sweet spot, so that's
> the board.
>
> Stack is deliberately boring: a Python generator bakes 450 pre-verified
> dailies + ~440 free-play boards into static JSON; the client is vanilla JS
> on Cloudflare Workers. No backend, no ads, no account.
>
> Happy to answer anything about the generator or the uniqueness prover.

**守则**：全程真人回复评论；不请任何人点赞；如果没上首页，就当收集了一轮免费
评审——不重发（HN 允许隔一段时间换角度重投一次，那是几周后的事）。

## ③ 门户投稿（第 2 周，需要你注册开发者账号，各约 10 分钟）

- CrazyGames: developer.crazygames.com 注册 → 提交 URL 即可（iframe 友好已就绪）。
  审核 2-4 周。**两款一起投（组合过审率更高，互相导流）：Gridlings + Balance
  （`https://play.agiscorecard.com/balance?embed=1`，Category: Puzzle/Logic，
  短描述：Fill the grid with suns and moons — three of each per row and column,
  never three in a row. One provably unique solution, pure deduction.）**
  Gridlings 投稿文案：
  - Game URL: `https://play.agiscorecard.com/?embed=1`
  - Name: Gridlings
  - Category: Puzzle / Logic
  - Short description (≤ ~140 chars):
    > Daily logic grid: every animal in every color, no repeats, no touching.
    > One provably unique solution — pure deduction, never guessing.
  - Long description:
    > Fill the 5×5 grid so every row and column contains each animal once and
    > each color once, every animal-color pair appears exactly once, and the
    > same animal never touches itself — even diagonally. Every board is
    > machine-verified before publishing to have exactly one solution
    > reachable by logic alone: if you're stuck, there is always a provable
    > next cell. One daily puzzle plus unlimited free play in three
    > difficulties. Tracks your streak, share your solve time spoiler-free.
  - Controls: Tap/click a cell, then tap an animal-color pair from the palette.
  - Tags: logic, puzzle, daily, grid, brain, deduction
- GamePix: partners.gamepix.com/developers 同上。
- Poki: 先不投——等自有域有 4 周留存数据后我出 pitch。

## ④ 我方自动侧（无需你动手）

- 分享战绩文案、embed 模式、hreflang zh 版、llms.txt、结构化数据:已内建
- D1 埋点看板:play_start / solve / share_copy / sub_click,周一记分板纳入
- IndexNow:gridlings 站点无每日内容变更,暂不挂(避免空 ping)
