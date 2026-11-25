# 舰队需求摘要 · 2026-11-25

零 AI 汇总;每条带日期;它是**选题输入不是选题依据**,任何由此引出的页面仍过三门(数据/需求/变现)。

## 用户痛点雷达 → Jarvis 站点扩展

研究复核记录；不是实时 Reddit 抓取，也不是独立客户或付费验证。原始社区材料保留在私有工作记录。
每站最多一个待执行项；核验不足只派复核，已完成/进行中/阻塞/否决的任务不重复派发。

- **baipiaoji · 编程任务对应的额度、重置周期与续费选择** [hold]
  - ID: bpj-coding-quota-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核对现有选型页的新旧订阅分组、额度单位与重置规则；先确认官方方案适用人群，再补具体事实缺口。
  - 门槛/反证: status is done；原帖回复有相反体验；现有 BPJ 选型器已覆盖多数决策。官方方案可能区分新旧订阅，不能把旧套餐一律判错或批量覆盖。
- **agiscorecard · AI 结论缺少业务背景与来源支撑** [hold]
  - ID: agi-claim-context-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 用合成任务复核现有 Jarvis 的证据与不确定性输出；先确认是否存在可复现缺口。
  - 门槛/反证: status is done；来源为代理商报告语境，与 AGI 使用者适配需要单独验证；一个帖子不是普遍需求。
- **baipiaoji · 试用、取消与续费条件核对** [hold]
  - ID: bpj-trial-terms-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-07
  - 下一步: 核验官方试用、退款和取消规则，与现有 BPJ 数据字段比对后决定是否补齐。
  - 门槛/反证: status is done；可能只需要链接官方帮助页，不需要新工具。
- **agiscorecard · 通用 AI 客户报告生成暂不扩建** [hold]
  - ID: agency-reporting-generic-20261031；原帖与日期门通过来源数: 0；复盘: 2026-11-14
  - 下一步: 仅保存反证；不建立新的代理商报告站或改变现有导师定位。
  - 门槛/反证: status is rejected；Swydo、AgencyAnalytics 与 Whatagraph 已覆盖通用 AI 报告；存在满意用户反证。

