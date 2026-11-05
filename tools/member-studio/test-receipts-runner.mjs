import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recoverSiteReceipts} from './ops.mjs';
const original=globalThis.fetch,env={ADS_WATCH_SECRET:'s'.repeat(64)};let mode='ok',requests=[];
globalThis.fetch=async(url,options={})=>{
 requests.push({url,method:options.method||'GET',body:options.body});
 assert.equal(options.redirect,'manual','Do not forward operator credentials through redirects');
 if(url.endsWith('/api/member-recovery')){
  if(mode==='old')return Response.json({ok:false},{status:404});
  if(mode==='non_json')return new Response('<html>Not found</html>');
  if(mode==='redirect')return Response.json({ok:true},{status:302,headers:{Location:'https://example.com/'}});
  return Response.json({ok:mode==='missing_ok'?undefined:true,mode:mode==='wrong_mode'?'watch':'receipts-only',site:mode==='wrong_site'?'tds':'eco',processed:0,ready:mode!=='not_ready'});
 }
 if(url.endsWith('/api/member'))return Response.json({ok:true,site:'eco',ready:mode!=='stale_public'});
 throw Error('Unsafe or unexpected route '+url);
};
try{
 await recoverSiteReceipts('eco',env);assert.equal(requests.length,2);assert.equal(requests[0].method,'POST');assert.equal(requests[1].method,'GET');
 for(mode of ['old','non_json','redirect','missing_ok','wrong_mode','wrong_site','not_ready','stale_public']){requests=[];await assert.rejects(()=>recoverSiteReceipts('eco',env));assert.equal(requests.filter(r=>r.method==='POST').length,1);assert.ok(requests.every(r=>!r.url.includes('/api/member-watch')));}
 requests=[];await assert.rejects(()=>recoverSiteReceipts('bpj',env));assert.equal(requests.length,0);
 const workflow=fs.readFileSync(new URL('../../.github/workflows/bpj-ad-watch.yml',import.meta.url),'utf8');
 assert.match(workflow,/options:.*fleet-receipts-only/);assert.match(workflow,/run: node tools\/member-studio\/ops.mjs receipts-all/);
 assert.match(workflow,/inputs.mode == 'receipts-only' \|\| \(github.ref == 'refs\/heads\/main' && inputs.mode == 'fleet-receipts-only'\)/);
 for(const section of workflow.split(/\n      - name:/).filter(s=>/Continue bounded Jarvis missions|Check each independent site membership|Match on-chain payments/.test(s)))assert.match(section,/inputs.mode == 'watch'/);
 assert.equal((workflow.match(/cron:/g)||[]).length,1);assert.match(workflow,/cron: '37 \*\/2 \* \* \*'/);
 console.log('PASS dedicated receipts endpoints, fail-closed old server, readiness, workflow isolation and unchanged schedule');
}finally{globalThis.fetch=original;}
