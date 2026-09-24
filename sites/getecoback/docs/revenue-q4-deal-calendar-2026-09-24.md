# eco 营收:第一条不靠商品成交的 Amazon 收入,和第四季度的日历(2026-09-24)

owner 原话:「eco如何突破商业营收？设计方案并上线」。

## 一、Prompt(第 3 轮)

- **目标**:在「只走 Amazon」的规矩里,找到一条不依赖「读者这周正好要买一台设备」的收入,当天上线;把第四季度的购物日历变成站上的机制,而不是某个会话记得去做的事。
- **范围**:getecoback 德语页。先量钱线(D1 八周 + PartnerNet 最新截图),再只做量出来的那一件。
- **不做**:非 Amazon 联盟(09-05 已定:只请示、不写代码)、常年挂 Prime 广告、没有官方接口的价格、替 Amazon 预测活动日期、新页。
- **验收**:横幅在活动窗外逐字节不出现、窗内只对 DE/AT 读者出现、每次点击恰好一条 `bounty_click`;闸门和部署后检查能红;判定线进台账。

前两轮改掉的:第 1 轮是「再加钩子 / 再开渠道」,第 2 轮对照手册发现钩子、非 Amazon、新子站都已判过,剩下没做的只有 09-05 预登记的 Prime 试用 bounty;第 3 轮又查出 PA-API 已经停用,所以「价格层」不能再列成 owner 待办。

## 二、量到了什么

D1(真人,剔 CI):

| 周起 | 浏览 | 联盟点击 | 其中 /dp/ |
|---|---|---|---|
| 08-05 | 115 | 18 | 0 |
| 08-10 | 205 | 48 | 0 |
| 08-17 | 172 | 19 | 0 |
| 08-24 | 157 | 21 | 1 |
| 08-31 | 128 | 19 | 4 |
| 09-07 | 111 | 13 | 1 |
| 09-14 | 118 | 13 | 2 |
| 09-21(4 天) | 128 | 21 | 2 |

PartnerNet(owner 截图):8 月 30 天窗 €10,26 / 121 点击 = **€0,085 每点击**;**01.–14.09. 是 €1,61 / 56 点击 = €0,03 每点击**,两件。

读法:点击没少多少,**每次点击值的钱掉到三分之一**。9 月的点击大半还在夏季空调页和窗封配件上(近 14 天明细:EX105、Kippfenster 面板、XPS 板),读者在做研究,不在下单;冬季货架(Schmidbauer、Midea NTH20、除湿机)开始有点击,但季节还没到。这一站的全部收入都绑在「读者这周正好要买」上。

## 三、Amazon 里不绑商品成交的那一笔

