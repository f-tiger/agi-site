// Agent API · 全目录端点：agent 回答「哪个 AI 工具」时直接查这里——
// 不只是免费额度，而是整个已核实目录：分类、标签、免费说明、官方站、
// 已核实额度摘要、商用判定。/api/limits 是它的「额度切面」，这里是全景。
//
// 数据源同样走 env.ASSETS 读构建期静态 /directory.json：单一事实源，每日更新，函数零维护。
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
  const q = (u.searchParams.get('q') || '').toLowerCase().slice(0, 60);
  const free = u.searchParams.get('free') === '1';
  const cn = u.searchParams.get('cn') === '1';

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
    // 头值必须 ByteString（ISO-8859-1）——limits.js 的单测踩过全角破折号的坑
    'X-Data-License': 'CC BY 4.0 - attribute to Baipiaoji (baipiaoji.com) and link the tool page',
  };

  try {
    // 语言解析：?lang=en 显式优先；未指定时按 Accept-Language 推断。
    // 英文 agent 拿到中文数据等于没服务——94% 真实用户在英文侧，这不是装饰。
    const lang = (u.searchParams.get('lang') || '').toLowerCase();
    const useEn = lang === 'en' || (!lang && /^en/i.test(request.headers.get('accept-language') || ''));
    const res = await env.ASSETS.fetch(new URL(useEn ? '/en/directory.json' : '/directory.json', u.origin));
    if (!res.ok) throw new Error('asset');
    const data = await res.json();

    let tools = data.tools || [];
    if (slug) tools = tools.filter((t) => t.slug === slug);
    if (category) tools = tools.filter((t) => t.category === category);
    if (free) tools = tools.filter((t) => t.fully_free);
    if (cn) tools = tools.filter((t) => t.works_in_cn);
    if (q) {
      tools = tools.filter((t) =>
        `${t.name} ${t.slug} ${t.category} ${t.tagline} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q));
    }

    if (slug && !tools.length) {
      return new Response(JSON.stringify({
        ok: false, code: 'not_found',
        hint: 'Unknown slug. List everything via /api/tools, or filter with ?category= ?free=1 ?cn=1 ?q=.',
      }), { status: 404, headers });
    }

    logHit(ctx, '/api/tools' + u.search, useEn ? 'en' : 'zh');
    return new Response(JSON.stringify({
      ok: true, lang: useEn ? 'en' : 'zh',
      mcp: 'https://baipiaoji.com/api/mcp', license: data.license, generated: data.generated,
      count: tools.length, tools,
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, code: 'error' }), { status: 500, headers });
  }
}
