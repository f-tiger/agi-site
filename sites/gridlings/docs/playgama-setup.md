# Playgama Bridge：接入现状与 owner 操作（2026-09-07，GHOSTLINE 试点）

## 为什么做这个（一句话）
Playgama 明确写着「**我们不代你发布到 Poki 和 CrazyGames**，但你可以带着我们的 SDK 自己传」，
所以它与 CG 直投**不冲突、纯加法**。它的托管发行覆盖自己的伙伴网络（月触达 4.5 亿、100+ 伙伴，
含 YouTube Playables、MSN、Xiaomi、Y8、Telegram、Discord）。~~开发者最高拿 **80%**~~ **← 2026-09-16 查证纠正：实际是三档累进 70% / 80% / 90%（分界 $1,000 与 $3,000），入门档 70%、顶档 90%；且分成只发生在主目录/合作网络，sandbox 那一层不分成。见本文第十三节。**
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

### 八、owner 的后台截图推翻了「人留不住」（2026-09-15，三张 Overview 截图）

**这是本轮第三次纠正，也是唯一一次由外部数据推翻的。** 我们的 D1 只记离散里程碑
(`solve` / `play_again` / `game_over`)，而这些游戏在「开局」与「跑完一整局」之间**什么都不发**。
Playgama 量的是**停留时长**，那才是这类游戏的正确指标。他们的数字：

| 游戏 | VISITS | PLAYS 30S | PLAYS 60S | >30s | >60s |
|---|---|---|---|---|---|
| GHOSTLINE | 16 | 6 | 3 | **38%** | **19%** |
| SINGULARITY | 13 | 4 | 2 | **31%** | **15%** |
| PROMPT | 6 | 1 | 1 | 17% | 17% |
| **合计** | **35** | **11** | **6** | **31%** | **17%** |

**三分之一的访客玩过 30 秒，六分之一玩过一分钟。** 这不是「没人留」。此前那句
「23 次开局 0 次二次事件 = 流量进得来人留不住」**作废** —— 它测的是我们没埋的东西。

**顺带校准了埋点的漏率**：同窗我们的 D1 记到 GHOSTLINE 10 / SINGULARITY 13 / PROMPT 3 = **26**，
他们记 35。SINGULARITY 两边完全一致，另两款各差 6 和 3。**D1 约少 26%** —— 合理解释是有人落到
sandbox 页但游戏 iframe 还没跑起来就走了(那种没有 play_start)。**以后报门户人数用他们的 VISITS，
用 D1 做分国家与行为归因。**

**另外两条截图里的事实**
- **PROMPT 已从队列进入 `Moderation`(截图时 12 分钟前更新)** —— 五款排队的那条线在动。
- 平台那一栏的 PLAYS / REVENUE / AVG PLAYTIME 全是 **`—` 而不是 `$0.00`**：主目录没上架，
  所以根本没有收入行。**sandbox 本身是否分成，后台没给答案,也没有任何 MCP 接口能读** ——
  这是「80% 分成」到底适用于哪一层的关键问题,**建议 owner 用后台那个对话气泡直接问他们**。
- 投放结束时间 22 Sep 22:53(owner 本地时区)= 14:53 UTC,与 MCP 读到的完全对得上。

### 九、towers 门户包已建并通过认证前自检（2026-09-15，试点）

**为什么是 towers 而不是第 11 款拼图**：`towers / trail / starbattle / futoshiki / kropki /
minisudoku / nonogram / sandwich / thermo / balance` **十款题库完全相同**(各 320 池 + 450 日题),
再做一款是翻炒;而这十款**从来没有被打包上任何门户**——`PLAYGAMA` / `ITCH` 列表里全是那七款
AI 主题游戏。28 天里这十款拿到的外部访问约 200 次 page_view,而 Playgama 免费投放 47 分钟就给了
23 次开局。**缺的是分发不是品类。**

