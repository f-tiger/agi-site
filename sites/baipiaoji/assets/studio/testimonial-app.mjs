import {PRODUCT,project,sample,backup,restore,html,svg,ready,readTable,importTable,canvaTable} from './testimonial-core.mjs';
const root=document.getElementById('proof-app'),lang=root.dataset.lang,zh=lang==='zh',$=id=>document.getElementById('proof-'+id),say=(a,b)=>zh?a:b;
let p=sample(lang),dirty=false,url;
let completedOwn=false,checkout=null,readinessCheck=null,readinessFreshUntil=0,offerRecorded=false;
const READINESS_FRESH_MS=30000;
const status=s=>$('status').textContent=s;
function ev(action){try{const q=new URLSearchParams(location.search);if(location.hostname!=='baipiaoji.com'||['__ci','__qa','qa','__probe','ci'].some(k=>q.has(k))||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl||localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;window.bpjEv?.('biz','/proofkit/'+action);if(action!=='paid_offer_view')window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'proofkit_'+action}}));}catch{}}
function updateOffer(){
 const show=completedOwn&&checkout!==null;
 $('offer').hidden=!show;
 if(!show)return;
 const {price_units:units,days}=checkout;
 $('price').textContent=say(`${units/1e6} USDT / ${days} 天，BSC 网络，手动续期。`,`${units/1e6} USDT for ${days} days on BSC. Renew manually.`);
 if(!offerRecorded){offerRecorded=true;ev('paid_offer_view');}
}
function clearOffer(){completedOwn=false;updateOffer();}
function finishFree(action){
 ev(action+(p.demo?'_demo':'_own'));
 if(p.demo)return;
 completedOwn=true;
 if(!readinessCheck&&Date.now()>=readinessFreshUntil){
  checkout=null;
  readinessCheck=fetch('/api/member',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)})
   .then(response=>response.ok?response.json():null).then(member=>{
    const plan=member?.plan;
    if(member?.ok===true&&member.site==='bpj'&&member.ready===true&&member.chain==='bsc'&&member.token==='USDT'&&member.auto_renew===false&&
       Number.isSafeInteger(plan?.price_units)&&plan.price_units>0&&Number.isSafeInteger(plan.days)&&plan.days>0)checkout=plan;
   }).catch(()=>{}).finally(()=>{
    readinessFreshUntil=Date.now()+READINESS_FRESH_MS;
    readinessCheck=null;
    updateOffer();
   });
 }
 updateOffer();
}
function read(){return project({title:$('title').value,lang,color:$('color').value,demo:p.demo,quotes:[...$('quotes').querySelectorAll('fieldset')].map(f=>Object.fromEntries(['quote','name','role','source'].map(k=>[k,f.querySelector('[data-field='+k+']').value]).concat([['approved',f.querySelector('[data-field=approved]').checked]])))});}
function row(q,i){const f=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=say('评价 ','Quote ')+(i+1);f.append(legend);for(const [key,cn,en,max]of [['quote','评价原文','Original quote',240],['name','展示姓名','Display name',60],['role','职位或说明（可选）','Role or context (optional)',100],['source','HTTPS 原始来源（可选）','HTTPS source (optional)',500]]){const label=document.createElement('label'),input=document.createElement(key==='quote'?'textarea':'input');label.textContent=say(cn,en);input.dataset.field=key;input.maxLength=max;if(['quote','name'].includes(key))input.required=true;if(key==='source')input.type='url';input.value=q[key]||'';label.append(input);f.append(label);}const label=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.dataset.field='approved';c.checked=q.approved;label.append(c,document.createTextNode(say(' 这是真实评价，我已获得展示与使用授权。',' This is a genuine quote and I have permission to display and use it.')));f.append(label);const remove=document.createElement('button');remove.type='button';remove.textContent=say('删除这条','Remove quote');remove.onclick=()=>{if($('quotes').children.length<=1)return;f.remove();dirty=true;clearOffer();};f.append(remove);return f;}
function fill(){ clearOffer();$('title').value=p.title;$('color').value=p.color;$('quotes').replaceChildren(...p.quotes.map(row));$('kind').textContent=p.demo?say('虚构示例 · 导出仍带示例标记','Fictional example · exports retain the example label'):say('自己的项目 · 请逐条确认授权','Your project · confirm permission for each quote');$('preview').srcdoc=html({...p,quotes:p.quotes.map(q=>({...q,approved:true}))});dirty=false;}
function preview(){const q=read();$('preview').srcdoc=html({...q,quotes:q.quotes.map(t=>({...t,approved:true}))});p=q;ev(p.demo?'preview_demo':'preview_own');status(say('预览已更新。导出前请确认原文和授权。','Preview updated. Check original wording and permission before export.'));}
function download(name,data,type){if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();}
function attempt(fn){try{fn();}catch(e){status(e.message==='permission_required'?say('请逐条确认真实评价的使用授权。','Confirm permission for each genuine quote.'):say('请填写项目名、评价原文与姓名；来源只能是 HTTPS。','Enter a title, quote text and name. Sources must use HTTPS.'));}}
$('form').addEventListener('input',()=>{dirty=true;clearOffer();});$('form').onsubmit=e=>{e.preventDefault();attempt(preview);};
$('add').onclick=()=>{if($('quotes').children.length>=12)return;const q={quote:'',name:'',role:'',source:'',approved:false};$('quotes').append(row(q,$('quotes').children.length));dirty=true;clearOffer();};
const replace=()=>!dirty||confirm(say('替换当前未备份的编辑？','Replace unsaved edits?'));
$('new').onclick=()=>{if(!replace())return;clearOffer();p={title:'',lang,color:'#1b4de4',demo:false,quotes:[{quote:'',name:'',role:'',source:'',approved:false}]};$('title').value='';$('quotes').replaceChildren(row(p.quotes[0],0));$('kind').textContent=say('自己的项目 · 请逐条确认授权','Your project · confirm permission for each quote');$('preview').srcdoc='';dirty=false;status('');};
$('sample').onclick=()=>{if(replace()){p=sample(lang);fill();}};
$('import').onchange=async e=>{try{const f=e.target.files[0];if(!f||f.size>65536)throw Error();const q=restore(JSON.parse(await f.text()));if(replace()){p=q;fill();status(say('项目已恢复。','Project restored.'));}}catch{status(say('无法恢复此项目文件。','This project file could not be restored.'));}e.target.value='';};
$('backup').onclick=()=>attempt(()=>{p=read();download('bpj-quotes-project.json',JSON.stringify(backup(p),null,2),'application/json');dirty=false;ev(p.demo?'backup_demo':'backup_own');});
$('free').onclick=()=>attempt(()=>{p=ready(read());download('bpj-quotes.html',html(p),'text/html');finishFree('export');status(say('品牌展示页已生成。可自行托管此文件。','Branded wall generated. You can host the file yourself.'));});
$('svg').onclick=()=>attempt(()=>{p=ready(read());download('bpj-quote.svg',svg(p),'image/svg+xml');finishFree('image');});
const openMember=()=>attempt(()=>{p=ready(read());if(p.demo){status(say('会员交付包请使用自己的真实项目；示例可免费导出。','Use your own genuine project for a member package; examples export free.'));return;}const data=backup(p),u=new URL((zh?'':'/en')+'/members',location.origin);u.searchParams.set('tool',PRODUCT);u.searchParams.set('from',location.origin);if(new URLSearchParams(location.search).has('__ci'))u.searchParams.set('__ci','1');const win=window.open(u.href,'_blank');if(!win){status(say('请允许会员标签页打开。','Allow the member tab to open.'));return;}const nonce=crypto.randomUUID().replaceAll('-','');const handler=e=>{if(e.source===win&&e.origin===location.origin&&e.data?.kind==='workbench-member-ready')win.postMessage({kind:'workbench-save',data,handoff:nonce},location.origin);};window.addEventListener('message',handler);setTimeout(()=>window.removeEventListener('message',handler),1800000);ev('member_open');status(say('请在会员页确认草稿，然后主动点击生成交付包。','Review the draft in the member area, then explicitly generate the package.'));});
$('paid').onclick=()=>{if(completedOwn&&checkout)openMember();};
$('existing').onclick=openMember;
if(window.opener&&new URLSearchParams(location.search).get('restore')==='1'){const handler=e=>{if(e.source!==window.opener||e.origin!==location.origin||e.data?.kind!=='workbench-restore')return;attempt(()=>{p=restore(e.data.data);fill();});window.removeEventListener('message',handler);};window.addEventListener('message',handler);window.opener.postMessage({kind:'workbench-ready'},location.origin);}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});fill();

