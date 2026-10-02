import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for(const lang of ['zh','en'])for(const width of [390,1440]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!=='https://baipiaoji.com')return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   const f=path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':path.extname(u.pathname)?u.pathname:u.pathname+'.html');
   if(!fs.existsSync(f))return route.fulfill({status:404});
   return route.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.css')?'text/css':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'text/html'});
  });
  const page=await context.newPage(),pre=lang==='zh'?'':'/en';
  await page.goto('https://baipiaoji.com'+pre+'/?__ci=1');
  const search=page.locator('.bpj-home-hero .gs input');
  await search.fill('Writerly');
  const link=page.locator('.bpj-home-hero .gs-drop a').filter({hasText:'Writerly'});
  await link.waitFor();assert.equal(await link.count(),1);
  await link.click();
  await page.waitForURL('**/tools/writerly-ai');
  assert.equal(await page.locator('h1').textContent(),'Writerly AI');
  assert.match(await page.locator('.answer').textContent(),lang==='zh'?/尚未核实/:/not been verified/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.ok(await page.locator('#sources').count());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.goto('https://baipiaoji.com'+pre+'/c/office?__ci=1');
  assert.equal(await page.locator('.ticket').count(),JSON.parse(fs.readFileSync(new URL('../data/tools.json',import.meta.url))).filter(t=>t.category==='office').length);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.CATALOG_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.CATALOG_SCREENSHOT_DIR,`catalog-${lang}-${width}.png`),fullPage:false});
  await context.close();
 }
 console.log('PASS: mobile/desktop bilingual search finds new tool once; details, cost labels, source section and largest category render without overflow. All network intercepted.');
} finally {await browser.close();}
