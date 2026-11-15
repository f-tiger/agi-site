// Local final-artifact journeys. Every request is intercepted; no analytics/merchant traffic.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {availability} from '../site/assets/filter-care-core.mjs';
const requireTools=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url));
const {chromium}=requireTools('playwright');
const root=path.resolve(new URL('../site/',import.meta.url).pathname),origin='https://getecoback.com';
const route='/ersatzfilter.html',key='ecoback.filter-care.de.v1';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||process.env.PILOT_CHROMIUM});
const contentTypes={'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
async function context(options={},modify=x=>x){
  const c=await browser.newContext({viewport:{width:390,height:844},...options});
  await c.route('**/*',async request=>{
    const u=new URL(request.request().url());
    if(u.origin!==origin)return request.abort();
    const file=path.resolve(root,'.'+decodeURIComponent(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return request.fulfill({status:404,body:''});
    let body=fs.readFileSync(file);if(u.pathname===route)body=Buffer.from(modify(body.toString()));
    return request.fulfill({status:200,contentType:contentTypes[path.extname(file)]||'text/plain',body});
  });
  return c;
}
try{
  const c=await context(),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(origin+'/produkte.html?__qa=1#produkt-beurer-lr401');
  await p.locator('#produkt-beurer-lr401 a[href="/ersatzfilter.html#beurer-lr401"]').click();
  await p.locator('#model-result .filter-name').waitFor();
  assert.match(await p.locator('#model-result').innerText(),/69309/);
  const current=await p.locator('#filter-care-data').textContent();
  if(availability(JSON.parse(current).items.find(i=>i.id==='beurer-lr401')).active){
    const href=await p.locator('.affiliate-link').getAttribute('href');
    assert.equal(new URL(href).hostname,'www.amazon.de');assert.equal(new URL(href).searchParams.get('tag'),'getecoback-21');
  }else{assert.equal(await p.locator('.affiliate-link').count(),0);assert.equal(await p.locator('.source-link').count(),1);}
  assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Mobile viewport overflow');
  await p.locator('[name=action]').selectOption('checked');await p.locator('[name=date]').fill('2026-11-14');
  await p.getByRole('button',{name:'Pflegenotiz speichern',exact:true}).click();
  assert.match(await p.locator('#save-status').innerText(),/gespeichert/);
  await p.reload();await p.locator('#model-result .filter-name').waitFor();
  assert.equal(await p.locator('[name=date]').inputValue(),'2026-11-14');
  await p.locator('[name=action]').selectOption('cleaned');await p.locator('[name=date]').fill('2026-11-15');
  await p.getByRole('button',{name:'Pflegenotiz speichern',exact:true}).click();
  assert.match(await p.locator('.care-form [role=status]').innerText(),/Gereinigt am 2026-11-15/);
  await p.locator('[name=date]').fill('2099-01-01');await p.getByRole('button',{name:'Pflegenotiz speichern',exact:true}).click();
  assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).entries['beurer-lr401'].care.date,key),'2026-11-15');
  await p.getByRole('button',{name:'Nur Notiz löschen',exact:true}).click();
  assert.equal(await p.locator('[name=date]').inputValue(),'');
  await p.getByRole('button',{name:'Modell und Notiz löschen',exact:true}).click();
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),null);
  await p.locator('#model-search').fill('Core 300S Pro');
  assert.equal(await p.locator('.affiliate-link').count(),0);
  assert.match(await p.locator('#search-status').innerText(),/nicht dokumentiert/);
  await p.locator('#model-search').fill('Core 300S');await p.getByRole('button',{name:'Levoit Core 300S',exact:true}).click();
  assert.match(await p.locator('.filter-name').innerText(),/Standard/);
  if(process.env.ECO_CARE_SCREENSHOT){await p.screenshot({path:process.env.ECO_CARE_SCREENSHOT,fullPage:true});}
  assert.deepEqual(errors,[]);await c.close();
  const blocked=await context();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});
  const b=await blocked.newPage();await b.goto(origin+route+'?__qa=1#beurer-lr401');await b.locator('.filter-name').waitFor();
  await b.getByRole('button',{name:'Modell merken',exact:true}).click();
  assert.match(await b.locator('#save-status').innerText(),/nur im geöffneten Tab/);await blocked.close();
  for(const status of ['unavailable','conflict']){
    const stale=await context({},html=>html.replace(/"status": "verified"/g,`"status": "${status}"`));
    const s=await stale.newPage();await s.goto(origin+route+'?__qa=1#beurer-lr401');await s.locator('.filter-name').waitFor();
    assert.equal(await s.locator('.affiliate-link').count(),0);assert.equal(await s.locator('.source-link').count(),1);await stale.close();
  }
  const nojs=await context({javaScriptEnabled:false}),n=await nojs.newPage();await n.goto(origin+route+'?__qa=1');
  assert.equal(await n.locator('#model-table tbody tr').count(),2);
  assert.equal(await n.locator('a[href^="https://www.amazon."]').count(),0);
  assert.match(await n.locator('noscript').innerText(),/Herstellerzuordnungen/);await nojs.close();
  const html=fs.readFileSync(path.join(root,route),'utf8'),md=fs.readFileSync(path.join(root,'ersatzfilter.md'),'utf8');
  assert(html.includes('data-ga4-id="G-E2V0Q9SJ9V"'));assert(html.includes('/auth/account'));
  assert(md.includes('69309')&&md.includes('https://www.beurer.com/de/p/69309/'));
  assert(!md.includes('getecoback-21')&&!md.includes('amazon.de/s'));
  for(const name of ['search-index.json','mcp-guides.json','llms.txt','llms-full.txt','sitemap.xml','tools.html'])assert(fs.readFileSync(path.join(root,name),'utf8').includes(route),`Missing discovery: ${name}`);
  console.log('German filter care: mobile, catalog handoff, model limits, DE merchant, save/edit/reload/delete, storage failure, source withdrawal, no-JS and discovery passed.');
}finally{await browser.close();}
