// 付费能力的校验端点。刻意不绑定任何支付商——现在一个账号都没有，接一家就绑一家。
// 形态：owner 用任意渠道收款后，用 scripts/license.mjs 线下签发一枚授权码；
// 前端把码交到这里换取「能不能用付费能力」的判定。将来接 Stripe/Paddle/爱发电都行，
// 授权码这一层不用改。
//
// 授权码里只有「档位 + 到期日 + 随机串」，不含任何个人信息——校验也就不需要数据库。
// 格式：bpj.<tier>.<expDays>.<nonce>.<sig>，sig = HMAC-SHA256(LICENSE_SECRET, 前四段)
//
// PAID_ENABLED 未置为 'true' 时一律返回 disabled：按 PRD-revenue 的硬规则，
// 三级证据门槛未达标不上收费。机制先建好，开关后开——边际成本为零，将来不用返工。

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

// 定长比较：授权码校验是可被反复调用的端点，逐字符早退会泄漏签名前缀。
function equal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  },
});

export async function onRequest(ctx) {
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    } });
  }
  if (ctx.request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);

  if (ctx.env.PAID_ENABLED !== 'true') return json({ ok: false, reason: 'disabled' });
  if (!ctx.env.LICENSE_SECRET) return json({ ok: false, reason: 'not_configured' });

  let key = '';
  try { key = String((await ctx.request.json()).key || '').trim(); } catch (e) { /* 空体按无码处理 */ }
  if (!key) return json({ ok: false, reason: 'missing' });

  const p = key.split('.');
  if (p.length !== 5 || p[0] !== 'bpj') return json({ ok: false, reason: 'malformed' });
  const [, tier, expDays, , sig] = p;

  const want = await sign(ctx.env.LICENSE_SECRET, p.slice(0, 4).join('.'));
  if (!equal(sig, want)) return json({ ok: false, reason: 'bad_signature' });

  const exp = Number(expDays) * 86400000;
  if (!Number.isFinite(exp) || Date.now() > exp) return json({ ok: false, reason: 'expired' });

  return json({ ok: true, tier, expires: new Date(exp).toISOString().slice(0, 10) });
}
