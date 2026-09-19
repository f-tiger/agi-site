import {memberContext,memberURL,portalURL} from './member-copy.mjs';
const site=document.body.dataset.memberSite,lang=document.body.dataset.locale,q=new URLSearchParams(location.search);
const c=memberContext(new URLSearchParams({source:site,tool:q.get('tool')||''}),lang);
const transfer=q.get('transfer')==='1'&&!!window.opener&&!!c.product;
document.getElementById('member-continue').href=portalURL(lang,site,c.product?.id,transfer);
document.getElementById('member-return').href=c.returnURL;
document.getElementById('transfer-note').hidden=!transfer;
for(const a of document.querySelectorAll('[data-member-language]')){
 const url=new URL(memberURL(a.dataset.memberLanguage,site));if(c.product)url.searchParams.set('tool',c.product.id);if(transfer)url.searchParams.set('transfer','1');a.href=url.href;
}
