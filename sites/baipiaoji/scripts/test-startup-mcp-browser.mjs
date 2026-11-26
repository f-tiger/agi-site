import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {mockChain,setupSites} from '../../../tools/member-studio/test-fixtures.mjs';
import {digest,seconds} from '../lib/ad-commerce.js';
import {onRequestGet as memberReady,onRequestPost as member} from '../functions/api/member.js';
import {onRequest as mcp} from '../functions/api/startup-mcp.js';
import {STARTUP_MCP_ORDER_SOURCE,startupMcpCheckoutURL} from '../../../tools/revenue-studio/member-copy.mjs';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const dist=fileURLToPath(new URL('../dist/',import.meta.url)),origin='https://baipiaoji.com',KEY='1'.repeat(64),errors=[],traffic=[];
const restoreFetch=mockChain(),sites=await setupSites(),{db}=sites.bpj;
await db.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').bind('browser-fixture',await digest(KEY),seconds(),seconds()+86400).run();
const env={...sites.bpj.env,ASSETS:{fetch:async r=>new Response(fs.readFileSync(path.join(dist,new URL(r.url).pathname)))}};
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin!==origin)return route.abort();traffic.push({path:u.pathname,body:req.postData()||''});
  if(u.pathname==='/api/member'&&req.method()==='GET')return route.fulfill({json:await (await memberReady({env})).json()});
  if(['/api/member','/api/startup-mcp'].includes(u.pathname)&&req.method()==='POST'){
   const r=await (u.pathname==='/api/member'?member:mcp)({env,request:new Request(req.url(),{method:'POST',headers:req.headers(),body:req.postData()})});return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()});
  }
  if(u.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,user:null}});
  let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.join(dist,p);if(!fs.existsSync(f))return route.fulfill({status:404});
  return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css'})[path.extname(f)]||'application/octet-stream'});
 });
 for(const prefix of ['', '/en']){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+prefix+'/ai-solo/mcp/?__probe=1');await page.locator('#startup-preview').click();await page.waitForFunction(()=>!document.querySelector('#startup-preview-result').hidden);assert((await page.locator('#startup-preview-result').innerText()).includes('reviewedCount'));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const language=prefix?'en':'zh',checkout=page.locator('[data-solo-event="mcp-checkout"]');
  assert.equal(await checkout.getAttribute('href'),startupMcpCheckoutURL(language));
  assert.equal(JSON.parse(await page.locator('#startup-preview-result').innerText()).data.membership.checkout,startupMcpCheckoutURL(language));
  await checkout.click();await page.waitForURL(startupMcpCheckoutURL(language));
  await page.waitForFunction(path=>document.querySelector('#return-tool')?.href.endsWith(path),prefix+'/ai-solo/mcp/');
  const alternate=page.locator(`header nav a[lang="${prefix?'zh':'en'}"]`).first();
  assert.equal(new URL(await alternate.getAttribute('href')).searchParams.get('tool'),STARTUP_MCP_ORDER_SOURCE);
  assert.equal(await page.locator('script[src*="analytics-assets/consent"]').count(),0,'Key management must remain analytics-excluded');
  await page.locator('#key').fill(KEY);await page.locator('#login').click();await page.waitForFunction(()=>document.querySelector('#member-status').textContent.includes(new Date().getFullYear()));
  await page.locator('#startup-create').click();await page.waitForFunction(()=>document.querySelector('#startup-key').value.startsWith('bpj_solo_'));
  const secret=await page.locator('#startup-key').inputValue();assert.equal(await page.locator('#startup-key').getAttribute('type'),'password');
  const pending=page.waitForEvent('download');await page.locator('#startup-download').click();const download=await pending,config=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(config.mcpServers['bpj-startup'].headers.Authorization,'Bearer '+secret);
  assert(!await page.evaluate(s=>Object.values(localStorage).concat(Object.values(sessionStorage)).some(v=>String(v).includes(s)),secret),'Scoped key must not persist');
  await page.locator('#startup-key-list button').first().click();await page.waitForFunction(()=>document.querySelector('#startup-key-list').children.length===0);assert.equal(await page.locator('#startup-key').inputValue(),'');
  await page.locator('#startup-create').click();await page.waitForFunction(()=>document.querySelector('#startup-key').value.startsWith('bpj_solo_'));
  await page.locator('#logout').click();await page.waitForLoadState();await page.waitForFunction(()=>document.querySelector('#startup-key')?.value==='');
  assert.equal(await page.locator('#startup-download').isDisabled(),true);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  // Remove fixture keys before repeating the same ownership checks in the other language.
  db.sql.prepare('UPDATE bpj_startup_keys SET revoked=?').run(seconds());await page.close();
 }
 const buyer=await context.newPage();await buyer.goto(startupMcpCheckoutURL('en'));
 await buyer.waitForFunction(()=>document.querySelector('#availability').textContent.includes('Web3'));
 await buyer.locator('#key').fill('2'.repeat(64));await buyer.locator('#login').click();
 await buyer.waitForFunction(()=>!document.querySelector('#login').disabled);
 await buyer.locator('#key-saved').check();await buyer.locator('#consent').check();await buyer.locator('#checkout').click();
 await buyer.waitForFunction(()=>document.querySelector('#orders').textContent.includes('9.'));
 assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM wb_orders o JOIN wb_order_sources s ON s.order_id=o.id WHERE s.product=? AND o.state='pending'").get(STARTUP_MCP_ORDER_SOURCE).n,1);
 assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM wb_orders WHERE state='paid'").get().n,0);
 assert.deepEqual(errors,[]);assert(!traffic.filter(x=>x.path.includes('hit')||x.path.includes('analytics')).some(x=>x.body.includes('bpj_solo_')||x.body.includes(KEY)));
 console.log('PASS startup MCP browser: bilingual preview, attributed pending checkout, private key lifecycle, no secret persistence or analytics, mobile layout. Fixture membership and mock chain only.');
}finally{await browser.close();restoreFetch();for(const side of Object.values(sites))side.db.sql.close();}
