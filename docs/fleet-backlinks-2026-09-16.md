# 外链:技能调研 + 第一份读数(2026-09-16)

owner:「整个站点可以安装技能,完善自动化外链方案」+「调研下哪些外链技能,目标通过外链增强流量」。

## 一、技能已装到仓库根目录,14 个站通用

此前技能是**按站装的**:agi 44、bpj 87、eco 29、tds 80,另外 10 个站一个都没有,根目录也没有。
八个同名技能有分歧,查下来原因很简单——**eco 是旧的精简版(只有 SKILL.md,缺 evals/references),
另外三站逐字节相同**,没有判断题。已合并到 `.claude/skills/`:**96 个不重复技能**,
每个取最完整的一份;逐站核对**无一丢失、无一降级**(并集验证脚本跑过)。四份站内副本已删。
线上实测四站 `.claude/skills/...` 全部 404,**技能从未被当静态资源公开服务**,不是泄漏项。

## 二、和外链直接相关的技能(共 13 个),以及对本舰队的裁定

| 技能 | 它做什么 | 对本舰队 |
|---|---|---|
| **linkbuilding** | 先判站点的**权威阶段**,再从 9 个战术手册里挑阶段合适的 | ✅ 核心。裁定见下 |
| **directory-submissions** | 目录/注册表投放,拿 dofollow + 被 AI 引擎抓 | ✅ 可用(Foundation 阶段正解) |
| **citation-growth**(舰队自研) | AI 引用增长,一手数据蒸馏 | ✅ 已在用,是本舰队最强的一条 |
| **ai-seo** / **seo** / **seo-audit** / **schema** / **seo-hreflang** | 技术面与 GEO | ✅ 已基本做完(09-15 实测干净) |
| **free-tools** | 「工程即营销」,做能被链的免费工具 | ✅ 已在做(agi 的 embed/badge) |
| **programmatic-seo** / **competitors** | 规模化落地页 / 对比页 | ⚠️ bpj 已是 1558 页,不缺这个 |
| **launch** | Product Hunt 等发布时刻 | ⚠️ 一次性,需 owner 操作 |
| **hacker-news-strategy** / **reddit-engagement** / **community-marketing** | 社区分发 | ⛔ **机器永不发帖**(舰队铁律)。只能进 `docs/distribution-staging/` 由 owner 手发,且过反 AI 味 8 条 |
| **co-marketing** / **influencer-marketing** / **public-relations** / **prospecting** / **cold-email** | 伙伴/红人/公关/外联 | ⛔ 全部要 owner 的时间与身份;且 B2B 冷邮在舰队已是杀单 |

## 三、`linkbuilding` 技能的阶段判定:**全舰队 14 个站都在 Foundation 阶段**

技能的分期标准是:Foundation = 上线 <1 年、内容薄、无品牌信号、DR 0–15。
本舰队最老的站(agi)最早一批页面 lastmod 是 **2026-06-30**,不到 3 个月;10 个站上线不到两周。
**没有一个站够得上 Growth 阶段。** 这直接判掉了手册里 9 个战术中的 6 个:

- **Growth 阶段的 4 个**(competitor backlink gap / guest posting / resource pages / skyscraper)——
  其中 backlink gap 还**需要付费工具**(Ahrefs/Moz),舰队没有;guest posting 要 owner 写稿外联。
- **Authority 阶段的**(podcast guesting / strategic partnerships)——更远。

**只剩两个是现在该做的**,也正是技能说的 Foundation 优先级:
1. **Entity stacking(实体堆叠)** —— 20+ 平台一致的品牌存在(LinkedIn / Crunchbase / GitHub /
   Wikidata / Product Hunt…),外加站点 `Organization` schema 的 **`sameAs`** 把它们串起来。
   技能原话:Wikidata 是「秘密武器」,Google 的 Knowledge Panel 直接从它取数。
2. **Citations & directories** —— 目录与注册表。

