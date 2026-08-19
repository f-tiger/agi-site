# Bing Webmaster Tools 设置指南（10 分钟，一次性）— 2026-07-12

## 为什么这是当前最高杠杆的一次动作

**ChatGPT 搜索的实时检索层用的是 Bing 索引**（研究实测两者结果重叠约 73%）。
不在 Bing 索引里 = 无论 Google 排名多好，ChatGPT 搜索都引用不到你。
本站做了 GSC（Google），但从未进入 Bing 体系——等于 GA4 里唯一自然增长的
"AI Assistant" 渠道（chatgpt.com 已有零优化下的 4 会话）只吃到一半。
Perplexity 用自己的索引（PerplexityBot 我们已放行），Copilot 也吃 Bing 索引，
所以这一次设置同时覆盖 ChatGPT 搜索 + Bing + Copilot 三个入口。

## 操作步骤（10 分钟）

1. 打开 https://www.bing.com/webmasters 用任意微软账号登录
2. 选 **"Import from Google Search Console"**（一键导入，免验证文件/DNS）
   — 用你验证 GSC 的那个 Google 账号授权即可
3. 导入后确认站点 agiscorecard.com 出现，且 sitemap
   （https://agiscorecard.com/sitemap.xml）已随导入带入；
   若没有，在 Sitemaps 里手动提交这一条 URL
4. （可选）Settings → IndexNow 里生成 key 不必做——本站部署环境无法
   ping IndexNow 端点，靠 sitemap + Bingbot 抓取即可

## 完成后告诉引擎

在对话里说一声"Bing 已导入"，我会：
- 在 analytics-notes.md 记录日期，作为 AI Assistant 渠道的干预基线
- 之后每日运行观察 chatgpt.com referral 与 AI Assistant 渠道的变化
  （预期滞后 2–6 周，与 Google 索引节奏类似）

## 引擎侧已完成的配套（无需你动）

- robots.txt 已放行 Bingbot / OAI-SearchBot / PerplexityBot 等全部 AI 爬虫
- 全站页面均为静态 HTML（服务端渲染，爬虫可完整读取，无 JS 依赖）
- 每页带 FAQ 问答块 + FAQPage/Article JSON-LD + 可见"Last updated"日期
  （调研确认：问答格式引用率 ~3x，显式更新信号是 Perplexity 的强偏好）
