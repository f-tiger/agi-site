# 可验证有用 Agent 网络（Proof-of-Useful-Agent Network）商业与 MVP PRD

- 日期：2026-09-21
- 状态：研究完成，等待需求与商业门槛；不部署、不发币、不自动发帖
- 目标仓库：f-tiger/agi-site
- 建议落点：现有 AGI Scorecard / W3 / TradeCheck 资产，不新增独立域名

## 0. 优化后的执行 Prompt

> 以“可验证的有用贡献驱动的 Agent 网络（Proof-of-Useful-Agent Network）”为概念，评估并在 \`f-tiger/agi-site\` 中设计一个可产生真实收入的 AI Agent/MCP 站点。
>
> 目标：用户通过完成真实任务、创建可复用的 Agent/工具、分享链接带来合格使用和付费转化，获得一个有唯一编号、可验证血缘、可被 AI 调度的个人 Agent 子站；平台通过 MCP 托管、调用量、工作流/模板、团队空间、企业部署或获批联盟获得收入。
>
> 要求按“需求证据→用户洞察→竞争/替代→商业模型→一页 PRD→技术架构→最小实现→验证指标”的顺序执行，并明确停止条件。必须研究 MCP 最新规范、Bitcoin 时间戳/工作证明、NFT 唯一资产、分享平台规则和相关合规风险；区分官方能力、我们的实现、用户需求、营收证明和假设。
>
> 设计中必须包含：
> 1. 子站唯一 ID、编号、父子 fork 血缘、事件签名、Merkle/时间戳账本与可选公链锚定；
> 2. 可被 AI 发现和调用的 MCP endpoint、tools/resources/prompts、权限、OAuth、人工确认、审计和撤销；
> 3. 防刷和反女巫机制；分享只记录可验证的合格行为，不把点击或复制直接算作价值；
> 4. 透明的 Proof Score/AI opportunity estimate 算法，采用有用调用、留存、有效转化、质量、来源、账龄等因素，并设置递减收益、上限和异常惩罚；
> 5. 真实收入分成模型，禁止在 MVP 发行可交易代币、承诺升值、把编号/分裂次数包装成证券或“挖矿收益”；
> 6. X/Reddit 等渠道只提供用户主动分享和合规草稿，不自动群发或制造虚假外链；
> 7. 首个垂直切口、MVP 页面和 API、埋点、验收测试、成本与 30/60/90 天判定线。
>
> 结果要给出：是否值得做、推荐定位和名称、首个买家与收费单位、完整飞轮、数据模型、评分公式、MCP 契约、PRD、实现文件清单、风险与反证、验证计划；没有证据的地方写“未知”，不要用热度、分享数、星数或 AI 估值替代订单。

## 1. 决策

值得验证的是“可验证的 Agent 工具分发与收入分成层”，不是“复制次数自动升值的币”：

1. 先在已有 AGI/W3/TradeCheck 上做一个窄垂直探针。首选 TradeCheck：供应商发票与采购订单异常复核，任务边界清楚，已有本地 MCP 与人工引导工作流。
2. 子站编号、血缘、时间戳、Merkle 根用于可验证来源和审计；不代表所有权、未来收益或可交易资产。
3. 只有完成真实任务、产生合格 MCP 使用或真实付费，才计入 Proof Score 与分成。分享、点击、复制、注册和“AI 估值”本身不产生经济权益。
4. MVP 不发行代币、不做 NFT 交易、不承诺升值、不做多层拉人奖励、不自动向 X/Reddit 发帖，也不把每个 fork 部署成独立服务器。
5. 需求证据和付费证据尚未满足仓库门槛，因此本次执行止于 PRD 与验证计划，不写生产代码、不部署。

## 2. 证据与门槛

| 门槛 | 当前证据 | 判定 |
|---|---|---|
| 数据 | 仓库已有 W3 Proof of Research、Web3 MCP、TradeCheck MCP；可以复用验证、签名和 MCP 基础 | 技术探针可做 |
| 需求 | 没有该网络概念的独立买家、付费留存或已完成访谈证据；MCP 分发本身不是护城河 | 未通过 |
| 商业 | 当前仓库记录的已验证收入主要来自 Eco；TradeCheck 仍是待验证价格假设，没有 3 个独立付费买家 | 未通过 |

没有通过需求和商业门槛前，不创建新站点、不增加持续性第三方成本、不做广泛增长。

已有资产和证据：

- [W3 Proof of Research](./w3-proof-of-research-2026-09-20.md)：浏览器承诺、轻量 PoW、分享链接与验证；没有代币、转账或收益承诺。
- [Web3 MCP release](./web3-mcp-release-2026-09-19.md)：官方 SDK、远程 MCP、工具测试；没有钱包、支付或链上证明。
- [Vertical Agent commercial review](./vertical-agent-commercial-review-2026-09-18.md)：TradeCheck 的任务、质量和付费验证条件。
- [Product marketing rules](../.agents/product-marketing.md)：真实收入、真实用户信号和停止线。

## 3. 研究结论

### MCP 可以作为分发与调用接口

MCP 规范把 Agent 与外部工具、资源和提示模板连接起来；远程服务使用 host/client/server 架构和 Streamable HTTP，OAuth 可用于授权。工具调用需要明确同意、输入校验、限流、输出清洗、审计与撤销。工具的描述和安全标注应视为不可信输入，不能用“AI 自动调用”绕过人工确认。

参考：[MCP specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)、[MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)、[MCP tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)、[MCP resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)。

### Bitcoin 与 NFT 只能借鉴证明结构

Bitcoin 白皮书中的时间戳服务器把区块哈希串成链，工作证明提供排序与共识成本；它不是“被分享越多就越值钱”。区块奖励和交易费是网络激励，不能直接类比用户子站的营收。ERC-721 说明 NFT 是可区分、可单独追踪的资产标识；唯一编号不自动产生价值，元数据也常在链下。

参考：[Bitcoin whitepaper](https://bitcoin.org/bitcoin.pdf)、[EIP-721](https://eips.ethereum.org/EIPS/eip-721)、[OpenZeppelin ERC-721](https://docs.openzeppelin.com/contracts/5.x/erc721)。

### 分享、拉新与资产化存在边界

如果报酬主要来自招募而非最终用户购买或使用，结构会接近金字塔式奖励；社交媒体上的物质关系或联盟关系必须清楚披露。Reddit 要求真实参与，禁止垃圾内容、操纵互动和误导。涉及可交易加密资产或投资回报的设计需要单独的法律评估；SEC 的规则仍在演进。

参考：[FTC MLM guidance](https://www.ftc.gov/business-guidance/resources/business-guidance-concerning-multi-level-marketing)、[FTC social disclosure guidance](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)、[Reddit Rules](https://redditinc.com/policies/reddit-rules)、[SEC crypto-asset proposal](https://www.sec.gov/newsroom/press-releases/2026-76-sec-proposes-new-regulation-crypto-assets)。

## 4. 定位、买家与营收

建议名称：**Proof of Useful Agent（有用 Agent 证明）**。一句话定位：把一个可复用的工作任务变成带来源证明、可被 MCP 调度、按真实使用计费的 Agent 页面。

首个买家是假设，不是已验证事实：跨境贸易、采购或财务运营团队，需要复核供应商发票、采购订单与交付字段。首个任务是“上传或粘贴一组脱敏数据，得到异常清单、证据和人工复核队列”。财务决策仍由人做，Agent 不自行付款、交易或发起不可逆操作。

收费单位按真实价值计量：

- 团队工作空间订阅：先测试 TradeCheck 的 €29/月价格假设；价格未被接受前不得当作收入预测。
- 成功任务或成功 MCP 调用包：按完成的、可审计的任务计量，不按复制数计量。
- 企业部署与白标：在有重复使用与支持成本数据后报价。
- 模板/工作流市场：平台按实际付费订单收取佣金。
- 合规的联盟收入：只做获批产品的直接推荐，并披露关系。

创作者分成只能来自最终付费收入：先测试单层、固定期限（例如首个付费客户收入的 20%，最长 12 个月、设上限），不分享子孙节点的“招募费”，不因注册、点击或下线数量付费。任何比例和期限都需在收费前做法律复核。

## 5. 产品飞轮

```
用户描述一个真实任务
        ↓
