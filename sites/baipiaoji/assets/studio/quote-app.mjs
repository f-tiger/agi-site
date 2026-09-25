import {COPY} from './quote-copy.mjs';
import {PRODUCT,EDITION,MAX_QUOTES,newPolicy,newQuote,policyErrors,compare,parseTiers,CSV_FIELDS,csv,parseCSV,snapshot,restore,example} from './quote-core.mjs';
import {esc,renderPolicy,renderTabs,renderQuote,renderResults} from './quote-view.mjs';
const root=document.getElementById('quote-workspace');
const lang=root.dataset.locale==='en'?'en':'zh',L=COPY[lang],$=id=>document.getElementById('qc-'+id),storageKey=PRODUCT+':draft:v1';
let policy=newPolicy(),quotes=[newQuote('q1')],selected=0,last=null,demo=false,hasChanges=false,tiersDrafts={};
function message(s){$('status').textContent=s;}
function event(action){if(window.bpjEv&&!new URLSearchParams(location.search).has('__ci'))window.bpjEv('calc','/studio/quote-compare/'+action+'/'+(demo?'demo':'own'));}
function dirty(){last=null;hasChanges=true;$('export-actions').hidden=true;$('results').innerHTML=`<p>${L.dirty}</p>`;}
function drawEditor(){const q=quotes[selected];$('editor').innerHTML=renderQuote(q,policy,L,tiersDrafts[q.id]);$('tabs').innerHTML=renderTabs(quotes,selected,L);$('add').disabled=quotes.length>=MAX_QUOTES;}
function drawAll(){ $('policy').innerHTML=renderPolicy(policy,L);drawEditor();$('notice').textContent=demo?L.sampleNote:L.ownNote; }
function validateTiers(){for(const q of quotes)if(Object.hasOwn(tiersDrafts,q.id))q.tiers=parseTiers(tiersDrafts[q.id]);}
function adopt(s,isDemo=s.demo===true){policy=s.policy;quotes=s.quotes;selected=0;tiersDrafts={};demo=isDemo;dirty();drawAll();}
function confirmReplace(){return !hasChanges||window.confirm(L.replace);}
function calculate(scroll=true){
  try{validateTiers();const errors=policyErrors(policy);if(errors.length){message(errors.map(c=>L.issues[c]).join(' '));$('policy').querySelector(`[data-policy="${errors[0]==='REQUIRED_SKU'?'required_sku':errors[0]==='QUANTITY'?'requested_units':errors[0]==='DEADLINE'?'max_lead_days':errors[0]==='AS_OF'?'as_of':'base_currency'}"]`)?.focus();return;}
    last=compare(quotes,policy);$('results').innerHTML=renderResults(last,quotes,policy,L);$('export-actions').hidden=false;message('');event('calculate');if(scroll)$('result-section').scrollIntoView({behavior:'instant',block:'start'});
  }catch(e){message(L.issues[e.message]||L.issues.INVALID_INPUT);}
}
function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);message(L.downloaded);}
function backup(){validateTiers();return snapshot(policy,quotes,demo);}
function exportRows(){return last.results.map(r=>{const q=quotes.find(q=>q.id===r.id);return [r.supplier,L.status[r.status],r.ordered_units,r.extra_units,r.subtotal,r.goods_gross,r.freight,r.currency,r.total,r.base_currency,r.rank||'',r.issues.map(i=>L.issues[i.code]).join('; '),q.source_name,policy.as_of,policy.required_sku,policy.requested_units];});}
$('policy').addEventListener('input',e=>{const key=e.target.dataset.policy;if(!Object.hasOwn(policy,key))return;policy[key]=e.target.value;dirty();if(key!=='name'){for(const q of quotes){q.reviewed=false;q.overbuy_approved=false;q.sku_approved=false;if(['base_currency','as_of'].includes(key))q.fx_confirmed=false;}drawEditor();}});
$('editor').addEventListener('input',e=>{
  const key=e.target.dataset.quote,q=quotes[selected];if(!key||!Object.hasOwn(q,key))return;
  if(key==='tiers')tiersDrafts[q.id]=e.target.value;
  else q[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;
  dirty();
  if(!['reviewed','overbuy_approved','sku_approved','fx_confirmed'].includes(key)){
    q.reviewed=false;q.overbuy_approved=false;q.sku_approved=false;
    if(['fx_rate','fx_date','currency'].includes(key))q.fx_confirmed=false;
    for(const k of ['reviewed','overbuy_approved','sku_approved','fx_confirmed']){const el=$('editor').querySelector(`[data-quote="${k}"]`);if(el)el.checked=q[k];}
  }
  $('tabs').innerHTML=renderTabs(quotes,selected,L);
  if(['quoted_unit','tax_mode'].includes(key))drawEditor();
});
$('editor').addEventListener('change',e=>{if(e.target.dataset.quote==='currency')drawEditor();});
$('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-select]');if(!b)return;selected=Number(b.dataset.select);drawEditor();});
root.addEventListener('click',e=>{
  const edit=e.target.closest('[data-result-edit]');if(edit){selected=Number(edit.dataset.resultEdit);drawEditor();$('editor').scrollIntoView({behavior:'instant',block:'start'});$('editor').querySelector('input')?.focus();}
  if(e.target.id==='qc-remove'){if(quotes.length===1){quotes=[newQuote('q'+Date.now())];selected=0;dirty();drawEditor();return;}if(!window.confirm(L.replace))return;quotes.splice(selected,1);selected=Math.min(selected,quotes.length-1);dirty();drawEditor();}
});
$('add').addEventListener('click',()=>{if(quotes.length>=MAX_QUOTES)return;const q=newQuote('q'+Date.now());q.currency=policy.base_currency;quotes.push(q);selected=quotes.length-1;dirty();drawEditor();$('editor').querySelector('input')?.focus();});
$('example').addEventListener('click',()=>{if(!confirmReplace())return;adopt(example(lang),true);calculate(false);});
$('new').addEventListener('click',()=>{if(!confirmReplace())return;adopt({policy:newPolicy(),quotes:[newQuote('q1')]});message('');$('results').innerHTML=`<p>${L.empty}</p>`;hasChanges=false;});
$('calculate').addEventListener('click',()=>calculate());
$('csv').addEventListener('click',()=>{if(!last)return;download('bpj-quote-comparison.csv',csv([[...L.columns.slice(0,7),lang==='zh'?'报价币种':'Quote currency',L.columns[7],lang==='zh'?'比较币种':'Comparison currency',L.columns[8],L.questions,L.source_name,L.as_of,L.required_sku,L.requested_units],...exportRows()]),'text/csv;charset=utf-8');event('export-csv');});
$('report').addEventListener('click',()=>{
  if(!last)return;const m=[`# ${L.title}`,``,`${L.at}: ${policy.as_of}`,`${L.required_sku}: ${policy.required_sku}`,`${L.requested_units}: ${policy.requested_units}`,`${L.base_currency}: ${policy.base_currency}`,'',demo?L.sampleNote:L.ownNote,'',L.winner,''];
  last.results.forEach(r=>{const q=quotes.find(q=>q.id===r.id);m.push(`## ${q.supplier.replace(/[\r\n]/g,' ')}`,`${L.status[r.status]} — ${r.total??'—'} ${policy.base_currency}`,`${L.columns[2]}: ${r.ordered_units??'—'}; ${L.columns[3]}: ${r.extra_units??'—'}`,`${L.calculation}: ${r.ordered_units??'—'} / ${r.pack} × ${r.price??'—'} = ${r.subtotal??'—'} ${r.currency}; (${r.goods_gross??'—'} + ${r.freight??'—'}) × ${r.fx??'—'} = ${r.total??'—'} ${policy.base_currency}`,...r.issues.map(i=>'- '+L.issues[i.code]),'',`${L.original}: ${q.source_name}`,...q.source_text.split(/\r?\n/).map(line=>'    '+line),'');});
  m.push(L.scope,'',`BPJ ${EDITION} — https://baipiaoji.com/${lang==='en'?'en/':''}studio/quote-compare`);download('bpj-quote-review.md',m.join('\n'),'text/markdown;charset=utf-8');event('export-report');
});
$('backup').addEventListener('click',()=>{try{download('bpj-quote-backup.json',JSON.stringify(backup(),null,2),'application/json');event('export-backup');}catch(e){message(L.issues[e.message]||L.issues.BACKUP);}});
$('save').addEventListener('click',()=>{try{const raw=JSON.stringify(backup());localStorage.setItem(storageKey,raw);hasChanges=false;message(L.saved);event('save-local');}catch(e){message(L.issues[e.message]||L.storageError);}});
$('restore').addEventListener('click',()=>{try{const raw=localStorage.getItem(storageKey);if(!raw){message(L.noDraft);return;}const data=restore(JSON.parse(raw));if(!confirmReplace())return;adopt(data);message(L.restored);}catch{message(L.issues.BACKUP);}});
$('clear').addEventListener('click',()=>{try{if(!window.confirm(L.replace))return;localStorage.removeItem(storageKey);message(L.cleared);}catch{message(L.storageError);}});
$('template').addEventListener('click',()=>{const s=example(lang).quotes;download('bpj-quote-template.csv',csv([CSV_FIELDS,...s.map(q=>CSV_FIELDS.map(k=>q[k]))]),'text/csv;charset=utf-8');});
$('import').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{if(file.size>150000)throw Error('CSV_SIZE');const raw=await file.text();let data;
    if(/\.json$/i.test(file.name))data=restore(JSON.parse(raw));
    else if(/\.csv$/i.test(file.name)){const q=parseCSV(raw);data={policy,quotes:q};}
    else throw Error('FILE');
    if(!confirmReplace())return;adopt(data);message(L.imported);event('import');
  }catch(e){message(L.issues[e.message]||L.issues.FILE);}
});
drawAll();
