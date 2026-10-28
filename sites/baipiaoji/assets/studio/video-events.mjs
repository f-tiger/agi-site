// Fixed, route-bound actions only. No project text, media, filenames or query strings.
const hubActions={
 'hero-demo':'example_open','hero-compare':'compare','hero-create':'editor_open',
 'step-1':'brief_open','step-2':'editor_open','step-3':'cloud_open',
 'membership-entry':'membership_open','manage-projects':'projects_open',
 'tool-directory':'directory_open','quota-plan':'quota_open','rights-check':'rights_open',
 'vendor-placement':'sponsor_open','share-copy':'share_copy'
};
const editorActions=['attach-media','import-project','export-video','export-batch','export-project','export-brief','export-handoff','cloud-open','cloud-saved','restore-cloud'];
function allowed(){let denied=false;try{denied=localStorage.getItem('fleet_ga4_choice_v1')==='denied';}catch{}return location.hostname==='baipiaoji.com'&&!/[?&](?:__ci|__probe|qa)(?:=|&|$)/.test(location.search)&&!navigator.webdriver&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl&&!denied;}
export function videoEvent(action,kind='hub',demo=false){
 if(!allowed())return;
 let name;
 if(kind==='hub'){
  let fixed=hubActions[action];
  if(/^case-start-(launch|revision|repurpose)$/.test(action))fixed='editor_open';
  // Entries are installed only on existing relevant public pages.
  if(/^(home|home-directory|directory|category|tool-[a-z0-9-]+)-(hub|case|create|membership)$/.test(action))fixed=({hub:'hub_open',case:'example_open',create:'editor_open',membership:'membership_open'})[action.split('-').at(-1)];
  if(fixed)name='video_'+fixed;
 }else if(kind==='case'&&/^(select|opening|format|play|download)-(launch|revision|repurpose)$/.test(action))name='video_example_'+action.split('-')[0];
 else if(kind==='editor'){
  if(editorActions.includes(action))name='video_'+action.replaceAll('-','_')+'_'+(demo?'demo':'own');
  else if(action==='demo-start'||/^demo-case-(launch|revision|repurpose)$/.test(action))name='video_example_start';
 }
 if(!name)return;
 const forward=()=>{if(allowed())window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));};
 const loader=document.querySelector('script[data-ga4-host="baipiaoji.com"][src^="/analytics-assets/consent.mjs?"]');
 if(loader)import(loader.src).then(forward).catch(()=>{});else forward();
}
