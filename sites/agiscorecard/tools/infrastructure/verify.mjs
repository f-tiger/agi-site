// Public read-only release checks. Never creates an order, saves notes or spends AI quota.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const origin='https://agiscorecard.com';
for(const [path,needle]of [['/ai-infrastructure','infrastructure-assets/app.mjs'],['/zh/ai-infrastructure','AI 产业链'],['/invest','/ai-infrastructure'],['/zh/invest','/zh/ai-infrastructure']]){
 const r=await fetch(origin+path+'?__qa=1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);assert.ok((await r.text()).includes(needle),path);console.log('OK '+path);
}
for(const asset of ['app.mjs','core.mjs','thesis.mjs','thesis-ui.mjs','thesis-signals.mjs','style.css']){
 const r=await fetch(origin+'/infrastructure-assets/'+asset+'?__qa=1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,asset);assert.equal(await r.text(),await readFile(new URL('../../infrastructure-assets/'+asset,import.meta.url),'utf8'),'Deployed '+asset);
}
const growth=await(await fetch(origin+'/api/thesis-growth',{signal:AbortSignal.timeout(20000)})).json();assert.equal(growth.ok,true);assert.equal(growth.metric,'browser_action_events_not_users');assert.ok(Array.isArray(growth.rows));
const member=await(await fetch(origin+'/api/member',{signal:AbortSignal.timeout(20000)})).json();console.log('Membership order readiness: '+(member.ready===true?'ready':'unavailable'));
const snapshot=await (await fetch(origin+'/infrastructure-assets/snapshot.json',{cache:'no-store'})).json();assert.equal(snapshot.version,1);assert.equal(snapshot.companies.length,20);assert.ok(snapshot.companies.every(c=>c.checked_at&&c.source));
const api=await (await fetch(origin+'/api/infrastructure-review')).json();assert.equal(api.available,true);assert.equal(api.global_cap,12);assert.equal(api.ip_cap,2);
const products=await (await fetch(origin+'/member-assets/products.json')).json();assert.ok(products.some(p=>p.id==='ai-infrastructure'&&p.urls.zh===origin+'/zh/ai-infrastructure'));
console.log('Snapshot '+snapshot.id+': 20 companies, bounded AI binding and same-site membership record type present. No inference or purchase performed.');
