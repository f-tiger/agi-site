(async()=>{
// This module explains a verified source site. Only an explicit click grants its session.
const q=new URL(location.href).searchParams,host=q.get('fleet'),state=q.get('state'),challenge=q.get('challenge');
if(!['fleet','state','challenge'].some(key=>q.has(key)))return;
const zh=document.documentElement.lang.startsWith('zh'),T=(a,b)=>zh?a:b;
const page=document.querySelector('.bpj-account-page');if(!page)return;
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
function sourceError(retryable){
 const box=el('section');box.id='account-fleet-error';box.className='account-panel';
 box.append(el('h2',T('暂时无法继续原站登录','Could not continue to your site')));
 const note=el('p',retryable?T('暂时无法核实来源站点。请重试；确认站点前不会授予跨站登录权限。','We could not verify the source site. Retry below; no cross-site access is granted before the site is verified.'):T('登录链接无效。请返回原站，重新打开注册或登录入口。','This sign-in link is invalid. Return to the original site and start again.'));
 note.setAttribute('role','status');box.append(note);page.prepend(box);return box;
}
if(!host||!/^[a-z0-9.-]+$/.test(host)||!/^[A-Za-z0-9_-]{43}$/.test(state||'')||!/^[A-Za-z0-9_-]{43}$/.test(challenge||'')||['fleet','state','challenge'].some(key=>q.getAll(key).length!==1)){sourceError(false);return;}
let siteName='',panel,button,note,mailNote,flowNote,recoveryPending=false,providersReady=false,mailAvailable=false,pendingContinue=false,authorizing=false,version=0;
const account=()=>window.bpjAccount?.state;
function updateButton(){if(button)button.disabled=!account()?.user||!!account()?.error||recoveryPending||authorizing;}
function paint(){
 if(!siteName)return;
 const title=document.getElementById('account-page-title'),intro=document.getElementById('account-page-intro'),eyebrow=page.querySelector('.bpj-eyebrow');
 if(title)title.textContent=T('继续使用 ','Continue with ')+siteName;
 if(intro)intro.textContent=T('用免费账户登录 '+siteName+'。账户服务由 BPJ 提供，确认后返回原站继续。','Use a free account for '+siteName+'. BPJ provides the sign-in service; confirm below to return to your site.');
 if(eyebrow)eyebrow.textContent=T('共享免费账户','SHARED FREE ACCOUNT');
 if(providersReady)mailNote.textContent=mailAvailable?'':T('邮件验证与邮件找回暂不可用。邮箱仍可用于密码登录；新账户请保存恢复码。','Email verification and email recovery are unavailable right now. You can still use email and password to sign in; save the recovery code when creating an account.');
 updateButton();
}
function continueToConsent(){
 if(!siteName||!account()?.user||account()?.error||recoveryPending||authorizing)return false;
 paint();panel.scrollIntoView({block:'center'});button.focus();
 flowNote.textContent=T('账户已就绪。请确认后返回 '+siteName+'。','Your account is ready. Confirm to return to '+siteName+'.');
 return true;
}
document.addEventListener('bpj-account-flow',event=>{
 const detail=event.detail||{};
 if(typeof detail.recoveryPending==='boolean')recoveryPending=detail.recoveryPending;
 if(detail.stage==='providers_ready'){providersReady=true;mailAvailable=detail.mailAvailable===true;}
 if(['signed_in','recovery_confirmed'].includes(detail.stage)){
  pendingContinue=true;
  if(continueToConsent()){pendingContinue=false;event.preventDefault();}
 }
 paint();
});
document.addEventListener('bpj-account-state',()=>{updateButton();paint();});
document.addEventListener('bpj-account-identity',()=>{version++;authorizing=false;pendingContinue=false;if(flowNote)flowNote.textContent='';updateButton();});
while(!siteName){
 try{
  const response=await fetch('/api/account-fleet?host='+encodeURIComponent(host),{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error();
  const site=await response.json();if(typeof site?.site!=='string'||!site.site.trim())throw Error();
  siteName=site.site;
 }catch{
  const box=sourceError(true),retry=el('button',T('重新检查来源站点','Retry source-site check'));retry.id='account-fleet-retry';retry.type='button';box.append(retry);
  await new Promise(resolve=>{retry.onclick=()=>{retry.disabled=true;resolve();};});box.remove();
 }
}
panel=el('section');panel.id='account-fleet-intent';panel.className='account-panel';
const title=el('h2',T('返回 ','Return to ')+siteName);
note=el('p',T('登录后，请确认将账户编号、显示名和邮箱用于 '+siteName+' 登录。不会订阅邮件或购买服务。','After signing in, confirm sharing your account ID, display name and email with '+siteName+'. No email subscription or purchase is created.'));
button=el('button',T('确认并返回 ','Confirm and return to ')+siteName);button.id='account-fleet-confirm';button.type='button';button.disabled=true;
mailNote=el('p');mailNote.id='account-fleet-mail-note';
flowNote=el('p');flowNote.id='account-fleet-status';flowNote.setAttribute('role','status');
panel.append(title,note,button,mailNote,flowNote);page.prepend(panel);
const language=q.get('lang');
if(['de','fr','it','es','nl'].includes(language)){
 const names={de:'German',fr:'French',it:'Italian',es:'Spanish',nl:'Dutch'};
 panel.append(el('p','The sign-up form is in English. You will return to your '+names[language]+' site page after confirmation.'));
}
const benefits=page.querySelector('.account-grid > aside');
if(benefits){
 const heading=el('h2',T('这个免费账户的用途','What this free account does'));
 const purpose=el('p',host==='agiscorecard.com'?T('登录 AGI Scorecard，可继续使用贾维斯和讨论账户。已有付费工作区仍使用原访问方式。','Sign in to AGI Scorecard to use Jarvis and a discussion account. Existing paid workspaces retain their original access method.'):T('用于 '+siteName+' 的账户登录。原站公开工具仍可免注册使用；注册不会自动保存工具输入、同步项目或解锁付费功能。','Use it to sign in to '+siteName+'. Public tools remain available without an account. Registration does not automatically save tool inputs, sync projects or unlock paid features.'));
 benefits.replaceChildren(heading,purpose,el('p',T('已有 BPJ 账户可以直接登录，无需重复注册。','Already have a BPJ account? Sign in with it; no new account is needed.')));
}
button.onclick=async()=>{
 const owner=account()?.user?.id;if(!owner||account()?.error||recoveryPending||authorizing)return;
 const ticket=++version;authorizing=true;updateButton();flowNote.textContent='';
 try{
  const r=await fetch('/api/account-fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'authorize',host,state,challenge,confirmed:true,account_id:owner})});
  const result=await r.json();if(ticket!==version||account()?.user?.id!==owner)return;
  if(!r.ok)throw Error();
  const target=new URL(result.redirect);if(target.origin!=='https://'+host||target.username||target.password||target.pathname!=='/auth/callback')throw Error();location.replace(target.href);
 }catch{if(ticket===version)flowNote.textContent=T('暂时无法返回，请重试；若登录链接已过期，请从原站重新开始。','Could not return yet. Retry, or restart sign-in from the original site if the link has expired.');}
 finally{if(ticket===version){authorizing=false;updateButton();}}
};
paint();if(pendingContinue){pendingContinue=false;continueToConsent();}
})();
