# 第一方埋点接入（替代 GA4）· agiscorecard.com
建立 2026-08-05 · robots-disallowed 工作文件

## 为什么不是 Cloudflare Analytics，也不是恢复 GA4

owner 问："为什么要 GA4，你可以从 Cloudflare 获取。"
方向对，但落点要修正。实测本会话能调到的 Cloudflare MCP 是
**Developer Platform**（D1 / KV / R2 / Workers / Hyperdrive）——**没有 analytics 工具**。
即便有，Cloudflare Web Analytics 也只给 PV 和来源，
**不支持自定义事件**，而整个营收实验组合的判定全部依赖自定义事件：

| 判定项 | 需要的事件 | CF Web Analytics 能给吗 |
|---|---|---|
| 订阅位赛马（9 个位置） | `subscribe_click{location}` | ❌ |
| 观点钩子赛马（EN 5 + zh 4） | `tool_click{opinion_*}` | ❌ |
| 深链漏斗是否成立 | `deeplink_pick` | ❌ |
| E6 白标前置条件 | `embed_copy` | ❌ |
| E1 分发是否生效 | referrer 主机 | ✅（仅此一项） |

**结论：自建第一方埋点，事件写入 D1，会话用 MCP 直接查。**
比 GA4 更适合：schema 我自己定、无订阅、不过期、
第一方端点不被广告拦截器静默清零（这一点在小样本下尤其致命）。

## 已完成（我这边，零风险）

- D1 数据库 `agiscorecard-events`，id `f84f9d29-3ad9-4b37-b28e-3a78027d2f22`
- 表结构已建：`events`（含 day/name/location/label/path/ref_host/country/ua_class + 3 个索引）、`pageviews`
- 采集器代码 `tools/analytics-worker/index.js`（语法已校验）
- 部署配置 `tools/analytics-worker/wrangler.jsonc`（语法已校验）

## 状态：2026-08-05 已由 owner 授权并部署

owner 指示"不要依赖我，自动化完成"（风险已提出并被重申），因此 `wrangler.jsonc` 已移至仓库根目录
并推送。查文档后修正了两个**会静默失败**的配置项：
- `run_worker_first: true` —— Workers 默认静态资源先于脚本返回（与 Pages 相反）。不设它，
  HTMLRewriter 注入的 beacon 一行都不会执行，采集器会"部署成功但永远收不到数据"。
- `.assetsignore` —— Workers 不像 Pages 会自动排除 `.git`。不加它，**整个仓库历史会被当静态资源公开**。
  同时排除了 `.claude` 与 `tools/`（后者此前只是 robots-disallow，文件本身谁都能读，现在真正不可达）。

**验证方式**（代理封了线上站点，只能用间接信号）：`workers_get_worker_code` 应由 null 变为有代码；
D1 `events` 表应开始进数据（站点日均约 7 访客，可能需要数小时才出现首行）。
任一失败即 `git revert` 回滚——上一个状态是纯静态资源部署、无 worker 脚本，回滚干净。

### 验证结果（2026-08-05）——**已跑通，真实数据在库**

| 信号 | 结果 |
|---|---|
| `workers_get_worker_code('agiscorecard')` | ✅ 由 null 变为完整采集器代码 |
| 站点可访问性 | ✅ worker 对非 `/api/e` 请求直接回落 `ASSETS`，自定义 404 保留 |
| D1 `events` 行数 | ✅ **27 行**（部署当天数小时内），含真实来源与真实交互 |

首批数据（08-05 当天，均为 `ua_class='human'` 除非标注）：

| 来源 | 落地页 | 说明 |
|---|---|---|
| `bing.com` | `/situational-awareness-summary` | ChatGPT 搜索走 Bing 索引，这条最值钱 |
| `www.google.com` / `search.google.com` | `/` | 自然搜索 |
| `duckduckgo.com` | `/situational-awareness-summary` | |
| 直接访问 | `/`、`/when-will-agi-arrive`、`/how-close-is-agi` | |
| （bot） | `/` | 爬虫标记未丢弃 |

交互事件也进来了：`pred_expand` ×3（SG）、`readnext_click` ×2（KR / SG）——
说明 `gtag()` 包装层在真实浏览器里工作正常，不是只有 page_view 能进。
**结论：链路通了，此后实验读数以 D1 为准。**

## 2026-08-05 追加：**并行双通道**，GA4 保留（owner 指令）

