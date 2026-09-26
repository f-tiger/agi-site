# CLAUDE.md — thedollscout.com / TDS Document Scout

## 2026-09-25 收件人核验迭代

版本2026-09-25.8，39个生成页面，24项测试。`/verify-file`及DE/ZH提供SHA-256+字节数参考链接、本地比较、网站嵌入链接和独立离线CLI；不依赖D1。交付记录每个文件可复制收件人链接，HTML导出附核验入口。URL片段不含名称或备注，统计不得接收指纹；不得称为身份、收件、验收或Bitcoin证明。共享PDF脚本只绑定`#workspace`下文件输入，避免干扰其他工具。新增匿名事件不是用户、留存或营收。第二轮路线与传播门槛见根目录`docs/tds-consensus-growth-2026-09-25.md`。


## 2026-09-25 月收入目标与交付实验

Owner 明确要求主动探索工具、共识和金融机制，目标月营收1万以上。未指定币种：当前模型按人民币，另列美元情景。见根目录 `docs/tds-consensus-revenue-2026-09-25.md`、站内 `.agents/product-marketing.md` 和 `docs/delivery-experiment-2026-09-25.md`。

- 新增 `/delivery-evidence` 及 DE/ZH：本地文件指纹、来源备注、JSON/HTML导出与文件核对。开放记录格式不是收件、同意、作者身份或可信时间证明，没有Bitcoin锚定。保持现有首页与PDF工具；不再先推倒整站。
- 79美元/月团队功能仅为明示调研概念，未建成、不能购买。匿名预算/频次答案不是订单。既有会员隔离不变。
- `doc_delivery_sample` 排除于真实动作；`doc_delivery_interest_*` 仅固定类别。不要把动作当独立客户。
- 版本2026-09-25.7，36个生成页面。静态页验证与D1计量验证拆开：`verify.mjs --live --skip-events`、`verify-events.mjs`。工作流仍保留失败，只允许已验证页面的IndexNow通知不受无关会员/计量故障阻断。
- 后续D1诊断已返回 `daily_limit`，不是把失效计量当成零流量。统计采用单次分组查询＋成功聚合5分钟缓存；`x-probe`绕过缓存，失败不缓存。缓存不能恢复已耗尽额度；不要静默开通Cloudflare付费计划。
- GSC Wizard已确认连接，但本会话未暴露查询方法；当天runner仍缺GSC/GA4凭据。未取得搜索数据前，不断言收录问题已解决。

## 当前方向：2026-09-25 文档工具转型（owner 明确授权）

Owner：「为什么一定是收藏品，整个站点方向不对就该转型」→「按照调研优化后，落地到tds，整个站点可以起来流量」。本节替代下方历史收藏品定位和扩张限制；2026-09-25 owner 再次要求新工具沿用 TDS 风格，视觉继续采用原站 Swiss 电商白、黑字和红色强调；退役内容守卫、隐私、来源诚实、会员隔离与部署防回滚要求继续有效。

