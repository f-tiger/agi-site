// Compare the pre-27 September shelf with today's generated pages. All event
// writes and third-party requests are intercepted; no production clicks occur.
const {chromium,webkit}=require('playwright');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const baseline=process.env.AFFILIATE_BASELINE_SHA;
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
const cases=[
  ['/','Europe/Berlin'],
  ['/guide/klimaanlage-40-qm.html','Europe/Berlin'],
  ['/guide/klimaanlage-wohnmobil.html','Europe/Berlin'],
  ['/guide/luftentfeuchter-25-qm.html','Europe/Berlin'],
  ['/guide/heizluefter-stromverbrauch.html','Europe/Berlin'],
  ['/en/guide/dehumidifier-20-sqm.html','America/New_York'],
];
(async()=>{
  const results=[];
  for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]) {
    const browser=await browserType.launch();
    for(const revision of baseline?[baseline,'current']:['current']) {
      for(const [path,tz] of cases) {
        const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:tz});
        const errors=[];
        // WebKit can expose a Blob sendBeacon request with null postData in
        // Playwright. Read the Blob in-page instead of treating that as no click.
        await context.addInitScript(()=>{
          window.__affiliateQA=[];
          const record=async body=>{const text=body instanceof Blob?await body.text():String(body);window.__affiliateQA.push(JSON.parse(text));};
          navigator.sendBeacon=function(url,body){if(String(url).includes('/api/ev'))record(body);return true;};
          const original=window.fetch;
          window.fetch=function(url,options){if(String(url).includes('/api/ev')){record(options?.body);return Promise.resolve(new Response('{"ok":true}',{status:200}));}return original.apply(this,arguments);};
        });
        const oldHtml=revision==='current'?null:execFileSync('git',['show',revision+':sites/getecoback/site/'+(path==='/'?'index.html':path.slice(1))],{encoding:'utf8',maxBuffer:2e6});
        await context.route('**/*',async route=>{
          const u=new URL(route.request().url());
          if(u.origin!==new URL(base).origin) return route.abort();
          if(u.pathname==='/api/ev') {
            return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
          }
          if(u.pathname.startsWith('/api/')) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false,c:tz.startsWith('America/')?'US':'DE'})});
          if(oldHtml&&u.pathname===path) return route.fulfill({status:200,contentType:'text/html',body:oldHtml});
          return route.continue();
        });
        const page=await context.newPage();
        console.log(`Affiliate replay: ${engine} / ${revision} / ${path}`);
        page.on('pageerror',e=>errors.push(e.message));
        page.on('popup',p=>p.close().catch(()=>{}));
        await page.goto(base+path,{waitUntil:'load'});
        await page.waitForTimeout(150);
        const selectors=path==='/'?['a[data-eb-tp]','#eb-herbst a[href*="amazon."]']:
          tz.startsWith('America/')?['#eb-ustop a[href*="amazon."]','#eb-usshelf a[href*="amazon."]']:
          ['a[data-eb-tp]','article a[href*="amazon."]'];
        for(const selector of selectors) {
          const link=page.locator(selector+':visible').first();
          assert.equal(await link.count(),1,`${engine}/${revision}/${path}: ${selector} exists`);
          const href=await link.getAttribute('href'),u=new URL(href);
          const isUS=tz.startsWith('America/');
          assert.equal(u.hostname,'www.amazon.'+(isUS?'com':'de'));
          assert.equal(u.searchParams.get('tag'),isUS?'ecoback0d-20':'getecoback-21');
          const before=await page.evaluate(()=>window.__affiliateQA.filter(x=>x.n==='affiliate_click').length);
          await link.click();
          await page.waitForTimeout(1000);
          const clicks=(await page.evaluate(()=>window.__affiliateQA.filter(x=>x.n==='affiliate_click'))).slice(before);
          assert.equal(clicks.length,1,`${engine}/${revision}/${path}/${selector}: one click, one beacon`);
          assert.equal(clicks[0].m.link_url,href);
          assert.ok(clicks[0].m.source,`${path}: surface attribution`);
          results.push({engine,revision,path,selector,host:u.hostname,destination:u.pathname,source:clicks[0].m.source,events:clicks.length});
        }
        assert.equal(errors.length,0,`${engine}/${revision}/${path}: ${errors.join(';')}`);
        await context.close();
      }
    }
    await browser.close();
  }
  const dir=process.env.QA_DIR||'/tmp/eco-energy-qa';await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(dir+'/affiliate-audit.json',JSON.stringify(results,null,2));
  console.log(`PASS: ${results.length} affiliate purchases-path simulations; both browser engines, DE/US, pre-change/current, correct tags and one beacon per click. No Amazon requests sent.`);
})().catch(e=>{console.error(e);process.exit(1);});
