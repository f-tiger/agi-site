# Coolmath Games 投稿套件(2026-09-08 建)

**先读这个,再决定投不投。** Coolmath Games 是 2026-05 去重网页受众全球前五的门户,而它的
提交规则**要求**无广告、无外链、无统计回传——这三条恰好是本站页面的原样承诺。代价是:
**在这条渠道上我们完全没有数据**(没有信标就没有 D1;没有外链就没有品牌回流)。
换来的是它的受众,和它买的**非独占一次性授权费**(不是按流量分成——这是舰队目前唯一一条
「不靠我们的流量」的游戏收入形状)。

**这个取舍属于 owner,会话不代决**(2026-08-27 立规)。下面是决定「投」之后需要的全部东西。

## 一、它的七条规则,与我们的逐条核对

来源:coolmathgames.com/submit-a-game 与 developers.coolmathgames.com(读取日 2026-09-08;
**原页在会话沙箱内被出网代理拦截,以上规则由检索反查得到**——若 owner 打开后台看到条款有变,
以后台为准并回头改这份文件)。

| 它的规则 | 我们的状态 |
|---|---|
| 必须 HTML5,不要任何插件 | ✅ 单文件 / 少量同目录文件,零插件 |
| 必须是需要**逻辑、策略或解题**的「思考型」游戏 | 逐款看下表 |
| 无暴力、无脏话 | **OVERFIT 不合格**(射击);其余合格 |
| **无广告,明文包括「不给你自己的站或公司做广告」** | ✅ clean 变体整块删掉页脚 |
| **无任何外链** | ✅ clean 变体断言零外部锚点 |
| **不得有向开发者回传的统计计数器** | ✅ clean 变体接管 `sendBeacon`/`fetch` 实测零调用 |
| 不收集用户数据、无姓名输入之类的功能 | ✅ 无账号、无表单(订阅 CTA 在 clean 里已删) |

**要传的文件一律是 clean 变体,别传别的**:
`https://play.agiscorecard.com/downloads/clean/<slug>.zip`
(CI 每次部署重建;`downloads/cg/` 与 `downloads/playgama/` 里的包**带广告**,传过去等于当场违规。)

## 二、逐款资格与建议顺序

**先投三款,不要一次投十七款。** 这是人工curate 的门户,一次投一批的效果由**最差的那一款**决定;
先用三款测一次他们的口味,拿到回音再决定要不要铺开。

| 游戏 | slug | 思考型? | 资格 | 建议 |
|---|---|---|---|---|
| **Mini Sudoku** | `minisudoku` | 纯演绎,唯一解 | ✅ | **第一批**——全站真人通关率最高的一款(3/4,手册 2026-08-28 表) |
| **PROMPT** | `prompt` | 给机器人写指令序列 = 编程解谜 | ✅ | **第一批**——深度美术轮已过(专属字体 Fredoka One、过关转场、音层) |
| **MINIMA** | `minima` | 只用玩家可见信息即可证明每关可解(`verify-minima.js`) | ✅ | **第一批**——瑞士几何美术,与其他款不撞插画语言 |
| Trail | `trail` | 一笔穿过每格,纯演绎 | ✅ | 第二批(已证实可完成,4/6) |
| Star Battle | `starbattle` | 每区恰好两星,纯演绎 | ✅ | 第二批(区域配色 2026-08-27 已修到 dE76 23.7) |
| Gridlings / Balance / Futoshiki / Towers / Kropki / Sandwich / Thermometers / Nonogram | 同名 | 全部纯演绎、唯一解 | ✅ | 第二/三批 |
| MIMIC | `mimic` | 从样例归纳规则 = 归纳解谜 | ✅ | 第二批 |
| Block Nova | `blocknova` | 空间解题,但偏手速与运气 | ⚠️ 「思考型」偏弱 | 押后,先看前两批口味 |
| OVERSEER | `overseer` | 限时注意力调度,反应成分大 | ⚠️ 「思考型」偏弱 | 押后 |
| **OVERFIT** | `overfit` | — | ❌ **撞「无暴力」条款** | **不投**。clean 包仍构建(授权用),但不投 Coolmath |
| GHOSTLINE | `ghostline` | 竞速,不是思考型 | ❌ 双重不合格 | 不投 |
| SINGULARITY | `singularity` | 放置经营,策略成分有 | ⏸ **clean 包还没有**——产物需先从 `games/singularity/` 重建才会带 GL_CLEAN 守卫 | 重建后再议 |

