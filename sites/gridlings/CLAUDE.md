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
