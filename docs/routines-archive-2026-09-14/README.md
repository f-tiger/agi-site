# Routine 存档（2026-09-14）

owner 原话：「现在舰队你的定时运行任务各种出错，你帮我全部删除，然后重建一个总任务」。

本目录是重建前全部 10 条 Routine 的 **prompt 全文**（文件名 = trigger id），
供总任务路由引用，也是它们被删除后唯一的留痕。重建时的状态快照：

| id | 名称 | cron (UTC) | 模式 | 最近一次运行 |
|---|---|---|---|---|
| `trig_01VSh8sktmpuMndDpAKJcuR5` | DollScout（Labubu 站）增长循环 · 每 2 天 v2（autopilot 后） | `10 7 */2 * *` | 新会话 | SUCCEEDED 2026-09-13 |
| `trig_014Ytq7zLsYbtPgsoc1CftKo` | 白嫖计每日增长循环 v6（扩张令 #13） | `0 22 * * *` | 新会话 | SUCCEEDED 2026-09-13 |
| `trig_01TWFzZyPFaXuHFfrray2hZr` | getecoback daily v6（autopilot 后） | `0 5 * * *` | 新会话 | SUCCEEDED 2026-09-13 |
| `trig_01EeVyMTLadRi7uhax7MYWwc` | 10万实验月度复核 | `0 6 5 * *` | 自绑定 | 从未触发  |
| `trig_014Qc7okJSgZ6HKWsNM8vnUm` | [已合并·勿启用] sourceradar 每日进化 → 并入舰队日报 trig_018xnCHHqLjXgLdPoL4eQuGs | `40 5 * * *` | 自绑定 | 从未触发  |
| `trig_01TTRAX1LEgw1T382fd537V3` | sellSomething 营收自动化周循环（周一 03:30 UTC） | `30 3 * * 1` | 新会话 | FAILED 2026-09-07 |
| `trig_014sbjgCWo9aPYjce8Xp81x8` | 舰队每周分发暂存(周一 09:30 北京) | `30 1 * * 1` | 新会话 | SUCCEEDED 2026-09-14 |
| `trig_018chEXs9JvJYexpHvbv3Pp4` | paid-monthly-recheck（白嫖计付费档位·每月 5 日） | `0 1 5 * *` | 新会话 | SUCCEEDED 2026-09-05 |
| `trig_018xnCHHqLjXgLdPoL4eQuGs` | 舰队日报: agiscorecard + sourceradar（2026-09-04 合并） | `0 4 * * *` | 自绑定 | SUCCEEDED 2026-09-13 |
| `trig_015pNchjLTcQd8utaPKBA4NZ` | Weekly AI & Tech News Roundup | `0 8 * * 1` | 新会话 | FAILED 2026-09-07 |

## 当时查清的三类「出错」（不是一种）
1. **`Weekly AI & Tech News Roundup`（真失败）**：09-07 run 在 8 秒内退出，原因
   `You've reached your Fable limit. Switch to another model to continue.` ——
   它是 Cowork-remote 建法（另一个 environment），`configured_model` 仍是 `claude-fable-5-1`，
   09-07 那轮「全部改回 opus-5」没改到它（`session_request` 里没有 `config`，见 map 第七节的坑）。
2. **`sellSomething 周循环`（假失败）**：Routine 状态标 FAILED，但会话本身跑了 13 小时、
   输出 18.6k tokens、结束于 REVIEW_READY——工作做了，是 Routine 包装层把它记成失败。
3. **`10万实验月度复核`（静默未触发）**：08-23 建立、cron 每月 5 日 06:00，`last_run` 为空，
   09-05 那次没有任何唤醒到达绑定会话；`next_run_at` 却排到了 10-05。自绑定 Routine
   曾在 09-03 被平台挂起（map 第一节），这一条很可能同属那批但没被发现。

## 处置
- 新建 **`trig_012kK8KVg4WYD4g6Y6wEiXet`「舰队总任务」**，自绑定到常驻会话，`0 4 * * *`，
  prompt 全文 `../fleet-master-routine.md`。它把 10 条的职责按 每日/周一/每月5日 三档路由。
- 旧 10 条：**先全部 `enabled=false` 并改名 `[已并入总任务 09-14·勿启用]`**，未删除。
  理由：map 第四节第 3 条「永不 delete_trigger」是有事故背书的（7/17–19 触发器丢失导致
  循环中断三天）；总任务真跑通一轮之前删掉旧的，等于把全部 10 条职责押在一条没跑过的
  新链上。**owner 确认总任务第一轮成功后，删除是一句话的事。**
