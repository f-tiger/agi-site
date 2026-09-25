// Read-only production check. Distinct bot UA; no synthetic calculations or purchases.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {EDITION} from '../assets/studio/quote-core.mjs';
const origin='https://baipiaoji.com';
const get=async path=>{
  const response=await fetch(origin+path,{headers:{'user-agent':'bpj-studio-deploy-selfcheck-bot (+ci)'},redirect:'error',signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200,path);return response.text();
};
for(const prefix of ['','/en']){
  const hub=await get(prefix+'/studio/'),tool=await get(prefix+'/studio/quote-compare'),home=await get(prefix+'/');
  assert.ok(hub.includes(`href="${origin}${prefix}/studio/quote-compare"`));
  assert.ok(hub.includes(`href="${origin}${prefix}/work-plan"`));
  assert.ok(tool.includes(`data-edition="${EDITION}"`),prefix+' quote edition');
  assert.ok(tool.includes('id="qc-quote-source_text"')&&tool.includes('id="qc-calculate"'));
  assert.ok(tool.includes(`rel="canonical" href="${origin}${prefix}/studio/quote-compare"`));
  assert.ok(home.includes('id="studio"')&&home.includes('data-studio-nav'));
}
const digest=text=>createHash('sha256').update(text).digest('hex');
for(const file of ['quote-core.mjs','quote-copy.mjs','quote-view.mjs','quote-app.mjs','studio.css']){
  const live=await get('/studio-assets/'+file+'?edition='+encodeURIComponent(EDITION));
  assert.equal(digest(live),digest(readFileSync(new URL('../assets/studio/'+file,import.meta.url),'utf8')),file+' differs from source');
}
console.log('BPJ first-party hub, homepage entries, bilingual quote tool and exact asset contents are live: '+EDITION);
