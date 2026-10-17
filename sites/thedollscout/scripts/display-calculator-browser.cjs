const {chromium}=require('../../../tools/revenue-studio/node_modules/playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true});
try {for(const prefix of ['', '/de']) {
 // Simulate a normal UA only inside this fully network-intercepted fixture.
 // Production intentionally excludes HeadlessChrome as well as webdriver.
 const context=await browser.newContext({userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'});const page=await context.newPage();const sent=[];
 // Every request is fulfilled locally or aborted. Nothing reaches production.
 await context.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.pathname==='/api/ev'){sent.push(JSON.parse(route.request().postData()));return route.fulfill({status:204});}
  const pathname=url.pathname;
  if(pathname===prefix+'/display-calculator')return route.fulfill({contentType:'text/html',body:fs.readFileSync(root+pathname+'.html','utf8')});
  if(['/js/collector-core.js','/js/collector-tools.js'].includes(pathname))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+pathname,'utf8')});
  if(pathname.startsWith('/css/'))return route.fulfill({contentType:'text/css',body:fs.readFileSync(root+pathname,'utf8')});
  return route.abort();
 });
 await page.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 await page.goto('https://thedollscout.com'+prefix+'/display-calculator');
 const submit=async()=>{await page.locator('[data-collector] button.btn').click();await page.waitForTimeout(100);};
 await submit();assert.equal(sent.length,0);assert.equal(await page.locator('[data-count]').innerText(),'9');
 await page.locator('[name=unit]').selectOption('in');await submit();assert.equal(sent.length,0);
 await page.locator('[name=width]').fill('20');await submit();assert.equal(sent.length,1);
 assert.deepEqual(sent[0],{p:prefix+'/display-calculator',e:'display_calc',r:''});
 await page.locator('[name=unit]').selectOption('cm');await page.locator('[name=width]').fill('40');await submit();assert.equal(sent.length,1);
 await context.close();console.log(prefix||'EN','browser sample/unit/own/reset passed; no external requests');
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
