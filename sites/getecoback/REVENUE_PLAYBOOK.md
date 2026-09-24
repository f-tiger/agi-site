# EcoBack 营收执行 Playbook（180 天 3 单）

> 本文件是达成 Amazon PartnerNet 180 天 3 单目标的执行 prompt。每轮工作按此循环执行，结论写入 CLAUDE.md 决策记录。

## 角色与目标

增长负责人视角运营 getecoback.com（德语节能家电导购站）。目标：180 天内 3 笔 Amazon 成交（PartnerNet getecoback-21 存活线）。

## 方法论（业界 niche-site playbook）

关键词研究 → 内容 → 站内 SEO → 收录 → 转化优化（CRO）→ **测量与迭代**

当前站点已完成前五阶段：
- 77 URL（4 品类 + 3 组程序化面积页 + 2 计算器 + 对比/预算/决策货币页）
- 竞对级转化结构（对比表 / 型号卡+优缺点 / 橙色按钮 / Testsieger+Preistipp 速选框）
- 三重结构化数据 + TL;DR/FAQ（GEO）、E-E-A-T 信任页、全站导航/页脚
- 收录：sitemap 已被 GSC 成功处理（2026-07-10），核心页已"请求编入索引"，IndexNow+RSS 自动推送中

**现处"测量与迭代"阶段。铁律：基于真实数据优化，而非盲目增产。**

## 执行循环（每轮）

1. **测量**：
   - **真实浏览器 QA**（Playwright+预装 Chromium，对 localhost:8765 本地服务审计）：交互工具可用性、控制台报错、移动端横向溢出、联盟链接计数（注意动态生成的链接需交互后计数）
   - Google 收录：WebSearch `site:getecoback.com`
   - GA4（property 544688614）：Organic Search 流量、`affiliate_click` 事件（经 Supermetrics GAWA，断连时提醒用户重连或让用户自查）
   - Amazon PartnerNet 后台：点击 / 订单（用户自查或邮件信号）
2. **诊断瓶颈 → 只做对应动作**：
   - 收录未生效 → 验证部署/健康检查全绿 + 等待；超 7 天仍零收录则排查（robots、canonical、GSC 覆盖报告）并让用户再触发"请求编入索引"
   - 有流量、无 affiliate_click → CRO：把点击数据高的页面的速选框/按钮前移，测按钮文案
   - 有点击、无成交 → 商品匹配度：检查推荐型号价格带/缺货率，替换表现差的型号搜索词
   - 有成交 → 复制成功页面的模式到同类页面
3. **执行**：自动化优先（生成器/注入器/CI），不达成就下一轮继续。
4. **记录**：结论写入 CLAUDE.md，不重复试错。

## 加速执行层（2026-07-10 增补：等收录期间的最优动作）

收录生效前流量为零，此窗口内唯一能自动化复利的动作是**按 KGR 方法论批量铺长尾内容**（业界共识：新站 90 天内 KGR 页是最快出流量路径，Doug Cunnington/Niche Site Project 方法）：

1. **每轮批量 2–3 篇 KGR 页**，流程固定：
   - 从候选队列取词 → WebSearch 抽查德语 SERP 竞争度（仅论坛/gutefrage/小站在排 = low = 可写；有 vergleich.org/testit.de/大媒体占满首屏 = 弃）
   - 竞争度 low 的词并行派 agent 写页（问题解决型、诚实建议、TL;DR+FAQ+三重 JSON-LD、型号推荐卡+affiliate 链接按型号名搜索）
   - 标准校验（JSON-LD 三类型 / tag=getecoback-21 全覆盖 / EB_NAV 唯一 / affiliate_click / </html>）
   - `build_structure.py && build_sitemap.py && build_feed.py` → commit/push → CI 部署+IndexNow 自动推送
