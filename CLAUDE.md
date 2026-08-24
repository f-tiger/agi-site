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

## 台账口径(2026-08-23,owner:「台账带上联盟点击等关键订阅或者营收数据」)

每次报告的诚实台账从「订阅 X/5、营收 0」升级为**钱线仪表盘**,数据一律 D1 现查
(28 天窗),按站列:订阅(agi subscribers + bpj subs 真实行,CI/unsub 行剔除,
bpj 的 src=/__ci 是已知自测)、eco affiliate_click、bpj go(出站联盟点击)、
SR pick_open/out_click/calc_use、gridlings play/solve/subs、audits 询单、
invest_tool_click、tds affiliate_click(D1 hits 表 ev 列;链路 2026-08-19 上线,
08-24 复核通过:ev='' 的 JS 真人 pv 每日落库证明管道活着,affiliate_click=0 是
真没人点、不是测不到——别再把它记成盲区)。**联盟归属现况**(变现的前提,悬置项必须每次带出):
- amazon.de tag=**getecoback-21**(eco 全站+SR 新页,1,875 处)——**P0 悬置:
  PartnerNet 账号归属未经 owner 确认**,未确认前所有点击分文不进;
- amazon.com tag=**ecoback0d-20**(tds,美国站格式)——归属同样待 owner 确认。
里程碑口径:舰队订阅计数 = agi 真实 subscribers + bpj 真实 subs(2026-08-23 起;
当日 bpj 首个真实订阅 kon***@gmail.com 经脱敏核验,舰队 3/5)。

## 子域/板块开设铁律(2026-08-23,owner 问「是否要建新子域/独立板块」后定)

现有管理面已宽:主域 agiscorecard.com + 四个伞域子域(invest./compass./source./
play.)+ 三个外部站(baipiaoji/getecoback/thedollscout)。实测教训:引用份额
(33-37.5%)全部长在**主域**的判定页上;新子域从零权威起步。因此:
- **默认动作 = 并入最近的现有域/板块**。判定型内容一律进主域集群(invest/
  Research);工具优先挂现有站。
- **开新子域必须三条全满足**:①独立 Worker/技术形态确需隔离 ②受众与品牌和
  现有站完全不同 ③自带独立变现闭环。先例 play.(游戏,三条全中)是标尺;
  差一条都不开。
- 主域内新「板块」的门槛 = 该方向出现**首个真实转化**(如 /audits 首询单)后
  才提权为一级导航,此前只以页面/chip 存在。

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
