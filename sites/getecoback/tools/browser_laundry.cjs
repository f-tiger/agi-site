const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.BASE_URL||'http://127.0.0.1:8765',dir=process.env.QA_DIR||'/tmp/eco-laundry-qa',launch=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{};
async function openLaundryFixture(browser,{javaScriptEnabled,analyticsDenied=false}){
 const localOrigin=new URL(base).origin;
 const page=await browser.newPage({javaScriptEnabled,viewport:{width:320,height:844},serviceWorkers:'block'});
 const writes=[],downloads=[],external=[],errors=[];
 await page.addInitScript(analyticsDenied=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>false});
  Object.defineProperty(navigator,'doNotTrack',{get:()=> '0'});
  Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>false});
  if(analyticsDenied)localStorage.setItem('fleet_ga4_choice_v1','denied');
  window.__laundryActions=[];
  window.addEventListener('fleet:business',event=>window.__laundryActions.push(event.detail));
 },analyticsDenied);
 await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==localOrigin){external.push(url.href);return route.abort();}
  if(request.method()!=='GET'){
   let event;
   try{event=JSON.parse(request.postData());}catch{}
   writes.push({path:url.pathname,event});
   return route.fulfill({status:204});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({body:'{"ok":true}',contentType:'application/json'});
  return route.continue();
 });
 page.on('download',download=>downloads.push(download.suggestedFilename()));
 page.on('pageerror',error=>errors.push(error.message));
 return {page,writes,downloads,external,errors};
}

async function checkMeasuredResultHandoff(browser){
 const path='/waeschetrockner-oder-luftentfeuchter.html',anchor='#waesche-messung-naechster-schritt';
 const drySpace='/produkte.html#entscheidung-waeschetrockner',room='/guide/waesche-trocknen-wohnung.html#eb-models';
 const start=base+path+anchor;
 let checks=0;
 for(const javaScriptEnabled of [false,true]){
  const {page,writes}=await openLaundryFixture(browser,{javaScriptEnabled});
  await page.goto(start);
  assert(await page.locator(anchor).isVisible(),'The next-step explanation is available at its own permanent link');
  assert.equal(new URL(page.url()).hash,anchor);checks+=2;
  if(!javaScriptEnabled){assert.deepEqual(writes,[]);await page.close();checks++;continue;}
  const root=page.locator('#laundry-check'),form=root.locator('form');
  const next=root.locator('[data-results] [data-laundry-result-next] a');
  const field=name=>form.locator('[name="'+name+'"]');
  const submit=form.locator('[type=submit]');
  const expectNext=async href=>{
   assert(await next.isVisible());
   assert.equal(await next.getAttribute('href'),href);
   assert.equal(page.url(),start,'Showing an answer cannot open the suggested destination');checks+=3;
  };
  await root.locator('[data-example]').click();
  await expectNext('#lc-measurement');
  const details=form.locator('details');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
  await field('method').selectOption('measured');
  await submit.click();await expectNext('#lc-measurement');
  await field('dryerBasis').selectOption('cycle');await field('dryer').fill('1.4');
  await submit.click();await expectNext('#lc-measurement');
  await field('dehum').fill('2.1');
  await field('comparable').uncheck();
  assert(await next.isHidden(),'Changing input hides the previous handoff');checks++;
  await submit.click();await expectNext('#lc-endtrockenheit');
  await field('comparable').check();
  await field('dryerBasis').selectOption('hundred');await field('dryer').fill('140');
  await submit.click();await expectNext('#lc-measurement');
  await field('dryerBasis').selectOption('cycle');await field('dryer').fill('1.4');
  await field('method').selectOption('estimate');await field('watts').fill('350');await field('hours').fill('6');
  await submit.click();await expectNext('#lc-measurement');
  await field('method').selectOption('measured');await field('dehum').fill('1');
  await submit.click();await expectNext(room);
  await field('dehum').fill('1.4');await submit.click();await expectNext('#waesche-entscheidung');
  await field('dehum').fill('2');await submit.click();await expectNext(drySpace);
  await page.waitForLoadState('networkidle');
  const laundryPosts=()=>writes.filter(({event})=>event?.n?.startsWith('laundry_')).map(({event})=>event.n);
  const previous=laundryPosts();
  assert(previous.every(name=>['laundry_view','laundry_compare'].includes(name)),'Result links use the existing calculation events');
  await next.press('Enter');
  await page.waitForURL(base+drySpace);
  assert(await page.locator('#entscheidung-waeschetrockner').isVisible());
  await page.waitForLoadState('networkidle');
  assert.deepEqual(laundryPosts(),previous,'Choosing an internal result link adds no laundry event');
  checks+=3;await page.close();
 }
 return checks;
}