**本舰队现状(实测)**:`sameAs` 只有 **bpj 一个站有**,agi / eco / tds / gridlings / gamesledger 都没有。
但**不能现在就补**——`sameAs` 里每一条都必须是真实存在的档案页,舰队目前除 GitHub 组织与
MCP registry 外没有已核实的外部档案,**编一条进 schema 就是编造**。所以这一条的下一步是
owner 建档案(或确认已有的),会话再把已核实的串进 `sameAs`。

## 四、第一份外链读数:基本是零

新建 `tools/fleet/backlinks.py`(搭 heartbeat 每周一,**零新 cron**,只读 GET,零外部副作用)。

**A. 挣到的外链(第一方,不花钱不靠第三方工具)** —— 各站 `/api/pulse` 新增的 `by_other`:
既不是搜索/AI/社交/兄弟站/本站的来源域,也就是**真的有别处链过来并送来了人**。
首读:**全舰队只有 bpj 有 1 个域、1 次访问,而且那 1 次是 `com.twitter.android`。**
其余 13 站要等本次部署后才有读数。

**B. 目标清单核对** —— `tools/fleet/backlink_targets.json`(6 个**已实测 raw README 可取**的目标):

| 目标 | 状态 | 实测 |
|---|---|---|
| awesomedata/awesome-public-datasets | queued | ⬜ 未收录 |
| **punkpeye/awesome-mcp-servers** | **pr_open** | ⬜ **未收录** |
| wong2/awesome-mcp-servers | queued | ⬜ 未收录 |
| Hannibal046/Awesome-LLM | queued | ⬜ 未收录 |
| steven2358/awesome-generative-ai | queued | ⬜ 未收录 |
| mahseema/awesome-ai-tools | queued | ⬜ 未收录 |

**其中第二行是要说给 owner 听的**:根 CLAUDE.md 记着「awesome-mcp-servers 四个 PR 已全部挂
has-glama+valid-name,纯等维护者合并」。今天直接取那份 1.7 MB 的 README 核对,**一条舰队域名都没有**
——也就是说那四个 PR 到今天仍未被合并,**舰队至今零条已合并的 awesome-list 外链**。
`ComposioHQ/awesome-claude-skills`(backlink-kit 里记的 67k star 目标)**raw README 今天 404**,
已移入 `unverified`,不当成现存目标。

## 五、自动化的边界(这是「自动化外链方案」里最该写死的一条)

**机器只做三件事:核对、去重、排队。** 它**永不自动提 PR、永不自动发帖、永不自动外联**。
理由不是技术做不到,是:①awesome-list 维护者对批量 PR 的容忍度是零,被判 spam 会连累整个组织;
②舰队已有「机器永不发帖」的 Reddit 先例;③提交文案必须逐条契合分区,错位提交会被拒**并烧掉
首次提交机会**(directory-submissions 技能的硬规则)。

**掉链检测**:上一份快照 present=true、这次 false → warning。外链掉了没有人会通知你。

## 六、判定线(已进 `data/fleet-bets.json`)

**`fleet-backlinks-1116`**(2026-11-16):6 个目标里 **≥2 个被收录**,或舰队 `by_other`
**≥5 个域且 ≥20 次访问** → 外链路径有效,按 Foundation 阶段继续投;
否则记反面发现「awesome-list / 目录外链对本舰队量级无效」,**停投外链**,只留 `by_other` 监测(零成本)。
基线白纸黑字:**0/6 个目标,1 个域 1 次访问。**

## 七、别再提

- 付费外链、PBN、评论区刷链、批量目录轰炸 —— 与零编造和「被判 spam 连累整组织」冲突。
- 需要付费工具的 competitor backlink gap(舰队没有 Ahrefs/Moz,且它属 Growth 阶段)。
- 机器自动提 PR / 自动发帖 / 自动外联(见 §五)。
- 在没有真实档案页之前往 `sameAs` 里写任何一条(那是编造)。

---

## 八、追查那四个 MCP PR 的结果(owner:「1. 你帮我完成」)

### 能确认的
- **四个 PR 一个都没合并。** 上游 `punkpeye/awesome-mcp-servers` 的 `main` README(1.75 MB)里
  舰队域名 **0 处**。
