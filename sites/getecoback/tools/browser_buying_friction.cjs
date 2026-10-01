// Real layout and delayed purchase surfaces. All pages/assets are local fixtures;
// no Amazon navigation, GA request or production event is allowed out.
const {chromium,webkit}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve('site'), origin='https://getecoback.com';
const baseline=process.env.BUYING_BASELINE_SHA;
const preShelf='902485034ee0598aed3dd8b21e718c9fca5569f7';
const cases=[
 ['/guide/luftentfeuchter-25-qm.html','Europe/Berlin',false],
 ['/guide/heizluefter-stromverbrauch.html','Europe/Berlin',false],
 ['/en/guide/dehumidifier-20-sqm.html','America/New_York',false],
 ['/en/guide/dehumidifier-20-sqm.html','Europe/Berlin',false],
 ['/guide/klimaanlage-40-qm.html','Europe/Berlin',true],
 ['/en/guide/best-portable-air-conditioner-for-bedroom.html','America/New_York',true],
];
(async()=>{
 const results=[],dir=process.env.QA_DIR||'/tmp/eco-energy-qa';await fs.mkdir(dir,{recursive:true});
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{for(const revision of baseline?[preShelf,baseline,'current']:['current'])for(const width of [320,390])for(const [url,tz,cooling] of cases){
   if(revision===preShelf&&!url.includes('best-portable-air-conditioner-for-bedroom'))continue;
   const context=await browser.newContext({viewport:{width,height:844},timezoneId:tz,isMobile:true,hasTouch:true});
   await context.addInitScript(saveRoom=>{
    // Exercise ordinary first-visit consent behaviour with every network call mocked.
    Object.defineProperty(navigator,'webdriver',{get:()=>false});
    window.__events=[];
    navigator.sendBeacon=function(url,body){if(String(url).includes('/api/ev')){
     Promise.resolve(body instanceof Blob?body.text():String(body)).then(s=>window.__events.push(JSON.parse(s)));
    }return true;};
    if(saveRoom)localStorage.setItem('eb_room',JSON.stringify({qm:20,qp:20,btu:7000,model:'Comfee MPPH-09CRN7',term:'Comfee+MPPH-09CRN7'}));
   },!tz.startsWith('America/'));
   const old=revision==='current'?null:execFileSync('git',['show',revision+':sites/getecoback/site'+url],{encoding:'utf8',maxBuffer:3e6});
   const errors=[];
   await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.origin!==origin)return route.abort();
    if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:false,c:tz.startsWith('America/')?'US':'DE'})});
    if(old&&u.pathname===url)return route.fulfill({contentType:'text/html',body:old});
    const p=path.join(root,u.pathname),ext=path.extname(p);
    const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[ext]||'application/octet-stream';
    try{return route.fulfill({contentType:mime,body:await fs.readFile(p)});}catch{return route.fulfill({status:404,body:'missing fixture'});}
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('popup',p=>p.close().catch(()=>{}));
   await page.clock.install();await page.goto(origin+url,{waitUntil:'load'});
   const consent=page.locator('#fleet-analytics-choice:visible');
   const consentShown=await consent.count()>0;
   if(consentShown)await page.locator('[data-analytics-choice="denied"]').click();
   await page.evaluate(()=>window.scrollTo(0,650));await page.waitForTimeout(100);
   const sticky=page.locator('#eb-sticky-cta');
   const stickyUrl=await sticky.getAttribute('href');
   await page.clock.fastForward(30000);
   await page.evaluate(()=>window.scrollTo(0,Math.max(700,document.documentElement.scrollHeight*0.7)));
   await page.locator('#eb-pu').waitFor({state:'visible'});
   const metrics=await page.evaluate(()=>{
    const box=document.querySelector('#eb-pu'),panel=box.firstElementChild;
    const visible=e=>!!e.getClientRects().length;
    const picks=[...box.querySelectorAll('[data-eb-pu="pick"]')].filter(visible);
    const shelf=document.querySelector('#eb-usshelf:not([hidden]),#eb-models:not([hidden])');
    const top=document.querySelector('#eb-ustop:not([hidden]),#eb-toppick:not([hidden])');
    return {width:innerWidth,popupOverflow:panel.scrollWidth-panel.clientWidth,
     panelTop:panel.getBoundingClientRect().top,
     picks:picks.map(a=>({href:a.href,text:a.innerText})),
     shelfPicks:[...shelf.querySelectorAll('a[href*="amazon."]')].slice(0,3).map(a=>a.href),
     topPick:top.querySelector('a[href*="amazon."]').href,
     calc:!!box.querySelector('[data-eb-pu="calc"]'),
     savedCooling:visible(document.getElementById('eb-pu-room')),
     stickyVisible:visible(document.getElementById('eb-sticky'))};
   });
   const market=tz.startsWith('America/')?'com':'de';
   const record={engine,revision,width,url,tz,cooling,consentShown,stickyUrl,...metrics};results.push(record);
   await fs.writeFile(dir+'/buying-friction.json',JSON.stringify(results,null,2));
   if(engine==='chromium'&&width===390&&tz==='Europe/Berlin'&&url.includes('luftentfeuchter-25'))
    await page.screenshot({path:dir+'/buying-popup-'+revision+'.png'});
   if(revision==='current'){
    assert.equal(new URL(stickyUrl).hostname,'www.amazon.'+market,JSON.stringify(record));
    assert(metrics.picks.length>0,JSON.stringify(record));
    assert.deepEqual(metrics.picks.map(p=>p.href),metrics.shelfPicks,'Popup picks must match the visible shelf, including a two-model shelf');
    assert.equal(stickyUrl,metrics.topPick,'Sticky must follow this page and market, not a saved cooling result');
    assert(metrics.popupOverflow<=1,JSON.stringify(record));assert(metrics.panelTop>=70,JSON.stringify(record));
    assert.equal(metrics.calc,cooling,JSON.stringify(record));
    assert.equal(metrics.savedCooling,cooling&&!tz.startsWith('America/'),JSON.stringify(record));
    assert.equal(metrics.stickyVisible,false,'Floating CTAs must not stack');
    for(const pick of metrics.picks){const u=new URL(pick.href);assert.equal(u.hostname,'www.amazon.'+market);assert.equal(u.searchParams.get('tag'),market==='de'?'getecoback-21':'ecoback0d-20');}
    if(market==='com')assert(!metrics.picks.some(p=>/Comfee|Meaco/i.test(p.text)),'US popup must name the same US models as its shelf');
    const before=await page.evaluate(()=>window.__events.filter(e=>e.n==='affiliate_click').length);
    await page.locator('#eb-pu [data-eb-pu="pick"]:visible').first().click();
    // The real tracker coalesces reports for 700 ms. Advance its timer before
    // asserting delivery; a 250 ms check incorrectly reads a pending click as zero.
    await page.clock.runFor(1000);await page.waitForTimeout(50);
    const clicks=(await page.evaluate(()=>window.__events.filter(e=>e.n==='affiliate_click'))).slice(before);
    assert.equal(clicks.length,1,JSON.stringify({record,clicks}));assert.equal(clicks[0].m.link_url,metrics.picks[0].href);
    await page.locator('#eb-pu-x').click();assert.equal(await page.locator('#eb-pu').isVisible(),false);
    assert.equal(errors.length,0,errors.join(';'));
   }
   await context.close();
  }}finally{await browser.close();}
 }
 await fs.writeFile(dir+'/buying-friction.json',JSON.stringify(results,null,2));
 const old=results.filter(r=>r.revision!=='current');
 console.log('BUYING_TIMELINE='+JSON.stringify(results.filter(r=>r.engine==='chromium'&&r.width===390&&r.url.includes('best-portable-air-conditioner-for-bedroom')).map(r=>({revision:r.revision,sticky:r.stickyUrl,popup:r.picks}))));
 console.log('BUYING_BASELINE='+JSON.stringify({cases:old.length,overflow:old.filter(r=>r.popupOverflow>1).length,nonCoolingBtu:old.filter(r=>r.calc&&!r.cooling).length,usWrongSticky:old.filter(r=>r.tz.startsWith('America/')&&new URL(r.stickyUrl).hostname!=='www.amazon.com').length,usMixedPopup:old.filter(r=>r.tz.startsWith('America/')&&r.picks.some(p=>new URL(p.href).hostname!=='www.amazon.com')).length}));
 console.log(`PASS: ${results.filter(r=>r.revision==='current').length} mobile delayed-purchase scenarios; two engines, two widths, DE/US, correct markets, no BTU detours or popup overflow, one beacon per click. No production requests.`);
})().catch(e=>{console.error(e);process.exit(1);});
