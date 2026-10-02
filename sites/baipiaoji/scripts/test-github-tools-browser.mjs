// All requests are served from local dist or intercepted; no real user analytics.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {GITHUB_TOOLS} from './github-tools-pages.mjs';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright'),root=fileURLToPath(new URL('../dist/',import.meta.url)),out=process.env.BPJ_GITHUB_SCREENSHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'bpj-github-'));
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
const context=await browser.newContext({viewport:{width:1440,height:1050}}),errors=[],events=[];
await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!=='https://baipiaoji.com')return route.abort();if(u.pathname.startsWith('/api/')){if(u.pathname==='/api/hit')events.push(r.postDataJSON());return route.fulfill({status:204});}let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.join(root,p);if(!fs.existsSync(f))return route.fulfill({status:404});return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'text/plain'});});
for(const [prefix,lang]of [['','zh'],['/en','en']]){
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://baipiaoji.com'+prefix+'/github-tools/?__probe=1');
 await page.locator('#github-query').fill(lang==='zh'?'手机电脑互传':'transfer files');await page.waitForFunction(()=>document.querySelectorAll('[data-tool-id]:not([hidden])').length===1);assert.ok(await page.locator('#localsend').isVisible());
 await page.locator('#github-reset').click();await page.locator('#github-mode').selectOption('web');assert.equal(await page.locator('[data-tool-id]:visible').count(),GITHUB_TOOLS.tools.filter(t=>t.mode==='web').length);
 await page.locator('#github-platform').selectOption('windows');assert.ok(await page.locator('#github-empty').isVisible());await page.locator('#github-reset').click();
 await page.locator('#github-query').fill('<img src=x onerror=alert(1)>');assert.ok(await page.locator('#github-empty').isVisible());assert.equal(new URL(await page.locator('#github-expand').getAttribute('href')).origin,'https://github.com');assert.equal(await page.locator('.gh-grid img').count(),0);
 await page.locator('#github-reset').click();await page.locator('#github-sort').selectOption('stars');assert.equal(await page.locator('.gh-grid article').first().getAttribute('data-tool-id'),GITHUB_TOOLS.tools.slice().sort((a,b)=>b.github.stars-a.github.stars)[0].id);
 await page.locator('#github-reset').click();await page.screenshot({path:out+'/'+lang+'-desktop.png'});
 await page.goto('https://baipiaoji.com'+prefix+'/github-tools/?__probe=1#immich');assert.ok(await page.locator('#immich details').getAttribute('open')!==null);assert.equal(await page.locator('#immich .gh-primary').getAttribute('href'),'https://docs.immich.app/overview/quick-start');
 await page.goto('https://baipiaoji.com'+prefix+'/github-tools/?q=notes&__probe=1');assert.ok(await page.locator('#joplin').isVisible());
 await page.setViewportSize({width:390,height:844});await page.locator('#github-reset').click();await page.screenshot({path:out+'/'+lang+'-mobile.png',fullPage:false});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
 await page.close();
}
assert.deepEqual(errors,[]);assert.equal(events.filter(e=>e?.e==='github_tools').length,0,'QA must not emit catalogue actions');
const nojs=await browser.newContext({javaScriptEnabled:false});await nojs.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('/github-tools/'))return route.fulfill({body:fs.readFileSync(path.join(root,'github-tools/index.html')),contentType:'text/html'});return route.abort();});const page=await nojs.newPage();await page.goto('https://baipiaoji.com/github-tools/');assert.equal(await page.locator('.gh-card').count(),GITHUB_TOOLS.tools.length);assert.equal(await page.locator('.gh-primary').count(),GITHUB_TOOLS.tools.length);await nojs.close();
console.log('PASS desktop/mobile, bilingual task search, empty state, XSS input, star sorting, deep links, no-JS fallback and QA analytics isolation. Screenshots: '+out);
}finally{await browser.close();}
