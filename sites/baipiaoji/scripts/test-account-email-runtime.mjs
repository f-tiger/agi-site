import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';

// Real workerd Request parsing and D1; only synthetic account data and a local
// provider fixture. Never contact Resend or send a message to an external party.
const runtime=process.env.FREE_ACCOUNT_RUNTIME_MODULES;
const esbuild=await import(runtime?pathToFileURL(resolve(runtime,'esbuild/lib/main.js')).href:'esbuild');
const simulator=await import(runtime?pathToFileURL(resolve(runtime,'miniflare/dist/src/index.js')).href:'miniflare');
const source=fileURLToPath(new URL('../lib/account-email.js',import.meta.url));
const entry=`import {ensureAccountEmail,sendAccountEmail} from ${JSON.stringify(source)};
export default {async fetch(request,env){
 await ensureAccountEmail(env);
 const status=Number(new URL(request.url).searchParams.get('status'));
 const id='synthetic-mail-'+status, email=id+'@example.test';
 await env.HITS.prepare('INSERT INTO free_accounts(id,username,password_hash,recovery_hash,created,updated) VALUES(?,?,?,?,?,?)').bind(id,id,'not-a-login','not-a-recovery',1,1).run();
 await env.HITS.prepare('INSERT INTO free_account_identities(account_id,email,display_name,display_key,email_verified) VALUES(?,?,?,?,0)').bind(id,email,id,id).run();
 let requests=0,redirect=null;const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  requests++;const native=new Request(url,options);redirect=native.redirect;
  if(native.url!=='https://api.resend.com/emails'||native.method!=='POST')throw Error('Unexpected provider request');
  if(status===200)return Response.json({id:'synthetic-provider-id'});
  return new Response(null,{status,headers:{Location:'https://other.example/never-follow'}});
 };
 let sent;
 try{sent=await sendAccountEmail(env,{id,email,session_version:1},'verify','en');}
 finally{globalThis.fetch=original;}
 const token=await env.HITS.prepare('SELECT state FROM free_account_email_tokens WHERE account_id=?').bind(id).first();
 return Response.json({sent,requests,redirect,token_state:token?.state||null});
}};`;
const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:dirname(source)},bundle:true,write:false,format:'esm',platform:'neutral',external:['node:*']});
const options={name:'account-email-runtime',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-09-01',compatibilityFlags:['nodejs_compat'],d1Databases:['HITS'],bindings:{RESEND_API_KEY:'re_fixture_never_send',ACCOUNT_MAIL_FROM:'BPJ <accounts@example.test>'},outboundService:()=>{throw Error('External network forbidden in email fixture');}};
const mf=new simulator.Miniflare(simulator.convertV4MiniflareOptions?simulator.convertV4MiniflareOptions(options):options);
try{
 for(const status of [200,301,302,303,307,308,500]){
  const response=await mf.dispatchFetch('https://baipiaoji.com/__fixture?status='+status);
  assert.equal(response.status,200,await response.clone().text());
  const result=await response.json();
  assert.deepEqual(result,{sent:status===200,requests:1,redirect:'manual',token_state:status===200?'ready':null},'Provider status '+status);
 }
 console.log('PASS actual workerd + D1 email transport: native Request accepted; acknowledged send activates token; redirects/errors never follow or activate. No real email sent.');
}finally{await mf.dispose();}
