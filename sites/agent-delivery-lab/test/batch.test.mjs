import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {appendRule,checkDelivery,checkBatch,sampleBatch,sampleContract} from '../public/engine.mjs';
const j=JSON.stringify, contract=j(sampleContract), copy=()=>structuredClone(sampleBatch);
test('batch includes failed responses and charged timeouts in accepted-output cost',()=>{
 const result=checkBatch(j(copy()),contract);
 assert.equal(result.status,'fail');assert.equal(result.accepted,3);
 const [a,b]=result.summaries;
 assert.deepEqual([a.attempts,a.accepted,a.totalCost,a.costPerAccepted],[3,1,'0.03','0.03']);
 assert.deepEqual([b.attempts,b.accepted,b.totalCost,b.costPerAccepted],[2,2,'0.04','0.02']);
});
test('decimal totals remain exact and ratio rounds upward at eight decimals',()=>{
 const rows=[...Array(3)].map((_,i)=>({...copy()[0],id:String(i),cost:i===0?'0.00000001':'0'}));
 const group=checkBatch(j(rows),contract).summaries[0];
 assert.equal(group.totalCost,'0.00000001');assert.equal(group.costPerAccepted,'0.00000001');
 const big=rows.map(r=>({...r,cost:'999999999999.99999999'}));
 assert.equal(checkBatch(j(big),contract).summaries[0].totalCost,'2999999999999.99999997');
});
test('zero accepted outputs are undefined, while free accepted outputs cost zero',()=>{
 const row=copy()[2];row.cost='0';
 assert.equal(checkBatch(j([row]),contract).summaries[0].costPerAccepted,null);
 const pass=copy()[0];pass.cost='0';assert.equal(checkBatch(j([pass]),contract).summaries[0].costPerAccepted,'0');
});
test('currencies remain separate even for the same provider',()=>{
 const rows=[copy()[0],{...copy()[0],id:'other',currency:'USDC'}];
 assert.equal(checkBatch(j(rows),contract).summaries.length,2);
});
test('successful retries are separate outputs but one accepted task',()=>{
 const rows=[copy()[0],{...copy()[0],id:'retry'}];
 const group=checkBatch(j(rows),contract).summaries[0];
 assert.equal(group.accepted,2);assert.equal(group.acceptedTasks,1);assert.equal(group.uniqueTasks,1);
});
test('malformed batch rows never silently disappear from totals',()=>{
 for(const transform of [
  r=>{r.cost=0.01;},r=>{r.cost='-1';},r=>{r.cost='1e3';},r=>{r.cost='0.123456789';},
  r=>{r.cost='1000000000000';},r=>{delete r.cost;},r=>{r.currency='usd';},
  r=>{delete r.response;},r=>{r.error='timeout';},r=>{r.extra='ignored?';},
  r=>{r.task='';},r=>{r.provider=' '.repeat(2);}
 ]){const row=copy()[0];transform(row);assert.throws(()=>checkBatch(j([row]),contract));}
 assert.throws(()=>checkBatch(j([copy()[0],copy()[0]]),contract),/duplicate/);
});
test('empty, excessive and invalid-contract batches are rejected',()=>{
 assert.throws(()=>checkBatch('[]',contract));
 assert.throws(()=>checkBatch(j(Array(101).fill(copy()[0])),contract));
 assert.throws(()=>checkBatch(j(copy()),'{"checks":[]}'));
});
test('guided rules are executable and reject invalid values without ignoring prior rules',()=>{
 let rules=appendRule('{"checks":[]}','/invoice/currency','equals','"USD"');
 rules=appendRule(rules,'/invoice/total','max','150');
 assert.equal(checkDelivery(j(copy()[0].response),rules).status,'pass');
 assert.equal(checkDelivery(j(copy()[1].response),rules).status,'fail');
 for(const args of [['/x','type','date'],['/x','max','"150"'],['x','equals','1'],['/x','equals','USD']])assert.throws(()=>appendRule(rules,...args));
});
test('batch CLI exits 1 for partial failures and 0 for all accepted',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'adl-batch-'));
 try{
  const input=join(dir,'attempts.json'),rules=join(dir,'rules.json');
  await writeFile(rules,contract);await writeFile(input,j(copy()));
  const run=()=>spawnSync(process.execPath,['public/runner.mjs','batch',input,rules],{encoding:'utf8'});
  let result=run();assert.equal(result.status,1);assert.equal(JSON.parse(result.stdout).accepted,3);
  await writeFile(input,j([copy()[0]]));result=run();assert.equal(result.status,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
