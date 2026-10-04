export const MANJU_ACTIONS = ['view','filter','empty','open','source','save','unsave','share','export','feed','inquiry_start','inquiry_ok','inquiry_error','return','preview_open','rank_sort','topic_complete','topic_empty','topic_export'];
export function parseManjuEvent(path, ids) {
  const m = /^\/manju\/([a-z_]+)\/([a-z0-9-]+)$/.exec(path);
  return !!m && MANJU_ACTIONS.includes(m[1]) && ['catalog', ...ids].includes(m[2]);
}
export async function readManjuSignals(db,since) {
  try {
    const {results=[]}=await db.prepare("SELECT path, COUNT(*) n FROM hits INDEXED BY hits_events WHERE d >= ? AND ev != '' AND ev = 'manju' GROUP BY path").bind(since).all();
    const actions=Object.fromEntries(MANJU_ACTIONS.map(x=>[x,0]));
    for(const r of results){const action=r.path.split('/')[2];if(Object.hasOwn(actions,action))actions[action]+=r.n;}
    let inquiries=null;
    try{const r=await db.prepare('SELECT kind, COUNT(*) n FROM manju_inquiries WHERE created >= ? GROUP BY kind').bind(since).all();inquiries=Object.fromEntries(['submit','cooperate','correction'].map(k=>[k,r.results.find(x=>x.kind===k)?.n||0]));}catch{}
    return {ok:true,actions,inquiries,definition:'Action counts and submitted requests, not unique users, qualified customers, retention or revenue. Missing inquiry table/read = null; no personal data returned.'};
  }catch{return {ok:false,actions:null,inquiries:null};}
}
