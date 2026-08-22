# 薄 PRD：自研日更约束谜题（web-first）— 2026-08-22

依据：`puzzle-game-research-2026-08.md`（三路调研）。按舰队三门规则 + 五步闭环。

## 三门

- **数据门 ✅**：owner 朋友一手信号 $20/天×<2 月（栈待核，两问：哪个平台？毛还是净？）；
  独立佐证：LinkedIn 逻辑谜题 ~350 万日玩家、84% 次留；Clues by Sam 单人 web 日更
  2025-05 上线 → 2026 初 5 万 DAU 纯自然；门户中位收入带 $200-2000/月（Cinevva 2026）。
- **需求门 ✅**：「queens game unlimited」类 SERP 有 7+ 个变现克隆站长期存活 = 已验证
  搜索需求；LinkedIn 官方谜题日更答案页成为内容农场品类；**中文/非英语 SERP 与微信
  生态零供给**（明确查证的空白）。
- **商业门 ✅**：三条营收路径——①CrazyGames 等门户分成（月结 €100 起付，真钱）；
  ②Poki 规则下自有域名流量 100% 归开发者（与 SEO 打法互补）；③游戏页挂舰队订阅钩
  （beehiiv utm_source=game）计入 5 订阅证伪线。

## 产品（v0 范围）

- 纯静态 web 游戏，原创名字+原创视觉（**绝不用 LinkedIn/Queens 于名称、域名、图标**；
  比较文案仅「games like LinkedIn Queens」）。规则集 = 朋友已验证的形状：4×4→6×6
  行列约束 + 相邻禁制，**日更一题（种子=日期，可证唯一解）+ 无限模式 + 存档页**。
- 增长机制按证据强度内建：无剧透 emoji 分享物 + 解题耗时 + streak；「纯演绎可解、
  无需瞎猜」作为设计承诺（Clues by Sam 差异化的移植）。
- 舰队四件套：WebApplication JSON-LD / ai-tools 两表行 / `?embed=1`+品牌回链 / D1 埋点
  （pv + play_start/solve/share_copy/sub_click 白名单）。zh 版同步出（空白侧翼）。
- 变现 v0 = 门户分成 + 订阅钩。**不接 AdSense**（RPM $1-4 不值得脏首屏）。

## 上线序列

1. v0 上线自有子域（原创品牌）→ r/WebGames + Show HN（生成器技术钩）由 owner 手发
2. +2 周：CrazyGames 投稿（2-4 周审核）；GamePix 跟投
3. 自有域留存数据成形后再 pitch Poki（精选制）
4. **无限期搁置**：iOS/Android（12 测试员×14 天 + 4.3 拒审重灾）、Apple Ads、
   微信小游戏（软著+备案+个人主体流量主存疑——若 zh 需求起量，先 MP 后台一手核实）

## 判定线

上线后 60 天（≈2026-10 底）：JS 真人 play_start ≥500/28d 或任一门户过审上架或
首笔门户分成入账 → 加码（更多规则集，Brennerd 组合模式）；三者皆无 → 降为零维护
静态存在，不再投入。中期任何时点 LinkedIn 开始执法（DMCA/C&D 出现）→ 立即改名
去比较性文案，保自托管版。

## 风险

克隆商品化（品类结构性风险，Verified Market Reports）；LinkedIn 执法姿态可随时转向
（NYT 2024 先例）；朋友 $20/天的栈未核实前，**不把该数字当成本项目的预期收益**。