- **不是 PR 内容坏了。** fork 的 `add-agiscorecard-and-verified-free-tiers` 分支仍在(HTTP 200),
  第 1057 行的 `verified-ai-free-tiers` 条目完整,带 glama 徽章与 baipiaoji.com 链接。
- **另一份 MCP 列表 `wong2/awesome-mcp-servers`(99 KB,比上游小 18 倍)同样 0 处** —— 我们从没投过它。

### 本会话确认不了的(如实说,没绕过)
PR 的 open/closed/有无维护者留言**读不到**:①`api.github.com` 被出网代理挡(403)
②GitHub MCP 工具只覆盖已挂载的仓,而把 `punkpeye/awesome-mcp-servers` 挂进来的两次尝试
(`add_repo` push、以及 `ls` 那个克隆路径)都被**权限层拒绝**。我没有绕过它。
要读这些,需要 owner 在设置里放行该仓的挂载,或自己打开 PR 页面看一眼。

### 裁定:**不值得催,理由是数字**
该仓 PR 编号已到 **12 000+**,四个 PR 躺了一个多月。催一个排在万条之后的 PR 不是渠道,是彩票。
**同期另一条路已经在工作**:官方 MCP registry 里三个舰队 server 全部在架(实测)——
`io.github.f-tiger/verified-ai-free-tiers`(已到 v1.10.1)、`com.agiscorecard/agi-scorecard`、
`io.github.f-tiger/hvac-btu-heat-klimaanlage`。**注册表是活的,awesome-list 是死的。**

## 九、顺手查出并修掉的真缺陷:eco 的 MCP 身份一个实体三个名字

沿着注册表核对,发现一次**改名没改干净**(不是设计决定,`superseded/` 目录证明改名是有意的):

| 层 | 名字 |
|---|---|
| 注册表生效条目 | `io.github.f-tiger/hvac-btu-heat-klimaanlage` |
| 注册表另两条(已标 Superseded) | `getecoback-climate-weather`、`getecoback-raumklima` |
| **线上 worker 自报** | **`getecoback-raumklima`**(= 废弃名,`worker.js:1340`) |
| 发布流水线健康检查 grep 的 | `getecoback-raumklima` |

也就是说:客户端按注册表装的是 A,连上去被告知自己连的是已废弃的 B。
`linkbuilding` 技能的 entity stacking 原话是「**每个地方用完全一样的品牌名,轻微变体都会让实体识别混乱**」。

**已修**:worker 自报名改为 canonical、版本对齐 1.2.0;发布流水线的健康检查**过渡期两个名字都认**
(本次 push 同时触发 deploy 与 publish,publish 探活时线上可能还是旧 worker —— 不这样会撞竞态);
**新增防回归断言**:eco 部署自检直接比对「线上自报名 vs `mcp/server.json` 的注册表名」,不一致即红。
本地用同一段逻辑对现网验过:`want=hvac-btu-heat-klimaanlage got=getecoback-raumklima` → 正确报不一致。

## 十、注册表按品牌搜不到我们 —— 已改描述

注册表的搜索**不索引 `websiteUrl`**。实测:
- 搜 **`baipiaoji`** → 返回 3 条,**里面没有 bpj 自己的 server**(反而命中一条 eco 的)。
- 搜 `getecoback` → 只有那两条**已废弃**的,生效的那条搜不到(它名字里没有品牌)。
- 搜 `agiscorecard` → 命中,因为它的注册表名 `com.agiscorecard/agi-scorecard` **自带品牌**。

这三条放在一起就是结论:**品牌进名字或进描述才搜得到**。已把品牌写进两站 manifest 的
`description`(eco v1.2.0、bpj v1.11.0),内容全部属实(与线上 `instructions` 一致),
**不改名**——再改一次名就是第四个名字。

**顺带记一个未处理的漂移**:`sites/baipiaoji/mirror/server.json` 停在 **v1.9.0**,主份已 v1.11.0。
mirror 属另一个公开仓的内容,不在本会话范围,留给 owner 或有该仓范围的会话。
