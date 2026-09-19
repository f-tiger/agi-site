import {messages} from './messages.mjs';
const lang=document.body.dataset.language||'en',t=messages[lang],$=id=>document.getElementById(id),products=await fetch('/member-assets/products.json').then(r=>r.json());
const random=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('');
let key='',member=null,selected=null,version=null,orders=[],ready=false,busy=false;
try{key=sessionStorage.getItem('workbench-member-key')||'';}catch{}
$('key').value=key;
const notice=(text,error=false)=>{$('notice').textContent=text;$('notice').className=error?'error':'';};
const date=n=>new Date(n*1000).toLocaleString(lang==='zh'?'zh-CN':lang);
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function download(name,data){const a=el('a');a.href=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
function storeKey(value){if(value!==key){selected=null;version=null;member=null;orders=[];$('payload').value='';$('name').value='';$('history').replaceChildren();$('space-list').replaceChildren(el('p',t.empty));$('member-status').textContent=t.inactive;renderOrders();}key=value;$('key').value=key;try{sessionStorage.setItem('workbench-member-key',key);}catch{}}
const errors={revision_conflict:'conflict',storage_quota:'quota',workspace_quota:'quota',membership_required:'required',rate_limited:'rate',consent_required:'consentRequired',not_ready:'unavailable',bad_backup:'badBackup',suspended:'suspended'};
async function api(action,extra={}){
 if(!/^[a-f0-9]{64}$/.test(key))throw Error(t.noKey);
 const r=await fetch('/api/member',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(90000)});const j=await r.json();if(!r.ok||!j.ok)throw Error(t[errors[j.code]||'error']+' ['+(j.code||r.status)+']');return j;
}
function on(id,fn){$(id).onclick=async()=>{if(busy)return;busy=true;$(id).disabled=true;try{await fn();}catch(e){notice(e.message,true);}finally{$(id).disabled=false;busy=false;}};}
function button(label,fn){const b=el('button',label);b.type='button';b.onclick=async()=>{if(busy)return;busy=true;b.disabled=true;try{await fn();}catch(e){notice(e.message,true);}finally{busy=false;b.disabled=false;}};return b;}
function parseBackup(value){const data=typeof value==='string'?JSON.parse(value):value;if(data?.version!==1||!products.some(p=>p.id===data.product)||!data.values||typeof data.values!=='object'||Array.isArray(data.values))throw Error(t.badBackup);if(new TextEncoder().encode(JSON.stringify(data)).length>65536)throw Error(t.quota);return data;}
function backupKey(){if(!key)throw Error(t.noKey);download('workbench-access-key.json',{service:'baipiaoji-workbench',version:1,key});}
async function refresh(){
 if(!key)return;member=await api('status');$('member-status').textContent=member.suspended?t.suspended:member.active?t.active+' '+date(member.ends_at):member.read_until&&member.read_until>Date.now()/1000?t.expired+' '+date(member.read_until):t.inactive;
 if(member.exists){orders=(await api('orders')).orders;renderOrders();}
 if(member.read_until>Date.now()/1000){const j=await api('list');$('usage').textContent=t.usage+': '+j.usage.bytes+' / '+member.plan.total_bytes;renderSpaces(j.spaces);}else{$('space-list').replaceChildren(el('p',t.empty));$('usage').textContent='';}
}
function renderOrders(){
 $('payment').hidden=!orders.length;const target=$('orders');target.replaceChildren();
 for(const o of orders){const box=el('article');box.className='order';box.append(el('strong',o.state==='paid'?t.paid:o.state==='expired'?t.expiredOrder:t.pending),el('p','ID: '+o.id));if(['pending','expired'].includes(o.state)){
  if(o.state==='pending')box.append(el('p',t.quote));box.append(el('p',t.network));const dl=el('dl');for(const[label,value]of [[t.amount,o.payment.amount],[t.address,o.payment.address],[t.deadline,date(o.payment.expires)]]){dl.append(el('dt',label),el('dd',value));}box.append(dl);
  const actions=el('div');actions.className='actions';for(const[label,value]of [[t.copyAddress,o.payment.address],[t.copyAmount,o.payment.amount]])actions.append(button(label,async()=>{await navigator.clipboard.writeText(value);notice(t.copied);}));box.append(actions);
  const tx=el('input');tx.placeholder=t.tx;tx.setAttribute('aria-label',t.tx);box.append(tx,button(t.check,async()=>{notice(t.checking);const j=await api('check',{id:o.id,tx:tx.value.trim()});notice(j.order.state==='paid'?t.paid:t.pending+(j.order.check?' ('+j.order.check+')':''));await refresh();}),el('p',t.paymentNote));
 }if(o.payment.tx)box.append(el('p','Tx: '+o.payment.tx));target.append(box);}
}
function renderSpaces(spaces){const box=$('space-list');box.replaceChildren();if(!spaces.length)box.append(el('p',t.empty));for(const s of spaces){const b=button(s.name,()=>loadSpace(s,s.revision));b.className='workspace-item';b.append(el('small',(products.find(p=>p.id===s.product)?.name||s.product)+' · '+date(s.updated)));box.append(b);}}
async function loadSpace(space,revision){const j=await api('read',{id:space.id,revision});selected=space;version=revision;$('name').value=space.name;$('payload').value=JSON.stringify(j.data,null,2);const history=(await api('history',{id:space.id})).versions;$('history').replaceChildren(...history.map(v=>button(t.version+' '+v.revision+' · '+date(v.created),()=>loadSpace(space,v.revision))));notice(t.loaded);}
on('new-key',()=>{if(key&&member?.exists)throw Error(t.rotate);const draft=$('payload').value,name=$('name').value;storeKey(random(32));$('payload').value=draft;$('name').value=name;member=null;orders=[];renderOrders();$('key-saved').checked=false;notice(t.keyReady);});
on('backup-key',backupKey);
on('login',async()=>{const v=$('key').value.trim();if(!/^[a-f0-9]{64}$/.test(v))throw Error(t.badKey);const draft=!selected?$('payload').value:'',name=!selected?$('name').value:'';storeKey(v);$('payload').value=draft;$('name').value=name;await refresh();});
$('key-file').onchange=async()=>{try{const f=$('key-file').files[0];if(!f||f.size>2048)throw Error(t.badKey);const j=JSON.parse(await f.text());if(j.service!=='baipiaoji-workbench'||!/^([a-f0-9]{64})$/.test(j.key||''))throw Error(t.badKey);const draft=!selected?$('payload').value:'',name=!selected?$('name').value:'';storeKey(j.key);$('payload').value=draft;$('name').value=name;$('key-saved').checked=true;await refresh();}catch(e){notice(e.message,true);}};
on('logout',()=>{key='';try{sessionStorage.removeItem('workbench-member-key');}catch{}location.reload();});
on('rotate',async()=>{if(!confirm(t.rotateConfirm))return;const next=random(32),draft=$('payload').value,name=$('name').value,previous=selected,previousVersion=version;await api('rotate',{new_key:next});storeKey(next);selected=previous;version=previousVersion;$('payload').value=draft;$('name').value=name;backupKey();$('key-saved').checked=false;await refresh();notice(t.keyReady);});
on('checkout',async()=>{if(!$('key-saved').checked||!$('consent').checked)throw Error(t.consentRequired);if(!ready)throw Error(t.unavailable);const j=await api('checkout',{nonce:random(16),accept_terms:true,key_saved:true});orders=[j.order];renderOrders();notice(t.pending);await refresh();$('payment').scrollIntoView({behavior:'smooth',block:'start'});});
on('refresh',refresh);
on('new-space',()=>{selected=null;version=null;$('name').value='';$('payload').value='';$('history').replaceChildren();notice(t.choose);});
$('backup-file').onchange=async()=>{try{const f=$('backup-file').files[0];if(!f||f.size>65536)throw Error(t.quota);const data=parseBackup(await f.text());selected=null;version=null;$('payload').value=JSON.stringify(data,null,2);$('name').value=f.name.replace(/\.json$/,'').slice(0,80);$('history').replaceChildren();notice(t.received);}catch(e){notice(e.message,true);}};
on('save',async()=>{const data=parseBackup($('payload').value),name=$('name').value.trim();if(!name||name.length>80)throw Error(t.name);const id=selected?.id||random(16);const j=await api('save',{id,revision:selected?.revision||0,name,data});selected={id,revision:j.revision,name,product:data.product};version=j.revision;await refresh();await loadSpace(selected,j.revision);notice(t.saved);});
on('export',()=>{const data=parseBackup($('payload').value);download(data.product+'-inputs.json',data);});
on('delete',async()=>{if(!selected)throw Error(t.choose);if(!confirm(t.deleteConfirm))return;await api('delete',{id:selected.id});selected=null;$('payload').value='';$('name').value='';$('history').replaceChildren();await refresh();});
on('restore',()=>{const data=parseBackup($('payload').value),url=new URL(products.find(p=>p.id===data.product).urls[lang]);url.searchParams.set('restore','1');const win=window.open(url.href,'_blank');if(!win)throw Error(t.noPopup);const handler=e=>{if(e.source!==win||e.origin!==url.origin||e.data?.kind!=='workbench-ready')return;win.postMessage({kind:'workbench-restore',data},url.origin);window.removeEventListener('message',handler);};window.addEventListener('message',handler);setTimeout(()=>window.removeEventListener('message',handler),120000);});
on('support',async()=>{const message=$('support-message').value.trim();if(!message||message.length>1000||/[a-f0-9]{64}/i.test(message))throw Error(t.supportHelp);await api('support',{message});$('support-message').value='';notice(t.supportSaved);});
const origins=new Set(['https://baipiaoji.com','https://agiscorecard.com','https://getecoback.com','https://thedollscout.com']);const from=new URLSearchParams(location.search).get('from');
if(window.opener&&origins.has(from)){
 const handler=e=>{if(e.source!==window.opener||e.origin!==from||e.data?.kind!=='workbench-save')return;try{const data=parseBackup(e.data.data);selected=null;$('payload').value=JSON.stringify(data,null,2);$('name').value=products.find(p=>p.id===data.product).name+' '+new Date().toISOString().slice(0,10);notice(t.received);}catch(e){notice(e.message,true);}window.removeEventListener('message',handler);};window.addEventListener('message',handler);window.opener.postMessage({kind:'workbench-member-ready'},from);
}
try{const r=await fetch('/api/member',{cache:'no-store'}),j=await r.json();ready=r.ok&&j.ready===true;$('availability').textContent=ready?t.ready:t.notReady;if(key)await refresh();}catch{notice(t.error,true);$('availability').textContent=t.notReady;}
setInterval(async()=>{const o=orders.find(o=>o.state==='pending'&&o.payment.expires>Date.now()/1000);if(!o||!key||document.hidden||busy)return;busy=true;try{await api('check',{id:o.id});await refresh();}catch(e){notice(e.message,true);}finally{busy=false;}},60000);
