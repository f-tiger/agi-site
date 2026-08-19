# 免费路线：GA4 + Search Console API 接入（你要做的全部步骤）

内部文档（`content/` 不发布）。代码侧已全部就绪；下面是只有你能做的
Google 控制台操作。全程免费,一个服务账号同时服务两个 API。

**为什么现在做**:Supermetrics 试用 2026-08-02 到期,之后会话内读不到
GA4/GSC。这套接入让每日工作流自己拉数据,不依赖任何付费席位。

---

## 第 1 步:创建服务账号(约 5 分钟)

1. 打开 https://console.cloud.google.com/ ,用 **t***t@gmail.com（完整地址不入公开仓）** 登录
2. 顶部项目选择器 → **New Project** → 名字随意(如 `dollscout-metrics`)→ Create
3. 左侧菜单 → **APIs & Services → Library**,搜索并 **Enable** 这两个:
   - **Google Analytics Data API**
   - **Google Search Console API**
4. **APIs & Services → Credentials → Create Credentials → Service account**
   - 名字随意(如 `metrics-reader`)→ Create and continue → 角色留空(Skip)→ Done
5. 点进刚建的服务账号 → **Keys** 标签 → **Add key → Create new key → JSON** → 下载
6. 记下服务账号的邮箱地址(形如 `metrics-reader@dollscout-metrics.iam.gserviceaccount.com`)

## 第 2 步:授权 GA4(1 分钟)

GA4 后台(analytics.google.com)→ **管理 → 媒体资源访问管理** →
右上角 **+** → 添加用户 → 粘贴服务账号邮箱 → 角色选 **查看者(Viewer)** → 添加。

> 不做这步,API 会返回 403,即使密钥完全正确。

## 第 3 步:授权 Search Console(1 分钟)

https://search.google.com/search-console → 选 **thedollscout.com** 域名属性 →
**设置 → 用户和权限 → 添加用户** → 粘贴同一个服务账号邮箱 →
权限选 **受限(Restricted)** 即可 → 添加。

## 第 4 步:填 GitHub Secrets(2 分钟)

GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**,加两条:

| Name | Value |
|---|---|
| `GA4_PROPERTY_ID` | `547130808` (纯数字。**不是** `G-2SEHFY33H8` —— 那是前端 tag,Data API 不认) |
| `GA4_SERVICE_ACCOUNT_JSON` | 第 1 步下载的 JSON 文件**整个内容**原样粘贴 |

GSC 不需要额外 secret —— 脚本复用同一个密钥,站点地址已内置
(`sc-domain:thedollscout.com`)。

## 第 5 步:验证(1 分钟)

GitHub → **Actions → Record edge traffic → Run workflow**。跑完看 job summary:

- 成功:出现「GA4 — trailing 14 days」和「Search Console — …」两个数据段,
  且 `content/ga4.json`、`content/gsc.json` 被提交
- 失败:summary 会写明缺哪一步(未加 Viewer / API 未启用 / 密钥问题),
  照提示补即可

---

## 完成后自动发生的事(无需再管)

- 每天 06:00 UTC,`traffic.yml` 拉取 边缘流量 + GA4 + GSC 三份数据并提交
- 两天一次的增长循环直接读 `content/*.json` 做分析,不再依赖 MCP
- 任一凭据失效时,job summary 会说明原因,工作流不会报错中断

## 安全注意

- JSON 密钥只进 GitHub Secrets,**不要**提交进仓库、不要发在聊天里
- 服务账号只有两个只读权限(GA4 Viewer / GSC Restricted),泄露的最大
  损失是数据被读,但仍应立即在 Cloud Console → Keys 里作废并重建
