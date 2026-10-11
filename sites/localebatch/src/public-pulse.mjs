// Public aggregate reporting is deliberately isolated from job ownership, queue,
// payment/provider calls and mutation helpers. Only numeric SQL aggregates leave D1.
const DAY=86400000;
const JOB_STATES=['awaiting_payment','paid','processing','completed','refund_pending','refunded'];
const ITEM_STATES=['pending','running','accepted','blocked'];
const PAYMENT_PROOF="paid_at > 0 AND amount_paid > 0 AND payment_intent IS NOT NULL AND length(payment_intent) > 0";
const ACCEPTED_RESULT="status = 'accepted' AND output IS NOT NULL AND length(output) > 0";
const counts=(column,states)=>states.map(state=>`COALESCE(SUM(CASE WHEN ${column} = '${state}' THEN 1 ELSE 0 END),0) AS ${state}`).join(',');
const fixedCounts=(row,states)=>Object.fromEntries([...states,'other'].map(state=>[state,row[state]]));
const response=(request,data,status)=>new Response(request.method==='HEAD'?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'public, max-age=3600':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex'}});
export async function publicPulse(request,env){
  const now=Date.now(),today=Math.floor(now/DAY)*DAY,start=today-28*DAY;
  const meta={generated:new Date(now).toISOString(),timezone:'UTC',window:{start:new Date(start).toISOString(),end:new Date(now).toISOString(),endExclusive:true,completeDays:28,todayPartial:true},unit:'Retained jobs and item results, not people or verified external customers.',coverage:{testClassification:'not_stored',nonTestVerified:false,history:'Expired jobs can be deleted after 30 days. Daily rows count creations or recorded payment timestamps still retained, not changes in inventory.',freeBrowserChecker:'not_stored_in_D1',resultCompletionDates:'not_stored',downloads:'not_collected',currency:'not_stored'}};
  const unavailable=reason=>response(request,{...meta,available:false,reason,inventory:null,daily:null,revenue:null},503);
  if(!env.DB)return unavailable('backend_not_configured');
  try{
    const jobs=await env.DB.prepare(`SELECT COUNT(*) AS total,${counts('state',JOB_STATES)},COALESCE(SUM(CASE WHEN state NOT IN (${JOB_STATES.map(x=>`'${x}'`).join(',')}) THEN 1 ELSE 0 END),0) AS other,COALESCE(SUM(CASE WHEN ${PAYMENT_PROOF} THEN 1 ELSE 0 END),0) AS recorded_paid_jobs FROM jobs`).first();
    const items=await env.DB.prepare(`SELECT COUNT(*) AS total,${counts('status',ITEM_STATES)},COALESCE(SUM(CASE WHEN status NOT IN (${ITEM_STATES.map(x=>`'${x}'`).join(',')}) THEN 1 ELSE 0 END),0) AS other,COALESCE(SUM(CASE WHEN ${ACCEPTED_RESULT} THEN 1 ELSE 0 END),0) AS accepted_results,COUNT(DISTINCT CASE WHEN ${ACCEPTED_RESULT} THEN job_id END) AS jobs_with_accepted_results FROM items WHERE EXISTS (SELECT 1 FROM jobs WHERE jobs.id=items.job_id)`).first();
    const created=await env.DB.prepare("SELECT date(created_at / 1000, 'unixepoch') AS date,COUNT(*) AS jobs_created FROM jobs WHERE created_at >= ? AND created_at < ? GROUP BY date(created_at / 1000, 'unixepoch') ORDER BY date").bind(start,now).all();
    const paid=await env.DB.prepare(`SELECT date(paid_at / 1000, 'unixepoch') AS date,COUNT(*) AS recorded_paid_jobs FROM jobs WHERE ${PAYMENT_PROOF} AND paid_at >= ? AND paid_at < ? GROUP BY date(paid_at / 1000, 'unixepoch') ORDER BY date`).bind(start,now).all();
    if(!jobs||!items||created.success===false||paid.success===false||!Array.isArray(created.results)||!Array.isArray(paid.results))throw Error('Missing aggregates');
    const createdByDate=new Map(created.results.map(row=>[row.date,row.jobs_created]));
    const paidByDate=new Map(paid.results.map(row=>[row.date,row.recorded_paid_jobs]));
    const daily=[];for(let day=start;day<=today;day+=DAY){const date=new Date(day).toISOString().slice(0,10);daily.push({date,complete:day<today,jobs_created:createdByDate.get(date)||0,recorded_paid_jobs:paidByDate.get(date)||0});}
    return response(request,{...meta,available:true,inventory:{retained_jobs:jobs.total,job_states:fixedCounts(jobs,JOB_STATES),retained_items:items.total,item_states:fixedCounts(items,ITEM_STATES),accepted_results:items.accepted_results,jobs_with_accepted_results:items.jobs_with_accepted_results,recorded_paid_jobs:jobs.recorded_paid_jobs},daily,revenue:null,paymentSemantics:'Recorded paid_at, positive amount_paid and payment_intent are payment evidence; test/live mode and currency are not stored. Counts include later refunds and do not establish non-test customers or net revenue.',resultSemantics:'Accepted items with non-empty stored output only; completed job state alone is not a successful result. Result counts are retained inventory, not daily completions.'},200);
  }catch{return unavailable('aggregate_unavailable');}
}
