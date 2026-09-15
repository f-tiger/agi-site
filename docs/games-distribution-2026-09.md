# 游戏方向深挖:大平台与大流量的投放(2026-09-08)

owner 指令:「深度挖掘游戏方向,做好大平台,大流量的投放游戏」。

**一句话裁定**:大流量平台不是「再多注册几家」的问题。已经握在手里但没用满的杠杆有两条——
①**Playgama Bridge 一个构建就是 19 个平台的钥匙**(YouTube Playables / MSN / Yandex / Y8 /
Discord / Telegram / TikTok / GameSnacks …,一手证据在下面第二节),我们此前只把它当「Playgama
这一家」在用;②**Coolmath Games**(2026-05 去重受众全球前五)的规则**要求**无广告、无外链、无
统计回传——这三条恰好是本站承诺的原样,而且它付的是**非独占买断授权费,不是按流量分成**。
本轮补上了第②条唯一缺的东西:一个真正干净的构建变体(见第五节,17 个包已产出并跑过门禁)。

**同时必须说清的反面**:到今天为止,门户线累计三次「质量」拒稿(CrazyGames ×2、Playgama ×1),
而**广度不解决审美否决**。再接十家平台,如果每家都用同一句无信息量模板拒稿,得到的仍然是零流量。
所以本文的排序是:先把已投的做成,再用**不设人工审美闸门**的渠道兜住,最后才是新的人工审平台。

---

## 一、流量到底在哪里(数字一律带日期与出处强度;门户站在本沙箱被出网代理拦截,只能 WebSearch 反查)

| 平台 | 规模(读取日 2026-09-08) | 出处强度 |
|---|---|---|
| **Poki** | ≈**1.285 亿** 月访问(Similarweb,2026-04 口径),全球站点排名 #2,904;2026 年宣称月游玩破 10 亿、目录含 600+ 工作室 | [thin] 二手 |
| **CrazyGames** | 自报 **>3 亿次游玩/月**;月活玩家一处写 >5,000 万、另一处写 ~3,000 万——**两个来源不一致,只引用「~3 亿次游玩/月」这个两处一致的数** | [thin] 二手 |
| **五大(2026-05 去重网页受众)** | Poki > CrazyGames > Friv > **Coolmath Games** > **Playhop** | [thin] 二手 |
| **Y8** | ≈5,000 万独立玩家/年,历史目录曾 >70,000 款 | [thin] 二手 |
| **Playgama(聚合)** | 开发者分成 **80%**;覆盖 **YouTube Playables、MSN 与 100+ 伙伴平台**,自称触达 4.5 亿+ 玩家 | 官方口径 |
| **Yandex Games** | 30M+ 玩家;2025 全年**上架 24,000 款、下架 29,000 款**;IAP 开发者收入同比 +75% | 平台方访谈 |
| **itch.io** | 本舰队实测:14 天 31 次开局 / 12 次通关(见第四节)——**它不是大流量平台,是唯一已验证出真人的平台** | 一手 D1 |

**换算成钱的基线不变**(沿用 gridlings 手册 2026-09-06 那节):CG 类门户 **€1.2–1.4 / 千次游玩**
[thin]。所以 **€100 起付线 = 7.1 万–8.1 万次游玩**。这就是为什么下面把「买断授权费」和「按流量
分成」当两类东西看:前者不需要我们带量。

## 二、决定性的一手发现:我们仓库里那个 SDK 覆盖 19 个平台

`sites/gridlings/vendor/playgama/playgama-bridge.js`(**@playgama/bridge 2.1.0,本仓已随包发布**)
里有一张平台判定表。以下按 hostname / 查询参数 / 全局对象**逐条抄自该文件**,不是宣传材料:

