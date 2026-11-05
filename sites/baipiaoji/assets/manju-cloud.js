(() => {
 'use strict';
 const panel=document.querySelector('#mj-cloud'),local=globalThis.ManjuWatchlist;if(!panel||!local)return;
 const status=panel.querySelector('[role="status"]'),login=panel.querySelector('[data-cloud-login]'),buttons=[...panel.querySelectorAll('button')];
 let remote=null,busy=false,epoch=0;
 const fingerprint=()=>JSON.stringify(local.read());
 const say=text=>{status.textContent=text;};
 function render(){for(const button of buttons)button.disabled=busy||(button.dataset.cloud!=='check'&&!remote);login.hidden=!!remote;}
 function invalidate(){epoch++;remote=null;render();}
 document.addEventListener('bpj-account-identity',()=>{invalidate();say('账户状态已变化，请重新查看云片单。本机收藏仍保留。');});
 // Returning from an account tab requires an explicit fresh read before a write.
 function leaveAccountContext(){if(remote||busy){invalidate();say('页面或账户状态已变化，请重新查看云片单。本机收藏仍保留。');}}
 window.addEventListener('blur',leaveAccountContext);window.addEventListener('pagehide',leaveAccountContext);
 window.addEventListener('focus',leaveAccountContext);window.addEventListener('pageshow',event=>{if(event.persisted)leaveAccountContext();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')leaveAccountContext();});
 const errors={authentication_required:'请先登录或免费注册，然后回到这里查看云片单。本机收藏仍保留。',account_changed:'账户已切换，请重新查看当前账户的云片单。',version_or_session_changed:'云片单或登录状态已变化。请重新查看后再选择保存；本机收藏没有改动。',rate_limited:'操作过于频繁，请稍后重试。本机收藏仍保留。',invalid_body:'片单内容超出支持范围，请刷新目录后重试。本机收藏仍保留。'};
 async function request(body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api/manju-watchlist',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal});
   const data=await response.json();if(!response.ok||data.ok!==true)throw Error(data.error||'unavailable');
   if(typeof data.account_id!=='string'||!Number.isSafeInteger(data.version)||data.version<0||!local.valid(data.ids)||data.ids.length>200)throw Error('unavailable');
   return data;
  }finally{clearTimeout(timer);}
 }
 function success(action){document.dispatchEvent(new CustomEvent('manju:action',{detail:'cloud_'+action}));}
 async function run(action){
  if(busy||(action!=='check'&&!remote))return;
  const generation=epoch,expected=remote,initial=fingerprint(),initialSnapshot=local.snapshot();busy=true;render();say('正在读取账户片单……');
  try{
   if(action==='check'){
    const data=await request();if(epoch!==generation)return;
    remote=data;say(`账户云片单有 ${data.ids.length} 部。本机有 ${local.read().length} 部；不会自动合并或上传。${data.unavailable_count?'部分旧目录作品已不再提供。':''}`);
   }else if(action==='restore'){
    if(!initialSnapshot){say('无法确认本机片单存储，未执行恢复。请先导出或检查浏览器存储。');return;}
    const data=await request();if(epoch!==generation)return;
    if(data.account_id!==expected.account_id)throw Error('account_changed');
    remote=data;
    if(local.snapshot()?.raw!==initialSnapshot.raw){say('读取期间本机片单有改动，已取消恢复。请检查后重新操作。');return;}
    if(!confirm(`用当前账户云片单的 ${data.ids.length} 部作品替换本机 ${local.read().length} 部收藏？可先取消并导出本机收藏。`)){say('已取消恢复，本机收藏没有改动。');return;}
    if(epoch!==generation||local.snapshot()?.raw!==initialSnapshot.raw){say('状态已变化，未恢复。请重新查看云片单。');return;}
    if(!local.replace(data.ids,initialSnapshot)){say('浏览器无法写入本地存储，未完成恢复。原本机片单仍保留，可先导出备份。');return;}
    say(`已恢复 ${data.ids.length} 部作品到本机。观看进度与推荐偏好仍只在本机。`);success('restore');
   }else{
    const list=local.read();if(action==='save'&&list.length>200){say('云片单最多保存 200 部，请先缩减收藏；完整本机片单仍可导出。');return;}
    const message=action==='delete'?'删除当前账户的云片单？本机收藏保留。':`将本机 ${list.length} 部作品保存到当前账户，替换已有的 ${expected.ids.length} 部云片单？`;
    if(!confirm(message)){say('已取消，片单没有改动。');return;}
    if(epoch!==generation)return;
    say(action==='delete'?'正在删除云片单……':'正在保存片单……');
    const data=await request({action,account_id:expected.account_id,version:expected.version,...(action==='save'?{ids:list}:{})});
    if(epoch!==generation)return;if(data.account_id!==expected.account_id)throw Error('account_changed');
    remote=data;
    say(action==='delete'?'云片单已删除，本机收藏保留。':`已保存 ${data.ids.length} 部作品到当前账户。${fingerprint()!==initial?'本机随后有新改动，尚未保存到云端。':'其他设备可登录同一账户，手动恢复。'}`);success(action);
   }
  }catch(error){if(epoch===generation){invalidate();say(errors[error.message]||'操作未确认成功，未改动本机片单。请重新查看云片单确认云端状态后再试。');}}
  finally{busy=false;render();}
 }
 for(const button of buttons)button.addEventListener('click',()=>run(button.dataset.cloud));
 render();
})();
