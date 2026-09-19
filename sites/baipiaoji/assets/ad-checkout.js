/* Self-serve checkout and capability-protected delivery status; no query tokens. */
(function(){
 const f=document.getElementById('adForm');if(!f)return;
 const zh=document.documentElement.lang.startsWith('zh'), button=f.querySelector('button'),msg=f.querySelector('.sub-msg'),box=document.getElementById('adPrice');
 const say=(cn,en)=>zh?cn:en,storageKey='bpj.ad.order.v2';let order=null,ready=false;
 try{order=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
 if(order?.input)for(const [name,value] of Object.entries(order.input)){const el=f.elements.namedItem(name);if(el&&name!=='accept_queue'&&name!=='website')el.value=value;}
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');f.before(status);
 const newOrder=document.createElement('button');newOrder.type='button';newOrder.textContent=say('开始另一笔投放','Start another placement');newOrder.hidden=true;f.before(newOrder);
 newOrder.onclick=()=>{if(!confirm(say('请先确认上一笔已结束或不再付款。新投放将另建订单。','Confirm the previous order is finished or will not be paid. This creates a separate order.')))return;localStorage.removeItem(storageKey);order=null;newOrder.hidden=true;status.textContent='';button.disabled=!ready;};
 function save(){localStorage.setItem(storageKey,JSON.stringify(order));}
 function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function ev(path){if(window.bpjEv)window.bpjEv('ad',path);}
 let polls=0,timer;
 async function check(){
  if(!order?.token)return;
  try{
   const r=await fetch('/api/ad-status',{method:'POST',headers:{Authorization:'Bearer '+order.token}});const d=await r.json();
   if(!r.ok){status.textContent=say('订单状态暂时查不到，请保留此浏览器和付款凭据，稍后刷新。','Status is temporarily unavailable. Keep this browser and payment receipt, then refresh.');return;}
   const labels={creating:['正在建立订单','Creating checkout'],pending:['等待支付确认','Awaiting payment confirmation'],live:['正在投放','Live'],queued:['已付款，已自动排期','Paid and scheduled'],expired:['投放或结账已到期','Placement or checkout expired'],refunded:['已退款，投放停止','Refunded; placement stopped'],disputed:['付款争议，投放暂停','Disputed; placement paused'],failed:['付款失败','Payment failed']};
   status.textContent=say(...(labels[d.state]||['处理中','Processing']))+(d.slot?' · '+say('赞助位 ','Sponsored slot ')+d.slot:'')+(d.starts_at?' · '+new Date(d.starts_at).toLocaleString()+' → '+new Date(d.ends_at).toLocaleString():'');
   if(['live','queued','expired','refunded','disputed','failed'].includes(d.state)){button.disabled=true;newOrder.hidden=false;return;}
   if(polls++<12)timer=setTimeout(check,5000);
  }catch{status.textContent=say('暂时无法查询订单，稍后刷新。','Unable to check status; refresh later.');}
 }
 button.disabled=true;
 fetch('/api/ads?doctor=1').then(r=>r.json()).then(d=>{
  ready=!!d.selling;button.disabled=!ready;
  box.textContent=(ready?(d.mode==='test'?say('测试模式，不会真实扣款。','Test mode; no real charge.'):say('自助投放已开放。','Self-serve placements are available.')):say('暂未开售：收款通道尚未接通。','Not on sale: payment is not connected.'))+' '+(d.price_cents/100).toFixed(2)+' '+d.currency+' / '+d.days+say(' 天；税费如适用在结账显示。一次性付款，不自动续费。',' days; applicable tax appears at checkout. One-time payment, no automatic renewal.');
  if(order)check();
 }).catch(()=>{box.textContent=say('暂时无法确认收款状态，请稍后刷新。','Payment availability cannot be checked; refresh later.');});
 f.addEventListener('submit',async e=>{
  e.preventDefault();if(!ready)return;
  button.disabled=true;msg.textContent=say('正在创建安全结账…','Creating secure checkout…');
  const fields=f.elements;
  const input={name:fields.namedItem('name').value,url:fields.namedItem('url').value,pitch:fields.namedItem('pitch').value,cat:fields.namedItem('cat').value,website:fields.namedItem('website').value,lang:zh?'zh':'en',accept_queue:fields.namedItem('accept_queue').checked};
  try{
   if(!order)order={token:token(),input};save(); // Fail before charging if persistence is unavailable.
   const r=await fetch('/api/ad-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,order_token:order.token})});const d=await r.json();
   if(r.ok&&d.pay_url){order.id=d.id;save();ev('/ad/pay/redirect');location.assign(d.pay_url);return;}
   const errors={not_configured:['收款尚未接通','Payments are not connected'],queue_consent:['请确认自动排期规则','Please accept the scheduling terms'],order_changed:['已有待付订单；请恢复原内容重试，或开始另一笔投放','A pending order exists; restore its details or start another placement'],order_exists:['已有订单，请查看投放状态','An order exists; check its status'],order_expired:['结账已过期，请开始另一笔投放','Checkout expired; start another placement'],badhost:['请使用公开官网的 HTTPS 地址','Use a public official HTTPS address'],refused:['此内容不接受投放','This content is not accepted'],missing:['请检查必填项和长度','Check required fields and length'],nolinks:['说明中不能包含链接或 HTML','No links or HTML inside the pitch']};
   msg.textContent=say(...(errors[d.code]||['暂未完成，请保留订单并重试','Not completed; retain this order and retry']));
   if(['order_changed','order_exists','order_expired','checkout_unavailable'].includes(d.code))newOrder.hidden=false;
  }catch{msg.textContent=say('未完成。请允许本地存储，网络恢复后重试同一订单。','Not completed. Allow local storage and retry the same order when connected.');}
  button.disabled=!ready;
 });
 window.addEventListener('pagehide',()=>clearTimeout(timer));
})();
