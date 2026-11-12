import {THESIS_EVENTS} from '../../infrastructure-assets/thesis-signals.mjs';
export {THESIS_EVENTS};
export function cleanThesisEvent(body) {
  if(!body || !THESIS_EVENTS.includes(body.n) || !['/ai-infrastructure','/zh/ai-infrastructure'].includes(body.p) || Object.keys(body).some(k=>!['n','p','u'].includes(k)))return null;
  const q=new URLSearchParams(typeof body.u==='string'?body.u:''),safe=new URLSearchParams();
  if(q.get('utm_campaign')==='agi-thesis-watch-01'&&q.get('utm_medium')==='organic_video'&&['youtube','tiktok'].includes(q.get('utm_source'))){for(const k of ['utm_campaign','utm_source','utm_medium'])safe.set(k,q.get(k));}
  return {n:body.n,p:body.p,u:safe.toString()};
}
export const THESIS_SQL=`SELECT day,name,CASE WHEN utm_campaign='agi-thesis-watch-01' AND utm_medium='organic_video' AND utm_source IN ('youtube','tiktok') THEN utm_source ELSE 'unattributed' END AS source,COUNT(*) AS n
 FROM events WHERE name IN ('page_view',${THESIS_EVENTS.map(n=>"'"+n+"'").join(',')})
 AND path IN ('/ai-infrastructure','/zh/ai-infrastructure','/ai-infrastructure.html','/zh/ai-infrastructure.html')
 AND ua_class='human' AND day>=date('now','-28 days') AND day<date('now')
 GROUP BY day,name,source ORDER BY day,name,source`;
export async function thesisGrowth(env) {
  const headers={'content-type':'application/json; charset=utf-8'};
  try{
    const result=await env.EVENTS.prepare(THESIS_SQL).all();
    if(!Array.isArray(result.results))throw Error('unavailable');
    const rows=result.results.map(r=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||!['page_view',...THESIS_EVENTS].includes(r.name)||!['youtube','tiktok','unattributed'].includes(r.source)||!Number.isSafeInteger(r.n)||r.n<0)throw Error('invalid');return {day:r.day,event:r.name,source:r.source,n:r.n};});
    const end=new Date();end.setUTCHours(0,0,0,0);const start=new Date(end);start.setUTCDate(start.getUTCDate()-28);
    return new Response(JSON.stringify({ok:true,metric:'browser_action_events_not_users',window:{start:start.toISOString().slice(0,10),end_exclusive:end.toISOString().slice(0,10),complete_utc_days:28},campaign:'agi-thesis-watch-01',rows,limits:['Sample and own actions are separate.','Campaign tags are attribution hints, not verified referrers.','Recheck is a check after a saved review at least 24 hours earlier; not unique-user retention.','Membership intent and exports are not purchases.'],generated:new Date().toISOString()}),{headers});
  }catch{return new Response(JSON.stringify({ok:false,error:'unavailable'}),{status:503,headers:{...headers,'cache-control':'no-store'}});}
}
