export const PROJECT_IDS=['upscayl','whisper','ollama','obs','audacity','shotcut'];
export const VIDEO_IDS=['upscayl','audacity','shotcut'];
export const GROWTH_SLUGS=['open-source',...PROJECT_IDS.map(id=>'open-source/'+id),'videos',...VIDEO_IDS.map(id=>'videos/'+id),'creator-kit'];
const rules=new Map();
for(const action of ['library_open_source','library_videos','kit_open'])rules.set('doc_'+action,null);
for(const id of PROJECT_IDS){for(const action of ['project_download','project_tool'])rules.set(`doc_${action}_${id}`,['open-source/'+id]);rules.set('doc_checklist_'+id,['open-source/'+id,...(VIDEO_IDS.includes(id)?['videos/'+id]:[])]);}
for(const id of VIDEO_IDS)for(const action of ['video_load','video_watch','video_tool'])rules.set(`doc_${action}_${id}`,['videos/'+id]);
for(const id of ['mic','light','storage'])rules.set('doc_gear_'+id,['creator-kit']);
export const GROWTH_EVENTS=new Set(rules.keys());
export function growthEventAllowed(event,path){if(!rules.has(event))return false;const pages=rules.get(event);return !pages||pages.includes(path.replace(/^\/(?:(?:de|zh)\/)?/,''));}
export const isGrowthPath=path=>GROWTH_SLUGS.includes(path.replace(/^\/(?:(?:de|zh)\/)?/,''));
