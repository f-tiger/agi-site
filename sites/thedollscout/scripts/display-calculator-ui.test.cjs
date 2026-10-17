const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const core=require('../js/collector-core.js');
const script=fs.readFileSync(require('node:path').join(__dirname,'../js/collector-tools.js'),'utf8');

class Element {
 constructor(){this.handlers=new Map();this.children=[];this.style={};this.hidden=true;}
 addEventListener(type,fn){this.handlers.set(type,[...(this.handlers.get(type)||[]),fn]);}
 emit(type,event={}){for(const fn of this.handlers.get(type)||[])fn(event);}
 append(child){this.children.push(child);}
 replaceChildren(){this.children=[];}
}
function calculator(options={}) {
 const defaults={width:40,depth:30,height:25,itemWidth:8,itemDepth:10,itemHeight:18,gap:1};
 const numbers=Object.entries(defaults).map(([name,value])=>Object.assign(new Element(),{name,value:String(value),defaultValue:String(value)}));
 const fields=Object.fromEntries(numbers.map(input=>[input.name,input]));
 for(const key of ['form','unit','rotate','data-result','data-message','data-count','data-layout','data-zero','data-plan','data-cap'])fields[key]=new Element();
 fields.unit.value='cm';fields.rotate.checked=true;
 fields.form.querySelectorAll=()=>numbers;
 const app={dataset:{collector:'display',normal:'{cols}/{rows}',rotated:'{cols}/{rows}',invalid:'invalid'},querySelector:selector=>fields[selector==='form'?'form':selector.startsWith('[name=')?selector.slice(7,-2):selector.slice(1,-1)]};
 const document={querySelector:()=>app,createElement:()=>new Element()};
 const sent=[],business=[],window={DSCollector:core,dispatchEvent:event=>business.push(event.detail)};
 window.top=window.self=window;
 const context={window,document,URLSearchParams,
  location:{hostname:'thedollscout.com',pathname:'/display-calculator',search:'',...options.location},
  localStorage:{getItem:()=>options.denied?'denied':null},
  navigator:{userAgent:'Mozilla/5.0',sendBeacon:(url,body)=>{sent.push(JSON.parse(body));return true;},...options.navigator},
  CustomEvent:class{constructor(type,detail){Object.assign(this,detail);}},
  FormData:class{constructor(){return [...numbers.map(input=>[input.name,input.value]),['unit',fields.unit.value]];}}
 };
 vm.runInNewContext(script,context);
 return {fields,sent,business,submit(){fields.form.emit('submit',{preventDefault(){}});},unit(value){fields.unit.value=value;fields.unit.emit('change',{target:fields.unit});}};
}
test('initial render, example submit, rotation and unit-only changes never count as own calculation',()=>{
 const ui=calculator();assert.equal(ui.sent.length,0);
 ui.submit();assert.equal(ui.fields['data-result'].hidden,false);assert.equal(ui.sent.length,0);
 ui.fields.rotate.checked=false;ui.submit();assert.equal(ui.sent.length,0);
 ui.unit('in');ui.submit();assert.equal(ui.sent.length,0);
 ui.unit('cm');ui.submit();assert.equal(ui.sent.length,0);assert.equal(ui.business.length,0);
});
test('changed dimensions emit only the bounded event; restoring the example stops counting',()=>{
 for(const pathname of ['/display-calculator','/de/display-calculator']) {
  const ui=calculator({location:{pathname}});ui.fields.width.value='50';ui.submit();
  assert.deepEqual(ui.sent,[{p:pathname,e:'display_calc',r:''}]);
  assert.equal(ui.business[0].name,'display_calc');assert.deepEqual(Object.keys(ui.business[0]),['name']);
  ui.fields.width.value='40';ui.submit();assert.equal(ui.sent.length,1);
  ui.unit('in');ui.fields.width.value='20';ui.submit();assert.equal(ui.sent.length,2);
 }
});
test('invalid dimensions do not count; a valid no-fit result still answers a user calculation',()=>{
 const ui=calculator();ui.fields.width.value='0';ui.submit();assert.equal(ui.sent.length,0);
 ui.fields.width.value='1';ui.submit();assert.equal(ui.sent.length,1);assert.equal(ui.fields['data-zero'].hidden,false);
});
test('own calculations retain preview, QA, automation and privacy exclusions',()=>{
 const cases=[{location:{hostname:'localhost'}},{location:{hostname:'tds.pages.dev'}},
  ...['ci','__ci','__probe','qa','__qa'].map(key=>({location:{search:'?'+key+'=1'}})),
  {location:{search:'?utm_source=verify'}},{navigator:{webdriver:true}},{navigator:{userAgent:'HeadlessChrome'}},
  {navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},{denied:true}];
 for(const options of cases){const ui=calculator(options);ui.fields.width.value='50';ui.submit();assert.equal(ui.sent.length,0);assert.equal(ui.business.length,0);}
});
