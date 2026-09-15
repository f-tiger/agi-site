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

## 五款老游戏一次性接入（2026-09-07，owner：「改造后续的几个游戏，确保一次能够提交通过」）

**做法上的选择**：不把 GHOSTLINE 的桥手工复制五遍。那些游戏早就把
`window.<前缀>Cg` / `window.<前缀>Ad` 暴露成了全局，本身就是现成的抽象边界，
所以新增 `tools/portal/playgama-portal.js` **一个文件服务五款**，
打包时注入并换绑那两个全局，**游戏本体一行未改**。
前缀：overfit=of · prompt=pm · mimic=mc · overseer=os · minima=mn。

**GHOSTLINE 的五条教训全部内建在这个共享文件里**：①广告点必须点击可达
②SDK 未就绪不消耗冷却 ③覆盖 SDK 自带的 initialInterstitialDelay
④广告期间暂停 + 静音 ⑤init 与广告错误永不吞掉（写 `GL_PG_ERR` / `GL_AD_ERR`，
SDK 缺失时页面底部红色横幅）。

**顺带查出一个会直接导致 MINIMA 认证失败的问题**：它的 `mnAd` **定义了两次、从未被调用**——
提交上去会卡在 Interstitial 那一步，而且连个能触发的地方都没有。已在「下一关 / 重开」
按钮上补了触发点（该游戏的自然中断点，也是点击可达的那个）。

**五款实测（Playwright，逐款）**
| 游戏 | Bridge 初始化 | 桥接换绑 | 广告链路 | done() 必调 | console error |
|---|---|---|---|---|---|
| overfit | 204ms | ok | loading→failed | ✓ | 0 |
| prompt | 336ms | ok | loading→failed | ✓ | 0 |
| mimic | 312ms | ok | loading→failed | ✓ | 0 |
| overseer | 255ms | ok | loading→failed | ✓ | 0 |
| minima | 258ms | ok | loading→failed | ✓ | 0 |

`failed` 只因本地无广告库存；真实平台上应走到 `opened`。上限是 30 秒，这五款都在 0.35 秒内。

**每款的自我声明答案（别填错，填 Yes 换过审是假声明）**
| 游戏 | Rewarded | Interstitial |
|---|---|---|
| OVERFIT / PROMPT / MIMIC / OVERSEER / MINIMA / GHOSTLINE | **No** | **Yes** |
| SINGULARITY | **Yes** | No（它用的是激励视频） |

**SINGULARITY 尚未接入**：它和 GHOSTLINE 一样是 src 构建、且用激励视频而非中插，
形状不同，单独处理。

## SINGULARITY 接入（2026-09-07，七款齐了）
它和另外六款形状不同，所以单独一轮：**用激励视频不用中插**，且是 src 构建。
- 沿用 GHOSTLINE 的 `PORTAL` 契约（`on / ev / ad / data`），新增 Playgama 实现，
  游戏逻辑零改动（10 处调用点统一换名）。
- **点击可达天然满足**：它的三个激励入口（`#adboost` / `#adtrain` / 离线结算的
  「看广告 ×2」）本来就是可见的自愿点击按钮，认证工具点得到。
  但有个前提——那块面板由 `PORTAL.on` 控制显隐，所以 Playgama 下 `on` 必须为 true，已实测面板可见。
- **激励视频只在 `rewarded` 状态计入奖励**，中途关闭不给奖励（`closed` 时看 `paid` 标志）。
  这条和中插不同，写错就是白送奖励或该给不给。
- **放置类特有的一条**：广告期间必须停掉经济。不停的话玩家看广告的时间也在产钱，
  既不公平也会被审核挑出来。实测暂停 2.5 秒内金额 100 → 100，纹丝不动。

**实测**：Bridge 初始化 2.878 秒（上限 30）、广告面板可见、激励链路
`loading → failed`（本地无库存）、零 console error、无 SDK 缺失横幅。
门禁：fleet-smoke / cg-package-smoke（157.8KB，gameplayStart 1379ms）/ verify-singularity 全绿。

**自我声明**：Rewarded = **Yes**，Interstitial = **No**。与另外六款相反，别填错。

## 2026-09-15：主目录对「AI 做的游戏」另开一条路；七款首次在真实平台上被实测

owner 当天开通了会话的全权限出网，于是三件从 09-07 起一直只能当假设背着的事，今天第一次
有了实测答案。下面每一条都带取数方式，后续会话可以自己重跑。

### 一、两款被拒，但**这次不是那句无信息量的模板**
GHOSTLINE(09-14 13:02 UTC)与 SINGULARITY(09-14 13:39 UTC)的审核结论原文一字不改：