## 三、第一批三款的投稿文案

后台表单的字段名在沙箱里读不到,所以下面按「名称 / 一句话 / 描述 / 操作」给素材,
owner 按表单实际字段对应填入。**描述里不要写游玩量、评分、奖项**(零编造规则照旧),
也不要写任何 URL。

**这三段全部改写自各款自己的页面文字与源码**(rules 块、`featureList`、按钮标签、`e.code` 分支),
不是凭印象写的——**第一版曾把 MINIMA 写成「看着等高线图找最低点」,而这款的地形恰恰是看不见的**,
那种错误发出去就是对平台的虚假陈述。改文案先回去读页面,别回忆。

### Mini Sudoku
- **名称**:Mini Sudoku
- **一句话**:The quick-coffee version of sudoku — same logic, five minutes.
- **描述**:Fill a 6×6 grid so every row, every column and every outlined 2×3 box contains the
  numbers 1 to 6 exactly once. Every board has exactly one solution, machine-verified before
  publication, and it is always reachable by deduction alone — no guessing, no backtracking.
  A new daily board goes live at 00:00 UTC, the same one for every player, plus unlimited
  free play in three difficulties.
- **操作**:Tap a cell to cycle through 1–6 and back to empty; the number pad and the keyboard
  both work.
- **分类归属**:logic / puzzle(按他们后台的分类名对应)

### PROMPT
- **名称**:PROMPT
- **一句话**:It does exactly what you said. It obeys the words, not the meaning.
- **描述**:Add instructions — FWD, LEFT, RIGHT — then press RUN and watch the machine carry
  them out literally. A level is solved when the spec is satisfied, and the puzzle is that a
  machine following your words exactly will happily take any shortcut you forgot to forbid.
  When that happens you rewrite the level's instructions rather than the machine.
- **操作**:Click FWD / LEFT / RIGHT (or W / A / D, or the arrow keys) to add a step,
  Backspace to remove the last one, Space or Enter to run.
- **分类归属**:logic / puzzle

### MINIMA
- **名称**:MINIMA
- **一句话**:You can only feel the slope. And a flat spot is not always the bottom.
- **描述**:The ground is invisible. All you get is an arrow showing which way is downhill from
  where you stand, a step budget, and a target to bring your LOSS down to. Walking downhill
  finds a low point quickly, but not always the low point you needed — so each of the six
  levels is really a decision about when to stop descending and pay to start somewhere else.
- **操作**:WASD or the arrow keys to move one step. The HEAT button jumps you to another part
  of the surface, spending part of your step budget. Space or Enter continues.
- **分类归属**:logic / puzzle

## 四、owner 的步骤

1. 到 **developers.coolmathgames.com** 建开发者账号(若尚无)。
2. 每款投稿的 Build 用 `https://play.agiscorecard.com/downloads/clean/<slug>.zip`
   (minisudoku / prompt / minima)。
3. 封面素材可复用现有的:`dist-store/<slug>/`(CG/itch 三张海报同一配方)。若他们要求特定尺寸而
   现有素材不合,回话里说一声,`tools/capture-store-assets.js` 加一个尺寸即可。
4. 他们如果给授权报价:**金额、条款和是否非独占三件事记进台账**——这会是舰队第一笔与流量无关的
   游戏收入,直接计入 2026-12-05 那条总线。
5. 45 天没回音就在报告里记一次「无回复」;60 天归档,不追。

## 五、投出去之后要记住的两件事

1. **这条渠道我们是瞎的。** 没有 D1、没有 GA、没有引荐。唯一的读数是他们后台给的(如果给)。
   **不要**为了拿数据而在 clean 包里偷偷留信标——那是对着审我们的平台说假话,和 2026-09-07
   那次「CG 包带着一句『无广告』」是同一类错误,只是方向相反。
2. **clean 包是可以被任何人转手自托管的**,因为它无埋点无外链。这是这个变体的固有代价,
   已在 `docs/games-distribution-2026-09.md` 第五节写明;不假装能防,只是不把它放进
   `/downloads` 的浏览界面。
