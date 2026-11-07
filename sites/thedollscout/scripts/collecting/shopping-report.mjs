// One normal cached read. Public output is health only, never traffic or revenue.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {aggregateShopping, shoppingWindow, SHOPPING_PATHS, MERCHANTS, CACHE_SECONDS, SCHEMA_VERSION} from '../../functions/api/shopping-growth.js';

const fail=()=>{throw Error('Shopping measurement unavailable or inconsistent; missing data is unknown, not zero.');};
const sameArray=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&actual.every((value,i)=>value===expected[i]);
const sameWindow=(actual,expected)=>expected===null?actual===null:actual?.start===expected.start&&actual?.end_exclusive===expected.end_exclusive;
const EVENTS=['pageview','affiliate_click','shopping_official_click','shopping_compare'];
const METRICS=['pageviews','affiliate_clicks','official_clicks','compare_actions'];
const ROW_KEYS=['date','path','country','event','merchant','item','placement','n'];

export function summarizeShoppingReport(data,{now=new Date()}={}){
 const generated=typeof data?.generated==='string'?Date.parse(data.generated):NaN;
 if(!data?.ok||data.schema_version!==SCHEMA_VERSION||data.unit!=='anonymous_events_not_users'||!Number.isFinite(generated)||
    generated>now.getTime()+60000||now.getTime()-generated>15*60000||data.cache_seconds!==CACHE_SECONDS||
    !sameArray(data.scope?.paths,SHOPPING_PATHS)||!sameArray(data.scope?.merchants,MERCHANTS)||
    !Array.isArray(data.daily)||data.daily.length>10000)fail();
 const expected=shoppingWindow(new Date(generated));
 for(const key of ['first_full_utc_day','coveredDays','full28Days','coverage'])if(data[key]!==expected[key])fail();
 if(!sameWindow(data.expected28dWindow,expected.expected28dWindow)||!sameWindow(data.measuredWindow,expected.measuredWindow))fail();
 if(expected.coveredDays){
  if(data.query_rows_read!==null&&(!Number.isSafeInteger(data.query_rows_read)||data.query_rows_read<0))fail();
  const rows=data.daily.map(row=>{
   if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==ROW_KEYS.length||
      Object.keys(row).some(key=>!ROW_KEYS.includes(key))||!EVENTS.includes(row.event))fail();
   const dimensionless=row.event==='pageview'||row.event==='shopping_compare';
   if(dimensionless?[row.merchant,row.item,row.placement].some(value=>value!==null):
      [row.merchant,row.item,row.placement].some(value=>typeof value!=='string'))fail();
   return {d:row.date,path:row.path,country_code:row.country,
    ev:row.event==='pageview'?'':row.event,merchant:dimensionless?'':row.merchant,
    item:dimensionless?'':row.item,placement:dimensionless?'':row.placement,n:row.n};
  });
  let totals;try{totals=aggregateShopping(rows,expected).counts;}catch{fail();}
  if(!data.counts||Object.keys(data.counts).length!==METRICS.length||METRICS.some(key=>data.counts[key]!==totals[key]))fail();
 }else if(data.counts!==null||data.daily.length||data.query_rows_read!==0)fail();
 // No raw rows, counts, country information or upstream strings leave this function.
 return {ok:true,status:expected.coverage};
}

export function healthSummary(report){
 const checks={
  pending_first_complete_day:'Wait for the first complete UTC observation day. Missing coverage is not zero activity.',
  measured_complete_utc_days:'Review authorized private reporting and merchant evidence using complete UTC days.'
 };
 if(!report?.ok||!Object.hasOwn(checks,report.status))fail();
 return ['TDS shopping daily measurement health',`Status: ${report.status}`,`Next check: ${checks[report.status]}`,
  'Health only: no traffic counts, customer inputs or revenue are printed. This check does not establish uninterrupted collection, channel attribution or earnings.'].join('\n')+'\n';
}

export async function fetchShoppingReport({fetcher=fetch,now=new Date()}={}){
 const response=await fetcher('https://thedollscout.com/api/shopping-growth',{
  headers:{'user-agent':'fleet-report-probe'},signal:AbortSignal.timeout(20000),redirect:'error'
 });
 if(!response.ok)fail();
 const raw=await response.text();if(raw.length>1000000)fail();
 let data;try{data=JSON.parse(raw);}catch{fail();}
 return summarizeShoppingReport(data,{now});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.slice(2).some(arg=>arg!=='--health-only'))fail();
  console.log(healthSummary(await fetchShoppingReport()).trimEnd());
 }catch{
  console.error('Shopping measurement unavailable or inconsistent. Activity and revenue remain unknown; check the shopping-growth endpoint and deployment.');
  process.exitCode=1;
 }
}
