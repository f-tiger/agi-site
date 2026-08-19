// 增量变更端点 /api/changes?since=YYYY-MM-DD
//
// 为什么是这个形态（PRD-subscription-pivot v2 §3「快照 + 增量 diff」）：
// 对抗核实收敛出的机器侧唯一有可迁移先例的机制是 litellm 的
// model_prices_and_context_window.json——完全免费、CI 自动更新、远程 URL 为默认 +
// 本地 vendored 兜底，价值来自被无数系统硬编码为默认数据源。
// 我们照抄这个设计，但必须写下它的限制：litellm 那份文件的分发力来自它绑在一个
// 本身已被广泛依赖的库里，**我们没有那个宿主**。所以「被引用」对我们不是副产品，
// 是要单独解决的问题——因此这个端点的成败指标是「被写进别人代码」，
// 不是「被抓取次数」（每日数百次通用爬虫能把抓取数轻易刷成好看的数字）。
//
// 也因此这里刻意不做 push（webhook 已判定停止投入：市面同类产品无一例外面向
// B 端竞对情报，不是我们的用户）。可轮询的 delta 比推送更适合被 vendored。
//
// Cloudflare 的数据：超过 50% 的 AI 爬取是在重复抓没有变化的页面。
// 一个 since 端点直接消除这份浪费——这既是省别人的算力，也是被引用的理由。
const VERSION = '1';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const cors = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    // 变更数据每日构建一次，缓存 1 小时足够；stale-while-revalidate 让 agent 永远拿得到东西
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const json = (obj, status = 200) => new Response(JSON.stringify(obj, null, 1), { status, headers: cors });

  const since = (url.searchParams.get('since') || '').trim();
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return json({ ok: false, code: 'bad_since', hint: 'since must be YYYY-MM-DD' }, 400);
  }
  const slug = (url.searchParams.get('slug') || '').trim().slice(0, 60);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1), 1000);

  // 自取站内已构建好的 changes.json：唯一数据源，不另存一份，避免两个出口分叉
  const src = new URL('/changes.json', url.origin);
  const res = await fetch(src.toString(), { cf: { cacheTtl: 3600 } });
  if (!res.ok) return json({ ok: false, code: 'upstream' }, 502);
  const data = await res.json().catch(() => null);
  if (!data) return json({ ok: false, code: 'upstream_parse' }, 502);

  const all = Array.isArray(data) ? data : (data.changes || data.items || []);
  let out = all;
  if (since) out = out.filter((c) => String(c.date || '') >= since);
  if (slug) out = out.filter((c) => c.slug === slug);
  // 新的在前：轮询方拿到的第一条就是最新一条
  out = out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, limit);

  // 打点走与其余 API 一致的 ev='api'，UA 记进 ref。注意 CI 自测的 curl UA 在
  // 三线度量里会被 traffic-truth.mjs 排除——否则我们又会给自己造一条增长曲线。
  try {
    if (env.HITS) {
      const p = env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
        .bind(new Date().toISOString().slice(0, 10), '/api/changes', 'api',
          (request.cf && request.cf.country) || '',
          (request.headers.get('user-agent') || '').slice(0, 100), 'api').run();
      if (typeof caches !== 'undefined') await p.catch(() => {});
    }
  } catch (e) { /* 统计永远不能影响接口 */ }

  return json({
    ok: true,
    version: VERSION,
    // 稳定路径承诺：这三个 URL 不改。被 vendored 的前提是引用方敢写死它。
    stable: {
      snapshot: `${url.origin}/limits.json`,
      changes: `${url.origin}/changes.json`,
      incremental: `${url.origin}/api/changes?since=YYYY-MM-DD`,
    },
    since: since || null,
    slug: slug || null,
    count: out.length,
    total: all.length,
    license: 'CC BY 4.0 — reuse and commercial use allowed, attribution required: https://baipiaoji.com',
    changes: out,
  });
}
