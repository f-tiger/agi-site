import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {decodeConfig} from './core.mjs';
import {parseQuoteEvent} from './growth.mjs';

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
    const path=url.pathname.endsWith('/')?url.pathname+'index.html':/\.[a-z0-9]+$/i.test(url.pathname)?url.pathname:url.pathname+'.html';
    const file=new URL('../../sites/baipiaoji/dist'+path,import.meta.url);
    if(!existsSync(file))return route.fulfill({status:404});
    const contentType=path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.png')?'image/png':'text/html';
    return route.fulfill({status:200,contentType,body:readFileSync(file)});
  });
}
try{
  for(const lang of ['zh','en']){
    const page=await context.newPage(),prefix=lang==='en'?'/en':'',url=origin+prefix+'/studio/quote-builder';
    await page.goto(url+'?__ci=1');await page.locator('#editor').waitFor();
    const firstTry=await page.locator('.intro-actions [data-action=preview]').boundingBox();assert(firstTry&&firstTry.y+firstTry.height<844,'first useful action visible on mobile');
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
    assert(!html.includes('property="og:image"'));
    assert(!html.includes('rel="canonical"')&&!html.includes('hreflang='),'portable customer file has no host SEO');
    await page.locator('[data-action="recommend"]').click();
    const cleanLink=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(cleanLink,url+'?source=share');assert(!cleanLink.includes('QA Studio')&&!cleanLink.includes('#quote='));
    await page.locator('[data-action="recommend-message"]').click();
    const intro=await page.evaluate(()=>navigator.clipboard.readText());assert(intro.includes(url+'?source=share')&&!intro.includes('QA Studio')&&!intro.includes('#quote='));
    assert.equal(await client.locator('.demo-intro,.recommend').count(),0,'real customer view stays focused on the quote');
    assert.equal(events.length,before,'CI traffic must not be counted');
    client.once('dialog',d=>d.accept());await client.locator('[data-action="remix"]').click();
    assert(!(await client.locator('[name="confirmed"]').isChecked()));
    assert.equal(new URL(client.url()).hash,'');
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:new URL(`hosted-builder-${lang}.png`,out).pathname,fullPage:true});
    await page.close();await client.close();
  }
  const demo=await context.newPage();await demo.goto(origin+'/en/studio/quote-builder?template=video&demo=1&source=video-guide&__ci=1');
  assert.equal(await demo.locator('#editor').count(),0);assert.equal(await demo.locator('#total').textContent(),'$390.00');
  await demo.locator('[data-qty="0"]').fill('5');assert.equal(await demo.locator('#total').textContent(),'$630.00');
  const start=await demo.locator('[data-action="demo-start"]').boundingBox();assert(start&&start.y+start.height<844,'demo-to-creator action is immediately visible');
  await demo.screenshot({path:new URL('public-demo-en.png',out).pathname,fullPage:true});
  await demo.locator('[data-action="demo-start"]').click();
  assert(await demo.locator('[name="brand"]').evaluate(el=>el===document.activeElement));assert.equal(await demo.locator('[name="quantity-0"]').inputValue(),'3');
  await demo.close();
  if(!live){
    for(const lang of ['zh','en']){
      const landing=await context.newPage(),prefix=lang==='en'?'/en':'';
      await landing.goto(origin+prefix+'/studio/video-quote?__ci=1');
      for(const width of [390,1360]){
        await landing.setViewportSize({width,height:844});
        assert(await landing.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'landing fits mobile and desktop');
        const cta=await landing.locator('.studio-hero a.primary').boundingBox();assert(cta&&cta.y+cta.height<844,'landing demo action visible immediately');
        await landing.screenshot({path:new URL(`video-landing-${lang}-${width}.png`,out).pathname,fullPage:true});
      }
      await landing.locator('.studio-hero a.primary').click();
      assert.equal(await landing.locator('#editor').count(),0);
      assert.equal(await landing.locator('[data-qty="0"]').inputValue(),'3');
      assert(new URL(landing.url()).searchParams.get('source')==='video-guide');
      await landing.setViewportSize({width:390,height:844});
      const start=await landing.locator('[data-action="demo-start"]').boundingBox();assert(start&&start.y+start.height<844);
      assert(await landing.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await landing.screenshot({path:new URL(`public-demo-${lang}.png`,out).pathname,fullPage:true});
      await landing.close();
    }
    // Native share is stubbed: the test must never send a message to an external app.
    const referral=await context.newPage();
    await referral.addInitScript(()=>{window.shareCalls=[];Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:async data=>{window.shareCalls.push(data);throw new DOMException('canceled','AbortError');}});});
    await referral.goto(origin+'/en/studio/quote-builder?demo=1&source=video-tool');
    await referral.locator('[data-action="recommend-share"]').click();
    assert((await referral.locator('[data-recommend-status]').textContent()).includes('canceled'));
    assert.deepEqual(await referral.evaluate(()=>window.shareCalls[0]),{title:'BPJ Quote Studio',text:'A free interactive quote tool: set your own services and rates, let clients adjust quantities, and copy an itemized scope. Try the sample first. No signup; no payments or contracts.',url:origin+'/en/studio/quote-builder?source=share'});
    assert(events.some(x=>x.p==='/quote-builder/entry_open/video-tool'));assert(!events.some(x=>x.p==='/quote-builder/builder_open/video-tool'));
    assert(!events.some(x=>x.p==='/quote-builder/tool_message_copied/video-tool'),'cancel is not a copy');
    await referral.evaluate(()=>{navigator.share=async()=>{throw new DOMException('blocked','NotAllowedError');};});
    await referral.locator('[data-action="recommend-share"]').click();
    assert((await referral.evaluate(()=>navigator.clipboard.readText())).includes('No signup'));
    await referral.evaluate(()=>{navigator.share=async()=>{};});
    await referral.locator('[data-action="recommend-share"]').click();
    assert((await referral.locator('[data-recommend-status]').textContent()).includes('Check the selected app'));
    await referral.locator('[data-action="demo-start"]').click();
    assert(events.some(x=>x.p==='/quote-builder/demo_start/video-tool'));assert(events.some(x=>x.p==='/quote-builder/builder_open/video-tool'));
    assert.equal(events.filter(x=>x.p==='/quote-builder/entry_open/video-tool').length,1,'entry does not repeat on mode changes');
    await referral.close();
    const fallback=await context.newPage();await fallback.goto(origin+'/en/studio/quote-builder?demo=1&source=community');
    await fallback.evaluate(()=>{Object.defineProperty(navigator.clipboard,'writeText',{value:async()=>{throw Error('blocked');}});});
    assert(!events.some(x=>x.p==='/quote-builder/tool_message_copied/community'));
    await fallback.locator('[data-action="recommend-message"]').click();assert(await fallback.locator('#text-dialog').isVisible());
    assert((await fallback.locator('#dialog-text').inputValue()).includes('No signup'));
    assert(!events.some(x=>x.p==='/quote-builder/tool_message_copied/community'),'manual fallback is not a successful copy');
    await fallback.locator('[data-action="close-dialog"]').click();
    fallback.once('dialog',d=>d.accept());await fallback.locator('[data-action="remix"]').click();
    await fallback.locator('.intro-actions [data-action="preview"]').click();
    assert.equal(await fallback.locator('.demo-intro').count(),0,'own preview does not inherit the public-demo prompt');
    await fallback.close();
    // A real related directory link reaches the demo with a bounded label.
    const source=await context.newPage();await source.goto(origin+'/en/tools/google-flow?__ci=1');
    assert(await source.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'related tool page fits mobile');
    await source.locator('[data-quote-entry]').click();assert(await source.locator('.demo-intro').isVisible());
    assert.equal(new URL(source.url()).searchParams.get('source'),'video-tool');await source.close();
    const page=await context.newPage();await page.goto(origin+'/studio/quote-builder');
    await page.locator('[name="brand"]').fill('DO NOT SEND THIS');await page.locator('[name="confirmed"]').check();
    await page.locator('[data-action="share"]').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('已复制'));
    assert(events.some(x=>x.p==='/quote-builder/builder_open/direct'));
    assert(events.some(x=>x.p==='/quote-builder/link_copied/direct'));
    for(const event of events){assert.deepEqual(Object.keys(event).sort(),['e','l','p']);assert.equal(event.e,'quote');assert(parseQuoteEvent(event.p));}
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
