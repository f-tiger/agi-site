# 舰队需求摘要 · 2026-11-01

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 用户痛点雷达 → Jarvis 站点扩展

研究复核记录；不是实时 Reddit 抓取，也不是独立客户或付费验证。原始社区材料保留在私有工作记录。
每站最多一个待执行项；核验不足只派复核，已完成/进行中/阻塞/否决的任务不重复派发。

- **baipiaoji · 编程任务对应的额度、重置周期与续费选择** [hold]
  - ID: bpj-coding-quota-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核对现有选型页的新旧订阅分组、额度单位与重置规则；先确认官方方案适用人群，再补具体事实缺口。
  - 门槛/反证: status is done；原帖回复有相反体验；现有 BPJ 选型器已覆盖多数决策。官方方案可能区分新旧订阅，不能把旧套餐一律判错或批量覆盖。
- **agiscorecard · AI 结论缺少业务背景与来源支撑** [verify]
  - ID: agi-claim-context-20261031；原帖与日期门通过来源数: 1；复盘: 2026-11-07
  - 下一步: 用合成任务复核现有 Jarvis 的证据与不确定性输出；先确认是否存在可复现缺口。
  - 门槛/反证: fewer than two distinct current original sources；来源为代理商报告语境，与 AGI 使用者适配需要单独验证；一个帖子不是普遍需求。
- **baipiaoji · 试用、取消与续费条件核对** [verify]
  - ID: bpj-trial-terms-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核验官方试用、退款和取消规则，与现有 BPJ 数据字段比对后决定是否补齐。
  - 门槛/反证: fewer than two distinct current original sources；可能只需要链接官方帮助页，不需要新工具。
- **agiscorecard · 通用 AI 客户报告生成暂不扩建** [hold]
  - ID: agency-reporting-generic-20261031；原帖与日期门通过来源数: 2；复盘: 2026-11-14
  - 下一步: 仅保存反证；不建立新的代理商报告站或改变现有导师定位。
  - 门槛/反证: status is rejected；Swydo、AgencyAnalytics 与 Whatagraph 已覆盖通用 AI 报告；存在满意用户反证。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 1 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: ok, 1 条
