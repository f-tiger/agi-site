// Optional browser regression: use the same Playwright dev dependency as the existing workbench tests.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const artifacts=fs.mkdtempSync(path.join(os.tmpdir(),'bpj-studio-qa-'));
let origin;
const server=http.createServer((req,res)=>{
  try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';else if(!path.extname(pathname))pathname+='.html';
    const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root))throw Error('Path');
    const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[ext]||'application/octet-stream');
    res.end(fs.readFileSync(file,'utf8').replaceAll('https://baipiaoji.com',origin));
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.WORKBENCH_CHROMIUM?{executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--disable-gpu']}: {})});const errors=[];
  for(const [lang,prefix] of [['zh',''],['en','/en']]){
    const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
    await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(origin+prefix+'/studio/');assert.equal(await page.locator('.studio-product').count(),2);
    await page.screenshot({path:path.join(artifacts,lang+'-hub.png'),fullPage:true});
    await page.locator('.studio-product a.studio-button').nth(1).click();
    await page.locator('#qc-example').click();await page.waitForSelector('.quote-table');
    assert.equal(await page.locator('.quote-table tr[data-ready=true]').count(),1);
    assert.match(await page.locator('.quote-result-summary').textContent(),/1080.00/);
    await page.locator('[data-select="1"]').click();await page.locator('#qc-quote-overbuy_approved').check();await page.locator('#qc-calculate').click();
    assert.equal(await page.locator('.quote-table tr[data-ready=true]').count(),2);
    await page.locator('[data-select="2"]').click();await page.locator('#qc-quote-shipping_gross_quote_currency').fill('0');
    assert.equal(await page.locator('#qc-quote-reviewed').isChecked(),false);
    assert.equal(await page.locator('#qc-export-actions').isVisible(),false);
    await page.locator('#qc-quote-reviewed').check();await page.locator('#qc-calculate').click();
    assert.equal(await page.locator('.quote-table tr[data-ready=true]').count(),3);
    assert.match(await page.locator('.quote-result-summary').textContent(),/920.00/);
    const dl=page.waitForEvent('download');await page.locator('#qc-csv').click();const csvDownload=await dl;const csvPath=path.join(artifacts,lang+'-comparison.csv');await csvDownload.saveAs(csvPath);const raw=fs.readFileSync(csvPath,'utf8');assert.ok(raw.includes('920.00')&&raw.includes('1160.00'));
    await page.locator('.quote-save summary').click();
    const backupDownload=page.waitForEvent('download');await page.locator('#qc-backup').click();const backup=await backupDownload;const backupPath=path.join(artifacts,lang+'-backup.json');await backup.saveAs(backupPath);assert.equal(JSON.parse(fs.readFileSync(backupPath,'utf8')).quotes.length,3);
    await page.locator('#qc-save').click();await page.reload();await page.locator('.quote-save summary').click();await page.locator('#qc-restore').click();
    await page.locator('#qc-calculate').click();assert.equal(await page.locator('.quote-table tr[data-ready=true]').count(),0);
    await page.locator('#qc-file').setInputFiles(backupPath);assert.match(await page.locator('#qc-policy-required_sku').inputValue(),/BOX-100/);assert.equal(await page.locator('#qc-quote-reviewed').isChecked(),false);
    await page.locator('#qc-example').click();await page.locator('#qc-calculate').click();
    await page.screenshot({path:path.join(artifacts,lang+'-results.png'),fullPage:false});
    await page.setViewportSize({width:390,height:844});await page.goto(origin+prefix+'/studio/');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile hub overflows');
    await page.locator('.studio-product a.studio-button').nth(1).click();await page.locator('#qc-example').click();await page.locator('#qc-calculate').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile quote tool overflows');
    await page.screenshot({path:path.join(artifacts,lang+'-mobile.png'),fullPage:false});
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Browser checks passed: zh/en desktop + 390px mobile; approvals, recalculation, real CSV/JSON downloads, local save/restore, backup import; zero page errors. Artifacts: '+artifacts);
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
