// fleet-x-poster: 每日从队列自动发一条到 owner 本人的 X 账号。
//
// 营销铁律修订(owner 2026-08-21「突破铁律…我说的是营销铁律…按照技能或者mcp解决」):
// 「机器不代发」对 X 渠道解除——依据是 X 官方 API 支持本人账号自动化,这是唯一
// 不烧号、不毁渠道的代发口子。Reddit/HN 仍必须 owner 手发(社区规范,不可自动化)。
//
// 设计约束:
// - 无密钥 = 静默跳过(部署常绿,管道休眠);密钥经 GitHub Secrets → wrangler secret 注入。
// - 每天最多发一个队列项(单条或整条线程);KV 记账,绝不重发。
// - 队列在 queue.js,随仓库版本化——每周分发循环往里追加,人审历史全在 git。
// - 发不出去(4xx/5xx)只记 KV 错误、下轮重试同一项,连续 3 次失败后跳过并标记,
//   不无限撞墙。
import QUEUE from './queue.js';

const pe = (s) => encodeURIComponent(s).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

async function hmacSha1(key, base) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(base));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function oauthHeader(method, url, env) {
  const p = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  const paramStr = Object.keys(p).sort().map((k) => pe(k) + '=' + pe(p[k])).join('&');
  const base = [method.toUpperCase(), pe(url), pe(paramStr)].join('&');
  p.oauth_signature = await hmacSha1(pe(env.X_API_SECRET) + '&' + pe(env.X_ACCESS_SECRET), base);
  return 'OAuth ' + Object.keys(p).sort().map((k) => pe(k) + '="' + pe(p[k]) + '"').join(', ');
}

async function postTweet(env, text, replyTo) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = replyTo ? { text, reply: { in_reply_to_tweet_id: replyTo } } : { text };
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: await oauthHeader('POST', url, env),
    },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('x_api_' + r.status + ':' + JSON.stringify(j).slice(0, 200));
  return j.data && j.data.id;
}

async function runOnce(env) {
  if (!(env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_SECRET)) {
    return { ok: false, note: 'no X credentials — dormant (owner: paste keys into GitHub repo secrets to arm)' };
  }
  const today = new Date().toISOString().slice(0, 10);
  if ((await env.STATE.get('last_run_day')) === today) return { ok: true, note: 'already ran today' };

  let item = null;
  for (const q of QUEUE) {
    if (await env.STATE.get('posted:' + q.id)) continue;
    const fails = parseInt((await env.STATE.get('fails:' + q.id)) || '0', 10);
    if (fails >= 3) { await env.STATE.put('posted:' + q.id, 'skipped_after_3_fails'); continue; }
    item = q; break;
  }
  if (!item) return { ok: true, note: 'queue drained' };

  const parts = item.thread || [item.text];
  if (parts.some((t) => !t || t.length > 280)) {
    await env.STATE.put('posted:' + item.id, 'skipped_over_280');
    return { ok: false, note: 'item ' + item.id + ' has a part over 280 chars, skipped' };
  }
  try {
    let prev = null;
    const ids = [];
    for (const t of parts) {
      prev = await postTweet(env, t, prev);
      ids.push(prev);
      if (parts.length > 1) await new Promise((res) => setTimeout(res, 1500));
    }
    await env.STATE.put('posted:' + item.id, JSON.stringify({ day: today, tweet_ids: ids }));
    await env.STATE.put('last_run_day', today);
    return { ok: true, posted: item.id, tweets: ids.length };
  } catch (e) {
    const msg = (e && e.message) || '';
    // 402 credits depleted / 429 限流是账户级状态,不是这条内容有毒——不消耗
    // 条目失败配额(否则积分未充期间队列会被逐条误跳过),还顺手清掉历史误计。
    if (/x_api_402|x_api_429|credits.depleted/i.test(msg)) {
      await env.STATE.delete('fails:' + item.id);
      return { ok: false, note: 'account-level block, item untouched: ' + msg };
    }
    const k = 'fails:' + item.id;
    const fails = parseInt((await env.STATE.get(k)) || '0', 10) + 1;
    await env.STATE.put(k, String(fails));
    return { ok: false, note: 'post failed (' + fails + '/3) for ' + item.id + ': ' + msg };
  }
}

export default {
  // 账号免费版 5 个 CF cron 已满(code 10072),故不用 scheduled;调度方是
  // GitHub Actions schedule(x-poster-cron.yml)每日 POST /run。
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/run' && request.method === 'POST') {
      if (!env.X_RUN_KEY) return new Response(JSON.stringify({ ok: false, note: 'X_RUN_KEY not set — not armed' }), { status: 503, headers: { 'content-type': 'application/json' } });
      if (request.headers.get('x-run-key') !== env.X_RUN_KEY) return new Response('forbidden', { status: 403 });
      const r = await runOnce(env);
      return new Response(JSON.stringify(r), { status: r.ok ? 200 : 500, headers: { 'content-type': 'application/json' } });
    }
    // 体检:GET /status 返回队列与发送状态(无密钥也可看),不暴露任何 secret。
    if (url.pathname === '/status') {
      const out = { armed: !!(env.X_API_KEY && env.X_ACCESS_TOKEN && env.X_RUN_KEY), queue: [] };
      for (const q of QUEUE) {
        out.queue.push({ id: q.id, parts: (q.thread || [q.text]).length, state: (await env.STATE.get('posted:' + q.id)) || 'pending' });
      }
      return new Response(JSON.stringify(out, null, 1), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('fleet-x-poster: POST /run (keyed) or GET /status', { status: 200 });
  },
};
