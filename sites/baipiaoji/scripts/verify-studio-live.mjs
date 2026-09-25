// Read-only production check. Distinct bot UA; no synthetic calculations or purchases.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {setTimeout as pause} from 'node:timers/promises';
import {EDITION} from '../assets/studio/quote-core.mjs';
const origin='https://baipiaoji.com';
const get=async path=>{
  const url=new URL(path,origin);url.searchParams.set('__probe','1');
  const response=await fetch(url,{headers:{'user-agent':'bpj-studio-deploy-selfcheck-bot (+ci)'},redirect:'error',signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200,path);return response.text();
};
async function verify(){
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
}
// Pages can report deployment complete before the production alias reaches every edge.
// Retry the same strict checks for at most 45 seconds of backoff; never skip a failed check.
for(let attempt=0;attempt<5;attempt++){
  try{await verify();break;}
  catch(error){if(attempt===4)throw error;const delay=3000*2**attempt;
    console.log(`Production not ready (attempt ${attempt+1}/5): ${error.message}. Retrying in ${delay/1000}s.`);
    await pause(delay);
  }
}
console.log('BPJ first-party hub, homepage entries, bilingual quote tool and exact asset contents are live: '+EDITION);
