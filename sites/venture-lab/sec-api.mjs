import {conceptPath,inspect} from '../../agents/filinglens-mcp/src/engine.mjs';
const error=(message,status,code='request_rejected')=>Response.json({error:message,code},{status,headers:{'Cache-Control':'no-store'}});
export async function secConcept(request,env,fetcher=(...args)=>globalThis.fetch(...args),cache=globalThis.caches?.default){
 if(request.method!=='GET')return error('Use GET.',405);
 const url=new URL(request.url);let source;try{if([...url.searchParams.keys()].some(k=>!['cik','tag'].includes(k)))throw Error('Only cik and tag are accepted.');source=conceptPath(url.searchParams.get('cik'),url.searchParams.get('tag'));}catch(e){return error(e.message,400);}
 const key=new Request(url.origin+'/api/sec-concept?'+new URLSearchParams({cik:String(Number(url.searchParams.get('cik'))),tag:url.searchParams.get('tag')}));
 if(cache){try{const hit=await cache.match(key);if(hit)return hit;}catch{/* Cache is optional; official source access still requires its rate gate. */}}
 if(!env.EVENT_LIMIT)return error('Live lookup is temporarily unavailable. You can open an official SEC JSON file locally.',503,'lookup_unavailable');
 const rate=await env.EVENT_LIMIT.limit({key:'filinglens-sec-origin'});if(!rate.success)return error('Live lookup limit reached. Try later or open an official SEC JSON file locally.',429,'lookup_rate_limit');
 let stage='source_fetch';const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const r=await fetcher(source,{headers:{'User-Agent':'AGI Scorecard FilingLens research contact https://agiscorecard.com','Accept':'application/json'},signal:controller.signal,redirect:'error'});
  if(!r.ok)return error(r.status===404?'This company does not expose that concept in this SEC dataset. Try a different concept.':'SEC could not serve this request. No substitute data was used; try later or open official JSON locally.',r.status===404?404:502,'sec_status_'+r.status);
  stage='source_body';const reader=r.body?.getReader();if(!reader)throw Error('No data');let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000)throw Error('Response limit');chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let off=0;for(const c of chunks){bytes.set(c,off);off+=c.length;}
  stage='source_json';const data=JSON.parse(new TextDecoder().decode(bytes));stage='source_validation';const meta=inspect(data);if(meta.cik!==String(Number(url.searchParams.get('cik')))||meta.tag!==url.searchParams.get('tag'))throw Error('Unexpected SEC response');
  const response=Response.json({data,source_url:source,fetched_at:new Date().toISOString(),cache_policy:'Public source data may be cached for up to 1 hour.'},{headers:{'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
  if(cache){try{await cache.put(key,response.clone());}catch{/* Return already validated official data even if cache storage is unavailable. */}}
  return response;
 }catch{return error('Official data could not be validated or the request timed out. No substitute data was used.',502,stage+'_failed');}finally{clearTimeout(timeout);}
}
