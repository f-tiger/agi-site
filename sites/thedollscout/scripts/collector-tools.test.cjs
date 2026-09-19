const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/collector-core.js');
const fs=require('node:fs');
const path=require('node:path');
const base={width:40,depth:30,height:25,itemWidth:8,itemDepth:10,itemHeight:18,gap:1,rotate:false};
test('gap-aware layout and rotation match the documented example',()=>{
 assert.equal(core.fit(base).count,8);
 assert.deepEqual(core.fit({...base,rotate:true}),{count:9,columns:3,rows:3,rotated:true,width:10,depth:8});
});
test('height, exact fits, and oversize footprints',()=>{
 assert.equal(core.fit({...base,itemHeight:26}).count,0);
 assert.equal(core.fit({...base,width:8,depth:10,height:18}).count,1);
 assert.equal(core.fit({...base,width:7,depth:9,rotate:true}).count,0);
 assert.equal(core.fit({...base,gap:0}).count,15);
});
test('unit changes preserve the physical layout',()=>{
 const inches=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,typeof v==='number'?v/2.54:v]));
 assert.equal(core.fit(inches).count,core.fit(base).count);
 assert.equal(core.fit({...inches,rotate:true}).count,9);
});
test('reject invalid dimensions instead of displaying NaN or Infinity',()=>{
 for(const patch of [{width:0},{depth:-1},{height:Infinity},{itemWidth:'oops'},{itemDepth:0},{gap:-1}]) assert.throws(()=>core.fit({...base,...patch}));
});
test('JSON backup round trip preserves Unicode and literal HTML as data',()=>{
 const items=[{name:'兔子 <img src=x>',series:'测试 "one"',quantity:2,status:'owned'},{name:'Wunsch',series:'',quantity:1,status:'wish'}];
 assert.deepEqual(core.restore(core.backup(items)),items);
 assert.deepEqual(core.restore(core.backup([])),[]);
});
test('reject malformed, mismatched, or oversized backups atomically',()=>{
 for(const data of [{}, {app:'wrong',version:1,items:[]},{app:'dollscout-collection',version:2,items:[]},{app:'dollscout-collection',version:1,items:[{name:'x',series:'',status:'owned',quantity:1.5}]},{app:'dollscout-collection',version:1,items:new Array(2001).fill({name:'x',series:'',status:'owned',quantity:1})}]) assert.throws(()=>core.restore(JSON.stringify(data)));
 assert.throws(()=>core.restore('{'));
});
test('CSV quotes delimiters, line breaks, and formula-like names safely',()=>{
 const csv=core.csv([{name:'=SUM(1,2)',series:'a,"b"\nc',status:'owned',quantity:1}]);
 assert.ok(csv.includes('"\'=SUM(1,2)"'));
 assert.ok(csv.includes('"a,""b""\nc"'));
});
test('every localized tool is in sitemap, URL list, machine text, and deployment checks',()=>{
 const root=path.join(__dirname,'..');
 const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const urls=fs.readFileSync(path.join(root,'scripts/urls.txt'),'utf8');
 const machine=fs.readFileSync(path.join(root,'scripts/build-llms-full.mjs'),'utf8');
 const workflow=fs.readFileSync(path.join(root,'../../.github/workflows/deploy-thedollscout.yml'),'utf8');
 for(const prefix of ['', 'de/']) for(const slug of ['collection-tracker','display-calculator','collector-guide']) {
  const route='/'+prefix+slug;
  assert.ok(sitemap.includes('https://thedollscout.com'+route));assert.ok(urls.includes('https://thedollscout.com'+route));assert.ok(machine.includes('"'+route+'"'));assert.ok(workflow.includes(route));
  const page=fs.readFileSync(path.join(root,prefix,slug+'.html'),'utf8');
  assert.ok(page.includes('href="https://thedollscout.com'+route+'"'));
  if(slug!=='collection-tracker') {assert.ok(page.includes(prefix?'amazon.de':'amazon.com'));assert.ok(page.includes(prefix?'getecoback-21':'ecoback0d-20'));}
 }
});
