import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const base='https://verify.agiscorecard.com',release=JSON.parse(await readFile('dist/release.json','utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
async function get(path,options){const r=await fetch(base+path,{...options,signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path+' HTTP '+r.status);return r;}
const health=await(await get('/api/health')).json();assert.equal(health.revision,release.revision,'Deployed revision must match this build');
for(const file of ['index.html','app.mjs','engine.mjs','style.css','guide.html','privacy.html','runner.mjs','robots.txt','sitemap.xml']){const path=file==='index.html'?'/':'/'+file;const res=await get(path);assert.match(res.headers.get('Content-Security-Policy')||'',/default-src 'none'/);assert.equal(hash(Buffer.from(await res.arrayBuffer())),hash(await readFile('dist/'+file)),path+' deployed bytes');}
assert.equal((await fetch(base+'/does-not-exist')).status,404);
assert.equal((await fetch(base+'/api/feedback',{method:'POST',headers:{Origin:'https://example.org','Content-Type':'application/json'},body:'{}'})).status,403);
const id=randomUUID();const feedback={id,frequency:'zero',interest:'no',ownCompleted:false,qa:true};
await get('/api/feedback',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(feedback)});
const stats=await(await get('/api/stats')).json();assert.ok(stats.groups.some(g=>g.qa===1&&g.submissions>0),'QA feedback reached isolated table');
console.log('PASS: deployed revision, nine asset hashes, security headers, 404, origin rejection, QA feedback and stats.');
