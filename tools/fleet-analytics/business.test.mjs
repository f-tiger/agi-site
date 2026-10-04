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

test('BPJ subscription checklist measures review and successful copy without form values',()=>{
 for(const path of ['/subscription-audit','/en/subscription-audit.html'])
  for(const name of ['subscription_review','subscription_copy'])
   assert.deepEqual(businessEvent('baipiaoji.com',path,{name}),{name,tool_id:'subscription-audit',repeat:true});
 for(const [host,path,detail] of [
  ['baipiaoji.com','/members',{name:'subscription_copy'}],
  ['getecoback.com','/subscription-audit',{name:'subscription_copy'}],
  ['baipiaoji.com','/subscription-audit',{name:'subscription_copy',fee:200}],
  ['baipiaoji.com','/subscription-audit',{name:'subscription_review',usage:30}],
  ['baipiaoji.com','/subscription-audit',{name:'subscription_purchase'}]
 ])assert.equal(businessEvent(host,path,detail),null);
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

test('Future guide media events record fixed actions, never search or media URLs',()=>{
 assert.deepEqual(businessEvent('agiscorecard.com','/zh/future-guide',{name:'future_video_open'}),{name:'future_video_open',tool_id:'future-guide',repeat:true});
 for(const [host,p,d]of [['baipiaoji.com','/future-guide',{name:'future_audio_open'}],['agiscorecard.com','/members',{name:'future_medium'}],['agiscorecard.com','/future-guide',{name:'future_topic',query:'private'}],['agiscorecard.com','/future-guide',{name:'future_unknown'}]])assert.equal(businessEvent(host,p,d),null);
});

test('AGI home funnel uses fixed actions and route-derived language only',()=>{
 for(const path of ['/','/cn'])assert.deepEqual(businessEvent('agiscorecard.com',path,{name:'home_video_open'}),{name:'home_video_open',tool_id:'agi-home',site_edition:path==='/cn'?'zh':'en',repeat:true});
 for(const [host,path,detail]of [['agiscorecard.com','/members',{name:'home_library'}],['other.example','/',{name:'home_library'}],['agiscorecard.com','/',{name:'home_library',video:'private'}],['agiscorecard.com','/cn',{name:'home_unknown'}]])assert.equal(businessEvent(host,path,detail),null);
});

 test('BPJ tool signup intent accepts no private context',()=>{
 for(const path of ['/tools/grok','/en/tools/kimi.html']) assert.deepEqual(businessEvent('baipiaoji.com',path,{name:'account_entry'}),{name:'account_entry',tool_id:'free-account',repeat:true});
 for(const [host,path,detail] of [['getecoback.com','/tools/grok',{name:'account_entry'}],['baipiaoji.com','/account',{name:'account_entry'}],['baipiaoji.com','/tools/grok',{name:'account_entry',email:'private'}]]) assert.equal(businessEvent(host,path,detail),null);
});
