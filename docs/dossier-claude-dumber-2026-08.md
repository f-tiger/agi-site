# 证据档案:is-claude-getting-dumber(雷达种子,2026-08-24 01:40 UTC 预取证)

供 04:00 run 三门裁定 + 出页直接引用。全部信源已具名带日期,无需再采。

## 三门预评

- **数据门**:创业雷达首日命中(HN 热帖「Anthropic appears to be A/B testing
  reduced effort levels in Claude Code」,news.ycombinator.com/item?id=49401549);
  该抱怨模式跨 GitHub issues / Reddit / HN / Anthropic status page 反复出现(2025-08
  起至少两个完整周期)。
- **需求门**:"claude nerfed / is claude getting dumber" 是持续复现查询;第三方博客
  已在吃这个词(laozhang.ai「claude opus 4 6 got worse」、alphaguruai substack
  「What's Going On with Claude Code?」)——有供给在抢说明有需求在搜。**弱点:无
  精确量级**(无 GSC 数据),按站规发布前标注这一点。
- **商业门**:判定型问题 × 本站已挣得的「AI 现状判定」引用位;页面钩子 → 追踪指数
  + 订阅。与 /ai-orders-of-magnitude 等同集群。

## 页面骨架(两栏账,历史上用户赢过一次)

核心结构性发现:**这个问题历史上有过一次「用户是对的」的官方确认**,这使它不是
情绪贴而是可判定问题:

1. **2025-08~09 周期(已裁定:用户对了)**:用户报告退化 → Anthropic 2025-09-17
   官方 postmortem 承认三个基础设施 bug(anthropic.com/engineering/
   a-postmortem-of-three-recent-issues):①短上下文请求被误路由到 1M-token 服务器
   (峰值 2025-08-31 影响 16% Sonnet 4 请求)②TPU 损坏致英文回答混入泰文字符
   ③编译器 bug 返回错误 token。同文官方立场:「从不因需求、时段或负载降低模型
   质量」。二手报道:InfoQ 2025-10、simonwillison.net 2025-09-17。
2. **2026-08 周期(进行中,开放问题)**:HN 报告 Claude Code 出现 effort 降级
   A/B;Anthropic 回应称 server-side test 为 display bug 而非 stealth cut
   (anthropic.com/engineering/ 下有更新文,搜索结果标题「An update on recent
   Claude Code quality reports」)。两栏:用户观察 vs 官方解释,不下超出证据的结论。
3. **四个同症状的平凡分支**(诚实层,防标题党):思考模式配置、长线程上下文、
   共享用量压力、不同 surface 的路由差异——同一句「变笨了」可由四种非降级原因
   产生;没有基准复跑就不可证伪。
4. **可检验路径**(本站方法论落点):固定基准复跑(如公开 leaderboard 的时间序列)
   是唯一能把「感觉」变「判定」的工具;给出「何种证据会把本页改判」的翻转条件
   (官方承认降级,或可复现基准显著回归)。

## 出页规格

- EN 判定页 `/is-claude-getting-dumber`,标题即问题;答案胶囊:「这个抱怨历史上
  被证实过一次(2025 三 bug),当前周期(2026-08)官方称 display bug;无基准复跑
  则不可证伪——两栏账如下」。六件套照办,活数字钩子 index_click{claudedumber_live}。
- 零编造纪律:16%/日期/bug 三项全部引 postmortem 原文;2026-08 部分只引 HN 帖
  与官方回应,不采信匿名评论的数字;"四分支" 归纳标注为分析框架而非实测。
- 反面预登记(同雷达种子条目):28 天 pv<20 且引用 0 → 雷达种子假设记一次失败。
