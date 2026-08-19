# 外链计划：按 directory-submissions 技能分层裁剪（2026-08-15）

技能的核心判断适用于我们：**目录外链是地基不是策略**，价值在把权重导进能转化的落点页，
以及被 AI 引擎当作回答来源。以下按技能的 13 层清单裁剪成我们的真实情况——
每层标清「谁能做」，不装作我能替你注册账号。

## 已完成的（本轮 + 此前）

| 层 | 项 | 状态 |
|---|---|---|
| 落点页（Rule 2 前置） | `/alternatives/<slug>.html` ×120（转化率最高的落点形态） | ✅ 本轮上线，每页 FAQPage schema + 诚实的「什么时候不该换」段 |
| 落点页 | `/report.html` 原创研究（AI 引用率最高形态）+「引用本数据」复制块 | ✅ CC BY 署名义务变成一键复制的现成外链 |
| Tier 4 Agent/MCP（技能称之为 real moat） | 官方 MCP Registry（v1.6.0）、.well-known、Glama（认领文件）、awesome-mcp-servers PR #12084 | ✅ |
| Tier 8 GitHub | 镜像仓库 f-tiger/verified-ai-free-tiers（README 回链、每日自动同步） | ✅ |
| 自助外链机制 | 可嵌入 widget（iframe 即回链）、limits.json/llms-full.txt 的 CC BY 署名要求 | ✅ 已在站上 |

## Owner 动作（按投入产出排序，每项都有现成粘贴稿）

1. **Show HN**（Tier 1 里唯一适合我们的）：`docs/launch-kit.md` 已备好标题/首评/追问答案。
   技能忠告与我们一致：有技术与数据角度才发——我们有（原创数据研究）。
2. **Smithery / PulseMCP / mcp.so 表单**（Tier 4 剩余）：`docs/mcp-submission-packet.md`。
3. **仓库 description + topics**（Tier 8 前置，10 分钟）：packet 第 0 节。
4. **AlternativeTo + SaaSHub**（Tier 2 里适合的两个）：数据站可收录；描述用
   「verified free-tier limits dataset」定位，别用泛 AI 工具描述。
5. **TAAFT / Futurepedia / Toolify**（Tier 3）：注意技能警告——收录后大概率沉底，
   价值在 dofollow 外链本身，不在流量；一次提交勿反复改。
6. **Crunchbase / Wikidata / LinkedIn 公司页**（技能 GEO 第 8 条）：喂 AI 训练语料的三件套。
   Wikidata 此前判断过「可被独立来源证实」不足——**发过 Show HN 且有报道后再做**，顺序别反。
7. **Reddit 90/10**（Tier 10）：r/SideProject 与 r/SaaS 的 Share 窗口贴 launch-kit 里的改写版。

## 明确不做的（与技能的 What-NOT-to-do 一致）

- 付费提交服务（$60–200 打包）——技能明说这是浪费
- DR<10 的垃圾目录——稀释外链画像
- G2/Capterra——**评价体系需要 20 个可邀请的真实用户**，我们没有；零评价的收录是死的（技能原话）。等有真实用户群再回来
- Product Hunt 完整发射——需要 3 周账号预热 + 100+ 邮件列表（我们订阅数为 0）；先 Show HN，PH 等资产齐了再说
- 伪装成用户去论坛发链接——技能与本站规矩都禁止

## 度量（周查，接进每日循环的三线记录）

- 来源域出现 `news.ycombinator.com` / `alternativeto.net` / reddit → 真人线
- `ev='bot'` 抓取量台阶变化 → 外链带来的再抓取
- alternatives 页的 Google 点击（GSC，owner 侧）→ 落点页是否接住了权重
- watch 注册数 → 外链最终要换的东西
