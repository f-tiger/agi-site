// Pages' root middleware otherwise invokes a Function for every asset request.
// Keep document/crawler/account handling in middleware and bypass only the
// explicitly public, build-verified asset surface. Run after ALL generators.
import {existsSync,readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,relative,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {analyticsFiles,protectAnalyticsResponse} from '../fleet-analytics/edge.mjs';

const marker='FLEET-PAGES-STATIC';
const COMMON=['analytics-assets','workbench-assets','member-assets'];
const DIRECTORIES={
 bpj:[...COMMON,'assets','badge','studio-assets'],
 tds:[...COMMON,'css','js','img','document-assets','collector-assets'],
};
const ASSET=/\.(?:css|m?js|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wasm|bin)$/i;
const DIRECTORY_ASSET=/\.(?:css|m?js|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wasm|bin|zip|pdf|bcmap|pfb)$/i;
const DOCUMENT=/\.(?:html?|xhtml)$/i;
const ROOT_ASSET=/^\/(?:en\/|de\/|zh\/|th\/)?[^/]+$/;
const RESERVED=/^\/(?:api|auth|functions|members|account|private)(?:\/|$)/i;
const HEADER_NAMES=['cache-control','x-robots-tag','x-content-type-options','referrer-policy','content-security-policy','x-frame-options'];
// These are public catalog/sample/license files from the reviewed generators,
// not an extension-wide exemption for future JSON, text or Markdown documents.
const REVIEWED_MARKDOWN=['/studio-assets/vendor/README.md','/studio-assets/vendor/pdf-lib-LICENSE.md'];
const COMMON_DATA=[
 '/workbench-assets/manifest.json','/workbench-assets/vendor/sqljs-LICENSE.txt','/member-assets/products.json',
 ...['en','de','zh','it'].map(lang=>'/workbench-assets/locales/'+lang+'.json'),
];
const workbenchData=(products,languages)=>products.flatMap(product=>[
 '/workbench-assets/samples/'+product+'.json',
 ...languages.map(lang=>'/workbench-assets/widgets/'+lang+'/'+product+'.txt'),
]);
const REVIEWED_DATA={
 bpj:new Set([...COMMON_DATA,...REVIEWED_MARKDOWN,
  ...workbenchData(['launchdesk','quotawatch-pro','creatorops'],['en','zh']),
  '/assets/tok/LICENSE','/studio-assets/vendor/manifest.json',
  '/studio-assets/vendor/fflate-LICENSE.txt','/studio-assets/vendor/pptxgenjs-LICENSE.txt',
 ]),
 tds:new Set([...COMMON_DATA,...workbenchData(['dropcalendar','collectorledger','displayfit'],['en','de']),
  ...['resource-library','tool-capabilities','manifest','ai-evaluation','sample-results'].map(name=>'/document-assets/'+name+'.json'),
  ...['tds-file-check-kit','llms-full','verify-format','delivery-format','llms'].map(name=>'/document-assets/'+name+'.txt'),
  '/document-assets/vendor/LICENSE.txt','/document-assets/vendor/cmaps/LICENSE',
  ...['PDFJS_JBIG2','JBIG2','QCMS','OPENJPEG','PDFJS_OPENJPEG','PDFJS_QCMS'].map(name=>'/document-assets/vendor/wasm/LICENSE_'+name),
  ...['LIBERATION','FOXIT'].map(name=>'/document-assets/vendor/standard_fonts/LICENSE_'+name),
  ...['learning-guides','videos','tool-capabilities','brand-guides','series-catalog','manifest'].map(name=>'/collector-assets/'+name+'.json'),
 ]),
};
function reviewedDirectoryAsset(site,path){
 return DIRECTORY_ASSET.test(path)||REVIEWED_DATA[site].has(path)||
  // These two generator-owned trees intentionally publish article text.
  (site==='tds'&&/^\/(?:document|collector)-assets\/text\/(?:en|de|zh)\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.txt$/.test(path));
}

function files(root,dir=root){
 return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const p=join(dir,entry.name);
  if(lstatSync(p).isSymbolicLink())throw Error('Static delivery does not accept symlinks: '+relative(root,p));
  return entry.isDirectory()?files(root,p):['/'+relative(root,p).replaceAll('\\','/')];
 });
}
export function invokesFunction(routes,path){
 const match=rule=>rule.endsWith('*')?path.startsWith(rule.slice(0,-1)):path===rule;
 return routes.include.some(match)&&!routes.exclude.some(match);
}
export function createRoutes(site,paths){
 if(!DIRECTORIES[site])throw Error('Unsupported Pages site: '+site);
 const exclude=[];
 for(const dir of DIRECTORIES[site]){
  const prefix='/'+dir+'/',children=paths.filter(p=>p.startsWith(prefix));
  if(!children.length)continue;
  for(const p of children){
   if(dir==='analytics-assets'){
    if(!analyticsFiles.has(p.slice(prefix.length)))throw Error('Unreviewed analytics asset: '+p);
   }else if(DOCUMENT.test(p)||p.endsWith('/')||/(?:^|\/)\.[^/]+/.test(p)){
    throw Error('A document or hidden file entered a static-only directory: '+p);
   }else if(!reviewedDirectoryAsset(site,p)){
    throw Error('Unreviewed data/document entered a static-only directory: '+p);
   }
  }
  exclude.push(prefix+'*');
 }
 for(const p of paths){
  if(ROOT_ASSET.test(p)&&ASSET.test(p)&&!RESERVED.test(p))exclude.push(p);
 }
 const routes={version:1,description:'Public assets bypass Functions; HTML, auth, API, MCP, private pages and crawler documents retain middleware.',include:['/*'],exclude:[...new Set(exclude)].sort()};
 if(routes.include.length+routes.exclude.length>100)throw Error('Pages route limit exceeded; review asset grouping, never broaden exclusions automatically');
 for(const p of routes.exclude)if(p.length>100)throw Error('Pages route is longer than 100 characters: '+p);
 return routes;
}
export function renderHeaders(original,routes){
 const clean=original.replace(/\n?# FLEET-PAGES-STATIC\n[\s\S]*?# \/FLEET-PAGES-STATIC\n?/g,'\n')
  // coverage.py wrote the smaller frame-only policy before this final pass.
  // Remove that generated block so overlapping rules cannot concatenate CSP
  // or Cache-Control values. Its policy is fully preserved and strengthened.
  .replace(/\n?# FLEET-GA4-HEADERS\n[\s\S]*?# \/FLEET-GA4-HEADERS\n?/g,'\n').trimEnd();
 const policy=protectAnalyticsResponse(new Response('')).headers;
 const lines=['','# '+marker];
 for(const rule of routes.exclude){
  lines.push(rule,'  X-Fleet-Delivery: static-pages-v1');
  if(rule==='/analytics-assets/*')for(const name of HEADER_NAMES)lines.push('  '+name+': '+policy.get(name));
 }
 // BPJ previously applied this policy to every noncanonical Markdown file in
 // middleware. Preserve it for the only two reviewed Markdown bypasses.
 for(const path of REVIEWED_MARKDOWN)if(!invokesFunction(routes,path))lines.push(path,'  X-Robots-Tag: noindex');
 lines.push('# /'+marker,'');
 const rendered=clean+'\n'+lines.join('\n');
 const count=rendered.split('\n').filter(line=>/^\S/.test(line)&&!line.startsWith('#')).length;
 if(count>100)throw Error('Pages header-rule limit exceeded; preserve the security rules and review grouping');
 return rendered;
}
export function buildRoutes(site,out,check=false){
 const root=resolve(out);
 if(!existsSync(root))throw Error('Missing assembled output: '+root);
 const paths=files(root),routes=createRoutes(site,paths),routeText=JSON.stringify(routes,null,2)+'\n';
 const headersFile=join(root,'_headers'),headers=renderHeaders(existsSync(headersFile)?readFileSync(headersFile,'utf8'):'',routes);
 if(check){
  if(!existsSync(join(root,'_routes.json'))||readFileSync(join(root,'_routes.json'),'utf8')!==routeText)throw Error('Stale/missing _routes.json; run the final static routing pass');
  if(!existsSync(headersFile)||readFileSync(headersFile,'utf8')!==headers)throw Error('Stale/missing static security headers');
 }else{
  writeFileSync(join(root,'_routes.json'),routeText);writeFileSync(headersFile,headers);
 }
 const bypassed=paths.filter(p=>!invokesFunction(routes,p)).length;
 console.log(`${site}: ${routes.exclude.length} exclusions, ${bypassed} public asset files bypass Functions; document/API/auth routes retained`);
 return routes;
}
export async function verifyLive(site,fetcher=fetch){
 const host=site==='bpj'?'baipiaoji.com':site==='tds'?'thedollscout.com':null;
 if(!host)throw Error('Unsupported Pages site: '+site);
 const checks=[
  {path:site==='bpj'?'/style.css':'/css/main.css',status:200,delivery:'static-pages-v1'},
  {path:'/analytics-assets/consent.mjs',status:200,delivery:'static-pages-v1'},
  {path:'/analytics-assets/frame',status:200,delivery:'static-pages-v1',analytics:true},
  {path:'/',status:200,delivery:'pages-function'},
  {path:site==='bpj'?'/account':'/members',status:200,delivery:'pages-function',private:true},
  ...(site==='tds'?[{path:'/picks',status:410,delivery:'pages-function'}]:[]),
 ];
 for(const check of checks){
  const url=new URL(check.path,'https://'+host);url.searchParams.set('__probe','1');
  const response=await fetcher(url,{redirect:'manual',headers:{'User-Agent':'Fleet-Static-Routing-Probe/1.0 (read-only)','X-Probe':'1'},signal:AbortSignal.timeout(20000)});
  if(response.status!==check.status||response.headers.get('x-fleet-delivery')!==check.delivery)throw Error(`${host}${check.path}: expected ${check.status} ${check.delivery}, got ${response.status} ${response.headers.get('x-fleet-delivery')}`);
  if(check.private&&response.headers.get('cache-control')!=='no-store')throw Error('Private page lost no-store: '+host+check.path);
  if(check.analytics){
   const policy=protectAnalyticsResponse(new Response('')).headers;
   for(const name of HEADER_NAMES)if(response.headers.get(name)!==policy.get(name))throw Error('Static analytics policy changed: '+name);
  }
  await response.body?.cancel();
 }
 console.log(`${site}: ${checks.length} live delivery/privacy checks passed; no browser scripts or business actions executed`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [site,out,...flags]=process.argv.slice(2);
 if(out==='--live')await verifyLive(site);
 else{
  if(!site||!out)throw Error('Usage: node tools/fleet/pages-static-routes.mjs bpj|tds OUTPUT [--check] OR bpj|tds --live');
  buildRoutes(site,out,flags.includes('--check'));
 }
}
