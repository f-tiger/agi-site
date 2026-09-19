import {createHmac} from 'node:crypto';
import {fileURLToPath} from 'node:url';import path from 'node:path';
import {watchSecret,walletMatchesOwner} from '../../sites/baipiaoji/scripts/ad-runner-config.mjs';
import {sites} from '../revenue-studio/catalog.mjs';
export function memberSecret(site,env){if(!Object.hasOwn(sites,site))throw Error('Unknown site');return site==='bpj'?watchSecret(env):createHmac('sha256',watchSecret(env)).update('independent-membership:'+site+':v1').digest('hex');}
async function requestJSON(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(120000)});let d;try{d=await r.json();}catch{throw Error('Non-JSON response (HTTP '+r.status+')');}if(!r.ok||d.ok===false)throw Error('Request failed (HTTP '+r.status+')');return d;}
async function post(site,endpoint,body,env){return requestJSON(sites[site].origin+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+memberSecret(site,env)},body:JSON.stringify(body)});}
export async function preflight(env){const cfg=await requestJSON(sites.bpj.origin+'/api/member');if(cfg.site==='bpj')return;const d=await post('bpj','member-admin',{action:'stats'},env);console.log(JSON.stringify({legacy_paid_orders:d.paid_orders,legacy_unexpired_pending:d.unexpired_pending}));if(d.paid_orders!==0||d.unexpired_pending!==0)throw Error('Existing legacy obligations require migration before isolation');}
export async function configureSite(site,env,request=fetch){
 if(!['agi','eco','tds'].includes(site))throw Error('Configure only sibling sites');
 const wallet=(env.ADS_WALLET||'').trim();if(!walletMatchesOwner(wallet))throw Error('Wallet does not match approved recipient');
 if(!env.CLOUDFLARE_ACCOUNT_ID||!env.CLOUDFLARE_API_TOKEN)throw Error('Existing Cloudflare credentials missing');
 const root='/accounts/'+encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID),secret=memberSecret(site,env);
 async function cf(route,method='GET',body){const r=await request('https://api.cloudflare.com/client/v4'+route,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});let d;try{d=await r.json();}catch{throw Error('Cloudflare response invalid');}if(!r.ok||!d.success)throw Error('Cloudflare '+method+' failed (HTTP '+r.status+')');return d.result;}
 if(site==='tds'){
  const route=root+'/pages/projects/dollscout',before=await cf(route);if(!before.deployment_configs?.production?.d1_databases?.HITS)throw Error('TDS HITS binding missing');
  await cf(route,'PATCH',{deployment_configs:{production:{env_vars:{MEMBER_WALLET:{type:'secret_text',value:wallet},MEMBER_WATCH_SECRET:{type:'secret_text',value:secret}}}}});
  const after=await cf(route);if(JSON.stringify(before.deployment_configs.production.d1_databases)!==JSON.stringify(after.deployment_configs.production.d1_databases))throw Error('Database bindings changed');for(const key of [...Object.keys(before.deployment_configs.production.env_vars||{}),'MEMBER_WALLET','MEMBER_WATCH_SECRET'])if(!after.deployment_configs.production.env_vars?.[key])throw Error('Environment key missing');
 }else{
  const route=root+'/workers/scripts/'+(site==='agi'?'agiscorecard':'ecoback')+'/secrets';
  const before=await cf(route);for(const [name,text]of [['MEMBER_WALLET',wallet],['MEMBER_WATCH_SECRET',secret]])await cf(route,'PUT',{name,text,type:'secret_text'});
  const after=await cf(route);for(const name of [...before.map(x=>x.name),'MEMBER_WALLET','MEMBER_WATCH_SECRET'])if(!after.some(x=>x.name===name))throw Error('Worker secret missing');
 }
 console.log(site+': independent membership secrets configured; existing bindings preserved');
}
export async function watchSite(site,env){let processed=0;for(let i=0;i<7;i++){const d=await post(site,'member-watch',{},env);processed+=d.processed||0;if(!d.processed)break;}console.log(JSON.stringify({site,membership_processed:processed}));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,site]=process.argv.slice(2),env=process.env;
 if(mode==='preflight')await preflight(env);
 else if(mode==='configure')await configureSite(site,env);
 else if(mode==='watch')await watchSite(site,env);
 else if(mode==='watch-all'){const results=await Promise.allSettled(['agi','eco','tds'].map(s=>watchSite(s,env)));for(let i=0;i<results.length;i++)if(results[i].status==='rejected')console.error(['agi','eco','tds'][i]+': membership watcher failed');if(results.some(r=>r.status==='rejected'))process.exitCode=1;}
 else throw Error('Choose preflight, configure SITE, watch SITE or watch-all');
}
