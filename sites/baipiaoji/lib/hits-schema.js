// hits 表的读写契约（2026-09-26）。
//
// 为什么有这个文件：Cloudflare 账号的 D1 免费额度是全账号每天读 500 万行，09-24/25/26 连续三天在
// 13:00 / 08:00 / 10:00 UTC 用完，之后全舰队的统计接口、事件写入、账号接口一律被拒到 UTC 零点。
// Cloudflare 的逐条查询统计（tools/fleet/d1_usage.mjs）显示 09-25 读取量的 58% 是 /api/reach 的
// 6 条查询，每条都把 hits 读一遍：这张表一次事件一行、没有为读法建过索引、没有保留期，
// 09-17 起又把每一次爬虫抓取都写进来（每天 4000 多行）。真人统计要的只是其中几百行带来源的访问。
//
// 三条规矩都由 scripts/test-hits-schema.mjs 断言：
//   1. 真人统计的谓词只有 HUMAN 这一份，且它的前三项与 hits_referred 部分索引的 WHERE 逐字相同——
//      SQLite 只在查询里「出现同一个条件」时才会用部分索引，改了一个字就退回全表扫描；
//   2. 事件查询必须带 `ev != ''`，才能用上 hits_events；
//   3. 爬虫记录不再进 hits，只进 bot_daily（按 天×爬虫×路径×国家 计数），真人统计永远不碰它。
export const HUMAN_REFERRED = "ev = '' AND ref IS NOT NULL AND ref != ''";
export const HUMAN = `${HUMAN_REFERRED} AND ref NOT LIKE '%baipiaoji%' AND path NOT LIKE '/\\_\\_%' ESCAPE '\\'`;
export const EVENT_ROWS = "ev != ''";

export const HITS_INDEXES = [
  // 带来源的真人访问：28 天几百行，而 ev='' 的行有两万多（大多是无来源的浏览与扫描）。
  `CREATE INDEX IF NOT EXISTS hits_referred ON hits(d) WHERE ${HUMAN_REFERRED}`,
  // 事件与 API 调用：按日期排，事件查询只读窗口内的这部分行，查询含义不变。
  `CREATE INDEX IF NOT EXISTS hits_events ON hits(d, ev) WHERE ${EVENT_ROWS}`,
];

export const BOT_DAILY_TABLE = `CREATE TABLE IF NOT EXISTS bot_daily (
  d TEXT NOT NULL,
  bot TEXT NOT NULL,
  path TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (d, bot, path, country)
) WITHOUT ROWID`;

const BOT_UPSERT = 'INSERT INTO bot_daily (d, bot, path, country, n) VALUES (?,?,?,?,1) '
  + 'ON CONFLICT(d, bot, path, country) DO UPDATE SET n = n + 1';

// 一次爬虫抓取 = 一次 upsert（读 1 行、写 1 行）。表不存在时建表再写一次：部署可以先于迁移上线，
// 不会因此丢掉那段时间的爬虫记录。WITHOUT ROWID 让主键就是表本身，每次写入只落一棵 B 树。
export async function recordBot(db, { d, bot, path, country }) {
  const args = [d, String(bot || '').slice(0, 60), String(path || '').slice(0, 200), String(country || '').slice(0, 2)];
  try {
    await db.prepare(BOT_UPSERT).bind(...args).run();
  } catch (e) {
    if (!/no such table/i.test(String(e && e.message))) throw e;
    await db.prepare(BOT_DAILY_TABLE).run();
    await db.prepare(BOT_UPSERT).bind(...args).run();
  }
}

// 历史爬虫行搬家（migrations/0002 里同一段 SQL；那份文件是给 D1 执行的，这里给单测用）。
// ON CONFLICT 累加而不是覆盖：新代码上线后当天已经写进 bot_daily 的计数不能被旧行冲掉。
export const MIGRATE_BOT_ROWS = `INSERT INTO bot_daily (d, bot, path, country, n)
  SELECT d, COALESCE(ref, ''), COALESCE(path, ''), COALESCE(country, ''), COUNT(*)
  FROM hits WHERE ev = 'bot'
  GROUP BY d, COALESCE(ref, ''), COALESCE(path, ''), COALESCE(country, '')
  ON CONFLICT(d, bot, path, country) DO UPDATE SET n = n + excluded.n`;
export const DELETE_BOT_ROWS = "DELETE FROM hits WHERE ev = 'bot'";
