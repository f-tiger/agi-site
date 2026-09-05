# agiscorecard 客户视角升级(AI 焦虑 × AI 替代工作)— 调研 · Prompt · PRD(2026-09-05)

owner 原话:「agi时代，agi站点如何可以更快流量上规模，被病毒式营销？要切换到客户视角，
一方面是ai焦虑，一方面是ai替代工作等，做完整调研，前后全方面升级agi站点，包括子站点」

## 一、Prompt 三轮收敛(展示第 3 轮;前两轮改掉了什么)

第 1 轮把请求结构化成「做一批 AI 焦虑/失业内容 + 加分享按钮 + 子站联动」。第 2 轮对照手册与
一手数据自我质询,砍掉三样:①分享按钮——本站与 eco 都用真实曝光量证伪过(agi 60 天 opinion_*
合计 5 次、eco 226 次曝光 0 分享);②「做一批内容」——本站冷启动实测「新页 ≈ 0 pv」,且
CITATION AMPLIFICATION 规则要求选题依据是已发生的引用或真实查询,不是猜的;③子站重定位——四个
子站全部在 09-21→10-28 的预登记判定窗内,判定期内不改被测对象(手册铁律)。第 3 轮据此收紧为
「一个客户视角的入口簇 + 把已有工作簇修成合规 + 工具升级为按职业查」,全部走三门与判定线。

**目标**:让「担心 AI 抢走我工作的人」在搜索/AI 助手里第一次能遇到本站,并在到站后得到本站
唯一有资格给的东西——**带日期、带信源、带翻转条件的「该不该担心」判定**(校准本身就是安抚)。
**范围**:agiscorecard.com 主域;子站只加读者相关的互链,不重定位(理由与日期见 PRD §五)。
**输入**:D1 28 天(真人 JS pv ≈1,100;工作簇 8 页合计 ≈20、搜索/AI 引荐 0)、Bing 引用榜、
客户调研(§二)、Microsoft *Working with AI* CC-BY 数据(785 个 SOC 职业的 AI 适用性分)。
**交付物**:①入口判定页 `/ai-and-your-job`(+zh)②Amodei「白领血洗」预测计时页 ③工作簇 7 页
补齐意见钩/一手源/时效行 ④`/ai-job-risk-check` v2(按职业查 + 结果永久链接)⑤首页/导航/
agi-questions/llms.txt/sitemap/search-index 接线 ⑥分发素材(owner 手发)⑦判定线预登记。
**不做**:分享按钮、新工具、新子域、恐吓式数字、机器发帖、改任何子站页面。
**验收**:validate.py OK、check_hreflang OK、每页六件套齐、每个数字有具名日期信源、
部署自检绿、判定线写进手册。

## 二、调研结论(客户视角;信源见 §六事实表)

1. **需求面是「事件驱动的尖峰 + 稳定的个人化提问」**。类目搜索在裁员新闻周爆发(2025-10 亚马逊
   裁员周 +233%),平日的稳定需求是「AI 会不会替代 *我这个职业*」「哪些工作安全」「该不该学 CS」。
   焦虑面在民调里持续上升:Gallup 2026 79% 认为 AI 会减少工作、Pew 2026-08 71%、APA 2025 57%
   (18–34 岁 65%)。
2. **客户的四种 job-to-be-done**:安抚(告诉我我还好)· 规划(我/孩子现在该做什么)·
   争论(帮我赢 doomer vs 怀疑派)· 追踪(它真的在发生吗)。前两种在打工人论坛占主导,
   后两种在 r/singularity/HN 与新闻里。
3. **病毒内核只有一种形状**:一个数字 + 一个日期 + 一个权威 + 「查我自己的职业」。
   AI 2027 的病毒性来自具体日期;Amodei「白领血洗」来自量化+期限;Stanford Canaries 来自
   一个数字(22–25 岁暴露职业 −13%→−16%→19% 差距);willrobotstakemyjob 来自「输入职业得数字」。
   **唯一走红的 AGI 追踪器(ai2027-tracker)就是本站的格式套在别人的预测上。**
4. **竞品全部缺同一样东西**:没有带日期的判定、没有裁决日、没有翻转条件、没有更新日志、
   没有把互相矛盾的数据源(理论暴露 vs 观察到的使用 vs 观察到的就业)对账。这正是本站的形状。
