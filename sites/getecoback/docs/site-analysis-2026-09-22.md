# eco 深度全站分析 + 同类站对比(2026-09-22)

owner 指令(09-21):「先完善prompt再执行:eco深度全站分析,再对比同类网站,学习增强流量策略,并执行应用」。
三轮 prompt 收敛后的范围:①212 张页的属性 × D1 56 天真人流量,找出**什么预测流量**;②只对**实际抓到**的同类站做结构对比,搜索引擎与抓不到的站如实记 403;③应用 2–4 项有本站读数支撑的改动并预登记判定线。
所有站内数字 = D1 `ecoback-events` 现查(`ua_class IS NULL OR 'human'`,剔 `/__ci`),窗口 2026-07-28→09-22(56 天);爬虫数 = `ev.name='crawl'`(09-11 上线,09-11→09-22 共 12 天)。原始表已存会话 scratchpad(`page_attrs.json` / `d1_pv56.json` / `d1_aff56.json` / `d1_crawl28.json` / `joined.json`)。

## 0. 一句话

**本站最强的流量预测变量不是任何页面属性,而是页面的年龄——而年龄之所以起作用,是因为 9 月 10 日以后发布的 19 张页里,bingbot 12 天只抓过 1 张 1 次。** 根因在发现面:每次部署把 30–66 个**没变**的 URL 重提给 IndexNow(外加 12 个工具 URL 的整包重提),sitemap 又把十几张无日期页**日日标成今天**。本站 100% 的搜索流量来自 Bing 索引,这两个信号正是它唯一听得见的。本轮修的就是这两处。

## 一、212 页 × 56 天:什么预测流量

### 1.1 年龄压倒一切(全站 206 张内容页)

| 发布批次 | n | pv/页 | 搜索/页 | 有外部流量的页占比 | bingbot 抓取/页(12 天) | googlebot/页 |
|---|---|---|---|---|---|---|
| 7 月上旬 | 88 | 7,0 | 3,09 | 62 % | 5,5 | 2,3 |
| 7 月下旬 | 32 | 9,0 | 4,47 | 62 % | 6,0 | 1,2 |
| 8 月 1–27 | 19 | 2,7 | 0,42 | 26 % | 2,9 | 1,0 |
| 8-28→9-09 | 48 | 0,3 | 0,08 | 6 % | 1,8 | 1,1 |
| **9-10 之后** | **19** | **0,1** | **0,00** | **0 %** | **0,1** | 0,3 |

7 月发布的 120 张页产出 904 pv / 415 次搜索访问;8 月 28 日之后的 67 张页合计 14 pv / 4 次搜索。**任何不控制年龄的属性对比都是假的**,下面的属性表因此只用「德语 + 8-27 前发布」的 112 张页。

### 1.2 页型(DE,8-27 前,n=112)

| 页型 | n | pv/页 | 搜索/页 | 联盟点击/页 | 有外部流量 |
|---|---|---|---|---|---|
| **故障排查**(`-probleme/-kuehlt-nicht/-stinkt/-zu-laut/-tropft/-ausverkauft`) | 7 | **20,4** | **11,0** | 1,29 | 86 % |
| 带计算器的指南 | 74 | 6,5 | 3,30 | 0,82 | 55 % |
| 面积梯页(`-N-qm`) | 20 | 5,3 | 1,65 | **2,00** | 80 % |
| 问句标题 | 7 | 1,4 | 0,57 | 0,86 | 14 % |
| 评测(`-test`) | 2 | 1,5 | 0,00 | 0,00 | 0 % |

09-17 的「故障页 128 倍」在控制年龄后仍成立(n=7,每页搜索访问是计算器指南的 3,3 倍、梯页的 6,7 倍)。**梯页是钱页**(每页 2,0 次联盟点击,全站最高),故障页是流量页。

### 1.3 设备族(同一子集)

| 族 | n | pv/页 | 搜索/页 | 联盟/页 |
|---|---|---|---|---|
| 空调 | 60 | 9,2 | 4,23 | 1,57 |
| 储能 | 9 | 6,7 | 4,33 | 0,33 |
| 风扇 | 6 | 6,2 | 3,17 | 0,67 |
| 取暖 | 16 | 2,9 | 1,56 | 0,31 |
| 除湿 | 17 | 2,7 | 1,06 | 0,47 |

季节,不是页面:窗口 7-28→9-22 是制冷季尾。冬季两族的读数要到 11 月才有意义(判定线 `eco-dach-troubleshoot-1116` 等已在台账)。