async function checkCombinedLabelDecision(browser){
 const route='/waeschetrockner-oder-luftentfeuchter.html';
 const answer='#waschtrockner-label';
 const permalink='https://getecoback.com'+route+answer;
 let checks=0;
 const check=(value,message)=>{assert.ok(value,message);checks++;};
 const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
 for(const javaScriptEnabled of [true,false]){
  const {page,writes,downloads,external,errors}=await openLaundryFixture(browser,{javaScriptEnabled});
  await page.goto(base+route+answer);
  const section=page.locator(answer),root=page.locator('#laundry-check');
  const form=root.locator('form'),results=root.locator('[data-results]');
  check(await section.isVisible(),'Combined-label answer is readable at the permalink');
  check(/Waschtrockner/i.test(await section.innerText()),'The standalone section identifies the combined appliance label');
  const reddit=section.locator('a[href^="https://www.reddit.com/submit?"]');
  check(await reddit.isVisible(),'Readers can voluntarily share the standalone answer');
  const shareHref=await reddit.getAttribute('href'),composer=new URL(shareHref);
  equal(composer.origin+composer.pathname,'https://www.reddit.com/submit','Only the public composer is offered');
  equal([...composer.searchParams.keys()].sort(),['title','url'],'Only static sharing fields are included');
  equal(composer.searchParams.get('url'),permalink,'Sharing reaches the precise answer without tracking or values');
  check((composer.searchParams.get('title')||'').trim().length>0,'The fixed title is present');

  if(javaScriptEnabled){
   const field=name=>form.locator('[name="'+name+'"]');
   const basis=field('dryerBasis'),dryer=field('dryer'),submit=form.locator('[type=submit]');
   const warning=root.locator('[data-combined-warning]');
   const panel=page.locator('#eco-tool-experience');
   const prepare=panel.locator(':scope > .eco-actions').last().locator('button').first();
   await panel.waitFor({state:'visible'});
   await page.waitForSelector('#eco-tool-experience[data-ready]');
   const details=form.locator('details');
   if(await details.getAttribute('open')===null)await details.locator('summary').click();
   await basis.selectOption('hundred');
   await dryer.fill('150');
   await field('currency').selectOption('EUR');
   await field('price').fill('0.35');
   await field('method').selectOption('measured');
   await field('dehum').fill('1');
   await field('comparable').check();
   const completed=page.waitForRequest(request=>request.url()===base+'/api/ev'&&request.postData()?.includes('"n":"laundry_compare"'));
   await submit.click();
   await completed;
   check(/0,53/.test(await root.locator('[data-cost=dryer]').innerText()),'A known drying-only label can complete');
   await prepare.click();
   check(await panel.getByRole('link',{name:'Szenario-Link (enthält Werte)',exact:true}).isVisible(),'The previous valid result is shareable before switching inputs');

   const actions=()=>page.evaluate(()=>window.__laundryActions.filter(action=>/eco_laundry_(calculate|compare|export)/.test(action.name)));
   const conversionPosts=()=>writes.filter(({event})=>['laundry_compare','laundry_export'].includes(event?.n));
   const earlierActions=await actions(),earlierWrites=conversionPosts().slice();
   await basis.selectOption('combined');
   check(await warning.isVisible(),'Selecting the combined label shows a blocking message');
   check(/Waschtrockner|Kombilabel|Waschen.*Trocknen/i.test(await warning.innerText()),'The German message identifies the combined washing and drying input');
   equal(await warning.getAttribute('id'),'laundry-combined-warning','The blocker has a stable accessible target');
   check((await basis.getAttribute('aria-describedby')||'').split(/\s+/).includes('laundry-combined-warning'),'The selected basis points to its explanation');
   check(await dryer.isDisabled(),'The combined-label number cannot be entered as a drying-only value');
   check(await submit.isDisabled(),'The normal calculation is blocked');
   check(!await results.isVisible(),'There is no stale cost output');
   check(await prepare.isDisabled(),'There is no result-specific sharing');
   check(!await panel.getByRole('link',{name:'Szenario-Link (enthält Werte)',exact:true}).isVisible(),'No stale value-bearing scenario link is exposed');
   await form.evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   for(const selector of ['[data-csv]','[data-card]']){
    const exportButton=root.locator(selector);
    check(!await exportButton.isVisible(),'No calculation export is offered');
    await exportButton.evaluate(button=>button.click());
   }
   await page.waitForTimeout(100);
   check(await warning.isVisible(),'Direct submit also refuses the combined label');
   check(!await results.isVisible(),'Direct submit does not produce a result');
   equal(await actions(),earlierActions,'Blocked input produces no completion or export action');
   equal(conversionPosts(),earlierWrites,'Blocked input makes no conversion or export request');
   equal(downloads,[],'Neither hidden export can download a stale result');
   equal(await reddit.getAttribute('href'),shareHref,'The independent article share never includes form values');
   equal(new URL(page.url()).hash,answer,'No private value enters the location');
   equal(new URL(page.url()).search,'','The blocking branch does not submit fields to the URL');

   for(const [measure,input,cost] of [['hundred','150','0,53'],['cycle','2','0,70']]){
    await basis.selectOption(measure);
    check(await dryer.isEnabled()&&await submit.isEnabled(),'Switching to a valid drying-only basis restores the controls');
    check(!await warning.isVisible(),'The warning clears when drying-only measures are selected');
    await dryer.fill(input);
    await submit.click();
    check(await results.isVisible(),'A drying-only result is available after the combined-label branch');
    check((await root.locator('[data-cost=dryer]').innerText()).includes(cost),'The two supported bases still calculate correctly');
   }
  }else{
   check(await form.isHidden(),'No-script readers cannot submit form measurements');
   check(await root.locator('[data-laundry-fallback]').isVisible(),'No-script readers retain the worked fallback');
   equal(writes,[],'Opening the answer without scripts produces no write');
  }
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The answer and calculator fit on a 320px viewport');
  check(!external.some(url=>new URL(url).hostname==='www.reddit.com'),'The composer is not opened automatically');
  equal(errors,[],'The page has no JavaScript exception');
  await page.close();
 }
 return checks;
}

