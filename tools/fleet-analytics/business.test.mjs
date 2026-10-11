import test from 'node:test';
import assert from 'node:assert/strict';
import {products,sites} from '../revenue-studio/catalog.mjs';
import {businessEvent} from './business.mjs';
test('Video publishing actions accept only fixed names, never files or report inputs',()=>{
 for(const action of ['file_ready','file_error','complete','example','export','compare']){
  const name='manju_video_'+action;
  assert.deepEqual(businessEvent('baipiaoji.com','/manju/video-fit',{name}),{name,tool_id:'manju',repeat:true});
  for(const field of ['filename','title','summary','report','audience'])assert.equal(businessEvent('baipiaoji.com','/manju/video-fit',{name,[field]:'PRIVATE'}),null);
  assert.equal(businessEvent('baipiaoji.com','/account',{name}),null);
  assert.equal(businessEvent('getecoback.com','/manju/video-fit',{name}),null);
 }
 assert.equal(businessEvent('baipiaoji.com','/manju/video-fit',{name:'manju_video_purchase'}),null);
});
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

test('AI Solo actions stay on public BPJ routes and exclude consultation payloads',()=>{
 for(const action of ['plan_complete','plan_export','case_open','filter','source_open','example','skill_export','save_local']){
  const name='ai_solo_'+action;
  assert.deepEqual(businessEvent('baipiaoji.com','/en/ai-solo/agent/',{name}),{name,tool_id:'ai-solo',repeat:true});
  for(const route of ['/account','/members','/api/private','/'])assert.equal(businessEvent('baipiaoji.com',route,{name}),null);
  assert.equal(businessEvent('getecoback.com','/ai-solo/agent/',{name}),null);
  assert.equal(businessEvent('baipiaoji.com','/ai-solo/agent/',{name,question:'private customer problem'}),null);
 }
 assert.equal(businessEvent('baipiaoji.com','/ai-solo/agent/',{name:'ai_solo_income'}),null);
 assert.equal(businessEvent('baipiaoji.com','/ai-solo/agent/',{name:'ai_solo_purchase'}),null);
 assert.deepEqual(businessEvent('baipiaoji.com','/',{name:'home:ai-solo:ai-solo-agent'}),{name:'home_click',home_block:'ai-solo',home_destination:'ai-solo-agent',site_edition:'zh',repeat:true});
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
 assert.deepEqual(businessEvent('thedollscout.com','/zh/series/sonny-angel-snack-series',{name:'collector_series_save'}),{name:'collector_checklist_save',tool_id:'series-checklist'});
 assert.equal(businessEvent('thedollscout.com','/series/smiski-living',{name:'collector_series_save',styles:['private']}),null);
 assert.equal(businessEvent('thedollscout.com','/series',{name:'collector_series_save'}),null);
 for(const name of ['collection_save','collection_export','collection_import'])assert.deepEqual(businessEvent('thedollscout.com','/de/collection-tracker',{name}),{name,tool_id:'collection-tracker'});
 for(const path of ['/display-calculator','/de/display-calculator'])assert.deepEqual(businessEvent('thedollscout.com',path,{name:'display_calc'}),{name:'display_calc',tool_id:'display-calculator'});
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

for (const name of ['search_suggestions','search_results','search_empty','search_suggestion_select','search_result_select','search_error']) {
 assert.deepEqual(businessEvent('baipiaoji.com','/en/',{name}),{name,tool_id:'site-search',repeat:true});
 assert.equal(businessEvent('baipiaoji.com','/en/account',{name}),null);
 assert.equal(businessEvent('baipiaoji.com','/members',{name}),null);
 assert.equal(businessEvent('baipiaoji.com','/',{name,query:'private@example.test'}),null);
 assert.equal(businessEvent('getecoback.com','/',{name}),null);
}

test('Eco tool distribution measures fixed preparation actions without input payloads',()=>{
 for(const action of ['example','share_prepare','tool_share','share_reddit','share_x','copy','image'])assert.equal(businessEvent('getecoback.com','/guide/stromkosten-rechner.html',{name:'eco_tool_'+action}).name,'eco_tool_'+action);
 for(const pathname of ['/members.html','/account/session','/en/members.html','/it/account.html','/api/private','/zh/account.html'])assert.equal(businessEvent('getecoback.com',pathname,{name:'eco_tool_copy'}),null);
 assert.equal(businessEvent('getecoback.com','/rechner.html',{name:'eco_tool_share_prepare',values:{rate:0.4}}),null);
 assert.equal(businessEvent('getecoback.com','/rechner.html',{name:'eco_tool_published'}),null);
 assert.equal(businessEvent('baipiaoji.com','/rechner.html',{name:'eco_tool_copy'}),null);
});

test('Eco purchase decisions retain only fixed mode/action labels on public pages',()=>{
 for(const mode of ['label','dish','shower'])for(const action of ['example','compare','share_prepare','copy','share_reddit','share_x','print'])assert.deepEqual(businessEvent('getecoback.com','/nl/wonen.html',{name:'eco_buy_'+mode+'_'+action}),{name:'eco_buy_'+action,tool_id:'eco-product-'+mode,repeat:true});
 for(const pathname of ['/members.html','/account','/api/private','/'])assert.equal(businessEvent('getecoback.com',pathname,{name:'eco_buy_dish_compare'}),null);
 assert.equal(businessEvent('getecoback.com','/rechner.html',{name:'eco_buy_dish_compare',values:{rate:0.3}}),null);
 for(const name of ['eco_buy_dish_purchase','eco_buy_unknown_compare','eco_buy_email@example.com_compare'])assert.equal(businessEvent('getecoback.com','/rechner.html',{name}),null);
});

test('Eco home fit actions accept only fixed mode and action without user data',()=>{
 for(const mode of ['robot','laundry','ac','floor'])assert.deepEqual(businessEvent('getecoback.com','/rechner.html',{name:'eco_fit_'+mode+'_complete'}),{name:'eco_fit_complete',tool_id:'eco-fit-'+mode,repeat:true});
 assert.equal(businessEvent('getecoback.com','/account.html',{name:'eco_fit_robot_complete'}),null);
 assert.equal(businessEvent('getecoback.com','/rechner.html',{name:'eco_fit_robot_complete',answers:{}}),null);
});

for(const action of ['search_start','search_submit','search_results','search_empty','suggest_view','suggest_select','recommend_select','discover_start','discover_found','discover_empty','discover_error','discover_limited','discover_cached']) { const name='manju_'+action; assert.equal(businessEvent('baipiaoji.com','/manju/',{name})?.name,name); assert.equal(businessEvent('baipiaoji.com','/manju/',{name,query:'PRIVATE'}),null); assert.equal(businessEvent('baipiaoji.com','/account',{name}),null); }
