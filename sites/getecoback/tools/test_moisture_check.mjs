import test from 'node:test';
import assert from 'node:assert/strict';
import {assess} from '../site/assets/moisture-check.mjs';
import {ventilationEffect} from '../site/assets/ventilation-effect.mjs';
import {ecoPublicBusinessEvent} from '../site/assets/public-engagement.mjs';
import worker from '../src/worker.js';
test('vapour comparison handles winter, humid summer, ambiguity and damage',()=>{
 const v={inside:20,rh:65,outside:5,outRh:90};
 assert.equal(assess(v).state,'air');assert.ok(Math.abs(assess(v).equivalent-33.6)<.5);
 assert.equal(assess({...v,outside:25,outRh:80}).state,'wetter');
 assert.equal(assess({...v,outside:20,outRh:65}).state,'uncertain');
 assert.equal(assess({...v,rh:30}).state,'dry');
 assert.equal(assess({...v,damage:true}).state,'cause');
 // Colder alone does not imply drying: near-saturated cooler air can add moisture.
 assert.equal(assess({...v,rh:40,outside:19,outRh:95}).state,'wetter');
 for(const bad of [NaN,Infinity,'',null,101])assert.throws(()=>assess({...v,rh:bad}));
});
test('fixed telemetry rejects inputs and wrong routes; QA and privacy excluded',async()=>{
 const detail={name:'eco_moisture_check'},p='/guide/luftfeuchtigkeit-senken.html';
 assert.equal(ecoPublicBusinessEvent(p,detail).tool_id,'eco-moisture-check');
 assert.equal(ecoPublicBusinessEvent(p,{...detail,rh:65}),null);
 assert.equal(ecoPublicBusinessEvent('/account',detail),null);
 let writes=0;const env={EVENTS:{prepare:()=>({bind:()=>({run:async()=>writes++})})}};
 const send=(body,headers={})=>worker.fetch(new Request('https://getecoback.com/api/ev',{method:'POST',headers:{'user-agent':'Mozilla/5.0',...headers},body:JSON.stringify(body)}),env,{});
 const body={n:detail.name,p,m:{}};assert.equal((await send(body)).status,200);assert.equal(writes,1);
 assert.equal((await send({...body,m:{rh:65}})).status,400);
 assert.equal((await send({...body,p:'/account'})).status,400);
 for(const headers of [{'dnt':'1'},{'sec-gpc':'1'},{'user-agent':'FleetAnalyticsReadOnlyProbe/1.0'}])await send(body,headers);
 assert.equal(writes,1);
});

test('the indoor before/after calculator and MCP use an identical measured change and no result when unconfirmed', async () => {
 const page='/guide/richtig-lueften-im-winter.html';
 const input={before_c:20,before_rh_pct:60,after_c:20,after_rh_pct:50,same_position:true};
 assert.equal(ventilationEffect(input),-1.72);
 assert.equal(ventilationEffect({...input,same_position:false}),null);
 assert.equal(ventilationEffect({...input,after_rh_pct:60}),0);
 assert.equal(ventilationEffect({...input,before_rh_pct:50,after_rh_pct:60}),1.72);
 for(const args of [input,{...input,same_position:false}]){
  const rpc = new Request('https://getecoback.com/mcp/v1?__probe=1',{
   method:'POST',headers:{'user-agent':'getecoback-ci/ventilation-effect','content-type':'application/json','x-probe':'1'},
   body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'lueften_messwirkung',arguments:args}}),
  });
  const {result}=await (await worker.fetch(rpc,{},{})).json();
  assert.equal(result.structuredContent.net_change_g_per_m3,ventilationEffect(args));
  assert.equal(result.structuredContent.guide_url,'https://getecoback.com'+page+'#lueften-vorher-nachher');
 }
 const detail={name:'eco_ventilation_effect'};
 assert.deepEqual(ecoPublicBusinessEvent(page,detail),{...detail,tool_id:'eco-ventilation-effect'});
 assert.equal(ecoPublicBusinessEvent('/account',detail),null);
 assert.equal(ecoPublicBusinessEvent(page,{...detail,before_c:20}),null);
});
