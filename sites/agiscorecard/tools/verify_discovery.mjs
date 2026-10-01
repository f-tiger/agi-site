import fs from 'node:fs';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),origin='https://agiscorecard.com';
async function get(path){const r=await fetch(origin+path+'?ci=1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);return r;}
for(let attempt=1;attempt<=4;attempt++){
 try{
  for(const route of ['/','/cn']){
   const html=await (await get(route)).text();assert.ok(html.includes('agi-discovery-20261001'),route);
   const source=fs.readFileSync(new URL(route==='/'?'index.html':'cn.html',root),'utf8');
   for(const key of ['discovery-schema','discovery-citation','discovery-faq']){
    const pattern=new RegExp('<!-- '+key+':start -->([\\s\\S]*?)<!-- '+key+':end -->');
    assert.equal(html.match(pattern)?.[1],source.match(pattern)?.[1],route+' '+key);
   }
  }
  for(const path of ['/index.md','/cn.md','/zh/progress-index.md','/zh/ai-and-your-job.md']){
   const r=await get(path);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);
   const canonical=path==='/index.md'?'/':path.slice(0,-3);assert.equal(r.headers.get('link'),'<'+origin+canonical+'>; rel="canonical"');
   assert.equal(await r.text(),fs.readFileSync(new URL(path.slice(1),root),'utf8'),path+' mirror');
  }
  assert.equal(await (await get('/robots.txt')).text(),fs.readFileSync(new URL('robots.txt',root),'utf8'));
  const key='16507d8e1997c4be371f5fbaf7ac1985';assert.equal((await (await get('/'+key+'.txt')).text()).trim(),key);
  console.log('Live discovery: matching bilingual answers/schema, canonical noindex mirrors, crawler rules and public IndexNow key verified. No indexing or citation claim.');break;
 }catch(e){if(attempt===4)throw e;console.log('Waiting for discovery release propagation: '+e.message);await new Promise(r=>setTimeout(r,8000));}
}
