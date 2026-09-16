// 链上收款的回写通道（2026-09-16，owner:「收款如何做？你帮我解决」）。
//
// 它修的是一个**会在收到真钱那天才暴露**的缺陷：`scripts/ad-watch.mjs`（09-11 建）
// 用 D1 REST + CLOUDFLARE_API_TOKEN 读写订单，而本仓自己的 deploy workflow 里就写着
// 「CI 直连 D1 的 REST 导出在舰队里从未成功过一次」——根手册 09-12 与 09-13 两次记录
// 仓里两个 Cloudflare token 都没有 D1 权限。于是钱包轨的真实行为是：
// owner 配好地址 → 买家付款 → 轮询在第一条 SQL 就失败 → 广告永远不上架、买家白付。
// 而且这个失败在 owner 打开开关之前完全看不见（job 被 `if: vars.ADS_WALLET_CHAIN != ''` 跳过）。
//
// 修法沿用舰队 09-13 已验证的那条路子（AI 引荐从 D1 REST 改走各站 `/api/pulse`）：
// **Worker 自带 D1 绑定，零 token**。代价是需要一个共享密钥，但它换掉的是一个
// 带 D1 写权限的 Cloudflare API token——在公开仓里，后者的爆炸半径大得多。
//
// 三条硬规矩：
// ① 不信任调用方：金额、状态、是否重复，全部在服务端按 ads 行重新核对一遍。
//    调用方只是「我看到链上有这么一笔」，它没有资格宣布一个位子该上架
//    （与本仓「执行器不信任台账，同仓同作者也是输入」同一条规矩）。
// ② 幂等以链上交易哈希为键：同一笔交易重投多少次都只上架一次。
// ③ 零 PII：ads 行里只有公开的广告文案与网址，这里不读也不写任何买家身份信息。
const enc = new TextEncoder();

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

// 定长比较：这个端点会被反复调用，逐字符早退会泄漏密钥前缀
function equal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function onRequestPost({ request, env }) {
  const secret = env.ADS_WATCH_SECRET || '';
  if (!secret || !env.HITS) return json({ ok: false, code: 'not_configured' }, 503);

  const auth = String(request.headers.get('Authorization') || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !equal(token, secret)) return json({ ok: false, code: 'unauthorized' }, 401);

  const b = await request.json().catch(() => ({}));
  const action = String(b.action || '');

  // ── 取待付订单 ──
  // 只回轮询匹配金额所需的四个字段。price_cents 为空的行不回:那种行没法用「唯一金额」认领。
  if (action === 'pending') {
    const r = await env.HITS.prepare(
      "SELECT id, cat, url, price_cents FROM ads WHERE status='pending' AND price_cents IS NOT NULL"
    ).all().catch(() => null);
    return json({ ok: true, pending: (r && r.results) || [] });
  }

  // ── 认领一笔到账 → 上架 ──
  if (action !== 'claim') return json({ ok: false, code: 'bad_action' }, 400);

  const id = String(b.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 20);
  const hash = String(b.hash || '').replace(/[^a-z0-9x]/gi, '').slice(0, 80);
  const cents = Number(b.cents);
  const unit = String(b.token || 'USDT').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  if (!id || !hash || !Number.isFinite(cents) || cents <= 0) return json({ ok: false, code: 'bad_input' }, 400);

  // ② 幂等：同一笔链上交易只认一次。放在最前面——重投是常态，不是异常。
  const dupe = await env.HITS.prepare('SELECT ad_id FROM ad_orders WHERE session = ?')
    .bind(hash).first().catch(() => null);
  if (dupe) return json({ ok: true, code: 'already' });

  const row = await env.HITS.prepare(
    'SELECT id, cat, url, price_cents, status FROM ads WHERE id = ?').bind(id).first().catch(() => null);
  if (!row) return json({ ok: false, code: 'unknown' }, 404);
  if (row.status !== 'pending') return json({ ok: true, code: 'notpending' });

  // ① 服务端重新核对金额，容差为 0。少付/多付都不上架,也**不自动折算成别的档位**——
  // 静默兜底会把上游问题藏起来。对不上就记一条事件等人处理,而不是让代码替 owner 猜。
  if (Number(row.price_cents) !== cents) {
    await env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
      .bind(new Date().toISOString().slice(0, 10), `/ad/mismatch/${id}`, 'zh', '', '', 'ad_mismatch')
      .run().catch(() => {});
    return json({ ok: false, code: 'amount_mismatch', want: Number(row.price_cents), got: cents }, 409);
  }

  const days = Number(env.ADS_DAYS || 30);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const expDay = new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
  const amount = `${cents} ${unit}`;

  const res = await env.HITS.prepare(
    "UPDATE ads SET status='live', paid_at=?, expires=?, amount=?, session=? WHERE id=? AND status='pending'"
  ).bind(today, expDay, amount, hash, id).run().catch(() => null);
  // D1 的 .run() 即使一行都没改也返回真值,必须读 changes——否则竞态下会报「已上架」而实际没动
  if (!(res && res.meta && res.meta.changes === 1)) return json({ ok: true, code: 'nochange' });

  await env.HITS.prepare(
    'INSERT OR IGNORE INTO ad_orders (ad_id, session, event_id, paid_at, amount, cat, url, starts, expires) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, hash, hash, now.toISOString(), amount, row.cat || '', row.url || '', today, expDay)
    .run().catch(() => {});

  await env.HITS.prepare('INSERT INTO hits (d, path, lang, country, ref, ev) VALUES (?,?,?,?,?,?)')
    .bind(today, `/ad/live/${id}`, 'zh', '', '', 'ad_live').run().catch(() => {});

  return json({ ok: true, code: 'live', id, expires: expDay });
}
