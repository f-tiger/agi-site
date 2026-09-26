-- 2026-09-26：hits 读法索引 + 爬虫记录搬到 bot_daily。背景与规矩见 lib/hits-schema.js。
-- 由会话经 Cloudflare D1 查询接口在 UTC 零点额度恢复后执行（仓库 token 没有 D1 写权限）；
-- scripts/test-hits-schema.mjs 在内存 SQLite 里原样执行本文件，保证它能跑、结果正确。
--
-- 顺序有讲究：先删爬虫行、再建 hits 的两个索引——反过来的话，删掉的每一行还要多写一次索引，
-- 白白多花写入额度（免费档每天 10 万行写入，同样是全账号共用、用完即拒）。
-- 执行前先数一下 hits 里 ev='bot' 的行数和分组数：两者之和超过 6 万行就把 DELETE 按日期分两天做。

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
