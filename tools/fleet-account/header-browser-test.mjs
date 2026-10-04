import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {shellHeader} from '../../sites/baipiaoji/scripts/site-shell.mjs';
import {navScript} from './nav.mjs';
import {headerTools,headerCSS,accountCopy} from './header.mjs';
const {chromium}=createRequire(new URL('../revenue-studio/package.json',import.meta.url))('playwright');
const browser=await chromium.launch({...(process.env.PILOT_CHROMIUM?{executablePath:process.env.PILOT_CHROMIUM}:{}),headless:true,args:['--no-sandbox']});
try{
 for(const kind of ['bpj','fleet'])for(const lang of (kind==='bpj'?['zh','en']:Object.keys(accountCopy))){
  let user=null,failed=false;const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const css=readFileSync(new URL('../../sites/baipiaoji/assets/site-shell.css',import.meta.url),'utf8');
  const header=kind==='bpj'?shellHeader({lang}):`<header class="fleet-site-header" data-fleet-header="test"><a href="/">Site</a>${headerTools({lang,alternates:[{lang:lang==='en'?'zh':'en',href:lang==='en'?'/zh/':'/en/'}],languageLinks:[],entries:[],nativeLanguage:false},new URL('https://baipiaoji.com/'))}</header>`;
  const script=kind==='bpj'?readFileSync(new URL('../../sites/baipiaoji/assets/account.js',import.meta.url),'utf8'):navScript;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.startsWith('/api/')||path==='/auth/status')return route.fulfill({status:failed?503:200,contentType:'application/json',body:JSON.stringify(failed?{ok:false,error:'unavailable'}:{ok:true,user,favorites:[]})});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>*{box-sizing:border-box}body{margin:0}${css}${headerCSS}</style></head><body>${header}<script>${script}</script></body></html>`});
  });
  await page.goto('https://baipiaoji.com/');const a=page.locator(kind==='bpj'?'.bpj-header-end>.bpj-account':'.fleet-account-entry a');
  await a.filter({hasText:kind==='bpj'?(lang==='zh'?/注册/:/Join/):accountCopy[lang][0]}).waitFor();
  if(kind==='bpj')await page.waitForFunction(()=>window.bpjAccount?.state.loaded);
  const refresh=async()=>{if(kind==='bpj')await page.evaluate(()=>window.bpjAccount.refresh());else await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));};
  user={id:'synthetic',username:'测试用户VeryLongDisplayName123456',email:'never-display@example.invalid'};await refresh();
  await page.waitForFunction(()=>document.querySelector('.bpj-account,.fleet-account-entry a').textContent.startsWith('✓'));
  assert.equal(await a.textContent(),'✓ '+user.username);assert(!(await a.textContent()).includes('@'));
  if(kind==='bpj'){assert.equal(await page.locator('.bpj-login').isVisible(),false);assert((await a.boundingBox()).width<=106);await page.screenshot({path:'/tmp/bpj-header-signed-in.png'});await page.setViewportSize({width:320,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Header must fit narrow mobile');}
  user=null;await refresh();await a.filter({hasText:kind==='bpj'?(lang==='zh'?/注册/:/Join/):accountCopy[lang][0]}).waitFor();
  failed=true;await refresh().catch(()=>{});await a.filter({hasText:kind==='bpj'?(lang==='zh'?/^账户$/:/^Account$/):accountCopy[lang][1]}).waitFor();
  if(kind==='fleet'){await page.setViewportSize({width:320,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.fleet-language summary').click();assert(await page.locator('.fleet-language-panel').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('.fleet-language-panel').isVisible(),false);assert.equal(await page.locator('header .fleet-account-entry').count(),1);}
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length),0);await context.close();
 }
 console.log('PASS BPJ/fleet headers EN/ZH: real state transitions, name, logout, unknown service state, mobile truncation, no persisted identity.');
}finally{await browser.close();}
