# Reddit 官方通道 owner 开通清单(2026-09-13,约 5 分钟)

**为什么**:runner 走公开 `.json` 被 Reddit 逐板块 403(2026-09-13 首跑),这是 Reddit 对数据中心 IP 的
边缘拦截。舰队不换 UA 伪装、不换 IP、不走代理。**唯一正规路径是 Reddit Data API + OAuth**:注册一个
应用,雷达用 app-only token 访问 `oauth.reddit.com`,免费档 100 QPM/应用,我们每天约 36 次。

**诚实边界**:免费档限「非商业」用途;雷达读取只用于内部选题与计数,**不转载帖文、不把 Reddit 内容
放进付费包**(包只含派生计数与我们自己的查询字符串)。Reddit 2025 底起新应用可能需人工审核
(Responsible Builder Policy),审核未过就是未过,雷达自动退化为其它源。

## 步骤
1. 用你的 Reddit 账号打开 https://www.reddit.com/prefs/apps → **create another app**。
2. 类型选 **script**;name 填 `agi-site-startup-radar`;description 一句话(内部趋势雷达,只读,不发帖);
   redirect uri 填 `http://localhost:8080`(script 类型必填但不使用)。
3. 建好后看到 **client id**(app 名下方的一串)与 **secret**。
4. GitHub 仓库 `f-tiger/agi-site` → Settings → Secrets and variables → Actions → New repository secret:
   - `REDDIT_CLIENT_ID` = client id
   - `REDDIT_CLIENT_SECRET` = secret
5. 手动跑一次 **Fleet US trends trigger** 工作流(Actions → 该 workflow → Run workflow),
   然后看 `data/startup-radar.json` 的 `reddit_access`:`oauth` = 通了;`oauth-failed HTTP 401` = id/secret 错;
   `oauth-failed HTTP 403` = 应用未获批准。**不要把 id/secret 写进仓库或聊天。**

## 若你决定不注册
什么都不用做。雷达已接入两个明确允许自动访问的「求做」源(Software Recommendations Stack Exchange 官方 API、
Bluesky 公开搜索)+ Ask HN,Reddit 那一路按预登记规则 14 天 403 后自动停。
