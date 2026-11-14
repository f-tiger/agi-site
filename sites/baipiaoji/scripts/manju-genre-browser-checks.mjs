import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
export async function checkGenreBrowser(browser,root){
 // No script and no live network: bots/readers must reach actual static cards.
 const c=await browser.newContext({javaScriptEnabled:false});
 await c.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!=='https://baipiaoji.com')return route.abort();let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.join(root,p);return fs.existsSync(f)?route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.css':'text/css'})[path.extname(f)]||'text/plain'}):route.fulfill({status:404});});
 try{const p=await c.newPage();
  for(const width of [320,390,1440]){
   await p.setViewportSize({width,height:900});await p.goto('https://baipiaoji.com/manju/categories?__probe=1');
   assert.ok(await p.getByRole('heading',{level:1}).isVisible());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390)await p.screenshot({path:'/tmp/manju-categories-mobile.png',fullPage:false});assert.ok(await p.getByRole('link',{name:'按题材挑片单 ↓'}).isVisible());
   await p.getByRole('link',{name:/^仙侠 ·/}).click();assert.ok(p.url().includes('/genre-cultivation'));
   assert.ok(await p.getByRole('link',{name:'筛选、收藏这份片单',exact:true}).isVisible());
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,60),right:e.getBoundingClientRect().right})))));
   if(width===390)await p.screenshot({path:'/tmp/manju-genre-mobile.png',fullPage:false});
   const schemas=await p.locator('script[type="application/ld+json"]').allTextContents();assert.ok(schemas.map(JSON.parse).some(s=>s['@type']==='CollectionPage'));
   const staticCard=p.locator('.mj-source-list h3 a[href*="#work-"]').first();const href=await staticCard.getAttribute('href');assert.ok(href);await staticCard.click();
   await p.locator(new URL(href).hash).waitFor({state:'visible'});assert.ok(await p.locator(new URL(href).hash+' h2').isVisible());
  }
 }finally{await c.close();}
}