> For games created with AI, we offer a dedicated way to test them on Playgama before they
> can be considered for our main catalog. Publishing through Playgama MCP allows you to get
> your first players and see how the game performs. At the same time, it gives our team real
> performance data that we can use to identify the strongest games for potential placement
> in the main Playgama catalog. Learn more: https://playgama.com/mcp/

**这是分流，不是质量判决。** 它和 CG 三连拒的「overall quality」是两种东西：CG 那句不可
拆解、无法行动；这句给了确定的下一步——**先进 sandbox 跑出真实数据，再拿数据回主目录**。
所以 09-09 记的「Playgama 是门户线唯一还活着的一支」仍然成立，只是路径换了。

**别自作主张重投**：两款的 `get_submission_state` 都是 `allowed:true` / `failedAttempts:1`，
技术上随时能再交，但空手再交只会拿到同一条回复。**要等 sandbox 的 performance data。**

其余五款(PROMPT / OVERFIT / MIMIC / OVERSEER / MINIMA)状态 `PROCESSING`、审核任务 `NEW`、
零评论 —— 还在队列里没被人看过。PROMPT 09-08 那次「overall quality」拒稿已被重新提交覆盖。

### 二、七款全部进了 sandbox，三个免费流量轮在跑
七款于 09-15 14:49–14:50 UTC 各自发布到 sandbox，都有公开可玩链接(链接一律从
`get_sandbox_state` 取，**永远不要自己拼**，地址随部署变)。

免费流量轮(Playgama DSP 广告投放)14:53 起跑，**只跑起来三个**：GHOSTLINE、SINGULARITY、
PROMPT。每轮 **$2 / 7 天 / 预期 ~100 次 gameplay / 6 条创意**，素材是从封面裁的。
另外四款一律被拒为 **`ORG_LIMIT`** —— 整个组织同时只能有三轮。免费额度用完后是
**$20 买同样的 $2/7 天/100 gameplay 包**，现在 `available:false`，**买不买是 owner 的决定，
会话不代花钱**。

### 三、真实平台实测：三个假设全部成立(新工具 `tools/verify-playgama-live.js`)
```
node tools/verify-playgama-live.js <siteId> ...        # 七款健康检查
node tools/verify-playgama-live.js --ad <siteId>       # 外加一次中插实拨
```
七款逐个跑完，结果一致：Bridge 2.1.0 已初始化、**`platform.id = "playgama"`**(离线一直是
`mock`，平台识别到底生不生效此前无从得知)、无 SDK 缺失横幅、`GL_PG_ERR` 与 `GL_AD_ERR` 均为
null、**console error 0 条**。

**广告真的有填充**：在 GHOSTLINE 上实拨一次 `showInterstitial()`，状态链是
**`loading → opened → closed`**。09-07 以来所有离线测试都停在 `loading → failed`，那只说明
本地没库存，**从来不构成任何关于填充的证据**。这是变现链路第一次被端到端证明走得通。
(只拨了这一次，是诊断不是刷量；别把它变成习惯。)

**09-07 的 CORS 修复在生产上确认有效**：从 `sb-*.games.playgama.net` 发出的
`POST play.agiscorecard.com/e` 返回 **200**，D1 里能查到对应行。此前这条只能在 runner 的
部署自检里断言，沙箱打不到。

### 四、舰队史上第一批真实门户玩家：16 次开局，0 次二次事件
D1 `gridlings-events` 现查(14:53→15:19 UTC，**26 分钟窗**)：
- **非 US 的 `play_start` 共 19 次**，十个国家：AM 8 / EG 2 / IN 2 / DE·GA·JO·NA·TR·VN·ZA 各 1。
  集中在 SINGULARITY，其次 GHOSTLINE 与 PROMPT。
- **别把它读成 19 个玩家**：AM 一国占 8 次，可能是同一人反复开局，也可能是低质流量。
  DSP 买来的量要按国家分布看一眼再引用。
- 同窗 US 行恰好 9 条 = 本会话 9 次探针页面加载，**全部剔除**(口径保守，宁可少算)。
- **solve / play_again / game_over / hint_used 全部为 0。**

**这就是当前读数：流量进得来，人留不住。** 40 分钟的快照不是判决——有些二次事件本来就要玩
更久才触发——但它指向的问题跟站内那条「一坐下连玩 5–6 款」的强行为完全相反，值得在 09-22
结算时认真看。

取数 SQL(后续会话照抄)：
```sql
SELECT name, COUNT(*) n FROM ev
WHERE ts >= '2026-09-15 14:53' AND ref LIKE '%games.playgama.net%' AND country <> 'US'
GROUP BY name ORDER BY n DESC;
```

