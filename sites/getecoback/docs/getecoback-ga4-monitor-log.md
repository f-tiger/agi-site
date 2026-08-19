# getecoback.com — GA4 每日监控日志

数据源：Supermetrics MCP `GAWA`（Google Analytics 4，已鉴权，连接账号 t***t@gmail.com（完整地址不入公开仓））
GA4 Property：`544688614`（getecoback.com）· Measurement ID `G-E2V0Q9SJ9V`
监控口径：Direct 通道视为爬虫/监控噪声（历史 P2 已确认：会话集中首页、engaged 极低）；
**真实基线 = Organic Search + AI Assistant + Referral 通道 + affiliate_click 事件**。

---

## 2026-07-19（基线首跑，/goal「自动连 GA4 做每日监控+优化」）

**近 28 天通道（活跃用户 / 会话 / engaged）**

| 通道 | 活跃用户 | 会话 | Engaged 会话 |
|---|---|---|---|
| Direct（噪声） | 100 | 101 | 15 |
| **Organic Search** | **11** | 13 | 6 |
| **AI Assistant** | **5** | 5 | 0 |
| Unassigned | 5 | 5 | 1 |
| **Referral** | **4** | 4 | 1 |

**关键事件（近 28 天）**：`affiliate_click` **14** · user_engagement 41 · scroll 16 · click 12
→ 对照 `getecoback-optimization.md` 验收目标「affiliate_click ≥10 且可归因」：**已达成（14）**。

**Top 落地页（真实非首页）**：
1. `/en/guide/portable-ac-tilt-and-turn-windows.html` — 10 会话（全站头号自然入口，EN 主力）
2. `/guide/klimaanlage-reinigen.html` — 4
3. `/guide/klimaanlage-kippfenster.html` — 2
4. 长尾各 1 会话：bei-hitze-schlafen、homeoffice-buero-kuehlen、klimaanlage-mietwohnung、
   klimaanlage-stromkosten、klimaanlage-vs-luftkuehler、luftentfeuchter-25-qm、
   mobile-klimaanlage-zu-laut、zimmer-kuehlen-ohne-installation、best-portable…heatwave(EN)

**诊断**：
- **AI Assistant 5 用户**是 llms.txt + ai-seo 投入开始变现的新信号（LLM 引用带流量），值得继续喂 AI 可读层。
- EN tilt-and-turn 是唯一上量的自然入口（10 会话），继续加固该页与其簇。
- 站点仍处收录前牵引期：Organic 11 用户但深页多为 1 会话，权重未铺开，属正常滞后。
- 本轮已 ship 的改动：**全站性能优化**（Worker 缓存头 + gtag preconnect，部署 run #138 绿）——Core Web Vitals 是 Google 排名信号，服务于流量加速。

**下一轮优化候选队列**（每次只做 1 个，遵守克制原则，5 轮内不重复改同一页）：
- [x] EN tilt-and-turn 页（头号入口）：已加顶部可提取直答块(AEO)+刷新度 — 2026-07-19
- [ ] AI Assistant 有流量 → 深化 llms.txt / 给 top 页补可提取直答块（AEO）
- [ ] klimaanlage-reinigen（第二入口）：CTR 标题复核 + 型号卡巩固
- [ ] 给长尾 1-会话页补上下文内链，破孤儿、传拓扑权重
- [ ] 刷新最陈旧页 dateModified（新鲜度信号）

## 2026-07-19（执行轮 · AEO 直答块）

对头号自然入口 **EN tilt-and-turn（10 会话）及其德语孪生 kippfenster** 各加一个顶部自包含
「可提取直答块」（Quick answer / Kurze Antwort，~65 词，逐字覆盖三种密封方案+价格+租户可行），
并刷新两页 dateModified→2026-07-19。**动机**：AI Assistant 通道已有 5 用户（LLM 引用变现信号），
顶部自包含直答是 AI Overview/ChatGPT/Perplexity 与 Featured Snippet 逐字抬升的最高频面——
在已排名的头部页上加它，是把「已有展示/流量」转成更多曝光的最高杠杆、且复利于新兴 AI 通道。
校验 ALL CLEAN（JSON-LD 解析/徽标同步/EOF/NAV 唯一/affiliate_click 在位）。

## 2026-07-19（每日循环首次自动触发 · 自绑定会话验证 ✅）

**连接器验证**：cron 唤醒本会话后 GA4 连接器存活、三查询正常返回 → **全自动闭环成立，无需用户 UI 操作**。
**GA4 近28天**（与1h前一致，无新变化）：真实基线 Organic 11 + AI Assistant 5 + Referral 4；affiliate_click 14。
**本轮优化**：全站最高展示页 `best-portable-air-conditioner-europe-heatwave`（GSC ~167–209 展示/pos10/0点击=最大曝光洼地）**顶部加可提取直答块**（Quick answer，~70词：BTU×房型三档 + De'Longhi/Comfee/Klarstein 三型号角色，与该页 BTU 表和 FAQ schema 逐字一致）+ dateModified→07-19。动机：把 200 展示争 Featured Snippet 转点击 + 喂 AI Assistant 通道。校验 ALL CLEAN。
**队列**：heatwave 已做；下轮候选=klimaanlage-reinigen(已拿点击,标题不动,仅可加除垢产品卡)/长尾1会话页内链/其余top页AEO。

## 2026-07-20（每日自动循环 · 次日）

**GA4 近28天变化**：**AI Assistant 通道 5→7 用户（+2，持续增长）**=AEO/llms.txt 投入复利变现，最强正向信号；Organic 11 持平、Referral 4 持平、affiliate_click 14 持平；heatwave 落地页 1→2（07-19 加的直答块页微升）。
**本轮优化**：对比型货币页 `klimaanlage-vs-luftkuehler`（有真实自然会话、AEO 最弱=既无顶部直答块又无 FAQPage）**加顶部可提取直答块**（Kurze Antwort，~75词：60–120W vs 800–1400W 运行成本对比 + 降温真实性 + 价格，与该页对比表和 Betriebskosten 段逐字一致）+ dateModified 07-09→07-20。动机：顺 AI Assistant 增长势头，「X vs Y 谁更省」是 Featured Snippet/AI 引用最高频题型。校验 ALL CLEAN。
**队列更新**：vs-luftkuehler 仍缺 FAQPage schema（需配可见「Häufige Fragen」，留作后续）；klimaanlage-stromkosten 同样缺直答块+FAQ（下轮候选）；长尾1会话页内链；其余 top 页 AEO。

## 2026-07-21（每日自动循环 · 第3天）

**GA4 近28天变化**：**AI Assistant 通道 7→8 用户（两天累计 5→8 = +60%），且首次出现 1 个 engaged 会话**（此前 0）=AEO 策略持续验证，明确的增长引擎；Organic 11 / Referral 4 / affiliate_click 14 持平。加过直答块的页 tilt(11→12)/kippfenster(2→3)/heatwave(2) 均微升。
**本轮优化**：成本型货币页 `klimaanlage-stromkosten`（有真实自然会话、缺直答块+FAQ）**加顶部可提取直答块**（Kurze Antwort，~75词：30ct/h(1000W)–42ct/h(1400W) + Watt÷1000×kWh公式 + 月30–50€ + 风扇/空调器对比，与页内表格和公式逐字一致）+ dateModified 07-17→07-21。动机：「一小时多少钱」是成本直答题型标杆，顺 AI Assistant 增长势头。校验 ALL CLEAN。
**队列**：stromkosten 已做；剩 vs-luftkuehler/stromkosten 补 FAQ schema、长尾1会话页内链、其余 top 页 AEO（如 klimaanlage-mietwohnung 缺顶部直答块）。

## 2026-07-22（站级 GEO+SEO 升级 · ai-seo 技能驱动，用户指令"深度分析+整站升级快速起量"）

**GA4 深度分析**：GA4 未接 GSC（organicGoogleSearch 指标不能与 landingPage 组合）、站太新环比无数据 → 用会话趋势定位。**最大流量 & 增长最快 = `en/guide/portable-ac-tilt-and-turn-windows`（13 会话，四天 10→11→12→13 稳升，全站唯一持续上量入口、唯一持续点击页 pos~9-10）**。其余全 1–4 会话。战略=押注这个已验证赢家的话题簇（移动空调+窗型密封），做成站点权威簇（应对 Google query fan-out）。
**本轮站级升级三件**：① **robots.txt 显式放行全部 AI 搜索爬虫**（GPTBot/OAI-SearchBot/PerplexityBot/ClaudeBot/Google-Extended/Bingbot/Applebot-Extended）——被 AI 引用的前提，站级使能；② 给赢家页 EN tilt-and-turn + 德语孪生 kippfenster 上 **Princeton GEO 头号杠杆「带来源统计」(+40%，低排名站收益更大)**：真实数据 Verivox 2026「69% 德国有空调家庭用移动 Monoblock→都要过窗密封」+ 外链来源，直接强化页面论点、守 E-E-A-T；③ 簇内链已在位（tilt↔kippfenster hreflang、kippfenster→dachfenster）。方法论据 ai-seo 技能：对比/指南类被引率最高、Cite sources+Statistics 是最强组合、keyword stuffing 反而 -10%。均校验 ALL CLEAN。
**下一步**：把 GEO 统计层扩到簇内其余窗型页（dachfenster/ohne-fenster/einbruchschutz）+ 补 Perplexity 可引结构；继续只投 pos≤12 页。

## 2026-07-22（工具导流 · 用户洞察"工具页点击好但本站无工具导流"）

