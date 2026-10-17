const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.BASE_URL||'http://127.0.0.1:8768';
const out=process.env.QA_DIR||'/tmp/eco-upkeep-qa';
const executablePath=process.env.CHROMIUM_PATH;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});let checks=0;
 const check=(v,msg)=>{assert(v,msg);checks++;};
 try{
  for(const [slug,care] of [['tineco-saugt-nicht-mehr',true],['thermovorhang-ratgeber',false]]){
   const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
   await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
   await page.addInitScript(()=>{window.__business=[];window.addEventListener('fleet:business',e=>window.__business.push(e.detail));Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text}});});
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/guide/'+slug+'.html?__probe=1');
   const root=page.locator('#upkeep-check'),form=root.locator('form'),result=root.locator('[data-result]');
   await form.waitFor({state:'visible'});
   await root.locator('button[type=submit]').click();check(!await result.isVisible(),'empty form is not complete');
   await root.locator('[data-example]').click();check(/Fiktives Beispiel/i.test(await result.innerText()));check(!await root.locator('[data-copy]').isVisible());
   const choose=async values=>{for(const [name,value]of Object.entries(values))await root.locator(`input[name="${name}"][value="${value}"]`).check();};
   const run=async()=>root.locator('button[type=submit]').click();
   if(care){
    await choose({model:'s5',symptom:'weak',care:'not-yet'});check(!await result.isVisible(),'selection invalidates example');await run();check((await result.innerText()).includes('freigegebene Pflege'));
    await root.locator('[data-copy]').click();check((await page.evaluate(()=>window.__copied)).includes('getecoback.com/guide/tineco-saugt-nicht-mehr.html#upkeep-check'));check(!(await page.evaluate(()=>window.__copied)).includes('__probe'));
    await choose({model:'other',symptom:'burnt',care:'dry'});await run();check((await result.innerText()).includes('Nicht weiter benutzen'));check((await result.innerText()).includes('nicht erneut testen oder laden'));
    await choose({model:'s7-flashdry',symptom:'weak'});await run();check((await result.innerText()).includes('belegt keine Diagnose'));
    await choose({model:'s5',symptom:'stops'});await run();check((await result.innerText()).includes('beweist keinen Akkudefekt'));check(await root.locator('a[href*="amazon"]').count()===0);
   }else{
    const shop=root.locator('[data-shop]');
    await choose({place:'window',radiator:'covered',opening:'blocked'});await run();check(!await shop.isVisible());check((await result.innerText()).includes('Heizkörper und Thermostat'));check((await result.innerText()).includes('Fluchtweg'));
    await choose({radiator:'clear',opening:'unsure'});await run();check(!await shop.isVisible());
    await choose({opening:'clear'});await run();check(await shop.isVisible());check((await shop.innerText()).includes('keine geprüften Modelle oder Größen'));check((await shop.locator('a').getAttribute('href')).startsWith('https://www.amazon.de/'));
    await root.locator('[data-copy]').click();check((await page.evaluate(()=>window.__copied)).includes('keine Passformprüfung'));
    await choose({opening:'blocked'});check(!await result.isVisible());check(!await root.locator('[data-copy-text]').isVisible());
   }
   for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow at '+width);}
   await page.setViewportSize({width:390,height:844});await root.screenshot({path:out+'/'+slug+'.png'});
   check(errors.length===0,JSON.stringify(errors));check((await page.evaluate(()=>window.__business)).length===0,'QA emits no business events');await page.close();
   const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());await nojs.goto(base+'/guide/'+slug+'.html?__probe=1');check(await nojs.locator('#upkeep-check noscript').isVisible());check(!await nojs.locator('#upkeep-check form').isVisible());check((await nojs.locator('article').innerText()).includes('Häufige Fragen'));await nojs.close();
  }
  console.log(JSON.stringify({pass:true,checks}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
