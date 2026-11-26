// Aggregate only a closed vocabulary; never expose arbitrary hit paths or submission fields.
import {EVENT_ROWS} from './hits-schema.js';
export const COMMERCIAL_ACTIONS=['vendor-view','vendor-sponsor','vendor-wait','ad-view','ad-inquiry','sponsor-inquiry-accepted','ad-wallet','ad-reach','ad-later','video-offer','video-backup','video-cloud','video-local','video-payment','video-later','video-dismiss'];
const actionByPath=new Map(COMMERCIAL_ACTIONS.map(action=>[action==='sponsor-inquiry-accepted'?'/biz/ok/sponsor':'/biz/trigger/'+action,action]));
export async function readCommercialTriggers(db,since){
 try{
  const paths=[...actionByPath.keys()];
  const {results}=await db.prepare(`SELECT path,COUNT(*) n FROM hits WHERE d>=? AND ${EVENT_ROWS} AND ev='biz' AND lang!='ci' AND path IN (${paths.map(()=>'?').join(',')}) GROUP BY path`).bind(since,...paths).all();
  const counts=Object.fromEntries(COMMERCIAL_ACTIONS.map(a=>[a,0]));
  if(!Array.isArray(results))throw Error('missing_aggregate');
  for(const row of results){if(!Number.isSafeInteger(Number(row.n))||Number(row.n)<0)throw Error('invalid_aggregate');const action=actionByPath.get(row.path);if(action)counts[action]=Number(row.n);}
  return {ok:true,started:'2026-09-26',event_releases:{ad_inquiry:'2026-11-18',vendor_and_ad:'2026-09-26',video_post_export:'2026-10-29'},counts,coverage_note:'Video counters only exist after the commercial release; earlier absence is unmeasured, not zero demand.',definition:'Decision actions count once per page load. Sponsor inquiry acceptance counts the existing browser success event following a new submission. QA is excluded at the emitter. Counts are not a joined funnel, verified vendors or paid conversions. Client events can be blocked or spoofed.'};
 }catch{return {ok:false,counts:null,reason:'query_unavailable'};}
}
