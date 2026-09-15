# 舰队需求摘要 · 2026-09-15

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 3 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — zero request-shaped posts this week
- producthunt: ok, 30 条
- reddit_requests: **不可用** — r/SomebodyMakeThis HTTP 403; r/AppIdeas HTTP 403; r/Lightbulb HTTP 403; r/software HTTP 403
- reddit_vertical: **不可用** — r/singularity HTTP 403; r/artificial HTTP 403; r/agi HTTP 403; r/ControlProblem HTTP 403; r/ChatGPT HTTP 403; r/ClaudeAI
- reddit_wish: **不可用** — r/Entrepreneur HTTP 403; r/smallbusiness HTTP 403; r/startups HTTP 403; r/SaaS HTTP 403; r/SideProject HTTP 403; r/indie
- hn_ask: ok, 8 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 3 条
- 雷达快照日期:2026-09-14(1 天前)

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
- indiehackers_rss: HTTP 200 text/html; charset=utf-8 174236B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5770B
- yc_rfs: HTTP 200 text/html; charset=utf-8 92315B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 47262B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 403 text/html 94B
- lemmy_world_search: HTTP 200 application/json 43087B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑5 · ask_hn · Does anyone know YouTube's pre-2006's des key? — https://news.ycombinator.com/item?id=49616632
- ↑4 · ask_hn · Is there a way to do GPL anymore? — https://news.ycombinator.com/item?id=49609218
- ↑3 · ask_hn · Is there a genuine space for the Desktop AI assistant, or its solved? — https://news.ycombinator.com/item?id=49645248
- ↑3 · ask_hn · Is there a need for a new kind of antivirus or security application? — https://news.ycombinator.com/item?id=49639137
- ↑2 · ask_hn · Does each frontier model have its own unique taste? — https://news.ycombinator.com/item?id=49669909
- ↑2 · ask_hn · Is there anything worth developing with AI? — https://news.ycombinator.com/item?id=49613990
- ↑2 · ask_hn · Tagging AI-Related Posts — https://news.ycombinator.com/item?id=49607487
- ↑1 · ask_hn · What LLM are you using? — https://news.ycombinator.com/item?id=49600138
- ↑1 · softwarerecs · PDF printer on Windows, non AGPL licensed — https://softwarerecs.stackexchange.com/questions/95580/pdf-printer-on-windows-non-agpl-licensed
- ↑1 · softwarerecs · Extension for coloring fixed-width files — https://softwarerecs.stackexchange.com/questions/95572/extension-for-coloring-fixed-width-files

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [1d] **artificial general intelligence** → general donahue (6650), gpt 6 astra (4600), singularity (650), agi vs ai (90)
- [1d] **agi timeline** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- OzBrain
- Naoma AI Demo Agent V2
- Web Search Agents by Nimble
- What LLM are you using?
- Show HN: Give Claude Code / Cursor a real eng team (tiers, roles, escalation)
- Show HN: Lumae Native macOS screen-demo recorder that agents can edit over MCP
- Why are AI agents lying, cheating and coordinating?
- Astra and Fable still hack on simple variants of alignment evals from 2025
**autopilot 需求队列**:gaps **0** / covered 2 · heat: measured 2026-09-15 (4 pages); no notes
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 1, "q": "tool:sunwatch_ledger"}, {"n": 1, "q": "tool:claim_ledger https://goldrush.agiscorecard."}]}`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [4d] **deepseek** → deepseek v4 flash 0731 (82350), deepseek dspark (45300), dsh deepseek (30900), deepseek v4 pro 0813 (28750)
- [4d] **midjourney** → midjourney medical scanner (57050), midjourney body scanner (35350), bfly stock (7450), what does upscale mean in midjourney (6600)
- [3d] **suno** → bmg suno (14750), jason isbell suno lawsuit (9950), suno artist incubator program (7150), treblo (5250)
- [3d] **sora** → sora release date fortnite speculation (8600), when will sora be in fortnite (6450), sora dora raphael (3400), sora no manimani (2200)
- [2d] **gemini** → gemini 3.8 flash (5650), gemini 3.7 flash (3750), sergey brin google gemini ban (2750), gemini the janus cat (2050)
- [2d] **perplexity** → glm 5.2 (11050), perplexity ai ceo startup strategy (7600), perplexity nvidia local ai agent (2350), perplexity brain ai memory system (2100)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [1d] **klimaanlage** → coolizi (25150), air zuma klimaanlage (15650), bgh urteil klimaanlage (6600), beste klimaanlage für mietwohnung (6600)
- [1d] **schimmel entfernen** → weißer schimmel (47800), schimmel mit wasserstoffperoxid entfernen (39250), schimmel englisch (19750), schimmel mit spiritus entfernen (7000)
- [9d] **infrarotheizung** → infrarotheizung wand (new), infrarotheizung decke (new), infrarotheizung badezimmer (new), infrarotheizung bild (new)
- [4d] **luftentfeuchter** → meaco arete one 20l (49800), luftentfeuchter keller test (48200), luftfeuchtigkeit senken (46700), split klimaanlage (41150)
- [3d] **heizlüfter** → heizlüfter 300 watt (44900), dreo solaris slim h3 (29250), sparsamer heizlüfter (28600), energiesparender heizlüfter (28450)
- [2d] **balkonkraftwerk** → ecoflow stream 5000 (8800), anker solix solarbank 4 e5000 pro,meter gen 2 ,5xbp5000 balkonkraftwerk (4400), anker solix solarbank 4 e5000 pro (700), split klimaanlage (450)
- [8d] **kaffeevollautomat** → krups kaffeevollautomat intensity milk (16350), siemens kaffeevollautomat eq.6 plus s400 te654509de (9100), siemens kaffeevollautomat eq.6 plus s300 te653501de (1750), kaffeevollautomat mit 2 bohnenbehälter testsieger (250)
- [7d] **akku staubsauger** → lululemon shorts (36300), belstaff jacke herren (26950), new balance hierro (15050), belstaff (850)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **30** / covered 38 · heat: measured 2026-09-15 (20 pages); no notes
- kind=value · match=0.333 · page=guide/bester-luftkuehler.html · q=bester saugwischer roboter
- kind=value · match=0.5 · page=index.html · q=weißer schimmel
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
- (无)
**autopilot 需求队列**:gaps **1** / covered 0 · heat: measured 2026-09-15 (0 pages); no notes
- kind=autocomplete-new · match=0.3 · page=landed-cost.html · q=electric pruning shears harbor freight
**第一方需求**:`{"picks": {}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [10d] **labubu** → crumbl labubu ube dot cake (24900), lets try the viral crumbl labubu (7600), labubu salon (1250), labubu fifa world cup 2026 (950)
- [10d] **fake labubu** → popmart (60)
- [9d] **pop mart** → monster hunter pop mart (25850), pop mart international dessert expansion (5300), pop mart overwatch (550), hirono mist walker (500)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **13** / covered 3 · heat: no public aggregate endpoint on this site — heat needs eithe
- kind=value · match=0.5 · page=fake-check.html · q=monster hunter pop mart
- kind=value · match=0.2 · page=index.html · q=crumbl labubu ube dot cake
- kind=value · match=0.333 · page=index.html · q=lets try the viral crumbl labubu

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
- 候选 10 · 已确认需求 0 · 重现 0 · 已有人做 0(生成 2026-09-14;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- [scout] does anyone know youtube s pre 2006 s des key · 1 天 · 站 -
- [scout] is there anything worth developing with ai · 1 天 · 站 -
- [scout] is there a way to do gpl anymore · 1 天 · 站 -
- [scout] is there a genuine space for the desktop ai assistant or its solved · 1 天 · 站 -
- [scout] is there a need for a new kind of antivirus or security application · 1 天 · 站 -
- [scout] does each frontier model have its own unique taste · 1 天 · 站 -
- [scout] tagging ai related posts · 1 天 · 站 -
- [scout] extension for coloring fixed width files · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **80** 次 / 真人 pv 31030(快照 2026-09-14;09-12 手测基线 69)
- baipiaoji: 33 / 288 pv · www.perplexity.ai 20, chatgpt.com 12, kagi.com 1
- getecoback: 25 / 574 pv · chatgpt.com 18, www.perplexity.ai 5, kagi.com 1, copilot.microsoft.com 1
- agiscorecard: 22 / 28142 pv · chatgpt.com 8, claude.ai 6, copilot.microsoft.com 4, www.perplexity.ai 3, kagi.com 1
- thedollscout: 0 / 231 pv · —
- goldrush: 0 / 313 pv · —
- gridlings: 0 / 695 pv · —
- buysomething: 0 / 74 pv · —
- gamesledger: 0 / 661 pv · —
- after35: 0 / 52 pv · —

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