**做法：零引擎改动。** 七个引擎服务十款(`app-latin.js` 一个管 kropki/minisudoku/sandwich),
逐个改它们等于改线上站。改为新增 `tools/portal/puzzle-portal.js`,只绑十款**都已有**的标记:
`#d-easy/#d-medium/#d-hard`(广告断点)、`#grid`(渲染即 gameplay_started)、`#win`(解开即 stopped)。
扩到第二款只改 `PUZZLE_PLAYGAMA` 一行。

**打包时改写的三处(单文件游戏没有这些问题,所以这是新的)**
1. **信标**:每个引擎都是 `sendBeacon("/e")` **根相对** —— 在 `sb-xxx.games.playgama.net` 上会 POST 到
   **Playgama 自己的域**,数据一行都收不到。而「收数据」正是把它送上门户的全部理由。已改写为绝对 URL,
   断言必须改到 2 处。
2. `/sub.js`、`/embed.js`、`/manifest.webmanifest`、`registerServiceWorker("/sw.js")` 全是根相对的站内件,
   在门户上 404。**sw 那条尤其隐蔽**:它自带 `.catch(){}`,对游戏无害,但 Chromium 照样打一条 console error,
   而 console error 是每一家门户的拒稿风险。
3. 剩余根相对 `<a>`(规则页、兄弟拼图)拆成纯文字;header/footer/beehiiv 订阅链接整块删。
   `strip_site_footer` 原有的那条断言当场抓到了 `/skyscraper-puzzle-rules`,守卫是有效的。

**`tools/verify-puzzle-portal.js`（新增，能红）**
```
PW_SPKI=<代理CA的SPKI> node tools/verify-puzzle-portal.js site/downloads/playgama/towers.zip
```
**它存在的唯一理由**:我第一版测试用 `document.getElementById("again").click()` 在 JS 里点,**通过了**;
换成真实点击才发现 **`#again` 藏在 `#win` 里,不解开题根本不可见**。认证只点可见控件、又解不开
Skyscrapers —— 这正是 GHOSTLINE 第一次认证「No advertising is implemented」的同一个坑,**差一点原样再踩一次**。
所以断言写的是「**从一次真实点击、在未解题状态下**能不能观察到广告」。当前全绿:
Bridge 初始化 ✓ · 49 格渲染 ✓ · 三个断点**可见** ✓ · 无交互不出广告 ✓ ·
一次真实点击 → `loading → failed`(离线无库存,到 `loading` 即证明请求发出去了)✓ ·
90 秒冷却拦住第二次点击 ✓ · console error **0** ✓。

**没做也不该现在做的**:没有在 Playgama 后台建应用、没有上传、没有发布 sandbox、没有开投放。
那些都是对外动作,等 owner 说了算。

### 十、MCP 没有展示数/收入接口——但 `get_application` 里藏着两个我们从没看过的真指标（2026-09-15）

**先回答「能不能获取」：不能，而且是核对过的。** 22 个工具全是表单/上传/沙盒/排行榜/内购/审核；
`get_sandbox_state` 与 `get_application` 的**完整返回**里没有任何 visits / plays / impressions /
revenue 字段。后台网页能看(owner 的截图)，但那走 cabinet 的网页 API + 登录态，token 在 MCP 服务端，
会话这边拿不到，**也不去逆向他们的私有接口**。**要它就直接问他们**(后台右下角对话气泡)，
两个问题一起问：① sandbox 的展示/收入能否给只读接口 ② **sandbox 阶段到底分不分成**。

**但那次调用顺手挖出两个东西，都可直接行动：**

**① 他们记录了我们每个包的载入时间(`archives[].archiveData.loadingTime`)**

| 游戏 | loadingTime | initialSize | 表单 engine | 实际 bridgeEngine |
|---|---|---|---|---|
| GHOSTLINE | **5 143 ms** | 217 KB | js | javascript |
| SINGULARITY | **4 589 ms** | 212 KB | js | javascript |
| PROMPT | 387 ms | 99 KB | **unity** ✗ | javascript |
| OVERFIT | 474 ms | 97 KB | **unity** ✗ | javascript |
| MINIMA | 313 ms | 93 KB | **unity** ✗ | javascript |

