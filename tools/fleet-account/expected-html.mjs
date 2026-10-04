// Exact expected public bytes for live smoke tests. Execute the same wrapper in
// real workerd, rather than stripping injected markup and weakening the hash.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire((process.env.FREE_ACCOUNT_RUNTIME_MODULES||'/tmp/fleet-header-runtime/node_modules')+'/package.json');
const {build}=require('esbuild'),{Miniflare}=require('miniflare');
let runtime;
async function start(){
 const bundle=await build({stdin:{contents:`import {withFleetAccount} from './edge.mjs';const wrapped=withFleetAccount({fetch(req,env){return new Response(env.html,{headers:env.headers})}});export default {async fetch(req){const data=await req.json();return wrapped.fetch(new Request(data.url),data)}}`,resolveDir:fileURLToPath(new URL('.',import.meta.url))},bundle:true,format:'esm',platform:'neutral',write:false});
 return new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-08-01'});
}
export async function expectedHTML(bytes,url,headers){
 runtime??=start();const mf=await runtime;
 const response=await mf.dispatchFetch('http://fixture.local/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html:bytes.toString(),url,headers:Object.fromEntries(headers)})});
 return Buffer.from(await response.arrayBuffer());
}
export async function closeExpectedHTML(){if(runtime)await(await runtime).dispose();}
