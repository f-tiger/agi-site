import {createRequire} from 'node:module';import {createServer} from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
let pw;try{pw=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');}catch{pw=createRequire(import.meta.url)('playwright');}
const root=path.resolve(new URL('../dist/',import.meta.url).pathname);let origin,failSubmit=true,mode='live',failDoctor=false,orders=0;
const doctor={ok:true,selling:true,mode:'live',rails:{wallet:true,card:false},web3:{chain:'bsc',token:'USDT',price_cents:4900},days:30};
const server=createServer(async(req,res)=>{const u=new URL(req.url,origin);if(u.pathname.startsWith('/api/')){for await(const c of req){}res.setHeader('Content-Type','application/json');if(u.pathname==='/api/submit'){res.statusCode=failSubmit?503:200;res.end(JSON.stringify({ok:!failSubmit,code:failSubmit?'error':'ok'}));return;}if(u.pathname==='/api/ads'){res.statusCode=failDoctor?503:200;res.end(JSON.stringify(failDoctor?{ok:false}:{...doctor,mode}));return;}if(/ad-web3|ad-draft/.test(u.pathname))orders++;res.end('{}');return;}
 try{let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(f)]||'text/plain');res.end(fs.readFileSync(f,'utf8').replaceAll('https://baipiaoji.com',origin));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;let browser;
try{browser=await pw.chromium.launch({headless:true,...(process.env.PILOT_CHROMIUM?{executablePath:process.env.PILOT_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']}: {})});
 for(const [lang,prefix]of[['en','/en'],['zh','']]){const context=await browser.newContext({viewport:{width:390,height:844}});await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await context.addInitScript(()=>{window.__biz=[];Object.defineProperty(navigator,'webdriver',{get:()=>false});Object.defineProperty(window,'bpjEv',{get(){return(...args)=>window.__biz.push(args)},set(){}});});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+prefix+'/for-vendors.html?__ci=1');
 const direct=p.locator('[data-vendor-selfserve] a[data-biz=selfserve]');assert(await direct.isVisible());
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const originalKind=await p.locator('#vendorForm select[name=kind]').inputValue();
 await direct.click();await p.waitForURL(u=>/\/advertise(?:\.html)?$/.test(u.pathname));assert.equal(new URL(p.url()).searchParams.get('source'),'for-vendors');assert(new URL(p.url()).searchParams.has('__ci'));assert.equal(orders,0);assert.equal((await p.evaluate(()=>window.__biz)).filter(x=>x[1]==='/biz/trigger/vendor-sponsor').length,0);
 assert.equal(originalKind,'expedite');
 await p.goto(origin+prefix+'/for-vendors.html');await p.evaluate(()=>document.querySelector('[data-biz=selfserve]').addEventListener('click',e=>e.preventDefault()));
 await p.locator('[data-biz=selfserve]').click();await p.locator('[data-biz=selfserve]').click();
 assert.equal((await p.evaluate(()=>window.__biz)).filter(x=>x[1]==='/biz/trigger/vendor-sponsor').length,1);assert.equal(await p.locator('#vendorForm select[name=kind]').inputValue(),'expedite');assert.equal(orders,0);

 await p.goto(origin+prefix+'/submit.html?__ci=1');assert.equal(await p.locator('#vendorSponsor').isVisible(),false);await p.locator('#submitForm input[name=name]').fill('Test tool');await p.locator('#submitForm input[name=url]').fill('https://example.test/');failSubmit=true;await p.locator('#submitForm button').click();await p.locator('#submitForm .is-err').waitFor();assert.equal(await p.locator('#vendorSponsor').isVisible(),false);failSubmit=false;await p.locator('#submitForm button').click();await p.locator('#vendorSponsor').waitFor();await p.locator('[data-commercial-action=vendor-sponsor]').click();await p.waitForURL(u=>/\/advertise(?:\.html)?$/.test(u.pathname));assert.ok(p.url().includes('__ci=1'));await p.locator('[data-commercial-availability]').filter({hasText:'49.00'}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal((await p.evaluate(()=>window.__biz)).filter(x=>x[1]?.startsWith('/biz/trigger/')).length,0);
 await p.goto(origin+prefix+'/advertise.html#adDecision');await p.locator('[data-commercial-availability]').filter({hasText:'49.00'}).waitFor();await p.waitForFunction(()=>window.__biz.some(x=>x[1]==='/biz/trigger/ad-view'));await p.locator('#adDecision summary').click();await p.locator('[data-commercial-action=ad-wallet]').click();assert.equal(await p.locator('[data-commercial-action=ad-reach]').isDisabled(),true);assert.equal((await p.evaluate(()=>window.__biz)).filter(x=>x[1]==='/biz/trigger/ad-wallet').length,1);
 mode='test';await p.reload();await p.locator('[data-commercial-availability]').filter({hasText:lang==='en'?'Test mode':'测试模式'}).waitFor();mode='live';failDoctor=true;await p.reload();await p.locator('[data-commercial-availability]').filter({hasText:lang==='en'?'could not':'无法'}).waitFor();failDoctor=false;
 // House placements retain the category from tool AND category pages. Carry only
 // the fixed category/QA flag; never forward search text or other query values.
 for(const [entry,category]of[['/tools/kling.html','video'],['/c/coding.html','coding']]){
  await p.goto(origin+prefix+entry+'?__ci=1&email=private%40example.test');
  const house=p.locator('.ad-slot .ad-house').first();await house.waitFor({state:'visible'});
  const target=new URL(await house.getAttribute('href'));
  assert.equal(target.pathname,prefix+'/advertise');assert.equal(target.searchParams.get('cat'),category);
  assert.equal(target.searchParams.get('__ci'),'1');assert.equal(target.searchParams.has('email'),false);assert.equal(target.hash,'#adForm');
  assert.doesNotMatch(await house.textContent(),/referred human|真人浏览/);
  assert.match(await p.locator('.ad-slot .sub-note').first().textContent(),lang==='en'?/free inclusion/:/免费收录/);
  await house.click();await p.waitForURL(u=>u.pathname===prefix+'/advertise');
  await p.waitForFunction(cat=>document.querySelector('#adForm select[name=cat]').value===cat,category);
  assert.equal((await p.evaluate(()=>window.__biz)).filter(x=>x[0]==='ad'||x[1]?.startsWith('/biz/trigger/')).length,0);
 }
 await p.goto(origin+prefix+'/tools/kling.html');
 await p.locator('.ad-slot .ad-house').first().waitFor({state:'visible'});
 await p.evaluate(()=>document.querySelector('.ad-house').addEventListener('click',e=>e.preventDefault()));
 await p.locator('.ad-slot .ad-house').first().click();
 assert.equal((await p.evaluate(()=>window.__biz)).filter(x=>x[0]==='ad'&&x[1]==='/ad/house/tool/kling').length,1);
 await p.goto(origin+prefix+'/advertise?cat=unknown&__ci=1');
 assert.notEqual(await p.locator('#adForm select[name=cat]').inputValue(),'unknown');
 await p.setViewportSize({width:1440,height:1000});await p.reload();await p.locator('[data-commercial-availability]').filter({hasText:'49.00'}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
 }assert.equal(orders,0);console.log('PASS EN/ZH: submission, optional CTA, category-specific house handoff, fixed query/QA propagation, action measurement, payment states, mobile/desktop; no order created.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
