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

// D1 读预算(2026-09-25 事故:免费档每日 500 万行读取被打满,全舰队 D1 读失败到午夜)。
// 聚合端点从 Cache API 出,按 URL + 部署版本做键,TTL 秒;错误响应永不入缓存。
// 此前的 `cache-control: public, max-age=3600` 只对浏览器有效——Cloudflare 不会仅凭它缓存 Worker 响应,
// 每次轮询都重跑全部扫描。
// params 里的项可以是查询参数名(原样取 URL 值),也可以是 [名, 已归一化的值](本文件的 days 先 clamp 再进键)。
// 带 x-probe 头的第一方探针跳过缓存读取(仍写回):部署自检要看到自己刚写的行。
async function cachedJson(request, env, ctx, ttl, compute, params = []) {
  const cache = typeof caches !== 'undefined' && request ? caches.default : null;
  if (!cache) return compute();
  const u = new URL(request.url);
  const version = (env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) || env.CF_PAGES_COMMIT_SHA || 'dev';
  const qs = params.map((p) => (Array.isArray(p) ? p[0] + '=' + encodeURIComponent(p[1]) : p + '=' + encodeURIComponent(u.searchParams.get(p) || ''))).join('&');
  const key = new Request(u.origin + u.pathname + '?v=' + encodeURIComponent(version) + (qs ? '&' + qs : ''), { method: 'GET' });
  const probe = !!request.headers.get('x-probe');
  const hit = probe ? null : await cache.match(key);
  if (hit) return hit;
  const res = await compute();
  if (res.ok && res.headers.get('cache-control') !== 'no-store') {
    const stored = new Response(res.clone().body, res);
    stored.headers.set('cache-control', 'public, max-age=' + ttl);
    stored.headers.set('x-fleet-cache', 'store');
    if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, stored)); else await cache.put(key, stored);
  }
  return res;
}

// 成功响应给浏览器一小时的提示(真正挡住重复取数的是上面的 Cache API);任何非 ok 响应 no-store,
// 09-25 那天的 500 曾带着 max-age=3600 出门。
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': status < 400 && o && o.ok === true ? 'public, max-age=3600' : 'no-store',
  },
});

// 只允许三个窗口,取最近的一档:每个不同的 days 值都是一份独立缓存 = 一次完整扫描,
// 随手改个 days 就能绕过缓存打 D1,这在 09-25 之后不能再有。
export const DAYS_ALLOWED = [7, 28, 90];
export function clampDays(raw) {
  let d = parseInt(raw || '28', 10);
  if (!Number.isFinite(d)) return 7;
  let best = DAYS_ALLOWED[0];
  for (const a of DAYS_ALLOWED) if (Math.abs(a - d) < Math.abs(best - d)) best = a;
  return best;
}

// SQLite 的 LIKE 只对 ASCII 不分大小写;下面在 JS 里复刻同一条谓词时只折 ASCII 大写,不用 toLowerCase。
const asciiLower = (s) => String(s == null ? '' : s).replace(/[A-Z]/g, (c) => c.toLowerCase());
const AI_HOSTS = ['chatgpt.com', 'openai.com', 'perplexity.ai', 'claude.ai', 'gemini.google', 'copilot.microsoft', 'you.com', 'phind.com', 'kagi.com'];
const EVENT_EXCLUDED = new Set(['bot', 'bot_spoofed', 'bot_maybe_probe', 'api']);
const sortDesc = (rows) => rows.sort((a, b) => b.n - a.n);
const tally = (map, key, n) => map.set(key, (map.get(key) || 0) + n);

// 把一次 GROUP BY 的行在 JS 里滚成原来六条窗口聚合的结果(2026-09-26)。谓词与原 SQL 逐字对应:
//   真人线 A:ev = '' AND ref 非空 AND ref NOT LIKE '%baipiaoji%' AND path NOT LIKE '/\_\_%'
//   事件:ev != '' AND ev NOT IN (bot 集) AND path NOT LIKE '/\_\_%' AND lang != 'ci'
// SQL 里 NULL 与任何比较都是 NULL(= 被剔除),所以 lang/ref 为 NULL 的行在这里也同样剔除。
// path NOT LIKE '/\_\_%' 与 ev NOT IN (bot 集) 已在 SQL 的 WHERE 里(两条谓词共有),行集因此更小。
export function rollup(rows) {
  let total = 0;
  const paths = new Map(), referrers = new Map(), aiRefs = new Map(), events = new Map(), countries = new Map();
  for (const r of rows || []) {
    const n = Number(r.n) || 0;
    if (!n) continue;
    if (r.ev === '') {
      if (r.ref == null || r.ref === '' || asciiLower(r.ref).includes('baipiaoji')) continue;
      total += n;
      tally(paths, r.path, n);
      tally(referrers, r.ref, n);
      tally(countries, r.country === undefined ? null : r.country, n);
      const lref = asciiLower(r.ref);
      if (AI_HOSTS.some((h) => lref.includes(h))) tally(aiRefs, JSON.stringify([r.ref, r.path]), n);
    } else if (r.ev != null && r.ev !== '' && !EVENT_EXCLUDED.has(r.ev)) {
      if (r.lang == null || r.lang === 'ci') continue;
      tally(events, r.ev, n);
    }
  }
  return {
    total,
    paths: sortDesc([...paths].map(([path, n]) => ({ path, n }))).slice(0, 400),
    referrers: sortDesc([...referrers].map(([ref, n]) => ({ ref, n }))).slice(0, 30),
    aiRefs: sortDesc([...aiRefs].map(([k, n]) => { const [ref, path] = JSON.parse(k); return { ref, path, n }; })).slice(0, 40),
    events: sortDesc([...events].map(([ev, n]) => ({ ev, n }))),
    countryRows: sortDesc([...countries].map(([country, n]) => ({ country, n }))),
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.HITS) return json({ ok: false, code: 'no_db' }, 503);
  const u = new URL(request.url);
  const days = clampDays(u.searchParams.get('days'));
  return cachedJson(request, env, context, 3600, () => compute(env, days), [['days', String(days)]]);
}

