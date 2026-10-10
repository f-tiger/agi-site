# 舰队需求摘要 · 2026-10-10

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 7 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — zero request-shaped posts this week
- producthunt: ok, 30 条
- reddit_requests: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_vertical: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_wish: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- hn_ask: ok, 2 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 5 条
- 雷达快照日期:2026-10-09(1 天前)

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 403 text/html; charset=UTF-8 5670B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5792B
- yc_rfs: HTTP 200 text/html; charset=utf-8 104639B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 57898B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1329B
- lemmy_world_search: HTTP 200 application/json 14139B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑1 · ask_hn · When you code with AI, do you tell it how to manage state? — https://news.ycombinator.com/item?id=49945805
- ↑1 · ask_hn · What tools do you wish existed? — https://news.ycombinator.com/item?id=49937618
- ↑1 · softwarerecs · Tool or service that tracks deprecations and breaking changes per library version, with an API or feed — https://softwarerecs.stackexchange.com/questions/95656/tool-or-service-that-tracks-deprecations-and-breaking-changes-per-library-versio
- ↑1 · softwarerecs · Tool recommendation to sync/backup local File Server to SharePoint Online — https://softwarerecs.stackexchange.com/questions/95655/tool-recommendation-to-sync-backup-local-file-server-to-sharepoint-online
- ↑0 · softwarerecs · Software that converts pen hovering mode to pen contact/down down mode — https://softwarerecs.stackexchange.com/questions/95671/software-that-converts-pen-hovering-mode-to-pen-contact-down-down-mode
- ↑0 · softwarerecs · Is there an Android shell program which returns open windows titles in last focus sorting? — https://softwarerecs.stackexchange.com/questions/95668/is-there-an-android-shell-program-which-returns-open-windows-titles-in-last-focu
- ↑0 · softwarerecs · Using Google (or any other search engine) to search for PDFs with fixed page range — https://softwarerecs.stackexchange.com/questions/95654/using-google-or-any-other-search-engine-to-search-for-pdfs-with-fixed-page-ran
- ↑-2 · softwarerecs · Is there an Android shell program to switch to any open application according to some criteria? — https://softwarerecs.stackexchange.com/questions/95670/is-there-an-android-shell-program-to-switch-to-any-open-application-according-to
- ↑-2 · softwarerecs · Is there an app store from which applications can't be taken down by anybody, not even by myself? — https://softwarerecs.stackexchange.com/questions/95649/is-there-an-app-store-from-which-applications-cant-be-taken-down-by-anybody-no

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [3d] **artificial general intelligence** → artificial general intelligence (agi) (new), artificial general intelligence definition (new), artificial general intelligence examples (new), artificial general intelligence stocks (new)
- [3d] **agi timeline** → agi timeline 2026 (new)
- [2d] **13f filings** → 13f filings search (new), 13f filings of top investors (new), 13f filings dates (new), 13f filings whalewisdom (new)
- [2d] **ai stocks** → ai infrastructure stocks comeback (4700), joinem (3150), best time to visit maldives (2700), how to bake a cake (1200)
**创业雷达词表命中(PH/HN/Reddit)**
- OpenVids
- Cakie
- OpenPilot
- Gemini Agent for Google Cloud
- AgentSDR
- Busabase
- Refs
- Zernio
**autopilot 需求队列**:gaps **5** / covered 17 · heat: measured 2026-10-10 (5 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.583 · page=invest.html · q=ai infrastructure stocks comeback
- kind=value · match=0.533 · page=aschenbrenner-fund-collapse.html · q=jpmorgan ai stocks warning
- kind=value · match=0.583 · page=invest/warren-buffett.html · q=ai stocks to buy september
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 26, "q": "tool:portfolio_returns"}, {"n": 8, "q": "tool:verdicts"}, {"n": 6, "q": "tool:thesis_tracker"}, {"n": 6, "q": "tool:invest_positions"}, {"n": 6`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [6d] **deepseek** → deepseek v4 flash 0731 (106450), dsh deepseek (53150), dsh (52900), deepseek v4 pro 0813 (37600)
- [STALE] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [STALE] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [5d] **sora** → sora release date fortnite speculation (10400), when does sora come to fortnite (9050), is sora in fortnite (3700), when is sora coming to fortnite (3450)
- [4d] **gemini** → gemini 3.8 flash (7500), gemini 4 argon (4300), gemini 3.7 flash (3000), sergey brin google gemini ban (2350)
- [4d] **perplexity** → chatgpt claude perplexity financial advice (15800), best time to visit maldives (10000), top tourist attractions in paris (8800), cheapest flights to tokyo (8550)
- [6d] **cursor** → lurker (36950), openai ends cursor contract spacex (31100), grokbot (20550), cursor grok bot (17300)
- [5d] **claude code** → claude code pricing (new), claude code install (new), claude code download (new), claude code mods (new)
**创业雷达词表命中(PH/HN/Reddit)**
- Gemini Agent for Google Cloud
- Show HN: DocFlare AI – Open-source docs chatbot on Cloudflare's free tier
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [STALE] **portable air conditioner** → portable air conditioner pick up today (550), shop deals on portable air conditioner for home (500), vissani portable air conditioner reviews (350), walmart kissair portable air conditioner (350)
- [10d] **dehumidifier** → does a dehumidifier cool the air (250), can a dehumidifier make a room cooler (200), is dehumidifier water safe to drink (160), walmart dehumidifier in store (150)
- [7d] **klimaanlage** → midea portasplit mobile split klimaanlage inklusive (10700), bgh urteil klimaanlage (4700), tronic klimaanlage 9000 btu (2000), tabaksteuer (850)
- [6d] **schimmel entfernen** → (空)
- [5d] **infrarotheizung** → steinfeld infrarotheizung (50700), elektrische heizung (49150), infrarotheizung werkstatt (48000), könighaus infrarotheizung 600 watt (41850)
- [1d] **luftentfeuchter** → luftentfeuchter wohnmobil (21600), luftentfeuchter mit hepa filter (16450), elektrischer luftentfeuchter test (15100), meacodry arete one 12l (13850)
- [8d] **heizlüfter** → energiesparender heizlüfter (70600), heizlüfter oder infrarotheizung (67150), ewt heizlüfter (49100), aeg heizlüfter (35900)
- [4d] **kaffeevollautomat** → krups kaffeevollautomat intensity milk (15550), siemens kaffeevollautomat eq.6 plus s300 te653501de (11950), siemens te651509de eq.6 plus s100 kaffeevollautomat (11300), siemens eq.6 plus s700 te657m03de kaffeevollautomat (10550)
- [3d] **akku staubsauger** → ford puma (18200), ford (600), sky scanner (350), levoit akku staubsauger lvac 200 max (350)
- [2d] **matratze** → matratzen concord (new), matratze 140x200 (new), matratze 90x200 (new), matratze 180x200 (new)
- [10d] **condizionatore portatile** → eprice (10200), irradio belair vigo 9 (200), beko condizionatore portatile 12000 btu (130), beko bp 409 c (110)
- [9d] **deumidificatore** → il climatizzatore consuma di piu in modalita deumidificatore (8100), deumidificatore argo dry nature 11 (5800), miglior deumidificatore portatile silenzioso (4300), deumidificatore de longhi vecchio modello (3750)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **34** / covered 20 · heat: measured 2026-10-10 (25 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=steinfeld infrarotheizung
- kind=value · match=0.5 · page=guide/akku-heizluefter.html · q=ewt heizlüfter
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=marmony infrarotheizung
**第一方需求**:`{"zero_hits": []}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-09-15,25 天前,锚 heizlüfter)
| 词 | 峰值 | 峰值月 | 距峰值月 | 冬÷九月 | 标题覆盖页 | 状态 |
|---|---|---|---|---|---|---|
| luftfeuchtigkeit senken | 2.6 | 10 月 | 本月 | 0.95 | 1 | 已覆盖 1 页 |
| heizkosten sparen | 0.5 | 10 月 | 本月 | 0.34 | 0 | 量太小(峰值 <2.0) |
| kaffeevollautomat | 59.5 | 11 月 | 22 天 | 1.36 | 0 | 已裁定:站外(礼品季大词)(2026-09-15) |
| luftentfeuchter | 32.0 | 11 月 | 22 天 | 1.19 | 18 | 已覆盖 18 页 |
| heizlüfter | 29.4 | 11 月 | 22 天 | 0.89 | 5 | 已覆盖 5 页 |
| infrarotheizung | 29.2 | 11 月 | 22 天 | 0.71 | 9 | 已覆盖 9 页 |
| akku staubsauger | 26.5 | 11 月 | 22 天 | 1.32 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| saugroboter | 23.6 | 11 月 | 22 天 | 1.3 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| heizstrahler | 19.9 | 11 月 | 22 天 | 0.8 | 0 | 已裁定:扩到已排名页 heizluefter-stromverbrauch;独立页可进扩展队列,须先过 SERP 门(无测评,不点名型号)(2026-09-24) |
| fussbodenheizung | 16.1 | 11 月 | 22 天 | 1.24 | 0 | 已裁定:装修题,非联盟可买形态(2026-09-15) |
| heizung einstellen | 8.5 | 11 月 | 22 天 | 1.03 | 0 | 已裁定:红海(Utopia/ÖKO-TEST/heizung.de/heizsparer/MVV)(2026-08-05) |
| heizkörper thermostat | 6.0 | 11 月 | 22 天 | 1.09 | 1 | 已裁定:红海;租客角度已在 heizkosten-senken-als-mieter(2026-08-05) |
| fenster beschlagen | 5.6 | 11 月 | 22 天 | 1.94 | 2 | 已覆盖 2 页 |
| wandheizung | 4.5 | 11 月 | 22 天 | 1.04 | 0 | 已裁定:装修题(埋墙),非联盟可买形态(2026-09-24) |
| zugluft | 3.5 | 11 月 | 22 天 | 1.11 | 2 | 已覆盖 2 页 |
| fenster abdichten | 3.2 | 11 月 | 22 天 | 1.06 | 2 | 已覆盖 2 页 |
| saugwischer | 3.2 | 11 月 | 22 天 | 1.16 | 0 | 已裁定:Bodenpflege 判负(峰值 3,2 / 56 天 1 pv)(2026-09-15) |
| richtig heizen | 3.0 | 11 月 | 22 天 | 1.16 | 0 | **未覆盖 · 待过三门** |
| schimmel schlafzimmer | 2.4 | 11 月 | 22 天 | 4.84 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
| wäsche trocknen wohnung | 1.0 | 11 月 | 22 天 | 2.12 | 1 | 量太小(峰值 <2.0) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-10-04;blocked 1 · built 11 · gated 1 · queued 2 · rejected 9 · removed 1 · withdrawn 2;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
- `hygrometer-testen-salz` — Luftfeuchtigkeit richtig messen: wohin das Hygrometer gehört und wie du es mit Salz prüfst · 待办:SERP done 2026-09-27 on 'luftfeuchtigkeit messen' (writable with the coldest-wall angle). Remaining gap: cite the ~75 % saturated-salt figure from a primary or 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Black Friday 2026-11-27(48 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

## buysomething
**Trends rising(逐 seed 时效)**
- [STALE] **electric spin scrubber** → ykyi electric spin scrubber (250), voweek electric spin scrubber (200), homitt electric spin scrubber (90), best electric spin scrubber (50)
- [STALE] **portable carpet cleaner** → bissell little green multi-purpose portable carpet cleaner, 1400b (1400), best portable carpet cleaner (170), best carpet cleaner (170)
- [STALE] **flip straw water bottle** → brumate era flip (218350), frank green water bottle (98750), brumate water bottle (550), hydroflask water bottle (400)
- [STALE] **heatless curls** → kitch (32600), how to use heatless curlers (24500), sleepy tie hair (13800), heatless curl headband (13050)
- [STALE] **high speed hair dryer** → conair infiniti pro hair dryer (300)
- [10d] **mini massage gun** → mini massage gun nearby (new), mini massage gun amazon (new), mini massage gun near me (new), mini massage gun for travel (new)
- [9d] **leg compression boots** → therabody leg compression (200), costco compression boots (200), best leg compression boots (80)
- [8d] **solar camping lights** → solar powered camping lights (50)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **2** / covered 0 · heat: measured 2026-10-10 (0 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.0 · page=None · q=costco compression boots
- kind=value · match=0.5 · page=sourcing-margins.html · q=costco vegetable chopper
**第一方需求**:`{"picks": {}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- Playground by Google Labs
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [1d] **labubu** → lets try the viral crumbl labubu (17850), savannah guthrie (8700), stonehenge (7950), labubu halloween costume (1850)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [STALE] **pdf accessibility** → how to bake a cake (1300), best time to visit maldives (1250), cheapest flights to tokyo (900), best laptop for work (850)
- [STALE] **pdf remediation** → (空)
- [STALE] **compare pdf** → cheapest flights to tokyo (9100), compare and contrast essay examples pdf (1500), how to bake a cake (1450), how to make sushi (600)
- [1d] **jellycat** → gargoyle jellycat (2800), jellycat bizzlestomp bear (2050), jellycat gargoyle (1900), halloween jellycat 2026 (1150)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **5** / covered 2 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.333 · page=index.html · q=lets try the viral crumbl labubu
- kind=value · match=0.333 · page=index.html · q=labubu halloween costume
- kind=value · match=0.5 · page=index.html · q=labubu costume for kids

## goldrush
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## gamesledger
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:该站未纳入 autopilot

## 机会撮合(reddit 请求 × Trends rising × PH/HN 供给;data/autopilot/opportunities.json)
- 候选 9 · 趋势主题重合 0 · 重现 0 · 已有人做 0(生成 2026-10-09;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- 旧字段 demand-confirmed 仅指与 Google Trends 的主题重合，不代表客户确认、独立买家数或付费意愿；以下候选仍须读取原帖和核验客户行动。
- [scout] what tools do you wish existed · 1 天 · 站 -
- [scout] when you code with ai do you tell it how to manage state · 1 天 · 站 -
- [scout] is there an android shell program which returns open windows titles in last focu · 1 天 · 站 -
- [scout] tool or service that tracks deprecations and breaking changes per library versio · 1 天 · 站 -
- [scout] tool recommendation to sync backup local file server to sharepoint online · 1 天 · 站 -
- [scout] is there an app store from which applications can t be taken down by anybody not · 1 天 · 站 -
- [scout] software that converts pen hovering mode to pen contact down down mode · 1 天 · 站 -
- [scout] using google or any other search engine to search for pdfs with fixed page range · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **35** 次 / 真人 pv 54657,剔除已标记噪音站 3781(快照 2026-10-09;09-12 手测基线 69)
- 其中 claude.ai **4** 次(可能含舰队自己在 claude.ai/code 里的点击,分不开所以不剔除;不含它是 31 次。判定线照旧读合计)
- baipiaoji: 13 / 487 pv · chatgpt.com 6, www.perplexity.ai 5, copilot.microsoft.com 2
- agiscorecard: 12 / 48052 pv · kagi.com 4, claude.ai 4, www.perplexity.ai 2, chatgpt.com 2 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- getecoback: 7 / 744 pv · www.perplexity.ai 4, chatgpt.com 2, kagi.com 1
- gamesledger: 2 / 550 pv · kagi.com 1, copilot.microsoft.com 1
- thedollscout: 1 / 594 pv · chatgpt.com 1
- goldrush: 0 / 252 pv · —
- gridlings: 0 / 921 pv · —
- buysomething: 0 / 233 pv · —
- after35: 0 / 644 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 381 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 366 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 341 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 565 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 527 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-10-09,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 12/457 = 2.6% · baipiaoji 15/487 = 3.1% · getecoback 7/255 = 2.7% · gamesledger 2/41 = 4.9%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-10-09):search 1325 · ai 37 · fleet 57 · social 6 · self 6325 · direct 46876 · other 31
- baipiaoji: 搜索 465 / AI 15 / 舰队内 0 / 社交 0 / 直接 0 · Google 176 · 前三 cn.bing.com 220, google.com 176, bing.com 39
- agiscorecard: 搜索 397 / AI 12 / 舰队内 28 / 社交 2 / 直接 42059 · Google 268 · 前三 google.com 263, duckduckgo.com 56, bing.com 45
- getecoback: 搜索 246 / AI 7 / 舰队内 0 / 社交 1 / 直接 355 · Google 2 · 前三 bing.com 98, duckduckgo.com 97, ecosia.org 19
- gridlings: 搜索 125 / AI 0 / 舰队内 7 / 社交 0 / 直接 535 · Google 94 · 前三 google.com 94, cn.bing.com 25, bing.com 3
- gamesledger: 搜索 31 / AI 2 / 舰队内 6 / 社交 2 / 直接 414 · Google 21 · 前三 google.com 21, duckduckgo.com 4, cn.bing.com 4
- goldrush: 搜索 17 / AI 0 / 舰队内 8 / 社交 0 / 直接 213 · Google 17 · 前三 google.com 17
- buysomething: 搜索 14 / AI 0 / 舰队内 0 / 社交 0 / 直接 198 · Google 14 · 前三 google.com 14
- codeword: 搜索 10 / AI 0 / 舰队内 4 / 社交 1 / 直接 536 · Google 9 · 前三 google.com 9, baidu.com 1
- powerbill: 搜索 9 / AI 0 / 舰队内 4 / 社交 0 / 直接 512 · Google 7 · 前三 google.com 7, baidu.com 1, duckduckgo.com 1
- thedollscout: 搜索 8 / AI 1 / 舰队内 0 / 社交 0 / 直接 361 · Google 5 · 前三 google.com 5, bing.com 2, yandex.com.tr 1
- fanzha: 搜索 2 / AI 0 / 舰队内 0 / 社交 0 / 直接 356 · Google 1 · 前三 google.com 1, duckduckgo.com 1
- after35: 搜索 1 / AI 0 / 舰队内 0 / 社交 0 / 直接 633 · Google 0 · 前三 baidu.com 1
- learn: 搜索 0 / AI 0 / 舰队内 0 / 社交 0 / 直接 375 · Google 0 · 前三 —
- firstjob: 搜索 0 / AI 0 / 舰队内 0 / 社交 0 / 直接 329 · Google 0 · 前三 —
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-10-09
- getecoback: 联盟点击 82 / 付费订单 0 / 订阅 1 · us-market 0 · amazon.com 3 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 2 · invest_tool_click 1 · /advertise pv 165 · /audits pv 83 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 154 · 厂商 biz 40 · 投稿累计 18 · watches 0 (endpoint)
- thedollscout: 联盟点击 2 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 191 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-10-09):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 2 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
