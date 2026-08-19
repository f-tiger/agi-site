# PRD：方法审计（Method Audits）——"这个赚钱方法是真的吗"

> 来源调研：`docs/research-youtube-money.md`（四方案研判的唯一推荐落点）
> 状态：待 owner 确认方向后实施 ｜ 撰写：2026-08-15

---

## 一、定位

**一句话**：别人告诉你"这方法能赚钱"，我们告诉你它的真实成本、平台规则风险、
多数人失败在哪、以及这条路上的骗局长什么样——不卖课，所以敢写结论。

在四层阶梯里的位置：审计是"想赚钱"人群的**入口内容**，向下承接到已有作业：

```
想赚钱 → 方法审计 → 赚钱作业 → 0 元方案 → 免费工具
 人群    /audits/    /money/     /plans/     /tools/
```

审计回答"这条路值不值得走"；作业回答"值得走的话第一周做什么"。
判定为"能走"的审计必须链接到对应作业（没有就先补作业）；
判定为"别走"的审计本身就是产品——**市面上没人肯写"别走"**。

## 二、目标用户与需求证据

- **谁**：被短视频/YouTube"赚钱指导"内容种草、准备投入时间或钱、
  但将信将疑的人。搜索行为特征：`[方法名] 是真的吗 / 靠谱吗 / 骗局`、
  英文 `is [method] legit / scam`。
- **证据**（详见调研报告）：
  1. "is YouTube automation legit/scam"、"GrowChannels scam"、"is Whop clipping legit"
     是持续存在的高意图搜索词；
  2. 决策类页面是零点击时代唯一保持流量的页面类型（信息类年跌 40–70%）；
  3. 现有供给两种都靠不住：卖课者软文（结论永远是 legit）与零散论坛帖。
- **细分赛道**：不做"全部副业"的审计，**只审 AI 相关的赚钱方法**——
  与站内工具库、作业库同构，每一篇都能落到站内已核实的资产上。

## 三、硬规则（继承站规，一条不减）

1. **不承诺收入数字**；引用他人收入宣称时必须标注"宣称，未核实"。
2. **每篇必须有"多数人怎么失败"一节**——没有失败分析的审计不许发布。
3. **每篇必须有"这条路上的骗局长什么样"一节**。
4. **每个事实句必须带来源与核实日期**（沿用 limits 的 source/checked 纪律）。
5. **结论只有三档**：`能走（0 元起步）` / `能走但有前提（写明前提）` / `别走（写明原因）`。
   不许出现"因人而异"这种废话结论。
6. **审计对象不含点名攻击个人**：审"方法"与"模式"，不审"某个博主人品"；
   涉及具体产品/课程时只引用可公开核实的信息（价格、条款、公开投诉）。
7. 全程只推荐站内已收录的免费工具；**审计页面永不放联盟链接**
   （审计是信任资产，与 PRD-revenue 的护栏同源：判定不能与佣金同页）。

## 四、MVP 范围

### 数据

`data/audits.json`，结构与 hustles.json 同风格：

```
{
  "slug": "youtube-automation",
  "title": "YouTube 全自动带货/广告频道（YouTube Automation）",
  "claim": "视频里说：不出镜、AI 全自动做号，躺赚广告费",
  "verdict": "no-go" | "go" | "go-with-conditions",
  "verdict_line": "一句话结论",
  "reality": { "cost": "...", "time": "...", "platform_risk": "..." },
  "why_most_fail": "...",
  "scams": ["..."],
  "sources": [{ "url": "...", "checked": "2026-08-15", "note": "..." }],
  "hustle": "ai-tool-review-account" | null,   // 判定为 go 时指向站内作业
  "keywords": ["..."]
}
```

### 首批 6 篇（全部来自本轮调研，证据已在手）

| slug | 初判 |
|---|---|
| youtube-automation（全自动频道） | 别走（平台点名打击 + 封号实例） |
| ai-side-hustle-course（AI 副业课） | 别走（内容全网免费可查，调研有原声） |
| ai-hangup-passive（AI 挂机躺赚） | 别走（违反平台规则，封号风险） |
| video-summary-site（做视频总结站） | 别走（工具饱和 + 零点击 + ToS） |
| method-marketplace（倒卖赚钱方案） | 别走（柠檬市场，Whop 现状为证） |
| ai-tool-review（AI 工具测评账号） | 能走 → 链到已有作业 ai-tool-review-account |

### 页面与构建

- `/audits/` 索引 + `/audits/<slug>/` 详情，中文根路径 + `/en/` 镜像，
  纳入 `npm run build` 静态生成与现有巡检（verify、guard-regression 增加
  audits 的 sources/checked 必填断言）。
- 详情页固定五段结构：宣称 → 真实成本 → 多数人怎么失败 → 骗局图鉴 → 结论
  （+ 能走时的"第一周做什么"链接）。
- llms.txt / MCP resources 增加 audits 暴露（沿用 attribution 要求），
  让 agent 引用时能带出落点——这直接服务 PRD-revenue 的"修分母"。

## 五、不做什么

- ❌ 不做方案 2（聚合/总结站）与方案 3（交易平台），理由见调研报告。
- ❌ 不做审计的自动生成流水线：yt-ingest 只供选题候选，正文必须人工核实
  （competitor-research-money.md §6 的既定纪律）。
- ❌ 本期不做 YouTube 分发账号（方案 1 改造形态）：环境无 YouTube API/上传能力，
  属 owner 本地后置项；审计线跑顺后再议。
- ❌ 不做评论区/用户投稿：投稿即重新引入柠檬市场问题。

## 六、验收

1. `data/audits.json` ≥ 6 条，每条 sources 非空且含 checked 日期；
2. 构建四项全零（build/verify/guard-regression/链接巡检）；
3. 每篇详情页五段结构齐全，"多数人怎么失败"与"骗局图鉴"两节非空为硬断言；
4. 判定 go 的审计均有 hustle 链接且目标作业存在；
5. 上线后观测指标：audits 页的搜索展示/点击（GA4 已有基线）、
   AI 爬虫对 /audits/ 的抓取占比（ai-crawler-probe 已在跑）。

## 七、与既有 PRD 的关系

- **不替代 PRD-revenue**：营收路径仍按 PRD-revenue 执行（修分母 → 联盟 → 订阅 → agent 调用）。
  审计线的角色是给"分母"添最耐零点击的那类页面（决策类查询）。
- **扩展 competitor-research-money.md 的定位**："每条路告诉你会怎么失败"
  从作业的一节升级为独立可检索、可被 AI 引用的页面类型。
