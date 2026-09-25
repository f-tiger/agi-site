// Actual rendering and handoff QA. Local static server; all external requests blocked.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {CASES,caseProject} from '../assets/studio/video-cases.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url)),out=fs.mkdtempSync(path.join(os.tmpdir(),'bpj-case-proof-'));
let origin,browser;
const server=http.createServer((req,res)=>{
 try{
  let p=new URL(req.url,'http://local').pathname;
  if(p==='/api/member'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,ready:true}));return;}
  if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';
  const f=path.resolve(root,'.'+p);if(!f.startsWith(root))throw Error('Path');
  const ext=path.extname(f);res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[ext]||'application/octet-stream');
  let b=fs.readFileSync(f);if(['.html','.js','.mjs','.json','.css'].includes(ext))b=Buffer.from(b.toString().replaceAll('https://baipiaoji.com',origin));res.end(b);
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:1040},acceptDownloads:true}),errors=[];
 await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 for(const lang of ['zh','en']){
  const prefix=lang==='zh'?'':'/en';
  await page.goto(origin+prefix+'/video/?__ci=1');await page.waitForFunction(()=>document.querySelector('#vc-start').href.includes('opening='));
  await page.screenshot({path:out+'/'+lang+'-desktop.png',fullPage:true});
  await page.locator('#cases').screenshot({path:out+'/'+lang+'-cases.png'});
  const sources=await page.locator('[data-case-input]').evaluateAll(nodes=>nodes.map(c=>c.toDataURL()));assert.equal(new Set(sources).size,3);
  for(const c of CASES){
   await page.locator('[data-video-case="'+c.id+'"]').click();assert.equal(await page.locator('#vc-title').textContent(),c[lang].title);
   const url=new URL(await page.locator('#vc-start').getAttribute('href'));assert.equal(url.searchParams.get('case'),c.id);assert.equal(url.searchParams.get('opening'),String(c.variant));assert.equal(url.searchParams.get('ratio'),c.ratio);
  }
  await page.locator('[data-video-case="revision"]').click();
  const frames=[];for(const v of [0,1]){await page.locator('[data-case-variant="'+v+'"]').click();frames.push(await page.locator('#vc-canvas').evaluate(c=>c.toDataURL()));}assert.notEqual(...frames);
  const tails=[];for(const v of [0,1]){await page.locator('[data-case-variant="'+v+'"]').click();await page.locator('#vc-scrub').evaluate(el=>{el.value='4.5';el.dispatchEvent(new Event('input',{bubbles:true}));});tails.push(await page.locator('#vc-canvas').evaluate(c=>c.toDataURL()));}assert.equal(...tails);
  await page.locator('[data-video-case="repurpose"]').click();
  for(const [ratio,size]of [['9:16',[720,1280]],['1:1',[960,960]],['16:9',[1280,720]]]){await page.locator('#vc-ratio').selectOption(ratio);assert.deepEqual(await page.locator('#vc-canvas').evaluate(c=>[c.width,c.height]),size);}
  await page.locator('[data-case-variant="2"]').click();const expected=caseProject('repurpose',lang);expected.ratio='16:9';
  const sampleFrame=await page.locator('#vc-canvas').evaluate(c=>c.toDataURL());
  const download=page.waitForEvent('download');await page.locator('#vc-pack').click();const f=out+'/'+lang+'-project.zip';await (await download).saveAs(f);
  const packed=JSON.parse(execFileSync('python',['-c','import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(z.read("project.json").decode())',f],{encoding:'utf8'}));assert.deepEqual(packed,expected);
  const edit=await page.locator('#vc-start').getAttribute('href');await page.goto(edit);await page.waitForFunction(()=>document.getElementById('vv-ratio').value==='16:9');
  assert.equal(await page.locator('#vv-hook-2').inputValue(),expected.hooks[2]);assert.equal(await page.locator('[data-variant="2"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#vv-canvas').evaluate(c=>c.toDataURL()),sampleFrame);
  if(lang==='zh'){
   const result=page.waitForEvent('download',{timeout:40000});await page.locator('#vv-export').click();const d=await result,video=out+'/'+d.suggestedFilename();await d.saveAs(video);
   const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',video],{encoding:'utf8'}));const stream=meta.streams.find(s=>s.codec_type==='video');assert.equal(stream.width,1280);assert.equal(stream.height,720);assert.ok(Number(meta.format.duration)>8.5&&Number(meta.format.duration)<10.5);execFileSync('ffmpeg',['-v','error','-i',video,'-f','null','-'],{stdio:'pipe'});
  }
  await page.setViewportSize({width:390,height:844});await page.goto(origin+prefix+'/video/?case=revision&__ci=1');await page.waitForFunction(()=>document.getElementById('vc-title').textContent.includes('开头')||document.getElementById('vc-title').textContent.includes('Change'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/'+lang+'-mobile.png',fullPage:true});await page.locator('#cases').screenshot({path:out+'/'+lang+'-mobile-cases.png'});
  await page.setViewportSize({width:1440,height:1040});await page.goto(origin+prefix+'/studio/video-variants?case=unknown&__ci=1');assert.equal(await page.locator('#vv-name').inputValue(),'');
  console.log('PASS '+lang+': three cases, changed opening / unchanged later frames, all formats, ZIP, exact editor handoff and mobile layout');
 }
 assert.deepEqual(errors,[]);console.log('PASS a real 9-second 1280x720 case video decodes; no external requests or page errors');console.log('Artifacts: '+out);
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