### 1.4 页面属性(同一子集;只列有信号的)

| 属性 | 分组 | n | pv/页 | 搜索/页 | 联盟/页 | AI 引荐(合计) |
|---|---|---|---|---|---|---|
| 正文字数(剥掉注入块) | <1 200 | 86 | 6,1 | 2,31 | 1,08 | 16 |
| | **1 200–1 999** | 26 | 8,7 | **6,15** | 0,88 | 2 |
| 标题长度 | ≤55 | 61 | 5,2 | 2,43 | 0,54 | 2 |
| | **56–65** | 49 | 8,4 | 4,02 | **1,67** | 16 |
| 问句标题 | 否 | 66 | 7,4 | 3,48 | 1,30 | 15 |
| | 是 | 46 | 5,7 | 2,80 | 0,65 | 3 |
| 表格数 | 0 | 52 | 6,7 | 3,62 | 0,92 | 4 |
| | 1 | 55 | 6,7 | 3,00 | 1,16 | **14** |
| | 2+ | 5 | 6,8 | 1,20 | 0,80 | 0 |
| 可见 FAQ | 有 | 104 | 6,9 | 3,37 | 1,10 | 18 |
| | 无 | 8 | 4,1 | 1,12 | 0,25 | 0 |
| 站内入链页数 | ≤5 | 4 | 15,8 | 13,25 | 0,75 | 1 |
| | 6–15 | 38 | 6,4 | 3,71 | 0,76 | 5 |
| | 16+ | 70 | 6,4 | 2,36 | 1,20 | 12 |
| 正文外部引源(非 Amazon/GTM) | 0 | 89 | 6,2 | 3,09 | — | 11 |
| | 1 | 15 | 9,4 | 5,00 | — | 7 |
| | 2+ | 8 | 7,5 | 1,12 | — | 0 |

**读法(每条都带反例,别读成规律)**:
- **字数是最干净的正向信号**:1 200–1 999 词的页每页搜索访问是 <1 200 的 2,7 倍,而联盟点击反而略低——长页拿流量,短梯页拿钱,两者不是同一件事。2 000+ 词的 5 张页全是 9 月新页,读数 0,与字数无关。
- **56–65 字符的标题赢**,但它与 7 月的 CTR 改写高度重合(那批改写正好落在这个区间),是相关不是因果。**不动已有标题**(09-15 结论不变:Google 引荐 0,改给谁看?)。
- **表格与搜索无关、与 AI 引荐有关**:0 表和 1 表的搜索读数相同(3,62 vs 3,00),但 1 表的页拿到 14 次 AI 引荐,0 表只有 4 次——与 citation-growth 技能「表格是引用磁石」一致,样本小,只作方向。
- **站内入链不是杠杆**(第三次确认):入链最少的 4 张页流量最高(growatt、ueberwintern 在里面)。09-17 的 617 条横向内链没有让聚合口径动一下(69/30 → 68/31),照实记。
- **外部引源 1 条的页最好,2+ 的页最差**——8 张页的样本,不能当结论。它只说明「加 Quellen 节」不会是本轮的动作。

### 1.5 三条要记进口径的脏数据

- `/`:83 pv 里 **57 来自 US 且 76 无来源**;`midea-portasplit-ausverkauft-alternativen` 50 pv 里 **43 US 无来源**;`best-portable-air-conditioner-spain` 18 pv 里 14 US、6 天;`portable-ac-smells-musty` 11 pv 里 11 US、3 天。与 09-16「US 峰值在 UTC 01–04 点」同一形态:**定时扫描器,不是读者**。按 pv 排序的任何清单都要先剔它们。
- `fensterabdichtung-selber-bauen` 17 pv 里 16 来自站内(它是 sizer 的目标页),不是搜索。
- 联盟点击 > pv 的页(`klimaanlage-30-qm` 15 点击/15 pv、`italy` 15/12)是比价形状(一个读者连开四款),不是异常。

## 二、AI 面:首页被抓得最狠,一次引荐都没换来

