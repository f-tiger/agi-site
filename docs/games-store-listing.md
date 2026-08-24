# 商店批量上传文案(2026-08-24;itch.io 等门户,复制即用)

通用要素:Genre = Puzzle;Kind = HTML(play in browser);定价 = Free(可选打赏);
每包内 cover.png 即 630×500 封面;截图开各游戏页直接截棋盘即可。
通用长描述结尾(每款都加):
> Every board is machine-verified before publication: exactly one solution,
> reachable by pure deduction — never a guess. 450 pre-baked dailies + free-play
> pools. Play the full 11-game daily collection at https://play.agiscorecard.com

| 游戏 | Title | 一句话 | Tags |
|---|---|---|---|
| gridlings | Gridlings — Daily Logic Grid | Animals × colors × adjacency: a daily grid deduction puzzle | puzzle, logic, daily, grid |
| balance | Balance — Daily Binary Puzzle | Suns & moons, never three in a row (Binairo family) | puzzle, binary-puzzle, daily, logic |
| starbattle | Star Battle Daily | Two stars per row, column and region — none may touch | puzzle, star-battle, logic, daily |
| trail | Trail — One-Line Path Puzzle | Draw one line through every cell, hitting waypoints in order | puzzle, path, one-line, daily |
| futoshiki | Futoshiki Daily | The classic inequality Latin square, verified no-guess | puzzle, futoshiki, sudoku-like, daily |
| towers | Towers — Skyscraper Puzzle | Edge clues count the towers you can see | puzzle, skyscrapers, logic, daily |
| minisudoku | Mini Sudoku 6×6 | Full sudoku logic, five-minute boards, 2×3 boxes | puzzle, sudoku, mini, daily |
| kropki | Kropki Daily | Black dots double, white dots differ by one — most boards start empty | puzzle, kropki, sudoku-variant, daily |
| sandwich | Sandwich Sudoku Daily | Sum what sits between 1 and 5 | puzzle, sandwich-sudoku, sudoku-variant, daily |
| thermo | Thermometers Daily | Fill mercury from the bulb; match the counts | puzzle, thermometers, picture-logic, daily |
| nonogram | Nonogram Daily — Never Guess | Picture logic with a measured no-guessing guarantee | puzzle, nonogram, picture-logic, daily |

爆款差距审计结论(2026-08-24,上线前):hint/undo/计时/连胜/挑战对决/emoji 战报
在全部 11 款已齐平 Queens/Wordle 惯例;本日补齐三缺口——①首次进入规则浮层
(firstrun.js,门户玩家秒退主因)②胜利动效(同文件,#win MutationObserver 触发)
③封面与文案包(本文档 + 每包 cover.png)。未做(记为 v2 候选):音效、每步撤销
栈可视化、教学关。

## 嵌入尺寸(2026-08-24 实测,480px 宽视口整页高度)

itch 建议设置:Kind=HTML,Viewport **640×900**,勾选 Mobile friendly + Enable
scrollbars(页面含规则/FAQ,整页 1830–2900px,游戏区在首屏内,滚动是预期行为)。
实测整页高度:gridlings 2901 · nonogram 1981 · kropki 1956 · starbattle 1947 ·
balance 1938 · futoshiki 1886 · trail 1870 · thermo 1860 · sandwich 1856 ·
minisudoku 1854 · towers 1830。

## 深检记录(2026-08-24,owner「上架就获取平台流量+病毒式传播+保障体验」)

- **体验门**:`tools/package-smoke.js` 对 gridlings-all-11.zip(即上传物本身)
  逐款驱动到真实胜利,11/11 过、零真实报错、win 弹窗回流 CTA 在位。源码站冒烟
  同步扩为 23 页 + 11 胜利路径(共享驱动 tools/win-drivers.js;gridlings 核心的
  auto-advance 选择行为已写进驱动注释)。
- **病毒环**:移动端(coarse pointer + Web Share API)分享/挑战按钮追加**原生
  分享面板**(firstrun.js 捕获层,不拦引擎的剪贴板+埋点)——手机门户上的传播
  主通道从「复制到剪贴板」升级为系统分享。
- **平台流量**:每包已带 UTM 回流链/跨域信标/规范挑战链/胜利跨售(同日前一轮)。