GHOSTLINE 与 SINGULARITY 比另外三款慢 **10–15 倍**。CLAUDE.md 记着 CG 第一次拒稿正是
「BN，**载入 4.7 秒**那版」——这两款就落在那个已知的坏区间里。**注意别过度归因**：
09-14 那两条拒稿写的是 AI 游戏分流政策，不是速度；但这是一个我们控制得了、且此前完全没看过的质量指标。

**② 五款里至少三款的表单 `engine` 填成了 `unity`，而包是 JavaScript。**
PROMPT / OVERFIT / MINIMA 全是 `engine:"unity"` + `bridgeEngine:"javascript"`(MIMIC / OVERSEER 是
同一批 09-08 建的，大概率同样)。GHOSTLINE 与 SINGULARITY 填的是 `js`，是对的。
**审核员打开一个声称 Unity 的游戏却看到 JS canvas，「表单与包对不上」正是会变成一句
不可拆解的 "overall quality" 的那类问题——而 PROMPT 09-08 拿到的就是那一句。**

**本会话没有改任何表单**：`update_application_form` 能改，但 PROMPT 此刻正在 `MODERATION`
(15:45 更新)，OVERFIT/MINIMA 等四款在队列里。**改一个正在审的表单是对外动作，等 owner 说了算。**
建议顺序：先改没在审的，PROMPT 等这一轮审完再说。

### 十一、四款的 `engine` 已改正（2026-09-15 16:11 UTC，owner 授权）

owner：「改掉那四款的 engine，PROMPT 等审完」。已执行并**逐个读回核对**。

| 游戏 | MOD | 改前 | 改后 | 审核任务 | loadingTime |
|---|---|---|---|---|---|
| OVERFIT | MOD-7382 | unity | **js** ✓ | `NEW`(09-08 未变) | 474 ms |
| MIMIC | MOD-7383 | unity | **js** ✓ | `NEW`(09-08 未变) | 435 ms |
| OVERSEER | MOD-7384 | unity | **js** ✓ | `NEW`(09-08 未变) | 353 ms |
| MINIMA | MOD-7385 | unity | **js** ✓ | `NEW`(09-08 未变) | 313 ms |

**`update_application_form` 是部分保存**——只发了 `applicationId` + `engine`，没带其它字段。
读回确认 description / howToPlayText / supportedLanguages / supportedDevices / link /
isHorizontal / isVertical / distributeEverywhere / archives / media **全部逐字未变**；
只有 `updatedAt` 与 `checksum`(表单哈希)变了,这是预期的。**四个审核任务的 `updatedAt` 仍是
09-08 原值,队列没有被扰动**,也没有任何东西被提交到审核(该工具本身不提交)。

**⏳ 未做，下次会话必须接手：PROMPT(MOD-7381)仍是 `engine:"unity"`。**
它 09-15 15:45 进入 `MODERATION`,按 owner 的话等这一轮审完再改。
**判断依据**:`list_moderation_comments` 或 `get_application` 里 MOD-7381 的 status 离开
`MODERATION`(变成 REJECTED / 通过)之后,立刻改成 `js`——它是七款里唯一还填错的。

### 十二、GHOSTLINE 17 小时读数，以及「0 二次事件」的最终解释（2026-09-16）

**owner 截图(投放 17 小时)**：GHOSTLINE **VISITS 49 · PLAYS 30S 20 · PLAYS 60S 13**
= **41% 玩过 30 秒、27% 玩过一分钟**。

**趋势比绝对值更有意思**：09-15 那张是 16 / 6 / 3(38% / 19%)。增量的 33 次访问里
**14 次过 30 秒(42%)、10 次过 60 秒(30%)** —— **后来的流量比最早那批更好**。
买量通常是反过来的(先投最容易的人群),所以这条值得记。

**「0 二次事件」到此彻底解释清楚,它从头到尾是我们自己的测量缺陷：**
`worker.js` 的 `ALLOWED` 事件白名单(18 个名字)**把 GHOSTLINE 与 SINGULARITY 的全部
互动事件都丢掉了**。GHOSTLINE 发 `race_start` / `finish` / `medal` / `beat_clone`,
SINGULARITY 发 `milestone` / `ship` / `rogue` / `rewarded` 等十几个 —— **`ev` 表里这些名字
一行都没有,历史上一次都没有过**(现查确认)。这两款恰好是流量最大的两款,
所以「42 次开局 0 次二次事件」是**按构造必然的结果**,不是玩家行为。

