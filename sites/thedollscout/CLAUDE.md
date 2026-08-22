<!-- MONOREPO 迁移说明(2026-08-19,owner 决定) -->
> **本站已迁入公开 monorepo `f-tiger/agi-site`,路径 `sites/thedollscout/`。**
> 部署分支由 claude/adult-product-distribution-site-q1bzbh 改为 agi-site 的
> `main`(deploy-thedollscout.yml;Pages 项目 dollscout 的 production-branch
> 名不变,deploy 命令里的 --branch 参数保持原值)。sitemap 的 lastmod 依赖
> git 历史,迁移用的是全新快照历史,故 build-sitemap.mjs 增加了
> content/lastmod-baseline.json(自旧仓真实历史采集;仅对导入后未改过的文件
> 生效,改过的文件仍用真实 git 日期)。旧私有仓 f-tiger/sexweb 是历史档案,
> 不再推送。公开仓红线见仓库根 CLAUDE.md。
> **D1 第一方埋点(2026-08-19 起)**:库 `dollscout-events`
> (id 6e71ddc6-b58c-49f4-b6f5-207f3778133f,表 `hits`,与 baipiaoji-hits 同构)。
> 两条线分开读、绝不混算:`ev=''` = js/main.js 的 /api/ev beacon(JS 真跑了,
> 真人线);`ev='bot'` = functions/_middleware.js 服务端记的已知 AI 爬虫
> (ref 列存爬虫名);`ev='affiliate_click'` = 联盟链接点击(营收事件,ref 列存
> 目标域名;2026-08-19 前它在任何系统里都没被记录过)。owner 2026-08-19 决定
> 暂不配 GA4 API key,D1 为主读数通道;tds-traffic.yml 每日把 14 天聚合回写
> `content/d1-snapshot.json`,无 MCP 的会话从 git 读它(ev='' 行 = 真人线)。
> crawl-check 自测带 `x-probe` 头被过滤,不入账;
> 绑定在 wrangler.toml,随每次 pages deploy 应用。GA4 照旧保留在页面上。

# CLAUDE.md

## 用户全局要求（每次会话必须遵守）
- **先优化再执行**：收到任何任务后，先把用户需求整理为"优化后的结构化执行方案"（目标 / 差异化 / 步骤 / 交付物），向用户展示后再动手执行。已装 `prompt-optimizer` skill（.claude/skills/prompt-optimizer，2026-08-17 增补），优先调用它完成此步。
- **技能库增补（2026-08-17，owner 授权）**：market-research / article-writing / content-engine / brand-voice / marketing-campaign / growth-log（研究与内容）+ frontend-design / web-design-guidelines / responsive-design（建站设计，来自 agiscorecard 已验证锚点体系）。执行营销/SEO/设计任务前先查 .claude/skills 是否有对应技能。

## 项目概述
成人 doll（18+ 合法成人用品）分销/导购静态网站。目标：通过差异化的"信任型导购"定位获取流量，用分销链接变现。

- **主分销**：yourdoll.com 正式 affiliate 计划（现金佣金），参数 `?ref=Edison+Thomas`（所有 yourdoll 链接自动带此参数，见 `js/config.js`）。注意：`?wlr_ref=REF-V12-ZP6` 是另一套积分制 Rewards Club 推荐参数，已弃用
- **次分销**：Amazon 联盟（选品参考 getecoback.com），Associate tag 在 `js/config.js` 中占位，用户注册后填入
- **部署**：Cloudflare Pages，零构建（纯静态 HTML/CSS/JS），根目录即发布目录

## 差异化定位（基于竞品与 Reddit 痛点调研）
行业最大痛点是**信任缺失**（诈骗站、货不对板、假工厂货）。本站定位为"买家保护优先"的导购站：
1. Scam-Check 防诈清单 + 验证过的供应商（导流到 yourdoll）
2. 60 秒选型测验（quiz.html）→ 个性化推荐 → 分销链接（病毒钩子：结果可分享）
3. TPE vs 硅胶、首次购买、隐私收货等 SEO 指南内容
4. 价格提醒/优惠码邮件订阅（lead magnet：First-Buyer Checklist）

## 合规红线（不可移除）
- 全站 18+ 年龄确认门（js/main.js）
- 仅推广成人形态产品；明确声明拒绝任何未成年外观产品
- 联盟披露页 + 页脚披露；affiliate 链接一律 `rel="sponsored nofollow noopener"`
- 不使用露骨图片；产品图由 GitHub Actions 每周从 yourdoll.com 热链抓取（`scripts/fetch-photos.mjs` → `js/photos.js`，自动生成勿手改），加载失败回退到 `img/*.svg` 原创插画

