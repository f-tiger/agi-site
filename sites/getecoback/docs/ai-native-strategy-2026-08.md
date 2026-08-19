# AI 时代网站战略：从"被搜索的文档"到"被 AI 引用与调用的基础设施"（2026-08-08）

> 触发：owner「把这个网站打造成 AI 时代成功的 AI 网站」。
> 方法：ai-seo 技能框架（GEO/AEO/Agentic）× 本站自有数据 × 外部调研（带来源）。

## 0. 为什么本站有资格谈这个：它已经活在后 Google 世界里

自建漏斗（D1，28 天）的引荐构成：**Bing 8 / DuckDuckGo 7 / chatgpt.com 4 / Ecosia·Brave·Startpage·Yahoo 各 1-2，Google = 0**。
且 chatgpt.com 引荐的会话**已产生联盟点击**（EN heatwave 页）——AI 引用→点击→佣金这条链路在本站不是理论，是已发生的事实。

**战略含义**：多数网站把 AI 流量当增量，本站的 AI 流量是**存量主力**。别人在防守 Google，本站无 Google 可守——所以"AI-native"不是转型，是把已然成立的模式做深。

## 1. AI 时代网站的三个成功层（每层对照本站现状）

### 层 1：被 AI 引用（GEO/AEO）——本站已建成 80%
| 要素（Princeton GEO 研究的提升幅度） | 本站现状 |
|---|---|
| 引用来源（+40%）/ 统计数字（+37%） | ✅ DWD/UBA/BGH 等带源数字已入页 |
| 直答块 40-60 词 / FAQ schema 逐字 | ✅ 全站约定，CI 校验 |
| llms.txt + llms-full.txt | ✅ 自动生成，每次部署同步 |
| AI 爬虫 robots 准入 | ✅ GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot 等 11 个显式 Allow |
| 新鲜度信号 | ✅ 可见 Aktualisiert 徽标 + dateModified 自动同步 |
| **缺口：第三方在场**（Wikipedia/Reddit 引用占比高于自有域名） | ⚠️ 仅有人工分发稿，owner 手发（合规红线：不自动发帖） |

### 层 2：被 AI 调用（Agentic / tools-as-service）——本轮旗舰
AI 助手正在从"引用网页"走向"调用工具"。当 Claude/ChatGPT 的代理替用户算"我的房间需要多少 BTU"时，**提供这个工具的站点=每次调用都被引用一次**。
本站已有的地基：公开聚合 API（/api/heat、/api/top、/api/trend，防御式、无鉴权、CI 断言）+ 8 个站内计算器的纯函数逻辑。
**本轮落地：`getecoback.com/mcp` — 标准 MCP（Model Context Protocol）服务器**，暴露 4 个工具（BTU 推荐/窗封长度/热浪前瞻/空调电费），任何 MCP 客户端（Claude Desktop、各类代理框架）可直接接入；每个工具响应自带来源 URL 与"非自测"披露=**被调用即被引用，且诚实约定随数据一起传播**。
同时上 `/.well-known/mcp.json` 发现文件 + llms.txt 声明。

### 层 3：AI 时代的商业模式——单位经济学不变，分发结构变了
调研结论（带源）：AI Overviews 使网页点击最多减少 58%，但 **AI 引荐的访客意图更强**（本站实测：chatgpt 引荐 4 pv 出 2 次联盟点击，转化率远超均值）。
- **近期（已在跑）**：被引用 → 高意图点击 → Amazon 联盟。AI 时代放大器=工具被调用后的"查看完整推荐"回链。
- **中期（widgets 层已建）**：工具即服务——白标嵌入（B2B）+ MCP 生态在场。
- **明确不做**：AI 内容农场（Google "scaled content abuse" 政策 + 摧毁唯一在起作用的引用信誉）；付费墙锁内容（AI 引用不了=消失）。

## 2. 与"AI 时代算法"的对齐清单
- Query fan-out（Google AI 并发子查询）→ 主题簇完整覆盖 ✅（141 页四大簇）
- 可提取结构奖励（ChatGPT/Claude/Perplexity）→ 直答块/表格/FAQ ✅
- 代理可读性（DOM/无 JS 依赖渲染/语义 HTML）→ ✅ 全站零框架、内容服务端直出
- 机器可读文件层 → llms.txt ✅ + **MCP（本轮）**；OKF 暂缓（无确认信号，等采用率）
- 关键词堆砌（-10%）→ 本站从未采用 ✅

## 3. 判定（预注册）
- MCP：90 天内出现任何真实第三方调用（D1 `mcp_call` 事件，排除 CI/自测）→ 维持并扩工具；0 调用 → 保留（维护成本≈0）但停止扩张。
- AI 引荐份额：chatgpt/perplexity/copilot 引荐占比连续 4 周 ≥20% → 把 GEO 深化设为每日循环的常设优先级。
- 第三方在场：owner 手发分发稿后 4 周，观察 AI 答案中是否出现本站（DIY 监测：20 个核心查询/月/三平台）。

## 来源
Princeton GEO (KDD 2024) 提升幅度、AI Overviews 占比与点击影响、爬虫准入与机器可读文件实践：ai-seo 技能 references（内含原始来源链接）。
本站自有数据：D1 `ecoback-events`（docs/analytics-first-party-d1.md 的查询口径）。
