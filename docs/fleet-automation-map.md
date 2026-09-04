# 舰队自动化清单（唯一权威版本）

建立于 2026-09-04，owner 两条指令：
> 「把你的自动化任务重新整合优化，现在太多任务」
> 「舰队自己不能依赖你进化…一方面你有自动化任务，一方面舰队各个站点自己有
> 刷新的自动化能力，避免强依赖你」

**任何会话在新增/修改定时任务前必须先读本文件**，并遵守下面第四节的三条纪律。

---

## 一、两层模型（owner 2026-08-22 立，2026-09-04 重申）

| | 第①层 站点自治 | 第②层 舰队进化 |
|---|---|---|
| 载体 | 本仓 `.github/workflows/*`（零 AI） | Claude Routine（会话） |
| 能力 | 取数、构建、部署、探活、告警 | 判断、选题、写内容、跨站移植 |
| 失效后果 | 站点数据陈旧 | **站点停止进化，但不下线** |
| 依赖我吗 | **否** | 是 |

**铁律：能用第①层做的，绝不放进第②层。** 第②层只负责「需要判断力的那一件事」。

### 为什么这条铁律是有事故背书的
2026-09-03 起，两个自绑定 Routine 被平台挂起
（`suspension_reason = plan_no_longer_eligible`，非 owner 暂停、非我能修复），
agiscorecard 与 sourceradar 的每日循环整整两天没有跑。同期
thedollscout 冻结约 **86 小时**——它的部署是纯 push 触发，没有会话推它，
就没有任何东西推它。这就是「强依赖我」的实际代价。

---

## 二、第①层清单（`.github/workflows/`，公开仓 → Actions 免费）

### 部署（push 到 main 即发布，各自 path 过滤）
| workflow | 站点 | 定时兜底 |
|---|---|---|
| `deploy-agiscorecard.yml` | agiscorecard.com | 无（靠 heartbeat） |
| `deploy-baipiaoji.yml` | baipiaoji.com | `30 0 * * *` |
| `deploy-getecoback.yml` | getecoback.com | `17 3 * * *` |
| `deploy-buysomething.yml` | source.agiscorecard.com | `20 5 * * *` |
| `deploy-gamesledger.yml` | games.agiscorecard.com | `10 6 * * *` |
| `deploy-thedollscout.yml` | thedollscout.com | 无（靠 heartbeat） |
| `deploy-goldrush.yml` | goldrush.agiscorecard.com | 无（刻意，靠 heartbeat） |
| `deploy-gridlings.yml` | play.agiscorecard.com | 无（450 天谜题已预烘焙） |

### 数据与维护（外部副作用一律只挂 schedule，绝不挂 push）
| workflow | cron (UTC) | 作用 |
|---|---|---|
| **`fleet-heartbeat.yml`** | `0 8 * * *` | **新增 2026-09-04**：八站探活 + 超 7 天未部署自动重发 + 快照写回 `data/fleet-health.json` + 站点非 200 直接把 run 打红（GitHub 邮件是唯一不经过任何 AI 会话的告警通道） |
| `fleet-trends.yml` | `45 3 * * *` | 全舰队趋势快照 |
| `eco-trends.yml` | `30 4 * * *` | 德国热搜触发器 |
| `eco-health.yml` | `0 5 * * *` | eco 站健康 |
| `eco-heat-alert.yml` | `0 6 * * *` | eco 热度告警 |
| `eco-mcp-smoke.yml` | `17 6 * * *` | eco MCP 冒烟 |
| `tds-traffic.yml` | `0 6 * * *` | tds D1 14 天窗导出 |
| `agi-odds.yml` | `25 3 * * 1` | 赔率快照（周一，早于日报） |
| `agi-indexnow.yml` | `17 3 * * 1` | sitemap 提交（周一） |
| `tds-indexnow.yml` | `20 6 * * 3` | tds IndexNow（周三） |

