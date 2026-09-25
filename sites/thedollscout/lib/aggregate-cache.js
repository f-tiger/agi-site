// Cache only successful public aggregates. Never cache orders, credentials or writes.
export async function cachedAggregate(ctx, compute, cache = globalThis.caches?.default) {
  const {request}=ctx;
  if (!cache || !request || request.headers.has('x-probe')) return compute();
  const url=new URL(request.url); url.search='';
  const key=new Request(url.toString(),{method:'GET'});
  try { const hit=await cache.match(key); if(hit){const out=new Response(hit.body,hit);out.headers.set('x-tds-aggregate-cache','hit');return out;} } catch {}
  const response=await compute();
  if (!response.ok) return response;
  const out=new Response(response.body,response);
  out.headers.set('cache-control','public, max-age=300');
  out.headers.set('x-tds-aggregate-cache','miss');
  const save=cache.put(key,out.clone()).catch(()=>{});
  if(typeof ctx.waitUntil==='function')ctx.waitUntil(save);else await save;
  return out;
}
