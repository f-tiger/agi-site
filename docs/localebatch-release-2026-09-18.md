# LocaleBatch 发布

Owner 于 2026-09-18 明确要求「推送上线」，替代此前不推送的阶段性边界。

优化后的执行任务：以远端最新 main 为基础，只整合 LocaleBatch 新站和本轮配套研究、情景及校验工具；运行产品与 Cloudflare 打包验证，通过后推送、合并、部署到现有 Cloudflare 账户，并检查公开页面和功能。保留上游改动，不使用其他产品的支付链接或把未验证付费链路开放为可购买。

- 目标地址：https://localebatch.agiscorecard.com
- Cloudflare Worker：`agi-localebatch-pilot`
- 本次公开功能：本地 CSV 检查、固定交互样例、检查报告与审阅导出、导入指南。
- 收费状态：关闭。`SALES_ENABLED=false`、`QUALITY_REVIEWED=false`；未创建付费资源、支付产品或真实模型调用。
- 发布流程：路径过滤的 `.github/workflows/deploy-localebatch.yml`，无新定时构建；分支运行测试和打包，main 才发布。
- DNS 保护：发布前只读检查该 hostname 未被其他 Worker 或 DNS 记录占用；发现冲突即停止。
- 基础版本：`31e06ae3e11f53b00decb65e1a6b1d7bce6878e2`；主仓其他站点和先前独立 PR 不在本次合并中。

23 项产品测试及研究工具检查已在本地通过。GitHub Actions 是本轮 Cloudflare 打包和发布记录的权威来源；不能以 commit 已推送代替部署成功。发布完成后以 workflow 成功和 HTTPS 检查为准。

旧研究报告中「尚未推送/上线」描述的是其成稿时状态；本文件记录本次获得的新授权与发布范围。付费开售仍需要真实外部集成和模型质量验收。
