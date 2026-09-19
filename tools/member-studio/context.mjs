import {memberContext,portalURL} from '/workbench-assets/member-copy.mjs?v=independent1';
const site=document.body.dataset.memberSite,lang=document.body.dataset.language||'en',q=new URLSearchParams(location.search),c=memberContext(q,lang,site);
document.getElementById('return-tool').href=c.returnURL;
for(const a of document.querySelectorAll('header nav a'))a.href=portalURL(a.getAttribute('lang'),site,c.product?.id,q.get('from')===location.origin&&!!window.opener);
