import assert from 'node:assert/strict';import {VERSION} from '../../create-assets/core.mjs';
const origin='https://agiscorecard.com';
async function verify(){
for(const [path,needle] of [['/create','Your idea.'],['/zh/create','你的想法'],['/relay-demo','VideoObject'],['/zh/relay-demo','VideoObject'],['/video-sitemap.xml','video:content_loc'],['/create-assets/app.mjs','acquisition'],['/create-assets/core.mjs',VERSION]]){const r=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);assert.ok((await r.text()).includes(needle),path);}
const c=await fetch(origin+'/api/create').then(r=>r.json());assert.equal(c.version,VERSION);assert.equal(c.visibility,'unlisted');assert.equal(c.ai,true);
const blocked=await fetch(origin+'/api/create',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://invalid.example'},body:JSON.stringify({action:'publish'})});assert.equal(blocked.status,403);
const invalid=await fetch(origin+'/api/create?id=invalid');assert.equal(invalid.status,404);
console.log('Relay live version, bilingual pages, AI binding presence, private API boundary and invalid link checks passed. No user data or model calls made.');

}
let failure;for(let attempt=0;attempt<7;attempt++){try{await verify();failure=null;break;}catch(e){failure=e;if(attempt<6)await new Promise(r=>setTimeout(r,5000));}}if(failure)throw failure;