| 判定条件(源码原文语义) | 解析为 |
|---|---|
| hostname 含 `crazygames.` 或 `1001juegos.com` | crazy_games |
| hostname 含 `yandex.net`,或 hash 含 `yandex` | yandex |
| hostname 含 `usercontent.goog` | **youtube**(YouTube Playables) |
| hostname 含 `msn.` / `msnfun.` / `start.gg` | msn |
| hostname 含 `y8` | y8 |
| hostname 含 `poki-gdn` 或 `poki-user-content` | poki |
| hostname 含 `gamedistribution.com` | game_distribution |
| hostname 含 `lagged.` | lagged |
| hostname 含 `discordsays.com` | discord |
| hostname 含 `devvit.` | reddit |
| hostname 含 `eponesh.` | gamepush |
| hostname 含 `portalapp.` | portal |
| hostname 含 `hippoobox.com` / `ahagamecenter.com` | dlightek |
| hash 含 `tgWebAppData` | telegram |
| 查询参数有 `api_id+viewer_id+auth_key` 或 `vk_app_id` | vk |
| hostname 含 `fbsbx` | facebook |
| `window.TTMinis` 存在 | tiktok |
| `window.GameSnacks` 存在 | **gamesnacks**(Google) |
| `window.GSInstant` 存在 | samsung |

枚举里还有 `ok / xiaomi / microsoft_store / huawei / jio_games / standalone / playgama / qa_tool / mock`
——**共 28 个 id**。三条随之而来的工程事实,后续会话别再重新发现:

1. **一个 Bridge 构建 = 一把万能钥匙。** 同一个 `downloads/playgama/<slug>.zip` 传到上表任何一家,
   Bridge 自己认出宿主并去调那家的 SDK。加一个平台**不需要写适配器**——这直接推翻「每个平台各写
   一个 PORTAL 实现」的旧计划,也解释了 Playgama 80% 为什么比自己逐家直接对接更划算。
2. **判定不到 = 落到 `MOCK`,也就是没有广告、没有分成。** 上表之外的宿主域必须靠
   `playgama-bridge-config.json` 里的 `forciblySetPlatformId`,或 URL 上的 `?platform_id=`。
   **上一个平台不出数据时,先查这一条,再怀疑自己的触发点。**
3. **配置是 `{ 默认…, platforms: { <id>: {覆盖…} } }` 的两层结构**,检测到的平台那一层覆盖默认层。
   有几家需要平台侧的 ID 才能变现(源码里的字段名):`y8` 要 `gameId / channelId / adsenseId`、
   `msn` 要 `gameId`、`lagged` 要 `devId / publisherId`、`discord` 要 `appId`。CrazyGames、Yandex、
   YouTube、GameDistribution、GameSnacks **零配置**。**没有 ID 就先别上那家的变现,别拿占位值凑**
   ——占位值换来的是控制台报错,而控制台报错在每一家都是拒稿风险。

## 三、逐平台裁定

**A. 已在飞行,把它做成(不需要新代码)**

- **Playgama** —— 七款 09-06 投出,PROMPT 09-08 以「overall quality」被拒。D1 显示 09-08 当天
  **六款各自在一个 `*.games.playgama.net` 审核容器里被真人跑过**(of/mc/os/sg/pm/mn),埋点通了
  ——所以这次不是瞎的。动作:PROMPT 带着 09-08 的两处修复(页脚死链、桌面棋盘困在空屏)重投;
  其余六款等结果。**这是全舰队优先级最高的一条渠道**,因为它一家过审就等于进 YouTube Playables + MSN + 100+ 伙伴。
- **CrazyGames** —— 七款在审。D1 记到 09-08 当天 `prompt.game-files.crazygames.com` 上有一次真人开局
  = 他们正在审。**第三次同模板拒稿 = CG 对本舰队永久关闭的规则不变,不许第四投。**
- **itch.io** —— 已全自动(butler 每次部署推送)。剩下的杠杆只有 owner 侧 5 分钟的事:项目页加日语
  简介与标签、隔周一条 devlog。判定线仍是 09-24。

**B. 本轮新打开:Coolmath Games(owner 拍板项)**

它的七条规则(读取日 2026-09-08,来源 coolmathgames.com/submit-a-game 与 developers.coolmathgames.com;
原页在沙箱内被出网代理拦截,靠检索反查):必须 HTML5;必须是**需要逻辑/策略/解题的「思考型」游戏**;
无暴力无脏话;**无广告——明文包括「不给你自己的站或公司做广告」**;**无任何外链**;
**不得有向开发者回传的统计计数器**;不收集用户数据、不要输入姓名之类的功能。

