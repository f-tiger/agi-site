import test from 'node:test';
import assert from 'node:assert/strict';
import {careDecision,curtainDecision,CARE,CURTAIN,upkeepEvent,SOURCES} from '../site/assets/upkeep-decisions-rules.mjs';
function combinations(schema){return Object.entries(schema).reduce((a,[name,options])=>a.flatMap(v=>options.map(x=>({...v,[name]:x}))),[{}]);}
test('incomplete, forged and missing choices are not completions',()=>{
 for(const [rule,schema] of [[careDecision,CARE],[curtainDecision,CURTAIN]]){
  assert.equal(rule(null),null);assert.equal(rule({}),null);
  const full=combinations(schema)[0];
  for(const key of Object.keys(schema)){const partial={...full};delete partial[key];assert.equal(rule(partial),null);assert.equal(rule({...full,[key]:''}),null);assert.equal(rule({...full,[key]:'<script>'}),null);}
 }
});
test('all care branches avoid buying; smoke/burning takes precedence over model and cleaning',()=>{
 for(const v of combinations(CARE)){
  const r=careDecision(v);assert(r);assert.equal(r.shop,false);assert.match(r.source,/^https:\/\/de\.tineco\.com\//);
  if(v.symptom==='burnt'){assert.equal(r.code,'stop');assert.match(r.steps.join(' '),/nicht erneut testen oder laden/);}
  else if(v.model==='other')assert.equal(r.code,'identify');
  else if(v.symptom==='stops'){assert.equal(r.code,'service');assert.match(r.steps.join(' '),/Kein Akku-/);}
  else if(v.symptom==='worn'){assert.equal(r.code,'compatibility');assert.match(r.steps.join(' '),/Teilenummer/);}
 }
});
test('S7 smell evidence is not generalized to suction or tank diagnosis',()=>{
 for(const symptom of ['weak','tank'])for(const care of CARE.care)assert.equal(careDecision({model:'s7-flashdry',symptom,care}).code,'manual');
 const r=careDecision({model:'s7-flashdry',symptom:'odor',care:'not-yet'});assert.equal(r.code,'care');assert.equal(r.source,SOURCES.s7);assert.match(r.steps.join(' '),/vollständig trocknen/);
 assert.equal(careDecision({model:'s7-flashdry',symptom:'odor',care:'dry'}).code,'service');
});
test('curtain heater and opening conflicts both appear and override unknown location',()=>{
 for(const place of CURTAIN.place){const r=curtainDecision({place,radiator:'covered',opening:'blocked'});assert.equal(r.code,'conflict');assert.equal(r.shop,false);assert.match(r.steps.join(' '),/Heizkörper und Thermostat/);assert.match(r.steps.join(' '),/Fluchtweg/);}
});
test('curtain shopping is conditional; even clear geometry still requires measurement',()=>{
 for(const v of combinations(CURTAIN)){
  const r=curtainDecision(v);assert(r);assert.equal(r.shop,['door','window'].includes(v.place)&&v.radiator==='clear'&&v.opening==='clear');
  if(r.shop){assert.equal(r.code,'measure');assert.match(r.steps.join(' '),/messen/);assert.match(r.steps.join(' '),/keine Passformprüfung/);}
  if(Object.values(v).includes('unsure'))assert.equal(r.shop,false);
 }
});
test('only fixed, distinct view/example/decision/share events are admitted',()=>{
 assert.equal(upkeepEvent('example'),'eco_upkeep_example');assert.equal(upkeepEvent('decision'),'eco_upkeep_decision');assert.equal(upkeepEvent('https://secret.test/'),null);assert.equal(upkeepEvent('buy'),null);
});
