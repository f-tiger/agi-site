# itch.io 上架：owner 操作手册（2026-09-06）

七款游戏的打包与推送已经全自动，API key 也早就配好了。**缺的只有两件事**：
七个项目页、每页一次的素材上传。做完之后，以后每次改游戏，推 main 就会自动更新 itch 上的版本，
不需要再登录 itch。

为什么一款一页而不是一个合集页：itch 的曝光单位是项目页，一个合集页只占一个「新作」位，
七个页面就是七个位，且每页能各自吃自己的标签流量。

---

## 第 0 步：已经做完了（2026-09-06 用部署日志核实）

`BUTLER_API_KEY` 早就配好了，合集页 `gridlings/gridlings-11-daily-logic-puzzles` 每次部署
都在正常更新（09-06 那次是 `✓ 6.19 KiB patch`）。**不要**重新生成 key。

同一次运行里，七款游戏的推送全部报同一个错：

```
creating build on remote server: itch.io API error (400): /wharf/builds: invalid game
```

`invalid game` 的唯一含义是 **`gridlings/<slug>` 这个项目不存在**，与 key 无关。
所以真正缺的只有第 1 步。

> 记录一次判断失误：本会话曾按「butler 步骤只跑了 3 秒」推断 key 没配，这是猜测。
> 正确做法是直接读那一步的日志——`BUTLER_API_KEY: ***` 和 `invalid game` 都写在里面。

## 第 1 步：建七个项目页（每个约 3 分钟）

itch.io → 右上角 **Upload new project**。七款各建一个，**URL 必须与下表的 slug 完全一致**，
否则 CI 找不到项目：

| slug（URL 必须是这个） | 标题 | 分类 | 建议标签（itch 最多 10 个） |
|---|---|---|---|
| `overfit` | OVERFIT | Action | html5, arcade, ai, survival, top-down, singleplayer |
| `prompt` | PROMPT | Puzzle | html5, puzzle, programming, logic, robots, singleplayer |
| `mimic` | MIMIC | Puzzle | html5, puzzle, ai, machine-learning, logic, singleplayer |
| `overseer` | OVERSEER | Arcade | html5, arcade, ai, reflex, top-down, singleplayer |
| `minima` | MINIMA | Puzzle | html5, puzzle, exploration, logic, maze, singleplayer |
| `singularity` | SINGULARITY INC. | Clicker | html5, idle, clicker, incremental, ai, management |
| `ghostline` | GHOSTLINE | Racing | html5, racing, driving, 3d, ai, low-poly, time-trial |

每页的固定设置（七页都一样，填错了 itch 上就打不开）：

- **Kind of project**: `HTML`
- **Uploads**: 先随便传一个占位 zip 也行，**或者干脆不传**——第 2 步 CI 会自动推真正的包。
  如果你先传了占位包，记得把它标成 *This file will be played in the browser*。
- **Embed options**: `Embed in page`，宽 **1280**、高 **720**，勾上 **Fullscreen button**
  和 **Mobile friendly**（七款都做了手机适配）。
- **Pricing**: `No payments`（免费）。
- **Visibility**: 先设 **Draft**，等 CI 把包推上来、你自己试玩一遍再改 **Public**。

## 第 2 步：让 CI 把包推上去（不用你动手）

项目页建好后，仓库下一次推 main 就会自动执行：

```
butler push /tmp/itch-<slug> gridlings/<slug>:html
```

七款逐个推，butler 只上传变化的文件。**如果你不想等下一次代码改动**，可以去
https://github.com/f-tiger/agi-site/actions/workflows/deploy-gridlings.yml
点 **Run workflow** 手动触发一次。

推完去每个项目页看一眼 **Uploads** 里有没有出现新版本（版本号是当天日期），有就说明通了。

## 第 3 步：每页的素材（要你上传，CI 不管这个）

itch 的封面、截图、预告片必须在网页上传，butler 推不了。文件都已经生成好在
`sites/gridlings/dist-store/<slug>/`：

- **Cover image**：`<slug>-cover-itch-630x500.png`（itch 要求就是 630×500）
- **Screenshots**：一款传 2–3 张实机图即可。
- **Trailer**：可选。itch 支持贴 YouTube 链接，也可以先不放。
- **Description**：直接抄 `docs/cg-store-copy.md` 里对应那节的 Description + Controls，
  两段之间空一行。那份文案是按 CG 规则写的，itch 通用。

## 第 4 步：上架当天与之后

itch 的推荐算法吃**外部流量 + 近期活跃**，光挂着不会有量：

1. 七页都 Public 之后，从主站 hub（play.agiscorecard.com）和 /ai-games 页各加一条 itch 链接。
2. 隔周发一条 devlog（模型这周学到了什么、加了什么赛道），itch 的 devlog 会进关注者 feed。
3. 标签别乱堆，按上表来；`html5` 这个标签的浏览量最大，七页都要有。

**怎么看有没有效果**：D1 里按来源单列计数

```sql
SELECT day, COUNT(*) FROM pageviews
WHERE ref LIKE '%itch.zone%' OR ref LIKE '%itch.io%'
GROUP BY day ORDER BY day DESC LIMIT 14;
```

判定线仍是 09-24：itch 来源真人 pv ≥150、或任一款游戏页 ≥25。不达标就说明 itch 这条渠道
对这个题材不成立，写进反面发现，不再投时间。

---

## 会话侧已经做完的部分（不需要你操作）

- `package_blocknova.py` 产出 `site/downloads/itch/<slug>.zip`（**不带 CrazyGames SDK**，
  那个 SDK 在 itch.zone 域名下不会加载，带着反而会报错）。
- 部署 workflow 里的 butler 步骤对七款逐个推送，任何一款失败只 warning，不阻断部署。
- 七款的 630×500 itch 封面已全部生成。
- `BUTLER_API_KEY` 已配置并验证可用（合集页在正常自动更新）。
- 商店文案七款齐全，GHOSTLINE 那节已按新加的金色幽灵更新。
