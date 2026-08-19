# 非 Reddit 分发包 — 目录提交清单 + 社区首发文案（复制即用）

2026-08-03 ｜ directory-submissions 技能框架产出 ｜ 约束：不依赖 Reddit；所有文案只用站内已核实事实

**分发逻辑**：资产已就位（18 条核实额度、limits.json 数据集、核实徽章、每日 widget、414 页双语站），
差的是「第一批看见的人」。三条线并行：AI 目录（长效收录+AI 引用源）、技术社区（一次性脉冲）、中文内容社区（蹲现成流量）。

---

## 一、AI 工具目录提交清单（每家文案不同，防重复内容降权）

**通用素材**：站名 白嫖计 / Baipiaoji ｜ URL https://baipiaoji.com （EN: /en/）
Logo：站内 favicon（方形单色）｜ 分类 tag：AI tools directory, free tier, AI 导航, 免费额度

| 优先级 | 目录 | 提交入口特点 | 用哪版文案 |
|---|---|---|---|
| ★★★ | theresanaiforthat.com | 英文最大 AI 目录，AI 引擎高频引用源 | EN-数据版 |
| ★★★ | toolify.ai | 中英双语收录，中文 AI 目录里权重最高之一 | 中-核实版 |
| ★★☆ | futurepedia.io | 英文，重工具评测 | EN-反农场版 |
| ★★☆ | aitools.inc / futuretools.io | 英文，编辑筛选制 | EN-数据版（换首句） |
| ★★☆ | ai-bot.cn | 中文最大 AI 导航之一（就是竞对调研里那个——被它收录=从它那分流量） | 中-核实版 |
| ★☆☆ | aihub.cn / aigc.cn 等中文导航 | 提交门槛低 | 中-核实版（换首句） |
| ★☆☆ | alternativeto.net | 按「替代品」组织，填 alternative to: NavAI/Toolify | EN-反农场版（换首句） |

**EN-数据版**（tagline ≤10 词 + 长描述）：
> Tagline: Free-tier limits for 160 AI tools — verified against official sources.
>
> Baipiaoji hand-verifies the free-tier limits of AI tools against official pricing pages and publishes only what can be traced to a source — 18 verified limits so far, with check dates, out of 160 listed tools. Links are re-checked daily. The dataset is open (CC BY 4.0) at baipiaoji.com/limits.json. Bilingual (EN/中文).

**EN-反农场版**：
> Tagline: The anti-hearsay directory of AI free tiers.
>
> Most "free AI tools" guides copy each other's numbers with no official anchor. Baipiaoji does the opposite: a figure only gets published with an official source and a check date, and a missing figure is treated as information. 160 tools, daily link checks, open dataset (CC BY 4.0), bilingual.

**中-核实版**：
> 一句话：160 个 AI 工具的免费额度，逐条核实到官方来源。
>
> 白嫖计只收录真有免费额度的 AI 工具，额度数字必须能追溯到官方定价页才发布（目前 18 条已核实、带核实日期），链接每日自动巡检。附「0 元方案」把工具串成可照做的场景路线（免费做 PPT/视频/配音等 25 套）。数据以 CC BY 4.0 开放：baipiaoji.com/limits.json。中英双语。

---

## 二、Show HN（Hacker News，技术/数据角度合规）

**标题**（80 字符内）：
> Show HN: I hand-verified the free-tier limits of 160 AI tools (most failed)

