// Only private, same-origin status JSON supplies a name. Never persist identity
// in storage or bake it into public/cached HTML or analytics events.
export const navScript=`(()=>{
const links=[...document.querySelectorAll('.fleet-account-entry a')];if(!links.length)return;
const zh=document.documentElement.lang.startsWith('zh');let pending=false,last=0;
function show(user,unknown=false){for(const a of links){a.textContent=user?'✓ '+user.username:unknown?(zh?'账户':'Account'):(zh?'注册 / 登录':'Join / Sign in');a.title=user?(zh?'已登录：':'Signed in: ')+user.username:'';a.setAttribute('aria-label',user?a.title+(zh?'，打开账户':', open account'):a.textContent);}}
async function refresh(force=false){if(pending||(!force&&Date.now()-last<15000))return;pending=true;last=Date.now();try{const r=await fetch('/auth/status',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error();const j=await r.json();if(!j.ok)throw Error();show(j.user);}catch{show(null,true);}finally{pending=false;}}
refresh(true);window.addEventListener('focus',()=>refresh());window.addEventListener('pageshow',e=>{if(e.persisted)refresh(true);});
})();`;
