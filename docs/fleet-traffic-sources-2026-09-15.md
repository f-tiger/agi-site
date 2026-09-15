# 舰队相互学习 · 每个站的读者从哪来(2026-09-15)

owner:「整个舰队相互学习，流量增长」。

## 一、先说结论:舰队缺的不是机制,是眼睛

本轮先做了一次全舰队实测,想找"某个站有、别的站没有"的增长机制。**几乎没找到**——
这一条要如实写下来,免得后续会话再花一遍时间:

| 检查项 | 实测结果(2026-09-15) |
|---|---|
| sitemap 里的 URL 是否真的 200 | 14 站抽样 155 条,**非 200 = 0** |
| 重复标题 | **0 组** |
| meta description 缺失 | **0 条** |
| `<lastmod>` 齐全 | 14 站 100%(2 122 条 loc 全带) |
| IndexNow | **全覆盖**——主域 + 9 个子域走 `tools/indexnow-subdomains.mjs`,gamesledger 用自己的 key 单独 ping,bpj/tds 各有自己的推送 |
| llms.txt | **14 站全有**(1.9–57 KB) |
| ld+json | 抽查 5 站全有 |

**8 个 AI 引荐为 0 的站,不是缺件,是只有 7–13 页且刚上线。** 没有可移植的机制缺口,
所以本轮不做"把 X 抄给 Y"的假动作。

真正的缺口只有一个,而且是致命的那种:

> **14 个站每一次 page_view 都存了 `ref`,但读侧只有 `ai_referrals.py`,它只数 AI 主机。
> 除 eco 外,没有任何一个站知道自己的读者从哪来。**

## 二、为什么这不是"再加一个仪表盘"

09-15 手查两个站,得到两个**相反**的答案:

| 站 | 28 天搜索引荐 | Google 占比 |
|---|---|---|
| **getecoback** | 全部来自 Bing 家族(DDG 112 + Bing 71 + Yahoo 18 + Ecosia 2) | **0** |
| **baipiaoji** | 254 / 305 有来源真人 pv | **157(51%,第一大来源)** |

根 CLAUDE.md 09-15 已经写下推论:「任何站在按 GSC/Google 优化之前,先查自己这 28 天
有没有 Google 引荐」。**这条推论是对的,但在此之前没有任何一个站能自动回答它。**
bpj 能被手查到,只因为它的 `/api/reach` 碰巧返回来源域名榜;其余 13 个站是瞎的。

互相学习的前提是各站先看得见自己。移植一个"在 eco 有效"的做法到 bpj,如果两站渠道相反,
就是把 eco 的运气当成舰队的规律。

## 三、做了什么

1. **`tools/fleet/ref_sources.txt` = 引荐来源分类表,唯一权威。** 五个桶:
   `ai` / `search` / `fleet`(兄弟站)/ `social` / 其余落 `other`;空 referrer = `direct`;
   本域 = `self`(与 fleet 严格分开——不分开的话"兄弟站互链送来多少人"这个问题永远问不出来)。
2. **13 份 `/api/pulse` 多返回三个键**:`by_source`(七个桶的计数)、`by_search`(搜索引擎域名榜)、
   `by_fleet`(哪个兄弟站送来的)。**旧键一个没动**,`ai_referrals.py` 完全不受影响。
   同一个 human 谓词再 group 一次 `ref`,所以 `sum(by_source)` 应当等于 `human_pv`,
   差额记为 `unattributed` 并打出来。
3. **`tools/fleet/check_ref_sources.py`**:13 份字面量必须与权威文件逐字相同,
   并且把每个 worker 里**真正那段代码**抠出来交给 node 跑两个方向的用例。
   `--sync` 负责改完权威文件后回写,别手改 worker。
4. **`tools/fleet/traffic_sources.py`**:端点优先(与 `ai_referrals.py` 共用同一张
   ENDPOINTS 表,不另抄),bpj 走 `/api/reach` 由本脚本分桶;写 `data/fleet-traffic-sources.json`;
   keep-last-good,连续 >3 天读不到才红。挂 `fleet-heartbeat.yml`,**零新 cron**。
5. **`demand-digest.md` 新增「渠道构成」节** —— 每次会话开场那一页现在带这一行。
6. **13 条部署自检各加一条 `by_source` 硬断言**(buysomething/gamesledger 另断言
   `sum(by_source) == human_pv`):worker 少带这次改动就红。

## 四、两个被测试抓出来的真缺陷(都在上线前修掉了)

- **裸 `includes` 会把 `netflix.com` 判成 `x.com`(social)。** 改成标签对齐匹配。
- **只做标签对齐,又会把 `agiscorecard.com.spam.example` 判成 fleet** —— 这正是引荐垃圾
  的常见形状。加了"尾部只许 TLD 段"。
  五个小站的 worker 单测里各有一条断言专门钉住这两个方向。
- 顺带修了模板复制留下的错主机名:codeword / firstjob / powerbill 三份单测都在对
  `fanzha.agiscorecard.com` 发请求,`self` 桶的断言因此原本测不出东西。

## 五、首读(2026-09-15,本次改动尚未部署)

```
site        human search   ai fleet social  self direct other   ??
baipiaoji     305    254   34     0     16     0      0     1    0
```
其余 13 站显示 `no by_source yet` —— **这是正确的诚实状态**,不是零。合并部署后的
下一次 heartbeat(08:00 UTC)会给出第一份 14 站读数。

## 六、预登记判定线(已进 `data/fleet-bets.json`)

- **`fleet-source-mix-1013`**:10-13 前 ≥13 站有 `by_source` 读数且舰队 `unattributed`
  ≤ 真人 pv 的 5% → 渠道构成进常规台账;否则记反面发现,读侧退回只看 AI 引荐。
- **`fleet-google-channel-1013`**:10-13 前,除 bpj 外 ≥2 个站的 `google.*` ≥10/28d
  → Google 通道不是孤例;否则 **Google = bpj 专属,其余站一律按 Bing 家族与 AI 引荐
  口径优化,永不再为 Google 改标题**。

## 七、本轮明确**不做**的(别再提)

- 不新建站、不开子域(三条铁律无候选全中)。
- 不做"把 IndexNow 抄给别的站"——已全覆盖,抄了就是重复功。
- 不为了"互相学习"加跨站链接:`by_fleet` 会告诉我们现有互链到底送来几个人,
  **先有读数再决定加不加**。舰队内互链现在只在 index/cn 等少数页上,`source.` 一条入链都没有——
  这件事等 10-13 的 `by_fleet` 读数,不靠猜。
- 不把 `unattributed` 静默摊进 `other`:口径对不上就要看得见。
