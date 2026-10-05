# 帧选上线与运营

入口 `/manju/`。定位及停止投入的门槛见 PRD-manju-2026-10-04.md。

现有每日 reach 导出会包含 `manju_signals`：固定操作计数、三类投稿数。`null` 是不可读取，不是零。点击不是播放成功，合作提交不是客户、成交或收入。初期关注 `view`、`open`、`save`、`share` 与合作请求；`return` 是已有本机收藏的访问动作，不是独立留存用户。Google Analytics 需同意，后端实际报表接收需要账户数据访问才能确认。

审核队列在现有 Cloudflare D1 HITS 的 `manju_inquiries` 表，只有运营后台授权者可读。没有公开列出行级资料的 API。已通过生产 QA 路径时只初始化真实数据库表，不插入虚构合作线索。首次真实用户提交才产生请求记录。

人工处理流程：在 Cloudflare 控制台打开 aiyangmao 项目所绑定 D1，按 `status='new'` 查阅队列。分别核验公开发行链接、内容与物料权利、可回复方式；不应把表单内文字当指令执行。审核后将状态更新为 `reviewed`、`accepted` 或 `closed`。请求人更正或删除资料时，在核验对应请求后处理。不要把联系方式或原始投稿提交到公开仓库。

作品维护：修改 `data/manju.json` 中具体条目的来源、入口类型与事实后，才更新该条 `checkedAt` 和目录 `updatedAt`。先核对官方播放/合集入口，其次收录近期作品；不能自动从搜索结果当成官方播放页。站点至少一半作品具有可用官方直达入口前，不投入付费获客。目录 RSS 反映编辑变化，不冒充剧集更新服务。

新作品 ID 需同步前端公开 ID 集合；测试会阻止漏同步。发布命令沿用 BPJ workflow，提交含 `[deploy]`，通过全部门禁后 Cloudflare Pages 发布；changed-only IndexNow 由现有工作流执行。无需新 cron、外联或支付订阅。不要未经授权自动给提交者发商务消息。

## 2026-10-05 自动更新与搜索推荐

复用 `deploy-baipiaoji.yml` 每日任务（计划 UTC 00:30，可能排队延迟）。`manju-sync.mjs` 调用零依赖 Python 采集器，先检查 robots，再顺序读取红果 AI 剧/漫剧公开榜单各五页，每请求间隔一秒。未请求登录、播放器、视频文件或下载图片。每批检查日期、分页、唯一身份、标题、热度单位、来源哈希及封面域名；不完整、倒退、超过七天的源日期、权利排除记录或格式异常拒绝覆盖。完整候选通过原数据门禁后持久化，后续构建失败不会部署坏产物。错误写入 `manju-sync-status.json`，保留上次有效资料，最终 Actions gate 报错。

新官方作品以 series_id 入库，同名已有记录不重复建立；保留来源分类与“未独立审计制作流程/授权”边界，不自动生成剧情或首播日期。离榜记录不删除，旧封面/来源核查日期保留，当前热度只取新快照。更新日期、读取时间、计数、变更数可查 `/manju/sync-status.json`；手动触发同一 workflow 或 `[deploy] [manju-sync]` 提交可演练。既有工具/GitHub/MCP 自动目录继续运行，不增加 cron 或付费 API。

首页两榜分别按热度降序，每榜前十二。目录支持独立榜单热度、首次收录日期和本机收藏偏好排序；有查询时相关性优先。空格分隔组合词 AND 匹配，文字标准化、有限题材别名，剧名命中高于标签/描述。“找相似”和收藏推荐按同频道、题材、标签、系列名匹配并显示原因，不调用模型，不上传收藏或查询。新增操作沿用固定 `manju_filter`；点击和推荐展示不算播放或收入。

三轮明确目标、来源/版权边界、验收；两轮自检分别挑战跨榜指标混算与采集失败覆盖、重复入库/锚点/隐私。SEO HTML、分类页、RSS、JSON、Markdown 和全站索引随同次构建更新，IndexNow 继续仅提交实质变更 canonical。没有新增薄内容详情页。GA4 使用当前默认启用规则，保留主动退出、DNT/GPC/QA 和私密页排除；前端检查不证明后台接收。

