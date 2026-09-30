import {PRODUCT,METRICS,TICKERS,usable,baseline,changes,stale,normalize,emptyNote,validateReview} from './core.mjs';
const zh=document.body.dataset.language==='zh',t=(en,cn)=>zh?cn:en,$=id=>document.getElementById(id);
const names={revenue:t('Revenue','收入'),income:t('Net income','净利润'),ocf:t('Operating cash flow','经营现金流'),capex:t('Cash property capex','固定资产现金支出'),inventory:t('Inventory balance','存货余额')};
const layers={compute:t('Compute & design','算力与设计'),memory:t('Memory & manufacturing','存储与制造'),systems:t('Servers & networking','服务器与网络'),power:t('Power & cooling','供电与散热'),cloud:t('Cloud platforms','云平台'),facilities:t('Data centers','数据中心')};
const slot='agi-infrastructure-v1',historySlot=slot+'-history';
let snapshot,state={selected:'NVDA',watch:[],notes:{}},report=null,pending=false,cloudContext=null,cloudWindow=null,cloudHandler=null;
const status=message=>$('status').textContent=message;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const company=()=>snapshot.companies.find(c=>c.ticker===state.selected);
function stash(){if(!snapshot)return;const n=state.notes[state.selected]||emptyNote();for(const k of ['thesis','counter','trigger','review'])n[k]=$('note-'+k).value;state.notes[state.selected]=n;}
function record(){stash();return normalize({version:1,product:PRODUCT,values:state});}
function format(n){return (n/1e9).toLocaleString(zh?'zh-CN':'en-US',{maximumFractionDigits:3,minimumFractionDigits:2});}
function sourceLink(f,label){const a=el('a',label);a.href=f.source;a.target='_blank';a.rel='noopener noreferrer';return a;}
function renderList(){
 const q=$('search').value.trim().toLowerCase(),layer=$('layer').value,only=$('watched-only').checked;
 const items=snapshot.companies.filter(c=>(layer==='all'||c.layer===layer)&&(!only||state.watch.includes(c.ticker))&&(c.ticker+' '+c.name+' '+c.entity).toLowerCase().includes(q));
 $('companies').replaceChildren(...items.map(c=>{const b=el('button',undefined,'company-option');b.type='button';b.setAttribute('aria-pressed',String(c.ticker===state.selected));b.dataset.ticker=c.ticker;const name=el('span',c.ticker);name.append(el('small',c.name));b.append(name,el('span',state.watch.includes(c.ticker)?'★':layers[c.layer]));b.onclick=()=>{stash();state.selected=c.ticker;report=null;$('ai-result').replaceChildren();$('ai-status').textContent='';render();const u=new URL(location.href);u.searchParams.set('ticker',c.ticker);history.replaceState(null,'',u);};return b;}));
 $('company-count').textContent=items.length+' / '+snapshot.companies.length+' · '+t('My watchlist: ','我的关注：')+state.watch.length;
 if(!items.length)$('companies').append(el('p',t('No matches. Change the search or watchlist filter.','没有匹配项，请调整搜索或关注筛选。'),'small'));
}
function renderComparison(){
 const items=state.watch.map(t=>snapshot.companies.find(c=>c.ticker===t));$('comparison').hidden=items.length<2;if(items.length<2)return;
 const head=el('tr');head.append(el('th',t('Metric · USD billions','指标 · 十亿美元')));for(const c of items){const th=el('th',c.ticker);th.scope='col';th.append(el('small',c.name),el('small',t('Year ended ','年度截至 ')+c.annual_end));head.append(th);}
 $('compare-head').replaceChildren(head);$('compare-body').replaceChildren(...METRICS.map(k=>{const row=el('tr'),th=el('th',names[k]);th.scope='row';row.append(th);for(const c of items){const f=c.facts[k],cell=el('td');cell.append(usable(f)?sourceLink(f,format(f.val)):el('span','—'));row.append(cell);}return row;}));
}
function renderFacts(c){
 $('facts').replaceChildren(...METRICS.map(k=>{const f=c.facts[k],row=el('tr'),label=el('td'),value=el('td'),period=el('td');label.append(el('span',names[k]));
  if(!usable(f)){value.textContent='—';period.textContent=f?.error==='conflicting_facts'?t('Conflicting facts withheld','冲突数据未展示'):t('No standard fact for this annual period','本年度未找到匹配标准数据');}
  else{
   label.append(el('br'),sourceLink(f,t('Open filing ↗','打开披露 ↗')));
   const d=el('details'),s=el('summary',t('Tag & history','标签与记录'));d.append(s,el('p','us-gaap:'+f.tag),el('p',t('First disclosed: ','首次披露：')+f.original_filed));
   if(f.revised)d.append(el('p',t('Value differs from its earliest disclosure. Check the reason in the filing.','数值与最早披露不同，请在原文核对原因。')));
   label.append(d);value.textContent=format(f.val);
   if(f.kind==='annual'&&Number.isFinite(f.yoy))value.append(el('small',t('YoY ','同比 ')+(f.yoy>=0?'+':'')+f.yoy.toFixed(1)+'%'));
   if(f.previous)value.append(el('small',t('Prior end ','上期截至 ')+f.previous.end));
   period.textContent=f.start?f.start+' → '+f.end:t('As of ','截至 ')+f.end;
   period.append(el('small',f.form+' · '+t('Filed ','披露 ')+f.filed),el('small','US GAAP · USD'));
  }row.append(label,value,period);return row;
 }));
}
function reviewStatus(){const c=company(),n=state.notes[c.ticker]||emptyNote(),diff=changes(c,n.baseline);$('changes').hidden=!diff.length;$('changes').textContent=t('Changed since your last reviewed values: ','相比你上次复查的数值有变化：')+diff.map(k=>names[k]).join(' · ');
 $('review-status').textContent=(Object.keys(n.baseline).length?t('A comparison baseline is recorded. ','已记录比较基线。'):t('No reviewed baseline yet. ','尚未标记已复查数据。'))+(n.review?(n.review<=new Date().toISOString().slice(0,10)?t('Review due: ','已到复查日：'):t('Review on: ','计划复查：'))+n.review:'');}