**已修**:白名单加 9 个**每局有上界**的事件(GHOSTLINE 四个 + SINGULARITY 五个)。
**故意不加** `buy` / `train` / `research` / `cache` / `market` / `skin` / `mission` ——
SINGULARITY 是放置游戏,这些跟着点击速度走,放进来等于用一个盲区换一张 D1 账单。

**注意口径断点**:这 9 个事件**从 2026-09-16 部署后才开始有数**,与之前的窗口不可比。
PROMPT / MINIMA / OVERFIT 的 `game_over` 一直在白名单里,所以它们的历史是连续的 ——
这三款早就显示出真实重复游玩(PROMPT 10 次开局对 **23 次 game_over**、MINIMA 2 对 **7**)。

**D1 现状(投放起至 09-16 08:11,非 US)**:GHOSTLINE 42 次开局 / **23 国**、
SINGULARITY 32 / 17 国、PROMPT 10(+23 game_over +23 calc_use)、OVERFIT 5、OVERSEER 3、
MINIMA 2(+7 game_over)、MIMIC 1。**后四款没有投放**,那点量是 sandbox 链接的自然曝光。

### 十三、sandbox 不分成——这次是查到的，不是「不知道」（2026-09-16）

owner 追问「sandbox 能不能分成，你不知道？」。上一条我停在「后台没写、MCP 读不到」就不往下查了，
这是偷懒。用出网权限查了他们自己的信源，**答案是明确的**。

**Playgama 自己的机器可读参考 `https://playgama.com/llms-full.txt`，原文：**
> "A sandbox link is public and goes live immediately, without moderation. **It does not by
> itself establish acceptance into the Playgama catalog, partner distribution, audience
> acquisition, or monetization.**"

同页另一句：**"Sandbox publishing and main catalog publishing are separate outcomes."**
`https://playgama.com/mcp/` 也写着 **"Main catalog submission is a separate step."**

**所以：sandbox 这一层没有分成，一分钱都没有。** 后台 REVENUE 那一栏是 `—` 而不是 `$0.00`,
现在完全说得通 —— **不是「还没赚到」，是这一层根本不存在收入这回事。**

**那 09-15 实测到的 `loading → opened → closed` 是什么？** 广告确实播了、确实有填充,
但**那是 Playgama 自己的广告位**。把它和「$2 免费投放」放在一起看，整件事就清楚了：
**他们花自己的钱买量把玩家送进来，再用玩家看的广告把成本收回去，换取我们游戏的真实表现数据** ——
这正是 09-14 拒稿信直说的目的("gives our team real performance data")。**这是一笔数据交易，不是分成。**

**顺带纠正本文件开头写了九天的一个数字。** 第 6 行写「开发者最高拿 **80%**」——
`https://playgama.com/developers` 的原文是三档累进：
> up to $1,000 → **70% of net revenue**；$1,000–3,000 → **$700 + 80% over $1,000**；
> $3,000+ → **$2,300 + 90% over $3,000**

**入门档是 70% 不是 80%，顶档是 90%。** 我们一直按「最高 80%」在跟 GameDistribution 的 33%
做对比,结论(Playgama 远优于 GD)不变,但**数字本身两头都记错了**。
另外注意别和 **Playgama Partners 的「up to 50%」**混淆 —— 那是给**嵌入他们游戏库的站长**的产品,
不是开发者分成,两者是不同的东西。

**对决策的影响(重要)**:这条把 09-22 判定线的意义钉死了 ——
**这轮 sandbox 投放的产出不可能是钱,只可能是「够不够硬的数据去申诉主目录」。**
分成的入口只有主目录 / 合作网络,而那正是 09-14 把我们挡在外面的那一层。
因此「拓展几个类似游戏」在主目录那道门打开之前,**无论留存多好都不会产生一分收入**。

### 十四、「多少点击才会被导入主目录」——他们没有公开任何数字门槛（2026-09-16 查证）

