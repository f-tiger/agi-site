import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const c=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://thedollscout.com'||u.pathname.startsWith('/api/'))return r.abort();let f=path.join(root,u.pathname);if(!path.extname(f))f+='.html';return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(f)]||'text/plain'}):r.fulfill({status:404});});
 for(const lang of ['en','de']){
  await p.goto('https://thedollscout.com/'+(lang==='de'?'de/':'')+'display-calculator?__ci=1');
  await p.locator('form button').click();
  const download=async()=>{const wait=p.waitForEvent('download');await p.locator('[data-buying-brief]').click();return fs.readFileSync(await (await wait).path(),'utf8');};
  assert.match(await download(),/EXAMPLE|BEISPIEL/);
  await p.locator('[name=width]').fill('51');assert.equal(await p.locator('[data-result]').isHidden(),true);
  await p.locator('form button').click();const text=await download();assert.match(text,/51 × 30 × 25 cm/);assert.ok(!/EXAMPLE|BEISPIEL/.test(text));
  await p.locator('[name=width]').fill('1');await p.locator('form button').click();assert.equal(await p.locator('[data-zero]').isVisible(),true);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.deepEqual(errors,[]);console.log('PASS EN/DE mobile: real checklist downloads, example/own distinction, zero-fit and stale result invalidation; no external requests.');
}finally{await browser.close();}
