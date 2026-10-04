import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {join,dirname,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../../tools/revenue-studio/node_modules/playwright/index.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'};
const server=createServer((req,res)=>{
  let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!path.startsWith(resolve(root)+'/')){res.writeHead(403).end();return;}
  if(!existsSync(path)&&existsSync(path+'.html'))path+='.html';
  if(!existsSync(path)||!statSync(path).isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'}).end(readFileSync(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.PILOT_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try{
  for(const pre of ['', '/en']){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    let loggedIn=false;const errors=[];
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin){if(url.hostname==='baipiaoji.com'&&/\.(?:js|mjs|css)$/.test(url.pathname)){await route.fulfill({response:await route.fetch({url:origin+url.pathname+url.search})});}else await route.abort();return;}
      if(url.pathname==='/api/account'){await route.fulfill({json:{ok:true,user:loggedIn?{id:'audit-fixture',username:'Audit fixture'}:null,favorites:[]}});return;}
      if(url.pathname.startsWith('/api/')){await route.fulfill({json:{ok:true}});return;}
      await route.continue();
    });
    await context.addInitScript(()=>{window.auditCopied='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.auditCopied=text}},configurable:true});});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+pre+'/subscription-audit?__ci=1');
    await page.waitForFunction(()=>window.bpjAccount?.state.loaded).catch(e=>{throw Error(e.message+' Page errors: '+JSON.stringify(errors))});
    assert.equal(await page.locator('[data-account-gate]').isVisible(),true);
    await page.locator('.au-on[data-s="github-copilot"]').click();
    assert.equal(await page.locator('.au-on[data-s="github-copilot"]').isChecked(),false,'The existing anonymous account gate still applies');
    loggedIn=true;await page.reload();await page.waitForFunction(()=>window.bpjAccount?.state.user);
    await page.evaluate(()=>{window.auditBusiness=[];window.addEventListener('fleet:business',e=>window.auditBusiness.push(e.detail));window.auditEvents=[];window.bpjEv=(name,path)=>window.auditEvents.push({name,path});});
    await page.locator('.au-on[data-s="github-copilot"]').check();
    assert.equal(await page.locator('[data-audit-tool="github-copilot"]').getAttribute('data-audit-result'),'missing');
    await page.locator('#auComp').fill('60');await page.locator('#auChatReq').fill('1');
    assert.equal(await page.locator('[data-audit-tool="github-copilot"]').getAttribute('data-audit-result'),'within');
    await page.locator('.au-fee[data-s="github-copilot"]').fill('17.25');
    await page.locator('.au-on[data-s="ms-copilot"]').check();
    await page.locator('.au-on[data-s="qoder"]').check();
    assert.equal(await page.locator('[data-audit-tool="ms-copilot"]').getAttribute('data-audit-result'),'unknown');
    assert.equal(await page.locator('[data-audit-tool="qoder"]').getAttribute('data-audit-result'),'trial');
    await page.locator('#auCopy').click();
    const copied=await page.evaluate(()=>window.auditCopied);
    assert.ok(copied.includes('\n\n'),'The copied checklist has actual line breaks');
    assert.ok(!copied.includes('\\n'),'Literal escape sequences are not shown to readers');
    assert.ok(copied.includes('17.25'));
    assert.ok(copied.includes('2026-08-03'),'Recorded source date is preserved');
    assert.ok(copied.includes('https://baipiaoji.com'+pre+'/tools/github-copilot'),'Source-record URLs survive copying');
    assert.ok(copied.includes(pre?'Next step:':'下一步：'));
    assert.ok(!/this one earns its fee|免费档就够，可以先停|a month you could stop paying/.test(copied));
    // The clipboard rejection path must offer the identical local artifact.
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('fixture denied')}},configurable:true}));
    await page.locator('#auCopy').click();
    assert.equal(await page.locator('#auCopyFallback').inputValue(),copied);
    await page.waitForTimeout(1600);
    const events=await page.evaluate(()=>window.auditEvents);
    assert.ok(events.some(x=>x.path==='/audit/review'));assert.ok(events.some(x=>x.path==='/audit/copy'));
    const business=await page.evaluate(()=>window.auditBusiness);assert.ok(business.length>0);assert.ok(business.every(x=>Object.keys(x).length===1&&['subscription_review','subscription_copy'].includes(x.name)));
    assert.ok(events.every(x=>x.name==='audit'&&['/audit/review','/audit/copy'].includes(x.path)),'Analytics receives fixed actions only');
    await page.locator('#auChatReq').fill('2');
    assert.equal(await page.locator('[data-audit-tool="github-copilot"]').getAttribute('data-audit-result'),'over');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No mobile horizontal overflow');
    if(pre==='/en')await page.screenshot({path:'/tmp/bpj-subscription-review-en-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);await context.close();
  }
  console.log('subscription-audit browser: bilingual gate, comparison, copied artifact, failure fallback and fixed analytics actions passed');
}finally{await browser.close();await new Promise(r=>server.close(r));}
