# 舰队需求摘要 · 2026-10-28

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 4 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — is there an app The operation was aborted due to timeout
- producthunt: ok, 30 条
- reddit_requests: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_vertical: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_wish: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- hn_ask: ok, 8 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 2 条
- 雷达快照日期:2026-10-27(1 天前)

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 403 text/html; charset=UTF-8 5659B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5759B
- yc_rfs: HTTP 200 text/html; charset=utf-8 108046B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 54231B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1591B
- lemmy_world_search: HTTP 200 application/json 2341B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑2 · ask_hn · When can we trust AI in coding, and avoid the happy path issue? — https://news.ycombinator.com/item?id=50209084
- ↑2 · ask_hn · UPDATE: Anthropic's non-existant customer support — https://news.ycombinator.com/item?id=50200555
- ↑2 · ask_hn · Are Models Getting Better at Software Estimations of Time/Effort/Cost? — https://news.ycombinator.com/item?id=50182453
- ↑2 · ask_hn · Is there a credible gut health test out there? — https://news.ycombinator.com/item?id=50167918
- ↑1 · ask_hn · Can we do something about this impending AI dystopia — https://news.ycombinator.com/item?id=50256342
- ↑1 · ask_hn · Samsamelo – Silicon Valley selling trolley problem lies [no link] — https://news.ycombinator.com/item?id=50191899
- ↑1 · ask_hn · What AI tools help me understand a MR? — https://news.ycombinator.com/item?id=50186182
- ↑1 · ask_hn · Did crates.io stop processing new crate publishes? — https://news.ycombinator.com/item?id=50240115
- ↑0 · softwarerecs · Feature Request Manager — https://softwarerecs.stackexchange.com/questions/95722/feature-request-manager
- ↑0 · softwarerecs · PHP based FAQ engine — https://softwarerecs.stackexchange.com/questions/95711/php-based-faq-engine

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [10d] **artificial general intelligence** → top tourist attractions in paris (6500), best time to visit maldives (6250), best laptop for work (4350), how to make sushi (350)
- [10d] **agi timeline** → (空)
- [9d] **13f filings** → (空)
- [9d] **ai stocks** → top tourist attractions in paris (12300), jim cramer ai chip stocks (11450), nvidia versus asml ai stocks (11100), cheapest flights to tokyo (10450)
**创业雷达词表命中(PH/HN/Reddit)**
- PulseDev
- Paddock
- Nuvio 5.0
- VibeiDE
- ManyAgents
- MiniMax M3.1 Flash
- UPDATE: Anthropic's non-existant customer support
- Show HN: Hob - Open-source, on device alternative to Claude Cowork and ChatGPT
**autopilot 需求队列**:gaps **4** / covered 1 · heat: measured 2026-10-28 (1 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.4 · page=aschenbrenner-fund-collapse.html · q=jim cramer ai chip stocks
- kind=value · match=0.425 · page=invest.html · q=nvidia versus asml ai stocks
- kind=value · match=0.583 · page=invest.html · q=ai infrastructure stocks comeback
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 16, "q": "tool:portfolio_returns"}, {"n": 7, "q": "tool:verdicts"}, {"n": 7, "q": "tool:thesis_tracker"}, {"n": 7, "q": "tool:sunwatch_ledger"}, {"n": 7,`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [2d] **deepseek** → deepseek ai (new), deepseek api (new), deepseek v4.1 flash (new), deepseek harness desktop (new)
- [STALE] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [STALE] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [1d] **sora** → sora release date fortnite speculation (9000), when does sora come to fortnite (8650), when will sora be in fortnite (7550), is sora in fortnite (3900)
- [STALE] **gemini** → gemini 4 argon (12650), gemini 3.8 flash (9550), gemini argon (5150), gemini 3.7 flash (2300)
- [STALE] **perplexity** → best time to visit maldives (38800), top tourist attractions in paris (38650), how to bake a cake (35800), how to make sushi (35150)
- [2d] **cursor** → cursor ai (new), cursory (new), cursory definition (new), cursor download (new)
- [1d] **claude code** → codex vs claude code abraham quiros villalba (94700), apple smartring abraham quiros villalba (31250), abrahamquirosvillalba .com (29450), what does milliondollarthings.com sell (17050)
**创业雷达词表命中(PH/HN/Reddit)**
- What AI tools help me understand a MR?
- Show HN: Hob - Open-source, on device alternative to Claude Cowork and ChatGPT
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [7d] **portable air conditioner** → orvyla portable air conditioner (350), portable air conditioner pick up today (300), midea 12 000 btu duo smart inverter portable air conditioner (250), hisense portable air conditioner e5 code (250)
- [6d] **dehumidifier** → can you drink the water from a dehumidifier (300), does a dehumidifier cool the air (200), homedepot dehumidifier (130), can you drink water from a dehumidifier (130)
- [7d] **klimaanlage** → (空)
- [6d] **schimmel entfernen** → schimmel im badezimmer entfernen (46150), stockflecken entfernen wand (4650), schimmel aus textilien entfernen (3900), holzfenster schimmel entfernen (3900)
- [5d] **infrarotheizung** → könighaus infrarotheizung thermostat (113450), byecold infrarotheizung (49950), papermoon infrarotheizung (48250), steinfeld infrarotheizung (37500)
- [1d] **luftentfeuchter** → (空)
- [8d] **heizlüfter** → akku heizlüfter auto (73200), heizlüfter oder infrarotheizung (58250), 12 volt heizlüfter (53650), makita heizlüfter (44300) · 另 1 条储能词已隐藏(品类已下架,不作选题)
- [4d] **kaffeevollautomat** → krups kaffeevollautomat intensity milk (14100), philips series 5500 kaffeevollautomat ep5547/90 (10250), siemens te651509de eq.6 plus s100 kaffeevollautomat (10150), siemens kaffeevollautomat eq.6 plus s300 te653501de (9800)
- [3d] **akku staubsauger** → sky scanner (17950), levoit akku staubsauger lvac 200 max (800), dyson cool ventilator (160), grundig akku staubsauger (130)
- [2d] **matratze** → (空)
- [6d] **condizionatore portatile** → condizionatore portatile senza tubo (new), condizionatore portatile 12000 btu (new), condizionatore portatile con tubo (new), condizionatore portatile silenzioso (new)
- [5d] **deumidificatore** → deumidificatore unieuro (new), deumidificatore industriale (new)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **23** / covered 19 · heat: measured 2026-10-28 (12 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=byecold infrarotheizung
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=papermoon infrarotheizung
- kind=value · match=0.5 · page=guide/akku-heizluefter.html · q=makita heizlüfter
**第一方需求**:`{"zero_hit_records": 0}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-10-13,15 天前,锚 heizlüfter)
| 词 | 峰值 | 峰值月 | 距峰值月 | 冬÷九月 | 标题覆盖页 | 状态 |
|---|---|---|---|---|---|---|
| wandheizung | 4.3 | 10 月 | 本月 | 0.96 | 0 | 已裁定:装修题(埋墙),非联盟可买形态(2026-09-24) |
| luftfeuchtigkeit senken | 2.3 | 10 月 | 本月 | 1.04 | 1 | 已覆盖 1 页 |
| heizkosten sparen | 0.9 | 10 月 | 本月 | 0.37 | 0 | 量太小(峰值 <2.0) |
| kaffeevollautomat | 146.6 | 11 月 | 4 天 | 1.41 | 0 | 已裁定:站外(礼品季大词)(2026-09-15) |
| saugroboter | 57.8 | 11 月 | 4 天 | 1.23 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| akku staubsauger | 55.1 | 11 月 | 4 天 | 1.31 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| luftentfeuchter | 31.9 | 11 月 | 4 天 | 1.2 | 18 | 已覆盖 18 页 |
| heizlüfter | 27.1 | 11 月 | 4 天 | 0.83 | 5 | 已覆盖 5 页 |
| heizstrahler | 18.7 | 11 月 | 4 天 | 0.86 | 0 | 已裁定:扩到已排名页 heizluefter-stromverbrauch;独立页可进扩展队列,须先过 SERP 门(无测评,不点名型号)(2026-09-24) |
| fussbodenheizung | 15.0 | 11 月 | 4 天 | 1.18 | 0 | 已裁定:装修题,非联盟可买形态(2026-09-15) |
| heizung einstellen | 8.1 | 11 月 | 4 天 | 1.0 | 0 | 已裁定:红海(Utopia/ÖKO-TEST/heizung.de/heizsparer/MVV)(2026-08-05) |
| saugwischer | 8.0 | 11 月 | 4 天 | 1.38 | 0 | 已裁定:Bodenpflege 判负(峰值 3,2 / 56 天 1 pv)(2026-09-15) |
| heizkörper thermostat | 5.8 | 11 月 | 4 天 | 1.01 | 1 | 已裁定:红海;租客角度已在 heizkosten-senken-als-mieter(2026-08-05) |
| fenster beschlagen | 5.3 | 11 月 | 4 天 | 1.92 | 2 | 已覆盖 2 页 |
| zugluft | 3.2 | 11 月 | 4 天 | 1.14 | 2 | 已覆盖 2 页 |
| richtig heizen | 2.8 | 11 月 | 4 天 | 1.12 | 0 | **未覆盖 · 待过三门** |
| wäsche trocknen wohnung | 0.9 | 11 月 | 4 天 | 2.14 | 1 | 量太小(峰值 <2.0) |
| luftbefeuchter | 21.3 | 12 月 | 34 天 | 2.68 | 3 | 已覆盖 3 页 |
| heizdecke | 20.9 | 12 月 | 34 天 | 1.39 | 1 | 已覆盖 1 页 |
| schimmel wand | 11.6 | 12 月 | 34 天 | 2.71 | 1 | 已覆盖 1 页 |
| schimmel fenster | 4.6 | 12 月 | 34 天 | 4.09 | 1 | 已覆盖 1 页 |
| fenster abdichten | 3.0 | 12 月 | 34 天 | 1.02 | 2 | 已覆盖 2 页 |
| schwarzer schimmel | 2.9 | 12 月 | 34 天 | 1.56 | 0 | 已裁定:菌种/健康声明边界;扩展条件挂 eco-schimmel-fenster-1213(2026-09-09) |
| schimmel schlafzimmer | 2.2 | 12 月 | 34 天 | 4.97 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
| schimmel tapete | 2.2 | 12 月 | 34 天 | 2.42 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-10-04;blocked 1 · built 11 · gated 1 · queued 2 · rejected 9 · removed 1 · withdrawn 2;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
- `hygrometer-testen-salz` — Luftfeuchtigkeit richtig messen: wohin das Hygrometer gehört und wie du es mit Salz prüfst · 待办:SERP done 2026-09-27 on 'luftfeuchtigkeit messen' (writable with the coldest-wall angle). Remaining gap: cite the ~75 % saturated-salt figure from a primary or 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Black Friday 2026-11-27(30 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

## buysomething
**Trends rising(逐 seed 时效)**
- [2d] **electric spin scrubber** → voweek electric spin scrubber (350), easy scrub (200), homitt electric spin scrubber (70), ykyi electric spin scrubber (60)
- [1d] **portable carpet cleaner** → shark stain striker hair pro (17950), little green® hydrosteam® pet portable carpet cleaner (5050), bissell 3624 spot clean professional portable carpet cleaner (2850), best carpet cleaner (110)
- [1d] **flip straw water bottle** → brumate water bottle (300), brumate (300), brumate era flip (250), owala water bottle (170)
- [STALE] **heatless curls** → kitch (32600), how to use heatless curlers (24500), sleepy tie hair (13800), heatless curl headband (13050)
- [STALE] **high speed hair dryer** → conair infiniti pro hair dryer (300)
- [STALE] **mini massage gun** → mini massage gun nearby (new), mini massage gun amazon (new), mini massage gun near me (new), mini massage gun for travel (new)
- [STALE] **leg compression boots** → therabody leg compression (200), costco compression boots (200), best leg compression boots (80)
- [STALE] **solar camping lights** → solar powered camping lights (50)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **0** / covered 0 · heat: measured 2026-10-28 (0 pages); no notes
**第一方需求**:`{"picks": {"led-mask": {"open": 1, "out": 0}}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- Show HN: Glider 4.0 Unofficial Web Edition (Mac game port)
- Show HN: Ultimidi – piano learning web game
- Show HN: Castellan – A real-time strategy game for agents
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [8d] **labubu** → cat mode labubu (37350), lets try the viral crumbl labubu (18550), labubu cat mode on (13450), savannah guthrie (2550)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [STALE] **pdf accessibility** → how to bake a cake (1300), best time to visit maldives (1250), cheapest flights to tokyo (900), best laptop for work (850)
- [STALE] **pdf remediation** → (空)
- [STALE] **compare pdf** → cheapest flights to tokyo (9100), compare and contrast essay examples pdf (1500), how to bake a cake (1450), how to make sushi (600)
- [8d] **jellycat** → jellycat bizzlestomp bear (3700), jellycat gargoyle (2650), jellycat halloween collection 2026 (1900), bizzlestomp bear jellycat (1700)
- [7d] **sonny angel** → uggs (9200), parke sweatshirt (7450), sonny angel advent calendar 2026 (1550), sonny angel advent calendar (950)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **17** / covered 8 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.333 · page=index.html · q=lets try the viral crumbl labubu
- kind=value · match=0.5 · page=series/sonny-angel-animal-series-1.html · q=jellycat bizzlestomp bear
- kind=value · match=0.5 · page=index.html · q=jellycat gargoyle

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
- 候选 11 · 趋势主题重合 0 · 重现 0 · 已有人做 0(生成 2026-10-27;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- 旧字段 demand-confirmed 仅指与 Google Trends 的主题重合，不代表客户确认、独立买家数或付费意愿；以下候选仍须读取原帖和核验客户行动。
- [scout] samsamelo silicon valley selling trolley problem lies no link · 1 天 · 站 -
- [scout] when can we trust ai in coding and avoid the happy path issue · 1 天 · 站 -
- [scout] update anthropic s non existant customer support · 1 天 · 站 -
- [scout] did crates io stop processing new crate publishes · 1 天 · 站 -
- [scout] is there a credible gut health test out there · 1 天 · 站 -
- [scout] can we do something about this impending ai dystopia · 1 天 · 站 -
- [scout] feature request manager · 1 天 · 站 -
- [scout] firefox add on to block the new credentials fill in behavior · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **25** 次 / 真人 pv 57677,剔除已标记噪音站 4728(快照 2026-10-27;09-12 手测基线 69)
- 其中 claude.ai **4** 次(可能含舰队自己在 claude.ai/code 里的点击,分不开所以不剔除;不含它是 21 次。判定线照旧读合计)
- baipiaoji: 12 / 591 pv · www.perplexity.ai 10, chatgpt.com 1, copilot.microsoft.com 1
- agiscorecard: 7 / 50860 pv · claude.ai 4, kagi.com 3 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- gamesledger: 2 / 559 pv · kagi.com 2
- getecoback: 1 / 533 pv · www.perplexity.ai 1
- thedollscout: 1 / 231 pv · chatgpt.com 1
- gridlings: 1 / 2132 pv · https://www.doubao.com/chat/38434391899399426 1
- buysomething: 1 / 416 pv · https://source.agiscorecard.com/?utm_source=chatgpt.com 1
- goldrush: 0 / 266 pv · —
- after35: 0 / 466 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 241 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 238 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 226 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 456 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 462 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-10-27,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 7/558 = 1.3% · baipiaoji 19/591 = 3.2% · getecoback 1/244 = 0.4% · thedollscout 1/23 = 4.3% · gridlings 1/140 = 0.7% · gamesledger 2/51 = 3.9%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-10-27):search 1543 · ai 31 · fleet 139 · social 6 · self 8494 · direct 47348 · other 116
- baipiaoji: 搜索 566 / AI 19 / 舰队内 0 / 社交 2 / 直接 0 · Google 155 · 前三 cn.bing.com 301, google.com 155, bing.com 80
- agiscorecard: 搜索 390 / AI 7 / 舰队内 56 / 社交 3 / 直接 42703 · Google 262 · 前三 google.com 258, bing.com 47, duckduckgo.com 45
- getecoback: 搜索 239 / AI 1 / 舰队内 0 / 社交 1 / 直接 217 · Google 3 · 前三 duckduckgo.com 97, bing.com 79, ecosia.org 22
- gridlings: 搜索 122 / AI 1 / 舰队内 15 / 社交 0 / 直接 1642 · Google 76 · 前三 google.com 76, cn.bing.com 25, bing.com 12
- codeword: 搜索 34 / AI 0 / 舰队内 19 / 社交 0 / 直接 366 · Google 33 · 前三 google.com 33, baidu.com 1
- after35: 搜索 33 / AI 0 / 舰队内 1 / 社交 0 / 直接 337 · Google 31 · 前三 google.com 31, baidu.com 2
- gamesledger: 搜索 30 / AI 2 / 舰队内 17 / 社交 0 / 直接 444 · Google 4 · 前三 duckduckgo.com 15, google.com 4, bing.com 4
- fanzha: 搜索 26 / AI 0 / 舰队内 2 / 社交 0 / 直接 179 · Google 26 · 前三 google.com 26
- learn: 搜索 24 / AI 0 / 舰队内 2 / 社交 0 / 直接 190 · Google 24 · 前三 google.com 24
- powerbill: 搜索 23 / AI 0 / 舰队内 20 / 社交 0 / 直接 387 · Google 21 · 前三 google.com 21, baidu.com 1, duckduckgo.com 1
- thedollscout: 搜索 21 / AI 1 / 舰队内 0 / 社交 0 / 直接 187 · Google 5 · 前三 search.yahoo.com 7, google.com 5, bing.com 5
- firstjob: 搜索 17 / AI 0 / 舰队内 2 / 社交 0 / 直接 159 · Google 17 · 前三 google.com 17
- goldrush: 搜索 10 / AI 0 / 舰队内 5 / 社交 0 / 直接 210 · Google 10 · 前三 google.com 10
- buysomething: 搜索 8 / AI 0 / 舰队内 0 / 社交 0 / 直接 327 · Google 7 · 前三 google.com 7, baidu.com 1
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-10-27
- getecoback: 联盟点击 54 / 付费订单 0 / 订阅 1 · us-market 0 · amazon.com 6 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 3 · invest_tool_click — · /advertise pv 139 · /audits pv 55 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 140 · 厂商 biz 380 · 投稿累计 149 · watches 0 (endpoint)
- thedollscout: 联盟点击 0 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 178 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-10-27):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 2 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