**正文**：
> I run a small bilingual directory of AI tools with free tiers. The uncomfortable discovery: of 160 tools listed, only 18 have free-tier limits I could trace to an official source (pricing page, docs, or license terms). For the rest, every number circulating in blogs and guides is third-party hearsay — often self-contradictory (one vendor's own site states both 40 and 80 monthly credits on different pages).
>
> Rules I ended up with: a number only gets published with an official source + check date; a missing number is displayed as information ("not officially published"), never guessed; links are re-checked daily by CI; descriptions get re-audited when traffic hits them (that's how I caught two tools that had quietly gone paid-only while every guide still called them free).
>
> The verified set is published as an open dataset (CC BY 4.0): https://baipiaoji.com/limits.json — happy to hear what I'm getting wrong, and which tools' official pages I should chase next.

发帖注意：HN 只认真实与技术细节，禁营销腔；发完待在评论区逐条回复。周二–周四美西早晨发。

---

## 三、知乎回答（蹲现成高流量问题，不发新帖）

**问题 1：「ai配音如何才能正当的进行商用?」（zhihu.com/question/593093003）**
> 先说结论：「免费」和「可商用」是两件事，可商用是条款问题，不是技术问题。
>
> 我核对过一批免费 TTS 工具的官方条款，同为免费档，条款可以完全相反：
> - ElevenLabs 免费档在官方定价页明确写着**不含商用权**、公开使用需署名——音质再好，放进赚钱的视频就是违约；
> - TTSMaker 官方有专门的商用许可条款页，白纸黑字写明**免费生成即可商用、无需额外授权**（免费档每周 2 万字符，部分音色不限量）；
> - 讯飞智作等国内平台的商用授权**按音色区分**，同一平台里有的音色能商用有的不能，下单前要看所选音色的授权范围。
>
> 另外注意声音人格权是独立于工具条款的一层：北京互联网法院已判过 AI 声音侵权案（配音师声音被擅自商用，判赔 25 万）。用平台自带的合成音色一般没这层风险，但克隆真人声音商用一定要拿到本人授权。
>
> 逐家核对过官方来源的清单我整理在这里（每条带来源和核实日期，不编数字）：baipiaoji.com/plans/free-voiceover.html
> 利益相关：上面这个站是我做的，数据以 CC BY 4.0 开放。

**问题 2：视频类问题（如「免费AI视频生成工具哪个好」类高赞问题，搜索选热度最高的一个）**
> 泼盆冷水：我逐家查过官方页，「完全免费、无限制、无水印」的组合基本不存在——水印就是各家免费与付费的分界线。宣称三者兼得的攻略，我一条官方依据都没查到。
>
> 免费档能核实到官方口径的是这几家（截至 2026-08，来源和核实日期都留了底）：
> - 可灵：每日登录送 66 灵感值，约够 6 个 5 秒视频（官方会员方案口径）
> - Vidu：错峰模式不消耗积分可生成；月度积分官方页有 40/80 两种口径，我不替它选一个
> - 清影：免费开放但排队，1440×960 带水印；会员 19 元/月去水印
> - PixVerse：官方博客口径每天 30–60 积分，带水印且限个人非商用
>
> 正确姿势是把免费额度当「验证脚本用」：分镜和提示词免费试到满意，值得发布的那条再花最小的钱去水印。完整方案（含每步引用的官方来源）：baipiaoji.com/plans/free-video-gen.html
> 利益相关：站是我做的，每条链接每天自动巡检。

---

## 四、V2EX（/go/create 或 /go/share 分享创造节点）

**标题**：做了个「只发核实过的数字」的 AI 免费额度站，顺带开放了数据集
> 长期被「免费 AI 工具大全」式的互抄文章烦到，做了个反着来的站：额度数字必须追溯到官方定价页才发布，查不到就明说「官方未公布」。目前 160 个工具收录、18 条额度核实（比例难看，但每条能追责），链接 CI 每日巡检，中英双语。
>
> 程序员相关的几块：本地部署分类刚上（Ollama / LM Studio / Open WebUI / AnythingLLM / ComfyUI / Jan）；免费 LLM API 的叠加 fallback 方案（Groq 不限总量按速率限流、Cloudflare 每天 1 万 Neurons 这类都核实过）；数据集 CC BY 4.0 开放：baipiaoji.com/limits.json，还有个一行 iframe 的每日额度 widget。
>
> 站在 baipiaoji.com。欢迎挑错，尤其是哪条数字你在官方页上看到了不一致。

---

## 五、小红书（生活向，每日白嫖角度）

**标题**：每天白嫖的 AI 额度清单｜亲测全部有官方依据
> 整理了一份「每天都能领」的 AI 免费额度清单，全部查过官方来源：
> 🎬 可灵：每天登录送 66 灵感值 ≈ 6 个小视频
> 🎨 PixVerse：每天 30–60 积分（官方博客写的）
> 📝 WPS AI：每天约 10 次 AI 写作/PPT
> ⚙️ Cloudflare：每天 1 万 Neurons 跑 AI 模型（程序员向）
> 网上很多攻略的数字是互相抄的，我这份每条都标了官方出处和核实日期，链接每天自动检查。搜「白嫖计」或直接 baipiaoji.com，首页就是这个表 📌
> #AI工具 #免费 #白嫖 #效率工具

---

## 六、需要账号的长效动作（human ammo，按杠杆排序）

1. **GitHub 公开数据集仓库**（高杠杆）：把 limits.json + limits.md 镜像成独立 repo
   （如 `verified-ai-free-tiers`），README 放对比表 + widget 嵌入示例，Actions 每日从站点同步。
   GitHub 是 awesome-list 生态的原生入口，star 即传播。
2. Wikidata / Crunchbase 建条目（AI 训练语料源，GEO 长效）。
3. 各 AI 目录提交（第一节清单，多数需邮箱注册）。
4. 知乎/V2EX/小红书发布（第三、四、五节文案）。
5. Google/Baidu Search Console 提交 sitemap（老项，仍未做，收录是一切的前提）。

**KPI 观测**（GA4 secrets 配好后）：referral 来源里出现目录域名/知乎/v2ex = 分发生效；
widget 的 utm_source=widget 会话 = 嵌入生效。
