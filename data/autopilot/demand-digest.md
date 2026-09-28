# 舰队需求摘要 · 2026-09-27

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 3 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — is there an app The operation was aborted due to timeout
- producthunt: ok, 30 条
- reddit_requests: **不可用** — r/SomebodyMakeThis HTTP 403; r/AppIdeas HTTP 403; r/Lightbulb HTTP 403; r/software HTTP 403
- reddit_vertical: **不可用** — r/singularity HTTP 403; r/artificial HTTP 403; r/agi HTTP 403; r/ControlProblem HTTP 403; r/ChatGPT HTTP 403; r/ClaudeAI
- reddit_wish: **不可用** — r/Entrepreneur HTTP 403; r/smallbusiness HTTP 403; r/startups HTTP 403; r/SaaS HTTP 403; r/SideProject HTTP 403; r/indie
- hn_ask: ok, 3 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 4 条
- 雷达快照日期:2026-09-27(0 天前)

## 板块产出榜(14 天;名单 tools/fleet/reddit_watchlist.json,更新 2026-09-13)
| 板块 | 名单 | 今日 | ok 天数 | 帖子 | 求做形 | 重现主题 | 标记 |
|---|---|---|---|---|---|---|---|
| r/SomebodyMakeThis | request | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/AppIdeas | request | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/Lightbulb | request | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/software | request | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/singularity | vertical:agiscorecard | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/artificial | vertical:agiscorecard | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/agi | vertical:agiscorecard | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/ControlProblem | vertical:agiscorecard | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/ChatGPT | vertical:baipiaoji | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/ClaudeAI | vertical:baipiaoji | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/LocalLLaMA | vertical:baipiaoji | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/OpenAI | vertical:baipiaoji | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/DeepSeek | vertical:baipiaoji | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/puzzles | vertical:gridlings | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/sudoku | vertical:gridlings | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/nonograms | vertical:gridlings | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/incremental_games | vertical:gridlings | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/WebGames | vertical:gridlings | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/labubu | vertical:thedollscout | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/PopMart | vertical:thedollscout | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/Designertoys | vertical:thedollscout | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/ecommerce | vertical:buysomething | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/dropship | vertical:buysomething | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/FulfillmentByAmazon | vertical:buysomething | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/AmazonSeller | vertical:buysomething | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/shopify | vertical:buysomething | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/de | vertical:getecoback | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/Finanzen | vertical:getecoback | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/wohnen | vertical:getecoback | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/heimwerken | vertical:getecoback | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/Entrepreneur | wish | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/smallbusiness | wish | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/startups | wish | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/SaaS | wish | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/SideProject | wish | HTTP 403 | 0 | 0 | 0 | 0 |  |
| r/indiehackers | wish | HTTP 403 | 0 | 0 | 0 | 0 |  |

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 404 text/html; charset=utf-8 25141B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5770B
- yc_rfs: HTTP 200 text/html; charset=utf-8 101538B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 58327B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1440B
- lemmy_world_search: HTTP 200 application/json 3958B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑11 · ask_hn · IEEE expulsion of Fei-Yue Wang? — https://news.ycombinator.com/item?id=49837325
- ↑2 · ask_hn · Is there word or term for $Trillion valued companies not having perfect UI? — https://news.ycombinator.com/item?id=49835532
- ↑1 · ask_hn · Anybody has experience with maintaining self hosted Git? — https://news.ycombinator.com/item?id=49853952
- ↑0 · softwarerecs · Dynamically display text on a remote Android (TV) display — https://softwarerecs.stackexchange.com/questions/95606/dynamically-display-text-on-a-remote-android-tv-display
- ↑0 · softwarerecs · Editor with doxygen preview — https://softwarerecs.stackexchange.com/questions/95599/editor-with-doxygen-preview
- ↑-1 · softwarerecs · Can an Android app track a phone’s live location using only its phone number? — https://softwarerecs.stackexchange.com/questions/95610/can-an-android-app-track-a-phone-s-live-location-using-only-its-phone-number

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [3d] **artificial general intelligence** → stock market today (37150), generative artificial intelligence (40)
- [3d] **agi timeline** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- Harmony
- GPT-6 Sol & Luna
- Cuey
- Chit
- Hemory
- Eclatira
- Token Forecaster
- Show HN: A Claude Code skill to analyze your chess games
**autopilot 需求队列**:gaps **0** / covered 2 · heat: measured 2026-09-24 (0 pages); no notes
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 5, "q": "tool:sunwatch_ledger"}, {"n": 5, "q": "tool:invest_positions"}, {"n": 1, "q": "tool:claim_ledger https://goldrush.agiscorecard."}]}`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [6d] **deepseek** → deepseek v4 flash 0731 (91850), deepseek flash v4.1 (58900), dsh (41750), dsh deepseek (40600)
- [6d] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [5d] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [5d] **sora** → when is sora coming to fortnite (23100), sora release date fortnite speculation (10150), when does sora come to fortnite (9550), when will sora be in fortnite (7050)
- [4d] **gemini** → gemini 3.8 flash (5700), gemini 3.7 flash (3200), sergey brin google gemini ban (2850), gemini 3.6 (600)
- [4d] **perplexity** → perplexity nvidia local ai agent (2850), chatgpt claude perplexity financial advice (1700), best time to visit maldives (1600), glm 5.2 (950)
**创业雷达词表命中(PH/HN/Reddit)**
- Cuey
- Show HN: Blender Copilot
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [0d] **condizionatore portatile** → condizionatore e deumidificatore portatile senza tubo (16900), pinguino aria condizionata (13950), kit allungamento tubo condizionatore portatile (6650), irradio belair vigo 9 (6200)
- [9d] **deumidificatore** → deumidificatore portatile (new), deumidificatore casa (new), deumidificatore dyson (new), deumidificatore in inglese (new)
- [1d] **portable air conditioner** → portable air conditioner pick up today (550), walmart kissair portable air conditioner (550), midea 12 000 btu duo smart inverter portable air conditioner (500), shop deals on portable air conditioner (300)
- [0d] **dehumidifier** → does a dehumidifier cool the air (350), can a dehumidifier make a room cooler (250), pelonis dehumidifier manual (250), is dehumidifier water safe to drink (180)
- [3d] **klimaanlage** → coolizi erfahrungen (7700), midea portasplit mobile split klimaanlage inklusive (5300), coolizi (2500), coolizi coolzy (1850)
- [2d] **schimmel entfernen** → (空)
- [1d] **infrarotheizung** → infrarotheizung für 20 qm (42350), infrarotheizung test stiftung warentest (41250), infrarotheizung bauhaus (35900), welltherm infrarotheizung (33450)
- [6d] **luftentfeuchter** → luftentfeuchter keller (new), luftentfeuchter elektrisch (new), luftentfeuchter test (new), luftentfeuchter granulat (new)
- [5d] **heizlüfter** → sparsamer heizlüfter (54950), akku heizlüfter makita (38500), dyson ventilator und heizlüfter (34450), energiesparender heizlüfter (33050)
- [0d] **kaffeevollautomat** → siemens kaffeevollautomat eq.6 plus s400 te654509de (16500), krups kaffeevollautomat intensity milk (16100), siemens kaffeevollautomat eq.6 plus s300 te653501de (10750), siemens eq.6 plus s700 te657m03de kaffeevollautomat (10550)
- [0d] **akku staubsauger** → ford (550), dyson tp09 (550), belstaff jacke herren (500), ventilator dyson (400)
- [8d] **matratze** → fluss durch riga (3800), emma performance matratze (140), kühlende matratze (130), bett1 de (100)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **21** / covered 31 · heat: measured 2026-09-24 (25 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.333 · page=guide/heizkosten-vergleich-rechner.html · q=akku heizlüfter makita
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=knebel infrarotheizung
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=infrarotheizung werkstatt
**第一方需求**:`{"zero_hits": []}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-09-15,12 天前,锚 heizlüfter)
| 词 | 峰值 | 峰值月 | 距峰值月 | 冬÷九月 | 标题覆盖页 | 状态 |
|---|---|---|---|---|---|---|
| luftfeuchtigkeit senken | 2.6 | 10 月 | 4 天 | 0.95 | 1 | 已覆盖 1 页 |
| heizkosten sparen | 0.5 | 10 月 | 4 天 | 0.34 | 0 | 量太小(峰值 <2.0) |
| kaffeevollautomat | 59.5 | 11 月 | 35 天 | 1.36 | 0 | 已裁定:站外(礼品季大词)(2026-09-15) |
| luftentfeuchter | 32.0 | 11 月 | 35 天 | 1.19 | 18 | 已覆盖 18 页 |
| heizlüfter | 29.4 | 11 月 | 35 天 | 0.89 | 5 | 已覆盖 5 页 |
| infrarotheizung | 29.2 | 11 月 | 35 天 | 0.71 | 9 | 已覆盖 9 页 |
| akku staubsauger | 26.5 | 11 月 | 35 天 | 1.32 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| saugroboter | 23.6 | 11 月 | 35 天 | 1.3 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| heizstrahler | 19.9 | 11 月 | 35 天 | 0.8 | 0 | 已裁定:扩到已排名页 heizluefter-stromverbrauch;独立页可进扩展队列,须先过 SERP 门(无测评,不点名型号)(2026-09-24) |
| fussbodenheizung | 16.1 | 11 月 | 35 天 | 1.24 | 0 | 已裁定:装修题,非联盟可买形态(2026-09-15) |
| heizung einstellen | 8.5 | 11 月 | 35 天 | 1.03 | 0 | 已裁定:红海(Utopia/ÖKO-TEST/heizung.de/heizsparer/MVV)(2026-08-05) |
| heizkörper thermostat | 6.0 | 11 月 | 35 天 | 1.09 | 0 | 已裁定:红海;租客角度已在 heizkosten-senken-als-mieter(2026-08-05) |
| fenster beschlagen | 5.6 | 11 月 | 35 天 | 1.94 | 2 | 已覆盖 2 页 |
| wandheizung | 4.5 | 11 月 | 35 天 | 1.04 | 0 | 已裁定:装修题(埋墙),非联盟可买形态(2026-09-24) |
| zugluft | 3.5 | 11 月 | 35 天 | 1.11 | 1 | 已覆盖 1 页 |
| fenster abdichten | 3.2 | 11 月 | 35 天 | 1.06 | 2 | 已覆盖 2 页 |
| saugwischer | 3.2 | 11 月 | 35 天 | 1.16 | 0 | 已裁定:Bodenpflege 判负(峰值 3,2 / 56 天 1 pv)(2026-09-15) |
| richtig heizen | 3.0 | 11 月 | 35 天 | 1.16 | 0 | **未覆盖 · 待过三门** |
| schimmel schlafzimmer | 2.4 | 11 月 | 35 天 | 4.84 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
| wäsche trocknen wohnung | 1.0 | 11 月 | 35 天 | 2.12 | 1 | 量太小(峰值 <2.0) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-09-27;blocked 1 · built 4 · gated 1 · queued 2 · rejected 9 · removed 1 · withdrawn 2;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
- `hygrometer-testen-salz` — Luftfeuchtigkeit richtig messen: wohin das Hygrometer gehört und wie du es mit Salz prüfst · 待办:SERP done 2026-09-27 on 'luftfeuchtigkeit messen' (writable with the coldest-wall angle). Remaining gap: cite the ~75 % saturated-salt figure from a primary or 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Prime Deal Days 2026-10-06(9 天后)· 已公告,横幅 2026-09-29→2026-10-07,带 Prime 试用链接
- Black Friday 2026-11-27(61 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

## buysomething
**Trends rising(逐 seed 时效)**
- [2d] **electric spin scrubber** → ykyi electric spin scrubber (250), voweek electric spin scrubber (200), homitt electric spin scrubber (90), best electric spin scrubber (50)
- [1d] **portable carpet cleaner** → bissell little green multi-purpose portable carpet cleaner, 1400b (1400), best portable carpet cleaner (170), best carpet cleaner (170)
- [0d] **flip straw water bottle** → brumate era flip (218350), frank green water bottle (98750), brumate water bottle (550), hydroflask water bottle (400)
- [0d] **heatless curls** → my kitsch heatless curls (42200), kitch (34400), rag curls (22150), kitsch heatless curl headband (21700)
- [STALE] **high speed hair dryer** → xfinity high speed internet (250), laifen hair dryer (100), conair infiniti pro hair dryer (80), conair hair dryer (40)
- [STALE] **mini massage gun** → therabody (120), therabody massage gun (100), therabody mini massage gun (100), theragun massage gun (50)
- [STALE] **leg compression boots** → quinear leg compression (180), therabody leg compression (110), therabody (80), best leg compression sleeves (70)
- [STALE] **solar camping lights** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **0** / covered 0 · heat: measured 2026-09-24 (0 pages); no notes
**第一方需求**:`{"picks": {}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- MIDIpad
- Show HN: A Claude Code skill to analyze your chess games
- Show HN: A game about fake news and memes
- Show HN: Tokken – a browser fighting game where AI models fight and HP is tokens
- Show HN: 12 Puzzle – a sliding puzzle on the hyperbolic plane
- Show HN: Trail – new kind of logic game
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [STALE] **labubu** → crumbl labubu ube dot cake (30400), savannah guthrie (7050), fugler (6300), labubu salon (1300)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [2d] **pdf accessibility** → how to split pdf files (1250), how to bake a cake (800), convert jpg to pdf free (130), how to edit pdf free (60)
- [2d] **pdf remediation** → pdf remediation tools (new), pdf remediation services (new), pdf remediation jobs (new), pdf remediation software (new)
- [1d] **compare pdf** → how to compare two word documents for differences (6850), how to compare two pdf documents for differences (1700), compare pdf files for differences (300), how to compare two pdf documents (300)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **11** / covered 12 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.2 · page=index.html · q=crumbl labubu ube dot cake
- kind=value · match=0.5 · page=index.html · q=labubu salon
- kind=value · match=0.5 · page=fake-check.html · q=pop mart monster hunter

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
- 候选 6 · 已确认需求 0 · 重现 0 · 已有人做 0(生成 2026-09-27;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- [scout] ieee expulsion of fei yue wang · 1 天 · 站 -
- [scout] is there word or term for trillion valued companies not having perfect ui · 1 天 · 站 -
- [scout] anybody has experience with maintaining self hosted git · 1 天 · 站 -
- [scout] can an android app track a phone s live location using only its phone number · 1 天 · 站 -
- [scout] dynamically display text on a remote android tv display · 1 天 · 站 -
- [scout] editor with doxygen preview · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **53** 次 / 真人 pv 39269,剔除已标记噪音站 3393(快照 2026-09-27;09-12 手测基线 69)
- agiscorecard: 19 / 33790 pv · claude.ai 7, chatgpt.com 5, www.perplexity.ai 3, copilot.microsoft.com 2, kagi.com 2 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- baipiaoji: 17 / 410 pv · chatgpt.com 10, www.perplexity.ai 5, copilot.microsoft.com 1, kagi.com 1
- getecoback: 16 / 597 pv · chatgpt.com 12, www.perplexity.ai 3, kagi.com 1
- gamesledger: 1 / 454 pv · copilot.microsoft.com 1
- thedollscout: 0 / 661 pv · —
- goldrush: 0 / 433 pv · —
- gridlings: 0 / 716 pv · —
- buysomething: 0 / 122 pv · —
- after35: 0 / 460 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 291 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 291 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 258 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 415 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 371 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-09-27,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 19/528 = 3.6% · baipiaoji 19/410 = 4.6% · getecoback 16/235 = 6.8% · gamesledger 1/32 = 3.1%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-09-27):search 1139 · ai 55 · fleet 43 · social 24 · self 5028 · direct 32945 · other 35
- agiscorecard: 搜索 459 / AI 19 / 舰队内 19 / 社交 7 / 直接 28912 · Google 321 · 前三 google.com 317, duckduckgo.com 74, bing.com 46
- baipiaoji: 搜索 371 / AI 19 / 舰队内 0 / 社交 16 / 直接 0 · Google 184 · 前三 google.com 183, cn.bing.com 139, bing.com 22
- getecoback: 搜索 219 / AI 16 / 舰队内 0 / 社交 0 / 直接 239 · Google 1 · 前三 duckduckgo.com 95, bing.com 73, ecosia.org 22
- gridlings: 搜索 31 / AI 0 / 舰队内 7 / 社交 0 / 直接 459 · Google 17 · 前三 google.com 17, cn.bing.com 11, baidu.com 2
- gamesledger: 搜索 25 / AI 1 / 舰队内 5 / 社交 0 / 直接 337 · Google 20 · 前三 google.com 20, cn.bing.com 2, bing.com 1
- goldrush: 搜索 14 / AI 0 / 舰队内 8 / 社交 0 / 直接 402 · Google 14 · 前三 google.com 14
- thedollscout: 搜索 12 / AI 0 / 舰队内 0 / 社交 0 / 直接 434 · Google 5 · 前三 bing.com 6, google.com 5, duckduckgo.com 1
- buysomething: 搜索 7 / AI 0 / 舰队内 0 / 社交 0 / 直接 114 · Google 7 · 前三 google.com 7
- fanzha: 搜索 1 / AI 0 / 舰队内 0 / 社交 0 / 直接 283 · Google 0 · 前三 duckduckgo.com 1
- after35: 搜索 0 / AI 0 / 舰队内 0 / 社交 0 / 直接 457 · Google 0 · 前三 —
- learn: 搜索 0 / AI 0 / 舰队内 0 / 社交 0 / 直接 286 · Google 0 · 前三 —
- firstjob: 搜索 0 / AI 0 / 舰队内 0 / 社交 0 / 直接 255 · Google 0 · 前三 —
- codeword: 搜索 0 / AI 0 / 舰队内 2 / 社交 1 / 直接 400 · Google 0 · 前三 —
- powerbill: 搜索 0 / AI 0 / 舰队内 2 / 社交 0 / 直接 367 · Google 0 · 前三 —
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-09-27
- getecoback: 联盟点击 79 / 付费订单 0 / 订阅 1 · us-market 1 · amazon.com 1 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 2 · invest_tool_click 10 · /advertise pv 158 · /audits pv 101 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 121 · 厂商 biz 12 · 投稿累计 9 · watches 0 (endpoint)
- thedollscout: 联盟点击 3 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 90 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-09-27):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 2 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
