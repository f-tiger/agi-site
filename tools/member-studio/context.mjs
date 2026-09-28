import {memberContext,portalURL} from '/workbench-assets/member-copy.mjs?v=independent1';
const site=document.body.dataset.memberSite,lang=document.body.dataset.language||'en',q=new URLSearchParams(location.search),c=memberContext(q,lang,site);
document.getElementById('return-tool').href=c.returnURL;
const languageLinks=site==='bpj'?'header nav a[data-bpj-language][lang], header nav[aria-label="Language"] a[lang]':'header nav a';
for(const a of document.querySelectorAll(languageLinks))a.href=portalURL(a.getAttribute('lang'),site,c.product?.id,q.get('from')===location.origin&&!!window.opener);
