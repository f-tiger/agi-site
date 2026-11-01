import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRoutes,invokesFunction,renderHeaders,buildRoutes,verifyLive} from './pages-static-routes.mjs';
import {protectAnalyticsResponse} from '../fleet-analytics/edge.mjs';
import {onRequest as bpjMiddleware} from '../../sites/baipiaoji/functions/_middleware.js';
import {onRequest as tdsMiddleware} from '../../sites/thedollscout/functions/_middleware.js';

test('Pages bypasses reviewed public assets, never API/auth/MCP/document/private shapes',()=>{
 for(const site of ['bpj','tds']){
  const routes=createRoutes(site,['/style.css','/en/app.mjs','/analytics-assets/consent.mjs','/analytics-assets/frame.html','/member-assets/app.mjs','/auth/nav.js','/api/result.js','/account.html','/mcp','/tools/kimi.md','/limits.md','/pricing.md','/server.json','/feed.xml','/data/catalog.json','/functions/mcp.js']);
  for(const p of ['/style.css','/en/app.mjs','/analytics-assets/frame.html','/member-assets/app.mjs'])assert.equal(invokesFunction(routes,p),false,p);
  for(const p of ['/','/account','/account/','/account.html','/en/account','/members','/de/members.html','/auth/nav.js','/auth/fleet.css','/auth/callback','/auth/status','/api/hit','/api/result.js','/mcp','/mcp/','/api/mcp','/tools/kimi','/tools/kimi.md','/limits.md','/pricing.md','/server.json','/feed.xml','/picks','/DE/%2570icks','/data/catalog.json','/functions/mcp.js'])assert.equal(invokesFunction(routes,p),true,p);
 }
});
test('A new HTML document cannot silently enter a bypass directory; analytics filenames are exact',()=>{
 assert.throws(()=>createRoutes('tds',['/collector-assets/customer-report.html']),/document/);
 assert.throws(()=>createRoutes('bpj',['/studio-assets/.secret']),/hidden/);
 assert.throws(()=>createRoutes('bpj',['/analytics-assets/customer.html']),/Unreviewed/);
 assert.throws(()=>createRoutes('bpj',Array.from({length:100},(_,i)=>`/file-${i}.js`)),/limit exceeded/);
 assert.throws(()=>createRoutes('bpj',['/'+('x'.repeat(100))+'.js']),/longer/);
});
test('Public data exceptions are explicit; new documents cannot inherit a directory bypass',()=>{
 for(const path of ['/studio-assets/customer.md','/studio-assets/customer.json','/member-assets/customer.json','/workbench-assets/private.txt','/assets/unreviewed']){
  assert.throws(()=>createRoutes('bpj',[path]),/Unreviewed data\/document/,path);
 }
 assert.throws(()=>createRoutes('tds',['/collector-assets/text/en/customer.json']),/Unreviewed/);
 const bpj=createRoutes('bpj',['/member-assets/products.json','/workbench-assets/locales/zh.json','/workbench-assets/samples/launchdesk.json','/workbench-assets/widgets/zh/launchdesk.txt','/assets/tok/LICENSE','/studio-assets/vendor/README.md','/studio-assets/vendor/pdf-lib-LICENSE.md']);
 for(const path of ['/member-assets/products.json','/assets/tok/LICENSE','/studio-assets/vendor/README.md'])assert.equal(invokesFunction(bpj,path),false);
 const headers=renderHeaders('',bpj);
 for(const path of ['/studio-assets/vendor/README.md','/studio-assets/vendor/pdf-lib-LICENSE.md'])assert.ok(headers.includes(path+'\n  X-Robots-Tag: noindex'));
 const tds=createRoutes('tds',['/document-assets/resource-library.json','/document-assets/text/en/open-source/audacity.txt','/document-assets/vendor/cmaps/LICENSE','/document-assets/vendor/cmaps/Adobe-Japan1-UCS2.bcmap','/collector-assets/series-catalog.json','/collector-assets/text/de/collecting/wish-card.txt']);
 for(const path of ['/document-assets/resource-library.json','/collector-assets/text/de/collecting/wish-card.txt'])assert.equal(invokesFunction(tds,path),false);
});
test('Static analytics responses preserve every edge privacy header without duplicate generated policies',()=>{
 const routes=createRoutes('bpj',['/analytics-assets/frame.html','/analytics-assets/frame-loader.mjs','/style.css']);
 const input='/account\n  Cache-Control: no-store\n# FLEET-GA4-HEADERS\n/analytics-assets/frame.html\n  Cache-Control: public, max-age=0, must-revalidate, no-transform\n# /FLEET-GA4-HEADERS\n';
 const output=renderHeaders(input,routes);
 const policy=protectAnalyticsResponse(new Response('')).headers;
 for(const name of ['cache-control','x-robots-tag','x-content-type-options','referrer-policy','content-security-policy','x-frame-options'])assert.ok(output.includes('  '+name+': '+policy.get(name)),name);
 assert.match(output,/\/account\n  Cache-Control: no-store/);
 assert.equal(output.includes('FLEET-GA4-HEADERS'),false);
 assert.equal(renderHeaders(output,routes),output);
 assert.throws(()=>renderHeaders(Array.from({length:100},(_,i)=>`/path-${i}\n  X-Test: true`).join('\n'),routes),/header-rule limit/);
});
test('Live verification makes only bounded marked GET reads and rejects a static request still entering Functions',async()=>{
 const paths=[];
 const fetcher=async(url,options)=>{
  assert.equal(url.hostname,'thedollscout.com');assert.equal(url.searchParams.get('__probe'),'1');
  assert.equal(options.headers['X-Probe'],'1');assert.equal(options.redirect,'manual');assert.equal(options.method,undefined);
  paths.push(url.pathname);assert.ok(!url.pathname.startsWith('/api/'));
  const asset=/^\/(?:css|analytics-assets)\//.test(url.pathname);
  const headers=url.pathname==='/analytics-assets/frame'?new Headers(protectAnalyticsResponse(new Response('')).headers):new Headers();
  headers.set('x-fleet-delivery',asset?'static-pages-v1':'pages-function');
  if(url.pathname==='/members')headers.set('cache-control','no-store');
  return new Response('fixture',{status:url.pathname==='/picks'?410:200,headers});
 };
 await verifyLive('tds',fetcher);assert.equal(paths.length,6);
 await assert.rejects(verifyLive('bpj',async()=>new Response('fixture',{headers:{'x-fleet-delivery':'pages-function'}})),/expected 200 static-pages-v1/);
});
test('The final pass detects missing/stale routes and unsafe late generator output',()=>{
 const root=mkdtempSync(join(tmpdir(),'pages-routing-'));
 try{
  mkdirSync(join(root,'css'));writeFileSync(join(root,'css','main.css'),'body{}');writeFileSync(join(root,'index.html'),'<h1>public</h1>');writeFileSync(join(root,'members.html'),'<h1>private UI</h1>');
  const routes=buildRoutes('tds',root);assert.ok(routes.exclude.includes('/css/*'));buildRoutes('tds',root,true);
  assert.equal(JSON.parse(readFileSync(join(root,'_routes.json'),'utf8')).include[0],'/*');
  writeFileSync(join(root,'new.js'),'');assert.throws(()=>buildRoutes('tds',root,true),/Stale/);
  writeFileSync(join(root,'css','private.html'),'secret');assert.throws(()=>buildRoutes('tds',root),/document/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('Middleware keeps real account/retirement/analytics protections and identifies actual Function delivery',async()=>{
 const next=async()=>new Response('<h1>fixture</h1>',{headers:{'content-type':'text/html','x-fleet-delivery':'static-pages-v1'}});
 for(const p of ['/account','/en/account.html','/account/']){
  const response=await bpjMiddleware({request:new Request('https://baipiaoji.com'+p),env:{},next});
  assert.equal(response.headers.get('x-fleet-delivery'),'pages-function');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(response.headers.get('content-security-policy'),/accounts\.google\.com/);
 }
 for(const p of ['/picks','/DE/%2570icks','/server.json']){
  const response=await tdsMiddleware({request:new Request('https://thedollscout.com'+p),env:{},next});
  assert.equal(response.status,410);assert.equal(response.headers.get('x-fleet-delivery'),'pages-function');
 }
 const member=await tdsMiddleware({request:new Request('https://thedollscout.com/de/members.html'),env:{},next});
 assert.equal(member.headers.get('cache-control'),'no-store');assert.equal(member.headers.get('x-frame-options'),'DENY');
 const analytics=await bpjMiddleware({request:new Request('https://baipiaoji.com/analytics-assets/frame'),env:{},next});
 assert.equal(analytics.headers.get('x-fleet-delivery'),'pages-function');
 assert.equal(analytics.headers.get('content-security-policy'),protectAnalyticsResponse(new Response('')).headers.get('content-security-policy'));
});