生成 Agent manifest、MCP 契约、分享页与唯一编号
        ↓
用户主动分享；接收者用自己的数据创建 fork
        ↓
完成任务、复用工具、形成签名事件
        ↓
事件进入哈希链，定期生成 Merkle 根并可选外部锚定
        ↓
Proof Score 显示真实质量、留存、调用与已实现收入
        ↓
按真实付费使用分成，反馈回任务模板与下一代 Agent
```

复制是传播动作，合格 fork 才是产品事件。每个 fork 继承父节点引用，但使用自己的配置摘要、权限和事件链；一个父站不能凭空产生大量经济权益。

## 6. 身份、账本与证明

### 子站身份

- site_no：单调递增的展示编号，例如 AG-00000001。
- site_id：对 parent_site_id、owner_key_hash、config_hash、随机 nonce 做 SHA-256 后编码；唯一性来自内容与签名，而不是稀缺炒作。
- slug：可读名称，仅用于 URL，不参与证明。
- parent_site_id：根站为空；fork 必须引用父站。
- manifest_version：MCP 工具、输入输出 schema、权限和计费版本。
- status：draft、active、paused、revoked、archived。

编号和 site_id 是可验证的来源标识，不是证券、NFT 所有权或收益凭证。

### 事件对象

```
{
  "event_id": "evt_...",
  "event_type": "GENESIS|FORK_REQUESTED|FORK_QUALIFIED|SHARE_INTENT|MCP_CALL|TASK_COMPLETED|PAID_CONVERSION|SCORE_SNAPSHOT|MERKLE_ANCHOR",
  "site_id": "AG-00000001",
  "parent_site_id": "AG-00000000",
  "actor_key_hash": "sha256:...",
  "payload_hash": "sha256:...",
  "sequence": 1042,
  "created_at": "2026-09-21T00:00:00Z",
  "prev_event_hash": "sha256:...",
  "signature": "base64:...",
  "merkle_root": "sha256:...",
  "qualification": "pending|qualified|rejected"
}
```

MVP 使用受控的 append-only 数据库表（Postgres、Supabase 或现有 D1 约束内的等价实现），每个事件带前一事件哈希；按日或按批生成 Merkle 根。只把根或承诺锚定到公开链，私有输入、发票内容、邮箱和访问令牌留在链下。公开验证页重新计算哈希并显示失败原因。是否使用 Bitcoin、Base 或其他链，等有真实审计需求后再决定。

### 合格事件

至少需要两个独立信号才进入 qualified：

- 用户用自己的数据完成一次有结果的任务；
- 来自签名客户端且通过账号、速率和异常检查；
- 达到合理的最短操作时长或完成率阈值；
- 后续复用、留存或真实付费。

机器人点击、同一设备批量注册、重复 payload、只打开分享页、只复制配置和社交点赞都不计入价值。

## 7. MCP 契约

不要为每个 fork 启动一个进程。MVP 使用一个多租户 Streamable HTTP gateway，按 site_id 隔离 manifest、权限和配额：

- GET /agent/{site_no}-{slug}：分享页、manifest 摘要、父子关系和用户主动分享按钮。
- POST /mcp/{site_id}：MCP JSON-RPC 入口；实现 tools/list、tools/call，按需要实现 resources/list、resources/read 和 prompts/list。
- GET /.well-known/mcp.json：提供约定式连接信息，不声称已进入官方注册表。
- GET /api/agents/{site_id}/proof：返回事件摘要、Merkle 路径和验证结果。
- POST /api/agents/{site_id}/fork：创建 draft fork；完成任务后再发 FORK_QUALIFIED。
- GET /api/agents/{site_id}/score：返回版本化分项分数、置信度、证据覆盖率和时间窗口。

MVP 只暴露这些工具：

1. get_site_manifest：只读，返回 schema、版本、来源、计费和权限。
2. verify_proof：只读，验证事件、父链和 Merkle 路径。
3. run_task：沙盒内执行一次脱敏任务；写入 payload_hash，不写原始内容。
4. fork_site：创建待验证子站，不能直接增加分数。
5. get_score：返回 Proof Score 与原始指标。
6. get_ledger_proof：返回可公开验证的证明材料。

远程 MCP 必须使用 OAuth 或等价身份认证、作用域、限流、撤销、审计和人工确认；有副作用的工具默认关闭。敏感输入不写日志，私有响应使用 no-store。生成的工具 schema 必须通过输入校验、输出 schema 校验和提示注入测试。

## 8. Proof Score 与 AI opportunity estimate

Proof Score 是 0–1000 的可解释证明分数，不是代币价格。所有原始指标、计算版本和时间窗口公开，缺失证据显示“未知”，不由模型补全。

```
base = 0.25*Q + 0.20*T + 0.20*R + 0.15*M + 0.10*P + 0.10*A
ProofScore = round(min(1000, 1000*base*(1-fraud_penalty)))

