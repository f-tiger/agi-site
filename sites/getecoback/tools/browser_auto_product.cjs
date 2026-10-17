// Runs a real browser against disposable renderer output even with an empty registry.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const tools=__dirname,site=path.resolve(tools,'../site');
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'eco-auto-product-'));
 execFileSync('python3',['-c',`import sys\nfrom pathlib import Path\nsys.path.insert(0,sys.argv[1])\nfrom test_auto_content_render import render_fixture,route\nroot=Path(sys.argv[2])\nfor country in ('DE','GB'):\n p=root/route(country).lstrip('/')\n p.parent.mkdir(parents=True,exist_ok=True)\n p.write_text(render_fixture(country),encoding='utf-8')\n`,tools,tmp]);
 fs.mkdirSync(path.join(tmp,'assets'));for(const asset of ['auto-product.mjs','auto-product.css'])fs.copyFileSync(path.join(site,'assets',asset),path.join(tmp,'assets',asset));
 const server=http.createServer((request,response)=>{let file;try{file=path.resolve(tmp,'.'+new URL(request.url,'http://local').pathname);}catch{return response.writeHead(400).end();}if(!file.startsWith(tmp+path.sep))return response.writeHead(403).end();try{const bytes=fs.readFileSync(file);response.writeHead(200,{'Content-Type':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});response.end(bytes);}catch{response.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 let browser,checks=0;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}:{} )});
  const configure=async(page,{qa=false,dnt=false,gpc=false,clipboard=true}={})=>{
   await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   await page.addInitScript(({qa,dnt,gpc,clipboard})=>{for(const [key,value]of [['webdriver',qa],['doNotTrack',dnt?'1':null],['globalPrivacyControl',gpc]])Object.defineProperty(navigator,key,{value});window.__autoEvents=[];window.addEventListener('fleet:business',event=>window.__autoEvents.push(event.detail));Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(!clipboard)throw new Error('denied');window.__autoCopied=text;}}});},{qa,dnt,gpc,clipboard});
  };
  for(const [country,route]of [['DE','/guide/auto-test-model-betriebskosten.html'],['GB','/en/guide/auto-test-model-running-cost.html']]){
   const page=await browser.newPage({viewport:{width:320,height:850}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await configure(page);await page.goto(base+route);const root=page.locator('#auto-product-tool');await root.locator('form').waitFor({state:'visible'});
   const count=name=>page.evaluate(name=>window.__autoEvents.filter(event=>event.name===name).length,name);
   assert.equal(await root.locator('input:checked').count(),0);assert(!await root.locator('[data-auto-result]').isVisible());checks+=2;
   await root.locator('form').dispatchEvent('submit');assert.equal(await count('eco_auto_calculate'),0);checks++;
   await root.locator('[data-auto-example]').click();assert.match(await root.locator('[data-auto-result-title]').innerText(),country==='DE'?/Beispielrechnung/:/Example calculation/);assert.equal(await count('eco_auto_example'),1);assert.equal(await count('eco_auto_calculate'),0);checks+=3;
   await root.locator('[data-auto-copy]').click();assert.match(await page.evaluate(()=>window.__autoCopied),country==='DE'?/0,56 €/:/£0.56/);assert.match(await page.evaluate(()=>window.__autoCopied),country==='DE'?/keine garantierte/:/not.*guaranteed/);checks+=2;
   await root.locator('[name=hours][value="4"]').check();assert(!await root.locator('[data-auto-result]').isVisible());await root.locator('form').dispatchEvent('submit');assert.equal(await count('eco_auto_calculate'),0);checks+=2;
   await root.locator('[name=rate][value="0.40"]').check();await root.locator('[name=drainage]').selectOption('hose');await root.locator('[type=submit]').click();assert.equal(await count('eco_auto_calculate'),1);assert.match(await root.locator('[data-auto-result-cost]').innerText(),country==='DE'?/0,32 €/:/£0.32/);assert.match(await root.locator('[data-auto-result-drain]').innerText(),country==='DE'?/nicht bestätigt/:/not confirmed/);checks+=3;
   await root.locator('[type=submit]').click();assert.equal(await count('eco_auto_calculate'),1);assert(await page.evaluate(()=>window.__autoEvents.every(event=>Object.keys(event).join(',')==='name')));checks+=2;
   for(const width of [320,390,1280]){await page.setViewportSize({width,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`horizontal overflow at ${width}`);checks++;}
   assert.deepEqual(errors,[]);checks++;await page.close();
   const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:850}});await nojs.goto(base+route);assert(!await nojs.locator('#auto-product-tool form').isVisible());assert.match(await nojs.locator('#auto-product-tool').innerText(),country==='DE'?/16,80 €/:/£16.80/);assert.equal(await nojs.locator('[data-fact-key]').count(),6);assert(await nojs.locator('#sources').isVisible());assert(await nojs.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks+=5;await nojs.close();
  }
  for(const flags of [{qa:true},{dnt:true},{gpc:true},{qa:false,query:'?__qa=1'}]){
   const page=await browser.newPage();await configure(page,flags);await page.goto(base+'/en/guide/auto-test-model-running-cost.html'+(flags.query||''));const root=page.locator('#auto-product-tool');await root.locator('[data-auto-example]').click();await root.locator('[name=hours][value="8"]').check();await root.locator('[name=rate][value="0.35"]').check();await root.locator('[type=submit]').click();await root.locator('[data-auto-copy]').click();assert.deepEqual(await page.evaluate(()=>window.__autoEvents),[]);checks++;await page.close();
  }
  const denied=await browser.newPage();await configure(denied,{clipboard:false});await denied.goto(base+'/en/guide/auto-test-model-running-cost.html?__probe=1');await denied.locator('[data-auto-example]').click();await denied.locator('[data-auto-copy]').click();assert(await denied.locator('[data-auto-copy-text]').isVisible());assert.match(await denied.locator('[data-auto-status]').innerText(),/unavailable/);assert.deepEqual(await denied.evaluate(()=>window.__autoEvents),[]);checks+=3;await denied.close();
  console.log(JSON.stringify({pass:true,checks,fixture:'temporary renderer output; no production requests'}));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1)});
