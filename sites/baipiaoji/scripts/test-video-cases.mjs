import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CASES,caseByID,caseProject} from '../assets/studio/video-cases.mjs';
import {restore,duration,caption,srt,cloudBackup,projectFromBackup,EDITION} from '../assets/studio/video-core.mjs';
assert.equal(CASES.length,3);assert.equal(new Set(CASES.map(c=>c.id)).size,3);
assert.equal(caseByID('__proto__'),undefined);assert.throws(()=>caseProject('unknown'));
for(const c of CASES)for(const lang of ['zh','en']){
 const p=caseProject(c.id,lang);assert.deepEqual(restore(p),p);assert.equal(p.demo,true);assert.equal(duration(p),9);
 assert.equal(p.lang,lang);assert.equal(p.ratio,c.ratio);assert.equal(p.hooks[c.variant],c[lang].hooks[c.variant]);
 assert.equal(p.scenes.every(s=>s.asset===null),true);assert.equal(p.budget.shots,0);
 assert.deepEqual(projectFromBackup(cloudBackup(p)),p);assert.equal(new Set(p.hooks).size,3);
 assert.equal(caption(p,1,0),caption(p,1,1));assert.notEqual(caption(p,0,0),caption(p,0,1));
 assert.ok(srt(p,c.variant).includes('00:00:06,000 --> 00:00:09,000'));
 const second=caseProject(c.id,lang);p.hooks[0]='Changed';assert.notEqual(p.hooks[0],second.hooks[0]);
}
if(process.argv.includes('--dist')){
 const root=new URL('../dist/',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
 for(const prefix of ['','en/']){
  const page=read(prefix+'video/index.html'),tool=read(prefix+'studio/video-variants.html'),md=read(prefix+'video/index.md');
  for(const c of CASES){assert.ok(page.includes('data-video-case="'+c.id+'"'));assert.ok(tool.includes('data-video-preset="'+c.id+'"'));assert.ok(md.includes('?case='+c.id));}
  for(const id of ['vc-canvas','vc-play','vc-start','vc-pack','compare','revision-choice','membership'])assert.ok(page.includes('id="'+id+'"'),id);
  assert.ok(page.includes('video-case-player.mjs?v='+EDITION));assert.ok(page.includes('video-cases.css?v='+EDITION));
  assert.ok(page.includes(prefix?'not a speed or performance benchmark':'不是速度或效果测评'));
 }
 for(const f of ['video-cases.mjs','video-case-player.mjs','video-cases.css'])assert.equal(read('studio-assets/'+f),fs.readFileSync(new URL('../assets/studio/'+f,import.meta.url),'utf8'));
}
console.log('PASS three bilingual 9-second case projects, independent drafts, matching subtitles, cloud restoration and built case/comparison surfaces');
