import {CAMPAIGN,CAMPAIGN_PATH,SOURCES,VIDEO_EVENTS,videoEventName,refEvidence} from '../../document-assets/video-campaign.mjs';
import {cachedAggregate} from '../../lib/aggregate-cache.js';
import {databaseFailure} from './doc-events.js';
const names=SOURCES.flatMap(s=>Object.keys(VIDEO_EVENTS).map(e=>videoEventName(e,s)));
export const VIDEO_QUERY=`SELECT ev,ref,COUNT(*) AS n FROM hits WHERE d>=date('now','-14 days') AND d<date('now') AND path='${CAMPAIGN_PATH}' AND ev IN (${names.map(n=>`'${n}'`).join(',')}) GROUP BY ev,ref`;
export function aggregateVideo(rows){
 const groups=new Map();
 for(const row of rows){const count=Number(row.n);if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid aggregate');
  const match=/^vid_tdsimage01_(youtube|tiktok)_(view|complete|export|sample|error|share|summary_share)$/.exec(row.ev);if(!match)continue;
  const [,source,event]=match,evidence=refEvidence(source,row.ref),key=[source,event,evidence].join('|');const value=groups.get(key)||{source,evidence,event,n:0};value.n+=count;groups.set(key,value);
 }return [...groups.values()].sort((a,b)=>a.source.localeCompare(b.source)||a.evidence.localeCompare(b.evidence)||a.event.localeCompare(b.event));
}
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestGet(ctx){
 if(!ctx.env.HITS)return json({ok:false,error:'no_db'},503);
 return cachedAggregate(ctx,async()=>{
  try{const result=await ctx.env.HITS.prepare(VIDEO_QUERY).all(),end=new Date();end.setUTCHours(0,0,0,0);const start=new Date(end);start.setUTCDate(start.getUTCDate()-14);
   return json({ok:true,campaign:CAMPAIGN,metric:'browser_events_not_users',window:{start:start.toISOString().slice(0,10),end_exclusive:end.toISOString().slice(0,10),complete_utc_days:14},rows:aggregateVideo(result.results||[]),
    notes:'Per-event counts, deduplicated per event per page load. Samples are separate. Export means a download action, not a verified saved file. Tags and referrers can be spoofed; missing referrers remain tag_only. No user, cross-page or revenue attribution.',generated:new Date().toISOString()});
  }catch(error){return json({ok:false,error:'query_failed',reason:databaseFailure(error)},503);}
 });
}
