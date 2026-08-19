// 监控注册：把「关注这些工具的额度/条款变更」登记成一条 watch。
// PRD-watch 的 MVP。交付走 webhook 而不是邮件——邮件卡在服务商密钥上，webhook 不卡任何人，
// 且它的使用者（接 Slack/Discord/自动化的开发者）恰好是付费意愿最高的那批人。
//
// POST /api/watch   { hook, slugs: ["kimi","suno"], key? }   → { ok, id, token, tier, slugs }
// DELETE /api/watch { hook, token }                          → { ok }
//
// 免费档 3 个工具、Pro（授权码）全量——遵循调研确认的行规：免费不卡核心能力。
// 同一 webhook URL 只有一条 watch（upsert 需带 token，防止别人抢注/篡改）。

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// 与 /api/entitlement 同一套授权码（bpj.<tier>.<expDays>.<nonce>.<sig>）。
// 这里独立校验而不依赖 PAID_ENABLED：那个开关管的是「收款入口」，
// 不是「已签发的码是否有效」。未开卖时市面上本来就没有码，两者不冲突。
async function tierOf(env, key) {
  if (!key || !env.LICENSE_SECRET) return 'free';
  const p = String(key).trim().split('.');
  if (p.length !== 5 || p[0] !== 'bpj') return 'free';
  const want = await hmac(env.LICENSE_SECRET, p.slice(0, 4).join('.'));
  if (!equal(p[4], want)) return 'free';
  if (Date.now() > Number(p[2]) * 86400000) return 'free';
  return p[1];
}

// SSRF 守门：只收公网 https。Workers 的出网本身到不了内网，但纵深防御不省。
function hookProblem(hook) {
  let u;
  try { u = new URL(hook); } catch { return 'not_a_url'; }
  if (u.protocol !== 'https:') return 'https_only';
  const h = u.hostname;
  if (!h.includes('.')) return 'bare_host';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':')) return 'ip_literal';
  if (/\.(local|internal|lan|home|corp)$|(^|\.)localhost$/i.test(h)) return 'private_host';
  if (hook.length > 500) return 'too_long';
  return null;
}

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  },
});

const FREE_MAX = 3;


// 注册主体，独立导出：/api/mcp 的 watch_free_tier_changes 工具复用同一段逻辑——
// 校验、免费档上限、SSRF 守门若写两份迟早分叉。
export async function registerWatch(env, origin, b) {
  const hook = String(b.hook || '').trim();
  const prob = hookProblem(hook);
  if (prob) return { status: 400, body: { ok: false, reason: prob } };

  const tier = await tierOf(env, b.key);
  let slugs = Array.isArray(b.slugs) ? b.slugs.map((s) => String(s).trim().toLowerCase()).filter((s) => /^[a-z0-9-]{1,60}$/.test(s)) : [];
  slugs = [...new Set(slugs)];
  const wantAll = b.slugs === '*' || slugs.includes('*');

  const dir = await (await env.ASSETS.fetch(new URL('/directory.json', origin))).json();
  const known = new Set((dir.tools || []).map((t) => t.slug));
  const bad = slugs.filter((s) => s !== '*' && !known.has(s));
  if (bad.length) return { status: 400, body: { ok: false, reason: 'unknown_slugs', unknown: bad } };

  if (tier === 'free') {
    if (wantAll) return { status: 402, body: { ok: false, reason: 'all_requires_pro', free_max: FREE_MAX } };
    if (slugs.length === 0) return { status: 400, body: { ok: false, reason: 'no_slugs' } };
    if (slugs.length > FREE_MAX) return { status: 402, body: { ok: false, reason: 'free_limit', free_max: FREE_MAX } };
  } else if (wantAll) {
    slugs = ['*'];
  } else if (slugs.length === 0) {
    return { status: 400, body: { ok: false, reason: 'no_slugs' } };
  }

  const existing = await env.HITS.prepare('SELECT token FROM watches WHERE hook=?').bind(hook).first();
  if (existing) {
    if (!equal(String(b.token || ''), existing.token)) return { status: 409, body: { ok: false, reason: 'exists_needs_token' } };
    await env.HITS.prepare('UPDATE watches SET slugs=?, tier=? WHERE hook=?')
      .bind(slugs.join(','), tier, hook).run();
    return { status: 200, body: { ok: true, updated: true, tier, slugs } };
  }
  const token = b64u(crypto.getRandomValues(new Uint8Array(18)));
  await env.HITS.prepare('INSERT INTO watches (hook, slugs, tier, token, created) VALUES (?,?,?,?,?)')
    .bind(hook, slugs.join(','), tier, token, new Date().toISOString().slice(0, 10)).run();
  return { status: 200, body: { ok: true, token, tier, slugs, note: 'Keep the token: it is the only way to update or delete this watch.' } };
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type',
    } });
  }
  if (!env.HITS) return json({ ok: false, reason: 'no_db' }, 500);

  let b = {};
  try { b = await request.json(); } catch { /* 按空体走，下面各自校验 */ }
  const hook = String(b.hook || '').trim();

  if (request.method === 'DELETE') {
    const token = String(b.token || '').trim();
    if (!hook || !token) return json({ ok: false, reason: 'missing' }, 400);
    const row = await env.HITS.prepare('SELECT token FROM watches WHERE hook=?').bind(hook).first();
    if (!row || !equal(row.token, token)) return json({ ok: false, reason: 'not_found_or_bad_token' }, 404);
    await env.HITS.prepare('DELETE FROM watches WHERE hook=?').bind(hook).run();
    return json({ ok: true });
  }

  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);

  const r = await registerWatch(env, new URL(request.url).origin, b);
  return json(r.body, r.status);
}
