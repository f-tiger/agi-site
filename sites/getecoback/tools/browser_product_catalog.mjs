// Final-artifact checks; all requests resolve to local files, never to a merchant.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {WINDOW_ENTRY_DOCUMENT, WINDOW_ENTRY_URL} from '../src/fenstersauger-entry.mjs';

const root=path.resolve(process.env.ECO_CATALOG_SITE||new URL('../site/',import.meta.url).pathname);
const data=JSON.parse(fs.readFileSync(new URL('../data/product-catalog.json',import.meta.url),'utf8'));
const portasplitEntry=JSON.parse(fs.readFileSync(new URL('../data/mcp-portasplit-entry.json',import.meta.url),'utf8'));
const n90Entry=JSON.parse(fs.readFileSync(new URL('../data/mcp-n90-entry.json',import.meta.url),'utf8'));
const requireTools=createRequire(new URL('../../../tools/revenue-studio/package.json',import.meta.url));
const {chromium}=requireTools('playwright');
const origin='https://getecoback.com',today=new Date().toISOString().slice(0,10),cases=[];
const day=value=>{const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n/86400000:NaN;};
const expected=data.products.filter(p=>p.status==='verified'&&day(today)-day(p.checked)>=0&&day(today)-day(p.checked)<=90);
for(const route of ['index.html','wohnen.html','tools.html']){const html=fs.readFileSync(path.join(root,route),'utf8');assert(html.includes('data-product-catalog-entry')&&html.includes('href="/produkte.html"'),'Final discovery missing from '+route);}
const executablePath=process.env.CHROMIUM_PATH||process.env.PILOT_CHROMIUM;
const localTools=['luftreiniger','hygrometer','dampfreiniger','fenstersauger','nass-trockensauger','bodenstaubsauger','wasserkocher','heissluftfritteusen','kontaktgrills'];
const reusedTools={ventilatoren:'/guide/stromkosten-rechner.html',heizluefter:'/guide/heizluefter-stromverbrauch.html#eb-heater-cost',waeschetrockner:'/waeschetrockner-oder-luftentfeuchter.html#laundry-check'};
const modelGuides=[
 {href:'#waeschesaeule-zubehoer',queries:['WTZ27400','WTZ-27410','Bosch WQG241001']},
 {href:'/guide/delonghi-pac-n90-test.html#testlage',queries:['PAC N90','PACN90','DeLonghi PAC N90 ECO Silent','8004399512351']},
 {href:'/guide/midea-portasplit-ausverkauft-alternativen.html#fensterfalz',queries:['Midea PortaSplit','Porta Split','Porta-Split','Midea PortaSplit Original','4048164116478']},
];
const otherCoolingModels=['Midea PortaSplit E','Midea PortaSplit Cool','4048164122424','4048164122301','Midea PortaSplit Pro','DeLonghi PAC EX105'];
const windowModels=[
 {id:'kaercher-wv2-multi',model:'Kärcher WV 2 Plus Multi Edition, 1.633-662.0',widths:'280 mm',source:'Kärcher WV 2 Produktseite'},
 {id:'kaercher-wv3-precision',model:'Kärcher WV 3 Comfort Precision+ Black, 1.633-698.0',widths:'170 mm / 280 mm',source:'Kärcher WV 3 Produktseite'},
 {id:'kaercher-wv8-signature',model:'Kärcher WV 8 Signature Line, 1.633-785.0',widths:'170 mm / 280 mm',source:'Kärcher WV 8 Produktseite'},
 {id:'bosch-glassvac-set',model:'Bosch GlassVAC Set, 06008B7000',widths:'133 mm / 266 mm',source:'Bosch GlassVAC Set Produktseite'},
];
const ownCases=[
 {category:'luftreiniger',values:{length:'5',width:'4',height:'2.5',changes:'4'},expect:/200 m³\/h/},
 {category:'hygrometer',values:{readingA:'40',readingB:'55'},expect:/15 Prozentpunkte/},
 {category:'dampfreiniger',values:{approval:'unknown',sensitive:'unknown'},expect:/Unbekannt ist keine Erlaubnis/},
 {category:'fenstersauger',values:{width:'1',height:'2',panes:'3',sides:'2'},expect:/12 m²/},
 {category:'nass-trockensauger',values:{material:'hazard'},expect:/Keinen gewöhnlichen Haushaltssauger/},
 {category:'bodenstaubsauger',values:{},expect:/55 €.*pro Jahr/s},
 {category:'wasserkocher',values:{cups:'2',millilitres:'300',extra:'100'},expect:/0,7 Liter/},
 {category:'heissluftfritteusen',values:{zones:'dual',minutesA:'20',minutesB:'30',temperatureA:'180',temperatureB:'200'},expect:/Zone A nach 10, Zone B nach 0 Minuten/},
 {category:'kontaktgrills',values:{},expect:/freie Breite und Tiefe reichen/},
];
async function resultText(page,category){
 const output=page.locator('#pc-tool-'+category+' [data-category-result]');
 await output.waitFor({state:'visible'});const text=await output.innerText();
 assert.ok(text.trim());assert.doesNotMatch(text,/NaN|Infinity/);return text;
}
async function setValues(form,values){
 for(const [name,value] of Object.entries(values)){
  const input=form.locator('[name="'+name+'"]');
  if(await input.evaluate(n=>n.tagName==='SELECT'))await input.selectOption(value);else await input.fill(value);
 }
}
function localCatalogue(route,onWrite=()=>{}){
 const request=route.request(),url=new URL(request.url());
 if(request.method()!=='GET'){onWrite(request);return route.abort();}
 if(url.origin!==origin)return route.abort();
 if(url.pathname.startsWith('/api/')||url.pathname==='/auth/status')return route.fulfill({contentType:'application/json',body:'{"ok":false,"user":null}'});
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Missing fixture'});
 const contentType={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
 return route.fulfill({contentType,body:fs.readFileSync(file)});
}
function isLegacyWindowJourneyPageView(request){
 if(request.method()!=='POST'||request.url()!==origin+'/api/ev')return false;
 try{
  const event=JSON.parse(request.postData());
  return event.n==='page_view'&&['/guide/fenster-beschlagen-innen.html','/produkte.html'].includes(event.p);
 }catch{return false;}
}
function waitForEvent(page,name){
 return page.waitForRequest(request=>{
  if(request.url()!==origin+'/api/ev'||request.method()!=='POST')return false;
  try{return JSON.parse(request.postData()).n===name;}catch{return false;}
 });
}
async function checkWindowTikTokCampaign(browser){
 const guide='/guide/fenster-beschlagen-innen.html';
 const campaign='?utm_source=tiktok&utm_medium=social&utm_campaign=eco-dach-catalog-01';
 const answer='#fenstersauger-gegen-kondenswasser';
 const product='/produkte.html#fenstersauger-duesenbreite';
 const cases=[];
 for(const mode of ['tagged','untagged','opted-out','probe','dnt','gpc','no-script']){
  const noScript=mode==='no-script';
  const context=await browser.newContext({viewport:{width:390,height:900},javaScriptEnabled:!noScript,serviceWorkers:'block'});
  const events=[];
  await context.route('**/*',route=>localCatalogue(route,request=>{
   if(request.url()===origin+'/api/ev')events.push(JSON.parse(request.postData()));
  }));
  await context.addInitScript(mode=>{
   Object.defineProperty(navigator,'webdriver',{get:()=>false});
   Object.defineProperty(navigator,'doNotTrack',{get:()=>mode==='dnt'?'1':'0'});
   Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>mode==='gpc'});
   if(mode==='opted-out')localStorage.setItem('fleet_ga4_choice_v1','denied');
  },mode);
  const page=await context.newPage();
  const query=mode==='untagged'?'':campaign+(mode==='probe'?'&__probe=1':'');
  const guideView=noScript?null:waitForEvent(page,'page_view');
  await page.goto(origin+guide+query+answer);
  if(guideView){
   const request=await guideView;
   assert.equal(JSON.parse(request.postData()).window_tiktok_entry,mode==='tagged'?true:undefined);
   assert.equal((await request.allHeaders()).referer,origin+guide+query);
  }
  const productView=noScript?null:waitForEvent(page,'page_view');
  const entry=page.locator('[data-window-width-open]');
  assert.equal(await entry.getAttribute('href'),product);
  await entry.click();
  await page.waitForURL(origin+product);
  if(productView){
   const view=JSON.parse((await productView).postData());
   assert.equal(view.r,origin+guide+query,mode+' uses the exact browser referrer without the fragment');
   assert.equal(view.window_tiktok_entry,undefined,'No marked duplicate product-page view');
   const form=page.locator('form[data-window-width-check]');
   await form.waitFor({state:'visible'});
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'eco_window_width_check'}})));
   await setValues(form,{lichte_breite_mm:'170',spiel_pro_seite_mm:'5',vorhandene_duese_mm:''});
   const completion=mode==='tagged'?waitForEvent(page,'eco_window_width_check'):null;
   await form.locator('[type=submit]').click();
   if(completion){
    const request=await completion;
    assert.deepEqual(JSON.parse(request.postData()),{
     n:'eco_window_width_check',p:'/produkte.html',r:origin+guide+campaign,m:null,window_tiktok_entry:true,
    });
    assert.equal((await request.allHeaders()).referer,origin+'/produkte.html');
   }
   await form.locator('[type=submit]').click();
   if((mode==='tagged'||mode==='untagged')&&expected.some(item=>item.id==='bosch-glassvac-set')){
    await page.locator('a[href="#produkt-bosch-glassvac-set"]').first().click();
    const merchant=waitForEvent(page,'affiliate_click');
    await page.locator('#produkt-bosch-glassvac-set a[rel~=sponsored]').click();
    const request=await merchant;
    assert.equal(JSON.parse(request.postData()).window_tiktok_entry,mode==='tagged'?true:undefined);
    assert.equal((await request.allHeaders()).referer,origin+'/produkte.html');
   }
   await page.waitForTimeout(100);
   assert.equal(events.filter(event=>event.n==='eco_window_width_check').length,mode==='tagged'?1:0);
   assert.equal(events.filter(event=>event.n==='page_view').length,2);
  }else{
   assert(await page.getByRole('region',{name:'Düsenbreiten der deutschen Fenstersauger-Pakete'}).isVisible());
   assert.deepEqual(events,[]);
  }
  cases.push({mode,view:events.some(event=>event.n==='page_view'&&event.window_tiktok_entry===true),
   completion:events.some(event=>event.n==='eco_window_width_check'&&event.window_tiktok_entry===true),
   merchant:events.some(event=>event.n==='affiliate_click'&&event.window_tiktok_entry===true)});
  await context.close();
 }
 return cases;
}
async function checkCellarEntry(browser) {
 const pagePath='/guide/luftentfeuchter-keller.html';
 const modelHash='#modell-meaco-one-20';
 const otherHash='#modell-meaco-one-25';
 const markerQuery='?mcp_entry=keller-pruefpunkt';
 const modelSearch='https://www.amazon.de/s?k=MeacoDry+Arete+One+20L&tag=getecoback-21';
 const otherSearch='https://www.amazon.de/s?k=MeacoDry+Arete+One+25L&tag=getecoback-21';
 const cases=[];
 for(const mode of ['tagged','untagged','wrong-fragment','extra-query','opted-out','probe','other-model','no-script']){
  const noScript=mode==='no-script';
  const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:!noScript,serviceWorkers:'block'});
  const merchants=[];
  let eventRequests=0;
  await context.route('**/*',route=>{
   const request=route.request();
   if(new URL(request.url()).hostname==='www.amazon.de')merchants.push(request.url());
   if(request.url()===origin+'/api/ev'&&request.method()==='POST')eventRequests++;
   return localCatalogue(route);
  });
  if(!noScript)await context.addInitScript(mode=>{
   Object.defineProperty(navigator,'webdriver',{get:()=>mode==='probe'});
   if(mode==='opted-out'&&location.protocol==='https:')localStorage.setItem('fleet_ga4_choice_v1','denied');
  },mode);

  const page=await context.newPage();
  const query=mode==='untagged'?'':mode==='extra-query'?markerQuery+'&extra=1':markerQuery;
  const documentURL=origin+pagePath+query;
  const arrivalURL=documentURL+(mode==='wrong-fragment'?otherHash:modelHash);
  const isTagged=['tagged','other-model'].includes(mode);
  const view=noScript?null:waitForEvent(page,'page_view');
  await page.goto(arrivalURL);
  const firstModel=page.locator('.dc-card').filter({has:page.locator(modelHash)});
  if(noScript){
   const visibleHeading=await page.locator(modelHash).evaluate(heading=>{
    const box=heading.getBoundingClientRect();
    const nav=document.querySelector('.eb-nav').getBoundingClientRect();
    return box.top>=nav.bottom && box.bottom<=window.innerHeight;
   });
   assert(visibleHeading,'Mobile arrival hides the selected model behind navigation');
  }
  assert(await firstModel.locator('a[rel~=sponsored]').isVisible(),mode);
  assert.equal(await firstModel.locator('a[rel~=sponsored]').getAttribute('href'),modelSearch,mode);
  if(view){
   const request=await view;
   assert.equal(JSON.parse(request.postData()).mcp_cellar_entry,isTagged?true:undefined,mode+' arrival');
   assert.equal((await request.allHeaders()).referer,documentURL);
  }
  // Move within the same document to test the original entry fragment, not the current one.
  const destination=mode==='wrong-fragment'?modelHash:otherHash;
  await page.locator('#eb-models a[href="'+destination+'"]').first().click();
  await page.waitForURL(documentURL+destination);
  const merchantCard=mode==='other-model'?page.locator('.dc-card').filter({has:page.locator(otherHash)}):firstModel;
  const click=noScript?null:waitForEvent(page,'affiliate_click');
  const expectedMerchant=mode==='other-model'?otherSearch:modelSearch;
  const outgoing=context.waitForEvent('requestfailed',{predicate:request=>request.url()===expectedMerchant,timeout:10000});
  await merchantCard.locator('a[rel~=sponsored]').click();
  await outgoing;
  if(click){
   const request=await click,body=JSON.parse(request.postData());
   assert.equal(body.mcp_cellar_entry,mode==='tagged'?true:undefined,mode+' merchant click');
   assert.equal(body.m.link_url,expectedMerchant);
   assert.equal((await request.allHeaders()).referer,documentURL);
  }else{
   assert.equal(eventRequests,0,'No-script navigation emitted an event');
  }
  assert.deepEqual(merchants,[expectedMerchant],mode+' merchant intercepted');
  cases.push({mode,markedArrival:isTagged,markedClick:mode==='tagged',intercepted:merchants.length});
  await context.close();
 }
 return cases;
}

