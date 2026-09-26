/* Optional vendor decision support. No submission data, checkout creation or identifiers. */
(()=>{
 const zh=document.documentElement.lang.startsWith('zh'),say=(cn,en)=>zh?cn:en;
 const params=new URLSearchParams(location.search),qa=['__ci','__probe','qa','ci'].some(k=>params.has(k));
 if(qa)for(const a of document.querySelectorAll('a[data-commercial-action]')){const u=new URL(a.href,location.href);if(u.origin===location.origin){u.searchParams.set('__ci','1');a.href=u.href;}}
 const seen=new Set();
 function track(action){if(qa||seen.has(action)||typeof window.bpjEv!=='function')return;seen.add(action);window.bpjEv('biz','/biz/trigger/'+action);}
 function observe(el,action){if(!el)return;if(!('IntersectionObserver' in window))return;const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.5)){track(action);io.disconnect();}},{threshold:.5});io.observe(el);}
 const vendor=document.getElementById('vendorSponsor');
 document.addEventListener('bpj:submission-accepted',()=>{if(!vendor)return;vendor.hidden=false;observe(vendor,'vendor-view');},{once:true});
 const decision=document.getElementById('adDecision');observe(decision,'ad-view');
 document.addEventListener('click',e=>{
  const el=e.target.closest?.('[data-commercial-action]');if(!el)return;
  const action=el.dataset.commercialAction;
  if(!['vendor-sponsor','vendor-wait','ad-wallet','ad-reach','ad-later'].includes(action))return;
  track(action);
  if(action==='vendor-wait'){vendor.hidden=true;return;}
  if(action.startsWith('ad-')){for(const b of decision.querySelectorAll('button[data-commercial-action]')){b.disabled=true;b.setAttribute('aria-pressed',String(b===el));}const msg=document.getElementById('adReasonStatus');if(msg)msg.textContent=say('已选择；你可以不创建订单。此反馈不订阅邮件，也不改变免费投稿。','Selected. You can leave without creating an order. This feedback does not subscribe you to emails or affect a free submission.');}
 });
 const availability=document.querySelector('[data-commercial-availability]');
 if(availability)fetch('/api/ads?doctor=1',{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw Error();
  if(d.mode==='test'){availability.textContent=say('当前为测试模式，没有真实收款。请勿发送真实资金。','Test mode: no real payments. Do not send real funds.');return;}
  if(!d.selling){availability.textContent=say('目前不能创建新投放订单。免费投稿照常处理。','New placement orders are unavailable. Free submissions are unaffected.');return;}
  const wallet=d.rails?.wallet===true,card=d.rails?.card===true;
  if(wallet&&!card){const w=d.web3;if(!w||!Number.isFinite(w.price_cents)||!Number.isFinite(d.days))throw Error();availability.textContent=say(`当前入口使用 ${w.chain.toUpperCase()} 网络 ${w.token}，${(w.price_cents/100).toFixed(2)} ${w.token} / ${d.days} 天，另加不足 0.01 的订单识别尾数和网络手续费；暂不支持银行卡。没有合适钱包时可继续免费投稿。`,`The current checkout uses ${w.token} on ${w.chain.toUpperCase()}: ${(w.price_cents/100).toFixed(2)} ${w.token} for ${d.days} days, plus a matching suffix below 0.01 and network fees. Card payment is unavailable. You can continue with a free submission if this payment method does not suit you.`);}
  else availability.textContent=say('开售状态已核对；具体付款方式和精确金额以订单页为准。','Availability checked; confirm payment methods and the exact amount on the order page.');
 }).catch(()=>{availability.textContent=say('暂时无法核对支付方式；请稍后刷新，不要据此转账。','Payment methods could not be checked. Refresh later; do not transfer based on this message.');});
})();
