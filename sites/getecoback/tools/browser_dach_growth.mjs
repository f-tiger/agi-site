// Verify authored content survives all generators, responsive layout, and existing
// buyer decisions. Serve locally; external requests and analytics are blocked.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url));
const {chromium}=require('playwright');
const root=resolve(new URL('../site/',import.meta.url).pathname);
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
 try{const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true});
 let checks=0;
 for(const width of [320,390,1280])for(const js of [true,false]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==base)return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{"ok":true}'});
   return route.continue();
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [path,anchor] of [['/','.hero-btns'],['/guide/luftentfeuchter-keller.html','#kalter-keller'],['/guide/luftentfeuchter-ratgeber.html','#einsatzort-waehlen'],['/wohnen.html','#dach']]){
   await page.goto(base+path+'?__probe=1');
   assert(await page.locator(anchor).isVisible(),path+' authored section lost');
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://getecoback.com'+path);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path+' overflows at '+width);
   // The daily build rotates in March/June too; winter ordering is a cold-season contract.
   if(path==='/' && [0,1,8,9,10,11].includes(new Date().getMonth())){
    const html=await page.content(), season=html.indexOf('<!--EB_SEASON-->'), winter=html.indexOf('<!--EB_WINTER_LINK-->');
    assert(season>=0 && winter>season,'German task routes precede the winter guide entry');
    for(const marker of ['EB_COUNTRIES','EB_UK_PATH','EB_AU_COOLING'])assert(html.indexOf('<!--'+marker+'-->')>winter,marker+' must not displace German winter discovery');
    assert(await page.locator('.hero-btns a[href="/wohnen.html"]').isVisible(),'Homepage winter task entry is visible');
   }
   if(path==='/wohnen.html'){
    const routes=page.locator('.need-cards a');
    assert.equal(await routes.count(),4,'Four German winter tasks must be discoverable without JavaScript');
    for(const href of ['/guide/luftfeuchtigkeit-richtig-messen.html','/waeschetrockner-oder-luftentfeuchter.html','/guide/heizdecke-stromverbrauch.html','/guide/smarte-heizkoerperthermostate-lohnen-sich.html']){
     assert(await page.locator('.need-cards a[href="'+href+'"]').isVisible(),href+' is missing from the visible task routes');
    }
    assert.equal(await page.locator('#regelung [data-country-shop]').count(),0,'Unknown valve fit must not lead directly to shopping');
    const region=await page.locator('#dach').innerText();
    for(const term of ['Deutschland','Österreich','Schweiz','EUR','CHF','keinen Wechselkurs'])assert(region.includes(term),'DACH context missing: '+term);
   }
   if(path.includes('keller.html')){
    assert.equal(await page.locator('.dach-table table').count(),2);
    assert.equal(await page.locator('#checkliste').count(),1);
    if(js){
     const tool=page.locator('#eb-moisture-choice');
     for(const [name,value] of Object.entries({purpose:'damage',humidity:'high',temperature:'cold'}))await tool.locator('[name='+name+']').selectOption(value);
     await tool.locator('[type=submit]').click();
     assert.equal(await tool.locator('[data-answer]:visible').getAttribute('data-answer'),'cause');
     assert.equal(await tool.locator('[data-choice-action=shop]:visible').count(),0);
    }
   }
   if(width===390&&js){await mkdir('/tmp/eco-dach-qa',{recursive:true});await page.screenshot({path:'/tmp/eco-dach-qa/'+(path.split('/').pop()||'index.html')+'.png',fullPage:true});}
   checks++;
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(JSON.stringify({pass:true,checks,externalTraffic:false}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