28 天爬虫:`/` 被 openai 家族抓 **316 次**、perplexity 35、claude 30(全站第一,第二名只有 13);同窗 `/` 的 AI 引荐 = **0**。
56 天全站 AI 引荐 39 次,**全部落在深页**:`portable-ac-tilt-and-turn-windows` 16、`klimaanlage-kippfenster` 7、`europe-heatwave` 3、`balkonkraftwerk-ohne-bohren` 3、`ueberwintern` 2、`stinkt-schimmel` 2、`unterschied-klimaanlage-lueftungsanlage` 2。
→ 09-17 给首页加表格那条线(`eco-home-table-geo-1112`)结算时要看这条:**AI 助手把首页当成目录读,把深页当成答案引**。首页的 GEO 价值可能在于把爬虫导向深页,而不是自己被引用。本轮不动,只记。

## 三、爬虫覆盖:新页根本没进 Bing

| 发布批次 | n | bingbot 抓过 ≥1 次 | googlebot 抓过 | openai 家族抓过 | bingbot 次/页 |
|---|---|---|---|---|---|
| 8-28 前 | 139 | 88 % | 100 % | 63 页 | 5,3 |
| 8-28→9-09 | 48 | 73 % | 100 % | 29 页 | 1,8 |
| **9-10 之后** | **19** | **5 %(1 页 1 次)** | 21 % | 12 页 | **0,1** |

同期 bingbot 每天抓 30–125 次、30–100 个不同的**老**页(09-18→09-21 每天 100+)。**不是 Bing 不来,是 Bing 来了只抓老页。** 而 AI 爬虫(openai/perplexity/claude)在 19 张新页里碰过 18 张——它们读 llms.txt 与 .md 镜像,不靠 IndexNow。
googlebot 也一样偏老(19 张新页只碰 4 张),但 Google 引荐本来就是 0,这里不讨论它。

## 四、根因:两个发现面信号在自我稀释

### 4.1 IndexNow:每次部署重提 30–66 个没变的 URL

`deploy-getecoback.yml` 的 IndexNow 步把「pushed diff」与「`git status --porcelain site` 里被注入器改写的文件」并集后全部提交。实测:
- run 220(09-22 01:41,一个只删了一个占位文件的提交)提交了 **66 个 URL**,HTTP 200。
- 本地复现注入链:**30 个已跟踪文件**在每次构建后都与仓库不同(`link_household` 往 7 张指南页塞的 `EB_HOUSEHOLD_LINK`、`build_structure` 给 rechner/tools/strommess 等页加的 chrome、国家计算器重生成的分享按钮、`household.mjs` 的版本号重写),另有 15 个生成页未跟踪;runner 上 revenue-studio 构建成功,churn 更多,所以是 66。
- 另一个步骤「Notify verified localized tool URLs to IndexNow」**每次 push 整包提交 12 个工具 URL**,不看有没有变。
- 部署频率:09-17 十次成功部署、09-20 三次、09-21 两次、09-22 两次。**按 09-17 算,一天约 780 次 URL 提交,其中真正变了的不到十分之一。**
IndexNow 自己的 FAQ 写明重复提交未变 URL 会被视为噪音并降低后续提交的权重。这与「新页一条都不抓」是一致的形状。

### 4.2 sitemap:无日期页日日「今天」

`build_sitemap.py` 对没有 JSON-LD `dateModified` 的页回退到**文件 mtime**,而 CI 是全新 checkout,mtime = 部署时刻。线上 sitemap 09-22 有 **13 个 URL 的 lastmod = 2026-09-22**(tools、agents、creator-kit、for-agents……),它们与本地提交版本相比多出 16 个「9 月」日期。即每次部署都告诉 Bing「这十几页今天又改了」。

### 4.3 过程中的一次外部副作用(如实记)

验证密钥文件时我从沙箱对 `luftfeuchtigkeit-senken.html` 发了**一次** IndexNow GET 提交(HTTP 200)。密钥文件线上 200、text/plain、内容一致。舰队规矩是外部副作用只挂 schedule,这一次是诊断性的单条,记下不隐瞒,不再重复。

## 五、同类站对比(只写实际抓到的)

沙箱可达性先写清楚,免得下一轮再试:**Bing/DDG/Qwant/Ecosia/Startpage/Brave 全部不可用**(返回无关结果、202 空、403、429);`vergleich.org`、`luftentfeuchter.cc` 是 Cloudflare 质询页;`homeandsmart.de` 首页质询但 sitemap 可读;`testit.de` sitemap 410;`klimaanlage-test.net` 000;`klimaanlagen-guru.de` 与 `luftentfeuchter-berater.de` 的文章 URL 我猜错了(404),只拿到首页与 sitemap;`heizsparer.de` 文章 URL 同样 404。**没有任何同行流量或外链数字,不编。**

