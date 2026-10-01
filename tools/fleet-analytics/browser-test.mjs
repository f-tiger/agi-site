import {chromium} from '../revenue-studio/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const args=process.argv.slice(2),root=path.resolve(args[args.indexOf('--out')+1]),site=args[args.indexOf('--site')+1];
const config={agi:['agiscorecard.com','G-FZXLMBB5QB','/earn'],eco:['getecoback.com','G-E2V0Q9SJ9V','/stromtarif-werkstatt.html'],bpj:['baipiaoji.com','G-H79D948F4Z','/workbench'],tds:['thedollscout.com','G-2SEHFY33H8','/workbench']};
const [host,id]=config[site],origin='https://'+host;
const report=JSON.parse(fs.readFileSync(path.join(root,'analytics-assets/coverage.json')));
const record=report.records.find(r=>r.mode==='consent'&&(site==='agi'?r.url.endsWith('/earn'):site==='eco'?r.url.endsWith('/stromtarif-werkstatt.html'):true));assert(record);
const target=record.url;
const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 const requests=[],errors=[];
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.hostname==='www.googletagmanager.com'){
   requests.push({kind:'tag',url:req.url()});
   const real=process.env.REAL_GTAG_DIR&&path.join(process.env.REAL_GTAG_DIR,'gtag-'+site+'-default.js');
   const mock=`for(const a of window.dataLayer||[]){if(a[0]==='event'&&a[1]==='page_view')fetch('https://www.google-analytics.com/g/collect?tid=${id}&en=page_view&dl='+encodeURIComponent(a[2].page_location),{method:'POST',body:JSON.stringify(a[2])});}`;
   return route.fulfill({contentType:'application/javascript',body:real?fs.readFileSync(real):mock});
  }
  if(u.hostname.endsWith('google-analytics.com')){requests.push({kind:'collect',url:req.url(),body:req.postData()||'',headers:req.headers()});return route.fulfill({status:204});}
  if(u.hostname!==host)return route.abort();
  if(u.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
  let rel=u.pathname.slice(1);if(!rel||rel.endsWith('/'))rel+='index.html';else if(!path.extname(rel))rel+='.html';
  const f=path.join(root,rel),types={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
  if(!fs.existsSync(f))return route.fulfill({status:404,body:'missing fixture'});
  return route.fulfill({contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(target+'?private=SECRET_QUERY#SECRET_FRAGMENT');
 await page.locator('#fleet-analytics-choice').waitFor();assert.equal(requests.length,0);
 assert.equal((await context.cookies()).filter(c=>c.name.startsWith('_ga')).length,0);
 await page.evaluate(()=>{document.title='SECRET_DYNAMIC_TITLE';document.querySelector('link[rel="canonical"]').href=location.origin+'/SECRET_DYNAMIC_URL';});
 await page.locator('[data-analytics-choice="granted"]').click();
 await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
 await page.waitForTimeout(process.env.REAL_GTAG_DIR?2500:150);
 await page.evaluate(()=>{
  window.gtag?.('event','private_tool_result',{label:'SECRET_EVENT'});
  const form=document.createElement('form');form.id='SECRET_FORM';const input=document.createElement('input');input.name='SECRET_FIELD';input.value='SECRET_INPUT';form.append(input);document.body.append(form);input.dispatchEvent(new Event('change',{bubbles:true}));
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  const link=document.createElement('a');link.href='https://download.invalid/SECRET_FILE.pdf?token=SECRET_TOKEN';link.textContent='SECRET_LINK';document.body.append(link);link.addEventListener('click',e=>e.preventDefault());link.click();
  history.pushState({},'',location.pathname+'?private=SECRET_HISTORY#SECRET_HISTORY_FRAGMENT');
 });
 await page.waitForTimeout(process.env.REAL_GTAG_DIR?1200:150);
 const hits=requests.filter(r=>r.kind==='collect'),payload=decodeURIComponent(JSON.stringify(hits));
 assert.equal(requests.filter(r=>r.kind==='tag').length,1);
 assert.equal(hits.filter(r=>r.url.includes('en=page_view')||r.body.includes('en=page_view')).length,1,payload);
 assert(payload.includes(id));assert(payload.includes(target));assert(!payload.includes('SECRET'),payload);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#fleet-analytics-settings').click();await page.locator('[data-analytics-choice="denied"]').click();
 assert.equal(await page.locator('iframe[title="Optional analytics"]').count(),0);
 assert.equal((await context.cookies()).filter(c=>c.name.startsWith('_ga')).length,0);
 await page.locator('#fleet-analytics-settings').click();await page.locator('[data-analytics-choice="granted"]').click();
 await page.waitForTimeout(process.env.REAL_GTAG_DIR?1200:150);
 assert.equal(requests.filter(r=>r.kind==='collect'&&(r.url.includes('en=page_view')||r.body.includes('en=page_view'))).length,1,'Regrant must not double-count the page');
 await page.locator('#fleet-analytics-settings').click();await page.locator('[data-analytics-choice="denied"]').click();
 const count=requests.length;await page.reload();await page.waitForTimeout(150);assert.equal(requests.length,count);
 await page.goto(target+'?__ci=1');assert.equal(await page.locator('#fleet-analytics-choice').count(),0);
 await page.goto(target+'?__probe=1');assert.equal(await page.locator('#fleet-analytics-choice').count(),0);
 await page.goto(target+'?ci=1');assert.equal(await page.locator('#fleet-analytics-choice').count(),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({site,realGoogleTag:!!process.env.REAL_GTAG_DIR,pageViews:hits.length,privateMarkersLeaked:false,consentAndWithdrawal:true,mobileNoOverflow:true}));
 await context.close();
}finally{await browser.close();}
