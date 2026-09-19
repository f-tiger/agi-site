# BPJ支付升级验证记录

2026-09-19；基于main e3c53c7。本文件记录本地验收；部署和真实收款状态须另查GitHub Actions与线上体检。

- 新支付流程：13项集成测试通过。使用Node真实SQLite及D1形状适配器，Stripe网络响应模拟；覆盖并发排位、测试/生产隔离、延迟到账、金额/税额/币种/环境校验、重复事件、签名轮换、退款乱序、争议、数据库事务中途失败及重试、服务端定价、能力令牌查询。
- 老钱包认领：既有11项测试通过；这是兼容性测试，不代表链上真实验收。
- 自动营销准备：3项测试通过，支付未就绪/测试模式阻断、资料过期阻断、去重ID稳定、不向任意域生成推广链接。生成结果5条草稿、1条阻断、外发0条，业务指标保持null。
- 静态构建通过；verify-dist检查1603个HTML页面，broken/ldErr/zhLeak/placeholder/rawMd/contradiction/enJson/staleCount/hollow/hreflang全0。
- 中英实际构建HTML＋linkedom执行新客户端脚本：未开售按钮关闭、正确读取name字段、条款确认、保存同一订单、转往托管结账、付款返回查询queued状态通过。DOM校验使用临时验证依赖，未给生产增加npm依赖。
- 两条修改的GitHub工作流YAML解析通过。下载的原分词器二进制与仓库blob SHA一致，未改动。
- 浏览器视觉检查未完成：运行环境没有Chromium，可执行文件下载失败；没有将DOM测试称为浏览器截图验收。
- 真实Stripe商户/Checkout/webhook/退款、生产小额交易未验证，线上最初收款配置均为false；不把模拟事件记成收入。自动营销只准备可审核草稿，没有社交外发、邮件投递或广告花费。

复核命令：

```sh
cd sites/baipiaoji
node scripts/test-ad-commerce.mjs
node scripts/test-ad-claim.mjs
node scripts/build.mjs
node scripts/verify-dist.mjs
cd ../..
python3 tools/fleet/test_marketing_queue.py
python3 tools/fleet/marketing_queue.py --today 2026-09-19 --check
```

已知边界：固定3位满额排队；历史广告兼容展示可暂时超过3位。退款/争议停投后不自动挪动其他已承诺档期。没有自动对账补偿任务、跨设备账号恢复或会员续费。密钥与真实交易验收是开售条件；后续会员必须有独立服务端权限与取消入口。
