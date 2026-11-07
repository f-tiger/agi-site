# 舰队需求摘要 · 2026-11-07

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 用户痛点雷达 → Jarvis 站点扩展

研究复核记录；不是实时 Reddit 抓取，也不是独立客户或付费验证。原始社区材料保留在私有工作记录。
每站最多一个待执行项；核验不足只派复核，已完成/进行中/阻塞/否决的任务不重复派发。

- **baipiaoji · 编程任务对应的额度、重置周期与续费选择** [hold]
  - ID: bpj-coding-quota-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核对现有选型页的新旧订阅分组、额度单位与重置规则；先确认官方方案适用人群，再补具体事实缺口。
  - 门槛/反证: status is done；原帖回复有相反体验；现有 BPJ 选型器已覆盖多数决策。官方方案可能区分新旧订阅，不能把旧套餐一律判错或批量覆盖。
- **agiscorecard · AI 结论缺少业务背景与来源支撑** [hold]
  - ID: agi-claim-context-20261031；原帖与日期门通过来源数: 1；复盘: 2026-11-07
  - 下一步: 用合成任务复核现有 Jarvis 的证据与不确定性输出；先确认是否存在可复现缺口。
  - 门槛/反证: status is done；来源为代理商报告语境，与 AGI 使用者适配需要单独验证；一个帖子不是普遍需求。
- **baipiaoji · 试用、取消与续费条件核对** [hold]
  - ID: bpj-trial-terms-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核验官方试用、退款和取消规则，与现有 BPJ 数据字段比对后决定是否补齐。
  - 门槛/反证: status is done；可能只需要链接官方帮助页，不需要新工具。
- **agiscorecard · 通用 AI 客户报告生成暂不扩建** [hold]
  - ID: agency-reporting-generic-20261031；原帖与日期门通过来源数: 2；复盘: 2026-11-14
  - 下一步: 仅保存反证；不建立新的代理商报告站或改变现有导师定位。
  - 门槛/反证: status is rejected；Swydo、AgencyAnalytics 与 Whatagraph 已覆盖通用 AI 报告；存在满意用户反证。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 1 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — is there an app The operation was aborted due to timeout
