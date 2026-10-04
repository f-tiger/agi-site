import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const runtime=process.env.FREE_ACCOUNT_RUNTIME_MODULES;
const {build}=await import(pathToFileURL(resolve(runtime,'esbuild/lib/main.js')));
const simulator=await import(pathToFileURL(resolve(runtime,'miniflare/dist/src/index.js')));
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=`import{withFleetAccount}from './tools/fleet-account/edge.mjs';import{agiMemberRequest}from './tools/fleet-account/agi-bridge.mjs';
globalThis.fetch=async(input,init)=>{const r=new Request(input,init);if(r.redirect!=='manual'||r.url!=='https://baipiaoji.com/api/account-fleet')throw Error('Unsafe request');return Response.json({ok:true,user:{id:'fixture',username:'RuntimeReader',email:'private@example.invalid'}})};
const worker=withFleetAccount({async fetch(request){if(new URL(request.url).pathname==='/api/jarvis'){const db={prepare(){return{bind(){return this},async run(){}}}};const adapted=await agiMemberRequest(request,{EVENTS:db,MEMBER_WATCH_SECRET:'isolated-fixture-only'});return Response.json({adapted:adapted instanceof Request&&adapted.headers.get('Authorization').startsWith('Bearer ')});}return new Response('<html><head><title>Public</title></head><body>Public content</body></html>',{headers:{'Content-Type':'text/html','Cache-Control':'public, max-age=60'}})}});export default worker;`;
const bundled=await build({stdin:{contents:source,resolveDir:root},bundle:true,format:'esm',write:false,platform:'neutral',external:['node:*']});
const options={modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-09-01',compatibilityFlags:['nodejs_compat']};
const mf=new simulator.Miniflare(simulator.convertV4MiniflareOptions?simulator.convertV4MiniflareOptions(options):options);
try{
 const headers={Cookie:'__Host-fleet_account='+'T'.repeat(43)};
 const status=await mf.dispatchFetch('https://agiscorecard.com/auth/status',{headers});assert.equal(status.status,200);assert.deepEqual(await status.json(),{ok:true,user:{username:'RuntimeReader'}});
 const page=await mf.dispatchFetch('https://agiscorecard.com/',{headers});const html=await page.text();assert(html.includes('src="/auth/nav.js"'));assert(!html.includes('RuntimeReader'));assert(!html.includes('private@example'));
 const native=await mf.dispatchFetch('https://agiscorecard.com/api/jarvis',{headers:{...headers,Authorization:'Fleet'}});assert.deepEqual(await native.json(),{adapted:true});
 console.log('PASS workerd: native request options, fleet header status, public HTML privacy and AGI session adapter. Synthetic identity only.');
}finally{await mf.dispose();}
