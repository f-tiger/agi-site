import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decision, selectionFromHash, selectionLink} from '../site/assets/thermostat-fit.mjs';
const data=JSON.parse(readFileSync(new URL('../site/assets/thermostat-fit-data.json',import.meta.url)));

test('M30 diameter alone and unsupported models never become confirmed compatibility',()=>{
  for(const valve of ['unknown','m30','m28-1-0','__proto__','']) assert.equal(decision(data,'tado-v3',valve).status,'unverified');
  for(const model of ['tado-x','other','unknown','__proto__','unreviewed']) for(const row of data.cases) assert.equal(decision(data,model,row.id).status,'unverified');
  assert.match(decision(data,'tado-x','heimeier-m30').detail,/V3\+/);
});
test('identified valves preserve adapter and safety distinctions',()=>{
  assert.equal(decision(data,'tado-v3','heimeier-m30').status,'direct');
  assert.match(decision(data,'tado-v3','heimeier-m30').detail,/Gewindegröße allein/);
  assert.match(decision(data,'tado-v3','herz-m28').detail,/Stiftverlängerung/);
  assert.match(decision(data,'tado-v3','herz-m28').detail,/Herz Mini/);
  assert.notEqual(decision(data,'tado-v3','oventrop-uni-l').source,decision(data,'tado-v3','oventrop-uni-lv').source);
  assert.match(decision(data,'tado-v3','oventrop-uni-l').detail,/nicht im tado°-Lieferumfang/);
  assert.match(decision(data,'tado-v3','oventrop-uni-lv').detail,/30,5-mm-Klemme/);
  assert.equal(decision(data,'tado-v3','manual-rtl').status,'stop');
});
test('share fragments are exact enum pairs and cannot retain arbitrary input or URLs',()=>{
  for(const model of data.models) for(const valve of ['unknown',...data.cases.map(x=>x.id)]){
    const link=selectionLink(model.id,valve,data);
    assert.deepEqual(selectionFromHash(new URL(link).hash,data),{model:model.id,valve});
    assert.equal(new URL(link).search,'');
    assert.equal(new URL(link).hostname,'getecoback.com');
  }
  for(const hash of ['#ventilcheck=tado-v3:heimeier-m30&address=secret','#ventilcheck=tado-x:missing','#ventilcheck=javascript:alert','#ventilcheck=tado-v3:%68eimeier-m30','#ventilcheck=tado-v3:heimeier-m30:other','#ventilcheck=__proto__:unknown']) assert.equal(selectionFromHash(hash,data),null);
  assert.equal(selectionLink('tado-v3','secret address',data),null);
});
test('reviewed results always lead to manufacturer evidence, not an affiliate purchase',()=>{
  for(const row of data.cases){
    assert.ok(data.sources[row.source]);
    assert.match(data.sources[row.source].url,/^https:\/\/(?:support\.tado\.com|cdn\.brandfolder\.io)\//);
    assert.ok(Number.isInteger(row.page)&&row.page>=1&&row.page<=9);
  }
  assert.equal(data.reviewed,'2026-10-31');
});
