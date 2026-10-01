import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(root+'tools/revenue-studio/package.json'),{chromium}=require('playwright');
const browser=await chromium.launch(process.env.BROWSER_CONFIG?JSON.parse(fs.readFileSync(process.env.BROWSER_CONFIG)):{headless:true});
let checks=0;const ok=(value,label)=>{assert.ok(value,label);checks++;};
fs.mkdirSync('/tmp/distribution-qa',{recursive:true});
try{
 for(const prefix of ['','/en']){
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
  await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false,configurable:true}));
  const events=[],errors=[],external=[];
  context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.host==='publisher.example')return route.fulfill({contentType:'text/html',body:`<iframe title="planner" style="width:100%;height:800px" referrerpolicy="origin" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" src="https://baipiaoji.com${prefix}/embed/work-plan"></iframe>`});
   if(u.host!=='baipiaoji.com'){external.push(u.host);return route.abort();}
   if(u.pathname==='/api/hit'){events.push(route.request().postDataJSON());return route.fulfill({status:204});}
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   for(const f of [u.pathname,u.pathname+'.html',u.pathname+'/index.html']){
    const target=path.join(root,'sites/baipiaoji/dist',f);
    if(fs.existsSync(target)&&fs.statSync(target).isFile())return route.fulfill({body:fs.readFileSync(target),contentType:/\.m?js$/.test(f)?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':'text/html'});
   }
   return route.fulfill({status:404,body:'missing'});
  });
  const page=await context.newPage();await page.goto('https://publisher.example/article?private=never-send');
  const frame=page.frameLocator('iframe');await frame.locator('#wpRoles button').first().waitFor();
  await page.screenshot({path:'/tmp/distribution-qa/widget'+(prefix?'-en':'-zh')+'.png'});
  await frame.locator('#wpGo').click();
  await page.waitForTimeout(50);
  ok(events.some(e=>e.p==='/distribution/work-plan/calculate/external/example'),'example calculation separated');
  const input=frame.locator('#wpTasks input').first();const task=await input.getAttribute('data-t');await input.fill('404');await frame.locator('#wpGo').click();
  await page.waitForTimeout(50);
  ok(events.some(e=>e.p==='/distribution/work-plan/calculate/external/edited'),'edited explicit calculation');
  ok(events.every(e=>e.e==='distribution'),'iframe cannot inflate normal calculator or page views');
  ok(events.every(e=>e.r==='https://publisher.example'),'origin-only referrer');
  ok(!JSON.stringify(events).includes('404')&&!JSON.stringify(events).includes('private'),'no volumes or publisher query');
  ok(await frame.locator('#wpSave').isHidden(),'no embedded account flow');
  const widget=page.frames().find(f=>f.url().includes('/embed/work-plan'));
  ok(await widget.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'widget fits phone');
  ok(external.length===0,'widget loads no third-party assets');
  const popupPromise=context.waitForEvent('page');await frame.locator('#wpFull').click();const popup=await popupPromise;await popup.waitForURL('**/work-plan?via=embed*');await popup.waitForLoadState('domcontentloaded');
  ok(new URL(popup.url()).searchParams.get('via')==='embed','tagged full-tool handoff');
  ok(await popup.locator(`#wpTasks input[data-t="${task}"]`).inputValue()==='404','edited state preserved');
  ok(await popup.evaluate(()=>window.opener===null),'noopener preserved');
  await popup.locator('#wpGo').click();await popup.waitForTimeout(50);
  ok(events.some(e=>e.p==='/distribution/work-plan/calculate/page/edited'),'full-tool activation recorded separately');
  const snippet=await popup.locator('#wpEmbedCode').inputValue();
  const embedURL=new URL(snippet.match(/src="([^"]+)"/)[1]);
  ok(!embedURL.hash&&!embedURL.search&&!snippet.includes('404'),'publisher snippet excludes reader state');
  await popup.locator('#wpEmbedCopy').click();await popup.waitForFunction(()=>document.getElementById('wpEmbedStatus').textContent.length>0);ok((await popup.locator('#wpEmbedStatus').textContent()).length>0,'copy status shown');
  ok(await popup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'publisher kit fits phone');
  events.length=0;await page.goto('https://baipiaoji.com'+prefix+'/embed/work-plan?preview=1');await page.locator('#wpGo').click();await page.waitForTimeout(50);
  ok(events.some(e=>e.p==='/distribution/work-plan/calculate/preview/example'),'preview is not external adoption');
  events.length=0;await page.goto('https://baipiaoji.com'+prefix+'/embed/work-plan?__probe=1');await page.locator('#wpGo').click();await page.waitForTimeout(50);
  ok(events.length===0,'QA suppressed');
  ok(errors.length===0,errors.join('\n'));await context.close();
 }
 console.log('PASS '+checks+' distribution browser checks; all requests intercepted, no production events.');
}finally{await browser.close();}
