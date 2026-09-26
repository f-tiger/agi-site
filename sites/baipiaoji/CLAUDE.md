<!-- MONOREPO 迁移说明(2026-08-19,owner 决定) -->
> **本站已迁入公开 monorepo `f-tiger/agi-site`,路径 `sites/baipiaoji/`。**
> 部署分支由 claude/prompt-optimization-workflow-7f3vg2 改为 agi-site 的
> `main`(deploy-baipiaoji.yml);提交信息含 `[deploy]` 才部署的门保留;每日
> schedule(北京 08:30)已随迁移恢复。
> **owner 2026-09-23:「后续上线不用问我」**——bpj 的改动经全部门禁(verify-dist / canonical /
> test-agent-watch --dist / 其余 push 路径脚本)本地全绿后,会话可直接合并到 main 部署,不再等
> 「上线」指令;仍然一次会话合成一次 push、提交信息带 `[deploy]`、不触碰其它站点。旧私有仓 f-tiger/aitools 是历史档案,
> 不再推送。公开仓红线见仓库根 CLAUDE.md。

## 执行令(2026-08-20,基于两轮深度调研,详见根仓 docs/fleet-deep-dive-2026-08.md)

1. **风险画像:本站是舰队里唯一的 Google 单依赖站**(真人引荐 Google 77 绝对主导)。
   HouseFresh/Retro Dodo 案例:单一 Google 依赖可在一个算法周期毁 90%。每轮的
   分发动作**优先非 Google 面**:Bing Webmaster 收录、AI 引用面(llms.txt/MCP/
   机器可读资产)、目录收录——趁流量在涨时分散,不要等跌了再补。
2. **两个新转化 KPI 进每日三线度量**(2026-08-19 上线):
   a) watch 漏斗:工具页钩子 /calc/watch-hook/<slug> → watch 页注册 /calc/watch/<tier>。
      判定线:28 天首个真实 webhook 注册 ≥1。
   b) B2B 询价探针:developers 页 /calc/api-inquiry 事件 + submissions 表 [api-inquiry]
      前缀行。判定线:28 天点击 ≥5 且真实询盘 ≥1 → 立项混合定价(月费保底+用量);
      0 询盘 → 降级。发现真实询盘时**当轮最高优先**处理并通知 owner。
3. 变现探针的优先级高于新工具页。**流量真相(2026-08-20 验尸修正):此前
   「79 真人/日」是错的——2,210 条 ev='' 里 266 条是 /__selftest CI 自测、
   1,537 条是美国无引荐的 JS 爬虫/CI;诚实口径 = 带引荐 102/28d + 非美无引荐
   305 上界 ≈ 4–14 真人/日。每日度量一律报双数字(带引荐下界 + 上界),
   并剔除 /__selftest 与「无引荐+单页集中+单国家」形状的行。** Google
   2.7 引荐/日是最大真实来源;ChatGPT-User 59 次/28d(服务端)是第二通道,
   EN 判定型内容继续加深——引用吃内容,不吃工具 UI。
4. **站点自有触发器(2026-08-20;2026-08-25 补 rising 面)**:fleet-trends.yml
   每日 04:20 UTC 提交两个信号,每日循环 Step 1 必读**两个都读**:
   a) `data/trends-us.json`(美国区当日热搜 × AI 工具名词表)。命中的工具当轮
      优先复核其 limits(热搜=需求峰值=数据必须是对的),并检查该工具页的 watch
      钩子在位。ok:false 连续 ≥3 天报 owner。同词 7 天冷却。
   b) `data/trends-rising.json`(工具名 rising 关联查询,舰队级 tools/fleet_trends_rising.py)
      ——**2026-08-25 新增**,起因:当日热搜 RSS 对 AI 工具名连续 6 天 matched:[],
      热搜面被体育/明星占满,结构上打不到工具需求。rising 才是需求面
      (deepseek → "deepseek free"/"pricing"/"alternative")。读法:高 v 的 rising
      查询 = 真实上升需求,先复核对应工具页 limits 是否对、watch 钩子是否在位;
      **它是选题输入不是选题依据**,任何由它引出的页面仍过三门(尤其需求门)+
      硬内容规则,rising 词里的编造/幻名(如虚构工具名)一律不落页。
5. 定位钉死(owner 2026-08-20 审计确认):本站的可售资产是「每日核实的活数据
   +变更历史」,不是工具外壳——agent 直接调 API 不看 UI,外壳可被一周抄走。
   工具 UI = 数据的展示层与转化钩子;售卖形状 = watch Pro / 白标 API 混合定价,
   一切定价等两个探针的判定线数据,不预设。
6. ~~Gemini 免费额度沉降时间线~~ **已上线 2026-08-21**(`how-much-has-gemini-
   free-tier-been-cut`,zh+en,questions.json kind=entity_timeline)。判定线
   2026-09-18:首个 AI 引用,或 JS pv ≥30 且 watch 钩子 ≥5 → 扩 OpenAI/
   Anthropic/DeepSeek 同构系列;否则该页随巡检自动更新、不再投人工。
   时间线新增格子的硬规则不变:现值只用站内实测,博客只作历史事件源。
7. ~~llms.txt 一手证据判定页~~ **已上线 2026-08-21**(`does-llms-txt-actually-
   work`,zh+en,「被读≠被用」两段式判定 + 三条一手事实)。判定线 2026-09-18:
   首个 AI 引用或 JS pv ≥30 → 把「AI 爬虫观测」做成月更小节;否则并入
   developers 页。**内容队列已清空**——下一轮回到常规阶梯(引用面维护 +
   两个转化探针读数),没有新的一手证据就不要立新页。
8. **AI 时代 agent 面:每页 Markdown 镜像已上线 2026-08-29**(owner 指令「bpj站点
   做成ai时代站点」;移植 agiscorecard 已验证形状,agi-site commit bc83473)。缺口
   审计结论:本站 llms.txt/llms-full.txt/limits.md/MCP/爬虫记账早已齐备,唯一结构性
   缺口是内容页镜像——build.mjs 末段现对根/en/money/plans 的 243 个内容页从已生成
   HTML 提取(title/描述胶囊/H1/FAQ JSON-LD)生成同路径 .md(.html 换 .md),零第二
   份手写副本、永不漂移;正典 .md(limits/pricing)优先,镜像只填空位;_middleware.js
   对镜像加 X-Robots-Tag: noindex,HTML 页保持 canonical 与引用面;不进 sitemap;
   程序化页(tools/vs/alternatives/wall/upgrade/c)不镜像——数据已由 limits.json/
   llms-full/MCP 全量供给。**预登记判定线 2026-10-28(60 天窗)**:D1 hits 表 ev='bot'
   行中 .md 路径抓取(剔除 __probe)≥10 → 镜像面保留续投;=0 → 该面退休,不再加码
   agent 面投入。本改动属引用面/管线(执行令第 1 条的非 Google 分发面),非内容页,
   不触冻结令。
9. **工具注册门已上线 2026-08-29**(owner:「解决方案上做的太弱,最好是工具需要用户
   注册才能用」)。8 个交互工具页(llm-api-calculator/publish-check/stack-builder/
   video-quota-planner/subscription-audit/tokenizer/pipeline-video/free-for-you)
   现须注册邮箱后使用:JS 注入门卡,只锁交互不锁内容(内容留在 HTML,不做全屏墙——
   Google 侵入式插页 + 引用面命脉);对照板/判定页/limits.json/llms-full/MCP/API
   一概不锁。注册=/api/subscribe(src=tool-gate:<slug>),已订阅者同邮箱解锁,
   一次注册全站解锁(localStorage bpj_tool_reg)。pricing 页口径已同步(「单次计算
   免费」→「全部工具免费,需注册」)。依据:PRD-subscription-pivot 已核实结论
   「诉求存在,触发时机站错了」(表单曝光 39 提交 0)——门把请求搬到价值时刻。
   **预登记判定线 2026-09-26(28 天窗,D1 现查,剔 CI/自测)**:gate view ≥30 且
   tool-gate 真实注册 ≥1 → 门保留;view ≥30、注册 =0 且 calc 事件较前 28 天
   跌 >80% → 带数据报 owner,建议降为软门(首次免费)。watch 页不在此列
   (本身注册制);发信通道仍未接,门文案未承诺「立刻收到」。
10. **搜索对齐推荐逻辑 + 首次有度量 2026-08-30**(owner:「搜索功能可否参照推荐
   逻辑优化」)。改动:①search-index.json 工具段构建期按编辑推荐规则预排序
   (完全免费+4 / 有已核实数字+2 / hot+1,与栈组装器/alternatives 同一条规则,
   零机器编造),前端两轮匹配(名称>正文)不变,每轮之内自动变推荐序;②站内搜索
   此前零埋点,补 D1 事件:`gs`(停敲 1.2s,/gs/hit|miss/<词>,≥2 字符)+
   `gs_go`(下拉点进,含 Enter 路径)。**miss 词=需求信号**,高频 miss 进每日
   选题输入(仍过三门)。③顺手修了 lastmod 指纹机制:剔除无属性内联 <script>
   (行为 JS 全站内嵌,改一行就全站 lastmod 刷新+IndexNow 整站重推——本次实测
   踩中;JSON-LD 带 type 属性不受影响),并已按新公式一次性迁移哈希、保留全部
   原变更日期(本轮 0/1542 页误刷)。**预登记判定线 2026-09-27(28 天,D1 现查)**:
   `gs` 事件 <10 → 搜索线停止投入优化;≥10 → 按 hit/miss 比与 gs_go 点进率定
   下一步,miss 高频词交选题队列。
11. **AI 赚钱作业包板块 /earn/ 已上线 2026-08-30**(owner:「加一个板块,ai赚钱板块,
   通过这个吸引转化,必须注册才能看」)。结构:**枢纽页 /earn/ 公开可索引进 sitemap**
   (发现层与被引用面),6 条路的作业包页 noindex、不进 sitemap、不做 .md 镜像,
   **正文由 /api/earn 服务端校验 D1 subs 后发放**——静态站上前端藏 DOM 查看源码即破,
   所以正文只存在于 data/earn-packs.generated.js(构建期编译,不进 dist),实测页面
   HTML 里 0 字节包内容。**现有 /money/ 六页保持全公开**:它们是已被索引的入口与
   AI 引用面,加墙等于焊死自己的发现层;作业包是它们之上的一层。
   包内容零编造,全部来自已核实字段:工具清单+已核实额度+官方出处+核实日期、
   **licence.json 的商用判定(能不能拿去接单)+义务条款**、无官方数字者如实列出、
   分步作业、第一周、失败原因、骗局。四条硬底线(不承诺收入/必写失败原因/必写骗局/
   只用站内已核实免费工具)在枢纽页与每个包页明写。注册走 /api/subscribe
   (src=earn-gate:<slug>),与工具门共用 localStorage,一次注册全站解锁;退订用户
   服务端拒发(否则退订成了单方面假动作)。埋点:earn view/ok/read + 服务端 earn_open
   (只记路径,绝不记邮箱——公开仓隐私红线)。**边界写清**:这是转化机制不是 DRM,
   底层事实本就 CC BY 公开、本仓也是公开仓,墙拦的是「不留邮箱就把编译好的接单资料
   拿走」。**预登记判定线 2026-09-28(28 天,D1 现查,剔 CI/自测)**:earn-gate 真实
   注册 ≥3 → 板块保留并扩路子;=0 且枢纽页 pv ≥50 → 墙拆掉降为公开页(说明是墙
   而不是内容拦住了人);pv <50 → 是分发问题不是板块问题,先补发现层再判。
   本板块属 owner 当日直接指令(与 2026-08-17 vendor 探针同一先例),其余冻结条款不变。
12. **⛔ 转保活模式 2026-09-08(owner:「bpj流量无法利用!」→ 核实后确认,owner 批准)。**
   **本条优先级高于上面 1–11 的任何扩张动作;后续每一轮会话先读这条。**
   **裁定依据(D1 现查,28 天窗)**:
   a) **变现面结构性不存在**:tools.json 219 个工具带 affiliate 标记的是 **0 个**,
      90 天内被点过的 25 个工具无一例外——`go` 出站点击(52/28d)**恒等于 0 收入**,
      不是转化差,是从来没接线。舰队台账把它列为「出站联盟点击」是记错,已于同日修正。
   b) **量级撑不起任何转化优化**:带引荐真人 250/28d ≈ **8.9/日**;工具使用 `calc`
      **28 天 2 次**。8.9/日 × 任何转化率 ≈ 0。此前的注册门/作业包/搜索排序都属这一类空转。
   c) **接联盟也不值**:按 52 点击/28d 与常规转化,预期 €1–5/月,且违反 owner 2026-08-29
      「只走 Amazon」。**别再提接非 Amazon 联盟。**
   d) **读者主要不是人**:AI 爬虫 4,033/28d、API 1,706/28d(多数是自家 CI 形状)vs
      带引荐真人 250 —— 机器:人 ≈ 16:1。唯一像真实外部需求的是 `/api/changes`
      非 CI 尾巴(17 国零散 ~35 次/28d ≈ 1.3/日),量级同样撑不起收费。
   **从此只做(白名单,其余一律不做)**:①每日核实流水线(verify/limits-edit/巡检/变更日志)
   ②API·MCP·llms.txt·数据集面的正确性维护 ③线上自检与部署管线 ④判定线到期读数。
   **明令停止**:新内容页、新工具、新板块、新转化功能、任何「提升转化」的改动。
   已上线的四项(工具门/作业包/搜索排序/md 镜像)**不撤**——维护成本为零,判定线照读。
   **解除条件(任一,需真实数据不是感觉)**:带引荐真人 ≥40/日持续 14 天;或任一面出现
   真实付费/询价;或 owner 明确指令。**注意:冻结令(第 9 段)的解冻条件其实已达成
   (Google 引荐 34/周 ≫ 5/周),但「解冻」≠「能变现」,本条独立成立。**
   Actions 预算与注意力让给已产生真实佣金的 getecoback(€10,26/30d)。
   **保活模式的第一个例外(owner 2026-09-10「对比其他工具站如何盈利?抄一抄」→ 看完调研后「做」)**:
   厂商加急核实入口移到 /submit 的提交成功处。**这不是新功能,是修一个测量缺陷**:D1 现查
   submissions 表有 **7 条真实厂商投稿(6 条在 10 天内,09-07 一家一次投了 5 个工具)**,
   而 /for-vendors 90 天只有 **2 次浏览**——需求在敲门,收费入口没人看见,11-15 那条
   「0 询价即撤」本来会在一个没人看过的页面上开火(与本轮多次遇到的「把测量沉默当判定」同类)。
   **对标结论(2026-09-10 调研)**:Futurepedia $247/$497 且已取消免费提交、TAAFT $347 优先位
   + $99/月 侧栏(但**免费收录的正是「100% 免费/开源」工具,即本站全部 219 个的那一类**)、
   EasyWithAI $125。规模型路径(newsletter 赞助需 1,000–2,500 订阅、展示广告、按流量联盟)
   在 8.9 真人/日 + 2 个订阅面前结构性不可能。**唯一可抄的是卖工作不是卖位置**:
   加急核实 = 结论来得更快,不是更好的结论。
   **口径一致性同轮修好**:提交页原写「首页推荐位」与 pricing 页「付费徽章一概不卖」对读者是矛盾,
   现提交页只提加急核实,pricing 页补一句「厂商唯一能买的是队列位置」。
   埋点 `/biz/from-submit/view` 与 `/click`。**11-15 判定线的读数从今天重新起算**
   (此前窗口测的是一个 90 天 2 次浏览的页面,那段读数无信息量)。

