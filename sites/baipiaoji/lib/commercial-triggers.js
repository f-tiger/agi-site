// Aggregate only a closed vocabulary; never expose arbitrary hit paths or submission fields.
export const COMMERCIAL_ACTIONS=['vendor-view','vendor-sponsor','vendor-wait','ad-view','ad-wallet','ad-reach','ad-later'];
export async function readCommercialTriggers(db,since){
 try{
  const paths=COMMERCIAL_ACTIONS.map(a=>'/biz/trigger/'+a);
  const {results}=await db.prepare(`SELECT path,COUNT(*) n FROM hits WHERE d>=? AND ev='biz' AND lang!='ci' AND path IN (${paths.map(()=>'?').join(',')}) GROUP BY path`).bind(since,...paths).all();
  const counts=Object.fromEntries(COMMERCIAL_ACTIONS.map(a=>[a,0]));
  for(const row of results||[]){const action=String(row.path).slice('/biz/trigger/'.length);if(Object.hasOwn(counts,action))counts[action]=Number(row.n);}
  return {ok:true,started:'2026-09-26',counts,definition:'First event per action per page load, QA excluded at emitter. Not unique people, a linked funnel, verified vendors or paid conversions. Client events can be blocked or spoofed.'};
 }catch{return {ok:false,counts:null,reason:'query_unavailable'};}
}