- producthunt: ok, 30 条
- reddit_requests: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_vertical: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_wish: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- hn_ask: ok, 4 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 3 条
- 雷达快照日期:2026-11-06(1 天前)

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 403 text/html; charset=UTF-8 5659B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5759B
- yc_rfs: HTTP 200 text/html; charset=utf-8 96695B
- reddit_rss_public: HTTP 200 application/atom+xml; charset=UTF-8 51171B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 379B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1254B
- lemmy_world_search: HTTP 200 application/json 7014B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑6 · ask_hn · Are you building an AI company brain? — https://news.ycombinator.com/item?id=50379710
- ↑2 · ask_hn · What do you call Holy Grail mania risk? — https://news.ycombinator.com/item?id=50361108
- ↑1 · ask_hn · uBlock Origin for the IoT devices in my house? — https://news.ycombinator.com/item?id=50333058
- ↑1 · ask_hn · Sell a developer problem that LLM's can't solve? — https://news.ycombinator.com/item?id=50326374
- ↑0 · softwarerecs · Can the WhatsApp Business Calling API initiate calls using a Canadian business phone number? — https://softwarerecs.stackexchange.com/questions/95755/can-the-whatsapp-business-calling-api-initiate-calls-using-a-canadian-business-p

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [9d] **artificial general intelligence** → artificial general intelligence definition (new), artificial general intelligence (agi) (new), artificial general intelligence examples (new), artificial general intelligence stocks (new)
- [9d] **agi timeline** → agi timeline graph (new)
- [8d] **13f filings** → 13f filings list (new)
- [8d] **ai stocks** → ai stocks to buy (new), ai stocks today (new), ai stocks to invest in (new), ai stocks down (new)
**创业雷达词表命中(PH/HN/Reddit)**
- Rankfender v3.0
- Cloptima
- Wonder Dev View
- Tobira Site Agent
- Thunderduck Inc.
- Alysis Code
- crystl
- Sell a developer problem that LLM's can't solve?
**autopilot 需求队列**:gaps **4** / covered 11 · heat: measured 2026-11-07 (3 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=autocomplete-new · match=0.475 · page=will-china-beat-us-to-agi.html · q=ai stocks down
- kind=autocomplete-new · match=0.475 · page=invest.html · q=ai stocks crash
- kind=autocomplete-new · match=0.475 · page=invest.html · q=ai stocks list
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 25, "q": "tool:portfolio_returns"}, {"n": 8, "q": "tool:verdicts"}, {"n": 8, "q": "tool:thesis_tracker"}, {"n": 8, "q": "tool:sunwatch_ledger"}, {"n": 8,`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [1d] **deepseek** → deepseek super agent (new), deepseek harness github (new)
- [STALE] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [STALE] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [STALE] **sora** → sora release date fortnite speculation (9000), when does sora come to fortnite (8650), when will sora be in fortnite (7550), is sora in fortnite (3900)
- [10d] **gemini** → gemini ai (new), gemini notebook (new), gemini columbus ohio (new), gemini google (new)
- [10d] **perplexity** → best time to visit maldives (69600), how to bake a cake (66200), top tourist attractions in paris (65000), cheapest flights to tokyo (55650)
- [1d] **cursor** → cursor careers (new)
- [STALE] **claude code** → codex vs claude code abraham quiros villalba (94700), apple smartring abraham quiros villalba (31250), abrahamquirosvillalba .com (29450), what does milliondollarthings.com sell (17050)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [5d] **condizionatore portatile** → condizionatore portatile euronics (new)
- [4d] **deumidificatore** → deumidificatore per asciugare i panni (35950), umidificatore ambiente (19200), deumidificatore chicco (13500), consuma di piu aria condizionata o deumidificatore (7700)
- [8d] **klimaanlage** → constantin schreiber axel springer (5050), unfall italien bus wohnmobil (900), heizen mit klimaanlage (300), bodenkonsole klimaanlage (200)
- [7d] **schimmel entfernen** → (空)
- [6d] **infrarotheizung** → infrarotheizung wandmontage (88250), ölradiator (65750), byecold infrarotheizung (41400), infrarotheizung wintergarten (39700)
- [1d] **luftentfeuchter** → avreno (31050), vivosun luftentfeuchter (28600), luftentfeuchter keller ohne strom (20500), meacodry arete two 25l (14500)
- [1d] **heizlüfter** → akku heizung (65900), frostwächter (55450), dreo atom 316 (44100), heizlüfter fürs bad (43400)
- [5d] **kaffeevollautomat** → siemens te651509de eq.6 plus s100 kaffeevollautomat (12100), philips series 5500 kaffeevollautomat ep5547/90 (10650), siemens eq.6 plus s700 te657m03de kaffeevollautomat (7900), wmf perfection 840l kaffeevollautomat (6750)
- [4d] **akku staubsauger** → (空)
- [3d] **matratze** → (空)
- [6d] **portable air conditioner** → portable air conditioner pick up today (300), hisense portable air conditioner e5 (300), cybertake s2 pro portable air conditioner (250), hisense portable air conditioner e5 code (250)
- [5d] **dehumidifier** → dehumidifier for basement (new), dehumidifier for home (new), dehumidifier for house (new), dehumidifier for bathroom (new)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **24** / covered 15 · heat: measured 2026-11-07 (18 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=infrarotheizung wandmontage
- kind=value · match=0.5 · page=guide/akku-heizluefter.html · q=leiser heizlüfter
- kind=value · match=0.5 · page=guide/heizkosten-vergleich-rechner.html · q=byecold infrarotheizung
**第一方需求**:`{"zero_hit_records": 0}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-10-13,25 天前,锚 heizlüfter)
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
| luftbefeuchter | 21.3 | 12 月 | 24 天 | 2.68 | 3 | 已覆盖 3 页 |
| heizdecke | 20.9 | 12 月 | 24 天 | 1.39 | 1 | 已覆盖 1 页 |
| schimmel wand | 11.6 | 12 月 | 24 天 | 2.71 | 1 | 已覆盖 1 页 |
| schimmel fenster | 4.6 | 12 月 | 24 天 | 4.09 | 1 | 已覆盖 1 页 |
| fenster abdichten | 3.0 | 12 月 | 24 天 | 1.02 | 2 | 已覆盖 2 页 |
| schwarzer schimmel | 2.9 | 12 月 | 24 天 | 1.56 | 0 | 已裁定:菌种/健康声明边界;扩展条件挂 eco-schimmel-fenster-1213(2026-09-09) |
| schimmel schlafzimmer | 2.2 | 12 月 | 24 天 | 4.97 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
| schimmel tapete | 2.2 | 12 月 | 24 天 | 2.42 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-11-06;blocked 1 · built 11 · gated 1 · queued 1 · rejected 9 · removed 1 · withdrawn 3;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Black Friday 2026-11-27(20 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

## buysomething
**Trends rising(逐 seed 时效)**
- [STALE] **electric spin scrubber** → voweek electric spin scrubber (350), easy scrub (200), homitt electric spin scrubber (70), ykyi electric spin scrubber (60)
- [STALE] **portable carpet cleaner** → shark stain striker hair pro (17950), little green® hydrosteam® pet portable carpet cleaner (5050), bissell 3624 spot clean professional portable carpet cleaner (2850), best carpet cleaner (110)
- [10d] **flip straw water bottle** → flip straw water bottle kids (new), flip straw water bottle with handle (new), flip straw water bottle stanley (new), flip straw water bottle o frio da estrada (new)
- [9d] **heatless curls** → heatless curls overnight (new)
- [8d] **high speed hair dryer** → infiniti pro conair hair dryer (160), infiniti pro conair (80)
- [7d] **mini massage gun** → mini massage gun nearby (new), mini massage gun amazon (new), mini massage gun near me (new), mini massage gun for travel (new)
- [6d] **leg compression boots** → costco (250), best leg compression sleeves (250), compression boots for legs (190), therabody (150)
- [5d] **solar camping lights** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **1** / covered 0 · heat: measured 2026-11-07 (0 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.0 · page=None · q=costco
**第一方需求**:`{"picks": {"led-mask": {"open": 1, "out": 0}, "spin-scrubber": {"open": 1, "out": 0}}}`

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- Show HN: An aquarium game with a real nitrogen cycle
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [7d] **labubu** → cat mode labubu (61150), lets try the viral crumbl labubu (20550), labubu cat mode on (20200), savannah guthrie (10350)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [STALE] **pdf accessibility** → how to bake a cake (1300), best time to visit maldives (1250), cheapest flights to tokyo (900), best laptop for work (850)
- [STALE] **pdf remediation** → (空)
- [STALE] **compare pdf** → cheapest flights to tokyo (9100), compare and contrast essay examples pdf (1500), how to bake a cake (1450), how to make sushi (600)
- [7d] **jellycat** → jellycat bizzlestomp bear (21650), costco jellycat advent calendar (17050), jellycat advent calendar (4800), jellycat advent calendar 2026 (4250)
- [6d] **sonny angel** → shu uemura sonny angel (23850), shu uemura (21200), sonny angel advent calendar 2026 (1450), sonny angel advent calendar (900)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **20** / covered 6 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.333 · page=rarity.html · q=cat mode labubu
- kind=value · match=0.5 · page=zh/index.html · q=shu uemura sonny angel
- kind=value · match=0.5 · page=series/sonny-angel-animal-series-1.html · q=jellycat bizzlestomp bear

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
- 候选 5 · 趋势主题重合 0 · 重现 0 · 已有人做 0(生成 2026-11-06;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- 旧字段 demand-confirmed 仅指与 Google Trends 的主题重合，不代表客户确认、独立买家数或付费意愿；以下候选仍须读取原帖和核验客户行动。
- [scout] are you building an ai company brain · 1 天 · 站 -
- [scout] ublock origin for the iot devices in my house · 1 天 · 站 -
- [scout] sell a developer problem that llm s can t solve · 1 天 · 站 -
- [scout] what do you call holy grail mania risk · 1 天 · 站 -
- [scout] can the whatsapp business calling api initiate calls using a canadian business p · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **23** 次 / 真人 pv 58273,剔除已标记噪音站 6118(快照 2026-11-06;09-12 手测基线 69)
- 其中 claude.ai **2** 次(可能含舰队自己在 claude.ai/code 里的点击,分不开所以不剔除;不含它是 21 次。判定线照旧读合计)
- baipiaoji: 13 / 619 pv · www.perplexity.ai 13
- agiscorecard: 3 / 49951 pv · claude.ai 2, kagi.com 1 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- gridlings: 3 / 3096 pv · https://www.doubao.com/ 2, https://www.doubao.com/chat/38434391899399426 1
- gamesledger: 2 / 668 pv · kagi.com 2
- getecoback: 1 / 359 pv · www.perplexity.ai 1
- buysomething: 1 / 446 pv · https://source.agiscorecard.com/?utm_source=chatgpt.com 1
- thedollscout: 0 / 295 pv · —
- goldrush: 0 / 635 pv · —
- after35: 0 / 483 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 233 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 225 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 221 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 534 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 508 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-11-06,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 3/472 = 0.6% · baipiaoji 26/619 = 4.2% · getecoback 1/203 = 0.5% · gridlings 3/55 = 5.5% · gamesledger 2/58 = 3.4%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-11-06):search 1329 · ai 35 · fleet 132 · social 8 · self 10099 · direct 46538 · other 132
- baipiaoji: 搜索 573 / AI 26 / 舰队内 0 / 社交 5 / 直接 0 · Google 168 · 前三 cn.bing.com 290, google.com 168, bing.com 87
- agiscorecard: 搜索 306 / AI 3 / 舰队内 55 / 社交 3 / 直接 40903 · Google 187 · 前三 google.com 184, duckduckgo.com 46, bing.com 37
- getecoback: 搜索 200 / AI 1 / 舰队内 0 / 社交 0 / 直接 109 · Google 2 · 前三 duckduckgo.com 88, bing.com 54, ecosia.org 22
- gamesledger: 搜索 39 / AI 2 / 舰队内 15 / 社交 0 / 直接 480 · Google 9 · 前三 duckduckgo.com 20, google.com 9, bing.com 5
- gridlings: 搜索 34 / AI 3 / 舰队内 15 / 社交 0 / 直接 2482 · Google 0 · 前三 bing.com 14, cn.bing.com 11, duckduckgo.com 3
- after35: 搜索 33 / AI 0 / 舰队内 1 / 社交 0 / 直接 309 · Google 31 · 前三 google.com 31, baidu.com 2
- codeword: 搜索 27 / AI 0 / 舰队内 17 / 社交 0 / 直接 384 · Google 26 · 前三 google.com 26, m.baidu.com 1
- fanzha: 搜索 25 / AI 0 / 舰队内 2 / 社交 0 / 直接 150 · Google 25 · 前三 google.com 25
- thedollscout: 搜索 24 / AI 0 / 舰队内 0 / 社交 0 / 直接 251 · Google 8 · 前三 search.yahoo.com 9, google.com 8, bing.com 4
- learn: 搜索 24 / AI 0 / 舰队内 2 / 社交 0 / 直接 145 · Google 24 · 前三 google.com 24
- firstjob: 搜索 19 / AI 0 / 舰队内 2 / 社交 0 / 直接 123 · Google 19 · 前三 google.com 19
- powerbill: 搜索 16 / AI 0 / 舰队内 18 / 社交 0 / 直接 372 · Google 15 · 前三 google.com 15, m.baidu.com 1
- goldrush: 搜索 8 / AI 0 / 舰队内 5 / 社交 0 / 直接 494 · Google 8 · 前三 google.com 8
- buysomething: 搜索 1 / AI 0 / 舰队内 0 / 社交 0 / 直接 336 · Google 0 · 前三 baidu.com 1
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-11-06
- getecoback: 联盟点击 45 / 付费订单 0 / 订阅 1 · us-market 0 · amazon.com 3 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 3 · invest_tool_click — · /advertise pv 148 · /audits pv 85 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 145 · 厂商 biz 620 · 投稿累计 278 · watches 0 (endpoint)
- thedollscout: 联盟点击 0 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 124 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-11-06):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 1 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
