# 舰队自动化任务深度体检(2026-08-25,owner:「优化舰队的各类型自动化任务,做一次任务深度体检」)

范围:agi-site 34 个 GitHub workflows + 10 个 CCR Routines。方法:GitHub API 拉近 50 次
定时运行结论 + Routines 的 last_run 时长逐个核对(**核心发现:看时长,不看状态——
SUCCEEDED 但只跑 15 秒 = 空转**)。

## 一、Workflow 层:全绿

近两日全部定时运行(trends/deploys/爬虫账本/健康检查/照片抓取/规格抓取)结论均
success。重型任务节奏核查:tds-fetch-specs(27 分钟 Playwright 抓取)= 每周二一次 ✓
礼貌;tds-fetch-photos 每周一 ✓;deploy-buysomething 每日 ~20 分钟(Next.js 构建,
公开仓免费,可接受)。deploy-x-poster / tds-fetch-sources / tds-grow(注:grow 实际
有 daily cron,grep 窗口问题)无异常。旧私有仓已归档,不再产生运行。

## 二、Routine 层:两台核心日循环在空转(已修)

| Routine | 模式 | last_run 时长 | 判定 |
|---|---|---|---|
| tds growth loop(每 2 日) | 新会话 | **14 分钟** | ✅ 真实工作(对照组) |
| sellSomething 周循环 | 新会话 | 8 分钟 | ✅ |
| 分发暂存(周一) | 新会话 | 11 分钟 | ✅(但 W35 曾有一次 SUCCEEDED 却零产出,已人工回填;保持观察) |
| bpj paid-weekly | 新会话 | 12 分钟 | ✅(prompt 带正确的 monorepo 迁移头) |
| **getecoback daily v4** | 自绑定 session_01NjD2… | **19 秒** | ❌ 绑定会话已失效,每日空转 |
| **bpj 增长循环 v3** | 自绑定 session_01Xa9H… | **15 秒** | ❌ 同上,且 prompt 仍指向旧仓分支 claude/prompt-optimization-workflow-7f3vg2(已归档仓) |
| agi daily(04:00) | 自绑定本舰队会话 | 正常(08-25 有真实 ship) | ✅ 保留 |
| 新站每日进化(05:40) | 自绑定本舰队会话 | 正常 | ✅ 保留 |
| 10万实验月度复核 / 9-1 检查点 / AI 周报 | — | 未到期/正常 | ✅ |

**根因**:自绑定模式依赖持久会话活着;会话被回收/更换后,firing 落进死会话,
15-19 秒即"完成",状态仍显示 SUCCEEDED——**监控盲区**。私有仓时代「fresh session
不能推送」的旧教训导致全员自绑定;公开 monorepo 时代该前提已不成立(tds loop 证明)。

**修复(本轮)**:
1. eco daily v4 与 bpj v3 **删除重建为新会话模式**(create_new_session_on_fire),
   prompt 重写为自足式(add_repo 公开仓 + 各站 CLAUDE.md 为纲 + 无记忆前提下先读
   各自日志尾部),cron 不变(eco 05:00 / bpj 22:00),完成通知 push=on。
2. agi CLAUDE.md 的过时事实条目已更正,并写入新判断标准:**看 last_run 时长**。

## 三、次序缺陷(已修)

fleet-trends 原 04:20 UTC 晚于 agi daily(04:00)——agi 每天读到的是**昨天**的
trends-us/rising 数据。已前移至 **03:45**。现在全链次序:03:45 fleet-trends →
04:00 agi daily → 04:30 eco-trends → 05:00 eco daily → 05:40 新站进化 →
07:41 tds-grow → 22:00 bpj daily,全部消费当日数据。

## 四、遗留观察项(不动,记录在案)

- 分发暂存 Routine 的「SUCCEEDED 零产出」偶发:下次周一若再空产出,在其 prompt 加
  硬性 deliverable-or-explain 条款。
- bpj-growth-loop.yml 的 schedule 处于注释停用状态——功能由 Routine 承担,workflow
  保留 dispatch 即可,不恢复(避免双跑)。
- 自绑定 Routine(agi daily / 新站进化)与交互会话共存:firing 落在忙碌会话中会
  排队,可接受;若未来出现漏跑,同样迁新会话模式。
- 9/1 检查点 Routine 的任务清单仍有效,其中「Routine 心跳检查」从本轮起应按
  **时长口径**核查。