- 前三条本来就是我们的 11 款逻辑谜题的字面描述;后四条此前**全部不满足**——所以本轮做了第五节那件事。
- 它买的是**非独占授权**(可以继续留在 itch / CG / Playgama),付的是**一次性授权费**。行业口径
  「简单游戏几百美元、打磨过的可到 $5,000+」是**通用二手信息不是 Coolmath 的报价** [thin],
  实际金额只有联系他们才知道。
- **代价必须由 owner 拍板,不许会话代决**(2026-08-27 已立此规):在这条渠道上我们**是瞎的**
  —— 没有信标就没有 D1,没有外链就没有品牌回流。换来的是全球前五的受众和一笔与流量无关的钱。
- **顺带一条不要再问的事实**:Coolmath 办过 **$20K Game Jam 2026**(财商主题、办在 itch.io、
  100+ 投稿、单人最高 $10,000、2026-06-28~30 公布获奖)。**它已经结束了**;下一届是否有、什么时候,
  公开信息里没有——**不要编时间**。

**C. 值得开、成本低(自助上架,不设人工审美闸门)**

- **Y8** —— `y8.com/upload` 自助,支持 HTML5;分成两条路:AFP(Google 直接付到开发者自己的
  AdSense 账号)或人工开票。Studio 审批要求先有一款已上线。**Bridge 已内建 y8 适配器**,但变现要
  `gameId/channelId/adsenseId`——所以顺序是:先用 `downloads/itch/<slug>.zip`(纯页面、零 SDK)把
  listing 立起来,拿到后台 ID 之后再换成带配置的 Bridge 构建。
- 判据来自 2026-08-27 那条既有裁定:门户方向要再试,**只试不设人工审美闸门的**。Y8 与 itch 属这类;
  CG / Poki / Coolmath 属人工审。两类都要有,但别把时间全押在人工审那一侧。

**D. 只请示不抢跑:Poki(全网最大,但独占是刀口)**

- 条款(读取日 2026-09-08):默认 **web 独占 5 年**;Steam / 移动 / 主机不算 web,**但 Discord 与
  YouTube Playables 算 web**;逐款人工curate;要求桌面+移动双端、即点即玩无登录墙、儿童安全、
  无赌博无加密货币、无内购。**非独占可走一次性买断授权费。**
- 本站现状:八款已同时在自有域 + itch + CG + Playgama 上。签 web 独占等于**从这四处全部撤下**,
  而 Playgama 的 YouTube Playables 通道也一并作废。**所以 Poki 只剩「非独占买断」这一种可谈的形状**
  ——一封信的成本,零代码。既有规矩「Poki 的 web 独占在 CG 出结果前不签」照旧有效,本条不推翻它,
  只是指出还有一条不冲突的路。

**E. 不做(逐条给理由,别再往回捡)**

| 平台 | 不做的理由 |
|---|---|
| **GameDistribution** | 33% 分成,且其覆盖与 Playgama 的 100+ 伙伴网络重叠;Bridge 里本来就有它的适配器,真有伙伴把我们路由过去也不用我们操作 |
| **GamePix** | 45% 分成、自助;但覆盖同样与 Playgama 重叠,而且它**要自己的 SDK**(Bridge 枚举里没有 gamepix)= 新代码。Playgama 这条路判负之后再考虑 |
| **GameMonetize** | 沿用既有裁定,不重开 |
| **Yandex Games / Playhop** | 流量是真的(30M+),但两件事没解决:一是德国账号的收款通道未核实,二是 2025 年**下架 29,000 款**说明审核churn 极高;而 Bridge 的 `yandex` 适配器意味着真有伙伴路由过去时我们零成本受益。**先不主动注册。** Playhop(2023 年成立,迪拜 Direct Cursus Technology L.L.C. 运营)同理 |
| **Newgrounds / Armor Games / GameJolt** | 受众形状与 itch 重叠,itch 已自动化 |
| **Facebook / 微信小游戏 / iOS·Android** | owner 2026-08-22 已无限期搁置移动与微信线,本轮不推翻 |
| **TikTok / Reddit / Discord / Telegram / Samsung / Huawei / Xiaomi / JioGames** | 这些都在 Bridge 判定表里——**它们是「伙伴把我们路由过去时自动生效」,不是要单独去谈的对象** |

