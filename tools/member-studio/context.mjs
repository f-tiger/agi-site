import {memberContext,portalURL} from '/workbench-assets/member-copy.mjs?v=independent1';
const site=document.body.dataset.memberSite,lang=document.body.dataset.language||'en',q=new URLSearchParams(location.search),c=memberContext(q,lang,site);
document.getElementById('return-tool').href=c.returnURL;
const languageNav='header nav[aria-label="Language"] a[lang]';
const languageLinks={
 bpj:`header nav a[data-bpj-language][lang], ${languageNav}`,
 agi:`header a[data-nav-language-link="translation"][lang], ${languageNav}`,
}[site]||'header nav a';
const transfer=q.get('from')===location.origin&&!!window.opener;
for(const a of document.querySelectorAll(languageLinks)){
 const language=a.getAttribute('lang');
 const locale=site==='agi'?language.split('-')[0]:language;
 a.href=portalURL(locale,site,c.product?.id,transfer);
}
