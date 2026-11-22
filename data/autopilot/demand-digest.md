# 舰队需求摘要 · 2026-11-22

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
- softwarerecs: ok, 5 条
- bluesky_wish: **不可用** — "is there an app that" HTTP 403; "is there a tool that" HTTP 403; "i wish there was an app" HTTP 403
- lemmy_wish: **不可用** — is there an app The operation was aborted due to timeout
- producthunt: ok, 30 条
- reddit_requests: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_vertical: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- reddit_wish: **不可用** — stopped 2026-09-28: public JSON 403 for 14+ days (pre-registered rule); runs again only via OAuth
- hn_ask: ok, 3 条
- hn_show: ok, 30 条
- hn_top_ai: ok, 2 条
- 雷达快照日期:2026-11-21(1 天前)

## 候选 idea 源探针(只报状态,200 且有内容才值得写解析器)
- betalist: HTTP 404 text/html; charset=UTF-8 1722B
- indiehackers_rss: HTTP 403 text/html; charset=UTF-8 5659B
- producthunt_topic_ai: HTTP 403 text/html; charset=UTF-8 5759B
- yc_rfs: HTTP 200 text/html; charset=utf-8 97219B
- reddit_rss_public: HTTP 404 application/atom+xml; charset=UTF-8 266B
- reddit_json_public: HTTP 403 text/html 190238B
- reddit_oauth_endpoint: HTTP 401 application/json; charset=UTF-8 41B
- stackexchange_softwarerecs: HTTP 200 application/json; charset=utf-8 380B
- bluesky_public_search: HTTP 403 text/html 2334B
- bluesky_alt_host: HTTP 200 application/json; charset=utf-8 1134B
- lemmy_world_search: HTTP 200 application/json 8889B

- Reddit 访问通道:public-json(oauth = owner 已注册官方 app;public-json = 未鉴权,runner 09-13 起逐板 403)
## 求做帖(Reddit request 板 + wish 句式 + Ask HN + Software Recommendations SE + Bluesky 求做搜索)
只读,机器永不发帖。出现在这里 ≠ 有人在搜它。
- ↑3 · ask_hn · Windows malware removal in Bay Area — https://news.ycombinator.com/item?id=50551096
- ↑3 · softwarerecs · What screenshot software allows the user to capture solely a specific window? — https://softwarerecs.stackexchange.com/questions/95798/what-screenshot-software-allows-the-user-to-capture-solely-a-specific-window
- ↑2 · ask_hn · Is there a way to use Gemini API Keys with Antigravity? — https://news.ycombinator.com/item?id=50499317
- ↑1 · ask_hn · Why is Stripe dashboard so slow? — https://news.ycombinator.com/item?id=50517973
- ↑0 · softwarerecs · Looking for the Best Battery App — https://softwarerecs.stackexchange.com/questions/95817/looking-for-the-best-battery-app
- ↑0 · softwarerecs · How to Transfer Photos from iCloud Photos to Google Drive — https://softwarerecs.stackexchange.com/questions/95812/how-to-transfer-photos-from-icloud-photos-to-google-drive
- ↑0 · softwarerecs · What software can help me organize and manage personal files stored across multiple cloud storage services? — https://softwarerecs.stackexchange.com/questions/95804/what-software-can-help-me-organize-and-manage-personal-files-stored-across-multi
- ↑0 · softwarerecs · What software can help manage large volumes of data for long-term archiving? — https://softwarerecs.stackexchange.com/questions/95787/what-software-can-help-manage-large-volumes-of-data-for-long-term-archiving

## Reddit 垂直板块 · 14 天内重现的问题(这才是需求信号)
按站给定板块 + 句式(startup_radar.mjs 的 VERTICAL),只读。同一标题出现在 ≥2 个不同日期才列。
- (尚无重现:源刚接入或 14 天内没有重复出现的问题)

