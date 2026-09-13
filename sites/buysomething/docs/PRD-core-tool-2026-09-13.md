# PRD:把 SourceRadar 做成舰队的核心工具(2026-09-13)

owner 原话:「如果你是使用 SourceRadar,深度完善它,成为我们的核心工具与竞争力」+「你应该先做调研,完善 PRD,再动手」。
本文 = 调研 + PRD,**不含代码**。所有外部数字带日期与来源(§九);站内数字为 D1 现查。

## 〇、三轮 prompt

**第一轮(字面)**:「深度完善 SourceRadar,让它成为核心工具与竞争力。」
不可执行的原因:①「核心工具」要有用它的人——SR 上线 56 天真人 page_view **67 次**(D1 `sourceradar-events`,
08-22→09-13),`pick_open / out_click / calc_use / search_use` **全部为 0 行**;②「竞争力」对着的是谁——
Alibaba 自家的 **Accio 2026-03 已 1 000 万月活**,Accio Work($99/月起,2026-07)能自动询价、多轮议价、
代办 100+ 市场的 VAT/清关文件;Jungle Scout($29–299)的供应商数据库、Helium 10($99–279)的 24 个市场;
广告间谍 Minea/Sell The Trend/Kalodata($30–300)。**采购执行、供应商目录、广告情报三条线都有十亿级
数据的在位者,solo 舰队在这三条线上没有任何位置。**

**第二轮(以用户身份列需求)**:我是一个要从中国进一批货到美国/欧盟卖的人。下单前我要回答四个问题:
①**算完真实关税后还有没有利润**(2026 卖家最常见的错:按 FOB 算 50% 毛利,过关后只剩 15%);②**能不能合法卖**
(哪些认证、GPSR 责任人、供应商给的 HS code 是按出口优化的,不能信);③**这个品类最近有没有被召回或被 FTC/
CPSC 盯上**;④**需求是在涨还是在退**。SR 今天对四问的回答:①有页但**规则已过期**(见 §二);②有编辑手写的
「合规护照」,无官方来源、无日期;③**没有**;④有(Trends 动量 + 今天新加的 Reddit 重现)。
问题:需求清楚了,但没定「谁天天用」。

**第三轮(可执行,本文采用)**:
> 「SourceRadar = **进口一件商品到美/欧之前的中立判定层**,四问四答,每个数字带官方来源与日期,页面即问题,
> 全量机器可读(JSON + llms.txt + `/api/*`)。**第一个天天用它的人是舰队自己**:eco / tds 的联盟货架选品
> 必须先过 SR 的『关税栈 + 召回雷达 + 需求动量』三道读数,SR 因此有了一个不靠 Google 也存在的日活用户。
> 外部读者与 AI 引用是副产品。不做采购执行、不做供应商目录、不做广告情报、不做订阅墙。」

**砍掉的**(§七有理由):Radar Pro $29/月订阅、Sourcing Desk 代采、供应商数据库、TikTok Creative Center 抓取、
Keepa(€49/月)、ImportYeti(付费)、1688/抖音抓取、AI 生成选品文案、新子域。

## 一、现状审计(2026-09-13,D1 现查 + 仓内实测)

| 项 | 读数 | 含义 |
|---|---|---|
| 真人 page_view,56 天 | 67 | ≈1.2/天;来源结构此前已判为扫描器形态 |
| 互动事件(pick_open/out_click/calc_use/search_use),56 天 | **0 行** | 要么没人用,要么信标坏了——**先验证信标**(P0) |
| 页面 | 首页(31 张卡)+ landed-cost + is-alibaba-legit + sourcing-margins + demand-board(有门,未出) | 4 张问题页 vs eco 30+ |
| 数据集 | `data.js` 31 条人工策展;三层价/关税/MOQ **无日期无来源字段**(`grep -c source` = 5) | 差异化承诺的「三层价差」是编辑估算,不是数据 |
| 中国侧先行信号 | `chinaSignal` 为手写一句话;**无任何中国侧管线** | 战略简报的核心承诺没有实现 |
| 西方侧信号 | Trends 动量(每日,keep-last-good)+ rising + 09-13 起 Reddit 重现/wish/Ask HN | 这一半是真的 |
| 机器面 | llms.txt / sitemap / `/api/pop` / `/api/pulse` | 无 picks.json,无逐品 JSON |
| 关税页 | `landed-cost`:「postal $80–200/件、courier 54% 或 $100」,标 Aug 2026 | **已过期**,见 §二 |