**成本**：heartbeat ~1 分/次 × 30 = ~30 分/月；agi-site 为公开仓，Actions 免费，
不占账号 2000 分钟额度（该额度只被私有仓消耗）。

---

## 三、第②层清单（Routine），2026-09-04 整合后

| Routine | cron (UTC) | 模式 | 本次动作 |
|---|---|---|---|
| agiscorecard daily（**已并入 sourceradar**） | `0 4 * * *` | 自绑定 | **合并**：sourceradar 的每日职责并入本条 |
| ~~sourceradar 每日进化~~ | `40 5 * * *` | 自绑定 | **停用（保留不删）**，数据门不支持日频：7 天真人 pv = **5** |
| getecoback daily v5 | `0 5 * * *` | 新会话 | 保留日频（7 天真人 pv 130 + 联盟机制）；加「无事则三句」汇报纪律 |
| 白嫖计 daily v4 | `0 22 * * *` | 新会话 | 保留日频（7 天真人 pv 347、go 15、sub_view 66 — 全舰队最高）；同上 |
| DollScout 每 2 天 | `10 7 */2 * *` | 新会话 | 保留（7 天真人 pv 128，且已出**首个 affiliate_click**；09-06 判定线在即） |
| paid-weekly-recheck（白嫖计付费档位） | `0 1 * * 1` → **`0 1 5 * *`** | 新会话 | **周 → 月**：14 个工具定价周频过密，且日循环已覆盖「命中工具当轮复核」 |
| 舰队每周分发暂存 | `30 1 * * 1` | 新会话 | **不动**：其自身预登记规则是「连续 4 周全空勾才降频」，现仅 2 周（W34 0/6、W35 0/3），**不提前裁决** |
| sellSomething 周循环 | `30 3 * * 1` | 新会话 | 不动 |
| Weekly AI & Tech News Roundup | `0 8 * * 1` | 新会话 | 不动（owner 个人消费，非舰队） |
| 10 万实验月度复核 | `0 6 5 * *` | 自绑定 | 不动 |

### owner 每周收到的报告数
- 整合前：7(agi) + 7(sourceradar) + 7(eco) + 7(bpj) + 3.5(tds) + 4(周一) + 0.25(月) ≈ **35.75 / 周**
- 整合后：7(agi 含 sourceradar) + 7(eco) + 7(bpj) + 3.5(tds) + 3(周一) + 0.5(月) ≈ **28 / 周**（**−22%**）

### 为什么没有砍得更狠——数据门不允许
7 天真人 pv（JS 口径，剔 `/__ci%`，2026-09-04 实测）：
bpj **347** · agi ~230 · eco **130** · tds **128** · **sourceradar 5**。
只有 sourceradar 的日频缺乏数据支撑。把 bpj/eco/tds 一起降频会是**替 owner
缩小工作范围**，不是整合。真正过量的不是「工作频率」而是「汇报密度」，
所以本轮改的是汇报纪律，不是工作频率。

---

## 四、新增自动化前必须过的三条纪律

1. **先问能不能下沉。** 取数 / 构建 / 部署 / 探活 / 告警 → 第①层。
   只有「需要判断」的才配得上一个 Routine。
2. **先算账再加 cron**（每次分钟 × 每月次数），写进提交说明。外部副作用
   （IndexNow / Wayback / 第三方 API）只挂 schedule，**绝不挂 push**。
3. **合并优先于删除。** 用 `update_trigger` 改 prompt + `enabled=false` 停用，
   **永不 `delete_trigger`**——历史与预登记判定线要留痕。

## 五、故障处置

- **Routine 被平台挂起**（`suspension_reason` 非空）：这是账号/套餐层的状态，
  会话侧无法修复。手动补跑用 `fire_trigger`（实测可用），并显著上报 owner。
- **计划路径死了但站点还活着**：正常，这正是第①层的设计目的。
  `data/fleet-health.json` 是不依赖任何 MCP 的状态来源。
- **站点非 200**：`fleet-heartbeat` 会把 run 打红并触发 GitHub 邮件。
