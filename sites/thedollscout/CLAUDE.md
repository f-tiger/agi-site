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

## 判定线(预登记,防事后两头解释)

- **搜索引擎清理期**:本域有 6 周 18+ 历史(RTA 头、adult meta、成人语义)。
  已全部移除并重推 IndexNow,但 SafeSearch 分类残留多久无法预测——**诚实
  记录,不许把早期零流量归因于内容**。基线:2026-08-30 起 D1 周报。
- **60 天线(2026-10-29)**:D1 28 天窗真人 pv ≥ 旧站基线(~6/天)× 3,或
  affiliate_click ≥ 1,或 search/assistant 引荐 ≥ 5 → 转向初步成立,继续投入;
  全部未达 → 把「域名历史包袱」假设升级为主因,报 owner 议新域名。
- 旧站教训延续:任何漏斗事件读数前先剔 CI;insert-only injector 禁止;
  判定线一律带日期与查询口径。
