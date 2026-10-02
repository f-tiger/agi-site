import {styleProbability} from './style-odds-core.mjs';
export function initStyleOdds(root,record){
 const form=root.querySelector('form'),output=root.querySelector('[data-style-result]'),error=root.querySelector('[data-style-error]'),labels=JSON.parse(root.querySelector('[data-style-labels]').textContent),locale=document.documentElement.lang,number=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
 const field=name=>form.elements.namedItem(name);
 const show=(name,visible)=>{const label=form.querySelector(`[data-field="${name}"]`);label.hidden=!visible;field(name).disabled=!visible;};
 const percent=p=>p===0?'0%':p===1?'100%':p<.0001?'<0.01%':p>.9999?'>99.99%':number.format(p*100)+'%';
 function sync(){const target=field('target').value,preset=field('series').value==='have-a-seat';show('style',target==='regular'&&preset);show('regularStyles',target==='regular'&&!preset);show('secretOddsN',target!=='printed');show('probabilityPercent',target==='printed');field('series').disabled=target==='printed';field('series').closest('label').hidden=target==='printed';}
 function render(){
  sync();error.textContent='';delete output.dataset.probability;delete output.dataset.singleProbability;
  if(!form.checkValidity()){output.replaceChildren();error.textContent=error.dataset.message;return false;}
  try{
   const target=field('target').value,input={target,boxes:Number(field('boxes').value)};
   if(target==='printed')input.probabilityPercent=Number(field('probabilityPercent').value);
   else {input.secretOddsN=Number(field('secretOddsN').value);if(target==='regular')input.regularStyles=field('series').value==='have-a-seat'?6:Number(field('regularStyles').value);}
   const result=styleProbability(input),name=target==='regular'&&field('series').value==='have-a-seat'?field('style').value:target==='secret'&&field('series').value==='have-a-seat'?'Duoduo · '+labels.targets[1]:labels.targets[['regular','secret','printed'].indexOf(target)];
   output.replaceChildren();const line=(tag,text,className)=>{const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;output.append(e);return e;};
   line('p',name,'odds-target');line('p',labels.label);line('strong',percent(result.probabilityAtLeastOne),'odds-big');
   const dl=document.createElement('dl');for(const [label,value]of [[labels.single,percent(result.probabilityPerBox)],[labels.none,percent(result.probabilityNone)],[labels.expected,number.format(result.expectedCount)],[labels.milestones,[result.boxesFor50pct,result.boxesFor90pct].map(n=>n===null?'—':number.format(n)).join(' / ')]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}output.append(dl);output.dataset.probability=String(result.probabilityAtLeastOne);output.dataset.singleProbability=String(result.probabilityPerBox);return true;
  }catch{output.replaceChildren();error.textContent=error.dataset.message;return false;}
 }
 // Only submitting a valid calculation records use; initial and change previews do not.
 form.addEventListener('submit',e=>{e.preventDefault();if(render())record('odds_calc');});
 form.addEventListener('input',render);form.addEventListener('change',render);render();
}
