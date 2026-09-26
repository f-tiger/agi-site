// /api/pulse (2026-09-13, fleet "AI 时代的站点" flywheel read-side): 28-day human page
// views (JS beacon rows with ev='') and how many arrived from an AI assistant, by referrer
// host. Aggregate counts only — no paths, no countries, no row-level data. The Pages
// function reads its own HITS binding, so the fleet heartbeat needs no token (the repo's
// tokens lack D1 read). Rows before 2026-08-30 belong to the retired site and are excluded.
// Same host list as tools/fleet/ai_referrals.py. Served from the Cache API for an hour
// (cachedJson below); the old `cache-control: public, max-age=3600` header alone never
// cached anything at Cloudflare, every poll re-ran every scan.
const HOSTS = ['chatgpt', 'chat.openai', 'perplexity', 'claude.ai', 'copilot', 'gemini.google', 'you.com', 'kagi', 'poe.com', 'mistral', 'deepseek', 'kimi', 'doubao', 'yiyan', 'metaso'];
// Same window and /__ci exclusion for the human rows (ev='') and the money row (ev='affiliate_click');
// one GROUP BY (ev, ref) scan feeds both, split in JS below. SQLite LIKE is ASCII-case-insensitive,
// so the AI host match folds ASCII upper-case only, exactly as `ref LIKE '%host%'` did.
const WINDOW = "d >= date('now','-28 days') AND d >= '2026-08-30' AND path NOT LIKE '/__ci%'";
const asciiLower = (s) => String(s == null ? '' : s).replace(/[A-Z]/g, (c) => c.toLowerCase());
const isAI = (host) => { const h = asciiLower(host); return HOSTS.some((x) => h.includes(x)); };

// Success responses carry the browser hint; anything not ok is no-store (on 2026-09-25 the 500s
// went out with max-age=3600).
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status < 400 && o && o.ok === true ? 'public, max-age=3600' : 'no-store', 'access-control-allow-origin': '*' },
});

// D1 读预算(2026-09-25 事故:免费档每日 500 万行读取被打满,全舰队 D1 读失败到午夜)。
// 聚合端点从 Cache API 出,按 URL + 部署版本做键,TTL 秒;错误响应永不入缓存。
// 此前的 `cache-control: public, max-age=3600` 只对浏览器有效——Cloudflare 不会仅凭它缓存 Worker 响应,
// 每次轮询都重跑全部扫描。
// params 里的项可以是查询参数名(原样取 URL 值),也可以是 [名, 已归一化的值]。
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


// 引荐来源分类(2026-09-15「舰队相互学习」):tools/fleet/ref_sources.txt 是唯一权威,
// 每个 worker 里的字面量必须与它逐字相同——check_ref_sources.py 挂在 fleet-heartbeat 上断言,
// 漂了就走 GitHub 失败邮件。教训与 bot_ua.txt 同源:各自演化的分类器 = 各站台账不可比。
// 读的是已入库的来源域名,出的仍是聚合计数:无路径、无国家、无 UA、无行级数据。
const REF_SRC = 'self:pages.dev|workers.dev;;ai:chatgpt|chat.openai|perplexity|claude.ai|copilot.microsoft|copilot.cloud.microsoft|copilot|gemini.google|you.com|kagi|poe.com|mistral|deepseek|kimi|doubao|yiyan.baidu|yiyan|metaso|phind|felo.ai|genspark|monica.im|tiangong|chatglm|moonshot;;search:google.|bing.|duckduckgo|search.yahoo|yahoo.co|ecosia|yandex|baidu.|sogou|so.com|startpage|brave.com|qwant|naver|seznam|petalsearch|mojeek|lycos|ask.com;;fleet:agiscorecard.com|getecoback.com|baipiaoji.com|thedollscout.com;;social:t.co|twitter.com|x.com|reddit.com|facebook|instagram|linkedin|lnkd.in|news.ycombinator|producthunt|weibo|zhihu|douban|xiaohongshu|telegram|t.me|pinterest|youtube|tiktok|douyin|discord|substack|medium.com|tumblr|vk.com|line.me|whatsapp|quora|mastodon|bsky';
const srcHost = (r) => {
  let h = String(r == null ? '' : r).trim().toLowerCase();
  if (!h) return '';
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  h = h.split('/')[0].split('?')[0].split('#')[0].split('@').pop().split(':')[0];
  return h.replace(/^www\./, '');
};
// self 只认完全相同的主机名:兄弟站属 fleet,不是自己。
const srcBucket = (host, self) => {
  if (!host) return 'direct';
  if (self && host === self) return 'self';
  // 标签对齐 + 尾部只许 TLD 段。两个方向的错都真发生过:裸 includes 会把 netflix.com
  // 判成 x.com(social);只做前缀对齐又会把 agiscorecard.com.spam.example 判成 fleet
  // ——那正是引荐垃圾的常见形状。
  const tld = (rest) => rest === '' || rest.split('.').every((l) => l.length > 0 && l.length <= 4 && /^[a-z]+$/.test(l));
  const dotted = '.' + host;
  for (const grp of REF_SRC.split(';;')) {
    const i = grp.indexOf(':');
    for (const t of grp.slice(i + 1).split('|')) {
      if (!t) continue;
      const at = dotted.indexOf('.' + t);
      if (at < 0) continue;
      let rest = dotted.slice(at + t.length + 1);
      if (rest.startsWith('.')) rest = rest.slice(1);
      if (tld(rest)) return grp.slice(0, i);
    }
  }
  return 'other';
};

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.HITS) return json({ ok: false, error: 'no_db' }, 503);
  return cachedJson(request, env, context, 3600, () => compute(request, env));
}

