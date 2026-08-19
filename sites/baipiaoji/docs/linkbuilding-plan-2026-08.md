# 链接建设执行方案（linkbuilding 技能，2026-08-17）

来源：agiscorecard 仓 `.claude/skills/linkbuilding`（阶段分类法 + 9 个 tactic
playbook）。与 `docs/backlink-plan.md`（2026-08-15，directory-submissions 技能的
13 层裁剪）**互补不重复**：那份回答「往哪投、谁能投」，这份按 linkbuilding
技能补上阶段判定、战术三档标注与速度红线。冻结令（2026-08-17）在场：本方案
**不产生任何站上新页/新功能**，只做文档与数据仓管线层。

## 阶段判定：Foundation 期（DR 0-15），且发现层被卡

- 站龄 ~2 个月；中英 1474 页；已有 entity 信号两枚（官方 MCP Registry 条目、
  公开数据仓 verified-ai-free-tiers）——这在同龄站里是超前的；
- 但 Bing 只索引 39/1474、Google 点击 1/周：**瓶颈不在外链供给，在 owner 侧
  的站点验证/提交**（本仓 08-16 已有结论）。外链此时的作用是辅助发现与
  entity 巩固，不是排名杠杆。
- 结论：**Foundation**。在索引解锁前，任何「为排名做外链」的投入都在给
  看不见的页面导权重——所以本方案的全自动项只挑「引用/署名类」（不依赖
  索引也能兑现价值的那种）。

## 战术选择（三档标注；过滤：零预算、零批量外联、零灰帽）

| 技能战术 | 判定 | 本站落地形态 |
|---|---|---|
| New site launch（linkable asset 半） | **全自动，已建成** | 原创数据集（limits.json，CC BY 4.0）+ /report.html 原创研究 = 技能说的 #1 引用磁铁；「引用本数据」复制块已在 report 页（本模式已反向移植给 agi /for-agents，舰队互学台账应记） |
| Strategic partnerships（integration 形态） | **全自动，大半已成** | 官方 MCP Registry v1.7、.well-known、Glama 认领、awesome-mcp-servers PR #12084——技能说 integration 链接 permanent + high-authority，正是已验证路径（/llms.txt 是全站 AI 抓取第一路径的证据链） |
| Citations/directories | **owner 分钟级** | 全部候选与粘贴稿已在 backlink-plan.md「Owner 动作」1-7 条，不重复列。技能新增的裁决支持：Chamber/本地 NAP 类对本站不适用（线上数据站无营业地址） |
| Entity stacking | **owner 分钟级，顺序有讲究** | backlink-plan.md 第 6 条已裁定：Wikidata 要等 Show HN + 有独立报道后再做（可证实性门槛），顺序别反。GitHub org 侧的 entity 信号本轮已加厚（见下） |
| Resource pages | **不适用（外联）→ 算子留档** | `AI tools intitle:resources`、`site:.edu "AI tools" resources`、`免费 AI 工具 导航站 收录`。有 owner 意愿时 pitch 物料 = report.html 本身 |
| Guest posting | 不适用 | 批量人工外联，过滤规则排除 |
| Competitor backlink gap | 不适用 | 需 Ahrefs/Moz；无预算 |
| Skyscraper | 不适用 | 冻结令零新页；且外联半被过滤 |
| Podcast guesting | 不适用 | owner 真人出镜 |

## 本轮已落地（零 owner 依赖）

**f-tiger/verified-ai-free-tiers 加 `CITATION.cff`**（公开仓，push 零 Actions
成本——其 workflow 只挂 schedule）。GitHub 原生渲染「Cite this repository」
按钮，APA/BibTeX 自动带 baipiaoji.com 回链与数据集 URL；诚实注明无 DOI、
活数据集引 check date。预期来源：学术/技术写作引用数据仓时的规范化回链，
量级小（个位数/季度）但零维护，且全部品牌锚——符合技能锚文本安全区间
（branded 40-50% 主力）。镜像仓 README 回链结构核查：已达标（首屏主站链 +
Registry 链 + 每工具行内链回 baipiaoji.com/en/tools/*），本轮无需改。

## 尚可全自动的待办

- [ ] mirror/ 目录同步一份 CITATION.cff（下次动 mirror 时顺手，保持两处一致）
- [ ] awesome-mcp-servers PR #12084 若被合并：把「已合并」记回 backlink-plan.md
  的完成表，并核查渲染后的行内链接可点

## Owner 分钟级动作

**全部沿用 `docs/backlink-plan.md`「Owner 动作」1-7 条的排序与粘贴稿**，
本方案不另立清单（两份清单必然漂移）。linkbuilding 技能视角下的唯一补充：
那 7 条里 **第 1 条（Show HN）优先级仍最高**——它同时是 entity stacking 的
「可证实性」前置（第 6 条 Wikidata 依赖它）与索引解锁后的第一批真实点击源。

## 速度红线（技能 Step 4）

Foundation 期月 15-25 条 foundation 链接为上限；红旗 = 单月 50+、exact-match
锚 >5%、同型来源扎堆（全是目录或全是 PR）。本站现有管线只产品牌锚，安全。
不买链接、不进 PBN、不互链农场——backlink-plan.md「明确不做的」全部继续有效。
