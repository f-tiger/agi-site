import assert from 'node:assert/strict';import {VERSION} from '../../create-assets/core.mjs';
const origin='https://agiscorecard.com';
for(const [path,needle] of [['/create','Your idea.'],['/zh/create','你的想法'],['/create-assets/app.mjs','validateStory'],['/create-assets/core.mjs',VERSION]]){const r=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);assert.ok((await r.text()).includes(needle),path);}
const c=await fetch(origin+'/api/create').then(r=>r.json());assert.equal(c.version,VERSION);assert.equal(c.visibility,'unlisted');assert.equal(c.ai,true);
const blocked=await fetch(origin+'/api/create',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://invalid.example'},body:JSON.stringify({action:'publish'})});assert.equal(blocked.status,403);
const invalid=await fetch(origin+'/api/create?id=invalid');assert.equal(invalid.status,404);
console.log('Relay live version, bilingual pages, AI binding presence, private API boundary and invalid link checks passed. No user data or model calls made.');
