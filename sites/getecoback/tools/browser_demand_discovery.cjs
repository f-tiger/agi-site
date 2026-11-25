const assert=require('node:assert/strict');
const {chromium}=require(process.env.NODE_PATH?'playwright':'../../../tools/revenue-studio/node_modules/playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const searchAsset='/assets/search-index.json';
function trackIndexRequests(page,origin){
 const requests=[];
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.origin===origin&&(url.pathname===searchAsset||url.pathname==='/search-index.json'))requests.push(url.pathname);
 });
 return requests;
}

async function checkExactDelonghiPurchase(page,base){
 const outcomes=[
  ['delonghi-pac-n90-test','n90-angebot','https://www.amazon.de/dp/B07NC5CP6F?tag=getecoback-21'],
  ['pinguino-pac-ex105-test','ex105-angebot','https://www.amazon.de/s?k=De%27Longhi+Pinguino+PAC+EX105&tag=getecoback-21'],
 ];
 for(const [slug,anchor,href] of outcomes){
  await page.goto(base+'/guide/'+slug+'.html?__ci=1#'+anchor);
  const first=page.locator('a[href^="https://www.amazon.de/"]').first();
  assert.equal(await first.getAttribute('href'),href,'The first German shop route must match '+slug);
  assert(await first.isVisible(),'The matching offer must be usable at this size');
  assert.equal(await page.locator('#'+anchor+' a[rel~="sponsored"]').count(),1,'One link in the authored offer');
  assert.equal(await page.locator('#eb-toppick,#eb-sticky,#eb-usmarket,#eb-pu').count(),0,'Generic offers must stay out of exact guides');
  assert(await page.locator('#'+anchor+' a[href="#raumgroesse"]').isVisible(),'The fit check precedes the shop decision');
 }
 return outcomes.length*5;
}