owner 明确："**不是让你删除 GA4，而是增加一个通道，避免出现问题**"。
执行时我一度把 182 页的 GA4 脚本摘掉了，**已全部回滚**——GA4 一行未动，
新增的只是 worker 侧的第二条通道。两条通道相互独立，任何一条挂掉另一条照常记录。

新增的部分（纯增量，不碰任何页面文件）：

**① 服务端 PV（不依赖 JS）。** worker 本来就先于静态资源看到每个请求，
所以 HTML 响应直接在边缘计数写入 `pageviews`，**完全不经过 JavaScript**。
这是这条通道相对 GA4 的真正优势：广告拦截器、关闭 JS 的读者、以及 AI 爬虫，
GA4 全部看不见——而"被 AI 引用"恰恰是本站的增长通道，那部分流量必须能数。
它同时是自检信号：绑定若失效，`pageviews` 就是空的，一眼可见。

**② UTM 归因。** GA4 自动做的渠道归因不能白丢。beacon 此前只发 `location.pathname`，
**query string 被整个丢掉**，意味着 `?utm_source=widget`（widget 外链飞轮）和所有
X / Reddit 种子链接在 D1 里根本不可见。现在按白名单读取 `utm_source/medium/campaign`
三个键——只读这三个，不是整条 query（整条 query 可能带能指认到人的东西）。

**服务端 PV 验证结果**：新 worker 部署确认（`workers_get_worker_code` 返回新版代码），
`pageviews` 首行已落库——`human · / · 直接访问 · DE · 1 hits`。**两条通道均已端到端跑通。**

**安全性（"避免出现问题"这一条的直接落实）**：新增的 D1 写入落在**页面服务路径**上，
所以 `recordView` 整体包在 try/catch 里，且写入走 `ctx.waitUntil` 不阻塞响应。
绑定缺失只会让统计为空，**不会让站点 500**。`/api/e` 分支同样补了 try/catch。

**schema 迁移（已执行）**：`events` 加 `utm_source/utm_medium/utm_campaign` 三列；
`pageviews` 重建——原表把可空列放进主键，而 **SQLite 主键里的 NULL 互不相等**，
upsert 永远命中不了，每次访问都会新写一行。现在这些列 `NOT NULL DEFAULT ''`。
（重建时该表为 0 行，无数据损失。）

**口径提醒**：`events` 里 08-05 当天存在 20 条 `page_view`（beacon 旧版发的），
之后 PV 改由 `pageviews` 服务端记录，**不要把两者相加**。

### ⚠️ 报数铁律（2026-08-06 实测后加，违反即在脏分母上做决策）

**`pageviews.ua_class='human'` 不是读者数。** 首个完整数据日实测：
服务端记 **157 个 human PV、21 个路径、几乎全无 referrer**，同期 JS 交互事件仅 **6 次**。
真实读者不会翻 21 页且一次都不点——差额是不自报身份的抓取代理。

两张表各有各的用途，**不要混为一谈，也不要相加**：

| 表 | 含义 | 什么时候用 |
|---|---|---|
| `pageviews.hits` | **触达面**：所有到达边缘的请求，含 AI 抓取器 | 报"被抓取/被引用的覆盖面"——这正是 GA4 看不见、而本站增长通道最需要的那部分 |
| `events.page_view` | **浏览器确认**：JS 真的执行了 | 报"读者数"。位置赛马、转化率的分母只能用它 |
| `ua_class` | UA 字符串猜测，**已知偏松** | 只做粗筛，永远不要单独拿它下结论 |

```sql
-- 读者数 vs 触达面(按天)，比值才是可信读数
SELECT p.day, SUM(p.hits) AS 触达面,
  (SELECT COUNT(*) FROM events e WHERE e.day = p.day AND e.name='page_view') AS 浏览器确认
FROM pageviews p GROUP BY p.day ORDER BY p.day DESC;
```

**口径断点**：JS `page_view` 在 2026-08-05 被移除、2026-08-06 恢复，
这两天之间的"浏览器确认"数偏低，跨该窗口比较时须标注。

### 渠道分组（替代 GA4 的 Organic Search 读数）

