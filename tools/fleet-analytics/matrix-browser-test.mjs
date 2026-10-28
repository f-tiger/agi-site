// Built calculator HTML, intercepted network, no production events or input telemetry.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {chromium} from '../revenue-studio/node_modules/playwright/index.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'matrix-measurement-')),origin='https://agiscorecard.com';
for(const route of ['/matrix-odds','/zh/matrix-odds']){
 let html=fs.readFileSync(new URL('../../sites/agiscorecard'+route+'.html',import.meta.url),'utf8');
 html=html.replace(/<script\b[^>]*src=["'][^"']+["'][^>]*>[\s\S]*?<\/script>/gi,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,s=>s.includes('googletagmanager.com/gtag/js')?'':s);
 const f=path.join(root,route+'.html');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,html);
}
execFileSync('python3',[fileURLToPath(new URL('coverage.py',import.meta.url)),'--site','agi','--out',root,'--write'],{stdio:'pipe'});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const c=await browser.newContext();await c.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='www.googletagmanager.com')return r.fulfill({contentType:'text/javascript',body:''});if(u.origin!==origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({contentType:'application/json',body:'{"ok":true}'});const f=path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':path.extname(u.pathname)?u.pathname:u.pathname+'.html');return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.mjs')?'text/javascript':'text/html'}):r.fulfill({status:204});});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/matrix-odds','/zh/matrix-odds']){
  await p.goto(origin+route+'?private=SECRET');
  await p.waitForFunction(()=>document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer?.some(x=>x[0]==='config'));
  await p.locator('#r0').evaluate(el=>{for(let i=0;i<100;i++){el.value=String(i);el.dispatchEvent(new Event('input',{bubbles:true}));}});
  const events=()=>p.evaluate(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).map(x=>Array.from(x)));
  assert.equal((await events()).filter(x=>x[1]==='tool_click'||x[1]==='matrix_calculate').length,0);
  await p.locator('#r0').focus();await p.locator('#r0').press('ArrowLeft');
  await p.waitForFunction(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]').contentWindow.dataLayer).some(x=>x[1]==='matrix_calculate'));
  await p.locator('#r1').focus();await p.locator('#r1').press('ArrowRight');
  const rows=await events();assert.equal(rows.filter(x=>x[1]==='matrix_calculate').length,1);assert.equal(rows.filter(x=>x[1]==='page_view').length,1);assert.ok(!JSON.stringify(rows).includes('SECRET'));
 }
 assert.deepEqual(errors,[]);console.log('PASS bilingual matrix: live recalculation stays responsive; slider input never counts as a tool click; one committed calculation per document, no probability telemetry.');
}finally{await browser.close();fs.rmSync(root,{recursive:true,force:true});}
