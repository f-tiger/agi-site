// All requests are intercepted locally. No production event or social post is sent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {onRequestPost} from '../functions/api/growth.js';

const {chromium}=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url))('playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const origin='https://baipiaoji.com';
const pagePath='/en/tools/google-ai-studio';
const tags='?utm_campaign=bpj-quota-clarity-01&utm_source=github';
const sql=new DatabaseSync(':memory:');
const HITS={prepare(query){
  let args=[];
  return {bind(...values){args=values;return this;},
    async run(){return sql.prepare(query).run(...args);},
    async all(){return {results:sql.prepare(query).all(...args)};}};
}};
const totals=()=>sql.prepare('SELECT COUNT(*) arrivals, COALESCE(SUM(qualified),0) qualified, COALESCE(SUM(acted),0) acted FROM bpj_growth_sessions').get();
const snapshot=()=>({...totals()});
let browser,failedStarts=0,posts=0;
const errors=[];
const context=async ({privacy=false,storageBlocked=false}={})=>{
  const ctx=await browser.newContext({userAgent:'Mozilla/5.0 Chrome/130 Safari/537.36',extraHTTPHeaders:privacy?{DNT:'1'}:{}});
  // Exercise the real user path in an isolated browser; production webdriver stays excluded.
  await ctx.addInitScript(({privacy,storageBlocked})=>{
    Object.defineProperty(navigator,'webdriver',{get:()=>false,configurable:true});
    if(privacy)Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
    if(storageBlocked)Object.defineProperty(window,'sessionStorage',{get:()=>{throw Error('blocked');}});
  },{privacy,storageBlocked});
  await ctx.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!==origin){
      const document=req.resourceType()==='document';
      return route.fulfill({status:200,contentType:document?'text/html':'text/javascript',body:document?'<!doctype html><title>Isolated destination</title>':''});
    }
    if(url.pathname==='/api/growth'){
      posts++;
      const body=req.postData();
      if(JSON.parse(body).kind==='arrival' && failedStarts>0){failedStarts--;return route.fulfill({status:503,json:{ok:false}});}
      const response=await onRequestPost({request:new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),body}),env:{HITS}});
      return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
    }
    if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,user:null,favorites:[]}});
    let rel=url.pathname;
    if(rel.endsWith('/'))rel+='index.html';else if(!path.extname(rel))rel+='.html';
    const file=path.resolve(root,'.'+rel);
    if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:'Not found'});
    return route.fulfill({status:200,contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  return ctx;
};
const waitFor=async (predicate,label)=>{
  const deadline=Date.now()+16000;
  while(Date.now()<deadline){if(predicate())return;await new Promise(r=>setTimeout(r,100));}
  assert.fail(label+' '+JSON.stringify(snapshot()));
};
const clickOfficial=async page=>{
  const popup=page.waitForEvent('popup');
  await page.locator('a[data-tool="google-ai-studio"][data-place="tool_top"]').click();
  await (await popup).close();
};
try{
  browser=await chromium.launch({headless:true,...(process.env.PILOT_CHROMIUM?{executablePath:process.env.PILOT_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']}: {})});
  const ctx=await context(),page=await ctx.newPage();
  await page.goto(origin+pagePath+tags,{referer:'https://github.com/example/campaign'});
  await waitFor(()=>{try{return totals().arrivals===1}catch{return false;}},'arrival recorded');
  // Scripted clicks are not useful actions. Real active reading qualifies once.
  await page.locator('a[data-tool="google-ai-studio"]').first().evaluate(a=>a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
  assert.equal(totals().acted,0);
  await waitFor(()=>totals().qualified===1,'foreground reading qualifies');
  await clickOfficial(page);
  await waitFor(()=>totals().acted===1,'trusted official click qualifies');
  const nonce=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('bpj-growth-v1')).sid);
  await page.reload();
  await clickOfficial(page);
  await page.goto(origin+'/en/how-much-has-gemini-free-tier-been-cut'+tags);
  await page.waitForLoadState('networkidle');
  assert.deepEqual(snapshot(),{arrivals:1,qualified:1,acted:1},'reload and second eligible page deduplicated');
  assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('bpj-growth-v1')).sid),nonce);
  await page.evaluate(()=>{const s=JSON.parse(sessionStorage.getItem('bpj-growth-v1'));s.started-=1801000;sessionStorage.setItem('bpj-growth-v1',JSON.stringify(s));});
  await page.reload();
  await waitFor(()=>totals().arrivals===2,'expired tab gets a new interval');
  assert.notEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('bpj-growth-v1')).sid),nonce);
  await ctx.close();
  const before=snapshot(),postCount=posts;
  for(const [suffix,options] of [[tags+'&qa=1',{}],[tags+'&__ci=1',{}],['',{}],[tags,{privacy:true}]]){
    const c=await context(options),p=await c.newPage();await p.goto(origin+pagePath+suffix);await p.waitForLoadState('networkidle');await c.close();
  }
  const excluded=await context(),p=await excluded.newPage();
  for(const slug of ['fireworks','pixverse','suno','kling']){await p.goto(origin+'/en/tools/'+slug+tags);assert.equal(await p.locator('script[data-bpj-growth]').count(),0);}
  await excluded.close();
  assert.deepEqual(snapshot(),before,'privacy/QA/untagged/search cohorts add nothing');
  assert.equal(posts,postCount);
  // Retry a failed initial request on the useful action; no silently missing arrival.
  failedStarts=1;
  const recovery=await context(),r=await recovery.newPage();
  await r.goto(origin+pagePath+tags);await r.waitForLoadState('networkidle');
  assert.equal(totals().arrivals,before.arrivals);
  await clickOfficial(r);
  await waitFor(()=>totals().acted===before.acted+1,'failed arrival recovers on action');
  assert.equal(totals().arrivals,before.arrivals+1);
  await recovery.close();
  const blocked=await context({storageBlocked:true}),b=await blocked.newPage();
  await b.goto(origin+pagePath+tags);await clickOfficial(b);
  await waitFor(()=>totals().acted===before.acted+2,'blocked storage does not break navigation');
  await blocked.close();
  assert.deepEqual(errors,[]);
  console.log('PASS real browser + SQLite: scoped campaign, active reading, trusted action, reload/page dedupe, expiry, QA/privacy exclusions, failed-arrival retry and blocked storage. All network isolated.');
}finally{await browser?.close();sql.close();}