async function checkN90Entry(browser) {
 const cases=[];
 const otherModel='https://www.amazon.de/s?k=AEG+ChillFlex+Pro&tag=getecoback-21';
 for(const mode of ['tagged','other-model','untagged','wrong-fragment','extra-query','opted-out','revoked','dnt','gpc','webdriver','no-script']){
  const noScript=mode==='no-script';
  const context=await browser.newContext({viewport:{width:noScript?320:390,height:844},javaScriptEnabled:!noScript,serviceWorkers:'block'});
  const merchants=[];
  let eventRequests=0;
  await context.route('**/*',route=>{
   const request=route.request();
   if(new URL(request.url()).hostname==='www.amazon.de')merchants.push(request.url());
   if(request.url()===origin+'/api/ev'&&request.method()==='POST')eventRequests++;
   return localCatalogue(route);
  });
  await context.addInitScript(mode=>{
   Object.defineProperty(navigator,'webdriver',{get:()=>mode==='webdriver'});
   Object.defineProperty(navigator,'doNotTrack',{get:()=>mode==='dnt'?'1':null});
   Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>mode==='gpc'});
   if(mode==='opted-out')localStorage.setItem('fleet_ga4_choice_v1','denied');
  },mode);
  const page=await context.newPage();
  const documentURL=origin+n90Entry.page+(mode==='untagged'?'':n90Entry.query)+(mode==='extra-query'?'&extra=1':'');
  const initialFragment=mode==='wrong-fragment'?'#alternativen':n90Entry.fragment;
  const arrival=noScript?null:waitForEvent(page,'page_view');
  await page.goto(documentURL+initialFragment);
  assert.equal(await page.locator(n90Entry.fragment).count(),1);
  if(arrival){
   const request=await arrival,body=JSON.parse(request.postData());
   const marked=['tagged','other-model','revoked'].includes(mode);
   assert.equal(body.mcp_n90_entry,marked?true:undefined,mode+' arrival');
   assert.equal(body.p,n90Entry.page);
   assert.equal((await request.allHeaders()).referer,documentURL);
   assert.ok(!JSON.stringify(body).includes('mcp_entry='),mode+' landing query in payload');
  }
  if(mode==='tagged'){
   const unrelated=waitForEvent(page,'guide_action');
   await page.evaluate(()=>window.ebSend('guide_action'));
   assert.equal(JSON.parse((await unrelated).postData()).mcp_n90_entry,undefined);
  }
  if(mode==='revoked')await page.evaluate(()=>localStorage.setItem('fleet_ga4_choice_v1','denied'));
  const followsCostOffer=mode==='tagged'||noScript;
  const laterFragment=followsCostOffer?'#n90-angebot':mode==='wrong-fragment'?n90Entry.fragment:'#alternativen';
  const offerJump=page.locator('#n90-kosten-kaufcheck a[href="#n90-angebot"]');
  const jump=followsCostOffer?offerJump:page.locator('a[href="'+laterFragment+'"]').first();
  await jump.click();
  await page.waitForURL(documentURL+laterFragment);
  const product=mode==='other-model'?otherModel:n90Entry.product_url;
  const link=mode==='other-model'?page.locator('table a[href="'+otherModel+'"]'):page.locator('.cta-box a[href="'+product+'"]');
  assert.equal(await link.count(),1);
  const click=noScript?null:waitForEvent(page,'affiliate_click');
  const merchant=context.waitForEvent('requestfailed',{predicate:request=>request.url()===product,timeout:10000});
  await link.click();
  await merchant;
  if(click){
   const request=await click,body=JSON.parse(request.postData());
   assert.equal(body.mcp_n90_entry,mode==='tagged'?true:undefined,mode+' click');
   assert.equal(body.p,n90Entry.page);
   assert.equal(body.m.link_url,product);
   assert.equal((await request.allHeaders()).referer,documentURL);
   assert.ok(!JSON.stringify(body).includes('mcp_entry='),mode+' click query in payload');
  }else{
   assert.equal(eventRequests,0,'N90 no-script emitted a beacon');
  }
  assert.deepEqual(merchants,[product]);
  cases.push(mode);
  await context.close();
 }
 return cases;
}

