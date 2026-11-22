import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {campaignFields,validatedCampaign} from './campaign.mjs';
import {businessEvent,publicAccountEntryPath} from './business.mjs';
import {affiliateAction,legacyEvent} from './legacy.mjs';
import {analyticsResponse,isAnalyticsPath} from './edge.mjs';

test('Only registered campaign fields survive, including inside the frame',()=>{
 const fields=campaignFields('?utm_source=youtube&utm_medium=organic_video&utm_campaign=bpj-ai-service-01&email=SECRET&utm_content=SECRET');
 assert.deepEqual(fields,{campaign_source:'youtube',campaign_medium:'organic_video',campaign_name:'bpj-ai-service-01'});
 assert.deepEqual(campaignFields('?utm_source=PRIVATE_EMAIL&utm_medium=social&token=SECRET'),{campaign_medium:'social'});
 assert.deepEqual(campaignFields('?utm_source=reddit&utm_source=SECRET'),{});
 assert.deepEqual(validatedCampaign({...fields,filename:'SECRET',campaign_content:'SECRET'}),fields);
 assert.deepEqual(validatedCampaign({campaign_source:'PRIVATE_EMAIL'}),{});
 assert.deepEqual(campaignFields('?utm_source=tiktok&utm_medium=social&utm_campaign=eco-dach-catalog-01'),{campaign_source:'tiktok',campaign_medium:'social',campaign_name:'eco-dach-catalog-01'});
 assert.deepEqual(campaignFields('?utm_source=tiktok&utm_medium=social&utm_campaign=eco-dach-thermostat-01'),{campaign_source:'tiktok',campaign_medium:'social',campaign_name:'eco-dach-thermostat-01'});
 const readerShare={campaign_source:'reader_share',campaign_medium:'share',campaign_name:'free-tools'};
 assert.deepEqual(campaignFields('?utm_source=reader_share&utm_medium=share&utm_campaign=free-tools&email=SECRET&utm_content=SECRET'),readerShare);
 assert.deepEqual(validatedCampaign({...readerShare,recipient:'SECRET'}),readerShare);
});
test('One merchant click classification, no raw URLs, arbitrary merchants or purchase events',()=>{
 const action=affiliateAction('https://www.amazon.de/s?k=SECRET&tag=getecoback-21','home-herbst');
 assert.deepEqual(action,{name:'affiliate:amazon:de:home-herbst'});
 assert.deepEqual(businessEvent('getecoback.com','/',action),{name:'affiliate_click',merchant:'amazon',market:'de',placement:'home-herbst',repeat:true});
 for(const href of ['https://amazon.de.evil.test/?tag=getecoback-21','https://amazon.de/?tag=someone-21','http://amazon.de/?tag=getecoback-21','https://amazon.com/?tag=getecoback-21'])assert.equal(affiliateAction(href),null);
 assert.equal(legacyEvent('getecoback.com','/','affiliate_click'),null);
 assert.equal(legacyEvent('getecoback.com','/','purchase'),null);
 assert.equal(legacyEvent('preview.invalid','/','seal_fit'),null);
});
const consentSource=fs.readFileSync(new URL('./consent.mjs',import.meta.url),'utf8').replace(/^const \{[^}]+\} = await import\([^\n]+\);\n/gm,'');
const registry=JSON.parse(fs.readFileSync(new URL('./registry.json',import.meta.url),'utf8'));
const allowed=Object.fromEntries(Object.values(registry).flatMap(site=>site.hosts.map(host=>[host,site.id])));
function fixture({choice='',query='',privacy={},host='getecoback.com',path='/',title='Public title'}={}) {
 const listeners={},clicks=[],elements=[],posts=[],cookies=[],store=new Map(choice?[['fleet_ga4_choice_v1',choice]]:[]);
 const on=(name,fn)=>{(listeners[name]??=[]).push(fn);};
 const element=tag=>{const e={tag,dataset:{},children:[],hidden:false,append(...v){this.children.push(...v);},setAttribute(){},addEventListener(n,f){this[n]=f;},querySelector(){return this.children.find(x=>x.tag==='button');},focus(){},remove(){this.removed=true;}};if(tag==='iframe')e.contentWindow={postMessage:(d,origin)=>posts.push({d,origin})};elements.push(e);return e;};
 const script={dataset:{ga4Id:allowed[host]||'G-E2V0Q9SJ9V',ga4Host:host,ga4Page:'https://'+host+path,ga4Title:title},src:'https://'+host+'/analytics-assets/consent.mjs?v=test'};
 const document={documentElement:{lang:'en'},referrer:'https://www.google.com/search?q=SECRET',body:element('body'),getElementById:()=>null,querySelector:s=>s.startsWith('script[')?script:null,createElement:element,addEventListener:(n,f)=>{if(n==='click')clicks.push(f);}};
 Object.defineProperty(document,'cookie',{get:()=>'_ga=old; fleet_'+host.replaceAll('.','_')+'_ga=new; unrelated=keep',set:v=>cookies.push(v)});
 const window={addEventListener:on,dataLayer:[]};window.self=window;window.top=window;
 window.gtag=function(){window.dataLayer.push(arguments);};
 const firstParty=[];const original=window.gtag;window.gtag=function(){firstParty.push(Array.from(arguments));original(...arguments);};
 const context={window,document,location:new URL('https://'+host+path+query),navigator:privacy,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},URL,URLSearchParams,Date,Set,installPublicEngagement:()=>{},campaignFields,businessEvent,publicAccountEntryPath,allowed,affiliateAction,legacyEvent};
 vm.runInNewContext(consentSource.replaceAll('new URL(import.meta.url).search',"'?v=test'"),context);
 const frame=()=>elements.filter(e=>e.tag==='iframe'&&!e.removed).at(-1);
 const emit=(n,e)=>{for(const f of listeners[n]||[])f(e);};
 const click=value=>elements.find(e=>e.dataset.analyticsChoice===value)?.click();
 const handshake=()=>{const f=frame();emit('message',{source:f.contentWindow,origin:'https://'+host,data:{type:'fleet-ga4-ready'}});emit('message',{source:f.contentWindow,origin:'https://'+host,data:{type:'fleet-ga4-started'}});};
 const affiliateClick=()=>{const a={href:'https://www.amazon.de/s?k=SECRET&tag=getecoback-21',closest:s=>s==='#eb-herbst'?a:null};for(const f of clicks)f({isTrusted:true,target:{closest:()=>a}});window.gtag('event','affiliate_click',{source:'home-herbst',link_url:a.href});window.gtag('event','affiliate_click',{link_url:a.href});};
 const accountClick=({native=false,marked=true,trusted=true,href='https://'+host+'/auth/account?next=SECRET_NEXT&lang=en#SECRET_HASH'}={})=>{
  const a={href,matches:s=>marked&&native&&s==='[data-fleet-account-entry]',closest:s=>marked&&!native&&s==='.fleet-account-entry'?{}:null};
  for(const f of clicks)f({isTrusted:trusted,target:{closest:()=>a}});
 };
 return {window,posts,cookies,store,frame,click,handshake,affiliateClick,accountClick,firstParty,emit,elements};
}
test('BPJ reader sharing reaches the isolated collector with fixed campaign and no shared content',()=>{
 const host='baipiaoji.com',path='/en/studio/ai/ai-eval-export-pair';
 const f=fixture({host,path,query:'?utm_source=reader_share&utm_medium=share&utm_campaign=free-tools&email=SECRET#SECRET'});
 f.emit('fleet:business',{detail:{name:'bpj_tool_share_copy'}});
 f.emit('fleet:business',{detail:{name:'bpj_tool_share_copy',url:'SECRET'}});
 f.handshake();
 f.emit('fleet:business',{detail:{name:'bpj_tool_share_native'}});
 f.emit('fleet:business',{detail:{name:'bpj_tool_share_copy'}});
 const posts=f.posts.filter(x=>x.d.type==='fleet-ga4-business');
 assert.deepEqual(posts.map(x=>x.d.detail.name),['bpj_tool_share_copy','bpj_tool_share_native','bpj_tool_share_copy']);
 assert(posts.every(x=>Object.keys(x.d.detail).join(',')==='name'));
 assert(!JSON.stringify(f.posts).includes('SECRET'));
 const page=f.posts.find(x=>x.d.type==='fleet-ga4-page').d.data;
 assert.deepEqual({...page.campaign},{campaign_source:'reader_share',campaign_medium:'share',campaign_name:'free-tools'});
 assert.equal(page.page,'https://'+host+path);

 // Run the real collector offline: no tag or analytics request leaves this test.
 const listeners={},tags=[],parent={location:{hostname:host},postMessage(){}};
 const window={parent,addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const document={createElement:()=>({}),head:{append:tag=>tags.push(tag)}};
 const source=fs.readFileSync(new URL('./collector.mjs',import.meta.url),'utf8').replace(/^const \{[^}]+\} = await import\([^\n]+\);\n/gm,'');
 vm.runInNewContext(source,{window,document,location:new URL('https://'+host+'/analytics-assets/frame.html'),URL,Set,businessEvent,allowed,validatedCampaign});
 const send=data=>listeners.message({source:parent,origin:'https://'+host,data});
 for(const post of f.posts)send(post.d);
 send({type:'fleet-ga4-business',detail:{name:'bpj_tool_share_copy',result:'SECRET'}});
 const hits=window.dataLayer.filter(args=>args[0]==='event'&&args[1].startsWith('bpj_tool_share_'));
 assert.deepEqual(Array.from(hits,args=>args[1]),['bpj_tool_share_copy','bpj_tool_share_native','bpj_tool_share_copy']);
 for(const args of hits)assert.deepEqual({...args[2]},{send_to:allowed[host],tool_id:'ai-eval-export-pair',page_location:'https://'+host+path,page_title:'Public title',page_referrer:'https://www.google.com/'});
 assert.equal(tags.length,1);assert(!JSON.stringify(window.dataLayer).includes('SECRET'));
 f.click('denied');const count=f.posts.length;
 f.emit('fleet:business',{detail:{name:'bpj_tool_share_copy'}});assert.equal(f.posts.length,count);
});
test('BPJ sharing respects stored refusal, QA and browser privacy exclusions',()=>{
 for(const config of [{choice:'denied'},{query:'?__ci=1'},{query:'?__probe=1'},{query:'?qa=1'},{privacy:{webdriver:true}},{privacy:{doNotTrack:'1'}},{privacy:{globalPrivacyControl:true}}]) {
  const f=fixture({host:'baipiaoji.com',path:'/studio/ai/',...config});
  f.emit('fleet:business',{detail:{name:'bpj_tool_share_copy'}});
  assert.equal(f.posts.length,0);assert.equal(f.frame(),undefined);
 }
});
test('Shared and native account links emit one fixed entry action per trusted click without context',()=>{
 const f=fixture({host:'agiscorecard.com',query:'?private=SECRET_QUERY'});f.handshake();
 f.accountClick();f.accountClick({native:true});
 f.accountClick({trusted:false});f.accountClick({marked:false});
 f.accountClick({href:'https://other.example/auth/account'});f.accountClick({href:'https://agiscorecard.com/auth/google'});
 const hits=f.posts.filter(x=>x.d.type==='fleet-ga4-business');
 assert.equal(hits.length,2);assert(hits.every(x=>Object.keys(x.d.detail).join(',')==='name'&&x.d.detail.name==='fleet_account_entry'));
 assert(!JSON.stringify(f.posts).includes('SECRET'));
 f.click('denied');const n=f.posts.length;f.accountClick();assert.equal(f.posts.length,n);
});
test('Account entry stays excluded for BPJ existing tracking, unknown hosts, private routes and privacy signals',()=>{
 for(const config of [{host:'baipiaoji.com'},{host:'preview.example'},{path:'/auth/account'},{path:'/en/account.html'},{path:'/api/private'},{path:'/studio/quote-builder'}]) {
  const f=fixture(config);f.handshake();f.accountClick();assert.equal(f.posts.filter(x=>x.d.type==='fleet-ga4-business').length,0);
 }
 for(const config of [{choice:'denied'},{privacy:{doNotTrack:'1'}},{privacy:{globalPrivacyControl:true}},{privacy:{webdriver:true}},{query:'?__qa=1'}]) {
  const f=fixture(config);f.accountClick();assert.equal(f.posts.length,0);assert.equal(f.frame(),undefined);
 }
});
test('Consent runtime keeps D1 callbacks while exactly one GA affiliate action crosses the frame',()=>{
 const f=fixture({choice:'denied',query:'?utm_source=youtube&utm_medium=organic_video&utm_campaign=bpj-ai-service-01&private=SECRET'});
 f.affiliateClick();assert.equal(f.posts.length,0);assert.equal(f.firstParty.length,2);
 f.click('granted');f.handshake();f.affiliateClick();
 const business=f.posts.filter(x=>x.d.type==='fleet-ga4-business');
 assert.equal(business.length,1);assert.equal(business[0].d.detail.name,'affiliate:amazon:de:home-herbst');
 assert.equal(f.firstParty.length,4);assert(!JSON.stringify(f.posts).includes('SECRET'));
 const page=f.posts.find(x=>x.d.type==='fleet-ga4-page').d.data;
 assert.equal(page.campaign.campaign_source,'youtube');assert.equal(page.page,'https://getecoback.com/');assert.equal(page.referrer,'https://www.google.com/');
 f.click('denied');assert.equal(f.frame(),undefined);const n=f.posts.length;f.affiliateClick();assert.equal(f.posts.length,n);
 assert(f.cookies.some(x=>x.startsWith('fleet_getecoback_com_ga=')));assert(f.cookies.every(x=>!x.startsWith('unrelated=')));
});
test('Legacy fixed actions are bridged only after consent and never with user fields',()=>{
 const f=fixture({choice:'denied'});f.window.gtag('event','seal_fit',{len:99,customer:'SECRET'});
 f.click('granted');f.handshake();f.window.gtag('event','seal_fit',{len:55,customer:'SECRET'});f.window.gtag('event','unregistered_action',{private:'SECRET'});
 const hits=f.posts.filter(x=>x.d.type==='fleet-ga4-business');assert.equal(hits.length,1);assert.equal(hits[0].d.detail.name,'legacy:seal_fit');assert(!JSON.stringify(f.posts).includes('SECRET'));
 f.emit('storage',{key:'fleet_ga4_choice_v1',newValue:'denied'});assert.equal(f.frame(),undefined);
});
test('Stored decline and every probe/privacy signal prevent the Google frame',()=>{
 assert.equal(fixture({choice:'denied'}).frame(),undefined);
 for(const query of ['?ci=1','?__ci=1','?__probe=1','?qa=1','?__qa=1','?utm_source=verify'])assert.equal(fixture({choice:'granted',query}).frame(),undefined);
 for(const privacy of [{webdriver:true},{doNotTrack:'1'},{globalPrivacyControl:true}])assert.equal(fixture({choice:'granted',privacy}).frame(),undefined);
});
test('Analytics edge assets bypass private tool policies narrowly, not for arbitrary files',async()=>{
 assert(isAnalyticsPath('/analytics-assets/frame'));
 assert(!isAnalyticsPath('/analytics-assets/../../members.html'));assert(!isAnalyticsPath('/analytics-assets/private.json'));
 let requested;
 const response=await analyticsResponse(new Request('https://rfqdesk.agiscorecard.com/analytics-assets/frame.html?v=1'),{ASSETS:{fetch:async r=>{requested=r.url;return new Response('empty frame');}}},'rfqdesk');
 assert.equal(requested,'https://rfqdesk.agiscorecard.com/rfqdesk/analytics-assets/frame.html');
 assert.match(response.headers.get('Cache-Control'),/no-transform/);assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'self'/);assert.equal(response.headers.get('X-Frame-Options'),'SAMEORIGIN');
});