owner 问的是「进主目录要多少量」。查了两个权威信源，**结论是：没有这个数字。**

- `https://playgama.com/llms-full.txt`：通篇**没有任何** session / play / click 的数值门槛。
  它给的是**人工审核的质量标准**，原文：
  > "Human moderators play submitted games and evaluate both technical operation and the quality
  > of the player experience; review is not limited to an automated compatibility check."
  > 审的是 "launch, loading, build packaging, and build size; bugs and core behavior such as
  > controls, menus, required features, saves, audio, and advertising; gameplay completeness,
  > usability, and **whether the game provides sufficient distinct value for players**"。
  > 并且明说 "**Not every submitted game is accepted.**"
- `https://wiki.playgama.com/playgama/submitting-a-game`：同样**没有**任何 sessions / plays /
  DAU / retention 的数值；只写「1–5 个工作日」。

**所以「导入主目录」不是量的门槛，是人审的质量门槛。** 这一条很重要，因为它意味着
**把量做大本身不会把门打开** —— 09-14 那封信要的是 performance data 作为**参考**，不是及格线。
(搜索结果里出现过一句 "ads switch on through Playgama Ad once the game clears the **session
threshold (access by request)**" —— 注意那是 **Playgama Ad / Partners 侧**的广告开通条件，
而且明写 "access by request"，即**要问他们，不是公开数字**。别把它当成主目录门槛。)

**唯一能当锚的公开数字是他们自己定的投放包**：`expectedGameplays: 100` / 轮 / $2 / 7 天。
三轮 ≈ 300 次 gameplay —— **那是他们自己选的样本量**，把它当作「他们认为够看的样本」是合理推测，
**但没有任何文档这么说，不许当成事实引用**。

**别拿 CG 的门槛套过来。** CG 的 Basic Launch 是「≥7 天 **且** ≥500 次游玩」、头部游戏
conversion-to-gameplay 80%+ —— **那是 CrazyGames 的规则，Playgama 没有对应条款**；
而且两边**分母不同**：我们的 27% 分母是「广告点击落到页面的人」(含误点)，
CG 的分母是「已经进入游戏的人」。**两个数字不可直接比较，比了会得出错误的悲观结论。**

**由此得到本轮真正的杠杆**：既然门是人审质量而不是量，那么**`loadingTime` 是我们唯一
握在手里、且被他们记录在案的质量指标** —— GHOSTLINE 5 143 ms / SINGULARITY 4 589 ms，
比另外五款慢十倍以上。**要为申诉主目录做一件事，那件事是把这两款的载入时间打下来，
不是把点击量堆上去。**

**要拿到真数字只有一条路**：后台对话气泡问他们。三个问题一次问完：
① 从 sandbox 进主目录，你们看哪些指标、有没有量的下限？
② sandbox 的展示是否计入开发者分成？(我们读到的答案是否)
③ 我们该在什么时候、用什么材料重新提交？

### 十五、砍 GHOSTLINE / SINGULARITY 的载入与卡顿（2026-09-16，owner 授权后执行）

**结果（同一台机器、同一套包、逐项实测）**

| | 主线程阻塞 | load 事件 |
|---|---|---|
| GHOSTLINE 改前 | **10 258 ms** | 1 236 ms |
| GHOSTLINE 改后 | **2 537 ms**（−75%） | 978 ms |
| SINGULARITY 改前 | **6 726 ms** | 1 082 ms |
| SINGULARITY 改后 | **584 ms**（−91%） | 670 ms |

仓里原有的 `cg-package-smoke` 也跟着动了：**singularity 的 gameplayStart 1 379 ms → 715 ms**
（1 379 是 CLAUDE.md 里记着的旧值）。

**两个先被否掉的猜想（留下来，免得下次再猜一遍）**
1. **「开局跑 500 次 AI 优化拖慢了它」——错。** 直接 bench：`AI.optimize(T, b, 500)` 只要 **96 ms**，
   `makeTrack` 6.5 ms。不是它。