async function checkWindowWidthJourney(page,javaScriptEnabled){
 const guide='/guide/fenster-beschlagen-innen.html#fenstersauger-gegen-kondenswasser';
 const product='/produkte.html#fenstersauger-duesenbreite';
 const bosch='#produkt-bosch-glassvac-set';
 assert.equal((await page.goto(origin+guide)).status(),200);
 const entry=page.locator('[data-window-width-open]');
 assert.equal(await entry.getAttribute('href'),product,'The editorial guide links to the untracked width comparison');
 await entry.focus();
 await page.keyboard.press('Enter');
 await page.waitForURL(origin+product);
 const form=page.locator('form[data-window-width-check]');
 const status=page.locator('[data-window-width-status]');
 const options=page.locator('[data-window-width-options] a:visible');
 const table=page.getByRole('region',{name:'Düsenbreiten der deutschen Fenstersauger-Pakete'});
 assert(await table.isVisible(),'The static manufacturer width table stays available');
 assert.equal(await table.locator('tbody tr').count(),4);
 assert.equal(await table.getByRole('link',{name:'Bosch GlassVAC Set Produktseite',exact:true}).getAttribute('href'),data.products.find(p=>p.id==='bosch-glassvac-set').source);

 if(!javaScriptEnabled){
  assert(await form.isHidden(),'Without JavaScript the width form cannot send missing inputs');
  assert.equal(await options.count(),0);
  return {staticFallback:true,cleanEntry:true};
 }

 await form.waitFor({state:'visible'});
 assert.equal(await status.getAttribute('role'),'status','The result is announced as a status');
 const purchase=form.locator('[name=kauf_geplant]');
 const submit=form.locator('[type=submit]');
 const expectResult=async(state,modelLinks)=>{
  await submit.click();
  await page.waitForFunction(expected=>document.querySelector('[data-window-width-status]')?.dataset.state===expected,state);
  assert(await status.isVisible(),state+' result visible');
  assert.deepEqual(await options.evaluateAll(links=>links.map(link=>link.getAttribute('href'))),modelLinks,state+' model references');
  assert.equal(page.url(),origin+product,'The calculation does not navigate or put measurements into the URL');
 };

 await setValues(form,{lichte_breite_mm:'170',spiel_pro_seite_mm:'5',vorhandene_duese_mm:''});
 assert.equal(await purchase.isChecked(),false,'Comparing products starts as an explicit choice');
 await expectResult('kein_kauf',[]);
 await purchase.check();
 await expectResult('vergleich',[bosch]);
 assert.match(await status.innerText(),/160[\s\u00a0]*mm/);
 assert.match(await options.first().locator('..').innerText(),/133[\s\u00a0]*mm/);

 await setValues(form,{vorhandene_duese_mm:'133'});
 assert.equal(await options.count(),0,'Changing an input clears the previous product result');
 await expectResult('vorhanden',[]);
 await setValues(form,{lichte_breite_mm:'142',vorhandene_duese_mm:''});
 await expectResult('kein_treffer',[]);

 await setValues(form,{lichte_breite_mm:'143.7',spiel_pro_seite_mm:'5.2',vorhandene_duese_mm:'133.3'});
 await expectResult('vorhanden',[]);
 await setValues(form,{lichte_breite_mm:'256.4',spiel_pro_seite_mm:'61.7',vorhandene_duese_mm:''});
 await expectResult('vergleich',[bosch]);
 assert.match(await status.innerText(),/133[\s\u00a0]*mm/);
 await options.first().focus();
 await page.keyboard.press('Enter');
 await page.waitForURL(origin+'/produkte.html'+bosch);
 assert(await page.locator(bosch).isVisible(),'The comparison leads to the precise model card');
 return {cleanEntry:true,results:['kein_kauf','vergleich','vorhanden','kein_treffer'],modelReached:true};
}

