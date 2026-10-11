// Public aggregate reads only. Cache writes never mutate customer or D1 data.
export const AGGREGATE_VERSION = 'fleet-aggregate-20261011.1';
const TTL = 3600;
function copy(response, headers, head = false) {
  return new Response(head ? null : response.body, {status: response.status, headers});
}
export async function withAggregateCache(request, handler) {
  const head = request.method === 'HEAD';
  if (!['GET', 'HEAD'].includes(request.method)) return handler(request);
  const url = new URL(request.url);
  const useCache = !url.searchParams.has('qa') || url.searchParams.get('qa') === '0';
  const cache = useCache ? globalThis.caches?.default : undefined;
  // HEAD and GET share the same cached JSON, without altering the public URL.
  const normalized = new Request(request, {method: 'GET'});
  const key = new Request(url.toString(), {method: 'GET'});
  if (cache) {
    try {
      const stored = await cache.match(key);
      if (stored?.ok && stored.headers.get('X-Fleet-Aggregate-Version') === AGGREGATE_VERSION) {
        const generated = Date.parse(stored.headers.get('X-Fleet-Aggregate-Cached-At'));
        const age = Math.floor((Date.now() - generated) / 1000);
        if (Number.isFinite(age) && age >= 0 && age < TTL) {
          const headers = new Headers(stored.headers);
          headers.set('X-Fleet-Aggregate-Cache', 'hit');
          headers.set('Age', String(age));
          return copy(stored, headers, head);
        }
      }
    } catch { /* Cache failure must not manufacture metrics or prevent the read. */ }
  }
  const response = await handler(normalized);
  const headers = new Headers(response.headers);
  headers.set('X-Fleet-Aggregate-Version', AGGREGATE_VERSION);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  // Never retain errors, private responses or Set-Cookie responses in public cache.
  const successful = response.status === 200 && !headers.has('Set-Cookie') && !/private|no-store/i.test(headers.get('Cache-Control') || '');
  const cacheable = useCache && successful;
  headers.set('Cache-Control', cacheable ? 'public, max-age=3600' : 'no-store');
  headers.set('X-Fleet-Aggregate-Cache', cacheable ? (cache ? 'miss' : 'unavailable') : 'bypass');
  if (cacheable) {
    headers.set('X-Fleet-Aggregate-Cached-At', new Date().toISOString());
    headers.set('Age', '0');
  }
  const result = copy(response, headers);
  if (cacheable && cache) {
    try { await cache.put(key, result.clone()); }
    catch { result.headers.set('X-Fleet-Aggregate-Cache', 'store-failed'); }
  }
  return head ? copy(result, new Headers(result.headers), true) : result;
}