2. **「`import * as THREE from "three"` 挡住了 tree-shaking」——也错。** 真的改成 33/37 个具名导入
   重打包后，bundle **反而大了 2 KB**（516→518 KB）。esbuild 本来就能摇掉静态属性访问的命名空间导入，
   three 的体积是 WebGLRenderer + 材质系统本身，**摇不掉**。已回滚，`git status` 干净。

**真因（实测复现了他们的排序）**：同一环境下 PROMPT（2D canvas）主线程阻塞 **0 ms**、
GHOSTLINE **10.2 s**、SINGULARITY **6.7 s** —— 与他们记的 387 / 5 143 / 4 589 ms 同序同量级。
**成本是 three.js + WebGL 跑在软件光栅器上**（无 GPU 的审核机、被锁的办公机、廉价手机都是这个路径；
本地 headless 实测 `UNMASKED_RENDERER_WEBGL` = `ANGLE (... SwiftShader ...)`）。

**四处改动（都对真实低端玩家有效，不是针对审核做数）**
1. **先探一个 1×1 的丢弃 context，读 `WEBGL_debug_renderer_info`**，命中
   swiftshader/llvmpipe/softpipe/software/microsoft basic 就判定无 GPU。
   **`antialias` 只能在建 context 时定，之后改不了**，所以必须先探再建：无 GPU 时 `antialias: false`。
2. **无 GPU 直接从 low 模式起步**，不再「先卡三秒再降级」。SINGULARITY 的 low 路径本来就绕开
   `EffectComposer` + `UnrealBloomPass`（几趟全屏 pass），所以它一帧都不用跑 bloom —— 这就是它 −91% 的来源。
3. **降级阈值 3 s → 0.6 s，但前 1.5 s 豁免。** 豁免是必须的：three 第一次画到某个材质时才编译 shader，
   那几帧在**好显卡上也慢**，没有豁免就会把好机器永久锁进 640 px —— 那比原来的问题更糟。
   无 GPU 的机器不依赖这条，它由第 1 条直接起步即 low。
4. **`resize()` 现在遵守 low 模式**（两款都改）。**这是个原有 bug**：resize 每次都从
   `devicePixelRatio` 重算，所以一次转屏就把刚降下去的分辨率又还回去了。
   GHOSTLINE 的 low 模式还**把 backing store 宽度压到 640**（不只是 pixelRatio 1）——
   它是 fill-rate 瓶颈，像素数才是杠杆；CSS 照常拉伸，布局不变。实测 canvas 1100×680 → 缓冲 640×395。

**验证**：`verify-ghostline` / `verify-singularity` 全绿（赛道·物理·AI·经济逻辑未动）、
`cg-package-smoke` 七款全过、`fleet-smoke` 全过、两款截图人工确认画面正常（GHOSTLINE 在跑第 3.11 秒、
126 km/h；SINGULARITY 面板与核心都在）。

**上传验证完成（2026-09-16 15:07 UTC，owner 说「你完成」后执行）——他们自己的数字动了：**

| | 旧包 loadingTime | 新包 loadingTime | | initialSize |
|---|---|---|---|---|
| GHOSTLINE | 5 143 ms | **2 867 ms** | **−44%** | 217 837 → 218 042（+205 B） |
| SINGULARITY | 4 589 ms | **1 114 ms** | **−76%** | 212 542 → 212 787（+245 B） |

**`initialSize` 几乎没动而时间掉了一半到四分之三 —— 这直接证明了诊断：瓶颈从来不是体积，
是没有 GPU 时的渲染开销。** 这也是为什么当初「摇 three.js」那条路注定没用。

**已做到哪一步、没做哪一步（别搞混）**
- 两个新归档 `ghostline-2026.09.16-lowgpu` / `singularity-2026.09.16-lowgpu` 已在表单里
  （`inForm: true`），旧归档按平台规则**保留在旁边**，没有删除。
- **没有提交审核**（MCP 里就没有这个动作，只能 owner 在后台做）。
- **没有 `publish_sandbox`** —— 所以 09-15 起跑的三条免费投放**仍然跑在旧包上，实验没有被扰动**。
  要让真实玩家吃到这次优化，需要 owner 决定何时把新归档发到 sandbox（那会换掉线上版本）。
