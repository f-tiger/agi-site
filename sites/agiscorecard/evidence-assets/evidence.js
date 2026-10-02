const section=document.querySelector('[data-evidence-key]');
const q=new URLSearchParams(location.search);
const quiet=()=>q.get('ci')==='1'||q.get('__qa')==='1'||q.get('__probe')==='1'||q.get('utm_source')==='verify'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
const emit=(name,label,where)=>{if(!quiet())try{window.gtag?.('event',name,{location:where,label});}catch{}};
if(section){
 const {evidenceKey:key,evidenceLang:lang}=section.dataset,zh=lang==='zh',where='evidence_'+key+'_'+lang;
 const canonical=document.querySelector('link[rel=canonical]').href;
 const status=section.querySelector('.evidence-status'),fallback=section.querySelector('.evidence-fallback');
 section.addEventListener('click',async e=>{
  const target=e.target.closest('[data-evidence-action]');if(!target)return;
  const action=target.dataset.evidenceAction;
  if(action==='png_download'){
   try{const img=section.querySelector('img');await img.decode();const canvas=document.createElement('canvas');canvas.width=960;canvas.height=520;canvas.getContext('2d').drawImage(img,0,0,960,520);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('render');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='agi-'+key+'-'+lang+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status.textContent=zh?'PNG 下载已发起。':'PNG download started.';emit('evidence_action',action,where);}
   catch{status.textContent=zh?'PNG 无法生成，请使用 SVG 下载或打开完整图表。':'PNG could not be created. Download the SVG or open the full-size chart.';}return;
  }
  if(!['citation_copy','share_copy'].includes(action)){emit('evidence_action',action,where);return;}
  const url=new URL(canonical);url.searchParams.set('utm_source','reader_share');url.searchParams.set('utm_medium','copy');url.searchParams.set('utm_campaign','agi_evidence_20261002');url.hash='cite-evidence';
  const text=action==='citation_copy'?section.querySelector('.evidence-citation').textContent:section.querySelector('h2').textContent+'\n'+url.href;
  try{await navigator.clipboard.writeText(text);fallback.hidden=true;status.textContent=zh?'已复制。分享时请保留来源与日期。':'Copied. Keep the source and date when sharing.';emit('evidence_action',action,where);}
  catch{fallback.value=text;fallback.hidden=false;fallback.focus();fallback.select();status.textContent=zh?'浏览器不允许自动复制，请手动复制下方内容。':'Automatic copying was blocked. Copy the text below manually.';}
 });
}
// A tagged arrival is not proof that a different person shared it. Count once per
// tab/campaign/path when storage is available; no persistent identity is created.
if(!quiet()&&q.get('utm_source')==='reader_share'&&['agi_evidence_20261002','agi_focus_20261001'].includes(q.get('utm_campaign'))){
 const lang=document.documentElement.lang.startsWith('zh')?'zh':'en';
 const label=q.get('utm_campaign')==='agi_evidence_20261002'?'evidence_link':'assessment_link';
 const key='agi-arrival:'+label+':'+location.pathname;
 let seen=false;try{seen=!!sessionStorage.getItem(key);if(!seen)sessionStorage.setItem(key,'1');}catch{}
 if(!seen)emit('share_arrival',label,'reader_share_'+lang);
}
