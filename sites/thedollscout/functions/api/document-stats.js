// Actions are not unique people or verified organic traffic. The open event endpoint can be spoofed.
import { databaseFailure } from './doc-events.js';
import { cachedAggregate } from '../../lib/aggregate-cache.js';
const START='2026-09-25';
export const DOCUMENT_QUERY=`SELECT d,ev,path,ref,COUNT(*) AS n FROM hits
 WHERE d >= date('now','-27 days') AND d >= '${START}'
 AND (substr(ev,1,4)='doc_' OR (ev='bot' AND
 (path IN ('/','/de/','/zh/') OR path LIKE '%/pdf-%' OR path LIKE '%/compare-pdf-text%' OR path LIKE '%/learn/pdf-%' OR path LIKE '%/learn/scanned-pdf%' OR path LIKE '%/delivery-evidence%')))
 GROUP BY d,ev,path,ref LIMIT 10001`;
const EXCLUDED=new Set(['doc_ci','doc_sample','doc_delivery_sample']);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export function aggregateDocuments(rows) {
 const events={},excluded={},days=new Map(),pages=new Map(),refs=new Map(),bots=new Map();
 const add=(map,key,n)=>map.set(key,(map.get(key)||0)+n);
 for(const r of rows){const n=Number(r.n);if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid aggregate');
  if(r.ev==='bot'){add(bots,r.path,n);continue;}
  if(EXCLUDED.has(r.ev)){excluded[r.ev]=(excluded[r.ev]||0)+n;continue;}
  if(!r.ev.startsWith('doc_')||r.path.startsWith('/__ci'))continue;
  events[r.ev]=(events[r.ev]||0)+n;add(days,JSON.stringify([r.d,r.ev]),n);
  if(r.ev==='doc_view'){add(pages,r.path,n);add(refs,r.ref||'',n);}
 }
 const ranked=(map,key)=>Array.from(map,([v,n])=>({[key]:v,n})).sort((a,b)=>b.n-a.n||String(a[key]).localeCompare(String(b[key])));
 const pageRows=ranked(pages,'path');
 return {events,excluded,daily:Array.from(days,([k,n])=>{const[d,ev]=JSON.parse(k);return {d,ev,n};}).sort((a,b)=>b.d.localeCompare(a.d)||a.ev.localeCompare(b.ev)),pages:pageRows,referrers:ranked(refs,'ref').slice(0,100),crawler_fetches:ranked(bots,'path'),tool_views:pageRows.filter(r=>/^\/(?:(de|zh)\/)?(?:delivery-evidence|pdf-accessibility-checker|pdf-batch-audit|pdf-to-text|compare-pdf-text)?$/.test(r.path)).reduce((n,r)=>n+r.n,0)};
}
export async function onRequestGet(ctx) {
 if(!ctx.env.HITS)return json({ok:false,error:'no_db'},503);
 return cachedAggregate(ctx,async()=>{
  try {
   // One grouped query replaces six repeated scans. An overflow fails instead of undercounting.
   const result=await ctx.env.HITS.prepare(DOCUMENT_QUERY).all();const rows=result.results||[];
   if(rows.length>10000)return json({ok:false,error:'aggregate_capacity'},503);
   return json({ok:true,since:START,days:28,generated:new Date().toISOString(),cache_seconds:300,
    unit:'Anonymous action counts, deduplicated per event per page load in the browser. Not unique users; not verified buyers. Bots, CI and samples are excluded from task completion. Open endpoint counts can be spoofed. Public aggregates may be cached for 5 minutes.',
    ...aggregateDocuments(rows),query_rows_read:result.meta?.rows_read??null});
  }catch(error){return json({ok:false,error:'query_failed',reason:databaseFailure(error)},500);}
 });
}
