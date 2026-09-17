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
  const u0 = new URL(request.url);
  // 收款体检（2026-09-16，owner:「收款如何做？」）：一个 URL 回答「到底通没通」。
  // 起因是这条链上最贵的失败模式不是配错，而是**配完了没人知道有没有生效**——
  // 密钥设在 Cloudflare 后台，页面上看不出来，而真正发现没通电的时刻是买家已经付了钱。
  //
  // 只回布尔与本来就印在页面上的公开数字：**绝不回显任何密钥值、前缀或长度**，
  // 长度也会泄漏信息。每一项都是「有没有配」，不是「配的是什么」。
  if (u0.searchParams.get('doctor') === '1') {
    const card = !!env.ADS_PAYMENT_LINK;
    const hook = !!env.STRIPE_WEBHOOK_SECRET;
    const wallet = !!env.ADS_WALLET;
    const price = Number(env.ADS_PRICE_CENTS || 0) || 0;
    const claim = !!env.ADS_WATCH_SECRET;
    // 能不能收钱 = 至少一条轨齐全，且价格已设（没有价格时下单接口直接 not_configured）
    const cardReady = card && hook && price > 0;
    const walletReady = wallet && price > 0 && claim;
    const blockers = [];
    if (!price) blockers.push('ADS_PRICE_CENTS 未设（价格为 0，下单接口会直接拒绝）');
    if (!card && !wallet) blockers.push('两条轨都没配：卡轨需 ADS_PAYMENT_LINK，钱包轨需 ADS_WALLET');
    if (card && !hook) blockers.push('卡轨缺 STRIPE_WEBHOOK_SECRET —— 买家能付款，但付完不会自动上架');
    if (wallet && !claim) blockers.push('钱包轨缺 ADS_WATCH_SECRET —— 链上轮询无法回写，付款后不会自动上架');
    return json({
      ok: true,
      selling: cardReady || walletReady,
      rails: { card: cardReady, wallet: walletReady },
      configured: { payment_link: card, stripe_webhook: hook, wallet: wallet, claim_secret: claim },
      price_cents: price, currency: String(env.ADS_CURRENCY || 'EUR').toUpperCase(), days: Number(env.ADS_DAYS || 30),
      blockers,
      hint: 'selling=false 时投放页会如实显示「未开售」。配置步骤见 sites/baipiaoji/docs/OWNER-SETUP-收款.md',
    });
  }
  if (!env.HITS) return json({ ok: true, ads: [] });
  const u = u0;
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
