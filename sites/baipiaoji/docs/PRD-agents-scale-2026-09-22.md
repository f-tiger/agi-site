# 薄 PRD:Agent 与 MCP 目录扩到 ~1000、按受众分门、走站点 layout、GEO 面(2026-09-22 第二轮)

owner 原话(同日三条):
1. 「扩展agents到200个以上,优化被引用与点击可能,确保多语言正确」
2. 「升级到1000左右,成为最大的agents站点,agents要面向不同的用户分类清晰,然后做流量geo等优化」
3. 「我发现新agents监控菜单在首页和中英文并列放在一起。另外这个菜单内容样式与站点差异大,中文跳转到英文也混乱,整体重构下agents」

上一轮薄 PRD(`PRD-agent-watch-2026-09-22.md`,6 → 28 条)仍有效;本文件只写这一轮改了什么、为什么、判定线。

## 三门

- **数据门**:①`/agents/` 旧版首日 5 pv 单国——而旧版页面**零信标**(自带模板,没有 `analyticsOf`),所以那 5 pv 来路不明;
  ②bpj 的 AI 引荐与 Google 引荐 15 条里 11 条落在 `/c/*` 与 `/vs/*`(第 18 条)——**列表/类目页是本站被引用的页型,工具页不是**;
  ③官方 MCP 注册表公开 API 首拉 80 页 8 000 条最新版,7 177 条有仓库或官网——供给侧是真实存在的。
- **需求门**:owner 直接指令(三条);「哪些 agent / MCP 值得看」在 MCP 生态索引器每天回访的机器面上(09-16 普查 7 个自报身份的采集器)有消费者。**诚实边界**:今天没有任何人类读者读过新版页面。
- **商业门**:不装收款、不接联盟、零外链联盟参数。价值是引用面与机器面(bpj 定位:每日核实的活数据 + 变更历史);记录带官方来源与 URL 核验日期,与 limits 同一套诚实规矩。

## 这一轮做了什么(零新 cron、零收款、零编造、零 LLM 生成)

### 1. 账本 28 → 978(298 人工收录 + 680 官方 MCP 注册表)

| 来源 | 候选 | 入账本 | 被拒(次日由 runner 重试) | 入门规则 |
|---|---|---|---|---|
| 人工种子 `data/agent-watch-candidates.json` | 282 | **270** | 12(403 / 5xx / 超时 / 404 / 1 条仓库重复) | 官方主页当天 2xx |
| 官方 MCP 注册表 `data/agent-watch-candidates-registry.json` | 720(cap) | **680** | 38 | 仓库(或官网)当天 2xx |

- **人工种子**:282 条,每条手写英文 + 中文一句话描述,类目 / 接入方式 / 能力 / 价格形态 / 证据等级全部是**词表键**(`data/agent-watch-vocab.json`),文案由词表渲染——一条翻译只写一次,978 条不会各自漂移(`test-agent-watch.mjs` 断言渲染文本 == 词表)。描述里不写星数、用户数、价格。
- **官方 MCP 注册表**(`scripts/agent-watch-registry-pull.mjs`):命名空间经 GitHub OAuth / DNS 鉴权,条目由控制该命名空间的人发布——是有来源的发现信号。只取最新版 + active + **有仓库或官网**(没有可核验的官方页就不是候选),仓库优先、`updatedAt` 倒序,cap 720。**保留的就是发布者写的**:名字、描述、仓库、官网、包注册表、远程端点;不排名不评分不改写。发布者的中文标题进 `zh_name`,英文面用注册表名尾段(英文页有无中文门)。
- **入门 `scripts/agent-watch-admit.mjs`**:抓官方页(核验器同一个明文 UA),**只在 2xx 时收录**;顺手记下该页自己的 `<title>` 与 meta description 作 `official` 块(带抓取日),这是记录页上唯一的"第三方文字",标明出处与日期。仓库永远不能单独换来收录——错的主页 URL 会变成"已核验"记录。被拒的写 `data/agent-watch-admissions.json`(reason + HTTP + 尝试次数),runner 每天 `--max 60` 重试。
- **旧 28 条**补上词表键(4 条从 `agent` 重分到 `platform`),`origin: curated`。

### 2. 页面整体重构:走站点自己的 layout

owner 指出的三个问题都是同一个根因:旧版是独立模板(自带 CSS、`</nav>` 注入、无语言切换)。现在 `scripts/agent-pages.mjs` 全部经 `build.mjs` 的 `layout()` 出页——同一份 `style.css`、侧栏 rail、`<nav class="lang">` 语言切换、页脚、**同一套信标**。

