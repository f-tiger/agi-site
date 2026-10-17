# EcoBack 自主内容扩展

此实现把内容执行器接入既有 `deploy-getecoback.yml`，不是释放预写文章的队列。是否真正上线，以 Actions 运行、自动提交及线上验收记录为准。

## 从发现到发布

1. 既有 **03:17 UTC** 的 schedule 和手动 workflow_dispatch 从官方动态目录发现德国产品与英国产品。push 只重建、部署已有内容，不额外扩展。
2. `auto_content_sources.py` 读取 Trotec 德国 sitemap 和 Meaco 英国目录，抓取具体型号的技术参数。限定官方域名、响应体、请求数、重定向和超时。未发布型号优先，轮转并复查已发布型号；不是固定型号白名单。
3. `auto_content.py` 检查市场、来源日期、功率及至少四类独立规格，排除既有手写型号页、重复变体、无实质变化及退役品类。新鲜且匹配的既有增长信号仅用于优先级；没有有效信号时明确记录为官方目录的规格内容缺口，不宣称热门。
4. 合格候选生成本地语言的型号指南与费用情景工具。每个 UTC 日最多一个新增或实质更新，写入持久 ledger。来源读取失败、没有新事实和同日重试均不生成文章或刷新日期。德国优先；连续两次德国发布后优先英国，某市场没有合格候选时允许另一市场承接。
5. 重建首页与相关指南入口、工具页、搜索索引、sitemap、`llms.txt`、Markdown、canonical/hreflang 和统计覆盖，运行内容和技术门禁。
6. 门禁通过后，`commit_auto_content.py` 只提交事实 registry、ledger 和该次生成的一个 HTML。远端 main 前进、混入 staged 文件、超出路径范围、非法归属或推送失败都会阻止部署；不会 rebase 后直接发布未经验证的构建。同一个工作流部署已验证构建，绕开 GITHUB_TOKEN 提交不会触发新 push workflow 的限制。
7. 发布后按实际变更 URL 验证线上页面，并沿用现有 IndexNow 差集提交，不新增 cron 或逐 push 单独提交。接收成功不是收录证明。

## 内容质量和工具边界

当前自动范围是 **DE/GB 除湿机型号规格与运行成本决策**；其他品类只有在相应来源适配器、事实和用户价值规则完成后才进入自动发布。它不是任意主题的无人审核文案生成器，也不把无关热搜转成网站文章。

页面包含型号规格、原始测试条件、功率费用例子、温度与除湿量解释、水箱/排水安排、噪声比较、选购停止条件和来源。工具用选择按钮，无需注册或键入；无 JavaScript 仍有可复算实例。功率计算明确假设持续以厂家所述功率工作；厂家测试点不当作真实平均功耗或所有工况的上限。实验室升/日不换算成实际倒水间隔。价格、日期、颜色和库存变化不会产生“新内容”。

英国页面使用英式英语和 GBP 示例；示例电价不是当前 tariff。插头和配送仅在证据支持时说明，未核验就标为未知。自动生成页没有联盟购买链接、销量、评分、亲测、热销或库存承诺；关联已有本地决策内容。不会自动恢复储能、阳台光伏或 Growatt 页面。

站点的 **04:30 UTC** `eco-trends.yml` 保持采集日程。`tools/eco_evolution.py` 和旧 expansion queue 保持研究用途；真正发布由上述新执行器完成。不会恢复 ECO Growth Loop，不增加付费服务，不发送外联或社交帖子。

## 状态、证据与统计

- `data/auto-content.json` 保存结构化事实和真实发布日期；`data/auto-content-ledger.json` 保存来源归属、内容指纹和每天额度。两者一起提交，重跑不会重复发布。删除它们会丢失幂等状态，不可当缓存清理。
- 每次运行的来源状态、候选决定、`publication.json` 和提交结果通过 `eco-auto-content-<run_id>` artifact 留存。抓取失败保持原页面，失败原因不解释为零市场需求。
- 只发固定 `auto_view`、`auto_example`、`auto_calculate`、`auto_share` 业务事件，工具 ID 固定。默认示例不是个人计算完成；复制成功也不是已经发到 Reddit/X。具体型号、使用时长、电价选择、结果和分享文本不进入事件数据。沿用同意、DNT/GPC、QA 和自动化浏览器排除。
- 以实际发布次日开始连续观察完整 14 个 GA4 属性日，分别观察到站、工具使用和后续商品点击。事件次数不是用户数、订单或收入。已核验佣金仍需授权可读的订单/佣金报表，不能从发布成功或 GA4 事件推算。

## 检查入口

`test_auto_content_sources.py` 测源数据边界；`test_auto_content.py` 测证据、去重和额度；`test_auto_content_render.py`、`test_auto_product.mjs` 与临时 fixture 的 `browser_auto_product.cjs` 测正文、公式、移动端、无 JS 与隐私；`test_auto_discovery.py` 测入口；`test_commit_auto_content.py` 使用隔离 Git remote 检查提交边界。`check_auto_content_release.py` 验证构建与实际发布页面。初始 registry 为空时，fixture 浏览器测试仍运行，不把“零页面可测”视为通过内容验收。
