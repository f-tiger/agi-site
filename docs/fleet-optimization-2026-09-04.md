# 舰队站点技术优化 — 2026-09-04

owner 指令：「优化整个舰队站点」。同日上午已做过一次体检（`fleet-checkup-2026-09-04.md`，
只修 Routine/部署机制）；本轮是**逐站技术层审计 + 修复**，方法：8 个站各跑一遍只读审计
（部署链、技术 SEO、坏链、性能、埋点、构建脚本），再按站修。**零内容改动、零新页**——
各站防翻炒窗与硬内容规则全部保留；唯一例外记在 agiscorecard 节。

## 一、跨站共性发现（这四类在多个站重复出现，比任何单站 bug 都值钱）

1. **「不可能失败」的自检**。agi `/api/trends` 断言匹配任何含 `"` 的响应（catch 分支回的
   空 JSON 也过）；tds 49 条 200 断言在 wrangler 误发 preview 时全能被上一版生产满足；
   bpj 信标自测只打印状态码不断言；goldrush 自检失败只 `::warning`；buysomething `/api/pop`
   的 catch 返回形状完美的 200 JSON，D1 断了也测不出。**修法统一：断言事故的形状 +
   给降级路径一个可辨的标记（`ok:true` / `degraded:true` / 构建戳）。**
2. **静默跳过的门**。bpj `guard-regression.mjs` 自并舰以来 `git show HEAD:data/tools.json`
   路径失效，打印「跳过」exit 0；bpj 坏链门只看 70,421 条链接里的 4 条（build 输出绝对
   URL，门只认 `/` 开头）；agi `validate.py` 的 sitemap 检查跳过所有含 `/` 的 URL（56%）；
   eco `check_adlabel.py` 是 9 个块名的白名单，3 个带联盟链接的块从未被检查（78 页无
   Werbekennzeichnung）。**门必须偶尔能红，否则它在说谎。**
3. **未知事件名被写成真人 pv**。tds `ev.js`、bpj `hit.js` 都是 `ALLOWED.has(e) ? e : ''`，
   而 `''` 正是 JS 真人 pv 桶——拼错的事件名不是丢失，是冒充成页面浏览。两处改为丢弃。
4. **自测/扫描器冒充需求**（舰队第四次）。heartbeat 探 goldrush 落了 25 条 `other` pv；
   goldrush/gridlings 的 uaClass 把带 Mozilla 的整站一秒扫完的扫描器算「human」；
   gamesledger 的 `embed_copy` 在每次 badge 图片被拉取时触发（≈ pv，不是嵌入）。

## 二、按站清单（修了什么 / 为什么 / 没修什么）

### agiscorecard
- 20 个工作文件（CLAUDE.md、OPT-LOG.md、analytics-notes.md…，含全舰队 6 个 D1 database_id）
  此前作为公开资产被服务；robots.txt 给 GPTBot/ClaudeBot 等各自只含 `Allow: /` 的组，按
  REP 它们永远看不到 `*` 组的 Disallow。→ `.assetsignore`（robots.txt 未动，保持对 AI 爬虫开放）。
- 自检：`/api/trends` 断言 `"ok":true`；新增首页含 `/api/e`（HTMLRewriter 注入信标的唯一线上证据）。
- 4 页 GA4 属性错写成 `G-B3PN0PLGTG`（含 zh/situational-awareness-summary，主站 42% 引用页的中文镜像）→ 修回。
- `?pick=` 深链事件在解析期触发，早于边缘注入的 gtag 包装器，D1 收不到 → DOMContentLoaded；
  cn 页 `viz_switch` 初始加载就发 → `if(byUser)`。
- `check_hreflang.py` 存在但未接入，main 上 20 处失败 → 修 10 页并接入 deploy。
  **例外记录**：does-copying-13f-work 两页在 5 轮防翻炒窗内，只改了 hreflang 属性（`zh`→`zh-Hans` + x-default），未动一字正文。
- validate.py 两个空转检查补成真检查（今日 0 问题，纯棘轮）；`/share` `/badge` 7 天缓存（写在 worker，`_headers` 在 run_worker_first 下无效）；search-index 的 two-year-scorecard 路径与 canonical 一致。
- **刻意不做**：179 页的 Google Fonts 阻塞样式表、173 页 595 KB 重复内联 CSS、105 页缺 BreadcrumbList——都要一次改百页，撞防翻炒；记录数字，不动。

### baipiaoji
- guard-regression 路径修复并纳入汇总门；坏链门 href+src 全查（已校准 0 误报，注入坏链能红）；修掉 5 条真死链。
- 18.8 KB 内联脚本 × 1,545 页外置 `/bpj.js`（整站 HTML 字节 −42%）。**副作用一次性**：下次构建 page-lastmod 全站标「今日变更」，IndexNow 推一次全量。
- `assets/_headers`：数据文件 CORS（MCP 早已 ACAO:*，它指向的文件此前没有）+ 静态缓存；
  hit.js 未知事件丢弃；/api/limits 的 path 去查询串（无界基数）、404 分支也计数。