- producthunt: ok, 30 条
- reddit_requests: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_vertical: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_wish: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- hn_ask: ok, 7 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 4 条
- 雷达快照日期:2026-10-31(1 天前)

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 403 text/html; charset=UTF-8 5659B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5781B
- yc_rfs: HTTP 200 text/html; charset=utf-8 97637B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 60089B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1019B
- lemmy_world_search: HTTP 200 application/json 8356B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑50 · lemmy:selfhosted · Looking for a tool for browsing contents of unmounted cold storage — https://feddit.org/post/37319624
- ↑8 · ask_hn · Are Knuth's Stanford Pages Down? — https://news.ycombinator.com/item?id=50294929
- ↑7 · ask_hn · Can we do something about this impending AI dystopia — https://news.ycombinator.com/item?id=50256342
- ↑4 · ask_hn · Alternative to Tldraw Draw Fast? — https://news.ycombinator.com/item?id=50280452
- ↑2 · ask_hn · Everything I post doesn't go through — https://news.ycombinator.com/item?id=50294446
- ↑1 · ask_hn · Do u think there should be a auto recovery tool for agents? — https://news.ycombinator.com/item?id=50266077
- ↑1 · ask_hn · I'm surprised Claude doesn't cite well — https://news.ycombinator.com/item?id=50266461
- ↑1 · ask_hn · Did crates.io stop processing new crate publishes? — https://news.ycombinator.com/item?id=50240115
- ↑0 · softwarerecs · Feature Request Manager — https://softwarerecs.stackexchange.com/questions/95722/feature-request-manager

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [3d] **artificial general intelligence** → artificial general intelligence definition (new), artificial general intelligence (agi) (new), artificial general intelligence examples (new), artificial general intelligence stocks (new)
- [3d] **agi timeline** → agi timeline graph (new)
- [2d] **13f filings** → 13f filings list (new)
- [2d] **ai stocks** → ai stocks to buy (new), ai stocks today (new), ai stocks to invest in (new), ai stocks down (new)
**创业雷达词表命中(PH/HN/Reddit)**
- SpaceO
- Backenly
- Pluto Door
- telemetry.dev
- GitHub Copilot Fusion
- AC Bridge
- Coding Wrapped
- SpeakON Agent
**autopilot 需求队列**:gaps **4** / covered 11 · heat: measured 2026-11-01 (0 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=autocomplete-new · match=0.475 · page=will-china-beat-us-to-agi.html · q=ai stocks down
- kind=autocomplete-new · match=0.475 · page=invest.html · q=ai stocks crash
- kind=autocomplete-new · match=0.475 · page=invest.html · q=ai stocks list
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 21, "q": "tool:portfolio_returns"}, {"n": 9, "q": "tool:sunwatch_ledger"}, {"n": 9, "q": "tool:invest_positions"}, {"n": 8, "q": "tool:verdicts"}, {"n": `

## baipiaoji
**Trends rising(逐 seed 时效)**
- [6d] **deepseek** → deepseek ai (new), deepseek api (new), deepseek v4.1 flash (new), deepseek harness desktop (new)
- [STALE] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [STALE] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [5d] **sora** → sora release date fortnite speculation (9000), when does sora come to fortnite (8650), when will sora be in fortnite (7550), is sora in fortnite (3900)
- [4d] **gemini** → gemini ai (new), gemini notebook (new), gemini columbus ohio (new), gemini google (new)
- [4d] **perplexity** → best time to visit maldives (69600), how to bake a cake (66200), top tourist attractions in paris (65000), cheapest flights to tokyo (55650)
- [6d] **cursor** → cursor ai (new), cursory (new), cursory definition (new), cursor download (new)
- [5d] **claude code** → codex vs claude code abraham quiros villalba (94700), apple smartring abraham quiros villalba (31250), abrahamquirosvillalba .com (29450), what does milliondollarthings.com sell (17050)
**创业雷达词表命中(PH/HN/Reddit)**
- GitHub Copilot Fusion
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [10d] **condizionatore portatile** → condizionatore portatile senza tubo (new), condizionatore portatile 12000 btu (new), condizionatore portatile con tubo (new), condizionatore portatile silenzioso (new)
- [9d] **deumidificatore** → deumidificatore unieuro (new), deumidificatore industriale (new)
- [2d] **klimaanlage** → constantin schreiber axel springer (5050), unfall italien bus wohnmobil (900), heizen mit klimaanlage (300), bodenkonsole klimaanlage (200)
- [1d] **schimmel entfernen** → (空)
- [1d] **infrarotheizung** → könighaus infrarotheizung thermostat (110550), heizlüfter oder infrarotheizung (59800), papermoon infrarotheizung (44050), infrarotheizung schreibtisch (40800)
- [4d] **luftentfeuchter** → pattex luftentfeuchter (53050), meacodry arete one 12l (28750), pingi luftentfeuchter (20700), luftentfeuchter kissen auto (13850)
- [3d] **heizlüfter** → (空)
- [8d] **kaffeevollautomat** → krups kaffeevollautomat intensity milk (14100), philips series 5500 kaffeevollautomat ep5547/90 (10250), siemens te651509de eq.6 plus s100 kaffeevollautomat (10150), siemens kaffeevollautomat eq.6 plus s300 te653501de (9800)
- [7d] **akku staubsauger** → sky scanner (17950), levoit akku staubsauger lvac 200 max (800), dyson cool ventilator (160), grundig akku staubsauger (130)
- [6d] **matratze** → (空)
- [STALE] **portable air conditioner** → orvyla portable air conditioner (350), portable air conditioner pick up today (300), midea 12 000 btu duo smart inverter portable air conditioner (250), hisense portable air conditioner e5 code (250)
- [10d] **dehumidifier** → can you drink the water from a dehumidifier (300), does a dehumidifier cool the air (200), homedepot dehumidifier (130), can you drink water from a dehumidifier (130)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **27** / covered 12 · heat: measured 2026-11-01 (19 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=guide/luftentfeuchter-10-qm.html · q=pattex luftentfeuchter
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=papermoon infrarotheizung
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=infrarot wandheizung
**第一方需求**:`{"zero_hit_records": 0}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-10-13,19 天前,锚 heizlüfter)
| 词 | 峰值 | 峰值月 | 距峰值月 | 冬÷九月 | 标题覆盖页 | 状态 |
|---|---|---|---|---|---|---|
| kaffeevollautomat | 146.6 | 11 月 | 本月 | 1.41 | 0 | 已裁定:站外(礼品季大词)(2026-09-15) |
| saugroboter | 57.8 | 11 月 | 本月 | 1.23 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| akku staubsauger | 55.1 | 11 月 | 本月 | 1.31 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| luftentfeuchter | 31.9 | 11 月 | 本月 | 1.2 | 17 | 已覆盖 17 页 |
| heizlüfter | 27.1 | 11 月 | 本月 | 0.83 | 5 | 已覆盖 5 页 |
| heizstrahler | 18.7 | 11 月 | 本月 | 0.86 | 0 | 已裁定:扩到已排名页 heizluefter-stromverbrauch;独立页可进扩展队列,须先过 SERP 门(无测评,不点名型号)(2026-09-24) |
| fussbodenheizung | 15.0 | 11 月 | 本月 | 1.18 | 0 | 已裁定:装修题,非联盟可买形态(2026-09-15) |
| heizung einstellen | 8.1 | 11 月 | 本月 | 1.0 | 0 | 已裁定:红海(Utopia/ÖKO-TEST/heizung.de/heizsparer/MVV)(2026-08-05) |
| saugwischer | 8.0 | 11 月 | 本月 | 1.38 | 0 | 已裁定:Bodenpflege 判负(峰值 3,2 / 56 天 1 pv)(2026-09-15) |
| heizkörper thermostat | 5.8 | 11 月 | 本月 | 1.01 | 1 | 已裁定:红海;租客角度已在 heizkosten-senken-als-mieter(2026-08-05) |
| fenster beschlagen | 5.3 | 11 月 | 本月 | 1.92 | 2 | 已覆盖 2 页 |
| zugluft | 3.2 | 11 月 | 本月 | 1.14 | 2 | 已覆盖 2 页 |
| richtig heizen | 2.8 | 11 月 | 本月 | 1.12 | 0 | **未覆盖 · 待过三门** |
| wäsche trocknen wohnung | 0.9 | 11 月 | 本月 | 2.14 | 1 | 量太小(峰值 <2.0) |
| luftbefeuchter | 21.3 | 12 月 | 30 天 | 2.68 | 3 | 已覆盖 3 页 |
| heizdecke | 20.9 | 12 月 | 30 天 | 1.39 | 1 | 已覆盖 1 页 |
| schimmel wand | 11.6 | 12 月 | 30 天 | 2.71 | 1 | 已覆盖 1 页 |
| schimmel fenster | 4.6 | 12 月 | 30 天 | 4.09 | 1 | 已覆盖 1 页 |
| fenster abdichten | 3.0 | 12 月 | 30 天 | 1.02 | 2 | 已覆盖 2 页 |
| schwarzer schimmel | 2.9 | 12 月 | 30 天 | 1.56 | 0 | 已裁定:菌种/健康声明边界;扩展条件挂 eco-schimmel-fenster-1213(2026-09-09) |
| schimmel schlafzimmer | 2.2 | 12 月 | 30 天 | 4.97 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
| schimmel tapete | 2.2 | 12 月 | 30 天 | 2.42 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-10-04;blocked 1 · built 11 · gated 1 · queued 2 · rejected 9 · removed 1 · withdrawn 2;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
- `hygrometer-testen-salz` — Luftfeuchtigkeit richtig messen: wohin das Hygrometer gehört und wie du es mit Salz prüfst · 待办:SERP done 2026-09-27 on 'luftfeuchtigkeit messen' (writable with the coldest-wall angle). Remaining gap: cite the ~75 % saturated-salt figure from a primary or 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Black Friday 2026-11-27(26 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

## buysomething
**Trends rising(逐 seed 时效)**
- [6d] **electric spin scrubber** → voweek electric spin scrubber (350), easy scrub (200), homitt electric spin scrubber (70), ykyi electric spin scrubber (60)
- [5d] **portable carpet cleaner** → shark stain striker hair pro (17950), little green® hydrosteam® pet portable carpet cleaner (5050), bissell 3624 spot clean professional portable carpet cleaner (2850), best carpet cleaner (110)
- [4d] **flip straw water bottle** → flip straw water bottle kids (new), flip straw water bottle with handle (new), flip straw water bottle stanley (new), flip straw water bottle o frio da estrada (new)
- [3d] **heatless curls** → heatless curls overnight (new)
- [2d] **high speed hair dryer** → infiniti pro conair hair dryer (160), infiniti pro conair (80)
- [1d] **mini massage gun** → mini massage gun nearby (new), mini massage gun amazon (new), mini massage gun near me (new), mini massage gun for travel (new)
- [1d] **leg compression boots** → best leg compression sleeves (75450), costco compression boots (200), costco (200), therabody leg compression (180)
- [STALE] **solar camping lights** → solar powered camping lights (50)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **2** / covered 0 · heat: measured 2026-11-01 (0 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.0 · page=None · q=costco compression boots
- kind=value · match=0.0 · page=None · q=costco
**第一方需求**:`{"picks": {"led-mask": {"open": 1, "out": 0}, "spin-scrubber": {"open": 1, "out": 0}}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- Show HN: To Honor Sir Patrick Stewart, Enjoy the TNG Episode Guessing Game
- Show HN: I built a multiplayer game where you're an aerial fighter cat
- Show HN: PicoPlayer – A tiny, open-source website for playing quality webgames
- Show HN: Tiberava – My Game is growing
- Show HN: Reduce: A Daily Puzzle
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [1d] **labubu** → cat mode labubu (61150), lets try the viral crumbl labubu (20550), labubu cat mode on (20200), savannah guthrie (10350)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [STALE] **pdf accessibility** → how to bake a cake (1300), best time to visit maldives (1250), cheapest flights to tokyo (900), best laptop for work (850)
- [STALE] **pdf remediation** → (空)
- [STALE] **compare pdf** → cheapest flights to tokyo (9100), compare and contrast essay examples pdf (1500), how to bake a cake (1450), how to make sushi (600)
- [1d] **jellycat** → jellycat bizzlestomp bear (21650), costco jellycat advent calendar (17050), jellycat advent calendar (4800), jellycat advent calendar 2026 (4250)
- [STALE] **sonny angel** → uggs (9200), parke sweatshirt (7450), sonny angel advent calendar 2026 (1550), sonny angel advent calendar (950)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **16** / covered 1 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.333 · page=rarity.html · q=cat mode labubu
- kind=value · match=0.5 · page=series/sonny-angel-animal-series-1.html · q=jellycat bizzlestomp bear
- kind=value · match=0.425 · page=for-agents.html · q=lets try the viral crumbl labubu

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
- 候选 9 · 趋势主题重合 0 · 重现 0 · 已有人做 0(生成 2026-10-31;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': True, 'reddit_access': 'public-json'})
- 旧字段 demand-confirmed 仅指与 Google Trends 的主题重合，不代表客户确认、独立买家数或付费意愿；以下候选仍须读取原帖和核验客户行动。
- [scout] looking for a tool for browsing contents of unmounted cold storage · 1 天 · 站 -
- [scout] can we do something about this impending ai dystopia · 1 天 · 站 -
- [scout] are knuth s stanford pages down · 1 天 · 站 -
- [scout] everything i post doesn t go through · 1 天 · 站 -
- [scout] alternative to tldraw draw fast · 1 天 · 站 -
- [scout] did crates io stop processing new crate publishes · 1 天 · 站 -
- [scout] i m surprised claude doesn t cite well · 1 天 · 站 -
- [scout] feature request manager · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **27** 次 / 真人 pv 62247,剔除已标记噪音站 5841(快照 2026-10-31;09-12 手测基线 69)
- 其中 claude.ai **4** 次(可能含舰队自己在 claude.ai/code 里的点击,分不开所以不剔除;不含它是 23 次。判定线照旧读合计)
- baipiaoji: 14 / 625 pv · www.perplexity.ai 12, chatgpt.com 1, copilot.microsoft.com 1
- agiscorecard: 6 / 54398 pv · claude.ai 4, kagi.com 2 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- gridlings: 3 / 2974 pv · https://www.doubao.com/ 2, https://www.doubao.com/chat/38434391899399426 1
- gamesledger: 3 / 602 pv · kagi.com 3
- buysomething: 1 / 459 pv · https://source.agiscorecard.com/?utm_source=chatgpt.com 1
- getecoback: 0 / 430 pv · —
- thedollscout: 0 / 240 pv · —
- goldrush: 0 / 511 pv · —
- after35: 0 / 486 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 201 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 205 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 186 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 477 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 453 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-10-31,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 6/536 = 1.1% · baipiaoji 23/625 = 3.7% · gridlings 3/67 = 4.5% · gamesledger 3/56 = 5.4%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-10-31):search 1444 · ai 35 · fleet 140 · social 6 · self 8884 · direct 51622 · other 116
- baipiaoji: 搜索 597 / AI 23 / 舰队内 0 / 社交 2 / 直接 0 · Google 178 · 前三 cn.bing.com 303, google.com 178, bing.com 86
- agiscorecard: 搜索 366 / AI 6 / 舰队内 57 / 社交 3 / 直接 45974 · Google 243 · 前三 google.com 240, duckduckgo.com 46, bing.com 40
- getecoback: 搜索 221 / AI 0 / 舰队内 0 / 社交 1 / 直接 140 · Google 3 · 前三 duckduckgo.com 96, bing.com 63, ecosia.org 22
- gridlings: 搜索 49 / AI 3 / 舰队内 15 / 社交 0 / 直接 2549 · Google 10 · 前三 cn.bing.com 19, bing.com 13, google.com 10
- gamesledger: 搜索 34 / AI 3 / 舰队内 17 / 社交 0 / 直接 476 · Google 6 · 前三 duckduckgo.com 16, google.com 6, bing.com 5
- after35: 搜索 33 / AI 0 / 舰队内 1 / 社交 0 / 直接 356 · Google 31 · 前三 google.com 31, baidu.com 2
- codeword: 搜索 26 / AI 0 / 舰队内 19 / 社交 0 / 直接 395 · Google 26 · 前三 google.com 26
- fanzha: 搜索 25 / AI 0 / 舰队内 2 / 社交 0 / 直接 147 · Google 25 · 前三 google.com 25
- learn: 搜索 24 / AI 0 / 舰队内 2 / 社交 0 / 直接 149 · Google 24 · 前三 google.com 24
- thedollscout: 搜索 22 / AI 0 / 舰队内 0 / 社交 0 / 直接 204 · Google 5 · 前三 search.yahoo.com 9, google.com 5, bing.com 4
- firstjob: 搜索 17 / AI 0 / 舰队内 2 / 社交 0 / 直接 126 · Google 17 · 前三 google.com 17
- powerbill: 搜索 15 / AI 0 / 舰队内 20 / 社交 0 / 直接 381 · Google 15 · 前三 google.com 15
- buysomething: 搜索 8 / AI 0 / 舰队内 0 / 社交 0 / 直接 341 · Google 7 · 前三 google.com 7, baidu.com 1
- goldrush: 搜索 7 / AI 0 / 舰队内 5 / 社交 0 / 直接 384 · Google 7 · 前三 google.com 7
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-10-31
- getecoback: 联盟点击 49 / 付费订单 0 / 订阅 1 · us-market 0 · amazon.com 5 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 3 · invest_tool_click — · /advertise pv 163 · /audits pv 69 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 151 · 厂商 biz 532 · 投稿累计 226 · watches 0 (endpoint)
- thedollscout: 联盟点击 0 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 155 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-10-31):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 1 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
