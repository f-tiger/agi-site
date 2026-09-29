import {normalizeGrowthEvent, recordGrowthEvent, readGrowthMeasurement} from '../../lib/growth-measurement.js';
import {campaignPage, cleanPath} from '../../lib/growth-campaigns.js';
import {createReachCache} from '../../lib/reach-cache.js';
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const cache = createReachCache({cachePath:'/__bpj-cache/growth/v1'});
export async function onRequestGet(ctx) {
  const days = Number(new URL(ctx.request.url).searchParams.get('days') || 28);
  if (![7,14,28].includes(days)) return json({ok:false,code:'invalid_window'},400);
  return cache(ctx, days, async () => {
    const result = await readGrowthMeasurement(ctx.env.HITS, days);
    return json(result, result.ok ? 200 : 503);
  });
}
export async function onRequestPost({request,env}) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return json({ok:false,code:'origin'},403);
  const ua = request.headers.get('user-agent') || '';
  if (!ua || /bot|crawler|spider|headless|curl|wget|python|node|playwright|probe|selftest/i.test(ua) || request.cf?.botManagement?.verifiedBot || request.headers.get('dnt')==='1' || request.headers.get('sec-gpc')==='1') return json({ok:true,ignored:true});
  let ref;
  try { ref = new URL(request.headers.get('referer')); } catch { return json({ok:false,code:'page'},400); }
  if (ref.origin !== url.origin || !campaignPage(ref.pathname) || [...ref.searchParams.keys()].some(k => ['__ci','__probe','qa'].includes(k))) return json({ok:true,ignored:true});
  if (Number(request.headers.get('content-length') || 0)>2048) return json({ok:false,code:'too_large'},413);
  try {
    const text = await request.text();
    if (text.length>2048) return json({ok:false,code:'too_large'},413);
    const event = normalizeGrowthEvent(JSON.parse(text));
    if (!event || event.path !== cleanPath(ref.pathname)) return json({ok:false,code:'event'},400);
    if (!env.HITS) return json({ok:false,code:'unavailable'},503);
    const accepted = await recordGrowthEvent(env.HITS,event);
    return json({ok:true,accepted});
  } catch (error) { return json({ok:false,code:error instanceof SyntaxError ? 'invalid_json' : 'unavailable'},error instanceof SyntaxError ? 400 : 503); }
}