async function compute(request, env) {
  try {
    // One hits scan (2026-09-26) instead of three: `_total` = sum over all ev='' groups, by_host =
    // the groups whose ref matches an AI host, by_source = the same groups bucketed, money =
    // the ev='affiliate_click' groups. Each number equals what its former separate query returned.
    const q = await env.HITS.prepare(
      `SELECT ev, ref AS host, COUNT(*) AS n FROM hits WHERE ${WINDOW} AND ev IN ('', 'affiliate_click') GROUP BY ev, ref`
    ).all();
    const human = []; let affiliate = 0;
    for (const r of (q.results || [])) {
      if (r.ev === '') human.push({ host: r.host, n: r.n | 0 });
      else if (r.ev === 'affiliate_click') affiliate += r.n | 0;
    }
    human.sort((a, b) => b.n - a.n);
    let human_pv = 0; const by_host = {};
    for (const r of human) {
      human_pv += r.n;
      if (r.host && isAI(r.host)) by_host[r.host] = r.n;
    }
    const ai_ref = Object.values(by_host).reduce((a, b) => a + b, 0);
    // 渠道构成(2026-09-15):同一批 ev='' 的 ref 组按 ref_sources.txt 分桶(前 1000 个来源,同原 LIMIT 1000)。
    // sum(by_source) 应等于 human_pv —— 对不上就是 ref 存成了整条 URL 或分类器漂了。
    const self_host = srcHost(new URL(request.url).hostname);
    const by_source = { search: 0, ai: 0, fleet: 0, social: 0, self: 0, direct: 0, other: 0 };
    const by_search = {}; const by_fleet = {}; const by_other = {};
    for (const r of human.slice(0, 1000)) {
      const h = srcHost(r.host); const n = r.n; const b = srcBucket(h, self_host);
      by_source[b] += n;
      if (b === 'search') by_search[h] = (by_search[h] || 0) + n;
      else if (b === 'fleet') by_fleet[h] = (by_fleet[h] || 0) + n;
      // by_other = 既不是搜索/AI/社交/兄弟站/本站的来源域 —— 真的有人从别处链过来。
      // 这是舰队第一方的外链监测:嵌入件、目录页、awesome-list 里的链接,送来过真人就出现在这里。
      else if (b === 'other') by_other[h] = (by_other[h] || 0) + n;
    }
    // 钱线(2026-09-21 舰队钱线仪表盘,读侧 tools/fleet/money_line.py):只出聚合计数,08-30 前的旧站行不计。
    const money = { days: 28, affiliate_click_28d: affiliate };
    try {
      const o = await env.HITS.prepare('SELECT state, COUNT(*) AS n FROM wb_orders GROUP BY state').all();
      money.member_orders_by_state = Object.fromEntries((o.results || []).map((r) => [String(r.state), r.n | 0]));
    } catch (e) { money.member_orders_by_state = null; }
    return json({ ok: true, days: 28, human_pv, ai_ref, by_host, by_source, by_search, by_fleet, by_other, money, generated: new Date().toISOString() });
  } catch (e) {
    return json({ ok: false, error: 'query_failed' }, 500);
  }
}
