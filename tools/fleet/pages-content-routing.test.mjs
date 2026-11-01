import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {contentRoutes,invokesContentFunction,contentHeaders,buildContent,checkFunctions} from './pages-content-routing.mjs';
import {RETIRED_PREFIXES} from '../../sites/thedollscout/functions/retired-paths.mjs';
import {crawlerMeasurement} from './pages-content-policy.mjs';
import {accountRoute} from '../fleet-account/edge.mjs';

test('BPJ public content and misses bypass compute; dynamic, private, Markdown and encoded requests do not',()=>{
 const paths=['/index.html','/404.html','/tools/kimi.html','/tools/kimi.md','/account.html','/account.js','/account-fleet.js','/account.css','/en/account.html','/members.html','/en/studio/quote-builder.html','/en/private/receipt.html','/analytics-assets/frame.html','/style.css'];
 const routes=contentRoutes('bpj',paths);
 for(const p of ['/','/index.html','/tools/kimi','/tools/kimi.html','/en/c/coding','/style.css','/account.js','/account-fleet.js','/account.css','/missing-vulnerability-scan','/analytics-assets/frame'])assert.equal(invokesContentFunction(routes,p),false,p);
 for(const p of ['/api/mcp','/api/account','/api/unknown','/auth/account','/auth/status','/account','/account.html','/en/account/','/members','/en/studio/quote-builder','/en/private/receipt','/tools/kimi.md','/limits.md','/%61ccount','/tools/%2e%2e/account'])assert.equal(invokesContentFunction(routes,p),true,p);
 assert.throws(()=>contentRoutes('bpj',[...paths,'/api/account.json']),/shadow/);
 assert.throws(()=>contentRoutes('bpj',[...paths,'/auth/private.html']),/shadow/);
});
test('TDS only bypasses public assets; HTML host/retirement/account policies stay in Functions',()=>{
 const paths=['/index.html','/404.html','/de/index.html','/zh/index.html','/checker.html','/collecting/start-a-collection.html','/de/series/example.html','/members.html','/de/members.html','/delivery-evidence.html','/analytics-assets/frame.html','/css/main.css'];
 const routes=contentRoutes('tds',paths);
 for(const p of ['/auth/nav.js','/analytics-assets/frame','/css/main.css'])assert.equal(invokesContentFunction(routes,p),false,p);
 for(const p of ['/','/checker','/checker.html','/collecting/start-a-collection','/de/series/example','/api/ev','/mcp','/auth/status','/auth/account','/members','/de/members.html','/delivery-evidence','/DE/%2570icks','/%70icks','/missing'])assert.equal(invokesContentFunction(routes,p),true,p);
 for(const locale of ['','de/','zh/','th/','en/'])for(const prefix of RETIRED_PREFIXES)for(const suffix of ['','.html','/old'])assert.equal(invokesContentFunction(routes,'/'+locale+prefix.slice(1)+suffix),true);
 assert(invokesContentFunction(contentRoutes('tds',[...paths,'/collecting/account.html']),'/collecting/account')); 
 assert.throws(()=>contentRoutes('tds',[...paths,'/picks.html']),/Retired content/);
});
test('new Function endpoints cannot be omitted from route review',()=>{
 const root=mkdtempSync(join(tmpdir(),'content-functions-'));try{
  const dir=join(root,'sites/baipiaoji/functions');mkdirSync(join(dir,'api'),{recursive:true});writeFileSync(join(dir,'api/new.js'),'');writeFileSync(join(dir,'_middleware.js'),'');
  checkFunctions('bpj',contentRoutes('bpj',[]),root);
  writeFileSync(join(dir,'new-private-endpoint.js'),'');assert.throws(()=>checkFunctions('bpj',contentRoutes('bpj',[]),root),/Unreviewed function/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('global static marker is unique; analytics and private original policies survive idempotent generation',()=>{
 const original='/account\n  Cache-Control: no-store\n# FLEET-PAGES-STATIC\n/style.css\n  X-Fleet-Delivery: static-pages-v1\n# /FLEET-PAGES-STATIC\n';
 for(const site of ['bpj','tds']){const value=contentHeaders(original,site);assert.equal((value.match(/X-Fleet-Delivery:/g)||[]).length,1);assert(!value.includes('static-pages-v1'));assert(value.includes('/account\n  Cache-Control: no-store'));assert(value.includes('no-transform'));assert.equal(contentHeaders(value,site),value);}
 assert(crawlerMeasurement.coverage.includes('partial'));assert(crawlerMeasurement.interpretation.includes('not evidence'));
});
test('final build check detects drift, explicit 404 is required, private source shadows fail',async()=>{
 const root=mkdtempSync(join(tmpdir(),'content-output-'));try{
  writeFileSync(join(root,'index.html'),'<html>Public</html>');await assert.rejects(buildContent('bpj',root),/404/);
  writeFileSync(join(root,'404.html'),'<h1>Missing</h1>');writeFileSync(join(root,'account.html'),'<h1>Login</h1>');
  await buildContent('bpj',root);await buildContent('bpj',root,true);
  writeFileSync(join(root,'_routes.json'),'{}');await assert.rejects(buildContent('bpj',root,true),/Stale/);
  assert.equal(JSON.parse(readFileSync(join(root,'_fleet-delivery.json'),'utf8')).crawler_measurement.version,crawlerMeasurement.version);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('TDS compiles only the three constant account assets and fails on stale source',async()=>{
 const root=mkdtempSync(join(tmpdir(),'content-account-assets-'));try{
  writeFileSync(join(root,'index.html'),'<h1>Public</h1>');writeFileSync(join(root,'404.html'),'<h1>Missing</h1>');
  const routes=await buildContent('tds',root);await buildContent('tds',root,true);
  assert(invokesContentFunction(routes,'/'));assert(invokesContentFunction(routes,'/auth/account'));assert(invokesContentFunction(routes,'/auth/status'));
  assert.equal(readFileSync(join(root,'index.html'),'utf8'),'<h1>Public</h1>');
  for(const name of ['fleet.css','fleet.js','nav.js']){
   const path='/auth/'+name,r=await accountRoute(new Request('https://thedollscout.com'+path),{},()=>{throw Error('Unexpected network')});
   assert.equal(r.headers.has('set-cookie'),false);assert.equal(readFileSync(join(root,path),'utf8'),await r.text());
  }
  writeFileSync(join(root,'auth/nav.js'),'stale');await assert.rejects(buildContent('tds',root,true),/Stale public account asset/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
