// Public-asset bypass policy. HTML, auth, APIs and downloads stay Worker-first.
// Run after all generators and the GA4 coverage pass, before wrangler deploy.
import {readFileSync,writeFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const policy=JSON.parse(readFileSync(new URL('./worker-budget-routing.json',import.meta.url),'utf8'));
export function readConfig(site){return JSON.parse(readFileSync(resolve(root,'sites',site,'wrangler.jsonc'),'utf8').replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,(match,string)=>string||''));}
export const analyticsHeaders={
 'Cache-Control':'public, max-age=0, must-revalidate, no-transform',
 'X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'Content-Security-Policy':"default-src 'none'; script-src 'self' https://www.googletagmanager.com; connect-src https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com; img-src https://*.google-analytics.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
 'X-Frame-Options':'SAMEORIGIN'
};
const labHeaders={
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; frame-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Strict-Transport-Security':'max-age=31536000','Cache-Control':'public, max-age=0, must-revalidate'
};
const safeExtensions=new Set(['.js','.mjs','.css','.png','.jpg','.jpeg','.svg','.webp','.avif','.gif','.ico','.woff','.woff2','.ttf','.vtt','.srt','.json']);
const listFiles=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?listFiles(resolve(dir,e.name)):[resolve(dir,e.name)]);
export function rulesFor(site){const spec=policy.sites[site];assert(spec,'Unknown single-host Worker '+site);return ['/*',...[...policy.common,...spec.paths].map(p=>'!'+p)];}
export function assetFiles(site,assetRoot){
 const spec=policy.sites[site],paths=[];
 for(const p of spec.paths){
  if(p.endsWith('/*')){
   const dir=resolve(assetRoot,p.slice(1,-2));assert(existsSync(dir),'Missing public asset directory '+dir);
   for(const file of listFiles(dir)){assert(safeExtensions.has(extname(file)),'Review new non-asset before bypassing Worker: '+file);paths.push('/'+file.slice(assetRoot.length+1));}
  }else {assert(existsSync(resolve(assetRoot,p.slice(1))),'Missing reviewed public asset '+p);paths.push(p);}
 }
 return paths;
}
const headerRule=(path,headers)=>path+'\n'+Object.entries(headers).map(([key,value])=>'  '+key+': '+value).join('\n')+'\n';
export function headerBlock(site,files){
 let out='# FLEET-WORKER-STATIC-HEADERS\n';const rules=new Map();
 const add=(path,headers)=>rules.set(path,{...(rules.get(path)||{}),...headers});
 // Keep the analytics frame itself behind its existing Worker handler. The
 // asset layer must retain identical protection for bypassed modules/styles.
 add('/analytics-assets/*',analyticsHeaders);
 // Never use /* for this marker: ASSETS.fetch also serves Worker-owned HTML.
 for(const path of [...policy.common,...policy.sites[site].paths])add(path,{'X-Fleet-Delivery':'static-worker-v1'});
 if(site==='agiscorecard')for(const path of ['/share/*','/badge/*'])add(path,{'Cache-Control':'public, max-age=604800'});
 if(site==='getecoback')for(const path of files){const ext=extname(path),cache=/\.(svg|ico|png|jpe?g|webp|gif|woff2?)$/.test(path)?'public, max-age=31536000, immutable':['.js','.css'].includes(ext)?'public, max-age=86400':'public, max-age=3600';add(path,{'Cache-Control':cache});}
 if(site==='buysomething')for(const path of files)add(path,{'Cache-Control':'public, max-age=86400'});
 if(site==='agent-delivery-lab')for(const path of files)add(path,labHeaders);
 for(const [path,headers] of rules)out+=headerRule(path,headers);
 return out+'# /FLEET-WORKER-STATIC-HEADERS\n';
}
export function verifySite(site,{write=false,source=false}={}){
 const spec=policy.sites[site],cfg=readConfig(site),expected=rulesFor(site);assert.deepEqual(cfg.assets.run_worker_first,expected,site+' static routing drift');assert(expected.length<=100,'Cloudflare static rule limit');
 const assetRoot=resolve(root,'sites',site,source?(spec.source_assets||spec.assets):spec.assets);
 const files=assetFiles(site,assetRoot),headerPath=resolve(assetRoot,'_headers'),old=existsSync(headerPath)?readFileSync(headerPath,'utf8'):'';
 const clean=old.replace(/\n?# FLEET-WORKER-STATIC-HEADERS\n[\s\S]*?# \/FLEET-WORKER-STATIC-HEADERS\n?/g,'').trimEnd();
 const wanted=(clean?clean+'\n\n':'')+headerBlock(site,files);
 assert(wanted.split('\n').filter(line=>line.startsWith('/')||line.startsWith('https://')).length<=100,'Cloudflare header rule limit');
 assert(wanted.split('\n').every(line=>line.length<=2000),'Cloudflare header line length');
 if(write)writeFileSync(headerPath,wanted);else assert.equal(old,wanted,site+' public asset headers missing/stale: run --write after final build');
 return {site,rules:expected.length,reviewedAssets:files.length,headerPath};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const site=process.argv.find(x=>x.startsWith('--site='))?.slice(7);assert(site,'Use --site=<site> [--write]');
 console.log(JSON.stringify(verifySite(site,{write:process.argv.includes('--write'),source:process.argv.includes('--source')})));
}
