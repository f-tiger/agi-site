// /api/reach 的服务端缓存（2026-09-26）。
//
// 为什么需要：reach.js 原来只设了 `Cache-Control: public, max-age=3600`，注释写着「缓存一小时挡住重复取数」。
// 但 Cloudflare 不会替 Pages Functions 的响应做缓存，这个头只对浏览器有用——每个请求都在 D1 里把 hits 读一遍。
// 09-25 它被调了三四十次（每次部署自检、heartbeat 的五个脚本、eco 部署的 household_live、外部调用），
// 一天读了约 400 万行，是全账号 D1 免费额度（每天 500 万行）被用完的最大原因。
//
// 规矩（scripts/test-reach-cache.mjs 逐条断言）：
//   · 键只含版本号与 days，别的查询参数一律不进键——随手加个参数不能把缓存打穿；
//   · 响应形状一改就把 VERSION 加一，否则部署后一小时内还会返回旧形状；
//   · 同一 isolate 里同时到的未命中只算一次；
//   · 只缓存 ok:true 的 200；失败、超时、缓存本身出错都照原样现算或返回，不缓存错误；
//   · 命中时返回剩余的新鲜时间，不把一小时重新算起。
export const REACH_CACHE_VERSION = 'v2';
export const REACH_TTL = 3600;

export function createReachCache({ getCache = () => globalThis.caches?.default, now = Date.now } = {}) {
  const pending = new Map();

  const keyOf = (url, days) => {
    const k = new URL(url);
    k.pathname = `/__bpj-cache/reach/${REACH_CACHE_VERSION}/${days}`;
    k.search = ''; k.hash = '';
    return new Request(k.toString(), { method: 'GET' });
  };

  async function freshFor(res) {
    if (res.status !== 200 || res.headers.has('set-cookie')) return 0;
    try {
      const body = await res.clone().json();
      const age = (now() - Date.parse(body.generated)) / 1000;
      return body.ok === true && Number.isFinite(age) && age >= 0 && age < REACH_TTL
        ? Math.max(1, Math.floor(REACH_TTL - age)) : 0;
    } catch { return 0; }
  }

  function mark(res, state, seconds) {
    const out = new Response(res.body, res);
    out.headers.set('x-bpj-reach-cache', state);
    out.headers.set('cache-control', seconds ? `public, max-age=${seconds}` : 'no-store');
    return out;
  }

  return async function cachedReach(ctx, days, compute) {
    const request = ctx && ctx.request;
    if (!request || request.method !== 'GET') return compute();
    let cache;
    try { cache = getCache(); } catch { cache = null; }
    if (!cache) return compute();
    const key = keyOf(request.url, days);
    try {
      const hit = await cache.match(key);
      if (hit) { const left = await freshFor(hit); if (left) return mark(hit, 'hit', left); }
    } catch { /* 缓存坏了就现算，统计接口不能因为缓存挂掉 */ }
    if (pending.has(key.url)) return (await pending.get(key.url)).clone();
    const work = (async () => {
      const res = await compute();
      const left = await freshFor(res);
      if (!left) return mark(res, 'bypass', 0);
      const out = mark(res, 'miss', left);
      const save = Promise.resolve().then(() => cache.put(key, out.clone())).catch(() => {});
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(save); else await save;
      return out;
    })();
    pending.set(key.url, work);
    try { return (await work).clone(); } finally { pending.delete(key.url); }
  };
}
