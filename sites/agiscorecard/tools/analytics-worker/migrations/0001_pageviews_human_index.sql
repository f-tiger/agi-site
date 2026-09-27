-- 2026-09-26：/api/pulse 与 /api/trends 只读 pageviews 的 human 行，却每次把整张表读一遍（09-26 每次 3.5 万 – 5.7 万行）。
-- 这个部分索引只收 ua_class='human' 的行，并把两个接口要读的列（day、path、ref_host、hits）都放进去，
-- 查询只读索引、不回表。查询里必须原样出现 ua_class='human' 这个条件，SQLite 才会用它；
-- tools/test_analytics_d1.mjs 对两个接口实际发出的每条 pageviews 查询跑 EXPLAIN，出现整表扫描即红。
-- 由会话经 Cloudflare D1 查询接口执行（仓库 token 没有 D1 写权限）。代价：每次 human 页面计数多写一条索引行。
CREATE INDEX IF NOT EXISTS pageviews_human ON pageviews(day, path, ref_host, hits) WHERE ua_class = 'human';