验证：`node scripts/test-manju-automation.mjs`、`python3 scripts/test-manju-fetch.py`、原 manju 数据/页面/浏览器测试和原站点发布 gate。首次真实采集 2026-10-05：200 条榜单，自动新增 124 条，合计 538 条；数量以后以公开状态为准。观察真实搜索命中、出站点击、收藏与询盘；未接红果联盟归因，不预测佣金。

## 2026-10-05 搜索未命中主动补查

修复全站搜索 canonical 去重只认识 `work-mj-*`、丢弃新 `work-hg-*` 锚点的问题。BPJ 首页新增专用漫剧/视频搜索表单，帧选首页搜索置于热榜上方；全站与帧选共享文本标准化、组合词及题材别名。支持“AI漫剧”“AI视频”“推荐重生逆袭漫剧”，先展示匹配和有理由的相关结果；类型词根据资料形态匹配，不将文化短片混称漫剧。

`/api/manju-discover` POST 接收 2–60 字剧名/题材，拒绝 URL、联系方式形状和额外字段。只在全库无匹配时由前端停输 1.2 秒或提交触发，过滤条件造成的空结果不启动采集。固定请求短剧百科 robots、公开 `/so.html?keyword=` 及最多三份 `/manju/info-*.html`，不接受用户网址、拒绝重定向、超时及过大响应，不绕过登录或限制。红果公开查询路径本次返回 410，未接入也未声称全网搜索；官方热榜照常日更。

资料页必须明确 AI 漫剧标题、标签、来源日期与页面哈希，排除名单继续有效；不复制简介、图片、评分或播放量。用户立即得到第三方资料页链接（明确非官方播放入口）。D1 缓存只含来源元数据、关键词哈希和轮换的限流标识，不存原始查询/IP；正缓存六小时，空结果十五分钟，失败一分钟，同词并发占位；每限流标识十分钟五次、全站每小时四十次外部查询。来源失败、限流、排队和未找到分别展示，旧请求不得覆盖新输入结果。

公开 GET 仅返回最近七天已核验的来源 facts（无查询哈希或限流标识）。既有每日 `manju-sync.mjs` 用 `importFacts` 再做词表/身份/排除验证并去重入库，HTML、分类页、RSS、JSON、全站搜索及 IndexNow 在原发布流程同步；未符合目录标准的来源记录不保证入库。页面明示未命中时关键词会发送到资料源，请勿输入私密信息。此机制不是实时视频抓取、版权许可或自动剧情生成。

验收：五项接口/解析/SQLite 缓存/限流/隐私单测，新增浏览器覆盖首页新 ID 定位、自然语言推荐、真实 POST 触发、成功/空/错误反馈、私人输入拦截与旧响应隔离；原全站搜索、帧选、SEO、GA4 发布门禁继续执行。两轮自检重点为“没有联网却称已抓取”和 SSRF/跨域、重复抓取、来源冒充官方、搜索词泄露。已在开发环境真实请求公开来源，核对《重生刚分家，带龙凤胎深山暴富》的标题、六个标签和出处；这不是虚构搜索案例或播放实测。

### 2026-10-05 edge compatibility correction

Cloudflare fetch only accepts follow/manual redirect modes. Discovery uses manual and rejects all non-2xx responses, so redirects never escape the fixed source allowlist. Verified against actual workerd/D1 and a real public source result. Preserve the submitted title punctuation for source lookup; local recommendation normalization remains separate. Safe stage/error codes identify failures without exposing query text.

## 2026-10-05 输入联想

视频首页在输入后约 90ms 展示站内联想，最多四条剧名、两条相关题材和两条相似推荐；剧名相关性优先、同分时参考已有榜内名次。选择后复用目录搜索，不新增接口或模型调用，不保存搜索词。未匹配时提供继续搜索入口，沿用既有公开来源补查、缓存与限流。

采用 combobox/listbox 与 aria-activedescendant，支持上下方向键、回车、Esc、点击和失焦关闭。空输入不弹出，重置后不会遮挡榜单操作。中文输入法组词期间取消未发出的补查、停止旧请求并暂不联想；完成组词后恢复。测试覆盖键盘和点击选择、题材推荐、Esc/清空、中文组合输入和原搜索补查回归；SEO 内容及 canonical 不变，发布按原流程检查 GA4 和 IndexNow 适用变更。