let table;
$('csv-file').onchange=async e=>{try{const f=e.target.files[0];if(!f||f.size>150000)throw Error();table=readTable(await f.text());for(const key of ['quote','name','role','source']){const select=$('map-'+key);select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=say('请选择列','Choose column');select.append(empty);for(const h of table.headers){const o=document.createElement('option');o.value=h;o.textContent=h;select.append(o);}}$('mapping').hidden=false;status(say('已读取表格。请手动对应原文、姓名等列，再导入；不会自动认定已获授权。','Table read. Map quote and name columns, then import. Permission is never inferred from the file.'));}catch{table=null;$('mapping').hidden=true;status(say('请使用格式正确、最多12条记录且小于150 KB的CSV。','Use a valid CSV with at most 12 rows and under 150 KB.'));}e.target.value='';};
$('csv-apply').onclick=()=>{try{const q=importTable(table,Object.fromEntries(['quote','name','role','source'].map(k=>[k,$('map-'+k).value])),lang);if(!replace())return;p=q;fill();dirty=true;$('mapping').hidden=true;ev('import_own');status(say('已导入。请核对原文，并逐条确认展示授权。','Imported. Review the original wording and confirm permission for each quote.'));}catch{status(say('请对应不同的原文列和姓名列。原文最多240字；来源需为HTTPS。','Map different quote and name columns. Quotes allow 240 characters; sources must use HTTPS.'));}};
$('canva').onclick=()=>attempt(()=>{p=ready(read());download('bpj-canva-quotes.csv',canvaTable(p),'text/csv;charset=utf-8');finishFree('canva');status(say('表格已生成。请在自己的Canva模板中导入并连接字段；Canva批量创建需要相应套餐。','Table generated. Import it into your own Canva template and connect fields; Bulk Create needs an eligible Canva plan.'));});
