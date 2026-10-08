// Offline browser regression: generated pages and stubbed membership endpoints only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildMembers} from './build.mjs';
import {buildStartupMcpPages} from '../../sites/baipiaoji/scripts/startup-mcp-pages.mjs';
import {memberURL} from '../revenue-studio/member-copy.mjs';
import {sites} from '../revenue-studio/catalog.mjs';
const {chromium}=createRequire(new URL('../revenue-studio/package.json',import.meta.url))(process.env.WORKBENCH_PLAYWRIGHT||'playwright');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'member-attribution-')),source='bpj-startup-research',key='1'.repeat(64);
for(const site of Object.keys(sites))buildMembers({site,out:path.join(tmp,site)});
const landing={};
for(const lang of ['zh','en'])buildStartupMcpPages({BASE:sites.bpj.origin+(lang==='zh'?'':'/en'),zh:lang==='zh',esc:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),write(){},render(route,title,description,body){landing[lang]=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;}});
const browser=await chromium.launch({headless:true,...(process.env.WORKBENCH_CHROMIUM?{executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
let count=0;
async function scenario({site='bpj',lang='en',query='',expected='',account=false,cta=false,switchLanguage=false}){
 const context=await browser.newContext(),errors=[],requests=[],outside=[];let order=null;
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==sites[site].origin){outside.push(url.origin);return route.abort();}
  if(url.pathname.startsWith('/api/')){
   if(!['/api/member','/api/account-member'].includes(url.pathname))throw Error('Unexpected API request '+url.pathname);
   if(request.method()==='GET')return route.fulfill({json:{ok:true,ready:true}});
   const body=request.postDataJSON();
   if(body.action==='status')return route.fulfill({json:{ok:true,exists:true,active:false,key_backed_up:true,user:{id:'fixture-account',username:'fixture'}}});
   if(body.action==='orders')return route.fulfill({json:{ok:true,orders:order?[order]:[]}});
   if(body.action==='checkout'){
    requests.push({endpoint:url.pathname,source:body.source,keys:Object.keys(body).sort()});
    order={id:'offline-order',state:'pending',payment:{amount:'9.000001',address:'offline-fixture',expires:Math.floor(Date.now()/1000)+3600}};
    return route.fulfill({json:{ok:true,order}});
   }
   throw Error('Unexpected membership action '+body.action);
  }
  if(url.pathname.endsWith('/ai-solo/mcp/'))return route.fulfill({contentType:'text/html',body:landing[lang]});
  let file;
  if(url.pathname.startsWith('/workbench-assets/'))file=new URL('../revenue-studio/'+path.basename(url.pathname),import.meta.url);
  else{let relative=url.pathname;if(!path.extname(relative))relative+='.html';file=path.join(tmp,site,relative);}
  if(!fs.existsSync(file))throw Error('Missing local fixture '+url.pathname);
  const ext=path.extname(String(file));return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html','.mjs':'application/javascript','.json':'application/json','.css':'text/css'}[ext]||'text/plain'});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 if(cta){await page.goto(sites.bpj.origin+(lang==='zh'?'':'/en')+'/ai-solo/mcp/');const link=page.locator('a[data-solo-event="mcp-setup"]');assert.equal(await link.getAttribute('href'),memberURL(lang,site)+'?source='+source+'#startup-mcp');await link.click();}
 else await page.goto(memberURL(lang,site)+query);
 await page.waitForFunction(()=>document.querySelector('#availability')?.textContent.includes('Web3'));
 if(switchLanguage){
  const target=lang==='en'?'zh':'en';const link=page.locator('header nav a[lang="'+target+'"]');const next=new URL(await link.getAttribute('href'));
  assert.equal(next.searchParams.get('source'),source);assert.equal(next.hash,'#startup-mcp');assert.equal(next.searchParams.get('__ci'),'1');
  await link.click();await page.waitForFunction(()=>document.querySelector('#availability')?.textContent.includes('Web3'));
 }
 assert.equal(await page.locator('script[src*="analytics"],script[src*="gtag"],script[src*="googletagmanager"]').count(),0);
 assert.equal(await page.evaluate(()=>typeof globalThis.gtag),'undefined');
 if(account)await page.locator('#account-use').click();
 else{await page.locator('#key').fill(key);await page.locator('#login').click();}
 await page.locator('#key-saved').check();await page.locator('#consent').check();await page.locator('#checkout').click();
 await page.waitForFunction(()=>document.querySelector('#orders')?.textContent.includes('offline-order'));
 assert.equal(requests.length,1);assert.equal(requests[0].source,expected);assert.equal(requests[0].endpoint,account?'/api/account-member':'/api/member');
 assert.deepEqual(requests[0].keys,account?['accept_terms','account_id','action','key_saved','nonce','source']:['accept_terms','action','key_saved','nonce','source']);
 assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);await context.close();count++;
}
try{
 for(const lang of ['zh','en'])await scenario({lang,cta:true,expected:source});
 await scenario({query:'?source='+source+'#startup-mcp',expected:source,account:true});
 for(const lang of ['zh','en'])await scenario({lang,query:'?source='+source+'&__ci=1#startup-mcp',expected:source,switchLanguage:true});
 await scenario({query:'?tool=launchdesk&source='+source,expected:'launchdesk'});
 await scenario({query:'?tool=bpj-video-variants&source='+source,expected:'bpj-video-variants'});
 await scenario({query:'?tool=billlens&source='+source,expected:source});
 await scenario({query:'?tool=launchdesk&source=unknown',expected:'launchdesk'});
 for(const query of ['','?source=unknown','?source=BPJ-STARTUP-RESEARCH','?source=%20'+source,'?tool='+source])await scenario({query});
 for(const site of ['agi','eco','tds'])await scenario({site,query:'?source='+source});
 assert.ok(!JSON.parse(fs.readFileSync(path.join(tmp,'bpj/member-assets/products.json'),'utf8')).some(p=>p.id===source));
 console.log(`${count} offline attribution browser scenarios passed; no external requests, real orders, keys or funds.`);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
