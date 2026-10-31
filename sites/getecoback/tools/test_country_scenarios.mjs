import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../site/assets/country-categories.js', import.meta.url), 'utf8');
function run({choice = null, query = '', nav = {}, storageFailure = false} = {}) {
  const beacons = [], business = [], listeners = {}, details = [];
  for (let i = 0; i < 3; i++) details.push({open:false, addEventListener:(_, fn)=>details[i].toggle=fn});
  const state = {choice};
  const context = {
    URLSearchParams, Blob,
    location:{search:query, pathname:'/nl/ventilatie-of-luchtontvochtiger.html'},
    localStorage:{getItem:()=>{if(storageFailure) throw Error('storage blocked');return state.choice;}},
    navigator:{...nav, sendBeacon:(...args)=>beacons.push(args)},
    document:{body:{dataset:{countryMarket:'NL'}},referrer:'',querySelector:()=>null,
      querySelectorAll:()=>details,addEventListener:(name, fn)=>listeners[name]=fn},
    window:{dispatchEvent:event=>business.push(event.detail)},
    CustomEvent:class {constructor(name, options) {this.type=name;this.detail=options.detail;}},
  };
  vm.runInNewContext(source, context);
  const click = () => listeners.click({target:{closest:()=>({dataset:{countryAction:'scenario_open'},getAttribute:()=>'/nl/ventilatie-of-luchtontvochtiger.html#was-keuze'})}});
  return {beacons,business,details,state,click};
}

test('scenario reading is fixed, user initiated and does not count closing or reopening', () => {
  const r=run();
  assert.equal(r.business.length,0);
  r.details[0].toggle();assert.equal(r.business.length,0);
  r.details[0].open=true;r.details[0].toggle();
  assert.equal(r.business.length,1);
  assert.equal(JSON.stringify(r.business[0]),'{"name":"eco_country_scenario_read"}');
  r.details[0].open=false;r.details[0].toggle();r.details[0].open=true;r.details[0].toggle();
  assert.equal(r.business.length,1);
  r.click();assert.equal(JSON.stringify(r.business[1]),'{"name":"eco_country_scenario_open"}');
});

test('both telemetry paths honour initial refusal, privacy flags, QA, storage failure and withdrawal', () => {
  for(const config of [{choice:'denied'},{query:'?qa=1'},{nav:{doNotTrack:'1'}},{nav:{globalPrivacyControl:true}},{nav:{webdriver:true}},{storageFailure:true}]){
    const r=run(config);r.click();r.details[0].open=true;r.details[0].toggle();
    assert.equal(r.beacons.length,0,JSON.stringify(config));
    assert.equal(r.business.length,0,JSON.stringify(config));
  }
  const r=run();assert.equal(r.beacons.length,1);
  r.state.choice='denied';r.click();r.details[0].open=true;r.details[0].toggle();
  assert.equal(r.beacons.length,1);assert.equal(r.business.length,0);
});
