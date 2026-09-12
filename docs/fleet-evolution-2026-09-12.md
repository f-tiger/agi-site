# 舰队整体进化(2026-09-12,owner:「舰队整体进化一次」)

**方法**:先读三天内其他会话落下的东西(autopilot、heartbeat 双读、探针签名、bpj 自助广告位、
CG 第三拒、tds 三条判定线结算),再拉钱线仪表盘,再查每一条红过的 run,**只修查得出根因的**,
跨站移植只移植已在一站验证过的模式。本轮不开新线、不加 cron、不建新页。

## 一、钱线仪表盘(D1 现查 2026-09-12,28 天窗,真人口径)

| 站 | 读数 | 备注 |
|---|---|---|
| eco | `affiliate_click` **83**;`us-market` **1**、amazon.com **1**;subs 1 | 09-25 判定线 us-market ≥5,当前 1 |
| agi | JS pv 1 495;`invest_tool_click` 17;audits **0**;subs 2(本次过滤口径) | 09-11 那天 231 里 182 是探针,已扣 |
| bpj | JS pv 1 861;`go` 59(**不是营收**,09-08 口径修正);subs 真实 3;**自助广告位 ads 0 / paid 0 / orders 0** | 广告位 09-11 上线,首个买家未出现 |
| gridlings | play 355 / solve 135;itch 44;**Playgama 15**;subs 0 | Playgama 首次非零;CG 09-09 永久关闭 |
| tds(新站 08-30 起) | pv 204;`affiliate_click` **1** | 09-11 已结算三条到期判定线(见站内记录) |
| SR | pv **58**;pick_open **0** / out_click **0** / calc_use **0**;subs 0 | 28 天零动作,09-28 判定线大概率判负 |
| 营收 | eco 联盟 €10,26/30d(至 08-30 截图,**未到账**,等 owner 补税务红条) | 舰队非 Amazon 收入仍为 0 |

**外部悬置**(不编时间):Metaculus 算力额度(09-07 提交,bot 每 2 小时 skipped 是刻意关的);
CrazyGames 已关;Playgama 认证中。

## 二、三天内红过的 run:一条,根因查出且是**潜伏的**

`agiscorecard paper-trading ledger` 2026-09-11 00:29 红:`AssertionError: agi_basket: levered target`。
09-12 两次又绿了,`paper_ledger.py` 期间没改过——**所以不是修好了,是靠运气过的**。

根因(`paper_ledger.py` target 段):`cur_w` 先归一化到 ≤1.0,**再**逐个 `round(v, 4)`。十个权重
各自最多向上舍入 0.00005,合计 +0.0005,超过自检与执行器共同的 1.0001 容差。`tracker_mix` 的
再平衡分支(10 个 `round(w/10,4)` + `round(1−w,4)`)是同一类。

**修法**:新增 `unlever(weights)` —— 舍入后若和 >1.0,把超出部分从最大权重上削掉,保持 4 位小数、
和 ≤1.0 —— 在 `target = ...` 这**一个**出口统一套用。四个单测(10×0.10005 → 1.0;60/40 不动;
空;11 项 → ≤1)全过。**执行器侧的「权重和 >1 拒绝」保留不动**:生产者修的是浮点伪影,
执行器守的是「不信任台账」,两道线各管各的。

## 三、跨站缺陷:六个 worker 六份 bot 正则

09-12 agi 的 `ua_audit` 抓到 `panscient.com` 一天 288 次被算成 human,当天加进了**它自己的**正则。
本轮查下来:

| worker | token 数(修前) |
|---|---|
| agiscorecard analytics-worker | 55 |
| gridlings / goldrush | 21 |
| getecoback | 17 |
| gamesledger | 12 |
| buysomething | **9** |

**同一只爬虫在一站是 bot、在另外五站是「真人」。** 台账口径要求各站人类 pv 可比;分类器不一致
= 台账不可比,而且是**系统性偏向多报**(小站正则薄 → 更多爬虫算人)。

**修法(已在一站验证的模式,移植到六站)**:
- `tools/fleet/bot_ua.txt` = 唯一权威(62 个 token = 六份并集,只收自报家门的爬虫/扫描器;
  **主流浏览器 UA 永远不进**,那个方向的错会静默抹掉真读者)。
- 六个 worker 的字面量替换为同一串;`tools/fleet/check_bot_ua.py` 断言逐字相同,并用 23 条爬虫 UA +
  10 条真实浏览器 UA **测两个方向**;挂进 `fleet-heartbeat.yml`,漂移即红。
- **不动 bpj / tds**:它们的 `hits` 表没有 `ua_class` 列,埋点本身是 JS beacon(不执行 JS 的爬虫
  进不来),残余风险只有会跑 JS 的探针 —— 那正是 09-12 那条**行为 SQL**该管的,不是 UA 正则该管的。
- **口径说明**:六站从本次部署起「human」变严,新旧窗口对比时人类 pv 会**下降**,这是修正不是流失。
  各站正在跑的判定线不改阈值(阈值本来就是按真人定的)。

**同时暴露的下一层缺口(本轮只记不做,成本先算)**:只有 agi 有 `ua_audit`(UA 家族留痕)。
09-12 那次探针只在 agi 能被诊断,在其他七站会以「+23% 增长」的样子写进日报。补法是给其余 worker
加一列 UA 家族(不存完整 UA、不存 PII),涉及 6 个 worker + 6 个 D1 schema 迁移,不是顺手的活,
等 owner 点头。

## 四、判定线复核

- **CG 09-09 第三拒** → 预登记线触发,永久关闭。另一会话已结算;本轮把 `docs/games-track-directions`
  第二次更正(方向三改为 Playgama 认证 + 自有域留存)。
- **itch 09-24**(≥150 play / ≥25 solve):今日 **44 / 13**,连续多日零新增,**大概率判负**,到日照记。
- **SR 09-28**:28 天零动作,大概率判负。
- **eco 09-25 us-market ≥5**:当前 1。
- **bpj 09-18 / 09-26 / 09-27 / 09-28**、**buysomething 09-14 / 09-28**:未到,只记。
- **市场行情板**首次 runner 取数 **09-14 03:25 UTC**;**Cloudflare Pay-Per-Use 09-15** 生效后看
  heartbeat 是否出现 GPTBot/ClaudeBot/PerplexityBot 403(保险丝:引用爬虫不设价不屏蔽)。

## 五、本轮没做、且不该做的

- 不开任何新钱线(09-08 文档已说明:六件在等外部/owner,没有一件卡在方向)。
- 不重建 Routine、不 `delete_trigger`。
- 不给 bpj/tds 改 schema。
- 不动任何 5 轮内改过的页面(防翻炒)。
