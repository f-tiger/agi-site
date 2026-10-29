# BPJ免费发布与收款验收解耦

Owner要求优化会员未就绪阻断免费页发布的问题。三轮任务优化：明确免费发布与支付可用性两种结果；保留失败信号及账户安全门禁；通过隔离job和反向测试验收。

两轮对抗自检：不能用continue-on-error或ready强制true把支付故障改绿；不能用always无条件提交索引而绕过静态/线上检查。现将只读发布中的支付检查放到依赖免费发布成功的独立membership-readiness job，失败继续红色；核心发布保留account-only、所有浏览器/GA4/安全/线上工具检查、IndexNow和清单回写。常规部署、付款校验与watcher未放宽。

根因边界：/api/member HTTP200、ok=true、ready=false，不公开具体前提。代码要求会员启用、有效网络/配置、Web3及会员健康心跳、金额边界；心跳有效期四小时。现有watcher每两小时运行。不能仅从ready=false认定是哪一项，更不能刷新时间或开关掩盖失败。本变更不修改支付配置、不发订单、不执行转账、不授予会员。

新检查输出仅固定状态ready/not_ready/unavailable，不输出原响应、凭据、钱包或客户信息。免费发布job成功不代表整体支付健康；独立支付job失败会使workflow仍显示失败，其摘要注明免费页已完成。既有定时watcher仍负责真实链路维护。

验证：模拟ready=false/错误站点/HTTP失败/非布尔/网络失败；验证核心job不执行支付可用性检查，独立检查仍失败。上线使用当前main的新发布，禁止重跑旧workflow。

线上复核补充：verify-studio-live也强制要求ready=true。只读发布改为验证ok/site/ready布尔结构、套餐和真实资源，正常发布继续要求支付就绪；只读支付真实状态由独立job验证。ProposalDeck已将支付状态单列，不要求为真。