## 二、外部事实(全部 2026,带日期)

1. **关税规则变了,SR 的核心页没跟上。** 美国最高法院 **2026-02-20** `Learning Resources v. Trump` 判 IEEPA 不授权
   总统加征关税,IEEPA 下的「对等」与芬太尼关税作废;**Section 301(对华 7.5%–100%)与 232 不受影响仍生效**;
   **de minimis 暂停不靠 IEEPA**,靠 Section 321 + TFTEA 的行政裁量,继续有效;CBP **2026-06-24** 在 Federal Register
   发布两份规则,把 de minimis 暂停做成无限期(邮政 + 非邮政两份);**邮政包裹的按件固定税选项 2026-02-28 到期**,
   之后只按从价计征。→ `landed-cost` 页的「$80–200 固定税 / 54% 或 $100」三条口径**至少两条已失效**,而页面
   标注「as reported, Aug 2026」——它引用的是二手贸易指南,不是 Federal Register。**P0:重写为官方来源版**。
2. **官方数据源免费可达,且没有竞品把它做成面向卖家的免费机器可读层**:
   - **USITC HTS REST API**(`hts.usitc.gov/reststop`,免鉴权,JSON 搜索/导出,按 release 版本)——每个品类的
     基础税率与章节;S301 清单另有 USTR 公开 HTS 列表。
   - **CPSC SaferProducts.gov REST**(免鉴权 JSON:产品、危害、补救、零售商)——召回与投诉。
   - **EU Safety Gate 公开 JSON API**(无需登录)——欧盟周报召回。
   - 以上三者在 runner 的可达性**未实测**(沙箱出网受限),PRD 第一步就是探针。
3. **卖家的痛在「算错」与「信错」**:2026 卖家指南反复出现的两条——按 FOB 算毛利忽略关税栈(50% → 15%);
   **供应商提供的 HS code 按中国出口优化,不能直接用于美国进口申报**,误报有罚则。这正是「中立判定层」的活。
4. **竞品都在卖执行或情报,没人卖「可核对的判定」**:Accio(执行,10M MAU,$99/月起)、Jungle Scout/Helium 10
   (Amazon 数据,$29–399)、Minea/STT/Kalodata(广告与 TikTok 情报,$30–300)。它们的共同点:数字不带来源,
   不可复核,且都不是中立方(Accio 是阿里的)。

## 三、用户与场景(按「谁真的会用」排序)

1. **舰队自己(日活 1,保证存在)**:eco 的 Preis-Engine / 秋冬货架重选、tds 的 Labubu 选品,在把一个 ASIN 或品类放上
   联盟货架前,读 SR 的三道读数:该品类**美/欧关税栈**(只影响进口卖家,对联盟无直接影响,但决定「这个品类的白牌
   会不会大量涌入压价」)、**召回/执法雷达**(**直接影响联盟**:推荐一个被 CPSC 召回的品类是责任与信誉事故;
   eco 站 08-28 已有「品牌黑名单 EcoFlow」的先例,现在可以由数据给)、**需求动量**(已用)。
   → 这一条把 SR 从「给别人的站」变成「舰队的仪器」,是 PRD 的锚。
2. **外部进口卖家**(FBA/Shopify/TikTok Shop,US/EU):四问四答的问题页;通过搜索与 AI 引用到达;零编造 + 带来源
   是他们在别处拿不到的。
3. **AI 系统**:每个判定页附 JSON 与来源,`llms.txt` 索引;这是舰队已验证的分发面(agi 33–37,5% 引用份额)。

## 四、功能规格(P0 → P2;每项带验收与自检)

### P0(先测量、先纠错、先探路;不加页)
- **P0-1 信标真值测试**:deploy 自检里 POST `/e` 一条 `ci` 标签事件并断言 D1 端点能读回(`/api/pulse` 或新加
  `/api/selftest`),连续 56 天 0 事件必须先排除「测不到」。验收:自检能红。
