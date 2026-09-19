import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {sites,hubHost} from '../public/catalog.mjs';
import {profiles} from '../public/profiles.mjs';
import {release} from '../release.generated.mjs';

const hosts=[{id:'hub',host:hubHost},...sites];
const hash=b=>createHash('sha256').update(b).digest('hex');
let requests=0;
async function request(host,path,init={}){
 requests++;
 return fetch('https://'+host+path,{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});
}
async function ready(s){
 let last='';
 for(let attempt=0;attempt<36;attempt++){
  try{const r=await request(s.host,'/api/health');assert.equal(r.status,200);const v=await r.json();assert.equal(v.revision,release.revision);assert.equal(v.site,s.id);assert.equal(v.host,s.host);return;}catch(e){last=e.message;}
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw Error(s.host+' did not serve this release: '+last);
}
await Promise.all(hosts.map(ready));
const manifest=JSON.parse(await readFile('asset-manifest.generated.json','utf8'));
await Promise.all(hosts.map(async s=>{
 const files=manifest[s.host];
 for(const [path,file] of Object.entries(files)){
  const r=await request(s.host,path);assert.equal(r.status,200,s.host+path);
  assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
  const bytes=Buffer.from(await r.arrayBuffer());const local=await readFile('dist/'+file);
  assert.equal(hash(bytes),hash(local),'Deployed content differs: '+s.host+path);
  if(file.endsWith('.mjs'))assert.match(r.headers.get('content-type')||'',/(?:java|ecma)script/i,'Module MIME: '+file);
 }
 const redirect=await request(s.host,'/index.html');assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://'+s.host+'/');
 for(const path of ['/not-a-page','/reconcile/index.html','/../__private__'])assert.equal((await request(s.host,path)).status,404,s.host+path);
 const h=await request(s.host,'/',{method:'HEAD'});assert.equal(h.status,200);assert.equal((await h.arrayBuffer()).byteLength,0);
 if(s.id!=='protocol')assert.equal((await request(s.host,'/api/v1/profiles')).status,404);
 if(s.id!=='hub'){
  const payload={id:randomUUID(),frequency:'zero',usefulness:'sample',interest:'no',ownCompleted:false,qa:true};
  const init={method:'POST',headers:{Origin:'https://'+s.host,'Content-Type':'application/json'},body:JSON.stringify(payload)};
  for(let i=0;i<2;i++){const f=await request(s.host,'/api/feedback',init);assert.equal(f.status,200,'QA feedback '+s.host);assert.equal((await f.json()).saved,true);}
  const stats=await request(s.host,'/api/stats');assert.equal(stats.status,200);const v=await stats.json();assert.ok(v.groups.some(g=>g.site===s.id&&g.qa===1&&g.submissions>=1));assert.ok(v.groups.every(g=>g.site===s.id));
 }
 console.log('Verified '+s.host+': revision, '+Object.keys(files).length+' files, routing, headers'+(s.id==='hub'?'':', isolated QA feedback'));
}));
const apiHost=sites.find(s=>s.id==='protocol').host;
let r=await request(apiHost,'/api/v1/profiles');assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'*');let v=await r.json();assert.equal(v.revision,release.revision);assert.deepEqual(v.profiles,profiles);
r=await request(apiHost,'/api/v1/profiles?purpose=payment&status=specification');v=await r.json();assert.equal(v.profiles.length,1);assert.equal(v.profiles[0].id,'x402-v2-exact-evm');
for(const path of ['/api/v1/profiles?status=nope','/api/v1/profiles?purpose=all&purpose=payment','/api/v1/profiles?unexpected=true'])assert.equal((await request(apiHost,path)).status,400);
assert.equal((await request(apiHost,'/api/v1/profiles/unknown')).status,404);
r=await request(apiHost,'/openapi.json');v=await r.json();assert.equal(v.openapi,'3.1.0');assert.ok(v.components.schemas.ProfileResponse);
r=await request(apiHost,'/api/v1/profiles',{method:'OPTIONS'});assert.equal(r.status,204);
console.log(JSON.stringify({verifiedHosts:hosts.length,revision:release.revision,requests,qaExcludedFromDemand:true}));
