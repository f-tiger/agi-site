-- 2026-09-26：hits 读法索引 + 爬虫记录搬到 bot_daily。背景与规矩见 lib/hits-schema.js。
-- 由会话经 Cloudflare D1 查询接口在 UTC 零点额度恢复后执行（仓库 token 没有 D1 写权限）；
-- scripts/test-hits-schema.mjs 在内存 SQLite 里原样执行本文件，保证它能跑、结果正确。
--
-- 顺序有讲究：先删爬虫行、再建 hits 的两个索引——反过来的话，删掉的每一行还要多写一次索引，
-- 白白多花写入额度（免费档每天 10 万行写入，同样是全账号共用、用完即拒）。
-- 执行前先数一下 hits 里 ev='bot' 的行数和分组数：两者之和超过 6 万行就把 DELETE 按日期分两天做。
--
-- 已执行（2026-09-27 00:05–00:10 UTC，按日期两批，每批先 INSERT 核对计数再 DELETE）：
--   迁移前 hits 34 848 行 = 爬虫 23 815 + 事件/API 4 148 + ev='' 6 885（其中带来源 562）；分组 20 062。
--   d < 09-10：写入 2 993 + 删除 4 089；d ≥ 09-10：写入 17 069 + 删除 19 726；两个索引 563 + 4 149。
--   合计 48 589 行写入。D1 对 DELETE 按删除行数计写入（hits 上已有的两个索引不另计），CREATE INDEX 按条目计。
--   守恒：bot_daily SUM(n) = 迁移的 23 815 + 中间件 09-26 已记的 792 + 09-27 的 3。
--   线上 hits 早已有 idx_hits_d / idx_hits_path（08-03 建表时手工建，本仓没有记录）。
--   全账号日常写入 1.6 万–3.1 万行/天（09-20→26，tools/fleet/d1_usage.mjs）；一次性迁移按这个余量排期。

CREATE TABLE IF NOT EXISTS bot_daily (
  d TEXT NOT NULL,
  bot TEXT NOT NULL,
  path TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (d, bot, path, country)
) WITHOUT ROWID;

INSERT INTO bot_daily (d, bot, path, country, n)
  SELECT d, COALESCE(ref, ''), COALESCE(path, ''), COALESCE(country, ''), COUNT(*)
  FROM hits WHERE ev = 'bot'
  GROUP BY d, COALESCE(ref, ''), COALESCE(path, ''), COALESCE(country, '')
  ON CONFLICT(d, bot, path, country) DO UPDATE SET n = n + excluded.n;

DELETE FROM hits WHERE ev = 'bot';

CREATE INDEX IF NOT EXISTS hits_referred ON hits(d) WHERE ev = '' AND ref IS NOT NULL AND ref != '';
CREATE INDEX IF NOT EXISTS hits_events ON hits(d, ev) WHERE ev != '';
