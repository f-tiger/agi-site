# PRD:llms.txt 有用吗?一手证据判定页(排在 Gemini 时间线之后)

状态:**已上线(2026-08-21,owner /goal 持续升级令下由主会话执行;与 Gemini
时间线同日但分两次独立构建与推送)。** slug `does-llms-txt-actually-work`
(zh+en,kind=firstparty + 通用 watch_slug 字段)。三条一手事实(181 次/24h
面板读数 2026-08-16、agent 调用≈0 的 D1 口径、每日探测七爬虫全 200)+ Ahrefs
需求旁证。判定线到期日 2026-09-18(同下文)。原 PRD 保留于下。

## 一句话

EN 判定页 "Does llms.txt actually work? First-party evidence (2026)"(+zh 镜像):
用本站自己的服务端日志回答一个全网只有观点、没有数据的争论。

## 三门证据

- **数据门(一手,独有)**:本站 llms.txt 是全站 **#1 被 AI 爬取路径(181 次/24h,
  2026-08-16 实测)**,爬取方正是引用四巨头(OpenAI/Google/Anthropic/Perplexity);
  同期真实 agent 工具调用≈0。这一正一负就是判定:**llms.txt 有效于「被机器读」,
  尚无证据有效于「被机器用」**。别家吵观点,本站有日志。
- **需求门**:Ahrefs 2026:"ai search tracking" +184%、"ai rank tracking" +175%,
  llms.txt 查询族在涨;英文供给分裂为吹捧派与否定派,几乎没有带数据的中间判定
  (根仓 docs/startup-trend-sweep-2026-08.md 有源)。
- **商业门**:页尾双钩:①watch 钩子(「本站每天核实 AI 厂商的抓取与额度变化——
  下次生态变化第一时间知道」)②开发者页 API 探针交叉链(读者画像=站长/开发者,
  与 B2B 询价探针同人群)。

## 硬规则

1. 引用的抓取数字**只能来自本站 D1/edge 日志实测**,并写明口径与日期;禁止引用
   别家博客的抓取数据充当自己的。
2. 结论必须保持两段式(读≠用),别为了流量写成「llms.txt 是 GEO 神器」;负面
   一半(agent 调用≈0)是本页可信度的来源,砍掉它页面就一文不值。
3. 判定页六件套齐(答案胶囊/表格/FAQ=JSON-LD/日期/一手源/活数字——活数字用
   「近 24h llms.txt 抓取次数」构建时从日志注入,标注统计日)。

## 判定线(28 天)

首个 AI 引用,或 JS pv ≥30 → 把「AI 爬虫与 llms.txt 观测」做成月更小节(数据
构建时自动注入);否则并入 developers 页作一节,不单独维护。
