import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const data=JSON.parse(await readFile(new URL('./content.json',import.meta.url),'utf8'));
const only=process.argv[2]||'venture',submit=process.argv.includes('--submit');
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'agi-site-ci-discovery/1.0'}});assert.equal(r.status,200,url);assert.equal(r.url,url,url+' redirected');return r;}
for(const [id,s] of Object.entries(data.sites)){
 if(only==='venture'&&id==='localebatch'||only==='localebatch'&&id!=='localebatch')continue;
 const origin='https://'+s.host,rows=data.pages.filter(p=>p.site===id),xml=await(await get(origin+'/sitemap.xml')).text();
 for(const p of rows){const url=origin+'/'+p.slug,r=await get(url),html=await r.text();assert.ok(html.includes('rel="canonical" href="'+url+'"'));assert.ok(html.includes('application/ld+json'));assert.ok(xml.includes(url));assert.ok(!r.headers.get('x-robots-tag')?.includes('noindex'));await get(origin+'/examples/'+p.download);
 const alias=await fetch(url+'.html',{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.ok([301,308].includes(alias.status));assert.equal(new URL(alias.headers.get('location'),origin).href,url);
 }
 for(const path of ['/llms.txt','/feed.xml','/social.png'])await get(origin+path);
 // Probe only a UA string, not a real vendor IP: do not claim proof of actual bot admission.
 const bot=await fetch(origin+'/'+rows[0].slug+'?__probe=1',{headers:{'User-Agent':'OAI-SearchBot/1.4 agi-site-ci-discovery'},signal:AbortSignal.timeout(15000)});assert.equal(bot.status,200);console.log('PASS discovery '+id+': '+rows.length+' task pages, downloads, aliases, feed, social card, search-UA response');
 if(submit){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('agi-site-indexnow-'+s.host));const key=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('').slice(0,32),keyLocation=origin+'/'+key+'.txt';assert.equal((await(await get(keyLocation)).text()).trim(),key);
  // Only this release's changed content URLs, at most four per host. Never the entire fleet.
  const urlList=[origin+'/',origin+'/guide',...rows.map(p=>origin+'/'+p.slug)];
  const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:s.host,key,keyLocation,urlList}),signal:AbortSignal.timeout(20000)});
  console.log('IndexNow '+id+': HTTP '+r.status+', '+urlList.length+' changed URLs; submission is not indexing.');
  if(![200,202].includes(r.status))throw Error('IndexNow submission failed '+id+': '+r.status);
 }
}
