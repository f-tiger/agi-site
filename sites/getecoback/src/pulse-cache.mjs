// Public aggregate only. Payment, identity, writes and geo never enter this cache.
const TTL = 3600;
export function createPulseCache({getCache = () => globalThis.caches?.default, now = Date.now} = {}) {
  const pending = new Map();
  async function remaining(response) {
    if (response.status !== 200 || response.headers.has('set-cookie')) return 0;
    if (/private|no-store/i.test(response.headers.get('cache-control') || '')) return 0;
    try {
      const data = await response.clone().json();
      const age = (now() - Date.parse(data.generated)) / 1000;
      return data.ok === true && data.money && Number.isFinite(age) && age >= 0 && age < TTL
        ? Math.max(1, Math.floor(TTL - age)) : 0;
    } catch { return 0; }
  }
  function marked(response, state, seconds) {
    const out = new Response(response.body, response);
    out.headers.set('x-eco-pulse-cache', state);
    out.headers.set('cache-control', 'public, max-age=' + seconds);
    return out;
  }
  return async function pulseCache(request, compute) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.hostname !== 'getecoback.com' || url.pathname !== '/api/pulse'
      || request.headers.has('authorization') || request.headers.has('cookie')) return compute();
    let cache;
    try { cache = getCache(); } catch { return compute(); }
    if (!cache) return compute();
    // Queries do not change this endpoint's aggregate. A random query cannot bust it.
    url.pathname = '/__eco-cache/pulse-v1'; url.search = ''; url.hash = '';
    const key = new Request(url.toString());
    try {
      const hit = await cache.match(key);
      if (hit) { const left = await remaining(hit); if (left) return marked(hit, 'hit', left); }
    } catch { /* Cache failure must not prevent the original endpoint from working. */ }
    if (pending.has(key.url)) return (await pending.get(key.url)).clone();
    const work = (async () => {
      const response = await compute(), left = await remaining(response);
      if (!left) {
        const out = new Response(response.body, response);
        out.headers.set('cache-control', 'no-store');
        return out;
      }
      const out = marked(response, 'miss', left);
      try { await cache.put(key, out.clone()); } catch {}
      return out;
    })();
    pending.set(key.url, work);
    try { return (await work).clone(); } finally { pending.delete(key.url); }
  };
}