- **P0-2 `landed-cost` 重写为官方来源版**:规则 = HTS 基础税率 + S301 附加(按 USTR 清单)+ 232(若适用)+
  de minimis 暂停(FR 2026-06-24)+ 邮政从价(02-28 起);删除 IEEPA 时代口径;每条规则一个官方链接与生效日;
  计算器输入改为「HTS 章/品类 + 申报价 + 数量」。验收:页面内不再出现「54%」「$100 flat」「$80–200」除非在
  「已失效」小节;自检断言这三个字符串只出现在 `class="expired"` 块内。
- **P0-3 官方源探针**:runner 上一次性 GET 三个端点(HTS reststop search、CPSC SaferProducts、EU Safety Gate),
  记 `data/sr-source-probe.json`(状态、类型、字节),**200 才进 P1**。
- **P0-4 数据集加来源与日期**:`data.js` 每条 pick 的 price1688 / priceAlibaba / retailPrice / tariffUS / moq 加
  `{asOf, source}`;没有的标 `editorial-estimate`;`tools/validate_picks.py` 在 deploy 里断言字段齐全,并把
  `editorial-estimate` 的比例打印出来(第一版预计 100%,这是诚实起点)。页面上无来源的数字显示「编辑估算」。

### P1(核心工具本体:官方数据 → 逐品判定;仍不加订阅)
- **P1-1 关税栈护照**(`tools/duty_passport.py`,每日随 deploy):每条 pick 一个 `hts` 候选章节(人工定,写明
  「候选,非报关依据」)→ 从 USITC API 取基础税率与 release 版本 → 对照 S301 清单 → 输出 `site/passports.json`
  与卡片上的「关税栈(截至 <release 日期>)」。验收:任一 pick 的税率与官方导出不一致 → 自检红;API 失败 →
  keep-last-good 并标 STALE(>14 天红)。
- **P1-2 召回/执法雷达**(`tools/recall_radar.py`):按 pick 的品类关键词查 CPSC + Safety Gate 近 365 天,输出
  `site/recalls.json`(件数、最近日期、危害类型、官方链接);卡片显示「近 12 个月召回 N 起(CPSC n / EU m)」;
  **≥1 起且涉及同结构(如立式旋转猫砂盆)→ 卡片自动标『风险』并写进 risks**。这一项同时供 eco/tds 读
  (P1-4)。验收:用已知召回品类(儿童 AI 玩具、立式猫砂盆——08-22 证伪表里有先例)做夹具,必须命中。
- **P1-3 逐品 JSON + 问题页生成**:`site/picks/<id>.json`(全字段 + 来源 + 日期)与 `/picks/<id>` 问题页
  (「Is <product> worth importing to the US in 2026?」形状,由 `gen_pick_pages.py` 生成,不手写);sitemap /
  llms.txt 自动登记;每页 FAQ schema 只用页内已有数字。验收:生成器 selftest 断言无未注明来源的数字进入正文。
- **P1-4 舰队内部消费(锚)**:eco 的货架重选与 tds 的选品脚本读 `recalls.json`——**命中召回的品类不上联盟货架,
  并在各自 CLAUDE.md 记为规则**;heartbeat 断言 `recalls.json` 不超过 14 天。这一步让 SR 每天至少被一个真实
  流程读取。

### P2(只在 P1 判定线达标后)
- **P2-1 EU 侧关税**(TARIC 公开数据)与 GPSR 责任人清单;**P2-2** 「is <category> recalled」问题页簇(按
  CPSC 高频品类);**P2-3** 需求×供给×风险的综合评分替换 `trendScore` 的编辑值。

## 五、非目标(本 PRD 明确不做,别再提)
订阅/付费墙(读者 0 时是为不存在的消费者建供给,08-31 已裁)、代采/资金流(FinCEN §1960 风险,07-legal)、
供应商数据库(Jungle Scout 的护城河,不可复制)、TikTok/抖音/1688/小红书抓取(ToS 与断供,04-datasources 已评)、
付费数据源(Keepa/ImportYeti/TikHub;先用免费官方源证明形状)、AI 生成商品文案、新子域、中文镜像。

## 六、判定线(预登记,进 `data/fleet-bets.json`)
- **P0 完成日 +28 天**:信标自检绿 ≥ 28 天且 `landed-cost` 官方版上线 → 进 P1;信标坏 → 先修再算。
- **P1 上线 +28 天(预计 2026-11-15)**:①`recalls.json` 被 eco/tds 流程读取 ≥20 次(CI 日志计数)——**这是「核心
  工具」的定义性指标**;②任一 `/picks/<id>` 或 `landed-cost` 出现搜索/AI 引荐 ≥3;③`calc_use` ≥5。
  ①必须成立,②③任一成立 → 进 P2;①不成立 → SR 连舰队自己都不用,降为最低维护并把结论写进 CLAUDE.md。
