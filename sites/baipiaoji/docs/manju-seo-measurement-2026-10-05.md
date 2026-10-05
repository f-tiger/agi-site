# 帧选搜索发现与测量（2026-10-05）

目标：让搜索引擎和 AI 读取有来源、日期和明确指标口径的目录，让运营能区分搜索、联想、推荐与公开资料补查效果。服务中国观众和创作者；免费发现与选题工具继续免费，当前无推广佣金，不把点击算收入。

## 内容与发现

首页 H1 明确 AI 漫剧与短剧推荐；CollectionPage 包含目录条数和实际资料核查日期。缺少面包屑的子页增加 BreadcrumbList。页脚直达 Markdown 目录和榜单证据，保留 JSON、RSS、来源与指南 FAQ。llms.txt 官方榜单摘要从真实 cohort 数据生成，不再硬编码日期和条数。热度不等于播放量，未收录视频文件不声明 VideoObject。沿用 canonical、站点地图和发布时 IndexNow 实质变化提交；提交成功不代表已收录或获得 AI 引用。

## 事件口径

GA4 使用已有 BPJ 属性 G-H79D948F4Z。新增固定动作：

- search_start：每次页面访问首次有效搜索交互；search_submit：提交动作，可重复。
- search_results / search_empty：输入停顿 500 ms 或提交后的结果状态，相同查询与状态去重；不是独立访客数。
- suggest_view / suggest_select：看到联想列表／选择联想；同词反复聚焦不重复计展示。
- recommend_select：点击相关推荐。
- discover_start：一次公开来源补查开始，内部轮询不重复计开始。
- discover_found / discover_empty / discover_error / discover_limited：补查有资料／无资料／错误／限流。取消或过时响应不计完成。
- discover_cached：命中近期缓存的附加标记，同时仍有 found/empty；不可相加当人数。

仅发送固定事件名、公开页面信息；D1 只收固定动作与已知目录 ID。不把搜索原文、联想标题或联系方式送到分析服务。实际补查接口仍须接收用户输入的查询才能完成其功能。保留已保存的退出偏好、QA、webdriver、DNT、GPC 和私有页面排除。第一方计数与 GA4 独立，不混算用户。

## 验证边界

浏览器测试拦截 Google 传输与 API，检查实际搜索交互到隔离 frame 的事件队列、固定属性和隐私边界，不制造线上访问或客户线索。发布后另跑线上覆盖检查。

GA4 后台独立验收暂不可用：GSC Wizard 返回订阅到期 payment_required；Windsor 两次请求仍返回认证重试，未取得报表。未购买服务。前端通过不能证明 Google 后台已经接收、处理或显示真实事件。
