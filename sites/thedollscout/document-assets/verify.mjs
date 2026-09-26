import {fingerprint,esc} from './delivery-core.mjs?v=2026-09-25.8';
import {VERIFY_MAX_BYTES,parseReference,referenceFragment,referenceURL,referenceEmbed,compareReference} from './verify-core.mjs?v=2026-09-25.8';
import {track} from './app.mjs?v=2026-09-25.8';
const c=JSON.parse(document.getElementById('verify-copy').textContent),$=id=>document.getElementById('verify-'+id);
let epoch=0;
const controls=()=>document.querySelectorAll('#verify-workspace input,#verify-workspace textarea,#verify-workspace button,#verify-own');
function reset(){epoch++;$('result').hidden=true;$('result').replaceChildren();}
function busy(value){controls().forEach(el=>el.disabled=value);$('workspace').setAttribute('aria-busy',String(value));}
function languageReferences(fragment='') {
 for(const link of document.querySelectorAll('.languages a')){const u=new URL(link.href);u.hash=fragment;link.href=u.pathname+u.search+u.hash;}
}
function actionPriority(){const hasReference=!!$('reference').value.trim();$('check').classList.toggle('primary',hasReference);$('create').classList.toggle('primary',!hasReference);}
function loadReference(){reset();languageReferences();$('reference').value='';$('status').textContent='';actionPriority();if(!location.hash.startsWith('#tds-file-'))return;
 try{const r=parseReference(location.hash);$('reference').value=referenceURL(r,c.lang);$('status').textContent=c.ready;languageReferences(referenceFragment(r));track('doc_verify_recipient');}
 catch{$('reference').value=location.hash.slice(0,512);$('status').textContent=c.invalid;}
 actionPriority();
}
loadReference();window.addEventListener('hashchange',loadReference);
for(const el of [$('file'),$('reference')])el.addEventListener('input',()=>{reset();$('status').textContent=c.stale;actionPriority();try{languageReferences(referenceFragment(parseReference($('reference').value)));}catch{languageReferences();}});
$('file').addEventListener('change',()=>{$('file-name').textContent=$('file').files[0]?.name||c.empty;});
function clear(){reset();$('file').value='';$('reference').value='';$('file-name').textContent=c.empty;$('status').textContent='';history.replaceState(null,'',location.pathname+location.search);languageReferences();actionPriority();}
$('clear').addEventListener('click',clear);
$('own').addEventListener('click',()=>{clear();track('doc_verify_next');$('file').focus();$('workspace').scrollIntoView({block:'start',behavior:'auto'});});
function render(actual,kind,sample=false){
 const heading=c[kind],body=c[kind==='match'?'matchedBody':kind==='different'?'differentBody':'createdBody'];
 const link=referenceURL(actual,c.lang),embed=referenceEmbed(actual,c.lang);
 $('result').innerHTML=`${sample?`<p class="notice">${esc(c.sampleLabel)}</p>`:''}<h2>${esc(heading)}</h2><p class="verify-result-copy">${esc(body)}</p><dl class="verify-facts"><dt>${esc(c.hash)}</dt><dd>${actual.sha256}</dd><dt>${esc(c.bytes)}</dt><dd>${actual.bytes}</dd></dl>${kind==='created'?`<label for="verify-link">${esc(c.link)}</label><textarea id="verify-link" readonly rows="3">${esc(link)}</textarea><div class="actions"><button data-verify-copy="link">${esc(c.copy)}</button></div><label for="verify-embed">${esc(c.embed)}</label><textarea id="verify-embed" readonly rows="3">${esc(embed)}</textarea><div class="actions"><button data-verify-copy="embed">${esc(c.copyEmbed)}</button></div><p class="small">${esc(c.privacy)}</p><p id="verify-copy-status" role="status"></p>`:''}`;
 $('result').hidden=false;$('result').focus();
}
async function run(kind,sample=false){reset();const current=epoch;busy(true);$('status').textContent=c.working;
 try{
  const file=sample?new File(['abc'],'known-example.txt'): $('file').files[0];
  if(!file)throw Error('missingFile');if(file.size>VERIFY_MAX_BYTES)throw Error('large');
  let expected;
  if(kind==='check'){
   if(sample)expected={sha256:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',bytes:3};
   else{if(!$('reference').value.trim())throw Error('noReference');try{expected=parseReference($('reference').value);}catch{throw Error('invalid');}}
  }
  const actual=await fingerprint(file);if(current!==epoch)return;
  const result=kind==='create'?'created':compareReference(expected,actual)?'match':'different';
  render(actual,result,sample);$('status').textContent=c[result];
  track(sample?'doc_verify_sample':result==='created'?'doc_verify_create':result==='match'?'doc_verify_match':'doc_verify_mismatch');
 }catch(error){if(current===epoch)$('status').textContent=c[error.message]||c.readError;}finally{busy(false);}
}
$('check').addEventListener('click',()=>run('check'));
$('create').addEventListener('click',()=>run('create'));
$('sample').addEventListener('click',()=>run('check',true));
$('result').addEventListener('click',async event=>{const button=event.target.closest('[data-verify-copy]');if(!button)return;const output=$(button.dataset.verifyCopy);
 try{await navigator.clipboard.writeText(output.value);$('copy-status').textContent=c.copied;track(button.dataset.verifyCopy==='embed'?'doc_verify_embed':'doc_verify_share');}
 catch{$('copy-status').textContent=c.copyError;output.focus();output.select();}
});
