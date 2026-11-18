import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');const root=fileURLToPath(new URL('../dist/',import.meta.url));
const b=await chromium.launch({executablePath:process.env.WORKBENCH_CHROMIUM,args:['--no-sandbox']});
try{const c=await b.newContext();await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='https://baipiaoji.com')return r.abort();if(u.pathname==='/api/submit'||u.pathname==='/api/claim')return r.fulfill({status:429,contentType:'application/json',body:JSON.stringify({ok:false,code:'rate_limited',retryAfter:60})});if(u.pathname.startsWith('/api/'))return r.fulfill({contentType:'application/json',body:'{}'});let p=u.pathname;if(p.endsWith('/'))p+='index.html';else if(!path.extname(p))p+='.html';const f=path.join(root,p);return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]||'text/html'}):r.fulfill({status:404});});const p=await c.newPage();
for(const prefix of ['', '/en']){
 await p.goto('https://baipiaoji.com'+prefix+'/submit?__probe=1');const f=p.locator('#submitForm');await f.locator('[name=name]').fill('Fixture');await f.locator('[name=url]').fill('https://example.com/');await f.locator('button[type=submit]').click();await p.getByText(prefix?'Too many requests. Retry in 60 seconds; your input is preserved.':'提交过于频繁，请等待 60 秒后重试；输入已保留。',{exact:true}).waitFor();assert.equal(await f.locator('[name=name]').inputValue(),'Fixture');assert.ok(await f.locator('button[type=submit]').isEnabled());
}
// Exercise all pilot links with the served HTML and a real trusted click.
await c.addInitScript(() => {
  Object.defineProperty(navigator,'webdriver',{get:()=>false});
  window.addEventListener('fleet:business',e=>{
    if(e.detail?.name==='catalog_task_open') sessionStorage.setItem('tested-task',e.detail.name);
  });
});
for (const prefix of ['', '/en']) {
  for (const slug of ['chatgpt','kimi','qingying']) {
    const path=prefix+'/tools/'+slug;
    await p.goto('https://baipiaoji.com'+path);
    await p.evaluate(()=>sessionStorage.removeItem('tested-task'));
    const target=slug==='kimi' && !prefix ? path+'#kimi-task' : prefix+'/studio/'+(slug==='qingying'?'video-variants':'pdf-tools');
    const beacon=p.waitForRequest(r=>r.url().endsWith('/api/hit') && r.postData()?.includes('"e":"catalog_task"'));
    await p.locator('a[data-catalog-task]').click();
    assert.equal((await beacon).postDataJSON().p, '/catalog-task/'+slug);
    await p.waitForURL('https://baipiaoji.com'+target);
    assert.equal(await p.evaluate(()=>sessionStorage.getItem('tested-task')),'catalog_task_open');
  }
}
console.log('PASS six localized task links, destination navigation and fixed intent signals');
console.log('PASS bilingual rate-limit recovery: wait message, input preserved, retry enabled; all network intercepted');
}finally{await b.close();}
