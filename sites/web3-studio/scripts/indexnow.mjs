import {newPaths} from './market-pages.mjs';
import {sites,hubHost} from '../public/catalog.mjs';
import {indexKey} from './manifest.mjs';
const checkOnly=process.argv.includes('--check');
let failed=0;
for(const host of [hubHost,...sites.map(s=>s.host)]){
 try{
  const get=path=>fetch('https://'+host+path,{redirect:'error',signal:AbortSignal.timeout(20000)});
  const keyLocation='https://'+host+'/'+indexKey+'.txt';
  const key=await get('/'+indexKey+'.txt');if(!key.ok||(await key.text()).trim()!==indexKey)throw Error('Host verification key mismatch');
  const response=await get('/sitemap.xml');if(!response.ok)throw Error('Sitemap HTTP '+response.status);
  const xml=await response.text(),urlList=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  // The hub also publishes /zh/sitemap.xml (2026-09-20 locale); submit those URLs in the same call.
  const zh=host===hubHost?await get('/zh/sitemap.xml'):null;const zhList=zh&&zh.ok?[...(await zh.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]):[];
  const expectedPaths=new Set(['/','/guide.html','/privacy.html','/for-agents.html',host===hubHost?'/publish.html':'/examples.html',...(host===hubHost?newPaths.map(p=>'/'+p):[])]);
  if(urlList.length!==expectedPaths.size||new Set(urlList).size!==expectedPaths.size||urlList.some(u=>{const x=new URL(u);return !expectedPaths.has(x.pathname)||x.protocol!=='https:'||x.host!==host||x.username||x.password||x.search||x.hash;}))throw Error('Expected the canonical page set on the verified host');
  if(checkOnly){console.log(host+': key and canonical URLs verified');continue;}
  const sent=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host,key:indexKey,keyLocation,urlList:[...urlList,...zhList]}),signal:AbortSignal.timeout(20000)});
  if(![200,202].includes(sent.status))throw Error('IndexNow HTTP '+sent.status+' '+(await sent.text()).slice(0,200));
  console.log(JSON.stringify({host,urls:urlList.length+zhList.length,status:sent.status,state:sent.status===200?'submission accepted':'submission pending key validation',indexed:'not established by submission'}));
 }catch(error){failed++;console.error(host+': '+error.message);}
}
if(failed)process.exitCode=1;