5. **渠道现实**:Copilot 每答只引 8–10 个域(集中),本站 33–37.5% 份额格外值钱;Google
   AI Overviews 把点击砍半;Reddit ≈40% 的 LLM 引用来源——owner 手工答帖(带日期数字)是
   小站唯一可用的社区通道。

## 三、PRD(薄:三门证据 + 判定线)

### P1 入口判定页 `/ai-and-your-job`(EN + zh)
- **数据门**:本站工作簇 7 页六件套齐却 0 引荐(结构合格、入口缺失);Bing 引用集中在判定型问题。
- **需求门**:§二第 1 条;Gallup/Pew/APA 三份民调同向;Challenger 连续 5 个月 AI 列首因。
- **商业门**:这是引用页(吃引用),钱路 = 意见钩 → /agi-test 与 /ai-job-risk-check(参与/绑定),
  不并列摆摊(转化架构令)。
- **形状**:标题即问题「Should you be worried about AI taking your job?」;首屏答案胶囊 =
  「恐惧 vs 证据」三行(民调恐惧 79% · 经济整体 4.2% 失业/无可辨扰动 · 集中早期信号:22–25 岁
  暴露职业相对 −19%);三信号表(恐惧/暴露/观察到的就业),每行日期+源;「下次复核日」与翻转
  条件;职业簇入口;FAQ 可见+LD 逐字一致;活数字 = Tracker 62.5 + knowledge-work 判定。
### P2 `/amodei-white-collar-bloodbath-prediction`
- 判定型 + ClaimReview:2025-05-28 原话(半数入门白领岗、失业率 10–20%、1–5 年)→ 检查点
  2026/2027/2030 → 当前状态「0/2 指标移动」;同页「预言者台账·工作版」(Huang/Karpathy/
  Gates/Altman 的对立表述,带日期)。**只逐字引用可核实原话,查不到就不写。**
### P3 工作簇 7 页修合规
- 每页加意见钩(`/agi-test?pick=` 五键,`tool_click{opinion_<page>}`)、≥2 条一手源外链、
  带日期的「2026-09 现状行」、内链到 P1;`will-ai-replace-programmers` 加 5 源对账卡
  (BLS 2024–34 / NY Fed / Indeed / Microsoft 分 / Anthropic 指数)。**不重写正文**。
### P4 `/ai-job-risk-check` v2
- 加「按职业查」:Microsoft *Working with AI* CC-BY 分数(785 SOC),显示分数+同职业的
  Eloundou/Anthropic 口径说明,**明写「适用性 ≠ 失业」**;结果写进 URL(`?t=<tier>&o=<soc>`)
  成为永久链接;事件 `vote_cast{label:'job_check_<tier>:<score>'}` 与 `calc_use{location:'job_lookup',
  label:<soc>}`——本站第一份「人们担心哪些职业」的一手数据。
### P5 接线与分发
- 首页 #directory 与 header Research 加入口;/agi-questions、/ai-tools、llms.txt、sitemap、
  search-index、feed;分发暂存包加两条 owner 手答素材(r/cscareerquestions、HN)。
### 五、子站:不重定位,只互链
- gridlings 09-21/09-24/≈10-21、gamesledger ≈10-21、goldrush 09-30/10-28/11-30、buysomething 09-28
  全部在判定窗内;手册铁律「判定期内不改被测对象」。goldrush(AI 赚钱主张台账)是本簇的镜像
  (失去工作 vs 靠 AI 赚钱),在 P1 加一条读者相关互链;其余子站与本簇无读者相关性,不加。

### 判定线(预登记,2026-10-03 = 上线 28 天)
- P1+P2 合计真人 JS pv ≥30 **或** 任一搜索/AI 引荐 ≥3 → 簇成立,按 §六 的职业系列
  (translators / customer service / accountants / nurses / teachers / lawyers)逐月加一页;
  两条都未达 → 记反面发现「客户视角入口在本站量级上不产生流量」,停止扩簇,只保维护。
- `calc_use{job_lookup}` ≥10 且 `vote_cast{job_check_*}` ≥10 → 工具 v2 成立;<3 → 撤职业查。
- 工作簇 7 页 `tool_click{opinion_*}` 合计 ≥3 → 意见钩在此簇有效;0 → 记入反面发现。
- 下一次 Bing AI Performance 明细:任一工作簇页首次被引 → 进 CITATION AMPLIFICATION 队列。