- 官方源任一 >14 天取不到 → heartbeat 红;不换源不伪造。

## 七、风险与边界
- **HS 归类是判断不是查表**:页面与 JSON 必须写「候选章节,非报关依据,以持牌报关行为准」;误导性遗漏是
  FTC §5 / UCPD 风险(07-legal §三)。
- **召回数据的负面陈述**:只转述官方记录(机构、日期、链接),不做因果推断;品牌名只做指称性合理使用。
- **规则再变**:关税页每次 deploy 自检比对 USITC release 版本号,版本变了页面必须同日重建(生成器,不手改)。
- **零读者的诚实**:P1 的价值先由舰队内部消费证明;对外流量不是本 PRD 的承诺。

## 八、成本
P0/P1 全部零 AI、零新 cron(挂 deploy-buysomething 每日 05:20 与 heartbeat);官方 API 每日 ≤100 次请求;
预计每次 deploy +1–2 分钟 ≈ 45 分/月(公开仓免费)。

## 九、来源
- Accio 10M MAU(2026-03)、Accio Work $99/月(2026-07):[Digital Commerce 360, 2026-03-24](https://www.digitalcommerce360.com/2026/03/24/alibaba-international-announces-ai-agent-fleets-via-accio-work/)、[Digital Commerce 360, 2026-07-24](https://www.digitalcommerce360.com/2026/07/24/alibaba-accio-work-agentic-ai-b2b-sourcing/)、[thesoftwarescout.com](https://thesoftwarescout.com/accio-work-review-2026-alibabas-ai-sourcing-agent-tested/)
- Jungle Scout / Helium 10 2026 定价与差异:[helium10.com](https://www.helium10.com/blog/helium-10-pricing-plan-vs-jungle-scout-pricing-plan-jan-2026-update/)、[sellerforge.ai](https://www.sellerforge.ai/blog/jungle-scout-vs-helium-10)
- Minea / Sell The Trend / Kalodata 定价:[dodropshipping.com](https://dodropshipping.com/best-dropshipping-product-research-tools/)、[adnosaur.com](https://adnosaur.com/blog/minea-vs-kalodata)
- 卖家痛点(FOB 毛利错算、供应商 HS code 不可信):[speedwaymedia.com, 2026-09-03](https://speedwaymedia.com/2026/09/03/what-every-amazon-fba-seller-should-know-about-post-2025-customs-compliance/)、[sellersprite.com](https://e.sellersprite.com/en/blog/amazon-tariffs-2026-fba-sellers-guide)
- SCOTUS IEEPA 2026-02-20;S301/232 仍有效;de minimis 另有法源:[Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/02/supreme-court-strikes-down-ieepa-tariffs)、[WilmerHale, 2026-02-20](https://www.wilmerhale.com/en/insights/client-alerts/20260220-supreme-court-strikes-down-ieepa-tariffs-what-now)、[CRS LSB11398](https://www.congress.gov/crs-product/LSB11398)、[Supply Chain Dive](https://www.supplychaindive.com/news/de-minimis-status-supreme-court-trump/812785/)
- de minimis 无限期暂停两份规则(2026-06-24)与邮政固定税 02-28 到期:[Federal Register 2026-12670](https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other)、[Federal Register 2026-12669](https://regulations.justia.com/regulations/fedreg/2026/06/24/2026-12669.html)、[gettransport.com](https://blog.gettransport.com/logistics-guide/us-de-minimis-suspension-2026-importer-status-guide/)
- USITC HTS REST API(免鉴权 JSON):[USITC 用户指南 PDF](https://www.usitc.gov/documents/hts/hts_external_user_guide.pdf)、[usitc.gov](https://www.usitc.gov/faq_subsection/querying_and_downloading_data)
- CPSC SaferProducts.gov REST 与 EU Safety Gate 公开 JSON(第三方整理,官方端点待 runner 探针确认):[apify.com/datadeltas](https://apify.com/datadeltas/recalls-monitor/api/openapi)、[apify.com/devilscrapes](https://apify.com/devilscrapes/cpsc-product-recalls-scraper/api/openapi)
