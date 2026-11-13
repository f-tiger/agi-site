const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com';
const live=process.env.LIVE==='1',tls=live&&process.env.QA_IGNORE_HTTPS_ERRORS==='1';
const out=process.env.QA_DIR||'/tmp/eco-drain-anchor-qa';fs.mkdirSync(out,{recursive:true});
const routes=['luftentfeuchter-ratgeber','luftentfeuchter-keller','waesche-trocknen-wohnung'];
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const cases=[];
try{for(const slug of routes)for(const [width,js]of[[320,true],[320,false],[390,true],[390,false]]){
const c=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,serviceWorkers:'block',ignoreHTTPSErrors:tls});const writes=[],merchants=[],errors=[];
await c.addInitScript(()=>{window.__probe=true;Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});});
await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());
if(u.origin!==origin){if(/amazon\./.test(u.hostname))merchants.push(u.href);return route.abort();}
if(q.method()!=='GET'&&q.method()!=='HEAD'){writes.push({path:u.pathname,method:q.method(),body:q.postData()});return route.abort();}
if(live)return route.continue();
if(u.pathname.startsWith('/api/')||u.pathname==='/auth/status')return route.fulfill({contentType:'application/json',body:'{"ok":true,"user":null}'});
const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'missing'});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';return route.fulfill({contentType:mime,body:fs.readFileSync(file)});
});
const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
const res=await p.goto(origin+'/guide/'+slug+'.html?__probe=1#ablauf-vor-kauf',{waitUntil:'load'});assert.equal(res.status(),200);
await p.evaluate(()=>document.fonts.ready);const box=p.locator('#eb-models');assert.equal(await box.count(),1);assert.equal(await box.locator('.dc-card').count(),6);
const check=p.locator('#ablauf-vor-kauf');assert.equal(await check.count(),1);assert.equal(await check.locator('ol li').count(),3);
const text=await check.innerText();for(const s of['Ein Schlauchanschluss allein bestätigt keine Pumpe.','MeacoDry Arete One 20L','weder den deutschen Lieferumfang noch die Eignung der Arete Two 12L','13.11.2026'])assert(text.includes(s));
assert.equal(await check.locator('a[href="https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier"]').count(),1);
const info=await p.evaluate(()=>({w:document.documentElement.scrollWidth,canonical:document.querySelector('link[rel="canonical"]')?.href,ga:[...document.querySelectorAll('script[data-ga4-id]')].map(s=>s.dataset.ga4Id),outside:!document.querySelector('#eb-buyer #eb-models')}));
assert(info.w<=width+1);assert.equal(info.canonical,origin+'/guide/'+slug+'.html');assert.deepEqual(info.ga,['G-E2V0Q9SJ9V']);assert(info.outside);
await p.waitForTimeout(250);
const clearance=await p.evaluate(()=>{const heading=document.querySelector('#dc-drain-title').getBoundingClientRect();const nav=document.querySelector('nav.eb-nav').getBoundingClientRect();return {headingTop:heading.top,headingBottom:heading.bottom,navBottom:nav.bottom,viewport:innerHeight};});
await p.screenshot({path:path.join(out,`${slug}-${width}-${js?'js':'nojs'}-native-anchor.png`)});
assert(clearance.headingTop>=clearance.navBottom+8,'Native fragment heading obscured: '+JSON.stringify(clearance));
assert(clearance.headingBottom<clearance.viewport,'Heading must be visible in first viewport');
assert(writes.every(w=>w.path==='/api/ev'&&(['page_view','feuchte_now'].includes(JSON.parse(w.body).n)||(slug==='waesche-trocknen-wohnung'&&JSON.parse(w.body).n==='strom_now'&&JSON.parse(w.body).m?.src==='heat'))),'Unexpected blocked write: '+JSON.stringify(writes));assert.equal(merchants.length,0);assert.deepEqual(errors,[]);
cases.push({slug,width,js,status:'PASS',clearance,documentWidth:info.w,blockedLegacyEventAttempts:writes.map(w=>JSON.parse(w.body).n),submittedPostRequests:0,merchantRequests:merchants.length});await c.close();
}fs.writeFileSync(path.join(out,'browser-drain.json'),JSON.stringify({live,proxyTLSException:tls,status:'PASS',cases},null,2));console.log(JSON.stringify({live,proxyTLSException:tls,status:'PASS',cases:cases.length,out}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
