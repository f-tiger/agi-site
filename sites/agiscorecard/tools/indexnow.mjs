#!/usr/bin/env node
// Scheduled/manual only. Source diff + sitemap additions; never deployment churn.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),SITE='sites/agiscorecard/';
export const ORIGIN='https://agiscorecard.com';
const KEY='16507d8e1997c4be371f5fbaf7ac1985';
export function attributes(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),m[3]]));}
export function canonical(html){for(const tag of html.match(/<link\b[^>]*>/gi)||[]){const a=attributes(tag);if(a.rel?.toLowerCase().split(/\s+/).includes('canonical'))return a.href;}return null;}
export function sitemapUrls(xml){
  if(!/<urlset\b/.test(xml))throw Error('Not a URL sitemap');
  const urls=[...new Set([...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&')))];
  if(!urls.length||urls.length>10000)throw Error('Unexpected sitemap size');
  for(const value of urls){const u=new URL(value);if(u.origin!==ORIGIN||u.search||u.hash||u.username||u.password)throw Error('Noncanonical/off-site sitemap URL: '+value);}
  return urls;
}
export function selectUrls({current,previous,changed,html}){
  const active=new Set(current),old=new Set(previous),selected=new Set(current.filter(u=>!old.has(u)));
  for(const file of changed){if(!file.startsWith(SITE)||!file.endsWith('.html'))continue;const text=html(file);if(!text)continue;const url=canonical(text);if(url&&active.has(url))selected.add(url);}
  if(changed.includes(SITE+'data.json'))for(const p of ['/','/cn','/progress-index','/zh/progress-index','/for-agents'])if(active.has(ORIGIN+p))selected.add(ORIGIN+p);
  return {updated:[...selected].sort(),removed:previous.filter(u=>!active.has(u)).sort()};
}
export function checkPage(url,response,html){
  if(response.status!==200||response.url!==url)throw Error('URL is unavailable or redirects: '+url);
  if(canonical(html)!==url)throw Error('Canonical differs: '+url);
  const meta=(html.match(/<meta\b[^>]*>/gi)||[]).map(attributes).filter(a=>['robots','googlebot','bingbot'].includes(a.name?.toLowerCase())).map(a=>a.content||'').join(' ');
  if(/\b(noindex|none)\b/i.test(meta+' '+(response.headers.get('x-robots-tag')||'')))throw Error('URL is noindex: '+url);
}
export async function submit({urls,key=KEY,fetcher=fetch}){
  if(!urls.length)return {httpStatus:null,outcome:'nothing_changed',submitted:0,indexing:'unknown'};
  if(urls.length>10000||urls.some(u=>new URL(u).origin!==ORIGIN))throw Error('Invalid submission URLs');
  const keyLocation=ORIGIN+'/'+key+'.txt';const proof=await fetcher(keyLocation,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(proof.status!==200||(await proof.text()).trim()!==key)throw Error('Published IndexNow key could not be verified');
  const response=await fetcher('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:new URL(ORIGIN).hostname,key,keyLocation,urlList:urls}),signal:AbortSignal.timeout(25000)});
  if(![200,202].includes(response.status))throw Error('IndexNow HTTP '+response.status+'; cursor unchanged, no automatic retry');
  return {httpStatus:response.status,outcome:response.status===200?'received':'received_key_validation_pending',submitted:urls.length,indexing:'unknown'};
}
async function main(){
  const args=process.argv.slice(2),statePath=path.join(ROOT,'data/indexnow/agi.json');
  const state=JSON.parse(fs.readFileSync(statePath,'utf8'));const git=(...a)=>execFileSync('git',a,{cwd:ROOT,encoding:'utf8'}).trim();
  const head=git('rev-parse','HEAD');git('merge-base','--is-ancestor',state.baseCommit,head);
  const response=await fetch(ORIGIN+'/sitemap.xml?ci=1',{signal:AbortSignal.timeout(20000)});if(response.status!==200)throw Error('Live sitemap unavailable');
  const current=sitemapUrls(await response.text()),changed=git('diff','--name-only',state.baseCommit,head,'--',SITE).split('\n').filter(Boolean);
  const plan=selectUrls({current,previous:state.urls,changed,html:f=>fs.existsSync(path.join(ROOT,f))?fs.readFileSync(path.join(ROOT,f),'utf8'):''});
  const verified=[],headers={'user-agent':'agi-discovery-bot/1.0 (+https://agiscorecard.com; automated QA)'};
  for(const url of plan.updated){const r=await fetch(url,{redirect:'manual',headers,signal:AbortSignal.timeout(20000)});checkPage(url,r,await r.text());verified.push(url);}
  const skippedRemovals=[];
  for(const url of [...new Set([...plan.removed,...(state.pendingRemovals||[])])]){const r=await fetch(url,{redirect:'manual',headers,signal:AbortSignal.timeout(20000)});if([404,410].includes(r.status))verified.push(url);else skippedRemovals.push({url,status:r.status});await r.body?.cancel();}
  if(args.includes('--check')){console.log(JSON.stringify({mode:'dry_run',baseCommit:state.baseCommit,head,verified,skippedRemovals,indexing:'unknown'},null,2));return;}
  const receipt=await submit({urls:verified});
  const next={version:1,baseCommit:head,urls:current,pendingRemovals:skippedRemovals.map(r=>r.url),receipt:{...receipt,at:new Date().toISOString(),urls:verified,skippedRemovals}};
  fs.mkdirSync(path.dirname(statePath),{recursive:true});if(changed.length||verified.length||skippedRemovals.length||JSON.stringify(current)!==JSON.stringify(state.urls))fs.writeFileSync(statePath,JSON.stringify(next,null,2)+'\n');
  fs.writeFileSync(path.join(ROOT,'indexnow-agi-receipt.json'),JSON.stringify(next.receipt,null,2)+'\n');console.log(JSON.stringify(next.receipt,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
