import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verify} from './verify-payment-readiness.mjs';
import '../../../tools/member-studio/test-release-health.mjs';
const quiet={logger:{log(){},warn(){},error(){}},summaryPath:null};
for(const requireReady of [true,false])for(const ready of [true,false]){
  const calls=[];
  const code=await verify(async(url,options)=>{calls.push({url,options});return {status:200,json:async()=>({ok:true,site:'bpj',ready,auto_renew:false})};},{...quiet,requireReady});
  assert.equal(code,ready||!requireReady?0:1);
  assert.equal(calls.length,1);assert.equal(calls[0].options.method,'GET');
  assert.equal(calls[0].options.redirect,'error');
}
for(const fetcher of [async()=>{throw Error('offline')},async()=>({status:200,json:async()=>{throw Error('invalid JSON')}})])assert.equal(await verify(fetcher,{...quiet,requireReady:false}),1);
const workflow=name=>readFileSync(new URL('../../../.github/workflows/'+name,import.meta.url),'utf8');
const yaml=workflow('deploy-baipiaoji.yml'),tds=workflow('deploy-thedollscout.yml'),watch=workflow('bpj-ad-watch.yml');
assert.ok(!yaml.includes('\n  membership-readiness:'),'No duplicate commerce job marks successful free-page deployment as failed');
assert.match(yaml,/node scripts\/verify-payment-readiness\.mjs --release-health/);
assert.match(yaml,/node tools\/member-studio\/verify\.mjs --live --release-health/);
assert.match(tds,/node tools\/member-studio\/verify\.mjs --site tds --live --release-health/);
assert.doesNotMatch(tds,/ops\.mjs watch tds/,'Page release must not run payment recovery');
assert.match(tds,/checkPaymentHealth\(response.status,status,\{site:'tds',requireReady:false\}\)/);
assert.doesNotMatch(tds,/assert\.equal\(status.ready,true\)/);
assert.match(watch,/node tools\/member-studio\/ops\.mjs watch-all/,'Existing independent commerce monitoring is retained');
assert.match(watch,/assert\.equal\(status.ready,true\)/,'Existing targeted payment maintenance stays strict');
assert.match(yaml,/Notify only changed canonical pages to IndexNow/);
const studio=readFileSync(new URL('./verify-studio-live.mjs',import.meta.url),'utf8');
assert.match(studio,/typeof member.ready==='boolean'/);
assert.doesNotMatch(studio,/assert\.equal\(member.ready,true/);
console.log('PASS ordinary and read-only releases report closed checkout separately; explicit payment recovery and its independent alerts remain strict.');