Q = 任务质量与人工抽检通过率
T = 合格活跃用户和留存（log1p，设置上限）
R = 已实现净收入或已验证付费转化（只用实际账务）
M = 成功 MCP 调用、完成率和错误率
P = 签名来源、版本稳定性和第三方审计
A = 可用天数的对数函数，避免旧站无限增长
fraud_penalty = 异常、重复身份、拒付和人工复核惩罚
```

只把合格子站计入复制指标：

- replication_index = 1 + 0.15 × log1p(qualified_children)，上限 1.35。
- age_index = 1 + 0.10 × log1p(days_alive / 30)，上限 1.50。
- 账龄从首个合格事件起算，而非从批量创建时间起算。

AI opportunity estimate 只能输出低/中/高三档或区间，并附证据覆盖率、假设、成本和置信度。它可以辅助确定试验优先级，不能显示“未来值”“链上价格”或保证收益。真正的商业估值另建财务模型，以净收入、毛利、留存和支持成本为输入。

## 9. 分享与渠道

分享页生成 OG 图片、X/Twitter intent 链接和 Reddit 发帖草稿；用户主动点击和发布。平台不自动群发、不购买互动、不批量创建外链、不抓取社区内容。联盟、分成或商业关系在分享文案和落地页中清楚披露，Reddit 文案遵守所在社区规则。

分享事件只记录 intent、channel 和 proof link 的承诺，不把曝光、点击和复制直接换成分数或收益。

## 10. MVP 范围（28 天探针）

### 页面与接口

- /agent-factory：一个 TradeCheck 任务模板、输入约束、隐私说明和创建 draft fork。
- /agent/{site_no}-{slug}：分享页、运行一次任务、创建 fork、查看证明。
- /agent/{site_no}/proof：客户端验证事件链和 Merkle 路径。
- /mcp/{site_id}：只读 manifest、验证和沙盒任务工具。
- /api/events、/api/forks、/api/proof、/api/score：事件和指标接口。
- 后台审计页：异常队列、撤销、人工复核、成本与收入。

### 不做

- 可交易代币、钱包、空投、NFT 铸造与二级市场。
- 自动社交媒体发布、刷量、推荐返佣的多层下线。
- 每个子站一个独立运行时、开放任意代码执行、把原始企业数据写链。
- 用模型生成未经证实的估值、买家、案例或推荐语。

### 验收

1. 修改 manifest、parent_id、payload 或事件顺序后，验证必失败。
2. 同一合格任务重复提交不会重复计分；撤销后 endpoint 不可调用。
3. 现代 MCP 客户端和仓库既有 legacy 客户端都能完成 tools/list 与一次沙盒 tools/call。
4. 原始输入、令牌和个人信息不进入公开账本或普通日志。
5. 每个计分项可追溯到事件、版本和时间窗口；异常会降低分数并进入人工复核。
6. X/Reddit 只有用户主动分享动作，页面显示披露文本。
7. 无支付或付费转换事件时，R 为 0/未知，界面不显示收益预测。

建议未来文件清单（通过需求门槛后才实现）：

- sites/agiscorecard/agent-factory.html
- sites/agiscorecard/agent-factory.js
- sites/agiscorecard/agent-proof.js
- sites/agiscorecard/mcp-gateway.js
- agents/tradecheck-mcp/manifest.schema.json
- agents/tradecheck-mcp/score.ts
- agents/tradecheck-mcp/ledger.ts
- agents/tradecheck-mcp/anti-sybil.ts
- docs/PRD-proof-agent-network-2026-09-21.md
- migrations/agent_events.sql（若现有部署允许）

## 11. 30/60/90 天判定线

### 0–30 天：需求

- 100 个相关落地页访问；
- 20 次独立的真实任务完成；
- 至少 2 个不同组织或角色创建合格 fork；
- 5 次明确的价格/试用意向；
- 没有真实任务完成时，停止“分享增长”叙事，改回任务洞察或关闭探针。

### 31–60 天：质量与商业

- 任务样本中位处理时间减少至少 50%；
- 严重漏报为 0；边界案例进入人工复核；
- 至少 3 个独立付费买家或付费试点；
- 扣除模型、托管、支持和退款后贡献为正；
- 没有重复使用或付费，只留下分享数时，停止。

### 61–90 天：放大或关闭

只有在上述门槛同时成立时，才考虑团队计划、模板市场或外部链锚定。若主要信号是点击、星数、复制数、AI 估值或下线数量，而不是任务完成、留存和订单，关闭网络层，保留有用的单点 Agent。

## 12. 主要风险与反证

- **网络效应不存在**：用户愿意使用任务，却不愿分享或 fork。反证方法是分别测量任务价值与传播意愿，不把分享当成功。
- **MCP 不是护城河**：目录、n8n、Dify、Flowise、LangGraph 和自建 API 都能分发工具。护城河必须来自任务质量、证据、工作流和重复付费。
- **Sybil/刷量**：复制和调用便宜，必须用合格任务、签名、留存、付费和人工复核，而非地址数量。
- **隐私与企业数据**：发票等数据不能上链；只存哈希、脱敏结果和最小审计字段。
- **金融与传销误解**：不发行收益型资产，不用“挖矿回报”“早期编号升值”“拉人赚钱”等文案；收费与分成按真实终端订单计算。
- **平台政策**：分享只用官方 intent/草稿和用户主动动作，遵守社区规则和披露要求。
- **成本失控**：先限制一个垂直、一个任务、一个 gateway 和有限调用配额，不引入新的长期数据库/链服务，直到有付费覆盖成本。

当前结论：把它做成“证明和分发层”的研究探针有价值；把它做成“复制即升值、自动赚钱、可交易的 AI 链”没有足够证据，且风险高。下一步只有在 30 天需求门槛通过后，才进入最小实现。
