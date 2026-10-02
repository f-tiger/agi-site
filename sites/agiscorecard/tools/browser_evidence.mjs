import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[path.resolve('tools/revenue-studio/node_modules')]}));
const launch={headless:true};if(process.env.AGI_CHROMIUM){const c=require(process.env.AGI_CHROMIUM);launch.executablePath=await c.executablePath();launch.args=c.args.filter(a=>!['--disable-web-security','--single-process'].includes(a));}
const browser=await chromium.launch(launch),root=path.resolve('sites/agiscorecard');
async function pageFor(route,{failCopy=false,privacy=false}={}){
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();
 await page.addInitScript(({failCopy,privacy})=>{window.__copied='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async s=>{if(failCopy)throw Error('blocked');window.__copied=s;}}});if(privacy)Object.defineProperty(navigator,'globalPrivacyControl',{value:true});},{failCopy,privacy});
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!=='https://agiscorecard.com')return r.abort();let slug=u.pathname==='/'?'/index.html':u.pathname;let f=path.join(root,path.extname(slug)?slug:slug+'.html');if(!f.startsWith(root+'/')||!fs.existsSync(f))return r.fulfill({status:404,body:'missing'});return r.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json'})[path.extname(f)]||'text/plain'});});
 await page.goto('https://agiscorecard.com'+route);await page.locator('[data-evidence-key]').waitFor();return {ctx,page};
}
const events=p=>p.evaluate(()=>Array.from(window.dataLayer||[]).filter(x=>x[0]==='event'&&['evidence_action','share_arrival'].includes(x[1])).map(x=>({name:x[1],...x[2]})));
try{
 for(const lang of ['en','zh'])for(const slug of ['progress-index','will-agi-arrive-2027','did-open-source-ai-fade','ai-and-your-job']){
  const {ctx,page:p}=await pageFor((lang==='zh'?'/zh':'')+'/'+slug);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  assert.equal(await p.locator('h1').count(),1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const panel=p.locator('[data-evidence-key]');await panel.locator('[data-evidence-action=citation_copy]').click();assert.match(await p.evaluate(()=>window.__copied),/2026-10-02.*2026-09-06/);
  await panel.locator('[data-evidence-action=share_copy]').click();assert.match(await p.evaluate(()=>window.__copied),/utm_campaign=agi_evidence_20261002/);assert.equal((await events(p)).length,2);
  const png=await Promise.all([p.waitForEvent('download'),panel.locator('[data-evidence-action=png_download]').click()]);assert.match(png[0].suggestedFilename(),/\.png$/);
  const download=await Promise.all([p.waitForEvent('download'),panel.locator('[data-evidence-action=chart_download]').click()]);assert.match(download[0].suggestedFilename(),/\.svg$/);
  await panel.scrollIntoViewIfNeeded();if(slug==='progress-index')await p.screenshot({path:'/tmp/agi-evidence-'+lang+'-mobile.png'});
  await p.setViewportSize({width:1365,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(slug==='progress-index')await p.screenshot({path:'/tmp/agi-evidence-'+lang+'-desktop.png'});
  assert.deepEqual(errors,[]);await ctx.close();
 }
 {const {ctx,page:p}=await pageFor('/progress-index',{failCopy:true});await p.locator('[data-evidence-action=citation_copy]').click();assert.ok(await p.locator('.evidence-fallback').isVisible());assert.equal((await events(p)).length,0);await ctx.close();}
 for(const route of ['/progress-index?ci=1','/zh/progress-index?__qa=1']){const{ctx,page:p}=await pageFor(route);await p.locator('[data-evidence-action=share_copy]').click();assert.equal((await events(p)).length,0);await ctx.close();}
 {const{ctx,page:p}=await pageFor('/progress-index',{privacy:true});await p.locator('[data-evidence-action=share_copy]').click();assert.equal((await events(p)).length,0);await ctx.close();}
 {const{ctx,page:p}=await pageFor('/progress-index?utm_source=reader_share&utm_campaign=agi_evidence_20261002');assert.equal((await events(p)).filter(e=>e.name==='share_arrival').length,1);await p.reload();await p.locator('[data-evidence-key]').waitFor();assert.equal((await events(p)).filter(e=>e.name==='share_arrival').length,0);await ctx.close();}
 console.log('Eight evidence pages: mobile/desktop, links, copy success/failure, downloads, arrival deduplication and privacy passed.');
}finally{await browser.close();}
