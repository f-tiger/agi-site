# 工具方向复盘(2026-09-24,owner:「工具方向复盘,并拓展」)

八天前(09-16/17)舰队把「工具」这件事做了三轮:付费能力框架、SR 机器面(8 个工具 + 注册表)、
垂直闭环(跨境进口合规)。同期其余会话把舰队从 14 站扩到 **18 站**,一周 **345 个提交**,
新增 `venture-lab` / `web3-studio` / `localebatch` / `agent-delivery-lab` —— 其中三个直接就是
「工具 + 付费实验」。所以这份复盘只做一件事:**把仪器读出来,看这些东西有没有被用。**
全部数字为 **2026-09-24 D1 现查**,SQL 与口径写在文末。

---

## 一、人类面:一周建了十几个工具,使用量从 61 → 69

| 站 | 读者主动发起的工具使用(28 天) | 09-16 读数 |
|---|---|---|
| getecoback | `btu_calc` 34 + `standort_check` 3 + `panel_fit` 1 = **38** | 23 |
| agiscorecard | `calc_use` **22** | 21 |
| baipiaoji | `calc` **9** | 4 |
| buysomething(SR) | `calc_use` **0** | 13 |
| thedollscout | **0** | 0 |
| 六个新站(after35/fanzha/codeword/firstjob/learn/powerbill) | **0** | 0 |
| **合计** | **69 / 28 天** | 61 |

**三条必须说清楚的**:
1. **六个新站的 0 现在是「测出来的 0」,不是「测不到」**。09-16 补的信标真值测试每天在跑
   (部署日志里 `beacon /e → D1 → /api/selftest (n=4)`),管子活着;九天里这六个站
   **一次客户端事件都没有**(工具、分享、FAQ 展开全都没有)。这正是当初装那条自检的理由。
2. **SR 从 13 掉到 0**:同期它新增了两页(`/mcp`、`/import-rule-changes`)和两个工具,
   人类工具使用反而归零。**新增页面没有带来使用,老工具的使用也没留住。**
3. 唯一在涨的是 eco(23→38),而 eco 这周做的不是新工具,是**把已有工具接进内容与货架**。

`fleet-tool-use-1014`(10-14 到期,阈值 ≥120)按当前速度会判负。**这是预登记时就接受的结果之一,
到期照原文结算,不提前改线。**

## 二、机器面:80 次调用里 58 次是我们自己,第三方 22 次全部空参数

SR 的 MCP 上线八天(09-17→09-24),`mcp_call` **80 次**:

| 调用方 | 次数 / 天数 | 带参数 |
|---|---|---|
| `buysomething-deploy-selfcheck-bot` = 我们的部署自检 | **45 / 4** | 45 |
| `curl/8.5.0` = 沙箱里我自己手测 | 13 / 4 | 12 |
| `rokmcp-collector` | 7 / 7 | **0** |
| `SaSame-MCP-Audit` | 7 / 7 | **0** |
| 其余(TrimtabVerifier、MJ12bot、几个浏览器 UA) | 8 | 0 |

**第三方带参数的调用:0 次。** 页面侧同窗:`/mcp` 真人 4 pv、`/import-rule-changes` 真人 2 pv,
**引荐来源全为空**(没有任何 AI 或搜索把人送过来)。

同一天把另外两个机器面也读了一遍:
- **eco `/mcp`**:366 次 / 29 天(**worker 已经自己排除了 CI**)。但按调用方拆开:`node` **180 次 / 20 天
  却只有 9 种不同参数组合**、无 UA 的调用方 100 次 / 9 天 11 种、rokmcp 54 次**只有 1 种**、SaSame 32 次**1 种**。
  **参数几乎不变 = 重放,不是使用。**
- **bpj `/api/mcp*`**:588 次里 **514 次是 `curl/8.5.0`(自检)**;第三方约 70 次,全部是自报家门的
  采集器/审计器(SaSame 23、rokmcp 19、mcp-protections-research 9、BrickBlueBot 6、`mcp/1.0.0` 3、
  maghs 3、Vouch-Census 4、agentdeals 2)。

**三个站、三套代码、同一个结论:机器面是「可被发现」的(注册表 + 采集器天天来),但还没有「被使用」
(没有任何调用方带着自己的参数反复来)。**

## 三、这轮复盘改掉的两件事(都是仪器,不是内容)

### 1. 判定线太松,今天就会误判成 win

`fleet-machine-demand-1014` 原来的 win 条件是「≥1 个调用方 28 天内 ≥10 次**带参数**调用、跨 ≥5 天」。
拿今天的读数一试:**eco 的 `node` 调用方 180 次 / 20 天全部带参数 —— 按旧口径它已经赢了**,
而它只用 9 种参数组合,是个定时重放器。**口径在任何人达标之前收紧**(这是唯一诚实的时机):

> **需求调用方 = ≥10 次带参数调用 + 跨 ≥5 个不同日期 + 参数多样性 ≥ 调用次数的 1/4。**

按新口径,今天全舰队 **0 个需求调用方**。这条经验与 09-16 那条是同一句话的第二次应验:
**写完判定线,先拿当天读数试一遍;能被现状满足的线不是赌注。**

### 2. 读数被我们自己污染,而且三个站各污染各的