async function checkSingleDryingCost(browser){
 const route='/waeschetrockner-oder-luftentfeuchter.html';
 const answer='#luftentfeuchter-waesche-kosten';
 const permalink='https://getecoback.com'+route+answer;
 const action={name:'eco_laundry_single_calculate'};
 let checks=0;
 const check=(value,message)=>{assert.ok(value,message);checks++;};
 const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
 for(const scenario of ['normal','probe','opt-out','no-script']){
  const javaScriptEnabled=scenario!=='no-script';
  const {page,writes,downloads,external,errors}=await openLaundryFixture(browser,{javaScriptEnabled,analyticsDenied:scenario==='opt-out'});
  const original=base+route+(scenario==='probe'?'?__probe=1':'')+answer;
  await page.goto(original);
  const section=page.locator(answer),form=section.locator('form[data-laundry-single]');
  const result=section.locator('[data-single-result][role=status]');
  check(await section.getByRole('heading',{name:/Wäschetrocknen.*Luftentfeuchter/i}).isVisible(),'Distinct answer is readable at its canonical fragment');
  check(/0,63\s*€/.test(await section.innerText()),'Static answer includes a usable measured example');
  const reddit=section.locator('a[href^="https://www.reddit.com/submit?"]');
  check(await reddit.isVisible(),'Readers can share the separate answer voluntarily');
  const href=await reddit.getAttribute('href'),composer=new URL(href);
  equal(composer.origin+composer.pathname,'https://www.reddit.com/submit');
  equal([...composer.searchParams.keys()].sort(),['title','url'],'Share uses only static fields');
  equal(composer.searchParams.get('url'),permalink,'Share URL carries no measurements or tracking');
  check((composer.searchParams.get('title')||'').trim().length>0,'Fixed sharing title present');
  equal(await section.locator('[data-verdict],[data-csv],[data-card]').count(),0,'No comparison verdict or export controls');
  equal(await page.locator('#laundry-check [data-csv],#laundry-check [data-card]').count(),2,'Original comparison exports remain present');

  if(javaScriptEnabled){
   await form.waitFor({state:'visible'});
   const field=name=>form.locator('[name="'+name+'"]');
   const mode=field('method'),submit=form.locator('[type=submit]');
   const actions=()=>page.evaluate(name=>window.__laundryActions.filter(event=>event.name===name),action.name);
   equal(await mode.inputValue(),'measured','Reader starts with measured energy');
   equal(await field('dehum').inputValue(),'','No energy measurement is assumed');
   equal(await field('price').inputValue(),'','No tariff is assumed');
   check(await field('watts').isDisabled()&&await field('hours').isDisabled(),'Inactive estimated fields cannot submit');
   await form.evaluate(form=>form.requestSubmit());
   equal(await actions(),[],'Incomplete input emits no completion');
   check(!(await result.textContent()).trim(),'Incomplete input yields no result');

   await field('dehum').fill('1.8');
   await field('price').fill('0.35');
   await submit.click();
   const measured=await result.innerText();
   check(/0,63\s*€/.test(measured),'1.8 kWh at €0.35/kWh produces €0.63');
   check(/gemessen|Messwert/i.test(measured),'The result identifies the energy measurement');
   check(!/Sieger|kostet weniger|günstiger|Gewinner/i.test(measured),'A single device has no comparison verdict');
   equal(await actions(),scenario==='normal'?[action]:[],'A measured result emits only the fixed allowed action');

   await mode.selectOption('estimate');
   check(await field('dehum').isDisabled()&&await field('watts').isEnabled()&&await field('hours').isEnabled(),'Estimate uses only its active fields');
   check(!(await result.textContent()).trim(),'Switching methods clears the prior result');
   await field('watts').fill('400');
   await field('hours').fill('6');
   await submit.click();
   const estimate=await result.innerText();
   check(/0,84\s*€/.test(estimate),'400 W over six hours at €0.35/kWh produces €0.84');
   check(/Schätzung|geschätzt/i.test(estimate),'Power and duration yield an explicitly marked estimate');
   check(!/Sieger|kostet weniger|günstiger|Gewinner/i.test(estimate),'The estimate has no comparison verdict');
   equal(await actions(),scenario==='normal'?[action,action]:[],'Both paths emit the same fixed payload without values');
   equal(page.url(),original,'Calculation leaves the initial URL and fragment untouched');
   equal(await reddit.getAttribute('href'),href,'Private inputs never enter the sharing link');
   equal(writes.filter(({event})=>!['page_view','laundry_view'].includes(event?.n)),[],'No calculation data, comparison completion or export goes to the browser API');
  }else{
   check(await form.isHidden(),'No-script readers cannot submit input data');
   equal(writes,[],'No-script answer sends no write');
  }
  equal(downloads,[],'The single-method calculator causes no download');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The answer fits on a 320px viewport');
  check(!external.some(url=>new URL(url).hostname==='www.reddit.com'),'Reddit is not contacted automatically');
  equal(errors,[],'No JavaScript exception');
  await page.close();
 }
 return checks;
}

