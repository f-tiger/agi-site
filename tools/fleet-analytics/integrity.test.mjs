import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {campaignFields,validatedCampaign} from './campaign.mjs';
import {businessEvent} from './business.mjs';
import {affiliateAction,legacyEvent} from './legacy.mjs';
import {analyticsResponse,isAnalyticsPath} from './edge.mjs';

test('Only registered campaign fields survive, including inside the frame',()=>{
 const fields=campaignFields('?utm_source=youtube&utm_medium=organic_video&utm_campaign=bpj-ai-service-01&email=SECRET&utm_content=SECRET');
 assert.deepEqual(fields,{campaign_source:'youtube',campaign_medium:'organic_video',campaign_name:'bpj-ai-service-01'});
 assert.deepEqual(campaignFields('?utm_source=PRIVATE_EMAIL&utm_medium=social&token=SECRET'),{campaign_medium:'social'});
 assert.deepEqual(campaignFields('?utm_source=reddit&utm_source=SECRET'),{});
 assert.deepEqual(validatedCampaign({...fields,filename:'SECRET',campaign_content:'SECRET'}),fields);
 assert.deepEqual(validatedCampaign({campaign_source:'PRIVATE_EMAIL'}),{});
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
function fixture({choice='',query='',privacy={},host='getecoback.com',path='/',title='Public title'}={}) {
 const listeners={},clicks=[],elements=[],posts=[],cookies=[],store=new Map(choice?[['fleet_ga4_choice_v1',choice]]:[]);
 const on=(name,fn)=>{(listeners[name]??=[]).push(fn);};
 const element=tag=>{const e={tag,dataset:{},children:[],hidden:false,append(...v){this.children.push(...v);},setAttribute(){},addEventListener(n,f){this[n]=f;},querySelector(){return this.children.find(x=>x.tag==='button');},focus(){},remove(){this.removed=true;}};if(tag==='iframe')e.contentWindow={postMessage:(d,origin)=>posts.push({d,origin})};elements.push(e);return e;};
 const script={dataset:{ga4Id:'G-E2V0Q9SJ9V',ga4Host:host,ga4Page:'https://'+host+path,ga4Title:title},src:'https://'+host+'/analytics-assets/consent.mjs?v=test'};
 const document={documentElement:{lang:'en'},referrer:'https://www.google.com/search?q=SECRET',body:element('body'),getElementById:()=>null,querySelector:s=>s.startsWith('script[')?script:null,createElement:element,addEventListener:(n,f)=>{if(n==='click')clicks.push(f);}};
 Object.defineProperty(document,'cookie',{get:()=>'_ga=old; fleet_'+host.replaceAll('.','_')+'_ga=new; unrelated=keep',set:v=>cookies.push(v)});
 const window={addEventListener:on,dataLayer:[]};window.self=window;window.top=window;
 window.gtag=function(){window.dataLayer.push(arguments);};
 const firstParty=[];const original=window.gtag;window.gtag=function(){firstParty.push(Array.from(arguments));original(...arguments);};
 const context={window,document,location:new URL('https://'+host+path+query),navigator:privacy,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},URL,URLSearchParams,Date,Set,campaignFields,businessEvent,affiliateAction,legacyEvent};
 vm.runInNewContext(consentSource.replaceAll('new URL(import.meta.url).search',"'?v=test'"),context);
 const frame=()=>elements.filter(e=>e.tag==='iframe'&&!e.removed).at(-1);
 const emit=(n,e)=>{for(const f of listeners[n]||[])f(e);};
 const click=value=>elements.find(e=>e.dataset.analyticsChoice===value)?.click();
 const handshake=()=>{const f=frame();emit('message',{source:f.contentWindow,origin:'https://'+host,data:{type:'fleet-ga4-ready'}});emit('message',{source:f.contentWindow,origin:'https://'+host,data:{type:'fleet-ga4-started'}});};
 const affiliateClick=()=>{const a={href:'https://www.amazon.de/s?k=SECRET&tag=getecoback-21',closest:s=>s==='#eb-herbst'?a:null};for(const f of clicks)f({isTrusted:true,target:{closest:()=>a}});window.gtag('event','affiliate_click',{source:'home-herbst',link_url:a.href});window.gtag('event','affiliate_click',{link_url:a.href});};
 return {window,posts,cookies,store,frame,click,handshake,affiliateClick,firstParty,emit,elements};
}
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


test('laundry name-only states respect opt-out, withdrawal, QA and no pre-consent replay',()=>{
 const path='/en/guide/dehumidifier-drying-clothes-cost.html',name='eco_laundry:compare:en:edited:measured:yes:compare:onsite:none';
 const emit=f=>f.emit('fleet:business',{detail:{name}});
 const f=fixture({choice:'denied',path});emit(f);assert.equal(f.posts.length,0);
 f.click('granted');f.handshake();assert.equal(f.posts.filter(p=>p.d.type==='fleet-ga4-business').length,0);
 emit(f);assert.equal(JSON.stringify(f.posts.filter(p=>p.d.type==='fleet-ga4-business').map(p=>p.d.detail)),JSON.stringify([{name}]));
 f.emit('fleet:business',{detail:{name,kwh:12345,referrer:'SECRET'}});assert.equal(f.posts.filter(p=>p.d.type==='fleet-ga4-business').length,1);
 f.click('denied');const count=f.posts.length;emit(f);assert.equal(f.posts.length,count);
 for(const query of ['?__probe=1','?__qa=1','?__ci=1']){const blocked=fixture({path,query});emit(blocked);assert.equal(blocked.posts.length,0);}
 for(const privacy of [{webdriver:true},{doNotTrack:'1'},{globalPrivacyControl:true}]){const blocked=fixture({path,privacy});emit(blocked);assert.equal(blocked.posts.length,0);}
});