### 五、判定线(已进 `data/fleet-bets.json`)
- **`gridlings-playgama-traffic-0922`**：三轮免费流量结束时，非 US `play_start` 累计 ≥150
  且二次事件 ≥15 → 拿这批数据回投主目录，并评估 $20 付费轮；否则门户线判负，游戏降为只维护，
  **不买付费流量**。
- **`gridlings-playgama-five-0925`**：排队中的五款是否有任何一款进主目录。全部拿到同一条
  AI 分流回复 = 主目录对本舰队的 AI 游戏关门，此后只经营 sandbox 面。

### 六、会话侧操作纪律
- `publish_sandbox` 与 `start_sandbox_traffic` 都是**立即对外生效**的动作(前者无审核即公开，
  后者花钱且不可撤销)。**发布与投流之前先问 owner**；本会话只做只读检查与一次广告实拨。
- 提交审核、上传截图、回滚到上一版 —— MCP 里都没有，只能 owner 在后台做。
- 排行榜 / 内购 / 封面上传的工具都在，但**在留存问题解决之前不碰**：没人玩完第一局，
  排行榜是空的。

### 七、15:40 UTC 刷新 + **口径纠正：上一条「人留不住」的对照组选错了**

**最新读数(14:53→15:40，47 分钟)**
- 非 US `play_start` **23 次**、**13 个国家**(AM 8 / VE 2 / IN 2 / EG 2 / CA·DE·GA·JO·MY·NA·TR·VN·ZA 各 1)。
  同窗 US 9 条 = 本会话 9 次探针，已剔除。二次事件仍为 **0**。
- 花掉的钱：GHOSTLINE 2.14% / SINGULARITY 1.68% / PROMPT 1.81% of $2 ≈ **合计 $0.11**，
  即 **≈$0.005 / 次开局**。注意他们的 `expectedGameplays:100` 与我们的 `play_start` 不是同一个口径，
  别拿这个单价去外推整轮。
- 投放明显前重后轻：14:53→15:21 的 28 分钟里 22 次，之后 19 分钟只有 1 次。$2/7 天会按天配速，
  **不要用第一小时去推一周**。
- 一条意外：OVERFIT(`gdzylsey5i`)没有投放，却在 15:30 收到一次 CA 的开局 —— sandbox 链接本身有
  自然曝光。样本 1，只记录不解释。

**纠正：上一节说的「流量进得来人留不住，与站内『一坐下连玩 5–6 款』正相反」，对照组拿错了。**
那条强行为属于拼图那批，不属于这七款。同一 28 天窗、自有域、按页看：

| 页面 | play_start | solve | 完成率 |
|---|---|---|---|
| `/towers` | **188** | **104** | **55%** |
| `/trail` | **27** | **17** | **63%** |
| `/starbattle` | 11 | 0 | 0 |
| **七款门户游戏合计**(ghostline 1 / overfit 9 / prompt 5 / mimic 4 / minima 3 / overseer 3 / singularity 2) | **27** | **0** | **0**(二次事件只有 2 次 play_again + 2 次 game_over，7.4%) |

**两条结论因此改写：**
1. **不能说「买来的流量是垃圾」。** 自有域上这七款 27 次开局也只有 2 次二次事件(7.4%)；
   23 × 7.4% ≈ 1.7，**观测到 0 与自有域的比率在统计上分不开**。留不住人是**产品问题，不是渠道问题**。
2. **Playgama 今天 47 分钟带来的开局(23)已经超过这七款在自有域 28 天的总和(27)。**
   GHOSTLINE 尤其极端：自有域 28 天 **1 次**，Playgama 上 **11 次**。
   **门户已经是这七款有史以来最大的玩家来源**，这跟「门户线要不要继续」是两个问题。

**因此浮出一个此前没人问过的问题：`PLAYGAMA` 列表里装的是留存最差的七款。**
`package_blocknova.py` 的 `PLAYGAMA` / `PLAYGAMA_SHARED` / `ITCH` 三个列表从来只有这七款
AI 主题游戏；**towers 与 trail 这两款唯一有真实完成率的游戏，一次都没打包过。**
towers 是 8KB 页 + `app-towers.js` + 两个 JSON，依赖全是根相对路径，门户构建的清洗逻辑已经现成；
`solve → 下一题` 还天然是一个**点击可达**的中插点(认证最卡的那一关)。
**这条不在本轮动手**——它要改打包器、要重跑认证、要 owner 决定，属下一轮的「扩张」槽，
而扩张只能从 won 的行长出来，现在台账里一条 won 都没有。先让 09-22 那条判定线跑完。

**itch 顺带一读(09-24 判定线)**：累计 44 play_start / 13 solve，判定线要 150 / 25；
最后一次开局 09-11、最后一次 solve **08-27**。**大概率判负，到期照原文结算。**
