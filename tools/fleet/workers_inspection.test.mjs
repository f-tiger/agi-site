import test from 'node:test';
import assert from 'node:assert/strict';
import {publicProject,publicSettings,aggregatePath} from './workers_inspection.mjs';
test('diagnosis excludes credentials and deployment environment variables',()=>{
 const p=publicProject({id:'project',name:'site',deployment_configs:{production:{env_vars:{SECRET:{value:'do-not-copy'}}}},canonical_deployment:{id:'release',env_vars:{PASSWORD:'no'},deployment_trigger:{metadata:{commit_hash:'sha',commit_message:'private text'}}}});
 const s=publicSettings({bindings:[{name:'KEY',text:'secret'}],assets:{run_worker_first:true},compatibility_date:'2026-08-01'});
 assert.equal(p.deployment.commit,'sha'); assert.deepEqual(s.assets,{run_worker_first:true});
 assert.doesNotMatch(JSON.stringify([p,s]),/do-not-copy|private text|PASSWORD|bindings|secret/);
});
test('query strings and private route identifiers do not enter aggregate report',()=>{
 assert.equal(aggregatePath('/api/account/customer-id?token=secret'),'/api/account/*');
 assert.equal(aggregatePath('/auth/callback?code=secret'),'/auth/*');
 assert.equal(aggregatePath('/public/a@example.com.json'),'/public/[redacted]');
 assert.equal(aggregatePath('/assets/app.js?v=1'),'/assets/app.js');
});
