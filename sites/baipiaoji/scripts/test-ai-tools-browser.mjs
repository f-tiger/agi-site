import {SUITE_CATEGORIES,SUITE_TOOLS,runSuiteTool} from '../lib/ai-suite/registry.mjs';
import {createRequire} from 'node:module';import {createServer} from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');const root=fileURLToPath(new URL('../dist/',import.meta.url));let origin;
const server=createServer((req,res)=>{try{let p=new URL(req.url,origin).pathname;if(p==='/api/account'){res.setHeader('Content-Type','application/json');res.end('{"ok":true,"user":null,"favorites":[]}');return;}if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'text/plain');res.end(fs.readFileSync(f,'utf8').replaceAll('https://baipiaoji.com',origin));}catch{res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;let browser;const errors=[];
try{browser=await chromium.launch({headless:true,...(process.env.PILOT_CHROMIUM?{executablePath:process.env.PILOT_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']}: {})});for(const pre of ['','/en']){const c=await browser.newContext();await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));for(const width of [320,390,1024,1440]){await p.setViewportSize({width,height:900});await p.goto(origin+pre+'/studio/ai/?__ci=1');await p.locator('main a[href="'+origin+pre+'/studio/task-loop"]').first().waitFor({state:'visible',timeout:5000});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'hub overflow '+width);await p.goto(origin+pre+'/studio/task-loop?__ci=1');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'tool overflow '+width);}
await p.locator('#tl-goal').fill('Ship signup');await p.locator('#tl-acceptance').fill('Live signup passes');await p.locator('#tl-blockers').fill('Missing service configuration');await p.locator('#tl-state button').click();assert.match(await p.locator('#tl-decision').textContent(),/阻塞|blockers/);
for(const [id,v]of [['action','Inspect logs'],['expected','Reproduce error'],['when','After inspection'],['fallback','Check dependencies']])await p.locator('#tl-'+id).fill(v);await p.locator('#tl-predict button').click();await p.reload();assert.equal(await p.locator('#tl-pending option').count(),1);await p.locator('#tl-evidence').fill('<script>alert(1)</script> service failed');await p.locator('#tl-result').selectOption('fail');await p.locator('#tl-outcome button').click();assert.equal(await p.locator('#tl-pending option').count(),0);assert.equal(await p.locator('#tl-timeline script').count(),0);const dl=p.waitForEvent('download');await p.locator('#tl-export').click();const file=await dl,raw=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(raw.events.length,3);
await p.locator('#tl-goal').fill('Another goal');await p.locator('#tl-state button').click();assert.equal(await p.locator('#tl-timeline li').count(),3);await p.locator('#tl-change').fill('User explicitly changed the goal');await p.locator('#tl-state button').click();assert.equal(await p.locator('#tl-timeline li').count(),4);
await p.setViewportSize({width:390,height:900});await p.screenshot({path:'/tmp/bpj-ai-'+(pre?'en':'zh')+'.png',fullPage:true});
await p.goto(origin+pre+'/?__ci=1');
const suite=p.locator('#ai-tools');
const toolLinks=await suite.locator('[data-suite-keywords] a').evaluateAll(links=>links.map(a=>new URL(a.href).pathname));
assert.deepEqual(new Set(toolLinks),new Set(SUITE_TOOLS.map(tool=>pre+'/studio/ai/'+tool.id)));
assert.equal(toolLinks.length,1000);
assert.equal(await suite.locator('[data-suite-group]').count(),SUITE_CATEGORIES.length);
const filter=suite.locator('[data-suite-search]');
await filter.fill('no-result-73261');
assert.equal(await suite.locator('[data-suite-group]:visible').count(),0);
await filter.fill('');
assert.equal(await suite.locator('[data-suite-group][open]').count(),0);
await filter.fill('csv-to-json');
const matches=await suite.locator('[data-suite-keywords]:visible').count();
assert(matches>0&&matches<toolLinks.length);
await suite.getByRole('link',{name:/CSV 转 JSON 对象|Convert CSV to JSON objects/}).click();
await p.waitForURL('**/studio/ai/csv-to-json');
if(process.env.BPJ_SUITE_SCREENSHOT)await p.screenshot({path:'/tmp/bpj-suite-'+(pre?'en':'zh')+'.png',fullPage:true});
for(const group of SUITE_CATEGORIES){
 const id=group.tools[0].id;
 await p.goto(origin+pre+'/studio/ai/categories/'+group.id+'?__ci=1');
 assert.equal(await p.locator('[data-suite-keywords] a').count(),group.tools.length);
 const tool=SUITE_TOOLS.find(x=>x.id===id);
 await p.goto(origin+pre+'/studio/ai/'+id+'?__ci=1');
 await p.locator('[data-suite-example]').click();
 await p.locator('form button[type=submit]').click();
 const fetched=await p.evaluate(()=>performance.getEntriesByType('resource').map(entry=>new URL(entry.name).pathname));
 assert(fetched.includes('/studio-assets/ai-suite/'+group.id+'.mjs'));
 assert(!fetched.includes('/studio-assets/ai-suite/registry.mjs'));
 const output=p.locator('[data-suite-output]');
 await output.waitFor({state:'visible'});
 assert.deepEqual(JSON.parse(await output.textContent()),runSuiteTool(tool.name,tool.example));
 const dl=p.waitForEvent('download');
 await p.locator('[data-suite-download]').click();
 const downloaded=await dl;
 assert.deepEqual(JSON.parse(fs.readFileSync(await downloaded.path(),'utf8')),runSuiteTool(tool.name,tool.example));
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'suite tool overflow '+id);
}
if(!pre){
 const ids=await p.evaluate(async categories=>{
  const {executeSuiteTool}=await import('/studio-assets/ai-suite/runtime.mjs');
  const completed=[];
  for(const id of categories){
   const {tools}=await import('/studio-assets/ai-suite/'+id+'.mjs');
   for(const tool of tools){
    try {
     const value=executeSuiteTool(tool,tool.example);
     if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Expected a structured result.');
     completed.push(tool.id);
    } catch(error){throw Error(tool.id+': '+error.message);}
   }
  }
  return completed;
 },SUITE_CATEGORIES.map(group=>group.id));
 assert.deepEqual(ids,SUITE_TOOLS.map(tool=>tool.id));
}
await c.close();}assert.deepEqual(errors,[]);console.log('PASS EN/ZH: Task Loop, all 1,000 homepage links, category navigation, search and local execution plus export in every category.');}finally{await browser?.close();server.close();}
