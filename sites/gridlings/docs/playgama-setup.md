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
3. ~~后台会生成 config，用它替换占位文件~~ —— **这条是错的，2026-09-07 更正**。
   `playgama-bridge-config.json` 是**我们自己写的**，不是后台生成的：SDK 只是在初始化时
   fetch `./playgama-bridge-config.json`，字段（`advertisement` / `platforms` /
   `forciblySetPlatformId` 等）全部由开发者填。包里现在带的就是真配置，不需要你替换。
   （后台确实会给一个 `saas.publicToken`，但那是排行榜、每日奖励这类 SaaS 功能用的，
   基础广告不需要。）
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

## 认证第二次未过：SDK initialization check failed（2026-09-07）
报错原文：**"Platform did not receive the initialization signal from the game within 30
seconds. Ensure the script is connected in index.html and the initialization method is
called correctly at startup."**

**已改的两处**
1. **SDK 改成 index.html 里的静态 `<script src>`**，由打包器插在游戏 bundle 之前。
   原来是游戏代码运行时动态注入的——认证提示里那句 "ensure the script is connected in
   index.html" 就是在说这件事；静态标签同时消掉了「注入的脚本 onload 不触发 → 永不初始化」
   这个失败模式。动态注入保留为兜底。
2. **初始化失败不再被吞掉**。原来 `.catch(() => {})` 让 init 拒绝和「平台没收到信号」
   看起来一模一样——而后者正是它造成的症状。现在失败原因写到 `window.GL_PG_ERR`，
   并在 1.5 秒后自动重试一次。

**本地实测**：从页面加载到 `bridge.isInitialized === true` 用 **2.8–3.6 秒**（上限 30 秒），
零 console error，点击换赛道仍能触发中插。

**还没排除的一个原因，需要 owner 配合**：包里的 `playgama-bridge-config.json` 仍是占位的
`{"platforms": {}}`。本地 mock 平台下初始化能过，**但他们的真实平台可能要靠这份配置完成握手**。
所以下一次跑认证之前，**先把后台生成的 config 换进去**——这既是变现的必要步骤，
也可能就是这次超时的根因。如果换了配置仍然超时，把 `window.GL_PG_ERR` 的值发我，
那里现在会有真正的失败原因。


## 认证「没有广告」的真正原因（2026-09-07，从 SDK 源码查实）
`initialInterstitialDelay` 是 SDK 自带的冷启动保护，**默认值按平台是 60 / 30 / 180 秒**——
在这段时间内它会**拒绝任何中插请求**。认证跑的时间远短于此，所以无论我们在代码里怎么调
`showInterstitial()`，它都看不到广告。这解释了第一次认证的 findings，也解释了我在本地
只能看到 `loading → failed`。

已在 `vendor/playgama/playgama-bridge-config.json` 里显式覆盖：
`initialInterstitialDelay: 5`（不打扰开局，但认证与真实玩家都够得着）、
`minimumDelayBetweenInterstitial: 60`（游戏侧 `adBreak` 本来就有 90 秒间隔，
这里写 60 是为了让 SDK 不会意外成为更紧的那道闸）。

**教训（已写进 CLAUDE.md）**：接第三方 SDK 时，**平台自带的节流默认值要当成一等公民去查**。
我先后把「没接广告」归因为触发点够不到、又把 init 超时归因为脚本注入方式，两次都只对了一半，
真正的硬闸门写在 SDK 源码的默认值里，不在文档里。

## 第三次仍未过：先诊断，不再盲改（2026-09-07）
同一条报错。**已知事实**：游戏在他们的认证环境里是**跑起来的**（owner 截图里 31.57 秒、
2/4 检查点），但平台没收到初始化信号。这把可能性压到很窄的一个：
**`playgama-bridge.js` 在他们那边没有被加载**，于是 `window.bridge` 不存在，
我们的代码记下错误就退出，而游戏照跑不误——和现象完全吻合。

**本轮不再猜，只做一件事：把这个状态变成肉眼可见的。**
SDK 不可用时（静态标签 404、动态兜底也 404、或全局对象缺失），页面底部会出现一条红色横幅
`SDK NOT LOADED — <原因>`，同时 `window.GL_PG_ERR` 里有同样的字符串。**只有 Playgama 变体、
且 SDK 确实不可用时才会出现**；正常包实测无横幅、无错误。

之前那版有个洞：静态标签 404 后走动态注入兜底，而 `onerror` 是空函数——**又把失败吞了**，
所以第一次加横幅时它根本没显示。现在三条路径共用一个 `sdkMissing()` 上报。

**owner 下一步**：重新上传，再跑一次认证。
- **看到红色横幅** → 他们的环境没有提供 `playgama-bridge.js`。把横幅截图发我，
  下一步是改成从他们的 CDN 加载 SDK 而不是随包自带。
- **没有横幅但仍报同一条** → 在游戏页面控制台里敲这四行，把结果发我：
  `window.GL_PG_ERR` · `typeof window.bridge` · `window.bridge.isInitialized` ·
  `window.bridge.platform.id`。第四条尤其关键：它应该是 `qa_tool`，
  如果是 `mock` 说明他们的平台识别没生效。

## 2026-09-07：Basic Certification 100% 通过，GHOSTLINE 已提交审核（2–5 天）
认证全过，广告在认证工具里成功展示。**根因回顾**：三次失败分别是——① 广告触发点自动跑
到不了；② SDK 用动态注入而非 index.html 静态标签、且 init 失败被 `.catch(){}` 吞掉；
③ **上传了错的包**（传成了 `ghostline-cg.zip`,控制台里 `crazygames-sdk-v3.js initialized`
是铁证)。前两条是真问题、已修；第三条是操作失误,与代码无关。
**两个包别再混**：`downloads/playgama/ghostline.zip`（4 个文件,约 240KB)给 Playgama;
`downloads/cg/ghostline-cg.zip`（1 个文件,约 162KB)给 CrazyGames。

**自我声明题的正确答案（GHOSTLINE）**：Rewarded Ads = **No**，Interstitial Ads = **Yes**。
只有 SINGULARITY 有激励视频。填 Yes 换过审是假声明,不许。

## 广告展示时必须暂停 + 静音（2026-09-07 补齐）
Playgama 的广告遮罩上明写 "The game should be paused and audio muted while this ad is
displayed" —— 而我们当时**两样都没做**：引擎照跑、声音照响，一局比赛可能在广告背后跑输。
- 游戏循环开头加 `window.GL_SDK_PAUSE` 闸门：为真时只推进时间戳、不推进任何游戏状态。
- 接 Bridge 的 `pause_state_changed` / `audio_state_changed` 两个事件。
- **不等平台通知**：广告一进入 `loading`/`opened` 就自行暂停并静音，任一终态释放；
  25 秒超时路径同样释放（否则一个卡住的广告会把游戏永久冻住）。
- 实测：2.5 秒暂停期内比赛计时只前进 **0.10 秒**（那一帧是设标志时已在处理中的），
  释放后立刻恢复。CG 变体的既有静音逻辑不受影响。
