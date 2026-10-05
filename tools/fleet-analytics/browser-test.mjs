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
   const mock=`const send=a=>{if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect?tid=${id}&en='+a[1]+'&dl='+encodeURIComponent(a[2].page_location),{method:'POST',body:JSON.stringify(a[2])});};for(const a of window.dataLayer||[])send(a);const original=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...a)=>{a.forEach(send);return original(...a);}`;
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
 await page.locator('#fleet-analytics-settings').waitFor();assert.equal(await page.locator('#fleet-analytics-choice').count(),0);
 await page.evaluate(()=>{document.title='SECRET_DYNAMIC_TITLE';document.querySelector('link[rel="canonical"]').href=location.origin+'/SECRET_DYNAMIC_URL';});
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
 await page.locator('[data-analytics-choice="denied"]').click();
 assert.equal(await page.locator('iframe[title="Optional analytics"]').count(),0);
 assert.equal((await context.cookies()).filter(c=>(c.name.startsWith('_ga')||c.name.startsWith('fleet_'))).length,0);
 await page.locator('[data-analytics-choice="granted"]').click();
 await page.waitForTimeout(process.env.REAL_GTAG_DIR?1200:150);
 assert.equal(requests.filter(r=>r.kind==='collect'&&(r.url.includes('en=page_view')||r.body.includes('en=page_view'))).length,1,'Regrant must not double-count the page');
 await page.locator('[data-analytics-choice="denied"]').click();
 const count=requests.length;await page.reload();await page.waitForTimeout(150);assert.equal(requests.length,count);
 await page.goto(target+'?__ci=1');assert.equal(await page.locator('#fleet-analytics-choice').count(),0);
 await page.goto(target+'?__probe=1');assert.equal(await page.locator('#fleet-analytics-choice').count(),0);
 await page.goto(target+'?ci=1');assert.equal(await page.locator('#fleet-analytics-choice').count(),0);
 // Validate business actions in the consent frame, using intercepted requests only.
 const tool=report.records.find(r=>r.mode==='consent'&&/\/workbench\/[a-z-]+(?:\.html)?$/.test(new URL(r.url).pathname));assert(tool);
 await page.goto(tool.url);await page.locator('#fleet-analytics-settings').waitFor();
 const emit=async name=>page.evaluate(name=>window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}})),name);
 await emit('workbench_complete');
 const before=requests.filter(r=>r.kind==='collect').length;
 await page.locator('[data-analytics-choice="granted"]').click();
 await page.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.length>0);
 await emit('workbench_example_complete');await emit('workbench_complete');await emit('workbench_complete');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'workbench_export',filename:'SECRET_FILE'}})));
 await page.waitForTimeout(200);
 const businessHits=requests.filter(r=>r.kind==='collect').slice(before);
 assert.equal(businessHits.filter(r=>r.url.includes('en=tool_complete&')).length,1);
 assert.equal(businessHits.filter(r=>r.url.includes('en=tool_example_complete&')).length,1);
 assert(!JSON.stringify(businessHits).includes('SECRET'));
 assert.equal(businessHits.filter(r=>r.url.includes('en=tool_export&')).length,0);
 await page.locator('[data-analytics-choice="denied"]').click();
 const after=requests.length;await emit('workbench_export');await page.waitForTimeout(100);assert.equal(requests.length,after);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({site,realGoogleTag:!!process.env.REAL_GTAG_DIR,pageViews:hits.length,privateMarkersLeaked:false,defaultOnWithoutPopup:true,optOutAndWithdrawal:true,mobileNoOverflow:true}));
 await context.close();
}finally{await browser.close();}
