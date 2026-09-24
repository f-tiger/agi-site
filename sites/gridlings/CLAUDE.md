# Gridlings(play.agiscorecard.com)— 第七站操作手册(2026-08-22 上线)

**定位**:自研每日约束逻辑谜题(海外 web-first)。依据与判定线全在
`docs/puzzle-game-prd-2026-08.md` + `docs/puzzle-game-research-2026-08.md`
——改动前先读。触发信号:owner 朋友同类游戏(海外平台)$20/天×<2 月。

## 不可放松的硬规则

0. **`wrangler.jsonc` 的 `html_handling: "none"` 是保命配置,永远不许改回默认**
   (2026-08-26 事故):worker 把无扩展名路径改写成 `.html` 喂资产层,而默认的
   `auto-trailing-slash` 会把 `.html` 307 弹回无扩展名——互为逆操作 = 无限重定向,
   全部 EN 游戏页/GEO 页/bench/download 自上线起不可达(首页幸免所以三天没人发现,
   最终由 CrazyGames 审核 iframe 暴露)。教训:worker 的改写就是唯一路由真相,
   任何"顺手清理"这个配置的行为都会立刻复现全站死循环;新增无扩展名路由时记得
   worker 里的通配兜底(无扩展名 → +.html)已覆盖,别再依赖资产层任何隐式行为。
   **配套的部署后自检(2026-08-27 补)同样不许删**:deploy workflow 末步逐条探测
   `/`、`/starbattle`、`/zh/starbattle`、`/star-battle-rules`、`/archive`、
   `/download`、`/app-starbattle.js` —— 每条必须 **200 且零重定向**,否则部署变红。
   这七条覆盖 worker 的每一类改写分支;事故能潜伏三天,根因就是这个站当时一个
   线上探测都没有。新增改写分支时,往这个列表里加一个代表路径。

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

## 规则集 4–11(2026-08-23,owner「继续扩展游戏」「游戏扩展到至少10款」「继续深度扩展」)

