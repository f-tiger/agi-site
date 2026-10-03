import assert from 'node:assert/strict';
const base='https://agiscorecard.com';
for(const p of ['/invest','/zh/invest']){const r=await fetch(base+p+'?__probe=roadmap',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const h=await r.text();for(const token of ['id="ai-roadmap"','id="rm-watchlist"','id="rm-returns"','/roadmap-assets/app.mjs','G-FZXLMBB5QB'])assert.ok(h.includes(token),p+' '+token);console.log('Live hub OK',p);}
const r=await fetch(base+'/roadmap-assets/roadmap.json');assert.ok(r.ok);const d=await r.json();assert.equal(d.routes.length,5);assert.equal(d.companies.length,9);assert.ok(d.views.length>=17);console.log('Live source contract:',d.revision,d.views.length,'views');
for(const asset of ['app.mjs','core.mjs','style.css'])assert.ok((await fetch(base+'/roadmap-assets/'+asset)).ok);