13. **🟢 扩张令 2026-09-11(owner:「我觉得bpj要充分扩大站点流量,与营收」)。本条取代第 12 条的
   「明令停止」与白名单;第 12 条的裁定依据 a–d 作为事实保留不删,它们仍然是真的,只是结论变了。**
   **为什么可以变(不是感觉,是第 12 条自己写的解除条件第三项:owner 明确指令;并且 09-08 之后
   变现面从 0 变成了 1)**:09-10 把厂商加急核实入口移到 /submit 成功处;09-11 建成自助广告位
   (`/advertise.html` → `ad-draft` → 付款 → 自动上架,卡与钱包两条收款轨,状态机与金额校验在
   服务端)。第 12 条 a)「变现面结构性不存在」**从今天起不再成立**——但收款密钥仍在 owner 手里
   (见「owner 侧解锁」),密钥未设之前广告位是「已建未通电」。
   **流量事实(D1 28 天,剔 CI,带引荐真人)**:全站 250;工具页里 **grok 一页 66(Google 63,
   占本站 Google 引荐 135 的 47%)**,其后 fireworks 13、kimi 9、haiper 8、feishu-miaoji 7、
   pixverse 5,再往后全是 ≤3 的长尾。结论:**需求高度集中在少数「X 还免费吗」型查询**,
   而 `is-X-still-free` 判定系列此前只有 14 页,且 grok 因缺付费档被生成器排除——
   本站流量最大的那个问题,本站没有一页正面回答。
   **本轮已做**:grok 付费档经 limits-edit 两步写入(x.ai 沙箱不可达,三源搜索引文交叉核实,
   已标 [非官方口径]),`is-grok-still-free` 中英两页当轮生成并进 sitemap。
   **扩张顺序(按 D1 需求排,不按感觉)**:
   ① **判定系列补齐**:129 个已核实免费档的工具里 **114 个没有付费档**,生成器因此只出 15 页
      判定页。每轮按上表需求序补付费档(下一批:fireworks → kimi → haiper → feishu-miaoji),
      **官方定价页优先,抓不到才用搜索引文并标注**;付费档补不到官方或两源一致的数字就不补,
      宁缺毋编。这条同时喂 `/upgrade/`(判定页 → 撞墙 → 付费档 → 广告位/厂商入口是唯一闭环)。
   ② **发现层**:Bing 39/1474 收录(08-16)是最大的免费杠杆,需 owner 在 Bing Webmaster 验证
      站点并提交 sitemap(见解锁项);IndexNow 只提真变的 URL(舰队纪律)。
   ③ **厂商入流**:7 条真实投稿(09-07 一家投 5 个)证明供给侧在敲门。回复稿在
      `docs/distribution-staging/bpj-vendor-replies-2026-09-10.md`,owner 手发(反 AI 味规则适用);
      每轮把 submissions 表 status='new' 的条目按队列处理并把加急/广告位入口带进回复。
   ④ **不做**(第 12 条 c、舰队杀单照旧):非 Amazon 联盟、展示广告(AdSense 估算 $1–4/月)、
      新子域、买流量、X 自动发帖、为 SEO 批量造薄页(判定页必须有已核实付费档才生成,这是防薄页门)。
   **判定线(预登记,D1 现查,剔 CI)**:
   - **2026-10-09(28 天)**:`is-grok-still-free` 中英合计带引荐真人 pv ≥30,或 grok 工具页
     Google 引荐较本期(63)不降且判定页从中分流 ≥10 → 系列策略成立,继续按需求序补;
     判定页 <10 且工具页也没涨 → 判定系列对搜索无增益,停止为 SEO 目的补付费档,只按复核需要补。
   - **2026-10-09**:带引荐真人 ≥14/日(本期 8.9)才算「扩大流量」成立;否则回到第 12 条的
     保活白名单,本条作废,不再第三次翻转。
   - **营收线**:密钥通电后 28 天内 `ad_live` ≥1 或加急核实收款 ≥1;密钥 09-30 仍未设 →
     广告位按「已建未通电」记台账,不计入判定,也不再催建功能。
   **owner 侧解锁(不做这几件,上面的扩张一半是空转)**:①Bing Webmaster 验证 + sitemap;
   ②收款密钥二选一:钱包轨 `ADS_WALLET`/`ADS_WALLET_CONTRACT`/`ADS_SCAN_API_KEY` + vars
   `ADS_WALLET_CHAIN` 等,或卡轨 `ADS_PAYMENT_LINK`/`STRIPE_WEBHOOK_SECRET`/`ADS_PRICE_CENTS`;
   ③手发 7 封厂商回复。

