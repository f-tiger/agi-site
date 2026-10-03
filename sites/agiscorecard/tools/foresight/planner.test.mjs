import test from 'node:test';import assert from 'node:assert/strict';
import {scenarios,actions,counters,defaultChoices,makePlan,reviewDate,plannerMarkup} from '../../foresight-assets/planner.mjs';
import {goals,claims} from '../../foresight-assets/catalog.mjs';
import {normalize,blank,emptyNote,PRODUCT} from '../../foresight-assets/core.mjs';
test('all 324 bilingual combinations produce matching, portable tasks and actions',()=>{
 let count=0;
 for(const goal of goals)for(const scenario of scenarios[goal.id])for(const action of actions[goal.id])for(const counter of counters[goal.id])for(const lang of ['en','zh']){
  const result=makePlan({goal:goal.id,task:scenario.id,action:action.id,counter:counter.id,review:'7'},lang,new Date(2026,9,3,23,59));
  assert.equal(result.task,scenario.label[lang]);assert.ok(result.action.includes(scenario.input[lang]));assert.ok(result.action.includes(scenario.output[lang]));assert.equal(result.counter,counter.label[lang]);assert.equal(result.review,'2026-10-10');
  const values=blank();values.goal=goal.id;values.notes[claims[0].id]={...emptyNote(),...result};assert.deepEqual(normalize({version:1,product:PRODUCT,values}).values,values);count++;
 }
 assert.equal(count,324);
});
test('dropdown dates use calendar days across month/year/leap boundaries and validate choices',()=>{
 assert.equal(reviewDate('7',new Date(2026,11,28,23,59)),'2027-01-04');assert.equal(reviewDate('1',new Date(2028,1,28,23,59)),'2028-02-29');assert.equal(reviewDate('0',new Date(2026,9,3)),'2026-10-03');assert.equal(reviewDate('none'),'');
 assert.throws(()=>reviewDate('99'));assert.throws(()=>reviewDate('7','invalid'));
 const choice=defaultChoices('learn');assert.throws(()=>makePlan({...choice,task:'weekly-report'},'en'));assert.throws(()=>makePlan({...choice,action:'compare'},'en'));
});
test('all perspective forms are select-only and pair the plan with the actual perspective test',()=>{
 for(const claim of claims)for(const lang of ['en','zh']){
  const html=plannerMarkup(lang,goals,claim);assert.equal((html.match(/<select /g)||[]).length,6);assert.ok(!/<(?:input|textarea)\b/.test(html));assert.match(html,/data-plan-output="action"/);assert.ok(html.includes(claim[lang].test.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));assert.ok(!html.includes('undefined'));
 }
});