| 站 | 形态 | 页数(sitemap) | lastmod 节奏 | 单页结构(抓到的文章) | 与 eco 的差 |
|---|---|---|---|---|---|
| **temperaturheld.de** | 纯内容,目录式 URL(`/klimaanlage/wohnmobil/`) | 68 | **68 条全部 2026-09**,页面「Aktualisiert am 3. September 2026 ✔ Redaktionell geprüft」 | 1 043–1 100 词、1–2 表、6–8 条 FAQ、Article+FAQPage+Breadcrumb、**73 条内链/页**(巨型导航)、0 外链、抓到的三页 **0 个 Amazon 链接**、**没有 meta description** | 同样的判定页六件套;多的是 B2B/权威题(Krankenhaus、Pflegeheim、Hitzeaktionsplan、EG-Urteil、Förderung、Kältemittel) |
| **raumklimatest.de** | 产品页 ×~40 + 咨询页 ×15 | 66 | 31 条 2026-08、14 条 2026-02——真在更新 | keller 页 **2 257 词**、13 个 H2(含「Schnellcheck in 10 Minuten」)、17 图、**「Quellen」节 4 个外链**、3 个 Amazon 链;test-vergleich 枢纽 5 749 词、6 表、64 图、Product+AggregateOffer+Review、**具名作者 Person**、价格「Stand: 21.09.2026, 17:48」、transparenz 页 | 字数 1,6×、真实图片、具名作者、引源节;产品页形态本站已证伪(16 张 test 页 = 1 次访问),不抄 |
| **klimaanlagen-guru.de** | Wix 博客 + 型号测评 | 86 帖 + 33 页 | **每月 11–19 帖,4→9 月稳定** | 首页 LocalBusiness + PostalAddress(真实商家地址)、Person、VideoObject | 选题与 eco 几乎逐条重合(Fensterabdichtung、Abluftschlauch、BTU、Wohnmobil、Kippfenster、Dachgeschoss、Mietwohnung);差在**地址**与**节奏**——它每月发 15 篇,eco 是 7-10 一天 39 篇、8-28 一天 26 篇 |
| heizsparer.de | 供暖/热泵/补贴,线索型 | 200 帖 | 近几个月每月 1–3 帖 | 首页 258 条导航链、「Stand: 11. September 2026 · Grundlage ist …」带出处的日期行 | 不同商业模式;可学的只有「Stand + Grundlage」这种带出处的时效行 |
| luftentfeuchter-berater.de | 重联盟 | ? | post-sitemap 不可解析 | 首页 **33 个 Amazon 链接**、SiteNavigationElement | 比 eco 更重的货架 |
| homeandsmart.de | 大出版社 | 6 264(其中 348 在 eco 主题上) | — | 首页质询 | 体量差两个数量级 |

**同样的抽取器跑 eco 的对应页**:`klimaanlage-wohnmobil` 1 254 词(渲染后 2 055)/1 表/5 FAQ/48 内链/21 Amazon/1 真实外链(UBA);`mobile-klimaanlage-kuehlt-nicht` 1 410/0 表/5 FAQ/37/19/1;`fensterabdichtung-klimaanlage` 965 词;`luftentfeuchter-keller` 1 426/0 表/0 外链;`luftentfeuchter-ratgeber` 1 400/1 表/0 外链。
**全站 206 张页里 157 张正文没有一个非 Amazon 的外链,只有 1 张有「Quellen」H2。**

### 学什么、不学什么

| 同行做法 | 本站读数 | 裁定 |
|---|---|---|
| 1 000–2 300 词、Schnellcheck/Ursachen 分节 | 1 200–1 999 词的页搜索访问 2,7× | **学**:下一轮在**已有流量**的短页上加深(不是新页),候选见 §八 |
| 整站 lastmod 同月刷新(temperaturheld) | 本站相反的问题:无日期页被日日刷成今天 | **不学假新鲜**;本轮反向修正,lastmod 只说真话 |
| 具名作者 + Person schema + Quellen | 外链 1 条的页最好、2+ 最差(n=8) | **作者不做**(owner 身份永不入公开仓);Quellen 无读数,不做 |
| 每月 15 篇的稳定节奏 | 本站一天 26–39 篇,新页 0 抓取 | **节奏本身不是原因**——是提交噪音;先修噪音再看是否需要限速 |
| 真实商家地址(LocalBusiness) | 08-31 已判「断点在实体」 | 不可代做 |
| 巨型导航 73 内链/页 | 入链不是杠杆(三次) | 不学 |
| 产品页 ×40 + AggregateOffer | test 页 16 张 = 1 次访问 | 不学 |
| B2B/权威题拓宽 | 新页冷启动 0 | 不学,直到 §六 的线读出结果 |

