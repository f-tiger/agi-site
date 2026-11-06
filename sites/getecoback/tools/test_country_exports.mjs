import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const model=require('../site/js/country-model.js');
const source=readFileSync(new URL('../site/js/country-ui.js',import.meta.url),'utf8');
const routes={de:'/rechner.html',en:'/en/solution-calculator.html',es:'/es/calculadora.html',fr:'/fr/calculateur.html',it:'/it/calcolatore.html'};
const differences={de:'Jährliche Betriebskosten-Differenz',en:'Annual running-cost difference',es:'Diferencia anual de funcionamiento',fr:'Différence annuelle de fonctionnement',it:'Differenza annua di gestione'};

// Run the shipped UI and model together. Capture the actual canvas text without
// opening the network, sending telemetry or publishing the generated image.
function calculator(lang,{comparable=false,...changes}={}){
 const html=readFileSync(new URL('../site'+routes[lang],import.meta.url),'utf8');
 const copy=JSON.parse(html.match(/<script id="country-copy" type="application\/json">(.*?)<\/script>/s)[1]);
 const values={rate:.3,hours:8,days:100,wattsA:1000,wattsB:1000,heat:10000,effA:1,effB:3,costA:0,costB:5000,grant:0,maintenanceA:0,maintenanceB:0,years:10,...changes};
 const fields=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{name,value:String(value),type:'number'}]));
 const node=()=>({textContent:'',innerHTML:'',hidden:false,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},classList:{toggle(){}},replaceChildren(){this.innerHTML='';},click(){}});
 const ids=Object.fromEntries(['country-form','mode','result','form-error','share-status','share-link','country-copy','comparable','share','copy-forum','download-card','print'].map(id=>[id,node()]));
 ids['country-form'].querySelectorAll=()=>Object.values(fields);
 ids['country-form'].elements=fields;ids.mode.value='heat';ids.comparable.checked=comparable;
 ids['country-copy'].textContent=JSON.stringify(copy);
 const images=[];let downloads=0;
 const document={documentElement:{lang},title:'Scenario calculator',referrer:'',getElementById:id=>ids[id],querySelectorAll:()=>[],createElement(tag){
  if(tag!=='canvas')return {...node(),click(){downloads++;}};
  const lines=[];images.push(lines);
  return {getContext:()=>({fillRect(){},fillText(text){lines.push(text);}}),toDataURL:()=>''};
 }};
 const window={EcoCountryModel:model,__ecoToolExample:true,addEventListener(){}};
 const location={href:'https://getecoback.com'+routes[lang],pathname:routes[lang],search:''};
 vm.runInNewContext(source,{document,window,EcoCountryModel:model,location,navigator:{},Intl,URL,URLSearchParams,history:{replaceState(){}}});
 return {copy,ids,images,get downloads(){return downloads;},export(){ids['download-card'].onclick();},edit(key,value){fields[key].value=String(value);ids['country-form'].listeners.input();},compare(value){ids.comparable.checked=value;ids['country-form'].listeners.change();}};
}

for(const lang of Object.keys(routes)){
 test(`${lang}: non-comparable PNG keeps cost difference and uncertainty`,()=>{
  const c=calculator(lang);c.export();
  assert.equal(c.downloads,1);
  assert.ok(c.ids.result.innerHTML.includes(differences[lang]));
  assert.ok(c.ids.result.innerHTML.includes(c.copy.notComparable));
  assert.ok(c.images[0].some(line=>line.startsWith(differences[lang]+': ')));
  assert.ok(c.images[0].includes(c.copy.payback+': '+c.copy.notComparable));
  assert.ok(!c.images[0].includes(c.copy.payback+': '+c.copy.noPayback));
 });

 test(`${lang}: comparable PNG distinguishes no payback, positive payback and immediate payback`,()=>{
  for(const [changes,expected]of [[{effB:1},'none'],[{rate:0},'none'],[{},'positive'],[{costB:0},'immediate']]){
   const c=calculator(lang,{comparable:true,...changes});c.export();
   const pay=expected==='none'?c.copy.noPayback:expected==='immediate'?c.copy.immediate:'2.5 '+c.copy.years;
   assert.ok(c.ids.result.innerHTML.includes(pay));
   assert.ok(c.images[0].some(line=>line.startsWith(c.copy.saving+': ')));
   assert.ok(c.images[0].includes(c.copy.payback+': '+pay));
   assert.ok(!c.images[0].join(' ').includes('undefined'));
  }
 });

 test(`${lang}: invalid edits cannot export stale results; valid edits recalculate`,()=>{
  const c=calculator(lang,{comparable:true});c.export();assert.equal(c.downloads,1);
  for(const value of ['',-1,1e99]){
   c.edit('rate',value);c.export();
   assert.equal(c.downloads,1);
   assert.equal(c.images.length,1);
   assert.equal(c.ids['form-error'].textContent,c.copy.invalid);
  }
  c.edit('rate',.6);c.export();assert.equal(c.downloads,2);
  assert.ok(c.images[1].includes(c.copy.payback+': 1.3 '+c.copy.years));
  assert.ok(!c.images[1].includes(c.copy.payback+': 2.5 '+c.copy.years));
  c.compare(false);c.export();assert.equal(c.downloads,3);
  assert.ok(c.images[2].includes(c.copy.payback+': '+c.copy.notComparable));
  assert.ok(c.images[2].some(line=>line.startsWith(differences[lang]+': ')));
 });
}
