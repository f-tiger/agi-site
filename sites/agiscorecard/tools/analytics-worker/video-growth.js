// Browser events for one bounded organic-video experiment. No join to identities.
export const VIDEO_SQL = `SELECT utm_source AS source, ref_host AS host, name, COUNT(*) AS n
 FROM events WHERE name IN ('page_view','vote_cast','prediction_lock','challenge_share','x_share','crowd_view','subscribe_click','sub_ok')
 AND path IN ('/agi-test','/agi-test.html') AND ua_class='human'
 AND day>=date('now','-14 days') AND day<date('now')
 AND utm_campaign='agi-timeline-01' AND utm_medium='organic_video'
 AND utm_source IN ('youtube','tiktok')
 GROUP BY utm_source,ref_host,name ORDER BY utm_source,ref_host,name`;

export function refEvidence(source,host) {
 const h=String(host||'').toLowerCase();
 const is=d=>h===d||h.endsWith('.'+d);
 if(['agiscorecard.com','baipiaoji.com','getecoback.com','thedollscout.com'].some(is))return 'internal';
 if(source==='youtube'&&(is('youtube.com')||is('youtu.be'))||source==='tiktok'&&is('tiktok.com'))return 'referrer';
 return h?'other':'tag_only';
}
export async function videoGrowth(env) {
 const headers={'content-type':'application/json; charset=utf-8'};
 try {
  if(!env.EVENTS)throw Error('missing');
  const result=await env.EVENTS.prepare(VIDEO_SQL).all(),counts=new Map();
  for(const row of result.results||[]){const evidence=refEvidence(row.source,row.host),key=[row.source,evidence,row.name].join('|');
   const old=counts.get(key)||{source:row.source,evidence,event:row.name,n:0};old.n+=Number(row.n);counts.set(key,old);}
  const end=new Date();end.setUTCHours(0,0,0,0);const start=new Date(end);start.setUTCDate(start.getUTCDate()-14);
  return new Response(JSON.stringify({ok:true,campaign:'agi-timeline-01',metric:'browser_events_not_users',
   window:{start:start.toISOString().slice(0,10),end_exclusive:end.toISOString().slice(0,10),complete_utc_days:14},
   rows:[...counts.values()],notes:'Repeated loads/choices can count again. Tags can be shared or spoofed. Share events are attempts, not delivered shares. No revenue or cross-page attribution.',generated:new Date().toISOString()}),{headers});
 }catch{return new Response(JSON.stringify({ok:false,error:'unavailable'}),{status:503,headers:{...headers,'cache-control':'no-store'}});}
}