## agiscorecard
**Trends rising(逐 seed 时效)**
- [2d] **artificial general intelligence** → (空)
- [2d] **agi timeline** → (空)
- [1d] **13f filings** → when are 13f filings due (420250)
- [1d] **ai stocks** → top tourist attractions in paris (45100), how to bake a cake (37350), cheapest flights to tokyo (33850), how to make sushi (32800)
**创业雷达词表命中(PH/HN/Reddit)**
- WaitFeed
- AI Context Flow MCP
- Stitch Loop
- Publicit
- OpenVorld
- Shipyard
- gitroots
- Mailpipe
**autopilot 需求队列**:gaps **4** / covered 2 · heat: measured 2026-11-22 (1 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.5 · page=ai-stock-exposure.html · q=rzai stock
- kind=value · match=0.47 · page=invest/cathie-wood.html · q=ai boom top stocks nvidia tsmc
- kind=value · match=0.517 · page=ai-tools.html · q=energy fuels stock
**第一方需求**:`{"search_no_result": [], "site_search": [{"n": 17, "q": "tool:portfolio_returns"}, {"n": 16, "q": "tool:verdicts"}, {"n": 12, "q": "tool:thesis_tracker"}, {"n": 10, "q": "tool:claim_ledger https://gol`

## baipiaoji
**Trends rising(逐 seed 时效)**
- [5d] **deepseek** → deepseek login (new), deepseek news (new)
- [STALE] **midjourney** → midjourney v8.2 (30800), seedance 2.5 (4900), runway gen-2 (4750), software testing strategies (2150)
- [STALE] **suno** → bmg suno (15100), jason isbell suno lawsuit (14150), suno artist incubator program (8050), treblo (6800)
- [4d] **sora** → when is sora coming to fortnite (24350), sora release date fortnite speculation (9400), when will sora be in fortnite (5800), kingdom hearts grandista sora figure (4100)
- [3d] **gemini** → gemini ai (new), gemini neon (new), gemini google (new), gemini notebook (new)
- [3d] **perplexity** → perplexity ai (new), perplexity computer (new), perplexity careers (new), perplexity pro (new)
- [5d] **cursor** → cursor usage (new), cursor student plan (new)
- [4d] **claude code** → apple smartring abraham quiros villalba (32000), abrahamquirosvillalba .com (30950), how to bake a cake (20450), milliondollarthings.com crypto (17800)
**创业雷达词表命中(PH/HN/Reddit)**
- Is there a way to use Gemini API Keys with Antigravity?
- Show HN: SaturnSQL Context, telling AI tools what the database means
**autopilot 需求队列**:该站未纳入 autopilot

## getecoback
**Trends rising(逐 seed 时效)**
- [10d] **portable air conditioner** → portable air conditioner without hose (new), portable air conditioner nearby (new), portable air conditioner for car (new), portable air conditioner near me (new)
- [9d] **dehumidifier** → drieaz dehumidifier (130), can you drink water from a dehumidifier (120), best small dehumidifier for bathroom (110), waykar dehumidifier reviews (100)
- [9d] **condizionatore portatile** → condizionatore aria calda (300), condizionatore caldo freddo portatile (190), tubo flessibile per condizionatore portatile (130), condizionatore portatile pompa di calore (130)
- [8d] **deumidificatore** → black friday deumidificatore (29500), deumidificatore ariston deos 20 (16250), deumidificatore per asciugare i panni (11900), umidificatore ambiente (11500)
- [5d] **klimaanlage** → black friday klimaanlage (1500), heizen mit klimaanlage (550), klimaanlage heizen (500), klimaanlage zum heizen (500)
- [4d] **schimmel entfernen** → (空)
- [3d] **infrarotheizung** → (空)
- [7d] **luftentfeuchter** → luftentfeuchter fürs auto (29600), pingi luftentfeuchter (27500), meacodry arete one 10l (18200), black friday 2026 (10600)
- [6d] **heizlüfter** → (空)
- [2d] **kaffeevollautomat** → siemens kaffeevollautomat eq.6 plus s300 te653501de (22350), siemens kaffeevollautomat eq.6 plus s400 te654509de (14200), philips kaffeevollautomat 6000 serie (9650), siemens te651509de eq.6 plus s100 kaffeevollautomat (7600)
- [1d] **akku staubsauger** → (空)
- [1d] **matratze** → (空)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **19** / covered 11 · heat: measured 2026-11-22 (25 pages); no notes(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=value · match=0.533 · page=guide/saugroboter-kaufberatung.html · q=vorwerk saugwischer roboter
- kind=value · match=0.5 · page=guide/saugwischer-kaufberatung.html · q=hyla saugwischer
- kind=value · match=0.333 · page=guide/saugwischer-kaufberatung.html · q=kobold sp600 saugwischer
**第一方需求**:`{"zero_hit_records": 0}`
**季节日历**(5 年季节性 × 德语页标题覆盖;峰值月在 42 天内开始;数据 2026-11-10,12 天前,锚 heizlüfter)
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
| schimmel | 119.9 | 12 月 | 9 天 | 1.44 | 8 | 已覆盖 8 页 |
| luftbefeuchter | 21.7 | 12 月 | 9 天 | 2.72 | 3 | 已覆盖 3 页 |
| schimmel wand | 11.8 | 12 月 | 9 天 | 2.66 | 1 | 已覆盖 1 页 |
| schimmel fenster | 4.6 | 12 月 | 9 天 | 4.03 | 1 | 已覆盖 1 页 |
| fenster abdichten | 3.0 | 12 月 | 9 天 | 0.96 | 2 | 已覆盖 2 页 |
| schwarzer schimmel | 2.9 | 12 月 | 9 天 | 1.62 | 0 | 已裁定:菌种/健康声明边界;扩展条件挂 eco-schimmel-fenster-1213(2026-09-09) |
| schimmel schlafzimmer | 2.3 | 12 月 | 9 天 | 4.12 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
| schimmel tapete | 2.3 | 12 月 | 9 天 | 2.18 | 0 | 已裁定:预登记:eco-schimmel-fenster-1213 赢了才补(2026-09-15) |
读法:数值只在本文件内可比(与 rising 不可比);「未覆盖 · 待过三门」才是候选,仍要过需求/变现门;过了门的写进扩展队列,每天最多建一页(2026-09-24 起不再等 eco-new-page-discovery-1020,新页的发现面由首页「Neu im Ratgeber」块承担,是否奏效看 eco-newest-block-1008)。
**扩展队列**(更新 2026-11-06;blocked 1 · built 11 · gated 1 · queued 1 · rejected 9 · removed 1 · withdrawn 3;**可建 <3,当天先补货**)
- `heizluefter-riecht-verbrannt` — Heizlüfter riecht verbrannt: Staub, Erstbetrieb oder Defekt? · 待办:Find a manufacturer manual or safety source for the first-use smell before stating it; otherwise leave that paragraph out. Safety wording as schaltet-sich-aus: 
**Deal-Kalender**(Amazon 活动;data/deal-calendar.json)
- Black Friday 2026-11-27(5 天后)· **未公告:去 aboutamazon.de 查,填进 deal-calendar.json 才会出横幅**

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
**autopilot 需求队列**:gaps **0** / covered 0 · heat: measured 2026-11-22 (0 pages); no notes
**第一方需求**:`{"picks": {"bottle-warmer": {"open": 1, "out": 0}, "hair-dryer": {"open": 1, "out": 0}, "led-mask": {"open": 3, "out": 0}, "mamian-skirt": {"open": 3, "out": 0}, "massage-gun": {"open": 1, "out": 0}, `

## gridlings
**Trends rising(逐 seed 时效)**
- (无 rising 文件)
**创业雷达词表命中(PH/HN/Reddit)**
- Prompt Puncher
- Show HN: A browser game about trying to join a meeting
- Show HN: I stole a game interaction and brought it to macOS
**autopilot 需求队列**:gaps **0** / covered 0 · heat: no public aggregate endpoint on this site — heat needs eithe

## thedollscout
**Trends rising(逐 seed 时效)**
- [STALE] **labubu** → labubu cat mode (73950), labubu cat mode on (27550), lets try the viral crumbl labubu (24400), lizzo (12900)
- [STALE] **fake labubu** → fake labubu dolls (new), fake labubu name (new), fake labubu amazon (new), fake labubu feet (new)
- [STALE] **pop mart** → hirono mist walker (9350), hirono after dark (7950), pop mart monster hunter (1200), nightmare before christmas pop mart (800)
- [STALE] **pdf accessibility** → how to bake a cake (1300), best time to visit maldives (1250), cheapest flights to tokyo (900), best laptop for work (850)
- [STALE] **pdf remediation** → (空)
- [STALE] **compare pdf** → cheapest flights to tokyo (9100), compare and contrast essay examples pdf (1500), how to bake a cake (1450), how to make sushi (600)
- [STALE] **jellycat** → needoh advent calendar (9100), jellycat advent calendar (8500), jellycat advent calendar 2026 (8100), jellycat halloween collection 2026 (6250)
- [10d] **sonny angel** → sonny angel hippers (new), sonny angels near me (new), sonny angel usa (new), sonny angel cat christmas (new)
**创业雷达词表命中(PH/HN/Reddit)**
- (无)
**autopilot 需求队列**:gaps **3** / covered 6 · heat: no public aggregate endpoint on this site — heat needs eithe(gaps 量的是标题与开篇有没有接住,不是站内有没有这一页——建页前先 grep 正文)
- kind=autocomplete-new · match=0.5 · page=legal/affiliate-disclosure.html · q=sonny angels near me
- kind=autocomplete-new · match=0.59 · page=collecting/trading-meetup-checklist.html · q=sonny angel advent calendar 2026
- kind=autocomplete-new · match=0.5 · page=brands/sonny-angel.html · q=sonny angel advent calendar

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
- 候选 7 · 趋势主题重合 0 · 重现 0 · 已有人做 0(生成 2026-11-21;Reddit 源 ok:{'reddit_requests': False, 'reddit_wish': False, 'reddit_vertical': False, 'hn_ask': True, 'softwarerecs': True, 'bluesky_wish': False, 'lemmy_wish': False, 'reddit_access': 'public-json'})
- 旧字段 demand-confirmed 仅指与 Google Trends 的主题重合，不代表客户确认、独立买家数或付费意愿；以下候选仍须读取原帖和核验客户行动。
- [scout] what screenshot software allows the user to capture solely a specific window · 1 天 · 站 -
- [scout] windows malware removal in bay area · 1 天 · 站 -
- [scout] what software can help manage large volumes of data for long term archiving · 1 天 · 站 -
- [scout] what software can help me organize and manage personal files stored across multi · 1 天 · 站 -
- [scout] is there a way to use gemini api keys with antigravity · 1 天 · 站 -
- [scout] why is stripe dashboard so slow · 1 天 · 站 -
- [scout] how to transfer photos from icloud photos to google drive · 1 天 · 站 -

## AI 助手引荐(28 天窗,真人 pv 里 referrer 是 ChatGPT/Perplexity/Claude/Copilot 等)
- 舰队合计 **21** 次 / 真人 pv 76249,剔除已标记噪音站 9179(快照 2026-11-21;09-12 手测基线 69)
- 其中 claude.ai **1** 次(可能含舰队自己在 claude.ai/code 里的点击,分不开所以不剔除;不含它是 20 次。判定线照旧读合计)
- baipiaoji: 12 / 609 pv · www.perplexity.ai 10, kagi.com 2
- agiscorecard: 3 / 62792 pv · kagi.com 2, claude.ai 1 · ⚠ pv 不是读者数:server-side pageviews; JS page_view beacon 1,641/28d on 2026-09-23
- gridlings: 2 / 3679 pv · https://www.doubao.com/ 2
- buysomething: 2 / 356 pv · https://source.agiscorecard.com/?utm_source=chatgpt.com 2
- getecoback: 1 / 455 pv · www.perplexity.ai 1
- gamesledger: 1 / 923 pv · kagi.com 1
- thedollscout: 0 / 2431 pv · —
- goldrush: 0 / 726 pv · —
- after35: 0 / 1085 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- learn: 0 / 497 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- fanzha: 0 / 494 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- firstjob: 0 / 470 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- codeword: 0 / 922 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- powerbill: 0 / 810 pv · — · ⚠ pv 不是读者数:0 outside referrers and 0 events in 28d on 2026-09-23
- AI 占外部到达(渠道构成快照 2026-11-21,pulse 口径,agi 为服务端计数;只列外部到达 ≥20 且 AI>0 的站):agiscorecard 3/370 = 0.8% · baipiaoji 24/607 = 4.0% · getecoback 1/213 = 0.5% · gridlings 2/56 = 3.6% · gamesledger 1/56 = 1.8%

## 渠道构成(28 天窗;`search` 指真正的搜索引擎引荐,不是排名)
- 舰队合计(快照 2026-11-21):search 1188 · ai 31 · fleet 35 · social 5 · self 17214 · direct 57582 · other 192
- baipiaoji: 搜索 547 / AI 24 / 舰队内 0 / 社交 5 / 直接 0 · Google 203 · 前三 cn.bing.com 251, google.com 203, bing.com 65
- getecoback: 搜索 212 / AI 1 / 舰队内 0 / 社交 0 / 直接 209 · Google 7 · 前三 bing.com 83, duckduckgo.com 76, ecosia.org 23
- agiscorecard: 搜索 204 / AI 3 / 舰队内 20 / 社交 0 / 直接 49326 · Google 92 · 前三 google.com 92, duckduckgo.com 45, bing.com 36
- gamesledger: 搜索 53 / AI 1 / 舰队内 1 / 社交 0 / 直接 489 · Google 21 · 前三 google.com 21, duckduckgo.com 20, bing.com 8
- gridlings: 搜索 46 / AI 2 / 舰队内 4 / 社交 0 / 直接 1593 · Google 1 · 前三 cn.bing.com 26, bing.com 14, duckduckgo.com 2
- thedollscout: 搜索 31 / AI 0 / 舰队内 0 / 社交 0 / 直接 2380 · Google 16 · 前三 google.com 16, search.yahoo.com 10, bing.com 2
- powerbill: 搜索 21 / AI 0 / 舰队内 2 / 社交 0 / 直接 445 · Google 18 · 前三 google.com 18, m.baidu.com 2, baidu.com 1
- codeword: 搜索 17 / AI 0 / 舰队内 1 / 社交 0 / 直接 550 · Google 15 · 前三 google.com 15, m.baidu.com 2
- goldrush: 搜索 15 / AI 0 / 舰队内 0 / 社交 0 / 直接 567 · Google 15 · 前三 google.com 15
- fanzha: 搜索 14 / AI 0 / 舰队内 0 / 社交 0 / 直接 377 · Google 14 · 前三 google.com 14
- buysomething: 搜索 10 / AI 0 / 舰队内 0 / 社交 0 / 直接 287 · Google 10 · 前三 google.com 10
- learn: 搜索 8 / AI 0 / 舰队内 2 / 社交 0 / 直接 307 · Google 7 · 前三 google.com 7, baidu.com 1
- after35: 搜索 7 / AI 0 / 舰队内 4 / 社交 0 / 直接 761 · Google 7 · 前三 google.com 7
- firstjob: 搜索 3 / AI 0 / 舰队内 1 / 社交 0 / 直接 291 · Google 2 · 前三 google.com 2, baidu.com 1
- **读法**:自己这一行 Google = 0,就不要做「给 Google 看」的优化(eco 09-15 的教训);`舰队内` 是兄弟站互链真的送来的人,不是链接数。
## 钱线仪表盘(28 天窗,各站自己的口径;owner 亲报的 PartnerNet 数字带数据窗)
- 快照 2026-11-21
- getecoback: 联盟点击 44 / 付费订单 0 / 订阅 1 · us-market 0 · amazon.com 0 (endpoint)
- agiscorecard: 联盟点击 — / 付费订单 0 / 订阅 4 · invest_tool_click — · /advertise pv 144 · /audits pv 237 (endpoint)
- baipiaoji: 联盟点击 — / 付费订单 0 / 订阅 0 · go 237 · 厂商 biz 659 · 投稿累计 407 · watches 0 (endpoint)
- thedollscout: 联盟点击 0 / 付费订单 0 / 订阅 — (endpoint)
- buysomething: 联盟点击 — / 付费订单 — / 订阅 — · mcp_call 137 · out_click — (endpoint)
- owner 亲报 PartnerNet DE(30 天窗至 2026-09-14):佣金 €11.2 · 112 点击 · 待办 Complete your onboarding checklist(付款/税务信息未填完)
- 预测记录线(Metaculus bot,快照 2026-11-21):状态 never · 账本 0 条 · 北极星(赛前记录且已结算)0 · house prior Brier 差 None(n=0) · 30 天花费 $0 · 奖金 未报 · 净 —
- FutureEval 覆盖探针:抽样 1 题,舰队已存档来源覆盖 0(占比 0.0)

---
读法:gaps>0 且对应 rising 不是 STALE,才值得进第②层选题;Reddit 命中要再查搜索需求;
PH/HN 命中里的产品名不是需求词。三门(数据/需求/变现)不变。
