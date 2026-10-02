import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
for(const lang of ['zh','en'])for(const mode of ['normal','qa','webdriver','dnt','gpc']){
 const context=await browser.newContext({viewport:{width:mode==='normal'?390:1440,height:844}}),events=[];
 await context.addInitScript(mode=>{Object.defineProperty(navigator,'webdriver',{get:()=>mode==='webdriver'});if(mode==='dnt')Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});if(mode==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});},mode);
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://baipiaoji.com')return route.abort();if(u.pathname==='/api/hit'){events.push(route.request().postDataJSON());return route.fulfill({status:204});}if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});let f=u.pathname.endsWith('/')?u.pathname+'index.html':path.extname(u.pathname)?u.pathname:u.pathname+'.html';f=path.join(root,f);if(!fs.existsSync(f))return route.fulfill({status:404});return route.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.css')?'text/css':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'text/html'});});
 const page=await context.newPage(),prefix=lang==='zh'?'':'/en';await page.goto('https://baipiaoji.com'+prefix+'/'+(mode==='qa'?'?__ci=1':''));
 await page.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault()},true));
 for(const [selector,suffix] of [['.bpj-primary-cta','/hero'+prefix+'/directory'],['.bpj-home-toolbox','/hero'+prefix+'/studio/'],['.bpj-quick a[href$="/github-tools/"]','/hero'+prefix+'/github-tools/'],['.bpj-quick a[href$="/agents/"]','/hero'+prefix+'/agents/'],['.bpj-feature-tile','/featured-tools'+prefix+'/studio/pdf-tools']]){
  const before=events.filter(e=>e.e==='home'&&e.p.startsWith('/home/')).length;await page.locator(selector).first().click();await page.waitForTimeout(60);
  const home=events.filter(e=>e.e==='home'&&e.p.startsWith('/home/'));assert.equal(home.length-before,mode==='normal'?1:0,lang+' '+mode+' '+selector);
  if(mode==='normal'){assert.equal(home.at(-1).p,'/home'+suffix);assert.equal(home.at(-1).l,lang);}
 }
 if(mode==='normal'){await page.setViewportSize({width:1440,height:900});await page.locator('.bpj-primary a[data-studio-nav]').click();await page.waitForTimeout(60);assert.equal(events.filter(e=>e.e==='home'&&e.p.startsWith('/home/')).at(-1).p,'/home/site-header'+prefix+'/studio/');await page.locator('.bpj-footer a[data-studio-footer]').click();await page.waitForTimeout(60);assert.equal(events.filter(e=>e.e==='home'&&e.p.startsWith('/home/')).at(-1).p,'/home/site-footer'+prefix+'/studio/');}
 await context.close();
}
console.log('PASS zh/en homepage: one event per click, mobile hero/cards, desktop header/footer labels; QA, automated browser, DNT/GPC suppressed. All network intercepted; no production events.');
}finally{await browser.close();}