## 四、现在的真实读数(D1 现查 2026-09-08,14 天窗,`ua_class='human'`)

| 渠道 | play_start | solve / game_over |
|---|---|---|
| 自有域 | 274 | 122 |
| **itch.io** | **31** | **12** |
| **Playgama(审核容器 + games.playgama.net)** | **14** | 5 |
| CrazyGames(`prompt.game-files.crazygames.com`,QA) | 1 | 0 |
| 搜索合计(cn.bing 3 / baidu 2 / google 1 的 pv) | — | — |

**怎么读这张表**:门户侧的 15 次开局**全部是审核员**,不是玩家。所以「大流量」目前是**零已验证**,
不是「小」。itch 那 31 次是唯一非我们自己制造的真人游玩。任何后续报告都不许把审核容器的局次
写成玩家数。

## 五、本轮交付的工程件:第四个构建变体(clean / 授权级)

此前三个变体各自的事实声明已经分家(2026-09-07 规矩:声明按变体核,不按源码核):

| 变体 | 广告 | 埋点 | 外链 | 用途 |
|---|---|---|---|---|
| 站内页 | 无 | 有 | 有 | play.agiscorecard.com |
| `downloads/itch/` | 无 | 有 | 有 | itch.io |
| `downloads/cg/` | 有(CG SDK) | 有 | 无 | CrazyGames |
| `downloads/playgama/` | 有(Bridge) | 有 | 无 | 上表 19 个平台 |
| **`downloads/clean/`(新)** | **无** | **无** | **无,且全包零一处指向我们的引用** | **Coolmath 类规则 + 任何买断授权** |

- **定义只有一条断言,故意做成不可能靠巧合满足的**:`play.agiscorecard.com` 这个字符串
  **在包内任何一个文件里都不出现**。它一次性覆盖信标 URL、canonical、hreflang、og:url、
  JSON-LD 的两个 url、页脚链接和 README ——**2026-09-08 那个页脚死链事故的成因正是这些各查各的,
  漏了一个。**
- 产物:**17 个包**(8 款画布游戏里 6 款 + 11 款谜题)。`site/downloads/clean/<slug>.zip`。
- **审计发现并修掉的一处旧记载错误**:手册说谜题的 `strict` 包是「零外链」。零**锚点**是对的,
  但每个 strict 包仍带**六处**指向我们域名的引用(canonical、两条 hreflang、og:url、两个 JSON-LD url)、
  引擎 js 里还有信标 URL 与挑战 URL,而 `README.txt` **明文要求授权方给我们做反链**。
  GL_CLEAN 让这些在运行时是死的,但**死代码不等于没有计数器**——审阅者打开 index.html 看到一个
  指向我们的 sendBeacon,他的结论是「有回传」。所以 clean 是在 strict 之上再一层,不是改 strict
  (授权套件仍依赖 strict 的署名条款)。
- **门禁**:`tools/clean-package-smoke.js`。它不只看「有没有请求发出去」,而是在页面脚本运行前
  **接管 `sendBeacon` 与 `fetch`**,连**被吞掉的调用**也算失败——因为画布游戏的 `ev()` 是全局可直接
  调用,而谜题引擎的 `gev()` 藏在 IIFE 里只能靠真玩触发,接管出口是唯一对两种形状都成立的证法。
  **已用反例证明它会红**:把未处理的站内页原样打包,六个维度同时报错(试图回传、请求外泄、
  GL_CLEAN 未注入、DOM 里出现我们的域名、根相对链接残留、控制台报错)。
- 部署侧:新增一条 CI 门断言 **39 个包**全部存在且非空(一款游戏静默从某个变体列表里掉出去,
  此前只会打印一行没人看的日志);部署后自检加探 `/downloads/clean/prompt.zip` 与
  `/downloads/playgama/prompt.zip`(playgama 目录此前**一条线上探测都没有**)。