function render(){const c=company();renderList();renderComparison();$('company-name').textContent=c.name+' · '+c.ticker;$('company-layer').textContent=layers[c.layer];$('company-date').textContent=t('SEC checked: ','SEC 核对：')+c.checked_at.replace('T',' ').replace('Z',' UTC')+(stale(c)?t(' · Refresh overdue or failed; showing last good facts.',' · 刷新逾期或失败，正在显示上次成功数据。'):'');
 $('watch').textContent=(state.watch.includes(c.ticker)?'★ ':'☆ ')+t('Watch','关注');$('watch').setAttribute('aria-pressed',String(state.watch.includes(c.ticker)));renderFacts(c);
 const n=state.notes[c.ticker]||emptyNote();for(const k of ['thesis','counter','trigger','review'])$('note-'+k).value=n[k];reviewStatus();$('ai-run').disabled=pending||stale(c);
 const u=new URL($('language').href);u.searchParams.set('ticker',c.ticker);$('language').href=u.pathname+u.search;
}
function restore(raw){const r=normalize(raw);state=r.values;report=null;$('ai-result').replaceChildren();render();status(t('Record restored. Imported notes and baselines are user supplied, not authenticated.','记录已恢复。导入的笔记与基线由用户提供，未经真实性核验。'));}
function historyList(){try{const list=JSON.parse(localStorage.getItem(historySlot)||'[]');if(!Array.isArray(list))return [];return list.slice(-10).filter(x=>typeof x?.at==='string'&&x.record);}catch{return [];}}
function showHistory(){const list=historyList();$('local-history').replaceChildren(el('option','—'));$('local-history').firstChild.value='';list.forEach((x,i)=>{const o=el('option',x.at.replace('T',' ').slice(0,19)+' UTC');o.value=String(i);$('local-history').append(o);});}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function protect(fn){return (...args)=>{try{const result=fn(...args);if(result?.catch)result.catch(()=>status(t('Could not complete this action. Check the record format, date or browser storage. Keep an exported copy.','操作未完成，请检查文件格式、日期或浏览器存储，并保留导出副本。')));}catch{status(t('Could not complete this action. Check the record format, date or storage limit (60 KB).','操作未完成，请检查文件格式、日期或记录大小（最大 60 KB）。'));}};}
for(const id of ['search','layer','watched-only'])$(id).addEventListener(id==='search'?'input':'change',()=>{if(snapshot)renderList();});
for(const k of ['thesis','counter','trigger','review'])$('note-'+k).addEventListener('input',()=>{stash();reviewStatus();status(t('Unsaved changes in this tab.','当前标签页有尚未保存的修改。'));});
$('watch').onclick=()=>{const ticker=state.selected;state.watch=state.watch.includes(ticker)?state.watch.filter(t=>t!==ticker):[...state.watch,ticker];stash();render();status(t('Watchlist changed. Save to keep it.','关注列表已修改，请保存以保留。'));};
$('baseline').onclick=()=>{stash();state.notes[state.selected].baseline=baseline(company());reviewStatus();status(t('Current facts marked reviewed. Save the record to keep this baseline.','已将当前数据标记为复查基线，请保存记录。'));};
$('save-local').onclick=protect(()=>{const r=record(),h=[...historyList(),{at:new Date().toISOString(),record:r}].slice(-10);localStorage.setItem(historySlot,JSON.stringify(h));localStorage.setItem(slot,JSON.stringify(r));showHistory();status(t('Saved in this browser with version history. No cloud upload.','已保存到本浏览器并保留历史版本，未上传云端。'));});
$('restore-local').onclick=protect(()=>{const raw=localStorage.getItem(slot);if(!raw){status(t('No local record found.','没有本机记录。'));return;}restore(JSON.parse(raw));cloudContext=null;});
$('restore-version').onclick=protect(()=>{const i=$('local-history').value;if(i==='')return;restore(historyList()[Number(i)].record);cloudContext=null;});
$('erase-local').onclick=protect(()=>{localStorage.removeItem(slot);localStorage.removeItem(historySlot);showHistory();status(t('Local copies deleted. Current fields, downloads and cloud versions remain.','本机副本已删除，当前表单、下载文件及云端版本仍保留。'));});
$('export-json').onclick=protect(()=>download('ai-infrastructure-notes.json',JSON.stringify(record(),null,2),'application/json'));
$('import-json').onchange=protect(async e=>{const f=e.target.files[0];try{if(!f)return;if(f.size>60000)throw Error('size');restore(JSON.parse(await f.text()));cloudContext=null;}finally{e.target.value='';}});
$('export-md').onclick=protect(()=>{const r=record(),c=company(),n=r.values.notes[c.ticker]||emptyNote();const lines=['# '+t('AI infrastructure research','AI 产业链研究')+' · '+c.ticker,'',t('Snapshot: ','数据快照：')+snapshot.id,t('Checked: ','核对时间：')+c.checked_at,t('Scope: annual company-wide US GAAP facts, not AI segment revenue.','范围：公司整体 US GAAP 年度数据，不是 AI 分部收入。'),stale(c)?t('Refresh overdue or failed.','刷新逾期或失败。'):'',t('Exported: ','导出：')+new Date().toISOString(),''];for(const k of METRICS){const f=c.facts[k];lines.push('## '+names[k]);if(usable(f))lines.push('USD '+f.val,`${f.start||'As of'} → ${f.end}`,`${f.form} · filed ${f.filed} · us-gaap:${f.tag}`,f.source);else lines.push(t('Unavailable','不可用'));lines.push('');}
 for(const k of ['thesis','counter','trigger','review'])lines.push('## '+$('note-'+k).parentElement.firstChild.textContent,n[k]||'—','');
 if(report?.ticker===c.ticker){lines.push('## '+t('AI questions — unverified hypotheses','AI 研究问题——待核实假设'),report.model,report.generated_at);for(const item of report.review.checks){lines.push('- '+item.question);for(const id of item.sources){const f=Object.values(c.facts).find(f=>f?.id===id);lines.push('  '+f.source);}}}
 lines.push('',t('Not a stock recommendation. Open the sources and reconcile financial periods and definitions.','非股票推荐，请打开来源并核对财务期间和定义。'),'https://agiscorecard.com'+(zh?'/zh':'')+'/ai-infrastructure?ticker='+c.ticker);download(c.ticker+'-research.md',lines.join('\n'),'text/markdown;charset=utf-8');});