- 品牌：TDS Document Scout；用户：发布或交付 PDF 的内容团队、制作人员、顾问。首个可验证任务是交付前批量预检和审查记录。
- 当前可用：PDF 元数据/结构/文本预检、10 文件批量审查、分页文本提取、两个 PDF 文本比较。全部免费，文件仅在浏览器处理。不是 OCR、标签修复、视觉比较或 WCAG/PDF/UA 认证；不把趋势信号称为商业验证。
- 默认语言为英语（2026-09-25 owner 明确要求）。无语言前缀的 `/` 是 TDS 主首页；中文和德语只通过显式语言切换访问。站点标识、可见 Home 导航、页脚首页入口及面包屑 Home 均返回 `/`；手机端保留可见首页链接。不要再给 owner 默认发送 `/zh/` 预览链接。
- 首页和核心入口 EN/DE/ZH，`scripts/documents/copy.mjs` 为文案源，`build.mjs` 生成 33 页、示例、sitemap 和两个 llms 文件。页面与工具源需一起提交。PDF.js 6.3.289 锁在 package-lock，Node 24；vendor 不入 git。
- 开发：`npm ci --prefix scripts/documents --ignore-scripts` → `npm test --prefix scripts/documents` → `node scripts/documents/build.mjs` → `node scripts/documents/verify.mjs`。沿用根仓部署 workflow；旧 workbench 后再运行文档生成器到 dist，防止旧收藏品推荐回到首页。
- 收藏品 URL、数据、历史 MCP 和独立会员继续可用，由 `/collectors` 链接。勿把旧会员包装成 PDF 付费能力。`gen-collector-pages.mjs` 不得再改文档首页。不要在新首页运行旧 `build-llms-full.mjs`。
- 新计量只看 `/api/document-stats`：动作数非人数。自带文件完整处理、部分处理、示例、CI 分开；原 PV 口径和 09-23 QA 不能并入新方向。新事件不给旧 `ev=''` 加行。部署以 `/__ci/documents` 写入并回读验证 D1；浏览器 QA 必须 `?ci=1`。
- 视觉共用 `css/brand.css`：白底 `#fff`、黑字 `#111114`、红色 `#e4002b`、Helvetica 字体、1080px 内容宽度与圆角按钮。文档页、原有内容、TDS 工作台与会员页都消费它；禁止另起蓝绿主题。样式变更须同步图标、分享图片和缓存版本。
- 统一样式/SEO/分享：见 `docs/document-experience-2026-09-25.md`。新页使用文档生成器和 `experience.mjs` 共用文案；摘要分享严格白名单，不含文件标识或正文。`doc_share` / `doc_summary_share` 只表示复制或设备分享交接，`doc_share_visit` 是带固定来源标记的访问，不是独立用户或实际消息送达。
- 每日既有 `tds-traffic.yml` 保存 `content/document-metrics.json`，不新增 cron。趋势种子换为 pdf accessibility / pdf remediation / compare pdf，仍共享原配额。不要用旧 Labubu 趋势扩张新站。
- 增长与商业判定：见 `docs/document-scout-release-2026-09-25.md`、根仓 `data/fleet-bets.json` 的 `tds-documents-1023`。访问不足先解决分发；动作达标后仍须核实重复任务、独立买家和实付，才定义收费层。

以下为历史定位记录，不构成禁止本次转型的新指令。

## 2026-08-30 重大转向(owner 原话:「下架掉这个站点,风险太大,更换为卖labubu的站点」)

- **旧站(18+ 成人 doll 导购)整体下架**。归档 = git 历史 + 旧私有仓 f-tiger/sexweb;
  旧页面线上一律 404,deploy 自检会断言这一点。**不要从 git 历史恢复任何旧页面。**
- owner 同轮确认:**复用本域名与全部基建**(Cloudflare Pages 项目 dollscout、D1
  `dollscout-events`、GA4、IndexNow key),商业模式 = **联盟导购**(不自营、零库存)。
- 旧站的安全楔子判定线、快反规则等条目随站废止;可复用的方法论已沉淀在下方。

## 定位(2026-08-30 当日修正,owner:「真假不应该是最核心痛点,应该是流行和稀有程度」)

Labubu / The Monsters 收藏品的**稀有度优先导购站**:核心痛点 = 流行与稀有
(哪个系列热、隐藏款多稀有、我的抽盒概率到底是多少),真伪核查降级为支撑板块
(逻辑衔接:越稀有越多假货)。evidence-standard 基因不变——稀有度恰是零编造的
完美题材:**隐藏款概率印在盒子上**,我们只做有源转述 + 纯数学工具。
- 旗舰页 /rarity(+/de/rarity):概率表(多源,标注「盒上印刷值为准」)+
  **Secret Pull 计算器**(独立抽取模型,诚实标注与整箱配比的差异;埋点
  odds_calc 只记真实交互,不记页面加载)。
- 首页图文化:原创 SVG 插画(自绘,不用官方产品图——商标纪律第 3 条)+
  YouTube 真实视频嵌入(youtube-nocookie 隐私模式,privacy 页已披露;
  **视频 ID 必须来自实搜结果,绝不编造**)+ 官方系列卡链 popmart 在售页。