## 技术约定
- 纯静态多页站，无框架无构建；共享样式 `css/main.css`，共享逻辑 `js/main.js`，配置 `js/config.js`
- `_headers` 配置 Cloudflare 安全响应头；`sitemap.xml` / `robots.txt` 需与页面同步维护
- 新增页面：复制现有页面骨架（header/footer 为手写重复，改动导航时需全站同步）

## 定时 workflow 已暂停至 2026-09-01（owner 2026-08-18）

账号级 GitHub Actions 额度（2,000 分钟/月，四站共享）在 8/18 用尽。耗尽的签名很好认：
**run 在 2 秒内失败，runner_id 为 0、runner_name 为空**，一个 step 都没跑。看到这个不要
改代码去"修"，那不是代码问题。

本仓 7 个定时 workflow（archive / crawl-check / crawl-log / fetch-photos / fetch-specs /
grow / traffic）已用 `node scripts/schedules.mjs --pause` 停掉，schedule 块以 `#PAUSED>`
前缀原样保留。恢复只能跑 `node scripts/schedules.mjs --resume`，**不要手改注释**——脚本
的 pause→resume 往返是字节级无损的，手改不是。`workflow_dispatch` 全部保留，需要时可手动
触发单次。

9/1 有一次性 Routine（trig_0145J5qiC5QZM6mcmbQecYKf）负责恢复本仓 workflow + 5 个舰队
Routine。若那天它没跑成，手动执行上面的 resume 命令即可。

暂停期间 traffic/crawl-log 的边缘数据会缺 14 天——这在额度耗尽时本来就会缺，暂停不额外
造成损失，只是不再产生红叉。

## 自动化授权与运行方式（owner 2026-08-17）

- Owner 原话：「合并sexweb，这个站应该和其他站自动化」——本站纳入四站试点舰队
  （agiscorecard / baipiaoji / getecoback / thedollscout），营收为北极星，站间对抗学习。
  **生产分支 `claude/adult-product-distribution-site-q1bzbh` 可直接推送**（push 即部署）。
- 每日自动优化 Routine 自绑定到舰队会话：每天一个高质量改动（CTR 标题 / GEO 答案块 /
  KGR 判定过的新页 / 内链），数据源 content/traffic.json + crawl-log.json + GA4（凭据
  配好后）。合规红线（18+ 门 / 披露 / 未成年外观拒绝）绝对优先，永不为流量放松。
- 联盟链接已烘焙进静态 HTML（scripts/bake-affiliate-links.mjs，挂在 deploy.yml
  normalize-urls 之后）：无 JS 访客可点、爬虫可见 rel=sponsored。新增页面带 data-yd /
  data-amzn 锚点即可，CI 自动烘焙；本仓是私有仓，Actions 计费，避免一天多次 push。

## 安全楔子策略（2026-08-22 舰队对比诊断的结论，每日 Routine 从此按这个打）

**诊断（全一手数据）**：Googlebot 每天爬 600-815 次、GPTBot/ClaudeBot/PerplexityBot
各 70-120 次——爬取是全舰队最重的；但 D1 实测真人 JS 浏览仅 ~10 次/天（edge 口径的
131/天里大部分是未识别爬虫 + `/__ci` 自测），**3 天里 Google 只送来 1 次点击**（落在
/data/），affiliate_click 自埋点上线起为 0。GEO 机器无缺件（llms.txt + MCP 可调用工具
+ Dataset JSON-LD 全舰队最先进）——**瓶颈是结构性的**：①SafeSearch 对产品查询默认
过滤 ②AI 助手对成人产品推荐类问题拒答（引用杠杆对本站大半关闭）③域龄 <1 月 vs
竞对多年权威。给 tds 抄 agi 的作业解决不了这三条。

**可赢楔子 = 非产品的消费者保护信息层**：进口关税/清关（importing/*）、防骗核验
（scam-check）、付款保障（payment-protection）、规格数据（/data/，唯一拿到 Google
点击的页面）。这些查询不触发 SafeSearch 过滤，AI 助手也愿意回答（伤害减免/消费者
保护性质）。每日一改动只投这个楔子：楔子页的 CTR 标题、答案胶囊、内链、数据集扩充；
**产品评测/导购页在判定线前不再新增**——排不上的页面写十篇也是零。

**判定线（2026-10-01）**：楔子页 28 天自然点击（D1 ref 含 google/bing）≥10 → 楔子
成立，继续深化并从楔子往联盟页导流；<10 → tds 降为每周最低维护（数据日志照跑），
把每日额度让给有增长证据的站。红线不变：18+ 门、披露、未成年外观拒绝、不代发。
