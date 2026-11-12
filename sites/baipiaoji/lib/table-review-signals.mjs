export const TABLE_REVIEW_ACTIONS=['import','handoff','check','blocked','preview','report','export'];
export function parseTableReviewEvent(path){const m=/^\/table-review\/(import|handoff|check|blocked|preview|report|export)\/(demo|own)$/.exec(path||'');return m?{action:m[1],mode:m[2]}:null;}
export function emptyTableReviewCounts(){return Object.fromEntries(['demo','own'].map(mode=>[mode,Object.fromEntries(TABLE_REVIEW_ACTIONS.map(a=>[a,0]))]));}
