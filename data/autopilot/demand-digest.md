# 舰队需求摘要 · 2026-09-23

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 3 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — is there an app The operation was aborted due to timeout
- producthunt: ok, 30 条
- reddit_requests: **不可用** — r/SomebodyMakeThis HTTP 403; r/AppIdeas HTTP 403; r/Lightbulb HTTP 403; r/software HTTP 403
- reddit_vertical: **不可用** — r/singularity HTTP 403; r/artificial HTTP 403; r/agi HTTP 403; r/ControlProblem HTTP 403; r/ChatGPT HTTP 403; r/ClaudeAI
- reddit_wish: **不可用** — r/Entrepreneur HTTP 403; r/smallbusiness HTTP 403; r/startups HTTP 403; r/SaaS HTTP 403; r/SideProject HTTP 403; r/indie
- hn_ask: ok, 4 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 8 条
- 雷达快照日期:2026-09-23(0 天前)

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
- indiehackers_rss: HTTP 404 text/html; charset=utf-8 24208B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5770B
- yc_rfs: HTTP 200 text/html; charset=utf-8 99888B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 53551B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 403 text/html 94B
- lemmy_world_search: HTTP 200 application/json 8737B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑121 · ask_hn · How to recover Google auth after phone stolen? — https://news.ycombinator.com/item?id=49742976
- ↑11 · ask_hn · Stripe Withholding Balance of $100000 — https://news.ycombinator.com/item?id=49764468
- ↑3 · softwarerecs · Offline Windows ledger for a one-person microgreens farm (trays + standing orders, no cloud) — https://softwarerecs.stackexchange.com/questions/95595/offline-windows-ledger-for-a-one-person-microgreens-farm-trays-standing-order
- ↑2 · ask_hn · About map enshittification: Have you noticed the maps have gotten worse? — https://news.ycombinator.com/item?id=49743189
- ↑1 · ask_hn · What exists if I want a premade SoC/MCU/screen/enclosure/battery? — https://news.ycombinator.com/item?id=49747290
- ↑0 · softwarerecs · Dynamically display text on a remote Android (TV) display — https://softwarerecs.stackexchange.com/questions/95606/dynamically-display-text-on-a-remote-android-tv-display
- ↑0 · softwarerecs · Editor with doxygen preview — https://softwarerecs.stackexchange.com/questions/95599/editor-with-doxygen-preview

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [9d] **artificial general intelligence** → general donahue (6650), gpt 6 astra (4600), singularity (650), agi vs ai (90)
- [9d] **agi timeline** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- Solid
- Naise AI
- Koreshield
- Alexandria by Firecrawl
- Claude Opus 5.5
- AgentScore
- ResumeContext
- Fez
**autopilot 需求队列**:gaps **0** / covered 2 · heat: measured 2026-09-23 (0 pages); no notes
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 4, "q": "tool:sunwatch_ledger"}, {"n": 4, "q": "tool:invest_positions"}, {"n": 2, "q": "tool:claim_ledger https://goldrush.agiscorecard."}]}`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [2d] **deepseek** → deepseek v4 flash 0731 (91850), deepseek flash v4.1 (58900), dsh (41750), dsh deepseek (40600)
- [2d] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [1d] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [1d] **sora** → when is sora coming to fortnite (23100), sora release date fortnite speculation (10150), when does sora come to fortnite (9550), when will sora be in fortnite (7050)
- [0d] **gemini** → gemini 3.8 flash (5700), gemini 3.7 flash (3200), sergey brin google gemini ban (2850), gemini 3.6 (600)
- [0d] **perplexity** → perplexity nvidia local ai agent (2850), chatgpt claude perplexity financial advice (1700), best time to visit maldives (1600), glm 5.2 (950)
**创业雷达词表命中(PH/HN/Reddit)**
- RankControl
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [6d] **condizionatore portatile** → pinguino delonghi (40400), condizionatore portatile md (33300), condizionatore portatile eurospin (31900), condizionatore portatile comfee 9000 btu (23650)
- [5d] **deumidificatore** → deumidificatore portatile (new), deumidificatore casa (new), deumidificatore dyson (new), deumidificatore in inglese (new)
- [7d] **portable air conditioner** → walmart kissair portable air conditioner (450), portable air conditioner pick up today (400), shop deals on portable air conditioner for home (350), midea 12 000 btu duo smart inverter portable air conditioner (300)
- [6d] **dehumidifier** → does a dehumidifier cool the air (300), pelonis dehumidifier reviews (170), will a dehumidifier cool a room (160), is dehumidifier water good for plants (140)
- [0d] **klimaanlage** → coolizi klimaanlage (28550), air zuma klimaanlage (17800), coolizi coolzy (9900), bgh urteil klimaanlage (8050)
- [8d] **schimmel entfernen** → schimmel auf leder entfernen (50700), schimmel aus kleidung entfernen (400)
- [7d] **infrarotheizung** → infrarotheizung gegen schimmel (59250), knebel infrarotheizung (36000), infrarotheizung werkstatt (30750), infrarotheizung deckenmontage mit licht (25750)
- [2d] **luftentfeuchter** → luftentfeuchter keller (new), luftentfeuchter elektrisch (new), luftentfeuchter test (new), luftentfeuchter granulat (new)
- [1d] **heizlüfter** → sparsamer heizlüfter (54950), akku heizlüfter makita (38500), dyson ventilator und heizlüfter (34450), energiesparender heizlüfter (33050)
- [0d] **balkonkraftwerk** → ecoflow stream 5000 (11300), anker solix solarbank 4 e5000 pro,meter gen 2 ,5xbp5000 balkonkraftwerk (7000), anker solix solarbank 4 e5000 pro (300), anker solarbank 4 pro (250)
- [6d] **kaffeevollautomat** → krups kaffeevollautomat intensity milk (16500), siemens kaffeevollautomat eq.6 plus s400 te654509de (13950), siemens kaffeevollautomat eq.6 plus s300 te653501de (10550), siemens te651509de eq.6 plus s100 kaffeevollautomat (9600)
- [5d] **akku staubsauger** → belstaff jacke herren (26850), sky scanner (14100), ford (550), lululemon shorts (350)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **22** / covered 30 · heat: measured 2026-09-23 (25 pages); no notes
- kind=value · match=0.333 · page=guide/heizkosten-vergleich-rechner.html · q=akku heizlüfter makita
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=knebel infrarotheizung
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=infrarotheizung werkstatt
**第一方需求**:`{"zero_hits": []}`

## buysomething
**Trends rising(逐 seed 时效)**
- [STALE] **electric spin scrubber** → electric spin scrubber amazon (new), electric spin scrubber for bathroom (new), electric spin scrubber charger (new), electric spin scrubber nearby (new)
- [STALE] **portable carpet cleaner** → (空)
- [STALE] **flip straw water bottle** → hydroflask (350), brumate water bottle (120), target (110), yeti water bottle (80)
- [STALE] **heatless curls** → heatless curls with robe belt (18000), heatless curls with tights (11150), heartless curls (2900)
- [STALE] **high speed hair dryer** → xfinity high speed internet (250), laifen hair dryer (100), conair infiniti pro hair dryer (80), conair hair dryer (40)
- [STALE] **mini massage gun** → therabody (120), therabody massage gun (100), therabody mini massage gun (100), theragun massage gun (50)
- [STALE] **leg compression boots** → quinear leg compression (180), therabody leg compression (110), therabody (80), best leg compression sleeves (70)
- [STALE] **solar camping lights** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **0** / covered 0 · heat: measured 2026-09-23 (0 pages); no notes
**第一方需求**:`{"picks": {}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [8d] **labubu** → crumbl labubu ube dot cake (30400), savannah guthrie (7050), fugler (6300), labubu salon (1300)
- [8d] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [7d] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **11** / covered 12 · heat: no public aggregate endpoint on this site — heat needs eithe
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
- 候选 7 · 已确认需求 0 · 重现 0 · 已有人做 0(生成 2026-09-23;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- [scout] how to recover google auth after phone stolen · 1 天 · 站 -
- [scout] stripe withholding balance of 100000 · 1 天 · 站 -
- [scout] offline windows ledger for a one person microgreens farm trays standing orders n · 1 天 · 站 -
- [scout] what exists if i want a premade soc mcu screen enclosure battery · 1 天 · 站 -
- [scout] about map enshittification have you noticed the maps have gotten worse · 1 天 · 站 -
- [scout] dynamically display text on a remote android tv display · 1 天 · 站 -
- [scout] editor with doxygen preview · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **59** 次 / 真人 pv 44549,剔除已标记噪音站 3207(快照 2026-09-23;09-12 手测基线 69)
- baipiaoji: 22 / 387 pv · chatgpt.com 13, www.perplexity.ai 8, kagi.com 1
- agiscorecard: 21 / 39365 pv · chatgpt.com 7, claude.ai 7, www.perplexity.ai 3, copilot.microsoft.com 2, kagi.com 2 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- getecoback: 15 / 583 pv · chatgpt.com 12, www.perplexity.ai 3
- gamesledger: 1 / 527 pv · copilot.microsoft.com 1
- thedollscout: 0 / 321 pv · —
- goldrush: 0 / 448 pv · —
- gridlings: 0 / 838 pv · —
- buysomething: 0 / 103 pv · —
- after35: 0 / 456 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 280 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 273 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 245 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 383 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 340 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