async function laundryShareRecovery(page,lang,p){
 let checks=0;const verify=Object.assign((...args)=>{checks++;return assert(...args);},{match:(...args)=>{checks++;return assert.match(...args);},equal:(...args)=>{checks++;return assert.equal(...args);}});
 const root=page.locator('#laundry-check'),form=root.locator('form'),submit=root.locator('[type=submit]'),panel=page.locator('#eco-tool-experience');
 const prepare=panel.locator(':scope > .eco-actions').last().locator('button').first(),preview=panel.locator('.eco-preview');
 if(lang==='en')verify.equal(await page.locator('#waesche-messung-naechster-schritt,[data-laundry-result-next]').count(),0);
 const scenarioLink=lang==='de'
  ? panel.getByRole('link',{name:'Szenario-Link (enthält Werte)',exact:true})
  : panel.locator('.eco-fallback');
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
 await prepare.click();const estimateLink=new URL(await scenarioLink.getAttribute('href'));
 const estimate=JSON.parse(decodeURIComponent(estimateLink.hash.slice(8))).values;
 verify(!Object.hasOwn(estimate,'dehum'));verify.equal(estimate.watts,'600');verify.equal(estimate.hours,'8');verify.equal(estimate.currency,'GBP');
 verify(!(await panel.locator('textarea').inputValue()).includes(lang==='en'?'Metered energy per run':'Gemessene Energie je Durchgang'));
 // Returning to that mode must retain, and reject, the user's invalid value.
 await mode('measured');verify.equal(await field('dehum').inputValue(),'-1');await invalid();await field('dehum').fill('1');await submit.click();await validShare();await cost(/0[,.]60/,/0[,.]30/);
 await mode('estimate');await field('hours').fill('');await invalid();
 await mode('measured');await submit.click();await validShare();await cost(/0[,.]60/,/0[,.]30/);verify.equal(await field('hours').inputValue(),'');
 await prepare.click();const measuredLink=new URL(await scenarioLink.getAttribute('href'));
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
 if(lang==='de'){
  const canonical='https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html#laundry-check';
  const platforms=[
   {name:'Reddit',endpoint:'https://www.reddit.com/submit',caption:'title'},
   {name:'X',endpoint:'https://x.com/intent/post',caption:'text'},
  ];
  const socialTargets=async()=>{
   const captions=[];
   for(const {name,endpoint,caption} of platforms){
    const href=await panel.getByRole('link',{name,exact:true}).getAttribute('href');
    const target=new URL(href);
    verify.equal(target.origin+target.pathname,endpoint);
    verify.equal(target.searchParams.get('url'),canonical);
    verify.equal([...target.searchParams.keys()].sort().join(','),[caption,'url'].sort().join(','));
    verify(target.searchParams.get(caption)?.trim().length>0);
    verify.equal(target.hash,'');
    captions.push(target.searchParams.get(caption));
   }
   return captions;
  };
  await panel.getByRole('button',{name:'Dieses Tool teilen',exact:true}).click();
  const staticCaptions=await socialTargets();
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
  await field('currency').selectOption('EUR');
  await mode('measured');
  await field('dryerBasis').selectOption('cycle');
  await field('dryer').fill('10');
  await field('dehum').fill('1.2');
  await field('price').fill('0.309');
  await field('comparable').uncheck();
  await submit.click();
  await validShare();
  await cost(/3,09/,/0,37/);
  verify.match(await root.locator('[data-formula]').innerText(),/0,309/);
  await prepare.click();
  const text=await panel.locator('textarea').inputValue();
  verify.match(text,/10\s*kWh/);
  verify.match(text,/0,309/);
  verify.match(text,/3,09\s*€/);
  verify.match(text,/0,37\s*€/);
  verify.match(text,/Endtrockenheit nicht als gleich bestätigt/);
  verify.match(text,/Keine Aussage, welches Verfahren bei gleicher Trocknung günstiger ist/);
  verify(text.includes(canonical));
  verify(!text.includes('#eco-v1')&&!text.includes('utm_'));
  verify(!text.includes('Ladungen pro Woche')&&!text.includes('Zusätzlicher Kaufpreis'));
  const resultCaptions=await socialTargets();
  for(const [index,caption] of resultCaptions.entries())verify.equal(caption,staticCaptions[index]);
  const explicit=new URL(await scenarioLink.getAttribute('href'));
  verify(explicit.hash.startsWith('#eco-v1='));
  const shareValues=JSON.parse(decodeURIComponent(explicit.hash.slice(8))).values;
  verify.equal(shareValues.price,'0.309');
  verify.equal(shareValues.comparable,false);
  verify.equal((await page.evaluate(()=>window.__qaBusiness)).length,0);
 }
 return checks;
}

