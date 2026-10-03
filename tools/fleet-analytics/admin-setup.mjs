// Idempotent configuration only. Never read traffic or log credentials/API bodies.
import {createSign} from 'node:crypto';
const properties={agi:'541489054',eco:'544688614',bpj:'547077892',tds:'547130808'};
const dimensions={tool_id:'Tool ID',home_block:'Homepage block',home_destination:'Homepage destination',site_edition:'Site edition',merchant:'Affiliate merchant',market:'Affiliate marketplace',placement:'Affiliate placement'};
const report=[];
const raw=process.env.GA4_SERVICE_ACCOUNT_JSON;
if(!raw){console.log(JSON.stringify({status:'blocked',reason:'GA4_SERVICE_ACCOUNT_JSON is not configured; no changes made'}));process.exit(0);}
let account;try{account=JSON.parse(raw);}catch{throw Error('Invalid service-account JSON; credentials are not logged');}
if(!account.client_email||!account.private_key)throw Error('Service account is missing required fields');
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);
const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/analytics.edit',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+600});
const signer=createSign('RSA-SHA256');signer.update(unsigned);
let token;
try{
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signer.sign(account.private_key,'base64url')}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Credential exchange HTTP '+r.status);
 token=(await r.json()).access_token;if(!token)throw Error('Credential exchange returned no token');
}catch(e){console.log(JSON.stringify({status:'blocked',reason:e.message.startsWith('Credential exchange')?e.message:'Credential exchange unavailable'}));process.exit(0);}
for(const [site,id] of Object.entries(properties)){
 const endpoint='https://analyticsadmin.googleapis.com/v1beta/properties/'+id+'/customDimensions';
 let created=0,existing=0;
 try{
  const records=[];let page='';
  do{
   const r=await fetch(endpoint+'?pageSize=200'+(page?'&pageToken='+encodeURIComponent(page):''),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error('Admin read HTTP '+r.status);
   const data=await r.json();records.push(...(data.customDimensions||[]));page=data.nextPageToken||'';
  }while(page);
  for(const [parameterName,displayName]of Object.entries(dimensions)){
   if(records.some(d=>d.parameterName===parameterName&&d.scope==='EVENT')){existing++;continue;}
   const r=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({parameterName,displayName,scope:'EVENT',description:'Fixed public fleet measurement field; no customer inputs.'}),signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error('Admin create HTTP '+r.status);created++;
  }
  report.push({site,status:'configured',created,existing});
 }catch(e){report.push({site,status:'blocked',created,existing,reason:/^Admin (read|create) HTTP \d+$/.test(e.message)?e.message:'Admin request unavailable'});}
}
console.log(JSON.stringify({customDimensions:report,keyEvents:'unchanged',revenueSettings:'unchanged',trafficRead:false}));
