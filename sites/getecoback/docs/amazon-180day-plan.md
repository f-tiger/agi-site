# getecoback.com · 亚马逊联盟 180 天 3 单作战计划

> 制定日期：2026-07-11。考核截止：以 Associates 账号申请日起算 180 天（请在下方登记）。
> 依据：Amazon Associates 新账号须在 180 天内产生 ≥3 笔合格销售，否则关户；
> 2026-04-14 政策更新后考核口径收紧。账号申请日：____________（用户填写）

## 一、目标拆解（转化数学）

以内容联盟站常见区间估算（非承诺值，仅用于倒推流量目标）：

- 亚马逊端转化率（点击→下单）：约 3–10%，取保守 4%
- 3 单 ≈ 需要 **75 次左右的联盟外链点击**
- 指南页 → 亚马逊 CTA 点击率：优化后约 15–30%，取 20%
- 即需要约 **375 次"高购买意图"指南页会话**，摊到剩余考核期 ≈ 每天 2–4 次真实搜索会话

当前基线（GA4/GSC，2026-06-11→07-10）：自然搜索点击 1 次/月、affiliate_click 1 次/月。
缺口约两个数量级，但两个页面已在 SERP 第 9–11 位，7 月热浪季是全年需求顶峰——
把这两页推进前 5，每天 2–4 次会话即可达成。

## 二、分阶段计划

### 第 1–2 周（7 月中，热浪季顶峰——权重最高）
1. 【站内·P0】URL 规范化 301 + canonical ✅ **2026-07-11 已上线并验证**（src/worker.js，
   CI 断言 www/http/无后缀 全部 301 到裸域 .html；heatwave 页权重合并后预期进前 8）
2. 【站内·P0】合规整改：每个含联盟链接页面加披露声明（见第三节红线）
3. 【站内·P0】affiliate_click 设为 GA4 关键事件；联盟链接统一 `?tag=` 直链
4. 【内容·P1】重写 /en/guide/portable-ac-tilt-and-turn-windows 与德语姊妹页
   （三方案对比表 + 步骤图 + FAQ schema；SERP 竞品全是弱内容，唯一近期可赢的词）
5. 【分发·P1】英语页流量非德国区无法在 amazon.de 成交——接 OneLink 或按语言指向
   对应商城；否则英语点击全部作废

### 第 3–6 周（7 月底–8 月中，热浪季尾巴）
6. 每周用 GSC 检查两主力页排名；排名进前 8 后在页首加"快速推荐"商品卡
7. 补 1–2 篇高购买意图页：`fensterabdichtung kippfenster kaufen`（已排 24 位）、
   `mobile klimaanlage leise schlafzimmer`（bedroom 页德语版）
8. Reddit r/germany、r/askagermany 等每年热浪季都有"租房怎么装空调"提问——
   以真实回答带链接（带 UTM，不带联盟链接，只引到站内）

### 第 7 周起（9 月后，季节切换）
9. 热浪词流量归零前，转常青词：BTU 计算器（做成交互工具页）、Stromkosten 计算、
   除湿机（秋冬词，同类目可复用联盟账号）
10. 每月一次 revenue round（已配置每周自动检查 Routine，见第四节）

## 三、亚马逊合规红线（每条都有关户先例）

- [ ] **披露声明**：每个含联盟链接的页面、在链接附近可见处，写明
      EN: "As an Amazon Associate, I earn from qualifying purchases."
      DE: "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen."
      只放页脚或单独页面不合规（FTC 单次违规罚款可达 $53,088）
- [ ] **不准隐藏/跳转联盟链接**：不用短链、不用重定向插件、不套自己的中转 URL；
      链接必须肉眼可见指向 amazon.de/amazon.com
- [ ] **不准写死价格**：不写 "€399"，写 "aktuellen Preis auf Amazon prüfen"（查看当前价格）；
      价格只能经 PA-API 实时取
- [ ] **不准自购刷单**：自己/亲友通过链接下单不算合格销售，且是关户理由——
      3 单必须来自真实访客
- [ ] 不在邮件、PDF、闭屏内容中使用联盟链接（仅限公开网页）
- [ ] 页面不得声称"Amazon 推荐/官方合作"字样

## 三点五、阶段目标（2026-07-11 与用户确认：goal 按阶段滚动追踪）