## 六、已核实事实表(写页只许用这里的数字;标 [thin] 的只能写「据 X 报道」,标 [verify] 的写前须 WebSearch 复核)
- Gallup 2026 (https://news.gallup.com/poll/712751/americans-cool-toward.aspx): 79% of Americans say AI will reduce the number of US jobs over the next 10 years (73% in 2025); 18% of workers say their own job is very/somewhat likely to be eliminated within 5 years (15% in 2025).
- Pew 2026-08-18 (https://www.pewresearch.org/short-reads/2026/08/18/young-adults-in-the-us-are-increasingly-wary-of-ai-concerned-it-will-take-jobs/): 71% say AI will take away jobs from Americans; 73% of adults under 30 expect fewer jobs in 20 years (61% in 2024). Pew 2025-02-25 (https://www.pewresearch.org/social-trends/2025/02/25/u-s-workers-are-more-worried-than-hopeful-about-future-ai-use-in-the-workplace/): 52% of US workers worried about future AI use at work; 32% expect fewer opportunities for themselves.
- APA Stress in America 2025 (https://www.apa.org/pubs/reports/stress-in-america/2025): 57% of adults say the rise of AI is a significant source of stress (49% in 2024); 65% among ages 18–34.
- Reuters/Ipsos poll Jun 3–8 2026, n=4,531 [thin, via Yahoo/Reuters]: 53% fear AI could put them or a household member out of work.
- Challenger, Gray & Christmas (https://www.challengergray.com/blog/challenger-report-layoffs-fall-hiring-picks-up-ai-leads-for-fifth-straight-month/): AI was the leading stated reason for announced US job cuts for five straight months (Mar–Jul 2026); May 2026: 38,579 AI-cited cuts = 40% of that month's total; 112,713 AI-cited cuts YTD through July 2026 vs 54,836 in all of 2025. These are employer-STATED reasons, not verified causation.
- Stanford Digital Economy Lab, "Canaries in the Coal Mine" (Brynjolfsson et al., ADP payroll data; https://digitaleconomy.stanford.edu/news/canariesaug26/ ; PDF https://digitaleconomy.stanford.edu/app/uploads/2026/08/Canaries_August2026.pdf): relative employment decline for workers aged 22–25 in the most AI-exposed occupations: −13% (Aug 2025 paper) → −16% (Nov 2025 update) → a gap of about 19% (Aug 2026 update, data through Jun 2026). Older workers and less-exposed occupations: no comparable decline. Dashboard: https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/
- Yale Budget Lab (https://budgetlab.yale.edu/research/evaluating-impact-ai-labor-market-current-state-affairs): monthly CPS-based tracker finds no discernible economy-wide labor-market disruption from AI so far.
- Anthropic economist Peter McCrory, Fortune 2026-07-24 (https://fortune.com/2026/07/24/anthropic-peter-mccrory-dario-amodei-why-hasnt-it-killed-jobs/): US unemployment 4.2%; no relative deterioration in AI-exposed occupations in aggregate data.
- Dario Amodei, Axios 2025-05-28 (https://www.axios.com/2025/05/28/ai-jobs-white-collar-unemployment-anthropic): AI could eliminate half of all entry-level white-collar jobs and push unemployment to 10–20% within one to five years. [verify] Fortune 2026-05-05 reported a softened restatement — quote only if the exact wording is found.
- Jensen Huang on Amodei (https://www.yahoo.com/news/jensen-huang-dismisses-anthropic-ceos-144719582.html): "I pretty much disagree with almost everything he says."
- Andrej Karpathy, Dwarkesh Podcast Oct 2025 (https://www.dwarkesh.com/p/andrej-karpathy): AGI is still "a decade away"; today's agents are "slop". (Fortune 2025-10-21 coverage: https://fortune.com/2025/10/21/andrej-karpathy-openai-ai-bubble-pop-dwarkesh-patel-interview)
- Bill Gates essay, CNBC 2026-08-26 (https://www.cnbc.com/2026/08/26/bill-gates-ai-jobs-economic-upheaval.html) [verify wording before quoting].
- BLS Employment Projections 2024–34 (https://www.bls.gov/opub/ted/2026/artificial-intelligence-information-technology-and-employment-2024-34.htm): computer programmers −6%; software developers +15%; data scientists +33.5%. Programmers OOH: https://www.bls.gov/ooh/computer-and-information-technology/computer-programmers.htm
- NY Fed "Labor Market for Recent College Graduates" [thin, secondary]: unemployment 6.1% for computer science majors, 7.5% computer engineering.
- Computer-science enrollment 2025–26 [thin, two secondary figures disagree: −8.1% (hakia citing NSC) / −11.2% (Built In)] — write "fell by roughly 8–11% according to reports citing National Student Clearinghouse data" or omit.
- Microsoft Research, "Working with AI" (arXiv 2507.07935, Jul 2025; data CC-BY-4.0 https://github.com/microsoft/working-with-ai, CSV ai_applicability_scores.csv, 785 SOC occupations): AI applicability score = share of an occupation's work activities that Copilot users are observed doing with AI; highest: Interpreters and Translators 0.49. Measures observed applicability, NOT job loss.
- Anthropic Economic Index, March 2026 report (https://www.anthropic.com/research/economic-index-march-2026-report ; data https://huggingface.co/datasets/Anthropic/EconomicIndex): 49% of occupations have ≥25% of their tasks observed in Claude usage; observed usage split augmentation 55% vs automation 42%. Claude-user sample; not employment data.
- Eloundou et al., "GPTs are GPTs", Science 2024 (https://www.science.org/doi/10.1126/science.adj0998): ~80% of US workers have ≥10% of tasks exposed to LLMs; ~19% have ≥50% exposed. Theoretical exposure, 2023 capabilities.
- Frey & Osborne 2013 47% "at risk" — retrospectively poor predictor (ITIF 2022: https://itif.org/publications/2022/09/30/oops-the-predicted-47-percent-of-job-loss-from-ai-didnt-happen/).
- METR Time Horizon 1.1, 2026-01-29 (https://metr.org/blog/2026-1-29-time-horizon-1-1/): 50%-success task horizon doubling roughly every 4.3 months since 2023 (about every 3 months since 2024).
- Indeed Hiring Lab 2026-07-08 (https://hiringlab.indeed.com/2026/07/08/ai-and-job-postings-from-destruction-to-creation/): the most AI-exposed occupations' postings fell the most and then rebounded the most; 71% of software-development posting growth May 2025→May 2026 was senior-level. Tracker: https://github.com/hiring-lab/ai-tracker
- WEF Future of Jobs 2025 (https://www.weforum.org/press/2025/01/future-of-jobs-report-2025-78-million-new-job-opportunities-by-2030-but-urgent-upskilling-needed-to-prepare-workforces/): employers expect 92M roles displaced and 170M created by 2030 (net +78M); 41% of employers plan workforce reductions where AI can automate tasks. Employer PLANS, not outcomes.
- IMF Jan 2024 (CNBC https://www.cnbc.com/2024/01/15/imf-warns-ai-to-hit-almost-40percent-of-global-employment-worsen-inequality.html): almost 40% of global employment exposed. Goldman Sachs Mar 2023 (CNN https://www.cnn.com/2023/03/29/tech/chatgpt-ai-automation-jobs-impact-intl-hnk): 300M full-time jobs' worth of work exposed.
- Pew 2025-04-03 experts vs public (https://www.pewresearch.org/internet/2025/04/03/public-and-expert-predictions-for-ais-next-20-years/): 73% of both experts and public expect fewer cashier jobs; experts also name truckers/lawyers, public names teachers/doctors/musicians.
- Harvard Youth Poll fall 2025 (https://iop.harvard.edu/youth-poll/51st-edition-fall-2025), n=2,040: 59% of young Americans see AI as a threat to their job prospects (outsourcing 48%, immigration 31%).
- Microsoft Work Trend Index 2026 (https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization): 65% of AI users fear falling behind.
- Google-Trends-based study (Cybernews/nexos.ai, 2025; https://cybernews.com/ai-news/ai-related-anxiety-is-rising-in-the-u-s-regulation-and-privacy-top-the-list/): "job displacement" searches rose +233% week-over-week in the week of 2025-10-19 (Amazon corporate cuts, CNBC https://www.cnbc.com/2025/10/28/amazon-layoffs-corporate-workers-ai.html).
- Amazon CEO Andy Jassy said the Oct 2025 cuts were about culture, not AI or cost [thin, secondary: storyboard18].
- Site-internal, citable: AGI-2027 Thesis Tracker 62.5/100 (asOf 2026-08-08); prediction `knowledge-work` verdict On track (~83% GDPval, ~80% SWE-Bench Pro as recorded in data.json).