## 六、本轮应用(已执行,全部在 `.github/workflows/deploy-getecoback.yml` 与 `tools/`)

1. **IndexNow 只提交真变化**。新增「部署前快照线上 sitemap」步;IndexNow 步改为:pushed diff 里的 HTML(按页面 canonical 映射)∪ 新出现在本次构建 sitemap 而不在部署前线上 sitemap 的 URL(不管哪个生成器造的)∪ 每日 schedule 那次的 `/`(rail 真的每天变)。注入器改写的文件**只报 warning,不提交**;没有基线时**宁可不提新 URL 也不洪泛**(新 URL >60 视为基线故障)。本地模拟:push 提 2/2、churn 26 只报不提;schedule 提 0;无基线提 0。
2. **工具 manifest ping 只在生成器变更时跑**(`tools/revenue-studio` / `tools/member-studio` 在本次 push 的 diff 里才执行)。
3. **sitemap lastmod 不再用 mtime**。`build_sitemap.py` 顺序:JSON-LD dateModified → 该文件最后一次 git 提交日(runner fetch-depth 0,精确)→ datePublished → 回退日;`/` 与 `/en/` 保持今天。自检覆盖四种来源。
4. **新闸门 `check_sitemap_lastmod.py`**:lastmod = 今天的 URL 必须是首页 / 未跟踪的生成页 / 今天有提交的文件,否则红;自检两个方向(mtime 泄漏、注入器盖 dateModified)各红一次。
5. **把注入链的产物提交进仓库**(30 个已跟踪文件:`EB_HOUSEHOLD_LINK`、chrome、国家计算器、`household.mjs` 版本号),让仓库状态 = 部署状态,churn warning 归零;生成页(workbench/members/_headers)照原设计不提交。

**本轮刻意没做**:不改任何标题(Google 0 引荐,Bing 口径无 CTR 数据)、不加 Quellen(无读数)、不建新页(19 张新页一张都没被抓,再建是往黑洞里投)、不动 `build_related`(内链不是杠杆)、不给首页再加 GEO 件(§二)。

## 七、判定线(已进 `data/fleet-bets.json`)

`eco-new-page-discovery-1020`(2026-10-20):D1 crawl 里 9-10 之后发布的 19 张页被 bingbot 抓过的页数 **≥12/19**(t0 = 1/19)且其中 ≥1 张拿到 ≥1 次搜索引荐(t0 = 0)。
赢 → 提交噪音确是原因之一,把同样的 delta 纪律移植到舰队其它带 IndexNow 步的站;输 → 是 Bing 对本域的抓取预算/权威问题,09-04 的新页冻结继续,Bing Webmaster 的抓取统计列为 owner 待办。

## 八、下一轮候选(按证据强度,不是按好听)

1. **加深已有流量的短页**(§1.4 字数信号 + §五同行字数):候选 = 有搜索流量、正文 <1 000 词、近 5 轮没动过的页——`was-bedeutet-btu`(764 词,19 次搜索)、`abluftschlauch-verlaengern`(759 词,10 次)、`wie-viel-btu-brauche-ich`(382 词,7 次)、`klimaanlage-zugluft-nackenschmerzen`(720 词,6 次)。每页只加能溯源的段落(算术、站内已发布数据、一手法条),不加「更多话」。
2. **等 10-20 的抓取读数**再决定要不要限速发页:如果新页开始被抓,「一天 26 篇」就不需要改;如果不被抓,才轮到节奏。
3. **首页 GEO 的角色**(§二):11-12 结算 `eco-home-table-geo-1112` 时按「爬虫导向深页」而不是「首页被引」读。
4. 外部引源、作者、地址:三条都没有本站读数或不可代做,不排队。

## 九、诚实边界

- 属性表是相关性,n 在 4–89 之间,季节与年龄是主导混杂变量;我只在控制年龄的子集上读,且每条都写了反例。
- 「IndexNow 噪音 → 新页不被抓」是形状一致的推断,不是证明;10-20 的判定线就是为它设的,输的写法已写死。
- 同行对比只有结构,没有流量;搜索引擎在沙箱全部不可用,所以「eco 在这些词上排第几」这一轮没有任何数据。
- 一次手动 IndexNow GET 提交见 §4.3。
