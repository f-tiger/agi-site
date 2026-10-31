export const MANJU_MEASUREMENT_VERSION = 'manju-video-actions-v2';
export const VIDEO_TASK_ACTIONS = ['video_view','video_start','video_report_needs_info','video_report_revise','video_report_test'];
export const MANJU_ACTIONS = ['view','filter','empty','open','source','save','unsave','share','export','feed','inquiry_start','inquiry_ok','inquiry_error','return','preview_open','rank_sort','topic_complete','topic_empty','topic_export','search_start','search_submit','search_results','search_empty','suggest_view','suggest_select','recommend_select','discover_start','discover_found','discover_empty','discover_error','discover_limited','discover_cached','video_file_ready','video_file_error','video_complete','video_example','video_export','video_compare','official_open','platform_search','intro_open','share_native','share_copy',...VIDEO_TASK_ACTIONS];
export function parseManjuEvent(path, ids) {
  const m = /^\/manju\/([a-z_]+)\/([a-z0-9-]+)$/.exec(path);
  return !!m && MANJU_ACTIONS.includes(m[1]) && (VIDEO_TASK_ACTIONS.includes(m[1]) ? m[2]==='catalog' : ['catalog', ...ids].includes(m[2]));
}
export async function readManjuSignals(db,since) {
  try {
    const {results=[]}=await db.prepare("SELECT path, COUNT(*) n FROM hits INDEXED BY hits_events WHERE d >= ? AND ev != '' AND ev = 'manju' GROUP BY path").bind(since).all();
    const actions=Object.fromEntries(MANJU_ACTIONS.map(x=>[x,0]));
    for(const r of results){const action=r.path.split('/')[2];if(Object.hasOwn(actions,action))actions[action]+=r.n;}
    let inquiries=null;
    try{const r=await db.prepare('SELECT kind, COUNT(*) n FROM manju_inquiries WHERE created >= ? GROUP BY kind').bind(since).all();inquiries=Object.fromEntries(['submit','cooperate','correction'].map(k=>[k,r.results.find(x=>x.kind===k)?.n||0]));}catch{}
    return {ok:true,measurement_version:MANJU_MEASUREMENT_VERSION,actions,inquiries,search_definition:'search_empty is a local-catalog miss, emitted after input changes or submit, before remote discovery. search_submit counts explicit form submission. discover_found/empty/error/limited/cached are separate remote states, not a joined funnel; do not divide search_empty by search_submit as a failure rate.',definition:'Action counts and submitted requests, not unique users, qualified customers, retention or revenue. Video view/start and each report status occur at most once per page; report statuses overlap and do not count distinct tasks. Version describes supported events, not coverage before deployment. Missing inquiry table/read = null; no personal data returned.'};
  }catch{return {ok:false,measurement_version:MANJU_MEASUREMENT_VERSION,actions:null,inquiries:null};}
}
