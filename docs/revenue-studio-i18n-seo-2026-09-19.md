# 工具多语言、搜索发现与可引用资产

日期：2026-09-19。Owner 要求优化已上线的 24 个工具，重点是 Eco/BPJ 多语言，以及 SEO、GEO 和外链。原始工具发布见 `revenue-studio-release-2026-09-19.md`。

## 本轮实现

| 站点 | 工具数 | 语言 | 工具页 / 含目录页面数 | 主要入口 |
|---|---:|---|---:|---|
| BPJ | 3 | 简体中文、英文 | 6 / 8 | `/workbench`、`/en/workbench` |
| AGI | 15 | 英文、简体中文 | 30 / 32 | `/workbench`、`/zh/workbench` |
| Eco | 3 | 德文、英文、意大利文 | 9 / 12 | `/workbench.html`、`/en/workbench.html`、`/it/workbench.html` |
| TDS | 3 | 英文、德文 | 6 / 8 | `/workbench`、`/de/workbench` |
| 合计 | 24 | 4 种语言 | 51 / 60 | 9 个语言版目录 |

BPJ 原 `/workbench` 改为中文主版本，英文有 `/en/workbench` 独立地址；原工具网址均保留可访问。所有语言页均有对应页切换、自指 canonical、相互返回的 hreflang 和 x-default。中文使用 zh-Hans。不会按 IP 或浏览器强制跳转。未翻译的跨站条目明确标为 English，不生成伪语言页。AGI 与 TDS 的本轮覆盖是已有核心工具语言对，不宣称复制了主站所有次要内容语言。

翻译范围包括工具任务标题、简介、字段、下拉选项、结果标题、列名、方法、限制、保存/导出操作和常见错误。SQL 项目说明与谜题界面有中文。产品名、用户输入、CSV 机器列名、SQL 标识和引用的原文不强行翻译。CSV 继续要求小数点、逗号分隔和 ISO 日期，页面有各语言说明；可视结果通过 Intl 展示当地数字格式，不隐式换汇。输入备份的字段契约不变，旧保存版本仍可加载。

## SEO 与 GEO 的具体变化

- 用任务意图作为标题与 H1，而不是只有陌生产品名；品牌仍保留在页面与适用的 title 中。
- 每页直接输出方法/公式、输入字段、虚构但可复现的结果示例、边界条件与规格来源。无需执行 JavaScript 即可读到这些内容，不向爬虫提供不同正文。
- WebPage、WebApplication、BreadcrumbList 与目录 ItemList 对应可见内容，标注真实语言和免费使用状态。不添加虚构评分、用户数或尚未出售的会员报价。
- 从同一引擎生成各语言 Markdown 镜像和可导入示例 JSON，保留 canonical、方法版本与输入出处。镜像不进入 HTML sitemap。
- 各语言首页与已有相关任务页接到相应工具；相关工具互链仅按任务关系。sitemap 与 llms 索引同步覆盖新语言 URL。
- 发布后再次检查每个正式 canonical，再通过各站既有的公开 IndexNow 验证文件提交本批 60 个页面。仅 push 发布触发，日常兜底部署不重复提交这批页面；第三方接口失败会明确记录，不把接收请求写成已收录。

