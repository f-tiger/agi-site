// Exercise the actual command in an isolated process. No network/model calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function run(mode) {
 const command = `
  import {sample} from ${JSON.stringify(new URL('../../create-assets/core.mjs', import.meta.url).href)};
  let calls=0;
  process.on('exit',()=>console.log('MOCK_CALLS='+calls));
  globalThis.fetch=async(url,options)=>{
   if(url!=='https://agiscorecard.com/api/create')throw Error('Unexpected endpoint');
   const body=JSON.parse(options.body);calls++;
   if(body.action!=='generate'||body.consent!==true)throw Error('Unexpected request');
   const mode=${JSON.stringify(mode)};
   if(mode==='quota')return Response.json({ok:false,code:'rate_limited'},{status:429});
   if(mode==='provider')return Response.json({ok:false,code:'ai_failed'},{status:502});
   const story=sample(body.lang);
   if(mode==='malformed')story.rounds=[];
   return Response.json({ok:true,story,model:'local-test-fixture'});
  };
  await import(${JSON.stringify(new URL('./ai-check.mjs', import.meta.url).href)});
 `;
 return spawnSync(process.execPath,['--input-type=module','--eval',command],{encoding:'utf8',timeout:10000});
}

for(const mode of ['quota','provider','malformed']) {
 test(`${mode} response fails the actual AI check without retry or fallback`,()=>{
  const result=run(mode);assert.ifError(result.error);
  assert.notEqual(result.status,0,result.stdout);
  assert.match(result.stdout,/MOCK_CALLS=1/);
  assert.doesNotMatch(result.stdout,/"ok":true/);
  if(mode==='quota')assert.match(result.stdout,/"http":429,"code":"rate_limited"/);
 });
}
test('valid bilingual mock responses exercise both checks (not live inference evidence)',()=>{
 const result=run('valid');assert.ifError(result.error);
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/MOCK_CALLS=2/);
 assert.match(result.stdout,/"language":"en"/);
 assert.match(result.stdout,/"language":"zh"/);
});
