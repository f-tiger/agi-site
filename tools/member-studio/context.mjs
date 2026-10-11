import {memberContext,portalURL} from '/workbench-assets/member-copy.mjs?v=independent1';
const site=document.body.dataset.memberSite,lang=document.body.dataset.language||'en',q=new URLSearchParams(location.search),c=memberContext(q,lang,site);
document.getElementById('return-tool').href=c.returnURL;
const languageLinks=site==='bpj'?'header nav a[data-bpj-language][lang], header nav[aria-label="Language"] a[lang]':'header nav a';
for(const a of document.querySelectorAll(languageLinks)){
 const url=new URL(portalURL(a.getAttribute('lang'),site,c.product?.id,q.get('from')===location.origin&&!!window.opener));
 // Preserve only the fixed BPJ entry marker through a language change.
 if(site==='bpj'&&q.get('source')==='bpj-startup-research'){url.searchParams.set('source','bpj-startup-research');if(location.hash==='#startup-mcp')url.hash=location.hash;}
 if(site==='bpj'&&q.has('__ci'))url.searchParams.set('__ci','1');
 a.href=url.href;
}