依据：[Google 多语言版本](https://developers.google.com/search/docs/specialty/international/localized-versions)、[多语言站点管理](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)、[AI features](https://developers.google.com/search/docs/appearance/ai-features)。Google 的 AI 搜索仍使用基础 SEO 要求；没有专用 schema 或 llms.txt 的保证入口。这里的文字镜像是便于读取和复核的交付面，不是引用量承诺。Google 是否索引、AI 是否引用，仍需后续实测。

## 外链：资产和结果分开

20 个表单工具新增独立 HTML 小工具及沙盒 iframe 代码，包含其本地计算引擎、相应语言标签和导出能力，不依赖外部 JS/CDN，不上传访客输入。对应 43 个语言版小工具。原来的谜题嵌入功能保留并补中文。页面提供引用链接、原理说明、可下载输入例子，降低编辑、教师和站长使用及引用成本。

嵌入和署名均自愿，不强制植入关键词外链。不会将自有四站之间的相关链接报告成独立第三方背书。未购买链接、未批量灌目录、未发送邮件或社交私信。**本轮没有可核实的新第三方反向链接数量**；可分发资产不是已经获得外链。

依据：[Google link spam 政策](https://developers.google.com/search/docs/essentials/spam-policies)。下一步应衡量自然引用/引荐与工具使用，而不是把提交数量当成结果。现有营销准备队列更新为 51 个按语言对应的工具草稿，连同原 6 条共 57 条；外发量仍为 0。

## 同步修复与验收

设备回本工具原电价显示只留两位小数，75% 情景的 0.225 被显示成 0.22，虽然计算使用了完整数值，但页面不便复核。本轮改为四位显示，示例明确为 0.2250 × 132 kWh = 29.70。

本轮新增翻译覆盖检查、51 个语言页面的浏览器操作与手机布局检查、德语数字格式检查、4 个语言/站点的独立嵌入操作检查，以及全部语言路由/自指/返回标签/文字镜像/sitemap/资源验收。嵌入操作使用普通按钮，避免沙盒禁止原生表单提交造成点击无结果。

付费与数据边界保持：BPJ 赞助位沿用现有结账；英文入口连接英文投放页。其余工具不新增收费、团队同步或自动监控承诺。不以本次发布测试推算访问量、引用量或营收。

正式工作流、IndexNow 接收状态与最终结果将在实际部署后追加。

## 发布记录（实际验收）

主提交：`b4b33ea50f2fe9af0e08aa4240162bdb51f66f73`。2026-09-19 正式部署。

- BPJ：[35441878012](https://github.com/f-tiger/agi-site/actions/runs/35441878012) 全部成功；8 个语言页面/文字镜像/运行资源通过，IndexNow HTTP 200 接收 8 页；付款链路仍为 `selling:true`、`wallet:true`、`watch_healthy:true`。
- TDS：[35441878002](https://github.com/f-tiger/agi-site/actions/runs/35441878002) 全部成功；8 页通过，IndexNow HTTP 200 接收 8 页。
- Eco：[35441877999](https://github.com/f-tiger/agi-site/actions/runs/35441877999) 全部成功；12 页通过，IndexNow HTTP 200 接收 12 页。
- AGI 首次运行：[35441878041](https://github.com/f-tiger/agi-site/actions/runs/35441878041)。51 个语言版浏览器操作及 4 个独立嵌入检查通过、部署完成，但紧随部署的首页验收读到旧版并失败。随后从当前会话复查全部 32 个正式语言页面、文字镜像与资源均通过。修复提交 `5e8466e571f8a2b5fae8e6f196ba7592b5db2ab2` 在 AGI 流水线增加最多 4 次严格验收重试，间隔 8 秒，未放宽版本或内容断言。

目前已逐项核实全部 60 个正式语言页面可访问并具备正确 canonical 与 hreflang。AGI 修复后的最终工作流和 IndexNow 结果见后续记录；不将第一次失败隐藏为成功。

### 最终验收完成

2026-09-19 12:10 UTC，AGI 修复后的 [35442057049](https://github.com/f-tiger/agi-site/actions/runs/35442057049) 全部成功：51 个语言版操作、4 个嵌入场景再次通过，32 个 AGI 正式语言页面与文字镜像、sitemap、运行资源通过，IndexNow HTTP 200 接收 32 页。

最终合计：四站全部发布成功，24 个工具拥有 51 个语言版工具页面与 9 个语言版目录；60 个 canonical 页面均已通过线上验收并获 IndexNow HTTP 200 接收。搜索引擎实际收录量、AI 引用量和新增独立第三方反链仍未知。测试、提交和自有站互链均不作为这些增长指标或收入证明。
