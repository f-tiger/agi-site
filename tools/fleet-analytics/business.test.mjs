import test from 'node:test';
import assert from 'node:assert/strict';
import {products,sites} from '../revenue-studio/catalog.mjs';
import {businessEvent} from './business.mjs';
test('Fixed route and action whitelist excludes arbitrary labels and cross-site tools',()=>{
 assert.deepEqual(businessEvent('getecoback.com','/de/workbench/billlens.html',{name:'workbench_complete'}),{name:'tool_complete',tool_id:'billlens'});
 assert.deepEqual(businessEvent('baipiaoji.com','/en/workbench/creatorops',{name:'workbench_example_export'}),{name:'tool_example_export',tool_id:'creatorops'});
 for(const [host,path,detail]of [
 ['getecoback.com','/workbench/billlens',{name:'workbench_complete',value:99}],
 ['getecoback.com','/workbench/billlens',{name:'purchase'}],
 ['agiscorecard.com','/workbench/billlens',{name:'workbench_complete'}],
 ['getecoback.com','/members',{name:'workbench_complete'}],
 ['preview.pages.dev','/workbench/billlens',{name:'workbench_complete'}],
 ['thedollscout.com','/verify-file',{name:'doc_complete'}],
 ['thedollscout.com','/pdf-to-text',{name:'doc_partial'}],
 ['thedollscout.com','/pdf-to-text',{name:'doc_error'}]
 ])assert.equal(businessEvent(host,path,detail),null);
});

test('Every form workbench has the correct property and fixed tool id',()=>{
 const forms=products.filter(p=>!p.kind);assert.equal(forms.length,20);
 for(const p of forms)assert.deepEqual(businessEvent(new URL(sites[p.site].origin).hostname,'/workbench/'+p.id,{name:'workbench_complete'}),{name:'tool_complete',tool_id:p.id});
});