14. **🧠 自扩展层已上线 2026-09-11(owner:「让bpj站点可以自我扩展…为站点构建算法的后端能力,
   可以更新工具,并且创造营收」;三轮 prompt 与判定线见 `docs/self-expansion-2026-09.md`)。**
   三件零 AI 的第①层能力,全部挂在已有每日 schedule 上(≈48 分/月,不新增 cron):
   ① `/api/reach`(functions/api/reach.js)只出计数的触达聚合 → CI 每日 `scripts/reach-export.mjs`
   写 `data/reach.json`。**每日循环与本会话读流量先读这个文件**(带来源真人 pv 按类目/工具/判定页、
   来源域、AI 引荐、事件、投稿数),口径固定在端点一处(=traffic-truth 真人线 A),不再各自手写 SQL。
   ② `scripts/source-drift.mjs`:每天抓每条 limits 的官方来源页,「数字+单位」令牌集合连续两日与
   基线不同才确认漂移 → `data/drift.json`。**只标记不写事实**;抓不到放行;`limits.checked` 推进
   到确认日后自动撤标。复核顺序从此 = 漂移确认 > 30 天阈值。
   ③ 接线:雷达 `source_drift`(65 分)与 `paid_gap`(按触达排付费档缺口,喂 #13);复核队列漂移置顶;
   工具页对漂移条目如实提示「官方页面 X 日有变动,本条待复核」;广告页出各板块**真实**触达表;
   空广告位自售行(标「广告位」,事件 `/ad/house/<cat>`)。
   **硬边界**:LLM 不进 CI 写事实;候选/投稿不自动成条目;新数字永远只走 limits-edit 两步。
   **判定线**:09-25 `drift.json` 的 `fetched_ok` ≥60 且 ≥1 条经核实的真漂移 → 成立;<30 → 只盯可抓部分不再扩。
   10-09 `ad/house` 点击 ≥5 → 自售行保留;=0 → 撤。

15. **💰 库存搬家 + 判定系列按需求序补 2026-09-16**(owner:「bpj站点，增加新的工具解决方案，
   整个站点要创造营收」;全文 `docs/PRD-revenue-tools-2026-09-16.md`)。
   **本轮第一次在会话内直连 D1(Cloudflare MCP 的 `baipiaoji-hits`),读数因此比 reach.json 细,
   并纠正了两处台账记错。后续会话要查 bpj 真实读数直接查 D1,别再只读聚合。**
   **一条洞察管住本条全部动作:每一个变现面都建在读者从来不去的页面上。** 28 天 307 个带来源
   真人里,工具页 **209(68%)**、板块页 56,而 `/upgrade/`、判定页、`/money/`、`/earn/`、
   `/for-vendors`、`/advertise`、`/watch` 的到达数**全部是 0**。所以此前记录的「0 转化」不是
   转化差,**是从未被看见**——与 09-10 把加急核实入口搬出那个 90 天 2 次浏览的页面属同一个
   失败形态(把测量沉默当判定)。
   **台账纠正(两条,后续引用请用这一版)**:
   ① **`vendor_inquiries` 表在 D1 里根本不存在** = 询价探针自 2026-08-17 上线 30 天一次询价都没有
      (该表首次 POST 时自举)。`bpj-vendor-inquiry-1115` 的读数是结构性的 0。
   ② **「7 条真实厂商投稿 = 供给侧在敲门」要降级**:7 条来自 **3 个提交者**——09-07 一个荷兰
      运营者一次投 5 个同族域名(bgninja / picreviver / passportninja / scanreviver /
      watermark.shinobitools,同日同国同命名法,典型批量目录投放),另 SocialEcho(SG,08-31)
      与 Vocemo(US,09-09)。最新一条 09-09,真实节奏约 1 个提交者/两周。
      `submissions` 表 8 行里还有 1 行是 CI 自测,计数时要剔。
   **另外三个已知 0(都是真 0,不是测不到)**:`watches` 0 条、`ads`/`ad_orders` 0 行、
   `biz`/`gs`/`earn`/`ad` 事件 28 天各 0 次;`calc` 4 次里 **`/calc/watch-hook/*` 占 0 次**。
   **好消息也是真的**:带来源真人日均 **8 月 6.9 → 9 月 13.9**(翻倍),
   第 13 条的 ≥14/日(10-09)已经贴线。
   **本轮做的两件事**:
   ① **付费档按 D1 需求序补齐 → 判定页与 `/upgrade/` 由生成器自动产出**(不手写页)。
      只补了官方定价页当日可直抓的 **cline** 与 **civitai**;kimi(SPA + 连接重置)、
      feishu-miaoji(4.7KB 壳)、haiper(首页只剩一行标题,该站是否仍正常运营待复核)、
      quillbot(403)**一律不补**——抓不到就不写,一个数字都不编。这四个留给 runner 侧
      (CI 出口网络与沙箱不同)。判定页 16 → 18 组。
   ② **广告库存从板块页搬到工具页**:219 个工具页全部加位(`adSlotOf(cat, slug)`),空位自售行
      改用**这一页自己的触达数**(reach.json 的 `tools[]` 一直躺着没人用),该页为 0 才回落到
      板块数**且文案明说报的是板块**;事件分开记为 `/ad/house/tool/<slug>`;投放页新增「触达最高
      的工具页」库存表。三条原有硬规矩(明示「广告」、`rel="sponsored nofollow noopener"`、
      与已核实条目不共用容器)一字未动,并由新增的部署自检 `st_ads` 断言——**它能红**。
   **明确没做(都有读数)**:新交互工具(`calc` 4/28d)、新 `/plans/` 页(4/28d)、
   第四条收款轨(已有那条还没通电)、非 Amazon 联盟(舰队杀单;且 Amazon 与本站需求不重叠,
   `local` 类目 28 天只有 8 次触达)。
   **判定线(已进 `data/fleet-bets.json`)**:
   - `bpj-ad-inventory-1014`:`/ad/house/tool/*` 点击 ≥5 或 `ads` 出现任一 draft → 单页库存成立;
     =0 且工具页触达仍 ≥150 → 不是分发问题是需求问题,撤回工具页库存只留板块页。
   - `bpj-paid-tier-series-1014`:cline + civitai 的判定页与 `/upgrade/` 页合计带来源真人 pv ≥10
     → 继续按需求序补;=0 则与 `bpj-grok-series-1009` 合并判定后停止为 SEO 目的补付费档。
   **owner 侧(这几条不做,工具页上新增的 219 个位子就是「有库存、无收银台」)**:
   ①收款密钥二选一(钱包轨或卡轨,见第 13 条解锁项)②Bing 验证 + sitemap(cn.bing+bing = 全站
   25% 来源)③**一个决策题**:`go` 出站 83 次/28 天是全站最高意图动作,在「只走 Amazon」下永远
   是 0 收入,是否为 bpj 破例走 API 类厂商官方推荐计划属 owner 决策(**只请示不抢跑**,本会话
   零相关代码);附反对自己的证据:83 次散在 30+ 个目的地、最高一家 5 次,破例后预期仍是
   每月个位数美元,价值在「口子开不开」不在这个月的钱。

16. **🔭 付费档探针:把「沙箱抓不到」变成 runner 每天推进的队列 2026-09-16 第二轮**
   (owner:「把工具站做到极致」+「极致优化最终目标是扩大流量,获取营收」;全文同上 PRD §七)。
   **流量与营收在本站是同一个杠杆,这一条把它写死**:读者 68% 落在工具页、问的都是「X 还免费吗」;
   219 个工具里 **109 个只差 `limits.paid` 一个字段**就能生成判定页 + `/upgrade/` 页——前者是
   本站唯一已验证的 Google 流量形态(grok 一页吃掉全站 25% 带来源真人),后者是全站唯一的购买
   意图页型。**填一个 = 4 个新页 + 1 个新可变现落点。**
   **这个缺口两轮填不动的根因不是态度,是会话沙箱抓不到厂商官方定价页**(09-16 实测 x.ai 403、
   quillbot 403、kimi 连接重置、feishu/haiper 只回 SPA 壳),而 runner 抓得到(source-drift 每天
   抓 219 条来源页就跑在那条链路)。所以新增 **`scripts/pricing-probe.mjs` → `data/pricing-probe.json`**,
   挂已有每日 schedule(**不新增 cron**,最坏 1.4 分/次 ≈ 42 分/月,约 14 天覆盖一轮 109 个):
   - **入队条件与判定页生成条件逐字对齐**(`quota && wall && source && checked && !paid`),
     队列每一行都等于「填上就多两种页」;按触达排序,游标轮转不重扫。
   - 候选 URL **只做确定性推导**:先取 source 散文里像定价页的 URL,再退化为官网域 +
     `/pricing` `/price` `/plans`,**上限 3 个**,串行 1.5s,命中即跳出。
   - 三态 `ready` / `empty` / `blocked`;**每行记 `env`(sandbox / runner)**——这个脚本存在的全部
     理由就是两种网络不一样,**只有 runner 行的 `blocked` 才值得当结论**,沙箱行的 blocked 若被
     当成「这家没有付费档」,正是它要消灭的那个误判。
   - **硬边界**:只做发现与取证,**一个数字都不写进 tools.json**;新数字永远走 limits-edit 两步。
   - 零网络自检已挂 push 路径且**变异测试验证过能红**(把无价页判成 ready、把网络拒绝判成
     「没有付费档」,两个方向都有断言)。
   **本轮实际填进去 5 家**(全部官方页当日直抓):cline、civitai、cloudflare-workers-ai、deepinfra、
   **lm-studio(探针首跑命中)**。判定页 **16 → 21 组**,`/upgrade/` **21 → 24 个**。
   lm-studio 是管线自证:手工那轮我试 `lmstudio.ai/work` 被跳到 `/enterprise`、零价格,判了「抓不到」;
   探针的确定性候选 `/pricing` 一次命中(Free $0 / Bionic+ $20 / Pro $100)。**一个确定性候选表
   胜过一次聪明的猜测。** 重点补 API 板块:它吃 42% 出站点击,且是 ChatGPT 引荐唯一落点(`/c/api` 11 次)。
   **顺手修的测量缺陷**:`/for-vendors.html` 此前只在提交询价时打点,「没人来看」与「看了不买」
   在 D1 里长得一样,而 `bpj-vendor-inquiry-1115`(90 天 0 询价即撤)正要拿这个读数开火;
   现补 `/biz/vendors/view`。这是 09-10 那个教训的第二次出现。
   **判定线 `bpj-pricing-probe-1014`**:`gap_total` 较 109 降 ≥8 且 runner 行 `ready` ≥10 → 队列成立;
   `ready` <10 → 厂商定价页多为 SPA/拒爬,探针降周频;gap 不降但 ready 够 → **是会话没去读队列**,
   把「读 `data/pricing-probe.json`」写进每日循环。
   **诚实边界**:本轮新增的页今天不产生任何流量,是否复制 grok 那条曲线由 `bpj-grok-series-1009`
   与 `bpj-paid-tier-series-1014` 到期按 D1 判,**不预告结果**;广告位仍是「有库存、无收银台」。

17. **💳 收款通道 2026-09-16 第三轮**(owner:「收款如何做?你帮我解决」;
   **操作文档 `docs/OWNER-SETUP-收款.md`**,后续会话被问到收款先给这份)。
   **本轮最重要的发现:钱包轨此前是「配好也收不到钱」的。** `scripts/ad-watch.mjs`(09-11 建)
   用 D1 REST + `CLOUDFLARE_API_TOKEN` 读写订单,而**本仓的 token 没有 D1 权限**——根手册
   09-12、09-13 两次记录,deploy workflow 自己的注释里也写着「CI 直连 D1 的 REST 导出在舰队里
   从未成功过一次」。真实行为:owner 配好地址 → 买家付款 → 轮询在第一条 SQL 就失败 →
   广告永不上架、买家白付;而且这个失败在 owner 打开 `vars.ADS_WALLET_CHAIN` 之前**完全看不见**
   (job 被 if 跳过)。**教训:一条链路里只要有一段用了本仓已知跑不通的方法,它就是坏的,
   哪怕其余部分写得再漂亮——新建管线时先查这个方法在本仓有没有成功先例。**
   **已修**:新增 `functions/api/ad-claim.js`(Worker 自带 D1 绑定、零 token,Bearer 鉴权走
   `ADS_WATCH_SECRET`),`ad-watch.mjs` 改走它,并把带 D1 写权限的 CF token 从公开仓 Secrets 里拿掉。
   服务端**不信任调用方**:金额、状态、重复三项全部重新核(与「执行器不信任台账」同一条规矩)。
   **同轮其余四件**:
   ① **把 owner 的动作压到最少**:非机密参数(`ADS_PRICE_CENTS` / `ADS_CURRENCY` / `ADS_DAYS` /
      `ADS_WATCH_ETA`)移进 `wrangler.toml [vars]`——它们本来就印在页面上,留在后台只会让
      「开通收款」从 2 步变 6 步。**卡轨现在只需 2 个密钥**(`ADS_PAYMENT_LINK` +
      `STRIPE_WEBHOOK_SECRET`),且与 SourceRadar 付费包共用同一个 Stripe 账号。
   ② **收款体检 `/api/ads?doctor=1`**:一个 URL 回答「到底通没通」,只回布尔与公开价格,
      **绝不回显密钥的值、前缀或长度**(长度也泄漏信息);六种配置组合已本地验证。
   ③ **部署自检断言「半通电」这个事故形状**:支付链接配了但 webhook 没配 = 买家付得了钱、
      位子永远不上架(收钱不交付,最坏结局)→ 直接把部署打红。完全没配不算失败(当前就是这个状态)。
   ④ **投放页加载时就从服务端取价格与开售状态**,不再让人填完三行、按下按钮才发现收不了钱;
      价格只有一处真相(`ADS_PRICE_CENTS`),写死在文案里迟早与实际收款金额对不上。
   **`scripts/test-ad-claim.mjs`**:11 例零网络端到端测试(鉴权/幂等/金额核对/状态机),
   已挂 push 路径,**变异测试验证过会红**(去掉金额核对即失败)。
   **⚠️ 价格 €49/30 天是我给的起步价不是核实出来的事实**,依据写在 `wrangler.toml` 注释里
   (chat 板块 28 天 95 次真人浏览 ≈ €0,52/次;同类目录报价高两个数量级但流量也高两个数量级),
   **owner 应自行确认**;改价改 `wrangler.toml` 一行 + Stripe 那边同步。
   **对 owner 说的顺序(按每分钟产出,别搞反)**:①**Amazon PartnerNet 付款/税务资料 ~2 分钟,
   €11,20 已在累积、填完才付得出来**——这是舰队唯一已真实发生的收入;②Stripe(10 分钟,
   一次点亮 bpj + SR);③钱包轨(与②二选一)。**广告位 28 天下单数是 0,通电不会自己带来买家**,
   它只是把「有人想买时买不了」这个障碍去掉。

18. **🔬 数据分析 → 修仪器 2026-09-17**(owner:「Bpj数据分析增强流量」)。**本轮没有新增内容页,
   因为分析的结论是:决定「下一步该往哪投」的那个仪器是坏的,在它修好之前任何内容动作都是掷骰子。**

   **① 两个搜索引擎在本站几乎零重叠 —— 这是本轮最重要的结构发现。**
   最近 14 天(D1 现查,剔 CI):

   | 引擎 | 落地页 | 具体 |
   |---|---|---|
   | Google | **100% `/en/*`** | grok 47、c/coding 23、fireworks 10、haiper 6、pixverse 4、tongyi 2 |
   | Bing 家族(bing/DDG/Yahoo) | **100% 中文页** | kimi 15、cline 6、feishu-miaoji 5、google-flow 4、together 3，其后约 15 个 2 次的长尾 |

   没有一个页面同时被两边送人。14 天块的走势:**Bing 家族 0 → 20 → 77**(这是新增的增长引擎),
   Google 53 → 30 → 94 → 70。**Google 的总数下滑是长尾掉队,不是主力页掉队**——逐页看反而在涨
   (grok 27→47、c/coding 14→23、fireworks 8→10、haiper 4→6、pixverse 0→4),掉的是一批只出现过
   1–3 次的 EN 长尾页。所以「Google 在跌」这个说法要改成「Google 在收窄并加深」。
   **顺带纠正第 13 条的画像**:本站已经不是「Google 单依赖站」了,中文面 + Bing 才是增量来源。

   **② 板块页与对比页是 AI 引用面,工具页不是。** 15 条 AI 引荐里 11 条落在 `/c/*` 或 `/vs/*`
   (chatgpt.com → `/c/api` 11、perplexity → `/en/c/image` 5、`/en/c/video` 3、5 个不同的 `/en/vs/*`),
   而 `/en/c/coding` 同时是 Google 的第二大页(46 次)。**三个页型对应三个引擎**:工具页吃 Bing、
   板块/对比页吃 Google 与 AI 引用。

   **③ 修的东西:`_middleware.js` 的 `isContentPath()` 对全站 92% 的内容是瞎的。**
   它是**白名单**——`/` 或以 `/` 结尾,否则必须匹配 `\.(html|txt|json|md|xml)$`。而本站内容页是
   **无扩展名路由**(`/tools/grok`、`/en/c/coding`、`/vs/a-vs-b`、`/is-grok-still-free`),一条都不匹配。
   D1 坐实:28 天 `ev='bot'` 共 1,221 行却只有 **23 个不同 path**,`/tools/*` 与 `/c/*` 各 **0** 条;
   同窗真人落地 330 次里 **302 次(92%)** 正好在那批看不见的路径上。Bingbot 记到 14 个路径,
   同期 Bing 却把真人送到了 20 个不同的中文工具页 —— **两个数字互相矛盾,矛盾的是仪器不是爬虫。**
   **为什么这件事卡住流量决策**:1,542 个页面里只有约 26 个拿到过搜索流量,而「从没被抓过」与
   「抓了但排不上」的补救方向完全相反(发现层 vs 内容)。旧实现让这两种情况在库里长得一模一样。
   **改法**:白名单改黑名单(只排 `/api/*` 与静态资源扩展名),与 check_adlabel 2026-09-04 那次同源。
   新增 `scripts/test-middleware-paths.mjs` 挂 push 路径,**变异测试验证过三个方向都能红**
   (退回白名单 / 黑名单宽到吃掉 `.json` 数据面 / 普通浏览器被当成爬虫)。

   **④ 同轮抓到的第二个污染:部署自检自己在伪造抓取量。** `st_mw` 用 GPTBot UA 打 `/en/`、
   ClaudeBot UA 打 `/llms.txt`,**不带 `__probe=1`**。D1 现查:`/en/` 名下 GPTBot **43 次/29 天**、
   `/llms.txt` 名下 ClaudeBot **43 次/29 天**,计数与天数逐一对齐、全部 US —— 就是这两行 curl。
   即 **`/llms.txt` 的「ClaudeBot 抓取」100% 是我们自己**,GPTBot 全站 75 次里 57% 也是。
   `__probe=1` 的守卫本来就是为这件事建的,当初只挡住了 `ai-crawler-probe.mjs`,漏了部署自检。
   已补上。**09-17 之前任何「AI 爬虫抓了多少」的引用都要先扣掉这部分**;
   `bpj-crawler-observed-1028` 读的是 `.md` 路径,不受这两条污染。

   **⑤ 明确没做,以及理由**:
   - **没有新增内容页/新付费档**。第 16 条的队列(`data/pricing-probe.json`)要 runner 跑完才有料,
     沙箱这轮抓不到;而按感觉挑页正是三门里「数据门」要挡的东西。
   - **没有按「Bing 在涨」去批量改中文工具页**。涨是真的,但「哪些页已被抓、哪些没有」正是坏掉的
     那个仪器要回答的问题——先修仪器再投内容,顺序反了就是拿 1,542 页掷骰子。
   - **没碰 sitemap/IndexNow**。线上 sitemap.xml 实测 200、**1,558 条 URL**,Bingbot 28 天抓它 287 次;
     发现层的提交侧没有缺口,缺的是「抓到多深」,那要等 ⑤-1 的读数。
   - **owner 侧仍未变**:Bing Webmaster 验证 + 收款密钥(第 13、17 条),会话侧代替不了。

   **判定线(已进 `data/fleet-bets.json`)**:
   - `bpj-crawl-visibility-0924`(7 天):`ev='bot'` 不同 path ≥100(t0=23)且 `/tools/%`|`/c/%` ≥1(t0=0)
     → 仪器修好,下一轮第一次能分辨「没被抓」与「抓了排不上」;仍 <40 → 爬虫确实只碰枢纽页,
     绑定约束是发现层深度,改内容无用。
   - `bpj-bing-zh-surface-1015`(28 天):Bing 家族带来源真人 ≥154(t0=97;最近 14 天 77)
     → 中文面 + Bing 是真增长引擎,下一轮按中文工具页排投入;<100 → 0→20→77 是一次性收录事件。

19. **🇨🇳 中国是不是更大？——还没有，但已经追平,而且是唯一在涨的那一半（2026-09-17,owner:「中国流量更大？扩展优化」）**

   **直接回答**（D1 现查,带来源真人,剔 CI）:

   | 窗口 | 美国 | 中国 |
   |---|---|---|
   | 28 天 | **162** | 92 |
   | 最近 14 天 | 63 | **60** ← 基本持平 |
   | 14 天块走势 | 35 → 20 → 98 → 63 | **0 → 0 → 32 → 60** |

   所以「中国更大」现在还不成立,但**四周前中国是 0**,而美国在回落。**语言面完全分开**:
   中国的 92 次里 **90 次落在中文页**(`/en/` 只有 2 次);美国的 162 次里 145 次落在 `/en/`。
   **中国的来源高度集中在一家**:`cn.bing.com` **71 次(77%)**,其后 m.baidu 6、chatgpt 5、
   www.baidu 3、bing 2、baidu.com 2、yandex 2、**doubao 1**(首次出现中国 AI 助手引荐)。
   这同时把第 18 条那句「Bing 家族 0→20→77 是增长引擎」定位得更准:**那个引擎就是中国的必应。**

   **一个必须一起说的反向检验**:中国来源常被剥引荐头,所以「带来源真人」这条口径可能低估中国。
   查了:无引荐那半边**两国都不可计**——CN 391 次里 `/` 一页占 **126(32%,26 天)**,
   US 782 次里 `/en/tools/grok` 占 **180**,正是手册第 3 条说要剔掉的「无引荐+单页集中」形状。
   **结论不变,但要说清楚这是下界不是全貌。**

   **本轮做的三件(全部是让中文面进入仪器,不是猜内容)**:
   ① **`/api/reach` 加国家面**。这个端点的文件头原本明确写着「不出国家分布」——**有意推翻,
      理由写进了代码注释**:它存在的全部目的是「会话没 MCP 也看得见流量」,而今天这个问题
      只能靠手接 MCP 才答得出来,那正是它要防的失明。但原顾虑是对的,所以只开最小粒度:
      **只出站点级计数,永不与 path/ref/事件交叉;k 匿名下限 5,不足 5 次的国家并进 `other`。**
      `scripts/test-reach-shape.mjs`(零网络)对边界值逐个断言,**四个变异都验证过能红**
      (k 调成 1 / `>=` 写成 `>` / 非法国家码放行 / 折叠的那部分被丢掉)。部署自检 `st_reach`
      同时在**生产响应**上跑一遍下限检查——形状对不对与下限有没有被绕过,是两件事。
   ② **中文爬虫进 `AI_BOTS`**:Baiduspider / Sogou web spider / 360Spider / HaosouSpider /
      PetalBot / YisouSpider。**此前它们一个都不在表里**,`botOf()` 返回空 → 中间件直接 return
      → 它们在库里**完全不存在**。既然一半读者在中国,「百度/搜狗/神马到底有没有来抓」
      不该是一个查不到的问题。**词根一律用爬虫专属串,绝不用厂商名**:`baidu` 会命中
      百度浏览器(baidubrowser)把真人记成爬虫,而 beacon 已经记过它们一遍 —— 漏斗会被算两遍,
      且正好发生在最关心的那个市场。单测里**正面钉死了四种中国真人浏览器**(百度浏览器 /
      搜狗浏览器 SE MetaSr / 夸克+QQ / 微信内置)必须判为真人。词根写错的后果只是「仍然看不见」
      (fail-safe),永远不会变成一个错的数字。
   ③ **robots.txt 补中文引擎段**。**这是声明性的不是解锁**——`User-agent: *` 早就放行了它们;
      加它的理由是这份文件此前一个中文引擎都没提,而中国已占带来源真人的一半。

   **顺手抓到的自伤**:往 robots 模板里写注释时用了反引号,直接把 build.mjs 的模板字符串截断、
   构建报 SyntaxError。**构建当场红,这是门在干活**——记在这里是因为在 JS 模板字面量里写
   中文注释时,反引号是最容易踩的那一个。

   **明确没做,以及理由**:
   - **没有为百度做任何「优化」**。百度 28 天只送来 11 次,而且**百度不支持 IndexNow**
     (`scripts/indexnow.mjs` 的注释里早写着),要开只能 owner 去站长平台提交。
     在②的读数出来之前,连「百度有没有抓过本站」都还不知道——不知道就不投。
   - **没有按「中国在涨」批量改中文工具页**。与第 18 条同一条纪律:哪些中文页已被抓,
     正是 `bpj-crawl-visibility-0924` 要回答的问题,读数 09-24 才有。
   - **没动 hreflang / zh-CN 地区码**。那属于「零读数的 SEO 猜测」,三门里数据门直接挡掉。
   - **没把国家与页面交叉**。那是重识别风险真正所在的地方,①里写死了不做。

   **判定线(已进 `data/fleet-bets.json`)**:
   - `bpj-cn-crawlers-1015`:中文引擎 `ev='bot'` 行 ≥1(t0 = **结构性 0**)→ 中文发现层值得投;
     =0 → 中国流量的天花板就是 cn.bing 这一条,开百度只能靠 owner 侧。
   - `bpj-cn-overtakes-us-1015`:28 天 CN ≥ US(t0:US 162 / CN 92,最近 14 天 63/60)
     → 重心确实移到中国,内容投入按中文工具页排;仍明显低于 → 09-17 看到的是一次 cn.bing
     收录事件的爬坡期,不是重心转移。

# CLAUDE.md

## 工作方式要求（必须遵守）

**先优化 Prompt，再执行任务。**

收到用户的任务请求后，先使用 `prompt-optimizer` skill（位于 `.claude/skills/prompt-optimizer/`）将用户的原始输入优化为一条清晰、完整、可执行的 Prompt：

1. 在回复开头展示优化后的 Prompt（引用块或代码块）。
2. 严格按照优化后的 Prompt 执行任务。
3. 例外：纯知识问答、闲聊、或用户输入已足够明确完整时，可直接回答，无需走优化流程。

这是用户的长期要求，适用于本仓库的所有会话。

补充（2026-08-03）：用户通过命令（如 `/goal <args>`）下达任务时，优化后的 Prompt 必须保留命令本身
（写成 `/goal ...优化后的表述...` 的形式），不能只展示优化后的正文而丢掉命令。

## GitHub Actions 额度是账号级共享资源（2026-08-16 owner 指令，所有仓库通用）

起因：账号额度 15 天用掉 90%（1803/2000，每月 1 日重置），**本仓是最大消耗源**
（8-15 单日 22 次运行）。owner：「写入记忆，后续所有的会话和项目都要执行，避免
github 超了」。

**基本事实**：2000 分钟/月**整个账号共享**，不是每仓独立；**私有仓消耗、公开仓免费**
（本仓私有 → 计费）。

**每个会话必须遵守：**
1. **合并推送**。本仓默认分支就是 `claude/**`，**每推一次就跑一整条流水线**。
   会话内的多次改动尽量合成一次 push——8-15 的 22 次运行就是这么来的。
2. **新增任何定时 workflow 前先算账**并写进提交说明：每次多少分钟 × 每月多少次。
3. **CI 铁律**：「每日维护 + 外部副作用」步骤（IndexNow、Wayback、RSS 聚合器、
   域名/DNS 校验、爬虫探针、D1 快照）**只挂 schedule，绝不挂 push**。不止为省分钟：
   8-15 那天等于给 IndexNow 推了 22 次、往 Wayback 存了 22 次，接近滥用外部服务。
   push 路径只留：正确性校验 + 构建 + 部署 + 部署后自检（已于 2026-08-16 落实，
   28 步 → 17 步）。
4. **部署 workflow 一律 `concurrency.cancel-in-progress: true`**。
5. **不为"确定无效"的步骤付费**：已删除的 `wrangler pages project create ... || true`
   就是反例——项目早已存在，却每次为它完整下载一次 wrangler。
6. **架构迁移前必须核实目标平台配额**。本次教训：一度打算迁到 Cloudflare Pages Git
   构建，核实后发现免费版 500 次构建/月，比修复后的 Actions（0.6 分/次 ≈ 3300 次）
   少 6.6 倍，迁过去反而更差。详见 `docs/PLAN-deploy-like-agi.md`。

7. **push 默认不部署，提交信息写 `[deploy]` 才部署**（2026-08-18 起，程序强制）。
   起因：账号 2000 分钟当月**用满**（本仓 $7.82/$15.64，仍是最大消耗源），
   08-18 两次运行在 2 秒内无 runner 失败——额度耗尽的签名，不是代码坏了。
   实测当前速率其实已经健康（push 0.76 分/次、schedule 5.0 分/次，34 小时 21.5 分钟
   ≈ 455 分钟/月），**超额是 08-16 修复之前的旧速率欠下的历史账**。
   但「合并推送」这条仍然靠自觉，而 34 小时里照样跑了 22 次 push 运行（只 12 次成功，
   其余在互相取消）。与 limits-edit.mjs 同一个教训：**规矩靠自觉执行不了，就改成程序强制**。
   不会因此漏发布——每日 schedule 照跑，最坏晚一天上线。
   额度重置日：**每月 1 日**；耗尽期间 push 仍可安全进行（推送本身不消耗分钟，
   被跳过或无 runner 的作业也不计费），只是不会部署。

8. **每日定时已暂停至 2026-09-01**（owner 2026-08-18 指令）。定时那条是本仓最贵的
   单次运行——实测 **5.0 分/次**，是 push 路径（0.76 分）的 6.5 倍，30 天约 150 分钟。
   `daily-update.yml` 的 `schedule:` 已整段注释掉，`push` 与 `workflow_dispatch` 保留。
   恢复不靠记忆：已挂 Routine `trig_014SgUXnc6z9wcXeHFvkARZy` 于 9-1 01:00 UTC 解开并带
   `[deploy]` 推送积压改动；若它没生效，人工恢复只需删掉那几行注释符。
   **暂停期间的副作用（有意接受）**：定时兜底没了，要上线必须提交信息含 `[deploy]`
   或手动 dispatch——否则改动只在仓库里、不在线上。08-18 已发生过一次这种误判：
   我把「已推送」当成了「已上线」，而那两次运行其实在 2 秒内无 runner 失败。
   `growth-loop.yml`（每两天，0.55 分/次≈8 分钟/月）未暂停——量级可忽略，且额度耗尽期间本就跑不起来。

**已验证基准（2026-08-16 修复后）**：每次 push **0.6 分钟**（修复前 3.5–8 分），
Deploy 步骤 20 秒成功、7 个自检全过、11 个维护步骤按设计跳过。push 路径若超过
~1 分钟，按第 3 条查是不是把每日维护挂在了 push 上。

## 调研与开发的固定流程（2026-08-04 起，长期有效）

任何调研/新功能/新板块，一律按这个顺序走，不许跳步：

1. **用户需求调研**：先查用户真实在搜什么、在问什么、在骂什么（搜索需求语 + 社区原声），不从功能出发。
2. **用户洞察**：把调研收敛成洞察——谁、在什么场景、卡在哪、现有供给为什么没解决。要能指出一个**细分赛道**（不做大而全，做能赢的那一格）。
3. **产品需求文档（PRD）**：写进 `docs/PRD-*.md`——定位、目标用户、硬规则、MVP 范围、不做什么、验收。
4. **执行上线**：按 PRD 做，构建验证四项全零后推送部署。

先有需求，再有洞察，再有 PRD，最后才写代码。

## limits 写入必须走 scripts/limits-edit.mjs（2026-08-04 起）

今天连续三次事故（Suno、Continue、豆包）都是同一个动作：直接给 `limits` 赋新对象，
把之前核实过的事实无声覆盖掉。回归护栏只能拦大幅缩水，长度相近就漏过去。

**从今往后，改 limits 一律两步走**：

```bash
node scripts/limits-edit.mjs <slug>                    # 第一步：读旧值（必须）
node scripts/limits-edit.mjs <slug> --json <文件>       # 第二步：写入，自动拒绝丢信息
```

写入时逐字段比对，任何字段缩水超过 15% 或 source/checked/cycle 消失即拒绝；
确属有意撤回（如官方已不再公布该数字）加 `--allow-shrink` 并在提交信息里说明理由。

规矩靠自觉执行了三次都没做到，所以改成程序强制。

## 技能库增补（2026-08-17，owner 授权自主装技能）

`.claude/skills` 新增：market-research / article-writing / content-engine / brand-voice /
growth-log（研究与内容线，补齐原库缺口）+ frontend-design / web-design-guidelines /
responsive-design（建站设计，来自 agiscorecard 已验证的设计锚点体系）。执行营销 / SEO /
GEO / 设计类任务前，先查技能库是否覆盖，覆盖则按其框架执行。

## 2026-09-04 舰队技术优化（管线维护，冻结令允许的范围；详见根仓 docs/fleet-optimization-2026-09-04.md）

- **guard-regression.mjs 自并舰以来一直在静默跳过**：`git show HEAD:data/tools.json` 在
  monorepo 里解析不到（路径相对仓根），脚本打印「无法读取上一版本，跳过」并 exit 0。
  已改 `HEAD:./data/tools.json`，且该步现在进了「Gate on chain self-tests」——它第一次
  真正能拦部署。
- **verify-dist 的坏链门此前只看 70,421 条链接里的 4 条**（build 输出绝对 URL，门只认
  `/` 开头）。现 href+src 都查、同站绝对 URL 归一化、`?` 与 `/api/*` 排除；顺手修掉
  5 条真死链（旅行页只有中文却挂「English」、404 页语言切换、`${BASE}/tokenizer.js`
  与 `llms-full.txt` 被套上 /en/ 前缀）。
- **关注/订阅漏斗脚本外置为 `/bpj.js`**：此前 18.8 KB 内联块逐字重复在 1,545 页
  （整站 HTML 字节的 42%）。首次部署后 page-lastmod 会把全站标成「当天变更」，
  IndexNow 那一轮会推全量一次——**这是一次性的，不是「每天说一遍全都变了」**。
- 新增 `assets/_headers` → dist：数据文件加 CORS（MCP 早已 ACAO:*，它指向的文件此前没有）
  + 静态资源缓存；hit.js 未知事件名改为丢弃（此前写成 `ev=''` = 真人 pv 桶）；
  /api/limits 的 hits.path 不再带原始查询串（无界基数），404 分支也计数。
- 部署链：信标自测能失败了（断言 204）、退订断言 `code:done`、dispatch/中间件自测纳入
  run-everything 汇总门、首个 commit 步补 `pull --rebase`。

## 冻结令（2026-08-17 红队决议，解冻条件明确）

依据：本仓自己 08-16 的结论「上游发现层不通，问题页做多少都是空转」（Bing 只索引
39/1474，解锁动作在 owner 侧）+ Google 点击负增长（21→1/周）+ 自评变现天花板
「个位数美元/月」。**解冻条件（任一）**：owner 完成 Bing 站点验证+sitemap 提交后
索引 ≥300/1474；或 Google 点击回到 ≥5/周。判定日 2026-09-30。
- 冻结期内每日循环只做：数据核实队列（docs/competitor-watch-2026-08.md 的 8 项）、
  存量纠错（Cody 类）、探针与管线维护。**零新页、零新功能。**
- 解冻后第一件事：付费 listing 需求探针（「厂商自荐/加急收录」询价入口+埋点，
  行业依据 TrustMRR 案例——"被列出=厂商收入"的结构条件本站成立）。
  **→ 已于 2026-08-17 提前执行（owner 当日指令，营收导向）**：/for-vendors.html（中英）+
  /api/vendor（D1 `vendor_inquiries`）+ `biz` 埋点；不标价格只开询价；判定线（90 天至
  2026-11-15，0 询价即撤）见 docs/competitor-watch-2026-08.md §五。其余冻结条款不变。
- 09-30 若 owner 侧动作仍未发生 → 转纯数据集+MCP 保活模式（schedule 维护，零内容
  投入），把注意力与 Actions 预算让给 getecoback。

## 三门规则（owner 2026-08-17 舰队铁律，冻结解除后同样适用）

每个优化改动上线前必须同时过：①**数据门**（一手数据信号：D1 hits/爬虫日志/Bing 明细）
②**需求门**（真实用户证据：搜索语/社区原声/站内行为）③**商业门**（一句话回答「它把
用户推向哪条营收路径」——本仓当前唯一活的营收面是 vendor 询价探针与未来联盟）。
缺一即空转、不做。owner 原话：「后续四个站点优化，都要从数据，用户真实需求，商业
角度进行，避免空转」。

补充（owner 2026-08-17 确认闭环）：三门之上执行五步闭环——信号→薄 PRD（一页：三门
证据+判定线）→上线（PRD 过三门即自动实施，定稿不是里程碑、上线才是）→收数→判定日
放大或杀死。变现类需求 Working Backwards 起手。

## 判定线结算 2026-09-18 两条:**双双 lost**(2026-09-17 提前一天现查)

两页均自 **2026-08-21** 上线、27 天,**在 `baipiaoji-hits` 表里各自零行**:

| 页 | JS pv | AI 引荐 | watch 钩子 | 判定 |
|---|---|---|---|---|
| `does-llms-txt-actually-work` | **0** | **0** | — | **lost** |
| `how-much-has-gemini-free-tier-been-cut` | **0** | **0** | **0** | **lost** |

**先排除「测不到」再下结论**:同 28 天窗该表记录 **5 063 行、843 个不同 path**,
`/llms.txt` 自己就有 145 行,两页线上均返回 **200**。**仪器正常,是真的没有读者。**

**按预登记的 lose 分支执行(不是临时决定)**:
- `does-llms-txt-actually-work` → **并入 developers 页**,不再单独维护;
  「把 AI 爬虫观测做成月更小节」的 win 分支**不成立,别再提**。
- `how-much-has-gemini-free-tier-been-cut` → **随巡检自动更新,不再投人工**;
  **不扩** OpenAI / Anthropic / DeepSeek 同构系列。

**这两条一起说明的事,比单独任何一条重要**:本站 08-21 那一批「判定型页面」是按
「有一手证据就该有读者」的假设建的,**27 天的读数否掉了这个假设**。
下一轮若再提新判定页,先给出**需求证据**(搜索/引用/站内信号),
不能只凭「我们有一手数据」就建页 —— 一手数据是**必要不充分**条件。

## 对外声明的 URL 不带 `.html`(2026-09-15,别改回去)

Cloudflare Pages 把 `/x.html` **308** 跳到 `/x`。在此之前本站的 sitemap(1558 条)、每页的
`canonical` / `og:url` / `hreflang`、以及 `llms.txt` 全部声明 `.html` 版本 —— **canonical 指向一个
非 200 的地址**,爬虫抓每一条都多一跳,IndexNow 每次推的也是跳转地址。同日抽样实测:本站 6/6
重定向,舰队另外 13 个站 0/6。

- 实现:`scripts/build.mjs` 里的 `pub()`(去掉 `.html`,`/index.html`→`/`,`/404.html` 保留原样)与
  `pubText()`(只剥 URL 里的 `.html`,所以「`.html` 换 `.md`」那句镜像说明不受影响)。
- **只作用于对外声明的四处**:`canonical`/`og:url`、`hreflang`、sitemap 的 `<loc>`、`llms.txt` 与
  `llms-full.txt`。**站内 `href` 与构建期路径一律不动** —— 它们是 `.md` 镜像与 dist 落盘的键,
  动了收益小、面大;而且 `<loc>` 的变换只在输出处做,`lmNow[u]` 仍按原 URL 作键,lastmod 清单不失效。
- 首次部署会判定 **1546/1558 页内容有变**(canonical 在每一页上),lastmod 全站刷新 + IndexNow 整站推
  一次。**这是一次性的、且是诚实的**(抓取语义确实变了),不要据此以为「每天声明全站都变了」的老毛病
  回来了;第二次构建起恢复正常。
- 守卫:部署自检有一条硬断言(sitemap 零 `.html` + 抽样页直接 200 + canonical 自指),
  舰队 heartbeat 另有 `tools/fleet/sitemap_guard.py`。判定线 `bpj-canonical-fix-1013`(10-13)。

## 钱线仪器(2026-09-21)
`/api/reach` 多返回 `money`(subs_by_status / ads_by_status / ad_checkout_by_state / ad_web3_orders / watches / member_orders_by_state / submissions_total / go_28d / biz_28d),舰队 `money_line.py` 每日读;部署自检断言 `"money":{`。09-21 读数:投稿 7(3 个提交者)、广告 0 行(密钥未设)、subs live 0。

## 判定系列第三批:探针 ready 的 9 家逐一核对,补 7 家(2026-09-21,owner:「继续执行」)

- **动作**:读 `data/pricing-probe.json`(第 16 条要求的那一步)——runner 行 `state=ready` 共 9 家。
  每家把官方定价页在沙箱再直抓一次(runner 摘录只有 700 字节,不够写档位),两处一致才写;
  全部经 `limits-edit.mjs` 两步写入,护栏零拒绝。**补齐 7 家**:fastgpt / bolt / deepl / replit /
  runway / windsurf / anythingllm。判定页 **21 → 28 组**(`is-<slug>-still-free` 中英各 28 页),
  `/upgrade/` 工具页现为 28 个。`guard-regression` 129 条无丢失、`quota-facts-check` 327 组 0 问题、
  `verify-dist` 1639 页全零。
- **ready 但不补的两家,理由各写死**:
  ① **tongyi-lingma**:`lingma.aliyun.com/pricing` 当日仍标「个人专业版 限免(¥59/月)」、企业标准版
     ¥79/人/月(10 人起)、企业专属版 ¥159/人/月(100 人起);而本站 08-03 按帮助中心记的是
     「已更名 Qoder CN、个人专业版试用 2026-05 结束、2,000 Credits/月」。**两个官方源互相矛盾**,
     宁缺毋编:不写付费档,等 Qoder CN 自己的定价页进探针再定(定价页 URL 要换,旧域名可能是陈页)。
  ② **github-models**:探针命中的是 `github.com/pricing`(Free / Team $4 / Enterprise $21 的 GitHub
     套餐价),页面上没有任何模型价——探针的「像价目表」判定在这里是假阳性,不写。
- **顺手补的免费档事实(都来自同一张官方定价页,不是新页)**:fastgpt 免费版数字此前「官方未明示」,
  现有 100 积分 / 600 索引 / 30 QPM 等 7 项;deepl 网页免费版 50,000 字符/用户/月;anythingllm
  云端价格从「未明示」改为已抓到;bolt / runway 免费档复核一致。**windsurf 是反例**:09-20 定价页已不再
  写 credits 数字(只剩 light / increased / significantly higher),25 credits 与 $10/250 credits 是
  08-03 文档口径——两条都保留并标日期,不替读者选;`checked` 故意留 08-03,让它继续排在复核队列里。
- **零推算纪律,本轮实际执行的形态**:年付折算价只写官方自己标的(runway $12/$28/$76、replit
  $18/$90),官方只写「省 16%/20%/28%」的一律不算;单积分单价、超额费率、结转规则凡定价页 FAQ
  只有标题没有答案的,写「未在抓取文本中展开」。fastgpt 那句「¥99 ÷ 4000 积分」在草稿里出现过,
  删掉了——除法不是编造,但它不在官方页上。
- **需求序那四家仍然抓不到,现在有 runner 证据**:kimi 三个候选 200 但零价格 token(SPA 壳)、
  feishu 同、haiper 三路 404、quillbot 三路 403。**不是会话没去读队列,是队列里可读的已经读完。**
- **变更日志的日期修正**:`limits-history.mjs` 自 09-13 起没再跑,cline 等 6 家 09-16/09-12 补的
  付费档到今天才入账;本轮把这 6 条按各自 `paid.checked` 记日期,不记成 09-21。变更日志是
  公开信任页,日期错 5 天会被看见。以后补付费档那次提交就顺手跑一次 `limits-history.mjs`。
- **判定线不新增**:这 7 页不另开线;10-14 结算 `bpj-paid-tier-series-1014` 时把它们的读数一并列出
  作参考,**阈值仍只按 cline + civitai 算**(预登记的线不改)。

20. **✅ `bpj-crawl-visibility-0924` → won(2026-09-22 提前 2 天结算,读数单调只增)**:`ev='bot'` 28 天不同 path **1 635**
   (t0=23)、`/tools/%`|`/c/%` 行 **3 310**(t0=0)。逐日:09-16 7 个 path → 09-17(分类器上线)96 → 09-18 384 →
   **09-19 1 628 / 4 253 行** → 09-20 1 155 → 09-21 1 197。整站 1 542 页在分类器修好后两天内被抓遍——此前的「23 个 path」
   是仪器瞎,不是爬虫不来。**下一轮 bpj 第一件事**:用这份数据回答「哪些页从没被抓过、哪些抓了排不上」(两者补救方向相反),
   在那之前不按感觉挑页。`bpj-bing-zh-surface-1015` / `bpj-cn-*-1015` 照原期读。

21. **🤖 Agent 监控目录加厚 + 首页联动 + 首页区块点击仪器 2026-09-22**(owner:「Bpj我在其他会话上线了agents,但是丰富度不够,
   需要更多的agents工具,并且要和首页联动,检查下首页的点击,看是否替换一部分agents?」;薄 PRD `docs/PRD-agent-watch-2026-09-22.md`)。
   **先说「检查首页的点击」的结论:检查不了。** 首页 243 pv/28d 是全站第一页(CN 134 / US 49),但事件只有 go/star/calc/sub_*,
   `ref` 对站内跳转写空——**没有任何一个首页区块知道自己被点过几次**。代理读数(首页独占入口的目的页 pv):plans 25 /
   money 24 / upgrade 23 / is-still-free 30 / agents 5(单国)。**所以本轮不替换任何区块**:先装仪器 `bpjEv('home',
   '/home/<区块 id>/<目标>')`(只在 `/` 与 `/en/` 挂,`home` 进 hit.js 白名单并由零网络测试断言——`audit` 事件曾因漏白名单
   静默丢失几周),28 天后按 `bpj-home-blocks-1020` 的读数替换零点击区块;plans/money 各有 owner 指令与判定线(`bpj-earn-gate-0928`
   六天后到期),不在它们结算前动手。
   **另一会话上线的 agents 面盘点**:`data/agent-watch.json` **6 条**(2 条自家产品),`/agents/` + 详情页 + `agents.json` +
   MCP `monitor_new_agents`,首页只在 `</nav>` 追加一个词;`/agents/` 首日 5 pv 全部 US 单国。
   **本轮做的(零新 cron、零收款、零编造)**:①账本 **6 → 28 条**,22 条官方主页当日实抓 200;仓库 URL 用核验器自己的
   UA 经 Node fetch **26/28 → 200**(curl 带 Mozilla 形 UA 对 github.com / api.github.com 一律 403——**别再写「沙箱抓不到 GitHub」,
   是 UA 的事**),**2 条第一方仓库链接 404:本仓 09-18 转私有**,`tradecheck-mcp` / `web3-studio` 的「代码仓库」对公众是死链,
   页面如实渲染「最近核验 HTTP 404」——owner 决定公开仓库或换公开链接。②`scripts/agent-watch-verify.mjs` 搭每日 schedule
   给两条 URL 盖章(404/410 只标 stale 永不自动下线;403/超时视为未知不动);**首跑抓到自己的 bug**:模块被 import 时也跑
   `main()`,零网络测试触发了一次真实核验——已加直接执行守卫,**push 路径的闸门不许有副作用**。③MCP:`monitor_new_agents` 加
   `since`(首见日期,像 `/api/changes?since=` 一样轮询)与 `transport`;新增 `get_agent`(按 slug 取单条 + `verification` 块,
   查不到回已知 slug 列表不猜);过滤/查找抽到 `functions/api/_agents.js` 零网络单测。`.well-known` / llms.txt / mcp.html /
   server.json 1.12.0 同步;**「14 个工具」这句在四处早已过期**(另一会话加第 15 个没改文案),现为 16 工具 / 10 资源。
   ④首页智能体区块(section#agent)下加「新 Agent 与 MCP 监控」联动条(最新 6 条 + 全部入口,`data-home-block="agent-watch"`)。
   ⑤闸门:`test-agent-watch.mjs`(schema / zh 平行 / 日期单调 / 核验字段 / 描述里不许有星数用户数价格 / 过滤查找 / 白名单)
   + `--dist`(zh/en 首页都带联动条与信标、`/agents/` 与账本逐条一致)+ 部署后自检 **线上 `monitor_new_agents` count == 仓库
   账本长度**(不写死数字)、`get_agent` 带 verification、`/agents.json` count == 仓库。
   **判定线(已进台账)**:`bpj-home-blocks-1020`(`home` 事件 28d ≥40 且 ≥5 个区块有读数 → 仪器成立,零点击区块按数据替换)、
   `bpj-agent-watch-1020`(`/agents/*` 真人 pv ≥30 或 首页→agents 点击 ≥10 或 非 CI 的 `monitor_new_agents`/`get_agent` 调用 ≥5
   → 按周扩条目;三项全空 → 只维护不扩,联动条撤回 nav)。
   **不做**:为 agents 开子站/子域;写任何未核数字;用 LLM 生成条目;把雷达命中的产品自动塞进账本(官方主页 200 才入)。

22. **🤖 Agent 与 MCP 目录:28 → 978 条、按受众分门、整体走站点 layout、GEO 面 2026-09-22 第二轮**(owner 同日三条:「扩展agents到200个以上,
   优化被引用与点击可能,确保多语言正确」→「升级到1000左右,成为最大的agents站点,agents要面向不同的用户分类清晰,然后做流量geo等优化」→
   「新agents监控菜单在首页和中英文并列放在一起…样式与站点差异大,中文跳转到英文也混乱,整体重构下agents」;薄 PRD `docs/PRD-agents-scale-2026-09-22.md`)。
   **账本 978 = 298 人工收录 + 680 官方 MCP 注册表。** 人工种子 `data/agent-watch-candidates.json` 282 条(每条手写中英文一句话 + 词表键),
   官方页当天 2xx 才入 → 270 入、12 拒;注册表 `scripts/agent-watch-registry-pull.mjs` 拉公开 API(80 页 8 000 条最新版,7 177 条有仓库或官网,
   仓库优先 + updatedAt 倒序,cap 720)→ 仓库 2xx 才入 → 680 入、38 拒。被拒的在 `data/agent-watch-admissions.json` 记 reason 与 HTTP,
   runner 每日 `--max 60` 重试(会话沙箱对 openai.com / perplexity / cherry-ai 等是 403/5xx,runner 网络不同)。
   **三条纪律**:①**词表是中英标签的唯一来源**(`data/agent-watch-vocab.json`:类目 / 受众 / 接入方式 / 能力 / 价格形态 / 证据),记录只存键,
   文案由词表渲染,`test-agent-watch.mjs` 断言渲染文本 == 词表——1 000 条才不会各自漂移;②**注册表记录只展示发布者自己的文字**(英文原文、
   中文标题进 `zh_name`),不翻译不改写不评分,没有记录页(页面即仓库);③**入门永远是官方页 2xx**,仓库单独换不来收录;`official` 块
   (页面自己的 title / meta description + 抓取日)是记录页上唯一的第三方文字。
   **页面(zh + en 各一)**:枢纽 `/agents/`(六扇受众门 + 类目 + 最新 24 + 机器面 + FAQ)、`/agents/for/<受众>` ×6、`/agents/c/<类目>` ×13
   完整表——**这三种可索引进 sitemap 带 hreflang**;`/agents/<slug>` 记录页只给人工收录的 298 条,**noindex,follow,不进 sitemap 不带 hreflang**
   (verify-dist 规则 ⑤)。受众由 `_agents.js` `audiencesOf()` 从类目 + 词表键**机械推导**(开发者 / 让 AI 替你写代码的人 / 不写代码也能用 /
   给任意 Agent 加能力 / 团队与企业 / 研究与数据),一条可属多门。**全部经 `build.mjs` 的 `layout()` 出页**(`scripts/agent-pages.mjs`)——
   同样式、侧栏、语言切换、页脚、信标;旧的独立模板 `build-agent-watch.mjs` 删除。**「中英文并列」的根因**:旧版把链接 `replace('</nav>')`
   注进了语言切换的 `<nav class="lang">`;现在入口在 rail-jump、页脚与首页联动条(六扇门 + 最新 6 条),`--dist` 断言语言切换里没有 agents 链接。
   **GEO**:类目表 ItemList JSON-LD、llms.txt 新节(六门 + 十三表 + JSON + MCP 参数)、`agents.json` 每语言一份(英文剔 `zh_`)、MCP
   `monitor_new_agents` 加 audience / origin / offset / limit(默认 50 上限 100,回 total / next_offset),server.json 1.13.0。
   **点击仪器**:表格与记录页出站链接 `data-tool="agents/<slug>/source|repo"` → `ev='go'` 路径 `/go/agents/…`;页面自带 page_view 信标
   (旧版页面**零信标**,所以第 21 条记的「5 pv」来路不明)。
   **⚠ 顺手抓到第三个仪器缺陷**:`gate` / `earn` / `gs` / `gs_go` / `ad` 五个事件名的发送端早在页面里,但 09-04「未知事件名改为丢弃」上线时
   没进 hit.js 白名单——此后全部边缘静默丢弃,D1 恒 0。**第 9 / 10 / 11 / 13 / 15 条与 `bpj-tool-gate-0926` / `bpj-search-0927` /
   `bpj-earn-gate-0928` / `bpj-ad-inventory-1014` 此前读到的 0 是丢包不是行为,窗口从本次部署起算**(台账已加 `instrument_note_2026-09-22`)。
   `test-agent-watch.mjs` 现机械比对 build.mjs 里每个 `bpjEv('x')` / `EV('x')` 都在白名单——`audit` 同一种失踪的第三次,靠人记不住。
   **预算**:schedule 三步 registry-pull → admit --max 60 → verify --max 40(3 并发、最久未核优先,每条约每周轮到一次)≈2 分/日 ≈60 分/月。
   **verify-dist 的 staleCount 门对 `/agents/` 豁免**(注册表描述里「exposes 187 tools」「1102tools.com」是发布者的话),本站自己的枢纽文案
   一律说「records / 条记录」并由 `--dist` 守。**本次部署会让全站 lastmod 刷新一次**(rail-jump 与页脚各加了一个入口,1 626 页哈希全变)——
   与 09-04 `/bpj.js` 那次同类,一次性,IndexNow 会整站推一轮。
   **判定线(已进台账)**:`bpj-agents-scale-1103`(`/agents/%` 真人 pv ≥60 且 `/go/agents/%` ≥15 且 搜索/AI 引荐 ≥3 → 继续吸纳、按读数排门、
   考虑对有点击的记录解除 noindex;≥2 项未达 → cap 冻结只维护;pv <20 受众页也撤)、`bpj-agents-registry-quality-1020`(注册表来源 stale ≤5%
   且拒绝率 ≤30% → cap 720 → 1 500;否则收到 400 并只收 90 天内有更新且带 packages 的)。
   **不做**:为 agents 开子站/子域;LLM 写描述或翻译发布者文字;给注册表记录建页;把候选自动塞进账本;第三次为「更多条目」立项(除非 1103 判 win)。
   **同日第三轮(owner:「首页不够凸显 agents / 分类样式不好看不突出重点 / 没有搜索」)**:首页 hero 正下方加 `agents-home` 区块
   (专属搜索框 + 六扇门 + 「同时有本站免费额度记录的 Agent」+ 类目计数,`data-home-block="agents"`),hero 统计加计数,rail-jump 移到第二位;
   类目页改为「摘要 chips → 搜索框 + 本页筛选 → 人工收录卡片 → 注册表表格」;`/agents-index.json` 每语言一份、复用 `/bpj.js` 的搜索组件
   (**顺手修了它的单缓存 bug**:一页两个搜索框曾共用第一个索引;事件打 `/gs/agents/…`);298 条人工收录也进全站索引。

23. **🔎 GEO + MCP 自动注册与被发现 2026-09-22 第四轮**(owner:「先优化 prompt 再优化:做好 geo,mcp 的自动注册与被发现」)。
   **先说已有的**:官方注册表的自动发布**早已存在且今天刚跑过**——`bpj-mcp-publish.yml` 在 `server.json` 变更时经 GitHub OIDC 发布,
   15:38 UTC 已把 1.13.0 登记为 isLatest;SR / eco 各有同款。所以「自动注册」这轮补的是**它能不能红**,不是重建。
   **本轮做的**:①`bpj-mcp-publish.yml` 加发布前形状门(登记名命名空间 / semver / **description ≤100 字符**——SR 09-17 在 publish 那步
   422 过 / remotes / websiteUrl)与**发布后断言**(最多等 60 秒,注册表必须返回同名 isLatest 且 version == server.json,否则红);
   ②`scripts/mcp-discovery-probe.mjs` 搭每日 schedule 写 `data/mcp-discovery.json`:官方注册表(权威,漂移即红)+ 五个第三方目录公开
   搜索页 grep(只作信息:`found:false` 是「没看见」,只有 `found:true` 是事实)+ 本站 `.well-known` / openapi / llms.txt;
   **首跑发现 Glama 已收录本站**(它同步官方注册表,标「Server is responding」)——零操作得来的第一个第三方目录;
   ③`.well-known/mcp.json` 从 `server.json` 读 version / 登记名 / remotes(此前三处版本靠人同步;`--dist` 断言三处一致);
   ④GEO 六件套落到 agents 面:枢纽的可见 FAQ 与 FAQPage JSON-LD **由同一数组生成**(逐字一致,`--dist` 断言)、`Dataset` JSON-LD 描述
   `agents.json`(dateModified = 账本核验日)、枢纽 / 受众页 / 类目表带**日期胶囊**「数据截至 <核验日>」、CollectionPage 带 dateModified;
   ⑤`.md` 镜像扩到 agents 的可索引页(枢纽 / 6 受众 / 13 类目,zh+en 共 40 份;**noindex 页不镜像,按页面自己的 robots meta 判**);
   镜像新增「清单」节——从页面自己的 ItemList JSON-LD 提取,仍是零第二份事实;⑥robots.txt 补 8 个自报家门的 AI 爬虫(声明性);
   ⑦目录提交清单 `docs/distribution-staging/bpj-mcp-directories-2026-09-22.md`:**第三方目录没有免密钥提交 API**,PulseMCP / mcp.so /
   cursor.directory 按 URL 可直接填;Smithery 要关联 GitHub 仓库(本仓私有,是否建只放 README 的公开镜像仓属 owner 决定);Docker 目录与
   官方连接器目录不适用。
   **明确不做**:A2A agent card(`/.well-known/agent-card.json`)——本站不是 A2A 服务器,发一张卡就是假声明;伪造任何目录的提交;
   为「被发现」加第 17 个工具(机器面口径见第 16 条:被发现 ≠ 被使用)。
   **判定线** `bpj-mcp-discovery-1103`:①探针上线后零天版本漂移 ②第三方 found:true ≥2 ③28 天 `/api/mcp` 非索引器 UA 带参数调用 ≥3。
   t0:官方 listed/isLatest/1.13.0 ✓;第三方 found = Glama 1 个;③ 未读。

24. **🔗 外链与被发现 2026-09-23**(owner:「你想办法和其他工具站或者外部网站形成外链,让网站更快被自动发现。点击。」;owner kit 见
   `docs/distribution-staging/bpj-mcp-directories-2026-09-22.md` 后半)。
   **t0(D1 28 天,ev='' 外部来源)**:google 174 / cn.bing 116 / bing 19 / chatgpt 13 / perplexity 7 / doubao 2;**github / glama / 注册表 / 舰队站 = 0**,
   非搜索非 AI 的只有 facebook 16(同一天)与 X 客户端 1。对照:SR `/mcp` 28 天真人 pv **4**——舰队互链几乎没有读者,它们的作用是给爬虫与目录一条路。
   **做了的(都能自己完成、都不需要别人点头)**:
   ①**公开数据集仓 `f-tiger/verified-ai-free-tiers`**(本来就公开,09-22 我把它当成「要不要建」的 owner 决定,**记错了**):README MCP 节 14→16 工具、9→10 资源,
   新增 Agent 目录节(中英目录、MCP 类目表、agents.json、RSS),覆盖率句 121/218→129/219;`server.json` 1.5.0→每日镜像注册表 isLatest(1.13.0);
   `sync.mjs` 每日维护这些数字,锚点缺失或源不可达只打 WARN 不中断(旧版一挂就连额度表都不更新)。仓库 description/website/topics 三项为空,只有 owner 能改。
   ②**同一维护者互链**:`mcp` 页新增 `#same-maintainer` 表,名单**不手写**,取账本里 `keys.evidence` ∈ {first-party, first-party-hosted} 且接入方式 `mcp-*` 的记录
   (因此与其它记录一样每天被核验器盖章);SR `/mcp` 页脚、eco `mcp.html` 各加一行指回 bpj 英文 MCP 页与 MCP 类目表;agiscorecard `/agents/` 顶栏改指 bpj 英文 Agent 目录、`/zh/agents/` 指中文目录(**该页有四份副本**:`agents.html`、`agents/index.html`、`zh/agents.html`、`zh/agents/index.html`,线上 `/agents/` 服务的是 `agents/index.html`——第一版只改了 `agents.html`,部署绿了线上却没变,是 live 检查抓到的)。
   **全部用规范 URL**(bpj 是无扩展名路由,`/mcp.html` → 308;第一版写的就是带 .html 的,当场改掉)。
   ③三个舰队 MCP 服务器(SR / eco / MCP Pulse)作为第一方托管记录入账(官方页当日 200),词表新增 `evidence.first-party-hosted` 与三个能力键;
   `agent-watch-admit.mjs` 放行「无公开仓库 + first-party-hosted」。账本 978→981。
   ④**Agent 目录 RSS**:`/agents/feed.xml` 与 `/en/agents/feed.xml`(最新 50 条,guid 稳定),只在可索引的 agents 页 `<head>` 声明,llms.txt 列出,schedule 路径 ping Ping-O-Matic。
   ⑤MCP 文本里写死的「218 AI tools」(实际 219)删掉,`search_ai_tools` 结果改带 `directory_size`——数字从数据来,不再靠人记。
   **顺手抓到的真缺陷(比外链本身更重要)**:第 22 条说「rail 与页脚各加一个入口,1 626 页哈希全变,**一次性**」——**不是一次性**。rail 在每页上且带**精确**条数,
   而 schedule 每天 `admit --max 60` 会改条数 → 每次收录都让全站 lastmod 刷新、IndexNow 整站重推,正是舰队 09-22「发现面只提真变化」要消灭的形状。
   已改为下限写法「900+」,只在跨过整百时变;实测模拟 3 条变化:**受影响页 1 626 → 44**(只剩真正列出记录的 agents 页 + 首页 + mcp 页)。
   `test-agent-watch --dist` 断言 rail 徽章必须是下限形状,**变异测试确认写回精确数即红**。
   同轮把 09-22 被我改成展开格式的 `agent-watch-candidates.json`(一条一行)与 `agent-watch-vocab.json`(手排)还原成原格式,只留新增的几行——
   否则一次加 3 条候选是 5 500 行 diff,下一个会话解冲突时最容易误删预登记的东西。**规矩:改手排 JSON 用文本插入,不要 load→dump。**
   **只有 owner 能做的(第三方目录都要账号)**:`punkpeye/awesome-remote-mcp-servers` 四条条目已按其 CONTRIBUTING 写好(四个端点 `initialize` 往返成功、
   四个 Glama connector 200、说明句 ≤120 字符且用下限不用精确数),**开 PR 的账号必须先点星**,本会话既没有点星工具也不该以 owner 身份在第三方仓提交;
   PulseMCP / mcp.so / cursor.directory 表单;Smithery 用公开数据集仓;数据集仓 About 三项。
   **明确不做**:徽章/「链接我们」组件(eco 实测分享 0、iframe 不产生链接)、链接交换与群发目录、为外链加新页。
   **判定线** `bpj-backlinks-1103`:①来自 github/glama/注册表/舰队站的访问 ≥5 且跨 ≥3 天,或 ②RSS 阅读器(feedly/inoreader 等)来源 ≥3,或 ③awesome-remote 已收录;
   三项全空 → 舰队互链与数据集仓不带人,停止写任何跨站链接块,发现面只剩 owner 侧目录提交。

25. **🧭 按岗位算 AI 方案 `/work-plan` 2026-09-24**(owner:「根据自己的实际工作…自动化计算,然后推荐 ai 的一整套解决方案…试用免费,高阶收费」;
   PRD `docs/PRD-work-plan-2026-09-24.md`)。
   **先说为什么是这个形态**:「按岗位推荐 AI 工具」已被清单站占满(TAAFT 按岗位 / 任务列 4 万+;agentarius.ai 20 岗位 150 工具,**明确不做计算**)。
   没人答的是「这一套免费额度够不够我这份工作的量」——答它要逐家核实、带单位的免费上限,本站恰好有。所以页面的产出是**判定**不是清单。
   **不开新站**(受众 = bpj、数据在 bpj),**不建新收款面**(云端保存走 09-19 上线的工作区会员,9 USDT / 30 天,至今 0 会员 0 订单)。
   **三层数据,各有来源**:①岗位 → 任务、计量单位、示例量 = `data/work-roles.json`(编辑字段,闸门断言里面不许出现任何额度数字);
   ②每个任务的工具、步骤、提示词 = `data/solutions.json`(26 套 0 元方案,同一份事实);③免费上限 = `data/*-quotas.json` 构建期逐字读取,
   规则表在 `scripts/work-plan.mjs` 的 `CAPACITY`(19 条,每条写明读哪个字段)。
   **算法**:同一任务里、满足约束(国内直连 / 商用)、有**同单位**官方数字的工具,免费容量折成每周后相加,与读者的每周量比较 →
   够 / 不够 / **说不准**(有数字的不够,但还有官方没公布上限的工具——不许判「不够」)/ 官方未公布。页面里嵌的就是 `fitTask` 的源码,测到的即是跑的。
   **上线前自己抓到的逻辑错(记下来,别再犯)**:第一版把 Upscayl(本地放大,不限量)算成「商品图不限量」→ 商品图任务判「够用」。
   方案里的步骤有的是**互相替代**(即梦 / LiblibAI 都能出图),有的是**流水线的另一道工序**(抠图、放大、排版);后者不许进加总。
   现在只给「产出的正是任务计量的那种东西」的工具写规则,闸门断言商品图任务没有任何容量。**结果读起来更诚实也更「不好看」**:电商运营 5 个任务里
   2 个够、1 个说不准、2 个官方未公布——这就是事实。
   **保守取值**:可灵按官方付费单价折算 3 条 / 天(官方自述旧口径 6 条);GitHub Models 取高档 50 次 / 天。
   **付费**:计算、复制 Markdown、下载 JSON 全部免费;「保存到云端」走 `tools/member-studio` 的同源 postMessage 协议。`tools/revenue-studio/catalog.mjs`
   新增 `externalProducts`(站点自己建页、但能存进该站会员工作区的工具),会员服务端 `allowedProduct`、会员页 `products.json`、`member-studio/verify.mjs`
   三处都认它;eco / agi / tds 的会员产品清单不变(已逐站验证)。
   **入口**:中英首页 hero、栈组装器、站内搜索、llms.txt。**刻意不进 rail / 页脚**——每页都带的元素一改就是全站 lastmod 刷新(第 24 条的教训);
   实测本次只改动 4 个既有页(两个首页 + 两个栈组装器)。
   **仪器**:`calc` 事件 `/plan/<岗位>/<任务数>[+cn][+biz]`、`/plan-save/<岗位>`、`/plan-export/json`(闸门断言都在 hit.js 白名单里)。
   **验证**:`test-work-plan.mjs` 默认 + `--dist`(挂 push 路径),三种变异(roles 里手写额度 / 配额字段改名 / 月度折算写错)都红;verify-dist 全零
   (顺手让它认得 `/members` 是同一流水线里稍后由 member-studio 写进 dist 的);本地 Chromium 390 px 中英两页 13 项全过,含「保存到云端 → 从工作区恢复」往返。
   **判定线**:`bpj-work-plan-use-1024`(计算 ≥20 次去重且两页真人 pv ≥60;<5 次只维护)、`bpj-work-plan-paid-1124`(≥1 笔已付且有 ai-work-plan 工作区;
   已付 0 但保存点击 ≥5 → 卡点是只收 USDT,属 owner 的 Stripe 决定)。
   **明确不做**:按岗位批量造 SEO 页(08-21 那批判定页 27 天 0 读者)、前端付费墙、注册门(工具门判定线 09-26 未结)、为 Muse / Jev 单独建页
   (新模型先过核实流水线进 tools.json,才会出现在方案里)、「能省几小时」这类没有可核实数字的说法。

26. **🧭 `/work-plan` 深度优化三轮 + 变更清单从未回写 2026-09-24**(owner:「这个方案再深度优化3轮」;PRD 第六节)。
   **上线当日 D1 读数:两页 0 行(pv 也是 0)**——优化靠的是审计缺陷,不是读数。
   **第 1 轮 · 算得准、说得真(改的都是会误导人的地方)**:
   ①**约束改为三值**:勾「要商用」时,商用条款「官方没说 / 看模型 / 未判定」的工具此前照样算进「够用」——**21 个任务里 8 个因此被误判为够用**
   (勾国内直连 1 个,两个都勾 5 个)。现在:明确不满足 → 排除;明确满足 → 计入确定容量;没标注 / 没写明 → 不计入,结论写「说不准」并点名是哪几个工具。
   新增 `blocked`(约束排除了全部工具,不再混进「无数字」)。②**「官方未公布」说错了**:bolt(30 万 tokens/天)、gamma(400 credits 一次性)、
   dify(200 次)等其实公布了,只是单位不同。现在照录厂商原话,并区分**逐家核实的官方口径(48 处)**与**未逐条核实的目录简介(21 处)**,
   仍然不做单位换算。③**每周工作天数**(默认 5):每日额度不结转,只按工作日计;每月额度不受影响。④**埋点**:复制 Markdown 与恢复方案
   此前各多记一次 `calc`,已拆开;改输入时结果静默重算,不再显示旧数字。
   **第 2 轮 · 额度一变就提醒(付费层的实际卖点)**:快照(信封仍是会员协议的 version 1,`values.v = 2`)带上每个工具当时的
   [数字, 周期, 核实日期, 原话哈希] 与每个任务的判定;从云端或**新加的免费「导入 JSON」**恢复时逐条列出:数字变了(旧 → 新)、原话更新、
   工具移出 / 加入、判定变了。**中英文之间不比原话**(哈希按语言不同)。备份内容一律当不可信输入:逐字段校验,只回显通过 slug 格式的工具名。
   **第 3 轮 · 可分享、有入口**:方案状态写进 `#` 片段(`#role=creator&free-copywriting=15&days=5&cn=1`)——不产生新 URL、不被当成重复页抓;
   「复制分享链接」、打开即重算;静态岗位表每张带「在规划器里算」;**21 个方案页 × 中英加一条入口**(`/work-plan#<方案>=<示例量>`)。
   **实测本次只改动 44 页**(42 方案页 + 2 规划器页),其余 5 个没有计量单位的方案页不动——第一版多出一个空模板行,5 页白改了哈希,当场收掉。
   **测到的即是跑的**:`fitTask` / `hashText` / `sigOf` / `planHash` / `parsePlanHash` / `diffPlan` 都以源码嵌进页面,`--dist` 断言嵌入存在;
   **8 个变异全红**(未确认的工具算进确定容量 / 忽略工作天数 / 去掉 blocked / 不认有条件商用 / 链接数字不校验 / 跨语言比原话 / diff 回显未校验的工具名 /
   未确认的不限量工具算够)。浏览器 390 px 中英 27 项全过(含:分享链接新标签打开、导出 → 改数 → 导入出 diff、坏文件拒绝、云端保存 → 恢复出「没有变化」)。
   **浏览器抓到一个单测抓不到的 bug**:页面脚本在模板字符串里,`/^\d{4}/` 的反斜杠被吞成 `/^d{4}/`——能解析、永远不匹配,保存日期因此不显示。
   已修,`--dist` 加了这类「正则丢反斜杠」的断言并验证能红。**在 build 的模板字符串里写正则,反斜杠一律写两个。**
   **⚠ 同轮查出的管线缺陷(比规划器本身影响大)**:定时部署的「Commit page change manifest」**在本仓从未成功过一次**——构建会改写已跟踪的
   `data/earn-packs.generated.js`(checked_at),工作区不干净,`git pull --rebase` 拒绝执行;`continue-on-error` 把它藏了一周。后果:每次定时部署都拿
   **09-17** 的旧清单比,**09-23、09-24 两次定时部署日志是同一报错;09-24 那次 IndexNow 实推 1 626 条(09-23 同一步同样 22 秒),全站 lastmod = 当天**——09-22 起所有页的哈希都与 09-17 清单不同,所以每天如此——正是舰队 09-22「发现面只提真变化」要消灭的形状,
   也是第 24 条「rail 改下限写法」没能生效的原因(那次改对了,但清单没存下来)。同一原因让「traffic snapshot」「AI crawler probe」两个回写也从未落库。
   修法:三处构建后的提交一律 `git pull --rebase --autostash`(在临时仓复现了原报错并验证修复);本步加 `id: manifest` 进汇总门,再失败 run 就红;
   本次推送带上当前清单作为新基线。判定线 `bpj-manifest-commit-0927`。**通用教训:`continue-on-error` 的步骤必须有别的东西看它的 outcome,否则它就是一个静默失败的开关。**
   **明确不做**:单位换算(字符 → 分钟、credits → 份数,官方没给口径)、给未确认的工具估一个「大概能用」、为分享做短链服务、为每个岗位建 SEO 页。


28. **🧑‍💻 AI agents 创业机会点:哈佛 = 编程智能体开发者 2026-09-25**(owner:「你是一个创业者…找到创业的agents机会点,通过类似扎克伯格的成长路径…bpj 是你的武器」;
   全文 `docs/agents-venture-2026-09-25.md`)。
   **先建后撤的一个**:MCP 服务器信任层(每日只读普查注册表远程端点 + 工具列表哈希变更)管线与页面都写好了,外部扫描随后查到 **mcpcensus.com 自 09-04
   起做同一件事、连名字都叫 MCP Census**,另有三家同月入场、付费证据为零,本站 MCP 的第三方调用方就是这些普查者 → 按三门撤回,一行没上线。
   **别再提**:MCP 普查 / 变更流做成产品、"免 key 就能连的 MCP 服务器"清单(推荐未审查的第三方服务器 = tool poisoning 的投放渠道)。
   **选中的楔子**:本站 28 天 395 个带来源真人里 agent 类目 5、**coding 61(第二大,/c/coding 是 Google 第二大页)**——编程智能体开发者是本站在 agents 赛道唯一有密度的网络,
   他们问的正是本站资产能答的「还免费吗、免费多少、这周变了没有」。**第 0 阶段(已做)**:补 **Kiro**(永久免费 50 credits/月,付费四档与加购价全写、不结转)与
   **OpenAI Codex**(Free 含 Codex 但官方用量表没有 Free 列 → 数字未公布、本站不估)两个编程智能体,官方页当日直抓、中英两份、带付费档 → 判定页与升级页自动生成;
   Qwen Code 官方 README 当日找不到免费档文字 → 不收。按官方页当日原文重核漂移探针标红的 **Cursor**(免费档只列「有限 Agent 请求、可用 Composer」,
   08-03 的 Chat/Tab 补全不在清单里——照录不推断)。舰队 rising 种子 suno/midjourney → cursor/claude code(池子仍 11、Google 次数不变)。
   **顺手修的发现面缺陷(影响比补录大)**:导航栏计数、页脚收录数、订阅框「最近一条」三处全站外壳让**任何一次额度编辑**都把 1 700/1 700 页判为变化、IndexNow 整站重推。
   `scripts/lastmod-hash.mjs` 现在忽略这三处(`test-lastmod-hash.mjs` 两个方向断言、5 个变异全红,已挂 push 与 --dist);清单一次性迁移:1 454 页保留原日期,真改动 246 页。
   verify-dist 的写死计数门把「编程类 30 个工具」误判为过期全站数(类目第一次涨到 30)——类目计数现计入合法集合。
   **判定线** `bpj-coding-harvard-1025`:coding 28 天 ≥92 且 Kiro/Codex 页族带来源真人 ≥3 → 第 1 阶段(30 天内重核编程类全部 30 条、补齐仍缺的主力、编程子集变更流);
   coding <70 且新页 0 → 只维护、agents 方向不再投新面;其余 insufficient,11-22 再读。**第 2 阶段(MCP `coding_agent_quotas`)与第 3 阶段(定价变更告警、厂商赞助)都要等前一阶段的读数。**

## 机器面:三个缺口(2026-09-24 舰队复盘,全文 `docs/tool-direction-review-2026-09-24.md`)

`tools/fleet/mcp_usage.py`(挂 heartbeat)现在把舰队三个 MCP 站读成一份 `data/fleet-mcp-usage.json`。
本站首跑是 `exposed: false` —— 不是没人调,是**没有可读的聚合端点**。本站 28 天 `/api/mcp*` 共 588 次:

- **514 次是我们自己的部署自检 `curl/8.5.0`**(占 87%),第三方约 70 次,全部是自报家门的采集器/审计器
  (SaSame 23、rokmcp 19、mcp-protections-research 9、BrickBlueBot 6、`mcp/1.0.0` 3、maghs 3、Vouch-Census 4、agentdeals 2)。
- 三个缺口,按修的性价比排:①**`/api/reach` 加一个 `mcp` 块**(字段与 `tools/fleet/mcp_usage.py` 里的四档一致:
  `ci`/`operator`/`indexer`/`other` + `with_args` + `demand_callers`);②**自检的调用不落库**(SR 09-24 已这么改:
  它占了自己分子的 56%,不排除的话判定线读的是我们自己);③**不记参数就无法分辨重放与使用** ——
  eco 的 `node` 调用方 180 次全带参数但只有 9 种组合,正是靠参数才认出来的。
- 判定线 `fleet-mcp-instrument-1022`(10-22):三站里 ≥2 个能被舰队脚本读出 `demand_callers`,否则「机器面」
  以后只按 SR 一个站读,不再声称是舰队级读数。

27. **🧰 自研工具板块 `/studio` 审计:不扩展,先修与补登 2026-09-25**(owner:「在其他会话上线了自研工具板块。检查。看是否扩展」)。
   另一会话 09-25 04:12–05:33 UTC(00:12–01:33 EDT)上线:`/studio/`(自研工具枢纽)、`/studio/quote-compare`(供应商报价比较)、`/studio/video-variants`
   (商品素材 → 三开场 × 三画幅,本机编码)、`/video/`(视频工作室入口)与视频云项目会员(复用 9 USDT / 30 天工作区)。PRD
   `docs/PRD-studio-2026-09-25.md`、`docs/RESEARCH-video-studio-2026-09-25.md`、`docs/VIDEO-commerce-2026-09-25.md`。
   **审计方法**:5 个审计员(门禁 + 40 个变异、报价算术、视频/会员安全、线上/发现面/数据、扩展三门)→ 每条发现由独立复核员复现 →
   三个视角的评审。**28 条发现被复现,三位评审一致判「hold_and_measure」**。
   **扩展结论:不扩展**。依据:台账里 Studio 0 行(= 没预登记)、上线后带来源真人 0、自有任务事件 0、全站会员有史以来 0 单;视频读者
   找的是「还免费的生成模型」(haiper 一页占视频面 33%),不是「复用商品素材」;报价比较在 bpj 上没有对口宿主页,舰队里做同一件事的
   RFQ Desk 28 天 0 事件;按舰队循环「扩张只从 won 行长出来」,bpj 唯一的 won 是修仪器的线。
   **本轮修的(都有能红的测试)**:
   ①**付费路径高危 V1**:从视频页第二次保存(带云端上下文)时,会员页首次登录会把交来的修订稿与保存目标一起清空——付费会员保存不了第 2 版。
   已在 `tools/member-studio/app.mjs` 的 `adoptKey()` 里保留「首次登录」前的草稿与目标;原浏览器测试漏掉它是因为往每个标签页预灌了密钥,
   现加了一轮手工登录。②**V2**:视频页会把会员页任何一次保存当成「本项目已保存」,甚至把别的客户项目当成保存目标。改为一次性 nonce:
   视频页只认带自己 nonce 的确认,会员页只在「保存的正是交来的那份」时回确认——两层各有一条单独的断言,各自的变异都会红。
   ③**报价 QC-1/QC-3/QC-2**:CSV/备份里的大小写或越界菜单值会让表单显示一个值、计算用另一个(现逐列规范化或按列名拒绝);「保存草稿」对恢复时
   会被拒的数据(>20 行阶梯价、超长字段)也报成功(现限额单一来源 `fieldMax`/`MAX_TIERS`,保存前先做一次 restore 演练);评审报告里的来源名
   与原文可伪造标题/HTML(现 `mdText`/`mdBlock` 转义并做成真代码块)。④**门禁缺口**:`test-studio.mjs` 38 → 53 项,把审计里 13 个存活变异
   逐一钉死(排序方向、被排除的报价不入榜、未确认汇率、单独缺来源、含税空税率、零价、1 分容差、有效期/交期边界、BAD_SOURCE、上限),另 15 个变异全红。
   **修复本身又被复核出 4 个回归(MV-1..MV-4,同轮修掉;教训:修付费路径的补丁要按「买家的每一种走法」复测,不只是复现原 bug 的那一条)**:
   ①新买家在会员页「创建密钥」、老会员「轮换密钥」都会丢掉交接,首次付费保存工具收不到确认,下一次保存另建一个重复项目;②只在「内容逐字相同」时回确认,
   会员页上改一个字再保存,工具就停在旧修订号,之后每次保存都是 revision_conflict,按提示操作也出不来;③第二次点「登录」、或先输错别站的密钥再输对的,
   交来的修订稿照样被清空;④换另一个付费账号登录会继承前一个账号的保存目标,保存报「另一台设备改过」。现在交接记 {nonce, 原文, 项目 id}:
   只确认存进交来的项目(或为它新建的项目)的保存,确认里带 `same` 标记——工具始终跟上修订号,只在内容未改时才显示「已保存」;
   同一密钥再登录不做任何事;账号拥有不了的目标(别的账号、已删除)改为新项目。报价侧另 4 条:.1 版存下的草稿/备份若含 CSV 里的非菜单值
   (如币种留空、RMB、pcs)不再整份拒收,恢复为空白由表单「—」与计算标出;CSV 空白单元格不再让整份文件失败(RMB 视作 CNY);CSV 报错写文件里的
   英文列名;报告标题转义 `#`。`test-video-business-browser.mjs` 的手工登录段覆盖以上全部走法,**12 个变异全红**(含「从列表打开的别的项目不跨账号带走」),且**已挂进部署 CI**(只在 push 部署时跑)
   (此前它只在本地跑,等于付费路径的修复没有门禁;每次 push 部署约多 1 分钟,定时部署不跑)。
   ⑤**仪器 V4**:视频入口/导航点击原来记在 `calc`(本站「自建工具真被用了」的核心度量)——改记新事件 `video`(已进 hit.js 白名单),
   `test-agent-watch` 的白名单扫描扩到 `assets/studio/*.mjs` 并断言 video-business 不再发 calc。`bpj-tool-gate-0926` 与 `fleet-tool-use-1014`
   加了口径注:读 calc 时剔 `/video/%` 与 `%/demo`。⑥**发现面 F2/V5**:d1a02d6f 的两个空模板槽给 424 个非视频页各加了一行空白 → 下次定时 run 会
   把它们当「变了」推 IndexNow;折回上一行后本地构建由 **474 → 52 页**(40 个视频工具页 + 首页 + /c/video + studio + /video/ 的真改动)。
   lastmod 哈希另剥掉 `/studio-assets/…?v=` 版本号,以后 EDITION 升级不再让 ~50 页改日期。
   **补登判定线(上线时 0 行)**:`bpj-studio-video-own-1023`、`bpj-studio-entry-1023`、`bpj-studio-quote-own-1106`、`bpj-studio-video-paid-1124`
   (读数口径只认 `/own` 后缀与带来源 pv,入口点击读 `ev='video'`;t0 全 0,CI/QA 带 `__ci` 不发事件,所以都不能被 t0 满足)。
   **`bpj-manifest-commit-0927` 中间读数**:①③已满足(CI 首次回写清单 59e64217);09-25 推了 1 670 条,已查实是 PR #2 + Studio 的真实全站改动
   (本地与 CI 构建哈希逐页一致),不是基线造假;本地与清单相差的 52 页里 48 页来自 d1a02d6f 视频上线(清单早于它 3 分钟),本轮审计单独只动了 quote-compare 2 页;09-26 按设计还会推 ~1 672 条,只按 09-27 日志结算 ②。
   **明确不做**(评审一致):第三个 Studio 工具;报价的 OCR / 模型抽取 / 多物料;视频模型生成层或媒体云存储(fal Kling 3 镜 × 5 秒 × 每镜 2 次付费尝试 ≈ $2,10,
   会员 9 USDT/月);往 grok/kimi/coding 这类不对口页面加入口;删 quote-compare(owner 09-25 要的,只在 1106 判负时撤首页卡);换收款方式。
   **留给之后的(已知、未修)**:①`/style.css` 与 `/bpj.js` 无版本号,部署后边缘/浏览器可能给新 HTML 配旧 CSS 至 4h+SWR(F3)——等 0927 结算后再加
   内容哈希版本号,免得这期间再动 lastmod 归一化链;②`test-video-browser.mjs` 的 H.264 夹具在 Playwright 自带 Chromium 上解不了(不在 CI 里);
   ③`verify-dist` 看不到 revenue-studio / member-studio 稍后写进 dist 的 workbench/members 页(那几页有 4 处 zh 泄漏、1 处空页、8 处 hreflang);
   ④`deploy-baipiaoji.yml` 的「Notify verified localized tool URLs to IndexNow」挂在 push 上且每次整推 8 个 URL(09-19 另一次上线引入),违反
   「外部副作用只挂 schedule」,改法要连「只推真变化」一起想,不在本轮扩大改动面。

## 2026-09-26 收费应用验收需求实验（Owner 当前指令）

沿用现有 /studio 与 /c/coding，中英 `/studio/release-check` 提供准备清单、虚构报告和拟议$299范围，只收申请不收款。协议见根仓 `docs/bpj-release-pilot-2026-09-26.md`。`release_pilot_*` 表独立，QA剔除、邮箱/会话去重、回执撤回、暂停和到期关闭。新增页可索引，但不声称软件已经执行验收。每日既有部署任务仅保存汇总；客户邮箱、回执和原始申请绝不进入公开仓/日志。

## 2026-09-26 商业触发优化

Owner要求调用技能改善商业触发。协议见根仓 `docs/bpj-commercial-triggers-2026-09-26.md`。投稿成功后提供免费等候/独立赞助选择；广告页补买家适配、实时付款方式和可跳过拒绝原因。commercial-trigger.js仅记固定biz事件、QA跨页保留；/api/reach.commercial_triggers是事件计数不是客户漏斗。复用每日reach快照，无新增schedule，不外发营销、不改变价格/订单/收录规则。
