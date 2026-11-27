import {digest,json} from '../../lib/ad-commerce.js';
import {readEcoLaundrySignup} from '../../lib/eco-laundry-signup.js';

export async function onRequestGet({request,env}){
  const secret=env.ADS_WATCH_SECRET;
  if(!env.HITS||!secret||secret.length<32)return json({ok:false},503);
  const bearer=request.headers.get('Authorization')||'';
  if(!bearer.startsWith('Bearer ')||bearer.length>520||await digest(secret)!==await digest(bearer.slice(7)))return json({ok:false},401);
  try {
    const generated=new Date();
    if(new URL(request.url).searchParams.get('view')==='eco_mcp_signups'){
      const endExclusive=generated.toISOString().slice(0,10);
      const start=new Date(Date.parse(endExclusive)-7*86400000).toISOString().slice(0,10);
      return json({ok:true,start,end_exclusive:endExclusive,eco_mcp_signups:await readEcoLaundrySignup(env.HITS,start,endExclusive)});
    }
    async function read(sql,params=[]){
      const statement=env.HITS.prepare(sql);
      const result=await (params.length?statement.bind(...params):statement).all();
      if(!result.success||!Array.isArray(result.results))throw Error('Incomplete aggregate');
      return result.results;
    }
    const since=new Date(generated.getTime()-7*86400000).toISOString().slice(0,10);
    const until=generated.toISOString().slice(0,10);
    const paths=['/biz/trigger/vendor-view','/biz/trigger/vendor-wait','/biz/trigger/vendor-sponsor','/biz/trigger/ad-view','/biz/trigger/ad-inquiry','/biz/from-submit/click','/biz/submit/sponsor','/biz/submit/expedite'];
    const events=await read(`SELECT d,path,count(*) n FROM hits WHERE d BETWEEN ? AND ? AND ev!='' AND ev='biz' AND lang!='ci' AND path IN (${paths.map(()=>'?').join(',')}) GROUP BY d,path ORDER BY d,path`,[since,until,...paths]);
    const tables=await read("SELECT count(*) n FROM sqlite_schema WHERE type='table' AND name='vendor_inquiries'");
    const provisioned=tables[0]?.n===1;
    if(!provisioned && tables[0]?.n!==0)throw Error('Unknown intake table state');
    const intake=provisioned?await read(`SELECT created d,CASE WHEN kind IN ('sponsor','feature','expedite') THEN kind ELSE 'other' END intent,count(*) n,sum(CASE WHEN status='new' THEN 1 ELSE 0 END) pending FROM vendor_inquiries WHERE created BETWEEN ? AND ? GROUP BY created,intent ORDER BY created,intent`,[since,until]):[];
    return json({ok:true,generated:generated.toISOString(),since,until,todayPartial:true,provisioned,events,intake});
  }catch{return json({ok:false},503);}
}
