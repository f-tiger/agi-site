import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {ACCESS} from './coding-access-pages.mjs';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright'),root=fileURLToPath(new URL('../dist/',import.meta.url)),out=process.env.BPJ_ACCESS_SCREENSHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'bpj-access-'));
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
const ids=page=>page.locator('.access-row:visible').evaluateAll(rows=>rows.map(row=>row.id));
try{
 const context=await browser.newContext({viewport:{width:1400,height:1000},permissions:['clipboard-read','clipboard-write']}),events=[],errors=[];
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://baipiaoji.com')return route.abort();
  if(u.pathname.startsWith('/api/')){events.push(route.request().postData());return route.fulfill({status:204});}
  let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';
  const f=path.join(root,p);if(!fs.existsSync(f))return route.fulfill({status:404});
  return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'text/plain'});
 });
 for(const prefix of ['','/en']){
  const lang=prefix?'en':'zh',page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://baipiaoji.com'+prefix+'/coding-access/?__probe=1&utm_source=private-campaign&unknown=private-value');
  assert.equal(await page.locator('.access-row:visible').count(),7);
  await page.locator('#access-query').fill('Codex');assert.deepEqual(await ids(page),['codex','minimax','packycode']);
  await page.locator('[data-check="0"]').check();await page.locator('#access-selection-copy').click();
  let copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert.ok(copied.includes('https://baipiaoji.com'+prefix+'/coding-access/?q=Codex'));
  for(const privateValue of ['__probe','utm_source','private-campaign','unknown=','private-value'])assert.ok(!copied.includes(privateValue));
  for(const id of ['codex','minimax','packycode']){
   const item=ACCESS.items.find(x=>x.id===id);assert.ok(copied.includes(item.name));
   for(const key of ['billing','ownership','caution'])assert.ok(copied.includes(item[key][lang]));
   assert.ok(copied.includes(item.source));assert.ok(copied.includes(item.checkedAt||item.lastAttempt));
  }
  for(const name of ['DeepSeek API','GLM Coding Plan','OpenRouter','Claude Code / Claude'])assert.ok(!copied.includes(name));
  assert.ok(copied.includes(prefix?'not purchase recommendations':'不构成购买推荐'));
  assert.ok(copied.includes(prefix?'Not verified; attempted: 2026-10-04':'未完成核验；尝试：2026-10-04'));
  assert.ok(copied.includes(prefix?'No purchase or hands-on test':'未购买 / 未上手实测'));
  assert.equal((copied.match(/\[x\]/g)||[]).length,1);assert.equal((copied.match(/\[ \]/g)||[]).length,4);
  await page.locator('#access-status').selectOption('reviewed');assert.deepEqual(await ids(page),['codex','minimax']);
  await page.locator('#access-selection-copy').click();copied=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(!copied.includes('PackyCode'));
  await page.locator('#access-reset').click();await page.locator('#access-tool').selectOption('codex');assert.deepEqual(await ids(page),['codex','minimax','packycode']);
  await page.locator('#access-status').selectOption('reviewed');assert.equal(await page.locator('.access-row:visible').count(),2);
  await page.reload();assert.equal(await page.locator('#access-tool').inputValue(),'codex');assert.equal(await page.locator('.access-row:visible').count(),2);assert.ok(page.url().includes('__probe=1'));
  await page.locator('#access-reset').click();
  for(const query of ['Claude Code','claude-code','CLAUDE–CODE']){await page.locator('#access-query').fill(query);assert.deepEqual(await ids(page),['claude','deepseek','glm','minimax','openrouter','packycode']);}
  await page.locator('#access-query').fill('<img src=x onerror=alert(1)>');assert.ok(await page.locator('#access-empty').isVisible());assert.equal(await page.locator('.access-row img').count(),0);assert.ok(await page.locator('#access-selection-copy').isDisabled());
  assert.ok((await page.locator('#access-selection-status').textContent()).includes(prefix?'No candidates':'没有可复制'));
  await page.evaluate(()=>{location.hash='deepseek';});await page.waitForFunction(()=>!document.getElementById('deepseek').hidden);assert.equal(await page.locator('#access-tool').inputValue(),'');
  for(const c of await page.locator('[data-check]').all())await c.check();await page.locator('#access-copy').click();assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('[x]'));
  await page.screenshot({path:path.join(out,prefix?'en-desktop.png':'zh-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('#access-query').fill('PackyCode');await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Clipboard denied');}}}));
  await page.locator('#access-selection-copy').click();assert.ok(await page.locator('#access-selection-fallback').isVisible());
  const fallback=await page.locator('#access-selection-text').inputValue();assert.ok(fallback.includes('PackyCode'));assert.ok(fallback.includes('https://www.packycode.com'));assert.ok(!fallback.includes('MiniMax Token Plan'));
  assert.ok(await page.locator('#access-selection-text').evaluate(el=>el.readOnly&&el.selectionEnd===el.value.length&&el.selectionStart===0));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,prefix?'en-mobile.png':'zh-mobile.png'),fullPage:true});await page.close();
 }
 assert.deepEqual(errors,[]);assert.equal(events.filter(x=>x?.includes('coding_access')).length,0);
 const measured=await context.newPage();
 await measured.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});window.accessActions=[];window.copyAttempts=0;window.clipboardFails=false;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copyAttempts++;if(window.clipboardFails)throw Error('Clipboard denied');window.copiedSelection=text;}}});addEventListener('fleet:business',e=>window.accessActions.push(e.detail));});
 await measured.goto('https://baipiaoji.com/coding-access/');await measured.locator('#access-type').selectOption('relay');await measured.waitForFunction(()=>window.accessActions.length>0);
 assert.ok((await measured.evaluate(()=>window.accessActions)).some(x=>x.name==='legacy:select_category'));assert.ok(events.some(x=>x?.includes('/coding-access/filter/catalog')));
 const selectionEvents=()=>events.filter(x=>x?.includes('/coding-access/copy/selection')).length;
 await measured.locator('#access-selection-copy').click();await measured.waitForFunction(()=>window.accessActions.filter(x=>x.name==='legacy:complete_step').length===1);assert.equal(selectionEvents(),1);
 await measured.locator('#access-copy').click();assert.ok(events.some(x=>x?.includes('/coding-access/copy/catalog')));
 await measured.evaluate(()=>{window.clipboardFails=true;});await measured.locator('#access-selection-copy').click();assert.ok(await measured.locator('#access-selection-fallback').isVisible());assert.equal(selectionEvents(),1);
 await measured.locator('#access-query').fill('private-search-no-match');assert.ok(await measured.locator('#access-selection-copy').isDisabled());assert.ok(await measured.locator('#access-selection-fallback').isHidden());
 const attempts=await measured.evaluate(()=>window.copyAttempts);await measured.locator('#access-selection-copy').dispatchEvent('click');assert.equal(await measured.evaluate(()=>window.copyAttempts),attempts);assert.equal(selectionEvents(),1);
 assert.ok(events.every(x=>!x?.includes('private-search-no-match')));await measured.close();
 const nojs=await browser.newContext({javaScriptEnabled:false});await nojs.route('**/*',async r=>{const pathname=new URL(r.request().url()).pathname;if(['/coding-access/','/en/coding-access/'].includes(pathname))return r.fulfill({body:fs.readFileSync(path.join(root,pathname,'index.html')),contentType:'text/html'});return r.abort();});
 for(const prefix of ['','/en']){const page=await nojs.newPage();await page.goto('https://baipiaoji.com'+prefix+'/coding-access/');assert.equal(await page.locator('.access-row').count(),7);assert.ok(await page.locator('#access-selection-copy').isDisabled());await page.close();}
 await nojs.close();console.log('PASS browser: search/tool parity, aliases, evidence-bound selection export, copy/failure/empty event guards, bilingual/mobile, URL restore, XSS, deep links, no-JS, QA. Screenshots: '+out);
}finally{await browser.close();}
