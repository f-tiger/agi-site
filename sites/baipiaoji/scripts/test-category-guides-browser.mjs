import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const b=await chromium.launch({executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const c=await b.newContext({javaScriptEnabled:false});
 await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://baipiaoji.com')return r.abort();let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.join(root,p);return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:p.endsWith('.css')?'text/css':'text/html'}):r.fulfill({status:404});});
 const p=await c.newPage();
 for(const prefix of ['', '/en']){
  for(const width of [320,390,1440]){
   await p.setViewportSize({width,height:900});await p.goto('https://baipiaoji.com'+prefix+'/#directory');
   const directory=p.locator('#directory');
   const categoryLinks=directory.locator('a[href*="/c/"]').filter({visible:true});
   assert.equal(await categoryLinks.count(),14);
   const destinations=await categoryLinks.evaluateAll(links=>links.map(link=>link.pathname));
   assert.equal(new Set(destinations).size,14);
   for(const group of ['.home-category-grid','.home-more']){
    assert.ok(await directory.locator(group).evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   }
   if(width===390)await p.screenshot({path:'/tmp/bpj-upgrade-home'+(prefix?'-en':'-zh')+'.png'});
   await directory.locator('a[href$="/c/chat"]').click();
   await p.locator('a[href="#choose"]').first().click();assert.ok(await p.locator('#choose h2').isVisible());
   assert.ok(await p.locator('#choose').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   if(width===390)await p.screenshot({path:'/tmp/bpj-upgrade-category'+(prefix?'-en':'-zh')+'.png'});
   const schemas=await p.locator('script[type="application/ld+json"]').allTextContents();assert.ok(schemas.map(JSON.parse).some(s=>s['@type']==='ItemList'));
   await p.locator('#choose a[href$="/chat-limits-board"]').click();assert.ok(await p.locator('h1').isVisible());
  }
 }
 console.log('PASS bilingual home → category → selection board without JS, 320/390/1440 widths and rendered schema; all network intercepted');
}finally{await b.close();}
