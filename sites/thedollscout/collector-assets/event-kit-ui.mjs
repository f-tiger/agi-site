import {prepareEventCard,decodeEventPayload,makeParticipantPayload} from './event-kit-core.mjs?v=2026-10-31.1';

const utcDay=()=>new Date().toISOString().slice(0,10);
const inputArgs=payload=>{const {v,...args}=payload;return args;};
const names=value=>value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);

export function initEventKit(root,record=()=>{}){
 if(!root)return;
 const {lang,labels:c,catalog,url}=JSON.parse(root.querySelector('[data-event-config]').textContent);
 const q=selector=>root.querySelector(selector),form=q('[data-event-form]'),fields=q('[data-event-fields]'),review=q('[data-event-review]'),resultBox=q('[data-event-result]'),status=q('[data-event-status]');
 const actions=['share','text','print'].map(name=>q(`[data-event-${name}]`));
 let current=null,dirty=true,received=false;
 const say=message=>{status.textContent=message;};
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 const field=name=>form.elements.namedItem(name);
 const expired=()=>current?.payload.eventDate<utcDay();
 function gate(){const valid=!!current&&!dirty&&!expired();review.disabled=!valid;for(const button of actions)button.disabled=!valid||!review.checked;}
 function syncForm(){q('[data-event-choices]').hidden=field('kind').value!=='card';q('[data-event-generate]').textContent=field('kind').value==='event'?c.generateEvent:c.generate;q('[data-event-add="offered"]').disabled=field('exchangeMode').value==='display';}
 function invalidate(){dirty=true;review.checked=false;gate();syncForm();if(current)say(c.stale);}
 function externalLink(href,label){const a=el('a',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function show(){
  resultBox.replaceChildren();q('[data-event-empty]').hidden=true;resultBox.hidden=false;
  const p=current.payload;q('[data-event-output-heading]').textContent=p.eventName;
  resultBox.append(el('p',c[p.kind],'event-card-type'));
  const dl=el('dl');
  for(const [label,value]of [[c.date,p.eventDate],[c.mode,c[p.exchangeMode]]]){const row=el('div');row.append(el('dt',label),el('dd',value));dl.append(row);}resultBox.append(dl);
  if(p.note){resultBox.append(el('h3',c.noteLabel),el('p',p.note));}
  if(p.rulesUrl){const paragraph=el('p',c.rulesLabel+': ');paragraph.append(externalLink(p.rulesUrl,new URL(p.rulesUrl).hostname));resultBox.append(paragraph);}
  if(p.kind==='card')for(const [key,label]of [['wanted',c.wanted],['offered',c.offered]]){
   resultBox.append(el('h3',label));const list=el('ul'),unmatched=new Set(current[key==='wanted'?'unmatchedWanted':'unmatchedOffered']);
   for(const value of current[key]){const item=el('li',value);if(unmatched.has(value))item.append(el('span',c.unknown,'event-unmatched'));list.append(item);}resultBox.append(current[key].length?list:el('p',c.none));
  }
  if(current.sources?.length){const details=el('details'),list=el('ul');details.append(el('summary',c.sources));for(const source of current.sources){const item=el('li');item.append(externalLink(source.source,source.title),document.createTextNode(` · ${c.checked}: ${source.checked}`));list.append(item);}details.append(list,el('p',c.sourceLimit));resultBox.append(details);}
  resultBox.append(el('p',c.unverified+' '+c.noTransaction,'event-card-warning'));
  const credit=el('p');const link=el('a','The Doll Scout · '+url.replace('https://',''));link.href=url;credit.append(link);resultBox.append(credit);
  if(current.expired)resultBox.append(el('p',c.expired,'event-card-expired'));
  review.checked=false;gate();
 }
 function fill(payload){for(const name of ['kind','eventName','eventDate','exchangeMode','rulesUrl','note'])field(name).value=payload[name]||'';field('wanted').value=(payload.wanted||[]).join('\n');field('offered').value=(payload.offered||[]).join('\n');syncForm();}
 function read(){const kind=field('kind').value;return {kind,eventName:field('eventName').value,eventDate:field('eventDate').value,exchangeMode:field('exchangeMode').value,rulesUrl:field('rulesUrl').value,note:field('note').value,wanted:kind==='card'?names(field('wanted').value):[],offered:kind==='card'?names(field('offered').value):[],language:lang};}
 fields.disabled=false;syncForm();form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);review.addEventListener('change',gate);
 form.addEventListener('submit',event=>{
  event.preventDefault();try{current=prepareEventCard(catalog,read(),{today:utcDay()});dirty=false;received=false;show();say(current.expired?c.expired:c.ready);if(!current.expired)record(current.kind==='event'?'collector_event_prepare':'collector_event_card');}catch{invalidate();say(c.invalid);}
 });
 for(const button of root.querySelectorAll('[data-event-add]'))button.addEventListener('click',()=>{
  const value=q('[data-event-item]').value.trim(),target=field(button.dataset.eventAdd),list=names(target.value);
  if(!value||value.length>120||list.length>=8||(button.dataset.eventAdd==='offered'&&field('exchangeMode').value==='display')){say(c.addFail);return;}
  if(!list.includes(value))list.push(value);target.value=list.join('\n');q('[data-event-item]').value='';invalidate();say(c.added);target.focus();
 });
 function reviewed(){gate();if(!current||dirty||expired()||!review.checked){say(expired()?c.expired:c.needsReview);return null;}return current;}
 async function copy(kind){const snapshot=reviewed();if(!snapshot)return;const text=kind==='share'?snapshot.shareUrl:snapshot.markdown;if(!text){say(c.needsReview);return;}
  try{await navigator.clipboard.writeText(text);say(current===snapshot&&!dirty?(kind==='share'?c.copied:c.textCopied):c.copiedPrevious);record(kind==='share'?'collector_event_share':'collector_event_text');}catch{say(c.copyFail);}
 }
 q('[data-event-share]').addEventListener('click',()=>copy('share'));q('[data-event-text]').addEventListener('click',()=>copy('text'));
 q('[data-event-print]').addEventListener('click',()=>{if(!reviewed())return;say(c.printing);record('collector_event_print');window.print();});
 q('[data-event-own]').addEventListener('click',()=>{
  if(!received||!current)return;const draft=makeParticipantPayload(current.payload);fill(draft);current=null;dirty=true;received=false;root.dataset.shared='false';q('[data-event-received]').hidden=true;form.hidden=false;resultBox.replaceChildren();resultBox.hidden=true;q('[data-event-empty]').hidden=false;q('[data-event-output-heading]').textContent=c.preview;review.checked=false;gate();
  try{history.replaceState(null,'',location.pathname+location.search);}catch{}
  say(c.ownReady);record('collector_event_reuse');field('wanted').focus();
 });
 function readShared(){
  if(!location.hash)return;
  try{const payload=decodeEventPayload(location.hash);current=prepareEventCard(catalog,inputArgs(payload),{today:utcDay()});dirty=false;received=true;root.dataset.shared='true';q('[data-event-received]').hidden=false;form.hidden=true;show();say(current.expired?c.expired:c.sharedNote);record('collector_event_recipient');}
  catch{current=null;dirty=true;received=false;root.dataset.shared='false';q('[data-event-received]').hidden=true;form.hidden=false;resultBox.replaceChildren();resultBox.hidden=true;q('[data-event-empty]').hidden=false;q('[data-event-output-heading]').textContent=c.preview;review.checked=false;gate();say(c.invalidLink);}
 }
 readShared();window.addEventListener('hashchange',readShared);window.addEventListener('focus',gate);
}
