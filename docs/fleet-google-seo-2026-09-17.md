# 去 GitHub 找 SEO 技能 + 「让谷歌流量扩大」到底卡在哪(2026-09-17)

owner 原话:「去github寻找seo优化技能，让谷歌流量扩大」。两件事分开答,因为**技能不是瓶颈**。

## 一、技能:找了、评了、装了 4 个(不是 25 个)

GitHub 上主要的 Claude SEO 技能仓,逐个按舰队约束筛:

| 仓 | 规模 | 许可证 | 判定 |
|---|---|---|---|
| [inhouseseo/superseo-skills](https://github.com/inhouseseo/superseo-skills) | 11 个 | Apache-2.0 | **采用**。纯方法论,明说 "No exports. No API keys." |
| [AgricIDaniel/claude-seo](https://github.com/AgricIDaniel/claude-seo) | 25 技能 + 18 agent | MIT | **不装**。免费层要 Playwright 无头渲染 + 18 个并行 agent;它的 Google API 部分(PSI/CrUX/GSC)要 owner 配 OAuth。和舰队现有 15 个重叠严重,收益不抵复杂度 |
| [seranking/seo-skills](https://github.com/seranking/seo-skills) | — | — | **不装**。绑 SE Ranking MCP,付费 |
| [aevans-eng/seo-skill](https://github.com/aevans-eng/seo-skill) | 1 个 | MIT | **不装**。九点静态站检查,`seo-audit`+`schema` 已完全覆盖 |

**关键发现:舰队现有的 `linkbuilding` 就出自 superseo-skills,而且是旧版。** 上游比本地多一句:
「If site age or indexed volume can't be verified, classify from the remaining signals and say so
— **don't present a guess as a measurement**」。这正是舰队最在意的零编造规矩,已更新到上游版。

**装了 4 个**(全部整包带 `references/`,共 25 个文件 2 804 行,逐文件扫过密钥/PII/可执行动作/
指令注入形态):
- `featured-snippet-optimizer` —— 现有 15 个里**没有任何一个覆盖精选摘要**。这是纯 Google SERP 特性
- `semantic-gap-analysis` —— 「排进前 10 但进不了前 3,到底缺什么实体」
- `eeat-audit` —— E-E-A-T 逐维打分,Google 质量评估员指南口径
- `linkbuilding` —— 更新到上游版(见上)

**没装的理由要记住**:现有 96 个技能里 SEO 方向已有 15 个(seo / seo-audit / seo-ops / ai-seo /
schema / programmatic-seo / site-architecture / linkbuilding / kgr-page / seo-hreflang / content-*
/ directory-submissions)。**再装 25 个建议型技能是假动作** —— 舰队的问题从来不是缺建议,是缺仪器。
取用纪律写进 `.claude/skills/PROVENANCE.md`(查重 / 整包 / 先读后装 / 登记)。

## 二、谷歌流量:先排除了一整类解释

**Googlebot 此前从来没被探过。** `ai_access_probe.py` 从建成起就带 Bingbot —— 舰队一直在探
**自己搜索流量已有的来源**,却从没探过 **owner 想扩大的那个通道**。已补进同一个 AGENTS 列表
(不另起探针,让它继承控制组门、判定、自检、heartbeat 接线)。

**读数(2026-09-17 现跑,14 站 × 9 UA × 2 路径)**:
- **Googlebot 14/14 全部 200**,robots.txt 全部放行、全部声明 sitemap
- 全部 9 只爬虫零拦截 → 顺带结掉 `fleet-ai-access-0916`(**舰队台账第一条 won**)

**测量效力必须写清**:Cloudflare 按反向 DNS 验证真 Googlebot,我们从 runner 发出的伪造 UA
只会被**更严格**对待,不会更宽松。所以 **200 是强证据**(真爬虫几乎肯定没问题);
反过来若被拦则**不能下结论**,要去 Cloudflare 复核。这条不改变任何过往判定,因为过往全是干净的 200。

**⇒ 零谷歌流量不是「进不来」。** 这一整类解释排掉了。

## 三、真正的瓶颈:**这条分支从来没并进 `main`,所以什么都没上线**

按舰队规矩「push 到 `main` = 发布」。今天查:本分支领先 `origin/main` **7 个提交**,
`main` 上连 `tools/fleet/ref_sources.txt` 都没有。也就是说 09-15 与 09-16 两天的全部工作
**一件都没部署**:

| 未上线的东西 | 后果 |
|---|---|
| 13 份 `/api/pulse` 的 `by_source`/`by_search` | **14 个站现在读出来 Google 全是 0,那是测不到不是真 0** |
| **bpj 的 1558 条 canonical → 308 修复** | 舰队唯一有谷歌流量的站,最大的谷歌缺陷还在线上 |
| agi 104 页多语言面包屑 | 结构化数据缺口仍在 |
| eco MCP 自报名修复、heartbeat 四个新检查、sitemap 守卫 | 全部未生效 |

**今天现查的诚实读数**(绕开未部署的 `by_source`,直接读 bpj 的 `referrers` 原始键):

> **bpj:`www.google.com` 162 次 / 有来源真人 pv 311 = 52%,第一大来源。**
> (09-15 那次是 155,还在涨。)cn.bing.com 70、perplexity 17、chatgpt 13。

其余 13 站的 Google 数**现在读不到**,要等部署。eco 09-15 手查过是 0。

## 四、结论:「让谷歌流量扩大」的下一步不是写内容

1. **先把这条分支并进 `main`。** 这是唯一的动作项,而且它同时解锁「看得见其余 13 站的 Google 数」
   和「修好 bpj 的 1558 条跳板 canonical」—— **后者是舰队最大的单笔谷歌缺陷,而且代码早写好了。**
2. 并进去之后再谈内容动作。判定线 `bpj-canonical-fix-1013` 已预登记(google 引荐 ≥180/28d)。
3. `fleet-google-channel-1013` 仍开着:除 bpj 外要有 ≥2 个站 google ≥10/28d,否则
   **Google = bpj 专属,其余站永不再为 Google 改标题**。今天的探针证明这不是技术拦截问题,
   所以那条线到期时读到的就是真需求答案。
4. 新装的三个技能**投放对象是 bpj**(唯一有谷歌排名可优化的站),不是那 13 个 Foundation 期的小站
   —— 对零排名的页做精选摘要优化是无的放矢,技能自己也这么写:「从第 6 名往后,先修排名」。
