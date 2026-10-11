const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../js/collector-core.js');

const figure={name:'Carrot',series:'Sonny Angel Vegetable Series',seriesId:'sonny-angel-vegetable-series',styleId:core.styleId('Carrot')};
const manual=(overrides={})=>({name:figure.name,series:figure.series,status:'owned',quantity:4,...overrides});
function memory(raw=null) {
 return {raw,writes:0,failRead:false,failWrite:false,
  getItem(key){assert.equal(key,core.COLLECTION_KEY);if(this.failRead)throw Error('security');return this.raw;},
  setItem(key,value){assert.equal(key,core.COLLECTION_KEY);if(this.failWrite)throw Error('quota');this.raw=value;this.writes++;}
 };
}
function apply(storage,owned) {
 const snapshot=core.readCollection(storage);
 const result=core.setSeriesOwned(snapshot.items,figure,owned);
 return core.writeCollection(storage,result.items,snapshot.raw);
}

test('legacy v1 restores unchanged; precise series/name migration retains all quantities',()=>{
 const originals=[manual(),manual({status:'wish',quantity:7}),manual({series:'My notes'}),manual({series:'Sonny Angel Fruit Series'})];
 const store=memory(core.backup(originals));
 assert.deepEqual(core.readCollection(store).items,originals);
 assert.equal(store.writes,0);
 const linked=apply(store,true).items;
 assert.deepEqual(linked[0],{...originals[0],seriesId:figure.seriesId,styleId:figure.styleId});
 assert.deepEqual(linked.slice(1),originals.slice(1));
 assert.deepEqual(core.restore(core.backup(linked)),linked);
});

test('stable style IDs ignore locale, ordering, Unicode form and whitespace, not punctuation',()=>{
 assert.equal(core.styleId('  CAFÉ  '),core.styleId('cafe\u0301'));
 assert.equal(core.styleId('SMISKI  Reading'),core.styleId('smiski reading'));
 assert.notEqual(core.styleId('A-B'),core.styleId('A B'));
 const items=[{...manual(),...figure}];
 assert.equal(core.seriesOwned(items,{...figure,name:'A renamed display label',series:'Translated title'}),true);
 assert.equal(core.seriesOwned(items,{...figure,seriesId:'different-series'}),false);
});

test('uncheck/recheck preserves duplicate quantities and independent wishes without growth',()=>{
 const originals=[manual(),manual({quantity:9}),manual({status:'wish',quantity:7})];
 const store=memory(core.backup(originals));
 for(let n=0;n<8;n++) {
  const off=apply(store,false).items;
  assert.deepEqual(off.map(i=>i.quantity),[4,9,7]);
  assert.ok(off.slice(0,2).every(i=>i.status==='wish'&&i.checklistMissing));
  assert.deepEqual(off[2],originals[2]);
  const on=apply(store,true).items;
  assert.deepEqual(on.map(i=>i.quantity),[4,9,7]);
  assert.deepEqual(on.map(i=>i.status),['owned','owned','wish']);
  assert.ok(on.every(i=>!i.checklistMissing));
 }
});

test('selecting an ordinary wish creates one owned item and never consumes the wishlist',()=>{
 const wish=manual({status:'wish',quantity:8});
 const store=memory(core.backup([wish]));
 assert.deepEqual(apply(store,true).items[0],wish);
 for(let n=0;n<6;n++){apply(store,false);apply(store,true);}
 const items=core.readCollection(store).items;
 assert.equal(items.length,2);
 assert.deepEqual(items[0],wish);
 assert.equal(items[1].quantity,1);
});

test('linked v1 JSON keeps identities and undo state; CSV remains compatible',()=>{
 const items=core.setSeriesOwned([manual()],figure,false).items;
 assert.deepEqual(core.restore(core.backup(items)),items);
 assert.match(core.csv(items),/Name,Series,Status,Quantity/);
 assert.match(core.csv(items),/"wish","4"/);
 for(const patch of [{seriesId:undefined},{styleId:'bad/id'},{checklistMissing:false},{status:'owned'}]) {
  assert.throws(()=>core.normalizeItem({...items[0],...patch}));
 }
});

test('malformed or unreadable storage is never treated as empty or silently overwritten',()=>{
 for(const raw of ['', '{','null',JSON.stringify({app:'wrong',version:1,items:[]})]) {
  const store=memory(raw);
  assert.throws(()=>core.readCollection(store));
  assert.throws(()=>core.writeCollection(store,[manual()],raw));
  assert.equal(store.raw,raw);
  assert.equal(store.writes,0);
 }
 const store=memory(core.backup([manual()]));store.failRead=true;
 assert.throws(()=>core.readCollection(store));
 assert.throws(()=>core.writeCollection(store,[],store.raw));
 assert.equal(store.writes,0);
 const valid=memory(core.backup([manual()]));
 assert.throws(()=>core.writeCollection(valid,new Array(1),valid.raw));
 assert.equal(valid.writes,0);
});

test('failed storage writes and stale snapshots preserve the latest valid collection',()=>{
 const store=memory(core.backup([manual()])),first=core.readCollection(store);
 store.failWrite=true;
 assert.throws(()=>core.writeCollection(store,[],first.raw));
 assert.equal(store.raw,first.raw);
 store.failWrite=false;store.raw=core.backup([manual({quantity:16})]);
 const latest=store.raw;
 assert.throws(()=>core.writeCollection(store,[],first.raw),/conflict/);
 assert.equal(store.raw,latest);
 assert.equal(store.writes,0);
});

