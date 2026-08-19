# Amazon OneLink 商业论证（2026-08-09，实测数据）

## 问题（D1 全量实测）
全部 18 次联盟点击的国家构成：DE 11 + AT 1 = **12 次有佣金资格**；
**US 2 + GB 2 + CA 2 = 6 次（33%）佣金死亡**——amazon.de 对美/英/加购买不计佣。
EN 页转化率最高（tilt 4/6=67%），但其英语受众有一部分恰好落在死区。

## 解药 = Amazon OneLink（owner 动作，我无法代劳）
OneLink 把 amazon.de 链接按访客地理自动路由到本地商店**并保留佣金**。前提：
1. 分别注册 Amazon Associates **US**（affiliate-program.amazon.com）与 **UK**（amazon.co.uk）账号（各自独立审核，同样有成交门槛）;
2. 在 PartnerNet 后台 OneLink 设置里关联三个账号;
3. 网站侧**零改动**——现有 amazon.de 链接自动生效。

## 值不值（诚实版）
- 按当前构成，OneLink 大约把佣金合格点击 +50%（12→18）。
- 但 US/UK 账号各有自己的"180 天 3 单"存活线——流量小的现在注册可能养不活两个新账号。
- **建议时点**：EN 区周点击稳定 ≥5 时再注册（届时喂得活）；此前的 33% 死区先用
  "EU 英文结账"提示把**欧盟英语读者**（本就计佣，只是不知道 amazon.de 有英文界面）的摩擦消掉——已于本轮上线（EN 型号网格披露行 + 3 个头部 EN 页）。

## 监测口径
D1: `SELECT country, COUNT(*) FROM ev WHERE name='affiliate_click' GROUP BY country` —— US+GB+CA 占比即死区规模。
