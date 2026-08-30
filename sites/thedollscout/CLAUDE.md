# CLAUDE.md — thedollscout.com(Labubu 导购站)

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
  /fake-check + /where-to-buy + /glossary + /data/,及其 /de/ 德语对(hreflang
  语言组,x-default=EN;eco 模型;/data/ 无德语对)。德语页价格只引 US 区间 + 指官方 popmart.com/de 在售页,
  **不发明 EUR 数字**。新增语言照此模式(页对 + hreflang + 对应市场 tag +
  该市场 Associates 站点列表先行)。

## GEO 面(2026-08-30 晚,owner:「调用技能做好seo，geo流量优化，做厚网站，另外mcp等也增强」)

- **llms.txt**(手写索引)+ **llms-full.txt**(scripts/build-llms-full.mjs 在
  deploy 里 assemble-dist 之前生成,全站 12 页正文单文件渲染)。**生成器铁律
  (8 天冻结教训):脚本任何失败只降级输出、永远 exit 0**,workflow 步骤再包
  continue-on-error 双保险。页面列表在脚本里显式维护——新页要进 llms-full 得
  加进 PAGES 数组。
- **数据集 ×2(CC-BY,/data/)**:rarity-odds.json(格式别概率表 + boxesFor50pct
  推导)+ labubu-fake-signals.json(8 项真伪信号)。/data/ 首页挂双 Dataset LD。
- **MCP 端点 /mcp**(functions/mcp.js,streamable HTTP 无状态 JSON-RPC,
  /.well-known/mcp.json 发现文档):3 个只读工具 labubu_rarity_odds /
  labubu_fake_signals / secret_pull_probability。**承重决策:所有答案请求时
  读已发布的 /data/*.json,绝不在端点里复刻规则**(第三真相源 = 舰队反复付费
  移除的失败模式);**联盟链接永不进 MCP 输出**。deploy 自检带 MCP 冒烟
  (initialize 回 protocolVersion + 1:72×12 盒算出 15.x%)。
- **⚠️ middleware 退役 410 列表与新端点的碰撞已修**(2026-08-30):'/mcp' 与
  '/llms-full.txt' 曾在 RETIRED_PREFIXES 里,已移除;将来给退役列表加条目前
  先查它是否是新站的活路径。
- 结构化数据:全站 Article/BreadcrumbList;/rarity WebApplication + FAQ LD;
  /how-blind-boxes-work FAQ LD;/glossary DefinedTermSet LD。FAQ LD 文本必须
  与页面可见文本一致(不造影子内容)。og:image 全站统一 /img/og.png
  (PIL 自绘 Swiss 风,1200×630,不含任何官方素材)。

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
- 保留 workflows:tds-traffic(D1 快照)、tds-indexnow(周推)。其余 9 条旧站
  workflow 已删,别恢复。
- 趋势输入:content/trends-us.json(词表 labubu/lafufu/pop mart/the monsters/
  kasing lung/blind box)+ content/trends-rising.json(种子 labubu / fake labubu /
  pop mart)——首轮数据等 runner(沙箱对 Google 403)。快反出页判据沿用 eco 模式:
  rising v≥200 + 属 niche + 真伪/渠道/系列角度可落 → 当天一页,14 天冷却,
  1 页/天;**转售炒价词、儿童向内容角度不出页**。

## 判定线(预登记,防事后两头解释)

- **搜索引擎清理期**:本域有 6 周 18+ 历史(RTA 头、adult meta、成人语义)。
  已全部移除并重推 IndexNow,但 SafeSearch 分类残留多久无法预测——**诚实
  记录,不许把早期零流量归因于内容**。基线:2026-08-30 起 D1 周报。
- **60 天线(2026-10-29)**:D1 28 天窗真人 pv ≥ 旧站基线(~6/天)× 3,或
  affiliate_click ≥ 1,或 search/assistant 引荐 ≥ 5 → 转向初步成立,继续投入;
  全部未达 → 把「域名历史包袱」假设升级为主因,报 owner 议新域名。
- 旧站教训延续:任何漏斗事件读数前先剔 CI;insert-only injector 禁止;
  判定线一律带日期与查询口径。