- **源码侧两处永久修正**(不是打包器 hack):①八款画布游戏的信标函数首行加 `if (window.GL_CLEAN) return;`
  ——与谜题引擎 2026-08-24 起的同一个约定,一套不是两套;②CG 载入器原来会**嗅探 `document.referrer`**,
  所以「本包不发任何请求」原本是**宿主的属性而不是包的属性**,现在 `if (window.GL_CLEAN) on = false;`
  压在所有检测路径之后。
- **诚实的代价**:一个无埋点、无外链、无品牌的包**任何人都能转手自托管而我们永远不会知道**。
  `strict` 已经公开了同样性质的东西(授权套件就是这么用的),所以这不是新风险;但 clean 包**不进
  `/downloads` 的浏览界面**,只有直链——降低顺手转载,不假装能防。

## 六、owner 动作清单(按「每分钟买到的确定性」排序)

1. **Playgama 重投 PROMPT**(约 5 分钟)。修复已在线上构建里。
2. **决定 Coolmath 投不投**(决策本身 1 分钟;投的话每款约 5 分钟)。要点:全球前五受众 +
   非独占买断费 vs **在这条渠道上完全没有数据**。会话不代决。要投就用
   `play.agiscorecard.com/downloads/clean/<slug>.zip`,逐款字段在
   `sites/gridlings/docs/coolmath-submission.md`。
3. **itch 项目页加日语简介与标签**(5 分钟)。日本需求 2026-09-05 已有 D1 佐证(零日语零投放下
   仍出现 JP 局次),这是最便宜的一次试探。
4. **Poki 只问一句「有没有非独占买断」**(一封信)。**不要签 web 独占**。
5. **Y8 开账号 + 上一款 itch 版**(15 分钟)。目的是拿到 Studio 审批与后台 ID,之后才谈变现。
6. **(不挡任何事)Playgama / CG 后台的收款资料**——与 Amazon 那两条同类:钱会累计,填了才付得出来。

## 七、判定线(预登记,不许事后调)

| 日期 | 看什么 | 不达标怎么办 |
|---|---|---|
| **2026-09-24**(既有线,不动) | itch 来源真人 pv ≥150,或任一款游戏页 ≥25 | itch 渠道对本题材不成立,写进反面发现 |
| **2026-10-06**(Playgama 投稿 +30 天) | 七款里**至少一款上线**;且 D1 `ref LIKE '%playgama%'` 的真人 play_start(**剔除 `*.games.playgama.net` 审核容器**)≥200 | 一款都没上线 = Playgama 的质量闸门对本批八款关闭,停止重投,把 Bridge 构建留给 Y8/其他自助渠道 |
| **CG 审核结果回来** | 是否过审 | 第三次同模板拒稿 = CG 永久关闭,不许第四投(既有规则) |
| **Coolmath 投出 +45 天** | 有无授权报价 | 有报价 = 舰队**第一笔与流量无关的游戏收入**,直接进台账并计入 2026-12-05 那条总线;明确拒绝 = 记下理由;60 天无回复 = 归档,不追 |
| **2026-12-05**(既有舰队总线) | 舰队非 Amazon 收入 >0 | 一笔 Coolmath 授权费即可满足;否则「解耦」判负 |

## 八、别再提(对外/对内一律)

- **给每个平台各写一个 PORTAL 适配器**——Bridge 一个构建覆盖 19 家,重复劳动。
- **web 独占**(Poki 或任何一家),只要我们还想留在自有域 + itch。
- **OVERFIT 投 Coolmath**——它是射击,撞「无暴力」条款。
- **把审核容器的局次当玩家数**引用。
- **拿占位 ID 上某家平台的变现**(换来控制台报错 = 拒稿风险)。
- **给非 clean 变体「顺手」也删掉信标**——那三个变体的埋点是我们唯一的门户侧视野。
- **在 CG/Playgama 结果出来前接第五、第六家人工审平台**;广度不解决审美否决。

