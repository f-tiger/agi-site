# 舰队需求摘要 · 2026-09-21

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 1 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — zero request-shaped posts this week
- producthunt: ok, 30 条
- reddit_requests: **不可用** — r/SomebodyMakeThis HTTP 403; r/AppIdeas HTTP 403; r/Lightbulb HTTP 403; r/software HTTP 403
- reddit_vertical: **不可用** — r/singularity HTTP 403; r/artificial HTTP 403; r/agi HTTP 403; r/ControlProblem HTTP 403; r/ChatGPT HTTP 403; r/ClaudeAI
- reddit_wish: **不可用** — r/Entrepreneur HTTP 403; r/smallbusiness HTTP 403; r/startups HTTP 403; r/SaaS HTTP 403; r/SideProject HTTP 403; r/indie
- hn_ask: ok, 5 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 4 条
- 雷达快照日期:2026-09-20(1 天前)

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
- indiehackers_rss: HTTP 200 text/html; charset=utf-8 175257B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5792B
- yc_rfs: HTTP 200 text/html; charset=utf-8 92628B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 51689B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 403 text/html 94B
- lemmy_world_search: HTTP 200 application/json 11088B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑117 · ask_hn · How to recover Google auth after phone stolen? — https://news.ycombinator.com/item?id=49742976
- ↑11 · ask_hn · Stripe Withholding Balance of $100000 — https://news.ycombinator.com/item?id=49764468
- ↑4 · ask_hn · Day 13. Three production applications on AWS down — https://news.ycombinator.com/item?id=49716456
- ↑2 · ask_hn · About map enshittification: Have you noticed the maps have gotten worse? — https://news.ycombinator.com/item?id=49743189
- ↑1 · ask_hn · What exists if I want a premade SoC/MCU/screen/enclosure/battery? — https://news.ycombinator.com/item?id=49747290
- ↑0 · softwarerecs · Offline Windows ledger for a one-person microgreens farm (trays + standing orders, no cloud) — https://softwarerecs.stackexchange.com/questions/95595/offline-windows-ledger-for-a-one-person-microgreens-farm-trays-standing-order

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [7d] **artificial general intelligence** → general donahue (6650), gpt 6 astra (4600), singularity (650), agi vs ai (90)
- [7d] **agi timeline** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- Bolt Forge
- Simple Commenter AI
- Show HN: Agentgit – a Git host for AI agents, no account, no token, no key
- Show HN: Text-me: a personal agent that learns your pace
- Show HN: Wcagent let use your ChatGPT subscription for coding
- Show HN: The Smallest LLM
- Claude Code now reads AGENTS.md if there is no Claude.md
- GPT-6 Astra Solves a WWI German Radio Cipher
**autopilot 需求队列**:gaps **0** / covered 2 · heat: measured 2026-09-21 (5 pages); no notes
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 2, "q": "tool:claim_ledger https://goldrush.agiscorecard."}, {"n": 1, "q": "tool:sunwatch_ledger"}, {"n": 1, "q": "tool:invest_positions"}]}`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [10d] **deepseek** → deepseek v4 flash 0731 (82350), deepseek dspark (45300), dsh deepseek (30900), deepseek v4 pro 0813 (28750)
- [10d] **midjourney** → midjourney medical scanner (57050), midjourney body scanner (35350), bfly stock (7450), what does upscale mean in midjourney (6600)
- [9d] **suno** → bmg suno (14750), jason isbell suno lawsuit (9950), suno artist incubator program (7150), treblo (5250)
- [9d] **sora** → sora release date fortnite speculation (8600), when will sora be in fortnite (6450), sora dora raphael (3400), sora no manimani (2200)
- [8d] **gemini** → gemini 3.8 flash (5650), gemini 3.7 flash (3750), sergey brin google gemini ban (2750), gemini the janus cat (2050)
- [8d] **perplexity** → glm 5.2 (11050), perplexity ai ceo startup strategy (7600), perplexity nvidia local ai agent (2350), perplexity brain ai memory system (2100)
**创业雷达词表命中(PH/HN/Reddit)**
- Epismo OS
- Show HN: Wcagent let use your ChatGPT subscription for coding
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [5d] **portable air conditioner** → walmart kissair portable air conditioner (450), portable air conditioner pick up today (400), shop deals on portable air conditioner for home (350), midea 12 000 btu duo smart inverter portable air conditioner (300)
- [4d] **dehumidifier** → does a dehumidifier cool the air (300), pelonis dehumidifier reviews (170), will a dehumidifier cool a room (160), is dehumidifier water good for plants (140)
- [7d] **klimaanlage** → coolizi (25150), air zuma klimaanlage (15650), bgh urteil klimaanlage (6600), beste klimaanlage für mietwohnung (6600)
- [6d] **schimmel entfernen** → schimmel auf leder entfernen (50700), schimmel aus kleidung entfernen (400)
- [5d] **infrarotheizung** → infrarotheizung gegen schimmel (59250), knebel infrarotheizung (36000), infrarotheizung werkstatt (30750), infrarotheizung deckenmontage mit licht (25750)
- [1d] **luftentfeuchter** → klarstein mobile klimaanlage mit abluftschlauch, 4-in-1 klimagerät mit ventilato (44450), meacodry arete one 20l (36800), kühlt ein luftentfeuchter (36200), luftentfeuchter testsieger stiftung warentest (30450)
- [9d] **heizlüfter** → heizlüfter 300 watt (44900), dreo solaris slim h3 (29250), sparsamer heizlüfter (28600), energiesparender heizlüfter (28450)
- [8d] **balkonkraftwerk** → ecoflow stream 5000 (8800), anker solix solarbank 4 e5000 pro,meter gen 2 ,5xbp5000 balkonkraftwerk (4400), anker solix solarbank 4 e5000 pro (700), split klimaanlage (450)
- [4d] **kaffeevollautomat** → krups kaffeevollautomat intensity milk (16500), siemens kaffeevollautomat eq.6 plus s400 te654509de (13950), siemens kaffeevollautomat eq.6 plus s300 te653501de (10550), siemens te651509de eq.6 plus s100 kaffeevollautomat (9600)
- [3d] **akku staubsauger** → belstaff jacke herren (26850), sky scanner (14100), ford (550), lululemon shorts (350)
- [4d] **condizionatore portatile** → pinguino delonghi (40400), condizionatore portatile md (33300), condizionatore portatile eurospin (31900), condizionatore portatile comfee 9000 btu (23650)
- [3d] **deumidificatore** → deumidificatore portatile (new), deumidificatore casa (new), deumidificatore dyson (new), deumidificatore in inglese (new)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **25** / covered 31 · heat: measured 2026-09-21 (24 pages); no notes
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=knebel infrarotheizung
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=infrarotheizung werkstatt
- kind=value · match=0.0 · page=None · q=dreo solaris slim h3
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
- Punch
- Show HN: Pg_chdb, fast imports from object storage to Postgres using COPY
**autopilot 需求队列**:gaps **1** / covered 0 · heat: measured 2026-09-21 (0 pages); no notes
- kind=value · match=0.15 · page=is-alibaba-legit.html · q=costco self cleaning litter box
**第一方需求**:`{"picks": {}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- MeshEdit
- Show HN: Gravitype – a terminal typing game where words fall from the sky
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [6d] **labubu** → crumbl labubu ube dot cake (30400), savannah guthrie (7050), fugler (6300), labubu salon (1300)
- [6d] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [5d] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
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
- 候选 6 · 已确认需求 0 · 重现 0 · 已有人做 0(生成 2026-09-20;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- [scout] how to recover google auth after phone stolen · 1 天 · 站 -
- [scout] stripe withholding balance of 100000 · 1 天 · 站 -
- [scout] day 13 three production applications on aws down · 1 天 · 站 -
- [scout] what exists if i want a premade soc mcu screen enclosure battery · 1 天 · 站 -
- [scout] offline windows ledger for a one person microgreens farm trays standing orders n · 1 天 · 站 -
- [scout] about map enshittification have you noticed the maps have gotten worse · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **66** 次 / 真人 pv 41615(快照 2026-09-20;09-12 手测基线 69)
- baipiaoji: 25 / 348 pv · chatgpt.com 13, www.perplexity.ai 11, kagi.com 1
- agiscorecard: 22 / 36617 pv · chatgpt.com 8, claude.ai 7, www.perplexity.ai 3, copilot.microsoft.com 2, kagi.com 2
- getecoback: 19 / 517 pv · chatgpt.com 13, www.perplexity.ai 6
- thedollscout: 0 / 308 pv · —
- goldrush: 0 / 436 pv · —
- gridlings: 0 / 881 pv · —
- buysomething: 0 / 107 pv · —
- gamesledger: 0 / 618 pv · —
- after35: 0 / 443 pv · —
- learn: 0 / 260 pv · —
- fanzha: 0 / 240 pv · —
- firstjob: 0 / 207 pv · —
- codeword: 0 / 342 pv · —
- powerbill: 0 / 291 pv · —

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
