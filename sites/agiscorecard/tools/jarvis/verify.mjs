import assert from 'node:assert/strict';import {VERSION} from '../../jarvis-assets/core.mjs';
const origin=process.env.JARVIS_ORIGIN||'https://agiscorecard.com';
for(const path of ['/jarvis','/zh/jarvis']){const r=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);const h=await r.text();for(const want of [VERSION,'BreadcrumbList','WebApplication','FAQPage',origin+path,'/jarvis-assets/app.mjs','data-ga4-id="G-FZXLMBB5QB"'])assert.ok(h.includes(want),path+' missing '+want);}
const meta=await (await fetch(origin+'/api/jarvis')).json();assert.equal(meta.version,VERSION);assert.equal(meta.sharedAttemptsPer24h,12);assert.equal(meta.paid,false);
const denied=await fetch(origin+'/api/jarvis/tasks');assert.equal(denied.status,401);assert.equal(denied.headers.get('cache-control'),'no-store');
assert.equal(meta.backgroundIntervalMinutes,120);assert.equal((await fetch(origin+'/api/jarvis/run')).status,401);
const cross=await fetch(origin+'/api/jarvis',{method:'POST',headers:{origin:'https://wrong.example','content-type':'application/json'},body:'{}'});assert.equal(cross.status,403);
for(const p of ['/jarvis-assets/app.mjs','/jarvis-assets/core.mjs','/jarvis-assets/style.css'])assert.equal((await fetch(origin+p)).status,200,p);
console.log('Jarvis live surfaces, version, bilingual canonicals, GA4 marker, API limits and private access boundaries verified. Read-only; no AI quota used.');
