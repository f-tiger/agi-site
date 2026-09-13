# Reddit 需求 → 产品机会「撮合站」——prompt 三轮 + 裁定 + 已建(2026-09-13)

owner 原话:「先完善prompt3轮,再执行:ai时代,做一个子站点,挖掘爬取Reddit用户需求,并匹配产品机会点,
变成一个机会撮合网站」。沙箱对 reddit.com 双向封死(000),原帖只有 runner 与 owner 浏览器能读;
本文所有外部事实带日期与来源。

## 一、prompt 三轮

**第一轮(字面)**:「新开子域,爬 Reddit 需求帖,配产品机会,做撮合网站。」
四个硬伤:①**子域铁律三条**——独立技术形态(不需要,是数据管线+静态页)、受众品牌完全不同
(与 SourceRadar 的 Entrepreneur/ecommerce 受众重叠)、自带变现闭环(「撮合」= 双边市场,09-07 Manifold
先例、09-12「新站零先例」两次裁定)——**三条全不中**,按铁律默认并入最近现有域;②**Reddit 的数据许可**:
Reddit Data API 免费仅限非商业用途(100 QPM/OAuth client),商业使用需书面批准、付费(2026 年报价约
$12 000/月起,审批 2–4 周),**Responsible Builder Policy(2026-06-05 更新)要求任何拉数据的开发者先申请**;
③**这个品类的领头羊已经死于此**:GummySearch 未能拿到 Reddit 商业许可,**2025-11-30 停止接受新注册与续费**;
④**Reddit 在起诉转载者**:2025-06 诉 Anthropic(称其承诺停止后仍访问 10 万+ 次),2025-10-22 诉
Perplexity / SerpApi / Oxylabs / AWMProxy(经 Google 缓存间接抓取;Perplexity 的辩词「我们只是总结并
引用 Reddit 帖子,像人们分享链接一样」没有让它免于被诉)。一个公开、带联盟、转载 Reddit 帖子的站点
= 上述三件事的交集。第一轮不可执行。

**第二轮(拆开「挖掘」与「撮合」)**:「挖掘保留在舰队内部(已建:`tools/startup_radar.mjs` 的
r/SomebodyMakeThis、r/AppIdeas + 六站垂直板块,公开 JSON、只读、约 20 次请求/日、14 天重现计数);
撮合 = 把请求与**我们自己能测的需求**(Google Trends rising)和**公开的供给**(Product Hunt / HN feed)
对上;公开页只放派生事实。」
问题:「派生事实」到哪一步算转载?帖子标题也是内容。要定死。

**第三轮(可执行,本文采用)**:
> 「不开子域。撮合层 = 零 AI 的匹配器(`tools/fleet/opportunity_match.py`),搭现有 fleet-trends 运行,
> 输出 `data/autopilot/opportunities.json`:每条 = 主题(归一化请求,只作匹配键)+ 重现天数 + 是否有
> 同向的 Trends rising 查询 + PH/HN 是否已有人做 + 舰队是否已有页 + 确定性分数 + 状态机。
> 公开面 = SourceRadar 的 `/demand-board`,**标题用 Google rising 查询而不是 Reddit 标题**,展示
> 「同一请求在 N 个不同日期重现于 r/x」这个我们算出来的计数,链接指向 **Reddit 自己的搜索**而非帖子,
> 供给引用 PH/HN 公开 feed。**不存不发帖文、正文、permalink。** 出页门:≥3 条「已确认需求且重现
> ≥2 天」才写页,否则不写(薄页比没页更坏)。不放联盟链接(请求→具体商品的映射无法核实 = 编造)。」

**被砍掉的**:新子域、真人撮合/联系双方、用户账号/投稿、付费 listing、AI 生成「商业计划」
(IdeaPicker 式)、转载帖文、Amazon 映射联盟。

## 二、必须对 owner 说清的一条:Reddit 的 robots.txt

SourceRadar 自己的法律底稿(`sites/buysomething/docs/research/07-legal.md`「可辩护管线八原则」第 4 条)
把**尊重 robots.txt / 机器可读 opt-out** 列为保住欧盟 TDM 例外的资格线。而 **reddit.com/robots.txt 自
2024-07 起对所有未授权爬虫 `Disallow: /`**(并指向其 Public Content Policy)。这意味着雷达 09-12 加的
Reddit 读取(公开 `.json`,未登录,不绕过任何技术措施,约 20 次/日)**技术上违反该 opt-out**。
同一底稿对 Google Trends 的判断同样适用于这里:小体量、低频、只做内部指标化、不转售不转载原始数据,
「被诉概率极低,被限流概率高——真正风险是管线脆断而非法律责任」。本轮的处置是:**内部读取保留但
永不转载**(公开页零 Reddit 内容),并把这条写进本文与 CLAUDE.md,由 owner 决定是否连内部读取也关掉
(关掉 = 删 `startup_radar.mjs` 里两个 reddit 源,匹配器自动退化为只用 Trends/PH/HN)。

## 三、已建(零 AI,零新 cron,零副作用)

