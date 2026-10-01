import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture,run,validate,save} from '../products/release-check/release-check.mjs';
const options=f=>({allowOrigin:f.origin,authorized:true,allowMutations:true,env:f.env});
test('actual HTTP fixture fails expired access then passes the fixed revision',async()=>{
 const bad=await fixture({broken:true}),good=await fixture();
 try{const b=await run(bad.manifest,options(bad)),g=await run(good.manifest,options(good));assert.equal(b.outcome,'blocked');assert.deepEqual(b.counts,{pass:7,fail:1,error:0});assert.equal(b.results.find(x=>x.status==='fail').id,'expired');assert.equal(g.outcome,'scoped_checks_passed');assert.deepEqual(g.counts,{pass:8,fail:0,error:0});assert.equal(b.contract_sha256,g.contract_sha256);assert.notEqual(b.manifest_sha256,g.manifest_sha256);const text=JSON.stringify(g);for(const v of Object.values(good.env))assert.equal(text.includes(v),false);}finally{await bad.close();await good.close();}
});
test('missing coverage is incomplete; 200 without expected body fails',async()=>{
 const f=await fixture();try{const m=structuredClone(f.manifest);m.cases=m.cases.filter(x=>x.id!=='tenant-isolation');assert.equal((await run(m,options(f))).outcome,'incomplete');const only=structuredClone(f.manifest);only.cases=only.cases.filter(x=>x.id==='paid');const r=await run(only,{...options(f),fetcher:async()=>new Response('{"access":false,"plan":"pro"}',{status:200})});assert.equal(r.outcome,'blocked');assert.equal(r.results[0].assertions[0].matched,false);}finally{await f.close();}
});
test('authority, mutation and credential gates run before network; origin is exact',async()=>{
 const f=await fixture();let calls=0;const fetcher=async()=>{calls++;return new Response('{}')};try{for(const overrides of [{authorized:false},{allowOrigin:'https://example.test'},{allowMutations:false},{env:{}}])await assert.rejects(()=>run(f.manifest,{...options(f),fetcher,...overrides}));assert.equal(calls,0);}finally{await f.close();}
});
test('invalid manifests cannot weaken denial, redirect or replay semantics',async()=>{
 const f=await fixture();try{for(const change of [m=>m.origin='http://example.test',m=>m.cases[0].request.path='//evil.test',m=>m.cases[0].request.path='/x?secret=1',m=>m.cases[0].expect.json=[],m=>m.cases[0].expect.status=200,m=>delete m.cases[7].effect_pointer,m=>m.cases[7].request.body='{"id":"different"}',m=>m.cases[0].request.headersEnv={Authorization:'OPENAI_API_KEY'},m=>m.cases.push(m.cases[0])]){const m=structuredClone(f.manifest);change(m);assert.throws(()=>validate(m));}}finally{await f.close();}
});
test('redirects, non-JSON, response limits and errors cannot become passes',async()=>{
 const f=await fixture();try{const m=structuredClone(f.manifest);m.cases=[m.cases[2]];for(const value of [new Response('redirect',{status:302,headers:{Location:'https://example.test'}}),new Response('not json',{status:200}),new Response('x'.repeat(1048577),{status:200})]){const r=await run(m,{...options(f),fetcher:async(_u,o)=>{assert.equal(o.redirect,'manual');return value;}});assert.equal(r.outcome,'blocked');}const r=await run(m,{...options(f),fetcher:async()=>{throw Error('secret-leak');}});assert.equal(JSON.stringify(r).includes('secret-leak'),false);assert.equal(r.counts.error,1);}finally{await f.close();}
});
test('private evidence files do not overwrite previous reports',async()=>{
 const f=await fixture(),dir=await mkdtemp(join(tmpdir(),'releasecheck-test-'));try{const r=await run(f.manifest,options(f));await save(r,dir);assert.match(await readFile(join(dir,'report.md'),'utf8'),/scoped_checks_passed/);await assert.rejects(()=>save(r,dir));}finally{await f.close();await rm(dir,{recursive:true,force:true});}
});
test('CLI demo black box uses exit 1 on a real fixture defect and exit 0 after fix',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'releasecheck-cli-'));try{for(const [broken,exit]of [[true,1],[false,0]]){const target=join(dir,broken?'broken':'fixed');const p=spawnSync(process.execPath,['products/release-check/release-check.mjs','demo',...(broken?['--broken']:[]),'--out',target],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:20000});assert.equal(p.status,exit,p.stderr);const r=JSON.parse(await readFile(join(target,'report.json'),'utf8'));assert.equal(r.counts.fail,broken?1:0);}}finally{await rm(dir,{recursive:true,force:true});}
});
