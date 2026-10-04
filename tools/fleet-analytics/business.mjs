import {affiliateEvent, legacyEvent} from './legacy.mjs';
// Public route + fixed action only. Never accept labels, values or customer data.
const workbench = {
  'agiscorecard.com': ['evidencewatch','agentfit','filinglens-workspace','tradecheck-team','localebatch-qa','rfq-roundbook','evidencebrief','modelmeter-reconcile','workflowcost','job-evidence','scamchecklist'],
  'baipiaoji.com': ['launchdesk','quotawatch-pro','creatorops'],
  'getecoback.com': ['billlens','appliancepayback','homeenergy-log'],
  'thedollscout.com': ['collectorledger','dropcalendar','displayfit']
};
const documents = {
  'verify-file': ['doc_verify_create','doc_verify_match','doc_verify_mismatch','doc_verify_sample'],
  'pdf-accessibility-checker': ['doc_start','doc_complete','doc_export','doc_sample'],
  'pdf-batch-audit': ['doc_start','doc_complete','doc_export','doc_sample'],
  'pdf-to-text': ['doc_start','doc_complete','doc_export','doc_sample'],
  'compare-pdf-text': ['doc_start','doc_complete','doc_export','doc_sample'],
  'image-compressor': ['doc_image_complete','doc_image_sample','doc_utility_export'],
  'json-compare': ['doc_json_complete','doc_json_sample','doc_utility_export'],
  'time-zone-planner': ['doc_meeting_complete','doc_meeting_sample','doc_utility_export'],
  'delivery-evidence': ['doc_delivery_complete','doc_delivery_sample','doc_delivery_export'],
  'ai-portrait-background-remover': ['doc_ai_portrait_complete','doc_ai_portrait_sample','doc_ai_portrait_export'],
  'ai-audio-to-text': ['doc_ai_speech_complete','doc_ai_speech_sample','doc_ai_speech_export'],
  'ai-text-summarizer': ['doc_ai_summary_complete','doc_ai_summary_sample','doc_ai_summary_export']
};
export function businessEvent(host, pathname, detail) {
  if (!detail || typeof detail !== 'object' || Object.keys(detail).some(k => k !== 'name') || typeof detail.name !== 'string') return null;
  const affiliate = affiliateEvent(host, detail);
  if (affiliate) return affiliate;
  const name = detail.name;
  if (name.startsWith('legacy:')) return legacyEvent(host, pathname, name.slice(7));
  const route = String(pathname).replace(/^\/(?:en|de|zh|it)\//, '/').replace(/\.html$/, '');
  if (host === 'baipiaoji.com' && !/^\/(?:account|members)(?:\/|$)/.test(route) && ['search_suggestions','search_results','search_empty','search_suggestion_select','search_result_select','search_error'].includes(name)) return {name, tool_id:'site-search', repeat:true};
  if (host === 'baipiaoji.com' && /^\/tools\/[a-z0-9-]+$/.test(route) && name === 'account_entry') return {name, tool_id:'free-account', repeat:true};
  if (host === 'baipiaoji.com' && route === '/subscription-audit' &&
      ['subscription_review','subscription_copy'].includes(name)) {
    return {name, tool_id:'subscription-audit', repeat:true};
  }
  if (host === 'agiscorecard.com' && route === '/invest' && ['route','scenario','watch','export','source_open','tool_open','telegram_open'].some(a => name === 'roadmap_' + a)) return {name, tool_id:'ai-investment-roadmap', repeat:true};
  if (host === 'agiscorecard.com' && route === '/jarvis' &&
      ['start','report_ready','source_pack','source_open','export','memory_save','pause','resume','delete','feedback','membership_open','member_verified','registration_open'].some(a => name === 'jarvis_' + a)) {
    return {name, tool_id:'jarvis', repeat:true};
  }
  if (host === 'agiscorecard.com' && /^\/future-guide(?:\/[a-z0-9-]+)?$/.test(route) &&
      ['future_medium','future_topic','future_video_open','future_audio_open'].includes(name)) {
    return {name, tool_id:'future-guide', repeat:true};
  }
  if (host === 'agiscorecard.com' && ['/', '/cn'].includes(route) &&
      ['home_library','home_audio','home_video_open','home_view','home_topic','home_latest','home_notebook','home_jarvis'].includes(name)) {
    return {name, tool_id:'agi-home', site_edition:route==='/cn'?'zh':'en', repeat:true};
  }
  if (host === 'agiscorecard.com' && !/^\/(?:members|discuss\/(?:account|moderate))(?:\/|$)/.test(route) &&
      ['menu_open','home','videos','evidence','jarvis','tools','invest','discuss','search','workbench','earn','mentor','create','agents','portfolio','infrastructure','exposure','notebook','account','members','newsletter','language'].some(a=>name==='nav_'+a)) {
    return {name, tool_id:'agi-navigation', site_edition:pathname.startsWith('/zh/')||pathname==='/cn'?'zh':'en',repeat:true};
  }
  // Homepage events use fixed public labels only, never destinations or search input.
  if (host === 'baipiaoji.com' && ['/', '/en', '/en/'].includes(pathname)) {
    const parts = name.split(':');
    const blocks = ['hero','site-header','site-footer','featured-tools','task-lanes','directory','dirs','money','agents','agent-watch','limit-check','plans','studio','video','agent','nav','footer','header','other','legacy-other'];
    const destinations = ['homepage','tool-directory','toolbox','free-account','membership','pdf-tools','product-images','video-variants','quote-builder','quote-compare','proposal-deck','ai-tools','codex-efficiency','work-plan','video-hub','agents','feature-map','mcp','developers','workbench','creatorops','launchdesk','quotawatch','work-plans','business-workflows','workflow-packs','coding-quota','tokenizer','api-calculator','subscription-audit','stack-builder','paid-tiers','comparisons','external-link','tool-profile','tool-category','agent-directory','other-destination'];
    if (parts.length === 3 && parts[0] === 'home' && blocks.includes(parts[1]) && destinations.includes(parts[2]))
      return {name:'home_click', home_block:parts[1], home_destination:parts[2], site_edition:pathname.startsWith('/en')?'en':'zh', repeat:true};
  }
  if (host === 'agiscorecard.com' && route === '/portfolio-tracker' && ['stress','dca','leverage','save_local','export','share','performance_export','cloud_intent'].some(a => name === 'portfolio_' + a)) {
    return {name, tool_id:'portfolio-tracker'};
  }
  const match = /^\/workbench\/([a-z0-9-]+)$/.exec(route);
  if (match && workbench[host]?.includes(match[1])) {
    const action = /^workbench_(example_)?(start|complete|export)$/.exec(name);
    if (action) return {name:'tool_' + (action[1] || '') + action[2], tool_id:match[1]};
  }
  if (host === 'thedollscout.com') {
    if(/^\/series\/(?:smiski|sonny-angel)-[a-z0-9-]+$/.test(route)&&name==='collector_series_calc')return {name:'collector_series_complete',tool_id:'series-style-probability'};
    const planning={'/collecting/budget':'collector_budget_calc','/collecting/duplicates':'collector_progress_calc'};
    if(planning[route]===name)return {name:'tool_complete',tool_id:route.slice(1).replaceAll('/','-')};
    const brand=/^\/brands\/(labubu|skullpanda|jellycat|sonny-angel|smiski|hirono|dimoo|molly)$/.exec(route);
    if(brand&&(name==='display_calc'||name==='odds_calc'&&brand[1]!=='jellycat'))return {name:name==='display_calc'?'collector_display_complete':'collector_odds_complete',tool_id:brand[1]+(name==='display_calc'?'-display-fit':'-style-odds')};
    const tool = route.slice(1);
    if (documents[tool]?.includes(name)) {
      const action = name.endsWith('_sample') ? 'example_run' : name.endsWith('_export') ? 'export' : name.endsWith('_start') ? 'start' : 'complete';
      return {name:'tool_' + action, tool_id:tool};
    }
  }
  return null;
}