async function compute(env, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  // 小表子查询失败按 null/[] 计(表可能尚不存在),但把失败的名字列进 money_errors,不再无声。
  const money_errors = [];
  try {
    const q = (sql, ...params) => env.HITS.prepare(sql).bind(...params).all().then((r) => (r && r.results) || []);
    const soft = (label, fallback) => (sql, ...params) => q(sql, ...params).catch(() => { money_errors.push(label); return fallback; });
    const [hitRows, subsNew, subsAll, adsRows, subsByStatus, checkoutByState, web3Rows, watchRows, wbOrderRows, videoOrders] = await Promise.all([
      // hits 表只扫一次(2026-09-26):原来六条窗口聚合各扫一遍 28 天 ≈15 万行/次,现在一次 GROUP BY,
      // 真人线 A / paths / referrers / AI 引流 / 事件 / 国家全部由 rollup() 在 JS 里按同一谓词滚出来。
      // WHERE 里只放两条谓词共有的部分(剔 bot 集与 /__ 自测路径),其余判定在 rollup() 里逐字复刻。
      q(`SELECT ev, path, ref, country, lang, count(*) n FROM hits WHERE d >= ? AND ev NOT IN ('bot','bot_spoofed','bot_maybe_probe','api') AND path NOT LIKE '/\\_\\_%' ESCAPE '\\' GROUP BY ev, path, ref, country, lang`, since),
      // 厂商投稿:只出数量。表可能尚不存在(首次投稿时才建)——失败按 null 计,不让整个端点陪葬。
      soft('submissions_new', [{ n: null }])("SELECT count(*) n FROM submissions WHERE status = 'new' AND name NOT LIKE '\\_\\_ci%' ESCAPE '\\'"),
      soft('submissions_total', [{ n: null }])("SELECT count(*) n FROM submissions WHERE name NOT LIKE '\\_\\_ci%' ESCAPE '\\'"),
      soft('ads', [])('SELECT status, count(*) n FROM ads GROUP BY status'),
      // 钱线(2026-09-21 舰队钱线仪表盘,读侧 tools/fleet/money_line.py):订阅按状态、广告收银台按状态、
      // 钱包轨订单数、免费额度告警订阅数、会员订单按状态。全部只出计数;表可能不存在,失败按 null。
      soft('subs', [])('SELECT status, count(*) n FROM subs GROUP BY status'),
      soft('ad_checkout', [])('SELECT state, count(*) n FROM bpj_ad_checkout GROUP BY state'),
      soft('ad_web3', [{ n: null }])('SELECT count(*) n FROM bpj_ad_web3'),
      soft('watches', [{ n: null }])('SELECT count(*) n FROM watches'),
      soft('member_orders', [])('SELECT state, count(*) n FROM wb_orders GROUP BY state'),
      soft('video_orders', null)("SELECT o.state, count(*) n FROM wb_orders o JOIN wb_order_sources s ON s.order_id=o.id WHERE s.product='bpj-video-variants' AND o.created>=? GROUP BY o.state", Math.floor(Date.parse(since) / 1000)),
    ]);
    const { total, paths, referrers, aiRefs, events, countryRows } = rollup(hitRows);
    const ads = {};
    for (const r of adsRows) ads[String(r.status || '')] = r.n;
    return json({
      ok: true,
      generated: new Date().toISOString(),
      window_days: days, since, until: today,
      definition: "ev='' AND ref != '' — referred human page views (traffic-truth.mjs human line A); direct/no-referrer visits and /__ self-test paths excluded; counts only, no row-level data",
      humans_referred: total,
      paths, referrers, ai_referrals: aiRefs,
      events: Object.fromEntries(events.map((r) => [r.ev, r.n])),
      submissions: { new: subsNew[0] ? subsNew[0].n : null, total: subsAll[0] ? subsAll[0].n : null },
      ads,
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
      // 小表子查询里失败(多半是表尚不存在)而按 null/[] 计的那些,按名字列出;空数组 = 全部读到了。
      money_errors,
      countries: foldSmallCountries(countryRows),
      country_floor: K_COUNTRY,
    });
  } catch (e) {
    return json({ ok: false, code: 'query_failed' }, 500);
  }
}
