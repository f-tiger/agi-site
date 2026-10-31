import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const live=process.argv.includes('--live'),root=fileURLToPath(new URL('../dist/',import.meta.url));
async function read(path){
  if(!live)return fs.readFile(root+path,'utf8');
  const url=new URL(path.replace(/index\.html$/,'').replace(/\.html$/,''),'https://baipiaoji.com');url.searchParams.set('__probe','1');
  const r=await fetch(url,{headers:{'user-agent':'bpj-ci-listing-readonly/1.0','x-probe':'1'},redirect:'manual',signal:AbortSignal.timeout(25000)});
  assert.equal(r.status,200,url.pathname);return r.text();
}
for(const prefix of ['','en/']){
  const route='/'+prefix+'studio/listing-pack',html=await read(prefix+'studio/listing-pack.html');
  assert(html.includes('https://baipiaoji.com'+route),route+' canonical');
  assert.match(html,/<link[^>]+rel="canonical"[^>]+listing-pack/);
  assert.match(html,/hreflang="(?:zh|zh-CN|zh-Hans)"/);assert.match(html,/hreflang="en"/);
  assert(html.includes('listing-app.mjs'));assert(html.includes('listing.css'));assert(!/name="robots" content="noindex/.test(html));
  assert.match(html,/application\/ld\+json/);assert.match(html,/<h1\b/);
  if(live){assert.match(html,/data-ga4-id="G-H79D948F4Z"/);assert.equal((html.match(/src="\/analytics-assets\/consent\.mjs\?v=/g)||[]).length,1);}
  for(const path of [prefix+'studio/index.html',prefix+'studio/toolkit.html'])assert((await read(path)).includes(route));
}
for(const name of ['listing-core.mjs','listing-app.mjs','listing.css']){
  const actual=await read('studio-assets/'+name);
  assert(actual===await fs.readFile(new URL('../assets/studio/'+name,import.meta.url),'utf8'),'Deployed asset mismatch: '+name);
}
assert((await read('sitemap.xml')).includes('https://baipiaoji.com/studio/listing-pack'));
assert((await read('llms.txt')).includes('https://baipiaoji.com/en/studio/listing-pack'));
if(live){const r=await fetch('https://baipiaoji.com/api/listing-inquiry?__probe=1',{headers:{'user-agent':'bpj-ci-listing-readonly/1.0','x-probe':'1'},signal:AbortSignal.timeout(25000)});assert.equal(r.status,200);const data=await r.json();assert.equal(data.ok,true);assert.equal(data.accepting,true);assert.equal(data.paymentEnabled,false);assert.match(r.headers.get('cache-control')||'',/no-store/);}
console.log('PASS listing pack '+(live?'live exact assets, bilingual routes, GA4 and read-only inquiry readiness':'build discovery, bilingual metadata and assets')+'. No production catalog, inquiry or payment created.');
