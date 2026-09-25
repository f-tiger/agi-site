// Read-only production check. Distinct bot UA; no synthetic calculations or purchases.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {setTimeout as pause} from 'node:timers/promises';
import {EDITION} from '../assets/studio/quote-core.mjs';
import {EDITION as VIDEO_EDITION} from '../assets/studio/video-core.mjs';
import {FILE_EDITION} from '../assets/studio/file-core.mjs';
import {PLAN} from '../lib/membership.js';
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
  for(const slug of ['pdf-tools','product-images']){
    const page=await get(prefix+'/studio/'+slug);
    assert.ok(page.includes(`data-edition="${FILE_EDITION}"`));
    assert.ok(page.includes('id="ft-run"')&&page.includes('id="ft-share"'));
    assert.ok(page.includes(`rel="canonical" href="${origin}${prefix}/studio/${slug}"`));
    assert.ok(hub.includes(`href="${origin}${prefix}/studio/${slug}"`));
    assert.ok(home.includes(`href="${origin}${prefix}/studio/${slug}"`));
  }
  const video=await get(prefix+'/studio/video-variants');
  assert.ok(video.includes(`data-edition="${VIDEO_EDITION}"`));
  assert.ok(video.includes(`rel="canonical" href="${origin}${prefix}/studio/video-variants"`));
  assert.ok(video.includes('id="vv-export"')&&video.includes('id="vv-audio"'));
  assert.ok(hub.includes(`href="${origin}${prefix}/studio/video-variants"`));
  assert.ok(home.includes(`href="${origin}${prefix}/studio/video-variants"`));
  const videoHub=await get(prefix+'/video/'),category=await get(prefix+'/c/video');
  assert.ok(videoHub.includes(`rel="canonical" href="${origin}${prefix}/video/"`));
  assert.ok(videoHub.includes('id="membership"')&&videoHub.includes('class="video-paths"'));
  assert.ok(videoHub.includes(`${PLAN.price_units/1e6} USDT`)&&videoHub.includes('data-video-availability'));
  assert.ok(videoHub.includes('id="vc-canvas"')&&videoHub.includes('id="compare"')&&videoHub.includes('id="revision-choice"'),'case demonstrations and route comparison');
  for(const id of ['launch','revision','repurpose'])assert.ok(videoHub.includes(`data-video-case="${id}"`)&&video.includes(`data-video-preset="${id}"`),'case handoff '+id);
  for(const [label,page] of [['home',home],['studio',hub]]){
    assert.ok(page.includes(`href="${origin}${prefix}/video/"`)&&page.includes('data-video-nav'),prefix+' '+label+' video discovery');
  }
  // Category pages use their own main layout with an entry card, without a rail.
  assert.ok(category.includes(`href="${origin}${prefix}/video/"`)&&category.includes('data-video-entry="category"'),prefix+' directory video discovery');
  assert.ok(video.includes('id="vv-cloud-save"')&&video.includes('tool=bpj-video-variants'));
  assert.ok((await get(prefix+'/workbench/creatorops')).includes('creatorops'),'video brief destination');
}
const products=JSON.parse(await get('/member-assets/products.json'));
assert.ok(products.some(p=>p.id==='bpj-video-variants'&&new URL(p.urls.zh).origin===origin),'video member product registration');
const member=JSON.parse(await get('/api/member'));
assert.ok(member.ok&&member.ready&&member.site==='bpj','BPJ membership service readiness');
assert.equal(member.plan.price_units,PLAN.price_units,'membership price');
assert.equal(member.plan.versions,PLAN.versions,'membership version allowance');
const digest=text=>createHash('sha256').update(text).digest('hex');
for(const file of ['quote-core.mjs','quote-copy.mjs','quote-view.mjs','quote-app.mjs','studio.css','video-core.mjs','video-view.mjs','video-render.mjs','video-app.mjs','video-business.mjs','video.css','video-cases.mjs','video-case-player.mjs','video-cases.css','file-app.mjs','file-core.mjs','file-copy.mjs','file-view.mjs','file-engine.mjs','file-tools.css','vendor/pdf-lib-1.17.1.mjs','vendor/fflate-0.8.2.mjs']){
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
console.log('BPJ video commerce hub, directory entries, paid cloud offer, member registration and exact tool assets are live: '+EDITION+' / '+VIDEO_EDITION);
