import {memberContext,portalURL} from '/workbench-assets/member-copy.mjs';
const lang=document.body.dataset.language||'en',q=new URLSearchParams(location.search),c=memberContext(q,lang);
if(q.has('source')){
 document.getElementById('site-context').hidden=false;
 document.getElementById('source-brand').textContent=c.brand;
 document.getElementById('return-tool').href=c.returnURL;
 document.getElementById('source-membership').href=c.entry;
 document.documentElement.style.setProperty('--blue',c.color);
 const brand=document.querySelector('.brand');brand.textContent=c.brand;brand.href=c.entry;
 document.title=c.brand+' | '+document.title;
 const transfer=q.get('from')===c.origin&&!!window.opener;
 for(const a of document.querySelectorAll('header nav a')){
  const lang=a.getAttribute('lang');a.href=portalURL(lang,c.site,c.product?.id,transfer);
 }
}
