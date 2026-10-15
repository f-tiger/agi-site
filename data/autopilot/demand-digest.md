# 舰队需求摘要 · 2026-10-15

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 6 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: ok, 1 条
- producthunt: ok, 30 条
- reddit_requests: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_vertical: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_wish: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- hn_ask: ok, 5 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 5 条
- 雷达快照日期:2026-10-14(1 天前)

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 403 text/html; charset=UTF-8 5659B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5759B
- yc_rfs: HTTP 200 text/html; charset=utf-8 105822B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 64908B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1380B
- lemmy_world_search: HTTP 200 application/json 4212B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑9 · ask_hn · Locked out of Google despite knowing password and having email access — https://news.ycombinator.com/item?id=50037004
- ↑8 · ask_hn · Fake abuse reports keep auto-blocking my site on Cloudflare — https://news.ycombinator.com/item?id=50036565
- ↑7 · lemmy:android · Is there a way to manage the type of network access per app, for Pixel on GrapheneOS? — https://lemmy.world/post/53102816
- ↑2 · ask_hn · Any solution for bookmarks on various services? — https://news.ycombinator.com/item?id=50019532
- ↑2 · ask_hn · Recommend Phones for Elderly? — https://news.ycombinator.com/item?id=50060197
- ↑1 · ask_hn · Need Email Deliverability Expert — https://news.ycombinator.com/item?id=50080095
- ↑0 · softwarerecs · Web push notifications server — https://softwarerecs.stackexchange.com/questions/95677/web-push-notifications-server
- ↑0 · softwarerecs · Software that converts pen hovering mode to pen contact/down down mode — https://softwarerecs.stackexchange.com/questions/95671/software-that-converts-pen-hovering-mode-to-pen-contact-down-down-mode
- ↑0 · softwarerecs · Is there an Android shell program which returns open windows titles in last focus sorting? — https://softwarerecs.stackexchange.com/questions/95668/is-there-an-android-shell-program-which-returns-open-windows-titles-in-last-focu
- ↑-1 · softwarerecs · Open-source tool to auto-generate API regression tests from real traffic (Linux, CI-friendly) — https://softwarerecs.stackexchange.com/questions/95686/open-source-tool-to-auto-generate-api-regression-tests-from-real-traffic-linux

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [8d] **artificial general intelligence** → artificial general intelligence (agi) (new), artificial general intelligence definition (new), artificial general intelligence examples (new), artificial general intelligence stocks (new)
- [8d] **agi timeline** → agi timeline 2026 (new)
- [7d] **13f filings** → 13f filings search (new), 13f filings of top investors (new), 13f filings dates (new), 13f filings whalewisdom (new)
- [7d] **ai stocks** → ai infrastructure stocks comeback (4700), joinem (3150), best time to visit maldives (2700), how to bake a cake (1200)
**创业雷达词表命中(PH/HN/Reddit)**
- Gemini 4 Argon
- Acyclic
- Elocuenti
- Make0 Brain
- Retriever AI
- Tiden
- Hindsight 1.0 + Memlake
- Exodus for Google Cloud Run
**autopilot 需求队列**:gaps **5** / covered 17 · heat: measured 2026-10-15 (0 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.583 · page=invest.html · q=ai infrastructure stocks comeback
- kind=value · match=0.533 · page=aschenbrenner-fund-collapse.html · q=jpmorgan ai stocks warning
- kind=value · match=0.583 · page=invest/warren-buffett.html · q=ai stocks to buy september
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 19, "q": "tool:portfolio_returns"}, {"n": 6, "q": "tool:thesis_tracker"}, {"n": 6, "q": "tool:sunwatch_ledger"}, {"n": 6, "q": "tool:agi_consensus BrickB`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [STALE] **deepseek** → deepseek v4 flash 0731 (106450), dsh deepseek (53150), dsh (52900), deepseek v4 pro 0813 (37600)
- [STALE] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [STALE] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [10d] **sora** → sora release date fortnite speculation (10400), when does sora come to fortnite (9050), is sora in fortnite (3700), when is sora coming to fortnite (3450)
- [9d] **gemini** → gemini 3.8 flash (7500), gemini 4 argon (4300), gemini 3.7 flash (3000), sergey brin google gemini ban (2350)
- [9d] **perplexity** → chatgpt claude perplexity financial advice (15800), best time to visit maldives (10000), top tourist attractions in paris (8800), cheapest flights to tokyo (8550)
- [STALE] **cursor** → lurker (36950), openai ends cursor contract spacex (31100), grokbot (20550), cursor grok bot (17300)
- [10d] **claude code** → claude code pricing (new), claude code install (new), claude code download (new), claude code mods (new)
**创业雷达词表命中(PH/HN/Reddit)**
- Gemini 4 Argon
- Show HN: Spotatui, a Spotify TUI/GUI without web API rate limits
- Gemini 4 Argon
- Gemini 4 Argon for Robotics
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [5d] **portable air conditioner** → orvyla portable air conditioner (1200), portable air conditioner pick up today (450), midea 12 000 btu duo smart inverter portable air conditioner (350), shop deals on portable air conditioner for room (300)
- [4d] **dehumidifier** → does a dehumidifier cool the air (300), homedepot dehumidifier (140), can you drink water from a dehumidifier (130), what does a humidifier do (120)
- [3d] **klimaanlage** → midea portasplit mobile split klimaanlage inklusive (12900), bgh urteil klimaanlage (5100), constantin schreiber axel springer (3550), tabaksteuer (2800)
- [2d] **schimmel entfernen** → schimmel entfernen wand (new), schimmel entfernen hausmittel (new), schimmel entfernen bad fugen (new), schimmel entfernen dusche (new)
- [1d] **infrarotheizung** → thermostat für infrarotheizung (100900), infrarot heizkörper (56300), infrarotheizung hornbach (55350), ölradiator (55200)
- [5d] **luftentfeuchter** → avreno (31300), luftentfeuchter wohnwagen (24600), pingi luftentfeuchter (21150), luftentfeuchter keller dauerbetrieb (17450)
- [4d] **heizlüfter** → heizlüfter test (new), heizlüfter bad (new), heizlüfter media markt (new), heizlüfter camping (new)
- [1d] **kaffeevollautomat** → siemens kaffeevollautomat eq.6 plus s400 te654509de (20600), krups kaffeevollautomat intensity milk (14550), siemens te651509de eq.6 plus s100 kaffeevollautomat (11000), siemens eq.6 plus s700 te657m03de kaffeevollautomat (10600)
- [8d] **akku staubsauger** → ford puma (18200), ford (600), sky scanner (350), levoit akku staubsauger lvac 200 max (350)
- [7d] **matratze** → matratzen concord (new), matratze 140x200 (new), matratze 90x200 (new), matratze 180x200 (new)
- [4d] **condizionatore portatile** → pinguino aria condizionata (700), ventilatore a colonna (190), trotec condizionatore portatile (120), beko bp 409 c (100)
- [3d] **deumidificatore** → deumidificatore casa (new), deumidificatore portatile (new), deumidificatore dyson (new), deumidificatore in inglese (new)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **33** / covered 25 · heat: measured 2026-10-15 (22 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=infrarotheizung hornbach
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=infrarotheizung wintergarten
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=toom infrarotheizung
**第一方需求**:`{"zero_hits": []}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-10-13,2 天前,锚 heizlüfter)
| 词 | 峰值 | 峰值月 | 距峰值月 | 冬÷九月 | 标题覆盖页 | 状态 |
|---|---|---|---|---|---|---|
| wandheizung | 4.3 | 10 月 | 本月 | 0.96 | 0 | 已裁定:装修题(埋墙),非联盟可买形态(2026-09-24) |
| luftfeuchtigkeit senken | 2.3 | 10 月 | 本月 | 1.04 | 1 | 已覆盖 1 页 |
| heizkosten sparen | 0.9 | 10 月 | 本月 | 0.37 | 0 | 量太小(峰值 <2.0) |
| kaffeevollautomat | 146.6 | 11 月 | 17 天 | 1.41 | 0 | 已裁定:站外(礼品季大词)(2026-09-15) |
| saugroboter | 57.8 | 11 月 | 17 天 | 1.23 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| akku staubsauger | 55.1 | 11 月 | 17 天 | 1.31 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| luftentfeuchter | 31.9 | 11 月 | 17 天 | 1.2 | 18 | 已覆盖 18 页 |
| heizlüfter | 27.1 | 11 月 | 17 天 | 0.83 | 5 | 已覆盖 5 页 |
| heizstrahler | 18.7 | 11 月 | 17 天 | 0.86 | 0 | 已裁定:扩到已排名页 heizluefter-stromverbrauch;独立页可进扩展队列,须先过 SERP 门(无测评,不点名型号)(2026-09-24) |
| fussbodenheizung | 15.0 | 11 月 | 17 天 | 1.18 | 0 | 已裁定:装修题,非联盟可买形态(2026-09-15) |
| heizung einstellen | 8.1 | 11 月 | 17 天 | 1.0 | 0 | 已裁定:红海(Utopia/ÖKO-TEST/heizung.de/heizsparer/MVV)(2026-08-05) |
| saugwischer | 8.0 | 11 月 | 17 天 | 1.38 | 0 | 已裁定:Bodenpflege 判负(峰值 3,2 / 56 天 1 pv)(2026-09-15) |
| heizkörper thermostat | 5.8 | 11 月 | 17 天 | 1.01 | 1 | 已裁定:红海;租客角度已在 heizkosten-senken-als-mieter(2026-08-05) |
| fenster beschlagen | 5.3 | 11 月 | 17 天 | 1.92 | 2 | 已覆盖 2 页 |
| zugluft | 3.2 | 11 月 | 17 天 | 1.14 | 2 | 已覆盖 2 页 |
| richtig heizen | 2.8 | 11 月 | 17 天 | 1.12 | 0 | **未覆盖 · 待过三门** |
| wäsche trocknen wohnung | 0.9 | 11 月 | 17 天 | 2.14 | 1 | 量太小(峰值 <2.0) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-10-04;blocked 1 · built 11 · gated 1 · queued 2 · rejected 9 · removed 1 · withdrawn 2;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
- `hygrometer-testen-salz` — Luftfeuchtigkeit richtig messen: wohin das Hygrometer gehört und wie du es mit Salz prüfst · 待办:SERP done 2026-09-27 on 'luftfeuchtigkeit messen' (writable with the coldest-wall angle). Remaining gap: cite the ~75 % saturated-salt figure from a primary or 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Black Friday 2026-11-27(43 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

## buysomething
**Trends rising(逐 seed 时效)**
- [STALE] **electric spin scrubber** → ykyi electric spin scrubber (250), voweek electric spin scrubber (200), homitt electric spin scrubber (90), best electric spin scrubber (50)
- [STALE] **portable carpet cleaner** → bissell little green multi-purpose portable carpet cleaner, 1400b (1400), best portable carpet cleaner (170), best carpet cleaner (170)
- [STALE] **flip straw water bottle** → brumate era flip (218350), frank green water bottle (98750), brumate water bottle (550), hydroflask water bottle (400)
- [STALE] **heatless curls** → kitch (32600), how to use heatless curlers (24500), sleepy tie hair (13800), heatless curl headband (13050)
- [STALE] **high speed hair dryer** → conair infiniti pro hair dryer (300)
- [STALE] **mini massage gun** → mini massage gun nearby (new), mini massage gun amazon (new), mini massage gun near me (new), mini massage gun for travel (new)
- [STALE] **leg compression boots** → therabody leg compression (200), costco compression boots (200), best leg compression boots (80)
- [STALE] **solar camping lights** → solar powered camping lights (50)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **2** / covered 0 · heat: measured 2026-10-15 (0 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=sourcing-margins.html · q=costco vegetable chopper
- kind=value · match=0.5 · page=index.html · q=refrigerator cost
**第一方需求**:`{"picks": {"led-mask": {"open": 1, "out": 0}}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- Show HN: Wonderhop – A daily game: guess what most people say, or what none do
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [6d] **labubu** → lets try the viral crumbl labubu (17850), savannah guthrie (8700), stonehenge (7950), labubu halloween costume (1850)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [STALE] **pdf accessibility** → how to bake a cake (1300), best time to visit maldives (1250), cheapest flights to tokyo (900), best laptop for work (850)
- [STALE] **pdf remediation** → (空)
- [STALE] **compare pdf** → cheapest flights to tokyo (9100), compare and contrast essay examples pdf (1500), how to bake a cake (1450), how to make sushi (600)
- [6d] **jellycat** → gargoyle jellycat (2800), jellycat bizzlestomp bear (2050), jellycat gargoyle (1900), halloween jellycat 2026 (1150)
- [5d] **sonny angel** → sonny angel advent calendar 2026 (20200), sonny angel advent calendar (650), sonny angel monster high (400), spiderman sonny angel (250)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **18** / covered 9 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.333 · page=index.html · q=lets try the viral crumbl labubu
- kind=value · match=0.5 · page=index.html · q=gargoyle jellycat
- kind=value · match=0.333 · page=index.html · q=jellycat bizzlestomp bear

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
- 候选 12 · 趋势主题重合 0 · 重现 0 · 已有人做 2(生成 2026-10-14;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': True, 'reddit_access': 'public-json'})
- 旧字段 demand-confirmed 仅指与 Google Trends 的主题重合，不代表客户确认、独立买家数或付费意愿；以下候选仍须读取原帖和核验客户行动。
- [scout] locked out of google despite knowing password and having email access · 1 天 · 站 -
- [scout] any solution for bookmarks on various services · 1 天 · 站 -
- [scout] fake abuse reports keep auto blocking my site on cloudflare · 1 天 · 站 -
- [scout] is there a way to manage the type of network access per app for pixel on graphen · 1 天 · 站 -
- [scout] recommend phones for elderly · 1 天 · 站 -
- [scout] need email deliverability expert · 1 天 · 站 -
- [scout] web push notifications server · 1 天 · 站 -
- [scout] is there a program to run a command with a single flag and multiple arguments co · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **22** 次 / 真人 pv 56040,剔除已标记噪音站 3801(快照 2026-10-14;09-12 手测基线 69)
- 其中 claude.ai **4** 次(可能含舰队自己在 claude.ai/code 里的点击,分不开所以不剔除;不含它是 18 次。判定线照旧读合计)
- agiscorecard: 8 / 50016 pv · claude.ai 4, kagi.com 3, chatgpt.com 1 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- baipiaoji: 8 / 538 pv · www.perplexity.ai 4, chatgpt.com 2, copilot.microsoft.com 2
- getecoback: 3 / 742 pv · www.perplexity.ai 1, kagi.com 1, chatgpt.com 1
- gamesledger: 2 / 490 pv · kagi.com 1, copilot.microsoft.com 1
- thedollscout: 1 / 563 pv · chatgpt.com 1
- goldrush: 0 / 209 pv · —
- gridlings: 0 / 971 pv · —
- buysomething: 0 / 288 pv · —
- after35: 0 / 392 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 271 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 288 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 278 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 512 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 482 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-10-14,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 8/476 = 1.7% · baipiaoji 10/538 = 1.9% · getecoback 3/254 = 1.2% · gamesledger 2/45 = 4.4%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-10-14):search 1445 · ai 24 · fleet 94 · social 7 · self 7674 · direct 46765 · other 31
- baipiaoji: 搜索 519 / AI 10 / 舰队内 0 / 社交 1 / 直接 0 · Google 171 · 前三 cn.bing.com 262, google.com 171, bing.com 49
- agiscorecard: 搜索 402 / AI 8 / 舰队内 48 / 社交 2 / 直接 42789 · Google 273 · 前三 google.com 267, duckduckgo.com 53, bing.com 46
- getecoback: 搜索 247 / AI 3 / 舰队内 0 / 社交 1 / 直接 365 · Google 2 · 前三 bing.com 99, duckduckgo.com 94, ecosia.org 17
- gridlings: 搜索 127 / AI 0 / 舰队内 8 / 社交 0 / 直接 581 · Google 94 · 前三 google.com 94, cn.bing.com 26, bing.com 4
- gamesledger: 搜索 35 / AI 2 / 舰队内 6 / 社交 2 / 直接 355 · Google 21 · 前三 google.com 21, duckduckgo.com 6, cn.bing.com 6
- codeword: 搜索 21 / AI 0 / 舰队内 7 / 社交 1 / 直接 459 · Google 20 · 前三 google.com 20, baidu.com 1
- after35: 搜索 18 / AI 0 / 舰队内 1 / 社交 0 / 直接 321 · Google 17 · 前三 google.com 17, baidu.com 1
- buysomething: 搜索 14 / AI 0 / 舰队内 0 / 社交 0 / 直接 225 · Google 14 · 前三 google.com 14
- fanzha: 搜索 13 / AI 0 / 舰队内 1 / 社交 0 / 直接 254 · Google 12 · 前三 google.com 12, duckduckgo.com 1
- goldrush: 搜索 12 / AI 0 / 舰队内 13 / 社交 0 / 直接 154 · Google 12 · 前三 google.com 12
- learn: 搜索 10 / AI 0 / 舰队内 2 / 社交 0 / 直接 243 · Google 10 · 前三 google.com 10
- firstjob: 搜索 10 / AI 0 / 舰队内 1 / 社交 0 / 直接 238 · Google 10 · 前三 google.com 10
- powerbill: 搜索 9 / AI 0 / 舰队内 7 / 社交 0 / 直接 457 · Google 7 · 前三 google.com 7, baidu.com 1, duckduckgo.com 1
- thedollscout: 搜索 8 / AI 1 / 舰队内 0 / 社交 0 / 直接 324 · Google 5 · 前三 google.com 5, yandex.com.tr 1, duckduckgo.com 1
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-10-14
- getecoback: 联盟点击 78 / 付费订单 0 / 订阅 1 · us-market 0 · amazon.com 6 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 3 · invest_tool_click 1 · /advertise pv 153 · /audits pv 81 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 146 · 厂商 biz 95 · 投稿累计 49 · watches 0 (endpoint)
- thedollscout: 联盟点击 2 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 220 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-10-14):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 2 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
