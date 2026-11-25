import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base='https://agiscorecard.com',hash=b=>createHash('sha256').update(b).digest('hex');
const data=JSON.parse(fs.readFileSync(new URL('data.json',root),'utf8'));
const predictions=new Map(data.predictions.map(row=>[row.id,row]));
const pages=[['progress-index',null],['will-agi-arrive-2027','agi-2027'],['did-open-source-ai-fade','open-source-fades'],['ai-and-your-job',null]];
for(let attempt=1;attempt<=4;attempt++)try{
 for(const [slug,id] of pages)for(const prefix of ['','zh/']){
  const path=prefix+slug,r=await fetch(base+'/'+path+'?ci=1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const text=await r.text(),local=fs.readFileSync(new URL(path+'.html',root),'utf8');
  const fragment=s=>s.match(/<!-- evidence-asset:start -->[\s\S]*?<!-- evidence-asset:end -->/)?.[0];assert.ok(fragment(text));assert.equal(fragment(text),fragment(local));assert.ok(text.includes('https://agiscorecard.com/'+path));
  const row=id?predictions.get(id):null;
  const reviewDate=row?.reviewedAt??'2026-10-02',ledgerDate=data.thesisTracker.asOf;
  const m=await fetch(base+'/'+path+'.md?ci=1');assert.equal(m.status,200);assert.match(m.headers.get('x-robots-tag')||'',/noindex/);
  const mirror=await m.text();
  const answer=mirror.split('\n').find(line=>line.startsWith('**Answer:**'))??'';
  const reviewIndex=answer.indexOf(reviewDate);
  assert.ok(reviewIndex>=0&&answer.includes(ledgerDate,reviewIndex+reviewDate.length),path);
  for(const source of row?.sources??[])assert.ok(answer.includes(source.url),path+': '+source.url);
 }
 for(const f of ['evidence-assets/evidence.js','evidence-assets/evidence.css',...['progress','agi2027','open','work'].flatMap(k=>['en','zh'].map(l=>`evidence-assets/${k}-${l}.svg`))]){const r=await fetch(base+'/'+f+'?ci=1');assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(fs.readFileSync(new URL(f,root))));}
 const denied=await fetch(base+'/api/evidence-funnel');assert.equal(denied.status,404);console.log('Live evidence release: eight canonical pages/mirrors, exact charts/scripts and private metrics boundary passed.');break;
}catch(e){if(attempt===4)throw e;await new Promise(r=>setTimeout(r,8000));}
