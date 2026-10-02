export function initDisplayFit(root,record){
 const form=root.querySelector('form'),output=root.querySelector('[data-fit-result]'),error=root.querySelector('[data-fit-error]'),labels=JSON.parse(root.querySelector('[data-fit-labels]').textContent),number=new Intl.NumberFormat(document.documentElement.lang,{maximumFractionDigits:2});
 let edited=false;
 const field=name=>form.elements.namedItem(name);
 function render(){
  output.replaceChildren();delete output.dataset.count;error.textContent='';
  if(!form.checkValidity()){error.textContent=error.dataset.message;return false;}
  try{
   const input=Object.fromEntries(['width','depth','height','itemWidth','itemDepth','itemHeight','gap'].map(k=>[k,Number(field(k).value)]));input.rotate=field('rotate').checked;
   const result=globalThis.DSCollector.fit(input);
   const line=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;output.append(e);};
   line('p',result.count?labels.yesFit:labels.noFit,'odds-target');line('p',labels.capacity);line('strong',number.format(result.count),'odds-big');
   const dl=document.createElement('dl');for(const [label,value]of [[labels.layout,`${number.format(result.columns)} × ${number.format(result.rows)}`],[labels.orientation,result.rotated?labels.turned:labels.normal],[labels.height,number.format(input.height-input.itemHeight)+' cm']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}output.append(dl);
   if(result.count&&result.count<=60&&result.columns<=12){line('p',labels.diagram,'small');const grid=document.createElement('div');grid.className='fit-grid';grid.setAttribute('aria-hidden','true');grid.style.setProperty('--fit-columns',Math.min(result.columns,12));for(let i=0;i<Math.min(result.count,60);i++)grid.append(document.createElement('span'));output.append(grid);}else if(result.count)line('p',labels.large,'small');
   output.dataset.count=String(result.count);return true;
  }catch{output.replaceChildren();error.textContent=error.dataset.message;return false;}
 }
 // Only explicit valid submissions are counted, without dimensions or identifying data.
 form.addEventListener('submit',e=>{e.preventDefault();if(render()&&edited)record('display_calc');});
 const change=()=>{edited=true;render();};form.addEventListener('input',change);form.addEventListener('change',change);render();
}
