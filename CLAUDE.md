# agi-site — 舰队公开 monorepo 操作手册

**这是公开仓库。** Owner 决定(2026-08-19,原话:「github actions 到期了，重新建4个
站点的公开仓库吧…合并后，我以后统一在这个会话管理N个站点，后面还可以拓展、站点相互
学习进化」+「以后都用这个公开站点吧…不能迁移涉及个人隐私的不要迁移，保障网站能够
运行起来」)。公开仓 Actions 分钟免费 → 2026-08-18 那种「2000 分钟用满、全部定时
任务冻结到月初」的事故从结构上不再发生。

## 布局与权威关系

- `sites/agiscorecard/` · `sites/baipiaoji/` · `sites/getecoback/` · `sites/thedollscout/`
- **每个站点目录内的 CLAUDE.md 是该站的操作手册,全部继续有效**(硬内容规则、
  零编造、防翻炒、各自的部署与数据契约)。本文件只管舰队层。
- 原私有仓(f-tiger/agiscorecard、aitools、rearchfuture、sexweb)= 历史档案。
  **迁移后不要再向它们推送站点内容**——agiscorecard 旧仓的 main 仍连着
  Cloudflare 构建,往那儿推会把线上回滚到旧内容。
- 新站点照同样模式并入:`sites/<domain>/` + 一个 path 过滤的 deploy workflow。

## 公开仓隐私红线(每次提交前自查,违者先撤后查)

1. **owner 个人数字人档案永不入本仓**:owner-identity.md / owner-identity.json /
   owner-trajectory.md 只存在于私有仓 + D1 `owner_identity` 表。deploy workflow
   里有硬门:发现这些文件名直接拒绝部署。
2. **订阅者/用户的邮箱、地址、任何个人身份信息不入库**:D1 里查到的地址在报告与
   日志文档里一律脱敏(首订阅里程碑那行就是脱敏样例)。
3. **token / API key / chatId / USDT 地址不入库**。密钥全部走 GitHub Secrets 或
   Cloudflare Secrets。建仓时已跑关键词审计(邮箱、USDT、私钥块、TG token 形态),
   新增大块内容后照此再跑。

## 部署模型

- push 到 `main` = 发布。deploy workflow 按 `sites/<x>/**` path 过滤,改哪个站
  发哪个站;全部带 `concurrency.cancel-in-progress: true`。
- Cloudflare 凭据在本仓 Secrets:`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
  (owner 2026-08-19 配置)。
- CI 纪律(沿用账号级规矩,免费≠可以滥用外部服务):「每日维护 + 外部副作用」
  (IndexNow、Wayback、赔率快照、爬虫探针)只挂 schedule 绝不挂 push;部署路径上
  只放 正确性校验 + 构建 + 部署 + 部署后自检。
- 公开仓特有注意:仓库 60 天无 push 时 GitHub 会自动停用 schedule。舰队日常
  节奏远高于此;若将来长期暂停,恢复时去 Actions 页手动 re-enable。

## 会话工作方式

- 统一在一个会话管理全舰队:克隆本仓,进对应 `sites/<x>/` 按其 CLAUDE.md 干活,
  合并推送一次(一个会话内多站改动可以合成一次 push——path 过滤会让每个被改站点
  各自部署一次)。
- agiscorecard 的 odds-snapshot.json 契约不变:`agi-odds.yml` 每周一把快照提交进
  `sites/agiscorecard/`,gen_odds.py 原路径读取。
- 站点互相学习(owner 长期指令):跨站移植已验证的模式记进各站自己的日志文档;
  niche 隔离规则不变,跨站链接只在对读者真实相关时加。
