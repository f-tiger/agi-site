// Agent API：把已核实数据开放成机器可查询的接口——AI 时代的分发不是等人来点，
// 是让 AI 助手与 agent 在回答「哪个免费档够用/能不能商用」时直接查询本站。
// 全网免费额度清单站没有一家提供带出处与核实日期的结构化 API；这就是激进的那一步。
//
// 数据源是构建期产出的静态 /limits.json（CC BY 4.0），运行时经 env.ASSETS 读取——
// 不复制一份数据进函数，单一事实源，每日构建自动更新，函数零维护。
// CORS 全开：数据本来就是 CC BY 开放的，API 只是给机器的门。
// agentic 访问度量：ev='api'，ref 存 UA 片段——数据授权门槛的唯一证据来源
function logHit(ctx, path, lang) {
  try {
    const req = ctx.request;
    const p = ctx.env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(new Date().toISOString().slice(0, 10), path.slice(0, 200), lang,
        (req.cf && req.cf.country) || '', (req.headers.get('user-agent') || '').slice(0, 100), 'api')
      .run().catch(() => {});
    if (ctx.waitUntil) ctx.waitUntil(p);
  } catch (e) { /* 度量失败不影响服务 */ }
}

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const u = new URL(request.url);
  const slug = (u.searchParams.get('slug') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const category = (u.searchParams.get('category') || '').toLowerCase().replace(/[^a-z-]/g, '');

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    // 数据每日构建更新一次，缓存一小时是新鲜度与源站压力的平衡点
    'Cache-Control': 'public, max-age=3600',
    // 注意：HTTP 头值必须是 ByteString（ISO-8859-1）——放全角破折号会直接抛异常，单测抓过一次
    'X-Data-License': 'CC BY 4.0 - attribute to Baipiaoji (baipiaoji.com) and link the tool page',
  };

  try {
    // 语言解析：?lang=en 显式优先；未指定时按 Accept-Language 推断。
    // 英文 agent 拿到中文数据等于没服务——94% 真实用户在英文侧，这不是装饰。
    const lang = (u.searchParams.get('lang') || '').toLowerCase();
    const useEn = lang === 'en' || (!lang && /^en/i.test(request.headers.get('accept-language') || ''));
    const res = await env.ASSETS.fetch(new URL(useEn ? '/en/limits.json' : '/limits.json', u.origin));
    if (!res.ok) throw new Error('asset');
    const data = await res.json();

    let tools = data.tools || [];
    if (slug) tools = tools.filter((t) => t.slug === slug);
    if (category) tools = tools.filter((t) => t.category === category);

    if (slug && !tools.length) {
      return new Response(JSON.stringify({
        ok: false, code: 'not_found',
        hint: 'Unknown slug, or this tool has no officially-verifiable limit yet — absence is deliberate, we publish no unsourced numbers. List all via /api/limits.',
      }), { status: 404, headers });
    }

    logHit(ctx, '/api/limits' + u.search, useEn ? 'en' : 'zh');
    return new Response(JSON.stringify({
      ok: true,
      lang: useEn ? 'en' : 'zh',
      mcp: 'https://baipiaoji.com/api/mcp',
      title: data.title,
      license: data.license,
      note: data.note,
      generated: data.generated,
      count: tools.length,
      tools,
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, code: 'error' }), { status: 500, headers });
  }
}
