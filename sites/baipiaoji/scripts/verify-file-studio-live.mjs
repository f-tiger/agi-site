// Independent free-file-tool health check. Paid-service gates remain strict elsewhere.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {FILE_EDITION} from '../assets/studio/file-core.mjs';
const origin='https://baipiaoji.com';
const get=async path=>{const url=new URL(path,origin);url.searchParams.set('__probe','1');url.searchParams.set('edition',FILE_EDITION);const r=await fetch(url,{headers:{'user-agent':'bpj-file-studio-selfcheck-bot (+ci)'},redirect:'error',signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,path);return r.text();};
async function verify(){
for(const prefix of ['','/en']){
  const hub=await get(prefix+'/studio/'),home=await get(prefix+'/'),search=JSON.parse(await get(prefix+'/search-index.json'));
  for(const slug of ['pdf-tools','product-images']){
    const url=origin+prefix+'/studio/'+slug,html=await get(prefix+'/studio/'+slug);
    assert.ok(html.includes(`data-edition="${FILE_EDITION}"`),url+' edition');
    assert.ok(html.includes(`rel="canonical" href="${url}"`),url+' canonical');
    for(const id of ['ft-run','ft-share','ft-input','ft-output','ft-cancel'])assert.ok(html.includes(`id="${id}"`),url+' '+id);
    assert.ok(hub.includes(`href="${url}"`)&&home.includes(`href="${url}"`),url+' entries');
    assert.ok(search.some(entry=>entry.u===url),url+' search');
  }
}
const hash=text=>createHash('sha256').update(text).digest('hex');
for(const file of ['file-app.mjs','file-core.mjs','file-copy.mjs','file-view.mjs','file-engine.mjs','file-tools.css','vendor/pdf-lib-1.17.1.mjs','vendor/fflate-0.8.2.mjs']){
  assert.equal(hash(await get('/studio-assets/'+file)),hash(readFileSync(new URL('../assets/studio/'+file,import.meta.url),'utf8')),file+' differs from source');
}
}
for(let attempt=0;attempt<5;attempt++){
  try{await verify();break;}catch(error){if(attempt===4)throw error;console.log('Free file tools not propagated yet: '+error.message);await pause(3000*2**attempt);}
}
console.log('Free PDF and image tools: both languages, discovery, canonical URLs and exact assets verified live. '+FILE_EDITION);
