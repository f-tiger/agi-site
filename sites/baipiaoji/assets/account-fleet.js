(async()=>{
// An explicit account-owner confirmation precedes every cross-site sign-in.
// Neither URL parameters nor an existing BPJ session automatically grant access.
const q=new URL(location.href).searchParams,host=q.get('fleet'),state=q.get('state'),challenge=q.get('challenge');
if(host&&/^[a-z0-9.-]+$/.test(host)&&/^[A-Za-z0-9_-]{43}$/.test(state||'')&&/^[A-Za-z0-9_-]{43}$/.test(challenge||'')){
 const site=await fetch('/api/account-fleet?host='+encodeURIComponent(host)).then(r=>r.json()).catch(()=>null);if(!site?.site)return;
 const panel=document.createElement('section');panel.className='account-panel';
 const title=document.createElement('h2');title.textContent='继续前往 / Continue to '+host;
 const note=document.createElement('p');note.textContent='请先完成注册或登录，再确认将你的账户编号、显示名和邮箱用于本站登录。不会订阅营销邮件或开通付费服务。 Sign in below, then confirm sharing your account ID, display name and email with this site. No marketing subscription or paid service is enabled.';
 const button=document.createElement('button');button.type='button';button.disabled=true;button.textContent='确认并返回本站 / Confirm and return';
 const status=document.createElement('p');status.setAttribute('role','status');
 panel.append(title,note,button,status);document.querySelector('.bpj-account-page')?.prepend(panel);
 const check=setInterval(()=>{button.disabled=!window.bpjAccount?.state?.user||!!window.bpjAccount?.state?.error;},500);
 window.addEventListener('pagehide',()=>clearInterval(check),{once:true});
 button.onclick=async()=>{clearInterval(check);button.disabled=true;try{
  const r=await fetch('/api/account-fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'authorize',host,state,challenge,confirmed:true,account_id:window.bpjAccount?.state?.user?.id})});const result=await r.json();if(!r.ok)throw Error();
  const target=new URL(result.redirect);if(target.protocol!=='https:'||target.hostname!==host||target.pathname!=='/auth/callback')throw Error();location.replace(target.href);
 }catch{status.textContent='无法返回本站，请从原站重新开始登录。 Could not continue. Please restart sign-in from the original site.';button.disabled=false;}};
}

})();
