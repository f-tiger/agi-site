// 广告位的公开读取端点。页面在客户端取它来渲染广告——刻意不进静态 HTML:
// ① 付款后立刻可见,不必等下一次构建(owner 要的是「自动」,等一天不算自动);
// ② 付费链接本来就不该进入被索引的正文。Google 对付费链接的要求是
//    rel="sponsored",渲染侧照此办理,页面结构里也与已核实条目物理分开。
//
// 到期不需要任何清理任务:过期与否在取数时按日期判,少一个会悄悄不跑的定时器。
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    // 一分钟缓存:广告不是实时数据,但新买的位要在一分钟内出现
    'Cache-Control': 'public, max-age=60',
  },
});

export async function onRequestGet({ request, env }) {
  if (!env.HITS) return json({ ok: true, ads: [] });
  const u = new URL(request.url);
  const cat = String(u.searchParams.get('cat') || '').replace(/[^a-z]/g, '').slice(0, 12);
  const lang = u.searchParams.get('lang') === 'en' ? 'en' : 'zh';
  const today = new Date().toISOString().slice(0, 10);
  try {
    const q = cat
      ? env.HITS.prepare("SELECT id,name,url,pitch,cat FROM ads WHERE status='live' AND expires >= ? AND cat = ? ORDER BY paid_at DESC LIMIT 3").bind(today, cat)
      : env.HITS.prepare("SELECT id,name,url,pitch,cat FROM ads WHERE status='live' AND expires >= ? ORDER BY paid_at DESC LIMIT 3").bind(today);
    const r = await q.all();
    return json({ ok: true, lang, ads: (r && r.results) || [] });
  } catch {
    return json({ ok: true, ads: [] });
  }
}