PartnerNet 的 Prime 页写着:**「3 EUR für jeden vermittelten Prime Gratiszeitraum」**,链接是 `https://www.amazon.de/primegratistesten?tag=…`([partnernet.amazon.de/promotion/prime](https://partnernet.amazon.de/promotion/prime),2026-09-24 读)。Prime Day FAQ 另写:只推一个服务时,推 Prime 免费试用最合适。

按 9 月的 €0,03 每点击,**一笔 Prime 试用 ≈ 100 次商品点击**;它不要求读者买任何设备,所以对 9 月这种「来研究、不下单」的读者也成立。

**诚实的边界**:读者只有在某件事「只给 Prime 会员」时,才有自己的理由想要 Prime。**Prime Deal Days 2026 是 10 月 6 日 00:01 起 48 小时,到 10 月 7 日,「exklusiv für Prime-Mitglieder」**([aboutamazon.de](https://www.aboutamazon.de/news/amazon-prime-und-shopping/prime-deal-days-termine-angebote),2026-09-24 读;有 deal 博客写成 7./8.,以 Amazon 自己的页面为准)。所以试用链接只跟 Prime 专属活动走,不常年挂。

## 四、上线的东西

- **`data/deal-calendar.json`**:活动日期、Amazon 原话、来源 URL、读取日期。只有 `announced: true` 且有来源的活动会出横幅;**Black Friday 已写入但 `announced: false`**:11 月 27 日是日历事实,但 Amazon 还没公告 2026 年的 Black-Friday-Woche(deal 博客只有预测),填好公告前一个字不出。
- **`tools/build_deals.py` → `EB_DEALS`**:放在货架条(`EB_TOPPICK`)后面,首页 + 144 张有货架的德语指南页。内容三到四行:
  1. 「Prime Deal Days am 6. und 7. Oktober, laut Amazon nur für Prime-Mitglieder.」
  2. 按货架族一句本站已有的话:除湿页「Hygrometer schon über 70 %? Dann nicht auf den Rabatt warten」,取暖页「Ein Rabatt macht kein Heizgerät sparsamer」。
  3. 「Echter Rabatt?」:§ 11 Abs. 1 PAngV 要求每次公布降价都同时给出 30 天内最低价([原文](https://www.gesetze-im-internet.de/pangv_2022/__11.html),2026-09-24 读),所以读者该拿那个价比,不是拿划掉的价比。
  4. 「Kein Prime? Prime gratis testen →」+ 标签「Anzeige · Amazon zahlt uns eine Prämie für den Gratiszeitraum. Ab wann Prime kostet und wie du kündigst, steht auf der Amazon-Seite.」
- **规矩**:默认 `hidden`,只对 `Europe/Berlin | Vienna | Busingen` 时区显示(amazon.de 的 Prime 是德奥读者的);过了活动结束当天午夜(柏林时间)浏览器端自己隐藏;窗口外构建时整块删掉;不带 `<h2>`(目录不随日期变);横幅里没有任何商品链接、没有价格。
- **来源只写字不加链**:`aboutamazon.de` 含「amazon.」,本站每个页面追踪器都会把点它记成联盟点击。
- **追踪**:点击试用链接发 `bounty_click`(worker 白名单已加);页面追踪器同时照常记一条 `affiliate_click`,其 link_url 含 `primegratistesten`。**以后读商品点击,一律剔 `link_url LIKE '%primegratistesten%'`。**
- **闸门 `tools/check_deals.py`**(部署链里,11 个自检用例):来源、原话、日期文字齐全;`show_from` 最多提前 14 天(再早就成了常年 Prime 广告);bounty 链接必须是带我们 tag 的那一条;构建产物里活动在窗内时每张货架页都有横幅、窗外一张都没有;横幅必须 `hidden`;非 Prime 活动不许带试用链接;英语/意大利语页不许有。**部署后检查**按当天柏林日期从日历算出「该不该有」,再去线上首页和一张除湿页核对,带边缘缓存重试。
- **开关不用人**:eco 每天 03:17 UTC 定时部署。09-29 那次构建横幅出现,10-08 那次消失。
- **每日摘要**的 getecoback 节新增「Deal-Kalender」:显示下一个活动,以及 Black Friday 还缺 Amazon 公告。

## 五、验证

- `build_deals.py` 17 个自检、`check_deals.py` 11 个自检全过。
- 按 09-30 模拟构建:144 页带横幅(除湿 31、取暖 23、其他 90),`check_deals` / `check_adlabel`(995 个广告块全带标识)/ `check_events` / `check_brand_veto` / `check_usswitch` / `check_faq_parity` 全绿;模拟撤掉后工作树 0 改动。
- Chromium 390 px、六个场景:柏林 09-30 除湿页、维也纳 10-06 取暖页、柏林 09-30 首页 → 显示(245–308 px),各点一次恰好 1 条 `bounty_click` + 1 条带 `primegratistesten` 的 `affiliate_click`;纽约、苏黎世、柏林 10-08 → 不显示。全部单 h1、零横滚、零报错。

## 六、顺带查出的:PA-API 已经停用

Creators API 的弃用说明写明 PA-API 5.0 已弃用,调用回 **HTTP 403**([来源](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation));第三方汇总的日期是 2026-04-30 弃用、05-15 下线。**09-12 建的价格引擎(`tools/product_intel/`,SigV4 客户端)调的就是这个接口**,手册里写给 owner 的「申请 PA-API 密钥三步」已经没有意义。接替它的 Creators API 支持德国,但门槛是 **近 30 天 ≥10 笔合格成交**([介绍页](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction));eco 最近一期是两件。README、手册、Playbook 都已标注;`PAAPI_ENABLED` 保持不设,那条线零副作用。

**所以「价格 / Deals 层」的前提从「owner 去申请」变成「先卖到 30 天 10 单」**:这是 Q4 要赢的一个具体数字。

## 七、按「每分钟能换多少钱」排的 owner 动作

| # | 动作 | 分钟 | 换来什么 |
|---|---|---|---|
| 1 | PartnerNet 付款 / 税务信息 | ~2 | 已经累计的佣金(最新截图 €11,20/30 天)才会真正到账 |
| 2 | 打开 EX105 的商品页确认 ASIN | ~3 | `/dp/` 占比 14,5 % → 约 31 %(28 天 14 次点击落在它的搜索页上) |
| 3 | 下次 PartnerNet 截图多截一张「Prämien」 | ~1 | `eco-prime-bounty-1027` 只能靠它结算 |
| 4 | (决策,不是动作)Check24 Stromwechsel 等非 Amazon 联盟 | — | 09-05 已写:只请示,不写代码;owner 答 no 就永久归档 |

## 八、判定线

- **`eco-prime-bounty-1027`**:PartnerNet 10 月出现 ≥1 笔 Prime 试用 Prämie(€3,近乎 9 月上半月全部佣金的两倍)→ 保留机制,2027 年 Prime Day 公告后照填;`bounty_click` ≥5 而 0 笔 → 以后只留日期和 § 11 那两行、撤掉试用链接;`bounty_click` <5 或没有截图 → insufficient。
- **`fleet-bounty-line-0929`** 结算为已执行(见台账 reading)。
- **`fleet-decoupling-1205`** 加了今天的读数。

## 九、没做的

- 没把 Prime 试用挂成常年一行:没有 Prime 专属的理由时,它就只是广告。
- 没推 Audible、Music Unlimited、Kids+、Prime Video Channels 的试用(同样 3 EUR):和取暖、潮湿的读者没有关系。
- 没替 Amazon 填 Black Friday 周的日期:等 aboutamazon.de 公告,每日摘要会提醒。
- 没写任何非 Amazon 代码。
- 没给横幅加价格:没有官方接口就没有价格。
