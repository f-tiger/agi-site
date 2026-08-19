---
name: citation-growth
description: Grow AI-engine citations (ChatGPT/Copilot/Perplexity/Claude) for a small site using the fleet's own verified playbook — judgement-page checklist, citation-share math, Bing AI Performance loop, and zero-click conversion hooks. Use when the goal is AI-assistant visibility, GEO, llms.txt strategy, or turning citations into subscribers/clicks. House skill distilled from agiscorecard/getecoback first-party data, not generic guru advice.
metadata:
  origin: fleet-house-skill (agiscorecard + getecoback verified data, 2026-08)
---

# Citation Growth — 已验证的 AI 引用增长打法

四站舰队自研技能。每条规则背后是一手数据，不是行业传闻。引用份额是
**唯一不受流量约束的增长杠杆**：agiscorecard 在真实读者仅 ~17 人/天时拿到
"are we close to agi" 查询 37.5% 的引用份额（Bing AI Performance 实测）。

## 核心事实（先校准世界观）

1. **引用 ≠ 流量**：564 次引用同期只换来个位数点击（agi 实测）。AI 答案是
   zero-click 的。但 AI 引荐访客转化率是传统搜索的 **23 倍**（Ahrefs 一手数据:
   0.5% 流量贡献 12.1% 注册）——所以每个被引页必须带转化钩子。
2. **吃引用的是「判定型」页面**：定义 / 现状 / 对比三类。工具页与游戏化页
   引用为 **0**（agi 前十引用页实测），别拿引用考核它们——它们吃点击和绑定。
3. **引用份额不需要先有流量**：多覆盖一个判定型通用问题就多一份份额。
4. **ChatGPT 搜索走 Bing 索引**（~73% 重合）：Bing Webmaster 收录 = ChatGPT/
   Copilot 可见性的闸门。Bing 索引率低（如 39/1474）时先解决索引再谈内容。
5. **Perplexity 偏好**：Q&A 格式（~3x 引用率）、前 50 词直接答案、明确的
   更新时间信号、垂直深度 > 域名权威。

## 判定型页面六件套（每页必过，缺一不发）

① 标题即那个问题本身（≤60 字符）
② 首屏答案胶囊：先给结论，再给论证
③ 一张表格（结构化数据是引用磁石）
④ 可见 FAQ 与 FAQPage JSON-LD **逐字一致**（不一致有惩罚风险）
⑤ 带日期的一手判定 + 一手源外链（Princeton GEO: 引源 +40%、带日期统计 +37%、
   具名引语 +30%；关键词堆砌 **−10%**）
⑥ **首屏一个聊天答案装不下的活数字**（会变、可审计、带埋点）——缺这条 =
   白送引用不收点击。例：62.5/100 追踪分 + 八条翻转条件。

另：单 h1（2.8× 引用率）、Article + BreadcrumbList JSON-LD、canonical、
更新日期可见（"Last updated" + dateModified 同步）。

## 基础设施层（一次做对，长期吃息）

- robots.txt 显式 Allow 全部 AI 爬虫（GPTBot/ClaudeBot/PerplexityBot/
  OAI-SearchBot/Google-Extended…）；llms.txt + llms-full.txt；机器可读数据集
  （data.json 类，CC 许可，含 dateModified）——原创数据是第一引用磁石
- MCP server + 官方 registry 上架 = agent 生态分发面（免费换引用）
- IndexNow 推送挂 schedule 不挂 push；服务端计爬虫数（JS beacon 抓不到爬虫）
- **测量陷阱（两站各踩过一次）**：CI 自测/健康探针会伪装成 agent 采用——
  任何"调用量上涨"结论先查参数是否逐字重复、时间是否与 CI 重合

## 运营循环（月度）

1. 每月拿一次 Bing Webmaster → AI Performance 两张明细（Grounding Queries +
   Pages）——这是唯一的引用一手数据源
2. 按「引用量大 × 缺活数字」补钩子；按「引用量大 × 缺多语言」补翻译
   （被引页 × 8 语言互挂 hreflang 是已验证的放大器）
3. 队列空了不硬塞：没有新引用数据就没有新依据，回到常规优化
4. 某类页面持续 0 引用 → 记入反面发现，停止投入该类

## 反模式（实测判死，勿复活）

- 为引用做游戏化/工具页（0 引用实测）
- 无真实查询证据的猜测选题
- 把服务端爬虫计数当真人流量（UA 正则高估已被 UA 对账证伪两次）
- 等引用变成流量再做转化（永远等不到——钩子必须与引用同页同屏）
