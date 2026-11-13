import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate as run,InputError} from '../site/assets/product-category-tools.mjs';

test('air planning is volume times the chosen air-change assumption, not room floor area',()=>{
  const r=run('luftreiniger',{length:'4',width:'5',height:'2.5',changes:'3'});
  assert.equal(r.volume,50);assert.equal(r.rate,150);
  assert.equal(run('luftreiniger',{length:'4',width:'5',height:'5',changes:'3'}).rate,300);
});
test('humidity comparison is a percentage-point difference, symmetric and bounded',()=>{
  assert.equal(run('hygrometer',{readingA:'48',readingB:'52'}).difference,4);
  assert.equal(run('hygrometer',{readingA:'52',readingB:'48'}).difference,4);
  assert.equal(run('hygrometer',{readingA:'0',readingB:'100'}).difference,100);
  assert.match(run('hygrometer',{readingA:'50',readingB:'50'}).lines.join(' '),/nicht, welches Gerät richtig/);
});
test('unknown or adverse surface and material conditions never become approval',()=>{
  for(const sensitive of ['no','yes','unknown'])assert.notEqual(run('dampfreiniger',{approval:'unknown',sensitive}).state,'review');
  assert.equal(run('dampfreiniger',{approval:'yes',sensitive:'yes'}).state,'stop');
  assert.equal(run('nass-trockensauger',{material:'hazard'}).state,'stop');
  assert.equal(run('nass-trockensauger',{material:'flammable'}).state,'stop');
  assert.equal(run('nass-trockensauger',{material:'unknown'}).state,'unknown');
  assert.throws(()=>run('nass-trockensauger',{material:'just guess'}),InputError);
});
test('glass area counts panes and sides without claiming battery time',()=>{
  const r=run('fenstersauger',{width:'.8',height:'1.2',panes:'6',sides:'2'});
  assert.ok(Math.abs(r.area-11.52)<1e-10);assert.match(r.lines.join(' '),/keine Akkulaufzeit/);
  assert.throws(()=>run('fenstersauger',{width:'1',height:'1',panes:'1.5',sides:'2'}),InputError);
});
test('consumable budget respects pack units, including zero consumables',()=>{
  const r=run('bodenstaubsauger',{bagPackPrice:'20',bagsPerPack:'4',bagsPerYear:'8',filterPrice:'15',filterChanges:'1'});
  assert.equal(r.annual,55);assert.equal(r.threeYears,165);
  assert.equal(run('bodenstaubsauger',{bagPackPrice:'20',bagsPerPack:'4',bagsPerYear:'0',filterPrice:'15',filterChanges:'0'}).annual,0);
});
test('water planning uses ml to litre conversion and own added demand',()=>{
  assert.equal(run('wasserkocher',{cups:'4',millilitres:'250',extra:'0'}).litres,1);
  assert.equal(run('wasserkocher',{cups:'2',millilitres:'200',extra:'100'}).litres,.5);
});
test('two zones have nonnegative offsets that finish at the same planning point',()=>{
  const r=run('heissluftfritteusen',{minutesA:'20',minutesB:'30',temperatureA:'180',temperatureB:'200'});
  assert.equal(r.startA,10);assert.equal(r.startB,0);assert.equal(r.startA+20,r.startB+30);assert.equal(r.differentTemperatures,true);
  const same=run('heissluftfritteusen',{minutesA:'15',minutesB:'15',temperatureA:'180',temperatureB:'180'});assert.equal(same.startA,0);assert.equal(same.startB,0);assert.equal(same.differentTemperatures,false);
});
test('grill plan uses both horizontal margins and checks both axes',()=>{
  const p={deviceWidth:'37',deviceDepth:'35',clearance:'10',spaceWidth:'80',spaceDepth:'70'};
  const r=run('kontaktgrills',p);assert.equal(r.requiredWidth,57);assert.equal(r.requiredDepth,55);assert.equal(r.fits,true);
  assert.equal(run('kontaktgrills',{...p,spaceDepth:'54.9'}).fits,false);
  assert.equal(run('kontaktgrills',{...p,spaceWidth:'57',spaceDepth:'55'}).fits,true);
});
test('invalid, omitted, infinite and negative values cannot create a numerical answer',()=>{
  for(const invalid of ['', ' ', '-1', 'Infinity', 'NaN', '1e309', true, null, undefined, {}, '0x10']){
    assert.throws(()=>run('wasserkocher',{cups:invalid,millilitres:'250',extra:'0'}),InputError,String(invalid));
  }
  assert.throws(()=>run('luftreiniger',{length:'4',width:'5',height:'0',changes:'3'}),InputError);
  assert.throws(()=>run('missing',{}),InputError);
});

test('catalog completion collector accepts no inputs and respects path and privacy boundaries',async()=>{
 const {default:worker}=await import('../src/worker.js');let writes=[];
 const env={EVENTS:{prepare:()=>({bind:(...args)=>({run:async()=>writes.push(args)})})}};
 const body={n:'tool_complete',p:'/produkte.html',r:'https://example.org/read?private=1',m:null};
 const send=(b,headers={})=>worker.fetch(new Request('https://getecoback.com/api/ev',{method:'POST',headers:{'user-agent':'Mozilla/5.0',...headers},body:JSON.stringify(b)}),env,{});
 assert.equal((await send(body)).status,200);assert.equal(writes.length,1);
 assert.equal(writes[0][3],'example.org');assert.equal(writes[0][4],'');
 for(const bad of [{...body,p:'/guide/luftentfeuchter-ratgeber.html'},{...body,m:{input:48}},{...body,m:[]},{...body,m:'private'}, {...body,input:'private'}])assert.equal((await send(bad)).status,400);
 for(const headers of [{'dnt':'1'},{'sec-gpc':'1'},{'user-agent':'getecoback-ci'},{'user-agent':'Googlebot'}])await send(body,headers);
 assert.equal(writes.length,1);
});
