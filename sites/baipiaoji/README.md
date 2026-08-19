# 🆓 白嫖计 — 教想赚钱的人真正上手 AI

> 别人卖你「月入过万」的课，我们免费给你作业，并且明说大多数人为什么失败。

基于真实用户需求调研（[docs/research.md](docs/research.md)、[docs/user-research.md](docs/user-research.md)、[docs/competitor-research-money.md](docs/competitor-research-money.md)）选定的垂直赛道，站点是**四层阶梯**：

```
想赚钱  →  赚钱作业  →  0 元方案  →  免费工具
 人群      /money/      /plans/       /tools/
```

差异化只有一条，且是结构性的：**每条福利都标注核实日期、每天自动巡检；每份赚钱作业都写明多数人为什么失败、这条路上的骗局长什么样。**
靠卖课赚钱的同行说不出后半句——说了就杀死自己的转化，所以抄不走。

中文在根路径，英文在 `/en/`。

## 快速开始

```bash
npm run build     # 生成静态站到 dist/（零依赖，只需 Node 18+）
npm run verify    # 手动跑一次链接巡检（CI 每天自动跑）
npm run preview   # 本地预览 dist/
```

## 项目结构

```
data/hustles.json     # 赚钱作业（顶层入口，内容底线见 docs/competitor-research-money.md）
data/solutions.json   # 0 元方案（按痛点组织，作业的执行零件）
data/tools.json       # 工具福利数据
data/site.json        # 站点配置（名称、域名、GA4、联盟/订阅/推广位）
data/i18n/en.json     # 英文覆盖层，缺哪条回落中文
data/backlog.json     # 选题积压（由增长闭环从真实搜索词产出）
scripts/build.mjs     # 静态站生成器（多语言 × 首页/作业/方案/工具/分类 + sitemap/robots/RSS/llms.txt）
scripts/verify.mjs    # 链接巡检，自动刷新 last_verified，产出 health.json
scripts/ga4.mjs       # 零依赖 GA4 Data API 客户端（凭据缺失即降级，不让流水线失败）
scripts/growth-loop.mjs  # 每两天的增长闭环：取数 → 可逆优化 → 待办 → 报告
scripts/yt-ingest.mjs    # YouTube 选题采集（只找选题，不写正文；需 YOUTUBE_API_KEY）
scripts/ga4-setup.mjs    # GA4 一键配置与体检：验凭据 → 自动建 8 个自定义维度 → 取数验收
assets/style.css      # 样式（自适应深色模式）
.github/workflows/daily-update.yml  # 每天一次：巡检 → 提交 → 构建 → 部署（推送时只构建部署，不巡检）
.github/workflows/growth-loop.yml   # 每两天 09:00：增长闭环
.github/workflows/ga4-setup.yml     # 手动：GA4 配置体检与建维度
```

## 全自动化说明

- **每天一次**（cron 设在北京时间 08:30，但 GitHub 的定时任务实测延迟 3–4 小时，通常在上午跑完），GitHub Actions 自动巡检全部工具链接：可达的刷新核实日期并自动提交；不可达的写入 `data/health.json` 待复核。
- 巡检后自动重建并部署到 **Cloudflare Pages**（项目 `aiyangmao`，依赖仓库 Secret `CLOUDFLARE_API_TOKEN`），并自动确保自定义域名 `baipiaoji.com` / `www.baipiaoji.com` 已绑定。
- **每两天北京时间 09:00**，增长闭环从 GA4 取数，按真实点击重排推荐位、把真实搜索词回填进方案关键词、产出选题待办与报告（见 [docs/growth-loop.md](docs/growth-loop.md)）。
- 推送到默认分支（及 `claude/**` 分支）也会触发即时构建部署。
- 线上地址：https://baipiaoji.com （回退地址 https://aiyangmao.pages.dev）

### 自动化的边界（写死，不商量）

自动化只做**可逆、不需要判断**的事：重排推荐位、回填关键词、生成报告与待办。
**绝不**自动增删工具、改写福利描述、生成任何作业或方案正文。
理由很简单：这个站唯一别人抄不动的东西是「每条都核实过」，一旦自动化开始产出没核实的内容，差异化当场归零。

## 变现配置（`data/site.json`）

| 字段 | 用途 |
|---|---|
| `tools.json` 中每条的 `affiliate` | 填入联盟/邀请链接后，"领福利"按钮自动指向它（否则用官网+utm） |
| `sponsor` | 首页"本周推荐"付费推广位（参考 Futurepedia 模式） |
| `subscribe_action` | 填入邮件服务（Buttondown/MailerLite 等）的表单端点即启用订阅框 |
| `contact_email` | 商务合作邮箱，显示在页脚与推广位 |
| `base_url` | 绑定自有域名后修改此处 |

## 内容底线（赚钱板块）

| 规则 | 为什么 |
|---|---|
| 不承诺收入数字 | 承诺收入是这个品类所有骗局的共同起手式 |
| 每份作业写明失败原因 | 只讲成功案例就是幸存者偏差，等于骗人 |
| 每份作业写明骗局长什么样 | 用户真正缺的是识别能力，不是又一份「玩法」 |
| 只用站内已核实的免费工具 | 全程 0 元才能验证，要花钱的路子我们核实不了 |

## 剩余可选人工步骤

1. 注册各工具的联盟/邀请计划，回填 `tools.json` 的 `affiliate` 字段。
2. 接入邮件订阅服务，填写 `site.json` 的 `subscribe_action` 与 `contact_email`。
3. 配 GA4 取数：填 `GA4_PROPERTY_ID` 与 `GA4_SERVICE_ACCOUNT_JSON` 两个 Secret，然后到 Actions 跑一次 **GA4 setup**——维度会自动建好并当场验收。详见 [docs/growth-loop.md](docs/growth-loop.md)。
4. 需要 YouTube 选题时配 `YOUTUBE_API_KEY`；作业正文仍然人工写。

## 数据说明

种子数据基于 2026-07 调研整理，免费额度政策随时可能变化；巡检脚本保证链接有效性，**额度细节请以官方页面为准**（站内已作声明）。
