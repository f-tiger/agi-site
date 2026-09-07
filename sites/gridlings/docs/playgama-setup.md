# Playgama Bridge：接入现状与 owner 操作（2026-09-07，GHOSTLINE 试点）

## 为什么做这个（一句话）
Playgama 明确写着「**我们不代你发布到 Poki 和 CrazyGames**，但你可以带着我们的 SDK 自己传」，
所以它与 CG 直投**不冲突、纯加法**。它的托管发行覆盖自己的伙伴网络（月触达 4.5 亿、100+ 伙伴，
含 YouTube Playables、MSN、Xiaomi、Y8、Telegram、Discord），开发者最高拿 **80%**。
对照 GameDistribution 只给 33% —— 覆盖重叠而分成差一倍多，**不做 GameDistribution**。

## 会话侧已完成（代码已上线）
- `games/ghostline/src/main.js` 里原本写死的 `CG` 桥，改成 **`PORTAL` 抽象**：同一份契约
  `on / ev("start"|"stop"|"happy") / ad(type, done)`，背后两套实现（CrazyGames SDK、
  Playgama Bridge），游戏其余代码一行没改。
- 打包新增第三个变体：`site/downloads/playgama/<slug>.zip`，含四个文件——
  `index.html`（带 `window.GL_PG=true`）、`playgama-bridge.js`、
  `LICENSE-playgama-bridge.txt`、`playgama-bridge-config.json`（占位）。
- **Bridge 是 LGPL-3.0-or-later，所以它作为独立文件随包发、永不内联进游戏**，
  并附带许可证原文。这既是该许可证的要求，也是 Playgama 自己的分发方式。
  （提示而非法律意见。）
- 广告页脚声明同 CG：这个变体会播广告，所以「无广告」那句被改写，并有断言拦截。

## 实测结论（Playwright，2026-09-07）
| 项 | 结果 |
|---|---|
| Bridge 加载与初始化 | ok，v2.1.0，`isInitialized=true` |
| 平台识别 | `mock`（本地离线的正确值） |
| 零交互进入游戏 | ok，`state=race` |
| console error | **0**（补上占位 config 之前有 1 条 "Failed to load the bridge config file"） |
| 广告事件链路 | `loading → failed`（离线无库存），处理器映射为 `done(false)`，游戏继续、结算照常 —— **失败开放** |
| 体积 | Bridge 压缩后 **69KB**；ghostline 由 161KB → 约 230KB（gzip） |

**无法在此验证的**：真实广告填充、收入回传、他们的审核标准。这三项必须等真实账号。

## owner 要做的（会话不代注册任何外部账号）
1. 到 https://developer.playgama.com/ 注册开发者账号。
2. 新建游戏，上传 `site/downloads/playgama/ghostline.zip`。
3. **关键一步**：后台会为这个游戏生成 `playgama-bridge-config.json`（含各平台广告位 id）。
   **用它替换包里的占位文件**。不换的话游戏照样能玩、Bridge 照样初始化，
   但**一分广告都不会投，也就没有收入**——这是个不报错的静默失败，所以写在这里。
4. 提交审核，把审核反馈发回来。

## 判定线（事前登记）
试点只做 GHOSTLINE。**其余六款要等第一款过审 + 后台能看到真实展示数之后再批量推**，
理由是我们无法在沙箱里验证他们的审核口味，一次推七款如果踩到同一个坑就是七倍返工。
`tools/package_blocknova.py` 里的 `PLAYGAMA` 列表现在只有 ghostline，扩表即扩量。

## 认证第一次未过：广告触发不到（2026-09-07，已修）
Playgama QA tool 只报一条：**"No advertising is implemented. Certification requires at
least one type of advertising — Rewarded or Interstitial."**

**不是没接，是它到不了。** 原来中插挂在「每完成第 3 局」上，而自动认证跑不完一局赛车——
它开不了车。所以整个认证会话里一次广告调用都观察不到。

修法：广告改挂在**共用的自然中断点**上，`adBreak()` 统一调度，两个触发点共用一个 90 秒冷却：
1. **换赛道**（campaign / daily / random / retry / next 五个入口全部走 `go()`）——
   这是诚实的中断点，**也是只靠点击就能到达的那个**，认证工具因此能观察到。
2. 完赛后每三局一次（原有逻辑保留）。

**开机自动起跑那一条路径刻意不放广告**，否则零交互 gameplayStart 就废了。

**顺带修掉一个真 bug**：SDK 初始化完成前，`PORTAL.ad` 还是立即回调的占位实现，
它什么都不做却会把 90 秒冷却消耗掉。真实玩家开局几秒内换赛道会踩到。已加 `PORTAL.ready`
闸门——SDK 没就绪就不消耗广告位。

**实测证据（只用点击，不开车）**：打开 TRACKS → 点一条赛道 →
`interstitial_state_changed: loading → failed`（failed 只因占位配置下无库存）。
诊断口 `GL.PORTAL` / `GL.adAt` 已留在构建里，方便下次直接看状态。

**owner 要做的**：重新上传新包，再跑一次 certification。跑的时候**至少点一次
TRACKS 再选一条赛道**——那一步就是广告触发点。
