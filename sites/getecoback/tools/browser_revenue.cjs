const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765',dir=process.env.QA_DIR||'/tmp/eco-revenue-qa';
 const copy=JSON.parse(await fs.readFile(path.join(__dirname,'../data/energy-workbench.json'),'utf8'));
 await fs.mkdir(dir,{recursive:true});let checks=0;
 for(const [name,type]of Object.entries({chromium,webkit})){
  const browser=await type.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'}),events=[],errors=[];
   await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!==base)return route.abort();
    if(u.pathname.startsWith('/api/')){if(u.pathname==='/api/ev')events.push(JSON.parse(route.request().postData()));return route.fulfill({status:204,body:''});}
    return route.continue();
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   for(const [lang,t]of Object.entries(copy)){
    await page.goto(base+'/'+t.path);await page.waitForFunction(()=>document.querySelector('#reset').onclick);
    assert.equal(await page.locator('#next-steps').isVisible(),false);checks++;
    await page.locator('[name=confirm]').check();await page.locator('button[type=submit]').click();
    assert.equal(await page.locator('#next-steps').isVisible(),false);checks++;
    await page.locator('[name=purpose][value=own]').check();await page.locator('button[type=submit]').click();
    assert.equal(await page.locator('#next-steps').isVisible(),true);checks++;
    for(const item of t.nextLinks){assert.equal(await page.locator(`[data-next-step="${item.id}"]`).getAttribute('href'),item.path);checks++;}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++;
    const before=events.filter(e=>e.n==='outbound_choice').length;
    await page.locator('[data-next-step]').first().click();
    await page.waitForURL(base+t.nextLinks[0].path);
    assert.equal(events.filter(e=>e.n==='outbound_choice').length,before+1);checks++;
    assert.deepEqual(events.filter(e=>e.n==='outbound_choice').at(-1).m,{lang,market:lang==='en'?'de':lang,input:'own',source:'energy-next',choice:'consumption'});checks++;
   }
   await page.goto(base+'/'+copy.de.path+'?__probe=1');await page.waitForFunction(()=>document.querySelector('#reset').onclick);
   await page.locator('[name=purpose][value=own]').check();await page.locator('[name=confirm]').check();await page.locator('button[type=submit]').click();
   await page.locator('#next-steps').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/revenue-next-'+name+'.png'});
   await page.locator('[name=kwh0]').fill('4000');assert.equal(await page.locator('#next-steps').isVisible(),false);checks++;
   const guide='/guide/balkonspeicher-anker-solarbank-probleme.html';
   for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:900});await page.goto(base+guide+'?__probe=1');
    assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.eb-nav').count(),1);assert.equal(await page.locator('.eb-footer').count(),1);checks+=3;
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++;
    assert.equal(await page.locator('[data-revenue-link]').count(),2);checks++;
    assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(247, 250, 252)');checks++;
    assert.equal(await page.locator('.hero').evaluate(e=>getComputedStyle(e).backgroundImage),'linear-gradient(135deg, rgb(15, 107, 168), rgb(10, 77, 122))');checks++;
    if(width!==320){await page.screenshot({path:`${dir}/solarbank-${name}-${width}.png`,fullPage:true});}
   }
   const count=events.length;
   await page.locator('[data-revenue-link]').first().click();
   assert.equal(events.length,count);checks++;
   await page.goto(base+guide);await page.waitForFunction(()=>document.readyState==='complete');
   const before=events.filter(e=>e.n==='affiliate_click').length;
   await page.locator('[data-revenue-link]').first().click();
   await page.waitForTimeout(150);
   const clicks=events.filter(e=>e.n==='affiliate_click');assert.equal(clicks.length,before+1);checks++;
   assert.equal(clicks.at(-1).m.source,'solarbank-diagnosis');assert.equal(new URL(clicks.at(-1).m.link_url).searchParams.get('tag'),'getecoback-21');checks+=2;
   assert.deepEqual(errors,[]);checks++;
  } finally{await browser.close();}
 }
 console.log(checks+' revenue flow/browser assertions passed; third-party requests blocked');
})().catch(e=>{console.error(e);process.exit(1)});
