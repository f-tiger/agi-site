import test from 'node:test';
import assert from 'node:assert/strict';
import {engagementClock,countryScenarioEvent,ecoPublicBusinessEvent} from '../site/assets/public-engagement.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('Country actions accept exact NL route and fixed name only', () => {
  const pairs = [['/wohnen.html','eco_country_scenario_open'],['/nl/wonen.html','eco_country_scenario_open'],['/nl/ventilatie-of-luchtontvochtiger.html','eco_country_scenario_read']];
  for (const [path,name] of pairs) {
    assert.equal(countryScenarioEvent(path,{name}),name);
    for (const key of ['query','url','answers','price','email']) assert.equal(countryScenarioEvent(path,{name,[key]:'PRIVATE'}),null);
    assert.equal(countryScenarioEvent(path+'?private=x',{name}),null);
    assert.equal(countryScenarioEvent('/account',{name}),null);
  }
  assert.equal(countryScenarioEvent('/nl/wonen.html',{name:'eco_country_scenario_read'}),null);
  assert.equal(countryScenarioEvent('/nl/wonen.html',Object.assign(Object.create({name:'eco_country_scenario_open'}),{email:'PRIVATE'})),null);
});

test('DACH actions are bound to their own tool; no inputs, private paths or inherited actions', () => {
  const pairs = [
    ['/guide/heizdecke-stromverbrauch.html','eco-personal-warmth',['eco_warmth_example','eco_warmth_calculate','eco_warmth_share']],
    ['/guide/smarte-heizkoerperthermostate-lohnen-sich.html','eco-valve-fit',['eco_valve_result','eco_valve_official','eco_valve_share']],
    ['/guide/richtig-lueften-im-winter.html','eco-wall-moisture',['eco_dewpoint_example','eco_dewpoint_check']]
  ];
  for (const [path,tool_id,names] of pairs) for (const name of names) {
    assert.deepEqual(ecoPublicBusinessEvent(path,{name}),{name,tool_id});
    for (const other of pairs.filter(p=>p[0]!==path)) assert.equal(ecoPublicBusinessEvent(other[0],{name}),null);
    for (const key of ['watts','tariff','valve','answer','url','email']) assert.equal(ecoPublicBusinessEvent(path,{name,[key]:'PRIVATE'}),null);
    for (const invalid of [path+'?private=x',path+'#input','/account','/members',path.replace('/guide/','/en/guide/')]) assert.equal(ecoPublicBusinessEvent(invalid,{name}),null);
    assert.equal(ecoPublicBusinessEvent(path,Object.create({name})),null);
  }
  assert.deepEqual(ecoPublicBusinessEvent('/wohnen.html',{name:'eco_country_scenario_open'}),{name:'eco_country_scenario_open',tool_id:'eco-country-de'});
  assert.equal(ecoPublicBusinessEvent('/guide/richtig-lueften-im-winter.html',{name:'legacy:taupunkt_check'}),null);
});

test('Wall-moisture check separates untouched examples from edited calculations and suppresses automated examples', () => {
  const html=readFileSync(new URL('../site/guide/richtig-lueften-im-winter.html',import.meta.url),'utf8');
  const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('initialInputs'))[1];
  let click; const events=[];
  const fields={ta:{value:'20'},rh:{value:'50'},tk:{value:'14'},go:{addEventListener:(_n,fn)=>{click=fn;}},verdict:{style:{}},sub:{},res:{style:{}}};
  const window={dispatchEvent:e=>events.push(e.detail)};
  vm.runInNewContext(script,{window,document:{getElementById:id=>fields[id]},CustomEvent:class{constructor(_n,init){this.detail=init.detail;}}});
  click(); assert.equal(events.at(-1).name,'eco_dewpoint_example');
  fields.rh.value='60';click();assert.equal(events.at(-1).name,'eco_dewpoint_check');
  assert.equal(Object.keys(events.at(-1)).join(','),'name');
  window.__ecoToolExample=true;click();assert.equal(events.length,2);
  window.__ecoToolExample=false;fields.rh.value='200';click();assert.equal(events.length,2);
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
