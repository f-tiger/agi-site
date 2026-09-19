import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {products,sites} from './catalog.mjs';
import {puzzle} from './core.mjs';
import {projects} from './projects.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-test-'));
for(const site of Object.keys(sites))execFileSync(process.execPath,[path.join(here,'build.mjs'),'--site',site,'--out',path.join(root,site)]);
let current='agi';
const server=http.createServer((req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!path.extname(pathname))pathname+='.html';const file=path.resolve(root,current,'.'+pathname);if(!file.startsWith(path.resolve(root,current)+path.sep))throw Error('Bad path');const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
try{browser=await chromium.launch({headless:true,...(process.env.WORKBENCH_CHROMIUM?{executablePath:process.env.WORKBENCH_CHROMIUM,args:["--no-sandbox","--disable-dev-shm-usage","--single-process"]}:{})});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const p of products){current=p.site;const s=sites[p.site];await page.goto(origin+s.prefix+'/'+p.id+s.suffix);await page.waitForSelector('#input-form button');if(!p.kind){await page.getByRole('button',{name:'Generate result',exact:true}).click();await page.waitForSelector('#output table');assert.equal(await page.locator('#status.error').count(),0,p.id);const name=page.getByRole('textbox',{name:'Saved version name'});await name.fill('Test version');await page.getByRole('button',{name:'Save version',exact:true}).click();assert.match(await page.locator('#status').textContent(),/Saved on this device/);const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();assert.ok((await download).suggestedFilename().endsWith('.csv'));}
else if(p.kind==='sql'){for(let i=0;i<projects.length;i++){await page.locator('#project').selectOption(String(i));await page.locator('#query').fill(projects[i].answer);await page.getByRole('button',{name:'Run query',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#output h2')?.textContent==='Project passed');await page.locator('#output h2').evaluate(n=>n.textContent='Ready');}}
else if(p.kind==='puzzle'){const seed=await page.locator('#seed').inputValue(),solution=puzzle(seed).solution;const inputs=page.locator('.puzzle-grid input');for(let i=0;i<16;i++)if(await inputs.nth(i).getAttribute('readonly')===null)await inputs.nth(i).fill(String(solution[i]));await page.getByRole('button',{name:'Check my solution'}).click();assert.match(await page.locator('#status').textContent(),/Solved!/);}
else if(p.kind==='classroom'){assert.equal(await page.locator('.worksheet .puzzle-grid').count(),8);}
else if(p.kind==='embed'){await page.getByRole('button',{name:'Build embed'}).click();const frame=page.frameLocator('iframe');await frame.getByRole('button',{name:'Check',exact:true}).click();assert.equal(await frame.locator('#status').textContent(),'Keep going.');assert.match(await page.locator('#output textarea').inputValue(),/sandbox="allow-scripts"/);}
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow: '+p.id);await page.setViewportSize({width:1280,height:900});console.log('UI OK '+p.id);}
assert.deepEqual(errors,[]);current='eco';await page.goto(origin+sites.eco.prefix+'/billlens.html');await page.getByRole('button',{name:'Generate result',exact:true}).click();await page.screenshot({path:path.join(root,'billlens-desktop.png'),fullPage:true});console.log('Screenshot: '+path.join(root,'billlens-desktop.png'));console.log('All 24 browser flows passed.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