- 两款的 `status` 仍是 `REJECTED`，MOD-7343 / MOD-7380 未动。

### 十六、版本冻结：09-22 之前不要 `publish_sandbox`（2026-09-16，owner：「先不发」）

新归档已经在表单里，但**线上 sandbox 仍然是 09-15 那个旧包，这是刻意的**。

**理由**：这轮投放唯一的产出就是那份七天数据（sandbox 不分成，钱不在这里）。中途换包会把
GHOSTLINE 的 49/20/13 切成前后两段不可比的样本，而这份数据正是申诉主目录的全部材料。
新包的价值在申诉那一刻兑现，不差这六天。

**所以，后续会话照此办理，别自作主张：**
- **09-22 投放结束前，不要对 GHOSTLINE / SINGULARITY 调用 `publish_sandbox`。**
  （对其它五款也一样——同理，任何换包都会脏掉正在跑的窗口。）
- 判定线 `gridlings-playgama-traffic-0922` 结算时，读数必须来自**旧包那一版**，
  台账里记的 VISITS / PLAYS 30S / PLAYS 60S 是旧包的表现，**不要拿它去代表新包**。
- 结算之后，新包的用法是**两件事一起做**：发到 sandbox + 带着数据重新提交主目录。
  那时 `loadingTime` 从 5 143 / 4 589 降到 2 867 / 1 114 是可以写进申诉里的硬事实。

### 十七、TOWERS 已建并上传（2026-09-16，owner：「towers也推上去」）

**`applicationId: cmu49mo9y002pgo0h9pe85ymg`** · 状态 `DRAFT` · engine **`js`**（这次一开始就填对了）
· 归档 `towers-2026.09.16-1` (`cmu49mxg0002rkg0hddaw562t`)，`bridgeSdk: FOUND`、Bridge 2.1.0、分析 DONE。

**它是八款里最快的一个：**

| 游戏 | loadingTime | initialSize |
|---|---|---|
| **TOWERS** | **376 ms** | **91 317** |
| MINIMA / OVERSEER / PROMPT / MIMIC / OVERFIT | 313–474 ms | 92–99 KB |
| SINGULARITY（优化后） | 1 114 ms | 212 KB |
| GHOSTLINE（优化后） | 2 867 ms | 218 KB |

表单已填：description（machine-verified 单解、每日 00:00 UTC 换题、三档自由练习）、
howToPlayText（线索=可见塔数、点格循环高度、HINT/PLAY ANOTHER/难度键）、EN、
DESKTOP+IOS+ANDROID、横竖屏都支持、`link` 指向 `play.agiscorecard.com/towers`、
`distributeEverywhere: true`。

**卡在哪（`get_submission_state` 的原话）**：`reason: "NO_CERTIFICATION"`。
**Basic Certification 只能人来跑**，QA Tool 链接（只能问工具要，地址随部署变）：
**`https://developer.playgama.com/qa-tool/cmu49mxg0002rkg0hddaw562t`**

**跑认证时要做的一件事**：**点一下 EASY / MEDIUM / HARD 里的任意一个**——那就是广告断点。
不需要解开题（`#again` 藏在 `#win` 里，解不开就看不见，这正是 GHOSTLINE 第一次认证栽的坑）。
`tools/verify-puzzle-portal.js` 已经把这条断言成「未解题状态下一次真实点击能否观察到广告」，本地全绿。

**三张封面已生成并上传（同日，owner：「你主动完成，不用问我」）**：`tools/store-assets/towers.js`
是这个目录里的第一份拼图配置。走 `poster` 路线，**所以封面不需要自动解题的 autopilot** ——
`ONLY=covers` 连游戏实例都不用起。三张全部 `confirmed`、`inForm: true`、`replaced: []`
（square→`icon` / portrait→`preview_vertical` / landscape→`preview`）。
**`get_sandbox_state` 现在答 `publish.allowed: true`** —— 封面齐了，将来开投放不会再被 `NO_COVERS` 拒。

