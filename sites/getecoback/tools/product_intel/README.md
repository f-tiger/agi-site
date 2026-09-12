# Preis-Engine (Amazon PA-API) — owner 三步

这条线让货架上的价格与 ASIN 由**亚马逊自己的接口**每日刷新,替代「Preis vor Ort prüfen」
和手工核 ASIN。未配置时**零分钟、零副作用、页面逐字节不变**。

## 你要做的(≈10 分钟,一次性)

1. **申请 PA-API 密钥**:登录 partnernet.amazon.de → Tools → Product Advertising API →
   「Anmelden / Zugangsdaten erstellen」。条件是 Associates 账号近 180 天内有 ≥3 笔合格成交
   (你的账号 30 天窗已有 10 件,应达门槛——**请以后台实际显示为准**)。得到 Access Key + Secret Key。
2. **GitHub → Settings → Secrets and variables → Actions → Secrets** 新增三条:
   `PAAPI_ACCESS_KEY`、`PAAPI_SECRET_KEY`、`PAAPI_PARTNER_TAG`(= `getecoback-21`)。
3. **先手动验一次,再开门**:Actions → Deploy getecoback.com → Run workflow(手动触发不受门控限制,
   刷新步会跑 `--dry-run`,只打印不写)。日志里看到 `refresh: ok=…` 且没有 `PA-API 401/403`
   之后,再到 **Variables** 加 `PAAPI_ENABLED = 1`。之后每日 03:17 UTC 的定时部署会真实刷新。

## 它会做什么、不会做什么

- 只查货架上**已经点名**的产品(`shelf_terms.py` 从 `build_structure.py` 读),**不会自己加产品**。
- 一条结果只有在**标题包含型号标识**时才被采用(EX105 的搜索结果是 AP98 → 拒绝,保持搜索链接)。
- 价格超过 **24 小时**不再显示(亚马逊展示规则,也是诚实底线)。接口挂了 → 页面退回现状,不会空掉货架。
- 品类词(「Für den Keller」)永远不解析成某个产品。

## 本地验证(无需密钥)

```
node tools/product_intel/paapi.mjs --selftest     # SigV4 对 AWS 公开测试向量
node tools/product_intel/test_refresh.mjs         # 真刷新器 × 本地 mock,9 条断言
python3 tools/check_products.py                   # 构建后页面与数据文件一致性
```
