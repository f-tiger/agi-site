import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const dist=fileURLToPath(new URL('../dist/',import.meta.url)),origin='https://baipiaoji.com',route=origin+'/en/ai-video/';
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox']});
const secret='FP_PRIVATE_QUERY_2026_NO_MATCH';
const catalogue=JSON.parse(fs.readFileSync(new URL('../data/ai-video.json',import.meta.url),'utf8'));
const {filterWorks}=await import('../assets/ai-video-core.mjs');
const total=catalogue.works.length,lastWork=filterWorks(catalogue.works).at(-1);
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
async function setup(options={}){
 const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:'reduce'}),requests=[],errors=[];
 await context.addInitScript(({deny,storageFails,gpc,dnt})=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>false});
  if(gpc)Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
  if(dnt)Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});
  if(deny)localStorage.setItem('fleet_ga4_choice_v1','denied');
  if(storageFails){const setter=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='bpj_framepick_saved_v1')throw new DOMException('Blocked','SecurityError');return setter.call(this,key,value);};}
  window.__fpEvents=[];window.addEventListener('fleet:business',event=>window.__fpEvents.push(event.detail));
 },options);
 await context.route('**/*',async request=>{
  const req=request.request(),url=new URL(req.url());requests.push({url:req.url(),body:req.postData()});
  if(url.hostname==='www.googletagmanager.com')return request.fulfill({contentType:'application/javascript',body:''});
  if(url.hostname==='www.youtube-nocookie.com')return request.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><body>Offline official-player fixture</body></html>'});
  if(url.origin!==origin)return request.abort();
  if(url.pathname.startsWith('/api/'))return request.fulfill({status:204});
  const relative=url.pathname.endsWith('/')?url.pathname+'index.html':path.extname(url.pathname)?url.pathname:url.pathname+'.html',file=path.join(dist,relative);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return request.fulfill({status:404,body:'Missing local fixture'});
  return request.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(route+(options.qa?'?qa=1':''));await page.locator('#fp-results .fp-card').first().waitFor();await page.waitForFunction(()=>document.getElementById('fp-count').textContent.includes(' of '));
 return {context,page,requests,errors};
}
const eventCount=(page,name)=>page.evaluate(name=>window.__fpEvents.filter(event=>event.name==='ai_video_'+name).length,name);
async function select(page,id,value){
 const locator=page.locator(id),index=await locator.evaluate((element,value)=>[...element.options].findIndex(option=>option.value===value),value);assert.ok(index>=0);
 await locator.focus();await locator.press('Home');for(let i=0;i<index;i++)await locator.press('ArrowDown');await locator.press('Enter');assert.equal(await locator.inputValue(),value);
}
try{
 const {context,page,requests,errors}=await setup();
 await page.waitForFunction(()=>window.__fpEvents.some(event=>event.name==='ai_video_view'));
 await page.waitForFunction(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]')?.contentWindow?.dataLayer||[]).some(event=>event[1]==='ai_video_view'));
 assert.equal(await eventCount(page,'view'),1);
 assert.equal(await page.locator('#fp-results .fp-card').count(),total);
 assert.equal(await page.locator('#fp-results .fp-card:visible').count(),Math.min(24,total),'Progressive display keeps all entries in the DOM');
 if(total>24){await page.locator('#fp-load-more').click();assert.equal(await page.locator('#fp-results .fp-card:visible').count(),Math.min(48,total));await page.locator('#fp-reset').click();}
 await page.goto(route+'#work-'+lastWork.id);await page.locator('#work-'+lastWork.id).waitFor({state:'visible'});assert.ok(await page.locator('#work-'+lastWork.id).isVisible(),'Deep links reveal entries outside the first page');
 await page.locator('#fp-query').fill(lastWork.title);assert.ok(await page.locator('#work-'+lastWork.id).isVisible(),'Search covers entries outside the first page');
 const heroLink=page.locator('.fp-feature-main .fp-feature-image'),heroHash=await heroLink.getAttribute('href');await page.goto(route+heroHash);await page.locator('#fp-query').fill(secret);assert.ok(await page.locator('#fp-empty').isVisible());await heroLink.click();assert.ok(await page.locator(heroHash).isVisible(),'Clicking the same work hash restores an entry hidden by filters');assert.ok(await page.locator('#fp-empty').isHidden());
 await page.goto(route);await page.waitForFunction(()=>window.__fpEvents.some(event=>event.name==='ai_video_view'));
 assert.equal(await page.locator('iframe[src*="youtube"]').count(),0);
 assert.ok(!requests.some(request=>request.url.includes('youtube-nocookie')),'No player request before explicit opening');
 assert.equal(await page.locator('.fp-featured img').count(),0,'Broken remote thumbnails leave the original title fallback');
 assert.ok(await page.locator('.fp-cover-title').first().isVisible());
 await select(page,'#fp-source','reply-2026');
 assert.equal(await page.locator('#fp-results .fp-card').count(),7);
 await select(page,'#fp-sort','source-rank');
 assert.match(await page.locator('#fp-results .fp-card').first().innerText(),/A Face Only A Mother Could Love/);
 assert.equal(await page.locator('#fp-results .fp-card [data-fp-award]').first().innerText(),'1st place');
 await page.locator('#fp-reset').click();
 await page.locator('#fp-query').fill('face');
 await page.locator('#fp-suggestions').waitFor({state:'visible'});
 await page.locator('#fp-query').press('ArrowDown');await page.locator('#fp-query').press('Enter');
 assert.equal(await page.locator('#fp-results .fp-card').count(),1);
 assert.equal(await page.locator('#fp-query').inputValue(),'A Face Only A Mother Could Love');
 await page.waitForFunction(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]')?.contentWindow?.dataLayer||[]).some(event=>event[1]==='ai_video_search'));
 const measured=await page.evaluate(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).map(event=>Array.from(event)));
 assert.equal(measured.filter(event=>event[1]==='ai_video_view').length,1,'Exposure arrives once through the real isolated collector');
 assert.equal(measured.filter(event=>event[1]==='ai_video_search').length,1,'Search arrives through the fixed business allowlist');
 await page.locator('[data-fp-save]').click();assert.equal(await page.locator('#fp-save-count').innerText(),'1');
 await page.reload();assert.equal(await page.locator('#fp-save-count').innerText(),'1');
 await page.locator('#fp-saved').click();assert.equal(await page.locator('#fp-results .fp-card').count(),1);
 await page.locator('.fp-details summary').click();await page.locator('[data-fp-related]').click();assert.ok(await page.locator('.fp-related-note').count()>0);
 assert.match(await page.locator('#fp-order-note').innerText(),/not AI video analysis/);
 await page.locator('#fp-reset').click();
 await page.locator('[data-fp-preview]').first().click();
 const frame=page.locator('#fp-player iframe');assert.equal(await frame.count(),1);
 assert.match(await frame.getAttribute('src'),/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?autoplay=0&rel=0$/);
 assert.equal(await frame.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');
 await page.keyboard.press('Escape');await page.locator('#fp-player iframe').waitFor({state:'detached'});assert.equal(await page.locator('#fp-player iframe').count(),0);
 assert.equal(await eventCount(page,'preview'),1);
 await page.locator('#fp-query').fill(secret);await page.locator('#fp-search button[type=submit]').click();
 assert.ok(await page.locator('#fp-empty').isVisible());
 await page.waitForTimeout(700);
 assert.ok(requests.every(request=>!JSON.stringify(request).includes(secret)),'Search text never leaves the browser');
 assert.ok((await page.evaluate(()=>window.__fpEvents)).every(event=>Object.keys(event).length===1&&/^ai_video_(view|search|filter|preview|outbound|save|unsave|related)$/.test(event.name)),'Only fixed action names are emitted');
 const before=await eventCount(page,'save');await page.locator('#fp-empty-reset').click();
 await page.locator('[data-fp-save]').first().evaluate(button=>button.click());assert.equal(await eventCount(page,'save'),before,'Synthetic clicks cannot create analytics events');
 if(process.env.FP_SCREENSHOT_DIR){fs.mkdirSync(process.env.FP_SCREENSHOT_DIR,{recursive:true});await page.goto(route);await page.screenshot({path:path.join(process.env.FP_SCREENSHOT_DIR,'framepick-desktop.png'),fullPage:false});}
 await page.goto(route+'#work-%E0%A4%A');assert.deepEqual(errors,[],'Malformed hashes and UI interactions produce no page errors');
 await context.close();

 const mobile=await setup({mobile:true});
 const queryBox=await mobile.page.locator('#fp-query').boundingBox();assert.ok(queryBox.y+queryBox.height<650,'Search is visible in the first mobile screen');
 assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
 await mobile.page.locator('#fp-filter-toggle').click();await select(mobile.page,'#fp-format','series');assert.equal(await mobile.page.locator('#fp-results .fp-card').count(),catalogue.works.filter(work=>work.format==='series').length);
 await mobile.page.locator('#fp-reset').click();await mobile.page.locator('[data-fp-quick="short:true"]').click();
 assert.ok(await mobile.page.locator('#fp-results .fp-card').count()>0);
 assert.ok(await mobile.page.locator('#fp-short').isChecked());
 if(process.env.FP_SCREENSHOT_DIR){fs.mkdirSync(process.env.FP_SCREENSHOT_DIR,{recursive:true});await mobile.page.goto(route);await mobile.page.locator('#fp-results .fp-card').first().waitFor();await mobile.page.evaluate(()=>scrollTo(0,0));await mobile.page.screenshot({path:path.join(process.env.FP_SCREENSHOT_DIR,'framepick-mobile.png'),fullPage:false});}
 assert.deepEqual(mobile.errors,[]);await mobile.context.close();

 for(const options of [{deny:true},{qa:true},{gpc:true},{dnt:true}]){
  const fixture=await setup(options);await fixture.page.locator('#fp-query').fill('face');await fixture.page.locator('#fp-search button[type=submit]').click();await fixture.page.waitForTimeout(200);
  assert.deepEqual(await fixture.page.evaluate(()=>window.__fpEvents),[],`Privacy exclusion ${JSON.stringify(options)} prevents actions`);
  assert.equal(await fixture.page.locator('iframe[title="Optional analytics"]').count(),0);
  await fixture.context.close();
 }
 const narrow=await setup({mobile:true});await narrow.page.setViewportSize({width:360,height:800});
 const longTitle=catalogue.works.reduce((longest,work)=>work.title.length>longest.title.length?work:longest,catalogue.works[0]);await narrow.page.locator('#fp-query').fill(longTitle.title);
 const longCard=narrow.page.locator('#work-'+longTitle.id);assert.equal(await longCard.locator('h3').innerText(),longTitle.title);
 const coverBounds=await longCard.locator('.fp-cover').boundingBox(),titleBounds=await longCard.locator('.fp-cover-title').boundingBox();assert.ok(titleBounds.y>=coverBounds.y+12&&titleBounds.y+titleBounds.height<=coverBounds.y+coverBounds.height-30,'Long fallback titles leave space for the player controls');
 assert.ok(await narrow.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await narrow.context.close();
 const noScript=await browser.newContext({javaScriptEnabled:false});
 await noScript.route('**/*',async intercepted=>{const url=new URL(intercepted.request().url());if(url.origin!==origin)return intercepted.abort();const relative=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,file=path.join(dist,relative);return fs.existsSync(file)?intercepted.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'}):intercepted.fulfill({status:404});});
 const noScriptPage=await noScript.newPage();await noScriptPage.goto(route);assert.equal(await noScriptPage.locator('#fp-results .fp-card:visible').count(),total,'All entries and viewing links remain available without JavaScript');assert.equal(await noScriptPage.locator('#fp-results .fp-watch').count(),total);await noScript.close();
 const blocked=await setup({storageFails:true});await blocked.page.locator('[data-fp-save]').first().click();assert.match(await blocked.page.locator('#fp-status').innerText(),/Could not save/);assert.equal(await blocked.page.locator('#fp-save-count').innerText(),'0');assert.equal(await eventCount(blocked.page,'save'),0);await blocked.context.close();
 console.log('Framepick browser checks passed: desktop/mobile, source recognition, search, saved list, no pre-click player, privacy exclusions, fixed analytics and storage failure. All network requests intercepted.');
}finally{await browser.close();}