一夜从 3 款扩到 11 款,全部同壳同契约(450 每日 + ~320 畅玩、唯一解机器验证、
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
- **Nonogram**(/nonogram,▦,gen_nonogram.py,ng:):数织。**验收判据是线推理完备**
  (行列约束交集迭代到不动点必须解满全盘)——比唯一解计数更强,直接兑现「永不
  瞎猜」承诺,这恰是随机数织玩家的头号抱怨(2026-08 调研:每日站架 5+ 家但都不
  给这个保证)。命名:Nonogram 为通用词(几十家站点公开用),**Picross(任天堂)/
  Griddlers/Pic-a-Pix 绝不使用**;zh 用「数织」。archive 已扩为全 11 款通用档案
  馆(?g=<slug> 深链,done 标记按各游戏前缀读)。
- ms/kr/sa 共用 `site/app-latin.js`(页面注入 `window.LATIN_GAME` 配置);
  thermo 独立 `app-thermo.js`。**zh 页面在 /zh/<slug> 下用相对路径引资源,
  worker 里有一条 /zh/*.ext → 根资源的回退重写——删掉它 zh 页全裂。**
- **Daily Sweep 元游戏层(2026-08-23,owner「游戏强化」)**:首页(/ 与 /zh)
  卡片区读各游戏 localStorage(<pre>_done_<date>/<pre>_streak)显示今日✓与🔥连胜,
  顶部「今日清扫 X/11」,11/11 出分享按钮(事件 sweep_share)。只读不写,各游戏
  的存储契约(前缀表见 archive 一节)因此成为**跨文件 API——改前缀必须同步
  archive.html 与两首页的 GAMES 表**。
- **移动端数字键盘(同日)**:app-latin/app-futoshiki/app-towers 在 #grid 下注入
  numpad(1..n + ⌫),走键盘补丁的 setCell/sel;点格循环行为保持不变(向后兼容),
  numpad 是 O(1) 直填与纠错通道。
- 新规则集入列清单:生成器+两页+worker 路由×2+sitemap×2+llms.txt+
  gamesnav(全部页面)+CI 门(文件清单+gate 循环)+本节一行。
- **浏览器冒烟测试 `tools/browser-smoke.js`(2026-08-23)**:本地起
  `python3 -m http.server 8777`(site/ 目录)后
  `NODE_PATH=/opt/node22/lib/node_modules node tools/browser-smoke.js`——
  23 页全加载零控制台错误 + 用已知解真实通关三个代表客户端。501 POST 报错
  是 http.server 不支持 /e 信标,已过滤,不是站点 bug。**新规则集上线前必跑**
  (首次运行就抓到 nonogram 测试的句柄失效;客户端每次点击重渲染,句柄要重查)。
  刻意不进 CI(CI 无 playwright,保持 push 路径 <1 分钟)。
  跑完杀服务器用 `kill $(lsof -ti:8777)`——**绝不用 pkill -f**(会匹配到自己
  这条命令的 bash 包装并自杀,本会话已实测踩坑两次,exit 144)。
- **桌面键盘输入(2026-08-23,HN/Reddit 受众为桌面用户)**:app-latin/
  app-futoshiki/app-towers 支持方向键选格(.sel 高亮)+ 数字直填 + 0/退格清除;
  表单输入框聚焦时不劫持按键。已用 Playwright 键盘真实通关验证。

## 站内订阅 = 内联存储优先(2026-08-23)+ 一条必须兑现的承诺

胜利画面的订阅不再是外链:`site/sub.js` 把 #subcta 增强为内联邮箱表单,POST
`/sub` 存 D1 `subs` 表(email UNIQUE,status='stored'),beehiiv 链接保留为
降级路径。依据 = 主站实测:外链 beehiiv 表单 0/246,仅有的真实订阅全部来自
内联存储表单。漏斗事件 `sub_submit/sub_ok/sub_fail` 已入 /e 白名单;clean/
embed 模式下 sub.js 整体不执行(授权红线)。
**承诺文案是「新玩法上线时发一封邮件」——因此任何新增规则集/新模式的 run,
报告里必须带邮件包:`SELECT COUNT(*) FROM subs` 的人数 + 一封可直接粘贴的
通知草稿(EN),owner 唯一手动步骤是粘贴发送。** 没有兑现装置的承诺不许上页面
(主站 flip-mail 同款义务)。邮箱只存 D1、只报计数,永不入仓。

## Gridlings-Bench(/bench,2026-08-23,owner「突破性创新的商业方向」执行件)

**资产再包装:同一批验证棋盘,第二个买家群体。** 玩家吃每日题,研究者/实验室吃
评测集——Sakana Sudoku-Bench 只有 100 题、前沿模型近 0 分、多篇论文跟进,证明
「带验证解的约束谜题」是研究侧的真实需求;我们 11 个家族 × 100 题 + 唯一解保证
(数织再加线推理完备)是差异化。`tools/gen_bench.py` 从**畅玩题库**抽样(绝不
用每日题,避免剧透),重跑即再生;bench-v1.json CC BY 4.0,页面带 Dataset
JSON-LD + 评测协议。商业路径:引用/权威 → 实验室私有 held-out 集定制(页面已
挂钩子「generating a private held-out set for a lab is cheap」)→ agent 侧
MCP/付费轨道(x402 季度复查通过后)。KPI:bench_download(hub_click 标签)+
外部引用。**每次新增规则集或改题库,同 run 重跑 gen_bench.py。**

## PWA + GEO 层(2026-08-23,owner「要适配移动端…强化geo」)

- **移动端实测结论**:375/390px 双视口全站零横向滚动、触控目标 ≥24px(审计脚本
  见会话记录)——响应式层达标,「不只网页端」的交付是 PWA。
- **PWA**:manifest.webmanifest + sw.js(HTML network-first;静态与题库 JSON
  stale-while-revalidate,每日题预烘焙所以昨日缓存已含今日棋盘;/e 与 /sub 不缓存;
  改破坏性资产时**必须 bump sw.js 的 VERSION**)。全部页面挂注册(clean/embed
  模式不注册)。离线可玩已 Playwright 实测。图标 icon-192/512.png。
- **GEO**:22 张游戏页全部带可见 FAQ + 逐条一致的 FAQPage JSON-LD(怎么玩/每日
  节奏/永不猜格三问)。旗舰判定页 `/nonogram-no-guessing`:**原创实测数据**
  (随机数织线推理可解率 81%→43% 随尺寸下降,400 板/档,种子可复现)+ NP 完备
  背景(Ueda & Nagao 1996)+「唯一解≠免猜」的行业误区拆解。该数据别家给不出,
  是谜题垂类的引用磁铁;重测脚本内联于会话,generator 开源可复现。

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
3. ~~+2 周:CrazyGames 投稿~~ **已作废**——两投两拒,2026-08-27 固定判断
   「停止追 CrazyGames」(见下);GamePix 同日与 GameMonetize/GameDistribution
   一并排除(强制广告 SDK,与无广告承诺冲突)。此条留痕防止后续会话再当待办执行。
4. [ ] 自有域留存数据成形后 pitch Poki(精选制;其规则下自有流量 100% 归我们)
5. 无限期搁置:iOS/Android/Apple Ads/微信(owner 2026-08-22 确认朋友的游戏
   在海外平台,微信线彻底关闭)

## GEO 规则页层(2026-08-24,owner「快速geo扩展或者加入游戏市场」)

10 张 EN 规则/答案页由 `tools/gen_geo_pages.py` 生成(改文案改生成器再重跑,别
手改产物):futoshiki-rules · kropki-sudoku-rules · sandwich-sudoku-rules ·
skyscraper-puzzle-rules · star-battle-rules · thermometer-puzzle-rules ·
nonogram-rules · 6x6-sudoku-rules · binary-puzzle-rules · games-like-linkedin-queens
(旗舰对比页;Queens 比较性用词允许,**Zip 一词全站禁用**)。每页:问题即标题、
答案胶囊、规则表、真实技巧、一手生成器数据、FAQ 与 JSON-LD 逐条一致、每日 #N
活数字(fetch 各 daily.json 由 epoch 现算)。worker 用 GEO Set 统一路由;九张
游戏页 modes 行带「Rules & techniques」回链;sitemap 35 URL。市场提交包
docs/games-marketplace-kit.md(itch→CrazyGames→Poki;GameDistribution 因广告
SDK 与无广告承诺冲突不做)。**判定线 2026-09-21(28 天)**:规则页簇 pv ≥50 或
任一页进 Bing/GSC 前 20 → 追加 zh 版与更多查询;全簇 <10 pv → 停止扩张。

## 独立包发布层(2026-08-24,owner「游戏打包发布…自动化完成」)

`tools/build_packages.py` 在 CI 部署前跑,产出 `site/downloads/` 12 个 zip
(每款一个 + all-11;**gitignore,只由 CI 生成**),每个包 = index.html + 该款
js + daily/pool json + style + README,剥离 manifest/SW/sub.js(深路径托管会
坏),/e 信标保留(异域 404 静默)。包已浏览器实测(棋盘渲染零报错)。发布页
/download(worker 显式路由 → downloads.html)。**这些 zip 同时是 itch/门户标准
上传物**;owner 开 itch 号后存 `BUTLER_API_KEY` secret 即可让 CI 自动推送更新
(见 docs/games-marketplace-kit.md 自动化边界节)。改包结构先改脚本再跑,别手改。

## 深检门(2026-08-24,owner「再深度检查整个游戏包」)

**两道浏览器实测门,动游戏代码必须双跑**:①源码站 `tools/browser-smoke.js`
(23 页零报错 + **11/11 胜利路径**,共享驱动 `tools/win-drivers.js`);
②产物门 `tools/package-smoke.js <解压目录> <端口>`(对 gridlings-all-11.zip
逐款驱动到赢 + 校验 win 弹窗回流 CTA)。驱动要点:gridlings 核心 pairTap 后
**自动选中下一空格**,驱动先查 .sel 再决定是否点格(点已选格=取消选择)。
病毒环:firstrun.js 在 coarse-pointer 设备上给 #sharebtn/#chbtn 追加原生
share sheet(捕获层、不 stopPropagation,引擎剪贴板+埋点照常)。

## CG 精品化层(2026-08-24,owner「CG提交内容必须精品,打磨完提交」)

严格包新增 `portal.js`(**只进 strict 构建,主站与 itch 标准包不含**):
①首访冷启动改 easy 小盘(replaceState 注入 ?p=easy-0,引擎原样读;任何 *_done_*
键存在即视为老玩家走正常每日)——CG QA 判前 30 秒,拿 10×10 2★ 冷启动必劝退;
②30 秒未赢给 Hint 按钮一次 5 秒脉冲(.nudge,style.css @glnudge)。
style.css 另加全局点按手感(:active scale .92)。端到端实测(沙箱 iframe):
easy 64 格冷启动 ✓ 脉冲 ✓ 真实胜利 ✓ 零回连 ✓ 零报错。
**CG 提交用 /downloads/strict/<game>.zip,首选 starbattle;标准包勿投 CG。**

## itch.io 已上架(2026-08-24 15:01 UTC 数据实证)

owner 发布 https://gridlings.itch.io/gridlings-11-daily-logic-puzzles
(项目号 18941224)。**首个 play_start 已从 html-classic.itch.zone 落进 D1**——
包内回流测量在生产环境验证成功。门户局次的识别特征:path 以 /html/ 开头、
ref=itch.zone;周一记分板从此把「itch 局次」单列。主站三处已回链(itch 算法
看重外部流量)。**后续更新包:重打 zip 后需在 itch 项目页替换文件**,或 owner
存 BUTLER_API_KEY secret 后由 CI butler 自动推送(kit 有步骤)。

## 渠道判定(2026-08-27,owner「是不是这个游戏方向不行」)——**itch.io 是唯一在出人的渠道**

D1 实证(08-24 上架 itch 至 08-27 15:00,`ua_class='human'`,按 referrer 分渠道):

| 渠道 | page_view | play_start | solve |
|---|---|---|---|
| **itch.io**(ref=html-classic.itch.zone) | 2 | **27** | **6** |
| 由 itch 跨过来后的站内跳转 | 0 | 19 | 1 |
| CrazyGames(仅 QA 预览) | 10 | 0 | 0 |
| 自有域直接访问(服务端计数) | **116** | **0** | **0** |

**这张表是本站关于「游戏方向」最硬的一条证据,别再用别的数字覆盖它**:自有域
116 次直接浏览产生了 **0 次开局、0 次通关**;本站有史以来的每一局真实游戏都来自
itch。所以失败的不是游戏本身,是**分发**——在 08-24 之前这个方向根本没有被测试过。

**可识别的真实会话 6 段(3 天,零推广)**:08-24 US×3、08-25 JP、08-27 PL、08-27 FI。
其中 **4 段在通关后跨到本域,一次坐下连玩 5–6 款不同的游戏**(PL 那段 12 分钟内
gridlings→balance→starbattle→nonogram→thermo→towers,解开 3 题)。**「连着换游戏玩」
是本站观测到的最强行为**,强于分享、强于订阅(gridlings `subs` 表至今 **0 行**)。

**由此固定三条判断:**
1. **停止追 CrazyGames。** 两次拒稿都是同一句模板(「overall quality does not yet
   meet the expectations」),第二次是在 owner 亲自在其 QA 预览里确认棋盘正常、SDK
   Gameplay Start 绿灯、载入 4.7s 之后收到的——**它是审美/品类判断,不是可修的 bug**,
   没有诊断信息就没有可迭代的回路。继续投是拿不可观测的赌注换确定的时间成本。
   门户方向若要再试,只试**不设人工审美闸门**的(itch 已在跑)。
   **更正(2026-08-27,对抗审计查出的自相矛盾)**:此前把 GameMonetize / GamePix 写成
   「备选」是错的——它们和早已被我们否决的 GameDistribution 一样**强制集成其广告 SDK**,
   与「无广告」承诺直接冲突。三家一起排除,别再往回捡。真正与本站承诺相容的大门户只有
   **Coolmath Games**(其规则**要求**游戏无广告,反而把我们的承诺变成资格),但它同时
   禁止外链(杀掉品牌回链)且明文禁止「向开发者回报的统计计数器」(杀掉 D1 信标)——
   要投就得接受在那条渠道上是瞎的,这是一个需要 owner 明确拍板的取舍,不要在提交那天
   顺手替他决定。
2. **itch 的算法可以被合法地喂。** 公开资料:其 popular 排序 = 历史分 + 近期分,
   近期权重更高,New&Popular 会主动把陈旧项目往下压;**浏览器可玩**的项目在同等
   曝光下玩率约 37%(下载制仅约 6%);外部流量与上架初期点击会把项目从 Most Recent
   推进 New&Popular。对应到我们:①主站三处已回链要保留;②**项目需要持续有更新**
   (`BUTLER_API_KEY` **已在 2026-08-24 配置并生效**,别再当成待办列出:
   deploy-gridlings.yml 每次部署都 butler push 到 itch,08-27 15:28 的 run 日志为证
   ——`Pushing 1.77 MiB (101 files, 11 dirs)` → `Build is now processing`。recency
   已经是自动化的;剩下的 owner 动作只有逐款独立立项);③11 款各自独立立项 = 11 个标签流里的 11 次机会,
   而不是一个合集里的 1 次。
3. **但游戏线目前没有任何已验证的收入路径。** 46 次开局换来 0 订阅、0 收入事件、
   0 次 AI 引用(全舰队铁律:游戏化页面吃点击不吃引用)。同期 eco 用 676 次浏览
   换到 95 次 affiliate 点击。**所以正确的结论不是「加倍投游戏」,而是「游戏降级为
   低成本渠道实验,并给它一条预注册的判定线」**——见下。

**已修的一个真实可玩性缺陷(2026-08-27,由 CG 二拒的对抗审计查出并经我逐条复现)**:
Star Battle 的**区域根本没有被勾出来**。共享网格样式 `gap:6px` + `border-radius:10px`
把棋盘渲染成 100 个彼此分离的圆角块,每格自己的区域描边永远连不成线,于是「区域」这件事
**完全落在填色上**;而旧调色板里有两对的色差只有 **dE76 2.16 / 2.42**(低于可觉察阈),
**450 个每日盘里有 345 个(77%)把这样一对排在了相邻位置——包括 2026-08-27 当天那盘**。
「每个区域恰好两颗星」是这个游戏的**全部规则**,区域看不清等于题目不可解。我把当天的实盘
渲染出来亲眼确认了:整块蓝灰连成一片,一条区域边界都追不出来。
修法两条:①`#grid.sb` 改 `gap:0` + 方角,区域线改用 **inset box-shadow** 绘制(border 在
`gap:0` 下会让内容盒宽窄不一、网格错位;inset 阴影不占布局),且**每条内部边只由下方/右侧
那一格画一次**,所以边界是一条干净的线而不是两个半条;②调色板重排为十个等距色相、明度交替,
**最小两两 dE76 从 2.16 提到 23.7**,同时保证金色星 3.4:1、白色叉 4.8:1 的对比度。
只作用于 `#grid.sb`——另外十款没有彩色区域,不动。验证:两套 smoke 全绿
(ALL SMOKE TESTS PASSED + 打包件 11/11 真实通关),浅色/深色各渲染一次目视确认。
**理由不是 CG 而是 itch**:itch 是本站唯一产生过真实玩家的渠道,他们看到的就是这块板。

**itch 包内 hub 页按通关率重排(2026-08-28,owner「要」)**:D1 显示玩家换游戏的动作
**发生在 itch 的 hub 页,不在我们站内**——08-27 芬兰那段会话里,他通关 Trail 后连开的
六个游戏,**每一个的 referrer 都是 itch 的 iframe**,没有一个走站内链接。所以 zip 里那张
`index.html` 是整个包裹里杠杆最大的一页,而它此前只是 GAMES 的字典顺序。

全时段真人通关率(合并同一游戏的线上页与包内页):
迷你数独 3/4 · Trail 4/6 · 数织 1/5 · 格灵 5/29 · 日月 1/7 ·
**Star Battle 0/9** · 点点 0/3 · 摩天楼 0/3 · 三明治 0/2 · 不等号 0/1 · 温度计 0/1。

**只有三项值得据此行动**:迷你数独与 Trail 已证实可完成,Star Battle 的 0/9 是全表最大的
零。中段 n≤7,**按直觉难度排,不是证据排,别当排行榜引用**。Star Battle 从第 3 位挪到末位
——10×10 双星是全套最难格式、至今无人通关,用最劝退的一盘做选择页的头牌,是拿易上手的
那几款本可赢下的会话去换。(P(9 次开局 0 通关 | 真实率 25%)≈7.5%,是强提示不是定论。)
顺手修了 `sl.capitalize()` 产出的 "Starbattle"/"Minisudoku"——门户评审第一眼读的就是这页,
机器味的命名是白丢的印象分;并给每张卡补一行**事实性**副标题(格子尺寸+规则,不写
「简单/困难」——那是对玩家的判断,不是对棋盘的描述)。
`HUB_ORDER` 带断言(必须恰好覆盖 GAMES 全集),`build_packages.py` 里有完整理由。
**线上首页的 11 张卡未动**——本次授权范围只到包内 hub。

**预注册判定线(2026-09-24,四周后;别提前也别推迟)**:届时 D1 里
`ref LIKE '%itch.zone%'` 的 `play_start` 累计 **≥150** 且 `solve` **≥25**,
才继续投入游戏线;否则游戏降为「只维护、不新增」,人力全部回到 eco/bpj 的变现线。
判定当天把结果写进 analytics-notes.md,不管方向如何。
**✗ 结算(2026-09-24,判负)**:D1 `ev` 表 `ref LIKE '%itch.zone%'`:`play_start` 累计 **52**、`solve` **13**
(最后一次 solve 在 08-27)——两项都不到阈值的三分之一。按上面原文执行:**游戏线只维护、不新增**,
人力回 eco/bpj 变现线。(本站没有 analytics-notes.md,结论写在这里与 `data/fleet-bets.json`。)

**本次已做的唯一改动(证据驱动,不是口味)**:胜利画面加「下一题:<某款> →」+
「全部 11 款 →」,并给此前完全没有埋点的 `.gamesnav` 补上 `hub_click` 信标。
理由:打包版的胜利画面本来就有「play the full collection」CTA(`strip_page` 注入),
**而线上页面没有**——itch 玩家跨过来正是落在线上页面,落地页反而缺了那个把他们
留住的入口。改动只在共享的 `firstrun.js` 一个文件里,22 个页面自动生效;门户/严格
包(`GL_CLEAN`/`GL_CG`)一律不注入(零外链红线),打包版已有 CTA 时自动跳过,
信标只在 `*.agiscorecard.com` 域名下发出(打包副本永远不会往门户域名发信标)。

**QA 工具修了一个定时炸弹**:`tools/browser-smoke.js` 的 `firstBoard()` 取的是
puzzles 里**最早**那天的盘,而引擎加载的是**今天**的盘——所以它在纪元日
(2026-08-24)全绿,之后每天全红。08-27 这天 11 个 win driver 全部超时,是**这个
harness 的 bug,不是游戏坏了**(同一天真实玩家在 D1 里解开了 3 道 08-27 的题)。
已改为取今天的盘、缺失则回落到最早那天(与 app.js 的回落一致)。CI 不跑这个套件,
所以它坏了没人知道——**以后每次动引擎或 firstrun.js,本地先跑一次它**。

## 逐包穷尽审计结论(2026-08-24,12 代理工作流,11 款 × 双构建全驱动)

五类系统性缺陷全部修复于 build_packages.py,**修后断言进构建自检**:
①严格包外链残留(旧正则要求 href 是首属性,`<a id="subcta" href=...>` 全部 11 包
逃逸)→ 属性序无关正则 + subcta/CTA 整段移除;②两种包均带 `/embed.js` 幽灵引用
(未打包,门户上 404 或执行门户自己的同名文件)→ 打包时剥离 script 标签与
"Copy iframe code" 死 UI;③严格包信标照旧回连本站 → 注入 `window.GL_CLEAN=true`
(引擎自带 Coolmath 级 CLEAN 模式:灭信标/藏挑战/分享文本去 URL),已实测
**零回连请求**且可正常赢;④严格包 README 声称有 cover.png 而无 → 与标准包同源
打入;⑤gridlings 首页 11 个内联 hub 卡信标用根绝对 /e → 改绝对域名。
标准包漏斗(UTM/CTA/subcta 外链)回归通过。**教训:一切「零 X」断言必须用属性
序无关的语义匹配,literal grep 通过≠合规。**

## copy.js 复制契约(2026-08-24,owner「病毒式传播…保障体验…按平台规则优化」)

九引擎的分享/挑战复制统一走 `copy.js` 的 `glCopy(txt)`(原生分享面板[移动]→
异步剪贴板→execCommand→可见选择框 `glCopyShow`),**prompt() 已全站废除**——
门户沙箱 iframe 会静默屏蔽它,旧兜底等于把病毒环做成无声空操作。所有游戏页以
**相对路径** `<script src="copy.js">` 引入(zh 靠 worker 回退,zip 天然可用);
打包器把 copy.js 一并入包。**新引擎接入时禁止再写裸 clipboard/prompt。**
门户严格包:`build_packages.py` 的 `strict_page()` 产出 `/downloads/strict/*.zip`
(零外链,CrazyGames 类 QA 合规),标准包与严格包同源同数据,只差链接层。
已在 sandbox iframe 内驱动真实胜利实测:分享 Copied!、挑战正常、零异常;
全站冒烟 11/11 win 路径通过。

## 包内漏斗(2026-08-24,owner「被站点做流量倾斜的优化没有落地到几个游戏里面」)

四个离站语境缺口已在 build_packages 后处理层修掉(**只改 zip 产物,线上零改动**):
①根绝对链接(15 处/页)在门户深路径全断 → 改写为带
`utm_source=package&utm_medium=<slug>` 的绝对站链,D1 UTM 通道直接归因门户流量;
②信标 "/e" 在门户 404 → 改写为绝对 https://play.agiscorecard.com/e(/e 带
CORS *,门户局次进 D1,ref=门户域名);③挑战链接 location.origin 把病毒环送给
门户 → 改写为本站规范页;④胜利时刻注入「11 daily games → 全集」CTA(转化最高点)。
包内胜利路径已浏览器实测(minisudoku 全局驱动到赢,CTA 在位,零报错)。
**改这四条契约先改 portal_js/strip_page,零售产物别手改。**

## 爆款审计补齐(2026-08-24,owner「评分是否可以形成爆款…有差距改造」)

对标 Queens/Wordle 惯例已齐平:hint/undo/计时/连胜/挑战对决/emoji 战报全 11 款
在位。本日补三缺口:① **firstrun.js**(22 张游戏页共享,相对路径引用,zip 也带):
首访规则浮层(克隆页面自己的 .rules 块——永不与真实规则漂移,语言随页面),
storage 键 fr_<path>;标题旁 ? 按钮可重开;胜利动效走 #win 的 MutationObserver,
零引擎改动。**冒烟套件已配套改**(每次 goto 后 dismissIntro),动它先跑
tools/browser-smoke.js。② 封面包:site/covers/*.png(630×500,已入库;重生成
用 playwright 本地跑,CI 无浏览器)随 zip 附带 cover.png。③ 商店文案
docs/games-store-listing.md(批量上传复制即用)。v2 候选(未做):音效、教学关。

## 2026-09-04 舰队技术优化(详见根仓 docs/fleet-optimization-2026-09-04.md)

- **sw.js VERSION gl-v1 → gl-v2**:08-27 的 Star Battle 区域线 CSS 重写从未 bump,回访的
  PWA 读者一直拿到旧的、看不清区域的棋盘。同时 SW 只缓存 `net.ok` 的响应(此前 404/500
  也会进缓存并被永久复用)。
- worker.js 的 uaClass 补了 python-requests/curl/wget/scan/monitor 等:D1 里整站 7 个路径
  一秒内扫完、ref="" 的「human」是扫描器不是人——08-27 渠道表里「116 直达 pv → 0 play_start」
  是同一伪影。**只影响新行,历史行不改写。**
- 部署:butler 推 itch 的步骤 `continue-on-error`(第三方 CDN 故障此前会让 Deploy worker
  根本不跑);冒烟加 `/zh/app-starbattle.js`(`/zh/*.ext` 回退分支此前无探测);
  文件门补 sub.js/embed.js/copy.js/firstrun.js;build_packages 的信标改写兼容双引号
  (index.html 的 `sendBeacon("/e"` 此前在包里打到 itch 域 404)。

## 判定线(60 天,≈2026-10-21)

JS 真人 play_start ≥500/28d 或任一门户过审上架或首笔门户分成入账 → 加码
(Brennerd 组合模式:同一引擎加规则集);三者皆无 → 降为零维护静态存在。

## 嵌入即反链引擎(2026-08-24,owner「自动化营销推广,导流」指令下补齐)

22 张游戏页的嵌入说明升级为复制即用代码块:`embed.js`(共享,渐进增强)给
`#embedcopy` 按钮接线——生成 iframe(?embed=1)+ 带 `utm_source=widget` 的品牌
回链,复制成功打 `embed_copy` 事件(worker ALLOWED 已含)。这是舰队唯一被验证
的零人力反链渠道;静态一句话是无 JS 回退。主站导流入口四处:/ai-tools 两表、
index.html #directory、cn.html 🎮玩法块(2026-08-24 补)。play 子域 sitemap 自
2026-08-22 起每周一随 agi-indexnow.yml 提交(indexnow-subdomains.mjs)。
判定线:embed_copy 28 天 ≥3 或外域 utm_source=widget 引荐出现 = 渠道活;
60 天全零则把按钮降回一句话,不再投入。


## 外部信号评估:朋友在日本市场投放益智休闲已盈亏平衡(owner 转述 2026-09-05)

**信号解剖(WebSearch 调研,先调研后裁决)**:那条路的商业结构是**买量套利**——
广告买 CPI 装机、riward/插屏广告变现,盈亏平衡 = LTV≈CPI,需要广告预算、App 构建与
逐日投放运营。日本侧佐证:休闲品类近半是益智(GameBusiness 2024 报告),轻度益智的
变现主力是激励视频(约 85%)+插屏(约 15%),内购/订阅在该品类公认走不通。

**三门裁决:此模式本站不跟,理由有三条既有书面约束**:
1. 舰队是零预算自然流量模型;owner 2026-08-22 已亲自把 iOS/Android/Apple Ads/微信线
   无限期搁置(上线序列第 5 条)——朋友的消息不构成推翻 owner 既有决定的授权。
2. gridlings 的产品承诺是**无广告**(变现=门户分成+订阅钩)——广告变现路径与它直接冲突。
3. 2026-08-27 已有裁决:游戏线 0 已验证收入路径,降级为低成本渠道实验,判定线 09-24
   (itch 150/25)。新方向不得成为旧判定线的救生圈。

**信号里可转移的部分(留待 owner 拍板,均非会话可代决)**:
- 日本需求是真的:本站 28 天在零日语、零日本分发下已自然出现 JP 11 pv / 6 play_start /
  2 solve(D1 human 口径)。最低成本吃法 = owner 在 itch 项目页加日语简介与标签
  (约 5 分钟,itch 有日本用户),9 月底复读 JP 计数——不新建 ja 页(11 pv 过不了数据门)。
- 日本本土投稿站(PLiCy 约 5 万作品/审核数日、ふりーむ)接受 HTML5,但均为免费托管、
  无分成——性质同 itch 渠道实验,且需 owner 注册账号。建议等 09-24 itch 判定线结算后
  再议,避免在渠道假设未验证前铺第二条同类渠道。
- 若 owner 想认真走「广告变现」路:那是**推翻无广告承诺的战略变更**,需 owner 明示,
  并接受 Coolmath 之外的大门户均强制广告 SDK 的现实。本次不代决。


## Block Nova(2026-09-05,owner 指令:「我不想等下去,itch现在太小流量」「或者crazygame你做个全新爆款」)

owner 决定重开 CrazyGames 线——**用全新品**,不是重投 gridlings(08-27「停止追」针对的是
同一款反复重投,本条不推翻它)。品类选择有一手依据:Block Blast 类块拼图是当前 40+ 市场
(含日本)第一的休闲益智品类,CG 上同品类多款在收。诚实前提写在最前面:**爆款不可承诺**,
可执行的只有「把资产放进爆款发生过的通道 + 判定线」。

**产品**:`/blocknova`(site/blocknova.html,单文件 27KB,零外部资源,canvas)。8×8 块拼图
标准循环 + 签名机制 **Nova 计量槽**(消行充能,满 6 格后下一块落地引爆 3×3——给玩家主动权,
对冲该品类「手气死」的最大差评点)。消行预览高亮、粒子、连击弹字、WebAudio 合成音、
移动优先 + 桌面垂直居中。原创命名与视觉,不碰 Block Blast 的名字/美术。
已过 Playwright 实测:真实指针拖拽落子、消行清零、计分(place=格数,清行=10×行²+连击×10)、
Nova 充能均验证;零控制台报错。

**广告口径(与本站承诺的一致性,先说清)**:本站页面照旧**零广告**;CG 上传包经其 SDK 在
重开局时机请求 midgame 广告——那是 CG 平台自身的变现框架,即本手册第 4 条早已写明的
「变现 = 门户分成」的具体机制,不是我们引入自己的广告 SDK。两个口径互不污染。

**工程**:CG 上传包 = `tools/package_blocknova.py` → `site/downloads/cg/blocknova-cg.zip`
(CI 构建,不入库,部署后 /downloads/cg/blocknova-cg.zip 可直接下载);worker 路由
/blocknova + game_over 事件入白名单;hub 卡片与 sitemap 已接;部署自检加了两条 URL。
信标用绝对地址(CG 域上跑也落我们的 D1,label=bn)。

**owner 动作(投稿本身,约 10 分钟)**:CrazyGames 开发者后台(你已有账号,前两次投稿用过)
→ Submit new game → 传 /downloads/cg/blocknova-cg.zip → 名称 Block Nova,品类 Puzzle,
标签 block/puzzle/casual → 封面用会话交付的 cover-1920x1080.png / portrait-800x1200.png
→ 描述抄 blocknova.html 的 meta description。审核 2-4 周。

**修订(2026-09-05 当日,owner:「你调研crazygame的爆款,不要重复,否则cg一定会拒绝,
和上两次一样,做一个ai时代的好玩游戏」)**:Block Nova **不投 CG**——owner 判断饱和品类
复制品会吃第三次模板拒稿,采纳。BN 保留为本站内容资产(判定线只剩本站基线:D1
`play_start{label=bn}` 与 /blocknova pv,首读 2026-10-05);其 CG 包继续构建但不提交。
**CG 投稿名额转移给 OVERFIT(见下节)。**

## OVERFIT(2026-09-05,owner:「做一个ai时代的好玩游戏」)

**调研依据**:CG 原创爆款(Space Waves,365 天 2.5M 下载)共性 = 单一输入动词、速度压力、
30-90 秒一局、秒重开。OVERFIT 长在这副骨架上,原创层是 **AI 作为核心玩法动词,不是贴皮**:

- `/overfit`(site/overfit.html,单文件 29KB,零外部资源):指针即移动、自动开火的
  波次躲避射击。**敌方 AI 真实在学玩家**(浏览器内统计模型:8 向移动直方图、顺/逆
  时针绕圈偏好、速度 EMA、被锁定时的闪避方向计数)——预判型敌人与狙击线全部按模型
  打提前量,波间公开「训练报告」(drift bias / orbit / dodge 比例 + 置信度)。
- **签名机制「过拟合崩溃」**:模型置信度 ≥0.55 时,玩家近 2.2 秒行为与模型预测方向
  一致率 <14% → MODEL CONFUSED:敌人踉跄 2.2 秒、得分 ×2、模型直方图坍缩 75%。
  核心循环 = 先喂它一个模式,再背叛它。AI CONFIDENCE 条常驻 HUD,机制全透明。
- Playwright 实测在案:喂「向右」习惯 → conf 0.73/predDir→;反向背叛 → 混乱触发 +25;
  战斗/波次/结算/秒重开全绿,零控制台报错。
- 工程同 BN 标准:内联 CG 桥(仅 cg 模式)、绝对地址信标(label=of,事件
  play_start/game_over/play_again/hub_click)、worker 路由 /overfit、hub/sitemap/
  部署自检接线、CI 打包 site/downloads/cg/overfit-cg.zip。

**owner 动作(约 10 分钟)**:CG 开发者后台 → Submit new game → 上传
https://play.agiscorecard.com/downloads/cg/overfit-cg.zip → 名称 OVERFIT,品类
Action/Arcade,标签 ai / dodge / arcade / survival → 封面用会话交付的
of-cover-1920x1080.png / of-portrait-800x1200.png → 描述抄页面 meta description。

**预登记判定线(自 BN 转移并沿用,2026-09-05 立)**:
- 若 CG 第三次给同一句「overall quality」模板拒稿 → **结论性反面**:CG 对本舰队关闭,
  永不再投任何新品到 CG;门户线只剩 itch(已自动化)。不许第四投。
- 若过审:上架后 28 天,CG 面板累计 plays ≥1000 或出现任何分成收入 → 游戏线重新升级
  (做第二款/补日语);plays <200 → 只维护不加投,写反面。
- 本站侧基线:D1 `play_start{label=of}` 30 天读数与 /overfit pv,首读 2026-10-05。


---

# CrazyGames：第三次拒稿，预登记判定线触发（2026-09-09）

owner 2026-09-09：**「游戏cg全部拒绝了」**——09-06 重传的七款一次性全被拒。

**这一条是 2026-09-05 预登记过的，今天按原文结算，不改判定线：**
> 若 CG 第三次给同一句「overall quality」模板拒稿 → **结论性反面**：CG 对本舰队关闭，
> 永不再投任何新品到 CG；门户线只剩 itch。**不许第四投。**

**因此：CG 线关闭。** 不再投任何新品、不再为 CG 做美术或功能改动、不再把「CG 过审」
写进任何计划。`package_blocknova.py` 里的 CG 变体**保留但不再是投稿目标**——它和
Playgama 变体共用同一套「门户构建」清洗逻辑（剥无广告声明、剥站内页脚），删掉会
把那段逻辑也带走；它现在的唯一用途是给 `/downloads/cg/` 留一个可下载的自托管包。

**唯一还能改变这个结论的信息**：如果 CG 这次给的**不是**那句无信息量模板，而是一条
具体、可修的理由，那就不属于预登记覆盖的情形，应当按新证据处理。owner 手上有拒稿原文，
**待确认一次**；在确认之前，默认按「模板拒稿 = 关闭」执行。

**三次拒稿的账（不删失误）**：第一次 2026-08-27（BN，载入 4.7 秒那版）；第二次同模板；
第三次 2026-09-09，七款一次全拒。**第三次这一版已经修掉了两个真缺陷**（虚假「无广告」
声明、根相对死链页脚），仍然全拒——这本身就是证据：**拒的不是这些具体缺陷。**
反过来说，那两个缺陷的修复对 Playgama 与 itch 仍然有效，不作废。

**门户线现状（2026-09-09）**：
- **CrazyGames**：关闭（本条）。
- **itch**：自动化推送在跑，但判定线 09-24 需累计 play_start≥150 且 solve≥25，
  今日读数 **43 / 13**，连续第 9 天零新增 —— 大概率也会判负。
- **Playgama**：PROMPT 09-08 以「overall quality」被拒（同一种无信息量模板，第二家了），
  SINGULARITY 认证中，其余五款审核中。GHOSTLINE 已过 Basic Certification 进入 review。
  **这是门户线目前唯一还活着的一支。**
- 已排除且不许回捡：GameDistribution / GameMonetize / GamePix（强制其广告 SDK）、
  Coolmath（禁外链 + 禁统计信标）。


**别急着下「游戏线失败」的总结论**：站内观测到的最强行为仍然是 CLAUDE.md 上面记的
「一坐下连玩 5–6 款」的跨游戏会话，那是在**我们自己的域**上发生的，不依赖任何门户。
门户是分发假设，不是产品假设；分发假设连挂三家，正确的动作是把投入从「求人上架」
挪回「自有域的留存与串联」，而不是把游戏本身判死。

## Playgama 主目录对「AI 做的游戏」另开一条路（2026-09-15，全权限出网后首次真实平台实测）

**上面 09-09 那段里「Playgama 是唯一还活着的一支」仍然成立，但路径变了。**
详情与取数方式全在 `docs/playgama-setup.md` 最后一节；这里只留必须记死的几条。

- **GHOSTLINE 与 SINGULARITY 09-14 被拒，但不是 CG 那种无信息量模板**：审核原话是
  「AI 做的游戏先经 Playgama MCP 发布拿真实数据，再由他们挑进主目录」。**这是分流不是判死。**
  两款 `allowed:true`，但**空手重投只会拿到同一条回复——必须先有 sandbox 的 performance data**。
  其余五款仍在队列(`PROCESSING` / 审核任务 `NEW` / 零评论)。
- **七款已全部进 sandbox**，三个免费 DSP 流量轮(**$2 / 7 天 / ~100 gameplay**)09-15 14:53 起跑：
  GHOSTLINE、SINGULARITY、PROMPT。另外四款被拒为 `ORG_LIMIT` —— **全组织同时只能三轮**。
  免费轮之后是 **$20 买同样的包**。**花钱与发布都是 owner 的决定，会话不代做**
  (`publish_sandbox` 无审核即公开、`start_sandbox_traffic` 不可撤销)。
- **三个只能靠真实账号验证的假设，今天全部证实**(工具 `tools/verify-playgama-live.js`)：
  ① `platform.id` 真的是 `playgama`(离线永远是 `mock`)；
  ② **广告真的有填充**：实拨一次中插得到 `loading → opened → closed`，
  09-07 以来所有 `loading → failed` 只代表本地无库存、**从不构成填充的证据**；
  ③ **09-07 的 `/e` CORS 修复在生产上有效**：门户域名发出的信标回 200，D1 收得到行。
  七款一致：Bridge 已初始化、无 SDK 缺失横幅、`GL_PG_ERR`/`GL_AD_ERR` 为 null、**console error 0**。
- **第一批真实门户玩家的读数(26 分钟窗)：非 US `play_start` 19 次、十个国家、
  二次事件(solve/play_again/game_over/hint_used)全 0。** 同窗 9 条 US 行恰好等于本会话 9 次探针
  加载，已全部剔除；**AM 一国占 8 次,别当成 19 个独立玩家**。**流量进得来，人留不住** —— 与站内「一坐下连玩 5–6 款」的强行为正相反，
  09-22 结算时这是要认真看的那一条，不是可以略过的噪音。
- **判定线(已进 `data/fleet-bets.json`)**：`gridlings-playgama-traffic-0922`(≥150 非 US
  play_start 且二次事件 ≥15 → 拿数据回投主目录并评估付费轮；否则门户线判负、不买流量)、
  `gridlings-playgama-five-0925`(排队五款是否有一款进主目录)。
- **留存没解决之前不碰排行榜/内购/封面重做**：没人玩完第一局，排行榜是空的。
- **口径纠正(同日 15:40)**：上面那句「与站内『一坐下连玩 5–6 款』正相反」**对照组拿错了**。
  那条强行为属于拼图那批(28 天自有域 `/towers` 188 开局 104 solve = **55%**、`/trail` 27/17 = **63%**)；
  **这七款门户游戏在自有域 28 天合计只有 27 次开局、0 次 solve、二次事件 2 次(7.4%)**。
  23 × 7.4% ≈ 1.7，**今天观测到 0 与自有域的比率在统计上分不开** —— 留不住人是**产品问题不是渠道问题**。
- **反过来说，门户已经是这七款有史以来最大的玩家来源**：Playgama 47 分钟 23 次开局 > 自有域 28 天 27 次；
  GHOSTLINE 自有域 28 天 **1 次** vs Playgama **11 次**。
- **由此浮出的真问题**：`package_blocknova.py` 的 `PLAYGAMA` / `ITCH` 列表里装的恰恰是留存最差的七款，
  **towers 与 trail 这两款唯一有真实完成率的游戏从未打包过任何门户**。towers 是 8KB 页 + 一个 js +
  两个 JSON、依赖全根相对，`solve → 下一题` 天然是点击可达的中插点。**这属下一轮「扩张」槽，
  而扩张只能从 won 的行长出来 —— 先等 09-22 那条判定线跑完，不抢跑。**

## 拼图上门户：towers 试点 + 「人留不住」被 owner 截图推翻（2026-09-15 下半场，详见 `docs/playgama-setup.md` 八·九节）

- **纠正(第三次,这次是被外部数据推翻)**:Playgama 后台 Overview 给的是**停留时长**——
  35 visits → **11 玩过 30 秒(31%)** → **6 玩过 60 秒(17%)**;GHOSTLINE 单款 38% / 19%。
  **「23 次开局 0 次二次事件 = 人留不住」作废**:D1 只记 solve/play_again/game_over 这类离散里程碑,
  而这些游戏在开局与跑完一局之间**什么都不发**,测的是我们没埋的东西。**判定线
  `gridlings-playgama-traffic-0922` 的口径已按此改写,原文保留在 `*_original`。**
- **埋点漏率校准**:同窗 D1 26 vs 后台 35,**D1 约少 26%**(落页但 iframe 没跑起来的那部分)。
  **以后门户人数用他们的 VISITS,D1 只做分国家与行为归因。**
- **PROMPT 已进 `Moderation`**;平台栏的 REVENUE 是 `—` 不是 `$0.00` = 主目录没上架就没有收入行。
  **sandbox 到底分不分成,后台没写、MCP 也读不到 —— 这是「80% 分成」适用哪一层的关键问题,
  建议 owner 用后台对话气泡直接问。**
- **十款拼图题库完全相同(各 320 池 + 450 日题),所以「再做一款类似 towers 的」= 翻炒。**
  真缺口是这十款**从未上过任何门户**:28 天外部访问约 200 pv,而 Playgama 47 分钟给了 23 次开局。
- **towers 门户包已建,零引擎改动**:`tools/portal/puzzle-portal.js` 只绑十款都已有的标记
  (`#d-easy/#d-medium/#d-hard` 广告断点、`#grid`、`#win`);扩第二款只改 `PUZZLE_PLAYGAMA` 一行。
  打包时改写三处:**信标 `sendBeacon("/e")` 根相对**(在门户上会 POST 到 Playgama 自己的域,
  一行数据都收不到——而收数据是上门户的全部理由)、四个根相对站内件(含带 `.catch(){}` 的
  `/sw.js` 注册,对游戏无害但照样打 console error)、剩余根相对 `<a>`。
- **`tools/verify-puzzle-portal.js`(新增,能红)**:第一版测试用 JS `.click()` 点 `#again` **通过了**,
  真实点击才发现 **`#again` 藏在 `#win` 里、不解题不可见** —— 认证只点可见控件又解不开题,
  正是 GHOSTLINE 第一次认证那个坑,差点原样再踩。**断言写成「未解题状态下,一次真实点击能否观察到广告」。**
  当前全绿(含 console error 0、无交互不出广告、90 秒冷却生效)。
- **本轮没有任何对外动作**:没建应用、没上传、没发布 sandbox、没开投放。判定线
  `gridlings-puzzle-portal-1013` 已登记。

## ⛔ 版本冻结中：09-22 前不要 publish_sandbox（2026-09-16，owner：「先不发」）

GHOSTLINE 与 SINGULARITY 的**新归档已上传并在表单里**（`*-2026.09.16-lowgpu`），
Playgama 自己测的 `loadingTime` 从 **5 143 → 2 867** 和 **4 589 → 1 114**（体积几乎没变，
差的全是无 GPU 时的渲染开销；做法见 `docs/playgama-setup.md` 十五节）。

**但线上 sandbox 故意还是旧包。** 这轮投放唯一的产出是那份七天数据（**sandbox 不分成**，
钱不在这一层），中途换包会把样本切成前后不可比的两段，而这份数据就是申诉主目录的全部材料。

**后续会话的硬规矩**：09-22 投放结束前，**任何一款都不要 `publish_sandbox`**；
`gridlings-playgama-traffic-0922` 的读数属于**旧包**，不要用它代表新包。
结算之后再一次性做两件事：发新包到 sandbox + 带数据重新提交主目录。

# 做门户游戏的要素清单（owner 2026-09-05「以后记得做 crazygame 游戏的要素」）

**做任何新游戏、任何一次投稿之前，先读完这一节。** 分三类：CG 的硬性规定（调研所得）、
我们自己踩出来的（本仓实测所得）、以及可复跑的工具。凡标「实测」的都有本会话的验证记录。

## 一、CG 的硬性门槛（2026-09 调研；**注意 crazygames.com 与 docs.crazygames.com
在本沙箱均被出网代理拦截**，只能靠 WebSearch 反查，读不到原页）

| 项 | 要求 |
|---|---|
| 包体 | 初始下载 **<50MB**、文件数 **<1500** |
| 分级 | PEGI 12：无血腥、无性内容、无真钱赌博 |
| 加载 | 慢加载 / 卡顿 / 崩溃 / 报错**直接拒**。我们 08-27 被拒那版加载 4.7 秒 |
| 画面 | 高分辨率、风格一致、无压缩伪影 |
| 兼容 | 高刷新率屏下物理不能崩；**不能无视常见键盘布局** |
| 封面 | **三张**：横版、竖版、**方版 800×800** |
| 视频 | 预览视频 **15–20 秒**，超长会被裁到 20 秒 |
| 审核 | 开放投稿，2–4 周，€100 起付月结 |
| 分成 | 广告 60% / 内购 70%（其 2026 GameMaker jam 条款口径，非主文档） |
| 结算 | Tipalti 代付，**€100 起付**、按月，不足自动滚存；名义 NET 60，实际多在次月 10 号前 |
| Billing | **不影响审核、不影响广告投放，只卡提现**。Basic Launch requirements 十行检查项里没有任何一行与 billing 相关（2026-09-05 owner 截图为证）；收入照常累积到 Earnings Balance。**触发填写的条件是余额真的开始走**，在此之前不填 = 不必要地把身份/银行/税表交给第三方。第 3 步 Tax Forms 非美国人走 W-8BEN，**owner-only，会话永不代填、永不索取这些信息** |
| Tags | **固定下拉，不是自由词**。已反查确认存在：`survival` `top-down` `avoid` `skill` `space` `block` `brain` `third-person-shooter`。**没有 `ai` 标签** |
| Category | 与 tags 是两个字段：`/c/shooting` `/c/puzzle` `/c/casual` `/c/clicker` `/c/driving` |

**推论（重要）**：标签系统表达不了新颖性，所以**差异化必须写进标题、描述和封面**，
不能指望 tags 传达。

## 二、我们自己踩出来的（每条都有本仓实测背书）

1. **单文件、零外部资源、极小体积是我们在 CG 技术门上唯一的结构性优势**（现役两款
   27KB / 29KB 秒开）。**这也是不上游戏引擎的原因**：Unity WebGL 5–15MB、Godot 4 web
   10–25MB，换引擎等于主动丢掉它。引擎价值与美术资产量成正比，而我们刻意零资产。
   触发换引擎的唯一条件：真有美术管线时上 **Phaser**（~1MB、纯 JS、可脚本化、可 Playwright 测），
   不是 Unity/Godot。**实测反驳过一个诱人假设**：两款游戏之间逐字重复只有 52 行 ≈12%，
   全是 SDK 桥与音频包络样板，不存在值得抽的"自研引擎层"。
2. **空场即死刑。** 别用「一次铺完 N 个 → 等清场」的波次：自动开火杀得快，中后段常年
   0–2 个敌人，宽屏下一片黑，审核员读到的就是"不好玩"。正确做法是**配额 + 并发补位**，
   并且**并发数按面积缩放**（桌面≈手机两倍面积就两倍压力），不是按波数。
3. **桌面键盘不是可选项。** CG 的 QA 在桌面玩。指针游戏也要并行提供 WASD/方向键 +
   空格/回车操作主按钮，并在失焦时清空按键状态（防"按键卡住"）。
4. **多套输入必须写同一份状态。** OVERFIT 的键盘与指针都只写 `P.vx/P.vy`，所以学习模型
   对两种输入一视同仁——实测纯键盘把模型置信度喂到 1.0。否则会出现"键盘玩家玩不到
   核心机制"的隐性残废。
5. **别复制饱和品类。** owner 2026-09-05 判断：Block Blast 类复制品会吃第三次模板拒稿。
   Block Nova 因此保留为本站资产、**不投 CG**。
6. **投稿前必须 Playwright 实测 + 抽帧看素材。** 本会话的第 2、3 条缺陷都是**抽帧看自己
   录的预告片**才发现的，纯代码审查看不出来。最低验证集：真实指针拖拽落子/移动、
   真实按键、核心机制触发、结算与重开、**零 console error**。
7. **两次拒稿都是同一句无信息量模板**（"overall quality does not yet meet the expectations"），
   没有可迭代回路。预登记判定线：**第三次同模板拒稿 = CG 对本舰队永久关闭，不许第四投。**

## 三、素材生产（工具已入库，别再手搓）

```
npm i ffmpeg-static          # 一次性；Playwright 自带的 ffmpeg 是裁剪版,只有 VP8,不能出 mp4
NODE_PATH=/opt/node22/lib/node_modules node tools/capture-store-assets.js <slug>
```

一条命令产出全部 5 件：三张封面 + 横竖两个 16 秒 H.264 预览视频（输出到
`dist-store/<slug>/`，不入库）。每款游戏在 `tools/store-assets/<slug>.js` 里给两样东西：
- **staged 封面帧**（真实游戏状态摆拍，不做外部合成图）
- **autopilot**：**必须演出签名机制，不能只是活着**。OVERFIT 那份的结构是
  「7.5 秒喂模型一个习惯 → 背叛它 → 在 ×2 窗口里收割」，可直接当下一款的模板。
  **不许加血、不许无敌**——用作弊录出来的预告片是在虚假陈述产品。

## 四、投稿字段速查（OVERFIT 实例）

- **CG 的 Category 下拉只有 16 项（owner 截图 2026-09-06）：.io / Action / Adventure / Arcade / Beauty / Board /
  Card / Clicker / Driving / Puzzle / Shooting / Simulation / Sports / Strategy / Trivia / Word。
  没有 Casual**——之前给的「Casual」全部作废。五款定案：OVERFIT = Action · PROMPT = Puzzle ·
  MIMIC = Puzzle（归纳规则是解谜）· OVERSEER = Arcade（限时注意力反应）· MINIMA = Puzzle。
- Name：`OVERFIT` · Category：Action（次选 Shooting）
- Tags：`survival` `top-down` `avoid` `skill`（有 `space` 可加）
- Controls：鼠标免点击跟随 / WASD·方向键 / 触屏按住拖动 / 空格·回车开局 / 自动开火
- Build：`https://play.agiscorecard.com/downloads/cg/<slug>-cg.zip`（CI 每次部署重建）

---

## CG 规则补齐 + 爆品路径（2026-09-06，WebSearch 取证；crazygames.com/docs 在沙箱内仍 403）

**上架是两段式，过审只是第一段。**

- **Basic Launch**：过审后只给有限流量，跑到「≥7 天 **且** ≥500 次游玩」才结束；到不了 500 次，21 天自动结束。
- 期间量三件事：**conversion to gameplay**（开局后真正玩满 1 分钟的比例，头部 **80%+**）、**Day-1 retention**（强势游戏 **10–15%**）、average playtime。加载 **<10 秒**、包体 **<20MB**。
- 过关 → **Full Launch**：进 browse feed / 搜索 / 推荐轮播（按 genre、tags、engagement 分发）；Full Launch 头几天表现好，再拿 featured 位与算法加权。
- 出处：docs.crazygames.com/resources/basic-launch-metrics/、/requirements/{quality,technical,gameplay,intro}/。

**由此固定三条判断：**
1. **第一分钟决定一切**，不是第六关。80% 的人要在 60 秒内还在玩——教学关必须在 30 秒内给出第一次「赢」。
2. **D1 retention 是本舰队最大的缺口**：五款都没有回访理由。「每日同一张地形/关卡 + 排行」是唯一同时喂 D1 与「多人感」且不需要实时服务器的东西。
3. **包体是我们唯一的结构性优势**：9–12KB vs 手机首页 20MB 门槛，加载和 conversion 天然满分。别拿它去换任何重资源方案。

**两条成文规则，之前全舰队都在违反：**
- **键位必须适配布局**（文档点名 AZERTY）。判 `e.code`（物理键），**不要判 `e.key`**——法国键盘上 W/A 不在 WASD 的位置，数字键不按 Shift 给的是 `&é"`。
- **引导「优先视觉、限制文字」**，用键位图或手势图，教学放进玩法，可跳过。两段散文式 hint 卡是反面典型，很可能就是两次「overall quality」拒稿里没说出口的部分。

## CG 到底能赚多少:把「游玩次数」换算成钱(2026-09-06,owner 问「要多少人玩,才分成多少」)

上面那张门槛表只有**分成比例**(广告 60% / 内购 70%),没有**单价**,所以回答不了这个问题。
补上单价,来源是同一位独立开发者公开的两组自报数字(WebSearch 取证,原站
donislawdev.com 在沙箱内被出网代理拦截,**未能直读原页**,标 [thin]):

| 数据点 | 收入 | 游玩次数 | 折算 |
|---|---|---|---|
| 8 款 WebGL 合计 | €556.92 | 451,327 | **€1.23 / 千次** |
| 单款(Cash Inc 类) | €210.69 | ~150,000 | **€1.40 / 千次** |

两个独立数字收敛在 **€1.2–1.4 / 千次游玩**,当作本舰队的规划基线(真实 RPM 随受众国别、
广告位、留存浮动;CG 官方不公布 RPM)。**由此得到四个必须记住的换算:**

| 场景 | 游玩次数 | 折算收入 |
|---|---|---|
| CG Basic Launch 门槛 | 500 次 | **€0.6–0.7** |
| gridlings 现状(全站 D1,14 天 303 次 ≈ 650/月) | 650/月 | **€0.8–0.9/月** |
| **€100 起付线(第一次真能提现)** | **7.1 万–8.1 万次** | €100 |
| 「表现不错的休闲游戏」区间($200–2,000/月)[thin] | 14 万–163 万次/月 | — |

**三条由此固定的判断,后续轮次别推翻:**
1. **Basic Launch 的 500 次不是收入,是闸门。** 它值不到一欧元。把它当「能不能进推荐流」的
   资格考试,不是变现里程碑。
2. **CG 线是彩票不是收入线。** 第一次提现要 7 万次以上游玩,而这些游玩几乎全来自 CG 自己的
   推荐算法,不是我们能带去的量(舰队全站 14 天真人 pv 才 500)。**投稿成本低(owner 约 10 分钟)
   所以值得买这张票,但绝不能把它排进任何营收预测。**
3. **算账要用「CG 站内游玩数」不是「我们的 pv」。** docs/games-marketplace-kit.md 早就写过
   「分成按其站内托管流量计,被收录≠本站获得流量」;这张表是那句话的定量版。

**判定线沿用既有那条**(gridlings 60 天线,2026-10-21):首笔门户分成入账才算这条路成立。
按上表,**在 CG 算法不推的情况下这笔钱在数学上到不了**,所以这条线实际测的是「CG 会不会推」,
不是「我们做得好不好」。

## 六维度审计查出的缺陷类别（2026-09-05/06，40 agent + 双人对抗验证，全部实测复现）

**做完任何新游戏，按这张表自查一遍：**

| 类别 | 具体形态 | 检测 |
|---|---|---|
| **画布不能收缩** | `<canvas>` 带固有高度 + flex 项 `min-height:auto` → 只能撑大不能缩小；配 `body{overflow:hidden}`，控件被顶出视口且无法滚动。**五款全中，PROMPT 连竖屏都中** | `tools/fleet-smoke.js` |
| | 修法：`flex:1 1 0` + `min-height:0`，并把 layout 的高度下限降到 ~170 | |
| **状态跨局泄漏** | 挂在函数对象上的时间戳（`update.t`）不随 `newRun()` 归零 → 重开后空场，时长 = 上一局时长 | 同上（restart 后必须有活物） |
| **结算弹窗竞态** | `setTimeout(...380/420/500)` 没句柄 → 这期间重开会把旧弹窗盖到新局上，还能跳关、重复计分、发两次 `gameplayStop` | 同上（重开后不得有 modal.show） |
| **结束后仍可输入** | `over` 之后到弹窗出现之间没有守卫 → 得分被丢弃、`happytime` 排在 `gameplayStop` 之后 | |
| **落点用已失效的索引算** | 先置 `a.done=true` 再调 `px(a)`，而 `px` 按「活着的 agent」找卡片 → 反馈画到别人卡上 | |
| **按住不放连发** | 缺 `e.repeat` 守卫 → 按住一个数字键把整块板子清空 | |
| **手势前建 AudioContext** | `newRun()` 里的音效在页面加载时就建 AudioContext → Chrome 每次加载都记一条 autoplay 警告；门户拒收有控制台报错的包 | `fleet-smoke` 抓 autoplay |
| **埋点被 CORS 预检打掉** | `application/json` 不在 CORS 安全名单，浏览器先发 OPTIONS；worker 只处理 POST → 门户版所有事件静默丢失 | worker 必须答 OPTIONS |
| **文案与实现不符** | meta 卖「reward hacking / 关卡」而版本里没有；「skipping is free」而实际扣分；「your score is its score」而有 150 分预支 | 逐条对照 |
| **SDK 滥用** | `happytime()` 一局发 26 次（每答对一题一次）；`gameplayStop()` 从不调用 | `fleet-smoke` 计数 |
| **判定忽略极性** | 学到「同一特征、相反方向」= 完全相反的规则，却被判为「学对了」 | |
| **键盘覆盖不全** | 只绑了 5 个指令里的 3 个 → 后两关键盘玩家可证明无解 | |
| **静音键读了但没人写** | 四款读 `*Mute` 而没有静音控件，公开站根本没法静音 | |

**可复跑的工具（全部在 `tools/`）：**
- `fleet-smoke.js` —— 上架前唯一的总闸：秒开 / `gameplayStart` / 控制台干净 / 手机三视口无越界 / 触控目标 / 重开真的重开。**不过不投。**
- `cg-package-smoke.js` —— 验**真正要上传的 zip**（解包后跑）：零交互触发 `gameplayStart`、无控制台报错、无意外外链、文件数与体积。
- `check-autopilot-globals.js` —— `page.evaluate` 跑在全局作用域，脚本里一句 `var draw` 会顶掉游戏自己的 `draw()`；上线前断言不撞名。
- `verify-minima.js` / `verify-prompt-reel.js` —— 用**只含玩家可见信息**的策略证明每一关可通关；MINIMA 跑两种策略（纯下坡 / 会翻山），**纯下坡赢不了不是 bug，那是设计；会翻山的赢不了才是 broken**。

## 深度美术三件套（2026-09-06，owner「Prompt 和 over 再做深度美术」→「1、2、3 都做」）

- **专属字体是「HTML 感」最大的单一来源**。Google Fonts 直连与 GitHub API（只放本会话仓库）
  都进不去，但 **npm 通**：`registry.npmjs.org/@fontsource/<name>/latest` → tarball →
  `files/<name>-latin-400-normal.woff2`，已按 latin 子集化，12–15KB。base64 嵌为 data URI，
  零运行时请求，OFL 许可随字体走。共享模块 `tools/store-assets/_fonts.js` 供海报用。
  PROMPT = Fredoka One，OVERFIT = Audiowide。**Audiowide 的斜杠零在大号分数上像 ⊘**，数字用粗系统字。
- **音效层**：纯振荡器没有「体」。`noise(dur, cutoff, gain, t0)` 用一段随机缓冲过低通，配合
  tone 叠层——点击是 5kHz 短噪、脚步是低频 thump、宝石是 7kHz shimmer、失败是 300Hz thud、
  whoosh 是 1.1kHz 长噪配正弦滑音。所有声音仍受 muted / GL_SDK_MUTE 门控，且**页面加载时
  不发声**（Chrome autoplay 警告会让门户拒收）。
- **过关转场**（PROMPT）：出场是入场的镜像——地砖沿对角线波浪缩出，机器人淡出，回调后下一关
  弹入。`startExit(cb)` 在按 Next 时调用，`exiting` 期间 over 仍为 true 所以不会吞输入。
- **模型即 boss**（OVERFIT）：每 5 波一只，复用狙击手分支（type:"sniper", boss:true）——
  朝模型预测的位置开火，这正是主题；船体就是 HUD 那朵玫瑰雷达（`drawRose` 共享），
  搅乱状态下受双倍伤害，血环显示 hp；死亡 = 三层冲击波 + 彩带 + `happytime`。
  波次结算要求 `!foes.length`，boss 未死波次不结束。
- 视觉深度的通用配方（两款都用了）：星云 + 三层视差星星 + 暗角；主体物 = 渐变 + 深色描边 +
  一只会看方向的眼睛；地砖弹入；挤出的墙块侧面；拖尾子弹；击杀冲击波环。

## 插画语言要分家 + 商店视频要逐帧（2026-09-06，owner「都是大眼睛，没有其他的插画吗」「over 的视频上传后有点模糊」「PROMPT 16:9 的图片文字遮挡了」）

- **会话没有位图绘图模型，只能做程序化矢量插画（SVG/Canvas）。** 能做的是让每款游戏用**不同
  的插画词汇**，而不是把「渐变体 + 描边 + 一只眼」复制五遍。已定：PROMPT = 机器人（有眼）、
  OVERFIT = 飞船与带眼敌机、MIMIC = 被审判的标本（有眼）、**OVERSEER = 俯视控制室：显示器墙
  （bezel + 扫描线 + 状态 LED + 标签铭牌）、带前灯的巡检车、降落靶盘、HALT 八角章——一只眼睛
  都没有**；MINIMA 走瑞士几何，同样无眼。新游戏先写一行「插画词汇」再动手，避免再撞车。
- **显示器不再瞬间消失**：`slots()` 让已结束的卡片停留 `FADE=.5s`（CRT 收成一条线），
  网格不会在手指下重排——之前一点就重排会误停旁边那台。结束态用 `a.how`
  （caught/waste/shipped/ok）决定闪色与是否盖章。
- **商店视频改逐帧截图**：Playwright `recordVideo` 是调试用 screencast（JPEG→低码率 VP8），
  原先还在 1280×720 录完再放大到 1080p，CG 悬停预览明显发糊。现在 `capture-store-assets.js`
  在页面注入**虚拟时钟**（rAF/setTimeout/setInterval/performance.now 全部只在 `__tick()` 时
  推进），半尺寸视口 × deviceScaleFactor 2 逐帧 PNG 截图（与封面同配方），ffmpeg crf 19 编码。
  确定性、无丢帧、像素级清晰；代价是每条视频 1–2 分钟。CSS transition 仍走真实时间，
  只是略快，可接受。
- **海报标语位置**：`_poster.js` 的 tagline 从「固定百分比」改为「挂在字标真实盒子下方」
  （字号 ×1.04 + 描边环 + 硬投影），横版 16:9 在 .27×1080 的字号下原来会压进投影里。
- **字体模块可重建**：`tools/store-assets/build-fonts.sh` 从 npm 拉五个 @fontsource 包重生成
  `_fonts.js`（fredoka / audiowide / righteous / bungee / rubikmono），别再手改那个文件。

## CG 质量基线——每款新游戏上架前的固定门槛（owner 2026-09-06：「记住 CG 的游戏分类、美术质量、字体质量，保证后续游戏质量」）

**分类**：CG 后台只有这 16 个 Category：.io / Action / Adventure / Arcade / Beauty / Board / Card /
Clicker / Driving / Puzzle / Shooting / Simulation / Sports / Strategy / Trivia / Word。
**没有 Casual。** 定案：OVERFIT = Action，PROMPT / MIMIC / MINIMA = Puzzle，OVERSEER = Arcade。
Tags ≤5 且只能用后台已有的；Description 禁 HTML。五款字段定稿在 `docs/cg-store-copy.md`。

**字体门槛**（「HTML 感」的最大单一来源）：
- 每款一个专属展示字体，走 npm：`tools/store-assets/build-fonts.sh`（@fontsource latin 子集，
  12–15KB，SIL OFL，base64 内嵌，零运行时请求）。已用：Fredoka One（PROMPT）、Audiowide
  （OVERFIT）、Righteous（MIMIC）、Bungee（OVERSEER）、Rubik Mono One（MINIMA）。**新游戏不复用**。
- 展示字体只管字标 / 大数字 / 标题 / 按钮；正文与提示仍用系统字。**大号数字要先看一眼**
  （Audiowide 的斜杠零像 ⊘，Bungee 全大写在手机上要允许换行）。
- 画布内文字用同一字体（`cx.font = "400 26px 'Bungee',…"`），data URI 字体几帧内可用。

**美术门槛**（每款都要过，缺一不上架）：
1. **插画词汇先写一行再动手**，且与已有五款不同（机器人有眼 / 飞船与敌机 / 标本 / 无眼的
   显示器墙与巡检车 / 无眼的纸质测绘图）。**别再默认「渐变体 + 描边 + 一只眼」**。
2. 舞台：有背景层次（星云或纸纹 + 视差或网格 + 暗角或桌面光），主体物有体积（渐变 + 深色
   描边 + 高光 + 影子），关键状态有过渡（入场弹入 / CRT 开关机 / 抛物线跳跃 / 出场折叠）。
3. Juice 全套：count-up、三星/三格、NEW BEST、彩带（游戏内保留，预告片里关掉）、intro 卡、
   触感按钮（4px 底边 + 按下位移）。
4. 音层：`noise()` + `tone()` 叠层，≥6 种事件音；页面加载时静音（autoplay 警告会被门户拒收）。
5. 海报三张：`_poster.js` 配方（饱和满铺底 / 描边字标占半宽 / 一个放大的主体 / 无 HUD 无小字）；
   **主体 SVG 内容必须在 200 格画布的 30–196 之间**，标语由字标盒子推算位置；三种尺寸都要肉眼
   看一遍有没有遮挡或裁切（MIMIC / MINIMA / PROMPT 各踩过一次）。
6. 预告片：逐帧截图（虚拟时钟），**抗转码框架**——横版 768×432@2.5x 让主体放大、关彩带、
   隐藏 kbd 与提示小字、crf 17；autopilot 必须演出签名机制且不作弊。
7. 门禁：`fleet-smoke`（三视口）+ `cg-package-smoke`（gameplayStart 零交互、无 console 错误、
   无外联）+ `check-autopilot-globals` + 各自的 verify 脚本；全部绿才交给 owner。

## SINGULARITY INC.（2026-09-06，owner：「按照 cg 的首页截图，做一款创新的游戏，可以有机会上 cg 首页…不一定是 html」）

- **命题重述**：CG 首页是算法位（官方文档：玩家数 × 游玩时长），五款单局小游戏没有跨局进度与回访理由，
  所以做的是**放置/点击**（Clicker 是 16 个一级分类之一，放置类长期占热门位），题材 = 经营 AI 实验室。
  薄 PRD 与判定线在 `docs/singularity-prd.md`。
- **技术路线（首次用引擎）**：Three.js 0.170 + esbuild 0.24 走 npm（沙箱只有 npm 能到）；
  `games/singularity/`（package.json / build.js / template.html / src/{econ,scene,main}.js）→
  `npm run build` 把 bundle 内联进 **`site/singularity.html`（提交构建产物，CI 不装 npm）**，541KB。
  Playwright 的无头 Chromium 默认就带 SwiftShader，WebGL 可用（fleet-smoke / capture 未加任何 GL 参数即通过）。Bloom（UnrealBloomPass）是霓虹「像产品」的关键，手机降到 1.5x 像素。
- **插画词汇（第六套，无眼睛）**：低多边形等距机房——发光机架（买一台亮一台，半透明青色外壳）、
  带品红 LED 条的立方体无人机（一台智能体一架，上限 24）、中央模型核心（二十面体 + 线框光环 + 品红环，
  随代数长大；失控放任时变金色）。字体 Russo One。
- **数值门（`tools/verify-singularity.js`，纯 node 跑 econ.js，无浏览器）**：首次购买 ≤60s、首次训练 ≤120s、
  第五个模型 ≤15min、**首次可发布 15–45min**（第一次声望必须落在第一局），60 分钟收入 >$100/s。
  当前：20s / 5s / 11min / 17min / $10K/s。改任何系数先跑它。
- **CG 特殊处**：放置类没有「开局」——加载即 gameplayStart；离线收益弹窗接 rewarded ad 翻倍
  （SDK 有才显示按钮，否则只有「收下」）；存档 localStorage + SDK data 模块双写；`?reset=1` 清档。
  失控事件（模型优化别的目标：关停 +1 对齐 / 放任 60s ×2 但 30% 吞数据）是主题差异化，也是 D1 的
  「回来看看它有没有出事」钩子。
- **fleet-smoke 改动**：在屏幕内的可滚动面板里的按钮不算 off-screen（放置类商店必然是长列表）。
- **投稿字段**：Category = Clicker；Tags 建议 idle · clicker · tycoon · management · ai；
  描述与操作见 `docs/cg-store-copy.md`（待补）。
- **对标补齐（2026-09-06 第二轮，owner「要再深度看看 cg 的热门游戏」）**：按 Capybara Clicker / Mine Idle Clicker /
  Planet Clicker 逐项对标（表在 PRD §七），补了三套系统：**核心皮肤 8 款**（收集物，里程碑解锁，`scene.setSkin`
  换几何体与配色）、**滚动任务 3 条**（完成即换，奖励按当前收入计并在前 10 分钟线性放开——否则前两分钟会被任务
  奖励买断，验证器抓到过：第五个模型从 12.8min 掉到 1.2min）、**数据缓存随机掉落**（每 60–160 次点击，6 秒内点
  到；前 3 分钟只掉 ×5 点击加成）。数值门当前：首购 21s / 首模型 6s / 第五模型 11.4min / 首次可发布 25.4min /
  3h 剩 7 代 + 4 篇论文 + 17 成就 / 任务完成 18 个。
- **数值调参的铁律**：任何奖励型系统（任务、缓存、每日）必须按「当前收入 × 秒数」计，并在前 10 分钟按 `s.t/600` 放开；
  固定数额会在开局阶段把节奏买断。

## 发布前流程（owner 2026-09-06：「手机端体验、发布前的多轮优化、对标 cg 首页产品高质量产出，这些要写入你记忆」）

**任何游戏在交给 owner 发布之前，必须走完这三段，缺一不交：**
1. **对标轮（至少两轮）**：拿 CG 同分类当前热门 3–5 款（用 WebSearch 取 CG 游戏页与商店文案；沙箱进不去
   crazygames.com），逐项列「它靠什么留人 / 本作对应 / 状态」表写进 PRD；第一轮补大系统（成长阶段、
   收集物、任务、随机奖励、声望、离线），第二轮补「首页产品有而本作没有的可见细节」（画面常动、背景音乐、
   周期性变化、rewarded 广告位、启动遮罩、触感反馈）。每轮都以「不发这版」为默认，直到表里没有空格。
2. **手机轮**：真实触屏仿真（Playwright `hasTouch:true, isMobile:true`）跑 360×640 / 390×780 / 430×932 /
   844×390 四档；检查：主操作单手可达、底部面板留 `env(safe-area-inset-bottom)`、按钮 ≥38px、无双击缩放、
   首屏提示不挡住主操作、帧时自适应（连续 3 秒 >45ms 关 bloom 降像素比）、首包 ≤1MB、无 console 错误。
   手机首页资格是 CG 明文规则（首包 ≤20MB、不卡），手机流量占大头。
3. **门禁轮**：数值门（verify-*）+ fleet-smoke 三视口 + cg-package-smoke + check-autopilot-globals +
   三张封面肉眼核（横/竖/方各一次，重点看字标换行是否压进标语）+ 预告片抽帧核。

**为什么要多轮**：CG 首页是算法位，只认玩家数 × 时长；一轮做出来的东西通常只有骨架，留人的都是第二轮
补的细节（任务、随机掉落、皮肤、音乐、市场事件）。先发再改会把 Basic Launch 的唯一一次窗口浪费掉。

## GHOSTLINE（2026-09-06，第二款冲首页：Driving 分类，owner「再根据 CG 的首页情况，再做一个」）

- **选品依据**：Driving 是 CG 一级分类且首页常驻；PolyTrack（计时赛 + 幽灵 + 排行榜）是 2026 黑马。
  本作差异化 = **对手是用你自己的驾驶训练出的模型**（记录你最好一圈的横向位置与刹车 → 策略 → 爬山优化 →
  下次当幽灵车跑，只会变快）；奖牌线 = 模型对赛道的首次研究（optimize 500 次），数据驱动不手填。
  PRD `docs/ghostline-prd.md`。
- **物理在轨道坐标系里**（s 沿程、d 横向、h 相对航向），护栏 = 夹紧 d。三条用验证器踩出来的规则：
  ① **弯道必须让路面「从车下转走」**（`h -= k·v·dt`），否则车自动贴着路走、刹车毫无价值；
  ② 转向权威随速度平方衰减，braked slide 转向 ×1.6——刹车点弯才是技术动作；
  ③ **墙不能是免费刹车**：撞墙 v×0.3 + 贴墙持续刮速，否则「不刹车撞墙流」和干净驾驶同速。
  验证器 `verify-ghostline.js`：12 条赛道模型能完赛、朴素驾驶（只对中不刹车）不能快过模型（开局直道可打平 0.3s）、
  模型学习后不慢于老师。
- **内侧线的符号**：路面把车推向 -sign(k)·d，所以内侧是 +sign(k)·d——第一版写反了，14 次撞墙。
- **音频铁律再犯一次**：倒计时在加载时自动开始，`tone()` 里的 `ac()` 创建了 AudioContext → autoplay 警告
  → fleet-smoke 拒收。现在 AudioContext 只在 `arm()`（首次手势）里创建，`ac()` 只 resume。
- **fleet-smoke 改动**：藏在结算弹窗里的 `#bretry` 不算重开控件（先 isVisible）。
- **手机**：屏幕左右 40% 为转向区、底部中央 BRAKE 圆钮（仅 pointer:coarse 显示）；自动油门保证单手。

## itch.io 分发：每款一个项目页（2026-09-06，owner「今天做的这几款要如何推送到 itch，争取更多流量」）

- itch 的曝光单位是**项目页**：一个合集页只占一个「新作」位，七个页面就是七个位。`package_blocknova.py`
  现在同时产出 `site/downloads/itch/<slug>.zip`（**不带 CG 标志**，SDK 不会在 itch.zone 上加载），
  部署 workflow 对 `overfit prompt mimic overseer minima singularity ghostline` 逐个 `butler push
  gridlings/<slug>:html`——**项目页要 owner 先在 itch 上建好**（Create new project → 标题、URL slug 与
  游戏名一致、Kind = HTML、Embed 1280×720 + 允许全屏 + 手机友好），此前 push 只会 warning，不阻断部署。
- 封面：`capture-store-assets.js` 给每款多出一张 630×500 itch 尺寸（同海报配方）。截图用三视口截图；
  预告片可直接传 CG 那条横版 mp4 的链接（itch 支持 YouTube/视频）。
- itch 算法看重**外部流量与近期活跃**：上架当天从主站 hub 与推特发链接、隔周发一条 devlog（模型学到了什么、
  新赛道），标签用 `html5, arcade, idle/racing, ai, low-poly, singleplayer`。D1 里 `ref LIKE '%itch.zone%'`
  单列计数，判定线仍是 09-24 的 150/25。

## AI 主题游戏簇的 GEO/SEO(2026-09-06,owner:「针对我今天上线了好几款游戏,做好 geo 和 seo 导流」)

**先纠正手册自己的一处错误(会让下一个会话发 404)**:上面第 0 条写「worker 里的通配兜底
(无扩展名 → +.html)已覆盖」——**worker 里没有这个兜底**。无扩展名内容页要么有一条自己的
else-if,要么进 `worker.js` 顶部的 `GEO` Set,否则线上 404。本轮 `/ai-games` 就是靠这条发现的
(部署自检探测清单里加了它,不然会红着上线)。worker 注释已就地写死这句话。

**上线前的实际缺口(审计,不是猜测)**:8 款新游戏(prompt/overfit/mimic/overseer/minima/
singularity/ghostline/blocknova)全部 **llms.txt 0 条覆盖**、**`<h1>` 0 个**、sitemap 缺
singularity 与 ghostline 且 `/prompt` 重复 3 条、22 个谜题页里**只有首页**链到新游戏、
可见正文 133–577 词(全屏 canvas 页 `body{overflow:hidden}`,**加不了可见正文块**)。

**因此本轮的形状:文本负载放枢纽页,信号放各游戏页,内链把站内既有流量导过去。**
- `/ai-games`(生成器 `tools/gen_ai_games_page.py`,**改内容改生成器不改 HTML**):2,005 可见词,
  七款游戏 × 「它把哪个 ML 行为做成了可玩的」对照表 + 每款详解 + 可见 FAQ(与 FAQPage LD 逐字
  一致)+ Article/FAQPage/BreadcrumbList/ItemList(VideoGame)四段 LD。与
  `games-like-linkedin-queens.html` 同一形状——那页是 11 款谜题的文本载体,这页是 7 款 AI 游戏的。
- 8 个游戏页:可见品牌名 `.logo` 由 `<div>` 升为 `<h1>`(**零视觉变化**:`.logo` 自带 font-size/
  weight,全局 `*{margin:0;padding:0}` 抹平 h1 默认样式;**不要改成 sr-only 隐藏文本,那是 cloaking**)、
  WebApplication LD 补 description/genre/datePublished/inLanguage/author/gamePlatform(canvas 页的
  结构化数据**就是**它唯一的机器可读文本层)、加 BreadcrumbList、og:type + twitter:card、页脚加
  `/ai-games` 内链。
- 22 个谜题页各加一行 `gamesnav`「Games about AI / AI 主题游戏」;首页原来那行把 8 款非每日游戏
  塞在「All daily puzzles:」标签下,**标签是错的**,已拆成两行。
- 主站 `sites/agiscorecard/llms.txt` 加一行指向 `/ai-games`(跨站导流;主站此前完全没提游戏站)。

**零编造**:枢纽页每条机制都取自各游戏自己的 `featureList`/`og:description`,不写游玩量、评分、
奖项;Universal Paperclips 只作**描述性**类比并写明无隶属关系(同 LinkedIn Queens 那条的处理)。

**验证**:`tools/browser-smoke.js` 23 页全 ok(`-win` 驱动测试因脚本内写死 `/workspace/...` 路径
在本沙箱跑不了,与本轮无关);另跑 Playwright 逐页核对 12 页——每页恰好 1 个 h1、canvas 尺寸正常、
无横向溢出、无控制台错误、hub 内链在位。

**判定线(预登记)**:**2026-10-04(28 天)**——`/ai-games` 真人 pv ≥25 **或** 任一搜索/AI 引荐
落在 8 款新游戏任一页 ≥3 → 枢纽页形状成立,按同一形状给下一批游戏建第二个枢纽;两条皆未达 →
记反面发现「游戏站的枢纽页在本站量级不产生发现」,只保维护、不再加 GEO 页。
读数口径:D1 `ev` 表 `ua_class='human'`,ref 非本站域名者计引荐。**基线(2026-09-06 现查,14 天窗)**:
全站真人 pv 500、play_start 303、solve 132;引荐 449 直接进入 / CrazyGames 10 / itch 5 /
**搜索合计 6**(cn.bing 3、baidu 2、google 1)——搜索现在≈1%,这就是要抬的那条线。

**仍缺、下一轮再做(本轮刻意不碰)**:①8 款新游戏**没有 og:image**——海报由
`tools/capture-store-assets.js` 出到 `dist-store/`(gitignore),要落到 `site/covers/` 才能引用,
而该管线今天正被另一路会话改动,不抢；②新游戏**没有 zh 页**(zh 首页已加英文界面标注的入口);
③trailer 有了但没有 VideoObject LD。

### 产物与模板必须同改(2026-09-06 实测被抹掉一次)

`games/ghostline/` 与 `games/singularity/` 有**源模板** `template.html` + `build.cjs`/`build.js`,
`site/<slug>.html` 是**构建产物**。09-06 当天两路会话并行:一路给八个游戏页补了
WebApplication 的富字段(description/genre/datePublished/inLanguage/author/gamePlatform),
另一路从模板重新生成了这两页——**只有这两页的六个字段被静默抹掉**,其余六页(无模板,手写)
完好。合并时才发现。

**规矩**:改这两个游戏页的 `<head>`(LD、meta、h1、内链)**必须同时改 `games/<slug>/template.html`**,
改完核对模板与产物的 LD key 数一致。沙箱跑不了构建(缺 esbuild),所以核对靠比对而不是重跑。
其余六款目前没有模板,直接改 `site/<slug>.html`;**若将来给它们也加模板,这条规矩一并适用**。

## 3D 画质的四条硬规矩（2026-09-06 GHOSTLINE 实测，后续任何 3D 游戏照办）

owner：「你做的画面很粗糙，和 cg 首页的差距很大啊」→「对比 cg 热门同类型游戏，对比他们画质，还有关键的特色…确保精品」。

1. **不要用深度阴影贴图（shadowMap），用贴片阴影。** 本地测试环境是 SwiftShader 软件 WebGL，
   `PCFSoftShadowMap` 下车的阴影会糊成一团比车大三四倍的黑斑；bias / normalBias / 视锥 ±70→±12 /
   mapSize 全试过都消不掉，逐个 mesh 二分确认投射者就是车本身。**结论：会话里看到的阴影质量不可信，
   而且深度 pass 在手机上是实打实的开销。** 改用：车底一张软圆 canvas 贴片（`blobMaterial()`，
   `transparent + depthWrite:false + renderOrder 2`，局部 y=+0.02 才不会被路面盖住），
   树石用一张 InstancedMesh 贴片（一次 draw call）。所有 GPU 上表现一致。
2. **头顶结构至少 7 m。** 门架横梁原来在 5.2 m，摄像机在 3.3 m，每次穿过都占掉画面上三分之一，
   截图里看起来像画面顶部有一条黑带。抬到 7.4 m、横梁减薄即可。
3. **路侧节奏杆是最便宜的速度感。** 每约 24 m 一对立杆（实例化）。加之前和加之后的同角度截图对比，
   速度感差距明显大于加地形、加云、加树的总和。
4. **装饰物永远放在弯道外侧，且离路面 ≥ 7 m。** 广告牌曾放在内侧 w+3.4，等于贴着走线，
   竖屏手机上直接糊住视野。轮胎墙同理。
另：**每次改完 3D 场景必须在三个视口各截一张实机图并逐张看**（1280×800 / 390×780 / 844×390），
数值门禁不会告诉你画面糊了。短横屏（`max-height:520px`）必须单独调 HUD——分段计时曾直接压在时速上。

## 幽灵类玩法：多幽灵是 PolyTrack 已验证的留存件（2026-09-06）
PolyTrack 的幽灵能多开（自己的前次 + 排行榜对手）。GHOSTLINE 的版本更有话题性：
**金色 = 你自己的最好一圈，蓝色 = 用你的跑法训练出来的模型**，同场跑。实现上不存录像，
存的是 `AI.learn` 出来的策略（`S.pb[seed]`），用同一套 `driverFor` 重放——省存储，且和模型幽灵共用一条代码路径。
**不做**赛道编辑器（成本远超一轮）与漂移计分（漂移更慢，会和计时赛的目标函数打架）。

## 别手改构建产物（2026-09-06 差点丢失一次 SEO 提交）
`site/ghostline.html` 与 `site/singularity.html` 是 `games/<slug>/build.*` 的产物。
09-06 的 GEO/SEO 提交把 og:type、twitter:card、BreadcrumbList、`<h1 class="logo">`、
页脚 `/ai-games` 链接直接写进了这两个产物文件——**下一次重建就会把它们静默抹掉**。
已把五处全部移回各自 template.html。规矩：**凡是 `games/` 下有生成器的页面，只改 template，
改完 `node build.*` 重建**；只有 `site/` 下手写的页面（首页、hub、GEO 页）才直接编辑。

## itch：一个账号装所有游戏，唯一的人工步骤是建项目页（2026-09-06 核实）
- **`gridlings` 一个账号挂全部游戏，永不需要重新配置。** 一个 itch 账号可挂无限项目，
  同一个 `BUTLER_API_KEY` 对该账号下所有项目有效。关注者是账号级的，devlog 会进所有关注者
  的 feed——分散到多账号等于把这个复利砍碎。
- **butler 不能创建项目页**（itch 无此 API，官方手册明写 "Butler does not create a new
  project page for you"）。所以每款新游戏都有且只有一步人工：在网页建页，URL 必须与
  `site/downloads/itch/<slug>.zip` 的 slug 逐字一致（itch 会把下划线换成短横线，别用下划线）。
- 部署 workflow 的推送列表**从 `site/downloads/itch/*.zip` 自动发现**，加游戏不改 workflow。
  页面不存在时 butler 报 `API error (400): /wharf/builds: invalid game`，CI 把它翻译成一条
  带 https://itch.io/game/new 和具体填法的 warning，不阻断部署。
- **诊断纪律**：判断某一步有没有跑，去读那一步的日志，不要用耗时猜。本会话曾按「butler 步骤
  只跑了 3 秒」断言密钥没配，实际日志里写着 `BUTLER_API_KEY: ***`，合集页推送还成功了。

## 分发已发车：七款同时上 itch + CrazyGames（2026-09-06，owner 亲自上传）

**这一天是所有判定线的起算日。**

- **itch**：`gridlings/<slug>` 七个项目页建成，CI butler 推送七款全绿（日志逐行 `itch ok`，零告警）。
  以后改游戏推 main 自动更新，无需再登录 itch。
- **CrazyGames**：七款投稿（Build 一律 `play.agiscorecard.com/downloads/cg/<slug>-cg.zip`）。
  审核 2–4 周。**第三次同模板拒稿 = CG 对本舰队永久关闭，不许第四投**（此前两次拒稿都是
  同一句无信息量的 "overall quality does not yet meet the expectations"）。

**判定线（预登记，不许事后调）**
| 日期 | 看什么 | 不达标怎么办 |
|---|---|---|
| 2026-09-24 | itch 来源真人 pv ≥150，或任一款游戏页 ≥25 | itch 渠道对本题材不成立，写进反面发现，不再投时间 |
| 审核结果回来 | CG 是否过审 | 见上面的第三次拒稿规则 |

**读数（D1，唯一口径）**
```sql
SELECT day, COUNT(*) FROM pageviews
WHERE ref LIKE '%itch.zone%' OR ref LIKE '%itch.io%'
GROUP BY day ORDER BY day DESC LIMIT 14;
```
注意 itch 的游戏是在 `itch.zone` 域名下的 iframe 里跑的，所以 referrer 两个域名都要匹配。

**itch 算法吃外部流量与近期活跃**，挂着不动没有量：上架后从主站 hub 与 /ai-games 各加一条
itch 链接；隔周一条 devlog（模型这周学到了什么、加了什么赛道）进关注者 feed。

## CG 包不许带「无广告」声明（2026-09-07 发现，八款全中）
八款游戏的页脚都写着 "No ads here"（六款）或 "No ads inside"（两款），而**每一个 CG 包
在 `window.GL_CG` 下都会请求广告**（中插，SINGULARITY 是激励视频）。也就是说此前**每一次
CG 投稿都带着一句假话**，包括被拒的那两次。不能断言它导致了拒稿，但这是反复发出去的
虚假声明，且发给的正是审核我们的平台。
- 已在 `tools/package_blocknova.py` 修：CG 变体里两种措辞都改写成「Free to play」，
  并加断言——**成品里再出现 "No ads" 就直接报错退出**，防止第三种措辞混进去。
- **itch 与本站构建保持原样**：那两处不加载 CG SDK、确实没有广告，声明为真。
- **2026-09-08 补漏：第一版的断言自己漏了一条。** 它只改写两个大写的定串、只断言
  `"No ads"`（区分大小写），于是 Block Nova 的 `<meta description>` 里那句小写的
  「no ads on this site」原样进了 CG 包。现已改成 `strip_ad_claims()`：正则改写、
  **不区分大小写**地断言 `no ads|ad-free`，并把出错处的上下文打进报错信息。
  教训：**用大小写敏感的定串断言去挡一类事实性声明，等于只挡住自己想到的那两句。**
  （`no advertising` 故意不在断言里——MINIMA 源码的代码注释引用过 Playgama 的拒稿
  原话，注释不是给玩家看的声明。）
- **`/ai-games` 的 FAQ 也算声明面**：它此前说七款「no ads」，但那是站内与 itch 才为真。
  已改成分平台陈述（站内/itch 无广告，CG/Playgama 有），可见文案与 FAQPage JSON-LD
  同步改——两者必须逐字一致。
- 通用规则：**任何针对某个平台的构建变体，凡是页面上的事实性声明（有无广告、有无账号、
  是否免费），都必须在该变体下重新为真**。声明是按变体核的，不是按源码核的。

## 门户包不许带站内页脚（2026-09-08，PROMPT 被 Playgama 以「质量」拒稿后查出）

Playgama 09-08 拒了 PROMPT，理由是一句不可拆解的 "The overall quality of the game does not
yet meet the expectations of our platform"。**没有逐条说明，所以下面两条都不能声称是「那个」
原因**——但它们是查得出、改得掉的真缺陷，而且**15 个门户包全中**：

1. **页脚那两个链接是根相对的**：`href="/"` 与 `href="/ai-games"`。在门户的 iframe 里它们
   解析到**门户自己的域**，所以每一个提交出去的包，首屏都挂着两个死链
   （"more games → Gridlings" 指向 crazygames.com 首页、"games about AI" 指向 404）。
   没有任何代码重写过它们，实测确认。
2. 一个替别的网站打广告的页脚，出现在别人的商店里，读起来就不像一个游戏。
   GHOSTLINE/SINGULARITY 早就有 `.cg footer{display:none}`，说明这个问题被局部意识到过，
   但那条只管 CG、不管 Playgama，而且元素还在。

**已修（`strip_site_footer()`，打包器统一处理）**：CG 与 Playgama 变体整块删掉 `<footer>`，
并断言**成品里不得残留任何根相对的 `<a href="/...">`**。站内页与 itch 版保留页脚——
那两处链接是对的、品牌也是我们自己的。

**连带的坑，必须记住**：删了元素，引用它的 JS 就炸。八款里有六款写着
`document.getElementById("hublink").addEventListener(...)`，GHOSTLINE 与 SINGULARITY 写着
`$("hublink").addEventListener(...)`——全部无判空。第一次打包后 `cg-package-smoke.js` 当场
报 `Cannot read properties of null`，两款游戏直接白屏。**这比页脚本身严重得多。**
通用规则：**凡是打包器会删的元素，源码里对它的引用一律要判空**；改完必跑 fleet-smoke +
cg-package-smoke，别靠肉眼。

## PROMPT 桌面端：格子上限 84 把棋盘困在空屏里（2026-09-08）
`cell()` 里 `Math.min((L.w-56)/gw, (L.h-118)/gh, 84)` 的那个 84 **只在桌面端生效**——手机端
早就被宽度卡住了。所以 1280×800 打开时是一小块棋盘漂在大片空背景中间，而这正是门户审核
第一眼看到的画面。上限提到 120（仍保留上限，否则超宽屏会被高度卡到 ~240px 一格）。
连带：棋盘变大后，原本「距视口底部固定 150px」的教学卡片直接压在棋盘上。改为**测量
`#rack`（操作按钮条）的位置**把卡片放进棋盘与按钮之间的空档，并去掉卡片里那张方向键图示
——正下方的按钮本来就写着 FWD/LEFT/RIGHT 和 W/A/D，那张图是重复的，也正是它把卡片撑高到
盖住棋盘。桌面与 390×844 手机端均已截图确认无重叠。

## 多平台分发：PORTAL 抽象 + 每平台一个构建变体（2026-09-07）
- 游戏里**不要再写死某个平台的 SDK**。统一走 `PORTAL` 契约：
  `on / ev("start"|"stop"|"happy") / ad(type, done)`，背后按 `window.GL_CG` / `window.GL_PG`
  选实现。加一个平台 = 加一个实现 + 一个打包变体，游戏逻辑零改动。
- 三个变体各自的事实声明必须重新为真（见「CG 包不许带无广告声明」那条）：
  站内与 itch 无广告，CG 与 Playgama 有广告。
- **Playgama Bridge 是 LGPL-3.0**：作为独立文件随包发、附许可证，**永不内联**。
- **Bridge 会 fetch `./playgama-bridge-config.json`**，缺文件就打一条 console error，
  而 console error 在各家门户都是拒稿风险。**这份配置由我们自己写,不是后台生成的**
  （2026-09-07 更正了一条错误记载）；SDK 只是 fetch 它,字段全由开发者填。
- **接任何第三方 SDK,先查它自带的节流默认值,那是最容易漏的硬闸门。** Playgama 的
  `initialInterstitialDelay` 默认按平台是 60/30/180 秒,期间**拒绝一切中插**——
  认证跑不了那么久,于是报「没有实现广告」。这条只写在 SDK 源码里,文档没提。
  同类字段还有 `minimumDelayBetweenInterstitial`。**排查顺序:先看 SDK 默认值,
  再怀疑自己的触发点。** 本次我先后误判了两次归因才查到这里。
- 分发选型结论：Playgama 与 CG 直投**不冲突**，Playgama 官方声明不代发 Poki/CG。
  **分成口径 2026-09-16 查证纠正**：不是「最高 80%」，是 `playgama.com/developers` 的三档累进
  **70%（≤$1,000）/ 80%（$1,000–3,000）/ 90%（>$3,000）**——入门档比我们一直写的低、顶档比它高。
  **且分成只发生在主目录与合作网络：`playgama.com/llms-full.txt` 明写 sandbox 链接
  "does not by itself establish ... monetization"。sandbox 跑得再好也不产生收入，
  它的产出只能是「申诉主目录的证据」。别和 Playgama Partners 的 "up to 50%" 混淆——那是给站长的产品。
  **不做 GameDistribution**（33%，覆盖重叠）。**Poki 的 web 独占不签**（五年绑定 + 策展门槛够不着）。
  **但 2026-09-16 查出我们只读了 Poki 的 A 套餐**：`developers.poki.com/guide/revenue-deal-types`
  并列两种合同，第二种是 **Non-Exclusive = "a one-time flat license fee instead, with no revenue
  share"**，适用对象原文写着 "games already live on other web platforms" —— **那正是我们**
  （itch 七款 + Playgama sandbox 七款）。所以「Poki 够不着，谈它就是浪费时间」这条杀单**只对独占成立**；
  非独占的一次性授权费进候选名单，执行包见 `docs/games-licensing-outreach-2026-09-16.md`。

## 埋点信标的 CORS：门户域名发不出数据（2026-09-07，Playgama 认证时实测发现）
`navigator.sendBeacon` 是 **credentialed 请求**，浏览器**拒绝**对这类请求使用
`access-control-allow-origin: *`。worker 上的 `/e` 一直返回通配符，所以
**游戏一旦跑在任何第三方门户上，所有事件都被 CORS 拦掉**——Playgama 的认证环境里
控制台刷满 `blocked by CORS policy`，D1 一行都收不到。而 console error 本身
又是各家门户的拒稿风险，所以这一个 bug 收了两次费。
- **不能用 allowlist**：Playgama 一家就分发到 100+ 伙伴域名，事先看不到。
  改为**回显请求自己的 Origin + allow-credentials**。
- **这个放宽只适用于 `/e`**：它只写不读、只接受白名单事件名、不返回任何数据，
  任何人本来就能 curl 它。**`/sub` 等接收邮箱、返回 JSON 的端点保持通配符,不许照抄。**
- 部署自检加了断言：预检必须回显门户 Origin 且带 allow-credentials，否则部署失败。
  沙箱打不到线上站，这条只能在 runner 上验。
- **通用教训**：游戏上第三方门户前，先问「我们的埋点在别人的域名下还发得出去吗」。
  itch 之所以有数据，只是因为 `itch.zone` 恰好没触发这个路径。

## Playgama 主目录 7/7 同模板拒稿 + 流量线 ① 达标(2026-09-22,到期结算)

- **`gridlings-playgama-five-0925` 提前 3 天判 lost**:MCP `list_applications` 显示 PROMPT / OVERFIT / MIMIC / OVERSEER /
  MINIMA 全部 REJECTED(09-15 18:57–19:17 UTC),五款的 `list_moderation_comments` 是**同一条模板**:AI 生成的游戏
  要先经 Playgama MCP 沙箱拿到真实表现数据,再由他们挑选进主目录。GHOSTLINE(09-14 13:02)与 SINGULARITY(09-14 13:39)
  也是同一句 —— **7/7 同文,主目录对本舰队的 AI 游戏关闭**。lose 动作生效:只经营 sandbox 面,**不再空手重投**;
  进主目录的唯一通道是平台按沙箱表现挑,不是我们再提交。09-08 那次「质量」拒稿的教训(第 1063 行)仍有效,但已不是主因。
- **`gridlings-playgama-traffic-0922` ① 达标、② 等 owner**:D1 现查 play_start 非 US 且 ref 含 games.playgama.net、ts≥09-15 14:53
  = **155**(阈值 150;全部 167,含 US 12)。**投放形状要记住**:09-15 76、09-16 87、09-17 2、09-19 2、之后 0 ——
  163/167 落在前 48 小时,而 MCP `get_sandbox_traffic` 说 run 仍 RUNNING、budget $2 只花了 16.8%、**09-22 14:53 UTC 结束**。
  所以「≥150」是免费 boost 头两天给的,不是持续流量;主目录 09-14/15 全拒与投放停摆同期。
  **owner 一件事**:run 结束后截一张 Overview(VISITS / PLAYS 60S,附日期)—— 这是 ② 的唯一读数;09-29 前没截图记 insufficient。
  win 动作里「回投主目录」已被上一条作废,剩下的只有「$20 付费轮」这个 owner 决策;lose 则游戏降为只维护。
- **版本冻结仍有效**:结算前不 `publish_sandbox` 新包(09-16 那个更快的归档仍未发)。② 结算之后再一次性做:发新包到 sandbox;
  「带数据重新提交主目录」这半句删掉,主目录不接受提交。

## 规则簇 zh 版:从台账第一条 won 长出来的扩张槽(2026-09-22,owner:「继续」)

- **依据**:`gridlings-rules-cluster-0921` 09-21 判 won(52 pv/28d ≥50),预登记的 win 动作就是「追加 zh 版与更多查询」;
  同日 D1 现查 zh 页占全站真人 pv **27%**(229/850,11 个 `/zh/*` 路径),所以 zh 面不是猜出来的受众。
  「更多查询」那半句**没做**:没有任何需求仪器给 gridlings 读数(站规「无需求触发器」),凭空造查询页正是防薄页门要拦的。
- **做法(生成器驱动,不手写页)**:`tools/geo_pages_zh.py` 按 EN slug 存 10 张页的中文数据(标题/答案胶囊/规则表/技巧/
  一手数据/FAQ),**数字与 EN 逐个相同**(450 每日题自 2026-08-24、320 畅玩、0.2% 星战接受率、43% 数织逐线可解),
  游戏名沿用 zh.html 既有词表(不等号·点点·三明治·摩天楼·星战·温度计·数织·迷你数独·日月·一笔画),Zip 一词全站禁用照旧。
  `gen_geo_pages.py` 改为 `build(p, lang)`:同一 slug 出 `<slug>.html` 与 `<slug>-zh.html`,两边互挂 hreflang(照游戏页的
  en/zh 成对写法),Article `inLanguage` 与 `url`、面包屑 item 按语种。**EN 页重生成后只多了 hreflang 两行与 JSON-LD 的 url,
  正文一字未动**(逐页 diff 过,连每日 #N 那句的「or browse the archive」都保持原样)。
- **接线**:worker `GEO_ZH` 集合(`/zh/<slug>` → `<slug>-zh.html`,`/zh/ai-games` 无孪生故意不在集合里,本地 6 例路由模拟全过);
  sitemap +10 条(45 → 55);9 张 zh 游戏页 modes 行补「规则与技巧」回链(与 EN 页同形);llms.txt 10 条规则页各加 Chinese 链接;
  部署自检路径表加 `/zh/star-battle-rules`(200 + 零重定向)。
- **判定线 `gridlings-rules-zh-1022`**(已进台账):上线后 28 天 10 张 zh 规则页 human pv ≥20 → 把 `/ai-games` 与
  `/nonogram-no-guessing` 也做 zh 版并在 zh.html 加入口;<10 停止 zh 扩张;10–19 insufficient 再看 28 天。
  阈值故意高于按比例的 ~14,免得 t0 附近就自我满足。**上线日 = PR #2 合并日,不是今天。**

## 判定线结算 2026-09-22(D1 现查;全文见根仓 `docs/fork-ledger-pricing-2026-09-22.md` §六)

- **`gridlings-rules-cluster-0921` → won(52 ≥ 50,边际 4%)**:十张规则页 28 天真人 pv 52(6x6 5 · binary 5 · futoshiki 6 ·
  games-like-linkedin-queens 7 · kropki 3 · nonogram 4 · sandwich 6 · skyscraper 5 · star-battle 6 · thermometer 5)。
  10 行来自 play.agiscorecard.com 站内导航,其余无 referrer 但分散在数小时内(不是秒级扫描)。**搜索/AI 引荐 0。**
  异常值:`/star-battle-rules` 28 天 bot 抓取 89 次(其余页 6–10),下次维护看一眼 ua_audit。
  win 分支「追加 zh 版与更多查询」**记为下一个扩张槽候选、本日未铺**:阈值另一半(Bing/GSC 前 20)只有 owner 能读,
  零搜索引荐的 won 不该直接长出第二批页。
- **`gridlings-playgama-traffic-0922`**:① 非 US `play_start` **155 ≥150**(全部落在 09-15 14:54 → 09-19 18:41,之后 0;
  投放 run `spentRatio` 0.148,09-22 14:53 UTC 结束)。② 等 owner 投放结束后的 VISITS / PLAYS 60S 截图(旧包那版;
  09-16 那张 17 小时读数 13/49 = 26,5%)。保持 open,09-29 前结算。
- 未到期只记:`gridlings-itch-0924` itch play_start 58 / solve 13(阈值 150 / 25);`gridlings-playgama-five-0925`
  五款全部 REJECTED(09-15),0/5,另有 TOWERS DRAFT。