- SR 的 `mcp_call` 里 45/80 是部署自检 → **已改为不落库**(工具照答,自检照红,只是不再计入分子)。
- 三个站此前**各自**发现过「采集器被当成第三方客户端」(eco 的 worker 注释里写着「同样的错误犯过两次」),
  但**没有任何东西把三份读数放在一起**,每次都要重新手算。

**新建 `tools/fleet/mcp_usage.py`(挂 heartbeat,零 cron 零 token)**:用同一套词汇读各站公开聚合端点,
写 `data/fleet-mcp-usage.json`:

| 分档 | 含义 | 算需求吗 |
|---|---|---|
| `ci` | 我们自己的部署/冒烟机器人 | 永不 |
| `operator` | 裸 curl/wget/node/无 UA | 永不(可能就是我们在手戳) |
| `indexer` | 自报家门的采集器/审计器/普查器 | 否(那是发现,不是使用) |
| `other` | 其余 | **唯一可能是需求的一档** |

**它刻意不会给好看的数字**:某站答不上来的字段(bpj 没有聚合端点、eco 的端点没有调用方分档)
**按名字列进 `missing`,而不是填 0**。首跑结果已经能看出缺口在哪:

```
fleet machine face: 366 calls/28d across 1 exposed site(s); no demand caller anywhere it can be measured
  buysomething  exposed=False  (mcp 块要等这次合并后的部署才有)
  getecoback    exposed=True  calls=366  demand=None  missing: caller classes; argument variety; demand_callers
  baipiaoji     exposed=False  missing: 没有机器面聚合端点;D1 里有行但不记参数、不排除 CI
```

SR 的部署自检同时加了一条:`/api/pulse` 里必须有机器面块且 `demand_callers` 是整数 —— **判定线的读数源
没了,部署就红**。

## 四、拓展:按读数该往哪走

**先说不做什么。** 一周新增 13 个以上工具、4 个站,而人类工具使用从 61 只动到 69、机器面需求调用方是 0。
**在这两个数字动起来之前,再加工具不是拓展,是稀释。** 09-16 立的三条子站翻转条件一条都没被满足
(零付费、零需求调用方、没有法定死线交付物)。

**真正的缺口不是「有没有工具」,是「装没装上」**:注册表(09-17 判 won)解决了被列出来,采集器天天来证明
被发现了 —— 但从「被发现」到「被调用」中间有一步**没人做过:把服务器加进某个人的客户端**。
所以这轮拓展只投这一步的**仪器与门槛**,不投新工具:

1. **机器面读数统一**(本轮已建,见 §三)—— 以后任何「机器面有人用」的说法都有同一个可核对的来源。
2. **剩下两处的缺口已写进数据文件**:bpj 需要一个聚合端点;eco 的端点需要调用方分档。
   **它们由各自站点的会话去补**,本轮不越界改 eco 那个 1900 行的 worker(它有自己的闸门与节奏)。
3. **安装这一步的读数**:eco 早就定义了 `mcp_install_click` 事件却**从未触发过一次**(28 天 0 行)——
   要么页面上没有可点的安装指令,要么没人看到。这是下一个该被填的洞,而且是**一行文案 + 一个事件**,
   不是一个新工具。留给下一轮,判定线见 §五。

## 五、判定线(本轮动作)

- **`fleet-machine-demand-1014`**:threshold 收紧为「≥10 次带参数 + ≥5 天 + 参数多样性 ≥ 1/4」,
  并写入 09-24 读数(旧口径今天会误判 win 的证据)。
- **`sr-mcp-calls-1014` / `sr-vertical-1014` / `fleet-tool-use-1014`**:各写入 09-24 中期读数,
  **不提前结算**(10-14 到期按原文办)。
- **新增 `fleet-mcp-instrument-1022`**:到期读 `data/fleet-mcp-usage.json` —— 三个机器面站里
  **≥2 个 `exposed=true` 且 `demand_callers` 是整数**(即 bpj 的聚合端点与 eco 的分档至少补上一个),
  否则「机器面」这条线从此只按 SR 一个站读,不再声称是舰队级读数。

## 六、复算 SQL(任何后续会话照抄)

```sql
-- SR 机器面(sourceradar-events)
SELECT substr(ref,1,52) ua, COUNT(*) n, COUNT(DISTINCT day) d,
       SUM(CASE WHEN label LIKE '%:∅' THEN 0 ELSE 1 END) args, COUNT(DISTINCT label) shapes
FROM ev WHERE name='mcp_call' GROUP BY 1 ORDER BY n DESC;
-- eco 机器面(ecoback-events;UA 与参数在 meta 里)
SELECT substr(json_extract(meta,'$.ua'),1,44) ua, COUNT(*) n, COUNT(DISTINCT day) d,
       COUNT(DISTINCT json_extract(meta,'$.args')) distinct_args
FROM ev WHERE name='mcp_call' AND day >= date('now','-28 days') GROUP BY 1 ORDER BY n DESC;
-- bpj 机器面(baipiaoji-hits;无参数记录)
SELECT substr(ref,1,46) ua, COUNT(*) n, COUNT(DISTINCT d) days
FROM hits WHERE d >= date('now','-28 days') AND ev='api' AND path LIKE '/api/mcp%' GROUP BY 1 ORDER BY n DESC;
-- 人类面工具使用:见 docs/tool-monetization-2026-09-16.md §一 的六条 SQL,口径未变
```