| 阶段 | 截止 | 可验证条件 | 状态 |
|---|---|---|---|
| S1 收录与合并 | 07-18 | 3 个新页在 GSC 出现展示；旧 URL 变体展示占比开始下降 | ✅ **基本达成（07-13，提前）**：旧变体占比 67%→31%（明显下降）；40+ 页已有展示、总展示 58→411/周 |
| S2 排名与点击 | 07-31 | tilt-and-turn 或 heatwave 页进前 8；自然搜索点击 ≥10/周；affiliate_click ≥5/周 | 进行中（07-13：heatwave pos 9.93、点击 3/周、affiliate 1/周；主力页仍卡 pos 10-13，待 www→规范合并推进前 8） |
| S3 转化量 | 08-31 | affiliate_click 累计 ≥75 或首单出现 | 待启动 |
| S4 考核达成 | 申请日+180 天 | PartnerNet 合格销售 ≥3 | 待启动 |

每阶段达成 → 下一阶段成为当前 goal；某阶段超期未达 → 周检提出计划修订。

## 四、监测机制

- **每日中国时间 12:00（04:00 UTC）自动优化 Routine v2（trig_01T4qyaP7XLHpo8RWNogS5u6，2026-07-15 升级为 CTR 优先，07-17 应用户要求改为中午12点 CST）**：全自主、无需用户决策。**核心 KPI=提升真实点击**。每天诊断按优先级：①【首选】CTR 优化(高展示+pos≤15+CTR<2% 的页重写 title/meta 为高点击版) ②抢 Featured Snippet/建 Web Story 进 Discover ③已展示页深化(FAQ/AEO/内链) ④加速收录 ⑤无信号才新写。→ 构建复校 → rebase-push main → 记录 → 中文简报。只在里程碑提示用户。
- 每周一 09:23 UTC 自动 Routine（trig_01GBrxMTEQ6F84YNEbPoGo6t）：追加周指标行、检查 URL 合并、提计划修订
- 每次复盘更新下表：

| 周 | 搜索点击/周 | affiliate_click/周 | 主力页排名 (tilt-and-turn / heatwave) | 出单数 |
|---|---|---|---|---|
| 基线 (07-11) | ~0.25 | ~0.25 | 11 / 9.25 | 0 |
| 07-13 | **3** | 1 | 13.35 / 9.93 | 0（待后台同步） |

**07-13 周检分析（数据：GA4 prop 544688614 + GSC sc-domain，近 7 天）：**
- **强增长信号**：搜索点击 0.25→3/周（↑12×，klimaanlage-reinigen 2 + tilt-turn 1）；总展示 ~58→411/周（↑7×）；affiliate_click 0.25→1/周。热浪季 + 内容放量 + FAQ 优化在起效。
- **URL 规范化生效**：非规范变体（www/http/无.html）展示占比 **67%→31%**，301 中间件在合并、Google 在重爬。→ **S1 目标"旧变体占比下降"达成**。
- **AI 层起效**：GA4 渠道出现 "AI Assistant" 1 会话（llms.txt 被 LLM 引用引流，差异化设计验证）。
- **主力页仍在页1边缘**：heatwave pos 9.93（102 展示、0 点击=卡第10位点击盲区）；tilt-and-turn pos 13.35 且 62 展示仍在 **www 变体**上（规范 .html 版未单独排名）→ 排名被 www/规范分裂拖累。
- **数据质量提醒**：GA4 会话 Direct 80 疑似 bot/监控流量（Organic 仅 3），真实自然流量看 GSC 点击（3）更准。
- **本周首要动作（用户侧，最高杠杆）**：在 GSC 对 **规范 .html URL** 请求编入索引，加速 www→规范合并——把散在 www 变体（62 展示/pos13）的权重并回规范 URL，预期把 tilt-and-turn 推回 pos<10：
  `https://getecoback.com/en/guide/portable-ac-tilt-and-turn-windows.html`
  `https://getecoback.com/en/guide/best-portable-air-conditioner-europe-heatwave.html`
- **计划修订判断**：本周为首个对照点且**全线改善**（点击↑12×、变体占比↓36pt），无需修订；继续现路线。

- 出单数以 Associates 后台为准（工具无法直连，需用户每周同步一次后台数字）

## 五、本回合已完成 / 待用户解锁

已完成：本计划；Worker 实施包（docs/getecoback-implementation-pack.md）；每周 Routine。

待用户解锁（按优先级）：
1. **把 getecoback 站点源码仓库加进会话**（说一句"add repo f-tiger/<仓库名>"即可）——
   我即可直接实施 301/canonical/披露/商品卡全部改动并部署验证。
   本回合已确认：站点是 Cloudflare Worker "ecoback"，但 MCP 代码读取通道故障，
   且环境网络策略拦截 getecoback.com 直连（可在环境网络策略里放行）。
2. 在 Associates 后台确认账号申请日，填入本文件头部，锁死真实倒计时。
3. 每周同步一次后台合格销售数。
