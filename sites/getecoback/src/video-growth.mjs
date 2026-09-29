// Reuses ev; counts events, never people, paid customers or attributed revenue.
export const VIDEO_SQL = `SELECT json_extract(meta,'$.s') AS source,
 json_extract(meta,'$.v') AS evidence, name,
 json_extract(meta,'$.input') AS input, COUNT(*) AS n
 FROM ev WHERE page='/en/energy-tariff-workbench.html'
 AND ua_class='human' AND day>=date('now','-14 days') AND day<date('now')
 AND name IN ('page_view','solution_calc','outbound_choice','share')
 AND json_valid(meta) AND json_extract(meta,'$.c')='eco-bonus-01'
 AND json_extract(meta,'$.s') IN ('youtube','tiktok')
 AND json_extract(meta,'$.v') IN ('referrer','tag_only','internal','other')
 GROUP BY source,evidence,name,input ORDER BY source,evidence,name,input`;
export async function videoGrowth(env) {
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=3600'};
 try {
  if(!env.EVENTS) throw Error('missing');
  const rows=await env.EVENTS.prepare(VIDEO_SQL).all();
  const end=new Date();end.setUTCHours(0,0,0,0);const start=new Date(end);start.setUTCDate(start.getUTCDate()-14);
  return new Response(JSON.stringify({ok:true,campaign:'eco-bonus-01',metric:'events_not_users',
   window:{start:start.toISOString().slice(0,10),end_exclusive:end.toISOString().slice(0,10),complete_utc_days:14},
   rows:rows.results||[],notes:'Keep channels, evidence and sample/own inputs separate. Tags can be shared or spoofed. Missing referrer is not proof of platform traffic. No revenue attribution.',generated:new Date().toISOString()}),{headers});
 } catch {return new Response(JSON.stringify({ok:false,error:'unavailable'}),{status:503,headers:{...headers,'cache-control':'no-store'}});}
}
