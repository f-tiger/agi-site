const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
(async()=>{
 const dir=process.env.QA_DIR||'/tmp/eco-revenue-qa',root=path.resolve(__dirname,'../site');
 const copy=JSON.parse(await fs.readFile(path.join(__dirname,'../data/energy-workbench.json'),'utf8'));
 await fs.mkdir(dir,{recursive:true});let checks=0,events=[],serverErrors=[];
 // Let keepalive beacons reach a real receiver. Pausing them in a browser route
 // can cancel the paused request when its originating document navigates away.
 const server=http.createServer(async(request,response)=>{
  try{
   const u=new URL(request.url,'http://localhost');
   if(u.pathname.startsWith('/api/')){
    if(u.pathname==='/api/ev'&&request.method==='POST'){
     const chunks=[];for await(const chunk of request)chunks.push(chunk);
     const event=JSON.parse(Buffer.concat(chunks).toString());
     assert.ok(event&&typeof event.n==='string','Event POST must contain a named event');events.push(event);
    }
    response.writeHead(204);response.end();return;
   }
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   if(!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
   let body;try{body=await fs.readFile(file);}catch{response.writeHead(404);response.end();return;}
   response.writeHead(200,{'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'",'Content-Type':{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});response.end(body);
  }catch(error){serverErrors.push(error.message);response.writeHead(500);response.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const received=async(name,count)=>{const end=Date.now()+5000;while(events.filter(e=>e.n===name).length<count&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,20));assert.equal(events.filter(e=>e.n===name).length,count,'Receiver count for '+name+'; observed '+JSON.stringify(events.map(e=>e.n)));};
 try{
 for(const [name,type]of Object.entries({chromium,webkit})){
  const browser=await type.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'}),errors=[];events=[];
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   for(const [lang,t]of Object.entries(copy)){
    console.log('Checking revenue next steps: '+name+' / '+lang);
    await page.goto(base+'/'+t.path);await page.waitForFunction(()=>document.querySelector('#reset').onclick);
    assert.equal(await page.locator('#next-steps').isVisible(),false);checks++;
    await page.locator('[name=confirm]').check();await page.locator('button[type=submit]').click();
    assert.equal(await page.locator('#next-steps').isVisible(),false);checks++;
    await page.locator('[name=purpose][value=own]').check();await page.locator('button[type=submit]').click();
    assert.equal(await page.locator('#next-steps').isVisible(),true);checks++;
    for(const item of t.nextLinks){assert.equal(await page.locator(`[data-next-step="${item.id}"]`).getAttribute('href'),item.path);checks++;}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++;
    const before=events.filter(e=>e.n==='outbound_choice').length;
    await page.locator('[data-next-step]').first().click();
    await page.waitForURL(base+t.nextLinks[0].path);
    await received('outbound_choice',before+1);
    assert.equal(events.filter(e=>e.n==='outbound_choice').length,before+1);checks++;
    assert.deepEqual(events.filter(e=>e.n==='outbound_choice').at(-1).m,{lang,market:lang==='en'?'de':lang,input:'own',source:'energy-next',choice:'consumption'});checks++;
   }
   await page.goto(base+'/'+copy.de.path+'?__probe=1');await page.waitForFunction(()=>document.querySelector('#reset').onclick);
   await page.locator('[name=purpose][value=own]').check();await page.locator('[name=confirm]').check();await page.locator('button[type=submit]').click();
   await page.locator('#next-steps').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/revenue-next-'+name+'.png'});
   await page.locator('[name=kwh0]').fill('4000');assert.equal(await page.locator('#next-steps').isVisible(),false);checks++;
   // The Solarbank diagnosis guide checked here was taken down on 2026-09-27
   // (owner: all storage and balcony-PV pages removed); it now answers 410.
   assert.deepEqual(errors,[]);checks++;
   assert.deepEqual(serverErrors,[]);checks++;
  } finally{await browser.close();}
 }
 console.log(checks+' revenue flow/browser assertions passed; third-party requests blocked');
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