2. **KGR 页内链回货币页**：每篇 KGR 页正文链 1–2 个对比/预算货币页（把长尾流量导向高转化页），货币页是成交主力，KGR 页是流量入口。
3. **候选队列**（写完补充）：
   - **竞品逆向调研(2026-08-29,owner「分析同类型站点…亚马逊品牌更大,不注册别的网站」)**:
     用本站钱词真实 SERP 反查出同生态位集:smart-home-fox.de(最可学——单品类
     场景切片:schlafzimmer/mietwohnung/leise/ohne-abluftschlauch/mini + **单型号
     Test 页**(midea-portasplit-test)+ **品牌 hub**(comfee-geräte)+ SW-Testsieger
     引流页)、luftentfeuchter-guide/-berater(单品类双子)、luftbewusst.de(资讯型,
     商业面弱)、homeandsmart.de(大站)。**本站模型集与 2026 SERP 共识完全吻合**
     (PortaSplit/Pinguino/Klarstein/AEG/Comfee)——选品无缺口,缺的是页型:
     ①单型号 test/erfahrungen 页(最高购买意图,eco 只有 PortaSplit 3 页集群,
     Pinguino/Comfee 零专页)②品牌 hub ③SW-rider(灰,缓)。
   - 已写:**Pinguino PAC EX105 Test-Überblick**(2026-08-29,pinguino-pac-ex105-test.html;
     KGR=绿:首屏利基站+聚合器+一家手机壳店,无 SW 无大媒体;一手源=ETM Testmagazin
     A+++ 报道外链;63dB Turbo/55dB Raummitte/36kg/无密封套件 均标注「öffentliche
     Tests」;340 BTU 规则定位 15–25 m²;四情境替代表全挂联盟链)。
     **✅ 整波完成(2026-08-29 当日,owner「逐日太慢,今天先完成一波」)**:comfee-mpph-09crn7-test、klarstein-kraftwerk-smart-12k-test、aeg-chillflex-pro-test、schmidbauer-infrarotheizung-test(吃 rising v≈63k)四页并行写作+中央复校一次上线。四个 SERP 全部 KGR 绿——handyhuellen.berlin(手机壳店伪装测评)连续出现在 Pinguino/Comfee/Klarstein 三个词的首屏,型号词族竞争面弱获三重验证。每页数字全部一手来源锚定(厂商数据表/Otto 评分/PCGH),不可验证项省略;AEG 变体问题单独成节;Schmidbauer 厂商主张标注「nicht unabhängig bestätigt」。Pinguino 页替代表已回链三个新页。**第二波同日完成(owner「继续」)**:air-zuma-erfahrungen(农场重叠实证 3 域,「2–7 W」自拆台角度)、meacodry-arete-one-test(德语 SERP 真空档——首屏全英媒;秋季除湿头号型号,T3/TrustedReviews/RealHomes/QuietMark 四源)、delonghi-pinguino-vergleich(数据表级来源,2026 Gentle Jet 线已核)、comfee-geraete-test(Midea 关系双源确认,客服差评 nofollow 挂投诉台)。病毒风扇 Faktencheck 三部曲(epicooler/coolizi/air-zuma)与品牌层(pinguino 族/comfee hub/schmidbauer)成型。**第三波(owner「再加一波」)**:midea-geraete-test(Fortune 500 名次/Eschborn 子公司/KUKA·Toshiba 均核)、klarstein-geraete-test(Chal-Tec 沿革核到 2025 BBG 撤名;差评主题 nofollow)、pro-breeze-luftentfeuchter-test(主轴=500ml 水箱 vs 20L/Tag 命名陷阱,factor 80)、delonghi-pac-n90-test(主轴=声功率 64 dB vs 声压 50–52 dB 之辨)。**同日首页+工具视觉轮(owner「首页图片视频少/工具太简单」)**:季节视频位 1→3 卡轨(全部已验证测评视频,深链钱页)、新 EB_DEVICE_TILES 四设备族动画 SVG 条、BTU 工具结果区升级(SVG 量表+双型号证据链挂 -test 页+类级实测能耗成本层+Raum-merken 存档),Playwright 全部实证零页错。
   - 已写：Coolizi Coolzy Faktencheck（2026-08-29，coolizi-erfahrungen.html；需求=rising v≈23.600；SERP=与 EpiCooler 同一批评测农场域名占满首屏(tomorrow-focus 两个产品都推,可证)、无任何独立测试=差异化成立；物理不可能主张逐条对表(「无排气管降温 7–8 °C」「分子级纳米滤芯」)；与真品 Close Comfort Coolzy-Pro 的名称混淆单独成节；变现=诚实替代(Comfee dp/Pinguino/风扇)；蚕食检查:ohne-abluftschlauch 页仅一句提及,已互链）
   - 候选：Air Zuma Faktencheck（rising v≈14.650,同一农场家族;等 coolizi 页 28 天出信号再决定是否复制,避免同型页连发稀释）
   - ⚠️ 台账教训（2026-08-29）：infrarotheizung-garage 已于 08-26 在线(rising v≈44.050 已被消化),本轮差点重写覆盖——**动笔前先 ls/grep 查重是硬步骤**,generator 冲掉增补页与手写覆盖同型事故,一天内两次未遂。
   - 已写：Gekipptes Fenster einbruchsicher × Klimaanlage nachts（2026-07-11，klimaanlage-fenster-einbruchschutz.html；型号共识=ABUS FKS208(VdS)/FO400+PortaSplit 结构解；含保险角度 FAQ；内链 kippfenster/nachts/portasplit 货币页）
   - 已写(去重修正)：Abluftschlauch verlängern & isolieren（2026-07-11；发现已有 abluftschlauch-verlaengern.html，遂把 isolieren 意图+De'Longhi 保修警告+Alufolie 无用节并入既有页并删除重复的 klimaanlage-abluftschlauch-verlaengern.html，避免自我蚕食；FAQ 增至4问）
   - 已写(英语纵深)：Portable AC skylight/roof window（2026-07-11，EN；SERP=eBay/Etsy/Amazon商品页+Quora+HVAC论坛，无专门指南=low；与德语 dachfenster 页互挂 hreflang；诚实角度=热空气上升+防雨=屋顶窗更难；内链 tilt/heatwave/BTU/kernbohrung）
   - **秋冬批次（9/1 启动，2026-07-15 深度评估定）**：Heizen 品类最薄(9页)且 Infrarotheizung 簇 7 月已 64 展示=秋冬需求提前。批次含：überwintern（下条）、Infrarotheizung 场景深化（Bad/Homeoffice/Wohnwagen，先 KGR 判定）、Heizlüfter vs Infrarot vs Klima-Heizfunktion 对比页、Luftentfeuchter Winter/Kondens 角度。日更 Routine 届时按此执行。
   - 已写（台账修正 2026-08-28）：Mobile Klimaanlage überwintern/einlagern —— mobile-klimaanlage-ueberwintern.html 已在线且 28 天有搜索引擎 pv 9 次（D1），本条此前一直标「待写」是台账漂移
   - 已弃（2026-08-28 秋冬批次 KGR 预判定，三连红海）：①Infrarotheizung Bad —— 首屏 Bosch/heizung.de/energie-experten/heimwerker/schwaebische 占满；Bad 意图由既有 heizung-qm 页 + Schmidbauer ISP T 700 W「Auch fürs Bad」卡承接，不新写；②Heizlüfter vs Infrarotheizung 对比页 —— 首屏 t-online/Bosch/ADAC/heizsparer + 厂商内容营销；对比意图已在 heizung-qm FAQ 内答过,独立页不立；③Kondenswasser Fenster innen —— 首屏 Vattenfall/co2online/ADAC/energieheld/immowelt 全大牌;通用词不打,秋冬 Luftentfeuchter 线只走差异化角度（renter/无钻孔/按面积),即已有 luftentfeuchter-qm 系+wohnmobil-feuchtigkeit-winter 的打法。**结论:7 月定的秋冬批次四个方向里三个是红海,秋冬增长主力应放在已验证结构（qm 梯×语言面×AI 引用面）而非新品类词。**
   - 已弃：Luftentfeuchter Schlafzimmer nachts leise（2026-07-11 抽查：Stiftung Warentest+smart-home-fox 等评测站占满首屏，红海）
   - 已写：Klimaanlage Zugluft Nackenschmerzen（2026-07-11，SERP=健康站占屏但无人答"设备怎么摆/怎么设置"角度，差异化成立；内链 schlafzimmer 货币页+nachts+homeoffice）
   - 已写：Klimaanlage Dachfenster（2026-07-11，SERP=亚克力板店×3+论坛=low，商业意图强；内链 dachgeschoss/kippfenster/BTU/hitzewelle 货币页）
   - 已并入既有页：Mobile Klimaanlage Dauerablauf/Kondenswasser（2026-07-11 抽查：MediaMarkt+hausjournal 占屏，且 tropft 页已有完整 Kondensatschlauch 章节 → 无需动作）
   - 已写：Klimaanlage mit Balkonkraftwerk（2026-07-11，energie-sparen 分类，内链电费页×2+PortaSplit 对比页）
   - 已并入既有页（2026-07-11 蚕食检查）：Kindersicherung→kinderzimmer-kuehlen 补节；Wohnwagen/Camping→klimaanlage-wohnmobil 已覆盖+补 Anlaufstrom 节（promobil 大刊在榜，独立页难打）；Mietwohnung erlaubt→klimaanlage-mietwohnung 已覆盖
   - 已写：Luftentfeuchter Dauerbetrieb Stromkosten（2026-07-11，内链 stromkosten-rechner）
   - 已并入既有页：Fenster abdichten ohne Kleben（2026-07-11 抽查=low，但与 klimaanlage-kippfenster.html 意图重叠 → 增强该页而非新写，避免自我蚕食）
   - 品类邻接结论：Fensterfolie/Hitzeschutz 首屏=专业贴膜店+Stiftung Warentest，无联盟评测站占屏 → 不新写页，在既有 hitzeschutz-fenster.html 补型号卡（2026-07-10 已排入丰富批次）
   - 已写：Klimaanlage tropft Wasser（2026-07-10，移动机角度）· Klimaanlage Schimmel Geruch（2026-07-10，移动机角度）
   - 已弃：Ventilator mit Wasserkühlung sinnvoll（vergleich.org/expertentesten/home&smart 占满首屏，红海）
