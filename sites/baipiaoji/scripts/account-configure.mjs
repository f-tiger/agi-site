// Optional provider setup. Never overwrite a configured provider with empty input.
export async function configure(env,request=fetch){
 const updates={};
 const client=(env.GOOGLE_CLIENT_ID||'').trim(),key=(env.RESEND_API_KEY||'').trim(),from=(env.ACCOUNT_MAIL_FROM||'').trim();
 if(client){if(!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Invalid Google client ID');updates.GOOGLE_CLIENT_ID={type:'plain_text',value:client};}
 if(key&&from){if(!/^re_[A-Za-z0-9_-]+$/.test(key)||/[\r\n]/.test(from)||!from.includes('@'))throw Error('Invalid mail configuration');updates.RESEND_API_KEY={type:'secret_text',value:key};updates.ACCOUNT_MAIL_FROM={type:'plain_text',value:from};}
 if(!Object.keys(updates).length)return {updated:false,google_input:!!client,mail_input:!!(key&&from),mail_incomplete:!!key!==!!from};
 if(!env.CLOUDFLARE_API_TOKEN)throw Error('Missing Cloudflare credential');
 async function api(path,method='GET',body){const r=await request('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});const j=await r.json();if(!r.ok||!j.success)throw Error('Provider configuration request failed');return j.result;}
 let account=env.CLOUDFLARE_ACCOUNT_ID;if(!account){const accounts=await api('/accounts');if(accounts.length!==1)throw Error('Set account ID');account=accounts[0].id;}
 const path='/accounts/'+encodeURIComponent(account)+'/pages/projects/aiyangmao';const before=await api(path);if(!before.deployment_configs?.production?.d1_databases?.HITS)throw Error('Missing HITS binding');
 await api(path,'PATCH',{deployment_configs:{production:{env_vars:updates}}});
 const after=await api(path),vars=after.deployment_configs?.production?.env_vars||{};
 for(const name of [...Object.keys(before.deployment_configs.production.env_vars||{}),...Object.keys(updates)])if(!(name in vars))throw Error('Configuration key was not preserved');
 if(JSON.stringify(before.deployment_configs.production.d1_databases)!==JSON.stringify(after.deployment_configs.production.d1_databases))throw Error('Database bindings changed');
 return {updated:true,google_input:!!client,mail_input:!!(key&&from),mail_incomplete:!!key!==!!from};
}
if(import.meta.url===new URL(process.argv[1],'file:').href){try{console.log(JSON.stringify(await configure(process.env)));}catch{console.error('Account provider setup failed. Verify optional Google/mail settings and Cloudflare Pages permissions. No values were logged.');process.exitCode=1;}}