**顺手修了 `capture-store-assets.js` 一处**：`ffmpegPath()` 原来无条件执行，没装 ffmpeg-static
就直接 exit——**可封面根本不需要视频编码器**。改为只在真要出视频时解析，`ONLY=covers` 从此零依赖。

**海报的设计取值（后面九款拼图照抄这份）**：底色用游戏自己的 `theme-color` **#002FA7**
（towers.html 里就写着，不是另挑的），字体 Bungee（第六款专属，不复用），
主体是**规则本身而不是装饰**——高度 2,4,1,5,3 从左边看：看到 2，4 盖过它，1 藏在后面，
5 盖过一切，3 藏起来 = **可见 3 座，所以线索牌就是 3**，与游戏对这一行算出来的数一致。
**不许画一个「看起来像摩天楼」但数不对的图。**

**`videos` / `autopilot` 故意没写**：解谜游戏的预告片需要一个能在镜头前以可看的节奏解题的东西，
和动作游戏那种「驱动输入状态」的 autopilot 是两码事；而且 **Playgama 的 MCP 根本没有视频/截图
上传接口**（只有封面），所以今天能交付的就是封面。

**本轮没做**：没有 `publish_sandbox`（**TOWERS 也遵守 09-22 冻结**——虽然它不在投放样本里，
但 ORG_LIMIT 卡着三条并发，现在发也拿不到流量，等结算后和新包一起发）、没有提交审核、没有开投放。

### 十八、48 小时读数：判定线的量已经够了，但流量在第三天停了（2026-09-17 14:52 UTC）

**投放起（09-15 14:53）到现在 48 小时，非 US `play_start`：**

| 游戏 | play_start | 国家 | 二次事件 |
|---|---|---|---|
| SINGULARITY | **62** | 25 | —（事件没埋到，见下） |
| GHOSTLINE | **55** | 28 | —（同上） |
| PROMPT | 17 | 12 | **40 game_over + 40 calc_use** |
| OVERFIT | 6 | 4 | 2 + 2 |
| OVERSEER | 3 | 2 | — |
| MINIMA | 2 | 2 | 7 + 4 |
| MIMIC | 1 | 1 | — |

**判定线口径合计 153**（含 7 条归档分析/QA 载入，其中 2 条正是 09-16 15:07 我确认上传新包时
他们的分析管线跑起来打的——顺带证实了他们的 `loadingTime` 真的是**跑游戏**测出来的）。
纯玩家面约 **146**。`gridlings-playgama-traffic-0922` 的 ①≥150 这一条**第 2 天就够了**，
②（PLAYS 60S ÷ VISITS ≥15%）上次 owner 截图是 27%。**但判定日是 09-22，到期再结，不提前宣布。**

**真正要看的是这个**：按天 **09-15 → 67 · 09-16 → 84 · 09-17 → 2**，最后一次 06:21，
到现在 **8.5 小时零**。

**先排除了自己的问题**：同一张表今天收了 **109 条非 playgama 事件，最后一条 14:24（28 分钟前）**。
信标、worker、D1 全都活着。**是投放真的停了，不是我们测不到。**

**也不是烧完预算**：三轮的 `spentRatio` 只有 **13.4% / 14.2% / 16.2%**（$2 的），48 小时才花掉约 $0.87。
**85% 的预算还在，量没了。** 原因读不到，属于该问他们的问题。

**投放套餐同时变了，而且变好了**：`offer` 现在是 **FREE · $5 · 3 天 · ~100 gameplays**，
**`remainingFreeRuns: 3`**，并且三款的 `verdict.allowed` 全变成 **true —— `ORG_LIMIT` 没了**。
（此前是 $2/7 天、同时最多三轮、之后 $20 买同样的包。）**所以现在有三个免费 $5 轮可用，
而 09-15 被 ORG_LIMIT 卡住的那四款正是候选。**

**一个必须说的缺口**：GHOSTLINE + SINGULARITY 占了 146 次玩家开局里的 **117 次**，
而它们至今只记得到 `play_start` —— 因为 09-16 那个白名单修复**还在分支上没合并，没部署**。
合并才能在剩下五天里拿到这两款的互动数据。