## 事实表(读取日均为 2026-09-08;标 [thin] 者为二手来源)

| 事实 | 来源 |
|---|---|
| Poki ≈1.285 亿月访问(2026-04)、排名 #2,904 | Similarweb 对比页 [thin] |
| Poki 2026 月游玩破 10 亿、600+ 工作室 | 行业博客 [thin] |
| CrazyGames >3 亿次游玩/月;MAU 两处不一致(5,000 万 / 3,000 万) | 行业博客与其自报 [thin] |
| 2026-05 去重受众前五:Poki / CrazyGames / Friv / Coolmath / Playhop | 行业报告转述 [thin] |
| Y8 ≈5,000 万独立玩家/年 | 行业博客 [thin] |
| Poki 默认 web 独占 5 年;Discord 与 YouTube Playables 算 web;非独占=一次性买断费 | developers.poki.com / sdk.poki.com |
| Coolmath 七条规则 + 非独占买断授权 | coolmathgames.com/submit-a-game(原页沙箱内不可达,检索反查) |
| Coolmath $20K Game Jam 2026 已于 2026-06-28~30 公布获奖 | itch.io/jam/coolmath-game-jam-2026 [thin] |
| GamePix 开发者 45%、自助、数百家伙伴站 | partners.gamepix.com [thin] |
| Y8 自助上架;AFP(Google 直付)或人工开票;Studio 审批需先有一款上线 | developer.y8.com / y8.com/revshare [thin] |
| Yandex Games 30M+ 玩家;2025 上架 24,000 / 下架 29,000;IAP 收入 +75% | 平台方负责人访谈 [thin] |
| Playhop 2023 年成立,Direct Cursus Technology L.L.C.(迪拜) | 公司资料页 [thin] |
| Playgama Bridge 开发者 80%;YouTube Playables + MSN + 100+ 伙伴;4.5 亿+ 玩家 | playgama.com/developers |
| **Bridge 2.1.0 的 28 个平台 id 与 19 条判定谓词** | **一手:本仓 `sites/gridlings/vendor/playgama/playgama-bridge.js`** |
| **各渠道真人局次** | **一手:D1 `gridlings-events`,14 天窗,`ua_class='human'`** |

---

# 九、Playgama 回复了:七款全部分流出主目录,但给了一条我们能自己驱动的路(2026-09-15)

**事实**(owner 后台截图两张,09-14 09:02 与 09:39 各一条同文评论,分别挂在 GHOSTLINE 与
SINGULARITY;GHOSTLINE 的 Active Platforms 显示 `Playgama · Rejected · Updated 1d ago`):

> For games created with AI, we offer a dedicated way to test them on Playgama before they can
> be considered for our main catalog. Publishing through Playgama MCP allows you to get your
> first players and see how the game performs. At the same time, it gives our team real
> performance data that we can use to identify the strongest games for potential placement in
> the main Playgama catalog.

**这和 08-27 那种拒稿不是一回事,区别是本方向最要紧的那个区别。** CG 两次与 Playgama 09-08 那次
都是同一句无信息量的 "overall quality",**没有可迭代回路**——08-27 判定「停止追 CG」的理由正是
这个。这一次是**按类别分流**:平台认定我们的游戏是 AI 做的(**确实是**),于是把主目录入口换成
一条「先拿数据、再谈上架」的测试通道。**闸门从审美判断变成了可测量的表现**,而且平台自己提供
产生这份测量所需的流量。

## Playgama MCP 是什么(一手:`github.com/Playgama/developer-cabinet-mcp` README,读取日 2026-09-15;playgama.com 本体在沙箱内仍被出网代理拦截)

- 远程 MCP 服务器 **`https://developer.playgama.com/api/mcp`**,**OAuth 2.1 浏览器登录,不需要
  复制任何 token**;已连接的 agent 在 developer.playgama.com/mcp 管理。
