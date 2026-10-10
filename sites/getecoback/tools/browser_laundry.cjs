const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:8765',dir=process.env.QA_DIR||'/tmp/eco-laundry-qa',launch=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{};
async function laundryShareRecovery(page,lang,p){
 let checks=0;const verify=Object.assign((...args)=>{checks++;return assert(...args);},{match:(...args)=>{checks++;return assert.match(...args);},equal:(...args)=>{checks++;return assert.equal(...args);}});
 const root=page.locator('#laundry-check'),form=root.locator('form'),submit=root.locator('[type=submit]'),panel=page.locator('#eco-tool-experience');
 const prepare=panel.locator(':scope > .eco-actions').last().locator('button').first(),preview=panel.locator('.eco-preview');
 const field=name=>root.locator(`[name="${name}"]`),mode=value=>field('method').selectOption(value);
 const cost=async(dryer,dehum)=>{verify.match(await root.locator('[data-cost=dryer]').innerText(),dryer);verify.match(await root.locator('[data-cost=dehum]').innerText(),dehum);};
 const validShare=async()=>{verify(await form.evaluate(e=>e.checkValidity()));await page.waitForFunction(()=>!document.querySelector('#eco-tool-experience > .eco-actions:last-of-type button').disabled);verify(await preview.isVisible());verify.equal((await page.evaluate(()=>window.__qaBusiness)).length,0);};
 const restored=async(method,dehum)=>{await page.waitForFunction(({method,dehum})=>{const r=document.querySelector('#laundry-check'),value=r?.querySelector('[data-cost=dehum]')?.textContent||'';return r?.querySelector('[name=method]')?.value===method&&!r.querySelector('[data-results]').hidden&&Number(value.replace(/[^0-9,.-]/g,'').replace(',','.'))===dehum;},{method,dehum});await validShare();};
 const invalid=async()=>{await submit.click();verify(!await form.evaluate(e=>e.checkValidity()));verify(!await root.locator('[data-results]').isVisible());verify(await prepare.isDisabled());};
 await page.waitForSelector('#eco-tool-experience[data-ready]');
 const details=root.locator('form details');if(await details.getAttribute('open')===null)await details.locator('summary').click();
 await field('dryerBasis').selectOption('cycle');await field('dryer').fill('2');await field('price').fill('0.30');await field('currency').selectOption('GBP');
 await mode('estimate');await field('watts').fill('600');await field('hours').fill('8');await field('comparable').uncheck();await submit.click();await validShare();await cost(/0[,.]60/,/1[,.]44/);
 verify.match(await root.locator('[data-verdict]').innerText(),lang==='en'?/Confirm equivalent/:/bestätigen/);
 verify(!/[€]|EUR/.test(await preview.innerText()));verify.match(await preview.innerText(),/£/);
 await field('comparable').check();await field('dryerBasis').selectOption('hundred');await field('dryer').fill('200');await submit.click();await cost(/0[,.]60/,/1[,.]44/);
 // Native HTML validity excludes the inactive mode; so must the share adapter.
 await mode('measured');await field('dehum').fill('-1');await invalid();
 await mode('estimate');await submit.click();await validShare();await cost(/0[,.]60/,/1[,.]44/);
 verify.equal(await field('dehum').inputValue(),'-1');verify(await field('dehum').isDisabled());
 await prepare.click();const estimateLink=new URL(await panel.locator('.eco-fallback').getAttribute('href'));
 const estimate=JSON.parse(decodeURIComponent(estimateLink.hash.slice(8))).values;
 verify(!Object.hasOwn(estimate,'dehum'));verify.equal(estimate.watts,'600');verify.equal(estimate.hours,'8');verify.equal(estimate.currency,'GBP');
 verify(!(await panel.locator('textarea').inputValue()).includes(lang==='en'?'Metered energy per run':'Gemessene Energie je Durchgang'));
 // Returning to that mode must retain, and reject, the user's invalid value.
 await mode('measured');verify.equal(await field('dehum').inputValue(),'-1');await invalid();await field('dehum').fill('1');await submit.click();await validShare();await cost(/0[,.]60/,/0[,.]30/);
 await mode('estimate');await field('hours').fill('');await invalid();
 await mode('measured');await submit.click();await validShare();await cost(/0[,.]60/,/0[,.]30/);verify.equal(await field('hours').inputValue(),'');
 await prepare.click();const measuredLink=new URL(await panel.locator('.eco-fallback').getAttribute('href'));
 const measured=JSON.parse(decodeURIComponent(measuredLink.hash.slice(8))).values;
 verify(!Object.hasOwn(measured,'watts'));verify(!Object.hasOwn(measured,'hours'));verify.equal(measured.dehum,'1');
 const draft=await panel.locator('textarea').inputValue();verify(!draft.includes(lang==='en'?'Average power (W)':'Mittlere Leistung (W)'));verify(!draft.includes('undefined'));
 // Active-only links reload, and old complete schemas remain readable.
 const route=hash=>base+p+'?__probe=1'+hash;
 await page.goto(route(measuredLink.hash));await page.waitForSelector('#eco-tool-experience[data-ready]');await restored('measured',0.30);await cost(/0[,.]60/,/0[,.]30/);
 await page.reload();await page.waitForSelector('#eco-tool-experience[data-ready]');await restored('measured',0.30);verify.equal(await field('method').inputValue(),'measured');
 await field('dehum').fill('2');await submit.click();await validShare();await cost(/0[,.]60/,/0[,.]60/);
 const legacy={...measured,watts:'600',hours:''};
 await page.goto(route('#eco-v1='+encodeURIComponent(JSON.stringify({path:p,values:legacy}))));await restored('measured',0.30);await cost(/0[,.]60/,/0[,.]30/);
 await page.goto(route(estimateLink.hash));await restored('estimate',1.44);await cost(/0[,.]60/,/1[,.]44/);
 await page.goBack();await restored('measured',0.30);await cost(/0[,.]60/,/0[,.]30/);
 await page.goForward();await restored('estimate',1.44);await cost(/0[,.]60/,/1[,.]44/);
 await field('hours').fill('1');await submit.click();await validShare();await cost(/0[,.]60/,/0[,.]18/);
 const legacyEstimate={...estimate,dehum:'-1'};await page.goto(route('#eco-v1='+encodeURIComponent(JSON.stringify({path:p,values:legacyEstimate}))));await restored('estimate',1.44);verify.equal(await field('dehum').inputValue(),'1');
 await mode('measured');await field('dehum').fill('1');await submit.click();await validShare();await mode('estimate');await submit.click();await validShare();
 for(const width of [320,390]){await page.setViewportSize({width,height:844});verify(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await submit.click();await validShare();await cost(/0[,.]60/,/1[,.]44/);}
 return checks;
}

(async()=>{fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,...launch});let checks=0;try{for(const [lang,p]of [['de','/waeschetrockner-oder-luftentfeuchter.html'],['en','/en/guide/dehumidifier-drying-clothes-cost.html']]){const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],events=[];await page.addInitScript(()=>{window.__qaBusiness=[];window.addEventListener('fleet:business',e=>window.__qaBusiness.push(e.detail));});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin)return r.abort();if(u.pathname.startsWith('/api/')){try{events.push(JSON.parse(r.request().postData()));}catch{}return r.fulfill({body:'{"ok":true}',contentType:'application/json'});}return r.continue();});await page.goto(base+p+'?__probe=1');const root=page.locator('#laundry-check'),submit=root.locator('[type=submit]');await root.locator('[data-example]').click();assert.match(await root.locator('[data-provenance]').innerText(),lang==='en'?/Fictional/i:/Rechenbeispiel/i);checks++;assert.match(await root.locator('[data-verdict]').innerText(),lang==='en'?/dryer costs less/:/Trockner verursacht/);checks++;await root.locator('[name=hours]').fill('4');assert.equal(await root.locator('[data-results]').isVisible(),false);checks++;await submit.click();assert.match(await root.locator('[data-provenance]').innerText(),lang==='en'?/edited/i:/geänderten/i);assert.match(await root.locator('[data-verdict]').innerText(),lang==='en'?/dehumidifier costs less/:/Entfeuchter verursacht/);checks+=2;await root.locator('[name=comparable]').uncheck();await submit.click();assert.match(await root.locator('[data-verdict]').innerText(),lang==='en'?/Confirm/:/bestätigen/);checks++;await root.locator('[name=method]').selectOption('measured');assert.equal(await root.locator('[name=hours]').isVisible(),false);await root.locator('[name=dehum]').fill('1');await root.locator('[name=dryerBasis]').selectOption('hundred');await root.locator('[name=dryer]').fill('150');await root.locator('[name=comparable]').check();await submit.click();assert.match(await root.locator('[data-cost=dryer]').innerText(),/0[,.]53/);checks+=2;for(const [sel,ext]of [['[data-csv]','csv'],['[data-card]','png']]){const promise=page.waitForEvent('download');await root.locator(sel).click();const d=await promise,dest=path.join(dir,'laundry-'+lang+'.'+ext);await d.saveAs(dest);assert(fs.statSync(dest).size>200);if(ext==='csv'){const csv=fs.readFileSync(dest,'utf8');assert(csv.includes('"dryer_input_basis","hundred"'));assert(csv.includes('"dehumidifier_kwh_per_run","1"'));}checks++;}await root.locator('[data-share]').click();assert.match(await root.locator('[data-share-url]').innerText(),/#laundry-check$/);assert(!(await root.locator('[data-share-url]').innerText()).includes('__probe'));checks++;checks+=await laundryShareRecovery(page,lang,p);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;await root.screenshot({path:path.join(dir,'laundry-'+lang+'-mobile.png')});await page.setViewportSize({width:1280,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;assert.deepEqual(errors,[]);assert.equal(events.filter(e=>e?.n?.startsWith('laundry_')).length,0);checks+=2;await page.close();}console.log(JSON.stringify({pass:true,checks}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
