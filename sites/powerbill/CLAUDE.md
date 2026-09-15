# powerbill.agiscorecard.com — The Power Bill 操作手册(2026-09-15 建站)

**缘起(owner 原话)**:「扩展几个适配欧洲、美国的站点」(2026-09-15)。调研 `docs/research-2026-09-15.md`。

## 定位
美国 + 欧盟的**电费判定站**,回答一个正在被两边各说各话的问题:**AI 数据中心是不是在抬高你的电费**。
本站的差异化不是立场,是**同屏给出反向证据**:PJM 容量拍卖创纪录($329.17/MW-day)与 EPRI
「2015–2024 每当数据中心容量翻倍,零售电价平均下降约 3.5%」并列。两者都真,决定方向的是
**成本分摊规则**,而规则是在公开程序里定的。
**不卖任何东西、不推荐供应商/换电价/光伏、不接联盟链接、不用注册。**

## 机器结构
- 纯静态 `site/`,`worker.js` = 资产透传 + `/e` 白名单 + 服务端 page_view + ua_audit + `/api/pulse`。
- **D1 复用** `after35-events`(6109b81e-…),表名前缀 p:`pev`、`pua_audit`。六站永不共用表。
- 部署 `deploy-powerbill.yml`(每日 09:05Z 兜底);闸门 = 文件齐 + `node --check` + 单测 + gen_md 三张
  .md 孪生 + **人均归因数字禁令 grep** + **出处锚点断言**(329.17 / Electric Power Research Institute /
  Energy Information Administration)+ **`/bill-decomposer` 禁止任何外部数据请求** + 两页 FAQ 一致;
  冒烟 13 路径 + `/api/pulse`。
- 一键停止:`sites/powerbill/KILLED`。IndexNow host 已登记。
- 事件白名单:`page_view`、`tool_result`、`bridge_click`、`resource_click`、`share_click`、`faq_open`、
  `calc_run`。工具只回传形状(`decompose:rate`、`whopays:high:6`),**绝不回传金额或用电量**。

## 已上线(v1)
判定:`/is-ai-raising-your-electricity-bill`(部分地区是,走容量与电网成本;反向证据同屏)·
`/who-decides-who-pays`(决定权在监管机构的公开程序;四种机制:容量市场 / 大负荷专用电价 /
接入与增容成本 / 一般调价案)。
工具:`/bill-decomposer`(两张账单 → 价格效应 / 用量效应 / 交叉项,**只用读者输入的四个数**)·
`/who-pays-check`(八问 → 哪些机制能把成本转到你头上 + 该去搜哪份文件;标注为编辑判断)。
清单:`/resources`(PJM、市场监察、EIA、EPRI、Eurostat、各州 PUC / 各国监管机构),另有 `/about`。

## 内容硬约束
1. **永不发布「数据中心给你的账单加了 $X」这类人均归因数字**——它取决于你的公用事业公司与电价方案,
   全国口径的单一数字就是猜。部署闸门 grep 这一类写法。
2. **EPRI 的反向证据不许删**(闸门断言)。只给一边的页面是在辩论不是在报道,而「两边都给」正是
   本站唯一的差异化。
3. 数字必须带发布机构:PJM 拍卖结果、Monitoring Analytics、EIA STEO、EPRI、Eurostat。
   调查类百分比(如「x% 的人担心」)无公开方法论的一律不引。
4. **不逐州/逐国列 docket 表**——几周内必然过期且必然有一处是错的。工具给搜索词,不给清单。
5. `/bill-decomposer` 不得请求任何外部数据(闸门强制),也不得把金额写进事件。
6. 欧盟侧只写**已被多家独立来源一致报道的事实**(都柏林/荷兰/法兰克福的新增接入限制、
   多年期接入排队、增容成本经受管制电价回收),各国具体电价一律指向 Eurostat 序列而非转述数字。

## 判定线(预登记 2026-09-15,按原文结算)
- **2026-11-15**:`pev` 真人 page_view ≥ 200/28d 且 `calc_run`+`tool_result` ≥ 40 → 继续维护并加第二批
  判定页(候选见调研 §五);<50 pv → 降为月度维护。
- **2026-12-31**:任一判定页出现 ≥1 次 Bing AI 引用 → 成立;0 → 与 codeword 一并计入「英文新站 vs
  主站加页」的反面发现。
- **2026 年下一次 PJM 容量拍卖结果公布**:必须同一次运行内更新首屏数字与翻转条件表。

## 每日块(舰队总任务 H)
只报数不动:`pev` 真人 pv、`calc_run`、`resource_click`。
优化只在有真人信号或一手数据更新(PJM 新拍卖、EIA STEO 修订、EPRI 新研究、Eurostat 半年度更新)
时做一件。**数字过期比没有更糟**——首屏的 $329.17 与 18.02¢ 两个数各自带年份,复核时一起改。
姊妹站分流:德语家庭节能 → getecoback;AI 资本开支本身 → 主站 `/ai-capex-trillion-dollar`。
