import assert from 'node:assert/strict';import {VERSION} from '../../jarvis-assets/core.mjs';
const origin=process.env.JARVIS_ORIGIN||'https://agiscorecard.com';
for(const path of ['/jarvis','/zh/jarvis']){const r=await fetch(origin+path+'?ci=1',{headers:{'if-none-match':'"previous-edition"'},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);const h=await r.text();for(const want of [VERSION,'BreadcrumbList','WebApplication','FAQPage',origin+path,'/jarvis-assets/app.mjs','data-ga4-id="G-FZXLMBB5QB"'])assert.ok(h.includes(want),path+' missing '+want);
 const csp=r.headers.get('content-security-policy')||'',nonce=/script-src 'self' 'nonce-([a-f0-9]{32})'/.exec(csp)?.[1];assert.ok(nonce,path+' missing script nonce policy');assert.match(csp,/frame-ancestors 'none'/);assert.match(csp,/connect-src 'self'/);assert.equal(r.headers.get('x-frame-options'),'DENY');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('etag'),null);
 for(const script of h.matchAll(/<script\b[^>]*>/gi))assert.ok(script[0].includes('nonce="'+nonce+'"'),path+' script without response nonce');assert.ok(h.includes('/api/e'),'first-party measurement preserved');
}
const meta=await (await fetch(origin+'/api/jarvis')).json();assert.equal(meta.version,VERSION);assert.equal(meta.sharedAttemptsPer24h,12);assert.equal(meta.paid,false);assert.equal(meta.maxModelCallsPerNewRun,1);
const denied=await fetch(origin+'/api/jarvis/tasks');assert.equal(denied.status,401);assert.equal(denied.headers.get('cache-control'),'no-store');
assert.equal(meta.backgroundIntervalMinutes,120);assert.equal((await fetch(origin+'/api/jarvis/run')).status,401);
const cross=await fetch(origin+'/api/jarvis',{method:'POST',headers:{origin:'https://wrong.example','content-type':'application/json'},body:'{}'});assert.equal(cross.status,403);
for(const p of ['/jarvis-assets/app.mjs','/jarvis-assets/core.mjs','/jarvis-assets/style.css'])assert.equal((await fetch(origin+p)).status,200,p);
console.log('Jarvis live surfaces, version, nonce CSP, frame denial, bilingual canonicals, GA4 marker, API limits and private access boundaries verified. No AI quota used.');
