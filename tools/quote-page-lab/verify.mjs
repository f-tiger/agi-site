import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EDITION,ROUTE} from './render.mjs';
import {EVENTS,onRequestPost} from '../../sites/baipiaoji/functions/api/hit.js';

const live=process.argv.includes('--live'),base='https://baipiaoji.com';
const dist=new URL('../../sites/baipiaoji/dist/',import.meta.url);
async function read(path){
  if(!live)return readFileSync(new URL(path,dist),'utf8');
  const res=await fetch(base+'/'+path.replace(/index\.html$/,'').replace(/\.html$/,''),{headers:{'User-Agent':'bpj-ci-selfcheck'},signal:AbortSignal.timeout(20000)});
  assert.equal(res.status,200,path);return res.text();
}
assert(EVENTS.has('quote'));
let saved=[];
const env={HITS:{prepare:()=>({bind:(...values)=>({run:async()=>saved.push(values)})})}};
for(const p of ['/quote-builder/link_copied','/quote-builder/client-name','/quote-builder/link_copied?secret=1']){
  await onRequestPost({env,request:new Request(base+'/api/hit',{method:'POST',body:JSON.stringify({p,l:'en',e:'quote'})})});
}
assert.equal(saved.length,1,'only fixed quote event paths accepted');
for(const prefix of ['','en/']){
  const path=prefix+ROUTE.slice(1),url=base+'/'+path;
  let html=await read(path+'.html');
  // Allow the just-published Pages build a brief propagation window.
  for(let i=0;live&&!html.includes(`name="quote-studio-release" content="${EDITION}"`)&&i<4;i++){
    await new Promise(r=>setTimeout(r,5000));html=await read(path+'.html');
  }
  assert(html.includes(`name="quote-studio-release" content="${EDITION}"`),'published edition');
  assert(html.includes(`rel="canonical" href="${url}"`),'canonical');
  assert(html.includes('name="robots" content="index,follow"'),'indexable builder');
  assert.equal([...html.matchAll(/hreflang="/g)].length,3,'language alternates');
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.url,url);assert.equal(schema['@type'],'WebApplication');
  assert(!/<script[^>]+src=/.test(html),'no external runtime scripts');
  const content=html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'');
  assert(content.includes('<h1>')&&content.includes('<noscript>'),'readable without JS');
  if(prefix)assert(!/[一-鿿]{2,}/.test(content),'English static copy');
  const state=JSON.parse(html.match(/id="initial-state">(.*?)<\/script>/s)[1]);
  assert.equal(state.measure,true);assert.equal(state.config.lang,prefix?'en':'zh');
  const [home,hub,search]=await Promise.all([read(prefix+'index.html'),read(prefix+'studio/index.html'),read(prefix+'search-index.json')]);
  assert(home.includes(url)&&hub.includes(url),'homepage and studio discovery');
  assert(JSON.parse(search).some(x=>x.u===url),'search entry');
}
const [sitemap,llms]=await Promise.all([read('sitemap.xml'),read('llms.txt')]);
for(const prefix of ['','/en'])assert(sitemap.includes(`<loc>${base+prefix+ROUTE}</loc>`));
assert(llms.includes(base+ROUTE));
console.log(`Quote builder ${live?'live':'dist'}: bilingual routes, edition, SEO, readable content, privacy, home/studio/search/sitemap/llms discovery passed.`);
