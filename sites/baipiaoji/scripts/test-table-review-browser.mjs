import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),out=process.env.TABLE_REVIEW_QA_DIR||'/tmp/bpj-table-review-qa';
const live=process.argv.includes('--live'),origin='https://baipiaoji.com',errors=[],requests=[];
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
async function fixture({normal=false,denied=false,dnt=false,gpc=false}={}){
  const context=await browser.newContext({viewport:{width:1380,height:1000},acceptDownloads:true,serviceWorkers:'block'});
  await context.addInitScript(({normal,denied,dnt,gpc})=>{
    if(normal)Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false});
    if(dnt)Object.defineProperty(Navigator.prototype,'doNotTrack',{get:()=> '1'});
    if(gpc)Object.defineProperty(Navigator.prototype,'globalPrivacyControl',{get:()=>true});
    if(denied)localStorage.setItem('fleet_ga4_choice_v1','denied');
    window.reviewEvents=[];window.addEventListener('fleet:business',e=>window.reviewEvents.push(e.detail));
  },{normal,denied,dnt,gpc});
  if(!live)await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());requests.push({url:req.url(),body:req.postData()||''});
    if(u.origin!==origin)return route.abort();
    if(u.pathname.startsWith('/api/'))return route.fulfill({status:200,json:{ok:true,available:false}});
    let filename=path.join(root,decodeURIComponent(u.pathname));
    if(u.pathname.endsWith('/'))filename+='index.html';
    else if(!path.extname(u.pathname))filename+='.html';
    try{return route.fulfill({body:await fs.readFile(filename),contentType:mime[path.extname(filename)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  return {context,page};
}
async function sample(page,lang){
  await page.goto(origin+(lang==='en'?'/en':'')+'/studio/table-review'+(live?'?__ci=1':''));
  await page.locator('#demo').click();
  assert.equal(await page.locator('#result-title').textContent(),lang==='en'?'2 locked values changed':'2 处锁定值被改动');
  assert.equal(await page.locator('#changes tbody tr').count(),6);
  await page.locator('#repair').click();assert(await page.locator('#download').isDisabled());
  assert((await page.locator('#preview-table').textContent()).includes('1990.00'));
  assert(!(await page.locator('#preview-table').textContent()).includes('19900.00'));
  await page.locator('#approve').check();
  const wait=page.waitForEvent('download');await page.locator('#download').click();const download=await wait;
  assert.equal(await download.failure(),null);await download.saveAs(path.join(out,lang+'-reviewed.csv'));
  const csv=await fs.readFile(path.join(out,lang+'-reviewed.csv'),'utf8');
  assert(csv.includes(lang==='en'?'001,Team spring event,12,1990.00':'001,Spring event,12,1990.00'));
  await page.screenshot({path:path.join(out,lang+'-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,lang+'-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1380,height:1000});
}
try{
  for(const lang of ['en','zh']){
    const {context,page}=await fixture({normal:!live});await sample(page,lang);
    if(!live){
      const events=await page.evaluate(()=>window.reviewEvents.filter(e=>e.name.startsWith('table_review')));
      assert(events.some(e=>e.name==='table_review_export_demo'));assert(events.every(e=>e.name.endsWith('_demo')&&Object.keys(e).length===1));
      await page.locator('#source').fill(await page.locator('#source').inputValue()+'\n003,extra,1,10.00,note');
      await page.locator('#read').click();assert((await page.locator('#mode').textContent()).includes(lang==='en'?'Fictional':'虚构'));
      assert(await page.locator('#download').isDisabled());
    }
    await context.close();
  }
  if(!live){
    const {context,page}=await fixture({normal:true});await page.goto(origin+'/en/studio/table-review');
    await page.locator('#source').fill('id,text,amount\n0007,QA-PRIVATE-SOURCE,3.00');await page.locator('#read').click();
    await page.locator('#columns input[value="text"]').check();
    await page.locator('#draft').fill('id,text,amount\n0007,QA-PRIVATE-DRAFT,30.00');await page.locator('#check').click();await page.locator('#repair').click();await page.locator('#approve').check();
    assert((await page.evaluate(()=>window.reviewEvents)).some(e=>e.name==='table_review_check_own'));
    await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return this.name==='slow.csv'?new Promise(resolve=>{window.releaseRead=()=>original.call(this).then(resolve);}):original.call(this);};});
    const file={name:'slow.csv',mimeType:'text/csv',buffer:Buffer.from('id,text,amount\n0007,NEW-PRIVATE,30.00')};
    await page.locator('#draft-file').setInputFiles(file);await page.locator('#check').click();await page.locator('#repair').click();await page.locator('#approve').check();
    await page.evaluate(()=>window.releaseRead());await page.waitForFunction(()=>document.querySelector('#draft').value.includes('NEW-PRIVATE'));
    assert(await page.locator('#result').isHidden());assert(await page.locator('#download').isDisabled());assert(!await page.locator('#approve').isChecked());
    await page.locator('#draft-file').setInputFiles(file);await page.locator('#draft').fill('manual-after-file');await page.evaluate(()=>window.releaseRead());assert.equal(await page.locator('#draft').inputValue(),'manual-after-file');
    for(const [draft,error]of [['id,text,amount\n0008,other,3.00','Missing draft ID'],['id,text,amount\n0007,=1+1,3.00','spreadsheet formula']]){
      await page.locator('#draft').fill(draft);await page.locator('#check').click();assert((await page.locator('#issues').textContent()).includes(error));assert(await page.locator('#repair').isDisabled());
    }
    await page.locator('#draft').fill('id,text,amount\n0007,<img src=https://leak.invalid/pixel onerror=alert(1)>,3.00');await page.locator('#check').click();
    assert.equal(await page.locator('#changes img').count(),0);assert.equal(await page.locator('#changes script').count(),0);
    const report=page.waitForEvent('download');await page.locator('#report').click();const item=await report;await item.saveAs(path.join(out,'report.json'));
    const json=JSON.parse(await fs.readFile(path.join(out,'report.json'),'utf8'));assert.equal(json.edits[0].before,'QA-PRIVATE-SOURCE');
    await page.locator('#key').selectOption('text');assert(await page.locator('#result').isHidden());
    await page.locator('#clear').click();assert.equal(await page.locator('#source').inputValue(),'');
    await context.close();
    for(const options of [{normal:false},{normal:true,denied:true},{normal:true,dnt:true},{normal:true,gpc:true}]){
      const {context,page}=await fixture(options);await page.goto(origin+'/en/studio/table-review');await page.locator('#demo').click();
      assert.equal((await page.evaluate(()=>window.reviewEvents.filter(e=>e.name.startsWith('table_review')))).length,0);await context.close();
    }
    for(const request of requests)for(const value of ['QA-PRIVATE','NEW-PRIVATE','leak.invalid'])assert(!(request.url+request.body).includes(value),'No content in network requests');
  }
  assert.deepEqual(errors,[]);console.log('PASS table review '+(live?'live':'local')+' bilingual/mobile, actual CSV download, privacy, fixed events and input-race checks.');
}finally{await browser.close();}
