import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {database} from '../../../tools/member-studio/test-fixtures.mjs';
import {ensureMembers} from '../lib/membership.js';
import {digest,seconds} from '../lib/ad-commerce.js';
import {onRequestPost as member} from '../functions/api/member.js';
import {onRequest as mcp} from '../functions/api/startup-mcp.js';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const dist=fileURLToPath(new URL('../dist/',import.meta.url)),origin='https://baipiaoji.com',KEY='1'.repeat(64),db=database(),errors=[],traffic=[];
await ensureMembers(db);await db.prepare('INSERT INTO wb_members(id,token_hash,created,ends_at) VALUES(?,?,?,?)').bind('browser-fixture',await digest(KEY),seconds(),seconds()+86400).run();
const env={HITS:db,ASSETS:{fetch:async r=>new Response(fs.readFileSync(path.join(dist,new URL(r.url).pathname)))}};
const browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin!==origin)return route.abort();traffic.push({path:u.pathname,body:req.postData()||''});
  if(u.pathname==='/api/member'&&req.method()==='GET')return route.fulfill({json:{ok:true,ready:true}});
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
  await page.goto(origin+prefix+'/members?__probe=1');assert.equal(await page.locator('script[src*="analytics-assets/consent"]').count(),0,'Key management must remain analytics-excluded');
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
 assert.deepEqual(errors,[]);assert(!traffic.filter(x=>x.path.includes('hit')||x.path.includes('analytics')).some(x=>x.body.includes('bpj_solo_')||x.body.includes(KEY)));
 console.log('PASS startup MCP browser: bilingual public preview, private member key issuance, configuration download, revocation, logout clearing, no key persistence/analytics, mobile layout. Fixture membership only; no real payment.');
}finally{await browser.close();db.sql.close();}
