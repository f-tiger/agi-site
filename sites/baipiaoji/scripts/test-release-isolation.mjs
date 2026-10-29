import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {paymentState,verify} from './verify-payment-readiness.mjs';
for(const [status,data,want] of [[200,{ok:true,site:'bpj',ready:true},'ready'],[200,{ok:true,site:'bpj',ready:false},'not_ready'],[503,{ok:true,site:'bpj',ready:true},'unavailable'],[200,{ok:true,site:'eco',ready:true},'unavailable'],[200,{ok:true,site:'bpj',ready:'true'},'unavailable']])assert.equal(paymentState(status,data),want);
const quiet={logger:{log(){},error(){}},summaryPath:null};
assert.equal(await verify(async()=>({status:200,json:async()=>({ok:true,site:'bpj',ready:true})}),quiet),0);
assert.equal(await verify(async()=>({status:200,json:async()=>({ok:true,site:'bpj',ready:false})}),quiet),1);
assert.equal(await verify(async()=>{throw Error('offline')},quiet),1);
const yaml=readFileSync(new URL('../../../.github/workflows/deploy-baipiaoji.yml',import.meta.url),'utf8');
const core=yaml.slice(0,yaml.indexOf('\n  membership-readiness:'));const monitor=yaml.slice(yaml.indexOf('\n  membership-readiness:'));
assert.ok(!core.includes('assert.equal(data.ready,true)'));assert.ok(core.includes('node scripts/verify-member-recovery-live.mjs --account-only'));assert.ok(core.includes('Notify only changed canonical pages to IndexNow'));assert.ok(monitor.includes('needs: update-build-deploy'));assert.ok(monitor.includes("needs.update-build-deploy.result == 'success'"));assert.ok(!monitor.includes('continue-on-error'));assert.ok(monitor.includes('verify-payment-readiness.mjs'));assert.ok(!core.includes('verify-payment-readiness.mjs'));
console.log('PASS free-release/payment isolation; non-ready and unavailable remain failing commerce checks');

const studio=readFileSync(new URL('./verify-studio-live.mjs',import.meta.url),'utf8');assert.ok(studio.includes("if(process.env.OUTCOME_READ_ONLY_RELEASE!=='true')assert.equal(member.ready,true"));assert.ok(studio.includes("typeof member.ready==='boolean'"));
