import test from 'node:test';
import assert from 'node:assert/strict';
import {sealFit,heaterCost} from '../site/assets/demand-tools.mjs';
const base={width:60,height:140,window:'casement',material:'fabric',market:'none'};
test('perimeter boundaries, explicit shop and exact accessory length survive the handoff',()=>{
 assert.deepEqual(sealFit(base),{perimeter:400,size:400,route:'fabric',href:null});
 for(const [market,host,tag] of [['de','www.amazon.de','getecoback-21'],['us','www.amazon.com','ecoback0d-20']]){
  const result=sealFit({...base,width:80,height:180,market});
  assert.equal(result.perimeter,520);assert.equal(result.size,560);
  const url=new URL(result.href);assert.equal(url.hostname,host);assert.equal(url.searchParams.get('tag'),tag);
  assert.match(url.searchParams.get('k'),/560 cm/);assert.match(url.searchParams.get('k'),market==='de'?/Stoff/:/fabric/);
 }
 assert.equal(sealFit({...base,width:100,height:180}).size,560);
 assert.equal(sealFit({...base,width:101,height:180,market:'us'}).href,null);
});
test('unknown fit and invalid data never route to a generic substitute',()=>{
 for(const change of [{window:'roof'},{material:'panel'},{width:300,height:300}])assert.equal(sealFit({...base,...change,market:'de'}).href,null);
 for(const change of [{width:''},{height:0},{width:301},{height:Infinity},{market:'it'},{material:'x'}])assert.throws(()=>sealFit({...base,...change}),RangeError);
});
test('heater costs use the entered tariff, period and duty without invented savings',()=>{
 const args={watts:2000,hours:4,tariff:.4,days:30,duty:100};
 assert.deepEqual(heaterCost(args),{hour:.8,day:3.2,total:96,kwh:240});
 assert.equal(heaterCost({...args,duty:50}).total,48);
 assert.equal(heaterCost({...args,tariff:.3}).total,72);
 for(const change of [{watts:0},{hours:0},{tariff:0},{duty:0}])assert.equal(heaterCost({...args,...change}).total,0);
 for(const change of [{hours:25},{days:1.5},{duty:101},{tariff:-1},{watts:''}])assert.throws(()=>heaterCost({...args,...change}),RangeError);
});
