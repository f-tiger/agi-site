import {claims,interviews,reviewed} from '../../foresight-assets/catalog.mjs';
import {rank,safeURL,calculate} from '../../jarvis-assets/core.mjs';
export const catalog=lang=>claims.map(c=>({id:'view-'+c.id,title:c[lang].title,description:c[lang].summary+' '+c[lang].limit,url:'https://agiscorecard.com'+(lang==='zh'?'/zh':'')+'/future-guide/'+c.id,publishedAt:interviews[c.interview].date,checkedAt:reviewed,kind:'editorial_view',sourceURL:interviews[c.interview].source}));
export async function availableCatalog(lang,assets){
 const rows=catalog(lang);if(!assets)return {rows,discoveryLoaded:false};
 try{const r=await assets.fetch(new Request('https://agiscorecard.com/foresight-assets/discovery.json'));if(!r.ok)throw Error('snapshot_unavailable');const text=await r.text();if(text.length>4000000)throw Error('snapshot_too_large');const j=JSON.parse(text);if(!Array.isArray(j.items))throw Error('snapshot_invalid');for(const x of j.items.slice(0,3000)){if(!safeURL(x.url)||typeof x.title!=='string')continue;rows.push({id:'discovery-'+String(x.id).replace(/[^a-z0-9-]/gi,'').slice(0,50),title:x.title.slice(0,200),description:(lang==='zh'?'自动发现的标题与发布者摘要，未核阅节目全文：':'Discovered title and publisher excerpt; full program not reviewed: ')+String(x.publisherExcerpt||'').slice(0,300),url:x.url,kind:'discovered_metadata',publishedAt:x.publishedAt,checkedAt:x.firstSeenAt});}return {rows,discoveryLoaded:true};}catch{return {rows,discoveryLoaded:false};}
}
export async function boundedJSON(url,fetcher=fetch){
 let response;try{response=await fetcher(url,{redirect:'manual',headers:{accept:'application/json','user-agent':'AGI-Jarvis/0.1 (+https://agiscorecard.com/jarvis)'},signal:AbortSignal.timeout(8000)});}catch{throw Error('source_network_error');}
 // workerd does not implement redirect:error. Manual + status rejection keeps
 // the no-redirect boundary without relying on Node-only behavior.
 if(response.status>=300&&response.status<400)throw Error('source_redirect_blocked');
 if(!response.ok)throw Error('source_http_'+response.status);
 const reader=response.body.getReader();let length=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>350000)throw Error('source_too_large');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const all=new Uint8Array(length);let i=0;for(const p of parts){all.set(p,i);i+=p.length;}
 try{return JSON.parse(new TextDecoder().decode(all));}catch{throw Error('source_invalid');}
}
export async function runTool(action,input,fetcher=fetch,library=null){
 const checkedAt=new Date().toISOString();
 if(action.tool==='catalog_search')return rank(action.query,library||catalog(input.lang));
 if(action.tool==='calculate'){const result=calculate(action.query);return [{id:'calc-'+result.expression.replace(/\s/g,''),title:result.expression,description:String(result.value),kind:'arithmetic',checkedAt}];}
 if(!input.web)throw Error('tool_not_allowed');
 if(typeof input.publicQuery!=='string'||!input.publicQuery.trim()||input.publicQuery.length>160)throw Error('tool_not_allowed');
 // Only explicitly enabled keyword search. No arbitrary URL fetch, redirect, shell or writes.
 if(action.tool==='github_search'){
  const url=new URL('https://api.github.com/search/repositories');url.search=new URLSearchParams({q:input.publicQuery+' archived:false',sort:'stars',order:'desc',per_page:'4'});
  const j=await boundedJSON(url,fetcher);if(!Array.isArray(j.items))throw Error('source_invalid');
  return j.items.slice(0,4).filter(x=>safeURL(x.html_url)&&new URL(x.html_url).hostname==='github.com').map(x=>({id:'github-'+x.id,title:String(x.full_name).slice(0,160),description:String(x.description||'').slice(0,700),url:x.html_url,kind:'repository_metadata',stars:x.stargazers_count,updatedAt:x.updated_at,checkedAt}));
 }
 if(action.tool==='hackernews_search'){
  const url=new URL('https://hn.algolia.com/api/v1/search_by_date');url.search=new URLSearchParams({query:input.publicQuery,tags:'story',hitsPerPage:'4'});
  const j=await boundedJSON(url,fetcher);if(!Array.isArray(j.hits))throw Error('source_invalid');
  return j.hits.slice(0,4).filter(x=>/^\d+$/.test(x.objectID)).map(x=>({id:'hn-'+x.objectID,title:String(x.title||'').slice(0,200),description:'Hacker News discussion metadata; article body and comments have not been reviewed.',url:'https://news.ycombinator.com/item?id='+x.objectID,kind:'discussion_metadata',publishedAt:x.created_at,checkedAt}));
 }throw Error('tool_not_allowed');
}
