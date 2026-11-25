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
    ['/guide/richtig-lueften-im-winter.html','eco-wall-moisture',['eco_dewpoint_example','eco_dewpoint_check']],
    ['/guide/fenster-beschlagen-innen.html','eco-window-condensation',['eco_window_dewpoint_calculate','eco_window_condensation_check','eco_window_width_open']],
    ['/guide/klimaanlage-wann-kaufen.html','eco-cooling-offer',['eco_cooling_offer_check']],
    ['/guide/luftbefeuchter-ratgeber.html','eco-oskar-stock',['eco_oskar_stock_check']],
    ['/guide/fensterabdichtung-selber-bauen.html','eco-panel-cutout',['eco_panel_cutout_check']],
    ['/guide/thermovorhang-ratgeber.html','eco-curtain-panels',['eco_curtain_panel_check']],
    ['/waeschetrockner-oder-luftentfeuchter.html','eco-laundry-season',['eco_laundry_season_check']],
    ['/produkte.html','eco-window-width',['eco_window_width_check']]
  ];
  for (const [path,tool_id,names] of pairs) for (const name of names) {
    assert.deepEqual(ecoPublicBusinessEvent(path,{name}),{name,tool_id});
    for (const other of pairs.filter(p=>p[0]!==path)) assert.equal(ecoPublicBusinessEvent(other[0],{name}),null);
    for (const key of ['watts','tariff','valve','answer','url','email']) assert.equal(ecoPublicBusinessEvent(path,{name,[key]:'PRIVATE'}),null);
    for (const invalid of [path+'?private=x',path+'#input','/account','/members','/en'+path]) assert.equal(ecoPublicBusinessEvent(invalid,{name}),null);
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

test('cellar model navigation is page-scoped and carries no model or household data', () => {
  const page = '/guide/luftentfeuchter-keller.html';
  const detail = {name:'eco_cellar_model_open'};
  assert.deepEqual(ecoPublicBusinessEvent(page, detail), {...detail, tool_id:'eco-cellar-drain'});
  assert.equal(ecoPublicBusinessEvent('/guide/luftentfeuchter-ratgeber.html', detail), null);
  assert.equal(ecoPublicBusinessEvent(page, {...detail, model:'private'}), null);
});

test('Offline MCPB install action accepts only exact public routes and a fixed name', () => {
  const detail = {name:'eco_mcpb_setup_open'};
  for (const path of ['/mcp.html','/for-agents.html']) {
    assert.deepEqual(ecoPublicBusinessEvent(path,detail),{...detail,tool_id:'eco-offline-mcpb'});
    for (const key of ['href','url','query','tool_id','version','email']) {
      assert.equal(ecoPublicBusinessEvent(path,{...detail,[key]:'PRIVATE'}),null,key);
    }
    assert.equal(ecoPublicBusinessEvent(path,Object.create(detail)),null);
  }
  for (const path of ['/','/mcp','/for-agents.md','/tools.html','/mcp.html?query=PRIVATE','/for-agents.html#offline','/account']) {
    assert.equal(ecoPublicBusinessEvent(path,detail),null,path);
  }
});

test('Offline MCPB install action runs once from a trusted marked link, without carrying link information', () => {
  const source = readFileSync(new URL('../site/assets/public-engagement.mjs',import.meta.url),'utf8').replaceAll('export function','function');
  const origin = 'https://getecoback.com';
  const id = 'G-E2V0Q9SJ9V';
  const name = 'eco_mcpb_setup_open';
  const target = 'https://github.com/f-tiger/getecoback-mcp#connect';
  const marker = 'a[data-eco-mcpb-setup-open]';

  function install(pathname, search = '?query=PRIVATE', denied = false) {
    const listeners = {};
    const docListeners = {};
    const dataLayer = [['config',id]];
    const frame = {src:origin+'/analytics-assets/frame.html',hidden:true,isConnected:true,contentWindow:{dataLayer}};
    const loader = {dataset:{ga4Id:id,ga4Host:'getecoback.com',ga4Page:origin+pathname,ga4Title:'MCP setup'}};
    const window = {
      addEventListener:(type,listener)=>{listeners[type]=listener;},
      dispatchEvent:event=>listeners[event.type]?.(event),
    };
    window.top=window.self=window;
    const document = {
      body:{},referrer:'https://example.test/private?query=PRIVATE',visibilityState:'visible',hasFocus:()=>true,
      addEventListener:(type,listener)=>{docListeners[type]=listener;},
      querySelector:selector=>selector.startsWith('script')?loader:frame,
    };
    vm.runInNewContext(source,{
      window,document,URL,URLSearchParams,Set,performance:{now:()=>0},navigator:{},
      location:{hostname:'getecoback.com',origin,pathname,search},
      localStorage:{getItem:()=>denied?'denied':null},setInterval:()=>1,clearInterval:()=>{},
      MutationObserver:class{observe(){}},
      CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},
    });
    return {
      dataLayer,
      forged:()=>window.dispatchEvent({type:'fleet:business',detail:{name}}),
      click:(isTrusted,marked,href=target)=>docListeners.click?.({
        isTrusted,button:0,
        target:{closest:selector=>marked&&[marker,marker+`[href="${href}"]`].includes(selector)
          ? {href,dataset:{private:'PRIVATE'},getAttribute:attr=>attr==='href'?href:null} : null},
      }),
    };
  }

  for (const path of ['/mcp.html','/for-agents.html']) {
    const {dataLayer,forged,click} = install(path);
    forged();
    click(false,true);
    click(true,false);
    click(true,true,'https://example.test/unrelated');
    assert.equal(dataLayer.length,1,'No synthetic or unrelated action on '+path);
    click(true,true);
    click(true,true);
    assert.equal(dataLayer.length,2,'At most one real opening per page on '+path);
    assert.equal(dataLayer[1][0],'event');
    assert.equal(dataLayer[1][1],name);
    assert.deepEqual({...dataLayer[1][2]},{
      send_to:id,page_location:origin+path,page_title:'MCP setup',page_referrer:'https://example.test/',
      tool_id:'eco-offline-mcpb',transport_type:'beacon',
    });
  }

  for (const testCase of [['/tools.html'],['/mcp.html','?__probe=1'],['/for-agents.html','',true]]) {
    const {dataLayer,click} = install(...testCase);
    click(true,true);
    assert.equal(dataLayer.length,1,'Scope and privacy exclusions: '+testCase.join(' '));
  }
});