```sql
SELECT CASE
  WHEN ref_host = '' THEN 'Direct'
  WHEN ref_host LIKE '%agiscorecard%' THEN 'Internal'
  WHEN ref_host LIKE '%google%' OR ref_host LIKE '%bing%' OR ref_host LIKE '%duckduckgo%'
    OR ref_host LIKE '%yandex%' OR ref_host LIKE '%baidu%' OR ref_host LIKE '%ecosia%' THEN 'Organic Search'
  WHEN ref_host LIKE '%chatgpt%' OR ref_host LIKE '%openai%' OR ref_host LIKE '%perplexity%'
    OR ref_host LIKE '%claude%' OR ref_host LIKE '%gemini%' OR ref_host LIKE '%copilot%' THEN 'AI Assistant'
  WHEN ref_host LIKE '%x.com%' OR ref_host LIKE '%t.co%' OR ref_host LIKE '%twitter%'
    OR ref_host LIKE '%reddit%' OR ref_host LIKE '%ycombinator%' OR ref_host LIKE '%linkedin%' THEN 'Social'
  ELSE 'Referral' END AS channel,
  SUM(hits) hits
FROM pageviews WHERE ua_class='human' AND day >= date('now','-28 day')
GROUP BY channel ORDER BY hits DESC;
```

**注意**：Bing 既是自然搜索也是 ChatGPT 搜索的索引源，上面归在 Organic Search。
要单看它就直接 `WHERE ref_host LIKE '%bing%'`——不要为了让 AI Assistant 数字好看而改归类。

```sql
-- 落地页排行（替代 GA4 landingPage）
SELECT path, SUM(hits) hits FROM pageviews
WHERE ua_class='human' AND day >= date('now','-28 day')
GROUP BY path ORDER BY hits DESC LIMIT 20;

-- 人机拆分（GA4 完全看不到的那半边）
SELECT ua_class, SUM(hits) hits FROM pageviews
WHERE day >= date('now','-28 day') GROUP BY ua_class;

-- 带 UTM 的流量（widget 外链 / X / Reddit 种子是否在跑）
SELECT utm_source, utm_medium, utm_campaign, SUM(hits) hits FROM pageviews
WHERE utm_source <> '' AND day >= date('now','-28 day')
GROUP BY utm_source, utm_medium, utm_campaign ORDER BY hits DESC;
```

## 原始接入说明（保留作参考）

站点当前以 **dashboard 配置的 Workers 静态资源**形式部署，
我这套 MCP 对 Workers 是**只读**，无法部署、也无法加绑定。
**所以最后一步必须由你来点。**

### 为什么我没有自己把 wrangler.jsonc 放到仓库根目录

因为那会改变现有构建的解析方式——站点是你的线上资产，
**一次配置错误就是全站下线**，而这属于"难以撤销、对外可见"的动作。
配置文件我写好了，但放在 `tools/` 下、不生效，
把开关交给你，而不是让它成为"加个文件"的副作用。

### 你的操作（二选一）

**方案 A — 最省事：让我把配置移到根目录，你在 dashboard 只做一件事**
1. 你回复"上根目录"，我把 `wrangler.jsonc` 移到仓库根并推送
2. 你在 Cloudflare dashboard → Workers & Pages → `agiscorecard` → Settings → Bindings
   → 确认存在 D1 绑定：变量名 `EVENTS` → 数据库 `agiscorecard-events`
3. 下一次推送自动生效

**方案 B — 更稳：你本地跑一次 wrangler**
```
git clone <repo> && cd agiscorecard
cp tools/analytics-worker/wrangler.jsonc ./wrangler.jsonc
npx wrangler deploy
```
部署失败不会影响线上（wrangler 会先校验），成功后回滚也只需 dashboard 一键。

**风险提示**：方案 A 首次生效时，静态资源改由 `ASSETS` 绑定提供。
若 dashboard 里已配置了不同的 assets 目录，需以 dashboard 为准调整
`wrangler.jsonc` 的 `assets.directory`。**我会在推送后立即验证线上可访问性**，
异常则立刻回滚。

## 生效后我能自动做什么

每日运行不再依赖任何第三方订阅，直接跑 SQL：

```sql
-- 订阅位赛马（营收阶梯①的核心读数）
SELECT location, COUNT(*) n FROM events
WHERE name='subscribe_click' AND ua_class='human' AND day >= date('now','-28 day')
GROUP BY location ORDER BY n DESC;

-- 观点钩子九页赛马（owner "不是科普站" 规则的验证）
SELECT location, label, COUNT(*) n FROM events
WHERE name='tool_click' AND location LIKE 'opinion_%' AND ua_class='human'
  AND day >= date('now','-28 day')
GROUP BY location, label ORDER BY n DESC;

-- E1 分发是否生效（外部来源域名）
SELECT ref_host, COUNT(*) n FROM events
WHERE ref_host IS NOT NULL AND ref_host NOT LIKE '%agiscorecard%'
  AND day >= date('now','-28 day')
GROUP BY ref_host ORDER BY n DESC;

-- 深链漏斗（文章→一击→结果）
SELECT label, COUNT(*) n FROM events WHERE name='deeplink_pick'
  AND day >= date('now','-28 day') GROUP BY label ORDER BY n DESC;
```

