# 循环规格:每周分发暂存(fleet distribution staging)

建于 2026-08-21(owner:「市场营销推广自动化起来,赶紧赚钱」,经 marketing-loops
技能建模)。**这是舰队营销面唯一缺失的循环**:内容/GEO/触发器/度量都已自动化,
但「已上线资产 → 社区/社交分发」始终依赖 owner 空手起意,于是长期为零。本循环
把它变成「机器每周备好弹药,owner 每周 ≤10 分钟扣扳机」。

## 九要素(marketing-loops 模板)

| 要素 | 定义 |
|---|---|
| **Check cadence** | 每周一 01:30 UTC(北京 09:30,紧跟 09:00 的 owner 每日提醒) |
| **Acts when** | 本周舰队有 ≥1 个新上线/实质更新且带一手数据钩子的资产;否则输出「本周无可暂存,跳过」 |
| **Purpose** | 打开唯一未自动化的增长渠道:社区分发(Reddit≈Perplexity 高引用来源;EA Forum/LessWrong 已是 agi 最大社区引荐源) |
| **Skills used** | content-engine · social · reddit-engagement · hacker-news-strategy |
| **Loop body** | ①git log + 各站 OPT-LOG 取本周资产 ②按「一手数据钩子强度 × 平台匹配」选 ≤3 条 ③起草平台原生成品(HN 标题+首评 / X 线程 / Reddit 答帖素材 / tds 无链接答帖)④写入 docs/distribution-staging/YYYY-Www.md ⑤读上周文件的勾选状态 ⑥中文简报(含粘贴即发文本)推送 owner |
| **Self-check** | 每个数字必须能溯源到已上线页面或一手日志;绝不调用任何发布 API;各站守则逐条过(tds 无链接、agi 不报订户数、eco 佣金数字不出现) |
| **State / 幂等** | 周文件名 = 去重键;同一资产 3 周内不重复暂存;上周勾选状态决定本周语气(发过的平台给续弹,没发的不加量) |
| **Stop / bail-out** | 连续 4 周勾选全空 → 自动降频为每月一次并在简报里如实说明(不 nag);任何步骤出错 → 报告后停,不重试轰炸 |
| **Output** | docs/distribution-staging/ 周文件(入 git)+ 推送简报 |

## 两层动作模型(guardrails)

- **自动层**:选材、起草、暂存、状态记录——全自动。
- **人工层**:一切「发布」动作。机器代发被三个站的守则明令禁止,而且社区平台
  对代发内容的容忍度决定了这条渠道的存亡。**永不越线。**

## 首轮已跑(2026-W34)

见 `distribution-staging/2026-W34.md`:HN×2(llms.txt 一手证据 / EU AI Act 台账)、
X 线程×1(协议记分板)、Reddit/社区答帖素材×2。证明循环体可产出后才排程——
按技能反模式清单:先建一个、跑通、再谈下一个。
