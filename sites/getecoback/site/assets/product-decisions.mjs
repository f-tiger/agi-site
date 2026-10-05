import {defaults,bounds,enums,validate,calculate,parseShare,scenarioURL,US_GALLON} from './product-decision-model.mjs';
const root=document.getElementById('product-decisions');
if(root){
const config=JSON.parse(document.getElementById('product-decision-config').textContent),{text:t,markets}=config;
let s=defaults(config.market),kind='example';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const emit=action=>{if(!/[?&]__(probe|ci)(?:=|&|$)/.test(location.search))window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'eco_buy_'+s.mode+'_'+action}}));};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
const form=el('form'),top=el('div',undefined,'pd-choices'),advanced=el('details'),fields=el('div',undefined,'pd-fields'),result=el('div'),status=el('p'),notice=el('p'),local=el('p'),sourceList=el('ul'),shareBox=el('div');
result.setAttribute('aria-live','polite');result.id='pd-result';status.setAttribute('role','status');notice.className='pd-notice';local.className='pd-local';shareBox.hidden=true;
advanced.append(el('summary',t.advanced),fields);const inputs={};
for(const key of [...Object.keys(enums),...Object.keys(bounds)]){
 const label=el('label',t[key]),input=el(enums[key]?'select':'input');input.id='pd-'+key;input.name=key;label.htmlFor=input.id;
 if(enums[key])for(const value of enums[key]){const o=el('option',key==='market'?markets[value].name:(key==='compatible'&&value==='yes'?t.compatibleYes:(t[value]||value)));o.value=value;input.append(o);}
 else{input.type='number';input.min=bounds[key][0];input.max=bounds[key][1];input.step='any';input.required=true;}
 inputs[key]=input;label.append(input);(key==='market'||key==='mode'||key==='category'?top:fields).append(label);
}
form.append(top,notice,local,advanced);const actions=el('div',undefined,'pd-actions'),go=el('button',t.run);go.type='submit';actions.append(go,button(t.reset,()=>{s=defaults(s.market);kind='example';sync();render();emit('example');}));form.append(actions);
const share=button(t.share,()=>{if(!read())return;render();const u=scenarioURL(document.querySelector('link[rel=canonical]').href,s);shareBox.replaceChildren(el('p',t.shareNote));const link=el('textarea');link.readOnly=true;link.value=u;link.setAttribute('aria-label',t.share);shareBox.append(link);const links=el('div',undefined,'pd-actions');links.append(button(t.copy,async()=>{try{await navigator.clipboard.writeText(u);status.textContent=t.copied;emit('copy');}catch{link.focus();link.select();status.textContent=t.copyFail;}}));for(const platform of ['Reddit','X']){const dest=new URL(platform==='Reddit'?'https://www.reddit.com/submit':'https://x.com/intent/post');dest.searchParams.set('url',u);dest.searchParams.set(platform==='Reddit'?'title':'text',t[s.mode]+' — '+t.edited);const a=el('a',platform);a.href=dest.href;a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',()=>emit('share_'+platform.toLowerCase()));links.append(a);}shareBox.append(links);shareBox.hidden=false;emit('share_prepare');});
const toolbar=el('div',undefined,'pd-actions');toolbar.append(share,button(t.print,()=>{if(read()){render();advanced.open=true;window.print();emit('print');}}));
root.querySelector('[data-pd-mount]').append(form,result,toolbar,shareBox,status,sourceList);
function read(){const raw={};for(const [key,input] of Object.entries(inputs)){input.removeAttribute('aria-invalid');raw[key]=enums[key]?input.value:input.value.trim()===''?NaN:Number(input.value);}try{s=validate(raw);return true;}catch(e){advanced.open=true;inputs[e.message]?.setAttribute('aria-invalid','true');status.textContent=t.error;result.replaceChildren();shareBox.hidden=true;share.disabled=true;return false;}}
function sync(){for(const [k,input]of Object.entries(inputs))input.value=String(s[k]);}
function render(){
 shareBox.hidden=true;share.disabled=false;status.textContent='';inputs.flowA.max=inputs.flowB.max=s.flowUnit==='usgal'?200/US_GALLON:200;notice.textContent=t[kind==='example'?'example':'edited']+' '+t.currencyNote;local.textContent=markets[s.market].note;
 const allowed=new Set(['market','mode',...(s.mode==='label'?['category','unitA','unitB','comparable','rate','cycles','years','energyA','energyB','priceA','priceB']:s.mode==='dish'?['rate','heatRate','waterRate','cycles','machineEnergy','machineHeat',...(s.machineHeat==='external'?['machineHotWater']:[]),'machineWater','handWater','lift','ratio']:['heatRate','waterRate','flowUnit','compatible','flowA','flowB','minutes','showers','headCost','lift','ratio'])]);
 for(const [k,input]of Object.entries(inputs)){input.parentElement.hidden=!allowed.has(k);input.disabled=!allowed.has(k);}
 const r=calculate(s),currency=markets[s.market].currency,n=v=>v===null?'—':new Intl.NumberFormat(config.lang,{maximumFractionDigits:2}).format(v),money=v=>v===null?'—':new Intl.NumberFormat(config.lang,{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(v);
 result.replaceChildren(el('h3',t.results),el('p',t[s.mode]+' · '+markets[s.market].name));const table=el('table'),head=el('thead'),hr=el('tr');[t.metric,t.optionA,t.optionB].forEach(x=>{const th=el('th',x);th.scope='col';hr.append(th);});head.append(hr);const body=el('tbody');const row=(label,a,b)=>{const tr=el('tr'),th=el('th',label);th.scope='row';tr.append(th,el('td',a),el('td',b));body.append(tr);};const summary=(label,value)=>result.append(el('p',label+': '+value));
 table.append(head,body);
 if(s.mode==='label'){row(t.annualEnergy,n(r.a),n(r.b));row(t.annualCost+' ('+currency+')',n(r.ca),n(r.cb));row(t.total+' ('+currency+')',n(r.totalA),n(r.totalB));result.append(table);summary(t.saving+' (A − B)',money(r.saving));summary(t.payback,r.payback===null?t.none:n(r.payback));if(!r.comparable)result.append(el('p',t.basis,'pd-notice'));}
 else if(s.mode==='dish'){hr.children[1].textContent=t.dishwasher;hr.children[2].textContent=t.handWater.replace(/\s*\([^)]*\)/g,'');row(t.annualCost+' ('+currency+')',n(r.ca),n(r.cb));row(t.water,n(r.waterA),n(r.waterB));result.append(table);summary(t.threshold,n(r.threshold));summary(t.saving+' (B − A)',money(r.saving));}
 else {summary(t.water+' (A − B)',n(r.litres));summary(t.heat+' (A − B)',n(r.heat));summary(t.saving+' (A − B)',money(r.saving));summary(t.payback,r.payback===null?t.none:n(r.payback));if(!r.compatible)result.append(el('p',t.blocked,'pd-notice'));}
 result.append(el('p',t[s.mode+'Limit'],'pd-limit'));const assumptions=el('details'),values=el('dl');assumptions.append(el('summary',t.assumptions),values);for(const key of allowed){const input=inputs[key];values.append(el('dt',t[key]),el('dd',input.tagName==='SELECT'?input.selectedOptions[0].textContent:String(s[key])));}result.append(assumptions);sourceList.replaceChildren();for(const id of markets[s.market].sources){const [title,url]=config.sources[id],li=el('li'),a=el('a',title);a.href=url;li.append(a);sourceList.append(li);}const eligible=s.mode==='label'?r.comparable:s.mode==='dish'?r.saving>0:r.compatible&&r.saving>0;
 if(eligible&&['DE','NL','GB','FR','US','CA'].includes(s.market)){
 const stores={DE:'www.amazon.de',NL:'www.amazon.nl',GB:'www.amazon.co.uk',FR:'www.amazon.fr',US:'www.amazon.com',CA:'www.amazon.ca'},q=s.mode==='shower'?'queryShower':s.mode==='dish'?'queryDishwasher':'query'+s.category[0].toUpperCase()+s.category.slice(1),url=new URL('https://'+stores[s.market]+'/s');url.searchParams.set('k',t[q]);if(s.market==='DE')url.searchParams.set('tag','getecoback-21');if(s.market==='US')url.searchParams.set('tag','ecoback0d-20');const ad=el('aside',undefined,'pd-commerce'),a=el('a',t.shop);a.href=url.href;a.target='_blank';a.rel=['DE','US'].includes(s.market)?'sponsored noopener noreferrer':'noopener noreferrer';ad.append(el('p',t.ad),a);result.append(ad);
 }
 root.dataset.ready='true';
}
form.addEventListener('submit',e=>{e.preventDefault();if(read()){render();emit(kind==='example'?'example':'compare');}});
form.addEventListener('input',e=>{if(e.target.type==='number'){kind='edited';shareBox.hidden=true;share.disabled=true;result.replaceChildren();status.textContent=t.run;}});
form.addEventListener('change',e=>{
 const oldUnit=s.flowUnit;const newUnit=inputs.flowUnit.value;if(e.target.name==='flowUnit')inputs.flowUnit.value=oldUnit;if(!read())return;s.flowUnit=newUnit;kind='edited';
 if(e.target.name==='flowUnit'){const f=oldUnit==='litre'?1/US_GALLON:US_GALLON;s.flowA*=f;s.flowB*=f;sync();}
 if(e.target.name==='category'){
 const p=s.category==='fridge'?{unitA:'year',unitB:'year',energyA:260,energyB:150,priceA:450,priceB:700}:s.category==='dishwasher'?{unitA:'hundred',unitB:'hundred',energyA:85,energyB:55,priceA:400,priceB:650}:{unitA:'hundred',unitB:'hundred',energyA:240,energyB:120,priceA:450,priceB:700};Object.assign(s,p);kind='edited';sync();
 }
 render();emit('example');
});
function restore(){try{const shared=parseShare(location.hash);if(shared){s=shared;kind='edited';}sync();render();}catch{ s=defaults(config.market);kind='example';sync();render();status.textContent=t.error;}}
restore();window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#eco-buy-v1='))restore();});
}
