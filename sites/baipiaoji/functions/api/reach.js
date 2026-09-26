// 触达聚合端点（2026-09-11，owner:「让 bpj 站点可以自我扩展…为站点构建算法的后端能力」）。
//
// 为什么要有它:站点的增长算法（下一个该补哪个付费档、广告位值多少、判定线读数）
// 此前全部依赖「会话带 Cloudflare MCP 时手写 SQL 现查」——会话没 MCP 就瞎,
// CI 里的 D1 REST 导出在舰队里从未成功过一次（tds-traffic 的 d1-snapshot 至今没落过库,
// token 缺 D1 Read）。这个端点把取数搬回 Worker:它本来就绑着 HITS,不需要任何 token。
// CI 每天 curl 一次写进 data/reach.json,构建期与雷达按文件读,第①层从此自己看得见流量。
//
// 只出聚合计数,不出任何行级数据:没有邮箱、没有 IP、没有完整 UA。
// 来源只到域名（hit.js 入库时已只存 hostname）。这是公开端点,按公开数据的标准写。
//
// ⚠️ 2026-09-17 有意推翻了本文件原来那句「没有国家分布」,理由写在这里免得下次被当成疏忽:
// 这个端点存在的全部目的是「会话没 MCP 也看得见流量」,而 09-17 这天「中国流量是不是更大」
// 这个问题**只能靠手接 MCP 查 D1 才答得出来**——四周里中国从 0 涨到最近 14 天 60 次带来源
// 真人（同窗美国 63），而 reach.json 里一个字都没有。那正是它要防的失明。
// 但原来那句顾虑是对的,所以只开到「安全的最小粒度」:
//   · 只出**站点级**国家计数,不与 path、ref、事件做任何交叉（交叉才是重识别风险所在）;
//   · **k 匿名下限 K_COUNTRY=5**,不足 5 次的国家一律并进 `other`,不单独出现。
// 这两条由 foldSmallCountries() 保证,并有零网络单测（scripts/test-reach-shape.mjs）。
//
// 口径与 scripts/traffic-truth.mjs 的真人线 A 一致:ev='' 且来源域非空 = 可归因真人;
// 无来源的直接访问不计（那是本站被扫描的主要形态）,/__ 开头的自测路径不计。
import {readCommercialTriggers} from '../../lib/commercial-triggers.js';
export const K_COUNTRY = 5;

// 小于 K 的国家并进 other:一个只有 1 次访问的国家配上 28 天窗口,在公开端点上离
// 「可指认某个人」太近。返回值按计数降序,other 恒定排在最后（它不是一个国家）。
export function foldSmallCountries(rows, k = K_COUNTRY) {
  const kept = [];
  let other = 0;
  for (const r of rows || []) {
    const cc = String((r && r.country) || '').trim().toUpperCase();
    const n = Number((r && r.n) || 0);
    if (!n) continue;
    if (cc && /^[A-Z]{2}$/.test(cc) && n >= k) kept.push({ country: cc, n });
    else other += n;                      // 含空国家码与所有 <k 的
  }
  kept.sort((a, b) => b.n - a.n);
  if (other) kept.push({ country: 'other', n: other });
  return kept;
}

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
    const [total, paths, referrers, aiRefs, events, subsNew, subsAll, adsRows, countryRows, subsByStatus, checkoutByState, web3Rows, watchRows, wbOrderRows, videoOrders] = await Promise.all([
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
      // 市场面:只按国家计数,**不与 path / ref / 事件交叉**,并在下面过 k 匿名下限。
      // 有它之前,「中国流量是不是更大」这种问题只有手接 MCP 查 D1 才答得出来。
      q(`SELECT country, count(*) n FROM hits WHERE d >= ? AND ${HUMAN} GROUP BY country ORDER BY n DESC`, since),
      // 钱线(2026-09-21 舰队钱线仪表盘,读侧 tools/fleet/money_line.py):订阅按状态、广告收银台按状态、
      // 钱包轨订单数、免费额度告警订阅数、会员订单按状态。全部只出计数;表可能不存在,失败按 null。
      q('SELECT status, count(*) n FROM subs GROUP BY status').catch(() => []),
      q('SELECT state, count(*) n FROM bpj_ad_checkout GROUP BY state').catch(() => []),
      q('SELECT count(*) n FROM bpj_ad_web3').catch(() => [{ n: null }]),
      q('SELECT count(*) n FROM watches').catch(() => [{ n: null }]),
      q('SELECT state, count(*) n FROM wb_orders GROUP BY state').catch(() => []),
      q("SELECT o.state, count(*) n FROM wb_orders o JOIN wb_order_sources s ON s.order_id=o.id WHERE s.product='bpj-video-variants' AND o.created>=? GROUP BY o.state",Math.floor(Date.parse(since)/1000)).catch(() => null),
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
      commercial_triggers: await readCommercialTriggers(env.HITS,since),
      money: {
        days,
        subs_by_status: Object.fromEntries(subsByStatus.map((r) => [String(r.status || ''), r.n])),
        ads_by_status: ads,
        ad_checkout_by_state: Object.fromEntries(checkoutByState.map((r) => [String(r.state || ''), r.n])),
        ad_web3_orders: web3Rows[0] ? web3Rows[0].n : null,
        watches: watchRows[0] ? watchRows[0].n : null,
        member_orders_by_state: Object.fromEntries(wbOrderRows.map((r) => [String(r.state || ''), r.n])),
        video_orders_by_state: videoOrders===null?null:Object.fromEntries(videoOrders.map(r=>[String(r.state||''),r.n])),
        video_order_definition: 'Orders first created from the video membership entry within this window; paid means confirmed payment, not profit or causal attribution.',
        submissions_total: subsAll[0] ? subsAll[0].n : null,
        go_28d: (events.find((r) => r.ev === 'go') || {}).n || 0,
        biz_28d: (events.find((r) => r.ev === 'biz') || {}).n || 0,
      },
      countries: foldSmallCountries(countryRows),
      country_floor: K_COUNTRY,
    });
  } catch (e) {
    return json({ ok: false, code: 'query_failed' }, 500);
  }
}
