// Final, build-verified public-document delivery. No production requests unless --live.
import {existsSync,readFileSync,writeFileSync,readdirSync,lstatSync,mkdirSync} from 'node:fs';
import {resolve,relative,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRoutes} from './pages-static-routes.mjs';
import {publicReturnPath,privateHeaders} from '../fleet-account/config.mjs';
import {accountRoute} from '../fleet-account/edge.mjs';
import {protectAnalyticsResponse} from '../fleet-analytics/edge.mjs';
import {RETIRED_PREFIXES,isRetiredPath} from '../../sites/thedollscout/functions/retired-paths.mjs';
import {CONTENT_VERSION,crawlerMeasurement} from './pages-content-policy.mjs';

const repo=resolve(import.meta.dirname,'../..');
const authAssets=['/auth/fleet.css','/auth/fleet.js','/auth/nav.js'];
export const globMatch=(rule,path)=>new RegExp('^'+rule.split('*').map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$').test(path);
export const invokesContentFunction=(routes,path)=>routes.include.some(r=>globMatch(r,path))&&!routes.exclude.some(r=>globMatch(r,path));
const canonicalPath=p=>p.endsWith('/index.html')?p.slice(0,-10):p.replace(/\.html$/,'');
function files(root,dir=root){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const p=join(dir,e.name);if(lstatSync(p).isSymbolicLink())throw Error('Symlink in public output: '+p);
 return e.isDirectory()?files(root,p):['/'+relative(root,p).replaceAll('\\','/')];
});}
export function contentRoutes(site,paths){
 const base=createRoutes(site,paths);
 let routes;
 if(site==='bpj'){
  // Public documents and misses are static. API, encoded requests, Markdown
  // noindex policy and every generated private/embedded HTML shape retain middleware.
  const guarded=paths.filter(p=>p.endsWith('.html')&&!p.startsWith('/analytics-assets/')&&!publicReturnPath(p)).map(p=>canonicalPath(p)+'*');
  // Preserve reviewed exact public asset exemptions such as /account.js:
  // protecting /account* must not reintroduce compute for its constant UI files.
  routes={version:1,description:CONTENT_VERSION,include:[...new Set(['/api','/api/*','/auth','/auth/*','/private*','/admin*','/account*','/en/account*','/*%*','/*.md',...guarded])].sort(),exclude:base.exclude.filter(p=>!p.includes('*'))};
 }else{
  // Public HTML retains host canonicalization, account header and retirement handling.
  routes={...base,description:CONTENT_VERSION,exclude:[...new Set([...base.exclude,...authAssets])]};
  for(const locale of ['','en/','de/','zh/','th/'])for(const p of RETIRED_PREFIXES)for(const suffix of ['','/old','.html','.htm']){
   const retired='/'+locale+p.slice(1)+suffix;
   if(!invokesContentFunction(routes,retired))throw Error('Retired route would bypass middleware: '+retired);
  }
 }
 if(routes.include.length+routes.exclude.length>100)throw Error('Pages content routing exceeds 100 rules');
 if([...routes.include,...routes.exclude].some(p=>p.length>100))throw Error('Pages route exceeds 100 characters');
 for(const p of paths){
  if(/^\/(?:api|functions)(?:\/|$)/.test(p))throw Error('Executable/API shadow entered static output: '+p);
  if(p.startsWith('/auth/')&&!authAssets.includes(p))throw Error('Private auth shadow entered static output: '+p);
  if(p.endsWith('.html')&&!p.startsWith('/analytics-assets/')&&!publicReturnPath(p)&&!invokesContentFunction(routes,p))throw Error('Private document would bypass middleware: '+p);
  if(site==='tds'&&isRetiredPath(p))throw Error('Retired content entered public output: '+p);
 }
 return routes;
}
export function checkFunctions(site,routes,root=repo){
 const dir=join(root,'sites',site==='bpj'?'baipiaoji':'thedollscout','functions');
 for(const p of files(dir)){
  if(!/\.(?:js|ts)$/.test(p)||p==='/_middleware.js')continue;
  // No new dynamic route may silently fall outside the generated include set.
  if(p.startsWith('/api/')){if(!invokesContentFunction(routes,p.replace(/\.(?:js|ts)$/,'')))throw Error('API route bypass: '+p);}
  else if(site==='tds'&&p==='/mcp.js'){if(!invokesContentFunction(routes,'/mcp'))throw Error('MCP route bypass');}
  else throw Error('Unreviewed function route: '+p);
 }
}
export function contentHeaders(original,site){
 let clean=original.replace(/\n?# FLEET-PAGES-(?:STATIC|CONTENT)\n[\s\S]*?# \/FLEET-PAGES-(?:STATIC|CONTENT)\n?/g,'\n')
  .replace(/\n?# FLEET-GA4-HEADERS\n[\s\S]*?# \/FLEET-GA4-HEADERS\n?/g,'\n').trimEnd();
 const lines=['','# FLEET-PAGES-CONTENT','/*','  X-Fleet-Delivery: static-pages-v2'];
 lines.push('/analytics-assets/*');
 // A string Response adds text/plain automatically. Copy security policy from
 // a bodyless response so the wildcard cannot overwrite each asset's MIME type.
 for(const [k,v]of protectAnalyticsResponse(new Response(null)).headers)lines.push('  '+k+': '+v);
 if(site==='tds')for(const p of authAssets){
  lines.push(p);for(const[k,v]of Object.entries(privateHeaders))lines.push('  '+k+': '+(k==='Cache-Control'?'public, max-age=300':v));
 }
 lines.push('# /FLEET-PAGES-CONTENT','');
 const text=clean+'\n'+lines.join('\n');
 if(text.split('\n').filter(x=>/^\S/.test(x)&&!x.startsWith('#')).length>100)throw Error('Pages header budget exceeded');
 return text;
}
export async function buildContent(site,out,check=false){
 const root=resolve(out),paths=files(root),routes=contentRoutes(site,paths);checkFunctions(site,routes);
 if(!paths.includes('/404.html'))throw Error('Explicit static 404 required; no SPA fallback');
 if(site==='tds'){
  // These three account assets are public, constant source strings. Never
  // request account/status/callback or use cookies, D1 or a network fetch here.
  for(const p of authAssets){
   const response=await accountRoute(new Request('https://thedollscout.com'+p),{},()=>{throw Error('Static account compilation must never fetch')});
   if(response?.status!==200||response.headers.has('set-cookie'))throw Error('Public account asset failed: '+p);
   const value=await response.text(),file=join(root,p);
   if(check){if(!existsSync(file)||readFileSync(file,'utf8')!==value)throw Error('Stale public account asset: '+p);}
   else{mkdirSync(dirname(file),{recursive:true});writeFileSync(file,value);}
  }
 }
 const values={'_routes.json':JSON.stringify(routes,null,2)+'\n','_headers':contentHeaders(existsSync(join(root,'_headers'))?readFileSync(join(root,'_headers'),'utf8'):'',site),'_fleet-delivery.json':JSON.stringify({version:CONTENT_VERSION,site,...(site==='bpj'?{crawler_measurement:crawlerMeasurement}:{public_html:'functions; canonical host and retirement policies retained'})})+'\n'};
 for(const [p,value]of Object.entries(values)){if(check){if(!existsSync(join(root,p))||readFileSync(join(root,p),'utf8')!==value)throw Error('Stale content delivery output: '+p);}else writeFileSync(join(root,p),value);}
 console.log(`${site}: ${routes.include.length+routes.exclude.length} routing rules; ${paths.filter(p=>p.endsWith('.html')&&!invokesContentFunction(routes,p)).length} static HTML files; ${site==='bpj'?'crawler logging is partial':'public HTML retains middleware'}.`);
 return routes;
}
export async function verifyContentLive(site,fetcher=fetch){
 const host=site==='bpj'?'baipiaoji.com':'thedollscout.com';
 const checks=[['/',site==='bpj'?'static-pages-v2':'pages-function',200],['/analytics-assets/consent.mjs','static-pages-v2',200],['/analytics-assets/consent.css','static-pages-v2',200],['/analytics-assets/frame','static-pages-v2',200],
  [site==='bpj'?'/tools/kimi':'/auth/nav.js','static-pages-v2',200],
  [site==='bpj'?'/account':'/members','pages-function',200],
  ...(site==='tds'?[['/auth/account','pages-function',200],['/picks','pages-function',410],['/DE/%2570icks','pages-function',410]]:[['/mcp.md','pages-function',200],['/%61ccount','pages-function',200]])];
 for(const [path,delivery,status]of checks){const u=new URL(path,'https://'+host);u.searchParams.set('__probe','1');const r=await fetcher(u,{headers:{'User-Agent':'FleetContentDeliveryProbe/1.0 (read-only; no-js; no-events)','X-Probe':'1'},redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(r.status!==status||r.headers.get('x-fleet-delivery')!==delivery)throw Error(`${host}${path}: expected ${status} ${delivery}, got ${r.status} ${r.headers.get('x-fleet-delivery')}`);
  if(path==='/account'||path==='/members'||path==='/auth/account'||path==='/%61ccount'){if(r.headers.get('cache-control')!=='no-store')throw Error('Private cache policy lost');}
  if(path.endsWith('.md')&&!r.headers.get('x-robots-tag')?.includes('noindex'))throw Error('Markdown noindex lost');
  if(path.startsWith('/analytics-assets/')){
   const mime=(r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
   const valid=path.endsWith('.mjs')?['application/javascript','text/javascript'].includes(mime):path.endsWith('.css')?mime==='text/css':mime==='text/html';
   if(!valid)throw Error('Analytics MIME type drift: '+path+' '+mime);
  }
  if(path==='/analytics-assets/frame')for(const[k,v]of protectAnalyticsResponse(new Response(null)).headers)if(r.headers.get(k)!==v)throw Error('Analytics header drift: '+k);
  await r.body?.cancel();
 }
 if(site==='tds'){
  const response=await fetcher('https://www.thedollscout.com/series/smiski-museum?__probe=1',{headers:{'User-Agent':'FleetContentDeliveryProbe/1.0 (read-only)','X-Probe':'1'},redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(response.status!==301||response.headers.get('location')!=='https://thedollscout.com/series/smiski-museum?__probe=1')throw Error('Canonical www redirect lost');
  await response.body?.cancel();
 }
 console.log(`${site}: ${checks.length} live public/private/retirement checks passed; no business actions or browser scripts executed`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const[site,out,...flags]=process.argv.slice(2);if(!['bpj','tds'].includes(site))throw Error('Select bpj or tds');if(out==='--live')await verifyContentLive(site);else await buildContent(site,out,flags.includes('--check'));}