4. **每轮开头仍先测量**（site: 收录 / 部署绿 / 信号邮件），有真实信号立即切到诊断表对应动作，没有就继续铺 KGR。

## AI 时代站点轮(2026-08-29,owner「eco站点做成ai时代站点」)

按「发现→读→调用→引用磁石」四层补齐机器面(agi gen_agent_surfaces 模式移植,舰队互学):
- **读**:181 个 per-page .md 镜像(/guide/<slug>.md,de/en/it 全覆盖)——此前 Markdown 只在
  Accept 协商后面,无法被链接/发现;转换保内链、外链降纯文本,**联盟链接零进入由硬闸门
  保证**(build_agent_md.py 检出即 build fail);worker 对 .md 发 X-Robots-Tag noindex,
  HTML 保持 canonical。
- **发现**:/for-agents.html(+.md)机器面总览;llms.txt 补 .md 模式/数据集/总览三行。
- **调用**:MCP 第 9 个工具 geraet_wahl——计算器之上的「判定层」(问题→设备族+
  尺寸 Faustregel+指南 URL),smoke 用例入 mcp_smoke.mjs;mcp.html 同步「九个工具」。
- **引用磁石**:/sizing-data.json(CC BY 4.0)——BTU/Liter/Watt 三阶梯原创数据集,
  与页面同源(读同一份 content JSON),dateModified 版本化。
