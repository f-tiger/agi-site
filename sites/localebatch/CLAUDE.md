# localebatch.agiscorecard.com — LocaleBatch 操作手册(2026-09-18 上线;本骨架 2026-09-21 补)

**本文件是骨架,不是站规。** 产品范围、定价假设(€19/批,含税外)、「不是什么」以 `README.md`
与 `docs/localebatch-release-2026-09-18.md` 为准;owner 授权原话见舰队 CLAUDE.md 顶部
(「Owner 已授权推送上线…支付、模型质量及后台任务未完成真实验收前保持收费关闭」)。
**付费处理关闭(`SALES_ENABLED=false`,部署冒烟断言);免费 CSV 检查在浏览器里跑,不上传。**

## 机器结构(照实记,改了要同步)
- 一个 Worker(`agi-localebatch-pilot`),单主机 `localebatch.agiscorecard.com`;`src/worker.mjs`。
- D1:`jobs`(只有付费处理打开后才可能有行)+ `rate_limits`;API `/api/jobs` · `/api/webhook`
  (Stripe,未配置即 503)· `/api/config` · `/api/v…`。**不记录任何访问事件**——没有 page_view、
  没有 opt-in 计数、没有 `/api/pulse`。这是 09-18 发布时的形态,不是漏埋点;后果写在判定线里。
- 部署:`deploy-localebatch.yml`(push 到 main 或 `codex/localebatch-launch-2026-09-18`,path 含
  `tools/discovery/**`)。闸门 = 搜索发现页构建校验 + 产品检查 + 离线 review 构建 + wrangler 校验 +
  主机归属;部署后 `scripts/smoke.mjs`(公开页 + 收费关闭状态)+ `tools/discovery/live.mjs`
  (搜索页校验 + IndexNow 一次)。**2026-09-21 起守卫改为舰队标准形态**(此前 `checkout --detach`)。

## 舰队仪器(2026-09-21 接入)
- heartbeat 探活 + 超 7 天未部署自动重发;`ai_access_probe.py` 首读 09-21 全 200;
  `sitemap_guard.py`(4 条 loc,0 重定向);`page_patterns.py` 周矩阵。
- **不在 `ai_referrals.py` / `traffic_sources.py`**:站上没有任何访问读数可读。
  `tools/discovery/audit.py`(随 venture-lab 部署跑,只打印到 /tmp,不落库)也探本站,但那是
  可达性,不是读者。

## 判定线(2026-09-21 补登 `localebatch-readout-1016`)
- 10-16 前「真实模型与支付端验收」完成(付费打开)或出现 ≥1 条一手读数(首个 job 行 /
  搜索·AI 引荐 / owner 收到询问)。**否则:站上没有能判需求的读数,不得据此判「没人要」**;
  并入 venture-lab 组合决策线,不再单独扩建,直到 owner 决定加 opt-in 计数(同 venture-lab 形态)
  或打开付费。
