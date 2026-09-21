import {acquisitionSource} from '/acquisition.mjs';
const source=acquisitionSource(location.search,document.referrer);
for(const a of document.querySelectorAll('[data-tool]')){const u=new URL(a.href);u.searchParams.set('src',source==='direct'?'example':source);a.href=u.href;}
const share=document.querySelector('[data-share]'),input=document.querySelector('.share-link'),status=document.querySelector('.share-status');
if(share)share.addEventListener('click',async()=>{input.hidden=false;input.value=document.querySelector('link[rel=canonical]').href;try{await navigator.clipboard.writeText(input.value);status.textContent='Guide link copied. Only the public guide is shared, never your input files.';}catch{input.focus();input.select();status.textContent='Copy this public guide link. It contains no uploaded data.';}});