| 页 | 数量(zh + en) | 索引 | 作用 |
|---|---|---|---|
| `/agents/` 枢纽 | 2 | 可索引,进 sitemap,hreflang | 「你是谁」六扇门 + 类目 + 最新 24 + 机器面 + FAQ |
| `/agents/for/<受众>` | 12 | 可索引 | 六个受众:开发者 / 让 AI 替你写代码的人 / 不写代码也能用 / 给任意 Agent 加能力(MCP) / 团队与企业 / 研究与数据;人工收录的记录完整展示,注册表的只计数并链到类目表 |
| `/agents/c/<类目>` | 26 | 可索引 | **完整清单表**,13 个类目——这是被引用的页型;注册表行直接链仓库 |
| `/agents/<slug>` 记录页 | 596 | **noindex,follow**,不进 sitemap,不带 hreflang | 只给人工收录的 298 条;官方页自述、词表标签、URL 核验、同类目、MCP 取用 |

- **受众是机械推导的**(`_agents.js` `audiencesOf()`:类目 + 词表键 → 受众,一条可属多门),不是逐条手标——1 000 条才能保持一致。
- **注册表来源的 680 条没有记录页**:它们的页面就是仓库。这把 1 360 张近乎同构的薄页挡在索引外(bpj 13-④ / eco 09-17 的薄页教训)。
- 首页联动条改为**六扇受众门 + 最新 6 条人工收录**;侧栏 rail-jump 与页脚各加一个入口;**`</nav>` 注入删除**——这就是"中英文并列"的来源(旧版把链接注到了语言切换的 `<nav class="lang">` 里)。
- 多语言:词表双语;`zh_category` 必须等于词表;英文字段无中文、`zh_description` 必含中文(零网络门);英文页的 `official` 文本含中文则不显示;verify-dist zhLeak / hreflang 全绿。

### 3. GEO 面

- 类目表带 `ItemList` JSON-LD(前 60 条 + 总数)、面包屑;枢纽带 `CollectionPage`;记录页 `WebPage` + `SoftwareApplication`。
- `llms.txt` 新增「Agents & MCP directory」一节:六扇门 URL、13 张类目表 URL、JSON、MCP 工具与过滤参数。
- `agents.json` 每语言一份(英文版剔除 `zh_` 字段),带 `audiences`、词表键、`official` 块、类目与受众计数。
- MCP:`monitor_new_agents` 加 `audience` / `origin` / `offset` / `limit`(默认 50、上限 100,返回 `total` / `next_offset`),`get_agent` 回 `audiences` + `official`;server.json 1.13.0。

### 4. 点击仪器

- 记录页与所有表格的出站链接带 `data-tool="agents/<slug>/source|repo"` → 站内已有的委托监听发 `ev='go'`,路径 `/go/agents/<slug>/<kind>`;页面经 layout 自带 page_view 信标。
- **顺手抓到的第三个仪器缺陷**:`gate` / `earn` / `gs` / `gs_go` / `ad` 五个事件名的发送端早在页面里(08-29 起),但 09-04「未知事件名改为丢弃」上线时**没进 hit.js 白名单**——此后全部在边缘被静默丢弃,D1 里恒为 0。第 9/10/11/13/15 条与四条判定线此前读到的 0 是丢包不是读者行为。已补白名单;`test-agent-watch.mjs` 现在**机械比对 build.mjs 里每一个 `bpjEv('x')` / `EV('x')` 都在白名单里**(这是 `audit` 同一种失踪的第三次,改成程序断言)。相关判定线在台账里加了 `instrument_note_2026-09-22`,窗口从本次部署起算。

### 5. 每日预算(仓库已转私有,分钟计费)

schedule 三步:registry-pull(API 出错保留旧文件)→ admit `--max 60` → verify `--max 40`(3 并发,最久未核优先,每条约每周轮到一次)。合计 ≈2 分/日 ≈ 60 分/月。push 路径只加零网络自检(admit / registry-pull `--selftest` + `test-agent-watch.mjs`)与 `--dist` 断言;部署后自检加翻页 + 受众过滤 + 六个页面 200 + 记录页 noindex。

## 判定线(已进 `data/fleet-bets.json`)

- `bpj-agents-scale-1103`(42 天):`/agents/%` 真人 pv ≥60 且 `/go/agents/%` 出站 ≥15 且 搜索/AI 引荐落地 `/agents%` ≥3 → 继续吸纳、受众页按读数排、考虑对有点击的记录解除 noindex;≥2 项未达 → cap 冻结、只维护管线;pv <20 连受众页也退回。
- `bpj-agents-registry-quality-1020`(28 天):注册表来源 stale ≤5% 且拒绝率 ≤30% → cap 720 → 1 500;否则收回到 400 并只收有 packages 且 90 天内更新的。
- 上一轮的 `bpj-agent-watch-1020` / `bpj-home-blocks-1020` 不变,加同日读数备注。

## 不做

- 不为 agents 开子站/子域(三条铁律不中;09-16「站是最贵的容器」)。
- 不用 LLM 写描述、不翻译发布者的文字(注册表记录展示英文原文并标明);不写任何未核数字。
- 不给注册表来源的记录建页;不把候选自动塞进账本(官方页 2xx 才入);不改 hit.js 以外的埋点口径。
- 不做「更多条目」的第三次立项,除非 `bpj-agents-scale-1103` 判 win。
