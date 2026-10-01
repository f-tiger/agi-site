import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {decodeConfig} from './core.mjs';

const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('../revenue-studio/node_modules/playwright'));}
const live=process.argv.includes('--live'),origin='https://baipiaoji.com',out=new URL('./test-output/',import.meta.url);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.QUOTE_STUDIO_CHROMIUM||undefined,args:['--no-sandbox']});
const events=[],requests=[],errors=[];
const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:390,height:844}});
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
if(!live){
  // The normal app suppresses automated traffic. Enable only inside this mocked test.
  await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
  await context.route('**/*',async route=>{
    const r=route.request(),url=new URL(r.url());requests.push({url:r.url(),method:r.method()});
    if(url.pathname==='/api/hit'){events.push(r.postDataJSON());return route.fulfill({status:204});}
    assert.equal(url.origin,origin,'no third-party requests');
    if(!['/studio/quote-builder','/en/studio/quote-builder'].includes(url.pathname))return route.fulfill({status:404});
    const body=readFileSync(new URL('../../sites/baipiaoji/dist'+url.pathname+'.html',import.meta.url),'utf8');
    return route.fulfill({status:200,contentType:'text/html',body});
  });
}
try{
  for(const lang of ['zh','en']){
    const page=await context.newPage(),prefix=lang==='en'?'/en':'',url=origin+prefix+'/studio/quote-builder';
    await page.goto(url+'?__ci=1');await page.locator('#editor').waitFor();
    const before=events.length;
    await page.locator('[name="brand"]').fill('QA Studio — synthetic');
    await page.locator('[name="price-0"]').fill('199.99');
    await page.locator('[name="confirmed"]').check();
    await page.locator('.mobile-nav [data-action="preview"]').click();
    await page.locator('[data-qty="0"]').fill('2');
    await page.locator('[data-action="back"]').click();
    assert.equal(await page.locator('[name="brand"]').inputValue(),'QA Studio — synthetic');
    assert.equal(await page.locator('[name="quantity-0"]').inputValue(),'3');
    await page.locator('.mobile-nav [data-action="share-jump"]').click();
    assert(await page.locator('[name="confirmed"]').evaluate(el=>el===document.activeElement));
    await page.locator('[data-action="share"]').click();
    const link=await page.evaluate(()=>navigator.clipboard.readText());
    const shared=new URL(link);assert.equal(shared.search,'');assert.equal(shared.origin+shared.pathname,url);
    assert.equal(decodeConfig(shared.hash.slice(7)).brand,'QA Studio — synthetic');
    // CI marker is deliberately absent from customer links; add it only in QA navigation.
    shared.search='?__ci=1';const client=await context.newPage();await client.goto(shared.href);
    assert.equal(await client.locator('#editor').count(),0);
    assert(await client.locator('[data-host-only]').isHidden());
    assert.equal(await client.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow');
    await client.locator('[data-qty="0"]').fill('2');
    await client.locator('[data-action="copy-summary"]').click();
    const summary=await client.evaluate(()=>navigator.clipboard.readText());
    assert(summary.includes('QA Studio — synthetic')&&summary.includes('429.98'));
    assert(await client.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await client.screenshot({path:new URL(`hosted-client-${lang}.png`,out).pathname,fullPage:true});
    const exported=page.waitForEvent('download');await page.locator('[data-action="export"]').click();
    const artifact=new URL(`hosted-export-${lang}.html`,out);await (await exported).saveAs(artifact.pathname);
    const html=readFileSync(artifact,'utf8');
    const state=JSON.parse(html.match(/id="initial-state">(.*?)<\/script>/s)[1]);
    assert.equal(state.mode,'customer');assert(!state.measure);
    assert(!html.includes('rel="canonical"')&&!html.includes('hreflang='),'portable customer file has no host SEO');
    assert.equal(events.length,before,'CI traffic must not be counted');
    client.once('dialog',d=>d.accept());await client.locator('[data-action="remix"]').click();
    assert(!(await client.locator('[name="confirmed"]').isChecked()));
    assert.equal(new URL(client.url()).hash,'');
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:new URL(`hosted-builder-${lang}.png`,out).pathname,fullPage:true});
    await page.close();await client.close();
  }
  if(!live){
    const page=await context.newPage();await page.goto(origin+'/studio/quote-builder');
    await page.locator('[name="brand"]').fill('DO NOT SEND THIS');await page.locator('[name="confirmed"]').check();
    await page.locator('[data-action="share"]').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('已复制'));
    assert(events.some(x=>x.p==='/quote-builder/builder_open'));
    assert(events.some(x=>x.p==='/quote-builder/link_copied'));
    for(const event of events){assert.deepEqual(Object.keys(event).sort(),['e','l','p']);assert.equal(event.e,'quote');assert(/^\/quote-builder\/[a-z_]+$/.test(event.p));}
    assert(!JSON.stringify(events).includes('DO NOT SEND THIS'));
    assert(requests.every(r=>!r.url.includes('#quote=')),'fragment stays on device');
    await page.close();
    const before=events.length;
    await context.addInitScript(()=>Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'}));
    const dnt=await context.newPage();await dnt.goto(origin+'/studio/quote-builder');await dnt.locator('#editor').waitFor();
    assert.equal(events.length,before,'DNT opts out');
  }
  assert.deepEqual(errors,[]);
  console.log(`Quote builder ${live?'live':'mock-hosted'} browser: zh/en clipboard link → client scope → copy summary, mobile navigation, draft preservation, remix, export isolation and anonymous-event privacy passed.`);
}finally{await browser.close();}
