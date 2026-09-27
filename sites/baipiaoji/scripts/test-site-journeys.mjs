// Zero-network contract checks; --dist must run AFTER BPJ + workbench + member builds.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SITE_JOURNEYS,localizedJourneys} from '../lib/site-journeys.mjs';
import {onRequestPost} from '../functions/api/mcp.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=join(root,'dist');
const read=p=>readFileSync(join(dist,p),'utf8');
const json=p=>JSON.parse(read(p));
const ids=new Set(SITE_JOURNEYS.map(x=>x.id));
assert.equal(ids.size,SITE_JOURNEYS.length,'Feature IDs must be unique');
for(const required of ['video','pdf','images','quote','creatorops','quotawatch','launchdesk','watch','design-quotas','search-quotas','writing-quotas','office-quotas'])assert(ids.has(required),`Missing key task entry: ${required}`);
const gatedBlock=readFileSync(join(root,'scripts/build.mjs'),'utf8').match(/const GATED_TOOLS = new Set\(\[([\s\S]*?)\]\)/);
assert(gatedBlock,'Cannot locate actual registration policy');
const gated=[...gatedBlock[1].matchAll(/'([^']+)'/g)].map(x=>x[1].replace(/\.html$/,''));
assert.deepEqual(SITE_JOURNEYS.filter(x=>x.requiresRegistration).map(x=>x.path).sort(),gated.sort(),'Discovery must disclose every interactive registration gate, without adding false gates');
for(const item of SITE_JOURNEYS){
 assert(item.next.length>0,`${item.id}: missing next step`);
 for(const next of item.next){assert(ids.has(next),`${item.id}: dead next-step reference ${next}`);assert.notEqual(next,item.id,`${item.id}: next step loops to itself`);}
 assert(/^\/(?!\/)/.test(item.path)&&!item.path.includes('.html'),`${item.id}: expected local canonical path`);
}
const english=localizedJourneys('en','https://baipiaoji.com/en');
assert(!/[\u3400-\u9fff]/u.test(JSON.stringify(english)),'Chinese leaked into the English feature map');
const canonical=u=>{const x=new URL(u,'https://baipiaoji.com');return x.origin+x.pathname.replace(/\.html$/,'')+x.hash;};
async function rpc(method,params={},assets){
 const env=assets?{ASSETS:{fetch:assets}}:{};
 const request=new Request('https://baipiaoji.com/api/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:7,method,params})});
 const response=await onRequestPost({request,env,waitUntil:()=>{}});
 assert.equal(response.status,200,`${method}: HTTP status`);
 return response.json();
}
const listing=await rpc('resources/list');
assert(!listing.error,'resources/list failed');
const resources=listing.result.resources;
assert.equal(new Set(resources.map(x=>x.uri)).size,resources.length,'Duplicate MCP resource URIs');
const featureResource=resources.find(x=>x.uri==='baipiaoji://site-journeys');
assert(featureResource,'Feature map missing from actual MCP handler');
assert.equal(featureResource.mimeType,'application/json');
const tools=(await rpc('tools/list')).result.tools;
assert(!tools.some(x=>/site.journeys/.test(x.name)),'Static map must not be advertised as an executable tool');
if(process.argv.includes('--dist')){
 assert(existsSync(join(dist,'members.html'))&&existsSync(join(dist,'workbench.html')),'Run the member and workbench builders before --dist');
 const metadata=json('.well-known/mcp.json');
 assert.deepEqual([...metadata.resources].sort(),resources.map(x=>x.uri).sort(),'Published MCP metadata differs from actual resources/list');
 const assetRequests=[];
 const fetchAsset=async input=>{
  const url=new URL(input);assetRequests.push(url.pathname);
  const file=resolve(dist,'.'+url.pathname);
  assert(file.startsWith(dist+'/'),'MCP requested an asset outside dist');
  return existsSync(file)&&statSync(file).isFile()?new Response(readFileSync(file),{status:200}):new Response('Not found',{status:404});
 };
 for(const lang of ['zh','en']){
  const prefix=lang==='en'?'en/':'';
  const map=json(prefix+'site-journeys.json');
  assert.equal(map.language,lang);
  assert.deepEqual(map.items.map(x=>x.id).sort(),[...ids].sort(),'Published map is stale or incomplete');
  const page=read(prefix+'discover/index.html');
  const markdown=read(prefix+'site-journeys.md');
  const search=json(prefix+'search-index.json');
  const searchURLs=new Set(search.map(x=>canonical(x.u)));
  const publicIDs=new Set(map.items.map(x=>x.id));
  for(const item of map.items){
   const url=new URL(item.url);
   assert.equal(url.origin,map.site,`${item.id}: wrong host`);
   assert.equal(url.pathname.startsWith('/en/'),lang==='en',`${item.id}: wrong-language link`);
   const relative=url.pathname.slice(1);
   const candidates=url.pathname.endsWith('/')?[join(dist,relative,'index.html')]:[join(dist,relative+'.html'),join(dist,relative,'index.html')];
   const target=candidates.find(p=>existsSync(p)&&statSync(p).isFile());
   assert(target,`${lang}/${item.id}: target is missing from final dist (${item.url})`);
   if(url.hash)assert(new RegExp(`\\bid=["']${url.hash.slice(1)}["']`).test(readFileSync(target,'utf8')),`${item.id}: missing destination anchor`);
   assert(page.includes(`data-journey="${item.id}"`),`${item.id}: missing visible discovery card`);
   assert(markdown.includes(item.url),`${item.id}: missing Markdown discovery link`);
   assert(searchURLs.has(canonical(item.url)),`${item.id}: missing site search entry`);
   for(const next of item.next)assert(publicIDs.has(next),`${item.id}: broken published next step`);
   if(item.requiresRegistration){assert(item.registrationNote,`${item.id}: no registration disclosure`);assert(page.includes(item.registrationNote),`${item.id}: registration disclosure is invisible`);}
  }
  if(lang==='en')assert(!/[\u3400-\u9fff]/u.test(read(prefix+'site-journeys.json')+markdown),'Chinese leaked into English machine assets');
  const result=await rpc('resources/read',{uri:featureResource.uri,arguments:{lang}},fetchAsset);
  assert(!result.error,`${lang}: MCP read failed`);
  assert.equal(result.result.contents[0].mimeType,'application/json');
  assert.deepEqual(JSON.parse(result.result.contents[0].text),map,`${lang}: MCP read differs from published map`);
 }
 assert.deepEqual(assetRequests,['/site-journeys.json','/en/site-journeys.json'],'MCP should read only the requested static language asset');
 const missing=await rpc('resources/read',{uri:featureResource.uri},async()=>new Response('missing',{status:404}));
 assert.equal(missing.error?.code,-32603,'Missing static data must not be reported as a successful resource');
 console.log(`PASS site journeys: ${ids.size} bilingual entries, final routes/anchors, search, registration, next steps, machine files and actual MCP contracts.`);
}else console.log(`PASS site journeys: ${ids.size} registry entries, registration policy and MCP listing; use --dist after all builds for integration checks.`);
