// Public aggregate reads must never create, migrate, or prune D1 tables.
const DAY=86400000;
export const sqlTime=value=>new Date(value).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,'');
export function aggregateWindow(now=new Date(),legacyDays=28){
 // Stored CURRENT_TIMESTAMP values have second precision; match their text format.
 now=new Date(Math.floor(now.getTime()/1000)*1000);
 const generatedAt=now.toISOString(),end=now.getTime(),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 return {generatedAt,timezone:'UTC',groups:{kind:'rolling',days:legacyDays,start:new Date(end-legacyDays*DAY).toISOString(),end:generatedAt,endExclusive:true},daily:{kind:'complete_days',days:28,start:new Date(today-28*DAY).toISOString(),end:new Date(today).toISOString(),endExclusive:true},today:{kind:'partial_day',date:new Date(today).toISOString().slice(0,10),start:new Date(today).toISOString(),end:generatedAt,endExclusive:true}};
}
export function aggregateResponse(request,value,status=200,{qa=false}={}){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200&&!qa?'public, max-age=3600':'no-store','X-Robots-Tag':'noindex'};
 return new Response(request.method==='HEAD'?null:JSON.stringify(value),{status,headers});
}
export function unavailableAggregate(request,window,reason='query_failed'){
 return aggregateResponse(request,{status:'unavailable',reason,generatedAt:window.generatedAt,asOf:window.generatedAt,timezone:'UTC',window,groups:null,daily:null,today:null},503);
}
export function aggregateErrorReason(error){return /no such table/i.test(String(error?.message||''))?'table_unavailable':'query_failed';}
export async function selectRows(db,sql,args){
 // This is deliberately the only execution primitive used by aggregate routes.
 if(!/^SELECT\s/i.test(sql))throw Error('Aggregate query must be SELECT');
 const result=await db.prepare(sql).bind(...args).all();
 if(result?.success===false||!Array.isArray(result?.results))throw Error('Aggregate query unavailable');
 return result.results;
}
export function splitDaily(rows,window){return {daily:rows.filter(row=>row.date<window.today.date),today:rows.filter(row=>row.date===window.today.date)};}
