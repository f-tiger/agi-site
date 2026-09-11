// 付款成功 → 广告自动上架。这一端点就是「零人工」那句话的全部实现:
// Stripe 收到钱后调它,它把草稿行翻成 live 并算好到期日,owner 不参与。
//
// 签名校验不可省略。这个 URL 是公开的,任何人都能 POST 一个「付款成功」过来;
// 不验签就等于把免费广告位挂在公网上。Stripe 的方案是对 "<timestamp>.<raw body>"
// 做 HMAC-SHA256,把结果与 Stripe-Signature 头里的 v1 值比。必须用**原始 body**
// 验签(JSON.parse 再 stringify 会改字节,签名就永远对不上)。
//
// 幂等:Stripe 会重投。用 session id 去重,已处理过的直接返回 200——
// 回 4xx 会让 Stripe 一直重试,把一条正常事件变成告警噪音。
const enc = new TextEncoder();

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 定长比较:验签端点会被反复调用,逐字符早退会泄漏签名前缀
function equal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function verify(secret, header, raw) {
  const parts = Object.fromEntries(String(header || '').split(',')
    .map((p) => p.split('=')).filter((p) => p.length === 2));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // 时间窗:重放一条五分钟前截获的请求应当失败
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)));
  return equal(sig, v1);
}

export async function onRequestPost({ request, env }) {
  const secret = env.STRIPE_WEBHOOK_SECRET || '';
  if (!secret || !env.HITS) return json({ ok: false, code: 'not_configured' }, 503);

  const raw = await request.text();
  const ok = await verify(secret, request.headers.get('Stripe-Signature'), raw).catch(() => false);
  if (!ok) return json({ ok: false, code: 'badsig' }, 400);

  let ev;
  try { ev = JSON.parse(raw); } catch { return json({ ok: false, code: 'badjson' }, 400); }
  // 只认这一个事件:它是「钱已到」的那一刻。其余事件一律 200 忽略,不报错。
  if (ev.type !== 'checkout.session.completed') return json({ ok: true, code: 'ignored' });

  const s = ev.data && ev.data.object ? ev.data.object : {};
  const id = String(s.client_reference_id || '').replace(/[^a-z0-9]/gi, '').slice(0, 20);
  const session = String(s.id || '').slice(0, 80);
  if (!id) return json({ ok: true, code: 'noref' });

  // 幂等:同一个 session 再来一次就直接成功返回
  const dupe = await env.HITS.prepare('SELECT id FROM ads WHERE session = ?')
    .bind(session).first().catch(() => null);
  if (dupe) return json({ ok: true, code: 'already' });

  const days = Number(env.ADS_DAYS || 30);
  const now = new Date();
  const exp = new Date(now.getTime() + days * 86400000);
  // 金额只存 Stripe 报的分值与币种,不做任何换算——换算等于自己编一个数字
  const amount = s.amount_total != null ? `${s.amount_total} ${String(s.currency || '').toUpperCase()}` : '';

  const res = await env.HITS.prepare(
    "UPDATE ads SET status='live', paid_at=?, expires=?, amount=?, session=? WHERE id=? AND status='pending'"
  ).bind(now.toISOString().slice(0, 10), exp.toISOString().slice(0, 10), amount, session, id).run()
    .catch(() => null);

  // 打点只记事件与品类,不记买家任何信息(公开仓隐私红线)
  if (res) {
    env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(now.toISOString().slice(0, 10), `/ad/live/${id}`, 'zh', '', '', 'ad_live')
      .run().catch(() => {});
  }
  return json({ ok: true, code: 'live' });
}
