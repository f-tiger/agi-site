import {application,withdrawal,smallJSON,isQA,saveInquiry,withdrawInquiry} from '../../lib/listing-inquiry.js';

const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
}});
const failure=(code,status)=>reply({ok:false,code,paymentEnabled:false},status);

export async function onRequest({request,env}) {
  const ready=Boolean(env.HITS?.prepare && env.HITS?.batch);
  if(request.method==='GET')return reply({ok:ready,accepting:ready,paymentEnabled:false},ready?200:503);
  if(request.method!=='POST')return failure('method',405);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return failure('origin',403);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return failure('type',415);
  let body;
  try {body=await smallJSON(request);} catch(error) {return failure(error.message==='size'?'size':'invalid',error.message==='size'?413:400);}
  let value;
  try {value=body?.action==='withdraw'?withdrawal(body):application(body);} catch {return failure('invalid',400);}
  if(!ready)return failure('unavailable',503);
  if(isQA(request)||value.qa)return reply({ok:true,code:'qa',saved:false,paymentEnabled:false});
  if(value.honeypot)return reply({ok:true,code:'received',saved:false,paymentEnabled:false});
  try {
    const ip=request.headers.get('CF-Connecting-IP');
    if(!ip||ip.length>64||!/^[0-9a-f:.]+$/i.test(ip))return failure('unavailable',503);
    if(body.action==='withdraw') {
      const code=await withdrawInquiry(env.HITS,value,Date.now(),ip);
      if(code!=='withdrawn')return failure(code,429);
      return reply({ok:true,code:'withdrawn',paymentEnabled:false});
    }
    const code=await saveInquiry(env.HITS,value,ip);
    if(code!=='saved')return failure(code,code==='conflict'?409:429);
    // Receipt is supplied by the caller and never needs to be echoed or logged.
    return reply({ok:true,code:'saved',saved:true,requestId:value.requestId,paymentEnabled:false});
  } catch {return failure('unavailable',503);}
}
