# DollScout — 信任型成人 doll 分销导购站（18+）

纯静态站点（零构建、零依赖），为 Cloudflare Pages 设计。差异化定位：**"买家保护优先"的审计式导购**，而不是又一个产品墙。

## 差异化与病毒钩子（基于竞品 + Reddit 用户原声调研）

调研结论：这个行业最大的痛点是**信任崩坏**（假店盗图、假评论、评论勒索、pay-to-play 的"可信供应商"名单）。本站把"信任"本身做成产品：

| 钩子 | 页面 | 击中的痛点 |
|---|---|---|
| **Scam-Check 10 点防诈自查**（交互评分 + 可分享） | `scam-check.html` | #1 痛点：诈骗/货不对板；反直觉钩子"折扣超 50% 本身就是诈骗信号" |
| **60 秒选型测验**（先问重量再问预算，可分享） | `quiz.html` | #1 买后悔恨：重量；选择瘫痪 |
| **True Cost 真实成本计算器**（全行业没人做） | `cost-calculator.html` | 价格不透明、隐藏成本 |
| **公开的 10 条审核方法论** | `trust.html` | 对"可信名单"的不信任 → E-E-A-T |
| **First-Buyer Checklist 邮件磁铁**（匿名发件） | 首页/各页表单 | 隐私羞耻感 + 复访钩子 |
| 4 篇 SEO 指南（TPE vs 硅胶 / 首购 / 隐私收货 / 保养） | `guides/` | 核心搜索词的信息需求 |

## 变现

- **YourDoll 分销**：全站所有 yourdoll.com 链接自动追加正式 affiliate 参数 `?ref=Edison+Thomas`（现金佣金；`js/config.js` + `js/main.js` 统一处理），并带 `rel="sponsored nofollow"`。旧的 `wlr_ref` 参数属于积分制 Rewards Club，已弃用。
- **Amazon 联盟**：`picks.html` 中的 Amazon 卡片默认隐藏；在 `js/config.js` 填入 `amazonTag` 后自动激活。选品可参考 getecoback.com（注意：调研时该域名在搜索引擎无任何收录，请确认拼写/可用性）。

## 部署到 Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → **Create → Pages → Connect to Git**，选择本仓库、本分支。
2. 构建设置：Framework preset = **None**；Build command 留空；Output directory = `/`（根目录）。
3. 部署完成后得到 `*.pages.dev` 域名；购买域名后在 Pages → Custom domains 绑定即可（Cloudflare 自动配 DNS + SSL）。
4. `_headers` 已配置安全响应头与 RTA 成人内容标记（利于家长过滤软件合规）。

> 注意：Cloudflare Pages 服务成人内容需遵守 Cloudflare 的服务条款（合法成人内容一般允许；建议不要开启 Cloudflare 的一些增值分发服务用于成人媒体。本站为文字导购站，风险很低）。

## 上线后必做（占位项）

- [x] **全局替换域名**：已替换为 `thedollscout.com`（canonical / sitemap / robots）。
- [ ] **邮件订阅**：注册 Buttondown/MailerLite 等，把表单地址填入 `js/config.js` 的 `newsletterAction`（当前为本地演示模式）。
- [ ] **Amazon tag**：Associates 审核通过后填入 `js/config.js` 的 `amazonTag`。
- [x] **产品图**：已自动化。见下方「产品图自动抓取」。
- [ ] **联系邮箱**：trust/legal 页提到"email us"，上线后补一个域名邮箱。
- [ ] 站长工具：提交 sitemap 到 Google Search Console / Bing。

## 产品图自动抓取

产品卡的图片由 `.github/workflows/fetch-photos.yml` 每周一自动刷新（也可在 Actions 页手动触发）：

1. Actions runner 里跑无头 Chromium（`scripts/fetch-photos.mjs`）。yourdoll.com 有机器人防护，普通 HTTP 请求返回 403，必须用真实浏览器；先访问首页让防护 cookie 落地，再进各品类页。
2. 从商品网格提取图片（含懒加载与 srcset 属性），过滤掉 logo/供应商小图，每个商品只取一张。
3. 采纳前用 no-referrer 请求实测图片可被外部加载（防盗链检查），不通就换下一个候选。
4. 结果写入 `js/photos.js`（自动生成，勿手改）与 `scripts/photos.json`（状态），提交后自动重新部署。

容错：抓取失败保留上次的好 URL；图片在访客浏览器加载失败则回退到 `img/*.svg` 原创插画，站点不会出现破图。

要换某张卡的图，改 `scripts/fetch-photos.mjs` 里 `SOURCES` 的搜索词或 `n`（取第几个商品）即可。

## 冷启动营销打法（避免零流量）

1. **SEO 主攻长尾**："sex doll scam check"、"how much does a sex doll really cost"、"tpe vs silicone doll"——工具页天然可获反链。
2. **Reddit/论坛**：不要发广告。在买家求助帖里真诚回答，署名不带链接；个人资料放站点链接。Scam-Check 和 Cost Calculator 是社区愿意自发引用的"公益工具"——这是设计出来的可分享钩子。
3. **数据内容**：每季度发一篇"本季 doll 诈骗手法报告"（素材来自 Trustpilot/论坛公开信息），是天然的外链磁铁。
4. **邮件列表**：唯一自有流量资产。所有工具页都有订阅入口，发件人匿名化（转化关键：这个品类用户极度在意隐私）。
5. **禁止**：买假评论、垃圾外链、隐藏联盟关系——与站点定位自杀式冲突。

## 合规红线（见 CLAUDE.md）

18+ 年龄门；仅成人形态产品（明确拒绝并举报任何未成年外观产品）；全站联盟披露;affiliate 链接 `rel="sponsored"`。
