// Aggregate only. Never write application rows, emails, receipts or credentials to CI output/git.
import {writeFileSync} from 'node:fs';
import {watchSecret} from './ad-runner-config.mjs';
let secret;try{secret=watchSecret(process.env);}catch{}
let report={offer:'release-check-299-v1',generated:new Date().toISOString(),status:'unavailable',paid_orders:null,revenue:null};
try{
 if(!secret)throw Error('Missing operator credential');
 const r=await fetch('https://baipiaoji.com/api/release-pilot',{method:'POST',headers:{Origin:'https://baipiaoji.com','Content-Type':'application/json',Authorization:'Bearer '+secret,'User-Agent':'bpj-ci-selftest-release-report'},body:JSON.stringify({action:'stats'}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(!d.ok||!Array.isArray(d.events)||!Array.isArray(d.applications))throw Error('Invalid shape');
 const events={};for(const row of d.events){if(Number(row.qa)!==0)continue;events[row.event]=(events[row.event]||0)+Number(row.n);}
 const applications=d.applications.filter(x=>Number(x.qa)===0).reduce((n,x)=>n+Number(x.n),0),screened=d.applications.filter(x=>Number(x.qa)===0&&Number(x.qualified)===1).reduce((n,x)=>n+Number(x.n),0);
 report={...report,status:'ok',events,applications,cohort:d.cohort,screened_applications:screened,definition:'QA excluded. Browser sessions and self-reported applications, not verified people or willingness to pay. Orders and revenue require separate evidence.',decision:screened>0?'Review the real task and budget manually; no sales gate passed.':(events.price_seen||0)<50?'Insufficient offer exposure; do not infer no demand.':'Offer exposed without qualified applications; review audience and offer before another bounded batch.'};
}catch(e){report.reason=String(e.message).slice(0,100);console.log('::warning::Pilot evidence unavailable. Do not infer zero demand; inspect operator configuration and the application queue.');}
writeFileSync('data/release-pilot-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(Number(report.cohort?.stale_new)>0)console.log('::warning::Pilot applications await review for more than two days. Review the private queue or pause intake; no automatic customer messages are sent.');
