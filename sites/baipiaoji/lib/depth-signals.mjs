export const DEPTH_ACTIONS=['plan_select','plan_save','plan_copy','plan_export','watch_save','watch_resume','watch_export'];
export function parseDepthEvent(path){return DEPTH_ACTIONS.some(a=>path==='/depth/'+a);}
export async function readDepthSignals(db,since,today){
 const start=since>'2026-10-31'?since:'2026-10-31';
 const meta={measurement_start:'2026-10-31',first_complete_utc_day:'2026-11-01',start,end_exclusive:today,date_basis:'UTC',definition:'Fixed browser actions, not people or verified task completion. Plan steps and watch states are local self-reports and are not collected. Resume is an explicit link click, not proven retention. Downloads are initiated, not verified saved files. Earlier dates unmeasured.'};
 try{const {results=[]}=await db.prepare("SELECT d, path, COUNT(*) n FROM hits INDEXED BY hits_events WHERE d >= ? AND d < ? AND ev != '' AND ev = 'depth' GROUP BY d, path").bind(start,today).all();return {ok:true,...meta,rows:results.filter(r=>parseDepthEvent(r.path)).map(r=>({date:r.d,action:r.path.slice(7),count:r.n}))};}catch{return{ok:false,...meta,rows:null};}
}
