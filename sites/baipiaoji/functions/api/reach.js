// 触达聚合端点（2026-09-11，owner:「让 bpj 站点可以自我扩展…为站点构建算法的后端能力」）。
//
// 为什么要有它:站点的增长算法（下一个该补哪个付费档、广告位值多少、判定线读数）
// 此前全部依赖「会话带 Cloudflare MCP 时手写 SQL 现查」——会话没 MCP 就瞎,
// CI 里的 D1 REST 导出在舰队里从未成功过一次（tds-traffic 的 d1-snapshot 至今没落过库,
// token 缺 D1 Read）。这个端点把取数搬回 Worker:它本来就绑着 HITS,不需要任何 token。
// CI 每天 curl 一次写进 data/reach.json,构建期与雷达按文件读,第①层从此自己看得见流量。
//
// 只出聚合计数,不出任何行级数据:没有邮箱、没有 IP、没有国家分布、没有完整 UA。
// 来源只到域名（hit.js 入库时已只存 hostname）。这是公开端点,按公开数据的标准写。
//
// 口径与 scripts/traffic-truth.mjs 的真人线 A 一致:ev='' 且来源域非空 = 可归因真人;
// 无来源的直接访问不计（那是本站被扫描的主要形态）,/__ 开头的自测路径不计。
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    // 聚合数据一天一变;缓存一小时挡住重复取数,CI 每日一次远在其外
    'Cache-Control': 'public, max-age=3600',
  },
});

export async function onRequestGet({ request, env }) {
  if (!env.HITS) return json({ ok: false, code: 'no_db' }, 503);
  const u = new URL(request.url);
  let days = parseInt(u.searchParams.get('days') || '28', 10);
  if (!Number.isFinite(days) || days < 7) days = 7;
  if (days > 90) days = 90;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  // 真人线 A 的公共谓词。ref 已是 hostname;自家域在 hit.js 入库时就清空了,这里再挡一次。
  const HUMAN = "ev = '' AND ref IS NOT NULL AND ref != '' AND ref NOT LIKE '%baipiaoji%' AND path NOT LIKE '/\\_\\_%' ESCAPE '\\'";
  try {
    const q = (sql, ...params) => env.HITS.prepare(sql).bind(...params).all().then((r) => (r && r.results) || []);
    const [total, paths, referrers, aiRefs, events, subsNew, subsAll, adsRows] = await Promise.all([
      q(`SELECT count(*) n FROM hits WHERE d >= ? AND ${HUMAN}`, since),
      q(`SELECT path, count(*) n FROM hits WHERE d >= ? AND ${HUMAN} GROUP BY path ORDER BY n DESC LIMIT 400`, since),
      q(`SELECT ref, count(*) n FROM hits WHERE d >= ? AND ${HUMAN} GROUP BY ref ORDER BY n DESC LIMIT 30`, since),
      // AI 助手引流:雷达里「AI 引用第一次转化为点击」那条信号的数据源（原来指向一个从未存在的快照文件）
      q(`SELECT ref, path, count(*) n FROM hits WHERE d >= ? AND ${HUMAN} AND (ref LIKE '%chatgpt.com%' OR ref LIKE '%openai.com%' OR ref LIKE '%perplexity.ai%' OR ref LIKE '%claude.ai%' OR ref LIKE '%gemini.google%' OR ref LIKE '%copilot.microsoft%' OR ref LIKE '%you.com%' OR ref LIKE '%phind.com%' OR ref LIKE '%kagi.com%') GROUP BY ref, path ORDER BY n DESC LIMIT 40`, since),
      // 事件计数:手势/转化/广告/作业包全部按 ev 聚合。剔 CI 自测路径与 CI 语言标记。
      q(`SELECT ev, count(*) n FROM hits WHERE d >= ? AND ev != '' AND ev NOT IN ('bot','bot_spoofed','bot_maybe_probe','api') AND path NOT LIKE '/\\_\\_%' ESCAPE '\\' AND lang != 'ci' GROUP BY ev ORDER BY n DESC`, since),
      // 厂商投稿:只出数量。表可能尚不存在（首次投稿时才建）——失败按 0 计,不让整个端点陪葬。
      q("SELECT count(*) n FROM submissions WHERE status = 'new' AND name NOT LIKE '\\_\\_ci%' ESCAPE '\\'").catch(() => [{ n: null }]),
      q("SELECT count(*) n FROM submissions WHERE name NOT LIKE '\\_\\_ci%' ESCAPE '\\'").catch(() => [{ n: null }]),
      q('SELECT status, count(*) n FROM ads GROUP BY status').catch(() => []),
    ]);
    const ads = {};
    for (const r of adsRows) ads[String(r.status || '')] = r.n;
    return json({
      ok: true,
      generated: new Date().toISOString(),
      window_days: days, since, until: today,
      definition: "ev='' AND ref != '' — referred human page views (traffic-truth.mjs human line A); direct/no-referrer visits and /__ self-test paths excluded; counts only, no row-level data",
      humans_referred: (total[0] && total[0].n) || 0,
      paths, referrers, ai_referrals: aiRefs,
      events: Object.fromEntries(events.map((r) => [r.ev, r.n])),
      submissions: { new: subsNew[0] ? subsNew[0].n : null, total: subsAll[0] ? subsAll[0].n : null },
      ads,
    });
  } catch (e) {
    return json({ ok: false, code: 'query_failed' }, 500);
  }
}
