import test from 'node:test';
import assert from 'node:assert/strict';
import {engagementClock,countryScenarioEvent} from '../site/assets/public-engagement.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('Country actions accept exact NL route and fixed name only', () => {
  const pairs = [['/nl/wonen.html','eco_country_scenario_open'],['/nl/ventilatie-of-luchtontvochtiger.html','eco_country_scenario_read']];
  for (const [path,name] of pairs) {
    assert.equal(countryScenarioEvent(path,{name}),name);
    for (const key of ['query','url','answers','price','email']) assert.equal(countryScenarioEvent(path,{name,[key]:'PRIVATE'}),null);
    assert.equal(countryScenarioEvent(path+'?private=x',{name}),null);
    assert.equal(countryScenarioEvent('/account',{name}),null);
  }
  assert.equal(countryScenarioEvent('/nl/wonen.html',{name:'eco_country_scenario_read'}),null);
  assert.equal(countryScenarioEvent('/nl/wonen.html',Object.assign(Object.create({name:'eco_country_scenario_open'}),{email:'PRIVATE'})),null);
});

test('Country bridge uses existing frame, excludes opt-out and does not replay or duplicate actions', () => {
  const source=readFileSync(new URL('../site/assets/public-engagement.mjs',import.meta.url),'utf8').replaceAll('export function','function');
  let denied=false, current=null, observer;
  const listeners={}, dataLayer=[['config','G-E2V0Q9SJ9V']];
  const frame={src:'https://getecoback.com/analytics-assets/frame.html',hidden:true,isConnected:true,contentWindow:{dataLayer}};
  const window={addEventListener:(name,fn)=>{listeners[name]=fn;}}; window.top=window.self=window;
  const context={window,URL,URLSearchParams,Set,performance:{now:()=>0},navigator:{},location:{hostname:'getecoback.com',origin:'https://getecoback.com',pathname:'/nl/wonen.html',search:''},localStorage:{getItem:()=>denied?'denied':null},setInterval:()=>1,clearInterval:()=>{},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},document:{body:{},referrer:'',visibilityState:'visible',hasFocus:()=>true,addEventListener:()=>{},querySelector:selector=>selector.startsWith('script')?{dataset:{ga4Id:'G-E2V0Q9SJ9V',ga4Host:'getecoback.com',ga4Page:'https://getecoback.com/nl/wonen.html',ga4Title:'Wonen'}}:current}};
  vm.runInNewContext(source,context);
  const send=detail=>listeners['fleet:business']({detail});
  send({name:'eco_country_scenario_open'}); assert.equal(dataLayer.length,1,'frame unavailable: no event');
  current=frame; observer(); assert.equal(dataLayer.length,1,'no queued replay');
  denied=true; send({name:'eco_country_scenario_open'}); assert.equal(dataLayer.length,1);
  denied=false; send({name:'eco_country_scenario_open',email:'PRIVATE'}); assert.equal(dataLayer.length,1);
  send({name:'eco_country_scenario_open'}); send({name:'eco_country_scenario_open'});
  assert.equal(dataLayer.length,2); assert.equal(dataLayer[1][1],'eco_country_scenario_open');
  assert.equal(dataLayer[1][2].tool_id,'eco-country-nl');
  assert(!JSON.stringify(dataLayer).includes('PRIVATE'));
});

test('Only elapsed foreground time, once; background and scheduling/sleep gaps excluded', () => {
  const c=engagementClock(); c.sample(0,true); c.sample(5000,true); c.sample(8000,false);
  assert.equal(c.take(),8000); assert.equal(c.take(),0);
  c.sample(20000,false); c.sample(25000,true); c.sample(28000,false);
  assert.equal(c.take(),3000);
  c.sample(29000,true); c.sample(3600000,true); assert.equal(c.take(),0);
  c.sample(3602000,false); assert.equal(c.take(),2000);
});
test('Short intervals accumulate; opt-out/regrant reset has no replay', () => {
  const c=engagementClock(); c.sample(0,true); c.sample(600,false); assert.equal(c.take(),0);
  c.sample(900,true); c.sample(1500,false); assert.equal(c.take(),1200);
  c.sample(1800,true); c.sample(3800,false); c.reset(); assert.equal(c.take(),0);
  c.sample(10000,true); c.sample(12000,false); assert.equal(c.take(),2000);
});
