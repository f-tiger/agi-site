const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../site'),origin='https://getecoback.com',dir=process.env.QA_DIR||'/tmp/eco-tool-social';fs.mkdirSync(dir,{recursive:true});
(async()=>{const urls=Object.keys(JSON.parse(execFileSync('python3',['-c','import json;from build_tools_hub import discover;print(json.dumps(discover()))'],{cwd:__dirname,encoding:'utf8'})));for(const prefix of ['', '/en', '/it'])for(const slug of ['billlens','appliancepayback','homeenergy-log']){const u=prefix+'/workbench/'+slug+'.html';if(fs.existsSync(path.join(root,u)))urls.push(u);}const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}: {})});let checks=0,quick=0;const records=[];
try{for(const url of urls){const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});await ctx.addInitScript(()=>{window.__business=[];window.__legacy=[];window.addEventListener('fleet:business',e=>window.__business.push(e.detail));window.dataLayer=[];window.dataLayer.push=(...args)=>{window.__legacy.push(...args.map(a=>Array.from(a)));return Array.prototype.push.apply(window.dataLayer,args)};});await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({contentType:'application/json',body:'{}'});const f=path.join(root,u.pathname);return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream'}):r.fulfill({status:404,body:'missing'});});const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+url+'?__probe=1');// The exact-model directory intentionally owns its interaction instead of a numerical scenario panel.
if(url==='/en/filter-finder.html'){
 const first=p.locator('#model-options button').first();await first.waitFor();
 assert.equal(await p.locator('script[src*="/assets/tool-experience.mjs"]').count(),0,'Finder must retain its dedicated interaction');
 assert.equal(await p.locator('#eco-tool-experience').count(),0,'No generic calculation claims on the model directory');
 const model=await first.innerText();await first.click();
 assert(await p.locator('#model-result').isVisible());assert((await p.locator('#model-result h3').innerText()).includes(model));
 const source=new URL(await p.locator('#model-result .source-link').first().getAttribute('href'));assert(source.protocol==='https:'&&(source.hostname==='levoit.com'||source.hostname.endsWith('.levoit.com')));
 for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),url+' overflow '+width);}
 assert.deepEqual(errors,[]);checks+=9;records.push({url,quick:false,dedicated:true});await ctx.close();continue;
}
const panel=p.locator('#eco-tool-experience');await panel.locator('[type=button]').first().waitFor();await p.waitForSelector('#eco-tool-experience[data-ready]');checks++;
const plainLaundryShare=url==='/waeschetrockner-oder-luftentfeuchter.html';
const plainCellarShare=url==='/guide/keller-lueften-sommer.html';
for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),url+' overflow '+width);checks++;}
if(await panel.getAttribute('data-quick')){quick++;const preview=panel.locator('.eco-preview');assert(await preview.isVisible(),url+' no initial result');assert(!(await preview.innerText()).includes('NaN'));assert.equal((await p.evaluate(()=>window.__legacy.filter(a=>a[0]==='event'&&/calc|check|fit/.test(a[1])))).length,0,url+' example emitted completion');assert.equal((await p.evaluate(()=>window.__business.filter(e=>e.name==='legacy:tool_complete'||e.name==='legacy:tool_start'))).length,0,url+' example counted');checks+=4;
const choices=panel.locator(':scope > .eco-actions').first().locator('button');if(await choices.count()>1)await choices.nth(1).click();const prepare=panel.locator(':scope > .eco-actions').last().locator('button').first();await prepare.click();const draft=panel.locator('textarea');assert((await draft.inputValue()).includes('https://getecoback.com'));const link=await panel.locator('.eco-fallback').getAttribute('href'),u=new URL(link);assert(u.hash.startsWith('#eco-v1='));assert.deepEqual([...u.searchParams.keys()].sort(),plainCellarShare?[]:['utm_campaign','utm_medium','utm_source']);const data=JSON.parse(decodeURIComponent(u.hash.slice(8)));assert.equal(data.path,url);checks+=4;
for(const platform of ['Reddit','X']){
 const external=new URL(await panel.locator('.eco-links a').filter({hasText:new RegExp('^'+platform+'$')}).getAttribute('href'));
 const shared=new URL(external.searchParams.get('url'));
 assert.equal(shared.pathname,url);assert.equal(shared.hash,plainLaundryShare?'#laundry-check':plainCellarShare?'#taupunkt':u.hash);checks+=2;
 if(plainLaundryShare||plainCellarShare){assert.equal(shared.origin,origin);assert.equal(shared.search,'');checks+=2;}
 if(plainCellarShare){assert.equal(external.searchParams.get(platform==='Reddit'?'title':'text'),'Keller lüften? Taupunkte und kalte Wand vergleichen');checks++;}
}
if(plainCellarShare){
 const {cellarVentilationShareText}=await import('../site/assets/keller-lueften-share.mjs');
 const outside={aussen_c:10,aussen_rh_prozent:80},inside={innen_c:17,innen_rh_prozent:65,wand_c:15};
 assert.equal(await draft.inputValue(),cellarVentilationShareText({...outside,...inside},'example'));
 assert.equal(await panel.locator('.eco-fallback').textContent(),'Szenario-Link (enthält Werte)');
 await p.locator('#tk').fill('18.5');
 assert(await prepare.isDisabled());assert(!(await draft.isVisible()));
 await p.locator('#go').click();await prepare.click();
 const manual=cellarVentilationShareText({...outside,...inside,innen_c:18.5});
 assert.equal(await draft.inputValue(),manual);
 await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked');}}}));
 await panel.getByRole('button',{name:'Text kopieren',exact:true}).click();
 await p.waitForFunction(()=>document.activeElement?.tagName==='TEXTAREA'&&document.activeElement.selectionEnd===document.activeElement.value.length);
 assert.equal(await draft.inputValue(),manual);
 await choices.nth(1).click();
 const noScript=await b.newContext({javaScriptEnabled:false,viewport:{width:320,height:840}});
 await noScript.route('**/*',route=>route.request().isNavigationRequest()
    ?route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,url))}):route.abort());
 try{
  const page=await noScript.newPage();await page.goto(origin+url+'#taupunkt');
  const section=page.locator('#taupunkt');
  const anchor=section.getByRole('link',{name:'Rechnerlink auf Reddit öffnen'});
  assert.equal(new URL(await anchor.getAttribute('href')).searchParams.get('url'),origin+url+'#taupunkt');
  assert.match(await section.innerText(),/6,7 °C/);assert.match(await section.innerText(),/Umweltbundesamt/);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),origin+'/assets/social/keller-lueften-taupunkt-v1.png');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),origin+url);
  assert.equal(await page.locator('a[rel~="sponsored"]').count(),1,'Only the existing manual measurement CTA belongs on this decision page');
  assert.match(await page.locator('a[rel~="sponsored"]').getAttribute('href'),/^https:\/\/www\.amazon\.de\/s\?k=hygrometer\+innen\+aussen\+taupunkt&tag=getecoback-21$/);
  assert.equal(await page.locator('script[data-ga4-id="G-E2V0Q9SJ9V"]').count(),1);
 }finally{await noScript.close();}
 checks+=16;
}
const result=await preview.locator('p').innerText();await p.goto(link+'&ignored'); // Malformed fragments must fail closed, never break the page.
await p.waitForSelector('#eco-tool-experience[data-ready]');assert.deepEqual(errors,[]);checks++;
await p.goto(link);await p.waitForSelector('#eco-tool-experience[data-ready]');assert.equal(await panel.locator('.eco-preview p').innerText(),result,url+' scenario not reproducible');checks++;
const first=await p.evaluate(values=>{for(const key of Object.keys(values)){const es=[...document.querySelectorAll('input[type=number]')].filter(e=>e.name===key||e.id===key);const e=es.find(e=>e.getClientRects().length);if(e)return {id:e.id,name:e.name};}},data.values);assert(first,url+' no editable numeric input');const field=first.id?p.locator('#'+first.id):p.locator('input[name="'+first.name+'"]');await field.fill('');assert(await panel.locator(':scope > .eco-actions').last().locator('button').first().isDisabled());assert(!await panel.locator('.eco-preview').isVisible());checks+=2;
if(records.length<3){await panel.locator(':scope > .eco-actions').first().locator('button').first().click();await panel.locator(':scope > .eco-actions').last().locator('button').first().click();const download=p.waitForEvent('download');await panel.locator('.eco-links button').last().click();assert((await download).suggestedFilename().endsWith('.png'));checks++;await p.setViewportSize({width:390,height:844});await panel.screenshot({path:path.join(dir,'tool-'+records.length+'.png')});}
}
await panel.locator(':scope > .eco-actions').last().locator('button').last().click();const generic=new URL(await panel.locator('.eco-fallback').getAttribute('href'));assert.equal(generic.hash,plainLaundryShare?'#laundry-check':plainCellarShare?'#taupunkt':'');assert(!generic.searchParams.has('mode'));assert.deepEqual(errors,[]);checks+=3;
if(plainLaundryShare){assert.equal(generic.href,origin+url+'#laundry-check');checks++;}
if(plainCellarShare){assert.equal(generic.href,origin+url+'#taupunkt');checks++;}
if(url==='/stromtarif-werkstatt.html'){await panel.locator(':scope > .eco-actions').first().locator('button').first().click();await p.click('#reset');await p.waitForFunction(()=>document.querySelector('#eco-tool-experience > .eco-actions:last-of-type button').disabled);assert(await panel.locator(':scope > .eco-actions').last().locator('button').first().isDisabled());await panel.locator(':scope > .eco-actions').first().locator('button').first().click();await p.check('[name=purpose][value=own]');assert(await panel.locator(':scope > .eco-actions').last().locator('button').first().isDisabled());checks+=2;}
records.push({url,quick:await panel.getAttribute('data-quick')==='true'});await ctx.close();}
fs.writeFileSync(path.join(dir,'tool-experience.json'),JSON.stringify({pages:urls.length,quickPages:quick,checks,records},null,2));console.log(`PASS tool experience: ${urls.length} pages, ${quick} instant-example pages, ${checks} assertions; reproducible social links, no automatic completion, stale-result protection and responsive layouts.`);}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
