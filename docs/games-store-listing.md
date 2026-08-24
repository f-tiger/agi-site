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