(async()=>{fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,...launch});let checks=0;try{for(const [lang,p]of [['de','/waeschetrockner-oder-luftentfeuchter.html'],['en','/en/guide/dehumidifier-drying-clothes-cost.html']]){const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],events=[];await page.addInitScript(()=>{window.__qaBusiness=[];window.addEventListener('fleet:business',e=>window.__qaBusiness.push(e.detail));});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin)return r.abort();if(u.pathname.startsWith('/api/')){try{events.push(JSON.parse(r.request().postData()));}catch{}return r.fulfill({body:'{"ok":true}',contentType:'application/json'});}return r.continue();});await page.goto(base+p+'?__probe=1');const root=page.locator('#laundry-check'),submit=root.locator('[type=submit]');await root.locator('[data-example]').click();assert.match(await root.locator('[data-provenance]').innerText(),lang==='en'?/Fictional/i:/Rechenbeispiel/i);checks++;assert.match(await root.locator('[data-verdict]').innerText(),lang==='en'?/dryer costs less/:/Trockner verursacht/);checks++;await root.locator('[name=hours]').fill('4');assert.equal(await root.locator('[data-results]').isVisible(),false);checks++;await submit.click();assert.match(await root.locator('[data-provenance]').innerText(),lang==='en'?/edited/i:/geänderten/i);assert.match(await root.locator('[data-verdict]').innerText(),lang==='en'?/dehumidifier costs less/:/Entfeuchter verursacht/);checks+=2;await root.locator('[name=comparable]').uncheck();await submit.click();assert.match(await root.locator('[data-verdict]').innerText(),lang==='en'?/Confirm/:/bestätigen/);checks++;await root.locator('[name=method]').selectOption('measured');assert.equal(await root.locator('[name=hours]').isVisible(),false);await root.locator('[name=dehum]').fill('1');await root.locator('[name=dryerBasis]').selectOption('hundred');await root.locator('[name=dryer]').fill('150');await root.locator('[name=comparable]').check();await submit.click();assert.match(await root.locator('[data-cost=dryer]').innerText(),/0[,.]53/);checks+=2;for(const [sel,ext]of [['[data-csv]','csv'],['[data-card]','png']]){const promise=page.waitForEvent('download');await root.locator(sel).click();const d=await promise,dest=path.join(dir,'laundry-'+lang+'.'+ext);await d.saveAs(dest);assert(fs.statSync(dest).size>200);if(ext==='csv'){const csv=fs.readFileSync(dest,'utf8');assert(csv.includes('"dryer_input_basis","hundred"'));assert(csv.includes('"dehumidifier_kwh_per_run","1"'));}checks++;}await root.locator('[data-share]').click();assert.match(await root.locator('[data-share-url]').innerText(),/#laundry-check$/);assert(!(await root.locator('[data-share-url]').innerText()).includes('__probe'));checks++;checks+=await laundryShareRecovery(page,lang,p);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;await root.screenshot({path:path.join(dir,'laundry-'+lang+'-mobile.png')});await page.setViewportSize({width:1280,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;assert.deepEqual(errors,[]);assert.equal(events.filter(e=>e?.n?.startsWith('laundry_')).length,0);checks+=2;await page.close();}checks+=await checkMeasuredResultHandoff(browser);checks+=await checkCombinedLabelDecision(browser);checks+=await checkSingleDryingCost(browser);console.log(JSON.stringify({pass:true,checks}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