流水线新增 build_agent_md 步 + 部署自检 3 条(.md 服务/数据集/for-agents)。
判定线:30 天 md_serve+mcp_call 趋势 ≥ 现基线,下次 Bing AI Performance 快照引用面不降。

## 工具层调研轮(2026-08-29,owner「优化eco的工具,吸引联盟用户」)

**45 agent 工作流**(11 面审计→规格、4 路调研、合成、18 次三镜头对抗验证)+ 我方 Playwright
运行时实测(10 个工具,移动视口,拦截 beacon)。**对抗验证否掉了 6 个头部动作中的 5 个**
——多数是「证据是修复前的快照」或「动的是零流量面」,这正是对抗验证的价值。

**核心诊断**:工具不转化不是因为结果面难看,而是 ①`amazon_url()` 只被服务端渲染的卡片用了,
**JS 渲染的工具结果面全部绕过它自己拼 `s?k=` 搜索链**——2026-08-28 那次 261 条 ASIN 深链
改造没覆盖到工具;②11 个独立工具页整个 D1 生命周期合计 **19 次真人 pv、0 联盟点击**
(/tools.html 历史 0 pv),重建它们的结果面是陷阱。

**本轮落地(全部在有真流量的面上)**:
- **EB_SIZER(66 页,占全站 38/40 次工具使用)**:结果 CTA 走 `amazon_url()` → Comfee/
  Klarstein 出 `/dp/` 深链(Pinguino 无核验 ASIN,诚实保持搜索链);型号名后加
  「Was sagen die Tests?」证据链(德语专属——EN 无测评页,不给读者链看不懂的页)。