## 源状态(抓不到就写出来,不复用旧数据)
- softwarerecs: ok, 4 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — zero request-shaped posts this week
- producthunt: ok, 30 条
- reddit_requests: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_vertical: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_wish: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- hn_ask: ok, 3 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 2 条
- 雷达快照日期:2026-11-24(1 天前)

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 403 text/html; charset=UTF-8 5659B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5759B
- yc_rfs: HTTP 200 text/html; charset=utf-8 98149B
- reddit_rss_public: HTTP 404 application/atom+xml; charset=UTF-8 266B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 380B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1134B
- lemmy_world_search: HTTP 200 application/json 28416B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑3 · ask_hn · Is there a way to get a human at OpenAI support? — https://news.ycombinator.com/item?id=50620290
- ↑3 · ask_hn · Windows malware removal in Bay Area — https://news.ycombinator.com/item?id=50551096
- ↑3 · softwarerecs · What screenshot software allows the user to capture solely a specific window? — https://softwarerecs.stackexchange.com/questions/95798/what-screenshot-software-allows-the-user-to-capture-solely-a-specific-window
- ↑1 · ask_hn · How to make Three.js support real-time path tracing? — https://news.ycombinator.com/item?id=50601473
- ↑0 · softwarerecs · Looking for the Best Battery App — https://softwarerecs.stackexchange.com/questions/95817/looking-for-the-best-battery-app
- ↑0 · softwarerecs · How to Transfer Photos from iCloud Photos to Google Drive — https://softwarerecs.stackexchange.com/questions/95812/how-to-transfer-photos-from-icloud-photos-to-google-drive
- ↑0 · softwarerecs · What software can help me organize and manage personal files stored across multiple cloud storage services? — https://softwarerecs.stackexchange.com/questions/95804/what-software-can-help-me-organize-and-manage-personal-files-stored-across-multi

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [5d] **artificial general intelligence** → (空)
- [5d] **agi timeline** → (空)
- [4d] **13f filings** → when are 13f filings due (420250)
- [4d] **ai stocks** → top tourist attractions in paris (45100), how to bake a cake (37350), cheapest flights to tokyo (33850), how to make sushi (32800)
**创业雷达词表命中(PH/HN/Reddit)**
- Cullman
- Granular.Build
- Viktor Code
- tday.com
- Claude Ship
- Clam AI
- Is there a way to get a human at OpenAI support?
- Show HN: Genesis Map – Visualize your agent's changes. See where they can break
**autopilot 需求队列**:gaps **4** / covered 2 · heat: measured 2026-11-25 (1 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=ai-stock-exposure.html · q=rzai stock
- kind=value · match=0.47 · page=invest/cathie-wood.html · q=ai boom top stocks nvidia tsmc
- kind=value · match=0.517 · page=ai-tools.html · q=energy fuels stock
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 15, "q": "tool:verdicts"}, {"n": 14, "q": "tool:portfolio_returns"}, {"n": 12, "q": "tool:claim_ledger https://goldrush.agiscorecard."}, {"n": 11, "q": "`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [8d] **deepseek** → deepseek login (new), deepseek news (new)
- [STALE] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [STALE] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [7d] **sora** → when is sora coming to fortnite (24350), sora release date fortnite speculation (9400), when will sora be in fortnite (5800), kingdom hearts grandista sora figure (4100)
- [6d] **gemini** → gemini ai (new), gemini neon (new), gemini google (new), gemini notebook (new)
- [6d] **perplexity** → perplexity ai (new), perplexity computer (new), perplexity careers (new), perplexity pro (new)
- [8d] **cursor** → cursor usage (new), cursor student plan (new)
- [7d] **claude code** → apple smartring abraham quiros villalba (32000), abrahamquirosvillalba .com (30950), how to bake a cake (20450), milliondollarthings.com crypto (17800)
**创业雷达词表命中(PH/HN/Reddit)**
- Show HN: Juncts, one DM inbox for five apps that Claude and ChatGPT can work in
- Show HN: Second Brain – One Memory Shared by Claude, ChatGPT and Cursor via MCP
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [2d] **portable air conditioner** → (空)
- [1d] **dehumidifier** → drieaz dehumidifier (140), what is the difference between a humidifier and a dehumidifier (130), difference between humidifier and dehumidifier (110), best small dehumidifier for bathroom (100)
- [1d] **condizionatore portatile** → condizionatore portatile 12v per auto camper furgone (32600), condizionatore portatile caldo freddo (250), equation condizionatore portatile (250), condizionatore portatile con pompa di calore (130)
- [STALE] **deumidificatore** → black friday deumidificatore (29500), deumidificatore ariston deos 20 (16250), deumidificatore per asciugare i panni (11900), umidificatore ambiente (11500)
- [8d] **klimaanlage** → black friday klimaanlage (1500), heizen mit klimaanlage (550), klimaanlage heizen (500), klimaanlage zum heizen (500)
- [7d] **schimmel entfernen** → (空)
- [6d] **infrarotheizung** → (空)
- [1d] **luftentfeuchter** → ukraine krim brücke (66850), mogelpackung (58650), amazon verliert 40 satelliten (58200), christian lell privatinsolvenz (50900)
- [1d] **heizlüfter** → auto heizlüfter mit akku (112350), tronic heizlüfter (62800), heizlüfter oder infrarotheizung (59850), heizlüfter mit zeitschaltuhr (57450)
- [5d] **kaffeevollautomat** → siemens kaffeevollautomat eq.6 plus s300 te653501de (22350), siemens kaffeevollautomat eq.6 plus s400 te654509de (14200), philips kaffeevollautomat 6000 serie (9650), siemens te651509de eq.6 plus s100 kaffeevollautomat (7600)
- [4d] **akku staubsauger** → (空)
- [3d] **matratze** → emma flip matratze (140), beco maxima plus (140), betten 180x200 mit matratze und lattenrost (120), emma original pro matratze (90)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **26** / covered 11 · heat: measured 2026-11-25 (25 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=guide/akku-heizluefter.html · q=tronic heizlüfter
- kind=value · match=0.5 · page=guide/akku-heizluefter.html · q=kaufland heizlüfter
- kind=value · match=0.5 · page=guide/akku-heizluefter.html · q=9kw heizlüfter
**第一方需求**:`{"zero_hit_records": 0}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-11-10,15 天前,锚 heizlüfter)
| 词 | 峰值 | 峰值月 | 距峰值月 | 冬÷九月 | 标题覆盖页 | 状态 |
|---|---|---|---|---|---|---|
| matratze | 163.1 | 11 月 | 本月 | 0.99 | 0 | 已裁定:站外(离题大词)(2026-09-15) |
| kaffeevollautomat | 145.2 | 11 月 | 本月 | 1.39 | 0 | 已裁定:站外(礼品季大词)(2026-09-15) |
| saugroboter | 58.0 | 11 月 | 本月 | 1.21 | 1 | 已裁定:业主授权的具名选购路径，增长未验证(2026-11-12) |
| akku staubsauger | 54.5 | 11 月 | 本月 | 1.29 | 0 | 已裁定:Bodenpflege 判负,不试第二次(2026-09-15) |
| luftentfeuchter | 31.9 | 11 月 | 本月 | 1.18 | 17 | 已覆盖 17 页 |
| heizlüfter | 28.7 | 11 月 | 本月 | 0.84 | 5 | 已覆盖 5 页 |
| heizdecke | 21.1 | 11 月 | 本月 | 1.4 | 1 | 已覆盖 1 页 |
| heizstrahler | 19.2 | 11 月 | 本月 | 0.85 | 0 | 已裁定:扩到已排名页 heizluefter-stromverbrauch;独立页可进扩展队列,须先过 SERP 门(无测评,不点名型号)(2026-09-24) |
| fussbodenheizung | 16.0 | 11 月 | 本月 | 1.19 | 0 | 已裁定:装修题,非联盟可买形态(2026-09-15) |
| heizung einstellen | 7.9 | 11 月 | 本月 | 0.99 | 0 | 已裁定:红海(Utopia/ÖKO-TEST/heizung.de/heizsparer/MVV)(2026-08-05) |
| saugwischer | 7.9 | 11 月 | 本月 | 1.39 | 1 | 已裁定:业主授权的具名选购路径，增长未验证(2026-11-12) |
| heizkörper thermostat | 5.9 | 11 月 | 本月 | 1.04 | 1 | 已裁定:红海;租客角度已在 heizkosten-senken-als-mieter(2026-08-05) |
| fenster beschlagen | 5.1 | 11 月 | 本月 | 1.8 | 2 | 已覆盖 2 页 |
| zugluft | 3.4 | 11 月 | 本月 | 1.08 | 2 | 已覆盖 2 页 |
| richtig heizen | 2.8 | 11 月 | 本月 | 1.16 | 0 | **未覆盖 · 待过三门** |
| konvektorheizung | 1.3 | 11 月 | 本月 | 0.77 | 0 | 已裁定:rising 假象,5 年峰值 1,2(2026-09-15) |
| wäsche trocknen wohnung | 0.9 | 11 月 | 本月 | 1.81 | 1 | 量太小(峰值 <2.0) |
| schimmel | 119.9 | 12 月 | 6 天 | 1.44 | 8 | 已覆盖 8 页 |
| luftbefeuchter | 21.7 | 12 月 | 6 天 | 2.72 | 3 | 已覆盖 3 页 |
| schimmel wand | 11.8 | 12 月 | 6 天 | 2.66 | 1 | 已覆盖 1 页 |
| schimmel fenster | 4.6 | 12 月 | 6 天 | 4.03 | 1 | 已覆盖 1 页 |
| fenster abdichten | 3.0 | 12 月 | 6 天 | 0.96 | 2 | 已覆盖 2 页 |
| schwarzer schimmel | 2.9 | 12 月 | 6 天 | 1.62 | 0 | 已裁定:菌种/健康声明边界;扩展条件挂 eco-schimmel-fenster-1213(2026-09-09) |
| schimmel schlafzimmer | 2.3 | 12 月 | 6 天 | 4.12 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
| schimmel tapete | 2.3 | 12 月 | 6 天 | 2.18 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-11-06;blocked 1 · built 11 · gated 1 · queued 1 · rejected 9 · removed 1 · withdrawn 3;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Black Friday 2026-11-27(2 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

## buysomething
**Trends rising(逐 seed 时效)**
- [STALE] **electric spin scrubber** → voweek electric spin scrubber (350), easy scrub (200), homitt electric spin scrubber (70), ykyi electric spin scrubber (60)
- [STALE] **portable carpet cleaner** → shark stain striker hair pro (17950), little green® hydrosteam® pet portable carpet cleaner (5050), bissell 3624 spot clean professional portable carpet cleaner (2850), best carpet cleaner (110)
- [STALE] **flip straw water bottle** → flip straw water bottle kids (new), flip straw water bottle with handle (new), flip straw water bottle stanley (new), flip straw water bottle o frio da estrada (new)
- [STALE] **heatless curls** → heatless curls overnight (new)
- [STALE] **high speed hair dryer** → infiniti pro conair hair dryer (160), infiniti pro conair (80)
- [STALE] **mini massage gun** → mini massage gun nearby (new), mini massage gun amazon (new), mini massage gun near me (new), mini massage gun for travel (new)
- [STALE] **leg compression boots** → costco (250), best leg compression sleeves (250), compression boots for legs (190), therabody (150)
- [STALE] **solar camping lights** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **0** / covered 0 · heat: measured 2026-11-25 (0 pages); no notes
**第一方需求**:`{"picks": {"bottle-warmer": {"open": 1, "out": 0}, "hair-dryer": {"open": 1, "out": 0}, "led-mask": {"open": 3, "out": 0}, "mamian-skirt": {"open": 3, "out": 0}, "massage-gun": {"open": 1, "out": 0}, `

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- Mystonie
- Show HN: How 80s C64 games made 3 voices sound like a band – now with a tracker
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [3d] **labubu** → cat mode labubu (86750), labubu cat mode on (30600), labubu costume for kids (12050), maine coon labubu (10550)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [STALE] **pdf accessibility** → how to bake a cake (1300), best time to visit maldives (1250), cheapest flights to tokyo (900), best laptop for work (850)
- [STALE] **pdf remediation** → (空)
- [STALE] **compare pdf** → cheapest flights to tokyo (9100), compare and contrast essay examples pdf (1500), how to bake a cake (1450), how to make sushi (600)
- [3d] **jellycat** → bizzlestomp bear jellycat (25800), costco jellycat advent calendar (21350), advent calendar (8050), jellycat advent calendar (7400)
- [2d] **sonny angel** → sonny angel cat christmas series (new)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **14** / covered 3 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.333 · page=rarity.html · q=cat mode labubu
- kind=value · match=0.333 · page=rarity.html · q=labubu cat mode on
- kind=value · match=0.5 · page=series/sonny-angel-animal-series-1.html · q=bizzlestomp bear jellycat

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
- 候选 6 · 趋势主题重合 0 · 重现 0 · 已有人做 0(生成 2026-11-24;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- 旧字段 demand-confirmed 仅指与 Google Trends 的主题重合，不代表客户确认、独立买家数或付费意愿；以下候选仍须读取原帖和核验客户行动。
- [scout] what screenshot software allows the user to capture solely a specific window · 1 天 · 站 -
- [scout] windows malware removal in bay area · 1 天 · 站 -
- [scout] is there a way to get a human at openai support · 1 天 · 站 -
- [scout] what software can help me organize and manage personal files stored across multi · 1 天 · 站 -
- [scout] how to make three js support real time path tracing · 1 天 · 站 -
- [scout] how to transfer photos from icloud photos to google drive · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **20** 次 / 真人 pv 81600,剔除已标记噪音站 10264(快照 2026-11-24;09-12 手测基线 69)
- 其中 claude.ai **1** 次(可能含舰队自己在 claude.ai/code 里的点击,分不开所以不剔除;不含它是 19 次。判定线照旧读合计)
- baipiaoji: 11 / 615 pv · www.perplexity.ai 9, kagi.com 2
- agiscorecard: 3 / 66734 pv · kagi.com 2, claude.ai 1 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- gridlings: 2 / 4128 pv · https://www.doubao.com/ 2
- gamesledger: 2 / 1009 pv · kagi.com 2
- getecoback: 1 / 522 pv · www.perplexity.ai 1
- buysomething: 1 / 346 pv · https://source.agiscorecard.com/?utm_source=chatgpt.com 1
- thedollscout: 0 / 2915 pv · —
- goldrush: 0 / 729 pv · —
- after35: 0 / 1158 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 520 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 529 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 508 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 1006 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 881 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-11-24,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 3/284 = 1.1% · baipiaoji 23/612 = 3.8% · getecoback 1/230 = 0.4% · gridlings 2/58 = 3.4% · gamesledger 2/58 = 3.4%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-11-24):search 1154 · ai 31 · fleet 40 · social 5 · self 20017 · direct 60229 · other 121
- baipiaoji: 搜索 548 / AI 23 / 舰队内 0 / 社交 5 / 直接 0 · Google 230 · 前三 cn.bing.com 235, google.com 230, bing.com 58
- getecoback: 搜索 229 / AI 1 / 舰队内 0 / 社交 0 / 直接 260 · Google 7 · 前三 bing.com 94, duckduckgo.com 81, ecosia.org 24
- agiscorecard: 搜索 191 / AI 3 / 舰队内 25 / 社交 0 / 直接 51459 · Google 79 · 前三 google.com 79, duckduckgo.com 44, bing.com 38
- gamesledger: 搜索 54 / AI 2 / 舰队内 1 / 社交 0 / 直接 510 · Google 18 · 前三 duckduckgo.com 21, google.com 18, bing.com 10
- gridlings: 搜索 47 / AI 2 / 舰队内 4 / 社交 0 / 直接 1557 · Google 1 · 前三 cn.bing.com 27, bing.com 13, duckduckgo.com 2
- thedollscout: 搜索 32 / AI 0 / 舰队内 0 / 社交 0 / 直接 2860 · Google 20 · 前三 google.com 20, search.yahoo.com 9, ecosia.org 1
- powerbill: 搜索 14 / AI 0 / 舰队内 2 / 社交 0 / 直接 448 · Google 11 · 前三 google.com 11, m.baidu.com 2, baidu.com 1
- buysomething: 搜索 10 / AI 0 / 舰队内 0 / 社交 0 / 直接 277 · Google 10 · 前三 google.com 10
- codeword: 搜索 10 / AI 0 / 舰队内 1 / 社交 0 / 直接 557 · Google 8 · 前三 google.com 8, m.baidu.com 2
- goldrush: 搜索 8 / AI 0 / 舰队内 0 / 社交 0 / 直接 559 · Google 8 · 前三 google.com 8
- fanzha: 搜索 7 / AI 0 / 舰队内 0 / 社交 0 / 直接 389 · Google 7 · 前三 google.com 7
- firstjob: 搜索 3 / AI 0 / 舰队内 1 / 社交 0 / 直接 290 · Google 2 · 前三 google.com 2, baidu.com 1
- learn: 搜索 1 / AI 0 / 舰队内 2 / 社交 0 / 直接 305 · Google 0 · 前三 baidu.com 1
- after35: 搜索 0 / AI 0 / 舰队内 4 / 社交 0 / 直接 758 · Google 0 · 前三 —
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-11-24
- getecoback: 联盟点击 45 / 付费订单 0 / 订阅 1 · us-market 0 · amazon.com 0 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 5 · invest_tool_click 1 · /advertise pv 157 · /audits pv 288 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 234 · 厂商 biz 656 · 投稿累计 451 · watches 0 (endpoint)
- thedollscout: 联盟点击 0 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 145 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-11-24):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 2 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
