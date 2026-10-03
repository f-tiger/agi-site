import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const registry=JSON.parse(fs.readFileSync(new URL('registry.json',import.meta.url)));
const site=process.argv[2],cfg=registry[site];assert(cfg,'Pass a site key from registry.json');
const names=['consent.mjs','collector.mjs','consent.css','frame.html','frame-loader.mjs','business.mjs','legacy.mjs','campaign.mjs'];
const local=names.map(n=>fs.readFileSync(new URL(n,import.meta.url)));
const version=createHash('sha256').update(Buffer.concat([...local,fs.readFileSync(new URL('registry.json',import.meta.url))])).digest('hex').slice(0,12);
const allowed=Object.fromEntries(Object.values(registry).flatMap(c=>c.hosts.map(h=>[h,c.id])));
async function read(host,path){
 const origin='https://'+host,url=new URL(path,origin);assert.equal(url.origin,origin);url.searchParams.set('__probe','1');
 let failure;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const r=await fetch(url,{headers:{'user-agent':'fleet-analytics-probe/1.0','x-probe':'1'},signal:AbortSignal.timeout(25000)});
   if(r.status===200)return {text:await r.text(),headers:r.headers};
   failure=new Error(url.pathname+' returned HTTP '+r.status);
  }catch(error){failure=error;}
  if(attempt<3)await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw failure;
}
const results=[];
for(const host of cfg.hosts){
 let report=JSON.parse((await read(host,'/analytics-assets/coverage.json')).text);
 for(let attempt=0;report.version!==version&&attempt<6;attempt++){
  await new Promise(resolve=>setTimeout(resolve,5000));
  report=JSON.parse((await read(host,'/analytics-assets/coverage.json')).text);
 }
 assert.equal(report.site,site);assert.equal(report.measurementId,cfg.id);
 assert.deepEqual(report.hosts,cfg.hosts);assert.equal(report.version,version,'Production analytics release is stale: '+host);
 await Promise.all(names.map(async(name,i)=>{
  const live=await read(host,'/analytics-assets/'+name+'?v='+version);
  assert.equal(live.text,local[i].toString(),host+'/'+name);
  if(name==='frame.html')assert(live.headers.get('cache-control')?.includes('no-transform'),'Analytics frame must exclude injected third-party beacons');
 }));
 const registryText=(await read(host,'/analytics-assets/registry.mjs')).text;
 assert.deepEqual(JSON.parse(registryText.replace(/^export const allowed = /,'').replace(/;\s*$/,'')),allowed,host+'/registry.mjs');
 const all=[...new Set(report.records.filter(r=>r.mode==='consent'&&new URL(r.url).hostname===host).map(r=>r.url))].sort();
 assert(all.length>0,'Empty coverage for '+host);
 // Build scans every output; live checks every host and shared asset, plus a
 // bounded deterministic spread of routes and important template families.
 const chosen=new Set(all.length<=80||process.argv.includes('--all')?all:[]);
 if(!chosen.size){
  for(let i=0;i<48;i++)chosen.add(all[Math.floor(i*(all.length-1)/47)]);
  const groups=new Set();
  for(const url of all){
   const path=new URL(url).pathname,group=path.split('/').slice(0,3).join('/');
   if((/^\/$|\/privacy|\/legal|\/workbench\/?$|\/earn$|stromtarif-werkstatt|\/datenschutz|\/start/.test(path))||(!groups.has(group)&&groups.size<24)){chosen.add(url);groups.add(group);}
  }
 }
 const routes=[...chosen];let next=0;
 await Promise.all(Array.from({length:6},async()=>{while(next<routes.length){
  const route=routes[next++],html=(await read(host,route)).text;
  assert.equal((html.match(/src="\/analytics-assets\/consent\.mjs\?v=/g)||[]).length,1,route);
  assert(html.includes('data-ga4-id="'+cfg.id+'"'),route);
  assert(html.includes('data-ga4-host="'+host+'"'),route);
  assert(html.includes('/analytics-assets/consent.mjs?v='+version),route);
  assert(!/<script\b[^>]*src=["']https:\/\/(?:www\.)?googletagmanager\.com\/gtag\/js/.test(html),'Legacy Google loader: '+route);
 }}));
 results.push({host,buildCoveredRoutes:all.length,liveRoutesVerified:routes.length});
}
console.log(JSON.stringify({site,version,hosts:results,ga4BackendReceipt:'not-tested'}));
