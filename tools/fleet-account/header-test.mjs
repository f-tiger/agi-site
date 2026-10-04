import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {safeLanguageURL,excludedPath,headerTools,headerTargets,HEADER_VERSION} from './header.mjs';
const base=new URL('https://getecoback.com/guide/example.html?private=1');
for(const path of ['/en/members.html','/zh/auth/account','/widgets/btu.html','/auth/status','/api/data'])assert(excludedPath(path));
for(const target of ['https://evil.invalid/','//evil.invalid/','/auth/account','/fr/tool?personal=1','/fr/tool#state','javascript:alert(1)'])assert.equal(safeLanguageURL(target,base),null);
const tools=headerTools({lang:'de',nativeLanguage:false,entries:[],languageLinks:[],alternates:[{lang:'de',href:base.origin+base.pathname},{lang:'fr',href:base.origin+'/fr/tool'},{lang:'en',href:'https://evil.invalid/'}]},base);
assert(tools.includes('href="/fr/tool"'));assert(!tools.includes('evil.invalid'));assert(!tools.includes('private=1'));assert(tools.includes('Anmelden'));
const runtime=process.env.FREE_ACCOUNT_RUNTIME_MODULES;
if(!runtime)throw Error('Set FREE_ACCOUNT_RUNTIME_MODULES to the isolated esbuild/miniflare installation');
const {build}=await import(pathToFileURL(resolve(runtime,'esbuild/lib/main.js'))),{Miniflare}=await import(pathToFileURL(resolve(runtime,'miniflare/dist/src/index.js')));
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=`import {withFleetAccount} from './tools/fleet-account/edge.mjs';export default withFleetAccount({fetch(req){const path=new URL(req.url).pathname;const meta=path==='/private'?'<meta name="robots" content="noindex">':'';const nav=path==='/fallback'?'':'<nav class="eb-nav"><div class="eb-nav-in"><a class="eb-logo" href="/">EcoBack</a><a href="/tools.html">Tools</a></div></nav>';return new Response('<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width">'+meta+'<link rel="alternate" hreflang="fr" href="https://getecoback.com/fr/tool"></head><body><nav class="eb-language-nav"><details><summary>Old language bar</summary></details></nav>'+nav+'<main><h1>Keep this content</h1><form><input name="private-value"></form><div id="eb-usunits" hidden>20 m² is about 215 sq ft</div></main></body></html>',{headers:{'Content-Type':'text/html','Content-Security-Policy':"script-src 'self' 'nonce-fixture123'"}})}});`;
const bundled=await build({stdin:{contents:source,resolveDir:root},bundle:true,format:'esm',write:false,platform:'neutral'});
const mf=new Miniflare({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-08-01'});
try{
 for(const path of ['/','/fallback']){const r=await mf.dispatchFetch('https://getecoback.com'+path);const html=await r.text();assert.equal(r.headers.get('X-Fleet-Header-Version'),HEADER_VERSION);assert.equal((html.match(/data-fleet-header=/g)||[]).length,1);assert.equal((html.match(/class="fleet-account-entry"/g)||[]).length,1);assert(!html.includes('class="eb-language-nav"'));assert(html.includes('id="eb-usunits" hidden'));assert(html.includes('<input name="private-value">'));assert(html.includes('nonce="fixture123"'));assert(html.indexOf('/auth/account')>html.indexOf('data-fleet-header'));if(process.env.QA_DIR){mkdirSync(process.env.QA_DIR,{recursive:true});writeFileSync(resolve(process.env.QA_DIR,path==='/'?'header-fixture.html':'fallback-fixture.html'),html);}}
 for(const path of ['/private','/en/members.html','/widgets/btu.html']){const r=await mf.dispatchFetch('https://getecoback.com'+path);assert(!(await r.text()).includes('data-fleet-header'));}
 const anon=await mf.dispatchFetch('https://getecoback.com/auth/status');assert.deepEqual(await anon.json(),{ok:true,user:null});assert.match(anon.headers.get('Cache-Control'),/no-store/);
 const home=await(await mf.dispatchFetch('https://getecoback.com/')).text(),withCookie=await(await mf.dispatchFetch('https://getecoback.com/',{headers:{Cookie:'__Host-fleet_account='+'T'.repeat(43)}})).text();assert.equal(home,withCookie,'Public cached HTML must not depend on identity');
 console.log('PASS unified header: Workers integration, translations, private exclusions, content preservation, nonce, identity-free public HTML.');
}finally{await mf.dispose();}
// Service-worker boundaries protect status from stale/offline identity reuse.
const sw=readFileSync(new URL('../../sites/gridlings/site/sw.js',import.meta.url),'utf8');assert(sw.includes('auth|api|analytics-assets|members'));assert(sw.includes('req.cache === "no-store"'));assert(sw.includes('gl-v3'));