- **视觉锚点(2026-08-30 三改定稿,owner:「labubu官网风格同频」)= Swiss 电商白**:
  纯白底、单一无衬线字族(Helvetica 系)、大留白、细线分隔、**唯一强调色红
  #e4002b**、左对齐排版、巨大数字作构图元素("1:72" 大字、计算器结果红色大号)。
  与官方商店同频的是**气质**(白/黑字/红点缀/圆角商品卡),**绝不触碰 Pop Mart
  品牌资产**:不用其 logo 图形、吉祥物绘图,"not affiliated" 声明全站保留。
  工具 = 首页 C 位红顶边卡片,js/odds-calc.js 四页共享(禁止页内副本)。
  改视觉先过 .claude/skills/frontend-design 的锚点纪律,别混搭。
  (轨迹备查:v1 承旧站深色 → v2 Lo-Fi 纸感 → v3 本版;别再回摆。)

- **主变现:双 tag 分市场**(owner 2026-08-30:「联盟id用我的德国和美国id,
  分别做多语言」):
  - **EN 页 → amazon.com + `ecoback0d-20`**(thedollscout.com 已在 US Associates
    站点列表,2026-08-28 截图确认)。
  - **/de/ 页 → amazon.de + `getecoback-21`**(归属 owner,2026-08-25 截图确认)。
    **✅ 悬置项已解除(2026-08-30,owner:「联盟已加」)**:thedollscout.com 已列入
    DE PartnerNet 站点列表——DE 侧佣金归属确权,营收判定恢复正常口径。
  - 串 tag = 零佣金:deploy 有构建闸门,.de 链挂 US tag 或 .com 链挂 DE tag
    直接拒绝构建。两个 storefront 链接都是**实测存在**的官方 POPMART 店铺页
    (amazon.com 与 amazon.de 各自的,2026-08-30 WebSearch 核实)。
- **页面**:/ + /start + /rarity + /how-blind-boxes-work + /psychology +
  /fake-check + /where-to-buy + /glossary + /checker + /finder + /lookup +
  /data/,及其 /de/ 德语对(hreflang 语言组,x-default=EN;eco 模型;/data/
  无德语对)。德语页价格只引 US 区间 + 指官方 popmart.com/de 在售页,
  **不发明 EUR 数字**。
- **语言策略(2026-08-30 晚,owner:「支持中文，和海外卖的最好区域语言」)**:
  EN/DE = 全站对(变现市场);**zh(/zh/)与 th(/th/)= 单页精华版**
  (hero + 概率计算器 + 数学三句话 + 8 检查速查 + 渠道原则),hreflang 只挂
  首页组。选 th 的依据:泰国 = Pop Mart 海外第一市场(东南亚占国际营收 41%,
  曼谷 ICONSIAM 全球最大旗舰店;kr-asia/Caixin/Nation Thailand 多源)。
  **变现映射**:zh 页 → amazon.com + ecoback0d-20(服务在美中文读者;Associates
  合规看站点列表不看页面语言);**th 页零联盟**(泰国无 Amazon,全部官方链接,
  页内明示 unmonetized)。深链(证据页/工具)指 EN 版并标注「英文界面」。
  新语言升全站对的门槛:该语言 28 天真人 pv ≥ 德语区,或出现该市场联盟通路。
- **独特性原则(2026-08-30 晚,owner:「对比同类型网站要有独特性」)**:
  同类站(labubu.directory / labubucollector / superfans / Fandom wiki)全是
  静态图鉴/清单;本站车道 = content/competitive-gaps.md 的 5 缺口(交互工具、
  概率轴、开放数据、诚实预算角度、多语对)。**不卷图鉴**:全系列 catalog /
  发售日历不做;每个新增面必须落在 5 缺口之一。
- **交互工具矩阵**(埋点全部首次真实交互才记,ev 白名单在 functions/api/ev.js):
  odds-calc(odds_calc)、cost-calc(cost_calc)、fake-checker(checker_use,
  判定语言禁说「保真」)、series-finder(finder_use)、model-search
  (lookup_use,词条纪律:每条具名信源,查不到写 unverified,空结果明说
  「不在索引 ≠ 不存在」)。工具 JS 一律共享文件,文案烘焙在页面 data 属性/DOM
  里(禁止在 JS 里写多语文案)。