| 件 | 位置 | 说明 |
|---|---|---|
| 匹配器 | `tools/fleet/opportunity_match.py` | 10 条夹具自检;状态 scout / recurring / demand-confirmed;supplied 只是事实标记不是杀 |
| 公开页生成器 | `sites/buysomething/tools/gen_demand_board.py` | 7 条自检:标题是 Google 查询不是 Reddit 标题、无 permalink、只链 Reddit 搜索、外链 nofollow、无联盟参数;出页门 ≥3 |
| 搭载 | `fleet-trends.yml` rising 之后 | 输出与页一并回仓;页有变化才触发 buysomething 部署(path 过滤既有行为,≈1 分钟/次) |
| 摘要 | `demand_digest.md` 新节「机会撮合」 | 每日一页读完 |

首跑(沙箱,09-13 实际雷达数据):候选 0——**Reddit 两个源今天的 runner 还没跑**(fleet-trends 实际
在 ~08:00 UTC 触发),`reddit_sources_ok` 双 false 如实写出。第一份真实读数在今天的 run 之后。


**首跑记录(2026-09-13,fleet-trends 计划运行 08:32 UTC,run 34747944935)**:两个 Reddit 源全部 `ok:false`,原样记录:
- `reddit_requests`: `r/SomebodyMakeThis HTTP 403`
- `reddit_vertical`: `r/singularity HTTP 403; r/artificial HTTP 403; r/ChatGPT HTTP 403; r/ClaudeAI HTTP 403; r/LocalLLaMA HTTP 403; r/puzzles`
即 **Reddit 对 GitHub runner 的未鉴权公开 JSON 请求返回 HTTP 403**(每个板块都是 403,不是 404 或限流 429)。
这与 §二 的 robots.txt `Disallow: /` 一致:Reddit 在边缘层拒绝无授权自动访问。`board_stats` 为空、
`watchlist_updated` 为空——该运行的 head 早于/未含板块名单提交与否见同日 git 记录;**无论哪种,403 是网络层
事实,换代码不会改变它**。预登记规则不变:Reddit 源连续 14 天 ok:false → 直接停,不换 IP、不换 UA、不绕过。
匹配器在无 Reddit 数据时自动退化为 Trends × PH/HN/Ask HN;`hn_ask` 与 `reddit_wish` 首次运行要等含
新代码的下一次计划运行。撮合层的判定线(2026-10-11)照旧,只是 Reddit 这一路大概率归零,
到期如实按「可测需求同向」的定义结算。

## 四、判定线(预登记,已进 `data/fleet-bets.json`)

- **2026-10-11(28 天)**:`opportunities.json` 累计出现 ≥3 条 demand-confirmed 且重现 ≥2 天(= 页面已出)
  → 撮合层成立,页面出后再预登记 28 天读者线(真人 pv ≥10 或任一搜索/AI 引荐);
  **<3 条 → 「Reddit 请求与可测需求不同向」记入反面发现,匹配器退化为摘要里的一行,页面不建**。
- 任何时候 Reddit 源连续 14 天 ok:false(限流/封禁)→ 不换 IP 不绕过,直接停 Reddit 源(第 4 原则)。

## 五、来源(带日期)

- Reddit 商业 API 定价/审批与 Responsible Builder Policy(2026-06-05):[prowlo.com](https://prowlo.com/blog/reddit-data-api)、[socialcrawl.dev](https://www.socialcrawl.dev/blog/reddit-data-api-2026)、[snitchfeed.com](https://snitchfeed.com/blog/reddit-api-pricing)(均为第三方整理,官方条款页 redditinc.com 本会话不可达,数字以官方为准)。
- GummySearch 2025-11-30 停服:[reddily.io](https://reddily.io/blog/gummysearch-alternatives)、[painmap.io](https://painmap.io/blog/gummysearch-alternatives-2026/)。
- Reddit 诉 Perplexity/SerpApi/Oxylabs/AWMProxy(2025-10-22)与诉 Anthropic(2025-06):[CNBC](https://www.cnbc.com/2025/10/23/reddit-user-data-battle-ai-industry-sues-perplexity-scraping-posts-openai-chatgpt-google-gemini-lawsuit.html)、[Search Engine Land](https://searchengineland.com/reddit-sues-perplexity-serpapi-scraping-google-463681)、[Built In](https://builtin.com/articles/reddit-perplexity-data-scraping-lawsuit)。
- 同类工具现状(PainOnSocial / BigIdeasDB / Trend Seeker / IdeaPicker,全部 AI 摘要 + 付费):[topai.tools](https://topai.tools/alternatives/gummysearch)、[painonsocial.com](https://painonsocial.com/blog/gummysearch-alternative)。

## 六、同日追加:板块名单本身成为数据(owner:「监控好板块比什么都合适」)

名单外置到 `tools/fleet/reddit_watchlist.json`,每个板块写明 why;三层共 36 个板块/日,串行 6.5 s 间隔。
每板每日产出写进 `board_stats`(14 天 ok 天数、帖子、求做形帖子、贡献的重现主题),摘要出「板块产出榜」。
淘汰规则预登记:ok ≥14 天且重现 0 且求做帖 <10 → 标 demote(机器只标,会话删并记录);404 原样记录。
创业站 idea 源:新增 Ask HN「is there a」周窗(Algolia,稳定);BetaList / Indie Hackers / PH 主题 feed /
YC RFS 只探针不入库。**首份 board_stats 在今天 fleet-trends 计划运行之后**;14 天后(2026-09-27)第一次能按
数据谈「哪些板块值得留」,在此之前名单是假设不是结论。
