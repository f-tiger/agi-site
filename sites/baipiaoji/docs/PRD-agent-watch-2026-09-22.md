# 薄 PRD:Agent 监控目录加厚 + 首页联动 + 首页区块点击仪器(2026-09-22)

owner 原话:「Bpj我在其他会话上线了agents,但是丰富度不够,需要更多的agents工具,并且要和首页联动,检查下首页的点击,看是否替换一部分agents?」

## 现状(D1 现查 2026-09-22,28 天窗)

| 项 | 读数 |
|---|---|
| 另一会话上线的 agents 面 | `data/agent-watch.json` **6 条**(2 条是自家产品),`/agents/` + `/en/agents/` + 详情页 + `agents.json` + MCP `monitor_new_agents`;首页只在 `</nav>` 里追加了一个词 |
| `/agents/` 首日 pv | **5**,全部 US、1 国(疑为建站会话自查);`/en/agents/` 1 |
| 首页 pv | **243**(`/`,CN 134 / US 49,16 国)+ 22(`/en/`)—— 全站第一页 |
| 首页各区块被点几次 | **不可答**:事件只有 go/star/calc/sub_*,`ref` 对站内跳转写空;没有任何区块级仪器 |
| 首页独占入口的目的页 pv(代理) | plans 25 / en-plans 28 / money 24 / upgrade 23 / is-still-free 30 / agents 5 |
| MCP 调用 | `/api/mcp/*` 各工具 ~55 次/28d = 部署自检的形状;`monitor_new_agents` 0 |

## 三门

- **数据门**:首页 243 pv/28d 是全站最大的注意力面,而它没有区块级仪器——「替换哪个区块」今天在数据上答不了。所以先装仪器。
- **需求门**:owner 直接指令(与 08-30 /earn 同一先例);机器面上 MCP 生态索引器每天回访(09-16 普查),`monitor_new_agents` 是它们能读的新面。**诚实边界**:目前没有任何读者或外部机器消费过 agents 面。
- **商业门**:不装收款、不接联盟。agents 面的价值是引用与机器面(bpj 定位钉死:可售资产是「每日核实的活数据 + 变更历史」),条目全部带官方来源与 URL 核验日期,与 limits 同一套诚实规矩。

## 本轮做的(零新 cron、零收款、零编造)

1. **账本 6 → 28 条**。新增 22 条,每条的**官方主页当日从会话实抓 200**。仓库 URL:会话里 curl(Mozilla 形 UA)对 github.com 与 api.github.com 一律 403,但核验器用自己的明文 UA(`baipiaoji-agent-watch/1.0`)经 Node fetch **全部 200**——首跑(本会话)**26/28 仓库 URL 200,2 条第一方仓库链接 404**(`tradecheck-mcp`、`web3-studio` 指向本 monorepo,而仓库 09-18 转私有;页面如实渲染「最近核验 HTTP 404」,owner 决定公开仓库或换公开链接)。描述里不写星数、用户数、价格数字。**一条记录永不宣称它没做过的核验。**
2. **`scripts/agent-watch-verify.mjs`**(搭已有每日 schedule):每天给两条 URL 盖章,只写「哪条 URL 何时答过 2xx」;404/410 只标 `stale`,永不自动下线;403/超时视为未知不动。纯语义 `applyCheck` 有 8 例自测。**首跑当场抓到一个自己的 bug**:模块在被 import 时也会跑 `main()`,零网络测试因此触发了一次真实核验——已加「仅直接执行才跑」守卫;push 路径的闸门不许有副作用。
3. **MCP**:`monitor_new_agents` 加 `since`(首见日期,像变更日志一样轮询)与 `transport` 过滤;新增 `get_agent`(按 slug 取单条 + `verification` 块,查不到回已知 slug 列表不猜)。过滤/查找逻辑抽到 `functions/api/_agents.js`,零网络单测。`.well-known/mcp.json`、llms.txt、mcp.html、server.json(1.12.0)同步;**「14 个工具」这句在四处早已过期**(另一会话加了第 15 个没改文案),本轮改为 16 / 10 资源。
4. **首页联动**:智能体区块(section#agent)下加「新 Agent 与 MCP 监控」联动条——最新 6 条 + 全部入口,`data-home-block="agent-watch"`。**不替换任何区块**(理由见下)。
5. **首页区块级点击仪器**:`bpjEv('home', '/home/<区块>/<目标>')`,只在 `/` 与 `/en/` 挂;`home` 进 hit.js 白名单并由零网络测试断言(`audit` 事件曾因漏白名单静默丢失几周)。
6. **闸门**:零网络 `test-agent-watch.mjs`(schema / zh 平行字段 / 日期单调 / 核验字段 / 无未核数字 / 过滤与查找 / 白名单);`--dist` 断言 zh/en 首页都带联动条与信标且 `/agents/` 与账本逐条一致;部署后自检断言 **线上 `monitor_new_agents` count == 仓库账本长度**、`get_agent` 带 verification、`/agents.json` count == 仓库(不写死数字)。

## 「是否替换一部分」的回答

**今天不替换。** 首页没有区块级点击仪器,任何替换都是猜;代理读数(目的页 pv)只能说明 plans/money/upgrade 三个区块各把约 25 人/28d 送到了目的页,分不出「没人点」和「点了没留」。这三个区块各自有 owner 直接指令与判定线(`bpj-earn-gate-0928` 六天后到期),不在它们结算前动手。**28 天后按 `home` 事件读数替换零点击区块**——判定线 `bpj-home-blocks-1020`。

## 判定线(已进 `data/fleet-bets.json`)

- `bpj-home-blocks-1020`:`home` 事件 28d ≥40 且 ≥5 个区块有读数 → 仪器成立,零点击区块按数据替换。
- `bpj-agent-watch-1020`:`/agents/*` 真人 pv ≥30 或 首页→agents 点击 ≥10 或 非 CI 的 `monitor_new_agents`/`get_agent` 调用 ≥5 → 继续按周扩条目;三项全空 → 只维护不扩,联动条撤回 nav。

## 不做

- 不为「更多 agents」再建一个子站/子域(三条铁律不中;09-16「站是最贵的容器」)。
- 不写任何未核数字(星数、用户数、价格);不编 repo 核验日期。
- 不用 LLM 生成条目或描述;不自动把 PH/HN 雷达命中的产品塞进账本(候选进人工队列,官方主页 200 才入)。
