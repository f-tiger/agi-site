// Mounted only inside BPJ's analytics-excluded membership portal. No persistence.
export function mountStartupMcp({api,lang,root}){
 const zh=lang==='zh',t=(a,b)=>zh?a:b,$=s=>root.querySelector(s);let secret='',epoch=0,busy=false;
 const clear=()=>{epoch++;secret='';$('#startup-key').value='';$('#startup-download').disabled=true;$('#startup-key-list').replaceChildren();$('#startup-status').textContent=t('登录会员后查看密钥和额度。','Sign in to inspect keys and quota.');};
 const status=(message)=>{$('#startup-status').textContent=message;};
 async function load(){const n=epoch,j=await api('startup_mcp_status');if(n!==epoch)return;
  status(t((j.active?'会员有效':'会员未生效或已到期')+' · 今日剩余 '+j.usage.remaining+' / '+j.limits.daily+' 次，UTC 零点重置。',(j.active?'Membership active':'Membership inactive or expired')+' · '+j.usage.remaining+' / '+j.limits.daily+' calls left today; resets at UTC midnight.'));
  const list=$('#startup-key-list');list.replaceChildren();
  for(const key of j.keys){const row=document.createElement('p'),label=document.createElement('span'),button=document.createElement('button');label.textContent=key.label+' · '+new Date(key.created*1000).toISOString().slice(0,10)+' ';button.type='button';button.textContent=t('撤销此密钥','Revoke this key');button.onclick=()=>perform(async()=>{await api('startup_mcp_revoke',{id:key.id});secret='';$('#startup-key').value='';$('#startup-download').disabled=true;await load();});row.append(label,button);list.append(row);}
 }
 async function perform(fn){if(busy)return;busy=true;const n=epoch;try{await fn();}catch(e){if(n===epoch)status(e.message);}finally{busy=false;}}
 $('#startup-refresh').onclick=()=>perform(load);
 $('#startup-create').onclick=()=>perform(async()=>{const n=epoch,j=await api('startup_mcp_create',{label:$('#startup-label').value});if(n!==epoch)return;secret=j.key;$('#startup-key').value=secret;$('#startup-download').disabled=false;await load();});
 $('#startup-download').onclick=()=>{if(!secret)return;const config={mcpServers:{'bpj-startup':{url:'https://baipiaoji.com/api/startup-mcp',headers:{Authorization:'Bearer '+secret}}}},url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='bpj-startup-mcp.private.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('#startup-clear').onclick=clear;addEventListener('pagehide',clear);clear();return clear;
}