- 部署链：信标自测断言 204、退订断言 `code:done`、dispatch/中间件自测 `continue-on-error` 并纳入汇总门、首个 commit 步补 `pull --rebase`。
- **未动**：`traffic-snapshot.json` 从未成功导出属 owner 侧 token 权限，已在 workflow 注释里诊断，不重复修。

### thedollscout
- D1 `lang` 列写死 `'en'` → 按路径 de/zh/th/en（历史行可按 path 回溯）；未知事件丢弃。
- `wrangler.toml`（含 D1 database_id）此前随 dist 发布 → 排除。
- 自检加构建戳（`dist/__build.txt` = SHA）；IndexNow key 文件进自检；key 单一来源。
- legal/* 与 404 零埋点 → 补三件套；5 个工具的 use 事件同步进 GA4；analytics.js 的 location 维度 4 个旧站选择器 0 命中 → 改现存类名；`/css /js /img` 缓存头；MCP 发现面数据集 3→4；结构化数据门去两处静默跳过；tds-traffic 不再 `rm` 已跟踪快照。
- **未动**：32 页 description 超长（生成页要改生成器，属文案）。

### gridlings / goldrush
- **goldrush JS 信标结论：没坏，零是真零**——五页、路由、白名单、`ua_class='js'` 写入、线上代码、08-29 一条真人 fork_click 走通同路径，全部核实。D1 里 186 条「human」是扫描器。09-30 绊线按 0 结算。
- gridlings `sw.js` gl-v1→gl-v2（08-27 Star Battle 区域线 CSS 重写从未 bump，回访 PWA 读者拿到看不清区域的旧棋盘）；SW 只缓存 ok 响应；butler 步骤不再阻断部署；冒烟加 `/zh/*.ext` 回退分支；文件门补 4 个加载器；包构建信标改写兼容双引号。
- goldrush `/grader.html` 一直 307 到 `/grader` → 全站统一；自检改真断言；MCP 自取与 heartbeat 带 `?ci=1`；fetchlog/schema 进计数。

### buysomething / gamesledger / x-poster（此前无部署后自检的三条）
- 三条流水线补上自检；数据回写步 `continue-on-error`（rebase 冲突此前会让 Deploy 根本不跑）。
- buysomething：`/sourcing-margins` 的出站点击用 `fetch` 无 keepalive，卸载时被中止 → sendBeacon（09-28 判定线此前会机械地读 0）；`/api/pop` 降级带 `degraded:true`；`/e` 同源校验；静态 css/js 缓存 1 天、JSON 10 分钟。
- gamesledger：空账本此前可绿（gate 只要 ≥2 页）→ 断言 ≥14 判定页且数据文件缺失即失败；IndexNow 移到部署后；`share_click` 此前无任何触发点 → 补 5 处；`embed_copy` 改为真嵌入片段点击，服务端改名 `badge_serve`（CLAUDE.md 已记日期）；quiz 在池加载前点 Start 会发 0/0 的 `quiz_done` → 修；page_view 只记 200；Steam 抓取加超时；**顺手发现并修了生成页的 JS 语法错误**（Python 非 raw 串里的 `\'` 输出成裸引号，首页 live-check 与整个 quiz 页 IIFE 此前根本不能运行）。
- x-poster：线程发到一半失败会从第一条重发（最多 3 次）→ 逐条进度落 STATE 续发；失败只 warning → 402/429 以外 exit 1（接回 GitHub 邮件这条唯一不经 AI 的告警链）；密钥 `<<<` 带换行 → `printf %s |`；加 `package.json` type=module；加 `/status` 自检（不发真 key）。

### getecoback
（见下节，随其实施代理结果补记。）

## 三、验证方式与未验证项

- 本地：tds 4 门、bpj 全量构建 + verify-dist（暂存目录，未污染 page-lastmod）、agi validate/check_hreflang、所有 worker/脚本 `node --check` / `py_compile`、8 条 workflow YAML 解析。
- **未验证**：线上自检要等合并到 main 后各站部署才跑——沙箱够不到生产。任何一条新断言若在首次部署时红了，先看是断言写错还是真问题，别直接删断言。
- bpj 的 push 部署需要提交信息含 `[deploy]`（本轮提交已带）；合并方式若是 squash/merge，请确保最终落 main 的提交信息也带，否则等次日 00:30 UTC 的 schedule。

## 四、owner 需要知道的两件事

1. agiscorecard 的 `.assetsignore` 变更是部署配置变更（站内手册要求「推后验证，失败即回滚」）：合并后看一眼 deploy-agiscorecard 的 run 与 `https://agiscorecard.com/CLAUDE.md` 是否 404。
2. gamesledger 的 `embed_copy` 历史行不可与今后对比；goldrush 09-30 绊线的 0 是真 0，不是仪器故障。