async function checkGermanFocusedDiscovery(browser,base){
 const destination='/waeschetrockner-oder-luftentfeuchter.html#luftentfeuchter-waesche-kosten';
 const shadePage='/guide/luftfeuchtigkeit-richtig-messen.html';
 const shadeSection='kondenswasser-hinter-plissee';
 const positive=['Was kostet eine Ladung Wäsche nur mit meinem Luftentfeuchter?','Stromkosten Luftentfeuchter Wäsche'];
 const ordinary=[
  ['Trockner oder Luftentfeuchter Stromkosten Wäsche','/waeschetrockner-oder-luftentfeuchter.html'],
  ['Luftentfeuchter Keller','/guide/luftentfeuchter-keller.html'],
  ['Stromtarif','/stromtarif-werkstatt.html'],
  ['Wäsche trocknen','/waeschetrockner-oder-luftentfeuchter.html'],
  ['Was kostet ein Luftentfeuchter im Keller zum Wäschetrocknen?'],
  ['Welcher Stromtarif passt zum Wäschetrocknen mit Luftentfeuchter?'],
 ];
 let checks=0;
 const check=(value,message)=>{assert.ok(value,message);checks++;};
 const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  await page.goto(base+'/tools.html?__ci=1');
  await page.locator('#eb-search-toggle').click();
  const input=page.locator('#eb-search-query'),results=page.locator('#eb-search-results a');
  await input.waitFor({state:'visible'});
  const requests=[];
  page.on('request',request=>requests.push({method:request.method(),url:request.url(),body:request.postData()}));
  const search=async query=>{
   await input.fill('');
   await input.press('Enter');
   await page.waitForFunction(()=>{
    const copy=JSON.parse(document.getElementById('eco-chrome-copy').textContent);
    return document.getElementById('eb-search-status').textContent===copy.searchHint;
   });
   await input.fill(query);
   await input.press('Enter');
   await page.waitForFunction(()=>{
    const copy=JSON.parse(document.getElementById('eco-chrome-copy').textContent);
    const status=document.getElementById('eb-search-status').textContent;
    return status===copy.searchEmpty||!!document.querySelector('#eb-search-results a');
   });
   return results.evaluateAll(links=>links.map(link=>({href:link.getAttribute('href'),language:link.hreflang})));
  };
  for(const query of positive){
   const matches=await search(query);
   equal(matches[0],{href:destination,language:'de'},'The first result opens the German single-method answer');
  }
  for(const [query,previousDestination] of ordinary){
   const matches=await search(query);
   check(matches.every(match=>match.href!==destination),'A different buying or information intent does not lead to the single-method tool: '+query);
   if(previousDestination)equal(matches[0]?.href,previousDestination,'Existing searches keep their first destination: '+query);
  }
  equal((await search('Warum ist mein Fenster hinter dem Plissee nass, obwohl das Hygrometer 50 % zeigt?'))[0],
   {href:shadePage+'#'+shadeSection,language:'de'},'A wet window behind a blind leads to the measurement answer');
  check((await search('Fenster hinter dem Rollo beschlägt zwischen den beiden Scheiben'))
   .every(result=>result.href!==shadePage+'#'+shadeSection),'Glass cavity condensation stays outside the measurement answer');
  equal((await search('Welcher Ersatzfilter passt in meinen Beurer LR 401?'))[0],{href:'/ersatzfilter.html#beurer-lr401',language:'de'},'Beurer model reaches the audited exact filter');
  equal((await search('Welchen Filter brauche ich für meinen Levoit Core 300S ohne Pro?'))[0],{href:'/ersatzfilter.html#levoit-core-300s',language:'de'},'Core 300S reaches its exact standard filter');
  const ventilation='Soll ich meinen Keller lüften? Innen 16 °C und 75 %, draußen 8 °C und 90 %, Wand 12 °C.';
  equal((await search(ventilation))[0],{href:'/guide/keller-lueften-sommer.html#taupunkt',language:'de'},'Paired cellar readings lead to the measured ventilation check');
  const hose='Kann ich den Schlauch vom MeacoDry Arete One 20L nach oben in das Waschbecken legen?';
  equal((await search(hose))[0],{href:'/guide/luftentfeuchter-keller.html#ablauf-vor-kauf',language:'de'},'A higher sink leads to the German drainage section');
  const n90='/guide/delonghi-pac-n90-test.html#testlage';
  const portaSplit='/guide/midea-portasplit-ausverkauft-alternativen.html#fensterfalz';
  for(const [query,href] of [
   ['DeLonghi PAC N90 ECO Silent',n90],['PACN90 ECO Silent',n90],
   ['4048164116478',portaSplit],['Midea PortaSplit Original',portaSplit],
  ]){
   const matches=await search(query);
   equal(matches[0],{href,language:'de'},'The exact cooling model reaches its German answer: '+query);
  }
  for(const [query,excluded] of [
   ['PortaSplit 4048164122424 Fensterfalz',portaSplit],['PortaSplit 4048164122301 Fensterfalz',portaSplit],
   ['Midea PortaSplit E 4048164116478 Fensterfalz',portaSplit],['Midea PortaSplit Cool 4048164116478 Fensterfalz',portaSplit],
   ['Wie viel Strom verbraucht der DeLonghi PAC N90 ECO Silent?',n90],
  ]){
   const matches=await search(query);
   check(matches.every(match=>match.href!==excluded),'Different variants and questions avoid the original buying answer: '+query);
  }
  const closure='/guide/klimaanlage-fenster-einbruchschutz.html#fenster-verschluss-pruefen';
  const closureQuery='Kann ich mein Kippfenster mit der PortaSplit beim Verlassen der Wohnung verriegeln?';
  equal((await search(closureQuery))[0],{href:closure,language:'de'},'A complete German window-lock question reaches the decision answer');
  const condensation='/guide/fenster-beschlagen-innen.html#fenstersauger-gegen-kondenswasser';
  const condensationQuery='Warum beschlägt das geschlossene Fenster morgens innen?';
  equal((await search(condensationQuery))[0],{href:condensation,language:'de'},'Indoor condensation reaches the measurement answer');
  check((await search('Mein Fenster beschlägt morgens von außen und innen ist es trocken.')).every(match=>match.href!==condensation),
   'Outdoor condensation avoids the indoor answer');
  const glazing='/guide/fenster-beschlagen-aussen.html#aussen-innen-oder-dazwischen';
  const glazingQuery='Meine Doppelverglasung ist zwischen den Scheiben blind. Wen rufe ich an?';
  equal((await search(glazingQuery))[0],{href:glazing,language:'de'},'Cloudy insulated glass reaches the existing diagnosis');
  const curtain='/guide/thermovorhang-ratgeber.html#thermovorhang-bahnenbedarf';
  const roomVentilation='/guide/richtig-lueften-im-winter.html#lueften-vorher-nachher';
  equal((await search('Wie viele Thermovorhänge brauche ich für ein 120 cm breites Fenster?'))[0],
   {href:curtain,language:'de'},'The German curtain quantity question reaches its measurement tool');
  equal((await search('Luftfeuchtigkeit vor und nach dem Stoßlüften vergleichen'))[0],
   {href:roomVentilation,language:'de'},'A before/after room question reaches the matching ventilation tool');
  const showerFit='/guide/duschen-kosten-rechner.html#durchlauferhitzer-mindestdurchfluss';
  const flowQuestion='Funktioniert ein Sparduschkopf an meinem hydraulischen Durchlauferhitzer?';
  equal((await search(flowQuestion))[0],{href:showerFit,language:'de'},
   'Showerhead fit reaches the measured flow and minimum threshold decision');
  const directHeat='/guide/heizkosten-vergleich-rechner.html#heizluefter-oder-infrarot';
  const directHeatQuery='Heizlüfter oder Infrarotheizung';
  equal((await search(directHeatQuery))[0],{href:directHeat,language:'de'},
   'German direct heating searches reach the short-use comparison');
  const klarstein='/guide/klarstein-kraftwerk-smart-12k-test.html#kraftwerk-10034664-lieferumfang';
  const klarsteinQuery='Klarstein Kraftwerk Smart 12K 10034664';
  equal((await search(klarsteinQuery))[0],{href:klarstein,language:'de'},
   'Identifying the Klarstein article number opens its package checklist');
  const panel='/guide/fensterabdichtung-selber-bauen.html#abluft-ausschnitt-pruefen';
  equal((await search('Fensterplatte für mobile Klimaanlage: Welcher Randabstand bleibt um den runden Ausschnitt?'))[0],
   {href:panel,language:'de'},'Window panel queries reach the round cutout check');
  const stacking='/produkte.html#waeschesaeule-zubehoer';
  equal((await search('WTZ27400 oder WTZ27410: Welcher Verbindungssatz für den Bosch WQG241001 hat einen Auszug?'))[0],
   {href:stacking,language:'de'},'Bosch stacking kit questions reach the product guide');
  await search('eco-local-privacy-marker-6381');
  equal(await results.count(),0,'An arbitrary private phrase yields no result');
  await search(positive[1]);
  equal(requests,[{method:'GET',url:base+searchAsset,body:null}],'Typing searches only the static local index and makes no request with the terms');
  await results.first().focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(base+destination);
  check(await page.locator('#luftentfeuchter-waesche-kosten').getByRole('heading').isVisible(),'Keyboard navigation reaches the actual answer');
  await page.locator('#eb-search-toggle').click();
  await input.waitFor({state:'visible'});
  await search(closureQuery);
  await results.first().click();
  await page.waitForURL(base+closure);
  check(await page.locator('#fenster-verschluss-pruefen').isVisible(),'The window-lock result navigates to the actual answer');
  await page.locator('#eb-search-toggle').click();
  await input.waitFor({state:'visible'});
  await search(condensationQuery);
  await results.first().click();
  await page.waitForURL(base+condensation);
  check(await page.locator('#fenster-check-titel').isVisible(),'The condensation result reaches the same public answer');
  await page.locator('#eb-search-toggle').click();
  await input.waitFor({state:'visible'});
  await search(glazingQuery);
  await results.first().click();
  await page.waitForURL(base+glazing);
  check(await page.locator('#aussen-innen-oder-dazwischen').isVisible(),'Glazing search reaches the reviewed section');
  await page.locator('#eb-search-toggle').click();
  await input.waitFor({state:'visible'});
  await search(flowQuestion);
  await results.first().click();
  await page.waitForURL(base+showerFit);
  check(await page.locator('#durchlauferhitzer-mindestdurchfluss').isVisible(),'Showerhead search follows the exact result');
  await page.locator('#eb-search-toggle').click();
  await input.waitFor({state:'visible'});
  await search(directHeatQuery);
  await results.first().click();
  await page.waitForURL(base+directHeat);
  check(await page.locator('#heizluefter-oder-infrarot').isVisible(),'Heater comparison search navigates to the exact section');
  await page.locator('#eb-search-toggle').click();
  await input.waitFor({state:'visible'});
  await search(klarsteinQuery);
  await results.first().click();
  await page.waitForURL(base+klarstein);
  check(await page.locator('#kraftwerk-10034664-lieferumfang').isVisible(),'Klarstein search opens the exact package section');
  await page.goto(base+'/guide/luftbefeuchter-ratgeber.html?__ci=1#ersatzteile-zuordnen');
  const stock=page.locator('#oskar-stock-form'), stockResult=page.locator('#oskar-stock-result');
  const filterSource=page.locator('#oskar-stock-product');
  check(await stock.isVisible(),'Oskar filter stock can be planned on the existing accessory guide');
  equal(await stock.locator('input:invalid').count(),3,'Stock and planned changes need the reader’s inputs');
  const calculateStock=stock.getByRole('button',{name:'Filterbedarf berechnen'});
  for(const name of ['oskar_wechsel','little_wechsel','vorhanden'])await stock.locator('[name="'+name+'"]').fill('1');
  await calculateStock.click();
  check((await stockResult.textContent()).includes('Zusätzliche Zweierpacks: 1'),'One spare mat reduces the plan to one two-pack');
  check(await filterSource.isVisible(),'The exact manufacturer pack appears for a shortfall');
  await stock.locator('[name="vorhanden"]').fill('3');
  equal(await stockResult.textContent(),'','A change to the stock clears the previous result');
  await calculateStock.click();
  check((await stockResult.textContent()).includes('Zusätzliche Zweierpacks: 0')&&await filterSource.isHidden(),
   'Known sufficient stock has a zero-pack outcome');
  await page.goto(base+'/guide/fensterabdichtung-selber-bauen.html?__ci=1#abluft-ausschnitt-pruefen');
  const cutout=page.locator('#panel-cutout-form'), report=page.locator('#panel-cutout-result');
  check(await cutout.isVisible(),'The cutout form opens at the exact German answer');
  const runCutout=cutout.getByRole('button',{name:'Freien Rand berechnen'});
  check(await cutout.locator('input:invalid').count()===6,'The cutout fields have no assumed measurements');
  for(const [field,value] of Object.entries({breite_mm:400,hoehe_mm:250,loch_mm:150,mitte_x_mm:200,mitte_y_mm:125,rand_min_mm:30}))
   await cutout.locator('[name="'+field+'"]').fill(String(value));
  await runCutout.click();
  check((await report.textContent()).includes('50 mm'),'A centered example leaves the same 50 mm as MCP');
  await cutout.locator('[name="mitte_x_mm"]').fill('90');
  equal(await report.textContent(),'','Changed geometry clears the previous result');
  await runCutout.click();
  check((await report.textContent()).includes('15 mm')&&(await report.textContent()).includes('warte mit dem Zuschnitt'),
   'An off-center hole with inadequate clearance tells the buyer to wait');
  checks+=await checkExactDelonghiPurchase(page,base);
  await context.close();
 }

 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
 const page=await context.newPage();
 for(const route of ['/tools.html','/guide/waesche-trocknen-wohnung.html']){
  await page.goto(base+route+'?__ci=1');
  const link=page.locator('a[href="'+destination+'"]:visible').first();
  check(await link.isVisible(),'A reader can find the task with JavaScript disabled on '+route);
  await link.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(base+destination);
  check(await page.locator('#luftentfeuchter-waesche-kosten').getByRole('heading').isVisible(),'The clean static link reaches the same section');
  check(await page.locator('#luftentfeuchter-waesche-kosten form').isHidden(),'The no-script reader does not submit a form');
 }
 await page.goto(base+'/guide/duschen-kosten-rechner.html?__ci=1');
 const showerLink=page.locator('a[href="#durchlauferhitzer-mindestdurchfluss"]');
 check(await showerLink.isVisible(),'The shower guide links to the threshold answer without JavaScript');
 await showerLink.click();
 const showerAnswer=page.locator('section[aria-labelledby="durchlauferhitzer-mindestdurchfluss"]');
 check(await showerAnswer.getByText('Behalte die vorhandene Brause',{exact:false}).isVisible(),
  'The static shower advice keeps the wait and no-purchase option');
 await page.goto(base+shadePage+'?__ci=1');
 const shadeLink=page.locator('a[href="#'+shadeSection+'"]');
 await shadeLink.click();
 await page.waitForURL(base+shadePage+'?__ci=1#'+shadeSection);
 const shadeAnswer=page.locator('section[aria-labelledby="'+shadeSection+'"]');
 check(await shadeAnswer.getByText('9,3 °C',{exact:false}).isVisible(),'The dew point example works without JavaScript');
 check(await shadeAnswer.getByText('Ohne verlässliche Scheibentemperatur',{exact:false}).isVisible(),
  'The static answer keeps the missing-temperature branch');
 check(await shadeAnswer.getByRole('link',{name:'Taupunkt und Scheibentemperatur mit eigenen Messwerten vergleichen'}).isVisible(),
  'The calculator link works as ordinary navigation');
 await page.goto(base+'/guide/heizkosten-vergleich-rechner.html?__ci=1');
 const heatLink=page.getByRole('link',{name:'Kurze Einsätze von Heizlüfter und Infrarot vergleichen',exact:true});
 check(await heatLink.isVisible(),'Direct-heat comparison has a native in-page link without JavaScript');
 equal(await heatLink.getAttribute('href'),'#heizluefter-oder-infrarot','The link opens the short-use calculation');
 await heatLink.click();
 await page.waitForURL(base+'/guide/heizkosten-vergleich-rechner.html?__ci=1#heizluefter-oder-infrarot');
 const heatAnswer=page.locator('section[aria-labelledby="heizluefter-oder-infrarot"]');
 check(await heatAnswer.getByText('17,5 Cent',{exact:false}).isVisible(),'Heater cost example works without JavaScript');
 await page.goto(base+'/guide/klarstein-kraftwerk-smart-12k-test.html?__ci=1#kraftwerk-10034664-lieferumfang');
 const klarsteinAnswer=page.locator('section[aria-labelledby="kraftwerk-10034664-lieferumfang"]');
 check(await klarsteinAnswer.getByText('Fensterabdichtungsset für Kippfenster',{exact:true}).isVisible(),
  'Klarstein provides the included package contents without JavaScript');
 const exactManufacturer=klarsteinAnswer.getByRole('link',{name:'Klarstein: weißes Gerät und Lieferumfang 10034664',exact:true});
 equal(await exactManufacturer.getAttribute('href'),'https://www.klarstein.de/kraftwerk-smart-12000-btu-mobile-klimaanlage-weiss-p-10034664.html',
  'The white article links to its confirmed manufacturer listing');
 check(!await klarsteinAnswer.locator('a[rel~="sponsored"]').count(),'The variant evidence has its own reference path');
 const offerBlock=page.locator('#angebot-kraftwerk');
 check(await offerBlock.getByText('Händlerangebot für die Kraftwerk-12K-Reihe',{exact:true}).isVisible(),
  'The existing family-level retailer offer asks readers to verify the variant');
 const existingShop=offerBlock.getByRole('link',{name:'12K-Angebot bei Amazon öffnen und Ausführung prüfen →',exact:true});
 equal(await existingShop.getAttribute('href'),'https://www.amazon.de/dp/B08VWSP8FW?tag=getecoback-21',
  'The existing tagged product destination follows the model check');
 await page.goto(base+'/produkte.html?__ci=1');
 const stackingLink=page.getByRole('link',{name:'Bosch WQG241001: WTZ27400 oder WTZ27410?',exact:true});
 check(await stackingLink.isVisible(),'The short Bosch stacking answer has a native link');
 await stackingLink.click();
 await page.waitForURL(base+'/produkte.html?__ci=1#waeschesaeule-zubehoer');
 const stackingAnswer=page.locator('section[aria-labelledby="waeschesaeule-zubehoer"]');
 check(await stackingAnswer.getByText('warte mit der Bestellung',{exact:false}).isVisible(),
  'The catalog keeps a no-purchase branch for unknown washer compatibility');
 const dryerLink=stackingAnswer.getByRole('link',{name:'Zum Trockner Bosch WQG241001 und seiner Modellsuche',exact:true});
 await dryerLink.click();
 await page.waitForURL(base+'/produkte.html?__ci=1#produkt-bosch-wqg241001');
 const dryerShop=page.locator('#produkt-bosch-wqg241001 a[rel~="sponsored"]');
 const dryerDestination=new URL(await dryerShop.getAttribute('href'));
 equal(dryerDestination.origin+dryerDestination.pathname,'https://www.amazon.de/s','Only the existing dryer search is offered');
 equal(dryerDestination.searchParams.get('tag'),'getecoback-21','The existing dryer search has the approved tag');
 await page.goto(base+'/guide/luftbefeuchter-ratgeber.html?__ci=1#ersatzteile-zuordnen');
 const stockStatic=page.locator('[aria-labelledby="oskar-filtervorrat"]');
 check(await stockStatic.getByText('Reicht der Vorrat, brauchst du keine zusätzliche Packung.',{exact:false}).isVisible(),
  'The static German pack guide explains the zero-pack decision');
 check(await page.locator('#oskar-stock-form').isHidden(),'The stock form requires its local calculator');
 await page.goto(base+'/guide/fensterabdichtung-selber-bauen.html?__ci=1#abluft-ausschnitt-pruefen');
 const cutoutProof=page.locator('section[aria-labelledby="abluft-ausschnitt-pruefen"]');
 check(await cutoutProof.getByText('50 mm frei',{exact:false}).isVisible(),'The static guide contains the worked cutout example');
 check(await cutoutProof.getByText('warte mit dem Zuschnitt',{exact:false}).isVisible(),'The no-script route explains when to wait');
 check(await page.locator('#panel-cutout-form').isHidden(),'The form is hidden without its local calculator');
 checks+=await checkExactDelonghiPurchase(page,base);
 await context.close();
 return checks;
}

