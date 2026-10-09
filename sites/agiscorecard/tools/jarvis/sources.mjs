import {claims,interviews,reviewed} from '../../foresight-assets/catalog.mjs';
import {evidenceFor} from '../../foresight-assets/commercial.mjs';
import {rank,safeURL,calculate} from '../../jarvis-assets/core.mjs';
import {normalizeContext} from '../../jarvis-assets/handoff.mjs';
import {boundedText} from './security.mjs';
const dateOf=value=>typeof value==='string'&&value.length<=40&&/^\d{4}-\d{2}-\d{2}(?:T[\d:.+Z-]+)?$/.test(value)?value:null;
// The request carries only a versioned reference and self-reported fit. Never
// restore evidence text, URLs, verification or provenance from client fields.
export function contextSources(value,lang='en'){
 const context=normalizeContext(value);if(!context)return [];
 const e=evidenceFor({version:context.evidenceVersion});if(!e)throw Error('invalid_context');
 const language=lang==='zh'?'zh':'en',t=(en,zh)=>language==='zh'?zh:en;
 return e.rows.map(row=>{
  const statement=row.statement[language],restriction=row.limit[language],method=e.method[language],hypothesis=e.hypothesis[language],boundary=e.boundary[language];
  const videoURL=row.start===null?null:'https://www.youtube.com/watch?v='+e.videoId+'&t='+row.start+'s';
  return {id:'context-'+e.version+'-'+row.id,pinned:true,contextKind:context.kind,evidenceVersion:e.version,claimId:e.claimId,
   title:'OpenRouter · '+(row.kind==='official_offer'?t('Official published offer','官方公开报价'):t('Participant account in publisher transcript','发布方文字稿中的参与者自述'))+' · '+row.locator,
   description:[statement,restriction,t('Source: ','出处：')+row.url+' · '+row.locator,...(videoURL?[videoURL]:[]),t('Editorial check: ','人工核对：')+e.checkedAt,t('Interview published: ','访谈发布：')+e.publishedAt,t('Interview first discovered: ','访谈首次发现：')+e.firstSeenAt,method,hypothesis,boundary].join('\n\n'),
   url:row.url,kind:row.kind,statement,limit:restriction,method,hypothesis,boundary,locator:row.locator,start:row.start,videoURL,
   // The interview date is not the publication date of the current price page.
   publishedAt:row.kind==='participant_account'?e.publishedAt:null,interviewPublishedAt:e.publishedAt,firstSeenAt:e.firstSeenAt,checkedAt:e.checkedAt,discoveryId:e.discoveryId,videoId:e.videoId};
 });
}
export const catalog=lang=>claims.map(c=>({id:'view-'+c.id,title:c[lang].title,description:c[lang].summary+' '+c[lang].limit,url:'https://agiscorecard.com'+(lang==='zh'?'/zh':'')+'/future-guide/'+c.id,publishedAt:interviews[c.interview].date,checkedAt:reviewed,kind:'editorial_view',sourceURL:interviews[c.interview].source}));
export async function availableCatalog(lang,assets){
 const rows=catalog(lang);if(!assets)return {rows,discoveryLoaded:false};
 try{const r=await assets.fetch(new Request('https://agiscorecard.com/foresight-assets/discovery.json'));if(!r.ok)throw Error('snapshot_unavailable');const text=await r.text();if(text.length>4000000)throw Error('snapshot_too_large');const j=JSON.parse(text);if(!Array.isArray(j.items))throw Error('snapshot_invalid');for(const x of j.items.slice(0,3000)){if(!safeURL(x.url)||typeof x.title!=='string')continue;rows.push({id:'discovery-'+String(x.id).replace(/[^a-z0-9-]/gi,'').slice(0,50),title:x.title.slice(0,200),description:(lang==='zh'?'自动发现的标题与发布者摘要，未核阅节目全文：':'Discovered title and publisher excerpt; full program not reviewed: ')+String(x.publisherExcerpt||'').slice(0,300),url:x.url,kind:'discovered_metadata',publishedAt:x.publishedAt,checkedAt:x.firstSeenAt});}return {rows,discoveryLoaded:true};}catch{return {rows,discoveryLoaded:false};}
}
export async function boundedJSON(url,fetcher=fetch,{timeoutMs=8000}={}){
 const started=Date.now();let response;try{response=await fetcher(url,{redirect:'manual',headers:{accept:'application/json','user-agent':'AGI-Jarvis/0.1 (+https://agiscorecard.com/jarvis)'},signal:AbortSignal.timeout(timeoutMs)});}catch{throw Error('source_network_error');}
 // workerd does not implement redirect:error. Manual + status rejection keeps
 // the no-redirect boundary without relying on Node-only behavior.
 if(response.status>=300&&response.status<400)throw Error('source_redirect_blocked');
 if(!response.ok)throw Error('source_http_'+response.status);
 const remaining=timeoutMs-(Date.now()-started);if(remaining<=0)throw Error('source_timeout');
 const text=await boundedText(response.body,{maxBytes:350000,timeoutMs:remaining,tooLarge:'source_too_large',timeout:'source_timeout',invalid:'source_invalid'});
 try{return JSON.parse(text);}catch{throw Error('source_invalid');}
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
  return j.items.slice(0,4).filter(x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&typeof x.html_url==='string'&&x.html_url.length<=2048&&safeURL(x.html_url)&&new URL(x.html_url).hostname==='github.com'&&typeof x.full_name==='string').map(x=>({id:'github-'+x.id,title:x.full_name.slice(0,160),description:typeof x.description==='string'?x.description.slice(0,700):'',url:x.html_url,kind:'repository_metadata',stars:Number.isSafeInteger(x.stargazers_count)&&x.stargazers_count>=0?x.stargazers_count:null,updatedAt:dateOf(x.updated_at),checkedAt}));
 }
 if(action.tool==='hackernews_search'){
  const url=new URL('https://hn.algolia.com/api/v1/search_by_date');url.search=new URLSearchParams({query:input.publicQuery,tags:'story',hitsPerPage:'4'});
  const j=await boundedJSON(url,fetcher);if(!Array.isArray(j.hits))throw Error('source_invalid');
  return j.hits.slice(0,4).filter(x=>x&&typeof x.objectID==='string'&&/^\d{1,20}$/.test(x.objectID)&&typeof x.title==='string').map(x=>({id:'hn-'+x.objectID,title:x.title.slice(0,200),description:'Hacker News discussion metadata; article body and comments have not been reviewed.',url:'https://news.ycombinator.com/item?id='+x.objectID,kind:'discussion_metadata',publishedAt:dateOf(x.created_at),checkedAt}));
 }throw Error('tool_not_allowed');
}