## 隐私与诚实

- 不存 cookie、不存标识符、不存 IP、不存完整 referrer（只存主机名）
- 国家码来自 Cloudflare 边缘请求头，两位字母，粗粒度
- 机器人**标记而非丢弃**（`ua_class`），人机拆分始终可审计——
  这一条很重要：`/experiments` 页承诺公开真实数字，
  如果统计里混入爬虫却不标注，那个承诺就是空的
- 服务端 PV 是**按天聚合的计数**（day/path/来源主机/国家/UTM/人机 → hits），不是逐次访问日志，
  且**不经过 JS，因此拦截器关不掉它**。这一点必须在 `/privacy` 明写，不能含糊过去——
  原来那句"屏蔽 JS 即可阻止采集"在加了服务端计数之后就不再成立了，已改写。
- ✅ `/privacy` 已补说明（2026-08-05）：新增「First-party log」小节，
  逐字段列出存了什么、明说不存 cookie/标识符/IP/完整 referrer，并写明
  "因为没有标识符，所以也无法单独删除属于你的那几行——那里本来就没有能指认你的东西"。
  这一条是诚实性要求，不是合规装饰：`/experiments` 承诺公开真实数字，
  采集口径就必须是可核对的。

## 与 GA4 的关系

**并行，不替换。** 采集器包装现有 `gtag()` 而非替换它，
GA4 若日后恢复仍照常工作。历史数据（08-02 之前）**只在 GA4 里，本方案追不回**，
所以 `/experiments` 的基线数字保留 GA4 口径并标注了口径切换点。

## 2026-08-06：站内注册流（`subscribers` 表）

owner 指令："网站没有注册流程，用户无法留存或者营销，资产白白流失了" + "注册应该有钩子"。

**流失点量化**：全站 **203 个订阅 CTA、覆盖 182 个页面、站内表单 0 个**——
每一个 CTA 都是跳出到 beehiiv 的外链。读者必须离开网站、加载第三方页面、在那边填表。
29 次 JS 确认浏览里 `subscribe_click` = 0。**漏斗第一步就在流失。**

**做法**：和埋点同一套架构——**在边缘把订阅链接就地升级成表单**，182 个页面文件一行未改。
锚点保留真实 `href` 与原有的 `subscribe_click` 埋点（先于新逻辑触发，归因不丢）；
脚本没加载或请求失败时，点击行为与从前完全一致（打开 beehiiv）。**只能增加路径，不会减少路径。**

**钩子（owner 的关键纠正："Subscribe" 是标签不是理由）**：文案按 CTA 位置切换，
最强的一个是别人给不了的——**逐条判定的条件式提醒**：
> "One email, only if this verdict flips ——你刚读完什么会让我们改变对**开源退场**的判断。
> 它真的发生那天我们写信给你，其余时候不写。"

`topic`（预测 id）随邮箱一起入库，所以"这条翻转时通知我"是**能兑现的承诺**，不是话术；
同时也让我们知道**哪一条预测最能带来注册**。

**表结构**：`subscribers(email PK, created_ts, day, location, topic, path, lang, country,
utm_*, ref_host, status, synced_ts, sync_note)`。

**beehiiv 同步**：worker 里 **先入库、再转发**——转发失败或尚未配置密钥时，
邮箱仍然是我们的，不会丢。配置 `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID` 两个 secret 即自动直连；
未配置时页面措辞相应改变（不承诺一封不会到达的确认邮件）。

```sql
-- 注册漏斗（哪个位置真的带来邮箱）
SELECT location, topic, COUNT(*) n, MIN(day) first, MAX(day) last
FROM subscribers GROUP BY location, topic ORDER BY n DESC;

-- 表单漏斗：打开 → 提交 → 成功（分母缺一个都无法判断卡在哪）
SELECT name, location, COUNT(*) n FROM events
WHERE name IN ('sub_open','sub_submit','sub_ok','sub_fail') AND ua_class='human'
GROUP BY name, location ORDER BY location, name;

-- 待同步到 beehiiv 的
SELECT status, COUNT(*) FROM subscribers GROUP BY status;
```

**隐私（已同步改 /privacy，非可选）**：这是全站**唯一**的个人数据。
原文写着"不存任何标识符"，现在存邮箱——不改就是撒谎。已新增小节说明存了什么、为什么存
（`topic` 是为了兑现"这条翻转时通知你"）、以及如何删除。
