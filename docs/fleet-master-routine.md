# 舰队总任务 · Routine prompt 原文（trig_012kK8KVg4WYD4g6Y6wEiXet）

- 建立：2026-09-14，owner 原话「现在舰队你的定时运行任务各种出错，你帮我全部删除，然后重建一个总任务」
- cron：`0 4 * * *`（UTC，北京 12:00）；模式：**自绑定**到常驻会话 `session_016njKJ81yVv2QdrpLYCX1Vc`
  （新会话推不了仓、没有 MCP；三种已知的计划路径故障有两种只发生在新会话）
- 模型：自绑定 Routine 的模型**由绑定会话当前模型决定**，Routine 里写什么不作数（map 第七节）。
  重建当天会话已被 owner 切到 `claude-fable-5-1`；09-07 的 Weekly News 失败原文是
  「You've reached your Fable limit」——**总任务是否会撞同一堵墙，要看第一轮**。
- **本文件与线上 prompt 必须逐字一致**：用 `update_trigger` 改 prompt 时，同一次提交改这里。

---

