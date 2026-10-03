import {validateWatch,renderBrief} from './core.mjs';
import {validateSnapshot} from '../portfolio-assets/core.mjs';
const root=document.getElementById('ai-roadmap');
if(root){
 const lang=root.dataset.lang,zh=lang==='zh',t=(en,cn)=>zh?cn:en,$=id=>document.getElementById(id),key='agi-roadmap-watch-v1';
 const event=action=>{if(navigator.webdriver||/[?&](?:__qa|ci|__ci|__probe)=/.test(location.search)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name:'roadmap_'+action}}));};
 let data,watch=[],last=null,busy=false;
 const status=s=>$('rm-action-status').textContent=s;
 function save(next){try{localStorage.setItem(key,JSON.stringify(next));watch=next;paint();return true;}catch{status(t('Saving failed. Your previous watchlist is unchanged.','保存失败，原观察清单未改变。'));return false;}}
 function paint(){
  for(const b of root.querySelectorAll('[data-watch]')){const on=watch.includes(b.dataset.watch);b.setAttribute('aria-pressed',String(on));b.textContent=on?t('Watching locally · remove','已在本机观察 · 移除'):t('Add to local watchlist','加入本机观察');}
  const box=$('rm-saved');box.replaceChildren();if(!watch.length)box.textContent=t('No stocks selected yet.','尚未选择股票。');
  for(const ticker of watch){const b=document.createElement('button');b.textContent=ticker+' ×';b.type='button';b.setAttribute('aria-label',t('Remove ','移除 ')+ticker);b.onclick=()=>save(watch.filter(x=>x!==ticker));box.append(b);}
  $('rm-export').disabled=!watch.length;$('rm-clear').disabled=!watch.length;
 }
 function selectRoute(id,{notify=false}={}){
  if(!data.routes.some(r=>r.id===id))id='compute';
  for(const panel of root.querySelectorAll('[data-route]'))panel.hidden=panel.dataset.route!==id;
  for(const b of root.querySelectorAll('[data-select-route]'))b.setAttribute('aria-pressed',String(b.dataset.selectRoute===id));
  if(notify){history.replaceState(null,'','#route-'+id);event('route');}
 }
 async function returns(){
  if(busy||document.hidden||navigator.onLine===false)return;busy=true;
  try{
   const r=await fetch('/portfolio-assets/snapshot.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const d=validateSnapshot(await r.json(),last);
   if(d.as_of>new Date().toISOString().slice(0,10)||Date.parse(d.attempted_at)>Date.now()+300000)throw Error();
   if(!d.as_of)throw Error();last=d;
   const stale=d.status!=='tracking'||!Number.isFinite(Date.parse(d.last_success_at))||Date.now()-Date.parse(d.last_success_at)>96*3600000;
   $('rm-return-state').textContent=(stale?t('Retained valuation; update pending. ','保留估值，更新待完成。'):'')+t('NY close: ','纽约收盘：')+d.as_of+(d.as_of===d.entry_session?t(' · Entry only; no later performance yet.',' · 当前仅为起点，尚无后续表现。'):'');
   $('rm-return-state').classList.toggle('rm-warning',stale);const box=$('rm-return-values');box.replaceChildren();
   for(const [k,label]of [['basket',t('12-stock basket','12 股组合')],['SPY','SPY'],['QQQ','QQQ'],['TQQQ','TQQQ']]){const node=document.createElement('div'),name=document.createElement('span'),v=document.createElement('strong');name.textContent=label;const n=d.metrics[k].return_pct;v.textContent=(n>0?'+':'')+n.toFixed(2)+'%';node.append(name,v);box.append(node);}
  }catch{$('rm-return-state').textContent=last?t('Refresh failed; retained valuation: ','刷新失败，保留估值：')+last.as_of:t('Complete valuation unavailable. Open the tracker to inspect source status.','暂未取得完整估值，请打开完整追踪查看数据状态。');$('rm-return-state').classList.add('rm-warning');}finally{busy=false;}
 }
 fetch('/roadmap-assets/roadmap.json',{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{
  if(d.schema_version!==1||!Array.isArray(d.routes)||!Array.isArray(d.companies))throw Error();data=d;
  try{watch=validateWatch(JSON.parse(localStorage.getItem(key)||'[]'),data.companies);}catch{watch=[];status(t('Previous local selection could not be read.','原本机选择无法读取。'));}
  paint();selectRoute(location.hash.startsWith('#route-')?location.hash.slice(7):'compute');
  if(Date.now()>Date.parse(d.review_due+'T23:59:59Z')){$('rm-review-status').textContent=t('Editorial review is overdue. Treat the route as a dated hypothesis.','已超过路线复核期限，请按带日期的旧判断使用。');$('rm-review-status').className='rm-warning';}
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.selectRoute)selectRoute(b.dataset.selectRoute,{notify:true});if(b.dataset.watch&&data.companies.some(c=>c.ticker===b.dataset.watch)){const on=watch.includes(b.dataset.watch),next=on?watch.filter(x=>x!==b.dataset.watch):[...watch,b.dataset.watch];if(save(next)){status(t('Saved on this device only. Telegram settings were not changed.','已保存到本机，Telegram 设置未改变。'));event('watch');}}});
  $('rm-scenario').onchange=()=>{const value=$('rm-scenario').value;if(!['base','slow','fast'].includes(value))return;for(const r of data.routes)root.querySelector('[data-scenario="'+r.id+'"]').textContent=r.scenarios[value][lang];event('scenario');};
  $('rm-export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([renderBrief(data,watch,lang)],{type:'text/markdown;charset=utf-8'}));a.href=u;a.download='ai-roadmap-watchlist.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);event('export');};
  $('rm-clear').onclick=()=>{if(save([]))status(t('Local watchlist cleared.','本机观察已清空。'));};
  addEventListener('hashchange',()=>{if(location.hash.startsWith('#route-'))selectRoute(location.hash.slice(7));});
 }).catch(()=>status(t('Interactive controls are unavailable. All source-backed routes remain readable below.','交互暂不可用，下方仍可阅读全部路线与来源。')));
 root.addEventListener('click',ev=>{const a=ev.target.closest('a');if(a){if(a.href.includes('t.me/'))event('telegram_open');else if(a.href.includes('youtube.com/')||a.closest('.rm-sources'))event('source_open');else event('tool_open');}});
 returns();setInterval(returns,60000);addEventListener('online',returns);document.addEventListener('visibilitychange',()=>{if(!document.hidden)returns();});
 fetch('https://invest.agiscorecard.com/api/roadmap-status',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(s=>{$('rm-alert-state').textContent=s.last_ack_at?t('Last owner-channel acknowledgement: ','站主通道最近送达回执：')+s.last_ack_at+(s.enabled?'':t(' · Alerts paused',' · 提醒已暂停')):t('Delivery has not yet been confirmed.','尚未确认送达。');}).catch(()=>{$('rm-alert-state').textContent=t('Live notification status unavailable; query /roadmap in the bot.','通知状态暂不可用，可在机器人中查询 /roadmap。');});
}
