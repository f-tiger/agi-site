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
  const evId = String(ev.id || '').slice(0, 80);
  if (!id) return json({ ok: true, code: 'noref' });

  // 幂等以**事件 id** 为键而不是 session:被忽略与被拒的事件重投时也能一致返回,
  // 而 session 只覆盖成功路径。两个都查,新旧行为都不漏。
  const dupe = await env.HITS.prepare('SELECT ad_id FROM ad_orders WHERE event_id = ? OR session = ?')
    .bind(evId, session).first().catch(() => null);
  if (dupe) return json({ ok: true, code: 'already' });

  // 延迟到账的支付方式(如 SEPA 直接借记)会在钱到之前就触发 completed。
  // 不判这一条,位子会在钱还没到的时候就上线。
  if (s.payment_status && s.payment_status !== 'paid') return json({ ok: true, code: 'unpaid' });

  const row = await env.HITS.prepare(
    'SELECT id, cat, url, price_cents, currency, status FROM ads WHERE id = ?').bind(id).first().catch(() => null);
  if (!row) return json({ ok: true, code: 'unknown' });
  if (row.status !== 'pending') return json({ ok: true, code: 'notpending' });

  // 金额核对。不符一律**拒绝,不自动折算成别的档位**——静默兜底会把上游问题藏起来,
  // 这是本仓既有的规矩(执行器不信任台账,输入先校验再用)。
  // 已知会命中这里的正当情形:中国买家常在付款时代扣 6% 增值税,到账会少于开票额。
  // 那种情况需要 owner 定规则,不是让代码替他猜。
  if (row.price_cents) {
    const amt = Number(s.amount_total);
    const cur = String(s.currency || '').toUpperCase();
    if (amt !== Number(row.price_cents) || (row.currency && cur !== String(row.currency).toUpperCase())) {
      env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
        .bind(new Date().toISOString().slice(0, 10), `/ad/mismatch/${id}`, 'zh', '', '', 'ad_mismatch')
        .run().catch(() => {});
      return json({ ok: true, code: 'amount_mismatch' });
    }
  }

  const days = Number(env.ADS_DAYS || 30);
  const now = new Date();
  const exp = new Date(now.getTime() + days * 86400000);
  const today = now.toISOString().slice(0, 10);
  const expDay = exp.toISOString().slice(0, 10);
  // 金额只存 Stripe 报的分值与币种,不做任何换算——换算等于自己编一个数字
  const amount = s.amount_total != null ? `${s.amount_total} ${String(s.currency || '').toUpperCase()}` : '';

  const res = await env.HITS.prepare(
    "UPDATE ads SET status='live', paid_at=?, expires=?, amount=?, session=? WHERE id=? AND status='pending'"
  ).bind(today, expDay, amount, session, id).run().catch(() => null);

  // D1 的 .run() 即使一行都没改也返回真值,所以必须读 changes——否则竞态下会打出
  // 「已上架」的点位和返回码,而实际什么都没发生。
  const changed = res && res.meta && res.meta.changes === 1;
  if (!changed) return json({ ok: true, code: 'nochange' });

  // 拒付抗辩的唯一证据。广告展示位是最难自证交付的品类之一,而争议费不可退,
  // 一笔 €50 的争议就吃掉好几笔交易的手续费空间。
  // 隐私红线:只写订单与投放事实,不写买家邮箱、姓名或任何身份信息。
  await env.HITS.prepare(
    'INSERT OR IGNORE INTO ad_orders (ad_id, session, event_id, paid_at, amount, cat, url, starts, expires) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, session, evId, now.toISOString(), amount, row.cat || '', row.url || '', today, expDay)
    .run().catch(() => {});

  // 打点只记事件与品类,不记买家任何信息(公开仓隐私红线)
  env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
    .bind(today, `/ad/live/${id}`, 'zh', '', '', 'ad_live').run().catch(() => {});

  return json({ ok: true, code: 'live' });
}