test('New visitors start automatically without a consent panel or stored choice',()=>{
 const f=fixture();assert(f.frame());assert(!f.elements.some(e=>e.id==='fleet-analytics-choice'));
 assert.equal(f.store.size,0);f.handshake();
 assert.equal(f.posts.filter(x=>x.d.type==='fleet-ga4-page').length,1);
 f.click('denied');assert.equal(f.frame(),undefined);assert.equal(f.store.get('fleet_ga4_choice_v1'),'denied');
 f.click('granted');f.handshake();assert.equal(f.posts.filter(x=>x.d.type==='fleet-ga4-page').at(-1).d.data.sendPageView,false);
});

test('Laundry bridge is route-bound, opt-out aware and sends no input data',()=>{
 const path='/en/guide/dehumidifier-drying-clothes-cost.html';
 assert.deepEqual(businessEvent('getecoback.com',path,{name:'eco_laundry_compare'}),{name:'laundry_compare',tool_id:'laundry-cost',repeat:true});
 assert.equal(businessEvent('getecoback.com','/members.html',{name:'eco_laundry_compare'}),null);
 assert.equal(businessEvent('getecoback.com',path,{name:'eco_laundry_compare',kwh:123}),null);
 const f=fixture({choice:'denied',path});
 f.emit('fleet:business',{detail:{name:'eco_laundry_compare'}});assert.equal(f.posts.length,0);
 f.click('granted');f.handshake();
 for(const action of ['example','compare','export'])f.emit('fleet:business',{detail:{name:'eco_laundry_'+action}});
 const hits=f.posts.filter(x=>x.d.type==='fleet-ga4-business');
 assert.deepEqual(hits.map(x=>x.d.detail.name),['eco_laundry_example','eco_laundry_compare','eco_laundry_export']);
 assert(hits.every(x=>Object.keys(x.d.detail).join(',')==='name'));
 f.click('denied');const n=f.posts.length;f.emit('fleet:business',{detail:{name:'eco_laundry_compare'}});assert.equal(f.posts.length,n);
});

test('TDS native tool actions are confined to public tool URLs and have no user data', () => {
 for (const action of ['tds_suite_complete','tds_suite_example','tds_suite_export']) {
  const allowedPath = '/de/ai-tools/plan-display-fit';
  assert.deepEqual(businessEvent('thedollscout.com', allowedPath, {name:action}),
    {name:action,tool_id:'plan-display-fit',repeat:true});
  for (const path of ['/de/ai-tools','/api/home-mcp','/ai-tools/room?name=user','/ai-tools/room%2Dfit']) {
   assert.equal(businessEvent('thedollscout.com',path,{name:action}), null);
  }
  assert.equal(businessEvent('thedollscout.com',allowedPath,{name:action,input:'private'}), null);
  assert.equal(businessEvent('preview.example',allowedPath,{name:action}), null);
 }
});
