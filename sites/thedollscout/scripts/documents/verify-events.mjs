import assert from 'node:assert/strict';
const origin='https://thedollscout.com';
const headers={'user-agent':'tds-document-probe/1.0','x-probe':'1'};
async function stats(){const response=await fetch(origin+'/api/document-stats',{headers,signal:AbortSignal.timeout(20000)});const data=await response.json();assert.equal(response.status,200,`Statistics read: ${data.error || 'unknown'} (${data.reason || 'unclassified'})`);assert.equal(data.ok,true);return data;}
const before=await stats();
const response=await fetch(origin+'/api/doc-events',{method:'POST',headers:{...headers,origin,'content-type':'application/json'},body:JSON.stringify({p:'/__ci/documents',e:'doc_ci'}),signal:AbortSignal.timeout(20000)});
const result=response.status===204?'':await response.text();
assert.equal(response.status,204,'Isolated CI event write: '+result.slice(0,160));
const after=await stats();
assert.ok((after.excluded.doc_ci||0)>(before.excluded.doc_ci||0),'CI event must be read back from D1');
for(const e of ['doc_ci','doc_sample','doc_delivery_sample'])assert.ok(!(e in after.events),'Exclude '+e);
console.log('Isolated CI event written and read back; excluded from document demand.');
