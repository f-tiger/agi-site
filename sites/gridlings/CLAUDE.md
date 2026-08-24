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
3. [ ] +2 周:CrazyGames 投稿(开放制,2-4 周审核,€100 起付月结);
   GamePix 跟投
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
