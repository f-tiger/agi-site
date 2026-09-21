#!/usr/bin/env node
// Submit actual canonical changes. HTTP acceptance does not prove indexing.
import {readFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {selectUrls} from './indexnow-plan.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const key=readFileSync(join(root,'data/indexnow-key.txt'),'utf8').trim();
if(!/^[a-zA-Z0-9-]{8,128}$/.test(key))throw Error('Invalid IndexNow verification key');
const urls=[...readFileSync(join(root,'dist/sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(!urls.length)throw Error('Empty sitemap');
const manifest=JSON.parse(readFileSync(join(root,'data/page-lastmod.json'),'utf8'));
const recent=[Date.now(),Date.now()-86400000].map(t=>new Date(t).toISOString().slice(0,10));
const selected=selectUrls(urls,manifest,{recent,all:process.argv.includes('--all'),repair:process.argv.includes('--repair-bing-20260919')});
if(!selected.length){console.log('IndexNow: no recent substantive changes; nothing submitted.');process.exit(0);}
const host='baipiaoji.com',keyLocation=`https://${host}/${key}.txt`;
const response=await fetch(keyLocation,{signal:AbortSignal.timeout(15000)});
if(response.status!==200||(await response.text()).trim()!==key)throw Error('IndexNow public verification file unavailable or mismatched');
if(process.argv.includes('--repair-bing-20260919'))for(const url of selected){
 const r=await fetch(url,{signal:AbortSignal.timeout(15000)}),html=await r.text();
 if(r.status!==200||r.url!==url||!html.includes(`rel="canonical" href="${url}"`))throw Error('Repair URL is not live with matching canonical: '+url);
}
for(let i=0;i<selected.length;i+=100){
 const batch=selected.slice(i,i+100);
 const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host,key,keyLocation,urlList:batch}),signal:AbortSignal.timeout(20000)});
 console.log(`IndexNow: HTTP ${r.status}; ${batch.length} canonical URLs; received is not indexed.`);
 if(![200,202].includes(r.status))throw Error('IndexNow rejected submission: HTTP '+r.status);
 if(i+100<selected.length)await new Promise(resolve=>setTimeout(resolve,1000));
}
console.log('IndexNow: submitted '+selected.length+' URLs successfully.');
