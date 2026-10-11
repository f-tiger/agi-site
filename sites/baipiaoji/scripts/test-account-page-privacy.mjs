import assert from 'node:assert/strict';
import {ACCOUNT_SCRIPT_POLICY, protectAccountPage} from '../lib/account-page-privacy.js';
import {onRequest} from '../functions/_middleware.js';

const html = () => new Response('<!doctype html><h1>Account</h1>', {headers:{'Content-Type':'text/html', 'Content-Security-Policy':"frame-ancestors 'none'"}});
for (const path of ['/account','/account/','/account.html','/en/account','/en/account/','/en/account.html']) {
  const response = await onRequest({request:new Request('https://baipiaoji.com'+path+'?save=grok'),next:async()=>html(),env:{}});
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert(response.headers.get('Content-Security-Policy').includes(ACCOUNT_SCRIPT_POLICY));
  assert(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.equal(await response.text(),'<!doctype html><h1>Account</h1>');
}
for (const path of ['/','/tools/kimi','/account.js','/api/account','/accounting','/en/account-fleet.js']) {
  const response=html();assert.equal(protectAccountPage(response,new Request('https://baipiaoji.com'+path)),response);
}
const json=Response.json({ok:true});assert.equal(protectAccountPage(json,new Request('https://baipiaoji.com/account')),json);
console.log('PASS private account aliases, middleware wiring, body/previous policy preservation and public/API exclusions');

if (process.argv.includes('--browser')) {
  const {chromium}=await import('../../../tools/revenue-studio/node_modules/playwright/index.mjs');
  const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
  try {
    for (const path of ['/account','/en/account','/tools/kimi']) {
      const page=await browser.newPage();let rum=0;
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.pathname==='/cdn-cgi/rum'){rum++;return route.fulfill({status:204});}
        if(url.pathname.endsWith('.js')||url.pathname==='/gsi/client')return route.fulfill({contentType:'text/javascript',body:url.hostname==='static.cloudflareinsights.com'?"navigator.sendBeacon('/cdn-cgi/rum','fixture')":url.hostname==='accounts.google.com'?'window.gisLoaded=true':'window.localLoaded=true'});
        const fixture='<script>window.inlineLoaded=true</script><script src="/account.js"></script><script src="https://accounts.google.com/gsi/client"></script><script src="https://static.cloudflareinsights.com/beacon.min.js"></script><form><input id="email"></form>';
        const response=protectAccountPage(new Response(fixture,{headers:{'Content-Type':'text/html'}}),new Request(url));
        return route.fulfill({status:200,headers:Object.fromEntries(response.headers),body:await response.text()});
      });
      await page.goto('https://baipiaoji.com'+path);await page.waitForTimeout(100);
      assert.deepEqual(await page.evaluate(()=>[window.inlineLoaded,window.localLoaded,window.gisLoaded]),[true,true,true]);
      await page.locator('#email').fill('fixture@example.test');assert.equal(await page.locator('#email').inputValue(),'fixture@example.test');
      await page.goto('about:blank');assert.equal(rum,path==='/tools/kimi'?1:0,'Private pages block the beacon; public pages retain it');await page.close();
    }
    console.log('PASS browser: local/inline/GIS scripts and inputs work; platform beacon cannot send on either account page (fixtures only, no Google consent)');
  } finally {await browser.close();}
}
