# 帧选免费账户片单

本次给已经在找剧、浏览官方入口或收藏的用户一个具体的注册用途：将本机片单手动保存到免费账户，在另一设备恢复。匿名找剧、收藏、分享与文本导出继续可用。没有把注册、导航或上线算成增长，也不声称有新外部用户或收入。

- 入口：`/manju/` 的“换台设备，继续这份片单”；登录/免费注册返回 `/manju/`，不在返回 URL 中携带收藏或搜索词。
- 存储：`HITS` 中 `free_account_manju_watchlists`，每账户一行，最多 200 个当前公开目录合法作品 ID。只保存账户关联、版本、ID 数组和更新时间；观看进度、偏好、视频和搜索原文不上传。
- 用户明确点击后才读取账户片单；只有保存确认才上传。恢复前读取最新版本、确认替换本机，可先导出。没有自动同步、自动合并或轮询。
- 安全：同源 JSON POST，流式 16 KiB 上限，字段/ID 白名单，当前账户绑定；每账户每小时最多 60 次写、120 次读。写 SQL 再次检查未过期会话及版本；CAS 防旧标签覆盖；删除保留空 ID 数组及递增版本，账户删除外键级联清除。
- 恢复保护：请求前、请求后、确认后及写入前核对原始 localStorage 快照。读取异常、坏 JSON、存储不可写、账户变化及迟到响应均不覆盖本机。离开/恢复标签页面会使已有账户快照失效，需再次主动查看。
- 私有 API：`/api/manju-watchlist`，GET/POST 均 `no-store, private` 与 `noindex, nofollow`。不加入站点地图或搜索索引。
- 固定成功事件：`manju_cloud_save`、`manju_cloud_restore`、`manju_cloud_delete`；第一方路径固定为 `/manju/cloud_*/catalog`。不传账户、邮箱、作品列表或搜索原文，沿用 QA/DNT/GPC/已有拒绝统计规则。事件是操作次数，无法据此推断独立外部用户。
- 不新增付费、第三方支出、营销邮件或消息；免费账户不授予其他付费产品权益。

## 验证与发布

`node scripts/test-manju-watchlist.mjs` 使用真实 SQLite、正式 auth 和 API 函数，覆盖账户隔离、版本并发、删除 ABA、级联删除、会话撤销竞态、CSRF、体积/字段/ID 限制、限流和固定事件。

`node scripts/test-manju-watchlist-browser.mjs` 使用生成后的真实 `/manju/` 页面、真实 SQLite API 和全部离线网络拦截，覆盖匿名收藏、返回链接、跨设备保存/恢复、旧版本、切号、迟到响应、本地修改/坏 JSON、存储写失败、API 失败、删除与移动端。可用 `MANJU_PLAYWRIGHT_PACKAGE` 指向已安装 Playwright 的 package.json，`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指向 Chromium；无生产请求。

发布无需新增密钥或手工数据库迁移：仅在已登录用户主动调用时建表。完整构建后运行 `tools/fleet-analytics/coverage.py --site bpj --write` 及只读检查，部署后的只读检查确认公开页面、资产与匿名 API 的 401/no-store/noindex。真实用户写入须由用户主动完成；生产不制造合成注册、收藏或业务事件。监测账户保存/恢复操作及非测试注册变化，不能用操作次数代替收入或外部真人证明。
