import test from 'node:test';import assert from 'node:assert/strict';
import {costScenario,explicitScenario,autoEventName,eventExcluded,scenarioText} from '../site/assets/auto-product.mjs';
test('conditional energy arithmetic and zero hours/tariff',()=>{
 const v=costScenario({watts:200,hours:8,rate:.35});assert.equal(v.energyKwh,1.6);assert(Math.abs(v.dailyCost-.56)<1e-10);assert(Math.abs(v.thirtyDayCost-16.8)<1e-10);
 assert.equal(costScenario({watts:10000,hours:24,rate:10}).dailyCost,2400);
 assert.equal(costScenario({watts:1,hours:0,rate:.35}).dailyCost,0);assert.equal(costScenario({watts:500,hours:24,rate:0}).dailyCost,0);
});
test('reject invalid and nonfinite calculation inputs',()=>{
 for(const key of ['watts','hours','rate'])for(const value of [NaN,Infinity,-Infinity,-1,'8',null,undefined,true,{},[]])assert.throws(()=>costScenario({...{watts:200,hours:8,rate:.35},[key]:value}),RangeError);
 for(const v of [{watts:0},{watts:10001},{hours:24.1},{rate:10.1}])assert.throws(()=>costScenario({watts:200,hours:8,rate:.35,...v}),RangeError);
});
test('only both explicit listed selections complete a scenario',()=>{
 for(const input of [{},{hours:'8'},{rate:'0.35'},{hours:'0',rate:'0.35'},{hours:8,rate:.35},{hours:'8',rate:'10'}])assert.equal(explicitScenario(input),false);
 for(const hours of ['4','8','12'])for(const rate of ['0.30','0.35','0.40'])assert.equal(explicitScenario({hours,rate}),true);
});
test('events fixed and privacy exclusions cover automated and QA use',()=>{
 assert.equal(autoEventName('calculate'),'eco_auto_calculate');assert.equal(autoEventName('revenue'),null);assert.equal(autoEventName('source_click'),null);
 for(const opt of [{dnt:'1'},{dnt:true},{gpc:true},{webdriver:true},{search:'?__qa=1'},{search:'?x=1&__probe=1'},{search:'?__ci'},{example:true}])assert.equal(eventExcluded(opt),true);
 assert.equal(eventExcluded({search:'?example=1',dnt:'0'}),false);
});
test('language and drain decisions preserve calculation limits and safe sharing',()=>{
 const result=costScenario({watts:200,hours:8,rate:.35});
 for(const [language,currency,pattern]of [['de','EUR',/0,56 €/],['en-GB','GBP',/£0.56/]]){
  const value=scenarioText(result,{language,currency,url:'https://getecoback.com/guide/test-product.html',drainage:'tank',example:true});assert.match(value.cost,pattern);assert.match(value.title,language==='de'?/Beispielrechnung/:/Example calculation/);assert.match(value.share,/test-product.html/);assert.match(value.limit,language==='de'?/keine garantierte/:/not.*guaranteed/);assert.match(value.drain,language==='de'?/Keine verlässliche/:/do not provide a reliable/);
 }
 assert.match(scenarioText(result,{drainage:'hose',drainVerified:false}).drain,/not confirmed/);assert.match(scenarioText(result,{drainage:'hose',drainVerified:true}).drain,/do not assume a built-in pump/);
 assert(!scenarioText(result,{url:'https://evil.example/private'}).share.includes('evil.example'));
 assert.throws(()=>scenarioText(result,{language:'de',currency:'GBP'}),RangeError);assert.throws(()=>scenarioText(result,{drainage:'send'}),RangeError);
});