async function checkMieleC2Share(page,javaScriptEnabled,width){
 const originalURL=page.url(),canonical=origin+'/produkte.html#miele-staubsaugerbeutel';
 const title='Miele C2: Compact braucht FJM, Complete GN';
 const expectedText=title+'. Wenn nur „C2“ bekannt ist, prüfe zuerst das Typenschild und warte mit der Bestellung.\n\n'+
  'Modelltabelle und Miele-Quellen bei EcoBack (Seite enthält Affiliate-Links):\n'+canonical;
 const share=page.locator('details[data-product-share]');
 const summary=share.locator('summary');
 const answer=page.getByRole('textbox',{name:'Text zum Kopieren'});
 const copy=share.locator('button[data-product-share-copy]');
 const reddit=share.getByRole('link',{name:'Auf Reddit teilen'});
 const status=share.getByRole('status');
 const assertTargetFits=async(target)=>{
  const box=await target.boundingBox();
  assert(box&&box.height>=44&&box.x>=0&&box.x+box.width<=width,'Share controls fit the mobile viewport with a 44 px touch target');
 };
 const assertSelected=async()=>{
  assert.deepEqual(await answer.evaluate(field=>[document.activeElement===field,field.selectionStart,field.selectionEnd]),
   [true,0,expectedText.length],'The full readonly answer is selected for manual copy');
 };
 assert.equal(await summary.textContent(),'C2-Kurzantwort teilen');
 assert.equal(await share.evaluate(node=>node.open),false);
 await assertTargetFits(summary);
 await summary.focus();
 await page.keyboard.press('Enter');
 assert.equal(await share.evaluate(node=>node.open),true);
 assert.equal(await answer.getAttribute('readonly'),'');
 assert.equal(await answer.inputValue(),expectedText);
 const compose=new URL(await reddit.getAttribute('href'));
 assert.equal(compose.origin+compose.pathname,'https://www.reddit.com/submit');
 assert.deepEqual([...compose.searchParams].sort(),[['title',title],['url',canonical]]);
 assert.equal(await reddit.getAttribute('rel'),'noreferrer');
 await assertTargetFits(answer);
 await assertTargetFits(reddit);
 await page.keyboard.press('Tab');
 await page.keyboard.press('Control+a');
 await assertSelected();

 if(javaScriptEnabled){
  await copy.waitFor({state:'visible'});
  await assertTargetFits(copy);
  await page.keyboard.press('Tab');
  assert(await copy.evaluate(button=>document.activeElement===button));
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('[data-product-share] [role="status"]').textContent==='Antwort kopiert.');
  assert.deepEqual(await page.evaluate(()=>window.__catalogClipboard.attempts),[expectedText]);
  await page.evaluate(()=>{window.__catalogClipboard.reject=true;});
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('[data-product-share] [role="status"]').textContent==='Der Text ist markiert. Bitte manuell kopieren.');
  assert(await status.isVisible());
  assert.deepEqual(await page.evaluate(()=>window.__catalogClipboard.attempts),[expectedText,expectedText]);
  await assertSelected();
 }else{
  assert(await copy.isHidden(),'The enhanced copy action stays hidden without JavaScript');
 }

 await summary.focus();
 await page.keyboard.press('Space');
 assert.equal(await share.evaluate(node=>node.open),false);
 assert.equal(page.url(),originalURL,'Opening and copying the answer preserves the current URL');
 return javaScriptEnabled?{keyboard:true,clipboard:true,manualFallback:true}:{keyboard:true,manualSelection:true};
}

