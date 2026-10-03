// Mirror only fixed action names from the pre-existing first-party callbacks.
const names = {
 'agiscorecard.com': 'focus_entry task_start task_complete result_copy evidence_action share_arrival discussion_click discussion_home_view subscribe_click tool_click agi_test_click index_click deeplink_pick vote_cast challenge_share x_share embed_copy pick_ledger embed_brand_click hot_topic_click viz_switch viz_capture_show prediction_lock invest_tool_click market_odds_load calc_use pred_expand readnext_click analysis_click advertise_click sponsor_click exposure_score retake_test badge_copy crowd_view site_search search_no_result search_click slidein_show slidein_dismiss sub_open sub_submit sub_ok sub_fail verify_run',
 'getecoback.com': 'seal_fit stromkosten_calc btu_calc heat_now strom_now feuchte_now strompreis_api video_play video_entry popup_view popup_click popup_close subscribe newsletter_open newsletter_submit tool_start tool_complete tool_export moisture_result buyer_result heat_calc heizkosten_calc taupunkt_calc tariff_calc',
 'baipiaoji.com': 'click_tool select_category select_hustle view_plan start_plan complete_step subscribe search search_no_results github_tools plan_step',
 'thedollscout.com': 'checker_start checker_complete calc_use display_calc odds_calc video_play'
};
const allow=Object.fromEntries(Object.entries(names).map(([host,list])=>[host,new Set(list.split(' '))]));
export function legacyEvent(host,pathname,name) {
 if(!allow[host]?.has(name))return null;
 // Never forward arbitrary event params (searches, emails, filenames, results).
 return {name,tool_id:pathname.replace(/^\//,'').replace(/\.html$/,'').slice(0,90)||'homepage',repeat:true};
}
const placements = new Set('home-herbst home-rising toppick models ac-finder grid article card hero notice-bar tool other'.split(' '));
export function affiliateAction(href,placement='other') {
 let url;try{url=new URL(href);}catch{return null;}
 const host=url.hostname.replace(/^www\./,'');
 const market=host==='amazon.de'?'de':host==='amazon.com'?'us':null;
 if(!market || url.protocol!=='https:' || url.username || url.password)return null;
 if(url.searchParams.get('tag')!==(market==='de'?'getecoback-21':'ecoback0d-20'))return null;
 return {name:'affiliate:amazon:'+market+':'+(placements.has(placement)?placement:'other')};
}
export function affiliateEvent(host,detail) {
 if(!['agiscorecard.com','getecoback.com','thedollscout.com','source.agiscorecard.com'].includes(host))return null;
 if(!detail || Object.keys(detail).some(k=>k!=='name'))return null;
 const match=/^affiliate:amazon:(de|us):([a-z-]+)$/.exec(detail.name||'');
 if(!match || !placements.has(match[2]))return null;
 return {name:'affiliate_click',merchant:'amazon',market:match[1],placement:match[2],repeat:true};
}
