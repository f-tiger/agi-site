const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const core=require('../js/collector-core.js');
const script=fs.readFileSync(require('node:path').join(__dirname,'../js/collector-tools.js'),'utf8');

class Element {
 constructor(){this.handlers=new Map();this.children=[];this.value='';this.textContent='';}
 addEventListener(type,fn){this.handlers.set(type,[...(this.handlers.get(type)||[]),fn]);}
 emit(type,event={}){for(const fn of this.handlers.get(type)||[])fn(event);}
 append(...elements){this.children.push(...elements);}
 replaceChildren(){this.children=[];}
 reset(){}
 focus(){}
 click(){this.emit('click');}
}
const linked={name:'Carrot',series:'Sonny Angel Vegetable Series',status:'owned',quantity:4,seriesId:'sonny-angel-vegetable-series',styleId:'carrot'};
function tracker(initial=[linked],options={}) {
 const app=new Element(),window=new Element(),document=new Element();
 const fields=Object.fromEntries(['form','data-message','data-save','data-cancel','data-filter','data-search','data-items','data-summary','data-empty','data-backup','data-csv','data-import','name','series','quantity','status'].map(key=>[key,new Element()]));
 fields['data-filter'].value='all';
 app.dataset=Object.fromEntries(['add','update','edit','remove','owned','wish','saved','synced','storageError','conflict','invalid','confirmRemove'].map(key=>[key,key]));
 app.dataset.collector='collection';app.dataset.summary='{owned} / {wish}';
 app.querySelector=selector=>fields[selector==='form'?'form':selector.startsWith('[name=')?selector.slice(7,-2):selector.slice(1,-1)];
 document.querySelector=()=>app;document.createElement=()=>new Element();
 let raw=core.backup(initial),writes=0,denied=options.denied;
 const storage={getItem:key=>key===core.COLLECTION_KEY?raw:denied?'denied':null,setItem:(key,value)=>{assert.equal(key,core.COLLECTION_KEY);raw=value;writes++;}};
 window.DSCollector=core;window.top=window.self=window;
 const sent=[],business=[];
 window.dispatchEvent=event=>business.push(event.detail);
 const location={hostname:'thedollscout.com',pathname:'/collection-tracker',search:'',...options.location};
 const navigator={userAgent:'Mozilla/5.0',sendBeacon:(url,body)=>{sent.push({url,body:JSON.parse(body)});return true;},...options.navigator};
 const context={window,document,localStorage:storage,location,navigator,URLSearchParams,URL,Blob,setTimeout:()=>{},confirm:()=>true,
  CustomEvent:class{constructor(type,detail){this.type=type;Object.assign(this,detail);}},
  FormData:class{constructor(){return ['name','series','quantity','status'].map(key=>[key,fields[key].value]);}}
 };
 vm.runInNewContext(script,context);
 const edit=()=>fields['data-items'].children[0].children[2].children[0].click();
 const submit=()=>fields.form.emit('submit',{preventDefault(){},currentTarget:fields.form});
 return {fields,window,document,sent,business,edit,submit,get raw(){return raw;},set raw(value){raw=value;},get writes(){return writes;},deny(){denied=true;}};
}

test('tracker quantity edits retain series identity; explicit wishlist edits clear restore marker',()=>{
 const ui=tracker([{...linked,status:'wish',checklistMissing:true}]);
 ui.edit();ui.fields.quantity.value='19';ui.submit();
 const [item]=core.restore(ui.raw);
 assert.deepEqual(item,{...linked,status:'wish',quantity:19});
 assert.equal(ui.sent.length,1);
 assert.deepEqual(ui.sent[0].body,{p:'/collection-tracker',e:'collection_save',r:''});
 assert.equal(ui.business[0].name,'collection_save');
 ui.edit();ui.fields.name.value='My own figure';ui.submit();
 assert.equal(core.restore(ui.raw)[0].seriesId,undefined);
});

test('tracker rejects stale edits, shows fresh quantities and does not emit a save',()=>{
 const ui=tracker();ui.edit();ui.fields.quantity.value='2';
 ui.raw=core.backup([{...linked,quantity:27}]);
 const newer=ui.raw;ui.submit();
 assert.equal(ui.raw,newer);assert.equal(ui.writes,0);assert.equal(ui.sent.length,0);
 assert.equal(ui.fields['data-message'].textContent,'conflict');
 ui.edit();assert.equal(ui.fields.quantity.value,27);
});

test('tracker storage recovery reenables safe edits and clear/focus events refresh the ledger',()=>{
 const ui=tracker();ui.raw='{';ui.window.emit('storage',{key:core.COLLECTION_KEY});
 assert.equal(ui.fields['data-message'].textContent,'storageError');
 ui.edit();ui.submit();assert.equal(ui.raw,'{');assert.equal(ui.writes,0);
 ui.raw=core.backup([{...linked,quantity:11}]);ui.window.emit('storage',{key:core.COLLECTION_KEY});
 ui.edit();ui.fields.quantity.value='12';ui.submit();
 assert.equal(core.restore(ui.raw)[0].quantity,12);
 ui.raw=null;ui.window.emit('storage',{key:null});
 assert.equal(ui.fields['data-items'].children.length,0);
 ui.raw=core.backup([linked]);ui.window.emit('focus');
 assert.equal(ui.fields['data-items'].children.length,1);
});

test('tracker completions respect QA, preview, automation, DNT, GPC and stored opt-out',()=>{
 const cases=[{location:{hostname:'localhost'}},{location:{hostname:'tds.pages.dev'}},
  ...['ci','__ci','__probe','qa','__qa'].map(key=>({location:{search:'?'+key+'=1'}})),
  {location:{search:'?utm_source=verify'}},{navigator:{webdriver:true}},{navigator:{userAgent:'HeadlessChrome'}},
  {navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},{denied:true}];
 for(const options of cases) {
  const ui=tracker([linked],options);ui.edit();ui.fields.quantity.value='5';ui.submit();
  assert.equal(core.restore(ui.raw)[0].quantity,5);
  assert.equal(ui.sent.length,0,JSON.stringify(options));assert.equal(ui.business.length,0);
 }
 const ui=tracker();ui.deny();ui.edit();ui.submit();assert.equal(ui.sent.length,0);
});
