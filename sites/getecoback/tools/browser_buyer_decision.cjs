const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const dir=process.env.QA_DIR||'/tmp/eco-buyer-qa';
const launch=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{};
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,...launch});let checks=0;
 try{
  for(const [lang,pathname] of [['de','/guide/luftentfeuchter-ratgeber.html'],['en','/en/guide/dehumidifier-20-sqm.html']]){
   const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],events=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort();if(u.pathname.startsWith('/api/')){try{events.push(JSON.parse(route.request().postData()));}catch{}return route.fulfill({body:'{"ok":true}',contentType:'application/json'});}return route.continue();});
   await page.goto(base+pathname+'?__probe=1');const root=page.locator('#eb-moisture-choice');await root.scrollIntoViewIfNeeded();
   const choose=async(purpose,humidity,temperature,expected)=>{
    for(const [name,value] of Object.entries({purpose,humidity,temperature}))await root.locator('[name='+name+']').selectOption(value);
    await root.locator('[type=submit]').click();assert.equal(await root.locator('[data-answer]:visible').getAttribute('data-answer'),expected);checks++;
   };
   await choose('room','unknown','unknown','measure');await choose('room','normal','warm','wait');await choose('damage','high','warm','cause');await choose('room','high','cold','cold');await choose('laundry','high','warm','laundry');await choose('room','high','warm','compare');
   assert.equal(await root.locator('[data-choice-action=shop]:visible').count(),lang==='de'?2:0);checks++;
   await root.locator('[name=market]').selectOption('de');assert.equal(await root.locator('[data-results]').isVisible(),false);await root.locator('[type=submit]').click();assert.equal(await root.locator('[data-choice-action=shop]:visible').count(),2);checks++;
   await root.locator('summary').click();await root.locator('[data-copy]').click();assert.equal(await root.locator('[data-share]').inputValue(),'https://getecoback.com'+pathname+'#eb-moisture-choice');checks++;
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;
   await root.screenshot({path:path.join(dir,'buyer-'+lang+'.png')});assert.deepEqual(errors,[]);checks++;
   assert.equal(events.filter(e=>e&&e.n?.startsWith('buyer_')).length,0);checks++;
   await page.setViewportSize({width:1280,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;
   await page.close();
  }
  console.log(JSON.stringify({pass:true,checks}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
