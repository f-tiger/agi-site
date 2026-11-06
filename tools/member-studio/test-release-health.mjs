import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkPaymentHealth,paymentState} from './release-health.mjs';

const quiet={log(){},warn(){}};
const data={ok:true,site:'bpj',ready:false,auto_renew:false};
assert.equal(paymentState(200,data),'not_ready');
assert.throws(()=>checkPaymentHealth(200,data,{logger:quiet,summaryPath:null}),/NOT READY/,'Default commerce checks stay strict');
const temp=mkdtempSync(join(tmpdir(),'member-release-health-'));
try{
  const messages=[],summaryPath=join(temp,'summary.md');
  assert.equal(checkPaymentHealth(200,data,{requireReady:false,logger:{log(){},warn(message){messages.push(message);}},summaryPath}),'not_ready');
  assert.match(messages.join('\n'),/::warning::.*checkout remains closed/);
  assert.match(readFileSync(summaryPath,'utf8'),/NOT READY/);
  for(const [status,body] of [[503,data],[200,null],[200,{...data,site:'tds'}],[200,{...data,ok:false}],[200,{...data,ready:'false'}],[200,{...data,auto_renew:true}],[200,{...data,auto_renew:undefined}]]){
    assert.throws(()=>checkPaymentHealth(status,body,{requireReady:false,logger:quiet,summaryPath:null}),/unavailable|invalid/,'Release mode cannot hide contract or transport failure');
  }
}finally{rmSync(temp,{recursive:true,force:true});}

// Exercise the actual live verifier with isolated HTTP fixtures. Closed sales
// can pass a release, but wrong pages, HTTP failures and unprotected APIs cannot.
const fixture=`
import {messages} from './tools/member-studio/messages.mjs';
import {sites,products,externalProducts} from './tools/revenue-studio/catalog.mjs';
import {siteLanguages} from './tools/revenue-studio/i18n.mjs';
import {memberURL} from './tools/revenue-studio/member-copy.mjs';
const site=process.env.FIXTURE_SITE,scenario=process.env.FIXTURE_SCENARIO;
process.argv=['node','verify.mjs','--live','--site',site,...(process.env.FIXTURE_RELEASE==='true'?['--release-health']:[])];
const locales=site==='bpj'?Object.keys(messages):siteLanguages[site];
globalThis.fetch=async(url,options={})=>{
 const path=new URL(url).pathname;
 if((options.method||'GET')==='POST'){
  if(!['/api/member','/api/member-admin','/api/member-watch'].includes(path))throw Error('Unexpected mutation');
  return new Response('',{status:scenario==='unprotected'?200:401});
 }
 if(path==='/api/member')return Response.json({ok:true,site,ready:scenario!=='closed',auto_renew:scenario==='renewal',plan:{price_units:9000000}},{status:scenario==='offline'?503:200});
 if(path==='/member-assets/products.json')return Response.json([...products,...externalProducts].filter(p=>p.site===site).map(p=>({id:p.id,urls:{en:sites[site].origin+'/workbench/'+p.id}})));
 if(path.startsWith('/member-assets/'))return new Response('x'.repeat(200));
 const locale=locales.find(l=>new URL(memberURL(l,site)).pathname===path);
 if(!locale)throw Error('Unexpected page '+path);
 const t=messages[locale],memberPage=memberURL(locale,site);
 return new Response(scenario==='wrong-page'?'wrong':t.title+' href="'+memberPage+'" data-member-site="'+site+'" '+t.independent+' '+['key','checkout','payload','save','support'].map(id=>'id="'+id+'"').join(' '));
};
await import('./tools/member-studio/verify.mjs');
`;
const root=new URL('../../',import.meta.url);
for(const site of ['bpj','tds'])for(const release of [false,true])for(const scenario of ['closed','ready','offline','renewal','unprotected','wrong-page']){
  const result=spawnSync(process.execPath,['--input-type=module'],{cwd:root,input:fixture,encoding:'utf8',env:{...process.env,GITHUB_STEP_SUMMARY:'',FIXTURE_SITE:site,FIXTURE_RELEASE:String(release),FIXTURE_SCENARIO:scenario}});
  assert.ifError(result.error);
  const pass=scenario==='ready'||(release&&scenario==='closed');
  assert.equal(result.status===0,pass,`${site} release=${release} ${scenario}: ${result.stderr}`);
  if(release&&scenario==='closed')assert.match(result.stderr,/::warning::.*checkout remains closed/);
}
console.log('PASS release payment health: closed checkout is visible; API/page/protection regressions fail; default commerce verification remains strict.');
