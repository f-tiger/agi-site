import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base='https://agiscorecard.com';
const hash=b=>createHash('sha256').update(b).digest('hex');
for(let attempt=1;attempt<=4;attempt++){
  try{
    for(const [route,marker] of [['/','agi-focus-20261001'],['/cn','agi-focus-20261001'],['/progress-index','evidence-context:start'],['/zh/progress-index','evidence-context:start'],['/ai-and-your-job','evidence-context:start'],['/zh/ai-and-your-job','evidence-context:start']]){
      const r=await fetch(base+route+'?ci=1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,route);const body=await r.text();assert.ok(body.includes(marker),route+' release marker');
      if(route==='/'||route==='/cn'){
        const hero=body.match(/<!-- home-focus:start -->([\s\S]*?)<!-- home-focus:end -->/)[1];
        assert.ok(hero.includes('agi-countdown-20261002'),route+' prominent countdown');
        assert.ok(hero.includes('data-countdown-target="2027-01-01T00:00:00Z"'),route+' correct UTC target');
        assert.equal((body.match(/id="cd-days"/g)||[]).length,1,route+' no duplicate clock');
      }
    }
    for(const file of ['home-focus/focus.css','home-focus/focus.js','home-focus/countdown.js','data.json','index-history.json']){
      const r=await fetch(base+'/'+file+'?ci=1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(fs.readFileSync(new URL(file,root))),file+' bytes');
    }
    console.log('Live home focus: six routes, visible bilingual countdown, exact JS/CSS assets and unchanged ledger/history verified.');break;
  }catch(e){if(attempt===4)throw e;console.log('Waiting for release propagation: '+e.message);await new Promise(r=>setTimeout(r,8000));}
}