test('explicit backup restore can repair malformed storage; normal writes remain blocked',()=>{
 const store=memory('{');
 assert.throws(()=>core.writeCollection(store,[],store.raw));
 assert.deepEqual(core.writeCollection(store,[manual()],store.raw,true).items,[manual()]);
 assert.equal(core.setSeriesOwned(core.readCollection(store).items,figure,true).changed,false);
 assert.throws(()=>core.setSeriesOwned(Array(core.MAX_ITEMS).fill(manual({series:'Other'})),figure,true),/limit/);
});

class Events {
 constructor(){this.handlers=new Map();}
 addEventListener(type,fn){this.handlers.set(type,[...(this.handlers.get(type)||[]),fn]);}
 emit(type,event={}){for(const fn of this.handlers.get(type)||[])fn(event);}
}
function checklist() {
 const root=new Events(),events=new Events(),page=new Events();page.hidden=false;
 const labels={seriesId:figure.seriesId,title:figure.series,ready:'ready',saved:'saved',synced:'synced',storageError:'storage error',conflict:'conflict'};
 const boxes=['Carrot','Tomato'].map(name=>({dataset:{styleId:core.styleId(name)},nextElementSibling:{textContent:name},checked:false,disabled:true}));
 const fields=Object.fromEntries(['data-storage-status','data-owned','data-missing','data-copy-status'].map(key=>['['+key+']',{textContent:''}]));
 fields['[data-checklist-labels]']={textContent:JSON.stringify(labels)};
 fields['[data-checklist-copy]']=new Events();
 root.querySelector=selector=>fields[selector];root.querySelectorAll=()=>boxes;
 return {root,events,page,boxes,fields,change(index,checked){boxes[index].checked=checked;root.emit('change',{target:boxes[index]});}};
}

test('checklist loads legacy ownership, refreshes across languages and only records committed changes',async()=>{
 const {initSeriesChecklist}=await import('../collector-assets/series-ui.mjs');
 const store=memory(core.backup([manual()])),ui=checklist(),recorded=[];
 const record=name=>{assert.ok(core.readCollection(store));recorded.push(name);};
 initSeriesChecklist(ui.root,record,{core,storage:()=>store,events:ui.events,page:ui.page});
 assert.equal(ui.boxes[0].checked,true);
 assert.equal(ui.fields['[data-owned]'].textContent,1);
 assert.equal(store.writes,0);assert.deepEqual(recorded,[]);
 ui.change(0,false);
 assert.deepEqual(recorded,['collector_series_save']);
 assert.equal(core.readCollection(store).items[0].quantity,4);
 const translated=checklist();
 initSeriesChecklist(translated.root,record,{core,storage:()=>store,events:translated.events,page:translated.page});
 assert.equal(translated.boxes[0].checked,false);
 translated.change(0,true);
 ui.events.emit('storage',{key:core.COLLECTION_KEY});
 assert.equal(ui.boxes[0].checked,true);
 assert.equal(ui.fields['[data-storage-status]'].textContent,'synced');
 assert.deepEqual(recorded,['collector_series_save','collector_series_save']);
 ui.change(0,true); // A duplicate change event is not another completion.
 assert.equal(recorded.length,2);
});

test('checklist reads newer tracker quantities before saving and updates on focus/clear',async()=>{
 const {initSeriesChecklist}=await import('../collector-assets/series-ui.mjs');
 const store=memory(core.backup([manual()])),ui=checklist();
 initSeriesChecklist(ui.root,()=>{},{core,storage:()=>store,events:ui.events,page:ui.page});
 store.raw=core.backup([manual({quantity:23}),manual({name:'Other',status:'wish',quantity:6})]);
 ui.change(0,false);
 assert.deepEqual(core.readCollection(store).items.map(i=>i.quantity),[23,6]);
 store.raw=null;ui.events.emit('storage',{key:null});
 assert.equal(ui.fields['[data-owned]'].textContent,0);
 store.raw=core.backup([manual()]);ui.events.emit('pageshow');
 assert.equal(ui.boxes[0].checked,true);
 store.raw=core.backup([]);ui.events.emit('focus');
 assert.equal(ui.boxes[0].checked,false);
});

test('checklist rolls back a quota failure and recovers from malformed storage without a completion',async()=>{
 const {initSeriesChecklist}=await import('../collector-assets/series-ui.mjs');
 const store=memory(core.backup([manual()])),ui=checklist(),recorded=[];
 initSeriesChecklist(ui.root,name=>recorded.push(name),{core,storage:()=>store,events:ui.events,page:ui.page});
 const original=store.raw;store.failWrite=true;ui.change(0,false);
 assert.equal(store.raw,original);assert.equal(ui.boxes[0].checked,true);
 assert.equal(ui.fields['[data-storage-status]'].textContent,'storage error');
 assert.deepEqual(recorded,[]);
 store.failWrite=false;store.raw='{';ui.events.emit('storage',{key:core.COLLECTION_KEY});
 assert.equal(ui.boxes[0].disabled,true);
 assert.equal(ui.fields['[data-owned]'].textContent,'—');
 ui.change(1,true);assert.equal(store.raw,'{');assert.equal(store.writes,0);
 store.raw=original;ui.events.emit('storage',{key:core.COLLECTION_KEY});
 assert.equal(ui.boxes[0].disabled,false);
 assert.equal(ui.boxes[0].checked,true);assert.deepEqual(recorded,[]);
});
