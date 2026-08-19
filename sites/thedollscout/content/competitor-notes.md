# 竞对 + 需求简报 · 2026-08-17

> content/ 不发布（robots 与 assemble-dist 之外），本文件仅供后续会话使用。
> 本轮任务：真实用户需求洞察 + 同类竞对对比 → 一个高质量刷新。

## 一、一手需求信号（本站自有数据，2026-08-16 crawl-log / traffic）

1. **AI 爬虫的引用面偏好高度集中在两页**：`/scam-check`（GPTBot 8 + ClaudeBot 18 +
   PerplexityBot 7 次/日）与 `/guides/height-weight`（Bingbot 16、ClaudeBot 16、
   PerplexityBot 16 次/日）。判定型/决策型页面吃引用，与 agiscorecard 的 Bing 实测结论
   一致。数据集文件（doll-specs.json、payment-recourse.json、import-costs.json）也被
   反复抓取——数据资产在被机器读。
2. **Googlebot 覆盖面广**（815 次/日、60+ 路径），importing/* 国家页是第二大簇。
3. AI 爬虫日志里三至五成请求是 UA 伪装的漏洞扫描（.env/credentials 404）——与
   agiscorecard 2026-08-16 的诊断相同，**不是故障，别修**。

## 二、用户原声要点（WebSearch，2026-08-17；Reddit 直连被挡，经 Trustpilot/竞对站转述）

1. **被坑的主导模式是「货不对板 + 拒退款」**：Trustpilot 上 kaydora、lovedollshops 等店铺
   评论反复出现 "products not resembling pictures"（发的是廉价通用娃）、发错地址、
   不发货且拒退款、客服失联（不接电话、chat 不回）。
2. **「stolen factory photos」是被点名的诈骗手法**（dollvendoraudit.com 的审计条目）：
   用偷来的工厂照冒充自有库存 / 冒充买家的定制单。配套手法：假倒计时、"only 2 left"、
   review extortion（部分退款换五星）。
3. **通用维权知识没有垂直版本**：PayPal 争议 180 天、20 天内必须升级为 claim、
   chargeback 常见 60–120 天窗口——这些只存在于通用金融站（aura.com、chargebacks911），
   没有任何 doll 垂直站把它接到「工厂照批准=争议证据」这一步。

## 三、竞对差距表

| 站点 | 覆盖 | 缺口 |
|---|---|---|
| whichsexdoll.com | "12 ways to avoid scams" 预防清单 | 全是**付款前**；没有付款后的检查点操作 |
| dollvendoraudit.com | 厂商逐家审计评分、点名 stolen factory photos | 告诉你手法存在，**不教你怎么核对自己收到的工厂照** |
| d-addicts / sexdollslove 等 | "trusted vendors" 榜单（自带联盟利益） | 榜单即广告；无决策工具、无数据集 |
| Trustpilot / TheDollForum | 原声与个案 | 无结构化提炼；论坛内容 AI 引擎难提取 |
| 通用金融站 | chargeback/PayPal 流程与期限 | 与 doll 购买场景（工厂照、定制、跨境运费）零衔接 |

**结论**：全行业把 "get factory photos" 当四个字的 checkbox 说完就走。「工厂照到了，
怎么核对才批准」是买家资金杠杆最大的一个决策时刻（批准前=产线改正，批准后=跨境退运+
自己签过字），却没有任何站回答。这正好落在本站定位（决策点买家保护）与已有资产
（scam-signals 信号 3/8、after-you-order 时间线、payment-protection 争议时钟）的交点上。

## 四、本次刷新（2026-08-17）

新页 **`/guides/factory-photos`**（"Factory Photos: What to Check Before You Approve"）：
- 首屏答案胶囊（5 项核对 + 订单号入镜照 + 书面批准）；核对表（正常公差 vs 拒收理由）；
  「照片证明是你的娃」两法（订单号入镜、反向图搜=复用 scam-signals 信号 8）；
  「工厂照看不出什么」诚实节（凝胶/骨架/气味→衔接到货录像）；拒收话术与两种施压
  红旗（"先批准到货再修"、主动折扣换批准）。
- FAQ 4 问与 FAQPage JSON-LD 逐字一致（已程序化校验）；Article + Breadcrumb schema；
  标题 48c / 描述 144c；单 h1；无厂商链接（页脚如实声明）。
- 编辑判断已标注（核对表=编辑综合，工厂书面答复优先级更高）；无一处未溯源数字
  （audit-claims 通过）。
- 内链：after-you-order 工厂照节 → 新页；scam-check 信号 3 → 新页；guides/index 卡片。
- 入站规则：ADULT_SURFACES（保守规则：讨论产品外观即标注）。

## 五、后续 3 个选题种子（按证据强度排序）

1. **「货不对板到货了」到货 72 小时行动页**：film-first 证据 → SNAD 争议措辞模板 →
   期限表（PayPal 180d/20d 升级、chargeback 窗口引 payment-recourse.json）。现分散在
   after-you-order / scam-check / payment-protection 三页，缺一个以「已经出事」为入口的
   页（AI 引擎最常被问的正是事后问题）。注意与三页的蚕食边界：入口意图不同（事后 vs 事前）。
2. **height-weight 深化**（AI 引用第一梯队页）：加「你能搬动多少」的决策段（搬运姿势
   ≠ 硬举、楼梯/更衣实际动作），复用 doll-specs 实测行；等 140cm/165cm 样本到 10 行
   自动开新 entity 页（grow-status：140cm 还差 6、165cm 还差 9）。
3. **review-pattern 判读页**：把 scam-signals 信号 5 展开成「怎么读一家店的评论」
   （invited 评论、review extortion 的样子、已解决投诉为什么是正信号）——竞对只有
   Trustpilot 泛泛建议，无结构化判读法。

## 六、方法论备注

- Reddit 直连与 dollvendoraudit.com 抓取均被 egress 挡；原声证据经搜索引擎摘要与
  Trustpilot 二手转述，置信度=中。下次拿到 GSC/真实 query 数据后应回头复核选题。
- 本轮未动 `/scam-check` 的 "Already scammed" 节：payment-protection + after-you-order
  已覆盖恢复路径主干，新建独立恢复页需先想清蚕食边界（见种子 1）。