(async()=>{
 const base=process.env.BASE_URL||'http://127.0.0.1:8766';
 const origin=new URL(base).origin;
 const server=process.env.BASE_URL?null:spawn('python3',['-m','http.server','8766','--directory',path.resolve(__dirname,'../site')],{stdio:'ignore'});
 let browser;let checks=0;
 try{
  let ready = false;
  for (let attempt = 0; attempt < 30 && !ready; attempt++) {
   // Read response headers only. The full HTML is checked by Chromium below.
   ready = await fetch(base, {method: 'HEAD', signal: AbortSignal.timeout(1000)})
    .then(response => response.ok, () => false);
   if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Search preview did not start');
  browser=await chromium.launch({headless:true});
  const createContext=browser.newContext.bind(browser);
  browser.newContext=async options=>{
   const context=await createContext({...options,userAgent:'getecoback-ci'});
   context.setDefaultTimeout(15000);
   await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin||r.request().method()!=='GET')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({body:'{}'});return r.continue();});
   return context;
  };
  const cases=[['/','de','kalte Füße'],['/en/','en','dry clothes'],['/nl/wonen.html','nl','vocht'],['/au/home-comfort.html','en-AU','fan'],['/fr/calculateur.html','fr','électricité'],['/es/calculadora.html','es','tarifas'],['/it/','it','freddo'],['/zh/agents/cbam-supplier-data.html','zh-CN','CBAM']];
  for(const width of [320,390,1280]){
   const c=await browser.newContext({viewport:{width,height:900},userAgent:'getecoback-ci'});
   await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin||r.request().method()!=='GET')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({body:'{}'});return r.continue();});
   const page=await c.newPage();
   const indexRequests=trackIndexRequests(page,origin);
   for(const [route,lang,q] of cases){
    indexRequests.length=0;
    await page.goto(base+route+'?__ci=1');
    assert.equal(await page.locator('#eco-discovery').count(),1);
    await page.locator('#eb-search-toggle').click();
    await page.waitForFunction(()=>document.activeElement.id==='eb-search-query');
    assert.equal(await page.locator('#eb-search-toggle').getAttribute('aria-expanded'),'true');
    assert(await page.locator('[data-eco-task]').first().isVisible());
    assert(await page.locator('#eb-search-panel').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;}));
    await page.locator('#eb-search-query').fill(q);
    await page.waitForSelector('#eb-search-results a');
    assert.deepEqual(indexRequests,[searchAsset],`Static search index request for ${lang} at ${width}px`);
    assert(await page.locator('#eb-search-results a').evaluateAll((a,l)=>a.every(x=>x.hreflang===l),lang));
    await page.locator('#eb-search-query').fill('zzznomatchingneedzzz');
    await page.waitForFunction(()=>!document.querySelector('#eb-search-results a'));
    assert(await page.locator('[data-eco-task]').first().isVisible());
    await page.keyboard.press('Escape');assert(await page.locator('#eb-search-panel').isHidden());
    assert.equal(await page.evaluate(()=>document.activeElement.id),'eb-search-toggle');checks+=9;
   }
   await c.close();
  }
  // The live fleet account tools can wrap the search into a new desktop row.
  // Test that composition as well as the static-build layout, including no JS.
  for(const javaScriptEnabled of [true,false]){
   const wrapped=await browser.newContext({javaScriptEnabled,viewport:{width:1280,height:900},userAgent:'getecoback-ci'});
   const page=await wrapped.newPage();await page.goto(base+'/?__ci=1');
   await page.evaluate(css=>{const style=document.createElement('style');style.textContent=css;document.head.append(style);},'.eb-nav-in{display:flex!important;flex-wrap:wrap!important}.eb-nav-in>.eb-links{flex-basis:100%!important}');
   await page.locator('#eb-search-toggle').click();
   assert(await page.locator('#eb-search-panel').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;}),'wrapped fleet header must keep the full panel visible');
   await wrapped.close();checks++;
  }
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
  const page=await c.newPage();await page.goto(base+'/?__ci=1');await page.locator('#eb-search-toggle').click();
  assert(await page.locator('[data-eco-task]').first().isVisible());assert(await page.locator('#eb-search-form').isHidden());
  await c.close();checks+=2;
  const fail=await browser.newContext();
  const staticIndexRequest=url=>url.origin===origin&&url.pathname===searchAsset;
  await fail.route(staticIndexRequest,r=>r.fulfill({status:503,body:'unavailable'}));
  const f=await fail.newPage(),failedIndexRequests=trackIndexRequests(f,origin);
  await f.goto(base+'/?__ci=1');await f.locator('#eb-search-toggle').click();await f.locator('#eb-search-query').fill('waesche trocknen');await f.waitForFunction(()=>document.querySelector('#eb-search-status').textContent.includes('nicht verfügbar'));
  assert.deepEqual(failedIndexRequests,[searchAsset]);
  assert(await f.locator('[data-eco-task]').first().isVisible());
  assert.equal(await f.locator('#eb-search-results a').count(),0);
  await fail.unroute(staticIndexRequest);
  await f.locator('#eb-search-query').press('Enter');
  await f.locator('#eb-search-results a[href="/waeschetrockner-oder-luftentfeuchter.html"]').waitFor({state:'visible'});
  assert.deepEqual(failedIndexRequests,[searchAsset,searchAsset]);
  await fail.close();checks+=5;
  checks+=await checkGermanFocusedDiscovery(browser,base);
  console.log(`PASS demand discovery: ${checks} checks, 8 locales, 3 widths, no-JS and static-index failure/retry`);
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