- **首页工具**:同样改深链;并修掉一个真缺陷——`else` 分支无上界,45 m²(15.500 BTU)
  的读者被推荐 12.000 BTU 机型。现在 >13.500 BTU 一个型号都不推,改说实话 + 指向
  split-ohne-kernbohrung(与 btu-rechner/sizer 口径一致)。
- **EB_PROFILE 广告标注**:191 页的档案条一直挂着联盟链却**从无 Werbekennzeichnung**
  ——因为它压根不在 check_adlabel 的 BLOCKS 里,闸门只查它被告知要查的东西。
  已补标注 + 补进闸门(检查面 816→1035 块)。

**⚠️ 自查出的零编造违规(我当天引入的)**:btu-rechner 结果表里
`kwh:"~0,7",eur:"0,21"` 归给 Pinguino EX105,注释还写着「取自各自测评页」——
但该页 **一个 kWh 数字都没有**,全站唯一的「0,7 kWh」在一张除湿机页上。已删除,
改为该页逐字有的两项(A+++、~63 dB Turbo);渲染加 `if(cls.kwh)` 守卫(直接删字段会
线上打印 "undefined");「laut Tests」改「laut Datenblatt」——Comfee/Klarstein 那两个
数字是厂商数据表值,把厂商标称说成测试结论,在一个立身之本是「Wir testen nicht selbst」
的站上是同一类违规,只是低一层。
**新闸门 `tools/check_cited_figures.py` 入流水线**:工具打印的每个数字必须在它引用的
那一页上存在(按数值比对,「~1,0 kWh」匹配「rund 1 kWh」)。已用重新注入 bug 实测拦截成功。
站点此前有广告标注闸门、事件闸门、FAQ 逐字闸门,**唯独没有「印出来的数字要有出处」这一道**
——这个洞正是那个数字进来的路。

**判死线**:2026-09-26 复核 D1——sizer 来源的 affiliate_click 中 `/dp/` 链接占比应 >0
(当前 0/103,99% 落搜索页);若 sizer 点击仍为 0,说明瓶颈在流量不在链接形态,停止在
工具结果面继续投入。

