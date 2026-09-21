/* Self-serve payment. Capability stays in this browser, never in URLs. */
(function(){
 const f=document.getElementById('adForm');if(!f)return;
 const zh=document.documentElement.lang.startsWith('zh'),say=(cn,en)=>zh?cn:en;
 const button=f.querySelector('button'),msg=f.querySelector('.sub-msg'),box=document.getElementById('adPrice');
 const key='bpj.ad.order.v2';let order=null,ready=false,rail='web3',timer,polls=0,busy=false;
 try{order=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 if(order?.input)for(const [name,value]of Object.entries(order.input)){const el=f.elements.namedItem(name);if(el&&name!=='accept_queue'&&name!=='website')el.value=value;}
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');f.before(status);
 const payment=document.createElement('section');payment.hidden=true;f.before(payment);
 const newOrder=document.createElement('button');newOrder.type='button';newOrder.textContent=say('开始另一笔投放','Start another placement');newOrder.hidden=true;f.before(newOrder);
 function save(){localStorage.setItem(key,JSON.stringify(order));}
 function stop(){clearTimeout(timer);}
 newOrder.onclick=()=>{if(!confirm(say('请确认上一笔不再付款。已付款但未确认时，请继续查询原订单。','Confirm the previous order will not be paid. If already paid, keep checking that order.')))return;stop();localStorage.removeItem(key);order=null;polls=0;newOrder.hidden=true;payment.hidden=true;status.textContent='';msg.textContent='';button.disabled=!ready;};
 const labels={creating:['正在建立订单','Creating checkout'],pending:['等待付款或链上确认','Awaiting payment or chain confirmation'],live:['正在投放','Live'],queued:['已付款，已自动排期','Paid and scheduled'],expired:['投放已到期','Placement expired'],payment_expired:['付款窗口已到期，请勿继续转账；已付款订单仍可核验','Payment window expired. Do not send funds; existing payments can still be verified.'],refunded:['已退款，投放停止','Refunded; placement stopped'],disputed:['付款争议，投放暂停','Disputed; placement paused'],failed:['订单未能建立，请勿付款','Order could not be created. Do not pay.']};
 const errors={not_configured:['收款暂未开放','Payments are unavailable'],queue_consent:['请确认自动排期规则','Accept the scheduling terms'],order_changed:['已有订单，请恢复原内容或开始另一笔投放','Restore the existing order details or start another placement'],order_exists:['已有订单，请查看状态','An order exists; check its status'],order_expired:['结账已过期，请开始另一笔投放','Checkout expired; start another placement'],badhost:['请使用公开官网的 HTTPS 地址','Use a public official HTTPS address'],refused:['此内容不接受投放','This content is not accepted'],missing:['请检查必填项和长度','Check required fields and length'],nolinks:['说明中不能包含链接或 HTML','No links or HTML in the pitch'],rate_limited:['查询过快，请稍后重试','Please wait before retrying'],quote_capacity:['暂时无法生成付款金额，请勿转账','Unable to issue a payment quote. Do not transfer.'],chain_unavailable:['链上查询暂不可用，请保留订单稍后重试','Chain lookup unavailable; keep your order and retry later'],temporarily_unavailable:['暂未完成，请保留订单并重试','Not completed; retain your order and retry']};
 function error(d){msg.textContent=say(...(errors[d.code]||errors.temporarily_unavailable));}
 function line(label,value){const p=document.createElement('p');const b=document.createElement('strong');b.textContent=label+' ';p.append(b,document.createTextNode(value));payment.append(p);}
 function render(d){
  status.textContent=say(...(labels[d.state]||['处理中','Processing']))+(d.slot?' · '+say('赞助位 ','Sponsored slot ')+d.slot:'')+(d.starts_at?' · '+new Date(d.starts_at).toLocaleString()+' → '+new Date(d.ends_at).toLocaleString():'');
  const finished=['live','queued','expired','refunded','disputed','failed'].includes(d.state);
  newOrder.hidden=false;
  if(d.rail==='web3'){
   order.rail='web3';order.id=d.id;save();button.disabled=true;
   payment.replaceChildren();payment.hidden=finished;
   if(!finished){
    const p=d.payment;
    line(say('网络：','Network:'),p.chain);
    line(say('应付金额：','Exact amount:'),p.amount+' '+p.token);
    line(say('收款地址：','Recipient:'),p.address);
    line(say('代币合约：','Token contract:'),p.contract);
    line(say('付款截止：','Pay before:'),new Date(p.expires_at).toLocaleString());
    line('',say('金额含用于匹配订单的不足 0.01 美元尾数，请保留全部 6 位小数。网络手续费另付；使用能精确发送该金额的钱包。错链、错币或金额不符不会自动上架。','The amount includes a matching suffix below $0.01. Keep all 6 decimals. Network fees are separate; use a wallet that sends this exact amount. Wrong networks, tokens or amounts cannot be delivered automatically.'));
    line('',say('到账确认后自动排期。本页会自动查询；离开后后台约每 2 小时检查，定时任务可能延迟。退款需联系站方处理，不会自动退回钱包。','Confirmed payment is scheduled automatically. This page checks while open; background checks run about every 2 hours and can be delayed. Refunds require contacting the site and are not automatic.'));
    if(d.state!=='payment_expired')for(const [label,value]of [[say('复制地址','Copy address'),p.address],[say('复制金额','Copy amount'),p.amount]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>navigator.clipboard.writeText(value).then(()=>{msg.textContent=say('已复制','Copied');}).catch(()=>{msg.textContent=say('请手动选择并复制上方内容','Select and copy the value above');});payment.append(b);}
    const label=document.createElement('label');label.textContent=say('已付款？可填写交易哈希加快核验（可选）','Already paid? Paste the transaction hash to verify (optional)');const input=document.createElement('input');input.type='text';input.maxLength=66;input.autocomplete='off';input.value=order.tx||'';input.oninput=()=>{order.tx=input.value;save();};label.append(input);payment.append(label);
    const verify=document.createElement('button');verify.type='button';verify.textContent=say('核验到账','Verify payment');verify.onclick=()=>{polls=0;check(true);};payment.append(verify);
   }
  }else if(finished)button.disabled=true;
  if(finished){stop();return false;}return true;
 }
 async function check(manual=false){
  if(!order?.token||busy)return;busy=true;stop();
  try{
   const wallet=order.rail==='web3';
   const r=await fetch(wallet?'/api/ad-web3':'/api/ad-status',{method:'POST',headers:{Authorization:'Bearer '+order.token,'Content-Type':'application/json'},body:wallet?JSON.stringify({action:'check',...(manual&&order.tx?{tx:order.tx}:{})}):undefined});
   const d=await r.json();
   if(!r.ok){error(d);if(polls++<80)timer=setTimeout(check,15000);return;}
   if(d.check){const messages={confirming:['交易仍在确认，请勿重复付款','Transaction is still confirming. Do not pay again.'],payment_mismatch:['交易与订单不符，请核对网络、币种、地址和金额；不要重复付款','Payment does not match. Check network, token, recipient and amount; do not pay again.'],outside_payment_window:['交易不在订单付款窗口内，请联系站方核对','Transaction is outside the payment window; contact the site.'],bad_tx:['交易哈希格式不正确','Invalid transaction hash']};msg.textContent=say(...(messages[d.check]||['正在核验','Checking']));}
   if(render(d)&&polls++<80)timer=setTimeout(check,15000);
  }catch{msg.textContent=say('查询暂时失败，请保留此浏览器和付款凭据后刷新。','Lookup failed. Keep this browser and your payment receipt, then refresh.');if(polls++<80)timer=setTimeout(check,15000);}
  finally{busy=false;}
 }
 button.disabled=true;
 fetch('/api/ads?doctor=1').then(r=>r.json()).then(d=>{
  rail=d.rails?.wallet?'web3':d.rails?.card?'card':d.web3?.enabled?'web3':'card';ready=!!d.selling;button.disabled=!ready;
  const w=d.web3,price=rail==='web3'?w.price_cents:d.price_cents;
  box.textContent=(ready?(d.mode==='test'?say('测试网络，无真实收款。','Test network; no real payment.'):say('自助投放已开放。','Self-serve placements are available.')):say('暂未开售：收款配置或自动核验尚未就绪。','Not on sale: payment configuration or automated verification is not ready.'))+' '+(price/100).toFixed(2)+' '+(rail==='web3'?w.token:d.currency)+' / '+d.days+say(' 天。一次性付款，不自动续费。',' days. One-time payment, no automatic renewal.')+(rail==='web3'?say(' 另加不足 0.01 的订单匹配尾数；最终金额以下单后显示为准。',' A matching suffix below 0.01 is added; the issued quote is the final amount.'):'');
  button.textContent=rail==='web3'?say('生成 Web3 付款订单','Create Web3 payment order'):say('去付款','Continue to payment');
  if(order)check();
 }).catch(()=>{box.textContent=say('暂时无法确认开售状态，请稍后刷新。','Availability could not be checked; refresh later.');if(order)check();});
 f.addEventListener('submit',async e=>{
  e.preventDefault();if(!ready||busy)return;button.disabled=true;msg.textContent=say('正在创建订单…','Creating order…');
  const fields=f.elements,input={name:fields.namedItem('name').value,url:fields.namedItem('url').value,pitch:fields.namedItem('pitch').value,cat:fields.namedItem('cat').value,website:fields.namedItem('website').value,lang:zh?'zh':'en',accept_queue:fields.namedItem('accept_queue').checked};
  try{
   if(!order)order={token:[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join(''),input,rail};save();
   const wallet=order.rail==='web3';
   const r=await fetch(wallet?'/api/ad-web3':'/api/ad-draft',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+order.token},body:JSON.stringify({...input,order_token:order.token,action:'create'})});const d=await r.json();
   if(r.ok&&wallet){msg.textContent='';render(d);polls=0;timer=setTimeout(check,15000);return;}
   if(r.ok&&d.pay_url){order.id=d.id;save();location.assign(d.pay_url);return;}
   error(d);newOrder.hidden=false;
  }catch{msg.textContent=say('未完成。请允许本地存储，网络恢复后重试同一订单。','Not completed. Allow local storage and retry the same order when connected.');}
  button.disabled=!ready;
 });
 window.addEventListener('pagehide',stop);
})();
