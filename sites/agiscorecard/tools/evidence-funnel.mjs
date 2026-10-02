// Read-only owner aggregates. No identifiers, email addresses or payment hashes leave D1.
import {hash} from './create/store.mjs';
export const BASELINE={start:'2026-10-03',end_exclusive:'2026-10-17',timezone:'UTC',version:'agi-evidence-20261002'};
export const EVENT_SQL=`SELECT day,name AS event,CASE WHEN name LIKE 'sub_%' THEN 'subscription_form' ELSE location END AS location,CASE WHEN name LIKE 'sub_%' THEN '' ELSE label END AS label,COUNT(*) AS n FROM events WHERE name IN ('focus_entry','task_start','task_complete','result_copy','evidence_action','share_arrival','sub_open','sub_submit','sub_ok','sub_fail') AND ua_class='human' AND day>=? AND day<? GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`;
export const SUB_SQL=`SELECT day,status,COUNT(*) AS n FROM subscribers WHERE day>=? AND day<? AND status IN ('stored','synced','sync_failed') AND COALESCE(path,'') NOT LIKE '/__ci%' AND COALESCE(utm_source,'') NOT IN ('verify','ci','test') GROUP BY day,status ORDER BY day,status`;
export const ORDER_SQL=`SELECT date(o.paid_at,'unixepoch') AS day,COALESCE(s.product,'unattributed') AS product,COUNT(*) AS n,SUM(o.amount_units) AS gross_usdt_micro FROM wb_orders o LEFT JOIN wb_order_sources s ON s.order_id=o.id WHERE o.state='paid' AND o.paid_at>=unixepoch(?) AND o.paid_at<unixepoch(?) AND EXISTS(SELECT 1 FROM bpj_ad_chain_receipts r WHERE r.order_id='member:'||o.id AND r.tx=o.tx AND r.chain=o.chain) GROUP BY day,product ORDER BY day,product`;
export const CHECKOUT_SQL=`SELECT date(created,'unixepoch') AS day,COUNT(*) AS n FROM wb_orders WHERE created>=unixepoch(?) AND created<unixepoch(?) GROUP BY day ORDER BY day`;
export async function report(db,now=new Date()){
 const end=now.toISOString().slice(0,10);const start=new Date(Date.parse(end)-14*86400000).toISOString().slice(0,10);
 const rows={};let partial=false;
 for(const [key,sql] of Object.entries({events:EVENT_SQL,subscriptions:SUB_SQL,paid_orders:ORDER_SQL,checkout_orders:CHECKOUT_SQL}))try{rows[key]=(await db.prepare(sql).bind(start,end).all()).results;}catch{rows[key]=null;partial=true;}
 return {ok:!partial,partial,generated:now.toISOString(),window:{start,end_exclusive:end,timezone:'UTC',complete_days:14},baseline:BASELINE,baseline_complete:end>=BASELINE.end_exclusive,units:{events:'browser_events_not_people',subscriptions:'new_unique_stored_addresses_not_delivered_mail',paid_orders:'receipt_backed_orders_not_net_revenue',checkout_orders:'server_created_orders_not_payments'},...rows};
}
export async function evidenceFunnelRoute(request,env){
 const u=new URL(request.url);if(u.pathname!=='/api/evidence-funnel')return null;
 const headers={'cache-control':'no-store','x-robots-tag':'noindex'};
 if(request.method!=='POST'||!env.MEMBER_WATCH_SECRET)return Response.json({ok:false},{status:404,headers});
 const key=await hash(env.MEMBER_WATCH_SECRET+':evidence-funnel:v1');
 if(request.headers.get('authorization')!=='Bearer '+key)return Response.json({ok:false},{status:403,headers});
 const data=await report(env.EVENTS);return Response.json(data,{status:data.ok?200:503,headers});
}
