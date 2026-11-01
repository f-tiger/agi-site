import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {policy,readConfig,rulesFor,assetFiles,headerBlock,analyticsHeaders,analyticsBypassFor} from './worker-budget-routing.mjs';
import {protectAnalyticsResponse} from '../fleet-analytics/edge.mjs';
const root=resolve(import.meta.dirname,'../..');
test('reviewed routing retains dynamic/auth/HTML boundaries and provider limits',()=>{
 for(const site of Object.keys(policy.sites)){
  const rules=rulesFor(site);assert.deepEqual(readConfig(site).assets.run_worker_first,rules,site);assert(rules.length<=100);assert.equal(new Set(rules).size,rules.length);
  for(const path of rules.slice(1)){assert(path.startsWith('!/'));assert(path.length<=100);assert(!/^!\/(api|auth|account|members|download|mcp)(?:\/|\.|$)/.test(path),site+' must not bypass dynamic/private paths');assert(!path.endsWith('.html'));assert(!path.endsWith('.md'));}
  const spec=policy.sites[site],assetRoot=resolve(root,'sites',site,spec.source_assets||spec.assets);
  if(existsSync(assetRoot))assetFiles(site,assetRoot);
  const workflow=readFileSync(resolve(root,'.github/workflows/deploy-'+site+'.yml'),'utf8');
  assert(workflow.includes('node tools/fleet/worker-budget-routing.mjs --site='+site+' --write'));assert(workflow.includes('tools/fleet/worker-budget-routing*'));
 }
 assert.equal(readConfig('gridlings').assets.html_handling,'none');
 const ignored=readFileSync(resolve(root,'sites/agiscorecard/.assetsignore'),'utf8');for(const boundary of ['tools/**','owner-identity.json','**/.git/**'])assert(ignored.includes(boundary));
});
test('asset analytics protections match the existing Worker contract',()=>{
 const expected=protectAnalyticsResponse(new Response('fixture')).headers;
 for(const [name,value] of Object.entries(analyticsHeaders))assert.equal(value,expected.get(name),name);
 for(const site of Object.keys(policy.sites))if(analyticsBypassFor(site).length)assert(headerBlock(site,[]).includes('Cache-Control: public, max-age=0, must-revalidate, no-transform'));
 assert.equal(analyticsBypassFor('localebatch').length,0,'Keep analytics behind Worker when existing global CSP/header rules overlap');
});

// Optional actual Cloudflare routing test, no production requests or DB access.
// WORKER_BUDGET_WRANGLER_MODULE=/path/to/node_modules/wrangler node --test ...
test('workerd routes each reviewed asset around compute and preserves dynamic shadows',{skip:!process.env.WORKER_BUDGET_WRANGLER_MODULE,timeout:240000},async()=>{
 const require=createRequire(import.meta.url),{unstable_dev}=require(process.env.WORKER_BUDGET_WRANGLER_MODULE);
 const tmp=mkdtempSync(resolve(tmpdir(),'fleet-worker-routing-'));
 try{for(const site of Object.keys(policy.sites)){
  const dir=resolve(tmp,site),assets=resolve(dir,'assets');mkdirSync(assets,{recursive:true});
  const add=(path,text='public fixture')=>{const out=resolve(assets,path.slice(1));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,text);};
  const spec=policy.sites[site],realRoot=resolve(root,'sites',site,spec.source_assets||spec.assets);
  const siteFiles=existsSync(realRoot)?assetFiles(site,realRoot):[];
  const files=[...analyticsBypassFor(site),...siteFiles];for(const path of files)add(path);
  const guarded=['/','/index.html','/auth/nav.js','/auth/fleet.js','/auth/fleet.css','/auth/account','/api/private.json','/members/download.zip','/private/session.js','/mcp','/claimledger.json','/fetchlog.json','/analytics-assets/frame.html','/analytics-assets/frame','/analytics-assets/coverage.json'];
  if(site==='gamesledger')guarded.push('/badge/123.svg');
  if(!analyticsBypassFor(site).length)guarded.push(...policy.common);
  for(const path of guarded)if(path!=='/')add(path,'SHADOW MUST NOT BE SERVED');
  const originalHeaders=existsSync(resolve(realRoot,'_headers'))?readFileSync(resolve(realRoot,'_headers'),'utf8').replace(/\n?# FLEET-WORKER-STATIC-HEADERS\n[\s\S]*?# \/FLEET-WORKER-STATIC-HEADERS\n?/g,''):'';writeFileSync(resolve(assets,'_headers'),originalHeaders+'\n'+headerBlock(site,siteFiles));
  const worker=resolve(dir,'worker.mjs');writeFileSync(worker,"export default {async fetch(request,env){const path=new URL(request.url).pathname;if(path==='/'||path==='/index.html'||path.startsWith('/analytics-assets/frame')){const r=await env.ASSETS.fetch(request);const out=new Response(r.body,r);out.headers.set('x-fixture-worker','yes');return out;}return new Response('guarded',{headers:{'x-fixture-worker':'yes'}})}}");
  const config=resolve(dir,'wrangler.json');writeFileSync(config,JSON.stringify({name:'fixture-'+site,main:'worker.mjs',compatibility_date:'2026-08-01',assets:{directory:'./assets',binding:'ASSETS',run_worker_first:rulesFor(site),html_handling:'none',not_found_handling:'none'}}));
  const dev=await unstable_dev(worker,{config,local:true,port:0,logLevel:'error',experimental:{disableExperimentalWarning:true,disableDevRegistry:true,watch:false}});
  try{
   for(const path of files){const r=await dev.fetch(path);assert.equal(r.status,200,site+path);assert.equal(r.headers.get('x-fixture-worker'),null,site+path+' invoked Worker');assert.equal(r.headers.get('x-fleet-delivery'),'static-worker-v1',site+path+' static marker');if(path.startsWith('/analytics-assets/'))for(const [name,value] of Object.entries(analyticsHeaders))assert.equal(r.headers.get(name),value,site+path+' '+name);await r.arrayBuffer();}
   for(const path of guarded){const r=await dev.fetch(path);assert.equal(r.headers.get('x-fixture-worker'),'yes',site+path+' bypassed guard');assert.equal(r.headers.get('x-fleet-delivery'),null,site+path+' false static marker');await r.arrayBuffer();}
   for(const path of spec.paths.filter(p=>p.endsWith('/*'))){const r=await dev.fetch(path.slice(0,-1)+'nonexistent.css');assert.equal(r.status,404,site+' static miss must remain 404');assert.equal(r.headers.get('x-fixture-worker'),null);await r.arrayBuffer();}
   for(const prefix of spec.paths.filter(p=>p.endsWith('/*'))){for(const tail of ['%2e%2e/auth/nav.js','%2f..%2fauth/nav.js','%252e%252e/auth/nav.js']){const r=await dev.fetch(prefix.slice(0,-1)+tail);assert(!(await r.text()).includes('SHADOW MUST NOT BE SERVED'),site+' encoded traversal bypassed guard');}}
  }finally{await dev.stop();}
 }}finally{rmSync(tmp,{recursive:true,force:true});}
});
