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

test('BPJ homepage accepts fixed labels only and keeps repeated clicks',()=>{
 assert.deepEqual(businessEvent('baipiaoji.com','/en/',{name:'home:hero:tool-directory'}),{name:'home_click',home_block:'hero',home_destination:'tool-directory',site_edition:'en',repeat:true});
 for(const [host,path,detail] of [['baipiaoji.com','/tools/grok',{name:'home:hero:toolbox'}],['getecoback.com','/',{name:'home:hero:toolbox'}],['baipiaoji.com','/',{name:'home:SECRET:toolbox'}],['baipiaoji.com','/',{name:'home:hero:https://private.invalid'}],['baipiaoji.com','/',{name:'home:hero:toolbox',query:'SECRET'}]])assert.equal(businessEvent(host,path,detail),null);
});


test('TDS collecting measurements keep exact route/action pairs and exclude input values',()=>{
 assert.deepEqual(businessEvent('thedollscout.com','/zh/collecting/budget',{name:'collector_budget_calc'}),{name:'tool_complete',tool_id:'collecting-budget'});
 assert.deepEqual(businessEvent('thedollscout.com','/de/brands/smiski',{name:'odds_calc'}),{name:'collector_odds_complete',tool_id:'smiski-style-odds'});
 for(const [p,d]of [['/collecting/duplicates',{name:'collector_budget_calc'}],['/brands/jellycat',{name:'odds_calc'}],['/collecting/budget',{name:'collector_budget_calc',value:100}],['/brands/unknown',{name:'display_calc'}]])assert.equal(businessEvent('thedollscout.com',p,d),null);
});

test('TDS daily series calculation has one fixed metric, never collector inputs',()=>{
 assert.deepEqual(businessEvent('thedollscout.com','/zh/series/sonny-angel-snack-series',{name:'collector_series_calc'}),{name:'collector_series_complete',tool_id:'series-style-probability'});
 for(const [p,d]of [['/series',{name:'collector_series_calc'}],['/series/unknown-series',{name:'collector_series_calc'}],['/series/smiski-living',{name:'collector_series_calc',probability:10}]])assert.equal(businessEvent('thedollscout.com',p,d),null);
});
