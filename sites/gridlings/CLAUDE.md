# Gridlings(play.agiscorecard.com)— 第七站操作手册(2026-08-22 上线)

**定位**:自研每日约束逻辑谜题(海外 web-first)。依据与判定线全在
`docs/puzzle-game-prd-2026-08.md` + `docs/puzzle-game-research-2026-08.md`
——改动前先读。触发信号:owner 朋友同类游戏(海外平台)$20/天×<2 月。

## 不可放松的硬规则

1. **唯一解承诺是产品本身**。每题发布前由 `tools/gen_puzzles.py` 的求解器
   逐题验证「恰好一个解 + 纯推理可达」。任何为了速度削弱验证的改动都等于
   砸掉差异化——Clues by Sam 用同一承诺做到 5 万 DAU。
2. **法律红线**:产品名/域名/图标绝不含 LinkedIn / Queens / Tango;比较性
   文案只写 "games like LinkedIn Queens"(NYT 2024 DMCA 数百 Wordle 克隆
   是 tripwire;LinkedIn 若开始执法→立即删比较文案,自托管版保原创素材)。
3. **每日谜题绝不移动**:dailies 由日期种子确定性生成,已烘焙 450 天
   (EPOCH 2026-08-24 起)。重生成只许追加天数,不许改已发布日的题。
4. 无广告、无账号、无 lives 系统。变现 = 门户分成 + 订阅钩(win modal
   `sub_click{gridlings_win}` → beehiiv utm_source=gridlings)。

## 第二规则集:Balance(/balance + /zh/balance,2026-08-22,owner「重点拓展游戏方向」)

Brennerd 组合模式落地:同一站壳、第二个约束规则集(6×6 二元平衡,Binairo/Tango 族
——LinkedIn 第二受欢迎规则集,克隆架比 Queens 薄)。生成器 `tools/gen_balance.py`
(含 validate 子命令),450 天每日 + 440 畅玩,同一条唯一解承诺。命名红线同上:
产品名 Balance,绝不用 Tango。两游戏互相导流(modes 行交叉链接);事件同库同白名单,
label 前缀 `bal:` 区分。CrazyGames 投稿以双游戏组合提交(launch-kit ③)。

## 第三规则集:Star Battle(/starbattle + /zh/starbattle,2026-08-23)

选型依据 = 规则集需求实证地图(docs/games-expansion-prd-2026-08.md):Netflix 2026
每日 Starstruck + LinkedIn Queens 相邻效应双锚,伴生架 ~2 站,zh 供给为零,
2★ 10×10 与满架 1★ Queens 克隆区隔。生成器 `tools/gen_starbattle.py`
(星放置→区域生长→唯一解校验;8×8 1★ 接受率 0.2% 但单试便宜,max_tries=50000
是刻意的,别调小)。450 每日(10×10 2★)+ 320 畅玩(easy 8×8 1★/medium/hard)。
挑战链接、clean/embed、双语、信标(sb: 前缀)与前两款同构。
命名注意:页面绝不用 Starstruck/Queens 作品牌;「Star Battle」为通用类型名
(书架与克隆站均通用使用,风险最低)。

## 规则集 4–10(2026-08-23,owner「继续扩展游戏」「游戏扩展到至少10款」)

一夜从 3 款扩到 10 款,全部同壳同契约(450 每日 + ~320 畅玩、唯一解机器验证、
挑战链接 ct=、clean/embed、双语、/e 信标):
- **Trail**(/trail,🐾,gen_trail.py,信标前缀 tr:):Zip 族一笔画。6×6 需
  9–12 个途经点才稳定唯一解——k 调低会非唯一,别动。命名红线:绝不用 Zip
  (LinkedIn 2025-02 已申请商标)。
- **Futoshiki**(/futoshiki,≶,gen_futoshiki.py,ft:):不等号。生成教训:
  稀疏随机起步永不唯一,必须「满边起步再最小化」。
- **Towers**(/towers,🏙,gen_towers.py,tw:):摩天楼。保留全部边线索
  (经典呈现),只最小化已知数——线索最小化有病态种子会跑几分钟。
- **Mini Sudoku**(/minisudoku,🔢,gen_minisudoku.py,ms:):6×6、2×3 宫。
- **Kropki**(/kropki,⚫,gen_kropki.py,kr:):白点差 1/黑点翻倍/无点=都不是
  (负约束是规则的一半,客户端也校验);1-2 对按惯例记黑点。序列化只存 W/B,
  缺席即 N。多数每日 0 已知数。
- **Sandwich**(/sandwich,🥪,gen_sandwich.py,sa:):1 与 n 之间求和,2n 条
  线索全显示(经典呈现),只最小化已知数。
- **Thermometers**(/thermo,🌡,gen_thermo.py,th:):温度计填充,后缀界剪枝
  求解器。客户端点格=填到该格,点水银顶端=回退。
- ms/kr/sa 共用 `site/app-latin.js`(页面注入 `window.LATIN_GAME` 配置);
  thermo 独立 `app-thermo.js`。**zh 页面在 /zh/<slug> 下用相对路径引资源,
  worker 里有一条 /zh/*.ext → 根资源的回退重写——删掉它 zh 页全裂。**
- 新规则集入列清单:生成器+两页+worker 路由×2+sitemap×2+llms.txt+
  gamesnav(全部页面)+CI 门(文件清单+gate 循环)+本节一行。

## 机器结构

- `tools/gen_puzzles.py` → `site/puzzles-daily.json`(450 天)+
  `site/puzzles-pool.json`(easy160/medium160/hard120)。本地跑、结果入仓,
  **CI 不跑生成**(零 schedule,零维护成本);CI 门检查「今天+300 天有题」,
  低于线时人工/会话重跑生成器追加。
- 纯静态客户端(index/zh/app.js/style.css),`?embed=1` 嵌入模式,
  `?p=<diff>-<i>` 畅玩深链。worker:/e 事件白名单(play_start/solve/
  share_copy/hint_used/play_again/sub_click)+ 服务端 page_view。
- D1 `gridlings-events`(bd3b1ca9-e9cb-4b71-9834-df3d67b39504,表 `ev`,
  舰队周一记分板纳入)。
- 部署:deploy-gridlings.yml(push-only)→ Worker `gridlings`,
  play.agiscorecard.com(custom_domain 自动挂)。

## 上线序列(PRD §上线序列)

1. [x] v0 上线自有子域(2026-08-22)
2. [ ] owner 手发:r/WebGames(发帖前重读版规)+ Show HN(钩子=「每日
   可证唯一解的生成器」技术角度,不是「又一个游戏」)
3. [ ] +2 周:CrazyGames 投稿(开放制,2-4 周审核,€100 起付月结);
   GamePix 跟投
4. [ ] 自有域留存数据成形后 pitch Poki(精选制;其规则下自有流量 100% 归我们)
5. 无限期搁置:iOS/Android/Apple Ads/微信(owner 2026-08-22 确认朋友的游戏
   在海外平台,微信线彻底关闭)

## 判定线(60 天,≈2026-10-21)

JS 真人 play_start ≥500/28d 或任一门户过审上架或首笔门户分成入账 → 加码
(Brennerd 组合模式:同一引擎加规则集);三者皆无 → 降为零维护静态存在。
