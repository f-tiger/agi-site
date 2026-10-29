const {decide,dividerSTL}=await import('./family-workshop-rules.mjs'+new URL(import.meta.url).search);
const cfg=JSON.parse(document.querySelector('#family-workshop-config').textContent),seen=new Set();
function emit(mode,action){const name=`eco_workshop_${mode}_${action}`;if(seen.has(name)||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||/[?&]__(probe|ci|qa)(=|&|$)/.test(location.search))return;seen.add(name);window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(const root of document.querySelectorAll('[data-workshop]')){
 const mode=root.dataset.workshop,form=root.querySelector('[data-check]'),result=root.querySelector('[data-result]'),stl=root.querySelector('.fw-stl');let latest=null;
 if(stl)stl.hidden=true;
 form.addEventListener('change',()=>{latest=null;result.hidden=true;if(stl)stl.hidden=true;});
 form.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form)),decision=decide(mode,values);if(!decision)return;
 const [title,step]=cfg.answers[mode][decision.code];latest={title,step,answers:[...form.querySelectorAll('select')].map(s=>s.closest('label').childNodes[0].textContent.trim()+': '+s.selectedOptions[0].textContent)};
 result.querySelector('[data-title]').textContent=title;result.querySelector('[data-step]').textContent=step;
 const shop=result.querySelector('[data-shop]');shop.replaceChildren();shop.hidden=true;
 if(decision.code==='compare'&&['pool','garden'].includes(mode)){
  const us=cfg.lang==='en',term=mode==='pool'?(us?'robotic pool cleaner':'Poolroboter'):(us?'robot lawn mower':'Mähroboter'),link=document.createElement('a');link.href=`https://www.amazon.${us?'com':'de'}/s?k=${encodeURIComponent(term)}&tag=${us?'ecoback0d-20':'getecoback-21'}`;link.rel='sponsored noopener';link.target='_blank';link.textContent=cfg.shop;link.addEventListener('click',()=>emit(mode,'shop'));const p=document.createElement('p');p.className='fw-note';p.textContent=cfg.shopNote;shop.append(p,link);shop.hidden=false;
 }
 result.hidden=false;if(stl)stl.hidden=!['template','service'].includes(decision.code);result.focus();emit(mode,'decision');
 });
 root.querySelector('[data-export]').addEventListener('click',()=>{if(!latest)return;download(['EcoBack',root.querySelector('h2').textContent,...latest.answers,'',latest.title,latest.step,'',root.querySelector('.fw-evidence p').textContent,root.querySelector('[data-official]').href,cfg.checked,location.origin+location.pathname+'#'+mode].join('\n'),'ecoback-'+mode+'-checklist.txt','text/plain;charset=utf-8');emit(mode,'export');});
 root.querySelector('[data-official]').addEventListener('click',()=>emit(mode,'official'));
 if(stl){const f=stl.querySelector('form'),status=stl.querySelector('[data-stl-status]');f.addEventListener('input',()=>status.textContent='');f.addEventListener('submit',e=>{e.preventDefault();if(stl.hidden||!latest)return;const v=Object.fromEntries(new FormData(f)),data=v.confirmed?dividerSTL(v):null;if(!data){status.textContent=cfg.invalid;return;}download(data,'ecoback-divider-mm.stl','model/stl');status.textContent=cfg.stlOK;emit(mode,'stl');});}
 for(const fieldset of root.querySelectorAll('fieldset'))fieldset.disabled=false;
 root.dataset.ready='true';
}