async function checkCatalog(browser){
 for(const width of [320,390,1280])for(const javaScriptEnabled of [true,false]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,serviceWorkers:'block',userAgent:'getecoback-ci/1.0 product-catalog',extraHTTPHeaders:{DNT:'1'}});
  const blockedWrites=[],errors=[],shareRequests=[];
  await context.addInitScript(()=>{
   window.__probe=true;window.__catalogToolEvents=[];
   const spy=(...args)=>{if(args[0]==='event'&&args[1]==='tool_complete')window.__catalogToolEvents.push(args);};
   Object.defineProperty(window,'gtag',{configurable:true,get:()=>spy,set(){}});
   Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
  });
  if(width<=390&&javaScriptEnabled){
   await context.addInitScript(()=>{
    const clipboard=window.__catalogClipboard={attempts:[],reject:false};
    Object.defineProperty(navigator,'clipboard',{value:{async writeText(value){
     clipboard.attempts.push(value);
     if(clipboard.reject)throw new Error('Clipboard unavailable');
    }}});
   });
  }
  let checkingShare=false;
  await context.route('**/*',route=>{
   const request=route.request();
   if(checkingShare)shareRequests.push([request.method(),request.url()]);
   return localCatalogue(route,write=>blockedWrites.push(write));
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await page.goto(origin+'/produkte.html?__probe=1',{waitUntil:'load'})).status(),200);
  assert.equal(await page.locator('[data-product-card]').count(),data.products.length);
  assert.equal(await page.locator('.pc-comparison').count(),12);
  assert.equal(await page.locator('.pc-comparison tbody tr').count(),48);
  const vacuumOffers = page.locator('section[aria-labelledby="beutelstaubsauger-angebote"]');
  assert.match(await vacuumOffers.innerText(),/SBD 355-3.*HyClean Pure TU.*SBB 300-3.*HyClean Pure CO.*Typ G/s);
  assert.equal(await vacuumOffers.locator('a[rel~=sponsored]').count(),0);
  const vacuumOfferForm = vacuumOffers.locator('[data-vacuum-offer-form]');
  if (javaScriptEnabled) {
   await vacuumOfferForm.waitFor({state:'visible'});
   const result = vacuumOfferForm.locator('[data-vacuum-offer-result]');
   assert.equal(await result.textContent(),'');
   await setValues(vacuumOfferForm,{s1_geraet:'200',s1_extras:'40',m1_geraet:'230',m1_extras:'15'});
   await vacuumOfferForm.locator('button[type=submit]').click();
   assert.match(await result.innerText(),/240,00\s+€.*245,00\s+€.*5,00\s+€/s);
   await vacuumOfferForm.locator('[name=m1_extras]').fill('');
   await vacuumOfferForm.locator('button[type=submit]').click();
   assert.equal(await result.textContent(),'');
  } else {
   assert(await vacuumOfferForm.isHidden());
   assert.match(await vacuumOffers.innerText(),/240\s*€.*245\s*€.*5\s*€/s);
  }

  const guideLinks=page.locator('[data-specialist-guide] a');
  assert.equal(await guideLinks.count(),9);
  assert.equal(await page.locator('[data-specialist-guide]:visible').count(),9);
  const exactModelLinks=page.locator('[data-specialist-guide][data-exact-guide-terms] a');
  assert.equal(await exactModelLinks.count(),modelGuides.length);
  for(const {href} of modelGuides)assert(await exactModelLinks.and(page.locator('a[href="'+href+'"]')).isVisible(),href);
  const humidifierLink=guideLinks.filter({hasText:/^Luftbefeuchter$/i});
  assert.equal(await humidifierLink.count(),1);
  const humidifierPath=await humidifierLink.getAttribute('href');
  assert.equal(humidifierPath,'/guide/luftbefeuchter-ratgeber.html#modelle-vergleichen');
  assert.equal(await page.locator('[data-product-category]').count(),data.categories.length);
  assert.equal(await page.locator('[data-product-card] a[href*="amazon.de"]').count(),expected.length);
  for(const product of data.products){
   const card=page.locator('#produkt-'+product.id);assert.equal(await card.count(),1);
   const eligible=expected.some(p=>p.id===product.id),merchant=card.locator('a[href*="amazon.de"]');
   assert.equal(await merchant.count(),eligible?1:0);
   if(eligible){const url=new URL(await merchant.getAttribute('href'));assert.equal(url.hostname,'www.amazon.de');assert.equal(url.pathname,'/s');assert.equal(url.searchParams.get('k'),product.query);assert.equal(url.searchParams.get('tag'),'getecoback-21');assert.match(await merchant.getAttribute('rel'),/sponsored/);}
   assert(await card.locator('a[href="'+product.source+'"]').count());
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(WINDOW_ENTRY_URL);
  const paneHeading=page.locator('#fenstersauger-duesenbreite');
  const paneBox=await paneHeading.boundingBox();
  const fixedNav=await page.locator('nav.eb-nav').boundingBox();
  assert.ok(paneBox&&paneBox.y>=(fixedNav?fixedNav.y+fixedNav.height:0)&&paneBox.y<450,'Width answer hidden below navigation');
  assert.equal(await page.locator('head link[rel=canonical]').getAttribute('href'),origin+'/produkte.html');
  const windowTable=page.getByRole('region',{name:'Düsenbreiten der deutschen Fenstersauger-Pakete'});
  const windowRows=windowTable.locator('tbody tr');
  assert.equal(await windowRows.count(),4);
  assert.equal(await windowTable.getAttribute('tabindex'),'0');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const {id,model,widths,source} of windowModels){
   const target='#produkt-'+id;
   const row=windowRows.filter({has:page.getByRole('link',{name:model,exact:true})});
   const modelLink=row.getByRole('rowheader').getByRole('link',{name:model,exact:true});
   assert.equal(await modelLink.getAttribute('href'),target);
   assert.equal(await row.getByRole('cell',{name:widths,exact:true}).count(),1);
   assert.equal(await row.getByRole('link',{name:source,exact:true}).getAttribute('href'),data.products.find(p=>p.id===id).source);
   assert.equal(await page.locator(`#fenstersauger-belege a[href="${target}"]`).count(),1);
   await modelLink.click();
   await page.waitForURL(WINDOW_ENTRY_DOCUMENT+target);
   const card=page.locator(target);
   assert.ok(await card.isVisible());
   const cardBox=await card.boundingBox();
   assert.ok(cardBox&&cardBox.y>=(fixedNav?fixedNav.y+fixedNav.height:0)&&cardBox.y<450,'Model card hidden below navigation: '+id);
   await page.goto(WINDOW_ENTRY_URL);
  }
  const writesBeforeWidthJourney=blockedWrites.length;
  const windowWidthJourney=width<=390?await checkWindowWidthJourney(page,javaScriptEnabled):undefined;
  // The older page trackers may attempt page-view beacons. The fixture aborts them too.
  const unexpectedWrites=blockedWrites.slice(writesBeforeWidthJourney).filter(request=>!isLegacyWindowJourneyPageView(request));
  assert.deepEqual(unexpectedWrites.map(request=>[request.method(),request.url()]),[],'The width QA journey must not trigger a business write');
  await page.goto(origin+'/produkte.html?__probe=1');
  if(javaScriptEnabled){
   await page.locator('#product-filters').waitFor({state:'visible'});
   const first=data.categories[0],firstProducts=data.products.filter(p=>p.category===first.id);
   await page.locator('#product-category').selectOption(first.id);
   assert.equal(await page.locator('[data-product-card]:visible').count(),firstProducts.length);
   assert(await page.locator('[data-specialist-guides]').isHidden());
   await page.locator('a[href="#kaufhilfen"]').click();
   await page.locator('[data-specialist-guides]').waitFor({state:'visible'});
   assert.equal(await page.locator('#product-category').inputValue(),'');
   await page.locator('#product-query').fill('__nicht_vorhanden_743_');
   assert.equal(await page.locator('[data-product-card]:visible').count(),0);assert(await page.locator('#product-filter-empty').isVisible());
   assert(await page.locator('[data-specialist-guides]').isHidden());
   for(const [query,id] of Object.entries({
    Fenstersauger:'fenstersauger',Bodenstaubsauger:'bodenstaubsauger',Dampfreiniger:'dampfreiniger',
    Luftreiniger:'luftreiniger','Heißluftfritteuse':'heissluftfritteusen',heissluftfritteuse:'heissluftfritteusen'
   })){
    await page.locator('#product-query').fill(query);
    const count=data.products.filter(p=>p.category===id).length;
    assert.equal(await page.locator('[data-product-card][data-category="'+id+'"]:visible').count(),count,query);
   }
   await page.locator('#product-query').fill('Oskar little');
   assert.equal(await page.locator('[data-product-card]:visible').count(),0);
   assert.equal(await page.locator('[data-specialist-guide]:visible').count(),1);
   assert(await humidifierLink.isVisible());
   assert(await page.locator('#product-filter-empty').isHidden());
   assert.match(await page.locator('#product-filter-status').innerText(),/0 von 48 Modellen.*1 Kaufhilfe\./);
   const accessoryLink=page.locator('[data-specialist-guide] a[href="/guide/luftbefeuchter-ratgeber.html#ersatzteile-zuordnen"]');
   for(const part of ['163141','O-030']){
    await page.locator('#product-query').fill(part);
    assert(await accessoryLink.isVisible());
    assert(await page.locator('#product-filter-empty').isHidden());
   }
   for(const {href,queries} of modelGuides){
    const link=exactModelLinks.and(page.locator('a[href="'+href+'"]'));
    for(const query of queries){
     await page.locator('#product-query').fill(query);
     assert(await link.isVisible(),query+' must reach '+href);
     assert(await page.locator('#product-filter-empty').isHidden(),query);
    }
   }
   for(const query of otherCoolingModels){
    await page.locator('#product-query').fill(query);
    assert.equal(await exactModelLinks.filter({visible:true}).count(),0,query+' names a different model');
   }
   const partResults=page.locator('[data-part-results]');
   for(const [part,target] of Object.entries({
    'GN FJM':'/produkte.html#miele-staubsaugerbeutel',
    '2.633-605.0':'/produkte.html#kaercher-170mm-saugduese',
    'TCZ7033':'/produkte.html#kaffee-wasserfilter',
    'DLSC002':'/produkte.html#kaffee-wasserfilter',
    'TTK 70 HEPA':'/guide/trotec-luftentfeuchter-test.html#ttk70-hepa-filter',
    '69309':'/ersatzfilter.html#finder',
   })){
    await page.locator('#product-query').fill(part);
    assert(await partResults.isVisible(),part);
    const hrefs=await partResults.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    assert.deepEqual(hrefs.map(href=>href.startsWith('#')?'/produkte.html'+href:href),[target],part);
    assert(await page.locator('#product-filter-empty').isHidden(),part);
   }
   await page.locator('#product-category').selectOption('fenstersauger');
   await page.locator('#product-query').fill('2.633-605.0');
   assert(await partResults.getByRole('link',{name:'Kärcher-Saugdüse 170 mm'}).isVisible());
   await page.locator('#product-filters button[type=reset]').click();
   assert(await partResults.isHidden());
   assert.equal(await page.locator('[data-product-card]:visible').count(),data.products.length);
   assert.equal(await page.locator('[data-specialist-guide]:visible').count(),9);
   const example=data.products[0];await page.locator('#product-query').fill(example.name);
   assert(await page.locator('#produkt-'+example.id).isVisible());
   await page.locator('#product-filters button[type=reset]').click();
  }else{assert(await page.locator('#product-filters').isHidden());assert.equal(await page.locator('[data-product-card]:visible').count(),data.products.length);}
  const shortcuts=page.locator('#ersatzteile-pruefen');
  assert(await shortcuts.isVisible());
  assert.equal(await shortcuts.getByRole('link').count(),5);
  const bagGuide=shortcuts.getByRole('link',{name:'Miele-Staubsaugerbeutel'});
  await bagGuide.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(origin+'/produkte.html?__probe=1#miele-staubsaugerbeutel');
  assert(await page.locator('#miele-staubsaugerbeutel').isVisible());
  checkingShare=true;
  const mieleC2Share=width<=390?await checkMieleC2Share(page,javaScriptEnabled,width):undefined;
  checkingShare=false;
  assert.deepEqual(shareRequests,[],'Opening, copying, and selecting the answer make no requests');
  await page.goto(origin+'/produkte.html?__probe=1');
  // Follow an actual buying-guide result by keyboard in both script modes.
  await humidifierLink.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(origin+humidifierPath);
  assert(await page.locator('#modelle-vergleichen').isVisible());
  await page.goto(origin+'/produkte.html?__probe=1');
  if(javaScriptEnabled)await page.locator('#product-filters').waitFor({state:'visible'});
  // Static reading routes and fragment history must work on final built files.
  const firstGroup=data.categories[0],secondGroup=data.categories[1];
  assert.equal(await page.locator('.pc-buyer-routes').count(),data.categories.length);
  await page.locator('#kategorie-'+firstGroup.id+' .pc-buyer-routes a').first().click();
  await page.waitForTimeout(700);
  const modelHeading=page.locator('#modelle-'+firstGroup.id),headingBox=await modelHeading.boundingBox();
  const navBox=await page.locator('nav.eb-nav').boundingBox();
  assert(headingBox&&headingBox.y>=(navBox?navBox.y+navBox.height:0)+8&&headingBox.y<450,'Comparison heading obscured');
  if(javaScriptEnabled){
   await page.locator('[data-category-link="'+firstGroup.id+'"]').click();
   await page.locator('[data-category-link="'+secondGroup.id+'"]').click();
   await page.goBack();
   await page.waitForFunction(id=>document.querySelector('#product-category').value===id,firstGroup.id);
   assert.equal(await page.locator('[data-product-card]:visible').count(),data.products.filter(p=>p.category===firstGroup.id).length);
   const target=data.products.find(p=>p.category===secondGroup.id);
   await page.locator('#product-query').fill('__missing__');
   await page.evaluate(id=>location.hash='produkt-'+id,target.id);
   await page.locator('#produkt-'+target.id).waitFor({state:'visible'});
   assert.equal(await page.locator('#product-query').inputValue(),'');
   assert.equal(await page.locator('#product-category').inputValue(),secondGroup.id);
   await page.reload();
   await page.locator('#produkt-'+target.id).waitFor({state:'visible'});
   await page.goto(origin+'/produkte.html?__probe=1#%E0%A4%A');
   await page.reload();
   await page.locator('#product-filters').waitFor({state:'visible'});
   await page.locator('#product-query').fill(data.products[0].name);
   assert(await page.locator('#produkt-'+data.products[0].id).isVisible());
   assert.equal(new URL(page.url()).hash,'','Typed filters never retain a misleading model fragment');
  }
  await page.goto(origin+'/produkte.html?__probe=1');
  if(javaScriptEnabled)await page.locator('#product-filters').waitFor({state:'visible'});
  assert.equal(await page.locator('.pc-tool').count(),13);
  for(const [category,href] of Object.entries(reusedTools)){
   const tool=page.locator('#pc-tool-'+category);assert(await tool.isVisible());
   assert.equal(await tool.locator('a[href="'+href+'"]').count(),1);
   assert.match(await tool.innerText(),/Fiktives Beispiel/);
  }
  let defaultSubmissions=0,independentSubmissions=0,invalidSubmissions=0;
  if(javaScriptEnabled){
   for(const category of localTools){
    const form=page.locator('form[data-category-tool="'+category+'"]'),output=page.locator('#pc-tool-'+category+' [data-category-result]');
    assert(await form.isVisible());assert(await output.isHidden());
    // Required categorical choices have no invented initial approval.
    if(category==='dampfreiniger')await setValues(form,{approval:'unknown',sensitive:'unknown'});
    if(category==='heissluftfritteusen')await setValues(form,{zones:'unknown'});
    if(category==='nass-trockensauger')await setValues(form,{material:'unknown'});
    await form.locator('button[type=submit]').click();await resultText(page,category);defaultSubmissions++;
    await form.locator('button[type=reset]').click();assert(await output.isHidden());assert.equal(await output.innerText(),'');
   }
   for(const spec of ownCases){
    const form=page.locator('form[data-category-tool="'+spec.category+'"]');
    await setValues(form,spec.values);await form.locator('button[type=submit]').click();
    const text=await resultText(page,spec.category);assert.match(text,spec.expect);independentSubmissions++;
    if(spec.category==='dampfreiniger')assert.doesNotMatch(text,/weitere Prüfung nach Anleitung nicht aus/);
    if(spec.category==='luftreiniger'){await form.locator('[name=length]').fill('');assert(await page.locator('#pc-tool-luftreiniger [data-category-result]').isHidden(),'Editing inputs must withdraw an old answer');}
    await form.locator('button[type=reset]').click();
   }
   const air=page.locator('form[data-category-tool="heissluftfritteusen"]');
   await setValues(air,{zones:'single',minutesA:'20',minutesB:'30',temperatureA:'180',temperatureB:'200'});
   await air.locator('button[type=submit]').click();assert.match(await resultText(page,'heissluftfritteusen'),/zusammen: 50 Minuten/);
   await setValues(air,{zones:'unknown'});assert(await page.locator('#pc-tool-heissluftfritteusen [data-category-result]').isHidden());
   await air.locator('button[type=submit]').click();assert.match(await resultText(page,'heissluftfritteusen'),/Keine Zeitberechnung/);
   await air.locator('button[type=reset]').click();await air.locator('button[type=submit]').click();assert.equal(await air.evaluate(n=>n.checkValidity()),false);
   const form=page.locator('form[data-category-tool="luftreiniger"]'),output=page.locator('#pc-tool-luftreiniger [data-category-result]');
   for(const invalid of ['', '101']){
    await form.locator('[name=length]').fill(invalid);
    await form.locator('button[type=submit]').click();
    assert.equal(await form.evaluate(n=>n.checkValidity()),false);assert(await output.isHidden());invalidSubmissions++;
   }
   // A directly dispatched submission must also fail closed if native validation
   // is skipped by another script, without creating a fresh numerical answer.
   await form.evaluate(n=>n.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   assert.match(await resultText(page,'luftreiniger'),/Bitte/);assert.doesNotMatch(await output.innerText(),/Geplantes Raumvolumen/);invalidSubmissions++;
   await form.locator('button[type=reset]').click();
   assert.deepEqual(await page.evaluate(()=>window.__catalogToolEvents),[],'QA must not emit tool_complete');
  }else{
   assert.equal(await page.locator('.pc-tool:visible').count(),13);
   assert.equal(await page.locator('form[data-category-tool]').count(),9);
   assert.equal(await page.locator('form[data-category-tool]:visible').count(),0);
   assert.equal(await page.locator('[data-category-result]:visible').count(),0);
   for(const category of localTools){
    const text=await page.locator('#pc-tool-'+category).innerText();
    assert.match(text,/Rechenweg:/);assert.match(text,/Fiktives Beispiel/);
   }
  }
  const last=data.categories.at(-1);await page.locator('a[data-category-link="'+last.id+'"]').click();
  await page.waitForURL(u=>u.hash==='#kategorie-'+last.id);
  const target=await page.locator('#kategorie-'+last.id).evaluate(n=>({top:n.getBoundingClientRect().top,nav:document.querySelector('.eb-nav')?.getBoundingClientRect().bottom||0}));
  assert(target.top>=target.nav-1,'Category anchor hidden below fixed navigation');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  cases.push({width,javaScriptEnabled,products:data.products.length,categories:data.categories.length,merchantSearches:expected.length,blockedWrites:blockedWrites.length,localTools:9,reusedTools:3,windowModelLinks:windowModels.length,windowWidthJourney,mieleC2Share,defaultSubmissions,independentSubmissions,invalidSubmissions,pass:true});
  await context.close();
 }
 const windowEntryCases=[];
 for(const mode of ['tagged','wrong-fragment','opted-out']){
  const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>localCatalogue(route));
  await context.addInitScript(optedOut=>{
   // Exercise a normal browser's click with all external requests intercepted.
   Object.defineProperty(navigator,'webdriver',{get:()=>false});
   if(optedOut&&location.protocol==='https:')localStorage.setItem('fleet_ga4_choice_v1','denied');
  },mode==='opted-out');
  const page=await context.newPage();
  const entry=mode==='wrong-fragment'?WINDOW_ENTRY_DOCUMENT+'#fenstersauger-belege':WINDOW_ENTRY_URL;
  const view=waitForEvent(page,'page_view');
  await page.goto(entry);
  const first=await view;
  const expectedMarker=mode==='tagged'?true:undefined;
  assert.equal(JSON.parse(first.postData()).mcp_window_entry,expectedMarker);
  assert.equal((await first.allHeaders()).referer,WINDOW_ENTRY_DOCUMENT);
  const modelClickAvailable=expected.some(product=>product.id==='bosch-glassvac-set');
  if(modelClickAvailable){
   await page.locator('#fenstersauger-belege a[href="#produkt-bosch-glassvac-set"]').click();
   const click=waitForEvent(page,'affiliate_click');
   await page.locator('#produkt-bosch-glassvac-set a[rel~=sponsored]').click();
   const request=await click;
   assert.equal(JSON.parse(request.postData()).mcp_window_entry,expectedMarker);
   assert.equal((await request.allHeaders()).referer,WINDOW_ENTRY_DOCUMENT);
  }
  await context.close();
  windowEntryCases.push({mode,modelClickAvailable});
 }
 const portasplitEntryCases=[];
 const portasplitDocument=origin+portasplitEntry.page+portasplitEntry.query;
 for(const mode of ['tagged','wrong-fragment','untagged','opted-out']){
  const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'});
  let blockedMerchant=0;
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).hostname==='www.amazon.de')blockedMerchant++;
   return localCatalogue(route);
  });
  await context.addInitScript(optedOut=>{
   Object.defineProperty(navigator,'webdriver',{get:()=>false});
   if(optedOut&&location.protocol==='https:')localStorage.setItem('fleet_ga4_choice_v1','denied');
  },mode==='opted-out');
  const page=await context.newPage();
  const document=mode==='untagged'?origin+portasplitEntry.page:portasplitDocument;
  const fragment=mode==='wrong-fragment'?'#option-1-clima-butler':portasplitEntry.fragment;
  const view=waitForEvent(page,'page_view');
  await page.goto(document+fragment);
  const arrival=await view;
  const expectedMarker=mode==='tagged'?true:undefined;
  assert.equal(JSON.parse(arrival.postData()).mcp_portasplit_entry,expectedMarker,mode);
  assert.equal((await arrival.allHeaders()).referer,document);

  const secondFragment=mode==='wrong-fragment'?portasplitEntry.fragment:'#option-2-remko';
  await page.locator('nav[aria-label="Inhaltsverzeichnis"] a[href="'+secondFragment+'"]').click();
  await page.waitForURL(url=>url.hash===secondFragment);
  const click=waitForEvent(page,'affiliate_click');
  await page.getByRole('link',{name:'Anzeige: Originale Midea PortaSplit auf Amazon.de prüfen',exact:true}).click();
  const request=await click;
  const payload=JSON.parse(request.postData());
  const merchant=new URL(payload.m.link_url);
  assert.equal(payload.mcp_portasplit_entry,expectedMarker,mode);
  assert.equal((await request.allHeaders()).referer,document);
  assert.equal(merchant.href,portasplitEntry.product_url);
  assert.equal(blockedMerchant,1,mode);
  await context.close();
  portasplitEntryCases.push({mode,marker:expectedMarker??false});
 }
 const cellarEntryCases=await checkCellarEntry(browser);
 return {cases,windowEntryCases,portasplitEntryCases,cellarEntryCases};
}

const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--host-resolver-rules=MAP * ~NOTFOUND']});
try{
 const catalog=process.argv.includes('--n90-entry')?{}:await checkCatalog(browser);
 const n90EntryCases=await checkN90Entry(browser);
 const windowTikTokCampaignCases=process.argv.includes('--n90-entry')?[]:await checkWindowTikTokCampaign(browser);
 console.log(JSON.stringify({pass:true,...catalog,n90EntryCases,windowTikTokCampaignCases,productionWrites:0}));
}finally{await browser.close();}
