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
// Registration intent is allowed only on a registered public page. Reject URL
// context and encoded private routes; no origin path or identity enters fields.
export function publicAccountEntryPath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || /[?#\\\u0000-\u0020\u007f]/.test(pathname)) return false;
  let path;
  try { path = decodeURIComponent(pathname); } catch { return false; }
  if (/[?#\\\u0000-\u0020\u007f]/.test(path) || /%[0-9a-f]{2}/i.test(path) || path.includes('//')) return false;
  if (path.split('/').some(part => /^(?:auth|api|analytics-assets|\.well-known|account|accounts|member|members|private|share|shared|delivery|download|downloads|packs-thanks|checkout|payment|receipt|embed|widget|widgets)(?:[.~-]|$)/i.test(part) || /^__(?:ci|qa|probe)/i.test(part) || part === '.' || part === '..')) return false;
  return !/^\/(?:[a-z]{2}\/)?(?:discuss\/moderate|studio\/quote-builder)(?:[/.]|$)/i.test(path);
}
export function businessEvent(host, pathname, detail, allowed = {}) {
  if (!detail || typeof detail !== 'object' || Object.keys(detail).some(k => k !== 'name') || typeof detail.name !== 'string') return null;
  if (detail.name === 'fleet_account_entry') {
    // BPJ keeps its existing tool account_entry and homepage entry definitions.
    if (host === 'baipiaoji.com' || !Object.hasOwn(allowed, host) || !/^G-[A-Z0-9]+$/.test(allowed[host]) || !publicAccountEntryPath(pathname)) return null;
    return {name: 'fleet_account_entry', tool_id: 'fleet-free-account', repeat: true};
  }
  if (host === 'baipiaoji.com' && ['/dev-buying/', '/en/dev-buying/'].includes(pathname) && ['dev_buy_guidance','dev_buy_calculate','dev_buy_export','dev_buy_official'].includes(detail.name)) return {name:detail.name,tool_id:'dev-buying',repeat:true};
  const affiliate = affiliateEvent(host, detail);
  if (affiliate) return affiliate;
  const name = detail.name;
  if(host==='baipiaoji.com' && ((pathname==='/tools/kimi' && ['plan_select','plan_save','plan_copy','plan_export'].some(a=>name==='bpj_depth_'+a)) || (/^\/manju(?:\/[a-z0-9-]*)?\/?$/.test(pathname) && ['watch_save','watch_resume','watch_export'].some(a=>name==='bpj_depth_'+a)))) return {name,tool_id:'bpj-depth',repeat:true};
  if(host==='baipiaoji.com'&&['/studio/testimonial-kit','/en/studio/testimonial-kit'].includes(pathname)&&/^proofkit_(preview|backup|export|image|canva)_(demo|own)$|^proofkit_(member_open|import_own)$/.test(name))return {name,tool_id:'testimonial-kit',repeat:true};
  if (host === 'getecoback.com' &&
      (/^\/guide\/[a-z0-9]+(?:-[a-z0-9]+)*-betriebskosten\.html$/.test(pathname) ||
       /^\/en\/guide\/[a-z0-9]+(?:-[a-z0-9]+)*-running-cost\.html$/.test(pathname)) &&
      ['view','example','calculate','share'].some(action => name === 'eco_auto_' + action))
    return {name: name.slice(4), tool_id: 'manufacturer-cost-scenario', repeat: true};
  // English AI-work discovery is a separate product and never enters manju signals.
  // These are UI actions, not video plays, people, referrals paid or popularity.
  if (host === 'baipiaoji.com' && pathname === '/en/ai-video/' &&
      ['view','search','filter','preview','outbound','save','unsave','related'].some(action => name === 'ai_video_' + action))
    return {name, tool_id:'ai-video', repeat:true};
  if(host==='getecoback.com' && ['/familienwerkstatt.html','/en/home-workshop.html'].includes(pathname) && /^eco_workshop_(pool|garden|repair)_(decision|export|official|shop|stl)$/.test(name)) {
    const [,mode,action]=/^eco_workshop_(pool|garden|repair)_(.+)$/.exec(name);
    if(action==='stl' && mode!=='repair')return null;
    if(action==='shop' && mode==='repair')return null;
    return {name:'eco_workshop_'+action,tool_id:'eco-workshop-'+mode,repeat:true};
  }
  const upkeepRoutes = {
    '/guide/tineco-saugt-nicht-mehr.html': 'tineco-care',
    '/guide/thermovorhang-ratgeber.html': 'curtain-fit',
    '/en/guide/12l-vs-20l-dehumidifier-uk.html': 'meaco-filter'
  };
  if (host === 'getecoback.com' && Object.hasOwn(upkeepRoutes, pathname) &&
      ['view','example','decision','share'].some(action => name === 'eco_upkeep_' + action))
    return {name: name.slice(4), tool_id: upkeepRoutes[pathname], repeat: true};
  if(host==='baipiaoji.com' && pathname==='/manju/video-fit' && ['view','start','report_needs_info','report_revise','report_test'].some(action=>name==='manju_video_'+action)) return {name,tool_id:'manju',repeat:true};
  if (host === 'getecoback.com' && ['/waeschetrockner-oder-luftentfeuchter.html','/en/guide/dehumidifier-drying-clothes-cost.html'].includes(pathname) &&
      ['view','example','calculate','compare','example_export','export','share','guide'].some(action=>name==='eco_laundry_'+action))
    return {name:name.slice(4),tool_id:'laundry-cost',repeat:true};
  if (host === 'getecoback.com' && /^\//.test(pathname) && !/^\/(?:(?:en|it|fr|es|zh)\/)?(?:members|account|api|private)(?:[/.]|$)/.test(pathname) &&
      ['example','share_prepare','tool_share','share_reddit','share_x','copy','image'].some(action=>name==='eco_tool_'+action))
    return {name,tool_id:'eco-tool-experience',repeat:true};

  if (host === 'getecoback.com' && ['/rechner.html','/wohnen.html','/geraete-austausch-rechner.html','/en/solution-calculator.html','/fr/calculateur.html','/nl/wonen.html','/guide/duschen-kosten-rechner.html','/en/guide/shower-cost-calculator.html'].includes(pathname) && /^eco_buy_(label|dish|shower)_(example|compare|share_prepare|copy|share_reddit|share_x|print)$/.test(name)) { const [,mode,action]=/^eco_buy_(label|dish|shower)_(.+)$/.exec(name); return {name:'eco_buy_'+action,tool_id:'eco-product-'+mode,repeat:true}; }

  if (host === 'getecoback.com' && ['/rechner.html','/en/solution-calculator.html','/nl/wonen.html','/fr/calculateur.html','/guide/midea-portasplit-kaufen.html','/guide/waesche-trocknen-wohnung.html','/en/guide/dehumidifier-drying-clothes-cost.html'].includes(pathname) && /^eco_fit_(robot|laundry|ac|floor)_(example|complete|share_prepare|copy|share_reddit|share_x|print)$/.test(name)) { const [,mode,action]=/^eco_fit_(robot|laundry|ac|floor)_(.+)$/.exec(name); return {name:'eco_fit_'+action,tool_id:'eco-fit-'+mode,repeat:true}; }

  if(host==='baipiaoji.com' && /^\/manju(?:\/[a-z0-9-]*)?\/?$/.test(pathname) && ['view','filter','empty','open','source','save','unsave','share','export','feed','inquiry_start','inquiry_ok','inquiry_error','return','preview_open','rank_sort','topic_complete','topic_empty','topic_export','search_start','search_submit','search_results','search_empty','suggest_view','suggest_select','recommend_select','discover_start','discover_found','discover_empty','discover_error','discover_limited','discover_cached','video_file_ready','video_file_error','video_complete','video_example','video_export','video_compare','official_open','platform_search','intro_open','share_native','share_copy'].some(a=>name==='manju_'+a)) return {name,tool_id:'manju',repeat:true};
  if (name.startsWith('legacy:')) return legacyEvent(host, pathname, name.slice(7));
  const route = String(pathname).replace(/^\/(?:en|de|zh|it)\//, '/').replace(/\.html$/, '');
  if(host==='agiscorecard.com'&&['/matrix-odds','/zh/matrix-odds'].includes(pathname)&&name==='matrix_calculate')return {name,tool_id:'matrix-odds'};
  // BPJ video production is distinct from manju discovery and AI-work browsing.
  // Demos never become own exports, and cloud intent is never a payment event.
  if(host==='baipiaoji.com'){
    const hub=route==='/video/',editor=route==='/studio/video-variants';
    const entry=hub||editor||['/','/en','/c/video'].includes(route)||/^\/tools\/[a-z0-9-]+$/.test(route);
    if(entry&&['hub_open','example_open','editor_open','membership_open'].some(a=>name==='video_'+a))return {name,tool_id:'video-studio',repeat:true};
    if((hub||editor)&&['compare','brief_open','cloud_open','projects_open','directory_open','quota_open','rights_open','sponsor_open','share_copy'].some(a=>name==='video_'+a))return {name,tool_id:'video-studio',repeat:true};
    if(hub&&/^video_example_(select|opening|format|play|download)$/.test(name))return {name,tool_id:'video-studio',repeat:true};
    if(editor&&(name==='video_example_start'||/^video_(attach_media|import_project|export_video|export_batch|export_project|export_brief|export_handoff|cloud_open|cloud_saved|restore_cloud)_(demo|own)$/.test(name)))return {name,tool_id:'video-variants',repeat:true};
  }
  if(host==='baipiaoji.com' && /^\/ai-solo(?:\/[a-z0-9/-]*)?\/?$/.test(route) &&
      ['plan_complete','plan_export','case_open','filter','source_open','example','skill_export','save_local','mcp_preview','mcp_setup'].some(a=>name==='ai_solo_'+a))
    return {name,tool_id:'ai-solo',repeat:true};
  if (host === 'baipiaoji.com' && !/^\/(?:account|members)(?:\/|$)/.test(route) && ['search_suggestions','search_results','search_empty','search_suggestion_select','search_result_select','search_error'].includes(name)) return {name, tool_id:'site-search', repeat:true};
  if (host === 'baipiaoji.com' && /^\/tools\/[a-z0-9-]+$/.test(route) && name === 'account_entry') return {name, tool_id:'free-account', repeat:true};
  if (host === 'baipiaoji.com' && route === '/subscription-audit' &&
      ['subscription_review','subscription_copy'].includes(name)) {
    return {name, tool_id:'subscription-audit', repeat:true};
  }
  if (host === 'agiscorecard.com' && route === '/invest' && ['route','scenario','watch','export','source_open','tool_open','telegram_open'].some(a => name === 'roadmap_' + a)) return {name, tool_id:'ai-investment-roadmap', repeat:true};
  if (host === 'agiscorecard.com' && route === '/jarvis' &&
      ['start','report_ready','source_pack','source_open','export','memory_save','pause','resume','delete','feedback','membership_open','member_verified','registration_open','followup_prepare','followup_start','correction_prepare','correction_start','action_progress'].some(a => name === 'jarvis_' + a)) {
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
    const blocks = ['ai-solo','github-tools','hero','site-header','site-footer','featured-tools','task-lanes','directory','dirs','money','agents','agent-watch','limit-check','plans','studio','video','agent','nav','footer','header','other','legacy-other'];
    const destinations = ['ai-solo','ai-solo-agent','ai-solo-success','ai-solo-failure','github-tools','homepage','tool-directory','toolbox','free-account','membership','pdf-tools','product-images','video-variants','quote-builder','quote-compare','proposal-deck','ai-tools','codex-efficiency','work-plan','video-hub','agents','feature-map','mcp','developers','workbench','creatorops','launchdesk','quotawatch','work-plans','business-workflows','workflow-packs','coding-quota','tokenizer','api-calculator','subscription-audit','stack-builder','paid-tiers','comparisons','external-link','tool-profile','tool-category','agent-directory','other-destination'];
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
    if(route==='/collecting/wish-card'&&['collector_wish_generate','collector_wish_export','collector_wish_response_reported','collector_wish_fulfilled_reported'].includes(name))return {name,tool_id:'wish-card'};
    if(route==='/collecting/trading-meetup-checklist'&&['collector_swap_print_request','collector_swap_link_copy'].includes(name))return {name,tool_id:'trading-meetup-checklist'};
    if(route==='/for-agents'&&name==='collector_mcp_copy')return {name,tool_id:'collector-mcp'};
    if(/^\/series\/(?:smiski|sonny-angel)-[a-z0-9-]+$/.test(route)&&name==='collector_series_export')return {name:'collector_checklist_export',tool_id:'series-checklist'};
    if(/^\/series\/(?:smiski|sonny-angel)-[a-z0-9-]+$/.test(route)&&name==='collector_series_save')return {name:'collector_checklist_save',tool_id:'series-checklist'};
    if(route==='/collection-tracker'&&['collection_save','collection_export','collection_import'].includes(name))return {name,tool_id:'collection-tracker'};
    if(route==='/display-calculator'&&['display_calc','display_plan_export','display_plan_example'].includes(name))return {name,tool_id:'display-calculator'};
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