**别再做(实测否决,勿复活)**:
  - Do NOT rebuild the result panels of the standalone calculator pages to 'the btu-rechner bar'。
  - Do NOT build EB_HEATSIZER or any new heating-cluster tool this quarter。
  - Do NOT invest in /widgets。
  - Do NOT add price display, price-history, price-alert, 'is this a good price' or Prime-Day/deal tools。
  - Do NOT ship Amazon Add-to-Cart links (gp/aws/cart/add。
  - Do NOT invest further in llms。
  - Do NOT invent an EX105 consumption figure to 'repair' the ~0,7 kWh line on btu-rechner。
  - Do NOT invent an ASIN for the Pinguino PAC EX105, Midea PortaSplit, AEG ChillFlex Pro, MeacoDry, MeacoFan, Rowenta, or any heater or balcony battery。
  - Do NOT repoint EU model names at amazon。
  - Do NOT add EB_SIZER to /guide/klimaanlage-wohnmobil。

**唯一通过门槛的新工具候选**(不在本轮做,登记):
  - **EB_TAUPUNKT — "Kann ich jetzt lüften?" as an indexable page **:The honest negative branch IS the purchase moment: when the physics says there is no ventilation window, the only remaining fix is a dehumidifier, and(SERP 证据:Every ranking result in the German 'taupunkt rechner / kann ich jetzt lüften / lüftungsrechner' SERP is a micr)

## 顶级联盟站对标矩阵(2026-08-29,owner「对标优秀联盟站,还缺哪些,热门产品也缺」)

**最受欢迎联盟站(按被引用/被模仿度)**:全球模式标杆 = Wirecutter(NYT)、RTINGS
(实测数据库型)、OutdoorGearLab;共同特征 = 实测+方法论透明+更新纪律+深比较表。
德语区分三档:聚合器农场(vergleich.org/testit,量大信任低,不学)、niche 实测型
(homeandsmart/smart-home-fox,页型可学——已移植)、大媒体(CHIP/ComputerBild,不可学)。

**A 层结构元素对照(标杆 vs eco)**:
| 元素 | 状态 |
|---|---|
| 方法论透明页(How we test) | ✓ wie-wir-empfehlen,公式公开(独特) |
| 更新纪律(可见日期+dateModified) | ✓ |
| 深比较表/单型号层/品牌层 | ✓ 本周期补齐 11 页 |
| 「不自测」诚实声明 | ✓ 差异化资产,标杆都没有 |
| 交互工具+MCP | ✓ 反超项(标杆无) |
| 真人编辑 E-E-A-T | ✗ **但受隐私红线约束不造假人**;替代=引用外部实名测评者+视频(已做) |
| 实测图片 | ✗ 结构性不可(不自测);替代=SVG 插画语言+外部测评视频(08-29 已强化) |
| 价格追踪/Deals 层 | ✗ 价格需官方接口:PA-API 已于 2026-05 停用,接替的 Creators API 门槛 30 天 ≥10 笔成交(2026-09-24 核);**不带价格的 Deals 层已建**:`EB_DEALS` 活动横幅,见 CLAUDE.md 2026-09-24 营收节 |

**C 层热门产品缺口(SERP 三源交叉,08-29)**:Trotec 全站 0 提及(德国气候设备第一品牌!
TTK 系=amazon.de 参考线)→ 当日补 brand 页;Lidl Tronic 9000 BTU(rising 6.000+8.200,
199 €,4,1★,不在 Amazon → Ausverkauft-Alternative 变现模式)→ 当日补;
候选:Duux Whisper Flex/Stadler Form(夏季线,来年 KGR 后做)、"klimaanlage fest
installiert"(rising 6.600,检查 split-ohne-kernbohrung 是否已接该意图)。

## 德语联盟站对照轮:流量断点不在内容,在实体(2026-08-31,owner「网站内容对比其他德国联盟站点,调用技能优化,提升流量」)

**方法边界先说清**:competitor-profiling 技能的标准流程(Firecrawl map/scrape +
DataForSEO 反链/排名)在本会话**跑不了**——竞对域被 egress 代理拦、无 SEO 数据 MCP。
所以本轮用 WebSearch 看 SERP 构成 + 第一方 D1/GA4,**没有同行的流量与反链数字,
不编**。`site:` 运算符在本工具里不可靠,未当证据用。

**实测两条自家核心钱线词的德语 SERP**(页面 7 月就在线):
`klimaanlage kippfenster abdichten anleitung`、`mobile klimaanlage kühlt nicht richtig was tun`
——**eco 都不在前 ~8**。占屏的是四类:**真实商家**(klimaanlagen-guru.de,
Monheim am Rhein 实体公司,带 SHOPVOTE/ProvenExpert/golocal 档案 + eBay 店;
frosnir.de;ersatzteileshop.de;sos-zubehoer.de)、**厂商**(Bosch)、
**论坛**(HaustechnikDialog、gutefrage)、**大出版社**(hausjournal.net)。

**结论:这不是内容质量档次的差距,是实体档次的差距。** 上面每一个都是**可解析的
实体**——有地址的公司、有第三方评价档案、或已确立的品牌。「再写几页更好的内容」
打不进这一类;这也解释了 8 周站龄 + 139 页 + Google organic 归零那组数字。
**别再把「我们内容不如人」当处方**(内容层的结构元素 08-29 对标矩阵已确认齐平甚至反超)。

**据此审自家实体信号,并纠正我自己的首个判断**:
- 初判「EcoBack 被断言 122 次却从未定义」——**错的**。首页**有**规范节点
  `https://getecoback.com/#org`(带 logo/description/knowsAbout,被 WebSite 节点引用)。
- 真实缺陷更锋利:**363 个 Organization 提及里 362 个是匿名空节点**
  `{"@type":"Organization","name":"EcoBack","url":"…"}`,**没有一个指回那个定义**。
  对解析器而言那是「362 个碰巧同名的组织」,不是「一个有 198 页的发行方」。
  **实体图一直存在,但是孤儿。**

**已落地 `tools/build_entity.py`(进 deploy 流水线,build_xlinks 之后、build_hreflang 之前)**:
① 给每个匿名提及加 `@id` 指向规范节点——现网 **365 处引用 / 184 页**全部解析到
`#org`,匿名节点归零;② 规范节点补两条 eco **能诚实主张、而多数竞对没有**的属性:
`publishingPrinciples` → wie-wir-empfehlen.html、`mainEntityOfPage` → ueber-uns.html
(**每条必须对应真实存在的文件,否则构建失败**);③ **不发 `sameAs`**——本站没有任何
已验证的外部档案,编一个正是本站在别处拒绝的那种借来的权威。
**闸门双分支实测**:重新注入一个匿名节点 → 被修复并计数;把 JSON-LD 弄坏 → 退出码 1。
全流水线二次运行 **byte-stable**,四道既有闸门(events/adlabel/faq-parity/cited-figures)全过。

**诚实预期,别过度承诺**:实体归并是**必要条件不是充分条件**——它让 eco 的 198 页
在解析器眼里终于是一个发行方,但它不会凭空造出商家那种线下实体信号。
**判定线(2026-10-31,60 天)**:①Bing/AI 面被引页的品牌关联(Bing WMT 快照,owner 侧)
②GA4 ai-assistant 渠道会话 ≥70(现 57)。两项皆无变化 → 记入反面发现:
**结构化实体标记对本站量级不产生可测收益,停止在 schema 层投入,把力气还给需求侧。**

**本轮刻意没做的**:没新增页(SERP 证据说明新页打不进这类 SERP)、没动内容层
(对标矩阵已齐平)、没申请任何非 Amazon 联盟(owner 明令变现只走 Amazon)。

## 增长挖掘与售卖内容丰富层（2026-07-10 增补）

> 触发词："自动化挖掘网站增长方案，丰富售卖内容，提升新站流量"。每轮按下面三步走，全程自动化、批量执行。

**Step A · 自动挖掘增长点**（每轮 2–3 个 WebSearch，产出=经竞争度验证的机会清单）：
1. **品类邻接挖掘**：从现有页面主题出发找"同一买家、下一个购买"的邻接品类（热浪场景：Fensterfolie/Thermovorhang/Hitzeschutz 配件、宠物降温、办公降温），逐词查德语 SERP——大评测站占满首屏=弃，论坛/小站/电商占屏=可做。
2. **问题词挖掘**：从已有 KGR 页的 FAQ 延伸"下一个问题"（tropft→Dauerablauf；stinkt→Filter kaufen），问题词天然低竞争。
3. 机会清单写入候选队列（带竞争度结论），红海词标记"已弃"防止重复调研。

**Step B · 丰富售卖内容**（转化结构全站化，参考竞对结论：具体型号+角色标签>通用搜索框）：
1. 盘点缺"型号推荐卡"的 guide 页（grep 无 `Preis auf Amazon` 按钮的页面），按流量潜力排序批量补卡：每页 1–2 张卡（型号名+角色标签+1 行优缺点+橙色按钮，链接=按型号名的 amazon 搜索）。
2. 型号选择只用站内已背书型号（De'Longhi PAC EX105 / Comfee MPPH-09CRN7 / AEG ChillFlex Pro / Midea PortaSplit / Pro Breeze 等），保持全站推荐一致性；新品类型号须先 WebSearch 确认公开评测共识。
3. 每张卡诚实标注来源（汇总公开评测），不虚构分数。

**Step C · 批量执行与上线**：并行 agent 批改/新写 → 标准校验 → 三件套构建 → commit/push（CI 部署+IndexNow）→ 结论记录。

## 自主技能层（2026-07-11 增补）

- 开源技能注册表（npx skills）经查无 seo/marketing/growth/conversion 类技能 → 改为**项目自有技能**固化流程（仓库内 `.claude/skills/`，任何未来会话自动加载）：
  - **`/revenue-round`**：每轮营收循环入口（测量→诊断→执行→记录，含页面标准与硬约束）
  - **`/kgr-page`**：KGR 长尾页产出流程（竞争度判定→写页规格→验收清单→收尾）
- 好处：跨会话执行一致性不再依赖会话记忆/压缩摘要，新会话直接 `/revenue-round` 即可继续推进。
- marketing 插件（用户已启用）技能条目注入后，将其转化文案/增长框架并入上述两技能。

## 营销技能层（2026-07-10 增补）

- 技能市场调研结论：`marketing`（营销工作流）与 `searchfit-seo`（SEO 审计）两个插件与目标直接相关，已向用户渲染安装卡；**每轮开头 ListPlugins 检查是否已启用**，启用后立即接入（searchfit-seo → 全站 SEO 审计出优化清单；marketing → 转化文案/增长策略复审货币页）。
- 插件未启用时的替代打法（业界方法论手工执行）：
  - **转化文案**（Copyhackers/CXL 共识）：标题=结果承诺+具体性；CTA=第一人称收益（"Preis ansehen"→保持，A/B 只在有流量后做）；速选框放首屏（"Auf einen Blick"）；每个货币页 1 个主 CTA 不稀释。
  - **信任要素**（联盟站标配）：诚实 disclosure、"未自测"标注、更新日期可见、关于页可达——已全站落地，新页自动继承。
  - **内链漏斗**：KGR 流量页 → 货币页 → Amazon；每轮检查新页内链是否指向货币页（转化主力）。

## 约束（不可违反）

- 不伪造测评/评分/ASIN；型号推荐注明"汇总公开测试"
- 不做垃圾外链、不向社群自动发帖（封号风险）、不做 doorway 页
- 用户侧动作只提醒不代劳：GSC 请求编入索引、PartnerNet 付款/税务信息、连接器重连

## 关键账号/参数备忘

- GA4: G-E2V0Q9SJ9V (property 544688614) · Amazon 标签: getecoback-21 · IndexNow key: dc2860e32f47689a11c7bc07a21f6ffb
- 自动化：push → CI 重建 sitemap/feed → 部署 → 健康检查 8 端点 → IndexNow 推送 77 URL
- 监控：会话内 cron 每 8h 查收录/GA4/佣金邮件，首信号推送用户