- v1.1.0 共 **20 个工具**:应用(`list_applications` / `create_application` / `get_application` /
  `update_application_form` / `get_submission_state` / `list_moderation_comments`)、构建上传
  (`start_archive_upload` / `confirm_archive_upload` / `get_archive_status`)、封面
  (`start_cover_upload` / `confirm_cover_upload`)、内购、排行榜、QA(`get_archive_qa_tool_link` /
  `get_local_game_qa_tool_link`)、**沙盒(`get_sandbox_state` / `publish_sandbox` /
  `get_sandbox_traffic` / `start_sandbox_traffic`)**。
- **刻意留给人的动作**:提交审核、删除、回滚、读结算、**上传截图与视频**。
- 限制:压缩包 **≤300 MB**(我们最大 236 KB)、封面 **≤10 MB**、**沙盒发布每款每滚动小时 3 次**。
- **沙盒 = 任何拿到链接的人都能玩,不过审核。**
- **沙盒里的游玩不产生收入。**
- `start_sandbox_traffic` 起 DSP 投放把玩家送进沙盒,**每款第一次免费**。

## 诚实的两面

**正面**(这是游戏方向两个月来第一扇推得动的门):①绕开审核直接可玩;②平台自己送第一批玩家,
首轮免费;③产出的是**可判定的数据**,而不是又一次无解释的否决;④09-07 修的信标 CORS 意味着
我们在 playgama 域名下**有自己的读数**,不必只信对方面板。

**反面**(一条都不许写进钱线):①**沙盒零收入**——这是试镜不是渠道,€1.2–1.4/千次那套换算在这里
完全不适用;②「AI 做的」现在是平台给我们贴上的标签,可能在该平台长期带着;③我们自己的 D1 早就
显示通关率薄(08-28 那张表:Star Battle 0/9、点点 0/3、摩天楼 0/3),**如果这次测的是留存与时长,
数据很可能说不**。但这正是应该承担的风险:它把一个无法回答的问题换成一个可以回答的问题。

## 对 09-08 判断的更正

那份文档把 Playgama 称作「全舰队优先级最高的一条渠道」,并预登记 10-06「七款里至少一款上线」。
**这条线已被提前、否定地回答**:七款全部被分流出主目录。渠道没死,但形状变了——**主目录不是
入口,沙盒才是**;判定线相应换成台账里的 `gridlings-playgama-mcp-1027`。
09-08 那节第二条杠杆(一个 Bridge 构建 = 19 个平台)**不受影响**:Bridge 判定表是 SDK 源码里的
事实,与 Playgama 收不收我们的主目录无关。

## owner 只有一步

仓库已加 `.mcp.json`,所以是:`/mcp` → 选 `playgama-developer-cabinet` → 浏览器里授权。
之后这个会话可以自己建应用、传构建、传封面、拿 QA 链接、发沙盒。

## 会话的自我约束(写死,后续会话照办)

- **`start_sandbox_traffic` 是对外投放**,哪怕首轮免费:**不经 owner 明确同意不跑**。
- 提交审核 / 删除 / 回滚 / 读结算本来就是人的动作,MCP 里也没有这些工具。
- 沙盒发布有每小时 3 次的限额:**别把它当保存键用**,本地 `fleet-smoke` + `cg-package-smoke`
  先过,再发沙盒。

## 发布用哪个包,封面从哪来

- 包:**`site/downloads/playgama/<slug>.zip`**(Bridge 构建,七款齐备,0.10–0.24 MB)。
- 封面**不在仓里**——8 款画布游戏的海报出到 gitignore 的 `dist-store/`,发布前现生成:
  `ONLY=covers NODE_PATH=/opt/node22/lib/node_modules node tools/capture-store-assets.js <slug>`。
- **本轮顺手修了这条路上的一个坑**:那个脚本**无条件**解析 ffmpeg,于是 `ONLY=covers` 会因为一个
  它根本用不到的依赖而失败,并且**退出码 0、`dist-store/<slug>/` 是空的**——一个"成功了但什么都
  没产出"的命令。现在只有真要编码视频时才解析 ffmpeg。已实测 PROMPT 出四张封面
  (1920×1080 / 1080×1920 / 800×800 / 630×500,最大 0.64 MB,全部远低于 10 MB 限制)。
