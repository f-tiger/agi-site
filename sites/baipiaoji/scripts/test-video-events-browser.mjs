// Intercept every request: genuine UI operations, zero production analytics or uploads.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),requests=[],errors=[];
 await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
 await context.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.hostname==='www.googletagmanager.com')return r.fulfill({body:'',contentType:'application/javascript'});
  if(u.origin!=='https://baipiaoji.com')return r.abort();
  if(u.pathname.startsWith('/api/')){requests.push(r.request().postData()||'');return r.fulfill({contentType:'application/json',body:'{"ok":true,"ready":false}'});}
  const f=path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':path.extname(u.pathname)?u.pathname:u.pathname+'.html');
  return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'application/octet-stream'}):r.fulfill({status:404});
 });
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 const events=()=>p.evaluate(()=>Array.from(document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer||[]).map(x=>Array.from(x)));
 const has=name=>p.waitForFunction(name=>Array.from(document.querySelector('iframe[title="Optional analytics"]')?.contentWindow.dataLayer||[]).some(x=>x[1]===name),name);
 await p.goto('https://baipiaoji.com/video/');await p.locator('#vc-play').click();await has('video_example_play');
 await p.locator('[data-video-action="hero-create"]').click();await p.locator('#vv-example').click();await has('video_example_start');
 await p.locator('#vv-name').fill('PRIVATE_PROJECT_DO_NOT_SEND');
 await p.locator('#vv-brief').click();await has('video_export_brief_demo');
 // Successful rendered output, distinct from a button click or project backup.
 for(let i=0;i<3;i++)await p.locator('#vv-seconds-'+i).fill('3');
 await p.locator('#vv-export').click();await has('video_export_video_demo');assert.equal(await p.locator('#video-next-step').isHidden(),true);
 await p.locator('#vv-new').click();await p.locator('#vv-export').click();
 assert.ok(!(await events()).some(x=>x[1]==='video_export_video_own'),'Incomplete own project must not count as an export');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHeYAAAAASUVORK5CYII=','base64');
 for(let i=0;i<3;i++){await p.locator('#vv-asset-'+i).setInputFiles({name:'PRIVATE_ASSET.png',mimeType:'image/png',buffer:png});await p.waitForFunction(i=>document.getElementById('vv-asset-status-'+i).textContent.includes('PRIVATE_ASSET'),i);await p.waitForFunction(()=>!document.getElementById('vv-export').disabled);}
 await has('video_attach_media_own');await p.locator('#vv-name').fill('PRIVATE_PROJECT_DO_NOT_SEND');
 for(let i=0;i<3;i++){await p.locator('#vv-hook-'+i).fill('PRIVATE_COPY_'+i);await p.locator('#vv-seconds-'+i).fill('3');if(i)await p.locator('#vv-text-'+i).fill('PRIVATE_CAPTION_'+i);}
 await p.locator('#vv-export').click();await has('video_export_video_own');
 await p.locator('#video-next-step').scrollIntoViewIfNeeded();await p.waitForTimeout(300);
 assert.equal(await p.locator('#video-next-step').isVisible(),true);
 await p.locator('#video-next-step summary').click();await p.locator('[data-next="payment"]').click();
 assert.equal(await p.locator('[data-next="local"]').isDisabled(),true);
 const backup=p.waitForEvent('download');await p.locator('[data-next="backup"]').click();await backup;
 assert.ok(requests.some(x=>x.includes('/biz/trigger/video-payment')));
 assert.ok(requests.some(x=>x.includes('/biz/trigger/video-backup')));
 await p.locator('[data-next="dismiss"]').click();assert.equal(await p.locator('#video-next-step').isHidden(),true);

 const measured=await events();assert.equal(measured.filter(x=>x[1]==='video_export_video_demo').length,1);assert.equal(measured.filter(x=>x[1]==='video_export_video_own').length,1);assert.equal(measured.filter(x=>x[1]==='page_view').length,1);
 assert.ok(!JSON.stringify([measured,requests]).includes('PRIVATE_'));
 // Stored opt-out and QA must suppress even directly invoked bridge actions.
 for(const url of ['https://baipiaoji.com/video/?__ci=1','https://baipiaoji.com/video/']){
  if(!url.includes('__ci'))await p.evaluate(()=>localStorage.setItem('fleet_ga4_choice_v1','denied'));
  await p.goto(url);await p.locator('#vc-play').click();await p.waitForTimeout(150);assert.ok(!(await events()).some(x=>x[1]==='video_example_play'));
 }
 assert.deepEqual(errors,[]);console.log('PASS real demo/own video exports, incomplete export rejection, privacy and QA exclusions; all network intercepted.');
}finally{await browser.close();}