## 程序化出页(2026-08-31,owner:「参考 eco 快速扩展流量」)

移植 eco 的 `gen_*.py` 模式:**一个数据脊 + 一个模板 + 一个生成器 = 一片页**,
而不是手写。首个集群 `/odds/`(EN+DE 各 6 页:hub + 1/6/12/24/72 盒)。

- **生成器 `scripts/gen-odds-pages.mjs`**。承重决策:概率数字**从已发布的
  `data/rarity-odds.json` 读**,生成器里不重新声明——与 functions/mcp.js 同一条
  「不做第三个真相源」的规矩。其余全是算术,算术不需要信源。启动时断言每个要渲染的
  格式都在数据脊里有背书,否则 exit 1。
- **eco 明确判死「无独立数据点的纯模板 pSEO」,所以每页硬门 ≥3 个独立数据点**。本集群
  每页 5 个:该盒数在 5 种格式下的精确概率、期望只数、50%/90% 阈值、期望成本倍数、
  以及**该盒数证伪的那条流传说法**。
- **差异化来自纠错,不是来自铺量**(eco 的 GModG 招式):这个 niche 最常被复述的两个
  数字是错的——「整箱 12 盒平均出一只隐藏」(实际期望 0.17)、「12 盒 85% 概率」
  (实际 15.5%)。纠错是本站零编造基因最强的题材:纯数学,不需要任何抓不到的原文。
  **只纠正说法本身,绝不点名竞品**(承 competitive-gaps 的拒绝项)。
- **零联盟链接**:这些是「要不要再买」的决策页,答案常常是「不要」;挂购买按钮会和
  /psychology 自相矛盾。变现由它们指向的 /where-to-buy 承担(同 /how-blind-boxes-work 的先例)。
- **三道闸门,新增页永远不会变成孤儿**:①生成器自带 wiring guard——生成的每个 URL
  必须出现在 sitemap.xml、scripts/urls.txt、build-llms-full 的 PAGES 里,否则 exit 1;
  ②部署链在部署**之前**重跑生成器并断言 `git diff` 为空(有人手改生成页、或改了
  rarity-odds.json 忘了重跑 → 构建失败);③12 个 URL 全部进部署后自检。
- **加新盒数的正确姿势**:只改 `COUNTS` 数组(含 EN/DE 文案),跑生成器,按它报的
  ::error:: 把 URL 补进三处机器面。别手写页。
- ⚠️ 同日修:`check-structured-data.mjs` 的 walker 原来只递归 `de/`,`zh/` `th/`
  `legal/` `data/` **从来没被检查过**;改为遍历全部可发布目录后覆盖从 68 → 92 条。
  **闸门看不见的页,闸门就管不住**——与埋点那条是同一条纪律。

## GEO 面(2026-08-30 晚,owner:「调用技能做好seo，geo流量优化，做厚网站，另外mcp等也增强」)

- **llms.txt**(手写索引)+ **llms-full.txt**(scripts/build-llms-full.mjs 在
  deploy 里 assemble-dist 之前生成,全站 12 页正文单文件渲染)。**生成器铁律
  (8 天冻结教训):脚本任何失败只降级输出、永远 exit 0**,workflow 步骤再包
  continue-on-error 双保险。页面列表在脚本里显式维护——新页要进 llms-full 得
  加进 PAGES 数组。
- **数据集 ×3(CC-BY,/data/)**:rarity-odds.json(格式别概率表 + boxesFor50pct
  推导)+ labubu-fake-signals.json(8 项真伪信号)+ labubu-glossary.json
  (10 术语定义 + 别名,2026-08-30 GEO 深化轮)。/data/ 首页挂三个 Dataset LD。