**数据交底**：按 GA4(544688614) 过滤含 rechner 的页面，近28天「No data found」——getecoback 自己的 3 个计算器页目前几乎零流量（未被高流量页导流、未排上去）。用户看到的"工具点击好"很可能来自姊妹站(agiscorecard /agi-test)。但战略成立：交互工具=高参与+高转化+易被AI引用，本站缺"工具导流"结构。
**本轮落地**：在**首页最高流量位**(deals 区顶部)嵌入内联交互「Schnell-Auswahl: Welche Klimaanlage für dein Zimmer?」选择器——4档房间尺寸(≤15/15–25/25–35/>35 m²)→即时输出 BTU 区间+角色标签+具体型号卡(Comfee/De'Longhi Pinguino/Klarstein，与站内背书型号一致)→按型号名 Amazon 搜索链接(tag=getecoback-21，不伪造ASIN)+affiliate_click 追踪+诚实"未自测"标注。零依赖 vanilla JS、不拖慢首页(node --check 通过)。**漏斗**：高流量首页→交互工具(当场参与+决策)→型号推荐(Amazon 变现)，减少跳转流失。ECC skills 复核：营销4件(seo/article-writing/market-research/content-engine)早已装，其余全后端框架类无关，不重装。
**下一步**：从赢家簇(tilt-and-turn等)加"不确定尺寸？用选择器"入口导流；给 btu-rechner 页也接同款型号卡输出；观察 GA4 ac-finder 的 affiliate_click 是否起量。

## 2026-07-22（工具导流做透 · 用户选"现在继续"）

**发现**：btu-rechner 页**本就是完善的规范工具**——交互计算器已输出 BTU + 型号卡（Comfee MPPH-09CRN7/De'Longhi Pinguino PAC EX105/Klarstein，含天花板/日照/人数/厨房修正）+ Amazon 链接（tag）+ btu_calc/affiliate_click 追踪 + 导流到 X-qm 货币页。所以"接型号卡"已具备，真缺的是**入口导流**。
**本轮**：幂等脚本给 **8 个高价值德语 AC 页**（赢家簇 kippfenster + 选购/货币页：hitzewelle/schlafzimmer/vs-luftkuehler/stromkosten/vergleich/unter-300-euro/oder-ventilator）注入统一「🧮 Unsicher bei der Größe? → Zum BTU-Rechner」导流入口（`<!--eb-toolcta-->` 幂等守卫，锚在 EB_RADAR 前）。形成完整漏斗：**内容页/首页 → 交互工具(btu-rechner 或首页 widget) → 型号卡 → Amazon**。8 页均校验 ALL CLEAN，首页 widget 仍在。
**下一步**：观察 GA4 btu_calc/ac-finder 事件与 affiliate_click 是否起量；EN 侧可复制（需 EN 版计算器，暂缓）；未来新 AC 页可把此 CTA 并入 build_structure 按分类注入。

## 2026-07-22（工具可被 SEO/GEO 检索 · 用户指令"工具继续拓展并可被 seo/geo 检索"）

**核心痛点**：计算器答案锁在 JS 里→Google/AI 跑不了 JS→工具"算得出但检索不到"（ai-seo 明确警告 JS-only 内容对搜索和 AI 都不可见）。
**本轮**：① 旗舰 `btu-rechner` 加**静态 BTU 速查表**（bis 15/15–25/25–35/>35 m² → 7.000–9.000/9.000–12.000/12.000–14.000/14.000+ BTU → 型号，值与全站权威表 wie-viel-btu 逐字一致、内链 klimaanlage-X-qm 货币页）——把 JS-only 答案变成可爬可引的静态数据；② 给 **3 个计算器页全部加 WebApplication schema**（applicationCategory=UtilitiesApplication、isAccessibleForFree、price 0）——标记为免费在线工具，SEO/GEO 工具检索信号；③ dateModified→07-22。3 页 JSON-LD 解析 OK、WebApplication 就位、静态表在位、ALL CLEAN。**意义**：工具从"孤立 JS 小部件"变成"可被 Google Rich Result / AI Overview / Perplexity 检索并引用的静态知识+工具实体"。
**下一步**：EN 版计算器（把 btu-rechner 镜像到 EN 承接英语搜索）；工具页补 Perplexity 可引直答块；观察工具页是否开始进 GSC 展示。

## 2026-07-22（EN 版 BTU 计算器 · 用户"继续"，赢家在 EN 区最对口）

**新增** `en/guide/btu-calculator.html`：德语 btu-rechner 的完整英文镜像——交互计算器(房间/天花板/日照/人数/厨房→BTU+型号卡 Comfee/De'Longhi/Klarstein+amazon.de tag 链接+btu_calc/affiliate_click 追踪)、**静态 BTU 速查表**(可爬可引，值与全站权威表一致)、**WebApplication+Article+Breadcrumb+FAQPage+HowTo schema**(SEO/GEO 工具检索信号)、与德语 btu-rechner **互挂 hreflang de↔en**(德语页回填 en alternate)。**导流**：EN 赢家页 portable-ac-tilt-and-turn-windows(全站最大流量 13 会话) + EN heatwave 各注入英文「Not sure what size? → Open the BTU calculator」入口。sitemap 已收录新页。EN 计算器两段 JS node --check 通过、ALL CLEAN。**动机**：赢家在 EN 区，EN 此前无交互工具；工具从建成即带 静态可检索层 + schema，避免重蹈德语计算器"JS-only 检索不到"覆辙。
**下一步**：观察 EN 计算器进 GSC 展示/GA4 btu_calc 事件；工具页可补 Perplexity 直答块；EN 侧可继续补 X-qm 承接页。

## 2026-07-22（竞对调研→差异化爆款工具 Hitze-Check · 用户"调研竞对找爆款再扩展"）

**竞对调研结论（强制竞对调研规则）**：德国降温/能源工具三大类全是红海——BTU/Kühllast 计算器(Bosch/Buderus/klimaanlagentest/rechner-portal/solar.red)、Stromkosten 计算器(klimaruf/luftiq/co2online)、Heizkostenrechner(co2online HeizCheck/deutschland-rechner)。**爆款形态洞察**：co2online HeizCheck 之所以爆，不是算得准，而是「输入自家情况→个性化评分+对比」的 Check 形态(代入感+可分享)。**全德无一个降温版 HitzeCheck=蓝海**。
**落地**：新建 `guide/hitze-check.html`——差异化「Hitze-Check: Wie stark heizt sich dein Zimmer auf?」：4 问(楼层/朝向/窗户/隔热)→过热风险分(0-100，红黄绿)+个性化建议漏斗(**诚实「遮阳优先」**→按风险 Ventilator/Luftkühler/mobile Klimaanlage)+产品链接(amazon tag)+hitze_check/affiliate_click 追踪。带**静态因子表+完整 schema(WebApplication+Article+Breadcrumb+FAQPage)**=可被 SEO/GEO 检索。差异化(竞对无)、贴热浪主题、可分享、导流多品类(遮阳/风扇/空调)。评分 JS node --check 通过、ALL CLEAN。导流入口：首页工具行+dachgeschoss/hitzeschutz/lüften/schlafen 4 页。sitemap 116 URL。
**下一步**：观察 GA4 hitze_check 事件；若起量→做 EN 版 Heat-Check；工具页补 Perplexity 直答。

## 2026-07-22（工具病毒化 + 首页互动 · 用户"工具和首页形成互动+可分享病毒式传播"）

**病毒引擎**：给 Hitze-Check 结果加**分享模块**——① Web Share API（移动端原生分享，navigator.share）② WhatsApp 一键分享（wa.me，预填「我的房间是[高]过热风险 72/100 🌡️ 你的呢？」+链接）③ 复制链接（clipboard，反馈"Kopiert ✓"），全部 gtag `share` 事件追踪(method/score)。形成 分享→朋友做测试→再分享 的循环（co2online HeizCheck 式传播机制）。**首页互动**：① 首页 AC-finder 结果→交叉导流「🌡️ 你的房间多热？做 Hitze-Check」；② 首页 AC-finder widget 下方加醒目 Hitze-Check 入口卡（两个交互工具在首页顶部成对）；③ 首页工具行已含 Hitze-Check 链接。**关键 QA**：node --check 抓出并修复 WhatsApp href 单引号未闭合的真 bug（否则会 ship 坏掉的分享按钮）——再次验证 node 语法门禁的价值。全部 ALL CLEAN。
**下一步**：观察 GA4 share/hitze_check 事件；若分享起量→做 EN 版 Heat-Check + 给其余工具(BTU/AC-finder)也加分享；分发 Reddit 合规草稿。

## 2026-07-22（EN 版 Heat-Check · 用户"继续"，病毒工具落地赢家语言区）

**新增** `en/guide/heat-check.html`：德语 Hitze-Check 的完整英文镜像——4 问过热风险自测(楼层/朝向/窗户/隔热→红黄绿风险分)+个性化建议漏斗(诚实遮阳优先→按风险 fan/air cooler/portable AC)+**分享模块**(Web Share/WhatsApp/复制，EN 预填"My room has a high overheating risk 72/100 🌡️ How hot does yours get?")+heat_check/share/affiliate_click 追踪。带静态因子表+WebApplication/FAQPage schema。与德语 hitze-check **互挂 hreflang de↔en**(德语页回填 en)。交叉链：EN BTU 计算器 related + EN 赢家页 tilt-and-turn + EN heatwave related 各加 heat-check 入口。分享 JS node --check 通过(复用上轮修好的 WhatsApp href 写法)、ALL CLEAN。sitemap 收录。**动机**：赢家流量在 EN 区，病毒工具必须落在有流量处(与 EN BTU 计算器同策略)。
**下一步**：观察 GA4 heat_check/share 事件；两个 Check 工具(DE+EN)已就位，可考虑给 BTU 计算器结果也加分享；Reddit/社群分发合规草稿(docs/marketing)可在有基础流量后手动发。

## 2026-07-22（首页去返现·重定位为「工具+推荐购物」站 · 用户指令）
**监控**：GA4 近28天 Organic 11/AI Assistant 8/Referral 4 持平，affiliate_click 14→15；新工具事件待重爬+首访产生，属正常。
**重定位（用户："网站整体首页返现定位改掉，变成工具与推荐购物网站"）**：站点原「EcoBack-Cashback（未落地的 USDC 加密返现）」是承诺不存在的功能=E-E-A-T 风险。**全站清除返现**：① DE+EN 首页 hero 表单(返现登记→Hitze/Heat-Radar 预警)、meta/OG、「So funktioniert EcoBack-Cashback」区块(→「So funktioniert EcoBack」=①用工具 ②比较诚实选品 ③经我们链接购买同价)、deals-note、2条 cashback FAQ(→费用/选品方法)全部改写；② 幂等脚本把 **15 个 guide 页的 Cashback CTA 盒子**统一换成「工具+诚实选品」CTA(DE/EN 分别)；③ datenschutz 表单用途 Cashback→Hitze-Radar。**全站 cashback 残留=0**。新定位=免费工具(6个 Rechner/Check)+诚实模型推荐(公开测评、标注未自测)+Amazon 联盟，诚实且与实际一致。两首页 JSON-LD/widget/JS 校验 ALL CLEAN。
**下一步**：观察定位调整后 engagement/affiliate_click；工具矩阵已成型，后续靠内容排名+病毒分发起量。

## 2026-07-24（日更 · GEO trifecta 引用统计上主力买家页 + 交易化并入 main）
**监控（GA4 28d, 忽略 Direct 爬虫噪声）**：真实通道持平——Organic 11 / AI Assistant 8 / Referral 4；事件 affiliate_click **16**（14→15→16 缓升，未及 20/28d 里程碑）、click 14、user_engagement 51、scroll 19。落地页真实核心=**`/en/guide/portable-ac-tilt-and-turn-windows.html` 13 sessions/12 users**（全站唯一有量 organic 页，pos~9），其次 reinigen 4、kippfenster 3、EN heatwave 2。趋势=前牵引期，无异常放量。
**优化（新方法论 pos≤12 GEO trifecta）**：EN tilt-turn 已有 Verivox 引用块（69% 便携式），故转向**无权威引用**的主力买家页 `beste-tragbare-klimaanlage-hitzewelle`（pos~10、商业意图）。加真实可引用统计块（WebSearch 核实、绝不编造）：2024 年 **19% 德国家庭用空调**（13%→19%）、另 **19% 计划购买**、产量 5 年 **+75%**（Verivox 2024 调查 via Clean Energy Wire，带外链 rel=noopener）。= 权威引用 + 社会证明 + 购买紧迫感，提升 AI 引用面与转化。dateModified 刷新 07-24、徽标同步。
**Git**：main 原落后 22 提交（交易化三层改造全在工作分支）；本次 fast-forward 把结构/内容/媒体三层 + 今日引用块**并入 main**（HEAD==origin/main 验证 MATCH），main 恢复为生产真源。首推 main 遇一次 Internal Server Error，重试第 2 次成功。
**下一步**：观察 heatwave 页是否被 AI（Perplexity）引用该统计、affiliate_click 是否续升；其余无权威引用的 pos≤12 页（zimmer-kuehlen/reinigen）可依次补真实引用统计（每次一页、先 WebSearch 核实来源）。

## 2026-07-24（扩流批次 · 用户"优化网站的整体，带来扩展流量"）
**诊断**：GSC 鉴权失效（owner 需在 Supermetrics 重连 GW），用 GA4 实测+存档数据代替。结构缺口=①EN 区是流量赢家（tilt-turn 13 sessions=全站唯一起量页）但供给仅 21 页 ②Heizen 仅 9 页最薄且 infrarotheizung 簇 7 月已 64 展示=秋冬需求信号，收录周期 2-8 周 → 秋冬批次提前到现在写 ③pos≤12 头号词页缺权威引用。
**落地 3 项**（2 写手并行 + 主循环优化，全部 KGR 先行）：① `en/guide/how-to-clean-portable-air-conditioner.html`（镜像 DE 点击赢家 reinigen，↔hreflang 双向回填，KGR=品牌博客+问答无权威；1300 词+FAQ 4 问+霉菌诚实边界；smells-musty/leaking-water 各 1 入链）② `guide/heizluefter-stromverbrauch.html`（复制已验证 ventilator-stromverbrauch 成本页模式；2 kWh/h→0,80 €/h@40ct 可验算数学+AEO 表；KGR=solar.red/品牌/论坛无 ADAC/StiWa；stromsparend/infrarotheizung-ratgeber 各 1 入链）③ zimmer-kuehlen 加 DWD 热日翻倍统计（4,2→8,9 天/年，via Tagesspiegel 外链，与 heatwave 页 Verivox 统计不重复）。**毙掉** infrarotheizung-nachteile（ADAC+Bosch 红海）。
**注入器修复**：`cat_of()`/`collect_articles` 只认 `heizung-` 前缀导致新页可见面包屑归 Klimaanlagen 而 schema 是 Heizen（可见/结构化不一致隐患）→ 前缀规则扩为 `heizung-/heizluefter-/infrarotheizung-`，watt-rechner 一并正确归入 Heizen 枢纽（heizen 10→12 页）。sitemap 119 URL、llms.txt 86 DE+22 EN。全站 ALL CLEAN。
**下一步**：观察两新页收录（IndexNow 随部署自动推送）；GSC 恢复后核对 heizluefter/EN clean 词展示；秋冬批次余下候选（mobile-klimaanlage-ueberwintern 已有、Infrarot 深化待 KGR）。

## 2026-07-25(GEO 强化 · 用户"GitHub 调研 GEO skills→全站更强 GEO 导流")
**调研结论(研究员核实 10+ 仓库+学术/行业证据)**:全部不装——90% 是审计型,审计项(robots 放行/schema/直答块/内链/新鲜度)本站已满配;claude-seo 12.3k★ 07-12 已评审。**关键证据**:①llms.txt 非引用杠杆(Ahrefs:97% 零流量;Google/OpenAI 官方均不依赖)——已上线的 llms.txt/llms-full.txt 保留(零维护自动化)但不再投入;②真实引用因子=站外品牌提及(相关性 0.664-0.737)>自包含答案块(4.2 倍)>前 30% 位置(44.2% 引用来自此)>问句 H2(2.8 倍)>新鲜度(65% 爬虫命中一年内);③Princeton trifecta 各 +30-40% 已被 AutoGEO ICLR'26 复证跨引擎迁移。
**本轮已落地**:①`llms-full.txt` 全文层(108 页净化正文+可引用 URL,588 KB,幂等)——调研后定位为 token 效率补充而非引用杠杆;②**实体一致性层**:4 分类枢纽 CollectionPage 加 `about` 实体锚(可验证 Wikipedia URL,不编 QID)+首页 DE/EN Organization 加 `knowsAbout`——AI 引擎 semantic trust 的实体图谱信号,一次性进注入器全自动。
**进入优化队列(逐轮消化)**:①trifecta 铺开:对 GSC Top 20-30 展示页逐页 WebSearch 核实统计+机构引言(半自动,Workflow 写手+中央复校,禁伪造);②答案块规格化:审计 62 个 Kurz-gesagt 块→统一 100-170 词自包含+首句实体全称+前 30% 位置(可全自动);③问句式 H2 改写(命中 GSC 原词形态);④站外层:reddit-drafts 管线扩充(草稿自动,发布需用户);⑤Top 展示页 dateModified<90 天滚动(已有机制,写进 Routine 规则)。

## 2026-07-25(储能方向调研 → PARTIAL-GO → Solar-Speicher 子簇上线 · 用户"储能卖爆,调研+更大范围重构,目标营收")
**调研结论(研究员 24 次检索,全部带来源)**:PARTIAL-GO——需求真实爆发(MaStR 133 万台注册、2026 年 850 台/天新增、2024 储能装机 22.2 万台 +97%、60% 用户是租户=与本站受众重合);长尾绿(nachrüsten/winter/问题词=品牌店+论坛占位)但头部红海(StiWa/heise/home&smart 占 test/对决词);客单 500-1500 €×佣金=单笔 27-54 €(高风扇 8-15 倍),但 24h cookie×高决策周期逆风+归类不明(Baumarkt 6% vs Elektronik 1-3%,**需 owner 在 PartnerNet 后台核实**)。**故:子簇=客单价上限层,Raumklima 主站继续当单量引擎保 3 单存活线,不推倒重构。**
**落地(4 新页+基建,sitemap 119→123)**:① `balkonkraftwerk-speicher-nachruesten`(购买意图,MaStR/Strom-Report 引用块)② `balkonspeicher-winter-frost`(秋冬档,进季节轮换器 herbst teaser)③ `growatt-noah-2000-probleme`(问题页模式,诚实汇总 Photovoltaikforum)④ `balkonspeicher-rechner`(交互计算器绕开 ADAC 红海,WebApplication+HowTo schema,JS node --check 过)⑤ 注入器:储能分类映射(balkonkraftwerk-/balkonspeicher-/growatt-/zendure- 前缀→energie-sparen)+电池 SVG+储能型号卡组(Anker Solarbank 3/EcoFlow STREAM/Zendure 800 Pro,真实调研价位带)+枢纽购物卡 ⑥ 桥页 klimaanlage-balkonkraftwerk 补 Speicher 段+互链;stromkosten-rechner/strom-sparen-haushalt 中央入链。**插曲**:4 写手中 3 个死于会话限额,但页面均已写完──独立复校 4 页全过(rechner @graph 拆为站内约定独立块)。全站 ALL CLEAN。
**待办**:owner 核实 Amazon 佣金归类(决定投入力度)+垂直联盟(Kleines Kraftwerk 10%/Solakon 5%)注册;第二批候选 zendure-ab2000-erfahrungen/dynamischer-stromtarif 待 KGR 复核后由日更消化。

## 2026-07-25(工具引流层 · 用户"工具引流而非盲目交易,先调研业界交易模式")
**调研结论(23 次检索带来源)**:业界工具→营收机制排名=①结果页即联盟推荐(品牌商 Solakon/Priwatt/EcoFlow 全在用)②结果免费+增值邮件捕获(交互 lead magnet 转化高约 70%,**不设门禁**——gated 压制 embeds)③开放 embed 分发=外链引擎(co2online 白标模式 20 年,开放工具 3-6 个月自然积累外链)④lead-gen(20-249€/lead)仅适用屋顶 PV,BKW 无安装商市场=不做。**HTW Berlin 学术模拟器占"精确"位→小站差异化="30 秒出可执行结论+具体产品建议"**;巨头(Check24/Verivox)只做列表不做计算器=计算器词留给中小站。SERP:amortisation/lohnt-sich 词前排全是小站=KGR 绿;"BKW-Speicher lohnt sich"=交互工具真空。
**落地 T1**:`balkonkraftwerk-lohnt-sich-rechner.html`——「Lohnt sich?」合一计算器(Ertrag+Amortisation+mit/ohne Speicher 对比):输入功率/朝向档(静态系数,诚实 ±20%)/电价(预置 37ct)/购价/Speicher 勾选;输出判定+年产/省钱/回本/20 年净益。**转化出口三层**:①结果即推荐(按功率档 amazon 搜索链,gtag source=bkw-rechner)②Speicher 勾选→导流 Größen-Rechner(决策链 lohnt sich?→welche Größe?→nachrüsten)③**embed 按钮**(iframe+Quelle 回链=外链引擎,gtag embed_copy)。静态 AEO 锚点表+5 schema 块(Article/Breadcrumb/WebApplication/HowTo/FAQPage),数学与表一致(800Wp Süd senkrecht=560 kWh/114 €/4,4 J)。3 条决策链内链。sitemap 124。**T3(秋季)进队列**:Zusatzheizung-Kostenvergleichsrechner(Heizlüfter vs Infrarot vs Klima-WP,9 月季节切换时上线)。

## 2026-07-26(日更 · reinigen 页 GEO trifecta)
**监控(GA4 28d)**:通道持平(Organic 11/AI 9/Referral 4);**affiliate_click 16→19,逼近 20/28d 里程碑**;落地页核心不变(EN tilt-turn 13、kippfenster 4、reinigen 4)。昨日 3 deploy 补验全绿(#174 储能簇/#176 能源定位/#178 T1 计算器)。储能新页处收录期,GA4 暂无信号=正常。
**优化(pos≤12 trifecta)**:`klimaanlage-reinigen`(pos~7.9、有真实点击、无权威引用)加 UBA 引用块:联邦环境署建议通风/空调滤网至少年换一次防霉+专家共识 30-90 天清洁+蒸发器=卫生最关键部件(via heizsparer.de 外链,内含 UBA 出处)。前 30% 位置、自包含、与既有"每两周"建议一致不冲突。dateModified 07-26。
**下一步**:affiliate_click 破 20 即触发里程碑通知;GSC 鉴权仍断(owner 需重连);T3 秋季计算器/答案块规格化在队列。

## 2026-07-26(深度调研:能源工具破流量/病毒机制 · /deep-research 工作流)
**执行**:5 路搜索→15 源抓取→逐 claim 三票对抗校验(35/102 agents 完成,67 个死于会话限额,合成步失败——结论按校验状态诚实分级)。
**三票全确认(co2online 飞轮=业界最强工具引流实证)**:①StromCheck 免费工具收集 5.7 万户数据→Stromspiegel 研究→媒体转载→流量回流工具(工具喂数据飞轮);②爆点=聚合浪费数字("德国家庭年浪费 120 亿 € 电费",myHOMEBOOK/Utopia/Mieterbund 集体转载);③**分享触发器=个人化对比数字**("比节俭同类家庭多付 280 €/年")。
**未完成校验但方向一致(标注待验)**:SMARD 免费电价 API(无鉴权 JSON)可做纯前端实时电价/负电价工具;Tibber"负电价纪录"月度钩子稳定收割新闻外链(2025-05-11 首次净负电价 -8,6ct、H1'25 负电价 389h);Ahrefs 工具集群策略(百万月访问)、Omni Calculator 组合模式。
**已落地(严格限于确认模式)**:Lohnt-sich-Rechner 结果页加**个人化省钱数字分享环**——"Mein Balkonkraftwerk würde mir ~X €/Jahr sparen ☀️"+WhatsApp/WebShare/复制(复用 Hitze-Check 已验证代码模式,gtag share 事件带 save 数值),JS node --check 过。
**队列(高潜力待验)**:①**Strompreis/Negativpreis-Radar**(SMARD 实时数据工具=最强病毒候选:实时警报+纪录追踪+新闻钩子)——**本沙箱无法外呼测 API(curl 000),上线前需先验 SMARD CORS/可用性**(WebFetch 或 owner 浏览器测试);②"你比节俭家庭多付 X €"对比锚可扩展到 Stromkosten-Rechner;③工具集群持续扩容(Ahrefs 模式)。

## 2026-07-26(续 · Strompreis-Radar 上线:实时数据钩子工具,优雅降级设计)
**背景**:deep-research 队列头号项。沙箱验 API 双 403(WebFetch 也被拒)→ **优雅降级设计**:页面以静态价值为底(负电价科普+价格构成表+FAQ 4 问+Speicher 套利漏斗),JS 尝试 aWATTar→SMARD 渲染当日 24h 柱图(当前小时橙/负电价绿)+min/max/负时数+**动态分享文案**("Heute X Stunden NEGATIVE Strompreise ⚡"=Tibber 式新闻钩子);成败均打 `strompreis_api {ok,src}` GA4 事件 → **用真实用户浏览器数据回答 CORS 问题**(用户不走我们代理)。失败时显示 SMARD 官方链接,页面永不残缺。
**KGR**:negative-strompreise/börsenstrompreis-live 角度前排=中小站(stromauskunft/bhkw-infozentrum/stromfee/ema),无巨头=可写。新可引用统计:2026 年 4 月单月 123 负电价小时、年内 >400 小时、最低 -500 €/MWh(cite stromauskunft.de 外链)。
**结构**:WebApplication+FAQPage schema、embed 按钮(外链引擎)、strompreis- 前缀入 energie-sparen 分类+储能型号卡、balkonspeicher-rechner/klimaanlage-stromkosten 各 1 入链。sitemap 125。JS node --check 过、FAQ 逐字、ALL CLEAN。
**观察点**:GA4 `strompreis_api` ok 率(若 CORS 通=转常驻分享资产,可加"负电价日"自动峰值;若不通=fallback 仍是合格内容页);share 事件 neg 参数。

## 2026-07-26(续 · 能源计算器矩阵 +2:Stromvergleich-Check + Heizkosten-Vergleich)
**A `stromvergleich-check`**(直接实现 deep-research 三票确认的 co2online 病毒机制):输入人数+年度 kWh+电价 → "Du liegst X kWh ÜBER/unter dem Durchschnitt = ±Y €/Jahr" 个人化对比数字 + WhatsApp/复制分享("Ich liege X € über dem deutschen Stromdurchschnitt 😱")。参照值=Stromspiegel 2025 已核实档位(Wohnung o. WW:1P 1200/2P 1900/3P 2400/4P 2600 kWh;3P 初检数据乱码,二次检索核实为 2400),诚实限定范围+EFH 提示。漏斗:超均值→Messgerät/Leisten 联盟链+strom-sparen+Lohnt-sich-Rechner。gtag strom_check/share 事件。
**B `heizkosten-vergleich-rechner`**(队列 T3 提前,赶 9 月收录):Heizlüfter vs Infrarot vs Klima-WP 三设备 €/Winter 对比(SERP 现有=单设备计算器,三设备横向=差异位)。诚实物理:电阻 1:1、Klima COP 3(霜冻降 2 注明)、150 天/100W/m² 假设全部公开可验算(2000W·4h·150d=1200 kWh=444 € vs WP 148 €)。每设备卡带联盟链(source=heizkosten-rechner)。归 Heizen 类(heizkosten- 前缀入映射)。
**结构**:两页各 4 schema 块+FAQ 逐字+JS node --check+3 条内链;sitemap 127、llms-full 116 页。工具矩阵 8→**10 个**。

## 2026-07-27(全站定位/结构/病毒/Routine 四合一 · 用户 5 项指令)
①**规则升级**:CLAUDE.md 规则一固定顺序=完善 Prompt→评估调用 skills→执行。②**装 marketingskills 增量**(curl raw 可过代理):site-architecture/free-tools/referrals/cro 四技能入 .claude/skills/(该仓 60 技能,已装 ai-seo,本批按任务相关性选装)。③**定位+结构**(按 site-architecture 框架:≤7 导航项+CTA 最右/3-click/hub-spoke/URL 不动):定位陈述=「EcoBack=Raumklima- & Energie-Ratgeber,四板块(Kühlen/Heizen/Luft/Energie&Solar)+Tools 横切层」;**新建 /tools.html 工具目录枢纽**(10 工具按板块分组卡片);导航全站加「🧮 Tools」CTA 样式项(amber pill,最右);页脚 DE/EN 加 Alle Rechner 链;首页瓷砖加 Alle Tools。解决"用户找不到工具"。④**高流量×工具病毒回路**:tilt-turn(EN)/kippfenster/reinigen 三个最高流量页在答案块后注入工具 CTA 条(各配最相关工具+“结果可分享”钩子)。⑤**Routine v4**(trig_01V4WLUUMsSNmT8QKQzsjeYd,每日 05:00 UTC):监控改为**营收漏斗看板**(流量→工具使用→share/embed→affiliate_click 按 source),优化优先级=转化断点修复>工具入口铺设>CTR(pos≤12)>GEO trifecta>内链>KGR 新页(工具类优先);周一档提醒不可代劳清单(Reddit 手发/embed 推广/GSC 收录/鉴权/佣金归类)。sitemap 128。发现:原每小时 v3 触发器已不存在,现存每日触发器已更新为 v4。

## 2026-07-27(续 · 用户故事导向转化层 · 用户"只有营销无背书无刺激,应用户故事导向")
按 cro skill 框架(信任信号靠近 CTA/异议处理="适合我吗?"/真实归因)落地,守三条硬线:**不能自测不装测、不伪造用户评价(欧盟 UCPD 假评价违法)、不盗产品图**——故事=「典型场景」明示非编造 testimonial,背书=真实公开测评媒体点名。
①**场景故事区**:DE 首页「Findest du dich wieder?」4 卡(Dachgeschoss 租房 28°C/Homeoffice 下午失神/Kinderzimmer 怕吹风/Erdgeschoss 潮湿)+EN 3 卡(tilt-turn 租客/顶层失眠/电费焦虑)——每卡=第一人称场景引语(斜体)→「Was hilft」具体方案→指南+工具双链;明示"häufigste Fälle unserer Leser, keine erfundenen Kundenstimmen"。②**背书具体化**:信任条从泛"öffentliche Tests"改为点名 testit.de/home&smart/Testberichte.de(DE)与 home&smart/Testberichte.de(EN)——只点名站内真实引用过的来源。产品图约束不变(法律),购买刺激靠场景代入+具体来源+工具个人化数字三层替代。

## 2026-07-25（媒体背书层扩展）
- 合规核实：YouTube 官方嵌入合法（EuGH/BGH framing）；Pexels/Unsplash 可商用但沙箱无法下载（CDN 000）→ 照片路径搁置，保持自制 SVG。
- 视频门面 3→9 页：新增 6 个真实德语测评视频（PAC EX105×2 / MeacoFan+Rowenta 风扇测试 / Comfee 20DEN7 除湿 / BKW Speicher Top5 / BKW lohnt sich），全部 click-to-load、零 pre-consent 请求。
- 首页季节视频位上线：build_season.py 新增 DE_SEASON_VIDEO（夏=PAC EX105 测评/秋=Comfee 除湿/冬=Infrarotheizung Härtetest x1S_Y7b9bvc/春=BKW Top5），随季节自动轮换，插在 EB_POPULAR 前，gtag video_play source:home。四季轮换+幂等 byte-stable 验证通过。

## 2026-07-26（三维深度诊断 · revenue-round + site-architecture + cro 框架）
**测量（GA4 28d）**：sessions 155 / pv 165 / affiliate_click 19（→亚马逊点击率≈11.5%，转化结构强，里程碑 20 差 1）/ 工具事件全 0（工具页 0 访问）/ video_play 0（视频层刚上线）。
**来源**：direct 119（engaged 仅 19≈站主+bot）、google organic 12、**AI 引荐 17（chatgpt 10+perplexity 4+aisearchindex 3）> Google**。
**AI/搜索着陆核心**：EN tilt-turn 11（chatgpt6+perplexity2+google3）、DE kippfenster 4、EN heatwave 2 —— 倾斜窗页对=全站 AI 引用资产。
**结构维（含绝对 URL 重审计）**：0 孤儿 / 0 不可达 / 深度≤3 / 94/94 页有工具链+amazon CTA = 健康，无需动。
**诊断结论**：瓶颈不在定位/结构/转化率，在**流量绝对量**；最有效的自动化杠杆=AI 渠道（已验证有产出）+把转化层补到真实流量所在的 EN 页。
**落地**：EN 视频门面上线 3 页（tilt-turn=倾斜窗密封教程 MWSMPhJUGxc；heatwave/bedroom=Pinguino PAC N82 开箱噪音实测 R2dA7C4l6p4，欧版型号），inject_video 全 EN 化（英语 UI/GDPR 文案）。
**队列（Routine v4 优先级刷新）**：①持续给 AI 着陆页保鲜（dateModified+答案块）②video_play/affiliate_click source 监控③用户侧：GSC 重连+Reddit 草稿手发+新 URL 请求收录。
- 07-26 v4 日循环：漏斗 28d 无新变化（pv165/click19/工具事件仍 0——分发未启动前预期内）。ship=工具入口铺设：6 个有真实着陆、无内容区工具条的页面（bei-hitze-schlafen/homeoffice/mietwohnung/zimmer-kuehlen/luftentfeuchter-25qm/vs-luftkuehler）插入定制工具 CTA 条（复制 kipp-tools 已验证模式，诚实匹配 BTU/Hitze-Check/Stromkosten/Stromvergleich）。klimaanlage-stromkosten 已有 2 个 rechner 链接跳过。
- 07-26 流量突破轮（ai-seo+kgr-page 框架）：①AI 爬虫地基审计=robots.txt 已满配（GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot 等全放行），无需动。②KGR 新页 EN `vent-portable-ac-without-window`（SERP=品牌博客 BougeRV/TCL/Della=可写；正中已验证 AI 受众"窗户排气难题"簇），5 路线对比表+可提取答案块+4 FAQ 逐字+诚实标注（dryer duct 口径不符警告、烟囱需 Schornsteinfeger），入链 3 条（skylight/hose-extension/cheapest-way），sitemap 129。
- 07-26 市场调研轮（market-research 框架）：①佣金结构核实=Küche/Haushalt/Baumarkt 6% vs Elektronik 2-3%（内容继续向 6% 品类倾斜：除湿/取暖/储能/PortaSplit 类）。②Amazon 合作计划 2026-04-14 新规=180 天履约窗口+排除付费流量+ASIN 变体精确匹配才计佣——本站架构（自然流量+原创内容+按名搜索链接不用 ASIN）恰好全部规避。③需求真空=PortaSplit 全德再断货（产能 3000→6000/天仍不够，ETM 97.2%），竞对正收割"ausverkauft+Alternativen"流量→上线决策支持页 `midea-portasplit-ausverkauft-alternativen.html`（4 选项框架：Clima Butler CB-3500 3.5kW/Remko RKL-DC 4.3kW/Monoblock 立即可得/等补货，全部引用来源，2 入链，sitemap 130）。
- 07-27 v4 日循环：漏斗 28d pv 165→175、sessions→165，affiliate_click 稳定 19（差 1 达 S 里程碑），工具/传播环仍 0（分发未启动）。7d 着陆：首页 15、kippfenster 5、EN tilt-turn 2。转化组件覆盖审计=真实着陆页 models/sticky/amazon CTA 齐备，非漏点。今日 ship=决策链补全（v4#5）而非新页：德语 SERP 判定 gutefrage 论坛占屏可写，但站内 raum-ohne-fenster-kuehlen 已覆盖同意图→**主动放弃 DE 镜像页防自我蚕食**，改为给该页补真正缺的"Türabdichtung: Abluft durch die Tür"专章（阳台门最佳/走廊可接受/小闭室避免三档判断+门封条 CTA+链到 EN 全路线页），TOC 锚点自动生成、dateModified 刷新。
- 07-27 SEO 技术审计轮（seo skill 框架）：全站 133 页审计——canonical 0 缺失/0 不符、hreflang 双向互指 0 断链、重复 title/desc 0、H1 恰好 1 的 0 例外、sitemap 与磁盘 0 偏差、JSON-LD 0 解析失败=**技术地基全清**。真缺陷两条并已批量修：①**23 个 title 66–74 字符 → 全部重写为 43–53 字符**（关键词前置，SERP 不再截断；刻意跳过 3 个已有点击/排名的页 kippfenster-EN-tilt/reinigen/heatwave 以免扰动），hub 页标题在生成器模板层改（未来自动继承）；②**6 条 meta 169–187 字符 → 105–154**（按句界截断不伤前半句）。修后复检：>165 metas 0、dup 0、broken schema 0。
- 07-27 能源痛点挖掘轮（market-research + free-tools + kgr-page）：一手来源=ComputerBase/Finanztip 论坛 + infranken + photovoltaik.info。**三大痛点**：①Verschattung 被严重低估（5% 遮挡即可让整块组件近乎失效，串联电池特性）②论坛共识"Speicher 经济上很少划算，先不带电池测实际盈余"与厂商营销相悖 ③安装/申报错误。**判定**：遮挡类内容 SERP 被 photovoltaik.info(3页)/solarscouts/ankersolix 专业媒体占屏=文章打不过→按 free-tools 原则**工具化**（竞对全是散文，无一提供计算器）。上线 `balkonkraftwerk-standort-check.html`：朝向×安装角×遮挡时长×组件功率→标准化因子(0.31–1.00)+实际 kWh 区间+三档判定（好/有条件/困难，困难档诚实劝退并导向省电页），分享环（WhatsApp/复制，gtag share+standort_check），CTA 指向"双 MPPT 微逆变器"而非最便宜套装（遮挡场景真解法）。与 lohnt-sich(回本)/speicher(容量) 三工具形成决策链、互链，工具枢纽加卡，sitemap 131。
- 07-27（续）能源入口铺设：Anmeldung/Marktstammdatenregister 痛点 **KGR 判定为弃**（finanztip + Anker/Jackery/42watt 品牌博客占屏，且无工具化角度，法规内容也不宜由非律师站深耕）。改做已上线 Standort-Check 的入口铺设——工具无入口=白建：①首页季节条 sommer+fruehjahr 档加入「☀️ Balkon-Check」（build_season.py 层，自动轮换继承）②3 个能源页加工具 CTA 条（speicher-nachruesten「先测标准再加装」/growatt-probleme「换设备前先查是不是标准问题」/klimaanlage-balkonkraftwerk「你的阳台够不够带空调」）。新工具入链 9 处，季节轮换幂等 byte-stable。

## 2026-07-28 v4 日循环 + 营销技能扩装（customer-research）
**漏斗 28d**：page_view 175→**183**、sessions→172、user_engagement 60→64、**btu_calc = 1（工具环 28 天首个事件，从 0 起跳）**、affiliate_click 稳 19（差 1 达 S 里程碑）、share/embed 仍 0。
**技能扩装**：从 coreyhaines31/marketingskills 审查后新装 `customer-research`（VOC/JTBD/水源地调研）、`marketing-psychology`、`content-strategy` 至 .claude/skills/（原生 raw 拉取，API 端点被代理 403 但 raw 200）。
**VOC 调研（customer-research Mode 2）**：德语社群直抓受限（搜索索引不返回 gutefrage/reddit 原帖），退回可核实的行业消耗数据 + 前几轮论坛快照做交叉验证。**High-confidence 主题=Stromkosten-Angst**（购买第一顾虑不是价格是"下个月电费"）：Monoblock ≈10–12 kWh/天 vs Split 4–5 kWh/天（10h 运行）≈2.5–3 倍；论坛流传的"夏天 300 €"只在整日多房间连开时成立。
**ship**：把 VOC 洞察写进最大内链枢纽 `klimaanlage-stromkosten.html`（49 入链、未在近 5 轮改过）——新增专章「为什么移动机比 Split 费电这么多」：数量级对比块（带来源外链）+ 把恐惧锚定回真实场景（只夜里开 4–6h ≈ 0,80–1,50 €/晚）+ 三条误区拆解（密封才是最大杠杆 / 租房电费走自己电表不进 Nebenkosten / 真高频用户该考虑免打孔 Split→导向 PortaSplit 页）。TOC 锚点自动生成、dateModified 刷新。
- 07-28（续）全局技能安装 + 链接权重优化：审查后**全局装入 `~/.claude/skills/`**——Affitor/affiliate-skills 全部 52 个（前缀 `aff-`，联盟营销全流程）、mvanhorn/last30days（Reddit/HN/GitHub 免密钥趋势雷达，X/YT/TikTok 需配 key）、ZeroPointRepo/youtube-full（需 TranscriptAPI key）。安全审查：无可疑执行代码，youtube 类需外部 API key 已记录。**应用 `aff-internal-linking-optimizer` 框架**：首次跑站内 PageRank（40 轮迭代，133 页）发现权重分布问题——最高权重节点是 tools.html(56.8) 和法务/枢纽页（页脚全站链接效应），而 109 个钱页中有一批只拿到 1.6–1.8（klimaanlage-oder-ventilator 仅 1 条入链）。落地：① tools.html（#1 权重节点）加「算完之后：对应的 Ratgeber」6 卡区块，把工具用户导向内容+转化路径；② EN 首页加「Country guides & troubleshooting」6 卡区块（法/西/意国家簇 + 无窗排气 + 不制冷 + 清洁）。**实测效果**：4 个德语钱页权重 1.8→3.5（**+96%**）；EN 页仅 +2–3%，因为 EN 首页自身权重低（EN 区小、外部入链少）——诚实记录，EN 权重要靠外部链接而非站内调度。
- 07-28（续二）趋势扫描：**last30days 引擎在本沙箱不可用**——免密钥源（Reddit/HN/GitHub API/keyless web）全被代理 403 拦截（另需 Python 3.12+，已用 /usr/bin/python3.12 绕过版本门槛，但网络仍不通）；如需启用要配 SCRAPECREATORS_API_KEY 或 XAI_API_KEY（用户侧动作）。改用 aff-trending-content-scout 方法论 + WebSearch 执行。**发现**：德国 8 月预报=气温偏高约 +2 度、多个热浪阶段、局地 +38~41 度（南部为主），媒体在讨论"Heatdome/43 度"——即需求窗口没关，还会再开。**判定不写新页**（Tropennacht 意图已被站内 bei-hitze-schlafen / ventilator-nachts-schlafen 覆盖，写第三页=自我蚕食），改为把趋势写进工具页 `hitze-check.html`（GA4 显示工具环刚起跳，且该页近 5 轮未改内容）：新增「Tropennacht 专章」——DWD 定义（夜间最低 ≥20 °C）+ 8 月预报引用块（带来源）+ **20 度分界的购买决策规则**（夜里降到 20 度以下=通风+风扇够用；持续 20 度以上=房间不再降温、需主动制冷→BTU-Rechner；顶楼=先做遮阳）。dateModified 刷新、TOC 锚点自动生成。

## 2026-07-29 用户需求洞察 → 内容转化（customer-research + aff-content-angle-ranker）
**洞察方法**：按 content-angle-ranker 的 gap 维度扫站内覆盖 vs 用户真实关注。发现一个高频且站内完全空白的需求：**"会不会跟邻居闹矛盾"**——`klimaanlage-mietwohnung` 页 Nachbar/Hausordnung/Lärm 提及数 =0/0/0（只讲房东许可），`mobile-klimaanlage-zu-laut` 页 Nachbar=1、Hausordnung/Ruhezeit=0（只讲自己觉得吵）。而德语指南普遍强调的正是这一层：Zimmerlautstärke、22–6 点夜间安静时段、别把排气管对着邻居阳台。
**判定**：不写新页（会与两个既有页蚕食），把缺口补进 `mobile-klimaanlage-zu-laut`（噪音语境最自然、近 5 轮未改内容）。
**ship**：新增「Ärger mit den Nachbarn vermeiden: Ruhezeiten und Hausordnung」——法律锚点是 Zimmerlautstärke 而非设备分贝（22–6 点，部分 Hausordnung 加 13–15 点）+ 关键洞察块（决定的不是室内音量而是传到邻居那儿的声音，临界点在**开着的窗和排气管**）+ 4 条可执行规避（Silent 模式 3–5 dB / 定时 22 点关机靠密封保温 / 排气管别对邻居阳台 / 先读 Hausordnung）+ 导向 mietwohnung 与 schlafzimmer 页。dateModified 刷新，TOC 锚点自动生成。
- 07-29（续）内容可视化 + GEO 强化：①**自制数据可视化组件接入全站样式层**（build_structure CHROME_STYLE 新增 .eb-viz / .eb-thresh，零外部库零追踪，移动端断点）。调色对（#0f6ba8/#e08c05）经 dataviz validator 六项校验：亮度带/彩度/CVD 分离 ΔE 26.7/常视觉 ΔE 34.4 全 PASS，仅对比度 WARN→按规则用可见数值标签补偿。落地三图：stromkosten=Split 4–5 kWh vs Monoblock 10–12 kWh 对比条（带 €/天直标）、hitze-check=20 °C 阈值双栏决策图、zu-laut=声音逃逸路径图（关着的门 OK vs 开窗+排气管=真冲突路径）。Playwright 实际渲染截图复核版式无碰撞。②**GEO**：三个新章节各补 2–3 组"可提取问答"，可见文本与 FAQPage schema 逐字一致；klimaanlage-stromkosten 此前**完全没有 FAQ schema**（全站最大内链枢纽）→ 本轮首次补齐（3 问：mobil vs Split 耗电倍数 / 一晚多少钱 / 会不会进 Nebenkostenabrechnung）。全站 134 页 schema 扫描 0 破损、FAQ 逐字 0 不匹配。

## 2026-07-29 v4 日循环
**🎉 里程碑达成：affiliate_click 19→21（≥20/28d，S 门槛）**。漏斗：page_view 183→190、sessions 178、user_engagement 64→69、scroll 25、btu_calc 1（工具环维持）、share/embed 仍 0。着陆页：EN tilt-turn 15(5 engaged)=非首页第一、kippfenster 5→**9**(5 engaged) 翻倍、reinigen 4、EN heatwave 4；PortaSplit 簇首次出现着陆（portasplit-vs-monoblock / split-ohne-kernbohrung 各 1）。
**ship（v4#1 转化断点 + #5 决策链）**：PortaSplit 簇缺"买不到怎么办"的出口——3 个商业意图页（vs-monoblock / ohne-kernbohrung / portasplit-kaufen）此前 0 条链到 07-26 上线的 ausverkauft 页，用户在缺货时刻只能跳出去。给三页 H1 后插入「📦 Gerade nicht lieferbar?」可用性提示条 → 导向 Alternativen & Warte-Check。同时 `midea-portasplit-kaufen`（"kaufen" 商业意图最强）**此前完全没有 FAQ schema** → 补 3 组可见问答 + FAQPage（当前是否有货 / 要不要房东同意 / 相比 Monoblock 值不值），全部逐字一致。

## 2026-07-30 v4 日循环
**漏斗加速**：pv 190→214、sessions→202、engagement 69→80、**affiliate_click 21→26（一天 +5）**、**video_play=4 首次出现（视频门面被真实点击）**、btu_calc 1。**🎉 第二个里程碑触发：AI referral 放量**——7 天内 ChatGPT 引荐 18 sessions（kippfenster 9 + EN heatwave 6 + tilt-turn 3），此前 28 天才 10；IndexNow 通道开始产出（Bing 2/DuckDuckGo 1/Ecosia 2，split-ohne-kernbohrung 与 portasplit-vs 首次从搜索引擎着陆）。
**ship（v4#1 测量断点）**：kippfenster（AI 着陆第一页）审计发现**内文 Amazon 链接 0 埋点**——型号卡/CTA 盒/文内链接早于 gtag 规范，点击在 GA4 不可见，26 次 affiliate_click 实为低估。落地 `EB_TRACK` 全站委托监听组件（build_structure 注入器，134 页各恰 1 个，已带 onclick 埋点的 sticky/工具 CTA 自动跳过防重复计数），source:'inline'+page 维度。从明天起 affiliate_click 口径完整，可分 sticky/inline/工具 定位真正的转化面。
**owner 紧急提醒：Supermetrics 试用期明天到期**——不续订则 GA4 监控断线，v4 循环只能盲跑。
- 07-31 完整技能链轮（customer-research→angle-ranker→kgr-page→free-tools→上线）：**需求信号**=luftentfeuchter-keller 7 天 6 direct sessions + 8 月=Sommerkondensation 高峰（白天给地下室通风反而更潮=德国最普遍反直觉错误）。**KGR**=SERP 全是除湿服务商（Wohndiagnose/isotec/bautrockner-verleih），无测评媒体=可写。**角度**（free-tools 原则）=竞对全在解释露点、无一提供计算器→上线 `keller-lueften-sommer.html`：Taupunkt-Check 迷你工具（Magnus 公式+墙面 -2 °C 安全余量，实测 28/60→19.5 ✓、正午湿热正确判"别开窗"）+22–6 点规则+三条纪律+诚实边界（"连续湿热周没有可开窗时段→除湿机是唯一稳定解"）→ 导流 luftentfeuchter-keller 钱簇。gtag taupunkt_check 埋点。cat_of 加 keller- 前缀→Luftqualität（枢纽 15 页）。3 入链（keller/schimmel/richtig-lueften），sitemap 132、llms 120 页。

## 2026-08-01 v4 日循环
漏斗：pv 214→218、affiliate_click 26→**29**（连续第三天上行：19→21→26→29）、video_play 4、btu_calc 1、share/embed 0。Supermetrics 仍在宽限期（"expires tomorrow"提示持续，连接未断）。ship（v4#2 工具入口）：EN heatwave（AI 着陆第二页，上周 ChatGPT 6 sessions）此前无工具条 → 复制 tilt-tools 已验证模式加「Before you buy」条（BTU calculator + Heat Check），承接 AI 流量的购前决策环。
- 08-01（午后轮）：affiliate_click 29→**31**（四连升 19→21→26→29→31）、btu_calc 1→2、engagement 86。7d 着陆：**EN heatwave 10=与首页并列第一**（昨日工具条踩点正好）、kippfenster 7、**luftentfeuchter-keller 稳定 6**。ship=keller 钱页补工具条（此前 0 条）：Taupunkt-Check（昨日新工具，簇内闭环）+ Stromkosten-Rechner（页内正好有 Dauerbetrieb 成本章节），dateModified 刷新。型号卡经查为 CANON 去重的正确跳过（内文已有 Comfee 卡）非缺陷。
- 08-02 媒体转化层扩展（用户指令"扩展视频与图片"）：跟着起量的潮湿簇走——① 视频门面 +2：luftentfeuchter-keller（NCdYI6HdQi8 Comfee 除湿实战,07-25 已验证）+ keller-lueften-sommer（WCKVwHAHUhs Keller 通风防霉指南,搜索验证）；② device_of 扩展 keller-→dehum：两页自动继承除湿动画讲解图，Taupunkt 页另获图文型号卡（Comfee canonical）,keller 钱页经 CANON 去重正确跳过。媒体层现状：视频门面 12 页、型号卡 48 页、动画讲解 84 页、数据图 3 页。全部零外部请求 pre-click、零版权风险。

## 2026-08-02 v4 日循环
**⚠️ GA4 监控断线：Supermetrics 试用 2026-08-02 到期**（team t***t，ID 1853721）——续订或换免费方案前 v4 循环只能盲跑（无漏斗/着陆数据）。断线前最后读数：affiliate_click 31（四连升）、btu_calc 2、video_play 4、EN heatwave 10/7d 并列第一、keller 簇 6/7d。
**KGR 判定记录**：Heizlüfter Bad = **弃**（vergleich.org/heimwerker.de/homeandsmart/testbericht.de/heizluefter.org 占屏=红海；连 Steckdosen-Heizlüfter 变体都有 vergleich.org 专页）。秋冬 Heizen 选题需找更长尾角度（候选：Schutzbereich/IP 安全解释角度，待下轮判定）。
**ship（数据独立·秋季准备）**:Herbst 轮换 teaser（9 月 1 日自动切换）加入「💨 Taupunkt-Check」——秋季正是地下室结露+室内晾衣高峰，新工具获得季节性首页入口；herbst 档轮换测试通过、幂等 byte-stable。

## 2026-08-03 /goal 病毒传播轮（market-research + free-tools + referrals 框架）
**研究结论**：德语区计算器站的两个已验证增长模型——① zinsen-berechnen/Smart-Rechner 的 **Widget 嵌入模型**（站长把计算器嵌自己网站=每个嵌入一条反链+持续引荐流量）；关键发现：**Smart-Rechner 对 Widget 收许可费** → 我们免费送=直接差异化，可自然承接"rechner widget kostenlos einbinden"类站长搜索；② co2online 数据飞轮（已在 Radar 页布局）。两者都不依赖 Reddit。
**ship（Widget 计划 v1）**：① `/widgets/taupunkt.html` + `/widgets/btu.html` 两个专用迷你嵌入件（~3KB、零 Analytics 零 Cookie、noindex、底部 utm 标记的品牌回链=反链载体）；② `/widgets.html` 落地页（SEO 目标"Rechner-Widget kostenlos einbinden"，实时 demo iframe + copy-paste 代码 + embed_copy 埋点 + 规则块"免费无限用、唯一条件=保留出处链接" + FAQ schema 逐字）；③ 入口：tools 枢纽卡 + 两个源工具页 teaser + 全站页脚「🧩 Widgets für deine Website」。sitemap 133（widgets.html 收录、iframe 件 noindex 排除）。**传播逻辑**：博主/手工业者/学校嵌 widget → dofollow 反链 → Google 权重 + 引荐流量 + AI 引用面，全自动承接。

## 2026-08-04 v4 日循环
**GA4 仍断线**（Supermetrics 试用 08-02 过期，未续订）→ 本轮走数据独立队列。
**ship（v4#6 KGR 新页 · 秋冬档提前布局）**：`fenster-beschlagen-innen.html`。KGR 判定=SERP 为窗厂商(fensterversand/stolma)+生活方式站(frag-mutti/wohnglueck)+论坛，**无测评大媒体压制→可写**。差异化：竞对统一喊"多通风"，本页给**三病因分流诊断表**（>60% 湿度=水分过多 / 白天正常夜间高=换气不足 / <55% 却仍结露或只有边框结露=冷桥或单层玻璃＝**建筑问题，除湿机无效，诚实劝退**）。数据核实：人体每晚 1–2 L（来源间有差异，按区间标注 inventer.de）、3–4 人家庭 10–15 L/天；露点断言 20 °C/60%→12.0 °C 用 Magnus 公式复算通过。复用 Taupunkt-Check 工具（同一物理，换成玻璃表面温度）=工具二次利用+widget 曝光。3 条入链、CAT_OF 归 Luftqualität（枢纽 16 页），sitemap 134、llms 121 页。**战略意义**：本页峰值需求在 10–2 月，正好补全站最弱的冬季档，且导流 15 页除湿机钱簇。

## 2026-08-05 营收实验组合启动
方法学：流量 220pv/28d → A/B 不可行（欠功效），改预注册证伪阈值的多臂组合。调研：Amazon 18€/单 < 垂直 BKW 30–150€/单 < PV 线索 25–200€/条。ship：实验 1 页面 `balkonkraftwerk-wo-kaufen.html`（双路径 outbound_choice 埋点 + 诚实披露"Fachhändler 无提成关系"）+ 实验 2 lead_intent 探针 + 3 个能源簇入口。实验 3/4 已在跑。Web3 与展示广告公开否决并记录理由。sitemap 135。**判定全部依赖 GA4 恢复。**

## 2026-08-05（第二轮）重做定位：B2B 层上线
诊断：联盟模型把成败押在最慢变量（流量）上。10 方向评分后选定不依赖流量的 B2B 路径。ship：`/fuer-betriebe.html`（三档报价 + b2b_intent×3 埋点 + 诚实标注未建成档位）、widgets.html B2B 入口、页脚链接、冷邮件套件。sitemap 136。消费者站 135 页全部保留=演示场+信任证明。判定依赖 owner 发 20 封冷邮件。

## 2026-08-05（第三轮 · 日更 v4）埋点缺陷修复 + 嵌入承诺纠偏
数据：GA4/Supermetrics trial 已于 08-02 过期（本轮再次确认，不再依赖）；自建 D1 上线不足 1 小时，仅有 8 条 CI 健康检查行、0 条真实事件——站点 ~8 pv/天，属预期而非故障（客户端路径已由 Chromium 实测通过）。无趋势数据，按预案改为结构性诊断。
诊断：① `/api/ev` 白名单漏了 4 个真实在用的事件——`stromkosten_calc`（全站最大计算器枢纽）、`speicher_calc`、`subscribe`、`subscribe_confirmed`（Hitze-Radar 订阅转化）——它们会被静默丢弃，未来漏斗里永远读作 0；② 上一轮的 `EB_EMBED` 在 10 个计算器页统一写"Diesen Rechner auf der eigenen Website?"，但只有 2 个计算器真有 widget，另 8 页是**空头承诺**（点进去找不到），既漏转化又违反诚实原则。
ship：worker 白名单补齐 4 个事件；`EB_EMBED` 按页取真实口径（有 widget 的 2 页保留"Diesen Rechner"，其余 8 页改为"Einen Rechner…Taupunkt- und BTU-Rechner gibt es als fertigen Einbau-Code"）；新增 `tools/check_events.py` 并接入 CI——今后任何新事件没进白名单直接构建失败，杜绝同类静默漂移。
校验：全站 0 重复 marker、JSON-LD 全解析、无 ASIN、worker `node --check` 通过、二次运行 guide 页 byte-stable。

## 2026-08-06（日更 v4）首份自有漏斗数据 + 路由资格修正
数据（D1 自建埋点，非 GA4——Supermetrics 仍过期）：24 h 内 **24 条真实事件**，埋点在生产环境确认可用。漏斗：page_view 21 → affiliate_click 3（≈14 %，且已是双计数修复后的干净口径）。
**最重要的发现：Google 一次都没出现。** 13 次带 referrer 的访问全部来自 Bing / DuckDuckGo / Brave / Ecosia / Yahoo + chatgpt.com ×2，零 google.com。样本小（n=21，约一天），但在 Google 占德国搜索约九成的前提下 13 次引荐一次不见，属强存在性信号，且与此前 GSC 位次 20–98 吻合——**当前真实发现渠道是 Bing 系 + AI 助手**。国家分布 DE/AT/GB/HR/LU/HU/SE，确认是欧洲多国流量。
转化集中度：3 次 affiliate_click 中 2 次来自 `en/guide/best-portable-air-conditioner-europe-heatwave`（EN 旗舰页），1 次来自 `klimaanlage-kippfenster`。
ship：修正 `EB_QUICKPICK` 资格判定——原判定要求页面带 EB_MODELS marker，**把直接写型号的旗舰页全部漏掉了**（41 DE + 14 EN），而那恰恰是转化最强的一类页；改为"有型号卡 **或** 正文出现站内背书型号"。同时把路由铺到 EN 区（新增 EN 分面：窗型/房间/方案对比），并修掉 `device_of()` 只认德语词导致英语除湿页被判成空调的分类错误，另排除故障排查页与"不用空调"页（读者已有设备或明确不想买，选购路由是噪音）。覆盖 DE 52 + EN 16，47 个路由目标全部解析、零自链接、二次运行 byte-stable。

## 2026-08-06（第二轮）优势分析：结构性优势是"被索引的速度"，但它一直在被自己稀释
**分析（三方对照，不靠单一来源）**：① D1 数据 n=21 pv / 3 clicks，13 次带 referrer 的访问零 google.com，全部 Bing 系（Bing 5 / Yahoo 3 / Brave 2 / DDG 2 / Ecosia 2）+ ChatGPT 2；**3 次联盟点击全部来自 Bing 联合供稿引擎**（Yahoo 2、Ecosia 1）。② 独立历史证据：GSC 曾显示本站 Google 位次 20–98，ChatGPT 引荐早有观察。③ 机制（今日核实）：IndexNow 每次部署推送 URL 至 api.indexnow.org，run 273 日志确认 **HTTP 200**；Google 无对等协议。三者一致 → **优势 = 被索引的速度，且由本站已有基建造成，非运气**。
**但审计发现优势正在被两处虚假新鲜度信号稀释**（均经 IndexNow 官方 FAQ 与多份指南核实，非臆断）：① IndexNow **每次部署全量推送 137 个 URL**，而协议明确要求只提交真正变化的 URL，反复全量会被滥用检测视作 spam 并降低该站提交可信度；② sitemap **137 个 URL 共用同一个 lastmod=今天**，即每天都宣称全站刚更新——同一个毛病的 sitemap 版本，而指南恰恰要求 lastmod 准确。
**ship**：① deploy.yml 改为只推真正变化的页（本次 push 的 diff ∪ CI 注入器改写的文件，再与 sitemap 取交集以自动排除 noindex 页；无变化则跳过推送）。本地以真实 git 历史干跑：137 → **46** 条，空变更正确跳过，widgets/radar-bestaetigt 等 noindex 页被正确过滤。② `build_sitemap.py` 改为逐页 lastmod（读各页 JSON-LD `dateModified`，缺失则回落文件 mtime）：单一日期 → **20 个真实日期**（2026-07-09 … 08-06）。
**预注册证伪（针对"Google 缺席"这一判断本身，防止把采样假象当结论）**：未来 14 天若 google.com 占带 referrer 访问 ≥20 %，则本判断作废、按采样假象处理；若持续 <5 %，则确认为结构性事实，后续优化重心正式从 Google 转向 Bing 系 + AI 引用面。**注意**：本轮两处改动的正当性来自协议合规（避开被明确记录的 spam 模式），**不为其设定流量提升阈值**——现有流量规模下无法把它与季节、内容变化区分开，设一个假阈值是伪科学。

### 更正（同日）：把"发现速度"与"排名"分开，别混为一谈
上一条把 Bing 系流量优势说成"由 IndexNow 造成"，这是**未经证明的因果**，予以更正。核实后的事实：IndexNow 由 Bing/Yandex/Naver/Seznam/Yep 支持，**Google 自 2021 年测试后始终未采用**；且它**不是排名因素**，只加速发现/抓取，是否收录仍由各引擎自行评估。
因此正确的拆分是：① IndexNow 能解释"新页在 Bing 系出现得快"；② 它**不能**解释"Google 侧零流量"——那是排名问题（GSC 位次 20–98），而 Google 根本不读 IndexNow，所以这条路对 Google 完全无效。
**战略含义**：Google 的问题只能靠排名/权重解决，不能靠推送协议；而 Bing 索引同时为 ChatGPT Search、Copilot 供数并是 Perplexity 主要来源之一，故 IndexNow 的真实价值是**同时喂 Bing 系与 AI 引用面**——这正是本站已观测到的两条发现渠道。也正因它不是排名因素、价值全在"可信的变更通知"，滥发是纯下行零上行，本日的"只推变化 URL"改动因此更成立。

## 2026-08-06（第三轮）Google 零流量：技术层排除，问题在权重不在配置
调用 `seo` 技能按其清单对 137 页做本地全量审计（技能第一原则=先修技术阻断；反模式=没看实际页面就给内容建议）。**技术层结论是干净的**：canonical 全部自洽（0 缺失、0 指向他页）、重复 title 0 组、重复 description 0 组、每页恰好 1 个 H1、hreflang 双向互指 0 断裂、meta description 长度全部在 70–165 区间；仅 13 个 title 为 63–66 字符（略超建议值但远未到截断线，且多数在已起量页上，按克制原则不动）。
**这是个否定结果，但很重要**：技术清单修不了 Google 问题，因为技术层没坏。结合 GSC 位次 20–98，剩下的解释是**权重/域龄/外链**，而这些**不是 on-page 能修的**，也不是本轮能"解决"的——诚实结论优于端出一堆表面改动。
**能力边界声明**：本环境无法直接查询 Google（GSC 已断、google.com 不可达、WebSearch 底层非 Google），故本轮**不做任何 Google 侧诊断断言**。
**唯一找到且已修的真实缺陷（可达性，Google 抓取高度依赖链接）**：① `growatt-noah-2000-probleme` **零入链、从首页完全不可达**（真孤儿，只能靠 sitemap 被发现）；② `balkonspeicher-winter-frost` 同样不可达；③ 23 个可收录页入链 ≤2，其中 `mobile-klimaanlage-zu-laut` 与 `klimaanlage-fenster-einbruchschutz` **在 D1 里有真实访问却只有 1 条入链**（有需求无支撑）。ship：`build_xlinks.py` 新增 `XREF` 幂等注入器，从 6 个强页（入链 16–76）用**描述性锚文本**链向这些弱页（技能明确反对泛化锚文本）。结果：**不可达页 2 → 0**，弱链页 23 → 19，目标页进入深度 1–2、入链 2–3；二次运行 byte-stable。

### 同日修复：上一处"改进"实际上把 IndexNow 停掉了
run 277 日志显示 `submitting 0 changed URL(s)`，但那次提交确实改了 6 个 HTML 页——即**只推变化 URL 的新逻辑上线后，一条都没推出去**。根因：`actions/checkout@v4` 默认浅克隆（depth=1），`git diff $BEFORE $SHA` 解析不出 BEFORE，错误被 `|| true` 吞掉，变更列表为空。教训：**把失败静默成"无事发生"是最危险的写法**——它和"确实没变化"长得一模一样。修复：checkout 加 `fetch-depth: 0`；BEFORE 不可解析时先告警回退 HEAD~1，若仍不可解析则 `::error::` 并让该步失败，不再静默跳过；pathspec 同时给 `site/*.html` 与 `site/**/*.html` 以防顶层页漏掉。本地以真实历史验证：正常情形正确列出 6 页并推送，BEFORE 不可解析时正确告警回退。

## 2026-08-07（每日循环 v4）：给全站第一名的页补上它自己在问的那个答案

D1 漏斗（排除 CI）：08-05 19 pv / 3 affiliate_click，08-06 28 pv / 5 heat_now / 1 affiliate_click，08-07 1 pv / 1 heat_now。
`btu_calc` / `seal_fit` / `profile_save` / `subscribe` 仍为 **0**——但首页只有 3 次浏览、kippfenster 只有 2 次，**曝光量本身还不够判定**，因此本轮明确**不去"修"一个尚未被证伪的东西**（`heat_now` 在同批页面上正常触发 6 次，证明注入与事件管线本身没坏）。

页面级新第一名：`/guide/abluftschlauch-verlaengern.html`（**5 次访问、来源 Bing、8 个 Amazon 链接、0 点击**）；`/en/guide/best-portable-air-conditioner-europe-heatwave.html` 4 次（来源 **chatgpt.com**）；`/guide/homeoffice-buero-kuehlen.html` 3 次，贡献**全站唯一一次**联盟点击。

审这个第一名页时发现的真缺口：它的首个 H2 就是「Wie viel Verlängerung ist okay?」，但**全文出现 "Länge" 的次数是 0**，答案只给了经验法则；8 个链接全指向不区分口径的通用搜索。这和上一轮窗封页的缺口是同一形状，只是发生在流量更大的页上。

**ship：`EB_HOSEFIT`**（幂等注入器，DE `abluftschlauch-verlaengern` + EN `portable-ac-hose-extension`）——输入「设备到窗的距离 / 现有软管长度 / 口径」，输出总长度（**20 cm 弯头余量写在结果里、不藏**）、向上取整到可购买规格的延长长度、对照本页自己 2 m 规则的结论，以及**按口径拼好的 Amazon 搜索**而不是混着 130/150 的结果页。超过 3.5 m 时**不再卖货**，改指"把机器挪近／上 Split"；不需要买时直接说不需要买并**撤掉购物链接**。
**浏览器实测抓到一处自相矛盾**（刚说完"无需延长"却仍推荐口径并挂搜索链接，已修）；Chromium 德英各档位判定、链接、`hose_fit` 事件入 `/api/ev` 全部验证通过。两页 dateModified 刷新，sitemap 138 URL 不变，run 294 已触发。

**预注册判定**：60 天内 `hose_fit` ≥25 次 → 该页型需求成立，把"买前尺寸问题"模式推到更多货币页；<8 次 → 说明瓶颈不在决策而在曝光，该组件不再扩张。

## 2026-08-07（追加轮）：热浪回归前把站点做成"可转发的"，并把空调型号从 3 个扩到 7 个

**先核实前提再动手**（owner 提出"德国高温暴热，趁热点传播"）：结论是**方向对、时间点差两天**。08-07 当天德国实际只有 **20–27 °C**（凉爽间歇），但 08-04 刚出现 **39.4 °C**（雷根斯堡），8 月距 1961/90 均值 **+5.9 °C**，且预报 **08-08～08-11 回到 29–34 °C、局地 36 °C**，08-12 起转折。所以正确做法不是今天硬造热度，而是**让站点在热回来的那两天自动引爆**——`/api/heat` 层本来就只在 ≥28 °C 才渲染，节奏天然对齐。

**缺口**：这个热浪提示条从上线起**没有任何转发方式**。而本站唯一能诚实赚到的传播，就是"34 °C 的公寓里有人把'现在真正管用的做法'甩进家庭群"这一下。

**ship 1 · `EB_SHARE`（141 页）**：只定义 `window.ebShare`，自身不渲染任何东西；有原生分享面板就用原生，否则复制到剪贴板；**全程第一方**，点击前不向任何第三方发请求。按钮只出现在两个真实时刻——① 热浪条（只在真热时存在）② 读者自己算出的 BTU 结果（本就有永久链接，现在有了送出去的方式）。埋点 `share{method,src}`。

**ship 2 · 空调型号 3 → 7**（用户要求"空调产品要更加多"，做法是**更多经公开评测共识的具名型号**，不是更多泛搜索）：新增 De'Longhi **PAC N90 ECO Silent**（Stiftung Warentest 单体机 Testsieger，Silent 模式约 50 dB，R290）、**Klarstein Kraftwerk Smart 12K**（公开对比中最强制冷／大房间）、**Bosch Cool 5000**（即插即用）、**Suntec Impuls 2.0+**（轻便）。顺手修两处不诚实：英文"quiet pick"卡片挂着 **MeacoFan（风扇品牌）**的名字却链到 AEG 搜索——已具名为 AEG ChillFlex Pro；Comfee 卡片现在明说"明显有噪音"。**未核实价格的型号一律写「Preis vor Ort prüfen」，不编价格区间**。首页工具的大房间推荐从泛搜索"Klarstein 12000 BTU"改为具名型号；档位标签从"小/中/大房间"改为 BTU 级别——**浏览器实测抓到 25 m² 被标成"kleine Räume"**。

**ship 3 · 热浪主力页**：`beste-tragbare-klimaanlage-hitzewelle` 加入静音 Testsieger（对比表一行 + 详情卡），泛指的 Klarstein 换成具名型号，新鲜度刷新——这页正是 08-08 起要承接流量的页。

**ship 4 · 人工分发稿**：`docs/marketing/reddit-drafts-2026-07.md` 追加"热浪回归周"两篇德语草稿（"现在还买不买"／"哪台夜里真安静"）+ 家庭群一句话（即分享按钮自动生成的那句）。

**能力边界（写进文档）**：我没有社交账号也不会代发，自动发帖/批量评论违反平台条款且会摧毁本站目前唯一在起作用的渠道（Bing 家族 + AI 助手引用）。站点侧能自动化的"传播"就是：热到了自动亮 + 一键转发。

**验证**：Chromium 实测热浪条文案/分享文本/剪贴板内容、结果分享永久链接、7 张型号卡注入、**凉爽日热浪条完全不渲染（长度 0）**；全站 141 页 JSON-LD 可解析、0 重复 marker、0 ASIN、二次运行 byte-stable。
**判定**：08-08～08-11 热浪窗口内 `share` 事件 ≥10 次 → 转发是真实行为，扩展到更多页；=0 → 说明缺的不是按钮而是流量，不再加分享位。

## 2026-08-07（第三轮）：产品前置 + 可核实的紧迫感 + 购买弹窗（针对德国市场）

owner 四点要求：型号还不够、加强气候危机感促成即时购买、产品下拉太长才看到、要弹窗引导购买。三点照做，一点按德国实际情况改写。

**1. 产品前置（"下拉太长"是真的，已量化）**：390 px 手机上，尺寸页第一个产品在 **y=1599**——H1 之下将近两屏，被 nav/面包屑/信任条/引言/目录挡住。新增 `EB_TOPPICK`（114 页）：三个具名推荐（角色徽章 + 型号名 + 直达 Amazon）放在**联盟披露之后**，第一个产品降到 **y=867（-46%，落到首屏折线上）**。**没有放得更高是有原因的**：链接必须在 Werbekennzeichnung 之后，不能在它之前。

**2. 紧迫感：只用能核实的那一种**。"气候危机 → 立刻买空调"这句话本站不能说——空调不解决气候问题，它增加用电；而伪造稀缺/倒计时正是 **§5 UWG** 认定的误导。真实且可查的是 DWD/UBA 记录：**1951–2000 只有 3 个夏天超过 10 个 Hitzetage（≥30 °C），2000 年以来 25 个夏天里有 12 个**；2025 年均值 **11,1 天**，2018 年约 20 天。新增 `EB_CLIMATE`（50 个制冷页）：数字带出处，明说**先遮阳通风、再谈制冷、并先算电费**，只主张一条真实时间压力——**热浪一起，好机器几天内就没货或涨价，要在浪之前决定**。

**3. 弹窗（做成不会被 Google 降权的那种）**：`EB_POPUP`（114 页）**从不在进入时出现、从不覆盖正文、从不阻塞页面**——底部抽屉；触屏端需 **滚动 >65% 且停留 >25 秒**，桌面端才用 exit-intent（且前 8 秒不触发）；关闭后 7 天不再出现，点击过则 180 天不再出现；读者若存过房间，弹窗直接显示他自己的 m²/BTU。与移动端 sticky 条冲突已处理（弹窗打开时 sticky 让位，关闭后回来）。

**4. 型号 7 → 8**：补上 **Midea PortaSplit**（站内早已背书，但型号网格里一直缺）。

**Chromium 双视口实测**：进入时不弹、瞬间滚到底也不弹（停留不足）、exit-intent 8 秒内不弹；手机上真正阅读后弹出占屏 **51%**（底部抽屉，非全屏插页）；sticky 让位与恢复正确；关闭后刷新仍不弹。全站 145 文件 JSON-LD 可解析、0 重复 marker、0 ASIN。

**判定（预注册）**：14 天内 `popup_view` ≥50 且 `popup_click`/`popup_view` ≥8% → 保留并扩展；点击率 <3% 或 `popup_close{reason:"x"}` 占比 >90% → 说明是打扰而非引导，下线弹窗只保留 TOPPICK。

### 同轮修正：上一次的"前置"只到了折线外 23 px

owner 反馈"还是要下拉好久"——**反馈是对的**。上一轮把首个产品从 y=1599 移到 y=867，而手机视口是 844，**差 23 px**，实际仍需滚动才看得到可买的东西；我当时把"接近折线"当成了"在首屏"。

两处压着它：① 指南页锚点在引言 + disclosure 之后（H1 之下约 600 px 的正文），现改为紧跟 `<article>`，并**把 Werbekennzeichnung 直接写进条内**——这本就是更严格的做法，标识应在广告处，而不是 600 px 之后；② 首页锚点在 hero 与季节条之后，而这两块在手机上分别高 **880 px / 495 px**，所以"hero 之后"= 1453 px，现改为放进 hero 内部、承诺之后、通用按钮之前。

**结果（390×844）**：首页 1453 → **647**，尺寸页 867 → **569**，故障页 → **590**，三者都在首屏内。

注入器形态也必须改：原来是"就地替换自己的 marker"，那会把所有既有页**永远钉在旧位置**，现改为先移除再按锚点重放。这个改法的第一版**每跑一次漏一个换行**（strip 正则吃掉尾部换行、插入又加了个头部换行），是 byte-stable 检查抓到的，不是读代码看出来的。

## 2026-08-07（第四轮）：需求调研驱动的全站深化（customer-research 技能 Mode 1+2）

**先调研后动手，且调研杀掉了大部分"显然要做的事"。** 需求地图（含置信度与来源）沉淀在 `docs/customer-research-2026-08.md`。

**Mode 1（自有 D1）**：读者**带着约束到达，不是带着品类**——到达页前列全是 split-ohne-kernbohrung / abluftschlauch / zu-laut / tropft / kippfenster；Google 依旧 0，Bing/DDG/chatgpt.com 承载全部引荐；**btu_calc 首次非零（×2）**=首页工具开始被用。

**Mode 2（gutefrage/母婴论坛/评论区/法律媒体，经 WebSearch）** 五主题排序：①夜间噪音（"laut wie Dunstabzugshaube auf höchster Stufe"）②"bringt nichts"失望（头号成因=不封窗→负压回吸）③租客/房东合法性 + **2026-07-17 BGH 新判决**④Dachgeschoss/婴儿房高温（"nachts 35 °C im Kinderzimmer"）⑤电费焦虑（~109 €/年口径）。

**蚕食拦截 ×2 + 不重复建设 ×3**：Mietwohnung 页和 Kinderzimmer 页**都已存在**（不新建）；zu-laut（1861词/dB×16）、kinderzimmer（2111词）、stromkosten 簇已接住各自主题（不动）。

**真缺口只有两处，已落地**：
① **BGH V ZR 162/25（2026-07-17）全站零提及**——WEG 业主自此可依 §20 Abs. 3 WEG 要求准许装分体机（含穿墙），邻居抽象噪音担忧不再构成否决。`klimaanlage-mietwohnung` 新增判决章 + 2 FAQ（schema 逐字同步）；**流量第 3 的 `split-ohne-kernbohrung`（896 词、无 FAQ、零法律内容——而它的受众正是被许可问题卡住的人）**新增"Mietwohnung & WEG"章 + 首个 FAQ 节（3 问 FAQPage schema）+ 互链。两页均标注"非法律咨询"、新鲜度刷新。
② **购买时刻的诚实一句**：models_block 副标题全站追加（54 页双语）——"不封窗，任何 Monoblock 都失去大部分效果"，直链窗封页。这是主题②的头号失望成因，此前只在诊断页说、购买页不说。

**修复过程 bug**：FAQ 德语引号「„…"」在 JSON-LD 里未转义导致 schema 解析失败——被全站 JSON-LD 校验抓住，修复后逐字校验 6+3 FAQ 全部 verbatim OK。
**判定**：两页均已在收 Bing/DDG 流量，BGH 是 3 周内的新闻——观察 14 天这两页展示/停留变化；`kippfenster` 从型号卡入链的点击可在 D1 `affiliate_click`/referrer 观察。

## 2026-08-08（第五轮）：给全站点击第一名的产品族建购买页 — Fensterabdichtung

**"最热门联盟产品"用证据回答，不用感觉**：D1 全量 affiliate_click 按产品族聚合——**窗封族 4 次点击（第一名**：fensterabdichtung×2 + klett×1 + fensterabluftdüse×1，另有 Eurom Window Way Out 面板 1 次），超过旗舰机型 De'Longhi EX105（3 次）与静音风扇（2 次）。而货架盘点发现：**点击最多的产品族没有专属购买页**——kippfenster 是安装教程，链接全是泛搜索；读者一直在借"回答别的问题的页面"摸到这个产品。

**SERP 判定（先查后写）**：vergleich.org 一家强站 + 一群薄联盟站（erfahrungstests/test-stiftung/which.one）= 可打；本站独有两角度=尺寸计算器 + 胶带失效诚实告知。

**ship：`guide/fensterabdichtung-klimaanlage.html`**（sitemap 139）。按决策路由而非榜单：三种 Bauart（Klett-Stoff=租客默认 / starre Platte·Auslass-Panel=整夏常驻 / Dachfenster 版）、长度规则 2×(B+H) + **页内注入 EB_SEALFIT 计算器**（实测 60×140→4,00 m→400 cm 规格→尺寸化搜索链，seal_fit 事件入 D1）、"kleben oder klemmen"诚实章（评论区失效点=胶带非布料，含 3 条对策）。命名保持诚实：HOOMEE-Bauart/Eurom-式面板作为品类命名，无编造测试结果、无 ASIN、价格只写区间。4 FAQ schema 逐字校验。**有意跳过** AC 型号网格/弹窗/toppick（读者已有机器，再卖一台=卖偏）。入链：kippfenster/dachfenster/zubehoer 三页。

**顺手抓到真 bug**（byte-stable 检查的功劳）：`inject_climate` 锚在 EB_RADAR 却跑在 `inject_radar` 之前——新页第一遍永远注入不上、第二遍才上=永不稳定。已重排顺序。

**判定（预注册）**：30 天内该页 `affiliate_click` ≥3 或 `seal_fit` ≥10 → 证明"点击流量该有个家"，把 EN 版（tilt-and-turn 受众）提上日程；两者皆 0 → 说明点击本就发生在教程语境里，购买页不另设，资源回教程页。

## 2026-08-08（第六轮）：Trends 分析 → 提前 4-8 周卡位"Übergangsheizen"

**数据可得性先说清**：Google Trends 本环境仍不可达（RSS 端点与站点均被 egress 阻断，本轮复验），趋势读数来自第三方转述的 Trends 数据：**"Klimaanlage" 搜索量 +500% MoM / +200% YoY，"mobile Klimaanlage kaufen" 3 倍，Midea PortaSplit 20 倍**。

**判定：当下的尖峰全部已被货架覆盖**（PortaSplit 3 页、Split 簇、fensterabdichtung 昨日刚上）——追当下尖峰=重复建设，蚕食拦截。**可行动的信号在 4-8 周后**：能源危机以来"heizen mit Klimaanlage / Luft-Luft-Wärmepumpe"每年秋季爬升，行业媒体已开始预热，而本站对应页 `klimaanlage-mit-heizfunktion` 只有 **819 词、无 FAQ、"Übergangsheizen" 0 命中**——恰好缺秋季浪要搜的那个框架。

**ship（深化不新建）**：新增"Übergangsheizen"章 + 诚实算术表（明示假设 0,30 €/kWh：过渡季 COP 3–4 → **~8–10 ct/kWh Wärme** vs Heizlüfter 30 ct，霜冻天退化到 ~15 ct）+ 关键桥接句"**夏天买了 Split 的人，秋天已经拥有屋里最便宜的过渡期取暖器**"（把夏季簇流量导入秋冬）+ 诚实边界（<0 至 −5 °C 效率崩、深冬中央供暖赢）。3 FAQ 首次挂 FAQPage schema（逐字校验），气价只做定性比较+"以你合同价为准"。新鲜度 2026-08-08，idempotent OK。

**判定（预注册）**：9/15 前该页 GSC/D1 展示不升 → 说明卡位过早，10 月复查；若 9 月起展示爬升 → 秋季批次（9/1 计划）优先扩 Heizen 簇的其余薄页。

## 2026-08-08（第七轮）:站点自驱能力 — 每日自部署 + 需求自排序首页

owner 指令"给网站增加自动刷新拓展品类的能力,不要每次靠你"。**先划诚实边界**:判断类工作(KGR 判定/蚕食检查/德语写作)无法交给无 LLM 的脚本——盲目自动生成页面正是本仓三次拒绝的垃圾站路线,这部分仍由每小时 Routine 承担。但盘点发现**两个纯机械刷新环节确实拴在我的 push 上**,已解开:

① **每日自部署**(deploy.yml + cron 03:17 UTC):季节轮换/新鲜度徽标/结构注入只在部署时运行——没人 push 的话 9 月 1 日首页仍是夏天。现在每天自动重建;注入器幂等,安静日=字节相同+IndexNow 零推送。**堵掉一个坑**:cron 触发时 `github.event.before` 为空,原回退逻辑会每天把上一次提交的 URL 重复推给 IndexNow——scheduled 路径改为 HEAD 对 HEAD diff,只推注入器本轮真正改写的文件(如季节切换日的首页)。
② **需求自排序首页**(`/api/top` + EB_POPLIVE):「Beliebteste Ratgeber」原是 7 月 GSC 快照写死的 6 条——唯一声称展示需求的板块恰恰不会动。新 Worker 端点聚合自有漏斗(仅路径+计数,28 天,边缘缓存 6h,/api/heat 同款防御契约:失败降级空列表且不缓存);构建时把 101 个指南页的**真实 H1** 做成 slug→标题映射嵌入首页,live 脚本按实时排名重绘板块——只用真标题、映射外的页跳过、有效条目 <3 保持原样(不比被替换的更空)。**第一版设计被实测否决**:只重排"已在列表里的链接"实际匹配不到任何东西——漏斗热门页恰恰是 7 月快照没料到的那些。
③ CI 断言 `/api/top` 与 heat/ev 并列——静默失效必须吵。

Chromium 实测:4 个真实页按需求序替换网格+前 3 带 🔥 徽章、未知路径跳过、空 API 保持原样。自此:**天气层(小时级)、需求排序(6 小时级)、季节/新鲜度(天级)全部自驱**;每小时 Routine 只再负责需要判断力的部分。

## 2026-08-08（每日循环 v4）：史上最佳转化日 + EN 窗封购买页（阈值一天被打穿）

**漏斗看板（D1，GA4/Supermetrics 仍过期→owner 侧）**：28d 汇总 page_view 76 / heat_now 21 / **affiliate_click 13** / popup_view 4 / video_play 3 / btu_calc 2。**08-07 = 史上最佳单日：25 pv / 9 次联盟点击**（此前 28 天合计才 5 次）——转化层（toppick/型号扩容/产品前置）上线 48h 内漏斗末端显著变粗。
**点击解剖**：9 次中 **5 次是窗封族搜索**；其中 **4 次来自同一个英文页 `portable-ac-tilt-and-turn-windows`**（同一读者一口气点了布封、Eurom 面板、EX105、sticky）——前天 DE 窗封购买页预注册的"30 天 ≥3 点击→上 EN 版"触发条件，**EN 侧需求一天就打穿了**。
**popup 首批数据**：4 views（全部 scroll 触发、桌面 exit-intent 零触发）、4 次 × 关闭、0 点击——n=4 远不足以判定，按克制原则**不动**，继续攒样本。**share=0**：正常——昨天恰是两波热浪之间的凉爽日，热浪条没渲染；今起回热，观察窗刚打开。

**ship：`en/guide/window-seal-portable-ac.html`**（sitemap 140）——镜像 DE 决策结构（三 Bauart 路由/2×(B+H) 长度规则+页内 EB_SEALFIT/胶带诚实章），按 EN 受众改写而非逐句翻译，amazon.de 约定保持；hreflang 双向配对+x-default；4 FAQ schema 逐字校验；与 DE 版一样跳过 AC 型号网格/弹窗/toppick（读者已有机器）。入链自 tilt-and-turn（昨天产出点击的那页）/skylight/hose 三页。幂等 byte-stable。

**里程碑检查（Step 4）**：affiliate_click 13/28d（阈值 20 未到但斜率陡增）；popup/share 判定窗口开启中；GA4 鉴权与 GSC 收录请求仍在 owner 不可代劳清单。

## 2026-08-08（第八轮）：站内搜索 — 真正的产品是查询日志

owner 指令"加站内搜索,了解用户需求,驱动自动化"。**设计重心放在遥测而非 UX**:140 页静态站不需要搜索后端——`tools/build_search.py` 从 sitemap 同源文件生成 37 KB 索引(title+description,DE/EN 标记),导航栏全站注入 🔍 切换框(懒加载:不点开不取索引=零 CWV 代价),浏览器端匹配+变音归一化(lueftung→Lüftung)。
**自动化闭环**:`site_search{q≤80字符,hits}` 入 D1(无用户标识,datenschutz 已补"请勿输入个人数据"节)——**hits=0 的查询=用户原话写下的未满足需求**,已在 `docs/analytics-first-party-d1.md` 沉淀两条 SQL(未满足需求队列+搜索→点击漏斗),作为每日循环 Step 2 的选题输入。**判定纪律不变**:hits=0 只是候选,仍要过 KGR/SERP 判定与蚕食检查。零命中时对用户诚实:"Nichts gefunden — wir haben uns das Thema notiert."(确实记了)。
**验证**:Chromium 四路径全过(懒加载时序/命中+pick 遥测/零命中事件+文案/变音归一);事件过 worker 白名单与 check_events;全站 143 页注入幂等 byte-stable。
**自此需求感知三层**:被动(D1 页面/点击漏斗)→ 主动表达(站内搜索 hits=0)→ 外部(Trends/SERP 判定),前两层全自动入库,第三层由 Routine 消费。

## 2026-08-08（第九轮）：对标比价站/评论站 — 只学它们真正卖的东西

owner 一手观察：德国用户买前必去比价站看价格、评论站看评价。**先问 07-23 那轮对标学掉了什么**（购物观感组件：面包屑/信任条/sticky/网格已齐），本轮只做它跳过的两项核心资产，且只用本站能诚实承载的形态（无 PA-API=实时价格与星级都是编造，Amazon 评论禁转载——均为已核实约束）：

① **比价站真正卖的是"时机知识"** → 新页 `klimaanlage-wann-kaufen.html`（sitemap 141，蚕食检查通过，SERP=比价站分类页+小博客）。核心发现反直觉且更诚实：公开经验值显示**淡季省的设备差价往往比想象小，真正赢在选择/交期/安装档期**（Split 安装 5–10% 折扣现实存在）；最贵的错误不是价格而是时机——浪中买剩货。页面明说"我们为什么不显示实时价格"（没有价格接口=编数字），**指名把看价格走势的读者送去 idealo/geizhals**，把 Hitze-Radar 定位为本站能诚实提供的那半个 Preiswecker。3 FAQ schema 逐字。
② **评论站真正卖的是"权衡"** → 全站注入型号卡逐个加 **✓/✕ 一句权衡**（静但贵/便宜但 ~63 dB/强但吵……），按型号名查表、来源=卡片本就引用的公开测试共识，**给不出依据的型号宁可不写**。覆盖 41 DE + 10 EN 页。

**owner 侧（不可代劳）**：多商家比价需注册 AWIN/Otto/MediaMarkt 等联盟网络方可合规变现——已入清单。
**过程**：byte-stable 检查抓到 toppick/updated 徽标一次性顺序翻转（第二遍收敛），已确认稳态;全站 JSON-LD 解析通过。

## 2026-08-08（第十轮）：自动化涌现闭环 — 机器凝练层 + 代理判断层

owner 指令"智能预判趋势→自我完善"。**调用 content-engine 技能评估**：其框架覆盖内容产出层（source-first/平台适配），不覆盖凝练层——但其第一原则"从源材料写作"正是本轮方法论锚点：**趋势雷达=判断层的常设 source material**。

**涌现的诚实定义（写进架构）**：脚本不判断（自动生成页面=本仓四次拒绝的垃圾站路线），代理不再每轮手工采集。四层分工：
- **采集层**（已有）：D1 漏斗 + 站内搜索遥测 + open-meteo
- **凝练层（本轮新建）**：① Worker `/api/trend`——周环比事件总量/相对自身前 7 天加速的页面/零命中搜索队列，聚合无 PII，防御式降级，进 CI 断言；② `tools/trend_radar.py`——每日定时部署中运行，把四路信号（7 天天气峰值+热浪旗标/季节倒计时+提前 4 周窗口/漏斗加速/未满足需求）压成 `docs/trend-radar.md` 并提交回仓库（仅实质变化才提交；commit 限 schedule 事件防与 push 竞态；docs/ 在触发 paths 外防递归）
- **判断层**（已有 Routine）：CLAUDE.md 新增规则——**每轮循环 Step 1 必读雷达**；纪律不变：雷达列候选不列结论，KGR/SERP/蚕食三关照过
- **执行层**（已有）：CI 管线 + 幂等注入器

**预判=三件可核实的事**：天气预报（需求领先指标）、自有数据加速度（已在动的）、季节日历（每年此时开始动的）——不是占卜。
**离线夹具全过**：热浪旗标/季节倒计时（距 Herbst 24 天正确开窗）/加速过滤剔平盘页/零命中列表/实质未变不重写。首份生产雷达随本轮部署后生成并提交。
**注**：首份雷达在本沙箱生成为降级版（本环境 egress 够不到生产端点与 open-meteo——已知限制，CI runner 无此限制），明日 03:17 UTC 定时 run 起由 runner 用真数据覆盖。

## 2026-08-08（第十一轮）：AI-native 战略 + 旗舰落地 MCP 服务器

owner「打造 AI 时代成功的 AI 网站」。**调用 ai-seo 技能**走完 GEO/AEO/Agentic 全框架审计,战略沉淀 `docs/ai-native-strategy-2026-08.md`。

**战略核心洞察（自有数据支撑）**:本站**已经活在后 Google 世界**——引荐构成 Google=0、Bing/DDG/chatgpt.com 承载全部,且 chatgpt 引荐会话**已产生联盟点击**。"AI-native"对本站不是转型而是把已成立的模式做深。三层模型:**被引用**(GEO,已建成 80%:11 个 AI 爬虫 robots 显式放行/llms.txt/直答块/带源统计/新鲜度)→ **被调用**(本轮旗舰)→ **AI 时代商业模式**(被引用→高意图点击→联盟,chatgpt 引荐转化率远超均值;中期 widgets B2B;明确不做 AI 内容农场与付费墙)。

**旗舰 ship:`getecoback.com/mcp`** — Worker 上的无状态 Streamable-HTTP **MCP 服务器**,4 个工具逐行镜像站内计算器(代理与页面永不打架):btu_empfehlung / fensterabdichtung_laenge / hitzewelle_vorschau(与站内热浪条共用同一 heatReading)/ klimaanlage_stromkosten。**每个结果自带来源 URL+诚实披露**("非自测、联盟资助")——**被调用即被引用,且披露随数据传播**。调用计入 `mcp_call` 事件(同一无 PII 管线,遥测失败不破坏工具)。发现层:`/.well-known/mcp.json` + llms.txt 新增"Für KI-Agenten"节(含 3 个开放聚合 API)。CI 新增 initialize 往返断言。

**协议级实测**(Node 直驱 worker 模块):initialize/202 通知/tools/list/4 个工具调用算术全对/未知工具与方法错误码/GET 405——全部通过。
**预注册判定**:90 天内出现任何真实第三方 `mcp_call`(排除 CI)→ 扩工具;0 → 保留(维护≈0)不扩张。AI 引荐占比连续 4 周 ≥20% → GEO 深化升为每日循环常设优先级。

## 2026-08-08（第十二轮）：MCP 主动发现 — 官方 Registry 自动发布 + 可索引文档页 + owner 套件

被动发现=三个文件等人撞见；主动发现=站到代理生态真正查找的地方。**关键核实**：官方 MCP Registry 支持 GitHub OIDC 发布——本仓库的 Actions 可直接认证 `io.github.f-tiger` 命名空间，**零 owner 密钥**；且多数社区目录从官方 Registry 同步——**发布一处，级联全网**。

**ship**：① `mcp/server.json`（远程 streamable-http 声明）+ `publish-mcp.yml` workflow——动态解析 mcp-publisher 最新 release（资产名带版本号不可硬编码）、**发布前先对生产端点做 initialize 往返，失败拒绝发布**（绝不广播指向死服务器的指针）、server.json 变更或手动触发即发布；② `/mcp.html` 可索引落地页——四个工具说明、Claude Connector/mcp.json 复制即用配置、WebAPI schema、诚实段落（"本站靠被引用生存；每次调用只记录工具名"）；入口：tools 枢纽卡片 + llms.txt（改指文档页）+ sitemap 142 + 站内搜索索引；③ `docs/marketing/mcp-discovery-kit-2026-08.md`——mcp.so/PulseMCP/Glama/Smithery/awesome-list PR 五渠道复制即交材料（每渠道一次，不群发）。

**验证**：workflow YAML 解析通过；mcp.html 幂等 byte-stable、进 sitemap/llms/搜索索引各 1 次。沙箱摸不到 GitHub API（egress，预期内）——workflow 的资产解析在 runner 上跑，失败会大声报错而非静默。
**下一步自动发生**：本次 push 改了 mcp/server.json → publish workflow 将随 deploy 并行首跑，Actions 里可见 `Publish MCP server` 的首个 run。

### 里程碑（2026-08-08 21:12 UTC）：本站已进入官方 MCP Registry

publish run #1 失败（Registry 校验 description ≤100 字符,我写了 290——修短,长版留在 mcp.html）;**run #2 全绿**:OIDC 登录成功（零密钥）→ 生产端点 initialize 健康检查通过 → **发布成功**。`io.github.f-tiger/getecoback-raumklima` 现已可被所有浏览官方 Registry 的客户端与镜像它的社区目录发现。首跑失败顺带验证了两件设计:发布前健康检查真的在拦（若端点死则拒绝广播）、失败大声（422 详情直接进日志）。此后 server.json 任何变更自动重新发布。

## 2026-08-08（第十三轮）：MCP 收尾 + 两站对照诊断

**MCP 发布线闭环**（run 4-6）：新名 `getecoback-climate-weather` 已发布（含检索词 climate/weather——官方 Registry 只按 name 子串搜索,description 不参与）;旧名 v1.0.1 已 deprecate;publish 管线改幂等（同版本重发=已发布≠失败）,run 6 手动 dispatch 验证全绿。累计撞出并消灭 Registry 三条未文档化规则:description≤100 / remote-URL 全局唯一 / 同名同版本不可重发。
**两站对照**（owner 观察 baipiaoji.com 只有 AI 引荐）:一次精确域名搜索定案——**本站两个指南页直接出现在 Bing 家族索引里（含 3 天前的 BGH 新标题）,baipiaoji 零收录连首页都没有**。诊断:"只有 AI"不是 AI 偏爱,是传统索引里根本没有它（AI 助手实时抓取不依赖索引）。移交清单 `docs/marketing/baipiaoji-cross-learning-2026-08.md`（sitemap/IndexNow/SSR/robots/WAF 五项按概率排序,IndexNow 是本站验证过的最快通道）。反向经验:事实型数据表是 AI 引用的最优形状=本站路线验证;新增共同空白到 owner 清单:Bing Webmaster Tools 站点验证。

## 2026-08-08（第十四轮）：规则二接入自动化循环 — 雷达测发现层,CI 守 Registry

owner 指令"基于规则二优化每日定时任务与站点主动任务"。**不加新循环,增强既有两条**（循环越多越难审计）:
① **每日凝练层（趋势雷达）新增第 6 节「发现层」**:/api/trend 增加 referrer 周环比与 mcp_call 按工具聚合;雷达每日计算 **AI 助手引荐份额**（chatgpt/perplexity/copilot/gemini/claude/deepseek 六域名）并对照战略预注册阈值（≥20% 连续 4 周→GEO 深化升常设优先级）,列出 **MCP 真实调用**并写明后续动作（有调用→扩工具+按被调用工具迭代 Registry 关键词;零调用→在册不扩张）。每小时 Routine 依规则必读雷达=判断层零改动自动继承信号。
② **每日 CI 新增 Registry 在册断言**（仅 schedule 触发）:官方 Registry 一旦移除条目必须变红,不许无声消失;外部 Registry 故障不阻塞内容部署（3 次重试后才报错,且只在定时 run）。
夹具实测:AI 份额 28% 正确触发阈值提示、工具调用正确触发迭代提示、零调用路径正确输出克制口径。至此规则二从"要记得的纪律"变成"循环自产自销的信号"。

## 2026-08-09（第十五轮）：深度行为分析 → 问题页卖修复不卖新机

**7 天行为解剖（18 次联盟点击）**：转化模式毫不含糊——**上下文内配件链接**是唯一强模式（窗封族 50-67%：kippfenster 3/6、EN tilt 4/6）；设备型号卡在购买页有效（30-qm 1pv/4c）、**在问题页零效**。最高流量零点击页全是问题页：reinigen 5pv、zu-laut 4pv、tropft 3pv=12 次访问 0 点击，且都挂着 7 台新机的设备网格——给"机器在滴水"的人卖新机=卖偏（窗封页数周前就识别并排除过的同一错误）。
**缺口具体到讽刺**：清洗指南正文 4 次推荐 Zitronensäure、45 次提到 Filter——却一个清洁用品链接都没有；滴水指南教 Kondensatschlauch/Wasserwaage/Kondensatpumpe——也一个没链。
**ship**：两页 FAQ 前各加「🧰 Das brauchst du dafür」修复配件盒——**只装页面自己推荐的东西**（含一个 0 € 项：水平尺，"最常见滴水原因是机器没放平"——诚实到告诉读者可能什么都不用买）。披露写在盒内。幂等 byte-stable、JSON-LD/tag/ASIN 校验全过。
**克制不动的**：zu-laut 已有内联防震垫链接；首页 14pv/0c 但 toppick 才上线 2 天不重判；popup 累计 0/9 点击、78% 直接关——继续攒到预注册 n（≥50）再判死刑。
**判定**：14 天内 reinigen/tropft 两页出现任何 `affiliate_click` → "修复配件盒"模式推广到其余问题页（stinkt/kuehlt-nicht/EN 镜像）；仍为 0 → 承认问题页读者就是不买，停止在该页型投入转化组件。

## 2026-08-09（第十六轮）：国家维度首切 — 33% 点击佣金死区 + EU 摩擦消除

**新维度**（country 列此前从未分析）：全量 18 次联盟点击 = **12 次有佣金资格**（DE 11 + AT 1）+ **6 次佣金死亡（33%：US 2/GB 2/CA 2）**——amazon.de 对美英加不计佣，EN 页 67% 的高 CTR 有三分之一是营收空转。**CTR 与佣金在此脱钩，而目标是 3 单不是点击数。**
**可行动/不可行动的诚实拆分**：① EU 英语长尾（SI/CZ/SK/RO/HU/HR/LU/LT 访客）**本就全部计佣**——但很多人不知道 amazon.de 有英文站+英文结账=下单摩擦。ship：EN 型号网格披露行（注入器,10 页）+ 3 个头部 EN 页披露盒各加一句"Amazon.de ships to most EU countries — site and checkout available in English"。② 死区真解药 = **Amazon OneLink**（owner 动作）——但 US/UK Associates 各有自己的 180 天 3 单存活线,现在注册可能两个都养不活;论证文档 `docs/marketing/amazon-onelink-case-2026-08.md` 写明触发点:**EN 周点击稳定 ≥5 再注册**,监测 SQL 一行。
**附带发现**：US 访客在 DE 页 22 pv/0 点击——形态像 AI 助手/爬虫的美国出口节点浏览,非真人流量,不动。
**判定**：14 天窗口观察 EU 长尾国家（非 DACH 欧盟）点击是否从 0 破零 → 证明英文结账提示有效;死区占比进雷达监测口径。

## 2026-08-09（第十七轮）：强化德语区 — 冠军家族扩进 DIY 意图

**分析结论定方向**：佣金合格点击 100% 在 DACH、DE 页整体 CTR 33%、窗封家族独占 1/3 点击——强化德国=**给已证明的家族喂更多德国购买意图**，不发明新杠杆。站内搜索暂无真实查询（上线 1 天），选题由家族数据承载。
**缺口**：kippfenster 页只用一句话提到"裁板方案"，而德国 DIY 文化正搜"Fensterabdichtung selber bauen"——SERP=塑料板材商内容营销+小 DIY 博客，零权威=可写；蚕食检查：既有页覆盖"买现成"与"怎么装"，selber-bauen 意图无专页。
**ship**：`fensterabdichtung-selber-bauen.html`（sitemap 143）——两种方法（Kipp-Platte 经典法 / Magnetrahmen 全开法）+ 10–40 € 材料清单诚实变现（Hohlkammerplatte/Acrylglas 裁切/磁条/密封条，全品类搜索链）+ 从窗封页继承的"先除脂再粘"教训 + 手掌测漏法 + **诚实的 bauen-oder-kaufen 对照表**（承认布套在时间与灵活性上赢，并点名"超规格窗=DIY 是最便宜的定制"）。4 FAQ schema 逐字；照配件页惯例跳过 AC 网格/弹窗/toppick（读者已有机器）。入链自两个家族页。
**判定**：30 天该页 `affiliate_click` ≥2 或进入 Bing 索引并起展示 → 家族 DIY 支线成立（候选下一页：Abluftschlauch-Wanddurchführung DIY）;两者皆无 → 支线关闭。

## 2026-08-09（第十八轮）：DIY 页升级为工具页 — Zuschnitt-Rechner

owner 问"提供工具而不只是内容？"——**先纠前提**：工具层是本站脊柱（10 计算器页+3 widget+首页 BTU+窗封/软管内联计算器+4 MCP 工具，且漏斗证明工具邻近页转化最强）；真缺口=昨天的 DIY 页是纯散文，而它的读者恰恰需要数字（裁切板按厘米下单）。
**ship：页内 Zuschnitt-Rechner**——输入内框尺寸+软管口径 → 输出**可直接下单的采购清单**：板材尺寸（+1 cm 磁条承面/边,写明不藏）、磁条长度（板+框对面=2×周长,给出买 5 m/10 m 卷判定）、密封条备量、开孔位置规则；诚实标注只算方法 2（方法 1 的 Kipp 缝隙在窗上量,不算）。**尺寸带进搜索链**（acrylglas+zuschnitt+62x142）——窗封计算器验证过的转化招式。Chromium 双组算术全对、超尺寸正确给"两卷"、`panel_fit` 入库、事件白名单+check_events 绿。
**owner 追问"上首页？"——答否**（意图错位：首页=旅程起点/BTU 工具已占位;DIY 计算器=晚期窄意图）;正确曝光位=tools.html 工具卡（已加）;且首页热门块按流量自排序——**页面真起量会自己上首页**,机制已兜底。

## 2026-08-09（第十九轮）：配件货架扩展 — 定时插座补上"建议了却没链"的最后缺口

owner 指令"用户重点关注配件,扩展丰富配件产品"。**先盘点类目缺口再动手**:配件货架现状=窗封（买/DIY/装 3 页+计算器）、软管（hosefit+页内链）、冷凝水/清洁（fix-kit）、防震垫（内联）、Hygrometer（多页已链✓）——**唯一实锤缺口=Zeitschaltuhr/WLAN 插座**:21 个页面建议"预冷/定时"（heatenergy 盒自己就在 50 个制冷页说"mittags vorkühlen"）,但智能插座链接只在能源簇（计量用途）,制冷读者被教了策略却从没见过执行它的 10 € 设备。
**ship**:HEATENERGY_BOX 注入器加一行（54 页一次覆盖）——WLAN-Steckdose mit Timer 品类链 + **比链接更重要的诚实警示**:"只在设备有 Auto-Restart（断电来电自动恢复运行,查手册）时有效"——不带这句的定时器推荐对一半读者是卖了个没用的插座。div 平衡校验+幂等 OK。
**判定**:并入既有 affiliate_click 观察（link_url 含 wlan+steckdose 可单独统计);30 天窗口。

## 2026-08-09（每日循环 v4）：漏斗强势保持 + 埋点纠偏（Registry 探针≠采纳）

**漏斗（D1，GA4/Supermetrics 仍过期→owner 侧）**：08-06→08-07→08-08 = 28pv/1c → **25pv/9c** → **17pv/5c**，连续两天点击率 29–53%（非单日噪声）；驱动页仍是 EN tilt-and-turn（型号+窗封配件）与 klimaanlage-30-qm（型号卡 4 链），即已识别的两个冠军模式，**本轮无需修**。heat_now 每日 10–16 次（热浪层正常工作），popup 累计 9 view/0 click（继续攒至预注册 n）。
**唯一真问题（差点误判为里程碑）**：`mcp_call` 出现 4 次——查明细后 **3 次是官方 Registry 的清单校验探针**（`__verifymcp_auth_probe_<hex>__`，故意用随机工具名测服务器如何处理未知名），**1 次是我昨天对生产的 curl 自测**。真实第三方采纳=0。若不查，预注册的"任何真实调用→扩工具集"会被健康检查触发。
**ship**：埋点分流——`mcp_call` 只记录**本服务器真实发布的工具且执行成功**，其余（未知名/错误）落 `mcp_probe`；两者都进白名单，探针仍可见（它恰恰是"Registry 在持续校验条目"的证据），但不再污染采纳指标。历史 4 行**改判而非删除**（保留发生过什么的记录，同时让数字变诚实）；雷达发现层文案同步标注"已排除健康探针"。
**方法论**：新指标上线后第一件事是**读明细而不是读计数**——这次 4 个事件里 4 个都不是它看起来的东西。

## 2026-08-10（每日循环 v4）：两天 0 点击 → 修的是"最强产品位推错了产品"

**漏斗（D1，GA4/Supermetrics 仍过期）**：08-08→08-09→08-10 = 17pv/5c → **26pv/0c** → **8pv/0c**。连续两天 34 次浏览零点击，此前两天却是 9 与 5。查页面明细即见分化：当日 9 次是 US 无 Referrer（按 v4 约定计爬虫噪声），**真正带搜索来源的（bing/duckduckgo/yahoo/chatgpt，DE+CH）几乎全部落在问题页**——zu-laut、kuehlt-nicht、reinigen，以及 **`klimaanlage-wohnmobil` 单日 4 次（DE bing 2 / CH ddg 1 / DE ddg 1）**，是当日搜索流量最高的单页，且本会话从未审过。
**诊断（不是"缺组件"）**：该页组件齐全，但**页面最强的产品位在推错产品**——顶部 EB_TOPPICK + 型号卡给的是家用移动空调（De'Longhi/Comfee/AEG…），而页面正文自己写着"移动机对旅行使用多半太笨重"、露营现实解是 12V 风扇 + 遮阳。**最显眼的推荐与正文互相打脸**，读者要的四类商品（12V 露营风扇 / 前挡热反射垫 / 房车顶置空调 / 带软启动的移动机）一个都没进卡片。同一根因的另一半：`auto-bei-hitze-kuehlen`、`haustier-hitze-kuehlen` 因设备不匹配被塞进 SKIP_MODELS，于是**明确购买意图的页面完全没有可视商品位**，只有正文里的文字链。
**ship**：`build_structure.py` 新增 `CONTEXT_MODELS`/`CONTEXT_SUB` —— 按 slug 覆盖 device 推断的商品集，同时喂给型号卡 / 顶部 pill / 退出弹窗三处；**搜索词全部取自各页正文已在用的链接**（不新增选型判断、不臆造型号名，沿用除湿/遮阳品类卡的既有做法），并给每页写了自己的诚实副标题（默认副标题讲"窗户密封"，对房车和汽车毫无意义）；弹窗对这三页去掉 BTU 计算器入口（按 m² 算冷量对露营车/汽车/狗没有答案）。覆盖 3 页 = 房车 4 卡、汽车 3 卡、宠物 3 卡；explainer 仍排除（房间空调动画不适用）。
**校验**：二次运行 byte-stable；全站 JSON-LD 全解析、FAQ 与 schema 逐字一致、0 ASIN、Amazon 链接全带 `tag=getecoback-21`（9 处"无 tag"命中均为既有 JS 拼接链与 datenschutz 的 Amazon 帮助页，非本轮引入）；Chromium 390px 实测顶部三枚 pill、型号卡首个 CTA、弹窗三行均已指向露营商品，弹窗无计算器行、高度 316px 不与 sticky 叠加。
**判定（预注册）**：14 天内这三页的 `affiliate_click`≥2 → 上下文商品集扩展到其余设备不匹配页（zelt/wohnwagen/büro 类）；=0 → 判定为"搜索流量落问题页但无购买意图"，改走站内导流而非商品位。

## 2026-08-11（每日循环 v4）：一次点击两条记录 —— 修的是量尺本身

**漏斗（D1；GA4/Supermetrics 仍鉴权失败 → owner 侧，本轮跳过不卡住）**：08-07→08-11 = 25pv/9c → 17/5 → 26/0 → **33pv/3c** → 今日 4pv（UTC 早）。昨日修的 `klimaanlage-wohnmobil` **当天就转化**：LU 用户经 bing 进来，点了顶部 pill 的 `dachklimaanlage+wohnmobil`（source=toppick）——预注册的"14 天≥2 次"已进 1 次（n=1 不是结论）。28 天事件：page_view 152、heat_now 80、popup_view 25 / popup_close 16 / **popup_click 0**（仍未到 50 view 的判定门槛）、btu_calc 4、stromkosten_calc 2、site_search 0。
**本轮真问题（在读点击明细时撞出）**：同一次点击在 D1 落**两行**——一行来自页面自带追踪器（带 `link_url`/`page_path`），一行来自组件监听器（带 `source: toppick|sticky|inline`）。7 天内 3 对：wohnmobil(toppick)、EN tilt-and-turn(sticky)、turmventilator(inline)。**28 天 21 行 → 按 (day,page,link_url) 去重只有 19，再算上那条无 link_url 的 inline 行，真实唯一点击约 18**。08-05 那次只堵了**兜底委托监听器**、且只在另一条路径走 gtag 时才生效；页面级追踪器与组件监听器各自直接调用 gtag，谁也管不到谁。这条量尺是本循环所有判定的基础（"14 天≥2 次"被一次点击就能满足），所以本轮优先级高于任何内容改动。
**ship**：把去重下沉到**信标层**（EB_TRACK，全站一次覆盖）——`affiliate_click` 缓冲 700ms、合并参数、只发一行；窗口内出现**不同** `link_url` 则先冲掉前一条（两次真实点击仍是两行）；`pagehide`/`visibilitychange` 立即冲刷；其余事件与 page_view 路径完全不变。副作用是**数据变好**：合并后的行同时带 `source`+`link_url`（此前两个字段被拆在两行里）。
**校验**：VM 沙箱 6 情形全过（同链双发→1 行且字段合并/不同链→2 行/兜底合并/非联盟事件即时且 page_view 仅 1 次/pagehide 立即冲刷且不重发/同链间隔 900ms→2 行）；Chromium 390px 真点击实测 wohnmobil 与 30-qm **各恰 1 条**信标（此前是 2 条）；全站 JSON-LD 全解析、EB_TRACK 标记全站唯一（404 与 3 个 widget 页本就不带，非回归）、0 ASIN、二次运行 byte-stable。
**口径修订**：此前所有 `affiliate_click` 计数在"带组件的页面"上偏高，日志与雷达中 08-11 之前的数字按上述比例理解；**不删历史行**（保留发生过什么），只从今天起口径干净。

## 2026-08-11（第二轮 · owner 指令"站点工具化 + 让 MCP 被主动发现"）

**先测量再动手（规则二④"按用户搜索持续优化关键词"的口径是数据，不是猜）**：① D1 出现**首批真实 MCP 调用**——`btu_empfehlung` ×1（08-10）+ ×3（08-11），既不是 CI（deploy 只做 `initialize`，从不 `tools/call`）也不是 Registry 探针（探针用随机工具名，落 `mcp_probe`）。**调用方身份不可考——这是设计使然**（不存 IP/UA/参数），故只记"非 CI、非探针的真实调用 n=4"，不宣称采纳里程碑。② 直接查官方 Registry 的搜索行为（name 子串匹配是唯一机制）：`weather`=100+ 条（我们挤在里面毫无位置）、`climate`=9、`energy`=9、`hvac`=**2**、`heat`=**1**（还是误匹配 cheat）、`btu`=**0**、`aircon`=**0**。**结论：我们占着最拥挤的词，而被真实调用的那个工具（BTU 定量）所在的词是空的。** ③ Web 搜索 `getecoback mcp`：零命中——聚合目录没收录，即"在册但没有任何指向它的入口"。
**ship A（工具化）**：新增幂等注入器 `EB_SIZER`——把房间定量计算器**直接放进指南页**（插在型号网格正上方＝先算后买），覆盖 **44 DE + 20 EN** 空调页；面积页按 slug 自动预填（`klimaanlage-30-qm` → 30 m²），读者若存过房间则用他的数。**公式与 `/guide/btu-rechner.html` 逐行相同**，浏览器对拍 12/20/30(强日照)/45 m² **四组与独立计算器完全一致**（4.000/7.000/12.000/14.000 BTU），Worker 的 MCP `btu_empfehlung` 用的也是同一行 `Math.round(qm*340*sun/500)*500` 与同样的档位——**三个面（网页/内嵌工具/AI 工具）永不给出不同答案**。已带自有计算器的页（窗封/软管 fit、btu-rechner 本身）与设备不匹配页一律跳过。埋点 `btu_calc{source:"guide"}` 实测 4 条全部到达 `/api/ev`。
**ship B（主动发现）**：Registry 条目按上面的竞争度数据改名 `io.github.f-tiger/getecoback-climate-weather` → **`io.github.f-tiger/hvac-btu-heat-klimaanlage`**（一次覆盖 btu/hvac/heat/klima/klimaanlage 五个近乎无人占的检索词），旧条目升 1.0.1 并 deprecate（remote URL 全局唯一且被弃用条目仍占用 → Worker 新增 `/mcp/v1` 别名，路由改为整个 `/mcp/` 子树，`/mcp.html` 仍是页面）；`mcp.html` 与 `llms.txt` 同步写明新条目名、可检索词与"两个 URL 是同一台服务器"的原因。**同时把发现入口放到有流量的地方**：每个 sizer 结果下面一行——"这道计算你的 KI 助手也能直接调用 → MCP-Server 设置"，即用站内真实读者去推 MCP 安装，而不是干等 Registry 搜索。
**校验**：二次运行 byte-stable；64 个 sizer 块标记全平衡；全站 JSON-LD 全解析、0 ASIN、Amazon 链接全带 tag；DE/EN 两份内联 JS `node --check` 通过；四个 MCP JSON 均合法；worker 解析通过。
**明确不做（并记录理由）**：① 不再改名——除非出现"由 Registry 搜索带来的调用"这类可观测证据，否则第 4 次改名只是给公共目录添弃用条目；② 暂不扩 MCP 工具集——预注册规则说"有真实调用即扩"，但上一次 4 个 mcp_call 全是探针的教训要求**先确认调用持续存在**（CI 从不调用工具，所以后续几天的 `mcp_call` 就是干净的判据），确认后再按被调用的方向（定量计算）扩；③ 不向第三方 MCP 目录仓库提 PR——那是以 owner 身份对外发布，需要 owner 明确同意。

**同轮追补（发布后核对 Registry 实况时发现）**：查新条目是否上线时顺手核对旧条目，发现**本仓从上一轮起做的"deprecate 旧条目"一直是空操作**——Registry 把 status 存在服务端 `_meta.io.modelcontextprotocol.registry/official.status` 里，publish 携带的 `"status":"deprecated"` 被**静默忽略**（实测两个旧名至今都是 active；官方 issue #931 确认"无 deprecate/delete"是已知缺口）。更糟的是管线每轮都重发这些文件，只会刷新旧条目的 `updatedAt`，让过期条目看起来还在维护。**改法**：`mcp/deprecated/` → `mcp/superseded/`，能改的只有 description，于是两个旧名各发 1.0.2，description 写 `Superseded by io.github.f-tiger/hvac-btu-heat-klimaanlage — same server, same URL.`（旧 URL 继续可用，已安装的人不受影响），publish 8 绿、Registry 已生效。CLAUDE.md 规则二的"三条实测规则"同步更正为四条（含"先量竞争度再选词"的实测数字与"没有 deprecate"这条）。**另**：deploy 新增对 **Registry 实际指向的 `/mcp/v1`** 的 initialize 断言（此前只断言 `/mcp`）——run 326 绿，即广播出去的那个 URL 现在每次部署都自证存活。

## 2026-08-12（每日循环 v4）：MCP 调用连续三天存在 → 按预注册扩工具集（不是加宽，是顺着被调用的方向）

**漏斗（D1；GA4/Supermetrics 仍鉴权失败，本轮跳过）**：08-08→08-12 = 17pv/5c → 26/0 → 33/3 → **30pv/9c** → 今日 4pv（UTC 早）。08-11 是本月最好的一天（点击率 30%），且是**去重上线后**的第一整天，所以这 9 次基本是干净计数。转化来源：EN Italy 页 ×2（US）、`klimaanlage-mit-heizfunktion` toppick（DE/ddg）、`ventilator-mit-eis` ×2（CH/ddg，MeacoFan+Rowenta）、`klimaanlage-wohnmobil` ×4。**wohnmobil 的 4 条是两两同链、且两条都不带 source** —— 去重是当天 05:11 UTC 才上线的，而 ev 表**只存日期不存时刻**，所以无法判定这两对在部署前还是后（下一轮候选：给 ev 加时间戳列，判定层现在缺小时级分辨率）。popup 累计 **38 view / 1 click / 21 close**（预注册门槛 50 view，未到，继续攒）。`btu_calc{source:"guide"}` = **0**：sizer 昨天 15:10 UTC 才上线，只有 ~9 小时曝光，太早。
**触发的是另一条预注册线**：`mcp_call`（已排除 Registry 探针；CI 只做 initialize、从不调用工具）**连续三天出现**——08-10 ×1、08-11 ×3、近两天合计 6，且**全部是 `btu_empfehlung`**。上一轮我明确写了"先确认调用持续存在再扩"，现在条件满足。
**ship**：MCP 工具集 4 → 6，**顺着被调用的方向（定量计算）而不是求广**：`heizleistung_watt`（面积 × 60/80/100 W/m² 三档保温，>2.000 W 给两块面板的提示 + 每满载小时成本）与 `taupunkt_lueften`（Magnus 公式算室外露点，判定"现在能不能开窗"，墙面按低于室温 2 °C 计）。两者各自镜像站内已上线的计算器，**无新公式**。同步更新 mcp.html（六个工具 + meta/OG/WebAPI schema）、llms.txt、`.well-known/mcp.json`。选这两个的理由：被调用的是"给我一个数"的问题，而站内还没进 MCP 的可靠公式恰好就是这两个；且 9 月起是 Heizen 档，`heizleistung_watt` 正好提前入位。
**校验**：把 Worker 模块直接 import 进 Node、用桩 env（无 D1 绑定，验证埋点失败时不影响工具）跑真实 JSON-RPC——initialize/tools/list/tools\_call 全通过，6 工具在册；**与站内计算器逐组对拍**：20 m²/中=1.600 W、30/差=3.000 W 且都给出"2 × 1.500 W"、12/好=720 W、露点 28 °C/70 % → 22,0 °C「别开窗」、12 °C/60 % → 4,5 °C「可以开窗」——**六组与浏览器里的页面完全一致**；非数字入参返回 isError 而不是 NaN。全站 JSON-LD 全解析、0 ASIN、worker `node --check` 通过。
**下一轮候选（按优先级）**：① ev 表加时间戳（判定层缺小时级分辨率，这轮已被它挡住一次）；② popup 攒到 50 view 后判定（当前 2,6 % 点击率）；③ sizer 满 7 天后看 `btu_calc{source:"guide"}`。

## 2026-08-12（第二轮 · owner 指令"扩展工具、可 MCP 引用、优化 AI 助手流量"）

**先看 AI 引荐的实况（不是笼统"做 GEO"）**：28 天带 Referrer 的 98 次浏览里，AI 助手 8 次（chatgpt.com 5 + copilot.microsoft.com 3）≈ **8 %**（雷达门槛 20 %）。**落地页高度集中**：`klimaanlage-kippfenster` ×3、EN `portable-ac-tilt-and-turn-windows` ×1（合计 4/8 是窗封）、`klimaanlage-25-qm`、`best-portable…heatwave` ×2、`stinkt-schimmel`。即：**AI 已经在因为"窗封 + 选型"引用本站**。robots.txt 复查：GPTBot/OAI-SearchBot/PerplexityBot/ClaudeBot/Google-Extended/Applebot-Extended 全部显式 Allow，无可再修。
**ship A｜工具从"算数"扩到"可检索的语料"**：MCP 工具集 6 → 8，新增的两个不是又一个计算器，而是**检索层**——`ratgeber_suche`（用站内 `search-index.json` 做 name/URL/描述加权匹配，可按 de/en 过滤，返回标题＋URL＋摘要＝可直接引用的来源）与 `ratgeber_lesen`（取单页正文纯文本，剥掉注入的导航/型号卡/脚本，7.000 字符截断，附可引用 URL）。理由：装了服务器的助手此前只能拿到一个数字，拿不到本站 128 篇内容；现在**被安装即可被检索、被引用**。安全边界：`ratgeber_lesen` 只接受 `^/(guide|en/guide|kategorie)/[a-z0-9-]+\.html$`，跨域/`/api/`/路径穿越一律拒绝而不是去取。
**ship B｜让每个工具答案都带"能点的那一页"**：`btu_empfehlung` 现在按面积附上对应的面积页（25 m² → `/guide/klimaanlage-25-qm.html`，正是 copilot 实际引用过的那类页），`fensterabdichtung_laenge` 按窗型分流（kipp/drehkipp → kippfenster 页，dachfenster → dachfenster 页）——**AI 已经在引用的正是这两个主题**，此前两个工具都只给一个通用链接。
**校验**：把 Worker import 进 Node、用读磁盘的 ASSETS 桩跑真实 JSON-RPC：8 工具在册；搜索 5 组（德/英/限定语言/限 3 条/无命中）返回的都是真实存在的页；`ratgeber_lesen` 6 组（正常 DE、完整 URL EN、他站、/api/、路径穿越、不存在页）行为全部正确；**工具引用的 7 个 URL 逐个核对文件存在**；无 ASSETS 绑定时返回 isError 而非抛异常。全站 JSON-LD 全解析、0 ASIN、mcp.html/llms.txt/.well-known 同步为八工具，llms.txt 另把 `search-index.json` 列为公开机读接口。
**没做（并说明理由）**：① 不按 ai-seo 技能的 `/pricing.md` 建议发布 B2B 价目机读文件——那套白标/内容包**尚未建成**，为不存在的产品发布价格是不诚实的；② 不改 kippfenster/tilt-and-turn 页面本身（5 轮克制期内，且本轮已从工具侧把流量导向它们）；③ 不再扩计算器类工具——上一轮刚按"被调用方向"加过两个，先看数据。

## 2026-08-12（第三轮 · owner 指令"能源，特别是亚马逊的储能联盟产品"）

**先查需求再上货**：D1 全量数据里能源簇几乎**零流量**——`stromkosten-rechner` 3 pv、其余各 1 pv，**所有 `balkonkraftwerk-*` / `balkonspeicher-*` 页 0 pv**，`outbound_choice` 事件 **0**。即预注册的实验 ①（60 天出站 ≥30 且 Fachhändler ≥25 % → 注册垂直联盟；总出站 <10 → 证伪）目前正朝**证伪**方向走，**本轮不触发注册垂直联盟的决定**。诚实结论：储能的约束不是货架质量而是需求，本轮做的是把货架备好（秋冬是这簇的季节），不是指望它立刻出单。
**单位经济（WebSearch 核实）**：PartnerNet 现行表 Baumarkt 6 %、Elektronik 3 %（2025-06-23 起）；储能具体归类**未能从公开资料确认**（owner 侧可在后台核实，已在提醒清单里）。按 3–6 % × 600–950 € 客单＝**18–57 €/单**，≥ 空调的 18 €/单，所以品类值得备货；但仍远低于垂直联盟的 30–150 €/单（该路径需先有流量证据才谈）。
**发现的缺陷（与两轮前"房车页卖错货"同类）**：`device_of()` 对所有 `strom-*` slug 落回 `"ac"`，于是 **`strom-sparen-haushalt` / `strompreis-radar` / `stromvergleich-check` 三个能源页顶部是空调型号卡（AEG ChillFlex、Bosch Cool 5000）外加 BTU 定量工具**——读"家庭省电"的人不在买空调。
**ship**：① 三页并入 `CONTEXT_MODELS`，商品换成**各页正文自己已经在链接的东西**（电费计量插座、可开关插排、定时/智能插座；Radar 页＝可移负载的智能插座 + 阳台储能），并各写诚实副标题；AC 卡、AC 弹窗、BTU 工具随之从这三页消失。② **储能卡组升级**（owner 指令核心）：新增 **Marstek Venus E**（公开 2026 对比里 €/kWh 最低），四款**全部补上 ✓/✕ 权衡行**——此前储能是唯一没有权衡行的品类，偏偏客单最高；价格徽章从可能过期的绝对价改为**€/kWh 量级**（Marstek ≈215、Anker ≈370、Zendure ≈460 €/kWh，来源为公开对比）＋"现场查价"，比报一个会过期的绝对价更诚实也更有用。
**校验**：二次运行 byte-stable；三页实测 sizer=0、卡片/顶部 pill/弹窗全部换成能源商品且弹窗不再挂 BTU 计算器；储能页 4 卡 4 条权衡行；Chromium 实测卡片文案、价格徽章与链接（全部带 `tag=getecoback-21`）；全站 JSON-LD 全解析、0 ASIN。
**明确不做**：不因为"想要储能收入"就给储能页硬造流量或新页——需求侧没有任何信号，先让秋冬季节轮换与既有制冷→能源桥接自然带量，届时再按数据判断。

## 2026-08-13（每日循环 v4）：两条旧结论被自己的时间戳推翻 —— 修的是判读方法

**漏斗（D1；GA4/Supermetrics 仍鉴权失败）**：08-09→08-13 = 26pv/0c → 33/3 → **30/9** → **13pv/6c** → 今日 2pv/1c（UTC 早）。08-11、08-12 连续两天点击率 30 % 与 46 %，不是单日噪声。popup 累计 **43 view / 1 click**（门槛 50，仍未到）。`btu_calc` 自 sizer 上线（08-11 15:10）后为 **0**——两天、约 45 次浏览无人使用指南页计算器，而首页同款工具在同等流量下曾有 2 次/天；样本还太小，但已进观察名单。`site_search` 至今 **0**。
**本轮真正的发现：`ev` 表从建库起就有 `ts`（秒级 UTC 时间戳），我此前两轮都只按 `day` 聚合，于是凭"同一天两行"下了两条错误结论。**
- **更正 1（点击去重）**：08-11 之后仍出现的"同链多行"不是漏网的双重计数。看 ts：08-12 那 5 次点击分布在 11:56:39 → 12:08:02 的 12 分钟里，商品在 De'Longhi / Comfee / Midea 之间来回——**是一位访客在比价**，正是我为之保留"窗口内不同链接就先冲掉"的那种真实行为。上一轮"28 天 21 行实际约 18 次"的估计**修正过头了**；去重层本身仍然正确（浏览器实测的 0 ms 同刻双发确实被合并），但历史通胀被我高估。
- **更正 2（MCP 采纳）**：`mcp_call` 至今 8 次**全部是 `btu_empfehlung`**，且时间呈机器规律——08-12 02:12:43 与 02:12:44、08-13 01:11:34 与 01:11:35 各是**相隔 1 秒的成对调用**，每天凌晨同一时段，而服务器现有 8 个工具**从未被调用过第二个**。这是**索引器/爬虫**的形状，不是真实采纳。上一轮据"调用连续三天"扩工具集，虽然守了自己设的规则，但那条规则的证据强度被我读高了。**现阶段仍应按"第三方采纳＝0"处理。**
**ship（修仪器，不是修页面）**：① MCP 遥测现在记录**调用参数**（`meta.args`，≤160 字符）——爬虫每次发同一组固定参数，真人的问题各不相同，这是唯一能把两者分开的判据；`datenschutz.html` 如实补上这一段（工具名＋参数，无 IP、无标识、无 Cookie）。② `docs/analytics-first-party-d1.md` 补 `ts` 一节，写明"凡是'重复/同一人/部署前后'的问题一律先看 ts，别用 day 猜"，并给出点击间隔判读口径（<1 秒＝双重上报，几秒到几分钟且商品在变＝真实比价）与 MCP 采纳判据。
**校验**：桩 D1 实测六种调用（正常/重复/搜索/未知工具/参数错误/超长参数）分类与截断均正确，meta 最长 198 字符；worker `node --check` 通过；全站 JSON-LD 全解析、0 ASIN；本轮不改任何页面内容。
**方法论**：连续两轮的错误判断都不是数据不够，而是**没查已有的字段**。新指标上线后要先读明细；老指标出问题时，先确认自己是不是只用了它的一半。

## 2026-08-13（第二轮 · owner 指令"完善能源类工具"）

**先查工具本身是否真的能用，再谈"完善"**：审计发现旗舰能源工具 `strompreis-radar` **从读者浏览器直接调用两个第三方**——`api.awattar.de` 与 `www.smard.de/app/...`。两个问题：① 任一方拒绝跨域，页面就静默退回"加载失败"，而这正是 v4 循环里那条一直没有数据的 `strompreis_api ok 率` 指标（D1 至今 0 条该事件，说明没人看到过成功状态或根本没流量）；② 与本站自己的隐私立场矛盾——`/api/heat` 当初就是为了"访客浏览器从不接触第三方"才做成服务端取数的。
**ship**：新增 Worker 端点 **`/api/strom`**，沿用 `/api/heat` 那套防御式写法——aWATTar 主源、SMARD 备源，各自 6 秒超时与独立 try/catch，边缘缓存 30 分钟（日前电价发布后不再变），**失败一律返回 `{ok:false}` 而不是空响应，且失败结果不写缓存**；日界按柏林本地时间算，不是 UTC。页面侧把两处第三方 fetch 换成一次 `/api/strom`，`render()`/`fail()` 与分享、埋点逻辑原样保留，兜底文案改为"Börsendaten gerade nicht abrufbar"（不再谎称是"你的浏览器"的问题）。deploy 增加 `/api/strom` 断言（3 次重试），llms.txt 把它列为公开机读接口。
**校验**：桩测五种上游情形（正常/500/抛异常/返垃圾/全挂）**全部返回合法 JSON 且降级正确**；Chromium 实测正常态渲染 24 根柱、负价柱 1 根、最便宜/最贵/负价小时三个数字正确、分享行出现、`strompreis_api{ok:1}` 入库，**页面除既有 GA 外不再联系任何第三方主机**；失败态实测显示兜底文案并上报 `strompreis_api{ok:0,src:"api"}`——**这条指标从今天起才真正有数据**。10 段内联 JS 全部 `node --check` 通过、worker 解析通过、全站 JSON-LD 全解析、0 ASIN。
**说明**：本轮改的 `strompreis-radar` 上一轮刚动过（商品位），按克制原则本应回避；但这是 owner 明确点名的"完善能源类工具"，且属于功能修复而非反复调 CTR，故照做并在此备注。

## 2026-08-13（第三轮 · owner 指令"完善工具 + 让 MCP 可以被调用"）

**先分清"能被调用"与"真的被调用"**：服务器本身一直可调用（CI 每次部署都验证 initialize，`/mcp` 与 `/mcp/v1` 都绿），上一轮已证明真实第三方采纳＝0、现有调用全是索引器。所以本轮修的是**采纳漏斗上被我忽略的两环**。
**环一：触发面全是德语。** 8 个工具的 description 此前只有德语，而客户端里的模型正是**靠 description 决定要不要调用这个工具**——用户问 "how many BTU for a 25 m² room"，一段德语描述很可能匹配不上。全部改为**德英双语**（`德语句 — English sentence`），并把最容易歧义的参数（qm/sonne/fenstertyp/frage）也写成双语。**工具名一个没改**（名字是 API，改名会破坏任何已有配置）。
**环二：安装门槛。** 文档页此前只有一段要手动粘贴的 JSON。按官方文档格式加了**一键安装链接**：Cursor 用 `cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=<base64>`，VS Code 用 `vscode:mcp/install?<urlencoded JSON>`；两串都做了**解码回填校验**（base64/urlencode 解回来与原始 config 完全一致），并在按钮下方保留原来的手动配置——本环境无法真机点开这两个 deeplink，所以不把"点了必成功"当成事实，手动路径是兜底。
**同时补上漏斗中段的观测**：新增 `mcp_install_click{client}` 事件（已进白名单，`check_events` 通过）。此前只能测"被调用"，测不到"有人想装"；现在两端都有数：想装的人数 vs 真实调用数，才能判断卡在哪一环。
**校验**：`tools/list` 实测 8 个工具描述全部双语且长度 199–299 字符；`check_events` 30 个事件名全部白名单；Chromium 实测两个按钮 href 正确、点击上报 `mcp_install_click{client:"cursor"}` 入库；worker 解析通过、全站 JSON-LD 全解析、0 ASIN。
**预注册判定**：30 天内 `mcp_install_click` ≥5 而 `mcp_call`（非索引器，看参数是否雷同）仍为 0 → 问题在安装流程或客户端兼容，去查 deeplink 实际行为；两者都为 0 → 问题在没人知道这个服务器存在，回到发现层（目录收录/内容引流）；`mcp_call` 出现参数各异的调用 → 真实采纳，按既定规则扩工具集。

## 2026-08-13（第四轮 · owner 提问"整个站点还没有转化，是不是方向错了"）

**先把"没有转化"说准**：本站能测到的是点击，测不到成交（PartnerNet 后台在 owner 侧）。实测：D1 建库以来 **40 次 affiliate_click / 9 天**，好的两天点击率 30 % 与 46 %——**读者→点击这一环不但不弱，还是明显强项**。真正的问题在点击**之后**：`SELECT ... LIKE '%/dp/%'` 结果为 **0**，**40 次点击有 39 次带 link_url，全部落在 Amazon 搜索结果页**，没有一次落在产品页。原因是链条卡死：产品链接要 ASIN → 干净取 ASIN 要 PA-API → PA-API 要先有 3 单成交。于是我们在读者最想买的那一秒把他丢进一个列表，让他再选一次、再点一次，而 24 小时 cookie 从第一次点击就开始跑。
**据此的判断（不是"方向错了"，是"押错了变量"）**：内容/受众方向是对的且在起作用（Bing/DDG/Ecosia/Yahoo/ChatGPT 都在带人，AI 已因窗封与选型主题引用本站）；错的是**收入模型把成败押在最慢的变量（流量）上**——这一点 08-05 的 rebuild-strategy 已经写明，当时给出的转向（B2B 白标/内容包）**至今未执行**，因为它的第一步在德国法律下必须是电话或明信片，只能由 owner 做。所以现在有两条各自被卡住的路：Amazon 这条卡在**每个链接都落错页**，B2B 那条卡在**第一次合规接触**。
**本轮 ship（攻可控的那条）**：新增 `MODEL_ASIN` 映射 + `amazon_url(q, name)`，型号卡、顶部 pill、退出弹窗三处的链接改为**有 ASIN 就走 `/dp/<ASIN>?tag=`，没有就退回原来的搜索链**。表里现在全是空字符串，所以**本次上线后线上链接一个字节没变**（实测 product-page=0 / search=1780，与改动前一致）；格式校验 `^B[0-9A-Z]{9}$`，写错也自动退回搜索——**绝不臆造 ASIN**（编造的 ASIN 指向别人的商品，比搜索页更糟）。配套 `docs/amazon-asin-howto.md`：8–11 个型号各开一次产品页抄一串 ASIN，十分钟，之后每次部署自动生效。
**为什么这是当前最大的单点**：它**不需要更多流量**。其余所有杠杆（内容、排名、AI 引用）都是月级慢变量，而这个是把已经发生的 40 次点击的落点从"列表"换成"商品"。
**同时明确减投**：MCP 相关工作暂停——`mcp_call` 至今全是索引器、`mcp_install_click` 刚上线还没有数据，且**一次 MCP 调用与一次成交之间没有任何已验证的路径**；按上一轮预注册的判据等 30 天数据，不再每轮投入。
**给 owner 的三件事（按优先级，均不可代劳）**：① 核实 PartnerNet 付款/税务信息是否已填全——**没填全的话即使成交也不计入**，这是最便宜的一次检查；② 按 howto 抄 ASIN（十分钟，直接放大已有点击）；③ 若要走 B2B 那条，第一步是 20 次合规接触（电话/明信片），套件在 `docs/marketing/b2b-outreach-kit-2026-08.md`。

## 2026-08-13（第五轮 · owner "你自动用其他方法完成"）

**先说结论：ASIN 这件事我试了，结论是"不能自动做"，而不是"没做"。** 尝试用 WebSearch 从公开索引里取 ASIN：搜 `"PAC EX105" amazon.de /dp/` 返回的结果里，**同一个 ASIN `B0BZWP26GD` 同时挂着三个完全不同的商品**——PAC EX105 移动空调、PAC EX93（另一型号）、以及 **BabyDan 楼梯防护门**。也就是说搜索索引里的 title↔URL 配对至少两处是错的。amazon.de 本身在本环境被出口代理拦截（`EGRESS_BLOCKED`），**无法回源核实**；而从 CI runner 去抓 amazon.de 属于自动化抓取，违反 Associates 使用条款，**拿我们正要变现的账号去赌**——这与之前否决"嵌入商品图/评论"是同一类判断。填错一个 ASIN 会把买家送到别人的商品上，比现在的搜索页更糟，所以**宁可留空**。PartnerNet 后台核实与 B2B 首次合规接触同理：需要账号登录与电话/信件，我没有可替代路径。
**所以改做我一个人能做完、且同样指向"更多成交"的事：秋冬簇的深化。** 依据：制冷簇 60 页、供暖簇仅 13 页，且其中 **7 页是 `heizung-XX-qm` 系列、每页只有约 390 词**（全站均值 1100–1400）——而这个系列在 7 月就已实测有 **139 次展示/周**，是供暖簇里唯一有需求证据的资产；季节轮换 9/1 就翻页，现在是提前量窗口。
**ship**：扩写 `gen_heizung_qm.py` 模板（一次覆盖 7 页，FAQ 与 schema 由同一份数据生成、天然逐字一致）：① **按 Dämmstandard 的瓦数表**（60/80/100 W/m²，与 `infrarotheizung-watt-rechner` 和 MCP `heizleistung_watt` 是同一行公式，>2.000 W 自动给出两块面板的拆分建议）；② **整个采暖季的费用**，并把假设写在正文里（5 h/天 × 40 % 恒温器占空比 × 150 天 × 0,30 €/kWh），公式列出来让读者用自己的电价复算——不是测量，明说是假设；③ **16 A / ~3.500 W 电路上限**这个买家实际会踩的坑（多台并联跳闸、多面板要分电路）；④ 两条新 FAQ 由同一批数字派生。**每页 390 → 650–700 词，全部是可复算的内容，没有一句填充。**
**校验**：7 页 FAQ 各 5 条、schema 与可见文本**逐字零缺失**；全站 JSON-LD 全解析、0 ASIN 链接（`MODEL_ASIN` 仍全空，线上链接未变）；dateModified 随生成刷新为当天。
**方法论**：owner 不在时，"自动完成"不等于绕开需要凭证或需要人身的动作——绕开的代价是伪造或违约。能自动完成的只有内容与结构这条慢路径，那就把它做满。

## 2026-08-14（每日循环 v4）：内联工具零使用 → 改成"答案已经在那儿"，并给弹窗结案

**漏斗（D1；GA4/Supermetrics 仍鉴权失败）**：08-10→08-14 = 33pv/3c → 30/9 → 13/6 → **27pv/11c（本月最佳，点击率 41 %）** → 今日 1pv（UTC 早）。**08-13 的 11 次点击有 10 次在 EN 页**（Italy ×5、europe-heatwave ×4、tilt-and-turn ×1），只有 1 次在德语页——EN 区 25 页对 DE 区 103 页，却几乎承包了营收侧活动，这个结构性事实值得单独排期。`strompreis_api` 首次出现 **ok=1**：昨天把取数搬到 `/api/strom` 之后，真实访客侧也确认拿到了数据（此前该指标一条都没有）。
**两个预注册判定到期，都给结论**：
① **弹窗（EB_POPUP）**：累计 **51 view / 2 click = 3,9 %**，跨过 50 view 门槛。3,9 % 落在退出意图弹窗的常规区间内，且未见其挤占页面内点击（同期页面点击创新高）。**判定：保留，不改动，本项结案**——不再每轮盯它。
② **内联计算器**：`btu_calc` 历史上**只有 4 次，全部发生在 `/guide/btu-rechner.html`**；首页工具（08-06 上线）与 64 页指南 sizer（08-11 上线）**加起来零次**。样本虽小，但方向清楚：**来到计算器页的人是为了算，来到指南页的人要的是答案，不是表单。**
**ship**：sizer 改为**加载即出答案**——按页面自身的房间尺寸（`klimaanlage-25-qm` → 25 m²，或读者存过的房间）在加载时直接算好并显示，输入框从"门槛"变成"不对就改一下"。**埋点只记用户主动触发的计算**（自动渲染不上报，否则每次浏览都会变成一次假的"工具使用"）。文案同步改为"下面已经算好了"。这样对 100 % 的读者都产生价值：不点也能看到 BTU、对应机型和购买链接。
**校验**：Chromium 实测 25 m² 页加载即显示「ca. 8.500 BTU · Comfee MPPH-09CRN7」并带联盟链接，**自动渲染 0 条埋点**、用户点击后 1 条；改为 40 m² 后重算为 13.500 BTU；二次构建 byte-stable；61 个 sizer 块、全站 JSON-LD 全解析、0 ASIN、内联 JS 解析通过。
**下一步**：EN 区扩张排期（点击几乎全在那边，页数却只有 DE 的四分之一）；`mcp_install_click` 仍为 0（观察期内）。

## 2026-08-14（第二轮 · owner "把英文部分扩展"）

**先看 EN 区实际在赚什么**：全量 D1 里 EN 页 = **`best-portable-air-conditioner-italy` 6 pv → 12 次点击**（每次浏览 2 次点击）、`europe-heatwave` 13 pv → 6 次、`tilt-and-turn` 18 pv → 5 次；访客国家 HR/GB/LU/HU/LT/AT/EE/SI/SK/FR/US/IT/RO/CA/SG/CZ/JP。**EN 区只有 25 页却几乎承包营收侧活动**，而 DE 区有 103 页——扩 EN 是有数据支撑的，不是直觉。
**两个选题都先做了 SERP 判定（规则：先判定再写）**：① 「cool attic bedroom / top floor apartment」→ SERP 是 Quora / MetaFilter / Bogleheads 论坛加两三个小博客，**无权威站占位**，判定可写；且它对应站内已有的强德语页 `dachgeschoss-kuehlen`。② 「portable AC in a rented flat」→ SERP **全是美国内容**（俄勒冈州法、Fair Housing Act、美国房东博客），**欧洲角度完全空白**，而我们的 EN 访客几乎全在欧洲，且这个题目正好紧邻 EN 区第一转化页（tilt-and-turn 通风）。**另毙掉一个**：希腊国别页——SERP 确实空（只有 RTINGS/Forbes 的通用美国内容），但希腊本地家电零售（Public/Kotsovolos）才是真实购买路径，写"去 amazon.de 买"会不诚实，故不写。
**ship 两页**（各 1.320–1.340 词，站内标准结构）：`en/guide/cool-attic-bedroom-top-floor.html`（顺序法则：先从**外部**遮阳、只在室外比室内凉时通风、最后才制冷；顶楼选型要按"强日照"档加量；**先解决屋顶窗如何密封再买机器**）与 `en/guide/portable-ac-rented-apartment.html`（可逆 vs 不可逆的分界、押金真正的风险是**窗框上的胶带**而不是机器、电路与噪音、被拒绝时的替代路径；**明确写明这不是法律意见**，各国与合同不同）。两页与德语对应页互挂 hreflang（德语侧也已回填 `hreflang="en"`），并从 4 个既有 EN 页各加 1 条上下文入链。sitemap 143 → **145**，llms.txt EN 25 → **27**。
**过程中的一次自我纠错（记下来免得重犯）**：新页首次构建时 `EB_UPDATED` 与 `EB_TOPPICK` 会互换位置，导致第一轮与第二轮构建不一致。我改注入器想"修"它，结果引入了跨 100+ 页的换行漂移——**改动被回滚**。真相是：这不是 bug，是新页需要一次构建才落位（第二轮起 byte-stable，CI 每次部署都会跑注入器），**已验证 run2 == run3**。教训：先判断"不稳定"是收敛还是振荡，收敛就别动。回滚时用 `git checkout -- site/` 连带撤掉了同轮的 hreflang 与入链编辑，已重新施加并复核。
**校验**：两页 FAQ 各 4 条、schema 与可见文本逐字零缺失、hreflang 三条齐全；全站 JSON-LD 全解析、0 ASIN、Amazon 链接全带 tag；构建收敛后 byte-stable；Chromium 实测两页型号卡、加载即出答案的 sizer、TOC 与内链均正常。

## 2026-08-14（第三轮 · owner "调研工具订阅转型，联盟还没破单，用技能查一下"）

**调用 market-research 技能，按其格式产出 `docs/tool-subscription-assessment-2026-08.md`。结论：不转型——但理由不是维护旧模型，而是两个模型在当前数据下根本无法区分。**
**决定性的一条不是"0 成交"，是这条**：`/widgets.html`、`/fuer-betriebe.html`、`/tools.html`、`/mcp.html` 四个页面**历史总浏览量 = 0，一次都没有**。于是 `embed_copy`、`b2b_intent`、`lead_intent`、`outbound_choice`、`subscribe`、`share`、`mcp_install_click` 全部为 0 —— 这**不是市场说不要，是这个报价从没被人看见**。四个页面都在 sitemap 里、被 65–148 个页面的页脚链接着，不是发现性问题；是全站 25 pv/天，没人有理由点进 B2B 页。**这是本项目第三次"零指标其实是没触达"**，前两次分别是 MCP 调用与内联计算器，已记进方法论。
**外部调研（带来源）**：可嵌入计算器这个品类在我们这条细分里**市场价是零**——solaranlage-tipps / pv-berechnung / solar.red 都在免费送德语能源计算器（和我们做 widget 的动机一样：linkbait）；通用计算器搭建工具 involve.me $5/14/44、Calconic ~$19（含免费档）、ConvertCalculator ~$18，功能还更多；**唯一卖到 $55 的 Outgrow 卖的不是计算器，是线索**。而我们的配置器**已经把"结果按钮指向你自己的联系页"（＝线索捕获）免费送出去了**——把可收费的那部分送掉了，留下了免费的那部分。德国手工业者的付费能力是有的（2026 年光网站维护就按 ≥75 €/月计），但不会为隔壁免费的东西付费。
**同时把"没破单"放回正确的尺度**：约 50 次点击、**全部落在 Amazon 搜索结果页**（PA-API 未解锁），按常规转化率期望值**不到 1 单**；3 单大致需要 150–300 次点击。所以这不是模型被证伪，是**样本不够**。
**给出可证伪的期限，而不是继续凭感觉**：到 **2026-10-15**，若累计 affiliate_click ≥200 且仍 0 成交 → 转化假设被推翻，放弃联盟模型；若届时连 200 次点击都没有 → 被推翻的是流量假设，同样该换，但原因不同。工具订阅**搁置不埋葬**：`embed_copy ≥3` 或 `widget_view` 出现外部域名即重启评估。
**本轮不改站点**——研究结论正是"别在零数据上加更多 B2B 表面"，加了就自相矛盾。owner 侧优先级不变：①核 PartnerNet 付款/税务（2 分钟，决定成交是否计入）②填 ASIN（10 分钟）③再谈要不要打那 20 通电话。

## 2026-08-14（第四轮 · owner "联盟点击也不行，如何盈利？调研并实施"）

**先纠正前提**：点击这一环没有坏——9 天 ~50 次、好的两天点击率 30–46 %；坏的是量级（3 单需要 150–300 次点击）与落点（全落搜索页）。产出 `docs/monetization-decision-2026-08.md`：把 6 个盈利模型按"每千次浏览期望收入"换算——展示广告 1–3 € RPM（月收入 <1 €，复核维持否决）、Amazon ≈60–120 € RPM（已武装）、**电价切换引荐 Ostrom 17,50 €/合约（Awin 在售实测）+ Tibber 在 Awin（Merchant 57405）**、PV 线索 25–200 €（需注册）、工具订阅（昨日已搁置）、数字产品（需收款账户）。**结构性结论：所有模型 = 流量 × 每访客价值；没有一个在 25 pv/天下成立；所有高价值模型的开关（网络注册/KYC）都在 owner。** 我能自动做的＝把已武装通道做满 + 把最高每访客价值通道的需求先量出来。
**ship（实验 8：电价切换意向探针）**：radar 页正文提了 Tibber/aWATTar/Ostrom 三次却零链接——全站意图最贵的一页留着空手。新增诚实探针盒：Tibber/Ostrom/Rabot 三个普通链接（`rel="noopener nofollow"`，非 sponsored——确实没有付费关系），显著标注「keine Partnerschaft — wir verdienen an diesen Links nichts」，点击埋 `tariff_click{provider}`（worker 白名单 31 事件全过）。漏斗上游已在：50 个制冷页的 HEATENERGY 盒导向 radar。**预注册**：30 天 `tariff_click` ≥10 → 通知 owner 做一次 Awin 注册（Ostrom+Tibber 即刻武装，替换只改 3 个 href）；<3 → 撤盒证伪。诚实预期：radar 流量极低，探针可能先量出"流量不足"而非"意图不足"——那也是答案。
**校验**：check_events 31 事件全白名单；二次构建 byte-stable；JSON-LD 全解析；Chromium 实测三个 pill 的 href/rel 正确、点击 `tariff_click{provider:"ostrom"}` 入库。备注：radar 页近 5 轮内动过（08-13 功能修复），本轮为 owner 点名的营收实施，续用同一豁免并记录。

## 2026-08-15（每日循环 v4）：秋季第一个起量页在卖空调 → 修归属；里程碑 affiliate_click 49/28d

**漏斗（D1；GA4/Supermetrics 仍鉴权失败）**：08-11→08-15 = 30pv/9c → 13/6 → 27/11 → **27pv/2c** → 今日 2pv（UTC 早）。**里程碑达成：affiliate_click 28 天累计 49 次 ≥ 20（Step 4 预设阈值），且 08-11 起为去重后的干净口径。** 08-14 的新信号：① `/mcp.html` 历史第一次真人浏览；② **`fenster-beschlagen-innen`（窗户内侧结露=秋季主题）单日 3 次浏览**——雷达同日显示距 Herbst 18 天、提前 4 周窗口已开，秋季需求正在按日历启动；③ chatgpt.com 又引荐 4 次到 EN tilt 页。tariff 探针昨晚上线，尚无数据（正常）。
**本轮修复（与房车页/能源页同一缺陷类，第三次）**：`device_of()` 对 `fenster-beschlagen-innen` 落回 "ac"，于是这个除湿主题页顶着 **8 张空调卡 + BTU 定量器 + "正午制冷最便宜"盒 + 热浪气候盒**。修法两层：① `device_of()` 给 `beschlagen`/`taupunkt` 类 slug 归入 dehum（sizer/heatenergy/climate 三个 ac-only 组件随之自动剥离——注入器本就有自清理路径）；② `CONTEXT_MODELS` 给该页定制三卡：**Hygrometer（先测量，正文本就在链）→ Comfee MDDF-20DEN7（站内背书除湿机）→ Fenstersauger（品类卡，德国人对晨间结露的实际做法）**，副标题诚实写明"结露是湿度症状不是窗户问题"。
**校验**：受影响 slug 全枚举（仅此一页改归属）；卡片/顶部 pill 已换、sizer=heatenergy=climate=0；keller 页除湿卡不受影响；31 事件白名单、全站 JSON-LD 全解析、0 ASIN、二次构建 byte-stable。
**Step 4 提醒（owner）**：①里程碑 49 clicks/28d 已过线——**PartnerNet 后台此刻值得看一眼**：若付款/税务没填全，这 49 次点击即使转化也不计入；②今天 Frankfurt 38 °C=热浪峰值，`docs/marketing/` 分发稿窗口最后一天；③GSC/Supermetrics 重连仍挂起。

## 2026-08-15（第二轮 · owner "Amazon 热门品类调研 → 要不要加子站点"）

**调研（带来源）**：amazon.de 冬季热门品类实测构成——Heizlüfter（Dreo Atom 314 = 类目 Bestseller #1，deal 媒体 PCWelt/PCGH 高频推）、**Heizdecke**（t-online 专文推 Bestseller 降价，能源价格焦虑驱动）、Luftbefeuchter（Levoit/Homvana 走量）。竞争面：Heizlüfter/Luftbefeuchter 的 head 词全是 StiWa/MediaMarkt/immowelt/ETM 红海；**Heizdecke 的成本长尾（"Heizdecke Stromverbrauch"）SERP = giga.de 一家大媒体 + 一排 Jackery/Bluetti/Anker 厂商博客** = 与 ventilator-stromverbrauch 当年同构（该页现已真实产生点击），判定 PASS。
**子站点决定：不做。** 三条理由：①新域名/子域 = SEO 时钟归零 6–18 个月，而现有域名的全部资产（Bing 排名 + AI 引用）都绑在 Raumklima 主题一致性上，拆流量等于把 25 pv/天再切碎；②热门但离题的品类（气炸锅、Dreo 风扇）由 deal 媒体统治，新站零胜算；③"热门品类"应作为**需求过滤器**用在既有主题伞内，而不是拿供给榜倒推受众——与 08-06 Alibaba 轮同一方法论。**正确形态 = 站内子目录扩展**：「Amazon 热门 ∩ 本站受众问题」的交集。
**ship**：新页 `guide/heizdecke-stromverbrauch.html`（976 词，成本页模式）——2–5 ct/小时、0,24 €/夜、36 €/整冬（全部列式可复算）；核心角度是 SERP 上没人写的**"暖人不暖房"杠杆**：夜间室温降 2–3 °C × 每度 ≈6 % 采暖能耗 ≫ 整冬电费，并诚实给出 16 °C 下限（低于它墙面结露→直接内链刚起量的 fenster-beschlagen 页，秋季簇互联）。安全（Abschaltautomatik/不折叠/婴幼儿禁用）如实写。路由：`heizdecke/heizkissen` → heater 家族（ac-only 组件零泄漏）；卡片 = 品类三卡（Abschaltautomatik 决策优先，无公开测评共识故不具名型号）；3 条入链（heizluefter-stromverbrauch/strom-sparen/heizluefter-stromsparend）。蚕食检查：全站此前 0 次提及 Heizdecke。sitemap 145 → **146**。
**Luftbefeuchter 记录在案不写**：head 红海，长尾角度（"Luftfeuchte zu niedrig Heizung"）列入秋季队列待 SERP 判定——每天 ≤2 新页纪律。
**校验**：FAQ 4 条 schema 逐字零缺失、卡片/顶部 pill 正确、sizer=heatenergy=climate=0、二次构建 byte-stable、全站 JSON-LD 全解析、0 ASIN、链接全带 tag。

## 2026-08-15（第三轮 · owner "针对德国深化升级，打爆真实需求"）

**"德国真实需求"用数据定位，不靠感觉**：D1 里德语区**真正在转化的是 klimaanlage-XX-qm 钱页系列**（25-qm 昨天 2 次点击、30-qm 曾单日 4 次），德语搜索流量（bing/ddg/ecosia）也持续落在这里——而它是**全站最薄的系列：423–474 词**（全站均值 1100–1400），与昨天深化前的 heizung 系列同病。深化已验证的转化处 = 对"打爆真实需求"最直接的解释。
**ship（生成器一次覆盖 7 页，423–474 → 714–772 词，全部可复算）**：① **成本总览表**——1 小时 / 1 夜（8 h × 65 % 占空比）/ 1 个热浪月 / **"无窗封 = 最高 ×2"**（把全站反复讲的窗封教训直接标成价签），并链 Strompreis-Radar 的"正午便宜预冷"；② **按面积分叉的德国决策节**——≤25 m² = 卧室：50 dB(A) 上限、Silent 模式 vs 定时预冷两策略，链 schlafzimmer/bei-hitze-schlafen；≥30 m² = **Monoblock vs Split ohne Kernbohrung**：PortaSplit 压缩机在外=更静更效，链 portasplit-vs-monoblock 与 split-ohne-kernbohrung（后者 28 天 11 次浏览=德语第二热页，此前与钱页系列零互链）；③ **Für Mieter 节**——Monoblock 免打孔免房东同意，链 mietwohnung 页；④ FAQ 3 → **5 条**（夜间成本 + 按面积条件化的 dB/Split 问题，与 schema 同源生成天然逐字一致）；⑤ dateModified 随生成刷新。**型号推荐卡（转化主力）逐页确认原样保留、tag 完整。**
**校验**：7 页 FAQ 逐字零缺失、modelCTA 全在、sizer 各 1、全站 JSON-LD 全解析、0 ASIN、二次构建 byte-stable。
**克制说明**：该系列上次内容级改动是 07-16 的标题 CTR 修复（其后只有全站结构注入），不在 5 轮窗口内；且正是 owner 点名的方向。

## 2026-08-15（第四轮 · owner 一手走访："德国用户关心阳台光伏免打孔安装；且爱泡比价/评论网站"）

**这是 owner 的一手田野信息（Thiel"只有你能看到的秘密"），优先级高于任何二手调研——且与本站 DNA 完美咬合**：站内德语第二热页就是 `split-klimaanlage-ohne-kernbohrung`（28 天 11 次浏览），"ohne Bohren/租户友好"本就是全站最强模式；balkonkraftwerk 簇 5 页俱在，**唯独没有安装/固定页**。SERP 判定：`Balkonkraftwerk Halterung ohne Bohren` 排名的**全部是卖支架的商家博客**（Anker SOLIX ×2、yuma ×2、stecker-kraftwerk、energiesparfux、tazali、fachhandel）——零独立编辑内容，"诚实的跨家对比"正是空位。蚕食检查：站内 0 页覆盖。
**ship**：新页 `guide/balkonkraftwerk-ohne-bohren.html`（944 词）——①**四种固定方式对比表**（Gitterbalkon-Haken / Brüstungs-Klemme / Ballast-Aufständerung / 打孔墙装，按"适配栏杆类型×倾角收益×租户友好"三维，正是 owner 观察到的比价网站表格式）；②各方式的实操坑（量横杆间距与管径、**真正失败点是松动的栏杆本身**、混凝土压条要垫胶）；③**Windlast 诚实节**（板=帆、厂商限高即红线、斜装吃风、每年两次复紧、轻质板兜底）；④ **2024 年 10 月起 Mietrecht/WEG 特权条款**——房东原则上必须同意、只能就"怎么装"发言，而免打孔恰好拆掉其最强反对理由（标注非法律意见）；⑤ FAQ 4 条同源生成。商品 = 三张支架品类卡（各 30–40 €，Baumarkt 类目 6 %——**配件转化模式在站内早已验证**：窗封配件点击率 50–67 %）；4 条入链（wo-kaufen/standort-check/mietwohnung/klimaanlage-balkonkraftwerk）；CONTEXT_MODELS 覆盖 storage 默认电池卡（安装页卖支架不卖电池——"错穿外衣"缺陷第一天就不存在）。sitemap 146 → **147**。
**owner 第二个观察（爱泡比价/评论网站）的对账**：已对齐的（07-23 对标轮落地：✓/✕ 权衡行、价位徽章、信任条、面包屑、本轮的对比表格式）；**仍然做不到的**——真实价格与真实用户评论都需要 PA-API，而 PA-API 锁在前 3 单之后，这是结构性闭环不是懒惰。
**校验**：FAQ 逐字零缺失、卡片正确、sizer=heatenergy=climate=0、全站 JSON-LD 全解析、0 ASIN、二次构建 byte-stable。今天累计第 3 页新内容（heizdecke/钱页系列深化为改造非新页），仍守"新页 ≤2/天"？——heizdecke 与本页为今日两个新 URL，合规。

## 2026-08-15（第五轮 · owner "Intersolar 阳台储能火爆 + 德国补贴 + 美国推广"）

**判定**：储能簇（4 页）此前**零次提及 Förderung/Zuschuss**（grep 实测），而"补贴"正是 owner 走访与 Intersolar 热度共同指向的购买触发器——且它有一条别处没有的诚实钩子：**先申请后购买**（先开发票=补贴作废），这句话在下单前说才有价值。
**调研（带来源，2026-08）**：联邦层面无购买补贴、仅增值税免除（价内）；州级 MV/Sachsen/Hamburg/Berlin 等 300–500 €；约 20 个市级项目 100–500 €；常见 **+100 € 储能加成**；几乎所有程序要求**先批后买**。明确不做"每日新鲜补贴清单"——过期清单比没有更糟，页面如实指向 Finanztip 与读者自己的市政厅。
**ship**：① 新页 `guide/balkonspeicher-foerderung.html`（1043 词）：TL;DR、州/市/加成概览表（带时效性免责）、5 步申请顺序、**补贴×摊销表**（800 €≈8 年 → 500 €≈5 年，纯比例算术可复算）、租户权（2024-10 起 Steckersolar 入民法典特权目录）与轻安装（免打孔页互链）框架、4 FAQ 与 schema 逐字同步。② **储能设备级 sub-line 修复**：storage 家族模型网格此前沿用默认警句"Ohne dichte Fensterabdichtung…"（电池卡下方谈 monoblock 封窗=组件卖错话，同类缺陷第 5 次），改为储能自己的关键句"补贴 100–500 €，但几乎都要求先申请后购买"并链接新页——**全部 6 个储能页的购买时刻自动获得该提醒**（新页自身去自链）。③ 入链：rechner（摊销 FAQ 后）+ nachruesten（Lohnt-sich 章后）各 1 条正文语境链。**美国角度明确不做**：本站 EN 区链 amazon.de（美国读者无诚实购买路径），且美国阳台储能处于 UL/NEC 规则起步期、无可验证的联盟通道——记录在案，不为热点硬写。sitemap 147 → **148**。
**校验**：JSON-LD 解析、FAQ 4 条逐字、0 /dp/、tag 全带、内链全解析、组件各恰 1、重复 marker 全站 clean、run3==run2 byte-stable（run2 为已知一次性 settling）。

## 2026-08-15（第六轮 · owner "放首页 + 德/美设置 + 补贴工具 + 定位是否要改"）

**定位判断（书面答复）**：不整站 pivot——首页品牌线上轮已是 "Raumklima- **und Energie**-Ratgeber"（四季文案全带），缺的是首页权重不是定位；AI 引用/Bing 排名绑在主题一致性上，第 3 次重定位是本仓已记录的风险模式；储能簇转化样本还是 0，零数据 pivot = 拿 50 个观测换 0 个。**正确形态 = 储能升为共同支柱**（首页 + 工具 + MCP），伞不换。
**美国判断**：不建内容。EN 区链 amazon.de、美国读者无诚实购买路径；US 阳台储能处 UL/NEC 起步期、无已验证联盟通道。**条件触发记录在案**：owner 开美区 Associates 或 EcoFlow/Anker US 联盟后再议。
**ship 三件（一份数据、三个表面）**：① **Förder-Check 交互工具**嵌入 foerderung 页（16 州下拉 + 价格/预期补贴/年省输入 → 州级提示带 Stand 08/2026 + 摊销缩短计算；已知 4 州提示与页面表格逐字同源，其余州诚实说"无州级项目→查你的市政"；先申请后购买警告常显）。Chromium 实测：默认 8,0 年、Sachsen+300 € → 5,0 年与页表/MCP 一致、Zuschuss 钳制到价格、每次点击恰 1 条 `foerder_check` beacon（EV_NAMES 32）。② **MCP 第 9 工具 `balkonspeicher_foerderung`**（双语描述、5 组离线测试全过含 MV 别名与垃圾输入、响应带来源 URL + 披露），registry description 更新为含 "balcony solar subsidies"（97 字符，唯一可改字段），version 1.0.0→1.1.0 触发 CI 重发布（幂等）；mcp.html + .well-known/mcp.json 发现层同步。③ **首页入口**：sommer + herbst 季节 teaser 各加 💶 Förderung 条目（当季立即可见）。
**预注册判定**：60 天 `foerder_check` ≥20 → 补贴角度确认，扩 Förderung 内容簇；<5 → 不再扩。注：本轮修改了上轮新建的 foerderung 页——5 轮不动纪律被 owner 明示指令覆盖。
**校验**：byte-stable、全站 JSON-LD/重复 marker clean、TOC 自动纳新 h2、check_events 32 全白名单、worker node --check 过。

### 2026-08-15 追加：储能升为首页支柱（owner "储能内容与产品应该升到首页"）

**诊断**：储能簇有 10 个指南页，首页却只有 1 张通用瓷砖（链去 amazon 通用搜索）、**0 个具名型号**——全站客单价最高的品类在首页没有任何产品面。
**落地 `EB_HOMESTORAGE`**（幂等注入器，数据源 = `DEVICE_MODELS["storage"]`，与各储能页型号网格同一份）：首页新增「Strom speichern statt verschenken — Balkonspeicher 2026」板块 = 轻安装/租房定位说明 + **先申请后购买警告条**（链 Förder-Check）+ 4 条工具链（Rechner/Förderung/Standort-Check/ohne Bohren）+ **4 张具名型号卡**（Marstek Venus E / Anker Solarbank 3 / EcoFlow STREAM / Zendure SolarFlow 800 Pro，按 €/kWh 口径、诚实标未自测）+ 深度指南链。
**位置判断**：放在制冷型号网格之后、人群自检节之前（移动端 38% 处）——**不挤掉当季制冷 hero**（8 月热浪流量是当下唯一在转化的东西），但储能从"零产品面"升到独立板块。另两处提升：① 周更网格里的储能瓷砖 CTA 从"通用 amazon 搜索"改为**站内跳转 `#eb-speicher`**（先看具名型号+补贴提醒再出站，转化与诚实双赢）；② 全年指南列表补 3 条储能链接。
**埋点**：`storage_home{target}`（工具/补贴点击）+ 型号卡 `affiliate_click{source:"home-storage"}`。EV 白名单 33。
**校验**：Chromium 移动端实测板块存在/4 卡渲染/无横向溢出/瓷砖跳转命中/每次点击恰 1 条 affiliate_click；index byte-stable、全站 JSON-LD 与 marker clean、0 个 /dp/、0 个 img。
**预注册判定**：30 天 `source="home-storage"` 的 affiliate_click ≥8 → 储能支柱成立，扩型号页与国家/州级内容；≤2 → 板块下移或撤，回到纯制冷首页。

### 2026-08-16 owner 截图：Cloudflare AI Crawl Control（首次可见的 AI 抓取实况）

**owner 提供的新数据**（本环境此前看不到）：24 小时 **140 次 AI 爬虫请求**（环比 +7.7%），137 允许 / 3 失败，**首页是被抓最多的路径（27 次）**；按厂商 PerplexityBot **52 次**最多，其余 OpenAI（ChatGPT-User +2）、Microsoft BingBot、Anthropic（ClaudeBot +2）、Amazonbot。
**读数**：AI 爬虫量（~140/天）是人类访问量（~25–33 pv/天）的 **4–5 倍**——本站在 AI 侧的曝光面已经远大于人类搜索侧，这是过去半年 llms.txt / MCP / .well-known 三层投入第一次拿到外部实证。且 `ChatGPT-User`/`Perplexity-User` 属**用户触发抓取**（有人正在问、助手现场取页），与训练型 GPTBot 不同，是最接近"被引用"的信号。
**据此落地：自建 Markdown for Agents**（Cloudflare 该功能是 Pro 付费开关，本站在 free 档且开关关闭——但 Worker 自己能做，零成本）：`Accept: text/markdown` 时对 `/`、`/en/`、`*.html` 返回干净 Markdown（`Vary: Accept`），复用 `ratgeber_lesen` 的转换器；剥离 head/nav/footer/脚本/注入的商业组件，**保留标题层级与站内链接**（外链降级为纯文本，不让无上下文的表面输出联盟链接），尾部附来源与披露。转换失败或非 HTML 一律回落原响应，**浏览器永远拿 HTML**。
**两处实测抓到的缺陷已修**：① 首页无 `<article>`，原实现把整个 `<head>` 灌进正文导致标题重复——加 head 剥离（首页正是被抓最多的路径）；② 剥离导航后残留空列表项 `-`，已清理。
**埋点** `md_serve{ua}` 服务端写入（爬虫不跑 JS，客户端埋点看不到它们）——**这是本站第一次能测到"哪个 AI 厂商真的在读、读哪几页"**，查询见 `docs/analytics-first-party-d1.md`。
**CI 双向断言**：带 `Accept: text/markdown` 必须回 `# ` 开头；带 `Accept: text/html` 必须仍回 `<!DOCTYPE`——静默退回 HTML 会让这条通道无声失效。
**发现层同步**：llms.txt 新增 Markdown 协商说明（含可复制 curl 示例）+ 补上第 9 个 MCP 工具名。
**维持不做**：Managed robots.txt 保持关闭——它的作用是**声明内容不得用于 AI 训练**，而本站的整个策略正相反（robots.txt 逐个显式 Allow 了 GPTBot/ClaudeBot/PerplexityBot 等）。开它等于关掉自己刚测出的最大曝光面。
**待查**：3 次失败请求本环境看不到明细，owner 可在同一面板筛 `Unsuccessful` 看路径；若集中在某个路径我再修。

### 2026-08-16 MCP：生产验证 + 目录上架（owner "检查生产工具、官方注册、glama、awesome-mcp-servers"）

**① 官方 registry —— 已注册且已核实**（直接查 API，不是从日志推断）：`/v0/servers?search=hvac-btu-heat-klimaanlage` 返回 v1.0.0 与 **v1.1.0（Latest, active）**，描述含 balcony solar subsidies，remote = `https://getecoback.com/mcp/v1`。发布管线 `publish-mcp.yml`（OIDC 零密钥）改 `mcp/**` 即自动发版。**关键杠杆**：GitHub MCP Registry 是真正的 sub-registry，条目从官方 registry **自动同步**；而 Smithery/Raycast/MCP.so/PulseMCP 是平行目录，各需单独提交。
**② 生产工具检查 —— 新建并跑通**：`tools/mcp_smoke.mjs` + `mcp-smoke.yml`（按需/改 worker 后/每日 06:17 UTC）。对线上服务器跑 initialize + tools/list + **9 个工具各一次真实调用**，逐条断言答案含站内计算器会给出的那个数、且带来源 URL 与联盟披露。**run #2 全绿**：9 工具全部正确（含 `hitzewelle_vorschau` 实时返回「bis 32 °C in Frankfurt」——今天确实到热浪触发线）。写测试时先离线对拍，**当场抓到我自己写错的期望值**（20 m² 是 7.000 BTU 不是原始的 6.800，工具按站内计算器口径进位）——断言改为跟随已发布数字。顺带发现 `serverInfo.version` 还停在 1.0.0 与 registry 的 1.1.0 不一致，已对齐。
**③ Glama —— owner 动作，值已备好**：`glama.ai` 在本环境被 egress 代理拦截，且提交是网页表单不是 API。另外 Glama 的 repo 路径要求「服务器必须在 GitHub 上」，**本仓是私有的**，repo 路径走不通；**正确路径是 Connector**（面向已部署、有公开端点的远程服务器＝正是本站），无需测试凭据（服务器无鉴权），提交后默认公开、健康即可被检索。字段值见 `docs/mcp-directory-submissions-2026-08.md`。
**④ awesome-mcp-servers —— owner 动作，PR 文本已备好**：本 session 的 GitHub 权限只限 `f-tiger/rearchfuture`，`fork_repository` 对 punkpeye/awesome-mcp-servers 被拒（"not configured for this session"），跨 owner `add_repo` 亦不支持——fork+PR 只能从 owner 账号走。CONTRIBUTING 要求 fork→branch→改 README→PR；**该仓对自动化代理的 PR 标题带 `🤖🤖🤖` 会优先合并**。条目文本、分类、PR 标题见同一文档。
**诚实限制（需 owner 决策）**：awesome 列表惯例链接**仓库**，本仓私有故条目暂链公开文档页 `mcp.html`——对托管型服务器可接受，但弱于 repo 链接，且 Glama 的 repo 路径也因此关闭。要两边都干净，就把 MCP 部分作为独立公开仓发布（代码内无密钥，绑定在 Worker 配置里）。这是 owner 的决定，不是技术障碍——我不代为公开对方账号下的代码。

## 2026-08-16 日更 v4（漏斗归因修复）

**Step 1 漏斗（GA4/Supermetrics 鉴权仍挂 → 跳过，用自有 D1，28d 排除 CI）**：page_view 278 · heat_now 158 · popup_view 73 → popup_click **2**（关闭 38）· **affiliate_click 54**（里程碑 ≥20 早已过）· btu_calc 8 · widget_view 6 · video_play 5 · stromkosten_calc 2 · strompreis_api 1 · share/embed_copy/subscribe/site_search/seal_fit **全 0**。转化最强页 `/en/guide/best-portable-air-conditioner-italy.html`（7 pv → 12 次点击）与 EN 区整体继续跑赢 DE；`/` 41 pv → **0 次联盟点击**（本轮不动，上轮刚改过，守 5 轮纪律）。
**两处把我自己读错的数纠正了**：① toppick **不是**首页专属组件，指南页也有——所以首页确实零点击，不是归因错位；② `md_serve` 首日 4 条**全是 `curl/8.5.0`＝我自己的 CI 断言**，不是 AI 爬虫采用。第 ② 类错误（把索引器/自测当成第三方采用）本仓已犯过两次。
**Step 2 本轮优化＝让转化漏斗可归因**（v4 优先级 #1 的前置条件：漏在哪一环都指不出来，就没法改对 CTA）：诊断出 **54 次点击里 42 次无 source（78%）**，根因是 **114 个页面各自带一个手写的委托追踪器**，对任意 amazon 链接上报却只带 link_url。**不改那 114 页**（为一个遥测字段动全站正文＝高风险大 diff），改为在 `EB_TRACK` 加一层 **capture 阶段来源推断**：先于任何页级追踪器跑，按被点链接所在容器判定 `home-storage / toppick / models / ac-finder / grid / body`，**只填空、不覆盖已有 source**。Chromium 实测五种表面全部判对、每次点击恰 1 行（去重未破）。
**顺带修两处诚实性缺陷**：① `/api/strom` 无关——`serveMarkdown` 现在跳过 CI/curl/wget UA 的 md_serve 记录，deploy 探针改带 `-A getecoback-ci`，让这条指标从第一天起就只计真实客户端；② `mcp.html` 的 schema 还写着「acht Tools / 128 Ratgeber」，已改为 neun / 133（目录方会读这页）。

**Step 4 里程碑（本轮新发现，值得单列）**：28 天 referrer 构成 = duckduckgo 54 · bing 33 · **站内 29** · ecosia 15 · **chatgpt.com 8** · yahoo 10 · **copilot 3** · brave 2 · startpage 1。两条结论：① **google.com 引荐为 0**——现有流量几乎全部来自 Bing 系与独立搜索引擎，与 GSC 里长期 pos 10–98 的读数一致，说明 Google 仍未给量，而站点在 Bing 系已被稳定检索；② **AI 助手引荐 11 次（chatgpt 8 + copilot 3）≈ 全站 4%**，是 llms.txt / MCP / Markdown 协商这条线第一次在**访客侧**（而非爬虫侧）出现回报。战略含义：过去半年的优化默认以 Google 为目标，而实际到达的读者来自 Bing 系 + AI 助手——下一轮起把 AI 可读层与 Bing 侧收录当作主线之一，而不是附属品。

## 2026-08-16 竞对对比 → 信任层升级（owner "站点对比其他站点，升级更有吸引力"）

**先纠正问题本身**：本想按 v4 优先级修"首页 42 pv → 0 联盟点击"，查国别后发现方向错了——首页访客来自 **US/DE/FR/CA/CN/RU/GB**（含中俄），而**转化的指南页清一色德语区**（wohnmobil DE/AT/CH/LU→7 击、kippfenster AT/DE/CH→4 击、italy US/GB/IT→12 击）。首页那 0 次点击**主要是流量质量而非设计问题**（Cloudflare 面板亦显示首页是 AI 爬虫抓取最多的路径），真实读者从 DDG/Bing 直落长尾指南页、根本不经过首页。差点为机器人问题做 CRO 改版。
**竞对调研（WebSearch）**：德国比价站（Testsieger.de 等）的信任基石是**「评估方法完全透明」**，德国买家风险厌恶、要求可核实与彻底本地化。而我们**结构上打不过他们的价格表/星级/Testsieger 徽章**（Amazon 条款 + 无 PA-API + StiWa 授权），硬抄只会走向伪造。
**真正的差异化是我们已有却对读者不可见的东西**：每条推荐背后是**读者能自己重算的公式**，且这套算法今天起是开源、可调用、每日 parity 测试的。落地三件：① `wie-wir-empfehlen.html` 新增第 6 节「Rechenwege offengelegt」——6 条真实公式表（340 BTU/m²×日照、2×(B+H)、kW×价×负载、60/80/100 W/m²、Magnus、(价−补贴)÷年省）+ 开源仓链接 + 每日逐字符 parity 说明，并诚实写明「公式不能替代现场判断」；② **信任条文案从模糊改为可核实**：DE「So empfehlen wir →」→「**Rechenwege offengelegt →**」、EN → 「**Our maths is public →**」，锚点直达该节——**改的是既有元素、不新增盒子**（popup 73 露出仅 2 点击、38 主动关闭已证明读者拒绝增量元素）；③ 修一处会砸招牌的本地化缺陷：EN 页写着 "Our maths is public" 却链去整页德语——新建 `en/how-we-recommend.html`（英文全量方法论 + 同一张公式表），DE/EN 互挂 hreflang。覆盖 106 DE + 27 EN 指南页，sitemap 149。

## 2026-08-16 参照 agiscorecard 的 AI 引用数据优化本站

**owner 提供**：Bing Webmaster Tools「AI Performance」对 agiscorecard.com 的按页引用数——situational-awareness-**summary** 237、what-is-agi 91、how-close-is-agi 76、when-will-agi-arrive 37、…而**商业页 invest/cathie-wood 仅 6**。规律：**AI 引用"回答问题/下定义/做概览"的页，不引用卖东西的页**。
**先查我们自己的同类证据**（不靠类比推断）：D1 里 AI 助手引荐共 12 次 → `klimaanlage-kippfenster`(4) + 其英文对应页 `portable-ac-tilt-and-turn-windows`(3) = **7/12**；其余 best-portable-europe(2)、25-qm(1)、stinkt-schimmel(1)、**perplexity → unterschied-klimaanlage-lueftungsanlage(1，定义型页)**。与 AGI 的形状一致：被引的是"能不能/怎么办"的问题页，不是产品罗列页。
**落地**：给这对**已被证明被引用**的页加**可提取直答块**（本仓 ai-seo 方法论里记录过的最高价值元素，当初给 btu-rechner 用过；这两页此前只有叙述式开头，助手得自己概括）。内容全部取自页面既有事实：三种方案 + 推荐项、**长度公式 2×(宽+高) 与 60×140 → 4,00 m 的算例**、以及真正的失效点（高温下胶带脱落，能夹就别粘）。校验：算例与页内 EB_SEALFIT 计算器**同一算术**、块在首个 h2 之前、JSON-LD 解析、byte-stable。
**明确不做**：不照搬 AGI 的"概览页"打法去凭空造页——那边的 237 来自总结一份公开知名文档（Situational Awareness），我们领域没有对应可合法复述的原件（Stiftung Warentest 有授权限制）。硬造只会得到一篇无来源的空页。
**给 owner 的一条数据请求**（比我这 12 行代理数据强得多）：同一个 Bing Webmaster Tools 面板切到 **getecoback.com** 的 AI Performance，就能拿到本站真实的按页引用表与 Grounding Queries——那是决定下一批写什么的直接依据。

## 2026-08-16 Bing AI Performance 实数据 → 修掉引用量第一页的错配（owner 提供 getecoback.com 面板）

**这份数据推翻了我上一轮的判断。** 我基于 D1 里 12 次 AI 点击引荐认定 kippfenster 是 AI 引用核心并优化了它；真实引用表是：**klimaanlage-reinigen 109** > klimaanlage-40-qm 70 > klimaanlage-balkonkraftwerk 54 > en/fan-with-ice 29 > richtig-lueften 19 > 25-qm 18 = stromkosten-rechner 18 > tropft-wasser 16 > wie-viel-btu 15 > **kippfenster 仅 14（第 10）**。**点击引荐 ≠ 引用**——绝大多数引用不产生点击，代理指标偏斜近 8 倍。方法论：有真实引用数据时不要用点击反推引用。
**Grounding Queries（AI 用什么问题找到我们）**：`klimaanlage für 40 m2` 60 次 / 引用份额 **24%** / 意图 **Commercial**；`klimaanlage mit balkonkraftwerk betreiben` 39 / 13% / Learn-and-Solve / 主题 Energy Efficiency（**验证了储能与能源交叉簇的方向**）；`leenon 9l mobiler luftkühler reinigen` 11 / **份额 52.38%**（具体型号 + 清洁 = 我们拿走一半引用）；`klimaanlage in mietwohnung` 5 / 8.2%（份额低＝有余量）。
**最关键的发现**：**全站被引用最多的页（109）此前 0 次联盟点击**。原因是老缺陷的最严重一例——页面讲清洁，24 个 Amazon 链接却**全在卖新空调**。从助手那儿带着"我的机器怎么洗"来的读者**已经有机器了**。
**落地**：给 `klimaanlage-reinigen` 与 `mobile-klimaanlage-stinkt-schimmel` 加 `CONTEXT_MODELS` 覆盖，产品换成与任务匹配的**清洁剂 / 替换滤网 / 除垢剂 / 鳍片梳 / 湿度计**（全部按产品类型搜索，不伪造型号），并在 sub 行写明"到这儿的人已经有设备了，所以这里是清洁用品不是新机器"。TOPPICK 与型号网格同源，一并跟着换。
**没有一并动的两页（需逐页判断，不做无脑映射）**：`tropft-wasser`（16 引用）与 `kuehlt-nicht` —— 前者的真实解法常是摆放与排水而非购买，后者可能真该封窗或换更大机型；套用清洁品会是我凭空造需求。留作下轮按页面自身内容判定。
**给 owner 的读法**：`leenon 9l` 那条说明**具体型号 + 维护动作**是我们能拿到高引用份额的形状；而 `klimaanlage für 40 m2`（Commercial 意图、24% 份额）是最接近钱的查询，它落在 klimaanlage-40-qm（70 引用）。

### 2026-08-16 续：引用数据 → 转化深挖（owner "基于这个数据提升联盟/工具点击率"）

**发现**：面积系列**正文**推荐按尺寸选型（10→Comfee 9k、25→EX105、40→Klarstein 14000、50→PortaSplit），但页顶**第一个商业元素 TOPPICK 对所有尺寸展示同一组全局前三**——40/50 m² 页的 3 个芯片里 2 个是欠功率机型（9.000 BTU 对 40 m² = 物理上拉不动）。而 `klimaanlage für 40 m2` 正是引用份额 24% 的 **Commercial** 头号 grounding query，落点就是这页。诚实缺陷与转化缺陷是同一个。
**落地**：`qm_toppick()` 按面积档选芯片（≤15 / ≤25 / ≤30 / ≥40），全部用页面正文已背书的机型；≥40 的第一芯片是"Monoblock ab 14.000 BTU"能力档搜索（正文同款推荐），第二是 PortaSplit（正文自己论证的安静选项）。7 页验证：10 无 PortaSplit、40/50 无 9k 机型、tag 全带、无 /dp/。
**预注册**：源=toppick 且页面为 40/50-qm 的 affiliate_click，14 天内 ≥3 → 尺寸对齐有效，扩展到 heizung/luftentfeuchter 系列的 TOPPICK；0 → 无效结论记录在案。
**下轮候选（按引用量排）**：`klimaanlage-balkonkraftwerk`（54 引用，TOPPICK 仍是三台通用空调，正文真正卖点是"傍晚也能太阳能制冷"的储能——需按页面论证逐条选型，不套模板）；`richtig-lueften-bei-hitze`（19 引用，纯建议页无任何产品位，可能该保持纯净换取引用份额）。

## 2026-08-16 追加：第 3 大被引页的商品位与自身论证相反

**并行审计失败**：5 个审计 agent 全部撞会话额度上限，0 条发现，218k token 无产出。改为自查。方法论：workflow 不是免费的，额度耗尽时它比单线程更差——先确认额度再开并行。
**自查纠正一处我说错的话**：我在审计提示里称"qm 系列 toppick 已按面积"，实测 **40-qm 确实是**（Monoblock ab 14.000 BTU / PortaSplit / Klarstein），25-qm 用默认三件（PAC EX105 约 10–11k BTU，对 25 m² 合适）——该系列没问题。
**真缺陷在 `klimaanlage-balkonkraftwerk`（54 引用，第 3；对应 grounding query "klimaanlage mit balkonkraftwerk betreiben" 39 引用/13% 份额）**：顶部推的是三台通用移动空调，而该页 H2 明写「Die ehrliche Rechnung: 800 Watt gegen den Kompressor」与「Was NICHT funktioniert」——**页面在劝退，商品位在卖它劝退的东西**。同一缺陷类的第 7 例。
**按页面自身结论换商品**：Balkonkraftwerk-Speicher（该页"Mit Speicher: auch abends solar kühlen"的结论）、Energiekostenmessgerät（对应"先测你自己的机器再信任何计算，包括我们的"）、Ventilator（30–60 W，真正能被 800 W 全天带动的负载）。sub 行明说"配合上面的算式而不是与之矛盾"。

## 2026-08-17 大版本迭代：对抗式调研 → 破单导向的商品层重构

**方法**：3 个独立 agent 只被要求**证伪**核心论点 + 4 个扫描 + 综合。8 个全部完成（上一轮 5 个全挂在额度上限，这轮先查表再开）。
**论点**：里程碑是 **3 笔交易的计数**，不是收入 → 应最大化"每次点击的成交概率"，而非客单价；10 € 清洁剂与 1500 € 电池对破单**等价**。
**三条证伪都判"需修正"，且修正的是理由不是动作**：
- **规则层**：无最低订单额，计数确实与金额无关 ✅。但发现三条论点没料到的事实：① **退货/取消不计入**——德国 14 天撤回权下，500 € 空调可能被"计入后再撤销"，廉价耗材更"耐久"；② 2026-04-14 起商品须在点击后 180 天内**发货并付款**才算，与账号自身 180 天时钟并行 → 利好现货速发的小件；③ **搜索链接使全部销售成为"间接合格销售"**（德国 Vergütungskatalog 明文），费率低于直接销售——**仍计入 3 笔**，故里程碑不受影响，但"把人弄到 Amazon 就行"是费率盲的说法。④ **3 笔达成是触发审核而非批准，拒绝不可恢复**。⑤ SiteStripe **文字链在 3 笔之前就可用**，故 owner 手动取 ASIN 是合法一方使用（非抓取、非猜测）。
- **转化层**：**该策略已在最佳页面上跑过且在 0 成交记录里**——`klimaanlage-reinigen`（109 引用）本就有 17 条耗材链接，0 单。且 **2026-03-03 起 amazon.de 免运费门槛 39 €→49 €**，9 € 除垢剂结账变约 13 €（+40%），弃单风险高；而 300 € 空调轻松越过门槛。搜索链接对**通用耗材**比对**具名型号**更糟（40 瓶几乎一样 vs 一个正确答案）。
- **时点层**：**机制成立，靶子错了**。全站 95.5% 的引用面（400 次里 382）在制冷页上，两周内进入休眠；德国供暖季 **10-01 开始**（45 天）；空调保有率仅 ~19%（UBA 保守估 ~6%），而**霉菌影响 10–20% 德国家庭（约 430 万套住宅/年）**且正好在供暖季边界变急。AC 深度保养需求峰值在**季初**而非季末。
**据此落地（14 页，全部经既有 CONTEXT_MODELS 覆盖机制，一处改写型号网格/顶部条/退出弹窗三个面）**：① **窗封簇 5 页**（kippfenster/dachfenster/fensterabdichtung-klimaanlage/selber-bauen/abluftschlauch-verlaengern）——其中 `fensterabdichtung-klimaanlage` 与 `-selber-bauen` 此前**完全没有购买面**（SKIP_MODELS 过度修正），而它们自己的正文称窗封是"最常买的配件、决定一半制冷量"；② **AC 问题簇 5 页**（tropft-wasser/kuehlt-nicht/zu-laut/nachts-laufen-lassen/bester-luftkuehler）；③ **秋季簇 3 页**（granulat-oder-elektrisch/waesche-trocknen/luftentfeuchter-keller）；④ **ueberwintern**（唯一需求峰在 9 月的 AC 页）。价格带只在页面自身已给出时才引用，其余一律"Preis vor Ort prüfen"。
**顺带**：`device_of()` 无 cooler 分支导致 luftkuehler 页回落到 "ac"——查证后发现 `table.get(device) or table["ac"]` 使新增分支成为**死代码**，故不加分支，改在注释里写明原因；真正要紧的 `bester-luftkuehler`（52% 引用份额）已由 CONTEXT_MODELS 接管。
**校验教训**：我第一版校验用 `count("amazon.de") == count("tag=")` 报了 118 页"失败"——实为披露语也含 amazon.de，且 JS 拼接的链接静态正则看不到 tag。改为按链接、带 400 字符窗口校验后全站 clean。**差点把一个假警报当成真缺陷修**。
**判定**：证伪层给出明确 tripwire——若 9 月 30 日 `affiliate_click` 低于约 25/28 天，则任何页面改动都到不了 3 单，唯一剩下的动作是换流量来源而非继续改页。

## 2026-08-17 日更 v4（周一档）：英文镜像补齐 + 两条"增长"证伪

**Step 1 漏斗（GA4/Supermetrics 仍挂，用自有 D1；28d/7d 对比）**：page_view 322 / **7d 207**；**affiliate_click 66 / 7d 48 —— 有记录以来最高周频**；popup_view 82（click 5，仍是 6%）；btu_calc 12；stromkosten_calc 2；share/embed_copy/subscribe 仍 0。
**点击验真**（防止把机器人当增长）：7 天 48 次按国别 DE 18 · US 9 · GB 5 · LU 5 · CH 3 · IT 3 · NL 3 · PT 1，分散在多个不同小时与页面，非爆发式 → **是真实流量**；德语区占 26，非德语区 21。
**两条看似暴涨的指标，证伪为机器人**：① `md_serve` 4→**94**，其中 **90 条来自 `MCP-Cloud-AboutBot/1.0`，在 35 秒内扫了 30 个页面**（08-16 07:36:59–07:37:34）——是目录方收录抓取，不是 AI 助手读者；② `mcp_call` 50→**124**，集中在 08-16 03:58–07:02，**8 个工具各被扫一遍、参数几乎不变**，与我 08-16 提交 Glama 的时点吻合 → 收录/健康检查。**第三方真实采用仍为 0**。这是本仓第三次遇到同类误读，判定口径不变。
**Step 2 优化＝英文镜像**（v4 优先级 #1 转化断点）：`context_entries()` 此前在 `en=True` 时**硬返回 None**，导致昨天 14 页的配件改造**全部停在语言边界**——而非德语区贡献了 48 次点击里的 21 次。新增 `CONTEXT_MODELS_EN` + `CONTEXT_SUB_EN`，覆盖 7 个英文页：tilt-and-turn（13 引用）、window-seal（此前**零购买面**）、hose-extension、leaking-water、not-cooling、smells-musty、how-to-clean。沿用同一批 amazon.de 查询（tag 是德国计划的 tag，EN 区一贯链 amazon.de），角色/理由全部英文重写，标题改为 "What actually helps here"。校验：7 页均无空调残留、**无德语文案泄漏**、tag 全带、0 个 /dp/、全站 JSON-LD clean、byte-stable。
**Step 4 里程碑**：affiliate_click 7d 48（≥20/28d 早已过）；AI referral 与 share 未达标；`md_serve`/`mcp_call` 的涨幅**不计入**里程碑（机器人）。

## 2026-08-17 追加：来源×转化分析 + 联盟链接全站体检

**方法学纠错（先于结论）**：第一版来源→转化查询用 JOIN 把页面级点击按浏览次数扇出相乘，得出"chatgpt 11 次浏览对应 60 次点击"这种荒谬值。**那不是转化率**，已弃用；改为按页面直接对照 views/clicks。
**联盟链接体检（静态，全站 133 页）**：**1651 条 Amazon 链接、0 个空查询、0 个页面无购买面、0 个伪造 /dp/**。静态扫描报的 8 条"未带 tag"经逐条核实全是 **JS 拼接片段**（`&tag=` 在字符串后段拼上，前几轮已验证），真实未带 tag 数 = 0。**链接层健康，本轮无需修复**——缺口不在链接，在"有流量却没有对的东西可点"。
**来源画像（28d）**：direct 169（含爬虫）· duckduckgo 65 · bing 40 · 站内 36 · ecosia 21 · chatgpt 11 · yahoo 12 · copilot 4 · brave/kagi/startpage 各 1–2。**google.com 仍为 0**。搜索引擎侧全是 Bing 系与独立引擎。
**零点击缺口表**（views≥4 且 clicks=0，排除已在 08-16/17 修过的页）：`/` 45（爬虫为主，不动）、**`midea-portasplit-ausverkauft-alternativen` 11**、`ventilator-stromverbrauch` 5、`klimaanlage-zugluft-nackenschmerzen` 4；BTU 计算器/解释页（btu-rechner 5、wie-viel-btu 4、was-bedeutet-btu 4）按设计在 SKIP_MODELS，不计。
**本轮优化＝修 `midea-portasplit-ausverkauft-alternativen`**：这是全站**意图最强**的页之一（"畅销机断货，还能买什么"），却 11 次浏览 0 点击。原因是同一缺陷类的第 8 例——页面正文点名的替代方案是 **Clima Butler Split 2 (CB-3500)**（约 3,5 kW，Inverter）与 **Remko RKL-DC**（约 4,3 kW，据数据表），购买条却推 De'Longhi/Comfee 三台无关机型。改为按正文顺序给出：两个真替代 + PortaSplit 本体（正文写明 Midea 已把产能翻倍至 6.000 台/日，可用性每日波动）+ 窗封（正文的"选 Monoblock 立刻解决"前提）。**所有型号与数字均引自该页正文，无一处新增事实。**
**校验**：全站 1651 链接 tag 全带、0 /dp/、JSON-LD 全解析、无重复 marker、byte-stable。

## 2026-08-18 储能产品扩展评估：拒绝"加大容量档"，改修与自家计算器的矛盾

**任务**：owner 问"调研能源领域产品，包括德国 intersolar 的热门阳台储能，扩大储能类产品？"
**先查已有工作**：08-17 另一会话已完成 `docs/intersolar-transfer-2026-08.md`（把 §41a EnWG 动态电价、Solarspitzengesetz、§14a Modul 3 三条法规迁到 radar/两个 Rechner 页）与 `docs/PRD-energie-vertiefung-2026-08.md`（判决"不新建工具不开新板块"）。故本轮只做**产品层**，不重复法规层。
**市场调研（2026 公开对比，多源交叉）**：Intersolar Europe 2026 = 6/23–25 慕尼黑，新面孔 WattCycle/Marstek/Jackery/OUKITEL/Sigenergy；测试冠军 **Anker Solix Solarbank 3 Pro**（4.8/5，2.7–16 kWh，≈373 €/kWh）；**Zendure SolarFlow 2400 Pro**（heise 冠军，949 € 起，至 16.8 kWh，≈458 €/kWh）；**Marstek Venus E Gen 3.0** 5,12 kWh ≈999–1.099 €（≈215 €/kWh，价格标杆）；小型档 **Zendure SolarFlow 800 Pro** 1,92 kWh（TÜV）、**Anker Solarbank 2 E1600 Pro** 1,6 kWh（4×MPPT，可扩）、**Marstek SATURN-C B2500** ≈2,5 kWh。
**三门判定**：
- **数据门**：D1 全窗口，储能簇**人类流量近乎为零**——`klimaanlage-balkonkraftwerk` 1 次浏览（尽管有 54 次 Bing 引用）、`balkonspeicher-rechner`/`-foerderung`/`balkonkraftwerk-ohne-bohren` 各 0–1 次；`storage_home`/`foerder_check`/`outbound_choice`/`lead_intent` **全部为 0**。但 EB_HOMESTORAGE 仅 08-15 上线、首页 3 天约 8 次浏览 → **0 不能证伪，样本不足，不作结论**。71 次 affiliate_click 中储能占 **0**。
- **需求门**：市场需求真实，但**本站受众此刻不在储能页上**。
- **商业门**：3 笔"合格销售"是**计数**目标；1.000 € 储能单价高、德国 14 天撤回权下退货风险最高，而退货**取消合格销售**（08-17 已核实）。
**结论：否决"扩大容量档"**（不加 Solarbank 3 Pro / SolarFlow 2400 Pro 16 kWh 档）——加大容量正是往自家结论的反方向走。
**真正的缺陷（同一类第 9 例：最强产品位卖错东西）**：`DEVICE_MODELS["storage"]` 按 **€/kWh** 排序，头名是 **5,12 kWh 的 Marstek Venus E**；而本站 `balkonspeicher-rechner` 的公开算法**明写 800 W 阳台电站超过约 2,7 kWh 就不划算**。即：**首页与 9 个储能页的第一推荐，是我们自己的计算器判定为超配约一倍的产品**。€/kWh 只在容量可自由增长时才是正确排序键，这里"有用容量"被上限锁住，正确的键是**总价 × 适配容量**。
**落地**：`DEVICE_MODELS["storage"]` 按推荐容量带（1,6–2,7 kWh）重排——① Zendure SolarFlow 800 Pro 1,92 kWh「Sweet Spot」② Anker Solarbank 3 E2700 Pro 2,7 kWh「Obergrenze der Empfehlung」③ EcoFlow STREAM ≈1,9 kWh ④ **新增** Anker Solarbank 2 E1600 Pro 1,6 kWh「kleinste sinnvolle Größe」⑤ Marstek Venus E 保留但改标为「Nur wenn es mehr als Balkon ist」并写明超配事实。价格位改为**先报容量**（容量是厂商规格、可核实；总价一律"vor Ort prüfen"）；首页小字从"按 €/kWh 排序"改为"按真正划算的容量排序"；grid 副标题加一句指向 Balkonspeicher-Rechner（本页除外）。ASIN 表补两个新名。
**影响面**：首页 + 9 个储能页（含 growatt/wo-kaufen/nachruesten/winter-frost/standort-check/lohnt-sich-rechner），toppick 顶部条与退出弹窗随同一张表自动同步。
**校验**：JSON-LD 全解析、无重复 marker、tag 全带、0 个伪造 /dp/、两轮构建 byte-stable。
**预注册判定（2026-10-15，与既有判定日合并）**：`storage_home` ≥8/30d 仍不变；若届时储能页人类浏览仍 <20/28d，则**储能是引用资产而非成交资产**，产品位不再追加投入，只保留法规/计算器层的引用价值。

### 2026-08-18 01:40 UTC — CI 全线停摆（账号级，非代码）

上面的储能改动已推 main（`b4419e6`）但**未上线**。deploy run 368（push）与 369（dispatch）连同各自的 rerun **四次全部在 2–4 秒内失败**：无任何 step、无日志（logs 404）、`runner_id: 0` = **作业从未拿到 runner**。为区分"我的改动"与"账号问题"，另外手动触发了体量最小、与本次改动无关的 `heat-alert.yml`（run 13）——**同样 4 秒失败**。而 run 367（01:04，同一份未改动的 workflow 文件）成功。
**结论：本仓所有 GitHub Actions 作业在 01:04–01:36 之间开始无法分配 runner，属账号/平台级，与本次提交无关。** 最常见成因是私有仓的 Actions 分钟数用尽或 spending limit / 付款问题（GitHub 对此的表现正是"作业秒失败且无日志"）。沙箱到 githubstatus.com 不可达（000），无法核对是否同时存在平台事故。
**owner 侧动作（我无法代劳）**：看一眼 https://github.com/settings/billing 的 Actions 用量与 spending limit。分钟数恢复后，`b4419e6` 会随下一次 push 或手动 dispatch 自动上线，无需再改任何代码。
**影响面**：站点仍在跑 run 367 的版本；每小时 Routine、heat-alert、trend-radar、MCP smoke test 在恢复前**全部不会执行**——即自动化层整体静默，不要把这段时间的"无动作"误读为"无信号"。

### 2026-08-18 日更 v4：三个观测面同时失效 → 判定为"不做改动"的一轮

**本轮无代码改动，理由是三门规则的数据门无法满足，而非无事可做。** 现存四条观测/交付通道的实况：① **GA4/Supermetrics** 自 08-02 鉴权过期（长期已知）；② **Cloudflare D1 MCP 本轮开始 token expired** ——自建第一方埋点也读不到了（这是本仓第一次连兜底数据源也失效）；③ **GitHub Actions 自 01:30 起 runner 分配失败**，deploy run 368–373 连同 04:01 的 scheduled run 全部秒失败 = 既无法上线，也拿不到 CI 侧健康断言；④ 沙箱到 getecoback.com 出网本就受限（curl 000），无法直接验生产。
**据此判定**：此刻任何优化都是"看不到数据、验不了效果、发不出去"的三重空转，故按 CLAUDE.md 克制原则**不做改动、不空 commit**，只记录本条。
**最后一次可信漏斗快照（01:30 UTC 取自 D1，28d 窗口，供恢复后对照）**：page_view 372 · affiliate_click 71 · heat_now 193 · popup_view 86 / popup_click 5（5,8%）· btu_calc 28 · md_serve 97（其中 90 为 MCP-Cloud-AboutBot 扫描）· mcp_call 144（收录/健康检查）· video_play 6 · widget_view 6 · stromkosten_calc 2 · strompreis_api 1 · **share / embed_copy / subscribe / storage_home / foerder_check / outbound_choice / lead_intent 全为 0**。
**待上线队列（CI 恢复即自动带走，无需再改代码）**：`b4419e6` 储能卡按可用容量重排 + `73fa9c1` 停摆诊断。
**owner 侧最小恢复清单（三件，均无法代劳）**：① GitHub Actions billing / spending limit（决定能否上线，最高优先）② Cloudflare 连接器重新授权（决定能否读自有埋点）③ Supermetrics/GA4 重连（可选，D1 恢复后非阻塞）。

### 2026-08-18 05:20 UTC — 定时任务全面暂停至 2026-09-01（owner 指令）

**根因已定案（owner 提供 billing 截图）**：GitHub Actions 免费额度是**账号级共享** 2,000 min/月，8/18 已 **2,000/2,000 用满**，14 天后（9/1）重置；billable $0（一分钱没扣，全被赠送额度抵掉），Free 档 spending limit 默认 $0 故无法超额 → **作业在 runner 分配阶段直接失败**，无 step、无日志、约 3 秒。按仓库用量：**aitools $7.82（50%）› aistock $3.04（19%）› rearchfuture $1.90（12%）› sexweb $1.89（12%）› sunPredition $0.28**。**本仓不是原因**，且 CI 早已瘦过身（paths 过滤使 docs 提交不触发部署、8/6 已收敛为仅 main 触发、实测约 16 min/天）。

**已执行的暂停（两层）**：
1. **Claude Routines 停用**（enabled=false，9/1 恢复）：`trig_01V4WLUUMsSNmT8QKQzsjeYd` getecoback daily v4（0 5 * * *）· `trig_014SeiZdiyLPuxxJ3fpzjfNW` 白嫖计每日 v3（0 22 * * *）· `trig_013jTXnBC8ynCiTeTom9e2ZV` DollScout（0 1 */2 * *）· `trig_018xnCHHqLjXgLdPoL4eQuGs` agiscorecard daily（0 4 * * *）。**这一层才是真正推代码、触发 Actions 的源头**，光停仓库 cron 不停它们等于没停。另删除了 05:53 的 CI 复查一次性 Routine（根因已明，继续轮询是空转）。
2. **本仓 4 个 cron 注释掉**（提交 `ci: pause every cron schedule until 2026-09-01`）：deploy 自建（17 3）· healthcheck（0 5）· heat-alert（0 6）· mcp-smoke（17 6）。每处留 `# PAUSED until 2026-09-01` 标记。**注意这一层省不下分钟**（额度已为 0，失败作业本就不计费），目的只是避免 14 天里堆积约 56 次含义相同的红色 run。`workflow_dispatch` 全部保留、push-to-main 仍会部署，没有任何东西变得不可达。

**保留未停**：agiscorecard owner 每日提醒（纯手机提醒、不碰 CI）、两个周任务（周一档，非每日）。

**9/1 自动恢复已排**：`trig_0156svgw1f8BxzXRbc79ZiWi`（一次性，2026-09-01 06:00 UTC，自绑定本会话）——还原 4 个 cron → push → 确认 deploy 绿 → 确认 `b4419e6` 储能改动上线 → 确认季节轮换切到 Herbst → 重新启用 4 个 Routine → 提醒 owner 给 aitools 瘦身。**若届时本会话已回收、恢复任务落在新会话上，上面第 1、2 条就是完整的还原清单，照做即可。**

**季节轮换的坑（恢复时必看）**：deploy.yml 的每日 cron 正是 9/1 把首页切成秋季的机制。恢复动作本身是一次 push → 触发 deploy → 轮换器随之运行，所以只要 9/1 当天执行恢复，秋季切换不会错过。

**待上线队列（14 天不动）**：`b4419e6` 储能卡按可用容量重排 + 三条日志提交。线上仍是 run 367（`5619bb4`）的版本。