$('ai-run').onclick=async()=>{
 if(!$('ai-consent').checked){$('ai-status').textContent=t('Check the consent box first.','请先勾选调用授权。');return;}
 const c=company(),ticker=c.ticker;pending=true;report=null;$('ai-run').disabled=true;$('ai-result').replaceChildren();$('ai-status').textContent=t('Preparing questions from the displayed facts…','正在依据显示的数据生成研究问题…');
 try{const response=await fetch('/api/infrastructure-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker,lang:zh?'zh':'en',consent:true,snapshot:snapshot.id})});const j=await response.json();if(state.selected!==ticker)return;
  if(!response.ok){const errors={rate_limited:t('Trial quota reached. Retry after the window resets; the data and notes still work.','试用额度已用完，请在计数窗口重置后重试；数据和笔记仍可使用。'),snapshot_changed:t('New data was deployed. Export unsaved notes, then reload before generating.','数据已更新，请先导出未保存笔记，再刷新页面生成。'),stale:t('Data needs refreshing. AI questions are paused for this company.','数据待刷新，该公司的 AI 问题生成暂不可用。'),ai_failed:t('AI did not return a usable, source-linked response. No result was substituted. This attempt used quota.','AI 未返回可用的带来源结果，本次调用已计入额度。')};throw Error(errors[j.code]||t('AI is temporarily unavailable. Data, notes and exports remain available.','AI 暂不可用，数据、笔记和导出仍可使用。'));}
  const review=validateReview(j.review,c);if(j.snapshot!==snapshot.id||j.ticker!==ticker)throw Error(t('Response does not match this snapshot.','结果与当前数据快照不匹配。'));
  report={...j,review};const list=el('ol');for(const item of review.checks){const li=el('li');li.append(el('p',item.question));for(const id of item.sources){const [k,f]=Object.entries(c.facts).find(([,f])=>f?.id===id);li.append(sourceLink(f,names[k]+' · USD '+format(f.val)+t(' bn',' 十亿')+' · '+f.end),el('br'));}list.append(li);}$('ai-result').replaceChildren(list,el('p',j.model+' · '+j.generated_at,'small'));$('ai-status').textContent=t('Generated questions, not verified findings.','已生成问题，不代表已核验结论。');
 }catch(e){if(state.selected===ticker)$('ai-status').textContent=e.message;}finally{pending=false;$('ai-run').disabled=stale(company());}
};
$('save-cloud').onclick=protect(()=>{
 const data=record(),json=JSON.stringify(data),handoff=[...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(cloudHandler)window.removeEventListener('message',cloudHandler);
 const target=new URL((zh?'/zh':'')+'/members',location.origin);target.searchParams.set('tool',PRODUCT);target.searchParams.set('from',location.origin);if(new URLSearchParams(location.search).has('__qa'))target.searchParams.set('__qa','1');
 cloudWindow=window.open(target.href,'_blank');const win=cloudWindow;if(!win){status(t('Allow the member page to open, or export JSON and import it there.','请允许打开会员页，或导出 JSON 后在该页导入。'));return;}
 let delivered=false;cloudHandler=e=>{if(e.origin!==location.origin||e.source!==win)return;if(e.data?.kind==='workbench-member-ready'&&!delivered){win.postMessage({kind:'workbench-save',data,handoff,context:cloudContext},location.origin);delivered=true;status(t('Draft opened in the member page. Nothing is uploaded until you choose Save there.','草稿已交给会员页，只有在那里主动点击保存后才会上传。'));}
  if(e.data?.kind==='workbench-saved'&&e.data.handoff===handoff&&e.data.product===PRODUCT){cloudContext=e.data.context;status(e.data.same&&JSON.stringify(record())===json?t('This version was saved to your cloud workspace.','此版本已保存到云端工作区。'):t('A cloud version was saved. Changes in this tab may still be unsaved.','已保存一个云端版本，当前标签页的后续修改可能尚未保存。'));}};
 window.addEventListener('message',cloudHandler);const handler=cloudHandler;setTimeout(()=>window.removeEventListener('message',handler),120000);
});
async function start(){
 for(const [key,label]of Object.entries(layers)){const o=el('option',label);o.value=key;$('layer').append(o);}
 if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.classList.add('embed');
 try{const r=await fetch('/infrastructure-assets/snapshot.json',{cache:'no-cache'});if(!r.ok)throw Error('snapshot');snapshot=await r.json();if(snapshot.version!==1||snapshot.companies.length!==20)throw Error('snapshot');
  try{const local=localStorage.getItem(slot);if(local){state=normalize(JSON.parse(local)).values;status(t('Restored your local watchlist and notes.','已恢复本机关注列表和笔记。'));}}catch{status(t('A local record could not be restored. You can still import a backup.','本机记录无法恢复，仍可导入备份。'));}
  const ticker=new URLSearchParams(location.search).get('ticker');if(TICKERS.includes(ticker))state.selected=ticker;
  $('data-status').textContent=t('Snapshot checked ','快照核对 ')+snapshot.attempted_at.replace('T',' ').replace('Z',' UTC')+' · '+snapshot.companies.length+t(' companies · Latest available annual filings, not real-time prices',' 家公司 · 最近可用年报，不是实时行情')+(snapshot.companies.some(c=>stale(c))?t(' · Some data needs refreshing.',' · 部分数据待刷新。'):'');render();showHistory();
  if(window.opener&&new URLSearchParams(location.search).get('restore')==='1'){const handler=e=>{if(e.origin!==location.origin||e.source!==window.opener||e.data?.kind!=='workbench-restore')return;try{restore(e.data.data);cloudContext=e.data.context||null;}catch{status(t('Invalid cloud record. Your current work was retained.','云端记录无效，当前研究已保留。'));}window.removeEventListener('message',handler);};window.addEventListener('message',handler);window.opener.postMessage({kind:'workbench-ready'},location.origin);setTimeout(()=>window.removeEventListener('message',handler),120000);}
 }catch{$('data-status').textContent=t('The snapshot could not load. Reload to retry, or open the source JSON below.','数据快照载入失败，请刷新重试或打开下方来源 JSON。');for(const b of document.querySelectorAll('button'))b.disabled=true;}
}
start();