- **MCP 端点 /mcp**(functions/mcp.js v2.1.0,streamable HTTP 无状态 JSON-RPC,
  /.well-known/mcp.json 发现文档):4 个只读工具 labubu_rarity_odds /
  labubu_fake_signals / secret_pull_probability / define_labubu_term。**承重决策:所有答案请求时
  读已发布的 /data/*.json,绝不在端点里复刻规则**(第三真相源 = 舰队反复付费
  移除的失败模式);**联盟链接永不进 MCP 输出**。deploy 自检带 MCP 冒烟
  (initialize 回 protocolVersion + 1:72×12 盒算出 15.x%)。
- **⚠️ middleware 退役 410 列表与新端点的碰撞已修**(2026-08-30):'/mcp' 与
  '/llms-full.txt' 曾在 RETIRED_PREFIXES 里,已移除;将来给退役列表加条目前
  先查它是否是新站的活路径。
- 结构化数据:全站 Article/BreadcrumbList;核心页全部有首屏答案块(callout)+
  FAQ LD;工具页 WebApplication LD;/glossary DefinedTermSet + 逐条 DefinedTerm
  实体(双语,2026-08-30 GEO 深化轮)。FAQ/DefinedTerm LD 文本必须与页面可见
  文本一致(不造影子内容)。og:image 全站统一 /img/og.png(PIL 自绘 Swiss 风,
  1200×630,不含任何官方素材)。
- robots.txt 具名欢迎的 AI 爬虫(ai-seo 技能清单,2026-08-30 补齐):GPTBot、
  OAI-SearchBot、ChatGPT-User、ClaudeBot、Claude-User、Claude-SearchBot、
  Google-Extended、PerplexityBot、GrokBot、xAI-Bot。默认 * 本就全放行,具名条目
  是给爬虫方的明确信号,新 bot 出现时顺手补。

## 受众画像(2026-08-30,owner:「调研labubu群体心理画像，再看推荐内容」)

**`content/audience-profile.md` 是本站选题的常驻依据**(内部文档,不发布):
核心买家 = 25-34 岁女性(~60% 女性);Gen Z 是 TikTok 发现层非主力买家;家长
是独立子人群。动机 = 变率强化多巴胺回路 + secret 追逐 + 包挂身份符号 + 内在
小孩/丑萌审美 + 社群归属。可服务痛点 = 买家悔恨/超支、怕假、新手无从下手、
家长适龄焦虑。据此出的页:/start(新手+家长)、/psychology(机制透明 + 期望
成本工具,埋点 cost_calc)。**画像内容纪律**:写机制不写诊断,不给读者贴
「addiction」标签;「投资/增值」角度与「戒瘾」卖点是画像明确拒绝项。新选题
先对照画像的动机/痛点矩阵,再过三门。

## 硬内容规则(继承舰队,零妥协)

1. **零编造**:每条事实具名信源 + 日期,查不到就写 "we could not verify"。
   沙箱对 popmart.com/snkrdunk/izoate/demandsage 等均 egress 拦截(2026-08-30
   实测)——**只具名链接让读者自查,不复述抓不到的原文细节**;WebSearch 多源
   一致的要点可用,单源孤证不落页。
2. **不印具体价格**:价格随系列/库存轮动,页面只写区间(有源)+ 链官方在售页。
   「价格地板」逻辑(远低于零售的全新"正品"=假货带)是结构判断,可写。
3. **商标纪律**:每页页脚 + 首页正文声明与 Pop Mart / Kasing Lung 无关联;
   产品名仅作识别用途;**不盗用官方产品图**(旧站规矩延续:要图用原创插画)。
4. **不荐二手/代购渠道,不做转售炒价内容**:本站立场是买到真品,不是投机。
5. **Pop Mart 官方现行指引与本站冲突时,以官方为准**——这句话写在页面上,
   也是对自己的约束。

## 技术与部署

- 纯静态多页,零构建;共享 css/main.css + js/(config/analytics/main)。
- **D1 埋点契约不变**(库/表/ev 口径同旧站,数据连续):`ev=''` 真人 JS pv、
  `ev='bot'` 已知 AI 爬虫、`ev='affiliate_click'` 联盟点击(ref=目标域名)。
  台账读数照旧剔 `/__ci`。**2026-08-30 前的 D1 行属旧站,跨站对比无意义。**
- deploy-thedollscout.yml:防回滚守卫(铁律,checkout 后第一步)→ 下架闸门
  (publishable 文件出现 rating-adult/age-gate/ds_age_ok/yourdoll 即失败)→
  assemble-dist → wrangler pages deploy → **自检**(新页 200+零重定向,
  旧成人页断言 404)→ IndexNow → beacon 自测。
- 保留 workflows:tds-traffic(每日 06:00 UTC,边缘流量 + D1 快照)、tds-indexnow
  (周三 06:20 UTC,MODE=all 兜底)。其余 9 条旧站 workflow 已删,别恢复。
  ⚠️ 公开仓的 schedule 实测延迟 5–12 小时(08-28 那次 06:00 的任务 18:22 才跑),
  **任何「A 跑完 B 才跑」的时序假设都不成立**——下游要自己检查数据新鲜度。
- **定时会话(Routine)**:「DollScout(Labubu 站)增长循环 · 每 2 天」,
  `10 7 */2 * *`,每次开新会话。旧的「DollScout growth loop」已于 2026-08-31 删除
  ——它整条 prompt 还在讲成人站,还要求「绝不削弱 18+ 闸门」,并且依赖两个已不存在
  的文件(`GROWTH-LOOP.md`、`scripts/seo-audit.mjs`)。**它触发的会话没有 MCP 连接器**
  (无 Cloudflare / 无 GitHub),所以它读 D1 只能靠 `content/d1-snapshot.json`,
  验线上只能 `curl` 实探,Actions 日志读不到 → 它被要求把这些明写成「本轮未验证」。
- 趋势输入:content/trends-us.json(词表 labubu/lafufu/pop mart/the monsters/
  kasing lung/blind box)+ content/trends-rising.json(种子 labubu / fake labubu /
  pop mart)——首轮数据等 runner(沙箱对 Google 403)。快反出页判据沿用 eco 模式:
  rising v≥200 + 属 niche + 真伪/渠道/系列角度可落 → 当天一页,14 天冷却,
  1 页/天;**转售炒价词、儿童向内容角度不出页**。

## 2026-09-04 舰队技术优化(机制层,零内容改动;详见根仓 docs/fleet-optimization-2026-09-04.md)

- **D1 `lang` 列自此有效**:此前 ev.js 与 _middleware.js 把每一行都写死 `'en'`,/de/ /zh/ /th/
  全记成英文——「该语言 28 天真人 pv ≥ 德语区」那条升级线读的是常量。现按路径前缀写
  de/zh/th/en;**09-04 前的行按 path 前缀回溯即可**,没有数据丢失。
- **未知事件名改为丢弃**:此前 `ALLOWED.has(e) ? e : ''` 会把拼错/新加的事件名写成
  `ev=''`,而 `''` 正是真人 pv 桶——错名不是丢失而是冒充成页面浏览。
- 部署自检新增**构建戳断言**(`dist/__build.txt` = 本次 SHA):wrangler 发到 preview
  分支也 exit 0,此前 49 条 200 断言全能被上一版生产满足。另 wrangler.toml 不再随
  dist 发布(曾把 D1 database_id 当静态文件对外服务)。
- legal/* 与 404 页补上 config/analytics/main 三件套(此前零埋点);五个工具的
  use 事件同步进 GA4;analytics.js 的 location 维度改用现存类名(旧站的 .hot-card
  等四个选择器在本站 0 命中)。/css /js /img 加了缓存头。

## 部署链的「静默失败」铁律(2026-08-30 深审,157 agent 九面审计)

同一天的审计在自己刚发的代码里挖出三个**绿灯下的静默故障**,全部写进纪律:
1. **允许失败的步骤必须会喊**。`indexnow.mjs` 引用未定义的 `urls`,自 pivot 起
   每次部署都抛异常;因为该步是 `continue-on-error`,整条流水线全绿,新站从未
   向 IndexNow 推过一条 URL。修复后脚本用 `::error::` 注解把失败顶到 run 摘要。
   **新增任何 continue-on-error 步骤时,必须同时给它一条会出现在摘要里的告警。**
2. **「正常的安静结果」是自我伪装**。周更 IndexNow 跑 delta,而 sitemap 的
   lastmod 是静态的 → 09-08 之后永远筛出 0 条,并把空结果打印成正常。已改
   MODE=all 兜底;delta 空结果现在必须发 warning。**任何「没事发生」的分支都要
   能区分「真的没事」与「机制死了」。**
3. **埋点的可见范围就是结论的边界**。`isContentPath()` 不匹配无扩展名路径,
   25 个页面里 20 个永远不可能产生 `ev='bot'` 行——「爬虫只碰入口页」的读数
   是测量假象。**读 D1 结论前先问:这个口径能看见我要下结论的那部分吗?**
4. **「诊断」不等于诊断,猜测不许打印成结论**(2026-08-31,定时任务重做时发现)。
   `tds-traffic` 的 D1 快照导出步骤把 stderr 送进 `/dev/null`,失败时打印
   「d1 snapshot skipped (no D1 access on token)」——那句话是**猜的**,没有任何证据
   支持,而真正的错误被丢弃了。结果:2026-08-19→08-30 连续 12 天全绿、
   `content/d1-snapshot.json` **一次都没落过库**,而它是无 MCP 的定时会话读到真实
   读者数字的唯一通路。已改为直连 D1 REST API(database id 来自 wrangler.toml)、
   打印真实 API 错误(长串一律 sed 打码)、失败与「0 行」两种情况都发 `::warning::`。
   **规矩:任何 catch 分支不许写没验证过的原因;`2>/dev/null` 在 CI 里等于自愿失明。**


## 结构化数据诚实闸门(同日,不可删除)

站内铁律「LD 文本必须与页面可见文本一致」被自己连破两轮(round 8 的 16 条 FAQ、
round 10 的 18 条 DefinedTerm 全是只存在于 JSON-LD 的影子内容)。现在
`scripts/check-structured-data.mjs` 是**阻断闸门**,比较口径:实体解码 + NBSP/
弯引号/破折号归一 + 去标签 + **去全部空白**后做子串判定(松于表现、严于文字——
早期严格版本会误伤合规页面,而一个误报的闸门必然被关掉,闸门被关掉正是影子内容
混进来的原因)。**教训:CLAUDE.md 里写下的规则若没有可执行检查,它只是愿望。**

## 机器面纪律(GEO)

- llms-full.txt:①保留链接 URL(否则「具名有源」在 AI 唯一整读的文件里变成无源
  散文)②剥离 `hidden` 子树(checker 三个互斥判定同时在 DOM 里,会被当成本站结论
  引用)③页头事实**从 .well-known/mcp.json 与 data/ 计算**,禁止手写(手写的
  「3 tools / EN then DE」在 4 工具 4 语言之后还在每次部署重新发布错误事实)
  ④**联盟 tag 不进 llms-full**,与 MCP 同一条规矩。
- **发现通路**:每页 head 挂 `<link rel="alternate" type="text/plain">` 指两个
  llms 文件,robots.txt 具名列出全部五个机器面——D1 实测 OAI-SearchBot 读了三次
  robots.txt 就走,而当时站内没有任何一处指向 llms.txt。
- CSS 组件规则会压过 UA 的 `[hidden]`;`[hidden]{display:none!important}` 必须
  排在组件规则之前(`.card{display:block}` 曾让 /lookup 的筛选完全失效)。

## 2026-09-04 晚:流量诊断 + 相关性修复(owner「重点优化 tds 站,一直没有什么流量」;prompt 三轮收敛)

**先把「没流量」量化(D1,08-30→09-04,剔 /__ci)**:ev='' 123 行,其中 **100 行是 RU**(08-30 一天
70 行扫遍 22 个路径、08-31 21 行扫遍 8 个新 /odds/ 路径,与 YandexBot 同日扫站重合)——是能跑 JS 的
爬虫,不是读者。**非 RU 真人 pv = 6 天 23 次,全部落在 `/`**,内容页/de/zh/th 为 0;搜索/助手引荐 0
(唯一 1 次 duckduckgo)。爬虫倒是都来了:Googlebot 38 路径、GPTBot 42 路径(09-01 整站扫 + llms-full
+ 每个 data/*.json 各 2 次)、Bingbot 13、OAI-SearchBot 19、Yandex 40。**边缘层每天仍有 100–150 次
404/410 = 旧成人站 URL 还在被请求**。判定线 (b)(c) 已提前达成;(d)(e) d1-snapshot 仍缺(owner 侧 token)。

**根因排序(不许归因于内容的规则照旧,以下是机制与相关性,不是文案)**:①站龄 5 天 + 收录延迟(主因,
只有 GSC/Bing WMT 能看)②零权威零分发(暂存包里 tds 一条都没进过)③域名历史(不可测,预登记)
④**页面没写出实体**:17 个 EN H1 里 15 个不含 "Labubu",12 个 /odds/ 的 title 与 H1 全部不含——
搜「labubu secret odds」的人看到的是「One box — the real secret odds」;⑤旗舰词「how to tell if
labubu is fake」的多源标准答案是**刮码 + fwsy.popmart.com 验证 + UV 灯**,本站只写了「QR 到 popmart.com」。

**本轮做的(全部沙箱可做、规则内)**:
1. H1/title/description 相关性一轮(EN + /de/ + /odds/ 生成器):每页 H1 含 "Labubu" + 查询名词,
   原有腔调句降为副标;description ≤160。/odds/ 只改 `scripts/gen-odds-pages.mjs` 后重生成,
   `data/pull-math.json` 字节不变。
2. `/fake-check`(EN/DE)第 4 项补**刮码→扫码→fwsy.popmart.com→输码**流程与「无效/未找到/已验证
   = 警示」,第 5 项补 **UV 反应标记(2024+ 版本,右脚底)**;三处同文(H2 段、Quick answers、
   JSON-LD)逐字一致,结构化数据门通过;`data/labubu-fake-signals.json`(MCP + llms-full 的唯一事实源)
   与 `/checker` 题面同步。信源:Pop Mart 官方帮助页(只具名,沙箱抓不到不复述)+ Feltify + Izoate;
   UV:GamesRadar+ + Double Boxed(多源一致才落页)。**不写序列号格式(单源)**。
3. 内链:`/` 与 `/rarity`(EN/DE)加「Secret odds by box count」带,/odds/* 从 2 条入链起步。
4. 分发:`docs/distribution-staging/2026-W36.md` 第一条 tds 素材(**无链接无 tag** 的真回答,
   owner 手发)。
5. **60 天线的一处口径补记**:「affiliate_click ≥1」在 08-30 当天被单次点击技术性满足,
   **不改预登记文本**,但 10-29 结算以 pv 与引荐两条为准,这一条不再单独援引。

**owner 侧(沙箱做不了,按杠杆排)**:GSC Page indexing + Security/Manual actions + 对 `/`
`/fake-check` `/rarity` `/odds/twelve-boxes-full-case` `/where-to-buy` 请求编入索引(~5 分钟,
是①③两个主因唯一的诊断口);Bing WMT URL 检查(~3 分钟);Cloudflare token 加 Account·D1·Read
(~1 分钟,否则每 2 天的 Routine 看不见 D1);把 W36 那条素材手发一次。

## 判定线(预登记,防事后两头解释)

- **搜索引擎清理期**:本域有 6 周 18+ 历史(RTA 头、adult meta、成人语义)。
  已全部移除并重推 IndexNow,但 SafeSearch 分类残留多久无法预测——**诚实
  记录,不许把早期零流量归因于内容**。基线:2026-08-30 起 D1 周报。
- **60 天线(2026-10-29)**:D1 28 天窗真人 pv ≥ 旧站基线(~6/天)× 3,或
  affiliate_click ≥ 1,或 search/assistant 引荐 ≥ 5 → 转向初步成立,继续投入;
  全部未达 → 把「域名历史包袱」假设升级为主因,报 owner 议新域名。
- 旧站教训延续:任何漏斗事件读数前先剔 CI;insert-only injector 禁止;
  判定线一律带日期与查询口径。

## 钱线仪器(2026-09-21)
`/api/pulse` 多返回 `money`(affiliate_click_28d,08-30 起 / member_orders_by_state),舰队 `money_line.py` 每日读;部署自检断言 `"money":{`。09-21 读数:pv 341、affiliate_click 1(首页);货架所在的 picks 页 28d pv <6。
